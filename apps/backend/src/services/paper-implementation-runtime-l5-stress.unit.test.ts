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

import { InMemoryPaperImplementationRepository } from '../repositories/in-memory-paper-implementation-repository.js';
import { InMemoryPaperImplementationRuntimeRepository } from '../repositories/in-memory-paper-implementation-runtime-repository.js';
import { InMemoryTopicSelectionControlPlaneRepository } from '../repositories/in-memory-topic-selection-control-plane-repository.js';
import type {
  LlmCallTelemetry,
  LlmStructuredOutputRequest,
  LlmStructuredOutputResponse,
} from './llm-gateway.js';
import { LlmGatewayError } from './llm-gateway.js';
import {
  sha256Text,
  stableStringify,
} from './literature-content-processing-utils.js';
import { PaperImplementationP1RuntimeReviewService } from './paper-implementation-p1-runtime-review-service.js';
import { PaperImplementationResultAnalysisRuntimeService } from './paper-implementation-result-analysis-runtime-service.js';
import { PaperImplementationExperimentPlanningRuntimeService } from './paper-implementation-experiment-planning-runtime-service.js';
import { PaperImplementationCrossBoardSynthesisRuntimeService } from './paper-implementation-cross-board-synthesis-runtime-service.js';
import { PaperImplementationEvidenceBoardCurationRuntimeService } from './paper-implementation-evidence-board-curation-runtime-service.js';
import { PaperImplementationFeasibilityPlanningRuntimeService } from './paper-implementation-feasibility-planning-runtime-service.js';
import { PaperImplementationMotiveDecompositionRuntimeService } from './paper-implementation-motive-decomposition-runtime-service.js';
import { PaperImplementationMotiveEvolutionRuntimeService } from './paper-implementation-motive-evolution-runtime-service.js';
import { PaperImplementationRoutePlanningRuntimeService } from './paper-implementation-route-planning-runtime-service.js';
import {
  seedAdmittedRoutePlanningLineage,
  seedAdmittedValidationPlanningLineage,
  type PaperImplementationSeededRouteLineage,
  type PaperImplementationSeededValidationLineage,
} from './paper-implementation-runtime-chain-lineage-fixtures.js';
import { PaperImplementationValidationCyclePlanningRuntimeService } from './paper-implementation-validation-cycle-planning-runtime-service.js';
import { PaperImplementationRuntimeAdmissionService } from './paper-implementation-runtime-admission-service.js';
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
  const largeSourceRefs = Array.from({ length: 1200 }, (_, index) => ref(
    'claim_trace_packet',
    `claim_trace_packet_${String(index).padStart(4, '0')}_${'x'.repeat(96)}`,
  ));
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

  assert.equal(result.status, 'failed_runtime');
  assert.equal(result.provider_call_count, 0);
  assert.equal(gateway.calls.length, 0);
  assert.equal(result.final_runtime_artifact, null);
  const artifact = firstArtifact(result.runtime_artifacts);
  assert.equal(artifact.slot_id, PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_SLOT_ID);
  assert.equal(artifact.runtime_failure_code, 'EVIDENCE_BOARD_CURATION_PREFLIGHT_BLOCKED');
  assert.equal(artifact.runtime_status, 'failed_runtime');
  assert.equal(result.admission_records[0]?.admission_status, 'rejected');
  assert.equal(result.blocker_codes.includes('EVIDENCE_BOARD_CURATION_MEMO_LIKE_REF_REJECTED'), true);
  assertNoNonProviderRuntimeArtifacts(result.runtime_artifacts);
  assertNoLeak(result, evidenceBoardForbiddenWriteFragments());
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

  assert.equal(result.status, 'failed_runtime');
  assert.equal(result.provider_call_count, 0);
  assert.equal(gateway.calls.length, 0);
  assert.equal(result.final_runtime_artifact, null);
  const artifact = firstArtifact(result.runtime_artifacts);
  assert.equal(artifact.slot_id, PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_SLOT_ID);
  assert.equal(artifact.runtime_failure_code, 'MOTIVE_DECOMPOSITION_PREFLIGHT_BLOCKED');
  assert.equal(artifact.runtime_status, 'failed_runtime');
  assert.equal(result.admission_records[0]?.admission_status, 'rejected');
  assert.equal(result.blocker_codes.includes('MOTIVE_DECOMPOSITION_MEMO_LIKE_REF_REJECTED'), true);
  assertNoNonProviderRuntimeArtifacts(result.runtime_artifacts);
  assertNoLeak(result, motiveDecompositionForbiddenWriteFragments());
});

test('L5 motive evolution stress blocks over-budget motive context before provider calls', async () => {
  const gateway = new ScriptedLlmGateway((request) => motiveEvolutionRoleOutput(request));
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
      return motiveEvolutionRiskChallengerRoleOutput(motiveEvolutionPriorFromGatewayRequest(request), {
        challenged_option_keys: ['evolution_option_l5_001'],
        decision_options: motiveEvolutionDecisionOptionsByKey('evolution_option_l5_001'),
      });
    }
    return motiveEvolutionDesignerRoleOutput({
      designed_options: {
        ...motiveEvolutionDesignedOptionsByKey('evolution_option_l5_001'),
        ...motiveEvolutionDesignedOptionsByKey('evolution_option_l5_002'),
      },
    });
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
      return motiveEvolutionRiskChallengerRoleOutput(motiveEvolutionPriorFromGatewayRequest(request), {
        option_set_hash: hash('motive-evolution-l5-option-set-drift'),
      });
    }
    return motiveEvolutionDesignerRoleOutput();
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
        ...motiveEvolutionRiskChallengerRoleOutput(motiveEvolutionPriorFromGatewayRequest(request)),
        motive_evolution_decision_request: {
          target_core_motive_version_id: 'core_motive_version_motive_evolution_l5_001',
        },
      } as unknown as PaperImplementationMotiveEvolutionRiskChallengerRoleOutput;
    }
    return motiveEvolutionDesignerRoleOutput();
  });
  const { motiveEvolutionService } = realRuntimeFixture(gateway);

  const result = await motiveEvolutionService.runEvolutionDecisionSupport(PROJECT_ID, motiveEvolutionRequest({
    run_id: 'motive_evolution_l5_writer_payload_run_001',
  }));

  assertMotiveEvolutionRetryFailure(result, gateway, 'SCHEMA_VALIDATION_FAILED', 3, 2);
});

