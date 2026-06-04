import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';
import {
  PAPER_IMPLEMENTATION_RUNTIME_ADMISSION_RECORD_SCHEMA_VERSION,
  PAPER_IMPLEMENTATION_RUNTIME_ARTIFACT_ENVELOPE_SCHEMA_VERSION,
  PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_SLOT_ID,
  PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_REVIEW_ROLE_SLOT_IDS,
  PAPER_IMPLEMENTATION_DOSSIER_READINESS_AUDIT_SLOT_ID,
  PAPER_IMPLEMENTATION_DOSSIER_READINESS_REVIEW_ROLE_SLOT_IDS,
  PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_DIMENSIONS,
  PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_ROLE_SLOT_ID,
  PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_SLOT_ID,
  PAPER_IMPLEMENTATION_EXPERIMENT_DESIGN_ROLE_SLOT_ID,
  PAPER_IMPLEMENTATION_EXPERIMENT_DESIGN_SLOT_ID,
  PAPER_IMPLEMENTATION_EXPERIMENT_PLANNING_RUNTIME_RUN_REQUEST_SCHEMA_VERSION,
  PAPER_IMPLEMENTATION_P1_RUNTIME_RUN_REQUEST_SCHEMA_VERSION,
  PAPER_IMPLEMENTATION_RESULT_ANALYSIS_RUNTIME_RUN_REQUEST_SCHEMA_VERSION,
  PAPER_IMPLEMENTATION_RESULT_ANALYSIS_ROLE_SLOT_ID,
  PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SCENARIO_KINDS,
  PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SLOT_ID,
  PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_RUNTIME_RUN_REQUEST_SCHEMA_VERSION,
  PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_SEMANTIC_ROLE_SLOT_IDS,
  admitPaperImplementationRuntimeArtifactRequestSchema,
  paperImplementationP1RuntimeReviewArtifactSchema,
  paperImplementationP1RuntimeReviewRoleOutputSchema,
  paperImplementationExperimentPlanningArtifactSchema,
  paperImplementationExperimentPlanningRoleOutputSchema,
  paperImplementationResultAnalysisArtifactSchema,
  paperImplementationResultAnalysisRoleOutputSchema,
  paperImplementationRuntimeAdmissionRecordSchema,
  paperImplementationRuntimeArtifactEnvelopeSchema,
  paperImplementationTraceIntegrityDebateArtifactSchema,
  paperImplementationTraceIntegrityRoleOutputSchema,
  runPaperImplementationP1RuntimeReviewRequestSchema,
  runPaperImplementationExperimentPlanningRuntimeRequestSchema,
  runPaperImplementationResultAnalysisRuntimeRequestSchema,
  runPaperImplementationTraceIntegrityDebateRuntimeRequestSchema,
  type PaperImplementationExperimentPlanningRoleOutput,
  type PaperImplementationExperimentWorkOrderDraftCandidate,
  type PaperImplementationRuntimeAdmissionRecord,
  type PaperImplementationRuntimeArtifactEnvelope,
} from './paper-implementation-runtime-contracts.js';
import * as researchLifecycleContracts from './index.js';
import type { TopicSelectionFunctionalRef } from './topic-selection-control-plane-contracts.js';

const hashA = 'a'.repeat(64);
const hashB = 'b'.repeat(64);
const hashC = 'c'.repeat(64);
const hashD = 'd'.repeat(64);
const hashE = 'e'.repeat(64);
const hashF = 'f'.repeat(64);

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

function ref(refType: string, refId: string): TopicSelectionFunctionalRef {
  return {
    ref_type: refType,
    ref_id: refId,
    title_card_id: 'title_card_001',
    version_id: 'v1',
  };
}

function roleRuntimeArtifact(
  overrides: Partial<PaperImplementationRuntimeArtifactEnvelope> = {},
): PaperImplementationRuntimeArtifactEnvelope {
  return {
    schema_version: PAPER_IMPLEMENTATION_RUNTIME_ARTIFACT_ENVELOPE_SCHEMA_VERSION,
    runtime_artifact_id: 'runtime_artifact_role_001',
    artifact_identity_hash: hashA,
    runtime_identity_hash: hashB,
    implementation_project_id: 'implementation_project_001',
    workflow_type: 'trace_integrity_review',
    slot_id: 'trace_integrity_review.boundary_debate',
    artifact_scope: 'role',
    artifact_contract_id: 'TraceIntegrityRoleArtifact',
    artifact_contract_version: 'v1',
    target_ref: ref('claim_candidate', 'claim_candidate_001'),
    target_version_id: 'claim_candidate_version_001',
    input_snapshot_ref: ref('implementation_input_snapshot', 'implementation_input_snapshot_001'),
    input_snapshot_hash: hashC,
    source_hash_bundle_hash: hashD,
    created_by: 'system',
    created_at: '2026-06-03T10:00:00.000Z',
    role_slot_id: 'trace_integrity_review.support_mapper_map',
    call_index: 1,
    prior_role_artifact_refs: [],
    prior_role_artifact_hashes: [],
    role_chain_hash: hashE,
    final_artifact_ref: null,
    final_artifact_hash: null,
    run_mode: 'dry_run',
    execution_mode: 'codex_assisted',
    executor_kind: 'semantic_support_mapper',
    model_profile_id: 'paper-implementation.trace-integrity.support-mapper.codex.v1',
    model_option_id: null,
    runtime_status: 'passed',
    runtime_failure_code: null,
    retry_attempt_index: 0,
    provider_call_count: 0,
    response_reuse_status: 'not_applicable',
    response_reuse_decision_ref: null,
    response_reuse_decision_hash: null,
    allowed_side_effects: [],
    retrieval_packet_ref: ref('trace_integrity_retrieval_packet', 'retrieval_packet_001'),
    retrieval_packet_hash: hashF,
    reviewed_statement_packet_ref: ref('trace_reviewed_statement_packet', 'statement_packet_001'),
    reviewed_statement_packet_hash: hashA,
    context_packet_ref: ref('runtime_context_packet', 'context_packet_001'),
    context_packet_hash: hashB,
    runtime_invocation_context_hash: hashC,
    context_policy_profile_hash: hashD,
    cache_policy_profile_hash: hashE,
    source_refs: [ref('run_evidence_unit', 'run_evidence_unit_001')],
    source_hashes: [hashF],
    prompt_packet_ref: ref('runtime_prompt_packet', 'prompt_packet_001'),
    prompt_packet_hash: hashA,
    prompt_template_id: 'paper-implementation.trace-integrity.support-mapper',
    prompt_template_version_id: 'v1',
    prompt_variant_id: 'support-map.main',
    prompt_redaction_policy_hash: hashB,
    output_schema_id: 'TraceIntegrityRoleArtifact@v1',
    context_cache_key_hash: hashC,
    context_cache_status: 'miss',
    context_cache_result_ref: null,
    context_cache_result_hash: null,
    prompt_packet_cache_key_hash: hashD,
    prompt_packet_cache_status: 'miss',
    prompt_packet_cache_result_ref: null,
    prompt_packet_cache_result_hash: null,
    token_budget_gate_result_ref: ref('token_budget_gate_result', 'token_budget_gate_result_001'),
    token_budget_gate_result_hash: hashE,
    compression_policy_profile_hash: hashF,
    compression_status: 'not_needed',
    compression_report_ref: null,
    compression_report_hash: null,
    compressed_context_packet_ref: null,
    compressed_context_packet_hash: null,
    artifact_payload: { artifact_kind: 'test_runtime_artifact_payload' },
    artifact_payload_ref: ref('trace_integrity_role_artifact', 'support_map_artifact_001'),
    artifact_payload_hash: hashA,
    output_hash: hashB,
    runtime_audit_ref: ref('runtime_audit_envelope', 'runtime_audit_001'),
    runtime_audit_hash: hashC,
    blocker_codes: [],
    warning_codes: [],
    ...overrides,
  };
}

