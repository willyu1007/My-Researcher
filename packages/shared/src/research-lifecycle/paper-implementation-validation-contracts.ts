import {
  TOPIC_SELECTION_ACTOR_TYPES,
  topicSelectionFunctionalRefSchema,
  type TopicSelectionActorType,
  type TopicSelectionFunctionalRef,
} from './topic-selection-control-plane-contracts.js';
import type {
  ImplementationFeedbackType,
  ImplementationUpstreamAction,
  RecordImplementationFeedbackEventResponse,
} from './paper-implementation-contracts.js';
import type {
  TopicSelectionSeverity,
} from './topic-selection-recheck-risk-memory-contracts.js';

export const PAPER_IMPLEMENTATION_VALIDATION_CYCLE_TARGET_TYPES = [
  'core_motive_version',
  'motive_assertion',
  'motive_evidence_board',
  'technical_route',
  'feasibility_probe',
  'experiment_plan',
  'result_interpretation',
  'claim_candidate',
  'motive_pair',
  'motive_set',
] as const;
export type PaperImplementationValidationCycleTargetType =
  (typeof PAPER_IMPLEMENTATION_VALIDATION_CYCLE_TARGET_TYPES)[number];

export const PAPER_IMPLEMENTATION_VALIDATION_CYCLE_TYPES = [
  'motive_admission',
  'board_strengthening',
  'assertion_validation',
  'baseline_challenge',
  'route_feasibility',
  'data_feasibility',
  'probe_execution',
  'experiment_design_critique',
  'result_interpretation',
  'claim_boundary_check',
  'cross_board_conflict_check',
  'merge_feasibility_check',
  'split_feasibility_check',
] as const;
export type PaperImplementationValidationCycleType =
  (typeof PAPER_IMPLEMENTATION_VALIDATION_CYCLE_TYPES)[number];

export const PAPER_IMPLEMENTATION_VALIDATION_TRIGGER_TYPES = [
  'scheduled_review',
  'new_evidence',
  'board_gap',
  'failed_probe',
  'inconclusive_probe',
  'experiment_result',
  'baseline_update',
  'cross_board_conflict',
  'human_request',
  'upstream_recheck',
  'claim_overreach_warning',
  'loop_budget_review',
] as const;
export type PaperImplementationValidationTriggerType =
  (typeof PAPER_IMPLEMENTATION_VALIDATION_TRIGGER_TYPES)[number];

export const PAPER_IMPLEMENTATION_INFORMATION_GAIN_LEVELS = [
  'none',
  'low',
  'medium',
  'high',
] as const;
export type PaperImplementationInformationGainLevel =
  (typeof PAPER_IMPLEMENTATION_INFORMATION_GAIN_LEVELS)[number];

export const PAPER_IMPLEMENTATION_VALIDATION_CYCLE_STATUSES = [
  'proposed',
  'admitted',
  'running',
  'interpreting',
  'completed',
  'aborted',
  'superseded',
] as const;
export type PaperImplementationValidationCycleStatus =
  (typeof PAPER_IMPLEMENTATION_VALIDATION_CYCLE_STATUSES)[number];

export const PAPER_IMPLEMENTATION_VALIDATION_EXECUTION_STATUSES = [
  'not_started',
  'in_progress',
  'failed',
  'completed',
] as const;
export type PaperImplementationValidationExecutionStatus =
  (typeof PAPER_IMPLEMENTATION_VALIDATION_EXECUTION_STATUSES)[number];

export const PAPER_IMPLEMENTATION_VALIDATION_OUTCOMES = [
  'pass',
  'fail',
  'inconclusive',
  'partial',
  'blocked',
] as const;
export type PaperImplementationValidationOutcome =
  (typeof PAPER_IMPLEMENTATION_VALIDATION_OUTCOMES)[number];

export const PAPER_IMPLEMENTATION_VALIDATION_CONFIRMATION_LEVELS = [
  'not_required',
  'policy_confirmed',
  'human_reviewed',
  'human_confirmed',
] as const;
export type PaperImplementationValidationConfirmationLevel =
  (typeof PAPER_IMPLEMENTATION_VALIDATION_CONFIRMATION_LEVELS)[number];

export const PAPER_IMPLEMENTATION_ROUTE_CANDIDATE_STATUSES = [
  'proposed',
  'admitted',
  'blocked',
  'superseded',
] as const;
export type PaperImplementationRouteCandidateStatus =
  (typeof PAPER_IMPLEMENTATION_ROUTE_CANDIDATE_STATUSES)[number];

export const PAPER_IMPLEMENTATION_FEASIBILITY_PROBE_KINDS = [
  'data_feasibility',
  'route_feasibility',
  'baseline_check',
  'metric_sanity',
  'cost_probe',
] as const;
export type PaperImplementationFeasibilityProbeKind =
  (typeof PAPER_IMPLEMENTATION_FEASIBILITY_PROBE_KINDS)[number];

export const PAPER_IMPLEMENTATION_FEASIBILITY_PROBE_STATUSES = [
  'proposed',
  'admitted',
  'blocked',
  'completed',
  'superseded',
] as const;
export type PaperImplementationFeasibilityProbeStatus =
  (typeof PAPER_IMPLEMENTATION_FEASIBILITY_PROBE_STATUSES)[number];

export const PAPER_IMPLEMENTATION_EXPERIMENT_PLAN_LIGHT_RUN_MODES = [
  'dry_run',
  'exploratory',
  'confirmatory',
  'reproduction',
] as const;
export type PaperImplementationExperimentPlanLightRunMode =
  (typeof PAPER_IMPLEMENTATION_EXPERIMENT_PLAN_LIGHT_RUN_MODES)[number];

