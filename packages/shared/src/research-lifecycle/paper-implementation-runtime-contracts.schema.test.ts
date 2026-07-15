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
  PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_ROLE_SLOT_ID,
  PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_RUNTIME_RUN_REQUEST_SCHEMA_VERSION,
  PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_SLOT_ID,
  PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_ROLE_SLOT_ID,
  PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_RUNTIME_RUN_REQUEST_SCHEMA_VERSION,
  PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_SLOT_ID,
  PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_ROLE_SLOT_ID,
  PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_RUNTIME_RUN_REQUEST_SCHEMA_VERSION,
  PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_SLOT_ID,
  PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_ROLE_SLOT_ID,
  PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_RUNTIME_RUN_REQUEST_SCHEMA_VERSION,
  PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_SLOT_ID,
  PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_OPTION_DESIGNER_ROLE_SLOT_ID,
  PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_RISK_CHALLENGER_ROLE_SLOT_ID,
  PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_RUNTIME_RUN_REQUEST_SCHEMA_VERSION,
  PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_SLOT_ID,
  PAPER_IMPLEMENTATION_P1_RUNTIME_RUN_REQUEST_SCHEMA_VERSION,
  PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_ROLE_SLOT_ID,
  PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_SLOT_ID,
  PAPER_IMPLEMENTATION_ROUTE_PLANNING_RUNTIME_RUN_REQUEST_SCHEMA_VERSION,
  PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_ROLE_SLOT_ID,
  PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_SLOT_ID,
  PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_RISK_DIMENSIONS,
  PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_ROLE_SLOT_ID,
  PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_RUNTIME_RUN_REQUEST_SCHEMA_VERSION,
  PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_SLOT_ID,
  PAPER_IMPLEMENTATION_RESULT_ANALYSIS_RUNTIME_RUN_REQUEST_SCHEMA_VERSION,
  PAPER_IMPLEMENTATION_RESULT_ANALYSIS_ROLE_SLOT_ID,
  PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SCENARIO_KINDS,
  PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SLOT_ID,
  PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_RUNTIME_RUN_REQUEST_SCHEMA_VERSION,
  PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_SEMANTIC_ROLE_SLOT_IDS,
  admitPaperImplementationRuntimeArtifactRequestSchema,
  paperImplementationP1RuntimeReviewArtifactSchema,
  paperImplementationP1RuntimeReviewRoleOutputSchema,
  paperImplementationP1RuntimeReviewRoleWireOutputSchema,
  paperImplementationExperimentPlanningArtifactSchema,
  paperImplementationExperimentPlanningRoleOutputSchema,
  paperImplementationCrossBoardSynthesisArtifactSchema,
  paperImplementationCrossBoardSynthesisRoleOutputSchema,
  paperImplementationEvidenceBoardCurationArtifactSchema,
  paperImplementationEvidenceBoardCurationRoleOutputSchema,
  paperImplementationFeasibilityPlanningArtifactSchema,
  paperImplementationFeasibilityPlanningRoleOutputSchema,
  paperImplementationMotiveDecompositionArtifactSchema,
  paperImplementationMotiveDecompositionRoleOutputSchema,
  paperImplementationMotiveEvolutionArtifactSchema,
  paperImplementationMotiveEvolutionOptionDesignerRoleOutputSchema,
  paperImplementationMotiveEvolutionOptionDesignerRoleWireOutputSchema,
  paperImplementationMotiveEvolutionRiskChallengerRoleOutputSchema,
  paperImplementationMotiveEvolutionRiskChallengerRoleWireOutputSchema,
  paperImplementationMotiveEvolutionRoleOutputSchema,
  paperImplementationRoutePlanningArtifactSchema,
  paperImplementationRoutePlanningRoleOutputSchema,
  paperImplementationValidationCyclePlanningArtifactSchema,
  paperImplementationValidationCyclePlanningRoleOutputSchema,
  paperImplementationResultAnalysisArtifactSchema,
  paperImplementationResultAnalysisRoleOutputSchema,
  paperImplementationResultAnalysisRoleWireOutputSchema,
  paperImplementationRuntimeAdmissionRecordSchema,
  paperImplementationRuntimeArtifactEnvelopeSchema,
  paperImplementationTraceIntegrityDebateArtifactSchema,
  paperImplementationTraceIntegrityRoleOutputSchema,
  runPaperImplementationP1RuntimeReviewRequestSchema,
  runPaperImplementationExperimentPlanningRuntimeRequestSchema,
  runPaperImplementationCrossBoardSynthesisRuntimeRequestSchema,
  runPaperImplementationEvidenceBoardCurationRuntimeRequestSchema,
  runPaperImplementationFeasibilityPlanningRuntimeRequestSchema,
  runPaperImplementationMotiveDecompositionRuntimeRequestSchema,
  runPaperImplementationMotiveEvolutionRuntimeRequestSchema,
  runPaperImplementationRoutePlanningRuntimeRequestSchema,
  runPaperImplementationValidationCyclePlanningRuntimeRequestSchema,
  runPaperImplementationResultAnalysisRuntimeRequestSchema,
  runPaperImplementationTraceIntegrityDebateRuntimeRequestSchema,
  type PaperImplementationCrossBoardAnchor,
  type PaperImplementationCrossBoardScenarioProposal,
  type PaperImplementationCrossBoardSynthesisRoleOutput,
  type PaperImplementationEvidenceBoardBindingCandidateProposal,
  type PaperImplementationEvidenceBoardCurationRoleOutput,
  type PaperImplementationEvidenceBoardGapCandidateProposal,
  type PaperImplementationFeasibilityPlanningRoleOutput,
  type PaperImplementationFeasibilityProbePlanCandidateProposal,
  type PaperImplementationMotiveDecompositionDraftAssertionCandidate,
  type PaperImplementationMotiveDecompositionRoleOutput,
  type PaperImplementationMotiveEvolutionDecisionOption,
  type PaperImplementationMotiveEvolutionDesignedOption,
  type PaperImplementationMotiveEvolutionOptionDesignerRoleOutput,
  type PaperImplementationMotiveEvolutionRiskChallengerRoleOutput,
  type PaperImplementationValidationCycleCandidateProposal,
  type PaperImplementationValidationCyclePlanningRoleOutput,
  type PaperImplementationExperimentPlanningRoleOutput,
  type PaperImplementationExperimentWorkOrderDraftCandidate,
  type PaperImplementationRouteCandidateProposal,
  type PaperImplementationRoutePlanningRoleOutput,
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

function hash(seed: string): string {
  const value = Array.from(seed).reduce((sum, char) => sum + char.charCodeAt(0), 0) % 16;
  return value.toString(16).repeat(64);
}

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

function routeCandidateProposal(
  candidateKey: string,
  confirmatoryMarker: boolean,
): PaperImplementationRouteCandidateProposal {
  return {
    candidate_key: candidateKey,
    route_summary: `${candidateKey} proposes a bounded technical route without persistence writes.`,
    expected_information_gain: 'Separates route feasibility signal from downstream validation admission.',
    baseline_gap_status: confirmatoryMarker ? 'partial' : 'unknown',
    cited_source_refs: [ref('implementation_input_snapshot', 'implementation_input_snapshot_001')],
    trace_refs: [ref('trace_manifest', `trace_manifest_${candidateKey}`)],
    validation_signal_refs: [ref('validation_signal', `validation_signal_${candidateKey}`)],
    dataset_refs: [ref('dataset_version', `dataset_version_${candidateKey}`)],
    metric_refs: [ref('metric', `metric_${candidateKey}`)],
    baseline_refs: [ref('baseline_version', `baseline_version_${candidateKey}`)],
    code_refs: [ref('code_version', `code_version_${candidateKey}`)],
    config_refs: [ref('config_snapshot', `config_snapshot_${candidateKey}`)],
    scope_boundary: 'Runtime proposal only; deterministic admission owns persisted route records.',
    confirmatory_marker: confirmatoryMarker,
    blocker_codes: [],
    warning_codes: [],
  };
}

function routeArchitectureRoleOutput(
  overrides: Partial<PaperImplementationRoutePlanningRoleOutput> = {},
): PaperImplementationRoutePlanningRoleOutput {
  return {
    role_slot_id: PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_ROLE_SLOT_ID,
    role_status: 'passed',
    summary: 'Route architecture proposed bounded route candidates.',
    cited_source_refs: [ref('implementation_input_snapshot', 'implementation_input_snapshot_001')],
    blocker_codes: [],
    warning_codes: [],
    route_candidate_proposals: [
      routeCandidateProposal('exploratory_route_candidate', false),
      routeCandidateProposal('confirmatory_route_candidate', true),
    ],
    ...overrides,
  };
}

function routeSkepticRoleOutput(
  overrides: Partial<PaperImplementationRoutePlanningRoleOutput> = {},
): PaperImplementationRoutePlanningRoleOutput {
  return {
    role_slot_id: PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_ROLE_SLOT_ID,
    role_status: 'passed',
    summary: 'Independent route skeptic reviewed risk coverage.',
    cited_source_refs: [ref('route_architecture_runtime_artifact', 'route_architecture_final_001')],
    blocker_codes: [],
    warning_codes: [],
    reviewed_route_proposal_ref: ref('route_architecture_runtime_artifact', 'route_architecture_final_001'),
    reviewed_route_proposal_hash: hashA,
    reviewed_candidate_keys: ['exploratory_route_candidate'],
    checked_dimensions: [...PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_RISK_DIMENSIONS],
    risk_findings: [{
      finding_id: 'route_risk_finding_budget_001',
      risk_dimension: 'compute_budget',
      severity: 'warning',
      summary: 'Compute budget needs explicit downstream feasibility confirmation.',
      evidence_refs: [ref('validation_budget', 'budget_001')],
      affected_candidate_keys: ['exploratory_route_candidate'],
      required_revision_refs: [],
      blocks_route_progression: false,
    }],
    recommended_disposition: 'revise',
    no_queue_side_effect: true,
    ...overrides,
  };
}

function validationCycleCandidateProposal(
  candidateKey: string,
  confirmatoryMarker: boolean,
): PaperImplementationValidationCycleCandidateProposal {
  return {
    candidate_key: candidateKey,
    reviewed_route_candidate_key: 'exploratory_route_candidate',
    target_ref: ref('technical_route_candidate', `technical_route_candidate_${candidateKey}`),
    target_frame_summary: `${candidateKey} validates a bounded route signal before deterministic cycle admission.`,
    cycle_type: confirmatoryMarker ? 'baseline_challenge' : 'route_feasibility',
    trigger_refs: [ref('route_risk_finding', `route_risk_finding_${candidateKey}`)],
    validation_question: `Can ${candidateKey} produce a useful route validation signal within the budget envelope?`,
    assumptions_under_test: ['The route has enough trace, dataset, metric, and budget context to validate.'],
    assertion_refs_under_test: [ref('motive_assertion', `motive_assertion_${candidateKey}`)],
    decision_if_pass: 'Admit a deterministic validation cycle draft downstream.',
    decision_if_fail: 'Park the candidate or send it back to route revision.',
    decision_if_inconclusive: 'Require additional source context before deterministic validation admission.',
    expected_information_gain: confirmatoryMarker ? 'medium' : 'high',
    criteria: {
      pass_conditions: ['The validation signal isolates route merit against the baseline.'],
      fail_conditions: ['The signal cannot distinguish route merit from missing context.'],
      inconclusive_conditions: ['Required dataset, metric, or budget facts are unavailable.'],
      stop_conditions: ['Budget envelope is exceeded.'],
      minimum_artifacts_required: ['route proposal artifact', 'route skeptic artifact'],
    },
    budget_envelope: {
      budget_ref: ref('validation_budget', `validation_budget_${candidateKey}`),
      iteration_budget_ref: ref('iteration_budget', `iteration_budget_${candidateKey}`),
      retry_budget: 1,
      max_runtime: '2h',
      max_compute: 'single-gpu-smoke',
      max_human_review_count: 1,
    },
    included_context_refs: [ref('route_architecture_runtime_artifact', 'route_architecture_final_001')],
    trace_refs: [ref('trace_manifest', `trace_manifest_${candidateKey}`)],
    confirmatory_marker: confirmatoryMarker,
    blocker_codes: [],
    warning_codes: [],
  };
}

function validationCyclePlanningRoleOutput(
  overrides: Partial<PaperImplementationValidationCyclePlanningRoleOutput> = {},
): PaperImplementationValidationCyclePlanningRoleOutput {
  return {
    role_slot_id: PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_ROLE_SLOT_ID,
    role_status: 'passed',
    summary: 'Validation-cycle planning proposed bounded candidate cycles.',
    cited_source_refs: [ref('route_architecture_runtime_artifact', 'route_architecture_final_001')],
    blocker_codes: [],
    warning_codes: [],
    reviewed_route_proposal_ref: ref('route_architecture_runtime_artifact', 'route_architecture_final_001'),
    reviewed_route_proposal_hash: hashA,
    reviewed_route_skeptic_artifact_ref: ref('route_skeptic_review_runtime_artifact', 'route_skeptic_final_001'),
    reviewed_route_skeptic_artifact_hash: hashB,
    reviewed_candidate_keys: ['exploratory_route_candidate'],
    cycle_candidate_proposals: [
      validationCycleCandidateProposal('exploratory_cycle_candidate', false),
      validationCycleCandidateProposal('confirmatory_cycle_candidate', true),
    ],
    no_domain_gate_request: true,
    no_queue_side_effect: true,
    no_validation_cycle_side_effect: true,
    ...overrides,
  };
}

function feasibilityProbePlanCandidateProposal(
  candidateKey: string,
  confirmatoryMarker: boolean,
): PaperImplementationFeasibilityProbePlanCandidateProposal {
  return {
    candidate_key: candidateKey,
    reviewed_cycle_candidate_key: 'exploratory_cycle_candidate',
    reviewed_route_candidate_key: 'exploratory_route_candidate',
    probe_kind: confirmatoryMarker ? 'baseline_check' : 'data_feasibility',
    probe_question: `Can ${candidateKey} verify feasibility without creating domain state?`,
    plan_summary: `${candidateKey} proposes ref-backed feasibility planning evidence only.`,
    expected_information_gain: confirmatoryMarker ? 'medium' : 'high',
    baseline_gap_status: confirmatoryMarker ? 'resolved' : 'open',
    primary_metric_refs: [ref('metric', `metric_${candidateKey}`)],
    dataset_version_refs: [ref('dataset_version', `dataset_version_${candidateKey}`)],
    baseline_version_refs: [ref('baseline_version', `baseline_version_${candidateKey}`)],
    code_version_refs: [ref('code_version', `code_version_${candidateKey}`)],
    config_refs: [ref('config_snapshot', `config_snapshot_${candidateKey}`)],
    budget_envelope: {
      budget_ref: ref('validation_budget', `validation_budget_${candidateKey}`),
      iteration_budget_ref: ref('iteration_budget', `iteration_budget_${candidateKey}`),
      retry_budget: 1,
      estimated_cost_class: confirmatoryMarker ? 'medium' : 'low',
      max_runtime: '2h',
      max_compute: 'single-gpu-smoke',
      max_human_review_count: 1,
    },
    stop_condition_refs: [ref('stop_condition', `stop_condition_${candidateKey}`)],
    trace_refs: [ref('trace_manifest', `trace_manifest_${candidateKey}`)],
    confirmatory_marker: confirmatoryMarker,
    blocker_codes: [],
    warning_codes: [],
  };
}

