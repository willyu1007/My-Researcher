import assert from 'node:assert/strict';
import test from 'node:test';

import {
  InMemoryPaperImplementationExperimentLineageV2Repository,
} from '../repositories/in-memory-paper-implementation-experiment-lineage-v2-repository.js';
import {
  PaperImplementationExperimentLineageV2Service,
  PaperImplementationExperimentLineageV2ServiceError,
} from './paper-implementation-experiment-lineage-v2-service.js';

const PROJECT_ID = 'project-a';
const CYCLE_ID = 'cycle-a';
const BRANCH_ID = 'branch-a';
const OPEN_CLOSURE = {
  closed: false,
  kind: null,
  disposition: null,
  closed_at: null,
} as const;
const hash = (character: string) => `sha256:${character.repeat(64)}`;

function createService() {
  return new PaperImplementationExperimentLineageV2Service({
    repository: new InMemoryPaperImplementationExperimentLineageV2Repository({
      projects: [PROJECT_ID, 'project-b'],
      project_cycles: [{
        implementation_project_id: PROJECT_ID,
        cycles: [{
          validation_cycle_id: 'cycle-old',
          lifecycle_status: 'admitted',
          target_ref_type: 'paper_project',
          target_ref_id: 'paper-old',
          target_version_id: null,
          created_at: '2026-07-23T00:00:00.000Z',
          closure: OPEN_CLOSURE,
          branch_count: 1,
          admitted_branch_count: 1,
          total_run_count: 1,
          active_real_attempt_count: 0,
        }, {
          validation_cycle_id: CYCLE_ID,
          lifecycle_status: 'admitted',
          target_ref_type: 'paper_project',
          target_ref_id: 'paper-a',
          target_version_id: 'version-2',
          created_at: '2026-07-24T00:00:00.000Z',
          closure: OPEN_CLOSURE,
          branch_count: 2,
          admitted_branch_count: 2,
          total_run_count: 2,
          active_real_attempt_count: 1,
        }],
      }],
      cycle_lineages: [{
        implementation_project_id: PROJECT_ID,
        validation_cycle_id: CYCLE_ID,
        lifecycle_status: 'admitted',
        target_ref_type: 'paper_project',
        target_ref_id: 'paper-a',
        target_version_id: 'version-2',
        created_at: '2026-07-24T00:00:00.000Z',
        closure: OPEN_CLOSURE,
        branches: [{
          branch_id: 'branch-blocked',
          branch_key: 'a-blocked',
          parent_branch_key: null,
          current_admitted_revision_id: 'revision-blocked',
          current_admitted_revision_hash: hash('1'),
          current_admitted_revision_sequence: 1,
          head_revision_id: null,
          head_revision_sequence: null,
          head_run_id: null,
          head_run_manifest_hash: null,
          head_run: null,
        }, {
          branch_id: BRANCH_ID,
          branch_key: 'b-head',
          parent_branch_key: 'a-blocked',
          current_admitted_revision_id: 'revision-2',
          current_admitted_revision_hash: hash('2'),
          current_admitted_revision_sequence: 2,
          head_revision_id: 'revision-2',
          head_revision_sequence: 2,
          head_run_id: 'run-2',
          head_run_manifest_hash: hash('3'),
          head_run: {
            run_id: 'run-2',
            run_manifest_hash: hash('3'),
            external_pi_branch_id: BRANCH_ID,
            external_pi_work_order_revision_id: 'revision-2',
            external_pi_work_order_revision_hash: hash('2'),
            external_pi_revision_sequence: 2,
            head_acknowledged: true,
            cells: [{
              run_cell_id: 'run-cell-2',
              ordinal: 2,
              cell_key: 'cell-b',
              training_task_spec_id: 'task-2',
              training_task_spec_hash: hash('5'),
            }, {
              run_cell_id: 'run-cell-1',
              ordinal: 1,
              cell_key: 'cell-a',
              training_task_spec_id: 'task-1',
              training_task_spec_hash: hash('4'),
            }],
            attempts: [{
              execution_attempt_id: 'attempt-2',
              run_cell_id: 'run-cell-2',
              attempt_sequence: 1,
              execution_mode: 'real_provider',
              lifecycle_state: 'running',
              terminal_reason_code: null,
              updated_at: '2026-07-24T03:00:00.000Z',
              collection: null,
            }, {
              execution_attempt_id: 'attempt-1',
              run_cell_id: 'run-cell-1',
              attempt_sequence: 1,
              execution_mode: 'simulation',
              lifecycle_state: 'succeeded',
              terminal_reason_code: 'SIMULATION_COMPLETED',
              updated_at: '2026-07-24T02:00:00.000Z',
              collection: {
                collection_state: 'collected',
                output_kinds: [
                  'simulation_lifecycle_trace',
                  'simulation_result_envelope',
                  'simulation_result_envelope',
                ],
              },
            }],
          },
        }],
      }],
      branch_histories: [{
        implementation_project_id: PROJECT_ID,
        validation_cycle_id: CYCLE_ID,
        branch_id: BRANCH_ID,
        branch_key: 'b-head',
        parent_branch_key: 'a-blocked',
        current_admitted_revision_id: 'revision-2',
        head_revision_id: 'revision-2',
        head_revision_sequence: 2,
        head_run_id: 'run-2',
        head_run_manifest_hash: hash('3'),
        revisions: [{
          work_order_revision_id: 'revision-2',
          revision_sequence: 2,
          content_hash: hash('2'),
          parent_revision_id: 'revision-1',
          admitted_at: '2026-07-24T02:00:00.000Z',
          admission_business_idempotency_key: 'admit-2',
          cell_count: 2,
          run: {
            run_id: 'run-2',
            run_manifest_hash: hash('3'),
          },
        }, {
          work_order_revision_id: 'revision-1',
          revision_sequence: 1,
          content_hash: hash('1'),
          parent_revision_id: null,
          admitted_at: '2026-07-24T01:00:00.000Z',
          admission_business_idempotency_key: 'admit-1',
          cell_count: 1,
          run: {
            run_id: 'run-1',
            run_manifest_hash: hash('6'),
          },
        }],
      }],
    }),
  });
}

