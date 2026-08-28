import {
  topicSelectionFunctionalRefSchema,
  type TopicSelectionFunctionalRef,
} from './topic-selection-control-plane-contracts.js';

export const TOPIC_SELECTION_RESEARCH_CHECKPOINT_CONTRACT_VERSION = 'v1' as const;

export const TOPIC_SELECTION_RESEARCH_CHECKPOINT_KINDS = [
  'evidence_landscape',
  'gap_selection',
  'question_contract',
  'promotion',
] as const;
export type TopicSelectionResearchCheckpointKind =
  (typeof TOPIC_SELECTION_RESEARCH_CHECKPOINT_KINDS)[number];

export const TOPIC_SELECTION_RESEARCH_CHECKPOINT_STATUSES = [
  'pending',
  'decided',
  'superseded',
] as const;
export type TopicSelectionResearchCheckpointStatus =
  (typeof TOPIC_SELECTION_RESEARCH_CHECKPOINT_STATUSES)[number];

export const TOPIC_SELECTION_RESEARCH_CHECKPOINT_PROVENANCE_CLASSES = [
  'native',
  'backfilled',
] as const;
export type TopicSelectionResearchCheckpointProvenanceClass =
  (typeof TOPIC_SELECTION_RESEARCH_CHECKPOINT_PROVENANCE_CLASSES)[number];

export const TOPIC_SELECTION_RESEARCH_CHECKPOINT_ACTIONS = [
  'advance',
  'loopback',
  'reject',
  'hold',
] as const;
export type TopicSelectionResearchCheckpointAction =
  (typeof TOPIC_SELECTION_RESEARCH_CHECKPOINT_ACTIONS)[number];

export const TOPIC_SELECTION_RESEARCH_DECISION_KINDS = [
  'evidence_landscape_confirmation',
  'topic_question_confirmation',
] as const;
export type TopicSelectionResearchDecisionKind =
  (typeof TOPIC_SELECTION_RESEARCH_DECISION_KINDS)[number];

export const TOPIC_SELECTION_RESEARCH_OBJECTION_SEVERITIES = [
  'info',
  'warning',
  'blocking',
  'critical',
] as const;
export type TopicSelectionResearchObjectionSeverity =
  (typeof TOPIC_SELECTION_RESEARCH_OBJECTION_SEVERITIES)[number];

export const TOPIC_SELECTION_RESEARCH_OBJECTION_RESOLUTION_TYPES = [
  'resolved_with_revision',
  'resolved_with_evidence',
  'superseded_by_current_authority',
] as const;
export type TopicSelectionResearchObjectionResolutionType =
  (typeof TOPIC_SELECTION_RESEARCH_OBJECTION_RESOLUTION_TYPES)[number];

export const TOPIC_SELECTION_RESEARCH_TRANSITIONS_BY_CHECKPOINT = {
  evidence_landscape: 'topic-selection.research.generate-need-candidates',
  gap_selection: 'topic-selection.research.publish-v1b-input',
  question_contract: 'topic-selection.research.assess-topic-value',
  promotion: 'topic-selection.research.create-paper-project-bridge',
} as const satisfies Record<TopicSelectionResearchCheckpointKind, string>;

export const TOPIC_SELECTION_RESEARCH_STAGE_VIEW_STAGES = [
  'overview',
  'evidence_landscape',
  'research_gap',
  'research_question',
  'value_feasibility',
  'topic_package',
  'promotion_review',
] as const;
export type TopicSelectionResearchStageViewStage =
  (typeof TOPIC_SELECTION_RESEARCH_STAGE_VIEW_STAGES)[number];

export const TOPIC_SELECTION_RESEARCH_STAGE_CURRENT_SELECTION_RULES = [
  'derived_from_current_manifest',
  'checkpoint_unique_current_key',
  'value_disposition_is_current',
  'latest_created_at_then_id',
] as const;
export type TopicSelectionResearchStageCurrentSelectionRule =
  (typeof TOPIC_SELECTION_RESEARCH_STAGE_CURRENT_SELECTION_RULES)[number];

