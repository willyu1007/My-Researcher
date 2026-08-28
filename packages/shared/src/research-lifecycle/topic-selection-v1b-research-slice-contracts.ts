import {
  topicSelectionFunctionalRefSchema,
  type TopicSelectionActorType,
  type TopicSelectionFunctionalRef,
} from './topic-selection-control-plane-contracts.js';
import {
  topicSelectionCandidatePortfolioDispositionSchema,
  type TopicSelectionCandidatePortfolioDisposition,
} from './topic-selection-need-validation-contracts.js';

export const TOPIC_SELECTION_RESEARCH_SLICE_RUN_STATUSES = [
  'queued',
  'running',
  'succeeded',
  'failed',
  'blocked',
  'cancelled',
] as const;
export type TopicSelectionResearchSliceRunStatus =
  (typeof TOPIC_SELECTION_RESEARCH_SLICE_RUN_STATUSES)[number];

export const TOPIC_SELECTION_RESEARCH_SLICE_OPTION_SET_STATUSES = [
  'draft',
  'ready_for_selection',
  'selected',
  'needs_more_options',
  'parked',
  'rejected',
  'superseded',
  'recheck_required',
] as const;
export type TopicSelectionResearchSliceOptionSetStatus =
  (typeof TOPIC_SELECTION_RESEARCH_SLICE_OPTION_SET_STATUSES)[number];

export const TOPIC_SELECTION_RESEARCH_SLICE_OPTION_STATUSES = [
  'candidate',
  'recommended',
  'selected',
  'rejected',
  'deferred',
  'blocked',
] as const;
export type TopicSelectionResearchSliceOptionStatus =
  (typeof TOPIC_SELECTION_RESEARCH_SLICE_OPTION_STATUSES)[number];

export const TOPIC_SELECTION_SLICE_SELECTION_DECISIONS = [
  'select',
  'request_more_options',
  'park',
  'reject',
] as const;
export type TopicSelectionSliceSelectionDecision =
  (typeof TOPIC_SELECTION_SLICE_SELECTION_DECISIONS)[number];

export const TOPIC_SELECTION_SLICE_LOOPBACK_TARGETS = [
  'plan_research_slice_run',
  'research_constraint_profile',
  'validated_need',
  'evidence_map',
  'search_plan',
] as const;
export type TopicSelectionSliceLoopbackTarget =
  (typeof TOPIC_SELECTION_SLICE_LOOPBACK_TARGETS)[number];

export const TOPIC_SELECTION_RESEARCH_SLICE_STATUSES = [
  'selected',
  'needs_scope_revision',
  'needs_resource_check',
  'recheck_required',
  'superseded',
  'parked',
  'rejected',
] as const;
export type TopicSelectionResearchSliceStatus =
  (typeof TOPIC_SELECTION_RESEARCH_SLICE_STATUSES)[number];

export const TOPIC_SELECTION_RESEARCH_SLICE_RISK_LEVELS = [
  'low',
  'medium',
  'high',
  'unknown',
] as const;
export type TopicSelectionResearchSliceRiskLevel =
  (typeof TOPIC_SELECTION_RESEARCH_SLICE_RISK_LEVELS)[number];

export const TOPIC_SELECTION_RESEARCH_SLICE_CLAIM_CEILING_ALIGNMENT_STATUSES = [
  'aligned',
  'uncertain',
  'exceeds',
] as const;
export type TopicSelectionResearchSliceClaimCeilingAlignmentStatus =
  (typeof TOPIC_SELECTION_RESEARCH_SLICE_CLAIM_CEILING_ALIGNMENT_STATUSES)[number];

export const TOPIC_SELECTION_RESEARCH_SLICE_EVIDENCE_ROLES = [
  'support',
  'challenge',
  'claim',
  'baseline',
  'context',
] as const;
export type TopicSelectionResearchSliceEvidenceRole =
  (typeof TOPIC_SELECTION_RESEARCH_SLICE_EVIDENCE_ROLES)[number];

export const TOPIC_SELECTION_RESEARCH_SLICE_BOUNDARY_KINDS = [
  'included',
  'excluded',
] as const;
export type TopicSelectionResearchSliceBoundaryKind =
  (typeof TOPIC_SELECTION_RESEARCH_SLICE_BOUNDARY_KINDS)[number];

export const TOPIC_SELECTION_RESEARCH_SLICE_ASSUMPTION_TYPES = [
  'resource',
  'data',
  'baseline',
  'evaluation',
  'dependency',
  'method',
] as const;
export type TopicSelectionResearchSliceAssumptionType =
  (typeof TOPIC_SELECTION_RESEARCH_SLICE_ASSUMPTION_TYPES)[number];

export interface TopicSelectionResearchSliceClaimCeilingAlignment {
  status: TopicSelectionResearchSliceClaimCeilingAlignmentStatus;
  rationale: string;
  confidence?: number | null;
}

