import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';

import { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import type {
  ImplementationFeedbackEvent,
  ImplementationIntakeSnapshot,
  ImplementationProject,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-contracts';
import type {
  CreateResultInterpretationPacketRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-result-claim-dossier-contracts';
import type {
  PaperImplementationExperimentPlanningRoleOutput,
  PaperImplementationExperimentWorkOrderDraftCandidate,
  PaperImplementationP1RuntimeReviewRoleOutput,
  PaperImplementationResultAnalysisRoleOutput,
  PaperImplementationRuntimeAdmissionRecord,
  PaperImplementationRuntimeArtifactEnvelope,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-runtime-contracts';
import {
  PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_PROFILE_ID,
  PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_SLOT_ID,
  PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_REVIEW_ROLE_SLOT_IDS,
  PAPER_IMPLEMENTATION_DOSSIER_READINESS_AUDIT_PROFILE_ID,
  PAPER_IMPLEMENTATION_DOSSIER_READINESS_AUDIT_SLOT_ID,
  PAPER_IMPLEMENTATION_DOSSIER_READINESS_REVIEW_ROLE_SLOT_IDS,
  PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_DIMENSIONS,
  PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_PROFILE_ID,
  PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_ROLE_SLOT_ID,
  PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_SLOT_ID,
  PAPER_IMPLEMENTATION_EXPERIMENT_DESIGN_PROFILE_ID,
  PAPER_IMPLEMENTATION_EXPERIMENT_DESIGN_ROLE_SLOT_ID,
  PAPER_IMPLEMENTATION_EXPERIMENT_DESIGN_SLOT_ID,
  PAPER_IMPLEMENTATION_RESULT_ANALYSIS_PROFILE_ID,
  PAPER_IMPLEMENTATION_RESULT_ANALYSIS_ROLE_SLOT_ID,
  PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SCENARIO_KINDS,
  PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SLOT_ID,
  PAPER_IMPLEMENTATION_TRACE_INTEGRITY_BOUNDARY_DEBATE_SLOT_ID,
  PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_PROFILE_ID,
  PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_SEMANTIC_ROLE_SLOT_IDS,
  type PaperImplementationTraceIntegrityRoleOutput,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-runtime-contracts';
import type {
  TraceLineageBundle,
  TraceManifest,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-trace-contracts';
import type {
  ValidationCycle,
  ValidationCycleInputSnapshot,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-validation-contracts';
import type {
  RunEvidenceUnit,
  RunMonitorIntakeRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-workorder-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

import { buildApp } from '../app.js';
import type {
  LlmCallTelemetry,
  LlmStructuredOutputRequest,
  LlmStructuredOutputResponse,
} from '../services/llm-gateway.js';
import {
  BackendLlmGateway,
  LlmGatewayError,
} from '../services/llm-gateway.js';
import { InMemoryPaperImplementationResultClaimDossierRepository } from '../repositories/in-memory-paper-implementation-result-claim-dossier-repository.js';
import { InMemoryPaperImplementationRuntimeRepository } from '../repositories/in-memory-paper-implementation-runtime-repository.js';
import { InMemoryPaperImplementationTraceRepository } from '../repositories/in-memory-paper-implementation-trace-repository.js';
import { InMemoryPaperImplementationValidationRepository } from '../repositories/in-memory-paper-implementation-validation-repository.js';
import { InMemoryPaperImplementationWorkOrderRepository } from '../repositories/in-memory-paper-implementation-workorder-repository.js';
import type {
  PaperImplementationBootstrapPersistence,
  PaperImplementationBootstrapResult,
  PaperImplementationRepository,
} from '../repositories/paper-implementation.repository.js';
import type {
  PaperImplementationRuntimeOperationalTelemetry,
} from '../services/paper-implementation-runtime-operational-telemetry.js';

const PROJECT_ID = 'implementation-project-http-1';
const TITLE_CARD_ID = 'title-card-http-1';
const NOW = '2026-06-03T00:00:00.000Z';
const RESULT_PACKET_ID = 'result-packet-http-1';
const RESULT_VALIDATION_CYCLE_ID = 'validation-cycle-http-1';
const RESULT_INPUT_SNAPSHOT_ID = 'input-snapshot-http-1';
const RESULT_RUN_EVIDENCE_UNIT_ID = 'run-evidence-unit-http-1';
const RESULT_VALIDATION_REPORT_ID = 'result-validation-report-http-1';
const RESULT_METRIC_ID = 'metric-http-1';
const RESULT_WORK_ORDER_ID = 'work-order-http-1';
const RESULT_MONITOR_INTAKE_ID = 'monitor-intake-http-1';
const RESULT_TRACE_MANIFEST_ID = 'trace-manifest-result-http-1';

class StubTraceIntegrityGateway {
  readonly calls: LlmStructuredOutputRequest[] = [];

  async createStructuredOutput<T>(
    request: LlmStructuredOutputRequest,
  ): Promise<LlmStructuredOutputResponse<T>> {
    this.calls.push(request);
    const output = traceIntegrityRoleOutput(request.executionContext.operation);
    return {
      parsed: output as T,
      raw: { redacted_stub: true },
      telemetry: telemetry(request),
    };
  }
}

class StubP1RuntimeGateway {
  readonly calls: LlmStructuredOutputRequest[] = [];

  async createStructuredOutput<T>(
    request: LlmStructuredOutputRequest,
  ): Promise<LlmStructuredOutputResponse<T>> {
    this.calls.push(request);
    const output = p1ReviewRoleOutput(request.executionContext.operation);
    return {
      parsed: output as T,
      raw: { redacted_stub: true },
      telemetry: telemetry(request),
    };
  }
}

class StubResultAnalysisGateway {
  readonly calls: LlmStructuredOutputRequest[] = [];

  constructor(
    private readonly outputs: PaperImplementationResultAnalysisRoleOutput[] = [],
  ) {}

  async createStructuredOutput<T>(
    request: LlmStructuredOutputRequest,
  ): Promise<LlmStructuredOutputResponse<T>> {
    this.calls.push(request);
    const output = this.outputs.shift() ?? resultAnalysisRoleOutput();
    return {
      parsed: output as T,
      raw: { redacted_stub: true },
      telemetry: telemetry(request),
    };
  }
}

class StubExperimentPlanningGateway {
  readonly calls: LlmStructuredOutputRequest[] = [];

  constructor(
    private readonly outputs: PaperImplementationExperimentPlanningRoleOutput[] = [],
  ) {}

  async createStructuredOutput<T>(
    request: LlmStructuredOutputRequest,
  ): Promise<LlmStructuredOutputResponse<T>> {
    this.calls.push(request);
    const output = this.outputs.shift() ?? experimentPlanningRoleOutput(request.executionContext.operation);
    return {
      parsed: output as T,
      raw: { redacted_stub: true },
      telemetry: telemetry(request),
    };
  }
}

class FailingProviderGateway {
  readonly calls: LlmStructuredOutputRequest[] = [];

  async createStructuredOutput<T>(
    request: LlmStructuredOutputRequest,
  ): Promise<LlmStructuredOutputResponse<T>> {
    this.calls.push(request);
    throw new LlmGatewayError('TimeoutError', 'fixture provider timeout', {
      telemetry: telemetry(request),
    });
  }
}

class InvalidProviderOutputGateway {
  readonly calls: LlmStructuredOutputRequest[] = [];

  async createStructuredOutput<T>(
    request: LlmStructuredOutputRequest,
  ): Promise<LlmStructuredOutputResponse<T>> {
    this.calls.push(request);
    return {
      parsed: { role_slot_id: request.executionContext.operation } as T,
      raw: { redacted_stub: true },
      telemetry: telemetry(request),
    };
  }
}

class StaticProjectRepository implements PaperImplementationRepository {
  readonly project: ImplementationProject = {
    implementation_project_id: PROJECT_ID,
    intake_snapshot_id: `${PROJECT_ID}-intake-snapshot`,
    workspace_id: 'workspace-http-1',
    title_card_id: TITLE_CARD_ID,
    paper_project_bridge_id: `${PROJECT_ID}-paper-project-bridge`,
    bridge_payload_hash: hash('bridge-payload-http-1'),
    target_paper_project_ref: null,
    lifecycle_status: 'active',
    freshness_status: 'fresh',
    source_status: 'active',
    version_number: 1,
    policy_version_id: 'policy-v1',
    created_by: 'system',
    created_at: NOW,
    updated_at: NOW,
  };

  async createBootstrap(
    persistence: PaperImplementationBootstrapPersistence,
  ): Promise<PaperImplementationBootstrapResult> {
    return { ...structuredClone(persistence), created: true };
  }

  async findProjectById(implementationProjectId: string): Promise<ImplementationProject | null> {
    return implementationProjectId === PROJECT_ID ? structuredClone(this.project) : null;
  }

  async findProjectByBridgeId(): Promise<ImplementationProject | null> {
    return structuredClone(this.project);
  }

  async findIntakeSnapshotById(): Promise<ImplementationIntakeSnapshot | null> {
    return null;
  }

  async findIntakeSnapshotByProjectId(): Promise<ImplementationIntakeSnapshot | null> {
    return null;
  }

  async createFeedbackEvent(event: ImplementationFeedbackEvent): Promise<ImplementationFeedbackEvent> {
    return structuredClone(event);
  }
}

test('PaperImplementation trace-integrity runtime run route uses the production slot service path', async () => {
  const runtimeRepository = new InMemoryPaperImplementationRuntimeRepository();
  const gateway = new StubTraceIntegrityGateway();
  const app = buildApp({
    paperImplementationRuntimeRepository: runtimeRepository,
    paperImplementationTraceIntegrityDebateLlmGateway: gateway,
  });
  try {
    const response = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/trace-integrity-boundary-debate/run`,
      payload: traceIntegrityRunPayload(),
    });

    assert.equal(response.statusCode, 201);
    const body = response.json() as {
      status: string;
      provider_call_count: number;
      runtime_artifacts: PaperImplementationRuntimeArtifactEnvelope[];
      final_admission_record: PaperImplementationRuntimeAdmissionRecord | null;
      operational_telemetry: PaperImplementationRuntimeOperationalTelemetry;
    };
    assert.equal(body.status, 'passed');
    assert.equal(body.provider_call_count, 4);
    assert.equal(body.operational_telemetry.provider_call_count, 4);
    assert.equal(body.operational_telemetry.role_provider_call_count, 4);
    assert.equal(body.operational_telemetry.final_provider_call_count, 4);
    assert.equal(body.operational_telemetry.provider_call_count_consistent, true);
    assert.equal(body.operational_telemetry.runtime_artifact_count, 5);
    assert.equal(body.operational_telemetry.role_artifact_count, 4);
    assert.equal(body.operational_telemetry.final_artifact_count, 1);
    assert.equal(body.operational_telemetry.rejected_admission_count, 0);
    assert.equal(body.operational_telemetry.non_provider_artifact_count, 0);
    assert.equal(body.operational_telemetry.response_reuse_status_counts.miss, 5);
    assert.equal(gateway.calls.length, 4);
    assert.deepEqual(gateway.calls.map((call) => call.executionContext.operation), [
      ...PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_SEMANTIC_ROLE_SLOT_IDS,
    ]);
    assert.equal(gateway.calls.every((call) => call.executionContext.feature === 'paper_implementation'), true);
    assert.match(gateway.calls[0]?.messages[1]?.content ?? '', /"retrieval_packet"/);
    assert.equal(body.runtime_artifacts.length, 5);
    assert.equal(body.final_admission_record?.admission_status, 'admitted');
    assert.equal(body.runtime_artifacts.some((artifact) => artifact.execution_mode !== 'provider_llm'), false);
    assert.equal(body.runtime_artifacts.some((artifact) => artifact.response_reuse_status !== 'miss'), false);
    assert.equal(body.runtime_artifacts.every((artifact) => artifact.artifact_payload), true);

    const finalArtifacts = await app.inject({
      method: 'GET',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-artifacts?slot_id=${encodeURIComponent(
        PAPER_IMPLEMENTATION_TRACE_INTEGRITY_BOUNDARY_DEBATE_SLOT_ID,
      )}&artifact_scope=final`,
    });
    assert.equal(finalArtifacts.statusCode, 200);
    const finalArtifactsBody = finalArtifacts.json() as { items: PaperImplementationRuntimeArtifactEnvelope[] };
    assert.equal(finalArtifactsBody.items.length, 1);
    assert.equal(finalArtifactsBody.items[0]?.provider_call_count, 4);
  } finally {
    await app.close();
  }
});

test('PaperImplementation trace-integrity runtime run route rejects body-owned runtime identity', async () => {
  const app = buildApp({
    paperImplementationRuntimeRepository: new InMemoryPaperImplementationRuntimeRepository(),
    paperImplementationTraceIntegrityDebateLlmGateway: new StubTraceIntegrityGateway(),
  });
  try {
    const response = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/trace-integrity-boundary-debate/run`,
      payload: {
        ...traceIntegrityRunPayload(),
        implementation_project_id: 'other-project',
      },
    });

    assert.equal(response.statusCode, 400);
    assert.match(response.body, /implementation_project_id/);
  } finally {
    await app.close();
  }
});

test('PaperImplementation claim-boundary runtime run route uses the production slot service path', async () => {
  const runtimeRepository = new InMemoryPaperImplementationRuntimeRepository();
  const gateway = new StubP1RuntimeGateway();
  const app = buildApp({
    paperImplementationRuntimeRepository: runtimeRepository,
    paperImplementationP1RuntimeReviewLlmGateway: gateway,
  });
  try {
    const response = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/claim-boundary-debate/run`,
      payload: p1RunPayload('claim'),
    });

    assert.equal(response.statusCode, 201);
    const body = response.json() as {
      status: string;
      provider_call_count: number;
      runtime_artifacts: PaperImplementationRuntimeArtifactEnvelope[];
      final_admission_record: PaperImplementationRuntimeAdmissionRecord | null;
      operational_telemetry: PaperImplementationRuntimeOperationalTelemetry;
    };
    assert.equal(body.status, 'passed');
    assert.equal(body.provider_call_count, 3);
    assert.equal(body.operational_telemetry.provider_call_count, 3);
    assert.equal(body.operational_telemetry.role_provider_call_count, 3);
    assert.equal(body.operational_telemetry.final_provider_call_count, 3);
    assert.equal(body.operational_telemetry.provider_call_count_consistent, true);
    assert.equal(body.operational_telemetry.runtime_artifact_count, 4);
    assert.equal(body.operational_telemetry.role_artifact_count, 3);
    assert.equal(body.operational_telemetry.final_artifact_count, 1);
    assert.equal(body.operational_telemetry.rejected_admission_count, 0);
    assert.equal(body.operational_telemetry.non_provider_artifact_count, 0);
    assert.equal(gateway.calls.length, 3);
    assert.deepEqual(gateway.calls.map((call) => call.executionContext.operation), [
      ...PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_REVIEW_ROLE_SLOT_IDS,
    ]);
    assert.equal(gateway.calls.every((call) => call.executionContext.feature === 'paper_implementation'), true);
    assert.equal(body.runtime_artifacts.length, 4);
    assert.equal(body.final_admission_record?.admission_status, 'admitted');
    assert.equal(body.runtime_artifacts.every((artifact) => artifact.slot_id === PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_SLOT_ID), true);
    assert.equal(body.runtime_artifacts.every((artifact) => artifact.artifact_payload), true);

    const finalArtifacts = await app.inject({
      method: 'GET',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-artifacts?slot_id=${encodeURIComponent(
        PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_SLOT_ID,
      )}&artifact_scope=final`,
    });
    assert.equal(finalArtifacts.statusCode, 200);
    const finalArtifactsBody = finalArtifacts.json() as { items: PaperImplementationRuntimeArtifactEnvelope[] };
    assert.equal(finalArtifactsBody.items.length, 1);
  } finally {
    await app.close();
  }
});

test('PaperImplementation P1 runtime routes reject slot profile drift before gateway calls', async () => {
  const gateway = new StubP1RuntimeGateway();
  const app = buildApp({
    paperImplementationRuntimeRepository: new InMemoryPaperImplementationRuntimeRepository(),
    paperImplementationP1RuntimeReviewLlmGateway: gateway,
  });
  try {
    const profileMismatch = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/claim-boundary-debate/run`,
      payload: {
        ...p1RunPayload('claim'),
        run_id: 'claim-boundary-http-profile-mismatch',
        model_profile_id: PAPER_IMPLEMENTATION_DOSSIER_READINESS_AUDIT_PROFILE_ID,
        model_option_id: `${PAPER_IMPLEMENTATION_DOSSIER_READINESS_AUDIT_PROFILE_ID}.openai-balanced`,
      },
    });
    assert.equal(profileMismatch.statusCode, 400);
    assert.match(profileMismatch.body, /model_profile_id/);

    const modelOptionMismatch = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/claim-boundary-debate/run`,
      payload: {
        ...p1RunPayload('claim'),
        run_id: 'claim-boundary-http-model-option-mismatch',
        model_option_id: `${PAPER_IMPLEMENTATION_DOSSIER_READINESS_AUDIT_PROFILE_ID}.openai-balanced`,
      },
    });
    assert.equal(modelOptionMismatch.statusCode, 400);
    assert.match(modelOptionMismatch.body, /model_option_id/);
    assert.equal(gateway.calls.length, 0);
  } finally {
    await app.close();
  }
});

test('PaperImplementation result-analysis runtime route rejects slot profile drift before gateway calls', async () => {
  const gateway = new StubResultAnalysisGateway();
  const app = buildApp({
    paperImplementationRuntimeRepository: new InMemoryPaperImplementationRuntimeRepository(),
    paperImplementationResultAnalysisLlmGateway: gateway,
  });
  try {
    const profileMismatch = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/result-analysis-scenarios/run`,
      payload: {
        ...resultAnalysisRunPayload(),
        run_id: 'result-analysis-http-profile-mismatch',
        model_profile_id: PAPER_IMPLEMENTATION_DOSSIER_READINESS_AUDIT_PROFILE_ID,
        model_option_id: `${PAPER_IMPLEMENTATION_DOSSIER_READINESS_AUDIT_PROFILE_ID}.openai-balanced`,
      },
    });
    assert.equal(profileMismatch.statusCode, 400);
    assert.match(profileMismatch.body, /model_profile_id/);

    const modelOptionMismatch = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/result-analysis-scenarios/run`,
      payload: {
        ...resultAnalysisRunPayload(),
        run_id: 'result-analysis-http-model-option-mismatch',
        model_option_id: `${PAPER_IMPLEMENTATION_DOSSIER_READINESS_AUDIT_PROFILE_ID}.openai-balanced`,
      },
    });
    assert.equal(modelOptionMismatch.statusCode, 400);
    assert.match(modelOptionMismatch.body, /model_option_id/);
    assert.equal(gateway.calls.length, 0);
  } finally {
    await app.close();
  }
});

test('PaperImplementation dossier-readiness runtime run route uses the production slot service path', async () => {
  const runtimeRepository = new InMemoryPaperImplementationRuntimeRepository();
  const gateway = new StubP1RuntimeGateway();
  const app = buildApp({
    paperImplementationRuntimeRepository: runtimeRepository,
    paperImplementationP1RuntimeReviewLlmGateway: gateway,
  });
  try {
    const response = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/dossier-readiness-audit/run`,
      payload: p1RunPayload('dossier'),
    });

    assert.equal(response.statusCode, 201);
    const body = response.json() as {
      status: string;
      provider_call_count: number;
      runtime_artifacts: PaperImplementationRuntimeArtifactEnvelope[];
      final_runtime_artifact: PaperImplementationRuntimeArtifactEnvelope | null;
      final_admission_record: PaperImplementationRuntimeAdmissionRecord | null;
    };
    assert.equal(body.status, 'passed');
    assert.equal(body.provider_call_count, 3);
    assert.deepEqual(gateway.calls.map((call) => call.executionContext.operation), [
      ...PAPER_IMPLEMENTATION_DOSSIER_READINESS_REVIEW_ROLE_SLOT_IDS,
    ]);
    assert.equal(body.runtime_artifacts.every((artifact) => artifact.slot_id === PAPER_IMPLEMENTATION_DOSSIER_READINESS_AUDIT_SLOT_ID), true);
    assert.equal(body.final_runtime_artifact?.artifact_payload.scenario_outputs instanceof Array, true);
    assert.equal(body.final_admission_record?.admission_status, 'admitted');
  } finally {
    await app.close();
  }
});

