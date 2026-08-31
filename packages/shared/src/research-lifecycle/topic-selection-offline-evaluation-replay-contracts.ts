import {
  TOPIC_SELECTION_ACTOR_TYPES,
  topicSelectionFunctionalRefSchema,
  type TopicSelectionActorType,
  type TopicSelectionFunctionalRef,
} from './topic-selection-control-plane-contracts.js';
import {
  TOPIC_SELECTION_NEED_ADJUDICATION_DECISIONS,
  TOPIC_SELECTION_NEED_READINESS_RECOMMENDATIONS,
  type TopicSelectionNeedAdjudicationDecision,
  type TopicSelectionNeedReadinessRecommendation,
} from './topic-selection-need-validation-contracts.js';
import {
  TOPIC_SELECTION_DOWNSTREAM_LOOPBACK_CAUSES,
  TOPIC_SELECTION_DOWNSTREAM_LOOPBACK_TARGETS,
  type TopicSelectionDownstreamLoopbackCause,
  type TopicSelectionDownstreamLoopbackTarget,
} from './topic-selection-v1c-downstream-feedback-recheck-contracts.js';
import {
  TOPIC_SELECTION_HUMAN_PROMOTION_DECISIONS,
  type TopicSelectionHumanPromotionDecisionKind,
} from './topic-selection-v1c-human-promotion-decision-contracts.js';
import {
  TOPIC_SELECTION_PROMOTION_GATE_DISPOSITIONS,
  type TopicSelectionPromotionGateDisposition,
} from './topic-selection-v1c-promotion-gate-contracts.js';
import {
  TOPIC_SELECTION_PROMOTION_INPUT_SNAPSHOT_CLOSURE_STATUSES,
  type TopicSelectionPromotionInputSnapshotClosureStatus,
} from './topic-selection-v1c-promotion-input-contracts.js';

export const TOPIC_SELECTION_OFFLINE_EVALUATION_STAGES = [
  'v1a',
  'v1b',
  'v1c',
  'research_arena',
] as const;
export type TopicSelectionOfflineEvaluationStage =
  (typeof TOPIC_SELECTION_OFFLINE_EVALUATION_STAGES)[number];

export const TOPIC_SELECTION_V1A_OFFLINE_EVALUATION_CASE_TYPES = [
  'true_unmet_need',
  'pseudo_gap',
  'strong_baseline_solved',
  'author_future_work_misleading',
  'abstract_overclaim_body_unsupported',
  'terminology_shift_same_task',
  'same_team_duplicate_claim',
  'source_health_or_missing_fulltext',
  'downstream_failure_feedback',
] as const;

export const TOPIC_SELECTION_V1B_OFFLINE_EVALUATION_CASE_TYPES = [
  'slice_boundary_drift',
  'answerability_false_pass',
  'value_overclaim',
  'package_trace_gap',
  'package_readiness_false_pass',
  'downstream_loopback_feedback',
] as const;

export const TOPIC_SELECTION_V1C_OFFLINE_EVALUATION_CASE_TYPES = [
  'promotion_input_staleness_false_pass',
  'promotion_gate_blocker_false_pass',
  'human_promotion_bypass',
  'promotion_false_pass',
  'bridge_trace_gap',
  'commitment_profile_gap',
  'loopback_target_misroute',
  'downstream_mutation_attempt',
] as const;

export const TOPIC_SELECTION_RESEARCH_ARENA_OFFLINE_EVALUATION_CASE_TYPES = [
  'arena_dominance_pair',
  'arena_causal_perturbation',
  'arena_irrelevant_perturbation',
  'arena_successful_non_advance',
  'arena_advancing_case',
] as const;

export const TOPIC_SELECTION_OFFLINE_EVALUATION_CASE_TYPES = [
  ...TOPIC_SELECTION_V1A_OFFLINE_EVALUATION_CASE_TYPES,
  ...TOPIC_SELECTION_V1B_OFFLINE_EVALUATION_CASE_TYPES,
  ...TOPIC_SELECTION_V1C_OFFLINE_EVALUATION_CASE_TYPES,
  ...TOPIC_SELECTION_RESEARCH_ARENA_OFFLINE_EVALUATION_CASE_TYPES,
] as const;
export type TopicSelectionOfflineEvaluationCaseType =
  (typeof TOPIC_SELECTION_OFFLINE_EVALUATION_CASE_TYPES)[number];

