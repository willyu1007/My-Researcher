import {
  TOPIC_SELECTION_AGENT_EXECUTION_MODES,
  type TopicSelectionAgentExecutionMode,
} from './topic-selection-need-validation-contracts.js';
import {
  TOPIC_SELECTION_AGENT_RUN_MODES,
  topicSelectionAgentExecutionSpecSchema,
  type TopicSelectionAgentExecutionSpec,
  type TopicSelectionAgentRunMode,
} from './topic-selection-agent-profile-contracts.js';
import {
  TOPIC_SELECTION_V1B_N6_DEBATE_ARBITER_PROFILE_ID,
  TOPIC_SELECTION_V1B_N6_DEBATE_CRITIC_PROFILE_ID,
  TOPIC_SELECTION_V1B_N6_DEBATE_EXPLORER_PROFILE_ID,
  TOPIC_SELECTION_V1B_N6_DIVERGENT_DEBATE_ROLE_ORDER,
} from './topic-selection-v1b-workflow-harness-contracts.js';

export const TOPIC_SELECTION_DEBATE_SCENARIO_CONTRACT_SCHEMA_VERSION =
  'TopicSelectionDebateScenarioContract@v1' as const;

export const TOPIC_SELECTION_DEBATE_SCENARIO_STATUSES = [
  'active',
  'deprecated',
  'disabled',
] as const;
export type TopicSelectionDebateScenarioStatus =
  (typeof TOPIC_SELECTION_DEBATE_SCENARIO_STATUSES)[number];

export const TOPIC_SELECTION_DEBATE_ROLES = [
  'explorer',
  'deep_critic',
  'arbiter',
] as const;
export type TopicSelectionDebateRole = (typeof TOPIC_SELECTION_DEBATE_ROLES)[number];

export const TOPIC_SELECTION_DEBATE_CONTEXT_FAMILIES = [
  'exploration_context',
  'arbiter_context',
] as const;
export type TopicSelectionDebateContextFamily =
  (typeof TOPIC_SELECTION_DEBATE_CONTEXT_FAMILIES)[number];

export const TOPIC_SELECTION_DEBATE_MERGE_OUTPUT_MODES = [
  'role_level_summary',
  'arbiter_decision',
  'external_structured_output',
] as const;
export type TopicSelectionDebateMergeOutputMode =
  (typeof TOPIC_SELECTION_DEBATE_MERGE_OUTPUT_MODES)[number];

export interface TopicSelectionDebateInstancePolicy {
  min_instances: number;
  max_instances: number;
  default_instances: number;
  allow_duplicate_model_options: boolean;
  diversity_policy?: string | null;
  merge_output_as: TopicSelectionDebateMergeOutputMode;
}

export interface TopicSelectionDebateCodexSubstitutionPolicy {
  allowed: boolean;
  requires_operator_approval: boolean;
  allowed_run_modes: TopicSelectionAgentRunMode[];
}

export interface TopicSelectionDebateRoleStageSlot {
  slot_id: string;
  role: TopicSelectionDebateRole;
  stage: string;
  profile_id: string;
  input_context_family: TopicSelectionDebateContextFamily;
  output_contract: string;
  schema_name: string;
  prompt_template_id: string;
  prompt_template_version: string;
  instance_policy: TopicSelectionDebateInstancePolicy;
  allowed_execution_modes: TopicSelectionAgentExecutionMode[];
  codex_substitution_policy: TopicSelectionDebateCodexSubstitutionPolicy;
}

export interface TopicSelectionDebateProviderSelectionPolicy {
  default_model_option_use_when: string;
  explicit_model_option_allowed: boolean;
  automatic_fallback: false;
  provider_failure_result: 'blocked';
}

export interface TopicSelectionDebateFailurePolicy {
  max_rounds: number;
  llm_failure_result: 'blocked';
  malformed_output_result: 'blocked';
  supplemental_round_is_retry: false;
  require_manual_rerun_for_provider_change: boolean;
}