test('PaperImplementation result-analysis runtime run route uses the production slot service path', async () => {
  const fixture = await resultAnalysisDomainGateFixture();
  const gateway = new StubResultAnalysisGateway();
  const app = buildApp({
    paperImplementationRepository: fixture.projectRepository,
    paperImplementationTraceRepository: fixture.traceRepository,
    paperImplementationValidationRepository: fixture.validationRepository,
    paperImplementationWorkOrderRepository: fixture.workOrderRepository,
    paperImplementationResultClaimDossierRepository: fixture.resultRepository,
    paperImplementationRuntimeRepository: fixture.runtimeRepository,
    paperImplementationResultAnalysisLlmGateway: gateway,
  });
  try {
    const response = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/result-analysis-scenarios/run`,
      payload: resultAnalysisRunPayload(),
    });

    assert.equal(response.statusCode, 201);
    const body = response.json() as {
      status: string;
      provider_call_count: number;
      runtime_artifacts: PaperImplementationRuntimeArtifactEnvelope[];
      final_runtime_artifact: PaperImplementationRuntimeArtifactEnvelope | null;
      final_admission_record: PaperImplementationRuntimeAdmissionRecord | null;
      operational_telemetry: PaperImplementationRuntimeOperationalTelemetry;
    };
    assert.equal(body.status, 'passed');
    assert.equal(body.provider_call_count, 1);
    assert.equal(gateway.calls.length, 1);
    assert.equal(gateway.calls[0]?.executionContext.operation, PAPER_IMPLEMENTATION_RESULT_ANALYSIS_ROLE_SLOT_ID);
    assert.equal(gateway.calls[0]?.executionContext.feature, 'paper_implementation');
    assert.equal(body.runtime_artifacts.length, 2);
    assert.equal(body.runtime_artifacts.every((artifact) => artifact.slot_id === PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SLOT_ID), true);
    assert.equal(body.final_runtime_artifact?.artifact_payload.scenario_outputs instanceof Array, true);
    assert.equal(
      (body.final_runtime_artifact?.artifact_payload.scenario_outputs as unknown[] | undefined)?.length,
      4,
    );
    assert.equal(body.final_runtime_artifact?.artifact_payload.domain_gate_request !== null, true);
    assert.equal(body.final_admission_record?.admission_status, 'admitted');
    assert.equal(body.operational_telemetry.provider_call_count, 1);
    assert.equal(body.operational_telemetry.role_provider_call_count, 1);
    assert.equal(body.operational_telemetry.final_provider_call_count, 1);
    assert.equal(body.operational_telemetry.provider_call_count_consistent, true);

    const finalArtifacts = await app.inject({
      method: 'GET',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-artifacts?slot_id=${encodeURIComponent(
        PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SLOT_ID,
      )}&artifact_scope=final`,
    });
    assert.equal(finalArtifacts.statusCode, 200);
    const finalArtifactsBody = finalArtifacts.json() as { items: PaperImplementationRuntimeArtifactEnvelope[] };
    assert.equal(finalArtifactsBody.items.length, 1);

    assert.ok(body.final_runtime_artifact);
    const materialize = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-artifacts/${encodeURIComponent(
        body.final_runtime_artifact.runtime_artifact_id,
      )}/materialize-domain-gate`,
    });
    assert.equal(materialize.statusCode, 201);
    const materializeBody = materialize.json() as {
      status: string;
      domain_artifact_ref: TopicSelectionFunctionalRef;
    };
    assert.equal(materializeBody.status, 'materialized');
    assert.equal(materializeBody.domain_artifact_ref.ref_type, 'result_interpretation_packet');
    assert.equal(materializeBody.domain_artifact_ref.ref_id, RESULT_PACKET_ID);

    const replay = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-artifacts/${encodeURIComponent(
        body.final_runtime_artifact.runtime_artifact_id,
      )}/materialize-domain-gate`,
    });
    assert.equal(replay.statusCode, 200);
    assert.equal((replay.json() as { status: string }).status, 'already_materialized');
  } finally {
    await app.close();
  }
});