function finalRuntimeArtifact(): PaperImplementationRuntimeArtifactEnvelope {
  return roleRuntimeArtifact({
    runtime_artifact_id: 'runtime_artifact_final_001',
    artifact_scope: 'final',
    artifact_contract_id: 'TraceIntegrityDebateArtifact',
    artifact_contract_version: 'v1',
    role_slot_id: null,
    call_index: null,
    prior_role_artifact_refs: [
      ref('runtime_artifact', 'support_mapper_artifact_001'),
      ref('runtime_artifact', 'skeptic_artifact_001'),
      ref('runtime_artifact', 'reconcile_artifact_001'),
      ref('runtime_artifact', 'arbiter_role_artifact_001'),
    ],
    prior_role_artifact_hashes: [hashA, hashB, hashC, hashD],
    final_artifact_ref: ref('trace_integrity_debate_artifact', 'debate_artifact_001'),
    final_artifact_hash: hashE,
    executor_kind: 'bounded_semantic_debate',
    artifact_payload: { artifact_kind: 'test_runtime_final_artifact_payload' },
    artifact_payload_ref: ref('trace_integrity_debate_artifact', 'debate_artifact_001'),
    artifact_payload_hash: hashE,
    output_schema_id: 'TraceIntegrityDebateArtifact@v1',
    output_hash: hashF,
  });
}

function roleAdmissionRecord(
  overrides: Partial<PaperImplementationRuntimeAdmissionRecord> = {},
): PaperImplementationRuntimeAdmissionRecord {
  return {
    schema_version: PAPER_IMPLEMENTATION_RUNTIME_ADMISSION_RECORD_SCHEMA_VERSION,
    admission_record_id: 'admission_record_role_001',
    implementation_project_id: 'implementation_project_001',
    workflow_type: 'trace_integrity_review',
    slot_id: 'trace_integrity_review.boundary_debate',
    admission_scope: 'role',
    admission_policy_id: 'paper-implementation.trace-integrity.role-admission',
    admission_policy_version: 'v1',
    runtime_artifact_ref: ref('runtime_artifact', 'runtime_artifact_role_001'),
    runtime_artifact_hash: hashA,
    runtime_artifact_id: 'runtime_artifact_role_001',
    artifact_contract_id: 'TraceIntegrityRoleArtifact',
    target_ref: ref('claim_candidate', 'claim_candidate_001'),
    created_at: '2026-06-03T10:01:00.000Z',
    expected_runtime_identity_hash: hashB,
    expected_source_hash_bundle_hash: hashD,
    expected_retrieval_packet_hash: hashF,
    expected_prompt_packet_hash: hashA,
    expected_output_schema_id: 'TraceIntegrityRoleArtifact@v1',
    expected_prior_role_artifact_hashes: [],
    expected_final_artifact_hash: null,
    observed_runtime_identity_hash: hashB,
    observed_source_hash_bundle_hash: hashD,
    observed_retrieval_packet_hash: hashF,
    observed_prompt_packet_hash: hashA,
    observed_output_schema_id: 'TraceIntegrityRoleArtifact@v1',
    observed_prior_role_artifact_hashes: [],
    observed_output_hash: hashB,
    admission_status: 'admitted',
    admission_identity: {
      slot_id: 'trace_integrity_review.boundary_debate',
      role_slot_id: 'trace_integrity_review.support_mapper_map',
      prompt_packet_hash: hashA,
    },
    admission_identity_hash: hashC,
    admitted_artifact_ref: ref('runtime_artifact', 'runtime_artifact_role_001'),
    admitted_artifact_hash: hashA,
    issue_codes: [],
    warning_codes: [],
    ...overrides,
  };
}

function finalAdmissionRecord(): PaperImplementationRuntimeAdmissionRecord {
  return roleAdmissionRecord({
    admission_record_id: 'admission_record_final_001',
    admission_scope: 'final',
    artifact_contract_id: 'TraceIntegrityDebateArtifact',
    runtime_artifact_ref: ref('runtime_artifact', 'runtime_artifact_final_001'),
    runtime_artifact_hash: hashE,
    runtime_artifact_id: 'runtime_artifact_final_001',
    expected_output_schema_id: 'TraceIntegrityDebateArtifact@v1',
    observed_output_schema_id: 'TraceIntegrityDebateArtifact@v1',
    expected_prior_role_artifact_hashes: [hashA, hashB, hashC, hashD],
    observed_prior_role_artifact_hashes: [hashA, hashB, hashC, hashD],
    expected_final_artifact_hash: hashF,
    observed_output_hash: hashF,
    admitted_artifact_ref: ref('trace_integrity_debate_artifact', 'debate_artifact_001'),
    admitted_artifact_hash: hashF,
    admission_identity: {
      slot_id: 'trace_integrity_review.boundary_debate',
      final_artifact_hash: hashF,
      role_chain_hash: hashE,
    },
  });
}

function traceIntegrityRoleOutput(roleSlotId: string) {
  return {
    role_slot_id: roleSlotId,
    role_status: 'passed',
    summary: `Trace integrity role output for ${roleSlotId}.`,
    reviewed_statement_refs: [ref('reviewed_statement', 'statement_001')],
    cited_source_refs: [ref('run_evidence_unit', 'run_evidence_unit_001')],
    blocker_codes: [],
    warning_codes: [],
  };
}

function p1ReviewRoleOutput(roleSlotId: string) {
  return {
    role_slot_id: roleSlotId,
    role_status: 'passed',
    summary: `P1 runtime role output for ${roleSlotId}.`,
    cited_source_refs: [ref('result_interpretation_packet', 'result_packet_001')],
    blocker_codes: [],
    warning_codes: [],
    domain_gate_request: roleSlotId.endsWith('final')
      ? { claim_candidate_id: 'claim_candidate_001' }
      : null,
    scenario_outputs: [],
  };
}

function resultAnalysisScenarioOutput(
  kind: (typeof PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SCENARIO_KINDS)[number] = 'positive',
) {
  return {
    scenario_id: `${kind}_result_interpretation`,
    scenario_kind: kind,
    summary: `Validation results support a tentative ${kind} interpretation with explicit limits.`,
    support_refs: [ref('run_evidence_unit', 'run_evidence_unit_001')],
    challenge_refs: [ref('validation_report', 'validation_report_001')],
    limitation_refs: [ref('failed_run_summary', 'failed_run_summary_001')],
    forbidden_overclaims: ['Do not state causality beyond the validation report.'],
    recommended_claim_refs: [ref('claim_candidate', 'claim_candidate_draft_001')],
    required_followup_refs: [ref('validation_feedback_item', 'validation_feedback_001')],
  };
}

