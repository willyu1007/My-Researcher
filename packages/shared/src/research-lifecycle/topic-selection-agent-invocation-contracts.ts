import {
  topicSelectionFunctionalRefSchema,
  type TopicSelectionFunctionalRef,
} from './topic-selection-control-plane-contracts.js';
import {
  TOPIC_SELECTION_AGENT_EXECUTION_MODES,
  type TopicSelectionAgentExecutionMode,
} from './topic-selection-need-validation-contracts.js';
import {
  TOPIC_SELECTION_AGENT_RUN_MODES,
  type TopicSelectionAgentRunMode,
} from './topic-selection-agent-profile-contracts.js';
import {
  TOPIC_SELECTION_RUNTIME_CACHE_RESULTS,
  type TopicSelectionRuntimeCacheResult,
} from './topic-selection-runtime-common-contracts.js';

export const TOPIC_SELECTION_AGENT_INVOCATION_AUDIT_SCHEMA_VERSION =
  'topic-selection-agent-invocation-audit-v1' as const;

export const TOPIC_SELECTION_AGENT_EXECUTOR_KINDS = [
  'single_agent',
  'multi_agent_debate',
  'codex_assisted',
] as const;
export type TopicSelectionExecutorKind = (typeof TOPIC_SELECTION_AGENT_EXECUTOR_KINDS)[number];

export const TOPIC_SELECTION_AGENT_INVOCATION_STATUSES = [
  'succeeded',
  'blocked',
  'require_human_review',
  'failed',
] as const;
export type TopicSelectionAgentInvocationStatus =
  (typeof TOPIC_SELECTION_AGENT_INVOCATION_STATUSES)[number];

export const TOPIC_SELECTION_AGENT_OUTPUT_SOURCE_KINDS = [
  'mock_fixture',
  'codex_response',
  'provider_response',
] as const;
export type TopicSelectionAgentOutputSourceKind =
  (typeof TOPIC_SELECTION_AGENT_OUTPUT_SOURCE_KINDS)[number];

export const TOPIC_SELECTION_AGENT_INVOCATION_CACHE_STATUSES = [
  'miss',
  'hit',
  'bypassed',
  'not_applicable',
] as const;
export type TopicSelectionAgentInvocationCacheStatus =
  (typeof TOPIC_SELECTION_AGENT_INVOCATION_CACHE_STATUSES)[number];

export const TOPIC_SELECTION_AGENT_TOKEN_BUDGET_GATE_DECISIONS = [
  'within_budget',
  'requires_compression',
  'blocked_over_budget',
  'budget_unknown_allow_with_warning',
] as const;
export type TopicSelectionAgentTokenBudgetGateDecision =
  (typeof TOPIC_SELECTION_AGENT_TOKEN_BUDGET_GATE_DECISIONS)[number];

export interface TopicSelectionAgentInvocationTelemetrySummary {
  provider_id: string;
  model_id: string;
  profile_id: string | null;
  prompt_template_id: string | null;
  prompt_template_version: string | null;
  elapsed_ms: number;
  request_count: number;
  retry_count: number;
  timeout_count: number;
  rate_limit_count: number;
  input_tokens: number | null;
  output_tokens: number | null;
  embedding_input_tokens: number | null;
  total_tokens: number | null;
  cost_usd: number | null;
  provider_side_cache_hit: boolean | null;
  provider_side_cache_read_tokens: number | null;
  provider_side_cache_write_tokens: number | null;
}

export interface TopicSelectionAgentDebateExtension {
  debate_loop_id: string;
  debate_policy_id: string;
  round_index: number;
  role: 'explorer' | 'deep_critic' | 'arbiter';
  stage: string;
  agent_instance_id: string;
  parent_invocation_attempt_ids: string[];
  role_level_summary_ref?: TopicSelectionFunctionalRef | null;
  arbiter_issue_frame_ref?: TopicSelectionFunctionalRef | null;
  arbiter_final_artifact_ref?: TopicSelectionFunctionalRef | null;
}

export interface TopicSelectionAgentValidationSummary {
  valid: boolean;
  error_count: number;
  errors: string[];
}