test('PaperImplementation experiment planning runtime routes use production slot services without Domain Gate writes', async () => {
  const runtimeRepository = new InMemoryPaperImplementationRuntimeRepository();
  const gateway = new StubExperimentPlanningGateway();
  const app = buildApp({
    paperImplementationRuntimeRepository: runtimeRepository,
    paperImplementationExperimentPlanningLlmGateway: gateway,
  });
  try {
    const design = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/experiment-design-work-order-draft/run`,
      payload: experimentPlanningRunPayload('design'),
    });
    assert.equal(design.statusCode, 201);
    const designBody = design.json() as {
      status: string;
      provider_call_count: number;
      runtime_artifacts: PaperImplementationRuntimeArtifactEnvelope[];
      final_runtime_artifact: PaperImplementationRuntimeArtifactEnvelope | null;
      final_admission_record: PaperImplementationRuntimeAdmissionRecord | null;
      operational_telemetry: PaperImplementationRuntimeOperationalTelemetry;
    };
    assert.equal(designBody.status, 'passed');
    assert.equal(designBody.provider_call_count, 1);
    assert.equal(gateway.calls[0]?.executionContext.operation, PAPER_IMPLEMENTATION_EXPERIMENT_DESIGN_ROLE_SLOT_ID);
    assert.equal(gateway.calls[0]?.executionContext.feature, 'paper_implementation');
    assert.equal(designBody.runtime_artifacts.length, 2);
    assert.equal(designBody.runtime_artifacts.every((artifact) => artifact.slot_id === PAPER_IMPLEMENTATION_EXPERIMENT_DESIGN_SLOT_ID), true);
    assert.equal(
      (designBody.final_runtime_artifact?.artifact_payload.work_order_draft_candidates as unknown[] | undefined)?.length,
      2,
    );
    assert.equal('domain_gate_request' in (designBody.final_runtime_artifact?.artifact_payload ?? {}), false);
    assert.equal(designBody.final_runtime_artifact?.artifact_payload.no_execution_side_effect, true);
    assert.equal(designBody.final_admission_record?.admission_status, 'admitted');
    assert.equal(designBody.operational_telemetry.provider_call_count_consistent, true);

    assert.ok(designBody.final_runtime_artifact);
    const rejectedMaterialize = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-artifacts/${encodeURIComponent(
        designBody.final_runtime_artifact.runtime_artifact_id,
      )}/materialize-domain-gate`,
    });
    assertErrorCode(rejectedMaterialize, 409, 'GATE_CONSTRAINT_FAILED');

    const critique = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/experiment-critique-plan-critique/run`,
      payload: experimentPlanningRunPayload('critique'),
    });
    assert.equal(critique.statusCode, 201);
    const critiqueBody = critique.json() as {
      status: string;
      provider_call_count: number;
      runtime_artifacts: PaperImplementationRuntimeArtifactEnvelope[];
      final_runtime_artifact: PaperImplementationRuntimeArtifactEnvelope | null;
      final_admission_record: PaperImplementationRuntimeAdmissionRecord | null;
    };
    assert.equal(critiqueBody.status, 'passed');
    assert.equal(critiqueBody.provider_call_count, 1);
    assert.equal(gateway.calls[1]?.executionContext.operation, PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_ROLE_SLOT_ID);
    assert.equal(critiqueBody.runtime_artifacts.every((artifact) => artifact.slot_id === PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_SLOT_ID), true);
    assert.deepEqual(
      critiqueBody.final_runtime_artifact?.artifact_payload.checked_dimensions,
      [...PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_DIMENSIONS],
    );
    assert.equal(critiqueBody.final_runtime_artifact?.artifact_payload.critique_decision !== null, true);
    assert.equal('domain_gate_request' in (critiqueBody.final_runtime_artifact?.artifact_payload ?? {}), false);
    assert.equal(critiqueBody.final_admission_record?.admission_status, 'admitted');

    const designFinalArtifacts = await app.inject({
      method: 'GET',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-artifacts?slot_id=${encodeURIComponent(
        PAPER_IMPLEMENTATION_EXPERIMENT_DESIGN_SLOT_ID,
      )}&artifact_scope=final`,
    });
    assert.equal(designFinalArtifacts.statusCode, 200);
    assert.equal((designFinalArtifacts.json() as { items: unknown[] }).items.length, 1);

    const critiqueFinalArtifacts = await app.inject({
      method: 'GET',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-artifacts?slot_id=${encodeURIComponent(
        PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_SLOT_ID,
      )}&artifact_scope=final`,
    });
    assert.equal(critiqueFinalArtifacts.statusCode, 200);
    assert.equal((critiqueFinalArtifacts.json() as { items: unknown[] }).items.length, 1);
  } finally {
    await app.close();
  }
});

test('PaperImplementation experiment planning runtime routes reject slot profile drift before gateway calls', async () => {
  const gateway = new StubExperimentPlanningGateway();
  const app = buildApp({
    paperImplementationRuntimeRepository: new InMemoryPaperImplementationRuntimeRepository(),
    paperImplementationExperimentPlanningLlmGateway: gateway,
  });
  try {
    const profileMismatch = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/experiment-design-work-order-draft/run`,
      payload: {
        ...experimentPlanningRunPayload('design'),
        run_id: 'experiment-design-http-profile-mismatch',
        model_profile_id: PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_PROFILE_ID,
        model_option_id: `${PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_PROFILE_ID}.openai-balanced`,
      },
    });
    assert.equal(profileMismatch.statusCode, 400);
    assert.match(profileMismatch.body, /model_profile_id/);

    const modelOptionMismatch = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/experiment-critique-plan-critique/run`,
      payload: {
        ...experimentPlanningRunPayload('critique'),
        run_id: 'experiment-critique-http-model-option-mismatch',
        model_option_id: `${PAPER_IMPLEMENTATION_EXPERIMENT_DESIGN_PROFILE_ID}.openai-balanced`,
      },
    });
    assert.equal(modelOptionMismatch.statusCode, 400);
    assert.match(modelOptionMismatch.body, /model_option_id/);
    assert.equal(gateway.calls.length, 0);
  } finally {
    await app.close();
  }
});

test('PaperImplementation result-analysis Domain Gate route rejects malformed and drifted payloads', async () => {
  const fixture = await resultAnalysisDomainGateFixture();
  const gateway = new StubResultAnalysisGateway([
    resultAnalysisRoleOutput(),
    resultAnalysisRoleOutput({
      domain_gate_request: {
        ...resultAnalysisDomainGateRequest(),
        result_summary: {
          ...resultAnalysisDomainGateRequest().result_summary,
          result_summary: 'Drifted result interpretation payload.',
        },
      },
    }),
    resultAnalysisRoleOutput({
      domain_gate_request: { result_interpretation_packet_id: 'malformed-result-packet-http-1' },
    }),
  ]);
  const app = buildApp({
    paperImplementationRepository: fixture.projectRepository,
    paperImplementationTraceRepository: fixture.traceRepository,
    paperImplementationValidationRepository: fixture.validationRepository,
    paperImplementationWorkOrderRepository: fixture.workOrderRepository,
    paperImplementationResultClaimDossierRepository: fixture.resultRepository,
    paperImplementationRuntimeRepository: fixture.runtimeRepository,
    paperImplementationResultAnalysisLlmGateway: gateway,
  });
  try {
    const firstRun = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/result-analysis-scenarios/run`,
      payload: {
        ...resultAnalysisRunPayload(),
        run_id: 'result-analysis-http-domain-gate-first',
      },
    });
    assert.equal(firstRun.statusCode, 201);
    const firstBody = firstRun.json() as { final_runtime_artifact: PaperImplementationRuntimeArtifactEnvelope | null };
    assert.ok(firstBody.final_runtime_artifact);
    const firstMaterialize = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-artifacts/${encodeURIComponent(
        firstBody.final_runtime_artifact.runtime_artifact_id,
      )}/materialize-domain-gate`,
    });
    assert.equal(firstMaterialize.statusCode, 201);

    const driftRun = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/result-analysis-scenarios/run`,
      payload: {
        ...resultAnalysisRunPayload(),
        run_id: 'result-analysis-http-domain-gate-drift',
      },
    });
    assert.equal(driftRun.statusCode, 201);
    const driftBody = driftRun.json() as { final_runtime_artifact: PaperImplementationRuntimeArtifactEnvelope | null };
    assert.ok(driftBody.final_runtime_artifact);
    const driftMaterialize = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-artifacts/${encodeURIComponent(
        driftBody.final_runtime_artifact.runtime_artifact_id,
      )}/materialize-domain-gate`,
    });
    assertErrorCode(driftMaterialize, 409, 'VERSION_CONFLICT');

    const malformedRun = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/result-analysis-scenarios/run`,
      payload: {
        ...resultAnalysisRunPayload(),
        run_id: 'result-analysis-http-domain-gate-malformed',
      },
    });
    assert.equal(malformedRun.statusCode, 201);
    const malformedBody = malformedRun.json() as { final_runtime_artifact: PaperImplementationRuntimeArtifactEnvelope | null };
    assert.ok(malformedBody.final_runtime_artifact);
    const malformedMaterialize = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-artifacts/${encodeURIComponent(
        malformedBody.final_runtime_artifact.runtime_artifact_id,
      )}/materialize-domain-gate`,
    });
    assertErrorCode(malformedMaterialize, 400, 'INVALID_PAYLOAD');
  } finally {
    await app.close();
  }
});

test('PaperImplementation runtime routes retry once and fail closed on provider gateway failure for every product slot', async () => {
  const traceGateway = new FailingProviderGateway();
  await assertRuntimeRouteFailsClosed({
    appOptions: {
      paperImplementationRuntimeRepository: new InMemoryPaperImplementationRuntimeRepository(),
      paperImplementationTraceIntegrityDebateLlmGateway: traceGateway,
    },
    url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/trace-integrity-boundary-debate/run`,
    payload: traceIntegrityRunPayload(),
    expectedSlotId: PAPER_IMPLEMENTATION_TRACE_INTEGRITY_BOUNDARY_DEBATE_SLOT_ID,
    expectedFailureCode: 'TimeoutError',
  });
  assert.equal(traceGateway.calls.length, 2);

  const claimGateway = new FailingProviderGateway();
  await assertRuntimeRouteFailsClosed({
    appOptions: {
      paperImplementationRuntimeRepository: new InMemoryPaperImplementationRuntimeRepository(),
      paperImplementationP1RuntimeReviewLlmGateway: claimGateway,
    },
    url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/claim-boundary-debate/run`,
    payload: p1RunPayload('claim'),
    expectedSlotId: PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_SLOT_ID,
    expectedFailureCode: 'TimeoutError',
  });
  assert.equal(claimGateway.calls.length, 2);

  const dossierGateway = new FailingProviderGateway();
  await assertRuntimeRouteFailsClosed({
    appOptions: {
      paperImplementationRuntimeRepository: new InMemoryPaperImplementationRuntimeRepository(),
      paperImplementationP1RuntimeReviewLlmGateway: dossierGateway,
    },
    url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/dossier-readiness-audit/run`,
    payload: p1RunPayload('dossier'),
    expectedSlotId: PAPER_IMPLEMENTATION_DOSSIER_READINESS_AUDIT_SLOT_ID,
    expectedFailureCode: 'TimeoutError',
  });
  assert.equal(dossierGateway.calls.length, 2);

  const resultAnalysisGateway = new FailingProviderGateway();
  await assertRuntimeRouteFailsClosed({
    appOptions: {
      paperImplementationRuntimeRepository: new InMemoryPaperImplementationRuntimeRepository(),
      paperImplementationResultAnalysisLlmGateway: resultAnalysisGateway,
    },
    url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/result-analysis-scenarios/run`,
    payload: resultAnalysisRunPayload(),
    expectedSlotId: PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SLOT_ID,
    expectedFailureCode: 'TimeoutError',
  });
  assert.equal(resultAnalysisGateway.calls.length, 2);

  const experimentDesignGateway = new FailingProviderGateway();
  await assertRuntimeRouteFailsClosed({
    appOptions: {
      paperImplementationRuntimeRepository: new InMemoryPaperImplementationRuntimeRepository(),
      paperImplementationExperimentPlanningLlmGateway: experimentDesignGateway,
    },
    url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/experiment-design-work-order-draft/run`,
    payload: experimentPlanningRunPayload('design'),
    expectedSlotId: PAPER_IMPLEMENTATION_EXPERIMENT_DESIGN_SLOT_ID,
    expectedFailureCode: 'TimeoutError',
  });
  assert.equal(experimentDesignGateway.calls.length, 2);

  const experimentCritiqueGateway = new FailingProviderGateway();
  await assertRuntimeRouteFailsClosed({
    appOptions: {
      paperImplementationRuntimeRepository: new InMemoryPaperImplementationRuntimeRepository(),
      paperImplementationExperimentPlanningLlmGateway: experimentCritiqueGateway,
    },
    url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/experiment-critique-plan-critique/run`,
    payload: experimentPlanningRunPayload('critique'),
    expectedSlotId: PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_SLOT_ID,
    expectedFailureCode: 'TimeoutError',
  });
  assert.equal(experimentCritiqueGateway.calls.length, 2);
});

test('PaperImplementation claim-boundary runtime route retries once and fails closed on schema-invalid provider output', async () => {
  const gateway = new InvalidProviderOutputGateway();
  const body = await assertRuntimeRouteFailsClosed({
    appOptions: {
      paperImplementationRuntimeRepository: new InMemoryPaperImplementationRuntimeRepository(),
      paperImplementationP1RuntimeReviewLlmGateway: gateway,
    },
    url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/claim-boundary-debate/run`,
    payload: p1RunPayload('claim'),
    expectedSlotId: PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_SLOT_ID,
    expectedFailureCode: 'SCHEMA_VALIDATION_FAILED',
  });

  assert.equal(gateway.calls.length, 2);
  assert.equal(JSON.stringify(body).includes('domain_gate_request'), false);
});