export interface TopicSelectionResearchSliceOptionDraft {
  option_key: string;
  source_validated_need_refs: TopicSelectionFunctionalRef[];
  slice_statement: string;
  problem_space: string;
  target_setting: string;
  target_community: string;
  included_boundaries: string[];
  excluded_boundaries: string[];
  contribution_type_candidate: string;
  support_evidence_refs: TopicSelectionFunctionalRef[];
  challenge_evidence_refs: TopicSelectionFunctionalRef[];
  baseline_evidence_refs: TopicSelectionFunctionalRef[];
  context_evidence_refs: TopicSelectionFunctionalRef[];
  resource_assumptions: string[];
  data_assumptions: string[];
  evaluation_path: string;
  baseline_assumptions: string[];
  hard_blockers: string[];
  dependency_risks: string[];
  slice_budget: Record<string, unknown>;
  expected_claim: string;
  fallback_claim: string;
  observable_success_criteria: string[];
  main_risks: string[];
  baseline_risk: TopicSelectionResearchSliceRiskLevel;
  execution_risk: TopicSelectionResearchSliceRiskLevel;
  scope_risk: TopicSelectionResearchSliceRiskLevel;
  claim_ceiling_alignment: TopicSelectionResearchSliceClaimCeilingAlignment;
  confidence?: number | null;
  requires_human_review: boolean;
  human_review_triggers: string[];
  details_payload: Record<string, unknown>;
}

export interface TopicSelectionResearchSliceOptionSetLlmOutput {
  recommended_option_key?: string | null;
  comparison_axes: string[];
  comparison_summary: string;
  missing_option_types: string[];
  unresolved_disagreements: string[];
  human_review_triggers: string[];
  options: TopicSelectionResearchSliceOptionDraft[];
  portfolio_disposition?: TopicSelectionCandidatePortfolioDisposition | null;
}

