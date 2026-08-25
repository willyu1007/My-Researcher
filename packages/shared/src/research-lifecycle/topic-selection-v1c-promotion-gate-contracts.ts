import {
  topicSelectionFunctionalRefSchema,
  topicSelectionGateIssueSchema,
  type TopicSelectionActorType,
  type TopicSelectionArtifactRefRecord,
  type TopicSelectionFunctionalRef,
  type TopicSelectionGateIssue,
} from './topic-selection-control-plane-contracts.js';
import type {
  TopicSelectionPromotionInputSnapshotHandoff,
} from './topic-selection-v1c-promotion-input-contracts.js';
import {
  topicSelectionPromotionInputSnapshotHandoffSchema,
} from './topic-selection-v1c-promotion-input-contracts.js';

export const TOPIC_SELECTION_PROMOTION_SUPPORT_GENERATION_MODES = [
  'deterministic',
  'llm_draft',
] as const;
export type TopicSelectionPromotionSupportGenerationMode =
  (typeof TOPIC_SELECTION_PROMOTION_SUPPORT_GENERATION_MODES)[number];

export const TOPIC_SELECTION_PROMOTION_GATE_DISPOSITIONS = [
  'ready_for_human_decision',
  'blocked',
  'needs_revision',
  'recheck_required',
  'park',
] as const;
export type TopicSelectionPromotionGateDisposition =
  (typeof TOPIC_SELECTION_PROMOTION_GATE_DISPOSITIONS)[number];

export const TOPIC_SELECTION_PROMOTION_GATE_REQUIRED_ACTION_SEVERITIES = [
  'info',
  'warning',
  'blocking',
] as const;
export type TopicSelectionPromotionGateRequiredActionSeverity =
  (typeof TOPIC_SELECTION_PROMOTION_GATE_REQUIRED_ACTION_SEVERITIES)[number];

export const TOPIC_SELECTION_PROMOTION_GATE_LOOPBACK_TARGETS = [
  'none',
  'package',
  'value',
  'question',
  'slice',
  'evidence_or_search',
  'park',
] as const;
export type TopicSelectionPromotionGateLoopbackTarget =
  (typeof TOPIC_SELECTION_PROMOTION_GATE_LOOPBACK_TARGETS)[number];

export const TOPIC_SELECTION_ARGUMENT_READINESS_MINI_CHECK_STATUSES = [
  'passed',
  'warning',
  'blocking',
] as const;
export type TopicSelectionArgumentReadinessMiniCheckStatus =
  (typeof TOPIC_SELECTION_ARGUMENT_READINESS_MINI_CHECK_STATUSES)[number];

export interface TopicSelectionPromotionGateRequiredAction {
  action_code: string;
  severity: TopicSelectionPromotionGateRequiredActionSeverity;
  loopback_target: TopicSelectionPromotionGateLoopbackTarget;
  refs: TopicSelectionFunctionalRef[];
  reason: string;
}

export interface TopicSelectionPromotionGateLoopbackHint {
  loopback_target: TopicSelectionPromotionGateLoopbackTarget;
  loopback_cause: string;
  required_actions: TopicSelectionPromotionGateRequiredAction[];
  refs: TopicSelectionFunctionalRef[];
}

export interface TopicSelectionPromotionDecisionSupportLlmDraft {
  summary?: string | null;
  reviewer_questions?: string[];
  risk_notes?: string[];
  recheck_notes?: string[];
  dossier_markdown?: string | null;
  n3_semantic_layer?: Record<string, unknown> | null;
}

export interface TopicSelectionPromotionDecisionSupportRecord {
  promotion_decision_support_id: string;
  support_run_key: string;
  workspace_id?: string | null;
  title_card_id: string;
  promotion_input_snapshot_id: string;
  promotion_input_snapshot_ref: TopicSelectionFunctionalRef;
  promotion_input_snapshot_hash: string;
  topic_package_id: string;
  package_version: string;
  support_generation_mode: TopicSelectionPromotionSupportGenerationMode;
  support_status: 'succeeded' | 'succeeded_with_fallback';
  summary: string;
  reviewer_questions: string[];
  risk_notes: string[];
  recheck_notes: string[];
  source_refs: TopicSelectionFunctionalRef[];
  accepted_risk_refs: TopicSelectionFunctionalRef[];
  blocker_refs: TopicSelectionFunctionalRef[];
  recheck_request_refs: TopicSelectionFunctionalRef[];
  memory_suggestion_refs: TopicSelectionFunctionalRef[];
  warnings: TopicSelectionGateIssue[];
  llm_draft_payload?: TopicSelectionPromotionDecisionSupportLlmDraft | null;
  input_snapshot_id?: string | null;
  workflow_run_id?: string | null;
  artifact_refs: TopicSelectionFunctionalRef[];
  created_by: TopicSelectionActorType;
  created_at: string;
}