test('PaperImplementation runtime Domain Gate route rejects blocked and failed runtime artifacts', async () => {
  const runtimeRepository = new InMemoryPaperImplementationRuntimeRepository();
  const gateway = new StubP1RuntimeGateway();
  const app = buildApp({
    paperImplementationRuntimeRepository: runtimeRepository,
    paperImplementationP1RuntimeReviewLlmGateway: gateway,
  });
  try {
    const blockedRun = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/claim-boundary-debate/run`,
      payload: {
        ...p1RunPayload('claim'),
        run_id: 'claim-boundary-http-domain-gate-blocked-run',
        preflight_blocker_codes: ['domain_gate_blocker_fixture'],
      },
    });
    assert.equal(blockedRun.statusCode, 201);
    const blockedBody = blockedRun.json() as {
      status: string;
      provider_call_count: number;
      final_runtime_artifact: PaperImplementationRuntimeArtifactEnvelope | null;
      final_admission_record: PaperImplementationRuntimeAdmissionRecord | null;
    };
    assert.equal(blockedBody.status, 'blocked');
    assert.equal(blockedBody.provider_call_count, 0);
    assert.equal(gateway.calls.length, 0);
    assert.ok(blockedBody.final_runtime_artifact);
    assert.equal(blockedBody.final_runtime_artifact.runtime_status, 'blocked');
    assert.equal(blockedBody.final_admission_record?.admission_status, 'admitted');

    const blockedMaterialize = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-artifacts/${encodeURIComponent(
        blockedBody.final_runtime_artifact.runtime_artifact_id,
      )}/materialize-domain-gate`,
    });
    assertErrorCode(blockedMaterialize, 409, 'GATE_CONSTRAINT_FAILED');
    assert.match(blockedMaterialize.body, /only materializes passed runtime artifacts/);

    const failedFinalPayload = {
      ...(blockedBody.final_runtime_artifact.artifact_payload as Record<string, unknown>),
      status: 'failed_runtime',
      runtime_failure_code: 'TimeoutError',
      domain_gate_request: null,
    };
    const failedFinal = await runtimeRepository.createRuntimeArtifact({
      ...blockedBody.final_runtime_artifact,
      runtime_artifact_id: 'runtime-artifact-http-failed-final-1',
      artifact_identity_hash: hash('failed-final-envelope'),
      runtime_identity_hash: hash('failed-final-runtime-identity'),
      runtime_status: 'failed_runtime',
      runtime_failure_code: 'TimeoutError',
      provider_call_count: 1,
      blocker_codes: ['TimeoutError'],
      artifact_payload: failedFinalPayload,
      artifact_payload_hash: hash('failed-final-payload'),
      output_hash: hash('failed-final-output'),
    });
    const failedMaterialize = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-artifacts/${encodeURIComponent(
        failedFinal.runtime_artifact_id,
      )}/materialize-domain-gate`,
    });
    assertErrorCode(failedMaterialize, 409, 'GATE_CONSTRAINT_FAILED');
    assert.match(failedMaterialize.body, /only materializes passed runtime artifacts/);
  } finally {
    await app.close();
  }
});

test(
  'PaperImplementation trace-integrity live provider canary uses the configured gateway',
  {
    skip: shouldRunLiveTraceIntegrityCanary()
      ? false
      : 'set T114_TRACE_INTEGRITY_PROVIDER_CANARY_LIVE=1, BACKEND_TEST_PRESERVE_REAL_ENV=1, provider id/key to run',
    timeout: 900_000,
  },
  async () => {
    const providerId = liveProviderId();
    const app = buildApp({
      paperImplementationRuntimeRepository: new InMemoryPaperImplementationRuntimeRepository(),
      paperImplementationTraceIntegrityDebateLlmGateway: new BackendLlmGateway({
        defaultTimeoutMs: 300_000,
        defaultMaxRetries: 0,
      }),
    });
    try {
      const response = await app.inject({
        method: 'POST',
        url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/trace-integrity-boundary-debate/run`,
        payload: traceIntegrityRunPayload(providerId),
      });

      assert.equal(response.statusCode, 201);
      const body = response.json() as {
        status: string;
        provider_call_count: number;
        runtime_artifacts: PaperImplementationRuntimeArtifactEnvelope[];
        admission_records: PaperImplementationRuntimeAdmissionRecord[];
        final_admission_record: PaperImplementationRuntimeAdmissionRecord | null;
      };
      assert.notEqual(body.status, 'failed_runtime');
      assert.equal(body.provider_call_count, 4);
      assert.equal(body.runtime_artifacts.length, 5);
      assert.equal(
        body.runtime_artifacts.some((artifact) => artifact.runtime_status === 'failed_runtime'),
        false,
      );
      assert.equal(body.admission_records.every((record) => record.admission_status === 'admitted'), true);
      assert.equal(body.final_admission_record?.admission_status, 'admitted');
    } finally {
      await app.close();
    }
  },
);

test(
  'PaperImplementation claim-boundary live provider canary uses the configured gateway',
  {
    skip: shouldRunLiveP1Canary('claim')
      ? false
      : 'set T114_P1_CLAIM_BOUNDARY_PROVIDER_CANARY_LIVE=1, BACKEND_TEST_PRESERVE_REAL_ENV=1, provider id/key to run',
    timeout: 900_000,
  },
  async () => {
    const providerId = liveProviderId();
    const app = buildApp({
      paperImplementationRuntimeRepository: new InMemoryPaperImplementationRuntimeRepository(),
      paperImplementationP1RuntimeReviewLlmGateway: new BackendLlmGateway({
        defaultTimeoutMs: 300_000,
        defaultMaxRetries: 0,
      }),
    });
    try {
      const response = await app.inject({
        method: 'POST',
        url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/claim-boundary-debate/run`,
        payload: p1RunPayload('claim', providerId),
      });

      assertP1ProviderCanaryResponse(response, PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_SLOT_ID);
    } finally {
      await app.close();
    }
  },
);

test(
  'PaperImplementation dossier-readiness live provider canary uses the configured gateway',
  {
    skip: shouldRunLiveP1Canary('dossier')
      ? false
      : 'set T114_P1_DOSSIER_READINESS_PROVIDER_CANARY_LIVE=1, BACKEND_TEST_PRESERVE_REAL_ENV=1, provider id/key to run',
    timeout: 900_000,
  },
  async () => {
    const providerId = liveProviderId();
    const app = buildApp({
      paperImplementationRuntimeRepository: new InMemoryPaperImplementationRuntimeRepository(),
      paperImplementationP1RuntimeReviewLlmGateway: new BackendLlmGateway({
        defaultTimeoutMs: 300_000,
        defaultMaxRetries: 0,
      }),
    });
    try {
      const response = await app.inject({
        method: 'POST',
        url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/dossier-readiness-audit/run`,
        payload: p1RunPayload('dossier', providerId),
      });

      assertP1ProviderCanaryResponse(response, PAPER_IMPLEMENTATION_DOSSIER_READINESS_AUDIT_SLOT_ID);
    } finally {
      await app.close();
    }
  },
);

test(
  'PaperImplementation result-analysis live provider canary uses the configured gateway',
  {
    skip: shouldRunLiveResultAnalysisCanary()
      ? false
      : 'set T114_RESULT_ANALYSIS_PROVIDER_CANARY_LIVE=1, BACKEND_TEST_PRESERVE_REAL_ENV=1, provider id/key to run',
    timeout: 900_000,
  },
  async () => {
    const providerId = liveProviderId();
    const app = buildApp({
      paperImplementationRuntimeRepository: new InMemoryPaperImplementationRuntimeRepository(),
      paperImplementationResultAnalysisLlmGateway: new BackendLlmGateway({
        defaultTimeoutMs: 300_000,
        defaultMaxRetries: 0,
      }),
    });
    try {
      const response = await app.inject({
        method: 'POST',
        url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/result-analysis-scenarios/run`,
        payload: resultAnalysisRunPayload(providerId),
      });

      assertResultAnalysisProviderCanaryResponse(response);
    } finally {
      await app.close();
    }
  },
);

test(
  'PaperImplementation experiment-design live provider canary uses the configured gateway',
  {
    skip: shouldRunLiveExperimentPlanningCanary('design')
      ? false
      : 'set T114_EXPERIMENT_DESIGN_PROVIDER_CANARY_LIVE=1, BACKEND_TEST_PRESERVE_REAL_ENV=1, provider id/key to run',
    timeout: 900_000,
  },
  async () => {
    const providerId = liveProviderId();
    const app = buildApp({
      paperImplementationRuntimeRepository: new InMemoryPaperImplementationRuntimeRepository(),
      paperImplementationExperimentPlanningLlmGateway: new BackendLlmGateway({
        defaultTimeoutMs: 300_000,
        defaultMaxRetries: 0,
      }),
    });
    try {
      const response = await app.inject({
        method: 'POST',
        url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/experiment-design-work-order-draft/run`,
        payload: experimentPlanningRunPayload('design', providerId),
      });

      assertExperimentPlanningProviderCanaryResponse(response, PAPER_IMPLEMENTATION_EXPERIMENT_DESIGN_SLOT_ID);
    } finally {
      await app.close();
    }
  },
);

test(
  'PaperImplementation experiment-critique live provider canary uses the configured gateway',
  {
    skip: shouldRunLiveExperimentPlanningCanary('critique')
      ? false
      : 'set T114_EXPERIMENT_CRITIQUE_PROVIDER_CANARY_LIVE=1, BACKEND_TEST_PRESERVE_REAL_ENV=1, provider id/key to run',
    timeout: 900_000,
  },
  async () => {
    const providerId = liveProviderId();
    const app = buildApp({
      paperImplementationRuntimeRepository: new InMemoryPaperImplementationRuntimeRepository(),
      paperImplementationExperimentPlanningLlmGateway: new BackendLlmGateway({
        defaultTimeoutMs: 300_000,
        defaultMaxRetries: 0,
      }),
    });
    try {
      const response = await app.inject({
        method: 'POST',
        url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/experiment-critique-plan-critique/run`,
        payload: experimentPlanningRunPayload('critique', providerId),
      });

      assertExperimentPlanningProviderCanaryResponse(response, PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_SLOT_ID);
    } finally {
      await app.close();
    }
  },
);

test(
  'PaperImplementation live provider fail-closed canary rejects provider auth or availability failures without fallback',
  {
    skip: shouldRunLiveProviderFailClosedCanary()
      ? false
      : 'set T114_PROVIDER_FAIL_CLOSED_CANARY_LIVE=1 and BACKEND_TEST_PRESERVE_REAL_ENV=1 to run the live fail-closed provider canary',
    timeout: 240_000,
  },
  async () => {
    const providerId = liveProviderId();
    const previousEnv = installInvalidProviderKey(providerId);
    try {
      await assertLiveProviderRuntimeRouteFailsClosed({
        appOptions: {
          paperImplementationRuntimeRepository: new InMemoryPaperImplementationRuntimeRepository(),
          paperImplementationTraceIntegrityDebateLlmGateway: liveFailClosedGateway(),
        },
        url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/trace-integrity-boundary-debate/run`,
        payload: {
          ...traceIntegrityRunPayload(providerId),
          run_id: `trace-integrity-http-live-fail-closed-${Date.now()}`,
        },
        expectedSlotId: PAPER_IMPLEMENTATION_TRACE_INTEGRITY_BOUNDARY_DEBATE_SLOT_ID,
      });

      await assertLiveProviderRuntimeRouteFailsClosed({
        appOptions: {
          paperImplementationRuntimeRepository: new InMemoryPaperImplementationRuntimeRepository(),
          paperImplementationP1RuntimeReviewLlmGateway: liveFailClosedGateway(),
        },
        url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/claim-boundary-debate/run`,
        payload: {
          ...p1RunPayload('claim', providerId),
          run_id: `claim-boundary-http-live-fail-closed-${Date.now()}`,
        },
        expectedSlotId: PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_SLOT_ID,
      });

      await assertLiveProviderRuntimeRouteFailsClosed({
        appOptions: {
          paperImplementationRuntimeRepository: new InMemoryPaperImplementationRuntimeRepository(),
          paperImplementationP1RuntimeReviewLlmGateway: liveFailClosedGateway(),
        },
        url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/dossier-readiness-audit/run`,
        payload: {
          ...p1RunPayload('dossier', providerId),
          run_id: `dossier-readiness-http-live-fail-closed-${Date.now()}`,
        },
        expectedSlotId: PAPER_IMPLEMENTATION_DOSSIER_READINESS_AUDIT_SLOT_ID,
      });

      await assertLiveProviderRuntimeRouteFailsClosed({
        appOptions: {
          paperImplementationRuntimeRepository: new InMemoryPaperImplementationRuntimeRepository(),
          paperImplementationResultAnalysisLlmGateway: liveFailClosedGateway(),
        },
        url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/result-analysis-scenarios/run`,
        payload: {
          ...resultAnalysisRunPayload(providerId),
          run_id: `result-analysis-http-live-fail-closed-${Date.now()}`,
        },
        expectedSlotId: PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SLOT_ID,
      });

      await assertLiveProviderRuntimeRouteFailsClosed({
        appOptions: {
          paperImplementationRuntimeRepository: new InMemoryPaperImplementationRuntimeRepository(),
          paperImplementationExperimentPlanningLlmGateway: liveFailClosedGateway(),
        },
        url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/experiment-design-work-order-draft/run`,
        payload: {
          ...experimentPlanningRunPayload('design', providerId),
          run_id: `experiment-design-http-live-fail-closed-${Date.now()}`,
        },
        expectedSlotId: PAPER_IMPLEMENTATION_EXPERIMENT_DESIGN_SLOT_ID,
      });

      await assertLiveProviderRuntimeRouteFailsClosed({
        appOptions: {
          paperImplementationRuntimeRepository: new InMemoryPaperImplementationRuntimeRepository(),
          paperImplementationExperimentPlanningLlmGateway: liveFailClosedGateway(),
        },
        url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/experiment-critique-plan-critique/run`,
        payload: {
          ...experimentPlanningRunPayload('critique', providerId),
          run_id: `experiment-critique-http-live-fail-closed-${Date.now()}`,
        },
        expectedSlotId: PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_SLOT_ID,
      });
    } finally {
      restoreEnv(previousEnv);
    }
  },
);

test(
  'T-114 Prisma runtime HTTP smoke persists P1 runtime and admission rows',
  {
    skip: shouldRunRuntimePrismaSmoke()
      ? false
      : 'set T114_RUNTIME_PRISMA_SMOKE=1 with DATABASE_URL and repo migrations applied',
    timeout: 120_000,
  },
  async () => {
    await assertRuntimePrismaSmokeDatabaseReady();
    const previousEnv = {
      PAPER_IMPLEMENTATION_REPOSITORY: process.env.PAPER_IMPLEMENTATION_REPOSITORY,
      AUTO_PULL_SCHEDULER_ENABLED: process.env.AUTO_PULL_SCHEDULER_ENABLED,
    };
    process.env.PAPER_IMPLEMENTATION_REPOSITORY = 'prisma';
    process.env.AUTO_PULL_SCHEDULER_ENABLED = 'false';

    const app = buildApp({
      paperImplementationP1RuntimeReviewLlmGateway: new StubP1RuntimeGateway(),
    });
    try {
      const response = await app.inject({
        method: 'POST',
        url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/claim-boundary-debate/run`,
        payload: {
          ...p1RunPayload('claim'),
          run_id: `claim-boundary-prisma-smoke-${Date.now()}`,
        },
      });
      assert.equal(response.statusCode, 201);
      const body = response.json() as {
        runtime_artifacts: PaperImplementationRuntimeArtifactEnvelope[];
        final_runtime_artifact: PaperImplementationRuntimeArtifactEnvelope | null;
        final_admission_record: PaperImplementationRuntimeAdmissionRecord | null;
      };
      assert.ok(body.final_runtime_artifact);
      assert.equal(body.final_admission_record?.admission_status, 'admitted');

      const finalArtifacts = await app.inject({
        method: 'GET',
        url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-artifacts?slot_id=${encodeURIComponent(
          PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_SLOT_ID,
        )}&artifact_scope=final`,
      });
      assert.equal(finalArtifacts.statusCode, 200);
      const artifactBody = finalArtifacts.json() as { items: PaperImplementationRuntimeArtifactEnvelope[] };
      assert.equal(
        artifactBody.items.some((artifact) =>
          artifact.runtime_artifact_id === body.final_runtime_artifact?.runtime_artifact_id),
        true,
      );

      const admissionRecords = await app.inject({
        method: 'GET',
        url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-admission-records?runtime_artifact_id=${encodeURIComponent(
          body.final_runtime_artifact.runtime_artifact_id,
        )}&admission_scope=final`,
      });
      assert.equal(admissionRecords.statusCode, 200);
      const admissionBody = admissionRecords.json() as { items: PaperImplementationRuntimeAdmissionRecord[] };
      assert.equal(
        admissionBody.items.some((record) =>
          record.admission_record_id === body.final_admission_record?.admission_record_id),
        true,
      );
    } finally {
      await app.close();
      restoreEnv(previousEnv);
    }
  },
);

