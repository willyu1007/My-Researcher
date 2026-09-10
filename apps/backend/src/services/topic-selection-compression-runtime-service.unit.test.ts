import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionContextPolicyProfile,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-llm-runtime-contracts';
import { AppError } from '../errors/app-error.js';
import {
  TOPIC_SELECTION_V1A_N6_CONTEXT_RUNTIME_PROFILE_IDS,
  TOPIC_SELECTION_V1A_N6_INVOCATION_SLOT_IDS,
  TOPIC_SELECTION_V1B_N4_CONTEXT_RUNTIME_PROFILE_IDS,
  TOPIC_SELECTION_V1B_N4_INVOCATION_SLOT_IDS,
  TOPIC_SELECTION_V1B_N6_CONTEXT_RUNTIME_PROFILE_IDS,
  TOPIC_SELECTION_V1B_N6_INVOCATION_SLOT_IDS,
  TOPIC_SELECTION_V1B_N7_CONTEXT_RUNTIME_PROFILE_IDS,
  TOPIC_SELECTION_V1B_N7_INVOCATION_SLOT_IDS,
  TOPIC_SELECTION_V1B_N8_CONTEXT_RUNTIME_PROFILE_IDS,
  TOPIC_SELECTION_V1B_N8_INVOCATION_SLOT_IDS,
  TOPIC_SELECTION_RESOURCE_SAMPLING_CONTEXT_RUNTIME_PROFILE_IDS,
  TOPIC_SELECTION_RESOURCE_SAMPLING_INVOCATION_SLOT_IDS,
  TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_CONTEXT_RUNTIME_PROFILE_IDS,
  TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_INVOCATION_SLOT_IDS,
  TOPIC_SELECTION_V1C_N4_CONTEXT_RUNTIME_PROFILE_IDS,
  TOPIC_SELECTION_V1C_N4_INVOCATION_SLOT_IDS,
  TOPIC_SELECTION_V1C_N6_CONTEXT_RUNTIME_PROFILE_IDS,
  TOPIC_SELECTION_V1C_N6_INVOCATION_SLOT_IDS,
  TopicSelectionContextPolicyProfileRegistryService,
} from './topic-selection-context-policy-profile-registry-service.js';
import { TopicSelectionCompressionRuntimeService } from './topic-selection-compression-runtime-service.js';
import {
  sha256Text,
  stableStringify,
} from './literature-content-processing-utils.js';

function ref(refType: string, refId: string): TopicSelectionFunctionalRef {
  return {
    ref_type: refType,
    ref_id: refId,
    title_card_id: 'title_card_001',
  };
}

function resolvedProfile() {
  const registry = new TopicSelectionContextPolicyProfileRegistryService();
  return registry.resolveProfile({
    context_policy_profile_id:
      TOPIC_SELECTION_V1A_N6_CONTEXT_RUNTIME_PROFILE_IDS.need_candidate_generation,
    invocation_slot_id:
      TOPIC_SELECTION_V1A_N6_INVOCATION_SLOT_IDS.need_candidate_generation,
  });
}

function resolvedContextProfile(input: {
  context_policy_profile_id: string;
  invocation_slot_id: string;
}) {
  const registry = new TopicSelectionContextPolicyProfileRegistryService();
  return registry.resolveProfile(input);
}

function inputContext() {
  return {
    source_refs: [ref('evidence_unit', 'support_001')],
    blockers: ['NO_SOURCE_HEALTH_GAP'],
    residual_risks: ['risk_prior_art_overlap'],
    accepted_risks: ['risk_scope_narrow'],
    source_health_warnings: ['source_health_partial_coverage'],
    method_family_gaps: ['gap_hybrid_adaptation'],
    unresolved_challenges: ['challenge_prior_art_boundary'],
    recheck_hints: ['recheck_after_supplemental_round'],
    verbose_notes: 'Long exploratory context that can be summarized after refs and risks are preserved.',
  };
}

function compressedContext() {
  return {
    source_refs: [ref('evidence_unit', 'support_001')],
    preserved: {
      blockers: ['NO_SOURCE_HEALTH_GAP'],
      residual_risks: ['risk_prior_art_overlap'],
      accepted_risks: ['risk_scope_narrow'],
      source_health_warnings: ['source_health_partial_coverage'],
      method_family_gaps: ['gap_hybrid_adaptation'],
      unresolved_challenges: ['challenge_prior_art_boundary'],
      recheck_hints: ['recheck_after_supplemental_round'],
    },
    summary: 'Compressed ref-backed context preserving blockers, risks, gaps, challenges, and recheck hints.',
  };
}

function requiredFacts() {
  return {
    blocker: ['NO_SOURCE_HEALTH_GAP'],
    residual_risk: ['risk_prior_art_overlap'],
    accepted_risk: ['risk_scope_narrow'],
    source_health_warning: ['source_health_partial_coverage'],
    method_family_gap: ['gap_hybrid_adaptation'],
    unresolved_challenge: ['challenge_prior_art_boundary'],
    recheck_hint: ['recheck_after_supplemental_round'],
  };
}

function v1bN7RequiredFacts() {
  return {
    blocker: ['N7_SUPPORT_GATE_REQUIRED'],
    residual_risk: ['risk_value_evidence_thin'],
    n8_feedback: ['feedback_ref_001'],
    loopback_target: ['topic-selection.v1b.N6'],
    regeneration_hint: ['hint_needs_clearer_research_axis'],
    candidate_identity: ['candidate_ref_001'],
    failed_candidate_identity: ['candidate_ref_002'],
    n8_gate_rejection_reason: ['novelty_gate_failed'],
    debate_admission_need: ['need_additional_value_risk_review'],
    value_risk_fact: ['risk_value_evidence_thin'],
  };
}

function v1bN4RequiredFacts() {
  return {
    blocker: ['blocker_slice_scope_unclear'],
    residual_risk: ['risk_slice_too_broad'],
    accepted_risk: ['accepted_risk_provider_variance'],
    source_health_warning: ['source_health_partial_n4'],
    method_family_gap: ['gap_method_family_runtime_only'],
    unresolved_challenge: ['challenge_slice_overlap'],
    recheck_hint: ['recheck_after_slice_selection'],
    n3_handoff: ['n3_handoff_hash_001'],
    intake_snapshot_identity: ['intake_snapshot_hash_001'],
    constraint_profile: ['constraint_profile_hash_001'],
    intake_readiness: ['intake_readiness_hash_001'],
    validated_need: ['validated_need_ref_hash_001'],
    evidence_role_bundle: ['evidence_role_bundle_hash_001'],
    evidence_ref: ['evidence_refs_hash_001'],
    claim_ceiling: ['claim_ceiling_hash_001'],
    non_goal: ['non_goal_promotion_001'],
    risk_gap_blocker_fact: ['gap_code_scope_boundary'],
    memory_suggestion: ['memory_suggestion_ref_001'],
    planning_input: ['planning_input_hash_001'],
  };
}

function v1cN2RequiredFacts() {
  return {
    blocker: ['blocker_ref_hash_001'],
    residual_risk: ['risk_provider_schema_drift'],
    accepted_risk: ['accepted_risk_provider_variance'],
    source_health_warning: ['source_health_partial_n2'],
    method_family_gap: ['gap_runtime_only_claim'],
    unresolved_challenge: ['challenge_claim_ceiling_ambiguity'],
    recheck_hint: ['recheck_after_outline_lock'],
    promotion_input_snapshot: ['promotion_input_snapshot_hash_001'],
    topic_package: ['topic_package_ref_hash_001'],
    topic_question_contract: ['topic_question_contract_hash_001'],
    answerability_plan: ['answerability_plan_hash_001'],
    research_slice: ['research_slice_hash_001'],
    value_assessment: ['value_assessment_hash_001'],
    promotion_readiness: ['promotion_readiness_hash_001'],
    selected_evidence: ['selected_evidence_hash_001'],
    evidence_ref: ['evidence_ref_hash_001'],
    evidence_support_map: ['evidence_support_map_hash_001'],
    claim_ceiling: ['claim_ceiling_hash_001'],
    contribution_summary: ['contribution_summary_hash_001'],
    evaluation_plan: ['evaluation_plan_hash_001'],
    recheck_obligation: ['recheck_obligation_hash_001'],
    memory_suggestion: ['memory_suggestion_hash_001'],
    allowed_ref_manifest: ['allowed_ref_manifest_hash_001'],
    critic_finding: ['critic_finding_hash_001'],
    critic_resolution_map: ['critic_resolution_map_hash_001'],
    readiness_coverage_item: ['readiness_coverage_hash_001'],
  };
}