export interface TopicSelectionDebateArtifactContract {
  required_artifact_keys: string[];
  forbid_raw_debate_transcript: boolean;
  forbid_hidden_reasoning: boolean;
  final_external_output_slot_id: string;
}

export interface TopicSelectionDebateValidationContract {
  required_downstream_gates: string[];
  authority_object: string;
  forbidden_authority_objects: string[];
  max_persisted_candidates: number;
}

export interface TopicSelectionDebateScenarioContract {
  schema_version: typeof TOPIC_SELECTION_DEBATE_SCENARIO_CONTRACT_SCHEMA_VERSION;
  scenario_id: string;
  node_id: string;
  debate_policy_id: string;
  contract_version: string;
  status: TopicSelectionDebateScenarioStatus;
  role_stage_slots: TopicSelectionDebateRoleStageSlot[];
  provider_selection_policy: TopicSelectionDebateProviderSelectionPolicy;
  failure_policy: TopicSelectionDebateFailurePolicy;
  artifact_contract: TopicSelectionDebateArtifactContract;
  validation_contract: TopicSelectionDebateValidationContract;
}

const stringId = { type: 'string', minLength: 1 } as const;
const positiveInteger = { type: 'integer', minimum: 1 } as const;
const stringArray = {
  type: 'array',
  items: stringId,
  minItems: 1,
} as const;

export const topicSelectionDebateInstancePolicySchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'min_instances',
    'max_instances',
    'default_instances',
    'allow_duplicate_model_options',
    'merge_output_as',
  ],
  properties: {
    min_instances: positiveInteger,
    max_instances: positiveInteger,
    default_instances: positiveInteger,
    allow_duplicate_model_options: { type: 'boolean' },
    diversity_policy: {
      anyOf: [stringId, { type: 'null' }],
    },
    merge_output_as: { enum: [...TOPIC_SELECTION_DEBATE_MERGE_OUTPUT_MODES] },
  },
} as const;

export const topicSelectionDebateCodexSubstitutionPolicySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['allowed', 'requires_operator_approval', 'allowed_run_modes'],
  properties: {
    allowed: { type: 'boolean' },
    requires_operator_approval: { type: 'boolean' },
    allowed_run_modes: {
      type: 'array',
      uniqueItems: true,
      items: { enum: [...TOPIC_SELECTION_AGENT_RUN_MODES] },
    },
  },
} as const;

export const topicSelectionDebateRoleStageSlotSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'slot_id',
    'role',
    'stage',
    'profile_id',
    'input_context_family',
    'output_contract',
    'schema_name',
    'prompt_template_id',
    'prompt_template_version',
    'instance_policy',
    'allowed_execution_modes',
    'codex_substitution_policy',
  ],
  properties: {
    slot_id: stringId,
    role: { enum: [...TOPIC_SELECTION_DEBATE_ROLES] },
    stage: stringId,
    profile_id: stringId,
    input_context_family: { enum: [...TOPIC_SELECTION_DEBATE_CONTEXT_FAMILIES] },
    output_contract: stringId,
    schema_name: stringId,
    prompt_template_id: stringId,
    prompt_template_version: stringId,
    instance_policy: topicSelectionDebateInstancePolicySchema,
    allowed_execution_modes: {
      type: 'array',
      minItems: 1,
      uniqueItems: true,
      items: { enum: [...TOPIC_SELECTION_AGENT_EXECUTION_MODES] },
    },
    codex_substitution_policy: topicSelectionDebateCodexSubstitutionPolicySchema,
  },
} as const;

export const topicSelectionDebateScenarioContractSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'scenario_id',
    'node_id',
    'debate_policy_id',
    'contract_version',
    'status',
    'role_stage_slots',
    'provider_selection_policy',
    'failure_policy',
    'artifact_contract',
    'validation_contract',
  ],
  properties: {
    schema_version: { const: TOPIC_SELECTION_DEBATE_SCENARIO_CONTRACT_SCHEMA_VERSION },
    scenario_id: stringId,
    node_id: stringId,
    debate_policy_id: stringId,
    contract_version: stringId,
    status: { enum: [...TOPIC_SELECTION_DEBATE_SCENARIO_STATUSES] },
    role_stage_slots: {
      type: 'array',
      minItems: 1,
      items: topicSelectionDebateRoleStageSlotSchema,
    },
    provider_selection_policy: {
      type: 'object',
      additionalProperties: false,
      required: [
        'default_model_option_use_when',
        'explicit_model_option_allowed',
        'automatic_fallback',
        'provider_failure_result',
      ],
      properties: {
        default_model_option_use_when: stringId,
        explicit_model_option_allowed: { type: 'boolean' },
        automatic_fallback: { const: false },
        provider_failure_result: { const: 'blocked' },
      },
    },
    failure_policy: {
      type: 'object',
      additionalProperties: false,
      required: [
        'max_rounds',
        'llm_failure_result',
        'malformed_output_result',
        'supplemental_round_is_retry',
        'require_manual_rerun_for_provider_change',
      ],
      properties: {
        max_rounds: { type: 'integer', minimum: 1, maximum: 3 },
        llm_failure_result: { const: 'blocked' },
        malformed_output_result: { const: 'blocked' },
        supplemental_round_is_retry: { const: false },
        require_manual_rerun_for_provider_change: { type: 'boolean' },
      },
    },
    artifact_contract: {
      type: 'object',
      additionalProperties: false,
      required: [
        'required_artifact_keys',
        'forbid_raw_debate_transcript',
        'forbid_hidden_reasoning',
        'final_external_output_slot_id',
      ],
      properties: {
        required_artifact_keys: stringArray,
        forbid_raw_debate_transcript: { type: 'boolean' },
        forbid_hidden_reasoning: { type: 'boolean' },
        final_external_output_slot_id: stringId,
      },
    },
    validation_contract: {
      type: 'object',
      additionalProperties: false,
      required: [
        'required_downstream_gates',
        'authority_object',
        'forbidden_authority_objects',
        'max_persisted_candidates',
      ],
      properties: {
        required_downstream_gates: stringArray,
        authority_object: stringId,
        forbidden_authority_objects: stringArray,
        max_persisted_candidates: positiveInteger,
      },
    },
  },
} as const;

export const TOPIC_SELECTION_V1A_GENERATE_NEED_CANDIDATE_DEBATE_SCENARIO_ID =
  'topic-selection.debate.v1a-need-discovery.v1' as const;
export const TOPIC_SELECTION_V1A_GENERATE_NEED_CANDIDATE_NODE_ID =
  'topic-selection.v1a.generate-need-candidate.v1' as const;
export const TOPIC_SELECTION_NEED_DISCOVERY_DEBATE_POLICY_ID =
  'topic-selection.need-discovery.debate.v1' as const;
export const TOPIC_SELECTION_V1A_GENERATE_NEED_CANDIDATE_DEBATE_SLOT_IDS = [
  'explorer.round_1_discovery',
  'deep_critic.round_1_discovery',
  'arbiter.issue_framing',
  'arbiter.final_synthesis',
] as const;
export type TopicSelectionV1aGenerateNeedCandidateDebateSlotId =
  (typeof TOPIC_SELECTION_V1A_GENERATE_NEED_CANDIDATE_DEBATE_SLOT_IDS)[number];

export type TopicSelectionV1aGenerateNeedCandidateDebateSlotExecutionOverrides =
  Partial<Record<TopicSelectionV1aGenerateNeedCandidateDebateSlotId, TopicSelectionAgentExecutionMode>>;