test('PaperImplementation runtime admission HTTP route uses the controlled service path', async () => {
  const runtimeRepository = new InMemoryPaperImplementationRuntimeRepository();
  const app = buildApp({
    paperImplementationRuntimeRepository: runtimeRepository,
  });
  try {
    const artifact = await runtimeRepository.createRuntimeArtifact(runtimeArtifact());

    const response = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-artifacts/${encodeURIComponent(
        artifact.runtime_artifact_id,
      )}/admit`,
      payload: {
        admission_record_id: 'admission-http-role-1',
        admission_scope: 'role',
        admission_policy_id: 'runtime-admission-policy',
        admission_policy_version: 'v1',
        expected_runtime_identity_hash: artifact.runtime_identity_hash,
        expected_source_hash_bundle_hash: artifact.source_hash_bundle_hash,
        expected_retrieval_packet_hash: artifact.retrieval_packet_hash,
        expected_prompt_packet_hash: artifact.prompt_packet_hash,
        expected_output_schema_id: artifact.output_schema_id,
        expected_prior_role_artifact_hashes: artifact.prior_role_artifact_hashes,
        expected_final_artifact_hash: null,
      },
    });

    assert.equal(response.statusCode, 201);
    const admission = response.json() as PaperImplementationRuntimeAdmissionRecord;
    assert.equal(admission.admission_status, 'admitted');
    assert.equal(admission.runtime_artifact_id, artifact.runtime_artifact_id);
    assert.deepEqual(admission.issue_codes, []);

    const admissionList = await app.inject({
      method: 'GET',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-admission-records?runtime_artifact_id=${encodeURIComponent(
        artifact.runtime_artifact_id,
      )}&admission_scope=role`,
    });
    assert.equal(admissionList.statusCode, 200);
    const admissionBody = admissionList.json() as { items: PaperImplementationRuntimeAdmissionRecord[] };
    assert.equal(admissionBody.items[0]?.admission_record_id, 'admission-http-role-1');

    const artifactList = await app.inject({
      method: 'GET',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-artifacts?slot_id=slot-role&artifact_scope=role`,
    });
    assert.equal(artifactList.statusCode, 200);
    const artifactBody = artifactList.json() as { items: PaperImplementationRuntimeArtifactEnvelope[] };
    assert.equal(artifactBody.items[0]?.runtime_artifact_id, artifact.runtime_artifact_id);
  } finally {
    await app.close();
  }
});

test('PaperImplementation runtime admission HTTP route rejects artifact-id overrides in the body', async () => {
  const runtimeRepository = new InMemoryPaperImplementationRuntimeRepository();
  const app = buildApp({
    paperImplementationRuntimeRepository: runtimeRepository,
  });
  try {
    const artifact = await runtimeRepository.createRuntimeArtifact(runtimeArtifact());

    const response = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-artifacts/${encodeURIComponent(
        artifact.runtime_artifact_id,
      )}/admit`,
      payload: {
        runtime_artifact_id: 'different-runtime-artifact',
        admission_scope: 'role',
        admission_policy_id: 'runtime-admission-policy',
        admission_policy_version: 'v1',
        expected_runtime_identity_hash: artifact.runtime_identity_hash,
        expected_source_hash_bundle_hash: artifact.source_hash_bundle_hash,
        expected_retrieval_packet_hash: artifact.retrieval_packet_hash,
        expected_prompt_packet_hash: artifact.prompt_packet_hash,
        expected_output_schema_id: artifact.output_schema_id,
        expected_prior_role_artifact_hashes: artifact.prior_role_artifact_hashes,
        expected_final_artifact_hash: null,
      },
    });

    assert.equal(response.statusCode, 400);
    assert.match(response.body, /runtime_artifact_id/);
  } finally {
    await app.close();
  }
});

async function assertRuntimeRouteFailsClosed(options: {
  appOptions: Parameters<typeof buildApp>[0];
  url: string;
  payload: Record<string, unknown>;
  expectedSlotId: string;
  expectedFailureCode: string;
}): Promise<{
  status: string;
  provider_call_count: number;
  runtime_artifacts: PaperImplementationRuntimeArtifactEnvelope[];
  admission_records: PaperImplementationRuntimeAdmissionRecord[];
  final_runtime_artifact: PaperImplementationRuntimeArtifactEnvelope | null;
  final_admission_record: PaperImplementationRuntimeAdmissionRecord | null;
  operational_telemetry: PaperImplementationRuntimeOperationalTelemetry;
}> {
  const app = buildApp(options.appOptions);
  try {
    const response = await app.inject({
      method: 'POST',
      url: options.url,
      payload: options.payload,
    });

    assert.equal(response.statusCode, 201);
    const body = response.json() as {
      status: string;
      provider_call_count: number;
      runtime_artifacts: PaperImplementationRuntimeArtifactEnvelope[];
      admission_records: PaperImplementationRuntimeAdmissionRecord[];
      final_runtime_artifact: PaperImplementationRuntimeArtifactEnvelope | null;
      final_admission_record: PaperImplementationRuntimeAdmissionRecord | null;
      operational_telemetry: PaperImplementationRuntimeOperationalTelemetry;
    };
    assert.equal(body.status, 'failed_runtime');
    assert.equal(body.provider_call_count, 2);
    assert.equal(body.operational_telemetry.status, 'failed_runtime');
    assert.equal(body.operational_telemetry.provider_call_count, 2);
    assert.equal(body.operational_telemetry.role_provider_call_count, 2);
    assert.equal(body.operational_telemetry.final_provider_call_count, 0);
    assert.equal(body.operational_telemetry.provider_call_count_consistent, true);
    assert.equal(body.operational_telemetry.runtime_artifact_count, 1);
    assert.equal(body.operational_telemetry.role_artifact_count, 1);
    assert.equal(body.operational_telemetry.final_artifact_count, 0);
    assert.equal(body.operational_telemetry.final_artifact_present, false);
    assert.equal(body.operational_telemetry.final_admission_present, false);
    assert.equal(body.operational_telemetry.rejected_admission_count, 1);
    assert.equal(body.operational_telemetry.non_provider_artifact_count, 0);
    assert.equal(body.operational_telemetry.retry_exhausted_role_count, 1);
    assert.deepEqual(body.operational_telemetry.runtime_failure_codes, [options.expectedFailureCode]);
    assert.deepEqual(body.operational_telemetry.admission_issue_codes, ['RUNTIME_STATUS_FAILED_RUNTIME']);
    assert.equal(body.runtime_artifacts.length, 1);
    assert.equal(body.final_runtime_artifact, null);
    assert.equal(body.final_admission_record, null);
    const artifact = body.runtime_artifacts[0];
    assert.ok(artifact);
    assert.equal(artifact.slot_id, options.expectedSlotId);
    assert.equal(artifact.execution_mode, 'provider_llm');
    assert.equal(artifact.runtime_status, 'failed_runtime');
    assert.equal(artifact.runtime_failure_code, options.expectedFailureCode);
    assert.equal(artifact.provider_call_count, 2);
    assert.equal(artifact.retry_attempt_index, 1);
    assert.equal(artifact.warning_codes.includes('RUNTIME_TECHNICAL_RETRY_EXHAUSTED'), true);
    assert.equal(
      body.runtime_artifacts.some((item) =>
        item.execution_mode === 'mocked_llm' || item.execution_mode === 'codex_assisted'),
      false,
    );
    assert.equal(body.admission_records.length, 1);
    assert.equal(body.admission_records[0]?.admission_status, 'rejected');
    assert.deepEqual(body.admission_records[0]?.issue_codes, ['RUNTIME_STATUS_FAILED_RUNTIME']);
    return body;
  } finally {
    await app.close();
  }
}

async function assertLiveProviderRuntimeRouteFailsClosed(options: {
  appOptions: Parameters<typeof buildApp>[0];
  url: string;
  payload: Record<string, unknown>;
  expectedSlotId: string;
}): Promise<void> {
  const app = buildApp(options.appOptions);
  try {
    const response = await app.inject({
      method: 'POST',
      url: options.url,
      payload: options.payload,
    });

    assert.equal(response.statusCode, 201);
    const body = response.json() as {
      status: string;
      provider_call_count: number;
      runtime_artifacts: PaperImplementationRuntimeArtifactEnvelope[];
      admission_records: PaperImplementationRuntimeAdmissionRecord[];
      final_runtime_artifact: PaperImplementationRuntimeArtifactEnvelope | null;
      final_admission_record: PaperImplementationRuntimeAdmissionRecord | null;
      operational_telemetry: PaperImplementationRuntimeOperationalTelemetry;
    };
    assert.equal(body.status, 'failed_runtime');
    assert.equal(body.runtime_artifacts.length, 1);
    assert.equal(body.final_runtime_artifact, null);
    assert.equal(body.final_admission_record, null);
    assert.equal(JSON.stringify(body).includes('domain_gate_request'), false);
    const artifact = body.runtime_artifacts[0];
    assert.ok(artifact);
    assert.equal(artifact.slot_id, options.expectedSlotId);
    assert.equal(artifact.execution_mode, 'provider_llm');
    assert.equal(artifact.runtime_status, 'failed_runtime');
    assertLiveProviderFailureCode(artifact.runtime_failure_code);
    assert.equal(Number.isInteger(artifact.provider_call_count), true);
    assert.equal(artifact.provider_call_count >= 0, true);
    assert.equal(artifact.provider_call_count <= 2, true);
    assert.equal(body.provider_call_count, artifact.provider_call_count);
    assert.equal(body.operational_telemetry.status, 'failed_runtime');
    assert.equal(body.operational_telemetry.provider_call_count, artifact.provider_call_count);
    assert.equal(body.operational_telemetry.role_provider_call_count, artifact.provider_call_count);
    assert.equal(body.operational_telemetry.final_provider_call_count, 0);
    assert.equal(body.operational_telemetry.provider_call_count_consistent, true);
    assert.equal(body.operational_telemetry.runtime_artifact_count, 1);
    assert.equal(body.operational_telemetry.role_artifact_count, 1);
    assert.equal(body.operational_telemetry.final_artifact_count, 0);
    assert.equal(body.operational_telemetry.final_artifact_present, false);
    assert.equal(body.operational_telemetry.final_admission_present, false);
    assert.equal(body.operational_telemetry.rejected_admission_count, 1);
    assert.equal(body.operational_telemetry.non_provider_artifact_count, 0);
    assert.deepEqual(body.operational_telemetry.runtime_failure_codes, [artifact.runtime_failure_code]);
    assert.deepEqual(body.operational_telemetry.admission_issue_codes, ['RUNTIME_STATUS_FAILED_RUNTIME']);
    assert.equal(
      body.runtime_artifacts.some((item) =>
        item.execution_mode === 'mocked_llm' || item.execution_mode === 'codex_assisted'),
      false,
    );
    assert.equal(body.admission_records.length, 1);
    assert.equal(body.admission_records[0]?.admission_status, 'rejected');
    assert.deepEqual(body.admission_records[0]?.issue_codes, ['RUNTIME_STATUS_FAILED_RUNTIME']);
  } finally {
    await app.close();
  }
}

