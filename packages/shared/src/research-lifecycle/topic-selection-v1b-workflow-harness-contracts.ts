import {
  topicSelectionActorRefSchema,
  topicSelectionFunctionalRefSchema,
  topicSelectionGateIssueSchema,
  type TopicSelectionActorType,
  type TopicSelectionFunctionalRef,
  type TopicSelectionGateIssue,
} from './topic-selection-control-plane-contracts.js';
import {
  TOPIC_SELECTION_AGENT_EXECUTION_MODES,
  type TopicSelectionAgentExecutionMode,
} from './topic-selection-need-validation-contracts.js';
import {
  TOPIC_SELECTION_AGENT_RUN_MODES,
  type TopicSelectionAgentExecutionSpec,
  type TopicSelectionAgentRunMode,
} from './topic-selection-agent-profile-contracts.js';
import {
  TOPIC_SELECTION_SLICE_LOOPBACK_TARGETS,
  TOPIC_SELECTION_SLICE_SELECTION_DECISIONS,
  topicSelectionResearchSliceOptionSetLlmOutputSchema,
  type TopicSelectionRejectedSliceOptionReason,
  type TopicSelectionResearchSliceOptionSetLlmOutput,
  type TopicSelectionSliceLoopbackTarget,
  type TopicSelectionSliceSelectionDecision,
} from './topic-selection-v1b-research-slice-contracts.js';
import {
  topicSelectionFormTopicQuestionLlmOutputSchema,
  type TopicSelectionFormTopicQuestionLlmOutput,
} from './topic-selection-v1b-topic-question-contracts.js';
import {
  topicSelectionAssessTopicValueLlmOutputSchema,
  type TopicSelectionAssessTopicValueLlmOutput,
  type TopicSelectionValueDisposition,
} from './topic-selection-v1b-value-assessment-contracts.js';

export const TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_RUN_REQUEST_SCHEMA_VERSION =
  'TopicSelectionV1bWorkflowHarnessRunRequest@v1' as const;
export const TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_RUN_RESULT_SCHEMA_VERSION =
  'TopicSelectionV1bWorkflowHarnessRunResult@v1' as const;
export const TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_TRACE_PAYLOAD_SCHEMA_VERSION =
  'TopicSelectionV1bWorkflowHarnessTracePayload@v1' as const;
/** Single source for the v1b node-policy version — referenced by the node-policy slot specs below
 *  and imported by the coordinator + the N2/N5/N8-debate services (was duplicated as 4 local consts). */
export const TOPIC_SELECTION_V1B_NODE_POLICY_VERSION = 'topic-selection-v1b-node-policy-v1' as const;

export const TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_NODE_IDS = [
  'topic-selection.v1b.create-intake-snapshot.v1',
  'topic-selection.v1b.record-research-constraint-profile.v1',
  'topic-selection.v1b.assess-intake-readiness.v1',
  'topic-selection.v1b.generate-research-slice-options.v1',
  'topic-selection.v1b.select-research-slice.v1',
  'topic-selection.v1b.generate-topic-question-candidates.v1',
  'topic-selection.v1b.materialize-topic-question-contract.v1',
  'topic-selection.v1b.assess-topic-value.v1',
  'topic-selection.v1b.decide-value-disposition.v1',
  'topic-selection.v1b.create-draft-topic-package.v1',
  'topic-selection.v1b.publish-v1c-input-bundle.v1',
] as const;
export type TopicSelectionV1bWorkflowHarnessNodeId =
  (typeof TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_NODE_IDS)[number];

export const TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_EXECUTION_KINDS = [
  'deterministic',
  'delegated',
  'model_like',
] as const;
export type TopicSelectionV1bWorkflowHarnessExecutionKind =
  (typeof TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_EXECUTION_KINDS)[number];

export const TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_GATE_STATUSES = [
  'admitted',
  'admitted_with_warnings',
  'blocked',
  'retryable_failure',
  'requires_human_review',
  'terminal_no_advance',
] as const;
export type TopicSelectionV1bWorkflowHarnessGateStatus =
  (typeof TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_GATE_STATUSES)[number];

export const TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_FAILURE_CLASSES = [
  'technical_failure',
  'policy_block',
  'semantic_non_pass',
  'human_or_delegated_required',
  'terminal_no_advance',
] as const;
export type TopicSelectionV1bWorkflowHarnessFailureClass =
  (typeof TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_FAILURE_CLASSES)[number];

export const TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_ROUTE_DECISIONS = [
  'invoke_next',
  'blocked',
  'wait',
  'loopback',
  'retry',
  'stop_v1b_complete',
] as const;
export type TopicSelectionV1bWorkflowHarnessRouteDecision =
  (typeof TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_ROUTE_DECISIONS)[number];

export const TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_SEMANTIC_EXECUTION_MODES = [
  'none',
  'codex_assisted',
  'provider_llm',
  'mocked_llm',
  'human_delegated',
] as const;
export type TopicSelectionV1bWorkflowHarnessSemanticExecutionMode =
  (typeof TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_SEMANTIC_EXECUTION_MODES)[number];
export type TopicSelectionV1bWorkflowHarnessSemanticArtifactExecutionMode =
  Exclude<TopicSelectionV1bWorkflowHarnessSemanticExecutionMode, 'none'>;

export const TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_SEMANTIC_ALLOWED_EFFECTS = [
  'support_only',
  'delegated_payload_candidate',
  'model_draft_for_gate',
] as const;
export type TopicSelectionV1bWorkflowHarnessSemanticAllowedEffect =
  (typeof TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_SEMANTIC_ALLOWED_EFFECTS)[number];

export const TOPIC_SELECTION_V1B_N2_AUTHORITY_INPUT_PROVIDERS = [
  'human_delegated',
  'codex_delegated',
  'fixture',
] as const;
export type TopicSelectionV1bN2AuthorityInputProvider =
  (typeof TOPIC_SELECTION_V1B_N2_AUTHORITY_INPUT_PROVIDERS)[number];

export const TOPIC_SELECTION_V1B_N5_AUTHORITY_INPUT_PROVIDERS = [
  'human_delegated',
  'codex_delegated',
  'fixture',
] as const;
export type TopicSelectionV1bN5AuthorityInputProvider =
  (typeof TOPIC_SELECTION_V1B_N5_AUTHORITY_INPUT_PROVIDERS)[number];

export const TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_SEMANTIC_FALLBACK_POLICIES = [
  'deterministic_fallback',
  'requires_human_or_delegated_payload',
  'technical_retry_or_block',
] as const;
export type TopicSelectionV1bWorkflowHarnessSemanticFallbackPolicy =
  (typeof TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_SEMANTIC_FALLBACK_POLICIES)[number];

export const TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_RUNTIME_PROVENANCE_CLASSES = [
  'runtime_verified',
  'fixture_replay',
  'legacy_unverified',
] as const;
export type TopicSelectionV1bWorkflowHarnessRuntimeProvenanceClass =
  (typeof TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_RUNTIME_PROVENANCE_CLASSES)[number];

export const TOPIC_SELECTION_V1B_N7_RUNTIME_CONTEXT_PROJECTION_SCHEMA_VERSION =
  'TopicSelectionV1bN7RuntimeContextProjection@v1' as const;

export const TOPIC_SELECTION_V1B_N6_RUNTIME_CONTEXT_PROJECTION_SCHEMA_VERSION =
  'TopicSelectionV1bN6RuntimeContextProjection@v1' as const;

export const TOPIC_SELECTION_V1B_N6_RUNTIME_CONTEXT_PROJECTION_KINDS = [
  'v1b_n6_gate_failure_retry_context',
] as const;
export type TopicSelectionV1bN6RuntimeContextProjectionKind =
  (typeof TOPIC_SELECTION_V1B_N6_RUNTIME_CONTEXT_PROJECTION_KINDS)[number];

export const TOPIC_SELECTION_V1B_N7_RUNTIME_CONTEXT_PROJECTION_KINDS = [
  'v1b_n7_to_n8_topic_question_contract_context',
  'v1b_n7_to_n6_failed_trial_loopback_context',
] as const;
export type TopicSelectionV1bN7RuntimeContextProjectionKind =
  (typeof TOPIC_SELECTION_V1B_N7_RUNTIME_CONTEXT_PROJECTION_KINDS)[number];

export const TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_SEMANTIC_SLOT_IDS = [
  'n2_constraint_profile_semantic_support',
  'n3_readiness_classification',
  'n4_research_slice_option_draft',
  'n5_slice_selection_review',
  'n6_question_candidate_draft',
  'n6_loopback_triage',
  'n7_candidate_grouping',
  'n7_failed_trial_synthesis',
  'n7_n8_debate_admission_review',
  'n8_value_assessment_draft',
  'n8_debate_assessor_draft',
  'n8_debate_value_critic',
  'n8_debate_assessor_repair',
  'n8_debate_synthesizer_final',
] as const;
export type TopicSelectionV1bWorkflowHarnessSemanticSlotId =
  (typeof TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_SEMANTIC_SLOT_IDS)[number];

export const TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS = {
  constraint_profile_support: 'topic-selection.v1b.constraint-profile-support.codex.v1',
  intake_readiness_support: 'topic-selection.v1b.intake-readiness-support.codex.v1',
  research_slice_options_single_agent: 'topic-selection.v1b.research-slice-options.single-agent.v1',
  slice_selection_support: 'topic-selection.v1b.slice-selection-support.codex.v1',
  topic_question_candidates_single_agent: 'topic-selection.v1b.topic-question-candidates.single-agent.v1',
  n6_loopback_triage_support: 'topic-selection.v1b.n6-loopback-triage-support.codex.v1',
  n7_candidate_grouping_support: 'topic-selection.v1b.candidate-grouping-support.codex.v1',
  n7_failed_trial_synthesis_support: 'topic-selection.v1b.failed-trial-synthesis-support.codex.v1',
  n7_n8_debate_admission_support: 'topic-selection.v1b.n8-debate-admission-support.codex.v1',
  topic_value_assessment_single_agent: 'topic-selection.v1b.topic-value-assessment.single-agent.v1',
  /** Shared by all four N8 bounded-debate role slots (DP-3.5): per-role diversity is
   * expressed as model_option overrides on this ONE profile, not separate profiles. */
  n8_bounded_debate: 'topic-selection.v1b.n8-bounded-debate.v1',
} as const;
export type TopicSelectionV1bWorkflowHarnessProfileId =
  (typeof TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS)[keyof typeof TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS];

export const TOPIC_SELECTION_V1B_N6_LOOPBACK_TARGET_CODES = [
  'n6_regenerate_candidates',
  'n6_debate_escalation',
  'n6_loopback_to_n5_select_different_slice',
] as const;
export type TopicSelectionV1bN6LoopbackTargetCode =
  (typeof TOPIC_SELECTION_V1B_N6_LOOPBACK_TARGET_CODES)[number];

export const TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_HANDOFF_KINDS = [
  'N1ToN2Handoff',
  'N2ToN3Handoff',
  'N3ToN4Handoff',
  'N4ToN5Handoff',
  'N5ToN6Handoff',
  'N6ToN7Handoff',
  'N7ToN8Handoff',
  'N8ToN9Handoff',
  'N9ToN10Handoff',
  'N10ToN11Handoff',
  'V1cInputBundle',
] as const;
export type TopicSelectionV1bWorkflowHarnessHandoffKind =
  (typeof TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_HANDOFF_KINDS)[number];

export interface TopicSelectionV1bWorkflowHarnessHandoffEdgeSpec {
  handoff_kind: TopicSelectionV1bWorkflowHarnessHandoffKind;
  source_node_id: TopicSelectionV1bWorkflowHarnessNodeId;
  target_node_id: TopicSelectionV1bWorkflowHarnessNodeId | 'v1c.entry';
  route_signal: string;
  payload_schema_version: string;
}

export const TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_HANDOFF_EDGE_SPECS = [
  {
    handoff_kind: 'N1ToN2Handoff',
    source_node_id: 'topic-selection.v1b.create-intake-snapshot.v1',
    target_node_id: 'topic-selection.v1b.record-research-constraint-profile.v1',
    route_signal: 'snapshot_created',
    payload_schema_version: 'N1ToN2Handoff@v1',
  },
  {
    handoff_kind: 'N2ToN3Handoff',
    source_node_id: 'topic-selection.v1b.record-research-constraint-profile.v1',
    target_node_id: 'topic-selection.v1b.assess-intake-readiness.v1',
    route_signal: 'constraint_profile_recorded',
    payload_schema_version: 'N2ToN3Handoff@v1',
  },
  {
    handoff_kind: 'N3ToN4Handoff',
    source_node_id: 'topic-selection.v1b.assess-intake-readiness.v1',
    target_node_id: 'topic-selection.v1b.generate-research-slice-options.v1',
    route_signal: 'intake_ready_for_slice_generation',
    payload_schema_version: 'N3ToN4Handoff@v1',
  },
  {
    handoff_kind: 'N4ToN5Handoff',
    source_node_id: 'topic-selection.v1b.generate-research-slice-options.v1',
    target_node_id: 'topic-selection.v1b.select-research-slice.v1',
    route_signal: 'slice_options_generated',
    payload_schema_version: 'N4ToN5Handoff@v1',
  },
  {
    handoff_kind: 'N5ToN6Handoff',
    source_node_id: 'topic-selection.v1b.select-research-slice.v1',
    target_node_id: 'topic-selection.v1b.generate-topic-question-candidates.v1',
    route_signal: 'slice_selected',
    payload_schema_version: 'N5ToN6Handoff@v1',
  },
  {
    handoff_kind: 'N6ToN7Handoff',
    source_node_id: 'topic-selection.v1b.generate-topic-question-candidates.v1',
    target_node_id: 'topic-selection.v1b.materialize-topic-question-contract.v1',
    route_signal: 'question_candidates_generated',
    payload_schema_version: 'N6ToN7Handoff@v1',
  },
  {
    handoff_kind: 'N7ToN8Handoff',
    source_node_id: 'topic-selection.v1b.materialize-topic-question-contract.v1',
    target_node_id: 'topic-selection.v1b.assess-topic-value.v1',
    route_signal: 'topic_question_contract_materialized',
    payload_schema_version: 'N7ToN8Handoff@v1',
  },
  {
    handoff_kind: 'N8ToN9Handoff',
    source_node_id: 'topic-selection.v1b.assess-topic-value.v1',
    target_node_id: 'topic-selection.v1b.decide-value-disposition.v1',
    route_signal: 'topic_value_assessed',
    payload_schema_version: 'N8ToN9Handoff@v1',
  },
  {
    handoff_kind: 'N9ToN10Handoff',
    source_node_id: 'topic-selection.v1b.decide-value-disposition.v1',
    target_node_id: 'topic-selection.v1b.create-draft-topic-package.v1',
    route_signal: 'advance_to_package_candidate',
    payload_schema_version: 'N9ToN10Handoff@v1',
  },
  {
    handoff_kind: 'N10ToN11Handoff',
    source_node_id: 'topic-selection.v1b.create-draft-topic-package.v1',
    target_node_id: 'topic-selection.v1b.publish-v1c-input-bundle.v1',
    route_signal: 'package_created',
    payload_schema_version: 'N10ToN11Handoff@v1',
  },
  {
    handoff_kind: 'V1cInputBundle',
    source_node_id: 'topic-selection.v1b.publish-v1c-input-bundle.v1',
    target_node_id: 'v1c.entry',
    route_signal: 'v1c_bundle_published',
    payload_schema_version: 'V1cInputBundle@v1',
  },
] as const satisfies readonly TopicSelectionV1bWorkflowHarnessHandoffEdgeSpec[];

export const TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_REPLAY_HASH_COMPONENTS = [
  'frozen_input_hash',
  'node_attempt_id',
  'execution_spec_hash',
  'semantic_artifact_hash',
  'runtime_admission_hash',
  'selected_candidate_hash',
  'trial_ledger_hash',
  'debate_admission_hash',
  'feedback_hash',
  'authority_hash',
  'handoff_hash',
  'policy_version',
  'output_schema_version',
] as const;
export type TopicSelectionV1bWorkflowHarnessReplayHashComponent =
  (typeof TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_REPLAY_HASH_COMPONENTS)[number];

const DEFAULT_REPLAY_HASH_COMPONENTS = [
  'frozen_input_hash',
  'node_attempt_id',
  'execution_spec_hash',
  'semantic_artifact_hash',
  'runtime_admission_hash',
  'policy_version',
  'output_schema_version',
] as const satisfies readonly TopicSelectionV1bWorkflowHarnessReplayHashComponent[];

export interface TopicSelectionV1bWorkflowHarnessSemanticSupportSlotSpec {
  slot_id: TopicSelectionV1bWorkflowHarnessSemanticSlotId;
  node_id: TopicSelectionV1bWorkflowHarnessNodeId;
  allowed_effect: TopicSelectionV1bWorkflowHarnessSemanticAllowedEffect;
  output_contract: string;
  target_gate_id: string;
  required_for_progress: boolean;
  fallback_policy: TopicSelectionV1bWorkflowHarnessSemanticFallbackPolicy;
  allowed_execution_modes: readonly TopicSelectionV1bWorkflowHarnessSemanticArtifactExecutionMode[];
  default_profile_id: TopicSelectionV1bWorkflowHarnessProfileId;
  allowed_profile_ids: readonly TopicSelectionV1bWorkflowHarnessProfileId[];
  allowed_run_modes: readonly TopicSelectionAgentRunMode[];
  slot_policy_version: string;
}