export interface TopicSelectionPlanResearchSliceRunRecord {
  plan_research_slice_run_id: string;
  workspace_id?: string | null;
  title_card_id: string;
  v1b_intake_readiness_assessment_id: string;
  v1b_intake_snapshot_id: string;
  research_constraint_profile_id: string;
  v1b_input_bundle_id: string;
  validated_need_id: string;
  status: TopicSelectionResearchSliceRunStatus;
  triggered_by: TopicSelectionActorType;
  v1b_input_bundle_ref: TopicSelectionFunctionalRef;
  v1b_intake_snapshot_ref: TopicSelectionFunctionalRef;
  research_constraint_profile_ref: TopicSelectionFunctionalRef;
  readiness_assessment_ref: TopicSelectionFunctionalRef;
  validated_need_ref: TopicSelectionFunctionalRef;
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
  option_set_id?: string | null;
  artifact_refs: TopicSelectionFunctionalRef[];
  quality_flags: string[];
  failure_reason?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TopicSelectionResearchSliceOptionSetRecord {
  research_slice_option_set_id: string;
  workspace_id?: string | null;
  title_card_id: string;
  plan_research_slice_run_id: string;
  v1b_intake_readiness_assessment_id: string;
  v1b_intake_snapshot_id: string;
  research_constraint_profile_id: string;
  v1b_input_bundle_id: string;
  validated_need_ids: string[];
  status: TopicSelectionResearchSliceOptionSetStatus;
  recommended_option_id?: string | null;
  selected_option_id?: string | null;
  option_count: number;
  high_risk_option_count: number;
  requires_human_review: boolean;
  comparison_axes: string[];
  comparison_summary: string;
  missing_option_types: string[];
  unresolved_disagreements: string[];
  human_review_triggers: string[];
  options_payload: Record<string, unknown>;
  comparison_payload: Record<string, unknown>;
  input_snapshot_id?: string | null;
  workflow_run_id?: string | null;
  artifact_refs: TopicSelectionFunctionalRef[];
  created_at: string;
  updated_at: string;
}

export interface TopicSelectionResearchSliceOptionRecord {
  research_slice_option_id: string;
  workspace_id?: string | null;
  title_card_id: string;
  research_slice_option_set_id: string;
  option_ordinal: number;
  option_key: string;
  status: TopicSelectionResearchSliceOptionStatus;
  source_validated_need_refs: TopicSelectionFunctionalRef[];
  slice_statement: string;
  problem_space: string;
  target_setting: string;
  target_community: string;
  included_boundaries: string[];
  excluded_boundaries: string[];
  contribution_type_candidate: string;
  support_evidence_refs: TopicSelectionFunctionalRef[];
  challenge_evidence_refs: TopicSelectionFunctionalRef[];
  baseline_evidence_refs: TopicSelectionFunctionalRef[];
  context_evidence_refs: TopicSelectionFunctionalRef[];
  resource_assumptions: string[];
  data_assumptions: string[];
  evaluation_path: string;
  baseline_assumptions: string[];
  hard_blockers: string[];
  dependency_risks: string[];
  slice_budget: Record<string, unknown>;
  expected_claim: string;
  fallback_claim: string;
  observable_success_criteria: string[];
  main_risks: string[];
  baseline_risk: TopicSelectionResearchSliceRiskLevel;
  execution_risk: TopicSelectionResearchSliceRiskLevel;
  scope_risk: TopicSelectionResearchSliceRiskLevel;
  claim_ceiling_alignment: TopicSelectionResearchSliceClaimCeilingAlignment;
  confidence?: number | null;
  requires_human_review: boolean;
  human_review_triggers: string[];
  details_payload: Record<string, unknown>;
  created_at: string;
}

export interface TopicSelectionRejectedSliceOptionReason {
  option_id: string;
  reason: string;
  reason_code:
    | 'hard_blocker'
    | 'weaker_fit'
    | 'higher_risk'
    | 'duplicate'
    | 'out_of_scope'
    | 'insufficient_evidence'
    | 'resource_blocked'
    | 'baseline_blocked'
    | 'other';
}

export interface TopicSelectionSliceSelectionDecisionRecord {
  slice_selection_decision_id: string;
  workspace_id?: string | null;
  title_card_id: string;
  research_slice_option_set_id: string;
  selected_option_id?: string | null;
  decision: TopicSelectionSliceSelectionDecision;
  decided_by: TopicSelectionActorType;
  selection_policy_version: string;
  decision_basis: Record<string, unknown>;
  selection_rationale: string;
  rejected_option_reasons: TopicSelectionRejectedSliceOptionReason[];
  hard_blockers: string[];
  open_risks: string[];
  unresolved_disagreements: string[];
  loopback_target?: TopicSelectionSliceLoopbackTarget | null;
  loopback_target_ref?: TopicSelectionFunctionalRef | null;
  required_actions: string[];
  loopback_reason_code?: string | null;
  source_downstream_object_ref?: TopicSelectionFunctionalRef | null;
  creates_new_run_or_version: boolean;
  confidence?: number | null;
  requires_human_review: boolean;
  human_review_reason?: string | null;
  output_research_slice_ref?: TopicSelectionFunctionalRef | null;
  input_snapshot_id?: string | null;
  workflow_run_id?: string | null;
  gate_result_id?: string | null;
  transition_attempt_id?: string | null;
  artifact_refs: TopicSelectionFunctionalRef[];
  created_at: string;
}

export interface TopicSelectionResearchSliceRecord {
  research_slice_id: string;
  workspace_id?: string | null;
  title_card_id: string;
  v1b_intake_snapshot_id: string;
  research_constraint_profile_id: string;
  v1b_input_bundle_id: string;
  validated_need_id: string;
  slice_version: string;
  status: TopicSelectionResearchSliceStatus;
  v1b_intake_snapshot_ref: TopicSelectionFunctionalRef;
  research_constraint_profile_ref: TopicSelectionFunctionalRef;
  readiness_assessment_ref: TopicSelectionFunctionalRef;
  v1b_input_bundle_ref: TopicSelectionFunctionalRef;
  validated_need_ref: TopicSelectionFunctionalRef;
  evidence_map_ref: TopicSelectionFunctionalRef;
  search_run_ref: TopicSelectionFunctionalRef;
  search_plan_ref: TopicSelectionFunctionalRef;
  literature_snapshot_ref: TopicSelectionFunctionalRef;
  source_option_set_ref: TopicSelectionFunctionalRef;
  source_option_ref: TopicSelectionFunctionalRef;
  slice_selection_decision_ref: TopicSelectionFunctionalRef;
  problem_space: string;
  slice_statement: string;
  target_setting: string;
  target_community: string;
  included_boundaries: string[];
  excluded_boundaries: string[];
  candidate_contribution_types: string[];
  preferred_contribution_type?: string | null;
  contribution_rationale: string;
  expected_claim: string;
  fallback_claim: string;
  observable_success_criteria: string[];
  resource_assumptions: string[];
  data_assumptions: string[];
  evaluation_path: string;
  baseline_assumptions: string[];
  dependency_risks: string[];
  slice_budget: Record<string, unknown>;
  topic_question_guardrails: string[];
  value_assessment_inputs: string[];
  must_preserve_boundaries: string[];
  accepted_risk_refs: TopicSelectionFunctionalRef[];
  memory_suggestion_refs: TopicSelectionFunctionalRef[];
  recheck_request_refs: TopicSelectionFunctionalRef[];
  gap_codes: string[];
  non_goals: string[];
  claim_ceiling: string;
  decision_reason?: string | null;
  supersedes_research_slice_ref?: TopicSelectionFunctionalRef | null;
  superseded_by_research_slice_ref?: TopicSelectionFunctionalRef | null;
  input_snapshot_id?: string | null;
  workflow_run_id?: string | null;
  gate_result_id?: string | null;
  transition_attempt_id?: string | null;
  trace_snapshot_id?: string | null;
  artifact_refs: TopicSelectionFunctionalRef[];
  created_by: TopicSelectionActorType;
  created_at: string;
  updated_at: string;
}

export interface TopicSelectionResearchSliceEvidenceRefRecord {
  research_slice_evidence_ref_id: string;
  workspace_id?: string | null;
  title_card_id: string;
  research_slice_id: string;
  evidence_ref: TopicSelectionFunctionalRef;
  evidence_role: TopicSelectionResearchSliceEvidenceRole;
  rationale: string;
  evidence_strength_snapshot: Record<string, unknown>;
  source_locator_snapshot: Record<string, unknown>;
  created_at: string;
}

export interface TopicSelectionResearchSliceBoundaryRecord {
  research_slice_boundary_id: string;
  workspace_id?: string | null;
  title_card_id: string;
  research_slice_id: string;
  boundary_kind: TopicSelectionResearchSliceBoundaryKind;
  boundary_type: string;
  statement: string;
  reason: string;
  evidence_refs: TopicSelectionFunctionalRef[];
  created_at: string;
}

export interface TopicSelectionResearchSliceAssumptionRecord {
  research_slice_assumption_id: string;
  workspace_id?: string | null;
  title_card_id: string;
  research_slice_id: string;
  assumption_type: TopicSelectionResearchSliceAssumptionType;
  statement: string;
  status: string;
  evidence_refs: TopicSelectionFunctionalRef[];
  risk_level: TopicSelectionResearchSliceRiskLevel;
  created_at: string;
}

export interface TopicSelectionV1bTopicQuestionFormationInput {
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
  target_community: string;
  problem_space: string;
  slice_statement: string;
  included_boundaries: string[];
  excluded_boundaries: string[];
  evidence_refs: TopicSelectionResearchSliceEvidenceRefRecord[];
  boundaries: TopicSelectionResearchSliceBoundaryRecord[];
  assumptions: TopicSelectionResearchSliceAssumptionRecord[];
  candidate_contribution_types: string[];
  preferred_contribution_type?: string | null;
  expected_claim: string;
  fallback_claim: string;
  observable_success_criteria: string[];
  resource_assumptions: string[];
  data_assumptions: string[];
  evaluation_path: string;
  baseline_assumptions: string[];
  dependency_risks: string[];
  slice_budget: Record<string, unknown>;
  accepted_risk_refs: TopicSelectionFunctionalRef[];
  memory_suggestion_refs: TopicSelectionFunctionalRef[];
  recheck_request_refs: TopicSelectionFunctionalRef[];
  gap_codes: string[];
  non_goals: string[];
  claim_ceiling: string;
  topic_question_guardrails: string[];
  value_assessment_inputs: string[];
  must_preserve_boundaries: string[];
}

const stringId = { type: 'string', minLength: 1 } as const;
const stringValue = { type: 'string' } as const;
const numberValue = { type: 'number' } as const;
const booleanValue = { type: 'boolean' } as const;
const nullableStringId = { anyOf: [stringId, { type: 'null' }] } as const;
const nullableNumber = { anyOf: [numberValue, { type: 'null' }] } as const;
const stringArray = { type: 'array', items: stringId } as const;
const objectPayload = { type: 'object', additionalProperties: true } as const;
const functionalRefArray = { type: 'array', items: topicSelectionFunctionalRefSchema } as const;
const nullableFunctionalRef = { anyOf: [topicSelectionFunctionalRefSchema, { type: 'null' }] } as const;

export const topicSelectionResearchSliceClaimCeilingAlignmentSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['status', 'rationale', 'confidence'],
  properties: {
    status: { enum: [...TOPIC_SELECTION_RESEARCH_SLICE_CLAIM_CEILING_ALIGNMENT_STATUSES] },
    rationale: stringId,
    confidence: nullableNumber,
  },
} as const;

export const topicSelectionResearchSliceOptionDraftSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'option_key',
    'source_validated_need_refs',
    'slice_statement',
    'problem_space',
    'target_setting',
    'target_community',
    'included_boundaries',
    'excluded_boundaries',
    'contribution_type_candidate',
    'support_evidence_refs',
    'challenge_evidence_refs',
    'baseline_evidence_refs',
    'context_evidence_refs',
    'resource_assumptions',
    'data_assumptions',
    'evaluation_path',
    'baseline_assumptions',
    'hard_blockers',
    'dependency_risks',
    'slice_budget',
    'expected_claim',
    'fallback_claim',
    'observable_success_criteria',
    'main_risks',
    'baseline_risk',
    'execution_risk',
    'scope_risk',
    'claim_ceiling_alignment',
    'confidence',
    'requires_human_review',
    'human_review_triggers',
    'details_payload',
  ],
  properties: {
    option_key: stringId,
    source_validated_need_refs: functionalRefArray,
    slice_statement: stringId,
    problem_space: stringId,
    target_setting: stringId,
    target_community: stringId,
    included_boundaries: stringArray,
    excluded_boundaries: stringArray,
    contribution_type_candidate: stringId,
    support_evidence_refs: functionalRefArray,
    challenge_evidence_refs: functionalRefArray,
    baseline_evidence_refs: functionalRefArray,
    context_evidence_refs: functionalRefArray,
    resource_assumptions: stringArray,
    data_assumptions: stringArray,
    evaluation_path: stringId,
    baseline_assumptions: stringArray,
    hard_blockers: stringArray,
    dependency_risks: stringArray,
    slice_budget: objectPayload,
    expected_claim: stringId,
    fallback_claim: stringId,
    observable_success_criteria: stringArray,
    main_risks: stringArray,
    baseline_risk: { enum: [...TOPIC_SELECTION_RESEARCH_SLICE_RISK_LEVELS] },
    execution_risk: { enum: [...TOPIC_SELECTION_RESEARCH_SLICE_RISK_LEVELS] },
    scope_risk: { enum: [...TOPIC_SELECTION_RESEARCH_SLICE_RISK_LEVELS] },
    claim_ceiling_alignment: topicSelectionResearchSliceClaimCeilingAlignmentSchema,
    confidence: nullableNumber,
    requires_human_review: booleanValue,
    human_review_triggers: stringArray,
    details_payload: objectPayload,
  },
} as const;