export interface TopicSelectionAgentInvocationProvenance {
  workflow_run_id: string;
  node_id: string;
  node_attempt_id: string;
  invocation_attempt_id: string;
  execution_mode: TopicSelectionAgentExecutionMode;
  executor_kind: TopicSelectionExecutorKind;
  source_kind: TopicSelectionAgentOutputSourceKind;
  non_provider: boolean;
  run_mode: TopicSelectionAgentRunMode;
  profile_id: string;
  profile_version: string;
  profile_hash: string;
  model_option_id: string | null;
  normalized_params_hash: string | null;
  capability_degraded: boolean;
  capability_degrade_reason: string | null;
  output_contract: string;
  prompt_template_id: string;
  prompt_template_version: string;
  schema_name: string;
  prompt_packet_hash: string;
  prompt_packet_cache_status?: TopicSelectionRuntimeCacheResult | null;
  prompt_packet_cache_result_ref?: TopicSelectionFunctionalRef | null;
  prompt_packet_cache_result_hash?: string | null;
  redacted_prompt_artifact_ref?: TopicSelectionFunctionalRef | null;
  prompt_quality_report_ref?: TopicSelectionFunctionalRef | null;
  response_hash: string | null;
  structured_output_hash: string | null;
  cache_status: TopicSelectionAgentInvocationCacheStatus;
  response_reuse_ref: string | null;
  compression_report_ref?: TopicSelectionFunctionalRef | null;
  compression_report_hash?: string | null;
  compressed_context_hash?: string | null;
  fixture_id?: string | null;
  fixture_hash?: string | null;
  mock_profile?: string | null;
  operator_label?: string | null;
  operator_approval_ref?: TopicSelectionFunctionalRef | null;
  local_approval_setting_ref?: string | null;
  response_source?: 'operator_supplied' | 'cached_exact_invocation' | null;
  provider_id?: string | null;
  model_id?: string | null;
  telemetry: TopicSelectionAgentInvocationTelemetrySummary | null;
  debate_extension?: TopicSelectionAgentDebateExtension | null;
}

export interface TopicSelectionAgentTokenBudgetGateResult {
  provider_id: string | null;
  model_id: string | null;
  profile_id: string;
  model_option_id: string | null;
  estimated_input_tokens: number | null;
  estimated_output_tokens: number;
  context_window_tokens: number | null;
  schema_overhead_tokens: number | null;
  decision: TopicSelectionAgentTokenBudgetGateDecision;
  compression_strategy_ref: TopicSelectionFunctionalRef | null;
  blocker_codes: string[];
  warning_codes: string[];
}

export interface TopicSelectionAgentInvocationAuditSnapshot {
  schema_version: typeof TOPIC_SELECTION_AGENT_INVOCATION_AUDIT_SCHEMA_VERSION;
  node_id: string;
  workflow_run_id: string;
  node_attempt_id: string;
  status: TopicSelectionAgentInvocationStatus;
  provenance: TopicSelectionAgentInvocationProvenance;
  token_budget_gate_result: TopicSelectionAgentTokenBudgetGateResult | null;
  validation: TopicSelectionAgentValidationSummary;
  warning_codes: string[];
  blocker_codes: string[];
  created_at: string;
}

const stringId = { type: 'string', minLength: 1 } as const;
const hashString = { type: 'string', pattern: '^[a-f0-9]{64}$' } as const;
const nullableStringId = { anyOf: [stringId, { type: 'null' }] } as const;
const nullableHashString = { anyOf: [hashString, { type: 'null' }] } as const;
const nullableNumber = { anyOf: [{ type: 'number' }, { type: 'null' }] } as const;
const stringArray = { type: 'array', items: stringId } as const;
const nullableFunctionalRef = {
  anyOf: [topicSelectionFunctionalRefSchema, { type: 'null' }],
} as const;

