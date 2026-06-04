import {
  topicSelectionFunctionalRefSchema,
  type TopicSelectionFunctionalRef,
} from './topic-selection-control-plane-contracts.js';
import {
  TOPIC_SELECTION_AGENT_RUN_MODES,
  type TopicSelectionAgentRunMode,
} from './topic-selection-agent-profile-contracts.js';
import {
  TOPIC_SELECTION_AGENT_EXECUTOR_KINDS,
  type TopicSelectionExecutorKind,
} from './topic-selection-agent-invocation-contracts.js';
import {
  TOPIC_SELECTION_AGENT_EXECUTION_MODES,
  type TopicSelectionAgentExecutionMode,
} from './topic-selection-need-validation-contracts.js';
import {
  TOPIC_SELECTION_RUNTIME_CACHE_RESULTS,
  type TopicSelectionRuntimeCacheResult,
} from './topic-selection-runtime-common-contracts.js';

export type { TopicSelectionFunctionalRef } from './topic-selection-control-plane-contracts.js';
export {
  TOPIC_SELECTION_RUNTIME_CACHE_RESULTS,
  type TopicSelectionRuntimeCacheResult,
} from './topic-selection-runtime-common-contracts.js';

export const TOPIC_SELECTION_LLM_RUNTIME_SCHEMA_VERSION =
  'TopicSelectionLlmRuntime@v1' as const;
export const TOPIC_SELECTION_CONTEXT_POLICY_PROFILE_SCHEMA_VERSION =
  'TopicSelectionContextPolicyProfile@v1' as const;
export const TOPIC_SELECTION_CONTEXT_POLICY_PROFILE_REGISTRY_SCHEMA_VERSION =
  'TopicSelectionContextPolicyProfileRegistry@v1' as const;
export const TOPIC_SELECTION_PROMPT_QUALITY_REPORT_SCHEMA_VERSION =
  'TopicSelectionPromptQualityReport@v1' as const;
export const TOPIC_SELECTION_RUNTIME_AUDIT_ENVELOPE_SCHEMA_VERSION =
  'TopicSelectionRuntimeAuditEnvelope@v1' as const;
export const TOPIC_SELECTION_OPERATOR_AUDIT_SUMMARY_SCHEMA_VERSION =
  'TopicSelectionOperatorAuditSummary@v1' as const;
export const TOPIC_SELECTION_HUMAN_TRUST_SUMMARY_SCHEMA_VERSION =
  'TopicSelectionHumanTrustSummary@v1' as const;
export const TOPIC_SELECTION_RUNTIME_INVOCATION_CONTEXT_SCHEMA_VERSION =
  'TopicSelectionRuntimeInvocationContext@v1' as const;

export const TOPIC_SELECTION_CONTEXT_FAMILIES = [
  'resource_sampling_literature_classification_batch',
  'paper_implementation_trace_integrity_review',
  'paper_implementation_claim_boundary_review',
  'paper_implementation_dossier_readiness_prep',
  'paper_implementation_result_analysis',
  'paper_implementation_experiment_planning',
  'v1a_n5_evidence_extraction',
  'v1a_n6_exploration',
  'v1a_n6_arbiter',
  'v1a_n7_need_adjudication_support',
  'v1a_n8_human_confirmation_semantic_review',
  'v1b_constraint_profile_context',
  'v1b_intake_readiness_context',
  'v1b_n4_research_slice_option_generation',
  'v1b_slice_selection_context',
  'v1b_n6_topic_question_generation',
  'v1b_n6_loopback_triage_context',
  'v1b_n7_topic_question_hardening',
  'v1b_n8_topic_value_assessment',
  'v1c_n2_bounded_promotion_support',
  'v1c_n2_promotion_support',
  'v1c_n4_delegated_promotion_decision',
  'v1c_n6_downstream_feedback_normalization',
  'v1c_promotion_gate_advisory',
] as const;
export type TopicSelectionContextFamily = (typeof TOPIC_SELECTION_CONTEXT_FAMILIES)[number];

export const TOPIC_SELECTION_CONTEXT_SOURCE_KINDS = [
  'authority_record',
  'ref_backed_artifact',
  'durable_memory',
  'prior_llm_output',
  'cache_projection',
  'provider_telemetry',
] as const;
export type TopicSelectionContextSourceKind =
  (typeof TOPIC_SELECTION_CONTEXT_SOURCE_KINDS)[number];

export const TOPIC_SELECTION_CONTEXT_FUNCTIONAL_TEMPLATES = [
  'candidate_for_deterministic_gate',
  'support_only_semantic',
  'delegated_payload_candidate',
  'human_review_advisory',
] as const;
export type TopicSelectionContextFunctionalTemplate =
  (typeof TOPIC_SELECTION_CONTEXT_FUNCTIONAL_TEMPLATES)[number];

export const TOPIC_SELECTION_CONTEXT_EXECUTION_MODIFIERS = [
  'provider_required_live',
  'codex_exact_reuse_allowed',
  'mock_replay_allowed',
  'external_artifact_admission',
  'compression_allowed_with_quality_gate',
  'compression_disallowed',
] as const;
export type TopicSelectionContextExecutionModifier =
  (typeof TOPIC_SELECTION_CONTEXT_EXECUTION_MODIFIERS)[number];

export const TOPIC_SELECTION_COMPRESSION_MODES = [
  'disallowed',
  'allowed_with_quality_gate',
  'required_when_over_budget',
] as const;
export type TopicSelectionCompressionMode = (typeof TOPIC_SELECTION_COMPRESSION_MODES)[number];

export const TOPIC_SELECTION_COMPRESSION_EXECUTOR_KINDS = [
  'deterministic_structural',
  'codex_assisted',
] as const;
export type TopicSelectionCompressionExecutorKind =
  (typeof TOPIC_SELECTION_COMPRESSION_EXECUTOR_KINDS)[number];

export const TOPIC_SELECTION_TOKEN_BUDGET_GATE_DECISIONS = [
  'within_budget',
  'requires_compression',
  'blocked_over_budget',
  'budget_unknown_allow_with_warning',
] as const;
export type TopicSelectionTokenBudgetGateDecision =
  (typeof TOPIC_SELECTION_TOKEN_BUDGET_GATE_DECISIONS)[number];

export const TOPIC_SELECTION_PROMPT_QUALITY_DECISIONS = ['pass', 'warn', 'block'] as const;
export type TopicSelectionPromptQualityDecision =
  (typeof TOPIC_SELECTION_PROMPT_QUALITY_DECISIONS)[number];

export const TOPIC_SELECTION_RESPONSE_REUSE_RESULTS = [
  'not_applicable',
  'miss',
  'hit_non_provider',
  'blocked_provider_live_required',
  'blocked_missing_approval',
  'blocked_profile_drift',
  'blocked_schema_drift',
  'blocked_policy_drift',
] as const;
export type TopicSelectionResponseReuseResult =
  (typeof TOPIC_SELECTION_RESPONSE_REUSE_RESULTS)[number];

export const TOPIC_SELECTION_EXACT_RESPONSE_REUSE_SOURCE_KINDS = [
  'codex_assisted',
  'mock_fixture',
] as const;
export type TopicSelectionExactResponseReuseSourceKind =
  (typeof TOPIC_SELECTION_EXACT_RESPONSE_REUSE_SOURCE_KINDS)[number];