export const TOPIC_SELECTION_RESEARCH_ROUTINE_EFFECT_CLASSES = [
  'local_read',
  'deterministic_local_write',
  'bounded_non_provider_job',
  'verification',
  'recoverable_retry',
  'selected_local_backend_lifecycle',
] as const;
export type TopicSelectionResearchRoutineEffectClass =
  (typeof TOPIC_SELECTION_RESEARCH_ROUTINE_EFFECT_CLASSES)[number];

export const TOPIC_SELECTION_RESEARCH_CONFIRMATION_EFFECT_CLASSES = [
  'research_meaning_change',
  'human_authority_write',
  'material_risk_acceptance',
  'provider_or_material_cost',
  'external_acquisition',
  'destructive_or_control_sensitive',
  'target_environment_change',
  'material_scope_expansion',
  'ambiguous_recovery',
] as const;
export type TopicSelectionResearchConfirmationEffectClass =
  (typeof TOPIC_SELECTION_RESEARCH_CONFIRMATION_EFFECT_CLASSES)[number];
export type TopicSelectionResearchContinuationEffectClass =
  | TopicSelectionResearchRoutineEffectClass
  | TopicSelectionResearchConfirmationEffectClass;

export const TOPIC_SELECTION_RESEARCH_CONTINUATION_REASON_CODES = [
  'WITHIN_ROUTINE_EFFECT_ENVELOPE',
  'CONFIRMATION_REQUIRED_EFFECT',
  'HUMAN_DECISION_BOUNDARY_REACHED',
  'ENVELOPE_STALE',
] as const;
export type TopicSelectionResearchContinuationReasonCode =
  (typeof TOPIC_SELECTION_RESEARCH_CONTINUATION_REASON_CODES)[number];

export interface TopicSelectionResearchCheckpointRecord {
  research_checkpoint_id: string;
  checkpoint_key: string;
  current_checkpoint_key?: string | null;
  workspace_id?: string | null;
  title_card_id: string;
  checkpoint_kind: TopicSelectionResearchCheckpointKind;
  contract_version: typeof TOPIC_SELECTION_RESEARCH_CHECKPOINT_CONTRACT_VERSION;
  provenance_class: TopicSelectionResearchCheckpointProvenanceClass;
  policy_version_id?: string | null;
  target_ref: TopicSelectionFunctionalRef;
  target_snapshot_hash: string;
  packet_hash: string;
  input_snapshot_id: string;
  source_refs: TopicSelectionFunctionalRef[];
  allowed_actions: TopicSelectionResearchCheckpointAction[];
  required_action_refs: TopicSelectionFunctionalRef[];
  decision_authority_ref?: TopicSelectionFunctionalRef | null;
  status: TopicSelectionResearchCheckpointStatus;
  supersedes_checkpoint_id?: string | null;
  superseded_by_checkpoint_id?: string | null;
  created_at: string;
  updated_at: string;
  decided_at?: string | null;
  superseded_at?: string | null;
}

export interface TopicSelectionEvidenceLandscapeReviewPayload {
  review_kind: 'evidence_landscape';
  nearest_work_reviewed: boolean;
  disconfirming_evidence_reviewed: boolean;
  source_quality_reviewed: boolean;
  limitations: string[];
}

export interface TopicSelectionTopicQuestionReviewPayload {
  review_kind: 'question_contract';
  mechanism_identifiable: boolean;
  proxy_operationalized: boolean;
  confounds_reviewed: boolean;
  falsification_reviewed: boolean;
  claim_ceiling_reviewed: boolean;
  objections_reviewed: boolean;
  review_notes: string[];
}

export type TopicSelectionResearchCheckpointReviewPayload =
  | TopicSelectionEvidenceLandscapeReviewPayload
  | TopicSelectionTopicQuestionReviewPayload;