function resultAnalysisRoleOutput(overrides: Record<string, unknown> = {}) {
  return {
    role_slot_id: PAPER_IMPLEMENTATION_RESULT_ANALYSIS_ROLE_SLOT_ID,
    role_status: 'passed',
    summary: 'Result analysis scenario builder produced bounded interpretation scenarios.',
    cited_source_refs: [
      ref('run_evidence_unit', 'run_evidence_unit_001'),
      ref('validation_report', 'validation_report_001'),
    ],
    blocker_codes: [],
    warning_codes: [],
    scenario_outputs: PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SCENARIO_KINDS.map((kind) =>
      resultAnalysisScenarioOutput(kind)),
    domain_gate_request: { result_interpretation_packet_id: 'result_packet_001' },
    ...overrides,
  };
}

function experimentDraftCandidate(
  candidateId: string,
  confirmatoryMarker: boolean,
): PaperImplementationExperimentWorkOrderDraftCandidate {
  return {
    candidate_id: candidateId,
    run_type: confirmatoryMarker ? 'confirmatory' : 'exploratory',
    plan_summary: `${candidateId} proposes a bounded experiment plan.`,
    route_refs: [ref('technical_route_candidate', 'route_candidate_001')],
    feasibility_probe_refs: [ref('feasibility_probe', 'feasibility_probe_001')],
    primary_metric_refs: [ref('metric', 'metric_001')],
    secondary_metric_refs: [ref('metric', 'metric_secondary_001')],
    dataset_version_refs: [ref('dataset_version', 'dataset_version_001')],
    baseline_version_refs: [ref('baseline_version', 'baseline_version_001')],
    code_version_refs: [ref('code_version', 'code_version_001')],
    config_refs: [ref('config_snapshot', 'config_snapshot_001')],
    run_policy_ref: ref('run_policy', 'run_policy_001'),
    budget_ref: ref('validation_budget', 'budget_001'),
    stop_condition_refs: [ref('stop_condition', 'stop_condition_001')],
    estimated_cost_class: confirmatoryMarker ? 'high' : 'medium',
    confirmatory_marker: confirmatoryMarker,
    work_order_draft_request: workOrderDraftRequest(candidateId, confirmatoryMarker),
  };
}

function workOrderDraftRequest(
  candidateId: string,
  confirmatoryMarker: boolean,
): PaperImplementationExperimentWorkOrderDraftCandidate['work_order_draft_request'] {
  return {
    work_order_id: `${candidateId}_work_order_draft`,
    validation_cycle_id: 'validation_cycle_001',
    experiment_plan_light_id: `experiment_plan_${candidateId}`,
    run_type: confirmatoryMarker ? 'confirmatory' : 'exploratory',
    run_policy: {
      run_policy_id: `run_policy_${candidateId}`,
      retry_budget: 1,
      compute_limit_ref: ref('compute_limit', `compute_limit_${candidateId}`),
      stop_condition_refs: [ref('stop_condition', 'stop_condition_001')],
      allowed_mutation_refs: [],
      autotune_policy: 'disabled',
    },
    experiment_bridge: {
      run_recipe_ref: ref('run_recipe', `run_recipe_${candidateId}`),
      run_recipe_hash: hashA,
      version_lock_hash: hashB,
      config_snapshot_hash: hashC,
      materialization_result_ref: null,
      materialization_result_hash: null,
      training_task_spec_ref: null,
      training_task_spec_hash: null,
      external_job_ref: null,
      external_job_hash: null,
      result_validation_policy_ref: null,
    },
    motive_refs: [],
    assertion_refs: [],
    dataset_version_refs: [ref('dataset_version', 'dataset_version_001')],
    baseline_version_refs: [ref('baseline_version', 'baseline_version_001')],
    code_version_refs: [ref('code_version', 'code_version_001')],
    config_refs: [ref('config_snapshot', 'config_snapshot_001')],
    trace_manifest_id: `trace_manifest_${candidateId}`,
    policy_version_id: 'policy_v1',
    created_by: 'system',
  };
}

function experimentDesignRoleOutput(
  overrides: Partial<PaperImplementationExperimentPlanningRoleOutput> = {},
): PaperImplementationExperimentPlanningRoleOutput {
  return {
    role_slot_id: PAPER_IMPLEMENTATION_EXPERIMENT_DESIGN_ROLE_SLOT_ID,
    role_status: 'passed',
    summary: 'Experiment design proposed WorkOrder draft alternatives.',
    cited_source_refs: [ref('technical_route_candidate', 'route_candidate_001')],
    blocker_codes: [],
    warning_codes: [],
    work_order_draft_candidates: [
      experimentDraftCandidate('exploratory_candidate', false),
      experimentDraftCandidate('confirmatory_candidate', true),
    ],
    ...overrides,
  };
}

function experimentCritiqueRoleOutput(
  overrides: Partial<PaperImplementationExperimentPlanningRoleOutput> = {},
): PaperImplementationExperimentPlanningRoleOutput {
  return {
    role_slot_id: PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_ROLE_SLOT_ID,
    role_status: 'passed',
    summary: 'Independent critique covered experiment-planning risks.',
    cited_source_refs: [ref('experiment_plan_light', 'experiment_plan_light_001')],
    blocker_codes: [],
    warning_codes: [],
    checked_dimensions: [...PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_DIMENSIONS],
    critique_findings: [{
      finding_id: 'critique_finding_budget_001',
      critique_dimension: 'compute_budget',
      severity: 'warning',
      summary: 'Budget is bounded but should remain visible before WorkOrder admission.',
      evidence_refs: [ref('validation_budget', 'budget_001')],
      required_revision_refs: [],
      blocks_work_order: false,
    }],
    critique_decision: {
      decision: 'approve_for_work_order_draft',
      rationale: 'No blocking execution risk remains after the bounded critique.',
      required_revision_refs: [],
      no_execution_side_effect: true,
    },
    ...overrides,
  };
}

test('paper-implementation runtime schemas load through direct and aggregate exports', () => {
  assert.ok(paperImplementationRuntimeArtifactEnvelopeSchema);
  assert.ok(paperImplementationRuntimeAdmissionRecordSchema);
  assert.ok(paperImplementationTraceIntegrityRoleOutputSchema);
  assert.ok(paperImplementationTraceIntegrityDebateArtifactSchema);
  assert.ok(runPaperImplementationTraceIntegrityDebateRuntimeRequestSchema);
  assert.ok(paperImplementationP1RuntimeReviewRoleOutputSchema);
  assert.ok(paperImplementationP1RuntimeReviewArtifactSchema);
  assert.ok(runPaperImplementationP1RuntimeReviewRequestSchema);
  assert.ok(paperImplementationResultAnalysisRoleOutputSchema);
  assert.ok(paperImplementationResultAnalysisArtifactSchema);
  assert.ok(runPaperImplementationResultAnalysisRuntimeRequestSchema);
  assert.ok(paperImplementationExperimentPlanningRoleOutputSchema);
  assert.ok(paperImplementationExperimentPlanningArtifactSchema);
  assert.ok(runPaperImplementationExperimentPlanningRuntimeRequestSchema);
  assert.ok(researchLifecycleContracts.paperImplementationRuntimeArtifactEnvelopeSchema);
  assert.ok(researchLifecycleContracts.paperImplementationRuntimeAdmissionRecordSchema);
  assert.ok(researchLifecycleContracts.runPaperImplementationTraceIntegrityDebateRuntimeRequestSchema);
  assert.ok(researchLifecycleContracts.runPaperImplementationP1RuntimeReviewRequestSchema);
  assert.ok(researchLifecycleContracts.runPaperImplementationResultAnalysisRuntimeRequestSchema);
  assert.ok(researchLifecycleContracts.runPaperImplementationExperimentPlanningRuntimeRequestSchema);
});