export const TOPIC_SELECTION_EXACT_RESPONSE_REUSE_APPROVAL_STATUSES = [
  'approved_by_operator',
  'approved_by_local_setting',
  'fixture_replay',
] as const;
export type TopicSelectionExactResponseReuseApprovalStatus =
  (typeof TOPIC_SELECTION_EXACT_RESPONSE_REUSE_APPROVAL_STATUSES)[number];

export const TOPIC_SELECTION_AUDIT_PROJECTION_KINDS = [
  'operator_audit_summary',
  'human_trust_summary',
] as const;
export type TopicSelectionAuditProjectionKind =
  (typeof TOPIC_SELECTION_AUDIT_PROJECTION_KINDS)[number];

export const TOPIC_SELECTION_SCHEMA_VALIDATION_RESULTS = [
  'passed',
  'failed',
  'not_applicable',
] as const;
export type TopicSelectionSchemaValidationResult =
  (typeof TOPIC_SELECTION_SCHEMA_VALIDATION_RESULTS)[number];

export const TOPIC_SELECTION_RUNTIME_GATE_RESULTS = [
  'passed',
  'blocked',
  'warned',
  'not_applicable',
] as const;
export type TopicSelectionRuntimeGateResult =
  (typeof TOPIC_SELECTION_RUNTIME_GATE_RESULTS)[number];

export const TOPIC_SELECTION_RUNTIME_SCENARIO_IDENTITY_POLICIES = [
  'not_semantic',
  'semantic_identity',
] as const;
export type TopicSelectionRuntimeScenarioIdentityPolicy =
  (typeof TOPIC_SELECTION_RUNTIME_SCENARIO_IDENTITY_POLICIES)[number];

export const TOPIC_SELECTION_RUNTIME_LOOP_KINDS = [
  'not_applicable',
  'initial',
  'supplemental_round',
  'repair_from_node',
  'debate_round',
] as const;
export type TopicSelectionRuntimeLoopKind =
  (typeof TOPIC_SELECTION_RUNTIME_LOOP_KINDS)[number];

export interface TopicSelectionRuntimeScenarioContext {
  identity_policy: TopicSelectionRuntimeScenarioIdentityPolicy;
  scenario_id: string | null;
  scenario_case_id: string | null;
  semantic_scenario_key: string | null;
}

export interface TopicSelectionRuntimeLoopContext {
  loop_kind: TopicSelectionRuntimeLoopKind;
  loop_stage: string | null;
  current_round_index: number | null;
  remaining_round_budget: number | null;
  loopback_source_node_id: string | null;
  repair_origin_ref: TopicSelectionFunctionalRef | null;
  repair_origin_hash: string | null;
}

export interface TopicSelectionRuntimeDebateContext {
  debate_loop_id: string | null;
  debate_policy_id: string | null;
  round_index: number | null;
  role: 'explorer' | 'deep_critic' | 'arbiter' | null;
  stage: string | null;
  agent_instance_id: string | null;
  parent_invocation_attempt_ids_hash: string | null;
  dynamic_material_refs_hash: string | null;
}

export interface TopicSelectionRuntimeInvocationContext {
  schema_version: typeof TOPIC_SELECTION_RUNTIME_INVOCATION_CONTEXT_SCHEMA_VERSION;
  invocation_slot_id: string;
  scenario_context: TopicSelectionRuntimeScenarioContext;
  loop_context: TopicSelectionRuntimeLoopContext;
  debate_context: TopicSelectionRuntimeDebateContext;
}

export interface TopicSelectionContextMemoryPolicy {
  allowed_memory_families: string[];
  required_use_labels: string[];
  stale_behavior: 'miss' | 'block' | 'warn';
  missing_required_memory_behavior: 'allow' | 'warn' | 'block';
  durable_memory_as_standalone_evidence: false;
}

export interface TopicSelectionCompressionPolicy {
  compression_mode: TopicSelectionCompressionMode;
  allowed_executor_kinds: TopicSelectionCompressionExecutorKind[];
  compression_strategy_id: string | null;
  compression_strategy_version: string | null;
  preserved_fact_kinds: string[];
  forbidden_payload_classes: string[];
  quality_gate_required: boolean;
}

export interface TopicSelectionContextCachePolicy {
  cache_enabled: boolean;
  cache_scope: 'context_identity_preprocessing' | 'disabled';
  exact_key_fields: string[];
  stale_behavior: 'miss' | 'block';
  post_cache_gates: string[];
}

export interface TopicSelectionTokenBudgetPolicy {
  estimated_input_token_target: number;
  estimated_output_token_budget: number;
  context_window_tokens: number | null;
  token_estimate_safety_margin: number;
  unknown_estimate_behavior:
    | 'budget_unknown_allow_with_warning'
    | 'blocked_over_budget';
}

export interface TopicSelectionExactResponseReusePolicy {
  provider_llm_response_reuse: 'blocked' | 'treated_as_miss';
  codex_exact_reuse_requires_approval: boolean;
  mock_replay_allowed: boolean;
  provider_required_live_behavior: 'live_call_required' | 'not_applicable';
}

export interface TopicSelectionRuntimeProvenancePolicy {
  runtime_audit_envelope_required: boolean;
  operator_audit_summary_required: boolean;
  human_trust_summary_required: boolean;
  forbidden_persisted_payload_classes: string[];
}

export interface TopicSelectionContextPolicyProfile {
  schema_version: typeof TOPIC_SELECTION_CONTEXT_POLICY_PROFILE_SCHEMA_VERSION;
  context_policy_profile_id: string;
  context_policy_profile_version: string;
  invocation_slot_id: string;
  functional_template: TopicSelectionContextFunctionalTemplate;
  execution_modifiers: TopicSelectionContextExecutionModifier[];
  context_family: TopicSelectionContextFamily;
  allowed_source_kinds: TopicSelectionContextSourceKind[];
  memory_policy: TopicSelectionContextMemoryPolicy;
  compression_policy: TopicSelectionCompressionPolicy;
  cache_policy: TopicSelectionContextCachePolicy;
  token_budget_policy: TopicSelectionTokenBudgetPolicy;
  reuse_policy: TopicSelectionExactResponseReusePolicy;
  post_reuse_gates: string[];
  provenance_policy: TopicSelectionRuntimeProvenancePolicy;
  redaction_policy: string;
}

export interface TopicSelectionContextPolicyProfileRegistry {
  schema_version: typeof TOPIC_SELECTION_CONTEXT_POLICY_PROFILE_REGISTRY_SCHEMA_VERSION;
  profiles: TopicSelectionContextPolicyProfile[];
}

export interface TopicSelectionContextPacketCacheKey {
  node_id: string;
  invocation_slot_id: string;
  execution_mode: TopicSelectionAgentExecutionMode;
  executor_kind: TopicSelectionExecutorKind;
  context_family: TopicSelectionContextFamily;
  runtime_invocation_context_hash: string;
  input_refs_hash: string;
  context_packet_hashes: string[];
  prompt_packet_hash: string;
  policy_version: string;
  schema_version: string;
  context_compiler_version: string;
  prompt_template_id: string;
  prompt_template_version: string;
  profile_hash: string;
  model_option_id: string | null;
  normalized_params_hash: string | null;
  output_contract: string;
  redaction_policy: string;
  cache_scope: 'context_identity_preprocessing' | 'disabled';
}

