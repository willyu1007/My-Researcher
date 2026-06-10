import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';
import {
  PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_OPTION_DESIGNER_ROLE_SLOT_ID,
  PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_PROFILE_ID,
  PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_PROMPT_TEMPLATE_ID,
  PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_PROMPT_TEMPLATE_VERSION,
  PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_SLOT_ID,
} from './paper-implementation-runtime-contracts.js';
import {
  TOPIC_SELECTION_CONTEXT_POLICY_PROFILE_SCHEMA_VERSION,
  TOPIC_SELECTION_CONTEXT_POLICY_PROFILE_REGISTRY_SCHEMA_VERSION,
  TOPIC_SELECTION_CONTEXT_FAMILIES,
  TOPIC_SELECTION_HUMAN_TRUST_SUMMARY_SCHEMA_VERSION,
  TOPIC_SELECTION_OPERATOR_AUDIT_SUMMARY_SCHEMA_VERSION,
  TOPIC_SELECTION_PROMPT_QUALITY_REPORT_SCHEMA_VERSION,
  TOPIC_SELECTION_RUNTIME_AUDIT_ENVELOPE_SCHEMA_VERSION,
  TOPIC_SELECTION_RUNTIME_INVOCATION_CONTEXT_SCHEMA_VERSION,
  topicSelectionCompressionReportEnvelopeSchema,
  topicSelectionContextPacketCacheKeySchema,
  topicSelectionContextPacketCacheResultEnvelopeSchema,
  topicSelectionContextPolicyProfileSchema,
  topicSelectionContextPolicyProfileRegistrySchema,
  topicSelectionExactResponseReuseProvenanceSchema,
  topicSelectionHumanTrustSummarySchema,
  topicSelectionOperatorAuditSummarySchema,
  topicSelectionPromptPacketCacheResultEnvelopeSchema,
  topicSelectionPromptPacketIdentitySchema,
  topicSelectionPromptQualityReportSchema,
  topicSelectionRedactedPromptPacketArtifactSchema,
  topicSelectionRuntimeAuditEnvelopeSchema,
  topicSelectionRuntimeInvocationContextSchema,
  topicSelectionTokenBudgetGateResultSchema,
  type TopicSelectionCompressionReportEnvelope,
  type TopicSelectionContextPacketCacheKey,
  type TopicSelectionContextPacketCacheResultEnvelope,
  type TopicSelectionContextPolicyProfile,
  type TopicSelectionContextPolicyProfileRegistry,
  type TopicSelectionExactResponseReuseProvenance,
  type TopicSelectionFunctionalRef,
  type TopicSelectionHumanTrustSummary,
  type TopicSelectionOperatorAuditSummary,
  type TopicSelectionPromptPacketCacheResultEnvelope,
  type TopicSelectionPromptPacketIdentity,
  type TopicSelectionPromptQualityReport,
  type TopicSelectionRedactedPromptPacketArtifact,
  type TopicSelectionRuntimeAuditEnvelope,
  type TopicSelectionRuntimeInvocationContext,
  type TopicSelectionTokenBudgetGateResult,
} from './topic-selection-llm-runtime-contracts.js';

const hash = 'a'.repeat(64);
const hashB = 'b'.repeat(64);
const hashC = 'c'.repeat(64);

async function validatesBody(schema: Record<string, unknown>, body: unknown): Promise<boolean> {
  const app = Fastify({
    ajv: {
      customOptions: {
        allErrors: true,
        removeAdditional: false,
      },
    },
  });
  app.post('/validate', { schema: { body: schema } }, async () => ({ ok: true }));
  try {
    const result = await app.inject({
      method: 'POST',
      url: '/validate',
      payload: body as Record<string, unknown>,
    });
    return result.statusCode === 200;
  } finally {
    await app.close();
  }
}

function ref(refId: string): TopicSelectionFunctionalRef {
  return {
    ref_type: 'artifact',
    ref_id: refId,
  };
}