test('runtime artifact envelope accepts role and final scopes with slot lineage', async () => {
  assert.equal(
    await validatesBody(paperImplementationRuntimeArtifactEnvelopeSchema, roleRuntimeArtifact()),
    true,
  );
  assert.equal(
    await validatesBody(paperImplementationRuntimeArtifactEnvelopeSchema, finalRuntimeArtifact()),
    true,
  );

  const finalWithRoleSlot = {
    ...finalRuntimeArtifact(),
    role_slot_id: 'trace_integrity_review.arbiter_final',
  };
  assert.equal(
    await validatesBody(paperImplementationRuntimeArtifactEnvelopeSchema, finalWithRoleSlot),
    false,
  );

  assert.equal(
    await validatesBody(paperImplementationRuntimeArtifactEnvelopeSchema, {
      ...roleRuntimeArtifact(),
      run_mode: 'product',
    }),
    false,
  );
});

test('runtime artifact envelope rejects missing identity and invalid scope', async () => {
  const missingPromptHash = roleRuntimeArtifact() as unknown as Record<string, unknown>;
  delete missingPromptHash.prompt_packet_hash;
  assert.equal(
    await validatesBody(paperImplementationRuntimeArtifactEnvelopeSchema, missingPromptHash),
    false,
  );

  const invalidScope = {
    ...roleRuntimeArtifact(),
    artifact_scope: 'proposal_harness',
  };
  assert.equal(
    await validatesBody(paperImplementationRuntimeArtifactEnvelopeSchema, invalidScope),
    false,
  );
});

test('runtime artifact envelope rejects prompt and provider payload leakage', async () => {
  const leakedPrompt = roleRuntimeArtifact() as unknown as Record<string, unknown>;
  leakedPrompt.rendered_prompt_text = 'unredacted prompt text must stay out of the envelope';
  assert.equal(
    await validatesBody(paperImplementationRuntimeArtifactEnvelopeSchema, leakedPrompt),
    false,
  );

  const leakedProviderResponse = roleRuntimeArtifact() as unknown as Record<string, unknown>;
  leakedProviderResponse.raw_provider_response = { content: 'provider payload' };
  assert.equal(
    await validatesBody(paperImplementationRuntimeArtifactEnvelopeSchema, leakedProviderResponse),
    false,
  );
});

test('runtime artifact envelope rejects legacy harness and proposal wrappers', async () => {
  const legacyContract = roleRuntimeArtifact({
    artifact_contract_id: 'PaperImplementationProposalArtifact',
  });
  assert.equal(
    await validatesBody(paperImplementationRuntimeArtifactEnvelopeSchema, legacyContract),
    false,
  );

  const legacyPayloadRef = roleRuntimeArtifact({
    artifact_payload_ref: ref('implementation_proposal_artifact', 'proposal_artifact_001'),
  });
  assert.equal(
    await validatesBody(paperImplementationRuntimeArtifactEnvelopeSchema, legacyPayloadRef),
    false,
  );

  const legacyTargetRef = roleRuntimeArtifact({
    target_ref: ref('agent_workflow_harness_run', 'harness_run_001'),
  });
  assert.equal(
    await validatesBody(paperImplementationRuntimeArtifactEnvelopeSchema, legacyTargetRef),
    false,
  );
});

test('provider runtime artifact cannot satisfy execution with exact response reuse hit', async () => {
  const providerWithReuseHit = roleRuntimeArtifact({
    execution_mode: 'provider_llm',
    model_option_id: 'openai-balanced',
    provider_call_count: 0,
    response_reuse_status: 'hit_non_provider',
  });
  assert.equal(
    await validatesBody(paperImplementationRuntimeArtifactEnvelopeSchema, providerWithReuseHit),
    false,
  );
});

test('provider runtime artifact requires a live call count when passed', async () => {
  const passedWithoutProviderCall = roleRuntimeArtifact({
    execution_mode: 'provider_llm',
    model_profile_id: 'paper-implementation.trace-integrity.support-mapper.provider.v1',
    model_option_id: 'openai-balanced',
    provider_call_count: 0,
    response_reuse_status: 'miss',
  });
  assert.equal(
    await validatesBody(paperImplementationRuntimeArtifactEnvelopeSchema, passedWithoutProviderCall),
    false,
  );

  const passedWithProviderCall = roleRuntimeArtifact({
    execution_mode: 'provider_llm',
    model_profile_id: 'paper-implementation.trace-integrity.support-mapper.provider.v1',
    model_option_id: 'openai-balanced',
    provider_call_count: 1,
    response_reuse_status: 'miss',
  });
  assert.equal(
    await validatesBody(paperImplementationRuntimeArtifactEnvelopeSchema, passedWithProviderCall),
    true,
  );
});

test('runtime artifact cache hits require ref-backed cache result identity', async () => {
  const contextHitWithoutResult = roleRuntimeArtifact({
    context_cache_status: 'hit',
  });
  assert.equal(
    await validatesBody(paperImplementationRuntimeArtifactEnvelopeSchema, contextHitWithoutResult),
    false,
  );

  const contextHitWithResult = roleRuntimeArtifact({
    context_cache_status: 'hit',
    context_cache_result_ref: ref('runtime_context_cache_result', 'context_cache_result_001'),
    context_cache_result_hash: hashB,
  });
  assert.equal(
    await validatesBody(paperImplementationRuntimeArtifactEnvelopeSchema, contextHitWithResult),
    true,
  );

  const promptHitWithoutResult = roleRuntimeArtifact({
    prompt_packet_cache_status: 'hit',
  });
  assert.equal(
    await validatesBody(paperImplementationRuntimeArtifactEnvelopeSchema, promptHitWithoutResult),
    false,
  );

  const promptHitWithResult = roleRuntimeArtifact({
    prompt_packet_cache_status: 'hit',
    prompt_packet_cache_result_ref: ref('runtime_prompt_packet_cache_result', 'prompt_cache_result_001'),
    prompt_packet_cache_result_hash: hashC,
  });
  assert.equal(
    await validatesBody(paperImplementationRuntimeArtifactEnvelopeSchema, promptHitWithResult),
    true,
  );
});

test('runtime admission record accepts role and final admissions', async () => {
  assert.equal(
    await validatesBody(paperImplementationRuntimeAdmissionRecordSchema, roleAdmissionRecord()),
    true,
  );
  assert.equal(
    await validatesBody(paperImplementationRuntimeAdmissionRecordSchema, finalAdmissionRecord()),
    true,
  );
});

