// Topic-selection v1a + resource-sampling semantic node policies (T-089 backlog ①尾巴), plus the
// v1b four-column semantic supplement (2026-07-07, see section comment below).
//
// Counterpart of topic-selection-v1c-node-policy-contracts.ts for the two stages that previously
// had NO structured code authority for the SSOT matrix semantic columns. Unlike v1c (boolean
// debate_allowed), these stages carry the FULL matrix vocabulary (composite executor kinds,
// 'conditional' debate, 'reserved' primitive), so every column is an exact leading-token string —
// the consistency script compares matrix leading tokens against these values by strict equality.
//
// v1a node ids must stay in lockstep with TOPIC_SELECTION_V1A_WORKFLOW_HARNESS_NODE_IDS (schema
// test pins set equality). The resource-sampling node id is duplicated from
// apps/backend/src/services/topic-selection-resource-sampling-service.ts (shared cannot import
// backend); the consistency script cross-checks the two literals.
//
// Values transcribed 2026-07-06 from the W-08-verified matrix rows
// (docs/context/process/topic-selection-workflow-matrix.md) and cross-checked against runtime
// reality (v1a N1-N9 harness node policies, N6 debate loop, N8 human confirmation semantic review).

export const TOPIC_SELECTION_SEMANTIC_EXECUTOR_KINDS = [
  'deterministic',
  'single_agent',
  'single_agent_semantic_extraction',
  'human_review',
] as const;
export type TopicSelectionSemanticExecutorKind = (typeof TOPIC_SELECTION_SEMANTIC_EXECUTOR_KINDS)[number];

export const TOPIC_SELECTION_SEMANTIC_DEFAULT_EXECUTION_MODES = [
  'none',
  'codex_assisted',
  'codex_assisted_semantic_review',
] as const;
export type TopicSelectionSemanticDefaultExecutionMode =
  (typeof TOPIC_SELECTION_SEMANTIC_DEFAULT_EXECUTION_MODES)[number];

export const TOPIC_SELECTION_SEMANTIC_TRISTATE = ['no', 'yes', 'conditional'] as const;
export type TopicSelectionSemanticTristate = (typeof TOPIC_SELECTION_SEMANTIC_TRISTATE)[number];

export const TOPIC_SELECTION_SEMANTIC_DEBATE_PRIMITIVES = [
  'none',
  'divergent_loop',
  'bounded_sequence',
  'reserved',
] as const;
export type TopicSelectionSemanticDebatePrimitive =
  (typeof TOPIC_SELECTION_SEMANTIC_DEBATE_PRIMITIVES)[number];

export interface TopicSelectionNodeSemanticPolicy {
  node_index: number;
  node_id: string;
  authority_kind: string;
  executor_kind: TopicSelectionSemanticExecutorKind;
  default_execution_mode: TopicSelectionSemanticDefaultExecutionMode;
  codex_allowed: TopicSelectionSemanticTristate;
  provider_required: TopicSelectionSemanticTristate;
  debate_allowed: TopicSelectionSemanticTristate;
  debate_primitive: TopicSelectionSemanticDebatePrimitive;
  human_review_required: TopicSelectionSemanticTristate;
  human_delegated_allowed: TopicSelectionSemanticTristate;
}