export const TOPIC_SELECTION_OFFLINE_EVALUATION_DATASET_STATUSES = [
  'draft',
  'active',
  'archived',
] as const;
export type TopicSelectionOfflineEvaluationDatasetStatus =
  (typeof TOPIC_SELECTION_OFFLINE_EVALUATION_DATASET_STATUSES)[number];

export const TOPIC_SELECTION_OFFLINE_EVALUATION_DATASET_SOURCES = [
  'synthetic_fixture',
  'frozen_snapshot',
  'mixed',
] as const;
export type TopicSelectionOfflineEvaluationDatasetSource =
  (typeof TOPIC_SELECTION_OFFLINE_EVALUATION_DATASET_SOURCES)[number];

export const TOPIC_SELECTION_OFFLINE_EVALUATION_CASE_STATUSES = [
  'active',
  'retired',
] as const;
export type TopicSelectionOfflineEvaluationCaseStatus =
  (typeof TOPIC_SELECTION_OFFLINE_EVALUATION_CASE_STATUSES)[number];

export const TOPIC_SELECTION_OFFLINE_EVALUATION_RUN_STATUSES = [
  'running',
  'completed',
  'failed',
  'cancelled',
] as const;
export type TopicSelectionOfflineEvaluationRunStatus =
  (typeof TOPIC_SELECTION_OFFLINE_EVALUATION_RUN_STATUSES)[number];

export const TOPIC_SELECTION_OFFLINE_EVALUATION_CASE_RESULT_STATUSES = [
  'recorded',
  'evaluated',
  'failed',
] as const;
export type TopicSelectionOfflineEvaluationCaseResultStatus =
  (typeof TOPIC_SELECTION_OFFLINE_EVALUATION_CASE_RESULT_STATUSES)[number];

export const TOPIC_SELECTION_V1A_OFFLINE_EVALUATION_METRIC_KEYS = [
  'false_gap_rate',
  'baseline_miss_rate',
  'counter_evidence_recall',
  'trace_completeness',
  'readiness_false_pass_rate',
  'human_override_rate',
  'rerun_instability',
  'recheck_precision',
  'negative_memory_usefulness',
  'downstream_rework_cause',
] as const;

export const TOPIC_SELECTION_V1B_OFFLINE_EVALUATION_METRIC_KEYS = [
  'slice_boundary_drift_rate',
  'answerability_false_pass_rate',
  'value_overclaim_rate',
  'package_trace_completeness',
  'package_readiness_false_pass_rate',
  'downstream_loopback_cause_distribution',
] as const;

export const TOPIC_SELECTION_V1C_OFFLINE_EVALUATION_METRIC_KEYS = [
  'promotion_input_staleness_false_pass_rate',
  'promotion_gate_blocker_false_pass_rate',
  'human_promotion_bypass_rate',
  'promotion_false_pass_rate',
  'bridge_trace_completeness',
  'commitment_profile_completeness',
  'loopback_target_accuracy',
  'downstream_mutation_guard_rate',
] as const;

export const TOPIC_SELECTION_RESEARCH_ARENA_OFFLINE_EVALUATION_METRIC_KEYS = [
  'arena_evidence_grounding_rate',
  'arena_execution_independence_rate',
  'arena_replay_integrity_rate',
  'arena_human_label_coverage_rate',
  'arena_cost_latency_accounting_rate',
  'arena_work_avoided_rate',
] as const;

export const TOPIC_SELECTION_OFFLINE_EVALUATION_METRIC_KEYS = [
  ...TOPIC_SELECTION_V1A_OFFLINE_EVALUATION_METRIC_KEYS,
  ...TOPIC_SELECTION_V1B_OFFLINE_EVALUATION_METRIC_KEYS,
  ...TOPIC_SELECTION_V1C_OFFLINE_EVALUATION_METRIC_KEYS,
  ...TOPIC_SELECTION_RESEARCH_ARENA_OFFLINE_EVALUATION_METRIC_KEYS,
] as const;
export type TopicSelectionOfflineEvaluationMetricKey =
  (typeof TOPIC_SELECTION_OFFLINE_EVALUATION_METRIC_KEYS)[number];

export const TOPIC_SELECTION_REPLAY_DIFF_STATUSES = ['match', 'mismatch'] as const;
export type TopicSelectionReplayDiffStatus = (typeof TOPIC_SELECTION_REPLAY_DIFF_STATUSES)[number];