function contextPolicyProfile(): TopicSelectionContextPolicyProfile {
  return {
    schema_version: TOPIC_SELECTION_CONTEXT_POLICY_PROFILE_SCHEMA_VERSION,
    context_policy_profile_id: 'topic-selection.v1a.n6.need-candidate-generation.context-runtime@v1',
    context_policy_profile_version: 'v1',
    invocation_slot_id: 'v1a.n6.need-candidate-generation',
    functional_template: 'candidate_for_deterministic_gate',
    execution_modifiers: [
      'provider_required_live',
      'compression_allowed_with_quality_gate',
    ],
    context_family: 'v1a_n6_exploration',
    allowed_source_kinds: [
      'authority_record',
      'ref_backed_artifact',
      'durable_memory',
    ],
    memory_policy: {
      allowed_memory_families: ['risk_memory', 'recheck_memory'],
      required_use_labels: ['blocker', 'residual_risk', 'method_family_gap'],
      stale_behavior: 'block',
      missing_required_memory_behavior: 'block',
      durable_memory_as_standalone_evidence: false,
    },
    compression_policy: {
      compression_mode: 'allowed_with_quality_gate',
      allowed_executor_kinds: ['deterministic_structural', 'codex_assisted'],
      compression_strategy_id: 'topic-selection-context-compression',
      compression_strategy_version: 'v1',
      preserved_fact_kinds: [
        'blocker',
        'residual_risk',
        'accepted_risk',
        'source_health_warning',
        'method_family_gap',
        'unresolved_challenge',
        'recheck_hint',
      ],
      forbidden_payload_classes: ['hidden_reasoning', 'raw_provider_logs', 'credentials', 'secrets'],
      quality_gate_required: true,
    },
    cache_policy: {
      cache_enabled: true,
      cache_scope: 'context_identity_preprocessing',
      exact_key_fields: [
        'node_id',
        'invocation_slot_id',
        'context_family',
        'prompt_packet_hash',
        'policy_version',
        'schema_version',
        'profile_hash',
      ],
      stale_behavior: 'block',
      post_cache_gates: ['deterministic_gate', 'authority_boundary'],
    },
    token_budget_policy: {
      estimated_input_token_target: 12000,
      estimated_output_token_budget: 1200,
      context_window_tokens: 128000,
      token_estimate_safety_margin: 1.25,
      unknown_estimate_behavior: 'budget_unknown_allow_with_warning',
    },
    reuse_policy: {
      provider_llm_response_reuse: 'blocked',
      codex_exact_reuse_requires_approval: true,
      mock_replay_allowed: true,
      provider_required_live_behavior: 'live_call_required',
    },
    post_reuse_gates: ['schema_validation', 'deterministic_gate', 'authority_boundary'],
    provenance_policy: {
      runtime_audit_envelope_required: true,
      operator_audit_summary_required: true,
      human_trust_summary_required: true,
      forbidden_persisted_payload_classes: [
        'hidden_reasoning',
        'raw_provider_logs',
        'credentials',
        'secrets',
        'unredacted_private_content',
      ],
    },
    redaction_policy: 'topic-selection-redacted-ref-backed-v1',
  };
}

function contextPolicyProfileRegistry(): TopicSelectionContextPolicyProfileRegistry {
  return {
    schema_version: TOPIC_SELECTION_CONTEXT_POLICY_PROFILE_REGISTRY_SCHEMA_VERSION,
    profiles: [contextPolicyProfile()],
  };
}

function cacheKey(): TopicSelectionContextPacketCacheKey {
  return {
    node_id: 'topic-selection.v1a.generate-need-candidate.v1',
    invocation_slot_id: 'v1a.n6.need-candidate-generation',
    execution_mode: 'provider_llm',
    executor_kind: 'single_agent',
    context_family: 'v1a_n6_exploration',
    runtime_invocation_context_hash: hash,
    input_refs_hash: hash,
    context_packet_hashes: [hashB],
    prompt_packet_hash: hashC,
    policy_version: 'topic-selection-context-runtime-policy-v1',
    schema_version: TOPIC_SELECTION_CONTEXT_POLICY_PROFILE_SCHEMA_VERSION,
    context_compiler_version: 'v1',
    prompt_template_id: 'topic-selection-generate-need-candidate',
    prompt_template_version: 'v1',
    profile_hash: hash,
    model_option_id: 'topic-selection.generate-need-candidate.single-agent.v1.openai-balanced',
    normalized_params_hash: hashB,
    output_contract: 'RankedCandidateDraftBatch@v1',
    redaction_policy: 'topic-selection-redacted-ref-backed-v1',
    cache_scope: 'context_identity_preprocessing',
  };
}

function tokenBudgetGateResult(): TopicSelectionTokenBudgetGateResult {
  return {
    provider_id: 'openai',
    model_id: 'gpt-5.5',
    profile_id: 'topic-selection.generate-need-candidate.single-agent.v1',
    model_option_id: 'topic-selection.generate-need-candidate.single-agent.v1.openai-balanced',
    estimated_input_tokens: 24000,
    estimated_output_tokens: 1200,
    context_window_tokens: 128000,
    schema_overhead_tokens: 600,
    decision: 'within_budget',
    compression_strategy_ref: null,
    blocker_codes: [],
    warning_codes: [],
  };
}