export interface TopicSelectionContextPacketCacheResultEnvelope {
  cache_result: TopicSelectionRuntimeCacheResult;
  artifact_ref: TopicSelectionFunctionalRef | null;
  artifact_hash: string | null;
  cache_key_hash: string;
  context_family: TopicSelectionContextFamily;
  context_policy_profile_id: string;
  context_policy_profile_version: string;
  context_policy_profile_hash: string;
  source_refs_hash: string;
  freshness_status: 'fresh' | 'stale' | 'drifted' | 'unknown';
  provenance_ref: TopicSelectionFunctionalRef;
}

export interface TopicSelectionTokenBudgetGateResult {
  provider_id: string | null;
  model_id: string | null;
  profile_id: string;
  model_option_id: string | null;
  estimated_input_tokens: number | null;
  estimated_output_tokens: number;
  context_window_tokens: number | null;
  schema_overhead_tokens: number | null;
  decision: TopicSelectionTokenBudgetGateDecision;
  compression_strategy_ref: TopicSelectionFunctionalRef | null;
  blocker_codes: string[];
  warning_codes: string[];
}

export interface TopicSelectionCompressionReportEnvelope {
  compression_report_ref: TopicSelectionFunctionalRef;
  source_refs: TopicSelectionFunctionalRef[];
  input_context_hash: string;
  compressed_context_hash: string;
  summary_hash: string;
  estimated_input_tokens_before: number | null;
  estimated_input_tokens_after: number | null;
  redaction_policy: string;
  compression_executor_kind: TopicSelectionCompressionExecutorKind;
  compression_strategy_id: string;
  compression_strategy_version: string;
  preserved_fact_kinds: string[];
  quality_gate_result: TopicSelectionRuntimeGateResult;
  blocker_codes: string[];
  warning_codes: string[];
}

export interface TopicSelectionDynamicPromptMaterialRecord {
  material_ref: TopicSelectionFunctionalRef;
  material_hash: string;
  generated_by_invocation_slot_id: string;
  generation_policy_ref: TopicSelectionFunctionalRef;
  allowed_to_influence_prompt: boolean;
  cannot_override_prompt_template: true;
}

export interface TopicSelectionPromptPacketIdentity {
  prompt_packet_hash: string;
  prompt_template_id: string;
  prompt_template_version: string;
  prompt_variant_key: string;
  invocation_slot_id: string;
  runtime_invocation_context_hash: string;
  context_packet_hashes: string[];
  compression_report_ref: TopicSelectionFunctionalRef | null;
  compression_report_hash: string | null;
  compressed_context_hash: string | null;
  dynamic_material_refs_hash: string | null;
  output_contract: string;
  context_policy_profile_hash: string;
  model_option_id: string | null;
  normalized_params_hash: string | null;
  runtime_modifiers_hash: string;
  redaction_policy: string;
  redacted_prompt_artifact_ref: TopicSelectionFunctionalRef;
  provenance_ref: TopicSelectionFunctionalRef;
}

export interface TopicSelectionRedactedPromptPacketArtifact {
  artifact_ref: TopicSelectionFunctionalRef;
  prompt_packet_hash: string;
  prompt_template_id: string;
  prompt_template_version: string;
  prompt_variant_key: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant' | 'tool';
    content_hash: string;
    redacted_content_ref: TopicSelectionFunctionalRef;
  }>;
  source_refs: TopicSelectionFunctionalRef[];
  redaction_policy: string;
  provenance_ref: TopicSelectionFunctionalRef;
}

export interface TopicSelectionPromptQualityReport {
  schema_version: typeof TOPIC_SELECTION_PROMPT_QUALITY_REPORT_SCHEMA_VERSION;
  prompt_quality_report_ref: TopicSelectionFunctionalRef;
  prompt_packet_hash: string;
  prompt_template_id: string;
  prompt_template_version: string;
  prompt_variant_key: string;
  invocation_slot_id: string;
  context_policy_profile_hash: string;
  rendered_input_hash: string;
  executable_prompt_hash: string;
  redacted_prompt_artifact_ref: TopicSelectionFunctionalRef;
  dynamic_material_refs: TopicSelectionDynamicPromptMaterialRecord[];
  quality_decision: TopicSelectionPromptQualityDecision;
  check_codes: string[];
  blocker_codes: string[];
  warning_codes: string[];
}

export interface TopicSelectionPromptPacketCacheResultEnvelope {
  cache_result: TopicSelectionRuntimeCacheResult;
  prompt_packet_hash: string;
  prompt_template_id: string;
  prompt_template_version: string;
  prompt_variant_key: string;
  invocation_slot_id: string;
  context_policy_profile_id: string;
  context_policy_profile_version: string;
  context_policy_profile_hash: string;
  output_contract: string;
  redaction_policy: string;
  redacted_prompt_artifact_ref: TopicSelectionFunctionalRef | null;
  redacted_prompt_artifact_hash: string | null;
  prompt_quality_report_ref: TopicSelectionFunctionalRef | null;
  prompt_quality_report_hash: string | null;
  quality_decision: TopicSelectionPromptQualityDecision | null;
  freshness_status: 'fresh' | 'stale' | 'drifted' | 'unknown';
  provenance_ref: TopicSelectionFunctionalRef;
  blocker_codes: string[];
  warning_codes: string[];
}

export interface TopicSelectionExactResponseReuseProvenance {
  source_workflow_run_id: string;
  source_node_id: string;
  source_node_attempt_id: string;
  source_execution_mode: TopicSelectionAgentExecutionMode;
  reuse_source_kind: TopicSelectionExactResponseReuseSourceKind;
  response_hash: string;
  prompt_packet_hash: string;
  context_packet_hashes: string[];
  schema_version: string;
  profile_hash: string;
  policy_version: string;
  approval_status: TopicSelectionExactResponseReuseApprovalStatus;
  approval_ref: TopicSelectionFunctionalRef | null;
  local_approval_setting_ref: string | null;
  non_provider: true;
}

export interface TopicSelectionProviderTelemetrySnapshot {
  provider_id: string;
  model_id: string;
  input_tokens: number | null;
  output_tokens: number | null;
  total_tokens: number | null;
  provider_side_cache_hit: boolean | null;
  provider_side_cache_read_tokens: number | null;
  provider_side_cache_write_tokens: number | null;
  request_count: number;
}

