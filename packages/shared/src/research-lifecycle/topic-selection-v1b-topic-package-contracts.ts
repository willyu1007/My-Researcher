import {
  topicSelectionFunctionalRefSchema,
  topicSelectionGateIssueSchema,
  type TopicSelectionActorType,
  type TopicSelectionFunctionalRef,
  type TopicSelectionGateIssue,
} from './topic-selection-control-plane-contracts.js';
import type {
  TopicSelectionTopicQuestionEvidenceRefRecord,
} from './topic-selection-v1b-topic-question-contracts.js';
import type {
  TopicSelectionV1bPackageDraftInput,
} from './topic-selection-v1b-value-assessment-contracts.js';

export const TOPIC_SELECTION_TOPIC_PACKAGE_READINESS_STATUSES = [
  'draft',
  'ready_for_promotion_review',
  'blocked',
  'needs_revision',
  'superseded',
] as const;
export type TopicSelectionTopicPackageReadinessStatus =
  (typeof TOPIC_SELECTION_TOPIC_PACKAGE_READINESS_STATUSES)[number];

export const TOPIC_SELECTION_PACKAGE_TRACE_BOUNDARY_CHECK_STATUSES = [
  'passed',
  'needs_revision',
  'blocked',
] as const;
export type TopicSelectionPackageTraceBoundaryCheckStatus =
  (typeof TOPIC_SELECTION_PACKAGE_TRACE_BOUNDARY_CHECK_STATUSES)[number];

export const TOPIC_SELECTION_V1B_TO_V1C_INPUT_BUNDLE_STATUSES = [
  'ready_for_promotion_review',
  'superseded',
] as const;
export type TopicSelectionV1bToV1cInputBundleStatus =
  (typeof TOPIC_SELECTION_V1B_TO_V1C_INPUT_BUNDLE_STATUSES)[number];

export interface TopicSelectionTopicPackageRecord {
  topic_package_id: string;
  workspace_id?: string | null;
  title_card_id: string;
  research_record_id: string;
  topic_question_id: string;
  topic_question_contract_id: string;
  topic_value_assessment_id: string;
  value_reasoning_memo_id: string;
  value_disposition_decision_id: string;
  research_slice_id: string;
  research_slice_version: string;
  package_version: string;
  package_readiness_status: TopicSelectionTopicPackageReadinessStatus;
  topic_package_ref: TopicSelectionFunctionalRef;
  topic_value_assessment_ref: TopicSelectionFunctionalRef;
  value_reasoning_memo_ref: TopicSelectionFunctionalRef;
  value_disposition_decision_ref: TopicSelectionFunctionalRef;
  topic_question_ref: TopicSelectionFunctionalRef;
  topic_question_contract_ref: TopicSelectionFunctionalRef;
  answerability_plan_ref: TopicSelectionFunctionalRef;
  research_slice_ref: TopicSelectionFunctionalRef;
  validated_need_refs: TopicSelectionFunctionalRef[];
  evidence_refs: TopicSelectionTopicQuestionEvidenceRefRecord[];
  selected_evidence_refs: TopicSelectionFunctionalRef[];
  accepted_risk_refs: TopicSelectionFunctionalRef[];
  blocker_refs: TopicSelectionFunctionalRef[];
  memory_suggestion_refs: TopicSelectionFunctionalRef[];
  recheck_request_refs: TopicSelectionFunctionalRef[];
  title_candidates: string[];
  research_background: string;
  contribution_summary: string;
  candidate_methods: string[];
  evaluation_plan: string;
  key_risks: string[];
  non_goals: string[];
  selected_literature_evidence_ids: string[];
  package_payload: Record<string, unknown>;
  trace_boundary_check_id?: string | null;
  readiness_assessment_id?: string | null;
  v1c_input_bundle_id?: string | null;
  trace_snapshot_id?: string | null;
  input_snapshot_id?: string | null;
  workflow_run_id?: string | null;
  gate_result_id?: string | null;
  transition_attempt_id?: string | null;
  artifact_refs: TopicSelectionFunctionalRef[];
  risk_finding_refs?: TopicSelectionFunctionalRef[];
  created_by: TopicSelectionActorType;
  created_at: string;
  updated_at: string;
}

