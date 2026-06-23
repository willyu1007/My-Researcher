import {
  TOPIC_SELECTION_ACTOR_TYPES,
  topicSelectionFunctionalRefSchema,
  type TopicSelectionActorType,
  type TopicSelectionFunctionalRef,
} from './topic-selection-control-plane-contracts.js';
import type {
  TopicSelectionImpactLevel,
  TopicSelectionSeverity,
} from './topic-selection-recheck-risk-memory-contracts.js';

export const TOPIC_SELECTION_DOWNSTREAM_FEEDBACK_SOURCE_KINDS = [
  'paper_project',
  'paper_implementation',
  'writing',
  'research_argument',
  'reviewer_check',
  'manual',
] as const;
export type TopicSelectionDownstreamFeedbackSourceKind =
  (typeof TOPIC_SELECTION_DOWNSTREAM_FEEDBACK_SOURCE_KINDS)[number];

export const TOPIC_SELECTION_V1C_DOWNSTREAM_FEEDBACK_CANDIDATE_SCHEMA_VERSION =
  'topic-selection-v1c-downstream-feedback-candidate.v1' as const;

export const TOPIC_SELECTION_DOWNSTREAM_LOOPBACK_TARGETS = [
  'package',
  'value_assessment',
  'topic_question',
  'research_slice',
  'validated_need',
  'evidence_or_search',
  'promotion',
  'paper_project_bridge',
  'merge_candidate',
  'paper_project_intake',
] as const;
export type TopicSelectionDownstreamLoopbackTarget =
  (typeof TOPIC_SELECTION_DOWNSTREAM_LOOPBACK_TARGETS)[number];

export const TOPIC_SELECTION_DOWNSTREAM_LOOPBACK_CAUSES = [
  'stale_evidence',
  'overclaim',
  'unanswerable_question',
  'boundary_drift',
  'need_invalidated',
  'package_narrative_gap',
  'promotion_authorization_gap',
  'bridge_trace_gap',
  'commitment_gap',
  'merge_candidate_conflict',
  'paper_project_constraint_conflict',
  'downstream_mutation_attempt',
  'no_recheck_needed',
] as const;
export type TopicSelectionDownstreamLoopbackCause =
  (typeof TOPIC_SELECTION_DOWNSTREAM_LOOPBACK_CAUSES)[number];

export interface TopicSelectionLoopbackClassification {
  loopback_target: TopicSelectionDownstreamLoopbackTarget;
  loopback_cause: TopicSelectionDownstreamLoopbackCause;
  severity: TopicSelectionSeverity;
  requires_recheck: boolean;
  affected_ref: TopicSelectionFunctionalRef;
  affected_stage: string;
  source_refs: TopicSelectionFunctionalRef[];
  rationale: string;
  required_actions: string[];
}

export interface TopicSelectionDownstreamRecheckRequest {
  downstream_recheck_request_id: string;
  feedback_ref: TopicSelectionFunctionalRef;
  loopback_target: TopicSelectionDownstreamLoopbackTarget;
  loopback_cause: TopicSelectionDownstreamLoopbackCause;
  affected_ref: TopicSelectionFunctionalRef;
  required_actions: string[];
  reason_codes: string[];
  source_refs: TopicSelectionFunctionalRef[];
  created_at: string;
}

export interface TopicSelectionDownstreamFeedbackImpactSummary {
  impact_level: TopicSelectionImpactLevel;
  severity: TopicSelectionSeverity;
  loopback_target: TopicSelectionDownstreamLoopbackTarget;
  loopback_cause: TopicSelectionDownstreamLoopbackCause;
  requires_recheck: boolean;
  affected_ref: TopicSelectionFunctionalRef;
  recheck_event_ref?: TopicSelectionFunctionalRef | null;
  recheck_impact_ref?: TopicSelectionFunctionalRef | null;
  decision_work_queue_item_ref?: TopicSelectionFunctionalRef | null;
  summary: string;
  /** T-127 W-08: deterministic ranked advisory score (0–100, higher = recheck sooner) =
   *  computeDownstreamRecheckAdvisoryPriority(severity, impact_level, loopback_cause). Present only when
   *  requires_recheck; ADVISORY/record-only — it ranks recheck candidates for an operator, never routes a
   *  loopback (T-108 forward-only preserved). */
  advisory_priority?: number | null;
  /** Human-readable derivation of advisory_priority, e.g. "critical+invalidated+need_invalidated". */
  advisory_rank_reason?: string | null;
}

