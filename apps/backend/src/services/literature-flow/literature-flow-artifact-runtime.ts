import crypto from 'node:crypto';
import { AppError } from '../../errors/app-error.js';
import type {
  LiteratureEmbeddingVersionRecord,
  LiteraturePipelineArtifactRecord,
  LiteraturePipelineStateRecord,
  LiteratureRecord,
  LiteratureRepository,
} from '../../repositories/literature-repository.js';
import type { LiteratureContentProcessingSettingsService } from '../literature-content-processing-settings-service.js';

type ChunkRecord = {
  chunk_id: string;
  index: number;
  text: string;
  start_offset: number;
  end_offset: number;
};

type EmbeddingRecord = {
  chunk_id: string;
  index: number;
  vector: number[];
};

export class LiteratureFlowArtifactRuntime {
  constructor(
    private readonly repository: LiteratureRepository,
    private readonly options: {
      refreshPipelineState: (literatureId: string) => Promise<LiteraturePipelineStateRecord>;
      settingsService?: LiteratureContentProcessingSettingsService;
    },
  ) {}

  async ensureAbstractReady(literature: LiteratureRecord): Promise<{
    abstractReady: boolean;
    generated: false;
    source: 'metadata' | null;
  }> {
    const existing = (literature.abstractText ?? '').trim();
    if (existing.length > 0) {
      await this.options.refreshPipelineState(literature.id);
      return { abstractReady: true, generated: false, source: 'metadata' };
    }

    await this.options.refreshPipelineState(literature.id);
    return { abstractReady: false, generated: false, source: null };
  }

  async ensureKeyContentReady(literature: LiteratureRecord): Promise<{
    keyContentReady: boolean;
    generated: false;
    source: 'metadata' | null;
  }> {
    const existing = (literature.keyContentDigest ?? '').trim();
    if (existing.length > 0) {
      await this.options.refreshPipelineState(literature.id);
      return { keyContentReady: true, generated: false, source: 'metadata' };
    }

    await this.options.refreshPipelineState(literature.id);
    return { keyContentReady: false, generated: false, source: null };
  }

  async ensureFulltextPreprocessed(literature: LiteratureRecord): Promise<{ id: string; artifactType: string; textLength: number }> {
    const preprocessedText = this.buildPreprocessedText(literature);
    const artifact = await this.upsertPipelineArtifact({
      literatureId: literature.id,
      stageCode: 'FULLTEXT_PREPROCESSED',
      artifactType: 'PREPROCESSED_TEXT',
      payload: {
        text: preprocessedText,
        generated_at: new Date().toISOString(),
      },
      checksum: this.sha256(preprocessedText),
    });

    return {
      id: artifact.id,
      artifactType: artifact.artifactType,
      textLength: preprocessedText.length,
    };
  }

  async ensureChunked(
    literatureId: string,
    preprocessed: LiteraturePipelineArtifactRecord,
  ): Promise<LiteraturePipelineArtifactRecord> {
    const text = typeof preprocessed.payload.text === 'string' ? preprocessed.payload.text : '';
    const chunks = this.chunkText(text);

    return this.upsertPipelineArtifact({
      literatureId,
      stageCode: 'CHUNKED',
      artifactType: 'CHUNKS',
      payload: {
        chunks,
        chunk_size: 480,
        overlap: 80,
      },
      checksum: this.sha256(JSON.stringify(chunks)),
    });
  }

  async ensureEmbedded(
    literatureId: string,
    chunkArtifact: LiteraturePipelineArtifactRecord,
  ): Promise<LiteraturePipelineArtifactRecord> {
    const chunks = this.readChunks(chunkArtifact);
    const embedded = await this.embedChunks(chunks);

    return this.upsertPipelineArtifact({
      literatureId,
      stageCode: 'EMBEDDED',
      artifactType: 'EMBEDDINGS',
      payload: {
        provider: embedded.provider,
        model: embedded.model,
        dimension: embedded.dimension,
        vectors: embedded.vectors,
      },
      checksum: this.sha256(JSON.stringify(embedded.vectors)),
    });
  }