export const PAPER_IMPLEMENTATION_BASELINE_GAP_STATUSES = [
  'not_applicable',
  'open',
  'resolved',
  'accepted_risk',
] as const;
export type PaperImplementationBaselineGapStatus =
  (typeof PAPER_IMPLEMENTATION_BASELINE_GAP_STATUSES)[number];

export const PAPER_IMPLEMENTATION_VALIDATION_COST_CLASSES = [
  'low',
  'medium',
  'high',
] as const;
export type PaperImplementationValidationCostClass =
  (typeof PAPER_IMPLEMENTATION_VALIDATION_COST_CLASSES)[number];

export const PAPER_IMPLEMENTATION_VALIDATION_REVIEW_ITEM_KINDS = [
  'loop_budget_review',
  'confirmation_required',
  'planning_blocker',
  'upstream_feedback_review',
] as const;
export type PaperImplementationValidationReviewItemKind =
  (typeof PAPER_IMPLEMENTATION_VALIDATION_REVIEW_ITEM_KINDS)[number];

export const PAPER_IMPLEMENTATION_VALIDATION_REVIEW_ITEM_STATUSES = [
  'open',
  'resolved',
  'dismissed',
] as const;
export type PaperImplementationValidationReviewItemStatus =
  (typeof PAPER_IMPLEMENTATION_VALIDATION_REVIEW_ITEM_STATUSES)[number];

export const PAPER_IMPLEMENTATION_VALIDATION_FEEDBACK_CANDIDATE_STATUSES = [
  'candidate',
  'dispatched',
  'dismissed',
] as const;
export type PaperImplementationValidationFeedbackCandidateStatus =
  (typeof PAPER_IMPLEMENTATION_VALIDATION_FEEDBACK_CANDIDATE_STATUSES)[number];

export interface ValidationCycleTarget {
  target_type: PaperImplementationValidationCycleTargetType;
  target_id: string;
  target_version_id?: string | null;
}

export interface ValidationCycleTrigger {
  trigger_type: PaperImplementationValidationTriggerType;
  trigger_refs: TopicSelectionFunctionalRef[];
}

export interface ValidationCycleFrame {
  validation_question: string;
  assumptions_under_test: string[];
  assertions_under_test: TopicSelectionFunctionalRef[];
  decision_if_pass: string;
  decision_if_fail: string;
  decision_if_inconclusive: string;
  expected_information_gain: PaperImplementationInformationGainLevel;
  why_this_cycle_now: string;
}

export interface ValidationCycleIncludedRefs {
  motive_version_refs: TopicSelectionFunctionalRef[];
  board_version_refs: TopicSelectionFunctionalRef[];
  evidence_refs: TopicSelectionFunctionalRef[];
  route_refs: TopicSelectionFunctionalRef[];
  work_order_refs: TopicSelectionFunctionalRef[];
  result_packet_refs: TopicSelectionFunctionalRef[];
  experiment_plan_light_refs: TopicSelectionFunctionalRef[];
}

export interface ValidationCycleInputSnapshot {
  input_snapshot_id: string;
  implementation_project_id: string;
  context_policy_version_id?: string | null;
  included_refs: ValidationCycleIncludedRefs;
  excluded_context_notes: string[];
  input_snapshot_hash?: string | null;
  created_by: TopicSelectionActorType;
  created_at: string;
}

export interface ValidationCycleCriteria {
  pass_conditions: string[];
  fail_conditions: string[];
  inconclusive_conditions: string[];
  stop_conditions: string[];
  minimum_artifacts_required: string[];
}

export interface ValidationCycleBudget {
  budget_id: string;
  iteration_budget_id?: string | null;
  max_runtime?: string | null;
  max_compute?: string | null;
  max_human_review_count?: number | null;
  retry_budget: number;
}

export interface ValidationCycleOutputs {
  evidence_unit_refs: TopicSelectionFunctionalRef[];
  evidence_binding_refs: TopicSelectionFunctionalRef[];
  board_update_refs: TopicSelectionFunctionalRef[];
  route_update_refs: TopicSelectionFunctionalRef[];
  work_order_result_refs: TopicSelectionFunctionalRef[];
  result_interpretation_packet_refs: TopicSelectionFunctionalRef[];
  quality_signal_refs: TopicSelectionFunctionalRef[];
  recommended_evolution_decision_refs: TopicSelectionFunctionalRef[];
}

export interface ValidationCycleAssessment {
  outcome: PaperImplementationValidationOutcome;
  information_gain_realized: PaperImplementationInformationGainLevel;
  residual_uncertainties: string[];
  recommended_next_action: string;
  rationale: string;
}

export interface ValidationCycle {
  validation_cycle_id: string;
  implementation_project_id: string;
  input_snapshot_id: string;
  target: ValidationCycleTarget;
  trigger: ValidationCycleTrigger;
  cycle_type: PaperImplementationValidationCycleType;
  validation_frame: ValidationCycleFrame;
  context: ValidationCycleInputSnapshot;
  criteria: ValidationCycleCriteria;
  budget: ValidationCycleBudget;
  lifecycle_status: PaperImplementationValidationCycleStatus;
  execution_status: PaperImplementationValidationExecutionStatus;
  outputs: ValidationCycleOutputs;
  cycle_assessment?: ValidationCycleAssessment | null;
  trace_manifest_ref?: TopicSelectionFunctionalRef | null;
  trace_manifest_id?: string | null;
  gate_result_id?: string | null;
  decision_exit?: string | null;
  confirmation_level: PaperImplementationValidationConfirmationLevel;
  confirmed_by?: TopicSelectionActorType | null;
  policy_version_id?: string | null;
  source_proposal_artifact_ref?: TopicSelectionFunctionalRef | null;
  source_proposal_artifact_hash?: string | null;
  created_by: TopicSelectionActorType;
  created_at: string;
  updated_at: string;
  admitted_at?: string | null;
  completed_at?: string | null;
}

