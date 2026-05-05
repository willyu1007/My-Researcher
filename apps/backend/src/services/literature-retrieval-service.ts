import type {
  LiteratureRetrieveHit,
  LiteratureEmbeddingProfileId,
  LiteratureRetrieveProfileId,
  LiteratureRetrieveRequest,
  LiteratureRetrieveResponse,
} from '@paper-engineering-assistant/shared/research-lifecycle/literature-contracts';
import { AppError } from '../errors/app-error.js';
import type {
  LiteratureEmbeddingChunkRecord,
  LiteratureEmbeddingVersionRecord,
  LiteratureRepository,
} from '../repositories/literature-repository.js';
import type { ActiveEmbeddingProfileConfig, LiteratureContentProcessingSettingsService } from './literature-content-processing-settings-service.js';

type RetrievalProfile = {
  profileId: LiteratureEmbeddingProfileId;
  provider: string;
  model: string;
  dimension: number;
};

type RetrievalProfileConfig = {
  vectorWeight: number;
  lexicalWeight: number;
  metadataWeight: number;
  chunkBoosts: Record<string, number>;
};

type ScoredChunk = {
  literatureId: string;
  embeddingVersionId: string;
  chunk: LiteratureEmbeddingChunkRecord;
  hybridScore: number;
  vectorScore: number;
  lexicalScore: number;
  metadataScore: number;
  profileBoost: number;
  isStale: boolean;
  warnings: string[];
};

const RETRIEVAL_PROFILE_CONFIGS: Record<LiteratureRetrieveProfileId, RetrievalProfileConfig> = {
  general: {
    vectorWeight: 0.6,
    lexicalWeight: 0.3,
    metadataWeight: 0.1,
    chunkBoosts: {
      abstract: 0.06,
      semantic_dossier: 0.05,
      evidence: 0.04,
    },
  },
  topic_exploration: {
    vectorWeight: 0.55,
    lexicalWeight: 0.25,
    metadataWeight: 0.2,
    chunkBoosts: {
      semantic_dossier: 0.12,
      abstract: 0.08,
      evidence: 0.06,
    },
  },
  paper_management: {
    vectorWeight: 0.45,
    lexicalWeight: 0.4,
    metadataWeight: 0.15,
    chunkBoosts: {
      abstract: 0.1,
      fulltext_section: 0.08,
      fulltext_paragraph: 0.05,
    },
  },
  writing_evidence: {
    vectorWeight: 0.55,
    lexicalWeight: 0.25,
    metadataWeight: 0.2,
    chunkBoosts: {
      evidence: 0.16,
      fulltext_paragraph: 0.1,
      figure: 0.08,
      table: 0.08,
    },
  },
};

export class LiteratureRetrievalService {
  constructor(
    private readonly repository: LiteratureRepository,
    private readonly settingsService?: LiteratureContentProcessingSettingsService,
  ) {}