function v1cN4RequiredFacts() {
  return {
    blocker: ['blocker_gate_condition_conflict'],
    residual_risk: ['risk_human_decision_boundary'],
    accepted_risk: ['accepted_risk_provider_variance'],
    source_health_warning: ['source_health_partial_n4'],
    method_family_gap: ['gap_n4_runtime_only_candidate'],
    unresolved_challenge: ['challenge_human_authority_boundary'],
    recheck_hint: ['recheck_before_bridge_materialization'],
    promotion_gate_handoff: ['promotion_gate_check_ref_hash_001'],
    promotion_input_snapshot: ['promotion_input_snapshot_hash_001'],
    promotion_gate_disposition: ['ready_for_human_decision'],
    promote_allowed: ['promote_allowed_true'],
    promotion_decision_support: ['promotion_decision_support_ref_hash_001'],
    promotion_dossier: ['promotion_dossier_ref_hash_001'],
    argument_readiness_mini_check: ['argument_readiness_mini_check_ref_hash_001'],
    condition: ['condition_clarify_contribution_claim'],
    required_action: ['required_action_hash_001'],
    loopback_target: ['loopback_target_null'],
    loopback_hint: ['loopback_hint_hash_001'],
    claim_ceiling: ['claim_ceiling_hash_001'],
    early_check_obligation: ['early_check_obligation_hash_001'],
    allowed_ref_manifest: ['allowed_refs_hash_001'],
    human_authority_boundary: ['explicit_human_acceptance_required'],
    no_bridge_creation_boundary: ['n4_runtime_admission_cannot_create_n5_bridge'],
  };
}

function v1cN6RequiredFacts() {
  return {
    blocker: ['blocker_downstream_feedback_conflict'],
    residual_risk: ['risk_feedback_source_ambiguous'],
    accepted_risk: ['accepted_risk_record_only_feedback'],
    source_health_warning: ['source_health_partial_downstream_feedback'],
    method_family_gap: ['gap_downstream_signal_runtime_only'],
    unresolved_challenge: ['challenge_feedback_authority_boundary'],
    recheck_hint: ['recheck_validated_need_before_downstream_continue'],
    paper_project_bridge: ['bridge_payload_hash_001'],
    source_promotion_decision: ['promotion_decision_ref_hash_001'],
    promotion_commitment_profile: ['promotion_commitment_profile_ref_hash_001'],
    promotion_input_snapshot: ['promotion_input_snapshot_hash_001'],
    downstream_source_ref: ['downstream_source_ref_hash_001'],
    source_feedback_ref: ['source_feedback_refs_hash_001'],
    feedback_signal: ['need_invalidated'],
    required_action: ['recheck_validated_need'],
    affected_ref: ['validated_need_ref_hash_001'],
    loopback_target: ['validated_need'],
    severity: ['critical'],
    no_upstream_mutation_boundary: ['record_only_no_n1_to_n5_auto_loop'],
    allowed_ref_manifest: ['allowed_refs_hash_001'],
  };
}

function resourceSamplingRequiredFacts() {
  return {
    blocker: ['blocker_low_source_coverage'],
    residual_risk: ['risk_provider_classification_drift'],
    accepted_risk: ['accepted_risk_role_balance_underfill'],
    source_health_warning: ['source_health_partial_resource_sampling'],
    method_family_gap: ['gap_method_family_resource_sampling'],
    unresolved_challenge: ['challenge_resource_role_ambiguity'],
    recheck_hint: ['recheck_after_sample_selection'],
    topic_id: ['topic_provider_canary_resource_sampling'],
    sample_role_targets: ['support_1_challenge_1_baseline_1_context_1'],
    literature_ref: ['literature_ref_hash_001'],
    candidate_title: ['candidate_title_hash_001'],
    candidate_abstract: ['candidate_abstract_hash_001'],
    key_content_digest: ['key_content_digest_hash_001'],
    activation_score: ['activation_score_091'],
    source_count: ['source_count_1'],
    role_classification: ['primary_role_support'],
    classification_rationale: ['classification_rationale_hash_001'],
    method_family: ['runtime_evaluation'],
    guardrail_signal: ['guardrail_signal_canonicalized_support'],
  };
}

function v1bN6RequiredFacts() {
  return {
    blocker: ['blocker_candidate_scope_unclear'],
    selected_slice_identity: ['research_slice_ref_001'],
    n5_handoff: ['n5_handoff_hash_001'],
    selected_option_identity: ['selected_option_ref_001'],
    option_set_identity: ['option_set_ref_001'],
    constraint_profile: ['constraint_profile_ref_001'],
    intake_readiness: ['intake_readiness_ref_001'],
    evidence_ref: ['evidence_ref_001'],
    boundary_ref: ['boundary_ref_001'],
    assumption_ref: ['assumption_ref_001'],
    claim_ceiling: ['bounded_claim_ceiling_001'],
    non_goal: ['non_goal_promotion_001'],
    source_health_warning: ['source_health_partial'],
    residual_risk: ['risk_context_thin'],
    accepted_risk: ['accepted_risk_provider_variance'],
    method_family_gap: ['gap_method_family_runtime_only'],
    unresolved_challenge: ['challenge_candidate_overlap'],
    recheck_hint: ['recheck_after_value_trial'],
    n7_loopback_projection: ['n7_loopback_projection_hash_001'],
    n6_gate_failure_projection: ['n6_gate_failure_projection_hash_001'],
    failed_draft_identity: ['failed_draft_hash_001'],
    blocked_candidate_context: ['blocked_candidate_context_hash_001'],
    failed_trial_synthesis: ['failed_trial_synthesis_hash_001'],
    exhausted_candidate_ref: ['topic_question_candidate_failed_001'],
    exhausted_candidate_hash: ['failed_candidate_hash_001'],
    candidate_order: ['candidate_order_hash_001'],
    failure_reason_code: ['value_not_supported'],
    regeneration_hint: ['hint_add_stronger_value_evidence'],
    loopback_target: ['n6_regenerate_candidates'],
    n8_feedback: ['n8_feedback_hash_001'],
  };
}

function v1bN6LoopbackTriageRequiredFacts() {
  return {
    blocker: ['blocker_no_admissible_candidate'],
    selected_slice_identity: ['research_slice_ref_001'],
    n5_handoff: ['n5_handoff_hash_001'],
    failed_draft_identity: ['failed_draft_hash_001'],
    blocked_candidate_context: ['blocked_candidate_context_hash_001'],
    dominant_reason_code: ['not_answerable'],
    affected_ref: ['research_slice_ref_001'],
    regeneration_hint: ['hint_regenerate_candidate'],
    debate_escalation: ['mixed_cost_control'],
    upstream_rollback: ['select_different_slice'],
    loopback_target: ['n6_debate_escalation'],
  };
}

function v1bN8RequiredFacts() {
  return {
    blocker: ['blocker_value_evidence_missing'],
    residual_risk: ['risk_provider_quality_drift'],
    accepted_risk: ['accepted_risk_bounded_claim'],
    source_health_warning: ['source_health_partial_value_evidence'],
    method_family_gap: ['gap_value_measurement_baseline'],
    unresolved_challenge: ['challenge_reviewer_uncertainty'],
    recheck_hint: ['recheck_after_n8_feedback'],
    n7_handoff: ['n7_handoff_hash_001'],
    n7_to_n8_projection: ['n7_to_n8_projection_hash_001'],
    topic_question: ['topic_question_hash_001'],
    topic_question_contract: ['topic_question_contract_hash_001'],
    active_candidate_identity: ['active_candidate_hash_001'],
    answerability_plan: ['answerability_plan_hash_001'],
    trial_ledger: ['trial_ledger_hash_001'],
    selected_slice_identity: ['research_slice_hash_001'],
    candidate_set_identity: ['candidate_set_hash_001'],
    value_rationale: ['value_rationale_fact_001'],
    support_quality: ['support_quality_fact_001'],
    reviewer_uncertainty: ['reviewer_uncertainty_fact_001'],
    risk_gap_blocker_fact: ['risk_gap_blocker_fact_001'],
    feedback_recheck_hint: ['feedback_recheck_hint_001'],
  };
}

function profileHash(profile: TopicSelectionContextPolicyProfile): string {
  return sha256Text(stableStringify(profile));
}

test('compression runtime creates ref-backed hash-checked quality-gated report', () => {
  const { profile, profile_hash } = resolvedProfile();
  const runtime = new TopicSelectionCompressionRuntimeService();
  const result = runtime.createReport({
    context_policy_profile: profile,
    context_policy_profile_hash: profile_hash,
    compression_report_ref: ref('artifact_ref', 'compression_report_001'),
    source_refs: [ref('artifact_ref', 'context_packet_001')],
    input_context: inputContext(),
    compressed_context: compressedContext(),
    summary: 'Short summary preserving all required facts.',
    compression_executor_kind: 'deterministic_structural',
    required_preserved_facts: requiredFacts(),
    compressed_preserved_facts: requiredFacts(),
    estimated_input_tokens_before_override: 1000,
    estimated_input_tokens_after_override: 320,
  });

  assert.equal(result.quality_gate_result, 'passed');
  assert.deepEqual(result.blocker_codes, []);
  assert.deepEqual(result.warning_codes, []);
  assert.equal(result.report.compression_report_ref.ref_id, 'compression_report_001');
  assert.equal(result.report.source_refs.length, 1);
  assert.equal(result.report.redaction_policy, profile.redaction_policy);
  assert.equal(
    result.report.compression_strategy_id,
    profile.compression_policy.compression_strategy_id,
  );
  assert.match(result.report.input_context_hash, /^[a-f0-9]{64}$/);
  assert.match(result.report.compressed_context_hash, /^[a-f0-9]{64}$/);
  assert.match(result.report.summary_hash, /^[a-f0-9]{64}$/);
  assert.equal(result.report.estimated_input_tokens_before, 1000);
  assert.equal(result.report.estimated_input_tokens_after, 320);
  assert.ok(result.report.preserved_fact_kinds.includes('method_family_gap'));
});