export const TOPIC_SELECTION_V1A_NODE_SEMANTIC_POLICIES = [
  {
    node_index: 1,
    node_id: 'topic-selection.v1a.create-topic-seed.v1',
    authority_kind: 'TopicSelectionTopicSeed',
    executor_kind: 'deterministic',
    default_execution_mode: 'none',
    codex_allowed: 'no',
    provider_required: 'no',
    debate_allowed: 'no',
    debate_primitive: 'none',
    human_review_required: 'no',
    human_delegated_allowed: 'no',
  },
  {
    node_index: 2,
    node_id: 'topic-selection.v1a.snapshot-literature-resource-pool.v1',
    authority_kind: 'TopicSelectionLiteratureResourcePoolSnapshot',
    executor_kind: 'deterministic',
    default_execution_mode: 'none',
    codex_allowed: 'no',
    provider_required: 'no',
    debate_allowed: 'no',
    debate_primitive: 'none',
    human_review_required: 'no',
    human_delegated_allowed: 'no',
  },
  {
    node_index: 3,
    node_id: 'topic-selection.v1a.create-search-plan.v1',
    authority_kind: 'TopicSelectionSearchPlan',
    executor_kind: 'deterministic',
    default_execution_mode: 'none',
    codex_allowed: 'no',
    provider_required: 'no',
    debate_allowed: 'no',
    debate_primitive: 'none',
    human_review_required: 'no',
    human_delegated_allowed: 'no',
  },
  {
    node_index: 4,
    node_id: 'topic-selection.v1a.record-search-run.v1',
    authority_kind: 'TopicSelectionSearchRun',
    executor_kind: 'deterministic',
    default_execution_mode: 'none',
    codex_allowed: 'no',
    provider_required: 'no',
    debate_allowed: 'no',
    debate_primitive: 'none',
    human_review_required: 'no',
    human_delegated_allowed: 'no',
  },
  {
    node_index: 5,
    node_id: 'topic-selection.v1a.build-evidence-map.v1',
    authority_kind: 'TopicSelectionEvidenceMap',
    // Matrix leading token of 'single_agent_semantic_extraction + deterministic_gate'.
    executor_kind: 'single_agent_semantic_extraction',
    // 'none (caller-supplied draft; model 提取为显式升级, 见 DMP-12)'.
    default_execution_mode: 'none',
    codex_allowed: 'yes',
    provider_required: 'no',
    debate_allowed: 'no',
    debate_primitive: 'none',
    human_review_required: 'no',
    human_delegated_allowed: 'no',
  },
  {
    node_index: 6,
    node_id: 'topic-selection.v1a.generate-need-candidate.v1',
    authority_kind: 'NeedCandidate',
    executor_kind: 'single_agent',
    default_execution_mode: 'codex_assisted',
    codex_allowed: 'yes',
    provider_required: 'no',
    debate_allowed: 'yes',
    // Implemented divergent loop; supplemental rounds 2/3 via bounded auto-chain (D-29) or caller re-entry.
    debate_primitive: 'divergent_loop',
    human_review_required: 'no',
    human_delegated_allowed: 'no',
  },
  {
    node_index: 7,
    node_id: 'topic-selection.v1a.validate-need-adjudication.v1',
    authority_kind: 'ValidateNeedAdjudicationResult',
    executor_kind: 'single_agent',
    default_execution_mode: 'codex_assisted',
    codex_allowed: 'yes',
    provider_required: 'no',
    debate_allowed: 'no',
    debate_primitive: 'none',
    human_review_required: 'no',
    human_delegated_allowed: 'no',
  },
  {
    node_index: 8,
    node_id: 'topic-selection.v1a.human-confirm-need.v1',
    authority_kind: 'ValidatedNeed',
    // Matrix leading token of 'human_review + bounded_semantic_review'.
    executor_kind: 'human_review',
    default_execution_mode: 'codex_assisted_semantic_review',
    codex_allowed: 'yes',
    provider_required: 'no',
    debate_allowed: 'no',
    debate_primitive: 'none',
    human_review_required: 'yes',
    human_delegated_allowed: 'yes',
  },
  {
    node_index: 9,
    node_id: 'topic-selection.v1a.publish-v1b-input-bundle.v1',
    authority_kind: 'TopicSelectionV1bInputBundle',
    executor_kind: 'deterministic',
    default_execution_mode: 'none',
    codex_allowed: 'no',
    provider_required: 'no',
    debate_allowed: 'no',
    debate_primitive: 'none',
    human_review_required: 'no',
    human_delegated_allowed: 'no',
  },
] as const satisfies readonly TopicSelectionNodeSemanticPolicy[];

export const TOPIC_SELECTION_RESOURCE_SAMPLING_NODE_SEMANTIC_POLICIES = [
  {
    node_index: 1,
    // Duplicated literal — cross-checked against topic-selection-resource-sampling-service.ts
    // by the matrix consistency script.
    node_id: 'topic-selection.resource-sampling.create-sample-set.v1',
    authority_kind: 'TopicSelectionResourceSampleSet',
    executor_kind: 'single_agent',
    default_execution_mode: 'codex_assisted',
    codex_allowed: 'yes',
    provider_required: 'no',
    // Polarity debate is policy-only: allowed conditionally, primitive reserved (DMP-03: trigger must block).
    debate_allowed: 'conditional',
    debate_primitive: 'reserved',
    human_review_required: 'no',
    human_delegated_allowed: 'no',
  },
] as const satisfies readonly TopicSelectionNodeSemanticPolicy[];

// --- v1b semantic supplement (2026-07-07) --------------------------------------------------------
//
// v1b already has runtime authority for four matrix columns (codex_allowed / executor_kind /
// human_delegated_allowed / default_execution_mode derive from
// TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_NODE_POLICIES + slots). The remaining four semantic columns
// (provider_required / debate_allowed / debate_primitive / human_review_required) had NO structured
// export — the last per-column blind spot the matrix Change Log tracked. This supplement covers
// exactly those four columns and nothing else, so the runtime-derived checks stay the single
// authority for their columns (no dual-track).
//
// node ids must stay in lockstep with TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_NODE_IDS (schema test
// pins set equality). Values transcribed from the W-08-verified matrix v1b rows and cross-checked
// against runtime reality (N6 divergent_loop / N8 bounded_sequence debate runtimes; no v1b node is
// provider-required or a hard human gate — N2/N5 are delegated surfaces, not review gates).

export interface TopicSelectionV1bNodeSemanticSupplementPolicy {
  node_index: number;
  node_id: string;
  provider_required: TopicSelectionSemanticTristate;
  debate_allowed: TopicSelectionSemanticTristate;
  debate_primitive: TopicSelectionSemanticDebatePrimitive;
  human_review_required: TopicSelectionSemanticTristate;
}