function compressionReport(): TopicSelectionCompressionReportEnvelope {
  return {
    compression_report_ref: ref('compression_report_001'),
    source_refs: [ref('source_context_001')],
    input_context_hash: hash,
    compressed_context_hash: hashB,
    summary_hash: hashC,
    estimated_input_tokens_before: 64000,
    estimated_input_tokens_after: 18000,
    redaction_policy: 'topic-selection-redacted-ref-backed-v1',
    compression_executor_kind: 'codex_assisted',
    compression_strategy_id: 'topic-selection-context-compression',
    compression_strategy_version: 'v1',
    preserved_fact_kinds: [
      'blocker',
      'residual_risk',
      'accepted_risk',
      'source_health_warning',
      'method_family_gap',
      'unresolved_challenge',
      'recheck_hint',
    ],
    quality_gate_result: 'passed',
    blocker_codes: [],
    warning_codes: [],
  };
}

function cacheHit(): TopicSelectionContextPacketCacheResultEnvelope {
  return {
    cache_result: 'hit',
    artifact_ref: ref('context_packet_001'),
    artifact_hash: hash,
    cache_key_hash: hashB,
    context_family: 'v1a_n6_exploration',
    context_policy_profile_id: 'topic-selection.v1a.n6.need-candidate-generation.context-runtime@v1',
    context_policy_profile_version: 'v1',
    context_policy_profile_hash: hashC,
    source_refs_hash: hash,
    freshness_status: 'fresh',
    provenance_ref: ref('runtime_provenance_001'),
  };
}

function promptPacketIdentity(): TopicSelectionPromptPacketIdentity {
  return {
    prompt_packet_hash: hash,
    prompt_template_id: 'topic-selection-generate-need-candidate',
    prompt_template_version: 'v1',
    prompt_variant_key: 'single-agent.main',
    invocation_slot_id: 'v1a.n6.need-candidate-generation',
    runtime_invocation_context_hash: hash,
    context_packet_hashes: [hashB],
    compression_report_ref: null,
    compression_report_hash: null,
    compressed_context_hash: null,
    dynamic_material_refs_hash: null,
    output_contract: 'RankedCandidateDraftBatch@v1',
    context_policy_profile_hash: hashC,
    model_option_id: 'topic-selection.generate-need-candidate.single-agent.v1.openai-balanced',
    normalized_params_hash: hashB,
    runtime_modifiers_hash: hashC,
    redaction_policy: 'topic-selection-redacted-ref-backed-v1',
    redacted_prompt_artifact_ref: ref('redacted_prompt_001'),
    provenance_ref: ref('prompt_provenance_001'),
  };
}

function redactedPromptArtifact(): TopicSelectionRedactedPromptPacketArtifact {
  return {
    artifact_ref: ref('redacted_prompt_001'),
    prompt_packet_hash: hash,
    prompt_template_id: 'topic-selection-generate-need-candidate',
    prompt_template_version: 'v1',
    prompt_variant_key: 'single-agent.main',
    messages: [
      {
        role: 'system',
        content_hash: hashB,
        redacted_content_ref: ref('redacted_prompt_system_message_001'),
      },
      {
        role: 'user',
        content_hash: hashC,
        redacted_content_ref: ref('redacted_prompt_user_message_001'),
      },
    ],
    source_refs: [ref('context_packet_001')],
    redaction_policy: 'topic-selection-redacted-ref-backed-v1',
    provenance_ref: ref('prompt_provenance_001'),
  };
}

function promptQualityReport(): TopicSelectionPromptQualityReport {
  return {
    schema_version: TOPIC_SELECTION_PROMPT_QUALITY_REPORT_SCHEMA_VERSION,
    prompt_quality_report_ref: ref('prompt_quality_report_001'),
    prompt_packet_hash: hash,
    prompt_template_id: 'topic-selection-generate-need-candidate',
    prompt_template_version: 'v1',
    prompt_variant_key: 'single-agent.main',
    invocation_slot_id: 'v1a.n6.need-candidate-generation',
    context_policy_profile_hash: hashC,
    rendered_input_hash: hashB,
    executable_prompt_hash: hash,
    redacted_prompt_artifact_ref: ref('redacted_prompt_001'),
    dynamic_material_refs: [
      {
        material_ref: ref('arbiter_generated_questions_001'),
        material_hash: hashC,
        generated_by_invocation_slot_id: 'v1a.n6.arbiter-issue-framing',
        generation_policy_ref: ref('dynamic_prompt_material_policy_001'),
        allowed_to_influence_prompt: true,
        cannot_override_prompt_template: true,
      },
    ],
    quality_decision: 'pass',
    check_codes: ['system_prompt_present', 'variant_key_present'],
    blocker_codes: [],
    warning_codes: [],
  };
}

