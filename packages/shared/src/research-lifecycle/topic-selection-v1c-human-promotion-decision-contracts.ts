import {
  topicSelectionActorRefSchema,
  topicSelectionFunctionalRefSchema,
  type TopicSelectionActorRef,
  type TopicSelectionFunctionalRef,
} from './topic-selection-control-plane-contracts.js';
import type {
  TopicSelectionPromotionGateDisposition,
  TopicSelectionPromotionGateHandoff,
  TopicSelectionPromotionGateLoopbackTarget,
  TopicSelectionPromotionGateRequiredAction,
} from './topic-selection-v1c-promotion-gate-contracts.js';
import {
  TOPIC_SELECTION_PROMOTION_GATE_LOOPBACK_TARGETS,
  topicSelectionPromotionGateHandoffSchema,
  topicSelectionPromotionGateRequiredActionSchema,
} from './topic-selection-v1c-promotion-gate-contracts.js';

export const TOPIC_SELECTION_HUMAN_PROMOTION_DECISIONS = [
  'promote_to_paper_project',
  'promote_with_conditions',
  'merge_packages',
  'refine_package',
  'reassess_value',
  'revise_question',
  'revise_slice',
  'recheck_evidence_or_search',
  'park',
  'drop',
] as const;
export type TopicSelectionHumanPromotionDecisionKind =
  (typeof TOPIC_SELECTION_HUMAN_PROMOTION_DECISIONS)[number];

export const TOPIC_SELECTION_PROMOTE_CLASS_DECISIONS = [
  'promote_to_paper_project',
  'promote_with_conditions',
] as const;
export type TopicSelectionPromoteClassDecision =
  (typeof TOPIC_SELECTION_PROMOTE_CLASS_DECISIONS)[number];

export const TOPIC_SELECTION_NON_PROMOTE_DECISIONS = [
  'merge_packages',
  'refine_package',
  'reassess_value',
  'revise_question',
  'revise_slice',
  'recheck_evidence_or_search',
  'park',
  'drop',
] as const;
export type TopicSelectionNonPromoteDecision =
  (typeof TOPIC_SELECTION_NON_PROMOTE_DECISIONS)[number];

export const TOPIC_SELECTION_PROMOTION_DECISION_STATUSES = [
  'current',
  'superseded',
] as const;
export type TopicSelectionPromotionDecisionStatus =
  (typeof TOPIC_SELECTION_PROMOTION_DECISION_STATUSES)[number];

export const TOPIC_SELECTION_PROMOTION_DECISION_CLASSES = [
  'promote',
  'non_promote',
] as const;
export type TopicSelectionPromotionDecisionClass =
  (typeof TOPIC_SELECTION_PROMOTION_DECISION_CLASSES)[number];

export const TOPIC_SELECTION_PROMOTION_LOOPBACK_TARGETS =
  TOPIC_SELECTION_PROMOTION_GATE_LOOPBACK_TARGETS;
export type TopicSelectionPromotionLoopbackTarget =
  TopicSelectionPromotionGateLoopbackTarget;

export interface TopicSelectionPromotionCondition {
  condition_id: string;
  condition_code: string;
  owner: TopicSelectionActorRef;
  required_action: TopicSelectionPromotionGateRequiredAction;
  refs: TopicSelectionFunctionalRef[];
  early_check_obligations: string[];
  verification_note?: string | null;
}

export interface TopicSelectionAllowedPromotionRefinement {
  refinement_code: string;
  scope: string;
  refs: TopicSelectionFunctionalRef[];
  reason?: string | null;
}

export interface TopicSelectionPromotionStopOrReopenCondition {
  condition_code: string;
  reason: string;
  refs: TopicSelectionFunctionalRef[];
}