test('compression preserves task-shift source prose while still rejecting credential tokens', () => {
  const { profile, profile_hash } = resolvedProfile();
  const runtime = new TopicSelectionCompressionRuntimeService();
  const check = (statement: string) => runtime.createReport({
    context_policy_profile: profile, context_policy_profile_hash: profile_hash,
    compression_report_ref: ref('artifact_ref', 'source-prose-check'), source_refs: [ref('evidence_unit', 'support_001')],
    input_context: inputContext(), compressed_context: { ...compressedContext(), source_statement: statement },
    summary: 'Preserved source prose and exact evidence refs.', compression_executor_kind: 'deterministic_structural',
    required_preserved_facts: requiredFacts(), compressed_preserved_facts: requiredFacts(),
    estimated_input_tokens_before_override: 35_000, estimated_input_tokens_after_override: 20_000,
  });
  assert.equal(check('The method is not robust across different domains and task-shifts.').quality_gate_result, 'passed');
  for (const statement of ['sk-example-test-token', 'Quoted "sk-example-test-token"', 'Bearer example-test-token']) {
    assert.ok(check(statement).blocker_codes.includes('COMPRESSION_FORBIDDEN_PERSISTED_PAYLOAD'));
  }
});

test('compression quality gate blocks when required risk gap and recheck facts are dropped', () => {
  const { profile, profile_hash } = resolvedProfile();
  const runtime = new TopicSelectionCompressionRuntimeService();
  const result = runtime.createReport({
    context_policy_profile: profile,
    context_policy_profile_hash: profile_hash,
    compression_report_ref: ref('artifact_ref', 'compression_report_002'),
    source_refs: [ref('artifact_ref', 'context_packet_001')],
    input_context: inputContext(),
    compressed_context: {
      source_refs: [ref('evidence_unit', 'support_001')],
      summary: 'Dropped some quality-gate facts.',
    },
    summary: 'Compressed but incomplete.',
    compression_executor_kind: 'codex_assisted',
    required_preserved_facts: requiredFacts(),
    compressed_preserved_facts: {
      blocker: ['NO_SOURCE_HEALTH_GAP'],
      residual_risk: [],
      accepted_risk: ['risk_scope_narrow'],
      source_health_warning: ['source_health_partial_coverage'],
      method_family_gap: [],
      unresolved_challenge: ['challenge_prior_art_boundary'],
      recheck_hint: [],
    },
    estimated_input_tokens_before_override: 1000,
    estimated_input_tokens_after_override: 300,
  });

  assert.equal(result.quality_gate_result, 'blocked');
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_RESIDUAL_RISK_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_METHOD_FAMILY_GAP_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_RECHECK_HINT_DROPPED'));
  assert.equal(result.report.quality_gate_result, 'blocked');
});

test('compression quality gate blocks when v1b N7 runtime support facts are dropped', () => {
  const failedTrialProfile = resolvedContextProfile({
    context_policy_profile_id:
      TOPIC_SELECTION_V1B_N7_CONTEXT_RUNTIME_PROFILE_IDS.failed_trial_synthesis,
    invocation_slot_id:
      TOPIC_SELECTION_V1B_N7_INVOCATION_SLOT_IDS.failed_trial_synthesis,
  });
  const debateAdmissionProfile = resolvedContextProfile({
    context_policy_profile_id:
      TOPIC_SELECTION_V1B_N7_CONTEXT_RUNTIME_PROFILE_IDS.n8_debate_admission_review,
    invocation_slot_id:
      TOPIC_SELECTION_V1B_N7_INVOCATION_SLOT_IDS.n8_debate_admission_review,
  });
  const groupingProfile = resolvedContextProfile({
    context_policy_profile_id:
      TOPIC_SELECTION_V1B_N7_CONTEXT_RUNTIME_PROFILE_IDS.candidate_grouping,
    invocation_slot_id:
      TOPIC_SELECTION_V1B_N7_INVOCATION_SLOT_IDS.candidate_grouping,
  });
  const runtime = new TopicSelectionCompressionRuntimeService();

  const failedTrialResult = runtime.createReport({
    context_policy_profile: failedTrialProfile.profile,
    context_policy_profile_hash: failedTrialProfile.profile_hash,
    compression_report_ref: ref('artifact_ref', 'compression_report_v1b_n7_failed_trial'),
    source_refs: [ref('artifact_ref', 'n7_failed_trial_context_packet')],
    input_context: {
      n8_feedback: ['feedback_ref_001'],
      loopback_target: 'topic-selection.v1b.N6',
      regeneration_hint: 'hint_needs_clearer_research_axis',
    },
    compressed_context: {
      summary: 'Dropped failed-trial loopback facts.',
    },
    summary: 'Incomplete failed-trial synthesis compression.',
    compression_executor_kind: 'codex_assisted',
    required_preserved_facts: v1bN7RequiredFacts(),
    compressed_preserved_facts: {
      blocker: ['N7_SUPPORT_GATE_REQUIRED'],
      residual_risk: ['risk_value_evidence_thin'],
      failed_candidate_identity: ['candidate_ref_002'],
    },
    estimated_input_tokens_before_override: 1000,
    estimated_input_tokens_after_override: 420,
  });

  assert.equal(failedTrialResult.quality_gate_result, 'blocked');
  assert.ok(failedTrialResult.blocker_codes.includes('COMPRESSION_REQUIRED_N8_FEEDBACK_DROPPED'));
  assert.ok(failedTrialResult.blocker_codes.includes('COMPRESSION_REQUIRED_LOOPBACK_TARGET_DROPPED'));
  assert.ok(failedTrialResult.blocker_codes.includes('COMPRESSION_REQUIRED_REGENERATION_HINT_DROPPED'));

  const debateAdmissionResult = runtime.createReport({
    context_policy_profile: debateAdmissionProfile.profile,
    context_policy_profile_hash: debateAdmissionProfile.profile_hash,
    compression_report_ref: ref('artifact_ref', 'compression_report_v1b_n7_debate_admission'),
    source_refs: [ref('artifact_ref', 'n7_debate_admission_context_packet')],
    input_context: {
      n8_gate_rejection_reason: 'novelty_gate_failed',
      debate_admission_need: 'need_additional_value_risk_review',
      value_risk_fact: 'risk_value_evidence_thin',
    },
    compressed_context: {
      summary: 'Dropped debate admission value-risk context.',
    },
    summary: 'Incomplete debate admission compression.',
    compression_executor_kind: 'codex_assisted',
    required_preserved_facts: v1bN7RequiredFacts(),
    compressed_preserved_facts: {
      candidate_identity: ['candidate_ref_001'],
      failed_contract_identity: ['contract_ref_001'],
    },
    estimated_input_tokens_before_override: 1000,
    estimated_input_tokens_after_override: 430,
  });

  assert.equal(debateAdmissionResult.quality_gate_result, 'blocked');
  assert.ok(
    debateAdmissionResult.blocker_codes.includes(
      'COMPRESSION_REQUIRED_N8_GATE_REJECTION_REASON_DROPPED',
    ),
  );
  assert.ok(
    debateAdmissionResult.blocker_codes.includes(
      'COMPRESSION_REQUIRED_DEBATE_ADMISSION_NEED_DROPPED',
    ),
  );
  assert.ok(debateAdmissionResult.blocker_codes.includes('COMPRESSION_REQUIRED_VALUE_RISK_FACT_DROPPED'));

  const groupingResult = runtime.createReport({
    context_policy_profile: groupingProfile.profile,
    context_policy_profile_hash: groupingProfile.profile_hash,
    compression_report_ref: ref('artifact_ref', 'compression_report_v1b_n7_grouping'),
    source_refs: [ref('artifact_ref', 'n7_grouping_context_packet')],
    input_context: {
      candidate_identity: ['candidate_ref_001'],
      candidate_order: ['candidate_ref_001', 'candidate_ref_002'],
      grouping_rationale: 'candidate_ref_001 has clearer research axis',
    },
    compressed_context: {
      summary: 'Dropped grouping identity facts.',
    },
    summary: 'Incomplete candidate grouping compression.',
    compression_executor_kind: 'codex_assisted',
    required_preserved_facts: {
      candidate_identity: ['candidate_ref_001'],
      candidate_order: ['candidate_ref_001', 'candidate_ref_002'],
      grouping_rationale: ['grouping_rationale_ref_001'],
    },
    compressed_preserved_facts: {
      priority_signal: ['higher_value'],
    },
    estimated_input_tokens_before_override: 1000,
    estimated_input_tokens_after_override: 390,
  });

  assert.equal(groupingResult.quality_gate_result, 'blocked');
  assert.ok(groupingResult.blocker_codes.includes('COMPRESSION_REQUIRED_CANDIDATE_IDENTITY_DROPPED'));
  assert.ok(groupingResult.blocker_codes.includes('COMPRESSION_REQUIRED_CANDIDATE_ORDER_DROPPED'));
  assert.ok(groupingResult.blocker_codes.includes('COMPRESSION_REQUIRED_GROUPING_RATIONALE_DROPPED'));
});