export const TOPIC_SELECTION_REPLAY_DIFF_DIMENSIONS = [
  'final_decision',
  'key_evidence_set',
  'blocker_set',
  'trace_verdict',
  'slice_boundary',
  'answerability_verdict',
  'value_claim',
  'package_trace',
  'package_readiness',
  'loopback_cause',
  'promotion_input_currentness',
  'promotion_gate_blocker',
  'human_authorization',
  'promotion_gate',
  'bridge_trace',
  'commitment_profile',
  'loopback_target',
  'downstream_feedback',
] as const;
export type TopicSelectionReplayDiffDimension = (typeof TOPIC_SELECTION_REPLAY_DIFF_DIMENSIONS)[number];

export interface TopicSelectionOfflineFrozenInputBundle {
  stage: TopicSelectionOfflineEvaluationStage;
  frozen_at: string;
  source_refs: TopicSelectionFunctionalRef[];
  artifact_refs: TopicSelectionFunctionalRef[];
  stage_snapshots: {
    control_plane?: Record<string, unknown>;
    search_resource?: Record<string, unknown>;
    evidence_map?: Record<string, unknown>;
    need_validation?: Record<string, unknown>;
    recheck_risk_memory?: Record<string, unknown>;
    downstream_feedback?: Record<string, unknown>;
    v1b_intake?: Record<string, unknown>;
    research_slice?: Record<string, unknown>;
    topic_question_contract?: Record<string, unknown>;
    topic_value_assessment?: Record<string, unknown>;
    topic_package?: Record<string, unknown>;
    v1c_input_bundle?: Record<string, unknown>;
    promotion_input_snapshot?: Record<string, unknown>;
    promotion_decision_support?: Record<string, unknown>;
    promotion_dossier?: Record<string, unknown>;
    promotion_gate_check?: Record<string, unknown>;
    argument_readiness_mini_check?: Record<string, unknown>;
    human_promotion_decision?: Record<string, unknown>;
    promotion_decision?: Record<string, unknown>;
    promotion_commitment_profile?: Record<string, unknown>;
    paper_project_bridge?: Record<string, unknown>;
    downstream_recheck?: Record<string, unknown>;
  };
  payload: Record<string, unknown>;
}

export interface TopicSelectionOfflineEvaluationGoldExpectation {
  expected_unmet_need: boolean;
  expected_final_decision?: TopicSelectionNeedAdjudicationDecision | null;
  expected_readiness_passed?: boolean | null;
  expected_key_evidence_refs: TopicSelectionFunctionalRef[];
  expected_counter_evidence_refs: TopicSelectionFunctionalRef[];
  expected_blocker_codes: string[];
  required_trace_refs: TopicSelectionFunctionalRef[];
  expected_trace_verdict?: string | null;
  expected_recheck_action_refs: TopicSelectionFunctionalRef[];
  expected_negative_memory_refs: TopicSelectionFunctionalRef[];
  expected_downstream_rework_causes: string[];
  expected_baseline_solved?: boolean;
  allowed_slice_boundary_drift_codes?: string[];
  expected_answerability_passed?: boolean | null;
  allowed_value_overclaim_codes?: string[];
  required_package_trace_refs?: TopicSelectionFunctionalRef[];
  expected_package_ready?: boolean | null;
  expected_package_readiness_status?: string | null;
  expected_downstream_loopback_causes?: string[];
  expected_promotion_input_current?: boolean | null;
  expected_promotion_input_closure_status?: TopicSelectionPromotionInputSnapshotClosureStatus | null;
  expected_promotion_gate_disposition?: TopicSelectionPromotionGateDisposition | null;
  expected_promotion_gate_promote_allowed?: boolean | null;
  expected_human_authorized?: boolean | null;
  expected_promotion_bridge_eligible?: boolean | null;
  required_bridge_trace_refs?: TopicSelectionFunctionalRef[];
  required_commitment_profile_fields?: string[];
  expected_loopback_target?: TopicSelectionDownstreamLoopbackTarget | null;
  expected_loopback_cause?: TopicSelectionDownstreamLoopbackCause | null;
  expected_downstream_mutation_blocked?: boolean | null;
  notes: string[];
}

