import {
  TOPIC_SELECTION_ACTOR_TYPES,
  topicSelectionFunctionalRefSchema,
  type TopicSelectionActorType,
  type TopicSelectionFunctionalRef,
} from './topic-selection-control-plane-contracts.js';
import {
  topicSelectionPaperProjectBridgeWorkingCopyPayloadSchema,
  type TopicSelectionPaperProjectBridgeHandoff,
  type TopicSelectionPaperProjectBridgeWorkingCopyPayload,
} from './topic-selection-v1c-paper-project-bridge-contracts.js';
import type {
  TopicSelectionDownstreamFeedbackImpactSummary,
  TopicSelectionDownstreamRecheckRequest,
  TopicSelectionDownstreamTopicFeedbackRecord,
} from './topic-selection-v1c-downstream-feedback-recheck-contracts.js';
import type {
  TopicSelectionPromotionBridgeHandoff,
} from './topic-selection-v1c-human-promotion-decision-contracts.js';
import type {
  TopicSelectionSeverity,
} from './topic-selection-recheck-risk-memory-contracts.js';

export const PAPER_IMPLEMENTATION_SOURCE_STATUSES = [
  'active',
  'stale',
  'superseded',
  'hash_mismatch',
  'blocked',
] as const;
export type PaperImplementationSourceStatus =
  (typeof PAPER_IMPLEMENTATION_SOURCE_STATUSES)[number];

export const PAPER_IMPLEMENTATION_PROJECT_LIFECYCLE_STATUSES = [
  'active',
  'blocked',
  'archived',
] as const;
export type PaperImplementationProjectLifecycleStatus =
  (typeof PAPER_IMPLEMENTATION_PROJECT_LIFECYCLE_STATUSES)[number];

export const PAPER_IMPLEMENTATION_FRESHNESS_STATUSES = [
  'fresh',
  'stale',
  'invalidated',
] as const;
export type PaperImplementationFreshnessStatus =
  (typeof PAPER_IMPLEMENTATION_FRESHNESS_STATUSES)[number];

export const IMPLEMENTATION_FEEDBACK_TYPES = [
  'infeasible_route',
  'unavailable_data',
  'invalidated_evidence',
  'lower_claim_ceiling',
  'topic_question_not_answerable',
  'research_slice_too_broad',
] as const;
export type ImplementationFeedbackType = (typeof IMPLEMENTATION_FEEDBACK_TYPES)[number];

export const IMPLEMENTATION_FEEDBACK_STATUSES = [
  'recorded',
  'recheck_requested',
  'closed',
] as const;
export type ImplementationFeedbackStatus = (typeof IMPLEMENTATION_FEEDBACK_STATUSES)[number];

export const IMPLEMENTATION_UPSTREAM_ACTIONS = [
  'recheck_topic_selection',
  'refresh_intake',
  'none',
] as const;
export type ImplementationUpstreamAction = (typeof IMPLEMENTATION_UPSTREAM_ACTIONS)[number];

export interface ImplementationIntakeSnapshot {
  intake_snapshot_id: string;
  implementation_project_id: string;
  workspace_id?: string | null;
  title_card_id: string;
  paper_project_bridge_id: string;
  paper_project_bridge_ref: TopicSelectionFunctionalRef;
  bridge_payload_hash: string;
  promotion_decision_id: string;
  promotion_decision_ref: TopicSelectionFunctionalRef;
  promotion_commitment_profile_id: string;
  promotion_commitment_profile_ref: TopicSelectionFunctionalRef;
  promotion_input_snapshot_id: string;
  promotion_input_snapshot_ref: TopicSelectionFunctionalRef;
  promotion_input_snapshot_hash: string;
  topic_package_id: string;
  package_version: string;
  source_status: PaperImplementationSourceStatus;
  snapshot_hashes: TopicSelectionPromotionBridgeHandoff['snapshot_hashes'];
  source_refs: TopicSelectionFunctionalRef[];
  accepted_risk_refs: TopicSelectionFunctionalRef[];
  condition_refs: TopicSelectionFunctionalRef[];
  early_check_obligations: string[];
  working_copy_payload: TopicSelectionPaperProjectBridgeWorkingCopyPayload;
  working_copy_payload_hash: string;
  source_handoff: TopicSelectionPaperProjectBridgeHandoff;
  target_paper_project_ref?: TopicSelectionFunctionalRef | null;
  intake_snapshot_hash: string;
  policy_version_id?: string | null;
  created_by: TopicSelectionActorType;
  created_at: string;
}