test('compression quality gate blocks when v1b N4 long-context facts are dropped', () => {
  const n4Profile = resolvedContextProfile({
    context_policy_profile_id:
      TOPIC_SELECTION_V1B_N4_CONTEXT_RUNTIME_PROFILE_IDS.research_slice_option_draft,
    invocation_slot_id:
      TOPIC_SELECTION_V1B_N4_INVOCATION_SLOT_IDS.research_slice_option_draft,
  });
  const runtime = new TopicSelectionCompressionRuntimeService();
  const result = runtime.createReport({
    context_policy_profile: n4Profile.profile,
    context_policy_profile_hash: n4Profile.profile_hash,
    compression_report_ref: ref('artifact_ref', 'compression_report_v1b_n4_long_context'),
    source_refs: [ref('artifact_ref', 'n4_research_slice_context_packet')],
    input_context: {
      frozen_n3_lineage: {
        n3_handoff_hash: 'n3_handoff_hash_001',
        intake_snapshot_hash: 'intake_snapshot_hash_001',
        constraint_profile_hash: 'constraint_profile_hash_001',
        intake_readiness_hash: 'intake_readiness_hash_001',
        planning_input_hash: 'planning_input_hash_001',
      },
      long_research_slice_context_chunks: Array.from({ length: 24 }, (_, index) => ({
        chunk_id: `slice_chunk_${index + 1}`,
        validated_need: 'validated_need_ref_hash_001',
        evidence_role_bundle: 'evidence_role_bundle_hash_001',
        evidence_ref: 'evidence_refs_hash_001',
        claim_ceiling: 'claim_ceiling_hash_001',
        non_goal: 'non_goal_promotion_001',
        blocker: 'blocker_slice_scope_unclear',
        residual_risk: 'risk_slice_too_broad',
        accepted_risk: 'accepted_risk_provider_variance',
        source_health_warning: 'source_health_partial_n4',
        method_family_gap: 'gap_method_family_runtime_only',
        unresolved_challenge: 'challenge_slice_overlap',
        recheck_hint: 'recheck_after_slice_selection',
        risk_gap_blocker_fact: 'gap_code_scope_boundary',
        memory_suggestion: 'memory_suggestion_ref_001',
      })),
    },
    compressed_context: {
      frozen_n3_lineage: {
        intake_snapshot_hash: 'intake_snapshot_hash_001',
      },
      summary:
        'Dropped N3 handoff, readiness, planning input, evidence, claim ceiling, non-goal, risk, and recheck facts.',
    },
    summary: 'Incomplete N4 long-context compression.',
    compression_executor_kind: 'codex_assisted',
    required_preserved_facts: v1bN4RequiredFacts(),
    compressed_preserved_facts: {
      intake_snapshot_identity: ['intake_snapshot_hash_001'],
      constraint_profile: ['constraint_profile_hash_001'],
      source_health_warning: ['source_health_partial_n4'],
    },
    estimated_input_tokens_before_override: 52_000,
    estimated_input_tokens_after_override: 11_000,
  });

  assert.equal(result.quality_gate_result, 'blocked');
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_BLOCKER_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_RESIDUAL_RISK_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_ACCEPTED_RISK_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_METHOD_FAMILY_GAP_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_UNRESOLVED_CHALLENGE_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_RECHECK_HINT_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_N3_HANDOFF_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_INTAKE_READINESS_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_VALIDATED_NEED_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_EVIDENCE_ROLE_BUNDLE_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_EVIDENCE_REF_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_CLAIM_CEILING_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_NON_GOAL_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_RISK_GAP_BLOCKER_FACT_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_MEMORY_SUGGESTION_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_PLANNING_INPUT_DROPPED'));
});

test('compression quality gate blocks v1b N4 adversarial persisted payloads', () => {
  const n4Profile = resolvedContextProfile({
    context_policy_profile_id:
      TOPIC_SELECTION_V1B_N4_CONTEXT_RUNTIME_PROFILE_IDS.research_slice_option_draft,
    invocation_slot_id:
      TOPIC_SELECTION_V1B_N4_INVOCATION_SLOT_IDS.research_slice_option_draft,
  });
  const runtime = new TopicSelectionCompressionRuntimeService();
  const result = runtime.createReport({
    context_policy_profile: n4Profile.profile,
    context_policy_profile_hash: n4Profile.profile_hash,
    compression_report_ref: ref('artifact_ref', 'compression_report_v1b_n4_adversarial_payload'),
    source_refs: [ref('artifact_ref', 'n4_research_slice_context_packet')],
    input_context: {
      n3_handoff_hash: 'n3_handoff_hash_001',
      planning_input_hash: 'planning_input_hash_001',
      evidence_refs_hash: 'evidence_refs_hash_001',
    },
    compressed_context: {
      preserved_hashes: ['n3_handoff_hash_001', 'planning_input_hash_001', 'evidence_refs_hash_001'],
      raw_provider_logs: ['provider request body must never persist in N4 compressed context'],
    },
    summary: 'Compressed N4 context with an adversarial raw provider log field.',
    compression_executor_kind: 'deterministic_structural',
    required_preserved_facts: v1bN4RequiredFacts(),
    compressed_preserved_facts: v1bN4RequiredFacts(),
    estimated_input_tokens_before_override: 22_000,
    estimated_input_tokens_after_override: 7_000,
  });

  assert.equal(result.quality_gate_result, 'blocked');
  assert.ok(result.blocker_codes.includes('COMPRESSION_FORBIDDEN_PERSISTED_PAYLOAD'));
  assert.match(result.warning_codes.join(' '), /compressed_payload\.raw_provider_logs/);
});

test('compression quality gate blocks when v1c N2 bounded debate long-context facts are dropped', () => {
  const n2Profile = resolvedContextProfile({
    context_policy_profile_id:
      TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_CONTEXT_RUNTIME_PROFILE_IDS.synthesizer_final,
    invocation_slot_id:
      TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_INVOCATION_SLOT_IDS.synthesizer_final,
  });
  const runtime = new TopicSelectionCompressionRuntimeService();
  const result = runtime.createReport({
    context_policy_profile: n2Profile.profile,
    context_policy_profile_hash: n2Profile.profile_hash,
    compression_report_ref: ref('artifact_ref', 'compression_report_v1c_n2_long_context'),
    source_refs: [ref('artifact_ref', 'n2_bounded_debate_context_packet')],
    input_context: {
      frozen_n1_handoff: {
        promotion_input_snapshot_hash: 'promotion_input_snapshot_hash_001',
        topic_package_ref_hash: 'topic_package_ref_hash_001',
        topic_question_contract_hash: 'topic_question_contract_hash_001',
        answerability_plan_hash: 'answerability_plan_hash_001',
        research_slice_hash: 'research_slice_hash_001',
      },
      long_debate_context_chunks: Array.from({ length: 24 }, (_, index) => ({
        chunk_id: `n2_chunk_${index + 1}`,
        selected_evidence: 'selected_evidence_hash_001',
        evidence_ref: 'evidence_ref_hash_001',
        claim_ceiling: 'claim_ceiling_hash_001',
        contribution_summary: 'contribution_summary_hash_001',
        evaluation_plan: 'evaluation_plan_hash_001',
        accepted_risk: 'accepted_risk_provider_variance',
        recheck_obligation: 'recheck_obligation_hash_001',
        memory_suggestion: 'memory_suggestion_hash_001',
        allowed_ref_manifest: 'allowed_ref_manifest_hash_001',
        critic_finding: 'critic_finding_hash_001',
        critic_resolution_map: 'critic_resolution_map_hash_001',
        readiness_coverage_item: 'readiness_coverage_hash_001',
      })),
    },
    compressed_context: {
      frozen_n1_handoff: {
        promotion_input_snapshot_hash: 'promotion_input_snapshot_hash_001',
      },
      summary: 'Dropped debate facts, allowed refs, critic resolution, readiness coverage, and recheck obligations.',
    },
    summary: 'Incomplete v1c N2 bounded debate compression.',
    compression_executor_kind: 'codex_assisted',
    required_preserved_facts: v1cN2RequiredFacts(),
    compressed_preserved_facts: {
      promotion_input_snapshot: ['promotion_input_snapshot_hash_001'],
      topic_package: ['topic_package_ref_hash_001'],
    },
    estimated_input_tokens_before_override: 52_000,
    estimated_input_tokens_after_override: 12_000,
  });

  assert.equal(result.quality_gate_result, 'blocked');
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_CLAIM_CEILING_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_CONTRIBUTION_SUMMARY_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_EVALUATION_PLAN_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_ACCEPTED_RISK_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_RECHECK_OBLIGATION_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_MEMORY_SUGGESTION_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_ALLOWED_REF_MANIFEST_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_CRITIC_FINDING_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_CRITIC_RESOLUTION_MAP_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_READINESS_COVERAGE_ITEM_DROPPED'));
});

