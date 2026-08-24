// Topic-selection v1c + downstream semantic node policies (T-089 structural hardening slice ②).
//
// v1c has no WorkflowHarness/run-coordinator (T-128 D-T128-00: v1c N2/N4 runtime/admission do not
// call invokeNode), so unlike v1a/v1b there is no runtime policy registry to re-export. This file
// is the structured code authority for the SEMANTIC classification columns of the SSOT matrix
// (docs/context/process/topic-selection-workflow-matrix.md) — consumed by
// apps/backend/scripts/topic-selection-workflow-matrix-consistency.mjs to machine-check matrix drift.
//
// Values were derived from the matrix rows verified against implementations by T-128 W-08
// (2026-07-02 live-surface classification) and cross-checked against the v1c runtime services
// (n2 bounded debate runtime, n4 human promotion decision, n6 feedback normalization candidate).
// Changing a value here without updating the matrix (or vice versa) fails the default backend
// suite via the consistency wrapper test.

import { TOPIC_SELECTION_DOWNSTREAM_NODE_ID, TOPIC_SELECTION_V1C_NODE_ID } from './topic-selection-v1c-node-ids.js';

export const TOPIC_SELECTION_V1C_NODE_POLICY_EXECUTOR_KINDS = [
  'deterministic',
  'single_agent',
  'human_review',
] as const;
export type TopicSelectionV1cNodePolicyExecutorKind =
  (typeof TOPIC_SELECTION_V1C_NODE_POLICY_EXECUTOR_KINDS)[number];

export const TOPIC_SELECTION_V1C_NODE_POLICY_DEFAULT_EXECUTION_MODES = [
  'none',
  'codex_assisted',
  'human',
] as const;
export type TopicSelectionV1cNodePolicyDefaultExecutionMode =
  (typeof TOPIC_SELECTION_V1C_NODE_POLICY_DEFAULT_EXECUTION_MODES)[number];

export const TOPIC_SELECTION_V1C_NODE_POLICY_DEBATE_PRIMITIVES = [
  'none',
  'bounded_sequence',
] as const;
export type TopicSelectionV1cNodePolicyDebatePrimitive =
  (typeof TOPIC_SELECTION_V1C_NODE_POLICY_DEBATE_PRIMITIVES)[number];

export interface TopicSelectionV1cNodePolicy {
  node_index: number;
  node_id: string;
  authority_kind: string;
  executor_kind: TopicSelectionV1cNodePolicyExecutorKind;
  default_execution_mode: TopicSelectionV1cNodePolicyDefaultExecutionMode;
  codex_allowed: boolean;
  provider_required: boolean;
  debate_allowed: boolean;
  debate_primitive: TopicSelectionV1cNodePolicyDebatePrimitive;
  human_review_required: boolean;
  human_delegated_allowed: boolean;
}