export interface ImplementationProject {
  implementation_project_id: string;
  intake_snapshot_id: string;
  workspace_id?: string | null;
  title_card_id: string;
  paper_project_bridge_id: string;
  bridge_payload_hash: string;
  target_paper_project_ref?: TopicSelectionFunctionalRef | null;
  lifecycle_status: PaperImplementationProjectLifecycleStatus;
  freshness_status: PaperImplementationFreshnessStatus;
  source_status: PaperImplementationSourceStatus;
  version_number: number;
  policy_version_id?: string | null;
  created_by: TopicSelectionActorType;
  created_at: string;
  updated_at: string;
}

export interface BootstrapImplementationProjectRequest {
  paper_project_bridge_id: string;
  bridge_payload_hash: string;
  workspace_id?: string | null;
  policy_version_id?: string | null;
  created_by?: TopicSelectionActorType;
}

export interface BootstrapImplementationProjectResponse {
  implementation_project: ImplementationProject;
  intake_snapshot: ImplementationIntakeSnapshot;
  project_created: boolean;
  handoff_to_motive: {
    implementation_project_id: string;
    intake_snapshot_id: string;
    title_card_id: string;
    topic_package_id: string;
    package_version: string;
    source_refs: TopicSelectionFunctionalRef[];
    accepted_risk_refs: TopicSelectionFunctionalRef[];
    condition_refs: TopicSelectionFunctionalRef[];
    early_check_obligations: string[];
  };
}

export const PAPER_IMPLEMENTATION_TOPIC_HANDOFF_SCHEMA_VERSION =
  'PaperImplementationTopicHandoff@v1' as const;
export const PAPER_IMPLEMENTATION_TOPIC_HANDOFF_STATUSES = ['created', 'resumed'] as const;
export type PaperImplementationTopicHandoffStatus =
  (typeof PAPER_IMPLEMENTATION_TOPIC_HANDOFF_STATUSES)[number];

export const PAPER_IMPLEMENTATION_TOPIC_HANDOFF_RESUME_POLICY =
  'read_persisted_owner_state_and_continue_first_incomplete_step' as const;

export interface CreatePaperImplementationTopicHandoffRequest {
  paper_project_bridge_id: string;
}

export interface PaperImplementationTopicHandoffResponse {
  schema_version: typeof PAPER_IMPLEMENTATION_TOPIC_HANDOFF_SCHEMA_VERSION;
  status: PaperImplementationTopicHandoffStatus;
  effects: {
    paper_project_created: boolean;
    implementation_project_created: boolean;
  };
  semantic_context: TopicSelectionPaperProjectBridgeWorkingCopyPayload;
  lineage: {
    paper_project_bridge_ref: TopicSelectionFunctionalRef;
    title_card_id: string;
    topic_package_id: string;
    package_version: string;
    paper_project_intake_ref: TopicSelectionFunctionalRef;
    paper_project_ref: TopicSelectionFunctionalRef;
    implementation_project_id: string;
    implementation_intake_snapshot_id: string;
  };
  resume_policy: typeof PAPER_IMPLEMENTATION_TOPIC_HANDOFF_RESUME_POLICY;
}

export const PAPER_IMPLEMENTATION_SCIENTIFIC_CONTINUATION_SCHEMA_VERSION =
  'PaperImplementationScientificContinuation@v1' as const;