function promptPacketCacheHit(): TopicSelectionPromptPacketCacheResultEnvelope {
  return {
    cache_result: 'hit',
    prompt_packet_hash: hash,
    prompt_template_id: 'topic-selection-generate-need-candidate',
    prompt_template_version: 'v1',
    prompt_variant_key: 'single-agent.main',
    invocation_slot_id: 'v1a.n6.need-candidate-generation',
    context_policy_profile_id: 'topic-selection.v1a.n6.need-candidate-generation.context-runtime@v1',
    context_policy_profile_version: 'v1',
    context_policy_profile_hash: hashC,
    output_contract: 'RankedCandidateDraftBatch@v1',
    redaction_policy: 'topic-selection-redacted-ref-backed-v1',
    redacted_prompt_artifact_ref: ref('redacted_prompt_001'),
    redacted_prompt_artifact_hash: hashB,
    prompt_quality_report_ref: ref('prompt_quality_report_001'),
    prompt_quality_report_hash: hashC,
    quality_decision: 'pass',
    freshness_status: 'fresh',
    provenance_ref: ref('prompt_packet_cache_provenance_001'),
    blocker_codes: [],
    warning_codes: [],
  };
}

function codexReuseProvenance(): TopicSelectionExactResponseReuseProvenance {
  return {
    source_workflow_run_id: 'workflow_run_001',
    source_node_id: 'topic-selection.v1a.generate-need-candidate.v1',
    source_node_attempt_id: 'node_attempt_001',
    source_execution_mode: 'codex_assisted',
    reuse_source_kind: 'codex_assisted',
    response_hash: hash,
    prompt_packet_hash: hashB,
    context_packet_hashes: [hashC],
    schema_version: 'RankedCandidateDraftBatch@v1',
    profile_hash: hash,
    policy_version: 'topic-selection-context-runtime-policy-v1',
    approval_status: 'approved_by_operator',
    approval_ref: ref('operator_approval_001'),
    local_approval_setting_ref: null,
    non_provider: true,
  };
}

function runtimeInvocationContext(): TopicSelectionRuntimeInvocationContext {
  return {
    schema_version: TOPIC_SELECTION_RUNTIME_INVOCATION_CONTEXT_SCHEMA_VERSION,
    invocation_slot_id: 'v1a.n6.need-candidate-generation',
    scenario_context: {
      identity_policy: 'semantic_identity',
      scenario_id: 'scenario_001',
      scenario_case_id: 'semantic-runtime-identity.case_001',
      semantic_scenario_key: hash,
    },
    loop_context: {
      loop_kind: 'supplemental_round',
      loop_stage: 'need_candidate_generation',
      current_round_index: 2,
      remaining_round_budget: 1,
      loopback_source_node_id: null,
      repair_origin_ref: null,
      repair_origin_hash: null,
    },
    debate_context: {
      debate_loop_id: null,
      debate_policy_id: null,
      round_index: null,
      role: null,
      stage: null,
      agent_instance_id: null,
      parent_invocation_attempt_ids_hash: null,
      dynamic_material_refs_hash: null,
    },
  };
}

function runtimeAuditEnvelope(): TopicSelectionRuntimeAuditEnvelope {
  return {
    schema_version: TOPIC_SELECTION_RUNTIME_AUDIT_ENVELOPE_SCHEMA_VERSION,
    workflow_run_id: 'workflow_run_001',
    node_id: 'topic-selection.v1a.generate-need-candidate.v1',
    invocation_slot_id: 'v1a.n6.need-candidate-generation',
    node_attempt_id: 'node_attempt_001',
    runtime_invocation_context_hash: hash,
    execution_mode: 'provider_llm',
    executor_kind: 'single_agent',
    run_mode: 'product',
    profile_hash: hash,
    schema_version_ref: 'RankedCandidateDraftBatch@v1',
    policy_version: 'topic-selection-context-runtime-policy-v1',
    prompt_template_id: 'topic-selection-generate-need-candidate',
    prompt_template_version: 'v1',
    model_option_id: 'topic-selection.generate-need-candidate.single-agent.v1.openai-balanced',
    normalized_params_hash: hashB,
    context_cache_result: 'hit',
    context_artifact_refs: [ref('context_packet_001')],
    context_packet_hashes: [hashC],
    compression_report_ref: null,
    prompt_packet_hash: hash,
    prompt_quality_report_ref: ref('prompt_quality_report_001'),
    token_budget_gate_result: tokenBudgetGateResult(),
    response_artifact_ref: ref('structured_response_001'),
    response_hash: hashB,
    response_reuse_result: 'not_applicable',
    response_reuse_provenance_ref: null,
    schema_validation_result: 'passed',
    post_reuse_gate_result: 'not_applicable',
    deterministic_gate_result: 'passed',
    authority_boundary_result: 'passed',
    provider_live_call: true,
    provider_telemetry: {
      provider_id: 'openai',
      model_id: 'gpt-5.5',
      input_tokens: 24000,
      output_tokens: 900,
      total_tokens: 24900,
      provider_side_cache_hit: false,
      provider_side_cache_read_tokens: 0,
      provider_side_cache_write_tokens: 0,
      request_count: 1,
    },
    blocker_codes: [],
    warning_codes: [],
  };
}