export interface TopicSelectionRuntimeAuditEnvelope {
  schema_version: typeof TOPIC_SELECTION_RUNTIME_AUDIT_ENVELOPE_SCHEMA_VERSION;
  workflow_run_id: string;
  node_id: string;
  invocation_slot_id: string;
  node_attempt_id: string;
  runtime_invocation_context_hash: string;
  execution_mode: TopicSelectionAgentExecutionMode;
  executor_kind: TopicSelectionExecutorKind;
  run_mode: TopicSelectionAgentRunMode;
  profile_hash: string;
  schema_version_ref: string;
  policy_version: string;
  prompt_template_id: string;
  prompt_template_version: string;
  model_option_id: string | null;
  normalized_params_hash: string | null;
  context_cache_result: TopicSelectionRuntimeCacheResult;
  context_artifact_refs: TopicSelectionFunctionalRef[];
  context_packet_hashes: string[];
  compression_report_ref: TopicSelectionFunctionalRef | null;
  prompt_packet_hash: string;
  prompt_quality_report_ref: TopicSelectionFunctionalRef | null;
  token_budget_gate_result: TopicSelectionTokenBudgetGateResult;
  response_artifact_ref: TopicSelectionFunctionalRef | null;
  response_hash: string | null;
  response_reuse_result: TopicSelectionResponseReuseResult;
  response_reuse_provenance_ref: TopicSelectionFunctionalRef | null;
  schema_validation_result: TopicSelectionSchemaValidationResult;
  post_reuse_gate_result: TopicSelectionRuntimeGateResult;
  deterministic_gate_result: TopicSelectionRuntimeGateResult;
  authority_boundary_result: TopicSelectionRuntimeGateResult;
  provider_live_call: boolean;
  provider_telemetry: TopicSelectionProviderTelemetrySnapshot | null;
  blocker_codes: string[];
  warning_codes: string[];
}

export interface TopicSelectionOperatorAuditSummary {
  schema_version: typeof TOPIC_SELECTION_OPERATOR_AUDIT_SUMMARY_SCHEMA_VERSION;
  projection_kind: 'operator_audit_summary';
  runtime_audit_envelope_ref: TopicSelectionFunctionalRef;
  runtime_audit_envelope_hash: string;
  node_id: string;
  invocation_slot_id: string;
  execution_mode: TopicSelectionAgentExecutionMode;
  context_cache_result: TopicSelectionRuntimeCacheResult;
  response_reuse_result: TopicSelectionResponseReuseResult;
  token_budget_decision: TopicSelectionTokenBudgetGateDecision;
  compression_applied: boolean;
  provider_live_call: boolean;
  blocker_codes: string[];
  warning_codes: string[];
}

export interface TopicSelectionHumanTrustSummary {
  schema_version: typeof TOPIC_SELECTION_HUMAN_TRUST_SUMMARY_SCHEMA_VERSION;
  projection_kind: 'human_trust_summary';
  runtime_audit_envelope_ref: TopicSelectionFunctionalRef;
  runtime_audit_envelope_hash: string;
  node_id: string;
  invocation_slot_id: string;
  trust_summary: string;
  relied_on_cached_context: boolean;
  relied_on_cached_response: boolean;
  provider_live_call: boolean;
  residual_risk_codes: string[];
  required_human_checks: string[];
}

const stringId = { type: 'string', minLength: 1 } as const;
const hashString = { type: 'string', pattern: '^[a-f0-9]{64}$' } as const;
const nonNegativeInteger = { type: 'integer', minimum: 0 } as const;
const positiveInteger = { type: 'integer', minimum: 1 } as const;
const nullableHashString = { anyOf: [hashString, { type: 'null' }] } as const;
const nullableStringId = { anyOf: [stringId, { type: 'null' }] } as const;
const nullableFunctionalRef = {
  anyOf: [topicSelectionFunctionalRefSchema, { type: 'null' }],
} as const;
const stringArray = { type: 'array', items: stringId } as const;
const hashArray = { type: 'array', items: hashString, minItems: 1 } as const;
const functionalRefArray = {
  type: 'array',
  items: topicSelectionFunctionalRefSchema,
} as const;
const nonEmptyFunctionalRefArray = {
  type: 'array',
  items: topicSelectionFunctionalRefSchema,
  minItems: 1,
} as const;

export const topicSelectionRuntimeScenarioContextSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'identity_policy',
    'scenario_id',
    'scenario_case_id',
    'semantic_scenario_key',
  ],
  properties: {
    identity_policy: { enum: [...TOPIC_SELECTION_RUNTIME_SCENARIO_IDENTITY_POLICIES] },
    scenario_id: nullableStringId,
    scenario_case_id: nullableStringId,
    semantic_scenario_key: nullableStringId,
  },
  allOf: [
    {
      if: {
        properties: { identity_policy: { const: 'not_semantic' } },
        required: ['identity_policy'],
      },
      then: {
        properties: {
          scenario_id: { type: 'null' },
          scenario_case_id: { type: 'null' },
          semantic_scenario_key: { type: 'null' },
        },
      },
    },
    {
      if: {
        properties: { identity_policy: { const: 'semantic_identity' } },
        required: ['identity_policy'],
      },
      then: {
        properties: {
          semantic_scenario_key: stringId,
        },
      },
    },
  ],
} as const;

export const topicSelectionRuntimeLoopContextSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'loop_kind',
    'loop_stage',
    'current_round_index',
    'remaining_round_budget',
    'loopback_source_node_id',
    'repair_origin_ref',
    'repair_origin_hash',
  ],
  properties: {
    loop_kind: { enum: [...TOPIC_SELECTION_RUNTIME_LOOP_KINDS] },
    loop_stage: nullableStringId,
    current_round_index: {
      anyOf: [{ type: 'integer', minimum: 1 }, { type: 'null' }],
    },
    remaining_round_budget: {
      anyOf: [{ type: 'integer', minimum: 0 }, { type: 'null' }],
    },
    loopback_source_node_id: nullableStringId,
    repair_origin_ref: nullableFunctionalRef,
    repair_origin_hash: nullableHashString,
  },
  allOf: [
    {
      if: {
        properties: { loop_kind: { const: 'repair_from_node' } },
        required: ['loop_kind'],
      },
      then: {
        required: ['loopback_source_node_id', 'repair_origin_ref', 'repair_origin_hash'],
        properties: {
          loopback_source_node_id: stringId,
          repair_origin_ref: topicSelectionFunctionalRefSchema,
          repair_origin_hash: hashString,
        },
      },
    },
  ],
} as const;

export const topicSelectionRuntimeDebateContextSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'debate_loop_id',
    'debate_policy_id',
    'round_index',
    'role',
    'stage',
    'agent_instance_id',
    'parent_invocation_attempt_ids_hash',
    'dynamic_material_refs_hash',
  ],
  properties: {
    debate_loop_id: nullableStringId,
    debate_policy_id: nullableStringId,
    round_index: {
      anyOf: [{ type: 'integer', minimum: 1 }, { type: 'null' }],
    },
    role: {
      anyOf: [{ enum: ['explorer', 'deep_critic', 'arbiter'] }, { type: 'null' }],
    },
    stage: nullableStringId,
    agent_instance_id: nullableStringId,
    parent_invocation_attempt_ids_hash: nullableHashString,
    dynamic_material_refs_hash: nullableHashString,
  },
  allOf: [
    {
      if: {
        properties: { role: { enum: ['explorer', 'deep_critic', 'arbiter'] } },
        required: ['role'],
      },
      then: {
        required: ['debate_loop_id', 'debate_policy_id', 'round_index', 'stage', 'agent_instance_id'],
        properties: {
          debate_loop_id: stringId,
          debate_policy_id: stringId,
          round_index: { type: 'integer', minimum: 1 },
          stage: stringId,
          agent_instance_id: stringId,
        },
      },
    },
  ],
} as const;

export const topicSelectionRuntimeInvocationContextSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'invocation_slot_id',
    'scenario_context',
    'loop_context',
    'debate_context',
  ],
  properties: {
    schema_version: { const: TOPIC_SELECTION_RUNTIME_INVOCATION_CONTEXT_SCHEMA_VERSION },
    invocation_slot_id: stringId,
    scenario_context: topicSelectionRuntimeScenarioContextSchema,
    loop_context: topicSelectionRuntimeLoopContextSchema,
    debate_context: topicSelectionRuntimeDebateContextSchema,
  },
} as const;

export const topicSelectionContextMemoryPolicySchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'allowed_memory_families',
    'required_use_labels',
    'stale_behavior',
    'missing_required_memory_behavior',
    'durable_memory_as_standalone_evidence',
  ],
  properties: {
    allowed_memory_families: stringArray,
    required_use_labels: stringArray,
    stale_behavior: { enum: ['miss', 'block', 'warn'] },
    missing_required_memory_behavior: { enum: ['allow', 'warn', 'block'] },
    durable_memory_as_standalone_evidence: { const: false },
  },
} as const;

export const topicSelectionCompressionPolicySchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'compression_mode',
    'allowed_executor_kinds',
    'compression_strategy_id',
    'compression_strategy_version',
    'preserved_fact_kinds',
    'forbidden_payload_classes',
    'quality_gate_required',
  ],
  properties: {
    compression_mode: { enum: [...TOPIC_SELECTION_COMPRESSION_MODES] },
    allowed_executor_kinds: {
      type: 'array',
      items: { enum: [...TOPIC_SELECTION_COMPRESSION_EXECUTOR_KINDS] },
    },
    compression_strategy_id: nullableStringId,
    compression_strategy_version: nullableStringId,
    preserved_fact_kinds: stringArray,
    forbidden_payload_classes: stringArray,
    quality_gate_required: { type: 'boolean' },
  },
} as const;

export const topicSelectionContextCachePolicySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['cache_enabled', 'cache_scope', 'exact_key_fields', 'stale_behavior', 'post_cache_gates'],
  properties: {
    cache_enabled: { type: 'boolean' },
    cache_scope: { enum: ['context_identity_preprocessing', 'disabled'] },
    exact_key_fields: stringArray,
    stale_behavior: { enum: ['miss', 'block'] },
    post_cache_gates: stringArray,
  },
} as const;

export const topicSelectionTokenBudgetPolicySchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'estimated_input_token_target',
    'estimated_output_token_budget',
    'context_window_tokens',
    'token_estimate_safety_margin',
    'unknown_estimate_behavior',
  ],
  properties: {
    estimated_input_token_target: positiveInteger,
    estimated_output_token_budget: positiveInteger,
    context_window_tokens: { anyOf: [positiveInteger, { type: 'null' }] },
    token_estimate_safety_margin: { type: 'number', minimum: 1 },
    unknown_estimate_behavior: {
      enum: ['budget_unknown_allow_with_warning', 'blocked_over_budget'],
    },
  },
} as const;

export const topicSelectionExactResponseReusePolicySchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'provider_llm_response_reuse',
    'codex_exact_reuse_requires_approval',
    'mock_replay_allowed',
    'provider_required_live_behavior',
  ],
  properties: {
    provider_llm_response_reuse: { enum: ['blocked', 'treated_as_miss'] },
    codex_exact_reuse_requires_approval: { type: 'boolean' },
    mock_replay_allowed: { type: 'boolean' },
    provider_required_live_behavior: { enum: ['live_call_required', 'not_applicable'] },
  },
} as const;

export const topicSelectionRuntimeProvenancePolicySchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'runtime_audit_envelope_required',
    'operator_audit_summary_required',
    'human_trust_summary_required',
    'forbidden_persisted_payload_classes',
  ],
  properties: {
    runtime_audit_envelope_required: { type: 'boolean' },
    operator_audit_summary_required: { type: 'boolean' },
    human_trust_summary_required: { type: 'boolean' },
    forbidden_persisted_payload_classes: stringArray,
  },
} as const;

export const topicSelectionContextPolicyProfileSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'context_policy_profile_id',
    'context_policy_profile_version',
    'invocation_slot_id',
    'functional_template',
    'execution_modifiers',
    'context_family',
    'allowed_source_kinds',
    'memory_policy',
    'compression_policy',
    'cache_policy',
    'token_budget_policy',
    'reuse_policy',
    'post_reuse_gates',
    'provenance_policy',
    'redaction_policy',
  ],
  properties: {
    schema_version: { const: TOPIC_SELECTION_CONTEXT_POLICY_PROFILE_SCHEMA_VERSION },
    context_policy_profile_id: stringId,
    context_policy_profile_version: stringId,
    invocation_slot_id: stringId,
    functional_template: { enum: [...TOPIC_SELECTION_CONTEXT_FUNCTIONAL_TEMPLATES] },
    execution_modifiers: {
      type: 'array',
      items: { enum: [...TOPIC_SELECTION_CONTEXT_EXECUTION_MODIFIERS] },
      minItems: 1,
    },
    context_family: { enum: [...TOPIC_SELECTION_CONTEXT_FAMILIES] },
    allowed_source_kinds: {
      type: 'array',
      items: { enum: [...TOPIC_SELECTION_CONTEXT_SOURCE_KINDS] },
      minItems: 1,
    },
    memory_policy: topicSelectionContextMemoryPolicySchema,
    compression_policy: topicSelectionCompressionPolicySchema,
    cache_policy: topicSelectionContextCachePolicySchema,
    token_budget_policy: topicSelectionTokenBudgetPolicySchema,
    reuse_policy: topicSelectionExactResponseReusePolicySchema,
    post_reuse_gates: stringArray,
    provenance_policy: topicSelectionRuntimeProvenancePolicySchema,
    redaction_policy: stringId,
  },
} as const;

export const topicSelectionContextPolicyProfileRegistrySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['schema_version', 'profiles'],
  properties: {
    schema_version: { const: TOPIC_SELECTION_CONTEXT_POLICY_PROFILE_REGISTRY_SCHEMA_VERSION },
    profiles: {
      type: 'array',
      items: topicSelectionContextPolicyProfileSchema,
      minItems: 1,
    },
  },
} as const;

export const topicSelectionContextPacketCacheKeySchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'node_id',
    'invocation_slot_id',
    'execution_mode',
    'executor_kind',
    'context_family',
    'runtime_invocation_context_hash',
    'input_refs_hash',
    'context_packet_hashes',
    'prompt_packet_hash',
    'policy_version',
    'schema_version',
    'context_compiler_version',
    'prompt_template_id',
    'prompt_template_version',
    'profile_hash',
    'model_option_id',
    'normalized_params_hash',
    'output_contract',
    'redaction_policy',
    'cache_scope',
  ],
  properties: {
    node_id: stringId,
    invocation_slot_id: stringId,
    execution_mode: { enum: [...TOPIC_SELECTION_AGENT_EXECUTION_MODES] },
    executor_kind: { enum: [...TOPIC_SELECTION_AGENT_EXECUTOR_KINDS] },
    context_family: { enum: [...TOPIC_SELECTION_CONTEXT_FAMILIES] },
    runtime_invocation_context_hash: hashString,
    input_refs_hash: hashString,
    context_packet_hashes: hashArray,
    prompt_packet_hash: hashString,
    policy_version: stringId,
    schema_version: stringId,
    context_compiler_version: stringId,
    prompt_template_id: stringId,
    prompt_template_version: stringId,
    profile_hash: hashString,
    model_option_id: nullableStringId,
    normalized_params_hash: nullableHashString,
    output_contract: stringId,
    redaction_policy: stringId,
    cache_scope: { enum: ['context_identity_preprocessing', 'disabled'] },
  },
} as const;