test('compression quality gate blocks v1c N2 bounded debate adversarial persisted payloads', () => {
  const n2Profile = resolvedContextProfile({
    context_policy_profile_id:
      TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_CONTEXT_RUNTIME_PROFILE_IDS.promotion_supporter_draft,
    invocation_slot_id:
      TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_INVOCATION_SLOT_IDS.promotion_supporter_draft,
  });
  const runtime = new TopicSelectionCompressionRuntimeService();
  const result = runtime.createReport({
    context_policy_profile: n2Profile.profile,
    context_policy_profile_hash: n2Profile.profile_hash,
    compression_report_ref: ref('artifact_ref', 'compression_report_v1c_n2_adversarial_payload'),
    source_refs: [ref('artifact_ref', 'n2_bounded_debate_context_packet')],
    input_context: {
      promotion_input_snapshot_hash: 'promotion_input_snapshot_hash_001',
      topic_package_ref_hash: 'topic_package_ref_hash_001',
      selected_evidence_hash: 'selected_evidence_hash_001',
    },
    compressed_context: {
      preserved_hashes: ['promotion_input_snapshot_hash_001', 'topic_package_ref_hash_001'],
      raw_provider_logs: ['provider request body must never persist in N2 compressed context'],
    },
    summary: 'Compressed N2 context with an adversarial raw provider log field.',
    compression_executor_kind: 'deterministic_structural',
    required_preserved_facts: v1cN2RequiredFacts(),
    compressed_preserved_facts: v1cN2RequiredFacts(),
    estimated_input_tokens_before_override: 22_000,
    estimated_input_tokens_after_override: 7_000,
  });

  assert.equal(result.quality_gate_result, 'blocked');
  assert.ok(result.blocker_codes.includes('COMPRESSION_FORBIDDEN_PERSISTED_PAYLOAD'));
  assert.match(result.warning_codes.join(' '), /compressed_payload\.raw_provider_logs/);
});

test('compression quality gate blocks when v1c N4 delegated decision facts are dropped', () => {
  const n4Profile = resolvedContextProfile({
    context_policy_profile_id:
      TOPIC_SELECTION_V1C_N4_CONTEXT_RUNTIME_PROFILE_IDS.delegated_promotion_decision_candidate,
    invocation_slot_id:
      TOPIC_SELECTION_V1C_N4_INVOCATION_SLOT_IDS.delegated_promotion_decision_candidate,
  });
  const runtime = new TopicSelectionCompressionRuntimeService();
  const result = runtime.createReport({
    context_policy_profile: n4Profile.profile,
    context_policy_profile_hash: n4Profile.profile_hash,
    compression_report_ref: ref('artifact_ref', 'compression_report_v1c_n4_delegated_decision_long_context'),
    source_refs: [ref('artifact_ref', 'n4_delegated_decision_context_packet')],
    input_context: {
      n3_gate_lineage: {
        promotion_gate_check_ref_hash: 'promotion_gate_check_ref_hash_001',
        promotion_input_snapshot_hash: 'promotion_input_snapshot_hash_001',
        promotion_decision_support_ref_hash: 'promotion_decision_support_ref_hash_001',
        promotion_dossier_ref_hash: 'promotion_dossier_ref_hash_001',
        argument_readiness_mini_check_ref_hash: 'argument_readiness_mini_check_ref_hash_001',
      },
      long_decision_chunks: Array.from({ length: 24 }, (_, index) => ({
        chunk_id: `n4_chunk_${index + 1}`,
        gate_disposition: 'ready_for_human_decision',
        promote_allowed: 'promote_allowed_true',
        condition: 'condition_clarify_contribution_claim',
        required_action: 'required_action_hash_001',
        loopback_target: 'loopback_target_null',
        loopback_hint: 'loopback_hint_hash_001',
        accepted_risk: 'accepted_risk_provider_variance',
        claim_ceiling: 'claim_ceiling_hash_001',
        early_check_obligation: 'early_check_obligation_hash_001',
        allowed_ref_manifest: 'allowed_refs_hash_001',
        human_authority_boundary: 'explicit_human_acceptance_required',
        no_bridge_creation_boundary: 'n4_runtime_admission_cannot_create_n5_bridge',
        blocker: 'blocker_gate_condition_conflict',
        residual_risk: 'risk_human_decision_boundary',
        source_health_warning: 'source_health_partial_n4',
        method_family_gap: 'gap_n4_runtime_only_candidate',
        unresolved_challenge: 'challenge_human_authority_boundary',
        recheck_hint: 'recheck_before_bridge_materialization',
      })),
    },
    compressed_context: {
      n3_gate_lineage: {
        promotion_gate_check_ref_hash: 'promotion_gate_check_ref_hash_001',
      },
      summary:
        'Dropped N4 decision constraints, condition/action facts, allowed refs, and human/no-bridge boundaries.',
    },
    summary: 'Incomplete v1c N4 delegated decision compression.',
    compression_executor_kind: 'codex_assisted',
    required_preserved_facts: v1cN4RequiredFacts(),
    compressed_preserved_facts: {
      promotion_gate_handoff: ['promotion_gate_check_ref_hash_001'],
      promotion_input_snapshot: ['promotion_input_snapshot_hash_001'],
    },
    estimated_input_tokens_before_override: 46_000,
    estimated_input_tokens_after_override: 9_000,
  });

  assert.equal(result.quality_gate_result, 'blocked');
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_PROMOTION_DECISION_SUPPORT_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_PROMOTION_DOSSIER_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_ARGUMENT_READINESS_MINI_CHECK_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_PROMOTION_GATE_DISPOSITION_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_PROMOTE_ALLOWED_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_CONDITION_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_REQUIRED_ACTION_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_LOOPBACK_HINT_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_ACCEPTED_RISK_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_CLAIM_CEILING_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_EARLY_CHECK_OBLIGATION_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_ALLOWED_REF_MANIFEST_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_HUMAN_AUTHORITY_BOUNDARY_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_NO_BRIDGE_CREATION_BOUNDARY_DROPPED'));
});

test('compression quality gate blocks v1c N4 delegated decision adversarial persisted payloads', () => {
  const n4Profile = resolvedContextProfile({
    context_policy_profile_id:
      TOPIC_SELECTION_V1C_N4_CONTEXT_RUNTIME_PROFILE_IDS.delegated_promotion_decision_candidate,
    invocation_slot_id:
      TOPIC_SELECTION_V1C_N4_INVOCATION_SLOT_IDS.delegated_promotion_decision_candidate,
  });
  const runtime = new TopicSelectionCompressionRuntimeService();
  const result = runtime.createReport({
    context_policy_profile: n4Profile.profile,
    context_policy_profile_hash: n4Profile.profile_hash,
    compression_report_ref: ref('artifact_ref', 'compression_report_v1c_n4_delegated_decision_adversarial'),
    source_refs: [ref('artifact_ref', 'n4_delegated_decision_context_packet')],
    input_context: {
      promotion_gate_check_ref_hash: 'promotion_gate_check_ref_hash_001',
      promotion_input_snapshot_hash: 'promotion_input_snapshot_hash_001',
      allowed_ref_manifest: 'allowed_refs_hash_001',
      human_authority_boundary: 'explicit_human_acceptance_required',
      no_bridge_creation_boundary: 'n4_runtime_admission_cannot_create_n5_bridge',
    },
    compressed_context: {
      preserved_hashes: ['promotion_gate_check_ref_hash_001', 'promotion_input_snapshot_hash_001'],
      raw_provider_logs: ['provider request body must never persist in N4 delegated decision compressed context'],
    },
    summary: 'Compressed v1c N4 context with an adversarial raw provider log field.',
    compression_executor_kind: 'deterministic_structural',
    required_preserved_facts: v1cN4RequiredFacts(),
    compressed_preserved_facts: v1cN4RequiredFacts(),
    estimated_input_tokens_before_override: 24_000,
    estimated_input_tokens_after_override: 7_000,
  });

  assert.equal(result.quality_gate_result, 'blocked');
  assert.ok(result.blocker_codes.includes('COMPRESSION_FORBIDDEN_PERSISTED_PAYLOAD'));
  assert.match(result.warning_codes.join(' '), /compressed_payload\.raw_provider_logs/);
});

test('compression quality gate blocks when v1c N6 feedback normalization facts are dropped', () => {
  const n6Profile = resolvedContextProfile({
    context_policy_profile_id:
      TOPIC_SELECTION_V1C_N6_CONTEXT_RUNTIME_PROFILE_IDS.downstream_feedback_normalization,
    invocation_slot_id:
      TOPIC_SELECTION_V1C_N6_INVOCATION_SLOT_IDS.downstream_feedback_normalization,
  });
  const runtime = new TopicSelectionCompressionRuntimeService();
  const result = runtime.createReport({
    context_policy_profile: n6Profile.profile,
    context_policy_profile_hash: n6Profile.profile_hash,
    compression_report_ref: ref('artifact_ref', 'compression_report_v1c_n6_feedback_long_context'),
    source_refs: [ref('artifact_ref', 'n6_downstream_feedback_context_packet')],
    input_context: {
      bridge_lineage: {
        bridge_payload_hash: 'bridge_payload_hash_001',
        source_promotion_decision_hash: 'promotion_decision_ref_hash_001',
        promotion_commitment_profile_hash: 'promotion_commitment_profile_ref_hash_001',
        promotion_input_snapshot_hash: 'promotion_input_snapshot_hash_001',
      },
      long_feedback_chunks: Array.from({ length: 24 }, (_, index) => ({
        chunk_id: `feedback_chunk_${index + 1}`,
        downstream_source_ref: 'downstream_source_ref_hash_001',
        source_feedback_ref: 'source_feedback_refs_hash_001',
        feedback_signal: 'need_invalidated',
        required_action: 'recheck_validated_need',
        affected_ref: 'validated_need_ref_hash_001',
        loopback_target: 'validated_need',
        severity: 'critical',
        no_upstream_mutation_boundary: 'record_only_no_n1_to_n5_auto_loop',
        allowed_ref_manifest: 'allowed_refs_hash_001',
        blocker: 'blocker_downstream_feedback_conflict',
        residual_risk: 'risk_feedback_source_ambiguous',
        accepted_risk: 'accepted_risk_record_only_feedback',
        source_health_warning: 'source_health_partial_downstream_feedback',
        method_family_gap: 'gap_downstream_signal_runtime_only',
        unresolved_challenge: 'challenge_feedback_authority_boundary',
        recheck_hint: 'recheck_validated_need_before_downstream_continue',
      })),
    },
    compressed_context: {
      bridge_lineage: {
        bridge_payload_hash: 'bridge_payload_hash_001',
      },
      summary:
        'Dropped promotion lineage, feedback source refs, routing hints, mutation boundary, and allowed-ref manifest.',
    },
    summary: 'Incomplete v1c N6 downstream feedback compression.',
    compression_executor_kind: 'codex_assisted',
    required_preserved_facts: v1cN6RequiredFacts(),
    compressed_preserved_facts: {
      paper_project_bridge: ['bridge_payload_hash_001'],
      downstream_source_ref: ['downstream_source_ref_hash_001'],
    },
    estimated_input_tokens_before_override: 48_000,
    estimated_input_tokens_after_override: 10_000,
  });

  assert.equal(result.quality_gate_result, 'blocked');
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_BLOCKER_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_RESIDUAL_RISK_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_ACCEPTED_RISK_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_METHOD_FAMILY_GAP_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_UNRESOLVED_CHALLENGE_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_RECHECK_HINT_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_SOURCE_PROMOTION_DECISION_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_PROMOTION_COMMITMENT_PROFILE_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_PROMOTION_INPUT_SNAPSHOT_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_SOURCE_FEEDBACK_REF_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_FEEDBACK_SIGNAL_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_REQUIRED_ACTION_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_AFFECTED_REF_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_LOOPBACK_TARGET_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_SEVERITY_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_NO_UPSTREAM_MUTATION_BOUNDARY_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_ALLOWED_REF_MANIFEST_DROPPED'));
});

