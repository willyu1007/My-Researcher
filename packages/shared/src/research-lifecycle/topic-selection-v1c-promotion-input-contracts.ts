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
import {
  topicSelectionTopicQuestionEvidenceRefRecordSchema,
} from './topic-selection-v1b-topic-question-contracts.js';
import type {
  TopicSelectionTopicPackageRecord,
  TopicSelectionV1bToV1cInputBundleRecord,
} from './topic-selection-v1b-topic-package-contracts.js';
import type {
  TopicSelectionV1bPackageDraftInput,
} from './topic-selection-v1b-value-assessment-contracts.js';

export const TOPIC_SELECTION_PROMOTION_INPUT_SNAPSHOT_CLOSURE_STATUSES = [
  'ready_for_gate',
  'blocked',
  'needs_upstream_refresh',
  'superseded',
] as const;
export type TopicSelectionPromotionInputSnapshotClosureStatus =
  (typeof TOPIC_SELECTION_PROMOTION_INPUT_SNAPSHOT_CLOSURE_STATUSES)[number];

export const TOPIC_SELECTION_PROMOTION_INPUT_CHECK_STATUSES = [
  'passed',
  'warning',
  'blocking',
] as const;
export type TopicSelectionPromotionInputCheckStatus =
  (typeof TOPIC_SELECTION_PROMOTION_INPUT_CHECK_STATUSES)[number];

export interface TopicSelectionPromotionInputSnapshotCheckDetail {
  check_key: string;
  status: TopicSelectionPromotionInputCheckStatus;
  message: string;
  refs: TopicSelectionFunctionalRef[];
  required_actions: string[];
}

export interface TopicSelectionPromotionInputSnapshotRecord {
  promotion_input_snapshot_id: string;
  workspace_id?: string | null;
  title_card_id: string;
  v1b_to_v1c_input_bundle_id: string;
  topic_package_id: string;
  package_version: string;
  closure_status: TopicSelectionPromotionInputSnapshotClosureStatus;
  stop_condition_code?: string | null;
  required_actions: string[];
  blockers: TopicSelectionGateIssue[];
  warnings: TopicSelectionGateIssue[];
  check_details: TopicSelectionPromotionInputSnapshotCheckDetail[];
  bundle_hash: string;
  package_snapshot_hash: string;
  package_draft_input_snapshot_hash: string;
  promotion_input_snapshot_hash: string;
  source_bundle_ref: TopicSelectionFunctionalRef;
  promotion_input_snapshot_ref: TopicSelectionFunctionalRef;
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
  risk_finding_refs?: TopicSelectionFunctionalRef[];
  blocker_refs: TopicSelectionFunctionalRef[];
  memory_suggestion_refs: TopicSelectionFunctionalRef[];
  recheck_request_refs: TopicSelectionFunctionalRef[];
  readiness_check_refs: TopicSelectionFunctionalRef[];
  replacement_bundle_ref?: TopicSelectionFunctionalRef | null;
  source_bundle_snapshot: TopicSelectionV1bToV1cInputBundleRecord;
  package_snapshot: TopicSelectionTopicPackageRecord;
  package_draft_input_snapshot: TopicSelectionV1bPackageDraftInput;
  input_snapshot_id?: string | null;
  workflow_run_id?: string | null;
  gate_result_id?: string | null;
  transition_attempt_id?: string | null;
  trace_snapshot_id?: string | null;
  artifact_refs: TopicSelectionFunctionalRef[];
  created_by: TopicSelectionActorType;
  created_at: string;
}

export interface TopicSelectionPromotionInputSnapshotHandoff {
  promotion_input_snapshot_id: string;
  promotion_input_snapshot_ref: TopicSelectionFunctionalRef;
  v1b_to_v1c_input_bundle_id: string;
  topic_package_id: string;
  package_version: string;
  closure_status: 'ready_for_gate';
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
  risk_finding_refs?: TopicSelectionFunctionalRef[];
  blocker_refs: TopicSelectionFunctionalRef[];
  memory_suggestion_refs: TopicSelectionFunctionalRef[];
  recheck_request_refs: TopicSelectionFunctionalRef[];
  readiness_check_refs: TopicSelectionFunctionalRef[];
  snapshot_hashes: {
    bundle_hash: string;
    package_snapshot_hash: string;
    package_draft_input_snapshot_hash: string;
    promotion_input_snapshot_hash: string;
  };
  snapshot: TopicSelectionPromotionInputSnapshotRecord;
}

export type PromotionInputSnapshot = TopicSelectionPromotionInputSnapshotRecord;
export type PromotionInputSnapshotHandoff = TopicSelectionPromotionInputSnapshotHandoff;
export type PromotionInputSnapshotCheckDetail = TopicSelectionPromotionInputSnapshotCheckDetail;