export interface TechnicalRouteCandidate {
  route_candidate_id: string;
  implementation_project_id: string;
  validation_cycle_id?: string | null;
  motive_id?: string | null;
  core_motive_version_id: string;
  route_summary: string;
  route_status: PaperImplementationRouteCandidateStatus;
  expected_information_gain: PaperImplementationInformationGainLevel;
  baseline_gap_status: PaperImplementationBaselineGapStatus;
  scope_boundary_ref?: TopicSelectionFunctionalRef | null;
  primary_metric_refs: TopicSelectionFunctionalRef[];
  secondary_metric_refs: TopicSelectionFunctionalRef[];
  dataset_version_refs: TopicSelectionFunctionalRef[];
  baseline_version_refs: TopicSelectionFunctionalRef[];
  code_version_refs: TopicSelectionFunctionalRef[];
  config_refs: TopicSelectionFunctionalRef[];
  confirmatory_marker: boolean;
  trace_manifest_ref: TopicSelectionFunctionalRef;
  trace_manifest_id: string;
  source_proposal_artifact_ref?: TopicSelectionFunctionalRef | null;
  source_proposal_artifact_hash?: string | null;
  created_by: TopicSelectionActorType;
  created_at: string;
}

export interface FeasibilityProbe {
  probe_id: string;
  implementation_project_id: string;
  validation_cycle_id?: string | null;
  probe_kind: PaperImplementationFeasibilityProbeKind;
  probe_question: string;
  probe_status: PaperImplementationFeasibilityProbeStatus;
  expected_information_gain: PaperImplementationInformationGainLevel;
  baseline_gap_status: PaperImplementationBaselineGapStatus;
  scope_boundary_ref?: TopicSelectionFunctionalRef | null;
  primary_metric_refs: TopicSelectionFunctionalRef[];
  secondary_metric_refs: TopicSelectionFunctionalRef[];
  dataset_version_refs: TopicSelectionFunctionalRef[];
  baseline_version_refs: TopicSelectionFunctionalRef[];
  code_version_refs: TopicSelectionFunctionalRef[];
  config_refs: TopicSelectionFunctionalRef[];
  confirmatory_marker: boolean;
  trace_manifest_ref: TopicSelectionFunctionalRef;
  trace_manifest_id: string;
  source_proposal_artifact_ref?: TopicSelectionFunctionalRef | null;
  source_proposal_artifact_hash?: string | null;
  created_by: TopicSelectionActorType;
  created_at: string;
}

export interface ExperimentPlanLight {
  experiment_plan_light_id: string;
  implementation_project_id: string;
  validation_cycle_id?: string | null;
  route_candidate_id?: string | null;
  run_mode: PaperImplementationExperimentPlanLightRunMode;
  plan_summary: string;
  estimated_cost_class: PaperImplementationValidationCostClass;
  baseline_gap_status: PaperImplementationBaselineGapStatus;
  primary_metric_refs: TopicSelectionFunctionalRef[];
  secondary_metric_refs: TopicSelectionFunctionalRef[];
  dataset_version_refs: TopicSelectionFunctionalRef[];
  baseline_version_refs: TopicSelectionFunctionalRef[];
  code_version_refs: TopicSelectionFunctionalRef[];
  config_refs: TopicSelectionFunctionalRef[];
  confirmatory_marker: boolean;
  scope_boundary_ref?: TopicSelectionFunctionalRef | null;
  budget_id: string;
  stop_condition_refs: TopicSelectionFunctionalRef[];
  trace_manifest_ref: TopicSelectionFunctionalRef;
  trace_manifest_id: string;
  source_proposal_artifact_ref?: TopicSelectionFunctionalRef | null;
  source_proposal_artifact_hash?: string | null;
  created_by: TopicSelectionActorType;
  created_at: string;
}

export interface ValidationPlanningReviewItem {
  review_item_id: string;
  implementation_project_id: string;
  validation_cycle_id?: string | null;
  item_kind: PaperImplementationValidationReviewItemKind;
  status: PaperImplementationValidationReviewItemStatus;
  severity: TopicSelectionSeverity;
  blocker_code?: string | null;
  summary: string;
  source_refs: TopicSelectionFunctionalRef[];
  created_at: string;
  resolved_at?: string | null;
}

export interface ValidationUpstreamFeedbackCandidate {
  candidate_id: string;
  implementation_project_id: string;
  validation_cycle_id?: string | null;
  source_object_refs: TopicSelectionFunctionalRef[];
  evidence_refs: TopicSelectionFunctionalRef[];
  feedback_type: ImplementationFeedbackType;
  severity: TopicSelectionSeverity;
  summary: string;
  recommended_upstream_action: ImplementationUpstreamAction;
  candidate_status: PaperImplementationValidationFeedbackCandidateStatus;
  feedback_event_ref?: TopicSelectionFunctionalRef | null;
  created_by: TopicSelectionActorType;
  created_at: string;
  dispatched_at?: string | null;
}

