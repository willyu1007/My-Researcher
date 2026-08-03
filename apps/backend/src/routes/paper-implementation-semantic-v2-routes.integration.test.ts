import assert from 'node:assert/strict';
import test from 'node:test';

import Fastify from 'fastify';
import {
  PAPER_IMPLEMENTATION_SEMANTIC_VECTOR_DIMENSION_V2,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-semantic-retrieval-v2-contracts';

import { buildApp } from '../app.js';
import {
  PaperImplementationSemanticV2Controller,
  type PaperImplementationSemanticV2UseCase,
} from '../controllers/paper-implementation-semantic-v2-controller.js';
import {
  InMemoryPaperImplementationExperimentLineageV2Repository,
} from '../repositories/in-memory-paper-implementation-experiment-lineage-v2-repository.js';
import {
  InMemoryPaperImplementationSemanticProjectionV2Repository,
} from '../repositories/in-memory-paper-implementation-semantic-projection-v2-repository.js';
import { registerPaperImplementationSemanticV2Routes } from './paper-implementation-semantic-v2-routes.js';
import { PaperImplementationExperimentLineageV2ServiceError } from '../services/paper-implementation-experiment-lineage-v2-service.js';
import { PaperImplementationSemanticIndexV2ServiceError } from '../services/paper-implementation-semantic-index-v2-service.js';
import { PaperImplementationSemanticV2ServiceError } from '../services/paper-implementation-semantic-v2-service.js';

function useCase(): PaperImplementationSemanticV2UseCase {
  return {
    rebuildProjectProjection: async (implementationProjectId) => ({
      schema_version: 'v1',
      implementation_project_id: implementationProjectId,
      embedding_profile: {
        profile_id: 'literature-embedding-default',
        provider: 'openai',
        model: 'text-embedding-3-large',
        dimension: 3072,
      },
      changed_count: 1,
      unchanged_count: 0,
      deleted_count: 0,
      total_count: 1,
    }),
    retrieve: async (implementationProjectId, request) => ({
      schema_version: 'v1',
      implementation_project_id: implementationProjectId,
      query: request.query.trim(),
      retrieval_mode: 'structured_fallback',
      fallback_reason: 'NO_CURRENT_SEMANTIC_HITS',
      semantic_hits_considered: 0,
      stale_hits_dropped: 0,
      results: [],
    }),
  };
}

async function createApp(service: PaperImplementationSemanticV2UseCase = useCase()) {
  const app = Fastify({ ajv: { customOptions: { removeAdditional: false } } });
  await registerPaperImplementationSemanticV2Routes(
    app,
    new PaperImplementationSemanticV2Controller(service),
  );
  await app.ready();
  return app;
}

test('semantic v2 routes expose explicit project-scoped rebuild and retrieval contracts', async () => {
  const app = await createApp();
  try {
    const rebuild = await app.inject({
      method: 'POST',
      url: '/paper-implementation/projects/project-1/semantic-index/v2/rebuild',
    });
    assert.equal(rebuild.statusCode, 200);
    assert.equal(rebuild.json().implementation_project_id, 'project-1');
    assert.equal(rebuild.json().embedding_profile.profile_id, 'literature-embedding-default');

    const retrieval = await app.inject({
      method: 'POST',
      url: '/paper-implementation/projects/project-1/semantic-retrieval/v2',
      payload: { query: ' compare branches ', result_limit: 5 },
    });
    assert.equal(retrieval.statusCode, 200);
    assert.equal(retrieval.json().query, 'compare branches');
    assert.equal(retrieval.json().retrieval_mode, 'structured_fallback');
  } finally {
    await app.close();
  }
});

test('semantic v2 routes reject caller-authored embeddings and rebuild controls', async () => {
  const app = await createApp();
  try {
    const rebuild = await app.inject({
      method: 'POST',
      url: '/paper-implementation/projects/project-1/semantic-index/v2/rebuild',
      payload: { model: 'caller-model' },
    });
    assert.equal(rebuild.statusCode, 400);
    assert.equal(rebuild.json().error.code, 'INVALID_PAYLOAD');

    const nullRebuild = await app.inject({
      method: 'POST',
      url: '/paper-implementation/projects/project-1/semantic-index/v2/rebuild',
      headers: { 'content-type': 'application/json' },
      payload: 'null',
    });
    assert.equal(nullRebuild.statusCode, 400);
    assert.equal(nullRebuild.json().error.code, 'INVALID_PAYLOAD');

    const retrieval = await app.inject({
      method: 'POST',
      url: '/paper-implementation/projects/project-1/semantic-retrieval/v2',
      payload: { query: 'query', embedding: [0.1, 0.2] },
    });
    assert.equal(retrieval.statusCode, 400);
    assert.equal(retrieval.json().error.code, 'INVALID_PAYLOAD');
  } finally {
    await app.close();
  }
});

test('semantic v2 controller returns stable disabled-capability reason', async () => {
  const app = await createApp({
    ...useCase(),
    rebuildProjectProjection: async () => {
      throw new PaperImplementationSemanticV2ServiceError(
        'SEMANTIC_RETRIEVAL_V2_DISABLED',
        'disabled',
      );
    },
  });
  try {
    const response = await app.inject({
      method: 'POST',
      url: '/paper-implementation/projects/project-1/semantic-index/v2/rebuild',
      payload: {},
    });
    assert.equal(response.statusCode, 409);
    assert.deepEqual(response.json().error.details, {
      reason_code: 'SEMANTIC_RETRIEVAL_V2_DISABLED',
    });
  } finally {
    await app.close();
  }
});

test('semantic v2 controller maps structured project resolution failures to not found', async () => {
  const app = await createApp({
    ...useCase(),
    retrieve: async () => {
      throw new PaperImplementationExperimentLineageV2ServiceError(
        'IMPLEMENTATION_PROJECT_NOT_FOUND',
        'missing project',
      );
    },
  });
  try {
    const response = await app.inject({
      method: 'POST',
      url: '/paper-implementation/projects/missing/semantic-retrieval/v2',
      payload: { query: 'query' },
    });
    assert.equal(response.statusCode, 404);
    assert.deepEqual(response.json().error.details, {
      reason_code: 'IMPLEMENTATION_PROJECT_NOT_FOUND',
    });
  } finally {
    await app.close();
  }
});

test('semantic v2 controller exposes rebuild timeout and source drift reasons', async (context) => {
  const cases = [{
    name: 'timeout',
    expectedStatus: 504,
    expectedReason: 'SEMANTIC_REBUILD_TIMEOUT',
    error: new PaperImplementationSemanticV2ServiceError(
      'SEMANTIC_REBUILD_TIMEOUT',
      'deadline exceeded',
    ),
  }, {
    name: 'source drift',
    expectedStatus: 409,
    expectedReason: 'SEMANTIC_SOURCE_DRIFT',
    error: new PaperImplementationSemanticIndexV2ServiceError(
      'SEMANTIC_SOURCE_DRIFT',
      'source changed',
    ),
  }] as const;

  for (const entry of cases) {
    await context.test(entry.name, async () => {
      const app = await createApp({
        ...useCase(),
        rebuildProjectProjection: async () => { throw entry.error; },
      });
      try {
        const response = await app.inject({
          method: 'POST',
          url: '/paper-implementation/projects/project-1/semantic-index/v2/rebuild',
        });
        assert.equal(response.statusCode, entry.expectedStatus);
        assert.equal(response.json().error.details.reason_code, entry.expectedReason);
      } finally {
        await app.close();
      }
    });
  }
});

test('buildApp enabled composition rebuilds and retrieves a non-empty project end to end', async () => {
  const projectId = 'project-enabled';
  const cycleId = 'cycle-enabled';
  const openClosure = {
    closed: false,
    kind: null,
    disposition: null,
    closed_at: null,
  } as const;
  const lineageRepository = new InMemoryPaperImplementationExperimentLineageV2Repository({
    projects: [projectId],
    project_cycles: [{
      implementation_project_id: projectId,
      cycles: [{
        validation_cycle_id: cycleId,
        lifecycle_status: 'admitted',
        target_ref_type: 'paper_project',
        target_ref_id: 'paper-enabled',
        target_version_id: 'version-1',
        created_at: '2026-08-03T00:00:00.000Z',
        closure: openClosure,
        branch_count: 0,
        admitted_branch_count: 0,
        total_run_count: 0,
        active_real_attempt_count: 0,
      }],
    }],
    cycle_lineages: [{
      implementation_project_id: projectId,
      validation_cycle_id: cycleId,
      lifecycle_status: 'admitted',
      target_ref_type: 'paper_project',
      target_ref_id: 'paper-enabled',
      target_version_id: 'version-1',
      created_at: '2026-08-03T00:00:00.000Z',
      closure: openClosure,
      branches: [],
    }],
  });
  const projectionRepository = new InMemoryPaperImplementationSemanticProjectionV2Repository({
    projects: [projectId],
  });
  const providerOperations: string[] = [];
  const app = buildApp({
    backgroundWorkEnabled: false,
    paperImplementationExperimentV2AdmissionEnabled: () => false,
    paperImplementationExperimentV2ExplorationAttachmentEnabled: () => false,
    paperImplementationExperimentV2CutoverCommitted: () => true,
    paperImplementationValidationCycleClosureV2Enabled: () => false,
    paperImplementationSemanticRetrievalV2Enabled: () => true,
    experimentFoundationV2WorkflowSimulationEnabled: () => false,
    experimentFoundationV2RealProviderIntakeEnabled: () => false,
    experimentFoundationV2RealProviderControlDrainEnabled: () => false,
    experimentFoundationV2ScientificValidationEnabled: () => false,
    experimentFoundationV2PromotionEnabled: () => false,
    experimentFoundationV2ExplorationSpecEnabled: () => false,
    paperImplementationExperimentLineageV2Repository: lineageRepository,
    paperImplementationSemanticProjectionV2Repository: projectionRepository,
    paperImplementationSemanticEmbeddingGateway: {
      createEmbeddings: async (request) => {
        providerOperations.push(request.executionContext.operation);
        assert.equal(request.model.providerId, 'openai');
        assert.equal(request.model.modelId, 'text-embedding-3-large');
        assert.equal(request.dimensions, PAPER_IMPLEMENTATION_SEMANTIC_VECTOR_DIMENSION_V2);
        const inputCount = Array.isArray(request.input) ? request.input.length : 1;
        const vector = Array<number>(PAPER_IMPLEMENTATION_SEMANTIC_VECTOR_DIMENSION_V2).fill(0);
        vector[0] = 1;
        return {
          vectors: Array.from({ length: inputCount }, () => [...vector]),
          raw: {},
          telemetry: {} as never,
        };
      },
    },
  });

  try {
    const rebuild = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${projectId}/semantic-index/v2/rebuild`,
    });
    assert.equal(rebuild.statusCode, 200, rebuild.body);
    assert.deepEqual(rebuild.json(), {
      schema_version: 'v1',
      implementation_project_id: projectId,
      embedding_profile: {
        profile_id: 'literature-embedding-default',
        provider: 'openai',
        model: 'text-embedding-3-large',
        dimension: PAPER_IMPLEMENTATION_SEMANTIC_VECTOR_DIMENSION_V2,
      },
      changed_count: 1,
      unchanged_count: 0,
      deleted_count: 0,
      total_count: 1,
    });

    const retrieval = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${projectId}/semantic-retrieval/v2`,
      payload: { query: 'current validation cycle', result_limit: 5 },
    });
    assert.equal(retrieval.statusCode, 200, retrieval.body);
    const body = retrieval.json();
    assert.equal(body.retrieval_mode, 'semantic');
    assert.equal(body.results.length, 1);
    assert.equal(body.results[0].document.source.source_id, cycleId);
    assert.deepEqual(providerOperations, [
      'rebuild_project_projection',
      'embed_query',
    ]);
    assert.equal((await projectionRepository.listProjectProjection(projectId)).length, 1);
  } finally {
    await app.close();
  }
});
