import assert from 'node:assert/strict';
import test from 'node:test';

import { PAPER_IMPLEMENTATION_SEMANTIC_VECTOR_DIMENSION_V2 } from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-semantic-retrieval-v2-contracts';

import { PaperImplementationSemanticEmbeddingV2Adapter } from './paper-implementation-semantic-embedding-v2-adapter.js';

const PROFILE = {
  profile_id: 'literature-embedding-default',
  provider: 'openai',
  model: 'text-embedding-3-large',
  dimension: PAPER_IMPLEMENTATION_SEMANTIC_VECTOR_DIMENSION_V2,
};

test('semantic embedding adapter reuses the gateway profile and preserves document identity order', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const adapter = new PaperImplementationSemanticEmbeddingV2Adapter({
    gateway: {
      createEmbeddings: async (request) => {
        calls.push(request as unknown as Record<string, unknown>);
        const inputs = Array.isArray(request.input) ? request.input : [request.input];
        return {
          vectors: inputs.map((_, index) => [index + 1]),
          raw: {},
          telemetry: {
            provider_id: 'openai',
            model_id: request.model.modelId,
            profile_id: request.model.profileId ?? null,
            prompt_template_id: null,
            prompt_template_version: null,
            elapsed_ms: 1,
            request_count: 1,
            retry_count: 0,
            timeout_count: 0,
            rate_limit_count: 0,
            input_tokens: null,
            output_tokens: null,
            embedding_input_tokens: null,
            total_tokens: null,
            cost_usd: null,
            provider_side_cache_hit: null,
            provider_side_cache_read_tokens: null,
            provider_side_cache_write_tokens: null,
          },
        };
      },
    },
  });

  const results = await adapter.embedDocuments({
    profile: PROFILE,
    documents: [
      { document_id: 'doc-b', document_hash: 'hash-b', semantic_text: 'beta' },
      { document_id: 'doc-a', document_hash: 'hash-a', semantic_text: 'alpha' },
    ],
  });

  assert.deepEqual(results, [
    { document_id: 'doc-b', vector: [1] },
    { document_id: 'doc-a', vector: [2] },
  ]);
  assert.equal(calls.length, 1);
  const first = calls[0] as {
    model: { profileId: string; modelId: string };
    dimensions: number;
  };
  assert.equal(first.model.profileId, PROFILE.profile_id);
  assert.equal(first.model.modelId, PROFILE.model);
  assert.equal(first.dimensions, PAPER_IMPLEMENTATION_SEMANTIC_VECTOR_DIMENSION_V2);
});

test('semantic query embedding forwards cancellation and disables provider retries', async () => {
  const controller = new AbortController();
  let receivedSignal: AbortSignal | undefined;
  let maxRetries: number | undefined;
  const adapter = new PaperImplementationSemanticEmbeddingV2Adapter({
    gateway: {
      createEmbeddings: async (request) => {
        receivedSignal = request.signal;
        maxRetries = request.policy?.maxRetries;
        return {
          vectors: [[1]],
          raw: {},
          telemetry: {} as never,
        };
      },
    },
  });
  await adapter.embedQuery({ profile: PROFILE, query: 'query', signal: controller.signal });
  assert.equal(receivedSignal, controller.signal);
  assert.equal(maxRetries, 0);
});

test('semantic document embedding forwards cancellation to the shared gateway', async () => {
  const controller = new AbortController();
  let receivedSignal: AbortSignal | undefined;
  const adapter = new PaperImplementationSemanticEmbeddingV2Adapter({
    gateway: {
      createEmbeddings: async (request) => {
        receivedSignal = request.signal;
        return { vectors: [[1]], raw: {}, telemetry: {} as never };
      },
    },
  });
  await adapter.embedDocuments({
    profile: PROFILE,
    documents: [{ document_id: 'doc-1', document_hash: 'hash-1', semantic_text: 'text' }],
    signal: controller.signal,
  });
  assert.equal(receivedSignal, controller.signal);
});