export interface CreateValidationCycleDraftRequest {
  validation_cycle_id?: string;
  target: ValidationCycleTarget;
  trigger: ValidationCycleTrigger;
  cycle_type: PaperImplementationValidationCycleType;
  validation_frame: ValidationCycleFrame;
  context?: Partial<ValidationCycleInputSnapshot>;
  criteria: ValidationCycleCriteria;
  budget: ValidationCycleBudget;
  confirmation_level?: PaperImplementationValidationConfirmationLevel;
  confirmed_by?: TopicSelectionActorType | null;
  human_override_expected_information_gain_none?: boolean;
  policy_version_id?: string | null;
  source_proposal_artifact_ref?: TopicSelectionFunctionalRef | null;
  source_proposal_artifact_hash?: string | null;
  created_by?: TopicSelectionActorType;
}

export interface AdmitValidationCycleRequest {
  trace_manifest_id: string;
  gate_result_id?: string | null;
  confirmation_level?: PaperImplementationValidationConfirmationLevel;
  confirmed_by?: TopicSelectionActorType | null;
  human_override_expected_information_gain_none?: boolean;
  created_by?: TopicSelectionActorType;
}

export interface CompleteValidationCycleRequest {
  created_by?: TopicSelectionActorType;
}

export interface CreateTechnicalRouteCandidateRequest {
  route_candidate_id?: string;
  validation_cycle_id?: string | null;
  motive_id?: string | null;
  core_motive_version_id: string;
  route_summary: string;
  route_status?: PaperImplementationRouteCandidateStatus;
  expected_information_gain: PaperImplementationInformationGainLevel;
  baseline_gap_status?: PaperImplementationBaselineGapStatus;
  scope_boundary_ref?: TopicSelectionFunctionalRef | null;
  primary_metric_refs: TopicSelectionFunctionalRef[];
  secondary_metric_refs?: TopicSelectionFunctionalRef[];
  dataset_version_refs?: TopicSelectionFunctionalRef[];
  baseline_version_refs?: TopicSelectionFunctionalRef[];
  code_version_refs?: TopicSelectionFunctionalRef[];
  config_refs?: TopicSelectionFunctionalRef[];
  confirmatory_marker?: boolean;
  trace_manifest_id: string;
  source_proposal_artifact_ref?: TopicSelectionFunctionalRef | null;
  source_proposal_artifact_hash?: string | null;
  created_by?: TopicSelectionActorType;
}

export interface CreateFeasibilityProbeRequest {
  probe_id?: string;
  validation_cycle_id?: string | null;
  probe_kind: PaperImplementationFeasibilityProbeKind;
  probe_question: string;
  probe_status?: PaperImplementationFeasibilityProbeStatus;
  expected_information_gain: PaperImplementationInformationGainLevel;
  baseline_gap_status?: PaperImplementationBaselineGapStatus;
  scope_boundary_ref?: TopicSelectionFunctionalRef | null;
  primary_metric_refs?: TopicSelectionFunctionalRef[];
  secondary_metric_refs?: TopicSelectionFunctionalRef[];
  dataset_version_refs?: TopicSelectionFunctionalRef[];
  baseline_version_refs?: TopicSelectionFunctionalRef[];
  code_version_refs?: TopicSelectionFunctionalRef[];
  config_refs?: TopicSelectionFunctionalRef[];
  confirmatory_marker?: boolean;
  trace_manifest_id: string;
  source_proposal_artifact_ref?: TopicSelectionFunctionalRef | null;
  source_proposal_artifact_hash?: string | null;
  created_by?: TopicSelectionActorType;
}

export interface CreateExperimentPlanLightRequest {
  experiment_plan_light_id?: string;
  validation_cycle_id?: string | null;
  route_candidate_id?: string | null;
  run_mode: PaperImplementationExperimentPlanLightRunMode;
  plan_summary: string;
  estimated_cost_class: PaperImplementationValidationCostClass;
  baseline_gap_status: PaperImplementationBaselineGapStatus;
  primary_metric_refs: TopicSelectionFunctionalRef[];
  secondary_metric_refs?: TopicSelectionFunctionalRef[];
  dataset_version_refs: TopicSelectionFunctionalRef[];
  baseline_version_refs?: TopicSelectionFunctionalRef[];
  code_version_refs: TopicSelectionFunctionalRef[];
  config_refs: TopicSelectionFunctionalRef[];
  confirmatory_marker?: boolean;
  scope_boundary_ref?: TopicSelectionFunctionalRef | null;
  budget_id: string;
  stop_condition_refs: TopicSelectionFunctionalRef[];
  trace_manifest_id: string;
  source_proposal_artifact_ref?: TopicSelectionFunctionalRef | null;
  source_proposal_artifact_hash?: string | null;
  created_by?: TopicSelectionActorType;
}

export interface CreateValidationUpstreamFeedbackCandidateRequest {
  candidate_id?: string;
  validation_cycle_id?: string | null;
  source_object_refs: TopicSelectionFunctionalRef[];
  evidence_refs?: TopicSelectionFunctionalRef[];
  feedback_type: ImplementationFeedbackType;
  severity: TopicSelectionSeverity;
  summary: string;
  recommended_upstream_action?: ImplementationUpstreamAction;
  created_by?: TopicSelectionActorType;
}

export interface DispatchValidationUpstreamFeedbackCandidateRequest {
  required_action?: string | null;
  created_by?: TopicSelectionActorType;
}

export interface DispatchValidationUpstreamFeedbackCandidateResponse {
  feedback_candidate: ValidationUpstreamFeedbackCandidate;
  feedback_dispatch: RecordImplementationFeedbackEventResponse;
}

