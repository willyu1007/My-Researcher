import {
  TOPIC_SELECTION_AGENT_EXECUTION_MODES,
  type TopicSelectionAgentExecutionMode,
} from './topic-selection-need-validation-contracts.js';

export const TOPIC_SELECTION_AGENT_RUN_MODES = [
  'test',
  'acceptance',
  'product',
] as const;
export type TopicSelectionAgentRunMode = (typeof TOPIC_SELECTION_AGENT_RUN_MODES)[number];

export const TOPIC_SELECTION_MODEL_PROFILE_REGISTRY_SCHEMA_VERSION =
  'TopicSelectionModelProfileRegistry@v1' as const;

export const TOPIC_SELECTION_MODEL_PROFILE_STATUSES = [
  'active',
  'deprecated',
  'disabled',
] as const;
export type TopicSelectionModelProfileStatus =
  (typeof TOPIC_SELECTION_MODEL_PROFILE_STATUSES)[number];

export const TOPIC_SELECTION_MODEL_PROFILE_ROLE_FAMILIES = [
  'single_agent',
  'explorer',
  'deep_critic',
  'arbiter',
] as const;
export type TopicSelectionModelProfileRoleFamily =
  (typeof TOPIC_SELECTION_MODEL_PROFILE_ROLE_FAMILIES)[number];

export const TOPIC_SELECTION_MODEL_PROFILE_CREATIVITY_LEVELS = [
  'low',
  'medium',
  'high',
] as const;
export type TopicSelectionModelProfileCreativityLevel =
  (typeof TOPIC_SELECTION_MODEL_PROFILE_CREATIVITY_LEVELS)[number];

export const TOPIC_SELECTION_MODEL_PROFILE_REASONING_DEPTHS = [
  'none',
  'low',
  'medium',
  'high',
  'xhigh',
] as const;
export type TopicSelectionModelProfileReasoningDepth =
  (typeof TOPIC_SELECTION_MODEL_PROFILE_REASONING_DEPTHS)[number];

export const TOPIC_SELECTION_MODEL_PROFILE_OUTPUT_BUDGETS = [
  'small',
  'medium',
  'large',
] as const;
export type TopicSelectionModelProfileOutputBudget =
  (typeof TOPIC_SELECTION_MODEL_PROFILE_OUTPUT_BUDGETS)[number];

export const TOPIC_SELECTION_MODEL_PROFILE_OUTPUT_FORMATS = [
  'text',
  'json_object',
  'json_schema',
] as const;
export type TopicSelectionModelProfileOutputFormat =
  (typeof TOPIC_SELECTION_MODEL_PROFILE_OUTPUT_FORMATS)[number];

export interface TopicSelectionModelProfileNormalizedParams {
  creativity: TopicSelectionModelProfileCreativityLevel;
  reasoning_depth: TopicSelectionModelProfileReasoningDepth;
  output_budget: TopicSelectionModelProfileOutputBudget;
  structured_output_required: boolean;
  output_format: TopicSelectionModelProfileOutputFormat;
}

export interface TopicSelectionAgentExecutionSpec {
  execution_mode: TopicSelectionAgentExecutionMode;
  model_option_id?: string | null;
}

export const TOPIC_SELECTION_REGISTERED_PROVIDER_IDS = ['openai', 'dashscope', 'deepseek'] as const;
export type TopicSelectionRegisteredProviderId =
  (typeof TOPIC_SELECTION_REGISTERED_PROVIDER_IDS)[number];

export interface TopicSelectionOpenAiProviderOverrides {
  reasoning?: { effort: 'low' | 'medium' | 'high' };
}

export interface TopicSelectionDashScopeProviderOverrides {
  enable_thinking?: boolean;
}

export interface TopicSelectionDeepSeekProviderOverrides {
  thinking?: { type: 'enabled' | 'disabled' };
  reasoning_effort?: 'high' | 'max';
}

export type TopicSelectionProviderOverrides =
  | TopicSelectionOpenAiProviderOverrides
  | TopicSelectionDashScopeProviderOverrides
  | TopicSelectionDeepSeekProviderOverrides;

