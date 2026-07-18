import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_PROFILE_ID,
  PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_SLOT_ID,
  PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_PROFILE_ID,
  PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_ROLE_SLOT_ID,
  PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_SLOT_ID,
  PAPER_IMPLEMENTATION_DOSSIER_READINESS_AUDIT_PROFILE_ID,
  PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_PROFILE_ID,
  PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_ROLE_SLOT_ID,
  PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_SLOT_ID,
  PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_DIMENSIONS,
  PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_PROFILE_ID,
  PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_ROLE_SLOT_ID,
  PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_SLOT_ID,
  PAPER_IMPLEMENTATION_EXPERIMENT_DESIGN_PROFILE_ID,
  PAPER_IMPLEMENTATION_EXPERIMENT_DESIGN_SLOT_ID,
  PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_PROFILE_ID,
  PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_ROLE_SLOT_ID,
  PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_SLOT_ID,
  PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_PROFILE_ID,
  PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_ROLE_SLOT_ID,
  PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_SLOT_ID,
  PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_OPTION_DESIGNER_ROLE_SLOT_ID,
  PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_PROFILE_ID,
  PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_RISK_CHALLENGER_ROLE_SLOT_ID,
  PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_SLOT_ID,
  PAPER_IMPLEMENTATION_RESULT_ANALYSIS_PROFILE_ID,
  PAPER_IMPLEMENTATION_RESULT_ANALYSIS_ROLE_SLOT_ID,
  PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SCENARIO_KINDS,
  PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SLOT_ID,
  PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_PROFILE_ID,
  PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_ROLE_SLOT_ID,
  PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_SLOT_ID,
  PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_PROFILE_ID,
  PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_ROLE_SLOT_ID,
  PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_SLOT_ID,
  PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_RISK_DIMENSIONS,
  PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_PROFILE_ID,
  PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_ROLE_SLOT_ID,
  PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_SLOT_ID,
  PAPER_IMPLEMENTATION_TRACE_INTEGRITY_BOUNDARY_DEBATE_SLOT_ID,
  PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_PROFILE_ID,
  type PaperImplementationCrossBoardAnchor,
  type PaperImplementationCrossBoardScenarioProposal,
  type PaperImplementationCrossBoardSynthesisRoleOutput,
  type PaperImplementationEvidenceBoardBindingCandidateProposal,
  type PaperImplementationEvidenceBoardCurationRoleOutput,
  type PaperImplementationFeasibilityPlanningRoleOutput,
  type PaperImplementationFeasibilityProbePlanCandidateProposal,
  type PaperImplementationMotiveDecompositionDraftAssertionCandidate,
  type PaperImplementationMotiveDecompositionRoleOutput,
  type PaperImplementationMotiveEvolutionChallengeCheck,
  type PaperImplementationMotiveEvolutionDecisionOption,
  type PaperImplementationMotiveEvolutionDesignedOption,
  type PaperImplementationMotiveEvolutionOptionDesignerRoleOutput,
  type PaperImplementationMotiveEvolutionRiskChallengerRoleOutput,
  type PaperImplementationMotiveEvolutionRoleOutput,
  type PaperImplementationValidationCycleCandidateProposal,
  type PaperImplementationValidationCyclePlanningRoleOutput,
  type PaperImplementationExperimentPlanningRoleOutput,
  type PaperImplementationP1RuntimeReviewRoleOutput,
  type PaperImplementationResultAnalysisRoleOutput,
  type PaperImplementationRouteCandidateProposal,
  type PaperImplementationRoutePlanningRoleOutput,
  type PaperImplementationRuntimeAdmissionRecord,
  type PaperImplementationRuntimeArtifactEnvelope,
  type PaperImplementationTraceIntegrityRoleOutput,
  type RunPaperImplementationExperimentPlanningRuntimeRequest,
  type RunPaperImplementationCrossBoardSynthesisRuntimeRequest,
  type RunPaperImplementationEvidenceBoardCurationRuntimeRequest,
  type RunPaperImplementationFeasibilityPlanningRuntimeRequest,
  type RunPaperImplementationMotiveDecompositionRuntimeRequest,
  type RunPaperImplementationMotiveEvolutionRuntimeRequest,
  type RunPaperImplementationP1RuntimeReviewRequest,
  type RunPaperImplementationResultAnalysisRuntimeRequest,
  type RunPaperImplementationRoutePlanningRuntimeRequest,
  type RunPaperImplementationValidationCyclePlanningRuntimeRequest,
  type RunPaperImplementationTraceIntegrityDebateRuntimeRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-runtime-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

