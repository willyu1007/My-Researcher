import {
  topicSelectionFunctionalRefSchema,
  type TopicSelectionActorType,
  type TopicSelectionFunctionalRef,
} from './topic-selection-control-plane-contracts.js';
import {
  topicSelectionCandidatePortfolioDispositionSchema,
  type TopicSelectionCandidatePortfolioDisposition,
} from './topic-selection-need-validation-contracts.js';

export const TOPIC_SELECTION_FORM_TOPIC_QUESTION_RUN_STATUSES = [
  'queued',
  'running',
  'succeeded',
  'failed',
  'blocked',
  'cancelled',
] as const;
export type TopicSelectionFormTopicQuestionRunStatus =
  (typeof TOPIC_SELECTION_FORM_TOPIC_QUESTION_RUN_STATUSES)[number];

export const TOPIC_SELECTION_TOPIC_QUESTION_CANDIDATE_SET_STATUSES = [
  'draft',
  'ready_for_selection',
  'selected',
  'parked',
  'rejected',
  'no_admissible_candidate',
  'recheck_required',
] as const;
export type TopicSelectionTopicQuestionCandidateSetStatus =
  (typeof TOPIC_SELECTION_TOPIC_QUESTION_CANDIDATE_SET_STATUSES)[number];

export const TOPIC_SELECTION_TOPIC_QUESTION_CANDIDATE_STATUSES = [
  'candidate',
  'recommended',
  'admitted',
  'merged',
  'parked',
  'rejected',
  'blocked',
] as const;
export type TopicSelectionTopicQuestionCandidateStatus =
  (typeof TOPIC_SELECTION_TOPIC_QUESTION_CANDIDATE_STATUSES)[number];

export const TOPIC_SELECTION_TOPIC_QUESTION_SELECTION_DECISIONS = [
  'admit',
  'admit_multiple',
  'merge_then_admit',
  'park',
  'reject_all',
  'no_admissible_candidate',
] as const;
export type TopicSelectionTopicQuestionSelectionDecision =
  (typeof TOPIC_SELECTION_TOPIC_QUESTION_SELECTION_DECISIONS)[number];

export const TOPIC_SELECTION_TOPIC_QUESTION_TYPES = [
  'method',
  'benchmark',
  'analysis',
  'resource',
  'system',
] as const;
export type TopicSelectionTopicQuestionType =
  (typeof TOPIC_SELECTION_TOPIC_QUESTION_TYPES)[number];

export const TOPIC_SELECTION_TOPIC_QUESTION_ANSWERABILITY_VERDICTS = [
  'answerable',
  'answerable_with_risk',
  'needs_slice_refinement',
  'not_answerable',
] as const;
export type TopicSelectionTopicQuestionAnswerabilityVerdict =
  (typeof TOPIC_SELECTION_TOPIC_QUESTION_ANSWERABILITY_VERDICTS)[number];

export const TOPIC_SELECTION_TOPIC_QUESTION_STATUSES = [
  'active',
  'needs_slice_revision',
  'parked',
  'rejected',
  'recheck_required',
  'superseded',
] as const;
export type TopicSelectionTopicQuestionStatus =
  (typeof TOPIC_SELECTION_TOPIC_QUESTION_STATUSES)[number];

export const TOPIC_SELECTION_TOPIC_QUESTION_CONTRACT_STATUSES = [
  'active',
  'stale',
  'recheck_required',
  'superseded',
] as const;
export type TopicSelectionTopicQuestionContractStatus =
  (typeof TOPIC_SELECTION_TOPIC_QUESTION_CONTRACT_STATUSES)[number];

export const TOPIC_SELECTION_TOPIC_QUESTION_NEED_ROLES = [
  'primary',
  'supporting',
  'background',
] as const;
export type TopicSelectionTopicQuestionNeedRole =
  (typeof TOPIC_SELECTION_TOPIC_QUESTION_NEED_ROLES)[number];

export const TOPIC_SELECTION_TOPIC_QUESTION_EVIDENCE_ROLES = [
  'support',
  'challenge',
  'claim',
  'baseline',
  'context',
] as const;
export type TopicSelectionTopicQuestionEvidenceRole =
  (typeof TOPIC_SELECTION_TOPIC_QUESTION_EVIDENCE_ROLES)[number];

export const TOPIC_SELECTION_TOPIC_QUESTION_BOUNDARY_KINDS = [
  'preserved',
  'excluded',
  'violated',
] as const;
export type TopicSelectionTopicQuestionBoundaryKind =
  (typeof TOPIC_SELECTION_TOPIC_QUESTION_BOUNDARY_KINDS)[number];

export const TOPIC_SELECTION_TOPIC_QUESTION_ASSUMPTION_TYPES = [
  'resource',
  'data',
  'baseline',
  'evaluation',
  'dependency',
  'method',
] as const;
export type TopicSelectionTopicQuestionAssumptionType =
  (typeof TOPIC_SELECTION_TOPIC_QUESTION_ASSUMPTION_TYPES)[number];

export const TOPIC_SELECTION_TOPIC_QUESTION_RISK_LEVELS = [
  'low',
  'medium',
  'high',
  'unknown',
] as const;
export type TopicSelectionTopicQuestionRiskLevel =
  (typeof TOPIC_SELECTION_TOPIC_QUESTION_RISK_LEVELS)[number];

export const TOPIC_SELECTION_TOPIC_QUESTION_FALSIFICATION_CONDITION_TYPES = [
  'solved_by_baseline',
  'contradicted_by_evidence',
  'out_of_boundary',
  'data_unavailable',
  'baseline_unreproducible',
  'metric_invalid',
  'evaluation_infeasible',
  'claim_overstrong',
  'resource_blocked',
  'need_invalidated',
] as const;
export type TopicSelectionTopicQuestionFalsificationConditionType =
  (typeof TOPIC_SELECTION_TOPIC_QUESTION_FALSIFICATION_CONDITION_TYPES)[number];

export const TOPIC_SELECTION_TOPIC_QUESTION_FALSIFICATION_SEVERITIES = [
  'hard',
  'soft',
  'answerability',
] as const;
export type TopicSelectionTopicQuestionFalsificationSeverity =
  (typeof TOPIC_SELECTION_TOPIC_QUESTION_FALSIFICATION_SEVERITIES)[number];