export const topicSelectionResearchSliceOptionSetLlmOutputSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'recommended_option_key',
    'comparison_axes',
    'comparison_summary',
    'missing_option_types',
    'unresolved_disagreements',
    'human_review_triggers',
    'options',
  ],
  properties: {
    recommended_option_key: nullableStringId,
    comparison_axes: stringArray,
    comparison_summary: stringId,
    missing_option_types: stringArray,
    unresolved_disagreements: stringArray,
    human_review_triggers: stringArray,
    portfolio_disposition: {
      anyOf: [topicSelectionCandidatePortfolioDispositionSchema, { type: 'null' }],
    },
    options: {
      type: 'array',
      items: topicSelectionResearchSliceOptionDraftSchema,
    },
  },
} as const;

export const topicSelectionPlanResearchSliceRunRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'plan_research_slice_run_id',
    'title_card_id',
    'v1b_intake_readiness_assessment_id',
    'v1b_intake_snapshot_id',
    'research_constraint_profile_id',
    'v1b_input_bundle_id',
    'validated_need_id',
    'status',
    'triggered_by',
    'v1b_input_bundle_ref',
    'v1b_intake_snapshot_ref',
    'research_constraint_profile_ref',
    'readiness_assessment_ref',
    'validated_need_ref',
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
    plan_research_slice_run_id: stringId,
    workspace_id: nullableStringId,
    title_card_id: stringId,
    v1b_intake_readiness_assessment_id: stringId,
    v1b_intake_snapshot_id: stringId,
    research_constraint_profile_id: stringId,
    v1b_input_bundle_id: stringId,
    validated_need_id: stringId,
    status: { enum: [...TOPIC_SELECTION_RESEARCH_SLICE_RUN_STATUSES] },
    triggered_by: { enum: ['human', 'llm', 'system', 'hybrid'] },
    v1b_input_bundle_ref: topicSelectionFunctionalRefSchema,
    v1b_intake_snapshot_ref: topicSelectionFunctionalRefSchema,
    research_constraint_profile_ref: topicSelectionFunctionalRefSchema,
    readiness_assessment_ref: topicSelectionFunctionalRefSchema,
    validated_need_ref: topicSelectionFunctionalRefSchema,
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
    option_set_id: nullableStringId,
    artifact_refs: functionalRefArray,
    quality_flags: stringArray,
    failure_reason: nullableStringId,
    created_at: stringId,
    updated_at: stringId,
  },
} as const;

export const topicSelectionResearchSliceOptionSetRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'research_slice_option_set_id',
    'title_card_id',
    'plan_research_slice_run_id',
    'v1b_intake_readiness_assessment_id',
    'v1b_intake_snapshot_id',
    'research_constraint_profile_id',
    'v1b_input_bundle_id',
    'validated_need_ids',
    'status',
    'option_count',
    'high_risk_option_count',
    'requires_human_review',
    'comparison_axes',
    'comparison_summary',
    'missing_option_types',
    'unresolved_disagreements',
    'human_review_triggers',
    'options_payload',
    'comparison_payload',
    'artifact_refs',
    'created_at',
    'updated_at',
  ],
  properties: {
    research_slice_option_set_id: stringId,
    workspace_id: nullableStringId,
    title_card_id: stringId,
    plan_research_slice_run_id: stringId,
    v1b_intake_readiness_assessment_id: stringId,
    v1b_intake_snapshot_id: stringId,
    research_constraint_profile_id: stringId,
    v1b_input_bundle_id: stringId,
    validated_need_ids: stringArray,
    status: { enum: [...TOPIC_SELECTION_RESEARCH_SLICE_OPTION_SET_STATUSES] },
    recommended_option_id: nullableStringId,
    selected_option_id: nullableStringId,
    option_count: numberValue,
    high_risk_option_count: numberValue,
    requires_human_review: booleanValue,
    comparison_axes: stringArray,
    comparison_summary: stringValue,
    missing_option_types: stringArray,
    unresolved_disagreements: stringArray,
    human_review_triggers: stringArray,
    options_payload: objectPayload,
    comparison_payload: objectPayload,
    input_snapshot_id: nullableStringId,
    workflow_run_id: nullableStringId,
    artifact_refs: functionalRefArray,
    created_at: stringId,
    updated_at: stringId,
  },
} as const;

export const topicSelectionResearchSliceOptionRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'research_slice_option_id',
    'title_card_id',
    'research_slice_option_set_id',
    'option_ordinal',
    'option_key',
    'status',
    'source_validated_need_refs',
    'slice_statement',
    'problem_space',
    'target_setting',
    'target_community',
    'included_boundaries',
    'excluded_boundaries',
    'contribution_type_candidate',
    'support_evidence_refs',
    'challenge_evidence_refs',
    'baseline_evidence_refs',
    'context_evidence_refs',
    'resource_assumptions',
    'data_assumptions',
    'evaluation_path',
    'baseline_assumptions',
    'hard_blockers',
    'dependency_risks',
    'slice_budget',
    'expected_claim',
    'fallback_claim',
    'observable_success_criteria',
    'main_risks',
    'baseline_risk',
    'execution_risk',
    'scope_risk',
    'claim_ceiling_alignment',
    'requires_human_review',
    'human_review_triggers',
    'details_payload',
    'created_at',
  ],
  properties: {
    research_slice_option_id: stringId,
    workspace_id: nullableStringId,
    title_card_id: stringId,
    research_slice_option_set_id: stringId,
    option_ordinal: numberValue,
    option_key: stringId,
    status: { enum: [...TOPIC_SELECTION_RESEARCH_SLICE_OPTION_STATUSES] },
    source_validated_need_refs: functionalRefArray,
    slice_statement: stringId,
    problem_space: stringId,
    target_setting: stringId,
    target_community: stringId,
    included_boundaries: stringArray,
    excluded_boundaries: stringArray,
    contribution_type_candidate: stringId,
    support_evidence_refs: functionalRefArray,
    challenge_evidence_refs: functionalRefArray,
    baseline_evidence_refs: functionalRefArray,
    context_evidence_refs: functionalRefArray,
    resource_assumptions: stringArray,
    data_assumptions: stringArray,
    evaluation_path: stringId,
    baseline_assumptions: stringArray,
    hard_blockers: stringArray,
    dependency_risks: stringArray,
    slice_budget: objectPayload,
    expected_claim: stringId,
    fallback_claim: stringId,
    observable_success_criteria: stringArray,
    main_risks: stringArray,
    baseline_risk: { enum: [...TOPIC_SELECTION_RESEARCH_SLICE_RISK_LEVELS] },
    execution_risk: { enum: [...TOPIC_SELECTION_RESEARCH_SLICE_RISK_LEVELS] },
    scope_risk: { enum: [...TOPIC_SELECTION_RESEARCH_SLICE_RISK_LEVELS] },
    claim_ceiling_alignment: topicSelectionResearchSliceClaimCeilingAlignmentSchema,
    confidence: nullableNumber,
    requires_human_review: booleanValue,
    human_review_triggers: stringArray,
    details_payload: objectPayload,
    created_at: stringId,
  },
} as const;

export const topicSelectionSliceSelectionDecisionRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'slice_selection_decision_id',
    'title_card_id',
    'research_slice_option_set_id',
    'decision',
    'decided_by',
    'selection_policy_version',
    'decision_basis',
    'selection_rationale',
    'rejected_option_reasons',
    'hard_blockers',
    'open_risks',
    'unresolved_disagreements',
    'required_actions',
    'creates_new_run_or_version',
    'requires_human_review',
    'artifact_refs',
    'created_at',
  ],
  properties: {
    slice_selection_decision_id: stringId,
    workspace_id: nullableStringId,
    title_card_id: stringId,
    research_slice_option_set_id: stringId,
    selected_option_id: nullableStringId,
    decision: { enum: [...TOPIC_SELECTION_SLICE_SELECTION_DECISIONS] },
    decided_by: { enum: ['human', 'llm', 'system', 'hybrid'] },
    selection_policy_version: stringId,
    decision_basis: objectPayload,
    selection_rationale: stringId,
    rejected_option_reasons: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['option_id', 'reason', 'reason_code'],
        properties: {
          option_id: stringId,
          reason: stringId,
          reason_code: {
            enum: [
              'hard_blocker',
              'weaker_fit',
              'higher_risk',
              'duplicate',
              'out_of_scope',
              'insufficient_evidence',
              'resource_blocked',
              'baseline_blocked',
              'other',
            ],
          },
        },
      },
    },
    hard_blockers: stringArray,
    open_risks: stringArray,
    unresolved_disagreements: stringArray,
    loopback_target: { anyOf: [{ enum: [...TOPIC_SELECTION_SLICE_LOOPBACK_TARGETS] }, { type: 'null' }] },
    loopback_target_ref: nullableFunctionalRef,
    required_actions: stringArray,
    loopback_reason_code: nullableStringId,
    source_downstream_object_ref: nullableFunctionalRef,
    creates_new_run_or_version: booleanValue,
    confidence: nullableNumber,
    requires_human_review: booleanValue,
    human_review_reason: nullableStringId,
    output_research_slice_ref: nullableFunctionalRef,
    input_snapshot_id: nullableStringId,
    workflow_run_id: nullableStringId,
    gate_result_id: nullableStringId,
    transition_attempt_id: nullableStringId,
    artifact_refs: functionalRefArray,
    created_at: stringId,
  },
} as const;

export const topicSelectionResearchSliceRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'research_slice_id',
    'title_card_id',
    'v1b_intake_snapshot_id',
    'research_constraint_profile_id',
    'v1b_input_bundle_id',
    'validated_need_id',
    'slice_version',
    'status',
    'v1b_intake_snapshot_ref',
    'research_constraint_profile_ref',
    'readiness_assessment_ref',
    'v1b_input_bundle_ref',
    'validated_need_ref',
    'evidence_map_ref',
    'search_run_ref',
    'search_plan_ref',
    'literature_snapshot_ref',
    'source_option_set_ref',
    'source_option_ref',
    'slice_selection_decision_ref',
    'problem_space',
    'slice_statement',
    'target_setting',
    'target_community',
    'included_boundaries',
    'excluded_boundaries',
    'candidate_contribution_types',
    'contribution_rationale',
    'expected_claim',
    'fallback_claim',
    'observable_success_criteria',
    'resource_assumptions',
    'data_assumptions',
    'evaluation_path',
    'baseline_assumptions',
    'dependency_risks',
    'slice_budget',
    'topic_question_guardrails',
    'value_assessment_inputs',
    'must_preserve_boundaries',
    'accepted_risk_refs',
    'memory_suggestion_refs',
    'recheck_request_refs',
    'gap_codes',
    'non_goals',
    'claim_ceiling',
    'artifact_refs',
    'created_by',
    'created_at',
    'updated_at',
  ],
  properties: {
    research_slice_id: stringId,
    workspace_id: nullableStringId,
    title_card_id: stringId,
    v1b_intake_snapshot_id: stringId,
    research_constraint_profile_id: stringId,
    v1b_input_bundle_id: stringId,
    validated_need_id: stringId,
    slice_version: stringId,
    status: { enum: [...TOPIC_SELECTION_RESEARCH_SLICE_STATUSES] },
    v1b_intake_snapshot_ref: topicSelectionFunctionalRefSchema,
    research_constraint_profile_ref: topicSelectionFunctionalRefSchema,
    readiness_assessment_ref: topicSelectionFunctionalRefSchema,
    v1b_input_bundle_ref: topicSelectionFunctionalRefSchema,
    validated_need_ref: topicSelectionFunctionalRefSchema,
    evidence_map_ref: topicSelectionFunctionalRefSchema,
    search_run_ref: topicSelectionFunctionalRefSchema,
    search_plan_ref: topicSelectionFunctionalRefSchema,
    literature_snapshot_ref: topicSelectionFunctionalRefSchema,
    source_option_set_ref: topicSelectionFunctionalRefSchema,
    source_option_ref: topicSelectionFunctionalRefSchema,
    slice_selection_decision_ref: topicSelectionFunctionalRefSchema,
    problem_space: stringId,
    slice_statement: stringId,
    target_setting: stringId,
    target_community: stringId,
    included_boundaries: stringArray,
    excluded_boundaries: stringArray,
    candidate_contribution_types: stringArray,
    preferred_contribution_type: nullableStringId,
    contribution_rationale: stringValue,
    expected_claim: stringId,
    fallback_claim: stringId,
    observable_success_criteria: stringArray,
    resource_assumptions: stringArray,
    data_assumptions: stringArray,
    evaluation_path: stringId,
    baseline_assumptions: stringArray,
    dependency_risks: stringArray,
    slice_budget: objectPayload,
    topic_question_guardrails: stringArray,
    value_assessment_inputs: stringArray,
    must_preserve_boundaries: stringArray,
    accepted_risk_refs: functionalRefArray,
    memory_suggestion_refs: functionalRefArray,
    recheck_request_refs: functionalRefArray,
    gap_codes: stringArray,
    non_goals: stringArray,
    claim_ceiling: stringId,
    decision_reason: nullableStringId,
    supersedes_research_slice_ref: nullableFunctionalRef,
    superseded_by_research_slice_ref: nullableFunctionalRef,
    input_snapshot_id: nullableStringId,
    workflow_run_id: nullableStringId,
    gate_result_id: nullableStringId,
    transition_attempt_id: nullableStringId,
    trace_snapshot_id: nullableStringId,
    artifact_refs: functionalRefArray,
    created_by: { enum: ['human', 'llm', 'system', 'hybrid'] },
    created_at: stringId,
    updated_at: stringId,
  },
} as const;