export interface TopicSelectionOfflineEvaluationObservedSnapshot {
  final_decision?: TopicSelectionNeedAdjudicationDecision | null;
  readiness_recommendation?: TopicSelectionNeedReadinessRecommendation | null;
  readiness_passed?: boolean | null;
  key_evidence_refs: TopicSelectionFunctionalRef[];
  counter_evidence_refs: TopicSelectionFunctionalRef[];
  evidence_refs: TopicSelectionFunctionalRef[];
  blocker_codes: string[];
  trace_refs: TopicSelectionFunctionalRef[];
  trace_verdict?: string | null;
  human_override_refs: TopicSelectionFunctionalRef[];
  recheck_action_refs: TopicSelectionFunctionalRef[];
  memory_refs: TopicSelectionFunctionalRef[];
  memory_used_as_evidence_refs: TopicSelectionFunctionalRef[];
  downstream_rework_causes: string[];
  slice_boundary_drift_codes?: string[];
  answerability_verdict?: string | null;
  answerability_passed?: boolean | null;
  value_overclaim_codes?: string[];
  package_trace_refs?: TopicSelectionFunctionalRef[];
  package_trace_verdict?: string | null;
  package_readiness_status?: string | null;
  package_readiness_passed?: boolean | null;
  downstream_loopback_causes?: string[];
  promotion_input_current?: boolean | null;
  promotion_input_closure_status?: TopicSelectionPromotionInputSnapshotClosureStatus | null;
  promotion_gate_disposition?: TopicSelectionPromotionGateDisposition | null;
  promotion_gate_promote_allowed?: boolean | null;
  human_promotion_authorized?: boolean | null;
  human_promotion_decision?: TopicSelectionHumanPromotionDecisionKind | null;
  promotion_decision_bridge_eligible?: boolean | null;
  bridge_trace_refs?: TopicSelectionFunctionalRef[];
  bridge_trace_verdict?: string | null;
  commitment_profile_present?: boolean | null;
  commitment_profile_fields?: string[];
  loopback_target?: TopicSelectionDownstreamLoopbackTarget | null;
  loopback_cause?: TopicSelectionDownstreamLoopbackCause | null;
  downstream_mutation_attempted?: boolean | null;
  downstream_mutation_blocked?: boolean | null;
  payload: Record<string, unknown>;
}

export interface TopicSelectionOfflineEvaluationObservedOutput
  extends TopicSelectionOfflineEvaluationObservedSnapshot {
  baseline_observed_output?: TopicSelectionOfflineEvaluationObservedSnapshot | null;
}

export interface TopicSelectionOfflineEvaluationDatasetRecord {
  offline_evaluation_dataset_id: string;
  workspace_id?: string | null;
  dataset_key: string;
  dataset_version: string;
  stage: TopicSelectionOfflineEvaluationStage;
  source: TopicSelectionOfflineEvaluationDatasetSource;
  status: TopicSelectionOfflineEvaluationDatasetStatus;
  description?: string | null;
  case_count: number;
  case_type_coverage: TopicSelectionOfflineEvaluationCaseType[];
  payload: Record<string, unknown>;
  created_by: TopicSelectionActorType;
  created_at: string;
  updated_at: string;
}