export type TopicSelectionV1aGenerateNeedCandidateDebateSlotModelOptionOverrides =
  Partial<Record<TopicSelectionV1aGenerateNeedCandidateDebateSlotId, string>>;

export type TopicSelectionV1aGenerateNeedCandidateDebateSlotExecutionPlan =
  Partial<Record<TopicSelectionV1aGenerateNeedCandidateDebateSlotId, TopicSelectionAgentExecutionSpec>>;

export type TopicSelectionV1aGenerateNeedCandidateDebateInstanceExecutionPlan =
  Record<string, TopicSelectionAgentExecutionSpec>;

export interface TopicSelectionV1aGenerateNeedCandidateDebateExecutionPlan {
  default?: TopicSelectionAgentExecutionSpec | null;
  slots?: TopicSelectionV1aGenerateNeedCandidateDebateSlotExecutionPlan | null;
  instances?: TopicSelectionV1aGenerateNeedCandidateDebateInstanceExecutionPlan | null;
}

const v1aDebateSlotExecutionPlanProperties = Object.fromEntries(
  TOPIC_SELECTION_V1A_GENERATE_NEED_CANDIDATE_DEBATE_SLOT_IDS.map((slotId) => [
    slotId,
    topicSelectionAgentExecutionSpecSchema,
  ]),
) as Record<TopicSelectionV1aGenerateNeedCandidateDebateSlotId, typeof topicSelectionAgentExecutionSpecSchema>;

export const topicSelectionV1aGenerateNeedCandidateDebateExecutionPlanSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    default: {
      anyOf: [topicSelectionAgentExecutionSpecSchema, { type: 'null' }],
    },
    slots: {
      anyOf: [
        {
          type: 'object',
          propertyNames: {
            enum: [...TOPIC_SELECTION_V1A_GENERATE_NEED_CANDIDATE_DEBATE_SLOT_IDS],
          },
          additionalProperties: false,
          properties: v1aDebateSlotExecutionPlanProperties,
        },
        { type: 'null' },
      ],
    },
    instances: {
      anyOf: [
        {
          type: 'object',
          additionalProperties: topicSelectionAgentExecutionSpecSchema,
        },
        { type: 'null' },
      ],
    },
  },
} as const;