  async ensureIndexed(
    literatureId: string,
    chunkArtifact: LiteraturePipelineArtifactRecord,
    embeddedArtifact: LiteraturePipelineArtifactRecord,
  ): Promise<LiteraturePipelineArtifactRecord> {
    const chunks = this.readChunks(chunkArtifact);
    const vectors = Array.isArray(embeddedArtifact.payload.vectors)
      ? embeddedArtifact.payload.vectors.length
      : 0;

    const tokenToChunkIds = new Map<string, string[]>();
    for (const chunk of chunks) {
      const tokens = this.tokenize(chunk.text);
      for (const token of tokens) {
        const existing = tokenToChunkIds.get(token) ?? [];
        if (!existing.includes(chunk.chunk_id)) {
          tokenToChunkIds.set(token, [...existing, chunk.chunk_id]);
        }
      }
    }

    const tokenIndexObject = Object.fromEntries(tokenToChunkIds.entries());

    return this.upsertPipelineArtifact({
      literatureId,
      stageCode: 'INDEXED',
      artifactType: 'LOCAL_INDEX',
      payload: {
        index_version: 'local-v1',
        token_count: tokenToChunkIds.size,
        chunk_count: chunks.length,
        vector_count: vectors,
        token_to_chunk_ids: tokenIndexObject,
      },
      checksum: this.sha256(JSON.stringify(tokenIndexObject)),
    });
  }

  async persistEmbeddingVersionSnapshot(input: {
    literatureId: string;
    chunkArtifact: LiteraturePipelineArtifactRecord;
    embeddedArtifact: LiteraturePipelineArtifactRecord;
    tokenToChunkIds?: Map<string, string[]>;
    activate: boolean;
  }): Promise<LiteratureEmbeddingVersionRecord> {
    const literature = await this.repository.findLiteratureById(input.literatureId);
    if (!literature) {
      throw new AppError(404, 'NOT_FOUND', `Literature ${input.literatureId} not found.`);
    }

    const latestVersion = await this.repository.findLatestEmbeddingVersionByLiteratureId(input.literatureId);
    const now = new Date().toISOString();
    const chunks = this.readChunks(input.chunkArtifact);
    const vectors = this.readEmbeddings(input.embeddedArtifact);
    const vectorByChunkId = new Map(vectors.map((vector) => [vector.chunk_id, vector.vector]));
    const tokenEntries = [...(input.tokenToChunkIds?.entries() ?? [])];
    const provider = typeof input.embeddedArtifact.payload.provider === 'string'
      ? input.embeddedArtifact.payload.provider
      : 'local';
    const model = typeof input.embeddedArtifact.payload.model === 'string'
      ? input.embeddedArtifact.payload.model
      : 'local-hash-embedding-v1';
    const dimension = vectors[0]?.vector.length ?? 0;

    const version = await this.repository.createEmbeddingVersion({
      id: crypto.randomUUID(),
      literatureId: input.literatureId,
      versionNo: (latestVersion?.versionNo ?? 0) + 1,
      provider,
      model,
      dimension,
      chunkCount: chunks.length,
      vectorCount: vectors.length,
      tokenCount: tokenEntries.length,
      createdAt: now,
      updatedAt: now,
    });

    const embeddingChunks = chunks.map((chunk) => ({
      id: crypto.randomUUID(),
      embeddingVersionId: version.id,
      literatureId: input.literatureId,
      chunkId: chunk.chunk_id,
      chunkIndex: chunk.index,
      text: chunk.text,
      startOffset: chunk.start_offset,
      endOffset: chunk.end_offset,
      vector: vectorByChunkId.get(chunk.chunk_id) ?? [],
      createdAt: now,
      updatedAt: now,
    }));
    await this.repository.createEmbeddingChunks(embeddingChunks);

    const tokenIndexes = tokenEntries.map(([token, chunkIds]) => ({
      id: crypto.randomUUID(),
      embeddingVersionId: version.id,
      literatureId: input.literatureId,
      token,
      chunkIds,
      createdAt: now,
      updatedAt: now,
    }));
    if (tokenIndexes.length > 0) {
      await this.repository.createEmbeddingTokenIndexes(tokenIndexes);
    }

    if (input.activate) {
      await this.repository.updateLiterature({
        ...literature,
        activeEmbeddingVersionId: version.id,
        updatedAt: now,
      });
    }

    return version;
  }