function operatorAuditSummary(): TopicSelectionOperatorAuditSummary {
  return {
    schema_version: TOPIC_SELECTION_OPERATOR_AUDIT_SUMMARY_SCHEMA_VERSION,
    projection_kind: 'operator_audit_summary',
    runtime_audit_envelope_ref: ref('runtime_audit_envelope_001'),
    runtime_audit_envelope_hash: hash,
    node_id: 'topic-selection.v1a.generate-need-candidate.v1',
    invocation_slot_id: 'v1a.n6.need-candidate-generation',
    execution_mode: 'provider_llm',
    context_cache_result: 'hit',
    response_reuse_result: 'not_applicable',
    token_budget_decision: 'within_budget',
    compression_applied: false,
    provider_live_call: true,
    blocker_codes: [],
    warning_codes: [],
  };
}

function humanTrustSummary(): TopicSelectionHumanTrustSummary {
  return {
    schema_version: TOPIC_SELECTION_HUMAN_TRUST_SUMMARY_SCHEMA_VERSION,
    projection_kind: 'human_trust_summary',
    runtime_audit_envelope_ref: ref('runtime_audit_envelope_001'),
    runtime_audit_envelope_hash: hash,
    node_id: 'topic-selection.v1a.generate-need-candidate.v1',
    invocation_slot_id: 'v1a.n6.need-candidate-generation',
    trust_summary: 'Provider live response used cached context packet; deterministic gates passed.',
    relied_on_cached_context: true,
    relied_on_cached_response: false,
    provider_live_call: true,
    residual_risk_codes: [],
    required_human_checks: ['review_residual_risk'],
  };
}

test('topic-selection context policy profile accepts v1a N6 first-slice profile', async () => {
  assert.equal(TOPIC_SELECTION_CONTEXT_FAMILIES.includes('paper_implementation_feasibility_planning'), true);
  assert.equal(TOPIC_SELECTION_CONTEXT_FAMILIES.includes('paper_implementation_cross_board_synthesis'), true);
  assert.equal(TOPIC_SELECTION_CONTEXT_FAMILIES.includes('paper_implementation_evidence_board_curation'), true);
  assert.equal(TOPIC_SELECTION_CONTEXT_FAMILIES.includes('paper_implementation_motive_decomposition'), true);
  assert.equal(TOPIC_SELECTION_CONTEXT_FAMILIES.includes('paper_implementation_motive_evolution'), true);
  assert.equal(
    await validatesBody(topicSelectionContextPolicyProfileSchema, contextPolicyProfile()),
    true,
  );
});

test('topic-selection runtime schemas accept PaperImplementation motive evolution prompt and context identity', async () => {
  const key: TopicSelectionContextPacketCacheKey = {
    ...cacheKey(),
    node_id: PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_SLOT_ID,
    invocation_slot_id: PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_OPTION_DESIGNER_ROLE_SLOT_ID,
    context_family: 'paper_implementation_motive_evolution',
    prompt_template_id: PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_PROMPT_TEMPLATE_ID,
    prompt_template_version: PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_PROMPT_TEMPLATE_VERSION,
    model_option_id: `${PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_PROFILE_ID}.openai-balanced`,
    output_contract: 'PaperImplementationMotiveEvolutionRoleArtifact@v1',
  };
  assert.equal(await validatesBody(topicSelectionContextPacketCacheKeySchema, key), true);

  const promptIdentity: TopicSelectionPromptPacketIdentity = {
    ...promptPacketIdentity(),
    prompt_template_id: PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_PROMPT_TEMPLATE_ID,
    prompt_template_version: PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_PROMPT_TEMPLATE_VERSION,
    prompt_variant_key: 'evolution-option-designer.main',
    invocation_slot_id: PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_OPTION_DESIGNER_ROLE_SLOT_ID,
    output_contract: 'PaperImplementationMotiveEvolutionRoleArtifact@v1',
    model_option_id: `${PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_PROFILE_ID}.openai-balanced`,
  };
  assert.equal(await validatesBody(topicSelectionPromptPacketIdentitySchema, promptIdentity), true);
});