test('lineage read service orders cycles, branches, cells, attempts, and outputs deterministically', async () => {
  const service = createService();
  const firstCycles = await service.listProjectValidationCycles(PROJECT_ID);
  const secondCycles = await service.listProjectValidationCycles(PROJECT_ID);
  assert.deepEqual(secondCycles, firstCycles);
  assert.deepEqual(
    firstCycles.validation_cycles.map((cycle) => cycle.validation_cycle_id),
    [CYCLE_ID, 'cycle-old'],
  );

  const first = await service.getValidationCycleExperimentLineage(PROJECT_ID, CYCLE_ID);
  const second = await service.getValidationCycleExperimentLineage(PROJECT_ID, CYCLE_ID);
  assert.deepEqual(second, first);
  assert.deepEqual(first.branches.map((branch) => branch.branch_key), [
    'a-blocked',
    'b-head',
  ]);
  assert.deepEqual(first.branches.map((branch) => branch.ordinal), [1, 2]);
  const head = first.branches[1]?.effective_head_run;
  assert.ok(head);
  assert.deepEqual(head.ordered_cells.map((cell) => cell.ordinal), [1, 2]);
  assert.deepEqual(head.ordered_attempts.map((attempt) => attempt.execution_attempt_id), [
    'attempt-1',
    'attempt-2',
  ]);
  assert.deepEqual(head.collection_summaries[0]?.output_kinds, [
    'simulation_lifecycle_trace',
    'simulation_result_envelope',
  ]);
});

test('lineage read service returns not-found semantics for project scope mismatches', async () => {
  const service = createService();
  await assert.rejects(
    service.getValidationCycleExperimentLineage('project-b', CYCLE_ID),
    (error) => (
      error instanceof PaperImplementationExperimentLineageV2ServiceError
      && error.reasonCode === 'VALIDATION_CYCLE_NOT_FOUND'
    ),
  );
  await assert.rejects(
    service.getWorkOrderBranchRevisionHistory('project-b', BRANCH_ID),
    (error) => (
      error instanceof PaperImplementationExperimentLineageV2ServiceError
      && error.reasonCode === 'WORK_ORDER_BRANCH_NOT_FOUND'
    ),
  );
  await assert.rejects(
    service.listProjectValidationCycles('project-missing'),
    (error) => (
      error instanceof PaperImplementationExperimentLineageV2ServiceError
      && error.reasonCode === 'IMPLEMENTATION_PROJECT_NOT_FOUND'
    ),
  );
});

test('lineage read service includes superseded history flags and surfaces head blockers', async () => {
  const service = createService();
  const cycle = await service.getValidationCycleExperimentLineage(PROJECT_ID, CYCLE_ID);
  assert.equal(cycle.branches[0]?.effective_head_run, null);
  assert.equal(cycle.branches[0]?.head_blocker, 'BRANCH_HEAD_NOT_FROZEN');

  const history = await service.getWorkOrderBranchRevisionHistory(PROJECT_ID, BRANCH_ID);
  assert.equal(history.history_includes_superseded_revisions, true);
  assert.deepEqual(history.revisions.map((revision) => revision.revision_sequence), [1, 2]);
  assert.deepEqual(history.revisions.map((revision) => revision.is_current_admitted), [
    false,
    true,
  ]);
  assert.deepEqual(history.revisions.map((revision) => revision.is_head_run_source), [
    false,
    true,
  ]);
  assert.equal(history.revisions[0]?.run_ref?.run_id, 'run-1');
});