export interface TopicSelectionModelProfileRequestPolicy {
  timeout_ms?: number;
}

export interface TopicSelectionModelProfileCapabilityDegradePolicy {
  allow_optional_degrade: boolean;
}

export interface TopicSelectionModelOption {
  option_id: string;
  option_purpose: string;
  provider_id: TopicSelectionRegisteredProviderId;
  model_id: string;
  use_when: string[];
  request_policy?: TopicSelectionModelProfileRequestPolicy;
  normalized_params: TopicSelectionModelProfileNormalizedParams;
  provider_overrides: TopicSelectionProviderOverrides;
  capability_degrade_policy?: TopicSelectionModelProfileCapabilityDegradePolicy;
}

export interface TopicSelectionProviderFallbackPolicy {
  automatic_fallback: false;
  manual_rerun_allowed: boolean;
  explicit_profile_override_allowed: boolean;
  provider_failure_result: 'blocked';
  record_failure_artifact: boolean;
}

export interface TopicSelectionTechnicalRetryPolicy {
  enabled: boolean;
  max_provider_call_attempts: number;
  retryable_error_classes: string[];
  require_same_profile: boolean;
  require_same_model_option: boolean;
  require_same_prompt_packet_hash: boolean;
  require_same_context_packet_hashes: boolean;
}

export interface TopicSelectionSemanticRetryPolicy {
  enabled: false;
}

export interface TopicSelectionFailureHandlingProviderFallbackPolicy {
  automatic_fallback: false;
}

export interface TopicSelectionSupplementalRoundPolicy {
  is_retry: false;
  requires_arbiter_scoped_questions: boolean;
}

export interface TopicSelectionModelProfileFailureHandlingPolicy {
  technical_retry: TopicSelectionTechnicalRetryPolicy;
  semantic_retry: TopicSelectionSemanticRetryPolicy;
  provider_fallback: TopicSelectionFailureHandlingProviderFallbackPolicy;
  supplemental_round: TopicSelectionSupplementalRoundPolicy;
}

export interface TopicSelectionModelProfileAuditPolicy {
  store_prompt_hash: boolean;
  store_response_hash: boolean;
  store_structured_output: boolean;
  store_raw_provider_response: boolean;
  forbid_hidden_reasoning: boolean;
}

export interface TopicSelectionModelProfileBudgetPolicy {
  max_provider_attempts: number;
  max_estimated_cost_usd?: number | null;
}

export type TopicSelectionModelProfileRunModeEligibility = Record<
  TopicSelectionAgentExecutionMode,
  TopicSelectionAgentRunMode[]
>;

export interface TopicSelectionModelProfile {
  profile_id: string;
  profile_version: string;
  status: TopicSelectionModelProfileStatus;
  profile_function: string;
  role_family: TopicSelectionModelProfileRoleFamily;
  stage_family: string;
  quality_objectives: string[];
  allowed_execution_modes: TopicSelectionAgentExecutionMode[];
  run_mode_eligibility: TopicSelectionModelProfileRunModeEligibility;
  required_capabilities: string[];
  output_contract: string;
  model_options: TopicSelectionModelOption[];
  provider_fallback_policy: TopicSelectionProviderFallbackPolicy;
  failure_handling_policy: TopicSelectionModelProfileFailureHandlingPolicy;
  audit_policy: TopicSelectionModelProfileAuditPolicy;
  budget_policy: TopicSelectionModelProfileBudgetPolicy;
}

export interface TopicSelectionModelProfileRegistry {
  schema_version: typeof TOPIC_SELECTION_MODEL_PROFILE_REGISTRY_SCHEMA_VERSION;
  profiles: TopicSelectionModelProfile[];
}

const stringId = { type: 'string', minLength: 1 } as const;
const nonNegativeInteger = { type: 'integer', minimum: 0 } as const;
const positiveInteger = { type: 'integer', minimum: 1 } as const;
const nullableNumber = { anyOf: [{ type: 'number' }, { type: 'null' }] } as const;
const stringArray = {
  type: 'array',
  items: stringId,
  minItems: 1,
} as const;