export const TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_SEMANTIC_SUPPORT_SLOTS = [
  {
    slot_id: 'n2_constraint_profile_semantic_support',
    node_id: 'topic-selection.v1b.record-research-constraint-profile.v1',
    allowed_effect: 'delegated_payload_candidate',
    output_contract: 'ResearchConstraintProfileDraftSupport@v1',
    target_gate_id: 'N2ConstraintProfileGate',
    required_for_progress: false,
    fallback_policy: 'requires_human_or_delegated_payload',
    allowed_execution_modes: ['codex_assisted', 'human_delegated'],
    default_profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.constraint_profile_support,
    allowed_profile_ids: [TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.constraint_profile_support],
    allowed_run_modes: ['test', 'acceptance', 'product'],
    slot_policy_version: TOPIC_SELECTION_V1B_NODE_POLICY_VERSION,
  },
  {
    slot_id: 'n3_readiness_classification',
    node_id: 'topic-selection.v1b.assess-intake-readiness.v1',
    allowed_effect: 'support_only',
    output_contract: 'IntakeReadinessClassificationSupport@v1',
    target_gate_id: 'N3ReadinessGate',
    required_for_progress: false,
    fallback_policy: 'deterministic_fallback',
    allowed_execution_modes: ['codex_assisted', 'mocked_llm'],
    default_profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.intake_readiness_support,
    allowed_profile_ids: [TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.intake_readiness_support],
    allowed_run_modes: ['test', 'acceptance', 'product'],
    slot_policy_version: TOPIC_SELECTION_V1B_NODE_POLICY_VERSION,
  },
  {
    slot_id: 'n4_research_slice_option_draft',
    node_id: 'topic-selection.v1b.generate-research-slice-options.v1',
    allowed_effect: 'model_draft_for_gate',
    output_contract: 'ResearchSliceOptionSetDraft@v1',
    target_gate_id: 'N4ResearchSliceOptionGate',
    required_for_progress: true,
    fallback_policy: 'technical_retry_or_block',
    allowed_execution_modes: ['codex_assisted', 'mocked_llm', 'provider_llm'],
    default_profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.research_slice_options_single_agent,
    allowed_profile_ids: [TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.research_slice_options_single_agent],
    allowed_run_modes: ['test', 'acceptance', 'product'],
    slot_policy_version: TOPIC_SELECTION_V1B_NODE_POLICY_VERSION,
  },
  {
    slot_id: 'n5_slice_selection_review',
    node_id: 'topic-selection.v1b.select-research-slice.v1',
    allowed_effect: 'delegated_payload_candidate',
    output_contract: 'ResearchSliceSelectionReviewSupport@v1',
    target_gate_id: 'N5ResearchSliceSelectionGate',
    required_for_progress: false,
    fallback_policy: 'requires_human_or_delegated_payload',
    allowed_execution_modes: ['codex_assisted', 'human_delegated'],
    default_profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.slice_selection_support,
    allowed_profile_ids: [TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.slice_selection_support],
    allowed_run_modes: ['test', 'acceptance', 'product'],
    slot_policy_version: TOPIC_SELECTION_V1B_NODE_POLICY_VERSION,
  },
  {
    slot_id: 'n6_question_candidate_draft',
    node_id: 'topic-selection.v1b.generate-topic-question-candidates.v1',
    allowed_effect: 'model_draft_for_gate',
    output_contract: 'TopicQuestionCandidateSetDraft@v1',
    target_gate_id: 'N6TopicQuestionCandidateGate',
    required_for_progress: true,
    fallback_policy: 'technical_retry_or_block',
    allowed_execution_modes: ['codex_assisted', 'mocked_llm', 'provider_llm'],
    default_profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.topic_question_candidates_single_agent,
    allowed_profile_ids: [TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.topic_question_candidates_single_agent],
    allowed_run_modes: ['test', 'acceptance', 'product'],
    slot_policy_version: TOPIC_SELECTION_V1B_NODE_POLICY_VERSION,
  },
  {
    slot_id: 'n6_loopback_triage',
    node_id: 'topic-selection.v1b.generate-topic-question-candidates.v1',
    allowed_effect: 'support_only',
    output_contract: 'N6LoopbackTriageSupport@v1',
    target_gate_id: 'N6TopicQuestionCandidateGate',
    required_for_progress: false,
    fallback_policy: 'deterministic_fallback',
    allowed_execution_modes: ['codex_assisted', 'mocked_llm'],
    default_profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.n6_loopback_triage_support,
    allowed_profile_ids: [TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.n6_loopback_triage_support],
    allowed_run_modes: ['test', 'acceptance', 'product'],
    slot_policy_version: TOPIC_SELECTION_V1B_NODE_POLICY_VERSION,
  },
  {
    slot_id: 'n7_candidate_grouping',
    node_id: 'topic-selection.v1b.materialize-topic-question-contract.v1',
    allowed_effect: 'support_only',
    output_contract: 'CandidateGroupingSupport@v1',
    target_gate_id: 'N7TopicQuestionContractGate',
    required_for_progress: false,
    fallback_policy: 'deterministic_fallback',
    allowed_execution_modes: ['codex_assisted', 'mocked_llm'],
    default_profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.n7_candidate_grouping_support,
    allowed_profile_ids: [TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.n7_candidate_grouping_support],
    allowed_run_modes: ['test', 'acceptance', 'product'],
    slot_policy_version: TOPIC_SELECTION_V1B_NODE_POLICY_VERSION,
  },
  {
    slot_id: 'n7_failed_trial_synthesis',
    node_id: 'topic-selection.v1b.materialize-topic-question-contract.v1',
    allowed_effect: 'support_only',
    output_contract: 'N8FailedTrialSynthesisSupport@v1',
    target_gate_id: 'N7TopicQuestionContractGate',
    required_for_progress: false,
    fallback_policy: 'technical_retry_or_block',
    allowed_execution_modes: ['codex_assisted', 'mocked_llm'],
    default_profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.n7_failed_trial_synthesis_support,
    allowed_profile_ids: [TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.n7_failed_trial_synthesis_support],
    allowed_run_modes: ['test', 'acceptance', 'product'],
    slot_policy_version: TOPIC_SELECTION_V1B_NODE_POLICY_VERSION,
  },
  {
    slot_id: 'n7_n8_debate_admission_review',
    node_id: 'topic-selection.v1b.materialize-topic-question-contract.v1',
    allowed_effect: 'support_only',
    output_contract: 'N8DebateAdmissionReviewSupport@v1',
    target_gate_id: 'N7TopicQuestionContractGate',
    required_for_progress: false,
    fallback_policy: 'deterministic_fallback',
    allowed_execution_modes: ['codex_assisted', 'mocked_llm'],
    default_profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.n7_n8_debate_admission_support,
    allowed_profile_ids: [TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.n7_n8_debate_admission_support],
    allowed_run_modes: ['test', 'acceptance', 'product'],
    slot_policy_version: TOPIC_SELECTION_V1B_NODE_POLICY_VERSION,
  },
  {
    slot_id: 'n8_value_assessment_draft',
    node_id: 'topic-selection.v1b.assess-topic-value.v1',
    allowed_effect: 'model_draft_for_gate',
    output_contract: 'TopicValueAssessmentDraft@v1',
    target_gate_id: 'N8TopicValueAssessmentGate',
    required_for_progress: true,
    fallback_policy: 'technical_retry_or_block',
    allowed_execution_modes: ['codex_assisted', 'mocked_llm', 'provider_llm'],
    default_profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.topic_value_assessment_single_agent,
    allowed_profile_ids: [TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.topic_value_assessment_single_agent],
    allowed_run_modes: ['test', 'acceptance', 'product'],
    slot_policy_version: TOPIC_SELECTION_V1B_NODE_POLICY_VERSION,
  },
  // T-123 Phase 3 (D2 / DP-3.1~3.6) — N8 bounded-debate role slots. All four are
  // support_only debate lineage; the synthesizer's final assessment is additionally
  // recorded into the existing n8_value_assessment_draft slot (model_draft_for_gate),
  // so the deterministic gate consumes ONE draft surface regardless of debate.
  {
    slot_id: 'n8_debate_assessor_draft',
    node_id: 'topic-selection.v1b.assess-topic-value.v1',
    allowed_effect: 'support_only',
    output_contract: 'TopicSelectionV1bN8BoundedDebateRoleOutput@v1',
    target_gate_id: 'N8TopicValueAssessmentGate',
    required_for_progress: false,
    fallback_policy: 'technical_retry_or_block',
    allowed_execution_modes: ['codex_assisted', 'mocked_llm', 'provider_llm'],
    default_profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.n8_bounded_debate,
    allowed_profile_ids: [TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.n8_bounded_debate],
    allowed_run_modes: ['test', 'acceptance', 'product'],
    slot_policy_version: TOPIC_SELECTION_V1B_NODE_POLICY_VERSION,
  },
  {
    slot_id: 'n8_debate_value_critic',
    node_id: 'topic-selection.v1b.assess-topic-value.v1',
    allowed_effect: 'support_only',
    output_contract: 'TopicSelectionV1bN8BoundedDebateRoleOutput@v1',
    target_gate_id: 'N8TopicValueAssessmentGate',
    required_for_progress: false,
    fallback_policy: 'technical_retry_or_block',
    allowed_execution_modes: ['codex_assisted', 'mocked_llm', 'provider_llm'],
    default_profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.n8_bounded_debate,
    allowed_profile_ids: [TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.n8_bounded_debate],
    allowed_run_modes: ['test', 'acceptance', 'product'],
    slot_policy_version: TOPIC_SELECTION_V1B_NODE_POLICY_VERSION,
  },
  {
    slot_id: 'n8_debate_assessor_repair',
    node_id: 'topic-selection.v1b.assess-topic-value.v1',
    allowed_effect: 'support_only',
    output_contract: 'TopicSelectionV1bN8BoundedDebateRoleOutput@v1',
    target_gate_id: 'N8TopicValueAssessmentGate',
    required_for_progress: false,
    fallback_policy: 'technical_retry_or_block',
    allowed_execution_modes: ['codex_assisted', 'mocked_llm', 'provider_llm'],
    default_profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.n8_bounded_debate,
    allowed_profile_ids: [TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.n8_bounded_debate],
    allowed_run_modes: ['test', 'acceptance', 'product'],
    slot_policy_version: TOPIC_SELECTION_V1B_NODE_POLICY_VERSION,
  },
  {
    slot_id: 'n8_debate_synthesizer_final',
    node_id: 'topic-selection.v1b.assess-topic-value.v1',
    allowed_effect: 'support_only',
    output_contract: 'TopicSelectionV1bN8BoundedDebateRoleOutput@v1',
    target_gate_id: 'N8TopicValueAssessmentGate',
    required_for_progress: false,
    fallback_policy: 'technical_retry_or_block',
    allowed_execution_modes: ['codex_assisted', 'mocked_llm', 'provider_llm'],
    default_profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.n8_bounded_debate,
    allowed_profile_ids: [TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.n8_bounded_debate],
    allowed_run_modes: ['test', 'acceptance', 'product'],
    slot_policy_version: TOPIC_SELECTION_V1B_NODE_POLICY_VERSION,
  },
] as const satisfies readonly TopicSelectionV1bWorkflowHarnessSemanticSupportSlotSpec[];

/** N8 bounded-debate role order (DP-3.1/3.5) — fixed single pass, synthesizer is the
 * sole producer of the gate-facing assessment (DMP-03 arbiter semantics). */
export const TOPIC_SELECTION_V1B_N8_BOUNDED_DEBATE_ROLE_ORDER = [
  'n8_debate_assessor_draft',
  'n8_debate_value_critic',
  'n8_debate_assessor_repair',
  'n8_debate_synthesizer_final',
] as const;
export type TopicSelectionV1bN8BoundedDebateRoleSlotId =
  (typeof TOPIC_SELECTION_V1B_N8_BOUNDED_DEBATE_ROLE_ORDER)[number];
/**
 * The debate-loop identity folded into loop_transcript_hash. It is a byte-bearing input to BOTH the
 * core's fold (runtime side) and the admission re-fold (drift check), so it must be single-sourced —
 * exactly like TOPIC_SELECTION_V1B_N8_BOUNDED_DEBATE_ROLE_ORDER above — or a rename in one place would
 * silently fail every admission with a transcript-drift error.
 */
export const TOPIC_SELECTION_V1B_N8_BOUNDED_DEBATE_LOOP_ID = 'v1b_n8_bounded_micro_debate' as const;

/**
 * N6 DIVERGENT-debate role order (T-127 W-07, D-T127-02) — generative topic-question candidate debate
 * on the shared core's runDivergentLoop. explorer + critic FAN OUT (arity > 1) then the arbiter is the
 * sole TERMINAL SINGLETON producer of the gate-facing candidate-set draft (DMP-03 arbiter semantics;
 * N8's repair + V1A's issue-framing both fold into the single arbiter synthesis). Primitive =
 * divergent_loop (not bounded_sequence) — hence the DIVERGENT_DEBATE qualifier vs N8's BOUNDED_DEBATE.
 */
export const TOPIC_SELECTION_V1B_N6_DIVERGENT_DEBATE_ROLE_ORDER = [
  'n6_debate_explorer',
  'n6_debate_critic',
  'n6_debate_arbiter',
] as const;
export type TopicSelectionV1bN6DivergentDebateRoleSlotId =
  (typeof TOPIC_SELECTION_V1B_N6_DIVERGENT_DEBATE_ROLE_ORDER)[number];
/**
 * The N6 divergent debate-loop identity folded into loop_transcript_hash on BOTH the runDivergentLoop
 * fold (runtime) and the admission re-fold (drift check) — byte-bearing, single-sourced (same
 * constraint as the N8 LOOP_ID above), and a DISTINCT value from every other node's loop id so
 * transcript hashes never collide across nodes.
 */
export const TOPIC_SELECTION_V1B_N6_DIVERGENT_DEBATE_LOOP_ID = 'v1b_n6_divergent_candidate_debate' as const;

/**
 * N6 divergent debate per-role MODEL profile ids — the SINGLE source for both the scenario contract
 * (role_stage_slots[].profile_id) and the backend model-profile-registry registration, so the
 * scenario config and the registered profile cannot drift (the runtime resolves the slot's profile_id
 * against the model-profile registry). The backend registers profileBase() entries under these ids.
 */
export const TOPIC_SELECTION_V1B_N6_DEBATE_EXPLORER_PROFILE_ID = 'topic-selection.v1b.n6-debate.explorer.v1' as const;
export const TOPIC_SELECTION_V1B_N6_DEBATE_CRITIC_PROFILE_ID = 'topic-selection.v1b.n6-debate.critic.v1' as const;
export const TOPIC_SELECTION_V1B_N6_DEBATE_ARBITER_PROFILE_ID = 'topic-selection.v1b.n6-debate.arbiter.v1' as const;

/**
 * Deterministic debate-trigger thresholds for the N8 gate (D2: T1 borderline / T3
 * dimension conflict). Values are PROVISIONAL until deep-test calibration (DP-3.3);
 * they live in the node policy so the gate stays a pure code-over-policy check.
 */
export interface TopicSelectionV1bN8DebateTriggerThresholds {
  provisional: boolean;
  /** T1: total_score in [min, max) counts as borderline. */
  t1_total_score_min: number;
  t1_total_score_max_exclusive: number;
  /** T1: confidence strictly below this counts as borderline. */
  t1_confidence_min: number;
  /** T3: (max - min) dimension score spread at/above this conflicts. */
  t3_dimension_spread_min: number;
  /** T3: any dimension below this while total_score >= t3_total_score_min conflicts. */
  t3_single_dimension_floor: number;
  t3_total_score_min: number;
}

/**
 * N6 only (T-127 W-07 step e): advisory thresholds describing when the upstream `n6_loopback_triage`
 * LLM artifact SHOULD recommend escalating candidate generation to the bounded divergent debate
 * (`debate_escalation_recommended` warning → `n6_debate_escalation` loopback). Unlike the N8 thresholds
 * these drive NO harness compute function: escalation is decided upstream by the triage artifact and the
 * harness only validates/routes it (DMP-10 / T-088 D6 — code-over-policy, no second judgment path). They
 * are threaded into the triage prompt in step f; here they are pure advisory policy data.
 *
 * Scope note: of N6's three blocker codes the thresholds deliberately cover only two — weak-set and
 * duplicate/overlap — and intentionally OMIT `missing_value_axis`. The divergent debate only acts on the
 * weak-set / duplicate-overlap critic findings (see the critic finding_code reuse on the N6 role payload),
 * and a missing value axis is remedied by slice reselection / candidate regeneration, not by widening the
 * candidate set via debate. Do not "complete" this set with a `missing_value_axis` threshold the debate
 * cannot honor.
 */
export interface TopicSelectionV1bN6DebateTriggerThresholds {
  provisional: boolean;
  /** Escalate when the fraction of weak/blocked candidates is at/above this. */
  weak_blocked_fraction_min: number;
  /** ...or when the absolute count of weak/blocked candidates is at/above this. */
  weak_blocked_count_min: number;
  /** Escalate when the count of admissible (non-blocked) candidates is at/below this floor. */
  admissible_candidate_floor: number;
  /** Escalate when distinct/total candidate ratio is at/below this (too much duplication/overlap). */
  duplicate_distinct_ratio_max_inclusive: number;
  /** ...or when the count of duplicate/overlapping candidates is at/above this. */
  duplicate_overlap_count_min: number;
}

const slotsFor = (
  nodeId: TopicSelectionV1bWorkflowHarnessNodeId,
): readonly TopicSelectionV1bWorkflowHarnessSemanticSupportSlotSpec[] =>
  TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_SEMANTIC_SUPPORT_SLOTS.filter((slot) => slot.node_id === nodeId);

export interface TopicSelectionV1bWorkflowHarnessRouteEdgePolicy {
  route_id: string;
  from_node_id: TopicSelectionV1bWorkflowHarnessNodeId;
  route_signal: string;
  route_decision: TopicSelectionV1bWorkflowHarnessRouteDecision;
  next_node_id: TopicSelectionV1bWorkflowHarnessNodeId | 'v1c.entry' | null;
  handoff_kind: TopicSelectionV1bWorkflowHarnessHandoffKind | null;
  allowed_gate_statuses: readonly TopicSelectionV1bWorkflowHarnessGateStatus[];
}

export interface TopicSelectionV1bWorkflowHarnessNodePolicy {
  node_index: number;
  node_id: TopicSelectionV1bWorkflowHarnessNodeId;
  execution_kind: TopicSelectionV1bWorkflowHarnessExecutionKind;
  deterministic_gate_required: true;
  input_contract: string;
  allowed_input_contracts?: readonly string[];
  required_frozen_snapshot_kind: string;
  authority_kind: string;
  output_handoff_kind: TopicSelectionV1bWorkflowHarnessHandoffKind | null;
  gate_id: string;
  execution_spec_allowed: boolean;
  model_option_id_allowed: boolean;
  codex_support_allowed: boolean;
  delegated_payload_allowed: boolean;
  allowed_execution_modes: readonly TopicSelectionV1bWorkflowHarnessSemanticExecutionMode[];
  semantic_support_slots: readonly TopicSelectionV1bWorkflowHarnessSemanticSupportSlotSpec[];
  route_edges: readonly TopicSelectionV1bWorkflowHarnessRouteEdgePolicy[];
  blocker_codes: readonly string[];
  warning_codes: readonly string[];
  loopback_target_codes: readonly string[];
  replay_hash_components: readonly TopicSelectionV1bWorkflowHarnessReplayHashComponent[];
  /** N8 only (T-123 Phase 3): deterministic T1/T3 debate-trigger thresholds. */
  debate_trigger_thresholds?: TopicSelectionV1bN8DebateTriggerThresholds;
  /** N6 only (T-127 W-07): advisory candidate-debate escalation thresholds (no harness compute). */
  n6_debate_trigger_thresholds?: TopicSelectionV1bN6DebateTriggerThresholds;
}

/**
 * W-06 (T-127): the N8 provisional-thresholds PRODUCT GATE — the formal semantics of the
 * `n8_debate_thresholds_provisional` tripwire.
 *
 * While the N8 node policy's `debate_trigger_thresholds.provisional` is true (see below), the harness
 * emits the `N8_DEBATE_THRESHOLDS_PROVISIONAL` warning whenever a PRODUCT run (`run_mode: 'product'`)
 * is governed by these un-calibrated thresholds. That warning is intentionally NON-BLOCKING at the
 * harness layer: the harness threshold judgment is unchanged (DMP-10 / T-088 D6), N8 still admits.
 *
 * The PRODUCT-LEVEL contract is: a real topic may proceed past N8 carrying this warning ONLY with an
 * explicit, recorded stakeholder sign-off acknowledging that N8 ran under provisional thresholds. That
 * sign-off record IS the production-gated override entry; absent it, advancing a real topic past a
 * provisional-threshold N8 is out of policy.
 *
 * The gate is HELD until W-13 calibration meets its bar (>=100 multi-provider labeled samples with a
 * false-positive rate < 5%). Until then `provisional` MUST NOT be set to false and this tripwire MUST
 * NOT be removed (T-127 D8 record-and-defer).
 */
export const N8_DEBATE_THRESHOLDS_PROVISIONAL_PRODUCT_GATE = {
  warning_code: 'N8_DEBATE_THRESHOLDS_PROVISIONAL',
  /** Non-blocking at the harness layer — the node still admits; the gate is a product-level policy. */
  harness_blocking: false,
  /** A real topic may pass N8 carrying the warning only with a recorded stakeholder sign-off. */
  requires_stakeholder_sign_off: true,
  /** T-128 W-16: the concrete record contract behind the flag (see the sign-off schema below). */
  sign_off_contract: 'TopicSelectionStakeholderSignOff@v1',
  applies_when: { run_mode: 'product', thresholds_provisional: true },
  /** Calibration bar that releases the gate (flips provisional:false and removes the tripwire). */
  released_by: 'W-13 calibration: >=100 multi-provider labeled samples, false-positive rate < 5%',
} as const;

/**
 * W-07 (T-127): the N6 provisional-thresholds PRODUCT GATE — the formal semantics of the
 * `N6_DEBATE_THRESHOLDS_PROVISIONAL` tripwire, mirroring the N8 gate above.
 *
 * While the N6 node policy's `n6_debate_trigger_thresholds.provisional` is true, the harness will emit
 * (wired in step f) the `N6_DEBATE_THRESHOLDS_PROVISIONAL` warning whenever a PRODUCT run (`run_mode:
 * 'product'`) is governed by these un-calibrated escalation thresholds. As with N8 the warning is
 * NON-BLOCKING at the harness layer:
 * escalation remains the upstream triage artifact's judgment (DMP-10 / T-088 D6), N6 still admits.
 *
 * The PRODUCT-LEVEL contract is identical: a real topic may proceed past N6 carrying this warning ONLY
 * with an explicit, recorded stakeholder sign-off acknowledging that N6 escalation ran under provisional
 * thresholds. That sign-off record IS the production-gated override entry; absent it, advancing a real
 * topic past a provisional-threshold N6 is out of policy.
 *
 * The gate is HELD until W-13 calibration meets its bar (>=100 multi-provider labeled samples with a
 * false-positive rate < 5%). Until then `provisional` MUST NOT be set to false and this tripwire MUST NOT
 * be removed (T-127 D8 record-and-defer).
 */
export const N6_DEBATE_THRESHOLDS_PROVISIONAL_PRODUCT_GATE = {
  warning_code: 'N6_DEBATE_THRESHOLDS_PROVISIONAL',
  /** Non-blocking at the harness layer — the node still admits; the gate is a product-level policy. */
  harness_blocking: false,
  /** A real topic may pass N6 carrying the warning only with a recorded stakeholder sign-off. */
  requires_stakeholder_sign_off: true,
  /** T-128 W-16: the concrete record contract behind the flag (see the sign-off schema below). */
  sign_off_contract: 'TopicSelectionStakeholderSignOff@v1',
  applies_when: { run_mode: 'product', thresholds_provisional: true },
  /** Calibration bar that releases the gate (flips provisional:false and removes the tripwire). */
  released_by: 'W-13 calibration: >=100 multi-provider labeled samples, false-positive rate < 5%',
} as const;

/**
 * T-128 W-14: the provider_llm DEBATE path is PRE-WIRED but DORMANT. The N6/N8 debate runtimes
 * accept `execution_mode: 'provider_llm'` at the type level and thread per-role `model_option_id`
 * from a named execution plan (T-127 W-09), but their entry guards REJECT provider execution while
 * this const says dormant. Without the guard the path would be LIVE today: the advance route's
 * debate enum admits provider_llm, the debate model profiles default to provider-eligible
 * run modes, and a null model_option_id falls back to a default provider option — i.e. real
 * provider calls on debate prompts that are still skeletons (W-02 ledger; corpus-coupled prompts
 * land with W-18).
 *
 * Turn-on is a HUMAN CODE CHANGE in W-19 (flip `dormant` here) after the W-16
 * `calibration_gate_release` sign-off — never a runtime artifact check (T-127 D8: no auto-flip
 * paths). W-19 also owes the live-path wiring the guard makes unreachable today: live role
 * outputs (no codex/mock passthrough), the gate-bridge provenance decision (the completed-debate
 * draft is bridged as codex_response/mocked_output today — neither fits provider), and the
 * runMode default for provider entries.
 */
export const TOPIC_SELECTION_V1B_PROVIDER_DEBATE_PATH = {
  dormant: true,
  /** What releases the gate: the one-time calibration sign-off (W-16 scope), then the W-19 flip. */
  release_sign_off_contract: 'TopicSelectionStakeholderSignOff@v1',
  release_sign_off_scope: 'calibration_gate_release',
  opened_by: 'W-19 code change (flip `dormant`) after the calibration_gate_release sign-off',
} as const;

/**
 * T-128 W-16: the stakeholder sign-off RECORD contract — the concrete artifact behind the two gates'
 * `requires_stakeholder_sign_off: true` flags (previously declaration-only; the DP-3.3 flip checklist
 * names defining this record as a flip prerequisite). Two scopes, one schema:
 *
 * - `provisional_threshold_run_override`: the PER-RUN override entry — a named human acknowledges that
 *   a specific product-run node attempt proceeded under provisional thresholds. Ties to the concrete
 *   (workflow_run_id, node_id, node_attempt_id) carrying the tripwire warning.
 * - `calibration_gate_release`: the ONE-TIME release record consumed by the W-17 flip. Its calibration
 *   evidence block encodes the release bar STRUCTURALLY — an under-bar record is schema-invalid:
 *   >=100 labeled samples, >=2 distinct providers (the F6 nuance: the N8 profile exposes two — do not
 *   assume three), false-positive rate strictly < 0.05, per-provider-leak check done, and an
 *   INDEPENDENT content-grounded assessor. "语料到位即可一步翻门": once a valid release record exists,
 *   the flip itself stays a separate, human-gated edit (provisional:false + tripwire removal + guard
 *   test re-baseline) — this contract wires NO auto-flip path (T-127 D8).
 *
 * Recording rides the existing control-plane artifact channel (payload validated against this schema);
 * no dedicated table/route until an operator surface needs one.
 */
export const TOPIC_SELECTION_STAKEHOLDER_SIGN_OFF_SCHEMA_VERSION = 'TopicSelectionStakeholderSignOff@v1' as const;

