import assert from 'node:assert/strict';
import test from 'node:test';

import Fastify from 'fastify';

import {
  paperImplementationSemanticIndexRebuildV2ResponseSchema,
  paperImplementationSemanticRankingInputV2Schema,
  paperImplementationSemanticRetrievalV2RequestSchema,
  paperImplementationSemanticRetrievalV2ResponseSchema,
  paperImplementationSemanticV2ErrorEnvelopeSchema,
} from './paper-implementation-semantic-retrieval-v2-contracts.js';

type JsonSchema = Readonly<Record<string, unknown>>;

const hash = (character: string) => `sha256:${character.repeat(64)}`;

async function validates(schema: JsonSchema, payload: unknown): Promise<boolean> {
  const app = Fastify({ ajv: { customOptions: { removeAdditional: false } } });
  app.post('/validate', { schema: { body: schema } }, async () => ({ ok: true }));
  await app.ready();
  const response = await app.inject({
    method: 'POST',
    url: '/validate',
    payload: payload as object,
  });
  await app.close();
  return response.statusCode === 200;
}

const openClosure = {
  closed: false,
  kind: null,
  disposition: null,
  closed_at: null,
} as const;

const cycleSummary = {
  validation_cycle_id: 'cycle-1',
  status: 'admitted',
  target_ref: {
    type: 'paper_project',
    id: 'paper-1',
    version: 'v2',
  },
  created_at: '2026-08-03T01:00:00.000Z',
  closure: openClosure,
  branch_count: 1,
  admitted_branch_count: 1,
  total_run_count: 1,
  active_real_attempt_count: 0,
};

const validationCycleDocument = {
  schema_version: 'v1',
  document_id: 'pi_semantic_document_cycle',
  implementation_project_id: 'project-1',
  source: {
    source_type: 'validation_cycle',
    source_id: 'cycle-1',
    source_version: `content:${hash('a')}`,
    source_hash: hash('a'),
  },
  semantic_text: '{"source_type":"validation_cycle"}',
  document_hash: hash('b'),
  content: {
    source_type: 'validation_cycle',
    validation_cycle: cycleSummary,
  },
};

const effectiveBranchHeadDocument = {
  schema_version: 'v1',
  document_id: 'pi_semantic_document_branch',
  implementation_project_id: 'project-1',
  source: {
    source_type: 'effective_branch_head',
    source_id: 'branch-1',
    source_version: 'revision:2:revision-2:run:run-2',
    source_hash: hash('c'),
  },
  semantic_text: '{"source_type":"effective_branch_head"}',
  document_hash: hash('d'),
  content: {
    source_type: 'effective_branch_head',
    validation_cycle: {
      validation_cycle_id: cycleSummary.validation_cycle_id,
      status: cycleSummary.status,
      target_ref: cycleSummary.target_ref,
      created_at: cycleSummary.created_at,
      closure: cycleSummary.closure,
    },
    branch: {
      branch_id: 'branch-1',
      branch_key: 'main',
      parent_branch_key: null,
      current_admitted_revision: {
        work_order_revision_id: 'revision-2',
        work_order_revision_hash: hash('e'),
        revision_sequence: 2,
      },
      effective_head_run: {
        run_id: 'run-2',
        run_manifest_hash: hash('f'),
        ordered_cells: [{
          ordinal: 1,
          cell_key: 'cell-1',
          training_task_spec_id: 'task-1',
          training_task_spec_hash: hash('0'),
        }],
        ordered_attempts: [],
        collection_summaries: [],
      },
    },
  },
};

test('semantic ranking input accepts only closed deterministic source document kinds', async () => {
  const input = {
    schema_version: 'v1',
    implementation_project_id: 'project-1',
    query: 'compare effective branches',
    candidates: [validationCycleDocument, effectiveBranchHeadDocument],
  };
  assert.equal(await validates(paperImplementationSemanticRankingInputV2Schema, input), true);
  assert.equal(await validates(paperImplementationSemanticRankingInputV2Schema, {
    ...input,
    candidates: [{
      ...validationCycleDocument,
      caller_embedding: [0.1, 0.2],
    }],
  }), false);
  assert.equal(await validates(paperImplementationSemanticRankingInputV2Schema, {
    ...input,
    candidates: [{
      ...validationCycleDocument,
      source: {
        ...validationCycleDocument.source,
        source_hash: 'caller-hash',
      },
    }],
  }), false);
});