export const topicSelectionModelProfileNormalizedParamsSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'creativity',
    'reasoning_depth',
    'output_budget',
    'structured_output_required',
    'output_format',
  ],
  properties: {
    creativity: { enum: [...TOPIC_SELECTION_MODEL_PROFILE_CREATIVITY_LEVELS] },
    reasoning_depth: { enum: [...TOPIC_SELECTION_MODEL_PROFILE_REASONING_DEPTHS] },
    output_budget: { enum: [...TOPIC_SELECTION_MODEL_PROFILE_OUTPUT_BUDGETS] },
    structured_output_required: { type: 'boolean' },
    output_format: { enum: [...TOPIC_SELECTION_MODEL_PROFILE_OUTPUT_FORMATS] },
  },
} as const;

export const topicSelectionAgentExecutionSpecSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['execution_mode'],
  properties: {
    execution_mode: { enum: [...TOPIC_SELECTION_AGENT_EXECUTION_MODES] },
    model_option_id: {
      anyOf: [stringId, { type: 'null' }],
    },
  },
} as const;

export const topicSelectionModelOptionSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'option_id',
    'option_purpose',
    'provider_id',
    'model_id',
    'use_when',
    'normalized_params',
    'provider_overrides',
  ],
  properties: {
    option_id: stringId,
    option_purpose: stringId,
    provider_id: { enum: [...TOPIC_SELECTION_REGISTERED_PROVIDER_IDS] },
    model_id: stringId,
    use_when: stringArray,
    request_policy: {
      type: 'object',
      additionalProperties: false,
      properties: {
        timeout_ms: positiveInteger,
      },
    },
    normalized_params: topicSelectionModelProfileNormalizedParamsSchema,
    provider_overrides: {
      anyOf: [
        {
          type: 'object',
          additionalProperties: false,
          properties: {
            reasoning: {
              type: 'object',
              additionalProperties: false,
              required: ['effort'],
              properties: { effort: { enum: ['low', 'medium', 'high'] } },
            },
          },
        },
        {
          type: 'object',
          additionalProperties: false,
          properties: { enable_thinking: { type: 'boolean' } },
        },
        {
          type: 'object',
          additionalProperties: false,
          properties: {
            thinking: {
              type: 'object',
              additionalProperties: false,
              required: ['type'],
              properties: { type: { enum: ['enabled', 'disabled'] } },
            },
            reasoning_effort: { enum: ['high', 'max'] },
          },
        },
      ],
    },
    capability_degrade_policy: {
      type: 'object',
      additionalProperties: false,
      required: ['allow_optional_degrade'],
      properties: {
        allow_optional_degrade: { type: 'boolean' },
      },
    },
  },
} as const;

export const topicSelectionProviderFallbackPolicySchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'automatic_fallback',
    'manual_rerun_allowed',
    'explicit_profile_override_allowed',
    'provider_failure_result',
    'record_failure_artifact',
  ],
  properties: {
    automatic_fallback: { const: false },
    manual_rerun_allowed: { type: 'boolean' },
    explicit_profile_override_allowed: { type: 'boolean' },
    provider_failure_result: { const: 'blocked' },
    record_failure_artifact: { type: 'boolean' },
  },
} as const;