export const TOPIC_SELECTION_PROVISIONAL_GATE_WARNING_CODES = [
  'N8_DEBATE_THRESHOLDS_PROVISIONAL',
  'N6_DEBATE_THRESHOLDS_PROVISIONAL',
] as const;

export type TopicSelectionProvisionalGateWarningCode =
  (typeof TOPIC_SELECTION_PROVISIONAL_GATE_WARNING_CODES)[number];

export type TopicSelectionStakeholderSignOffActor = {
  actor_type: 'human';
  actor_id: string;
};

export type TopicSelectionProvisionalRunOverrideSignOff = {
  schema_version: typeof TOPIC_SELECTION_STAKEHOLDER_SIGN_OFF_SCHEMA_VERSION;
  sign_off_id: string;
  sign_off_scope: 'provisional_threshold_run_override';
  gate_warning_code: TopicSelectionProvisionalGateWarningCode;
  signed_by: TopicSelectionStakeholderSignOffActor;
  signed_at: string;
  rationale: string;
  workflow_run_id: string;
  node_id: string;
  node_attempt_id: string;
};

export type TopicSelectionCalibrationGateReleaseSignOff = {
  schema_version: typeof TOPIC_SELECTION_STAKEHOLDER_SIGN_OFF_SCHEMA_VERSION;
  sign_off_id: string;
  sign_off_scope: 'calibration_gate_release';
  gate_warning_code: TopicSelectionProvisionalGateWarningCode;
  signed_by: TopicSelectionStakeholderSignOffActor;
  signed_at: string;
  rationale: string;
  calibration_evidence: {
    labeled_sample_count: number;
    providers: string[];
    false_positive_rate: number;
    per_provider_leak_checked: true;
    assessor: {
      independent: true;
      actor: TopicSelectionStakeholderSignOffActor;
    };
    corpus_ref: TopicSelectionFunctionalRef;
    calibration_report_ref: TopicSelectionFunctionalRef;
  };
};

export type TopicSelectionStakeholderSignOff =
  | TopicSelectionProvisionalRunOverrideSignOff
  | TopicSelectionCalibrationGateReleaseSignOff;

/**
 * T-128 W-15 (O-2): the loopback-budget raise record — the audited form of the coordinator's
 * `loopback_budget_per_node` knob. Recorded per (workflow_run_id, node_id) via the control-plane
 * artifact channel; the coordinator's effective budget for that node becomes
 * max(call parameter, highest valid raise). `raised_to` is hard-capped at 5 BY SCHEMA — an
 * over-cap raise cannot validate. Human-only, rationale required (same posture as the sign-off).
 */
export const TOPIC_SELECTION_LOOPBACK_BUDGET_RAISE_SCHEMA_VERSION = 'TopicSelectionLoopbackBudgetRaise@v1' as const;

export type TopicSelectionLoopbackBudgetRaise = {
  schema_version: typeof TOPIC_SELECTION_LOOPBACK_BUDGET_RAISE_SCHEMA_VERSION;
  raise_id: string;
  workflow_run_id: string;
  node_id: string;
  raised_to: number;
  rationale: string;
  raised_by: TopicSelectionStakeholderSignOffActor;
  raised_at: string;
};

export const TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_NODE_POLICIES = [
  {
    node_index: 1,
    node_id: 'topic-selection.v1b.create-intake-snapshot.v1',
    execution_kind: 'deterministic',
    deterministic_gate_required: true,
    input_contract: 'V1aToV1bInputBundleFrozenRef@v1',
    required_frozen_snapshot_kind: 'v1a_valid_need_bundle',
    authority_kind: 'V1bIntakeSnapshot',
    output_handoff_kind: 'N1ToN2Handoff',
    gate_id: 'N1IntakeSnapshotGate',
    execution_spec_allowed: false,
    model_option_id_allowed: false,
    codex_support_allowed: false,
    delegated_payload_allowed: false,
    allowed_execution_modes: ['none'],
    semantic_support_slots: slotsFor('topic-selection.v1b.create-intake-snapshot.v1'),
    route_edges: [
      {
        route_id: 'R1_N1_N2',
        from_node_id: 'topic-selection.v1b.create-intake-snapshot.v1',
        route_signal: 'snapshot_created',
        route_decision: 'invoke_next',
        next_node_id: 'topic-selection.v1b.record-research-constraint-profile.v1',
        handoff_kind: 'N1ToN2Handoff',
        allowed_gate_statuses: ['admitted', 'admitted_with_warnings'],
      },
    ],
    blocker_codes: ['missing_v1a_bundle', 'stale_v1a_input', 'v1a_hash_mismatch', 'title_card_mismatch'],
    warning_codes: ['accepted_risk_carried_forward', 'open_recheck_carried_forward'],
    loopback_target_codes: [],
    replay_hash_components: DEFAULT_REPLAY_HASH_COMPONENTS,
  },
  {
    node_index: 2,
    node_id: 'topic-selection.v1b.record-research-constraint-profile.v1',
    execution_kind: 'delegated',
    deterministic_gate_required: true,
    input_contract: 'N1ToN2Handoff@v1',
    required_frozen_snapshot_kind: 'v1b_intake_snapshot',
    authority_kind: 'ResearchConstraintProfile',
    output_handoff_kind: 'N2ToN3Handoff',
    gate_id: 'N2ConstraintProfileGate',
    execution_spec_allowed: false,
    model_option_id_allowed: false,
    codex_support_allowed: true,
    delegated_payload_allowed: true,
    allowed_execution_modes: ['codex_assisted', 'human_delegated'],
    semantic_support_slots: slotsFor('topic-selection.v1b.record-research-constraint-profile.v1'),
    route_edges: [
      {
        route_id: 'R2_N2_N3',
        from_node_id: 'topic-selection.v1b.record-research-constraint-profile.v1',
        route_signal: 'constraint_profile_recorded',
        route_decision: 'invoke_next',
        next_node_id: 'topic-selection.v1b.assess-intake-readiness.v1',
        handoff_kind: 'N2ToN3Handoff',
        allowed_gate_statuses: ['admitted', 'admitted_with_warnings'],
      },
      {
        route_id: 'RB_N2_WAIT',
        from_node_id: 'topic-selection.v1b.record-research-constraint-profile.v1',
        route_signal: 'missing_or_unaccepted_profile',
        route_decision: 'wait',
        next_node_id: null,
        handoff_kind: null,
        allowed_gate_statuses: ['requires_human_review'],
      },
    ],
    blocker_codes: ['missing_accepted_profile_payload', 'unscoped_codex_authority', 'profile_input_hash_mismatch'],
    warning_codes: ['constraint_gap_carried_forward', 'profile_assumption_carried_forward'],
    loopback_target_codes: ['n2_profile_repair'],
    replay_hash_components: DEFAULT_REPLAY_HASH_COMPONENTS,
  },
  {
    node_index: 3,
    node_id: 'topic-selection.v1b.assess-intake-readiness.v1',
    execution_kind: 'deterministic',
    deterministic_gate_required: true,
    input_contract: 'N2ToN3Handoff@v1',
    required_frozen_snapshot_kind: 'research_constraint_profile',
    authority_kind: 'V1bIntakeReadinessAssessment',
    output_handoff_kind: 'N3ToN4Handoff',
    gate_id: 'N3ReadinessGate',
    execution_spec_allowed: false,
    model_option_id_allowed: false,
    codex_support_allowed: true,
    delegated_payload_allowed: false,
    allowed_execution_modes: ['none', 'codex_assisted', 'mocked_llm'],
    semantic_support_slots: slotsFor('topic-selection.v1b.assess-intake-readiness.v1'),
    route_edges: [
      {
        route_id: 'R3_N3_N4',
        from_node_id: 'topic-selection.v1b.assess-intake-readiness.v1',
        route_signal: 'intake_ready_for_slice_generation',
        route_decision: 'invoke_next',
        next_node_id: 'topic-selection.v1b.generate-research-slice-options.v1',
        handoff_kind: 'N3ToN4Handoff',
        allowed_gate_statuses: ['admitted', 'admitted_with_warnings'],
      },
      {
        route_id: 'RB_N3_N1',
        from_node_id: 'topic-selection.v1b.assess-intake-readiness.v1',
        route_signal: 'snapshot_refresh_required',
        route_decision: 'loopback',
        next_node_id: 'topic-selection.v1b.create-intake-snapshot.v1',
        handoff_kind: null,
        allowed_gate_statuses: ['blocked'],
      },
      {
        route_id: 'RB_N3_N2',
        from_node_id: 'topic-selection.v1b.assess-intake-readiness.v1',
        route_signal: 'profile_repair_required',
        route_decision: 'loopback',
        next_node_id: 'topic-selection.v1b.record-research-constraint-profile.v1',
        handoff_kind: null,
        allowed_gate_statuses: ['blocked'],
      },
    ],
    blocker_codes: ['stale_intake_snapshot', 'constraint_profile_mismatch', 'missing_constraint_state'],
    warning_codes: ['accepted_risk_carried_forward', 'readiness_gap_carried_forward'],
    loopback_target_codes: ['n3_snapshot_refresh', 'n3_profile_repair'],
    replay_hash_components: DEFAULT_REPLAY_HASH_COMPONENTS,
  },
  {
    node_index: 4,
    node_id: 'topic-selection.v1b.generate-research-slice-options.v1',
    execution_kind: 'model_like',
    deterministic_gate_required: true,
    input_contract: 'N3ToN4Handoff@v1',
    required_frozen_snapshot_kind: 'v1b_intake_readiness_assessment',
    authority_kind: 'ResearchSliceOptionSet',
    output_handoff_kind: 'N4ToN5Handoff',
    gate_id: 'N4ResearchSliceOptionGate',
    execution_spec_allowed: true,
    model_option_id_allowed: true,
    codex_support_allowed: true,
    delegated_payload_allowed: false,
    allowed_execution_modes: ['codex_assisted', 'mocked_llm', 'provider_llm'],
    semantic_support_slots: slotsFor('topic-selection.v1b.generate-research-slice-options.v1'),
    route_edges: [
      {
        route_id: 'R4_N4_N5',
        from_node_id: 'topic-selection.v1b.generate-research-slice-options.v1',
        route_signal: 'slice_options_generated',
        route_decision: 'invoke_next',
        next_node_id: 'topic-selection.v1b.select-research-slice.v1',
        handoff_kind: 'N4ToN5Handoff',
        allowed_gate_statuses: ['admitted', 'admitted_with_warnings'],
      },
    ],
    blocker_codes: [
      'malformed_research_slice_option_set',
      'missing_method_or_evidence_axis',
      'invalid_model_draft_effect',
      'N4_CLAIM_CEILING_EXCEEDED',
      'N4_CONSTRAINT_PROFILE_HASH_MISMATCH',
      'N4_DUPLICATE_RESEARCH_SLICE_OPTION_KEY',
      'N4_EVIDENCE_REF_MISSING',
      'N4_FROZEN_AUTHORITY_NOT_FOUND',
      'N4_FROZEN_DRAFT_ARTIFACT_HASH_MISMATCH',
      'N4_FROZEN_DRAFT_ARTIFACT_NOT_FOUND',
      'N4_FROZEN_DRAFT_ARTIFACT_REQUIRED',
      'N4_FROZEN_PAYLOAD_INVALID',
      'N4_INTAKE_READINESS_HASH_MISMATCH',
      'N4_INTAKE_SNAPSHOT_HASH_MISMATCH',
      'N4_MISSING_COMPARISON_AXIS',
      'N4_NO_SELECTABLE_RESEARCH_SLICE_OPTION',
      'N4_NON_GOAL_NOT_EXCLUDED',
      'N4_RECOMMENDED_OPTION_BLOCKED',
      'N4_RECOMMENDED_OPTION_NOT_FOUND',
      'N4_RESEARCH_SLICE_OPTION_DRAFT_INVALID',
      'N4_SCOPE_BOUNDARY_MISSING',
      'N4_TARGET_COMMUNITY_DRIFT',
      'N4_UNKNOWN_EVIDENCE_REF',
      'N4_UPSTREAM_AUTHORITY_LINEAGE_MISMATCH',
      'N4_UPSTREAM_NOT_READY',
      'N4_VALIDATED_NEED_REF_MISSING',
    ],
    warning_codes: [
      'high_risk_option_present',
      'missing_option_type_carried_forward',
      'HIGH_RISK_OPTION_PRESENT',
      'HUMAN_REVIEW_REQUIRED',
      'MISSING_OPTION_TYPE_CARRIED_FORWARD',
      'UNRESOLVED_OPTION_DISAGREEMENT_CARRIED_FORWARD',
    ],
    loopback_target_codes: ['n4_regenerate_options'],
    replay_hash_components: DEFAULT_REPLAY_HASH_COMPONENTS,
  },
  {
    node_index: 5,
    node_id: 'topic-selection.v1b.select-research-slice.v1',
    execution_kind: 'delegated',
    deterministic_gate_required: true,
    input_contract: 'N4ToN5Handoff@v1',
    required_frozen_snapshot_kind: 'research_slice_option_set',
    authority_kind: 'ResearchSliceSelectionDecision',
    output_handoff_kind: 'N5ToN6Handoff',
    gate_id: 'N5ResearchSliceSelectionGate',
    execution_spec_allowed: false,
    model_option_id_allowed: false,
    codex_support_allowed: true,
    delegated_payload_allowed: true,
    allowed_execution_modes: ['codex_assisted', 'human_delegated'],
    semantic_support_slots: slotsFor('topic-selection.v1b.select-research-slice.v1'),
    route_edges: [
      {
        route_id: 'R5_N5_N6',
        from_node_id: 'topic-selection.v1b.select-research-slice.v1',
        route_signal: 'slice_selected',
        route_decision: 'invoke_next',
        next_node_id: 'topic-selection.v1b.generate-topic-question-candidates.v1',
        handoff_kind: 'N5ToN6Handoff',
        allowed_gate_statuses: ['admitted', 'admitted_with_warnings'],
      },
      {
        route_id: 'RB_N5_N4',
        from_node_id: 'topic-selection.v1b.select-research-slice.v1',
        route_signal: 'request_more_options',
        route_decision: 'loopback',
        next_node_id: 'topic-selection.v1b.generate-research-slice-options.v1',
        handoff_kind: null,
        allowed_gate_statuses: ['blocked', 'requires_human_review'],
      },
    ],
    blocker_codes: ['missing_selected_option', 'selection_payload_unaccepted', 'selection_option_hash_mismatch'],
    warning_codes: ['selection_risk_accepted', 'deferred_candidate_preserved'],
    loopback_target_codes: ['n5_request_more_options', 'n5_selection_repair'],
    replay_hash_components: DEFAULT_REPLAY_HASH_COMPONENTS,
  },
  {
    node_index: 6,
    node_id: 'topic-selection.v1b.generate-topic-question-candidates.v1',
    execution_kind: 'model_like',
    deterministic_gate_required: true,
    input_contract: 'N5ToN6Handoff@v1',
    required_frozen_snapshot_kind: 'research_slice_selection_decision',
    authority_kind: 'TopicQuestionCandidateSet',
    output_handoff_kind: 'N6ToN7Handoff',
    gate_id: 'N6TopicQuestionCandidateGate',
    execution_spec_allowed: true,
    model_option_id_allowed: true,
    codex_support_allowed: true,
    delegated_payload_allowed: false,
    allowed_execution_modes: ['codex_assisted', 'mocked_llm', 'provider_llm'],
    semantic_support_slots: slotsFor('topic-selection.v1b.generate-topic-question-candidates.v1'),
    route_edges: [
      {
        route_id: 'R6_N6_N7',
        from_node_id: 'topic-selection.v1b.generate-topic-question-candidates.v1',
        route_signal: 'question_candidates_generated',
        route_decision: 'invoke_next',
        next_node_id: 'topic-selection.v1b.materialize-topic-question-contract.v1',
        handoff_kind: 'N6ToN7Handoff',
        allowed_gate_statuses: ['admitted', 'admitted_with_warnings'],
      },
      {
        route_id: 'RB_N6_REGENERATE',
        from_node_id: 'topic-selection.v1b.generate-topic-question-candidates.v1',
        route_signal: 'candidate_regeneration_requested',
        route_decision: 'loopback',
        next_node_id: 'topic-selection.v1b.generate-topic-question-candidates.v1',
        handoff_kind: null,
        allowed_gate_statuses: ['blocked'],
      },
      {
        route_id: 'RB_N6_DEBATE_ESCALATION',
        from_node_id: 'topic-selection.v1b.generate-topic-question-candidates.v1',
        route_signal: 'candidate_debate_escalation_requested',
        route_decision: 'loopback',
        next_node_id: 'topic-selection.v1b.generate-topic-question-candidates.v1',
        handoff_kind: null,
        allowed_gate_statuses: ['blocked'],
      },
      {
        route_id: 'RB_N6_N5_SELECT_DIFFERENT_SLICE',
        from_node_id: 'topic-selection.v1b.generate-topic-question-candidates.v1',
        route_signal: 'select_different_slice_requested',
        route_decision: 'loopback',
        next_node_id: 'topic-selection.v1b.select-research-slice.v1',
        handoff_kind: null,
        allowed_gate_statuses: ['blocked'],
      },
    ],
    blocker_codes: ['weak_topic_question_candidate_set', 'duplicate_or_overlapping_candidates', 'missing_value_axis'],
    warning_codes: [
      'candidate_overlap_preserved',
      'debate_escalation_recommended',
      'decision_memory_duplicate_candidate',
      // W-07 step e: provisional escalation thresholds governed a product run (calibration tripwire).
      'n6_debate_thresholds_provisional',
    ],
    loopback_target_codes: [...TOPIC_SELECTION_V1B_N6_LOOPBACK_TARGET_CODES],
    replay_hash_components: [...DEFAULT_REPLAY_HASH_COMPONENTS, 'selected_candidate_hash'],
    n6_debate_trigger_thresholds: {
      // W-07 step e: stays PROVISIONAL. There is no empirical N6 candidate-quality distribution to
      // calibrate against — every N6 candidate set in the deep-test artifacts is a hand-authored fixture,
      // not a spread of real generation runs. Picking escalation cut-offs would be guessing (prohibited),
      // so the provisional values hold and the n6_debate_thresholds_provisional tripwire guards product.
      // Product-gate semantics for this flag: see N6_DEBATE_THRESHOLDS_PROVISIONAL_PRODUCT_GATE (T-127 W-07).
      provisional: true,
      weak_blocked_fraction_min: 0.5,
      weak_blocked_count_min: 2,
      admissible_candidate_floor: 1,
      duplicate_distinct_ratio_max_inclusive: 0.5,
      duplicate_overlap_count_min: 2,
    },
  },
  {
    node_index: 7,
    node_id: 'topic-selection.v1b.materialize-topic-question-contract.v1',
    // T-127 W-10: NOT a required human-review surface, despite execution_kind 'delegated'. The INITIAL
    // contract materialization is MECHANICAL — the runtime chooseN7Candidate picks the active candidate
    // algorithmically (the frozen N6->N7 input carries no human content). The 'human_delegated' / codex
    // support modes below are for OPTIONAL support artifacts on the N8-failure loopback
    // (n7_synthesize_n8_failures), NOT a needed human gate: allowance != needs-review, so the reviewer
    // workbench correctly ships no dedicated human-N7 write card. Do not "promote" N7 to a human node here.
    execution_kind: 'delegated',
    deterministic_gate_required: true,
    input_contract: 'N6ToN7Handoff@v1',
    allowed_input_contracts: ['N6ToN7Handoff@v1', 'N8ToN7Feedback@v1'],
    required_frozen_snapshot_kind: 'topic_question_candidate_set',
    authority_kind: 'TopicQuestionContract',
    output_handoff_kind: 'N7ToN8Handoff',
    gate_id: 'N7TopicQuestionContractGate',
    execution_spec_allowed: false,
    model_option_id_allowed: false,
    codex_support_allowed: true,
    delegated_payload_allowed: true,
    allowed_execution_modes: ['none', 'codex_assisted', 'human_delegated', 'mocked_llm'],
    semantic_support_slots: slotsFor('topic-selection.v1b.materialize-topic-question-contract.v1'),
    route_edges: [
      {
        route_id: 'R7_N7_N8',
        from_node_id: 'topic-selection.v1b.materialize-topic-question-contract.v1',
        route_signal: 'topic_question_contract_materialized',
        route_decision: 'invoke_next',
        next_node_id: 'topic-selection.v1b.assess-topic-value.v1',
        handoff_kind: 'N7ToN8Handoff',
        allowed_gate_statuses: ['admitted', 'admitted_with_warnings'],
      },
      {
        route_id: 'RB_N7_N6',
        from_node_id: 'topic-selection.v1b.materialize-topic-question-contract.v1',
        route_signal: 'candidate_trials_exhausted',
        route_decision: 'loopback',
        next_node_id: 'topic-selection.v1b.generate-topic-question-candidates.v1',
        handoff_kind: null,
        allowed_gate_statuses: ['blocked'],
      },
    ],
    blocker_codes: ['no_active_candidate', 'semantically_invalid_topic_question_contract', 'candidate_trial_exhausted'],
    warning_codes: ['candidate_grouping_preserved', 'n8_debate_level_selected'],
    loopback_target_codes: ['n7_select_next_candidate', 'n7_synthesize_n8_failures', 'n7_loopback_to_n6'],
    replay_hash_components: [
      ...DEFAULT_REPLAY_HASH_COMPONENTS,
      'selected_candidate_hash',
      'trial_ledger_hash',
      'debate_admission_hash',
      'feedback_hash',
      'authority_hash',
      'handoff_hash',
    ],
  },
  {
    node_index: 8,
    node_id: 'topic-selection.v1b.assess-topic-value.v1',
    execution_kind: 'model_like',
    deterministic_gate_required: true,
    input_contract: 'N7ToN8Handoff@v1',
    required_frozen_snapshot_kind: 'topic_question_contract',
    authority_kind: 'TopicValueAssessment',
    output_handoff_kind: 'N8ToN9Handoff',
    gate_id: 'N8TopicValueAssessmentGate',
    execution_spec_allowed: true,
    model_option_id_allowed: true,
    codex_support_allowed: true,
    delegated_payload_allowed: false,
    allowed_execution_modes: ['codex_assisted', 'mocked_llm', 'provider_llm'],
    semantic_support_slots: slotsFor('topic-selection.v1b.assess-topic-value.v1'),
    route_edges: [
      {
        route_id: 'R8_N8_N9',
        from_node_id: 'topic-selection.v1b.assess-topic-value.v1',
        route_signal: 'topic_value_assessed',
        route_decision: 'invoke_next',
        next_node_id: 'topic-selection.v1b.decide-value-disposition.v1',
        handoff_kind: 'N8ToN9Handoff',
        allowed_gate_statuses: ['admitted', 'admitted_with_warnings', 'terminal_no_advance'],
      },
      {
        route_id: 'RB_N8_N7',
        from_node_id: 'topic-selection.v1b.assess-topic-value.v1',
        route_signal: 'value_assessment_feedback',
        route_decision: 'loopback',
        next_node_id: 'topic-selection.v1b.materialize-topic-question-contract.v1',
        handoff_kind: null,
        allowed_gate_statuses: ['blocked', 'retryable_failure'],
      },
    ],
    blocker_codes: [
      'value_assessment_drops_risks',
      'method_evidence_value_gap',
      'value_not_supported',
      // T-123 Phase 3 (D2): first-pass T1/T3 hits route loopback to N7 for debate admission.
      'value_borderline_debate_trigger',
      'dimension_conflict_debate_trigger',
    ],
    warning_codes: [
      'residual_risk_carried_forward',
      'value_gap_carried_forward',
      // T-123 Phase 3 (DP-3.2): post-debate re-assessment still in band → admit with warning.
      'value_borderline_after_debate',
      'dimension_conflict_after_debate',
      // T-123 Phase 3 (DP-3.3): provisional thresholds governed a product run (calibration tripwire).
      'n8_debate_thresholds_provisional',
    ],
    loopback_target_codes: ['n8_feedback_to_n7', 'n8_retry_same_contract'],
    replay_hash_components: [...DEFAULT_REPLAY_HASH_COMPONENTS, 'authority_hash'],
    debate_trigger_thresholds: {
      // DP-3.3: stays PROVISIONAL. The 2026-06-15 calibration pass found NO empirical N8 score
      // distribution to calibrate against — every N8 score in every deep-test artifact is a single
      // hand-authored fixture (total_score 83, conf 0.82, spread 12) or a circular/value-neutral probe,
      // not a spread of real assessments. Changing the constants would be guessing (prohibited), so the
      // provisional values hold and the n8_debate_thresholds_provisional tripwire keeps guarding product.
      // Evidence + the data-collection plan: 03-implementation-notes DP-3.3 + 07-phase3-debate-skeleton-spec.
      // Product-gate semantics for this flag: see N8_DEBATE_THRESHOLDS_PROVISIONAL_PRODUCT_GATE (T-127 W-06).
      provisional: true,
      t1_total_score_min: 60,
      t1_total_score_max_exclusive: 72,
      t1_confidence_min: 0.55,
      t3_dimension_spread_min: 40,
      t3_single_dimension_floor: 35,
      t3_total_score_min: 60,
    },
  },
  {
    node_index: 9,
    node_id: 'topic-selection.v1b.decide-value-disposition.v1',
    // T-127 W-10: READ-ONLY by design — a deterministic disposition rule over the frozen N8 value
    // assessment. allowed_execution_modes:['none'] + delegated_payload_allowed:false +
    // codex_support_allowed:false means there is NO human or model write surface (the reviewer workbench
    // correctly omits a human-N9 card). Do NOT add 'human_delegated' / codex support: the disposition is a
    // pure deterministic function of the frozen assessment, not a human or LLM judgement point.
    execution_kind: 'deterministic',
    deterministic_gate_required: true,
    input_contract: 'N8ToN9Handoff@v1',
    required_frozen_snapshot_kind: 'topic_value_assessment',
    authority_kind: 'ValueDisposition',
    output_handoff_kind: 'N9ToN10Handoff',
    gate_id: 'N9ValueDispositionGate',
    execution_spec_allowed: false,
    model_option_id_allowed: false,
    codex_support_allowed: false,
    delegated_payload_allowed: false,
    allowed_execution_modes: ['none'],
    semantic_support_slots: slotsFor('topic-selection.v1b.decide-value-disposition.v1'),
    route_edges: [
      {
        route_id: 'R9_N9_N10',
        from_node_id: 'topic-selection.v1b.decide-value-disposition.v1',
        route_signal: 'advance_to_package_candidate',
        route_decision: 'invoke_next',
        next_node_id: 'topic-selection.v1b.create-draft-topic-package.v1',
        handoff_kind: 'N9ToN10Handoff',
        allowed_gate_statuses: ['admitted', 'admitted_with_warnings'],
      },
      {
        route_id: 'RT_N9_STOP',
        from_node_id: 'topic-selection.v1b.decide-value-disposition.v1',
        route_signal: 'non_advance_disposition',
        route_decision: 'blocked',
        next_node_id: null,
        handoff_kind: null,
        allowed_gate_statuses: ['terminal_no_advance'],
      },
    ],
    blocker_codes: ['missing_value_assessment', 'non_advance_disposition', 'malformed_advance_conditions'],
    warning_codes: ['advance_with_conditions', 'accepted_risk_carried_forward'],
    loopback_target_codes: ['n9_loopback_to_n7', 'n9_loopback_to_n8'],
    replay_hash_components: [...DEFAULT_REPLAY_HASH_COMPONENTS, 'authority_hash', 'handoff_hash'],
  },
  {
    node_index: 10,
    node_id: 'topic-selection.v1b.create-draft-topic-package.v1',
    // T-127 W-10: READ-ONLY by design — deterministic draft-package assembly from the N9 disposition.
    // allowed_execution_modes:['none'] (no human/model write surface; the workbench omits a human-N10 card).
    // Do NOT add 'human_delegated' / codex support: the package is a deterministic projection, not a
    // human or LLM authoring point.
    execution_kind: 'deterministic',
    deterministic_gate_required: true,
    input_contract: 'N9ToN10Handoff@v1',
    required_frozen_snapshot_kind: 'value_disposition_decision',
    authority_kind: 'DraftTopicPackage',
    output_handoff_kind: 'N10ToN11Handoff',
    gate_id: 'N10DraftTopicPackageGate',
    execution_spec_allowed: false,
    model_option_id_allowed: false,
    codex_support_allowed: false,
    delegated_payload_allowed: false,
    allowed_execution_modes: ['none'],
    semantic_support_slots: slotsFor('topic-selection.v1b.create-draft-topic-package.v1'),
    route_edges: [
      {
        route_id: 'R10_N10_N11',
        from_node_id: 'topic-selection.v1b.create-draft-topic-package.v1',
        route_signal: 'package_created',
        route_decision: 'invoke_next',
        next_node_id: 'topic-selection.v1b.publish-v1c-input-bundle.v1',
        handoff_kind: 'N10ToN11Handoff',
        allowed_gate_statuses: ['admitted', 'admitted_with_warnings'],
      },
    ],
    blocker_codes: ['non_advance_handoff', 'package_hash_conflict', 'raw_provider_output_in_package'],
    warning_codes: ['package_existing_returned', 'conditions_carried_forward'],
    loopback_target_codes: [],
    replay_hash_components: [...DEFAULT_REPLAY_HASH_COMPONENTS, 'authority_hash', 'handoff_hash'],
  },
  {
    node_index: 11,
    node_id: 'topic-selection.v1b.publish-v1c-input-bundle.v1',
    execution_kind: 'deterministic',
    deterministic_gate_required: true,
    input_contract: 'N10ToN11Handoff@v1',
    required_frozen_snapshot_kind: 'topic_package',
    authority_kind: 'V1cInputBundle',
    output_handoff_kind: 'V1cInputBundle',
    gate_id: 'N11V1cInputBundlePublicationGate',
    execution_spec_allowed: false,
    model_option_id_allowed: false,
    codex_support_allowed: false,
    delegated_payload_allowed: false,
    allowed_execution_modes: ['none'],
    semantic_support_slots: slotsFor('topic-selection.v1b.publish-v1c-input-bundle.v1'),
    route_edges: [
      {
        route_id: 'R11_N11_V1C',
        from_node_id: 'topic-selection.v1b.publish-v1c-input-bundle.v1',
        route_signal: 'v1c_bundle_published',
        route_decision: 'stop_v1b_complete',
        next_node_id: 'v1c.entry',
        handoff_kind: 'V1cInputBundle',
        allowed_gate_statuses: ['admitted', 'admitted_with_warnings'],
      },
    ],
    blocker_codes: ['missing_package_lineage', 'non_publishable_package', 'v1c_side_effect_payload'],
    warning_codes: ['v1c_bundle_existing_returned', 'residual_risk_carried_forward'],
    loopback_target_codes: [],
    replay_hash_components: [...DEFAULT_REPLAY_HASH_COMPONENTS, 'authority_hash', 'handoff_hash'],
  },
] as const satisfies readonly TopicSelectionV1bWorkflowHarnessNodePolicy[];