export const TOPIC_SELECTION_V1C_NODE_POLICIES = [
  {
    node_index: 1,
    node_id: TOPIC_SELECTION_V1C_NODE_ID.n1_create_promotion_input_snapshot,
    authority_kind: 'PromotionInputSnapshot',
    executor_kind: 'deterministic',
    default_execution_mode: 'none',
    codex_allowed: false,
    provider_required: false,
    debate_allowed: false,
    debate_primitive: 'none',
    human_review_required: false,
    human_delegated_allowed: false,
  },
  {
    node_index: 2,
    node_id: TOPIC_SELECTION_V1C_NODE_ID.n2_generate_promotion_support,
    authority_kind: 'PromotionDecisionSupport',
    executor_kind: 'single_agent',
    default_execution_mode: 'codex_assisted',
    codex_allowed: true,
    provider_required: false,
    debate_allowed: true,
    // Implemented bounded micro-debate: promotion_supporter_draft -> reviewer_critic_review ->
    // promotion_supporter_repair -> synthesizer_final (gated prompt bodies: T-129 C-2).
    debate_primitive: 'bounded_sequence',
    human_review_required: false,
    human_delegated_allowed: false,
  },
  {
    node_index: 3,
    node_id: TOPIC_SELECTION_V1C_NODE_ID.n3_run_promotion_gate,
    authority_kind: 'PromotionGateCheck',
    executor_kind: 'deterministic',
    default_execution_mode: 'none',
    codex_allowed: false,
    provider_required: false,
    debate_allowed: false,
    debate_primitive: 'none',
    human_review_required: false,
    human_delegated_allowed: false,
  },
  {
    node_index: 4,
    node_id: TOPIC_SELECTION_V1C_NODE_ID.n4_record_human_promotion_decision,
    authority_kind: 'PromotionDecision',
    executor_kind: 'human_review',
    default_execution_mode: 'human',
    codex_allowed: true,
    provider_required: false,
    debate_allowed: false,
    debate_primitive: 'none',
    human_review_required: true,
    human_delegated_allowed: true,
  },
  {
    node_index: 5,
    node_id: TOPIC_SELECTION_V1C_NODE_ID.n5_create_paper_project_bridge,
    authority_kind: 'PaperProjectBridge',
    executor_kind: 'deterministic',
    default_execution_mode: 'none',
    codex_allowed: false,
    provider_required: false,
    debate_allowed: false,
    debate_primitive: 'none',
    human_review_required: false,
    human_delegated_allowed: false,
  },
  {
    node_index: 6,
    node_id: TOPIC_SELECTION_V1C_NODE_ID.n6_downstream_feedback_recheck,
    authority_kind: 'DownstreamTopicFeedback',
    executor_kind: 'deterministic',
    default_execution_mode: 'none',
    // Feedback normalization runtime is a codex-assisted candidate path (record-only authority).
    codex_allowed: true,
    provider_required: false,
    debate_allowed: false,
    debate_primitive: 'none',
    human_review_required: false,
    human_delegated_allowed: false,
  },
] as const satisfies readonly TopicSelectionV1cNodePolicy[];

export const TOPIC_SELECTION_DOWNSTREAM_NODE_POLICIES = [
  {
    node_index: 1,
    node_id: TOPIC_SELECTION_DOWNSTREAM_NODE_ID.paper_project_intake,
    authority_kind: 'PaperProjectIntake',
    executor_kind: 'deterministic',
    default_execution_mode: 'none',
    codex_allowed: false,
    provider_required: false,
    debate_allowed: false,
    debate_primitive: 'none',
    human_review_required: false,
    human_delegated_allowed: false,
  },
] as const satisfies readonly TopicSelectionV1cNodePolicy[];

export function findTopicSelectionV1cNodePolicy(nodeId: string): TopicSelectionV1cNodePolicy | null {
  return (
    TOPIC_SELECTION_V1C_NODE_POLICIES.find((policy) => policy.node_id === nodeId)
    ?? TOPIC_SELECTION_DOWNSTREAM_NODE_POLICIES.find((policy) => policy.node_id === nodeId)
    ?? null
  );
}

export const topicSelectionV1cNodePolicySchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'node_index',
    'node_id',
    'authority_kind',
    'executor_kind',
    'default_execution_mode',
    'codex_allowed',
    'provider_required',
    'debate_allowed',
    'debate_primitive',
    'human_review_required',
    'human_delegated_allowed',
  ],
  properties: {
    node_index: { type: 'integer', minimum: 1, maximum: 6 },
    node_id: { type: 'string', minLength: 1 },
    authority_kind: { type: 'string', minLength: 1 },
    executor_kind: { enum: [...TOPIC_SELECTION_V1C_NODE_POLICY_EXECUTOR_KINDS] },
    default_execution_mode: { enum: [...TOPIC_SELECTION_V1C_NODE_POLICY_DEFAULT_EXECUTION_MODES] },
    codex_allowed: { type: 'boolean' },
    provider_required: { type: 'boolean' },
    debate_allowed: { type: 'boolean' },
    debate_primitive: { enum: [...TOPIC_SELECTION_V1C_NODE_POLICY_DEBATE_PRIMITIVES] },
    human_review_required: { type: 'boolean' },
    human_delegated_allowed: { type: 'boolean' },
  },
} as const;

export const topicSelectionV1cNodePolicyRegistrySchema = {
  type: 'array',
  items: topicSelectionV1cNodePolicySchema,
  minItems: 1,
} as const;