function assertLiveProviderFailureCode(code: string | null): void {
  assert.ok(code, 'expected a live provider failure code');
  assert.equal(
    [
      'AuthError',
      'TimeoutError',
      'TransientError',
      'RateLimitError',
      'UpstreamError',
      'InvalidRequestError',
    ].includes(code),
    true,
    `unexpected live provider failure code: ${code}`,
  );
}

function assertErrorCode(
  response: Awaited<ReturnType<FastifyInstance['inject']>>,
  expectedStatusCode: number,
  expectedErrorCode: string,
): void {
  assert.equal(response.statusCode, expectedStatusCode);
  const body = response.json() as { error?: { code?: string } };
  assert.equal(body.error?.code, expectedErrorCode);
}

async function resultAnalysisDomainGateFixture() {
  const projectRepository = new StaticProjectRepository();
  const traceRepository = new InMemoryPaperImplementationTraceRepository();
  const validationRepository = new InMemoryPaperImplementationValidationRepository();
  const workOrderRepository = new InMemoryPaperImplementationWorkOrderRepository();
  const resultRepository = new InMemoryPaperImplementationResultClaimDossierRepository();
  const runtimeRepository = new InMemoryPaperImplementationRuntimeRepository();
  await traceRepository.createTraceManifest(
    traceManifest(RESULT_TRACE_MANIFEST_ID, 'result_interpretation_packet', RESULT_PACKET_ID),
    [],
  );
  await validationRepository.createValidationCycleDraft({
    input_snapshot: resultAnalysisInputSnapshot(),
    validation_cycle: resultAnalysisValidationCycle(),
  });
  await workOrderRepository.recordMonitorIngestion({
    monitor_intake: resultAnalysisMonitorIntake(),
    run_evidence_unit: resultAnalysisRunEvidenceUnit(),
    work_order: null,
  });
  return {
    projectRepository,
    traceRepository,
    validationRepository,
    workOrderRepository,
    resultRepository,
    runtimeRepository,
  };
}

function runtimeArtifact(
  overrides: Partial<PaperImplementationRuntimeArtifactEnvelope> = {},
): PaperImplementationRuntimeArtifactEnvelope {
  return {
    schema_version: 'PaperImplementationRuntimeArtifactEnvelope@v1',
    runtime_artifact_id: 'runtime-artifact-http-role-1',
    artifact_identity_hash: hash('role-envelope'),
    runtime_identity_hash: hash('runtime-identity'),
    implementation_project_id: PROJECT_ID,
    workflow_type: 'result_analysis',
    slot_id: 'slot-role',
    artifact_scope: 'role',
    artifact_contract_id: 'PaperImplementationResultAnalysisRoleArtifact',
    artifact_contract_version: 'v1',
    target_ref: ref('paper_implementation_project', PROJECT_ID),
    target_version_id: 'target-version-1',
    input_snapshot_ref: ref('paper_implementation_input_snapshot', 'input-snapshot-1'),
    input_snapshot_hash: hash('input-snapshot'),
    source_hash_bundle_hash: hash('source-bundle'),
    created_by: 'system',
    created_at: '2026-06-03T00:00:00.000Z',
    role_slot_id: 'role-analyst',
    call_index: 1,
    prior_role_artifact_refs: [],
    prior_role_artifact_hashes: [],
    role_chain_hash: hash('role-chain'),
    final_artifact_ref: null,
    final_artifact_hash: null,
    run_mode: 'dry_run',
    execution_mode: 'codex_assisted',
    executor_kind: 'single_agent',
    model_profile_id: 'codex-default',
    model_option_id: null,
    runtime_status: 'passed',
    runtime_failure_code: null,
    retry_attempt_index: 0,
    provider_call_count: 0,
    response_reuse_status: 'not_applicable',
    response_reuse_decision_ref: null,
    response_reuse_decision_hash: null,
    allowed_side_effects: [],
    retrieval_packet_ref: null,
    retrieval_packet_hash: null,
    reviewed_statement_packet_ref: null,
    reviewed_statement_packet_hash: null,
    context_packet_ref: ref('paper_implementation_context_packet', 'context-packet-1'),
    context_packet_hash: hash('context-packet'),
    runtime_invocation_context_hash: hash('runtime-invocation-context'),
    context_policy_profile_hash: hash('context-policy-profile'),
    cache_policy_profile_hash: hash('cache-policy-profile'),
    source_refs: [ref('paper_implementation_source', 'source-1')],
    source_hashes: [hash('source-1')],
    prompt_packet_ref: ref('paper_implementation_prompt_packet', 'prompt-packet-1'),
    prompt_packet_hash: hash('prompt-packet'),
    prompt_template_id: 'pi-result-analysis-role',
    prompt_template_version_id: 'prompt-template-v1',
    prompt_variant_id: 'default',
    prompt_redaction_policy_hash: hash('prompt-redaction-policy'),
    output_schema_id: 'PaperImplementationRoleOutput@v1',
    context_cache_key_hash: hash('context-cache-key'),
    context_cache_status: 'miss',
    context_cache_result_ref: null,
    context_cache_result_hash: null,
    prompt_packet_cache_key_hash: hash('prompt-cache-key'),
    prompt_packet_cache_status: 'miss',
    prompt_packet_cache_result_ref: null,
    prompt_packet_cache_result_hash: null,
    token_budget_gate_result_ref: ref('paper_implementation_token_budget_gate', 'budget-gate-1'),
    token_budget_gate_result_hash: hash('budget-gate'),
    compression_policy_profile_hash: hash('compression-policy-profile'),
    compression_status: 'not_needed',
    compression_report_ref: null,
    compression_report_hash: null,
    compressed_context_packet_ref: null,
    compressed_context_packet_hash: null,
    artifact_payload: { artifact_kind: 'test_runtime_artifact_payload' },
    artifact_payload_ref: ref('paper_implementation_role_artifact', 'role-artifact-1'),
    artifact_payload_hash: hash('role-payload'),
    output_hash: hash('role-output'),
    runtime_audit_ref: ref('paper_implementation_runtime_audit', 'runtime-audit-1'),
    runtime_audit_hash: hash('runtime-audit'),
    blocker_codes: [],
    warning_codes: [],
    ...overrides,
  };
}

function traceIntegrityRunPayload(providerId: 'openai' | 'dashscope' = 'openai') {
  return {
    run_id: 'trace-integrity-http-run-1',
    run_mode: 'product',
    execution_mode: 'provider_llm',
    model_profile_id: PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_PROFILE_ID,
    model_option_id: providerModelOptionId(PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_PROFILE_ID, providerId),
    target_ref: ref('claim_candidate', 'claim-candidate-http-1'),
    target_version_id: 'claim-candidate-http-1@v1',
    input_snapshot_ref: ref('implementation_input_snapshot', 'input-snapshot-http-1'),
    input_snapshot_hash: hash('input-snapshot-http-1'),
    reviewed_statement_packet_ref: ref('trace_reviewed_statement_packet', 'statement-packet-http-1'),
    reviewed_statement_packet_hash: hash('statement-packet-http-1'),
    reviewed_statement_refs: [ref('reviewed_statement', 'statement-http-1')],
    reviewed_statement_packets: [{
      statement_ref: ref('reviewed_statement', 'statement-http-1'),
      statement_hash: hash('statement-http-1-text'),
      statement_text: 'HTTP canary claim links benchmark evidence to the implementation result.',
      semantic_role: 'result_claim',
    }],
    source_refs: [ref('run_evidence_unit', 'run-evidence-unit-http-1')],
    source_hashes: [hash('run-evidence-unit-http-1')],
    source_packets: [{
      source_ref: ref('run_evidence_unit', 'run-evidence-unit-http-1'),
      source_hash: hash('run-evidence-unit-http-1'),
      source_family: 'run_evidence',
      freshness_status: 'fresh',
      evidence_role: 'primary_result',
      content_summary: 'HTTP route fixture evidence supports the benchmark result claim.',
      source_excerpt: 'benchmark evidence supports the result claim',
    }],
    preflight_blocker_codes: [],
  };
}

function shouldRunLiveTraceIntegrityCanary(): boolean {
  return shouldRunLiveProviderCanary('T114_TRACE_INTEGRITY_PROVIDER_CANARY_LIVE');
}

function shouldRunLiveP1Canary(kind: 'claim' | 'dossier'): boolean {
  return shouldRunLiveProviderCanary(
    kind === 'claim'
      ? 'T114_P1_CLAIM_BOUNDARY_PROVIDER_CANARY_LIVE'
      : 'T114_P1_DOSSIER_READINESS_PROVIDER_CANARY_LIVE',
  );
}

function shouldRunLiveResultAnalysisCanary(): boolean {
  return shouldRunLiveProviderCanary('T114_RESULT_ANALYSIS_PROVIDER_CANARY_LIVE');
}

function shouldRunLiveExperimentPlanningCanary(kind: 'design' | 'critique'): boolean {
  return shouldRunLiveProviderCanary(
    kind === 'design'
      ? 'T114_EXPERIMENT_DESIGN_PROVIDER_CANARY_LIVE'
      : 'T114_EXPERIMENT_CRITIQUE_PROVIDER_CANARY_LIVE',
  );
}

function shouldRunLiveProviderCanary(flagName: string): boolean {
  if (
    process.env[flagName] !== '1'
    || process.env.BACKEND_TEST_PRESERVE_REAL_ENV !== '1'
  ) {
    return false;
  }
  const providerId = liveProviderId();
  return providerId === 'dashscope'
    ? Boolean(process.env.DASHSCOPE_API_KEY?.trim())
    : Boolean(process.env.OPENAI_API_KEY?.trim());
}

function shouldRunLiveProviderFailClosedCanary(): boolean {
  return process.env.T114_PROVIDER_FAIL_CLOSED_CANARY_LIVE === '1'
    && process.env.BACKEND_TEST_PRESERVE_REAL_ENV === '1';
}

function shouldRunRuntimePrismaSmoke(): boolean {
  return process.env.T114_RUNTIME_PRISMA_SMOKE === '1'
    && Boolean(process.env.DATABASE_URL?.trim());
}

async function assertRuntimePrismaSmokeDatabaseReady(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  assert.ok(databaseUrl, 'DATABASE_URL is required for T-114 Prisma runtime HTTP smoke.');
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  try {
    await prisma.$queryRaw`SELECT 1`;
    await prisma.$queryRaw`SELECT 1 FROM "PaperImplementationRuntimeArtifact" LIMIT 1`;
    await prisma.$queryRaw`SELECT 1 FROM "PaperImplementationRuntimeAdmissionRecord" LIMIT 1`;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    assert.fail([
      'DATABASE_URL for T-114 Prisma runtime HTTP smoke must point at a reachable Postgres database with repo migrations applied.',
      `Underlying Prisma error: ${message}`,
    ].join(' '));
  } finally {
    await prisma.$disconnect();
  }
}

function liveProviderId(): 'openai' | 'dashscope' {
  return process.env.PAPER_IMPLEMENTATION_PROVIDER_CANARY_PROVIDER_ID === 'dashscope'
    ? 'dashscope'
    : 'openai';
}

function liveFailClosedGateway(): BackendLlmGateway {
  return new BackendLlmGateway({
    defaultTimeoutMs: 10_000,
    defaultMaxRetries: 0,
  });
}

function installInvalidProviderKey(
  providerId: 'openai' | 'dashscope',
): Record<string, string | undefined> {
  const previousEnv = {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    DASHSCOPE_API_KEY: process.env.DASHSCOPE_API_KEY,
  };
  if (providerId === 'dashscope') {
    process.env.DASHSCOPE_API_KEY = 't114-invalid-dashscope-provider-key';
    return previousEnv;
  }
  process.env.OPENAI_API_KEY = 'sk-t114-invalid-openai-provider-key';
  return previousEnv;
}

function traceIntegrityRoleOutput(roleSlotId: string): PaperImplementationTraceIntegrityRoleOutput {
  return {
    role_slot_id: roleSlotId as PaperImplementationTraceIntegrityRoleOutput['role_slot_id'],
    role_status: 'passed',
    summary: `HTTP provider canary role output for ${roleSlotId}.`,
    reviewed_statement_refs: [ref('reviewed_statement', 'statement-http-1')],
    cited_source_refs: [ref('run_evidence_unit', 'run-evidence-unit-http-1')],
    blocker_codes: [],
    warning_codes: [],
  };
}