export interface TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef {
  slot_id: TopicSelectionV1bWorkflowHarnessSemanticSlotId;
  node_id: TopicSelectionV1bWorkflowHarnessNodeId;
  execution_mode: TopicSelectionV1bWorkflowHarnessSemanticArtifactExecutionMode;
  run_mode: TopicSelectionAgentRunMode;
  allowed_effect: TopicSelectionV1bWorkflowHarnessSemanticAllowedEffect;
  support_artifact_ref: TopicSelectionFunctionalRef;
  support_artifact_hash: string;
  normalized_output_ref: TopicSelectionFunctionalRef | null;
  normalized_output_hash: string;
  output_contract: string;
  profile_id: TopicSelectionV1bWorkflowHarnessProfileId;
  model_option_id: string | null;
  input_hash: string;
  prompt_packet_hash: string;
  structured_output_hash: string;
  adapter_policy_version: string;
  slot_spec_hash: string;
  provenance_ref: TopicSelectionFunctionalRef;
  runtime_provenance_class: TopicSelectionV1bWorkflowHarnessRuntimeProvenanceClass;
  context_policy_profile_id: string | null;
  context_policy_profile_version: string | null;
  context_policy_profile_hash: string | null;
  prompt_variant_key: string | null;
  runtime_invocation_context_hash: string | null;
  redaction_policy: string | null;
  source_hashes: Record<string, string>;
  runtime_audit_ref: TopicSelectionFunctionalRef | null;
  runtime_audit_hash: string | null;
  compression_report_ref: TopicSelectionFunctionalRef | null;
  compression_report_hash: string | null;
  compressed_context_hash: string | null;
}

export interface TopicSelectionV1bWorkflowHarnessAuthorityRef {
  authority_kind: string;
  authority_ref: TopicSelectionFunctionalRef;
  authority_hash: string;
  source_node_id: TopicSelectionV1bWorkflowHarnessNodeId;
  source_node_attempt_id: string;
  policy_version: string;
  schema_version: string;
}

export interface TopicSelectionV1bWorkflowHarnessHandoffEnvelope {
  handoff_kind: TopicSelectionV1bWorkflowHarnessHandoffKind;
  source_node_id: TopicSelectionV1bWorkflowHarnessNodeId;
  source_node_attempt_id: string;
  source_authority_ref: TopicSelectionFunctionalRef;
  source_authority_hash: string;
  source_gate_result_hash: string;
  upstream_lineage_hash: string;
  policy_version: string;
  schema_version: string;
  warning_codes: string[];
  residual_risk_refs: TopicSelectionFunctionalRef[];
}

export interface TopicSelectionV1bN1ToN2HandoffPayload {
  intake_snapshot_ref: TopicSelectionFunctionalRef;
  intake_snapshot_hash: string;
  v1a_bundle_ref: TopicSelectionFunctionalRef;
  v1a_bundle_hash: string;
}

export interface TopicSelectionV1bN2ToN3HandoffPayload {
  constraint_profile_ref: TopicSelectionFunctionalRef;
  constraint_profile_hash: string;
  intake_snapshot_ref: TopicSelectionFunctionalRef;
  intake_snapshot_hash: string;
}

export interface TopicSelectionV1bN3ToN4HandoffPayload {
  intake_readiness_ref: TopicSelectionFunctionalRef;
  intake_readiness_hash: string;
  constraint_profile_ref: TopicSelectionFunctionalRef;
  constraint_profile_hash: string;
}

export interface TopicSelectionV1bN4ToN5HandoffPayload {
  research_slice_option_set_ref: TopicSelectionFunctionalRef;
  research_slice_option_set_hash: string;
}

export interface TopicSelectionV1bN5ToN6HandoffPayload {
  constraint_profile_ref: TopicSelectionFunctionalRef;
  constraint_profile_hash: string;
  intake_readiness_ref: TopicSelectionFunctionalRef;
  intake_readiness_hash: string;
  research_slice_ref: TopicSelectionFunctionalRef;
  research_slice_hash: string;
  research_slice_selection_ref: TopicSelectionFunctionalRef;
  research_slice_selection_hash: string;
  research_slice_option_set_ref: TopicSelectionFunctionalRef;
  research_slice_option_set_hash: string;
  selected_slice_option_ref: TopicSelectionFunctionalRef;
  selected_slice_option_hash: string;
}

export interface TopicSelectionV1bN6ToN7HandoffPayload {
  topic_question_candidate_set_ref: TopicSelectionFunctionalRef;
  topic_question_candidate_set_hash: string;
  admissible_candidate_refs: TopicSelectionFunctionalRef[];
  admissible_candidate_hashes: string[];
  selected_research_slice_ref: TopicSelectionFunctionalRef;
  selected_research_slice_hash: string;
  generation_artifact_ref: TopicSelectionFunctionalRef;
  generation_artifact_hash: string;
  candidate_gate_hash: string;
  candidate_grouping_ref: TopicSelectionFunctionalRef | null;
  candidate_grouping_hash: string | null;
}

export interface TopicSelectionV1bN7ToN8HandoffPayload {
  topic_question_ref: TopicSelectionFunctionalRef;
  topic_question_hash: string;
  topic_question_contract_ref: TopicSelectionFunctionalRef;
  topic_question_contract_hash: string;
  answerability_plan_ref: TopicSelectionFunctionalRef;
  answerability_plan_hash: string;
  trial_ledger_ref: TopicSelectionFunctionalRef;
  trial_ledger_hash: string;
  topic_question_candidate_set_ref: TopicSelectionFunctionalRef;
  topic_question_candidate_set_hash: string;
  active_candidate_ref: TopicSelectionFunctionalRef;
  active_candidate_hash: string;
  selected_research_slice_ref: TopicSelectionFunctionalRef;
  selected_research_slice_hash: string;
  n8_debate_admission_ref: TopicSelectionFunctionalRef;
  n8_debate_admission_hash: string;
  candidate_grouping_ref: TopicSelectionFunctionalRef | null;
  candidate_grouping_hash: string | null;
}

export interface TopicSelectionV1bN7RuntimeContextProjectionBase {
  schema_version: typeof TOPIC_SELECTION_V1B_N7_RUNTIME_CONTEXT_PROJECTION_SCHEMA_VERSION;
  projection_kind: TopicSelectionV1bN7RuntimeContextProjectionKind;
  node_id: 'topic-selection.v1b.materialize-topic-question-contract.v1';
  workflow_run_id: string;
  node_attempt_id: string;
  route_decision: 'invoke_next' | 'loopback';
  non_authority: true;
  context_cache_scope: 'process_local_runtime_only';
  context_authority: 'non_authority_runtime_context';
  source_refs: TopicSelectionFunctionalRef[];
  source_hashes: Record<string, string>;
  support_refs: TopicSelectionFunctionalRef[];
  support_hashes: Record<string, string>;
  preserved_fact_kinds: string[];
}

export interface TopicSelectionV1bN6RuntimeContextProjectionBase {
  schema_version: typeof TOPIC_SELECTION_V1B_N6_RUNTIME_CONTEXT_PROJECTION_SCHEMA_VERSION;
  projection_kind: TopicSelectionV1bN6RuntimeContextProjectionKind;
  node_id: 'topic-selection.v1b.generate-topic-question-candidates.v1';
  workflow_run_id: string;
  node_attempt_id: string;
  route_decision: 'loopback';
  non_authority: true;
  context_cache_scope: 'process_local_runtime_only';
  context_authority: 'non_authority_runtime_context';
  source_refs: TopicSelectionFunctionalRef[];
  source_hashes: Record<string, string>;
  support_refs: TopicSelectionFunctionalRef[];
  support_hashes: Record<string, string>;
  preserved_fact_kinds: string[];
}

export interface TopicSelectionV1bN6GateFailureRetryContextProjection
extends TopicSelectionV1bN6RuntimeContextProjectionBase {
  projection_kind: 'v1b_n6_gate_failure_retry_context';
  // The N6 gate-failure retry context backs BOTH the single-agent regeneration loopback
  // (n6_regenerate_candidates) and the divergent-debate escalation (n6_debate_escalation) — both
  // re-run candidate generation against the same failed-draft/blocked-candidate context.
  loopback_target_code: 'n6_regenerate_candidates' | 'n6_debate_escalation';
  selected_research_slice_ref: TopicSelectionFunctionalRef;
  selected_research_slice_hash: string;
  n5_handoff_hash: string;
  failed_draft_ref: TopicSelectionFunctionalRef;
  failed_draft_hash: string;
  failed_draft_prompt_packet_hash: string;
  failed_draft_source_hashes_hash: string;
  blocked_candidate_context: Record<string, unknown>[];
  blocked_candidate_context_hash: string;
  failure_reason_codes: string[];
  regeneration_hints: string[];
  triage_artifact_ref: TopicSelectionFunctionalRef | null;
  triage_artifact_hash: string | null;
  triage_payload_hash: string | null;
}

export type TopicSelectionV1bN6RuntimeContextProjection =
  TopicSelectionV1bN6GateFailureRetryContextProjection;

export interface TopicSelectionV1bN7ToN8TopicQuestionContractContextProjection
extends TopicSelectionV1bN7RuntimeContextProjectionBase {
  projection_kind: 'v1b_n7_to_n8_topic_question_contract_context';
  route_decision: 'invoke_next';
  n7_handoff_ref: TopicSelectionFunctionalRef;
  n7_handoff_hash: string;
  topic_question_ref: TopicSelectionFunctionalRef;
  topic_question_hash: string;
  topic_question_contract_ref: TopicSelectionFunctionalRef;
  topic_question_contract_hash: string;
  answerability_plan_ref: TopicSelectionFunctionalRef;
  answerability_plan_hash: string;
  trial_ledger_ref: TopicSelectionFunctionalRef;
  trial_ledger_hash: string;
  topic_question_candidate_set_ref: TopicSelectionFunctionalRef;
  topic_question_candidate_set_hash: string;
  active_candidate_ref: TopicSelectionFunctionalRef;
  active_candidate_hash: string;
  selected_research_slice_ref: TopicSelectionFunctionalRef;
  selected_research_slice_hash: string;
  n8_debate_admission_ref: TopicSelectionFunctionalRef;
  n8_debate_admission_hash: string;
  candidate_grouping_ref: TopicSelectionFunctionalRef | null;
  candidate_grouping_hash: string | null;
}

export interface TopicSelectionV1bN7ToN6FailedTrialLoopbackContextProjection
extends TopicSelectionV1bN7RuntimeContextProjectionBase {
  projection_kind: 'v1b_n7_to_n6_failed_trial_loopback_context';
  route_decision: 'loopback';
  loopback_target_code: 'n7_loopback_to_n6';
  topic_question_candidate_set_ref: TopicSelectionFunctionalRef;
  topic_question_candidate_set_hash: string;
  n6_handoff_hash: string;
  n8_feedback_ref: TopicSelectionFunctionalRef | null;
  n8_feedback_hash: string | null;
  failed_trial_synthesis_ref: TopicSelectionFunctionalRef;
  failed_trial_synthesis_hash: string;
  exhausted_candidate_refs: TopicSelectionFunctionalRef[];
  exhausted_candidate_hashes: string[];
  failure_reason_codes: string[];
  n6_regeneration_hints: string[];
  synthesis_summary: string;
}

export type TopicSelectionV1bN7RuntimeContextProjection =
  | TopicSelectionV1bN7ToN8TopicQuestionContractContextProjection
  | TopicSelectionV1bN7ToN6FailedTrialLoopbackContextProjection;

export interface TopicSelectionV1bN8ToN9HandoffPayload {
  topic_value_assessment_ref: TopicSelectionFunctionalRef;
  topic_value_assessment_hash: string;
  topic_question_contract_ref: TopicSelectionFunctionalRef;
  topic_question_contract_hash: string;
  value_reasoning_memo_ref: TopicSelectionFunctionalRef;
  value_reasoning_memo_hash: string;
  recommended_disposition: TopicSelectionValueDisposition;
}

export interface TopicSelectionV1bN9ToN10HandoffPayload {
  value_disposition_ref: TopicSelectionFunctionalRef;
  value_disposition_hash: string;
  advance_disposition: true;
  topic_value_assessment_ref: TopicSelectionFunctionalRef;
  topic_value_assessment_hash: string;
}

export interface TopicSelectionV1bN10ToN11HandoffPayload {
  draft_topic_package_ref: TopicSelectionFunctionalRef;
  draft_topic_package_hash: string;
  value_disposition_ref: TopicSelectionFunctionalRef;
  value_disposition_hash: string;
  v1c_input_bundle_ref: TopicSelectionFunctionalRef;
  v1c_input_bundle_hash: string;
}

export interface TopicSelectionV1bV1cInputBundlePayload {
  v1c_input_bundle_ref: TopicSelectionFunctionalRef;
  v1c_input_bundle_hash: string;
  draft_topic_package_ref: TopicSelectionFunctionalRef;
  draft_topic_package_hash: string;
}

export type TopicSelectionV1bWorkflowHarnessHandoffPayload =
  | TopicSelectionV1bN1ToN2HandoffPayload
  | TopicSelectionV1bN2ToN3HandoffPayload
  | TopicSelectionV1bN3ToN4HandoffPayload
  | TopicSelectionV1bN4ToN5HandoffPayload
  | TopicSelectionV1bN5ToN6HandoffPayload
  | TopicSelectionV1bN6ToN7HandoffPayload
  | TopicSelectionV1bN7ToN8HandoffPayload
  | TopicSelectionV1bN8ToN9HandoffPayload
  | TopicSelectionV1bN9ToN10HandoffPayload
  | TopicSelectionV1bN10ToN11HandoffPayload
  | TopicSelectionV1bV1cInputBundlePayload;

export interface TopicSelectionV1bWorkflowHarnessHandoff {
  envelope: TopicSelectionV1bWorkflowHarnessHandoffEnvelope;
  target_node_id: TopicSelectionV1bWorkflowHarnessNodeId | 'v1c.entry';
  route_signal: string;
  payload_hash: string;
  required_refs: TopicSelectionFunctionalRef[];
  payload: TopicSelectionV1bWorkflowHarnessHandoffPayload;
}