test('runtime admission request accepts path-owned runtime id and project id outside the body only', async () => {
  const roleRequest = {
    admission_record_id: 'admission_record_role_001',
    admission_scope: 'role',
    admission_policy_id: 'paper-implementation.trace-integrity.role-admission',
    admission_policy_version: 'v1',
    expected_runtime_identity_hash: hashB,
    expected_source_hash_bundle_hash: hashD,
    expected_retrieval_packet_hash: hashF,
    expected_prompt_packet_hash: hashA,
    expected_output_schema_id: 'TraceIntegrityRoleArtifact@v1',
    expected_prior_role_artifact_hashes: [],
    expected_final_artifact_hash: null,
  };
  assert.equal(
    await validatesBody(admitPaperImplementationRuntimeArtifactRequestSchema, roleRequest),
    true,
  );

  assert.equal(
    await validatesBody(admitPaperImplementationRuntimeArtifactRequestSchema, {
      ...roleRequest,
      runtime_artifact_id: 'runtime_artifact_role_001',
    }),
    false,
  );
  assert.equal(
    await validatesBody(admitPaperImplementationRuntimeArtifactRequestSchema, {
      ...roleRequest,
      implementation_project_id: 'implementation_project_001',
    }),
    false,
  );
});

test('runtime admission request keeps final admission hash requirements typed', async () => {
  const finalRequest = {
    admission_scope: 'final',
    admission_policy_id: 'paper-implementation.trace-integrity.final-admission',
    admission_policy_version: 'v1',
    expected_runtime_identity_hash: hashB,
    expected_source_hash_bundle_hash: hashD,
    expected_retrieval_packet_hash: hashF,
    expected_prompt_packet_hash: hashA,
    expected_output_schema_id: 'TraceIntegrityDebateArtifact@v1',
    expected_prior_role_artifact_hashes: [hashA, hashB],
    expected_final_artifact_hash: hashE,
  };
  assert.equal(
    await validatesBody(admitPaperImplementationRuntimeArtifactRequestSchema, finalRequest),
    true,
  );
  assert.equal(
    await validatesBody(admitPaperImplementationRuntimeArtifactRequestSchema, {
      ...finalRequest,
      expected_final_artifact_hash: null,
    }),
    false,
  );
});

test('trace integrity debate runtime request accepts only slot inputs, not runtime envelopes', async () => {
  const roleOutputs = Object.fromEntries(
    PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_SEMANTIC_ROLE_SLOT_IDS.map((slotId) => [
      slotId,
      traceIntegrityRoleOutput(slotId),
    ]),
  );
  const request = {
    schema_version: PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_RUNTIME_RUN_REQUEST_SCHEMA_VERSION,
    run_id: 'trace-debate-run-001',
    run_mode: 'dry_run',
    execution_mode: 'provider_llm',
    model_profile_id: 'paper-implementation.trace-integrity.boundary-debate.v1',
    model_option_id: 'paper-implementation.trace-integrity.boundary-debate.v1.openai-balanced',
    target_ref: ref('claim_candidate', 'claim_candidate_001'),
    target_version_id: 'claim_candidate_version_001',
    input_snapshot_ref: ref('implementation_input_snapshot', 'implementation_input_snapshot_001'),
    input_snapshot_hash: hashC,
    reviewed_statement_packet_ref: ref('trace_reviewed_statement_packet', 'statement_packet_001'),
    reviewed_statement_packet_hash: hashA,
    reviewed_statement_refs: [ref('reviewed_statement', 'statement_001')],
    reviewed_statement_packets: [{
      statement_ref: ref('reviewed_statement', 'statement_001'),
      statement_hash: hashB,
      statement_text: 'Claim statement text available for trace integrity debate.',
      semantic_role: 'result_claim',
    }],
    source_refs: [ref('run_evidence_unit', 'run_evidence_unit_001')],
    source_hashes: [hashF],
    source_packets: [{
      source_ref: ref('run_evidence_unit', 'run_evidence_unit_001'),
      source_hash: hashF,
      source_family: 'run_evidence',
      freshness_status: 'fresh',
      evidence_role: 'primary_result',
      content_summary: 'Run evidence unit summarizes benchmark support.',
      source_excerpt: 'benchmark support excerpt',
    }],
    preflight_blocker_codes: [],
  };

  assert.equal(
    await validatesBody(runPaperImplementationTraceIntegrityDebateRuntimeRequestSchema, request),
    true,
  );
  assert.equal(
    await validatesBody(runPaperImplementationTraceIntegrityDebateRuntimeRequestSchema, {
      ...request,
      implementation_project_id: 'implementation_project_001',
    }),
    false,
  );
  assert.equal(
    await validatesBody(runPaperImplementationTraceIntegrityDebateRuntimeRequestSchema, {
      ...request,
      runtime_artifact_id: 'runtime_artifact_001',
    }),
    false,
  );
  assert.equal(
    await validatesBody(runPaperImplementationTraceIntegrityDebateRuntimeRequestSchema, {
      ...request,
      codex_role_outputs: roleOutputs,
    }),
    false,
  );
});

test('trace integrity debate runtime request requires role outputs for non-provider modes', async () => {
  const roleOutputs = Object.fromEntries(
    PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_SEMANTIC_ROLE_SLOT_IDS.map((slotId) => [
      slotId,
      traceIntegrityRoleOutput(slotId),
    ]),
  );
  const baseRequest = {
    run_mode: 'dry_run',
    target_ref: ref('claim_candidate', 'claim_candidate_001'),
    input_snapshot_ref: ref('implementation_input_snapshot', 'implementation_input_snapshot_001'),
    input_snapshot_hash: hashC,
    reviewed_statement_packet_ref: ref('trace_reviewed_statement_packet', 'statement_packet_001'),
    reviewed_statement_packet_hash: hashA,
    reviewed_statement_refs: [ref('reviewed_statement', 'statement_001')],
    source_refs: [ref('run_evidence_unit', 'run_evidence_unit_001')],
    source_hashes: [hashF],
  };

  assert.equal(
    await validatesBody(runPaperImplementationTraceIntegrityDebateRuntimeRequestSchema, {
      ...baseRequest,
      execution_mode: 'mocked_llm',
      mocked_role_outputs: roleOutputs,
    }),
    true,
  );
  assert.equal(
    await validatesBody(runPaperImplementationTraceIntegrityDebateRuntimeRequestSchema, {
      ...baseRequest,
      execution_mode: 'mocked_llm',
    }),
    false,
  );
  assert.equal(
    await validatesBody(runPaperImplementationTraceIntegrityDebateRuntimeRequestSchema, {
      ...baseRequest,
      execution_mode: 'codex_assisted',
      codex_role_outputs: roleOutputs,
    }),
    true,
  );
});

