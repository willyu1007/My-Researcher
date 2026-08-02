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
  isPaperImplementationSemanticEmbeddingProfileV2Valid,
  PAPER_IMPLEMENTATION_SEMANTIC_MAX_QUERY_TIMEOUT_MS_V2,
  PAPER_IMPLEMENTATION_SEMANTIC_MAX_PROJECT_DOCUMENTS_V2,
  PaperImplementationSemanticProjectionV2RepositoryError,
  type PaperImplementationSemanticEmbeddingProfileV2,
  type PaperImplementationSemanticProjectionIdentityV2,
  type PaperImplementationSemanticProjectionV2Repository,
  type SearchPaperImplementationSemanticProjectProjectionV2Result,
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

type SemanticAttemptResult =
  | {
    kind: 'success';
    search: SearchPaperImplementationSemanticProjectProjectionV2Result;
  }
  | {
    kind: 'fallback';
    reason: PaperImplementationSemanticFallbackReasonV2;
  };

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
  hit: PaperImplementationSemanticProjectionIdentityV2,
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

function assertAuthorizedRankingInput(
  rankingInput: PaperImplementationSemanticRankingInputV2,
  implementationProjectId: string,
  query: string,
): void {
  const candidateIds = new Set(
    rankingInput.candidates.map((document) => document.document_id),
  );
  if (
    rankingInput.implementation_project_id !== implementationProjectId
    || rankingInput.query !== query.trim()
    || candidateIds.size !== rankingInput.candidates.length
    || rankingInput.candidates.some((document) => (
      document.implementation_project_id !== implementationProjectId
    ))
  ) {
    throw new PaperImplementationSemanticRetrievalV2ServiceError(
      'SEMANTIC_AUTHORIZED_INPUT_INVALID',
      'Structured semantic ranking input has invalid project scope',
    );
  }
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
      !isPaperImplementationSemanticEmbeddingProfileV2Valid(options.embeddingProfile)
      || !Number.isSafeInteger(this.semanticTimeoutMs)
      || this.semanticTimeoutMs < 1
      || this.semanticTimeoutMs > PAPER_IMPLEMENTATION_SEMANTIC_MAX_QUERY_TIMEOUT_MS_V2
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
    assertAuthorizedRankingInput(
      rankingInput,
      input.implementation_project_id,
      input.query,
    );
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
    let attempt: SemanticAttemptResult;
    const deadlineMs = Date.now() + this.semanticTimeoutMs;
    try {
      const semanticAttempt = this.runSemanticAttempt(
        rankingInput,
        resultLimit,
        abortController.signal,
        deadlineMs,
      );
      const timeoutAttempt = new Promise<SemanticAttemptResult>(
        (resolve) => {
          timeout = setTimeout(() => {
            abortController.abort();
            resolve({ kind: 'fallback', reason: 'SEMANTIC_ATTEMPT_TIMEOUT' });
          }, this.semanticTimeoutMs);
        },
      );
      attempt = await Promise.race([semanticAttempt, timeoutAttempt]);
    } finally {
      if (timeout !== undefined) clearTimeout(timeout);
    }

    // Re-resolve the authoritative source after semantic work. A concurrent
    // lineage change must never be returned as a semantically ranked stale snapshot.
    const currentInput = await this.options.rankingInputReader.prepareAuthorizedRankingInput(
      input.implementation_project_id,
      input.query,
    );
    assertAuthorizedRankingInput(
      currentInput,
      input.implementation_project_id,
      input.query,
    );
    if (attempt.kind === 'fallback') {
      return structuredFallback(currentInput, attempt.reason);
    }
    return this.rankSemanticSearch(currentInput, attempt.search, resultLimit);
  }

  private async runSemanticAttempt(
    rankingInput: PaperImplementationSemanticRankingInputV2,
    resultLimit: number,
    signal: AbortSignal,
    deadlineMs: number,
  ): Promise<SemanticAttemptResult> {
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
      return { kind: 'fallback', reason };
    }

    const queryTimeoutMs = deadlineMs - Date.now();
    if (queryTimeoutMs < 1) {
      return { kind: 'fallback', reason: 'SEMANTIC_ATTEMPT_TIMEOUT' };
    }
    try {
      const search = await this.options.projectionRepository.searchProjectProjection({
        implementation_project_id: rankingInput.implementation_project_id,
        embedding_profile: this.options.embeddingProfile,
        normalized_query_vector: queryVector,
        limit: resultLimit,
        query_timeout_ms: queryTimeoutMs,
      });
      return { kind: 'success', search };
    } catch (error) {
      if (error instanceof PaperImplementationSemanticProjectionV2RepositoryError) {
        if (error.reasonCode === 'PROJECTION_QUERY_TIMEOUT') {
          return { kind: 'fallback', reason: 'SEMANTIC_ATTEMPT_TIMEOUT' };
        }
        if (error.reasonCode === 'PROJECTION_STORED_INTEGRITY_ERROR') {
          return { kind: 'fallback', reason: 'SEMANTIC_INDEX_CORRUPT' };
        }
      }
      return { kind: 'fallback', reason: 'SEMANTIC_INDEX_UNAVAILABLE' };
    }
  }

  private rankSemanticSearch(
    rankingInput: PaperImplementationSemanticRankingInputV2,
    search: SearchPaperImplementationSemanticProjectProjectionV2Result,
    resultLimit: number,
  ): PaperImplementationSemanticRetrievalV2Response {
    const currentById = new Map(
      rankingInput.candidates.map((document) => [document.document_id, document]),
    );
    const seenCoverageIds = new Set<string>();
    let staleHitsDropped = 0;
    for (const identity of search.coverage) {
      if (seenCoverageIds.has(identity.document_id)) {
        return structuredFallback(
          rankingInput,
          'SEMANTIC_INDEX_CORRUPT',
          search.hits.length,
          staleHitsDropped,
        );
      }
      seenCoverageIds.add(identity.document_id);
      if (!exactCurrentHit(
        identity,
        currentById.get(identity.document_id),
        rankingInput.implementation_project_id,
      )) {
        staleHitsDropped += 1;
      }
    }
    if (
      search.coverage.length !== rankingInput.candidates.length
      || staleHitsDropped > 0
    ) {
      return structuredFallback(
        rankingInput,
        'SEMANTIC_INDEX_INCOMPLETE',
        search.hits.length,
        staleHitsDropped,
      );
    }

    const seenHitIds = new Set<string>();
    const accepted: Array<{
      document: PaperImplementationSemanticDocumentV2;
      semanticScore: number;
    }> = [];
    for (const hit of search.hits) {
      if (seenHitIds.has(hit.document_id) || !Number.isFinite(hit.semantic_score)) {
        return structuredFallback(
          rankingInput,
          'SEMANTIC_INDEX_CORRUPT',
          search.hits.length,
          staleHitsDropped,
        );
      }
      seenHitIds.add(hit.document_id);
      const current = currentById.get(hit.document_id);
      if (
        !seenCoverageIds.has(hit.document_id)
        || !exactCurrentHit(hit, current, rankingInput.implementation_project_id)
      ) {
        staleHitsDropped += 1;
        continue;
      }
      accepted.push({ document: current, semanticScore: hit.semantic_score });
    }
    accepted.sort((left, right) => (
      right.semanticScore - left.semanticScore
      || compareText(left.document.document_id, right.document.document_id)
    ));
    const expectedHitCount = Math.min(resultLimit, search.coverage.length);
    if (
      search.hits.length !== expectedHitCount
      || staleHitsDropped > 0
      || accepted.length !== expectedHitCount
    ) {
      return structuredFallback(
        rankingInput,
        'SEMANTIC_INDEX_INCOMPLETE',
        search.hits.length,
        staleHitsDropped,
      );
    }
    return {
      schema_version: PAPER_IMPLEMENTATION_SEMANTIC_DOCUMENT_SCHEMA_VERSION_V2,
      implementation_project_id: rankingInput.implementation_project_id,
      query: rankingInput.query,
      retrieval_mode: 'semantic',
      fallback_reason: null,
      semantic_hits_considered: search.hits.length,
      stale_hits_dropped: staleHitsDropped,
      results: accepted.map((result, index) => ({
        rank: index + 1,
        match_mode: 'semantic',
        semantic_score: result.semanticScore,
        document: result.document,
      })),
    };
  }
}