function feasibilityPlanningRoleOutput(
  overrides: Partial<PaperImplementationFeasibilityPlanningRoleOutput> = {},
): PaperImplementationFeasibilityPlanningRoleOutput {
  return {
    role_slot_id: PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_ROLE_SLOT_ID,
    role_status: 'passed',
    summary: 'Feasibility planning proposed bounded probe and plan-light candidates.',
    cited_source_refs: [ref('validation_cycle_planning_runtime_artifact', 'validation_cycle_final_001')],
    blocker_codes: [],
    warning_codes: [],
    reviewed_validation_cycle_artifact_ref: ref('validation_cycle_planning_runtime_artifact', 'validation_cycle_final_001'),
    reviewed_validation_cycle_artifact_hash: hashA,
    reviewed_route_proposal_ref: ref('route_architecture_runtime_artifact', 'route_architecture_final_001'),
    reviewed_route_proposal_hash: hashB,
    reviewed_route_skeptic_artifact_ref: ref('route_skeptic_review_runtime_artifact', 'route_skeptic_final_001'),
    reviewed_route_skeptic_artifact_hash: hashC,
    reviewed_cycle_candidate_keys: ['exploratory_cycle_candidate'],
    reviewed_route_candidate_keys: ['exploratory_route_candidate'],
    probe_plan_candidate_proposals: [
      feasibilityProbePlanCandidateProposal('lightweight_probe_candidate', false),
      feasibilityProbePlanCandidateProposal('plan_light_readiness_candidate', true),
    ],
    no_domain_gate_request: true,
    no_queue_side_effect: true,
    no_feasibility_probe_side_effect: true,
    no_experiment_plan_light_side_effect: true,
    no_validation_cycle_side_effect: true,
    ...overrides,
  };
}

function crossBoardAnchor(id: string): PaperImplementationCrossBoardAnchor {
  return {
    board_version_ref: ref('motive_evidence_board_version', `board_version_${id}`),
    board_version_hash: hash(id),
    motive_ref: ref('core_motive', `core_motive_${id}`),
    core_motive_version_ref: ref('core_motive_version', `core_motive_version_${id}`),
    trace_manifest_ref: ref('trace_manifest', `trace_manifest_${id}`),
    trace_manifest_hash: hash(`trace_manifest_${id}`),
    evidence_binding_refs: [ref('evidence_binding', `evidence_binding_${id}`)],
    source_locator_refs: [ref('source_locator', `source_locator_${id}`)],
    conflict_refs: id === '001' ? [ref('motive_board_conflict', 'conflict_001')] : [],
    challenge_refs: id === '001' ? [ref('motive_board_challenge', 'challenge_001')] : [],
    freshness_status: 'fresh',
  };
}

function crossBoardScenarioProposal(
  scenarioKey: string,
  overrides: Partial<PaperImplementationCrossBoardScenarioProposal> = {},
): PaperImplementationCrossBoardScenarioProposal {
  return {
    scenario_key: scenarioKey,
    scenario_kind: 'reuse',
    disposition: 'viable_candidate',
    source_board_version_refs: [
      ref('motive_evidence_board_version', 'board_version_001'),
      ref('motive_evidence_board_version', 'board_version_002'),
    ],
    source_board_version_hashes: [hash('001'), hash('002')],
    target_motive_refs: [ref('core_motive', 'core_motive_001')],
    evidence_transfer_binding_refs: [ref('evidence_transfer_binding', 'transfer_binding_001')],
    conflict_refs: [ref('motive_board_conflict', 'conflict_001')],
    challenge_refs: [ref('motive_board_challenge', 'challenge_001')],
    freshness_blockers: [],
    source_locator_refs: [
      ref('source_locator', 'source_locator_001'),
      ref('source_locator', 'source_locator_002'),
    ],
    expected_benefit: 'Reuse traced evidence across compatible board versions without mutating domain state.',
    risk_codes: ['scope_transfer_risk'],
    blocker_codes: [],
    warning_codes: [],
    recommended_next_gate: 'cross_board_review',
    ...overrides,
  };
}

function crossBoardSynthesisRoleOutput(
  overrides: Partial<PaperImplementationCrossBoardSynthesisRoleOutput> = {},
): PaperImplementationCrossBoardSynthesisRoleOutput {
  return {
    role_slot_id: PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_ROLE_SLOT_ID,
    role_status: 'passed',
    summary: 'Cross-board synthesis proposed bounded merge/split/reuse scenarios.',
    cited_source_refs: [ref('motive_evidence_board_version', 'board_version_001')],
    reviewed_board_version_refs: [
      ref('motive_evidence_board_version', 'board_version_001'),
      ref('motive_evidence_board_version', 'board_version_002'),
    ],
    reviewed_conflict_refs: [ref('motive_board_conflict', 'conflict_001')],
    reviewed_challenge_refs: [ref('motive_board_challenge', 'challenge_001')],
    reviewed_evidence_transfer_binding_refs: [ref('evidence_transfer_binding', 'transfer_binding_001')],
    scenario_proposals: [crossBoardScenarioProposal('reuse_scenario_001')],
    blocker_codes: [],
    warning_codes: [],
    no_domain_gate_request: true,
    no_queue_side_effect: true,
    no_cross_board_review_side_effect: true,
    no_evidence_transfer_binding_side_effect: true,
    no_portfolio_mutation_side_effect: true,
    no_motive_evolution_side_effect: true,
    ...overrides,
  };
}

function evidenceBoardBindingCandidateProposal(
  candidateKey: string,
  overrides: Partial<PaperImplementationEvidenceBoardBindingCandidateProposal> = {},
): PaperImplementationEvidenceBoardBindingCandidateProposal {
  return {
    candidate_key: candidateKey,
    target_assertion_ref: ref('motive_assertion', 'assertion_001'),
    evidence_ref: ref('evidence_unit', 'evidence_001'),
    source_locator_refs: [ref('source_locator', 'source_locator_001')],
    citation_candidate_refs: [ref('citation_candidate', 'citation_candidate_001')],
    proposed_role: 'supporting_evidence',
    proposed_scope: 'assertion_local',
    proposed_strength: 'moderate',
    support_state: 'viable_binding',
    challenge_status: 'passed',
    freshness_status: 'fresh',
    interpretation: 'Candidate proposes a ref-backed binding without creating board or binding state.',
    challenge_check: {
      memo_or_summary_rejected: true,
      locator_quality: 'verified',
      citation_status: 'reviewed',
      scope_match_status: 'matched',
      freshness_status: 'fresh',
      should_downgrade_to_gap: false,
      downgrade_reason_codes: [],
      blocking_reason_codes: [],
    },
    blocker_codes: [],
    warning_codes: [],
    recommended_next_gate: 'motive_evidence_board_review',
    ...overrides,
  };
}

function evidenceBoardGapCandidateProposal(
  gapKey: string,
  overrides: Partial<PaperImplementationEvidenceBoardGapCandidateProposal> = {},
): PaperImplementationEvidenceBoardGapCandidateProposal {
  return {
    gap_key: gapKey,
    target_assertion_ref: ref('motive_assertion', 'assertion_001'),
    gap_kind: 'missing_source_locator',
    missing_evidence_need: 'Need a source locator before deterministic board curation can bind this evidence.',
    source_locator_blockers: ['missing_locator'],
    citation_blockers: [],
    freshness_blockers: [],
    recommended_next_gate: 'trace_repair',
    blocker_codes: ['missing_locator'],
    warning_codes: [],
    ...overrides,
  };
}

function evidenceBoardCurationRoleOutput(
  overrides: Partial<PaperImplementationEvidenceBoardCurationRoleOutput> = {},
): PaperImplementationEvidenceBoardCurationRoleOutput {
  return {
    role_slot_id: PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_ROLE_SLOT_ID,
    role_status: 'passed',
    summary: 'Evidence-board curation proposed append-only binding and gap candidates.',
    cited_source_refs: [ref('source_locator', 'source_locator_001')],
    reviewed_assertion_refs: [ref('motive_assertion', 'assertion_001')],
    reviewed_source_locator_refs: [ref('source_locator', 'source_locator_001')],
    reviewed_citation_candidate_refs: [ref('citation_candidate', 'citation_candidate_001')],
    reviewed_evidence_refs: [ref('evidence_unit', 'evidence_001')],
    reviewed_existing_evidence_binding_refs: [ref('evidence_binding', 'existing_binding_001')],
    binding_candidate_proposals: [evidenceBoardBindingCandidateProposal('binding_candidate_001')],
    gap_candidate_proposals: [evidenceBoardGapCandidateProposal('gap_candidate_001')],
    blocker_codes: [],
    warning_codes: [],
    no_domain_gate_request: true,
    no_queue_side_effect: true,
    no_board_write_side_effect: true,
    no_evidence_binding_side_effect: true,
    no_evidence_transfer_binding_side_effect: true,
    no_citation_candidate_side_effect: true,
    no_trace_repair_queue_side_effect: true,
    ...overrides,
  };
}

function motiveDecompositionDraftAssertionCandidate(
  candidateKey: string,
  overrides: Partial<PaperImplementationMotiveDecompositionDraftAssertionCandidate> = {},
): PaperImplementationMotiveDecompositionDraftAssertionCandidate {
  return {
    candidate_key: candidateKey,
    source_assertion_ref: ref('motive_assertion', 'assertion_001'),
    candidate_kind: 'split_child',
    draft_assertion_text: 'Draft assertion decomposes one bounded support obligation.',
    scope_boundary_summary: 'Candidate remains within the source assertion scope.',
    support_obligation_summary: 'Candidate requires request-owned evidence and trace refs.',
    covered_evidence_refs: [ref('evidence_unit', 'evidence_001')],
    covered_source_refs: [ref('source', 'source_001')],
    covered_source_locator_refs: [ref('source_locator', 'source_locator_001')],
    covered_citation_candidate_refs: [ref('citation_candidate', 'citation_candidate_001')],
    covered_trace_manifest_refs: [ref('trace_manifest', 'trace_manifest_001')],
    decomposition_check: {
      compoundness_status: 'multiple_obligations',
      scope_change_status: 'split',
      evidence_coverage_status: 'partial',
      trace_alignment_status: 'aligned',
      new_claim_risk: false,
      human_confirmation_required: false,
      blocking_reason_codes: [],
      recommended_next_gate: 'motive_assertion_review',
    },
    blocker_codes: [],
    warning_codes: [],
    recommended_next_gate: 'motive_assertion_review',
    ...overrides,
  };
}

function motiveDecompositionRoleOutput(
  overrides: Partial<PaperImplementationMotiveDecompositionRoleOutput> = {},
): PaperImplementationMotiveDecompositionRoleOutput {
  return {
    role_slot_id: PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_ROLE_SLOT_ID,
    role_status: 'passed',
    summary: 'Motive decomposition proposed draft assertion candidates.',
    cited_source_refs: [ref('source', 'source_001')],
    decomposition_result_status: 'candidates_proposed',
    reviewed_assertion_refs: [ref('motive_assertion', 'assertion_001')],
    draft_assertion_candidates: [motiveDecompositionDraftAssertionCandidate('draft_assertion_candidate_001')],
    blocker_codes: [],
    warning_codes: [],
    no_domain_gate_request: true,
    no_queue_side_effect: true,
    no_motive_write_side_effect: true,
    no_motive_evolution_side_effect: true,
    no_board_write_side_effect: true,
    no_evidence_binding_side_effect: true,
    no_trace_repair_queue_side_effect: true,
    ...overrides,
  };
}

function motiveEvolutionDesignedOption(
  _optionKey: string,
  overrides: Partial<PaperImplementationMotiveEvolutionDesignedOption> = {},
): PaperImplementationMotiveEvolutionDesignedOption {
  return {
    option_kind: 'supersede',
    supporting_refs: [ref('evidence_binding', 'evidence_binding_001')],
    challenging_refs: [ref('challenge', 'challenge_001')],
    portfolio_impact_class: 'semantic_version_change',
    human_confirmation_required: true,
    recommended_next_gate: 'motive_evolution_review',
    blocker_codes: [],
    warning_codes: [],
    ...overrides,
  };
}

function motiveEvolutionDecisionOption(
  _optionKey: string,
  overrides: Partial<PaperImplementationMotiveEvolutionDecisionOption> = {},
): PaperImplementationMotiveEvolutionDecisionOption {
  return {
    ...motiveEvolutionDesignedOption(_optionKey),
    challenge_check: {
      evidence_status: 'partial',
      trace_status: 'satisfied',
      portfolio_status: 'partial',
      human_confirmation_status: 'blocked',
      downstream_impact_status: 'partial',
      blocking_reason_codes: ['human_confirmation_required'],
    },
    ...overrides,
  };
}

function motiveEvolutionDesignedOptionsByKey(
  optionKey: string,
  overrides: Partial<PaperImplementationMotiveEvolutionDesignedOption> = {},
): Record<string, PaperImplementationMotiveEvolutionDesignedOption> {
  return {
    [optionKey]: motiveEvolutionDesignedOption(optionKey, overrides),
  };
}

function motiveEvolutionDecisionOptionsByKey(
  optionKey: string,
  overrides: Partial<PaperImplementationMotiveEvolutionDecisionOption> = {},
): Record<string, PaperImplementationMotiveEvolutionDecisionOption> {
  return {
    [optionKey]: motiveEvolutionDecisionOption(optionKey, overrides),
  };
}

function motiveEvolutionDesignerRoleOutput(
  overrides: Partial<PaperImplementationMotiveEvolutionOptionDesignerRoleOutput> = {},
): PaperImplementationMotiveEvolutionOptionDesignerRoleOutput {
  return {
    role_slot_id: PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_OPTION_DESIGNER_ROLE_SLOT_ID,
    role_status: 'passed',
    summary: 'Motive evolution option designer proposed bounded support options.',
    cited_source_refs: [ref('source', 'source_001')],
    support_result_status: 'options_proposed',
    blocker_codes: [],
    warning_codes: [],
    no_domain_gate_request: true,
    no_queue_side_effect: true,
    no_motive_write_side_effect: true,
    no_motive_evolution_side_effect: true,
    no_portfolio_mutation_side_effect: true,
    no_board_write_side_effect: true,
    no_evidence_binding_side_effect: true,
    no_trace_repair_queue_side_effect: true,
    reviewed_target_motive_refs: [ref('core_motive', 'core_motive_001')],
    reviewed_core_motive_version_refs: [ref('core_motive_version', 'core_motive_version_001')],
    designed_options: motiveEvolutionDesignedOptionsByKey('evolution_option_001'),
    option_set_hash: hash('motive-evolution-option-set-001'),
    ...overrides,
  };
}