export const topicSelectionResearchSliceEvidenceRefRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'research_slice_evidence_ref_id',
    'title_card_id',
    'research_slice_id',
    'evidence_ref',
    'evidence_role',
    'rationale',
    'evidence_strength_snapshot',
    'source_locator_snapshot',
    'created_at',
  ],
  properties: {
    research_slice_evidence_ref_id: stringId,
    workspace_id: nullableStringId,
    title_card_id: stringId,
    research_slice_id: stringId,
    evidence_ref: topicSelectionFunctionalRefSchema,
    evidence_role: { enum: [...TOPIC_SELECTION_RESEARCH_SLICE_EVIDENCE_ROLES] },
    rationale: stringValue,
    evidence_strength_snapshot: objectPayload,
    source_locator_snapshot: objectPayload,
    created_at: stringId,
  },
} as const;

export const topicSelectionResearchSliceBoundaryRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'research_slice_boundary_id',
    'title_card_id',
    'research_slice_id',
    'boundary_kind',
    'boundary_type',
    'statement',
    'reason',
    'evidence_refs',
    'created_at',
  ],
  properties: {
    research_slice_boundary_id: stringId,
    workspace_id: nullableStringId,
    title_card_id: stringId,
    research_slice_id: stringId,
    boundary_kind: { enum: [...TOPIC_SELECTION_RESEARCH_SLICE_BOUNDARY_KINDS] },
    boundary_type: stringId,
    statement: stringId,
    reason: stringValue,
    evidence_refs: functionalRefArray,
    created_at: stringId,
  },
} as const;

export const topicSelectionResearchSliceAssumptionRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'research_slice_assumption_id',
    'title_card_id',
    'research_slice_id',
    'assumption_type',
    'statement',
    'status',
    'evidence_refs',
    'risk_level',
    'created_at',
  ],
  properties: {
    research_slice_assumption_id: stringId,
    workspace_id: nullableStringId,
    title_card_id: stringId,
    research_slice_id: stringId,
    assumption_type: { enum: [...TOPIC_SELECTION_RESEARCH_SLICE_ASSUMPTION_TYPES] },
    statement: stringId,
    status: stringId,
    evidence_refs: functionalRefArray,
    risk_level: { enum: [...TOPIC_SELECTION_RESEARCH_SLICE_RISK_LEVELS] },
    created_at: stringId,
  },
} as const;

export const topicSelectionV1bTopicQuestionFormationInputSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
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
    'target_community',
    'problem_space',
    'slice_statement',
    'included_boundaries',
    'excluded_boundaries',
    'evidence_refs',
    'boundaries',
    'assumptions',
    'candidate_contribution_types',
    'expected_claim',
    'fallback_claim',
    'observable_success_criteria',
    'resource_assumptions',
    'data_assumptions',
    'evaluation_path',
    'baseline_assumptions',
    'dependency_risks',
    'slice_budget',
    'accepted_risk_refs',
    'memory_suggestion_refs',
    'recheck_request_refs',
    'gap_codes',
    'non_goals',
    'claim_ceiling',
    'topic_question_guardrails',
    'value_assessment_inputs',
    'must_preserve_boundaries',
  ],
  properties: {
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
    target_community: stringId,
    problem_space: stringId,
    slice_statement: stringId,
    included_boundaries: stringArray,
    excluded_boundaries: stringArray,
    evidence_refs: { type: 'array', items: topicSelectionResearchSliceEvidenceRefRecordSchema },
    boundaries: { type: 'array', items: topicSelectionResearchSliceBoundaryRecordSchema },
    assumptions: { type: 'array', items: topicSelectionResearchSliceAssumptionRecordSchema },
    candidate_contribution_types: stringArray,
    preferred_contribution_type: nullableStringId,
    expected_claim: stringId,
    fallback_claim: stringId,
    observable_success_criteria: stringArray,
    resource_assumptions: stringArray,
    data_assumptions: stringArray,
    evaluation_path: stringId,
    baseline_assumptions: stringArray,
    dependency_risks: stringArray,
    slice_budget: objectPayload,
    accepted_risk_refs: functionalRefArray,
    memory_suggestion_refs: functionalRefArray,
    recheck_request_refs: functionalRefArray,
    gap_codes: stringArray,
    non_goals: stringArray,
    claim_ceiling: stringId,
    topic_question_guardrails: stringArray,
    value_assessment_inputs: stringArray,
    must_preserve_boundaries: stringArray,
  },
} as const;