  async retrieve(request: LiteratureRetrieveRequest): Promise<LiteratureRetrieveResponse> {
    const query = request.query.trim();
    if (!query) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'query cannot be empty.');
    }

    const queryTokens = this.tokenize(query);
    const profileId = this.normalizeProfile(request.profile);
    const profileConfig = RETRIEVAL_PROFILE_CONFIGS[profileId];
    const topK = this.normalizeRange(request.top_k, 10, 1, 30);
    const evidencePerLiterature = this.normalizeRange(request.evidence_per_literature, 3, 1, 5);

    const activeEmbeddingProfile = await this.resolveActiveEmbeddingProfile();
    const resolvedVersions = await this.resolveCandidateVersions(request);
    const { compatibleVersions: candidateVersions, skippedProfiles } = this.filterVersionsByActiveProfile(
      resolvedVersions,
      activeEmbeddingProfile,
    );
    if (candidateVersions.length === 0) {
      return {
        items: [],
        meta: {
          profile: profileId,
          query_tokens: queryTokens,
          degraded_mode: false,
          freshness_warnings: [],
          profiles_used: [],
          skipped_profiles: skippedProfiles,
        },
      };
    }

    const literatureIds = [...new Set(candidateVersions.map((version) => version.literatureId))];
    const literatures = await this.repository.listLiteraturesByIds(literatureIds);
    const literatureTitleById = new Map(literatures.map((item) => [item.id, item.title]));
    const staleWarnings = await this.resolveFreshnessWarnings(literatureIds, candidateVersions);
    const staleByVersionId = new Map(staleWarnings.map((warning) => [warning.embedding_version_id, warning]));

    const profilesUsed: LiteratureRetrieveResponse['meta']['profiles_used'] = [];
    const scoredChunks: ScoredChunk[] = [];
    let degradedMode = false;

    const retrievalProfile = this.toRetrievalProfile(activeEmbeddingProfile, candidateVersions);
    let queryVector: number[] | null = null;
    try {
      queryVector = await this.embedQueryByProfile(query, retrievalProfile);
    } catch (error) {
      degradedMode = true;
      skippedProfiles.push({
        provider: retrievalProfile.provider,
        model: retrievalProfile.model,
        dimension: retrievalProfile.dimension,
        reason: error instanceof Error ? error.message : 'embedding query failed',
      });
    }

    const chunks = await this.repository.listEmbeddingChunksByEmbeddingVersionIds(
      candidateVersions.map((version) => version.id),
    );
    if (chunks.length === 0) {
      skippedProfiles.push({
        provider: retrievalProfile.provider,
        model: retrievalProfile.model,
        dimension: retrievalProfile.dimension,
        reason: 'no chunks available for active embedding profile',
      });
    }

    const versionById = new Map(candidateVersions.map((version) => [version.id, version]));
    if (queryVector) {
      profilesUsed.push({
        provider: retrievalProfile.provider,
        model: retrievalProfile.model,
        dimension: retrievalProfile.dimension,
        literature_count: candidateVersions.length,
      });
    }

    for (const chunk of chunks) {
      const version = versionById.get(chunk.embeddingVersionId);
      if (!version) {
        continue;
      }
      const vectorScore = queryVector ? this.normalizedCosine(queryVector, chunk.vector) : 0;
      const lexicalScore = this.lexicalScore(queryTokens, chunk.text);
      const profileBoost = profileConfig.chunkBoosts[chunk.chunkType] ?? 0;
      const metadataScore = this.metadataScore(queryTokens, chunk, profileBoost);
      const hybridScore = this.toScore(
        (vectorScore * profileConfig.vectorWeight)
        + (lexicalScore * profileConfig.lexicalWeight)
        + (metadataScore * profileConfig.metadataWeight),
      );
      const staleWarning = staleByVersionId.get(version.id);
      scoredChunks.push({
        literatureId: version.literatureId,
        embeddingVersionId: version.id,
        chunk,
        hybridScore,
        vectorScore,
        lexicalScore,
        metadataScore,
        profileBoost,
        isStale: Boolean(staleWarning),
        warnings: staleWarning ? [staleWarning.reason_message] : [],
      });
    }

    const hits = this.buildHits(scoredChunks, literatureTitleById, evidencePerLiterature, profileId)
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
        profile: profileId,
        query_tokens: queryTokens,
        degraded_mode: degradedMode,
        freshness_warnings: staleWarnings,
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

  private async resolveFreshnessWarnings(
    literatureIds: string[],
    versions: LiteratureEmbeddingVersionRecord[],
  ): Promise<LiteratureRetrieveResponse['meta']['freshness_warnings']> {
    const stageStates = await this.repository.listPipelineStageStatesByLiteratureIds(literatureIds);
    const indexedStateByLiterature = new Map(
      stageStates
        .filter((stage) => stage.stageCode === 'INDEXED')
        .map((stage) => [stage.literatureId, stage]),
    );
    return versions.flatMap((version) => {
      const stage = indexedStateByLiterature.get(version.literatureId);
      if (stage?.status !== 'STALE') {
        return [];
      }
      return [{
        literature_id: version.literatureId,
        embedding_version_id: version.id,
        reason_code: typeof stage.detail.reason_code === 'string' ? stage.detail.reason_code : 'INDEX_STALE',
        reason_message: typeof stage.detail.reason_message === 'string'
          ? stage.detail.reason_message
          : 'Active index is stale and may not reflect latest content.',
      }];
    });
  }

  private filterVersionsByActiveProfile(
    versions: LiteratureEmbeddingVersionRecord[],
    activeProfile: ActiveEmbeddingProfileConfig,
  ): {
    compatibleVersions: LiteratureEmbeddingVersionRecord[];
    skippedProfiles: LiteratureRetrieveResponse['meta']['skipped_profiles'];
  } {
    const profileCandidates = versions.filter((version) =>
      version.profileId === activeProfile.profileId
      && version.provider === activeProfile.provider
      && version.model === activeProfile.model,
    );
    const activeDimension = activeProfile.dimensions ?? profileCandidates[0]?.dimension ?? null;
    const compatibleVersions = activeDimension === null
      ? profileCandidates
      : profileCandidates.filter((version) => version.dimension === activeDimension);
    const skippedProfiles: LiteratureRetrieveResponse['meta']['skipped_profiles'] = [];
    for (const version of versions) {
      if (compatibleVersions.some((item) => item.id === version.id)) {
        continue;
      }
      skippedProfiles.push({
        provider: version.provider,
        model: version.model,
        dimension: version.dimension,
        reason: version.profileId !== activeProfile.profileId
          ? `inactive embedding profile ${version.profileId ?? 'unknown'}`
          : version.model !== activeProfile.model
            ? `inactive embedding model ${version.model}`
            : `inactive embedding dimension ${version.dimension}`,
      });
    }
    return { compatibleVersions, skippedProfiles };
  }

  private async resolveActiveEmbeddingProfile(): Promise<ActiveEmbeddingProfileConfig> {
    if (!this.settingsService) {
      return {
        profileId: 'default',
        provider: 'openai',
        model: 'text-embedding-3-large',
        dimensions: null,
      };
    }
    return this.settingsService.resolveActiveEmbeddingProfile();
  }

  private toRetrievalProfile(
    activeProfile: ActiveEmbeddingProfileConfig,
    versions: LiteratureEmbeddingVersionRecord[],
  ): RetrievalProfile {
    return {
      profileId: activeProfile.profileId,
      provider: activeProfile.provider,
      model: activeProfile.model,
      dimension: activeProfile.dimensions ?? versions[0]?.dimension ?? 0,
    };
  }

  private async embedQueryByProfile(query: string, profile: RetrievalProfile): Promise<number[]> {
    if (profile.provider !== 'openai') {
      throw new Error(`unsupported embedding provider ${profile.provider}`);
    }

    const config = await this.settingsService?.resolveOpenAIEmbeddingConfig(profile.profileId);
    if (!config) {
      throw new Error('OpenAI embedding API key is not configured');
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    };

    const body: Record<string, unknown> = {
      model: profile.model,
      input: query,
      encoding_format: 'float',
    };
    const requestedDimensions = profile.dimension > 0 ? profile.dimension : config.dimensions;
    if (requestedDimensions !== null) {
      body.dimensions = requestedDimensions;
    }

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`OpenAI embedding request failed with status ${response.status}`);
    }

    const payload = (await response.json()) as Record<string, unknown>;
    const vector = this.readSingleEmbeddingVector(payload);
    if (vector.length === 0) {
      throw new Error('OpenAI embedding response does not include usable vector');
    }
    if (profile.dimension > 0 && vector.length !== profile.dimension) {
      throw new Error(`vector dimension mismatch: expected ${profile.dimension}, got ${vector.length}`);
    }
    return vector;
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
    profileId: LiteratureRetrieveProfileId,
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
        retrieval_profile: profileId,
        is_stale: evidenceRows.some((row) => row.isStale),
        warnings: [...new Set(evidenceRows.flatMap((row) => row.warnings))],
        hybrid_score: best.hybridScore,
        vector_score: best.vectorScore,
        lexical_score: best.lexicalScore,
        evidence_chunks: evidenceRows.map((row) => ({
          chunk_id: row.chunk.chunkId,
          chunk_type: row.chunk.chunkType,
          text: row.chunk.text,
          start_offset: row.chunk.startOffset,
          end_offset: row.chunk.endOffset,
          source_refs: row.chunk.sourceRefs,
          metadata: row.chunk.metadata,
          hybrid_score: row.hybridScore,
          vector_score: row.vectorScore,
          lexical_score: row.lexicalScore,
          score_breakdown: {
            vector: row.vectorScore,
            lexical: row.lexicalScore,
            metadata: row.metadataScore,
            profile_boost: row.profileBoost,
          },
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

  private metadataScore(
    queryTokens: string[],
    chunk: LiteratureEmbeddingChunkRecord,
    profileBoost: number,
  ): number {
    const metadataText = JSON.stringify({
      chunk_type: chunk.chunkType,
      metadata: chunk.metadata,
      source_refs: chunk.sourceRefs,
    });
    const lexical = this.lexicalScore(queryTokens, metadataText);
    return this.toScore(Math.min(1, profileBoost + lexical));
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

  private normalizeRange(value: number | undefined, fallback: number, min: number, max: number): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return fallback;
    }
    return Math.max(min, Math.min(max, Math.trunc(value)));
  }

  private normalizeProfile(value: LiteratureRetrieveProfileId | undefined): LiteratureRetrieveProfileId {
    return value && value in RETRIEVAL_PROFILE_CONFIGS ? value : 'general';
  }

  private toScore(value: number): number {
    return Number(Math.max(0, Math.min(1, value)).toFixed(6));
  }
}
