import crypto from 'node:crypto';
import type {
  LiteratureRetrieveHit,
  LiteratureRetrieveRequest,
  LiteratureRetrieveResponse,
} from '@paper-engineering-assistant/shared';
import { AppError } from '../errors/app-error.js';
import type {
  LiteratureEmbeddingChunkRecord,
  LiteratureEmbeddingVersionRecord,
  LiteratureRepository,
} from '../repositories/literature-repository.js';

type RetrievalProfile = {
  provider: string;
  model: string;
  dimension: number;
};

type ScoredChunk = {
  literatureId: string;
  embeddingVersionId: string;
  chunk: LiteratureEmbeddingChunkRecord;
  hybridScore: number;
  vectorScore: number;
  lexicalScore: number;
};

export class LiteratureRetrievalService {
  constructor(private readonly repository: LiteratureRepository) {}

  async retrieve(request: LiteratureRetrieveRequest): Promise<LiteratureRetrieveResponse> {
    const query = request.query.trim();
    if (!query) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'query cannot be empty.');
    }

    const queryTokens = this.tokenize(query);
    const topK = this.normalizeRange(request.top_k, 10, 1, 30);
    const evidencePerLiterature = this.normalizeRange(request.evidence_per_literature, 3, 1, 5);

    const candidateVersions = await this.resolveCandidateVersions(request);
    if (candidateVersions.length === 0) {
      return {
        items: [],
        meta: {
          query_tokens: queryTokens,
          profiles_used: [],
          skipped_profiles: [],
        },
      };
    }

    const literatureIds = [...new Set(candidateVersions.map((version) => version.literatureId))];
    const literatures = await this.repository.listLiteraturesByIds(literatureIds);
    const literatureTitleById = new Map(literatures.map((item) => [item.id, item.title]));

    const profileBuckets = this.groupVersionsByProfile(candidateVersions);
    const skippedProfiles: LiteratureRetrieveResponse['meta']['skipped_profiles'] = [];
    const profilesUsed: LiteratureRetrieveResponse['meta']['profiles_used'] = [];
    const scoredChunks: ScoredChunk[] = [];

    for (const bucket of profileBuckets.values()) {
      let queryVector: number[];
      try {
        queryVector = await this.embedQueryByProfile(query, bucket.profile);
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'embedding query failed';
        skippedProfiles.push({
          provider: bucket.profile.provider,
          model: bucket.profile.model,
          dimension: bucket.profile.dimension,
          reason,
        });
        continue;
      }

      const chunks = await this.repository.listEmbeddingChunksByEmbeddingVersionIds(
        bucket.versions.map((version) => version.id),
      );
      if (chunks.length === 0) {
        skippedProfiles.push({
          provider: bucket.profile.provider,
          model: bucket.profile.model,
          dimension: bucket.profile.dimension,
          reason: 'no chunks available for profile',
        });
        continue;
      }

      const versionById = new Map(bucket.versions.map((version) => [version.id, version]));
      profilesUsed.push({
        provider: bucket.profile.provider,
        model: bucket.profile.model,
        dimension: bucket.profile.dimension,
        literature_count: bucket.versions.length,
      });

      for (const chunk of chunks) {
        const version = versionById.get(chunk.embeddingVersionId);
        if (!version) {
          continue;
        }
        const vectorScore = this.normalizedCosine(queryVector, chunk.vector);
        const lexicalScore = this.lexicalScore(queryTokens, chunk.text);
        const hybridScore = this.toScore((vectorScore * 0.7) + (lexicalScore * 0.3));
        scoredChunks.push({
          literatureId: version.literatureId,
          embeddingVersionId: version.id,
          chunk,
          hybridScore,
          vectorScore,
          lexicalScore,
        });
      }
    }

    const hits = this.buildHits(scoredChunks, literatureTitleById, evidencePerLiterature)
      .sort((left, right) => {
        if (right.hybrid_score !== left.hybrid_score) {
          return right.hybrid_score - left.hybrid_score;
        }
        return left.literature_id.localeCompare(right.literature_id);
      })
      .slice(0, topK);

    return {
      items: hits,
      meta: {
        query_tokens: queryTokens,
        profiles_used: profilesUsed,
        skipped_profiles: skippedProfiles,
      },
    };
  }

  private async resolveCandidateVersions(request: LiteratureRetrieveRequest): Promise<LiteratureEmbeddingVersionRecord[]> {
    const topicId = request.topic_id?.trim();
    const paperId = request.paper_id?.trim();

    if (!topicId && !paperId) {
      return this.repository.listActiveEmbeddingVersions();
    }

    let scopedLiteratureIds: Set<string> | null = null;

    if (topicId) {
      const topicScopes = await this.repository.listTopicScopesByTopicId(topicId);
      const topicScopeIds = new Set(
        topicScopes
          .filter((item) => item.scopeStatus === 'in_scope')
          .map((item) => item.literatureId),
      );
      scopedLiteratureIds = topicScopeIds;
    }

    if (paperId) {
      const links = await this.repository.listPaperLiteratureLinksByPaperId(paperId);
      const paperIds = new Set(links.map((item) => item.literatureId));
      if (scopedLiteratureIds === null) {
        scopedLiteratureIds = paperIds;
      } else {
        scopedLiteratureIds = new Set([...scopedLiteratureIds].filter((id) => paperIds.has(id)));
      }
    }

    const finalIds = [...(scopedLiteratureIds ?? new Set<string>())];
    if (finalIds.length === 0) {
      return [];
    }
    return this.repository.listActiveEmbeddingVersionsByLiteratureIds(finalIds);
  }

  private groupVersionsByProfile(versions: LiteratureEmbeddingVersionRecord[]): Map<string, {
    profile: RetrievalProfile;
    versions: LiteratureEmbeddingVersionRecord[];
  }> {
    const buckets = new Map<string, { profile: RetrievalProfile; versions: LiteratureEmbeddingVersionRecord[] }>();
    for (const version of versions) {
      const profile = {
        provider: version.provider,
        model: version.model,
        dimension: version.dimension,
      };
      const key = `${profile.provider}::${profile.model}::${profile.dimension}`;
      const existing = buckets.get(key);
      if (existing) {
        existing.versions.push(version);
      } else {
        buckets.set(key, {
          profile,
          versions: [version],
        });
      }
    }
    return buckets;
  }

  private async embedQueryByProfile(query: string, profile: RetrievalProfile): Promise<number[]> {
    if (profile.provider === 'local') {
      const dimension = profile.dimension > 0 ? profile.dimension : 16;
      return this.buildLocalEmbeddingVector(query, dimension);
    }

    const config = this.resolveExternalEmbeddingConfig();
    if (!config) {
      throw new Error('external embedding endpoint is not configured');
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (config.apiKey) {
      headers.Authorization = `Bearer ${config.apiKey}`;
    }

    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: profile.model,
        inputs: [query],
      }),
    });
    if (!response.ok) {
      throw new Error(`external embedding request failed with status ${response.status}`);
    }

    const payload = (await response.json()) as Record<string, unknown>;
    const vector = this.readSingleEmbeddingVector(payload);
    if (vector.length === 0) {
      throw new Error('external embedding response does not include usable vector');
    }
    if (profile.dimension > 0 && vector.length !== profile.dimension) {
      throw new Error(`vector dimension mismatch: expected ${profile.dimension}, got ${vector.length}`);
    }
    return vector;
  }

  private resolveExternalEmbeddingConfig(): { endpoint: string; apiKey: string | null } | null {
    const endpoint = (process.env.LITERATURE_PIPELINE_EMBEDDING_URL ?? '').trim();
    if (!endpoint) {
      return null;
    }
    const apiKey = (process.env.LITERATURE_PIPELINE_EMBEDDING_API_KEY ?? '').trim() || null;
    return { endpoint, apiKey };
  }

  private readSingleEmbeddingVector(payload: Record<string, unknown>): number[] {
    if (Array.isArray(payload.vectors) && payload.vectors.length > 0) {
      const first = payload.vectors[0];
      if (Array.isArray(first)) {
        return first
          .map((value) => Number(value))
          .filter((value) => Number.isFinite(value));
      }
    }

    if (Array.isArray(payload.data) && payload.data.length > 0) {
      const first = payload.data[0];
      if (first && typeof first === 'object' && Array.isArray((first as Record<string, unknown>).embedding)) {
        return ((first as Record<string, unknown>).embedding as unknown[])
          .map((value) => Number(value))
          .filter((value) => Number.isFinite(value));
      }
    }

    return [];
  }

  private buildHits(
    scoredChunks: ScoredChunk[],
    literatureTitleById: Map<string, string>,
    evidencePerLiterature: number,
  ): LiteratureRetrieveHit[] {
    const byLiterature = new Map<string, ScoredChunk[]>();
    for (const chunk of scoredChunks) {
      const rows = byLiterature.get(chunk.literatureId) ?? [];
      rows.push(chunk);
      byLiterature.set(chunk.literatureId, rows);
    }

    const hits: LiteratureRetrieveHit[] = [];
    for (const [literatureId, rows] of byLiterature.entries()) {
      const sorted = [...rows].sort((left, right) => {
        if (right.hybridScore !== left.hybridScore) {
          return right.hybridScore - left.hybridScore;
        }
        return left.chunk.chunkIndex - right.chunk.chunkIndex;
      });
      const evidenceRows = sorted.slice(0, evidencePerLiterature);
      const best = evidenceRows[0];
      if (!best) {
        continue;
      }

      hits.push({
        literature_id: literatureId,
        title: literatureTitleById.get(literatureId) ?? `Literature ${literatureId}`,
        embedding_version_id: best.embeddingVersionId,
        hybrid_score: best.hybridScore,
        vector_score: best.vectorScore,
        lexical_score: best.lexicalScore,
        evidence_chunks: evidenceRows.map((row) => ({
          chunk_id: row.chunk.chunkId,
          text: row.chunk.text,
          start_offset: row.chunk.startOffset,
          end_offset: row.chunk.endOffset,
          hybrid_score: row.hybridScore,
          vector_score: row.vectorScore,
          lexical_score: row.lexicalScore,
        })),
      });
    }

    return hits;
  }

  private lexicalScore(queryTokens: string[], text: string): number {
    if (queryTokens.length === 0) {
      return 0;
    }
    const tokenSet = new Set(this.tokenize(text));
    if (tokenSet.size === 0) {
      return 0;
    }
    const matchedCount = queryTokens.filter((token) => tokenSet.has(token)).length;
    return this.toScore(matchedCount / queryTokens.length);
  }

  private normalizedCosine(left: number[], right: number[]): number {
    if (left.length === 0 || right.length === 0 || left.length !== right.length) {
      return 0;
    }

    let dot = 0;
    let leftNorm = 0;
    let rightNorm = 0;
    for (let index = 0; index < left.length; index += 1) {
      const l = left[index] ?? 0;
      const r = right[index] ?? 0;
      dot += l * r;
      leftNorm += l * l;
      rightNorm += r * r;
    }

    if (leftNorm === 0 || rightNorm === 0) {
      return 0;
    }

    const cosine = dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
    const normalized = (cosine + 1) / 2;
    return this.toScore(Math.max(0, Math.min(1, normalized)));
  }

  private tokenize(text: string): string[] {
    return [...new Set(
      (text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [])
        .filter((token) => token.length > 1),
    )];
  }

  private buildLocalEmbeddingVector(text: string, dimension: number): number[] {
    const digest = crypto.createHash('sha256').update(text).digest();
    return Array.from({ length: dimension }, (_, index) => {
      const byte = digest[index % digest.length] ?? 0;
      const normalized = (byte / 255) * 2 - 1;
      return Number(normalized.toFixed(6));
    });
  }

  private normalizeRange(value: number | undefined, fallback: number, min: number, max: number): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return fallback;
    }
    return Math.max(min, Math.min(max, Math.trunc(value)));
  }

  private toScore(value: number): number {
    return Number(Math.max(0, Math.min(1, value)).toFixed(6));
  }
}