const stringId = { type: 'string', minLength: 1 } as const;
const nullableStringId = { anyOf: [stringId, { type: 'null' }] } as const;
const objectPayload = { type: 'object', additionalProperties: true } as const;
const functionalRefArray = { type: 'array', items: topicSelectionFunctionalRefSchema } as const;
const topicQuestionEvidenceRefArray = {
  type: 'array',
  items: topicSelectionTopicQuestionEvidenceRefRecordSchema,
} as const;
const gateIssueArray = { type: 'array', items: topicSelectionGateIssueSchema } as const;
const nullableFunctionalRef = { anyOf: [topicSelectionFunctionalRefSchema, { type: 'null' }] } as const;

export const topicSelectionPromotionInputSnapshotCheckDetailSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'check_key',
    'status',
    'message',
    'refs',
    'required_actions',
  ],
  properties: {
    check_key: stringId,
    status: { enum: [...TOPIC_SELECTION_PROMOTION_INPUT_CHECK_STATUSES] },
    message: stringId,
    refs: functionalRefArray,
    required_actions: { type: 'array', items: stringId },
  },
} as const;

export const topicSelectionPromotionInputSnapshotRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'promotion_input_snapshot_id',
    'title_card_id',
    'v1b_to_v1c_input_bundle_id',
    'topic_package_id',
    'package_version',
    'closure_status',
    'required_actions',
    'blockers',
    'warnings',
    'check_details',
    'bundle_hash',
    'package_snapshot_hash',
    'package_draft_input_snapshot_hash',
    'promotion_input_snapshot_hash',
    'source_bundle_ref',
    'promotion_input_snapshot_ref',
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
    'source_bundle_snapshot',
    'package_snapshot',
    'package_draft_input_snapshot',
    'artifact_refs',
    'created_by',
    'created_at',
  ],
  properties: {
    promotion_input_snapshot_id: stringId,
    workspace_id: nullableStringId,
    title_card_id: stringId,
    v1b_to_v1c_input_bundle_id: stringId,
    topic_package_id: stringId,
    package_version: stringId,
    closure_status: { enum: [...TOPIC_SELECTION_PROMOTION_INPUT_SNAPSHOT_CLOSURE_STATUSES] },
    stop_condition_code: nullableStringId,
    required_actions: { type: 'array', items: stringId },
    blockers: gateIssueArray,
    warnings: gateIssueArray,
    check_details: {
      type: 'array',
      items: topicSelectionPromotionInputSnapshotCheckDetailSchema,
    },
    bundle_hash: stringId,
    package_snapshot_hash: stringId,
    package_draft_input_snapshot_hash: stringId,
    promotion_input_snapshot_hash: stringId,
    source_bundle_ref: topicSelectionFunctionalRefSchema,
    promotion_input_snapshot_ref: topicSelectionFunctionalRefSchema,
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
    risk_finding_refs: functionalRefArray,
    blocker_refs: functionalRefArray,
    memory_suggestion_refs: functionalRefArray,
    recheck_request_refs: functionalRefArray,
    readiness_check_refs: functionalRefArray,
    replacement_bundle_ref: nullableFunctionalRef,
    source_bundle_snapshot: objectPayload,
    package_snapshot: objectPayload,
    package_draft_input_snapshot: objectPayload,
    input_snapshot_id: nullableStringId,
    workflow_run_id: nullableStringId,
    gate_result_id: nullableStringId,
    transition_attempt_id: nullableStringId,
    trace_snapshot_id: nullableStringId,
    artifact_refs: functionalRefArray,
    created_by: stringId,
    created_at: stringId,
  },
} as const;

export const topicSelectionPromotionInputSnapshotHandoffSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'promotion_input_snapshot_id',
    'promotion_input_snapshot_ref',
    'v1b_to_v1c_input_bundle_id',
    'topic_package_id',
    'package_version',
    'closure_status',
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
    'snapshot_hashes',
    'snapshot',
  ],
  properties: {
    promotion_input_snapshot_id: stringId,
    promotion_input_snapshot_ref: topicSelectionFunctionalRefSchema,
    v1b_to_v1c_input_bundle_id: stringId,
    topic_package_id: stringId,
    package_version: stringId,
    closure_status: { enum: ['ready_for_gate'] },
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
    risk_finding_refs: functionalRefArray,
    blocker_refs: functionalRefArray,
    memory_suggestion_refs: functionalRefArray,
    recheck_request_refs: functionalRefArray,
    readiness_check_refs: functionalRefArray,
    snapshot_hashes: {
      type: 'object',
      additionalProperties: false,
      required: [
        'bundle_hash',
        'package_snapshot_hash',
        'package_draft_input_snapshot_hash',
        'promotion_input_snapshot_hash',
      ],
      properties: {
        bundle_hash: stringId,
        package_snapshot_hash: stringId,
        package_draft_input_snapshot_hash: stringId,
        promotion_input_snapshot_hash: stringId,
      },
    },
    snapshot: topicSelectionPromotionInputSnapshotRecordSchema,
  },
} as const;