export const TOPIC_SELECTION_TOPIC_QUESTION_FALSIFICATION_ACTIONS = [
  'revise_question',
  'revise_slice',
  'recheck_evidence',
  'lower_claim_strength',
  'park',
  'drop',
] as const;
export type TopicSelectionTopicQuestionFalsificationAction =
  (typeof TOPIC_SELECTION_TOPIC_QUESTION_FALSIFICATION_ACTIONS)[number];

export const TOPIC_SELECTION_TOPIC_QUESTION_FALSIFICATION_CHECK_TIMINGS = [
  'before_value_assessment',
  'during_value_assessment',
  'before_package',
  'before_promotion',
  'on_new_evidence',
] as const;
export type TopicSelectionTopicQuestionFalsificationCheckTiming =
  (typeof TOPIC_SELECTION_TOPIC_QUESTION_FALSIFICATION_CHECK_TIMINGS)[number];

export const TOPIC_SELECTION_TOPIC_QUESTION_FALSIFICATION_STATUSES = [
  'active',
  'triggered',
  'resolved',
  'superseded',
] as const;
export type TopicSelectionTopicQuestionFalsificationStatus =
  (typeof TOPIC_SELECTION_TOPIC_QUESTION_FALSIFICATION_STATUSES)[number];

export interface TopicSelectionQuestionFrameDraft {
  target_setting: string;
  target_community: string;
  object_scope: string;
  task_scope: string;
  intervention_or_approach: string;
  comparison_baseline: string;
  observable_outcome: string;
  assumption_refs: TopicSelectionFunctionalRef[];
  evidence_refs: TopicSelectionFunctionalRef[];
  frame_payload: Record<string, unknown>;
}

export interface TopicSelectionTopicQuestionAnswerabilityPlanDraft {
  datasets_or_resources: string[];
  metrics: string[];
  baselines: string[];
  ablations_or_comparisons: string[];
  evaluation_setting: string;
  dependency_risks: string[];
  open_dependencies: string[];
  known_gaps: string[];
  required_evidence_refs: TopicSelectionFunctionalRef[];
}

export interface TopicSelectionTopicQuestionBoundaryCheckDraft {
  preserved_boundary_refs: TopicSelectionFunctionalRef[];
  excluded_boundary_refs: TopicSelectionFunctionalRef[];
  boundary_violations: string[];
  prohibited_claims: string[];
  allowed_refinements: string[];
}

export interface TopicSelectionTopicQuestionTraceabilityCheckDraft {
  support_evidence_refs: TopicSelectionFunctionalRef[];
  challenge_evidence_refs: TopicSelectionFunctionalRef[];
  baseline_evidence_refs: TopicSelectionFunctionalRef[];
  context_evidence_refs: TopicSelectionFunctionalRef[];
  mapped_evidence_refs: TopicSelectionFunctionalRef[];
  unmapped_assumptions: string[];
}

export interface TopicSelectionTopicQuestionFalsificationConditionDraft {
  condition_type: TopicSelectionTopicQuestionFalsificationConditionType;
  severity: TopicSelectionTopicQuestionFalsificationSeverity;
  statement: string;
  trigger_evidence_refs: TopicSelectionFunctionalRef[];
  trigger_source_refs: TopicSelectionFunctionalRef[];
  related_contract_fields: string[];
  expected_action: TopicSelectionTopicQuestionFalsificationAction;
  check_timing: TopicSelectionTopicQuestionFalsificationCheckTiming;
  confidence: 'low' | 'medium' | 'high';
}

export interface TopicSelectionTopicQuestionCandidateDraft {
  candidate_key: string;
  main_question: string;
  sub_questions: string[];
  question_type: TopicSelectionTopicQuestionType;
  contribution_hypothesis: TopicSelectionTopicQuestionType;
  source_validated_need_refs: TopicSelectionFunctionalRef[];
  answerability_plan: TopicSelectionTopicQuestionAnswerabilityPlanDraft;
  answerability_verdict: TopicSelectionTopicQuestionAnswerabilityVerdict;
  expected_claim: string;
  fallback_claim: string;
  max_claim_strength: string;
  observable_success_criteria: string[];
  boundary_check: TopicSelectionTopicQuestionBoundaryCheckDraft;
  traceability_check: TopicSelectionTopicQuestionTraceabilityCheckDraft;
  falsification_conditions: TopicSelectionTopicQuestionFalsificationConditionDraft[];
  risk_notes: string[];
  blockers: string[];
  objections: string[];
  human_review_triggers: string[];
  confidence?: number | null;
}

export interface TopicSelectionFormTopicQuestionLlmOutput {
  question_frame: TopicSelectionQuestionFrameDraft;
  recommended_candidate_keys: string[];
  generation_notes: string[];
  human_review_triggers: string[];
  candidates: TopicSelectionTopicQuestionCandidateDraft[];
  portfolio_disposition?: TopicSelectionCandidatePortfolioDisposition | null;
}