test('P1 runtime review role and final artifact schemas cover claim and dossier slots', async () => {
  assert.equal(
    await validatesBody(
      paperImplementationP1RuntimeReviewRoleOutputSchema,
      p1ReviewRoleOutput('claim_boundary_review.adjudicator_final'),
    ),
    true,
  );
  assert.equal(
    await validatesBody(
      paperImplementationP1RuntimeReviewRoleOutputSchema,
      p1ReviewRoleOutput('dossier_readiness_prep.scenario_adjudicator_final'),
    ),
    true,
  );
  assert.equal(
    await validatesBody(
      paperImplementationP1RuntimeReviewRoleOutputSchema,
      p1ReviewRoleOutput('trace_integrity_review.arbiter_final'),
    ),
    false,
  );

  const artifact = {
    status: 'passed',
    slot_id: PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_SLOT_ID,
    workflow_type: 'claim_boundary_review',
    target_ref: ref('result_interpretation_packet', 'result_packet_001'),
    preflight_blockers: [],
    role_summaries: {
      'claim_boundary_review.boundary_critic': 'Boundary critic passed.',
      'claim_boundary_review.evidence_skeptic': 'Evidence skeptic passed.',
      'claim_boundary_review.adjudicator_final': 'Adjudicator passed.',
    },
    role_blocker_codes: {
      'claim_boundary_review.boundary_critic': [],
      'claim_boundary_review.evidence_skeptic': [],
      'claim_boundary_review.adjudicator_final': [],
    },
    role_warning_codes: {
      'claim_boundary_review.boundary_critic': [],
      'claim_boundary_review.evidence_skeptic': [],
      'claim_boundary_review.adjudicator_final': [],
    },
    blockers: [],
    warnings: [],
    runtime_failure_code: null,
    domain_gate_request: { claim_candidate_id: 'claim_candidate_001' },
    scenario_outputs: [],
    role_artifact_refs: [
      ref('paper_implementation_runtime_artifact', 'runtime_role_001'),
      ref('paper_implementation_runtime_artifact', 'runtime_role_002'),
      ref('paper_implementation_runtime_artifact', 'runtime_role_003'),
    ],
    role_artifact_hashes: [hashA, hashB, hashC],
    admitted_role_artifact_refs: [
      ref('claim_boundary_review_role_artifact', 'role_payload_001'),
      ref('claim_boundary_review_role_artifact', 'role_payload_002'),
      ref('claim_boundary_review_role_artifact', 'role_payload_003'),
    ],
    admitted_role_artifact_hashes: [hashA, hashB, hashC],
    role_prompt_packet_refs: [
      ref('runtime_prompt_packet', 'prompt_packet_001'),
      ref('runtime_prompt_packet', 'prompt_packet_002'),
      ref('runtime_prompt_packet', 'prompt_packet_003'),
    ],
    role_prompt_packet_hashes: [hashA, hashB, hashC],
    role_token_budget_gate_result_refs: [
      ref('token_budget_gate_result', 'token_gate_001'),
      ref('token_budget_gate_result', 'token_gate_002'),
      ref('token_budget_gate_result', 'token_gate_003'),
    ],
    role_compression_report_refs: [],
    runtime_identity: { slot_id: PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_SLOT_ID },
    cache_identity: { prompt_packet_cache_key_hashes: [hashA, hashB, hashC] },
    source_refs: [ref('result_interpretation_packet', 'result_packet_001')],
    source_hash_bundle_hash: hashD,
  };
  assert.equal(
    await validatesBody(paperImplementationP1RuntimeReviewArtifactSchema, artifact),
    true,
  );
  assert.equal(
    await validatesBody(paperImplementationP1RuntimeReviewArtifactSchema, {
      ...artifact,
      slot_id: PAPER_IMPLEMENTATION_DOSSIER_READINESS_AUDIT_SLOT_ID,
      workflow_type: 'claim_boundary_review',
    }),
    false,
  );
});

test('P1 runtime review request accepts controlled slot input and rejects body-owned identities', async () => {
  const roleOutputs = Object.fromEntries(
    PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_REVIEW_ROLE_SLOT_IDS.map((slotId) => [
      slotId,
      p1ReviewRoleOutput(slotId),
    ]),
  );
  const request = {
    schema_version: PAPER_IMPLEMENTATION_P1_RUNTIME_RUN_REQUEST_SCHEMA_VERSION,
    run_id: 'p1-runtime-run-001',
    run_mode: 'dry_run',
    execution_mode: 'mocked_llm',
    target_ref: ref('result_interpretation_packet', 'result_packet_001'),
    input_snapshot_ref: ref('implementation_input_snapshot', 'implementation_input_snapshot_001'),
    input_snapshot_hash: hashC,
    source_refs: [ref('result_interpretation_packet', 'result_packet_001')],
    source_hashes: [hashD],
    mocked_role_outputs: roleOutputs,
  };
  assert.equal(
    await validatesBody(runPaperImplementationP1RuntimeReviewRequestSchema, request),
    true,
  );
  assert.equal(
    await validatesBody(runPaperImplementationP1RuntimeReviewRequestSchema, {
      ...request,
      implementation_project_id: 'implementation_project_001',
    }),
    false,
  );
  assert.equal(
    await validatesBody(runPaperImplementationP1RuntimeReviewRequestSchema, {
      ...request,
      runtime_artifact_id: 'runtime_artifact_001',
    }),
    false,
  );
});

test('P1 runtime review request requires non-provider role outputs and rejects provider fixtures', async () => {
  const dossierRoleOutputs = Object.fromEntries(
    PAPER_IMPLEMENTATION_DOSSIER_READINESS_REVIEW_ROLE_SLOT_IDS.map((slotId) => [
      slotId,
      p1ReviewRoleOutput(slotId),
    ]),
  );
  const baseRequest = {
    run_mode: 'dry_run',
    target_ref: ref('implementation_dossier', 'dossier_001'),
    input_snapshot_ref: ref('implementation_input_snapshot', 'implementation_input_snapshot_001'),
    input_snapshot_hash: hashC,
    source_refs: [ref('claim_candidate', 'claim_candidate_001')],
    source_hashes: [hashD],
  };
  assert.equal(
    await validatesBody(runPaperImplementationP1RuntimeReviewRequestSchema, {
      ...baseRequest,
      execution_mode: 'codex_assisted',
      codex_role_outputs: dossierRoleOutputs,
    }),
    true,
  );
  assert.equal(
    await validatesBody(runPaperImplementationP1RuntimeReviewRequestSchema, {
      ...baseRequest,
      execution_mode: 'codex_assisted',
    }),
    false,
  );
  assert.equal(
    await validatesBody(runPaperImplementationP1RuntimeReviewRequestSchema, {
      ...baseRequest,
      run_mode: 'product',
      execution_mode: 'codex_assisted',
      codex_role_outputs: dossierRoleOutputs,
    }),
    false,
  );
  assert.equal(
    await validatesBody(runPaperImplementationP1RuntimeReviewRequestSchema, {
      ...baseRequest,
      execution_mode: 'provider_llm',
      model_profile_id: 'paper-implementation.dossier-readiness.readiness-audit.v1',
      model_option_id: 'openai-balanced',
      mocked_role_outputs: dossierRoleOutputs,
    }),
    false,
  );
});