test('topic-selection context policy profile registry accepts first-slice profile list', async () => {
  assert.equal(
    await validatesBody(
      topicSelectionContextPolicyProfileRegistrySchema,
      contextPolicyProfileRegistry(),
    ),
    true,
  );

  const emptyRegistry: TopicSelectionContextPolicyProfileRegistry = {
    ...contextPolicyProfileRegistry(),
    profiles: [],
  };
  assert.equal(
    await validatesBody(topicSelectionContextPolicyProfileRegistrySchema, emptyRegistry),
    false,
  );
});

test('topic-selection context policy profile rejects unknown context family and standalone durable memory authority', async () => {
  const unknownFamily = {
    ...contextPolicyProfile(),
    context_family: 'unknown_context_family',
  };
  assert.equal(await validatesBody(topicSelectionContextPolicyProfileSchema, unknownFamily), false);

  const durableMemoryAuthority = contextPolicyProfile() as unknown as Record<string, unknown>;
  (durableMemoryAuthority.memory_policy as Record<string, unknown>).durable_memory_as_standalone_evidence =
    true;
  assert.equal(
    await validatesBody(topicSelectionContextPolicyProfileSchema, durableMemoryAuthority),
    false,
  );
});

test('topic-selection runtime schemas accept v1c bounded promotion support context family', async () => {
  const profile: TopicSelectionContextPolicyProfile = {
    ...contextPolicyProfile(),
    context_policy_profile_id:
      'topic-selection.v1c.n2.bounded-debate.supporter-draft.context-runtime@v1',
    invocation_slot_id: 'n2_bounded_micro_debate.promotion_supporter_draft',
    functional_template: 'support_only_semantic',
    context_family: 'v1c_n2_bounded_promotion_support',
  };
  assert.equal(await validatesBody(topicSelectionContextPolicyProfileSchema, profile), true);

  const key: TopicSelectionContextPacketCacheKey = {
    ...cacheKey(),
    invocation_slot_id: 'n2_bounded_micro_debate.promotion_supporter_draft',
    context_family: 'v1c_n2_bounded_promotion_support',
    output_contract: 'TopicSelectionV1cBoundedMicroDebateRoleOrFinal@v1',
  };
  assert.equal(await validatesBody(topicSelectionContextPacketCacheKeySchema, key), true);
});

test('topic-selection runtime schemas accept v1c delegated promotion decision context family', async () => {
  const profile: TopicSelectionContextPolicyProfile = {
    ...contextPolicyProfile(),
    context_policy_profile_id:
      'topic-selection.v1c.n4.delegated-promotion-decision.context-runtime@v1',
    invocation_slot_id: 'n4_delegated_promotion_decision_candidate',
    functional_template: 'delegated_payload_candidate',
    context_family: 'v1c_n4_delegated_promotion_decision',
  };
  assert.equal(await validatesBody(topicSelectionContextPolicyProfileSchema, profile), true);

  const key: TopicSelectionContextPacketCacheKey = {
    ...cacheKey(),
    invocation_slot_id: 'n4_delegated_promotion_decision_candidate',
    context_family: 'v1c_n4_delegated_promotion_decision',
    output_contract: 'TopicSelectionV1cDelegatedPromotionDecisionCandidate@v1',
  };
  assert.equal(await validatesBody(topicSelectionContextPacketCacheKeySchema, key), true);
});

test('topic-selection context packet cache key rejects missing profile schema policy fields', async () => {
  assert.equal(await validatesBody(topicSelectionContextPacketCacheKeySchema, cacheKey()), true);

  for (const field of ['profile_hash', 'policy_version', 'schema_version', 'runtime_invocation_context_hash']) {
    const invalid = cacheKey() as unknown as Record<string, unknown>;
    delete invalid[field];
    assert.equal(await validatesBody(topicSelectionContextPacketCacheKeySchema, invalid), false);
  }
});

