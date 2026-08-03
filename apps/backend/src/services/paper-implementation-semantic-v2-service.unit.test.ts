import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  PaperImplementationSemanticDocumentV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-semantic-retrieval-v2-contracts';

import { InMemoryPaperImplementationSemanticProjectionV2Repository } from '../repositories/in-memory-paper-implementation-semantic-projection-v2-repository.js';
import type {
  PaperImplementationSemanticProjectionV2Repository,
} from '../repositories/paper-implementation-semantic-projection-v2.repository.js';
import { PaperImplementationSemanticEmbeddingV2Adapter } from './paper-implementation-semantic-embedding-v2-adapter.js';
import {
  PaperImplementationSemanticV2Service,
  PaperImplementationSemanticV2ServiceError,
} from './paper-implementation-semantic-v2-service.js';

function createService(input: {
  enabled: boolean;
  profile?: {
    profileId: 'default' | 'economy';
    provider: 'openai' | 'dashscope';
    model: string;
    dimensions: number | null;
  };
  counters: { candidateReads: number; providerCalls: number };
}) {
  return new PaperImplementationSemanticV2Service({
    enabled: () => input.enabled,
    embeddingProfileResolver: async () => input.profile ?? ({
      profileId: 'default',
      provider: 'openai',
      model: 'text-embedding-3-large',
      dimensions: null,
    }),
    candidateReader: {
      listAuthorizedDocuments: async () => {
        input.counters.candidateReads += 1;
        return [];
      },
      prepareAuthorizedRankingInput: async (implementationProjectId, query) => {
        input.counters.candidateReads += 1;
        return {
          schema_version: 'v1',
          implementation_project_id: implementationProjectId,
          query: query.trim(),
          candidates: [],
        };
      },
    },
    embeddingAdapter: new PaperImplementationSemanticEmbeddingV2Adapter({
      gateway: {
        createEmbeddings: async () => {
          input.counters.providerCalls += 1;
          throw new Error('provider should not run');
        },
      },
    }),
    projectionRepository: new InMemoryPaperImplementationSemanticProjectionV2Repository({
      projects: ['project-1'],
    }),
  });
}

const TEST_DOCUMENT: PaperImplementationSemanticDocumentV2 = {
  schema_version: 'v1',
  document_id: 'document-1',
  implementation_project_id: 'project-1',
  source: {
    source_type: 'validation_cycle',
    source_id: 'cycle-1',
    source_version: 'content:source-1',
    source_hash: `sha256:${'1'.repeat(64)}`,
  },
  semantic_text: 'semantic input',
  document_hash: `sha256:${'2'.repeat(64)}`,
  content: {
    source_type: 'validation_cycle',
    validation_cycle: {
      validation_cycle_id: 'cycle-1',
      status: 'admitted',
      target_ref: { type: 'paper_project', id: 'paper-1', version: null },
      created_at: '2026-08-03T00:00:00.000Z',
      closure: { closed: false, kind: null, disposition: null, closed_at: null },
      branch_count: 0,
      admitted_branch_count: 0,
      total_run_count: 0,
      active_real_attempt_count: 0,
    },
  },
};

function controlledService(input: {
  createEmbeddings: ConstructorParameters<typeof PaperImplementationSemanticEmbeddingV2Adapter>[0]['gateway']['createEmbeddings'];
  rebuildTimeoutMs?: number;
  counters: { candidateReads: number; replacements: number };
}): PaperImplementationSemanticV2Service {
  const projectionRepository: PaperImplementationSemanticProjectionV2Repository = {
    listProjectProjection: async () => [],
    replaceProjectProjection: async (request) => {
      input.counters.replacements += 1;
      return {
        changed_count: request.documents.length,
        unchanged_count: 0,
        deleted_count: 0,
        total_count: request.documents.length,
      };
    },
    searchProjectProjection: async () => ({ coverage: [], hits: [] }),
  };
  return new PaperImplementationSemanticV2Service({
    enabled: () => true,
    rebuildTimeoutMs: input.rebuildTimeoutMs,
    embeddingProfileResolver: async () => ({
      profileId: 'default',
      provider: 'openai',
      model: 'text-embedding-3-large',
      dimensions: null,
    }),
    candidateReader: {
      listAuthorizedDocuments: async () => {
        input.counters.candidateReads += 1;
        return [structuredClone(TEST_DOCUMENT)];
      },
      prepareAuthorizedRankingInput: async (implementationProjectId, query) => ({
        schema_version: 'v1',
        implementation_project_id: implementationProjectId,
        query,
        candidates: [],
      }),
    },
    embeddingAdapter: new PaperImplementationSemanticEmbeddingV2Adapter({
      gateway: { createEmbeddings: input.createEmbeddings },
    }),
    projectionRepository,
  });
}

test('disabled semantic capability fails before structured or provider work', async () => {
  const counters = { candidateReads: 0, providerCalls: 0 };
  const service = createService({ enabled: false, counters });
  await assert.rejects(
    service.rebuildProjectProjection('project-1'),
    (error: unknown) => error instanceof PaperImplementationSemanticV2ServiceError
      && error.reasonCode === 'SEMANTIC_RETRIEVAL_V2_DISABLED',
  );
  await assert.rejects(
    service.retrieve('project-1', { query: 'query' }),
    (error: unknown) => error instanceof PaperImplementationSemanticV2ServiceError
      && error.reasonCode === 'SEMANTIC_RETRIEVAL_V2_DISABLED',
  );
  assert.deepEqual(counters, { candidateReads: 0, providerCalls: 0 });
});

