import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  ValidationCycleReadinessEvaluationV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-evidence-v2-contracts';

import {
  InMemoryPaperImplementationExperimentLineageV2Repository,
} from '../repositories/in-memory-paper-implementation-experiment-lineage-v2-repository.js';
import {
  PaperImplementationAgentActionsV2Service,
} from './paper-implementation-agent-actions-v2-service.js';
import {
  PaperImplementationExperimentLineageV2Service,
  PaperImplementationExperimentLineageV2ServiceError,
} from './paper-implementation-experiment-lineage-v2-service.js';

const PROJECT_ID = 'project-actions';
const CYCLE_ID = 'cycle-actions';
const BRANCH_ID = 'branch-actions';
const RUN_ID = 'run-actions';
const RUN_CELL_ID = 'run-cell-actions';
const HASH = `sha256:${'a'.repeat(64)}`;
const OPEN_CLOSURE = {
  closed: false,
  kind: null,
  disposition: null,
  closed_at: null,
} as const;

function readiness(
  overrides: Partial<ValidationCycleReadinessEvaluationV2> = {},
): ValidationCycleReadinessEvaluationV2 {
  return {
    schema_version: 'v1',
    validation_cycle_id: CYCLE_ID,
    status: 'ready_no_evidence',
    ordered_blockers: [],
    watermark: {
      schema_version: 'v1',
      validation_cycle_id: CYCLE_ID,
      expected_cycle_version: 4,
      ordered_branches: [{
        ordinal: 1,
        branch_id: BRANCH_ID,
        branch_key: 'main',
        current_admitted_revision_id: 'revision-actions',
        current_admitted_revision_hash: HASH,
        branch_revision_sequence: 1,
        effective_head_run_id: RUN_ID,
        effective_head_run_manifest_hash: HASH,
        head_blocker: null,
        ordered_cells: [{
          ordinal: 1,
          run_cell_id: RUN_CELL_ID,
          cell_key: 'cell-actions',
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
    ...overrides,
  };
}

function createService(options: {
  lifecycle_status?: string;
  closure?: typeof OPEN_CLOSURE | {
    closed: true;
    kind: 'control_flow_validated_no_paper_evidence';
    disposition: null;
    closed_at: string;
  };
  attempts?: Array<{
    execution_attempt_id: string;
    lifecycle_state: string;
  }>;
  readiness?: ValidationCycleReadinessEvaluationV2;
}) {
  const closure = options.closure ?? OPEN_CLOSURE;
  const repository = new InMemoryPaperImplementationExperimentLineageV2Repository({
    projects: [PROJECT_ID, 'project-other'],
    cycle_lineages: [{
      implementation_project_id: PROJECT_ID,
      validation_cycle_id: CYCLE_ID,
      lifecycle_status: options.lifecycle_status ?? 'admitted',
      target_ref_type: 'paper_project',
      target_ref_id: 'paper-actions',
      target_version_id: null,
      created_at: '2026-07-24T00:00:00.000Z',
      closure,
      branches: [{
        branch_id: BRANCH_ID,
        branch_key: 'main',
        parent_branch_key: null,
        current_admitted_revision_id: 'revision-actions',
        current_admitted_revision_hash: HASH,
        current_admitted_revision_sequence: 1,
        head_revision_id: 'revision-actions',
        head_revision_sequence: 1,
        head_run_id: RUN_ID,
        head_run_manifest_hash: HASH,
        head_run: {
          run_id: RUN_ID,
          run_manifest_hash: HASH,
          external_pi_branch_id: BRANCH_ID,
          external_pi_work_order_revision_id: 'revision-actions',
          external_pi_work_order_revision_hash: HASH,
          external_pi_revision_sequence: 1,
          head_acknowledged: true,
          cells: [{
            run_cell_id: RUN_CELL_ID,
            ordinal: 1,
            cell_key: 'cell-actions',
            training_task_spec_id: 'task-actions',
            training_task_spec_hash: HASH,
          }],
          attempts: (options.attempts ?? []).map((attempt, index) => ({
            execution_attempt_id: attempt.execution_attempt_id,
            run_cell_id: RUN_CELL_ID,
            attempt_sequence: index + 1,
            execution_mode: 'real_provider',
            lifecycle_state: attempt.lifecycle_state,
            terminal_reason_code: attempt.lifecycle_state === 'succeeded'
              ? 'real_provider_succeeded'
              : null,
            updated_at: `2026-07-24T00:00:0${index}.000Z`,
            collection: null,
          })),
        },
      }],
    }],
  });
  return new PaperImplementationAgentActionsV2Service({
    lineage: new PaperImplementationExperimentLineageV2Service({ repository }),
    readiness: {
      async evaluate(validationCycleId) {
        assert.equal(validationCycleId, CYCLE_ID);
        return structuredClone(options.readiness ?? readiness());
      },
    },
  });
}

test('closure preparation derives control, blocked, and scientific proposal-template shapes', async () => {
  const ready = await createService({}).prepareValidationCycleClosure(CYCLE_ID);
  assert.equal(ready.readiness.outcome, 'ready');
  assert.equal(
    ready.derived_closure_kind,
    'control_flow_validated_no_paper_evidence',
  );
  assert.deepEqual(ready.prepared_request, {
    body: {
      validation_cycle_id: CYCLE_ID,
      expected_cycle_version: 4,
      expected_closure_input_hash: HASH,
      closure_kind: 'control_flow_validated_no_paper_evidence',
      accepted_proposal_id: null,
      expected_proposal_hash: null,
      idempotency_key: null,
    },
    required_template_fields: [{
      field: 'idempotency_key',
      semantic: 'business_idempotency_key',
      required: true,
    }],
  });

  const blocker = {
    ordinal: 1,
    code: 'CYCLE_ACTIVE_REAL_ATTEMPT',
    branch_id: null,
  } as const;
  const blocked = await createService({
    readiness: readiness({
      status: 'blocked',
      ordered_blockers: [blocker],
    }),
  }).prepareValidationCycleClosure(CYCLE_ID);
  assert.deepEqual(blocked.readiness, {
    outcome: 'blocked',
    blockers: [blocker],
  });
  assert.equal(blocked.derived_closure_kind, null);
  assert.equal(blocked.prepared_request, null);

  const scientific = await createService({
    readiness: readiness({
      status: 'ready_with_evidence',
      eligible_run_evidence_unit_count: 2,
    }),
  }).prepareValidationCycleClosure(CYCLE_ID);
  assert.equal(scientific.derived_closure_kind, 'scientific_evidence_assessed');
  assert.deepEqual(scientific.prepared_request, {
    body: {
      validation_cycle_id: CYCLE_ID,
      expected_cycle_version: 4,
      expected_closure_input_hash: HASH,
      closure_kind: 'scientific_evidence_assessed',
      accepted_proposal_id: null,
      expected_proposal_hash: null,
      idempotency_key: null,
    },
    required_template_fields: [{
      field: 'accepted_proposal_id',
      semantic: 'admitted_scientific_proposal_id',
      required: true,
    }, {
      field: 'expected_proposal_hash',
      semantic: 'admitted_scientific_proposal_hash',
      required: true,
    }, {
      field: 'idempotency_key',
      semantic: 'business_idempotency_key',
      required: true,
    }],
  });
});

test('available actions enumerate open head starts and no-evidence closure deterministically', async () => {
  const service = createService({});
  const first = await service.listValidationCycleAvailableActions(PROJECT_ID, CYCLE_ID);
  const second = await service.listValidationCycleAvailableActions(PROJECT_ID, CYCLE_ID);
  assert.deepEqual(second, first);
  assert.deepEqual(first.actions.map((action) => action.action_kind), [
    'admit_work_order_revision',
    'start_workflow_simulation',
    'start_real_provider_execution',
    'close_validation_cycle',
  ]);
  assert.equal(first.actions[0]?.required_human_confirmation_scope, 'work_order_admission');
  assert.deepEqual(
    first.actions.map((action) => action.capability_gated),
    [true, true, true, true],
  );
  assert.deepEqual(first.actions[1]?.subject, {
    branch_id: BRANCH_ID,
    run_id: RUN_ID,
  });
});

test('available actions expose cancel and reconcile for an active head attempt', async () => {
  const service = createService({
    lifecycle_status: 'running',
    attempts: [{
      execution_attempt_id: 'attempt-succeeded',
      lifecycle_state: 'succeeded',
    }, {
      execution_attempt_id: 'attempt-active',
      lifecycle_state: 'running',
    }],
    readiness: readiness({
      status: 'blocked',
      ordered_blockers: [{
        ordinal: 1,
        code: 'CYCLE_ACTIVE_REAL_ATTEMPT',
        branch_id: null,
      }],
    }),
  });
  const response = await service.listValidationCycleAvailableActions(PROJECT_ID, CYCLE_ID);
  assert.deepEqual(response.actions.map((action) => action.action_kind), [
    'cancel_execution_attempt',
    'reconcile_execution_attempt',
  ]);
  assert.deepEqual(response.actions[0]?.subject, {
    branch_id: BRANCH_ID,
    run_id: RUN_ID,
    execution_attempt_id: 'attempt-active',
  });
});

test('available actions return an empty list and immutable closure summary for closed cycles', async () => {
  const closure = {
    closed: true,
    kind: 'control_flow_validated_no_paper_evidence',
    disposition: null,
    closed_at: '2026-07-24T05:00:00.000Z',
  } as const;
  const response = await createService({
    lifecycle_status: 'completed',
    closure,
  }).listValidationCycleAvailableActions(PROJECT_ID, CYCLE_ID);
  assert.deepEqual(response.actions, []);
  assert.deepEqual(response.closure, closure);
});

test('available actions preserve opaque A1 not-found semantics for project scope mismatches', async () => {
  await assert.rejects(
    createService({}).listValidationCycleAvailableActions('project-other', CYCLE_ID),
    (error) => (
      error instanceof PaperImplementationExperimentLineageV2ServiceError
      && error.reasonCode === 'VALIDATION_CYCLE_NOT_FOUND'
    ),
  );
});