test('topic-selection runtime invocation context binds semantic scenario and loop identity', async () => {
  assert.equal(
    await validatesBody(topicSelectionRuntimeInvocationContextSchema, runtimeInvocationContext()),
    true,
  );

  const nonSemanticWithScenario = {
    ...runtimeInvocationContext(),
    scenario_context: {
      identity_policy: 'not_semantic',
      scenario_id: 'scenario_001',
      scenario_case_id: null,
      semantic_scenario_key: null,
    },
  };
  assert.equal(
    await validatesBody(topicSelectionRuntimeInvocationContextSchema, nonSemanticWithScenario),
    false,
  );

  const repairWithoutOrigin = {
    ...runtimeInvocationContext(),
    loop_context: {
      ...runtimeInvocationContext().loop_context,
      loop_kind: 'repair_from_node',
      loopback_source_node_id: null,
      repair_origin_ref: null,
      repair_origin_hash: null,
    },
  };
  assert.equal(
    await validatesBody(topicSelectionRuntimeInvocationContextSchema, repairWithoutOrigin),
    false,
  );
});

test('topic-selection context packet cache result requires exact-hit artifact metadata and blocks stale artifacts', async () => {
  assert.equal(
    await validatesBody(topicSelectionContextPacketCacheResultEnvelopeSchema, cacheHit()),
    true,
  );

  const hitWithoutArtifact = cacheHit();
  hitWithoutArtifact.artifact_ref = null;
  assert.equal(
    await validatesBody(topicSelectionContextPacketCacheResultEnvelopeSchema, hitWithoutArtifact),
    false,
  );

  const staleBlock: TopicSelectionContextPacketCacheResultEnvelope = {
    ...cacheHit(),
    cache_result: 'blocked_stale',
    artifact_ref: null,
    artifact_hash: null,
    freshness_status: 'stale',
  };
  assert.equal(
    await validatesBody(topicSelectionContextPacketCacheResultEnvelopeSchema, staleBlock),
    true,
  );
});

test('topic-selection token budget gate result requires decision telemetry fields', async () => {
  assert.equal(
    await validatesBody(topicSelectionTokenBudgetGateResultSchema, tokenBudgetGateResult()),
    true,
  );

  const invalid = tokenBudgetGateResult() as unknown as Record<string, unknown>;
  delete invalid.decision;
  assert.equal(await validatesBody(topicSelectionTokenBudgetGateResultSchema, invalid), false);
});

test('topic-selection compression report rejects missing source refs and forbidden raw payload fields', async () => {
  assert.equal(
    await validatesBody(topicSelectionCompressionReportEnvelopeSchema, compressionReport()),
    true,
  );

  const missingSourceRefs = compressionReport() as unknown as Record<string, unknown>;
  delete missingSourceRefs.source_refs;
  assert.equal(
    await validatesBody(topicSelectionCompressionReportEnvelopeSchema, missingSourceRefs),
    false,
  );

  const hiddenReasoning = compressionReport() as unknown as Record<string, unknown>;
  hiddenReasoning.hidden_reasoning = 'not allowed';
  assert.equal(
    await validatesBody(topicSelectionCompressionReportEnvelopeSchema, hiddenReasoning),
    false,
  );
});

test('topic-selection prompt packet identity requires variant and redacted ref-backed artifact', async () => {
  assert.equal(await validatesBody(topicSelectionPromptPacketIdentitySchema, promptPacketIdentity()), true);

  const missingVariant = promptPacketIdentity() as unknown as Record<string, unknown>;
  delete missingVariant.prompt_variant_key;
  assert.equal(await validatesBody(topicSelectionPromptPacketIdentitySchema, missingVariant), false);

  const missingRuntimeContextHash = promptPacketIdentity() as unknown as Record<string, unknown>;
  delete missingRuntimeContextHash.runtime_invocation_context_hash;
  assert.equal(await validatesBody(topicSelectionPromptPacketIdentitySchema, missingRuntimeContextHash), false);

  const missingCompressionHash = promptPacketIdentity() as unknown as Record<string, unknown>;
  delete missingCompressionHash.compression_report_hash;
  assert.equal(await validatesBody(topicSelectionPromptPacketIdentitySchema, missingCompressionHash), false);

  assert.equal(
    await validatesBody(topicSelectionRedactedPromptPacketArtifactSchema, redactedPromptArtifact()),
    true,
  );

  const rawPromptArtifact = redactedPromptArtifact() as unknown as Record<string, unknown>;
  rawPromptArtifact.raw_prompt = 'not allowed';
  assert.equal(
    await validatesBody(topicSelectionRedactedPromptPacketArtifactSchema, rawPromptArtifact),
    false,
  );
});