const stringId = { type: 'string', minLength: 1 } as const;
const nullableStringId = { anyOf: [stringId, { type: 'null' }] } as const;
const actorTypeSchema = { enum: [...TOPIC_SELECTION_ACTOR_TYPES] } as const;
const actorTypeNullableSchema = { anyOf: [actorTypeSchema, { type: 'null' }] } as const;
const functionalRefArray = { type: 'array', items: topicSelectionFunctionalRefSchema } as const;
const nullableFunctionalRef = { anyOf: [topicSelectionFunctionalRefSchema, { type: 'null' }] } as const;
const stringArray = { type: 'array', items: stringId } as const;
const objectPayload = { type: 'object', additionalProperties: true } as const;
const severitySchema = { enum: ['info', 'warning', 'blocking', 'critical'] } as const;

const targetTypeSchema = { enum: [...PAPER_IMPLEMENTATION_VALIDATION_CYCLE_TARGET_TYPES] } as const;
const cycleTypeSchema = { enum: [...PAPER_IMPLEMENTATION_VALIDATION_CYCLE_TYPES] } as const;
const triggerTypeSchema = { enum: [...PAPER_IMPLEMENTATION_VALIDATION_TRIGGER_TYPES] } as const;
const informationGainSchema = { enum: [...PAPER_IMPLEMENTATION_INFORMATION_GAIN_LEVELS] } as const;
const cycleStatusSchema = { enum: [...PAPER_IMPLEMENTATION_VALIDATION_CYCLE_STATUSES] } as const;
const executionStatusSchema = { enum: [...PAPER_IMPLEMENTATION_VALIDATION_EXECUTION_STATUSES] } as const;
const outcomeSchema = { enum: [...PAPER_IMPLEMENTATION_VALIDATION_OUTCOMES] } as const;
const confirmationLevelSchema = { enum: [...PAPER_IMPLEMENTATION_VALIDATION_CONFIRMATION_LEVELS] } as const;
const routeStatusSchema = { enum: [...PAPER_IMPLEMENTATION_ROUTE_CANDIDATE_STATUSES] } as const;
const probeKindSchema = { enum: [...PAPER_IMPLEMENTATION_FEASIBILITY_PROBE_KINDS] } as const;
const probeStatusSchema = { enum: [...PAPER_IMPLEMENTATION_FEASIBILITY_PROBE_STATUSES] } as const;
const runModeSchema = { enum: [...PAPER_IMPLEMENTATION_EXPERIMENT_PLAN_LIGHT_RUN_MODES] } as const;
const baselineGapStatusSchema = { enum: [...PAPER_IMPLEMENTATION_BASELINE_GAP_STATUSES] } as const;
const costClassSchema = { enum: [...PAPER_IMPLEMENTATION_VALIDATION_COST_CLASSES] } as const;
const reviewItemKindSchema = { enum: [...PAPER_IMPLEMENTATION_VALIDATION_REVIEW_ITEM_KINDS] } as const;
const reviewItemStatusSchema = { enum: [...PAPER_IMPLEMENTATION_VALIDATION_REVIEW_ITEM_STATUSES] } as const;
const feedbackCandidateStatusSchema = {
  enum: [...PAPER_IMPLEMENTATION_VALIDATION_FEEDBACK_CANDIDATE_STATUSES],
} as const;
const feedbackTypeSchema = {
  enum: [
    'infeasible_route',
    'unavailable_data',
    'invalidated_evidence',
    'lower_claim_ceiling',
    'topic_question_not_answerable',
    'research_slice_too_broad',
  ],
} as const;
const upstreamActionSchema = { enum: ['recheck_topic_selection', 'refresh_intake', 'none'] } as const;

export const validationCycleTargetSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['target_type', 'target_id'],
  properties: {
    target_type: targetTypeSchema,
    target_id: stringId,
    target_version_id: nullableStringId,
  },
} as const;

export const validationCycleTriggerSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['trigger_type', 'trigger_refs'],
  properties: {
    trigger_type: triggerTypeSchema,
    trigger_refs: functionalRefArray,
  },
} as const;

export const validationCycleFrameSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'validation_question',
    'assumptions_under_test',
    'assertions_under_test',
    'decision_if_pass',
    'decision_if_fail',
    'decision_if_inconclusive',
    'expected_information_gain',
    'why_this_cycle_now',
  ],
  properties: {
    validation_question: stringId,
    assumptions_under_test: { type: 'array', minItems: 1, items: stringId },
    assertions_under_test: { type: 'array', minItems: 1, items: topicSelectionFunctionalRefSchema },
    decision_if_pass: stringId,
    decision_if_fail: stringId,
    decision_if_inconclusive: stringId,
    expected_information_gain: informationGainSchema,
    why_this_cycle_now: stringId,
  },
} as const;

export const validationCycleIncludedRefsSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'motive_version_refs',
    'board_version_refs',
    'evidence_refs',
    'route_refs',
    'work_order_refs',
    'result_packet_refs',
    'experiment_plan_light_refs',
  ],
  properties: {
    motive_version_refs: functionalRefArray,
    board_version_refs: functionalRefArray,
    evidence_refs: functionalRefArray,
    route_refs: functionalRefArray,
    work_order_refs: functionalRefArray,
    result_packet_refs: functionalRefArray,
    experiment_plan_light_refs: functionalRefArray,
  },
} as const;

export const validationCycleInputSnapshotSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'input_snapshot_id',
    'implementation_project_id',
    'included_refs',
    'excluded_context_notes',
    'created_by',
    'created_at',
  ],
  properties: {
    input_snapshot_id: stringId,
    implementation_project_id: stringId,
    context_policy_version_id: nullableStringId,
    included_refs: validationCycleIncludedRefsSchema,
    excluded_context_notes: stringArray,
    input_snapshot_hash: nullableStringId,
    created_by: actorTypeSchema,
    created_at: stringId,
  },
} as const;

export const validationCycleCriteriaSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'pass_conditions',
    'fail_conditions',
    'inconclusive_conditions',
    'stop_conditions',
    'minimum_artifacts_required',
  ],
  properties: {
    pass_conditions: { type: 'array', minItems: 1, items: stringId },
    fail_conditions: { type: 'array', minItems: 1, items: stringId },
    inconclusive_conditions: { type: 'array', minItems: 1, items: stringId },
    stop_conditions: { type: 'array', minItems: 1, items: stringId },
    minimum_artifacts_required: { type: 'array', minItems: 1, items: stringId },
  },
} as const;

export const validationCycleBudgetSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['budget_id', 'retry_budget'],
  properties: {
    budget_id: stringId,
    iteration_budget_id: nullableStringId,
    max_runtime: nullableStringId,
    max_compute: nullableStringId,
    max_human_review_count: { anyOf: [{ type: 'integer', minimum: 0 }, { type: 'null' }] },
    retry_budget: { type: 'integer', minimum: 0 },
  },
} as const;

export const validationCycleOutputsSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'evidence_unit_refs',
    'evidence_binding_refs',
    'board_update_refs',
    'route_update_refs',
    'work_order_result_refs',
    'result_interpretation_packet_refs',
    'quality_signal_refs',
    'recommended_evolution_decision_refs',
  ],
  properties: {
    evidence_unit_refs: functionalRefArray,
    evidence_binding_refs: functionalRefArray,
    board_update_refs: functionalRefArray,
    route_update_refs: functionalRefArray,
    work_order_result_refs: functionalRefArray,
    result_interpretation_packet_refs: functionalRefArray,
    quality_signal_refs: functionalRefArray,
    recommended_evolution_decision_refs: functionalRefArray,
  },
} as const;

export const validationCycleAssessmentSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'outcome',
    'information_gain_realized',
    'residual_uncertainties',
    'recommended_next_action',
    'rationale',
  ],
  properties: {
    outcome: outcomeSchema,
    information_gain_realized: informationGainSchema,
    residual_uncertainties: stringArray,
    recommended_next_action: stringId,
    rationale: stringId,
  },
} as const;

export const createValidationCycleDraftRequestSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['target', 'trigger', 'cycle_type', 'validation_frame', 'criteria', 'budget'],
  properties: {
    validation_cycle_id: stringId,
    target: validationCycleTargetSchema,
    trigger: validationCycleTriggerSchema,
    cycle_type: cycleTypeSchema,
    validation_frame: validationCycleFrameSchema,
    context: objectPayload,
    criteria: validationCycleCriteriaSchema,
    budget: validationCycleBudgetSchema,
    confirmation_level: confirmationLevelSchema,
    confirmed_by: actorTypeNullableSchema,
    human_override_expected_information_gain_none: { type: 'boolean' },
    policy_version_id: nullableStringId,
    source_proposal_artifact_ref: nullableFunctionalRef,
    source_proposal_artifact_hash: nullableStringId,
    created_by: actorTypeSchema,
  },
  allOf: [
    {
      if: {
        type: 'object',
        properties: {
          validation_frame: {
            type: 'object',
            properties: {
              expected_information_gain: { const: 'none' },
            },
            required: ['expected_information_gain'],
          },
        },
        required: ['validation_frame'],
      },
      then: {
        required: ['human_override_expected_information_gain_none', 'confirmation_level'],
        properties: {
          human_override_expected_information_gain_none: { const: true },
          confirmation_level: { const: 'human_confirmed' },
        },
      },
    },
  ],
} as const;

export const admitValidationCycleRequestSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['trace_manifest_id'],
  properties: {
    trace_manifest_id: stringId,
    gate_result_id: nullableStringId,
    confirmation_level: confirmationLevelSchema,
    confirmed_by: actorTypeNullableSchema,
    human_override_expected_information_gain_none: { type: 'boolean' },
    created_by: actorTypeSchema,
  },
} as const;

export const completeValidationCycleRequestSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    created_by: actorTypeSchema,
  },
} as const;

export const validationCycleSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'validation_cycle_id',
    'implementation_project_id',
    'input_snapshot_id',
    'target',
    'trigger',
    'cycle_type',
    'validation_frame',
    'context',
    'criteria',
    'budget',
    'lifecycle_status',
    'execution_status',
    'outputs',
    'confirmation_level',
    'created_by',
    'created_at',
    'updated_at',
  ],
  properties: {
    validation_cycle_id: stringId,
    implementation_project_id: stringId,
    input_snapshot_id: stringId,
    target: validationCycleTargetSchema,
    trigger: validationCycleTriggerSchema,
    cycle_type: cycleTypeSchema,
    validation_frame: validationCycleFrameSchema,
    context: validationCycleInputSnapshotSchema,
    criteria: validationCycleCriteriaSchema,
    budget: validationCycleBudgetSchema,
    lifecycle_status: cycleStatusSchema,
    execution_status: executionStatusSchema,
    outputs: validationCycleOutputsSchema,
    cycle_assessment: { anyOf: [validationCycleAssessmentSchema, { type: 'null' }] },
    trace_manifest_ref: nullableFunctionalRef,
    trace_manifest_id: nullableStringId,
    gate_result_id: nullableStringId,
    decision_exit: nullableStringId,
    confirmation_level: confirmationLevelSchema,
    confirmed_by: actorTypeNullableSchema,
    policy_version_id: nullableStringId,
    source_proposal_artifact_ref: nullableFunctionalRef,
    source_proposal_artifact_hash: nullableStringId,
    created_by: actorTypeSchema,
    created_at: stringId,
    updated_at: stringId,
    admitted_at: nullableStringId,
    completed_at: nullableStringId,
  },
} as const;

