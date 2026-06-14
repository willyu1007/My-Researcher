import {
  Ajv,
  type ErrorObject,
  type ValidateFunction,
} from 'ajv';
import {
  TOPIC_SELECTION_CONTEXT_POLICY_PROFILE_REGISTRY_SCHEMA_VERSION,
  TOPIC_SELECTION_CONTEXT_POLICY_PROFILE_SCHEMA_VERSION,
  topicSelectionContextPolicyProfileRegistrySchema,
  type TopicSelectionContextExecutionModifier,
  type TopicSelectionContextFamily,
  type TopicSelectionContextFunctionalTemplate,
  type TopicSelectionContextPolicyProfile,
  type TopicSelectionContextPolicyProfileRegistry,
  type TopicSelectionContextSourceKind,
  type TopicSelectionCompressionExecutorKind,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-llm-runtime-contracts';
import { AppError } from '../errors/app-error.js';
import {
  sha256Text,
  stableStringify,
} from './literature-content-processing-utils.js';

export const TOPIC_SELECTION_CONTEXT_RUNTIME_POLICY_VERSION =
  'topic-selection-context-runtime-policy-v1' as const;
export const TOPIC_SELECTION_CONTEXT_RUNTIME_SCHEMA_VERSION =
  TOPIC_SELECTION_CONTEXT_POLICY_PROFILE_SCHEMA_VERSION;
export const TOPIC_SELECTION_NEED_DISCOVERY_CONTEXT_COMPILER_VERSION =
  'topic-selection-need-discovery-context-compiler-v1' as const;
export const TOPIC_SELECTION_CONTEXT_RUNTIME_REDACTION_POLICY =
  'topic-selection-redacted-ref-backed-v1' as const;

export const TOPIC_SELECTION_RESOURCE_SAMPLING_CONTEXT_RUNTIME_PROFILE_IDS = {
  literature_classification_batch:
    'topic-selection.resource-sampling.literature-classification-batch.context-runtime@v1',
} as const;

export const TOPIC_SELECTION_RESOURCE_SAMPLING_INVOCATION_SLOT_IDS = {
  literature_classification_batch: 'resource_classification.batch',
} as const;

export const TOPIC_SELECTION_V1A_N5_CONTEXT_RUNTIME_PROFILE_IDS = {
  evidence_extraction:
    'topic-selection.v1a.n5.evidence-extraction.context-runtime@v1',
} as const;

export const TOPIC_SELECTION_V1A_N5_INVOCATION_SLOT_IDS = {
  evidence_extraction: 'evidence_extraction',
} as const;

export const TOPIC_SELECTION_V1A_N6_CONTEXT_RUNTIME_PROFILE_IDS = {
  need_candidate_generation:
    'topic-selection.v1a.n6.need-candidate-generation.context-runtime@v1',
  explorer_round_1_discovery:
    'topic-selection.v1a.n6.explorer-round-1.context-runtime@v1',
  deep_critic_round_1_discovery:
    'topic-selection.v1a.n6.deep-critic-round-1.context-runtime@v1',
  arbiter_issue_framing:
    'topic-selection.v1a.n6.arbiter-issue-framing.context-runtime@v1',
  arbiter_final_synthesis:
    'topic-selection.v1a.n6.arbiter-final-synthesis.context-runtime@v1',
} as const;

export const TOPIC_SELECTION_V1A_N6_INVOCATION_SLOT_IDS = {
  need_candidate_generation: 'need_candidate_generation',
  explorer_round_1_discovery: 'explorer.round_1_discovery',
  deep_critic_round_1_discovery: 'deep_critic.round_1_discovery',
  arbiter_issue_framing: 'arbiter.issue_framing',
  arbiter_final_synthesis: 'arbiter.final_synthesis',
} as const;

export const TOPIC_SELECTION_V1A_N7_CONTEXT_RUNTIME_PROFILE_IDS = {
  adjudication_recommendation:
    'topic-selection.v1a.n7.need-adjudication.context-runtime@v1',
} as const;

export const TOPIC_SELECTION_V1A_N7_INVOCATION_SLOT_IDS = {
  adjudication_recommendation: 'adjudication_recommendation',
} as const;

export const TOPIC_SELECTION_V1A_N8_CONTEXT_RUNTIME_PROFILE_IDS = {
  confirmation_semantic_review:
    'topic-selection.v1a.n8.human-confirmation-semantic-review.context-runtime@v1',
} as const;

export const TOPIC_SELECTION_V1A_N8_INVOCATION_SLOT_IDS = {
  confirmation_semantic_review: 'confirmation_semantic_review',
} as const;

export const TOPIC_SELECTION_V1B_N4_CONTEXT_RUNTIME_PROFILE_IDS = {
  research_slice_option_draft:
    'topic-selection.v1b.n4.research-slice-options.context-runtime@v1',
} as const;

export const TOPIC_SELECTION_V1B_N4_INVOCATION_SLOT_IDS = {
  research_slice_option_draft: 'n4_research_slice_option_draft',
} as const;

export const TOPIC_SELECTION_V1B_EARLY_SEMANTIC_CONTEXT_RUNTIME_PROFILE_IDS = {
  constraint_profile_support:
    'topic-selection.v1b.n2.constraint-profile-support.context-runtime@v1',
  intake_readiness_support:
    'topic-selection.v1b.n3.intake-readiness-support.context-runtime@v1',
  slice_selection_support:
    'topic-selection.v1b.n5.slice-selection-support.context-runtime@v1',
} as const;

export const TOPIC_SELECTION_V1B_EARLY_SEMANTIC_INVOCATION_SLOT_IDS = {
  constraint_profile_support: 'n2_constraint_profile_semantic_support',
  intake_readiness_support: 'n3_readiness_classification',
  slice_selection_support: 'n5_slice_selection_review',
} as const;

export const TOPIC_SELECTION_V1B_N6_CONTEXT_RUNTIME_PROFILE_IDS = {
  question_candidate_draft:
    'topic-selection.v1b.n6.question-candidate-draft.context-runtime@v1',
  loopback_triage:
    'topic-selection.v1b.n6.loopback-triage.context-runtime@v1',
} as const;

export const TOPIC_SELECTION_V1B_N6_INVOCATION_SLOT_IDS = {
  question_candidate_draft: 'n6_question_candidate_draft',
  loopback_triage: 'n6_loopback_triage',
} as const;

export const TOPIC_SELECTION_V1B_N7_CONTEXT_RUNTIME_PROFILE_IDS = {
  candidate_grouping:
    'topic-selection.v1b.n7.candidate-grouping.context-runtime@v1',
  failed_trial_synthesis:
    'topic-selection.v1b.n7.failed-trial-synthesis.context-runtime@v1',
  n8_debate_admission_review:
    'topic-selection.v1b.n7.n8-debate-admission-review.context-runtime@v1',
} as const;

export const TOPIC_SELECTION_V1B_N7_INVOCATION_SLOT_IDS = {
  candidate_grouping: 'n7_candidate_grouping',
  failed_trial_synthesis: 'n7_failed_trial_synthesis',
  n8_debate_admission_review: 'n7_n8_debate_admission_review',
} as const;

export const TOPIC_SELECTION_V1B_N8_CONTEXT_RUNTIME_PROFILE_IDS = {
  value_assessment_draft:
    'topic-selection.v1b.n8.topic-value-assessment.context-runtime@v1',
} as const;

export const TOPIC_SELECTION_V1B_N8_INVOCATION_SLOT_IDS = {
  value_assessment_draft: 'n8_value_assessment_draft',
} as const;

export const TOPIC_SELECTION_V1B_N8_BOUNDED_DEBATE_CONTEXT_RUNTIME_PROFILE_IDS = {
  assessor_draft:
    'topic-selection.v1b.n8.bounded-debate.assessor-draft.context-runtime@v1',
  value_critic:
    'topic-selection.v1b.n8.bounded-debate.value-critic.context-runtime@v1',
  assessor_repair:
    'topic-selection.v1b.n8.bounded-debate.assessor-repair.context-runtime@v1',
  synthesizer_final:
    'topic-selection.v1b.n8.bounded-debate.synthesizer-final.context-runtime@v1',
} as const;

export const TOPIC_SELECTION_V1B_N8_BOUNDED_DEBATE_INVOCATION_SLOT_IDS = {
  assessor_draft: 'n8_debate_assessor_draft',
  value_critic: 'n8_debate_value_critic',
  assessor_repair: 'n8_debate_assessor_repair',
  synthesizer_final: 'n8_debate_synthesizer_final',
} as const;

export const TOPIC_SELECTION_V1C_N2_CONTEXT_RUNTIME_PROFILE_IDS = {
  promotion_support_llm_draft:
    'topic-selection.v1c.n2.promotion-support-llm-draft.context-runtime@v1',
} as const;

export const TOPIC_SELECTION_V1C_N2_INVOCATION_SLOT_IDS = {
  promotion_support_llm_draft: 'promotion_support_generation.llm_draft',
} as const;

export const TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_CONTEXT_RUNTIME_PROFILE_IDS = {
  promotion_supporter_draft:
    'topic-selection.v1c.n2.bounded-debate.supporter-draft.context-runtime@v1',
  reviewer_critic_review:
    'topic-selection.v1c.n2.bounded-debate.reviewer-critic.context-runtime@v1',
  promotion_supporter_repair:
    'topic-selection.v1c.n2.bounded-debate.supporter-repair.context-runtime@v1',
  synthesizer_final:
    'topic-selection.v1c.n2.bounded-debate.synthesizer-final.context-runtime@v1',
} as const;

export const TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_INVOCATION_SLOT_IDS = {
  promotion_supporter_draft: 'n2_bounded_micro_debate.promotion_supporter_draft',
  reviewer_critic_review: 'n2_bounded_micro_debate.reviewer_critic_review',
  promotion_supporter_repair: 'n2_bounded_micro_debate.promotion_supporter_repair',
  synthesizer_final: 'n2_bounded_micro_debate.synthesizer_final',
} as const;

export const TOPIC_SELECTION_V1C_N4_CONTEXT_RUNTIME_PROFILE_IDS = {
  delegated_promotion_decision_candidate:
    'topic-selection.v1c.n4.delegated-promotion-decision.context-runtime@v1',
} as const;

export const TOPIC_SELECTION_V1C_N4_INVOCATION_SLOT_IDS = {
  delegated_promotion_decision_candidate: 'n4_delegated_promotion_decision_candidate',
} as const;

export const TOPIC_SELECTION_V1C_N6_CONTEXT_RUNTIME_PROFILE_IDS = {
  downstream_feedback_normalization:
    'topic-selection.v1c.n6.downstream-feedback-normalization.context-runtime@v1',
} as const;

export const TOPIC_SELECTION_V1C_N6_INVOCATION_SLOT_IDS = {
  downstream_feedback_normalization: 'downstream_feedback_normalization',
} as const;

export type TopicSelectionContextPolicyProfileRegistryValidationIssueCode =
  | 'SCHEMA_VALIDATION_FAILED'
  | 'DUPLICATE_PROFILE_ID'
  | 'DUPLICATE_INVOCATION_SLOT_ID'
  | 'DURABLE_MEMORY_AUTHORITY_FORBIDDEN'
  | 'PROVIDER_REQUIRED_LIVE_POLICY_INVALID'
  | 'COMPRESSION_QUALITY_GATE_REQUIRED'
  | 'COMPRESSION_EXECUTOR_REQUIRED'
  | 'CACHE_KEY_FIELD_MISSING'
  | 'CACHE_POST_GATE_MISSING'
  | 'FORBIDDEN_PAYLOAD_CLASS_MISSING'
  | 'REQUIRED_PRESERVED_FACT_MISSING';

export interface TopicSelectionContextPolicyProfileRegistryValidationIssue {
  code: TopicSelectionContextPolicyProfileRegistryValidationIssueCode;
  message: string;
  context_policy_profile_id?: string;
  invocation_slot_id?: string;
  path?: string;
}

export interface TopicSelectionContextPolicyProfileRegistryValidationResult {
  valid: boolean;
  issue_count: number;
  issues: TopicSelectionContextPolicyProfileRegistryValidationIssue[];
}

export interface TopicSelectionResolvedContextPolicyProfile {
  profile: TopicSelectionContextPolicyProfile;
  profile_hash: string;
}

export interface ResolveTopicSelectionContextPolicyProfileInput {
  context_policy_profile_id: string;
  context_policy_profile_version?: string | null;
  invocation_slot_id?: string | null;
  expected_profile_hash?: string | null;
}

const PROFILE_VERSION = 'v1' as const;

const COMMON_SOURCE_KINDS: TopicSelectionContextSourceKind[] = [
  'authority_record',
  'ref_backed_artifact',
  'durable_memory',
  'prior_llm_output',
];

const COMMON_EXECUTION_MODIFIERS: TopicSelectionContextExecutionModifier[] = [
  'provider_required_live',
  'codex_exact_reuse_allowed',
  'mock_replay_allowed',
  'compression_allowed_with_quality_gate',
];

const COMMON_PRESERVED_FACT_KINDS = [
  'blocker',
  'residual_risk',
  'accepted_risk',
  'source_health_warning',
  'method_family_gap',
  'unresolved_challenge',
  'recheck_hint',
] as const;

const COMMON_FORBIDDEN_PAYLOAD_CLASSES = [
  'hidden_reasoning',
  'raw_provider_logs',
  'credentials',
  'secrets',
  'unredacted_private_content',
] as const;

const REQUIRED_CACHE_KEY_FIELDS = [
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
] as const;

const REQUIRED_POST_CACHE_GATES = [
  'schema_validation',
  'deterministic_gate',
  'authority_boundary',
] as const;

const V1C_N2_BOUNDED_DEBATE_PRESERVED_FACT_KINDS = [
  ...COMMON_PRESERVED_FACT_KINDS,
  'promotion_input_snapshot',
  'topic_package',
  'topic_question_contract',
  'answerability_plan',
  'research_slice',
  'value_assessment',
  'promotion_readiness',
  'selected_evidence',
  'evidence_ref',
  'evidence_support_map',
  'claim_ceiling',
  'contribution_summary',
  'evaluation_plan',
  'accepted_risk',
  'blocker',
  'recheck_hint',
  'recheck_obligation',
  'memory_suggestion',
  'source_health_warning',
  'allowed_ref_manifest',
  'critic_finding',
  'critic_resolution_map',
  'readiness_coverage_item',
] as const;

const V1C_N2_BOUNDED_DEBATE_POST_RUNTIME_GATES = [
  'schema_validation',
  'role_artifact_admission',
  'dynamic_material_boundary',
  'promotion_support_admission',
  'deterministic_gate',
  'authority_boundary',
] as const;

// v1b N8 value-assessment context facts (beyond COMMON). Single-sourced so the single-agent
// draft profile and the bounded-debate roles preserve an identical N8 context — the synthesizer's
// final draft must satisfy the SAME gate as the single-agent draft it substitutes for.
const V1B_N8_BASE_PRESERVED_FACT_KINDS = [
  'n7_handoff',
  'n7_to_n8_projection',
  'topic_question',
  'topic_question_contract',
  'active_candidate_identity',
  'answerability_plan',
  'trial_ledger',
  'selected_slice_identity',
  'candidate_set_identity',
  'value_rationale',
  'support_quality',
  'reviewer_uncertainty',
  'risk_gap_blocker_fact',
  'feedback_recheck_hint',
] as const;

// Bounded-debate roles add the debate-threading facts. NOTE: critic_finding / critic_resolution_map
// are NOT in the single-agent fact builder — the STEP-7 debate strategy must emit them from the
// prior-role artifacts (as v1c N2 does); the single-agent base builder cannot produce them.
const V1B_N8_BOUNDED_DEBATE_PRESERVED_FACT_KINDS = [
  ...COMMON_PRESERVED_FACT_KINDS,
  ...V1B_N8_BASE_PRESERVED_FACT_KINDS,
  'critic_finding',
  'critic_resolution_map',
] as const;

const V1B_N8_BOUNDED_DEBATE_POST_RUNTIME_GATES = [
  'schema_validation',
  'role_artifact_admission',
  'dynamic_material_boundary',
  'draft_admission',
  'deterministic_gate',
  'feedback_boundary',
  'authority_boundary',
] as const;

const V1C_N6_DOWNSTREAM_FEEDBACK_PRESERVED_FACT_KINDS = [
  ...COMMON_PRESERVED_FACT_KINDS,
  'paper_project_bridge',
  'source_promotion_decision',
  'promotion_commitment_profile',
  'promotion_input_snapshot',
  'downstream_source_ref',
  'source_feedback_ref',
  'feedback_signal',
  'required_action',
  'affected_ref',
  'loopback_target',
  'severity',
  'no_upstream_mutation_boundary',
  'allowed_ref_manifest',
] as const;

const V1C_N6_DOWNSTREAM_FEEDBACK_POST_RUNTIME_GATES = [
  'schema_validation',
  'feedback_normalization_admission',
  'deterministic_gate',
  'recheck_side_effect_boundary',
  'authority_boundary',
] as const;

const V1C_N4_DELEGATED_PROMOTION_DECISION_PRESERVED_FACT_KINDS = [
  ...COMMON_PRESERVED_FACT_KINDS,
  'promotion_gate_handoff',
  'promotion_input_snapshot',
  'promotion_gate_disposition',
  'promote_allowed',
  'promotion_decision_support',
  'promotion_dossier',
  'argument_readiness_mini_check',
  'required_action',
  'loopback_hint',
  'accepted_risk',
  'claim_ceiling',
  'early_check_obligation',
  'condition',
  'allowed_ref_manifest',
  'human_authority_boundary',
  'no_bridge_creation_boundary',
] as const;

const V1C_N4_DELEGATED_PROMOTION_DECISION_POST_RUNTIME_GATES = [
  'schema_validation',
  'delegated_promotion_decision_admission',
  'human_authority_boundary',
  'bridge_side_effect_boundary',
  'authority_boundary',
] as const;

function contextPolicyProfile(input: {
  context_policy_profile_id: string;
  invocation_slot_id: string;
  functional_template: TopicSelectionContextFunctionalTemplate;
  context_family: TopicSelectionContextFamily;
  estimated_input_token_target: number;
  estimated_output_token_budget: number;
  post_reuse_gates?: string[];
  post_cache_gates?: string[];
  allowed_source_kinds?: TopicSelectionContextSourceKind[];
  allowed_executor_kinds?: TopicSelectionCompressionExecutorKind[];
  preserved_fact_kinds?: string[];
}): TopicSelectionContextPolicyProfile {
  return {
    schema_version: TOPIC_SELECTION_CONTEXT_POLICY_PROFILE_SCHEMA_VERSION,
    context_policy_profile_id: input.context_policy_profile_id,
    context_policy_profile_version: PROFILE_VERSION,
    invocation_slot_id: input.invocation_slot_id,
    functional_template: input.functional_template,
    execution_modifiers: [...COMMON_EXECUTION_MODIFIERS],
    context_family: input.context_family,
    allowed_source_kinds: input.allowed_source_kinds ?? [...COMMON_SOURCE_KINDS],
    memory_policy: {
      allowed_memory_families: [
        'topic_selection_recheck_risk_memory',
        'topic_selection_need_discovery_decision_memory',
      ],
      required_use_labels: [
        'blocker',
        'residual_risk',
        'accepted_risk',
        'source_health_warning',
        'method_family_gap',
        'unresolved_challenge',
        'recheck_hint',
      ],
      stale_behavior: 'block',
      missing_required_memory_behavior: 'block',
      durable_memory_as_standalone_evidence: false,
    },
    compression_policy: {
      compression_mode: 'required_when_over_budget',
      allowed_executor_kinds: input.allowed_executor_kinds ?? ['deterministic_structural', 'codex_assisted'],
      compression_strategy_id: 'topic-selection-context-compression',
      compression_strategy_version: 'v1',
      preserved_fact_kinds: input.preserved_fact_kinds ?? [...COMMON_PRESERVED_FACT_KINDS],
      forbidden_payload_classes: [...COMMON_FORBIDDEN_PAYLOAD_CLASSES],
      quality_gate_required: true,
    },
    cache_policy: {
      cache_enabled: true,
      cache_scope: 'context_identity_preprocessing',
      exact_key_fields: [...REQUIRED_CACHE_KEY_FIELDS],
      stale_behavior: 'block',
      post_cache_gates: input.post_cache_gates ?? [...REQUIRED_POST_CACHE_GATES],
    },
    token_budget_policy: {
      estimated_input_token_target: input.estimated_input_token_target,
      estimated_output_token_budget: input.estimated_output_token_budget,
      context_window_tokens: 128000,
      token_estimate_safety_margin: 1.25,
      unknown_estimate_behavior: 'blocked_over_budget',
    },
    reuse_policy: {
      provider_llm_response_reuse: 'blocked',
      codex_exact_reuse_requires_approval: true,
      mock_replay_allowed: true,
      provider_required_live_behavior: 'live_call_required',
    },
    post_reuse_gates: input.post_reuse_gates ?? [
      'schema_validation',
      'deterministic_gate',
      'authority_boundary',
    ],
    provenance_policy: {
      runtime_audit_envelope_required: true,
      operator_audit_summary_required: true,
      human_trust_summary_required: input.functional_template === 'candidate_for_deterministic_gate',
      forbidden_persisted_payload_classes: [...COMMON_FORBIDDEN_PAYLOAD_CLASSES],
    },
    redaction_policy: TOPIC_SELECTION_CONTEXT_RUNTIME_REDACTION_POLICY,
  };
}

const DEFAULT_TOPIC_SELECTION_CONTEXT_POLICY_PROFILE_REGISTRY:
  TopicSelectionContextPolicyProfileRegistry = {
    schema_version: TOPIC_SELECTION_CONTEXT_POLICY_PROFILE_REGISTRY_SCHEMA_VERSION,
    profiles: [
      contextPolicyProfile({
        context_policy_profile_id:
          TOPIC_SELECTION_RESOURCE_SAMPLING_CONTEXT_RUNTIME_PROFILE_IDS.literature_classification_batch,
        invocation_slot_id:
          TOPIC_SELECTION_RESOURCE_SAMPLING_INVOCATION_SLOT_IDS.literature_classification_batch,
        functional_template: 'candidate_for_deterministic_gate',
        context_family: 'resource_sampling_literature_classification_batch',
        estimated_input_token_target: 24000,
        estimated_output_token_budget: 2048,
        preserved_fact_kinds: [
          ...COMMON_PRESERVED_FACT_KINDS,
          'topic_id',
          'sample_role_targets',
          'literature_ref',
          'candidate_title',
          'candidate_abstract',
          'key_content_digest',
          'activation_score',
          'source_count',
          'role_classification',
          'classification_rationale',
          'method_family',
          'guardrail_signal',
        ],
        post_reuse_gates: [
          'schema_validation',
          'resource_sampling_guardrails',
          'deterministic_gate',
          'authority_boundary',
        ],
        post_cache_gates: [
          'schema_validation',
          'resource_sampling_guardrails',
          'deterministic_gate',
          'authority_boundary',
        ],
      }),
      contextPolicyProfile({
        context_policy_profile_id:
          TOPIC_SELECTION_V1A_N5_CONTEXT_RUNTIME_PROFILE_IDS.evidence_extraction,
        invocation_slot_id: TOPIC_SELECTION_V1A_N5_INVOCATION_SLOT_IDS.evidence_extraction,
        functional_template: 'candidate_for_deterministic_gate',
        context_family: 'v1a_n5_evidence_extraction',
        estimated_input_token_target: 32000,
        estimated_output_token_budget: 4096,
      }),
      contextPolicyProfile({
        context_policy_profile_id:
          TOPIC_SELECTION_V1A_N6_CONTEXT_RUNTIME_PROFILE_IDS.need_candidate_generation,
        invocation_slot_id: TOPIC_SELECTION_V1A_N6_INVOCATION_SLOT_IDS.need_candidate_generation,
        functional_template: 'candidate_for_deterministic_gate',
        context_family: 'v1a_n6_exploration',
        estimated_input_token_target: 28000,
        estimated_output_token_budget: 4096,
      }),
      contextPolicyProfile({
        context_policy_profile_id:
          TOPIC_SELECTION_V1A_N6_CONTEXT_RUNTIME_PROFILE_IDS.explorer_round_1_discovery,
        invocation_slot_id: TOPIC_SELECTION_V1A_N6_INVOCATION_SLOT_IDS.explorer_round_1_discovery,
        functional_template: 'support_only_semantic',
        context_family: 'v1a_n6_exploration',
        estimated_input_token_target: 24000,
        estimated_output_token_budget: 1600,
        post_reuse_gates: ['schema_validation', 'debate_role_boundary'],
      }),
      contextPolicyProfile({
        context_policy_profile_id:
          TOPIC_SELECTION_V1A_N6_CONTEXT_RUNTIME_PROFILE_IDS.deep_critic_round_1_discovery,
        invocation_slot_id: TOPIC_SELECTION_V1A_N6_INVOCATION_SLOT_IDS.deep_critic_round_1_discovery,
        functional_template: 'support_only_semantic',
        context_family: 'v1a_n6_exploration',
        estimated_input_token_target: 24000,
        estimated_output_token_budget: 1600,
        post_reuse_gates: ['schema_validation', 'debate_role_boundary'],
      }),
      contextPolicyProfile({
        context_policy_profile_id:
          TOPIC_SELECTION_V1A_N6_CONTEXT_RUNTIME_PROFILE_IDS.arbiter_issue_framing,
        invocation_slot_id: TOPIC_SELECTION_V1A_N6_INVOCATION_SLOT_IDS.arbiter_issue_framing,
        functional_template: 'support_only_semantic',
        context_family: 'v1a_n6_arbiter',
        estimated_input_token_target: 26000,
        estimated_output_token_budget: 1200,
        post_reuse_gates: ['schema_validation', 'dynamic_prompt_material_boundary'],
      }),
      contextPolicyProfile({
        context_policy_profile_id:
          TOPIC_SELECTION_V1A_N6_CONTEXT_RUNTIME_PROFILE_IDS.arbiter_final_synthesis,
        invocation_slot_id: TOPIC_SELECTION_V1A_N6_INVOCATION_SLOT_IDS.arbiter_final_synthesis,
        functional_template: 'candidate_for_deterministic_gate',
        context_family: 'v1a_n6_arbiter',
        estimated_input_token_target: 28000,
        estimated_output_token_budget: 4096,
      }),
      contextPolicyProfile({
        context_policy_profile_id:
          TOPIC_SELECTION_V1A_N7_CONTEXT_RUNTIME_PROFILE_IDS.adjudication_recommendation,
        invocation_slot_id: TOPIC_SELECTION_V1A_N7_INVOCATION_SLOT_IDS.adjudication_recommendation,
        functional_template: 'candidate_for_deterministic_gate',
        context_family: 'v1a_n7_need_adjudication_support',
        estimated_input_token_target: 18000,
        estimated_output_token_budget: 2048,
      }),
      contextPolicyProfile({
        context_policy_profile_id:
          TOPIC_SELECTION_V1A_N8_CONTEXT_RUNTIME_PROFILE_IDS.confirmation_semantic_review,
        invocation_slot_id: TOPIC_SELECTION_V1A_N8_INVOCATION_SLOT_IDS.confirmation_semantic_review,
        functional_template: 'human_review_advisory',
        context_family: 'v1a_n8_human_confirmation_semantic_review',
        estimated_input_token_target: 10000,
        estimated_output_token_budget: 1200,
        post_reuse_gates: [
          'schema_validation',
          'semantic_review_gate',
          'human_authority_boundary',
        ],
      }),
      contextPolicyProfile({
        context_policy_profile_id:
          TOPIC_SELECTION_V1B_N4_CONTEXT_RUNTIME_PROFILE_IDS.research_slice_option_draft,
        invocation_slot_id: TOPIC_SELECTION_V1B_N4_INVOCATION_SLOT_IDS.research_slice_option_draft,
        functional_template: 'candidate_for_deterministic_gate',
        context_family: 'v1b_n4_research_slice_option_generation',
        estimated_input_token_target: 22000,
        estimated_output_token_budget: 4096,
        preserved_fact_kinds: [
          ...COMMON_PRESERVED_FACT_KINDS,
          'n3_handoff',
          'intake_snapshot_identity',
          'constraint_profile',
          'intake_readiness',
          'validated_need',
          'evidence_role_bundle',
          'evidence_ref',
          'claim_ceiling',
          'non_goal',
          'accepted_risk',
          'risk_gap_blocker_fact',
          'recheck_hint',
          'memory_suggestion',
          'source_health_warning',
          'planning_input',
        ],
        post_reuse_gates: [
          'schema_validation',
          'draft_admission',
          'compression_structure_manifest',
          'deterministic_gate',
          'authority_boundary',
        ],
        post_cache_gates: [
          'schema_validation',
          'draft_admission',
          'compression_structure_manifest',
          'deterministic_gate',
          'authority_boundary',
        ],
      }),
      contextPolicyProfile({
        context_policy_profile_id:
          TOPIC_SELECTION_V1B_EARLY_SEMANTIC_CONTEXT_RUNTIME_PROFILE_IDS.constraint_profile_support,
        invocation_slot_id: TOPIC_SELECTION_V1B_EARLY_SEMANTIC_INVOCATION_SLOT_IDS.constraint_profile_support,
        functional_template: 'delegated_payload_candidate',
        context_family: 'v1b_constraint_profile_context',
        estimated_input_token_target: 14000,
        estimated_output_token_budget: 1600,
        preserved_fact_kinds: [
          ...COMMON_PRESERVED_FACT_KINDS,
          'intake_snapshot_identity',
          'v1a_bundle_identity',
          'accepted_constraint_profile_payload',
          'previous_constraint_profile',
          'target_community',
          'method_constraint',
          'resource_constraint',
          'available_asset',
          'feasibility_budget',
          'non_goal',
          'claim_ceiling',
        ],
        post_reuse_gates: [
          'schema_validation',
          'support_artifact_admission',
          'deterministic_gate',
          'delegated_authority_boundary',
          'authority_boundary',
        ],
        post_cache_gates: [
          'schema_validation',
          'support_artifact_admission',
          'deterministic_gate',
          'delegated_authority_boundary',
          'authority_boundary',
        ],
      }),
      contextPolicyProfile({
        context_policy_profile_id:
          TOPIC_SELECTION_V1B_EARLY_SEMANTIC_CONTEXT_RUNTIME_PROFILE_IDS.intake_readiness_support,
        invocation_slot_id: TOPIC_SELECTION_V1B_EARLY_SEMANTIC_INVOCATION_SLOT_IDS.intake_readiness_support,
        functional_template: 'support_only_semantic',
        context_family: 'v1b_intake_readiness_context',
        estimated_input_token_target: 12000,
        estimated_output_token_budget: 1200,
        preserved_fact_kinds: [
          ...COMMON_PRESERVED_FACT_KINDS,
          'intake_snapshot_identity',
          'constraint_profile',
          'n2_handoff',
          'readiness_blocker',
          'readiness_warning',
          'profile_repair_hint',
          'snapshot_refresh_hint',
        ],
        post_reuse_gates: [
          'schema_validation',
          'support_artifact_admission',
          'deterministic_gate',
          'readiness_boundary',
          'authority_boundary',
        ],
        post_cache_gates: [
          'schema_validation',
          'support_artifact_admission',
          'deterministic_gate',
          'readiness_boundary',
          'authority_boundary',
        ],
      }),
      contextPolicyProfile({
        context_policy_profile_id:
          TOPIC_SELECTION_V1B_EARLY_SEMANTIC_CONTEXT_RUNTIME_PROFILE_IDS.slice_selection_support,
        invocation_slot_id: TOPIC_SELECTION_V1B_EARLY_SEMANTIC_INVOCATION_SLOT_IDS.slice_selection_support,
        functional_template: 'delegated_payload_candidate',
        context_family: 'v1b_slice_selection_context',
        estimated_input_token_target: 16000,
        estimated_output_token_budget: 1600,
        preserved_fact_kinds: [
          ...COMMON_PRESERVED_FACT_KINDS,
          'research_slice_option_set',
          'n4_handoff',
          'accepted_selection_payload',
          'selected_option_identity',
          'rejected_option_reason',
          'loopback_target',
          'selection_rationale',
          'accepted_risk',
          'human_review_reason',
        ],
        post_reuse_gates: [
          'schema_validation',
          'support_artifact_admission',
          'deterministic_gate',
          'delegated_authority_boundary',
          'authority_boundary',
        ],
        post_cache_gates: [
          'schema_validation',
          'support_artifact_admission',
          'deterministic_gate',
          'delegated_authority_boundary',
          'authority_boundary',
        ],
      }),
      contextPolicyProfile({
        context_policy_profile_id:
          TOPIC_SELECTION_V1B_N6_CONTEXT_RUNTIME_PROFILE_IDS.question_candidate_draft,
        invocation_slot_id: TOPIC_SELECTION_V1B_N6_INVOCATION_SLOT_IDS.question_candidate_draft,
        functional_template: 'candidate_for_deterministic_gate',
        context_family: 'v1b_n6_topic_question_generation',
        estimated_input_token_target: 24000,
        estimated_output_token_budget: 4096,
        preserved_fact_kinds: [
          ...COMMON_PRESERVED_FACT_KINDS,
          'selected_slice_identity',
          'n5_handoff',
          'selected_option_identity',
          'option_set_identity',
          'constraint_profile',
          'intake_readiness',
          'evidence_ref',
          'boundary_ref',
          'assumption_ref',
          'claim_ceiling',
          'non_goal',
          'source_health_warning',
          'n7_loopback_projection',
          'n6_gate_failure_projection',
          'failed_draft_identity',
          'blocked_candidate_context',
          'failed_trial_synthesis',
          'exhausted_candidate_ref',
          'exhausted_candidate_hash',
          'candidate_order',
          'failure_reason_code',
          'regeneration_hint',
          'loopback_target',
          'n8_feedback',
        ],
        post_reuse_gates: [
          'schema_validation',
          'draft_admission',
          'deterministic_gate',
          'authority_boundary',
        ],
        post_cache_gates: [
          'schema_validation',
          'draft_admission',
          'deterministic_gate',
          'authority_boundary',
        ],
      }),
      contextPolicyProfile({
        context_policy_profile_id:
          TOPIC_SELECTION_V1B_N6_CONTEXT_RUNTIME_PROFILE_IDS.loopback_triage,
        invocation_slot_id: TOPIC_SELECTION_V1B_N6_INVOCATION_SLOT_IDS.loopback_triage,
        functional_template: 'support_only_semantic',
        context_family: 'v1b_n6_loopback_triage_context',
        estimated_input_token_target: 18000,
        estimated_output_token_budget: 1200,
        preserved_fact_kinds: [
          ...COMMON_PRESERVED_FACT_KINDS,
          'selected_slice_identity',
          'n5_handoff',
          'failed_draft_identity',
          'blocked_candidate_context',
          'dominant_reason_code',
          'affected_ref',
          'regeneration_hint',
          'debate_escalation',
          'upstream_rollback',
          'loopback_target',
        ],
        post_reuse_gates: [
          'schema_validation',
          'support_artifact_admission',
          'deterministic_gate',
          'loopback_boundary',
          'authority_boundary',
        ],
        post_cache_gates: [
          'schema_validation',
          'support_artifact_admission',
          'deterministic_gate',
          'loopback_boundary',
          'authority_boundary',
        ],
      }),
      contextPolicyProfile({
        context_policy_profile_id:
          TOPIC_SELECTION_V1B_N7_CONTEXT_RUNTIME_PROFILE_IDS.candidate_grouping,
        invocation_slot_id: TOPIC_SELECTION_V1B_N7_INVOCATION_SLOT_IDS.candidate_grouping,
        functional_template: 'support_only_semantic',
        context_family: 'v1b_n7_topic_question_hardening',
        estimated_input_token_target: 18000,
        estimated_output_token_budget: 1200,
        preserved_fact_kinds: [
          ...COMMON_PRESERVED_FACT_KINDS,
          'candidate_identity',
          'candidate_order',
          'overlap_group',
          'grouping_rationale',
          'priority_signal',
          'candidate_relationship_hint',
        ],
        post_reuse_gates: [
          'schema_validation',
          'support_artifact_admission',
          'deterministic_gate',
          'authority_boundary',
        ],
        post_cache_gates: [
          'schema_validation',
          'support_artifact_admission',
          'deterministic_gate',
          'authority_boundary',
        ],
      }),
      contextPolicyProfile({
        context_policy_profile_id:
          TOPIC_SELECTION_V1B_N7_CONTEXT_RUNTIME_PROFILE_IDS.failed_trial_synthesis,
        invocation_slot_id: TOPIC_SELECTION_V1B_N7_INVOCATION_SLOT_IDS.failed_trial_synthesis,
        functional_template: 'support_only_semantic',
        context_family: 'v1b_n7_topic_question_hardening',
        estimated_input_token_target: 20000,
        estimated_output_token_budget: 1400,
        preserved_fact_kinds: [
          ...COMMON_PRESERVED_FACT_KINDS,
          'failure_reason',
          'failed_candidate_identity',
          'affected_ref',
          'previous_n7_handoff',
          'n8_feedback',
          'regeneration_hint',
          'loopback_target',
        ],
        post_reuse_gates: [
          'schema_validation',
          'support_artifact_admission',
          'deterministic_gate',
          'loopback_boundary',
          'authority_boundary',
        ],
        post_cache_gates: [
          'schema_validation',
          'support_artifact_admission',
          'deterministic_gate',
          'loopback_boundary',
          'authority_boundary',
        ],
      }),
      contextPolicyProfile({
        context_policy_profile_id:
          TOPIC_SELECTION_V1B_N7_CONTEXT_RUNTIME_PROFILE_IDS.n8_debate_admission_review,
        invocation_slot_id: TOPIC_SELECTION_V1B_N7_INVOCATION_SLOT_IDS.n8_debate_admission_review,
        functional_template: 'support_only_semantic',
        context_family: 'v1b_n7_topic_question_hardening',
        estimated_input_token_target: 18000,
        estimated_output_token_budget: 1200,
        preserved_fact_kinds: [
          ...COMMON_PRESERVED_FACT_KINDS,
          'n8_gate_rejection_reason',
          'debate_admission_need',
          'candidate_identity',
          'failed_contract_identity',
          'value_risk_fact',
        ],
        post_reuse_gates: [
          'schema_validation',
          'support_artifact_admission',
          'deterministic_gate',
          'n8_admission_boundary',
          'authority_boundary',
        ],
        post_cache_gates: [
          'schema_validation',
          'support_artifact_admission',
          'deterministic_gate',
          'n8_admission_boundary',
          'authority_boundary',
        ],
      }),
      contextPolicyProfile({
        context_policy_profile_id:
          TOPIC_SELECTION_V1B_N8_CONTEXT_RUNTIME_PROFILE_IDS.value_assessment_draft,
        invocation_slot_id: TOPIC_SELECTION_V1B_N8_INVOCATION_SLOT_IDS.value_assessment_draft,
        functional_template: 'candidate_for_deterministic_gate',
        context_family: 'v1b_n8_topic_value_assessment',
        estimated_input_token_target: 22000,
        estimated_output_token_budget: 4096,
        preserved_fact_kinds: [
          ...COMMON_PRESERVED_FACT_KINDS,
          ...V1B_N8_BASE_PRESERVED_FACT_KINDS,
        ],
        post_reuse_gates: [
          'schema_validation',
          'draft_admission',
          'compression_structure_manifest',
          'deterministic_gate',
          'feedback_boundary',
          'authority_boundary',
        ],
        post_cache_gates: [
          'schema_validation',
          'draft_admission',
          'compression_structure_manifest',
          'deterministic_gate',
          'feedback_boundary',
          'authority_boundary',
        ],
      }),
      contextPolicyProfile({
        context_policy_profile_id:
          TOPIC_SELECTION_V1B_N8_BOUNDED_DEBATE_CONTEXT_RUNTIME_PROFILE_IDS.assessor_draft,
        invocation_slot_id:
          TOPIC_SELECTION_V1B_N8_BOUNDED_DEBATE_INVOCATION_SLOT_IDS.assessor_draft,
        functional_template: 'support_only_semantic',
        context_family: 'v1b_n8_topic_value_assessment',
        estimated_input_token_target: 22000,
        estimated_output_token_budget: 1800,
        preserved_fact_kinds: [...V1B_N8_BOUNDED_DEBATE_PRESERVED_FACT_KINDS],
        post_reuse_gates: [...V1B_N8_BOUNDED_DEBATE_POST_RUNTIME_GATES],
        post_cache_gates: [...V1B_N8_BOUNDED_DEBATE_POST_RUNTIME_GATES],
      }),
      contextPolicyProfile({
        context_policy_profile_id:
          TOPIC_SELECTION_V1B_N8_BOUNDED_DEBATE_CONTEXT_RUNTIME_PROFILE_IDS.value_critic,
        invocation_slot_id:
          TOPIC_SELECTION_V1B_N8_BOUNDED_DEBATE_INVOCATION_SLOT_IDS.value_critic,
        functional_template: 'support_only_semantic',
        context_family: 'v1b_n8_topic_value_assessment',
        estimated_input_token_target: 24000,
        estimated_output_token_budget: 2000,
        preserved_fact_kinds: [...V1B_N8_BOUNDED_DEBATE_PRESERVED_FACT_KINDS],
        post_reuse_gates: [...V1B_N8_BOUNDED_DEBATE_POST_RUNTIME_GATES],
        post_cache_gates: [...V1B_N8_BOUNDED_DEBATE_POST_RUNTIME_GATES],
      }),
      contextPolicyProfile({
        context_policy_profile_id:
          TOPIC_SELECTION_V1B_N8_BOUNDED_DEBATE_CONTEXT_RUNTIME_PROFILE_IDS.assessor_repair,
        invocation_slot_id:
          TOPIC_SELECTION_V1B_N8_BOUNDED_DEBATE_INVOCATION_SLOT_IDS.assessor_repair,
        functional_template: 'support_only_semantic',
        context_family: 'v1b_n8_topic_value_assessment',
        estimated_input_token_target: 24000,
        estimated_output_token_budget: 2000,
        preserved_fact_kinds: [...V1B_N8_BOUNDED_DEBATE_PRESERVED_FACT_KINDS],
        post_reuse_gates: [...V1B_N8_BOUNDED_DEBATE_POST_RUNTIME_GATES],
        post_cache_gates: [...V1B_N8_BOUNDED_DEBATE_POST_RUNTIME_GATES],
      }),
      contextPolicyProfile({
        context_policy_profile_id:
          TOPIC_SELECTION_V1B_N8_BOUNDED_DEBATE_CONTEXT_RUNTIME_PROFILE_IDS.synthesizer_final,
        invocation_slot_id:
          TOPIC_SELECTION_V1B_N8_BOUNDED_DEBATE_INVOCATION_SLOT_IDS.synthesizer_final,
        functional_template: 'support_only_semantic',
        context_family: 'v1b_n8_topic_value_assessment',
        estimated_input_token_target: 26000,
        estimated_output_token_budget: 4096,
        preserved_fact_kinds: [...V1B_N8_BOUNDED_DEBATE_PRESERVED_FACT_KINDS],
        post_reuse_gates: [...V1B_N8_BOUNDED_DEBATE_POST_RUNTIME_GATES],
        post_cache_gates: [...V1B_N8_BOUNDED_DEBATE_POST_RUNTIME_GATES],
      }),
      contextPolicyProfile({
        context_policy_profile_id:
          TOPIC_SELECTION_V1C_N2_CONTEXT_RUNTIME_PROFILE_IDS.promotion_support_llm_draft,
        invocation_slot_id: TOPIC_SELECTION_V1C_N2_INVOCATION_SLOT_IDS.promotion_support_llm_draft,
        functional_template: 'candidate_for_deterministic_gate',
        context_family: 'v1c_n2_promotion_support',
        estimated_input_token_target: 24000,
        estimated_output_token_budget: 2048,
        preserved_fact_kinds: [
          ...COMMON_PRESERVED_FACT_KINDS,
          'promotion_input_snapshot',
          'topic_package',
          'topic_question_contract',
          'answerability_plan',
          'research_slice',
          'value_assessment',
          'promotion_readiness',
          'evidence_ref',
          'accepted_risk',
          'blocker',
          'recheck_hint',
          'memory_suggestion',
          'source_health_warning',
        ],
        post_reuse_gates: [
          'schema_validation',
          'promotion_support_admission',
          'deterministic_gate',
          'authority_boundary',
        ],
        post_cache_gates: [
          'schema_validation',
          'promotion_support_admission',
          'deterministic_gate',
          'authority_boundary',
        ],
      }),
      contextPolicyProfile({
        context_policy_profile_id:
          TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_CONTEXT_RUNTIME_PROFILE_IDS.promotion_supporter_draft,
        invocation_slot_id:
          TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_INVOCATION_SLOT_IDS.promotion_supporter_draft,
        functional_template: 'support_only_semantic',
        context_family: 'v1c_n2_bounded_promotion_support',
        estimated_input_token_target: 24000,
        estimated_output_token_budget: 1600,
        preserved_fact_kinds: [...V1C_N2_BOUNDED_DEBATE_PRESERVED_FACT_KINDS],
        post_reuse_gates: [...V1C_N2_BOUNDED_DEBATE_POST_RUNTIME_GATES],
        post_cache_gates: [...V1C_N2_BOUNDED_DEBATE_POST_RUNTIME_GATES],
      }),
      contextPolicyProfile({
        context_policy_profile_id:
          TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_CONTEXT_RUNTIME_PROFILE_IDS.reviewer_critic_review,
        invocation_slot_id:
          TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_INVOCATION_SLOT_IDS.reviewer_critic_review,
        functional_template: 'support_only_semantic',
        context_family: 'v1c_n2_bounded_promotion_support',
        estimated_input_token_target: 26000,
        estimated_output_token_budget: 1800,
        preserved_fact_kinds: [...V1C_N2_BOUNDED_DEBATE_PRESERVED_FACT_KINDS],
        post_reuse_gates: [...V1C_N2_BOUNDED_DEBATE_POST_RUNTIME_GATES],
        post_cache_gates: [...V1C_N2_BOUNDED_DEBATE_POST_RUNTIME_GATES],
      }),
      contextPolicyProfile({
        context_policy_profile_id:
          TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_CONTEXT_RUNTIME_PROFILE_IDS.promotion_supporter_repair,
        invocation_slot_id:
          TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_INVOCATION_SLOT_IDS.promotion_supporter_repair,
        functional_template: 'support_only_semantic',
        context_family: 'v1c_n2_bounded_promotion_support',
        estimated_input_token_target: 28000,
        estimated_output_token_budget: 1800,
        preserved_fact_kinds: [...V1C_N2_BOUNDED_DEBATE_PRESERVED_FACT_KINDS],
        post_reuse_gates: [...V1C_N2_BOUNDED_DEBATE_POST_RUNTIME_GATES],
        post_cache_gates: [...V1C_N2_BOUNDED_DEBATE_POST_RUNTIME_GATES],
      }),
      contextPolicyProfile({
        context_policy_profile_id:
          TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_CONTEXT_RUNTIME_PROFILE_IDS.synthesizer_final,
        invocation_slot_id:
          TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_INVOCATION_SLOT_IDS.synthesizer_final,
        functional_template: 'support_only_semantic',
        context_family: 'v1c_n2_bounded_promotion_support',
        estimated_input_token_target: 30000,
        estimated_output_token_budget: 2400,
        preserved_fact_kinds: [...V1C_N2_BOUNDED_DEBATE_PRESERVED_FACT_KINDS],
        post_reuse_gates: [...V1C_N2_BOUNDED_DEBATE_POST_RUNTIME_GATES],
        post_cache_gates: [...V1C_N2_BOUNDED_DEBATE_POST_RUNTIME_GATES],
      }),
      contextPolicyProfile({
        context_policy_profile_id:
          TOPIC_SELECTION_V1C_N4_CONTEXT_RUNTIME_PROFILE_IDS.delegated_promotion_decision_candidate,
        invocation_slot_id:
          TOPIC_SELECTION_V1C_N4_INVOCATION_SLOT_IDS.delegated_promotion_decision_candidate,
        functional_template: 'delegated_payload_candidate',
        context_family: 'v1c_n4_delegated_promotion_decision',
        estimated_input_token_target: 20000,
        estimated_output_token_budget: 2048,
        preserved_fact_kinds: [...V1C_N4_DELEGATED_PROMOTION_DECISION_PRESERVED_FACT_KINDS],
        post_reuse_gates: [...V1C_N4_DELEGATED_PROMOTION_DECISION_POST_RUNTIME_GATES],
        post_cache_gates: [...V1C_N4_DELEGATED_PROMOTION_DECISION_POST_RUNTIME_GATES],
      }),
      contextPolicyProfile({
        context_policy_profile_id:
          TOPIC_SELECTION_V1C_N6_CONTEXT_RUNTIME_PROFILE_IDS.downstream_feedback_normalization,
        invocation_slot_id:
          TOPIC_SELECTION_V1C_N6_INVOCATION_SLOT_IDS.downstream_feedback_normalization,
        functional_template: 'candidate_for_deterministic_gate',
        context_family: 'v1c_n6_downstream_feedback_normalization',
        estimated_input_token_target: 16000,
        estimated_output_token_budget: 1200,
        preserved_fact_kinds: [...V1C_N6_DOWNSTREAM_FEEDBACK_PRESERVED_FACT_KINDS],
        post_reuse_gates: [...V1C_N6_DOWNSTREAM_FEEDBACK_POST_RUNTIME_GATES],
        post_cache_gates: [...V1C_N6_DOWNSTREAM_FEEDBACK_POST_RUNTIME_GATES],
      }),
    ],
  };

function cloneRegistry(
  registry: TopicSelectionContextPolicyProfileRegistry,
): TopicSelectionContextPolicyProfileRegistry {
  return JSON.parse(JSON.stringify(registry)) as TopicSelectionContextPolicyProfileRegistry;
}

export function createDefaultTopicSelectionContextPolicyProfileRegistry():
  TopicSelectionContextPolicyProfileRegistry {
  return cloneRegistry(DEFAULT_TOPIC_SELECTION_CONTEXT_POLICY_PROFILE_REGISTRY);
}

export class TopicSelectionContextPolicyProfileRegistryService {
  private readonly ajv = new Ajv({
    allErrors: true,
    strict: false,
    removeAdditional: false,
  });
  private readonly registry: TopicSelectionContextPolicyProfileRegistry;
  private readonly validator: ValidateFunction;
  // The instance registry is deep-cloned at construction and never mutated afterward (no method
  // writes or exposes it), so both its full validation and every profile's content hash are fixed
  // for the service's lifetime. resolveProfile() is called once per role turn across every
  // topic-selection runtime, and previously re-ran a full validateRegistry() (AJV schema pass +
  // per-profile invariant loop) plus a sha256(stableStringify(profile)) on EVERY call. Memoize
  // both: the cached values are byte-identical to the uncached path (pure functions of an
  // immutable registry), so prompt_packet_hash / profile_hash drift checks are unchanged.
  private cachedRegistryValidation: TopicSelectionContextPolicyProfileRegistryValidationResult | null = null;
  private readonly profileHashCache = new Map<string, string>();

  constructor(options: {
    registry?: TopicSelectionContextPolicyProfileRegistry;
  } = {}) {
    this.registry = cloneRegistry(options.registry ?? DEFAULT_TOPIC_SELECTION_CONTEXT_POLICY_PROFILE_REGISTRY);
    this.validator = this.ajv.compile(topicSelectionContextPolicyProfileRegistrySchema);
  }

  validateRegistry(
    registry: TopicSelectionContextPolicyProfileRegistry = this.registry,
  ): TopicSelectionContextPolicyProfileRegistryValidationResult {
    // Only the immutable instance registry is cached; an explicitly-passed registry (external
    // caller validating some other registry) always validates fresh.
    if (registry !== this.registry) {
      return this.computeRegistryValidation(registry);
    }
    if (!this.cachedRegistryValidation) {
      this.cachedRegistryValidation = this.computeRegistryValidation(registry);
    }
    return this.cachedRegistryValidation;
  }

  private computeRegistryValidation(
    registry: TopicSelectionContextPolicyProfileRegistry,
  ): TopicSelectionContextPolicyProfileRegistryValidationResult {
    const issues: TopicSelectionContextPolicyProfileRegistryValidationIssue[] = [];
    const schemaValid = this.validator(registry);
    if (!schemaValid) {
      issues.push(...this.schemaIssues(this.validator.errors ?? []));
      return this.validationResult(issues);
    }

    this.validateProfiles(registry, issues);
    return this.validationResult(issues);
  }

  resolveProfile(
    input: ResolveTopicSelectionContextPolicyProfileInput,
  ): TopicSelectionResolvedContextPolicyProfile {
    const validation = this.validateRegistry();
    if (!validation.valid) {
      throw new AppError(
        500,
        'INTERNAL_ERROR',
        `Topic-selection context policy profile registry is invalid: ${
          validation.issues[0]?.code ?? 'UNKNOWN'
        }.`,
      );
    }

    const profile = this.registry.profiles.find(
      (item) => item.context_policy_profile_id === input.context_policy_profile_id,
    );
    if (!profile) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'context policy profile does not exist.');
    }
    if (
      input.context_policy_profile_version
      && input.context_policy_profile_version !== profile.context_policy_profile_version
    ) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'context policy profile version mismatch.');
    }
    if (input.invocation_slot_id && input.invocation_slot_id !== profile.invocation_slot_id) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'invocation_slot_id does not match context policy profile.');
    }

    const profileHash = this.profileHashFor(profile);
    if (input.expected_profile_hash && input.expected_profile_hash !== profileHash) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'context policy profile hash drift detected.');
    }

    return {
      profile,
      profile_hash: profileHash,
    };
  }

  private validateProfiles(
    registry: TopicSelectionContextPolicyProfileRegistry,
    issues: TopicSelectionContextPolicyProfileRegistryValidationIssue[],
  ): void {
    const seenProfileIds = new Set<string>();
    const seenSlotIds = new Set<string>();
    for (const profile of registry.profiles) {
      if (seenProfileIds.has(profile.context_policy_profile_id)) {
        this.pushIssue(
          issues,
          'DUPLICATE_PROFILE_ID',
          'context_policy_profile_id must be unique.',
          profile,
        );
      }
      seenProfileIds.add(profile.context_policy_profile_id);

      if (seenSlotIds.has(profile.invocation_slot_id)) {
        this.pushIssue(
          issues,
          'DUPLICATE_INVOCATION_SLOT_ID',
          'invocation_slot_id must be unique inside the first-slice registry.',
          profile,
        );
      }
      seenSlotIds.add(profile.invocation_slot_id);

      this.validateProfile(profile, issues);
    }
  }

  private validateProfile(
    profile: TopicSelectionContextPolicyProfile,
    issues: TopicSelectionContextPolicyProfileRegistryValidationIssue[],
  ): void {
    if (profile.memory_policy.durable_memory_as_standalone_evidence) {
      this.pushIssue(
        issues,
        'DURABLE_MEMORY_AUTHORITY_FORBIDDEN',
        'durable memory cannot satisfy authority evidence by itself.',
        profile,
      );
    }

    if (
      profile.execution_modifiers.includes('provider_required_live')
      && (
        profile.reuse_policy.provider_llm_response_reuse !== 'blocked'
        || profile.reuse_policy.provider_required_live_behavior !== 'live_call_required'
      )
    ) {
      this.pushIssue(
        issues,
        'PROVIDER_REQUIRED_LIVE_POLICY_INVALID',
        'provider_required_live profiles must block provider response reuse and require live calls.',
        profile,
      );
    }

    if (
      profile.compression_policy.compression_mode !== 'disallowed'
      && !profile.compression_policy.quality_gate_required
    ) {
      this.pushIssue(
        issues,
        'COMPRESSION_QUALITY_GATE_REQUIRED',
        'compression requires a quality gate.',
        profile,
      );
    }
    if (
      profile.compression_policy.compression_mode !== 'disallowed'
      && profile.compression_policy.allowed_executor_kinds.length === 0
    ) {
      this.pushIssue(
        issues,
        'COMPRESSION_EXECUTOR_REQUIRED',
        'compression requires at least one allowed executor kind.',
        profile,
      );
    }

    for (const field of REQUIRED_CACHE_KEY_FIELDS) {
      if (!profile.cache_policy.exact_key_fields.includes(field)) {
        this.pushIssue(
          issues,
          'CACHE_KEY_FIELD_MISSING',
          `cache key field ${field} is required by T-112.`,
          profile,
        );
      }
    }

    for (const gate of REQUIRED_POST_CACHE_GATES) {
      if (
        profile.functional_template === 'candidate_for_deterministic_gate'
        && !profile.cache_policy.post_cache_gates.includes(gate)
      ) {
        this.pushIssue(
          issues,
          'CACHE_POST_GATE_MISSING',
          `candidate-bearing profiles must run ${gate} after cache hits.`,
          profile,
        );
      }
    }

    for (const payloadClass of COMMON_FORBIDDEN_PAYLOAD_CLASSES) {
      if (
        !profile.compression_policy.forbidden_payload_classes.includes(payloadClass)
        || !profile.provenance_policy.forbidden_persisted_payload_classes.includes(payloadClass)
      ) {
        this.pushIssue(
          issues,
          'FORBIDDEN_PAYLOAD_CLASS_MISSING',
          `forbidden payload class ${payloadClass} must be declared.`,
          profile,
        );
      }
    }

    for (const factKind of COMMON_PRESERVED_FACT_KINDS) {
      if (!profile.compression_policy.preserved_fact_kinds.includes(factKind)) {
        this.pushIssue(
          issues,
          'REQUIRED_PRESERVED_FACT_MISSING',
          `compression must preserve ${factKind}.`,
          profile,
        );
      }
    }
  }

  private schemaIssues(
    errors: ErrorObject[],
  ): TopicSelectionContextPolicyProfileRegistryValidationIssue[] {
    return errors.map((error) => ({
      code: 'SCHEMA_VALIDATION_FAILED',
      message: `${error.instancePath || '/'} ${error.message ?? 'schema validation failed'}`,
      path: error.instancePath || '/',
    }));
  }

  private pushIssue(
    issues: TopicSelectionContextPolicyProfileRegistryValidationIssue[],
    code: TopicSelectionContextPolicyProfileRegistryValidationIssueCode,
    message: string,
    profile: TopicSelectionContextPolicyProfile,
  ): void {
    issues.push({
      code,
      message,
      context_policy_profile_id: profile.context_policy_profile_id,
      invocation_slot_id: profile.invocation_slot_id,
    });
  }

  private validationResult(
    issues: TopicSelectionContextPolicyProfileRegistryValidationIssue[],
  ): TopicSelectionContextPolicyProfileRegistryValidationResult {
    return {
      valid: issues.length === 0,
      issue_count: issues.length,
      issues,
    };
  }

  // Memoized per profile id. resolveProfile() only reaches here after validateRegistry() passes,
  // which enforces unique context_policy_profile_id (DUPLICATE_PROFILE_ID), so the id uniquely
  // identifies an immutable profile object — the cached hash is byte-identical to recomputing it.
  private profileHashFor(profile: TopicSelectionContextPolicyProfile): string {
    const cached = this.profileHashCache.get(profile.context_policy_profile_id);
    if (cached) {
      return cached;
    }
    const profileHash = this.hash(profile);
    this.profileHashCache.set(profile.context_policy_profile_id, profileHash);
    return profileHash;
  }

  private hash(value: unknown): string {
    return sha256Text(stableStringify(value));
  }
}