export interface TopicSelectionOfflineEvaluationCaseRecord {
  offline_evaluation_case_id: string;
  workspace_id?: string | null;
  dataset_id: string;
  title_card_id?: string | null;
  case_key: string;
  case_type: TopicSelectionOfflineEvaluationCaseType;
  status: TopicSelectionOfflineEvaluationCaseStatus;
  frozen_input_bundle: TopicSelectionOfflineFrozenInputBundle;
  gold_expectation: TopicSelectionOfflineEvaluationGoldExpectation;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface TopicSelectionOfflineEvaluationRunRecord {
  offline_evaluation_run_id: string;
  workspace_id?: string | null;
  dataset_id: string;
  run_key: string;
  status: TopicSelectionOfflineEvaluationRunStatus;
  workflow_profile_key: string;
  workflow_profile_version?: string | null;
  model_profile_key?: string | null;
  search_profile_key?: string | null;
  policy_version_id?: string | null;
  metric_keys: TopicSelectionOfflineEvaluationMetricKey[];
  case_count: number;
  run_payload: Record<string, unknown>;
  created_by: TopicSelectionActorType;
  started_at: string;
  finished_at?: string | null;
}

export interface TopicSelectionOfflineEvaluationCaseResultRecord {
  offline_evaluation_case_result_id: string;
  workspace_id?: string | null;
  run_id: string;
  dataset_id: string;
  case_id: string;
  case_type: TopicSelectionOfflineEvaluationCaseType;
  status: TopicSelectionOfflineEvaluationCaseResultStatus;
  observed_output: TopicSelectionOfflineEvaluationObservedOutput;
  replay_diff_ref?: TopicSelectionFunctionalRef | null;
  metric_contribution_payload: Record<string, unknown>;
  failure_examples: string[];
  created_at: string;
}

export interface TopicSelectionOfflineEvaluationMetricResultRecord {
  offline_evaluation_metric_result_id: string;
  workspace_id?: string | null;
  run_id: string;
  dataset_id: string;
  metric_key: TopicSelectionOfflineEvaluationMetricKey;
  numerator: number;
  denominator: number;
  value: number | null;
  contributing_case_refs: TopicSelectionFunctionalRef[];
  failure_case_refs: TopicSelectionFunctionalRef[];
  notes: string[];
  metric_payload: Record<string, unknown>;
  created_at: string;
}

export interface TopicSelectionReplayDiffRecord {
  replay_diff_id: string;
  workspace_id?: string | null;
  run_id: string;
  dataset_id: string;
  case_id: string;
  status: TopicSelectionReplayDiffStatus;
  changed_dimensions: TopicSelectionReplayDiffDimension[];
  final_decision_changed: boolean;
  key_evidence_set_changed: boolean;
  blocker_set_changed: boolean;
  trace_verdict_changed: boolean;
  expected_snapshot: Record<string, unknown>;
  observed_snapshot: TopicSelectionOfflineEvaluationObservedOutput;
  baseline_snapshot?: TopicSelectionOfflineEvaluationObservedSnapshot | null;
  diff_payload: Record<string, unknown>;
  created_at: string;
}

export function createTopicSelectionOfflineFrozenInputBundle(
  input: Partial<TopicSelectionOfflineFrozenInputBundle> & { frozen_at: string },
): TopicSelectionOfflineFrozenInputBundle {
  return {
    stage: input.stage ?? 'v1a',
    frozen_at: input.frozen_at,
    source_refs: input.source_refs ?? [],
    artifact_refs: input.artifact_refs ?? [],
    stage_snapshots: input.stage_snapshots ?? {},
    payload: input.payload ?? {},
  };
}

const stringId = { type: 'string', minLength: 1 } as const;
const nullableStringId = { anyOf: [stringId, { type: 'null' }] } as const;
const numberValue = { type: 'number' } as const;
const nullableNumber = { anyOf: [numberValue, { type: 'null' }] } as const;
const booleanValue = { type: 'boolean' } as const;
const stringArray = { type: 'array', items: stringId } as const;
const objectPayload = { type: 'object', additionalProperties: true } as const;
const functionalRefArray = { type: 'array', items: topicSelectionFunctionalRefSchema } as const;
const nullableFunctionalRef = { anyOf: [topicSelectionFunctionalRefSchema, { type: 'null' }] } as const;
const nullableNeedAdjudicationDecision = {
  anyOf: [{ enum: [...TOPIC_SELECTION_NEED_ADJUDICATION_DECISIONS] }, { type: 'null' }],
} as const;
const nullableNeedReadinessRecommendation = {
  anyOf: [{ enum: [...TOPIC_SELECTION_NEED_READINESS_RECOMMENDATIONS] }, { type: 'null' }],
} as const;
const nullablePromotionInputClosureStatus = {
  anyOf: [{ enum: [...TOPIC_SELECTION_PROMOTION_INPUT_SNAPSHOT_CLOSURE_STATUSES] }, { type: 'null' }],
} as const;
const nullablePromotionGateDisposition = {
  anyOf: [{ enum: [...TOPIC_SELECTION_PROMOTION_GATE_DISPOSITIONS] }, { type: 'null' }],
} as const;
const nullableHumanPromotionDecision = {
  anyOf: [{ enum: [...TOPIC_SELECTION_HUMAN_PROMOTION_DECISIONS] }, { type: 'null' }],
} as const;
const nullableDownstreamLoopbackTarget = {
  anyOf: [{ enum: [...TOPIC_SELECTION_DOWNSTREAM_LOOPBACK_TARGETS] }, { type: 'null' }],
} as const;
const nullableDownstreamLoopbackCause = {
  anyOf: [{ enum: [...TOPIC_SELECTION_DOWNSTREAM_LOOPBACK_CAUSES] }, { type: 'null' }],
} as const;

export const topicSelectionOfflineFrozenInputBundleSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['stage', 'frozen_at', 'source_refs', 'artifact_refs', 'stage_snapshots', 'payload'],
  properties: {
    stage: { enum: [...TOPIC_SELECTION_OFFLINE_EVALUATION_STAGES] },
    frozen_at: stringId,
    source_refs: functionalRefArray,
    artifact_refs: functionalRefArray,
    stage_snapshots: objectPayload,
    payload: objectPayload,
  },
} as const;