export const PAPER_IMPLEMENTATION_SCIENTIFIC_CONTINUATION_STATUSES = [
  'advanced',
  'waiting_for_llm',
  'waiting_for_experiment_specification',
  'waiting_for_paid_execution_authorization',
  'waiting_for_provider_execution',
  'waiting_for_human_confirmation',
  'blocked',
  'ready_for_writing',
] as const;
export type PaperImplementationScientificContinuationStatus =
  (typeof PAPER_IMPLEMENTATION_SCIENTIFIC_CONTINUATION_STATUSES)[number];

export const PAPER_IMPLEMENTATION_SCIENTIFIC_CONTINUATION_STAGES = [
  'implementation_planning',
  'llm_runtime',
  'experiment_specification',
  'experiment_materialization',
  'paid_execution',
  'provider_execution',
  'scientific_validation',
  'evidence_closure',
  'claim_dossier',
  'ready_for_writing',
] as const;
export type PaperImplementationScientificContinuationStage =
  (typeof PAPER_IMPLEMENTATION_SCIENTIFIC_CONTINUATION_STAGES)[number];

export const PAPER_IMPLEMENTATION_SCIENTIFIC_CONTINUATION_ACTIONS = [
  'repeat_continuation',
  'configure_llm',
  'select_experiment_assets',
  'authorize_paid_execution',
  'await_provider_execution',
  'provide_human_confirmation',
  'resolve_blocker',
  'none',
] as const;
export type PaperImplementationScientificContinuationAction =
  (typeof PAPER_IMPLEMENTATION_SCIENTIFIC_CONTINUATION_ACTIONS)[number];

export const PAPER_IMPLEMENTATION_SCIENTIFIC_CONTINUATION_EFFECTS = [
  'coordinator_run',
  'domain_authority',
  'experiment_work_order',
  'experiment_run',
  'provider_attempt',
  'scientific_result',
  'scientific_validation',
  'evidence_candidate',
  'result_analysis',
  'closure',
  'result_packet',
  'claim',
  'dossier',
] as const;
export type PaperImplementationScientificContinuationEffect =
  (typeof PAPER_IMPLEMENTATION_SCIENTIFIC_CONTINUATION_EFFECTS)[number];

export const PAPER_IMPLEMENTATION_SCIENTIFIC_CONTINUATION_RESUME_POLICY =
  'repeat_same_owner_root_command_and_read_persisted_owner_state' as const;

/**
 * The single caller-owned continuation input. Every downstream identity,
 * semantic stage and scientific value is resolved from persisted owner state.
 */
export interface CreatePaperImplementationScientificContinuationRequest {
  implementation_project_id: string;
}

export interface PaperImplementationScientificContinuationBlocker {
  code: string;
  message: string;
  source: 'continuation' | 'domain' | 'provider';
  retryable: boolean;
}

export interface PaperImplementationScientificContinuationResponse {
  schema_version: typeof PAPER_IMPLEMENTATION_SCIENTIFIC_CONTINUATION_SCHEMA_VERSION;
  status: PaperImplementationScientificContinuationStatus;
  semantic_stage: PaperImplementationScientificContinuationStage;
  effects: {
    performed: PaperImplementationScientificContinuationEffect[];
    reused: PaperImplementationScientificContinuationEffect[];
    /** At most one ordinary-LLM lane may be advanced by one command. */
    llm_lane_id: string | null;
  };
  next_action: {
    action: PaperImplementationScientificContinuationAction;
    description: string;
    requires_paid_authorization: boolean;
    requires_human_confirmation: boolean;
  };
  blocker: PaperImplementationScientificContinuationBlocker | null;
  lineage: {
    implementation_project_id: string;
    coordinator_run_id: string | null;
    validation_cycle_id: string | null;
    experiment_branch_id: string | null;
    experiment_work_order_revision_id: string | null;
    experiment_run_id: string | null;
    scientific_result_id: string | null;
    scientific_validation_report_id: string | null;
    closure_id: string | null;
    result_packet_id: string | null;
    claim_id: string | null;
    dossier_id: string | null;
  };
  resume_policy: typeof PAPER_IMPLEMENTATION_SCIENTIFIC_CONTINUATION_RESUME_POLICY;
}