export interface TopicSelectionPackageTraceBoundaryCheckRecord {
  package_trace_boundary_check_id: string;
  workspace_id?: string | null;
  title_card_id: string;
  topic_package_id: string;
  value_disposition_decision_id: string;
  topic_value_assessment_id: string;
  topic_question_contract_id: string;
  research_slice_id: string;
  check_status: TopicSelectionPackageTraceBoundaryCheckStatus;
  package_ref: TopicSelectionFunctionalRef;
  topic_value_assessment_ref: TopicSelectionFunctionalRef;
  value_reasoning_memo_ref: TopicSelectionFunctionalRef;
  value_disposition_decision_ref: TopicSelectionFunctionalRef;
  topic_question_ref: TopicSelectionFunctionalRef;
  topic_question_contract_ref: TopicSelectionFunctionalRef;
  answerability_plan_ref: TopicSelectionFunctionalRef;
  research_slice_ref: TopicSelectionFunctionalRef;
  validated_need_refs: TopicSelectionFunctionalRef[];
  evidence_refs: TopicSelectionFunctionalRef[];
  accepted_risk_refs: TopicSelectionFunctionalRef[];
  blocker_refs: TopicSelectionFunctionalRef[];
  recheck_request_refs: TopicSelectionFunctionalRef[];
  missing_ref_codes: string[];
  new_ref_codes: string[];
  boundary_conflict_codes: string[];
  carry_forward_codes: string[];
  trace_issues: TopicSelectionGateIssue[];
  boundary_issues: TopicSelectionGateIssue[];
  narrative_consistency: Record<string, unknown>;
  input_snapshot_id?: string | null;
  workflow_run_id?: string | null;
  gate_result_id?: string | null;
  transition_attempt_id?: string | null;
  artifact_refs: TopicSelectionFunctionalRef[];
  risk_finding_refs?: TopicSelectionFunctionalRef[];
  created_at: string;
}

export interface TopicSelectionTopicPackageReadinessAssessmentRecord {
  package_readiness_assessment_id: string;
  workspace_id?: string | null;
  title_card_id: string;
  topic_package_id: string;
  value_disposition_decision_id: string;
  package_trace_boundary_check_id: string;
  package_version: string;
  package_readiness_status: TopicSelectionTopicPackageReadinessStatus;
  blockers: TopicSelectionGateIssue[];
  warnings: TopicSelectionGateIssue[];
  required_actions: string[];
  accepted_risk_refs: TopicSelectionFunctionalRef[];
  blocker_refs: TopicSelectionFunctionalRef[];
  recheck_request_refs: TopicSelectionFunctionalRef[];
  input_snapshot_id?: string | null;
  workflow_run_id?: string | null;
  gate_result_id?: string | null;
  transition_attempt_id?: string | null;
  artifact_refs: TopicSelectionFunctionalRef[];
  risk_finding_refs?: TopicSelectionFunctionalRef[];
  assessed_by: TopicSelectionActorType;
  created_at: string;
}

export interface TopicSelectionV1bToV1cInputBundleRecord {
  v1b_to_v1c_input_bundle_id: string;
  workspace_id?: string | null;
  title_card_id: string;
  topic_package_id: string;
  package_version: string;
  package_readiness_status: 'ready_for_promotion_review';
  bundle_status: TopicSelectionV1bToV1cInputBundleStatus;
  topic_package_ref: TopicSelectionFunctionalRef;
  package_trace_boundary_check_ref: TopicSelectionFunctionalRef;
  package_readiness_assessment_ref: TopicSelectionFunctionalRef;
  topic_value_assessment_ref: TopicSelectionFunctionalRef;
  value_reasoning_memo_ref: TopicSelectionFunctionalRef;
  value_disposition_decision_ref: TopicSelectionFunctionalRef;
  topic_question_ref: TopicSelectionFunctionalRef;
  topic_question_contract_ref: TopicSelectionFunctionalRef;
  answerability_plan_ref: TopicSelectionFunctionalRef;
  research_slice_ref: TopicSelectionFunctionalRef;
  validated_need_refs: TopicSelectionFunctionalRef[];
  evidence_refs: TopicSelectionTopicQuestionEvidenceRefRecord[];
  accepted_risk_refs: TopicSelectionFunctionalRef[];
  blocker_refs: TopicSelectionFunctionalRef[];
  memory_suggestion_refs: TopicSelectionFunctionalRef[];
  recheck_request_refs: TopicSelectionFunctionalRef[];
  readiness_check_refs: TopicSelectionFunctionalRef[];
  package_snapshot: TopicSelectionTopicPackageRecord;
  package_draft_input_snapshot: TopicSelectionV1bPackageDraftInput;
  bundle_hash: string;
  input_snapshot_id?: string | null;
  workflow_run_id?: string | null;
  gate_result_id?: string | null;
  transition_attempt_id?: string | null;
  artifact_refs: TopicSelectionFunctionalRef[];
  risk_finding_refs?: TopicSelectionFunctionalRef[];
  created_at: string;
}