export interface TopicSelectionV1bN1HarnessFrozenInputPayload {
  v1b_input_bundle_id: string;
  v1a_bundle_ref: TopicSelectionFunctionalRef;
  v1a_bundle_hash: string;
  source_refs_hash: string;
}

export interface TopicSelectionV1bAcceptedConstraintProfilePayload {
  target_community: string;
  target_venue_class: string | null;
  intended_contribution_style: string | null;
  method_constraints: string[];
  resource_constraints: string[];
  available_assets: string[];
  feasibility_budget: Record<string, unknown>;
  non_goals: string[];
  claim_ceiling: string;
  human_constraint_notes: string | null;
  constraint_payload: Record<string, unknown>;
}

export interface TopicSelectionV1bN2HarnessFrozenInputPayload {
  intake_snapshot_ref: TopicSelectionFunctionalRef;
  intake_snapshot_hash: string;
  v1a_bundle_ref: TopicSelectionFunctionalRef;
  v1a_bundle_hash: string;
  authority_input_provider: TopicSelectionV1bN2AuthorityInputProvider;
  accepted_constraint_profile_payload: TopicSelectionV1bAcceptedConstraintProfilePayload;
  accepted_constraint_profile_payload_hash: string;
  delegation_artifact_hash: string | null;
  previous_profile_ref?: TopicSelectionFunctionalRef | null;
  previous_profile_hash?: string | null;
}

export interface TopicSelectionV1bN3HarnessFrozenInputPayload {
  intake_snapshot_ref: TopicSelectionFunctionalRef;
  intake_snapshot_hash: string;
  constraint_profile_ref: TopicSelectionFunctionalRef;
  constraint_profile_hash: string;
  n2_handoff_hash: string;
}

export type TopicSelectionV1bResearchSliceOptionSetDraftPayload =
  TopicSelectionResearchSliceOptionSetLlmOutput;

export interface TopicSelectionV1bN4HarnessFrozenInputPayload {
  intake_snapshot_ref: TopicSelectionFunctionalRef;
  intake_snapshot_hash: string;
  constraint_profile_ref: TopicSelectionFunctionalRef;
  constraint_profile_hash: string;
  intake_readiness_ref: TopicSelectionFunctionalRef;
  intake_readiness_hash: string;
  n2_handoff_hash: string;
  n3_handoff_hash: string;
}

export interface TopicSelectionV1bAcceptedSliceSelectionPayload {
  decision: TopicSelectionSliceSelectionDecision;
  selected_option_ref: TopicSelectionFunctionalRef | null;
  selected_option_hash: string | null;
  selection_rationale: string;
  decision_basis: Record<string, unknown>;
  rejected_option_reasons: TopicSelectionRejectedSliceOptionReason[];
  required_actions: string[];
  accepted_risk_refs: TopicSelectionFunctionalRef[];
  confidence: number | null;
  requires_human_review: boolean;
  human_review_reason: string | null;
  loopback_target: TopicSelectionSliceLoopbackTarget | null;
  loopback_target_ref: TopicSelectionFunctionalRef | null;
  loopback_reason_code: string | null;
}

export interface TopicSelectionV1bN5HarnessFrozenInputPayload {
  research_slice_option_set_ref: TopicSelectionFunctionalRef;
  research_slice_option_set_hash: string;
  n4_handoff_hash: string;
  authority_input_provider: TopicSelectionV1bN5AuthorityInputProvider;
  accepted_selection_payload: TopicSelectionV1bAcceptedSliceSelectionPayload;
  accepted_selection_payload_hash: string;
  delegation_artifact_hash: string | null;
}

export type TopicSelectionV1bTopicQuestionCandidateSetDraftPayload =
  TopicSelectionFormTopicQuestionLlmOutput;

export interface TopicSelectionV1bN6HarnessFrozenInputPayload {
  n5_handoff_hash: string;
  constraint_profile_ref: TopicSelectionFunctionalRef;
  constraint_profile_hash: string;
  intake_readiness_ref: TopicSelectionFunctionalRef;
  intake_readiness_hash: string;
  research_slice_ref: TopicSelectionFunctionalRef;
  research_slice_hash: string;
  research_slice_selection_ref: TopicSelectionFunctionalRef;
  research_slice_selection_hash: string;
  research_slice_option_set_ref: TopicSelectionFunctionalRef;
  research_slice_option_set_hash: string;
  selected_slice_option_ref: TopicSelectionFunctionalRef;
  selected_slice_option_hash: string;
}

export interface TopicSelectionV1bN6LoopbackTriageSupportPayload {
  loopback_target_code: TopicSelectionV1bN6LoopbackTargetCode;
  failure_scope: 'candidate_level' | 'question_frame_level' | 'slice_level' | 'upstream_context_level';
  dominant_reason_codes: string[];
  affected_refs: TopicSelectionFunctionalRef[];
  regeneration_hints: string[];
  debate_escalation: {
    debate_level: 'mixed_cost_control' | 'provider_diverse_deep';
    recommended_profile_id: string;
    sticky: boolean;
    rationale: string;
  } | null;
  upstream_rollback: {
    target_node_id: 'topic-selection.v1b.select-research-slice.v1';
    repair_action: 'select_different_slice';
    rationale: string;
  } | null;
  rationale: string;
}

export type TopicSelectionV1bN7InputMode = 'initial_from_n6' | 'feedback_from_n8';

export interface TopicSelectionV1bN7HarnessInitialFrozenInputPayload
extends TopicSelectionV1bN6ToN7HandoffPayload {
  input_mode: 'initial_from_n6';
  n6_handoff_hash: string;
}

export interface TopicSelectionV1bN8ToN7FeedbackPayload {
  feedback_class: 'semantic_candidate_failure' | 'gate_rejected' | 'technical_failure';
  failure_reason_code: string;
  feedback_summary: string;
  affected_refs: TopicSelectionFunctionalRef[];
  previous_n7_handoff_ref: TopicSelectionFunctionalRef;
  previous_n7_handoff_hash: string;
  previous_trial_ledger_ref: TopicSelectionFunctionalRef;
  previous_trial_ledger_hash: string;
  failed_topic_question_contract_ref: TopicSelectionFunctionalRef;
  failed_topic_question_contract_hash: string;
  failed_candidate_ref: TopicSelectionFunctionalRef;
  failed_candidate_hash: string;
  topic_question_candidate_set_ref: TopicSelectionFunctionalRef;
  topic_question_candidate_set_hash: string;
  n8_gate_result_hash: string;
  value_assessment_ref: TopicSelectionFunctionalRef | null;
  value_assessment_hash: string | null;
}

export interface TopicSelectionV1bN7HarnessFeedbackFrozenInputPayload
extends TopicSelectionV1bN6ToN7HandoffPayload {
  input_mode: 'feedback_from_n8';
  n6_handoff_hash: string;
  n8_feedback_ref: TopicSelectionFunctionalRef;
  n8_feedback_hash: string;
  n8_feedback_payload_hash: string;
}

export type TopicSelectionV1bN7HarnessFrozenInputPayload =
  | TopicSelectionV1bN7HarnessInitialFrozenInputPayload
  | TopicSelectionV1bN7HarnessFeedbackFrozenInputPayload;

export type TopicSelectionV1bTopicValueAssessmentDraftPayload =
  TopicSelectionAssessTopicValueLlmOutput;

export interface TopicSelectionV1bN8HarnessFrozenInputPayload
extends TopicSelectionV1bN7ToN8HandoffPayload {
  n7_handoff_hash: string;
}

export interface TopicSelectionV1bN9HarnessFrozenInputPayload
extends TopicSelectionV1bN8ToN9HandoffPayload {
  n8_handoff_hash: string;
}

export interface TopicSelectionV1bN10HarnessFrozenInputPayload
extends TopicSelectionV1bN9ToN10HandoffPayload {
  n9_handoff_hash: string;
}

export interface TopicSelectionV1bN11HarnessFrozenInputPayload
extends TopicSelectionV1bN10ToN11HandoffPayload {
  n10_handoff_hash: string;
}

export interface TopicSelectionV1bCandidateGroupingSupportPayload {
  selected_candidate_ref: TopicSelectionFunctionalRef;
  selected_candidate_hash: string;
  priority_order: TopicSelectionFunctionalRef[];
  duplicate_or_overlap_groups: Array<{
    group_key: string;
    candidate_refs: TopicSelectionFunctionalRef[];
    canonical_candidate_ref: TopicSelectionFunctionalRef;
    rationale: string;
  }>;
  candidate_relationships: Record<string, unknown>;
  grouping_summary: string;
}

export interface TopicSelectionV1bN8DebateAdmissionReviewSupportPayload {
  debate_level: 'compact_assessment_debate' | 'provider_diverse_deep_debate';
  recommended_profile_id: string;
  high_value_signal_codes: string[];
  risk_signal_codes: string[];
  rationale: string;
}

export type TopicSelectionV1bN8DebateLevel =
  TopicSelectionV1bN8DebateAdmissionReviewSupportPayload['debate_level'];

export const TOPIC_SELECTION_V1B_N8_BOUNDED_DEBATE_ROLE_OUTPUT_SCHEMA_VERSION =
  'TopicSelectionV1bN8BoundedDebateRoleOutput@v1' as const;

/**
 * T-123 Phase 3 — one bounded-debate role turn for N8 (support_only lineage).
 * assessor_draft / assessor_repair / synthesizer_final carry the working assessment in
 * `assessment_draft` (TopicValueAssessmentDraft@v1 shape — validated by the existing
 * draft gate when the synthesizer's final is recorded into n8_value_assessment_draft);
 * value_critic carries `critic_findings`; repair additionally answers via `repair_actions`.
 */
export interface TopicSelectionV1bN8BoundedDebateRolePayload {
  schema_version: typeof TOPIC_SELECTION_V1B_N8_BOUNDED_DEBATE_ROLE_OUTPUT_SCHEMA_VERSION;
  role_slot: TopicSelectionV1bN8BoundedDebateRoleSlotId;
  assessment_draft?: Record<string, unknown> | null;
  critic_findings?: Array<{
    finding_code: string;
    severity: 'note' | 'material' | 'blocking';
    dimension_key?: string | null;
    statement: string;
  }> | null;
  repair_actions?: Array<{
    finding_code: string;
    action: string;
    resolved: boolean;
  }> | null;
  debate_summary?: string | null;
}

export const TOPIC_SELECTION_V1B_N6_DIVERGENT_DEBATE_ROLE_OUTPUT_SCHEMA_VERSION =
  'TopicSelectionV1bN6DivergentDebateRoleOutput@v1' as const;

/**
 * T-127 W-07 — one divergent-debate role turn for N6 (topic-question candidate generation). A single
 * payload discriminated by `role_slot` (mirrors the N8 RolePayload shape):
 *  - explorer fills `candidate_seeds`: multiple non-overlapping topic-question framings that widen the
 *    set so the arbiter can assemble an admissible 1..5-candidate draft;
 *  - critic fills `critic_findings`: weak-set / duplicate-or-overlapping challenges + objections; the
 *    `finding_code` reuses the existing N6 escalation trigger codes
 *    (weak_topic_question_candidate_set / duplicate_or_overlapping_candidates) plus free-form codes;
 *  - arbiter (terminal singleton) fills `synthesized_candidate_set` with a FULL
 *    TopicSelectionV1bTopicQuestionCandidateSetDraftPayload — the EXISTING N6 candidate-set gate
 *    (isN6DraftPayload / validateAndBuildN6Candidates) consumes it verbatim, so there is NO new gate.
 *    (The N6 debate runtime unwraps this to a BARE draft before recording the gate artifact — the
 *    wrapper's extra keys would fail isN6DraftPayload's hasOnlyKeys check.)
 */
export interface TopicSelectionV1bN6DivergentDebateRolePayload {
  schema_version: typeof TOPIC_SELECTION_V1B_N6_DIVERGENT_DEBATE_ROLE_OUTPUT_SCHEMA_VERSION;
  role_slot: TopicSelectionV1bN6DivergentDebateRoleSlotId;
  candidate_seeds?: Array<{
    seed_id: string;
    candidate_key_hint?: string | null;
    question_framing: string;
    evidence_refs: TopicSelectionFunctionalRef[];
  }> | null;
  critic_findings?: Array<{
    finding_code: string;
    severity: 'note' | 'material' | 'blocking';
    candidate_key_hint?: string | null;
    statement: string;
  }> | null;
  synthesized_candidate_set?: TopicSelectionV1bTopicQuestionCandidateSetDraftPayload | null;
  debate_summary?: string | null;
}

/**
 * N6 divergent-debate ADMISSION blocker codes — they gate the debate runtime/admission, NOT the N6
 * candidate-set gate, so they are intentionally ABSENT from the N6 node-policy blocker_codes (which
 * stays weak_topic_question_candidate_set / duplicate_or_overlapping_candidates / missing_value_axis).
 * Mirrors the v1c-N2 debate-admission blocker pattern.
 */
export type TopicSelectionV1bN6DivergentDebateBlockerCode =
  // structural (fan-out topology)
  | 'N6_DIVERGENT_DEBATE_REQUIRED_ROLE_MISSING'
  | 'N6_DIVERGENT_DEBATE_ROLE_ORDER_INVALID'
  | 'N6_DIVERGENT_DEBATE_STAGE_ARITY_DRIFT'
  | 'N6_DIVERGENT_DEBATE_TERMINAL_NOT_SINGLETON'
  | 'N6_DIVERGENT_DEBATE_ROLE_OUTPUT_MISMATCH'
  | 'N6_DIVERGENT_DEBATE_ROLE_OUTPUT_SCHEMA_VERSION'
  | 'N6_DIVERGENT_DEBATE_FORBIDDEN_AUTHORITY_FIELD'
  // per-instance runtime-identity drift (replay integrity — mirrors the N8 bounded-debate set)
  | 'N6_DIVERGENT_DEBATE_ARTIFACT_PROFILE_DRIFT'
  | 'N6_DIVERGENT_DEBATE_ARTIFACT_PROMPT_DRIFT'
  | 'N6_DIVERGENT_DEBATE_ARTIFACT_RUNTIME_CONTEXT_DRIFT'
  | 'N6_DIVERGENT_DEBATE_SOURCE_HASH_DRIFT'
  | 'N6_DIVERGENT_DEBATE_PRIOR_ROLE_HASH_DRIFT'
  | 'N6_DIVERGENT_DEBATE_ARTIFACT_PAYLOAD_HASH_MISMATCH'
  // arbiter output + whole-loop transcript
  | 'N6_DIVERGENT_DEBATE_ARBITER_OUTPUT_NOT_N6_DRAFT'
  | 'N6_DIVERGENT_DEBATE_TRANSCRIPT_DRIFT';

export interface TopicSelectionV1bN8FailedTrialSynthesisSupportPayload {
  exhausted_candidate_refs: TopicSelectionFunctionalRef[];
  failure_reason_codes: string[];
  synthesis_summary: string;
  n6_regeneration_hints: string[];
  affected_refs: TopicSelectionFunctionalRef[];
}

export interface TopicSelectionV1bWorkflowHarnessGatePolicy {
  gate_id: string;
  node_id: TopicSelectionV1bWorkflowHarnessNodeId;
  authority_kind: string;
  input_contract: string;
  allowed_gate_statuses: TopicSelectionV1bWorkflowHarnessGateStatus[];
  blocker_codes: string[];
  warning_codes: string[];
  loopback_target_codes: string[];
}

export interface TopicSelectionV1bWorkflowHarnessGateOutcome {
  gate_id: string;
  node_id: TopicSelectionV1bWorkflowHarnessNodeId;
  gate_status: TopicSelectionV1bWorkflowHarnessGateStatus;
  authority_write_allowed: boolean;
  route_decision: TopicSelectionV1bWorkflowHarnessRouteDecision;
  blocker_codes: string[];
  warning_codes: string[];
  loopback_target_code?: string | null;
  gate_result_hash: string;
}

export interface TopicSelectionV1bWorkflowHarnessRoutePolicyDecision {
  route_id: string;
  from_node_id: TopicSelectionV1bWorkflowHarnessNodeId;
  route_signal: string;
  route_decision: TopicSelectionV1bWorkflowHarnessRouteDecision;
  next_node_id: TopicSelectionV1bWorkflowHarnessNodeId | 'v1c.entry' | null;
  handoff_kind: TopicSelectionV1bWorkflowHarnessHandoffKind | null;
  route_hash: string;
}

export interface TopicSelectionV1bWorkflowHarnessFrozenInput {
  input_contract: string;
  snapshot_kind: string;
  source_refs: TopicSelectionFunctionalRef[];
  payload: Record<string, unknown>;
  frozen_input_hash?: string | null;
}

export interface TopicSelectionV1bWorkflowHarnessRunRequest {
  schema_version: typeof TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_RUN_REQUEST_SCHEMA_VERSION;
  workspace_id?: string | null;
  title_card_id?: string | null;
  workflow_run_id: string;
  node_attempt_id: string;
  node_id: TopicSelectionV1bWorkflowHarnessNodeId;
  attempt_family_key?: string | null;
  policy_version: string;
  frozen_input: TopicSelectionV1bWorkflowHarnessFrozenInput;
  run_mode?: TopicSelectionAgentRunMode | null;
  profile_id?: TopicSelectionV1bWorkflowHarnessProfileId | null;
  execution_spec?: TopicSelectionAgentExecutionSpec | null;
  semantic_artifacts?: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef[] | null;
  actor?: {
    actor_type: TopicSelectionActorType;
    actor_id?: string | null;
  } | null;
  created_by?: TopicSelectionActorType;
}

export interface TopicSelectionV1bWorkflowHarnessReplayIdentity {
  workflow_run_id: string;
  node_attempt_id: string;
  attempt_family_key: string;
  node_replay_key: string;
}

export interface TopicSelectionV1bWorkflowHarnessHashes {
  frozen_input_hash: string;
  execution_spec_hash: string;
  semantic_artifact_hash: string | null;
  runtime_admission_hash: string | null;
  gate_result_hash: string;
  authority_hash: string | null;
  handoff_hash: string | null;
  route_hash: string;
}

export interface TopicSelectionV1bWorkflowHarnessReplayProvenance {
  replayed: boolean;
  source_workflow_run_id?: string | null;
  source_node_attempt_id?: string | null;
  source_trace_artifact_ref?: TopicSelectionFunctionalRef | null;
  node_replay_key?: string | null;
}

export interface TopicSelectionV1bWorkflowHarnessRunResult {
  schema_version: typeof TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_RUN_RESULT_SCHEMA_VERSION;
  node_id: TopicSelectionV1bWorkflowHarnessNodeId;
  workflow_run_id: string;
  node_attempt_id: string;
  gate_status: TopicSelectionV1bWorkflowHarnessGateStatus;
  failure_class: TopicSelectionV1bWorkflowHarnessFailureClass | null;
  route_decision: TopicSelectionV1bWorkflowHarnessRouteDecision;
  replay_identity: TopicSelectionV1bWorkflowHarnessReplayIdentity;
  hashes: TopicSelectionV1bWorkflowHarnessHashes;
  blockers: TopicSelectionGateIssue[];
  warnings: TopicSelectionGateIssue[];
  authority_ref: TopicSelectionFunctionalRef | null;
  handoff_ref: TopicSelectionFunctionalRef | null;
  gate_result_ref: TopicSelectionFunctionalRef | null;
  transition_attempt_ref: TopicSelectionFunctionalRef | null;
  trace_snapshot_ref: TopicSelectionFunctionalRef | null;
  harness_trace_artifact_ref: TopicSelectionFunctionalRef | null;
  replay_provenance: TopicSelectionV1bWorkflowHarnessReplayProvenance | null;
  error_code: string | null;
  error_message: string | null;
}

export interface TopicSelectionV1bWorkflowHarnessTracePayload {
  payload_schema: typeof TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_TRACE_PAYLOAD_SCHEMA_VERSION;
  node_id: TopicSelectionV1bWorkflowHarnessNodeId;
  workflow_run_id: string;
  node_attempt_id: string;
  node_replay_key: string;
  input_hash: string;
  request: TopicSelectionV1bWorkflowHarnessRunRequest;
  result: TopicSelectionV1bWorkflowHarnessRunResult;
  created_at: string;
}

const stringId = { type: 'string', minLength: 1 } as const;
const nullableStringId = { anyOf: [stringId, { type: 'null' }] } as const;
const hashString = { type: 'string', pattern: '^[a-f0-9]{64}$' } as const;
const nullableHashString = { anyOf: [hashString, { type: 'null' }] } as const;
const objectPayload = { type: 'object', additionalProperties: true } as const;
const hashMap = {
  type: 'object',
  additionalProperties: hashString,
} as const;
const functionalRefArray = { type: 'array', items: topicSelectionFunctionalRefSchema } as const;
const nullableFunctionalRef = { anyOf: [topicSelectionFunctionalRefSchema, { type: 'null' }] } as const;
const strictFunctionalRefSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['ref_type', 'ref_id'],
  properties: {
    ref_type: stringId,
    ref_id: stringId,
    version_id: nullableStringId,
    title_card_id: nullableStringId,
  },
} as const;
const strictArtifactFunctionalRefSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['ref_type', 'ref_id'],
  properties: {
    ref_type: { const: 'artifact_ref' },
    ref_id: stringId,
    version_id: nullableStringId,
    title_card_id: nullableStringId,
  },
} as const;
const strictFunctionalRefArray = { type: 'array', items: strictFunctionalRefSchema } as const;
const nullableStrictFunctionalRef = { anyOf: [strictFunctionalRefSchema, { type: 'null' }] } as const;
const gateIssueArray = { type: 'array', items: topicSelectionGateIssueSchema } as const;
const stringArray = { type: 'array', items: stringId } as const;
const stringValue = { type: 'string' } as const;
const numberValue = { type: 'number' } as const;
const nullableNumber = { anyOf: [numberValue, { type: 'null' }] } as const;
const semanticExecutionMode = { enum: [...TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_SEMANTIC_EXECUTION_MODES] } as const;
const semanticArtifactExecutionMode = {
  enum: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_SEMANTIC_EXECUTION_MODES
    .filter((mode): mode is TopicSelectionV1bWorkflowHarnessSemanticArtifactExecutionMode => mode !== 'none'),
} as const;
const semanticAllowedEffect = { enum: [...TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_SEMANTIC_ALLOWED_EFFECTS] } as const;
const semanticFallbackPolicy = { enum: [...TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_SEMANTIC_FALLBACK_POLICIES] } as const;
const semanticSlotId = { enum: [...TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_SEMANTIC_SLOT_IDS] } as const;
const agentRunMode = { enum: [...TOPIC_SELECTION_AGENT_RUN_MODES] } as const;
const nullableAgentRunMode = { anyOf: [agentRunMode, { type: 'null' }] } as const;
const v1bProfileId = { enum: Object.values(TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS) } as const;
const nullableV1bProfileId = { anyOf: [v1bProfileId, { type: 'null' }] } as const;
const handoffKind = { enum: [...TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_HANDOFF_KINDS] } as const;
const n6LoopbackTargetCode = { enum: [...TOPIC_SELECTION_V1B_N6_LOOPBACK_TARGET_CODES] } as const;
const replayHashComponent = { enum: [...TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_REPLAY_HASH_COMPONENTS] } as const;
const n2AuthorityInputProvider = { enum: [...TOPIC_SELECTION_V1B_N2_AUTHORITY_INPUT_PROVIDERS] } as const;
const n5AuthorityInputProvider = { enum: [...TOPIC_SELECTION_V1B_N5_AUTHORITY_INPUT_PROVIDERS] } as const;
const sliceSelectionDecision = { enum: [...TOPIC_SELECTION_SLICE_SELECTION_DECISIONS] } as const;
const nullableSliceLoopbackTarget = {
  anyOf: [{ enum: [...TOPIC_SELECTION_SLICE_LOOPBACK_TARGETS] }, { type: 'null' }],
} as const;