export interface TopicSelectionFormTopicQuestionRunRecord {
  form_topic_question_run_id: string;
  workspace_id?: string | null;
  title_card_id: string;
  research_slice_id: string;
  research_slice_version: string;
  status: TopicSelectionFormTopicQuestionRunStatus;
  triggered_by: TopicSelectionActorType;
  research_slice_ref: TopicSelectionFunctionalRef;
  slice_selection_decision_ref: TopicSelectionFunctionalRef;
  source_option_set_ref: TopicSelectionFunctionalRef;
  source_option_ref: TopicSelectionFunctionalRef;
  validated_need_ref: TopicSelectionFunctionalRef;
  v1b_intake_snapshot_ref: TopicSelectionFunctionalRef;
  research_constraint_profile_ref: TopicSelectionFunctionalRef;
  readiness_assessment_ref: TopicSelectionFunctionalRef;
  evidence_map_ref: TopicSelectionFunctionalRef;
  search_run_ref: TopicSelectionFunctionalRef;
  search_plan_ref: TopicSelectionFunctionalRef;
  literature_snapshot_ref: TopicSelectionFunctionalRef;
  accepted_risk_refs: TopicSelectionFunctionalRef[];
  memory_suggestion_refs: TopicSelectionFunctionalRef[];
  recheck_request_refs: TopicSelectionFunctionalRef[];
  gap_codes: string[];
  workflow_profile_key: string;
  workflow_profile_version?: string | null;
  provider_id?: string | null;
  model_id?: string | null;
  prompt_template_id?: string | null;
  prompt_template_version?: string | null;
  input_snapshot_id?: string | null;
  workflow_run_id?: string | null;
  question_frame_id?: string | null;
  candidate_set_id?: string | null;
  artifact_refs: TopicSelectionFunctionalRef[];
  quality_flags: string[];
  failure_reason?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TopicSelectionQuestionFrameRecord extends TopicSelectionQuestionFrameDraft {
  question_frame_id: string;
  workspace_id?: string | null;
  title_card_id: string;
  form_topic_question_run_id: string;
  research_slice_id: string;
  research_slice_version: string;
  source_validated_need_refs: TopicSelectionFunctionalRef[];
  checksum: string;
  created_at: string;
}

export interface TopicSelectionTopicQuestionCandidateSetRecord {
  topic_question_candidate_set_id: string;
  workspace_id?: string | null;
  title_card_id: string;
  form_topic_question_run_id: string;
  question_frame_id: string;
  research_slice_id: string;
  research_slice_version: string;
  status: TopicSelectionTopicQuestionCandidateSetStatus;
  candidate_count: number;
  recommended_candidate_ids: string[];
  admission_readiness: Record<string, unknown>;
  hard_blockers: string[];
  human_review_triggers: string[];
  generation_notes: string[];
  input_snapshot_id?: string | null;
  workflow_run_id?: string | null;
  artifact_refs: TopicSelectionFunctionalRef[];
  created_at: string;
  updated_at: string;
}

export interface TopicSelectionTopicQuestionCandidateRecord {
  topic_question_candidate_id: string;
  workspace_id?: string | null;
  title_card_id: string;
  candidate_set_id: string;
  question_frame_id: string;
  research_slice_id: string;
  research_slice_version: string;
  candidate_ordinal: number;
  candidate_key: string;
  status: TopicSelectionTopicQuestionCandidateStatus;
  main_question: string;
  sub_questions: string[];
  question_type: TopicSelectionTopicQuestionType;
  contribution_hypothesis: TopicSelectionTopicQuestionType;
  source_validated_need_refs: TopicSelectionFunctionalRef[];
  answerability_verdict: TopicSelectionTopicQuestionAnswerabilityVerdict;
  answerability_plan_payload: TopicSelectionTopicQuestionAnswerabilityPlanDraft;
  boundary_check_payload: TopicSelectionTopicQuestionBoundaryCheckDraft;
  traceability_check_payload: TopicSelectionTopicQuestionTraceabilityCheckDraft;
  expected_claim: string;
  fallback_claim: string;
  max_claim_strength: string;
  observable_success_criteria: string[];
  falsification_conditions_payload: TopicSelectionTopicQuestionFalsificationConditionDraft[];
  risk_notes: string[];
  blockers: string[];
  objections: string[];
  human_review_triggers: string[];
  confidence?: number | null;
  created_at: string;
}

export interface TopicSelectionTopicQuestionSelectionDecisionRecord {
  topic_question_selection_decision_id: string;
  workspace_id?: string | null;
  title_card_id: string;
  candidate_set_id: string;
  form_topic_question_run_id: string;
  research_slice_id: string;
  research_slice_version: string;
  input_snapshot_ref: TopicSelectionFunctionalRef;
  decision: TopicSelectionTopicQuestionSelectionDecision;
  decided_by: TopicSelectionActorType;
  selection_policy_version: string;
  admitted_candidate_ids: string[];
  created_topic_question_ids: string[];
  merged_candidate_groups: Record<string, unknown>[];
  hard_gate_results: Record<string, unknown>[];
  admission_review: Record<string, unknown>;
  candidate_relationships: Record<string, unknown>;
  priority_order: string[];
  rejected_candidate_reasons: Record<string, unknown>[];
  blocking_contexts: Record<string, unknown>[];
  decision_rationale: string;
  requires_human_review: boolean;
  human_review_triggers: string[];
  accepted_risk_refs: TopicSelectionFunctionalRef[];
  confidence?: number | null;
  input_snapshot_id?: string | null;
  workflow_run_id?: string | null;
  gate_result_id?: string | null;
  transition_attempt_id?: string | null;
  artifact_refs: TopicSelectionFunctionalRef[];
  created_at: string;
}

export interface TopicSelectionTopicQuestionRecord {
  topic_question_id: string;
  workspace_id?: string | null;
  title_card_id: string;
  research_record_id: string;
  research_slice_id: string;
  research_slice_version: string;
  source_validated_need_ids: string[];
  source_candidate_set_id: string;
  source_candidate_id: string;
  selection_decision_id: string;
  active_question_contract_id: string;
  main_question: string;
  sub_questions: string[];
  question_type: TopicSelectionTopicQuestionType;
  contribution_hypothesis: TopicSelectionTopicQuestionType;
  status: TopicSelectionTopicQuestionStatus;
  created_at: string;
  updated_at: string;
}

export interface TopicSelectionTopicQuestionContractRecord {
  topic_question_contract_id: string;
  workspace_id?: string | null;
  title_card_id: string;
  topic_question_id: string;
  version: string;
  answerability_plan_id: string;
  source_research_slice_id: string;
  source_research_slice_version: string;
  source_candidate_id: string;
  selection_decision_id: string;
  input_snapshot_ref: TopicSelectionFunctionalRef;
  contract_hash: string;
  main_question: string;
  question_type: TopicSelectionTopicQuestionType;
  contribution_hypothesis: TopicSelectionTopicQuestionType;
  target_setting: string;
  target_community: string;
  expected_claim: string;
  fallback_claim: string;
  max_claim_strength: string;
  evaluation_route: string;
  claim_ceiling: string;
  prohibited_claims: string[];
  required_evidence_categories: string[];
  allowed_refinements: string[];
  stop_reopen_conditions: string[];
  accepted_risk_refs: TopicSelectionFunctionalRef[];
  risk_notes: string[];
  status: TopicSelectionTopicQuestionContractStatus;
  created_by_workflow_run_id?: string | null;
  artifact_refs: TopicSelectionFunctionalRef[];
  created_at: string;
  updated_at: string;
}

export interface TopicSelectionTopicQuestionAnswerabilityPlanRecord {
  topic_question_answerability_plan_id: string;
  workspace_id?: string | null;
  title_card_id: string;
  topic_question_id: string;
  topic_question_contract_id: string;
  answerability_verdict: TopicSelectionTopicQuestionAnswerabilityVerdict;
  datasets_or_resources: string[];
  metrics: string[];
  baselines: string[];
  ablations_or_comparisons: string[];
  evaluation_setting: string;
  dependency_risks: string[];
  open_dependencies: string[];
  known_gaps: string[];
  required_evidence_refs: TopicSelectionFunctionalRef[];
  created_at: string;
}

export interface TopicSelectionTopicQuestionNeedRefRecord {
  topic_question_need_ref_id: string;
  workspace_id?: string | null;
  title_card_id: string;
  topic_question_id: string;
  topic_question_contract_id: string;
  validated_need_ref: TopicSelectionFunctionalRef;
  source_need_candidate_ref?: TopicSelectionFunctionalRef | null;
  role: TopicSelectionTopicQuestionNeedRole;
  inherited_from_research_slice_id: string;
  coverage_note: string;
  created_at: string;
}

export interface TopicSelectionTopicQuestionEvidenceRefRecord {
  topic_question_evidence_ref_id: string;
  workspace_id?: string | null;
  title_card_id: string;
  topic_question_id: string;
  topic_question_contract_id: string;
  evidence_ref: TopicSelectionFunctionalRef;
  evidence_role: TopicSelectionTopicQuestionEvidenceRole;
  mapped_question_part: string;
  rationale: string;
  source_locator_snapshot: Record<string, unknown>;
  created_at: string;
}

export interface TopicSelectionTopicQuestionBoundaryRefRecord {
  topic_question_boundary_ref_id: string;
  workspace_id?: string | null;
  title_card_id: string;
  topic_question_id: string;
  topic_question_contract_id: string;
  research_slice_boundary_id: string;
  boundary_kind: TopicSelectionTopicQuestionBoundaryKind;
  question_part: string;
  note: string;
  created_at: string;
}

export interface TopicSelectionTopicQuestionAssumptionRefRecord {
  topic_question_assumption_ref_id: string;
  workspace_id?: string | null;
  title_card_id: string;
  topic_question_id: string;
  topic_question_contract_id: string;
  assumption_type: TopicSelectionTopicQuestionAssumptionType;
  statement: string;
  source_assumption_id?: string | null;
  evidence_refs: TopicSelectionFunctionalRef[];
  risk_level: TopicSelectionTopicQuestionRiskLevel;
  status: string;
  created_at: string;
}

export interface TopicSelectionTopicQuestionFalsificationConditionRecord {
  topic_question_falsification_condition_id: string;
  workspace_id?: string | null;
  title_card_id: string;
  topic_question_contract_id: string;
  condition_type: TopicSelectionTopicQuestionFalsificationConditionType;
  severity: TopicSelectionTopicQuestionFalsificationSeverity;
  statement: string;
  trigger_evidence_refs: TopicSelectionFunctionalRef[];
  trigger_source_refs: TopicSelectionFunctionalRef[];
  related_contract_fields: string[];
  expected_action: TopicSelectionTopicQuestionFalsificationAction;
  check_timing: TopicSelectionTopicQuestionFalsificationCheckTiming;
  confidence: 'low' | 'medium' | 'high';
  status: TopicSelectionTopicQuestionFalsificationStatus;
  created_at: string;
}

export interface TopicSelectionV1bTopicQuestionMaterialization {
  topic_question: TopicSelectionTopicQuestionRecord;
  topic_question_contract: TopicSelectionTopicQuestionContractRecord;
  answerability_plan: TopicSelectionTopicQuestionAnswerabilityPlanRecord;
  need_refs: TopicSelectionTopicQuestionNeedRefRecord[];
  evidence_refs: TopicSelectionTopicQuestionEvidenceRefRecord[];
  boundary_refs: TopicSelectionTopicQuestionBoundaryRefRecord[];
  assumption_refs: TopicSelectionTopicQuestionAssumptionRefRecord[];
  falsification_conditions: TopicSelectionTopicQuestionFalsificationConditionRecord[];
}

export interface TopicSelectionV1bValueAssessmentInput {
  topic_question_ref: TopicSelectionFunctionalRef;
  topic_question_contract_ref: TopicSelectionFunctionalRef;
  answerability_plan_ref: TopicSelectionFunctionalRef;
  research_slice_ref: TopicSelectionFunctionalRef;
  selection_decision_ref: TopicSelectionFunctionalRef;
  candidate_set_ref: TopicSelectionFunctionalRef;
  source_candidate_ref: TopicSelectionFunctionalRef;
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
}

const stringId = { type: 'string', minLength: 1 } as const;
const stringValue = { type: 'string' } as const;
const numberValue = { type: 'number' } as const;
const booleanValue = { type: 'boolean' } as const;
const nullableStringId = { anyOf: [stringId, { type: 'null' }] } as const;
const nullableNumber = { anyOf: [numberValue, { type: 'null' }] } as const;
const stringArray = { type: 'array', items: stringId } as const;
const objectPayload = { type: 'object', additionalProperties: true } as const;
const objectArray = { type: 'array', items: objectPayload } as const;
const functionalRefArray = { type: 'array', items: topicSelectionFunctionalRefSchema } as const;
const nullableFunctionalRef = { anyOf: [topicSelectionFunctionalRefSchema, { type: 'null' }] } as const;

export const topicSelectionTopicQuestionAnswerabilityPlanDraftSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'datasets_or_resources',
    'metrics',
    'baselines',
    'ablations_or_comparisons',
    'evaluation_setting',
    'dependency_risks',
    'open_dependencies',
    'known_gaps',
    'required_evidence_refs',
  ],
  properties: {
    datasets_or_resources: stringArray,
    metrics: stringArray,
    baselines: stringArray,
    ablations_or_comparisons: stringArray,
    evaluation_setting: stringId,
    dependency_risks: stringArray,
    open_dependencies: stringArray,
    known_gaps: stringArray,
    required_evidence_refs: functionalRefArray,
  },
} as const;