export interface TopicSelectionDownstreamTopicFeedbackCreateInput {
  paper_project_bridge_id: string;
  workspace_id?: string | null;
  downstream_source_kind: TopicSelectionDownstreamFeedbackSourceKind;
  downstream_source_ref: TopicSelectionFunctionalRef;
  source_feedback_refs?: TopicSelectionFunctionalRef[];
  observed_blocker_refs?: TopicSelectionFunctionalRef[];
  feedback_signal: TopicSelectionDownstreamLoopbackCause;
  severity: TopicSelectionSeverity;
  summary: string;
  required_action?: string | null;
  artifact_refs?: TopicSelectionFunctionalRef[];
  feedback_payload?: Record<string, unknown>;
  policy_version_id?: string | null;
  created_by?: TopicSelectionActorType;
}

export interface TopicSelectionV1cDownstreamFeedbackNormalizationHints {
  requires_recheck_hint: boolean;
  loopback_target_hint: TopicSelectionDownstreamLoopbackTarget | null;
  affected_ref_hint: TopicSelectionFunctionalRef | null;
  reason_codes: string[];
}

export interface TopicSelectionV1cDownstreamFeedbackCandidate {
  schema_version: typeof TOPIC_SELECTION_V1C_DOWNSTREAM_FEEDBACK_CANDIDATE_SCHEMA_VERSION;
  paper_project_bridge_id: string;
  workspace_id?: string | null;
  downstream_source_kind: TopicSelectionDownstreamFeedbackSourceKind;
  downstream_source_ref: TopicSelectionFunctionalRef;
  source_feedback_refs: TopicSelectionFunctionalRef[];
  observed_blocker_refs: TopicSelectionFunctionalRef[];
  feedback_signal: TopicSelectionDownstreamLoopbackCause;
  severity: TopicSelectionSeverity;
  summary: string;
  required_action: string | null;
  artifact_refs: TopicSelectionFunctionalRef[];
  feedback_payload: Record<string, unknown>;
  normalization_hints: TopicSelectionV1cDownstreamFeedbackNormalizationHints;
  cited_refs: TopicSelectionFunctionalRef[];
  no_upstream_mutation_confirmed: boolean;
}

export interface TopicSelectionDownstreamTopicFeedbackRecord {
  downstream_topic_feedback_id: string;
  feedback_fingerprint: string;
  workspace_id?: string | null;
  title_card_id?: string | null;
  paper_project_bridge_id: string;
  paper_project_bridge_ref: TopicSelectionFunctionalRef;
  source_promotion_decision_ref: TopicSelectionFunctionalRef;
  promotion_commitment_profile_ref: TopicSelectionFunctionalRef;
  promotion_input_snapshot_id: string;
  promotion_input_snapshot_ref: TopicSelectionFunctionalRef;
  promotion_input_snapshot_hash: string;
  topic_package_id: string;
  package_version: string;
  downstream_source_kind: TopicSelectionDownstreamFeedbackSourceKind;
  downstream_source_ref: TopicSelectionFunctionalRef;
  source_feedback_refs: TopicSelectionFunctionalRef[];
  observed_blocker_refs: TopicSelectionFunctionalRef[];
  feedback_signal: TopicSelectionDownstreamLoopbackCause;
  severity: TopicSelectionSeverity;
  summary: string;
  required_action?: string | null;
  classification: TopicSelectionLoopbackClassification;
  recheck_request?: TopicSelectionDownstreamRecheckRequest | null;
  impact_summary: TopicSelectionDownstreamFeedbackImpactSummary;
  recheck_event_ref?: TopicSelectionFunctionalRef | null;
  recheck_impact_ref?: TopicSelectionFunctionalRef | null;
  decision_work_queue_item_ref?: TopicSelectionFunctionalRef | null;
  artifact_refs: TopicSelectionFunctionalRef[];
  payload: Record<string, unknown>;
  policy_version_id?: string | null;
  created_by: TopicSelectionActorType;
  created_at: string;
}