test('topic-selection prompt quality report keeps dynamic prompt material bounded by template policy', async () => {
  assert.equal(
    await validatesBody(topicSelectionPromptQualityReportSchema, promptQualityReport()),
    true,
  );

  const invalidDynamicMaterial = promptQualityReport();
  (
    invalidDynamicMaterial.dynamic_material_refs[0] as unknown as Record<string, unknown>
  ).cannot_override_prompt_template = false;
  assert.equal(
    await validatesBody(topicSelectionPromptQualityReportSchema, invalidDynamicMaterial),
    false,
  );
});

test('topic-selection prompt packet cache result requires ref-backed prompt artifacts on hit', async () => {
  assert.equal(
    await validatesBody(topicSelectionPromptPacketCacheResultEnvelopeSchema, promptPacketCacheHit()),
    true,
  );

  const missingPromptArtifact = promptPacketCacheHit();
  missingPromptArtifact.redacted_prompt_artifact_ref = null;
  assert.equal(
    await validatesBody(topicSelectionPromptPacketCacheResultEnvelopeSchema, missingPromptArtifact),
    false,
  );

  const driftBlock: TopicSelectionPromptPacketCacheResultEnvelope = {
    ...promptPacketCacheHit(),
    cache_result: 'blocked_drift',
    redacted_prompt_artifact_ref: null,
    redacted_prompt_artifact_hash: null,
    prompt_quality_report_ref: null,
    prompt_quality_report_hash: null,
    freshness_status: 'drifted',
  };
  assert.equal(
    await validatesBody(topicSelectionPromptPacketCacheResultEnvelopeSchema, driftBlock),
    true,
  );
});

test('topic-selection exact response reuse provenance permits only non-provider approved or fixture reuse', async () => {
  assert.equal(
    await validatesBody(topicSelectionExactResponseReuseProvenanceSchema, codexReuseProvenance()),
    true,
  );

  const missingApproval = codexReuseProvenance();
  missingApproval.approval_ref = null;
  assert.equal(
    await validatesBody(topicSelectionExactResponseReuseProvenanceSchema, missingApproval),
    false,
  );

  const providerReuseAttempt = {
    ...codexReuseProvenance(),
    source_execution_mode: 'provider_llm',
    reuse_source_kind: 'provider_response',
    non_provider: false,
  };
  assert.equal(
    await validatesBody(topicSelectionExactResponseReuseProvenanceSchema, providerReuseAttempt),
    false,
  );
});

test('topic-selection runtime audit envelope separates provider telemetry from non-provider reuse', async () => {
  assert.equal(
    await validatesBody(topicSelectionRuntimeAuditEnvelopeSchema, runtimeAuditEnvelope()),
    true,
  );

  const codexReuseAudit: TopicSelectionRuntimeAuditEnvelope = {
    ...runtimeAuditEnvelope(),
    execution_mode: 'codex_assisted',
    executor_kind: 'codex_assisted',
    run_mode: 'acceptance',
    model_option_id: null,
    normalized_params_hash: null,
    response_reuse_result: 'hit_non_provider',
    response_reuse_provenance_ref: ref('response_reuse_provenance_001'),
    provider_live_call: false,
    provider_telemetry: null,
  };
  assert.equal(await validatesBody(topicSelectionRuntimeAuditEnvelopeSchema, codexReuseAudit), true);

  const invalid = {
    ...codexReuseAudit,
    provider_telemetry: runtimeAuditEnvelope().provider_telemetry,
  };
  assert.equal(await validatesBody(topicSelectionRuntimeAuditEnvelopeSchema, invalid), false);
});

test('topic-selection audit projections require runtime envelope refs and exclude raw payloads', async () => {
  assert.equal(
    await validatesBody(topicSelectionOperatorAuditSummarySchema, operatorAuditSummary()),
    true,
  );
  assert.equal(await validatesBody(topicSelectionHumanTrustSummarySchema, humanTrustSummary()), true);

  const missingSourceEnvelope = operatorAuditSummary() as unknown as Record<string, unknown>;
  delete missingSourceEnvelope.runtime_audit_envelope_ref;
  assert.equal(
    await validatesBody(topicSelectionOperatorAuditSummarySchema, missingSourceEnvelope),
    false,
  );

  const rawHumanSummary = humanTrustSummary() as unknown as Record<string, unknown>;
  rawHumanSummary.raw_response = 'not allowed';
  assert.equal(await validatesBody(topicSelectionHumanTrustSummarySchema, rawHumanSummary), false);
});