function p1RunPayload(kind: 'claim' | 'dossier', providerId: 'openai' | 'dashscope' = 'openai') {
  const claim = kind === 'claim';
  const profileId = claim
    ? PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_PROFILE_ID
    : PAPER_IMPLEMENTATION_DOSSIER_READINESS_AUDIT_PROFILE_ID;
  return {
    run_id: claim ? 'claim-boundary-http-run-1' : 'dossier-readiness-http-run-1',
    run_mode: 'product',
    execution_mode: 'provider_llm',
    model_profile_id: profileId,
    model_option_id: providerModelOptionId(profileId, providerId),
    target_ref: claim
      ? ref('result_interpretation_packet', 'result-packet-http-1')
      : ref('implementation_dossier', 'dossier-http-1'),
    target_version_id: 'target-http-1@v1',
    input_snapshot_ref: ref('implementation_input_snapshot', 'input-snapshot-http-1'),
    input_snapshot_hash: hash('input-snapshot-http-1'),
    source_refs: claim
      ? [
        ref('result_interpretation_packet', 'result-packet-http-1'),
        ref('claim_trace_packet', 'claim-trace-packet-http-1'),
      ]
      : [
        ref('claim_candidate', 'claim-candidate-http-1'),
        ref('claim_trace_packet', 'claim-trace-packet-http-1'),
      ],
    source_hashes: claim
      ? [hash('result-packet-http-1'), hash('claim-trace-packet-http-1')]
      : [hash('claim-candidate-http-1'), hash('claim-trace-packet-http-1')],
    preflight_blocker_codes: [],
  };
}

function resultAnalysisRunPayload(providerId: 'openai' | 'dashscope' = 'openai') {
  return {
    run_id: 'result-analysis-http-run-1',
    run_mode: 'product',
    execution_mode: 'provider_llm',
    model_profile_id: PAPER_IMPLEMENTATION_RESULT_ANALYSIS_PROFILE_ID,
    model_option_id: providerModelOptionId(PAPER_IMPLEMENTATION_RESULT_ANALYSIS_PROFILE_ID, providerId),
    target_ref: ref('validation_cycle', 'validation-cycle-http-1'),
    target_version_id: 'validation-cycle-http-1@v1',
    input_snapshot_ref: ref('implementation_input_snapshot', 'input-snapshot-http-1'),
    input_snapshot_hash: hash('input-snapshot-http-1'),
    source_refs: [
      ref('run_evidence_unit', 'run-evidence-unit-http-1'),
      ref('result_validation_report', 'result-validation-report-http-1'),
    ],
    source_hashes: [
      hash('run-evidence-unit-http-1'),
      hash('result-validation-report-http-1'),
    ],
    preflight_blocker_codes: [],
  };
}

function experimentPlanningRunPayload(kind: 'design' | 'critique', providerId: 'openai' | 'dashscope' = 'openai') {
  const design = kind === 'design';
  const profileId = design
    ? PAPER_IMPLEMENTATION_EXPERIMENT_DESIGN_PROFILE_ID
    : PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_PROFILE_ID;
  return {
    run_id: design ? 'experiment-design-http-run-1' : 'experiment-critique-http-run-1',
    run_mode: 'product',
    execution_mode: 'provider_llm',
    model_profile_id: profileId,
    model_option_id: providerModelOptionId(profileId, providerId),
    target_ref: ref('validation_cycle', 'validation-cycle-http-1'),
    target_version_id: 'validation-cycle-http-1@v1',
    input_snapshot_ref: ref('implementation_input_snapshot', 'input-snapshot-http-1'),
    input_snapshot_hash: hash('input-snapshot-http-1'),
    source_refs: [
      ref('technical_route_candidate', 'route-candidate-http-1'),
      ref('feasibility_probe', 'feasibility-probe-http-1'),
      ref('experiment_plan_light', 'experiment-plan-light-http-1'),
    ],
    source_hashes: [
      hash('route-candidate-http-1'),
      hash('feasibility-probe-http-1'),
      hash('experiment-plan-light-http-1'),
    ],
    source_context_packets: experimentPlanningSourceContextPackets(),
    preflight_blocker_codes: [],
  };
}

function experimentPlanningSourceContextPackets() {
  return [
    {
      source_ref: ref('technical_route_candidate', 'route-candidate-http-1'),
      evidence_kind: 'technical_route_candidate',
      content_summary: 'HTTP fixture route uses a bounded RAG runtime evaluation with separated confirmatory and exploratory branches.',
      key_facts: [
        'Confirmatory branch evaluates a frozen validation split against a baseline.',
        'Exploratory branch is advisory and cannot alter confirmatory pass/fail.',
      ],
    },
    {
      source_ref: ref('experiment_plan_light', 'experiment-plan-light-http-1'),
      evidence_kind: 'experiment_plan_light',
      content_summary: 'HTTP fixture plan includes dataset, baseline, code, config, metric, budget, and stop-condition references.',
      key_facts: [
        'The plan has no WorkOrder creation side effect.',
        'The critique may approve when all required dimensions are covered.',
      ],
    },
  ];
}

function providerModelOptionId(profileId: string, providerId: 'openai' | 'dashscope'): string {
  return providerId === 'dashscope'
    ? `${profileId}.dashscope-thinking-budget`
    : `${profileId}.openai-balanced`;
}

function assertP1ProviderCanaryResponse(
  response: Awaited<ReturnType<FastifyInstance['inject']>>,
  expectedSlotId: string,
): void {
  assert.equal(response.statusCode, 201);
  const body = response.json() as {
    status: string;
    provider_call_count: number;
    runtime_artifacts: PaperImplementationRuntimeArtifactEnvelope[];
    admission_records: PaperImplementationRuntimeAdmissionRecord[];
    final_admission_record: PaperImplementationRuntimeAdmissionRecord | null;
  };
  assert.notEqual(body.status, 'failed_runtime');
  assert.equal(body.provider_call_count, 3);
  assert.equal(body.runtime_artifacts.length, 4);
  assert.equal(body.runtime_artifacts.every((artifact) => artifact.slot_id === expectedSlotId), true);
  assert.equal(
    body.runtime_artifacts.some((artifact) => artifact.runtime_status === 'failed_runtime'),
    false,
  );
  assert.equal(body.admission_records.every((record) => record.admission_status === 'admitted'), true);
  assert.equal(body.final_admission_record?.admission_status, 'admitted');
}

function assertResultAnalysisProviderCanaryResponse(
  response: Awaited<ReturnType<FastifyInstance['inject']>>,
): void {
  assert.equal(response.statusCode, 201);
  const body = response.json() as {
    status: string;
    provider_call_count: number;
    runtime_artifacts: PaperImplementationRuntimeArtifactEnvelope[];
    admission_records: PaperImplementationRuntimeAdmissionRecord[];
    final_admission_record: PaperImplementationRuntimeAdmissionRecord | null;
  };
  assert.notEqual(body.status, 'failed_runtime');
  assert.equal(body.provider_call_count, 1);
  assert.equal(body.runtime_artifacts.length, 2);
  assert.equal(
    body.runtime_artifacts.every((artifact) =>
      artifact.slot_id === PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SLOT_ID),
    true,
  );
  assert.equal(
    body.runtime_artifacts.some((artifact) => artifact.runtime_status === 'failed_runtime'),
    false,
  );
  assert.equal(body.admission_records.every((record) => record.admission_status === 'admitted'), true);
  assert.equal(body.final_admission_record?.admission_status, 'admitted');
}

function assertExperimentPlanningProviderCanaryResponse(
  response: Awaited<ReturnType<FastifyInstance['inject']>>,
  expectedSlotId: string,
): void {
  assert.equal(response.statusCode, 201);
  const body = response.json() as {
    status: string;
    provider_call_count: number;
    runtime_artifacts: PaperImplementationRuntimeArtifactEnvelope[];
    admission_records: PaperImplementationRuntimeAdmissionRecord[];
    final_runtime_artifact: PaperImplementationRuntimeArtifactEnvelope | null;
    final_admission_record: PaperImplementationRuntimeAdmissionRecord | null;
  };
  assert.equal(body.status, 'passed');
  assert.equal(body.provider_call_count, 1);
  assert.equal(body.runtime_artifacts.length, 2);
  assert.equal(body.runtime_artifacts.every((artifact) => artifact.slot_id === expectedSlotId), true);
  assert.ok(body.final_runtime_artifact);
  assert.equal('domain_gate_request' in body.final_runtime_artifact.artifact_payload, false);
  assert.equal(body.final_runtime_artifact.artifact_payload.no_execution_side_effect, true);
  assert.equal(
    body.runtime_artifacts.some((artifact) => artifact.runtime_status === 'failed_runtime'),
    false,
  );
  assert.equal(body.admission_records.every((record) => record.admission_status === 'admitted'), true);
  assert.equal(body.final_admission_record?.admission_status, 'admitted');
}

function p1ReviewRoleOutput(roleSlotId: string): PaperImplementationP1RuntimeReviewRoleOutput {
  const claim = roleSlotId.startsWith('claim_boundary_review');
  const final = roleSlotId.endsWith('final');
  return {
    role_slot_id: roleSlotId as PaperImplementationP1RuntimeReviewRoleOutput['role_slot_id'],
    role_status: 'passed',
    summary: `HTTP P1 runtime role output for ${roleSlotId}.`,
    cited_source_refs: claim
      ? [ref('result_interpretation_packet', 'result-packet-http-1')]
      : [ref('claim_candidate', 'claim-candidate-http-1')],
    blocker_codes: [],
    warning_codes: [],
    domain_gate_request: final
      ? claim
        ? { claim_candidate_id: 'claim-candidate-http-1' }
        : { dossier_id: 'dossier-http-1' }
      : null,
    scenario_outputs: final && !claim
      ? [{ scenario_id: 'ready_for_writing', disposition: 'preferred' }]
      : [],
  };
}

function resultAnalysisDomainGateRequest(): CreateResultInterpretationPacketRequest {
  return {
    result_interpretation_packet_id: RESULT_PACKET_ID,
    validation_cycle_id: RESULT_VALIDATION_CYCLE_ID,
    source: {
      run_evidence_refs: [ref('run_evidence_unit', RESULT_RUN_EVIDENCE_UNIT_ID)],
      validation_report_refs: [ref('result_validation_report', RESULT_VALIDATION_REPORT_ID)],
      metric_refs: [ref('metric', RESULT_METRIC_ID)],
      failed_run_refs: [],
      inconclusive_run_refs: [],
      stale_or_invalidated_evidence_refs: [],
    },
    result_summary: {
      result_summary: 'The trusted run supports the bounded assertion.',
      supports_assertion_refs: [ref('motive_assertion', 'motive-assertion-http-1')],
      challenges_assertion_refs: [],
      unexpected_findings: [],
      failed_runs_accounted_for: true,
      inconclusive_runs_accounted_for: true,
      exploratory_confirmatory_separated: true,
    },
    reliability: {
      failed_runs_retained: true,
      confound_refs: [],
      limitation_refs: [ref('limitation', 'limitation-http-1')],
      reliability_notes: [],
    },
    claim_implications: {
      allowed_claim_ceiling: 'moderate',
      forbidden_overclaims: ['broad generalization'],
      recommended_claim_refs: [],
      required_followup_refs: [],
    },
    trace_manifest_id: RESULT_TRACE_MANIFEST_ID,
    created_by: 'system',
  };
}

function resultAnalysisInputSnapshot(): ValidationCycleInputSnapshot {
  return {
    input_snapshot_id: RESULT_INPUT_SNAPSHOT_ID,
    implementation_project_id: PROJECT_ID,
    context_policy_version_id: 'policy-v1',
    included_refs: {
      motive_version_refs: [],
      board_version_refs: [],
      evidence_refs: [ref('run_evidence_unit', RESULT_RUN_EVIDENCE_UNIT_ID)],
      route_refs: [],
      work_order_refs: [ref('research_work_order', RESULT_WORK_ORDER_ID)],
      result_packet_refs: [],
      experiment_plan_light_refs: [],
    },
    excluded_context_notes: [],
    input_snapshot_hash: hash(RESULT_INPUT_SNAPSHOT_ID),
    created_by: 'system',
    created_at: NOW,
  };
}