test('result analysis role and final schemas require materializable passed scenarios', async () => {
  assert.equal(
    await validatesBody(paperImplementationResultAnalysisRoleOutputSchema, resultAnalysisRoleOutput()),
    true,
  );
  assert.equal(
    await validatesBody(paperImplementationResultAnalysisRoleOutputSchema, resultAnalysisRoleOutput({
      scenario_outputs: [],
    })),
    false,
  );
  assert.equal(
    await validatesBody(paperImplementationResultAnalysisRoleOutputSchema, resultAnalysisRoleOutput({
      domain_gate_request: null,
    })),
    false,
  );
  assert.equal(
    await validatesBody(paperImplementationResultAnalysisRoleOutputSchema, resultAnalysisRoleOutput({
      role_status: 'blocked',
      blocker_codes: ['run_evidence_missing'],
      scenario_outputs: [],
      domain_gate_request: null,
    })),
    true,
  );

  const artifact = {
    status: 'passed',
    slot_id: PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SLOT_ID,
    workflow_type: 'result_analysis',
    target_ref: ref('validation_cycle', 'validation_cycle_001'),
    preflight_blockers: [],
    role_summary: 'Result analysis passed.',
    role_blocker_codes: [],
    role_warning_codes: [],
    blockers: [],
    warnings: [],
    runtime_failure_code: null,
    domain_gate_request: { result_interpretation_packet_id: 'result_packet_001' },
    scenario_outputs: PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SCENARIO_KINDS.map((kind) =>
      resultAnalysisScenarioOutput(kind)),
    role_artifact_refs: [ref('result_analysis_role_artifact', 'role_payload_001')],
    role_artifact_hashes: [hashA],
    admitted_role_artifact_refs: [ref('result_analysis_role_artifact', 'role_payload_001')],
    admitted_role_artifact_hashes: [hashA],
    role_prompt_packet_refs: [ref('runtime_prompt_packet', 'prompt_packet_001')],
    role_prompt_packet_hashes: [hashB],
    role_token_budget_gate_result_refs: [ref('token_budget_gate_result', 'token_gate_001')],
    role_compression_report_refs: [],
    runtime_identity: { slot_id: PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SLOT_ID },
    cache_identity: { prompt_packet_cache_key_hashes: [hashB] },
    source_refs: [ref('run_evidence_unit', 'run_evidence_unit_001')],
    source_hash_bundle_hash: hashC,
  };
  assert.equal(
    await validatesBody(paperImplementationResultAnalysisArtifactSchema, artifact),
    true,
  );
  assert.equal(
    await validatesBody(paperImplementationResultAnalysisArtifactSchema, {
      ...artifact,
      domain_gate_request: null,
    }),
    false,
  );
  assert.equal(
    await validatesBody(paperImplementationResultAnalysisArtifactSchema, {
      ...artifact,
      scenario_outputs: [resultAnalysisScenarioOutput('positive')],
    }),
    false,
  );
});

test('result analysis runtime request accepts one controlled role output and rejects provider fixtures', async () => {
  const roleOutputs = {
    [PAPER_IMPLEMENTATION_RESULT_ANALYSIS_ROLE_SLOT_ID]: resultAnalysisRoleOutput(),
  };
  const request = {
    schema_version: PAPER_IMPLEMENTATION_RESULT_ANALYSIS_RUNTIME_RUN_REQUEST_SCHEMA_VERSION,
    run_id: 'result-analysis-run-001',
    run_mode: 'dry_run',
    execution_mode: 'codex_assisted',
    target_ref: ref('validation_cycle', 'validation_cycle_001'),
    target_version_id: 'v1',
    input_snapshot_ref: ref('implementation_input_snapshot', 'implementation_input_snapshot_001'),
    input_snapshot_hash: hashC,
    source_refs: [ref('run_evidence_unit', 'run_evidence_unit_001')],
    source_hashes: [hashD],
    codex_role_outputs: roleOutputs,
  };
  assert.equal(
    await validatesBody(runPaperImplementationResultAnalysisRuntimeRequestSchema, request),
    true,
  );
  assert.equal(
    await validatesBody(runPaperImplementationResultAnalysisRuntimeRequestSchema, {
      ...request,
      implementation_project_id: 'implementation_project_001',
    }),
    false,
  );
  assert.equal(
    await validatesBody(runPaperImplementationResultAnalysisRuntimeRequestSchema, {
      ...request,
      execution_mode: 'provider_llm',
      model_profile_id: 'paper-implementation.result-analysis.interpretation-scenarios.v1',
      model_option_id: 'paper-implementation.result-analysis.interpretation-scenarios.v1.openai-balanced',
      codex_role_outputs: undefined,
      mocked_role_outputs: roleOutputs,
    }),
    false,
  );
});

test('experiment planning role schemas require design candidates and critique coverage', async () => {
  assert.equal(
    await validatesBody(paperImplementationExperimentPlanningRoleOutputSchema, experimentDesignRoleOutput()),
    true,
  );
  assert.equal(
    await validatesBody(paperImplementationExperimentPlanningRoleOutputSchema, experimentDesignRoleOutput({
      work_order_draft_candidates: [experimentDraftCandidate('single_candidate', false)],
    })),
    false,
  );
  assert.equal(
    await validatesBody(paperImplementationExperimentPlanningRoleOutputSchema, experimentDesignRoleOutput({
      work_order_draft_candidates: [
        {
          ...experimentDraftCandidate('invalid_work_order_request_candidate', false),
          work_order_draft_request: {
            work_order_id: 'invalid_work_order_draft',
            validation_cycle_id: 'validation_cycle_001',
            run_type: 'exploratory',
          } as unknown as PaperImplementationExperimentWorkOrderDraftCandidate['work_order_draft_request'],
        },
        experimentDraftCandidate('confirmatory_candidate', true),
      ],
    })),
    false,
  );
  assert.equal(
    await validatesBody(paperImplementationExperimentPlanningRoleOutputSchema, experimentDesignRoleOutput({
      role_status: 'blocked',
      blocker_codes: ['route_refs_missing'],
      work_order_draft_candidates: [],
    })),
    true,
  );
  assert.equal(
    await validatesBody(paperImplementationExperimentPlanningRoleOutputSchema, experimentCritiqueRoleOutput()),
    true,
  );
  assert.equal(
    await validatesBody(paperImplementationExperimentPlanningRoleOutputSchema, experimentCritiqueRoleOutput({
      checked_dimensions: ['compute_budget'],
    })),
    false,
  );
  assert.equal(
    await validatesBody(paperImplementationExperimentPlanningRoleOutputSchema, experimentCritiqueRoleOutput({
      critique_decision: {
        decision: 'approve_for_work_order_draft',
        rationale: 'Invalid because side-effect safety is not explicit.',
        required_revision_refs: [],
        no_execution_side_effect: false,
      } as unknown as PaperImplementationExperimentPlanningRoleOutput['critique_decision'],
    })),
    false,
  );
});

