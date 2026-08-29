import {
  topicSelectionFunctionalRefSchema,
  type TopicSelectionActorType,
  type TopicSelectionFunctionalRef,
} from './topic-selection-control-plane-contracts.js';
import type {
  TopicSelectionTopicQuestionAnswerabilityPlanRecord,
  TopicSelectionTopicQuestionAssumptionRefRecord,
  TopicSelectionTopicQuestionBoundaryRefRecord,
  TopicSelectionTopicQuestionContractRecord,
  TopicSelectionTopicQuestionEvidenceRefRecord,
  TopicSelectionTopicQuestionFalsificationConditionRecord,
  TopicSelectionTopicQuestionNeedRefRecord,
} from './topic-selection-v1b-topic-question-contracts.js';

export const TOPIC_SELECTION_ASSESS_TOPIC_VALUE_RUN_STATUSES = [
  'queued',
  'running',
  'succeeded',
  'failed',
  'blocked',
  'cancelled',
] as const;
export type TopicSelectionAssessTopicValueRunStatus =
  (typeof TOPIC_SELECTION_ASSESS_TOPIC_VALUE_RUN_STATUSES)[number];

export const TOPIC_SELECTION_TOPIC_VALUE_READINESS_STATUSES = [
  'ready',
  'ready_with_accepted_risk',
  'needs_refinement',
  'recheck_required',
  'blocked',
  'parked',
  'dropped',
] as const;
export type TopicSelectionTopicValueReadinessStatus =
  (typeof TOPIC_SELECTION_TOPIC_VALUE_READINESS_STATUSES)[number];

export const TOPIC_SELECTION_VALUE_GATE_KEYS = [
  'value_signal',
  'non_solved_sanity',
  'answerability_sanity',
  'feasibility_sanity',
  'evidence_sanity',
  'claim_ceiling_fit',
] as const;
export type TopicSelectionValueGateKey =
  (typeof TOPIC_SELECTION_VALUE_GATE_KEYS)[number];

export const TOPIC_SELECTION_VALUE_GATE_VERDICTS = [
  'pass',
  'pass_with_risk',
  'fail',
] as const;
export type TopicSelectionValueGateVerdict =
  (typeof TOPIC_SELECTION_VALUE_GATE_VERDICTS)[number];

export const TOPIC_SELECTION_VALUE_DIMENSIONS = [
  'significance',
  'originality',
  'answerability',
  'feasibility',
  'claim_ceiling_fit',
  'reviewer_risk',
  'effort_to_value_fit',
  'strategic_fit',
  'negative_memory_check',
] as const;
export const TOPIC_SELECTION_VALUE_DIMENSION_KEYS = TOPIC_SELECTION_VALUE_DIMENSIONS;
export type TopicSelectionValueDimension =
  (typeof TOPIC_SELECTION_VALUE_DIMENSIONS)[number];

export const TOPIC_SELECTION_VALUE_DISPOSITIONS = [
  'advance_to_package',
  'refine_question',
  'refine_slice',
  'recheck_evidence_or_search',
  'park',
  'drop',
] as const;
export const TOPIC_SELECTION_TOPIC_VALUE_DISPOSITION_DECISIONS = TOPIC_SELECTION_VALUE_DISPOSITIONS;
export type TopicSelectionValueDisposition =
  (typeof TOPIC_SELECTION_VALUE_DISPOSITIONS)[number];

export const TOPIC_SELECTION_VALUE_DISPOSITION_STATUSES = [
  'active',
  'superseded',
  'recheck_required',
] as const;
export type TopicSelectionValueDispositionStatus =
  (typeof TOPIC_SELECTION_VALUE_DISPOSITION_STATUSES)[number];