test('compression quality gate blocks v1c N6 adversarial persisted payloads', () => {
  const n6Profile = resolvedContextProfile({
    context_policy_profile_id:
      TOPIC_SELECTION_V1C_N6_CONTEXT_RUNTIME_PROFILE_IDS.downstream_feedback_normalization,
    invocation_slot_id:
      TOPIC_SELECTION_V1C_N6_INVOCATION_SLOT_IDS.downstream_feedback_normalization,
  });
  const runtime = new TopicSelectionCompressionRuntimeService();
  const result = runtime.createReport({
    context_policy_profile: n6Profile.profile,
    context_policy_profile_hash: n6Profile.profile_hash,
    compression_report_ref: ref('artifact_ref', 'compression_report_v1c_n6_feedback_adversarial_payload'),
    source_refs: [ref('artifact_ref', 'n6_downstream_feedback_context_packet')],
    input_context: {
      bridge_payload_hash: 'bridge_payload_hash_001',
      downstream_source_ref: 'downstream_source_ref_hash_001',
      allowed_ref_manifest: 'allowed_refs_hash_001',
    },
    compressed_context: {
      preserved_hashes: ['bridge_payload_hash_001', 'downstream_source_ref_hash_001'],
      raw_provider_logs: ['provider request body must never persist in N6 feedback compressed context'],
    },
    summary: 'Compressed v1c N6 context with an adversarial raw provider log field.',
    compression_executor_kind: 'deterministic_structural',
    required_preserved_facts: v1cN6RequiredFacts(),
    compressed_preserved_facts: v1cN6RequiredFacts(),
    estimated_input_tokens_before_override: 24_000,
    estimated_input_tokens_after_override: 7_000,
  });

  assert.equal(result.quality_gate_result, 'blocked');
  assert.ok(result.blocker_codes.includes('COMPRESSION_FORBIDDEN_PERSISTED_PAYLOAD'));
  assert.match(result.warning_codes.join(' '), /compressed_payload\.raw_provider_logs/);
});

test('compression quality gate blocks when v1b N6 long-context facts are dropped', () => {
  const n6Profile = resolvedContextProfile({
    context_policy_profile_id:
      TOPIC_SELECTION_V1B_N6_CONTEXT_RUNTIME_PROFILE_IDS.question_candidate_draft,
    invocation_slot_id:
      TOPIC_SELECTION_V1B_N6_INVOCATION_SLOT_IDS.question_candidate_draft,
  });
  const runtime = new TopicSelectionCompressionRuntimeService();
  const result = runtime.createReport({
    context_policy_profile: n6Profile.profile,
    context_policy_profile_hash: n6Profile.profile_hash,
    compression_report_ref: ref('artifact_ref', 'compression_report_v1b_n6_long_context'),
    source_refs: [ref('artifact_ref', 'n6_question_candidate_context_packet')],
    input_context: {
      frozen_n5_lineage: {
        n5_handoff_hash: 'n5_handoff_hash_001',
        selected_slice_ref: 'research_slice_ref_001',
        selected_option_ref: 'selected_option_ref_001',
        option_set_ref: 'option_set_ref_001',
      },
      long_context_chunks: Array.from({ length: 20 }, (_, index) => ({
        chunk_id: `chunk_${index + 1}`,
        evidence_ref: 'evidence_ref_001',
        boundary_ref: 'boundary_ref_001',
        assumption_ref: 'assumption_ref_001',
        blocker: 'blocker_candidate_scope_unclear',
        risk_note: 'risk_context_thin',
        accepted_risk: 'accepted_risk_provider_variance',
        method_family_gap: 'gap_method_family_runtime_only',
        unresolved_challenge: 'challenge_candidate_overlap',
        recheck_hint: 'recheck_after_value_trial',
        n7_loopback_projection: 'n7_loopback_projection_hash_001',
        n6_gate_failure_projection: 'n6_gate_failure_projection_hash_001',
        failed_draft_identity: 'failed_draft_hash_001',
        blocked_candidate_context: 'blocked_candidate_context_hash_001',
        failed_trial_synthesis: 'failed_trial_synthesis_hash_001',
        exhausted_candidate_ref: 'topic_question_candidate_failed_001',
        exhausted_candidate_hash: 'failed_candidate_hash_001',
        candidate_order: 'candidate_order_hash_001',
        failure_reason_code: 'value_not_supported',
        regeneration_hint: 'hint_add_stronger_value_evidence',
        loopback_target: 'n6_regenerate_candidates',
        n8_feedback: 'n8_feedback_hash_001',
      })),
    },
    compressed_context: {
      frozen_n5_lineage: {
        selected_slice_ref: 'research_slice_ref_001',
        selected_option_ref: 'selected_option_ref_001',
      },
      summary: 'Dropped N5 handoff, option set, evidence, boundary, assumption, claim ceiling, non-goal, and recheck facts.',
    },
    summary: 'Incomplete N6 long-context compression.',
    compression_executor_kind: 'codex_assisted',
    required_preserved_facts: v1bN6RequiredFacts(),
    compressed_preserved_facts: {
      selected_slice_identity: ['research_slice_ref_001'],
      selected_option_identity: ['selected_option_ref_001'],
      constraint_profile: ['constraint_profile_ref_001'],
      intake_readiness: ['intake_readiness_ref_001'],
      source_health_warning: ['source_health_partial'],
      residual_risk: ['risk_context_thin'],
    },
    estimated_input_tokens_before_override: 48_000,
    estimated_input_tokens_after_override: 12_000,
  });

  assert.equal(result.quality_gate_result, 'blocked');
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_BLOCKER_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_N5_HANDOFF_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_OPTION_SET_IDENTITY_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_EVIDENCE_REF_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_BOUNDARY_REF_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_ASSUMPTION_REF_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_CLAIM_CEILING_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_NON_GOAL_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_ACCEPTED_RISK_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_METHOD_FAMILY_GAP_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_UNRESOLVED_CHALLENGE_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_RECHECK_HINT_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_N7_LOOPBACK_PROJECTION_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_N6_GATE_FAILURE_PROJECTION_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_FAILED_DRAFT_IDENTITY_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_BLOCKED_CANDIDATE_CONTEXT_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_FAILED_TRIAL_SYNTHESIS_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_EXHAUSTED_CANDIDATE_REF_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_EXHAUSTED_CANDIDATE_HASH_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_CANDIDATE_ORDER_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_FAILURE_REASON_CODE_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_REGENERATION_HINT_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_LOOPBACK_TARGET_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_N8_FEEDBACK_DROPPED'));
});