export interface TopicSelectionResearchCheckpointDecisionRecord {
  research_checkpoint_decision_id: string;
  decision_key: string;
  research_checkpoint_id: string;
  human_confirmed_decision_id: string;
  workspace_id?: string | null;
  title_card_id: string;
  checkpoint_kind: 'evidence_landscape' | 'question_contract';
  decision_kind: TopicSelectionResearchDecisionKind;
  decision: TopicSelectionResearchCheckpointAction;
  actor: { actor_type: 'human'; actor_id: string };
  confirmed_snapshot_hash: string;
  rationale: string;
  review_payload: TopicSelectionResearchCheckpointReviewPayload;
  required_action_refs: TopicSelectionFunctionalRef[];
  loopback_target?: string | null;
  loopback_refs: TopicSelectionFunctionalRef[];
  created_at: string;
}

export interface TopicSelectionResearchObjectionRecord {
  research_objection_id: string;
  objection_key: string;
  workspace_id?: string | null;
  title_card_id: string;
  research_checkpoint_id: string;
  checkpoint_kind: TopicSelectionResearchCheckpointKind;
  target_ref: TopicSelectionFunctionalRef;
  target_snapshot_hash: string;
  severity: TopicSelectionResearchObjectionSeverity;
  summary: string;
  rationale: string;
  required_loopback?: string | null;
  source_refs: TopicSelectionFunctionalRef[];
  actor: { actor_type: 'human'; actor_id: string };
  created_at: string;
}

export interface TopicSelectionResearchObjectionResolutionRecord {
  research_objection_resolution_id: string;
  resolution_key: string;
  research_objection_id: string;
  workspace_id?: string | null;
  title_card_id: string;
  resolution_type: TopicSelectionResearchObjectionResolutionType;
  actor: { actor_type: 'human'; actor_id: string };
  resolved_snapshot_hash: string;
  rationale: string;
  output_refs: TopicSelectionFunctionalRef[];
  created_at: string;
}

export interface TopicSelectionResearchCheckpointPacket {
  research_checkpoint_id: string;
  checkpoint_kind: TopicSelectionResearchCheckpointKind;
  title_card_id: string;
  contract_version: typeof TOPIC_SELECTION_RESEARCH_CHECKPOINT_CONTRACT_VERSION;
  target_ref: TopicSelectionFunctionalRef;
  target_snapshot_hash: string;
  source_refs: TopicSelectionFunctionalRef[];
  allowed_actions: TopicSelectionResearchCheckpointAction[];
  required_action_refs: TopicSelectionFunctionalRef[];
  packet_payload: Record<string, unknown>;
  open_objections: TopicSelectionResearchObjectionRecord[];
  decision?: TopicSelectionResearchCheckpointDecisionRecord | null;
  packet_hash: string;
}

export interface TopicSelectionResearchCheckpointDecisionInput {
  decision_key: string;
  decision: TopicSelectionResearchCheckpointAction;
  actor: { actor_type: 'human'; actor_id: string };
  confirmed_snapshot_hash: string;
  rationale: string;
  review_payload: TopicSelectionResearchCheckpointReviewPayload;
  required_action_refs?: TopicSelectionFunctionalRef[];
  loopback_target?: string | null;
  loopback_refs?: TopicSelectionFunctionalRef[];
}

export interface TopicSelectionResearchObjectionInput {
  objection_key: string;
  severity: TopicSelectionResearchObjectionSeverity;
  summary: string;
  rationale: string;
  required_loopback?: string | null;
  source_refs?: TopicSelectionFunctionalRef[];
  actor: { actor_type: 'human'; actor_id: string };
  confirmed_snapshot_hash: string;
}