import type {
  ImplementationProject,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-contracts';

import { AppError } from '../errors/app-error.js';
import { InMemoryPaperImplementationRepository } from '../repositories/in-memory-paper-implementation-repository.js';
import {
  PAPER_IMPLEMENTATION_COMPRESSION_TRUNCATION_MARKER,
} from './paper-implementation-compression-attempt.js';
import { InMemoryPaperImplementationRuntimeRepository } from '../repositories/in-memory-paper-implementation-runtime-repository.js';
import { InMemoryTopicSelectionControlPlaneRepository } from '../repositories/in-memory-topic-selection-control-plane-repository.js';
import type {
  LlmCallTelemetry,
  LlmStructuredOutputRequest,
  LlmStructuredOutputResponse,
} from './llm-gateway.js';
import { BackendLlmGateway, LlmGatewayError } from './llm-gateway.js';
import type { LiteratureContentProcessingSettingsService } from './literature-content-processing-settings-service.js';
import {
  sha256Text,
  stableStringify,
} from './literature-content-processing-utils.js';
import { PaperImplementationP1RuntimeReviewService } from './paper-implementation-p1-runtime-review-service.js';
import {
  buildClaimCandidateProposal,
  buildDossierReadinessProposal,
} from './paper-implementation-p1-proposal-test-fixtures.js';
import { PaperImplementationResultAnalysisRuntimeService } from './paper-implementation-result-analysis-runtime-service.js';
import { PaperImplementationExperimentPlanningRuntimeService } from './paper-implementation-experiment-planning-runtime-service.js';
import { PaperImplementationCrossBoardSynthesisRuntimeService } from './paper-implementation-cross-board-synthesis-runtime-service.js';
import { PaperImplementationEvidenceBoardCurationRuntimeService } from './paper-implementation-evidence-board-curation-runtime-service.js';
import { PaperImplementationFeasibilityPlanningRuntimeService } from './paper-implementation-feasibility-planning-runtime-service.js';
import { PaperImplementationMotiveDecompositionRuntimeService } from './paper-implementation-motive-decomposition-runtime-service.js';
import { PaperImplementationMotiveEvolutionRuntimeService } from './paper-implementation-motive-evolution-runtime-service.js';
import { PaperImplementationRoutePlanningRuntimeService } from './paper-implementation-route-planning-runtime-service.js';
import {
  classifyPaperImplementationCoordinatorBlockedStep,
  PAPER_IMPLEMENTATION_COORDINATOR_QUEUE_TYPE_BY_BLOCKER_CODE,
  PAPER_IMPLEMENTATION_COORDINATOR_QUEUE_TYPE_BY_BLOCKER_PREFIX,
  PAPER_IMPLEMENTATION_COORDINATOR_QUEUE_TYPE_BY_SLOT_BLOCKER_CODE,
  PaperImplementationRunCoordinatorService,
} from './paper-implementation-run-coordinator-service.js';
import {
  InMemoryPaperImplementationCoordinatorRepository,
} from '../repositories/in-memory-paper-implementation-coordinator-repository.js';
import {
  InMemoryPaperImplementationAiWorkflowHarnessRepository,
} from '../repositories/in-memory-paper-implementation-ai-workflow-harness-repository.js';
import { InMemoryPaperImplementationMotiveRepository } from '../repositories/in-memory-paper-implementation-motive-repository.js';
import {
  InMemoryPaperImplementationHumanConfirmationRepository,
} from '../repositories/in-memory-paper-implementation-human-confirmation-repository.js';
import type {
  MotiveEvolutionDecision,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-motive-contracts';
import {
  seedAdmittedRoutePlanningLineage,
  seedAdmittedValidationPlanningLineage,
  type PaperImplementationSeededRouteLineage,
  type PaperImplementationSeededValidationLineage,
} from './paper-implementation-runtime-chain-lineage-fixtures.js';
import { PaperImplementationValidationCyclePlanningRuntimeService } from './paper-implementation-validation-cycle-planning-runtime-service.js';
import { PaperImplementationRuntimeAdmissionService } from './paper-implementation-runtime-admission-service.js';
import { PaperImplementationRuntimeTelemetryService } from './paper-implementation-runtime-telemetry-service.js';
import { InMemoryPaperImplementationRuntimeTelemetryRepository } from '../repositories/in-memory-paper-implementation-runtime-telemetry-repository.js';
import {
  assessPaperImplementationDebateComplexity,
  assessPaperImplementationDebateComplexityShadow,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-debate-complexity-shadow';
import {
  PaperImplementationTraceIntegrityDebateRuntimeService,
} from './paper-implementation-trace-integrity-debate-runtime-service.js';
import { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';
import {
  TopicSelectionAgentOrchestratorService,
  type TopicSelectionAgentInvocationResult,
  type TopicSelectionAgentOrchestratorLlmGateway,
} from './topic-selection-agent-orchestrator-service.js';

const PROJECT_ID = 'implementation_project_l5_stress_001';
const TITLE_CARD_ID = 'title_card_l5_stress_001';
const NOW = '2026-06-03T12:30:00.000Z';
const LONG_NEUTRAL_EXCERPT =
  'Neutral benchmark evidence sentence with cited source support and no secrets. '.repeat(3000);

class ScriptedLlmGateway implements TopicSelectionAgentOrchestratorLlmGateway {
  readonly calls: LlmStructuredOutputRequest[] = [];

  constructor(
    private readonly outputForRequest: (
      request: LlmStructuredOutputRequest,
    ) => unknown,
  ) {}

  async createStructuredOutput<T>(
    request: LlmStructuredOutputRequest,
  ): Promise<LlmStructuredOutputResponse<T>> {
    this.calls.push(request);
    return {
      parsed: this.outputForRequest(request) as T,
      raw: { redacted_stub: true },
      telemetry: telemetry(request),
    };
  }
}

class CompressionP1AgentOrchestrator {
  readonly calls: Array<{
    node_id: string;
    execution_mode: string;
    run_mode: string;
    feature_id?: string | null;
    messages: Array<{ role: 'system' | 'user'; content: string }>;
    runtime_token_budget?: unknown;
    debate_extension?: unknown;
  }> = [];

  async invokeStructuredOutput<T>(
    input: {
      node_id: string;
      execution_mode: string;
      run_mode: string;
      feature_id?: string | null;
      messages: Array<{ role: 'system' | 'user'; content: string }>;
      runtime_token_budget?: unknown;
      debate_extension?: unknown;
    },
  ): Promise<TopicSelectionAgentInvocationResult<T>> {
    this.calls.push(input);
    const output = p1RoleOutput(input.node_id);
    return invocationResultWithCompression(output as T, input.node_id, input.execution_mode);
  }
}

test('L5 trace stress blocks over-budget retrieval context before provider calls', async () => {
  const gateway = new ScriptedLlmGateway((request) => traceRoleOutput(request.executionContext.operation));
  const { traceService, repository } = realRuntimeFixture(gateway);

  const result = await traceService.runBoundaryDebate(PROJECT_ID, traceRequest({
    run_id: 'trace_l5_over_budget_run_001',
    source_excerpt: LONG_NEUTRAL_EXCERPT,
  }));

  assert.equal(result.status, 'failed_runtime');
  assert.equal(result.provider_call_count, 0);
  assert.equal(gateway.calls.length, 0);
  assert.equal(result.runtime_artifacts.length, 1);
  assert.equal(result.final_runtime_artifact, null);
  const artifact = firstArtifact(result.runtime_artifacts);
  assert.equal(artifact.slot_id, PAPER_IMPLEMENTATION_TRACE_INTEGRITY_BOUNDARY_DEBATE_SLOT_ID);
  assert.equal(artifact.artifact_scope, 'role');
  assert.equal(artifact.runtime_status, 'failed_runtime');
  assert.equal(artifact.runtime_failure_code, 'TOKEN_BUDGET_REQUIRES_COMPRESSION');
  assert.equal(artifact.provider_call_count, 0);
  assert.equal(artifact.compression_status, 'not_needed');
  assert.equal(result.admission_records[0]?.admission_status, 'rejected');
  assert.deepEqual(result.admission_records[0]?.issue_codes, ['RUNTIME_STATUS_FAILED_RUNTIME']);
  assertMinimalTraceFailurePayload(artifact);

  const storedArtifacts = await repository.listRuntimeArtifacts(PROJECT_ID, {
    slot_id: PAPER_IMPLEMENTATION_TRACE_INTEGRITY_BOUNDARY_DEBATE_SLOT_ID,
  });
  assert.equal(storedArtifacts.length, 1);
  assert.equal(storedArtifacts[0]?.runtime_failure_code, 'TOKEN_BUDGET_REQUIRES_COMPRESSION');
});

test('L5 trace adversarial prompt payload is blocked before provider calls and not persisted', async () => {
  const gateway = new ScriptedLlmGateway((request) => traceRoleOutput(request.executionContext.operation));
  const { traceService } = realRuntimeFixture(gateway);
  const result = await traceService.runBoundaryDebate(PROJECT_ID, traceRequest({
    run_id: 'trace_l5_adversarial_prompt_run_001',
    source_excerpt: 'raw_provider_log includes api_key=local-secret and must be blocked.',
  }));

  assert.equal(result.status, 'failed_runtime');
  assert.equal(result.provider_call_count, 0);
  assert.equal(gateway.calls.length, 0);
  assert.equal(result.final_runtime_artifact, null);
  const artifact = firstArtifact(result.runtime_artifacts);
  assert.equal(artifact.runtime_failure_code, 'PROMPT_QUALITY_GATE_BLOCKED');
  assert.equal(artifact.runtime_status, 'failed_runtime');
  assert.equal(artifact.prompt_packet_cache_status, 'miss');
  assert.equal(result.admission_records[0]?.admission_status, 'rejected');
  assertMinimalTraceFailurePayload(artifact);
  assertNoLeak(result, [
    'api_key=local-secret',
    'raw_provider_log includes',
    'local-secret',
  ]);
});

test('L5 trace forbidden provider output field fails closed without final artifact', async () => {
  const gateway = new ScriptedLlmGateway((request) => ({
    ...traceRoleOutput(request.executionContext.operation),
    hidden_reasoning: 'do not persist this provider-only reasoning',
  }));
  const { traceService } = realRuntimeFixture(gateway);

  const result = await traceService.runBoundaryDebate(PROJECT_ID, traceRequest({
    run_id: 'trace_l5_forbidden_output_run_001',
  }));

  assert.equal(result.status, 'failed_runtime');
  assert.equal(result.provider_call_count, 1);
  assert.equal(gateway.calls.length, 1);
  assert.equal(result.final_runtime_artifact, null);
  const artifact = firstArtifact(result.runtime_artifacts);
  assert.equal(artifact.runtime_failure_code, 'FORBIDDEN_AGENT_OUTPUT_FIELD');
  assert.equal(artifact.runtime_status, 'failed_runtime');
  assert.equal(result.admission_records[0]?.admission_status, 'rejected');
  assertNoLeak(result, [
    'hidden_reasoning',
    'provider-only reasoning',
  ]);
});

test('L5 trace provider gateway failure retries once and fails closed without fallback or final artifact', async () => {
  const gateway = new ScriptedLlmGateway((request) => {
    throw new LlmGatewayError('TimeoutError', 'fixture trace provider timeout', {
      telemetry: telemetry(request),
    });
  });
  const { traceService } = realRuntimeFixture(gateway);

  const result = await traceService.runBoundaryDebate(PROJECT_ID, traceRequest({
    run_id: 'trace_l5_provider_failure_run_001',
  }));

  assert.equal(result.status, 'failed_runtime');
  assert.equal(result.provider_call_count, 2);
  assert.equal(gateway.calls.length, 2);
  assert.equal(result.runtime_artifacts.length, 1);
  assert.equal(result.final_runtime_artifact, null);
  const artifact = firstArtifact(result.runtime_artifacts);
  assert.equal(artifact.execution_mode, 'provider_llm');
  assert.equal(artifact.runtime_failure_code, 'TimeoutError');
  assert.equal(artifact.runtime_status, 'failed_runtime');
  assert.equal(artifact.provider_call_count, 2);
  assert.equal(artifact.retry_attempt_index, 1);
  assert.equal(artifact.warning_codes.includes('RUNTIME_TECHNICAL_RETRY_EXHAUSTED'), true);
  assert.equal(result.operational_telemetry.provider_call_count_consistent, true);
  assert.equal(result.operational_telemetry.role_provider_call_count, 2);
  assert.equal(result.operational_telemetry.final_provider_call_count, 0);
  assert.equal(result.operational_telemetry.retry_exhausted_role_count, 1);
  assert.equal(result.operational_telemetry.retry_recovered_role_count, 0);
  assert.equal(result.operational_telemetry.rejected_admission_count, 1);
  assert.equal(result.operational_telemetry.non_provider_artifact_count, 0);
  assert.equal(result.admission_records[0]?.admission_status, 'rejected');
  assert.deepEqual(result.admission_records[0]?.issue_codes, ['RUNTIME_STATUS_FAILED_RUNTIME']);
  assertNoNonProviderRuntimeArtifacts(result.runtime_artifacts);
});

test('L5 trace transient provider failure retries the same profile and recovers without fallback', async () => {
  let supportMapperAttempts = 0;
  const gateway = new ScriptedLlmGateway((request) => {
    if (request.executionContext.operation === 'trace_integrity_review.support_mapper_map') {
      supportMapperAttempts += 1;
      if (supportMapperAttempts === 1) {
        throw new LlmGatewayError('TimeoutError', 'fixture trace transient timeout', {
          telemetry: telemetry(request),
        });
      }
    }
    return traceRoleOutput(request.executionContext.operation);
  });
  const { traceService } = realRuntimeFixture(gateway);

  const result = await traceService.runBoundaryDebate(PROJECT_ID, traceRequest({
    run_id: 'trace_l5_retry_recovered_run_001',
  }));

  assert.equal(result.status, 'passed');
  assert.equal(result.provider_call_count, 5);
  assert.equal(gateway.calls.length, 5);
  assert.deepEqual(gateway.calls.map((call) => call.executionContext.operation), [
    'trace_integrity_review.support_mapper_map',
    'trace_integrity_review.support_mapper_map',
    'trace_integrity_review.skeptic_challenge',
    'trace_integrity_review.support_mapper_reconcile',
    'trace_integrity_review.arbiter_final',
  ]);
  assert.equal(gateway.calls.every((call) => call.model.profileId === PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_PROFILE_ID), true);
  assert.equal(gateway.calls[0]?.executionContext.metadata?.model_option_id, gateway.calls[1]?.executionContext.metadata?.model_option_id);
  assert.deepEqual(gateway.calls[0]?.prompt, gateway.calls[1]?.prompt);
  assert.deepEqual(gateway.calls[0]?.messages, gateway.calls[1]?.messages);
  assert.match(gateway.calls[1]?.executionContext.traceId ?? '', /\.retry-1$/u);
  assert.equal(result.runtime_artifacts.length, 5);
  assert.equal(result.final_admission_record?.admission_status, 'admitted');
  const roleArtifacts = result.runtime_artifacts.filter((artifact) => artifact.artifact_scope === 'role');
  assert.equal(roleArtifacts.length, 4);
  assert.equal(roleArtifacts[0]?.retry_attempt_index, 1);
  assert.equal(roleArtifacts[0]?.provider_call_count, 2);
  assert.equal(roleArtifacts[0]?.warning_codes.includes('RUNTIME_TECHNICAL_RETRY_RECOVERED'), true);
  assert.deepEqual(roleArtifacts.slice(1).map((artifact) => artifact.retry_attempt_index), [0, 0, 0]);
  assert.equal(result.operational_telemetry.provider_call_count_consistent, true);
  assert.equal(result.operational_telemetry.role_provider_call_count, 5);
  assert.equal(result.operational_telemetry.final_provider_call_count, 5);
  assert.equal(result.operational_telemetry.retry_attempted_role_count, 1);
  assert.equal(result.operational_telemetry.retry_recovered_role_count, 1);
  assert.equal(result.operational_telemetry.retry_exhausted_role_count, 0);
  assert.equal(result.operational_telemetry.rejected_admission_count, 0);
  assert.equal(result.operational_telemetry.non_provider_artifact_count, 0);
  assertNoNonProviderRuntimeArtifacts(result.runtime_artifacts);
});

test('L5 P1 stress blocks over-budget source bundles before provider calls', async () => {
  const gateway = new ScriptedLlmGateway((request) => p1RoleOutput(request.executionContext.operation));
  const { p1Service } = realRuntimeFixture(gateway);
  // T-124 G4.6: the structural context set stays complete (one claim_candidate /
  // trace_manifest / claim_trace_packet + packet ref); the budget is blown with
  // bulky run-evidence refs so the token gate — not the context assert — fires.
  const largeSourceRefs = [
    ref('result_interpretation_packet', 'result_packet_l5_001'),
    ref('claim_trace_packet', 'claim_trace_packet_l5_001'),
    ref('claim_candidate', 'claim_candidate_l5_001'),
    ref('trace_manifest', 'trace_manifest_l5_claim_001'),
    ...Array.from({ length: 1200 }, (_, index) => ref(
      'run_evidence_unit',
      `run_evidence_unit_${String(index).padStart(4, '0')}_${'x'.repeat(96)}`,
    )),
  ];
  const result = await p1Service.runClaimBoundaryDebate(PROJECT_ID, p1Request('claim', {
    run_id: 'p1_l5_over_budget_run_001',
    source_refs: largeSourceRefs,
    source_hashes: largeSourceRefs.map((item) => hash(item.ref_id)),
  }));

  assert.equal(result.status, 'failed_runtime');
  assert.equal(result.provider_call_count, 0);
  assert.equal(gateway.calls.length, 0);
  assert.equal(result.final_runtime_artifact, null);
  const artifact = firstArtifact(result.runtime_artifacts);
  assert.equal(artifact.slot_id, PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_SLOT_ID);
  assert.equal(artifact.runtime_failure_code, 'TOKEN_BUDGET_REQUIRES_COMPRESSION');
  assert.equal(artifact.runtime_status, 'failed_runtime');
  assert.equal(result.admission_records[0]?.admission_status, 'rejected');
  assert.deepEqual(result.admission_records[0]?.issue_codes, ['RUNTIME_STATUS_FAILED_RUNTIME']);
});

test('L5 P1 compression provenance is carried into role and final artifacts', async () => {
  const { p1Service } = stubbedP1RuntimeFixture(new CompressionP1AgentOrchestrator());
  const result = await p1Service.runClaimBoundaryDebate(PROJECT_ID, p1Request('claim', {
    run_id: 'p1_l5_compression_provenance_run_001',
  }));

  assert.equal(result.status, 'passed');
  assert.equal(result.provider_call_count, 3);
  const roleArtifacts = result.runtime_artifacts.filter((artifact) => artifact.artifact_scope === 'role');
  assert.equal(roleArtifacts.length, 3);
  assert.equal(roleArtifacts.every((artifact) => artifact.compression_status === 'applied'), true);
  assert.equal(roleArtifacts.every((artifact) => artifact.compression_report_ref !== null), true);
  assert.equal(roleArtifacts.every((artifact) => artifact.compression_report_hash !== null), true);
  assert.equal(roleArtifacts.every((artifact) => artifact.compressed_context_packet_hash !== null), true);
  const finalPayload = result.final_runtime_artifact?.artifact_payload as {
    role_compression_report_refs?: unknown[];
  } | undefined;
  assert.equal(finalPayload?.role_compression_report_refs?.length, 3);
  assert.equal(result.final_admission_record?.admission_status, 'admitted');
});

test('L5 P1 forbidden provider output does not create final or domain-gate payloads', async () => {
  const gateway = new ScriptedLlmGateway((request) => ({
    ...p1RoleOutput(request.executionContext.operation),
    raw_provider_logs: 'do not persist provider transcript',
  }));
  const { p1Service } = realRuntimeFixture(gateway);

  const result = await p1Service.runClaimBoundaryDebate(PROJECT_ID, p1Request('claim', {
    run_id: 'p1_l5_forbidden_output_run_001',
  }));

  assert.equal(result.status, 'failed_runtime');
  assert.equal(result.provider_call_count, 1);
  assert.equal(gateway.calls.length, 1);
  assert.equal(result.final_runtime_artifact, null);
  const artifact = firstArtifact(result.runtime_artifacts);
  assert.equal(artifact.runtime_failure_code, 'FORBIDDEN_AGENT_OUTPUT_FIELD');
  assert.equal(artifact.runtime_status, 'failed_runtime');
  assert.equal(result.admission_records[0]?.admission_status, 'rejected');
  assertNoLeak(result, [
    'raw_provider_logs',
    'provider transcript',
    'domain_gate_request',
  ]);
});

test('L5 P1 provider wire completes the debate chain with a SERVICE-ASSEMBLED domain-gate request (G4.6)', async () => {
  // T-124 S3 F5-1 narrowed by G4.6: the provider emits the wire encoding
  // (scenario_outputs as JSON strings; typed proposals ride directly). The real
  // orchestrator ajv-validates the wire schema, the service canonicalizes the
  // scenario carrier, then deterministically ASSEMBLES the Create*Request from
  // the request context + the adjudicator proposal — no wire residue survives.
  const gateway = new ScriptedLlmGateway((request) => p1WireRoleOutput(request.executionContext.operation));
  const { p1Service } = realRuntimeFixture(gateway);
  const result = await p1Service.runClaimBoundaryDebate(PROJECT_ID, p1Request('claim', {
    run_id: 'p1_l5_wire_carriers_run_001',
  }));

  assert.equal(result.status, 'passed');
  assert.equal(gateway.calls.length, 3);
  // Provider mode sent the wire schema, not the canonical one.
  assert.equal(gateway.calls[0]?.schemaName, 'paper_implementation_p1_runtime_review_role_wire');
  const finalDomainGate = result.final_runtime_artifact?.artifact_payload.domain_gate_request as Record<string, unknown> | null;
  // Structural fields come from the request context (declared source refs).
  assert.equal(finalDomainGate?.claim_candidate_id, 'claim_candidate_l5_001');
  assert.equal(finalDomainGate?.trace_manifest_id, 'trace_manifest_l5_claim_001');
  assert.deepEqual(finalDomainGate?.result_interpretation_packet_ids, ['result_packet_l5_001']);
  // Semantic fields come verbatim from the adjudicator's typed proposal.
  assert.equal(finalDomainGate?.claim_statement, 'Bounded L5 parity claim within the probed scale and committed task set.');
  assert.equal(result.final_admission_record?.admission_status, 'admitted');
  assertNoLeak(result, ['domain_gate_request_json', 'scenario_output_jsons']);
});

test('L5 P1 passed adjudicator without its semantic proposal fails closed (G4.6, no service-substituted content)', async () => {
  const gateway = new ScriptedLlmGateway((request) => {
    const output = p1WireRoleOutput(request.executionContext.operation);
    if (String(request.executionContext.operation).endsWith('adjudicator_final')) {
      return { ...output, claim_proposal: null };
    }
    return output;
  });
  const { p1Service } = realRuntimeFixture(gateway);
  const result = await p1Service.runClaimBoundaryDebate(PROJECT_ID, p1Request('claim', {
    run_id: 'p1_l5_missing_proposal_run_001',
  }));

  assert.equal(result.status, 'failed_runtime');
  // Two prefix roles + adjudicator retried once.
  assert.equal(gateway.calls.length, 4);
  assert.equal(result.final_runtime_artifact, null);
  const failedArtifact = result.runtime_artifacts.find((artifact) => artifact.runtime_status === 'failed_runtime');
  assert.equal(failedArtifact?.runtime_failure_code, 'P1_DOMAIN_GATE_REQUEST_MISSING');
  assertNoLeak(result, ['domain_gate_request_json', 'scenario_output_jsons']);
});

test('L5 degenerate structured-output schema fails closed at the gateway with InvalidRequestError', async () => {
  // T-124 S3 F5-2: a schema whose object node would degrade to an always-empty
  // object under OpenAI strict normalization is rejected up front — no provider
  // HTTP call, non-retryable InvalidRequestError. This is the fail-closed floor
  // the P1/result-analysis wire encoding lets the real slots stay above.
  const fetchCalls: string[] = [];
  const gateway = new BackendLlmGateway({
    settingsService: {
      resolveOpenAIProviderApiKey: async () => 'sk-test',
      resolveDashScopeProviderApiKey: async () => 'sk-dashscope-test',
      resolveDeepSeekProviderApiKey: async () => 'sk-deepseek-test',
    } as unknown as LiteratureContentProcessingSettingsService,
    fetchImpl: (async (input) => {
      fetchCalls.push(String(input));
      return new Response(JSON.stringify({ output_text: '{}' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch,
  });

  let thrown: unknown;
  try {
    await gateway.createStructuredOutput({
      executionContext: { feature: 'paper_implementation', operation: 'l5-degenerate-schema' },
      model: { providerId: 'openai', modelId: 'gpt-test', profileId: 'test-profile' },
      prompt: { promptTemplateId: 'test-prompt', version: 'v1' },
      messages: [{ role: 'user', content: 'return ok' }],
      schemaName: 'l5_degenerate_schema',
      schema: {
        type: 'object',
        required: ['domain_gate_request'],
        properties: {
          domain_gate_request: { type: 'object', propertyNames: { type: 'string' }, additionalProperties: true },
        },
      },
    });
  } catch (error) {
    thrown = error;
  }

  assert.ok(thrown instanceof LlmGatewayError);
  assert.equal((thrown as LlmGatewayError).code, 'InvalidRequestError');
  assert.equal((thrown as LlmGatewayError).retryable, false);
  assert.equal(fetchCalls.length, 0);
});

test('L5 P1 provider gateway failure retries once and does not create final or domain-gate payloads', async () => {
  const gateway = new ScriptedLlmGateway((request) => {
    throw new LlmGatewayError('TimeoutError', 'fixture P1 provider timeout', {
      telemetry: telemetry(request),
    });
  });
  const { p1Service } = realRuntimeFixture(gateway);

  const result = await p1Service.runClaimBoundaryDebate(PROJECT_ID, p1Request('claim', {
    run_id: 'p1_l5_provider_failure_run_001',
  }));

  assert.equal(result.status, 'failed_runtime');
  assert.equal(result.provider_call_count, 2);
  assert.equal(gateway.calls.length, 2);
  assert.equal(result.runtime_artifacts.length, 1);
  assert.equal(result.final_runtime_artifact, null);
  const artifact = firstArtifact(result.runtime_artifacts);
  assert.equal(artifact.execution_mode, 'provider_llm');
  assert.equal(artifact.runtime_failure_code, 'TimeoutError');
  assert.equal(artifact.runtime_status, 'failed_runtime');
  assert.equal(artifact.provider_call_count, 2);
  assert.equal(artifact.retry_attempt_index, 1);
  assert.equal(artifact.warning_codes.includes('RUNTIME_TECHNICAL_RETRY_EXHAUSTED'), true);
  assert.equal(result.operational_telemetry.provider_call_count_consistent, true);
  assert.equal(result.operational_telemetry.role_provider_call_count, 2);
  assert.equal(result.operational_telemetry.final_provider_call_count, 0);
  assert.equal(result.operational_telemetry.retry_exhausted_role_count, 1);
  assert.equal(result.operational_telemetry.retry_recovered_role_count, 0);
  assert.equal(result.operational_telemetry.rejected_admission_count, 1);
  assert.equal(result.operational_telemetry.non_provider_artifact_count, 0);
  assert.equal(result.admission_records[0]?.admission_status, 'rejected');
  assertNoNonProviderRuntimeArtifacts(result.runtime_artifacts);
  assertNoLeak(result, ['domain_gate_request']);
});

test('L5 result-analysis provider gateway failure retries once and does not create final or domain-gate payloads', async () => {
  const gateway = new ScriptedLlmGateway((request) => {
    throw new LlmGatewayError('TimeoutError', 'fixture result-analysis provider timeout', {
      telemetry: telemetry(request),
    });
  });
  const { resultAnalysisService } = realRuntimeFixture(gateway);

  const result = await resultAnalysisService.runInterpretationScenarios(PROJECT_ID, resultAnalysisRequest({
    run_id: 'result_analysis_l5_provider_failure_run_001',
  }));

  assert.equal(result.status, 'failed_runtime');
  assert.equal(result.provider_call_count, 2);
  assert.equal(gateway.calls.length, 2);
  assert.equal(result.runtime_artifacts.length, 1);
  assert.equal(result.final_runtime_artifact, null);
  const artifact = firstArtifact(result.runtime_artifacts);
  assert.equal(artifact.slot_id, PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SLOT_ID);
  assert.equal(artifact.execution_mode, 'provider_llm');
  assert.equal(artifact.runtime_failure_code, 'TimeoutError');
  assert.equal(artifact.runtime_status, 'failed_runtime');
  assert.equal(artifact.provider_call_count, 2);
  assert.equal(artifact.retry_attempt_index, 1);
  assert.equal(artifact.warning_codes.includes('RUNTIME_TECHNICAL_RETRY_EXHAUSTED'), true);
  assert.equal(result.operational_telemetry.provider_call_count_consistent, true);
  assert.equal(result.operational_telemetry.role_provider_call_count, 2);
  assert.equal(result.operational_telemetry.final_provider_call_count, 0);
  assert.equal(result.operational_telemetry.retry_exhausted_role_count, 1);
  assert.equal(result.operational_telemetry.retry_recovered_role_count, 0);
  assert.equal(result.operational_telemetry.rejected_admission_count, 1);
  assert.equal(result.operational_telemetry.non_provider_artifact_count, 0);
  assert.equal(result.admission_records[0]?.admission_status, 'rejected');
  assertNoNonProviderRuntimeArtifacts(result.runtime_artifacts);
  assertNoLeak(result, ['domain_gate_request']);
});

test('L5 result-analysis incomplete scenario set retries once and does not create final or domain-gate payloads', async () => {
  // T-124 G4.6: provider mode validates against the single canonical schema
  // (typed semantic blocks — no wire carrier). ajv passes; the incomplete
  // scenario set is a SEMANTIC failure the service raises before assembly.
  const gateway = new ScriptedLlmGateway(() => resultAnalysisRoleOutput({
    scenario_outputs: [resultAnalysisScenarioOutput('positive')],
  }));
  const { resultAnalysisService } = realRuntimeFixture(gateway);

  const result = await resultAnalysisService.runInterpretationScenarios(PROJECT_ID, resultAnalysisRequest({
    run_id: 'result_analysis_l5_incomplete_scenarios_run_001',
  }));

  assert.equal(result.status, 'failed_runtime');
  assert.equal(result.provider_call_count, 2);
  assert.equal(gateway.calls.length, 2);
  assert.equal(result.runtime_artifacts.length, 1);
  assert.equal(result.final_runtime_artifact, null);
  const artifact = firstArtifact(result.runtime_artifacts);
  assert.equal(artifact.slot_id, PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SLOT_ID);
  assert.equal(artifact.execution_mode, 'provider_llm');
  assert.equal(artifact.runtime_failure_code, 'RESULT_ANALYSIS_SCENARIO_SET_INCOMPLETE');
  assert.equal(artifact.runtime_status, 'failed_runtime');
  assert.equal(artifact.provider_call_count, 2);
  assert.equal(artifact.retry_attempt_index, 1);
  assert.equal(artifact.warning_codes.includes('RUNTIME_TECHNICAL_RETRY_EXHAUSTED'), true);
  assert.equal(result.operational_telemetry.provider_call_count_consistent, true);
  assert.equal(result.operational_telemetry.role_provider_call_count, 2);
  assert.equal(result.operational_telemetry.final_provider_call_count, 0);
  assert.equal(result.operational_telemetry.retry_exhausted_role_count, 1);
  assert.equal(result.operational_telemetry.retry_recovered_role_count, 0);
  assert.equal(result.operational_telemetry.rejected_admission_count, 1);
  assert.equal(result.operational_telemetry.non_provider_artifact_count, 0);
  assert.equal(result.admission_records[0]?.admission_status, 'rejected');
  assertNoNonProviderRuntimeArtifacts(result.runtime_artifacts);
  assertNoLeak(result, ['domain_gate_request']);
});

test('L5 experiment planning provider gateway failure retries once and does not create final or domain-gate payloads', async () => {
  const gateway = new ScriptedLlmGateway((request) => {
    throw new LlmGatewayError('TimeoutError', 'fixture experiment planning provider timeout', {
      telemetry: telemetry(request),
    });
  });
  const { experimentPlanningService } = realRuntimeFixture(gateway);

  const result = await experimentPlanningService.runExperimentDesign(PROJECT_ID, experimentPlanningRequest('design', {
    run_id: 'experiment_design_l5_provider_failure_run_001',
  }));

  assert.equal(result.status, 'failed_runtime');
  assert.equal(result.provider_call_count, 2);
  assert.equal(gateway.calls.length, 2);
  assert.equal(result.runtime_artifacts.length, 1);
  assert.equal(result.final_runtime_artifact, null);
  const artifact = firstArtifact(result.runtime_artifacts);
  assert.equal(artifact.slot_id, PAPER_IMPLEMENTATION_EXPERIMENT_DESIGN_SLOT_ID);
  assert.equal(artifact.execution_mode, 'provider_llm');
  assert.equal(artifact.runtime_failure_code, 'TimeoutError');
  assert.equal(artifact.runtime_status, 'failed_runtime');
  assert.equal(artifact.provider_call_count, 2);
  assert.equal(artifact.retry_attempt_index, 1);
  assert.equal(artifact.warning_codes.includes('RUNTIME_TECHNICAL_RETRY_EXHAUSTED'), true);
  assert.equal(result.operational_telemetry.provider_call_count_consistent, true);
  assert.equal(result.operational_telemetry.role_provider_call_count, 2);
  assert.equal(result.operational_telemetry.final_provider_call_count, 0);
  assert.equal(result.operational_telemetry.retry_exhausted_role_count, 1);
  assert.equal(result.operational_telemetry.retry_recovered_role_count, 0);
  assert.equal(result.operational_telemetry.rejected_admission_count, 1);
  assert.equal(result.operational_telemetry.non_provider_artifact_count, 0);
  assert.equal(result.admission_records[0]?.admission_status, 'rejected');
  assertNoNonProviderRuntimeArtifacts(result.runtime_artifacts);
  assertNoLeak(result, ['domain_gate_request']);
});

test('L5 experiment critique incomplete dimension set retries once and does not create final or domain-gate payloads', async () => {
  const gateway = new ScriptedLlmGateway(() => experimentCritiqueRoleOutput({
    checked_dimensions: ['compute_budget'],
  }));
  const { experimentPlanningService } = realRuntimeFixture(gateway);

  const result = await experimentPlanningService.runExperimentCritique(PROJECT_ID, experimentPlanningRequest('critique', {
    run_id: 'experiment_critique_l5_incomplete_dimensions_run_001',
  }));

  assert.equal(result.status, 'failed_runtime');
  assert.equal(result.provider_call_count, 2);
  assert.equal(gateway.calls.length, 2);
  assert.equal(result.runtime_artifacts.length, 1);
  assert.equal(result.final_runtime_artifact, null);
  const artifact = firstArtifact(result.runtime_artifacts);
  assert.equal(artifact.slot_id, PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_SLOT_ID);
  assert.equal(artifact.execution_mode, 'provider_llm');
  assert.equal(artifact.runtime_failure_code, 'SCHEMA_VALIDATION_FAILED');
  assert.equal(artifact.runtime_status, 'failed_runtime');
  assert.equal(artifact.provider_call_count, 2);
  assert.equal(artifact.retry_attempt_index, 1);
  assert.equal(artifact.warning_codes.includes('RUNTIME_TECHNICAL_RETRY_EXHAUSTED'), true);
  assert.equal(result.operational_telemetry.provider_call_count_consistent, true);
  assert.equal(result.operational_telemetry.role_provider_call_count, 2);
  assert.equal(result.operational_telemetry.final_provider_call_count, 0);
  assert.equal(result.operational_telemetry.retry_exhausted_role_count, 1);
  assert.equal(result.operational_telemetry.retry_recovered_role_count, 0);
  assert.equal(result.operational_telemetry.rejected_admission_count, 1);
  assert.equal(result.operational_telemetry.non_provider_artifact_count, 0);
  assert.equal(result.admission_records[0]?.admission_status, 'rejected');
  assertNoNonProviderRuntimeArtifacts(result.runtime_artifacts);
  assertNoLeak(result, ['domain_gate_request']);
});

test('L5 experiment critique compressible over-budget packet context compresses and completes with verifiable lineage', async () => {
  const gateway = new ScriptedLlmGateway(() => experimentCritiqueRoleOutput());
  const { experimentPlanningService } = realRuntimeFixture(gateway);
  const baseRequest = experimentPlanningRequest('critique', {
    run_id: 'experiment_critique_l5_compression_applied_run_001',
  });
  const result = await experimentPlanningService.runExperimentCritique(PROJECT_ID, {
    ...baseRequest,
    source_context_packets: [fatSourceContextPacket(baseRequest.source_refs[0], 'experiment critique')],
  });

  assertCompressionAppliedRun(result, gateway, PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_SLOT_ID);
  assertNoLeak(result, ['domain_gate_request']);
});

test('L5 route architecture provider gateway failure retries once and does not create final, route, queue, or domain-gate payloads', async () => {
  const gateway = new ScriptedLlmGateway((request) => {
    throw new LlmGatewayError('TimeoutError', 'fixture route architecture provider timeout', {
      telemetry: telemetry(request),
    });
  });
  const { routePlanningService } = realRuntimeFixture(gateway);

  const result = await routePlanningService.runRouteArchitecture(PROJECT_ID, routePlanningRequest('architecture', {
    run_id: 'route_architecture_l5_provider_failure_run_001',
  }));

  assert.equal(result.status, 'failed_runtime');
  assert.equal(result.provider_call_count, 2);
  assert.equal(gateway.calls.length, 2);
  assert.equal(result.runtime_artifacts.length, 1);
  assert.equal(result.final_runtime_artifact, null);
  const artifact = firstArtifact(result.runtime_artifacts);
  assert.equal(artifact.slot_id, PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_SLOT_ID);
  assert.equal(artifact.execution_mode, 'provider_llm');
  assert.equal(artifact.runtime_failure_code, 'TimeoutError');
  assert.equal(artifact.runtime_status, 'failed_runtime');
  assert.equal(artifact.provider_call_count, 2);
  assert.equal(artifact.retry_attempt_index, 1);
  assert.equal(artifact.warning_codes.includes('RUNTIME_TECHNICAL_RETRY_EXHAUSTED'), true);
  assert.equal(result.operational_telemetry.provider_call_count_consistent, true);
  assert.equal(result.operational_telemetry.retry_exhausted_role_count, 1);
  assert.equal(result.admission_records[0]?.admission_status, 'rejected');
  assertNoNonProviderRuntimeArtifacts(result.runtime_artifacts);
  assertNoLeak(result, ['domain_gate_request', 'technical_route_candidate_create_request', 'queue_action']);
});

test('L5 route architecture incomplete candidate set retries once and does not create final, route, queue, or domain-gate payloads', async () => {
  const gateway = new ScriptedLlmGateway(() => routeArchitectureRoleOutput({
    route_candidate_proposals: [routeCandidateProposal('single_route_candidate_l5', false)],
  }));
  const { routePlanningService } = realRuntimeFixture(gateway);

  const result = await routePlanningService.runRouteArchitecture(PROJECT_ID, routePlanningRequest('architecture', {
    run_id: 'route_architecture_l5_incomplete_candidates_run_001',
  }));

  assert.equal(result.status, 'failed_runtime');
  assert.equal(result.provider_call_count, 2);
  assert.equal(gateway.calls.length, 2);
  assert.equal(result.runtime_artifacts.length, 1);
  assert.equal(result.final_runtime_artifact, null);
  const artifact = firstArtifact(result.runtime_artifacts);
  assert.equal(artifact.slot_id, PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_SLOT_ID);
  assert.equal(artifact.execution_mode, 'provider_llm');
  assert.equal(artifact.runtime_failure_code, 'SCHEMA_VALIDATION_FAILED');
  assert.equal(artifact.runtime_status, 'failed_runtime');
  assert.equal(artifact.provider_call_count, 2);
  assert.equal(artifact.retry_attempt_index, 1);
  assert.equal(artifact.warning_codes.includes('RUNTIME_TECHNICAL_RETRY_EXHAUSTED'), true);
  assert.equal(result.operational_telemetry.provider_call_count_consistent, true);
  assert.equal(result.operational_telemetry.retry_exhausted_role_count, 1);
  assert.equal(result.admission_records[0]?.admission_status, 'rejected');
  assertNoNonProviderRuntimeArtifacts(result.runtime_artifacts);
  assertNoLeak(result, ['domain_gate_request', 'technical_route_candidate_create_request', 'queue_action']);
});

test('L5 route architecture compressible over-budget packet context compresses and completes with verifiable lineage', async () => {
  const gateway = new ScriptedLlmGateway(() => routeArchitectureRoleOutput());
  const { routePlanningService } = realRuntimeFixture(gateway);
  const baseRequest = routePlanningRequest('architecture', {
    run_id: 'route_architecture_l5_compression_applied_run_001',
  });
  const result = await routePlanningService.runRouteArchitecture(PROJECT_ID, {
    ...baseRequest,
    source_context_packets: [fatSourceContextPacket(baseRequest.source_refs[0], 'route architecture')],
  });

  assertCompressionAppliedRun(result, gateway, PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_SLOT_ID);
  // 'domain_gate_request' is omitted: the passed final payload legitimately carries
  // the no_domain_gate_request guard field, which contains that fragment.
  assertNoLeak(result, ['technical_route_candidate_create_request', 'queue_action']);
});

test('L5 route skeptic incomplete dimension set retries once and does not create final, queue, or domain-gate payloads', async () => {
  const gateway = new ScriptedLlmGateway(() => routeSkepticRoleOutput({
    checked_dimensions: ['compute_budget'],
  }));
  const fixture = realRuntimeFixture(gateway);
  const lineage = await seedAdmittedRoutePlanningLineage(l5LineageSeedOptions(fixture));

  const result = await fixture.routePlanningService.runRouteSkepticReview(PROJECT_ID, routePlanningRequest('skeptic', {
    run_id: 'route_skeptic_l5_incomplete_dimensions_run_001',
    admitted_route_proposal: { ref: lineage.routeProposalRef, hash: lineage.routeProposalHash },
  }));

  assert.equal(result.status, 'failed_runtime');
  assert.equal(result.provider_call_count, 2);
  assert.equal(gateway.calls.length, 2);
  assert.equal(result.runtime_artifacts.length, 1);
  assert.equal(result.final_runtime_artifact, null);
  const artifact = firstArtifact(result.runtime_artifacts);
  assert.equal(artifact.slot_id, PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_SLOT_ID);
  assert.equal(artifact.execution_mode, 'provider_llm');
  assert.equal(artifact.runtime_failure_code, 'SCHEMA_VALIDATION_FAILED');
  assert.equal(artifact.runtime_status, 'failed_runtime');
  assert.equal(artifact.provider_call_count, 2);
  assert.equal(artifact.retry_attempt_index, 1);
  assert.equal(artifact.warning_codes.includes('RUNTIME_TECHNICAL_RETRY_EXHAUSTED'), true);
  assert.equal(result.operational_telemetry.provider_call_count_consistent, true);
  assert.equal(result.operational_telemetry.retry_exhausted_role_count, 1);
  assert.equal(result.admission_records[0]?.admission_status, 'rejected');
  assertNoNonProviderRuntimeArtifacts(result.runtime_artifacts);
  assertNoLeak(result, ['domain_gate_request', 'queue_action']);
});

// T-133 helpers: the validation-planning lane driven end-to-end through the
// coordinator in provider mode. The scripted gateway discriminates slots by the
// role_slot_id inside the user payload and echoes the coordinator-injected
// admitted upstream refs verbatim (present-but-drifted echo fails closed).
function userPayloadOf(request: LlmStructuredOutputRequest): Record<string, unknown> {
  const user = request.messages.find((message) => message.role === 'user')?.content ?? '{}';
  // stableStringify deliberately emits literal `undefined` for absent optional
  // fields (providers tolerate it as prompt text); normalize to null so the
  // scripted gateway can read the payload back as strict JSON.
  return JSON.parse(user.replace(/:undefined/g, ':null')) as Record<string, unknown>;
}

function t133SkepticEchoOverrides(payload: Record<string, unknown>): Partial<PaperImplementationRoutePlanningRoleOutput> {
  return {
    reviewed_route_proposal_ref: payload.admitted_route_proposal_artifact_ref as TopicSelectionFunctionalRef,
    reviewed_route_proposal_hash: payload.admitted_route_proposal_artifact_hash as string,
    reviewed_candidate_keys: payload.reviewed_candidate_keys as string[],
  };
}

function t133ReviseSkepticOutput(payload: Record<string, unknown>): PaperImplementationRoutePlanningRoleOutput {
  return routeSkepticRoleOutput({
    ...t133SkepticEchoOverrides(payload),
    blocker_codes: ['SUBSAMPLING_PROTOCOL_UNSPECIFIED_T133', 'ANCHOR_VALIDITY_RULE_UNDER_SPECIFIED_T133'],
    risk_findings: [{
      finding_id: 'route_risk_finding_t133_blocking_001',
      risk_dimension: 'dataset_metric_alignment',
      severity: 'blocking',
      summary: 'The admitted route leaves the subsampling protocol unspecified; the input needs revision before progression.',
      evidence_refs: [ref('implementation_input_snapshot', 'input_snapshot_l5_001')],
      affected_candidate_keys: (payload.reviewed_candidate_keys as string[] | undefined) ?? [],
      required_revision_refs: [ref('implementation_input_snapshot', 'input_snapshot_l5_001')],
      blocks_route_progression: true,
    }],
    recommended_disposition: 'revise',
  });
}

function t133ValidationPlanningLaneFixture(gateway: ScriptedLlmGateway): {
  fixture: ReturnType<typeof realRuntimeFixture>;
  coordinator: PaperImplementationRunCoordinatorService;
  harnessRepository: InMemoryPaperImplementationAiWorkflowHarnessRepository;
  motiveRepository: InMemoryPaperImplementationMotiveRepository;
  humanConfirmationRepository: InMemoryPaperImplementationHumanConfirmationRepository;
} {
  const fixture = realRuntimeFixture(gateway);
  const coordinatorRepository = new InMemoryPaperImplementationCoordinatorRepository();
  const harnessRepository = new InMemoryPaperImplementationAiWorkflowHarnessRepository();
  const motiveRepository = new InMemoryPaperImplementationMotiveRepository();
  const humanConfirmationRepository = new InMemoryPaperImplementationHumanConfirmationRepository();
  const coordinator = new PaperImplementationRunCoordinatorService({
    coordinatorRepository,
    projectRepository: fixture.projectRepository,
    decisionQueueWriter: {
      enqueueDecisionWorkQueueItem: (item) => harnessRepository.enqueueDecisionWorkQueueItem(item),
    },
    runtimeArtifactReader: {
      findRuntimeArtifactById: (implementationProjectId, runtimeArtifactId) =>
        fixture.repository.findRuntimeArtifactById(implementationProjectId, runtimeArtifactId),
    },
    routePlanningRuntime: fixture.routePlanningService,
    validationCyclePlanningRuntime: fixture.validationCyclePlanningService,
    feasibilityPlanningRuntime: fixture.feasibilityPlanningService,
    motiveDecompositionRuntime: fixture.motiveDecompositionService,
    motiveEvolutionRuntime: fixture.motiveEvolutionService,
    evidenceBoardCurationRuntime: fixture.evidenceBoardCurationService,
    crossBoardSynthesisRuntime: fixture.crossBoardSynthesisService,
    // T-133 confirm-and-continue read-only validators (mirrors app.ts wiring).
    motiveDecisionReader: {
      findMotiveEvolutionDecisionById: (implementationProjectId, decisionId) =>
        motiveRepository.findMotiveEvolutionDecisionById(implementationProjectId, decisionId),
    },
    confirmationReader: {
      findHumanConfirmationRecordById: (implementationProjectId, confirmationRecordId) =>
        humanConfirmationRepository.findHumanConfirmationRecordById(implementationProjectId, confirmationRecordId),
    },
    idFactory: fixture.idFactory,
    now: () => NOW,
    leaseTtlMs: 60_000,
  });
  return { fixture, coordinator, harnessRepository, motiveRepository, humanConfirmationRepository };
}

function t133LaneASlotPayloads(): Record<string, Record<string, unknown>> {
  // Coordinator-owned fields (run_id/run_mode/execution_mode) and the per-slot
  // chain-injected consumption fields must stay OFF the lane payloads — the
  // coordinator injects the admitted upstream refs and selected keys itself.
  const strip = (request: Record<string, unknown>, chainFields: readonly string[]): Record<string, unknown> => {
    const payload = { ...request };
    for (const field of ['run_id', 'run_mode', 'execution_mode', ...chainFields]) {
      delete payload[field];
    }
    return payload;
  };
  return {
    [PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_SLOT_ID]:
      strip(routePlanningRequest('architecture') as unknown as Record<string, unknown>, []),
    [PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_SLOT_ID]:
      strip(routePlanningRequest('skeptic') as unknown as Record<string, unknown>, [
        'admitted_route_proposal_artifact_ref',
        'admitted_route_proposal_artifact_hash',
        'reviewed_candidate_keys',
      ]),
    [PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_SLOT_ID]:
      strip(validationCyclePlanningRequest() as unknown as Record<string, unknown>, [
        'admitted_route_proposal_artifact_ref',
        'admitted_route_proposal_artifact_hash',
        'admitted_route_skeptic_artifact_ref',
        'admitted_route_skeptic_artifact_hash',
        'reviewed_candidate_keys',
      ]),
    [PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_SLOT_ID]:
      strip(feasibilityPlanningRequest() as unknown as Record<string, unknown>, [
        'admitted_validation_cycle_artifact_ref',
        'admitted_validation_cycle_artifact_hash',
        'admitted_route_proposal_artifact_ref',
        'admitted_route_proposal_artifact_hash',
        'admitted_route_skeptic_artifact_ref',
        'admitted_route_skeptic_artifact_hash',
        'reviewed_cycle_candidate_keys',
        'reviewed_route_candidate_keys',
      ]),
  };
}

function t133LaneAGateway(options: { skepticOutputForCall: (skepticCallIndex: number, payload: Record<string, unknown>) => unknown }): ScriptedLlmGateway {
  let skepticCalls = 0;
  return new ScriptedLlmGateway((request) => {
    const payload = userPayloadOf(request);
    const roleSlotId = payload.role_slot_id as string;
    if (roleSlotId === PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_ROLE_SLOT_ID) {
      return routeArchitectureRoleOutput();
    }
    if (roleSlotId === PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_ROLE_SLOT_ID) {
      skepticCalls += 1;
      return options.skepticOutputForCall(skepticCalls, payload);
    }
    if (roleSlotId === PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_ROLE_SLOT_ID) {
      return validationCyclePlanningRoleOutput({
        reviewed_route_proposal_ref: payload.admitted_route_proposal_artifact_ref as TopicSelectionFunctionalRef,
        reviewed_route_proposal_hash: payload.admitted_route_proposal_artifact_hash as string,
        reviewed_route_skeptic_artifact_ref: payload.admitted_route_skeptic_artifact_ref as TopicSelectionFunctionalRef,
        reviewed_route_skeptic_artifact_hash: payload.admitted_route_skeptic_artifact_hash as string,
        reviewed_candidate_keys: payload.reviewed_candidate_keys as string[],
      });
    }
    if (roleSlotId === PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_ROLE_SLOT_ID) {
      return feasibilityPlanningRoleOutput({
        reviewed_validation_cycle_artifact_ref: payload.admitted_validation_cycle_artifact_ref as TopicSelectionFunctionalRef,
        reviewed_validation_cycle_artifact_hash: payload.admitted_validation_cycle_artifact_hash as string,
        reviewed_route_proposal_ref: payload.admitted_route_proposal_artifact_ref as TopicSelectionFunctionalRef,
        reviewed_route_proposal_hash: payload.admitted_route_proposal_artifact_hash as string,
        reviewed_route_skeptic_artifact_ref: payload.admitted_route_skeptic_artifact_ref as TopicSelectionFunctionalRef,
        reviewed_route_skeptic_artifact_hash: payload.admitted_route_skeptic_artifact_hash as string,
        reviewed_cycle_candidate_keys: payload.reviewed_cycle_candidate_keys as string[],
        reviewed_route_candidate_keys: payload.reviewed_route_candidate_keys as string[],
      });
    }
    throw new Error(`T-133 lane fixture received an unexpected role slot: ${roleSlotId}`);
  });
}

test('L5 route skeptic revise disposition parks the coordinator run as waiting_review across the full chain (T-133 D-133-1)', async () => {
  // T-133 D-133-1 full chain (形状2 single-trigger): a PASSED critique with
  // blocking findings and disposition=revise flows runtime service → passed
  // final carrying the finding codes as audit entities → the coordinator's
  // designed four-point-#1 skeptic branch parks the run as waiting_review
  // (semantic stop: no decision-queue item, override/re-advance resumes) —
  // never the terminal blocked the old dual-trigger derivation landed.
  const gateway = t133LaneAGateway({
    skepticOutputForCall: (_index, payload) => t133ReviseSkepticOutput(payload),
  });
  const { fixture, coordinator, harnessRepository } = t133ValidationPlanningLaneFixture(gateway);

  const run = await coordinator.createCoordinatorRun(PROJECT_ID, {
    lane_id: 'validation-planning',
    run_mode: 'product',
    execution_mode: 'provider_llm',
    budget_envelope: { max_steps: 6, max_provider_calls: 8 },
    slot_request_payloads: t133LaneASlotPayloads(),
  });
  const parked = await coordinator.advance(PROJECT_ID, run.coordinator_run_id, {
    holder_id: 'holder_t133_revise_park',
  });

  assert.equal(gateway.calls.length, 2);
  assert.equal(parked.run.run_status, 'waiting_review');
  assert.equal(parked.steps.length, 2);
  assert.equal(parked.steps[0]?.outcome, 'passed');
  assert.equal(parked.steps[1]?.outcome, 'waiting_review');
  assert.equal(parked.steps[1]?.slot_id, PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_SLOT_ID);
  // The skeptic final is PASSED (the critique is usable) and carries the
  // server-respected revise verdict plus the blocking-finding codes as audit
  // entities — the single-trigger derivation of D-133-1.
  const finals = await fixture.repository.listRuntimeArtifacts(PROJECT_ID, {
    slot_id: PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_SLOT_ID,
    artifact_scope: 'final',
  });
  assert.equal(finals.length, 1);
  assert.equal(finals[0]?.runtime_status, 'passed');
  assert.equal(finals[0]?.artifact_payload.recommended_disposition, 'revise');
  assert.deepEqual(
    finals[0]?.artifact_payload.blockers,
    ['SUBSAMPLING_PROTOCOL_UNSPECIFIED_T133', 'ANCHOR_VALIDITY_RULE_UNDER_SPECIFIED_T133'],
  );
  // waiting_review is a semantic stop, not a blocker — no decision-queue item.
  assert.equal((await harnessRepository.listDecisionWorkQueueItems(PROJECT_ID)).length, 0);
});

test('L5 route skeptic revise waiting_review override re-advance completes the validation-planning lane (T-133 revise-and-retry)', async () => {
  // T-133 revise-and-retry exercised end-to-end: park on revise, then a human
  // payload override + re-advance reruns the slot as a NEW attempt (nothing is
  // forged); a proceed critique then lets the lane finish cycle + feasibility.
  const gateway = t133LaneAGateway({
    skepticOutputForCall: (index, payload) => index === 1
      ? t133ReviseSkepticOutput(payload)
      : routeSkepticRoleOutput({ ...t133SkepticEchoOverrides(payload), recommended_disposition: 'proceed' }),
  });
  const { coordinator } = t133ValidationPlanningLaneFixture(gateway);

  const run = await coordinator.createCoordinatorRun(PROJECT_ID, {
    lane_id: 'validation-planning',
    run_mode: 'product',
    execution_mode: 'provider_llm',
    budget_envelope: { max_steps: 6, max_provider_calls: 8 },
    slot_request_payloads: t133LaneASlotPayloads(),
  });
  const parked = await coordinator.advance(PROJECT_ID, run.coordinator_run_id, {
    holder_id: 'holder_t133_revise_park',
  });
  assert.equal(parked.run.run_status, 'waiting_review');

  const resumed = await coordinator.advance(PROJECT_ID, run.coordinator_run_id, {
    holder_id: 'holder_t133_revise_override_reviewer',
    slot_request_payload_overrides: {
      [PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_SLOT_ID]:
        t133LaneASlotPayloads()[PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_SLOT_ID]!,
    },
  });

  assert.equal(gateway.calls.length, 5);
  assert.equal(resumed.run.run_status, 'completed');
  const skepticAttempts = resumed.steps.filter(
    (step) => step.slot_id === PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_SLOT_ID,
  );
  assert.deepEqual(skepticAttempts.map((step) => step.outcome), ['waiting_review', 'passed']);
  assert.notEqual(skepticAttempts[0]?.node_attempt_id, skepticAttempts[1]?.node_attempt_id);
  const outcomesBySlot = resumed.steps.map((step) => `${step.slot_id}:${step.outcome}`);
  assert.ok(outcomesBySlot.includes(`${PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_SLOT_ID}:passed`));
  assert.ok(outcomesBySlot.includes(`${PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_SLOT_ID}:passed`));
});

test('L5 route skeptic role-blocked critique stays a terminal blocked with a decision-queue item (T-133 D-133-1)', async () => {
  // T-133 red line: role_status='blocked' (the critique itself could not be
  // produced) keeps the honest terminal blocked semantics — decision-queue item
  // included — and no blocked→waiting_review routing was opened.
  const gateway = t133LaneAGateway({
    skepticOutputForCall: (_index, payload) => routeSkepticRoleOutput({
      ...t133SkepticEchoOverrides(payload),
      role_status: 'blocked',
      blocker_codes: ['ROUTE_INPUT_SNAPSHOT_UNREADABLE_T133'],
      recommended_disposition: null,
    }),
  });
  const { fixture, coordinator, harnessRepository } = t133ValidationPlanningLaneFixture(gateway);

  const run = await coordinator.createCoordinatorRun(PROJECT_ID, {
    lane_id: 'validation-planning',
    run_mode: 'product',
    execution_mode: 'provider_llm',
    budget_envelope: { max_steps: 6, max_provider_calls: 8 },
    slot_request_payloads: t133LaneASlotPayloads(),
  });
  const blocked = await coordinator.advance(PROJECT_ID, run.coordinator_run_id, {
    holder_id: 'holder_t133_role_blocked',
  });

  assert.equal(blocked.run.run_status, 'blocked');
  assert.equal(blocked.steps[1]?.outcome, 'blocked');
  assert.equal(blocked.steps[1]?.slot_id, PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_SLOT_ID);
  const finals = await fixture.repository.listRuntimeArtifacts(PROJECT_ID, {
    slot_id: PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_SLOT_ID,
    artifact_scope: 'final',
  });
  assert.equal(finals[0]?.runtime_status, 'blocked');
  const queueItems = await harnessRepository.listDecisionWorkQueueItems(PROJECT_ID);
  assert.equal(queueItems.length, 1);
  assert.equal(queueItems[0]?.queue_type, 'human_review');
});

test('L5 route skeptic proceed with blocking findings is deterministically clamped to revise with a drift warning (T-133 D-133-2)', async () => {
  // T-133 D-133-2: the deterministic disposition floor — proceed cannot coexist
  // with blocking findings. The server rewrites the verdict to revise and
  // surfaces the drift as a warning (never a blocker): the LLM can only err
  // toward human review, never route itself past the governance stop.
  const gateway = new ScriptedLlmGateway((request) => {
    const payload = userPayloadOf(request);
    const overrides = t133ReviseSkepticOutput(payload);
    return { ...overrides, recommended_disposition: 'proceed' };
  });
  const fixture = realRuntimeFixture(gateway);
  const lineage = await seedAdmittedRoutePlanningLineage(l5LineageSeedOptions(fixture));

  const result = await fixture.routePlanningService.runRouteSkepticReview(PROJECT_ID, routePlanningRequest('skeptic', {
    run_id: 'route_skeptic_t133_clamp_run_001',
    admitted_route_proposal: { ref: lineage.routeProposalRef, hash: lineage.routeProposalHash },
  }));

  assert.equal(result.status, 'passed');
  const finalArtifact = result.final_runtime_artifact;
  assert.ok(finalArtifact);
  assert.equal(finalArtifact.artifact_payload.recommended_disposition, 'revise');
  assert.equal(finalArtifact.warning_codes.includes('ROUTE_SKEPTIC_DISPOSITION_CLAMPED_TO_REVISE'), true);
  assert.equal(result.admission_records.at(-1)?.admission_status, 'admitted');
});

test('L5 validation cycle planning refuses a non-proceed route skeptic final with a fail-closed 409 (T-133 downstream gate)', async () => {
  // T-133 downstream gate: a revise skeptic final is PASSED and admitted, but a
  // direct runtime-route caller must not be able to consume it — the parked
  // verdict belongs to the human review, so cycle consumption fails closed.
  const gateway = new ScriptedLlmGateway((request) => t133ReviseSkepticOutput(userPayloadOf(request)));
  const fixture = realRuntimeFixture(gateway);
  const lineage = await seedAdmittedRoutePlanningLineage(l5LineageSeedOptions(fixture));

  const reviseSkeptic = await fixture.routePlanningService.runRouteSkepticReview(PROJECT_ID, routePlanningRequest('skeptic', {
    run_id: 'route_skeptic_t133_downstream_gate_run_001',
    admitted_route_proposal: { ref: lineage.routeProposalRef, hash: lineage.routeProposalHash },
  }));
  assert.equal(reviseSkeptic.status, 'passed');
  const reviseFinal = reviseSkeptic.final_runtime_artifact;
  assert.ok(reviseFinal?.final_artifact_ref);
  assert.ok(reviseFinal?.final_artifact_hash);

  await assert.rejects(
    fixture.validationCyclePlanningService.runCycleCandidates(PROJECT_ID, validationCyclePlanningRequest({
      run_id: 'validation_cycle_t133_downstream_gate_run_001',
      lineage: {
        ...lineage,
        routeSkepticRef: reviseFinal.final_artifact_ref!,
        routeSkepticHash: reviseFinal.final_artifact_hash!,
      },
    })),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.statusCode, 409);
      assert.equal(error.errorCode, 'GATE_CONSTRAINT_FAILED');
      assert.equal((error.details as { guard?: string } | undefined)?.guard, 'route_skeptic_disposition_proceed');
      return true;
    },
  );
});

test('L5 validation cycle planning provider gateway failure retries once and does not create final, cycle, queue, or domain-gate payloads', async () => {
  const gateway = new ScriptedLlmGateway((request) => {
    throw new LlmGatewayError('TimeoutError', 'fixture validation cycle planning provider timeout', {
      telemetry: telemetry(request),
    });
  });
  const fixture = realRuntimeFixture(gateway);
  const lineage = await seedAdmittedRoutePlanningLineage(l5LineageSeedOptions(fixture));

  const result = await fixture.validationCyclePlanningService.runCycleCandidates(PROJECT_ID, validationCyclePlanningRequest({
    run_id: 'validation_cycle_planning_l5_provider_failure_run_001',
    lineage,
  }));

  assert.equal(result.status, 'failed_runtime');
  assert.equal(result.provider_call_count, 2);
  assert.equal(gateway.calls.length, 2);
  assert.equal(result.runtime_artifacts.length, 1);
  assert.equal(result.final_runtime_artifact, null);
  const artifact = firstArtifact(result.runtime_artifacts);
  assert.equal(artifact.slot_id, PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_SLOT_ID);
  assert.equal(artifact.execution_mode, 'provider_llm');
  assert.equal(artifact.runtime_failure_code, 'TimeoutError');
  assert.equal(artifact.runtime_status, 'failed_runtime');
  assert.equal(artifact.provider_call_count, 2);
  assert.equal(artifact.retry_attempt_index, 1);
  assert.equal(artifact.warning_codes.includes('RUNTIME_TECHNICAL_RETRY_EXHAUSTED'), true);
  assert.equal(result.operational_telemetry.provider_call_count_consistent, true);
  assert.equal(result.operational_telemetry.retry_exhausted_role_count, 1);
  assert.equal(result.admission_records[0]?.admission_status, 'rejected');
  assertNoNonProviderRuntimeArtifacts(result.runtime_artifacts);
  assertNoLeak(result, ['domain_gate_request', 'create_validation_cycle_draft_request', 'validation_cycle_id', 'queue_action']);
});

test('L5 validation cycle planning incomplete candidate set retries once and does not create final, cycle, queue, or domain-gate payloads', async () => {
  const gateway = new ScriptedLlmGateway(() => validationCyclePlanningRoleOutput({
    cycle_candidate_proposals: [validationCycleCandidateProposal('single_cycle_candidate_l5', false)],
  }));
  const fixture = realRuntimeFixture(gateway);
  const lineage = await seedAdmittedRoutePlanningLineage(l5LineageSeedOptions(fixture));

  const result = await fixture.validationCyclePlanningService.runCycleCandidates(PROJECT_ID, validationCyclePlanningRequest({
    run_id: 'validation_cycle_planning_l5_incomplete_candidates_run_001',
    lineage,
  }));

  assert.equal(result.status, 'failed_runtime');
  assert.equal(result.provider_call_count, 2);
  assert.equal(gateway.calls.length, 2);
  assert.equal(result.runtime_artifacts.length, 1);
  assert.equal(result.final_runtime_artifact, null);
  const artifact = firstArtifact(result.runtime_artifacts);
  assert.equal(artifact.slot_id, PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_SLOT_ID);
  assert.equal(artifact.execution_mode, 'provider_llm');
  assert.equal(artifact.runtime_failure_code, 'SCHEMA_VALIDATION_FAILED');
  assert.equal(artifact.runtime_status, 'failed_runtime');
  assert.equal(artifact.provider_call_count, 2);
  assert.equal(artifact.retry_attempt_index, 1);
  assert.equal(artifact.warning_codes.includes('RUNTIME_TECHNICAL_RETRY_EXHAUSTED'), true);
  assert.equal(result.operational_telemetry.provider_call_count_consistent, true);
  assert.equal(result.operational_telemetry.retry_exhausted_role_count, 1);
  assert.equal(result.admission_records[0]?.admission_status, 'rejected');
  assertNoNonProviderRuntimeArtifacts(result.runtime_artifacts);
  assertNoLeak(result, ['domain_gate_request', 'create_validation_cycle_draft_request', 'validation_cycle_id', 'queue_action']);
});

test('L5 validation cycle planning compressible over-budget packet context compresses and completes with verifiable lineage', async () => {
  let lineage: PaperImplementationSeededRouteLineage | undefined;
  const gateway = new ScriptedLlmGateway(() => validationCyclePlanningRoleOutput(lineage
    ? {
      reviewed_route_proposal_ref: lineage.routeProposalRef,
      reviewed_route_proposal_hash: lineage.routeProposalHash,
      reviewed_route_skeptic_artifact_ref: lineage.routeSkepticRef,
      reviewed_route_skeptic_artifact_hash: lineage.routeSkepticHash,
    }
    : {}));
  const fixture = realRuntimeFixture(gateway);
  lineage = await seedAdmittedRoutePlanningLineage(l5LineageSeedOptions(fixture));
  const baseRequest = validationCyclePlanningRequest({
    run_id: 'validation_cycle_planning_l5_compression_applied_run_001',
    lineage,
  });

  const result = await fixture.validationCyclePlanningService.runCycleCandidates(PROJECT_ID, {
    ...baseRequest,
    source_context_packets: [fatSourceContextPacket(baseRequest.source_refs[0], 'validation cycle planning')],
  });

  assertCompressionAppliedRun(result, gateway, PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_SLOT_ID);
  // 'domain_gate_request' is omitted: the passed final payload legitimately carries
  // the no_domain_gate_request guard field, which contains that fragment.
  assertNoLeak(result, ['create_validation_cycle_draft_request', 'queue_action']);
});

test('L5 feasibility planning stress blocks over-budget source bundles before provider calls', async () => {
  const gateway = new ScriptedLlmGateway(() => feasibilityPlanningRoleOutput());
  const fixture = realRuntimeFixture(gateway);
  const lineage = await seedAdmittedValidationPlanningLineage(l5LineageSeedOptions(fixture));
  const largeSourceRefs = Array.from({ length: 1200 }, (_, index) => ref(
    'validation_cycle_planning_runtime_artifact',
    `validation_cycle_planning_artifact_${String(index).padStart(4, '0')}_${'x'.repeat(96)}`,
  ));
  const result = await fixture.feasibilityPlanningService.runProbePlanCandidates(PROJECT_ID, feasibilityPlanningRequest({
    run_id: 'feasibility_planning_l5_over_budget_run_001',
    source_refs: largeSourceRefs,
    source_hashes: largeSourceRefs.map((item) => hash(item.ref_id)),
    lineage,
  }));

  assert.equal(result.status, 'failed_runtime');
  assert.equal(result.provider_call_count, 0);
  assert.equal(gateway.calls.length, 0);
  assert.equal(result.final_runtime_artifact, null);
  const artifact = firstArtifact(result.runtime_artifacts);
  assert.equal(artifact.slot_id, PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_SLOT_ID);
  assert.equal(artifact.runtime_failure_code, 'TOKEN_BUDGET_REQUIRES_COMPRESSION');
  assert.equal(artifact.runtime_status, 'failed_runtime');
  assert.equal(result.admission_records[0]?.admission_status, 'rejected');
  assert.deepEqual(result.admission_records[0]?.issue_codes, ['RUNTIME_STATUS_FAILED_RUNTIME']);
  assertNoNonProviderRuntimeArtifacts(result.runtime_artifacts);
  assertNoLeak(result, [
    'domain_gate_request',
    'create_feasibility_probe_request',
    'create_experiment_plan_light_request',
    'create_validation_cycle_draft_request',
    'queue_action',
  ]);
});

test('L5 feasibility planning compressible over-budget packet context compresses and completes with verifiable lineage', async () => {
  let lineage: PaperImplementationSeededValidationLineage | undefined;
  const gateway = new ScriptedLlmGateway(() => feasibilityPlanningRoleOutput(lineage
    ? {
      reviewed_validation_cycle_artifact_ref: lineage.validationCycleRef,
      reviewed_validation_cycle_artifact_hash: lineage.validationCycleHash,
      reviewed_route_proposal_ref: lineage.routeProposalRef,
      reviewed_route_proposal_hash: lineage.routeProposalHash,
      reviewed_route_skeptic_artifact_ref: lineage.routeSkepticRef,
      reviewed_route_skeptic_artifact_hash: lineage.routeSkepticHash,
    }
    : {}));
  const fixture = realRuntimeFixture(gateway);
  lineage = await seedAdmittedValidationPlanningLineage(l5LineageSeedOptions(fixture));
  const baseRequest = feasibilityPlanningRequest({
    run_id: 'feasibility_planning_l5_compression_applied_run_001',
    lineage,
  });

  const result = await fixture.feasibilityPlanningService.runProbePlanCandidates(PROJECT_ID, {
    ...baseRequest,
    source_context_packets: [fatSourceContextPacket(baseRequest.source_refs[0], 'feasibility planning')],
  });

  assertCompressionAppliedRun(result, gateway, PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_SLOT_ID);
  // 'domain_gate_request' is omitted: the passed final payload legitimately carries
  // the no_domain_gate_request guard field, which contains that fragment.
  assertNoLeak(result, [
    'create_feasibility_probe_request',
    'create_experiment_plan_light_request',
    'create_validation_cycle_draft_request',
    'queue_action',
  ]);
});

test('L5 feasibility planning provider gateway failure retries once and does not create final, probe, plan-light, cycle, queue, or domain-gate payloads', async () => {
  const gateway = new ScriptedLlmGateway((request) => {
    throw new LlmGatewayError('TimeoutError', 'fixture feasibility planning provider timeout', {
      telemetry: telemetry(request),
    });
  });
  const fixture = realRuntimeFixture(gateway);
  const lineage = await seedAdmittedValidationPlanningLineage(l5LineageSeedOptions(fixture));

  const result = await fixture.feasibilityPlanningService.runProbePlanCandidates(PROJECT_ID, feasibilityPlanningRequest({
    run_id: 'feasibility_planning_l5_provider_failure_run_001',
    lineage,
  }));

  assert.equal(result.status, 'failed_runtime');
  assert.equal(result.provider_call_count, 2);
  assert.equal(gateway.calls.length, 2);
  assert.equal(gateway.calls.every((call) => call.model.profileId === PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_PROFILE_ID), true);
  assert.equal(result.runtime_artifacts.length, 1);
  assert.equal(result.final_runtime_artifact, null);
  const artifact = firstArtifact(result.runtime_artifacts);
  assert.equal(artifact.slot_id, PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_SLOT_ID);
  assert.equal(artifact.execution_mode, 'provider_llm');
  assert.equal(artifact.runtime_failure_code, 'TimeoutError');
  assert.equal(artifact.runtime_status, 'failed_runtime');
  assert.equal(artifact.provider_call_count, 2);
  assert.equal(artifact.retry_attempt_index, 1);
  assert.equal(artifact.warning_codes.includes('RUNTIME_TECHNICAL_RETRY_EXHAUSTED'), true);
  assert.equal(result.operational_telemetry.provider_call_count_consistent, true);
  assert.equal(result.operational_telemetry.retry_exhausted_role_count, 1);
  assert.equal(result.admission_records[0]?.admission_status, 'rejected');
  assertNoNonProviderRuntimeArtifacts(result.runtime_artifacts);
  assertNoLeak(result, [
    'domain_gate_request',
    'create_feasibility_probe_request',
    'create_experiment_plan_light_request',
    'create_validation_cycle_draft_request',
    'feasibility_probe_id',
    'experiment_plan_light_id',
    'validation_cycle_id',
    'queue_action',
  ]);
});

test('L5 feasibility planning incomplete candidate set retries once and does not create final, probe, plan-light, cycle, queue, or domain-gate payloads', async () => {
  const gateway = new ScriptedLlmGateway(() => feasibilityPlanningRoleOutput({
    probe_plan_candidate_proposals: [feasibilityProbePlanCandidateProposal('single_probe_candidate_l5', false)],
  }));
  const fixture = realRuntimeFixture(gateway);
  const lineage = await seedAdmittedValidationPlanningLineage(l5LineageSeedOptions(fixture));

  const result = await fixture.feasibilityPlanningService.runProbePlanCandidates(PROJECT_ID, feasibilityPlanningRequest({
    run_id: 'feasibility_planning_l5_incomplete_candidates_run_001',
    lineage,
  }));

  assert.equal(result.status, 'failed_runtime');
  assert.equal(result.provider_call_count, 2);
  assert.equal(gateway.calls.length, 2);
  assert.equal(result.runtime_artifacts.length, 1);
  assert.equal(result.final_runtime_artifact, null);
  const artifact = firstArtifact(result.runtime_artifacts);
  assert.equal(artifact.slot_id, PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_SLOT_ID);
  assert.equal(artifact.execution_mode, 'provider_llm');
  assert.equal(artifact.runtime_failure_code, 'SCHEMA_VALIDATION_FAILED');
  assert.equal(artifact.runtime_status, 'failed_runtime');
  assert.equal(artifact.provider_call_count, 2);
  assert.equal(artifact.retry_attempt_index, 1);
  assert.equal(artifact.warning_codes.includes('RUNTIME_TECHNICAL_RETRY_EXHAUSTED'), true);
  assert.equal(result.operational_telemetry.provider_call_count_consistent, true);
  assert.equal(result.operational_telemetry.retry_exhausted_role_count, 1);
  assert.equal(result.admission_records[0]?.admission_status, 'rejected');
  assertNoNonProviderRuntimeArtifacts(result.runtime_artifacts);
  assertNoLeak(result, [
    'domain_gate_request',
    'create_feasibility_probe_request',
    'create_experiment_plan_light_request',
    'create_validation_cycle_draft_request',
    'feasibility_probe_id',
    'experiment_plan_light_id',
    'validation_cycle_id',
    'queue_action',
  ]);
});

test('L5 cross-board synthesis stress blocks over-budget board context before provider calls', async () => {
  const gateway = new ScriptedLlmGateway(() => crossBoardSynthesisRoleOutput());
  const { crossBoardSynthesisService } = realRuntimeFixture(gateway);
  const largeSourceRefs = Array.from({ length: 1200 }, (_, index) => ref(
    'motive_evidence_board_version',
    `motive_evidence_board_version_${String(index).padStart(4, '0')}_${'x'.repeat(96)}`,
  ));
  const result = await crossBoardSynthesisService.runMergeSplitReuseScenarios(PROJECT_ID, crossBoardSynthesisRequest({
    run_id: 'cross_board_synthesis_l5_over_budget_run_001',
    source_refs: largeSourceRefs,
    source_hashes: largeSourceRefs.map((item) => hash(item.ref_id)),
  }));

  assert.equal(result.status, 'failed_runtime');
  assert.equal(result.provider_call_count, 0);
  assert.equal(gateway.calls.length, 0);
  assert.equal(result.final_runtime_artifact, null);
  const artifact = firstArtifact(result.runtime_artifacts);
  assert.equal(artifact.slot_id, PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_SLOT_ID);
  assert.equal(artifact.runtime_failure_code, 'TOKEN_BUDGET_REQUIRES_COMPRESSION');
  assert.equal(artifact.runtime_status, 'failed_runtime');
  assert.equal(result.admission_records[0]?.admission_status, 'rejected');
  assert.deepEqual(result.admission_records[0]?.issue_codes, ['RUNTIME_STATUS_FAILED_RUNTIME']);
  assertNoNonProviderRuntimeArtifacts(result.runtime_artifacts);
  assertNoLeak(result, [
    'domain_gate_request',
    'create_cross_board_review_request',
    'evidence_transfer_binding_request',
    'motive_portfolio_decision_id',
    'queue_action',
  ]);
});

test('L5 cross-board synthesis compressible over-budget packet context compresses and completes with verifiable lineage', async () => {
  const gateway = new ScriptedLlmGateway(() => crossBoardSynthesisRoleOutput());
  const { crossBoardSynthesisService } = realRuntimeFixture(gateway);
  const baseRequest = crossBoardSynthesisRequest({
    run_id: 'cross_board_synthesis_l5_compression_applied_run_001',
  });
  const result = await crossBoardSynthesisService.runMergeSplitReuseScenarios(PROJECT_ID, {
    ...baseRequest,
    source_context_packets: [fatSourceContextPacket(baseRequest.source_refs[0], 'cross-board synthesis')],
  });

  assertCompressionAppliedRun(result, gateway, PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_SLOT_ID);
  // 'domain_gate_request' is omitted: the passed final payload legitimately carries
  // the no_domain_gate_request guard field, which contains that fragment.
  assertNoLeak(result, [
    'create_cross_board_review_request',
    'motive_portfolio_decision_id',
    'queue_action',
  ]);
});

test('L5 cross-board synthesis provider gateway failure retries once and does not create final, review, transfer, portfolio, queue, or domain-gate payloads', async () => {
  const gateway = new ScriptedLlmGateway((request) => {
    throw new LlmGatewayError('TimeoutError', 'fixture cross-board synthesis provider timeout', {
      telemetry: telemetry(request),
    });
  });
  const { crossBoardSynthesisService } = realRuntimeFixture(gateway);

  const result = await crossBoardSynthesisService.runMergeSplitReuseScenarios(PROJECT_ID, crossBoardSynthesisRequest({
    run_id: 'cross_board_synthesis_l5_provider_failure_run_001',
  }));

  assert.equal(result.status, 'failed_runtime');
  assert.equal(result.provider_call_count, 2);
  assert.equal(gateway.calls.length, 2);
  assert.equal(gateway.calls.every((call) => call.model.profileId === PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_PROFILE_ID), true);
  assert.equal(result.runtime_artifacts.length, 1);
  assert.equal(result.final_runtime_artifact, null);
  const artifact = firstArtifact(result.runtime_artifacts);
  assert.equal(artifact.slot_id, PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_SLOT_ID);
  assert.equal(artifact.execution_mode, 'provider_llm');
  assert.equal(artifact.runtime_failure_code, 'TimeoutError');
  assert.equal(artifact.runtime_status, 'failed_runtime');
  assert.equal(artifact.provider_call_count, 2);
  assert.equal(artifact.retry_attempt_index, 1);
  assert.equal(artifact.warning_codes.includes('RUNTIME_TECHNICAL_RETRY_EXHAUSTED'), true);
  assert.equal(result.operational_telemetry.provider_call_count_consistent, true);
  assert.equal(result.operational_telemetry.retry_exhausted_role_count, 1);
  assert.equal(result.admission_records[0]?.admission_status, 'rejected');
  assertNoNonProviderRuntimeArtifacts(result.runtime_artifacts);
  assertNoLeak(result, [
    'domain_gate_request',
    'create_cross_board_review_request',
    'evidence_transfer_binding_request',
    'motive_portfolio_decision_id',
    'motive_evolution_decision_request',
    'queue_action',
  ]);
});

test('L5 cross-board synthesis missing conflict scenario retries once and does not create final, review, transfer, portfolio, queue, or domain-gate payloads', async () => {
  const gateway = new ScriptedLlmGateway(() => crossBoardSynthesisRoleOutput({
    scenario_proposals: [crossBoardReuseScenarioProposal()],
  }));
  const { crossBoardSynthesisService } = realRuntimeFixture(gateway);

  const result = await crossBoardSynthesisService.runMergeSplitReuseScenarios(PROJECT_ID, crossBoardSynthesisRequest({
    run_id: 'cross_board_synthesis_l5_missing_conflict_scenario_run_001',
  }));

  assert.equal(result.status, 'failed_runtime');
  assert.equal(result.provider_call_count, 2);
  assert.equal(gateway.calls.length, 2);
  assert.equal(result.runtime_artifacts.length, 1);
  assert.equal(result.final_runtime_artifact, null);
  const artifact = firstArtifact(result.runtime_artifacts);
  assert.equal(artifact.slot_id, PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_SLOT_ID);
  assert.equal(artifact.execution_mode, 'provider_llm');
  assert.equal(artifact.runtime_failure_code, 'CROSS_BOARD_SYNTHESIS_CONFLICT_OR_CHALLENGE_SCENARIO_MISSING');
  assert.equal(artifact.runtime_status, 'failed_runtime');
  assert.equal(artifact.provider_call_count, 2);
  assert.equal(artifact.retry_attempt_index, 1);
  assert.equal(artifact.warning_codes.includes('RUNTIME_TECHNICAL_RETRY_EXHAUSTED'), true);
  assert.equal(result.operational_telemetry.provider_call_count_consistent, true);
  assert.equal(result.operational_telemetry.retry_exhausted_role_count, 1);
  assert.equal(result.admission_records[0]?.admission_status, 'rejected');
  assertNoNonProviderRuntimeArtifacts(result.runtime_artifacts);
  assertNoLeak(result, [
    'domain_gate_request',
    'create_cross_board_review_request',
    'evidence_transfer_binding_request',
    'motive_portfolio_decision_id',
    'motive_evolution_decision_request',
    'queue_action',
  ]);
});

test('L5 cross-board synthesis scenario refs outside request-owned sets retry once and does not create final, review, transfer, portfolio, queue, or domain-gate payloads', async () => {
  const gateway = new ScriptedLlmGateway(() => crossBoardSynthesisRoleOutput({
    scenario_proposals: [
      {
        ...crossBoardReuseScenarioProposal(),
        evidence_transfer_binding_refs: [ref('evidence_transfer_binding', 'invented_transfer_binding_l5_001')],
      },
      crossBoardParkScenarioProposal(),
    ],
  }));
  const { crossBoardSynthesisService } = realRuntimeFixture(gateway);

  const result = await crossBoardSynthesisService.runMergeSplitReuseScenarios(PROJECT_ID, crossBoardSynthesisRequest({
    run_id: 'cross_board_synthesis_l5_scenario_refs_outside_request_owned_sets_run_001',
  }));

  assert.equal(result.status, 'failed_runtime');
  assert.equal(result.provider_call_count, 2);
  assert.equal(gateway.calls.length, 2);
  assert.equal(result.runtime_artifacts.length, 1);
  assert.equal(result.final_runtime_artifact, null);
  const artifact = firstArtifact(result.runtime_artifacts);
  assert.equal(artifact.slot_id, PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_SLOT_ID);
  assert.equal(artifact.execution_mode, 'provider_llm');
  assert.equal(artifact.runtime_failure_code, 'CROSS_BOARD_SYNTHESIS_TRANSFER_BINDING_REF_MISMATCH');
  assert.equal(artifact.runtime_status, 'failed_runtime');
  assert.equal(artifact.provider_call_count, 2);
  assert.equal(artifact.retry_attempt_index, 1);
  assert.equal(artifact.warning_codes.includes('RUNTIME_TECHNICAL_RETRY_EXHAUSTED'), true);
  assert.equal(result.operational_telemetry.provider_call_count_consistent, true);
  assert.equal(result.operational_telemetry.retry_exhausted_role_count, 1);
  assert.equal(result.admission_records[0]?.admission_status, 'rejected');
  assertNoNonProviderRuntimeArtifacts(result.runtime_artifacts);
  assertNoLeak(result, [
    'domain_gate_request',
    'create_cross_board_review_request',
    'evidence_transfer_binding_request',
    'motive_portfolio_decision_id',
    'motive_evolution_decision_request',
    'queue_action',
  ]);
});

test('L5 cross-board synthesis memo-like evidence ref blocks before provider calls', async () => {
  const gateway = new ScriptedLlmGateway(() => crossBoardSynthesisRoleOutput());
  const { crossBoardSynthesisService } = realRuntimeFixture(gateway);
  const baseRequest = crossBoardSynthesisRequest({
    run_id: 'cross_board_synthesis_l5_memo_like_ref_run_001',
  });
  const result = await crossBoardSynthesisService.runMergeSplitReuseScenarios(PROJECT_ID, {
    ...baseRequest,
    source_refs: [
      ...baseRequest.source_refs,
      ref('board_summary_memo', 'board_summary_memo_l5_001'),
    ],
    source_hashes: [
      ...baseRequest.source_hashes,
      hash('board-summary-memo-l5-001'),
    ],
  });

  assert.equal(result.status, 'blocked');
  assert.equal(result.provider_call_count, 0);
  assert.equal(gateway.calls.length, 0);
  assert.equal(result.final_runtime_artifact?.runtime_status, 'blocked');
  assert.equal(result.final_admission_record?.admission_status, 'admitted');
  assert.equal(result.blocker_codes.includes('CROSS_BOARD_SYNTHESIS_MEMO_LIKE_REF_REJECTED'), true);
  assertNoNonProviderRuntimeArtifacts(result.runtime_artifacts);
  assertNoLeak(result, [
    'create_domain_gate_request',
    'create_cross_board_review_request',
    'evidence_transfer_binding_request',
    'motive_portfolio_decision_id',
    'queue_action',
  ]);
});

test('L5 cross-board synthesis viable reuse without transfer binding retries once and does not create final, review, transfer, portfolio, queue, or domain-gate payloads', async () => {
  const gateway = new ScriptedLlmGateway(() => crossBoardSynthesisRoleOutput({
    scenario_proposals: [
      {
        ...crossBoardReuseScenarioProposal(),
        evidence_transfer_binding_refs: [],
      },
      crossBoardParkScenarioProposal(),
    ],
  }));
  const { crossBoardSynthesisService } = realRuntimeFixture(gateway);

  const result = await crossBoardSynthesisService.runMergeSplitReuseScenarios(PROJECT_ID, crossBoardSynthesisRequest({
    run_id: 'cross_board_synthesis_l5_viable_reuse_without_transfer_run_001',
  }));

  assert.equal(result.status, 'failed_runtime');
  assert.equal(result.provider_call_count, 2);
  assert.equal(gateway.calls.length, 2);
  assert.equal(result.runtime_artifacts.length, 1);
  assert.equal(result.final_runtime_artifact, null);
  const artifact = firstArtifact(result.runtime_artifacts);
  assert.equal(artifact.slot_id, PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_SLOT_ID);
  assert.equal(artifact.execution_mode, 'provider_llm');
  assert.equal(artifact.runtime_failure_code, 'CROSS_BOARD_SYNTHESIS_REUSE_TRANSFER_BINDING_MISSING');
  assert.equal(artifact.runtime_status, 'failed_runtime');
  assert.equal(artifact.provider_call_count, 2);
  assert.equal(artifact.retry_attempt_index, 1);
  assert.equal(artifact.warning_codes.includes('RUNTIME_TECHNICAL_RETRY_EXHAUSTED'), true);
  assert.equal(result.operational_telemetry.provider_call_count_consistent, true);
  assert.equal(result.operational_telemetry.retry_exhausted_role_count, 1);
  assert.equal(result.admission_records[0]?.admission_status, 'rejected');
  assertNoNonProviderRuntimeArtifacts(result.runtime_artifacts);
  assertNoLeak(result, [
    'domain_gate_request',
    'create_cross_board_review_request',
    'evidence_transfer_binding_request',
    'motive_portfolio_decision_id',
    'motive_evolution_decision_request',
    'queue_action',
  ]);
});

test('L5 evidence-board curation stress blocks over-budget board context before provider calls', async () => {
  const gateway = new ScriptedLlmGateway(() => evidenceBoardCurationRoleOutput());
  const { evidenceBoardCurationService } = realRuntimeFixture(gateway);
  const largeSourceRefs = Array.from({ length: 1200 }, (_, index) => ref(
    'source_locator',
    `source_locator_evidence_board_l5_${String(index).padStart(4, '0')}_${'x'.repeat(96)}`,
  ));
  const result = await evidenceBoardCurationService.runBindingGapCandidates(PROJECT_ID, evidenceBoardCurationRequest({
    run_id: 'evidence_board_curation_l5_over_budget_run_001',
    source_refs: largeSourceRefs,
    source_hashes: largeSourceRefs.map((item) => hash(item.ref_id)),
  }));

  assert.equal(result.status, 'failed_runtime');
  assert.equal(result.provider_call_count, 0);
  assert.equal(gateway.calls.length, 0);
  assert.equal(result.final_runtime_artifact, null);
  const artifact = firstArtifact(result.runtime_artifacts);
  assert.equal(artifact.slot_id, PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_SLOT_ID);
  assert.equal(artifact.runtime_failure_code, 'TOKEN_BUDGET_REQUIRES_COMPRESSION');
  assert.equal(artifact.runtime_status, 'failed_runtime');
  assert.equal(result.admission_records[0]?.admission_status, 'rejected');
  assert.deepEqual(result.admission_records[0]?.issue_codes, ['RUNTIME_STATUS_FAILED_RUNTIME']);
  assertNoNonProviderRuntimeArtifacts(result.runtime_artifacts);
  assertNoLeak(result, evidenceBoardForbiddenWriteFragments());
});

test('L5 evidence-board curation compressible over-budget packet context compresses and completes with verifiable lineage', async () => {
  const gateway = new ScriptedLlmGateway(() => evidenceBoardCurationRoleOutput());
  const { evidenceBoardCurationService } = realRuntimeFixture(gateway);
  const baseRequest = evidenceBoardCurationRequest({
    run_id: 'evidence_board_curation_l5_compression_applied_run_001',
  });
  const result = await evidenceBoardCurationService.runBindingGapCandidates(PROJECT_ID, {
    ...baseRequest,
    source_context_packets: [{
      packet_ref: ref('source_context_packet', 'source_context_packet_evidence_board_l5_fat_001'),
      packet_hash: hash('source-context-packet-evidence-board-l5-fat-001'),
      source_ref: baseRequest.source_refs[0],
      source_hash: baseRequest.source_hashes[0],
      evidence_kind: 'source_locator',
      content_summary: LONG_NEUTRAL_EXCERPT,
      key_facts: [LONG_NEUTRAL_EXCERPT],
      covered_evidence_refs: [],
      covered_source_locator_refs: [ref('source_locator', 'source_locator_evidence_board_l5_001')],
      covered_citation_candidate_refs: [],
      covered_trace_manifest_refs: [],
    }],
  });

  assertCompressionAppliedRun(result, gateway, PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_SLOT_ID);
  assertNoLeak(result, evidenceBoardForbiddenWriteFragments());
});

test('L5 evidence-board curation provider gateway failure retries once and does not create final, board, binding, citation, trace-repair, queue, or domain-gate payloads', async () => {
  const gateway = new ScriptedLlmGateway((request) => {
    throw new LlmGatewayError('TimeoutError', 'fixture evidence-board curation provider timeout', {
      telemetry: telemetry(request),
    });
  });
  const { evidenceBoardCurationService } = realRuntimeFixture(gateway);

  const result = await evidenceBoardCurationService.runBindingGapCandidates(PROJECT_ID, evidenceBoardCurationRequest({
    run_id: 'evidence_board_curation_l5_provider_failure_run_001',
  }));

  assert.equal(result.status, 'failed_runtime');
  assert.equal(result.provider_call_count, 2);
  assert.equal(gateway.calls.length, 2);
  assert.equal(gateway.calls.every((call) => call.model.profileId === PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_PROFILE_ID), true);
  assert.equal(result.runtime_artifacts.length, 1);
  assert.equal(result.final_runtime_artifact, null);
  const artifact = firstArtifact(result.runtime_artifacts);
  assert.equal(artifact.slot_id, PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_SLOT_ID);
  assert.equal(artifact.execution_mode, 'provider_llm');
  assert.equal(artifact.runtime_failure_code, 'TimeoutError');
  assert.equal(artifact.runtime_status, 'failed_runtime');
  assert.equal(artifact.provider_call_count, 2);
  assert.equal(artifact.retry_attempt_index, 1);
  assert.equal(artifact.warning_codes.includes('RUNTIME_TECHNICAL_RETRY_EXHAUSTED'), true);
  assert.equal(result.operational_telemetry.provider_call_count_consistent, true);
  assert.equal(result.operational_telemetry.retry_exhausted_role_count, 1);
  assert.equal(result.admission_records[0]?.admission_status, 'rejected');
  assertNoNonProviderRuntimeArtifacts(result.runtime_artifacts);
  assertNoLeak(result, evidenceBoardForbiddenWriteFragments());
});

test('L5 evidence-board curation missing challenge check retries once and does not create final, board, binding, citation, trace-repair, queue, or domain-gate payloads', async () => {
  const gateway = new ScriptedLlmGateway(() => evidenceBoardCurationRoleOutput({
    binding_candidate_proposals: [{
      ...evidenceBoardBindingCandidateProposal('binding_candidate_l5_001'),
      challenge_check: {
        ...evidenceBoardBindingCandidateProposal('binding_candidate_l5_001').challenge_check,
        memo_or_summary_rejected: false,
      },
    }],
  }));
  const { evidenceBoardCurationService } = realRuntimeFixture(gateway);

  const result = await evidenceBoardCurationService.runBindingGapCandidates(PROJECT_ID, evidenceBoardCurationRequest({
    run_id: 'evidence_board_curation_l5_missing_challenge_run_001',
  }));

  assert.equal(result.status, 'failed_runtime');
  assert.equal(result.provider_call_count, 2);
  assert.equal(gateway.calls.length, 2);
  assert.equal(result.runtime_artifacts.length, 1);
  assert.equal(result.final_runtime_artifact, null);
  const artifact = firstArtifact(result.runtime_artifacts);
  assert.equal(artifact.slot_id, PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_SLOT_ID);
  assert.equal(artifact.execution_mode, 'provider_llm');
  assert.equal(artifact.runtime_failure_code, 'EVIDENCE_BOARD_CURATION_CHALLENGE_CHECK_MISSING');
  assert.equal(artifact.runtime_status, 'failed_runtime');
  assert.equal(artifact.provider_call_count, 2);
  assert.equal(artifact.retry_attempt_index, 1);
  assert.equal(artifact.warning_codes.includes('RUNTIME_TECHNICAL_RETRY_EXHAUSTED'), true);
  assert.equal(result.operational_telemetry.provider_call_count_consistent, true);
  assert.equal(result.operational_telemetry.retry_exhausted_role_count, 1);
  assert.equal(result.admission_records[0]?.admission_status, 'rejected');
  assertNoNonProviderRuntimeArtifacts(result.runtime_artifacts);
  assertNoLeak(result, evidenceBoardForbiddenWriteFragments());
});

test('L5 evidence-board curation viable binding without locator retries once and does not create final, board, binding, citation, trace-repair, queue, or domain-gate payloads', async () => {
  const gateway = new ScriptedLlmGateway(() => evidenceBoardCurationRoleOutput({
    binding_candidate_proposals: [{
      ...evidenceBoardBindingCandidateProposal('binding_candidate_l5_001'),
      source_locator_refs: [],
    }],
  }));
  const { evidenceBoardCurationService } = realRuntimeFixture(gateway);

  const result = await evidenceBoardCurationService.runBindingGapCandidates(PROJECT_ID, evidenceBoardCurationRequest({
    run_id: 'evidence_board_curation_l5_viable_binding_without_locator_run_001',
  }));

  assert.equal(result.status, 'failed_runtime');
  assert.equal(result.provider_call_count, 2);
  assert.equal(gateway.calls.length, 2);
  assert.equal(result.runtime_artifacts.length, 1);
  assert.equal(result.final_runtime_artifact, null);
  const artifact = firstArtifact(result.runtime_artifacts);
  assert.equal(artifact.slot_id, PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_SLOT_ID);
  assert.equal(artifact.execution_mode, 'provider_llm');
  assert.equal(artifact.runtime_failure_code, 'EVIDENCE_BOARD_CURATION_SOURCE_LOCATOR_MISSING');
  assert.equal(artifact.runtime_status, 'failed_runtime');
  assert.equal(artifact.provider_call_count, 2);
  assert.equal(artifact.retry_attempt_index, 1);
  assert.equal(artifact.warning_codes.includes('RUNTIME_TECHNICAL_RETRY_EXHAUSTED'), true);
  assert.equal(result.operational_telemetry.provider_call_count_consistent, true);
  assert.equal(result.operational_telemetry.retry_exhausted_role_count, 1);
  assert.equal(result.admission_records[0]?.admission_status, 'rejected');
  assertNoNonProviderRuntimeArtifacts(result.runtime_artifacts);
  assertNoLeak(result, evidenceBoardForbiddenWriteFragments());
});

test('L5 evidence-board curation duplicate existing binding retries once and does not create final, board, binding, citation, trace-repair, queue, or domain-gate payloads', async () => {
  const gateway = new ScriptedLlmGateway(() => evidenceBoardCurationRoleOutput({
    binding_candidate_proposals: [{
      ...evidenceBoardBindingCandidateProposal('duplicate_existing_bound_evidence_l5_001', {
        evidence_ref: ref('evidence_unit', 'existing_bound_evidence_l5_001'),
      }),
    }],
  }));
  const { evidenceBoardCurationService } = realRuntimeFixture(gateway);

  const result = await evidenceBoardCurationService.runBindingGapCandidates(PROJECT_ID, evidenceBoardCurationRequest({
    run_id: 'evidence_board_curation_l5_duplicate_existing_binding_run_001',
  }));

  assert.equal(result.status, 'failed_runtime');
  assert.equal(result.provider_call_count, 2);
  assert.equal(gateway.calls.length, 2);
  assert.equal(result.runtime_artifacts.length, 1);
  assert.equal(result.final_runtime_artifact, null);
  const artifact = firstArtifact(result.runtime_artifacts);
  assert.equal(artifact.slot_id, PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_SLOT_ID);
  assert.equal(artifact.execution_mode, 'provider_llm');
  assert.equal(artifact.runtime_failure_code, 'EVIDENCE_BOARD_CURATION_DUPLICATE_EXISTING_BINDING');
  assert.equal(artifact.runtime_status, 'failed_runtime');
  assert.equal(artifact.provider_call_count, 2);
  assert.equal(artifact.retry_attempt_index, 1);
  assert.equal(artifact.warning_codes.includes('RUNTIME_TECHNICAL_RETRY_EXHAUSTED'), true);
  assert.equal(result.operational_telemetry.provider_call_count_consistent, true);
  assert.equal(result.operational_telemetry.retry_exhausted_role_count, 1);
  assert.equal(result.admission_records[0]?.admission_status, 'rejected');
  assertNoNonProviderRuntimeArtifacts(result.runtime_artifacts);
  assertNoLeak(result, evidenceBoardForbiddenWriteFragments());
});

test('L5 evidence-board curation candidate refs outside request-owned sets retry once and does not create final, board, binding, citation, trace-repair, queue, or domain-gate payloads', async () => {
  const gateway = new ScriptedLlmGateway(() => evidenceBoardCurationRoleOutput({
    binding_candidate_proposals: [{
      ...evidenceBoardBindingCandidateProposal('binding_candidate_l5_001'),
      target_assertion_ref: ref('motive_assertion', 'invented_assertion_l5_001'),
    }],
  }));
  const { evidenceBoardCurationService } = realRuntimeFixture(gateway);

  const result = await evidenceBoardCurationService.runBindingGapCandidates(PROJECT_ID, evidenceBoardCurationRequest({
    run_id: 'evidence_board_curation_l5_candidate_refs_outside_request_run_001',
  }));

  assert.equal(result.status, 'failed_runtime');
  assert.equal(result.provider_call_count, 2);
  assert.equal(gateway.calls.length, 2);
  assert.equal(result.runtime_artifacts.length, 1);
  assert.equal(result.final_runtime_artifact, null);
  const artifact = firstArtifact(result.runtime_artifacts);
  assert.equal(artifact.slot_id, PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_SLOT_ID);
  assert.equal(artifact.execution_mode, 'provider_llm');
  assert.equal(artifact.runtime_failure_code, 'EVIDENCE_BOARD_CURATION_REF_MISMATCH');
  assert.equal(artifact.runtime_status, 'failed_runtime');
  assert.equal(artifact.provider_call_count, 2);
  assert.equal(artifact.retry_attempt_index, 1);
  assert.equal(artifact.warning_codes.includes('RUNTIME_TECHNICAL_RETRY_EXHAUSTED'), true);
  assert.equal(result.operational_telemetry.provider_call_count_consistent, true);
  assert.equal(result.operational_telemetry.retry_exhausted_role_count, 1);
  assert.equal(result.admission_records[0]?.admission_status, 'rejected');
  assertNoNonProviderRuntimeArtifacts(result.runtime_artifacts);
  assertNoLeak(result, evidenceBoardForbiddenWriteFragments());
});

test('L5 evidence-board curation memo-like evidence ref blocks before provider calls', async () => {
  const gateway = new ScriptedLlmGateway(() => evidenceBoardCurationRoleOutput());
  const { evidenceBoardCurationService } = realRuntimeFixture(gateway);
  const baseRequest = evidenceBoardCurationRequest({
    run_id: 'evidence_board_curation_l5_memo_like_ref_run_001',
  });
  const result = await evidenceBoardCurationService.runBindingGapCandidates(PROJECT_ID, {
    ...baseRequest,
    source_refs: [
      ...baseRequest.source_refs,
      ref('board_summary_memo', 'board_summary_memo_evidence_board_l5_001'),
    ],
    source_hashes: [
      ...baseRequest.source_hashes,
      hash('board-summary-memo-evidence-board-l5-001'),
    ],
  });

  // S2-C C3: preflight blockers are a reviewable blocked final (admitted)
  // with zero provider calls — unified with the other slots.
  assert.equal(result.status, 'blocked');
  assert.equal(result.provider_call_count, 0);
  assert.equal(gateway.calls.length, 0);
  assert.equal(result.runtime_artifacts.length, 2);
  const artifact = firstArtifact(result.runtime_artifacts);
  assert.equal(artifact.slot_id, PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_SLOT_ID);
  assert.equal(artifact.runtime_failure_code, null);
  assert.equal(artifact.runtime_status, 'blocked');
  assert.equal(artifact.executor_kind, 'deterministic_preflight');
  assert.equal(result.final_runtime_artifact?.runtime_status, 'blocked');
  assert.equal(result.final_runtime_artifact?.runtime_failure_code, null);
  assert.equal(result.final_admission_record?.admission_status, 'admitted');
  assert.deepEqual(result.admission_records.map((record) => record.admission_status), ['admitted', 'admitted']);
  assert.equal(result.blocker_codes.includes('EVIDENCE_BOARD_CURATION_MEMO_LIKE_REF_REJECTED'), true);
  assert.equal(result.final_runtime_artifact?.blocker_codes.includes('EVIDENCE_BOARD_CURATION_MEMO_LIKE_REF_REJECTED'), true);
  assertNoNonProviderRuntimeArtifacts(result.runtime_artifacts);
  assertNoLeak(result, evidenceBoardForbiddenWriteFragments());
});

test('L5 evidence-board curation gaps-only disposition parks the coordinator run as waiting_review across the full chain (D2-pre2)', async () => {
  // T-124 D2-pre2 full chain: a provider gaps-only curation output (no viable
  // binding, gap findings present — the gs001 run 006/007 stop shape) flows
  // runtime service → deterministic server-side disposition derivation →
  // admitted-blocked final carrying recommended_disposition='revise' →
  // coordinator board pipeline parks the run as waiting_review (a semantic
  // stop aligned with the lane A skeptic non-proceed park: no decision-queue
  // item, override/re-advance resumes), never the terminal blocked its
  // admitted-blocked status alone would land.
  const gateway = new ScriptedLlmGateway(() => evidenceBoardCurationRoleOutput({
    binding_candidate_proposals: [],
    gap_candidate_proposals: [{
      gap_key: 'gap_duplicate_existing_binding_l5_001',
      target_assertion_ref: ref('motive_assertion', 'assertion_evidence_board_l5_001'),
      gap_kind: 'duplicate_existing_binding',
      missing_evidence_need: 'Independent evidence beyond the already-bound unit is required before a new viable binding exists.',
      source_locator_blockers: [],
      citation_blockers: [],
      freshness_blockers: [],
      recommended_next_gate: 'citation_candidate_review',
      blocker_codes: ['duplicate_existing_binding'],
      warning_codes: [],
    }],
  }));
  const fixture = realRuntimeFixture(gateway);
  const coordinatorRepository = new InMemoryPaperImplementationCoordinatorRepository();
  const harnessRepository = new InMemoryPaperImplementationAiWorkflowHarnessRepository();
  const coordinator = new PaperImplementationRunCoordinatorService({
    coordinatorRepository,
    projectRepository: fixture.projectRepository,
    decisionQueueWriter: {
      enqueueDecisionWorkQueueItem: (item) => harnessRepository.enqueueDecisionWorkQueueItem(item),
    },
    runtimeArtifactReader: {
      findRuntimeArtifactById: (implementationProjectId, runtimeArtifactId) =>
        fixture.repository.findRuntimeArtifactById(implementationProjectId, runtimeArtifactId),
    },
    routePlanningRuntime: fixture.routePlanningService,
    validationCyclePlanningRuntime: fixture.validationCyclePlanningService,
    feasibilityPlanningRuntime: fixture.feasibilityPlanningService,
    motiveDecompositionRuntime: fixture.motiveDecompositionService,
    motiveEvolutionRuntime: fixture.motiveEvolutionService,
    evidenceBoardCurationRuntime: fixture.evidenceBoardCurationService,
    crossBoardSynthesisRuntime: fixture.crossBoardSynthesisService,
    // T-133 confirm-and-continue read-only validators (unused by this lane) —
    // wrapped to the single-method literals the structural guard expects.
    motiveDecisionReader: {
      findMotiveEvolutionDecisionById: (implementationProjectId, decisionId) =>
        new InMemoryPaperImplementationMotiveRepository()
          .findMotiveEvolutionDecisionById(implementationProjectId, decisionId),
    },
    confirmationReader: {
      findHumanConfirmationRecordById: (implementationProjectId, confirmationRecordId) =>
        new InMemoryPaperImplementationHumanConfirmationRepository()
          .findHumanConfirmationRecordById(implementationProjectId, confirmationRecordId),
    },
    idFactory: fixture.idFactory,
    now: () => NOW,
    leaseTtlMs: 60_000,
  });

  // Coordinator-owned fields (run_id / run_mode / execution_mode) stay off the
  // slot payload; the rest is the real provider-shaped curation request.
  const {
    run_id: _runId,
    run_mode: _runMode,
    execution_mode: _executionMode,
    ...curationSlotPayload
  } = evidenceBoardCurationRequest();

  const run = await coordinator.createCoordinatorRun(PROJECT_ID, {
    lane_id: 'evidence-board-curation',
    run_mode: 'product',
    execution_mode: 'provider_llm',
    budget_envelope: { max_steps: 2, max_provider_calls: 4 },
    slot_request_payloads: {
      [PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_SLOT_ID]:
        curationSlotPayload as unknown as Record<string, unknown>,
    },
  });
  const parked = await coordinator.advance(PROJECT_ID, run.coordinator_run_id, {
    holder_id: 'holder_l5_curation_gaps_only_revise',
  });

  assert.equal(gateway.calls.length, 1);
  assert.equal(parked.run.run_status, 'waiting_review');
  assert.equal(parked.steps.length, 1);
  assert.equal(parked.steps[0]?.outcome, 'waiting_review');
  assert.equal(parked.steps[0]?.slot_id, PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_SLOT_ID);
  // The curation final stays admitted-blocked (semantic checks are not
  // loosened by the park) with the server-derived revise disposition.
  const finals = await fixture.repository.listRuntimeArtifacts(PROJECT_ID, {
    slot_id: PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_SLOT_ID,
    artifact_scope: 'final',
  });
  assert.equal(finals.length, 1);
  assert.equal(finals[0]?.runtime_status, 'blocked');
  assert.equal(finals[0]?.artifact_payload.recommended_disposition, 'revise');
  // waiting_review is a semantic stop, not a blocker — no decision-queue item.
  assert.equal((await harnessRepository.listDecisionWorkQueueItems(PROJECT_ID)).length, 0);
});

test('L5 motive decomposition stress blocks over-budget assertion context before provider calls', async () => {
  const gateway = new ScriptedLlmGateway(() => motiveDecompositionRoleOutput());
  const { motiveDecompositionService } = realRuntimeFixture(gateway);
  const result = await motiveDecompositionService.runDraftAssertionCandidates(PROJECT_ID, motiveDecompositionRequest({
    run_id: 'motive_decomposition_l5_over_budget_run_001',
    assertion_context_packets: [{
      packet_ref: ref('assertion_context_packet', 'assertion_context_packet_motive_decomposition_l5_over_budget_001'),
      packet_hash: hash('assertion-context-packet-motive-decomposition-l5-over-budget-001'),
      assertion_ref: ref('motive_assertion', 'assertion_motive_decomposition_l5_001'),
      assertion_hash: hash('assertion-motive-decomposition-l5-001'),
      assertion_text: LONG_NEUTRAL_EXCERPT,
      scope_boundary_summary: 'Only source-backed assertion boundaries are in scope for decomposition.',
      covered_evidence_refs: [ref('evidence_unit', 'evidence_unit_motive_decomposition_l5_001')],
      covered_trace_manifest_refs: [ref('trace_manifest', 'trace_manifest_motive_decomposition_l5_001')],
      covered_source_refs: [ref('source_locator', 'source_locator_motive_decomposition_l5_001')],
    }],
  }));

  assert.equal(result.status, 'failed_runtime');
  assert.equal(result.provider_call_count, 0);
  assert.equal(gateway.calls.length, 0);
  assert.equal(result.final_runtime_artifact, null);
  const artifact = firstArtifact(result.runtime_artifacts);
  assert.equal(artifact.slot_id, PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_SLOT_ID);
  assert.equal(artifact.runtime_failure_code, 'TOKEN_BUDGET_REQUIRES_COMPRESSION');
  assert.equal(artifact.runtime_status, 'failed_runtime');
  assert.equal(result.admission_records[0]?.admission_status, 'rejected');
  assert.deepEqual(result.admission_records[0]?.issue_codes, ['RUNTIME_STATUS_FAILED_RUNTIME']);
  assertNoNonProviderRuntimeArtifacts(result.runtime_artifacts);
  assertNoLeak(result, motiveDecompositionForbiddenWriteFragments());
});

test('L5 motive decomposition provider gateway failure retries once and does not create final, motive, board, trace, queue, or domain-gate payloads', async () => {
  const gateway = new ScriptedLlmGateway((request) => {
    throw new LlmGatewayError('TimeoutError', 'fixture motive decomposition provider timeout', {
      telemetry: telemetry(request),
    });
  });
  const { motiveDecompositionService } = realRuntimeFixture(gateway);

  const result = await motiveDecompositionService.runDraftAssertionCandidates(PROJECT_ID, motiveDecompositionRequest({
    run_id: 'motive_decomposition_l5_provider_failure_run_001',
  }));

  assertMotiveDecompositionRetryFailure(result, gateway, 'TimeoutError');
});

test('L5 motive decomposition missing decomposition check retries once and does not create final, motive, board, trace, queue, or domain-gate payloads', async () => {
  const gateway = new ScriptedLlmGateway(() => motiveDecompositionRoleOutput({
    draft_assertion_candidates: [{
      ...motiveDecompositionDraftAssertionCandidate('split_child_motive_decomposition_l5_001'),
      decomposition_check: null as unknown as PaperImplementationMotiveDecompositionDraftAssertionCandidate['decomposition_check'],
    }],
  }));
  const { motiveDecompositionService } = realRuntimeFixture(gateway);

  const result = await motiveDecompositionService.runDraftAssertionCandidates(PROJECT_ID, motiveDecompositionRequest({
    run_id: 'motive_decomposition_l5_missing_decomposition_check_run_001',
  }));

  assertMotiveDecompositionRetryFailure(result, gateway, 'SCHEMA_VALIDATION_FAILED');
});

test('L5 motive decomposition invalid result status retries once and does not create final, motive, board, trace, queue, or domain-gate payloads', async () => {
  const gateway = new ScriptedLlmGateway(() => motiveDecompositionRoleOutput({
    decomposition_result_status: 'no_decomposition_needed',
    draft_assertion_candidates: [motiveDecompositionDraftAssertionCandidate('split_child_motive_decomposition_l5_001')],
  }));
  const { motiveDecompositionService } = realRuntimeFixture(gateway);

  const result = await motiveDecompositionService.runDraftAssertionCandidates(PROJECT_ID, motiveDecompositionRequest({
    run_id: 'motive_decomposition_l5_invalid_result_status_run_001',
  }));

  assertMotiveDecompositionRetryFailure(result, gateway, 'SCHEMA_VALIDATION_FAILED');
});

test('L5 motive decomposition missing reviewed assertion coverage retries once and does not create final, motive, board, trace, queue, or domain-gate payloads', async () => {
  const gateway = new ScriptedLlmGateway(() => motiveDecompositionRoleOutput({
    reviewed_assertion_refs: [ref('motive_assertion', 'assertion_motive_decomposition_l5_001')],
  }));
  const { motiveDecompositionService } = realRuntimeFixture(gateway);
  const baseRequest = motiveDecompositionRequest({
    run_id: 'motive_decomposition_l5_missing_reviewed_assertion_run_001',
  });

  const result = await motiveDecompositionService.runDraftAssertionCandidates(PROJECT_ID, {
    ...baseRequest,
    target_assertion_refs: [
      ...baseRequest.target_assertion_refs,
      ref('motive_assertion', 'assertion_motive_decomposition_l5_unreviewed_001'),
    ],
    assertion_context_packets: [
      ...baseRequest.assertion_context_packets,
      {
        packet_ref: ref('assertion_context_packet', 'assertion_context_packet_motive_decomposition_l5_unreviewed_001'),
        packet_hash: hash('assertion-context-packet-motive-decomposition-l5-unreviewed-001'),
        assertion_ref: ref('motive_assertion', 'assertion_motive_decomposition_l5_unreviewed_001'),
        assertion_hash: hash('assertion-motive-decomposition-l5-unreviewed-001'),
        assertion_text: 'A second source-backed assertion must be explicitly reviewed before candidate admission.',
        scope_boundary_summary: 'Coverage requires every request-owned assertion context packet to be reviewed.',
        covered_evidence_refs: [ref('evidence_unit', 'evidence_unit_motive_decomposition_l5_001')],
        covered_trace_manifest_refs: [ref('trace_manifest', 'trace_manifest_motive_decomposition_l5_001')],
        covered_source_refs: [ref('source_locator', 'source_locator_motive_decomposition_l5_001')],
      },
    ],
  });

  assertMotiveDecompositionRetryFailure(result, gateway, 'MOTIVE_DECOMPOSITION_REVIEW_SET_MISMATCH');
});

test('L5 motive decomposition candidate refs outside request-owned sets retry once and does not create final, motive, board, trace, queue, or domain-gate payloads', async () => {
  const gateway = new ScriptedLlmGateway(() => motiveDecompositionRoleOutput({
    draft_assertion_candidates: [{
      ...motiveDecompositionDraftAssertionCandidate('split_child_motive_decomposition_l5_001'),
      source_assertion_ref: ref('motive_assertion', 'invented_assertion_motive_decomposition_l5_001'),
    }],
  }));
  const { motiveDecompositionService } = realRuntimeFixture(gateway);

  const result = await motiveDecompositionService.runDraftAssertionCandidates(PROJECT_ID, motiveDecompositionRequest({
    run_id: 'motive_decomposition_l5_candidate_refs_outside_request_run_001',
  }));

  assertMotiveDecompositionRetryFailure(result, gateway, 'MOTIVE_DECOMPOSITION_REF_MISMATCH');
});

test('L5 motive decomposition new-claim risk without human-confirmation gate retries once and does not create final, motive, board, trace, queue, or domain-gate payloads', async () => {
  const baseCandidate = motiveDecompositionDraftAssertionCandidate('split_child_motive_decomposition_l5_001');
  const gateway = new ScriptedLlmGateway(() => motiveDecompositionRoleOutput({
    draft_assertion_candidates: [{
      ...baseCandidate,
      decomposition_check: {
        ...baseCandidate.decomposition_check,
        scope_change_status: 'new_claim_risk',
        new_claim_risk: true,
        human_confirmation_required: false,
        recommended_next_gate: 'motive_assertion_review',
      },
    }],
  }));
  const { motiveDecompositionService } = realRuntimeFixture(gateway);

  const result = await motiveDecompositionService.runDraftAssertionCandidates(PROJECT_ID, motiveDecompositionRequest({
    run_id: 'motive_decomposition_l5_new_claim_without_gate_run_001',
  }));

  assertMotiveDecompositionRetryFailure(result, gateway, 'MOTIVE_DECOMPOSITION_NEW_CLAIM_GATE_MISSING');
});

test('L5 motive decomposition memo-like assertion context blocks before provider calls', async () => {
  const gateway = new ScriptedLlmGateway(() => motiveDecompositionRoleOutput());
  const { motiveDecompositionService } = realRuntimeFixture(gateway);
  const baseRequest = motiveDecompositionRequest({
    run_id: 'motive_decomposition_l5_memo_like_context_run_001',
  });
  const result = await motiveDecompositionService.runDraftAssertionCandidates(PROJECT_ID, {
    ...baseRequest,
    source_refs: [
      ...baseRequest.source_refs,
      ref('assertion_summary_memo', 'assertion_summary_memo_motive_decomposition_l5_001'),
    ],
    source_hashes: [
      ...baseRequest.source_hashes,
      hash('assertion-summary-memo-motive-decomposition-l5-001'),
    ],
  });

  // S2-C C3: preflight blockers are a reviewable blocked final (admitted)
  // with zero provider calls — unified with the other slots.
  assert.equal(result.status, 'blocked');
  assert.equal(result.provider_call_count, 0);
  assert.equal(gateway.calls.length, 0);
  assert.equal(result.runtime_artifacts.length, 2);
  const artifact = firstArtifact(result.runtime_artifacts);
  assert.equal(artifact.slot_id, PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_SLOT_ID);
  assert.equal(artifact.runtime_failure_code, null);
  assert.equal(artifact.runtime_status, 'blocked');
  assert.equal(artifact.executor_kind, 'deterministic_preflight');
  assert.equal(result.final_runtime_artifact?.runtime_status, 'blocked');
  assert.equal(result.final_runtime_artifact?.runtime_failure_code, null);
  assert.equal(result.final_admission_record?.admission_status, 'admitted');
  assert.deepEqual(result.admission_records.map((record) => record.admission_status), ['admitted', 'admitted']);
  assert.equal(result.blocker_codes.includes('MOTIVE_DECOMPOSITION_MEMO_LIKE_REF_REJECTED'), true);
  assert.equal(result.final_runtime_artifact?.blocker_codes.includes('MOTIVE_DECOMPOSITION_MEMO_LIKE_REF_REJECTED'), true);
  assertNoNonProviderRuntimeArtifacts(result.runtime_artifacts);
  assertNoLeak(result, motiveDecompositionForbiddenWriteFragments());
});

test('L5 motive evolution stress blocks over-budget motive context before provider calls', async () => {
  const gateway = new ScriptedLlmGateway((request) => motiveEvolutionWire(motiveEvolutionRoleOutput(request)));
  const { motiveEvolutionService } = realRuntimeFixture(gateway);
  const baseRequest = motiveEvolutionRequest({
    run_id: 'motive_evolution_l5_over_budget_run_001',
  });
  const basePacket = baseRequest.motive_context_packets?.[0];
  assert.ok(basePacket);

  const result = await motiveEvolutionService.runEvolutionDecisionSupport(PROJECT_ID, {
    ...baseRequest,
    motive_context_packets: [{
      ...basePacket,
      packet_ref: ref('motive_context_packet', 'motive_context_packet_motive_evolution_l5_over_budget_001'),
      packet_hash: hash('motive-context-packet-motive-evolution-l5-over-budget-001'),
      content_summary: LONG_NEUTRAL_EXCERPT,
      key_facts: [LONG_NEUTRAL_EXCERPT],
    }],
  });

  assert.equal(result.status, 'failed_runtime');
  assert.equal(result.provider_call_count, 0);
  assert.equal(gateway.calls.length, 0);
  assert.equal(result.final_runtime_artifact, null);
  const artifact = firstArtifact(result.runtime_artifacts);
  assert.equal(artifact.slot_id, PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_SLOT_ID);
  assert.equal(artifact.runtime_failure_code, 'TOKEN_BUDGET_REQUIRES_COMPRESSION');
  assert.equal(artifact.runtime_status, 'failed_runtime');
  assert.equal(result.admission_records[0]?.admission_status, 'rejected');
  assert.deepEqual(result.admission_records[0]?.issue_codes, ['RUNTIME_STATUS_FAILED_RUNTIME']);
  assertNoNonProviderRuntimeArtifacts(result.runtime_artifacts);
  assertNoLeak(result, motiveEvolutionForbiddenWriteFragments());
});

test('L5 motive evolution provider gateway failure retries once and does not create final, motive, portfolio, board, trace, queue, or domain-gate payloads', async () => {
  const gateway = new ScriptedLlmGateway((request) => {
    throw new LlmGatewayError('TimeoutError', 'fixture motive evolution provider timeout', {
      telemetry: telemetry(request),
    });
  });
  const { motiveEvolutionService } = realRuntimeFixture(gateway);

  const result = await motiveEvolutionService.runEvolutionDecisionSupport(PROJECT_ID, motiveEvolutionRequest({
    run_id: 'motive_evolution_l5_provider_failure_run_001',
  }));

  assertMotiveEvolutionRetryFailure(result, gateway, 'TimeoutError', 2, 1);
});

test('L5 motive evolution missing challenger coverage retries once and does not create final, motive, portfolio, board, trace, queue, or domain-gate payloads', async () => {
  const gateway = new ScriptedLlmGateway((request) => {
    if (request.executionContext.operation === PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_RISK_CHALLENGER_ROLE_SLOT_ID) {
      return motiveEvolutionWire(motiveEvolutionRiskChallengerRoleOutput(motiveEvolutionPriorFromGatewayRequest(request), {
        challenged_option_keys: ['evolution_option_l5_001'],
        decision_options: motiveEvolutionDecisionOptionsByKey('evolution_option_l5_001'),
      }));
    }
    return motiveEvolutionWire(motiveEvolutionDesignerRoleOutput({
      designed_options: {
        ...motiveEvolutionDesignedOptionsByKey('evolution_option_l5_001'),
        ...motiveEvolutionDesignedOptionsByKey('evolution_option_l5_002'),
      },
    }));
  });
  const { motiveEvolutionService } = realRuntimeFixture(gateway);

  const result = await motiveEvolutionService.runEvolutionDecisionSupport(PROJECT_ID, motiveEvolutionRequest({
    run_id: 'motive_evolution_l5_missing_challenger_coverage_run_001',
  }));

  assertMotiveEvolutionRetryFailure(
    result,
    gateway,
    'MOTIVE_EVOLUTION_CHALLENGE_COVERAGE_MISSING',
    3,
    2,
  );
});

test('L5 motive evolution option-set drift retries once and does not create final, motive, portfolio, board, trace, queue, or domain-gate payloads', async () => {
  const gateway = new ScriptedLlmGateway((request) => {
    if (request.executionContext.operation === PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_RISK_CHALLENGER_ROLE_SLOT_ID) {
      return motiveEvolutionWire(motiveEvolutionRiskChallengerRoleOutput(motiveEvolutionPriorFromGatewayRequest(request), {
        option_set_hash: hash('motive-evolution-l5-option-set-drift'),
      }));
    }
    return motiveEvolutionWire(motiveEvolutionDesignerRoleOutput());
  });
  const { motiveEvolutionService } = realRuntimeFixture(gateway);

  const result = await motiveEvolutionService.runEvolutionDecisionSupport(PROJECT_ID, motiveEvolutionRequest({
    run_id: 'motive_evolution_l5_option_set_drift_run_001',
  }));

  assertMotiveEvolutionRetryFailure(result, gateway, 'MOTIVE_EVOLUTION_OPTION_SET_MISMATCH', 3, 2);
});

test('L5 motive evolution writer-shaped payload retries once and does not create final, motive, portfolio, board, trace, queue, or domain-gate payloads', async () => {
  const gateway = new ScriptedLlmGateway((request) => {
    if (request.executionContext.operation === PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_RISK_CHALLENGER_ROLE_SLOT_ID) {
      return {
        ...motiveEvolutionWire(motiveEvolutionRiskChallengerRoleOutput(motiveEvolutionPriorFromGatewayRequest(request))),
        motive_evolution_decision_request: {
          target_core_motive_version_id: 'core_motive_version_motive_evolution_l5_001',
        },
      } as unknown as PaperImplementationMotiveEvolutionRiskChallengerRoleOutput;
    }
    return motiveEvolutionWire(motiveEvolutionDesignerRoleOutput());
  });
  const { motiveEvolutionService } = realRuntimeFixture(gateway);

  const result = await motiveEvolutionService.runEvolutionDecisionSupport(PROJECT_ID, motiveEvolutionRequest({
    run_id: 'motive_evolution_l5_writer_payload_run_001',
  }));

  assertMotiveEvolutionRetryFailure(result, gateway, 'SCHEMA_VALIDATION_FAILED', 3, 2);
});

test('L5 motive evolution portfolio-changing option without human-confirmation gate retries once and does not create final, motive, portfolio, board, trace, queue, or domain-gate payloads', async () => {
  const gateway = new ScriptedLlmGateway(() => motiveEvolutionWire(motiveEvolutionDesignerRoleOutput({
    designed_options: motiveEvolutionDesignedOptionsByKey('evolution_option_l5_001', {
      option_kind: 'supersede',
      portfolio_impact_class: 'semantic_version_change',
      human_confirmation_required: false,
      recommended_next_gate: 'evidence_board_curation',
    }),
  })));
  const { motiveEvolutionService } = realRuntimeFixture(gateway);

  const result = await motiveEvolutionService.runEvolutionDecisionSupport(PROJECT_ID, motiveEvolutionRequest({
    run_id: 'motive_evolution_l5_portfolio_change_without_gate_run_001',
  }));

  assertMotiveEvolutionRetryFailure(result, gateway, 'SCHEMA_VALIDATION_FAILED', 2, 1);
});

test('L5 motive evolution blocked challenge without reason retries once and does not create final, motive, portfolio, board, trace, queue, or domain-gate payloads', async () => {
  const gateway = new ScriptedLlmGateway((request) => {
    if (request.executionContext.operation === PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_RISK_CHALLENGER_ROLE_SLOT_ID) {
      return motiveEvolutionWire(motiveEvolutionRiskChallengerRoleOutput(motiveEvolutionPriorFromGatewayRequest(request), {
        decision_options: motiveEvolutionDecisionOptionsByKey('evolution_option_l5_001', {
          challenge_check: motiveEvolutionChallengeCheck({
            evidence_status: 'blocked',
            blocking_reason_codes: [],
          }),
        }),
      }));
    }
    return motiveEvolutionWire(motiveEvolutionDesignerRoleOutput());
  });
  const { motiveEvolutionService } = realRuntimeFixture(gateway);

  const result = await motiveEvolutionService.runEvolutionDecisionSupport(PROJECT_ID, motiveEvolutionRequest({
    run_id: 'motive_evolution_l5_blocked_challenge_without_reason_run_001',
  }));

  // T-124 G4.6 Fix 2: the challenge_check linkage moved from the wire schema
  // (opaque all-or-nothing SCHEMA_VALIDATION_FAILED) to the service semantic
  // layer — same invariant, actionable code, same bounded retry.
  assertMotiveEvolutionRetryFailure(result, gateway, 'MOTIVE_EVOLUTION_BOUNDARY_BLOCKER_MISSING', 3, 2);
});

test('L5 motive evolution challenge reason codes without any blocked status retry once and fail closed (G4.6 Fix 2 inverse link)', async () => {
  const gateway = new ScriptedLlmGateway((request) => {
    if (request.executionContext.operation === PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_RISK_CHALLENGER_ROLE_SLOT_ID) {
      return motiveEvolutionWire(motiveEvolutionRiskChallengerRoleOutput(motiveEvolutionPriorFromGatewayRequest(request), {
        decision_options: motiveEvolutionDecisionOptionsByKey('evolution_option_l5_001', {
          challenge_check: motiveEvolutionChallengeCheck({
            blocking_reason_codes: ['residual_risk_without_blocked_status'],
          }),
        }),
      }));
    }
    return motiveEvolutionWire(motiveEvolutionDesignerRoleOutput());
  });
  const { motiveEvolutionService } = realRuntimeFixture(gateway);

  const result = await motiveEvolutionService.runEvolutionDecisionSupport(PROJECT_ID, motiveEvolutionRequest({
    run_id: 'motive_evolution_l5_dangling_reason_codes_run_001',
  }));

  assertMotiveEvolutionRetryFailure(result, gateway, 'MOTIVE_EVOLUTION_CHALLENGE_CHECK_INCONSISTENT', 3, 2);
});

test('L5 motive evolution memo-like motive context blocks before provider calls', async () => {
  const gateway = new ScriptedLlmGateway((request) => motiveEvolutionWire(motiveEvolutionRoleOutput(request)));
  const { motiveEvolutionService } = realRuntimeFixture(gateway);
  const baseRequest = motiveEvolutionRequest({
    run_id: 'motive_evolution_l5_memo_like_context_run_001',
  });
  const result = await motiveEvolutionService.runEvolutionDecisionSupport(PROJECT_ID, {
    ...baseRequest,
    source_refs: [
      ...baseRequest.source_refs,
      ref('motive_summary_memo', 'motive_summary_memo_motive_evolution_l5_001'),
    ],
    source_hashes: [
      ...baseRequest.source_hashes,
      hash('motive-summary-memo-motive-evolution-l5-001'),
    ],
  });

  // S2-C C3: preflight blockers are a reviewable blocked final (admitted)
  // with zero provider calls — unified with the other slots.
  assert.equal(result.status, 'blocked');
  assert.equal(result.provider_call_count, 0);
  assert.equal(gateway.calls.length, 0);
  assert.equal(result.runtime_artifacts.length, 2);
  const artifact = firstArtifact(result.runtime_artifacts);
  assert.equal(artifact.slot_id, PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_SLOT_ID);
  assert.equal(artifact.runtime_failure_code, null);
  assert.equal(artifact.runtime_status, 'blocked');
  assert.equal(artifact.executor_kind, 'deterministic_preflight');
  assert.equal(result.final_runtime_artifact?.runtime_status, 'blocked');
  assert.equal(result.final_runtime_artifact?.runtime_failure_code, null);
  assert.equal(result.final_admission_record?.admission_status, 'admitted');
  assert.deepEqual(result.admission_records.map((record) => record.admission_status), ['admitted', 'admitted']);
  assert.equal(result.blocker_codes.includes('MOTIVE_EVOLUTION_MEMO_LIKE_REF_REJECTED'), true);
  assert.equal(result.final_runtime_artifact?.blocker_codes.includes('MOTIVE_EVOLUTION_MEMO_LIKE_REF_REJECTED'), true);
  assertNoNonProviderRuntimeArtifacts(result.runtime_artifacts);
  assertNoLeak(result, motiveEvolutionForbiddenWriteFragments());
});

test('L5 motive evolution provider wire entries complete the two-role chain with canonical option maps', async () => {
  // T-124 S3-β1 (gs001-lora-live-004 fix): the provider path validates wire
  // entry arrays through the REAL orchestrator ajv gate against the wire
  // schemas, and the service canonicalizes them back into by-key option maps
  // before recording — no wire residue in any persisted artifact.
  const gateway = new ScriptedLlmGateway((request) => motiveEvolutionWire(motiveEvolutionRoleOutput(request)));
  const { motiveEvolutionService } = realRuntimeFixture(gateway);

  const result = await motiveEvolutionService.runEvolutionDecisionSupport(PROJECT_ID, motiveEvolutionRequest({
    run_id: 'motive_evolution_l5_wire_roundtrip_run_001',
  }));

  assert.equal(result.status, 'passed');
  assert.equal(result.provider_call_count, 2);
  assert.equal(gateway.calls.length, 2);
  assert.deepEqual(
    gateway.calls.map((call) => call.schemaName),
    [
      'paper_implementation_motive_evolution_option_designer_wire',
      'paper_implementation_motive_evolution_risk_challenger_wire',
    ],
  );
  const designerRoleArtifact = firstArtifact(result.runtime_artifacts);
  const designerRoleOutput = (designerRoleArtifact.artifact_payload as { role_output?: Record<string, unknown> }).role_output;
  assert.deepEqual(
    Object.keys((designerRoleOutput?.designed_options ?? {}) as Record<string, unknown>),
    ['evolution_option_l5_001'],
  );
  assert.equal('designed_option_entries' in (designerRoleOutput ?? {}), false);
  const finalPayload = result.final_runtime_artifact?.artifact_payload as {
    decision_options?: Record<string, Record<string, unknown>>;
  };
  assert.deepEqual(Object.keys(finalPayload.decision_options ?? {}), ['evolution_option_l5_001']);
  assert.equal('option_key' in (finalPayload.decision_options?.evolution_option_l5_001 ?? {}), false);
  assert.equal(
    JSON.stringify(result.runtime_artifacts.map((artifact) => artifact.artifact_payload)).includes('option_entries'),
    false,
  );
  assert.equal(result.final_admission_record?.admission_status, 'admitted');
  assertNoNonProviderRuntimeArtifacts(result.runtime_artifacts);
  assertNoLeak(result, motiveEvolutionForbiddenWriteFragments());
});

test('L5 motive evolution legacy by-key option-map provider output fails closed as schema-validation retry exhausted', async () => {
  // T-124 S3-β1 reproduction pin (run gs001-lora-live-004, step
  // motive_evolution, blockers=[SCHEMA_VALIDATION_FAILED], 3 provider calls):
  // before the wire encoding, OpenAI strict mode degraded the by-key option
  // maps to always-empty objects, so an options-proposing provider output
  // could only ever arrive in the canonical map shape with an empty map —
  // and any canonical-map-shaped output remains invalid on the wire schema.
  // Designer succeeds on the wire; the challenger replays the legacy map
  // shape and must fail closed exactly like the live run.
  const gateway = new ScriptedLlmGateway((request) => {
    if (request.executionContext.operation === PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_RISK_CHALLENGER_ROLE_SLOT_ID) {
      return {
        ...motiveEvolutionRiskChallengerRoleOutput(motiveEvolutionPriorFromGatewayRequest(request)),
        challenged_option_keys: [],
        decision_options: {},
      };
    }
    return motiveEvolutionWire(motiveEvolutionDesignerRoleOutput());
  });
  const { motiveEvolutionService } = realRuntimeFixture(gateway);

  const result = await motiveEvolutionService.runEvolutionDecisionSupport(PROJECT_ID, motiveEvolutionRequest({
    run_id: 'motive_evolution_l5_legacy_option_map_run_001',
  }));

  assertMotiveEvolutionRetryFailure(result, gateway, 'SCHEMA_VALIDATION_FAILED', 3, 2);
});

test('L5 P1 current-role retry does not rerun admitted prior roles', async () => {
  let evidenceSkepticAttempts = 0;
  const gateway = new ScriptedLlmGateway((request) => {
    if (request.executionContext.operation === 'claim_boundary_review.evidence_skeptic') {
      evidenceSkepticAttempts += 1;
      if (evidenceSkepticAttempts === 1) {
        throw new LlmGatewayError('TimeoutError', 'fixture P1 current-role transient timeout', {
          telemetry: telemetry(request),
        });
      }
    }
    // T-124 S3 F5-1: provider mode validates against the wire schema.
    return p1WireRoleOutput(request.executionContext.operation);
  });
  const { p1Service } = realRuntimeFixture(gateway);

  const result = await p1Service.runClaimBoundaryDebate(PROJECT_ID, p1Request('claim', {
    run_id: 'p1_l5_current_role_retry_run_001',
  }));

  assert.equal(result.status, 'passed');
  assert.equal(result.provider_call_count, 4);
  assert.deepEqual(gateway.calls.map((call) => call.executionContext.operation), [
    'claim_boundary_review.boundary_critic',
    'claim_boundary_review.evidence_skeptic',
    'claim_boundary_review.evidence_skeptic',
    'claim_boundary_review.adjudicator_final',
  ]);
  assert.equal(gateway.calls.every((call) => call.model.profileId === PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_PROFILE_ID), true);
  assert.equal(gateway.calls[1]?.executionContext.metadata?.model_option_id, gateway.calls[2]?.executionContext.metadata?.model_option_id);
  assert.deepEqual(gateway.calls[1]?.prompt, gateway.calls[2]?.prompt);
  assert.deepEqual(gateway.calls[1]?.messages, gateway.calls[2]?.messages);
  assert.match(gateway.calls[2]?.executionContext.traceId ?? '', /\.retry-1$/u);
  const roleArtifacts = result.runtime_artifacts.filter((artifact) => artifact.artifact_scope === 'role');
  assert.equal(roleArtifacts.length, 3);
  assert.deepEqual(roleArtifacts.map((artifact) => artifact.retry_attempt_index), [0, 1, 0]);
  assert.deepEqual(roleArtifacts.map((artifact) => artifact.provider_call_count), [1, 2, 1]);
  assert.equal(roleArtifacts[1]?.warning_codes.includes('RUNTIME_TECHNICAL_RETRY_RECOVERED'), true);
  assert.equal(result.operational_telemetry.provider_call_count_consistent, true);
  assert.equal(result.operational_telemetry.role_provider_call_count, 4);
  assert.equal(result.operational_telemetry.final_provider_call_count, 4);
  assert.equal(result.operational_telemetry.retry_attempted_role_count, 1);
  assert.equal(result.operational_telemetry.retry_recovered_role_count, 1);
  assert.equal(result.operational_telemetry.retry_exhausted_role_count, 0);
  assert.equal(result.operational_telemetry.rejected_admission_count, 0);
  assert.equal(result.operational_telemetry.non_provider_artifact_count, 0);
  assert.equal(result.final_admission_record?.admission_status, 'admitted');
  assertNoNonProviderRuntimeArtifacts(result.runtime_artifacts);
});

test('L5 P1 schema-invalid provider output retries once and does not create final or domain-gate payloads', async () => {
  const gateway = new ScriptedLlmGateway((request) => ({
    role_slot_id: request.executionContext.operation,
  }));
  const { p1Service } = realRuntimeFixture(gateway);

  const result = await p1Service.runClaimBoundaryDebate(PROJECT_ID, p1Request('claim', {
    run_id: 'p1_l5_schema_invalid_output_run_001',
  }));

  assert.equal(result.status, 'failed_runtime');
  assert.equal(result.provider_call_count, 2);
  assert.equal(gateway.calls.length, 2);
  assert.equal(result.runtime_artifacts.length, 1);
  assert.equal(result.final_runtime_artifact, null);
  const artifact = firstArtifact(result.runtime_artifacts);
  assert.equal(artifact.execution_mode, 'provider_llm');
  assert.equal(artifact.runtime_failure_code, 'SCHEMA_VALIDATION_FAILED');
  assert.equal(artifact.runtime_status, 'failed_runtime');
  assert.equal(artifact.provider_call_count, 2);
  assert.equal(artifact.retry_attempt_index, 1);
  assert.equal(artifact.warning_codes.includes('RUNTIME_TECHNICAL_RETRY_EXHAUSTED'), true);
  assert.equal(result.operational_telemetry.provider_call_count_consistent, true);
  assert.equal(result.operational_telemetry.retry_exhausted_role_count, 1);
  assert.deepEqual(result.operational_telemetry.runtime_failure_codes, ['SCHEMA_VALIDATION_FAILED']);
  assert.deepEqual(result.operational_telemetry.admission_issue_codes, ['RUNTIME_STATUS_FAILED_RUNTIME']);
  assert.equal(result.admission_records[0]?.admission_status, 'rejected');
  assertNoNonProviderRuntimeArtifacts(result.runtime_artifacts);
  assertNoLeak(result, ['domain_gate_request']);
});

function implementationProjectFixture(
  lifecycleStatus: ImplementationProject['lifecycle_status'] = 'active',
): ImplementationProject {
  return {
    implementation_project_id: PROJECT_ID,
    intake_snapshot_id: `${PROJECT_ID}_intake_snapshot`,
    workspace_id: 'workspace_001',
    title_card_id: TITLE_CARD_ID,
    paper_project_bridge_id: `${PROJECT_ID}_bridge`,
    bridge_payload_hash: 'bridge_payload_hash_001',
    target_paper_project_ref: null,
    lifecycle_status: lifecycleStatus,
    freshness_status: 'fresh',
    source_status: 'active',
    version_number: 1,
    policy_version_id: 'policy_v1',
    created_by: 'system',
    created_at: NOW,
    updated_at: NOW,
  };
}

function projectRepositoryFixture(
  project: ImplementationProject | null,
): InMemoryPaperImplementationRepository {
  const repository = new InMemoryPaperImplementationRepository();
  if (project) {
    void repository.createBootstrap({
      implementation_project: project,
      intake_snapshot: {
        intake_snapshot_id: project.intake_snapshot_id,
        implementation_project_id: project.implementation_project_id,
        workspace_id: project.workspace_id,
        title_card_id: project.title_card_id,
        paper_project_bridge_id: project.paper_project_bridge_id,
        paper_project_bridge_ref: {
          ref_type: 'paper_project_bridge',
          ref_id: project.paper_project_bridge_id,
          title_card_id: project.title_card_id,
          version_id: null,
        },
        bridge_payload_hash: project.bridge_payload_hash,
        promotion_decision_id: 'promotion_decision_001',
        promotion_decision_ref: {
          ref_type: 'promotion_decision',
          ref_id: 'promotion_decision_001',
          title_card_id: project.title_card_id,
          version_id: null,
        },
        promotion_commitment_profile_id: 'promotion_commitment_profile_001',
        promotion_commitment_profile_ref: {
          ref_type: 'promotion_commitment_profile',
          ref_id: 'promotion_commitment_profile_001',
          title_card_id: project.title_card_id,
          version_id: null,
        },
        promotion_input_snapshot_id: 'promotion_input_snapshot_001',
        promotion_input_snapshot_ref: {
          ref_type: 'promotion_input_snapshot',
          ref_id: 'promotion_input_snapshot_001',
          title_card_id: project.title_card_id,
          version_id: null,
        },
        promotion_input_snapshot_hash: 'promotion_input_snapshot_hash_001',
        topic_package_id: 'topic_package_001',
        package_version: 'v1',
        source_status: 'active',
        snapshot_hashes: {
          bundle_hash: 'bundle_hash_001',
          package_snapshot_hash: 'package_snapshot_hash_001',
          package_draft_input_snapshot_hash: 'package_draft_input_snapshot_hash_001',
          promotion_input_snapshot_hash: 'promotion_input_snapshot_hash_001',
        },
        source_refs: [],
        accepted_risk_refs: [],
        condition_refs: [],
        early_check_obligations: [],
        working_copy_payload: {
          editable_title: 'Working paper title',
          problem_statement: 'Problem statement.',
          contribution_summary: 'Contribution summary.',
          evaluation_plan: 'Evaluation plan.',
          initial_planning_notes: [],
          claim_ceiling: 'Bounded claim ceiling.',
          prohibited_claims: [],
          conditions: [],
          accepted_risk_refs: [],
          early_check_obligations: [],
          source_lineage_summary: {},
        },
        working_copy_payload_hash: 'working_copy_payload_hash_001',
        source_handoff: {} as never,
        target_paper_project_ref: null,
        intake_snapshot_hash: 'intake_snapshot_hash_001',
        policy_version_id: 'policy_v1',
        created_by: 'system',
        created_at: NOW,
      },
    });
  }
  return repository;
}

function realRuntimeFixture(gateway: TopicSelectionAgentOrchestratorLlmGateway) {
  const repository = new InMemoryPaperImplementationRuntimeRepository();
  let sequence = 0;
  const idFactory = (prefix: string) => `${prefix}_${++sequence}`;
  const runtimeAdmission = new PaperImplementationRuntimeAdmissionService({
    repository,
    idFactory,
    now: () => NOW,
  });
  const projectRepository = projectRepositoryFixture(implementationProjectFixture());
  const controlPlaneRepository = new InMemoryTopicSelectionControlPlaneRepository();
  const controlPlane = new TopicSelectionControlPlaneService(controlPlaneRepository, {
    idFactory,
    now: () => NOW,
  });
  const orchestrator = new TopicSelectionAgentOrchestratorService({
    controlPlane,
    llmGateway: gateway,
    now: () => NOW,
  });
  return {
    repository,
    runtimeAdmission,
    projectRepository,
    idFactory,
    traceService: new PaperImplementationTraceIntegrityDebateRuntimeService({
      projectRepository,
      runtimeAdmission,
      agentOrchestrator: orchestrator,
      idFactory,
      now: () => NOW,
    }),
    p1Service: new PaperImplementationP1RuntimeReviewService({
      projectRepository,
      runtimeAdmission,
      agentOrchestrator: orchestrator,
      idFactory,
      now: () => NOW,
    }),
    resultAnalysisService: new PaperImplementationResultAnalysisRuntimeService({
      projectRepository,
      runtimeAdmission,
      agentOrchestrator: orchestrator,
      idFactory,
      now: () => NOW,
    }),
    experimentPlanningService: new PaperImplementationExperimentPlanningRuntimeService({
      projectRepository,
      runtimeAdmission,
      agentOrchestrator: orchestrator,
      idFactory,
      now: () => NOW,
    }),
    routePlanningService: new PaperImplementationRoutePlanningRuntimeService({
      projectRepository,
      runtimeAdmission,
      agentOrchestrator: orchestrator,
      idFactory,
      now: () => NOW,
    }),
    validationCyclePlanningService: new PaperImplementationValidationCyclePlanningRuntimeService({
      projectRepository,
      runtimeAdmission,
      agentOrchestrator: orchestrator,
      idFactory,
      now: () => NOW,
    }),
    feasibilityPlanningService: new PaperImplementationFeasibilityPlanningRuntimeService({
      projectRepository,
      runtimeAdmission,
      agentOrchestrator: orchestrator,
      idFactory,
      now: () => NOW,
    }),
    crossBoardSynthesisService: new PaperImplementationCrossBoardSynthesisRuntimeService({
      projectRepository,
      runtimeAdmission,
      agentOrchestrator: orchestrator,
      idFactory,
      now: () => NOW,
    }),
    evidenceBoardCurationService: new PaperImplementationEvidenceBoardCurationRuntimeService({
      projectRepository,
      runtimeAdmission,
      agentOrchestrator: orchestrator,
      idFactory,
      now: () => NOW,
    }),
    motiveDecompositionService: new PaperImplementationMotiveDecompositionRuntimeService({
      projectRepository,
      runtimeAdmission,
      agentOrchestrator: orchestrator,
      idFactory,
      now: () => NOW,
    }),
    motiveEvolutionService: new PaperImplementationMotiveEvolutionRuntimeService({
      projectRepository,
      runtimeAdmission,
      agentOrchestrator: orchestrator,
      idFactory,
      now: () => NOW,
    }),
  };
}

function l5LineageSeedOptions(fixture: {
  runtimeAdmission: PaperImplementationRuntimeAdmissionService;
  projectRepository: InMemoryPaperImplementationRepository;
  idFactory: (prefix: string) => string;
}) {
  return {
    projectRepository: fixture.projectRepository,
    runtimeAdmission: fixture.runtimeAdmission,
    implementationProjectId: PROJECT_ID,
    titleCardId: TITLE_CARD_ID,
    idFactory: fixture.idFactory,
    now: () => NOW,
    runIdPrefix: 'l5_lineage_seed',
    reviewedRouteCandidateKey: 'exploratory_route_candidate_l5',
    reviewedCycleCandidateKey: 'exploratory_cycle_candidate_l5',
  };
}

function stubbedP1RuntimeFixture(orchestrator: CompressionP1AgentOrchestrator) {
  const repository = new InMemoryPaperImplementationRuntimeRepository();
  let sequence = 0;
  const idFactory = (prefix: string) => `${prefix}_${++sequence}`;
  const runtimeAdmission = new PaperImplementationRuntimeAdmissionService({
    repository,
    idFactory,
    now: () => NOW,
  });
  const projectRepository = projectRepositoryFixture(implementationProjectFixture());
  return {
    repository,
    p1Service: new PaperImplementationP1RuntimeReviewService({
      projectRepository,
      runtimeAdmission,
      agentOrchestrator: orchestrator,
      idFactory,
      now: () => NOW,
    }),
  };
}

function traceRequest(
  overrides: {
    run_id?: string;
    source_excerpt?: string;
  } = {},
): RunPaperImplementationTraceIntegrityDebateRuntimeRequest {
  const sourceExcerpt = overrides.source_excerpt
    ?? 'accuracy improved against the configured baseline';
  const sourceHash = hash(sourceExcerpt);
  return {
    run_id: overrides.run_id ?? 'trace_l5_run_001',
    run_mode: 'product',
    execution_mode: 'provider_llm',
    model_profile_id: PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_PROFILE_ID,
    model_option_id: `${PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_PROFILE_ID}.openai-balanced`,
    target_ref: ref('claim_candidate', 'claim_candidate_l5_001'),
    target_version_id: 'claim_candidate_l5_001@v1',
    input_snapshot_ref: ref('implementation_input_snapshot', 'input_snapshot_l5_001'),
    input_snapshot_hash: hash('input-snapshot-l5'),
    reviewed_statement_packet_ref: ref('trace_reviewed_statement_packet', 'statement_packet_l5_001'),
    reviewed_statement_packet_hash: hash('statement-packet-l5'),
    reviewed_statement_refs: [ref('reviewed_statement', 'statement_l5_001')],
    reviewed_statement_packets: [{
      statement_ref: ref('reviewed_statement', 'statement_l5_001'),
      statement_hash: hash('statement-text-l5'),
      statement_text: 'Method A improves validation accuracy on benchmark B.',
      semantic_role: 'result_claim',
    }],
    // D2-core: three source refs pin the default L5 trace fixture to the
    // STANDARD tier (packet_ref_count >= 3) so the historical four-role
    // assertions keep describing the enforced standard plan; tier-specific
    // cases build their own light/budget fixtures.
    source_refs: [
      ref('run_evidence_unit', 'run_evidence_unit_l5_001'),
      ref('claim_trace_packet', 'claim_trace_packet_l5_001'),
      ref('result_interpretation_packet', 'result_packet_l5_001'),
    ],
    source_hashes: [sourceHash, hash('claim-trace-packet-l5'), hash('result-packet-l5')],
    source_packets: [{
      source_ref: ref('run_evidence_unit', 'run_evidence_unit_l5_001'),
      source_hash: sourceHash,
      source_family: 'run_evidence',
      freshness_status: 'fresh',
      evidence_role: 'primary_result',
      content_summary: 'Benchmark B run evidence reports the validation accuracy improvement.',
      source_excerpt: sourceExcerpt,
    }, {
      source_ref: ref('claim_trace_packet', 'claim_trace_packet_l5_001'),
      source_hash: hash('claim-trace-packet-l5'),
      source_family: 'claim_trace_packet',
      freshness_status: 'fresh',
      evidence_role: 'lineage',
      content_summary: 'Claim trace packet carries the claim-to-run lineage.',
      source_excerpt: 'claim lineage includes benchmark B validation runs',
    }, {
      source_ref: ref('result_interpretation_packet', 'result_packet_l5_001'),
      source_hash: hash('result-packet-l5'),
      source_family: 'result_packet',
      freshness_status: 'fresh',
      evidence_role: 'non_primary_interpretation',
      content_summary: 'Result interpretation packet, labeled non-primary evidence.',
      source_excerpt: 'interpretation: accuracy gain is attributed to method A',
    }],
    preflight_blocker_codes: [],
  };
}

function p1Request(
  kind: 'claim' | 'dossier',
  overrides: {
    run_id?: string;
    source_refs?: TopicSelectionFunctionalRef[];
    source_hashes?: string[];
  } = {},
): RunPaperImplementationP1RuntimeReviewRequest {
  const claim = kind === 'claim';
  // T-124 G4.6 structural context: every id the service assembles into the
  // Create*Request is a declared source ref.
  const sourceRefs = overrides.source_refs ?? (
    claim
      ? [
        ref('result_interpretation_packet', 'result_packet_l5_001'),
        ref('claim_trace_packet', 'claim_trace_packet_l5_001'),
        ref('claim_candidate', 'claim_candidate_l5_001'),
        ref('trace_manifest', 'trace_manifest_l5_claim_001'),
        // T-124 G5 FIX-A items 2/3: the strong claim's evidence support REU and
        // human confirmation must be declared source refs.
        ref('run_evidence_unit', 'run_evidence_unit_l5_001'),
        ref('human_confirmation_record', 'human_confirmation_l5_001'),
      ]
      : [
        ref('claim_candidate', 'claim_candidate_l5_001'),
        ref('claim_trace_packet', 'claim_trace_packet_l5_001'),
        ref('result_interpretation_packet', 'result_packet_l5_001'),
        ref('trace_manifest', 'trace_manifest_l5_dossier_001'),
        // T-124 G5 FIX-A item 2: a ready_for_writing dossier needs a readiness
        // gate_result declared source ref.
        ref('gate_result', 'gate_result_l5_001'),
      ]
  );
  const sourceHashes = overrides.source_hashes ?? sourceRefs.map((item) => hash(item.ref_id));
  return {
    run_id: overrides.run_id ?? (claim ? 'claim_boundary_l5_run_001' : 'dossier_readiness_l5_run_001'),
    run_mode: 'product',
    execution_mode: 'provider_llm',
    model_profile_id: claim
      ? PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_PROFILE_ID
      : PAPER_IMPLEMENTATION_DOSSIER_READINESS_AUDIT_PROFILE_ID,
    model_option_id: claim
      ? `${PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_PROFILE_ID}.openai-balanced`
      : `${PAPER_IMPLEMENTATION_DOSSIER_READINESS_AUDIT_PROFILE_ID}.openai-balanced`,
    target_ref: claim
      ? ref('result_interpretation_packet', 'result_packet_l5_001')
      : ref('implementation_dossier', 'dossier_l5_001'),
    target_version_id: 'v1',
    input_snapshot_ref: ref('implementation_input_snapshot', 'input_snapshot_l5_001'),
    input_snapshot_hash: hash('input-snapshot-l5'),
    source_refs: sourceRefs,
    source_hashes: sourceHashes,
    preflight_blocker_codes: [],
  };
}

function resultAnalysisRequest(
  overrides: {
    run_id?: string;
    source_refs?: TopicSelectionFunctionalRef[];
    source_hashes?: string[];
  } = {},
): RunPaperImplementationResultAnalysisRuntimeRequest {
  const sourceRefs = overrides.source_refs ?? [
    ref('run_evidence_unit', 'run_evidence_unit_l5_001'),
    ref('result_validation_report', 'result_validation_report_l5_001'),
    // T-124 G4.6 structural context refs (service-assembled Create request).
    ref('result_interpretation_packet', 'result_packet_l5_001'),
    ref('trace_manifest', 'trace_manifest_l5_result_001'),
    ref('metric', 'metric_l5_001'),
  ];
  const sourceHashes = overrides.source_hashes ?? sourceRefs.map((item) => hash(item.ref_id));
  return {
    run_id: overrides.run_id ?? 'result_analysis_l5_run_001',
    run_mode: 'product',
    execution_mode: 'provider_llm',
    model_profile_id: PAPER_IMPLEMENTATION_RESULT_ANALYSIS_PROFILE_ID,
    model_option_id: `${PAPER_IMPLEMENTATION_RESULT_ANALYSIS_PROFILE_ID}.openai-balanced`,
    target_ref: ref('validation_cycle', 'validation_cycle_l5_001'),
    target_version_id: 'v1',
    input_snapshot_ref: ref('implementation_input_snapshot', 'input_snapshot_l5_001'),
    input_snapshot_hash: hash('input-snapshot-l5'),
    source_refs: sourceRefs,
    source_hashes: sourceHashes,
    preflight_blocker_codes: [],
  };
}

function experimentPlanningRequest(
  kind: 'design' | 'critique',
  overrides: {
    run_id?: string;
    source_refs?: TopicSelectionFunctionalRef[];
    source_hashes?: string[];
  } = {},
): RunPaperImplementationExperimentPlanningRuntimeRequest {
  const design = kind === 'design';
  const sourceRefs = overrides.source_refs ?? [
    ref('technical_route_candidate', 'route_candidate_l5_001'),
    ref('feasibility_probe', 'feasibility_probe_l5_001'),
    ref('experiment_plan_light', 'experiment_plan_light_l5_001'),
  ];
  const sourceHashes = overrides.source_hashes ?? sourceRefs.map((item) => hash(item.ref_id));
  const profileId = design
    ? PAPER_IMPLEMENTATION_EXPERIMENT_DESIGN_PROFILE_ID
    : PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_PROFILE_ID;
  return {
    run_id: overrides.run_id ?? (design ? 'experiment_design_l5_run_001' : 'experiment_critique_l5_run_001'),
    run_mode: 'product',
    execution_mode: 'provider_llm',
    model_profile_id: profileId,
    model_option_id: `${profileId}.openai-balanced`,
    target_ref: ref('validation_cycle', 'validation_cycle_l5_001'),
    target_version_id: 'v1',
    input_snapshot_ref: ref('implementation_input_snapshot', 'input_snapshot_l5_001'),
    input_snapshot_hash: hash('input-snapshot-l5'),
    source_refs: sourceRefs,
    source_hashes: sourceHashes,
    preflight_blocker_codes: [],
  };
}

function routePlanningRequest(
  kind: 'architecture' | 'skeptic',
  overrides: {
    run_id?: string;
    source_refs?: TopicSelectionFunctionalRef[];
    source_hashes?: string[];
    admitted_route_proposal?: { ref: TopicSelectionFunctionalRef; hash: string };
  } = {},
): RunPaperImplementationRoutePlanningRuntimeRequest {
  const architecture = kind === 'architecture';
  const profileId = architecture
    ? PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_PROFILE_ID
    : PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_PROFILE_ID;
  const sourceRefs = overrides.source_refs ?? [
    ref('implementation_input_snapshot', 'input_snapshot_l5_001'),
    ref('trace_manifest', 'trace_manifest_l5_001'),
    ref('validation_cycle', 'validation_cycle_l5_001'),
  ];
  const sourceHashes = overrides.source_hashes ?? sourceRefs.map((item) => hash(item.ref_id));
  return {
    run_id: overrides.run_id ?? (architecture ? 'route_architecture_l5_run_001' : 'route_skeptic_l5_run_001'),
    run_mode: 'product',
    execution_mode: 'provider_llm',
    model_profile_id: profileId,
    model_option_id: `${profileId}.openai-balanced`,
    target_ref: ref('implementation_input_snapshot', 'input_snapshot_l5_001'),
    target_version_id: 'v1',
    input_snapshot_ref: ref('implementation_input_snapshot', 'input_snapshot_l5_001'),
    input_snapshot_hash: hash('input-snapshot-l5'),
    source_refs: sourceRefs,
    source_hashes: sourceHashes,
    admitted_route_proposal_artifact_ref: architecture
      ? null
      : overrides.admitted_route_proposal?.ref ?? ref('route_architecture_runtime_artifact', 'route_architecture_final_l5_001'),
    admitted_route_proposal_artifact_hash: architecture
      ? null
      : overrides.admitted_route_proposal?.hash ?? hash('route-architecture-final-l5'),
    reviewed_candidate_keys: architecture ? [] : ['exploratory_route_candidate_l5'],
    secondary_route_candidate_refs: architecture
      ? []
      : [ref('technical_route_candidate', 'technical_route_candidate_secondary_l5_001')],
    preflight_blocker_codes: [],
  };
}

function validationCyclePlanningRequest(
  overrides: {
    run_id?: string;
    source_refs?: TopicSelectionFunctionalRef[];
    source_hashes?: string[];
    lineage?: PaperImplementationSeededRouteLineage;
  } = {},
): RunPaperImplementationValidationCyclePlanningRuntimeRequest {
  const sourceRefs = overrides.source_refs ?? [
    ref('route_architecture_runtime_artifact', 'route_architecture_final_l5_001'),
    ref('route_skeptic_review_runtime_artifact', 'route_skeptic_final_l5_001'),
    ref('trace_manifest', 'trace_manifest_l5_001'),
  ];
  const sourceHashes = overrides.source_hashes ?? sourceRefs.map((item) => hash(item.ref_id));
  return {
    run_id: overrides.run_id ?? 'validation_cycle_planning_l5_run_001',
    run_mode: 'product',
    execution_mode: 'provider_llm',
    model_profile_id: PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_PROFILE_ID,
    model_option_id: `${PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_PROFILE_ID}.openai-balanced`,
    target_ref: ref('technical_route_candidate', 'technical_route_candidate_l5_001'),
    target_version_id: 'v1',
    input_snapshot_ref: ref('implementation_input_snapshot', 'input_snapshot_l5_001'),
    input_snapshot_hash: hash('input-snapshot-l5'),
    source_refs: sourceRefs,
    source_hashes: sourceHashes,
    admitted_route_proposal_artifact_ref: overrides.lineage?.routeProposalRef
      ?? ref('route_architecture_runtime_artifact', 'route_architecture_final_l5_001'),
    admitted_route_proposal_artifact_hash: overrides.lineage?.routeProposalHash ?? hash('route-architecture-final-l5'),
    admitted_route_skeptic_artifact_ref: overrides.lineage?.routeSkepticRef
      ?? ref('route_skeptic_review_runtime_artifact', 'route_skeptic_final_l5_001'),
    admitted_route_skeptic_artifact_hash: overrides.lineage?.routeSkepticHash ?? hash('route-skeptic-final-l5'),
    reviewed_candidate_keys: ['exploratory_route_candidate_l5'],
    secondary_route_candidate_refs: [ref('technical_route_candidate', 'technical_route_candidate_secondary_l5_001')],
    preflight_blocker_codes: [],
  };
}

function feasibilityPlanningRequest(
  overrides: {
    run_id?: string;
    source_refs?: TopicSelectionFunctionalRef[];
    source_hashes?: string[];
    lineage?: PaperImplementationSeededValidationLineage;
  } = {},
): RunPaperImplementationFeasibilityPlanningRuntimeRequest {
  const sourceRefs = overrides.source_refs ?? [
    ref('validation_cycle_planning_runtime_artifact', 'validation_cycle_planning_final_l5_001'),
    ref('route_architecture_runtime_artifact', 'route_architecture_final_l5_001'),
    ref('route_skeptic_review_runtime_artifact', 'route_skeptic_final_l5_001'),
    ref('trace_manifest', 'trace_manifest_feasibility_l5_001'),
  ];
  const sourceHashes = overrides.source_hashes ?? sourceRefs.map((item) => hash(item.ref_id));
  return {
    run_id: overrides.run_id ?? 'feasibility_planning_l5_run_001',
    run_mode: 'product',
    execution_mode: 'provider_llm',
    model_profile_id: PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_PROFILE_ID,
    model_option_id: `${PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_PROFILE_ID}.openai-balanced`,
    target_ref: ref('validation_cycle_candidate', 'validation_cycle_candidate_l5_001'),
    target_version_id: 'v1',
    input_snapshot_ref: ref('implementation_input_snapshot', 'input_snapshot_l5_001'),
    input_snapshot_hash: hash('input-snapshot-l5'),
    source_refs: sourceRefs,
    source_hashes: sourceHashes,
    admitted_validation_cycle_artifact_ref: overrides.lineage?.validationCycleRef
      ?? ref('validation_cycle_planning_runtime_artifact', 'validation_cycle_planning_final_l5_001'),
    admitted_validation_cycle_artifact_hash: overrides.lineage?.validationCycleHash
      ?? hash('validation-cycle-planning-final-l5'),
    admitted_route_proposal_artifact_ref: overrides.lineage?.routeProposalRef
      ?? ref('route_architecture_runtime_artifact', 'route_architecture_final_l5_001'),
    admitted_route_proposal_artifact_hash: overrides.lineage?.routeProposalHash ?? hash('route-architecture-final-l5'),
    admitted_route_skeptic_artifact_ref: overrides.lineage?.routeSkepticRef
      ?? ref('route_skeptic_review_runtime_artifact', 'route_skeptic_final_l5_001'),
    admitted_route_skeptic_artifact_hash: overrides.lineage?.routeSkepticHash ?? hash('route-skeptic-final-l5'),
    reviewed_cycle_candidate_keys: ['exploratory_cycle_candidate_l5'],
    reviewed_route_candidate_keys: ['exploratory_route_candidate_l5'],
    secondary_route_candidate_refs: [ref('technical_route_candidate', 'technical_route_candidate_secondary_l5_001')],
    secondary_validation_cycle_refs: [ref('validation_cycle', 'validation_cycle_secondary_l5_001')],
    secondary_feasibility_probe_refs: [],
    preflight_blocker_codes: [],
  };
}

function crossBoardSynthesisRequest(
  overrides: {
    run_id?: string;
    source_refs?: TopicSelectionFunctionalRef[];
    source_hashes?: string[];
  } = {},
): RunPaperImplementationCrossBoardSynthesisRuntimeRequest {
  const sourceRefs = overrides.source_refs ?? [
    ref('motive_evidence_board_version', 'board_version_l5_001'),
    ref('motive_evidence_board_version', 'board_version_l5_002'),
    ref('trace_manifest', 'trace_manifest_cross_board_l5_001'),
  ];
  const sourceHashes = overrides.source_hashes ?? sourceRefs.map((item) => hash(item.ref_id));
  return {
    run_id: overrides.run_id ?? 'cross_board_synthesis_l5_run_001',
    run_mode: 'product',
    execution_mode: 'provider_llm',
    model_profile_id: PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_PROFILE_ID,
    model_option_id: `${PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_PROFILE_ID}.openai-balanced`,
    target_ref: ref('motive_evidence_board_version', 'board_version_l5_001'),
    target_version_id: 'v1',
    input_snapshot_ref: ref('implementation_input_snapshot', 'input_snapshot_l5_001'),
    input_snapshot_hash: hash('input-snapshot-l5'),
    source_refs: sourceRefs,
    source_hashes: sourceHashes,
    board_anchors: [
      crossBoardAnchor('001'),
      crossBoardAnchor('002'),
    ],
    reviewed_board_version_refs: [
      ref('motive_evidence_board_version', 'board_version_l5_001'),
      ref('motive_evidence_board_version', 'board_version_l5_002'),
    ],
    reviewed_conflict_refs: [ref('motive_board_conflict', 'conflict_l5_001')],
    reviewed_challenge_refs: [ref('motive_board_challenge', 'challenge_l5_001')],
    evidence_transfer_binding_refs: [ref('evidence_transfer_binding', 'transfer_binding_l5_001')],
    reuse_policy: {
      require_transfer_binding_for_viable_reuse: true,
      allow_blocked_reuse_without_transfer_binding: true,
    },
    secondary_cross_board_review_refs: [ref('cross_board_review', 'cross_board_review_l5_001')],
    secondary_evidence_transfer_binding_refs: [ref('evidence_transfer_binding', 'transfer_binding_l5_001')],
    secondary_motive_assertion_refs: [ref('motive_assertion', 'motive_assertion_l5_001')],
    secondary_evidence_binding_refs: [ref('evidence_binding', 'evidence_binding_l5_001')],
    secondary_route_refs: [ref('technical_route_candidate', 'technical_route_candidate_l5_001')],
    secondary_experiment_refs: [ref('experiment_run', 'experiment_run_l5_001')],
    preflight_blocker_codes: [],
  };
}

function traceRoleOutput(roleSlotId: string): PaperImplementationTraceIntegrityRoleOutput {
  // S3-α2 deepened contract: each role carries its structured section.
  const structured: Partial<PaperImplementationTraceIntegrityRoleOutput> =
    roleSlotId === 'trace_integrity_review.support_mapper_map'
      ? {
        per_statement_support_map: [{
          statement_ref: ref('reviewed_statement', 'statement_l5_001'),
          support_kind: 'direct',
          cited_refs: [ref('run_evidence_unit', 'run_evidence_unit_l5_001')],
        }],
      }
      : roleSlotId === 'trace_integrity_review.skeptic_challenge'
        ? { challenge_findings: [] }
        : roleSlotId === 'trace_integrity_review.support_mapper_reconcile'
          ? { finding_dispositions: [] }
          : roleSlotId === 'trace_integrity_review.arbiter_final'
            ? {
              coverage: {
                statement_refs: [ref('reviewed_statement', 'statement_l5_001')],
                finding_ids: [],
              },
            }
            : {};
  return {
    role_slot_id: roleSlotId as PaperImplementationTraceIntegrityRoleOutput['role_slot_id'],
    role_status: 'passed',
    summary: `Trace role ${roleSlotId} passed.`,
    reviewed_statement_refs: [ref('reviewed_statement', 'statement_l5_001')],
    cited_source_refs: [ref('run_evidence_unit', 'run_evidence_unit_l5_001')],
    blocker_codes: [],
    warning_codes: [],
    ...structured,
  };
}

function p1RoleOutput(nodeId: string): PaperImplementationP1RuntimeReviewRoleOutput {
  const final = nodeId.endsWith('final');
  const claim = nodeId.startsWith('claim_boundary_review');
  return {
    role_slot_id: nodeId as PaperImplementationP1RuntimeReviewRoleOutput['role_slot_id'],
    role_status: 'passed',
    summary: `P1 role ${nodeId} passed.`,
    cited_source_refs: claim
      ? [ref('result_interpretation_packet', 'result_packet_l5_001')]
      : [ref('claim_candidate', 'claim_candidate_l5_001')],
    blocker_codes: [],
    warning_codes: [],
    // T-124 G4.6: the final adjudicator emits its typed SEMANTIC proposal; the
    // runtime service assembles the Create*Request from the request context.
    claim_proposal: final && claim ? l5ClaimProposal() : null,
    dossier_proposal: final && !claim ? l5DossierProposal() : null,
    scenario_outputs: final && !claim
      ? [{ scenario_id: 'ready_for_writing', disposition: 'preferred' }]
      : [],
  };
}

/** The L5 claim adjudicator's typed semantic proposal (assembly input). */
function l5ClaimProposal(): NonNullable<PaperImplementationP1RuntimeReviewRoleOutput['claim_proposal']> {
  return buildClaimCandidateProposal({
    claim_statement: 'Bounded L5 parity claim within the probed scale and committed task set.',
    support_refs: [ref('run_evidence_unit', 'run_evidence_unit_l5_001')],
    scope: {
      population_scope: 'L5 downstream adaptation of a Transformer language model.',
      method_scope: 'Parameter-efficient adaptation vs reproduced full fine-tuning.',
      dataset_scope: 'Committed L5 benchmark subset.',
      metric_scope: 'Per-task primary metric, trainable parameter count, inference latency.',
      negative_scope_notes: [],
      excluded_scope_notes: ['No claim beyond the probed setting.'],
    },
  });
}

/** The L5 dossier adjudicator's typed semantic proposal (assembly input). */
function l5DossierProposal(): NonNullable<PaperImplementationP1RuntimeReviewRoleOutput['dossier_proposal']> {
  return buildDossierReadinessProposal({
    experiment_limitations: ['Results at the probed scale on the committed tasks only.'],
    admitted_claim_refs: [ref('claim_candidate', 'claim_candidate_l5_001')],
  });
}

/**
 * T-124 S3 F5-1 (narrowed by G4.6): the provider wire shape of a P1 role
 * output — canonical output with `scenario_outputs` replaced by its JSON-string
 * carrier. The typed proposal blocks ride the wire directly. This is what
 * provider_llm calls actually emit (the service canonicalizes the carrier back).
 */
function p1WireRoleOutput(nodeId: string): Record<string, unknown> {
  const { scenario_outputs: scenarios, ...rest } = p1RoleOutput(nodeId);
  return {
    ...rest,
    scenario_output_jsons: (scenarios ?? []).map((scenario) => JSON.stringify(scenario)),
  };
}

function resultAnalysisRoleOutput(
  overrides: Partial<PaperImplementationResultAnalysisRoleOutput> = {},
): PaperImplementationResultAnalysisRoleOutput {
  return {
    role_slot_id: PAPER_IMPLEMENTATION_RESULT_ANALYSIS_ROLE_SLOT_ID,
    role_status: 'passed',
    summary: 'Result analysis runtime produced bounded interpretation scenarios.',
    cited_source_refs: [
      ref('run_evidence_unit', 'run_evidence_unit_l5_001'),
      ref('result_validation_report', 'result_validation_report_l5_001'),
    ],
    blocker_codes: [],
    warning_codes: [],
    scenario_outputs: PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SCENARIO_KINDS.map((kind) =>
      resultAnalysisScenarioOutput(kind)),
    // T-124 G4.6: typed SEMANTIC blocks; the runtime service assembles the
    // CreateResultInterpretationPacketRequest from the request context.
    interpretation: {
      result_summary: 'The trusted L5 run supports the bounded interpretation across the required scenario kinds.',
      supports_assertion_refs: [ref('motive_assertion', 'motive_assertion_l5_001')],
      challenges_assertion_refs: [],
      unexpected_findings: [],
      failed_run_refs: [],
      inconclusive_run_refs: [],
      stale_or_invalidated_evidence_refs: [],
      failed_runs_accounted_for: true,
      inconclusive_runs_accounted_for: true,
      exploratory_confirmatory_separated: true,
    },
    reliability: {
      failed_runs_retained: true,
      confound_refs: [],
      limitation_refs: [ref('limitation', 'limitation_l5_001')],
      reliability_notes: [],
    },
    claim_implications: {
      allowed_claim_ceiling: 'moderate',
      forbidden_overclaims: ['broad generalization'],
      recommended_claim_refs: [],
      required_followup_refs: [],
    },
    ...overrides,
  };
}

function resultAnalysisScenarioOutput(
  kind: (typeof PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SCENARIO_KINDS)[number],
): PaperImplementationResultAnalysisRoleOutput['scenario_outputs'][number] {
  return {
    scenario_id: `${kind}_scenario_l5_001`,
    scenario_kind: kind,
    summary: `${kind} interpretation scenario with bounded implications.`,
    support_refs: [ref('run_evidence_unit', 'run_evidence_unit_l5_001')],
    challenge_refs: [ref('result_validation_report', 'result_validation_report_l5_001')],
    limitation_refs: [ref('limitation', 'limitation_l5_001')],
    forbidden_overclaims: ['broad generalization'],
    recommended_claim_refs: [ref('claim_candidate', `${kind}_claim_candidate_l5_001`)],
    required_followup_refs: [ref('validation_feedback_item', `${kind}_followup_l5_001`)],
  };
}

function experimentCritiqueRoleOutput(
  overrides: Partial<PaperImplementationExperimentPlanningRoleOutput> = {},
): PaperImplementationExperimentPlanningRoleOutput {
  return {
    role_slot_id: PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_ROLE_SLOT_ID,
    role_status: 'passed',
    summary: 'Experiment critique runtime covered L5 required dimensions.',
    cited_source_refs: [ref('experiment_plan_light', 'experiment_plan_light_l5_001')],
    blocker_codes: [],
    warning_codes: [],
    checked_dimensions: [...PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_DIMENSIONS],
    critique_findings: [{
      finding_id: 'critique_finding_budget_l5_001',
      critique_dimension: 'compute_budget',
      severity: 'warning',
      summary: 'Budget is bounded but must remain visible before WorkOrder admission.',
      evidence_refs: [ref('validation_budget', 'budget_l5_001')],
      required_revision_refs: [],
      blocks_work_order: false,
    }],
    critique_decision: {
      decision: 'approve_for_work_order_draft',
      rationale: 'No blocking execution risk remains in the L5 critique.',
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
    route_summary: `${candidateKey} proposes a bounded route candidate.`,
    expected_information_gain: 'Clarifies whether the implementation path can beat the baseline within the budget.',
    baseline_gap_status: confirmatoryMarker ? 'partial' : 'unknown',
    cited_source_refs: [ref('implementation_input_snapshot', 'input_snapshot_l5_001')],
    trace_refs: [ref('trace_manifest', 'trace_manifest_l5_001')],
    validation_signal_refs: [ref('validation_signal', `${candidateKey}_signal_l5_001`)],
    dataset_refs: [ref('dataset_version', `${candidateKey}_dataset_l5_001`)],
    metric_refs: [ref('metric', `${candidateKey}_metric_l5_001`)],
    baseline_refs: [ref('baseline_version', `${candidateKey}_baseline_l5_001`)],
    code_refs: [ref('code_version', `${candidateKey}_code_l5_001`)],
    config_refs: [ref('config_snapshot', `${candidateKey}_config_l5_001`)],
    scope_boundary: 'Proposal-only runtime evidence; deterministic route services own persisted route authority.',
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
    cited_source_refs: [ref('implementation_input_snapshot', 'input_snapshot_l5_001')],
    blocker_codes: [],
    warning_codes: [],
    route_candidate_proposals: [
      routeCandidateProposal('exploratory_route_candidate_l5', false),
      routeCandidateProposal('confirmatory_route_candidate_l5', true),
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
    summary: 'Independent route skeptic covered route-planning risks.',
    cited_source_refs: [ref('route_architecture_runtime_artifact', 'route_architecture_final_l5_001')],
    blocker_codes: [],
    warning_codes: [],
    reviewed_route_proposal_ref: ref('route_architecture_runtime_artifact', 'route_architecture_final_l5_001'),
    reviewed_route_proposal_hash: hash('route-architecture-final-l5'),
    reviewed_candidate_keys: ['exploratory_route_candidate_l5'],
    checked_dimensions: [...PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_RISK_DIMENSIONS],
    risk_findings: [{
      finding_id: 'route_risk_finding_budget_l5_001',
      risk_dimension: 'compute_budget',
      severity: 'warning',
      summary: 'Budget must remain explicit before deterministic route admission proceeds.',
      evidence_refs: [ref('validation_budget', 'budget_l5_001')],
      affected_candidate_keys: ['exploratory_route_candidate_l5'],
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
    reviewed_route_candidate_key: 'exploratory_route_candidate_l5',
    target_ref: ref('technical_route_candidate', `technical_route_candidate_${candidateKey}_l5_001`),
    target_frame_summary: `${candidateKey} validates a bounded route signal before deterministic cycle admission.`,
    cycle_type: confirmatoryMarker ? 'baseline_challenge' : 'route_feasibility',
    trigger_refs: [ref('route_risk_finding', `route_risk_finding_${candidateKey}_l5_001`)],
    validation_question: `Can ${candidateKey} produce a useful route validation signal within budget?`,
    assumptions_under_test: ['Route context is sufficient to validate against the baseline.'],
    assertion_refs_under_test: [ref('motive_assertion', `motive_assertion_${candidateKey}_l5_001`)],
    decision_if_pass: 'Admit a deterministic validation cycle draft downstream.',
    decision_if_fail: 'Park the candidate or send it back to route revision.',
    decision_if_inconclusive: 'Request more source context before deterministic validation admission.',
    expected_information_gain: confirmatoryMarker ? 'medium' : 'high',
    criteria: {
      pass_conditions: ['The validation signal isolates route merit against the baseline.'],
      fail_conditions: ['The signal cannot distinguish route merit from missing context.'],
      inconclusive_conditions: ['Dataset, metric, or budget facts are unavailable.'],
      stop_conditions: ['Budget envelope is exceeded.'],
      minimum_artifacts_required: ['route proposal artifact', 'route skeptic artifact'],
    },
    budget_envelope: {
      budget_ref: ref('validation_budget', `budget_${candidateKey}_l5_001`),
      iteration_budget_ref: ref('iteration_budget', `iteration_budget_${candidateKey}_l5_001`),
      retry_budget: 1,
      max_runtime: '2h',
      max_compute: 'single-gpu-smoke',
      max_human_review_count: 1,
    },
    included_context_refs: [ref('route_architecture_runtime_artifact', 'route_architecture_final_l5_001')],
    trace_refs: [ref('trace_manifest', `trace_manifest_${candidateKey}_l5_001`)],
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
    summary: 'Validation-cycle planning proposed bounded cycle candidates.',
    cited_source_refs: [ref('route_architecture_runtime_artifact', 'route_architecture_final_l5_001')],
    blocker_codes: [],
    warning_codes: [],
    reviewed_route_proposal_ref: ref('route_architecture_runtime_artifact', 'route_architecture_final_l5_001'),
    reviewed_route_proposal_hash: hash('route-architecture-final-l5'),
    reviewed_route_skeptic_artifact_ref: ref('route_skeptic_review_runtime_artifact', 'route_skeptic_final_l5_001'),
    reviewed_route_skeptic_artifact_hash: hash('route-skeptic-final-l5'),
    reviewed_candidate_keys: ['exploratory_route_candidate_l5'],
    cycle_candidate_proposals: [
      validationCycleCandidateProposal('exploratory_cycle_candidate_l5', false),
      validationCycleCandidateProposal('confirmatory_cycle_candidate_l5', true),
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
    reviewed_cycle_candidate_key: 'exploratory_cycle_candidate_l5',
    reviewed_route_candidate_key: 'exploratory_route_candidate_l5',
    probe_kind: confirmatoryMarker ? 'baseline_check' : 'data_feasibility',
    probe_question: `Can ${candidateKey} produce enough feasibility signal before deterministic probe admission?`,
    plan_summary: `${candidateKey} proposes a bounded feasibility probe or plan-light candidate without downstream writes.`,
    expected_information_gain: confirmatoryMarker ? 'medium' : 'high',
    baseline_gap_status: confirmatoryMarker ? 'resolved' : 'open',
    primary_metric_refs: [ref('metric', `${candidateKey}_metric_l5_001`)],
    dataset_version_refs: [ref('dataset_version', `${candidateKey}_dataset_l5_001`)],
    baseline_version_refs: [ref('baseline_version', `${candidateKey}_baseline_l5_001`)],
    code_version_refs: [ref('code_version', `${candidateKey}_code_l5_001`)],
    config_refs: [ref('config_snapshot', `${candidateKey}_config_l5_001`)],
    budget_envelope: {
      budget_ref: ref('validation_budget', `${candidateKey}_budget_l5_001`),
      iteration_budget_ref: ref('iteration_budget', `${candidateKey}_iteration_budget_l5_001`),
      retry_budget: 1,
      estimated_cost_class: confirmatoryMarker ? 'medium' : 'low',
      max_runtime: '2h',
      max_compute: 'single-gpu-smoke',
      max_human_review_count: 1,
    },
    stop_condition_refs: [ref('stop_condition', `${candidateKey}_stop_condition_l5_001`)],
    trace_refs: [ref('trace_manifest', `${candidateKey}_trace_manifest_l5_001`)],
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
    cited_source_refs: [ref('validation_cycle_planning_runtime_artifact', 'validation_cycle_planning_final_l5_001')],
    blocker_codes: [],
    warning_codes: [],
    reviewed_validation_cycle_artifact_ref: ref('validation_cycle_planning_runtime_artifact', 'validation_cycle_planning_final_l5_001'),
    reviewed_validation_cycle_artifact_hash: hash('validation-cycle-planning-final-l5'),
    reviewed_route_proposal_ref: ref('route_architecture_runtime_artifact', 'route_architecture_final_l5_001'),
    reviewed_route_proposal_hash: hash('route-architecture-final-l5'),
    reviewed_route_skeptic_artifact_ref: ref('route_skeptic_review_runtime_artifact', 'route_skeptic_final_l5_001'),
    reviewed_route_skeptic_artifact_hash: hash('route-skeptic-final-l5'),
    reviewed_cycle_candidate_keys: ['exploratory_cycle_candidate_l5'],
    reviewed_route_candidate_keys: ['exploratory_route_candidate_l5'],
    probe_plan_candidate_proposals: [
      feasibilityProbePlanCandidateProposal('exploratory_probe_candidate_l5', false),
      feasibilityProbePlanCandidateProposal('plan_light_readiness_candidate_l5', true),
    ],
    no_domain_gate_request: true,
    no_queue_side_effect: true,
    no_feasibility_probe_side_effect: true,
    no_experiment_plan_light_side_effect: true,
    no_validation_cycle_side_effect: true,
    ...overrides,
  };
}

function crossBoardAnchor(id: '001' | '002'): PaperImplementationCrossBoardAnchor {
  return {
    board_version_ref: ref('motive_evidence_board_version', `board_version_l5_${id}`),
    board_version_hash: hash(`board-version-l5-${id}`),
    motive_ref: ref('core_motive', `core_motive_l5_${id}`),
    core_motive_version_ref: ref('core_motive_version', `core_motive_version_l5_${id}`),
    trace_manifest_ref: ref('trace_manifest', `trace_manifest_cross_board_l5_${id}`),
    trace_manifest_hash: hash(`trace-manifest-cross-board-l5-${id}`),
    evidence_binding_refs: [ref('evidence_binding', `evidence_binding_l5_${id}`)],
    source_locator_refs: [ref('source_locator', `source_locator_l5_${id}`)],
    conflict_refs: id === '001' ? [ref('motive_board_conflict', 'conflict_l5_001')] : [],
    challenge_refs: id === '001' ? [ref('motive_board_challenge', 'challenge_l5_001')] : [],
    freshness_status: 'fresh',
  };
}

function crossBoardReuseScenarioProposal(
  overrides: Partial<PaperImplementationCrossBoardScenarioProposal> = {},
): PaperImplementationCrossBoardScenarioProposal {
  return {
    scenario_key: 'reuse_scenario_l5_001',
    scenario_kind: 'reuse',
    disposition: 'viable_candidate',
    source_board_version_refs: [
      ref('motive_evidence_board_version', 'board_version_l5_001'),
      ref('motive_evidence_board_version', 'board_version_l5_002'),
    ],
    source_board_version_hashes: [
      hash('board-version-l5-001'),
      hash('board-version-l5-002'),
    ],
    target_motive_refs: [ref('core_motive', 'core_motive_l5_001')],
    evidence_transfer_binding_refs: [ref('evidence_transfer_binding', 'transfer_binding_l5_001')],
    conflict_refs: [ref('motive_board_conflict', 'conflict_l5_001')],
    challenge_refs: [ref('motive_board_challenge', 'challenge_l5_001')],
    freshness_blockers: [],
    source_locator_refs: [
      ref('source_locator', 'source_locator_l5_001'),
      ref('source_locator', 'source_locator_l5_002'),
    ],
    expected_benefit: 'Reuse traced evidence across compatible board versions without mutating domain state.',
    risk_codes: ['scope_transfer_risk'],
    blocker_codes: [],
    warning_codes: [],
    recommended_next_gate: 'cross_board_review',
    ...overrides,
  };
}

function crossBoardParkScenarioProposal(): PaperImplementationCrossBoardScenarioProposal {
  return {
    ...crossBoardReuseScenarioProposal(),
    scenario_key: 'park_conflict_scenario_l5_001',
    scenario_kind: 'park',
    disposition: 'needs_domain_review',
    evidence_transfer_binding_refs: [],
    blocker_codes: [],
    warning_codes: ['conflict_needs_review'],
    recommended_next_gate: 'trace_repair',
  };
}

function crossBoardSynthesisRoleOutput(
  overrides: Partial<PaperImplementationCrossBoardSynthesisRoleOutput> = {},
): PaperImplementationCrossBoardSynthesisRoleOutput {
  return {
    role_slot_id: PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_ROLE_SLOT_ID,
    role_status: 'passed',
    summary: 'Cross-board synthesis proposed bounded merge/split/reuse scenarios.',
    cited_source_refs: [ref('motive_evidence_board_version', 'board_version_l5_001')],
    reviewed_board_version_refs: [
      ref('motive_evidence_board_version', 'board_version_l5_001'),
      ref('motive_evidence_board_version', 'board_version_l5_002'),
    ],
    reviewed_conflict_refs: [ref('motive_board_conflict', 'conflict_l5_001')],
    reviewed_challenge_refs: [ref('motive_board_challenge', 'challenge_l5_001')],
    reviewed_evidence_transfer_binding_refs: [ref('evidence_transfer_binding', 'transfer_binding_l5_001')],
    scenario_proposals: [
      crossBoardReuseScenarioProposal(),
      crossBoardParkScenarioProposal(),
    ],
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

function evidenceBoardCurationRequest(
  overrides: Partial<RunPaperImplementationEvidenceBoardCurationRuntimeRequest> = {},
): RunPaperImplementationEvidenceBoardCurationRuntimeRequest {
  return {
    run_id: overrides.run_id ?? 'evidence_board_curation_l5_run_001',
    run_mode: 'product',
    execution_mode: 'provider_llm',
    model_profile_id: PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_PROFILE_ID,
    model_option_id: `${PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_PROFILE_ID}.openai-balanced`,
    curation_mode: 'curate_existing_board',
    target_ref: ref('motive_evidence_board_version', 'board_version_evidence_board_l5_001'),
    target_version_id: 'v1',
    target_motive_ref: ref('core_motive', 'core_motive_evidence_board_l5_001'),
    target_core_motive_version_ref: ref('core_motive_version', 'core_motive_version_evidence_board_l5_001'),
    target_board_ref: ref('motive_evidence_board_version', 'board_version_evidence_board_l5_001'),
    target_board_hash: hash('board-version-evidence-board-l5-001'),
    target_assertion_refs: [ref('motive_assertion', 'assertion_evidence_board_l5_001')],
    input_snapshot_ref: ref('implementation_input_snapshot', 'input_snapshot_evidence_board_l5_001'),
    input_snapshot_hash: hash('input-snapshot-evidence-board-l5-001'),
    source_refs: [
      ref('source_locator', 'source_locator_evidence_board_l5_001'),
      ref('citation_candidate', 'citation_candidate_evidence_board_l5_001'),
      ref('evidence_unit', 'evidence_unit_evidence_board_l5_001'),
    ],
    source_hashes: [
      hash('source-locator-evidence-board-l5-001'),
      hash('citation-candidate-evidence-board-l5-001'),
      hash('evidence-unit-evidence-board-l5-001'),
    ],
    trace_manifest_refs: [ref('trace_manifest', 'trace_manifest_evidence_board_l5_001')],
    trace_manifest_hashes: [hash('trace-manifest-evidence-board-l5-001')],
    source_locator_refs: [ref('source_locator', 'source_locator_evidence_board_l5_001')],
    citation_candidate_refs: [ref('citation_candidate', 'citation_candidate_evidence_board_l5_001')],
    reviewed_citation_candidate_refs: [ref('citation_candidate', 'citation_candidate_evidence_board_l5_001')],
    evidence_refs: [
      ref('evidence_unit', 'evidence_unit_evidence_board_l5_001'),
      ref('evidence_unit', 'existing_bound_evidence_l5_001'),
    ],
    existing_evidence_binding_refs: [ref('evidence_binding', 'existing_binding_l5_001')],
    existing_bound_evidence_refs: [ref('evidence_unit', 'existing_bound_evidence_l5_001')],
    accepted_risk_refs: [ref('accepted_risk', 'accepted_risk_evidence_board_l5_001')],
    freshness_policy: {
      stale_evidence_requires_gap_candidate: true,
      unreviewed_citation_requires_gap_candidate: true,
      duplicate_existing_binding_requires_gap_candidate: true,
    },
    secondary_evidence_transfer_binding_refs: [ref('evidence_transfer_binding', 'transfer_binding_evidence_board_l5_001')],
    secondary_cross_board_review_refs: [ref('cross_board_review', 'cross_board_review_evidence_board_l5_001')],
    secondary_trace_repair_queue_refs: [],
    preflight_blocker_codes: [],
    ...overrides,
  };
}

function evidenceBoardBindingCandidateProposal(
  candidateKey: string,
  overrides: Partial<PaperImplementationEvidenceBoardBindingCandidateProposal> = {},
): PaperImplementationEvidenceBoardBindingCandidateProposal {
  return {
    candidate_key: candidateKey,
    target_assertion_ref: ref('motive_assertion', 'assertion_evidence_board_l5_001'),
    evidence_ref: ref('evidence_unit', 'evidence_unit_evidence_board_l5_001'),
    source_locator_refs: [ref('source_locator', 'source_locator_evidence_board_l5_001')],
    citation_candidate_refs: [ref('citation_candidate', 'citation_candidate_evidence_board_l5_001')],
    proposed_role: 'supporting_evidence',
    proposed_scope: 'assertion_local',
    proposed_strength: 'moderate',
    support_state: 'viable_binding',
    challenge_status: 'passed',
    freshness_status: 'fresh',
    interpretation: 'Candidate is reviewable and append-only; deterministic board services own any binding creation.',
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

function evidenceBoardCurationRoleOutput(
  overrides: Partial<PaperImplementationEvidenceBoardCurationRoleOutput> = {},
): PaperImplementationEvidenceBoardCurationRoleOutput {
  return {
    role_slot_id: PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_ROLE_SLOT_ID,
    role_status: 'passed',
    summary: 'Evidence-board curation proposed append-only binding and gap candidates.',
    cited_source_refs: [ref('source_locator', 'source_locator_evidence_board_l5_001')],
    reviewed_assertion_refs: [ref('motive_assertion', 'assertion_evidence_board_l5_001')],
    reviewed_source_locator_refs: [ref('source_locator', 'source_locator_evidence_board_l5_001')],
    reviewed_citation_candidate_refs: [ref('citation_candidate', 'citation_candidate_evidence_board_l5_001')],
    reviewed_evidence_refs: [
      ref('evidence_unit', 'evidence_unit_evidence_board_l5_001'),
      ref('evidence_unit', 'existing_bound_evidence_l5_001'),
    ],
    reviewed_existing_evidence_binding_refs: [ref('evidence_binding', 'existing_binding_l5_001')],
    binding_candidate_proposals: [evidenceBoardBindingCandidateProposal('binding_candidate_evidence_board_l5_001')],
    gap_candidate_proposals: [],
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

function evidenceBoardForbiddenWriteFragments(): string[] {
  return [
    'create_board_request',
    'create_motive_evidence_board_version_request',
    'create_evidence_binding_request',
    'update_existing_binding_proposals',
    'remove_binding_proposals',
    'board_summary_patch',
    'board_state_patch',
    'evidence_transfer_binding_request',
    'citation_candidate_request',
    'trace_repair_queue_item',
    'queue_action',
  ];
}

function motiveDecompositionRequest(
  overrides: Partial<RunPaperImplementationMotiveDecompositionRuntimeRequest> = {},
): RunPaperImplementationMotiveDecompositionRuntimeRequest {
  return {
    run_id: overrides.run_id ?? 'motive_decomposition_l5_run_001',
    run_mode: 'product',
    execution_mode: 'provider_llm',
    model_profile_id: PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_PROFILE_ID,
    model_option_id: `${PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_PROFILE_ID}.openai-balanced`,
    decomposition_mode: 'decompose_existing_assertions',
    target_ref: ref('core_motive_version', 'core_motive_version_motive_decomposition_l5_001'),
    target_version_id: 'v1',
    target_motive_ref: ref('core_motive', 'core_motive_motive_decomposition_l5_001'),
    target_core_motive_version_ref: ref('core_motive_version', 'core_motive_version_motive_decomposition_l5_001'),
    target_assertion_refs: [ref('motive_assertion', 'assertion_motive_decomposition_l5_001')],
    input_snapshot_ref: ref('implementation_input_snapshot', 'input_snapshot_motive_decomposition_l5_001'),
    input_snapshot_hash: hash('input-snapshot-motive-decomposition-l5-001'),
    source_refs: [
      ref('source_locator', 'source_locator_motive_decomposition_l5_001'),
      ref('citation_candidate', 'citation_candidate_motive_decomposition_l5_001'),
      ref('evidence_unit', 'evidence_unit_motive_decomposition_l5_001'),
    ],
    source_hashes: [
      hash('source-locator-motive-decomposition-l5-001'),
      hash('citation-candidate-motive-decomposition-l5-001'),
      hash('evidence-unit-motive-decomposition-l5-001'),
    ],
    assertion_context_packets: [{
      packet_ref: ref('assertion_context_packet', 'assertion_context_packet_motive_decomposition_l5_001'),
      packet_hash: hash('assertion-context-packet-motive-decomposition-l5-001'),
      assertion_ref: ref('motive_assertion', 'assertion_motive_decomposition_l5_001'),
      assertion_hash: hash('assertion-motive-decomposition-l5-001'),
      assertion_text: 'The method reduces retrieval error by grounding generated sections in source-backed evidence.',
      scope_boundary_summary: 'Only assertions directly supported by source locators and trace manifests are in scope.',
      covered_evidence_refs: [ref('evidence_unit', 'evidence_unit_motive_decomposition_l5_001')],
      covered_trace_manifest_refs: [ref('trace_manifest', 'trace_manifest_motive_decomposition_l5_001')],
      covered_source_refs: [ref('source_locator', 'source_locator_motive_decomposition_l5_001')],
    }],
    trace_manifest_refs: [ref('trace_manifest', 'trace_manifest_motive_decomposition_l5_001')],
    trace_manifest_hashes: [hash('trace-manifest-motive-decomposition-l5-001')],
    source_locator_refs: [ref('source_locator', 'source_locator_motive_decomposition_l5_001')],
    citation_candidate_refs: [ref('citation_candidate', 'citation_candidate_motive_decomposition_l5_001')],
    evidence_refs: [ref('evidence_unit', 'evidence_unit_motive_decomposition_l5_001')],
    accepted_risk_refs: [ref('accepted_risk', 'accepted_risk_motive_decomposition_l5_001')],
    admitted_upstream_artifact_refs: [
      ref('paper_implementation_runtime_artifact', 'admitted_upstream_motive_decomposition_l5_001'),
    ],
    admitted_upstream_artifact_hashes: [hash('admitted-upstream-motive-decomposition-l5-001')],
    preflight_blocker_codes: [],
    ...overrides,
  };
}

function motiveDecompositionDraftAssertionCandidate(
  candidateKey: string,
  overrides: Partial<PaperImplementationMotiveDecompositionDraftAssertionCandidate> = {},
): PaperImplementationMotiveDecompositionDraftAssertionCandidate {
  return {
    candidate_key: candidateKey,
    source_assertion_ref: ref('motive_assertion', 'assertion_motive_decomposition_l5_001'),
    candidate_kind: 'split_child',
    draft_assertion_text: 'The retrieval grounding component reduces unsupported generated claims.',
    scope_boundary_summary: 'Scope is limited to retrieval grounding and source-backed evidence.',
    support_obligation_summary: 'Requires source locator, citation candidate, evidence unit, and trace manifest coverage.',
    covered_evidence_refs: [ref('evidence_unit', 'evidence_unit_motive_decomposition_l5_001')],
    covered_source_refs: [ref('source_locator', 'source_locator_motive_decomposition_l5_001')],
    covered_source_locator_refs: [ref('source_locator', 'source_locator_motive_decomposition_l5_001')],
    covered_citation_candidate_refs: [ref('citation_candidate', 'citation_candidate_motive_decomposition_l5_001')],
    covered_trace_manifest_refs: [ref('trace_manifest', 'trace_manifest_motive_decomposition_l5_001')],
    decomposition_check: {
      compoundness_status: 'multiple_obligations',
      scope_change_status: 'split',
      evidence_coverage_status: 'full',
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
    summary: 'Motive decomposition proposed draft assertion candidates for deterministic review.',
    cited_source_refs: [ref('source_locator', 'source_locator_motive_decomposition_l5_001')],
    decomposition_result_status: 'candidates_proposed',
    reviewed_assertion_refs: [ref('motive_assertion', 'assertion_motive_decomposition_l5_001')],
    draft_assertion_candidates: [motiveDecompositionDraftAssertionCandidate('split_child_motive_decomposition_l5_001')],
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

function assertMotiveDecompositionRetryFailure(
  result: Awaited<ReturnType<PaperImplementationMotiveDecompositionRuntimeService['runDraftAssertionCandidates']>>,
  gateway: ScriptedLlmGateway,
  expectedFailureCode: string,
): void {
  assert.equal(result.status, 'failed_runtime');
  assert.equal(result.provider_call_count, 2);
  assert.equal(gateway.calls.length, 2);
  assert.equal(
    gateway.calls.every((call) => call.model.profileId === PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_PROFILE_ID),
    true,
  );
  assert.equal(result.runtime_artifacts.length, 1);
  assert.equal(result.final_runtime_artifact, null);
  const artifact = firstArtifact(result.runtime_artifacts);
  assert.equal(artifact.slot_id, PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_SLOT_ID);
  assert.equal(artifact.execution_mode, 'provider_llm');
  assert.equal(artifact.runtime_failure_code, expectedFailureCode);
  assert.equal(artifact.runtime_status, 'failed_runtime');
  assert.equal(artifact.provider_call_count, 2);
  assert.equal(artifact.retry_attempt_index, 1);
  assert.equal(artifact.warning_codes.includes('RUNTIME_TECHNICAL_RETRY_EXHAUSTED'), true);
  assert.equal(result.operational_telemetry.provider_call_count_consistent, true);
  assert.equal(result.operational_telemetry.retry_exhausted_role_count, 1);
  assert.equal(result.admission_records[0]?.admission_status, 'rejected');
  assertNoNonProviderRuntimeArtifacts(result.runtime_artifacts);
  assertNoLeak(result, motiveDecompositionForbiddenWriteFragments());
}

function motiveDecompositionForbiddenWriteFragments(): string[] {
  return [
    'agent_workflow_harness_run_id',
    'implementation_proposal_artifact',
    'paper_implementation_proposal_artifact',
    'source_assertion_reviews',
    'assertion_id',
    'candidate_assertion_ref',
    'create_motive_assertion_input',
    'CreateMotiveAssertionInput',
    'motive_assertion_create_request',
    'core_motive_version_patch',
    'motive_evolution_decision_request',
    '"domain_gate_request"',
    '"queue_action"',
    'board_draft',
    'board_summary',
    'board_state',
    'bindings',
    'create_board_request',
    'create_motive_evidence_board_version_request',
    'create_evidence_binding_request',
    'evidence_binding_id',
    'trace_repair_queue_item',
    'rendered_prompt_text',
    'raw_provider_output',
    'hidden_reasoning',
  ];
}

interface MotiveEvolutionPriorRoleMaterial {
  designer_role_artifact_ref: TopicSelectionFunctionalRef;
  designer_role_artifact_hash: string;
  option_set_hash: string;
}

function motiveEvolutionRequest(
  overrides: Partial<RunPaperImplementationMotiveEvolutionRuntimeRequest> = {},
): RunPaperImplementationMotiveEvolutionRuntimeRequest {
  return {
    run_id: overrides.run_id ?? 'motive_evolution_l5_run_001',
    run_mode: 'product',
    execution_mode: 'provider_llm',
    model_profile_id: PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_PROFILE_ID,
    model_option_id: `${PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_PROFILE_ID}.openai-balanced`,
    target_ref: ref('core_motive_version', 'core_motive_version_motive_evolution_l5_001'),
    target_version_id: 'core_motive_version_motive_evolution_l5_001@v1',
    target_motive_refs: [ref('core_motive', 'core_motive_motive_evolution_l5_001')],
    target_motive_hashes: [hash('core-motive-motive-evolution-l5-001')],
    target_core_motive_version_refs: [ref('core_motive_version', 'core_motive_version_motive_evolution_l5_001')],
    target_core_motive_version_hashes: [hash('core-motive-version-motive-evolution-l5-001')],
    input_snapshot_ref: ref('implementation_input_snapshot', 'input_snapshot_motive_evolution_l5_001'),
    input_snapshot_hash: hash('input-snapshot-motive-evolution-l5-001'),
    portfolio_snapshot_ref: ref('motive_portfolio_snapshot', 'portfolio_snapshot_motive_evolution_l5_001'),
    portfolio_snapshot_hash: hash('portfolio-snapshot-motive-evolution-l5-001'),
    evidence_board_refs: [ref('motive_evidence_board_version', 'board_version_motive_evolution_l5_001')],
    evidence_board_hashes: [hash('board-version-motive-evolution-l5-001')],
    evidence_binding_refs: [ref('evidence_binding', 'evidence_binding_motive_evolution_l5_001')],
    evidence_binding_hashes: [hash('evidence-binding-motive-evolution-l5-001')],
    challenge_refs: [ref('motive_challenge', 'challenge_motive_evolution_l5_001')],
    conflict_refs: [ref('motive_conflict', 'conflict_motive_evolution_l5_001')],
    trace_manifest_refs: [ref('trace_manifest', 'trace_manifest_motive_evolution_l5_001')],
    trace_manifest_hashes: [hash('trace-manifest-motive-evolution-l5-001')],
    human_confirmation_policy_ref: ref('human_confirmation_policy', 'human_confirmation_policy_motive_evolution_l5_001'),
    human_confirmation_policy_hash: hash('human-confirmation-policy-motive-evolution-l5-001'),
    source_refs: [
      ref('source', 'source_motive_evolution_l5_001'),
      ref('motive_evidence_board_version', 'board_version_motive_evolution_l5_001'),
      ref('evidence_binding', 'evidence_binding_motive_evolution_l5_001'),
      ref('trace_manifest', 'trace_manifest_motive_evolution_l5_001'),
    ],
    source_hashes: [
      hash('source-motive-evolution-l5-001'),
      hash('board-version-motive-evolution-l5-001'),
      hash('evidence-binding-motive-evolution-l5-001'),
      hash('trace-manifest-motive-evolution-l5-001'),
    ],
    motive_context_packets: [{
      packet_ref: ref('motive_context_packet', 'motive_context_packet_motive_evolution_l5_001'),
      packet_hash: hash('motive-context-packet-motive-evolution-l5-001'),
      packet_kind: 'motive_version_state',
      content_summary: 'The current motive version has a source-backed evidence-board repair option.',
      key_facts: [
        'Runtime may propose decision support but cannot write motive, portfolio, board, trace, queue, or Domain Gate payloads.',
      ],
      covered_target_refs: [
        ref('core_motive_version', 'core_motive_version_motive_evolution_l5_001'),
        ref('core_motive', 'core_motive_motive_evolution_l5_001'),
      ],
      covered_evidence_refs: [
        ref('motive_evidence_board_version', 'board_version_motive_evolution_l5_001'),
        ref('evidence_binding', 'evidence_binding_motive_evolution_l5_001'),
      ],
      covered_trace_manifest_refs: [ref('trace_manifest', 'trace_manifest_motive_evolution_l5_001')],
      covered_source_refs: [ref('source', 'source_motive_evolution_l5_001')],
    }],
    validation_cycle_refs: [ref('validation_cycle', 'validation_cycle_motive_evolution_l5_001')],
    validation_cycle_hashes: [hash('validation-cycle-motive-evolution-l5-001')],
    result_packet_refs: [ref('result_interpretation_packet', 'result_packet_motive_evolution_l5_001')],
    result_packet_hashes: [hash('result-packet-motive-evolution-l5-001')],
    cross_board_review_refs: [ref('cross_board_review', 'cross_board_review_motive_evolution_l5_001')],
    cross_board_review_hashes: [hash('cross-board-review-motive-evolution-l5-001')],
    prior_evolution_decision_refs: [ref('motive_evolution_decision', 'prior_evolution_motive_evolution_l5_001')],
    prior_evolution_decision_hashes: [hash('prior-evolution-motive-evolution-l5-001')],
    prior_portfolio_decision_refs: [ref('motive_portfolio_decision', 'portfolio_decision_motive_evolution_l5_001')],
    prior_portfolio_decision_hashes: [hash('portfolio-decision-motive-evolution-l5-001')],
    accepted_risk_refs: [ref('accepted_risk', 'accepted_risk_motive_evolution_l5_001')],
    accepted_risk_hashes: [hash('accepted-risk-motive-evolution-l5-001')],
    human_request_refs: [ref('human_request', 'human_request_motive_evolution_l5_001')],
    human_request_hashes: [hash('human-request-motive-evolution-l5-001')],
    preflight_blocker_codes: [],
    ...overrides,
  };
}

function motiveEvolutionRoleOutput(request: LlmStructuredOutputRequest): PaperImplementationMotiveEvolutionRoleOutput {
  if (request.executionContext.operation === PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_RISK_CHALLENGER_ROLE_SLOT_ID) {
    return motiveEvolutionRiskChallengerRoleOutput(motiveEvolutionPriorFromGatewayRequest(request));
  }
  return motiveEvolutionDesignerRoleOutput();
}

function motiveEvolutionPriorFromGatewayRequest(
  request: LlmStructuredOutputRequest,
): MotiveEvolutionPriorRoleMaterial {
  const fallback = motiveEvolutionFallbackPrior();
  const userMessage = request.messages.find((message) => message.role === 'user')?.content;
  if (!userMessage) {
    return fallback;
  }
  try {
    const parsed = JSON.parse(userMessage) as {
      prior_role_artifacts?: Array<{
        artifact_ref?: TopicSelectionFunctionalRef;
        artifact_hash?: string;
        option_set_hash?: string | null;
      }>;
    };
    const prior = parsed.prior_role_artifacts?.[0];
    return {
      designer_role_artifact_ref: prior?.artifact_ref ?? fallback.designer_role_artifact_ref,
      designer_role_artifact_hash: prior?.artifact_hash ?? fallback.designer_role_artifact_hash,
      option_set_hash: prior?.option_set_hash ?? fallback.option_set_hash,
    };
  } catch {
    return fallback;
  }
}

function motiveEvolutionFallbackPrior(): MotiveEvolutionPriorRoleMaterial {
  return {
    designer_role_artifact_ref: ref('motive_evolution_role_artifact', 'designer_role_motive_evolution_l5_001'),
    designer_role_artifact_hash: hash('designer-role-motive-evolution-l5-001'),
    option_set_hash: hash('motive-evolution-option-set-l5-001'),
  };
}

function motiveEvolutionChallengeCheck(
  overrides: Partial<PaperImplementationMotiveEvolutionChallengeCheck> = {},
): PaperImplementationMotiveEvolutionChallengeCheck {
  return {
    evidence_status: 'partial',
    trace_status: 'satisfied',
    portfolio_status: 'satisfied',
    human_confirmation_status: 'not_applicable',
    downstream_impact_status: 'partial',
    blocking_reason_codes: [],
    ...overrides,
  };
}

function motiveEvolutionDesignedOption(
  overrides: Partial<PaperImplementationMotiveEvolutionDesignedOption> = {},
): PaperImplementationMotiveEvolutionDesignedOption {
  return {
    option_kind: 'repair_evidence_board_first',
    supporting_refs: [
      ref('core_motive_version', 'core_motive_version_motive_evolution_l5_001'),
      ref('motive_evidence_board_version', 'board_version_motive_evolution_l5_001'),
      ref('evidence_binding', 'evidence_binding_motive_evolution_l5_001'),
    ],
    challenging_refs: [
      ref('motive_challenge', 'challenge_motive_evolution_l5_001'),
      ref('trace_manifest', 'trace_manifest_motive_evolution_l5_001'),
    ],
    portfolio_impact_class: 'evidence_board_only',
    human_confirmation_required: false,
    recommended_next_gate: 'evidence_board_curation',
    blocker_codes: [],
    warning_codes: [],
    ...overrides,
  };
}

function motiveEvolutionDecisionOption(
  overrides: Partial<PaperImplementationMotiveEvolutionDecisionOption> = {},
): PaperImplementationMotiveEvolutionDecisionOption {
  return {
    ...motiveEvolutionDesignedOption(),
    challenge_check: motiveEvolutionChallengeCheck(),
    ...overrides,
  };
}

function motiveEvolutionDesignedOptionsByKey(
  optionKey: string,
  overrides: Partial<PaperImplementationMotiveEvolutionDesignedOption> = {},
): Record<string, PaperImplementationMotiveEvolutionDesignedOption> {
  return {
    [optionKey]: motiveEvolutionDesignedOption(overrides),
  };
}

function motiveEvolutionDecisionOptionsByKey(
  optionKey: string,
  overrides: Partial<PaperImplementationMotiveEvolutionDecisionOption> = {},
): Record<string, PaperImplementationMotiveEvolutionDecisionOption> {
  return {
    [optionKey]: motiveEvolutionDecisionOption(overrides),
  };
}

function motiveEvolutionDesignerRoleOutput(
  overrides: Partial<PaperImplementationMotiveEvolutionOptionDesignerRoleOutput> = {},
): PaperImplementationMotiveEvolutionOptionDesignerRoleOutput {
  return {
    role_slot_id: PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_OPTION_DESIGNER_ROLE_SLOT_ID,
    role_status: 'passed',
    summary: 'Motive evolution runtime designed support options for deterministic review.',
    cited_source_refs: [ref('source', 'source_motive_evolution_l5_001')],
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
    reviewed_target_motive_refs: [ref('core_motive', 'core_motive_motive_evolution_l5_001')],
    reviewed_core_motive_version_refs: [ref('core_motive_version', 'core_motive_version_motive_evolution_l5_001')],
    designed_options: motiveEvolutionDesignedOptionsByKey('evolution_option_l5_001'),
    option_set_hash: hash('motive-evolution-option-set-l5-001'),
    ...overrides,
  };
}

function motiveEvolutionRiskChallengerRoleOutput(
  prior: MotiveEvolutionPriorRoleMaterial,
  overrides: Partial<PaperImplementationMotiveEvolutionRiskChallengerRoleOutput> = {},
): PaperImplementationMotiveEvolutionRiskChallengerRoleOutput {
  return {
    role_slot_id: PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_RISK_CHALLENGER_ROLE_SLOT_ID,
    role_status: 'passed',
    summary: 'Motive evolution runtime challenged every support option for deterministic review.',
    cited_source_refs: [ref('source', 'source_motive_evolution_l5_001')],
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
    designer_role_artifact_ref: prior.designer_role_artifact_ref,
    designer_role_artifact_hash: prior.designer_role_artifact_hash,
    option_set_hash: prior.option_set_hash,
    challenged_option_keys: ['evolution_option_l5_001'],
    decision_options: motiveEvolutionDecisionOptionsByKey('evolution_option_l5_001'),
    ...overrides,
  };
}

/**
 * T-124 S3-β1: encode a canonical motive-evolution role output as the
 * provider wire shape (designed/decision option maps → entry arrays with an
 * explicit option_key). The L5 provider path goes through the real
 * orchestrator ajv gate, which now validates provider outputs against the
 * wire schemas.
 */
function motiveEvolutionWire(
  output: PaperImplementationMotiveEvolutionRoleOutput | Record<string, unknown>,
): Record<string, unknown> {
  const record = output as Record<string, unknown>;
  if (record.designed_options && typeof record.designed_options === 'object') {
    const { designed_options: designedOptions, ...rest } = record;
    return {
      ...rest,
      designed_option_entries: Object.entries(designedOptions as Record<string, object>).map(
        ([optionKey, option]) => ({ option_key: optionKey, ...option }),
      ),
    };
  }
  if (record.decision_options && typeof record.decision_options === 'object') {
    const { decision_options: decisionOptions, ...rest } = record;
    return {
      ...rest,
      decision_option_entries: Object.entries(decisionOptions as Record<string, object>).map(
        ([optionKey, option]) => ({ option_key: optionKey, ...option }),
      ),
    };
  }
  return record;
}

function assertMotiveEvolutionRetryFailure(
  result: Awaited<ReturnType<PaperImplementationMotiveEvolutionRuntimeService['runEvolutionDecisionSupport']>>,
  gateway: ScriptedLlmGateway,
  expectedFailureCode: string,
  expectedProviderCallCount: number,
  expectedArtifactCount: number,
): void {
  assert.equal(result.status, 'failed_runtime');
  assert.equal(result.provider_call_count, expectedProviderCallCount);
  assert.equal(gateway.calls.length, expectedProviderCallCount);
  assert.equal(
    gateway.calls.every((call) => call.model.profileId === PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_PROFILE_ID),
    true,
  );
  assert.equal(result.runtime_artifacts.length, expectedArtifactCount);
  assert.equal(result.final_runtime_artifact, null);
  const artifact = result.runtime_artifacts.at(-1);
  assert.ok(artifact);
  assert.equal(artifact.slot_id, PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_SLOT_ID);
  assert.equal(artifact.execution_mode, 'provider_llm');
  assert.equal(artifact.runtime_failure_code, expectedFailureCode);
  assert.equal(artifact.runtime_status, 'failed_runtime');
  assert.equal(artifact.retry_attempt_index, 1);
  assert.equal(artifact.warning_codes.includes('RUNTIME_TECHNICAL_RETRY_EXHAUSTED'), true);
  assert.equal(result.operational_telemetry.provider_call_count_consistent, true);
  assert.equal(result.operational_telemetry.retry_exhausted_role_count, 1);
  assert.equal(result.admission_records.at(-1)?.admission_status, 'rejected');
  assertNoNonProviderRuntimeArtifacts(result.runtime_artifacts);
  assertNoLeak(result, motiveEvolutionForbiddenWriteFragments());
}

function motiveEvolutionForbiddenWriteFragments(): string[] {
  return [
    'agent_workflow_harness_run_id',
    'implementation_proposal_artifact',
    'paper_implementation_proposal_artifact',
    'CreateMotiveEvolutionDecisionRequest',
    'create_motive_evolution_decision_request',
    'motive_evolution_decision_request',
    'ApplyMotivePortfolioDecisionRequest',
    'apply_motive_portfolio_decision_request',
    'motive_roles_after_decision',
    'change_set',
    'core_motive_version_patch',
    'application_status',
    '"domain_gate_request"',
    '"queue_action"',
    'writer_dto_payload',
    'board_draft',
    'board_summary',
    'board_state',
    'create_motive_evidence_board_version_request',
    'create_evidence_binding_request',
    'evidence_binding_id',
    'trace_repair_queue_item',
    'rendered_prompt_text',
    'raw_provider_output',
    'hidden_reasoning',
    'debate_transcript',
  ];
}

function invocationResultWithCompression<T>(
  output: T,
  nodeId: string,
  executionMode: string,
): TopicSelectionAgentInvocationResult<T> {
  const provider = executionMode === 'provider_llm';
  const outputHash = hash(output);
  const compressionReportRef = ref('compression_report', `compression_report_${safeId(nodeId)}`);
  const compressedContextHash = hash(`compressed-context:${nodeId}`);
  const profileId = nodeId.startsWith('claim_boundary_review')
    ? PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_PROFILE_ID
    : PAPER_IMPLEMENTATION_DOSSIER_READINESS_AUDIT_PROFILE_ID;
  const provenance = {
    workflow_run_id: 'p1_l5_compression_provenance_run_001',
    node_id: nodeId,
    node_attempt_id: `${nodeId}.attempt-0`,
    invocation_attempt_id: `${nodeId}.call-1`,
    execution_mode: executionMode,
    executor_kind: 'multi_agent_debate',
    source_kind: provider ? 'provider_response' : 'mock_fixture',
    non_provider: !provider,
    run_mode: provider ? 'product' : 'acceptance',
    profile_id: profileId,
    profile_version: 'v1',
    profile_hash: hash(`profile:${profileId}`),
    model_option_id: provider ? `${profileId}.openai-balanced` : null,
    normalized_params_hash: provider ? hash(`normalized-params:${profileId}`) : null,
    capability_degraded: false,
    capability_degrade_reason: null,
    output_contract: 'PaperImplementationP1RuntimeReviewRoleArtifact@v1',
    prompt_template_id: nodeId.startsWith('claim_boundary_review')
      ? 'paper-implementation-claim-boundary-debate'
      : 'paper-implementation-dossier-readiness-audit',
    prompt_template_version: 'v1',
    schema_name: 'paper_implementation_p1_runtime_review_role_output',
    prompt_packet_hash: hash(`prompt:${nodeId}`),
    prompt_packet_cache_status: 'miss',
    prompt_packet_cache_result_ref: ref('runtime_prompt_packet_cache_result', `prompt-cache:${safeId(nodeId)}`),
    prompt_packet_cache_result_hash: hash(`prompt-cache:${nodeId}`),
    response_hash: outputHash,
    structured_output_hash: outputHash,
    cache_status: 'not_applicable',
    response_reuse_ref: null,
    compression_report_ref: compressionReportRef,
    compression_report_hash: hash(`compression-report:${nodeId}`),
    compressed_context_hash: compressedContextHash,
    telemetry: provider ? telemetryForProfile(profileId) : null,
  };
  return {
    schema_version: 'v1',
    node_id: nodeId,
    workflow_run_id: 'p1_l5_compression_provenance_run_001',
    node_attempt_id: `${nodeId}.attempt-0`,
    status: 'succeeded',
    structured_output: output,
    provenance,
    validation: { valid: true, error_count: 0, errors: [] },
    token_budget_gate_result: {
      provider_id: 'openai',
      model_id: 'gpt-test',
      profile_id: profileId,
      model_option_id: `${profileId}.openai-balanced`,
      estimated_input_tokens: 1800,
      estimated_output_tokens: 1800,
      context_window_tokens: 128000,
      schema_overhead_tokens: 800,
      decision: 'within_budget',
      compression_strategy_ref: ref('compression_strategy', 'paper-implementation-p1-context-compression'),
      blocker_codes: [],
      warning_codes: ['COMPRESSION_REPORT_REUSED'],
    },
    warning_codes: ['COMPRESSION_REPORT_REUSED'],
    blocker_codes: [],
    error_code: null,
    audit_snapshot: {
      schema_version: 'topic-selection-agent-invocation-audit-v1',
      node_id: nodeId,
      workflow_run_id: 'p1_l5_compression_provenance_run_001',
      node_attempt_id: `${nodeId}.attempt-0`,
      status: 'succeeded',
      provenance,
      token_budget_gate_result: {
        provider_id: 'openai',
        model_id: 'gpt-test',
        profile_id: profileId,
        model_option_id: `${profileId}.openai-balanced`,
        estimated_input_tokens: 1800,
        estimated_output_tokens: 1800,
        context_window_tokens: 128000,
        schema_overhead_tokens: 800,
        decision: 'within_budget',
        compression_strategy_ref: ref('compression_strategy', 'paper-implementation-p1-context-compression'),
        blocker_codes: [],
        warning_codes: ['COMPRESSION_REPORT_REUSED'],
      },
      validation: { valid: true, error_count: 0, errors: [] },
      warning_codes: ['COMPRESSION_REPORT_REUSED'],
      blocker_codes: [],
      error_code: null,
      created_at: NOW,
    },
    created_at: NOW,
    audit_artifact_ref: null,
  } as TopicSelectionAgentInvocationResult<T>;
}

function firstArtifact(artifacts: PaperImplementationRuntimeArtifactEnvelope[]): PaperImplementationRuntimeArtifactEnvelope {
  const artifact = artifacts[0];
  assert.ok(artifact, 'expected at least one runtime artifact');
  return artifact;
}

function assertMinimalTraceFailurePayload(artifact: PaperImplementationRuntimeArtifactEnvelope): void {
  const payload = artifact.artifact_payload as Record<string, unknown>;
  assert.equal(payload.retrieval_packet, null);
  assert.deepEqual(payload.retrieval_packet_ref, artifact.retrieval_packet_ref);
  assert.equal(payload.retrieval_packet_hash, artifact.retrieval_packet_hash);
}

/** Fat shared-shape packet (source_ref/evidence_kind/content_summary/key_facts) used
 *  by the PC-S2/PC-S3 compressed-recovery cases to force `requires_compression`. */
function fatSourceContextPacket(sourceRef: TopicSelectionFunctionalRef, seed: string): {
  source_ref: TopicSelectionFunctionalRef;
  evidence_kind: string;
  content_summary: string;
  key_facts: string[];
} {
  return {
    source_ref: sourceRef,
    evidence_kind: 'admitted_upstream_proposal',
    content_summary: LONG_NEUTRAL_EXCERPT,
    key_facts: [LONG_NEUTRAL_EXCERPT, `${seed} bounded key fact with cited source support.`],
  };
}

/** Shared PC-S2/PC-S3 assertions: over-budget fat packets were deterministically
 *  compressed by the caller, the orchestrator re-gated and CONTINUED (exactly one
 *  provider call over the trimmed messages), and the COMPRESSION_APPLIED lineage is
 *  verifiable on the role and final artifacts. */
function assertCompressionAppliedRun(
  result: {
    status: string;
    provider_call_count: number;
    runtime_artifacts: PaperImplementationRuntimeArtifactEnvelope[];
    final_runtime_artifact: PaperImplementationRuntimeArtifactEnvelope | null;
    final_admission_record: PaperImplementationRuntimeAdmissionRecord | null;
  },
  gateway: ScriptedLlmGateway,
  slotId: string,
): void {
  assert.equal(result.status, 'passed');
  assert.equal(result.provider_call_count, 1);
  assert.equal(gateway.calls.length, 1);
  const sentText = stableStringify(gateway.calls[0]?.messages ?? []);
  assert.equal(sentText.includes(PAPER_IMPLEMENTATION_COMPRESSION_TRUNCATION_MARKER), true);
  assert.equal(sentText.length < LONG_NEUTRAL_EXCERPT.length, true);
  const roleArtifact = result.runtime_artifacts.find((artifact) => artifact.artifact_scope === 'role');
  assert.ok(roleArtifact);
  assert.equal(roleArtifact.slot_id, slotId);
  assert.equal(roleArtifact.runtime_status, 'passed');
  assert.equal(roleArtifact.compression_status, 'applied');
  assert.notEqual(roleArtifact.compression_report_ref, null);
  assert.notEqual(roleArtifact.compression_report_hash, null);
  assert.notEqual(roleArtifact.compressed_context_packet_ref, null);
  assert.notEqual(roleArtifact.compressed_context_packet_hash, null);
  assert.equal(roleArtifact.warning_codes.includes('COMPRESSION_APPLIED'), true);
  assert.equal(roleArtifact.provider_call_count, 1);
  const finalArtifact = result.final_runtime_artifact;
  assert.ok(finalArtifact);
  assert.equal(finalArtifact.runtime_status, 'passed');
  assert.equal(finalArtifact.warning_codes.includes('COMPRESSION_APPLIED'), true);
  const finalPayload = finalArtifact.artifact_payload as {
    role_compression_report_refs?: unknown[];
    warnings?: string[];
  };
  assert.equal(finalPayload.role_compression_report_refs?.length, 1);
  assert.equal(finalPayload.warnings?.includes('COMPRESSION_APPLIED'), true);
  assert.equal(result.final_admission_record?.admission_status, 'admitted');
}

function assertNoLeak(value: unknown, forbiddenFragments: string[]): void {
  const serialized = stableStringify(value);
  for (const fragment of forbiddenFragments) {
    assert.equal(
      serialized.includes(fragment),
      false,
      `forbidden fragment leaked into runtime result: ${fragment}`,
    );
  }
}

function assertNoNonProviderRuntimeArtifacts(artifacts: PaperImplementationRuntimeArtifactEnvelope[]): void {
  assert.equal(
    artifacts.some((artifact) =>
      artifact.execution_mode === 'mocked_llm' || artifact.execution_mode === 'codex_assisted'),
    false,
  );
}

function telemetry(request: LlmStructuredOutputRequest): LlmCallTelemetry {
  return {
    provider_id: request.model.providerId,
    model_id: request.model.modelId,
    profile_id: request.model.profileId ?? null,
    prompt_template_id: request.prompt.promptTemplateId,
    prompt_template_version: request.prompt.version,
    elapsed_ms: 10,
    request_count: 1,
    retry_count: 0,
    timeout_count: 0,
    rate_limit_count: 0,
    input_tokens: null,
    output_tokens: null,
    embedding_input_tokens: null,
    total_tokens: null,
    cost_usd: null,
    provider_side_cache_hit: null,
    provider_side_cache_read_tokens: null,
    provider_side_cache_write_tokens: null,
  };
}

function telemetryForProfile(profileId: string): LlmCallTelemetry {
  return {
    provider_id: 'openai',
    model_id: 'gpt-test',
    profile_id: profileId,
    prompt_template_id: profileId === PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_PROFILE_ID
      ? 'paper-implementation-claim-boundary-debate'
      : 'paper-implementation-dossier-readiness-audit',
    prompt_template_version: 'v1',
    elapsed_ms: 10,
    request_count: 1,
    retry_count: 0,
    timeout_count: 0,
    rate_limit_count: 0,
    input_tokens: null,
    output_tokens: null,
    embedding_input_tokens: null,
    total_tokens: null,
    cost_usd: null,
    provider_side_cache_hit: null,
    provider_side_cache_read_tokens: null,
    provider_side_cache_write_tokens: null,
  };
}

function ref(refType: string, refId: string): TopicSelectionFunctionalRef {
  return {
    ref_type: refType,
    ref_id: refId,
    title_card_id: TITLE_CARD_ID,
    version_id: `${refId}@v1`,
  };
}

function hash(value: unknown): string {
  return sha256Text(typeof value === 'string' ? value : stableStringify(value));
}

function safeId(value: string): string {
  return value.replace(/[^a-z0-9]+/giu, '_').replace(/^_+|_+$/gu, '').toLowerCase();
}

// ---------------------------------------------------------------------------
// T-124 S3-α1: D9 resume contract (registered runtime-stress must-check cases)
// ---------------------------------------------------------------------------

function resumeTraceServiceFixture(
  base: { runtimeAdmission: PaperImplementationRuntimeAdmissionService; projectRepository: InMemoryPaperImplementationRepository },
  gateway: TopicSelectionAgentOrchestratorLlmGateway,
) {
  let sequence = 0;
  const idFactory = (prefix: string) => `resume_${prefix}_${++sequence}`;
  const controlPlaneRepository = new InMemoryTopicSelectionControlPlaneRepository();
  const controlPlane = new TopicSelectionControlPlaneService(controlPlaneRepository, {
    idFactory,
    now: () => NOW,
  });
  const orchestrator = new TopicSelectionAgentOrchestratorService({
    controlPlane,
    llmGateway: gateway,
    now: () => NOW,
  });
  return new PaperImplementationTraceIntegrityDebateRuntimeService({
    projectRepository: base.projectRepository,
    runtimeAdmission: base.runtimeAdmission,
    agentOrchestrator: orchestrator,
    idFactory,
    now: () => NOW,
  });
}

test('L5 trace resume reuses the admitted role prefix without re-issuing provider calls', async () => {
  const failingGateway = new ScriptedLlmGateway((request) => {
    if (request.executionContext.operation === 'trace_integrity_review.support_mapper_reconcile') {
      throw new LlmGatewayError('TimeoutError', 'fixture trace reconcile timeout', {
        telemetry: telemetry(request),
      });
    }
    return traceRoleOutput(request.executionContext.operation);
  });
  const fixture = realRuntimeFixture(failingGateway);
  const interrupted = await fixture.traceService.runBoundaryDebate(PROJECT_ID, traceRequest({
    run_id: 'trace_l5_resume_run_001',
  }));
  assert.equal(interrupted.status, 'failed_runtime');
  assert.equal(failingGateway.calls.length, 4);
  const admittedPrefixIds = interrupted.runtime_artifacts
    .slice(0, 2)
    .map((artifact) => artifact.runtime_artifact_id);

  const resumeGateway = new ScriptedLlmGateway((request) => traceRoleOutput(request.executionContext.operation));
  const resumeService = resumeTraceServiceFixture(fixture, resumeGateway);
  const resumed = await resumeService.runBoundaryDebate(PROJECT_ID, {
    ...traceRequest({ run_id: 'trace_l5_resume_run_001' }),
    run_id: null,
    resume_from_run_id: 'trace_l5_resume_run_001',
  });

  assert.equal(resumed.status, 'passed');
  // Zero provider replay of the admitted prefix — only reconcile + arbiter run.
  assert.deepEqual(resumeGateway.calls.map((call) => call.executionContext.operation), [
    'trace_integrity_review.support_mapper_reconcile',
    'trace_integrity_review.arbiter_final',
  ]);
  assert.deepEqual(
    resumed.runtime_artifacts.slice(0, 2).map((artifact) => artifact.runtime_artifact_id),
    admittedPrefixIds,
  );
  const roleArtifacts = resumed.runtime_artifacts.filter((artifact) => artifact.artifact_scope === 'role');
  assert.deepEqual(roleArtifacts.map((artifact) => artifact.call_index), [1, 2, 4, 5]);
  assert.equal(resumed.final_admission_record?.admission_status, 'admitted');
  assert.deepEqual(
    resumed.final_runtime_artifact?.prior_role_artifact_hashes,
    roleArtifacts.map((artifact) => artifact.artifact_payload_hash),
  );
  assertNoNonProviderRuntimeArtifacts(resumed.runtime_artifacts);

  // Idempotent completion: a second resume returns the original final without provider calls.
  const idempotentGateway = new ScriptedLlmGateway((request) => traceRoleOutput(request.executionContext.operation));
  const idempotentService = resumeTraceServiceFixture(fixture, idempotentGateway);
  const idempotent = await idempotentService.runBoundaryDebate(PROJECT_ID, {
    ...traceRequest({ run_id: 'trace_l5_resume_run_001' }),
    run_id: null,
    resume_from_run_id: 'trace_l5_resume_run_001',
  });
  assert.equal(idempotentGateway.calls.length, 0);
  assert.equal(
    idempotent.final_runtime_artifact?.runtime_artifact_id,
    resumed.final_runtime_artifact?.runtime_artifact_id,
  );
});

test('L5 trace resume rejects identity drift with 409 before any provider call', async () => {
  const failingGateway = new ScriptedLlmGateway((request) => {
    if (request.executionContext.operation === 'trace_integrity_review.support_mapper_reconcile') {
      throw new LlmGatewayError('TimeoutError', 'fixture trace reconcile timeout', {
        telemetry: telemetry(request),
      });
    }
    return traceRoleOutput(request.executionContext.operation);
  });
  const fixture = realRuntimeFixture(failingGateway);
  const interrupted = await fixture.traceService.runBoundaryDebate(PROJECT_ID, traceRequest({
    run_id: 'trace_l5_resume_drift_run_001',
  }));
  assert.equal(interrupted.status, 'failed_runtime');

  const resumeGateway = new ScriptedLlmGateway((request) => traceRoleOutput(request.executionContext.operation));
  const resumeService = resumeTraceServiceFixture(fixture, resumeGateway);
  await assert.rejects(
    () => resumeService.runBoundaryDebate(PROJECT_ID, {
      ...traceRequest({
        run_id: 'trace_l5_resume_drift_run_001',
        source_excerpt: 'a drifted source excerpt that changes the retrieval identity',
      }),
      run_id: null,
      resume_from_run_id: 'trace_l5_resume_drift_run_001',
    }),
    (error: unknown) => error instanceof AppError
      && error.statusCode === 409
      && error.errorCode === 'VERSION_CONFLICT',
  );
  assert.equal(resumeGateway.calls.length, 0);
});

// T-124 S4-D: registered runtime-stress must-check case
// (coordinator_queue_classification_exhaustive_no_unclassified). Pins the
// retired blocked-lane `unclassified` fallback: every registered trusted code
// (exact + prefix) and every LLM-sourced untrusted code classifies to a real
// queue type across both reachable blocked-lane outcomes, and `unclassified`
// is reachable on exactly one path — an unregistered TRUSTED code on a
// `blocked` step.
//
// S4-D leak-fix interaction (upstream of this pure classifier): the R4
// zero-provider-call promotion now EXCLUDES the infra-semantic terminal codes
// (`INTERNAL_ERROR`, `SLOT_INVOCATION_FAILED`) — those reach the TRUSTED set
// only through the coordinator's own invocation-boundary catch, never the
// payload-author-controllable preflight echo. This does not weaken the
// "unclassified reachable only via an unregistered trusted code" argument:
// the excluded codes are REGISTERED (exact table → failed_workflow), so they
// were never an unclassified source; the sole real-world producer of an
// UNREGISTERED trusted code stays the R4 echo of an unknown preflight code,
// which this test forges directly below.
test('L5 coordinator queue classification is exhaustive over blocked-lane trusted codes and outcomes with unclassified reachable only via an unregistered trusted code', () => {
  const outcomes = ['blocked', 'failed_runtime'] as const;

  // Every registered exact trusted code → its mapped queue type, never unclassified.
  for (const [code, expected] of Object.entries(PAPER_IMPLEMENTATION_COORDINATOR_QUEUE_TYPE_BY_BLOCKER_CODE)) {
    for (const outcome of outcomes) {
      const result = classifyPaperImplementationCoordinatorBlockedStep(outcome, [code], []);
      assert.notEqual(result.queue_type, 'unclassified', `exact trusted ${code} on ${outcome}`);
      assert.equal(result.queue_type, expected, `exact trusted ${code} on ${outcome}`);
      assert.equal(result.dedup_blocker, code);
    }
  }

  // Every registered prefix family → its mapped queue type, never unclassified.
  for (const [prefix, expected] of PAPER_IMPLEMENTATION_COORDINATOR_QUEUE_TYPE_BY_BLOCKER_PREFIX) {
    const code = `${prefix}L5_EXHAUSTIVE_PROBE`;
    assert.equal(PAPER_IMPLEMENTATION_COORDINATOR_QUEUE_TYPE_BY_BLOCKER_CODE[code], undefined);
    for (const outcome of outcomes) {
      const result = classifyPaperImplementationCoordinatorBlockedStep(outcome, [code], []);
      assert.notEqual(result.queue_type, 'unclassified', `prefix ${prefix} on ${outcome}`);
      assert.equal(result.queue_type, expected, `prefix ${prefix} on ${outcome}`);
    }
  }

  // The coordinator's own self-produced trusted code literals are all registered.
  for (const code of ['COORDINATOR_NO_ELIGIBLE_CANDIDATE', 'SLOT_INVOCATION_FAILED', 'INTERNAL_ERROR', 'TIER_BUDGET_INSUFFICIENT']) {
    for (const outcome of outcomes) {
      assert.notEqual(
        classifyPaperImplementationCoordinatorBlockedStep(outcome, [code], []).queue_type,
        'unclassified',
        `self-produced ${code} on ${outcome}`,
      );
    }
  }

  // LLM-sourced untrusted codes maintain the outcome fallback with zero unclassified.
  for (const [code, expected] of Object.entries(PAPER_IMPLEMENTATION_COORDINATOR_QUEUE_TYPE_BY_SLOT_BLOCKER_CODE)) {
    for (const outcome of outcomes) {
      const result = classifyPaperImplementationCoordinatorBlockedStep(outcome, [], [code]);
      assert.notEqual(result.queue_type, 'unclassified', `whitelist slot ${code} on ${outcome}`);
      assert.equal(result.queue_type, expected, `whitelist slot ${code} on ${outcome}`);
      assert.equal(result.dedup_blocker, `outcome:${outcome}`);
    }
  }
  for (const code of ['SOME_NOVEL_SLOT_BLOCKER', 'TIER_BUDGET_INSUFFICIENT', 'TRACE_REPAIR_FORGED', 'INTERNAL_ERROR']) {
    assert.equal(
      classifyPaperImplementationCoordinatorBlockedStep('failed_runtime', [], [code]).queue_type,
      'failed_run_review',
    );
    assert.equal(classifyPaperImplementationCoordinatorBlockedStep('blocked', [], [code]).queue_type, 'human_review');
  }

  // The SOLE reachable path to unclassified: an unregistered trusted code on a blocked step.
  const forged = 'L5_FORGED_UNREGISTERED_TRUSTED_CODE';
  assert.equal(PAPER_IMPLEMENTATION_COORDINATOR_QUEUE_TYPE_BY_BLOCKER_CODE[forged], undefined);
  assert.ok(!PAPER_IMPLEMENTATION_COORDINATOR_QUEUE_TYPE_BY_BLOCKER_PREFIX.some(([prefix]) => forged.startsWith(prefix)));
  assert.deepEqual(
    classifyPaperImplementationCoordinatorBlockedStep('blocked', [forged], []),
    { queue_type: 'unclassified', primary_blocker: forged, dedup_blocker: forged },
  );
  assert.equal(
    classifyPaperImplementationCoordinatorBlockedStep('failed_runtime', [forged], []).queue_type,
    'failed_run_review',
  );
  assert.equal(classifyPaperImplementationCoordinatorBlockedStep('blocked', [], [forged]).queue_type, 'human_review');
});

// S4-C L5 must-checks: shadow ComplexityAssessment is record-only.
test('L5 shadow complexity assessment is replayable for the same inputs', () => {
  const shadowInputs = {
    reviewed_statement_count: 6,
    retrieval_packet_ref_count: 4,
    prior_blocker_density: 0.3,
    target_kind: 'trace_integrity' as const,
  };
  const first = assessPaperImplementationDebateComplexityShadow(shadowInputs);
  const second = assessPaperImplementationDebateComplexityShadow(shadowInputs);
  assert.equal(first.recommended_tier, second.recommended_tier);
  assert.equal(first.inputs_hash, second.inputs_hash);
  assert.deepEqual(first.rationale_codes, second.rationale_codes);
  // The tier is input-driven, not a constant: a heavier input escalates it.
  const heavier = assessPaperImplementationDebateComplexityShadow({
    ...shadowInputs,
    reviewed_statement_count: 12,
  });
  assert.notEqual(heavier.inputs_hash, first.inputs_hash);
  assert.equal(heavier.recommended_tier, 'full');
});

test('L5 shadow telemetry collection does not change run artifact hashes', async () => {
  const runTrace = async (withCollector: boolean) => {
    const gateway = new ScriptedLlmGateway((request) =>
      traceRoleOutput(request.executionContext.operation));
    const repository = new InMemoryPaperImplementationRuntimeRepository();
    let sequence = 0;
    const idFactory = (prefix: string) => `${prefix}_${++sequence}`;
    let telemetrySequence = 0;
    const telemetryIdFactory = (prefix: string) => `${prefix}_tel_${++telemetrySequence}`;
    const runtimeAdmission = new PaperImplementationRuntimeAdmissionService({
      repository,
      idFactory,
      now: () => NOW,
    });
    const projectRepository = projectRepositoryFixture(implementationProjectFixture());
    const controlPlane = new TopicSelectionControlPlaneService(
      new InMemoryTopicSelectionControlPlaneRepository(),
      { idFactory, now: () => NOW },
    );
    const orchestrator = new TopicSelectionAgentOrchestratorService({
      controlPlane,
      llmGateway: gateway,
      now: () => NOW,
    });
    const telemetryRepository = new InMemoryPaperImplementationRuntimeTelemetryRepository();
    const telemetryCollector = withCollector
      ? new PaperImplementationRuntimeTelemetryService({
        repository: telemetryRepository,
        idFactory: telemetryIdFactory,
        now: () => NOW,
      })
      : null;
    const traceService = new PaperImplementationTraceIntegrityDebateRuntimeService({
      projectRepository,
      runtimeAdmission,
      agentOrchestrator: orchestrator,
      telemetryCollector,
      idFactory,
      now: () => NOW,
    });
    const result = await traceService.runBoundaryDebate(PROJECT_ID, traceRequest({
      run_id: 'trace_l5_shadow_invariance_run_001',
    }));
    return { result, telemetryRepository };
  };

  const baseline = await runTrace(false);
  const withShadow = await runTrace(true);

  assert.equal(baseline.result.status, 'passed');
  assert.equal(withShadow.result.status, 'passed');

  const hashSignature = (artifacts: PaperImplementationRuntimeArtifactEnvelope[]) =>
    artifacts.map((artifact) => ({
      payload: artifact.artifact_payload_hash,
      identity: artifact.runtime_identity_hash,
    }));
  assert.deepEqual(
    hashSignature(withShadow.result.runtime_artifacts),
    hashSignature(baseline.result.runtime_artifacts),
  );

  // The shadow path was genuinely exercised: every recorded provider call carries a shadow tier.
  const records = await withShadow.telemetryRepository.listRuntimeTelemetryRecordsByProject(PROJECT_ID);
  assert.ok(records.length > 0);
  assert.equal(records.every((record) => record.shadow_tier !== null), true);
  // D2 复审 (B#6/C#3): the trace-integrity boundary debate is the ENFORCED-tier
  // slot, so every recorded row carries tier_mode='enforced' (not shadow).
  assert.equal(records.every((record) => record.tier_mode === 'enforced'), true);
  // The baseline (no collector) wrote no telemetry at all.
  const baselineRecords = await baseline.telemetryRepository.listRuntimeTelemetryRecordsByProject(PROJECT_ID);
  assert.equal(baselineRecords.length, 0);
});

// S4 复审 FA-3 regression (registered L5 must-check): a debate-slot technical
// retry records a UNIQUE call_index per provider attempt, so the run's repaid
// rate is the retried attempt's cost ratio — the pre-FA-3 shared call_index
// made the replacement attempt a duplicate replay and double-counted the
// retry as repaid.
test('L5 debate slot technical retry records unique call_index per attempt and a cost-ratio repaid rate', async () => {
  let skepticAttempts = 0;
  const gateway: TopicSelectionAgentOrchestratorLlmGateway = {
    async createStructuredOutput<T>(
      request: LlmStructuredOutputRequest,
    ): Promise<LlmStructuredOutputResponse<T>> {
      const operation = request.executionContext.operation;
      if (operation === 'trace_integrity_review.skeptic_challenge') {
        skepticAttempts += 1;
        if (skepticAttempts === 1) {
          throw new LlmGatewayError('TimeoutError', 'fixture skeptic timeout', {
            telemetry: { ...telemetry(request), cost_usd: 0.02 },
          });
        }
      }
      return {
        parsed: traceRoleOutput(operation) as T,
        raw: { redacted_stub: true },
        telemetry: { ...telemetry(request), cost_usd: 0.03 },
      };
    },
  };
  const repository = new InMemoryPaperImplementationRuntimeRepository();
  let sequence = 0;
  const idFactory = (prefix: string) => `${prefix}_${++sequence}`;
  let telemetrySequence = 0;
  const runtimeAdmission = new PaperImplementationRuntimeAdmissionService({
    repository,
    idFactory,
    now: () => NOW,
  });
  const controlPlane = new TopicSelectionControlPlaneService(
    new InMemoryTopicSelectionControlPlaneRepository(),
    { idFactory, now: () => NOW },
  );
  const orchestrator = new TopicSelectionAgentOrchestratorService({
    controlPlane,
    llmGateway: gateway,
    now: () => NOW,
  });
  const telemetryService = new PaperImplementationRuntimeTelemetryService({
    repository: new InMemoryPaperImplementationRuntimeTelemetryRepository(),
    idFactory: (prefix) => `${prefix}_tel_${++telemetrySequence}`,
    now: () => NOW,
  });
  const traceService = new PaperImplementationTraceIntegrityDebateRuntimeService({
    projectRepository: projectRepositoryFixture(implementationProjectFixture()),
    runtimeAdmission,
    agentOrchestrator: orchestrator,
    telemetryCollector: telemetryService,
    idFactory,
    now: () => NOW,
  });

  const result = await traceService.runBoundaryDebate(PROJECT_ID, traceRequest({
    run_id: 'trace_l5_retry_telemetry_run_001',
  }));
  assert.equal(result.status, 'passed');
  assert.equal(skepticAttempts, 2);

  const detail = await telemetryService.getRunDetail(PROJECT_ID, 'trace_l5_retry_telemetry_run_001');
  // 5 provider attempts: map, skeptic (timeout), skeptic (retry), reconcile, arbiter.
  assert.equal(detail.records.length, 5);
  const skepticRecords = detail.records
    .filter((record) => record.role_slot_id === 'trace_integrity_review.skeptic_challenge')
    .sort((left, right) => left.call_index - right.call_index);
  assert.deepEqual(skepticRecords.map((record) => record.call_index), [1, 2]);
  assert.deepEqual(skepticRecords.map((record) => record.outcome), ['retried', 'passed']);
  assert.deepEqual(skepticRecords.map((record) => record.retry_kind), ['technical', null]);

  // Repaid = the retried attempt only (0.02 of 0.02 + 4 × 0.03) — a cost
  // ratio, NOT 1.0-style double counting of retry + replacement.
  assert.equal(detail.total_cost_usd, 0.14);
  assert.equal(detail.repaid_cost_usd, 0.02);
  assert.equal(detail.repaid_cost_rate, Math.round((0.02 / 0.14) * 1e6) / 1e6);
});

// ── T-124 D2-pre1 (appended at file tail) ────────────────────────────────────
// gs001-lora-live-006/007 root cause: the risk challenger received only the
// designer artifact ref/hash + option_set_hash, never the designed_options body,
// so it self-reported MISSING_DESIGNER_OPTION_KEYS / MISSING_DESIGNER_ARTIFACT_CONTENT
// and blocked on content it never saw. This drives the REAL orchestrator with a
// challenger fixture that reconstructs its full coverage purely from the
// designed_options body it reads out of its own gateway user message — proving
// the designer's complete option content (every key + its fields) reaches the
// challenger's call context and the two-role chain passes end to end.
test('L5 motive evolution challenger receives the designer designed_options body and challenges every option key', async () => {
  const challengerDesignedOptionsSeen: Array<Record<string, Record<string, unknown>>> = [];
  const gateway = new ScriptedLlmGateway((request) => {
    if (request.executionContext.operation === PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_RISK_CHALLENGER_ROLE_SLOT_ID) {
      const userMessage = request.messages.find((message) => message.role === 'user')?.content ?? '{}';
      const parsed = JSON.parse(userMessage) as {
        prior_role_artifacts?: Array<{ designed_options?: Record<string, Record<string, unknown>> }>;
      };
      const designedOptions = parsed.prior_role_artifacts?.[0]?.designed_options ?? {};
      challengerDesignedOptionsSeen.push(designedOptions);
      // Coverage is derived ONLY from the designer body the challenger can see —
      // before D2-pre1 this map was absent and no key could be challenged.
      const seenKeys = Object.keys(designedOptions).sort();
      const decisionOptions = Object.fromEntries(
        seenKeys.map((key) => [key, motiveEvolutionDecisionOption()]),
      );
      return motiveEvolutionWire(motiveEvolutionRiskChallengerRoleOutput(
        motiveEvolutionPriorFromGatewayRequest(request),
        { challenged_option_keys: seenKeys, decision_options: decisionOptions },
      ));
    }
    return motiveEvolutionWire(motiveEvolutionDesignerRoleOutput({
      designed_options: {
        ...motiveEvolutionDesignedOptionsByKey('evolution_option_l5_001'),
        ...motiveEvolutionDesignedOptionsByKey('evolution_option_l5_002'),
      },
    }));
  });
  const { motiveEvolutionService } = realRuntimeFixture(gateway);

  const result = await motiveEvolutionService.runEvolutionDecisionSupport(PROJECT_ID, motiveEvolutionRequest({
    run_id: 'motive_evolution_l5_designer_body_thread_run_001',
  }));

  assert.equal(result.status, 'passed');
  assert.equal(result.provider_call_count, 2);
  // The challenger's context carried the designer's FULL designed_options body —
  // every option key and its fields, not just refs/hashes.
  assert.equal(challengerDesignedOptionsSeen.length, 1);
  const seenDesignedOptions = challengerDesignedOptionsSeen[0] ?? {};
  assert.deepEqual(
    Object.keys(seenDesignedOptions).sort(),
    ['evolution_option_l5_001', 'evolution_option_l5_002'],
  );
  assert.equal(
    (seenDesignedOptions.evolution_option_l5_001 as { option_kind?: string } | undefined)?.option_kind,
    'repair_evidence_board_first',
  );
  const finalPayload = result.final_runtime_artifact?.artifact_payload as {
    decision_options?: Record<string, Record<string, unknown>>;
  };
  assert.deepEqual(
    Object.keys(finalPayload.decision_options ?? {}).sort(),
    ['evolution_option_l5_001', 'evolution_option_l5_002'],
  );
  assert.equal(result.final_admission_record?.admission_status, 'admitted');
  assertNoNonProviderRuntimeArtifacts(result.runtime_artifacts);
  assertNoLeak(result, motiveEvolutionForbiddenWriteFragments());
});

// ---------------------------------------------------------------------------
// T-133 P2 (D-133-2/3): the motive lane driven end-to-end through the
// coordinator in provider mode — confirmable lineage option park,
// confirm-and-continue, mixed-defect red line, and the verb locks.
// ---------------------------------------------------------------------------

const T133_PARK_OPTION_KEY = 'evolution_option_l5_park_001';
const T133_REPAIR_OPTION_KEY = 'evolution_option_l5_001';

function t133MotiveLaneSlotPayloads(): Record<string, Record<string, unknown>> {
  // Lane B couples the two slots through the same frozen source refs/hashes
  // bundle — use the union of both fixtures' bundles so every slot-side
  // refs-subset check keeps holding.
  const decompositionBase = motiveDecompositionRequest();
  const evolutionBase = motiveEvolutionRequest();
  const bundle = {
    source_refs: [...decompositionBase.source_refs, ...evolutionBase.source_refs],
    source_hashes: [...decompositionBase.source_hashes, ...evolutionBase.source_hashes],
  };
  const strip = (request: Record<string, unknown>): Record<string, unknown> => {
    const payload = { ...request };
    for (const field of ['run_id', 'run_mode', 'execution_mode']) {
      delete payload[field];
    }
    return payload;
  };
  return {
    [PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_SLOT_ID]:
      strip(motiveDecompositionRequest(bundle) as unknown as Record<string, unknown>),
    [PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_SLOT_ID]:
      strip(motiveEvolutionRequest(bundle) as unknown as Record<string, unknown>),
  };
}

function t133ParkDesignedOptionOverrides(): Partial<PaperImplementationMotiveEvolutionDesignedOption> {
  return {
    option_kind: 'park',
    portfolio_impact_class: 'lineage_change',
    human_confirmation_required: true,
    recommended_next_gate: 'human_confirmation',
  };
}

function t133DesignerOutputWithPark(): PaperImplementationMotiveEvolutionOptionDesignerRoleOutput {
  return motiveEvolutionDesignerRoleOutput({
    designed_options: {
      [T133_REPAIR_OPTION_KEY]: motiveEvolutionDesignedOption(),
      [T133_PARK_OPTION_KEY]: motiveEvolutionDesignedOption(t133ParkDesignedOptionOverrides()),
    },
    option_set_hash: hash('motive-evolution-option-set-t133-park'),
  });
}

function t133ChallengerOutputWithPark(
  prior: MotiveEvolutionPriorRoleMaterial,
  options: { mixedDefect?: boolean } = {},
): PaperImplementationMotiveEvolutionRiskChallengerRoleOutput {
  return motiveEvolutionRiskChallengerRoleOutput(prior, {
    challenged_option_keys: [T133_REPAIR_OPTION_KEY, T133_PARK_OPTION_KEY],
    decision_options: {
      [T133_REPAIR_OPTION_KEY]: motiveEvolutionDecisionOption(),
      [T133_PARK_OPTION_KEY]: motiveEvolutionDecisionOption({
        ...t133ParkDesignedOptionOverrides(),
        blocker_codes: ['human_confirmation_required_for_lineage_change_t133'],
        challenge_check: motiveEvolutionChallengeCheck({
          evidence_status: 'satisfied',
          trace_status: 'satisfied',
          portfolio_status: 'satisfied',
          downstream_impact_status: options.mixedDefect ? 'blocked' : 'satisfied',
          human_confirmation_status: 'blocked',
          blocking_reason_codes: options.mixedDefect
            ? ['human_confirmation_missing_t133', 'downstream_impact_unassessed_t133']
            : ['human_confirmation_missing_t133'],
        }),
      }),
    },
  });
}

function t133MotiveLaneGateway(options: { mixedDefect?: boolean } = {}): ScriptedLlmGateway {
  return new ScriptedLlmGateway((request) => {
    const operation = request.executionContext.operation;
    if (operation === PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_RISK_CHALLENGER_ROLE_SLOT_ID) {
      return motiveEvolutionWire(
        t133ChallengerOutputWithPark(motiveEvolutionPriorFromGatewayRequest(request), options),
      );
    }
    if (operation === PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_OPTION_DESIGNER_ROLE_SLOT_ID) {
      return motiveEvolutionWire(t133DesignerOutputWithPark());
    }
    return motiveDecompositionRoleOutput();
  });
}

async function t133ParkedMotiveLaneRun(options: { mixedDefect?: boolean } = {}): Promise<{
  gateway: ScriptedLlmGateway;
  lane: ReturnType<typeof t133ValidationPlanningLaneFixture>;
  runId: string;
  advanced: Awaited<ReturnType<PaperImplementationRunCoordinatorService['advance']>>;
}> {
  const gateway = t133MotiveLaneGateway(options);
  const lane = t133ValidationPlanningLaneFixture(gateway);
  const run = await lane.coordinator.createCoordinatorRun(PROJECT_ID, {
    lane_id: 'motive',
    run_mode: 'product',
    execution_mode: 'provider_llm',
    budget_envelope: { max_steps: 5, max_provider_calls: 8 },
    slot_request_payloads: t133MotiveLaneSlotPayloads(),
  });
  const advanced = await lane.coordinator.advance(PROJECT_ID, run.coordinator_run_id, {
    holder_id: 'holder_t133_motive_lane',
  });
  return { gateway, lane, runId: run.coordinator_run_id, advanced };
}

async function t133SeedApprovedEvolutionDecision(
  lane: ReturnType<typeof t133ValidationPlanningLaneFixture>,
  options: {
    applicationStatus?: MotiveEvolutionDecision['application_status'];
    idSuffix?: string;
    decisionCreatedAt?: string;
    sourceMotiveRefId?: string;
    confirmation?: 'consumed' | 'wrong_scope' | 'wrong_consumer' | 'none';
  } = {},
): Promise<{ decisionId: string; confirmationId: string }> {
  const suffix = options.idSuffix ?? '001';
  const decisionId = `motive_evolution_decision_t133_park_${suffix}`;
  const confirmationId = `human_confirmation_t133_park_${suffix}`;
  const confirmationMode = options.confirmation ?? 'consumed';
  if (confirmationMode !== 'none') {
    await lane.humanConfirmationRepository.createHumanConfirmationRecord({
      confirmation_record_id: confirmationId,
      implementation_project_id: PROJECT_ID,
      confirmation_scope: confirmationMode === 'wrong_scope'
        ? 'motive_portfolio_decision'
        : 'motive_evolution_decision',
      target_refs: [ref('core_motive', 'core_motive_motive_evolution_l5_001')],
      reviewed_sources: [],
      transition_attempt_ref: null,
      gate_result_refs: [],
      rationale: 'Reviewed the park option and its lineage impact before confirming.',
      confirmed_by_actor_type: 'human',
      confirmed_by_actor_id: 'reviewer_t133_001',
      policy_version_id: null,
      status: 'active',
      status_reason: null,
      created_at: NOW,
      updated_at: null,
      consumed_at: NOW,
      consumed_by_ref: {
        ref_type: 'motive_evolution_decision',
        ref_id: confirmationMode === 'wrong_consumer' ? 'motive_evolution_decision_someone_else' : decisionId,
        title_card_id: null,
        version_id: null,
      },
    });
  }
  await lane.motiveRepository.createMotiveEvolutionDecision({
    motive_evolution_decision_id: decisionId,
    implementation_project_id: PROJECT_ID,
    source_motive_refs: [ref('core_motive', options.sourceMotiveRefId ?? 'core_motive_motive_evolution_l5_001')],
    triggering_validation_cycle_refs: [],
    triggering_result_packet_refs: [],
    triggering_cross_board_review_refs: [],
    triggering_human_request_refs: [],
    evolution_type: 'park',
    effect_class: 'structural_evolution',
    decision_summary: 'Park the motive pending the lineage decision.',
    decision_rationale: 'The park option was human-confirmed through the authority chain.',
    change_set: {},
    proposed_outputs: {},
    evidence_basis: {},
    impact_analysis: {},
    gate: {},
    proposed_by: 'human',
    confirmed_by: confirmationMode === 'none' ? null : 'human',
    human_confirmation_required: confirmationMode !== 'none',
    confirmation_ref: confirmationMode === 'none'
      ? null
      : {
        ref_type: 'human_confirmation_record',
        ref_id: confirmationId,
        title_card_id: null,
        version_id: null,
      },
    application_status: options.applicationStatus ?? 'approved',
    trace_manifest_ref: null,
    trace_manifest_id: 'trace_manifest_t133_park_001',
    policy_version_id: null,
    created_at: options.decisionCreatedAt ?? NOW,
  });
  return { decisionId, confirmationId };
}

test('L5 motive evolution confirmable lineage option parks the coordinator run as waiting_review across the full chain (T-133 P2)', async () => {
  const { gateway, lane, advanced } = await t133ParkedMotiveLaneRun();

  // decomposition (1 call) + designer + challenger (2 calls).
  assert.equal(gateway.calls.length, 3);
  assert.equal(advanced.run.run_status, 'waiting_review');
  assert.equal(advanced.steps.length, 2);
  assert.equal(advanced.steps[0]?.outcome, 'passed');
  assert.equal(advanced.steps[1]?.outcome, 'waiting_review');
  assert.equal(advanced.steps[1]?.slot_id, PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_SLOT_ID);
  // The final is PASSED: the awaiting-human option's codes stayed on the
  // option (audit) and out of the final blockers; the server-derived
  // human-decision keys carry exactly the park option.
  const finals = await lane.fixture.repository.listRuntimeArtifacts(PROJECT_ID, {
    slot_id: PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_SLOT_ID,
    artifact_scope: 'final',
  });
  assert.equal(finals.length, 1);
  assert.equal(finals[0]?.runtime_status, 'passed');
  const payload = finals[0]?.artifact_payload as {
    blockers?: string[];
    human_decision_required_option_keys?: string[];
    decision_options?: Record<string, { blocker_codes?: string[] }>;
  };
  assert.deepEqual(payload.human_decision_required_option_keys, [T133_PARK_OPTION_KEY]);
  assert.deepEqual(payload.blockers, []);
  assert.deepEqual(
    payload.decision_options?.[T133_PARK_OPTION_KEY]?.blocker_codes,
    ['human_confirmation_required_for_lineage_change_t133'],
  );
  // Semantic stop, not a blocker — no decision-queue item.
  assert.equal((await lane.harnessRepository.listDecisionWorkQueueItems(PROJECT_ID)).length, 0);
});

test('L5 motive evolution confirm-and-continue completes the motive lane without re-running the slot (T-133 P2)', async () => {
  const { gateway, lane, runId, advanced } = await t133ParkedMotiveLaneRun();
  assert.equal(advanced.run.run_status, 'waiting_review');
  const { decisionId, confirmationId } = await t133SeedApprovedEvolutionDecision(lane);

  const resumed = await lane.coordinator.advance(PROJECT_ID, runId, {
    holder_id: 'holder_t133_confirm_reviewer',
    review_acceptance: {
      slot_id: PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_SLOT_ID,
      decision_ref: decisionId,
      acceptance_actor_id: 'reviewer_t133_001',
    },
  });

  // Zero re-runs: the gateway saw no additional calls.
  assert.equal(gateway.calls.length, 3);
  assert.equal(resumed.run.run_status, 'completed');
  const evolutionSteps = resumed.steps.filter(
    (step) => step.slot_id === PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_SLOT_ID,
  );
  assert.deepEqual(evolutionSteps.map((step) => step.outcome), ['waiting_review', 'passed']);
  const accepted = evolutionSteps[1]!;
  assert.equal(accepted.provider_call_count, 0);
  assert.equal(accepted.runtime_artifact_id, evolutionSteps[0]?.runtime_artifact_id);
  assert.equal(accepted.runtime_artifact_hash, evolutionSteps[0]?.runtime_artifact_hash);
  assert.deepEqual(accepted.review_acceptance, {
    decision_ref: decisionId,
    human_confirmation_ref: confirmationId,
    acceptance_actor_id: 'reviewer_t133_001',
  });
  assert.equal(accepted.advance_holder_id, 'holder_t133_confirm_reviewer');
});

test('L5 motive evolution mixed-defect blocked final stays a terminal blocked with a decision-queue item (T-133 P2 red line)', async () => {
  const { lane, advanced } = await t133ParkedMotiveLaneRun({ mixedDefect: true });

  assert.equal(advanced.run.run_status, 'blocked');
  assert.equal(advanced.steps[1]?.outcome, 'blocked');
  const finals = await lane.fixture.repository.listRuntimeArtifacts(PROJECT_ID, {
    slot_id: PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_SLOT_ID,
    artifact_scope: 'final',
  });
  assert.equal(finals[0]?.runtime_status, 'blocked');
  const payload = finals[0]?.artifact_payload as { blockers?: string[] };
  assert.deepEqual(payload.blockers, ['human_confirmation_required_for_lineage_change_t133']);
  const queueItems = await lane.harnessRepository.listDecisionWorkQueueItems(PROJECT_ID);
  assert.equal(queueItems.length, 1);
  assert.equal(queueItems[0]?.queue_type, 'human_review');
});

test('L5 motive evolution human-decision stop rejects a re-advance without review_acceptance (T-133 verb lock)', async () => {
  const { gateway, lane, runId, advanced } = await t133ParkedMotiveLaneRun();
  assert.equal(advanced.run.run_status, 'waiting_review');

  await assert.rejects(
    lane.coordinator.advance(PROJECT_ID, runId, { holder_id: 'holder_t133_plain_re_advance' }),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.statusCode, 409);
      assert.equal(error.errorCode, 'GATE_CONSTRAINT_FAILED');
      return true;
    },
  );
  // The lock fails closed before any slot execution.
  assert.equal(gateway.calls.length, 3);
  // T-133 P3 review fix (adversarial C1): the rejection must never terminalize
  // the park — the run stays waiting_review and its lease is released.
  const surviving = await lane.coordinator.getCoordinatorRun(PROJECT_ID, runId);
  assert.equal(surviving.run.run_status, 'waiting_review');
  assert.equal(surviving.run.lease, null);
});

test('L5 motive evolution review_acceptance rejects an unapproved decision and the revise-family slot (T-133 confirm gate)', async () => {
  const { lane, runId, advanced } = await t133ParkedMotiveLaneRun();
  assert.equal(advanced.run.run_status, 'waiting_review');
  const { decisionId } = await t133SeedApprovedEvolutionDecision(lane, { applicationStatus: 'proposed' });

  // A proposed (unapproved) decision cannot accept the stop.
  await assert.rejects(
    lane.coordinator.advance(PROJECT_ID, runId, {
      holder_id: 'holder_t133_unapproved',
      review_acceptance: {
        slot_id: PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_SLOT_ID,
        decision_ref: decisionId,
        acceptance_actor_id: 'reviewer_t133_001',
      },
    }),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.statusCode, 409);
      assert.equal(error.errorCode, 'GATE_CONSTRAINT_FAILED');
      return true;
    },
  );
  // C1 pin: the rejected confirm leaves the park intact.
  assert.equal((await lane.coordinator.getCoordinatorRun(PROJECT_ID, runId)).run.run_status, 'waiting_review');

  // The revise-family (skeptic) stop rejects the confirm verb outright.
  const skepticGateway = t133LaneAGateway({
    skepticOutputForCall: (_index, payload) => t133ReviseSkepticOutput(payload),
  });
  const skepticLane = t133ValidationPlanningLaneFixture(skepticGateway);
  const skepticRun = await skepticLane.coordinator.createCoordinatorRun(PROJECT_ID, {
    lane_id: 'validation-planning',
    run_mode: 'product',
    execution_mode: 'provider_llm',
    budget_envelope: { max_steps: 6, max_provider_calls: 8 },
    slot_request_payloads: t133LaneASlotPayloads(),
  });
  const parked = await skepticLane.coordinator.advance(PROJECT_ID, skepticRun.coordinator_run_id, {
    holder_id: 'holder_t133_skeptic_park',
  });
  assert.equal(parked.run.run_status, 'waiting_review');
  await assert.rejects(
    skepticLane.coordinator.advance(PROJECT_ID, skepticRun.coordinator_run_id, {
      holder_id: 'holder_t133_wrong_verb',
      review_acceptance: {
        slot_id: PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_SLOT_ID,
        decision_ref: 'motive_evolution_decision_t133_park_001',
        acceptance_actor_id: 'reviewer_t133_001',
      },
    }),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.statusCode, 400);
      assert.equal(error.errorCode, 'INVALID_PAYLOAD');
      return true;
    },
  );
});


test('L5 motive evolution rejected acceptance leaves the run parked and a later valid confirm succeeds (T-133 P3 C1)', async () => {
  // Adversarial C1 regression pin: wrong-verb and invalid-ref advances are
  // client-recoverable — the park must survive every rejection and the ONE
  // legitimate exit must still work afterwards.
  const { gateway, lane, runId, advanced } = await t133ParkedMotiveLaneRun();
  assert.equal(advanced.run.run_status, 'waiting_review');

  // ① plain re-advance (wrong verb) → 409, park survives.
  await assert.rejects(
    lane.coordinator.advance(PROJECT_ID, runId, { holder_id: 'holder_t133_c1_plain' }),
    (error: unknown) => error instanceof AppError && error.statusCode === 409,
  );
  assert.equal((await lane.coordinator.getCoordinatorRun(PROJECT_ID, runId)).run.run_status, 'waiting_review');

  // ② nonexistent decision_ref (typo) → 409, park survives.
  await assert.rejects(
    lane.coordinator.advance(PROJECT_ID, runId, {
      holder_id: 'holder_t133_c1_typo',
      review_acceptance: {
        slot_id: PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_SLOT_ID,
        decision_ref: 'motive_evolution_decision_typo_does_not_exist',
        acceptance_actor_id: 'reviewer_t133_001',
      },
    }),
    (error: unknown) => error instanceof AppError && error.statusCode === 409,
  );
  assert.equal((await lane.coordinator.getCoordinatorRun(PROJECT_ID, runId)).run.run_status, 'waiting_review');

  // ③ the legitimate confirm still succeeds — nothing was terminalized.
  const { decisionId } = await t133SeedApprovedEvolutionDecision(lane, { idSuffix: 'c1' });
  const resumed = await lane.coordinator.advance(PROJECT_ID, runId, {
    holder_id: 'holder_t133_c1_confirm',
    review_acceptance: {
      slot_id: PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_SLOT_ID,
      decision_ref: decisionId,
      acceptance_actor_id: 'reviewer_t133_001',
    },
  });
  assert.equal(resumed.run.run_status, 'completed');
  assert.equal(gateway.calls.length, 3);
});

test('L5 motive evolution review_acceptance confirm-gate negative matrix keeps the park intact (T-133 P3 C2/C3)', async () => {
  const { lane, runId, advanced } = await t133ParkedMotiveLaneRun();
  assert.equal(advanced.run.run_status, 'waiting_review');
  const expectParkedRejection = async (
    decisionId: string,
    expectedStatus: number,
    extra: Record<string, unknown> = {},
  ) => {
    await assert.rejects(
      lane.coordinator.advance(PROJECT_ID, runId, {
        holder_id: 'holder_t133_matrix',
        review_acceptance: {
          slot_id: PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_SLOT_ID,
          decision_ref: decisionId,
          acceptance_actor_id: 'reviewer_t133_001',
        },
        ...extra,
      }),
      (error: unknown) => error instanceof AppError && error.statusCode === expectedStatus,
    );
    assert.equal((await lane.coordinator.getCoordinatorRun(PROJECT_ID, runId)).run.run_status, 'waiting_review');
  };

  // Adversarial C2: an approved decision minted WITHOUT any confirmation
  // (its own human_confirmation_required=false) can never clear the stop.
  const noConfirmation = await t133SeedApprovedEvolutionDecision(lane, { idSuffix: 'nc', confirmation: 'none' });
  await expectParkedRejection(noConfirmation.decisionId, 409);
  // Confirmation with the wrong scope.
  const wrongScope = await t133SeedApprovedEvolutionDecision(lane, { idSuffix: 'ws', confirmation: 'wrong_scope' });
  await expectParkedRejection(wrongScope.decisionId, 409);
  // Confirmation consumed by a DIFFERENT decision.
  const wrongConsumer = await t133SeedApprovedEvolutionDecision(lane, { idSuffix: 'wc', confirmation: 'wrong_consumer' });
  await expectParkedRejection(wrongConsumer.decisionId, 409);
  // Decision covering a different motive than the parked final's targets.
  const uncovered = await t133SeedApprovedEvolutionDecision(lane, { idSuffix: 'uc', sourceMotiveRefId: 'core_motive_unrelated_t133' });
  await expectParkedRejection(uncovered.decisionId, 409);
  // Adversarial C3: a decision that PREDATES the park cannot be replayed onto it.
  const stale = await t133SeedApprovedEvolutionDecision(lane, { idSuffix: 'st', decisionCreatedAt: '2026-01-01T00:00:00.000Z' });
  await expectParkedRejection(stale.decisionId, 409);
  // D-133-3 verb mutex: acceptance + payload overrides in one request → 400.
  const valid = await t133SeedApprovedEvolutionDecision(lane, { idSuffix: 'vm' });
  await expectParkedRejection(valid.decisionId, 400, {
    slot_request_payload_overrides: {
      [PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_SLOT_ID]:
        t133MotiveLaneSlotPayloads()[PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_SLOT_ID]!,
    },
  });
});

test('L5 motive evolution confirm at the step-budget ceiling requires a raise in the same request (T-133 P3 C3-budget)', async () => {
  // The accepted continuation consumes one envelope step: at the ceiling a
  // raise-less confirm is a loud recoverable 409 (never a silent ledger
  // overrun), and raise + review_acceptance in ONE request completes the lane.
  const gateway = t133MotiveLaneGateway();
  const lane = t133ValidationPlanningLaneFixture(gateway);
  const run = await lane.coordinator.createCoordinatorRun(PROJECT_ID, {
    lane_id: 'motive',
    run_mode: 'product',
    execution_mode: 'provider_llm',
    budget_envelope: { max_steps: 2, max_provider_calls: 8 },
    slot_request_payloads: t133MotiveLaneSlotPayloads(),
  });
  const parked = await lane.coordinator.advance(PROJECT_ID, run.coordinator_run_id, {
    holder_id: 'holder_t133_budget_park',
  });
  assert.equal(parked.run.run_status, 'waiting_review');
  assert.equal(parked.run.consumed.steps, 2);

  const { decisionId } = await t133SeedApprovedEvolutionDecision(lane, { idSuffix: 'bd' });
  await assert.rejects(
    lane.coordinator.advance(PROJECT_ID, run.coordinator_run_id, {
      holder_id: 'holder_t133_budget_confirm',
      review_acceptance: {
        slot_id: PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_SLOT_ID,
        decision_ref: decisionId,
        acceptance_actor_id: 'reviewer_t133_001',
      },
    }),
    (error: unknown) => error instanceof AppError && error.statusCode === 409,
  );
  assert.equal(
    (await lane.coordinator.getCoordinatorRun(PROJECT_ID, run.coordinator_run_id)).run.run_status,
    'waiting_review',
  );
  const resumed = await lane.coordinator.advance(PROJECT_ID, run.coordinator_run_id, {
    holder_id: 'holder_t133_budget_confirm_raise',
    raise_budget_envelope: { max_steps: 3 },
    review_acceptance: {
      slot_id: PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_SLOT_ID,
      decision_ref: decisionId,
      acceptance_actor_id: 'reviewer_t133_001',
    },
  });
  assert.equal(resumed.run.run_status, 'completed');
  assert.equal(resumed.run.consumed.steps, 3);
  assert.equal(gateway.calls.length, 3);
});

test('L5 motive evolution blocked challenge axis without option blocker codes fails closed (T-133 P3 red-line interlock)', async () => {
  // D-133-2 enforcement: the final aggregation reads ONLY option.blocker_codes,
  // so a challenger reporting a blocked axis purely in challenge_check reason
  // codes must be a retryable semantic failure — never a passed final over an
  // unvetted option.
  const gateway = new ScriptedLlmGateway((request) => {
    const operation = request.executionContext.operation;
    if (operation === PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_RISK_CHALLENGER_ROLE_SLOT_ID) {
      const output = t133ChallengerOutputWithPark(motiveEvolutionPriorFromGatewayRequest(request), { mixedDefect: true });
      output.decision_options[T133_PARK_OPTION_KEY]!.blocker_codes = [];
      return motiveEvolutionWire(output);
    }
    if (operation === PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_OPTION_DESIGNER_ROLE_SLOT_ID) {
      return motiveEvolutionWire(t133DesignerOutputWithPark());
    }
    return motiveDecompositionRoleOutput();
  });
  const { motiveEvolutionService } = realRuntimeFixture(gateway);
  const result = await motiveEvolutionService.runEvolutionDecisionSupport(PROJECT_ID, motiveEvolutionRequest({
    run_id: 'motive_evolution_t133_interlock_run_001',
  }));
  assert.equal(result.status, 'failed_runtime');
  assert.equal(
    result.runtime_artifacts.at(-1)?.runtime_failure_code,
    'MOTIVE_EVOLUTION_OPTION_BLOCKER_CODES_MISSING',
  );
});

test('L5 feasibility planning refuses a non-proceed route skeptic final with a fail-closed 409 (T-133 downstream gate, feasibility side)', async () => {
  const gateway = new ScriptedLlmGateway((request) => t133ReviseSkepticOutput(userPayloadOf(request)));
  const fixture = realRuntimeFixture(gateway);
  const lineage = await seedAdmittedValidationPlanningLineage(l5LineageSeedOptions(fixture));

  const reviseSkeptic = await fixture.routePlanningService.runRouteSkepticReview(PROJECT_ID, routePlanningRequest('skeptic', {
    run_id: 'route_skeptic_t133_feasibility_gate_run_001',
    admitted_route_proposal: { ref: lineage.routeProposalRef, hash: lineage.routeProposalHash },
  }));
  assert.equal(reviseSkeptic.status, 'passed');
  const reviseFinal = reviseSkeptic.final_runtime_artifact;
  assert.ok(reviseFinal?.final_artifact_ref);
  assert.ok(reviseFinal?.final_artifact_hash);

  await assert.rejects(
    fixture.feasibilityPlanningService.runProbePlanCandidates(PROJECT_ID, feasibilityPlanningRequest({
      run_id: 'feasibility_t133_downstream_gate_run_001',
      lineage: {
        ...lineage,
        routeSkepticRef: reviseFinal.final_artifact_ref!,
        routeSkepticHash: reviseFinal.final_artifact_hash!,
      },
    })),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.statusCode, 409);
      assert.equal((error.details as { guard?: string } | undefined)?.guard, 'route_skeptic_disposition_proceed');
      return true;
    },
  );
});

// ---------------------------------------------------------------------------
// T-124 D2-core: enforced debate tiering must-checks (registered in
// .ai/scripts/paper-implementation-runtime-stress.mjs before implementation).
// ---------------------------------------------------------------------------

/** D2-core: light-tier trace request (1 statement, 1 source → light). */
function lightTraceRequest(runId: string): RunPaperImplementationTraceIntegrityDebateRuntimeRequest {
  const base = traceRequest({ run_id: runId });
  return {
    ...base,
    source_refs: base.source_refs.slice(0, 1),
    source_hashes: base.source_hashes.slice(0, 1),
    source_packets: base.source_packets?.slice(0, 1),
  };
}

/**
 * Simulate a run interrupted AFTER its last role was admitted but BEFORE the
 * final artifact was recorded: drop the stored final artifact, its
 * runtime-identity-hash index entry, and its admission record so a resume can
 * re-record the final without a phantom uniqueness collision.
 */
function dropStoredFinalArtifact(repository: InMemoryPaperImplementationRuntimeRepository, runId: string): void {
  const internals = repository as unknown as {
    runtimeArtifacts: Map<string, {
      runtime_artifact_id: string;
      runtime_identity_hash: string;
      artifact_scope: string;
      artifact_payload_ref: { ref_id: string };
    }>;
    runtimeArtifactIdsByIdentityHash: Map<string, string>;
    admissionRecords: Map<string, { runtime_artifact_id: string }>;
  };
  const final = [...internals.runtimeArtifacts.values()].find(
    (artifact) => artifact.artifact_scope === 'final' && artifact.artifact_payload_ref.ref_id === `${runId}.final`,
  );
  assert.ok(final, 'expected a stored final artifact to drop');
  internals.runtimeArtifacts.delete(final.runtime_artifact_id);
  internals.runtimeArtifactIdsByIdentityHash.delete(final.runtime_identity_hash);
  for (const [id, record] of internals.admissionRecords) {
    if (record.runtime_artifact_id === final.runtime_artifact_id) {
      internals.admissionRecords.delete(id);
    }
  }
}

function tierSkepticFinding() {
  return {
    finding_id: 'finding_l5_tier_001',
    severity: 'blocker' as const,
    blocker_code: 'semantic_support_gap',
    target_statement_ref: ref('reviewed_statement', 'statement_l5_001'),
    cited_refs: [ref('run_evidence_unit', 'run_evidence_unit_l5_001')],
  };
}

/** Scripted outputs for a light run whose skeptic finds one issue (upgrade path). */
function upgradePathTraceRoleOutput(operation: string): PaperImplementationTraceIntegrityRoleOutput {
  const output = traceRoleOutput(operation);
  if (operation === 'trace_integrity_review.skeptic_challenge') {
    output.role_status = 'blocked';
    output.blocker_codes = ['semantic_support_gap'];
    output.challenge_findings = [tierSkepticFinding()];
  }
  if (operation === 'trace_integrity_review.support_mapper_reconcile') {
    output.finding_dispositions = [{
      finding_id: 'finding_l5_tier_001',
      disposition: 'accepted_blocker',
      cited_refs: [],
    }];
  }
  if (operation === 'trace_integrity_review.arbiter_final') {
    output.role_status = 'blocked';
    output.blocker_codes = ['semantic_support_gap'];
    output.coverage = {
      statement_refs: [ref('reviewed_statement', 'statement_l5_001')],
      finding_ids: ['finding_l5_tier_001'],
    };
  }
  return output;
}

function debateExecutionOf(
  artifact: PaperImplementationRuntimeArtifactEnvelope | null,
): Record<string, unknown> {
  const value = artifact?.artifact_payload.debate_execution;
  assert.ok(value && typeof value === 'object' && !Array.isArray(value), 'debate_execution recorded');
  return value as Record<string, unknown>;
}

test('L5 trace debate tier decision is enforced and replayable for the same inputs', async () => {
  // Pure decision replay: enforced entry = shadow computation, re-tagged.
  const inputs = {
    reviewed_statement_count: 1,
    retrieval_packet_ref_count: 1,
    prior_blocker_density: 0,
    target_kind: 'trace_integrity' as const,
  };
  const first = assessPaperImplementationDebateComplexity(inputs);
  const second = assessPaperImplementationDebateComplexity(inputs);
  assert.equal(first.schema_version, 'PaperImplementationDebateComplexityAssessment@v1');
  assert.deepEqual(first, second);
  const shadow = assessPaperImplementationDebateComplexityShadow(inputs);
  assert.equal(first.recommended_tier, shadow.recommended_tier);
  assert.equal(first.inputs_hash, shadow.inputs_hash);
  assert.deepEqual(first.rationale_codes, shadow.rationale_codes);
  assert.equal(first.recommended_tier, 'light');

  // The runtime EXECUTES the decision: a light request runs the 3-role floor
  // (no reconcile) and records the decision into role/final execution context.
  const gateway = new ScriptedLlmGateway((request) => traceRoleOutput(request.executionContext.operation));
  const { traceService } = realRuntimeFixture(gateway);
  const result = await traceService.runBoundaryDebate(
    PROJECT_ID,
    lightTraceRequest('trace_l5_tier_replayable_run_001'),
  );
  assert.equal(result.status, 'passed');
  assert.equal(result.provider_call_count, 3);
  assert.deepEqual(gateway.calls.map((call) => call.executionContext.operation), [
    'trace_integrity_review.support_mapper_map',
    'trace_integrity_review.skeptic_challenge',
    'trace_integrity_review.arbiter_final',
  ]);
  const finalExecution = debateExecutionOf(result.final_runtime_artifact);
  assert.equal(finalExecution.base_tier, 'light');
  assert.equal(finalExecution.effective_tier, 'light');
  assert.equal(finalExecution.tier_upgraded, false);
  assert.equal(finalExecution.tier_inputs_hash, first.inputs_hash);
  assert.deepEqual(finalExecution.executed_role_plan, [
    'trace_integrity_review.support_mapper_map',
    'trace_integrity_review.skeptic_challenge',
    'trace_integrity_review.arbiter_final',
  ]);
  assert.equal(finalExecution.debate_policy_id, 'paper-implementation.trace-integrity.boundary-debate.v1');
  assert.equal(result.final_admission_record?.admission_status, 'admitted');
});

test('L5 trace debate light tier deterministically upgrades to standard when the skeptic finds issues', async () => {
  const gateway = new ScriptedLlmGateway((request) =>
    upgradePathTraceRoleOutput(request.executionContext.operation));
  const { traceService } = realRuntimeFixture(gateway);
  const result = await traceService.runBoundaryDebate(
    PROJECT_ID,
    lightTraceRequest('trace_l5_tier_upgrade_run_001'),
  );

  // Deterministic rule, not a relaxation: the reconcile role is re-inserted and
  // the run completes as the FOUR-role standard plan inside the same run
  // (appended call indexes), with an admitted blocked final.
  assert.equal(result.status, 'blocked');
  assert.equal(result.provider_call_count, 4);
  assert.deepEqual(gateway.calls.map((call) => call.executionContext.operation), [
    'trace_integrity_review.support_mapper_map',
    'trace_integrity_review.skeptic_challenge',
    'trace_integrity_review.support_mapper_reconcile',
    'trace_integrity_review.arbiter_final',
  ]);
  const roleArtifacts = result.runtime_artifacts.filter((artifact) => artifact.artifact_scope === 'role');
  assert.deepEqual(roleArtifacts.map((artifact) => artifact.call_index), [1, 2, 3, 4]);
  const finalExecution = debateExecutionOf(result.final_runtime_artifact);
  assert.equal(finalExecution.base_tier, 'light');
  assert.equal(finalExecution.effective_tier, 'standard');
  assert.equal(finalExecution.tier_upgraded, true);
  assert.equal(result.final_admission_record?.admission_status, 'admitted');
  assert.equal(result.blocker_codes.includes('semantic_support_gap'), true);

  // Disposition completeness is never waived: post-upgrade roles record the
  // upgraded tier while the pre-upgrade prefix records light.
  assert.equal(debateExecutionOf(roleArtifacts[1]!).effective_tier, 'light');
  assert.equal(debateExecutionOf(roleArtifacts[2]!).effective_tier, 'standard');
});

test('L5 trace resume of a light run with an admitted arbiter but no final reuses all three roles with zero provider re-issue', async () => {
  // A light-no-findings run runs the three-role floor; its arbiter is admitted.
  const gateway = new ScriptedLlmGateway((request) => traceRoleOutput(request.executionContext.operation));
  const fixture = realRuntimeFixture(gateway);
  const run = await fixture.traceService.runBoundaryDebate(
    PROJECT_ID,
    lightTraceRequest('trace_l5_light_gap_run_001'),
  );
  assert.equal(run.status, 'passed');
  assert.equal(run.provider_call_count, 3);
  assert.equal(gateway.calls.length, 3);
  const roleArtifacts = run.runtime_artifacts.filter((artifact) => artifact.artifact_scope === 'role');
  assert.deepEqual(roleArtifacts.map((artifact) => artifact.role_slot_id), [
    'trace_integrity_review.support_mapper_map',
    'trace_integrity_review.skeptic_challenge',
    'trace_integrity_review.arbiter_final',
  ]);
  // Interrupt AFTER the arbiter admission but BEFORE the final was recorded.
  dropStoredFinalArtifact(fixture.repository, 'trace_l5_light_gap_run_001');

  const resumeGateway = new ScriptedLlmGateway((request) => traceRoleOutput(request.executionContext.operation));
  const resumeService = resumeTraceServiceFixture(fixture, resumeGateway);
  const resumed = await resumeService.runBoundaryDebate(PROJECT_ID, {
    ...lightTraceRequest('trace_l5_light_gap_run_001'),
    run_id: null,
    resume_from_run_id: 'trace_l5_light_gap_run_001',
  });

  assert.equal(resumed.status, 'passed');
  // The plan-aware reuse walk re-derives the 3-role light plan and keeps the
  // admitted arbiter (a static 4-role walk would break at the absent reconcile
  // and re-issue it): zero provider re-issue, no repay, only the final is recorded.
  assert.equal(resumeGateway.calls.length, 0);
  assert.deepEqual(
    resumed.runtime_artifacts.slice(0, 3).map((artifact) => artifact.runtime_artifact_id),
    roleArtifacts.map((artifact) => artifact.runtime_artifact_id),
  );
  assert.equal(resumed.final_admission_record?.admission_status, 'admitted');
  assert.deepEqual(
    resumed.final_runtime_artifact?.prior_role_artifact_hashes,
    roleArtifacts.map((artifact) => artifact.artifact_payload_hash),
  );
  assertNoNonProviderRuntimeArtifacts(resumed.runtime_artifacts);
});

test('L5 trace debate resume rejects tier drift with 409 before any provider call', async () => {
  const failingGateway = new ScriptedLlmGateway((request) => {
    if (request.executionContext.operation === 'trace_integrity_review.skeptic_challenge') {
      throw new LlmGatewayError('TimeoutError', 'fixture trace skeptic timeout', {
        telemetry: telemetry(request),
      });
    }
    return traceRoleOutput(request.executionContext.operation);
  });
  const fixture = realRuntimeFixture(failingGateway);
  const interrupted = await fixture.traceService.runBoundaryDebate(
    PROJECT_ID,
    lightTraceRequest('trace_l5_tier_drift_run_001'),
  );
  assert.equal(interrupted.status, 'failed_runtime');

  // Resume with three sources instead of one: the re-derived base tier drifts
  // light → standard, so the resume fails closed with the DEBATE_TIER_DRIFT
  // issue code (alongside the packet identity codes) and zero provider calls.
  const resumeGateway = new ScriptedLlmGateway((request) => traceRoleOutput(request.executionContext.operation));
  const resumeService = resumeTraceServiceFixture(fixture, resumeGateway);
  await assert.rejects(
    () => resumeService.runBoundaryDebate(PROJECT_ID, {
      ...traceRequest({ run_id: 'trace_l5_tier_drift_run_001' }),
      run_id: null,
      resume_from_run_id: 'trace_l5_tier_drift_run_001',
    }),
    (error: unknown) => error instanceof AppError
      && error.statusCode === 409
      && error.errorCode === 'VERSION_CONFLICT'
      && Array.isArray((error.details as { resume_issue_codes?: string[] } | undefined)?.resume_issue_codes)
      && ((error.details as { resume_issue_codes: string[] }).resume_issue_codes)
        .includes('RESUME_DEBATE_TIER_DRIFT'),
  );
  assert.equal(resumeGateway.calls.length, 0);
});

test('L5 trace debate tier budget insufficiency fails closed with zero provider calls and classifies to loop_budget_review', async () => {
  const gateway = new ScriptedLlmGateway((request) => traceRoleOutput(request.executionContext.operation));
  const { traceService } = realRuntimeFixture(gateway);

  // Light reserves the UPGRADE-SAFE standard call count (4): a budget of 3
  // covers the light floor but not a skeptic-finding upgrade, so the run fails
  // closed BEFORE any provider call — never a silent downgrade.
  const result = await traceService.runBoundaryDebate(PROJECT_ID, {
    ...lightTraceRequest('trace_l5_tier_budget_run_001'),
    provider_call_budget: 3,
  });
  assert.equal(result.status, 'blocked');
  assert.equal(result.provider_call_count, 0);
  assert.equal(gateway.calls.length, 0);
  assert.equal(result.blocker_codes.includes('TIER_BUDGET_INSUFFICIENT'), true);
  assert.equal(result.final_runtime_artifact?.runtime_status, 'blocked');
  assert.equal(result.final_admission_record?.admission_status, 'admitted');

  // Coordinator classification (R4 zero-call trusted channel, zero coordinator
  // change): the code and its prefix family land loop_budget_review.
  assert.equal(
    PAPER_IMPLEMENTATION_COORDINATOR_QUEUE_TYPE_BY_BLOCKER_CODE.TIER_BUDGET_INSUFFICIENT,
    'loop_budget_review',
  );
  const classified = classifyPaperImplementationCoordinatorBlockedStep(
    'blocked',
    ['TIER_BUDGET_INSUFFICIENT'],
    [],
  );
  assert.equal(classified.queue_type, 'loop_budget_review');

  // A sufficient budget (the upgrade-safe reservation) runs the light floor.
  const funded = await traceService.runBoundaryDebate(PROJECT_ID, {
    ...lightTraceRequest('trace_l5_tier_budget_run_002'),
    provider_call_budget: 4,
  });
  assert.equal(funded.status, 'passed');
  assert.equal(funded.provider_call_count, 3);
});