test('compression quality gate blocks when v1b N6 loopback triage facts are dropped', () => {
  const triageProfile = resolvedContextProfile({
    context_policy_profile_id:
      TOPIC_SELECTION_V1B_N6_CONTEXT_RUNTIME_PROFILE_IDS.loopback_triage,
    invocation_slot_id:
      TOPIC_SELECTION_V1B_N6_INVOCATION_SLOT_IDS.loopback_triage,
  });
  const runtime = new TopicSelectionCompressionRuntimeService();
  const result = runtime.createReport({
    context_policy_profile: triageProfile.profile,
    context_policy_profile_hash: triageProfile.profile_hash,
    compression_report_ref: ref('artifact_ref', 'compression_report_v1b_n6_loopback_triage'),
    source_refs: [ref('artifact_ref', 'n6_loopback_triage_context_packet')],
    input_context: {
      failed_draft_identity: 'failed_draft_hash_001',
      blocked_candidate_context: 'blocked_candidate_context_hash_001',
      dominant_reason_code: 'not_answerable',
      affected_ref: 'research_slice_ref_001',
      loopback_target: 'n6_debate_escalation',
      debate_escalation: 'mixed_cost_control',
      upstream_rollback: 'select_different_slice',
    },
    compressed_context: {
      summary: 'Dropped failed draft, blocked candidate, and loopback routing facts.',
    },
    summary: 'Incomplete N6 loopback triage compression.',
    compression_executor_kind: 'codex_assisted',
    required_preserved_facts: v1bN6LoopbackTriageRequiredFacts(),
    compressed_preserved_facts: {
      selected_slice_identity: ['research_slice_ref_001'],
      n5_handoff: ['n5_handoff_hash_001'],
    },
    estimated_input_tokens_before_override: 16_000,
    estimated_input_tokens_after_override: 4_000,
  });

  assert.equal(result.quality_gate_result, 'blocked');
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_FAILED_DRAFT_IDENTITY_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_BLOCKED_CANDIDATE_CONTEXT_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_DOMINANT_REASON_CODE_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_AFFECTED_REF_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_REGENERATION_HINT_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_DEBATE_ESCALATION_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_UPSTREAM_ROLLBACK_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_LOOPBACK_TARGET_DROPPED'));
});

test('compression quality gate blocks v1b N6 adversarial persisted payloads', () => {
  const n6Profile = resolvedContextProfile({
    context_policy_profile_id:
      TOPIC_SELECTION_V1B_N6_CONTEXT_RUNTIME_PROFILE_IDS.question_candidate_draft,
    invocation_slot_id:
      TOPIC_SELECTION_V1B_N6_INVOCATION_SLOT_IDS.question_candidate_draft,
  });
  const runtime = new TopicSelectionCompressionRuntimeService();
  const result = runtime.createReport({
    context_policy_profile: n6Profile.profile,
    context_policy_profile_hash: n6Profile.profile_hash,
    compression_report_ref: ref('artifact_ref', 'compression_report_v1b_n6_adversarial_payload'),
    source_refs: [ref('artifact_ref', 'n6_question_candidate_context_packet')],
    input_context: {
      n5_handoff_hash: 'n5_handoff_hash_001',
      selected_slice_ref: 'research_slice_ref_001',
      evidence_ref: 'evidence_ref_001',
    },
    compressed_context: {
      preserved_refs: ['research_slice_ref_001', 'evidence_ref_001'],
      raw_provider_logs: ['provider request body must never persist here'],
    },
    summary: 'Compressed context with an adversarial raw provider log field.',
    compression_executor_kind: 'deterministic_structural',
    required_preserved_facts: v1bN6RequiredFacts(),
    compressed_preserved_facts: v1bN6RequiredFacts(),
    estimated_input_tokens_before_override: 20_000,
    estimated_input_tokens_after_override: 8_000,
  });

  assert.equal(result.quality_gate_result, 'blocked');
  assert.ok(result.blocker_codes.includes('COMPRESSION_FORBIDDEN_PERSISTED_PAYLOAD'));
  assert.match(result.warning_codes.join(' '), /compressed_payload\.raw_provider_logs/);
});

test('compression quality gate blocks when v1b N8 long-context facts are dropped', () => {
  const n8Profile = resolvedContextProfile({
    context_policy_profile_id:
      TOPIC_SELECTION_V1B_N8_CONTEXT_RUNTIME_PROFILE_IDS.value_assessment_draft,
    invocation_slot_id:
      TOPIC_SELECTION_V1B_N8_INVOCATION_SLOT_IDS.value_assessment_draft,
  });
  const runtime = new TopicSelectionCompressionRuntimeService();
  const result = runtime.createReport({
    context_policy_profile: n8Profile.profile,
    context_policy_profile_hash: n8Profile.profile_hash,
    compression_report_ref: ref('artifact_ref', 'compression_report_v1b_n8_long_context'),
    source_refs: [ref('artifact_ref', 'n8_value_assessment_context_packet')],
    input_context: {
      frozen_n7_lineage: {
        n7_handoff_hash: 'n7_handoff_hash_001',
        projection_hash: 'n7_to_n8_projection_hash_001',
        topic_question_hash: 'topic_question_hash_001',
        topic_question_contract_hash: 'topic_question_contract_hash_001',
        active_candidate_hash: 'active_candidate_hash_001',
        answerability_plan_hash: 'answerability_plan_hash_001',
        trial_ledger_hash: 'trial_ledger_hash_001',
      },
      long_value_context_chunks: Array.from({ length: 24 }, (_, index) => ({
        chunk_id: `value_chunk_${index + 1}`,
        selected_slice_identity: 'research_slice_hash_001',
        candidate_set_identity: 'candidate_set_hash_001',
        value_rationale: 'value_rationale_fact_001',
        support_quality: 'support_quality_fact_001',
        reviewer_uncertainty: 'reviewer_uncertainty_fact_001',
        risk_gap_blocker_fact: 'risk_gap_blocker_fact_001',
        feedback_recheck_hint: 'feedback_recheck_hint_001',
        blocker: 'blocker_value_evidence_missing',
        residual_risk: 'risk_provider_quality_drift',
        accepted_risk: 'accepted_risk_bounded_claim',
        source_health_warning: 'source_health_partial_value_evidence',
        method_family_gap: 'gap_value_measurement_baseline',
        unresolved_challenge: 'challenge_reviewer_uncertainty',
        recheck_hint: 'recheck_after_n8_feedback',
      })),
    },
    compressed_context: {
      frozen_n7_lineage: {
        topic_question_contract_hash: 'topic_question_contract_hash_001',
      },
      summary: 'Dropped projection, candidate, trial ledger, value rationale, uncertainty, risk, and feedback facts.',
    },
    summary: 'Incomplete N8 long-context compression.',
    compression_executor_kind: 'codex_assisted',
    required_preserved_facts: v1bN8RequiredFacts(),
    compressed_preserved_facts: {
      topic_question_contract: ['topic_question_contract_hash_001'],
      selected_slice_identity: ['research_slice_hash_001'],
      source_health_warning: ['source_health_partial_value_evidence'],
    },
    estimated_input_tokens_before_override: 54_000,
    estimated_input_tokens_after_override: 13_000,
  });

  assert.equal(result.quality_gate_result, 'blocked');
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_BLOCKER_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_RESIDUAL_RISK_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_ACCEPTED_RISK_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_METHOD_FAMILY_GAP_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_UNRESOLVED_CHALLENGE_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_RECHECK_HINT_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_N7_HANDOFF_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_N7_TO_N8_PROJECTION_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_TOPIC_QUESTION_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_ACTIVE_CANDIDATE_IDENTITY_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_ANSWERABILITY_PLAN_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_TRIAL_LEDGER_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_CANDIDATE_SET_IDENTITY_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_VALUE_RATIONALE_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_SUPPORT_QUALITY_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_REVIEWER_UNCERTAINTY_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_RISK_GAP_BLOCKER_FACT_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_FEEDBACK_RECHECK_HINT_DROPPED'));
});

test('compression quality gate blocks v1b N8 adversarial persisted payloads', () => {
  const n8Profile = resolvedContextProfile({
    context_policy_profile_id:
      TOPIC_SELECTION_V1B_N8_CONTEXT_RUNTIME_PROFILE_IDS.value_assessment_draft,
    invocation_slot_id:
      TOPIC_SELECTION_V1B_N8_INVOCATION_SLOT_IDS.value_assessment_draft,
  });
  const runtime = new TopicSelectionCompressionRuntimeService();
  const result = runtime.createReport({
    context_policy_profile: n8Profile.profile,
    context_policy_profile_hash: n8Profile.profile_hash,
    compression_report_ref: ref('artifact_ref', 'compression_report_v1b_n8_adversarial_payload'),
    source_refs: [ref('artifact_ref', 'n8_value_assessment_context_packet')],
    input_context: {
      n7_handoff_hash: 'n7_handoff_hash_001',
      projection_hash: 'n7_to_n8_projection_hash_001',
      topic_question_contract_hash: 'topic_question_contract_hash_001',
    },
    compressed_context: {
      preserved_hashes: ['n7_handoff_hash_001', 'n7_to_n8_projection_hash_001'],
      raw_provider_logs: ['provider request body must never persist in N8 compressed context'],
    },
    summary: 'Compressed N8 context with an adversarial raw provider log field.',
    compression_executor_kind: 'deterministic_structural',
    required_preserved_facts: v1bN8RequiredFacts(),
    compressed_preserved_facts: v1bN8RequiredFacts(),
    estimated_input_tokens_before_override: 24_000,
    estimated_input_tokens_after_override: 7_000,
  });

  assert.equal(result.quality_gate_result, 'blocked');
  assert.ok(result.blocker_codes.includes('COMPRESSION_FORBIDDEN_PERSISTED_PAYLOAD'));
  assert.match(result.warning_codes.join(' '), /compressed_payload\.raw_provider_logs/);
});