export interface TopicSelectionV1bTopicPackageCreationResult {
  topic_package: TopicSelectionTopicPackageRecord;
  package_trace_boundary_check: TopicSelectionPackageTraceBoundaryCheckRecord;
  package_readiness_assessment: TopicSelectionTopicPackageReadinessAssessmentRecord;
  v1c_input_bundle: TopicSelectionV1bToV1cInputBundleRecord | null;
}

export type TopicPackageDraft = TopicSelectionTopicPackageRecord;
export type PackageTraceBoundaryCheck = TopicSelectionPackageTraceBoundaryCheckRecord;
export type TopicPackageReadinessAssessment = TopicSelectionTopicPackageReadinessAssessmentRecord;
export type TopicSelectionV1bToV1cInputBundle = TopicSelectionV1bToV1cInputBundleRecord;

const stringId = { type: 'string', minLength: 1 } as const;
const stringValue = { type: 'string' } as const;
const nullableStringId = { anyOf: [stringId, { type: 'null' }] } as const;
const stringArray = { type: 'array', items: stringId } as const;
const objectPayload = { type: 'object', additionalProperties: true } as const;
const functionalRefArray = { type: 'array', items: topicSelectionFunctionalRefSchema } as const;
const topicQuestionEvidenceRefArray = { type: 'array', items: objectPayload } as const;
const gateIssueArray = { type: 'array', items: topicSelectionGateIssueSchema } as const;

export const topicSelectionTopicPackageRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'topic_package_id',
    'title_card_id',
    'research_record_id',
    'topic_question_id',
    'topic_question_contract_id',
    'topic_value_assessment_id',
    'value_reasoning_memo_id',
    'value_disposition_decision_id',
    'research_slice_id',
    'research_slice_version',
    'package_version',
    'package_readiness_status',
    'topic_package_ref',
    'topic_value_assessment_ref',
    'value_reasoning_memo_ref',
    'value_disposition_decision_ref',
    'topic_question_ref',
    'topic_question_contract_ref',
    'answerability_plan_ref',
    'research_slice_ref',
    'validated_need_refs',
    'evidence_refs',
    'selected_evidence_refs',
    'accepted_risk_refs',
    'blocker_refs',
    'memory_suggestion_refs',
    'recheck_request_refs',
    'title_candidates',
    'research_background',
    'contribution_summary',
    'candidate_methods',
    'evaluation_plan',
    'key_risks',
    'non_goals',
    'selected_literature_evidence_ids',
    'package_payload',
    'artifact_refs',
    'created_by',
    'created_at',
    'updated_at',
  ],
  properties: {
    topic_package_id: stringId,
    workspace_id: nullableStringId,
    title_card_id: stringId,
    research_record_id: stringId,
    topic_question_id: stringId,
    topic_question_contract_id: stringId,
    topic_value_assessment_id: stringId,
    value_reasoning_memo_id: stringId,
    value_disposition_decision_id: stringId,
    research_slice_id: stringId,
    research_slice_version: stringId,
    package_version: stringId,
    package_readiness_status: { enum: [...TOPIC_SELECTION_TOPIC_PACKAGE_READINESS_STATUSES] },
    topic_package_ref: topicSelectionFunctionalRefSchema,
    topic_value_assessment_ref: topicSelectionFunctionalRefSchema,
    value_reasoning_memo_ref: topicSelectionFunctionalRefSchema,
    value_disposition_decision_ref: topicSelectionFunctionalRefSchema,
    topic_question_ref: topicSelectionFunctionalRefSchema,
    topic_question_contract_ref: topicSelectionFunctionalRefSchema,
    answerability_plan_ref: topicSelectionFunctionalRefSchema,
    research_slice_ref: topicSelectionFunctionalRefSchema,
    validated_need_refs: functionalRefArray,
    evidence_refs: topicQuestionEvidenceRefArray,
    selected_evidence_refs: functionalRefArray,
    accepted_risk_refs: functionalRefArray,
    blocker_refs: functionalRefArray,
    memory_suggestion_refs: functionalRefArray,
    recheck_request_refs: functionalRefArray,
    title_candidates: stringArray,
    research_background: stringId,
    contribution_summary: stringId,
    candidate_methods: stringArray,
    evaluation_plan: stringId,
    key_risks: stringArray,
    non_goals: stringArray,
    selected_literature_evidence_ids: stringArray,
    package_payload: objectPayload,
    trace_boundary_check_id: nullableStringId,
    readiness_assessment_id: nullableStringId,
    v1c_input_bundle_id: nullableStringId,
    trace_snapshot_id: nullableStringId,
    input_snapshot_id: nullableStringId,
    workflow_run_id: nullableStringId,
    gate_result_id: nullableStringId,
    transition_attempt_id: nullableStringId,
    artifact_refs: functionalRefArray,
    risk_finding_refs: functionalRefArray,
    created_by: stringValue,
    created_at: stringId,
    updated_at: stringId,
  },
} as const;