export interface TopicSelectionHumanPromotionDecisionRecord {
  human_promotion_decision_id: string;
  human_confirmed_decision_id: string;
  human_promotion_decision_key: string;
  workspace_id?: string | null;
  title_card_id: string;
  promotion_gate_check_id: string;
  promotion_gate_check_ref: TopicSelectionFunctionalRef;
  promotion_input_snapshot_id: string;
  promotion_input_snapshot_hash: string;
  decision: TopicSelectionHumanPromotionDecisionKind;
  decision_class: TopicSelectionPromotionDecisionClass;
  actor: TopicSelectionActorRef;
  decision_timestamp: string;
  confirmed_snapshot_hash: string;
  rationale: string;
  conditions: TopicSelectionPromotionCondition[];
  required_actions: TopicSelectionPromotionGateRequiredAction[];
  loopback_target?: TopicSelectionPromotionLoopbackTarget | null;
  loopback_refs: TopicSelectionFunctionalRef[];
  accepted_risk_refs: TopicSelectionFunctionalRef[];
  allowed_refinements: TopicSelectionAllowedPromotionRefinement[];
  stop_conditions: TopicSelectionPromotionStopOrReopenCondition[];
  reopen_conditions: TopicSelectionPromotionStopOrReopenCondition[];
  source_refs: TopicSelectionFunctionalRef[];
  input_snapshot_id?: string | null;
  workflow_run_id?: string | null;
  gate_result_id?: string | null;
  transition_attempt_id?: string | null;
  trace_snapshot_id?: string | null;
  artifact_refs: TopicSelectionFunctionalRef[];
  policy_version_id?: string | null;
  created_at: string;
}

/**
 * T-128 W-13: marks a promotion decision whose CONTENT was drafted by a delegated agent (codex_assisted) rather
 * than authored by the human. The human still AUTHORIZED it — admission enforces `human_actor.actor_type==='human'`
 * — so this is a provenance/audit marker, never an authority bypass; its presence is what makes a delegated-drafted
 * decision distinguishable from a fully-human one (non-impersonation).
 */
export interface TopicSelectionDelegatedDecisionProvenance {
  source: 'codex_delegated';
  /** The N4 delegated-promotion admission identity hash — ties the decision content to the runtime-verified candidate. */
  admission_identity_hash: string;
}

export interface TopicSelectionPromotionDecisionRecord {
  promotion_decision_id: string;
  promotion_decision_status: TopicSelectionPromotionDecisionStatus;
  current_promotion_input_snapshot_key?: string | null;
  human_promotion_decision_id: string;
  human_confirmed_decision_id: string;
  workspace_id?: string | null;
  title_card_id: string;
  promotion_gate_check_id: string;
  promotion_input_snapshot_id: string;
  promotion_input_snapshot_hash: string;
  gate_disposition: TopicSelectionPromotionGateDisposition;
  decision: TopicSelectionHumanPromotionDecisionKind;
  decision_class: TopicSelectionPromotionDecisionClass;
  bridge_eligible: boolean;
  promotion_commitment_profile_id?: string | null;
  loopback_target?: TopicSelectionPromotionLoopbackTarget | null;
  required_actions: TopicSelectionPromotionGateRequiredAction[];
  accepted_risk_refs: TopicSelectionFunctionalRef[];
  conditions: TopicSelectionPromotionCondition[];
  source_refs: TopicSelectionFunctionalRef[];
  snapshot_hashes: TopicSelectionPromotionGateHandoff['snapshot_hashes'];
  artifact_refs: TopicSelectionFunctionalRef[];
  /** Present iff the decision content was drafted by a delegated agent (T-128 W-13); absent on a fully-human decision. */
  delegated_decision_provenance?: TopicSelectionDelegatedDecisionProvenance | null;
  created_at: string;
}

export interface TopicSelectionPromotionCommitmentProfileRecord {
  promotion_commitment_profile_id: string;
  promotion_decision_id: string;
  human_promotion_decision_id: string;
  human_confirmed_decision_id: string;
  workspace_id?: string | null;
  title_card_id: string;
  promotion_gate_check_id: string;
  promotion_input_snapshot_id: string;
  promotion_input_snapshot_hash: string;
  topic_package_id: string;
  package_version: string;
  scope: Record<string, unknown>;
  claim_ceiling: string;
  prohibited_claims: string[];
  accepted_risk_refs: TopicSelectionFunctionalRef[];
  conditions: TopicSelectionPromotionCondition[];
  allowed_refinements: TopicSelectionAllowedPromotionRefinement[];
  early_check_obligations: string[];
  stop_conditions: TopicSelectionPromotionStopOrReopenCondition[];
  reopen_conditions: TopicSelectionPromotionStopOrReopenCondition[];
  source_refs: TopicSelectionFunctionalRef[];
  snapshot_hashes: TopicSelectionPromotionGateHandoff['snapshot_hashes'];
  artifact_refs: TopicSelectionFunctionalRef[];
  created_at: string;
}