export const topicSelectionContextPacketCacheResultEnvelopeSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'cache_result',
    'artifact_ref',
    'artifact_hash',
    'cache_key_hash',
    'context_family',
    'context_policy_profile_id',
    'context_policy_profile_version',
    'context_policy_profile_hash',
    'source_refs_hash',
    'freshness_status',
    'provenance_ref',
  ],
  properties: {
    cache_result: { enum: [...TOPIC_SELECTION_RUNTIME_CACHE_RESULTS] },
    artifact_ref: nullableFunctionalRef,
    artifact_hash: nullableHashString,
    cache_key_hash: hashString,
    context_family: { enum: [...TOPIC_SELECTION_CONTEXT_FAMILIES] },
    context_policy_profile_id: stringId,
    context_policy_profile_version: stringId,
    context_policy_profile_hash: hashString,
    source_refs_hash: hashString,
    freshness_status: { enum: ['fresh', 'stale', 'drifted', 'unknown'] },
    provenance_ref: topicSelectionFunctionalRefSchema,
  },
  allOf: [
    {
      if: { properties: { cache_result: { const: 'hit' } }, required: ['cache_result'] },
      then: {
        properties: {
          artifact_ref: topicSelectionFunctionalRefSchema,
          artifact_hash: hashString,
          freshness_status: { const: 'fresh' },
        },
      },
    },
    {
      if: {
        properties: { cache_result: { enum: ['blocked_stale', 'blocked_drift'] } },
        required: ['cache_result'],
      },
      then: {
        properties: {
          artifact_ref: { type: 'null' },
          artifact_hash: { type: 'null' },
        },
      },
    },
  ],
} as const;

export const topicSelectionTokenBudgetGateResultSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'provider_id',
    'model_id',
    'profile_id',
    'model_option_id',
    'estimated_input_tokens',
    'estimated_output_tokens',
    'context_window_tokens',
    'schema_overhead_tokens',
    'decision',
    'compression_strategy_ref',
    'blocker_codes',
    'warning_codes',
  ],
  properties: {
    provider_id: nullableStringId,
    model_id: nullableStringId,
    profile_id: stringId,
    model_option_id: nullableStringId,
    estimated_input_tokens: { anyOf: [nonNegativeInteger, { type: 'null' }] },
    estimated_output_tokens: nonNegativeInteger,
    context_window_tokens: { anyOf: [positiveInteger, { type: 'null' }] },
    schema_overhead_tokens: { anyOf: [nonNegativeInteger, { type: 'null' }] },
    decision: { enum: [...TOPIC_SELECTION_TOKEN_BUDGET_GATE_DECISIONS] },
    compression_strategy_ref: nullableFunctionalRef,
    blocker_codes: stringArray,
    warning_codes: stringArray,
  },
} as const;

export const topicSelectionCompressionReportEnvelopeSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'compression_report_ref',
    'source_refs',
    'input_context_hash',
    'compressed_context_hash',
    'summary_hash',
    'estimated_input_tokens_before',
    'estimated_input_tokens_after',
    'redaction_policy',
    'compression_executor_kind',
    'compression_strategy_id',
    'compression_strategy_version',
    'preserved_fact_kinds',
    'quality_gate_result',
    'blocker_codes',
    'warning_codes',
  ],
  properties: {
    compression_report_ref: topicSelectionFunctionalRefSchema,
    source_refs: nonEmptyFunctionalRefArray,
    input_context_hash: hashString,
    compressed_context_hash: hashString,
    summary_hash: hashString,
    estimated_input_tokens_before: { anyOf: [nonNegativeInteger, { type: 'null' }] },
    estimated_input_tokens_after: { anyOf: [nonNegativeInteger, { type: 'null' }] },
    redaction_policy: stringId,
    compression_executor_kind: { enum: [...TOPIC_SELECTION_COMPRESSION_EXECUTOR_KINDS] },
    compression_strategy_id: stringId,
    compression_strategy_version: stringId,
    preserved_fact_kinds: stringArray,
    quality_gate_result: { enum: [...TOPIC_SELECTION_RUNTIME_GATE_RESULTS] },
    blocker_codes: stringArray,
    warning_codes: stringArray,
  },
} as const;

export const topicSelectionDynamicPromptMaterialRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'material_ref',
    'material_hash',
    'generated_by_invocation_slot_id',
    'generation_policy_ref',
    'allowed_to_influence_prompt',
    'cannot_override_prompt_template',
  ],
  properties: {
    material_ref: topicSelectionFunctionalRefSchema,
    material_hash: hashString,
    generated_by_invocation_slot_id: stringId,
    generation_policy_ref: topicSelectionFunctionalRefSchema,
    allowed_to_influence_prompt: { type: 'boolean' },
    cannot_override_prompt_template: { const: true },
  },
} as const;

export const topicSelectionPromptPacketIdentitySchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'prompt_packet_hash',
    'prompt_template_id',
    'prompt_template_version',
    'prompt_variant_key',
    'invocation_slot_id',
    'runtime_invocation_context_hash',
    'context_packet_hashes',
    'compression_report_ref',
    'compression_report_hash',
    'compressed_context_hash',
    'dynamic_material_refs_hash',
    'output_contract',
    'context_policy_profile_hash',
    'model_option_id',
    'normalized_params_hash',
    'runtime_modifiers_hash',
    'redaction_policy',
    'redacted_prompt_artifact_ref',
    'provenance_ref',
  ],
  properties: {
    prompt_packet_hash: hashString,
    prompt_template_id: stringId,
    prompt_template_version: stringId,
    prompt_variant_key: stringId,
    invocation_slot_id: stringId,
    runtime_invocation_context_hash: hashString,
    context_packet_hashes: hashArray,
    compression_report_ref: nullableFunctionalRef,
    compression_report_hash: nullableHashString,
    compressed_context_hash: nullableHashString,
    dynamic_material_refs_hash: nullableHashString,
    output_contract: stringId,
    context_policy_profile_hash: hashString,
    model_option_id: nullableStringId,
    normalized_params_hash: nullableHashString,
    runtime_modifiers_hash: hashString,
    redaction_policy: stringId,
    redacted_prompt_artifact_ref: topicSelectionFunctionalRefSchema,
    provenance_ref: topicSelectionFunctionalRefSchema,
  },
} as const;