export interface TopicSelectionResearchObjectionResolutionInput {
  resolution_key: string;
  resolution_type: TopicSelectionResearchObjectionResolutionType;
  actor: { actor_type: 'human'; actor_id: string };
  resolved_snapshot_hash: string;
  rationale: string;
  output_refs: TopicSelectionFunctionalRef[];
}

export interface TopicSelectionResearchStatusProjection {
  title_card_id: string;
  contract_version: typeof TOPIC_SELECTION_RESEARCH_CHECKPOINT_CONTRACT_VERSION;
  checkpoint_chain: TopicSelectionResearchCheckpointRecord[];
  current_checkpoint?: TopicSelectionResearchCheckpointRecord | null;
  current_packet?: TopicSelectionResearchCheckpointPacket | null;
  required_checkpoint_kind: TopicSelectionResearchCheckpointKind | null;
  next_authorized_transition?: string | null;
  open_blocking_objection_count: number;
  legacy_provenance: boolean;
}

export interface TopicSelectionResearchStageManifestEntry {
  stage: TopicSelectionResearchStageViewStage;
  state: 'current' | 'unavailable';
  current_selection_rule: TopicSelectionResearchStageCurrentSelectionRule;
  authority_ref: TopicSelectionFunctionalRef | null;
  checkpoint_ref: TopicSelectionFunctionalRef | null;
  supersedes_ref: TopicSelectionFunctionalRef | null;
  snapshot_hash: string | null;
  status: string | null;
  source_refs: TopicSelectionFunctionalRef[];
  artifact_refs: TopicSelectionFunctionalRef[];
  issue_codes: string[];
}

export interface TopicSelectionResearchStageManifest {
  schema_version: 'TopicSelectionResearchStageManifest@v1';
  title_card_id: string;
  current_stage: TopicSelectionResearchStageViewStage | null;
  next_human_decision_stage: TopicSelectionResearchStageViewStage | null;
  stages: TopicSelectionResearchStageManifestEntry[];
  manifest_hash: string;
}

export type TopicSelectionResearchStageViewAudience = 'human' | 'llm';

interface TopicSelectionResearchStageViewBase {
  schema_version: 'TopicSelectionResearchStageView@v1';
  title_card_id: string;
  stage: TopicSelectionResearchStageViewStage;
  state: TopicSelectionResearchStageManifestEntry['state'];
  manifest_hash: string;
  source_snapshot_hash: string | null;
  view_hash: string;
}

export interface TopicSelectionResearchHumanStageView extends TopicSelectionResearchStageViewBase {
  audience: 'human';
  markdown: string;
}

export interface TopicSelectionResearchStageHumanSummary {
  conclusions: string[];
  evidence_and_counterevidence: string[];
  alternatives_and_rejections: string[];
  claim_and_falsification_boundaries: string[];
  open_risks: string[];
  recommendation: string;
  decision_requested: string;
}

export interface TopicSelectionResearchStageWorkingSet {
  manifest_entry: TopicSelectionResearchStageManifestEntry;
  research_status: TopicSelectionResearchStatusProjection;
  current_packet: TopicSelectionResearchCheckpointPacket | null;
  checkpoint_history: TopicSelectionResearchCheckpointPacket[];
  canonical_owner: unknown;
  related_records: Record<string, unknown>;
  human_summary: TopicSelectionResearchStageHumanSummary;
  artifact_route_template: '/topic-selection/artifacts/{artifactRefId}';
}

export interface TopicSelectionResearchLlmStageView extends TopicSelectionResearchStageViewBase {
  audience: 'llm';
  working_set: TopicSelectionResearchStageWorkingSet;
}

export type TopicSelectionResearchStageView =
  | TopicSelectionResearchHumanStageView
  | TopicSelectionResearchLlmStageView;

