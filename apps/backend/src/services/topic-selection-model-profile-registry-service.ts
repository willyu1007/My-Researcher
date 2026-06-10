import {
  Ajv,
  type ErrorObject,
  type ValidateFunction,
} from 'ajv';
import type {
  TopicSelectionAgentExecutionMode,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-need-validation-contracts';
import {
  TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-workflow-harness-contracts';
import {
  PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_PROFILE_ID,
  PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_PROFILE_ID,
  PAPER_IMPLEMENTATION_DOSSIER_READINESS_AUDIT_PROFILE_ID,
  PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_PROFILE_ID,
  PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_PROFILE_ID,
  PAPER_IMPLEMENTATION_EXPERIMENT_DESIGN_PROFILE_ID,
  PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_PROFILE_ID,
  PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_PROFILE_ID,
  PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_PROFILE_ID,
  PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_PROFILE_ID,
  PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_PROFILE_ID,
  PAPER_IMPLEMENTATION_RESULT_ANALYSIS_PROFILE_ID,
  PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_PROFILE_ID,
  PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_PROFILE_ID,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-runtime-contracts';
import {
  TOPIC_SELECTION_MODEL_PROFILE_REGISTRY_SCHEMA_VERSION,
  topicSelectionModelProfileRegistrySchema,
  type TopicSelectionAgentRunMode,
  type TopicSelectionModelOption,
  type TopicSelectionModelProfile,
  type TopicSelectionModelProfileRegistry,
  type TopicSelectionModelProfileRunModeEligibility,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-agent-profile-contracts';
import { AppError } from '../errors/app-error.js';
import {
  sha256Text,
  stableStringify,
} from './literature-content-processing-utils.js';

export type TopicSelectionModelProfileRegistryValidationIssueCode =
  | 'SCHEMA_VALIDATION_FAILED'
  | 'DUPLICATE_PROFILE_ID'
  | 'DUPLICATE_MODEL_OPTION_ID'
  | 'UNKNOWN_PROVIDER_ID'
  | 'PROVIDER_MODE_REQUIRES_MODEL_OPTION'
  | 'AUTOMATIC_PROVIDER_FALLBACK_FORBIDDEN'
  | 'SEMANTIC_RETRY_FORBIDDEN'
  | 'SUPPLEMENTAL_ROUND_MUST_NOT_BE_RETRY'
  | 'MOCK_PRODUCT_MODE_FORBIDDEN'
  | 'DISALLOWED_EXECUTION_MODE_ELIGIBILITY'
  | 'STRUCTURED_OUTPUT_CAPABILITY_REQUIRED'
  | 'RAW_PROVIDER_RESPONSE_AUDIT_FORBIDDEN'
  | 'HIDDEN_REASONING_AUDIT_FORBIDDEN'
  | 'TECHNICAL_RETRY_MUST_PRESERVE_INVOCATION'
  | 'BUDGET_ATTEMPTS_BELOW_TECHNICAL_RETRY';

export interface TopicSelectionModelProfileRegistryValidationIssue {
  code: TopicSelectionModelProfileRegistryValidationIssueCode;
  message: string;
  profile_id?: string;
  option_id?: string;
  path?: string;
}

export interface TopicSelectionModelProfileRegistryValidationResult {
  valid: boolean;
  issue_count: number;
  issues: TopicSelectionModelProfileRegistryValidationIssue[];
}

export interface TopicSelectionResolvedModelProfile {
  profile: TopicSelectionModelProfile;
  selected_model_option: TopicSelectionModelOption | null;
  profile_hash: string;
  normalized_params_hash: string | null;
}

export interface ResolveTopicSelectionModelProfileInput {
  profile_id: string;
  execution_mode: TopicSelectionAgentExecutionMode;
  run_mode: TopicSelectionAgentRunMode;
  model_option_id?: string | null;
}

type RegisteredProviderId = 'openai' | 'dashscope' | 'deepseek';

const REGISTERED_PROVIDER_IDS: RegisteredProviderId[] = ['openai', 'dashscope', 'deepseek'];

const DEFAULT_RUN_MODE_ELIGIBILITY: TopicSelectionModelProfileRunModeEligibility = {
  mocked_llm: ['test', 'acceptance'],
  codex_assisted: ['acceptance', 'product'],
  provider_llm: ['acceptance', 'product'],
};

const SUPPORT_PROFILE_RUN_MODE_ELIGIBILITY: TopicSelectionModelProfileRunModeEligibility = {
  mocked_llm: ['test', 'acceptance'],
  codex_assisted: ['acceptance', 'product'],
  provider_llm: [],
};

const PROVIDER_ONLY_RUN_MODE_ELIGIBILITY: TopicSelectionModelProfileRunModeEligibility = {
  mocked_llm: [],
  codex_assisted: [],
  provider_llm: ['acceptance', 'product'],
};

const PAPER_IMPLEMENTATION_RUNTIME_RUN_MODE_ELIGIBILITY: TopicSelectionModelProfileRunModeEligibility = {
  mocked_llm: ['test', 'acceptance'],
  codex_assisted: ['test', 'acceptance'],
  provider_llm: ['acceptance', 'product'],
};

const PROVIDER_REQUIRED_CAPABILITIES = [
  'structured_output',
  'json_schema',
] as const;

export const TOPIC_SELECTION_GENERATE_NEED_CANDIDATE_SINGLE_AGENT_PROFILE_ID =
  'topic-selection.generate-need-candidate.single-agent.v1' as const;
export const TOPIC_SELECTION_RESOURCE_SAMPLING_CLASSIFICATION_PROFILE_ID =
  'topic-selection-resource-sampling-classification' as const;
export const TOPIC_SELECTION_EVIDENCE_MAP_EXTRACTION_SINGLE_AGENT_PROFILE_ID =
  'topic-selection.evidence-map-extraction.single-agent.v1' as const;
export const TOPIC_SELECTION_NEED_ADJUDICATION_SINGLE_AGENT_PROFILE_ID =
  'topic-selection.need-adjudication.single-agent.v1' as const;
export const TOPIC_SELECTION_CONFIRMATION_SEMANTIC_REVIEW_SINGLE_AGENT_PROFILE_ID =
  'topic-selection.confirmation-semantic-review.single-agent.v1' as const;
export const TOPIC_SELECTION_V1C_PROMOTION_DECISION_SUPPORT_PROFILE_ID =
  'topic-selection-promotion-decision-support' as const;
export const TOPIC_SELECTION_V1C_BOUNDED_MICRO_DEBATE_PROFILE_ID =
  'topic-selection.v1c.promotion-support.bounded-micro-debate.v1' as const;
export const TOPIC_SELECTION_V1C_DELEGATED_PROMOTION_DECISION_PROFILE_ID =
  'topic-selection.v1c.delegated-promotion-decision.v1' as const;
export const TOPIC_SELECTION_V1C_DOWNSTREAM_FEEDBACK_NORMALIZATION_PROFILE_ID =
  'topic-selection.v1c.downstream-feedback-normalization.v1' as const;
export const TOPIC_SELECTION_NEED_DISCOVERY_EXPLORER_PROFILE_ID =
  'topic-selection.need-discovery.explorer.v1' as const;
export const TOPIC_SELECTION_NEED_DISCOVERY_DEEP_CRITIC_PROFILE_ID =
  'topic-selection.need-discovery.deep-critic.v1' as const;
export const TOPIC_SELECTION_NEED_DISCOVERY_ARBITER_FRAMING_PROFILE_ID =
  'topic-selection.need-discovery.arbiter-framing.v1' as const;
export const TOPIC_SELECTION_NEED_DISCOVERY_ARBITER_FINAL_PROFILE_ID =
  'topic-selection.need-discovery.arbiter-final.v1' as const;
export const TOPIC_SELECTION_V1B_RESEARCH_SLICE_OPTIONS_SINGLE_AGENT_PROFILE_ID =
  TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.research_slice_options_single_agent;
export const TOPIC_SELECTION_V1B_TOPIC_QUESTION_CANDIDATES_SINGLE_AGENT_PROFILE_ID =
  TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.topic_question_candidates_single_agent;
export const TOPIC_SELECTION_V1B_TOPIC_VALUE_ASSESSMENT_SINGLE_AGENT_PROFILE_ID =
  TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.topic_value_assessment_single_agent;
export const TOPIC_SELECTION_V1B_CONSTRAINT_PROFILE_SUPPORT_PROFILE_ID =
  TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.constraint_profile_support;
export const TOPIC_SELECTION_V1B_INTAKE_READINESS_SUPPORT_PROFILE_ID =
  TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.intake_readiness_support;
export const TOPIC_SELECTION_V1B_SLICE_SELECTION_SUPPORT_PROFILE_ID =
  TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.slice_selection_support;
export const TOPIC_SELECTION_V1B_N6_LOOPBACK_TRIAGE_SUPPORT_PROFILE_ID =
  TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.n6_loopback_triage_support;
export const TOPIC_SELECTION_V1B_N7_CANDIDATE_GROUPING_SUPPORT_PROFILE_ID =
  TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.n7_candidate_grouping_support;
export const TOPIC_SELECTION_V1B_N7_FAILED_TRIAL_SYNTHESIS_SUPPORT_PROFILE_ID =
  TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.n7_failed_trial_synthesis_support;
export const TOPIC_SELECTION_V1B_N7_N8_DEBATE_ADMISSION_SUPPORT_PROFILE_ID =
  TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.n7_n8_debate_admission_support;

const DEBATE_WORKER_DEEPSEEK_ELIGIBLE_PROFILE_IDS = new Set<string>([
  TOPIC_SELECTION_NEED_DISCOVERY_EXPLORER_PROFILE_ID,
  TOPIC_SELECTION_NEED_DISCOVERY_DEEP_CRITIC_PROFILE_ID,
]);

function normalizedParams(
  overrides: Partial<TopicSelectionModelOption['normalized_params']> = {},
): TopicSelectionModelOption['normalized_params'] {
  return {
    creativity: 'medium',
    reasoning_depth: 'high',
    output_budget: 'medium',
    structured_output_required: true,
    output_format: 'json_schema',
    ...overrides,
  };
}

function providerOptions(profileKey: string): TopicSelectionModelOption[] {
  const options: TopicSelectionModelOption[] = [
    {
      option_id: `${profileKey}.openai-balanced`,
      option_purpose: 'default_balanced_provider_run',
      provider_id: 'openai',
      model_id: 'gpt-5.5',
      use_when: ['default_provider_run'],
      request_policy: {
        timeout_ms: 180000,
      },
      normalized_params: normalizedParams(),
      provider_overrides: {},
      capability_degrade_policy: {
        allow_optional_degrade: false,
      },
    },
    {
      option_id: `${profileKey}.openai-quality`,
      option_purpose: 'quality_sensitive_explicit_provider_run',
      provider_id: 'openai',
      model_id: 'gpt-5.5',
      use_when: ['quality_sensitive_manual_selection'],
      request_policy: {
        timeout_ms: 300000,
      },
      normalized_params: normalizedParams({
        reasoning_depth: 'high',
        output_budget: 'large',
      }),
      provider_overrides: {},
      capability_degrade_policy: {
        allow_optional_degrade: false,
      },
    },
    {
      option_id: `${profileKey}.openai-deep-reasoning`,
      option_purpose: 'deep_reasoning_explicit_provider_run',
      provider_id: 'openai',
      model_id: 'gpt-5.5',
      use_when: ['deep_reasoning_manual_selection'],
      request_policy: {
        timeout_ms: 450000,
      },
      normalized_params: normalizedParams({
        reasoning_depth: 'high',
        output_budget: 'large',
      }),
      provider_overrides: {},
      capability_degrade_policy: {
        allow_optional_degrade: false,
      },
    },
    {
      option_id: `${profileKey}.dashscope-thinking-budget`,
      option_purpose: 'budget_sensitive_thinking_provider_run',
      provider_id: 'dashscope',
      model_id: 'qwen3.6-plus',
      use_when: ['budget_sensitive_manual_selection', 'thinking_budget_manual_selection'],
      request_policy: {
        timeout_ms: 300000,
      },
      normalized_params: normalizedParams(),
      provider_overrides: {
        enable_thinking: true,
      },
      capability_degrade_policy: {
        allow_optional_degrade: false,
      },
    },
    {
      option_id: `${profileKey}.dashscope-budget`,
      option_purpose: 'legacy_budget_sensitive_thinking_provider_run',
      provider_id: 'dashscope',
      model_id: 'qwen3.6-plus',
      use_when: ['legacy_budget_sensitive_manual_selection'],
      request_policy: {
        timeout_ms: 300000,
      },
      normalized_params: normalizedParams(),
      provider_overrides: {
        enable_thinking: true,
      },
      capability_degrade_policy: {
        allow_optional_degrade: false,
      },
    },
  ];

  if (DEBATE_WORKER_DEEPSEEK_ELIGIBLE_PROFILE_IDS.has(profileKey)) {
    options.push({
      option_id: `${profileKey}.deepseek-v4-thinking`,
      option_purpose: 'alternative_debate_worker_thinking_provider_run',
      provider_id: 'deepseek',
      model_id: 'deepseek-v4-pro',
      use_when: ['alternative_explorer_deep_critic_manual_selection'],
      request_policy: {
        timeout_ms: 450000,
      },
      normalized_params: normalizedParams({
        reasoning_depth: 'high',
        output_budget: 'large',
      }),
      provider_overrides: {
        thinking: { type: 'enabled' },
        reasoning_effort: 'high',
      },
      capability_degrade_policy: {
        allow_optional_degrade: false,
      },
    });
  }

  return options;
}

function profileBase(input: {
  profile_id: string;
  profile_function: string;
  role_family: TopicSelectionModelProfile['role_family'];
  stage_family: string;
  quality_objectives: string[];
  allowed_execution_modes: TopicSelectionAgentExecutionMode[];
  output_contract: string;
  model_options?: TopicSelectionModelOption[];
  run_mode_eligibility?: TopicSelectionModelProfileRunModeEligibility;
}): TopicSelectionModelProfile {
  return {
    profile_id: input.profile_id,
    profile_version: 'v1',
    status: 'active',
    profile_function: input.profile_function,
    role_family: input.role_family,
    stage_family: input.stage_family,
    quality_objectives: input.quality_objectives,
    allowed_execution_modes: input.allowed_execution_modes,
    run_mode_eligibility: input.run_mode_eligibility ?? DEFAULT_RUN_MODE_ELIGIBILITY,
    required_capabilities: [...PROVIDER_REQUIRED_CAPABILITIES],
    output_contract: input.output_contract,
    model_options: input.model_options ?? providerOptions(input.profile_id),
    provider_fallback_policy: {
      automatic_fallback: false,
      manual_rerun_allowed: true,
      explicit_profile_override_allowed: true,
      provider_failure_result: 'blocked',
      record_failure_artifact: true,
    },
    failure_handling_policy: {
      technical_retry: {
        enabled: true,
        max_provider_call_attempts: 2,
        retryable_error_classes: [
          'network_timeout',
          'transient_rate_limit',
          'transient_provider_5xx',
        ],
        require_same_profile: true,
        require_same_model_option: true,
        require_same_prompt_packet_hash: true,
        require_same_context_packet_hashes: true,
      },
      semantic_retry: {
        enabled: false,
      },
      provider_fallback: {
        automatic_fallback: false,
      },
      supplemental_round: {
        is_retry: false,
        requires_arbiter_scoped_questions: true,
      },
    },
    audit_policy: {
      store_prompt_hash: true,
      store_response_hash: true,
      store_structured_output: true,
      store_raw_provider_response: false,
      forbid_hidden_reasoning: true,
    },
    budget_policy: {
      max_provider_attempts: 2,
      max_estimated_cost_usd: null,
    },
  };
}

const DEFAULT_TOPIC_SELECTION_MODEL_PROFILE_REGISTRY: TopicSelectionModelProfileRegistry = {
  schema_version: TOPIC_SELECTION_MODEL_PROFILE_REGISTRY_SCHEMA_VERSION,
  profiles: [
    profileBase({
      profile_id: TOPIC_SELECTION_RESOURCE_SAMPLING_CLASSIFICATION_PROFILE_ID,
      profile_function: 'resource_sampling_literature_classification',
      role_family: 'single_agent',
      stage_family: 'resource_sampling',
      quality_objectives: [
        'classify_topic_scoped_literature_for_role_balanced_sampling',
        'preserve_literature_refs_and_batch_identity',
        'prepare_deterministic_resource_sampling_guardrails',
      ],
      allowed_execution_modes: ['provider_llm'],
      run_mode_eligibility: PROVIDER_ONLY_RUN_MODE_ELIGIBILITY,
      output_contract: 'TopicSelectionResourceSamplingLlmOutput@v1',
      model_options: providerOptions(TOPIC_SELECTION_RESOURCE_SAMPLING_CLASSIFICATION_PROFILE_ID).map(
        (option) => ({
          ...option,
          normalized_params: normalizedParams({
            creativity: 'low',
            reasoning_depth: 'high',
            output_budget: 'medium',
          }),
        }),
      ),
    }),
    profileBase({
      profile_id: TOPIC_SELECTION_EVIDENCE_MAP_EXTRACTION_SINGLE_AGENT_PROFILE_ID,
      profile_function: 'evidence_map_extraction_single_agent',
      role_family: 'single_agent',
      stage_family: 'evidence_map_extraction',
      quality_objectives: [
        'extract_source_grounded_evidence_units',
        'preserve_search_run_and_snapshot_lineage',
        'prepare_deterministic_evidence_map_materialization',
      ],
      allowed_execution_modes: ['mocked_llm', 'provider_llm', 'codex_assisted'],
      output_contract: 'TopicSelectionEvidenceMapExtractionDraft@v1',
      model_options: providerOptions(TOPIC_SELECTION_EVIDENCE_MAP_EXTRACTION_SINGLE_AGENT_PROFILE_ID).map(
        (option) => ({
          ...option,
          normalized_params: normalizedParams({
            creativity: 'low',
            reasoning_depth: 'high',
            output_budget: 'large',
          }),
        }),
      ),
    }),
    profileBase({
      profile_id: TOPIC_SELECTION_GENERATE_NEED_CANDIDATE_SINGLE_AGENT_PROFILE_ID,
      profile_function: 'generate_need_candidate_single_agent',
      role_family: 'single_agent',
      stage_family: 'single_agent_synthesis',
      quality_objectives: [
        'generate_grounded_need_candidates',
        'preserve_authority_boundary',
        'prepare_deterministic_admission',
      ],
      allowed_execution_modes: ['mocked_llm', 'provider_llm', 'codex_assisted'],
      output_contract: 'RankedCandidateDraftBatch@v1',
    }),
    profileBase({
      profile_id: TOPIC_SELECTION_NEED_ADJUDICATION_SINGLE_AGENT_PROFILE_ID,
      profile_function: 'need_adjudication_single_agent',
      role_family: 'single_agent',
      stage_family: 'need_adjudication',
      quality_objectives: [
        'recommend_validate_need_adjudication_decision',
        'preserve_support_packet_authority_boundary',
        'avoid_orchestration_field_leakage',
      ],
      allowed_execution_modes: ['mocked_llm', 'provider_llm', 'codex_assisted'],
      output_contract: 'TopicSelectionNeedAdjudicationRecommendationPacket@v1',
      model_options: providerOptions(TOPIC_SELECTION_NEED_ADJUDICATION_SINGLE_AGENT_PROFILE_ID).map(
        (option) => ({
          ...option,
          normalized_params: normalizedParams({
            creativity: 'low',
            reasoning_depth: 'high',
            output_budget: 'medium',
          }),
        }),
      ),
    }),
    profileBase({
      profile_id: TOPIC_SELECTION_CONFIRMATION_SEMANTIC_REVIEW_SINGLE_AGENT_PROFILE_ID,
      profile_function: 'human_confirmation_semantic_review_single_agent',
      role_family: 'single_agent',
      stage_family: 'human_confirmation',
      quality_objectives: [
        'parse_confirmation_alignment_without_readjudication',
        'verify_required_check_and_risk_coverage',
        'preserve_validated_need_materialization_boundary',
      ],
      allowed_execution_modes: ['mocked_llm', 'provider_llm', 'codex_assisted'],
      output_contract: 'HumanConfirmationSemanticReview@v1',
      model_options: providerOptions(TOPIC_SELECTION_CONFIRMATION_SEMANTIC_REVIEW_SINGLE_AGENT_PROFILE_ID).map(
        (option) => ({
          ...option,
          normalized_params: normalizedParams({
            creativity: 'low',
            reasoning_depth: 'high',
            output_budget: 'medium',
          }),
        }),
      ),
    }),
    profileBase({
      profile_id: TOPIC_SELECTION_NEED_DISCOVERY_EXPLORER_PROFILE_ID,
      profile_function: 'need_discovery_exploration',
      role_family: 'explorer',
      stage_family: 'round_1_discovery',
      quality_objectives: [
        'broaden_candidate_framing',
        'surface_latent_value_points',
        'preserve_source_grounding',
      ],
      allowed_execution_modes: ['mocked_llm', 'provider_llm', 'codex_assisted'],
      output_contract: 'NeedDiscoveryExplorerNotes@v1',
    }),
    profileBase({
      profile_id: TOPIC_SELECTION_NEED_DISCOVERY_DEEP_CRITIC_PROFILE_ID,
      profile_function: 'need_discovery_deep_critique',
      role_family: 'deep_critic',
      stage_family: 'round_1_discovery',
      quality_objectives: [
        'stress_test_candidate_value',
        'surface_failure_modes',
        'identify_missing_counterevidence',
      ],
      allowed_execution_modes: ['mocked_llm', 'provider_llm', 'codex_assisted'],
      output_contract: 'NeedDiscoveryDeepCriticNotes@v1',
    }),
    profileBase({
      profile_id: TOPIC_SELECTION_NEED_DISCOVERY_ARBITER_FRAMING_PROFILE_ID,
      profile_function: 'need_discovery_arbiter_issue_framing',
      role_family: 'arbiter',
      stage_family: 'issue_framing',
      quality_objectives: [
        'frame_debate_questions',
        'focus_supplemental_repair',
        'preserve_authority_boundary',
      ],
      allowed_execution_modes: ['mocked_llm', 'provider_llm', 'codex_assisted'],
      output_contract: 'DebateIssueFrame@v1',
    }),
    profileBase({
      profile_id: TOPIC_SELECTION_NEED_DISCOVERY_ARBITER_FINAL_PROFILE_ID,
      profile_function: 'need_discovery_arbiter_final_synthesis',
      role_family: 'arbiter',
      stage_family: 'final_synthesis',
      quality_objectives: [
        'rank_grounded_need_candidates',
        'separate_rejected_framings',
        'prepare_deterministic_admission',
      ],
      allowed_execution_modes: ['mocked_llm', 'provider_llm'],
      run_mode_eligibility: {
        ...DEFAULT_RUN_MODE_ELIGIBILITY,
        codex_assisted: [],
      },
      output_contract: 'RankedCandidateDraftBatch@v1',
    }),
    profileBase({
      profile_id: TOPIC_SELECTION_V1B_RESEARCH_SLICE_OPTIONS_SINGLE_AGENT_PROFILE_ID,
      profile_function: 'v1b_research_slice_option_generation_single_agent',
      role_family: 'single_agent',
      stage_family: 'v1b_research_slice_generation',
      quality_objectives: [
        'generate_method_evidence_value_aligned_slice_options',
        'preserve_v1a_bundle_and_constraint_lineage',
        'prepare_deterministic_slice_option_gate',
      ],
      allowed_execution_modes: ['mocked_llm', 'provider_llm', 'codex_assisted'],
      output_contract: 'ResearchSliceOptionSetDraft@v1',
      model_options: providerOptions(TOPIC_SELECTION_V1B_RESEARCH_SLICE_OPTIONS_SINGLE_AGENT_PROFILE_ID).map(
        (option) => ({
          ...option,
          normalized_params: normalizedParams({
            creativity: 'medium',
            reasoning_depth: 'high',
            output_budget: 'large',
          }),
        }),
      ),
    }),
    profileBase({
      profile_id: TOPIC_SELECTION_V1B_TOPIC_QUESTION_CANDIDATES_SINGLE_AGENT_PROFILE_ID,
      profile_function: 'v1b_topic_question_candidate_generation_single_agent',
      role_family: 'single_agent',
      stage_family: 'v1b_topic_question_generation',
      quality_objectives: [
        'generate_distinct_high_value_topic_question_candidates',
        'surface_candidate_overlap_and_residual_risk',
        'prepare_deterministic_topic_question_candidate_gate',
      ],
      allowed_execution_modes: ['mocked_llm', 'provider_llm', 'codex_assisted'],
      output_contract: 'TopicQuestionCandidateSetDraft@v1',
      model_options: providerOptions(TOPIC_SELECTION_V1B_TOPIC_QUESTION_CANDIDATES_SINGLE_AGENT_PROFILE_ID).map(
        (option) => ({
          ...option,
          normalized_params: normalizedParams({
            creativity: 'medium',
            reasoning_depth: 'high',
            output_budget: 'large',
          }),
        }),
      ),
    }),
    profileBase({
      profile_id: TOPIC_SELECTION_V1B_TOPIC_VALUE_ASSESSMENT_SINGLE_AGENT_PROFILE_ID,
      profile_function: 'v1b_topic_value_assessment_single_agent',
      role_family: 'single_agent',
      stage_family: 'v1b_topic_value_assessment',
      quality_objectives: [
        'assess_topic_question_value_against_method_evidence_value_axes',
        'preserve_residual_risks_warnings_and_coverage_gaps',
        'prepare_deterministic_value_assessment_gate',
      ],
      allowed_execution_modes: ['mocked_llm', 'provider_llm', 'codex_assisted'],
      output_contract: 'TopicValueAssessmentDraft@v1',
      model_options: providerOptions(TOPIC_SELECTION_V1B_TOPIC_VALUE_ASSESSMENT_SINGLE_AGENT_PROFILE_ID).map(
        (option) => ({
          ...option,
          normalized_params: normalizedParams({
            creativity: 'low',
            reasoning_depth: 'high',
            output_budget: 'large',
          }),
        }),
      ),
    }),
    profileBase({
      profile_id: TOPIC_SELECTION_V1B_CONSTRAINT_PROFILE_SUPPORT_PROFILE_ID,
      profile_function: 'v1b_constraint_profile_semantic_support',
      role_family: 'single_agent',
      stage_family: 'v1b_constraint_profile',
      quality_objectives: [
        'normalize_constraint_profile_support_without_authority_write',
        'preserve_frozen_input_lineage',
        'prepare_deterministic_constraint_profile_gate',
      ],
      allowed_execution_modes: ['mocked_llm', 'codex_assisted'],
      run_mode_eligibility: SUPPORT_PROFILE_RUN_MODE_ELIGIBILITY,
      output_contract: 'ResearchConstraintProfileDraftSupport@v1',
      model_options: [],
    }),
    profileBase({
      profile_id: TOPIC_SELECTION_V1B_INTAKE_READINESS_SUPPORT_PROFILE_ID,
      profile_function: 'v1b_intake_readiness_semantic_support',
      role_family: 'single_agent',
      stage_family: 'v1b_intake_readiness',
      quality_objectives: [
        'classify_readiness_support_without_authority_write',
        'preserve_blocker_warning_loopback_codes',
        'prepare_deterministic_readiness_gate',
      ],
      allowed_execution_modes: ['mocked_llm', 'codex_assisted'],
      run_mode_eligibility: SUPPORT_PROFILE_RUN_MODE_ELIGIBILITY,
      output_contract: 'IntakeReadinessClassificationSupport@v1',
      model_options: [],
    }),
    profileBase({
      profile_id: TOPIC_SELECTION_V1B_SLICE_SELECTION_SUPPORT_PROFILE_ID,
      profile_function: 'v1b_slice_selection_semantic_support',
      role_family: 'single_agent',
      stage_family: 'v1b_research_slice_selection',
      quality_objectives: [
        'review_slice_selection_support_without_authority_write',
        'preserve_deferred_candidate_context',
        'prepare_deterministic_slice_selection_gate',
      ],
      allowed_execution_modes: ['mocked_llm', 'codex_assisted'],
      run_mode_eligibility: SUPPORT_PROFILE_RUN_MODE_ELIGIBILITY,
      output_contract: 'ResearchSliceSelectionReviewSupport@v1',
      model_options: [],
    }),
    profileBase({
      profile_id: TOPIC_SELECTION_V1B_N6_LOOPBACK_TRIAGE_SUPPORT_PROFILE_ID,
      profile_function: 'v1b_n6_loopback_triage_support',
      role_family: 'single_agent',
      stage_family: 'v1b_topic_question_generation',
      quality_objectives: [
        'summarize_loopback_feedback_without_authority_write',
        'preserve_failed_trial_reasons_for_regeneration',
        'prepare_deterministic_candidate_gate_retry_decision',
      ],
      allowed_execution_modes: ['mocked_llm', 'codex_assisted'],
      run_mode_eligibility: SUPPORT_PROFILE_RUN_MODE_ELIGIBILITY,
      output_contract: 'N6LoopbackTriageSupport@v1',
      model_options: [],
    }),
    profileBase({
      profile_id: TOPIC_SELECTION_V1B_N7_CANDIDATE_GROUPING_SUPPORT_PROFILE_ID,
      profile_function: 'v1b_candidate_grouping_semantic_support',
      role_family: 'single_agent',
      stage_family: 'v1b_topic_question_contract',
      quality_objectives: [
        'group_overlapping_candidates_without_authority_write',
        'preserve_multiple_valid_candidate_branches',
        'prepare_deterministic_contract_materialization_gate',
      ],
      allowed_execution_modes: ['mocked_llm', 'codex_assisted'],
      run_mode_eligibility: SUPPORT_PROFILE_RUN_MODE_ELIGIBILITY,
      output_contract: 'CandidateGroupingSupport@v1',
      model_options: [],
    }),
    profileBase({
      profile_id: TOPIC_SELECTION_V1B_N7_FAILED_TRIAL_SYNTHESIS_SUPPORT_PROFILE_ID,
      profile_function: 'v1b_failed_trial_synthesis_semantic_support',
      role_family: 'single_agent',
      stage_family: 'v1b_topic_question_contract',
      quality_objectives: [
        'synthesize_n8_failed_trial_feedback_without_authority_write',
        'preserve_failure_reason_coverage_for_n6_loopback',
        'prepare_deterministic_next_candidate_or_loopback_route',
      ],
      allowed_execution_modes: ['mocked_llm', 'codex_assisted'],
      run_mode_eligibility: SUPPORT_PROFILE_RUN_MODE_ELIGIBILITY,
      output_contract: 'N8FailedTrialSynthesisSupport@v1',
      model_options: [],
    }),
    profileBase({
      profile_id: TOPIC_SELECTION_V1B_N7_N8_DEBATE_ADMISSION_SUPPORT_PROFILE_ID,
      profile_function: 'v1b_n8_debate_admission_semantic_support',
      role_family: 'single_agent',
      stage_family: 'v1b_topic_question_contract',
      quality_objectives: [
        'select_n8_debate_level_without_authority_write',
        'preserve_high_value_candidate_signals',
        'prepare_deterministic_n8_invocation_admission',
      ],
      allowed_execution_modes: ['mocked_llm', 'codex_assisted'],
      run_mode_eligibility: SUPPORT_PROFILE_RUN_MODE_ELIGIBILITY,
      output_contract: 'N8DebateAdmissionReviewSupport@v1',
      model_options: [],
    }),
    profileBase({
      profile_id: TOPIC_SELECTION_V1C_PROMOTION_DECISION_SUPPORT_PROFILE_ID,
      profile_function: 'v1c_promotion_decision_support_drafting',
      role_family: 'single_agent',
      stage_family: 'v1c_promotion_support',
      quality_objectives: [
        'draft_reviewer_facing_support_without_gate_authority',
        'preserve_promotion_input_snapshot_lineage',
        'surface_risk_recheck_and_blocker_context_for_deterministic_gate',
      ],
      allowed_execution_modes: ['provider_llm'],
      run_mode_eligibility: PROVIDER_ONLY_RUN_MODE_ELIGIBILITY,
      output_contract: 'TopicSelectionPromotionDecisionSupportLlmDraft@v1',
      model_options: providerOptions(TOPIC_SELECTION_V1C_PROMOTION_DECISION_SUPPORT_PROFILE_ID),
    }),
    profileBase({
      profile_id: TOPIC_SELECTION_V1C_BOUNDED_MICRO_DEBATE_PROFILE_ID,
      profile_function: 'v1c_promotion_support_bounded_micro_debate',
      role_family: 'single_agent',
      stage_family: 'v1c_promotion_support',
      quality_objectives: [
        'run_fixed_role_promotion_support_debate_without_gate_authority',
        'preserve_n1_frozen_context_refs_and_prior_role_hashes',
        'prepare_synthesizer_final_for_n2_advisory_admission',
      ],
      allowed_execution_modes: ['mocked_llm', 'provider_llm', 'codex_assisted'],
      output_contract: 'TopicSelectionV1cBoundedMicroDebateRoleOrFinal@v1',
      model_options: providerOptions(TOPIC_SELECTION_V1C_BOUNDED_MICRO_DEBATE_PROFILE_ID).map(
        (option) => ({
          ...option,
          normalized_params: normalizedParams({
            creativity: 'low',
            reasoning_depth: 'high',
            output_budget: 'large',
          }),
        }),
      ),
    }),
    profileBase({
      profile_id: TOPIC_SELECTION_V1C_DELEGATED_PROMOTION_DECISION_PROFILE_ID,
      profile_function: 'v1c_delegated_promotion_decision_candidate',
      role_family: 'single_agent',
      stage_family: 'v1c_human_promotion_decision',
      quality_objectives: [
        'draft_delegated_promotion_decision_candidate_without_authority_write',
        'preserve_n3_gate_handoff_and_snapshot_lineage',
        'prepare_human_review_input_without_bridge_or_recheck_side_effects',
      ],
      allowed_execution_modes: ['mocked_llm', 'provider_llm', 'codex_assisted'],
      output_contract: 'TopicSelectionV1cDelegatedPromotionDecisionCandidate@v1',
      model_options: providerOptions(TOPIC_SELECTION_V1C_DELEGATED_PROMOTION_DECISION_PROFILE_ID).map(
        (option) => ({
          ...option,
          normalized_params: normalizedParams({
            creativity: 'low',
            reasoning_depth: 'high',
            output_budget: 'medium',
          }),
        }),
      ),
    }),
    profileBase({
      profile_id: TOPIC_SELECTION_V1C_DOWNSTREAM_FEEDBACK_NORMALIZATION_PROFILE_ID,
      profile_function: 'v1c_downstream_feedback_normalization',
      role_family: 'single_agent',
      stage_family: 'v1c_downstream_feedback_recheck',
      quality_objectives: [
        'normalize_downstream_feedback_without_side_effects',
        'preserve_bridge_and_feedback_source_refs',
        'prepare_deterministic_recheck_admission',
      ],
      allowed_execution_modes: ['mocked_llm', 'provider_llm', 'codex_assisted'],
      output_contract: 'TopicSelectionV1cDownstreamFeedbackCandidate@v1',
      model_options: providerOptions(TOPIC_SELECTION_V1C_DOWNSTREAM_FEEDBACK_NORMALIZATION_PROFILE_ID).map(
        (option) => ({
          ...option,
          normalized_params: normalizedParams({
            creativity: 'low',
            reasoning_depth: 'high',
            output_budget: 'medium',
          }),
        }),
      ),
    }),
    profileBase({
      profile_id: PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_PROFILE_ID,
      profile_function: 'paper_implementation_trace_integrity_boundary_debate',
      role_family: 'single_agent',
      stage_family: 'paper_implementation_trace_integrity_review',
      quality_objectives: [
        'run_fixed_role_trace_integrity_debate_without_authority_write',
        'preserve_trace_source_and_failed_run_lineage',
        'produce_admission_ready_trace_integrity_role_outputs',
      ],
      allowed_execution_modes: ['mocked_llm', 'provider_llm', 'codex_assisted'],
      run_mode_eligibility: PAPER_IMPLEMENTATION_RUNTIME_RUN_MODE_ELIGIBILITY,
      output_contract: 'TraceIntegrityRoleArtifact@v1',
      model_options: providerOptions(PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_PROFILE_ID).map(
        (option) => ({
          ...option,
          normalized_params: normalizedParams({
            creativity: 'low',
            reasoning_depth: 'high',
            output_budget: 'medium',
          }),
        }),
      ),
    }),
    profileBase({
      profile_id: PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_PROFILE_ID,
      profile_function: 'paper_implementation_claim_boundary_debate',
      role_family: 'single_agent',
      stage_family: 'paper_implementation_claim_boundary_review',
      quality_objectives: [
        'run_fixed_role_claim_boundary_debate_without_authority_write',
        'preserve_support_challenge_failed_run_and_forbidden_overclaim_refs',
        'produce_admission_ready_claim_boundary_domain_gate_request',
      ],
      allowed_execution_modes: ['mocked_llm', 'provider_llm', 'codex_assisted'],
      run_mode_eligibility: PAPER_IMPLEMENTATION_RUNTIME_RUN_MODE_ELIGIBILITY,
      output_contract: 'PaperImplementationP1RuntimeReviewRoleArtifact@v1',
      model_options: providerOptions(PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_PROFILE_ID).map(
        (option) => ({
          ...option,
          normalized_params: normalizedParams({
            creativity: 'low',
            reasoning_depth: 'high',
            output_budget: 'medium',
          }),
        }),
      ),
    }),
    profileBase({
      profile_id: PAPER_IMPLEMENTATION_DOSSIER_READINESS_AUDIT_PROFILE_ID,
      profile_function: 'paper_implementation_dossier_readiness_audit',
      role_family: 'single_agent',
      stage_family: 'paper_implementation_dossier_readiness_prep',
      quality_objectives: [
        'run_fixed_role_dossier_readiness_audit_without_authority_write',
        'preserve_claim_trace_failed_run_and_readiness_blocker_refs',
        'produce_admission_ready_dossier_readiness_domain_gate_request',
      ],
      allowed_execution_modes: ['mocked_llm', 'provider_llm', 'codex_assisted'],
      run_mode_eligibility: PAPER_IMPLEMENTATION_RUNTIME_RUN_MODE_ELIGIBILITY,
      output_contract: 'PaperImplementationP1RuntimeReviewRoleArtifact@v1',
      model_options: providerOptions(PAPER_IMPLEMENTATION_DOSSIER_READINESS_AUDIT_PROFILE_ID).map(
        (option) => ({
          ...option,
          normalized_params: normalizedParams({
            creativity: 'low',
            reasoning_depth: 'high',
            output_budget: 'medium',
          }),
        }),
      ),
    }),
    profileBase({
      profile_id: PAPER_IMPLEMENTATION_RESULT_ANALYSIS_PROFILE_ID,
      profile_function: 'paper_implementation_result_analysis_interpretation_scenarios',
      role_family: 'single_agent',
      stage_family: 'paper_implementation_result_analysis',
      quality_objectives: [
        'run_fixed_role_result_analysis_without_authority_write',
        'preserve_run_evidence_validation_failed_run_and_limitation_refs',
        'produce_admission_ready_result_interpretation_domain_gate_request',
      ],
      allowed_execution_modes: ['mocked_llm', 'provider_llm', 'codex_assisted'],
      run_mode_eligibility: PAPER_IMPLEMENTATION_RUNTIME_RUN_MODE_ELIGIBILITY,
      output_contract: 'PaperImplementationResultAnalysisRoleArtifact@v1',
      model_options: providerOptions(PAPER_IMPLEMENTATION_RESULT_ANALYSIS_PROFILE_ID).map(
        (option) => ({
          ...option,
          normalized_params: normalizedParams({
            creativity: 'low',
            reasoning_depth: 'high',
            output_budget: 'medium',
          }),
        }),
      ),
    }),
    profileBase({
      profile_id: PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_PROFILE_ID,
      profile_function: 'paper_implementation_route_architecture_route_candidates',
      role_family: 'single_agent',
      stage_family: 'paper_implementation_route_architecture',
      quality_objectives: [
        'run_fixed_role_route_architecture_without_route_or_queue_write',
        'preserve_input_snapshot_trace_dataset_metric_baseline_code_and_config_refs',
        'produce_admission_ready_route_candidate_proposals',
      ],
      allowed_execution_modes: ['mocked_llm', 'provider_llm', 'codex_assisted'],
      run_mode_eligibility: PAPER_IMPLEMENTATION_RUNTIME_RUN_MODE_ELIGIBILITY,
      output_contract: 'PaperImplementationRoutePlanningRoleArtifact@v1',
      model_options: providerOptions(PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_PROFILE_ID).map(
        (option) => ({
          ...option,
          normalized_params: normalizedParams({
            creativity: 'low',
            reasoning_depth: 'high',
            output_budget: 'large',
          }),
        }),
      ),
    }),
    profileBase({
      profile_id: PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_PROFILE_ID,
      profile_function: 'paper_implementation_route_skeptic_review_route_risk_critique',
      role_family: 'single_agent',
      stage_family: 'paper_implementation_route_skeptic_review',
      quality_objectives: [
        'run_independent_route_skeptic_review_without_route_or_queue_write',
        'preserve_admitted_route_proposal_as_primary_input',
        'produce_admission_ready_route_risk_critique',
      ],
      allowed_execution_modes: ['mocked_llm', 'provider_llm', 'codex_assisted'],
      run_mode_eligibility: PAPER_IMPLEMENTATION_RUNTIME_RUN_MODE_ELIGIBILITY,
      output_contract: 'PaperImplementationRoutePlanningRoleArtifact@v1',
      model_options: providerOptions(PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_PROFILE_ID).map(
        (option) => ({
          ...option,
          normalized_params: normalizedParams({
            creativity: 'low',
            reasoning_depth: 'high',
            output_budget: 'medium',
          }),
        }),
      ),
    }),
    profileBase({
      profile_id: PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_PROFILE_ID,
      profile_function: 'paper_implementation_validation_cycle_planning_cycle_candidates',
      role_family: 'single_agent',
      stage_family: 'paper_implementation_validation_cycle_planning',
      quality_objectives: [
        'run_fixed_role_validation_cycle_planning_without_cycle_or_queue_write',
        'preserve_admitted_route_proposal_and_skeptic_artifact_as_primary_inputs',
        'produce_admission_ready_validation_cycle_candidate_proposals',
      ],
      allowed_execution_modes: ['mocked_llm', 'provider_llm', 'codex_assisted'],
      run_mode_eligibility: PAPER_IMPLEMENTATION_RUNTIME_RUN_MODE_ELIGIBILITY,
      output_contract: 'PaperImplementationValidationCyclePlanningRoleArtifact@v1',
      model_options: providerOptions(PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_PROFILE_ID).map(
        (option) => ({
          ...option,
          normalized_params: normalizedParams({
            creativity: 'low',
            reasoning_depth: 'high',
            output_budget: 'large',
          }),
        }),
      ),
    }),
    profileBase({
      profile_id: PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_PROFILE_ID,
      profile_function: 'paper_implementation_feasibility_planning_probe_plan_candidates',
      role_family: 'single_agent',
      stage_family: 'paper_implementation_feasibility_planning',
      quality_objectives: [
        'run_fixed_role_feasibility_planning_without_probe_plan_cycle_or_queue_write',
        'preserve_admitted_validation_cycle_artifact_as_primary_input',
        'produce_admission_ready_probe_plan_candidate_proposals',
      ],
      allowed_execution_modes: ['mocked_llm', 'provider_llm', 'codex_assisted'],
      run_mode_eligibility: PAPER_IMPLEMENTATION_RUNTIME_RUN_MODE_ELIGIBILITY,
      output_contract: 'PaperImplementationFeasibilityPlanningRoleArtifact@v1',
      model_options: providerOptions(PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_PROFILE_ID).map(
        (option) => ({
          ...option,
          normalized_params: normalizedParams({
            creativity: 'low',
            reasoning_depth: 'high',
            output_budget: 'large',
          }),
        }),
      ),
    }),
    profileBase({
      profile_id: PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_PROFILE_ID,
      profile_function: 'paper_implementation_cross_board_synthesis_merge_split_reuse_scenarios',
      role_family: 'single_agent',
      stage_family: 'paper_implementation_cross_board_synthesis',
      quality_objectives: [
        'run_fixed_role_cross_board_synthesis_without_review_transfer_portfolio_or_queue_write',
        'preserve_board_version_conflict_challenge_transfer_binding_and_source_locator_refs',
        'produce_admission_ready_merge_split_reuse_park_reject_scenario_proposals',
      ],
      allowed_execution_modes: ['mocked_llm', 'provider_llm', 'codex_assisted'],
      run_mode_eligibility: PAPER_IMPLEMENTATION_RUNTIME_RUN_MODE_ELIGIBILITY,
      output_contract: 'PaperImplementationCrossBoardSynthesisRoleArtifact@v1',
      model_options: providerOptions(PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_PROFILE_ID).map(
        (option) => ({
          ...option,
          normalized_params: normalizedParams({
            creativity: 'low',
            reasoning_depth: 'high',
            output_budget: 'large',
          }),
        }),
      ),
    }),
    profileBase({
      profile_id: PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_PROFILE_ID,
      profile_function: 'paper_implementation_evidence_board_curation_binding_gap_candidates',
      role_family: 'single_agent',
      stage_family: 'paper_implementation_evidence_board_curation',
      quality_objectives: [
        'run_fixed_role_evidence_board_curation_without_board_binding_citation_trace_or_queue_write',
        'preserve_assertion_evidence_source_locator_citation_trace_board_and_existing_binding_refs',
        'produce_admission_ready_append_only_binding_and_gap_candidate_proposals',
      ],
      allowed_execution_modes: ['mocked_llm', 'provider_llm', 'codex_assisted'],
      run_mode_eligibility: PAPER_IMPLEMENTATION_RUNTIME_RUN_MODE_ELIGIBILITY,
      output_contract: 'PaperImplementationEvidenceBoardCurationRoleArtifact@v1',
      model_options: providerOptions(PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_PROFILE_ID).map(
        (option) => ({
          ...option,
          normalized_params: normalizedParams({
            creativity: 'low',
            reasoning_depth: 'high',
            output_budget: 'medium',
          }),
        }),
      ),
    }),
    profileBase({
      profile_id: PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_PROFILE_ID,
      profile_function: 'paper_implementation_motive_decomposition_draft_assertion_candidates',
      role_family: 'single_agent',
      stage_family: 'paper_implementation_motive_decomposition',
      quality_objectives: [
        'run_fixed_role_motive_decomposition_without_motive_assertion_board_trace_or_queue_write',
        'preserve_motive_version_assertion_evidence_source_locator_citation_trace_and_source_refs',
        'produce_admission_ready_draft_assertion_candidate_proposals',
      ],
      allowed_execution_modes: ['mocked_llm', 'provider_llm', 'codex_assisted'],
      run_mode_eligibility: PAPER_IMPLEMENTATION_RUNTIME_RUN_MODE_ELIGIBILITY,
      output_contract: 'PaperImplementationMotiveDecompositionRoleArtifact@v1',
      model_options: providerOptions(PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_PROFILE_ID).map(
        (option) => ({
          ...option,
          normalized_params: normalizedParams({
            creativity: 'low',
            reasoning_depth: 'high',
            output_budget: 'large',
          }),
        }),
      ),
    }),
    profileBase({
      profile_id: PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_PROFILE_ID,
      profile_function: 'paper_implementation_motive_evolution_evolution_decision_support',
      role_family: 'single_agent',
      stage_family: 'paper_implementation_motive_evolution',
      quality_objectives: [
        'run_fixed_two_role_motive_evolution_support_without_motive_portfolio_board_trace_or_queue_write',
        'preserve_motive_version_portfolio_board_evidence_trace_validation_result_prior_decision_accepted_risk_and_source_refs',
        'produce_admission_ready_evolution_decision_support_options',
      ],
      allowed_execution_modes: ['mocked_llm', 'provider_llm', 'codex_assisted'],
      run_mode_eligibility: PAPER_IMPLEMENTATION_RUNTIME_RUN_MODE_ELIGIBILITY,
      output_contract: 'PaperImplementationMotiveEvolutionRoleArtifact@v1',
      model_options: providerOptions(PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_PROFILE_ID).map(
        (option) => ({
          ...option,
          normalized_params: normalizedParams({
            creativity: 'low',
            reasoning_depth: 'high',
            output_budget: 'large',
          }),
        }),
      ),
    }),
    profileBase({
      profile_id: PAPER_IMPLEMENTATION_EXPERIMENT_DESIGN_PROFILE_ID,
      profile_function: 'paper_implementation_experiment_design_work_order_draft',
      role_family: 'single_agent',
      stage_family: 'paper_implementation_experiment_design',
      quality_objectives: [
        'run_fixed_role_experiment_design_without_work_order_write',
        'preserve_route_probe_metric_dataset_code_config_budget_and_stop_refs',
        'produce_admission_ready_work_order_draft_candidates',
      ],
      allowed_execution_modes: ['mocked_llm', 'provider_llm', 'codex_assisted'],
      run_mode_eligibility: PAPER_IMPLEMENTATION_RUNTIME_RUN_MODE_ELIGIBILITY,
      output_contract: 'PaperImplementationExperimentPlanningRoleArtifact@v1',
      model_options: providerOptions(PAPER_IMPLEMENTATION_EXPERIMENT_DESIGN_PROFILE_ID).map(
        (option) => ({
          ...option,
          normalized_params: normalizedParams({
            creativity: 'low',
            reasoning_depth: 'high',
            output_budget: 'large',
          }),
        }),
      ),
    }),
    profileBase({
      profile_id: PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_PROFILE_ID,
      profile_function: 'paper_implementation_experiment_critique_plan_critique',
      role_family: 'single_agent',
      stage_family: 'paper_implementation_experiment_critique',
      quality_objectives: [
        'run_independent_experiment_critique_without_work_order_or_adapter_write',
        'preserve_confirmatory_exploratory_compute_budget_dataset_metric_baseline_and_side_effect_findings',
        'produce_admission_ready_plan_critique_decision',
      ],
      allowed_execution_modes: ['mocked_llm', 'provider_llm', 'codex_assisted'],
      run_mode_eligibility: PAPER_IMPLEMENTATION_RUNTIME_RUN_MODE_ELIGIBILITY,
      output_contract: 'PaperImplementationExperimentPlanningRoleArtifact@v1',
      model_options: providerOptions(PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_PROFILE_ID).map(
        (option) => ({
          ...option,
          normalized_params: normalizedParams({
            creativity: 'low',
            reasoning_depth: 'high',
            output_budget: 'medium',
          }),
        }),
      ),
    }),
  ],
};

function cloneRegistry(
  registry: TopicSelectionModelProfileRegistry,
): TopicSelectionModelProfileRegistry {
  return JSON.parse(JSON.stringify(registry)) as TopicSelectionModelProfileRegistry;
}

export function createDefaultTopicSelectionModelProfileRegistry(): TopicSelectionModelProfileRegistry {
  return cloneRegistry(DEFAULT_TOPIC_SELECTION_MODEL_PROFILE_REGISTRY);
}

export class TopicSelectionModelProfileRegistryService {
  private readonly ajv = new Ajv({
    allErrors: true,
    strict: false,
    removeAdditional: false,
  });
  private readonly registry: TopicSelectionModelProfileRegistry;
  private readonly registeredProviderIds: Set<string>;
  private readonly validator: ValidateFunction;

  constructor(options: {
    registry?: TopicSelectionModelProfileRegistry;
    registeredProviderIds?: string[];
  } = {}) {
    this.registry = cloneRegistry(options.registry ?? DEFAULT_TOPIC_SELECTION_MODEL_PROFILE_REGISTRY);
    this.registeredProviderIds = new Set(options.registeredProviderIds ?? REGISTERED_PROVIDER_IDS);
    this.validator = this.ajv.compile(topicSelectionModelProfileRegistrySchema);
  }

  validateRegistry(
    registry: TopicSelectionModelProfileRegistry = this.registry,
  ): TopicSelectionModelProfileRegistryValidationResult {
    const issues: TopicSelectionModelProfileRegistryValidationIssue[] = [];
    const schemaValid = this.validator(registry);
    if (!schemaValid) {
      issues.push(...this.schemaIssues(this.validator.errors ?? []));
      return this.validationResult(issues);
    }

    this.validateProfiles(registry, issues);
    return this.validationResult(issues);
  }

  resolveProfile(input: ResolveTopicSelectionModelProfileInput): TopicSelectionResolvedModelProfile {
    const validation = this.validateRegistry();
    if (!validation.valid) {
      throw new AppError(
        500,
        'INTERNAL_ERROR',
        `Topic-selection model profile registry is invalid: ${validation.issues[0]?.code ?? 'UNKNOWN'}.`,
      );
    }

    const profile = this.registry.profiles.find((item) => item.profile_id === input.profile_id);
    if (!profile || profile.status !== 'active') {
      throw new AppError(400, 'INVALID_PAYLOAD', 'model profile is not active or does not exist.');
    }
    if (!profile.allowed_execution_modes.includes(input.execution_mode)) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'execution_mode is not allowed by model profile.');
    }
    const allowedRunModes = profile.run_mode_eligibility[input.execution_mode] ?? [];
    if (!allowedRunModes.includes(input.run_mode)) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'run_mode is not allowed by model profile.');
    }

    const selectedOption = input.execution_mode === 'provider_llm'
      ? this.selectModelOption(profile, input.model_option_id)
      : null;

    return {
      profile,
      selected_model_option: selectedOption,
      profile_hash: this.hash(profile),
      normalized_params_hash: selectedOption ? this.hash(selectedOption.normalized_params) : null,
    };
  }

  private validateProfiles(
    registry: TopicSelectionModelProfileRegistry,
    issues: TopicSelectionModelProfileRegistryValidationIssue[],
  ): void {
    const seenProfileIds = new Set<string>();
    for (const profile of registry.profiles) {
      if (seenProfileIds.has(profile.profile_id)) {
        this.pushIssue(issues, 'DUPLICATE_PROFILE_ID', 'profile_id must be unique.', profile.profile_id);
      }
      seenProfileIds.add(profile.profile_id);
      this.validateProfile(profile, issues);
    }
  }

  private validateProfile(
    profile: TopicSelectionModelProfile,
    issues: TopicSelectionModelProfileRegistryValidationIssue[],
  ): void {
    if (profile.provider_fallback_policy.automatic_fallback) {
      this.pushIssue(issues, 'AUTOMATIC_PROVIDER_FALLBACK_FORBIDDEN', 'automatic provider fallback is disabled in v1.', profile.profile_id);
    }
    if (profile.failure_handling_policy.semantic_retry.enabled) {
      this.pushIssue(issues, 'SEMANTIC_RETRY_FORBIDDEN', 'semantic retry is disabled in v1.', profile.profile_id);
    }
    if (profile.failure_handling_policy.provider_fallback.automatic_fallback) {
      this.pushIssue(issues, 'AUTOMATIC_PROVIDER_FALLBACK_FORBIDDEN', 'failure handling cannot enable provider fallback.', profile.profile_id);
    }
    if (profile.failure_handling_policy.supplemental_round.is_retry) {
      this.pushIssue(issues, 'SUPPLEMENTAL_ROUND_MUST_NOT_BE_RETRY', 'supplemental rounds are not retries.', profile.profile_id);
    }
    if (!profile.audit_policy.forbid_hidden_reasoning) {
      this.pushIssue(issues, 'HIDDEN_REASONING_AUDIT_FORBIDDEN', 'hidden reasoning must be forbidden by audit policy.', profile.profile_id);
    }
    if (profile.audit_policy.store_raw_provider_response) {
      this.pushIssue(issues, 'RAW_PROVIDER_RESPONSE_AUDIT_FORBIDDEN', 'raw provider responses must not be stored.', profile.profile_id);
    }
    if (profile.run_mode_eligibility.mocked_llm.includes('product')) {
      this.pushIssue(issues, 'MOCK_PRODUCT_MODE_FORBIDDEN', 'mocked_llm cannot be eligible for product run mode.', profile.profile_id);
    }
    for (const [mode, runModes] of Object.entries(profile.run_mode_eligibility) as Array<[TopicSelectionAgentExecutionMode, TopicSelectionAgentRunMode[]]>) {
      if (runModes.length > 0 && !profile.allowed_execution_modes.includes(mode)) {
        this.pushIssue(issues, 'DISALLOWED_EXECUTION_MODE_ELIGIBILITY', `${mode} has run-mode eligibility but is not an allowed execution mode.`, profile.profile_id);
      }
    }
    if (profile.allowed_execution_modes.includes('provider_llm') && profile.model_options.length === 0) {
      this.pushIssue(issues, 'PROVIDER_MODE_REQUIRES_MODEL_OPTION', 'provider_llm profiles must define at least one model option.', profile.profile_id);
    }
    if (
      profile.failure_handling_policy.technical_retry.enabled
      && profile.budget_policy.max_provider_attempts
        < profile.failure_handling_policy.technical_retry.max_provider_call_attempts
    ) {
      this.pushIssue(
        issues,
        'BUDGET_ATTEMPTS_BELOW_TECHNICAL_RETRY',
        'budget max_provider_attempts must cover the configured technical retry attempt count.',
        profile.profile_id,
      );
    }
    this.validateTechnicalRetry(profile, issues);
    this.validateModelOptions(profile, issues);
  }

  private validateTechnicalRetry(
    profile: TopicSelectionModelProfile,
    issues: TopicSelectionModelProfileRegistryValidationIssue[],
  ): void {
    const retry = profile.failure_handling_policy.technical_retry;
    if (!retry.require_same_profile
      || !retry.require_same_model_option
      || !retry.require_same_prompt_packet_hash
      || !retry.require_same_context_packet_hashes) {
      this.pushIssue(
        issues,
        'TECHNICAL_RETRY_MUST_PRESERVE_INVOCATION',
        'technical retry must preserve profile, option, prompt packet, and context packet hashes.',
        profile.profile_id,
      );
    }
  }

  private validateModelOptions(
    profile: TopicSelectionModelProfile,
    issues: TopicSelectionModelProfileRegistryValidationIssue[],
  ): void {
    const seenOptionIds = new Set<string>();
    for (const option of profile.model_options) {
      if (seenOptionIds.has(option.option_id)) {
        this.pushIssue(issues, 'DUPLICATE_MODEL_OPTION_ID', 'model option ids must be unique inside a profile.', profile.profile_id, option.option_id);
      }
      seenOptionIds.add(option.option_id);
      if (!this.registeredProviderIds.has(option.provider_id)) {
        this.pushIssue(issues, 'UNKNOWN_PROVIDER_ID', 'model option references an unknown provider.', profile.profile_id, option.option_id);
      }
      if (option.normalized_params.structured_output_required
        && !profile.required_capabilities.includes('structured_output')) {
        this.pushIssue(issues, 'STRUCTURED_OUTPUT_CAPABILITY_REQUIRED', 'structured output option requires structured_output capability.', profile.profile_id, option.option_id);
      }
      if (option.normalized_params.output_format === 'json_schema'
        && !profile.required_capabilities.includes('json_schema')) {
        this.pushIssue(issues, 'STRUCTURED_OUTPUT_CAPABILITY_REQUIRED', 'json_schema option requires json_schema capability.', profile.profile_id, option.option_id);
      }
    }
  }

  private selectModelOption(
    profile: TopicSelectionModelProfile,
    modelOptionId?: string | null,
  ): TopicSelectionModelOption {
    if (modelOptionId) {
      const explicitOption = profile.model_options.find((item) => item.option_id === modelOptionId);
      if (!explicitOption) {
        throw new AppError(400, 'INVALID_PAYLOAD', 'model_option_id is not defined by model profile.');
      }
      return explicitOption;
    }
    const option = profile.model_options.find((item) => item.use_when.includes('default_provider_run'))
      ?? profile.model_options[0];
    if (!option) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'provider_llm profile does not define a model option.');
    }
    return option;
  }

  private schemaIssues(errors: ErrorObject[]): TopicSelectionModelProfileRegistryValidationIssue[] {
    return errors.map((error) => ({
      code: 'SCHEMA_VALIDATION_FAILED',
      message: `${error.instancePath || '/'} ${error.message ?? 'schema validation failed'}`,
      path: error.instancePath || '/',
    }));
  }

  private pushIssue(
    issues: TopicSelectionModelProfileRegistryValidationIssue[],
    code: TopicSelectionModelProfileRegistryValidationIssueCode,
    message: string,
    profileId?: string,
    optionId?: string,
  ): void {
    issues.push({
      code,
      message,
      profile_id: profileId,
      option_id: optionId,
    });
  }

  private validationResult(
    issues: TopicSelectionModelProfileRegistryValidationIssue[],
  ): TopicSelectionModelProfileRegistryValidationResult {
    return {
      valid: issues.length === 0,
      issue_count: issues.length,
      issues,
    };
  }

  private hash(value: unknown): string {
    return sha256Text(stableStringify(value));
  }
}