export const topicSelectionPackageTraceBoundaryCheckRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'package_trace_boundary_check_id',
    'title_card_id',
    'topic_package_id',
    'value_disposition_decision_id',
    'topic_value_assessment_id',
    'topic_question_contract_id',
    'research_slice_id',
    'check_status',
    'package_ref',
    'topic_value_assessment_ref',
    'value_reasoning_memo_ref',
    'value_disposition_decision_ref',
    'topic_question_ref',
    'topic_question_contract_ref',
    'answerability_plan_ref',
    'research_slice_ref',
    'validated_need_refs',
    'evidence_refs',
    'accepted_risk_refs',
    'blocker_refs',
    'recheck_request_refs',
    'missing_ref_codes',
    'new_ref_codes',
    'boundary_conflict_codes',
    'carry_forward_codes',
    'trace_issues',
    'boundary_issues',
    'narrative_consistency',
    'artifact_refs',
    'created_at',
  ],
  properties: {
    package_trace_boundary_check_id: stringId,
    workspace_id: nullableStringId,
    title_card_id: stringId,
    topic_package_id: stringId,
    value_disposition_decision_id: stringId,
    topic_value_assessment_id: stringId,
    topic_question_contract_id: stringId,
    research_slice_id: stringId,
    check_status: { enum: [...TOPIC_SELECTION_PACKAGE_TRACE_BOUNDARY_CHECK_STATUSES] },
    package_ref: topicSelectionFunctionalRefSchema,
    topic_value_assessment_ref: topicSelectionFunctionalRefSchema,
    value_reasoning_memo_ref: topicSelectionFunctionalRefSchema,
    value_disposition_decision_ref: topicSelectionFunctionalRefSchema,
    topic_question_ref: topicSelectionFunctionalRefSchema,
    topic_question_contract_ref: topicSelectionFunctionalRefSchema,
    answerability_plan_ref: topicSelectionFunctionalRefSchema,
    research_slice_ref: topicSelectionFunctionalRefSchema,
    validated_need_refs: functionalRefArray,
    evidence_refs: functionalRefArray,
    accepted_risk_refs: functionalRefArray,
    blocker_refs: functionalRefArray,
    recheck_request_refs: functionalRefArray,
    missing_ref_codes: stringArray,
    new_ref_codes: stringArray,
    boundary_conflict_codes: stringArray,
    carry_forward_codes: stringArray,
    trace_issues: gateIssueArray,
    boundary_issues: gateIssueArray,
    narrative_consistency: objectPayload,
    input_snapshot_id: nullableStringId,
    workflow_run_id: nullableStringId,
    gate_result_id: nullableStringId,
    transition_attempt_id: nullableStringId,
    artifact_refs: functionalRefArray,
    risk_finding_refs: functionalRefArray,
    created_at: stringId,
  },
} as const;