export type DownstreamTopicFeedbackCreateInput =
  TopicSelectionDownstreamTopicFeedbackCreateInput;
export type DownstreamTopicFeedbackRecord =
  TopicSelectionDownstreamTopicFeedbackRecord;

const stringId = { type: 'string', minLength: 1 } as const;
const nullableStringId = { anyOf: [stringId, { type: 'null' }] } as const;
const objectPayload = { type: 'object', additionalProperties: true } as const;
const stringArray = { type: 'array', items: stringId } as const;
const functionalRefArray = { type: 'array', items: topicSelectionFunctionalRefSchema } as const;
const nullableFunctionalRef = {
  anyOf: [topicSelectionFunctionalRefSchema, { type: 'null' }],
} as const;
const actorTypeSchema = { enum: [...TOPIC_SELECTION_ACTOR_TYPES] } as const;
const severitySchema = { enum: ['info', 'warning', 'blocking', 'critical'] } as const;
const impactLevelSchema = { enum: ['no_impact', 'stale', 'recheck_required', 'invalidated'] } as const;
const sourceKindSchema = {
  enum: [...TOPIC_SELECTION_DOWNSTREAM_FEEDBACK_SOURCE_KINDS],
} as const;
const loopbackTargetSchema = {
  enum: [...TOPIC_SELECTION_DOWNSTREAM_LOOPBACK_TARGETS],
} as const;
const loopbackCauseSchema = {
  enum: [...TOPIC_SELECTION_DOWNSTREAM_LOOPBACK_CAUSES],
} as const;
const downstreamFeedbackCandidateSchemaVersionSchema = {
  enum: [TOPIC_SELECTION_V1C_DOWNSTREAM_FEEDBACK_CANDIDATE_SCHEMA_VERSION],
} as const;

export const topicSelectionLoopbackClassificationSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'loopback_target',
    'loopback_cause',
    'severity',
    'requires_recheck',
    'affected_ref',
    'affected_stage',
    'source_refs',
    'rationale',
    'required_actions',
  ],
  properties: {
    loopback_target: loopbackTargetSchema,
    loopback_cause: loopbackCauseSchema,
    severity: severitySchema,
    requires_recheck: { type: 'boolean' },
    affected_ref: topicSelectionFunctionalRefSchema,
    affected_stage: stringId,
    source_refs: functionalRefArray,
    rationale: stringId,
    required_actions: stringArray,
  },
} as const;

export const topicSelectionDownstreamRecheckRequestSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'downstream_recheck_request_id',
    'feedback_ref',
    'loopback_target',
    'loopback_cause',
    'affected_ref',
    'required_actions',
    'reason_codes',
    'source_refs',
    'created_at',
  ],
  properties: {
    downstream_recheck_request_id: stringId,
    feedback_ref: topicSelectionFunctionalRefSchema,
    loopback_target: loopbackTargetSchema,
    loopback_cause: loopbackCauseSchema,
    affected_ref: topicSelectionFunctionalRefSchema,
    required_actions: stringArray,
    reason_codes: stringArray,
    source_refs: functionalRefArray,
    created_at: stringId,
  },
} as const;