export interface TopicSelectionAssessTopicValueRunRecord {
  assess_topic_value_run_id: string;
  workspace_id?: string | null;
  title_card_id: string;
  topic_question_contract_id: string;
  topic_question_id: string;
  research_slice_id: string;
  research_slice_version: string;
  topic_value_assessment_id?: string | null;
  value_reasoning_memo_id?: string | null;
  status: TopicSelectionAssessTopicValueRunStatus;
  triggered_by: TopicSelectionActorType;
  topic_question_ref: TopicSelectionFunctionalRef;
  topic_question_contract_ref: TopicSelectionFunctionalRef;
  answerability_plan_ref: TopicSelectionFunctionalRef;
  research_slice_ref: TopicSelectionFunctionalRef;
  selection_decision_ref: TopicSelectionFunctionalRef;
  validated_need_refs: TopicSelectionFunctionalRef[];
  evidence_refs: TopicSelectionFunctionalRef[];
  accepted_risk_refs: TopicSelectionFunctionalRef[];
  memory_suggestion_refs: TopicSelectionFunctionalRef[];
  recheck_request_refs: TopicSelectionFunctionalRef[];
  workflow_profile_key: string;
  workflow_profile_version?: string | null;
  provider_id?: string | null;
  model_id?: string | null;
  prompt_template_id?: string | null;
  prompt_template_version?: string | null;
  topic_value_input_snapshot_id?: string | null;
  input_snapshot_id?: string | null;
  workflow_run_id?: string | null;
  gate_result_id?: string | null;
  transition_attempt_id?: string | null;
  artifact_refs: TopicSelectionFunctionalRef[];
  quality_flags: string[];
  failure_reason?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TopicSelectionTopicValueAssessmentInputSnapshotRecord {
  topic_value_input_snapshot_id: string;
  workspace_id?: string | null;
  title_card_id: string;
  topic_question_contract_id: string;
  topic_question_id: string;
  research_slice_id: string;
  research_slice_version: string;
  topic_question_ref: TopicSelectionFunctionalRef;
  topic_question_contract_ref: TopicSelectionFunctionalRef;
  answerability_plan_ref: TopicSelectionFunctionalRef;
  research_slice_ref: TopicSelectionFunctionalRef;
  validated_need_refs: TopicSelectionFunctionalRef[];
  evidence_refs: TopicSelectionTopicQuestionEvidenceRefRecord[];
  need_refs: TopicSelectionTopicQuestionNeedRefRecord[];
  boundary_refs: TopicSelectionTopicQuestionBoundaryRefRecord[];
  assumption_refs: TopicSelectionTopicQuestionAssumptionRefRecord[];
  falsification_conditions: TopicSelectionTopicQuestionFalsificationConditionRecord[];
  accepted_risk_refs: TopicSelectionFunctionalRef[];
  memory_suggestion_refs: TopicSelectionFunctionalRef[];
  recheck_request_refs: TopicSelectionFunctionalRef[];
  question_contract: TopicSelectionTopicQuestionContractRecord;
  answerability_plan: TopicSelectionTopicQuestionAnswerabilityPlanRecord;
  research_slice_snapshot: Record<string, unknown>;
  snapshot_hash: string;
  control_plane_input_snapshot_id?: string | null;
  created_at: string;
}

export interface TopicSelectionTopicValueGateResult {
  gate_key: TopicSelectionValueGateKey;
  verdict: TopicSelectionValueGateVerdict;
  severity: 'info' | 'warning' | 'blocking';
  overridable_with_risk: boolean;
  rationale: string;
  refs: TopicSelectionFunctionalRef[];
}

export interface TopicSelectionTopicValueDimensionScore {
  dimension_key: TopicSelectionValueDimension;
  score: number;
  rationale: string;
  evidence_refs: TopicSelectionFunctionalRef[];
  uncertainty: string;
}

export interface TopicSelectionTopicValueAssessmentRecord {
  topic_value_assessment_id: string;
  workspace_id?: string | null;
  title_card_id: string;
  topic_question_id: string;
  topic_question_contract_id: string;
  research_record_id: string;
  source_research_slice_id: string;
  source_research_slice_version: string;
  assess_topic_value_run_id: string;
  topic_value_input_snapshot_id: string;
  value_reasoning_memo_id: string;
  active_disposition_decision_id?: string | null;
  readiness_status: TopicSelectionTopicValueReadinessStatus;
  freshness_status: 'current' | 'recheck_required' | 'stale' | 'superseded';
  strongest_claim_if_success: string;
  fallback_claim_if_success?: string | null;
  hard_gates: TopicSelectionTopicValueGateResult[];
  dimension_scores: TopicSelectionTopicValueDimensionScore[];
  risk_penalty: Record<string, unknown>;
  reviewer_objections: string[];
  ceiling_case: string;
  base_case: string;
  floor_case: string;
  legacy_verdict: 'promote' | 'refine' | 'park' | 'drop';
  total_score: number;
  value_summary: string;
  confidence: number;
  accepted_risk_refs: TopicSelectionFunctionalRef[];
  blocker_refs: TopicSelectionFunctionalRef[];
  risk_notes: string[];
  trace_snapshot_id?: string | null;
  workflow_run_id?: string | null;
  gate_result_id?: string | null;
  transition_attempt_id?: string | null;
  artifact_refs: TopicSelectionFunctionalRef[];
  risk_finding_refs?: TopicSelectionFunctionalRef[];
  created_at: string;
  updated_at: string;
}

export interface TopicSelectionValueReasoningMemoRecord {
  value_reasoning_memo_id: string;
  workspace_id?: string | null;
  title_card_id: string;
  topic_value_assessment_id: string;
  topic_question_contract_id: string;
  recommendation: TopicSelectionValueDisposition;
  value_thesis: string;
  significance: string;
  originality: string;
  claim_leverage: string;
  reviewer_risks: string[];
  effort_to_value: string;
  strategic_fit: string;
  negative_memory_check: string;
  evidence_backed_rationale: string;
  top_objections: string[];
  uncertainty: string;
  disposition_bridge: string;
  requires_critic_review: boolean;
  critic_triggers: string[];
  cited_refs: TopicSelectionFunctionalRef[];
  created_by_workflow_run_id?: string | null;
  artifact_refs: TopicSelectionFunctionalRef[];
  risk_finding_refs?: TopicSelectionFunctionalRef[];
  created_at: string;
}

export interface TopicSelectionTopicValueEvidenceRefRecord {
  topic_value_evidence_ref_id: string;
  workspace_id?: string | null;
  title_card_id: string;
  topic_value_assessment_id: string;
  topic_question_contract_id: string;
  evidence_ref: TopicSelectionFunctionalRef;
  evidence_role: string;
  value_use: string;
  rationale: string;
  created_at: string;
}

export interface TopicSelectionV1bPackageDraftInput {
  topic_value_assessment_ref: TopicSelectionFunctionalRef;
  value_reasoning_memo_ref: TopicSelectionFunctionalRef;
  value_disposition_decision_ref: TopicSelectionFunctionalRef;
  topic_question_ref: TopicSelectionFunctionalRef;
  topic_question_contract_ref: TopicSelectionFunctionalRef;
  answerability_plan_ref: TopicSelectionFunctionalRef;
  research_slice_ref: TopicSelectionFunctionalRef;
  validated_need_refs: TopicSelectionFunctionalRef[];
  evidence_refs: TopicSelectionTopicQuestionEvidenceRefRecord[];
  boundary_refs: TopicSelectionTopicQuestionBoundaryRefRecord[];
  assumption_refs: TopicSelectionTopicQuestionAssumptionRefRecord[];
  falsification_conditions: TopicSelectionTopicQuestionFalsificationConditionRecord[];
  accepted_risk_refs: TopicSelectionFunctionalRef[];
  risk_finding_refs?: TopicSelectionFunctionalRef[];
  memory_suggestion_refs: TopicSelectionFunctionalRef[];
  recheck_request_refs: TopicSelectionFunctionalRef[];
  topic_value_assessment: TopicSelectionTopicValueAssessmentRecord;
  value_reasoning_memo: TopicSelectionValueReasoningMemoRecord;
  value_disposition_decision: Omit<TopicSelectionValueDispositionDecisionRecord, 'package_draft_input'>;
  question_contract: TopicSelectionTopicQuestionContractRecord;
  answerability_plan: TopicSelectionTopicQuestionAnswerabilityPlanRecord;
  research_slice_snapshot: Record<string, unknown>;
}

export interface TopicSelectionValueDispositionDecisionRecord {
  value_disposition_decision_id: string;
  workspace_id?: string | null;
  title_card_id: string;
  topic_value_assessment_id: string;
  topic_question_contract_id: string;
  value_reasoning_memo_id: string;
  decision: TopicSelectionValueDisposition;
  decided_by: TopicSelectionActorType;
  decision_rationale: string;
  required_actions: string[];
  loopback_target_ref?: TopicSelectionFunctionalRef | null;
  blocking_contexts: Record<string, unknown>[];
  accepted_risk_refs: TopicSelectionFunctionalRef[];
  blocker_refs: TopicSelectionFunctionalRef[];
  package_draft_input?: TopicSelectionV1bPackageDraftInput | null;
  output_topic_package_id?: string | null;
  status: TopicSelectionValueDispositionStatus;
  is_current: boolean;
  input_snapshot_id?: string | null;
  workflow_run_id?: string | null;
  gate_result_id?: string | null;
  transition_attempt_id?: string | null;
  artifact_refs: TopicSelectionFunctionalRef[];
  risk_finding_refs?: TopicSelectionFunctionalRef[];
  created_at: string;
}

export interface TopicSelectionAssessTopicValueLlmOutput {
  readiness_status: TopicSelectionTopicValueReadinessStatus;
  strongest_claim_if_success: string;
  fallback_claim_if_success?: string | null;
  hard_gates: TopicSelectionTopicValueGateResult[];
  dimension_scores: TopicSelectionTopicValueDimensionScore[];
  risk_penalty: Record<string, unknown>;
  reviewer_objections: string[];
  ceiling_case: string;
  base_case: string;
  floor_case: string;
  recommended_disposition: TopicSelectionValueDisposition;
  total_score: number;
  value_summary: string;
  confidence: number;
  accepted_risk_refs: TopicSelectionFunctionalRef[];
  blocker_refs: TopicSelectionFunctionalRef[];
  risk_notes: string[];
  reasoning_memo: Omit<
    TopicSelectionValueReasoningMemoRecord,
    | 'value_reasoning_memo_id'
    | 'workspace_id'
    | 'title_card_id'
    | 'topic_value_assessment_id'
    | 'topic_question_contract_id'
    | 'created_by_workflow_run_id'
    | 'artifact_refs'
    | 'created_at'
  >;
}

export type AssessTopicValueRun = TopicSelectionAssessTopicValueRunRecord;
export type TopicValueAssessmentInputSnapshot =
  TopicSelectionTopicValueAssessmentInputSnapshotRecord;
export type TopicValueAssessment = TopicSelectionTopicValueAssessmentRecord;
export type TopicValueGateResult = TopicSelectionTopicValueGateResult;
export type TopicValueDimensionScore = TopicSelectionTopicValueDimensionScore;
export type ValueReasoningMemo = TopicSelectionValueReasoningMemoRecord;
export type ValueDispositionDecision = TopicSelectionValueDispositionDecisionRecord;

const stringId = { type: 'string', minLength: 1 } as const;
const stringValue = { type: 'string' } as const;
const booleanValue = { type: 'boolean' } as const;
const nullableStringId = { anyOf: [stringId, { type: 'null' }] } as const;
const stringArray = { type: 'array', items: stringId } as const;
const objectPayload = { type: 'object', additionalProperties: true } as const;
const objectArray = { type: 'array', items: objectPayload } as const;
const functionalRefArray = { type: 'array', items: topicSelectionFunctionalRefSchema } as const;
const nullableFunctionalRef = { anyOf: [topicSelectionFunctionalRefSchema, { type: 'null' }] } as const;

export const topicSelectionTopicValueGateResultSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['gate_key', 'verdict', 'severity', 'overridable_with_risk', 'rationale', 'refs'],
  properties: {
    gate_key: { enum: [...TOPIC_SELECTION_VALUE_GATE_KEYS] },
    verdict: { enum: [...TOPIC_SELECTION_VALUE_GATE_VERDICTS] },
    severity: { enum: ['info', 'warning', 'blocking'] },
    overridable_with_risk: booleanValue,
    rationale: stringId,
    refs: functionalRefArray,
  },
} as const;

export const topicSelectionTopicValueDimensionScoreSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['dimension_key', 'score', 'rationale', 'evidence_refs', 'uncertainty'],
  properties: {
    dimension_key: { enum: [...TOPIC_SELECTION_VALUE_DIMENSIONS] },
    score: { type: 'number', minimum: 0, maximum: 100 },
    rationale: stringId,
    evidence_refs: functionalRefArray,
    uncertainty: stringId,
  },
} as const;

const topicSelectionTopicValueGateResultArraySchema = {
  type: 'array',
  minItems: TOPIC_SELECTION_VALUE_GATE_KEYS.length,
  maxItems: TOPIC_SELECTION_VALUE_GATE_KEYS.length,
  items: topicSelectionTopicValueGateResultSchema,
} as const;

const topicSelectionTopicValueDimensionScoreArraySchema = {
  type: 'array',
  minItems: TOPIC_SELECTION_VALUE_DIMENSIONS.length,
  maxItems: TOPIC_SELECTION_VALUE_DIMENSIONS.length,
  items: topicSelectionTopicValueDimensionScoreSchema,
} as const;

export const topicSelectionAssessTopicValueRunRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'assess_topic_value_run_id',
    'title_card_id',
    'topic_question_contract_id',
    'topic_question_id',
    'research_slice_id',
    'research_slice_version',
    'status',
    'triggered_by',
    'topic_question_ref',
    'topic_question_contract_ref',
    'answerability_plan_ref',
    'research_slice_ref',
    'selection_decision_ref',
    'validated_need_refs',
    'evidence_refs',
    'accepted_risk_refs',
    'memory_suggestion_refs',
    'recheck_request_refs',
    'workflow_profile_key',
    'artifact_refs',
    'quality_flags',
    'created_at',
    'updated_at',
  ],
  properties: {
    assess_topic_value_run_id: stringId,
    workspace_id: nullableStringId,
    title_card_id: stringId,
    topic_question_contract_id: stringId,
    topic_question_id: stringId,
    research_slice_id: stringId,
    research_slice_version: stringId,
    topic_value_assessment_id: nullableStringId,
    value_reasoning_memo_id: nullableStringId,
    status: { enum: [...TOPIC_SELECTION_ASSESS_TOPIC_VALUE_RUN_STATUSES] },
    triggered_by: stringId,
    topic_question_ref: topicSelectionFunctionalRefSchema,
    topic_question_contract_ref: topicSelectionFunctionalRefSchema,
    answerability_plan_ref: topicSelectionFunctionalRefSchema,
    research_slice_ref: topicSelectionFunctionalRefSchema,
    selection_decision_ref: topicSelectionFunctionalRefSchema,
    validated_need_refs: functionalRefArray,
    evidence_refs: functionalRefArray,
    accepted_risk_refs: functionalRefArray,
    memory_suggestion_refs: functionalRefArray,
    recheck_request_refs: functionalRefArray,
    workflow_profile_key: stringId,
    workflow_profile_version: nullableStringId,
    provider_id: nullableStringId,
    model_id: nullableStringId,
    prompt_template_id: nullableStringId,
    prompt_template_version: nullableStringId,
    topic_value_input_snapshot_id: nullableStringId,
    input_snapshot_id: nullableStringId,
    workflow_run_id: nullableStringId,
    gate_result_id: nullableStringId,
    transition_attempt_id: nullableStringId,
    artifact_refs: functionalRefArray,
    quality_flags: stringArray,
    failure_reason: nullableStringId,
    created_at: stringId,
    updated_at: stringId,
  },
} as const;

