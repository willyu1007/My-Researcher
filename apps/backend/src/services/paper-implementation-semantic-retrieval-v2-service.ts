import {
  PAPER_IMPLEMENTATION_SEMANTIC_DEFAULT_RESULT_LIMIT_V2,
  PAPER_IMPLEMENTATION_SEMANTIC_DOCUMENT_SCHEMA_VERSION_V2,
  PAPER_IMPLEMENTATION_SEMANTIC_MAX_RESULT_LIMIT_V2,
  PAPER_IMPLEMENTATION_SEMANTIC_VECTOR_DIMENSION_V2,
  type PaperImplementationSemanticDocumentV2,
  type PaperImplementationSemanticFallbackReasonV2,
  type PaperImplementationSemanticRetrievalV2Response,
  type PaperImplementationSemanticRankingInputV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-semantic-retrieval-v2-contracts';

import {
  PAPER_IMPLEMENTATION_SEMANTIC_MAX_PROJECT_DOCUMENTS_V2,
  PaperImplementationSemanticProjectionV2RepositoryError,
  type PaperImplementationSemanticEmbeddingProfileV2,
  type PaperImplementationSemanticProjectionHitV2,
  type PaperImplementationSemanticProjectionV2Repository,
} from '../repositories/paper-implementation-semantic-projection-v2.repository.js';

export interface PaperImplementationSemanticRankingInputV2Reader {
  prepareAuthorizedRankingInput(
    implementationProjectId: string,
    query: string,
  ): Promise<PaperImplementationSemanticRankingInputV2>;
}

export interface PaperImplementationSemanticQueryEmbeddingV2Port {
  embedQuery(input: {
    profile: PaperImplementationSemanticEmbeddingProfileV2;
    query: string;
    signal: AbortSignal;
  }): Promise<number[]>;
}

export type PaperImplementationSemanticRetrievalV2ServiceReasonCode =
  | 'SEMANTIC_AUTHORIZED_INPUT_INVALID'
  | 'SEMANTIC_CONFIGURATION_INVALID'
  | 'SEMANTIC_RESULT_LIMIT_INVALID';

export class PaperImplementationSemanticRetrievalV2ServiceError extends Error {
  constructor(
    public readonly reasonCode: PaperImplementationSemanticRetrievalV2ServiceReasonCode,
    message: string,
  ) {
    super(message);
    this.name = 'PaperImplementationSemanticRetrievalV2ServiceError';
  }
}

export interface PaperImplementationSemanticRetrievalV2ServiceOptions {
  rankingInputReader: PaperImplementationSemanticRankingInputV2Reader;
  queryEmbeddingPort: PaperImplementationSemanticQueryEmbeddingV2Port;
  projectionRepository: Pick<
    PaperImplementationSemanticProjectionV2Repository,
    'searchProjectProjection'
  >;
  embeddingProfile: PaperImplementationSemanticEmbeddingProfileV2;
  semanticTimeoutMs?: number;
}

class SemanticFallbackSignal extends Error {
  constructor(public readonly reason: PaperImplementationSemanticFallbackReasonV2) {
    super(reason);
    this.name = 'SemanticFallbackSignal';
  }
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function normalizeQueryVector(values: readonly number[]): number[] {
  if (values.length !== PAPER_IMPLEMENTATION_SEMANTIC_VECTOR_DIMENSION_V2) {
    throw new SemanticFallbackSignal('QUERY_EMBEDDING_INVALID');
  }
  let squaredNorm = 0;
  for (const value of values) {
    if (!Number.isFinite(value)) {
      throw new SemanticFallbackSignal('QUERY_EMBEDDING_INVALID');
    }
    squaredNorm += value * value;
  }
  const norm = Math.sqrt(squaredNorm);
  if (!Number.isFinite(norm) || norm === 0) {
    throw new SemanticFallbackSignal('QUERY_EMBEDDING_INVALID');
  }
  return values.map((value) => {
    const normalized = Math.fround(value / norm);
    return Object.is(normalized, -0) ? 0 : normalized;
  });
}

function exactCurrentHit(
  hit: PaperImplementationSemanticProjectionHitV2,
  current: PaperImplementationSemanticDocumentV2 | undefined,
  implementationProjectId: string,
): current is PaperImplementationSemanticDocumentV2 {
  return current !== undefined
    && hit.implementation_project_id === implementationProjectId
    && current.implementation_project_id === implementationProjectId
    && hit.document_id === current.document_id
    && hit.source.source_type === current.source.source_type
    && hit.source.source_id === current.source.source_id
    && hit.source.source_version === current.source.source_version
    && hit.source.source_hash === current.source.source_hash
    && hit.document_hash === current.document_hash;
}

function structuredFallback(
  input: PaperImplementationSemanticRankingInputV2,
  reason: PaperImplementationSemanticFallbackReasonV2,
  semanticHitsConsidered = 0,
  staleHitsDropped = 0,
): PaperImplementationSemanticRetrievalV2Response {
  return {
    schema_version: PAPER_IMPLEMENTATION_SEMANTIC_DOCUMENT_SCHEMA_VERSION_V2,
    implementation_project_id: input.implementation_project_id,
    query: input.query,
    retrieval_mode: 'structured_fallback',
    fallback_reason: reason,
    semantic_hits_considered: semanticHitsConsidered,
    stale_hits_dropped: staleHitsDropped,
    results: input.candidates.map((document, index) => ({
      rank: index + 1,
      match_mode: 'structured_fallback',
      semantic_score: null,
      document,
    })),
  };
}

export class PaperImplementationSemanticRetrievalV2Service {
  private readonly semanticTimeoutMs: number;

  constructor(private readonly options: PaperImplementationSemanticRetrievalV2ServiceOptions) {
    this.semanticTimeoutMs = options.semanticTimeoutMs ?? 2_000;
    if (
      options.embeddingProfile.dimension !== PAPER_IMPLEMENTATION_SEMANTIC_VECTOR_DIMENSION_V2
      || options.embeddingProfile.profile_id.trim().length === 0
      || options.embeddingProfile.provider.trim().length === 0
      || options.embeddingProfile.model.trim().length === 0
      || !Number.isSafeInteger(this.semanticTimeoutMs)
      || this.semanticTimeoutMs < 1
    ) {
      throw new PaperImplementationSemanticRetrievalV2ServiceError(
        'SEMANTIC_CONFIGURATION_INVALID',
        'Semantic retrieval configuration is invalid',
      );
    }
  }

  async retrieve(input: {
    implementation_project_id: string;
    query: string;
    result_limit?: number;
  }): Promise<PaperImplementationSemanticRetrievalV2Response> {
    const resultLimit = input.result_limit
      ?? PAPER_IMPLEMENTATION_SEMANTIC_DEFAULT_RESULT_LIMIT_V2;
    if (
      !Number.isSafeInteger(resultLimit)
      || resultLimit < 1
      || resultLimit > PAPER_IMPLEMENTATION_SEMANTIC_MAX_RESULT_LIMIT_V2
    ) {
      throw new PaperImplementationSemanticRetrievalV2ServiceError(
        'SEMANTIC_RESULT_LIMIT_INVALID',
        `Semantic result limit must be 1..${PAPER_IMPLEMENTATION_SEMANTIC_MAX_RESULT_LIMIT_V2}`,
      );
    }

    // This authoritative read is deliberately outside the semantic timeout.
    // Structured lineage must resolve project scope before any provider/index call.
    const rankingInput = await this.options.rankingInputReader.prepareAuthorizedRankingInput(
      input.implementation_project_id,
      input.query,
    );
    const candidateIds = new Set(
      rankingInput.candidates.map((document) => document.document_id),
    );
    if (
      rankingInput.implementation_project_id !== input.implementation_project_id
      || candidateIds.size !== rankingInput.candidates.length
      || rankingInput.candidates.some((document) => (
        document.implementation_project_id !== input.implementation_project_id
      ))
    ) {
      throw new PaperImplementationSemanticRetrievalV2ServiceError(
        'SEMANTIC_AUTHORIZED_INPUT_INVALID',
        'Structured semantic ranking input has invalid project scope',
      );
    }
    if (rankingInput.candidates.length === 0) {
      return structuredFallback(rankingInput, 'NO_CURRENT_SEMANTIC_HITS');
    }
    if (
      rankingInput.candidates.length
        > PAPER_IMPLEMENTATION_SEMANTIC_MAX_PROJECT_DOCUMENTS_V2
    ) {
      return structuredFallback(rankingInput, 'SEMANTIC_INDEX_UNAVAILABLE');
    }

    const abortController = new AbortController();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const semanticAttempt = this.runSemanticAttempt(
        rankingInput,
        resultLimit,
        abortController.signal,
      );
      const timeoutAttempt = new Promise<PaperImplementationSemanticRetrievalV2Response>(
        (resolve) => {
          timeout = setTimeout(() => {
            abortController.abort();
            resolve(structuredFallback(rankingInput, 'SEMANTIC_ATTEMPT_TIMEOUT'));
          }, this.semanticTimeoutMs);
        },
      );
      return await Promise.race([semanticAttempt, timeoutAttempt]);
    } finally {
      if (timeout !== undefined) clearTimeout(timeout);
    }
  }

  private async runSemanticAttempt(
    rankingInput: PaperImplementationSemanticRankingInputV2,
    resultLimit: number,
    signal: AbortSignal,
  ): Promise<PaperImplementationSemanticRetrievalV2Response> {
    let queryVector: number[];
    try {
      queryVector = normalizeQueryVector(
        await this.options.queryEmbeddingPort.embedQuery({
          profile: this.options.embeddingProfile,
          query: rankingInput.query,
          signal,
        }),
      );
    } catch (error) {
      const reason = error instanceof SemanticFallbackSignal
        ? error.reason
        : 'QUERY_EMBEDDING_UNAVAILABLE';
      return structuredFallback(rankingInput, reason);
    }

    let hits: PaperImplementationSemanticProjectionHitV2[];
    try {
      hits = await this.options.projectionRepository.searchProjectProjection({
        implementation_project_id: rankingInput.implementation_project_id,
        embedding_profile: this.options.embeddingProfile,
        normalized_query_vector: queryVector,
        limit: rankingInput.candidates.length,
      });
    } catch (error) {
      const reason = error instanceof PaperImplementationSemanticProjectionV2RepositoryError
        && error.reasonCode === 'PROJECTION_STORED_INTEGRITY_ERROR'
        ? 'SEMANTIC_INDEX_CORRUPT'
        : 'SEMANTIC_INDEX_UNAVAILABLE';
      return structuredFallback(rankingInput, reason);
    }

    const currentById = new Map(
      rankingInput.candidates.map((document) => [document.document_id, document]),
    );
    const seenHitIds = new Set<string>();
    const accepted: Array<{
      document: PaperImplementationSemanticDocumentV2;
      semanticScore: number;
    }> = [];
    let staleHitsDropped = 0;
    for (const hit of hits) {
      if (seenHitIds.has(hit.document_id) || !Number.isFinite(hit.semantic_score)) {
        return structuredFallback(
          rankingInput,
          'SEMANTIC_INDEX_CORRUPT',
          hits.length,
          staleHitsDropped,
        );
      }
      seenHitIds.add(hit.document_id);
      const current = currentById.get(hit.document_id);
      if (!exactCurrentHit(hit, current, rankingInput.implementation_project_id)) {
        staleHitsDropped += 1;
        continue;
      }
      accepted.push({ document: current, semanticScore: hit.semantic_score });
    }
    accepted.sort((left, right) => (
      right.semanticScore - left.semanticScore
      || compareText(left.document.document_id, right.document.document_id)
    ));
    if (
      hits.length !== rankingInput.candidates.length
      || staleHitsDropped > 0
      || accepted.length !== rankingInput.candidates.length
    ) {
      return structuredFallback(
        rankingInput,
        'SEMANTIC_INDEX_INCOMPLETE',
        hits.length,
        staleHitsDropped,
      );
    }
    return {
      schema_version: PAPER_IMPLEMENTATION_SEMANTIC_DOCUMENT_SCHEMA_VERSION_V2,
      implementation_project_id: rankingInput.implementation_project_id,
      query: rankingInput.query,
      retrieval_mode: 'semantic',
      fallback_reason: null,
      semantic_hits_considered: hits.length,
      stale_hits_dropped: staleHitsDropped,
      results: accepted.slice(0, resultLimit).map((result, index) => ({
        rank: index + 1,
        match_mode: 'semantic',
        semantic_score: result.semanticScore,
        document: result.document,
      })),
    };
  }
}
