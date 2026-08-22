import test from 'node:test';
import assert from 'node:assert/strict';
import { AppError } from '../errors/app-error.js';
import {
  PaperImplementationScientificContinuationService,
  type PaperImplementationScientificContinuationCoordinator,
  type PaperImplementationScientificContinuationStateReader,
} from './paper-implementation-scientific-continuation-service.js';
import type { PaperImplementationScientificContinuationOwnerState } from './paper-implementation-scientific-continuation-stage-resolver.js';

const PROJECT_ID = 'implementation_project_001';

function ownerState(
  overrides: Partial<PaperImplementationScientificContinuationOwnerState> = {},
): PaperImplementationScientificContinuationOwnerState {
  return {
    implementation_project_id: PROJECT_ID,
    project_lifecycle_status: 'active',
    has_admitted_motive: true,
    coordinator_runs: [],
    active_validation_cycle_count: 1,
    validation_cycle_id: 'validation_cycle_001',
    validation_cycle_status: 'completed',
    experiment: {
      admitted_branch_count: 1,
      branch_id: 'branch_001',
      work_order_revision_id: 'revision_001',
      supported_envelope: true,
      run_id: 'run_001',
      cell_count: 2,
      attempt_count: 2,
      active_attempt_count: 0,
      successful_cell_count: 2,
      failed_cell_count: 0,
      scientific_result_ids: ['result_001', 'result_002'],
      scientific_validation_report_id: 'report_001',
    },
    closure_id: 'closure_001',
    result_packet_id: 'packet_001',
    claim_id: 'claim_001',
    claim_requires_human_confirmation: false,
    dossier_id: 'dossier_001',
    dossier_status: 'ready_for_writing',
    dossier_trace_status: 'complete',
    ...overrides,
  };
}

function sequenceReader(
  states: PaperImplementationScientificContinuationOwnerState[],
): PaperImplementationScientificContinuationStateReader & { reads: number } {
  return {
    reads: 0,
    async read() {
      const state = states[Math.min(this.reads, states.length - 1)];
      this.reads += 1;
      assert.ok(state);
      return structuredClone(state);
    },
  };
}

function countingCoordinator(): PaperImplementationScientificContinuationCoordinator & {
  advances: Array<{ projectId: string; runId: string }>;
} {
  return {
    advances: [],
    async advance(projectId, runId) {
      this.advances.push({ projectId, runId });
      return {};
    },
  };
}

test('terminal replay reads owner state and performs zero coordinator work', async () => {
  const reader = sequenceReader([ownerState()]);
  const coordinator = countingCoordinator();
  const service = new PaperImplementationScientificContinuationService({
    ownerStateReader: reader,
    coordinator,
  });
  const result = await service.continue({ implementation_project_id: PROJECT_ID });
  assert.equal(result.status, 'ready_for_writing');
  assert.deepEqual(result.effects.performed, []);
  assert.equal(result.effects.llm_lane_id, null);
  assert.equal(reader.reads, 1);
  assert.equal(coordinator.advances.length, 0);
});

test('one command resumes at most one persisted coordinator lane and rereads owners', async () => {
  const activeRun = ownerState({
    has_admitted_motive: false,
    coordinator_runs: [{
      coordinator_run_id: 'coordinator_001',
      lane_id: 'motive',
      run_status: 'created',
    }],
    active_validation_cycle_count: 0,
    validation_cycle_id: null,
    validation_cycle_status: null,
    experiment: null,
    closure_id: null,
    result_packet_id: null,
    claim_id: null,
    dossier_id: null,
    dossier_status: null,
    dossier_trace_status: null,
  });
  const afterAdvance = ownerState({
    has_admitted_motive: false,
    coordinator_runs: [{
      coordinator_run_id: 'coordinator_001',
      lane_id: 'motive',
      run_status: 'completed',
    }],
    active_validation_cycle_count: 0,
    validation_cycle_id: null,
    validation_cycle_status: null,
    experiment: null,
    closure_id: null,
    result_packet_id: null,
    claim_id: null,
    dossier_id: null,
    dossier_status: null,
    dossier_trace_status: null,
  });
  const reader = sequenceReader([activeRun, afterAdvance]);
  const coordinator = countingCoordinator();
  const service = new PaperImplementationScientificContinuationService({
    ownerStateReader: reader,
    coordinator,
  });
  const result = await service.continue({ implementation_project_id: PROJECT_ID });
  assert.deepEqual(coordinator.advances, [{
    projectId: PROJECT_ID,
    runId: 'coordinator_001',
  }]);
  assert.equal(reader.reads, 2);
  assert.deepEqual(result.effects.performed, ['coordinator_run']);
  assert.equal(result.effects.llm_lane_id, 'motive');
  assert.equal(result.blocker?.code, 'CORE_MOTIVE_BOOTSTRAP_NOT_COMPOSED');
});

test('completed coordinator replay does not create or re-advance a lane', async () => {
  const reader = sequenceReader([ownerState({
    has_admitted_motive: false,
    coordinator_runs: [{
      coordinator_run_id: 'coordinator_001',
      lane_id: 'motive',
      run_status: 'completed',
    }],
    active_validation_cycle_count: 0,
    validation_cycle_id: null,
    validation_cycle_status: null,
    experiment: null,
    closure_id: null,
    result_packet_id: null,
    claim_id: null,
    dossier_id: null,
    dossier_status: null,
    dossier_trace_status: null,
  })]);
  const coordinator = countingCoordinator();
  const service = new PaperImplementationScientificContinuationService({
    ownerStateReader: reader,
    coordinator,
  });
  const result = await service.continue({ implementation_project_id: PROJECT_ID });
  assert.equal(result.blocker?.code, 'CORE_MOTIVE_BOOTSTRAP_NOT_COMPOSED');
  assert.equal(coordinator.advances.length, 0);
});

test('blank owner root fails before owner or coordinator access', async () => {
  const reader = sequenceReader([ownerState()]);
  const coordinator = countingCoordinator();
  const service = new PaperImplementationScientificContinuationService({
    ownerStateReader: reader,
    coordinator,
  });
  await assert.rejects(
    () => service.continue({ implementation_project_id: '  ' }),
    (error: unknown) => error instanceof AppError && error.statusCode === 400,
  );
  assert.equal(reader.reads, 0);
  assert.equal(coordinator.advances.length, 0);
});