export interface TopicSelectionPromotionDossierRecord {
  promotion_dossier_id: string;
  support_run_key: string;
  workspace_id?: string | null;
  title_card_id: string;
  promotion_decision_support_id: string;
  promotion_input_snapshot_id: string;
  topic_package_id: string;
  package_version: string;
  summary: string;
  reviewer_packet_artifact_ref: TopicSelectionFunctionalRef;
  dossier_payload: Record<string, unknown>;
  source_refs: TopicSelectionFunctionalRef[];
  artifact_refs: TopicSelectionFunctionalRef[];
  created_by: TopicSelectionActorType;
  created_at: string;
}

export interface TopicSelectionArgumentReadinessMiniCheckRecord {
  argument_readiness_mini_check_id: string;
  support_run_key: string;
  workspace_id?: string | null;
  title_card_id: string;
  promotion_decision_support_id: string;
  promotion_input_snapshot_id: string;
  check_status: TopicSelectionArgumentReadinessMiniCheckStatus;
  check_items: Array<{
    check_key: string;
    status: TopicSelectionArgumentReadinessMiniCheckStatus;
    message: string;
    refs: TopicSelectionFunctionalRef[];
  }>;
  blockers: TopicSelectionGateIssue[];
  warnings: TopicSelectionGateIssue[];
  required_actions: TopicSelectionPromotionGateRequiredAction[];
  early_check_obligations: string[];
  source_refs: TopicSelectionFunctionalRef[];
  artifact_refs: TopicSelectionFunctionalRef[];
  created_by: TopicSelectionActorType;
  created_at: string;
}

export interface TopicSelectionPromotionGateCheckRecord {
  promotion_gate_check_id: string;
  support_run_key: string;
  workspace_id?: string | null;
  title_card_id: string;
  promotion_decision_support_id: string;
  promotion_dossier_id: string;
  argument_readiness_mini_check_id: string;
  promotion_input_snapshot_id: string;
  promotion_input_snapshot_ref: TopicSelectionFunctionalRef;
  promotion_input_snapshot_hash: string;
  disposition: TopicSelectionPromotionGateDisposition;
  promote_allowed: boolean;
  blockers: TopicSelectionGateIssue[];
  warnings: TopicSelectionGateIssue[];
  required_actions: TopicSelectionPromotionGateRequiredAction[];
  loopback_hints: TopicSelectionPromotionGateLoopbackHint[];
  accepted_risk_refs: TopicSelectionFunctionalRef[];
  blocker_refs: TopicSelectionFunctionalRef[];
  recheck_request_refs: TopicSelectionFunctionalRef[];
  memory_suggestion_refs: TopicSelectionFunctionalRef[];
  source_refs: TopicSelectionFunctionalRef[];
  snapshot_hashes: TopicSelectionPromotionInputSnapshotHandoff['snapshot_hashes'];
  input_snapshot_id?: string | null;
  workflow_run_id?: string | null;
  gate_result_id?: string | null;
  transition_attempt_id?: string | null;
  trace_snapshot_id?: string | null;
  artifact_refs: TopicSelectionFunctionalRef[];
  created_by: TopicSelectionActorType;
  created_at: string;
}

export interface TopicSelectionPromotionGateHandoff {
  promotion_gate_check_id: string;
  promotion_gate_check_ref: TopicSelectionFunctionalRef;
  promotion_decision_support_ref: TopicSelectionFunctionalRef;
  promotion_dossier_ref: TopicSelectionFunctionalRef;
  argument_readiness_mini_check_ref: TopicSelectionFunctionalRef;
  promotion_input_snapshot_id: string;
  promotion_input_snapshot_ref: TopicSelectionFunctionalRef;
  promotion_input_snapshot_hash: string;
  topic_package_id: string;
  package_version: string;
  disposition: TopicSelectionPromotionGateDisposition;
  promote_allowed: boolean;
  required_actions: TopicSelectionPromotionGateRequiredAction[];
  loopback_hints: TopicSelectionPromotionGateLoopbackHint[];
  accepted_risk_refs: TopicSelectionFunctionalRef[];
  blocker_refs: TopicSelectionFunctionalRef[];
  recheck_request_refs: TopicSelectionFunctionalRef[];
  memory_suggestion_refs: TopicSelectionFunctionalRef[];
  snapshot_hashes: TopicSelectionPromotionInputSnapshotHandoff['snapshot_hashes'];
  support: TopicSelectionPromotionDecisionSupportRecord;
  dossier: TopicSelectionPromotionDossierRecord;
  argument_readiness_mini_check: TopicSelectionArgumentReadinessMiniCheckRecord;
  gate_check: TopicSelectionPromotionGateCheckRecord;
}