export const topicSelectionOfflineEvaluationGoldExpectationSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'expected_unmet_need',
    'expected_key_evidence_refs',
    'expected_counter_evidence_refs',
    'expected_blocker_codes',
    'required_trace_refs',
    'expected_recheck_action_refs',
    'expected_negative_memory_refs',
    'expected_downstream_rework_causes',
    'notes',
  ],
  properties: {
    expected_unmet_need: booleanValue,
    expected_final_decision: nullableNeedAdjudicationDecision,
    expected_readiness_passed: { anyOf: [booleanValue, { type: 'null' }] },
    expected_key_evidence_refs: functionalRefArray,
    expected_counter_evidence_refs: functionalRefArray,
    expected_blocker_codes: stringArray,
    required_trace_refs: functionalRefArray,
    expected_trace_verdict: nullableStringId,
    expected_recheck_action_refs: functionalRefArray,
    expected_negative_memory_refs: functionalRefArray,
    expected_downstream_rework_causes: stringArray,
    expected_baseline_solved: booleanValue,
    allowed_slice_boundary_drift_codes: stringArray,
    expected_answerability_passed: { anyOf: [booleanValue, { type: 'null' }] },
    allowed_value_overclaim_codes: stringArray,
    required_package_trace_refs: functionalRefArray,
    expected_package_ready: { anyOf: [booleanValue, { type: 'null' }] },
    expected_package_readiness_status: nullableStringId,
    expected_downstream_loopback_causes: stringArray,
    expected_promotion_input_current: { anyOf: [booleanValue, { type: 'null' }] },
    expected_promotion_input_closure_status: nullablePromotionInputClosureStatus,
    expected_promotion_gate_disposition: nullablePromotionGateDisposition,
    expected_promotion_gate_promote_allowed: { anyOf: [booleanValue, { type: 'null' }] },
    expected_human_authorized: { anyOf: [booleanValue, { type: 'null' }] },
    expected_promotion_bridge_eligible: { anyOf: [booleanValue, { type: 'null' }] },
    required_bridge_trace_refs: functionalRefArray,
    required_commitment_profile_fields: stringArray,
    expected_loopback_target: nullableDownstreamLoopbackTarget,
    expected_loopback_cause: nullableDownstreamLoopbackCause,
    expected_downstream_mutation_blocked: { anyOf: [booleanValue, { type: 'null' }] },
    notes: stringArray,
  },
} as const;

const topicSelectionOfflineEvaluationObservedSnapshotRequired = [
  'key_evidence_refs',
  'counter_evidence_refs',
  'evidence_refs',
  'blocker_codes',
  'trace_refs',
  'human_override_refs',
  'recheck_action_refs',
  'memory_refs',
  'memory_used_as_evidence_refs',
  'downstream_rework_causes',
  'payload',
] as const;