function motiveEvolutionChallengerRoleOutput(
  overrides: Partial<PaperImplementationMotiveEvolutionRiskChallengerRoleOutput> = {},
): PaperImplementationMotiveEvolutionRiskChallengerRoleOutput {
  return {
    role_slot_id: PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_RISK_CHALLENGER_ROLE_SLOT_ID,
    role_status: 'passed',
    summary: 'Motive evolution risk challenger covered every designed option.',
    cited_source_refs: [ref('source', 'source_001')],
    support_result_status: 'options_proposed',
    blocker_codes: [],
    warning_codes: [],
    no_domain_gate_request: true,
    no_queue_side_effect: true,
    no_motive_write_side_effect: true,
    no_motive_evolution_side_effect: true,
    no_portfolio_mutation_side_effect: true,
    no_board_write_side_effect: true,
    no_evidence_binding_side_effect: true,
    no_trace_repair_queue_side_effect: true,
    designer_role_artifact_ref: ref('motive_evolution_role_artifact', 'designer_role_001'),
    designer_role_artifact_hash: hash('designer-role-001'),
    option_set_hash: hash('motive-evolution-option-set-001'),
    challenged_option_keys: ['evolution_option_001'],
    decision_options: motiveEvolutionDecisionOptionsByKey('evolution_option_001'),
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
  assert.ok(paperImplementationRoutePlanningRoleOutputSchema);
  assert.ok(paperImplementationRoutePlanningArtifactSchema);
  assert.ok(runPaperImplementationRoutePlanningRuntimeRequestSchema);
  assert.ok(paperImplementationValidationCyclePlanningRoleOutputSchema);
  assert.ok(paperImplementationValidationCyclePlanningArtifactSchema);
  assert.ok(runPaperImplementationValidationCyclePlanningRuntimeRequestSchema);
  assert.ok(paperImplementationFeasibilityPlanningRoleOutputSchema);
  assert.ok(paperImplementationFeasibilityPlanningArtifactSchema);
  assert.ok(runPaperImplementationFeasibilityPlanningRuntimeRequestSchema);
  assert.ok(paperImplementationCrossBoardSynthesisRoleOutputSchema);
  assert.ok(paperImplementationCrossBoardSynthesisArtifactSchema);
  assert.ok(runPaperImplementationCrossBoardSynthesisRuntimeRequestSchema);
  assert.ok(paperImplementationEvidenceBoardCurationRoleOutputSchema);
  assert.ok(paperImplementationEvidenceBoardCurationArtifactSchema);
  assert.ok(runPaperImplementationEvidenceBoardCurationRuntimeRequestSchema);
  assert.ok(paperImplementationMotiveDecompositionRoleOutputSchema);
  assert.ok(paperImplementationMotiveDecompositionArtifactSchema);
  assert.ok(runPaperImplementationMotiveDecompositionRuntimeRequestSchema);
  assert.ok(paperImplementationMotiveEvolutionRoleOutputSchema);
  assert.ok(paperImplementationMotiveEvolutionOptionDesignerRoleOutputSchema);
  assert.ok(paperImplementationMotiveEvolutionRiskChallengerRoleOutputSchema);
  assert.ok(paperImplementationMotiveEvolutionArtifactSchema);
  assert.ok(runPaperImplementationMotiveEvolutionRuntimeRequestSchema);
  assert.ok(researchLifecycleContracts.paperImplementationRuntimeArtifactEnvelopeSchema);
  assert.ok(researchLifecycleContracts.paperImplementationRuntimeAdmissionRecordSchema);
  assert.ok(researchLifecycleContracts.runPaperImplementationTraceIntegrityDebateRuntimeRequestSchema);
  assert.ok(researchLifecycleContracts.runPaperImplementationP1RuntimeReviewRequestSchema);
  assert.ok(researchLifecycleContracts.runPaperImplementationResultAnalysisRuntimeRequestSchema);
  assert.ok(researchLifecycleContracts.runPaperImplementationExperimentPlanningRuntimeRequestSchema);
  assert.ok(researchLifecycleContracts.runPaperImplementationRoutePlanningRuntimeRequestSchema);
  assert.ok(researchLifecycleContracts.runPaperImplementationValidationCyclePlanningRuntimeRequestSchema);
  assert.ok(researchLifecycleContracts.runPaperImplementationFeasibilityPlanningRuntimeRequestSchema);
  assert.ok(researchLifecycleContracts.runPaperImplementationCrossBoardSynthesisRuntimeRequestSchema);
  assert.ok(researchLifecycleContracts.runPaperImplementationEvidenceBoardCurationRuntimeRequestSchema);
  assert.ok(researchLifecycleContracts.runPaperImplementationMotiveDecompositionRuntimeRequestSchema);
  assert.ok(researchLifecycleContracts.runPaperImplementationMotiveEvolutionRuntimeRequestSchema);
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

test('route planning role schemas require proposal set and skeptic coverage', async () => {
  assert.equal(
    await validatesBody(paperImplementationRoutePlanningRoleOutputSchema, routeArchitectureRoleOutput()),
    true,
  );
  assert.equal(
    await validatesBody(paperImplementationRoutePlanningRoleOutputSchema, routeArchitectureRoleOutput({
      route_candidate_proposals: [routeCandidateProposal('single_candidate', false)],
    })),
    false,
  );
  assert.equal(
    await validatesBody(paperImplementationRoutePlanningRoleOutputSchema, routeArchitectureRoleOutput({
      route_candidate_proposals: [
        {
          ...routeCandidateProposal('bad_authority_candidate', false),
          technical_route_candidate_create_request: { route_id: 'must_not_exist' },
        } as unknown as PaperImplementationRouteCandidateProposal,
        routeCandidateProposal('confirmatory_candidate', true),
      ],
    })),
    false,
  );
  assert.equal(
    await validatesBody(paperImplementationRoutePlanningRoleOutputSchema, routeArchitectureRoleOutput({
      role_status: 'blocked',
      blocker_codes: ['source_refs_missing'],
      route_candidate_proposals: [],
    })),
    true,
  );
  assert.equal(
    await validatesBody(paperImplementationRoutePlanningRoleOutputSchema, routeSkepticRoleOutput()),
    true,
  );
  assert.equal(
    await validatesBody(paperImplementationRoutePlanningRoleOutputSchema, routeSkepticRoleOutput({
      checked_dimensions: ['compute_budget'],
    })),
    false,
  );
  assert.equal(
    await validatesBody(paperImplementationRoutePlanningRoleOutputSchema, routeSkepticRoleOutput({
      no_queue_side_effect: false as unknown as true,
    })),
    false,
  );
});

test('route planning final artifact schemas keep route proposals critique-only', async () => {
  const architectureArtifact = {
    status: 'passed',
    slot_id: PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_SLOT_ID,
    workflow_type: 'route_architecture',
    target_ref: ref('implementation_input_snapshot', 'implementation_input_snapshot_001'),
    preflight_blockers: [],
    role_summary: 'Route architecture passed.',
    role_blocker_codes: [],
    role_warning_codes: [],
    blockers: [],
    warnings: [],
    runtime_failure_code: null,
    route_candidate_proposals: [
      routeCandidateProposal('exploratory_route_candidate', false),
      routeCandidateProposal('confirmatory_route_candidate', true),
    ],
    reviewed_route_proposal_ref: null,
    reviewed_route_proposal_hash: null,
    reviewed_candidate_keys: [],
    checked_dimensions: [],
    risk_findings: [],
    recommended_disposition: null,
    no_domain_gate_request: true,
    no_queue_side_effect: true,
    role_artifact_refs: [ref('route_architecture_role_artifact', 'role_payload_001')],
    role_artifact_hashes: [hashA],
    admitted_role_artifact_refs: [ref('route_architecture_role_artifact', 'role_payload_001')],
    admitted_role_artifact_hashes: [hashA],
    role_prompt_packet_refs: [ref('runtime_prompt_packet', 'prompt_packet_001')],
    role_prompt_packet_hashes: [hashB],
    role_token_budget_gate_result_refs: [ref('token_budget_gate_result', 'token_gate_001')],
    role_compression_report_refs: [],
    runtime_identity: { slot_id: PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_SLOT_ID },
    cache_identity: { prompt_packet_cache_key_hashes: [hashB] },
    source_refs: [ref('implementation_input_snapshot', 'implementation_input_snapshot_001')],
    source_hash_bundle_hash: hashC,
  };
  assert.equal(
    await validatesBody(paperImplementationRoutePlanningArtifactSchema, architectureArtifact),
    true,
  );
  assert.equal(
    await validatesBody(paperImplementationRoutePlanningArtifactSchema, {
      ...architectureArtifact,
      domain_gate_request: { route_id: 'must_not_exist' },
    }),
    false,
  );
  assert.equal(
    await validatesBody(paperImplementationRoutePlanningArtifactSchema, {
      ...architectureArtifact,
      route_candidate_proposals: [routeCandidateProposal('single_candidate', false)],
    }),
    false,
  );

  const skepticArtifact = {
    ...architectureArtifact,
    slot_id: PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_SLOT_ID,
    workflow_type: 'route_skeptic_review',
    route_candidate_proposals: [],
    reviewed_route_proposal_ref: ref('route_architecture_runtime_artifact', 'route_architecture_final_001'),
    reviewed_route_proposal_hash: hashA,
    reviewed_candidate_keys: ['exploratory_route_candidate'],
    checked_dimensions: [...PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_RISK_DIMENSIONS],
    risk_findings: routeSkepticRoleOutput().risk_findings,
    recommended_disposition: 'revise',
  };
  assert.equal(
    await validatesBody(paperImplementationRoutePlanningArtifactSchema, skepticArtifact),
    true,
  );
  assert.equal(
    await validatesBody(paperImplementationRoutePlanningArtifactSchema, {
      ...skepticArtifact,
      workflow_type: 'route_architecture',
    }),
    false,
  );
});

test('route planning runtime request accepts controlled role output and rejects provider fixtures', async () => {
  const roleOutputs = {
    [PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_ROLE_SLOT_ID]: routeArchitectureRoleOutput(),
  };
  const request = {
    schema_version: PAPER_IMPLEMENTATION_ROUTE_PLANNING_RUNTIME_RUN_REQUEST_SCHEMA_VERSION,
    run_id: 'route-architecture-run-001',
    run_mode: 'dry_run',
    execution_mode: 'codex_assisted',
    target_ref: ref('implementation_input_snapshot', 'implementation_input_snapshot_001'),
    target_version_id: 'v1',
    input_snapshot_ref: ref('implementation_input_snapshot', 'implementation_input_snapshot_001'),
    input_snapshot_hash: hashC,
    source_refs: [ref('implementation_input_snapshot', 'implementation_input_snapshot_001')],
    source_hashes: [hashD],
    codex_role_outputs: roleOutputs,
  };
  assert.equal(
    await validatesBody(runPaperImplementationRoutePlanningRuntimeRequestSchema, request),
    true,
  );
  assert.equal(
    await validatesBody(runPaperImplementationRoutePlanningRuntimeRequestSchema, {
      ...request,
      implementation_project_id: 'implementation_project_001',
    }),
    false,
  );
  assert.equal(
    await validatesBody(runPaperImplementationRoutePlanningRuntimeRequestSchema, {
      ...request,
      execution_mode: 'provider_llm',
      model_profile_id: 'paper-implementation.route-architecture.route-candidates.v1',
      model_option_id: 'paper-implementation.route-architecture.route-candidates.v1.openai-balanced',
      codex_role_outputs: undefined,
      mocked_role_outputs: roleOutputs,
    }),
    false,
  );
});

test('validation cycle planning role schema requires proposal set and side-effect guards', async () => {
  assert.equal(
    await validatesBody(
      paperImplementationValidationCyclePlanningRoleOutputSchema,
      validationCyclePlanningRoleOutput(),
    ),
    true,
  );
  assert.equal(
    await validatesBody(paperImplementationValidationCyclePlanningRoleOutputSchema, validationCyclePlanningRoleOutput({
      cycle_candidate_proposals: [validationCycleCandidateProposal('single_cycle_candidate', false)],
    })),
    false,
  );
  assert.equal(
    await validatesBody(paperImplementationValidationCyclePlanningRoleOutputSchema, validationCyclePlanningRoleOutput({
      cycle_candidate_proposals: [
        {
          ...validationCycleCandidateProposal('no_gain_cycle_candidate', false),
          expected_information_gain: 'none',
        } as unknown as PaperImplementationValidationCycleCandidateProposal,
        validationCycleCandidateProposal('confirmatory_cycle_candidate', true),
      ],
    })),
    false,
  );
  assert.equal(
    await validatesBody(paperImplementationValidationCyclePlanningRoleOutputSchema, validationCyclePlanningRoleOutput({
      create_validation_cycle_draft_request: { validation_cycle_id: 'must_not_exist' },
    } as unknown as Partial<PaperImplementationValidationCyclePlanningRoleOutput>)),
    false,
  );
  assert.equal(
    await validatesBody(paperImplementationValidationCyclePlanningRoleOutputSchema, validationCyclePlanningRoleOutput({
      no_validation_cycle_side_effect: false as unknown as true,
    })),
    false,
  );
  assert.equal(
    await validatesBody(paperImplementationValidationCyclePlanningRoleOutputSchema, validationCyclePlanningRoleOutput({
      role_status: 'blocked',
      blocker_codes: ['admitted_route_skeptic_artifact_missing'],
      cycle_candidate_proposals: [],
      no_domain_gate_request: undefined,
      no_queue_side_effect: undefined,
      no_validation_cycle_side_effect: undefined,
    })),
    true,
  );
});

test('validation cycle planning final artifact schema remains proposal-only', async () => {
  const artifact = {
    status: 'passed',
    slot_id: PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_SLOT_ID,
    workflow_type: 'validation_cycle_planning',
    target_ref: ref('technical_route_candidate', 'technical_route_candidate_001'),
    preflight_blockers: [],
    role_summary: 'Validation-cycle planning passed.',
    role_blocker_codes: [],
    role_warning_codes: [],
    blockers: [],
    warnings: [],
    runtime_failure_code: null,
    reviewed_route_proposal_ref: ref('route_architecture_runtime_artifact', 'route_architecture_final_001'),
    reviewed_route_proposal_hash: hashA,
    reviewed_route_skeptic_artifact_ref: ref('route_skeptic_review_runtime_artifact', 'route_skeptic_final_001'),
    reviewed_route_skeptic_artifact_hash: hashB,
    reviewed_candidate_keys: ['exploratory_route_candidate'],
    cycle_candidate_proposals: [
      validationCycleCandidateProposal('exploratory_cycle_candidate', false),
      validationCycleCandidateProposal('confirmatory_cycle_candidate', true),
    ],
    no_domain_gate_request: true,
    no_queue_side_effect: true,
    no_validation_cycle_side_effect: true,
    role_artifact_refs: [ref('validation_cycle_planning_role_artifact', 'role_payload_001')],
    role_artifact_hashes: [hashA],
    admitted_role_artifact_refs: [ref('validation_cycle_planning_role_artifact', 'role_payload_001')],
    admitted_role_artifact_hashes: [hashA],
    role_prompt_packet_refs: [ref('runtime_prompt_packet', 'prompt_packet_001')],
    role_prompt_packet_hashes: [hashB],
    role_token_budget_gate_result_refs: [ref('token_budget_gate_result', 'token_gate_001')],
    role_compression_report_refs: [],
    runtime_identity: { slot_id: PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_SLOT_ID },
    cache_identity: { prompt_packet_cache_key_hashes: [hashB] },
    source_refs: [ref('route_architecture_runtime_artifact', 'route_architecture_final_001')],
    source_hash_bundle_hash: hashC,
  };
  assert.equal(
    await validatesBody(paperImplementationValidationCyclePlanningArtifactSchema, artifact),
    true,
  );
  assert.equal(
    await validatesBody(paperImplementationValidationCyclePlanningArtifactSchema, {
      ...artifact,
      domain_gate_request: { validation_cycle_id: 'must_not_exist' },
    }),
    false,
  );
  assert.equal(
    await validatesBody(paperImplementationValidationCyclePlanningArtifactSchema, {
      ...artifact,
      validation_cycle_id: 'must_not_exist',
    }),
    false,
  );
  assert.equal(
    await validatesBody(paperImplementationValidationCyclePlanningArtifactSchema, {
      ...artifact,
      cycle_candidate_proposals: [validationCycleCandidateProposal('single_cycle_candidate', false)],
    }),
    false,
  );
});

test('validation cycle planning runtime request requires admitted route artifacts and rejects provider fixtures', async () => {
  const roleOutputs = {
    [PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_ROLE_SLOT_ID]: validationCyclePlanningRoleOutput(),
  };
  const request = {
    schema_version: PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_RUNTIME_RUN_REQUEST_SCHEMA_VERSION,
    run_id: 'validation-cycle-planning-run-001',
    run_mode: 'dry_run',
    execution_mode: 'codex_assisted',
    target_ref: ref('technical_route_candidate', 'technical_route_candidate_001'),
    target_version_id: 'v1',
    input_snapshot_ref: ref('implementation_input_snapshot', 'implementation_input_snapshot_001'),
    input_snapshot_hash: hashC,
    source_refs: [ref('route_architecture_runtime_artifact', 'route_architecture_final_001')],
    source_hashes: [hashD],
    admitted_route_proposal_artifact_ref: ref('route_architecture_runtime_artifact', 'route_architecture_final_001'),
    admitted_route_proposal_artifact_hash: hashA,
    admitted_route_skeptic_artifact_ref: ref('route_skeptic_review_runtime_artifact', 'route_skeptic_final_001'),
    admitted_route_skeptic_artifact_hash: hashB,
    reviewed_candidate_keys: ['exploratory_route_candidate'],
    codex_role_outputs: roleOutputs,
  };
  assert.equal(
    await validatesBody(runPaperImplementationValidationCyclePlanningRuntimeRequestSchema, request),
    true,
  );
  assert.equal(
    await validatesBody(runPaperImplementationValidationCyclePlanningRuntimeRequestSchema, {
      ...request,
      admitted_route_skeptic_artifact_ref: undefined,
    }),
    false,
  );
  assert.equal(
    await validatesBody(runPaperImplementationValidationCyclePlanningRuntimeRequestSchema, {
      ...request,
      reviewed_candidate_keys: [],
    }),
    false,
  );
  assert.equal(
    await validatesBody(runPaperImplementationValidationCyclePlanningRuntimeRequestSchema, {
      ...request,
      run_mode: 'product',
      execution_mode: 'codex_assisted',
    }),
    false,
  );
  assert.equal(
    await validatesBody(runPaperImplementationValidationCyclePlanningRuntimeRequestSchema, {
      ...request,
      execution_mode: 'provider_llm',
      model_profile_id: 'paper-implementation.validation-cycle-planning.cycle-candidates.v1',
      model_option_id: 'paper-implementation.validation-cycle-planning.cycle-candidates.v1.openai-balanced',
      codex_role_outputs: undefined,
      mocked_role_outputs: roleOutputs,
    }),
    false,
  );
});

test('feasibility planning role schema requires proposal set and no-side-effect guards', async () => {
  assert.equal(
    await validatesBody(
      paperImplementationFeasibilityPlanningRoleOutputSchema,
      feasibilityPlanningRoleOutput(),
    ),
    true,
  );
  assert.equal(
    await validatesBody(paperImplementationFeasibilityPlanningRoleOutputSchema, feasibilityPlanningRoleOutput({
      probe_plan_candidate_proposals: [feasibilityProbePlanCandidateProposal('single_probe_candidate', false)],
    })),
    false,
  );
  assert.equal(
    await validatesBody(paperImplementationFeasibilityPlanningRoleOutputSchema, feasibilityPlanningRoleOutput({
      probe_plan_candidate_proposals: [
        {
          ...feasibilityProbePlanCandidateProposal('bad_probe_kind_candidate', false),
          probe_kind: 'lightweight_probe',
        } as unknown as PaperImplementationFeasibilityProbePlanCandidateProposal,
        feasibilityProbePlanCandidateProposal('plan_light_readiness_candidate', true),
      ],
    })),
    false,
  );
  assert.equal(
    await validatesBody(paperImplementationFeasibilityPlanningRoleOutputSchema, feasibilityPlanningRoleOutput({
      create_feasibility_probe_request: { probe_id: 'must_not_exist' },
    } as unknown as Partial<PaperImplementationFeasibilityPlanningRoleOutput>)),
    false,
  );
  assert.equal(
    await validatesBody(paperImplementationFeasibilityPlanningRoleOutputSchema, feasibilityPlanningRoleOutput({
      no_experiment_plan_light_side_effect: false as unknown as true,
    })),
    false,
  );
  assert.equal(
    await validatesBody(paperImplementationFeasibilityPlanningRoleOutputSchema, feasibilityPlanningRoleOutput({
      role_status: 'blocked',
      blocker_codes: ['validation_cycle_candidate_not_ready'],
      probe_plan_candidate_proposals: [],
      no_domain_gate_request: undefined,
      no_queue_side_effect: undefined,
      no_feasibility_probe_side_effect: undefined,
      no_experiment_plan_light_side_effect: undefined,
      no_validation_cycle_side_effect: undefined,
    })),
    true,
  );
});

test('feasibility planning final artifact schema remains proposal-only', async () => {
  const artifact = {
    status: 'passed',
    slot_id: PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_SLOT_ID,
    workflow_type: 'feasibility_planning',
    target_ref: ref('validation_cycle_candidate', 'validation_cycle_candidate_001'),
    preflight_blockers: [],
    role_summary: 'Feasibility planning passed.',
    role_blocker_codes: [],
    role_warning_codes: [],
    blockers: [],
    warnings: [],
    runtime_failure_code: null,
    reviewed_validation_cycle_artifact_ref: ref('validation_cycle_planning_runtime_artifact', 'validation_cycle_final_001'),
    reviewed_validation_cycle_artifact_hash: hashA,
    reviewed_route_proposal_ref: ref('route_architecture_runtime_artifact', 'route_architecture_final_001'),
    reviewed_route_proposal_hash: hashB,
    reviewed_route_skeptic_artifact_ref: ref('route_skeptic_review_runtime_artifact', 'route_skeptic_final_001'),
    reviewed_route_skeptic_artifact_hash: hashC,
    reviewed_cycle_candidate_keys: ['exploratory_cycle_candidate'],
    reviewed_route_candidate_keys: ['exploratory_route_candidate'],
    probe_plan_candidate_proposals: [
      feasibilityProbePlanCandidateProposal('lightweight_probe_candidate', false),
      feasibilityProbePlanCandidateProposal('plan_light_readiness_candidate', true),
    ],
    no_domain_gate_request: true,
    no_queue_side_effect: true,
    no_feasibility_probe_side_effect: true,
    no_experiment_plan_light_side_effect: true,
    no_validation_cycle_side_effect: true,
    role_artifact_refs: [ref('feasibility_planning_role_artifact', 'role_payload_001')],
    role_artifact_hashes: [hashA],
    admitted_role_artifact_refs: [ref('feasibility_planning_role_artifact', 'role_payload_001')],
    admitted_role_artifact_hashes: [hashA],
    role_prompt_packet_refs: [ref('runtime_prompt_packet', 'prompt_packet_001')],
    role_prompt_packet_hashes: [hashB],
    role_token_budget_gate_result_refs: [ref('token_budget_gate_result', 'token_gate_001')],
    role_compression_report_refs: [],
    runtime_identity: { slot_id: PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_SLOT_ID },
    cache_identity: { prompt_packet_cache_key_hashes: [hashB] },
    source_refs: [ref('validation_cycle_planning_runtime_artifact', 'validation_cycle_final_001')],
    source_hash_bundle_hash: hashD,
  };
  assert.equal(
    await validatesBody(paperImplementationFeasibilityPlanningArtifactSchema, artifact),
    true,
  );
  assert.equal(
    await validatesBody(paperImplementationFeasibilityPlanningArtifactSchema, {
      ...artifact,
      create_feasibility_probe_request: { probe_id: 'must_not_exist' },
    }),
    false,
  );
  assert.equal(
    await validatesBody(paperImplementationFeasibilityPlanningArtifactSchema, {
      ...artifact,
      experiment_plan_light_id: 'must_not_exist',
    }),
    false,
  );
  assert.equal(
    await validatesBody(paperImplementationFeasibilityPlanningArtifactSchema, {
      ...artifact,
      probe_plan_candidate_proposals: [feasibilityProbePlanCandidateProposal('single_probe_candidate', false)],
    }),
    false,
  );
});

test('feasibility planning runtime request requires admitted lineage artifacts and rejects provider fixtures', async () => {
  const roleOutputs = {
    [PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_ROLE_SLOT_ID]: feasibilityPlanningRoleOutput(),
  };
  const request = {
    schema_version: PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_RUNTIME_RUN_REQUEST_SCHEMA_VERSION,
    run_id: 'feasibility-planning-run-001',
    run_mode: 'dry_run',
    execution_mode: 'codex_assisted',
    target_ref: ref('validation_cycle_candidate', 'validation_cycle_candidate_001'),
    target_version_id: 'v1',
    input_snapshot_ref: ref('implementation_input_snapshot', 'implementation_input_snapshot_001'),
    input_snapshot_hash: hashC,
    source_refs: [ref('validation_cycle_planning_runtime_artifact', 'validation_cycle_final_001')],
    source_hashes: [hashD],
    admitted_validation_cycle_artifact_ref: ref('validation_cycle_planning_runtime_artifact', 'validation_cycle_final_001'),
    admitted_validation_cycle_artifact_hash: hashA,
    admitted_route_proposal_artifact_ref: ref('route_architecture_runtime_artifact', 'route_architecture_final_001'),
    admitted_route_proposal_artifact_hash: hashB,
    admitted_route_skeptic_artifact_ref: ref('route_skeptic_review_runtime_artifact', 'route_skeptic_final_001'),
    admitted_route_skeptic_artifact_hash: hashC,
    reviewed_cycle_candidate_keys: ['exploratory_cycle_candidate'],
    reviewed_route_candidate_keys: ['exploratory_route_candidate'],
    secondary_route_candidate_refs: [ref('technical_route_candidate', 'technical_route_candidate_001')],
    secondary_validation_cycle_refs: [ref('validation_cycle', 'validation_cycle_001')],
    secondary_feasibility_probe_refs: [ref('feasibility_probe', 'feasibility_probe_001')],
    secondary_experiment_plan_light_refs: [ref('experiment_plan_light', 'experiment_plan_light_001')],
    codex_role_outputs: roleOutputs,
  };
  assert.equal(
    await validatesBody(runPaperImplementationFeasibilityPlanningRuntimeRequestSchema, request),
    true,
  );
  assert.equal(
    await validatesBody(runPaperImplementationFeasibilityPlanningRuntimeRequestSchema, {
      ...request,
      admitted_validation_cycle_artifact_ref: undefined,
    }),
    false,
  );
  assert.equal(
    await validatesBody(runPaperImplementationFeasibilityPlanningRuntimeRequestSchema, {
      ...request,
      reviewed_cycle_candidate_keys: [],
    }),
    false,
  );
  assert.equal(
    await validatesBody(runPaperImplementationFeasibilityPlanningRuntimeRequestSchema, {
      ...request,
      agent_workflow_harness_run_ref: ref('agent_workflow_harness_run', 'harness_run_001'),
    }),
    false,
  );
  assert.equal(
    await validatesBody(runPaperImplementationFeasibilityPlanningRuntimeRequestSchema, {
      ...request,
      run_mode: 'product',
      execution_mode: 'codex_assisted',
    }),
    false,
  );
  assert.equal(
    await validatesBody(runPaperImplementationFeasibilityPlanningRuntimeRequestSchema, {
      ...request,
      execution_mode: 'provider_llm',
      model_profile_id: 'paper-implementation.feasibility-planning.probe-plan-candidates.v1',
      model_option_id: 'paper-implementation.feasibility-planning.probe-plan-candidates.v1.openai-balanced',
      codex_role_outputs: undefined,
      mocked_role_outputs: roleOutputs,
    }),
    false,
  );
});

test('cross-board synthesis role schema remains proposal-only', async () => {
  assert.equal(
    await validatesBody(
      paperImplementationCrossBoardSynthesisRoleOutputSchema,
      crossBoardSynthesisRoleOutput(),
    ),
    true,
  );
  assert.equal(
    await validatesBody(paperImplementationCrossBoardSynthesisRoleOutputSchema, crossBoardSynthesisRoleOutput({
      create_cross_board_review_request: { request_id: 'must_not_exist' },
    } as unknown as Partial<PaperImplementationCrossBoardSynthesisRoleOutput>)),
    false,
  );
  assert.equal(
    await validatesBody(paperImplementationCrossBoardSynthesisRoleOutputSchema, crossBoardSynthesisRoleOutput({
      motive_portfolio_decision_id: 'must_not_exist',
    } as unknown as Partial<PaperImplementationCrossBoardSynthesisRoleOutput>)),
    false,
  );
  assert.equal(
    await validatesBody(paperImplementationCrossBoardSynthesisRoleOutputSchema, crossBoardSynthesisRoleOutput({
      no_portfolio_mutation_side_effect: false as unknown as true,
    })),
    false,
  );
  assert.equal(
    await validatesBody(paperImplementationCrossBoardSynthesisRoleOutputSchema, crossBoardSynthesisRoleOutput({
      scenario_proposals: [],
    })),
    false,
  );
  assert.equal(
    await validatesBody(paperImplementationCrossBoardSynthesisRoleOutputSchema, crossBoardSynthesisRoleOutput({
      role_status: 'blocked',
      blocker_codes: ['insufficient_board_context'],
      reviewed_board_version_refs: undefined,
      reviewed_conflict_refs: undefined,
      reviewed_challenge_refs: undefined,
      reviewed_evidence_transfer_binding_refs: undefined,
      scenario_proposals: undefined,
      no_domain_gate_request: undefined,
      no_queue_side_effect: undefined,
      no_cross_board_review_side_effect: undefined,
      no_evidence_transfer_binding_side_effect: undefined,
      no_portfolio_mutation_side_effect: undefined,
      no_motive_evolution_side_effect: undefined,
    })),
    true,
  );
});

test('cross-board synthesis final artifact schema remains proposal-only', async () => {
  const artifact = {
    status: 'passed',
    slot_id: PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_SLOT_ID,
    workflow_type: 'cross_board_synthesis',
    target_ref: ref('motive_evidence_board_version', 'board_version_001'),
    preflight_blockers: [],
    role_summary: 'Cross-board synthesis passed.',
    role_blocker_codes: [],
    role_warning_codes: [],
    blockers: [],
    warnings: [],
    runtime_failure_code: null,
    board_anchors: [
      crossBoardAnchor('001'),
      crossBoardAnchor('002'),
    ],
    reviewed_board_version_refs: [
      ref('motive_evidence_board_version', 'board_version_001'),
      ref('motive_evidence_board_version', 'board_version_002'),
    ],
    reviewed_conflict_refs: [ref('motive_board_conflict', 'conflict_001')],
    reviewed_challenge_refs: [ref('motive_board_challenge', 'challenge_001')],
    reviewed_evidence_transfer_binding_refs: [ref('evidence_transfer_binding', 'transfer_binding_001')],
    scenario_proposals: [crossBoardScenarioProposal('reuse_scenario_001')],
    no_domain_gate_request: true,
    no_queue_side_effect: true,
    no_cross_board_review_side_effect: true,
    no_evidence_transfer_binding_side_effect: true,
    no_portfolio_mutation_side_effect: true,
    no_motive_evolution_side_effect: true,
    role_artifact_refs: [ref('cross_board_synthesis_role_artifact', 'role_payload_001')],
    role_artifact_hashes: [hashA],
    admitted_role_artifact_refs: [ref('cross_board_synthesis_role_artifact', 'role_payload_001')],
    admitted_role_artifact_hashes: [hashA],
    role_prompt_packet_refs: [ref('runtime_prompt_packet', 'prompt_packet_001')],
    role_prompt_packet_hashes: [hashB],
    role_token_budget_gate_result_refs: [ref('token_budget_gate_result', 'token_gate_001')],
    role_compression_report_refs: [],
    runtime_identity: { slot_id: PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_SLOT_ID },
    cache_identity: { prompt_packet_cache_key_hashes: [hashB] },
    source_refs: [ref('motive_evidence_board_version', 'board_version_001')],
    source_hash_bundle_hash: hashD,
  };
  assert.equal(
    await validatesBody(paperImplementationCrossBoardSynthesisArtifactSchema, artifact),
    true,
  );
  assert.equal(
    await validatesBody(paperImplementationCrossBoardSynthesisArtifactSchema, {
      ...artifact,
      evidence_transfer_binding_request: { request_id: 'must_not_exist' },
    }),
    false,
  );
  assert.equal(
    await validatesBody(paperImplementationCrossBoardSynthesisArtifactSchema, {
      ...artifact,
      cross_board_review_id: 'must_not_exist',
    }),
    false,
  );
  assert.equal(
    await validatesBody(paperImplementationCrossBoardSynthesisArtifactSchema, {
      ...artifact,
      scenario_proposals: [],
    }),
    false,
  );
});

test('cross-board synthesis runtime request requires board anchors and rejects provider fixtures', async () => {
  const roleOutputs = {
    [PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_ROLE_SLOT_ID]: crossBoardSynthesisRoleOutput(),
  };
  const request = {
    schema_version: PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_RUNTIME_RUN_REQUEST_SCHEMA_VERSION,
    run_id: 'cross-board-synthesis-run-001',
    run_mode: 'dry_run',
    execution_mode: 'codex_assisted',
    target_ref: ref('motive_evidence_board_version', 'board_version_001'),
    target_version_id: 'v1',
    input_snapshot_ref: ref('implementation_input_snapshot', 'implementation_input_snapshot_001'),
    input_snapshot_hash: hashC,
    source_refs: [
      ref('motive_evidence_board_version', 'board_version_001'),
      ref('motive_evidence_board_version', 'board_version_002'),
    ],
    source_hashes: [hashD, hashE],
    board_anchors: [
      crossBoardAnchor('001'),
      crossBoardAnchor('002'),
    ],
    reviewed_board_version_refs: [
      ref('motive_evidence_board_version', 'board_version_001'),
      ref('motive_evidence_board_version', 'board_version_002'),
    ],
    reviewed_conflict_refs: [ref('motive_board_conflict', 'conflict_001')],
    reviewed_challenge_refs: [ref('motive_board_challenge', 'challenge_001')],
    evidence_transfer_binding_refs: [ref('evidence_transfer_binding', 'transfer_binding_001')],
    reuse_policy: {
      require_transfer_binding_for_viable_reuse: true,
      allow_blocked_reuse_without_transfer_binding: true,
    },
    secondary_cross_board_review_refs: [ref('cross_board_review', 'cross_board_review_001')],
    secondary_evidence_transfer_binding_refs: [ref('evidence_transfer_binding', 'transfer_binding_001')],
    secondary_motive_assertion_refs: [ref('motive_assertion', 'motive_assertion_001')],
    secondary_evidence_binding_refs: [ref('evidence_binding', 'evidence_binding_001')],
    secondary_route_refs: [ref('technical_route_candidate', 'route_candidate_001')],
    secondary_experiment_refs: [ref('experiment_run', 'experiment_run_001')],
    codex_role_outputs: roleOutputs,
  };
  assert.equal(
    await validatesBody(runPaperImplementationCrossBoardSynthesisRuntimeRequestSchema, request),
    true,
  );
  assert.equal(
    await validatesBody(runPaperImplementationCrossBoardSynthesisRuntimeRequestSchema, {
      ...request,
      board_anchors: [crossBoardAnchor('001')],
    }),
    false,
  );
  assert.equal(
    await validatesBody(runPaperImplementationCrossBoardSynthesisRuntimeRequestSchema, {
      ...request,
      reviewed_board_version_refs: [ref('motive_evidence_board_version', 'board_version_001')],
    }),
    false,
  );
  assert.equal(
    await validatesBody(runPaperImplementationCrossBoardSynthesisRuntimeRequestSchema, {
      ...request,
      create_cross_board_review_request: { request_id: 'must_not_exist' },
    }),
    false,
  );
  assert.equal(
    await validatesBody(runPaperImplementationCrossBoardSynthesisRuntimeRequestSchema, {
      ...request,
      run_mode: 'product',
      execution_mode: 'codex_assisted',
    }),
    false,
  );
  assert.equal(
    await validatesBody(runPaperImplementationCrossBoardSynthesisRuntimeRequestSchema, {
      ...request,
      execution_mode: 'provider_llm',
      model_profile_id: 'paper-implementation.cross-board-synthesis.merge-split-reuse-scenarios.v1',
      model_option_id: 'paper-implementation.cross-board-synthesis.merge-split-reuse-scenarios.v1.openai-balanced',
      codex_role_outputs: undefined,
      mocked_role_outputs: roleOutputs,
    }),
    false,
  );
});

test('evidence-board curation role output requires challenge checks and side-effect guards', async () => {
  assert.equal(
    await validatesBody(paperImplementationEvidenceBoardCurationRoleOutputSchema, evidenceBoardCurationRoleOutput()),
    true,
  );
  assert.equal(
    await validatesBody(paperImplementationEvidenceBoardCurationRoleOutputSchema, evidenceBoardCurationRoleOutput({
      binding_candidate_proposals: [
        {
          ...evidenceBoardBindingCandidateProposal('binding_candidate_without_challenge'),
          challenge_check: undefined,
        } as unknown as PaperImplementationEvidenceBoardBindingCandidateProposal,
      ],
    })),
    false,
  );
  assert.equal(
    await validatesBody(paperImplementationEvidenceBoardCurationRoleOutputSchema, evidenceBoardCurationRoleOutput({
      no_evidence_binding_side_effect: undefined,
    })),
    false,
  );
  assert.equal(
    await validatesBody(paperImplementationEvidenceBoardCurationRoleOutputSchema, evidenceBoardCurationRoleOutput({
      role_status: 'blocked',
      blocker_codes: ['missing_locator'],
      reviewed_assertion_refs: undefined,
      reviewed_source_locator_refs: undefined,
      reviewed_citation_candidate_refs: undefined,
      reviewed_evidence_refs: undefined,
      reviewed_existing_evidence_binding_refs: undefined,
      binding_candidate_proposals: undefined,
      gap_candidate_proposals: undefined,
      no_domain_gate_request: undefined,
      no_queue_side_effect: undefined,
      no_board_write_side_effect: undefined,
      no_evidence_binding_side_effect: undefined,
      no_evidence_transfer_binding_side_effect: undefined,
      no_citation_candidate_side_effect: undefined,
      no_trace_repair_queue_side_effect: undefined,
    })),
    true,
  );
});

test('evidence-board curation final artifact schema is append-only and no-domain-write', async () => {
  const artifact = {
    status: 'passed',
    slot_id: PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_SLOT_ID,
    workflow_type: 'evidence_board_curation',
    curation_mode: 'curate_existing_board',
    target_ref: ref('motive_evidence_board_version', 'board_version_001'),
    target_motive_ref: ref('core_motive', 'core_motive_001'),
    target_core_motive_version_ref: ref('core_motive_version', 'core_motive_version_001'),
    target_board_ref: ref('motive_evidence_board_version', 'board_version_001'),
    target_board_hash: hashA,
    target_assertion_refs: [ref('motive_assertion', 'assertion_001')],
    preflight_blockers: [],
    role_summary: 'Evidence-board curation passed.',
    role_blocker_codes: [],
    role_warning_codes: [],
    blockers: [],
    warnings: [],
    runtime_failure_code: null,
    runtime_control: null,
    reviewed_assertion_refs: [ref('motive_assertion', 'assertion_001')],
    reviewed_source_locator_refs: [ref('source_locator', 'source_locator_001')],
    reviewed_citation_candidate_refs: [ref('citation_candidate', 'citation_candidate_001')],
    reviewed_evidence_refs: [ref('evidence_unit', 'evidence_001')],
    reviewed_existing_evidence_binding_refs: [ref('evidence_binding', 'existing_binding_001')],
    binding_candidate_proposals: [evidenceBoardBindingCandidateProposal('binding_candidate_001')],
    gap_candidate_proposals: [evidenceBoardGapCandidateProposal('gap_candidate_001')],
    no_domain_gate_request: true,
    no_queue_side_effect: true,
    no_board_write_side_effect: true,
    no_evidence_binding_side_effect: true,
    no_evidence_transfer_binding_side_effect: true,
    no_citation_candidate_side_effect: true,
    no_trace_repair_queue_side_effect: true,
    role_artifact_refs: [ref('evidence_board_curation_role_artifact', 'role_payload_001')],
    role_artifact_hashes: [hashA],
    admitted_role_artifact_refs: [ref('evidence_board_curation_role_artifact', 'role_payload_001')],
    admitted_role_artifact_hashes: [hashA],
    role_prompt_packet_refs: [ref('runtime_prompt_packet', 'prompt_packet_001')],
    role_prompt_packet_hashes: [hashB],
    role_token_budget_gate_result_refs: [ref('token_budget_gate_result', 'token_gate_001')],
    role_compression_report_refs: [],
    runtime_identity: { slot_id: PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_SLOT_ID },
    cache_identity: { prompt_packet_cache_key_hashes: [hashB] },
    source_refs: [ref('source_locator', 'source_locator_001')],
    source_hash_bundle_hash: hashD,
  };
  assert.equal(
    await validatesBody(paperImplementationEvidenceBoardCurationArtifactSchema, artifact),
    true,
  );
  assert.equal(
    await validatesBody(paperImplementationEvidenceBoardCurationArtifactSchema, {
      ...artifact,
      binding_candidate_proposals: [],
    }),
    false,
  );
  assert.equal(
    await validatesBody(paperImplementationEvidenceBoardCurationArtifactSchema, {
      ...artifact,
      board_draft: { must_not_exist: true },
    }),
    false,
  );
  assert.equal(
    await validatesBody(paperImplementationEvidenceBoardCurationArtifactSchema, {
      ...artifact,
      create_evidence_binding_request: { must_not_exist: true },
    }),
    false,
  );
});

test('evidence-board curation runtime request is mode-bound and rejects provider fixtures', async () => {
  const roleOutputs = {
    [PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_ROLE_SLOT_ID]: evidenceBoardCurationRoleOutput(),
  };
  const request = {
    schema_version: PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_RUNTIME_RUN_REQUEST_SCHEMA_VERSION,
    run_id: 'evidence-board-curation-run-001',
    run_mode: 'dry_run',
    execution_mode: 'codex_assisted',
    curation_mode: 'curate_existing_board',
    target_ref: ref('motive_evidence_board_version', 'board_version_001'),
    target_motive_ref: ref('core_motive', 'core_motive_001'),
    target_core_motive_version_ref: ref('core_motive_version', 'core_motive_version_001'),
    target_board_ref: ref('motive_evidence_board_version', 'board_version_001'),
    target_board_hash: hashA,
    target_assertion_refs: [ref('motive_assertion', 'assertion_001')],
    input_snapshot_ref: ref('implementation_input_snapshot', 'input_snapshot_001'),
    input_snapshot_hash: hashB,
    source_refs: [ref('source_locator', 'source_locator_001')],
    source_hashes: [hashC],
    source_context_packets: [{
      packet_ref: ref('source_context_packet', 'source_context_packet_001'),
      packet_hash: hash('source-context-packet-001'),
      source_ref: ref('source_locator', 'source_locator_001'),
      source_hash: hashC,
      evidence_kind: 'source_locator',
      content_summary: 'Packet is ref/hash backed and declares covered request refs.',
      key_facts: ['Runtime source packets are not standalone authority.'],
      covered_evidence_refs: [],
      covered_source_locator_refs: [ref('source_locator', 'source_locator_001')],
      covered_citation_candidate_refs: [],
      covered_trace_manifest_refs: [],
    }],
    trace_manifest_refs: [ref('trace_manifest', 'trace_manifest_001')],
    trace_manifest_hashes: [hashD],
    source_locator_refs: [ref('source_locator', 'source_locator_001')],
    citation_candidate_refs: [ref('citation_candidate', 'citation_candidate_001')],
    reviewed_citation_candidate_refs: [ref('citation_candidate', 'citation_candidate_001')],
    evidence_refs: [
      ref('evidence_unit', 'evidence_001'),
      ref('evidence_unit', 'existing_bound_evidence_001'),
    ],
    existing_evidence_binding_refs: [ref('evidence_binding', 'existing_binding_001')],
    existing_bound_evidence_refs: [ref('evidence_unit', 'existing_bound_evidence_001')],
    accepted_risk_refs: [],
    freshness_policy: {
      stale_evidence_requires_gap_candidate: true,
      unreviewed_citation_requires_gap_candidate: true,
      duplicate_existing_binding_requires_gap_candidate: true,
    },
    codex_role_outputs: roleOutputs,
  };
  assert.equal(
    await validatesBody(runPaperImplementationEvidenceBoardCurationRuntimeRequestSchema, request),
    true,
  );
  assert.equal(
    await validatesBody(runPaperImplementationEvidenceBoardCurationRuntimeRequestSchema, {
      ...request,
      target_board_ref: undefined,
      target_board_hash: undefined,
    }),
    false,
  );
  assert.equal(
    await validatesBody(runPaperImplementationEvidenceBoardCurationRuntimeRequestSchema, {
      ...request,
      curation_mode: 'seed_initial_board_candidates',
    }),
    false,
  );
  assert.equal(
    await validatesBody(runPaperImplementationEvidenceBoardCurationRuntimeRequestSchema, {
      ...request,
      curation_mode: 'seed_initial_board_candidates',
      target_ref: ref('core_motive_version', 'core_motive_version_001'),
      target_board_ref: undefined,
      target_board_hash: undefined,
    }),
    false,
  );
  assert.equal(
    await validatesBody(runPaperImplementationEvidenceBoardCurationRuntimeRequestSchema, {
      ...request,
      curation_mode: 'seed_initial_board_candidates',
      target_ref: ref('core_motive_version', 'core_motive_version_001'),
      target_board_ref: undefined,
      target_board_hash: undefined,
      existing_evidence_binding_refs: [],
      existing_bound_evidence_refs: [],
    }),
    true,
  );
  assert.equal(
    await validatesBody(runPaperImplementationEvidenceBoardCurationRuntimeRequestSchema, {
      ...request,
      board_summary_patch: { must_not_exist: true },
    }),
    false,
  );
  assert.equal(
    await validatesBody(runPaperImplementationEvidenceBoardCurationRuntimeRequestSchema, {
      ...request,
      run_mode: 'product',
      execution_mode: 'codex_assisted',
    }),
    false,
  );
  assert.equal(
    await validatesBody(runPaperImplementationEvidenceBoardCurationRuntimeRequestSchema, {
      ...request,
      existing_bound_evidence_refs: undefined,
    }),
    false,
  );
  assert.equal(
    await validatesBody(runPaperImplementationEvidenceBoardCurationRuntimeRequestSchema, {
      ...request,
      execution_mode: 'provider_llm',
      model_profile_id: 'paper-implementation.evidence-board-curation.binding-gap-candidates.v1',
      model_option_id: 'paper-implementation.evidence-board-curation.binding-gap-candidates.v1.openai-balanced',
      codex_role_outputs: undefined,
      mocked_role_outputs: roleOutputs,
    }),
    false,
  );
});

test('motive decomposition role output enforces result status and no-domain-write shape', async () => {
  assert.equal(
    await validatesBody(paperImplementationMotiveDecompositionRoleOutputSchema, motiveDecompositionRoleOutput()),
    true,
  );
  assert.equal(
    await validatesBody(paperImplementationMotiveDecompositionRoleOutputSchema, motiveDecompositionRoleOutput({
      draft_assertion_candidates: [
        {
          ...motiveDecompositionDraftAssertionCandidate('candidate_without_check'),
          decomposition_check: undefined,
        } as unknown as PaperImplementationMotiveDecompositionDraftAssertionCandidate,
      ],
    })),
    false,
  );
  assert.equal(
    await validatesBody(paperImplementationMotiveDecompositionRoleOutputSchema, motiveDecompositionRoleOutput({
      decomposition_result_status: 'no_decomposition_needed',
      draft_assertion_candidates: [],
      blocker_codes: [],
    })),
    true,
  );
  assert.equal(
    await validatesBody(paperImplementationMotiveDecompositionRoleOutputSchema, motiveDecompositionRoleOutput({
      decomposition_result_status: 'no_decomposition_needed',
      draft_assertion_candidates: [],
      blocker_codes: ['unexpected_blocker'],
    })),
    false,
  );
  assert.equal(
    await validatesBody(paperImplementationMotiveDecompositionRoleOutputSchema, motiveDecompositionRoleOutput({
      role_status: 'blocked',
      decomposition_result_status: 'blocked',
      draft_assertion_candidates: [],
      blocker_codes: ['trace_drift'],
    })),
    true,
  );
  assert.equal(
    await validatesBody(paperImplementationMotiveDecompositionRoleOutputSchema, motiveDecompositionRoleOutput({
      role_status: 'passed',
      decomposition_result_status: 'blocked',
      draft_assertion_candidates: [],
      blocker_codes: ['trace_drift'],
    })),
    false,
  );
  assert.equal(
    await validatesBody(paperImplementationMotiveDecompositionRoleOutputSchema, motiveDecompositionRoleOutput({
      role_status: 'blocked',
      decomposition_result_status: 'candidates_proposed',
    })),
    false,
  );
  assert.equal(
    await validatesBody(paperImplementationMotiveDecompositionRoleOutputSchema, motiveDecompositionRoleOutput({
      role_status: 'blocked',
      decomposition_result_status: 'no_decomposition_needed',
      draft_assertion_candidates: [],
      blocker_codes: [],
    })),
    false,
  );
  assert.equal(
    await validatesBody(paperImplementationMotiveDecompositionRoleOutputSchema, motiveDecompositionRoleOutput({
      draft_assertion_candidates: [
        {
          ...motiveDecompositionDraftAssertionCandidate('candidate_invalid_kind'),
          candidate_kind: 'new_claim',
        } as unknown as PaperImplementationMotiveDecompositionDraftAssertionCandidate,
      ],
    })),
    false,
  );
  assert.equal(
    await validatesBody(paperImplementationMotiveDecompositionRoleOutputSchema, {
      ...motiveDecompositionRoleOutput(),
      source_assertion_reviews: [],
    }),
    false,
  );
  assert.equal(
    await validatesBody(paperImplementationMotiveDecompositionRoleOutputSchema, {
      ...motiveDecompositionRoleOutput(),
      CreateMotiveAssertionInput: { must_not_exist: true },
    }),
    false,
  );
  assert.equal(
    await validatesBody(paperImplementationMotiveDecompositionRoleOutputSchema, {
      ...motiveDecompositionRoleOutput(),
      domain_gate_request: { must_not_exist: true },
    }),
    false,
  );
});

test('motive decomposition final artifact remains proposal-only', async () => {
  const artifact = {
    status: 'passed',
    slot_id: PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_SLOT_ID,
    workflow_type: 'motive_decomposition',
    decomposition_mode: 'decompose_existing_assertions',
    target_ref: ref('core_motive_version', 'core_motive_version_001'),
    target_motive_ref: ref('core_motive', 'core_motive_001'),
    target_core_motive_version_ref: ref('core_motive_version', 'core_motive_version_001'),
    target_assertion_refs: [ref('motive_assertion', 'assertion_001')],
    preflight_blockers: [],
    decomposition_result_status: 'candidates_proposed',
    role_summary: 'Motive decomposition proposed candidate assertions.',
    role_blocker_codes: [],
    role_warning_codes: [],
    blockers: [],
    warnings: [],
    runtime_failure_code: null,
    reviewed_assertion_refs: [ref('motive_assertion', 'assertion_001')],
    draft_assertion_candidates: [motiveDecompositionDraftAssertionCandidate('draft_candidate_001')],
    no_domain_gate_request: true,
    no_queue_side_effect: true,
    no_motive_write_side_effect: true,
    no_motive_evolution_side_effect: true,
    no_board_write_side_effect: true,
    no_evidence_binding_side_effect: true,
    no_trace_repair_queue_side_effect: true,
    role_artifact_refs: [ref('motive_decomposition_role_artifact', 'role_payload_001')],
    role_artifact_hashes: [hashA],
    admitted_role_artifact_refs: [ref('motive_decomposition_role_artifact', 'role_payload_001')],
    admitted_role_artifact_hashes: [hashA],
    role_prompt_packet_refs: [ref('runtime_prompt_packet', 'prompt_packet_001')],
    role_prompt_packet_hashes: [hashB],
    role_token_budget_gate_result_refs: [ref('token_budget_gate_result', 'token_gate_001')],
    role_compression_report_refs: [],
    runtime_identity: { slot_id: PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_SLOT_ID },
    cache_identity: { prompt_packet_cache_key_hashes: [hashB] },
    source_refs: [ref('source', 'source_001')],
    source_hash_bundle_hash: hashD,
  };
  assert.equal(
    await validatesBody(paperImplementationMotiveDecompositionArtifactSchema, artifact),
    true,
  );
  assert.equal(
    await validatesBody(paperImplementationMotiveDecompositionArtifactSchema, {
      ...artifact,
      decomposition_result_status: 'no_decomposition_needed',
      draft_assertion_candidates: [],
      blockers: [],
    }),
    true,
  );
  assert.equal(
    await validatesBody(paperImplementationMotiveDecompositionArtifactSchema, {
      ...artifact,
      decomposition_result_status: 'no_decomposition_needed',
      draft_assertion_candidates: [motiveDecompositionDraftAssertionCandidate('unexpected_candidate')],
      blockers: [],
    }),
    false,
  );
  assert.equal(
    await validatesBody(paperImplementationMotiveDecompositionArtifactSchema, {
      ...artifact,
      decomposition_result_status: 'blocked',
      status: 'blocked',
      draft_assertion_candidates: [],
      blockers: ['human_confirmation_required'],
    }),
    true,
  );
  assert.equal(
    await validatesBody(paperImplementationMotiveDecompositionArtifactSchema, {
      ...artifact,
      no_motive_write_side_effect: undefined,
    }),
    false,
  );
  assert.equal(
    await validatesBody(paperImplementationMotiveDecompositionArtifactSchema, {
      ...artifact,
      candidate_assertion_ref: ref('motive_assertion', 'persisted_candidate_001'),
    }),
    false,
  );
  assert.equal(
    await validatesBody(paperImplementationMotiveDecompositionArtifactSchema, {
      ...artifact,
      motive_evolution_decision_request: { must_not_exist: true },
    }),
    false,
  );
});

test('motive decomposition runtime request is assertion-bound and rejects provider fixtures', async () => {
  const roleOutputs = {
    [PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_ROLE_SLOT_ID]: motiveDecompositionRoleOutput(),
  };
  const request = {
    schema_version: PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_RUNTIME_RUN_REQUEST_SCHEMA_VERSION,
    run_id: 'motive-decomposition-run-001',
    run_mode: 'dry_run',
    execution_mode: 'codex_assisted',
    decomposition_mode: 'decompose_existing_assertions',
    target_ref: ref('core_motive_version', 'core_motive_version_001'),
    target_motive_ref: ref('core_motive', 'core_motive_001'),
    target_core_motive_version_ref: ref('core_motive_version', 'core_motive_version_001'),
    target_assertion_refs: [ref('motive_assertion', 'assertion_001')],
    input_snapshot_ref: ref('implementation_input_snapshot', 'input_snapshot_001'),
    input_snapshot_hash: hashB,
    source_refs: [ref('source', 'source_001')],
    source_hashes: [hashC],
    assertion_context_packets: [{
      packet_ref: ref('assertion_context_packet', 'assertion_context_packet_001'),
      packet_hash: hash('assertion-context-packet-001'),
      assertion_ref: ref('motive_assertion', 'assertion_001'),
      assertion_hash: hash('assertion-001'),
      assertion_text: 'This source assertion is ref/hash-bound for provider review.',
      scope_boundary_summary: 'The packet is bounded to one target assertion.',
      covered_evidence_refs: [ref('evidence_unit', 'evidence_001')],
      covered_trace_manifest_refs: [ref('trace_manifest', 'trace_manifest_001')],
      covered_source_refs: [ref('source', 'source_001')],
    }],
    trace_manifest_refs: [ref('trace_manifest', 'trace_manifest_001')],
    trace_manifest_hashes: [hashD],
    source_locator_refs: [ref('source_locator', 'source_locator_001')],
    citation_candidate_refs: [ref('citation_candidate', 'citation_candidate_001')],
    evidence_refs: [ref('evidence_unit', 'evidence_001')],
    accepted_risk_refs: [],
    admitted_upstream_artifact_refs: [],
    admitted_upstream_artifact_hashes: [],
    codex_role_outputs: roleOutputs,
  };
  assert.equal(
    await validatesBody(runPaperImplementationMotiveDecompositionRuntimeRequestSchema, request),
    true,
  );
  assert.equal(
    await validatesBody(runPaperImplementationMotiveDecompositionRuntimeRequestSchema, {
      ...request,
      decomposition_mode: 'discover_missing_assertions',
    }),
    false,
  );
  assert.equal(
    await validatesBody(runPaperImplementationMotiveDecompositionRuntimeRequestSchema, {
      ...request,
      target_assertion_refs: [],
    }),
    false,
  );
  assert.equal(
    await validatesBody(runPaperImplementationMotiveDecompositionRuntimeRequestSchema, {
      ...request,
      assertion_context_packets: [{
        ...request.assertion_context_packets[0],
        packet_hash: undefined,
      }],
    }),
    false,
  );
  assert.equal(
    await validatesBody(runPaperImplementationMotiveDecompositionRuntimeRequestSchema, {
      ...request,
      assertion_text: 'Unbound assertion text must not be accepted at request root.',
    }),
    false,
  );
  assert.equal(
    await validatesBody(runPaperImplementationMotiveDecompositionRuntimeRequestSchema, {
      ...request,
      source_assertion_reviews: [],
    }),
    false,
  );
  assert.equal(
    await validatesBody(runPaperImplementationMotiveDecompositionRuntimeRequestSchema, {
      ...request,
      create_motive_assertion_input: { must_not_exist: true },
    }),
    false,
  );
  assert.equal(
    await validatesBody(runPaperImplementationMotiveDecompositionRuntimeRequestSchema, {
      ...request,
      run_mode: 'product',
      execution_mode: 'codex_assisted',
    }),
    false,
  );
  assert.equal(
    await validatesBody(runPaperImplementationMotiveDecompositionRuntimeRequestSchema, {
      ...request,
      execution_mode: 'provider_llm',
      model_profile_id: 'paper-implementation.motive-decomposition.draft-assertion-candidates.v1',
      model_option_id: 'paper-implementation.motive-decomposition.draft-assertion-candidates.v1.openai-balanced',
      codex_role_outputs: undefined,
      mocked_role_outputs: roleOutputs,
    }),
    false,
  );
});

test('motive evolution role outputs enforce controlled designer and challenger shapes', async () => {
  assert.equal(
    await validatesBody(
      paperImplementationMotiveEvolutionOptionDesignerRoleOutputSchema,
      motiveEvolutionDesignerRoleOutput(),
    ),
    true,
  );
  assert.equal(
    await validatesBody(
      paperImplementationMotiveEvolutionRiskChallengerRoleOutputSchema,
      motiveEvolutionChallengerRoleOutput(),
    ),
    true,
  );
  assert.equal(
    await validatesBody(
      paperImplementationMotiveEvolutionRoleOutputSchema,
      motiveEvolutionDesignerRoleOutput(),
    ),
    true,
  );
  assert.equal(
    await validatesBody(
      paperImplementationMotiveEvolutionRoleOutputSchema,
      motiveEvolutionChallengerRoleOutput(),
    ),
    true,
  );
  assert.equal(
    await validatesBody(paperImplementationMotiveEvolutionOptionDesignerRoleOutputSchema, {
      ...motiveEvolutionDesignerRoleOutput(),
      designed_options: motiveEvolutionDesignedOptionsByKey(
        'invalid_missing_human_gate',
        {
          human_confirmation_required: false,
        },
      ),
    }),
    false,
  );
  assert.equal(
    await validatesBody(paperImplementationMotiveEvolutionRiskChallengerRoleOutputSchema, {
      ...motiveEvolutionChallengerRoleOutput(),
      decision_options: {
        missing_challenge_check: {
          ...motiveEvolutionDecisionOption('missing_challenge_check'),
          challenge_check: undefined,
        } as unknown as PaperImplementationMotiveEvolutionDecisionOption,
      },
    }),
    false,
  );
  assert.equal(
    await validatesBody(paperImplementationMotiveEvolutionRiskChallengerRoleOutputSchema, {
      ...motiveEvolutionChallengerRoleOutput(),
      decision_options: {
        missing_blocking_reason: motiveEvolutionDecisionOption('missing_blocking_reason', {
          challenge_check: {
            evidence_status: 'partial',
            trace_status: 'satisfied',
            portfolio_status: 'partial',
            human_confirmation_status: 'blocked',
            downstream_impact_status: 'partial',
            blocking_reason_codes: [],
          },
        }),
      },
    }),
    false,
  );
  assert.equal(
    await validatesBody(paperImplementationMotiveEvolutionRiskChallengerRoleOutputSchema, {
      ...motiveEvolutionChallengerRoleOutput(),
      challenged_option_keys: [],
    }),
    false,
  );
  assert.equal(
    await validatesBody(paperImplementationMotiveEvolutionRiskChallengerRoleOutputSchema, {
      ...motiveEvolutionChallengerRoleOutput(),
      support_result_status: 'no_evolution_needed',
      challenged_option_keys: [],
      decision_options: {},
      blocker_codes: [],
    }),
    true,
  );
  assert.equal(
    await validatesBody(paperImplementationMotiveEvolutionRiskChallengerRoleOutputSchema, {
      ...motiveEvolutionChallengerRoleOutput(),
      support_result_status: 'no_evolution_needed',
      challenged_option_keys: [],
      decision_options: motiveEvolutionDecisionOptionsByKey('unexpected_option'),
      blocker_codes: [],
    }),
    false,
  );
  assert.equal(
    await validatesBody(paperImplementationMotiveEvolutionOptionDesignerRoleOutputSchema, {
      ...motiveEvolutionDesignerRoleOutput(),
      designed_options: [motiveEvolutionDesignedOption('array_shape_must_not_exist')],
    }),
    false,
  );
  assert.equal(
    await validatesBody(paperImplementationMotiveEvolutionOptionDesignerRoleOutputSchema, {
      ...motiveEvolutionDesignerRoleOutput(),
      designed_options: {
        nested_option_key_must_not_exist: {
          ...motiveEvolutionDesignedOption('nested_option_key_must_not_exist'),
          option_key: 'nested_option_key_must_not_exist',
        } as unknown as PaperImplementationMotiveEvolutionDesignedOption,
      },
    }),
    false,
  );
  assert.equal(
    await validatesBody(paperImplementationMotiveEvolutionOptionDesignerRoleOutputSchema, {
      ...motiveEvolutionDesignerRoleOutput(),
      role_status: 'passed',
      support_result_status: 'blocked',
      designed_options: {},
      blocker_codes: ['missing_core_context'],
    }),
    false,
  );
  assert.equal(
    await validatesBody(paperImplementationMotiveEvolutionRoleOutputSchema, {
      ...motiveEvolutionDesignerRoleOutput(),
      change_set: { must_not_exist: true },
    }),
    false,
  );
});

test('motive evolution wire schemas reproduce the gs001-lora-live-004 mismatch and stay strict-representable (S3-β1)', async () => {
  // --- Reproduction pin (run gs001-lora-live-004, step motive_evolution,
  // blockers=[SCHEMA_VALIDATION_FAILED], 3 provider calls) ---
  // OpenAI strict structured output cannot represent the canonical by-key
  // option maps: the gateway normalizer forces `additionalProperties: false`
  // + `properties: {}` on them, so the strict decoder only ever emits `{}`.
  // The best options-proposing output a provider could physically produce is
  // therefore options_proposed with empty maps/keys — which the canonical
  // schema must (and does) reject. This is the deterministic mismatch that
  // exhausted the retries in the live run.
  const strictModeForcedChallengerOutput = {
    ...motiveEvolutionChallengerRoleOutput(),
    support_result_status: 'options_proposed',
    challenged_option_keys: [],
    decision_options: {},
  };
  assert.equal(
    await validatesBody(paperImplementationMotiveEvolutionRiskChallengerRoleOutputSchema, strictModeForcedChallengerOutput),
    false,
  );
  const strictModeForcedDesignerOutput = {
    ...motiveEvolutionDesignerRoleOutput(),
    support_result_status: 'options_proposed',
    designed_options: {},
  };
  assert.equal(
    await validatesBody(paperImplementationMotiveEvolutionOptionDesignerRoleOutputSchema, strictModeForcedDesignerOutput),
    false,
  );

  // --- Wire replay: the same semantic content encoded as option entry
  // arrays validates against the provider wire schemas. ---
  assert.equal(
    await validatesBody(paperImplementationMotiveEvolutionOptionDesignerRoleWireOutputSchema, motiveEvolutionWireDesignerRoleOutput()),
    true,
  );
  assert.equal(
    await validatesBody(paperImplementationMotiveEvolutionRiskChallengerRoleWireOutputSchema, motiveEvolutionWireChallengerRoleOutput()),
    true,
  );

  // Wire schemas keep the fail-closed invariants: options_proposed still
  // requires a non-empty entry array (and non-empty challenged keys)...
  assert.equal(
    await validatesBody(paperImplementationMotiveEvolutionOptionDesignerRoleWireOutputSchema, {
      ...motiveEvolutionWireDesignerRoleOutput(),
      designed_option_entries: [],
    }),
    false,
  );
  assert.equal(
    await validatesBody(paperImplementationMotiveEvolutionRiskChallengerRoleWireOutputSchema, {
      ...motiveEvolutionWireChallengerRoleOutput(),
      challenged_option_keys: [],
      decision_option_entries: [],
    }),
    false,
  );
  // ...the human-confirmation gate guardrail survives per entry...
  assert.equal(
    await validatesBody(paperImplementationMotiveEvolutionOptionDesignerRoleWireOutputSchema, {
      ...motiveEvolutionWireDesignerRoleOutput(),
      designed_option_entries: [{
        option_key: 'evolution_option_001',
        ...motiveEvolutionDesignedOption('evolution_option_001', { human_confirmation_required: false }),
      }],
    }),
    false,
  );
  // ...and the canonical map fields are forbidden on the wire (no dual-shape
  // ambiguity for real provider outputs).
  assert.equal(
    await validatesBody(paperImplementationMotiveEvolutionOptionDesignerRoleWireOutputSchema, motiveEvolutionDesignerRoleOutput()),
    false,
  );
  assert.equal(
    await validatesBody(paperImplementationMotiveEvolutionRiskChallengerRoleWireOutputSchema, motiveEvolutionChallengerRoleOutput()),
    false,
  );
  // no_evolution_needed keeps its empty-entry form on the wire.
  assert.equal(
    await validatesBody(paperImplementationMotiveEvolutionRiskChallengerRoleWireOutputSchema, {
      ...motiveEvolutionWireChallengerRoleOutput(),
      support_result_status: 'no_evolution_needed',
      challenged_option_keys: [],
      decision_option_entries: [],
      blocker_codes: [],
    }),
    true,
  );

  // --- Strict-representability pin: the wire schemas must never contain the
  // two constructs the OpenAI normalizer degrades (dynamic-key maps): a
  // `propertyNames` keyword or a schema-valued `additionalProperties`. The
  // canonical schemas do contain them — that asymmetry is the reason the wire
  // encoding exists. ---
  assert.equal(hasStrictModeDegenerateMapSchema(paperImplementationMotiveEvolutionOptionDesignerRoleWireOutputSchema), false);
  assert.equal(hasStrictModeDegenerateMapSchema(paperImplementationMotiveEvolutionRiskChallengerRoleWireOutputSchema), false);
  assert.equal(hasStrictModeDegenerateMapSchema(paperImplementationMotiveEvolutionOptionDesignerRoleOutputSchema), true);
  assert.equal(hasStrictModeDegenerateMapSchema(paperImplementationMotiveEvolutionRiskChallengerRoleOutputSchema), true);
});

function p1WireRoleOutput(roleSlotId: string): Record<string, unknown> {
  const { domain_gate_request: domainGate, scenario_outputs: scenarios, ...rest } = p1ReviewRoleOutput(roleSlotId);
  return {
    ...rest,
    domain_gate_request_json: domainGate === null ? null : JSON.stringify(domainGate),
    scenario_output_jsons: (scenarios as Record<string, unknown>[]).map((scenario) => JSON.stringify(scenario)),
  };
}

function resultAnalysisWireRoleOutput(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const { domain_gate_request: domainGate, ...rest } = resultAnalysisRoleOutput();
  return {
    ...rest,
    domain_gate_request_json: domainGate === null ? null : JSON.stringify(domainGate),
    ...overrides,
  };
}

test('T-124 S3 F5-1: P1 and result-analysis provider wire schemas carry JSON strings and drop the degenerate map nodes', async () => {
  // --- P1 wire: accepts the JSON-string carriers, rejects the canonical map fields. ---
  assert.equal(await validatesBody(paperImplementationP1RuntimeReviewRoleWireOutputSchema, p1WireRoleOutput('claim_boundary_review.adjudicator_final')), true);
  assert.equal(await validatesBody(paperImplementationP1RuntimeReviewRoleWireOutputSchema, p1WireRoleOutput('claim_boundary_review.boundary_critic')), true);
  // The canonical object shape must NOT validate against the wire schema (no dual shape).
  assert.equal(await validatesBody(paperImplementationP1RuntimeReviewRoleWireOutputSchema, p1ReviewRoleOutput('claim_boundary_review.adjudicator_final')), false);
  // domain_gate_request_json must be a string, never an object.
  assert.equal(
    await validatesBody(paperImplementationP1RuntimeReviewRoleWireOutputSchema, {
      ...p1WireRoleOutput('claim_boundary_review.adjudicator_final'),
      domain_gate_request_json: { claim_candidate_id: 'claim_candidate_001' },
    }),
    false,
  );
  // scenario_output_jsons must be an array of strings.
  assert.equal(
    await validatesBody(paperImplementationP1RuntimeReviewRoleWireOutputSchema, {
      ...p1WireRoleOutput('claim_boundary_review.adjudicator_final'),
      scenario_output_jsons: [{ scenario_id: 'x' }],
    }),
    false,
  );

  // --- result-analysis wire: domain_gate_request becomes a JSON string; scenario_outputs stays typed. ---
  assert.equal(await validatesBody(paperImplementationResultAnalysisRoleWireOutputSchema, resultAnalysisWireRoleOutput()), true);
  // passed requires a non-null domain_gate_request_json string.
  assert.equal(
    await validatesBody(paperImplementationResultAnalysisRoleWireOutputSchema, resultAnalysisWireRoleOutput({
      domain_gate_request_json: null,
    })),
    false,
  );
  // passed still requires a non-empty typed scenario_outputs set.
  assert.equal(
    await validatesBody(paperImplementationResultAnalysisRoleWireOutputSchema, resultAnalysisWireRoleOutput({
      scenario_outputs: [],
    })),
    false,
  );
  // blocked may omit the wire carrier.
  assert.equal(
    await validatesBody(paperImplementationResultAnalysisRoleWireOutputSchema, {
      ...resultAnalysisWireRoleOutput(),
      role_status: 'blocked',
      blocker_codes: ['RESULT_ANALYSIS_INSUFFICIENT_EVIDENCE'],
      domain_gate_request_json: undefined,
    }),
    true,
  );
  // The canonical object shape must NOT validate against the wire schema.
  assert.equal(await validatesBody(paperImplementationResultAnalysisRoleWireOutputSchema, resultAnalysisRoleOutput()), false);

  // --- Strict-representability asymmetry pin (mirrors the gateway guardrail). ---
  assert.equal(hasStrictModeDegenerateMapSchema(paperImplementationP1RuntimeReviewRoleWireOutputSchema), false);
  assert.equal(hasStrictModeDegenerateMapSchema(paperImplementationP1RuntimeReviewRoleOutputSchema), true);
  assert.equal(hasStrictModeDegenerateMapSchema(paperImplementationResultAnalysisRoleWireOutputSchema), false);
  assert.equal(hasStrictModeDegenerateMapSchema(paperImplementationResultAnalysisRoleOutputSchema), true);
});

test('T-124 S3 F5-2: every provider-sent role output schema is free of strict-mode-degenerate map nodes', () => {
  // The exact schema constants the runtime services hand to the LLM gateway as
  // the OpenAI strict `json_schema` (wire variant wherever one exists). After
  // F5-1 the gateway guardrail must fire ZERO times on any of them.
  const providerSentSchemas: Array<[string, Record<string, unknown>]> = [
    ['p1_wire', paperImplementationP1RuntimeReviewRoleWireOutputSchema as unknown as Record<string, unknown>],
    ['result_analysis_wire', paperImplementationResultAnalysisRoleWireOutputSchema as unknown as Record<string, unknown>],
    ['motive_evolution_option_designer_wire', paperImplementationMotiveEvolutionOptionDesignerRoleWireOutputSchema as unknown as Record<string, unknown>],
    ['motive_evolution_risk_challenger_wire', paperImplementationMotiveEvolutionRiskChallengerRoleWireOutputSchema as unknown as Record<string, unknown>],
    ['trace_integrity', paperImplementationTraceIntegrityRoleOutputSchema as unknown as Record<string, unknown>],
    ['experiment_planning', paperImplementationExperimentPlanningRoleOutputSchema as unknown as Record<string, unknown>],
    ['route_planning', paperImplementationRoutePlanningRoleOutputSchema as unknown as Record<string, unknown>],
    ['validation_cycle_planning', paperImplementationValidationCyclePlanningRoleOutputSchema as unknown as Record<string, unknown>],
    ['feasibility_planning', paperImplementationFeasibilityPlanningRoleOutputSchema as unknown as Record<string, unknown>],
    ['cross_board_synthesis', paperImplementationCrossBoardSynthesisRoleOutputSchema as unknown as Record<string, unknown>],
    ['evidence_board_curation', paperImplementationEvidenceBoardCurationRoleOutputSchema as unknown as Record<string, unknown>],
    ['motive_decomposition', paperImplementationMotiveDecompositionRoleOutputSchema as unknown as Record<string, unknown>],
  ];
  for (const [name, schema] of providerSentSchemas) {
    assert.equal(hasStrictModeDegenerateMapSchema(schema), false, `${name} provider-sent schema must be strict-representable`);
  }
});

function motiveEvolutionWireDesignerRoleOutput(): Record<string, unknown> {
  const { designed_options: designedOptions, ...rest } = motiveEvolutionDesignerRoleOutput();
  return {
    ...rest,
    designed_option_entries: Object.entries(designedOptions).map(([optionKey, option]) => ({
      option_key: optionKey,
      ...option,
    })),
  };
}

function motiveEvolutionWireChallengerRoleOutput(): Record<string, unknown> {
  const { decision_options: decisionOptions, ...rest } = motiveEvolutionChallengerRoleOutput();
  return {
    ...rest,
    decision_option_entries: Object.entries(decisionOptions).map(([optionKey, option]) => ({
      option_key: optionKey,
      ...option,
    })),
  };
}

/**
 * Detects the JSON-Schema object nodes that OpenAI strict structured output
 * cannot represent and that the backend gateway normalizer silently degrades to
 * always-empty objects. This MUST stay in lock-step with the gateway guardrail
 * `assertOpenAiStructuredOutputSchemaEncodable` (llm-gateway.ts, T-124 S3 复审
 * F5-2): an object node with no fixed properties that is either a dynamic-key
 * map (`propertyNames`, or a schema-valued `additionalProperties`) or a
 * completely bare `{type:'object'}`.
 *
 * The legacy open-payload escape hatch `{type:'object', additionalProperties:
 * true}` (no `propertyNames`, e.g. `legacy_ref`) is intentionally NOT flagged —
 * it is only narrowed to `{}`, matching the guardrail exemption.
 */
function hasStrictModeDegenerateMapSchema(schema: unknown): boolean {
  if (Array.isArray(schema)) {
    return schema.some((item) => hasStrictModeDegenerateMapSchema(item));
  }
  if (!schema || typeof schema !== 'object') {
    return false;
  }
  const record = schema as Record<string, unknown>;
  const hasProperties = Boolean(record.properties)
    && typeof record.properties === 'object'
    && Object.keys(record.properties as Record<string, unknown>).length > 0;
  if (!hasProperties) {
    if ('propertyNames' in record) {
      return true;
    }
    if (typeof record.additionalProperties === 'object' && record.additionalProperties !== null) {
      return true;
    }
    if (record.type === 'object'
      && !('propertyNames' in record)
      && !('additionalProperties' in record)) {
      return true;
    }
  }
  return Object.values(record).some((value) => hasStrictModeDegenerateMapSchema(value));
}

test('motive evolution final artifact remains support-only', async () => {
  const artifact = {
    status: 'passed',
    slot_id: PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_SLOT_ID,
    workflow_type: 'motive_evolution',
    target_ref: ref('core_motive_version', 'core_motive_version_001'),
    target_motive_refs: [ref('core_motive', 'core_motive_001')],
    target_core_motive_version_refs: [ref('core_motive_version', 'core_motive_version_001')],
    preflight_blockers: [],
    support_result_status: 'options_proposed',
    role_summary: 'Motive evolution support packet is ready for human/domain gate review.',
    role_blocker_codes: [],
    role_warning_codes: [],
    blockers: [],
    warnings: [],
    runtime_failure_code: null,
    decision_options: motiveEvolutionDecisionOptionsByKey('evolution_option_001'),
    no_domain_gate_request: true,
    no_queue_side_effect: true,
    no_motive_write_side_effect: true,
    no_motive_evolution_side_effect: true,
    no_portfolio_mutation_side_effect: true,
    no_board_write_side_effect: true,
    no_evidence_binding_side_effect: true,
    no_trace_repair_queue_side_effect: true,
    role_artifact_refs: [
      ref('motive_evolution_role_artifact', 'designer_role_001'),
      ref('motive_evolution_role_artifact', 'challenger_role_001'),
    ],
    role_artifact_hashes: [hash('designer-role-001'), hash('challenger-role-001')],
    admitted_role_artifact_refs: [
      ref('motive_evolution_role_artifact', 'designer_role_001'),
      ref('motive_evolution_role_artifact', 'challenger_role_001'),
    ],
    admitted_role_artifact_hashes: [hash('designer-role-001'), hash('challenger-role-001')],
    role_prompt_packet_refs: [ref('runtime_prompt_packet', 'prompt_packet_001')],
    role_prompt_packet_hashes: [hashB],
    role_token_budget_gate_result_refs: [ref('token_budget_gate_result', 'token_gate_001')],
    role_compression_report_refs: [],
    runtime_identity: { slot_id: PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_SLOT_ID },
    cache_identity: { option_set_hash: hash('motive-evolution-option-set-001') },
    source_refs: [ref('source', 'source_001')],
    source_hash_bundle_hash: hashD,
  };
  assert.equal(
    await validatesBody(paperImplementationMotiveEvolutionArtifactSchema, artifact),
    true,
  );
  assert.equal(
    await validatesBody(paperImplementationMotiveEvolutionArtifactSchema, {
      ...artifact,
      support_result_status: 'no_evolution_needed',
      decision_options: {},
      blockers: [],
    }),
    true,
  );
  assert.equal(
    await validatesBody(paperImplementationMotiveEvolutionArtifactSchema, {
      ...artifact,
      support_result_status: 'no_evolution_needed',
      decision_options: motiveEvolutionDecisionOptionsByKey('unexpected_option'),
      blockers: [],
    }),
    false,
  );
  assert.equal(
    await validatesBody(paperImplementationMotiveEvolutionArtifactSchema, {
      ...artifact,
      status: 'blocked',
      support_result_status: 'blocked',
      decision_options: {},
      blockers: ['human_confirmation_required'],
    }),
    true,
  );
  assert.equal(
    await validatesBody(paperImplementationMotiveEvolutionArtifactSchema, {
      ...artifact,
      status: 'passed',
      support_result_status: 'blocked',
      decision_options: {},
      blockers: ['human_confirmation_required'],
    }),
    false,
  );
  assert.equal(
    await validatesBody(paperImplementationMotiveEvolutionArtifactSchema, {
      ...artifact,
      status: 'failed_runtime',
      support_result_status: 'blocked',
      decision_options: {},
      blockers: ['provider_schema_invalid'],
      runtime_failure_code: null,
    }),
    false,
  );
  assert.equal(
    await validatesBody(paperImplementationMotiveEvolutionArtifactSchema, {
      ...artifact,
      status: 'failed_runtime',
      support_result_status: 'blocked',
      decision_options: {},
      blockers: ['provider_schema_invalid'],
      runtime_failure_code: 'provider_schema_invalid',
    }),
    true,
  );
  assert.equal(
    await validatesBody(paperImplementationMotiveEvolutionArtifactSchema, {
      ...artifact,
      no_portfolio_mutation_side_effect: undefined,
    }),
    false,
  );
  assert.equal(
    await validatesBody(paperImplementationMotiveEvolutionArtifactSchema, {
      ...artifact,
      decision_options: motiveEvolutionDecisionOptionsByKey(
        'invalid_missing_human_gate',
        {
          human_confirmation_required: false,
        },
      ),
    }),
    false,
  );
  assert.equal(
    await validatesBody(paperImplementationMotiveEvolutionArtifactSchema, {
      ...artifact,
      decision_options: [motiveEvolutionDecisionOption('array_shape_must_not_exist')],
    }),
    false,
  );
  assert.equal(
    await validatesBody(paperImplementationMotiveEvolutionArtifactSchema, {
      ...artifact,
      decision_options: {
        nested_option_key_must_not_exist: {
          ...motiveEvolutionDecisionOption('nested_option_key_must_not_exist'),
          option_key: 'nested_option_key_must_not_exist',
        } as unknown as PaperImplementationMotiveEvolutionDecisionOption,
      },
    }),
    false,
  );
  assert.equal(
    await validatesBody(paperImplementationMotiveEvolutionArtifactSchema, {
      ...artifact,
      runtime_identity: {
        nested: {
          raw_provider_output: 'must_not_exist',
        },
      },
    }),
    false,
  );
  assert.equal(
    await validatesBody(paperImplementationMotiveEvolutionArtifactSchema, {
      ...artifact,
      motive_evolution_decision_request: { must_not_exist: true },
    }),
    false,
  );
});

test('motive evolution runtime request is ref-hash-bound and rejects writer or harness identity', async () => {
  const roleOutputs = {
    [PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_OPTION_DESIGNER_ROLE_SLOT_ID]:
      motiveEvolutionDesignerRoleOutput(),
    [PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_RISK_CHALLENGER_ROLE_SLOT_ID]:
      motiveEvolutionChallengerRoleOutput(),
  };
  const request = {
    schema_version: PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_RUNTIME_RUN_REQUEST_SCHEMA_VERSION,
    run_id: 'motive-evolution-run-001',
    run_mode: 'dry_run',
    execution_mode: 'codex_assisted',
    target_ref: ref('core_motive_version', 'core_motive_version_001'),
    target_motive_refs: [ref('core_motive', 'core_motive_001')],
    target_motive_hashes: [hash('core-motive-001')],
    target_core_motive_version_refs: [ref('core_motive_version', 'core_motive_version_001')],
    target_core_motive_version_hashes: [hash('core-motive-version-001')],
    input_snapshot_ref: ref('implementation_input_snapshot', 'input_snapshot_001'),
    input_snapshot_hash: hashB,
    portfolio_snapshot_ref: ref('motive_portfolio_snapshot', 'portfolio_snapshot_001'),
    portfolio_snapshot_hash: hash('portfolio-snapshot-001'),
    evidence_board_refs: [ref('motive_evidence_board_version', 'board_version_001')],
    evidence_board_hashes: [hash('board-version-001')],
    evidence_binding_refs: [ref('evidence_binding', 'evidence_binding_001')],
    evidence_binding_hashes: [hash('evidence-binding-001')],
    challenge_refs: [ref('challenge', 'challenge_001')],
    conflict_refs: [],
    trace_manifest_refs: [ref('trace_manifest', 'trace_manifest_001')],
    trace_manifest_hashes: [hashD],
    human_confirmation_policy_ref: ref('human_confirmation_policy', 'policy_001'),
    human_confirmation_policy_hash: hash('human-confirmation-policy-001'),
    source_refs: [ref('source', 'source_001')],
    source_hashes: [hashC],
    motive_context_packets: [{
      packet_ref: ref('motive_context_packet', 'motive_context_packet_001'),
      packet_hash: hash('motive-context-packet-001'),
      packet_kind: 'motive_version_state',
      content_summary: 'Provider-readable motive version state summary bound to refs and hashes.',
      key_facts: ['Current motive version has unresolved challenge evidence.'],
      covered_target_refs: [ref('core_motive_version', 'core_motive_version_001')],
      covered_evidence_refs: [ref('evidence_binding', 'evidence_binding_001')],
      covered_trace_manifest_refs: [ref('trace_manifest', 'trace_manifest_001')],
      covered_source_refs: [ref('source', 'source_001')],
    }],
    validation_cycle_refs: [ref('validation_cycle', 'validation_cycle_001')],
    validation_cycle_hashes: [hash('validation-cycle-001')],
    result_packet_refs: [ref('result_interpretation_packet', 'result_packet_001')],
    result_packet_hashes: [hash('result-packet-001')],
    cross_board_review_refs: [ref('cross_board_review', 'cross_board_review_001')],
    cross_board_review_hashes: [hash('cross-board-review-001')],
    prior_evolution_decision_refs: [ref('motive_evolution_decision', 'prior_evolution_001')],
    prior_evolution_decision_hashes: [hash('prior-evolution-001')],
    prior_portfolio_decision_refs: [ref('motive_portfolio_decision', 'portfolio_decision_001')],
    prior_portfolio_decision_hashes: [hash('portfolio-decision-001')],
    accepted_risk_refs: [ref('accepted_risk', 'accepted_risk_001')],
    accepted_risk_hashes: [hash('accepted-risk-001')],
    human_request_refs: [ref('human_request', 'human_request_001')],
    human_request_hashes: [hash('human-request-001')],
    codex_role_outputs: roleOutputs,
  };
  assert.equal(
    await validatesBody(runPaperImplementationMotiveEvolutionRuntimeRequestSchema, request),
    true,
  );
  assert.equal(
    await validatesBody(runPaperImplementationMotiveEvolutionRuntimeRequestSchema, {
      ...request,
      validation_cycle_hashes: undefined,
    }),
    false,
  );
  assert.equal(
    await validatesBody(runPaperImplementationMotiveEvolutionRuntimeRequestSchema, {
      ...request,
      validation_cycle_refs: undefined,
    }),
    false,
  );
  assert.equal(
    await validatesBody(runPaperImplementationMotiveEvolutionRuntimeRequestSchema, {
      ...request,
      target_core_motive_version_hashes: undefined,
    }),
    false,
  );
  assert.equal(
    await validatesBody(runPaperImplementationMotiveEvolutionRuntimeRequestSchema, {
      ...request,
      motive_context_packets: [{
        ...request.motive_context_packets[0],
        packet_hash: undefined,
      }],
    }),
    false,
  );
  assert.equal(
    await validatesBody(runPaperImplementationMotiveEvolutionRuntimeRequestSchema, {
      ...request,
      validation_cycle_hashes: ['not-a-hash'],
    }),
    false,
  );
  assert.equal(
    await validatesBody(runPaperImplementationMotiveEvolutionRuntimeRequestSchema, {
      ...request,
      implementation_proposal_artifact: { must_not_exist: true },
    }),
    false,
  );
  assert.equal(
    await validatesBody(runPaperImplementationMotiveEvolutionRuntimeRequestSchema, {
      ...request,
      CreateMotiveEvolutionDecisionRequest: { must_not_exist: true },
    }),
    false,
  );
  assert.equal(
    await validatesBody(runPaperImplementationMotiveEvolutionRuntimeRequestSchema, {
      ...request,
      motive_roles_after_decision: { primary_motive_ids: ['must_not_exist'] },
    }),
    false,
  );
  assert.equal(
    await validatesBody(runPaperImplementationMotiveEvolutionRuntimeRequestSchema, {
      ...request,
      run_mode: 'product',
      execution_mode: 'codex_assisted',
    }),
    false,
  );
  assert.equal(
    await validatesBody(runPaperImplementationMotiveEvolutionRuntimeRequestSchema, {
      ...request,
      execution_mode: 'provider_llm',
      model_profile_id: 'paper-implementation.motive-evolution.evolution-decision-support.v1',
      model_option_id: 'paper-implementation.motive-evolution.evolution-decision-support.v1.openai-balanced',
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