export const topicSelectionV1bN1HarnessFrozenInputPayloadSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['v1b_input_bundle_id', 'v1a_bundle_ref', 'v1a_bundle_hash', 'source_refs_hash'],
  properties: {
    v1b_input_bundle_id: stringId,
    v1a_bundle_ref: strictFunctionalRefSchema,
    v1a_bundle_hash: hashString,
    source_refs_hash: hashString,
  },
} as const;

export const topicSelectionV1bAcceptedConstraintProfilePayloadSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'target_community',
    'target_venue_class',
    'intended_contribution_style',
    'method_constraints',
    'resource_constraints',
    'available_assets',
    'feasibility_budget',
    'non_goals',
    'claim_ceiling',
    'human_constraint_notes',
    'constraint_payload',
  ],
  properties: {
    target_community: stringValue,
    target_venue_class: nullableStringId,
    intended_contribution_style: nullableStringId,
    method_constraints: stringArray,
    resource_constraints: stringArray,
    available_assets: stringArray,
    feasibility_budget: objectPayload,
    non_goals: stringArray,
    claim_ceiling: stringValue,
    human_constraint_notes: nullableStringId,
    constraint_payload: objectPayload,
  },
} as const;

export const topicSelectionV1bN2HarnessFrozenInputPayloadSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'intake_snapshot_ref',
    'intake_snapshot_hash',
    'v1a_bundle_ref',
    'v1a_bundle_hash',
    'authority_input_provider',
    'accepted_constraint_profile_payload',
    'accepted_constraint_profile_payload_hash',
    'delegation_artifact_hash',
  ],
  properties: {
    intake_snapshot_ref: strictFunctionalRefSchema,
    intake_snapshot_hash: hashString,
    v1a_bundle_ref: strictFunctionalRefSchema,
    v1a_bundle_hash: hashString,
    authority_input_provider: n2AuthorityInputProvider,
    accepted_constraint_profile_payload: topicSelectionV1bAcceptedConstraintProfilePayloadSchema,
    accepted_constraint_profile_payload_hash: hashString,
    delegation_artifact_hash: nullableHashString,
    previous_profile_ref: nullableStrictFunctionalRef,
    previous_profile_hash: nullableHashString,
  },
  allOf: [
    {
      if: {
        required: ['authority_input_provider'],
        properties: {
          authority_input_provider: { const: 'codex_delegated' },
        },
      },
      then: {
        properties: {
          delegation_artifact_hash: hashString,
        },
      },
    },
    {
      if: {
        required: ['authority_input_provider'],
        properties: {
          authority_input_provider: { enum: ['human_delegated', 'fixture'] },
        },
      },
      then: {
        properties: {
          delegation_artifact_hash: { type: 'null' },
        },
      },
    },
  ],
} as const;

export const topicSelectionV1bN3HarnessFrozenInputPayloadSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'intake_snapshot_ref',
    'intake_snapshot_hash',
    'constraint_profile_ref',
    'constraint_profile_hash',
    'n2_handoff_hash',
  ],
  properties: {
    intake_snapshot_ref: strictFunctionalRefSchema,
    intake_snapshot_hash: hashString,
    constraint_profile_ref: strictFunctionalRefSchema,
    constraint_profile_hash: hashString,
    n2_handoff_hash: hashString,
  },
} as const;

export const topicSelectionV1bResearchSliceOptionSetDraftPayloadSchema =
  topicSelectionResearchSliceOptionSetLlmOutputSchema;

export const topicSelectionV1bN4HarnessFrozenInputPayloadSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'intake_snapshot_ref',
    'intake_snapshot_hash',
    'constraint_profile_ref',
    'constraint_profile_hash',
    'intake_readiness_ref',
    'intake_readiness_hash',
    'n2_handoff_hash',
    'n3_handoff_hash',
  ],
  properties: {
    intake_snapshot_ref: strictFunctionalRefSchema,
    intake_snapshot_hash: hashString,
    constraint_profile_ref: strictFunctionalRefSchema,
    constraint_profile_hash: hashString,
    intake_readiness_ref: strictFunctionalRefSchema,
    intake_readiness_hash: hashString,
    n2_handoff_hash: hashString,
    n3_handoff_hash: hashString,
  },
} as const;

const rejectedSliceOptionReasonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['option_id', 'reason', 'reason_code'],
  properties: {
    option_id: stringId,
    reason: stringValue,
    reason_code: {
      enum: [
        'hard_blocker',
        'weaker_fit',
        'higher_risk',
        'duplicate',
        'out_of_scope',
        'insufficient_evidence',
        'resource_blocked',
        'baseline_blocked',
        'other',
      ],
    },
  },
} as const;

export const topicSelectionV1bAcceptedSliceSelectionPayloadSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'decision',
    'selected_option_ref',
    'selected_option_hash',
    'selection_rationale',
    'decision_basis',
    'rejected_option_reasons',
    'required_actions',
    'accepted_risk_refs',
    'confidence',
    'requires_human_review',
    'human_review_reason',
    'loopback_target',
    'loopback_target_ref',
    'loopback_reason_code',
  ],
  properties: {
    decision: sliceSelectionDecision,
    selected_option_ref: nullableStrictFunctionalRef,
    selected_option_hash: nullableHashString,
    selection_rationale: stringValue,
    decision_basis: objectPayload,
    rejected_option_reasons: {
      type: 'array',
      items: rejectedSliceOptionReasonSchema,
    },
    required_actions: stringArray,
    accepted_risk_refs: strictFunctionalRefArray,
    confidence: nullableNumber,
    requires_human_review: { type: 'boolean' },
    human_review_reason: nullableStringId,
    loopback_target: nullableSliceLoopbackTarget,
    loopback_target_ref: nullableStrictFunctionalRef,
    loopback_reason_code: nullableStringId,
  },
  allOf: [
    {
      if: {
        required: ['decision'],
        properties: {
          decision: { const: 'select' },
        },
      },
      then: {
        properties: {
          selected_option_ref: strictFunctionalRefSchema,
          selected_option_hash: hashString,
          loopback_target: { type: 'null' },
          loopback_target_ref: { type: 'null' },
          loopback_reason_code: { type: 'null' },
        },
      },
    },
    {
      if: {
        required: ['decision'],
        properties: {
          decision: { enum: ['request_more_options', 'park', 'reject'] },
        },
      },
      then: {
        properties: {
          selected_option_ref: { type: 'null' },
          selected_option_hash: { type: 'null' },
        },
      },
    },
    {
      if: {
        required: ['decision'],
        properties: {
          decision: { const: 'request_more_options' },
        },
      },
      then: {
        properties: {
          loopback_target: { enum: [...TOPIC_SELECTION_SLICE_LOOPBACK_TARGETS] },
          loopback_reason_code: stringValue,
        },
      },
    },
  ],
} as const;

export const topicSelectionV1bN5HarnessFrozenInputPayloadSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'research_slice_option_set_ref',
    'research_slice_option_set_hash',
    'n4_handoff_hash',
    'authority_input_provider',
    'accepted_selection_payload',
    'accepted_selection_payload_hash',
    'delegation_artifact_hash',
  ],
  properties: {
    research_slice_option_set_ref: strictFunctionalRefSchema,
    research_slice_option_set_hash: hashString,
    n4_handoff_hash: hashString,
    authority_input_provider: n5AuthorityInputProvider,
    accepted_selection_payload: topicSelectionV1bAcceptedSliceSelectionPayloadSchema,
    accepted_selection_payload_hash: hashString,
    delegation_artifact_hash: nullableHashString,
  },
  allOf: [
    {
      if: {
        required: ['authority_input_provider'],
        properties: {
          authority_input_provider: { const: 'codex_delegated' },
        },
      },
      then: {
        properties: {
          delegation_artifact_hash: hashString,
        },
      },
    },
    {
      if: {
        required: ['authority_input_provider'],
        properties: {
          authority_input_provider: { enum: ['human_delegated', 'fixture'] },
        },
      },
      then: {
        properties: {
          delegation_artifact_hash: { type: 'null' },
        },
      },
    },
  ],
} as const;

export const topicSelectionV1bTopicQuestionCandidateSetDraftPayloadSchema =
  topicSelectionFormTopicQuestionLlmOutputSchema;

export const topicSelectionV1bN6HarnessFrozenInputPayloadSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'n5_handoff_hash',
    'constraint_profile_ref',
    'constraint_profile_hash',
    'intake_readiness_ref',
    'intake_readiness_hash',
    'research_slice_ref',
    'research_slice_hash',
    'research_slice_selection_ref',
    'research_slice_selection_hash',
    'research_slice_option_set_ref',
    'research_slice_option_set_hash',
    'selected_slice_option_ref',
    'selected_slice_option_hash',
  ],
  properties: {
    n5_handoff_hash: hashString,
    constraint_profile_ref: strictFunctionalRefSchema,
    constraint_profile_hash: hashString,
    intake_readiness_ref: strictFunctionalRefSchema,
    intake_readiness_hash: hashString,
    research_slice_ref: strictFunctionalRefSchema,
    research_slice_hash: hashString,
    research_slice_selection_ref: strictFunctionalRefSchema,
    research_slice_selection_hash: hashString,
    research_slice_option_set_ref: strictFunctionalRefSchema,
    research_slice_option_set_hash: hashString,
    selected_slice_option_ref: strictFunctionalRefSchema,
    selected_slice_option_hash: hashString,
  },
} as const;

export const topicSelectionV1bN6LoopbackTriageSupportPayloadSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'loopback_target_code',
    'failure_scope',
    'dominant_reason_codes',
    'affected_refs',
    'regeneration_hints',
    'debate_escalation',
    'upstream_rollback',
    'rationale',
  ],
  properties: {
    loopback_target_code: n6LoopbackTargetCode,
    failure_scope: { enum: ['candidate_level', 'question_frame_level', 'slice_level', 'upstream_context_level'] },
    dominant_reason_codes: {
      type: 'array',
      items: stringId,
      minItems: 1,
    },
    affected_refs: {
      type: 'array',
      items: strictFunctionalRefSchema,
      minItems: 1,
    },
    regeneration_hints: stringArray,
    debate_escalation: {
      anyOf: [
        {
          type: 'object',
          additionalProperties: false,
          required: ['debate_level', 'recommended_profile_id', 'sticky', 'rationale'],
          properties: {
            debate_level: { enum: ['mixed_cost_control', 'provider_diverse_deep'] },
            recommended_profile_id: stringId,
            sticky: { type: 'boolean' },
            rationale: stringId,
          },
        },
        { type: 'null' },
      ],
    },
    upstream_rollback: {
      anyOf: [
        {
          type: 'object',
          additionalProperties: false,
          required: ['target_node_id', 'repair_action', 'rationale'],
          properties: {
            target_node_id: { const: 'topic-selection.v1b.select-research-slice.v1' },
            repair_action: { const: 'select_different_slice' },
            rationale: stringId,
          },
        },
        { type: 'null' },
      ],
    },
    rationale: stringId,
  },
  allOf: [
    {
      if: {
        required: ['loopback_target_code'],
        properties: {
          loopback_target_code: { const: 'n6_debate_escalation' },
        },
      },
      then: {
        properties: {
          failure_scope: { enum: ['candidate_level', 'question_frame_level'] },
          debate_escalation: {
            type: 'object',
            additionalProperties: false,
            required: ['debate_level', 'recommended_profile_id', 'sticky', 'rationale'],
            properties: {
              debate_level: { enum: ['mixed_cost_control', 'provider_diverse_deep'] },
              recommended_profile_id: stringId,
              sticky: { type: 'boolean' },
              rationale: stringId,
            },
          },
          upstream_rollback: { type: 'null' },
        },
      },
    },
    {
      if: {
        required: ['loopback_target_code'],
        properties: {
          loopback_target_code: { const: 'n6_loopback_to_n5_select_different_slice' },
        },
      },
      then: {
        properties: {
          failure_scope: { enum: ['slice_level', 'upstream_context_level'] },
          debate_escalation: { type: 'null' },
          upstream_rollback: {
            type: 'object',
            additionalProperties: false,
            required: ['target_node_id', 'repair_action', 'rationale'],
            properties: {
              target_node_id: { const: 'topic-selection.v1b.select-research-slice.v1' },
              repair_action: { const: 'select_different_slice' },
              rationale: stringId,
            },
          },
        },
      },
    },
    {
      if: {
        required: ['loopback_target_code'],
        properties: {
          loopback_target_code: { const: 'n6_regenerate_candidates' },
        },
      },
      then: {
        properties: {
          failure_scope: { enum: ['candidate_level', 'question_frame_level'] },
          debate_escalation: { type: 'null' },
          upstream_rollback: { type: 'null' },
        },
      },
    },
  ],
} as const;

const n6ToN7LineagePayloadProperties = {
  topic_question_candidate_set_ref: strictFunctionalRefSchema,
  topic_question_candidate_set_hash: hashString,
  admissible_candidate_refs: {
    type: 'array',
    items: strictFunctionalRefSchema,
    minItems: 1,
  },
  admissible_candidate_hashes: {
    type: 'array',
    items: hashString,
    minItems: 1,
  },
  selected_research_slice_ref: strictFunctionalRefSchema,
  selected_research_slice_hash: hashString,
  generation_artifact_ref: strictFunctionalRefSchema,
  generation_artifact_hash: hashString,
  candidate_gate_hash: hashString,
  candidate_grouping_ref: nullableStrictFunctionalRef,
  candidate_grouping_hash: nullableHashString,
} as const;

const n6ToN7LineagePayloadRequired = [
  'topic_question_candidate_set_ref',
  'topic_question_candidate_set_hash',
  'admissible_candidate_refs',
  'admissible_candidate_hashes',
  'selected_research_slice_ref',
  'selected_research_slice_hash',
  'generation_artifact_ref',
  'generation_artifact_hash',
  'candidate_gate_hash',
  'candidate_grouping_ref',
  'candidate_grouping_hash',
] as const;

export const topicSelectionV1bN8ToN7FeedbackPayloadSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'feedback_class',
    'failure_reason_code',
    'feedback_summary',
    'affected_refs',
    'previous_n7_handoff_ref',
    'previous_n7_handoff_hash',
    'previous_trial_ledger_ref',
    'previous_trial_ledger_hash',
    'failed_topic_question_contract_ref',
    'failed_topic_question_contract_hash',
    'failed_candidate_ref',
    'failed_candidate_hash',
    'topic_question_candidate_set_ref',
    'topic_question_candidate_set_hash',
    'n8_gate_result_hash',
    'value_assessment_ref',
    'value_assessment_hash',
  ],
  properties: {
    feedback_class: { enum: ['semantic_candidate_failure', 'gate_rejected', 'technical_failure'] },
    failure_reason_code: stringId,
    feedback_summary: stringId,
    affected_refs: {
      type: 'array',
      items: strictFunctionalRefSchema,
      minItems: 1,
    },
    previous_n7_handoff_ref: strictFunctionalRefSchema,
    previous_n7_handoff_hash: hashString,
    previous_trial_ledger_ref: strictFunctionalRefSchema,
    previous_trial_ledger_hash: hashString,
    failed_topic_question_contract_ref: strictFunctionalRefSchema,
    failed_topic_question_contract_hash: hashString,
    failed_candidate_ref: strictFunctionalRefSchema,
    failed_candidate_hash: hashString,
    topic_question_candidate_set_ref: strictFunctionalRefSchema,
    topic_question_candidate_set_hash: hashString,
    n8_gate_result_hash: hashString,
    value_assessment_ref: nullableStrictFunctionalRef,
    value_assessment_hash: nullableHashString,
  },
  allOf: [
    {
      if: {
        required: ['value_assessment_ref'],
        properties: {
          value_assessment_ref: { type: 'null' },
        },
      },
      then: {
        properties: {
          value_assessment_hash: { type: 'null' },
        },
      },
    },
    {
      if: {
        required: ['value_assessment_ref'],
        properties: {
          value_assessment_ref: strictFunctionalRefSchema,
        },
      },
      then: {
        properties: {
          value_assessment_hash: hashString,
        },
      },
    },
  ],
} as const;

export const topicSelectionV1bN7HarnessFrozenInputPayloadSchema = {
  anyOf: [
    {
      type: 'object',
      additionalProperties: false,
      required: [
        'input_mode',
        'n6_handoff_hash',
        ...n6ToN7LineagePayloadRequired,
      ],
      properties: {
        input_mode: { const: 'initial_from_n6' },
        n6_handoff_hash: hashString,
        ...n6ToN7LineagePayloadProperties,
      },
    },
    {
      type: 'object',
      additionalProperties: false,
      required: [
        'input_mode',
        'n6_handoff_hash',
        ...n6ToN7LineagePayloadRequired,
        'n8_feedback_ref',
        'n8_feedback_hash',
        'n8_feedback_payload_hash',
      ],
      properties: {
        input_mode: { const: 'feedback_from_n8' },
        n6_handoff_hash: hashString,
        ...n6ToN7LineagePayloadProperties,
        n8_feedback_ref: strictFunctionalRefSchema,
        n8_feedback_hash: hashString,
        n8_feedback_payload_hash: hashString,
      },
    },
  ],
} as const;

export const topicSelectionV1bCandidateGroupingSupportPayloadSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'selected_candidate_ref',
    'selected_candidate_hash',
    'priority_order',
    'duplicate_or_overlap_groups',
    'candidate_relationships',
    'grouping_summary',
  ],
  properties: {
    selected_candidate_ref: strictFunctionalRefSchema,
    selected_candidate_hash: hashString,
    priority_order: {
      type: 'array',
      items: strictFunctionalRefSchema,
      minItems: 1,
    },
    duplicate_or_overlap_groups: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['group_key', 'candidate_refs', 'canonical_candidate_ref', 'rationale'],
        properties: {
          group_key: stringId,
          candidate_refs: {
            type: 'array',
            items: strictFunctionalRefSchema,
            minItems: 1,
          },
          canonical_candidate_ref: strictFunctionalRefSchema,
          rationale: stringId,
        },
      },
    },
    candidate_relationships: objectPayload,
    grouping_summary: stringId,
  },
} as const;

export const topicSelectionV1bN8DebateAdmissionReviewSupportPayloadSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'debate_level',
    'recommended_profile_id',
    'high_value_signal_codes',
    'risk_signal_codes',
    'rationale',
  ],
  properties: {
    debate_level: { enum: ['compact_assessment_debate', 'provider_diverse_deep_debate'] },
    recommended_profile_id: stringId,
    high_value_signal_codes: stringArray,
    risk_signal_codes: stringArray,
    rationale: stringId,
  },
} as const;

export const topicSelectionV1bN8FailedTrialSynthesisSupportPayloadSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'exhausted_candidate_refs',
    'failure_reason_codes',
    'synthesis_summary',
    'n6_regeneration_hints',
    'affected_refs',
  ],
  properties: {
    exhausted_candidate_refs: {
      type: 'array',
      items: strictFunctionalRefSchema,
      minItems: 1,
    },
    failure_reason_codes: stringArray,
    synthesis_summary: stringId,
    n6_regeneration_hints: stringArray,
    affected_refs: {
      type: 'array',
      items: strictFunctionalRefSchema,
      minItems: 1,
    },
  },
} as const;

export const topicSelectionV1bTopicValueAssessmentDraftPayloadSchema =
  topicSelectionAssessTopicValueLlmOutputSchema;

export const topicSelectionV1bN8HarnessFrozenInputPayloadSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'n7_handoff_hash',
    'topic_question_ref',
    'topic_question_hash',
    'topic_question_contract_ref',
    'topic_question_contract_hash',
    'answerability_plan_ref',
    'answerability_plan_hash',
    'trial_ledger_ref',
    'trial_ledger_hash',
    'topic_question_candidate_set_ref',
    'topic_question_candidate_set_hash',
    'active_candidate_ref',
    'active_candidate_hash',
    'selected_research_slice_ref',
    'selected_research_slice_hash',
    'n8_debate_admission_ref',
    'n8_debate_admission_hash',
    'candidate_grouping_ref',
    'candidate_grouping_hash',
  ],
  properties: {
    n7_handoff_hash: hashString,
    topic_question_ref: strictFunctionalRefSchema,
    topic_question_hash: hashString,
    topic_question_contract_ref: strictFunctionalRefSchema,
    topic_question_contract_hash: hashString,
    answerability_plan_ref: strictFunctionalRefSchema,
    answerability_plan_hash: hashString,
    trial_ledger_ref: strictFunctionalRefSchema,
    trial_ledger_hash: hashString,
    topic_question_candidate_set_ref: strictFunctionalRefSchema,
    topic_question_candidate_set_hash: hashString,
    active_candidate_ref: strictFunctionalRefSchema,
    active_candidate_hash: hashString,
    selected_research_slice_ref: strictFunctionalRefSchema,
    selected_research_slice_hash: hashString,
    n8_debate_admission_ref: strictFunctionalRefSchema,
    n8_debate_admission_hash: hashString,
    candidate_grouping_ref: nullableStrictFunctionalRef,
    candidate_grouping_hash: nullableHashString,
  },
} as const;