export const topicSelectionTopicQuestionBoundaryCheckDraftSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'preserved_boundary_refs',
    'excluded_boundary_refs',
    'boundary_violations',
    'prohibited_claims',
    'allowed_refinements',
  ],
  properties: {
    preserved_boundary_refs: functionalRefArray,
    excluded_boundary_refs: functionalRefArray,
    boundary_violations: stringArray,
    prohibited_claims: stringArray,
    allowed_refinements: stringArray,
  },
} as const;

export const topicSelectionTopicQuestionTraceabilityCheckDraftSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'support_evidence_refs',
    'challenge_evidence_refs',
    'baseline_evidence_refs',
    'context_evidence_refs',
    'mapped_evidence_refs',
    'unmapped_assumptions',
  ],
  properties: {
    support_evidence_refs: functionalRefArray,
    challenge_evidence_refs: functionalRefArray,
    baseline_evidence_refs: functionalRefArray,
    context_evidence_refs: functionalRefArray,
    mapped_evidence_refs: functionalRefArray,
    unmapped_assumptions: stringArray,
  },
} as const;

export const topicSelectionTopicQuestionFalsificationConditionDraftSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'condition_type',
    'severity',
    'statement',
    'trigger_evidence_refs',
    'trigger_source_refs',
    'related_contract_fields',
    'expected_action',
    'check_timing',
    'confidence',
  ],
  properties: {
    condition_type: { enum: [...TOPIC_SELECTION_TOPIC_QUESTION_FALSIFICATION_CONDITION_TYPES] },
    severity: { enum: [...TOPIC_SELECTION_TOPIC_QUESTION_FALSIFICATION_SEVERITIES] },
    statement: stringId,
    trigger_evidence_refs: functionalRefArray,
    trigger_source_refs: functionalRefArray,
    related_contract_fields: stringArray,
    expected_action: { enum: [...TOPIC_SELECTION_TOPIC_QUESTION_FALSIFICATION_ACTIONS] },
    check_timing: { enum: [...TOPIC_SELECTION_TOPIC_QUESTION_FALSIFICATION_CHECK_TIMINGS] },
    confidence: { enum: ['low', 'medium', 'high'] },
  },
} as const;

export const topicSelectionQuestionFrameDraftSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'target_setting',
    'target_community',
    'object_scope',
    'task_scope',
    'intervention_or_approach',
    'comparison_baseline',
    'observable_outcome',
    'assumption_refs',
    'evidence_refs',
    'frame_payload',
  ],
  properties: {
    target_setting: stringId,
    target_community: stringId,
    object_scope: stringId,
    task_scope: stringId,
    intervention_or_approach: stringValue,
    comparison_baseline: stringId,
    observable_outcome: stringId,
    assumption_refs: functionalRefArray,
    evidence_refs: functionalRefArray,
    frame_payload: objectPayload,
  },
} as const;

export const topicSelectionTopicQuestionCandidateDraftSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'candidate_key',
    'main_question',
    'sub_questions',
    'question_type',
    'contribution_hypothesis',
    'source_validated_need_refs',
    'answerability_plan',
    'answerability_verdict',
    'expected_claim',
    'fallback_claim',
    'max_claim_strength',
    'observable_success_criteria',
    'boundary_check',
    'traceability_check',
    'falsification_conditions',
    'risk_notes',
    'blockers',
    'objections',
    'human_review_triggers',
    'confidence',
  ],
  properties: {
    candidate_key: stringId,
    main_question: stringId,
    sub_questions: stringArray,
    question_type: { enum: [...TOPIC_SELECTION_TOPIC_QUESTION_TYPES] },
    contribution_hypothesis: { enum: [...TOPIC_SELECTION_TOPIC_QUESTION_TYPES] },
    source_validated_need_refs: functionalRefArray,
    answerability_plan: topicSelectionTopicQuestionAnswerabilityPlanDraftSchema,
    answerability_verdict: { enum: [...TOPIC_SELECTION_TOPIC_QUESTION_ANSWERABILITY_VERDICTS] },
    expected_claim: stringId,
    fallback_claim: stringId,
    max_claim_strength: stringId,
    observable_success_criteria: stringArray,
    boundary_check: topicSelectionTopicQuestionBoundaryCheckDraftSchema,
    traceability_check: topicSelectionTopicQuestionTraceabilityCheckDraftSchema,
    falsification_conditions: {
      type: 'array',
      items: topicSelectionTopicQuestionFalsificationConditionDraftSchema,
    },
    risk_notes: stringArray,
    blockers: stringArray,
    objections: stringArray,
    human_review_triggers: stringArray,
    confidence: nullableNumber,
  },
} as const;

export const topicSelectionFormTopicQuestionLlmOutputSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'question_frame',
    'recommended_candidate_keys',
    'generation_notes',
    'human_review_triggers',
    'candidates',
  ],
  properties: {
    question_frame: topicSelectionQuestionFrameDraftSchema,
    recommended_candidate_keys: stringArray,
    generation_notes: stringArray,
    human_review_triggers: stringArray,
    portfolio_disposition: {
      anyOf: [topicSelectionCandidatePortfolioDispositionSchema, { type: 'null' }],
    },
    candidates: {
      type: 'array',
      items: topicSelectionTopicQuestionCandidateDraftSchema,
    },
  },
} as const;

export const topicSelectionFormTopicQuestionRunRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'form_topic_question_run_id',
    'title_card_id',
    'research_slice_id',
    'research_slice_version',
    'status',
    'triggered_by',
    'research_slice_ref',
    'slice_selection_decision_ref',
    'source_option_set_ref',
    'source_option_ref',
    'validated_need_ref',
    'v1b_intake_snapshot_ref',
    'research_constraint_profile_ref',
    'readiness_assessment_ref',
    'evidence_map_ref',
    'search_run_ref',
    'search_plan_ref',
    'literature_snapshot_ref',
    'accepted_risk_refs',
    'memory_suggestion_refs',
    'recheck_request_refs',
    'gap_codes',
    'workflow_profile_key',
    'artifact_refs',
    'quality_flags',
    'created_at',
    'updated_at',
  ],
  properties: {
    form_topic_question_run_id: stringId,
    workspace_id: nullableStringId,
    title_card_id: stringId,
    research_slice_id: stringId,
    research_slice_version: stringId,
    status: { enum: [...TOPIC_SELECTION_FORM_TOPIC_QUESTION_RUN_STATUSES] },
    triggered_by: { enum: ['human', 'llm', 'system', 'hybrid'] },
    research_slice_ref: topicSelectionFunctionalRefSchema,
    slice_selection_decision_ref: topicSelectionFunctionalRefSchema,
    source_option_set_ref: topicSelectionFunctionalRefSchema,
    source_option_ref: topicSelectionFunctionalRefSchema,
    validated_need_ref: topicSelectionFunctionalRefSchema,
    v1b_intake_snapshot_ref: topicSelectionFunctionalRefSchema,
    research_constraint_profile_ref: topicSelectionFunctionalRefSchema,
    readiness_assessment_ref: topicSelectionFunctionalRefSchema,
    evidence_map_ref: topicSelectionFunctionalRefSchema,
    search_run_ref: topicSelectionFunctionalRefSchema,
    search_plan_ref: topicSelectionFunctionalRefSchema,
    literature_snapshot_ref: topicSelectionFunctionalRefSchema,
    accepted_risk_refs: functionalRefArray,
    memory_suggestion_refs: functionalRefArray,
    recheck_request_refs: functionalRefArray,
    gap_codes: stringArray,
    workflow_profile_key: stringId,
    workflow_profile_version: nullableStringId,
    provider_id: nullableStringId,
    model_id: nullableStringId,
    prompt_template_id: nullableStringId,
    prompt_template_version: nullableStringId,
    input_snapshot_id: nullableStringId,
    workflow_run_id: nullableStringId,
    question_frame_id: nullableStringId,
    candidate_set_id: nullableStringId,
    artifact_refs: functionalRefArray,
    quality_flags: stringArray,
    failure_reason: nullableStringId,
    created_at: stringId,
    updated_at: stringId,
  },
} as const;

export const topicSelectionQuestionFrameRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'question_frame_id',
    'title_card_id',
    'form_topic_question_run_id',
    'research_slice_id',
    'research_slice_version',
    'source_validated_need_refs',
    'target_setting',
    'target_community',
    'object_scope',
    'task_scope',
    'intervention_or_approach',
    'comparison_baseline',
    'observable_outcome',
    'assumption_refs',
    'evidence_refs',
    'frame_payload',
    'checksum',
    'created_at',
  ],
  properties: {
    question_frame_id: stringId,
    workspace_id: nullableStringId,
    title_card_id: stringId,
    form_topic_question_run_id: stringId,
    research_slice_id: stringId,
    research_slice_version: stringId,
    source_validated_need_refs: functionalRefArray,
    target_setting: stringId,
    target_community: stringId,
    object_scope: stringId,
    task_scope: stringId,
    intervention_or_approach: stringValue,
    comparison_baseline: stringId,
    observable_outcome: stringId,
    assumption_refs: functionalRefArray,
    evidence_refs: functionalRefArray,
    frame_payload: objectPayload,
    checksum: stringId,
    created_at: stringId,
  },
} as const;

export const topicSelectionTopicQuestionCandidateSetRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'topic_question_candidate_set_id',
    'title_card_id',
    'form_topic_question_run_id',
    'question_frame_id',
    'research_slice_id',
    'research_slice_version',
    'status',
    'candidate_count',
    'recommended_candidate_ids',
    'admission_readiness',
    'hard_blockers',
    'human_review_triggers',
    'generation_notes',
    'artifact_refs',
    'created_at',
    'updated_at',
  ],
  properties: {
    topic_question_candidate_set_id: stringId,
    workspace_id: nullableStringId,
    title_card_id: stringId,
    form_topic_question_run_id: stringId,
    question_frame_id: stringId,
    research_slice_id: stringId,
    research_slice_version: stringId,
    status: { enum: [...TOPIC_SELECTION_TOPIC_QUESTION_CANDIDATE_SET_STATUSES] },
    candidate_count: numberValue,
    recommended_candidate_ids: stringArray,
    admission_readiness: objectPayload,
    hard_blockers: stringArray,
    human_review_triggers: stringArray,
    generation_notes: stringArray,
    input_snapshot_id: nullableStringId,
    workflow_run_id: nullableStringId,
    artifact_refs: functionalRefArray,
    created_at: stringId,
    updated_at: stringId,
  },
} as const;

export const topicSelectionTopicQuestionCandidateRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'topic_question_candidate_id',
    'title_card_id',
    'candidate_set_id',
    'question_frame_id',
    'research_slice_id',
    'research_slice_version',
    'candidate_ordinal',
    'candidate_key',
    'status',
    'main_question',
    'sub_questions',
    'question_type',
    'contribution_hypothesis',
    'source_validated_need_refs',
    'answerability_verdict',
    'answerability_plan_payload',
    'boundary_check_payload',
    'traceability_check_payload',
    'expected_claim',
    'fallback_claim',
    'max_claim_strength',
    'observable_success_criteria',
    'falsification_conditions_payload',
    'risk_notes',
    'blockers',
    'objections',
    'human_review_triggers',
    'confidence',
    'created_at',
  ],
  properties: {
    topic_question_candidate_id: stringId,
    workspace_id: nullableStringId,
    title_card_id: stringId,
    candidate_set_id: stringId,
    question_frame_id: stringId,
    research_slice_id: stringId,
    research_slice_version: stringId,
    candidate_ordinal: numberValue,
    candidate_key: stringId,
    status: { enum: [...TOPIC_SELECTION_TOPIC_QUESTION_CANDIDATE_STATUSES] },
    main_question: stringId,
    sub_questions: stringArray,
    question_type: { enum: [...TOPIC_SELECTION_TOPIC_QUESTION_TYPES] },
    contribution_hypothesis: { enum: [...TOPIC_SELECTION_TOPIC_QUESTION_TYPES] },
    source_validated_need_refs: functionalRefArray,
    answerability_verdict: { enum: [...TOPIC_SELECTION_TOPIC_QUESTION_ANSWERABILITY_VERDICTS] },
    answerability_plan_payload: topicSelectionTopicQuestionAnswerabilityPlanDraftSchema,
    boundary_check_payload: topicSelectionTopicQuestionBoundaryCheckDraftSchema,
    traceability_check_payload: topicSelectionTopicQuestionTraceabilityCheckDraftSchema,
    expected_claim: stringId,
    fallback_claim: stringId,
    max_claim_strength: stringId,
    observable_success_criteria: stringArray,
    falsification_conditions_payload: {
      type: 'array',
      items: topicSelectionTopicQuestionFalsificationConditionDraftSchema,
    },
    risk_notes: stringArray,
    blockers: stringArray,
    objections: stringArray,
    human_review_triggers: stringArray,
    confidence: nullableNumber,
    created_at: stringId,
  },
} as const;

