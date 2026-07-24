import assert from 'node:assert/strict';
import test from 'node:test';

import Fastify from 'fastify';
import type {
  ValidationCycleReadinessEvaluationV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-evidence-v2-contracts';

import {
  PaperImplementationAgentActionsV2Controller,
} from '../controllers/paper-implementation-agent-actions-v2-controller.js';
import {
  InMemoryPaperImplementationExperimentLineageV2Repository,
} from '../repositories/in-memory-paper-implementation-experiment-lineage-v2-repository.js';
import {
  PaperImplementationAgentActionsV2Service,
} from '../services/paper-implementation-agent-actions-v2-service.js';
import {
  PaperImplementationCycleReadinessV2ServiceError,
} from '../services/paper-implementation-cycle-readiness-v2-service.js';
import {
  PaperImplementationExperimentLineageV2Service,
} from '../services/paper-implementation-experiment-lineage-v2-service.js';
import {
  registerPaperImplementationAgentActionsV2Routes,
} from './paper-implementation-agent-actions-v2-routes.js';

const PROJECT_ID = 'project-route-actions';
const CYCLE_ID = 'cycle-route-actions';
const HASH = `sha256:${'b'.repeat(64)}`;

function readinessFixture(): ValidationCycleReadinessEvaluationV2 {
  return {
    schema_version: 'v1',
    validation_cycle_id: CYCLE_ID,
    status: 'ready_no_evidence',
    ordered_blockers: [],
    watermark: {
      schema_version: 'v1',
      validation_cycle_id: CYCLE_ID,
      expected_cycle_version: 2,
      ordered_branches: [{
        ordinal: 1,
        branch_id: 'branch-route-actions',
        branch_key: 'main',
        current_admitted_revision_id: 'revision-route-actions',
        current_admitted_revision_hash: HASH,
        branch_revision_sequence: 1,
        effective_head_run_id: 'run-route-actions',
        effective_head_run_manifest_hash: HASH,
        head_blocker: null,
        ordered_cells: [{
          ordinal: 1,
          run_cell_id: 'run-cell-route-actions',
          cell_key: 'cell-route-actions',
          ordered_attempts: [],
          complete_result_ref: null,
          eligibility_code: 'SCIENTIFIC_EXECUTION_NOT_STARTED',
        }],
        eligible_run_evidence_unit_refs: [],
      }],
      active_real_attempt_count: 0,
      closure_input_hash: HASH,
    },
    eligible_run_evidence_unit_count: 0,
  };
}

test('agent action routes return 200 for closure preparation and available actions', async () => {
  const app = await createRouteHarness();
  const preparation = await app.inject({
    method: 'GET',
    url: `/paper-implementation/validation-cycles/${CYCLE_ID}/closure/v2/preparation`,
  });
  const actions = await app.inject({
    method: 'GET',
    url: `/paper-implementation/projects/${PROJECT_ID}/validation-cycles/${CYCLE_ID}/available-actions`,
  });

  assert.equal(preparation.statusCode, 200, preparation.body);
  assert.equal(
    preparation.json().prepared_request.body.expected_cycle_version,
    2,
  );
  assert.equal(actions.statusCode, 200, actions.body);
  assert.deepEqual(actions.json().actions.map(
    (action: { action_kind: string }) => action.action_kind,
  ), [
    'admit_work_order_revision',
    'start_workflow_simulation',
    'start_real_provider_execution',
    'close_validation_cycle',
  ]);
  await app.close();
});

test('agent action routes return opaque 404 responses for missing cycle and project scope', async () => {
  const app = await createRouteHarness();
  const preparation = await app.inject({
    method: 'GET',
    url: '/paper-implementation/validation-cycles/cycle-missing/closure/v2/preparation',
  });
  const actions = await app.inject({
    method: 'GET',
    url: `/paper-implementation/projects/project-other/validation-cycles/${CYCLE_ID}/available-actions`,
  });

  assert.equal(preparation.statusCode, 404, preparation.body);
  assert.equal(preparation.json().error.code, 'NOT_FOUND');
  assert.equal(actions.statusCode, 404, actions.body);
  assert.equal(actions.json().error.code, 'NOT_FOUND');
  assert.equal(actions.json().error.details.reason_code, 'VALIDATION_CYCLE_NOT_FOUND');
  await app.close();
});

test('agent action routes reject schema-invalid path ids with 400', async () => {
  const app = await createRouteHarness();
  const preparation = await app.inject({
    method: 'GET',
    url: '/paper-implementation/validation-cycles/%20/closure/v2/preparation',
  });
  const actions = await app.inject({
    method: 'GET',
    url: `/paper-implementation/projects/%20/validation-cycles/${CYCLE_ID}/available-actions`,
  });

  assert.equal(preparation.statusCode, 400, preparation.body);
  assert.equal(preparation.json().error.code, 'INVALID_PAYLOAD');
  assert.equal(actions.statusCode, 400, actions.body);
  assert.equal(actions.json().error.code, 'INVALID_PAYLOAD');
  await app.close();
});

async function createRouteHarness() {
  const lineageRepository = new InMemoryPaperImplementationExperimentLineageV2Repository({
    projects: [PROJECT_ID, 'project-other'],
    cycle_lineages: [{
      implementation_project_id: PROJECT_ID,
      validation_cycle_id: CYCLE_ID,
      lifecycle_status: 'admitted',
      target_ref_type: 'paper_project',
      target_ref_id: 'paper-route-actions',
      target_version_id: null,
      created_at: '2026-07-24T00:00:00.000Z',
      closure: {
        closed: false,
        kind: null,
        disposition: null,
        closed_at: null,
      },
      branches: [{
        branch_id: 'branch-route-actions',
        branch_key: 'main',
        parent_branch_key: null,
        current_admitted_revision_id: 'revision-route-actions',
        current_admitted_revision_hash: HASH,
        current_admitted_revision_sequence: 1,
        head_revision_id: 'revision-route-actions',
        head_revision_sequence: 1,
        head_run_id: 'run-route-actions',
        head_run_manifest_hash: HASH,
        head_run: {
          run_id: 'run-route-actions',
          run_manifest_hash: HASH,
          external_pi_branch_id: 'branch-route-actions',
          external_pi_work_order_revision_id: 'revision-route-actions',
          external_pi_work_order_revision_hash: HASH,
          external_pi_revision_sequence: 1,
          head_acknowledged: true,
          cells: [{
            run_cell_id: 'run-cell-route-actions',
            ordinal: 1,
            cell_key: 'cell-route-actions',
            training_task_spec_id: 'task-route-actions',
            training_task_spec_hash: HASH,
          }],
          attempts: [],
        },
      }],
    }],
  });
  const service = new PaperImplementationAgentActionsV2Service({
    lineage: new PaperImplementationExperimentLineageV2Service({
      repository: lineageRepository,
    }),
    readiness: {
      async evaluate(validationCycleId) {
        if (validationCycleId !== CYCLE_ID) {
          throw new PaperImplementationCycleReadinessV2ServiceError(
            'VALIDATION_CYCLE_NOT_FOUND',
            `ValidationCycle does not exist: ${validationCycleId}`,
          );
        }
        return readinessFixture();
      },
    },
  });
  const app = Fastify({ logger: false });
  await registerPaperImplementationAgentActionsV2Routes(
    app,
    new PaperImplementationAgentActionsV2Controller(service),
  );
  await app.ready();
  return app;
}