  readTokenToChunkIds(indexedArtifact: LiteraturePipelineArtifactRecord): Map<string, string[]> {
    const payload = indexedArtifact.payload.token_to_chunk_ids;
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return new Map();
    }
    return new Map(
      Object.entries(payload).flatMap(([token, rawChunkIds]) => {
        if (!Array.isArray(rawChunkIds)) {
          return [];
        }
        const chunkIds = rawChunkIds
          .map((value) => (typeof value === 'string' ? value : null))
          .filter((value): value is string => value !== null);
        return chunkIds.length > 0 ? [[token, [...new Set(chunkIds)]]] : [];
      }),
    );
  }

  private async upsertPipelineArtifact(input: {
    literatureId: string;
    stageCode: LiteraturePipelineArtifactRecord['stageCode'];
    artifactType: LiteraturePipelineArtifactRecord['artifactType'];
    payload: Record<string, unknown>;
    checksum: string;
  }): Promise<LiteraturePipelineArtifactRecord> {
    const existing = await this.repository.findPipelineArtifact(input.literatureId, input.stageCode, input.artifactType);
    const now = new Date().toISOString();

    const upserted = await this.repository.upsertPipelineArtifact({
      id: existing?.id ?? crypto.randomUUID(),
      literatureId: input.literatureId,
      stageCode: input.stageCode,
      artifactType: input.artifactType,
      payload: input.payload,
      checksum: input.checksum,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });

    return upserted.record;
  }

  private buildPreprocessedText(literature: LiteratureRecord): string {
    const lines = [
      `title: ${literature.title}`,
      `authors: ${literature.authors.join(', ')}`,
      `year: ${literature.year ?? 'unknown'}`,
      `doi: ${literature.doiNormalized ?? 'n/a'}`,
      `arxiv_id: ${literature.arxivId ?? 'n/a'}`,
      `abstract: ${(literature.abstractText ?? '').trim()}`,
      `key_content_digest: ${(literature.keyContentDigest ?? '').trim()}`,
      `tags: ${literature.tags.join(', ')}`,
    ];
    return lines.join('\n').trim();
  }

  private chunkText(text: string): ChunkRecord[] {
    const normalized = text.replace(/\s+/g, ' ').trim();
    if (!normalized) {
      return [];
    }

    const chunkSize = 480;
    const overlap = 80;
    const chunks: ChunkRecord[] = [];
    let start = 0;
    let index = 0;

    while (start < normalized.length) {
      const end = Math.min(normalized.length, start + chunkSize);
      const slice = normalized.slice(start, end).trim();
      if (slice.length > 0) {
        chunks.push({
          chunk_id: `chunk-${String(index + 1).padStart(4, '0')}`,
          index,
          text: slice,
          start_offset: start,
          end_offset: end,
        });
        index += 1;
      }
      if (end >= normalized.length) {
        break;
      }
      start = Math.max(0, end - overlap);
    }

    return chunks;
  }

  private readChunks(chunkArtifact: LiteraturePipelineArtifactRecord): ChunkRecord[] {
    const payloadChunks = chunkArtifact.payload.chunks;
    if (!Array.isArray(payloadChunks)) {
      return [];
    }

    return payloadChunks
      .map((item, index) => {
        if (!item || typeof item !== 'object') {
          return null;
        }
        const row = item as Record<string, unknown>;
        const text = typeof row.text === 'string' ? row.text : '';
        if (!text) {
          return null;
        }
        const chunkId = typeof row.chunk_id === 'string' ? row.chunk_id : `chunk-${String(index + 1).padStart(4, '0')}`;
        return {
          chunk_id: chunkId,
          index: typeof row.index === 'number' ? row.index : index,
          text,
          start_offset: typeof row.start_offset === 'number' ? row.start_offset : 0,
          end_offset: typeof row.end_offset === 'number' ? row.end_offset : text.length,
        } satisfies ChunkRecord;
      })
      .filter((row): row is ChunkRecord => row !== null);
  }

  private readEmbeddings(embeddedArtifact: LiteraturePipelineArtifactRecord): EmbeddingRecord[] {
    const payloadVectors = embeddedArtifact.payload.vectors;
    if (!Array.isArray(payloadVectors)) {
      return [];
    }
    return payloadVectors
      .map((item, index) => {
        if (!item || typeof item !== 'object') {
          return null;
        }
        const row = item as Record<string, unknown>;
        const rawVector = Array.isArray(row.vector)
          ? row.vector.map((value) => Number(value)).filter((value) => Number.isFinite(value))
          : [];
        const chunkId = typeof row.chunk_id === 'string' ? row.chunk_id : `chunk-${String(index + 1).padStart(4, '0')}`;
        const chunkIndex = typeof row.index === 'number' ? row.index : index;
        return {
          chunk_id: chunkId,
          index: chunkIndex,
          vector: rawVector,
        } satisfies EmbeddingRecord;
      })
      .filter((row): row is EmbeddingRecord => row !== null);
  }

  private async embedChunks(chunks: ChunkRecord[]): Promise<{
    provider: 'openai' | 'local';
    model: string;
    dimension: number;
    vectors: EmbeddingRecord[];
  }> {
    const openAIConfig = await this.options.settingsService?.resolveOpenAIEmbeddingConfig();
    if (openAIConfig) {
      try {
        const openAIVectors = await this.embedChunksViaOpenAI(chunks, openAIConfig);
        return {
          provider: 'openai',
          model: openAIConfig.model,
          dimension: openAIVectors[0]?.vector.length ?? 0,
          vectors: openAIVectors,
        };
      } catch {
        // Fallback to local deterministic embeddings.
      }
    }

    const vectors = chunks.map((chunk) => ({
      chunk_id: chunk.chunk_id,
      index: chunk.index,
      vector: this.buildLocalEmbeddingVector(chunk.text),
    }));

    return {
      provider: 'local',
      model: 'local-hash-embedding-v1',
      dimension: vectors[0]?.vector.length ?? 0,
      vectors,
    };
  }

  private async embedChunksViaOpenAI(
    chunks: ChunkRecord[],
    config: { apiKey: string; model: string; dimensions: number | null },
  ): Promise<EmbeddingRecord[]> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    };

    const body: Record<string, unknown> = {
      model: config.model,
      input: chunks.map((chunk) => chunk.text),
      encoding_format: 'float',
    };
    if (config.dimensions !== null) {
      body.dimensions = config.dimensions;
    }

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`OpenAI embedding request failed: ${response.status}`);
    }

    const payload = (await response.json()) as Record<string, unknown>;

    let rawVectors: number[][] = [];
    if (Array.isArray(payload.vectors)) {
      rawVectors = payload.vectors
        .map((item) => (Array.isArray(item) ? item.map((value) => Number(value)).filter((v) => Number.isFinite(v)) : null))
        .filter((item): item is number[] => Array.isArray(item));
    } else if (Array.isArray(payload.data)) {
      rawVectors = payload.data
        .map((row) => {
          if (!row || typeof row !== 'object') {
            return null;
          }
          const embedding = (row as Record<string, unknown>).embedding;
          if (!Array.isArray(embedding)) {
            return null;
          }
          const vector = embedding.map((value) => Number(value)).filter((v) => Number.isFinite(v));
          return vector.length > 0 ? vector : null;
        })
        .filter((item): item is number[] => item !== null);
    }

    if (rawVectors.length !== chunks.length || rawVectors.some((vector) => vector.length === 0)) {
      throw new Error('OpenAI embedding response shape mismatch.');
    }

    return chunks.map((chunk, index) => ({
      chunk_id: chunk.chunk_id,
      index: chunk.index,
      vector: rawVectors[index]!,
    }));
  }

  private buildLocalEmbeddingVector(text: string): number[] {
    const digest = crypto.createHash('sha256').update(text).digest();
    const dimension = 16;
    return Array.from({ length: dimension }, (_, index) => {
      const byte = digest[index % digest.length] ?? 0;
      const normalized = (byte / 255) * 2 - 1;
      return Number(normalized.toFixed(6));
    });
  }

  private tokenize(text: string): string[] {
    return [...new Set(
      (text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [])
        .filter((token) => token.length > 1),
    )];
  }

  private sha256(text: string): string {
    return crypto.createHash('sha256').update(text).digest('hex');
  }
}