export const topicSelectionDownstreamFeedbackImpactSummarySchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'impact_level',
    'severity',
    'loopback_target',
    'loopback_cause',
    'requires_recheck',
    'affected_ref',
    'summary',
  ],
  properties: {
    impact_level: impactLevelSchema,
    severity: severitySchema,
    loopback_target: loopbackTargetSchema,
    loopback_cause: loopbackCauseSchema,
    requires_recheck: { type: 'boolean' },
    affected_ref: topicSelectionFunctionalRefSchema,
    recheck_event_ref: nullableFunctionalRef,
    recheck_impact_ref: nullableFunctionalRef,
    decision_work_queue_item_ref: nullableFunctionalRef,
    summary: stringId,
    // T-127 W-08: optional advisory ranking (record-only). Absent on no-recheck records.
    advisory_priority: { anyOf: [{ type: 'integer', minimum: 0, maximum: 100 }, { type: 'null' }] },
    advisory_rank_reason: { anyOf: [{ type: 'string', minLength: 1 }, { type: 'null' }] },
  },
} as const;

export const topicSelectionDownstreamTopicFeedbackCreateInputSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'paper_project_bridge_id',
    'downstream_source_kind',
    'downstream_source_ref',
    'feedback_signal',
    'severity',
    'summary',
  ],
  properties: {
    paper_project_bridge_id: stringId,
    workspace_id: nullableStringId,
    downstream_source_kind: sourceKindSchema,
    downstream_source_ref: topicSelectionFunctionalRefSchema,
    source_feedback_refs: functionalRefArray,
    observed_blocker_refs: functionalRefArray,
    feedback_signal: loopbackCauseSchema,
    severity: severitySchema,
    summary: stringId,
    required_action: nullableStringId,
    artifact_refs: functionalRefArray,
    feedback_payload: objectPayload,
    policy_version_id: nullableStringId,
    created_by: actorTypeSchema,
  },
} as const;

export const topicSelectionV1cDownstreamFeedbackNormalizationHintsSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'requires_recheck_hint',
    'loopback_target_hint',
    'affected_ref_hint',
    'reason_codes',
  ],
  properties: {
    requires_recheck_hint: { type: 'boolean' },
    loopback_target_hint: { anyOf: [loopbackTargetSchema, { type: 'null' }] },
    affected_ref_hint: nullableFunctionalRef,
    reason_codes: stringArray,
  },
} as const;

export const topicSelectionV1cDownstreamFeedbackCandidateSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'paper_project_bridge_id',
    'downstream_source_kind',
    'downstream_source_ref',
    'source_feedback_refs',
    'observed_blocker_refs',
    'feedback_signal',
    'severity',
    'summary',
    'required_action',
    'artifact_refs',
    'feedback_payload',
    'normalization_hints',
    'cited_refs',
    'no_upstream_mutation_confirmed',
  ],
  properties: {
    schema_version: downstreamFeedbackCandidateSchemaVersionSchema,
    paper_project_bridge_id: stringId,
    workspace_id: nullableStringId,
    downstream_source_kind: sourceKindSchema,
    downstream_source_ref: topicSelectionFunctionalRefSchema,
    source_feedback_refs: functionalRefArray,
    observed_blocker_refs: functionalRefArray,
    feedback_signal: loopbackCauseSchema,
    severity: severitySchema,
    summary: stringId,
    required_action: nullableStringId,
    artifact_refs: functionalRefArray,
    feedback_payload: objectPayload,
    normalization_hints: topicSelectionV1cDownstreamFeedbackNormalizationHintsSchema,
    cited_refs: functionalRefArray,
    no_upstream_mutation_confirmed: { type: 'boolean' },
  },
} as const;