export const topicSelectionRedactedPromptPacketArtifactSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'artifact_ref',
    'prompt_packet_hash',
    'prompt_template_id',
    'prompt_template_version',
    'prompt_variant_key',
    'messages',
    'source_refs',
    'redaction_policy',
    'provenance_ref',
  ],
  properties: {
    artifact_ref: topicSelectionFunctionalRefSchema,
    prompt_packet_hash: hashString,
    prompt_template_id: stringId,
    prompt_template_version: stringId,
    prompt_variant_key: stringId,
    messages: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['role', 'content_hash', 'redacted_content_ref'],
        properties: {
          role: { enum: ['system', 'user', 'assistant', 'tool'] },
          content_hash: hashString,
          redacted_content_ref: topicSelectionFunctionalRefSchema,
        },
      },
    },
    source_refs: nonEmptyFunctionalRefArray,
    redaction_policy: stringId,
    provenance_ref: topicSelectionFunctionalRefSchema,
  },
} as const;

export const topicSelectionPromptQualityReportSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'prompt_quality_report_ref',
    'prompt_packet_hash',
    'prompt_template_id',
    'prompt_template_version',
    'prompt_variant_key',
    'invocation_slot_id',
    'context_policy_profile_hash',
    'rendered_input_hash',
    'executable_prompt_hash',
    'redacted_prompt_artifact_ref',
    'dynamic_material_refs',
    'quality_decision',
    'check_codes',
    'blocker_codes',
    'warning_codes',
  ],
  properties: {
    schema_version: { const: TOPIC_SELECTION_PROMPT_QUALITY_REPORT_SCHEMA_VERSION },
    prompt_quality_report_ref: topicSelectionFunctionalRefSchema,
    prompt_packet_hash: hashString,
    prompt_template_id: stringId,
    prompt_template_version: stringId,
    prompt_variant_key: stringId,
    invocation_slot_id: stringId,
    context_policy_profile_hash: hashString,
    rendered_input_hash: hashString,
    executable_prompt_hash: hashString,
    redacted_prompt_artifact_ref: topicSelectionFunctionalRefSchema,
    dynamic_material_refs: {
      type: 'array',
      items: topicSelectionDynamicPromptMaterialRecordSchema,
    },
    quality_decision: { enum: [...TOPIC_SELECTION_PROMPT_QUALITY_DECISIONS] },
    check_codes: stringArray,
    blocker_codes: stringArray,
    warning_codes: stringArray,
  },
} as const;

export const topicSelectionPromptPacketCacheResultEnvelopeSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'cache_result',
    'prompt_packet_hash',
    'prompt_template_id',
    'prompt_template_version',
    'prompt_variant_key',
    'invocation_slot_id',
    'context_policy_profile_id',
    'context_policy_profile_version',
    'context_policy_profile_hash',
    'output_contract',
    'redaction_policy',
    'redacted_prompt_artifact_ref',
    'redacted_prompt_artifact_hash',
    'prompt_quality_report_ref',
    'prompt_quality_report_hash',
    'quality_decision',
    'freshness_status',
    'provenance_ref',
    'blocker_codes',
    'warning_codes',
  ],
  properties: {
    cache_result: { enum: [...TOPIC_SELECTION_RUNTIME_CACHE_RESULTS] },
    prompt_packet_hash: hashString,
    prompt_template_id: stringId,
    prompt_template_version: stringId,
    prompt_variant_key: stringId,
    invocation_slot_id: stringId,
    context_policy_profile_id: stringId,
    context_policy_profile_version: stringId,
    context_policy_profile_hash: hashString,
    output_contract: stringId,
    redaction_policy: stringId,
    redacted_prompt_artifact_ref: nullableFunctionalRef,
    redacted_prompt_artifact_hash: nullableHashString,
    prompt_quality_report_ref: nullableFunctionalRef,
    prompt_quality_report_hash: nullableHashString,
    quality_decision: { anyOf: [{ enum: [...TOPIC_SELECTION_PROMPT_QUALITY_DECISIONS] }, { type: 'null' }] },
    freshness_status: { enum: ['fresh', 'stale', 'drifted', 'unknown'] },
    provenance_ref: topicSelectionFunctionalRefSchema,
    blocker_codes: stringArray,
    warning_codes: stringArray,
  },
  allOf: [
    {
      if: { properties: { cache_result: { const: 'hit' } }, required: ['cache_result'] },
      then: {
        properties: {
          redacted_prompt_artifact_ref: topicSelectionFunctionalRefSchema,
          redacted_prompt_artifact_hash: hashString,
          prompt_quality_report_ref: topicSelectionFunctionalRefSchema,
          prompt_quality_report_hash: hashString,
          quality_decision: { enum: [...TOPIC_SELECTION_PROMPT_QUALITY_DECISIONS] },
          freshness_status: { const: 'fresh' },
        },
      },
    },
    {
      if: {
        properties: { cache_result: { enum: ['blocked_stale', 'blocked_drift'] } },
        required: ['cache_result'],
      },
      then: {
        properties: {
          redacted_prompt_artifact_ref: { type: 'null' },
          redacted_prompt_artifact_hash: { type: 'null' },
          prompt_quality_report_ref: { type: 'null' },
          prompt_quality_report_hash: { type: 'null' },
        },
      },
    },
  ],
} as const;

export const topicSelectionExactResponseReuseProvenanceSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'source_workflow_run_id',
    'source_node_id',
    'source_node_attempt_id',
    'source_execution_mode',
    'reuse_source_kind',
    'response_hash',
    'prompt_packet_hash',
    'context_packet_hashes',
    'schema_version',
    'profile_hash',
    'policy_version',
    'approval_status',
    'approval_ref',
    'local_approval_setting_ref',
    'non_provider',
  ],
  properties: {
    source_workflow_run_id: stringId,
    source_node_id: stringId,
    source_node_attempt_id: stringId,
    source_execution_mode: { enum: [...TOPIC_SELECTION_AGENT_EXECUTION_MODES] },
    reuse_source_kind: { enum: [...TOPIC_SELECTION_EXACT_RESPONSE_REUSE_SOURCE_KINDS] },
    response_hash: hashString,
    prompt_packet_hash: hashString,
    context_packet_hashes: hashArray,
    schema_version: stringId,
    profile_hash: hashString,
    policy_version: stringId,
    approval_status: { enum: [...TOPIC_SELECTION_EXACT_RESPONSE_REUSE_APPROVAL_STATUSES] },
    approval_ref: nullableFunctionalRef,
    local_approval_setting_ref: nullableStringId,
    non_provider: { const: true },
  },
  anyOf: [
    {
      properties: {
        approval_status: { const: 'approved_by_operator' },
        approval_ref: topicSelectionFunctionalRefSchema,
      },
      required: ['approval_status', 'approval_ref'],
    },
    {
      properties: {
        approval_status: { const: 'approved_by_local_setting' },
        local_approval_setting_ref: stringId,
      },
      required: ['approval_status', 'local_approval_setting_ref'],
    },
    {
      properties: {
        reuse_source_kind: { const: 'mock_fixture' },
        approval_status: { const: 'fixture_replay' },
      },
      required: ['reuse_source_kind', 'approval_status'],
    },
  ],
} as const;