export function createTopicSelectionV1aGenerateNeedCandidateDebateScenarioContract(): TopicSelectionDebateScenarioContract {
  return {
    schema_version: TOPIC_SELECTION_DEBATE_SCENARIO_CONTRACT_SCHEMA_VERSION,
    scenario_id: TOPIC_SELECTION_V1A_GENERATE_NEED_CANDIDATE_DEBATE_SCENARIO_ID,
    node_id: TOPIC_SELECTION_V1A_GENERATE_NEED_CANDIDATE_NODE_ID,
    debate_policy_id: TOPIC_SELECTION_NEED_DISCOVERY_DEBATE_POLICY_ID,
    contract_version: 'v1',
    status: 'active',
    role_stage_slots: [
      {
        slot_id: 'explorer.round_1_discovery',
        role: 'explorer',
        stage: 'round_1_discovery',
        profile_id: 'topic-selection.need-discovery.explorer.v1',
        input_context_family: 'exploration_context',
        output_contract: 'NeedDiscoveryExplorerNotes@v1',
        schema_name: 'topic_selection_need_discovery_explorer_notes',
        prompt_template_id: 'topic-selection-need-discovery-explorer',
        prompt_template_version: 'v1',
        instance_policy: {
          min_instances: 1,
          max_instances: 3,
          default_instances: 2,
          allow_duplicate_model_options: true,
          diversity_policy: 'prefer_prompt_or_context_angle_diversity',
          merge_output_as: 'role_level_summary',
        },
        allowed_execution_modes: ['mocked_llm', 'provider_llm', 'codex_assisted'],
        codex_substitution_policy: {
          allowed: true,
          requires_operator_approval: false,
          allowed_run_modes: ['acceptance', 'product'],
        },
      },
      {
        slot_id: 'deep_critic.round_1_discovery',
        role: 'deep_critic',
        stage: 'round_1_discovery',
        profile_id: 'topic-selection.need-discovery.deep-critic.v1',
        input_context_family: 'exploration_context',
        output_contract: 'NeedDiscoveryDeepCriticNotes@v1',
        schema_name: 'topic_selection_need_discovery_deep_critic_notes',
        prompt_template_id: 'topic-selection-need-discovery-deep-critic',
        prompt_template_version: 'v1',
        instance_policy: {
          min_instances: 1,
          max_instances: 3,
          default_instances: 1,
          allow_duplicate_model_options: true,
          diversity_policy: 'prefer_critique_angle_diversity',
          merge_output_as: 'role_level_summary',
        },
        allowed_execution_modes: ['mocked_llm', 'provider_llm', 'codex_assisted'],
        codex_substitution_policy: {
          allowed: true,
          requires_operator_approval: false,
          allowed_run_modes: ['acceptance', 'product'],
        },
      },
      {
        slot_id: 'arbiter.issue_framing',
        role: 'arbiter',
        stage: 'issue_framing',
        profile_id: 'topic-selection.need-discovery.arbiter-framing.v1',
        input_context_family: 'arbiter_context',
        output_contract: 'DebateIssueFrame@v1',
        schema_name: 'topic_selection_need_discovery_debate_issue_frame',
        prompt_template_id: 'topic-selection-need-discovery-arbiter-issue-frame',
        prompt_template_version: 'v1',
        instance_policy: {
          min_instances: 1,
          max_instances: 1,
          default_instances: 1,
          allow_duplicate_model_options: false,
          diversity_policy: null,
          merge_output_as: 'arbiter_decision',
        },
        allowed_execution_modes: ['mocked_llm', 'provider_llm', 'codex_assisted'],
        codex_substitution_policy: {
          allowed: true,
          requires_operator_approval: false,
          allowed_run_modes: ['acceptance', 'product'],
        },
      },
      {
        slot_id: 'arbiter.final_synthesis',
        role: 'arbiter',
        stage: 'final_synthesis',
        profile_id: 'topic-selection.need-discovery.arbiter-final.v1',
        input_context_family: 'arbiter_context',
        output_contract: 'RankedCandidateDraftBatch@v1',
        schema_name: 'topic_selection_ranked_candidate_draft_batch',
        prompt_template_id: 'topic-selection-need-discovery-arbiter-final',
        prompt_template_version: 'v1',
        instance_policy: {
          min_instances: 1,
          max_instances: 1,
          default_instances: 1,
          allow_duplicate_model_options: false,
          diversity_policy: null,
          merge_output_as: 'external_structured_output',
        },
        allowed_execution_modes: ['mocked_llm', 'provider_llm'],
        codex_substitution_policy: {
          allowed: false,
          requires_operator_approval: false,
          allowed_run_modes: [],
        },
      },
    ],
    provider_selection_policy: {
      default_model_option_use_when: 'default_provider_run',
      explicit_model_option_allowed: true,
      automatic_fallback: false,
      provider_failure_result: 'blocked',
    },
    failure_policy: {
      max_rounds: 3,
      llm_failure_result: 'blocked',
      malformed_output_result: 'blocked',
      supplemental_round_is_retry: false,
      require_manual_rerun_for_provider_change: true,
    },
    artifact_contract: {
      required_artifact_keys: [
        'debate_role_output',
        'debate_role_level_summary',
        'debate_issue_frame',
        'debate_final_synthesis',
      ],
      forbid_raw_debate_transcript: true,
      forbid_hidden_reasoning: true,
      final_external_output_slot_id: 'arbiter.final_synthesis',
    },
    validation_contract: {
      required_downstream_gates: [
        'ranked_candidate_draft_batch_schema_validation',
        'candidate_draft_admission',
        'supplemental_round_routing',
        'persist_need_candidate_batch_command_validation',
      ],
      authority_object: 'NeedCandidate',
      forbidden_authority_objects: [
        'NeedCandidateSet',
        'ValidatedNeed',
        'TopicQuestionContract',
      ],
      max_persisted_candidates: 5,
    },
  };
}

