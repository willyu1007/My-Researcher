import {
  PAPER_IMPLEMENTATION_SCIENTIFIC_CONTINUATION_RESUME_POLICY,
  PAPER_IMPLEMENTATION_SCIENTIFIC_CONTINUATION_SCHEMA_VERSION,
  type PaperImplementationScientificContinuationEffect,
  type PaperImplementationScientificContinuationResponse,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-contracts';

export interface ScientificContinuationCoordinatorRunState {
  coordinator_run_id: string;
  lane_id: string;
  run_status:
    | 'created'
    | 'advancing'
    | 'waiting_review'
    | 'blocked'
    | 'budget_exhausted'
    | 'completed'
    | 'failed';
}

export interface ScientificContinuationExperimentState {
  admitted_branch_count: number;
  branch_id: string | null;
  work_order_revision_id: string | null;
  supported_envelope: boolean | null;
  run_id: string | null;
  cell_count: number;
  attempt_count: number;
  active_attempt_count: number;
  successful_cell_count: number;
  failed_cell_count: number;
  scientific_result_ids: string[];
  scientific_validation_report_id: string | null;
}

/**
 * A bounded, read-only projection of durable owner records. It is not a new
 * workflow state and is rebuilt on every continuation command.
 */
export interface PaperImplementationScientificContinuationOwnerState {
  implementation_project_id: string;
  project_lifecycle_status: 'active' | 'blocked' | 'archived' | 'missing';
  has_admitted_motive: boolean;
  coordinator_runs: ScientificContinuationCoordinatorRunState[];
  active_validation_cycle_count: number;
  validation_cycle_id: string | null;
  validation_cycle_status: string | null;
  experiment: ScientificContinuationExperimentState | null;
  closure_id: string | null;
  result_packet_id: string | null;
  claim_id: string | null;
  claim_requires_human_confirmation: boolean;
  dossier_id: string | null;
  dossier_status: string | null;
  dossier_trace_status: string | null;
}

export type PaperImplementationScientificContinuationAutomaticAction =
  | { type: 'advance_existing_coordinator_run'; coordinator_run_id: string; lane_id: string }
  | null;

export interface PaperImplementationScientificContinuationResolution {
  response: PaperImplementationScientificContinuationResponse;
  automatic_action: PaperImplementationScientificContinuationAutomaticAction;
}

const TERMINAL_COORDINATOR_STATUSES = new Set(['completed', 'failed']);

function uniqueEffects(
  effects: PaperImplementationScientificContinuationEffect[],
): PaperImplementationScientificContinuationEffect[] {
  return [...new Set(effects)];
}

function reusedEffects(
  state: PaperImplementationScientificContinuationOwnerState,
): PaperImplementationScientificContinuationEffect[] {
  const effects: PaperImplementationScientificContinuationEffect[] = [];
  if (state.coordinator_runs.length > 0) effects.push('coordinator_run');
  if (state.has_admitted_motive || state.validation_cycle_id) effects.push('domain_authority');
  if (state.experiment?.work_order_revision_id) effects.push('experiment_work_order');
  if (state.experiment?.run_id) effects.push('experiment_run');
  if ((state.experiment?.attempt_count ?? 0) > 0) effects.push('provider_attempt');
  if ((state.experiment?.scientific_result_ids.length ?? 0) > 0) effects.push('scientific_result');
  if (state.experiment?.scientific_validation_report_id) effects.push('scientific_validation');
  if (state.closure_id) effects.push('evidence_candidate', 'result_analysis', 'closure');
  if (state.result_packet_id) effects.push('result_packet');
  if (state.claim_id) effects.push('claim');
  if (state.dossier_id) effects.push('dossier');
  return uniqueEffects(effects);
}

function lineage(state: PaperImplementationScientificContinuationOwnerState) {
  return {
    implementation_project_id: state.implementation_project_id,
    coordinator_run_id: state.coordinator_runs[0]?.coordinator_run_id ?? null,
    validation_cycle_id: state.validation_cycle_id,
    experiment_branch_id: state.experiment?.branch_id ?? null,
    experiment_work_order_revision_id: state.experiment?.work_order_revision_id ?? null,
    experiment_run_id: state.experiment?.run_id ?? null,
    scientific_result_id: state.experiment?.scientific_result_ids[0] ?? null,
    scientific_validation_report_id:
      state.experiment?.scientific_validation_report_id ?? null,
    closure_id: state.closure_id,
    result_packet_id: state.result_packet_id,
    claim_id: state.claim_id,
    dossier_id: state.dossier_id,
  };
}

type ResponseInput = Pick<
  PaperImplementationScientificContinuationResponse,
  'status' | 'semantic_stage' | 'next_action' | 'blocker'
>;

function resolution(
  state: PaperImplementationScientificContinuationOwnerState,
  input: ResponseInput,
  automaticAction: PaperImplementationScientificContinuationAutomaticAction = null,
): PaperImplementationScientificContinuationResolution {
  return {
    response: {
      schema_version: PAPER_IMPLEMENTATION_SCIENTIFIC_CONTINUATION_SCHEMA_VERSION,
      ...input,
      effects: {
        performed: [],
        reused: reusedEffects(state),
        llm_lane_id: null,
      },
      lineage: lineage(state),
      resume_policy: PAPER_IMPLEMENTATION_SCIENTIFIC_CONTINUATION_RESUME_POLICY,
    },
    automatic_action: automaticAction,
  };
}

/**
 * Resolves the first incomplete semantic step from owner state. Ordering is
 * intentional and code-level: this is a decision ladder, not a configurable
 * workflow graph.
 */
export function resolvePaperImplementationScientificContinuationStage(
  state: PaperImplementationScientificContinuationOwnerState,
): PaperImplementationScientificContinuationResolution {
  if (state.project_lifecycle_status !== 'active') {
    const missing = state.project_lifecycle_status === 'missing';
    return resolution(state, {
      status: 'blocked',
      semantic_stage: 'implementation_planning',
      next_action: {
        action: 'resolve_blocker',
        description: missing
          ? 'Use an existing ImplementationProject owner root.'
          : 'Restore the ImplementationProject to an active lifecycle before continuing.',
        requires_paid_authorization: false,
        requires_human_confirmation: false,
      },
      blocker: {
        code: missing ? 'IMPLEMENTATION_PROJECT_NOT_FOUND' : 'IMPLEMENTATION_PROJECT_NOT_ACTIVE',
        message: missing
          ? `ImplementationProject ${state.implementation_project_id} was not found.`
          : `ImplementationProject ${state.implementation_project_id} is ${state.project_lifecycle_status}.`,
        source: 'domain',
        retryable: !missing,
      },
    });
  }

  if (
    state.dossier_status === 'ready_for_writing'
    && state.dossier_trace_status === 'complete'
  ) {
    return resolution(state, {
      status: 'ready_for_writing',
      semantic_stage: 'ready_for_writing',
      next_action: {
        action: 'none',
        description: 'The persisted trace-complete Dossier is ready for writing.',
        requires_paid_authorization: false,
        requires_human_confirmation: false,
      },
      blocker: null,
    });
  }

  const activeCoordinator = state.coordinator_runs.find(
    (run) => !TERMINAL_COORDINATOR_STATUSES.has(run.run_status),
  );
  if (activeCoordinator?.run_status === 'waiting_review') {
    return resolution(state, {
      status: 'waiting_for_human_confirmation',
      semantic_stage: 'llm_runtime',
      next_action: {
        action: 'provide_human_confirmation',
        description: 'Resolve the existing coordinator human-review stop, then repeat this command.',
        requires_paid_authorization: false,
        requires_human_confirmation: true,
      },
      blocker: null,
    });
  }
  if (activeCoordinator?.run_status === 'budget_exhausted') {
    return resolution(state, {
      status: 'waiting_for_llm',
      semantic_stage: 'llm_runtime',
      next_action: {
        action: 'configure_llm',
        description: 'Raise the existing ordinary-LLM run budget through its coordinator API.',
        requires_paid_authorization: false,
        requires_human_confirmation: false,
      },
      blocker: {
        code: 'LLM_BUDGET_EXHAUSTED',
        message: `CoordinatorRun ${activeCoordinator.coordinator_run_id} exhausted its persisted budget.`,
        source: 'continuation',
        retryable: true,
      },
    });
  }
  if (activeCoordinator?.run_status === 'advancing') {
    return resolution(state, {
      status: 'waiting_for_llm',
      semantic_stage: 'llm_runtime',
      next_action: {
        action: 'repeat_continuation',
        description: 'The persisted coordinator run is already advancing; retry from the same owner root.',
        requires_paid_authorization: false,
        requires_human_confirmation: false,
      },
      blocker: null,
    });
  }
  if (activeCoordinator) {
    return resolution(
      state,
      {
        status: 'waiting_for_llm',
        semantic_stage: 'llm_runtime',
        next_action: {
          action: 'repeat_continuation',
          description: 'Advance the persisted ordinary-LLM lane from its current breakpoint.',
          requires_paid_authorization: false,
          requires_human_confirmation: false,
        },
        blocker: null,
      },
      {
        type: 'advance_existing_coordinator_run',
        coordinator_run_id: activeCoordinator.coordinator_run_id,
        lane_id: activeCoordinator.lane_id,
      },
    );
  }

  if (!state.has_admitted_motive) {
    return resolution(state, {
      status: 'blocked',
      semantic_stage: 'implementation_planning',
      next_action: {
        action: 'resolve_blocker',
        description: 'Create and admit the first CoreMotive through a separately governed Topic-to-CoreMotive semantic lane.',
        requires_paid_authorization: false,
        requires_human_confirmation: false,
      },
      blocker: {
        code: 'CORE_MOTIVE_BOOTSTRAP_NOT_COMPOSED',
        message: 'The existing motive coordinator decomposes an existing CoreMotive and cannot bootstrap one from T-138 topic semantics.',
        source: 'continuation',
        retryable: false,
      },
    });
  }

  if (!state.validation_cycle_id) {
    return resolution(state, {
      status: 'blocked',
      semantic_stage: 'implementation_planning',
      next_action: {
        action: 'resolve_blocker',
        description: 'Create the validation-planning coordinator run through the existing explicit runtime API.',
        requires_paid_authorization: false,
        requires_human_confirmation: false,
      },
      blocker: {
        code: 'VALIDATION_PLANNING_RUN_NOT_STARTED',
        message: 'No persisted validation-planning coordinator run or ValidationCycle authority exists.',
        source: 'continuation',
        retryable: true,
      },
    });
  }

  if (state.active_validation_cycle_count > 1) {
    return resolution(state, {
      status: 'waiting_for_experiment_specification',
      semantic_stage: 'experiment_specification',
      next_action: {
        action: 'select_experiment_assets',
        description: 'Select one active ValidationCycle; the continuation service does not choose among scientific alternatives.',
        requires_paid_authorization: false,
        requires_human_confirmation: true,
      },
      blocker: {
        code: 'AMBIGUOUS_VALIDATION_CYCLE',
        message: `${state.active_validation_cycle_count} active ValidationCycles are available.`,
        source: 'domain',
        retryable: true,
      },
    });
  }

  const experiment = state.experiment;
  if (!experiment || experiment.admitted_branch_count === 0) {
    return resolution(state, {
      status: 'waiting_for_experiment_specification',
      semantic_stage: 'experiment_specification',
      next_action: {
        action: 'select_experiment_assets',
        description: 'Provide or select one complete experiment specification for the admitted ValidationCycle.',
        requires_paid_authorization: false,
        requires_human_confirmation: true,
      },
      blocker: null,
    });
  }
  if (experiment.admitted_branch_count > 1) {
    return resolution(state, {
      status: 'waiting_for_experiment_specification',
      semantic_stage: 'experiment_specification',
      next_action: {
        action: 'select_experiment_assets',
        description: 'Select one admitted experiment branch; the continuation service does not choose among scientific alternatives.',
        requires_paid_authorization: false,
        requires_human_confirmation: true,
      },
      blocker: {
        code: 'AMBIGUOUS_EXPERIMENT_BRANCH',
        message: `${experiment.admitted_branch_count} admitted experiment branches are available.`,
        source: 'domain',
        retryable: true,
      },
    });
  }
  if (experiment.supported_envelope === null) {
    return resolution(state, {
      status: 'waiting_for_experiment_specification',
      semantic_stage: 'experiment_specification',
      next_action: {
        action: 'select_experiment_assets',
        description: 'Complete the exact asset lock and two-cell specification before continuing.',
        requires_paid_authorization: false,
        requires_human_confirmation: true,
      },
      blocker: null,
    });
  }
  if (!experiment.supported_envelope) {
    return resolution(state, {
      status: 'blocked',
      semantic_stage: 'experiment_specification',
      next_action: {
        action: 'resolve_blocker',
        description: 'Use the current D-19 exact two-cell envelope or implement a separately governed envelope extension.',
        requires_paid_authorization: false,
        requires_human_confirmation: false,
      },
      blocker: {
        code: 'UNSUPPORTED_EXPERIMENT_ENVELOPE',
        message: 'T-139 v1 supports only the existing D-19 dependency shape and exactly two executable cells.',
        source: 'continuation',
        retryable: false,
      },
    });
  }

  if (!experiment.run_id) {
    return resolution(state, {
      status: 'blocked',
      semantic_stage: 'experiment_materialization',
      next_action: {
        action: 'repeat_continuation',
        description: 'Allow the existing integration relay to materialize and acknowledge the admitted WorkOrder revision, then repeat this command.',
        requires_paid_authorization: false,
        requires_human_confirmation: false,
      },
      blocker: {
        code: 'EXPERIMENT_MATERIALIZATION_PENDING',
        message: 'The admitted WorkOrder revision does not yet have an acknowledged Experiment Foundation Run.',
        source: 'domain',
        retryable: true,
      },
    });
  }

  if (experiment.attempt_count === 0) {
    return resolution(state, {
      status: 'waiting_for_paid_execution_authorization',
      semantic_stage: 'paid_execution',
      next_action: {
        action: 'authorize_paid_execution',
        description: 'Authorize one real PAI execution through the existing credential-and-cost-gated API.',
        requires_paid_authorization: true,
        requires_human_confirmation: false,
      },
      blocker: null,
    });
  }
  if (experiment.active_attempt_count > 0) {
    return resolution(state, {
      status: 'waiting_for_provider_execution',
      semantic_stage: 'provider_execution',
      next_action: {
        action: 'await_provider_execution',
        description: 'Wait for the persisted real-provider Attempts to reach terminal collection state.',
        requires_paid_authorization: false,
        requires_human_confirmation: false,
      },
      blocker: null,
    });
  }
  if (experiment.successful_cell_count < experiment.cell_count) {
    return resolution(state, {
      status: 'blocked',
      semantic_stage: 'provider_execution',
      next_action: {
        action: 'resolve_blocker',
        description: 'Resolve the failed or incomplete provider cells through the existing retry/revision path.',
        requires_paid_authorization: false,
        requires_human_confirmation: false,
      },
      blocker: {
        code: 'EXPERIMENT_EXECUTION_INCOMPLETE',
        message: `${experiment.successful_cell_count}/${experiment.cell_count} experiment cells have a successful real-provider Attempt.`,
        source: 'provider',
        retryable: experiment.failed_cell_count > 0,
      },
    });
  }

  if (
    experiment.scientific_result_ids.length < experiment.cell_count
    || !experiment.scientific_validation_report_id
  ) {
    return resolution(state, {
      status: 'blocked',
      semantic_stage: 'scientific_validation',
      next_action: {
        action: 'resolve_blocker',
        description: 'Run the existing source-bound Result and scientific-validation commands for the persisted Run.',
        requires_paid_authorization: false,
        requires_human_confirmation: false,
      },
      blocker: {
        code: 'SCIENTIFIC_VALIDATION_CONTINUATION_NOT_COMPOSED',
        message: 'T-139 v1 reports this deterministic boundary but does not synthesize scientific Result inputs or validation commands.',
        source: 'continuation',
        retryable: true,
      },
    });
  }

  if (!state.closure_id || !state.result_packet_id) {
    return resolution(state, {
      status: 'blocked',
      semantic_stage: 'evidence_closure',
      next_action: {
        action: 'resolve_blocker',
        description: 'Run the existing ResultAnalysis and Closure command path; Packet materialization remains relay-owned.',
        requires_paid_authorization: false,
        requires_human_confirmation: false,
      },
      blocker: {
        code: 'EVIDENCE_CLOSURE_CONTINUATION_NOT_COMPOSED',
        message: 'T-139 v1 reports persisted scientific readiness but does not synthesize the ResultAnalysis or Closure proposal.',
        source: 'continuation',
        retryable: true,
      },
    });
  }

  if (state.claim_requires_human_confirmation) {
    return resolution(state, {
      status: 'waiting_for_human_confirmation',
      semantic_stage: 'claim_dossier',
      next_action: {
        action: 'provide_human_confirmation',
        description: 'Confirm the existing claim-boundary decision, then repeat this command.',
        requires_paid_authorization: false,
        requires_human_confirmation: true,
      },
      blocker: null,
    });
  }

  if (state.dossier_status === 'blocked') {
    return resolution(state, {
      status: 'blocked',
      semantic_stage: 'claim_dossier',
      next_action: {
        action: 'resolve_blocker',
        description: 'Resolve the persisted Dossier readiness blockers before continuing.',
        requires_paid_authorization: false,
        requires_human_confirmation: false,
      },
      blocker: {
        code: 'DOSSIER_READINESS_BLOCKED',
        message: `Dossier ${state.dossier_id ?? '(unresolved)'} is blocked by its owner readiness gate.`,
        source: 'domain',
        retryable: true,
      },
    });
  }

  return resolution(state, {
    status: 'blocked',
    semantic_stage: 'claim_dossier',
    next_action: {
      action: 'resolve_blocker',
      description: 'Run the existing claim and Dossier proposal/admission path from the persisted closed Packet.',
      requires_paid_authorization: false,
      requires_human_confirmation: false,
    },
    blocker: {
      code: 'CLAIM_DOSSIER_CONTINUATION_NOT_COMPOSED',
      message: 'T-139 v1 reports the closed Packet boundary but does not create a new generic claim/Dossier semantic lane.',
      source: 'continuation',
      retryable: true,
    },
  });
}