export const topicSelectionProviderTelemetrySnapshotSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'provider_id',
    'model_id',
    'input_tokens',
    'output_tokens',
    'total_tokens',
    'provider_side_cache_hit',
    'provider_side_cache_read_tokens',
    'provider_side_cache_write_tokens',
    'request_count',
  ],
  properties: {
    provider_id: stringId,
    model_id: stringId,
    input_tokens: { anyOf: [nonNegativeInteger, { type: 'null' }] },
    output_tokens: { anyOf: [nonNegativeInteger, { type: 'null' }] },
    total_tokens: { anyOf: [nonNegativeInteger, { type: 'null' }] },
    provider_side_cache_hit: { anyOf: [{ type: 'boolean' }, { type: 'null' }] },
    provider_side_cache_read_tokens: { anyOf: [nonNegativeInteger, { type: 'null' }] },
    provider_side_cache_write_tokens: { anyOf: [nonNegativeInteger, { type: 'null' }] },
    request_count: nonNegativeInteger,
  },
} as const;

export const topicSelectionRuntimeAuditEnvelopeSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'workflow_run_id',
    'node_id',
    'invocation_slot_id',
    'node_attempt_id',
    'runtime_invocation_context_hash',
    'execution_mode',
    'executor_kind',
    'run_mode',
    'profile_hash',
    'schema_version_ref',
    'policy_version',
    'prompt_template_id',
    'prompt_template_version',
    'model_option_id',
    'normalized_params_hash',
    'context_cache_result',
    'context_artifact_refs',
    'context_packet_hashes',
    'compression_report_ref',
    'prompt_packet_hash',
    'prompt_quality_report_ref',
    'token_budget_gate_result',
    'response_artifact_ref',
    'response_hash',
    'response_reuse_result',
    'response_reuse_provenance_ref',
    'schema_validation_result',
    'post_reuse_gate_result',
    'deterministic_gate_result',
    'authority_boundary_result',
    'provider_live_call',
    'provider_telemetry',
    'blocker_codes',
    'warning_codes',
  ],
  properties: {
    schema_version: { const: TOPIC_SELECTION_RUNTIME_AUDIT_ENVELOPE_SCHEMA_VERSION },
    workflow_run_id: stringId,
    node_id: stringId,
    invocation_slot_id: stringId,
    node_attempt_id: stringId,
    runtime_invocation_context_hash: hashString,
    execution_mode: { enum: [...TOPIC_SELECTION_AGENT_EXECUTION_MODES] },
    executor_kind: { enum: [...TOPIC_SELECTION_AGENT_EXECUTOR_KINDS] },
    run_mode: { enum: [...TOPIC_SELECTION_AGENT_RUN_MODES] },
    profile_hash: hashString,
    schema_version_ref: stringId,
    policy_version: stringId,
    prompt_template_id: stringId,
    prompt_template_version: stringId,
    model_option_id: nullableStringId,
    normalized_params_hash: nullableHashString,
    context_cache_result: { enum: [...TOPIC_SELECTION_RUNTIME_CACHE_RESULTS] },
    context_artifact_refs: functionalRefArray,
    context_packet_hashes: hashArray,
    compression_report_ref: nullableFunctionalRef,
    prompt_packet_hash: hashString,
    prompt_quality_report_ref: nullableFunctionalRef,
    token_budget_gate_result: topicSelectionTokenBudgetGateResultSchema,
    response_artifact_ref: nullableFunctionalRef,
    response_hash: nullableHashString,
    response_reuse_result: { enum: [...TOPIC_SELECTION_RESPONSE_REUSE_RESULTS] },
    response_reuse_provenance_ref: nullableFunctionalRef,
    schema_validation_result: { enum: [...TOPIC_SELECTION_SCHEMA_VALIDATION_RESULTS] },
    post_reuse_gate_result: { enum: [...TOPIC_SELECTION_RUNTIME_GATE_RESULTS] },
    deterministic_gate_result: { enum: [...TOPIC_SELECTION_RUNTIME_GATE_RESULTS] },
    authority_boundary_result: { enum: [...TOPIC_SELECTION_RUNTIME_GATE_RESULTS] },
    provider_live_call: { type: 'boolean' },
    provider_telemetry: {
      anyOf: [topicSelectionProviderTelemetrySnapshotSchema, { type: 'null' }],
    },
    blocker_codes: stringArray,
    warning_codes: stringArray,
  },
  allOf: [
    {
      if: {
        properties: { provider_live_call: { const: true } },
        required: ['provider_live_call'],
      },
      then: {
        properties: {
          execution_mode: { const: 'provider_llm' },
          provider_telemetry: topicSelectionProviderTelemetrySnapshotSchema,
        },
      },
    },
    {
      if: {
        properties: { provider_live_call: { const: false } },
        required: ['provider_live_call'],
      },
      then: {
        properties: {
          provider_telemetry: { type: 'null' },
        },
      },
    },
  ],
} as const;

export const topicSelectionOperatorAuditSummarySchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'projection_kind',
    'runtime_audit_envelope_ref',
    'runtime_audit_envelope_hash',
    'node_id',
    'invocation_slot_id',
    'execution_mode',
    'context_cache_result',
    'response_reuse_result',
    'token_budget_decision',
    'compression_applied',
    'provider_live_call',
    'blocker_codes',
    'warning_codes',
  ],
  properties: {
    schema_version: { const: TOPIC_SELECTION_OPERATOR_AUDIT_SUMMARY_SCHEMA_VERSION },
    projection_kind: { const: 'operator_audit_summary' },
    runtime_audit_envelope_ref: topicSelectionFunctionalRefSchema,
    runtime_audit_envelope_hash: hashString,
    node_id: stringId,
    invocation_slot_id: stringId,
    execution_mode: { enum: [...TOPIC_SELECTION_AGENT_EXECUTION_MODES] },
    context_cache_result: { enum: [...TOPIC_SELECTION_RUNTIME_CACHE_RESULTS] },
    response_reuse_result: { enum: [...TOPIC_SELECTION_RESPONSE_REUSE_RESULTS] },
    token_budget_decision: { enum: [...TOPIC_SELECTION_TOKEN_BUDGET_GATE_DECISIONS] },
    compression_applied: { type: 'boolean' },
    provider_live_call: { type: 'boolean' },
    blocker_codes: stringArray,
    warning_codes: stringArray,
  },
} as const;

export const topicSelectionHumanTrustSummarySchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'projection_kind',
    'runtime_audit_envelope_ref',
    'runtime_audit_envelope_hash',
    'node_id',
    'invocation_slot_id',
    'trust_summary',
    'relied_on_cached_context',
    'relied_on_cached_response',
    'provider_live_call',
    'residual_risk_codes',
    'required_human_checks',
  ],
  properties: {
    schema_version: { const: TOPIC_SELECTION_HUMAN_TRUST_SUMMARY_SCHEMA_VERSION },
    projection_kind: { const: 'human_trust_summary' },
    runtime_audit_envelope_ref: topicSelectionFunctionalRefSchema,
    runtime_audit_envelope_hash: hashString,
    node_id: stringId,
    invocation_slot_id: stringId,
    trust_summary: stringId,
    relied_on_cached_context: { type: 'boolean' },
    relied_on_cached_response: { type: 'boolean' },
    provider_live_call: { type: 'boolean' },
    residual_risk_codes: stringArray,
    required_human_checks: stringArray,
  },
} as const;