// ── T-127 W-07 (D-T127-02) — v1b N6 divergent topic-question candidate debate ────────────────────
// Mirrors the V1A divergent scenario above (explorer/critic FAN OUT then a single arbiter), but with
// 3 stages — N8's repair + V1A's issue-framing fold into the single terminal arbiter, whose
// `external_structured_output` IS the gate-facing TopicQuestionCandidateSet draft. The slot_ids MUST
// match TOPIC_SELECTION_V1B_N6_DIVERGENT_DEBATE_ROLE_ORDER (harness-contracts) — the runtime walks
// runDivergentLoop over them; a cross-check test pins the agreement.
export const TOPIC_SELECTION_V1B_N6_DIVERGENT_DEBATE_SCENARIO_ID =
  'topic-selection.debate.v1b-n6-topic-candidates.v1' as const;
export const TOPIC_SELECTION_V1B_N6_GENERATE_TOPIC_QUESTION_CANDIDATES_NODE_ID =
  'topic-selection.v1b.generate-topic-question-candidates.v1' as const;
export const TOPIC_SELECTION_V1B_N6_DIVERGENT_DEBATE_POLICY_ID =
  'topic-selection.v1b.n6-divergent-candidate-debate.v1' as const;
// Single-sourced from the harness role order (the runtime walks runDivergentLoop over ROLE_ORDER, and
// the scenario's slot_ids MUST equal it) — re-exported so the runtime-order and scenario-config views
// cannot drift; the schema test still pins role_stage_slots[].slot_id against this.
export const TOPIC_SELECTION_V1B_N6_DIVERGENT_DEBATE_SLOT_IDS =
  TOPIC_SELECTION_V1B_N6_DIVERGENT_DEBATE_ROLE_ORDER;
export type TopicSelectionV1bN6DivergentDebateScenarioSlotId =
  (typeof TOPIC_SELECTION_V1B_N6_DIVERGENT_DEBATE_SLOT_IDS)[number];