const planningRefsSchema = {
  primary_metric_refs: { type: 'array', minItems: 1, items: topicSelectionFunctionalRefSchema },
  secondary_metric_refs: functionalRefArray,
  dataset_version_refs: functionalRefArray,
  baseline_version_refs: functionalRefArray,
  code_version_refs: functionalRefArray,
  config_refs: functionalRefArray,
} as const;

export const createTechnicalRouteCandidateRequestSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'core_motive_version_id',
    'route_summary',
    'expected_information_gain',
    'primary_metric_refs',
    'trace_manifest_id',
  ],
  properties: {
    route_candidate_id: stringId,
    validation_cycle_id: nullableStringId,
    motive_id: nullableStringId,
    core_motive_version_id: stringId,
    route_summary: stringId,
    route_status: routeStatusSchema,
    expected_information_gain: informationGainSchema,
    baseline_gap_status: baselineGapStatusSchema,
    scope_boundary_ref: nullableFunctionalRef,
    ...planningRefsSchema,
    confirmatory_marker: { type: 'boolean' },
    trace_manifest_id: stringId,
    source_proposal_artifact_ref: nullableFunctionalRef,
    source_proposal_artifact_hash: nullableStringId,
    created_by: actorTypeSchema,
  },
} as const;

export const createFeasibilityProbeRequestSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['probe_kind', 'probe_question', 'expected_information_gain', 'trace_manifest_id'],
  properties: {
    probe_id: stringId,
    validation_cycle_id: nullableStringId,
    probe_kind: probeKindSchema,
    probe_question: stringId,
    probe_status: probeStatusSchema,
    expected_information_gain: informationGainSchema,
    baseline_gap_status: baselineGapStatusSchema,
    scope_boundary_ref: nullableFunctionalRef,
    ...planningRefsSchema,
    confirmatory_marker: { type: 'boolean' },
    trace_manifest_id: stringId,
    source_proposal_artifact_ref: nullableFunctionalRef,
    source_proposal_artifact_hash: nullableStringId,
    created_by: actorTypeSchema,
  },
} as const;

export const createExperimentPlanLightRequestSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'run_mode',
    'plan_summary',
    'estimated_cost_class',
    'baseline_gap_status',
    'primary_metric_refs',
    'dataset_version_refs',
    'code_version_refs',
    'config_refs',
    'budget_id',
    'stop_condition_refs',
    'trace_manifest_id',
  ],
  properties: {
    experiment_plan_light_id: stringId,
    validation_cycle_id: nullableStringId,
    route_candidate_id: nullableStringId,
    run_mode: runModeSchema,
    plan_summary: stringId,
    estimated_cost_class: costClassSchema,
    baseline_gap_status: baselineGapStatusSchema,
    scope_boundary_ref: nullableFunctionalRef,
    ...planningRefsSchema,
    dataset_version_refs: { type: 'array', minItems: 1, items: topicSelectionFunctionalRefSchema },
    code_version_refs: { type: 'array', minItems: 1, items: topicSelectionFunctionalRefSchema },
    config_refs: { type: 'array', minItems: 1, items: topicSelectionFunctionalRefSchema },
    confirmatory_marker: { type: 'boolean' },
    budget_id: stringId,
    stop_condition_refs: { type: 'array', minItems: 1, items: topicSelectionFunctionalRefSchema },
    trace_manifest_id: stringId,
    source_proposal_artifact_ref: nullableFunctionalRef,
    source_proposal_artifact_hash: nullableStringId,
    created_by: actorTypeSchema,
  },
} as const;

export const technicalRouteCandidateSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'route_candidate_id',
    'implementation_project_id',
    'core_motive_version_id',
    'route_summary',
    'route_status',
    'expected_information_gain',
    'baseline_gap_status',
    'primary_metric_refs',
    'secondary_metric_refs',
    'dataset_version_refs',
    'baseline_version_refs',
    'code_version_refs',
    'config_refs',
    'confirmatory_marker',
    'trace_manifest_ref',
    'trace_manifest_id',
    'created_by',
    'created_at',
  ],
  properties: {
    route_candidate_id: stringId,
    implementation_project_id: stringId,
    validation_cycle_id: nullableStringId,
    motive_id: nullableStringId,
    core_motive_version_id: stringId,
    route_summary: stringId,
    route_status: routeStatusSchema,
    expected_information_gain: informationGainSchema,
    baseline_gap_status: baselineGapStatusSchema,
    scope_boundary_ref: nullableFunctionalRef,
    ...planningRefsSchema,
    confirmatory_marker: { type: 'boolean' },
    trace_manifest_ref: topicSelectionFunctionalRefSchema,
    trace_manifest_id: stringId,
    source_proposal_artifact_ref: nullableFunctionalRef,
    source_proposal_artifact_hash: nullableStringId,
    created_by: actorTypeSchema,
    created_at: stringId,
  },
} as const;