export type PromotionDecisionSupportRecord = TopicSelectionPromotionDecisionSupportRecord;
export type PromotionDossierRecord = TopicSelectionPromotionDossierRecord;
export type ArgumentReadinessMiniCheckRecord = TopicSelectionArgumentReadinessMiniCheckRecord;
export type PromotionGateCheckRecord = TopicSelectionPromotionGateCheckRecord;
export type PromotionGateHandoff = TopicSelectionPromotionGateHandoff;
export type PromotionGateDisposition = TopicSelectionPromotionGateDisposition;

const stringId = { type: 'string', minLength: 1 } as const;
const nullableStringId = { anyOf: [stringId, { type: 'null' }] } as const;
const objectPayload = { type: 'object', additionalProperties: true } as const;
const stringArray = { type: 'array', items: stringId } as const;
const functionalRefArray = { type: 'array', items: topicSelectionFunctionalRefSchema } as const;
const gateIssueArray = { type: 'array', items: topicSelectionGateIssueSchema } as const;

export const topicSelectionPromotionGateRequiredActionSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'action_code',
    'severity',
    'loopback_target',
    'refs',
    'reason',
  ],
  properties: {
    action_code: stringId,
    severity: { enum: [...TOPIC_SELECTION_PROMOTION_GATE_REQUIRED_ACTION_SEVERITIES] },
    loopback_target: { enum: [...TOPIC_SELECTION_PROMOTION_GATE_LOOPBACK_TARGETS] },
    refs: functionalRefArray,
    reason: stringId,
  },
} as const;

export const topicSelectionPromotionGateLoopbackHintSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'loopback_target',
    'loopback_cause',
    'required_actions',
    'refs',
  ],
  properties: {
    loopback_target: { enum: [...TOPIC_SELECTION_PROMOTION_GATE_LOOPBACK_TARGETS] },
    loopback_cause: stringId,
    required_actions: {
      type: 'array',
      items: topicSelectionPromotionGateRequiredActionSchema,
    },
    refs: functionalRefArray,
  },
} as const;

export const topicSelectionPromotionDecisionSupportLlmDraftSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    summary: nullableStringId,
    reviewer_questions: stringArray,
    risk_notes: stringArray,
    recheck_notes: stringArray,
    dossier_markdown: nullableStringId,
    n3_semantic_layer: {
      anyOf: [objectPayload, { type: 'null' }],
    },
  },
} as const;

export const topicSelectionPromotionDecisionSupportRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'promotion_decision_support_id',
    'support_run_key',
    'title_card_id',
    'promotion_input_snapshot_id',
    'promotion_input_snapshot_ref',
    'promotion_input_snapshot_hash',
    'topic_package_id',
    'package_version',
    'support_generation_mode',
    'support_status',
    'summary',
    'reviewer_questions',
    'risk_notes',
    'recheck_notes',
    'source_refs',
    'accepted_risk_refs',
    'blocker_refs',
    'recheck_request_refs',
    'memory_suggestion_refs',
    'warnings',
    'artifact_refs',
    'created_by',
    'created_at',
  ],
  properties: {
    promotion_decision_support_id: stringId,
    support_run_key: stringId,
    workspace_id: nullableStringId,
    title_card_id: stringId,
    promotion_input_snapshot_id: stringId,
    promotion_input_snapshot_ref: topicSelectionFunctionalRefSchema,
    promotion_input_snapshot_hash: stringId,
    topic_package_id: stringId,
    package_version: stringId,
    support_generation_mode: { enum: [...TOPIC_SELECTION_PROMOTION_SUPPORT_GENERATION_MODES] },
    support_status: { enum: ['succeeded', 'succeeded_with_fallback'] },
    summary: stringId,
    reviewer_questions: stringArray,
    risk_notes: stringArray,
    recheck_notes: stringArray,
    source_refs: functionalRefArray,
    accepted_risk_refs: functionalRefArray,
    blocker_refs: functionalRefArray,
    recheck_request_refs: functionalRefArray,
    memory_suggestion_refs: functionalRefArray,
    warnings: gateIssueArray,
    llm_draft_payload: {
      anyOf: [topicSelectionPromotionDecisionSupportLlmDraftSchema, { type: 'null' }],
    },
    input_snapshot_id: nullableStringId,
    workflow_run_id: nullableStringId,
    artifact_refs: functionalRefArray,
    created_by: stringId,
    created_at: stringId,
  },
} as const;

export const topicSelectionPromotionDossierRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'promotion_dossier_id',
    'support_run_key',
    'title_card_id',
    'promotion_decision_support_id',
    'promotion_input_snapshot_id',
    'topic_package_id',
    'package_version',
    'summary',
    'reviewer_packet_artifact_ref',
    'dossier_payload',
    'source_refs',
    'artifact_refs',
    'created_by',
    'created_at',
  ],
  properties: {
    promotion_dossier_id: stringId,
    support_run_key: stringId,
    workspace_id: nullableStringId,
    title_card_id: stringId,
    promotion_decision_support_id: stringId,
    promotion_input_snapshot_id: stringId,
    topic_package_id: stringId,
    package_version: stringId,
    summary: stringId,
    reviewer_packet_artifact_ref: topicSelectionFunctionalRefSchema,
    dossier_payload: objectPayload,
    source_refs: functionalRefArray,
    artifact_refs: functionalRefArray,
    created_by: stringId,
    created_at: stringId,
  },
} as const;

export const topicSelectionArgumentReadinessMiniCheckRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'argument_readiness_mini_check_id',
    'support_run_key',
    'title_card_id',
    'promotion_decision_support_id',
    'promotion_input_snapshot_id',
    'check_status',
    'check_items',
    'blockers',
    'warnings',
    'required_actions',
    'early_check_obligations',
    'source_refs',
    'artifact_refs',
    'created_by',
    'created_at',
  ],
  properties: {
    argument_readiness_mini_check_id: stringId,
    support_run_key: stringId,
    workspace_id: nullableStringId,
    title_card_id: stringId,
    promotion_decision_support_id: stringId,
    promotion_input_snapshot_id: stringId,
    check_status: { enum: [...TOPIC_SELECTION_ARGUMENT_READINESS_MINI_CHECK_STATUSES] },
    check_items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['check_key', 'status', 'message', 'refs'],
        properties: {
          check_key: stringId,
          status: { enum: [...TOPIC_SELECTION_ARGUMENT_READINESS_MINI_CHECK_STATUSES] },
          message: stringId,
          refs: functionalRefArray,
        },
      },
    },
    blockers: gateIssueArray,
    warnings: gateIssueArray,
    required_actions: {
      type: 'array',
      items: topicSelectionPromotionGateRequiredActionSchema,
    },
    early_check_obligations: stringArray,
    source_refs: functionalRefArray,
    artifact_refs: functionalRefArray,
    created_by: stringId,
    created_at: stringId,
  },
} as const;

const snapshotHashesSchema = {
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
} as const;

export const topicSelectionPromotionGateCheckRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'promotion_gate_check_id',
    'support_run_key',
    'title_card_id',
    'promotion_decision_support_id',
    'promotion_dossier_id',
    'argument_readiness_mini_check_id',
    'promotion_input_snapshot_id',
    'promotion_input_snapshot_ref',
    'promotion_input_snapshot_hash',
    'disposition',
    'promote_allowed',
    'blockers',
    'warnings',
    'required_actions',
    'loopback_hints',
    'accepted_risk_refs',
    'blocker_refs',
    'recheck_request_refs',
    'memory_suggestion_refs',
    'source_refs',
    'snapshot_hashes',
    'artifact_refs',
    'created_by',
    'created_at',
  ],
  properties: {
    promotion_gate_check_id: stringId,
    support_run_key: stringId,
    workspace_id: nullableStringId,
    title_card_id: stringId,
    promotion_decision_support_id: stringId,
    promotion_dossier_id: stringId,
    argument_readiness_mini_check_id: stringId,
    promotion_input_snapshot_id: stringId,
    promotion_input_snapshot_ref: topicSelectionFunctionalRefSchema,
    promotion_input_snapshot_hash: stringId,
    disposition: { enum: [...TOPIC_SELECTION_PROMOTION_GATE_DISPOSITIONS] },
    promote_allowed: { type: 'boolean' },
    blockers: gateIssueArray,
    warnings: gateIssueArray,
    required_actions: {
      type: 'array',
      items: topicSelectionPromotionGateRequiredActionSchema,
    },
    loopback_hints: {
      type: 'array',
      items: topicSelectionPromotionGateLoopbackHintSchema,
    },
    accepted_risk_refs: functionalRefArray,
    blocker_refs: functionalRefArray,
    recheck_request_refs: functionalRefArray,
    memory_suggestion_refs: functionalRefArray,
    source_refs: functionalRefArray,
    snapshot_hashes: snapshotHashesSchema,
    input_snapshot_id: nullableStringId,
    workflow_run_id: nullableStringId,
    gate_result_id: nullableStringId,
    transition_attempt_id: nullableStringId,
    trace_snapshot_id: nullableStringId,
    artifact_refs: functionalRefArray,
    created_by: stringId,
    created_at: stringId,
  },
  allOf: [
    {
      if: {
        required: ['promote_allowed'],
        properties: { promote_allowed: { enum: [true] } },
      },
      then: {
        properties: { disposition: { enum: ['ready_for_human_decision'] } },
      },
    },
    {
      if: {
        required: ['disposition'],
        properties: {
          disposition: { enum: ['blocked', 'needs_revision', 'recheck_required', 'park'] },
        },
      },
      then: {
        properties: { promote_allowed: { enum: [false] } },
      },
    },
  ],
} as const;

export const topicSelectionPromotionGateHandoffSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'promotion_gate_check_id',
    'promotion_gate_check_ref',
    'promotion_decision_support_ref',
    'promotion_dossier_ref',
    'argument_readiness_mini_check_ref',
    'promotion_input_snapshot_id',
    'promotion_input_snapshot_ref',
    'promotion_input_snapshot_hash',
    'topic_package_id',
    'package_version',
    'disposition',
    'promote_allowed',
    'required_actions',
    'loopback_hints',
    'accepted_risk_refs',
    'blocker_refs',
    'recheck_request_refs',
    'memory_suggestion_refs',
    'snapshot_hashes',
    'support',
    'dossier',
    'argument_readiness_mini_check',
    'gate_check',
  ],
  properties: {
    promotion_gate_check_id: stringId,
    promotion_gate_check_ref: topicSelectionFunctionalRefSchema,
    promotion_decision_support_ref: topicSelectionFunctionalRefSchema,
    promotion_dossier_ref: topicSelectionFunctionalRefSchema,
    argument_readiness_mini_check_ref: topicSelectionFunctionalRefSchema,
    promotion_input_snapshot_id: stringId,
    promotion_input_snapshot_ref: topicSelectionFunctionalRefSchema,
    promotion_input_snapshot_hash: stringId,
    topic_package_id: stringId,
    package_version: stringId,
    disposition: { enum: [...TOPIC_SELECTION_PROMOTION_GATE_DISPOSITIONS] },
    promote_allowed: { type: 'boolean' },
    required_actions: {
      type: 'array',
      items: topicSelectionPromotionGateRequiredActionSchema,
    },
    loopback_hints: {
      type: 'array',
      items: topicSelectionPromotionGateLoopbackHintSchema,
    },
    accepted_risk_refs: functionalRefArray,
    blocker_refs: functionalRefArray,
    recheck_request_refs: functionalRefArray,
    memory_suggestion_refs: functionalRefArray,
    snapshot_hashes: snapshotHashesSchema,
    support: topicSelectionPromotionDecisionSupportRecordSchema,
    dossier: topicSelectionPromotionDossierRecordSchema,
    argument_readiness_mini_check: topicSelectionArgumentReadinessMiniCheckRecordSchema,
    gate_check: topicSelectionPromotionGateCheckRecordSchema,
  },
  allOf: [
    {
      if: {
        required: ['promote_allowed'],
        properties: { promote_allowed: { enum: [true] } },
      },
      then: {
        properties: { disposition: { enum: ['ready_for_human_decision'] } },
      },
    },
    {
      if: {
        required: ['disposition'],
        properties: {
          disposition: { enum: ['blocked', 'needs_revision', 'recheck_required', 'park'] },
        },
      },
      then: {
        properties: { promote_allowed: { enum: [false] } },
      },
    },
  ],
} as const;

export const topicSelectionPromotionGateInputHandoffSchema =
  topicSelectionPromotionInputSnapshotHandoffSchema;

export type TopicSelectionPromotionGateArtifactRefRecord = TopicSelectionArtifactRefRecord;