export const topicSelectionTopicPackageReadinessAssessmentRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'package_readiness_assessment_id',
    'title_card_id',
    'topic_package_id',
    'value_disposition_decision_id',
    'package_trace_boundary_check_id',
    'package_version',
    'package_readiness_status',
    'blockers',
    'warnings',
    'required_actions',
    'accepted_risk_refs',
    'blocker_refs',
    'recheck_request_refs',
    'artifact_refs',
    'assessed_by',
    'created_at',
  ],
  properties: {
    package_readiness_assessment_id: stringId,
    workspace_id: nullableStringId,
    title_card_id: stringId,
    topic_package_id: stringId,
    value_disposition_decision_id: stringId,
    package_trace_boundary_check_id: stringId,
    package_version: stringId,
    package_readiness_status: { enum: [...TOPIC_SELECTION_TOPIC_PACKAGE_READINESS_STATUSES] },
    blockers: gateIssueArray,
    warnings: gateIssueArray,
    required_actions: stringArray,
    accepted_risk_refs: functionalRefArray,
    blocker_refs: functionalRefArray,
    recheck_request_refs: functionalRefArray,
    input_snapshot_id: nullableStringId,
    workflow_run_id: nullableStringId,
    gate_result_id: nullableStringId,
    transition_attempt_id: nullableStringId,
    artifact_refs: functionalRefArray,
    risk_finding_refs: functionalRefArray,
    assessed_by: stringValue,
    created_at: stringId,
  },
} as const;

export const topicSelectionV1bToV1cInputBundleRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'v1b_to_v1c_input_bundle_id',
    'title_card_id',
    'topic_package_id',
    'package_version',
    'package_readiness_status',
    'bundle_status',
    'topic_package_ref',
    'package_trace_boundary_check_ref',
    'package_readiness_assessment_ref',
    'topic_value_assessment_ref',
    'value_reasoning_memo_ref',
    'value_disposition_decision_ref',
    'topic_question_ref',
    'topic_question_contract_ref',
    'answerability_plan_ref',
    'research_slice_ref',
    'validated_need_refs',
    'evidence_refs',
    'accepted_risk_refs',
    'blocker_refs',
    'memory_suggestion_refs',
    'recheck_request_refs',
    'readiness_check_refs',
    'package_snapshot',
    'package_draft_input_snapshot',
    'bundle_hash',
    'artifact_refs',
    'created_at',
  ],
  properties: {
    v1b_to_v1c_input_bundle_id: stringId,
    workspace_id: nullableStringId,
    title_card_id: stringId,
    topic_package_id: stringId,
    package_version: stringId,
    package_readiness_status: { enum: ['ready_for_promotion_review'] },
    bundle_status: { enum: [...TOPIC_SELECTION_V1B_TO_V1C_INPUT_BUNDLE_STATUSES] },
    topic_package_ref: topicSelectionFunctionalRefSchema,
    package_trace_boundary_check_ref: topicSelectionFunctionalRefSchema,
    package_readiness_assessment_ref: topicSelectionFunctionalRefSchema,
    topic_value_assessment_ref: topicSelectionFunctionalRefSchema,
    value_reasoning_memo_ref: topicSelectionFunctionalRefSchema,
    value_disposition_decision_ref: topicSelectionFunctionalRefSchema,
    topic_question_ref: topicSelectionFunctionalRefSchema,
    topic_question_contract_ref: topicSelectionFunctionalRefSchema,
    answerability_plan_ref: topicSelectionFunctionalRefSchema,
    research_slice_ref: topicSelectionFunctionalRefSchema,
    validated_need_refs: functionalRefArray,
    evidence_refs: topicQuestionEvidenceRefArray,
    accepted_risk_refs: functionalRefArray,
    blocker_refs: functionalRefArray,
    memory_suggestion_refs: functionalRefArray,
    recheck_request_refs: functionalRefArray,
    readiness_check_refs: functionalRefArray,
    package_snapshot: objectPayload,
    package_draft_input_snapshot: objectPayload,
    bundle_hash: stringId,
    input_snapshot_id: nullableStringId,
    workflow_run_id: nullableStringId,
    gate_result_id: nullableStringId,
    transition_attempt_id: nullableStringId,
    artifact_refs: functionalRefArray,
    risk_finding_refs: functionalRefArray,
    created_at: stringId,
  },
} as const;