test('L5 motive evolution portfolio-changing option without human-confirmation gate retries once and does not create final, motive, portfolio, board, trace, queue, or domain-gate payloads', async () => {
  const gateway = new ScriptedLlmGateway(() => motiveEvolutionDesignerRoleOutput({
    designed_options: motiveEvolutionDesignedOptionsByKey('evolution_option_l5_001', {
      option_kind: 'supersede',
      portfolio_impact_class: 'semantic_version_change',
      human_confirmation_required: false,
      recommended_next_gate: 'evidence_board_curation',
    }),
  }));
  const { motiveEvolutionService } = realRuntimeFixture(gateway);

  const result = await motiveEvolutionService.runEvolutionDecisionSupport(PROJECT_ID, motiveEvolutionRequest({
    run_id: 'motive_evolution_l5_portfolio_change_without_gate_run_001',
  }));

  assertMotiveEvolutionRetryFailure(result, gateway, 'SCHEMA_VALIDATION_FAILED', 2, 1);
});

test('L5 motive evolution blocked challenge without reason retries once and does not create final, motive, portfolio, board, trace, queue, or domain-gate payloads', async () => {
  const gateway = new ScriptedLlmGateway((request) => {
    if (request.executionContext.operation === PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_RISK_CHALLENGER_ROLE_SLOT_ID) {
      return motiveEvolutionRiskChallengerRoleOutput(motiveEvolutionPriorFromGatewayRequest(request), {
        decision_options: motiveEvolutionDecisionOptionsByKey('evolution_option_l5_001', {
          challenge_check: motiveEvolutionChallengeCheck({
            evidence_status: 'blocked',
            blocking_reason_codes: [],
          }),
        }),
      });
    }
    return motiveEvolutionDesignerRoleOutput();
  });
  const { motiveEvolutionService } = realRuntimeFixture(gateway);

  const result = await motiveEvolutionService.runEvolutionDecisionSupport(PROJECT_ID, motiveEvolutionRequest({
    run_id: 'motive_evolution_l5_blocked_challenge_without_reason_run_001',
  }));

  assertMotiveEvolutionRetryFailure(result, gateway, 'SCHEMA_VALIDATION_FAILED', 3, 2);
});

test('L5 motive evolution memo-like motive context blocks before provider calls', async () => {
  const gateway = new ScriptedLlmGateway((request) => motiveEvolutionRoleOutput(request));
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

  assert.equal(result.status, 'failed_runtime');
  assert.equal(result.provider_call_count, 0);
  assert.equal(gateway.calls.length, 0);
  assert.equal(result.final_runtime_artifact, null);
  const artifact = firstArtifact(result.runtime_artifacts);
  assert.equal(artifact.slot_id, PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_SLOT_ID);
  assert.equal(artifact.runtime_failure_code, 'MOTIVE_EVOLUTION_PREFLIGHT_BLOCKED');
  assert.equal(artifact.runtime_status, 'failed_runtime');
  assert.equal(result.admission_records[0]?.admission_status, 'rejected');
  assert.equal(result.blocker_codes.includes('MOTIVE_EVOLUTION_MEMO_LIKE_REF_REJECTED'), true);
  assertNoNonProviderRuntimeArtifacts(result.runtime_artifacts);
  assertNoLeak(result, motiveEvolutionForbiddenWriteFragments());
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
    return p1RoleOutput(request.executionContext.operation);
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
    source_refs: [ref('run_evidence_unit', 'run_evidence_unit_l5_001')],
    source_hashes: [sourceHash],
    source_packets: [{
      source_ref: ref('run_evidence_unit', 'run_evidence_unit_l5_001'),
      source_hash: sourceHash,
      source_family: 'run_evidence',
      freshness_status: 'fresh',
      evidence_role: 'primary_result',
      content_summary: 'Benchmark B run evidence reports the validation accuracy improvement.',
      source_excerpt: sourceExcerpt,
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
  const sourceRefs = overrides.source_refs ?? (
    claim
      ? [ref('result_interpretation_packet', 'result_packet_l5_001'), ref('claim_trace_packet', 'claim_trace_packet_l5_001')]
      : [ref('claim_candidate', 'claim_candidate_l5_001'), ref('claim_trace_packet', 'claim_trace_packet_l5_001')]
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
  return {
    role_slot_id: roleSlotId as PaperImplementationTraceIntegrityRoleOutput['role_slot_id'],
    role_status: 'passed',
    summary: `Trace role ${roleSlotId} passed.`,
    reviewed_statement_refs: [ref('reviewed_statement', 'statement_l5_001')],
    cited_source_refs: [ref('run_evidence_unit', 'run_evidence_unit_l5_001')],
    blocker_codes: [],
    warning_codes: [],
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
    domain_gate_request: final
      ? claim ? { claim_candidate_id: 'claim_candidate_l5_001' } : { dossier_id: 'dossier_l5_001' }
      : null,
    scenario_outputs: final && !claim
      ? [{ scenario_id: 'ready_for_writing', disposition: 'preferred' }]
      : [],
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
    domain_gate_request: {
      result_interpretation_packet_id: 'result_packet_l5_001',
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
