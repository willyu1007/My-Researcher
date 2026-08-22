import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolvePaperImplementationScientificContinuationStage,
  type PaperImplementationScientificContinuationOwnerState,
} from './paper-implementation-scientific-continuation-stage-resolver.js';

function ownerState(
  overrides: Partial<PaperImplementationScientificContinuationOwnerState> = {},
): PaperImplementationScientificContinuationOwnerState {
  return {
    implementation_project_id: 'implementation_project_001',
    project_lifecycle_status: 'active',
    has_admitted_motive: true,
    coordinator_runs: [],
    active_validation_cycle_count: 1,
    validation_cycle_id: 'validation_cycle_001',
    validation_cycle_status: 'admitted',
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

test('terminal owner replay resolves ready_for_writing with no automatic action', () => {
  const result = resolvePaperImplementationScientificContinuationStage(ownerState());
  assert.equal(result.response.status, 'ready_for_writing');
  assert.equal(result.response.semantic_stage, 'ready_for_writing');
  assert.equal(result.response.next_action.action, 'none');
  assert.equal(result.automatic_action, null);
  assert.deepEqual(result.response.effects.performed, []);
  assert.ok(result.response.effects.reused.includes('dossier'));
});

test('active coordinator owner state is resumed before a new lane is created', () => {
  const result = resolvePaperImplementationScientificContinuationStage(ownerState({
    has_admitted_motive: false,
    coordinator_runs: [{
      coordinator_run_id: 'coordinator_001',
      lane_id: 'motive',
      run_status: 'blocked',
    }],
    validation_cycle_id: null,
    validation_cycle_status: null,
    experiment: null,
    closure_id: null,
    result_packet_id: null,
    claim_id: null,
    dossier_id: null,
    dossier_status: null,
    dossier_trace_status: null,
  }));
  assert.deepEqual(result.automatic_action, {
    type: 'advance_existing_coordinator_run',
    coordinator_run_id: 'coordinator_001',
    lane_id: 'motive',
  });
});

test('coordinator review stop requires human confirmation and never auto-advances', () => {
  const result = resolvePaperImplementationScientificContinuationStage(ownerState({
    coordinator_runs: [{
      coordinator_run_id: 'coordinator_001',
      lane_id: 'motive',
      run_status: 'waiting_review',
    }],
    dossier_status: null,
    dossier_trace_status: null,
  }));
  assert.equal(result.response.status, 'waiting_for_human_confirmation');
  assert.equal(result.response.next_action.requires_human_confirmation, true);
  assert.equal(result.automatic_action, null);
});

test('missing motive exposes the separately governed bootstrap gap', () => {
  const result = resolvePaperImplementationScientificContinuationStage(ownerState({
    has_admitted_motive: false,
    validation_cycle_id: null,
    validation_cycle_status: null,
    experiment: null,
    closure_id: null,
    result_packet_id: null,
    claim_id: null,
    dossier_id: null,
    dossier_status: null,
    dossier_trace_status: null,
  }));
  assert.equal(result.response.status, 'blocked');
  assert.equal(result.response.blocker?.code, 'CORE_MOTIVE_BOOTSTRAP_NOT_COMPOSED');
  assert.equal(result.automatic_action, null);
});

test('missing or ambiguous experiment specification stops for selection', () => {
  const missing = resolvePaperImplementationScientificContinuationStage(ownerState({
    experiment: null,
    closure_id: null,
    result_packet_id: null,
    claim_id: null,
    dossier_id: null,
    dossier_status: null,
    dossier_trace_status: null,
  }));
  assert.equal(missing.response.status, 'waiting_for_experiment_specification');
  assert.equal(missing.automatic_action, null);

  const ambiguous = resolvePaperImplementationScientificContinuationStage(ownerState({
    experiment: {
      ...ownerState().experiment!,
      admitted_branch_count: 2,
    },
    dossier_status: null,
    dossier_trace_status: null,
  }));
  assert.equal(ambiguous.response.blocker?.code, 'AMBIGUOUS_EXPERIMENT_BRANCH');
  assert.equal(ambiguous.automatic_action, null);
});

test('unsupported envelope is an explicit non-paid blocker', () => {
  const result = resolvePaperImplementationScientificContinuationStage(ownerState({
    experiment: {
      ...ownerState().experiment!,
      supported_envelope: false,
    },
    dossier_status: null,
    dossier_trace_status: null,
  }));
  assert.equal(result.response.status, 'blocked');
  assert.equal(result.response.blocker?.code, 'UNSUPPORTED_EXPERIMENT_ENVELOPE');
  assert.equal(result.response.next_action.requires_paid_authorization, false);
  assert.equal(result.automatic_action, null);
});

test('materialized two-cell Run stops before paid execution when Attempts are absent', () => {
  const result = resolvePaperImplementationScientificContinuationStage(ownerState({
    experiment: {
      ...ownerState().experiment!,
      attempt_count: 0,
      successful_cell_count: 0,
      scientific_result_ids: [],
      scientific_validation_report_id: null,
    },
    closure_id: null,
    result_packet_id: null,
    claim_id: null,
    dossier_id: null,
    dossier_status: null,
    dossier_trace_status: null,
  }));
  assert.equal(result.response.status, 'waiting_for_paid_execution_authorization');
  assert.equal(result.response.next_action.action, 'authorize_paid_execution');
  assert.equal(result.response.next_action.requires_paid_authorization, true);
  assert.equal(result.automatic_action, null);
});

test('provider, validation, closure, and claim stages resolve in order', () => {
  const provider = resolvePaperImplementationScientificContinuationStage(ownerState({
    experiment: {
      ...ownerState().experiment!,
      active_attempt_count: 1,
      successful_cell_count: 1,
      scientific_result_ids: [],
      scientific_validation_report_id: null,
    },
    closure_id: null,
    result_packet_id: null,
    claim_id: null,
    dossier_id: null,
    dossier_status: null,
    dossier_trace_status: null,
  }));
  assert.equal(provider.response.status, 'waiting_for_provider_execution');

  const validation = resolvePaperImplementationScientificContinuationStage(ownerState({
    experiment: {
      ...ownerState().experiment!,
      scientific_result_ids: [],
      scientific_validation_report_id: null,
    },
    closure_id: null,
    result_packet_id: null,
    claim_id: null,
    dossier_id: null,
    dossier_status: null,
    dossier_trace_status: null,
  }));
  assert.equal(
    validation.response.blocker?.code,
    'SCIENTIFIC_VALIDATION_CONTINUATION_NOT_COMPOSED',
  );
  assert.equal(validation.automatic_action, null);

  const closure = resolvePaperImplementationScientificContinuationStage(ownerState({
    closure_id: null,
    result_packet_id: null,
    claim_id: null,
    dossier_id: null,
    dossier_status: null,
    dossier_trace_status: null,
  }));
  assert.equal(closure.response.blocker?.code, 'EVIDENCE_CLOSURE_CONTINUATION_NOT_COMPOSED');
  assert.equal(closure.automatic_action, null);

  const claim = resolvePaperImplementationScientificContinuationStage(ownerState({
    claim_id: null,
    dossier_id: null,
    dossier_status: null,
    dossier_trace_status: null,
  }));
  assert.equal(claim.response.blocker?.code, 'CLAIM_DOSSIER_CONTINUATION_NOT_COMPOSED');
  assert.equal(claim.automatic_action, null);
});