export function createTopicSelectionV1bN6DivergentDebateScenarioContract(): TopicSelectionDebateScenarioContract {
  return {
    schema_version: TOPIC_SELECTION_DEBATE_SCENARIO_CONTRACT_SCHEMA_VERSION,
    scenario_id: TOPIC_SELECTION_V1B_N6_DIVERGENT_DEBATE_SCENARIO_ID,
    node_id: TOPIC_SELECTION_V1B_N6_GENERATE_TOPIC_QUESTION_CANDIDATES_NODE_ID,
    debate_policy_id: TOPIC_SELECTION_V1B_N6_DIVERGENT_DEBATE_POLICY_ID,
    contract_version: 'v1',
    status: 'active',
    role_stage_slots: [
      {
        slot_id: 'n6_debate_explorer',
        role: 'explorer',
        stage: 'fan_out_framing',
        profile_id: TOPIC_SELECTION_V1B_N6_DEBATE_EXPLORER_PROFILE_ID,
        input_context_family: 'exploration_context',
        output_contract: 'TopicSelectionV1bN6DivergentDebateRoleOutput@v1',
        schema_name: 'TopicSelectionV1bN6DivergentDebateRoleOutput@v1',
        prompt_template_id: 'topic-selection-v1b-n6-debate-explorer',
        prompt_template_version: 'v1',
        instance_policy: {
          min_instances: 1,
          max_instances: 3,
          default_instances: 2,
          allow_duplicate_model_options: true,
          diversity_policy: 'prefer_prompt_or_context_angle_diversity',
          merge_output_as: 'role_level_summary',
        },
        allowed_execution_modes: ['mocked_llm', 'provider_llm', 'codex_assisted'],
        codex_substitution_policy: {
          allowed: true,
          requires_operator_approval: false,
          allowed_run_modes: ['acceptance', 'product'],
        },
      },
      {
        slot_id: 'n6_debate_critic',
        role: 'deep_critic',
        stage: 'fan_out_challenge',
        profile_id: TOPIC_SELECTION_V1B_N6_DEBATE_CRITIC_PROFILE_ID,
        input_context_family: 'exploration_context',
        output_contract: 'TopicSelectionV1bN6DivergentDebateRoleOutput@v1',
        schema_name: 'TopicSelectionV1bN6DivergentDebateRoleOutput@v1',
        prompt_template_id: 'topic-selection-v1b-n6-debate-critic',
        prompt_template_version: 'v1',
        instance_policy: {
          min_instances: 1,
          max_instances: 3,
          default_instances: 1,
          allow_duplicate_model_options: true,
          diversity_policy: 'prefer_critique_angle_diversity',
          merge_output_as: 'role_level_summary',
        },
        allowed_execution_modes: ['mocked_llm', 'provider_llm', 'codex_assisted'],
        codex_substitution_policy: {
          allowed: true,
          requires_operator_approval: false,
          allowed_run_modes: ['acceptance', 'product'],
        },
      },
      {
        slot_id: 'n6_debate_arbiter',
        role: 'arbiter',
        stage: 'final_synthesis',
        profile_id: TOPIC_SELECTION_V1B_N6_DEBATE_ARBITER_PROFILE_ID,
        input_context_family: 'arbiter_context',
        output_contract: 'TopicSelectionV1bN6DivergentDebateRoleOutput@v1',
        schema_name: 'TopicSelectionV1bN6DivergentDebateRoleOutput@v1',
        prompt_template_id: 'topic-selection-v1b-n6-debate-arbiter',
        prompt_template_version: 'v1',
        instance_policy: {
          min_instances: 1,
          max_instances: 1,
          default_instances: 1,
          allow_duplicate_model_options: false,
          diversity_policy: null,
          merge_output_as: 'external_structured_output',
        },
        // T-127 W-07 f0: base-mode codex eligibility matches the arbiter model profile (opened so a
        // uniform codex_assisted N6 debate can run in product). codex_substitution_policy below stays
        // allowed:false — that governs codex OVERLAY within a non-codex base run, a distinct concern.
        allowed_execution_modes: ['mocked_llm', 'provider_llm', 'codex_assisted'],
        codex_substitution_policy: {
          allowed: false,
          requires_operator_approval: false,
          allowed_run_modes: [],
        },
      },
    ],
    provider_selection_policy: {
      default_model_option_use_when: 'default_provider_run',
      explicit_model_option_allowed: true,
      automatic_fallback: false,
      provider_failure_result: 'blocked',
    },
    failure_policy: {
      max_rounds: 3,
      llm_failure_result: 'blocked',
      malformed_output_result: 'blocked',
      supplemental_round_is_retry: false,
      require_manual_rerun_for_provider_change: true,
    },
    artifact_contract: {
      required_artifact_keys: [
        'debate_role_output',
        'debate_role_level_summary',
        'debate_final_synthesis',
      ],
      forbid_raw_debate_transcript: true,
      forbid_hidden_reasoning: true,
      final_external_output_slot_id: 'n6_debate_arbiter',
    },
    validation_contract: {
      required_downstream_gates: [
        'n6_topic_question_candidate_set_schema_validation',
        'n6_candidate_draft_admission',
        'n6_debate_escalation_routing',
      ],
      authority_object: 'TopicQuestionCandidate',
      forbidden_authority_objects: [
        'TopicQuestionCandidateSet',
        'TopicQuestionContract',
        'ResearchSlice',
      ],
      max_persisted_candidates: 5,
    },
  };
}