export interface TopicSelectionResearchContinuationEnvelope {
  schema_version: 'TopicSelectionResearchContinuationEnvelope@v1';
  intent: 'advance_to_next_human_decision';
  title_card_id: string;
  manifest_hash: string;
  environment_scope: 'selected_local_backend';
  target_human_decision_stage: TopicSelectionResearchStageViewStage | null;
  boundary_reached: boolean;
  routine_effect_classes: TopicSelectionResearchRoutineEffectClass[];
  confirmation_required_effect_classes: TopicSelectionResearchConfirmationEffectClass[];
  reason_codes: TopicSelectionResearchContinuationReasonCode[];
  envelope_hash: string;
}

export interface TopicSelectionResearchContinuationEnvelopeEvaluationInput {
  schema_version: 'TopicSelectionResearchContinuationEnvelopeEvaluationInput@v1';
  envelope_hash: string;
  manifest_hash: string;
  proposed_effects: readonly TopicSelectionResearchContinuationEffectClass[];
}

export interface TopicSelectionResearchContinuationEnvelopeEvaluation {
  schema_version: 'TopicSelectionResearchContinuationEnvelopeEvaluation@v1';
  title_card_id: string;
  decision: 'continue' | 'stop_for_human' | 'refresh_envelope';
  envelope_hash: string;
  manifest_hash: string;
  target_human_decision_stage: TopicSelectionResearchStageViewStage | null;
  routine_effects: TopicSelectionResearchRoutineEffectClass[];
  blocking_effects: TopicSelectionResearchConfirmationEffectClass[];
  reason_codes: TopicSelectionResearchContinuationReasonCode[];
  evaluation_hash: string;
}

const stringId = { type: 'string', minLength: 1 } as const;
const nullableStringId = { anyOf: [stringId, { type: 'null' }] } as const;
const hashString = { type: 'string', pattern: '^[a-f0-9]{64}$' } as const;
const stringArray = { type: 'array', items: stringId } as const;
const functionalRefArray = { type: 'array', items: topicSelectionFunctionalRefSchema } as const;
const strictHumanActorSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['actor_type', 'actor_id'],
  properties: {
    actor_type: { const: 'human' },
    actor_id: stringId,
  },
} as const;

export const topicSelectionEvidenceLandscapeReviewPayloadSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'review_kind',
    'nearest_work_reviewed',
    'disconfirming_evidence_reviewed',
    'source_quality_reviewed',
    'limitations',
  ],
  properties: {
    review_kind: { const: 'evidence_landscape' },
    nearest_work_reviewed: { type: 'boolean' },
    disconfirming_evidence_reviewed: { type: 'boolean' },
    source_quality_reviewed: { type: 'boolean' },
    limitations: stringArray,
  },
} as const;

export const topicSelectionTopicQuestionReviewPayloadSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'review_kind',
    'mechanism_identifiable',
    'proxy_operationalized',
    'confounds_reviewed',
    'falsification_reviewed',
    'claim_ceiling_reviewed',
    'objections_reviewed',
    'review_notes',
  ],
  properties: {
    review_kind: { const: 'question_contract' },
    mechanism_identifiable: { type: 'boolean' },
    proxy_operationalized: { type: 'boolean' },
    confounds_reviewed: { type: 'boolean' },
    falsification_reviewed: { type: 'boolean' },
    claim_ceiling_reviewed: { type: 'boolean' },
    objections_reviewed: { type: 'boolean' },
    review_notes: stringArray,
  },
} as const;

export const topicSelectionResearchCheckpointReviewPayloadSchema = {
  oneOf: [
    topicSelectionEvidenceLandscapeReviewPayloadSchema,
    topicSelectionTopicQuestionReviewPayloadSchema,
  ],
} as const;

export const topicSelectionResearchCheckpointRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'research_checkpoint_id',
    'checkpoint_key',
    'title_card_id',
    'checkpoint_kind',
    'contract_version',
    'provenance_class',
    'target_ref',
    'target_snapshot_hash',
    'packet_hash',
    'input_snapshot_id',
    'source_refs',
    'allowed_actions',
    'required_action_refs',
    'status',
    'created_at',
    'updated_at',
  ],
  properties: {
    research_checkpoint_id: stringId,
    checkpoint_key: hashString,
    current_checkpoint_key: nullableStringId,
    workspace_id: nullableStringId,
    title_card_id: stringId,
    checkpoint_kind: { enum: [...TOPIC_SELECTION_RESEARCH_CHECKPOINT_KINDS] },
    contract_version: { const: TOPIC_SELECTION_RESEARCH_CHECKPOINT_CONTRACT_VERSION },
    provenance_class: { enum: [...TOPIC_SELECTION_RESEARCH_CHECKPOINT_PROVENANCE_CLASSES] },
    policy_version_id: nullableStringId,
    target_ref: topicSelectionFunctionalRefSchema,
    target_snapshot_hash: hashString,
    packet_hash: hashString,
    input_snapshot_id: stringId,
    source_refs: functionalRefArray,
    allowed_actions: {
      type: 'array',
      items: { enum: [...TOPIC_SELECTION_RESEARCH_CHECKPOINT_ACTIONS] },
      minItems: 1,
      uniqueItems: true,
    },
    required_action_refs: functionalRefArray,
    decision_authority_ref: { anyOf: [topicSelectionFunctionalRefSchema, { type: 'null' }] },
    status: { enum: [...TOPIC_SELECTION_RESEARCH_CHECKPOINT_STATUSES] },
    supersedes_checkpoint_id: nullableStringId,
    superseded_by_checkpoint_id: nullableStringId,
    created_at: stringId,
    updated_at: stringId,
    decided_at: nullableStringId,
    superseded_at: nullableStringId,
  },
} as const;

export const topicSelectionResearchCheckpointDecisionInputSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'decision_key',
    'decision',
    'actor',
    'confirmed_snapshot_hash',
    'rationale',
    'review_payload',
  ],
  properties: {
    decision_key: stringId,
    decision: { enum: [...TOPIC_SELECTION_RESEARCH_CHECKPOINT_ACTIONS] },
    actor: strictHumanActorSchema,
    confirmed_snapshot_hash: hashString,
    rationale: stringId,
    review_payload: topicSelectionResearchCheckpointReviewPayloadSchema,
    required_action_refs: functionalRefArray,
    loopback_target: nullableStringId,
    loopback_refs: functionalRefArray,
  },
} as const;

export const topicSelectionResearchObjectionInputSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'objection_key',
    'severity',
    'summary',
    'rationale',
    'actor',
    'confirmed_snapshot_hash',
  ],
  properties: {
    objection_key: stringId,
    severity: { enum: [...TOPIC_SELECTION_RESEARCH_OBJECTION_SEVERITIES] },
    summary: stringId,
    rationale: stringId,
    required_loopback: nullableStringId,
    source_refs: functionalRefArray,
    actor: strictHumanActorSchema,
    confirmed_snapshot_hash: hashString,
  },
} as const;

export const topicSelectionResearchObjectionResolutionInputSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'resolution_key',
    'resolution_type',
    'actor',
    'resolved_snapshot_hash',
    'rationale',
    'output_refs',
  ],
  properties: {
    resolution_key: stringId,
    resolution_type: { enum: [...TOPIC_SELECTION_RESEARCH_OBJECTION_RESOLUTION_TYPES] },
    actor: strictHumanActorSchema,
    resolved_snapshot_hash: hashString,
    rationale: stringId,
    output_refs: { ...functionalRefArray, minItems: 1 },
  },
} as const;

export const topicSelectionResearchCheckpointListSchema = {
  type: 'array',
  items: topicSelectionResearchCheckpointRecordSchema,
} as const;

export const topicSelectionResearchStageManifestEntrySchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'stage',
    'state',
    'current_selection_rule',
    'authority_ref',
    'checkpoint_ref',
    'supersedes_ref',
    'snapshot_hash',
    'status',
    'source_refs',
    'artifact_refs',
    'issue_codes',
  ],
  properties: {
    stage: { enum: [...TOPIC_SELECTION_RESEARCH_STAGE_VIEW_STAGES] },
    state: { enum: ['current', 'unavailable'] },
    current_selection_rule: { enum: [...TOPIC_SELECTION_RESEARCH_STAGE_CURRENT_SELECTION_RULES] },
    authority_ref: { anyOf: [topicSelectionFunctionalRefSchema, { type: 'null' }] },
    checkpoint_ref: { anyOf: [topicSelectionFunctionalRefSchema, { type: 'null' }] },
    supersedes_ref: { anyOf: [topicSelectionFunctionalRefSchema, { type: 'null' }] },
    snapshot_hash: { anyOf: [hashString, { type: 'null' }] },
    status: nullableStringId,
    source_refs: functionalRefArray,
    artifact_refs: functionalRefArray,
    issue_codes: stringArray,
  },
} as const;

export const topicSelectionResearchStageManifestSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'title_card_id',
    'current_stage',
    'next_human_decision_stage',
    'stages',
    'manifest_hash',
  ],
  properties: {
    schema_version: { const: 'TopicSelectionResearchStageManifest@v1' },
    title_card_id: stringId,
    current_stage: {
      anyOf: [{ enum: [...TOPIC_SELECTION_RESEARCH_STAGE_VIEW_STAGES] }, { type: 'null' }],
    },
    next_human_decision_stage: {
      anyOf: [{ enum: [...TOPIC_SELECTION_RESEARCH_STAGE_VIEW_STAGES] }, { type: 'null' }],
    },
    stages: {
      type: 'array',
      items: topicSelectionResearchStageManifestEntrySchema,
      minItems: TOPIC_SELECTION_RESEARCH_STAGE_VIEW_STAGES.length,
      maxItems: TOPIC_SELECTION_RESEARCH_STAGE_VIEW_STAGES.length,
    },
    manifest_hash: hashString,
  },
} as const;

const topicSelectionResearchStageViewBaseProperties = {
  schema_version: { const: 'TopicSelectionResearchStageView@v1' },
  title_card_id: stringId,
  stage: { enum: [...TOPIC_SELECTION_RESEARCH_STAGE_VIEW_STAGES] },
  state: { enum: ['current', 'unavailable'] },
  manifest_hash: hashString,
  source_snapshot_hash: { anyOf: [hashString, { type: 'null' }] },
  view_hash: hashString,
} as const;

const topicSelectionResearchHumanStageViewSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'title_card_id',
    'stage',
    'state',
    'manifest_hash',
    'source_snapshot_hash',
    'view_hash',
    'audience',
    'markdown',
  ],
  properties: {
    ...topicSelectionResearchStageViewBaseProperties,
    audience: { const: 'human' },
    markdown: stringId,
  },
} as const;

const topicSelectionResearchLlmStageViewSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'title_card_id',
    'stage',
    'state',
    'manifest_hash',
    'source_snapshot_hash',
    'view_hash',
    'audience',
    'working_set',
  ],
  properties: {
    ...topicSelectionResearchStageViewBaseProperties,
    audience: { const: 'llm' },
    working_set: { type: 'object', additionalProperties: true },
  },
} as const;

export const topicSelectionResearchStageViewSchema = {
  oneOf: [
    topicSelectionResearchHumanStageViewSchema,
    topicSelectionResearchLlmStageViewSchema,
  ],
} as const;

const continuationEffectClassSchema = {
  enum: [
    ...TOPIC_SELECTION_RESEARCH_ROUTINE_EFFECT_CLASSES,
    ...TOPIC_SELECTION_RESEARCH_CONFIRMATION_EFFECT_CLASSES,
  ],
} as const;

