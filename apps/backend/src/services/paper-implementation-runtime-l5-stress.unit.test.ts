import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_PROFILE_ID,
  PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_SLOT_ID,
  PAPER_IMPLEMENTATION_DOSSIER_READINESS_AUDIT_PROFILE_ID,
  PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_DIMENSIONS,
  PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_PROFILE_ID,
  PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_ROLE_SLOT_ID,
  PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_SLOT_ID,
  PAPER_IMPLEMENTATION_EXPERIMENT_DESIGN_PROFILE_ID,
  PAPER_IMPLEMENTATION_EXPERIMENT_DESIGN_SLOT_ID,
  PAPER_IMPLEMENTATION_RESULT_ANALYSIS_PROFILE_ID,
  PAPER_IMPLEMENTATION_RESULT_ANALYSIS_ROLE_SLOT_ID,
  PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SCENARIO_KINDS,
  PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SLOT_ID,
  PAPER_IMPLEMENTATION_TRACE_INTEGRITY_BOUNDARY_DEBATE_SLOT_ID,
  PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_PROFILE_ID,
  type PaperImplementationExperimentPlanningRoleOutput,
  type PaperImplementationP1RuntimeReviewRoleOutput,
  type PaperImplementationResultAnalysisRoleOutput,
  type PaperImplementationRuntimeArtifactEnvelope,
  type PaperImplementationTraceIntegrityRoleOutput,
  type RunPaperImplementationExperimentPlanningRuntimeRequest,
  type RunPaperImplementationP1RuntimeReviewRequest,
  type RunPaperImplementationResultAnalysisRuntimeRequest,
  type RunPaperImplementationTraceIntegrityDebateRuntimeRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-runtime-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

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

function realRuntimeFixture(gateway: TopicSelectionAgentOrchestratorLlmGateway) {
  const repository = new InMemoryPaperImplementationRuntimeRepository();
  let sequence = 0;
  const idFactory = (prefix: string) => `${prefix}_${++sequence}`;
  const runtimeAdmission = new PaperImplementationRuntimeAdmissionService({
    repository,
    idFactory,
    now: () => NOW,
  });
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
    traceService: new PaperImplementationTraceIntegrityDebateRuntimeService({
      runtimeAdmission,
      agentOrchestrator: orchestrator,
      idFactory,
      now: () => NOW,
    }),
    p1Service: new PaperImplementationP1RuntimeReviewService({
      runtimeAdmission,
      agentOrchestrator: orchestrator,
      idFactory,
      now: () => NOW,
    }),
    resultAnalysisService: new PaperImplementationResultAnalysisRuntimeService({
      runtimeAdmission,
      agentOrchestrator: orchestrator,
      idFactory,
      now: () => NOW,
    }),
    experimentPlanningService: new PaperImplementationExperimentPlanningRuntimeService({
      runtimeAdmission,
      agentOrchestrator: orchestrator,
      idFactory,
      now: () => NOW,
    }),
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
  return {
    repository,
    p1Service: new PaperImplementationP1RuntimeReviewService({
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