export const topicSelectionV1bN9HarnessFrozenInputPayloadSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'n8_handoff_hash',
    'topic_value_assessment_ref',
    'topic_value_assessment_hash',
    'topic_question_contract_ref',
    'topic_question_contract_hash',
    'value_reasoning_memo_ref',
    'value_reasoning_memo_hash',
    'recommended_disposition',
  ],
  properties: {
    n8_handoff_hash: hashString,
    topic_value_assessment_ref: strictFunctionalRefSchema,
    topic_value_assessment_hash: hashString,
    topic_question_contract_ref: strictFunctionalRefSchema,
    topic_question_contract_hash: hashString,
    value_reasoning_memo_ref: strictFunctionalRefSchema,
    value_reasoning_memo_hash: hashString,
    recommended_disposition: {
      enum: [
        'advance_to_package',
        'refine_question',
        'refine_slice',
        'recheck_evidence_or_search',
        'park',
        'drop',
      ],
    },
  },
} as const;

export const topicSelectionV1bN10HarnessFrozenInputPayloadSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'n9_handoff_hash',
    'value_disposition_ref',
    'value_disposition_hash',
    'advance_disposition',
    'topic_value_assessment_ref',
    'topic_value_assessment_hash',
  ],
  properties: {
    n9_handoff_hash: hashString,
    value_disposition_ref: strictFunctionalRefSchema,
    value_disposition_hash: hashString,
    advance_disposition: { const: true },
    topic_value_assessment_ref: strictFunctionalRefSchema,
    topic_value_assessment_hash: hashString,
  },
} as const;

export const topicSelectionV1bN11HarnessFrozenInputPayloadSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'n10_handoff_hash',
    'draft_topic_package_ref',
    'draft_topic_package_hash',
    'value_disposition_ref',
    'value_disposition_hash',
    'v1c_input_bundle_ref',
    'v1c_input_bundle_hash',
  ],
  properties: {
    n10_handoff_hash: hashString,
    draft_topic_package_ref: strictFunctionalRefSchema,
    draft_topic_package_hash: hashString,
    value_disposition_ref: strictFunctionalRefSchema,
    value_disposition_hash: hashString,
    v1c_input_bundle_ref: strictFunctionalRefSchema,
    v1c_input_bundle_hash: hashString,
    promotion_decision: false,
    bridge_creation_request: false,
    paper_project_ref: false,
    paper_implementation_ref: false,
  },
} as const;

export const topicSelectionV1bWorkflowHarnessSemanticSupportSlotSpecSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'slot_id',
    'node_id',
    'allowed_effect',
    'output_contract',
    'target_gate_id',
    'required_for_progress',
    'fallback_policy',
    'allowed_execution_modes',
    'default_profile_id',
    'allowed_profile_ids',
    'allowed_run_modes',
    'slot_policy_version',
  ],
  properties: {
    slot_id: semanticSlotId,
    node_id: { enum: [...TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_NODE_IDS] },
    allowed_effect: semanticAllowedEffect,
    output_contract: stringId,
    target_gate_id: stringId,
    required_for_progress: { type: 'boolean' },
    fallback_policy: semanticFallbackPolicy,
    allowed_execution_modes: {
      type: 'array',
      items: semanticArtifactExecutionMode,
      minItems: 1,
      uniqueItems: true,
    },
    default_profile_id: v1bProfileId,
    allowed_profile_ids: {
      type: 'array',
      items: v1bProfileId,
      minItems: 1,
      uniqueItems: true,
    },
    allowed_run_modes: {
      type: 'array',
      items: agentRunMode,
      minItems: 1,
      uniqueItems: true,
    },
    slot_policy_version: stringId,
  },
} as const;

const semanticArtifactSlotRules = TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_SEMANTIC_SUPPORT_SLOTS.map((slot) => ({
  if: {
    required: ['slot_id'],
    properties: {
      slot_id: { const: slot.slot_id },
    },
  },
  then: {
    properties: {
      node_id: { const: slot.node_id },
      allowed_effect: { const: slot.allowed_effect },
      output_contract: { const: slot.output_contract },
      execution_mode: { enum: [...slot.allowed_execution_modes] },
      profile_id: { enum: [...slot.allowed_profile_ids] },
      run_mode: { enum: [...slot.allowed_run_modes] },
    },
  },
})) as readonly Record<string, unknown>[];

export const topicSelectionV1bWorkflowHarnessSemanticSupportArtifactRefSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'slot_id',
    'node_id',
    'execution_mode',
    'run_mode',
    'allowed_effect',
    'support_artifact_ref',
    'support_artifact_hash',
    'normalized_output_ref',
    'normalized_output_hash',
    'output_contract',
    'profile_id',
    'model_option_id',
    'input_hash',
    'prompt_packet_hash',
    'structured_output_hash',
    'adapter_policy_version',
    'slot_spec_hash',
    'provenance_ref',
    'runtime_provenance_class',
    'context_policy_profile_id',
    'context_policy_profile_version',
    'context_policy_profile_hash',
    'prompt_variant_key',
    'runtime_invocation_context_hash',
    'redaction_policy',
    'source_hashes',
    'runtime_audit_ref',
    'runtime_audit_hash',
    'compression_report_ref',
    'compression_report_hash',
    'compressed_context_hash',
  ],
  properties: {
    slot_id: semanticSlotId,
    node_id: { enum: [...TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_NODE_IDS] },
    execution_mode: semanticArtifactExecutionMode,
    run_mode: agentRunMode,
    allowed_effect: semanticAllowedEffect,
    support_artifact_ref: strictFunctionalRefSchema,
    support_artifact_hash: hashString,
    normalized_output_ref: nullableStrictFunctionalRef,
    normalized_output_hash: hashString,
    output_contract: stringId,
    profile_id: v1bProfileId,
    model_option_id: nullableStringId,
    input_hash: hashString,
    prompt_packet_hash: hashString,
    structured_output_hash: hashString,
    adapter_policy_version: stringId,
    slot_spec_hash: hashString,
    provenance_ref: strictFunctionalRefSchema,
    runtime_provenance_class: {
      enum: [...TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_RUNTIME_PROVENANCE_CLASSES],
    },
    context_policy_profile_id: nullableStringId,
    context_policy_profile_version: nullableStringId,
    context_policy_profile_hash: nullableHashString,
    prompt_variant_key: nullableStringId,
    runtime_invocation_context_hash: nullableHashString,
    redaction_policy: nullableStringId,
    source_hashes: hashMap,
    runtime_audit_ref: nullableStrictFunctionalRef,
    runtime_audit_hash: nullableHashString,
    compression_report_ref: nullableStrictFunctionalRef,
    compression_report_hash: nullableHashString,
    compressed_context_hash: nullableHashString,
    raw_provider_response: false,
    provider_id: false,
    model_id: false,
    timeout_ms: false,
    debate_config: false,
  },
  allOf: [
    ...semanticArtifactSlotRules,
    {
      if: {
        required: ['runtime_provenance_class'],
        properties: {
          runtime_provenance_class: { const: 'runtime_verified' },
        },
      },
      then: {
        properties: {
          context_policy_profile_id: stringId,
          context_policy_profile_version: stringId,
          context_policy_profile_hash: hashString,
          prompt_variant_key: stringId,
          runtime_invocation_context_hash: hashString,
          redaction_policy: stringId,
          source_hashes: {
            type: 'object',
            minProperties: 1,
            additionalProperties: hashString,
          },
          runtime_audit_ref: strictArtifactFunctionalRefSchema,
          runtime_audit_hash: hashString,
        },
      },
    },
    {
      if: {
        required: ['execution_mode'],
        properties: {
          execution_mode: { const: 'provider_llm' },
        },
      },
      then: {
        required: ['model_option_id'],
        properties: {
          model_option_id: stringId,
        },
      },
    },
    {
      if: {
        required: ['execution_mode'],
        properties: {
          execution_mode: { enum: ['mocked_llm', 'codex_assisted', 'human_delegated'] },
        },
      },
      then: {
        properties: {
          model_option_id: { type: 'null' },
        },
      },
    },
  ],
} as const;

const semanticArtifactArray = {
  anyOf: [
    {
      type: 'array',
      items: topicSelectionV1bWorkflowHarnessSemanticSupportArtifactRefSchema,
    },
    { type: 'null' },
  ],
} as const;

export const topicSelectionV1bWorkflowHarnessHandoffEdgeSpecSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['handoff_kind', 'source_node_id', 'target_node_id', 'route_signal', 'payload_schema_version'],
  properties: {
    handoff_kind: handoffKind,
    source_node_id: { enum: [...TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_NODE_IDS] },
    target_node_id: { enum: [...TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_NODE_IDS, 'v1c.entry'] },
    route_signal: stringId,
    payload_schema_version: stringId,
  },
} as const;

export const topicSelectionV1bWorkflowHarnessRouteEdgePolicySchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'route_id',
    'from_node_id',
    'route_signal',
    'route_decision',
    'next_node_id',
    'handoff_kind',
    'allowed_gate_statuses',
  ],
  properties: {
    route_id: stringId,
    from_node_id: { enum: [...TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_NODE_IDS] },
    route_signal: stringId,
    route_decision: { enum: [...TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_ROUTE_DECISIONS] },
    next_node_id: {
      anyOf: [
        { enum: [...TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_NODE_IDS, 'v1c.entry'] },
        { type: 'null' },
      ],
    },
    handoff_kind: {
      anyOf: [
        handoffKind,
        { type: 'null' },
      ],
    },
    allowed_gate_statuses: {
      type: 'array',
      items: { enum: [...TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_GATE_STATUSES] },
      minItems: 1,
      uniqueItems: true,
    },
  },
} as const;

export const topicSelectionV1bWorkflowHarnessNodePolicySchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'node_index',
    'node_id',
    'execution_kind',
    'deterministic_gate_required',
    'input_contract',
    'required_frozen_snapshot_kind',
    'authority_kind',
    'output_handoff_kind',
    'gate_id',
    'execution_spec_allowed',
    'model_option_id_allowed',
    'codex_support_allowed',
    'delegated_payload_allowed',
    'allowed_execution_modes',
    'semantic_support_slots',
    'route_edges',
    'blocker_codes',
    'warning_codes',
    'loopback_target_codes',
    'replay_hash_components',
  ],
  properties: {
    node_index: { type: 'integer', minimum: 1, maximum: 11 },
    node_id: { enum: [...TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_NODE_IDS] },
    execution_kind: { enum: [...TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_EXECUTION_KINDS] },
    deterministic_gate_required: { const: true },
    input_contract: stringId,
    allowed_input_contracts: {
      type: 'array',
      items: stringId,
      minItems: 1,
      uniqueItems: true,
    },
    required_frozen_snapshot_kind: stringId,
    authority_kind: stringId,
    output_handoff_kind: {
      anyOf: [
        handoffKind,
        { type: 'null' },
      ],
    },
    gate_id: stringId,
    execution_spec_allowed: { type: 'boolean' },
    model_option_id_allowed: { type: 'boolean' },
    codex_support_allowed: { type: 'boolean' },
    delegated_payload_allowed: { type: 'boolean' },
    allowed_execution_modes: {
      type: 'array',
      items: semanticExecutionMode,
      minItems: 1,
      uniqueItems: true,
    },
    semantic_support_slots: {
      type: 'array',
      items: topicSelectionV1bWorkflowHarnessSemanticSupportSlotSpecSchema,
    },
    route_edges: {
      type: 'array',
      items: topicSelectionV1bWorkflowHarnessRouteEdgePolicySchema,
    },
    blocker_codes: stringArray,
    warning_codes: stringArray,
    loopback_target_codes: stringArray,
    replay_hash_components: {
      type: 'array',
      items: replayHashComponent,
      minItems: 1,
      uniqueItems: true,
    },
    // N8 only (T-123 Phase 3): deterministic T1/T3 debate-trigger thresholds carried on
    // the node policy so the gate stays a pure code-over-policy check. Optional because
    // only the assess-topic-value node declares it.
    debate_trigger_thresholds: {
      type: 'object',
      additionalProperties: false,
      required: [
        'provisional',
        't1_total_score_min',
        't1_total_score_max_exclusive',
        't1_confidence_min',
        't3_dimension_spread_min',
        't3_single_dimension_floor',
        't3_total_score_min',
      ],
      properties: {
        provisional: { type: 'boolean' },
        t1_total_score_min: { type: 'number' },
        t1_total_score_max_exclusive: { type: 'number' },
        t1_confidence_min: { type: 'number' },
        t3_dimension_spread_min: { type: 'number' },
        t3_single_dimension_floor: { type: 'number' },
        t3_total_score_min: { type: 'number' },
      },
    },
    // N6 only (T-127 W-07): advisory candidate-debate escalation thresholds carried on the node
    // policy. Optional because only the generate-topic-question-candidates node declares it; drives
    // no harness compute (escalation is the upstream triage artifact's judgment, DMP-10 / T-088 D6).
    n6_debate_trigger_thresholds: {
      type: 'object',
      additionalProperties: false,
      required: [
        'provisional',
        'weak_blocked_fraction_min',
        'weak_blocked_count_min',
        'admissible_candidate_floor',
        'duplicate_distinct_ratio_max_inclusive',
        'duplicate_overlap_count_min',
      ],
      properties: {
        provisional: { type: 'boolean' },
        weak_blocked_fraction_min: { type: 'number' },
        weak_blocked_count_min: { type: 'number' },
        admissible_candidate_floor: { type: 'number' },
        duplicate_distinct_ratio_max_inclusive: { type: 'number' },
        duplicate_overlap_count_min: { type: 'number' },
      },
    },
  },
} as const;

export const topicSelectionV1bWorkflowHarnessNodePolicyRegistrySchema = {
  type: 'array',
  minItems: 11,
  maxItems: 11,
  items: topicSelectionV1bWorkflowHarnessNodePolicySchema,
} as const;

export const topicSelectionV1bWorkflowHarnessAuthorityRefSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'authority_kind',
    'authority_ref',
    'authority_hash',
    'source_node_id',
    'source_node_attempt_id',
    'policy_version',
    'schema_version',
  ],
  properties: {
    authority_kind: stringId,
    authority_ref: strictFunctionalRefSchema,
    authority_hash: hashString,
    source_node_id: { enum: [...TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_NODE_IDS] },
    source_node_attempt_id: stringId,
    policy_version: stringId,
    schema_version: stringId,
  },
} as const;

const n6RuntimeContextProjectionBaseRequired = [
  'schema_version',
  'projection_kind',
  'node_id',
  'workflow_run_id',
  'node_attempt_id',
  'route_decision',
  'non_authority',
  'context_cache_scope',
  'context_authority',
  'source_refs',
  'source_hashes',
  'support_refs',
  'support_hashes',
  'preserved_fact_kinds',
] as const;

const n6RuntimeContextProjectionBaseProperties = {
  schema_version: { const: TOPIC_SELECTION_V1B_N6_RUNTIME_CONTEXT_PROJECTION_SCHEMA_VERSION },
  projection_kind: { enum: [...TOPIC_SELECTION_V1B_N6_RUNTIME_CONTEXT_PROJECTION_KINDS] },
  node_id: { const: 'topic-selection.v1b.generate-topic-question-candidates.v1' },
  workflow_run_id: stringId,
  node_attempt_id: stringId,
  route_decision: { const: 'loopback' },
  non_authority: { const: true },
  context_cache_scope: { const: 'process_local_runtime_only' },
  context_authority: { const: 'non_authority_runtime_context' },
  source_refs: strictFunctionalRefArray,
  source_hashes: hashMap,
  support_refs: strictFunctionalRefArray,
  support_hashes: hashMap,
  preserved_fact_kinds: stringArray,
} as const;

const topicSelectionV1bN6GateFailureRetryContextProjectionSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    ...n6RuntimeContextProjectionBaseRequired,
    'loopback_target_code',
    'selected_research_slice_ref',
    'selected_research_slice_hash',
    'n5_handoff_hash',
    'failed_draft_ref',
    'failed_draft_hash',
    'failed_draft_prompt_packet_hash',
    'failed_draft_source_hashes_hash',
    'blocked_candidate_context',
    'blocked_candidate_context_hash',
    'failure_reason_codes',
    'regeneration_hints',
    'triage_artifact_ref',
    'triage_artifact_hash',
    'triage_payload_hash',
  ],
  properties: {
    ...n6RuntimeContextProjectionBaseProperties,
    projection_kind: { const: 'v1b_n6_gate_failure_retry_context' },
    // Mirrors the widened TS interface: the gate-failure retry context backs both the single-agent
    // regeneration loopback and the divergent-debate escalation.
    loopback_target_code: { enum: ['n6_regenerate_candidates', 'n6_debate_escalation'] },
    selected_research_slice_ref: strictFunctionalRefSchema,
    selected_research_slice_hash: hashString,
    n5_handoff_hash: hashString,
    failed_draft_ref: strictFunctionalRefSchema,
    failed_draft_hash: hashString,
    failed_draft_prompt_packet_hash: hashString,
    failed_draft_source_hashes_hash: hashString,
    blocked_candidate_context: { type: 'array', items: objectPayload },
    blocked_candidate_context_hash: hashString,
    failure_reason_codes: stringArray,
    regeneration_hints: stringArray,
    triage_artifact_ref: nullableStrictFunctionalRef,
    triage_artifact_hash: nullableHashString,
    triage_payload_hash: nullableHashString,
  },
} as const;

export const topicSelectionV1bN6RuntimeContextProjectionSchema = {
  anyOf: [
    topicSelectionV1bN6GateFailureRetryContextProjectionSchema,
  ],
} as const;

const n7RuntimeContextProjectionBaseRequired = [
  'schema_version',
  'projection_kind',
  'node_id',
  'workflow_run_id',
  'node_attempt_id',
  'route_decision',
  'non_authority',
  'context_cache_scope',
  'context_authority',
  'source_refs',
  'source_hashes',
  'support_refs',
  'support_hashes',
  'preserved_fact_kinds',
] as const;

const n7RuntimeContextProjectionBaseProperties = {
  schema_version: { const: TOPIC_SELECTION_V1B_N7_RUNTIME_CONTEXT_PROJECTION_SCHEMA_VERSION },
  projection_kind: { enum: [...TOPIC_SELECTION_V1B_N7_RUNTIME_CONTEXT_PROJECTION_KINDS] },
  node_id: { const: 'topic-selection.v1b.materialize-topic-question-contract.v1' },
  workflow_run_id: stringId,
  node_attempt_id: stringId,
  route_decision: { enum: ['invoke_next', 'loopback'] },
  non_authority: { const: true },
  context_cache_scope: { const: 'process_local_runtime_only' },
  context_authority: { const: 'non_authority_runtime_context' },
  source_refs: strictFunctionalRefArray,
  source_hashes: hashMap,
  support_refs: strictFunctionalRefArray,
  support_hashes: hashMap,
  preserved_fact_kinds: stringArray,
} as const;

const topicSelectionV1bN7ToN8TopicQuestionContractContextProjectionSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    ...n7RuntimeContextProjectionBaseRequired,
    'n7_handoff_ref',
    'n7_handoff_hash',
    'topic_question_ref',
    'topic_question_hash',
    'topic_question_contract_ref',
    'topic_question_contract_hash',
    'answerability_plan_ref',
    'answerability_plan_hash',
    'trial_ledger_ref',
    'trial_ledger_hash',
    'topic_question_candidate_set_ref',
    'topic_question_candidate_set_hash',
    'active_candidate_ref',
    'active_candidate_hash',
    'selected_research_slice_ref',
    'selected_research_slice_hash',
    'n8_debate_admission_ref',
    'n8_debate_admission_hash',
    'candidate_grouping_ref',
    'candidate_grouping_hash',
  ],
  properties: {
    ...n7RuntimeContextProjectionBaseProperties,
    projection_kind: { const: 'v1b_n7_to_n8_topic_question_contract_context' },
    route_decision: { const: 'invoke_next' },
    n7_handoff_ref: strictFunctionalRefSchema,
    n7_handoff_hash: hashString,
    topic_question_ref: strictFunctionalRefSchema,
    topic_question_hash: hashString,
    topic_question_contract_ref: strictFunctionalRefSchema,
    topic_question_contract_hash: hashString,
    answerability_plan_ref: strictFunctionalRefSchema,
    answerability_plan_hash: hashString,
    trial_ledger_ref: strictFunctionalRefSchema,
    trial_ledger_hash: hashString,
    topic_question_candidate_set_ref: strictFunctionalRefSchema,
    topic_question_candidate_set_hash: hashString,
    active_candidate_ref: strictFunctionalRefSchema,
    active_candidate_hash: hashString,
    selected_research_slice_ref: strictFunctionalRefSchema,
    selected_research_slice_hash: hashString,
    n8_debate_admission_ref: strictFunctionalRefSchema,
    n8_debate_admission_hash: hashString,
    candidate_grouping_ref: nullableStrictFunctionalRef,
    candidate_grouping_hash: nullableHashString,
  },
} as const;

const topicSelectionV1bN7ToN6FailedTrialLoopbackContextProjectionSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    ...n7RuntimeContextProjectionBaseRequired,
    'loopback_target_code',
    'topic_question_candidate_set_ref',
    'topic_question_candidate_set_hash',
    'n6_handoff_hash',
    'n8_feedback_ref',
    'n8_feedback_hash',
    'failed_trial_synthesis_ref',
    'failed_trial_synthesis_hash',
    'exhausted_candidate_refs',
    'exhausted_candidate_hashes',
    'failure_reason_codes',
    'n6_regeneration_hints',
    'synthesis_summary',
  ],
  properties: {
    ...n7RuntimeContextProjectionBaseProperties,
    projection_kind: { const: 'v1b_n7_to_n6_failed_trial_loopback_context' },
    route_decision: { const: 'loopback' },
    loopback_target_code: { const: 'n7_loopback_to_n6' },
    topic_question_candidate_set_ref: strictFunctionalRefSchema,
    topic_question_candidate_set_hash: hashString,
    n6_handoff_hash: hashString,
    n8_feedback_ref: nullableStrictFunctionalRef,
    n8_feedback_hash: nullableHashString,
    failed_trial_synthesis_ref: strictFunctionalRefSchema,
    failed_trial_synthesis_hash: hashString,
    exhausted_candidate_refs: strictFunctionalRefArray,
    exhausted_candidate_hashes: { type: 'array', items: hashString },
    failure_reason_codes: stringArray,
    n6_regeneration_hints: stringArray,
    synthesis_summary: stringId,
  },
} as const;