function resultAnalysisValidationCycle(): ValidationCycle {
  const context = resultAnalysisInputSnapshot();
  return {
    validation_cycle_id: RESULT_VALIDATION_CYCLE_ID,
    implementation_project_id: PROJECT_ID,
    input_snapshot_id: RESULT_INPUT_SNAPSHOT_ID,
    target: {
      target_type: 'result_interpretation',
      target_id: RESULT_PACKET_ID,
      target_version_id: `${RESULT_PACKET_ID}@v1`,
    },
    trigger: {
      trigger_type: 'experiment_result',
      trigger_refs: [ref('run_evidence_unit', RESULT_RUN_EVIDENCE_UNIT_ID)],
    },
    cycle_type: 'result_interpretation',
    validation_frame: {
      validation_question: 'Does HTTP result-analysis evidence support a bounded interpretation?',
      assumptions_under_test: ['runtime admission is complete before Domain Gate materialization'],
      assertions_under_test: [ref('motive_assertion', 'motive-assertion-http-1')],
      decision_if_pass: 'materialize bounded result interpretation',
      decision_if_fail: 'block result interpretation',
      decision_if_inconclusive: 'retain inconclusive evidence and follow up',
      expected_information_gain: 'medium',
      why_this_cycle_now: 'HTTP route verifies result-analysis Domain Gate materialization',
    },
    context,
    criteria: {
      pass_conditions: ['trusted run evidence is present'],
      fail_conditions: ['trusted evidence contradicts the interpretation'],
      inconclusive_conditions: ['evidence is incomplete'],
      stop_conditions: ['runtime admission rejected'],
      minimum_artifacts_required: ['run_evidence_unit', 'result_validation_report'],
    },
    budget: {
      budget_id: 'result-analysis-budget-http-1',
      retry_budget: 1,
    },
    lifecycle_status: 'completed',
    execution_status: 'completed',
    outputs: {
      evidence_unit_refs: [ref('run_evidence_unit', RESULT_RUN_EVIDENCE_UNIT_ID)],
      evidence_binding_refs: [],
      board_update_refs: [],
      route_update_refs: [],
      work_order_result_refs: [],
      result_interpretation_packet_refs: [],
      quality_signal_refs: [],
      recommended_evolution_decision_refs: [],
    },
    cycle_assessment: {
      outcome: 'pass',
      information_gain_realized: 'medium',
      residual_uncertainties: [],
      recommended_next_action: 'materialize result interpretation packet',
      rationale: 'Seeded HTTP evidence is trusted and bounded.',
    },
    trace_manifest_ref: ref('trace_manifest', RESULT_TRACE_MANIFEST_ID),
    trace_manifest_id: RESULT_TRACE_MANIFEST_ID,
    gate_result_id: null,
    decision_exit: 'materialize_result_interpretation_packet',
    confirmation_level: 'not_required',
    policy_version_id: 'policy-v1',
    created_by: 'system',
    created_at: NOW,
    updated_at: NOW,
    admitted_at: NOW,
    completed_at: NOW,
  };
}

function resultAnalysisMonitorIntake(): RunMonitorIntakeRecord {
  return {
    monitor_intake_id: RESULT_MONITOR_INTAKE_ID,
    implementation_project_id: PROJECT_ID,
    work_order_id: RESULT_WORK_ORDER_ID,
    external_job_ref: ref('external_job', 'external-job-http-1'),
    external_job_hash: hash('external-job-http-1'),
    monitor_event_kind: 'result_available',
    run_status: 'succeeded',
    trust_status: 'trusted',
    result_ref: ref('run_result', 'run-result-http-1'),
    result_hash: hash('run-result-http-1'),
    result_validation_report_ref: ref('result_validation_report', RESULT_VALIDATION_REPORT_ID),
    result_validation_report_hash: hash(RESULT_VALIDATION_REPORT_ID),
    evidence_candidate_refs: [],
    evidence_candidate_hashes: [],
    raw_payload: { redacted_fixture: true },
    received_at: NOW,
    created_by: 'system',
  };
}

function resultAnalysisRunEvidenceUnit(): RunEvidenceUnit {
  return {
    run_evidence_unit_id: RESULT_RUN_EVIDENCE_UNIT_ID,
    implementation_project_id: PROJECT_ID,
    work_order_id: RESULT_WORK_ORDER_ID,
    validation_cycle_id: RESULT_VALIDATION_CYCLE_ID,
    monitor_intake_id: RESULT_MONITOR_INTAKE_ID,
    external_job_ref: ref('external_job', 'external-job-http-1'),
    external_job_hash: hash('external-job-http-1'),
    run_type: 'confirmatory',
    run_status: 'succeeded',
    trusted_status: 'trusted',
    dataset_version_refs: [ref('dataset_version', 'dataset-http-1')],
    baseline_version_refs: [ref('baseline_version', 'baseline-http-1')],
    code_version_refs: [ref('code_version', 'code-http-1')],
    config_refs: [ref('config_snapshot', 'config-http-1')],
    result_ref: ref('run_result', 'run-result-http-1'),
    result_hash: hash('run-result-http-1'),
    result_validation_report_ref: ref('result_validation_report', RESULT_VALIDATION_REPORT_ID),
    result_validation_report_hash: hash(RESULT_VALIDATION_REPORT_ID),
    evidence_candidate_refs: [],
    evidence_candidate_hashes: [],
    trace_manifest_ref: ref('trace_manifest', RESULT_TRACE_MANIFEST_ID),
    trace_manifest_id: RESULT_TRACE_MANIFEST_ID,
    created_by: 'system',
    created_at: NOW,
  };
}

function traceManifest(id: string, targetType: string, targetId: string): TraceManifest {
  return {
    trace_manifest_id: id,
    implementation_project_id: PROJECT_ID,
    target_ref: ref(targetType, targetId),
    lineage: emptyLineage(),
    integrity: {
      missing_refs: [],
      broken_refs: [],
      stale_refs: [],
      invalidated_refs: [],
      non_citable_refs: [],
      partial_refs: [],
    },
    trace_status: 'complete',
    broken_ref_count: 0,
    stale_ref_count: 0,
    missing_ref_count: 0,
    non_citable_ref_count: 0,
    trace_policy_version_id: 'trace-policy-v1',
    created_by: 'system',
    created_at: NOW,
  };
}

function emptyLineage(): TraceLineageBundle {
  return {
    literature: {
      literature_evidence_refs: [],
      source_locator_refs: [],
      citation_candidate_refs: [],
    },
    experiment: {
      experiment_plan_refs: [],
      work_order_refs: [],
      run_refs: [],
      run_evidence_refs: [],
      result_packet_refs: [],
      metric_refs: [],
    },
    artifact: {
      dataset_refs: [],
      baseline_refs: [],
      code_version_refs: [],
      model_checkpoint_refs: [],
      config_refs: [],
      log_artifact_refs: [],
    },
    decision: {
      validation_cycle_refs: [],
      motive_evolution_decision_refs: [],
      gate_result_refs: [],
      human_decision_refs: [],
      accepted_risk_refs: [],
    },
    internal_interpretation: {
      result_interpretation_refs: [],
      llm_rationale_refs: [],
      board_summary_refs: [],
      non_citable_refs: [],
    },
  };
}

function resultAnalysisRoleOutput(
  overrides: Partial<PaperImplementationResultAnalysisRoleOutput> = {},
): PaperImplementationResultAnalysisRoleOutput {
  return {
    role_slot_id: PAPER_IMPLEMENTATION_RESULT_ANALYSIS_ROLE_SLOT_ID,
    role_status: 'passed',
    summary: 'HTTP result analysis runtime produced bounded interpretation scenarios.',
    cited_source_refs: [
      ref('run_evidence_unit', RESULT_RUN_EVIDENCE_UNIT_ID),
      ref('result_validation_report', RESULT_VALIDATION_REPORT_ID),
    ],
    blocker_codes: [],
    warning_codes: [],
    scenario_outputs: PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SCENARIO_KINDS.map((kind) => ({
      scenario_id: `${kind}_scenario_http_1`,
      scenario_kind: kind,
      summary: `${kind} interpretation scenario with bounded claim implications.`,
      support_refs: [ref('run_evidence_unit', RESULT_RUN_EVIDENCE_UNIT_ID)],
      challenge_refs: [ref('result_validation_report', RESULT_VALIDATION_REPORT_ID)],
      limitation_refs: [ref('limitation', 'limitation-http-1')],
      forbidden_overclaims: ['broad generalization'],
      recommended_claim_refs: [ref('claim_candidate', `${kind}-claim-candidate-http-1`)],
      required_followup_refs: [ref('validation_feedback_item', `${kind}-followup-http-1`)],
    })),
    domain_gate_request: structuredClone(resultAnalysisDomainGateRequest()) as unknown as Record<string, unknown>,
    ...overrides,
  };
}

function experimentPlanningRoleOutput(roleSlotId: string): PaperImplementationExperimentPlanningRoleOutput {
  if (roleSlotId === PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_ROLE_SLOT_ID) {
    return experimentCritiqueRoleOutput();
  }
  return experimentDesignRoleOutput();
}

function experimentDraftCandidate(
  candidateId: string,
  confirmatoryMarker: boolean,
): PaperImplementationExperimentWorkOrderDraftCandidate {
  return {
    candidate_id: candidateId,
    run_type: confirmatoryMarker ? 'confirmatory' : 'exploratory',
    plan_summary: `${candidateId} proposes a bounded experiment plan.`,
    route_refs: [ref('technical_route_candidate', 'route-candidate-http-1')],
    feasibility_probe_refs: [ref('feasibility_probe', 'feasibility-probe-http-1')],
    primary_metric_refs: [ref('metric', RESULT_METRIC_ID)],
    secondary_metric_refs: [ref('metric', 'metric-secondary-http-1')],
    dataset_version_refs: [ref('dataset_version', 'dataset-version-http-1')],
    baseline_version_refs: [ref('baseline_version', 'baseline-version-http-1')],
    code_version_refs: [ref('code_version', 'code-version-http-1')],
    config_refs: [ref('config_snapshot', 'config-snapshot-http-1')],
    run_policy_ref: ref('run_policy', 'run-policy-http-1'),
    budget_ref: ref('validation_budget', 'budget-http-1'),
    stop_condition_refs: [ref('stop_condition', 'stop-condition-http-1')],
    estimated_cost_class: confirmatoryMarker ? 'high' : 'medium',
    confirmatory_marker: confirmatoryMarker,
    work_order_draft_request: experimentWorkOrderDraftRequest(candidateId, confirmatoryMarker),
  };
}

function experimentWorkOrderDraftRequest(
  candidateId: string,
  confirmatoryMarker: boolean,
): PaperImplementationExperimentWorkOrderDraftCandidate['work_order_draft_request'] {
  return {
    work_order_id: `${candidateId}-work-order-draft-http-1`,
    validation_cycle_id: RESULT_VALIDATION_CYCLE_ID,
    experiment_plan_light_id: `${candidateId}-experiment-plan-http-1`,
    run_type: confirmatoryMarker ? 'confirmatory' : 'exploratory',
    run_policy: {
      run_policy_id: `${candidateId}-run-policy-http-1`,
      retry_budget: 1,
      compute_limit_ref: ref('compute_limit', `${candidateId}-compute-limit-http-1`),
      stop_condition_refs: [ref('stop_condition', 'stop-condition-http-1')],
      allowed_mutation_refs: [],
      autotune_policy: 'disabled',
    },
    experiment_bridge: {
      run_recipe_ref: ref('run_recipe', `${candidateId}-run-recipe-http-1`),
      run_recipe_hash: hash(`${candidateId}-run-recipe-http-1`),
      version_lock_hash: hash(`${candidateId}-version-lock-http-1`),
      config_snapshot_hash: hash(`${candidateId}-config-snapshot-http-1`),
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
    dataset_version_refs: [ref('dataset_version', 'dataset-version-http-1')],
    baseline_version_refs: [ref('baseline_version', 'baseline-version-http-1')],
    code_version_refs: [ref('code_version', 'code-version-http-1')],
    config_refs: [ref('config_snapshot', 'config-snapshot-http-1')],
    trace_manifest_id: `${candidateId}-trace-manifest-http-1`,
    policy_version_id: 'policy-v1',
    created_by: 'system',
  };
}

function experimentDesignRoleOutput(
  overrides: Partial<PaperImplementationExperimentPlanningRoleOutput> = {},
): PaperImplementationExperimentPlanningRoleOutput {
  return {
    role_slot_id: PAPER_IMPLEMENTATION_EXPERIMENT_DESIGN_ROLE_SLOT_ID,
    role_status: 'passed',
    summary: 'HTTP experiment design runtime proposed WorkOrder draft alternatives.',
    cited_source_refs: [ref('technical_route_candidate', 'route-candidate-http-1')],
    blocker_codes: [],
    warning_codes: [],
    work_order_draft_candidates: [
      experimentDraftCandidate('exploratory-candidate', false),
      experimentDraftCandidate('confirmatory-candidate', true),
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
    summary: 'HTTP experiment critique runtime covered all required critique dimensions.',
    cited_source_refs: [ref('experiment_plan_light', 'experiment-plan-light-http-1')],
    blocker_codes: [],
    warning_codes: [],
    checked_dimensions: [...PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_DIMENSIONS],
    critique_findings: [{
      finding_id: 'critique-finding-budget-http-1',
      critique_dimension: 'compute_budget',
      severity: 'warning',
      summary: 'Budget is bounded but should remain visible before WorkOrder admission.',
      evidence_refs: [ref('validation_budget', 'budget-http-1')],
      required_revision_refs: [],
      blocks_work_order: false,
    }],
    critique_decision: {
      decision: 'approve_for_work_order_draft',
      rationale: 'No blocking experiment execution risk remains in the bounded critique.',
      required_revision_refs: [],
      no_execution_side_effect: true,
    },
    ...overrides,
  };
}

function restoreEnv(previousEnv: Record<string, string | undefined>): void {
  for (const [key, value] of Object.entries(previousEnv)) {
    if (value === undefined) {
      delete process.env[key];
      continue;
    }
    process.env[key] = value;
  }
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

function ref(refType: string, refId: string): TopicSelectionFunctionalRef {
  return {
    ref_type: refType,
    ref_id: refId,
    version_id: `${refId}@v1`,
    title_card_id: TITLE_CARD_ID,
  };
}

function hash(seed: string): string {
  return createHash('sha256').update(seed).digest('hex');
}
