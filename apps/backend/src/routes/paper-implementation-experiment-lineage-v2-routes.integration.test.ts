import assert from 'node:assert/strict';
import test from 'node:test';

import Fastify from 'fastify';

import {
  PaperImplementationExperimentLineageV2Controller,
} from '../controllers/paper-implementation-experiment-lineage-v2-controller.js';
import {
  InMemoryPaperImplementationExperimentLineageV2Repository,
} from '../repositories/in-memory-paper-implementation-experiment-lineage-v2-repository.js';
import {
  PaperImplementationExperimentLineageV2Service,
} from '../services/paper-implementation-experiment-lineage-v2-service.js';
import {
  registerPaperImplementationExperimentLineageV2Routes,
} from './paper-implementation-experiment-lineage-v2-routes.js';

const PROJECT_ID = 'project-route';
const CYCLE_ID = 'cycle-route';
const BRANCH_ID = 'branch-route';
const hash = (character: string) => `sha256:${character.repeat(64)}`;
const OPEN_CLOSURE = {
  closed: false,
  kind: null,
  disposition: null,
  closed_at: null,
} as const;

test('experiment lineage routes return 200 for all three project-scoped reads', async () => {
  const app = await createRouteHarness();
  const cycles = await app.inject({
    method: 'GET',
    url: `/paper-implementation/projects/${PROJECT_ID}/experiment-lineage/validation-cycles`,
  });
  const cycle = await app.inject({
    method: 'GET',
    url: `/paper-implementation/projects/${PROJECT_ID}/validation-cycles/${CYCLE_ID}/experiment-lineage`,
  });
  const history = await app.inject({
    method: 'GET',
    url: `/paper-implementation/projects/${PROJECT_ID}/workorder-branches/${BRANCH_ID}/revision-history`,
  });

  assert.equal(cycles.statusCode, 200);
  assert.equal(cycles.json().validation_cycles[0].validation_cycle_id, CYCLE_ID);
  assert.equal(cycle.statusCode, 200);
  assert.equal(cycle.json().branches[0].effective_head_run.run_id, 'run-route');
  assert.equal(history.statusCode, 200);
  assert.equal(history.json().revisions.length, 2);
  assert.equal(history.json().revisions[0].is_current_admitted, false);
  await app.close();
});

test('experiment lineage routes map project scope mismatches to opaque 404 responses', async () => {
  const app = await createRouteHarness();
  const cycle = await app.inject({
    method: 'GET',
    url: `/paper-implementation/projects/project-other/validation-cycles/${CYCLE_ID}/experiment-lineage`,
  });
  const history = await app.inject({
    method: 'GET',
    url: `/paper-implementation/projects/project-other/workorder-branches/${BRANCH_ID}/revision-history`,
  });

  assert.equal(cycle.statusCode, 404);
  assert.equal(cycle.json().error.code, 'NOT_FOUND');
  assert.equal(cycle.json().error.details.reason_code, 'VALIDATION_CYCLE_NOT_FOUND');
  assert.equal(history.statusCode, 404);
  assert.equal(history.json().error.details.reason_code, 'WORK_ORDER_BRANCH_NOT_FOUND');
  await app.close();
});

test('experiment lineage routes reject schema-invalid path parameters with 400', async () => {
  const app = await createRouteHarness();
  const response = await app.inject({
    method: 'GET',
    url: '/paper-implementation/projects/%20/experiment-lineage/validation-cycles',
  });

  assert.equal(response.statusCode, 400);
  assert.equal(response.json().error.code, 'INVALID_PAYLOAD');
  assert.equal(response.json().error.details.reason_code, 'V2_TYPED_SNAPSHOT_INVALID');
  await app.close();
});

async function createRouteHarness() {
  const repository = new InMemoryPaperImplementationExperimentLineageV2Repository({
    projects: [PROJECT_ID],
    project_cycles: [{
      implementation_project_id: PROJECT_ID,
      cycles: [{
        validation_cycle_id: CYCLE_ID,
        lifecycle_status: 'admitted',
        target_ref_type: 'paper_project',
        target_ref_id: 'paper-route',
        target_version_id: null,
        created_at: '2026-07-24T00:00:00.000Z',
        closure: OPEN_CLOSURE,
        branch_count: 1,
        admitted_branch_count: 1,
        total_run_count: 2,
        active_real_attempt_count: 0,
      }],
    }],
    cycle_lineages: [{
      implementation_project_id: PROJECT_ID,
      validation_cycle_id: CYCLE_ID,
      lifecycle_status: 'admitted',
      target_ref_type: 'paper_project',
      target_ref_id: 'paper-route',
      target_version_id: null,
      created_at: '2026-07-24T00:00:00.000Z',
      closure: OPEN_CLOSURE,
      branches: [{
        branch_id: BRANCH_ID,
        branch_key: 'main',
        parent_branch_key: null,
        current_admitted_revision_id: 'revision-route-2',
        current_admitted_revision_hash: hash('2'),
        current_admitted_revision_sequence: 2,
        head_revision_id: 'revision-route-2',
        head_revision_sequence: 2,
        head_run_id: 'run-route',
        head_run_manifest_hash: hash('3'),
        head_run: {
          run_id: 'run-route',
          run_manifest_hash: hash('3'),
          external_pi_branch_id: BRANCH_ID,
          external_pi_work_order_revision_id: 'revision-route-2',
          external_pi_work_order_revision_hash: hash('2'),
          external_pi_revision_sequence: 2,
          head_acknowledged: true,
          cells: [{
            run_cell_id: 'run-cell-route',
            ordinal: 1,
            cell_key: 'cell-route',
            training_task_spec_id: 'task-route',
            training_task_spec_hash: hash('4'),
          }],
          attempts: [],
        },
      }],
    }],
    branch_histories: [{
      implementation_project_id: PROJECT_ID,
      validation_cycle_id: CYCLE_ID,
      branch_id: BRANCH_ID,
      branch_key: 'main',
      parent_branch_key: null,
      current_admitted_revision_id: 'revision-route-2',
      head_revision_id: 'revision-route-2',
      head_revision_sequence: 2,
      head_run_id: 'run-route',
      head_run_manifest_hash: hash('3'),
      revisions: [{
        work_order_revision_id: 'revision-route-2',
        revision_sequence: 2,
        content_hash: hash('2'),
        parent_revision_id: 'revision-route-1',
        admitted_at: '2026-07-24T02:00:00.000Z',
        admission_business_idempotency_key: 'admit-route-2',
        cell_count: 1,
        run: {
          run_id: 'run-route',
          run_manifest_hash: hash('3'),
        },
      }, {
        work_order_revision_id: 'revision-route-1',
        revision_sequence: 1,
        content_hash: hash('1'),
        parent_revision_id: null,
        admitted_at: '2026-07-24T01:00:00.000Z',
        admission_business_idempotency_key: 'admit-route-1',
        cell_count: 1,
        run: {
          run_id: 'run-route-old',
          run_manifest_hash: hash('5'),
        },
      }],
    }],
  });
  const app = Fastify({ logger: false });
  await registerPaperImplementationExperimentLineageV2Routes(
    app,
    new PaperImplementationExperimentLineageV2Controller(
      new PaperImplementationExperimentLineageV2Service({ repository }),
    ),
  );
  await app.ready();
  return app;
}