export interface TopicSelectionPromotionDecisionBundle {
  human_promotion_decision: TopicSelectionHumanPromotionDecisionRecord;
  promotion_decision: TopicSelectionPromotionDecisionRecord;
  promotion_commitment_profile?: TopicSelectionPromotionCommitmentProfileRecord | null;
}

export interface TopicSelectionPromotionBridgeHandoff {
  promotion_decision_id: string;
  promotion_decision_ref: TopicSelectionFunctionalRef;
  human_promotion_decision_ref: TopicSelectionFunctionalRef;
  human_confirmed_decision_ref: TopicSelectionFunctionalRef;
  promotion_commitment_profile_ref: TopicSelectionFunctionalRef;
  promotion_gate_check_ref: TopicSelectionFunctionalRef;
  promotion_input_snapshot_id: string;
  promotion_input_snapshot_ref: TopicSelectionFunctionalRef;
  promotion_input_snapshot_hash: string;
  topic_package_id: string;
  package_version: string;
  decision: TopicSelectionPromoteClassDecision;
  promotion_decision_status: 'current';
  conditions: TopicSelectionPromotionCondition[];
  accepted_risk_refs: TopicSelectionFunctionalRef[];
  allowed_refinements: TopicSelectionAllowedPromotionRefinement[];
  early_check_obligations: string[];
  stop_conditions: TopicSelectionPromotionStopOrReopenCondition[];
  reopen_conditions: TopicSelectionPromotionStopOrReopenCondition[];
  source_refs: TopicSelectionFunctionalRef[];
  snapshot_hashes: TopicSelectionPromotionGateHandoff['snapshot_hashes'];
  artifact_refs: TopicSelectionFunctionalRef[];
  human_promotion_decision: TopicSelectionHumanPromotionDecisionRecord;
  promotion_decision: TopicSelectionPromotionDecisionRecord;
  promotion_commitment_profile: TopicSelectionPromotionCommitmentProfileRecord;
}

export const TOPIC_SELECTION_V1C_DELEGATED_PROMOTION_DECISION_CANDIDATE_SCHEMA_VERSION =
  'TopicSelectionV1cDelegatedPromotionDecisionCandidate@v1' as const;

export interface TopicSelectionV1cDelegatedPromotionDecisionCandidate {
  schema_version: typeof TOPIC_SELECTION_V1C_DELEGATED_PROMOTION_DECISION_CANDIDATE_SCHEMA_VERSION;
  promotion_gate_check_id: string;
  promotion_input_snapshot_id: string;
  promotion_input_snapshot_hash: string;
  workspace_id?: string | null;
  title_card_id: string;
  decision: TopicSelectionHumanPromotionDecisionKind;
  rationale: string;
  confirmed_snapshot_hash: string;
  conditions: TopicSelectionPromotionCondition[];
  required_actions: TopicSelectionPromotionGateRequiredAction[];
  loopback_target: TopicSelectionPromotionLoopbackTarget | null;
  allowed_refinements: TopicSelectionAllowedPromotionRefinement[];
  stop_conditions: TopicSelectionPromotionStopOrReopenCondition[];
  reopen_conditions: TopicSelectionPromotionStopOrReopenCondition[];
  cited_refs: TopicSelectionFunctionalRef[];
  decision_support_refs: TopicSelectionFunctionalRef[];
  no_authority_write_confirmed: true;
  no_bridge_creation_confirmed: true;
  human_review_required: true;
}

export type HumanPromotionDecisionRecord = TopicSelectionHumanPromotionDecisionRecord;
export type PromotionDecisionRecord = TopicSelectionPromotionDecisionRecord;
export type PromotionCommitmentProfileRecord = TopicSelectionPromotionCommitmentProfileRecord;
export type PromotionDecisionBundle = TopicSelectionPromotionDecisionBundle;
export type PromotionBridgeHandoff = TopicSelectionPromotionBridgeHandoff;
export type DelegatedPromotionDecisionCandidate =
  TopicSelectionV1cDelegatedPromotionDecisionCandidate;
export type PromotionDecision = TopicSelectionHumanPromotionDecisionKind;
export type PromotionDecisionStatus = TopicSelectionPromotionDecisionStatus;
export type PromotionDecisionClass = TopicSelectionPromotionDecisionClass;
export type PromotionLoopbackTarget = TopicSelectionPromotionLoopbackTarget;