test('compression quality gate blocks when resource-sampling classification facts are dropped', () => {
  const resourceSamplingProfile = resolvedContextProfile({
    context_policy_profile_id:
      TOPIC_SELECTION_RESOURCE_SAMPLING_CONTEXT_RUNTIME_PROFILE_IDS.literature_classification_batch,
    invocation_slot_id:
      TOPIC_SELECTION_RESOURCE_SAMPLING_INVOCATION_SLOT_IDS.literature_classification_batch,
  });
  const runtime = new TopicSelectionCompressionRuntimeService();
  const result = runtime.createReport({
    context_policy_profile: resourceSamplingProfile.profile,
    context_policy_profile_hash: resourceSamplingProfile.profile_hash,
    compression_report_ref: ref('artifact_ref', 'compression_report_resource_sampling_long_context'),
    source_refs: [ref('artifact_ref', 'resource_sampling_context_packet')],
    input_context: {
      batch_context: {
        topic_id: 'topic_provider_canary_resource_sampling',
        sample_role_targets: 'support_1_challenge_1_baseline_1_context_1',
        candidates: Array.from({ length: 32 }, (_, index) => ({
          candidate_id: `candidate_${index + 1}`,
          literature_ref_hash: 'literature_ref_hash_001',
          title_hash: 'candidate_title_hash_001',
          abstract_hash: 'candidate_abstract_hash_001',
          key_content_digest_hash: 'key_content_digest_hash_001',
          activation_score: 'activation_score_091',
          source_count: 'source_count_1',
          guardrail_signal: 'guardrail_signal_canonicalized_support',
        })),
      },
    },
    compressed_context: {
      topic_id: 'topic_provider_canary_resource_sampling',
      summary:
        'Dropped candidate identity, abstract/digest, classification rationale, method family, and guardrail signal.',
    },
    summary: 'Incomplete resource-sampling classification compression.',
    compression_executor_kind: 'codex_assisted',
    required_preserved_facts: resourceSamplingRequiredFacts(),
    compressed_preserved_facts: {
      topic_id: ['topic_provider_canary_resource_sampling'],
      sample_role_targets: ['support_1_challenge_1_baseline_1_context_1'],
      source_count: ['source_count_1'],
    },
    estimated_input_tokens_before_override: 42_000,
    estimated_input_tokens_after_override: 10_000,
  });

  assert.equal(result.quality_gate_result, 'blocked');
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_LITERATURE_REF_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_CANDIDATE_ABSTRACT_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_KEY_CONTENT_DIGEST_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_ROLE_CLASSIFICATION_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_CLASSIFICATION_RATIONALE_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_METHOD_FAMILY_DROPPED'));
  assert.ok(result.blocker_codes.includes('COMPRESSION_REQUIRED_GUARDRAIL_SIGNAL_DROPPED'));
});

test('compression quality gate blocks resource-sampling adversarial persisted payloads', () => {
  const resourceSamplingProfile = resolvedContextProfile({
    context_policy_profile_id:
      TOPIC_SELECTION_RESOURCE_SAMPLING_CONTEXT_RUNTIME_PROFILE_IDS.literature_classification_batch,
    invocation_slot_id:
      TOPIC_SELECTION_RESOURCE_SAMPLING_INVOCATION_SLOT_IDS.literature_classification_batch,
  });
  const runtime = new TopicSelectionCompressionRuntimeService();
  const result = runtime.createReport({
    context_policy_profile: resourceSamplingProfile.profile,
    context_policy_profile_hash: resourceSamplingProfile.profile_hash,
    compression_report_ref: ref('artifact_ref', 'compression_report_resource_sampling_adversarial_payload'),
    source_refs: [ref('artifact_ref', 'resource_sampling_context_packet')],
    input_context: {
      literature_ref_hash: 'literature_ref_hash_001',
      classification_rationale_hash: 'classification_rationale_hash_001',
      guardrail_signal: 'guardrail_signal_canonicalized_support',
    },
    compressed_context: {
      preserved_hashes: [
        'literature_ref_hash_001',
        'classification_rationale_hash_001',
        'guardrail_signal_canonicalized_support',
      ],
      raw_provider_logs: ['provider request body must never persist in resource-sampling compressed context'],
    },
    summary: 'Compressed resource-sampling context with an adversarial raw provider log field.',
    compression_executor_kind: 'deterministic_structural',
    required_preserved_facts: resourceSamplingRequiredFacts(),
    compressed_preserved_facts: resourceSamplingRequiredFacts(),
    estimated_input_tokens_before_override: 22_000,
    estimated_input_tokens_after_override: 7_000,
  });

  assert.equal(result.quality_gate_result, 'blocked');
  assert.ok(result.blocker_codes.includes('COMPRESSION_FORBIDDEN_PERSISTED_PAYLOAD'));
  assert.match(result.warning_codes.join(' '), /compressed_payload\.raw_provider_logs/);
});

test('compression quality gate blocks forbidden hidden reasoning raw logs and secrets', () => {
  const { profile, profile_hash } = resolvedProfile();
  const runtime = new TopicSelectionCompressionRuntimeService();
  const result = runtime.createReport({
    context_policy_profile: profile,
    context_policy_profile_hash: profile_hash,
    compression_report_ref: ref('artifact_ref', 'compression_report_003'),
    source_refs: [ref('artifact_ref', 'context_packet_001')],
    input_context: inputContext(),
    compressed_context: {
      hidden_reasoning: 'do not persist this',
      source_refs: [ref('evidence_unit', 'support_001')],
    },
    summary: 'Bearer sk-test-secret',
    compression_executor_kind: 'deterministic_structural',
    required_preserved_facts: requiredFacts(),
    compressed_preserved_facts: requiredFacts(),
    estimated_input_tokens_before_override: 1000,
    estimated_input_tokens_after_override: 200,
  });

  assert.equal(result.quality_gate_result, 'blocked');
  assert.ok(result.blocker_codes.includes('COMPRESSION_FORBIDDEN_PERSISTED_PAYLOAD'));
  assert.match(result.warning_codes.join(' '), /compressed_payload\.hidden_reasoning/);
});

test('compression runtime rejects source profile executor and redaction drift before report creation', () => {
  const { profile, profile_hash } = resolvedProfile();
  const runtime = new TopicSelectionCompressionRuntimeService();

  assert.throws(
    () => runtime.createReport({
      context_policy_profile: profile,
      context_policy_profile_hash: profile_hash,
      compression_report_ref: ref('artifact_ref', 'compression_report_004'),
      source_refs: [],
      input_context: inputContext(),
      compressed_context: compressedContext(),
      summary: 'summary',
      compression_executor_kind: 'deterministic_structural',
    }),
    (error: unknown) => error instanceof AppError && error.errorCode === 'INVALID_PAYLOAD',
  );

  assert.throws(
    () => runtime.createReport({
      context_policy_profile: profile,
      context_policy_profile_hash: 'a'.repeat(64),
      compression_report_ref: ref('artifact_ref', 'compression_report_005'),
      source_refs: [ref('artifact_ref', 'context_packet_001')],
      input_context: inputContext(),
      compressed_context: compressedContext(),
      summary: 'summary',
      compression_executor_kind: 'deterministic_structural',
    }),
    (error: unknown) => error instanceof AppError && error.errorCode === 'INVALID_PAYLOAD',
  );

  const deterministicOnlyProfile: TopicSelectionContextPolicyProfile = {
    ...profile,
    compression_policy: {
      ...profile.compression_policy,
      allowed_executor_kinds: ['deterministic_structural'],
    },
  };
  assert.throws(
    () => runtime.createReport({
      context_policy_profile: deterministicOnlyProfile,
      context_policy_profile_hash: profileHash(deterministicOnlyProfile),
      compression_report_ref: ref('artifact_ref', 'compression_report_006'),
      source_refs: [ref('artifact_ref', 'context_packet_001')],
      input_context: inputContext(),
      compressed_context: compressedContext(),
      summary: 'summary',
      compression_executor_kind: 'codex_assisted',
    }),
    (error: unknown) => error instanceof AppError && error.errorCode === 'INVALID_PAYLOAD',
  );

  assert.throws(
    () => runtime.createReport({
      context_policy_profile: profile,
      context_policy_profile_hash: profile_hash,
      compression_report_ref: ref('artifact_ref', 'compression_report_007'),
      source_refs: [ref('artifact_ref', 'context_packet_001')],
      input_context: inputContext(),
      compressed_context: compressedContext(),
      summary: 'summary',
      compression_executor_kind: 'deterministic_structural',
      redaction_policy: 'unredacted',
    }),
    (error: unknown) => error instanceof AppError && error.errorCode === 'INVALID_PAYLOAD',
  );
});

test('compression runtime warns when token estimate is not reduced', () => {
  const { profile, profile_hash } = resolvedProfile();
  const runtime = new TopicSelectionCompressionRuntimeService();
  const result = runtime.createReport({
    context_policy_profile: profile,
    context_policy_profile_hash: profile_hash,
    compression_report_ref: ref('artifact_ref', 'compression_report_008'),
    source_refs: [ref('artifact_ref', 'context_packet_001')],
    input_context: inputContext(),
    compressed_context: compressedContext(),
    summary: 'summary',
    compression_executor_kind: 'deterministic_structural',
    required_preserved_facts: requiredFacts(),
    compressed_preserved_facts: requiredFacts(),
    estimated_input_tokens_before_override: 100,
    estimated_input_tokens_after_override: 100,
  });

  assert.equal(result.quality_gate_result, 'warned');
  assert.deepEqual(result.blocker_codes, []);
  assert.deepEqual(result.warning_codes, ['COMPRESSION_DID_NOT_REDUCE_TOKEN_ESTIMATE']);
});