test('semantic document discriminators cannot claim a different content kind', async () => {
  const input = {
    schema_version: 'v1',
    implementation_project_id: 'project-1',
    query: 'cycle',
    candidates: [{
      ...validationCycleDocument,
      content: effectiveBranchHeadDocument.content,
    }],
  };
  assert.equal(await validates(paperImplementationSemanticRankingInputV2Schema, input), false);
  assert.equal(await validates(paperImplementationSemanticRankingInputV2Schema, {
    ...input,
    candidates: [{
      ...validationCycleDocument,
      content: {
        ...validationCycleDocument.content,
        validation_cycle: {
          ...cycleSummary,
          closure: {
            closed: false,
            kind: 'scientific_evidence_assessed',
            disposition: null,
            closed_at: null,
          },
        },
      },
    }],
  }), false);
});

test('semantic retrieval response closes semantic and structured fallback modes', async () => {
  const common = {
    schema_version: 'v1',
    implementation_project_id: 'project-1',
    query: 'compare effective branches',
    semantic_hits_considered: 1,
    stale_hits_dropped: 0,
  };
  const semantic = {
    ...common,
    retrieval_mode: 'semantic',
    fallback_reason: null,
    results: [{
      rank: 1,
      match_mode: 'semantic',
      semantic_score: 0.75,
      document: effectiveBranchHeadDocument,
    }],
  };
  const fallback = {
    ...common,
    retrieval_mode: 'structured_fallback',
    fallback_reason: 'SEMANTIC_ATTEMPT_TIMEOUT',
    results: [validationCycleDocument, effectiveBranchHeadDocument]
      .map((document, index) => ({
        rank: index + 1,
        match_mode: 'structured_fallback',
        semantic_score: null,
        document,
      })),
  };
  assert.equal(await validates(paperImplementationSemanticRetrievalV2ResponseSchema, semantic), true);
  assert.equal(await validates(paperImplementationSemanticRetrievalV2ResponseSchema, fallback), true);
  assert.equal(await validates(paperImplementationSemanticRetrievalV2ResponseSchema, {
    ...semantic,
    fallback_reason: 'SEMANTIC_ATTEMPT_TIMEOUT',
  }), false);
  assert.equal(await validates(paperImplementationSemanticRetrievalV2ResponseSchema, {
    ...fallback,
    results: [{
      ...fallback.results[0],
      match_mode: 'semantic',
      semantic_score: 0.5,
    }],
  }), false);
});

test('semantic HTTP request and rebuild response schemas are closed', async () => {
  assert.equal(await validates(paperImplementationSemanticRetrievalV2RequestSchema, {
    query: 'compare effective branches',
    result_limit: 10,
  }), true);
  assert.equal(await validates(paperImplementationSemanticRetrievalV2RequestSchema, {
    query: 'compare effective branches',
    caller_embedding: [0.1],
  }), false);
  assert.equal(await validates(paperImplementationSemanticIndexRebuildV2ResponseSchema, {
    schema_version: 'v1',
    implementation_project_id: 'project-1',
    embedding_profile: {
      profile_id: 'literature-embedding-default',
      provider: 'openai',
      model: 'text-embedding-3-large',
      dimension: 3072,
    },
    changed_count: 2,
    unchanged_count: 1,
    deleted_count: 0,
    total_count: 3,
  }), true);
  assert.equal(await validates(paperImplementationSemanticIndexRebuildV2ResponseSchema, {
    schema_version: 'v1',
    implementation_project_id: 'project-1',
    embedding_profile: {
      profile_id: 'literature-embedding-economy',
      provider: 'openai',
      model: 'text-embedding-3-small',
      dimension: 1536,
    },
    changed_count: 0,
    unchanged_count: 0,
    deleted_count: 0,
    total_count: 0,
  }), false);
});

test('semantic HTTP errors expose only the closed operational reason vocabulary', async () => {
  const error = {
    error: {
      code: 'VERSION_CONFLICT',
      message: 'structured source changed',
      details: { reason_code: 'SEMANTIC_SOURCE_DRIFT' },
    },
  };
  assert.equal(await validates(paperImplementationSemanticV2ErrorEnvelopeSchema, error), true);
  assert.equal(await validates(paperImplementationSemanticV2ErrorEnvelopeSchema, {
    ...error,
    error: {
      ...error.error,
      details: { reason_code: 'CALLER_DEFINED_REASON' },
    },
  }), false);
  assert.equal(await validates(paperImplementationSemanticV2ErrorEnvelopeSchema, {
    error: {
      code: 'INTERNAL_ERROR',
      message: 'deadline exceeded',
      details: { reason_code: 'SEMANTIC_REBUILD_TIMEOUT' },
    },
  }), true);
});