test('experiment planning final artifact schemas keep WorkOrder proposal and critique authority bounded', async () => {
  const designArtifact = {
    status: 'passed',
    slot_id: PAPER_IMPLEMENTATION_EXPERIMENT_DESIGN_SLOT_ID,
    workflow_type: 'experiment_design',
    target_ref: ref('validation_cycle', 'validation_cycle_001'),
    preflight_blockers: [],
    role_summary: 'Experiment design passed.',
    role_blocker_codes: [],
    role_warning_codes: [],
    blockers: [],
    warnings: [],
    runtime_failure_code: null,
    work_order_draft_candidates: [
      experimentDraftCandidate('exploratory_candidate', false),
      experimentDraftCandidate('confirmatory_candidate', true),
    ],
    checked_dimensions: [],
    critique_findings: [],
    critique_decision: null,
    no_execution_side_effect: true,
    role_artifact_refs: [ref('experiment_design_role_artifact', 'role_payload_001')],
    role_artifact_hashes: [hashA],
    admitted_role_artifact_refs: [ref('experiment_design_role_artifact', 'role_payload_001')],
    admitted_role_artifact_hashes: [hashA],
    role_prompt_packet_refs: [ref('runtime_prompt_packet', 'prompt_packet_001')],
    role_prompt_packet_hashes: [hashB],
    role_token_budget_gate_result_refs: [ref('token_budget_gate_result', 'token_gate_001')],
    role_compression_report_refs: [],
    runtime_identity: { slot_id: PAPER_IMPLEMENTATION_EXPERIMENT_DESIGN_SLOT_ID },
    cache_identity: { prompt_packet_cache_key_hashes: [hashB] },
    source_refs: [ref('technical_route_candidate', 'route_candidate_001')],
    source_hash_bundle_hash: hashC,
  };
  assert.equal(
    await validatesBody(paperImplementationExperimentPlanningArtifactSchema, designArtifact),
    true,
  );
  assert.equal(
    await validatesBody(paperImplementationExperimentPlanningArtifactSchema, {
      ...designArtifact,
      work_order_draft_candidates: [experimentDraftCandidate('single_candidate', false)],
    }),
    false,
  );
  assert.equal(
    await validatesBody(paperImplementationExperimentPlanningArtifactSchema, {
      ...designArtifact,
      domain_gate_request: { work_order_id: 'must_not_exist' },
    }),
    false,
  );

  const critiqueArtifact = {
    ...designArtifact,
    slot_id: PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_SLOT_ID,
    workflow_type: 'experiment_critique',
    work_order_draft_candidates: [],
    checked_dimensions: [...PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_DIMENSIONS],
    critique_findings: experimentCritiqueRoleOutput().critique_findings,
    critique_decision: experimentCritiqueRoleOutput().critique_decision,
  };
  assert.equal(
    await validatesBody(paperImplementationExperimentPlanningArtifactSchema, critiqueArtifact),
    true,
  );
  assert.equal(
    await validatesBody(paperImplementationExperimentPlanningArtifactSchema, {
      ...critiqueArtifact,
      workflow_type: 'experiment_design',
    }),
    false,
  );
});

test('experiment planning runtime request accepts controlled role output and rejects provider fixtures', async () => {
  const roleOutputs = {
    [PAPER_IMPLEMENTATION_EXPERIMENT_DESIGN_ROLE_SLOT_ID]: experimentDesignRoleOutput(),
  };
  const request = {
    schema_version: PAPER_IMPLEMENTATION_EXPERIMENT_PLANNING_RUNTIME_RUN_REQUEST_SCHEMA_VERSION,
    run_id: 'experiment-design-run-001',
    run_mode: 'dry_run',
    execution_mode: 'codex_assisted',
    target_ref: ref('validation_cycle', 'validation_cycle_001'),
    target_version_id: 'v1',
    input_snapshot_ref: ref('implementation_input_snapshot', 'implementation_input_snapshot_001'),
    input_snapshot_hash: hashC,
    source_refs: [ref('technical_route_candidate', 'route_candidate_001')],
    source_hashes: [hashD],
    codex_role_outputs: roleOutputs,
  };
  assert.equal(
    await validatesBody(runPaperImplementationExperimentPlanningRuntimeRequestSchema, request),
    true,
  );
  assert.equal(
    await validatesBody(runPaperImplementationExperimentPlanningRuntimeRequestSchema, {
      ...request,
      implementation_project_id: 'implementation_project_001',
    }),
    false,
  );
  assert.equal(
    await validatesBody(runPaperImplementationExperimentPlanningRuntimeRequestSchema, {
      ...request,
      execution_mode: 'provider_llm',
      model_profile_id: 'paper-implementation.experiment-design.work-order-draft.v1',
      model_option_id: 'paper-implementation.experiment-design.work-order-draft.v1.openai-balanced',
      codex_role_outputs: undefined,
      mocked_role_outputs: roleOutputs,
    }),
    false,
  );
});

test('runtime admission record rejects missing admitted refs and prompt leakage', async () => {
  const missingAdmittedRef = {
    ...roleAdmissionRecord(),
    admitted_artifact_ref: null,
  };
  assert.equal(
    await validatesBody(paperImplementationRuntimeAdmissionRecordSchema, missingAdmittedRef),
    false,
  );

  const leakedPrompt = roleAdmissionRecord() as unknown as Record<string, unknown>;
  leakedPrompt.rendered_prompt_text = 'admission verifies identity but never stores prompt text';
  assert.equal(
    await validatesBody(paperImplementationRuntimeAdmissionRecordSchema, leakedPrompt),
    false,
  );
});

test('runtime admission record rejects legacy runtime/proposal wrappers', async () => {
  const legacyContract = roleAdmissionRecord({
    artifact_contract_id: 'PaperImplementationProposalArtifact',
  });
  assert.equal(
    await validatesBody(paperImplementationRuntimeAdmissionRecordSchema, legacyContract),
    false,
  );

  const legacyRuntimeRef = roleAdmissionRecord({
    runtime_artifact_ref: ref('agent_workflow_harness_run', 'harness_run_001'),
  });
  assert.equal(
    await validatesBody(paperImplementationRuntimeAdmissionRecordSchema, legacyRuntimeRef),
    false,
  );

  const legacyAdmittedRef = roleAdmissionRecord({
    admitted_artifact_ref: ref('implementation_proposal_artifact', 'proposal_artifact_001'),
  });
  assert.equal(
    await validatesBody(paperImplementationRuntimeAdmissionRecordSchema, legacyAdmittedRef),
    false,
  );
});

test('runtime admission identity rejects nested prompt and provider payload leakage', async () => {
  const directPromptLeak = roleAdmissionRecord({
    admission_identity: {
      rendered_prompt_text: 'prompt text must never be embedded',
    },
  });
  assert.equal(
    await validatesBody(paperImplementationRuntimeAdmissionRecordSchema, directPromptLeak),
    false,
  );

  const nestedProviderLeak = roleAdmissionRecord({
    admission_identity: {
      checks: [{
        raw_provider_response: 'provider payload must never be embedded',
      }],
    },
  });
  assert.equal(
    await validatesBody(paperImplementationRuntimeAdmissionRecordSchema, nestedProviderLeak),
    false,
  );
});

test('runtime admission record requires issue codes for rejected admissions', async () => {
  const rejectedWithoutIssue = roleAdmissionRecord({
    admission_status: 'rejected',
    admitted_artifact_ref: null,
    admitted_artifact_hash: null,
    issue_codes: [],
  });
  assert.equal(
    await validatesBody(paperImplementationRuntimeAdmissionRecordSchema, rejectedWithoutIssue),
    false,
  );

  const rejectedWithIssue = roleAdmissionRecord({
    admission_status: 'rejected',
    admitted_artifact_ref: null,
    admitted_artifact_hash: null,
    issue_codes: ['prompt_packet_hash_mismatch'],
  });
  assert.equal(
    await validatesBody(paperImplementationRuntimeAdmissionRecordSchema, rejectedWithIssue),
    true,
  );
});