const topicSelectionOfflineEvaluationObservedSnapshotProperties = {
  final_decision: nullableNeedAdjudicationDecision,
  readiness_recommendation: nullableNeedReadinessRecommendation,
  readiness_passed: { anyOf: [booleanValue, { type: 'null' }] },
  key_evidence_refs: functionalRefArray,
  counter_evidence_refs: functionalRefArray,
  evidence_refs: functionalRefArray,
  blocker_codes: stringArray,
  trace_refs: functionalRefArray,
  trace_verdict: nullableStringId,
  human_override_refs: functionalRefArray,
  recheck_action_refs: functionalRefArray,
  memory_refs: functionalRefArray,
  memory_used_as_evidence_refs: functionalRefArray,
  downstream_rework_causes: stringArray,
  slice_boundary_drift_codes: stringArray,
  answerability_verdict: nullableStringId,
  answerability_passed: { anyOf: [booleanValue, { type: 'null' }] },
  value_overclaim_codes: stringArray,
  package_trace_refs: functionalRefArray,
  package_trace_verdict: nullableStringId,
  package_readiness_status: nullableStringId,
  package_readiness_passed: { anyOf: [booleanValue, { type: 'null' }] },
  downstream_loopback_causes: stringArray,
  promotion_input_current: { anyOf: [booleanValue, { type: 'null' }] },
  promotion_input_closure_status: nullablePromotionInputClosureStatus,
  promotion_gate_disposition: nullablePromotionGateDisposition,
  promotion_gate_promote_allowed: { anyOf: [booleanValue, { type: 'null' }] },
  human_promotion_authorized: { anyOf: [booleanValue, { type: 'null' }] },
  human_promotion_decision: nullableHumanPromotionDecision,
  promotion_decision_bridge_eligible: { anyOf: [booleanValue, { type: 'null' }] },
  bridge_trace_refs: functionalRefArray,
  bridge_trace_verdict: nullableStringId,
  commitment_profile_present: { anyOf: [booleanValue, { type: 'null' }] },
  commitment_profile_fields: stringArray,
  loopback_target: nullableDownstreamLoopbackTarget,
  loopback_cause: nullableDownstreamLoopbackCause,
  downstream_mutation_attempted: { anyOf: [booleanValue, { type: 'null' }] },
  downstream_mutation_blocked: { anyOf: [booleanValue, { type: 'null' }] },
  payload: objectPayload,
} as const;

export const topicSelectionOfflineEvaluationObservedSnapshotSchema = {
  type: 'object',
  additionalProperties: false,
  required: [...topicSelectionOfflineEvaluationObservedSnapshotRequired],
  properties: topicSelectionOfflineEvaluationObservedSnapshotProperties,
} as const;

export const topicSelectionOfflineEvaluationObservedOutputSchema = {
  type: 'object',
  additionalProperties: false,
  required: [...topicSelectionOfflineEvaluationObservedSnapshotRequired],
  properties: {
    ...topicSelectionOfflineEvaluationObservedSnapshotProperties,
    baseline_observed_output: {
      anyOf: [topicSelectionOfflineEvaluationObservedSnapshotSchema, { type: 'null' }],
    },
  },
} as const;

export const topicSelectionOfflineEvaluationDatasetRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'offline_evaluation_dataset_id',
    'dataset_key',
    'dataset_version',
    'stage',
    'source',
    'status',
    'case_count',
    'case_type_coverage',
    'payload',
    'created_by',
    'created_at',
    'updated_at',
  ],
  properties: {
    offline_evaluation_dataset_id: stringId,
    workspace_id: nullableStringId,
    dataset_key: stringId,
    dataset_version: stringId,
    stage: { enum: [...TOPIC_SELECTION_OFFLINE_EVALUATION_STAGES] },
    source: { enum: [...TOPIC_SELECTION_OFFLINE_EVALUATION_DATASET_SOURCES] },
    status: { enum: [...TOPIC_SELECTION_OFFLINE_EVALUATION_DATASET_STATUSES] },
    description: nullableStringId,
    case_count: numberValue,
    case_type_coverage: {
      type: 'array',
      items: { enum: [...TOPIC_SELECTION_OFFLINE_EVALUATION_CASE_TYPES] },
    },
    payload: objectPayload,
    created_by: { enum: [...TOPIC_SELECTION_ACTOR_TYPES] },
    created_at: stringId,
    updated_at: stringId,
  },
} as const;

export const topicSelectionOfflineEvaluationCaseRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'offline_evaluation_case_id',
    'dataset_id',
    'case_key',
    'case_type',
    'status',
    'frozen_input_bundle',
    'gold_expectation',
    'tags',
    'created_at',
    'updated_at',
  ],
  properties: {
    offline_evaluation_case_id: stringId,
    workspace_id: nullableStringId,
    dataset_id: stringId,
    title_card_id: nullableStringId,
    case_key: stringId,
    case_type: { enum: [...TOPIC_SELECTION_OFFLINE_EVALUATION_CASE_TYPES] },
    status: { enum: [...TOPIC_SELECTION_OFFLINE_EVALUATION_CASE_STATUSES] },
    frozen_input_bundle: topicSelectionOfflineFrozenInputBundleSchema,
    gold_expectation: topicSelectionOfflineEvaluationGoldExpectationSchema,
    tags: stringArray,
    created_at: stringId,
    updated_at: stringId,
  },
} as const;

export const topicSelectionOfflineEvaluationRunRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'offline_evaluation_run_id',
    'dataset_id',
    'run_key',
    'status',
    'workflow_profile_key',
    'metric_keys',
    'case_count',
    'run_payload',
    'created_by',
    'started_at',
  ],
  properties: {
    offline_evaluation_run_id: stringId,
    workspace_id: nullableStringId,
    dataset_id: stringId,
    run_key: stringId,
    status: { enum: [...TOPIC_SELECTION_OFFLINE_EVALUATION_RUN_STATUSES] },
    workflow_profile_key: stringId,
    workflow_profile_version: nullableStringId,
    model_profile_key: nullableStringId,
    search_profile_key: nullableStringId,
    policy_version_id: nullableStringId,
    metric_keys: {
      type: 'array',
      items: { enum: [...TOPIC_SELECTION_OFFLINE_EVALUATION_METRIC_KEYS] },
    },
    case_count: numberValue,
    run_payload: objectPayload,
    created_by: { enum: [...TOPIC_SELECTION_ACTOR_TYPES] },
    started_at: stringId,
    finished_at: nullableStringId,
  },
} as const;

export const topicSelectionOfflineEvaluationCaseResultRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'offline_evaluation_case_result_id',
    'run_id',
    'dataset_id',
    'case_id',
    'case_type',
    'status',
    'observed_output',
    'metric_contribution_payload',
    'failure_examples',
    'created_at',
  ],
  properties: {
    offline_evaluation_case_result_id: stringId,
    workspace_id: nullableStringId,
    run_id: stringId,
    dataset_id: stringId,
    case_id: stringId,
    case_type: { enum: [...TOPIC_SELECTION_OFFLINE_EVALUATION_CASE_TYPES] },
    status: { enum: [...TOPIC_SELECTION_OFFLINE_EVALUATION_CASE_RESULT_STATUSES] },
    observed_output: topicSelectionOfflineEvaluationObservedOutputSchema,
    replay_diff_ref: nullableFunctionalRef,
    metric_contribution_payload: objectPayload,
    failure_examples: stringArray,
    created_at: stringId,
  },
} as const;

export const topicSelectionOfflineEvaluationMetricResultRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'offline_evaluation_metric_result_id',
    'run_id',
    'dataset_id',
    'metric_key',
    'numerator',
    'denominator',
    'value',
    'contributing_case_refs',
    'failure_case_refs',
    'notes',
    'metric_payload',
    'created_at',
  ],
  properties: {
    offline_evaluation_metric_result_id: stringId,
    workspace_id: nullableStringId,
    run_id: stringId,
    dataset_id: stringId,
    metric_key: { enum: [...TOPIC_SELECTION_OFFLINE_EVALUATION_METRIC_KEYS] },
    numerator: numberValue,
    denominator: numberValue,
    value: nullableNumber,
    contributing_case_refs: functionalRefArray,
    failure_case_refs: functionalRefArray,
    notes: stringArray,
    metric_payload: objectPayload,
    created_at: stringId,
  },
} as const;

export const topicSelectionReplayDiffRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'replay_diff_id',
    'run_id',
    'dataset_id',
    'case_id',
    'status',
    'changed_dimensions',
    'final_decision_changed',
    'key_evidence_set_changed',
    'blocker_set_changed',
    'trace_verdict_changed',
    'expected_snapshot',
    'observed_snapshot',
    'diff_payload',
    'created_at',
  ],
  properties: {
    replay_diff_id: stringId,
    workspace_id: nullableStringId,
    run_id: stringId,
    dataset_id: stringId,
    case_id: stringId,
    status: { enum: [...TOPIC_SELECTION_REPLAY_DIFF_STATUSES] },
    changed_dimensions: {
      type: 'array',
      items: { enum: [...TOPIC_SELECTION_REPLAY_DIFF_DIMENSIONS] },
    },
    final_decision_changed: booleanValue,
    key_evidence_set_changed: booleanValue,
    blocker_set_changed: booleanValue,
    trace_verdict_changed: booleanValue,
    expected_snapshot: objectPayload,
    observed_snapshot: topicSelectionOfflineEvaluationObservedOutputSchema,
    baseline_snapshot: { anyOf: [topicSelectionOfflineEvaluationObservedSnapshotSchema, { type: 'null' }] },
    diff_payload: objectPayload,
    created_at: stringId,
  },
} as const;