export const topicSelectionModelProfileFailureHandlingPolicySchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'technical_retry',
    'semantic_retry',
    'provider_fallback',
    'supplemental_round',
  ],
  properties: {
    technical_retry: {
      type: 'object',
      additionalProperties: false,
      required: [
        'enabled',
        'max_provider_call_attempts',
        'retryable_error_classes',
        'require_same_profile',
        'require_same_model_option',
        'require_same_prompt_packet_hash',
        'require_same_context_packet_hashes',
      ],
      properties: {
        enabled: { type: 'boolean' },
        max_provider_call_attempts: positiveInteger,
        retryable_error_classes: stringArray,
        require_same_profile: { type: 'boolean' },
        require_same_model_option: { type: 'boolean' },
        require_same_prompt_packet_hash: { type: 'boolean' },
        require_same_context_packet_hashes: { type: 'boolean' },
      },
    },
    semantic_retry: {
      type: 'object',
      additionalProperties: false,
      required: ['enabled'],
      properties: {
        enabled: { const: false },
      },
    },
    provider_fallback: {
      type: 'object',
      additionalProperties: false,
      required: ['automatic_fallback'],
      properties: {
        automatic_fallback: { const: false },
      },
    },
    supplemental_round: {
      type: 'object',
      additionalProperties: false,
      required: ['is_retry', 'requires_arbiter_scoped_questions'],
      properties: {
        is_retry: { const: false },
        requires_arbiter_scoped_questions: { type: 'boolean' },
      },
    },
  },
} as const;

export const topicSelectionModelProfileRunModeEligibilitySchema = {
  type: 'object',
  additionalProperties: false,
  required: [...TOPIC_SELECTION_AGENT_EXECUTION_MODES],
  properties: Object.fromEntries(
    TOPIC_SELECTION_AGENT_EXECUTION_MODES.map((mode) => [
      mode,
      {
        type: 'array',
        uniqueItems: true,
        items: { enum: [...TOPIC_SELECTION_AGENT_RUN_MODES] },
      },
    ]),
  ),
} as const;

export const topicSelectionModelProfileSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'profile_id',
    'profile_version',
    'status',
    'profile_function',
    'role_family',
    'stage_family',
    'quality_objectives',
    'allowed_execution_modes',
    'run_mode_eligibility',
    'required_capabilities',
    'output_contract',
    'model_options',
    'provider_fallback_policy',
    'failure_handling_policy',
    'audit_policy',
    'budget_policy',
  ],
  properties: {
    profile_id: stringId,
    profile_version: stringId,
    status: { enum: [...TOPIC_SELECTION_MODEL_PROFILE_STATUSES] },
    profile_function: stringId,
    role_family: { enum: [...TOPIC_SELECTION_MODEL_PROFILE_ROLE_FAMILIES] },
    stage_family: stringId,
    quality_objectives: stringArray,
    allowed_execution_modes: {
      type: 'array',
      minItems: 1,
      uniqueItems: true,
      items: { enum: [...TOPIC_SELECTION_AGENT_EXECUTION_MODES] },
    },
    run_mode_eligibility: topicSelectionModelProfileRunModeEligibilitySchema,
    required_capabilities: stringArray,
    output_contract: stringId,
    model_options: {
      type: 'array',
      items: topicSelectionModelOptionSchema,
    },
    provider_fallback_policy: topicSelectionProviderFallbackPolicySchema,
    failure_handling_policy: topicSelectionModelProfileFailureHandlingPolicySchema,
    audit_policy: {
      type: 'object',
      additionalProperties: false,
      required: [
        'store_prompt_hash',
        'store_response_hash',
        'store_structured_output',
        'store_raw_provider_response',
        'forbid_hidden_reasoning',
      ],
      properties: {
        store_prompt_hash: { type: 'boolean' },
        store_response_hash: { type: 'boolean' },
        store_structured_output: { type: 'boolean' },
        store_raw_provider_response: { type: 'boolean' },
        forbid_hidden_reasoning: { type: 'boolean' },
      },
    },
    budget_policy: {
      type: 'object',
      additionalProperties: false,
      required: ['max_provider_attempts'],
      properties: {
        max_provider_attempts: nonNegativeInteger,
        max_estimated_cost_usd: nullableNumber,
      },
    },
  },
} as const;

export const topicSelectionModelProfileRegistrySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['schema_version', 'profiles'],
  properties: {
    schema_version: { const: TOPIC_SELECTION_MODEL_PROFILE_REGISTRY_SCHEMA_VERSION },
    profiles: {
      type: 'array',
      minItems: 1,
      items: topicSelectionModelProfileSchema,
    },
  },
} as const;