export const topicSelectionV1bN7RuntimeContextProjectionSchema = {
  anyOf: [
    topicSelectionV1bN7ToN8TopicQuestionContractContextProjectionSchema,
    topicSelectionV1bN7ToN6FailedTrialLoopbackContextProjectionSchema,
  ],
} as const;

const handoffPayloadSchemas = {
  N1ToN2Handoff: {
    type: 'object',
    additionalProperties: false,
    required: ['intake_snapshot_ref', 'intake_snapshot_hash', 'v1a_bundle_ref', 'v1a_bundle_hash'],
    properties: {
      intake_snapshot_ref: strictFunctionalRefSchema,
      intake_snapshot_hash: hashString,
      v1a_bundle_ref: strictFunctionalRefSchema,
      v1a_bundle_hash: hashString,
    },
  },
  N2ToN3Handoff: {
    type: 'object',
    additionalProperties: false,
    required: ['constraint_profile_ref', 'constraint_profile_hash', 'intake_snapshot_ref', 'intake_snapshot_hash'],
    properties: {
      constraint_profile_ref: strictFunctionalRefSchema,
      constraint_profile_hash: hashString,
      intake_snapshot_ref: strictFunctionalRefSchema,
      intake_snapshot_hash: hashString,
    },
  },
  N3ToN4Handoff: {
    type: 'object',
    additionalProperties: false,
    required: ['intake_readiness_ref', 'intake_readiness_hash', 'constraint_profile_ref', 'constraint_profile_hash'],
    properties: {
      intake_readiness_ref: strictFunctionalRefSchema,
      intake_readiness_hash: hashString,
      constraint_profile_ref: strictFunctionalRefSchema,
      constraint_profile_hash: hashString,
    },
  },
  N4ToN5Handoff: {
    type: 'object',
    additionalProperties: false,
    required: ['research_slice_option_set_ref', 'research_slice_option_set_hash'],
    properties: {
      research_slice_option_set_ref: strictFunctionalRefSchema,
      research_slice_option_set_hash: hashString,
    },
  },
  N5ToN6Handoff: {
    type: 'object',
    additionalProperties: false,
    required: [
      'constraint_profile_ref',
      'constraint_profile_hash',
      'intake_readiness_ref',
      'intake_readiness_hash',
      'research_slice_ref',
      'research_slice_hash',
      'research_slice_selection_ref',
      'research_slice_selection_hash',
      'research_slice_option_set_ref',
      'research_slice_option_set_hash',
      'selected_slice_option_ref',
      'selected_slice_option_hash',
    ],
    properties: {
      constraint_profile_ref: strictFunctionalRefSchema,
      constraint_profile_hash: hashString,
      intake_readiness_ref: strictFunctionalRefSchema,
      intake_readiness_hash: hashString,
      research_slice_ref: strictFunctionalRefSchema,
      research_slice_hash: hashString,
      research_slice_selection_ref: strictFunctionalRefSchema,
      research_slice_selection_hash: hashString,
      research_slice_option_set_ref: strictFunctionalRefSchema,
      research_slice_option_set_hash: hashString,
      selected_slice_option_ref: strictFunctionalRefSchema,
      selected_slice_option_hash: hashString,
    },
  },
  N6ToN7Handoff: {
    type: 'object',
    additionalProperties: false,
    required: [...n6ToN7LineagePayloadRequired],
    properties: n6ToN7LineagePayloadProperties,
  },
  N7ToN8Handoff: {
    type: 'object',
    additionalProperties: false,
    required: [
      'topic_question_ref',
      'topic_question_hash',
      'topic_question_contract_ref',
      'topic_question_contract_hash',
      'answerability_plan_ref',
      'answerability_plan_hash',
      'trial_ledger_ref',
      'trial_ledger_hash',
      'topic_question_candidate_set_ref',
      'topic_question_candidate_set_hash',
      'active_candidate_ref',
      'active_candidate_hash',
      'selected_research_slice_ref',
      'selected_research_slice_hash',
      'n8_debate_admission_ref',
      'n8_debate_admission_hash',
      'candidate_grouping_ref',
      'candidate_grouping_hash',
    ],
    properties: {
      topic_question_ref: strictFunctionalRefSchema,
      topic_question_hash: hashString,
      topic_question_contract_ref: strictFunctionalRefSchema,
      topic_question_contract_hash: hashString,
      answerability_plan_ref: strictFunctionalRefSchema,
      answerability_plan_hash: hashString,
      trial_ledger_ref: strictFunctionalRefSchema,
      trial_ledger_hash: hashString,
      topic_question_candidate_set_ref: strictFunctionalRefSchema,
      topic_question_candidate_set_hash: hashString,
      active_candidate_ref: strictFunctionalRefSchema,
      active_candidate_hash: hashString,
      selected_research_slice_ref: strictFunctionalRefSchema,
      selected_research_slice_hash: hashString,
      n8_debate_admission_ref: strictFunctionalRefSchema,
      n8_debate_admission_hash: hashString,
      candidate_grouping_ref: nullableStrictFunctionalRef,
      candidate_grouping_hash: nullableHashString,
    },
  },
  N8ToN9Handoff: {
    type: 'object',
    additionalProperties: false,
    required: [
      'topic_value_assessment_ref',
      'topic_value_assessment_hash',
      'topic_question_contract_ref',
      'topic_question_contract_hash',
      'value_reasoning_memo_ref',
      'value_reasoning_memo_hash',
      'recommended_disposition',
    ],
    properties: {
      topic_value_assessment_ref: strictFunctionalRefSchema,
      topic_value_assessment_hash: hashString,
      topic_question_contract_ref: strictFunctionalRefSchema,
      topic_question_contract_hash: hashString,
      value_reasoning_memo_ref: strictFunctionalRefSchema,
      value_reasoning_memo_hash: hashString,
      recommended_disposition: {
        enum: [
          'advance_to_package',
          'refine_question',
          'refine_slice',
          'recheck_evidence_or_search',
          'park',
          'drop',
        ],
      },
    },
  },
  N9ToN10Handoff: {
    type: 'object',
    additionalProperties: false,
    required: [
      'value_disposition_ref',
      'value_disposition_hash',
      'advance_disposition',
      'topic_value_assessment_ref',
      'topic_value_assessment_hash',
    ],
    properties: {
      value_disposition_ref: strictFunctionalRefSchema,
      value_disposition_hash: hashString,
      advance_disposition: { const: true },
      topic_value_assessment_ref: strictFunctionalRefSchema,
      topic_value_assessment_hash: hashString,
    },
  },
  N10ToN11Handoff: {
    type: 'object',
    additionalProperties: false,
    required: [
      'draft_topic_package_ref',
      'draft_topic_package_hash',
      'value_disposition_ref',
      'value_disposition_hash',
      'v1c_input_bundle_ref',
      'v1c_input_bundle_hash',
    ],
    properties: {
      draft_topic_package_ref: strictFunctionalRefSchema,
      draft_topic_package_hash: hashString,
      value_disposition_ref: strictFunctionalRefSchema,
      value_disposition_hash: hashString,
      v1c_input_bundle_ref: strictFunctionalRefSchema,
      v1c_input_bundle_hash: hashString,
    },
  },
  V1cInputBundle: {
    type: 'object',
    additionalProperties: false,
    required: ['v1c_input_bundle_ref', 'v1c_input_bundle_hash', 'draft_topic_package_ref', 'draft_topic_package_hash'],
    properties: {
      v1c_input_bundle_ref: strictFunctionalRefSchema,
      v1c_input_bundle_hash: hashString,
      draft_topic_package_ref: strictFunctionalRefSchema,
      draft_topic_package_hash: hashString,
      promotion_decision: false,
      bridge_creation_request: false,
      paper_project_ref: false,
      paper_implementation_ref: false,
    },
  },
} as const;

const handoffEdgeSchemaRules = TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_HANDOFF_EDGE_SPECS.map((edge) => ({
  if: {
    required: ['envelope'],
    properties: {
      envelope: {
        type: 'object',
        required: ['handoff_kind'],
        properties: {
          handoff_kind: { const: edge.handoff_kind },
        },
      },
    },
  },
  then: {
    properties: {
      envelope: {
        type: 'object',
        properties: {
          handoff_kind: { const: edge.handoff_kind },
          source_node_id: { const: edge.source_node_id },
          schema_version: { const: edge.payload_schema_version },
        },
      },
      target_node_id: { const: edge.target_node_id },
      route_signal: { const: edge.route_signal },
      payload: handoffPayloadSchemas[edge.handoff_kind],
    },
  },
})) as readonly Record<string, unknown>[];

export const topicSelectionV1bWorkflowHarnessHandoffEnvelopeSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'handoff_kind',
    'source_node_id',
    'source_node_attempt_id',
    'source_authority_ref',
    'source_authority_hash',
    'source_gate_result_hash',
    'upstream_lineage_hash',
    'policy_version',
    'schema_version',
    'warning_codes',
    'residual_risk_refs',
  ],
  properties: {
    handoff_kind: handoffKind,
    source_node_id: { enum: [...TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_NODE_IDS] },
    source_node_attempt_id: stringId,
    source_authority_ref: strictFunctionalRefSchema,
    source_authority_hash: hashString,
    source_gate_result_hash: hashString,
    upstream_lineage_hash: hashString,
    policy_version: stringId,
    schema_version: stringId,
    warning_codes: stringArray,
    residual_risk_refs: strictFunctionalRefArray,
  },
} as const;

export const topicSelectionV1bWorkflowHarnessHandoffSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'envelope',
    'target_node_id',
    'route_signal',
    'payload_hash',
    'required_refs',
    'payload',
  ],
  properties: {
    envelope: topicSelectionV1bWorkflowHarnessHandoffEnvelopeSchema,
    target_node_id: { enum: [...TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_NODE_IDS, 'v1c.entry'] },
    route_signal: stringId,
    payload_hash: hashString,
    required_refs: strictFunctionalRefArray,
    payload: {
      anyOf: Object.values(handoffPayloadSchemas),
    },
  },
  allOf: handoffEdgeSchemaRules,
} as const;

export const topicSelectionV1bWorkflowHarnessV1cPublicationHandoffSchema = {
  ...topicSelectionV1bWorkflowHarnessHandoffSchema,
  properties: {
    ...topicSelectionV1bWorkflowHarnessHandoffSchema.properties,
    envelope: {
      ...topicSelectionV1bWorkflowHarnessHandoffEnvelopeSchema,
      properties: {
        ...topicSelectionV1bWorkflowHarnessHandoffEnvelopeSchema.properties,
        handoff_kind: { const: 'V1cInputBundle' },
      },
    },
    target_node_id: { const: 'v1c.entry' },
    payload: handoffPayloadSchemas.V1cInputBundle,
  },
} as const;

export const topicSelectionV1bWorkflowHarnessGatePolicySchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'gate_id',
    'node_id',
    'authority_kind',
    'input_contract',
    'allowed_gate_statuses',
    'blocker_codes',
    'warning_codes',
    'loopback_target_codes',
  ],
  properties: {
    gate_id: stringId,
    node_id: { enum: [...TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_NODE_IDS] },
    authority_kind: stringId,
    input_contract: stringId,
    allowed_gate_statuses: {
      type: 'array',
      items: { enum: [...TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_GATE_STATUSES] },
      minItems: 1,
    },
    blocker_codes: stringArray,
    warning_codes: stringArray,
    loopback_target_codes: stringArray,
  },
} as const;

export const topicSelectionV1bWorkflowHarnessGateOutcomeSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'gate_id',
    'node_id',
    'gate_status',
    'authority_write_allowed',
    'route_decision',
    'blocker_codes',
    'warning_codes',
    'gate_result_hash',
  ],
  properties: {
    gate_id: stringId,
    node_id: { enum: [...TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_NODE_IDS] },
    gate_status: { enum: [...TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_GATE_STATUSES] },
    authority_write_allowed: { type: 'boolean' },
    route_decision: { enum: [...TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_ROUTE_DECISIONS] },
    blocker_codes: stringArray,
    warning_codes: stringArray,
    loopback_target_code: nullableStringId,
    gate_result_hash: hashString,
  },
} as const;

export const topicSelectionV1bWorkflowHarnessRoutePolicyDecisionSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'route_id',
    'from_node_id',
    'route_signal',
    'route_decision',
    'next_node_id',
    'handoff_kind',
    'route_hash',
  ],
  properties: {
    route_id: stringId,
    from_node_id: { enum: [...TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_NODE_IDS] },
    route_signal: stringId,
    route_decision: { enum: [...TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_ROUTE_DECISIONS] },
    next_node_id: {
      anyOf: [
        { enum: [...TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_NODE_IDS, 'v1c.entry'] },
        { type: 'null' },
      ],
    },
    handoff_kind: {
      anyOf: [
        handoffKind,
        { type: 'null' },
      ],
    },
    route_hash: hashString,
  },
} as const;

export const topicSelectionV1bWorkflowHarnessExecutionSpecSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['execution_mode'],
  properties: {
    execution_mode: { enum: [...TOPIC_SELECTION_AGENT_EXECUTION_MODES] },
    model_option_id: nullableStringId,
  },
  allOf: [
    {
      if: {
        required: ['execution_mode'],
        properties: {
          execution_mode: { enum: ['mocked_llm', 'codex_assisted'] satisfies TopicSelectionAgentExecutionMode[] },
        },
      },
      then: {
        properties: {
          model_option_id: { type: 'null' },
        },
      },
    },
    {
      if: {
        required: ['execution_mode'],
        properties: {
          execution_mode: { const: 'provider_llm' },
        },
      },
      then: {
        required: ['model_option_id'],
        properties: {
          model_option_id: stringId,
        },
      },
    },
  ],
} as const;

export const topicSelectionV1bWorkflowHarnessFrozenInputSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['input_contract', 'snapshot_kind', 'source_refs', 'payload'],
  properties: {
    input_contract: stringId,
    snapshot_kind: stringId,
    source_refs: functionalRefArray,
    payload: objectPayload,
    frozen_input_hash: nullableHashString,
  },
} as const;

export const topicSelectionV1bWorkflowHarnessRunRequestSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'workflow_run_id',
    'node_attempt_id',
    'node_id',
    'policy_version',
    'frozen_input',
  ],
  properties: {
    schema_version: {
      const: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_RUN_REQUEST_SCHEMA_VERSION,
    },
    workspace_id: nullableStringId,
    title_card_id: nullableStringId,
    workflow_run_id: stringId,
    node_attempt_id: stringId,
    node_id: { enum: [...TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_NODE_IDS] },
    attempt_family_key: nullableStringId,
    policy_version: stringId,
    frozen_input: topicSelectionV1bWorkflowHarnessFrozenInputSchema,
    run_mode: nullableAgentRunMode,
    profile_id: nullableV1bProfileId,
    execution_spec: {
      anyOf: [topicSelectionV1bWorkflowHarnessExecutionSpecSchema, { type: 'null' }],
    },
    semantic_artifacts: semanticArtifactArray,
    actor: {
      anyOf: [
        topicSelectionActorRefSchema,
        { type: 'null' },
      ],
    },
    created_by: { enum: ['human', 'llm', 'system', 'hybrid'] },
  },
} as const;

export const topicSelectionV1bWorkflowHarnessReplayIdentitySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['workflow_run_id', 'node_attempt_id', 'attempt_family_key', 'node_replay_key'],
  properties: {
    workflow_run_id: stringId,
    node_attempt_id: stringId,
    attempt_family_key: stringId,
    node_replay_key: hashString,
  },
} as const;

export const topicSelectionV1bWorkflowHarnessHashesSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'frozen_input_hash',
    'execution_spec_hash',
    'semantic_artifact_hash',
    'runtime_admission_hash',
    'gate_result_hash',
    'authority_hash',
    'handoff_hash',
    'route_hash',
  ],
  properties: {
    frozen_input_hash: hashString,
    execution_spec_hash: hashString,
    semantic_artifact_hash: nullableHashString,
    runtime_admission_hash: nullableHashString,
    gate_result_hash: hashString,
    authority_hash: nullableHashString,
    handoff_hash: nullableHashString,
    route_hash: hashString,
  },
} as const;

export const topicSelectionV1bWorkflowHarnessReplayProvenanceSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['replayed'],
  properties: {
    replayed: { type: 'boolean' },
    source_workflow_run_id: nullableStringId,
    source_node_attempt_id: nullableStringId,
    source_trace_artifact_ref: nullableFunctionalRef,
    node_replay_key: nullableHashString,
  },
} as const;

export const topicSelectionV1bWorkflowHarnessRunResultSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'node_id',
    'workflow_run_id',
    'node_attempt_id',
    'gate_status',
    'failure_class',
    'route_decision',
    'replay_identity',
    'hashes',
    'blockers',
    'warnings',
    'authority_ref',
    'handoff_ref',
    'gate_result_ref',
    'transition_attempt_ref',
    'trace_snapshot_ref',
    'harness_trace_artifact_ref',
    'replay_provenance',
    'error_code',
    'error_message',
  ],
  properties: {
    schema_version: {
      const: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_RUN_RESULT_SCHEMA_VERSION,
    },
    node_id: { enum: [...TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_NODE_IDS] },
    workflow_run_id: stringId,
    node_attempt_id: stringId,
    gate_status: { enum: [...TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_GATE_STATUSES] },
    failure_class: {
      anyOf: [
        { enum: [...TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_FAILURE_CLASSES] },
        { type: 'null' },
      ],
    },
    route_decision: { enum: [...TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_ROUTE_DECISIONS] },
    replay_identity: topicSelectionV1bWorkflowHarnessReplayIdentitySchema,
    hashes: topicSelectionV1bWorkflowHarnessHashesSchema,
    blockers: gateIssueArray,
    warnings: gateIssueArray,
    authority_ref: nullableFunctionalRef,
    handoff_ref: nullableFunctionalRef,
    gate_result_ref: nullableFunctionalRef,
    transition_attempt_ref: nullableFunctionalRef,
    trace_snapshot_ref: nullableFunctionalRef,
    harness_trace_artifact_ref: nullableFunctionalRef,
    replay_provenance: {
      anyOf: [
        topicSelectionV1bWorkflowHarnessReplayProvenanceSchema,
        { type: 'null' },
      ],
    },
    error_code: nullableStringId,
    error_message: nullableStringId,
  },
} as const;

/** T-128 W-16: strict schema for the stakeholder sign-off record (see the type block near the two
 *  provisional product gates). additionalProperties:false at every level (W-09 discipline); the
 *  calibration_gate_release branch encodes the flip bar structurally so an under-bar sign-off can
 *  never validate. No auto-flip path is wired anywhere (T-127 D8). */
const topicSelectionStakeholderSignOffActorSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['actor_type', 'actor_id'],
  properties: {
    actor_type: { const: 'human' },
    actor_id: stringId,
  },
} as const;

const topicSelectionStakeholderSignOffCommonProperties = {
  schema_version: { const: 'TopicSelectionStakeholderSignOff@v1' },
  sign_off_id: stringId,
  gate_warning_code: { enum: ['N8_DEBATE_THRESHOLDS_PROVISIONAL', 'N6_DEBATE_THRESHOLDS_PROVISIONAL'] },
  signed_by: topicSelectionStakeholderSignOffActorSchema,
  signed_at: stringId,
  rationale: stringId,
} as const;

/** The run-override branch as a standalone schema — the W-15 sign-off route/service validate
 *  against THIS branch directly (a release-scope record is not a valid run override). */
export const topicSelectionProvisionalRunOverrideSignOffSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'sign_off_id',
    'sign_off_scope',
    'gate_warning_code',
    'signed_by',
    'signed_at',
    'rationale',
    'workflow_run_id',
    'node_id',
    'node_attempt_id',
  ],
  properties: {
    ...topicSelectionStakeholderSignOffCommonProperties,
    sign_off_scope: { const: 'provisional_threshold_run_override' },
    workflow_run_id: stringId,
    node_id: stringId,
    node_attempt_id: stringId,
  },
} as const;

export const topicSelectionStakeholderSignOffSchema = {
  oneOf: [
    topicSelectionProvisionalRunOverrideSignOffSchema,
    {
      type: 'object',
      additionalProperties: false,
      required: [
        'schema_version',
        'sign_off_id',
        'sign_off_scope',
        'gate_warning_code',
        'signed_by',
        'signed_at',
        'rationale',
        'calibration_evidence',
      ],
      properties: {
        ...topicSelectionStakeholderSignOffCommonProperties,
        sign_off_scope: { const: 'calibration_gate_release' },
        calibration_evidence: {
          type: 'object',
          additionalProperties: false,
          required: [
            'labeled_sample_count',
            'providers',
            'false_positive_rate',
            'per_provider_leak_checked',
            'assessor',
            'corpus_ref',
            'calibration_report_ref',
          ],
          properties: {
            labeled_sample_count: { type: 'integer', minimum: 100 },
            providers: { type: 'array', items: stringId, minItems: 2, uniqueItems: true },
            false_positive_rate: { type: 'number', minimum: 0, exclusiveMaximum: 0.05 },
            per_provider_leak_checked: { const: true },
            assessor: {
              type: 'object',
              additionalProperties: false,
              required: ['independent', 'actor'],
              properties: {
                independent: { const: true },
                actor: topicSelectionStakeholderSignOffActorSchema,
              },
            },
            corpus_ref: strictFunctionalRefSchema,
            calibration_report_ref: strictFunctionalRefSchema,
          },
        },
      },
    },
  ],
} as const;

/** T-128 W-15 (O-2): strict schema for the loopback-budget raise record. `raised_to` is
 *  hard-capped at 5 by `maximum` — an over-cap raise is schema-invalid, mirroring how the W-16
 *  release sign-off encodes its bar structurally. */
export const topicSelectionLoopbackBudgetRaiseSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'raise_id',
    'workflow_run_id',
    'node_id',
    'raised_to',
    'rationale',
    'raised_by',
    'raised_at',
  ],
  properties: {
    schema_version: { const: 'TopicSelectionLoopbackBudgetRaise@v1' },
    raise_id: stringId,
    workflow_run_id: stringId,
    node_id: stringId,
    raised_to: { type: 'integer', minimum: 1, maximum: 5 },
    rationale: stringId,
    raised_by: topicSelectionStakeholderSignOffActorSchema,
    raised_at: stringId,
  },
} as const;