const stringId = { type: 'string', minLength: 1 } as const;
const nullableStringId = { anyOf: [stringId, { type: 'null' }] } as const;
const objectPayload = { type: 'object', additionalProperties: true } as const;
const requiredActorRefSchema = {
  allOf: [
    topicSelectionActorRefSchema,
    {
      type: 'object',
      required: ['actor_id'],
      properties: {
        actor_id: stringId,
      },
    },
  ],
} as const;
const stringArray = { type: 'array', items: stringId } as const;
const nonEmptyStringArray = { type: 'array', items: stringId, minItems: 1 } as const;
const functionalRefArray = { type: 'array', items: topicSelectionFunctionalRefSchema } as const;
const nonEmptyFunctionalRefArray = {
  type: 'array',
  items: topicSelectionFunctionalRefSchema,
  minItems: 1,
} as const;
const requiredActionArray = {
  type: 'array',
  items: topicSelectionPromotionGateRequiredActionSchema,
} as const;

export const topicSelectionPromotionAllowedRefinementSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['refinement_code', 'scope', 'refs'],
  properties: {
    refinement_code: stringId,
    scope: stringId,
    refs: functionalRefArray,
    reason: nullableStringId,
  },
} as const;

export const topicSelectionPromotionStopOrReopenConditionSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['condition_code', 'reason', 'refs'],
  properties: {
    condition_code: stringId,
    reason: stringId,
    refs: functionalRefArray,
  },
} as const;

export const topicSelectionPromotionConditionSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'condition_id',
    'condition_code',
    'owner',
    'required_action',
    'refs',
    'early_check_obligations',
  ],
  properties: {
    condition_id: stringId,
    condition_code: stringId,
    owner: requiredActorRefSchema,
    required_action: topicSelectionPromotionGateRequiredActionSchema,
    refs: nonEmptyFunctionalRefArray,
    early_check_obligations: nonEmptyStringArray,
    verification_note: nullableStringId,
  },
} as const;

const promotionConditionArray = {
  type: 'array',
  items: topicSelectionPromotionConditionSchema,
} as const;
const allowedRefinementArray = {
  type: 'array',
  items: topicSelectionPromotionAllowedRefinementSchema,
} as const;
const stopOrReopenConditionArray = {
  type: 'array',
  items: topicSelectionPromotionStopOrReopenConditionSchema,
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
const nullableLoopbackTarget = {
  anyOf: [
    { enum: [...TOPIC_SELECTION_PROMOTION_LOOPBACK_TARGETS] },
    { type: 'null' },
  ],
} as const;

export const topicSelectionV1cDelegatedPromotionDecisionCandidateSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'promotion_gate_check_id',
    'promotion_input_snapshot_id',
    'promotion_input_snapshot_hash',
    'title_card_id',
    'decision',
    'rationale',
    'confirmed_snapshot_hash',
    'conditions',
    'required_actions',
    'loopback_target',
    'allowed_refinements',
    'stop_conditions',
    'reopen_conditions',
    'cited_refs',
    'decision_support_refs',
    'no_authority_write_confirmed',
    'no_bridge_creation_confirmed',
    'human_review_required',
  ],
  properties: {
    schema_version: {
      const: TOPIC_SELECTION_V1C_DELEGATED_PROMOTION_DECISION_CANDIDATE_SCHEMA_VERSION,
    },
    promotion_gate_check_id: stringId,
    promotion_input_snapshot_id: stringId,
    promotion_input_snapshot_hash: stringId,
    workspace_id: nullableStringId,
    title_card_id: stringId,
    decision: { enum: [...TOPIC_SELECTION_HUMAN_PROMOTION_DECISIONS] },
    rationale: stringId,
    confirmed_snapshot_hash: stringId,
    conditions: promotionConditionArray,
    required_actions: requiredActionArray,
    loopback_target: nullableLoopbackTarget,
    allowed_refinements: allowedRefinementArray,
    stop_conditions: stopOrReopenConditionArray,
    reopen_conditions: stopOrReopenConditionArray,
    cited_refs: functionalRefArray,
    decision_support_refs: functionalRefArray,
    no_authority_write_confirmed: { const: true },
    no_bridge_creation_confirmed: { const: true },
    human_review_required: { const: true },
  },
  allOf: [
    {
      if: { properties: { decision: { enum: ['promote_with_conditions'] } } },
      then: {
        properties: {
          conditions: {
            type: 'array',
            items: topicSelectionPromotionConditionSchema,
            minItems: 1,
          },
          loopback_target: { const: null },
        },
      },
    },
    {
      if: { properties: { decision: { enum: ['promote_to_paper_project'] } } },
      then: {
        properties: {
          conditions: {
            type: 'array',
            items: topicSelectionPromotionConditionSchema,
            maxItems: 0,
          },
          loopback_target: { const: null },
        },
      },
    },
    {
      if: { properties: { decision: { enum: [...TOPIC_SELECTION_NON_PROMOTE_DECISIONS] } } },
      then: {
        properties: {
          conditions: {
            type: 'array',
            items: topicSelectionPromotionConditionSchema,
            maxItems: 0,
          },
          loopback_target: { enum: [...TOPIC_SELECTION_PROMOTION_LOOPBACK_TARGETS] },
        },
      },
    },
  ],
} as const;

export const topicSelectionHumanPromotionDecisionRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'human_promotion_decision_id',
    'human_confirmed_decision_id',
    'human_promotion_decision_key',
    'title_card_id',
    'promotion_gate_check_id',
    'promotion_gate_check_ref',
    'promotion_input_snapshot_id',
    'promotion_input_snapshot_hash',
    'decision',
    'decision_class',
    'actor',
    'decision_timestamp',
    'confirmed_snapshot_hash',
    'rationale',
    'conditions',
    'required_actions',
    'loopback_refs',
    'accepted_risk_refs',
    'allowed_refinements',
    'stop_conditions',
    'reopen_conditions',
    'source_refs',
    'artifact_refs',
    'created_at',
  ],
  properties: {
    human_promotion_decision_id: stringId,
    human_confirmed_decision_id: stringId,
    human_promotion_decision_key: stringId,
    workspace_id: nullableStringId,
    title_card_id: stringId,
    promotion_gate_check_id: stringId,
    promotion_gate_check_ref: topicSelectionFunctionalRefSchema,
    promotion_input_snapshot_id: stringId,
    promotion_input_snapshot_hash: stringId,
    decision: { enum: [...TOPIC_SELECTION_HUMAN_PROMOTION_DECISIONS] },
    decision_class: { enum: [...TOPIC_SELECTION_PROMOTION_DECISION_CLASSES] },
    actor: topicSelectionActorRefSchema,
    decision_timestamp: stringId,
    confirmed_snapshot_hash: stringId,
    rationale: stringId,
    conditions: promotionConditionArray,
    required_actions: requiredActionArray,
    loopback_target: nullableLoopbackTarget,
    loopback_refs: functionalRefArray,
    accepted_risk_refs: functionalRefArray,
    allowed_refinements: allowedRefinementArray,
    stop_conditions: stopOrReopenConditionArray,
    reopen_conditions: stopOrReopenConditionArray,
    source_refs: functionalRefArray,
    input_snapshot_id: nullableStringId,
    workflow_run_id: nullableStringId,
    gate_result_id: nullableStringId,
    transition_attempt_id: nullableStringId,
    trace_snapshot_id: nullableStringId,
    artifact_refs: functionalRefArray,
    policy_version_id: nullableStringId,
    created_at: stringId,
  },
  allOf: [
    {
      if: { properties: { decision: { enum: ['promote_with_conditions'] } } },
      then: {
        properties: {
          conditions: {
            type: 'array',
            items: topicSelectionPromotionConditionSchema,
            minItems: 1,
          },
        },
      },
    },
    {
      if: { properties: { decision: { enum: ['promote_to_paper_project'] } } },
      then: {
        properties: {
          conditions: {
            type: 'array',
            items: topicSelectionPromotionConditionSchema,
            maxItems: 0,
          },
        },
      },
    },
    {
      if: { properties: { decision_class: { enum: ['non_promote'] } } },
      then: {
        required: ['loopback_target'],
        properties: {
          loopback_target: { enum: [...TOPIC_SELECTION_PROMOTION_LOOPBACK_TARGETS] },
          required_actions: {
            type: 'array',
            items: topicSelectionPromotionGateRequiredActionSchema,
            minItems: 1,
          },
        },
      },
    },
  ],
} as const;