export const topicSelectionResearchContinuationEnvelopeSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'intent',
    'title_card_id',
    'manifest_hash',
    'environment_scope',
    'target_human_decision_stage',
    'boundary_reached',
    'routine_effect_classes',
    'confirmation_required_effect_classes',
    'reason_codes',
    'envelope_hash',
  ],
  properties: {
    schema_version: { const: 'TopicSelectionResearchContinuationEnvelope@v1' },
    intent: { const: 'advance_to_next_human_decision' },
    title_card_id: stringId,
    manifest_hash: hashString,
    environment_scope: { const: 'selected_local_backend' },
    target_human_decision_stage: {
      anyOf: [{ enum: [...TOPIC_SELECTION_RESEARCH_STAGE_VIEW_STAGES] }, { type: 'null' }],
    },
    boundary_reached: { type: 'boolean' },
    routine_effect_classes: {
      type: 'array',
      items: { enum: [...TOPIC_SELECTION_RESEARCH_ROUTINE_EFFECT_CLASSES] },
      minItems: TOPIC_SELECTION_RESEARCH_ROUTINE_EFFECT_CLASSES.length,
      maxItems: TOPIC_SELECTION_RESEARCH_ROUTINE_EFFECT_CLASSES.length,
      uniqueItems: true,
    },
    confirmation_required_effect_classes: {
      type: 'array',
      items: { enum: [...TOPIC_SELECTION_RESEARCH_CONFIRMATION_EFFECT_CLASSES] },
      minItems: TOPIC_SELECTION_RESEARCH_CONFIRMATION_EFFECT_CLASSES.length,
      maxItems: TOPIC_SELECTION_RESEARCH_CONFIRMATION_EFFECT_CLASSES.length,
      uniqueItems: true,
    },
    reason_codes: {
      type: 'array',
      items: { enum: [...TOPIC_SELECTION_RESEARCH_CONTINUATION_REASON_CODES] },
      uniqueItems: true,
    },
    envelope_hash: hashString,
  },
} as const;

export const topicSelectionResearchContinuationEnvelopeEvaluationInputSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['schema_version', 'envelope_hash', 'manifest_hash', 'proposed_effects'],
  properties: {
    schema_version: { const: 'TopicSelectionResearchContinuationEnvelopeEvaluationInput@v1' },
    envelope_hash: hashString,
    manifest_hash: hashString,
    proposed_effects: {
      type: 'array',
      items: continuationEffectClassSchema,
      minItems: 1,
      uniqueItems: true,
    },
  },
} as const;

export const topicSelectionResearchContinuationEnvelopeEvaluationSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'title_card_id',
    'decision',
    'envelope_hash',
    'manifest_hash',
    'target_human_decision_stage',
    'routine_effects',
    'blocking_effects',
    'reason_codes',
    'evaluation_hash',
  ],
  properties: {
    schema_version: { const: 'TopicSelectionResearchContinuationEnvelopeEvaluation@v1' },
    title_card_id: stringId,
    decision: { enum: ['continue', 'stop_for_human', 'refresh_envelope'] },
    envelope_hash: hashString,
    manifest_hash: hashString,
    target_human_decision_stage: {
      anyOf: [{ enum: [...TOPIC_SELECTION_RESEARCH_STAGE_VIEW_STAGES] }, { type: 'null' }],
    },
    routine_effects: {
      type: 'array',
      items: { enum: [...TOPIC_SELECTION_RESEARCH_ROUTINE_EFFECT_CLASSES] },
      uniqueItems: true,
    },
    blocking_effects: {
      type: 'array',
      items: { enum: [...TOPIC_SELECTION_RESEARCH_CONFIRMATION_EFFECT_CLASSES] },
      uniqueItems: true,
    },
    reason_codes: {
      type: 'array',
      items: { enum: [...TOPIC_SELECTION_RESEARCH_CONTINUATION_REASON_CODES] },
      minItems: 1,
      uniqueItems: true,
    },
    evaluation_hash: hashString,
  },
} as const;