export const topicSelectionTopicQuestionSelectionDecisionRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'topic_question_selection_decision_id',
    'title_card_id',
    'candidate_set_id',
    'form_topic_question_run_id',
    'research_slice_id',
    'research_slice_version',
    'input_snapshot_ref',
    'decision',
    'decided_by',
    'selection_policy_version',
    'admitted_candidate_ids',
    'created_topic_question_ids',
    'merged_candidate_groups',
    'hard_gate_results',
    'admission_review',
    'candidate_relationships',
    'priority_order',
    'rejected_candidate_reasons',
    'blocking_contexts',
    'decision_rationale',
    'requires_human_review',
    'human_review_triggers',
    'accepted_risk_refs',
    'confidence',
    'artifact_refs',
    'created_at',
  ],
  properties: {
    topic_question_selection_decision_id: stringId,
    workspace_id: nullableStringId,
    title_card_id: stringId,
    candidate_set_id: stringId,
    form_topic_question_run_id: stringId,
    research_slice_id: stringId,
    research_slice_version: stringId,
    input_snapshot_ref: topicSelectionFunctionalRefSchema,
    decision: { enum: [...TOPIC_SELECTION_TOPIC_QUESTION_SELECTION_DECISIONS] },
    decided_by: { enum: ['human', 'llm', 'system', 'hybrid'] },
    selection_policy_version: stringId,
    admitted_candidate_ids: stringArray,
    created_topic_question_ids: stringArray,
    merged_candidate_groups: objectArray,
    hard_gate_results: objectArray,
    admission_review: objectPayload,
    candidate_relationships: objectPayload,
    priority_order: stringArray,
    rejected_candidate_reasons: objectArray,
    blocking_contexts: objectArray,
    decision_rationale: stringId,
    requires_human_review: booleanValue,
    human_review_triggers: stringArray,
    accepted_risk_refs: functionalRefArray,
    confidence: nullableNumber,
    input_snapshot_id: nullableStringId,
    workflow_run_id: nullableStringId,
    gate_result_id: nullableStringId,
    transition_attempt_id: nullableStringId,
    artifact_refs: functionalRefArray,
    created_at: stringId,
  },
} as const;

export const topicSelectionTopicQuestionRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'topic_question_id',
    'title_card_id',
    'research_record_id',
    'research_slice_id',
    'research_slice_version',
    'source_validated_need_ids',
    'source_candidate_set_id',
    'source_candidate_id',
    'selection_decision_id',
    'active_question_contract_id',
    'main_question',
    'sub_questions',
    'question_type',
    'contribution_hypothesis',
    'status',
    'created_at',
    'updated_at',
  ],
  properties: {
    topic_question_id: stringId,
    workspace_id: nullableStringId,
    title_card_id: stringId,
    research_record_id: stringId,
    research_slice_id: stringId,
    research_slice_version: stringId,
    source_validated_need_ids: stringArray,
    source_candidate_set_id: stringId,
    source_candidate_id: stringId,
    selection_decision_id: stringId,
    active_question_contract_id: stringId,
    main_question: stringId,
    sub_questions: stringArray,
    question_type: { enum: [...TOPIC_SELECTION_TOPIC_QUESTION_TYPES] },
    contribution_hypothesis: { enum: [...TOPIC_SELECTION_TOPIC_QUESTION_TYPES] },
    status: { enum: [...TOPIC_SELECTION_TOPIC_QUESTION_STATUSES] },
    created_at: stringId,
    updated_at: stringId,
  },
} as const;

export const topicSelectionTopicQuestionContractRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'topic_question_contract_id',
    'title_card_id',
    'topic_question_id',
    'version',
    'answerability_plan_id',
    'source_research_slice_id',
    'source_research_slice_version',
    'source_candidate_id',
    'selection_decision_id',
    'input_snapshot_ref',
    'contract_hash',
    'main_question',
    'question_type',
    'contribution_hypothesis',
    'target_setting',
    'target_community',
    'expected_claim',
    'fallback_claim',
    'max_claim_strength',
    'evaluation_route',
    'claim_ceiling',
    'prohibited_claims',
    'required_evidence_categories',
    'allowed_refinements',
    'stop_reopen_conditions',
    'accepted_risk_refs',
    'risk_notes',
    'status',
    'artifact_refs',
    'created_at',
    'updated_at',
  ],
  properties: {
    topic_question_contract_id: stringId,
    workspace_id: nullableStringId,
    title_card_id: stringId,
    topic_question_id: stringId,
    version: stringId,
    answerability_plan_id: stringId,
    source_research_slice_id: stringId,
    source_research_slice_version: stringId,
    source_candidate_id: stringId,
    selection_decision_id: stringId,
    input_snapshot_ref: topicSelectionFunctionalRefSchema,
    contract_hash: stringId,
    main_question: stringId,
    question_type: { enum: [...TOPIC_SELECTION_TOPIC_QUESTION_TYPES] },
    contribution_hypothesis: { enum: [...TOPIC_SELECTION_TOPIC_QUESTION_TYPES] },
    target_setting: stringId,
    target_community: stringId,
    expected_claim: stringId,
    fallback_claim: stringId,
    max_claim_strength: stringId,
    evaluation_route: stringId,
    claim_ceiling: stringId,
    prohibited_claims: stringArray,
    required_evidence_categories: stringArray,
    allowed_refinements: stringArray,
    stop_reopen_conditions: stringArray,
    accepted_risk_refs: functionalRefArray,
    risk_notes: stringArray,
    status: { enum: [...TOPIC_SELECTION_TOPIC_QUESTION_CONTRACT_STATUSES] },
    created_by_workflow_run_id: nullableStringId,
    artifact_refs: functionalRefArray,
    created_at: stringId,
    updated_at: stringId,
  },
} as const;

export const topicSelectionTopicQuestionAnswerabilityPlanRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'topic_question_answerability_plan_id',
    'title_card_id',
    'topic_question_id',
    'topic_question_contract_id',
    'answerability_verdict',
    'datasets_or_resources',
    'metrics',
    'baselines',
    'ablations_or_comparisons',
    'evaluation_setting',
    'dependency_risks',
    'open_dependencies',
    'known_gaps',
    'required_evidence_refs',
    'created_at',
  ],
  properties: {
    topic_question_answerability_plan_id: stringId,
    workspace_id: nullableStringId,
    title_card_id: stringId,
    topic_question_id: stringId,
    topic_question_contract_id: stringId,
    answerability_verdict: { enum: [...TOPIC_SELECTION_TOPIC_QUESTION_ANSWERABILITY_VERDICTS] },
    datasets_or_resources: stringArray,
    metrics: stringArray,
    baselines: stringArray,
    ablations_or_comparisons: stringArray,
    evaluation_setting: stringId,
    dependency_risks: stringArray,
    open_dependencies: stringArray,
    known_gaps: stringArray,
    required_evidence_refs: functionalRefArray,
    created_at: stringId,
  },
} as const;

export const topicSelectionTopicQuestionNeedRefRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'topic_question_need_ref_id',
    'title_card_id',
    'topic_question_id',
    'topic_question_contract_id',
    'validated_need_ref',
    'role',
    'inherited_from_research_slice_id',
    'coverage_note',
    'created_at',
  ],
  properties: {
    topic_question_need_ref_id: stringId,
    workspace_id: nullableStringId,
    title_card_id: stringId,
    topic_question_id: stringId,
    topic_question_contract_id: stringId,
    validated_need_ref: topicSelectionFunctionalRefSchema,
    source_need_candidate_ref: nullableFunctionalRef,
    role: { enum: [...TOPIC_SELECTION_TOPIC_QUESTION_NEED_ROLES] },
    inherited_from_research_slice_id: stringId,
    coverage_note: stringValue,
    created_at: stringId,
  },
} as const;

export const topicSelectionTopicQuestionEvidenceRefRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'topic_question_evidence_ref_id',
    'title_card_id',
    'topic_question_id',
    'topic_question_contract_id',
    'evidence_ref',
    'evidence_role',
    'mapped_question_part',
    'rationale',
    'source_locator_snapshot',
    'created_at',
  ],
  properties: {
    topic_question_evidence_ref_id: stringId,
    workspace_id: nullableStringId,
    title_card_id: stringId,
    topic_question_id: stringId,
    topic_question_contract_id: stringId,
    evidence_ref: topicSelectionFunctionalRefSchema,
    evidence_role: { enum: [...TOPIC_SELECTION_TOPIC_QUESTION_EVIDENCE_ROLES] },
    mapped_question_part: stringValue,
    rationale: stringValue,
    source_locator_snapshot: objectPayload,
    created_at: stringId,
  },
} as const;

export const topicSelectionTopicQuestionBoundaryRefRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'topic_question_boundary_ref_id',
    'title_card_id',
    'topic_question_id',
    'topic_question_contract_id',
    'research_slice_boundary_id',
    'boundary_kind',
    'question_part',
    'note',
    'created_at',
  ],
  properties: {
    topic_question_boundary_ref_id: stringId,
    workspace_id: nullableStringId,
    title_card_id: stringId,
    topic_question_id: stringId,
    topic_question_contract_id: stringId,
    research_slice_boundary_id: stringId,
    boundary_kind: { enum: [...TOPIC_SELECTION_TOPIC_QUESTION_BOUNDARY_KINDS] },
    question_part: stringValue,
    note: stringValue,
    created_at: stringId,
  },
} as const;

export const topicSelectionTopicQuestionAssumptionRefRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'topic_question_assumption_ref_id',
    'title_card_id',
    'topic_question_id',
    'topic_question_contract_id',
    'assumption_type',
    'statement',
    'evidence_refs',
    'risk_level',
    'status',
    'created_at',
  ],
  properties: {
    topic_question_assumption_ref_id: stringId,
    workspace_id: nullableStringId,
    title_card_id: stringId,
    topic_question_id: stringId,
    topic_question_contract_id: stringId,
    assumption_type: { enum: [...TOPIC_SELECTION_TOPIC_QUESTION_ASSUMPTION_TYPES] },
    statement: stringId,
    source_assumption_id: nullableStringId,
    evidence_refs: functionalRefArray,
    risk_level: { enum: [...TOPIC_SELECTION_TOPIC_QUESTION_RISK_LEVELS] },
    status: stringId,
    created_at: stringId,
  },
} as const;

export const topicSelectionTopicQuestionFalsificationConditionRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'topic_question_falsification_condition_id',
    'title_card_id',
    'topic_question_contract_id',
    'condition_type',
    'severity',
    'statement',
    'trigger_evidence_refs',
    'trigger_source_refs',
    'related_contract_fields',
    'expected_action',
    'check_timing',
    'confidence',
    'status',
    'created_at',
  ],
  properties: {
    topic_question_falsification_condition_id: stringId,
    workspace_id: nullableStringId,
    title_card_id: stringId,
    topic_question_contract_id: stringId,
    condition_type: { enum: [...TOPIC_SELECTION_TOPIC_QUESTION_FALSIFICATION_CONDITION_TYPES] },
    severity: { enum: [...TOPIC_SELECTION_TOPIC_QUESTION_FALSIFICATION_SEVERITIES] },
    statement: stringId,
    trigger_evidence_refs: functionalRefArray,
    trigger_source_refs: functionalRefArray,
    related_contract_fields: stringArray,
    expected_action: { enum: [...TOPIC_SELECTION_TOPIC_QUESTION_FALSIFICATION_ACTIONS] },
    check_timing: { enum: [...TOPIC_SELECTION_TOPIC_QUESTION_FALSIFICATION_CHECK_TIMINGS] },
    confidence: { enum: ['low', 'medium', 'high'] },
    status: { enum: [...TOPIC_SELECTION_TOPIC_QUESTION_FALSIFICATION_STATUSES] },
    created_at: stringId,
  },
} as const;

export const topicSelectionV1bValueAssessmentInputSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'topic_question_ref',
    'topic_question_contract_ref',
    'answerability_plan_ref',
    'research_slice_ref',
    'selection_decision_ref',
    'candidate_set_ref',
    'source_candidate_ref',
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
  ],
  properties: {
    topic_question_ref: topicSelectionFunctionalRefSchema,
    topic_question_contract_ref: topicSelectionFunctionalRefSchema,
    answerability_plan_ref: topicSelectionFunctionalRefSchema,
    research_slice_ref: topicSelectionFunctionalRefSchema,
    selection_decision_ref: topicSelectionFunctionalRefSchema,
    candidate_set_ref: topicSelectionFunctionalRefSchema,
    source_candidate_ref: topicSelectionFunctionalRefSchema,
    validated_need_refs: functionalRefArray,
    evidence_refs: { type: 'array', items: topicSelectionTopicQuestionEvidenceRefRecordSchema },
    need_refs: { type: 'array', items: topicSelectionTopicQuestionNeedRefRecordSchema },
    boundary_refs: { type: 'array', items: topicSelectionTopicQuestionBoundaryRefRecordSchema },
    assumption_refs: { type: 'array', items: topicSelectionTopicQuestionAssumptionRefRecordSchema },
    falsification_conditions: {
      type: 'array',
      items: topicSelectionTopicQuestionFalsificationConditionRecordSchema,
    },
    accepted_risk_refs: functionalRefArray,
    memory_suggestion_refs: functionalRefArray,
    recheck_request_refs: functionalRefArray,
    question_contract: topicSelectionTopicQuestionContractRecordSchema,
    answerability_plan: topicSelectionTopicQuestionAnswerabilityPlanRecordSchema,
  },
} as const;