export interface RecordImplementationFeedbackEventRequest {
  feedback_type: ImplementationFeedbackType;
  severity: TopicSelectionSeverity;
  summary: string;
  source_object_refs?: TopicSelectionFunctionalRef[];
  evidence_refs?: TopicSelectionFunctionalRef[];
  run_refs?: TopicSelectionFunctionalRef[];
  recommended_upstream_action?: ImplementationUpstreamAction | null;
  required_action?: string | null;
  artifact_refs?: TopicSelectionFunctionalRef[];
  feedback_payload?: Record<string, unknown>;
  policy_version_id?: string | null;
  created_by?: TopicSelectionActorType;
}

export interface ImplementationFeedbackEvent {
  feedback_event_id: string;
  implementation_project_id: string;
  intake_snapshot_id: string;
  paper_project_bridge_id: string;
  feedback_type: ImplementationFeedbackType;
  severity: TopicSelectionSeverity;
  summary: string;
  source_object_refs: TopicSelectionFunctionalRef[];
  evidence_refs: TopicSelectionFunctionalRef[];
  run_refs: TopicSelectionFunctionalRef[];
  recommended_upstream_action: ImplementationUpstreamAction;
  feedback_status: ImplementationFeedbackStatus;
  downstream_topic_feedback_ref?: TopicSelectionFunctionalRef | null;
  downstream_recheck_request?: TopicSelectionDownstreamRecheckRequest | null;
  downstream_impact_summary?: TopicSelectionDownstreamFeedbackImpactSummary | null;
  artifact_refs: TopicSelectionFunctionalRef[];
  payload: Record<string, unknown>;
  policy_version_id?: string | null;
  created_by: TopicSelectionActorType;
  created_at: string;
}

export interface RecordImplementationFeedbackEventResponse {
  feedback_event: ImplementationFeedbackEvent;
  downstream_topic_feedback?: TopicSelectionDownstreamTopicFeedbackRecord | null;
}

const stringId = { type: 'string', minLength: 1 } as const;
const nullableStringId = { anyOf: [stringId, { type: 'null' }] } as const;
const actorTypeSchema = { enum: [...TOPIC_SELECTION_ACTOR_TYPES] } as const;
const functionalRefArray = { type: 'array', items: topicSelectionFunctionalRefSchema } as const;
const nullableFunctionalRef = {
  anyOf: [topicSelectionFunctionalRefSchema, { type: 'null' }],
} as const;
const objectPayload = { type: 'object', additionalProperties: true } as const;
const stringArray = { type: 'array', items: stringId } as const;
const severitySchema = { enum: ['info', 'warning', 'blocking', 'critical'] } as const;

const sourceStatusSchema = { enum: [...PAPER_IMPLEMENTATION_SOURCE_STATUSES] } as const;
const lifecycleStatusSchema = {
  enum: [...PAPER_IMPLEMENTATION_PROJECT_LIFECYCLE_STATUSES],
} as const;
const freshnessStatusSchema = { enum: [...PAPER_IMPLEMENTATION_FRESHNESS_STATUSES] } as const;
const feedbackTypeSchema = { enum: [...IMPLEMENTATION_FEEDBACK_TYPES] } as const;
const feedbackStatusSchema = { enum: [...IMPLEMENTATION_FEEDBACK_STATUSES] } as const;
const upstreamActionSchema = { enum: [...IMPLEMENTATION_UPSTREAM_ACTIONS] } as const;

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

export const bootstrapImplementationProjectRequestSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['paper_project_bridge_id', 'bridge_payload_hash'],
  properties: {
    paper_project_bridge_id: stringId,
    bridge_payload_hash: stringId,
    workspace_id: nullableStringId,
    policy_version_id: nullableStringId,
    created_by: actorTypeSchema,
  },
} as const;

export const createPaperImplementationTopicHandoffRequestSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['paper_project_bridge_id'],
  properties: {
    paper_project_bridge_id: stringId,
  },
} as const;

export const createPaperImplementationScientificContinuationRequestSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['implementation_project_id'],
  properties: {
    implementation_project_id: stringId,
  },
} as const;

export const implementationIntakeSnapshotSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'intake_snapshot_id',
    'implementation_project_id',
    'title_card_id',
    'paper_project_bridge_id',
    'paper_project_bridge_ref',
    'bridge_payload_hash',
    'promotion_decision_id',
    'promotion_decision_ref',
    'promotion_commitment_profile_id',
    'promotion_commitment_profile_ref',
    'promotion_input_snapshot_id',
    'promotion_input_snapshot_ref',
    'promotion_input_snapshot_hash',
    'topic_package_id',
    'package_version',
    'source_status',
    'snapshot_hashes',
    'source_refs',
    'accepted_risk_refs',
    'condition_refs',
    'early_check_obligations',
    'working_copy_payload',
    'working_copy_payload_hash',
    'source_handoff',
    'intake_snapshot_hash',
    'created_by',
    'created_at',
  ],
  properties: {
    intake_snapshot_id: stringId,
    implementation_project_id: stringId,
    workspace_id: nullableStringId,
    title_card_id: stringId,
    paper_project_bridge_id: stringId,
    paper_project_bridge_ref: topicSelectionFunctionalRefSchema,
    bridge_payload_hash: stringId,
    promotion_decision_id: stringId,
    promotion_decision_ref: topicSelectionFunctionalRefSchema,
    promotion_commitment_profile_id: stringId,
    promotion_commitment_profile_ref: topicSelectionFunctionalRefSchema,
    promotion_input_snapshot_id: stringId,
    promotion_input_snapshot_ref: topicSelectionFunctionalRefSchema,
    promotion_input_snapshot_hash: stringId,
    topic_package_id: stringId,
    package_version: stringId,
    source_status: sourceStatusSchema,
    snapshot_hashes: snapshotHashesSchema,
    source_refs: functionalRefArray,
    accepted_risk_refs: functionalRefArray,
    condition_refs: functionalRefArray,
    early_check_obligations: stringArray,
    working_copy_payload: objectPayload,
    working_copy_payload_hash: stringId,
    source_handoff: objectPayload,
    target_paper_project_ref: nullableFunctionalRef,
    intake_snapshot_hash: stringId,
    policy_version_id: nullableStringId,
    created_by: actorTypeSchema,
    created_at: stringId,
  },
} as const;

export const implementationProjectSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'implementation_project_id',
    'intake_snapshot_id',
    'title_card_id',
    'paper_project_bridge_id',
    'bridge_payload_hash',
    'lifecycle_status',
    'freshness_status',
    'source_status',
    'version_number',
    'created_by',
    'created_at',
    'updated_at',
  ],
  properties: {
    implementation_project_id: stringId,
    intake_snapshot_id: stringId,
    workspace_id: nullableStringId,
    title_card_id: stringId,
    paper_project_bridge_id: stringId,
    bridge_payload_hash: stringId,
    target_paper_project_ref: nullableFunctionalRef,
    lifecycle_status: lifecycleStatusSchema,
    freshness_status: freshnessStatusSchema,
    source_status: sourceStatusSchema,
    version_number: { type: 'integer', minimum: 1 },
    policy_version_id: nullableStringId,
    created_by: actorTypeSchema,
    created_at: stringId,
    updated_at: stringId,
  },
} as const;

export const bootstrapImplementationProjectResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'implementation_project',
    'intake_snapshot',
    'project_created',
    'handoff_to_motive',
  ],
  properties: {
    implementation_project: implementationProjectSchema,
    intake_snapshot: implementationIntakeSnapshotSchema,
    project_created: { type: 'boolean' },
    handoff_to_motive: {
      type: 'object',
      additionalProperties: false,
      required: [
        'implementation_project_id',
        'intake_snapshot_id',
        'title_card_id',
        'topic_package_id',
        'package_version',
        'source_refs',
        'accepted_risk_refs',
        'condition_refs',
        'early_check_obligations',
      ],
      properties: {
        implementation_project_id: stringId,
        intake_snapshot_id: stringId,
        title_card_id: stringId,
        topic_package_id: stringId,
        package_version: stringId,
        source_refs: functionalRefArray,
        accepted_risk_refs: functionalRefArray,
        condition_refs: functionalRefArray,
        early_check_obligations: stringArray,
      },
    },
  },
} as const;

export const paperImplementationTopicHandoffResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'status',
    'effects',
    'semantic_context',
    'lineage',
    'resume_policy',
  ],
  properties: {
    schema_version: { const: PAPER_IMPLEMENTATION_TOPIC_HANDOFF_SCHEMA_VERSION },
    status: { enum: [...PAPER_IMPLEMENTATION_TOPIC_HANDOFF_STATUSES] },
    effects: {
      type: 'object',
      additionalProperties: false,
      required: ['paper_project_created', 'implementation_project_created'],
      properties: {
        paper_project_created: { type: 'boolean' },
        implementation_project_created: { type: 'boolean' },
      },
    },
    semantic_context: topicSelectionPaperProjectBridgeWorkingCopyPayloadSchema,
    lineage: {
      type: 'object',
      additionalProperties: false,
      required: [
        'paper_project_bridge_ref',
        'title_card_id',
        'topic_package_id',
        'package_version',
        'paper_project_intake_ref',
        'paper_project_ref',
        'implementation_project_id',
        'implementation_intake_snapshot_id',
      ],
      properties: {
        paper_project_bridge_ref: topicSelectionFunctionalRefSchema,
        title_card_id: stringId,
        topic_package_id: stringId,
        package_version: stringId,
        paper_project_intake_ref: topicSelectionFunctionalRefSchema,
        paper_project_ref: topicSelectionFunctionalRefSchema,
        implementation_project_id: stringId,
        implementation_intake_snapshot_id: stringId,
      },
    },
    resume_policy: { const: PAPER_IMPLEMENTATION_TOPIC_HANDOFF_RESUME_POLICY },
  },
} as const;

const scientificContinuationEffectSchema = {
  enum: [...PAPER_IMPLEMENTATION_SCIENTIFIC_CONTINUATION_EFFECTS],
} as const;

export const paperImplementationScientificContinuationResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'status',
    'semantic_stage',
    'effects',
    'next_action',
    'blocker',
    'lineage',
    'resume_policy',
  ],
  properties: {
    schema_version: { const: PAPER_IMPLEMENTATION_SCIENTIFIC_CONTINUATION_SCHEMA_VERSION },
    status: { enum: [...PAPER_IMPLEMENTATION_SCIENTIFIC_CONTINUATION_STATUSES] },
    semantic_stage: { enum: [...PAPER_IMPLEMENTATION_SCIENTIFIC_CONTINUATION_STAGES] },
    effects: {
      type: 'object',
      additionalProperties: false,
      required: ['performed', 'reused', 'llm_lane_id'],
      properties: {
        performed: { type: 'array', items: scientificContinuationEffectSchema, uniqueItems: true },
        reused: { type: 'array', items: scientificContinuationEffectSchema, uniqueItems: true },
        llm_lane_id: nullableStringId,
      },
    },
    next_action: {
      type: 'object',
      additionalProperties: false,
      required: [
        'action',
        'description',
        'requires_paid_authorization',
        'requires_human_confirmation',
      ],
      properties: {
        action: { enum: [...PAPER_IMPLEMENTATION_SCIENTIFIC_CONTINUATION_ACTIONS] },
        description: stringId,
        requires_paid_authorization: { type: 'boolean' },
        requires_human_confirmation: { type: 'boolean' },
      },
    },
    blocker: {
      anyOf: [
        {
          type: 'object',
          additionalProperties: false,
          required: ['code', 'message', 'source', 'retryable'],
          properties: {
            code: stringId,
            message: stringId,
            source: { enum: ['continuation', 'domain', 'provider'] },
            retryable: { type: 'boolean' },
          },
        },
        { type: 'null' },
      ],
    },
    lineage: {
      type: 'object',
      additionalProperties: false,
      required: [
        'implementation_project_id',
        'coordinator_run_id',
        'validation_cycle_id',
        'experiment_branch_id',
        'experiment_work_order_revision_id',
        'experiment_run_id',
        'scientific_result_id',
        'scientific_validation_report_id',
        'closure_id',
        'result_packet_id',
        'claim_id',
        'dossier_id',
      ],
      properties: {
        implementation_project_id: stringId,
        coordinator_run_id: nullableStringId,
        validation_cycle_id: nullableStringId,
        experiment_branch_id: nullableStringId,
        experiment_work_order_revision_id: nullableStringId,
        experiment_run_id: nullableStringId,
        scientific_result_id: nullableStringId,
        scientific_validation_report_id: nullableStringId,
        closure_id: nullableStringId,
        result_packet_id: nullableStringId,
        claim_id: nullableStringId,
        dossier_id: nullableStringId,
      },
    },
    resume_policy: { const: PAPER_IMPLEMENTATION_SCIENTIFIC_CONTINUATION_RESUME_POLICY },
  },
} as const;

export const recordImplementationFeedbackEventRequestSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['feedback_type', 'severity', 'summary'],
  properties: {
    feedback_type: feedbackTypeSchema,
    severity: severitySchema,
    summary: stringId,
    source_object_refs: functionalRefArray,
    evidence_refs: functionalRefArray,
    run_refs: functionalRefArray,
    recommended_upstream_action: {
      anyOf: [upstreamActionSchema, { type: 'null' }],
    },
    required_action: nullableStringId,
    artifact_refs: functionalRefArray,
    feedback_payload: objectPayload,
    policy_version_id: nullableStringId,
    created_by: actorTypeSchema,
  },
} as const;

export const implementationFeedbackEventSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'feedback_event_id',
    'implementation_project_id',
    'intake_snapshot_id',
    'paper_project_bridge_id',
    'feedback_type',
    'severity',
    'summary',
    'source_object_refs',
    'evidence_refs',
    'run_refs',
    'recommended_upstream_action',
    'feedback_status',
    'artifact_refs',
    'payload',
    'created_by',
    'created_at',
  ],
  properties: {
    feedback_event_id: stringId,
    implementation_project_id: stringId,
    intake_snapshot_id: stringId,
    paper_project_bridge_id: stringId,
    feedback_type: feedbackTypeSchema,
    severity: severitySchema,
    summary: stringId,
    source_object_refs: functionalRefArray,
    evidence_refs: functionalRefArray,
    run_refs: functionalRefArray,
    recommended_upstream_action: upstreamActionSchema,
    feedback_status: feedbackStatusSchema,
    downstream_topic_feedback_ref: nullableFunctionalRef,
    downstream_recheck_request: {
      anyOf: [objectPayload, { type: 'null' }],
    },
    downstream_impact_summary: {
      anyOf: [objectPayload, { type: 'null' }],
    },
    artifact_refs: functionalRefArray,
    payload: objectPayload,
    policy_version_id: nullableStringId,
    created_by: actorTypeSchema,
    created_at: stringId,
  },
} as const;

export const recordImplementationFeedbackEventResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['feedback_event'],
  properties: {
    feedback_event: implementationFeedbackEventSchema,
    downstream_topic_feedback: {
      anyOf: [objectPayload, { type: 'null' }],
    },
  },
} as const;
