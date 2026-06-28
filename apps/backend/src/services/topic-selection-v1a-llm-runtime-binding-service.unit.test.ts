import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionBuildEvidenceMapNodeInput,
  TopicSelectionEvidenceMapExtractionContextPacket,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-evidence-map-contracts';
import type {
  TopicSelectionSearchRunHandoff,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-search-resource-contracts';
import type {
  HumanConfirmationSemanticReviewContextPacket,
  TopicSelectionNeedCandidateReadinessAssessmentRecord,
  TopicSelectionNeedCandidateRecord,
  TopicSelectionValidationDecisionSupportPacketRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-need-validation-contracts';
import {
  TOPIC_SELECTION_V1A_N5_INVOCATION_SLOT_IDS,
  TOPIC_SELECTION_V1A_N7_INVOCATION_SLOT_IDS,
  TOPIC_SELECTION_V1A_N8_INVOCATION_SLOT_IDS,
} from './topic-selection-context-policy-profile-registry-service.js';
import {
  TopicSelectionV1aLlmRuntimeBindingService,
} from './topic-selection-v1a-llm-runtime-binding-service.js';
import { sha256Text } from './literature-content-processing-utils.js';

function ref(
  refType: string,
  refId: string,
  versionId: string | null = null,
): TopicSelectionFunctionalRef {
  return {
    ref_type: refType,
    ref_id: refId,
    version_id: versionId,
    title_card_id: 'title_card_001',
  };
}

function searchRunHandoff(): TopicSelectionSearchRunHandoff {
  return {
    schema_version: 'TopicSelectionSearchRunHandoff@v1',
    workflow_run_id: 'workflow_run_n4',
    node_attempt_id: 'node_attempt_n4',
    handoff_ref: ref('workflow_handoff', 'handoff_n4'),
    title_card_ref: ref('title_card', 'title_card_001'),
    search_run_ref: ref('search_run', 'search_run_001'),
    search_plan_ref: ref('search_plan', 'search_plan_001', 'v1'),
    literature_resource_pool_snapshot_ref: ref('literature_resource_pool_snapshot', 'snapshot_001', 'v1'),
    literature_snapshot_hash: 'snapshot_hash_001',
    coverage_row_intent_refs: [ref('coverage_row_intent', 'coverage_001')],
    evidence_map_input_refs: [ref('literature_record', 'lit_001')],
    coverage_binding_refs: [ref('coverage_evidence_binding', 'binding_001')],
    coverage_assessment_refs: [ref('coverage_assessment', 'assessment_001')],
    risk_acceptance_refs: [],
    coverage_role_expectations: [],
    method_family_targets: ['retrieval_augmented_generation'],
    result_accounting_summary: {},
    source_health_summary: {
      source_count: 1,
      failed_source_count: 0,
      warning_codes: [],
    },
    policy_version: 'v1',
    output_schema_version: 'v1',
  } as unknown as TopicSelectionSearchRunHandoff;
}

function extractionContextPacket(): TopicSelectionEvidenceMapExtractionContextPacket {
  return {
    schema_version: 'TopicSelectionEvidenceMapExtractionContextPacket@v1',
    workflow_run_id: 'workflow_run_n5',
    node_attempt_id: 'node_attempt_n5',
    search_run_handoff_ref: ref('workflow_handoff', 'handoff_n4'),
    search_run_handoff_hash: 'handoff_hash_001',
    input_refs_hash: 'input_refs_hash_001',
    execution_mode: 'provider_llm',
    extraction_scope: {
      literature_count: 1,
      coverage_row_count: 1,
    },
    source_refs: [ref('literature_record', 'lit_001')],
    blocker_codes: [],
    residual_risk_refs: [],
    source_health_warning_codes: [],
    method_family_gap_codes: [],
    unresolved_challenge_refs: [],
    recheck_hint_refs: [],
  } as unknown as TopicSelectionEvidenceMapExtractionContextPacket;
}

function candidate(): TopicSelectionNeedCandidateRecord {
  return {
    need_candidate_id: 'need_candidate_001',
    title_card_id: 'title_card_001',
    candidate_version: 'v1',
    candidate_need: 'Need a reviewer-auditable RAG adaptation boundary.',
    unmet_need_statement: 'Existing evidence lacks bounded adaptation guidance.',
    mechanism_type: 'workflow_gap',
    prior_art_status: 'partial',
    gap_codes: ['METHOD_FAMILY_COVERAGE_GAP'],
    accepted_risk_refs: [],
    unresolved_challenge_refs: [ref('evidence_unit', 'challenge_001')],
    open_recheck_request_refs: [ref('searchplan_recheck_request', 'recheck_001')],
  } as unknown as TopicSelectionNeedCandidateRecord;
}

function readiness(): TopicSelectionNeedCandidateReadinessAssessmentRecord {
  return {
    readiness_assessment_id: 'readiness_001',
    title_card_id: 'title_card_001',
    recommendation: 'ready_for_validation',
    blockers: [],
    warnings: [{ code: 'METHOD_FAMILY_COVERAGE_GAP' }],
    accepted_risk_refs: [],
    gap_codes: ['METHOD_FAMILY_COVERAGE_GAP'],
    open_recheck_request_refs: [ref('searchplan_recheck_request', 'recheck_001')],
  } as unknown as TopicSelectionNeedCandidateReadinessAssessmentRecord;
}

function supportPacket(): TopicSelectionValidationDecisionSupportPacketRecord {
  return {
    validation_support_packet_id: 'support_packet_001',
    title_card_id: 'title_card_001',
    required_human_checks: ['residual_risk_acceptance'],
    open_gap_codes: ['METHOD_FAMILY_COVERAGE_GAP'],
    residual_risk_refs: [ref('residual_risk', 'risk_001')],
    evidence_map_ref: ref('evidence_map', 'evidence_map_001', 'v1'),
    search_run_ref: ref('search_run', 'search_run_001'),
    search_plan_ref: ref('search_plan', 'search_plan_001', 'v1'),
    literature_snapshot_ref: ref('literature_resource_pool_snapshot', 'snapshot_001', 'v1'),
    evidence_role_bundle: {
      support_unit_refs: [ref('evidence_unit', 'support_001')],
      challenge_unit_refs: [ref('evidence_unit', 'challenge_001')],
      baseline_unit_refs: [],
      context_unit_refs: [ref('evidence_unit', 'context_001')],
    },
    conflict_refs: [ref('conflict', 'conflict_001')],
    packet_payload: {
      source_health_warning_codes: ['SOURCE_HEALTH_RECHECK'],
      recheck_hint_refs: [ref('searchplan_recheck_request', 'recheck_001')],
    },
  } as unknown as TopicSelectionValidationDecisionSupportPacketRecord;
}

function humanReviewContextPacket(): HumanConfirmationSemanticReviewContextPacket {
  const acceptedRiskRef = ref('accepted_risk', 'accepted_risk_001');
  return {
    schema_version: 'HumanConfirmationSemanticReviewContextPacket@v1',
    workflow_run_id: 'workflow_run_n8',
    node_attempt_id: 'node_attempt_n8',
    context_packet_hash: 'semantic_review_context_hash_001',
    adjudication_result_ref: ref('validate_need_adjudication_result', 'adjudication_001'),
    validation_support_packet_ref: ref('validation_decision_support_packet', 'support_packet_001'),
    need_candidate_ref: ref('need_candidate', 'need_candidate_001', 'v1'),
    output_validated_need_ref: ref('validated_need', 'validated_need_001'),
    residual_risk_refs: [ref('residual_risk', 'risk_001')],
    accepted_risk_refs: [acceptedRiskRef],
    source_health_warning_codes: ['SOURCE_HEALTH_RECHECK'],
    method_family_gap_codes: ['METHOD_FAMILY_COVERAGE_GAP'],
    unresolved_challenge_refs: [ref('evidence_unit', 'challenge_001')],
    recheck_hint_refs: [ref('searchplan_recheck_request', 'recheck_001')],
    policy_version: 'v1',
    output_schema_version: 'v1',
    confirmation_input: {
      accepted_risk_refs: [acceptedRiskRef],
      required_check_results: [
        {
          check_id: 'residual_risk_acceptance',
          result: 'accepted',
        },
      ],
    },
  } as unknown as HumanConfirmationSemanticReviewContextPacket;
}

test('v1a LLM runtime binding builds N5 evidence extraction prompt and token profile', () => {
  const service = new TopicSelectionV1aLlmRuntimeBindingService();
  const binding = service.buildEvidenceExtractionBinding({
    title_card_id: 'title_card_001',
    workflow_run_id: 'workflow_run_n5',
    node_attempt_id: 'node_attempt_n5',
    scenario_id: 'scenario_n5',
    execution_mode: 'provider_llm',
    profile_id: 'topic-selection.evidence-map-extraction.single-agent.v1',
    policy_version: 'v1',
    output_schema_version: 'v1',
    node_input: {
      workflow_run_id: 'workflow_run_n5',
      node_attempt_id: 'node_attempt_n5',
      profile_id: 'topic-selection.evidence-map-extraction.single-agent.v1',
      execution_mode: 'provider_llm',
      policy_version: 'v1',
      output_schema_version: 'v1',
    } as unknown as TopicSelectionBuildEvidenceMapNodeInput,
    search_run_handoff: searchRunHandoff(),
    extraction_context_packet: extractionContextPacket(),
    extraction_context_packet_ref: ref('artifact_ref', 'extraction_context_artifact_001'),
  });

  assert.equal(binding.prompt.promptTemplateId, 'topic-selection-evidence-map-extraction');
  assert.equal(binding.prompt_variant_key, 'evidence_extraction');
  assert.equal(binding.context_packet_refs[0]?.ref_id, 'extraction_context_artifact_001');
  assert.equal(binding.input_refs.some((inputRef) => inputRef.ref_id === 'coverage_001'), true);
  assert.equal(
    binding.runtime_token_budget.context_policy_profile.invocation_slot_id,
    TOPIC_SELECTION_V1A_N5_INVOCATION_SLOT_IDS.evidence_extraction,
  );
  assert.equal(JSON.parse(binding.messages[1]!.content).search_run_handoff.search_run_ref.ref_id, 'search_run_001');
});

test('v1a LLM runtime binding builds N7 adjudication prompt with residual-risk context', () => {
  const service = new TopicSelectionV1aLlmRuntimeBindingService();
  const binding = service.buildNeedAdjudicationBinding({
    title_card_id: 'title_card_001',
    workflow_run_id: 'workflow_run_n7',
    node_attempt_id: 'node_attempt_n7',
    scenario_id: 'scenario_n7',
    scenario_case_id: 'semantic:n7',
    execution_mode: 'provider_llm',
    profile_id: 'topic-selection.need-adjudication.single-agent.v1',
    policy_version: 'v1',
    output_schema_version: 'v1',
    diagnostic_prompt_appendix: 'Carry the fixture risk.',
    candidate: candidate(),
    readiness: readiness(),
    support_packet: supportPacket(),
  });

  assert.equal(binding.prompt_variant_key, 'adjudication_recommendation');
  assert.equal(binding.messages[0]!.content.includes('Carry the fixture risk.'), true);
  assert.equal(binding.input_refs.some((inputRef) => inputRef.ref_id === 'risk_001'), true);
  assert.equal(binding.runtime_token_budget.extra_payloads?.length, 2);
  assert.equal(
    binding.runtime_token_budget.context_policy_profile.invocation_slot_id,
    TOPIC_SELECTION_V1A_N7_INVOCATION_SLOT_IDS.adjudication_recommendation,
  );
  assert.equal(
    binding.runtime_token_budget.runtime_invocation_context_hash?.length,
    64,
  );
});

test('v1a LLM runtime binding builds N7 compressed context with preserved adjudication facts', () => {
  const service = new TopicSelectionV1aLlmRuntimeBindingService();
  const compressionPlan = service.buildNeedAdjudicationCompressionPlan({
    title_card_id: 'title_card_001',
    workflow_run_id: 'workflow_run_n7_compressed',
    node_attempt_id: 'node_attempt_n7_compressed',
    scenario_id: 'scenario_n7',
    scenario_case_id: 'semantic:n7:compressed',
    execution_mode: 'provider_llm',
    profile_id: 'topic-selection.need-adjudication.single-agent.v1',
    policy_version: 'v1',
    output_schema_version: 'v1',
    candidate: candidate(),
    readiness: readiness(),
    support_packet: supportPacket(),
  });
  const binding = service.buildNeedAdjudicationBinding({
    title_card_id: 'title_card_001',
    workflow_run_id: 'workflow_run_n7_compressed',
    node_attempt_id: 'node_attempt_n7_compressed',
    scenario_id: 'scenario_n7',
    scenario_case_id: 'semantic:n7:compressed',
    execution_mode: 'provider_llm',
    profile_id: 'topic-selection.need-adjudication.single-agent.v1',
    policy_version: 'v1',
    output_schema_version: 'v1',
    candidate: candidate(),
    readiness: readiness(),
    support_packet: supportPacket(),
    compressed_context: compressionPlan.compressed_context,
    runtime_token_budget_overrides: {
      estimated_input_tokens_after_compression_override: 12_000,
    },
    runtime_compression: {
      compression_report_ref: compressionPlan.compression_report_ref,
      compression_report_hash: 'compression_report_hash_001',
      compressed_context_hash: 'compressed_context_hash_001',
      compression_already_applied: true,
    },
  });

  assert.equal(compressionPlan.summary.schema_version, 'topic-selection-v1a-n7-compression-summary-v1');
  assert.equal(compressionPlan.source_refs.some((sourceRef) => sourceRef.ref_id === 'support_packet_001'), true);
  assert.equal(compressionPlan.compressed_context.source_context_packet_hashes.need_candidate.length, 64);
  assert.deepEqual(
    compressionPlan.fact_inventory.method_family_gap,
    ['METHOD_FAMILY_COVERAGE_GAP'],
  );
  assert.equal(
    compressionPlan.fact_inventory.residual_risk?.some((fact) => fact.includes('residual_risk:risk_001')),
    true,
  );
  assert.equal(
    compressionPlan.fact_inventory.recheck_hint?.some((fact) => fact.includes('searchplan_recheck_request:recheck_001')),
    true,
  );
  const userPayload = JSON.parse(binding.messages[1]!.content) as Record<string, unknown>;
  assert.equal('compressed_need_adjudication_context' in userPayload, true);
  assert.equal('validation_support_packet' in userPayload, false);
  assert.equal(binding.runtime_token_budget.compression_already_applied, true);
  assert.equal(binding.runtime_token_budget.estimated_input_tokens_override, 12_000);
});

test('v1a LLM runtime binding builds N8 advisory semantic review binding', () => {
  const service = new TopicSelectionV1aLlmRuntimeBindingService();
  const binding = service.buildHumanConfirmationBinding({
    title_card_id: 'title_card_001',
    workflow_run_id: 'workflow_run_n8',
    node_attempt_id: 'node_attempt_n8',
    scenario_id: 'scenario_n8',
    execution_mode: 'codex_assisted',
    profile_id: 'topic-selection.confirmation-semantic-review.single-agent.v1',
    context_packet: humanReviewContextPacket(),
    context_packet_ref: ref('artifact_ref', 'human_review_context_artifact_001'),
  });

  assert.equal(binding.prompt.promptTemplateId, 'topic-selection-human-confirmation-semantic-review');
  assert.equal(binding.prompt_variant_key, 'confirmation_semantic_review');
  assert.equal(binding.context_packet_refs[0]?.ref_id, 'human_review_context_artifact_001');
  assert.equal(binding.context_packet_hashes[0], 'semantic_review_context_hash_001');
  assert.equal(
    binding.runtime_token_budget.context_policy_profile.invocation_slot_id,
    TOPIC_SELECTION_V1A_N8_INVOCATION_SLOT_IDS.confirmation_semantic_review,
  );
});

// T-128 W-04 — v1a single-agent binding prompt-body byte-identity drift anchors (N5 evidence-map,
// N7 need-adjudication, N8 human-confirmation semantic review). Pin the rendered SYSTEM message
// bytes so any body change is a LOUD, intentional re-baseline rather than silent rendered_prompt_hash
// drift. No harness/replay/e2e guard pins these v1a prompt bodies, so these are their only drift
// coverage. Re-baseline ONLY for a deliberate, separately-justified wording change — NOT mechanical.
const V1A_BINDING_PROMPT_SYSTEM_GOLDEN = {
  evidence_map_extraction: '58000ae9d50b66506e7cfe18f9a3d3fd431155cdfe5ae9f822bcdb108574599b',
  need_adjudication: 'a0deee32d5c926eb0c04363c1fcf6ca03e943cf2e8e86b2549dc827fb9d1c8af',
  human_confirmation_semantic_review: 'b01b05fe8fd3b74058427427098ae0dd4d6cbfa01fa468c512179743cf02b747',
};
test('v1a single-agent binding prompt bodies are byte-identity drift-anchored (T-128 W-04)', () => {
  const service = new TopicSelectionV1aLlmRuntimeBindingService();
  const n5 = service.buildEvidenceExtractionBinding({
    title_card_id: 'title_card_001',
    workflow_run_id: 'workflow_run_n5',
    node_attempt_id: 'node_attempt_n5',
    scenario_id: 'scenario_n5',
    execution_mode: 'provider_llm',
    profile_id: 'topic-selection.evidence-map-extraction.single-agent.v1',
    policy_version: 'v1',
    output_schema_version: 'v1',
    node_input: {
      workflow_run_id: 'workflow_run_n5',
      node_attempt_id: 'node_attempt_n5',
      profile_id: 'topic-selection.evidence-map-extraction.single-agent.v1',
      execution_mode: 'provider_llm',
      policy_version: 'v1',
      output_schema_version: 'v1',
    } as unknown as TopicSelectionBuildEvidenceMapNodeInput,
    search_run_handoff: searchRunHandoff(),
    extraction_context_packet: extractionContextPacket(),
    extraction_context_packet_ref: ref('artifact_ref', 'extraction_context_artifact_001'),
  });
  assert.equal(sha256Text(n5.messages[0]!.content), V1A_BINDING_PROMPT_SYSTEM_GOLDEN.evidence_map_extraction);

  const n7Base = {
    title_card_id: 'title_card_001',
    workflow_run_id: 'workflow_run_n7',
    node_attempt_id: 'node_attempt_n7',
    scenario_id: 'scenario_n7',
    scenario_case_id: 'semantic:n7',
    execution_mode: 'provider_llm' as const,
    profile_id: 'topic-selection.need-adjudication.single-agent.v1',
    policy_version: 'v1',
    output_schema_version: 'v1',
    candidate: candidate(),
    readiness: readiness(),
    support_packet: supportPacket(),
  };
  const n7 = service.buildNeedAdjudicationBinding(n7Base);
  assert.equal(sha256Text(n7.messages[0]!.content), V1A_BINDING_PROMPT_SYSTEM_GOLDEN.need_adjudication);
  // Concatenation-lock: a diagnostic_prompt_appendix is appended after the canonical lines with a
  // single newline (protects the includes()-assertion in the N7 residual-risk test from a join regression).
  const n7WithAppendix = service.buildNeedAdjudicationBinding({
    ...n7Base,
    diagnostic_prompt_appendix: 'Carry the fixture risk.',
  });
  assert.equal(n7WithAppendix.messages[0]!.content, `${n7.messages[0]!.content}\nCarry the fixture risk.`);

  const n8 = service.buildHumanConfirmationBinding({
    title_card_id: 'title_card_001',
    workflow_run_id: 'workflow_run_n8',
    node_attempt_id: 'node_attempt_n8',
    scenario_id: 'scenario_n8',
    execution_mode: 'codex_assisted',
    profile_id: 'topic-selection.confirmation-semantic-review.single-agent.v1',
    context_packet: humanReviewContextPacket(),
    context_packet_ref: ref('artifact_ref', 'human_review_context_artifact_001'),
  });
  assert.equal(
    sha256Text(n8.messages[0]!.content),
    V1A_BINDING_PROMPT_SYSTEM_GOLDEN.human_confirmation_semantic_review,
  );
});

test('v1a LLM runtime binding builds N8 compressed context with preserved confirmation facts', () => {
  const service = new TopicSelectionV1aLlmRuntimeBindingService();
  const contextPacket = humanReviewContextPacket();
  const contextPacketRef = ref('artifact_ref', 'human_review_context_artifact_001');
  const compressionPlan = service.buildHumanConfirmationCompressionPlan({
    title_card_id: 'title_card_001',
    workflow_run_id: 'workflow_run_n8_compressed',
    node_attempt_id: 'node_attempt_n8_compressed',
    scenario_id: 'scenario_n8',
    scenario_case_id: 'semantic:n8:compressed',
    execution_mode: 'provider_llm',
    profile_id: 'topic-selection.confirmation-semantic-review.single-agent.v1',
    context_packet: contextPacket,
    context_packet_ref: contextPacketRef,
  });
  const binding = service.buildHumanConfirmationBinding({
    title_card_id: 'title_card_001',
    workflow_run_id: 'workflow_run_n8_compressed',
    node_attempt_id: 'node_attempt_n8_compressed',
    scenario_id: 'scenario_n8',
    scenario_case_id: 'semantic:n8:compressed',
    execution_mode: 'provider_llm',
    profile_id: 'topic-selection.confirmation-semantic-review.single-agent.v1',
    context_packet: contextPacket,
    context_packet_ref: contextPacketRef,
    compressed_context: compressionPlan.compressed_context,
    runtime_token_budget_overrides: {
      estimated_input_tokens_after_compression_override: 8_000,
    },
    runtime_compression: {
      compression_report_ref: compressionPlan.compression_report_ref,
      compression_report_hash: 'compression_report_hash_001',
      compressed_context_hash: 'compressed_context_hash_001',
      compression_already_applied: true,
    },
  });

  assert.equal(compressionPlan.summary.schema_version, 'topic-selection-v1a-n8-compression-summary-v1');
  assert.equal(compressionPlan.source_refs.some((sourceRef) => sourceRef.ref_id === 'adjudication_001'), true);
  assert.equal(
    compressionPlan.compressed_context.source_context_packet_hashes.semantic_review_context_packet,
    'semantic_review_context_hash_001',
  );
  assert.equal(
    compressionPlan.fact_inventory.residual_risk?.some((fact) => fact.includes('residual_risk:risk_001')),
    true,
  );
  assert.equal(
    compressionPlan.fact_inventory.accepted_risk?.some((fact) => fact.includes('accepted_risk:accepted_risk_001')),
    true,
  );
  assert.deepEqual(compressionPlan.fact_inventory.source_health_warning, ['SOURCE_HEALTH_RECHECK']);
  assert.deepEqual(compressionPlan.fact_inventory.method_family_gap, ['METHOD_FAMILY_COVERAGE_GAP']);
  assert.equal(
    compressionPlan.fact_inventory.unresolved_challenge?.some((fact) => fact.includes('evidence_unit:challenge_001')),
    true,
  );
  assert.equal(
    compressionPlan.fact_inventory.recheck_hint?.some((fact) => fact.includes('searchplan_recheck_request:recheck_001')),
    true,
  );
  const userPayload = JSON.parse(binding.messages[1]!.content) as Record<string, unknown>;
  assert.equal('compressed_human_confirmation_context' in userPayload, true);
  assert.equal('context_packet' in userPayload, false);
  assert.equal(binding.runtime_token_budget.compression_already_applied, true);
  assert.equal(binding.runtime_token_budget.estimated_input_tokens_override, 8_000);
});