export const feasibilityProbeSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'probe_id',
    'implementation_project_id',
    'probe_kind',
    'probe_question',
    'probe_status',
    'expected_information_gain',
    'baseline_gap_status',
    'primary_metric_refs',
    'secondary_metric_refs',
    'dataset_version_refs',
    'baseline_version_refs',
    'code_version_refs',
    'config_refs',
    'confirmatory_marker',
    'trace_manifest_ref',
    'trace_manifest_id',
    'created_by',
    'created_at',
  ],
  properties: {
    probe_id: stringId,
    implementation_project_id: stringId,
    validation_cycle_id: nullableStringId,
    probe_kind: probeKindSchema,
    probe_question: stringId,
    probe_status: probeStatusSchema,
    expected_information_gain: informationGainSchema,
    baseline_gap_status: baselineGapStatusSchema,
    scope_boundary_ref: nullableFunctionalRef,
    ...planningRefsSchema,
    confirmatory_marker: { type: 'boolean' },
    trace_manifest_ref: topicSelectionFunctionalRefSchema,
    trace_manifest_id: stringId,
    source_proposal_artifact_ref: nullableFunctionalRef,
    source_proposal_artifact_hash: nullableStringId,
    created_by: actorTypeSchema,
    created_at: stringId,
  },
} as const;

export const experimentPlanLightSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'experiment_plan_light_id',
    'implementation_project_id',
    'run_mode',
    'plan_summary',
    'estimated_cost_class',
    'baseline_gap_status',
    'primary_metric_refs',
    'secondary_metric_refs',
    'dataset_version_refs',
    'baseline_version_refs',
    'code_version_refs',
    'config_refs',
    'confirmatory_marker',
    'budget_id',
    'stop_condition_refs',
    'trace_manifest_ref',
    'trace_manifest_id',
    'created_by',
    'created_at',
  ],
  properties: {
    experiment_plan_light_id: stringId,
    implementation_project_id: stringId,
    validation_cycle_id: nullableStringId,
    route_candidate_id: nullableStringId,
    run_mode: runModeSchema,
    plan_summary: stringId,
    estimated_cost_class: costClassSchema,
    baseline_gap_status: baselineGapStatusSchema,
    scope_boundary_ref: nullableFunctionalRef,
    ...planningRefsSchema,
    confirmatory_marker: { type: 'boolean' },
    budget_id: stringId,
    stop_condition_refs: functionalRefArray,
    trace_manifest_ref: topicSelectionFunctionalRefSchema,
    trace_manifest_id: stringId,
    source_proposal_artifact_ref: nullableFunctionalRef,
    source_proposal_artifact_hash: nullableStringId,
    created_by: actorTypeSchema,
    created_at: stringId,
  },
} as const;

export const validationPlanningReviewItemSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'review_item_id',
    'implementation_project_id',
    'item_kind',
    'status',
    'severity',
    'summary',
    'source_refs',
    'created_at',
  ],
  properties: {
    review_item_id: stringId,
    implementation_project_id: stringId,
    validation_cycle_id: nullableStringId,
    item_kind: reviewItemKindSchema,
    status: reviewItemStatusSchema,
    severity: severitySchema,
    blocker_code: nullableStringId,
    summary: stringId,
    source_refs: functionalRefArray,
    created_at: stringId,
    resolved_at: nullableStringId,
  },
} as const;

export const createValidationUpstreamFeedbackCandidateRequestSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['source_object_refs', 'feedback_type', 'severity', 'summary'],
  properties: {
    candidate_id: stringId,
    validation_cycle_id: nullableStringId,
    source_object_refs: { type: 'array', minItems: 1, items: topicSelectionFunctionalRefSchema },
    evidence_refs: functionalRefArray,
    feedback_type: feedbackTypeSchema,
    severity: severitySchema,
    summary: stringId,
    recommended_upstream_action: upstreamActionSchema,
    created_by: actorTypeSchema,
  },
} as const;

export const validationUpstreamFeedbackCandidateSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'candidate_id',
    'implementation_project_id',
    'source_object_refs',
    'evidence_refs',
    'feedback_type',
    'severity',
    'summary',
    'recommended_upstream_action',
    'candidate_status',
    'created_by',
    'created_at',
  ],
  properties: {
    candidate_id: stringId,
    implementation_project_id: stringId,
    validation_cycle_id: nullableStringId,
    source_object_refs: functionalRefArray,
    evidence_refs: functionalRefArray,
    feedback_type: feedbackTypeSchema,
    severity: severitySchema,
    summary: stringId,
    recommended_upstream_action: upstreamActionSchema,
    candidate_status: feedbackCandidateStatusSchema,
    feedback_event_ref: nullableFunctionalRef,
    created_by: actorTypeSchema,
    created_at: stringId,
    dispatched_at: nullableStringId,
  },
} as const;

export const dispatchValidationUpstreamFeedbackCandidateRequestSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    required_action: nullableStringId,
    created_by: actorTypeSchema,
  },
} as const;

export const dispatchValidationUpstreamFeedbackCandidateResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['feedback_candidate', 'feedback_dispatch'],
  properties: {
    feedback_candidate: validationUpstreamFeedbackCandidateSchema,
    feedback_dispatch: objectPayload,
  },
} as const;

export const listValidationCyclesResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['items'],
  properties: { items: { type: 'array', items: validationCycleSchema } },
} as const;

export const listValidationPlanningReviewItemsResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['items'],
  properties: { items: { type: 'array', items: validationPlanningReviewItemSchema } },
} as const;