export const topicSelectionDelegatedDecisionProvenanceSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['source', 'admission_identity_hash'],
  properties: {
    source: { enum: ['codex_delegated'] },
    admission_identity_hash: stringId,
  },
} as const;

export const topicSelectionPromotionDecisionRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'promotion_decision_id',
    'promotion_decision_status',
    'human_promotion_decision_id',
    'human_confirmed_decision_id',
    'title_card_id',
    'promotion_gate_check_id',
    'promotion_input_snapshot_id',
    'promotion_input_snapshot_hash',
    'gate_disposition',
    'decision',
    'decision_class',
    'bridge_eligible',
    'required_actions',
    'accepted_risk_refs',
    'conditions',
    'source_refs',
    'snapshot_hashes',
    'artifact_refs',
    'created_at',
  ],
  properties: {
    promotion_decision_id: stringId,
    promotion_decision_status: { enum: [...TOPIC_SELECTION_PROMOTION_DECISION_STATUSES] },
    current_promotion_input_snapshot_key: nullableStringId,
    human_promotion_decision_id: stringId,
    human_confirmed_decision_id: stringId,
    workspace_id: nullableStringId,
    title_card_id: stringId,
    promotion_gate_check_id: stringId,
    promotion_input_snapshot_id: stringId,
    promotion_input_snapshot_hash: stringId,
    gate_disposition: { enum: ['ready_for_human_decision', 'blocked', 'needs_revision', 'recheck_required', 'park'] },
    decision: { enum: [...TOPIC_SELECTION_HUMAN_PROMOTION_DECISIONS] },
    decision_class: { enum: [...TOPIC_SELECTION_PROMOTION_DECISION_CLASSES] },
    bridge_eligible: { type: 'boolean' },
    promotion_commitment_profile_id: nullableStringId,
    loopback_target: nullableLoopbackTarget,
    required_actions: requiredActionArray,
    accepted_risk_refs: functionalRefArray,
    conditions: promotionConditionArray,
    source_refs: functionalRefArray,
    snapshot_hashes: snapshotHashesSchema,
    artifact_refs: functionalRefArray,
    delegated_decision_provenance: { anyOf: [topicSelectionDelegatedDecisionProvenanceSchema, { type: 'null' }] },
    created_at: stringId,
  },
  allOf: [
    {
      if: { properties: { bridge_eligible: { enum: [true] } } },
      then: {
        required: ['promotion_commitment_profile_id'],
        properties: {
          decision_class: { enum: ['promote'] },
          decision: { enum: [...TOPIC_SELECTION_PROMOTE_CLASS_DECISIONS] },
          promotion_decision_status: { enum: ['current'] },
          promotion_commitment_profile_id: stringId,
        },
      },
    },
    {
      if: { properties: { decision_class: { enum: ['non_promote'] } } },
      then: {
        required: ['loopback_target'],
        properties: {
          bridge_eligible: { enum: [false] },
          loopback_target: { enum: [...TOPIC_SELECTION_PROMOTION_LOOPBACK_TARGETS] },
          required_actions: {
            type: 'array',
            items: topicSelectionPromotionGateRequiredActionSchema,
            minItems: 1,
          },
        },
      },
    },
  ],
} as const;

export const topicSelectionPromotionCommitmentProfileRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'promotion_commitment_profile_id',
    'promotion_decision_id',
    'human_promotion_decision_id',
    'human_confirmed_decision_id',
    'title_card_id',
    'promotion_gate_check_id',
    'promotion_input_snapshot_id',
    'promotion_input_snapshot_hash',
    'topic_package_id',
    'package_version',
    'scope',
    'claim_ceiling',
    'prohibited_claims',
    'accepted_risk_refs',
    'conditions',
    'allowed_refinements',
    'early_check_obligations',
    'stop_conditions',
    'reopen_conditions',
    'source_refs',
    'snapshot_hashes',
    'artifact_refs',
    'created_at',
  ],
  properties: {
    promotion_commitment_profile_id: stringId,
    promotion_decision_id: stringId,
    human_promotion_decision_id: stringId,
    human_confirmed_decision_id: stringId,
    workspace_id: nullableStringId,
    title_card_id: stringId,
    promotion_gate_check_id: stringId,
    promotion_input_snapshot_id: stringId,
    promotion_input_snapshot_hash: stringId,
    topic_package_id: stringId,
    package_version: stringId,
    scope: objectPayload,
    claim_ceiling: stringId,
    prohibited_claims: stringArray,
    accepted_risk_refs: functionalRefArray,
    conditions: promotionConditionArray,
    allowed_refinements: allowedRefinementArray,
    early_check_obligations: stringArray,
    stop_conditions: stopOrReopenConditionArray,
    reopen_conditions: stopOrReopenConditionArray,
    source_refs: functionalRefArray,
    snapshot_hashes: snapshotHashesSchema,
    artifact_refs: functionalRefArray,
    created_at: stringId,
  },
} as const;

export const topicSelectionPromotionDecisionBundleSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'human_promotion_decision',
    'promotion_decision',
  ],
  properties: {
    human_promotion_decision: topicSelectionHumanPromotionDecisionRecordSchema,
    promotion_decision: topicSelectionPromotionDecisionRecordSchema,
    promotion_commitment_profile: {
      anyOf: [topicSelectionPromotionCommitmentProfileRecordSchema, { type: 'null' }],
    },
  },
} as const;

const topicSelectionBridgeEligiblePromotionDecisionRecordSchema = {
  ...topicSelectionPromotionDecisionRecordSchema,
  required: [
    ...topicSelectionPromotionDecisionRecordSchema.required,
    'promotion_commitment_profile_id',
  ],
  properties: {
    ...topicSelectionPromotionDecisionRecordSchema.properties,
    promotion_decision_status: { enum: ['current'] },
    decision: { enum: [...TOPIC_SELECTION_PROMOTE_CLASS_DECISIONS] },
    decision_class: { enum: ['promote'] },
    bridge_eligible: { enum: [true] },
    promotion_commitment_profile_id: stringId,
  },
} as const;

export const topicSelectionPromotionBridgeHandoffSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'promotion_decision_id',
    'promotion_decision_ref',
    'human_promotion_decision_ref',
    'human_confirmed_decision_ref',
    'promotion_commitment_profile_ref',
    'promotion_gate_check_ref',
    'promotion_input_snapshot_id',
    'promotion_input_snapshot_ref',
    'promotion_input_snapshot_hash',
    'topic_package_id',
    'package_version',
    'decision',
    'promotion_decision_status',
    'conditions',
    'accepted_risk_refs',
    'allowed_refinements',
    'early_check_obligations',
    'stop_conditions',
    'reopen_conditions',
    'source_refs',
    'snapshot_hashes',
    'artifact_refs',
    'human_promotion_decision',
    'promotion_decision',
    'promotion_commitment_profile',
  ],
  properties: {
    promotion_decision_id: stringId,
    promotion_decision_ref: topicSelectionFunctionalRefSchema,
    human_promotion_decision_ref: topicSelectionFunctionalRefSchema,
    human_confirmed_decision_ref: topicSelectionFunctionalRefSchema,
    promotion_commitment_profile_ref: topicSelectionFunctionalRefSchema,
    promotion_gate_check_ref: topicSelectionFunctionalRefSchema,
    promotion_input_snapshot_id: stringId,
    promotion_input_snapshot_ref: topicSelectionFunctionalRefSchema,
    promotion_input_snapshot_hash: stringId,
    topic_package_id: stringId,
    package_version: stringId,
    decision: { enum: [...TOPIC_SELECTION_PROMOTE_CLASS_DECISIONS] },
    promotion_decision_status: { enum: ['current'] },
    conditions: promotionConditionArray,
    accepted_risk_refs: functionalRefArray,
    allowed_refinements: allowedRefinementArray,
    early_check_obligations: stringArray,
    stop_conditions: stopOrReopenConditionArray,
    reopen_conditions: stopOrReopenConditionArray,
    source_refs: functionalRefArray,
    snapshot_hashes: snapshotHashesSchema,
    artifact_refs: functionalRefArray,
    human_promotion_decision: topicSelectionHumanPromotionDecisionRecordSchema,
    promotion_decision: topicSelectionBridgeEligiblePromotionDecisionRecordSchema,
    promotion_commitment_profile: topicSelectionPromotionCommitmentProfileRecordSchema,
    gate_handoff: topicSelectionPromotionGateHandoffSchema,
  },
} as const;
