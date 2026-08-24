import {
  PAPER_IMPLEMENTATION_SEMANTIC_DOCUMENT_SCHEMA_VERSION_V2,
  PAPER_IMPLEMENTATION_SEMANTIC_VECTOR_DIMENSION_V2,
  type PaperImplementationSemanticIndexRebuildV2Response,
  type PaperImplementationSemanticRetrievalV2Request,
  type PaperImplementationSemanticRetrievalV2Response,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-semantic-retrieval-v2-contracts';

import type {
  PaperImplementationSemanticProjectionV2Repository,
  PaperImplementationSemanticEmbeddingProfileV2,
} from '../repositories/paper-implementation-semantic-projection-v2.repository.js';
import type {
  ActiveEmbeddingProfileConfig,
} from './literature-content-processing-settings-service.js';
import {
  PaperImplementationSemanticEmbeddingV2Adapter,
} from './paper-implementation-semantic-embedding-v2-adapter.js';
import {
  PaperImplementationSemanticIndexV2Service,
  type PaperImplementationSemanticDocumentV2Reader,
} from './paper-implementation-semantic-index-v2-service.js';
import {
  PaperImplementationSemanticRetrievalV2Service,
  type PaperImplementationSemanticRankingInputV2Reader,
} from './paper-implementation-semantic-retrieval-v2-service.js';
import { configuredLiteratureEmbeddingProfile } from './literature-llm-config.js';

export type PaperImplementationSemanticV2ServiceReasonCode =
  | 'SEMANTIC_RETRIEVAL_V2_DISABLED'
  | 'SEMANTIC_EMBEDDING_CONFIGURATION_INVALID'
  | 'SEMANTIC_REBUILD_CANCELLED'
  | 'SEMANTIC_REBUILD_TIMEOUT';

export class PaperImplementationSemanticV2ServiceError extends Error {
  constructor(
    public readonly reasonCode: PaperImplementationSemanticV2ServiceReasonCode,
    message: string,
  ) {
    super(message);
    this.name = 'PaperImplementationSemanticV2ServiceError';
  }
}

export interface PaperImplementationSemanticV2ServiceOptions {
  candidateReader: PaperImplementationSemanticDocumentV2Reader
    & PaperImplementationSemanticRankingInputV2Reader;
  embeddingAdapter: PaperImplementationSemanticEmbeddingV2Adapter;
  projectionRepository: PaperImplementationSemanticProjectionV2Repository;
  embeddingProfileResolver: () => Promise<ActiveEmbeddingProfileConfig>;
  enabled: () => boolean;
  semanticTimeoutMs?: number;
  rebuildTimeoutMs?: number;
}

interface InFlightSemanticRebuild {
  implementationProjectId: string;
  controller: AbortController;
  promise: Promise<PaperImplementationSemanticIndexRebuildV2Response>;
  waiterCount: number;
  settled: boolean;
  timeout: ReturnType<typeof setTimeout>;
}

class SemanticRebuildTimeoutReason extends Error {
  constructor() {
    super('Semantic projection rebuild exceeded its application deadline');
    this.name = 'SemanticRebuildTimeoutReason';
  }
}

class SemanticRebuildCancelledReason extends Error {
  constructor() {
    super('Semantic projection rebuild has no active callers');
    this.name = 'SemanticRebuildCancelledReason';
  }
}

const DEFAULT_SEMANTIC_REBUILD_TIMEOUT_MS = 120_000;
const MAX_SEMANTIC_REBUILD_TIMEOUT_MS = 300_000;

export class PaperImplementationSemanticV2Service {
  private readonly inFlightRebuilds = new Map<string, InFlightSemanticRebuild>();
  private readonly rebuildTimeoutMs: number;

  constructor(private readonly options: PaperImplementationSemanticV2ServiceOptions) {
    this.rebuildTimeoutMs = options.rebuildTimeoutMs ?? DEFAULT_SEMANTIC_REBUILD_TIMEOUT_MS;
    if (
      !Number.isSafeInteger(this.rebuildTimeoutMs)
      || this.rebuildTimeoutMs < 1
      || this.rebuildTimeoutMs > MAX_SEMANTIC_REBUILD_TIMEOUT_MS
    ) {
      throw new PaperImplementationSemanticV2ServiceError(
        'SEMANTIC_EMBEDDING_CONFIGURATION_INVALID',
        'Semantic projection rebuild timeout is invalid.',
      );
    }
  }

  async rebuildProjectProjection(
    implementationProjectId: string,
    signal?: AbortSignal,
  ): Promise<PaperImplementationSemanticIndexRebuildV2Response> {
    this.assertEnabled();
    if (signal?.aborted) throw this.cancelledError();
    const inFlight = this.inFlightRebuilds.get(implementationProjectId)
      ?? this.startRebuild(implementationProjectId);
    return this.joinRebuild(inFlight, signal);
  }

  private startRebuild(implementationProjectId: string): InFlightSemanticRebuild {
    const controller = new AbortController();
    let inFlight: InFlightSemanticRebuild;
    const timeout = setTimeout(() => {
      controller.abort(new SemanticRebuildTimeoutReason());
    }, this.rebuildTimeoutMs);
    const promise = this.executeRebuild(implementationProjectId, controller.signal)
      .finally(() => {
        inFlight.settled = true;
        clearTimeout(inFlight.timeout);
        if (this.inFlightRebuilds.get(implementationProjectId) === inFlight) {
          this.inFlightRebuilds.delete(implementationProjectId);
        }
      });
    inFlight = {
      implementationProjectId,
      controller,
      promise,
      waiterCount: 0,
      settled: false,
      timeout,
    };
    this.inFlightRebuilds.set(implementationProjectId, inFlight);
    // A caller may disconnect before provider cancellation settles. Keep the
    // shared operation rejection observed even when no waiter remains.
    void promise.catch(() => {});
    return inFlight;
  }

  private async executeRebuild(
    implementationProjectId: string,
    signal: AbortSignal,
  ): Promise<PaperImplementationSemanticIndexRebuildV2Response> {
    try {
      const embeddingProfile = await this.resolveEmbeddingProfile();
      const result = await new PaperImplementationSemanticIndexV2Service({
        documentReader: this.options.candidateReader,
        embeddingPort: this.options.embeddingAdapter,
        repository: this.options.projectionRepository,
        embeddingProfile,
      }).rebuildProjectProjection(implementationProjectId, { signal });
      return {
        schema_version: PAPER_IMPLEMENTATION_SEMANTIC_DOCUMENT_SCHEMA_VERSION_V2,
        implementation_project_id: implementationProjectId,
        embedding_profile: {
          ...embeddingProfile,
          dimension: PAPER_IMPLEMENTATION_SEMANTIC_VECTOR_DIMENSION_V2,
        },
        ...result,
      };
    } catch (error) {
      if (signal.aborted) {
        if (signal.reason instanceof SemanticRebuildTimeoutReason) {
          throw new PaperImplementationSemanticV2ServiceError(
            'SEMANTIC_REBUILD_TIMEOUT',
            signal.reason.message,
          );
        }
        throw this.cancelledError();
      }
      throw error;
    }
  }

  private async joinRebuild(
    inFlight: InFlightSemanticRebuild,
    signal: AbortSignal | undefined,
  ): Promise<PaperImplementationSemanticIndexRebuildV2Response> {
    inFlight.waiterCount += 1;
    try {
      return await new Promise<PaperImplementationSemanticIndexRebuildV2Response>(
        (resolve, reject) => {
          let completed = false;
          const cleanup = () => {
            signal?.removeEventListener('abort', onCallerAbort);
            inFlight.controller.signal.removeEventListener('abort', onRebuildAbort);
          };
          const succeed = (value: PaperImplementationSemanticIndexRebuildV2Response) => {
            if (completed) return;
            completed = true;
            cleanup();
            resolve(value);
          };
          const fail = (error: unknown) => {
            if (completed) return;
            completed = true;
            cleanup();
            reject(error);
          };
          const onCallerAbort = () => fail(this.cancelledError());
          const onRebuildAbort = () => fail(this.rebuildAbortError(
            inFlight.controller.signal,
          ));
          signal?.addEventListener('abort', onCallerAbort, { once: true });
          inFlight.controller.signal.addEventListener('abort', onRebuildAbort, { once: true });
          if (signal?.aborted) {
            onCallerAbort();
            return;
          }
          if (inFlight.controller.signal.aborted) {
            onRebuildAbort();
            return;
          }
          void inFlight.promise.then(succeed, fail);
        },
      );
    } finally {
      inFlight.waiterCount -= 1;
      if (inFlight.waiterCount === 0 && !inFlight.settled) {
        if (this.inFlightRebuilds.get(inFlight.implementationProjectId) === inFlight) {
          this.inFlightRebuilds.delete(inFlight.implementationProjectId);
        }
        inFlight.controller.abort(new SemanticRebuildCancelledReason());
      }
    }
  }

  private rebuildAbortError(signal: AbortSignal): PaperImplementationSemanticV2ServiceError {
    return signal.reason instanceof SemanticRebuildTimeoutReason
      ? new PaperImplementationSemanticV2ServiceError(
        'SEMANTIC_REBUILD_TIMEOUT',
        signal.reason.message,
      )
      : this.cancelledError();
  }

  private cancelledError(): PaperImplementationSemanticV2ServiceError {
    return new PaperImplementationSemanticV2ServiceError(
      'SEMANTIC_REBUILD_CANCELLED',
      'Semantic projection rebuild was cancelled.',
    );
  }

  async retrieve(
    implementationProjectId: string,
    request: PaperImplementationSemanticRetrievalV2Request,
  ): Promise<PaperImplementationSemanticRetrievalV2Response> {
    this.assertEnabled();
    const embeddingProfile = await this.resolveEmbeddingProfile();
    return new PaperImplementationSemanticRetrievalV2Service({
      rankingInputReader: this.options.candidateReader,
      queryEmbeddingPort: this.options.embeddingAdapter,
      projectionRepository: this.options.projectionRepository,
      embeddingProfile,
      semanticTimeoutMs: this.options.semanticTimeoutMs,
    }).retrieve({
      implementation_project_id: implementationProjectId,
      query: request.query,
      result_limit: request.result_limit,
    });
  }

  private assertEnabled(): void {
    if (!this.options.enabled()) {
      throw new PaperImplementationSemanticV2ServiceError(
        'SEMANTIC_RETRIEVAL_V2_DISABLED',
        'Paper-implementation semantic retrieval v2 is disabled.',
      );
    }
  }

  private async resolveEmbeddingProfile(): Promise<PaperImplementationSemanticEmbeddingProfileV2> {
    const configured = await this.options.embeddingProfileResolver();
    const shippedDefault = configuredLiteratureEmbeddingProfile('default');
    const explicitlySupportsDimension = configured.dimensions
      === PAPER_IMPLEMENTATION_SEMANTIC_VECTOR_DIMENSION_V2;
    const usesKnownNativeDimension = configured.dimensions === null
      && shippedDefault.dimensions === null
      && configured.provider === shippedDefault.provider
      && configured.model === shippedDefault.model;
    if (
      configured.provider !== 'openai'
      || configured.profileId.trim().length === 0
      || configured.model.trim().length === 0
      || (!explicitlySupportsDimension && !usesKnownNativeDimension)
    ) {
      throw new PaperImplementationSemanticV2ServiceError(
        'SEMANTIC_EMBEDDING_CONFIGURATION_INVALID',
        `Active embedding profile must support OpenAI ${PAPER_IMPLEMENTATION_SEMANTIC_VECTOR_DIMENSION_V2}-dimension vectors.`,
      );
    }
    return {
      profile_id: `literature-embedding-${configured.profileId}`,
      provider: configured.provider,
      model: configured.model,
      dimension: PAPER_IMPLEMENTATION_SEMANTIC_VECTOR_DIMENSION_V2,
    };
  }
}