export const topicSelectionAgentInvocationTelemetrySummarySchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'provider_id',
    'model_id',
    'profile_id',
    'prompt_template_id',
    'prompt_template_version',
    'elapsed_ms',
    'request_count',
    'retry_count',
    'timeout_count',
    'rate_limit_count',
    'input_tokens',
    'output_tokens',
    'embedding_input_tokens',
    'total_tokens',
    'cost_usd',
    'provider_side_cache_hit',
    'provider_side_cache_read_tokens',
    'provider_side_cache_write_tokens',
  ],
  properties: {
    provider_id: stringId,
    model_id: stringId,
    profile_id: nullableStringId,
    prompt_template_id: nullableStringId,
    prompt_template_version: nullableStringId,
    elapsed_ms: { type: 'number', minimum: 0 },
    request_count: { type: 'integer', minimum: 0 },
    retry_count: { type: 'integer', minimum: 0 },
    timeout_count: { type: 'integer', minimum: 0 },
    rate_limit_count: { type: 'integer', minimum: 0 },
    input_tokens: nullableNumber,
    output_tokens: nullableNumber,
    embedding_input_tokens: nullableNumber,
    total_tokens: nullableNumber,
    cost_usd: nullableNumber,
    provider_side_cache_hit: { anyOf: [{ type: 'boolean' }, { type: 'null' }] },
    provider_side_cache_read_tokens: { anyOf: [{ type: 'integer', minimum: 0 }, { type: 'null' }] },
    provider_side_cache_write_tokens: { anyOf: [{ type: 'integer', minimum: 0 }, { type: 'null' }] },
  },
} as const;

export const topicSelectionAgentDebateExtensionSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'debate_loop_id',
    'debate_policy_id',
    'round_index',
    'role',
    'stage',
    'agent_instance_id',
    'parent_invocation_attempt_ids',
  ],
  properties: {
    debate_loop_id: stringId,
    debate_policy_id: stringId,
    round_index: { type: 'integer', minimum: 1 },
    role: { enum: ['explorer', 'deep_critic', 'arbiter'] },
    stage: stringId,
    agent_instance_id: stringId,
    parent_invocation_attempt_ids: stringArray,
    role_level_summary_ref: nullableFunctionalRef,
    arbiter_issue_frame_ref: nullableFunctionalRef,
    arbiter_final_artifact_ref: nullableFunctionalRef,
  },
} as const;

export const topicSelectionAgentValidationSummarySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['valid', 'error_count', 'errors'],
  properties: {
    valid: { type: 'boolean' },
    error_count: { type: 'integer', minimum: 0 },
    errors: { type: 'array', items: { type: 'string' } },
  },
} as const;

export const topicSelectionAgentInvocationProvenanceSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'workflow_run_id',
    'node_id',
    'node_attempt_id',
    'invocation_attempt_id',
    'execution_mode',
    'executor_kind',
    'source_kind',
    'non_provider',
    'run_mode',
    'profile_id',
    'profile_version',
    'profile_hash',
    'model_option_id',
    'normalized_params_hash',
    'capability_degraded',
    'capability_degrade_reason',
    'output_contract',
    'prompt_template_id',
    'prompt_template_version',
    'schema_name',
    'prompt_packet_hash',
    'response_hash',
    'structured_output_hash',
    'cache_status',
    'response_reuse_ref',
    'telemetry',
  ],
  properties: {
    workflow_run_id: stringId,
    node_id: stringId,
    node_attempt_id: stringId,
    invocation_attempt_id: stringId,
    execution_mode: { enum: [...TOPIC_SELECTION_AGENT_EXECUTION_MODES] },
    executor_kind: { enum: [...TOPIC_SELECTION_AGENT_EXECUTOR_KINDS] },
    source_kind: { enum: [...TOPIC_SELECTION_AGENT_OUTPUT_SOURCE_KINDS] },
    non_provider: { type: 'boolean' },
    run_mode: { enum: [...TOPIC_SELECTION_AGENT_RUN_MODES] },
    profile_id: stringId,
    profile_version: stringId,
    profile_hash: hashString,
    model_option_id: nullableStringId,
    normalized_params_hash: nullableHashString,
    capability_degraded: { type: 'boolean' },
    capability_degrade_reason: nullableStringId,
    output_contract: stringId,
    prompt_template_id: stringId,
    prompt_template_version: stringId,
    schema_name: stringId,
    prompt_packet_hash: hashString,
    prompt_packet_cache_status: {
      anyOf: [{ enum: [...TOPIC_SELECTION_RUNTIME_CACHE_RESULTS] }, { type: 'null' }],
    },
    prompt_packet_cache_result_ref: nullableFunctionalRef,
    prompt_packet_cache_result_hash: nullableHashString,
    redacted_prompt_artifact_ref: nullableFunctionalRef,
    prompt_quality_report_ref: nullableFunctionalRef,
    response_hash: nullableHashString,
    structured_output_hash: nullableHashString,
    cache_status: { enum: [...TOPIC_SELECTION_AGENT_INVOCATION_CACHE_STATUSES] },
    response_reuse_ref: nullableStringId,
    compression_report_ref: nullableFunctionalRef,
    compression_report_hash: nullableHashString,
    compressed_context_hash: nullableHashString,
    fixture_id: nullableStringId,
    fixture_hash: nullableHashString,
    mock_profile: nullableStringId,
    operator_label: nullableStringId,
    operator_approval_ref: nullableFunctionalRef,
    local_approval_setting_ref: nullableStringId,
    response_source: {
      anyOf: [
        { enum: ['operator_supplied', 'cached_exact_invocation'] },
        { type: 'null' },
      ],
    },
    provider_id: nullableStringId,
    model_id: nullableStringId,
    telemetry: {
      anyOf: [topicSelectionAgentInvocationTelemetrySummarySchema, { type: 'null' }],
    },
    debate_extension: {
      anyOf: [topicSelectionAgentDebateExtensionSchema, { type: 'null' }],
    },
  },
  allOf: [
    {
      if: {
        properties: { source_kind: { const: 'provider_response' } },
        required: ['source_kind'],
      },
      then: {
        required: ['provider_id', 'model_id'],
        properties: {
          non_provider: { const: false },
          provider_id: stringId,
          model_id: stringId,
          model_option_id: stringId,
          normalized_params_hash: hashString,
        },
      },
    },
    {
      if: {
        properties: { source_kind: { const: 'mock_fixture' } },
        required: ['source_kind'],
      },
      then: {
        required: ['fixture_id'],
        properties: {
          non_provider: { const: true },
          fixture_id: stringId,
          model_option_id: { const: null },
          normalized_params_hash: { const: null },
        },
      },
    },
    {
      if: {
        properties: { source_kind: { const: 'codex_response' } },
        required: ['source_kind'],
      },
      then: {
        required: ['operator_label'],
        properties: {
          non_provider: { const: true },
          operator_label: stringId,
          model_option_id: { const: null },
          normalized_params_hash: { const: null },
        },
      },
    },
  ],
} as const;

export const topicSelectionAgentTokenBudgetGateResultSchema = {
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
    estimated_input_tokens: { anyOf: [{ type: 'integer', minimum: 0 }, { type: 'null' }] },
    estimated_output_tokens: { type: 'integer', minimum: 0 },
    context_window_tokens: { anyOf: [{ type: 'integer', minimum: 0 }, { type: 'null' }] },
    schema_overhead_tokens: { anyOf: [{ type: 'integer', minimum: 0 }, { type: 'null' }] },
    decision: { enum: [...TOPIC_SELECTION_AGENT_TOKEN_BUDGET_GATE_DECISIONS] },
    compression_strategy_ref: nullableFunctionalRef,
    blocker_codes: { type: 'array', items: { type: 'string' } },
    warning_codes: { type: 'array', items: { type: 'string' } },
  },
} as const;

export const topicSelectionAgentInvocationAuditSnapshotSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'node_id',
    'workflow_run_id',
    'node_attempt_id',
    'status',
    'provenance',
    'token_budget_gate_result',
    'validation',
    'warning_codes',
    'blocker_codes',
    'created_at',
  ],
  properties: {
    schema_version: { const: TOPIC_SELECTION_AGENT_INVOCATION_AUDIT_SCHEMA_VERSION },
    node_id: stringId,
    workflow_run_id: stringId,
    node_attempt_id: stringId,
    status: { enum: [...TOPIC_SELECTION_AGENT_INVOCATION_STATUSES] },
    provenance: topicSelectionAgentInvocationProvenanceSchema,
    token_budget_gate_result: {
      anyOf: [topicSelectionAgentTokenBudgetGateResultSchema, { type: 'null' }],
    },
    validation: topicSelectionAgentValidationSummarySchema,
    warning_codes: { type: 'array', items: { type: 'string' } },
    blocker_codes: { type: 'array', items: { type: 'string' } },
    created_at: stringId,
  },
} as const;