export const topicSelectionTopicValueAssessmentInputSnapshotRecordSchema = {
  type: 'object',
  additionalProperties: true,
  required: [
    'topic_value_input_snapshot_id',
    'title_card_id',
    'topic_question_contract_id',
    'topic_question_id',
    'research_slice_id',
    'research_slice_version',
    'topic_question_ref',
    'topic_question_contract_ref',
    'answerability_plan_ref',
    'research_slice_ref',
    'validated_need_refs',
    'evidence_refs',
    'need_refs',
    'boundary_refs',
    'assumption_refs',
    'falsification_conditions',
    'accepted_risk_refs',
    'memory_suggestion_refs',
    'recheck_request_refs',
    'question_contract',
    'answerability_plan',
    'research_slice_snapshot',
    'snapshot_hash',
    'created_at',
  ],
  properties: {
    topic_value_input_snapshot_id: stringId,
    workspace_id: nullableStringId,
    title_card_id: stringId,
    topic_question_contract_id: stringId,
    topic_question_id: stringId,
    research_slice_id: stringId,
    research_slice_version: stringId,
    topic_question_ref: topicSelectionFunctionalRefSchema,
    topic_question_contract_ref: topicSelectionFunctionalRefSchema,
    answerability_plan_ref: topicSelectionFunctionalRefSchema,
    research_slice_ref: topicSelectionFunctionalRefSchema,
    validated_need_refs: functionalRefArray,
    evidence_refs: { type: 'array', items: objectPayload },
    need_refs: { type: 'array', items: objectPayload },
    boundary_refs: { type: 'array', items: objectPayload },
    assumption_refs: { type: 'array', items: objectPayload },
    falsification_conditions: { type: 'array', items: objectPayload },
    accepted_risk_refs: functionalRefArray,
    memory_suggestion_refs: functionalRefArray,
    recheck_request_refs: functionalRefArray,
    question_contract: objectPayload,
    answerability_plan: objectPayload,
    research_slice_snapshot: objectPayload,
    snapshot_hash: stringId,
    control_plane_input_snapshot_id: nullableStringId,
    created_at: stringId,
  },
} as const;

export const topicSelectionTopicValueAssessmentRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'topic_value_assessment_id',
    'title_card_id',
    'topic_question_id',
    'topic_question_contract_id',
    'research_record_id',
    'source_research_slice_id',
    'source_research_slice_version',
    'assess_topic_value_run_id',
    'topic_value_input_snapshot_id',
    'value_reasoning_memo_id',
    'readiness_status',
    'freshness_status',
    'strongest_claim_if_success',
    'hard_gates',
    'dimension_scores',
    'risk_penalty',
    'reviewer_objections',
    'ceiling_case',
    'base_case',
    'floor_case',
    'legacy_verdict',
    'total_score',
    'value_summary',
    'confidence',
    'accepted_risk_refs',
    'blocker_refs',
    'risk_notes',
    'artifact_refs',
    'created_at',
    'updated_at',
  ],
  properties: {
    topic_value_assessment_id: stringId,
    workspace_id: nullableStringId,
    title_card_id: stringId,
    topic_question_id: stringId,
    topic_question_contract_id: stringId,
    research_record_id: stringId,
    source_research_slice_id: stringId,
    source_research_slice_version: stringId,
    assess_topic_value_run_id: stringId,
    topic_value_input_snapshot_id: stringId,
    value_reasoning_memo_id: stringId,
    active_disposition_decision_id: nullableStringId,
    readiness_status: { enum: [...TOPIC_SELECTION_TOPIC_VALUE_READINESS_STATUSES] },
    freshness_status: { enum: ['current', 'recheck_required', 'stale', 'superseded'] },
    strongest_claim_if_success: stringId,
    fallback_claim_if_success: { anyOf: [stringValue, { type: 'null' }] },
    hard_gates: topicSelectionTopicValueGateResultArraySchema,
    dimension_scores: topicSelectionTopicValueDimensionScoreArraySchema,
    risk_penalty: objectPayload,
    reviewer_objections: stringArray,
    ceiling_case: stringId,
    base_case: stringId,
    floor_case: stringId,
    legacy_verdict: { enum: ['promote', 'refine', 'park', 'drop'] },
    total_score: { type: 'number', minimum: 0, maximum: 100 },
    value_summary: stringId,
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    accepted_risk_refs: functionalRefArray,
    blocker_refs: functionalRefArray,
    risk_notes: stringArray,
    trace_snapshot_id: nullableStringId,
    workflow_run_id: nullableStringId,
    gate_result_id: nullableStringId,
    transition_attempt_id: nullableStringId,
    artifact_refs: functionalRefArray,
    risk_finding_refs: functionalRefArray,
    created_at: stringId,
    updated_at: stringId,
  },
} as const;

export const topicSelectionValueReasoningMemoRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'value_reasoning_memo_id',
    'title_card_id',
    'topic_value_assessment_id',
    'topic_question_contract_id',
    'recommendation',
    'value_thesis',
    'significance',
    'originality',
    'claim_leverage',
    'reviewer_risks',
    'effort_to_value',
    'strategic_fit',
    'negative_memory_check',
    'evidence_backed_rationale',
    'top_objections',
    'uncertainty',
    'disposition_bridge',
    'requires_critic_review',
    'critic_triggers',
    'cited_refs',
    'artifact_refs',
    'created_at',
  ],
  properties: {
    value_reasoning_memo_id: stringId,
    workspace_id: nullableStringId,
    title_card_id: stringId,
    topic_value_assessment_id: stringId,
    topic_question_contract_id: stringId,
    recommendation: { enum: [...TOPIC_SELECTION_VALUE_DISPOSITIONS] },
    value_thesis: stringId,
    significance: stringId,
    originality: stringId,
    claim_leverage: stringId,
    reviewer_risks: stringArray,
    effort_to_value: stringId,
    strategic_fit: stringId,
    negative_memory_check: stringId,
    evidence_backed_rationale: stringId,
    top_objections: stringArray,
    uncertainty: stringId,
    disposition_bridge: stringId,
    requires_critic_review: booleanValue,
    critic_triggers: stringArray,
    cited_refs: functionalRefArray,
    created_by_workflow_run_id: nullableStringId,
    artifact_refs: functionalRefArray,
    risk_finding_refs: functionalRefArray,
    created_at: stringId,
  },
} as const;

export const topicSelectionTopicValueEvidenceRefRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'topic_value_evidence_ref_id',
    'title_card_id',
    'topic_value_assessment_id',
    'topic_question_contract_id',
    'evidence_ref',
    'evidence_role',
    'value_use',
    'rationale',
    'created_at',
  ],
  properties: {
    topic_value_evidence_ref_id: stringId,
    workspace_id: nullableStringId,
    title_card_id: stringId,
    topic_value_assessment_id: stringId,
    topic_question_contract_id: stringId,
    evidence_ref: topicSelectionFunctionalRefSchema,
    evidence_role: stringId,
    value_use: stringId,
    rationale: stringId,
    created_at: stringId,
  },
} as const;

export const topicSelectionV1bPackageDraftInputSchema = {
  type: 'object',
  additionalProperties: true,
  required: [
    'topic_value_assessment_ref',
    'value_reasoning_memo_ref',
    'value_disposition_decision_ref',
    'topic_question_ref',
    'topic_question_contract_ref',
    'answerability_plan_ref',
    'research_slice_ref',
    'validated_need_refs',
    'evidence_refs',
    'boundary_refs',
    'assumption_refs',
    'falsification_conditions',
    'accepted_risk_refs',
    'memory_suggestion_refs',
    'recheck_request_refs',
    'topic_value_assessment',
    'value_reasoning_memo',
    'value_disposition_decision',
    'question_contract',
    'answerability_plan',
    'research_slice_snapshot',
  ],
  properties: {
    topic_value_assessment_ref: topicSelectionFunctionalRefSchema,
    value_reasoning_memo_ref: topicSelectionFunctionalRefSchema,
    value_disposition_decision_ref: topicSelectionFunctionalRefSchema,
    topic_question_ref: topicSelectionFunctionalRefSchema,
    topic_question_contract_ref: topicSelectionFunctionalRefSchema,
    answerability_plan_ref: topicSelectionFunctionalRefSchema,
    research_slice_ref: topicSelectionFunctionalRefSchema,
    validated_need_refs: functionalRefArray,
    evidence_refs: { type: 'array', items: objectPayload },
    boundary_refs: { type: 'array', items: objectPayload },
    assumption_refs: { type: 'array', items: objectPayload },
    falsification_conditions: { type: 'array', items: objectPayload },
    accepted_risk_refs: functionalRefArray,
    risk_finding_refs: functionalRefArray,
    memory_suggestion_refs: functionalRefArray,
    recheck_request_refs: functionalRefArray,
    topic_value_assessment: topicSelectionTopicValueAssessmentRecordSchema,
    value_reasoning_memo: topicSelectionValueReasoningMemoRecordSchema,
    value_disposition_decision: objectPayload,
    question_contract: objectPayload,
    answerability_plan: objectPayload,
    research_slice_snapshot: objectPayload,
  },
} as const;

export const topicSelectionValueDispositionDecisionRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'value_disposition_decision_id',
    'title_card_id',
    'topic_value_assessment_id',
    'topic_question_contract_id',
    'value_reasoning_memo_id',
    'decision',
    'decided_by',
    'decision_rationale',
    'required_actions',
    'blocking_contexts',
    'accepted_risk_refs',
    'blocker_refs',
    'status',
    'is_current',
    'artifact_refs',
    'created_at',
  ],
  properties: {
    value_disposition_decision_id: stringId,
    workspace_id: nullableStringId,
    title_card_id: stringId,
    topic_value_assessment_id: stringId,
    topic_question_contract_id: stringId,
    value_reasoning_memo_id: stringId,
    decision: { enum: [...TOPIC_SELECTION_VALUE_DISPOSITIONS] },
    decided_by: stringId,
    decision_rationale: stringId,
    required_actions: stringArray,
    loopback_target_ref: nullableFunctionalRef,
    blocking_contexts: objectArray,
    accepted_risk_refs: functionalRefArray,
    blocker_refs: functionalRefArray,
    package_draft_input: { anyOf: [topicSelectionV1bPackageDraftInputSchema, { type: 'null' }] },
    output_topic_package_id: nullableStringId,
    status: { enum: [...TOPIC_SELECTION_VALUE_DISPOSITION_STATUSES] },
    is_current: booleanValue,
    input_snapshot_id: nullableStringId,
    workflow_run_id: nullableStringId,
    gate_result_id: nullableStringId,
    transition_attempt_id: nullableStringId,
    artifact_refs: functionalRefArray,
    risk_finding_refs: functionalRefArray,
    created_at: stringId,
  },
} as const;

export const topicSelectionAssessTopicValueLlmOutputSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'readiness_status',
    'strongest_claim_if_success',
    'hard_gates',
    'dimension_scores',
    'risk_penalty',
    'reviewer_objections',
    'ceiling_case',
    'base_case',
    'floor_case',
    'recommended_disposition',
    'total_score',
    'value_summary',
    'confidence',
    'accepted_risk_refs',
    'blocker_refs',
    'risk_notes',
    'reasoning_memo',
  ],
  properties: {
    readiness_status: { enum: [...TOPIC_SELECTION_TOPIC_VALUE_READINESS_STATUSES] },
    strongest_claim_if_success: stringId,
    fallback_claim_if_success: { anyOf: [stringValue, { type: 'null' }] },
    hard_gates: topicSelectionTopicValueGateResultArraySchema,
    dimension_scores: topicSelectionTopicValueDimensionScoreArraySchema,
    risk_penalty: objectPayload,
    reviewer_objections: stringArray,
    ceiling_case: stringId,
    base_case: stringId,
    floor_case: stringId,
    recommended_disposition: { enum: [...TOPIC_SELECTION_VALUE_DISPOSITIONS] },
    total_score: { type: 'number', minimum: 0, maximum: 100 },
    value_summary: stringId,
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    accepted_risk_refs: functionalRefArray,
    blocker_refs: functionalRefArray,
    risk_notes: stringArray,
    reasoning_memo: {
      type: 'object',
      additionalProperties: false,
      required: [
        'recommendation',
        'value_thesis',
        'significance',
        'originality',
        'claim_leverage',
        'reviewer_risks',
        'effort_to_value',
        'strategic_fit',
        'negative_memory_check',
        'evidence_backed_rationale',
        'top_objections',
        'uncertainty',
        'disposition_bridge',
        'requires_critic_review',
        'critic_triggers',
        'cited_refs',
      ],
      properties: {
        recommendation: { enum: [...TOPIC_SELECTION_VALUE_DISPOSITIONS] },
        value_thesis: stringId,
        significance: stringId,
        originality: stringId,
        claim_leverage: stringId,
        reviewer_risks: stringArray,
        effort_to_value: stringId,
        strategic_fit: stringId,
        negative_memory_check: stringId,
        evidence_backed_rationale: stringId,
        top_objections: stringArray,
        uncertainty: stringId,
        disposition_bridge: stringId,
        requires_critic_review: booleanValue,
        critic_triggers: stringArray,
        cited_refs: functionalRefArray,
      },
    },
  },
} as const;