test('incompatible active embedding profile fails before project reads or writes', async () => {
  const counters = { candidateReads: 0, providerCalls: 0 };
  const service = createService({
    enabled: true,
    counters,
    profile: {
      profileId: 'economy',
      provider: 'openai',
      model: 'text-embedding-3-small',
      dimensions: null,
    },
  });
  await assert.rejects(
    service.rebuildProjectProjection('project-1'),
    (error: unknown) => error instanceof PaperImplementationSemanticV2ServiceError
      && error.reasonCode === 'SEMANTIC_EMBEDDING_CONFIGURATION_INVALID',
  );
  assert.deepEqual(counters, { candidateReads: 0, providerCalls: 0 });
});

test('compatible active embedding profile can rebuild an empty authorized projection', async () => {
  const counters = { candidateReads: 0, providerCalls: 0 };
  const service = createService({ enabled: true, counters });
  const result = await service.rebuildProjectProjection('project-1');
  assert.deepEqual(result, {
    schema_version: 'v1',
    implementation_project_id: 'project-1',
    embedding_profile: {
      profile_id: 'literature-embedding-default',
      provider: 'openai',
      model: 'text-embedding-3-large',
      dimension: 3072,
    },
    changed_count: 0,
    unchanged_count: 0,
    deleted_count: 0,
    total_count: 0,
  });
  assert.deepEqual(counters, { candidateReads: 3, providerCalls: 0 });
});

test('concurrent rebuild callers share one same-project operation', async () => {
  const counters = { candidateReads: 0, replacements: 0 };
  let providerCalls = 0;
  let releaseProvider: (() => void) | undefined;
  const providerGate = new Promise<void>((resolve) => { releaseProvider = resolve; });
  const service = controlledService({
    counters,
    createEmbeddings: async () => {
      providerCalls += 1;
      await providerGate;
      const vector = Array<number>(3072).fill(0);
      vector[0] = 1;
      return { vectors: [vector], raw: {}, telemetry: {} as never };
    },
  });

  const first = service.rebuildProjectProjection('project-1');
  const second = service.rebuildProjectProjection('project-1');
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(providerCalls, 1);
  releaseProvider?.();

  const [firstResult, secondResult] = await Promise.all([first, second]);
  assert.deepEqual(secondResult, firstResult);
  assert.deepEqual(counters, { candidateReads: 3, replacements: 1 });
  assert.equal(providerCalls, 1);
});

test('last caller cancellation aborts provider work and prevents replacement', async () => {
  const counters = { candidateReads: 0, replacements: 0 };
  const caller = new AbortController();
  let providerStarted: (() => void) | undefined;
  const started = new Promise<void>((resolve) => { providerStarted = resolve; });
  const service = controlledService({
    counters,
    createEmbeddings: async (request) => {
      providerStarted?.();
      return new Promise((_, reject) => {
        const rejectWithAbort = () => reject(request.signal?.reason ?? new Error('aborted'));
        request.signal?.addEventListener('abort', rejectWithAbort, { once: true });
        if (request.signal?.aborted) rejectWithAbort();
      });
    },
  });

  const rebuild = service.rebuildProjectProjection('project-1', caller.signal);
  await started;
  caller.abort();
  await assert.rejects(
    rebuild,
    (error: unknown) => error instanceof PaperImplementationSemanticV2ServiceError
      && error.reasonCode === 'SEMANTIC_REBUILD_CANCELLED',
  );
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(counters.replacements, 0);
});

test('one cancelled waiter does not abort a rebuild still awaited by another caller', async () => {
  const counters = { candidateReads: 0, replacements: 0 };
  const firstCaller = new AbortController();
  let providerSignal: AbortSignal | undefined;
  let releaseProvider: (() => void) | undefined;
  const providerGate = new Promise<void>((resolve) => { releaseProvider = resolve; });
  let providerStarted: (() => void) | undefined;
  const started = new Promise<void>((resolve) => { providerStarted = resolve; });
  const service = controlledService({
    counters,
    createEmbeddings: async (request) => {
      providerSignal = request.signal;
      providerStarted?.();
      await providerGate;
      const vector = Array<number>(3072).fill(0);
      vector[0] = 1;
      return { vectors: [vector], raw: {}, telemetry: {} as never };
    },
  });

  const cancelled = service.rebuildProjectProjection('project-1', firstCaller.signal);
  const remaining = service.rebuildProjectProjection('project-1');
  await started;
  firstCaller.abort();
  await assert.rejects(
    cancelled,
    (error: unknown) => error instanceof PaperImplementationSemanticV2ServiceError
      && error.reasonCode === 'SEMANTIC_REBUILD_CANCELLED',
  );
  assert.equal(providerSignal?.aborted, false);
  releaseProvider?.();
  assert.equal((await remaining).total_count, 1);
  assert.equal(counters.replacements, 1);
});

test('rebuild deadline aborts provider work with an explicit timeout reason', async () => {
  const counters = { candidateReads: 0, replacements: 0 };
  const service = controlledService({
    counters,
    rebuildTimeoutMs: 5,
    // Prove the application deadline itself is bounded even if an injected
    // dependency fails to cooperate with AbortSignal.
    createEmbeddings: async () => new Promise(() => {}),
  });

  await assert.rejects(
    service.rebuildProjectProjection('project-1'),
    (error: unknown) => error instanceof PaperImplementationSemanticV2ServiceError
      && error.reasonCode === 'SEMANTIC_REBUILD_TIMEOUT',
  );
  assert.equal(counters.replacements, 0);
});