export const TOPIC_SELECTION_V1B_NODE_SEMANTIC_SUPPLEMENT_POLICIES = [
  {
    node_index: 1,
    node_id: 'topic-selection.v1b.create-intake-snapshot.v1',
    provider_required: 'no',
    debate_allowed: 'no',
    debate_primitive: 'none',
    human_review_required: 'no',
  },
  {
    node_index: 2,
    node_id: 'topic-selection.v1b.record-research-constraint-profile.v1',
    provider_required: 'no',
    debate_allowed: 'no',
    debate_primitive: 'none',
    human_review_required: 'no',
  },
  {
    node_index: 3,
    node_id: 'topic-selection.v1b.assess-intake-readiness.v1',
    provider_required: 'no',
    debate_allowed: 'no',
    debate_primitive: 'none',
    human_review_required: 'no',
  },
  {
    node_index: 4,
    node_id: 'topic-selection.v1b.generate-research-slice-options.v1',
    provider_required: 'no',
    // Debate rejected 2026-06-11: the human choosing at N5 is the critic.
    debate_allowed: 'no',
    debate_primitive: 'none',
    human_review_required: 'no',
  },
  {
    node_index: 5,
    node_id: 'topic-selection.v1b.select-research-slice.v1',
    provider_required: 'no',
    debate_allowed: 'no',
    debate_primitive: 'none',
    // Product default is a human pick (delegated surface), not a required review gate.
    human_review_required: 'no',
  },
  {
    node_index: 6,
    node_id: 'topic-selection.v1b.generate-topic-question-candidates.v1',
    provider_required: 'no',
    debate_allowed: 'conditional',
    // Implemented T-127 W-07: explorer/critic/arbiter fan-out, caller-side execution.
    debate_primitive: 'divergent_loop',
    human_review_required: 'no',
  },
  {
    node_index: 7,
    node_id: 'topic-selection.v1b.materialize-topic-question-contract.v1',
    provider_required: 'no',
    debate_allowed: 'no',
    debate_primitive: 'none',
    human_review_required: 'no',
  },
  {
    node_index: 8,
    node_id: 'topic-selection.v1b.assess-topic-value.v1',
    provider_required: 'no',
    debate_allowed: 'conditional',
    // Implemented T-123 Phase 3: 4-role bounded sequence, T1/T3 deterministic triggers.
    debate_primitive: 'bounded_sequence',
    human_review_required: 'no',
  },
  {
    node_index: 9,
    node_id: 'topic-selection.v1b.decide-value-disposition.v1',
    provider_required: 'no',
    debate_allowed: 'no',
    debate_primitive: 'none',
    human_review_required: 'no',
  },
  {
    node_index: 10,
    node_id: 'topic-selection.v1b.create-draft-topic-package.v1',
    provider_required: 'no',
    debate_allowed: 'no',
    debate_primitive: 'none',
    human_review_required: 'no',
  },
  {
    node_index: 11,
    node_id: 'topic-selection.v1b.publish-v1c-input-bundle.v1',
    provider_required: 'no',
    debate_allowed: 'no',
    debate_primitive: 'none',
    human_review_required: 'no',
  },
] as const satisfies readonly TopicSelectionV1bNodeSemanticSupplementPolicy[];

export const topicSelectionV1bNodeSemanticSupplementPolicySchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'node_index',
    'node_id',
    'provider_required',
    'debate_allowed',
    'debate_primitive',
    'human_review_required',
  ],
  properties: {
    node_index: { type: 'integer', minimum: 1, maximum: 11 },
    node_id: { type: 'string', minLength: 1 },
    provider_required: { enum: [...TOPIC_SELECTION_SEMANTIC_TRISTATE] },
    debate_allowed: { enum: [...TOPIC_SELECTION_SEMANTIC_TRISTATE] },
    debate_primitive: { enum: [...TOPIC_SELECTION_SEMANTIC_DEBATE_PRIMITIVES] },
    human_review_required: { enum: [...TOPIC_SELECTION_SEMANTIC_TRISTATE] },
  },
} as const;

export const topicSelectionNodeSemanticPolicySchema = {
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
    node_index: { type: 'integer', minimum: 1, maximum: 9 },
    node_id: { type: 'string', minLength: 1 },
    authority_kind: { type: 'string', minLength: 1 },
    executor_kind: { enum: [...TOPIC_SELECTION_SEMANTIC_EXECUTOR_KINDS] },
    default_execution_mode: { enum: [...TOPIC_SELECTION_SEMANTIC_DEFAULT_EXECUTION_MODES] },
    codex_allowed: { enum: [...TOPIC_SELECTION_SEMANTIC_TRISTATE] },
    provider_required: { enum: [...TOPIC_SELECTION_SEMANTIC_TRISTATE] },
    debate_allowed: { enum: [...TOPIC_SELECTION_SEMANTIC_TRISTATE] },
    debate_primitive: { enum: [...TOPIC_SELECTION_SEMANTIC_DEBATE_PRIMITIVES] },
    human_review_required: { enum: [...TOPIC_SELECTION_SEMANTIC_TRISTATE] },
    human_delegated_allowed: { enum: [...TOPIC_SELECTION_SEMANTIC_TRISTATE] },
  },
} as const;