export const topicSelectionDownstreamTopicFeedbackRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'downstream_topic_feedback_id',
    'feedback_fingerprint',
    'paper_project_bridge_id',
    'paper_project_bridge_ref',
    'source_promotion_decision_ref',
    'promotion_commitment_profile_ref',
    'promotion_input_snapshot_id',
    'promotion_input_snapshot_ref',
    'promotion_input_snapshot_hash',
    'topic_package_id',
    'package_version',
    'downstream_source_kind',
    'downstream_source_ref',
    'source_feedback_refs',
    'observed_blocker_refs',
    'feedback_signal',
    'severity',
    'summary',
    'classification',
    'impact_summary',
    'artifact_refs',
    'payload',
    'created_by',
    'created_at',
  ],
  properties: {
    downstream_topic_feedback_id: stringId,
    feedback_fingerprint: stringId,
    workspace_id: nullableStringId,
    title_card_id: nullableStringId,
    paper_project_bridge_id: stringId,
    paper_project_bridge_ref: topicSelectionFunctionalRefSchema,
    source_promotion_decision_ref: topicSelectionFunctionalRefSchema,
    promotion_commitment_profile_ref: topicSelectionFunctionalRefSchema,
    promotion_input_snapshot_id: stringId,
    promotion_input_snapshot_ref: topicSelectionFunctionalRefSchema,
    promotion_input_snapshot_hash: stringId,
    topic_package_id: stringId,
    package_version: stringId,
    downstream_source_kind: sourceKindSchema,
    downstream_source_ref: topicSelectionFunctionalRefSchema,
    source_feedback_refs: functionalRefArray,
    observed_blocker_refs: functionalRefArray,
    feedback_signal: loopbackCauseSchema,
    severity: severitySchema,
    summary: stringId,
    required_action: nullableStringId,
    classification: topicSelectionLoopbackClassificationSchema,
    recheck_request: {
      anyOf: [topicSelectionDownstreamRecheckRequestSchema, { type: 'null' }],
    },
    impact_summary: topicSelectionDownstreamFeedbackImpactSummarySchema,
    recheck_event_ref: nullableFunctionalRef,
    recheck_impact_ref: nullableFunctionalRef,
    decision_work_queue_item_ref: nullableFunctionalRef,
    artifact_refs: functionalRefArray,
    payload: objectPayload,
    policy_version_id: nullableStringId,
    created_by: actorTypeSchema,
    created_at: stringId,
  },
} as const;

// ─────────────────────────────────────────────────── T-127 W-08: deterministic recheck advisory ranking ──
//
// A pure, deterministic ranked score (0–100, higher = recheck sooner) for a downstream feedback that
// REQUIRES a recheck. It refines the prior binary queue priority (invalidated→100 / else→85) into a
// severity × impact × cause composite so multiple feedbacks converging on one target are distinguishable.
// ADVISORY/record-only: it ranks recheck candidates for a human operator to read — it NEVER routes a
// loopback or mutates forward state (T-108 forward-only preserved). Single-sourced here so the emission
// side and the read projection agree.

const ADVISORY_SEVERITY_WEIGHT: Record<TopicSelectionSeverity, number> = {
  info: 10,
  warning: 25,
  blocking: 45,
  critical: 60,
};

const ADVISORY_IMPACT_WEIGHT: Record<TopicSelectionImpactLevel, number> = {
  no_impact: 0,
  stale: 8,
  recheck_required: 18,
  invalidated: 30,
};

const ADVISORY_CAUSE_WEIGHT: Record<TopicSelectionDownstreamLoopbackCause, number> = {
  downstream_mutation_attempt: 10,
  need_invalidated: 9,
  promotion_authorization_gap: 8,
  commitment_gap: 7,
  overclaim: 6,
  bridge_trace_gap: 6,
  boundary_drift: 5,
  package_narrative_gap: 5,
  unanswerable_question: 5,
  merge_candidate_conflict: 4,
  paper_project_constraint_conflict: 4,
  stale_evidence: 3,
  no_recheck_needed: 0,
};

/** Deterministic recheck advisory ranking. Returns the 0–100 score + a human-readable reason. Pure: same
 *  inputs always yield the same output (no clock / randomness), so it is replay-stable. */
export function computeDownstreamRecheckAdvisoryPriority(
  severity: TopicSelectionSeverity,
  impactLevel: TopicSelectionImpactLevel,
  loopbackCause: TopicSelectionDownstreamLoopbackCause,
): { advisory_priority: number; advisory_rank_reason: string } {
  const advisory_priority =
    ADVISORY_SEVERITY_WEIGHT[severity] +
    ADVISORY_IMPACT_WEIGHT[impactLevel] +
    ADVISORY_CAUSE_WEIGHT[loopbackCause];
  return {
    advisory_priority,
    advisory_rank_reason: `${severity}+${impactLevel}+${loopbackCause}`,
  };
}
