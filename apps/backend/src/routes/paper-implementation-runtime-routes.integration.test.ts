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
  PaperImplementationCrossBoardAnchor,
  PaperImplementationCrossBoardScenarioProposal,
  PaperImplementationCrossBoardSynthesisRoleOutput,
  PaperImplementationEvidenceBoardBindingCandidateProposal,
  PaperImplementationEvidenceBoardCurationRoleOutput,
  PaperImplementationFeasibilityPlanningRoleOutput,
  PaperImplementationFeasibilityProbePlanCandidateProposal,
  PaperImplementationMotiveDecompositionDraftAssertionCandidate,
  PaperImplementationMotiveDecompositionRoleOutput,
  PaperImplementationMotiveEvolutionChallengeCheck,
  PaperImplementationMotiveEvolutionDecisionOption,
  PaperImplementationMotiveEvolutionDesignedOption,
  PaperImplementationMotiveEvolutionOptionDesignerRoleOutput,
  PaperImplementationMotiveEvolutionRiskChallengerRoleOutput,
  PaperImplementationMotiveEvolutionRoleOutput,
  PaperImplementationP1RuntimeReviewRoleOutput,
  PaperImplementationRouteCandidateProposal,
  PaperImplementationRoutePlanningRoleOutput,
  PaperImplementationResultAnalysisRoleOutput,
  PaperImplementationRuntimeAdmissionRecord,
  PaperImplementationRuntimeArtifactEnvelope,
  PaperImplementationValidationCycleCandidateProposal,
  PaperImplementationValidationCyclePlanningRoleOutput,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-runtime-contracts';
import {
  PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_PROFILE_ID,
  PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_SLOT_ID,
  PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_REVIEW_ROLE_SLOT_IDS,
  PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_PROFILE_ID,
  PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_ROLE_SLOT_ID,
  PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_SLOT_ID,
  PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_PROFILE_ID,
  PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_ROLE_SLOT_ID,
  PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_SLOT_ID,
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

import {
  buildApp as buildBackendApp,
  type BuildAppOptions,
} from '../app.js';
import type {
  LlmCallTelemetry,
  LlmStructuredOutputRequest,
  LlmStructuredOutputResponse,
} from '../services/llm-gateway.js';
import {
  BackendLlmGateway,
  LlmGatewayError,
} from '../services/llm-gateway.js';
import { PaperImplementationRuntimeAdmissionService } from '../services/paper-implementation-runtime-admission-service.js';
import {
  seedAdmittedRoutePlanningLineage,
  seedAdmittedValidationPlanningLineage,
  type PaperImplementationSeededRouteLineage,
  type PaperImplementationSeededValidationLineage,
} from '../services/paper-implementation-runtime-chain-lineage-fixtures.js';
import { InMemoryPaperImplementationAiWorkflowHarnessRepository } from '../repositories/in-memory-paper-implementation-ai-workflow-harness-repository.js';
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

// R10: process-unique so persistent-schema (prisma) runs never cross-pollute
// each other's project-scoped listings across suite invocations.
const PROJECT_ID = `implementation-project-http-${process.pid}-${Date.now()}`;
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
    // T-124 S3 复审 F5-1: provider_llm validates against the P1 wire schema, so
    // the stubbed provider emits the wire carriers (domain_gate_request_json /
    // scenario_output_jsons); the runtime service canonicalizes them back.
    const output = p1WireReviewRoleOutput(request.executionContext.operation);
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
      // T-124 S3 复审 F5-1: provider_llm validates against the result-analysis
      // wire schema — the domain-gate request travels as a JSON string (seeded
      // canonical fixtures, incl. drifted/malformed ones, round-trip unchanged).
      parsed: resultAnalysisWireRoleOutput(output) as T,
      raw: { redacted_stub: true },
      telemetry: telemetry(request),
    };
  }
}

class StubRoutePlanningGateway {
  readonly calls: LlmStructuredOutputRequest[] = [];

  constructor(
    private readonly outputs: PaperImplementationRoutePlanningRoleOutput[] = [],
  ) {}

  async createStructuredOutput<T>(
    request: LlmStructuredOutputRequest,
  ): Promise<LlmStructuredOutputResponse<T>> {
    this.calls.push(request);
    const output = this.outputs.shift()
      ?? routePlanningRoleOutput(request.executionContext.operation, request.messages);
    return {
      parsed: output as T,
      raw: { redacted_stub: true },
      telemetry: telemetry(request),
    };
  }
}

class StubValidationCyclePlanningGateway {
  readonly calls: LlmStructuredOutputRequest[] = [];

  constructor(
    private readonly outputs: PaperImplementationValidationCyclePlanningRoleOutput[] = [],
  ) {}

  async createStructuredOutput<T>(
    request: LlmStructuredOutputRequest,
  ): Promise<LlmStructuredOutputResponse<T>> {
    this.calls.push(request);
    const output = this.outputs.shift() ?? validationCyclePlanningRoleOutput();
    return {
      parsed: output as T,
      raw: { redacted_stub: true },
      telemetry: telemetry(request),
    };
  }
}

class StubFeasibilityPlanningGateway {
  readonly calls: LlmStructuredOutputRequest[] = [];

  constructor(
    private readonly outputs: PaperImplementationFeasibilityPlanningRoleOutput[] = [],
  ) {}

  async createStructuredOutput<T>(
    request: LlmStructuredOutputRequest,
  ): Promise<LlmStructuredOutputResponse<T>> {
    this.calls.push(request);
    const output = this.outputs.shift() ?? feasibilityPlanningRoleOutput();
    return {
      parsed: output as T,
      raw: { redacted_stub: true },
      telemetry: telemetry(request),
    };
  }
}

class StubCrossBoardSynthesisGateway {
  readonly calls: LlmStructuredOutputRequest[] = [];

  constructor(
    private readonly outputs: PaperImplementationCrossBoardSynthesisRoleOutput[] = [],
  ) {}

  async createStructuredOutput<T>(
    request: LlmStructuredOutputRequest,
  ): Promise<LlmStructuredOutputResponse<T>> {
    this.calls.push(request);
    const output = this.outputs.shift() ?? crossBoardSynthesisRoleOutput();
    return {
      parsed: output as T,
      raw: { redacted_stub: true },
      telemetry: telemetry(request),
    };
  }
}

class StubEvidenceBoardCurationGateway {
  readonly calls: LlmStructuredOutputRequest[] = [];

  constructor(
    private readonly outputs: PaperImplementationEvidenceBoardCurationRoleOutput[] = [],
  ) {}

  async createStructuredOutput<T>(
    request: LlmStructuredOutputRequest,
  ): Promise<LlmStructuredOutputResponse<T>> {
    this.calls.push(request);
    const output = this.outputs.shift() ?? evidenceBoardCurationRoleOutput();
    return {
      parsed: output as T,
      raw: { redacted_stub: true },
      telemetry: telemetry(request),
    };
  }
}

class FlakyEvidenceBoardCurationGateway {
  readonly calls: LlmStructuredOutputRequest[] = [];

  constructor(private failuresRemaining: number) {}

  async createStructuredOutput<T>(
    request: LlmStructuredOutputRequest,
  ): Promise<LlmStructuredOutputResponse<T>> {
    this.calls.push(request);
    if (this.failuresRemaining > 0) {
      this.failuresRemaining -= 1;
      throw new LlmGatewayError('TimeoutError', 'fixture flaky provider timeout', {
        telemetry: telemetry(request),
      });
    }
    return {
      parsed: evidenceBoardCurationRoleOutput() as T,
      raw: { redacted_stub: true },
      telemetry: telemetry(request),
    };
  }
}

class StubMotiveDecompositionGateway {
  readonly calls: LlmStructuredOutputRequest[] = [];

  constructor(
    private readonly outputs: PaperImplementationMotiveDecompositionRoleOutput[] = [],
  ) {}

  async createStructuredOutput<T>(
    request: LlmStructuredOutputRequest,
  ): Promise<LlmStructuredOutputResponse<T>> {
    this.calls.push(request);
    const output = this.outputs.shift() ?? motiveDecompositionRoleOutput();
    return {
      parsed: output as T,
      raw: { redacted_stub: true },
      telemetry: telemetry(request),
    };
  }
}

class StubMotiveEvolutionGateway {
  readonly calls: LlmStructuredOutputRequest[] = [];

  constructor(
    private readonly outputs: PaperImplementationMotiveEvolutionRoleOutput[] = [],
  ) {}

  async createStructuredOutput<T>(
    request: LlmStructuredOutputRequest,
  ): Promise<LlmStructuredOutputResponse<T>> {
    this.calls.push(request);
    const output = this.outputs.shift() ?? motiveEvolutionRoleOutput(request);
    return {
      // T-124 S3-β1: the provider path validates the wire encoding (option
      // entry arrays) through the real orchestrator ajv gate, so canonical
      // fixtures are wire-encoded here to keep exercising the intended
      // semantic failure codes downstream of schema validation.
      parsed: motiveEvolutionWireEncoded(output) as T,
      raw: { redacted_stub: true },
      telemetry: telemetry(request),
    };
  }
}

/** S3-β1: canonical motive-evolution role output → provider wire encoding. */
function motiveEvolutionWireEncoded(
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

function buildApp(options: BuildAppOptions = {}): ReturnType<typeof buildBackendApp> {
  return buildBackendApp({
    paperImplementationRepository: new StaticProjectRepository(),
    ...options,
  });
}

function httpLineageSeedOptions(runtimeRepository: InMemoryPaperImplementationRuntimeRepository) {
  return {
    projectRepository: new StaticProjectRepository(),
    runtimeAdmission: new PaperImplementationRuntimeAdmissionService({ repository: runtimeRepository }),
    implementationProjectId: PROJECT_ID,
    titleCardId: TITLE_CARD_ID,
    runIdPrefix: 'http_lineage_seed',
    reviewedRouteCandidateKey: 'exploratory-route-candidate',
    reviewedCycleCandidateKey: 'exploratory-cycle-candidate',
  };
}

async function seedHttpRouteLineage(
  runtimeRepository: InMemoryPaperImplementationRuntimeRepository,
): Promise<PaperImplementationSeededRouteLineage> {
  return seedAdmittedRoutePlanningLineage(httpLineageSeedOptions(runtimeRepository));
}

async function seedHttpValidationLineage(
  runtimeRepository: InMemoryPaperImplementationRuntimeRepository,
): Promise<PaperImplementationSeededValidationLineage> {
  return seedAdmittedValidationPlanningLineage(httpLineageSeedOptions(runtimeRepository));
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
    // T-124 S3 F5-1: the provider emitted wire carriers, but everything recorded
    // and returned is canonical — no wire residue anywhere.
    assert.equal(JSON.stringify(body).includes('domain_gate_request_json'), false);
    assert.equal(JSON.stringify(body).includes('scenario_output_jsons'), false);

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
    // T-124 S3 F5-1: canonical scenario objects survive the wire round-trip and
    // no wire residue is recorded.
    assert.equal(
      (body.final_runtime_artifact?.artifact_payload.scenario_outputs as Array<Record<string, unknown>>)[0]?.scenario_id,
      'ready_for_writing',
    );
    assert.equal(JSON.stringify(body).includes('domain_gate_request_json'), false);
    assert.equal(JSON.stringify(body).includes('scenario_output_jsons'), false);
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
    // T-124 S3 F5-1: the provider emitted domain_gate_request_json; the recorded
    // payload carries the canonical parsed object with no wire residue.
    assert.equal(
      (body.final_runtime_artifact?.artifact_payload.domain_gate_request as Record<string, unknown> | null)
        ?.result_interpretation_packet_id,
      RESULT_PACKET_ID,
    );
    assert.equal(JSON.stringify(body).includes('domain_gate_request_json'), false);
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

test('PaperImplementation route planning runtime routes use production slot services without route or Domain Gate writes', async () => {
  const runtimeRepository = new InMemoryPaperImplementationRuntimeRepository();
  const gateway = new StubRoutePlanningGateway();
  const app = buildApp({
    paperImplementationRuntimeRepository: runtimeRepository,
    paperImplementationRoutePlanningLlmGateway: gateway,
  });
  try {
    const architecture = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/route-architecture-route-candidates/run`,
      payload: routePlanningRunPayload('architecture'),
    });
    assert.equal(architecture.statusCode, 201);
    const architectureBody = architecture.json() as {
      status: string;
      provider_call_count: number;
      runtime_artifacts: PaperImplementationRuntimeArtifactEnvelope[];
      final_runtime_artifact: PaperImplementationRuntimeArtifactEnvelope | null;
      final_admission_record: PaperImplementationRuntimeAdmissionRecord | null;
      operational_telemetry: PaperImplementationRuntimeOperationalTelemetry;
    };
    assert.equal(architectureBody.status, 'passed');
    assert.equal(architectureBody.provider_call_count, 1);
    assert.equal(gateway.calls[0]?.executionContext.operation, PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_ROLE_SLOT_ID);
    assert.equal(gateway.calls[0]?.executionContext.feature, 'paper_implementation');
    assert.equal(architectureBody.runtime_artifacts.length, 2);
    assert.equal(architectureBody.runtime_artifacts.every((artifact) => artifact.slot_id === PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_SLOT_ID), true);
    assert.equal(
      (architectureBody.final_runtime_artifact?.artifact_payload.route_candidate_proposals as unknown[] | undefined)?.length,
      2,
    );
    assert.equal('technical_route_candidate_create_request' in (architectureBody.final_runtime_artifact?.artifact_payload ?? {}), false);
    assert.equal('domain_gate_request' in (architectureBody.final_runtime_artifact?.artifact_payload ?? {}), false);
    assert.equal(architectureBody.final_runtime_artifact?.artifact_payload.no_domain_gate_request, true);
    assert.equal(architectureBody.final_runtime_artifact?.artifact_payload.no_queue_side_effect, true);
    assert.equal(architectureBody.final_admission_record?.admission_status, 'admitted');
    assert.equal(architectureBody.operational_telemetry.provider_call_count_consistent, true);

    assert.ok(architectureBody.final_runtime_artifact);
    const rejectedMaterialize = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-artifacts/${encodeURIComponent(
        architectureBody.final_runtime_artifact.runtime_artifact_id,
      )}/materialize-domain-gate`,
    });
    assertErrorCode(rejectedMaterialize, 409, 'GATE_CONSTRAINT_FAILED');

    assert.ok(architectureBody.final_admission_record?.admitted_artifact_ref);
    assert.ok(architectureBody.final_admission_record?.admitted_artifact_hash);
    const skeptic = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/route-skeptic-review-route-risk-critique/run`,
      payload: routePlanningRunPayload('skeptic', 'openai', {
        ref: architectureBody.final_admission_record.admitted_artifact_ref,
        hash: architectureBody.final_admission_record.admitted_artifact_hash,
      }),
    });
    assert.equal(skeptic.statusCode, 201);
    const skepticBody = skeptic.json() as {
      status: string;
      provider_call_count: number;
      runtime_artifacts: PaperImplementationRuntimeArtifactEnvelope[];
      final_runtime_artifact: PaperImplementationRuntimeArtifactEnvelope | null;
      final_admission_record: PaperImplementationRuntimeAdmissionRecord | null;
    };
    assert.equal(skepticBody.status, 'passed');
    assert.equal(skepticBody.provider_call_count, 1);
    assert.equal(gateway.calls[1]?.executionContext.operation, PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_ROLE_SLOT_ID);
    assert.equal(skepticBody.runtime_artifacts.every((artifact) => artifact.slot_id === PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_SLOT_ID), true);
    assert.deepEqual(
      skepticBody.final_runtime_artifact?.artifact_payload.checked_dimensions,
      [...PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_RISK_DIMENSIONS],
    );
    assert.equal(skepticBody.final_runtime_artifact?.artifact_payload.recommended_disposition, 'revise');
    assert.equal(skepticBody.final_runtime_artifact?.artifact_payload.no_queue_side_effect, true);
    assert.equal('queue_action' in (skepticBody.final_runtime_artifact?.artifact_payload ?? {}), false);
    assert.equal('domain_gate_request' in (skepticBody.final_runtime_artifact?.artifact_payload ?? {}), false);
    assert.equal(skepticBody.final_admission_record?.admission_status, 'admitted');

    const architectureFinalArtifacts = await app.inject({
      method: 'GET',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-artifacts?slot_id=${encodeURIComponent(
        PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_SLOT_ID,
      )}&artifact_scope=final`,
    });
    assert.equal(architectureFinalArtifacts.statusCode, 200);
    assert.equal((architectureFinalArtifacts.json() as { items: unknown[] }).items.length, 1);

    const skepticFinalArtifacts = await app.inject({
      method: 'GET',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-artifacts?slot_id=${encodeURIComponent(
        PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_SLOT_ID,
      )}&artifact_scope=final`,
    });
    assert.equal(skepticFinalArtifacts.statusCode, 200);
    assert.equal((skepticFinalArtifacts.json() as { items: unknown[] }).items.length, 1);
  } finally {
    await app.close();
  }
});

test('PaperImplementation validation cycle planning runtime route uses admitted route artifacts without cycle or Domain Gate writes', async () => {
  const runtimeRepository = new InMemoryPaperImplementationRuntimeRepository();
  const lineage = await seedHttpRouteLineage(runtimeRepository);
  const gateway = new StubValidationCyclePlanningGateway([
    validationCyclePlanningRoleOutput({}, lineage),
  ]);
  const app = buildApp({
    paperImplementationRuntimeRepository: runtimeRepository,
    paperImplementationValidationCyclePlanningLlmGateway: gateway,
  });
  try {
    const response = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/validation-cycle-planning-cycle-candidates/run`,
      payload: validationCyclePlanningRunPayload('openai', lineage),
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
    assert.equal(gateway.calls[0]?.executionContext.operation, PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_ROLE_SLOT_ID);
    assert.equal(gateway.calls[0]?.executionContext.feature, 'paper_implementation');
    assert.equal(body.runtime_artifacts.length, 2);
    assert.equal(body.runtime_artifacts.every((artifact) => artifact.slot_id === PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_SLOT_ID), true);
    assert.equal(
      (body.final_runtime_artifact?.artifact_payload.cycle_candidate_proposals as unknown[] | undefined)?.length,
      2,
    );
    assert.equal(body.final_runtime_artifact?.artifact_payload.no_domain_gate_request, true);
    assert.equal(body.final_runtime_artifact?.artifact_payload.no_queue_side_effect, true);
    assert.equal(body.final_runtime_artifact?.artifact_payload.no_validation_cycle_side_effect, true);
    assert.equal('validation_cycle_id' in (body.final_runtime_artifact?.artifact_payload ?? {}), false);
    assert.equal('create_validation_cycle_draft_request' in (body.final_runtime_artifact?.artifact_payload ?? {}), false);
    assert.equal('queue_action' in (body.final_runtime_artifact?.artifact_payload ?? {}), false);
    assert.equal('domain_gate_request' in (body.final_runtime_artifact?.artifact_payload ?? {}), false);
    assert.equal(body.final_admission_record?.admission_status, 'admitted');
    assert.equal(body.operational_telemetry.provider_call_count_consistent, true);

    assert.ok(body.final_runtime_artifact);
    const rejectedMaterialize = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-artifacts/${encodeURIComponent(
        body.final_runtime_artifact.runtime_artifact_id,
      )}/materialize-domain-gate`,
    });
    assertErrorCode(rejectedMaterialize, 409, 'GATE_CONSTRAINT_FAILED');

    const finalArtifacts = await app.inject({
      method: 'GET',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-artifacts?slot_id=${encodeURIComponent(
        PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_SLOT_ID,
      )}&artifact_scope=final`,
    });
    assert.equal(finalArtifacts.statusCode, 200);
    assert.equal((finalArtifacts.json() as { items: unknown[] }).items.length, 1);
  } finally {
    await app.close();
  }
});

test('PaperImplementation validation cycle planning runtime route rejects route and candidate lineage drift before final admission', async () => {
  const routeHashMismatchRepository = new InMemoryPaperImplementationRuntimeRepository();
  const routeHashMismatchLineage = await seedHttpRouteLineage(routeHashMismatchRepository);
  const routeHashMismatchGateway = new StubValidationCyclePlanningGateway([
    validationCyclePlanningRoleOutput({
      reviewed_route_proposal_hash: hash('route-architecture-final-http-drifted'),
    }, routeHashMismatchLineage),
    validationCyclePlanningRoleOutput({
      reviewed_route_proposal_hash: hash('route-architecture-final-http-drifted'),
    }, routeHashMismatchLineage),
  ]);
  await assertRuntimeRouteFailsClosed({
    appOptions: {
      paperImplementationRuntimeRepository: routeHashMismatchRepository,
      paperImplementationValidationCyclePlanningLlmGateway: routeHashMismatchGateway,
    },
    url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/validation-cycle-planning-cycle-candidates/run`,
    payload: {
      ...validationCyclePlanningRunPayload('openai', routeHashMismatchLineage),
      run_id: 'validation-cycle-planning-http-route-lineage-drift',
    },
    expectedSlotId: PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_SLOT_ID,
    expectedFailureCode: 'VALIDATION_CYCLE_PLANNING_ROUTE_PROPOSAL_MISMATCH',
  });
  assert.equal(routeHashMismatchGateway.calls.length, 2);

  const candidateMismatchRepository = new InMemoryPaperImplementationRuntimeRepository();
  const candidateMismatchLineage = await seedHttpRouteLineage(candidateMismatchRepository);
  const candidateMismatchOutput = validationCyclePlanningRoleOutput({
    cycle_candidate_proposals: [
      {
        ...validationCycleCandidateProposal('exploratory-cycle-candidate', false),
        reviewed_route_candidate_key: 'drifted-route-candidate',
      },
      validationCycleCandidateProposal('confirmatory-cycle-candidate', true),
    ],
  }, candidateMismatchLineage);
  const candidateMismatchGateway = new StubValidationCyclePlanningGateway([
    candidateMismatchOutput,
    candidateMismatchOutput,
  ]);
  await assertRuntimeRouteFailsClosed({
    appOptions: {
      paperImplementationRuntimeRepository: candidateMismatchRepository,
      paperImplementationValidationCyclePlanningLlmGateway: candidateMismatchGateway,
    },
    url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/validation-cycle-planning-cycle-candidates/run`,
    payload: {
      ...validationCyclePlanningRunPayload('openai', candidateMismatchLineage),
      run_id: 'validation-cycle-planning-http-candidate-lineage-drift',
    },
    expectedSlotId: PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_SLOT_ID,
    expectedFailureCode: 'VALIDATION_CYCLE_PLANNING_CANDIDATE_KEY_MISMATCH',
  });
  assert.equal(candidateMismatchGateway.calls.length, 2);
});

test('PaperImplementation feasibility planning runtime route uses admitted validation-cycle lineage without probe, plan-light, or Domain Gate writes', async () => {
  const runtimeRepository = new InMemoryPaperImplementationRuntimeRepository();
  const lineage = await seedHttpValidationLineage(runtimeRepository);
  const gateway = new StubFeasibilityPlanningGateway([
    feasibilityPlanningRoleOutput({}, lineage),
  ]);
  const app = buildApp({
    paperImplementationRuntimeRepository: runtimeRepository,
    paperImplementationFeasibilityPlanningLlmGateway: gateway,
  });
  try {
    const response = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/feasibility-planning-probe-plan-candidates/run`,
      payload: feasibilityPlanningRunPayload('openai', lineage),
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
    assert.equal(gateway.calls[0]?.executionContext.operation, PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_ROLE_SLOT_ID);
    assert.equal(gateway.calls[0]?.executionContext.feature, 'paper_implementation');
    assert.equal(body.runtime_artifacts.length, 2);
    assert.equal(body.runtime_artifacts.every((artifact) => artifact.slot_id === PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_SLOT_ID), true);
    assert.equal(
      (body.final_runtime_artifact?.artifact_payload.probe_plan_candidate_proposals as unknown[] | undefined)?.length,
      2,
    );
    assert.equal(body.final_runtime_artifact?.artifact_payload.no_domain_gate_request, true);
    assert.equal(body.final_runtime_artifact?.artifact_payload.no_queue_side_effect, true);
    assert.equal(body.final_runtime_artifact?.artifact_payload.no_feasibility_probe_side_effect, true);
    assert.equal(body.final_runtime_artifact?.artifact_payload.no_experiment_plan_light_side_effect, true);
    assert.equal(body.final_runtime_artifact?.artifact_payload.no_validation_cycle_side_effect, true);
    assert.equal('feasibility_probe_id' in (body.final_runtime_artifact?.artifact_payload ?? {}), false);
    assert.equal('experiment_plan_light_id' in (body.final_runtime_artifact?.artifact_payload ?? {}), false);
    assert.equal('create_feasibility_probe_request' in (body.final_runtime_artifact?.artifact_payload ?? {}), false);
    assert.equal('create_experiment_plan_light_request' in (body.final_runtime_artifact?.artifact_payload ?? {}), false);
    assert.equal('queue_action' in (body.final_runtime_artifact?.artifact_payload ?? {}), false);
    assert.equal('domain_gate_request' in (body.final_runtime_artifact?.artifact_payload ?? {}), false);
    assert.equal(body.final_admission_record?.admission_status, 'admitted');
    assert.equal(body.operational_telemetry.provider_call_count_consistent, true);

    assert.ok(body.final_runtime_artifact);
    const rejectedMaterialize = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-artifacts/${encodeURIComponent(
        body.final_runtime_artifact.runtime_artifact_id,
      )}/materialize-domain-gate`,
    });
    assertErrorCode(rejectedMaterialize, 409, 'GATE_CONSTRAINT_FAILED');

    const finalArtifacts = await app.inject({
      method: 'GET',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-artifacts?slot_id=${encodeURIComponent(
        PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_SLOT_ID,
      )}&artifact_scope=final`,
    });
    assert.equal(finalArtifacts.statusCode, 200);
    assert.equal((finalArtifacts.json() as { items: unknown[] }).items.length, 1);
  } finally {
    await app.close();
  }
});

test('PaperImplementation feasibility planning runtime route rejects validation-cycle and candidate lineage drift before final admission', async () => {
  const validationCycleMismatchRepository = new InMemoryPaperImplementationRuntimeRepository();
  const validationCycleMismatchLineage = await seedHttpValidationLineage(validationCycleMismatchRepository);
  const validationCycleMismatchGateway = new StubFeasibilityPlanningGateway([
    feasibilityPlanningRoleOutput({
      reviewed_validation_cycle_artifact_hash: hash('validation-cycle-final-http-drifted'),
    }, validationCycleMismatchLineage),
    feasibilityPlanningRoleOutput({
      reviewed_validation_cycle_artifact_hash: hash('validation-cycle-final-http-drifted'),
    }, validationCycleMismatchLineage),
  ]);
  await assertRuntimeRouteFailsClosed({
    appOptions: {
      paperImplementationRuntimeRepository: validationCycleMismatchRepository,
      paperImplementationFeasibilityPlanningLlmGateway: validationCycleMismatchGateway,
    },
    url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/feasibility-planning-probe-plan-candidates/run`,
    payload: {
      ...feasibilityPlanningRunPayload('openai', validationCycleMismatchLineage),
      run_id: 'feasibility-planning-http-validation-cycle-lineage-drift',
    },
    expectedSlotId: PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_SLOT_ID,
    expectedFailureCode: 'FEASIBILITY_PLANNING_VALIDATION_CYCLE_MISMATCH',
  });
  assert.equal(validationCycleMismatchGateway.calls.length, 2);

  const routeCandidateMismatchRepository = new InMemoryPaperImplementationRuntimeRepository();
  const routeCandidateMismatchLineage = await seedHttpValidationLineage(routeCandidateMismatchRepository);
  const routeCandidateMismatchOutput = feasibilityPlanningRoleOutput({
    probe_plan_candidate_proposals: [
      {
        ...feasibilityProbePlanCandidateProposal('exploratory-probe-candidate', false),
        reviewed_route_candidate_key: 'drifted-route-candidate',
      },
      feasibilityProbePlanCandidateProposal('plan-light-readiness-candidate', true),
    ],
  }, routeCandidateMismatchLineage);
  const routeCandidateMismatchGateway = new StubFeasibilityPlanningGateway([
    routeCandidateMismatchOutput,
    routeCandidateMismatchOutput,
  ]);
  await assertRuntimeRouteFailsClosed({
    appOptions: {
      paperImplementationRuntimeRepository: routeCandidateMismatchRepository,
      paperImplementationFeasibilityPlanningLlmGateway: routeCandidateMismatchGateway,
    },
    url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/feasibility-planning-probe-plan-candidates/run`,
    payload: {
      ...feasibilityPlanningRunPayload('openai', routeCandidateMismatchLineage),
      run_id: 'feasibility-planning-http-route-candidate-lineage-drift',
    },
    expectedSlotId: PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_SLOT_ID,
    expectedFailureCode: 'FEASIBILITY_PLANNING_ROUTE_CANDIDATE_KEY_MISMATCH',
  });
  assert.equal(routeCandidateMismatchGateway.calls.length, 2);
});

test('PaperImplementation cross-board synthesis runtime route uses board anchors without review, transfer, portfolio, queue, or Domain Gate writes', async () => {
  const runtimeRepository = new InMemoryPaperImplementationRuntimeRepository();
  const gateway = new StubCrossBoardSynthesisGateway();
  const app = buildApp({
    paperImplementationRuntimeRepository: runtimeRepository,
    paperImplementationCrossBoardSynthesisLlmGateway: gateway,
  });
  try {
    const response = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/cross-board-synthesis-merge-split-reuse-scenarios/run`,
      payload: crossBoardSynthesisRunPayload(),
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
    assert.equal(gateway.calls[0]?.executionContext.operation, PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_ROLE_SLOT_ID);
    assert.equal(gateway.calls[0]?.executionContext.feature, 'paper_implementation');
    assert.equal(body.runtime_artifacts.length, 2);
    assert.equal(body.runtime_artifacts.every((artifact) => artifact.slot_id === PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_SLOT_ID), true);
    assert.equal(
      (body.final_runtime_artifact?.artifact_payload.scenario_proposals as unknown[] | undefined)?.length,
      2,
    );
    assert.equal(body.final_runtime_artifact?.artifact_payload.no_domain_gate_request, true);
    assert.equal(body.final_runtime_artifact?.artifact_payload.no_queue_side_effect, true);
    assert.equal(body.final_runtime_artifact?.artifact_payload.no_cross_board_review_side_effect, true);
    assert.equal(body.final_runtime_artifact?.artifact_payload.no_evidence_transfer_binding_side_effect, true);
    assert.equal(body.final_runtime_artifact?.artifact_payload.no_portfolio_mutation_side_effect, true);
    assert.equal(body.final_runtime_artifact?.artifact_payload.no_motive_evolution_side_effect, true);
    assert.equal('cross_board_review_id' in (body.final_runtime_artifact?.artifact_payload ?? {}), false);
    assert.equal('create_cross_board_review_request' in (body.final_runtime_artifact?.artifact_payload ?? {}), false);
    assert.equal('evidence_transfer_binding_request' in (body.final_runtime_artifact?.artifact_payload ?? {}), false);
    assert.equal('motive_portfolio_decision_id' in (body.final_runtime_artifact?.artifact_payload ?? {}), false);
    assert.equal('queue_action' in (body.final_runtime_artifact?.artifact_payload ?? {}), false);
    assert.equal('domain_gate_request' in (body.final_runtime_artifact?.artifact_payload ?? {}), false);
    assert.equal(body.final_admission_record?.admission_status, 'admitted');
    assert.equal(body.operational_telemetry.provider_call_count_consistent, true);

    assert.ok(body.final_runtime_artifact);
    const rejectedMaterialize = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-artifacts/${encodeURIComponent(
        body.final_runtime_artifact.runtime_artifact_id,
      )}/materialize-domain-gate`,
    });
    assertErrorCode(rejectedMaterialize, 409, 'GATE_CONSTRAINT_FAILED');

    const finalArtifacts = await app.inject({
      method: 'GET',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-artifacts?slot_id=${encodeURIComponent(
        PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_SLOT_ID,
      )}&artifact_scope=final`,
    });
    assert.equal(finalArtifacts.statusCode, 200);
    assert.equal((finalArtifacts.json() as { items: unknown[] }).items.length, 1);
  } finally {
    await app.close();
  }
});

test('PaperImplementation cross-board synthesis runtime route rejects board hash drift and authority request payloads', async () => {
  const boardHashMismatchOutput = crossBoardSynthesisRoleOutput({
    scenario_proposals: [
      {
        ...crossBoardReuseScenarioProposal(),
        source_board_version_hashes: [
          hash('board-version-http-1'),
          hash('board-version-http-drifted'),
        ],
      },
      crossBoardParkScenarioProposal(),
    ],
  });
  const boardHashMismatchGateway = new StubCrossBoardSynthesisGateway([
    boardHashMismatchOutput,
    boardHashMismatchOutput,
  ]);
  await assertRuntimeRouteFailsClosed({
    appOptions: {
      paperImplementationRuntimeRepository: new InMemoryPaperImplementationRuntimeRepository(),
      paperImplementationCrossBoardSynthesisLlmGateway: boardHashMismatchGateway,
    },
    url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/cross-board-synthesis-merge-split-reuse-scenarios/run`,
    payload: {
      ...crossBoardSynthesisRunPayload(),
      run_id: 'cross-board-synthesis-http-board-hash-drift',
    },
    expectedSlotId: PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_SLOT_ID,
    expectedFailureCode: 'CROSS_BOARD_SYNTHESIS_BOARD_HASH_MISMATCH',
  });
  assert.equal(boardHashMismatchGateway.calls.length, 2);

  const gateway = new StubCrossBoardSynthesisGateway();
  const app = buildApp({
    paperImplementationRuntimeRepository: new InMemoryPaperImplementationRuntimeRepository(),
    paperImplementationCrossBoardSynthesisLlmGateway: gateway,
  });
  try {
    const rejected = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/cross-board-synthesis-merge-split-reuse-scenarios/run`,
      payload: {
        ...crossBoardSynthesisRunPayload(),
        create_cross_board_review_request: { request_id: 'must_not_exist' },
      },
    });
    assert.equal(rejected.statusCode, 400);
    assert.match(rejected.body, /create_cross_board_review_request/);
    assert.equal(gateway.calls.length, 0);
  } finally {
    await app.close();
  }
});

test('PaperImplementation coordinator routes create, advance, and get a run through the real service path', async () => {
  const runtimeRepository = new InMemoryPaperImplementationRuntimeRepository();
  const gateway = new StubEvidenceBoardCurationGateway();
  const app = buildApp({
    paperImplementationRuntimeRepository: runtimeRepository,
    paperImplementationEvidenceBoardCurationLlmGateway: gateway,
  });
  try {
    // Coordinator-owned fields (run_id / run_mode / execution_mode) are
    // injected by the coordinator; the slot payload must not carry them.
    const {
      run_id: _runId,
      run_mode: _runMode,
      execution_mode: _executionMode,
      ...slotPayload
    } = evidenceBoardCurationRunPayload();

    const created = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/coordinator-runs`,
      payload: {
        lane_id: 'evidence-board-curation',
        run_mode: 'product',
        execution_mode: 'provider_llm',
        budget_envelope: { max_steps: 2, max_provider_calls: 4 },
        slot_request_payloads: {
          [PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_SLOT_ID]: slotPayload,
        },
      },
    });
    assert.equal(created.statusCode, 201);
    const createdBody = created.json() as {
      coordinator_run_id: string;
      run_status: string;
      lane_id: string;
      consumed: { steps: number; provider_calls: number };
    };
    assert.equal(createdBody.run_status, 'created');
    assert.equal(createdBody.lane_id, 'evidence-board-curation');
    assert.equal(gateway.calls.length, 0);

    const advanced = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/coordinator-runs/${encodeURIComponent(createdBody.coordinator_run_id)}/advance`,
      payload: {},
    });
    assert.equal(advanced.statusCode, 202);
    const advancedBody = advanced.json() as {
      run: { run_status: string; lease: unknown; consumed: { steps: number; provider_calls: number } };
      steps: Array<{
        slot_id: string;
        outcome: string;
        node_attempt_id: string;
        runtime_artifact_ref: { ref_type: string } | null;
        runtime_artifact_hash: string | null;
        runtime_artifact_id: string | null;
      }>;
    };
    assert.equal(advancedBody.run.run_status, 'completed');
    assert.equal(advancedBody.run.lease, null);
    assert.equal(advancedBody.run.consumed.steps, 1);
    assert.equal(advancedBody.run.consumed.provider_calls, 1);
    assert.equal(advancedBody.steps.length, 1);
    assert.equal(advancedBody.steps[0]?.slot_id, PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_SLOT_ID);
    assert.equal(advancedBody.steps[0]?.outcome, 'passed');
    assert.ok(advancedBody.steps[0]?.runtime_artifact_ref);
    // R9: the admitted step projects the full acceptance-bridge lineage pair.
    assert.ok(advancedBody.steps[0]?.runtime_artifact_id);
    assert.ok(advancedBody.steps[0]?.runtime_artifact_hash);
    assert.equal(gateway.calls.length, 1);

    const fetched = await app.inject({
      method: 'GET',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/coordinator-runs/${encodeURIComponent(createdBody.coordinator_run_id)}`,
    });
    assert.equal(fetched.statusCode, 200);
    const fetchedBody = fetched.json() as {
      run: { run_status: string };
      steps: Array<{
        outcome: string;
        runtime_artifact_id: string | null;
        runtime_artifact_hash: string | null;
      }>;
    };
    assert.equal(fetchedBody.run.run_status, 'completed');
    assert.equal(fetchedBody.steps.length, 1);
    assert.equal(fetchedBody.steps[0]?.outcome, 'passed');
    // R9: the persisted step projection reads the lineage pair back intact.
    assert.equal(fetchedBody.steps[0]?.runtime_artifact_id, advancedBody.steps[0]?.runtime_artifact_id);
    assert.equal(fetchedBody.steps[0]?.runtime_artifact_hash, advancedBody.steps[0]?.runtime_artifact_hash);

    // Terminal runs cannot be re-advanced.
    const terminal = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/coordinator-runs/${encodeURIComponent(createdBody.coordinator_run_id)}/advance`,
      payload: {},
    });
    assert.equal(terminal.statusCode, 409);
  } finally {
    await app.close();
  }
});

test('PaperImplementation coordinator-runs list route returns project run projections without steps', async () => {
  const runtimeRepository = new InMemoryPaperImplementationRuntimeRepository();
  const gateway = new StubEvidenceBoardCurationGateway();
  const app = buildApp({
    paperImplementationRuntimeRepository: runtimeRepository,
    paperImplementationEvidenceBoardCurationLlmGateway: gateway,
  });
  try {
    const {
      run_id: _runId,
      run_mode: _runMode,
      execution_mode: _executionMode,
      ...slotPayload
    } = evidenceBoardCurationRunPayload();
    const createBody = (coordinatorRunId: string) => ({
      coordinator_run_id: coordinatorRunId,
      lane_id: 'evidence-board-curation',
      run_mode: 'product',
      execution_mode: 'provider_llm',
      budget_envelope: { max_steps: 2, max_provider_calls: 4 },
      slot_request_payloads: {
        [PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_SLOT_ID]: slotPayload,
      },
    });

    // Empty project: the list route returns an empty projection, not a 404.
    // Prisma reuses a persistent dev schema, so coordinator runs from other
    // tests in this process accumulate under the shared PROJECT_ID — the
    // whole-table emptiness/exact-count assertions hold only for the fresh
    // in-memory store (same isolation pattern as the queue fixture above).
    const empty = await app.inject({
      method: 'GET',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/coordinator-runs`,
    });
    assert.equal(empty.statusCode, 200);
    if (process.env.PAPER_IMPLEMENTATION_REPOSITORY !== 'prisma') {
      assert.deepEqual((empty.json() as { runs: unknown[] }).runs, []);
    }

    // Process-unique ids: the persistent prisma dev schema keeps runs across
    // smoke invocations, so fixed ids would 409 on the second run.
    const listRunIdA = `coordinator-run-list-a-${PROJECT_ID}`;
    const listRunIdB = `coordinator-run-list-b-${PROJECT_ID}`;
    for (const coordinatorRunId of [listRunIdA, listRunIdB]) {
      const created = await app.inject({
        method: 'POST',
        url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/coordinator-runs`,
        payload: createBody(coordinatorRunId),
      });
      assert.equal(created.statusCode, 201);
    }

    const listed = await app.inject({
      method: 'GET',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/coordinator-runs`,
    });
    assert.equal(listed.statusCode, 200);
    const body = listed.json() as {
      runs: Array<{
        coordinator_run_id: string;
        run_status: string;
        lane_id: string;
        budget_envelope?: unknown;
        steps?: unknown;
        slot_request_payloads?: unknown;
      }>;
    };
    if (process.env.PAPER_IMPLEMENTATION_REPOSITORY !== 'prisma') {
      assert.equal(body.runs.length, 2);
    }
    const ids = new Set(body.runs.map((run) => run.coordinator_run_id));
    assert.ok(ids.has(listRunIdA));
    assert.ok(ids.has(listRunIdB));
    // Projection shape holds for EVERY listed run (prisma may include runs
    // from earlier tests in this process); state assertions only for the two
    // runs this test created.
    for (const run of body.runs) {
      // Run projection only — the list route never carries the step timeline.
      assert.equal(run.steps, undefined);
      // S4 slim projection: the heavy per-slot request payload map is stripped
      // from the list; the single-run GET still carries it in full.
      assert.equal(run.slot_request_payloads, undefined);
      // Lightweight run-row fields are retained for the list view.
      assert.ok(run.budget_envelope);
    }
    for (const run of body.runs.filter((entry) => entry.coordinator_run_id === listRunIdA || entry.coordinator_run_id === listRunIdB)) {
      assert.equal(run.run_status, 'created');
      assert.equal(run.lane_id, 'evidence-board-curation');
    }
  } finally {
    await app.close();
  }
});

interface CoordinatorQueueHttpFixture {
  coordinatorRunId: string;
  queueItemId: string;
}

async function createBlockedCoordinatorQueueFixture(
  app: FastifyInstance,
  budgetEnvelope: { max_steps: number; max_provider_calls: number },
): Promise<CoordinatorQueueHttpFixture> {
  const {
    run_id: _runId,
    run_mode: _runMode,
    execution_mode: _executionMode,
    ...slotPayload
  } = evidenceBoardCurationRunPayload();
  const created = await app.inject({
    method: 'POST',
    url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/coordinator-runs`,
    payload: {
      lane_id: 'evidence-board-curation',
      run_mode: 'product',
      execution_mode: 'provider_llm',
      budget_envelope: budgetEnvelope,
      slot_request_payloads: {
        [PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_SLOT_ID]: slotPayload,
      },
    },
  });
  assert.equal(created.statusCode, 201);
  const coordinatorRunId = (created.json() as { coordinator_run_id: string }).coordinator_run_id;

  const blocked = await app.inject({
    method: 'POST',
    url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/coordinator-runs/${encodeURIComponent(coordinatorRunId)}/advance`,
    payload: {},
  });
  assert.equal(blocked.statusCode, 202);
  const blockedBody = blocked.json() as {
    run: { run_status: string };
    steps: Array<{ outcome: string }>;
  };
  assert.equal(blockedBody.run.run_status, 'blocked');
  assert.equal(blockedBody.steps[0]?.outcome, 'failed_runtime');

  const listed = await app.inject({
    method: 'GET',
    url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/decision-work-queue`,
  });
  assert.equal(listed.statusCode, 200);
  const allItems = (listed.json() as {
    items: Array<{
      queue_item_id: string;
      queue_type: string;
      stage: string;
      status: string;
      cooldown_until: string | null;
      retry_count: number;
      source_coordinator_run_ref: { ref_type: string; ref_id: string } | null;
      source_step_index: number | null;
    }>;
  }).items;
  // Prisma reuses a persistent dev schema, so queue items from OTHER tests in
  // this same process still accumulate under the shared PROJECT_ID. Scope the
  // dedup assertion to this coordinator run — and under the in-memory
  // repository (fresh store per app) additionally pin the WHOLE table to
  // exactly one item, restoring the no-leak coverage.
  if (process.env.PAPER_IMPLEMENTATION_REPOSITORY !== 'prisma') {
    assert.equal(allItems.length, 1);
  }
  const items = allItems.filter((entry) => entry.source_coordinator_run_ref?.ref_id === coordinatorRunId);
  assert.equal(items.length, 1);
  const item = items[0]!;
  assert.equal(item.queue_type, 'failed_run_review');
  assert.equal(item.stage, 'coordinator_step_execution');
  assert.equal(item.status, 'open');
  assert.equal(item.retry_count, 0);
  assert.equal(item.cooldown_until, null);
  assert.equal(item.source_coordinator_run_ref?.ref_id, coordinatorRunId);
  assert.equal(item.source_step_index, 0);
  return { coordinatorRunId, queueItemId: item.queue_item_id };
}

function resolveQueueItemUrl(queueItemId: string): string {
  return `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/decision-work-queue/${encodeURIComponent(queueItemId)}/resolve`;
}

test('queue resolve re-advance resumes the coordinator run from the breakpoint', async () => {
  const runtimeRepository = new InMemoryPaperImplementationRuntimeRepository();
  // Two failures cover the slot's initial call plus its single technical
  // retry, so the first coordinator step fails runtime and every later call
  // succeeds.
  const gateway = new FlakyEvidenceBoardCurationGateway(2);
  const app = buildApp({
    paperImplementationRuntimeRepository: runtimeRepository,
    paperImplementationEvidenceBoardCurationLlmGateway: gateway,
  });
  try {
    const fixture = await createBlockedCoordinatorQueueFixture(app, {
      max_steps: 4,
      max_provider_calls: 8,
    });
    assert.equal(gateway.calls.length, 2);

    const resolved = await app.inject({
      method: 'POST',
      url: resolveQueueItemUrl(fixture.queueItemId),
      payload: {
        status: 'resolved',
        resolution_note: 'provider outage repaired',
        resolved_by: 'human',
        re_advance: true,
      },
    });
    assert.equal(resolved.statusCode, 200);
    const resolvedBody = resolved.json() as {
      status: string;
      queue_item_id: string;
      coordinator_advance?: {
        run: { run_status: string; lease: unknown };
        steps: Array<{ step_index: number; outcome: string; node_attempt_id: string }>;
      } | null;
    };
    assert.equal(resolvedBody.status, 'resolved');
    assert.equal(resolvedBody.queue_item_id, fixture.queueItemId);
    assert.equal(resolvedBody.coordinator_advance?.run.run_status, 'completed');
    assert.equal(resolvedBody.coordinator_advance?.run.lease, null);
    // Breakpoint resume: the same slot ran a fresh attempt — one
    // failed_runtime attempt, one passed attempt, distinct attempt ids.
    const stepAttempts = resolvedBody.coordinator_advance?.steps ?? [];
    assert.equal(stepAttempts.length, 2);
    assert.deepEqual(stepAttempts.map((step) => step.outcome), ['failed_runtime', 'passed']);
    assert.equal(new Set(stepAttempts.map((step) => step.node_attempt_id)).size, 2);
    assert.equal(gateway.calls.length, 3);

    const fetched = await app.inject({
      method: 'GET',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/coordinator-runs/${encodeURIComponent(fixture.coordinatorRunId)}`,
    });
    assert.equal((fetched.json() as { run: { run_status: string } }).run.run_status, 'completed');
  } finally {
    await app.close();
  }
});

test('queue resolve re-advance enforces the reopen cooldown before coordinator reflow', async () => {
  const app = buildApp({
    paperImplementationRuntimeRepository: new InMemoryPaperImplementationRuntimeRepository(),
    paperImplementationEvidenceBoardCurationLlmGateway: new FailingProviderGateway(),
  });
  try {
    const fixture = await createBlockedCoordinatorQueueFixture(app, {
      max_steps: 8,
      max_provider_calls: 16,
    });

    // Plain resolve, then a direct advance that blocks again: the terminal
    // item reopens with retry_count 1 and a live cooldown window.
    const plainResolve = await app.inject({
      method: 'POST',
      url: resolveQueueItemUrl(fixture.queueItemId),
      payload: { status: 'resolved', resolution_note: 'first repair attempt', resolved_by: 'human' },
    });
    assert.equal(plainResolve.statusCode, 200);
    const reAdvanceBlocked = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/coordinator-runs/${encodeURIComponent(fixture.coordinatorRunId)}/advance`,
      payload: {},
    });
    assert.equal(reAdvanceBlocked.statusCode, 202);
    assert.equal((reAdvanceBlocked.json() as { run: { run_status: string } }).run.run_status, 'blocked');

    const rejected = await app.inject({
      method: 'POST',
      url: resolveQueueItemUrl(fixture.queueItemId),
      payload: { status: 'resolved', resolved_by: 'human', re_advance: true },
    });
    assert.equal(rejected.statusCode, 409);
    const rejectedBody = rejected.json() as {
      error: { code: string; message: string; details?: { cooldown_until?: string } };
    };
    assert.equal(rejectedBody.error.code, 'GATE_CONSTRAINT_FAILED');
    assert.match(rejectedBody.error.message, /cooling down/);
    assert.ok(rejectedBody.error.details?.cooldown_until);

    // The 409 fired before the resolve: the reopened item stays open.
    const listed = await app.inject({
      method: 'GET',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/decision-work-queue`,
    });
    const item = (listed.json() as {
      items: Array<{ queue_item_id: string; status: string; retry_count: number }>;
    }).items.find((entry) => entry.queue_item_id === fixture.queueItemId);
    assert.equal(item?.status, 'open');
    assert.equal(item?.retry_count, 1);
  } finally {
    await app.close();
  }
});

test('queue resolve re-advance stops at an exhausted retry budget until an explicit override raises it', async () => {
  // Zero reopen-cooldown injection isolates the retry-budget gate from the
  // cooldown gate; product wiring keeps the fixed default.
  const harnessRepository = new InMemoryPaperImplementationAiWorkflowHarnessRepository({
    reopenCooldownMs: 0,
  });
  const app = buildApp({
    paperImplementationRuntimeRepository: new InMemoryPaperImplementationRuntimeRepository(),
    paperImplementationAiWorkflowHarnessRepository: harnessRepository,
    paperImplementationEvidenceBoardCurationLlmGateway: new FailingProviderGateway(),
  });
  try {
    const fixture = await createBlockedCoordinatorQueueFixture(app, {
      max_steps: 20,
      max_provider_calls: 40,
    });

    // Exhaust the default retry budget (2) through resolve → advance-blocked
    // reopen cycles.
    for (let cycle = 0; cycle < 2; cycle += 1) {
      const cycleResolve = await app.inject({
        method: 'POST',
        url: resolveQueueItemUrl(fixture.queueItemId),
        payload: { status: 'resolved', resolution_note: `repair cycle ${cycle}`, resolved_by: 'human' },
      });
      assert.equal(cycleResolve.statusCode, 200);
      const cycleAdvance = await app.inject({
        method: 'POST',
        url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/coordinator-runs/${encodeURIComponent(fixture.coordinatorRunId)}/advance`,
        payload: {},
      });
      assert.equal(cycleAdvance.statusCode, 202);
    }
    const listed = await app.inject({
      method: 'GET',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/decision-work-queue`,
    });
    const exhausted = (listed.json() as {
      items: Array<{
        queue_item_id: string;
        retry_count: number;
        retry_budget: number;
        recommended_actions: string[];
      }>;
    }).items.find((entry) => entry.queue_item_id === fixture.queueItemId);
    assert.equal(exhausted?.retry_count, 2);
    assert.equal(exhausted?.retry_budget, 2);
    assert.ok(exhausted?.recommended_actions.includes('raise_retry_budget'));

    // Exhausted budget: automatic reflow refuses with the raise hint and the
    // item is left untouched (still open).
    const rejected = await app.inject({
      method: 'POST',
      url: resolveQueueItemUrl(fixture.queueItemId),
      payload: { status: 'resolved', resolved_by: 'human', re_advance: true },
    });
    assert.equal(rejected.statusCode, 409);
    const rejectedBody = rejected.json() as {
      error: { code: string; message: string; details?: { recommended_action?: string } };
    };
    assert.equal(rejectedBody.error.code, 'GATE_CONSTRAINT_FAILED');
    assert.match(rejectedBody.error.message, /retry budget is exhausted/);
    assert.equal(rejectedBody.error.details?.recommended_action, 'raise_retry_budget');

    // Explicit raise via retry_budget_override re-enables the reflow; the
    // still-broken provider parks the run as blocked again, and the advance
    // projection is returned with the resolved item.
    const overridden = await app.inject({
      method: 'POST',
      url: resolveQueueItemUrl(fixture.queueItemId),
      payload: {
        status: 'resolved',
        resolution_note: 'budget raised for one more reflow',
        resolved_by: 'human',
        re_advance: true,
        retry_budget_override: 3,
      },
    });
    assert.equal(overridden.statusCode, 200);
    const overriddenBody = overridden.json() as {
      status: string;
      retry_budget: number;
      recommended_actions: string[];
      coordinator_advance?: { run: { run_status: string } } | null;
    };
    assert.equal(overriddenBody.status, 'resolved');
    assert.equal(overriddenBody.retry_budget, 3);
    assert.equal(overriddenBody.recommended_actions.includes('raise_retry_budget'), false);
    assert.equal(overriddenBody.coordinator_advance?.run.run_status, 'blocked');
  } finally {
    await app.close();
  }
});

test('queue resolve re-advance with a budget raise resumes a budget_exhausted coordinator run', async () => {
  // F2: budget_exhausted is not terminal — resolve(re_advance) forwarding an
  // increase-only raise_budget_envelope resumes the run to completion.
  const gateway = new FlakyEvidenceBoardCurationGateway(2);
  const app = buildApp({
    paperImplementationRuntimeRepository: new InMemoryPaperImplementationRuntimeRepository(),
    paperImplementationEvidenceBoardCurationLlmGateway: gateway,
  });
  try {
    const fixture = await createBlockedCoordinatorQueueFixture(app, {
      max_steps: 1,
      max_provider_calls: 8,
    });

    // A plain advance now parks the run as budget_exhausted (the failed
    // attempt consumed the whole one-step envelope) without executing slots.
    const exhausted = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/coordinator-runs/${encodeURIComponent(fixture.coordinatorRunId)}/advance`,
      payload: {},
    });
    assert.equal(exhausted.statusCode, 202);
    assert.equal((exhausted.json() as { run: { run_status: string } }).run.run_status, 'budget_exhausted');
    assert.equal(gateway.calls.length, 2);

    // R1: a raise-less re_advance on a budget_exhausted run is a silent dead
    // end (resolve + no-op advance) — the controller rejects it BEFORE the
    // resolve with the raise hint, leaving the item untouched.
    const deadEndRejected = await app.inject({
      method: 'POST',
      url: resolveQueueItemUrl(fixture.queueItemId),
      payload: {
        status: 'resolved',
        resolution_note: 'raise-less reflow must not dead-end',
        resolved_by: 'human',
        re_advance: true,
      },
    });
    assert.equal(deadEndRejected.statusCode, 409);
    const deadEndBody = deadEndRejected.json() as {
      error: { code: string; message: string; details?: { recommended_action?: string } };
    };
    assert.equal(deadEndBody.error.code, 'GATE_CONSTRAINT_FAILED');
    assert.match(deadEndBody.error.message, /budget_exhausted/);
    assert.equal(deadEndBody.error.details?.recommended_action, 'raise_budget_envelope');
    // The 409 fired before the resolve: the item stays open and unresolved.
    const afterDeadEnd = await app.inject({
      method: 'GET',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/decision-work-queue`,
    });
    const deadEndItem = (afterDeadEnd.json() as {
      items: Array<{ queue_item_id: string; status: string; resolved_at: string | null }>;
    }).items.find((entry) => entry.queue_item_id === fixture.queueItemId);
    assert.equal(deadEndItem?.status, 'open');
    assert.equal(deadEndItem?.resolved_at, null);
    assert.equal(gateway.calls.length, 2);

    const resolved = await app.inject({
      method: 'POST',
      url: resolveQueueItemUrl(fixture.queueItemId),
      payload: {
        status: 'resolved',
        resolution_note: 'budget raised after provider repair',
        resolved_by: 'human',
        re_advance: true,
        raise_budget_envelope: { max_steps: 4 },
      },
    });
    assert.equal(resolved.statusCode, 200);
    const resolvedBody = resolved.json() as {
      status: string;
      coordinator_advance?: {
        run: { run_status: string; budget_envelope: { max_steps: number } };
        steps: Array<{ outcome: string }>;
      } | null;
      coordinator_advance_error?: { code: string } | null;
    };
    assert.equal(resolvedBody.status, 'resolved');
    assert.equal(resolvedBody.coordinator_advance_error ?? null, null);
    assert.equal(resolvedBody.coordinator_advance?.run.run_status, 'completed');
    assert.equal(resolvedBody.coordinator_advance?.run.budget_envelope.max_steps, 4);
    assert.deepEqual(
      resolvedBody.coordinator_advance?.steps.map((step) => step.outcome),
      ['failed_runtime', 'passed'],
    );
    assert.equal(gateway.calls.length, 3);
  } finally {
    await app.close();
  }
});

test('queue resolve re-advance rejects terminal coordinator runs before resolving', async () => {
  // F2: a completed run can never be re-advanced; the 409 fires BEFORE the
  // resolve so the queue item is left untouched.
  const gateway = new FlakyEvidenceBoardCurationGateway(2);
  const app = buildApp({
    paperImplementationRuntimeRepository: new InMemoryPaperImplementationRuntimeRepository(),
    paperImplementationEvidenceBoardCurationLlmGateway: gateway,
  });
  try {
    const fixture = await createBlockedCoordinatorQueueFixture(app, {
      max_steps: 4,
      max_provider_calls: 8,
    });

    // Complete the run through a direct advance (the gateway recovered).
    const completed = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/coordinator-runs/${encodeURIComponent(fixture.coordinatorRunId)}/advance`,
      payload: {},
    });
    assert.equal(completed.statusCode, 202);
    assert.equal((completed.json() as { run: { run_status: string } }).run.run_status, 'completed');

    const rejected = await app.inject({
      method: 'POST',
      url: resolveQueueItemUrl(fixture.queueItemId),
      payload: { status: 'resolved', resolved_by: 'human', re_advance: true },
    });
    assert.equal(rejected.statusCode, 409);
    const rejectedBody = rejected.json() as { error: { code: string; message: string } };
    assert.equal(rejectedBody.error.code, 'GATE_CONSTRAINT_FAILED');
    assert.match(rejectedBody.error.message, /terminal/);

    // The queue item was not resolved by the rejected request.
    const listed = await app.inject({
      method: 'GET',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/decision-work-queue`,
    });
    const item = (listed.json() as {
      items: Array<{ queue_item_id: string; status: string; resolved_at: string | null }>;
    }).items.find((entry) => entry.queue_item_id === fixture.queueItemId);
    assert.equal(item?.status, 'open');
    assert.equal(item?.resolved_at, null);
  } finally {
    await app.close();
  }
});

test('queue resolve re-advance is rejected for a non-resolved status before any side-effect', async () => {
  // re_advance drives a real coordinator advance (LLM consumption). A
  // `dismissed`/`superseded` resolution abandons the breakpoint, so pairing it
  // with re_advance would burn provider budget re-running an abandoned slot.
  // The controller rejects it with a clear 400 INVALID_PAYLOAD BEFORE any
  // resolve or advance side-effect: the item stays open and zero advances run.
  const gateway = new FlakyEvidenceBoardCurationGateway(2);
  const app = buildApp({
    paperImplementationRuntimeRepository: new InMemoryPaperImplementationRuntimeRepository(),
    paperImplementationEvidenceBoardCurationLlmGateway: gateway,
  });
  try {
    const fixture = await createBlockedCoordinatorQueueFixture(app, {
      max_steps: 4,
      max_provider_calls: 8,
    });
    // The fixture's blocked step already consumed the two seeded failures.
    assert.equal(gateway.calls.length, 2);

    for (const status of ['dismissed', 'superseded'] as const) {
      const rejected = await app.inject({
        method: 'POST',
        url: resolveQueueItemUrl(fixture.queueItemId),
        payload: { status, resolved_by: 'human', re_advance: true },
      });
      assert.equal(rejected.statusCode, 400);
      const rejectedBody = rejected.json() as {
        error: { code: string; message: string; details?: { status?: string } };
      };
      assert.equal(rejectedBody.error.code, 'INVALID_PAYLOAD');
      assert.match(rejectedBody.error.message, /re_advance requires status 'resolved'/);
      assert.equal(rejectedBody.error.details?.status, status);
    }

    // No resolve happened and no coordinator advance ran (zero new provider
    // calls beyond the fixture's blocked step).
    assert.equal(gateway.calls.length, 2);
    const listed = await app.inject({
      method: 'GET',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/decision-work-queue`,
    });
    const item = (listed.json() as {
      items: Array<{ queue_item_id: string; status: string; resolved_at: string | null }>;
    }).items.find((entry) => entry.queue_item_id === fixture.queueItemId);
    assert.equal(item?.status, 'open');
    assert.equal(item?.resolved_at, null);

    // Control: a plain dismiss (no re_advance) is still accepted and resolves.
    const dismissed = await app.inject({
      method: 'POST',
      url: resolveQueueItemUrl(fixture.queueItemId),
      payload: { status: 'dismissed', resolved_by: 'human' },
    });
    assert.equal(dismissed.statusCode, 200);
    assert.equal((dismissed.json() as { status: string }).status, 'dismissed');
    assert.equal(gateway.calls.length, 2);
  } finally {
    await app.close();
  }
});

test('queue resolve surfaces a coordinator advance failure without failing the resolve', async () => {
  // F2: once the resolve has happened, an advance failure is reported in
  // coordinator_advance_error alongside the resolved item — never a 500 that
  // hides the successful resolve.
  const app = buildApp({
    paperImplementationRuntimeRepository: new InMemoryPaperImplementationRuntimeRepository(),
    paperImplementationEvidenceBoardCurationLlmGateway: new FailingProviderGateway(),
  });
  try {
    const fixture = await createBlockedCoordinatorQueueFixture(app, {
      max_steps: 8,
      max_provider_calls: 16,
    });

    // A reducing raise makes the forwarded advance fail deterministically
    // (400 INVALID_PAYLOAD) after the resolve has been applied.
    const resolved = await app.inject({
      method: 'POST',
      url: resolveQueueItemUrl(fixture.queueItemId),
      payload: {
        status: 'resolved',
        resolution_note: 'resolve survives the advance failure',
        resolved_by: 'human',
        re_advance: true,
        raise_budget_envelope: { max_steps: 1 },
      },
    });
    assert.equal(resolved.statusCode, 200);
    const resolvedBody = resolved.json() as {
      status: string;
      coordinator_advance?: unknown;
      coordinator_advance_error?: { code: string; message: string } | null;
    };
    assert.equal(resolvedBody.status, 'resolved');
    assert.equal(resolvedBody.coordinator_advance ?? null, null);
    assert.equal(resolvedBody.coordinator_advance_error?.code, 'INVALID_PAYLOAD');
    assert.match(resolvedBody.coordinator_advance_error?.message ?? '', /must not reduce/);

    // The item is resolved despite the failed advance.
    const listed = await app.inject({
      method: 'GET',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/decision-work-queue`,
    });
    const item = (listed.json() as {
      items: Array<{ queue_item_id: string; status: string; resolved_at: string | null }>;
    }).items.find((entry) => entry.queue_item_id === fixture.queueItemId);
    assert.equal(item?.status, 'resolved');
    assert.ok(item?.resolved_at);
  } finally {
    await app.close();
  }
});

test('PaperImplementation evidence-board curation runtime route uses append-only candidates without board, binding, citation, trace-repair, queue, or Domain Gate writes', async () => {
  const runtimeRepository = new InMemoryPaperImplementationRuntimeRepository();
  const gateway = new StubEvidenceBoardCurationGateway();
  const app = buildApp({
    paperImplementationRuntimeRepository: runtimeRepository,
    paperImplementationEvidenceBoardCurationLlmGateway: gateway,
  });
  try {
    const response = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/evidence-board-curation-binding-gap-candidates/run`,
      payload: evidenceBoardCurationRunPayload(),
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
    assert.equal(gateway.calls[0]?.executionContext.operation, PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_ROLE_SLOT_ID);
    assert.equal(gateway.calls[0]?.executionContext.feature, 'paper_implementation');
    assert.equal(body.runtime_artifacts.length, 2);
    assert.equal(body.runtime_artifacts.every((artifact) => artifact.slot_id === PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_SLOT_ID), true);
    assert.equal(
      (body.final_runtime_artifact?.artifact_payload.binding_candidate_proposals as unknown[] | undefined)?.length,
      1,
    );
    assert.equal(
      (body.final_runtime_artifact?.artifact_payload.gap_candidate_proposals as unknown[] | undefined)?.length,
      0,
    );
    assert.equal(body.final_runtime_artifact?.artifact_payload.no_domain_gate_request, true);
    assert.equal(body.final_runtime_artifact?.artifact_payload.no_queue_side_effect, true);
    assert.equal(body.final_runtime_artifact?.artifact_payload.no_board_write_side_effect, true);
    assert.equal(body.final_runtime_artifact?.artifact_payload.no_evidence_binding_side_effect, true);
    assert.equal(body.final_runtime_artifact?.artifact_payload.no_evidence_transfer_binding_side_effect, true);
    assert.equal(body.final_runtime_artifact?.artifact_payload.no_citation_candidate_side_effect, true);
    assert.equal(body.final_runtime_artifact?.artifact_payload.no_trace_repair_queue_side_effect, true);
    assert.equal('motive_evidence_board_version_id' in (body.final_runtime_artifact?.artifact_payload ?? {}), false);
    assert.equal('board_draft' in (body.final_runtime_artifact?.artifact_payload ?? {}), false);
    assert.equal('bindings' in (body.final_runtime_artifact?.artifact_payload ?? {}), false);
    assert.equal('create_evidence_binding_request' in (body.final_runtime_artifact?.artifact_payload ?? {}), false);
    assert.equal('citation_candidate_request' in (body.final_runtime_artifact?.artifact_payload ?? {}), false);
    assert.equal('trace_repair_queue_item' in (body.final_runtime_artifact?.artifact_payload ?? {}), false);
    assert.equal('queue_action' in (body.final_runtime_artifact?.artifact_payload ?? {}), false);
    assert.equal('domain_gate_request' in (body.final_runtime_artifact?.artifact_payload ?? {}), false);
    assert.equal(body.final_admission_record?.admission_status, 'admitted');
    assert.equal(body.operational_telemetry.provider_call_count_consistent, true);

    assert.ok(body.final_runtime_artifact);
    const rejectedMaterialize = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-artifacts/${encodeURIComponent(
        body.final_runtime_artifact.runtime_artifact_id,
      )}/materialize-domain-gate`,
    });
    assertErrorCode(rejectedMaterialize, 409, 'GATE_CONSTRAINT_FAILED');

    const finalArtifacts = await app.inject({
      method: 'GET',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-artifacts?slot_id=${encodeURIComponent(
        PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_SLOT_ID,
      )}&artifact_scope=final`,
    });
    assert.equal(finalArtifacts.statusCode, 200);
    assert.equal((finalArtifacts.json() as { items: unknown[] }).items.length, 1);
  } finally {
    await app.close();
  }
});

test('PaperImplementation evidence-board curation runtime route rejects ref drift, provider fixtures, and authority request payloads', async () => {
  const inventedRefOutput = evidenceBoardCurationRoleOutput({
    binding_candidate_proposals: [{
      ...evidenceBoardBindingCandidateProposal('binding-candidate-http-1'),
      target_assertion_ref: ref('motive_assertion', 'invented-assertion-http-1'),
    }],
  });
  const inventedRefGateway = new StubEvidenceBoardCurationGateway([
    inventedRefOutput,
    inventedRefOutput,
  ]);
  await assertRuntimeRouteFailsClosed({
    appOptions: {
      paperImplementationRuntimeRepository: new InMemoryPaperImplementationRuntimeRepository(),
      paperImplementationEvidenceBoardCurationLlmGateway: inventedRefGateway,
    },
    url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/evidence-board-curation-binding-gap-candidates/run`,
    payload: {
      ...evidenceBoardCurationRunPayload(),
      run_id: 'evidence-board-curation-http-ref-drift',
    },
    expectedSlotId: PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_SLOT_ID,
    expectedFailureCode: 'EVIDENCE_BOARD_CURATION_REF_MISMATCH',
  });
  assert.equal(inventedRefGateway.calls.length, 2);

  const gateway = new StubEvidenceBoardCurationGateway();
  const app = buildApp({
    paperImplementationRuntimeRepository: new InMemoryPaperImplementationRuntimeRepository(),
    paperImplementationEvidenceBoardCurationLlmGateway: gateway,
  });
  try {
    const authorityRejected = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/evidence-board-curation-binding-gap-candidates/run`,
      payload: {
        ...evidenceBoardCurationRunPayload(),
        board_summary_patch: { must_not_exist: true },
      },
    });
    assert.equal(authorityRejected.statusCode, 400);
    assert.match(authorityRejected.body, /board_summary_patch/);

    const productFixtureRejected = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/evidence-board-curation-binding-gap-candidates/run`,
      payload: {
        ...evidenceBoardCurationRunPayload(),
        execution_mode: 'mocked_llm',
        model_option_id: null,
        mocked_role_outputs: {
          [PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_ROLE_SLOT_ID]: evidenceBoardCurationRoleOutput(),
        },
      },
    });
    assert.equal(productFixtureRejected.statusCode, 400);
    assert.match(productFixtureRejected.body, /provider_llm/);

    const modelOptionRejected = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/evidence-board-curation-binding-gap-candidates/run`,
      payload: {
        ...evidenceBoardCurationRunPayload(),
        model_option_id: providerModelOptionId(PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_PROFILE_ID, 'openai'),
      },
    });
    assert.equal(modelOptionRejected.statusCode, 400);
    assert.match(modelOptionRejected.body, /model_option_id must belong to runtime slot profile/);
    assert.equal(gateway.calls.length, 0);
  } finally {
    await app.close();
  }
});

test('PaperImplementation motive decomposition runtime route proposes draft assertion candidates without motive, board, trace, queue, or Domain Gate writes', async () => {
  const runtimeRepository = new InMemoryPaperImplementationRuntimeRepository();
  const gateway = new StubMotiveDecompositionGateway();
  const app = buildApp({
    paperImplementationRuntimeRepository: runtimeRepository,
    paperImplementationMotiveDecompositionLlmGateway: gateway,
  });
  try {
    const response = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/motive-decomposition-draft-assertion-candidates/run`,
      payload: motiveDecompositionRunPayload(),
    });
    assert.equal(response.statusCode, 201);
    const body = response.json() as {
      status: string;
      provider_call_count: number;
      workflow_type: string;
      runtime_artifacts: PaperImplementationRuntimeArtifactEnvelope[];
      final_runtime_artifact: PaperImplementationRuntimeArtifactEnvelope | null;
      final_admission_record: PaperImplementationRuntimeAdmissionRecord | null;
      operational_telemetry: PaperImplementationRuntimeOperationalTelemetry;
    };
    assert.equal(body.status, 'passed');
    assert.equal(body.workflow_type, 'motive_decomposition');
    assert.equal(body.provider_call_count, 1);
    assert.equal(gateway.calls.length, 1);
    assert.equal(gateway.calls[0]?.executionContext.operation, PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_ROLE_SLOT_ID);
    assert.equal(gateway.calls[0]?.executionContext.feature, 'paper_implementation');
    assert.equal(body.runtime_artifacts.length, 2);
    assert.equal(
      body.runtime_artifacts.every((artifact) => artifact.slot_id === PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_SLOT_ID),
      true,
    );
    assert.equal(
      (body.final_runtime_artifact?.artifact_payload.draft_assertion_candidates as unknown[] | undefined)?.length,
      1,
    );
    assert.equal(body.final_runtime_artifact?.artifact_payload.decomposition_result_status, 'candidates_proposed');
    assert.equal(body.final_runtime_artifact?.artifact_payload.no_domain_gate_request, true);
    assert.equal(body.final_runtime_artifact?.artifact_payload.no_queue_side_effect, true);
    assert.equal(body.final_runtime_artifact?.artifact_payload.no_motive_write_side_effect, true);
    assert.equal(body.final_runtime_artifact?.artifact_payload.no_motive_evolution_side_effect, true);
    assert.equal(body.final_runtime_artifact?.artifact_payload.no_board_write_side_effect, true);
    assert.equal(body.final_runtime_artifact?.artifact_payload.no_evidence_binding_side_effect, true);
    assert.equal(body.final_runtime_artifact?.artifact_payload.no_trace_repair_queue_side_effect, true);
    assert.equal('assertion_id' in (body.final_runtime_artifact?.artifact_payload ?? {}), false);
    assert.equal('candidate_assertion_ref' in (body.final_runtime_artifact?.artifact_payload ?? {}), false);
    assert.equal('create_motive_assertion_input' in (body.final_runtime_artifact?.artifact_payload ?? {}), false);
    assert.equal('motive_assertion_create_request' in (body.final_runtime_artifact?.artifact_payload ?? {}), false);
    assert.equal('core_motive_version_patch' in (body.final_runtime_artifact?.artifact_payload ?? {}), false);
    assert.equal('motive_evolution_decision_request' in (body.final_runtime_artifact?.artifact_payload ?? {}), false);
    assert.equal('domain_gate_request' in (body.final_runtime_artifact?.artifact_payload ?? {}), false);
    assert.equal('queue_action' in (body.final_runtime_artifact?.artifact_payload ?? {}), false);
    assert.equal(body.final_admission_record?.admission_status, 'admitted');
    assert.equal(body.operational_telemetry.provider_call_count_consistent, true);

    assert.ok(body.final_runtime_artifact);
    const rejectedMaterialize = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-artifacts/${encodeURIComponent(
        body.final_runtime_artifact.runtime_artifact_id,
      )}/materialize-domain-gate`,
    });
    assertErrorCode(rejectedMaterialize, 409, 'GATE_CONSTRAINT_FAILED');
  } finally {
    await app.close();
  }
});

test('PaperImplementation motive decomposition runtime route rejects ref drift, provider fixtures, and authority request payloads', async () => {
  const inventedRefOutput = motiveDecompositionRoleOutput({
    cited_source_refs: [ref('source_locator', 'invented-source-locator-http-1')],
  });
  const inventedRefGateway = new StubMotiveDecompositionGateway([
    inventedRefOutput,
    inventedRefOutput,
  ]);
  await assertRuntimeRouteFailsClosed({
    appOptions: {
      paperImplementationRuntimeRepository: new InMemoryPaperImplementationRuntimeRepository(),
      paperImplementationMotiveDecompositionLlmGateway: inventedRefGateway,
    },
    url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/motive-decomposition-draft-assertion-candidates/run`,
    payload: {
      ...motiveDecompositionRunPayload(),
      run_id: 'motive-decomposition-http-ref-drift',
    },
    expectedSlotId: PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_SLOT_ID,
    expectedFailureCode: 'MOTIVE_DECOMPOSITION_REF_MISMATCH',
  });
  assert.equal(inventedRefGateway.calls.length, 2);

  const gateway = new StubMotiveDecompositionGateway();
  const app = buildApp({
    paperImplementationRuntimeRepository: new InMemoryPaperImplementationRuntimeRepository(),
    paperImplementationMotiveDecompositionLlmGateway: gateway,
  });
  try {
    const authorityRejected = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/motive-decomposition-draft-assertion-candidates/run`,
      payload: {
        ...motiveDecompositionRunPayload(),
        create_motive_assertion_input: { must_not_exist: true },
      },
    });
    assert.equal(authorityRejected.statusCode, 400);
    assert.match(authorityRejected.body, /create_motive_assertion_input/);

    const productFixtureRejected = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/motive-decomposition-draft-assertion-candidates/run`,
      payload: {
        ...motiveDecompositionRunPayload(),
        execution_mode: 'mocked_llm',
        model_option_id: null,
        mocked_role_outputs: {
          [PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_ROLE_SLOT_ID]: motiveDecompositionRoleOutput(),
        },
      },
    });
    assert.equal(productFixtureRejected.statusCode, 400);
    assert.match(productFixtureRejected.body, /provider_llm/);

    const modelOptionRejected = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/motive-decomposition-draft-assertion-candidates/run`,
      payload: {
        ...motiveDecompositionRunPayload(),
        model_option_id: providerModelOptionId(PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_PROFILE_ID, 'openai'),
      },
    });
    assert.equal(modelOptionRejected.statusCode, 400);
    assert.match(modelOptionRejected.body, /model_option_id must be defined by runtime slot profile/);
    assert.equal(gateway.calls.length, 0);
  } finally {
    await app.close();
  }
});

test('PaperImplementation motive evolution runtime route runs controlled two-role decision support without motive, portfolio, board, queue, or Domain Gate writes', async () => {
  const runtimeRepository = new InMemoryPaperImplementationRuntimeRepository();
  const gateway = new StubMotiveEvolutionGateway();
  const app = buildApp({
    paperImplementationRuntimeRepository: runtimeRepository,
    paperImplementationMotiveEvolutionLlmGateway: gateway,
  });
  try {
    const response = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/motive-evolution-decision-support/run`,
      payload: {
        ...motiveEvolutionRunPayload(),
        model_option_id: null,
      },
    });
    assert.equal(response.statusCode, 201);
    const body = response.json() as {
      status: string;
      provider_call_count: number;
      workflow_type: string;
      runtime_artifacts: PaperImplementationRuntimeArtifactEnvelope[];
      final_runtime_artifact: PaperImplementationRuntimeArtifactEnvelope | null;
      final_admission_record: PaperImplementationRuntimeAdmissionRecord | null;
      operational_telemetry: PaperImplementationRuntimeOperationalTelemetry;
    };
    assert.equal(body.status, 'passed');
    assert.equal(body.workflow_type, 'motive_evolution');
    assert.equal(body.provider_call_count, 2);
    assert.equal(gateway.calls.length, 2);
    assert.equal(gateway.calls[0]?.executionContext.operation, PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_OPTION_DESIGNER_ROLE_SLOT_ID);
    assert.equal(gateway.calls[1]?.executionContext.operation, PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_RISK_CHALLENGER_ROLE_SLOT_ID);
    assert.equal(gateway.calls[0]?.executionContext.feature, 'paper_implementation');
    assert.equal(gateway.calls[0]?.model.providerId, 'openai');
    assert.equal(body.runtime_artifacts.length, 3);
    assert.equal(
      body.runtime_artifacts.every((artifact) => artifact.slot_id === PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_SLOT_ID),
      true,
    );
    assert.equal(
      body.final_runtime_artifact?.model_option_id,
      providerModelOptionId(PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_PROFILE_ID, 'openai'),
    );
    assert.equal(
      Object.keys(
        (body.final_runtime_artifact?.artifact_payload.decision_options as Record<string, unknown> | undefined) ?? {},
      ).length,
      1,
    );
    assert.equal(body.final_runtime_artifact?.artifact_payload.support_result_status, 'options_proposed');
    assert.equal(body.final_runtime_artifact?.artifact_payload.no_domain_gate_request, true);
    assert.equal(body.final_runtime_artifact?.artifact_payload.no_queue_side_effect, true);
    assert.equal(body.final_runtime_artifact?.artifact_payload.no_motive_write_side_effect, true);
    assert.equal(body.final_runtime_artifact?.artifact_payload.no_motive_evolution_side_effect, true);
    assert.equal(body.final_runtime_artifact?.artifact_payload.no_portfolio_mutation_side_effect, true);
    assert.equal(body.final_runtime_artifact?.artifact_payload.no_board_write_side_effect, true);
    assert.equal(body.final_runtime_artifact?.artifact_payload.no_evidence_binding_side_effect, true);
    assert.equal(body.final_runtime_artifact?.artifact_payload.no_trace_repair_queue_side_effect, true);
    assert.equal('motive_evolution_decision_request' in (body.final_runtime_artifact?.artifact_payload ?? {}), false);
    assert.equal('ApplyMotivePortfolioDecisionRequest' in (body.final_runtime_artifact?.artifact_payload ?? {}), false);
    assert.equal('core_motive_version_patch' in (body.final_runtime_artifact?.artifact_payload ?? {}), false);
    assert.equal('queue_action' in (body.final_runtime_artifact?.artifact_payload ?? {}), false);
    assert.equal('domain_gate_request' in (body.final_runtime_artifact?.artifact_payload ?? {}), false);
    assert.equal(body.final_admission_record?.admission_status, 'admitted');
    assert.equal(body.operational_telemetry.provider_call_count_consistent, true);

    assert.ok(body.final_runtime_artifact);
    const rejectedMaterialize = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-artifacts/${encodeURIComponent(
        body.final_runtime_artifact.runtime_artifact_id,
      )}/materialize-domain-gate`,
    });
    assertErrorCode(rejectedMaterialize, 409, 'GATE_CONSTRAINT_FAILED');

    const finalArtifacts = await app.inject({
      method: 'GET',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-artifacts?slot_id=${encodeURIComponent(
        PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_SLOT_ID,
      )}&artifact_scope=final`,
    });
    assert.equal(finalArtifacts.statusCode, 200);
    assert.equal((finalArtifacts.json() as { items: unknown[] }).items.length, 1);
  } finally {
    await app.close();
  }
});

test('PaperImplementation motive evolution runtime route rejects ref drift, provider fixtures, and authority request payloads', async () => {
  const inventedRefOutput = motiveEvolutionDesignerRoleOutput({
    designed_options: motiveEvolutionDesignedOptionsByKey('evolution-option-http-1', {
      supporting_refs: [ref('core_motive', 'invented-core-motive-http-1')],
    }),
  });
  const inventedRefGateway = new StubMotiveEvolutionGateway([
    inventedRefOutput,
    inventedRefOutput,
  ]);
  await assertRuntimeRouteFailsClosed({
    appOptions: {
      paperImplementationRuntimeRepository: new InMemoryPaperImplementationRuntimeRepository(),
      paperImplementationMotiveEvolutionLlmGateway: inventedRefGateway,
    },
    url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/motive-evolution-decision-support/run`,
    payload: {
      ...motiveEvolutionRunPayload(),
      run_id: 'motive-evolution-http-ref-drift',
    },
    expectedSlotId: PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_SLOT_ID,
    expectedFailureCode: 'MOTIVE_EVOLUTION_REF_MISMATCH',
  });
  assert.equal(inventedRefGateway.calls.length, 2);

  const gateway = new StubMotiveEvolutionGateway();
  const app = buildApp({
    paperImplementationRuntimeRepository: new InMemoryPaperImplementationRuntimeRepository(),
    paperImplementationMotiveEvolutionLlmGateway: gateway,
  });
  try {
    const authorityRejected = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/motive-evolution-decision-support/run`,
      payload: {
        ...motiveEvolutionRunPayload(),
        motive_evolution_decision_request: { must_not_exist: true },
      },
    });
    assert.equal(authorityRejected.statusCode, 400);
    assert.match(authorityRejected.body, /motive_evolution/);

    const productFixtureRejected = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/motive-evolution-decision-support/run`,
      payload: {
        ...motiveEvolutionRunPayload(),
        execution_mode: 'mocked_llm',
        model_option_id: null,
        mocked_role_outputs: motiveEvolutionFixtureRoleOutputs(),
      },
    });
    assert.equal(productFixtureRejected.statusCode, 400);
    assert.match(productFixtureRejected.body, /provider_llm/);

    const modelOptionRejected = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/motive-evolution-decision-support/run`,
      payload: {
        ...motiveEvolutionRunPayload(),
        model_option_id: providerModelOptionId(PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_PROFILE_ID, 'openai'),
      },
    });
    assert.equal(modelOptionRejected.statusCode, 400);
    assert.match(modelOptionRejected.body, /model_option_id must be defined by runtime slot profile/);
    assert.equal(gateway.calls.length, 0);
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

test('PaperImplementation Domain Gate rejects support-only runtime final artifacts', async () => {
  const runtimeRepository = new InMemoryPaperImplementationRuntimeRepository();
  const lineage = await seedHttpValidationLineage(runtimeRepository);
  const app = buildApp({
    paperImplementationRuntimeRepository: runtimeRepository,
    paperImplementationTraceIntegrityDebateLlmGateway: new StubTraceIntegrityGateway(),
    paperImplementationRoutePlanningLlmGateway: new StubRoutePlanningGateway(),
    paperImplementationValidationCyclePlanningLlmGateway: new StubValidationCyclePlanningGateway([
      validationCyclePlanningRoleOutput({}, lineage),
    ]),
    paperImplementationFeasibilityPlanningLlmGateway: new StubFeasibilityPlanningGateway([
      feasibilityPlanningRoleOutput({}, lineage),
    ]),
    paperImplementationCrossBoardSynthesisLlmGateway: new StubCrossBoardSynthesisGateway(),
    paperImplementationEvidenceBoardCurationLlmGateway: new StubEvidenceBoardCurationGateway(),
    paperImplementationMotiveDecompositionLlmGateway: new StubMotiveDecompositionGateway(),
    paperImplementationMotiveEvolutionLlmGateway: new StubMotiveEvolutionGateway(),
    paperImplementationExperimentPlanningLlmGateway: new StubExperimentPlanningGateway(),
  });
  try {
    for (const scenario of supportOnlyDomainGateRejectionScenarios(lineage)) {
      const run = await app.inject({
        method: 'POST',
        url: scenario.runUrl,
        payload: scenario.payload,
      });
      assert.equal(run.statusCode, 201, `${scenario.key} runtime route should pass`);
      const body = run.json() as RuntimeRunWithFinalArtifactBody;
      assert.equal(body.status, 'passed', `${scenario.key} runtime status`);
      assert.ok(body.final_runtime_artifact, `${scenario.key} should emit an admitted final artifact`);
      assert.equal(body.final_runtime_artifact.slot_id, scenario.expectedSlotId);
      assert.equal(body.final_runtime_artifact.artifact_scope, 'final');
      assert.equal(body.final_runtime_artifact.runtime_status, 'passed');
      assert.equal(body.final_admission_record?.admission_status, 'admitted');

      const rejectedMaterialize = await app.inject({
        method: 'POST',
        url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-artifacts/${encodeURIComponent(
          body.final_runtime_artifact.runtime_artifact_id,
        )}/materialize-domain-gate`,
      });
      assertErrorCode(rejectedMaterialize, 409, 'GATE_CONSTRAINT_FAILED');
      assert.match(rejectedMaterialize.body, /does not have a Domain Gate materializer/);
    }
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

  const routeArchitectureGateway = new FailingProviderGateway();
  await assertRuntimeRouteFailsClosed({
    appOptions: {
      paperImplementationRuntimeRepository: new InMemoryPaperImplementationRuntimeRepository(),
      paperImplementationRoutePlanningLlmGateway: routeArchitectureGateway,
    },
    url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/route-architecture-route-candidates/run`,
    payload: routePlanningRunPayload('architecture'),
    expectedSlotId: PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_SLOT_ID,
    expectedFailureCode: 'TimeoutError',
  });
  assert.equal(routeArchitectureGateway.calls.length, 2);

  const routeSkepticGateway = new FailingProviderGateway();
  const routeSkepticRepository = new InMemoryPaperImplementationRuntimeRepository();
  const routeSkepticLineage = await seedHttpRouteLineage(routeSkepticRepository);
  await assertRuntimeRouteFailsClosed({
    appOptions: {
      paperImplementationRuntimeRepository: routeSkepticRepository,
      paperImplementationRoutePlanningLlmGateway: routeSkepticGateway,
    },
    url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/route-skeptic-review-route-risk-critique/run`,
    payload: routePlanningRunPayload('skeptic', 'openai', {
      ref: routeSkepticLineage.routeProposalRef,
      hash: routeSkepticLineage.routeProposalHash,
    }),
    expectedSlotId: PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_SLOT_ID,
    expectedFailureCode: 'TimeoutError',
  });
  assert.equal(routeSkepticGateway.calls.length, 2);

  const validationCyclePlanningGateway = new FailingProviderGateway();
  const validationCyclePlanningRepository = new InMemoryPaperImplementationRuntimeRepository();
  const validationCyclePlanningLineage = await seedHttpRouteLineage(validationCyclePlanningRepository);
  await assertRuntimeRouteFailsClosed({
    appOptions: {
      paperImplementationRuntimeRepository: validationCyclePlanningRepository,
      paperImplementationValidationCyclePlanningLlmGateway: validationCyclePlanningGateway,
    },
    url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/validation-cycle-planning-cycle-candidates/run`,
    payload: validationCyclePlanningRunPayload('openai', validationCyclePlanningLineage),
    expectedSlotId: PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_SLOT_ID,
    expectedFailureCode: 'TimeoutError',
  });
  assert.equal(validationCyclePlanningGateway.calls.length, 2);

  const feasibilityPlanningGateway = new FailingProviderGateway();
  const feasibilityPlanningRepository = new InMemoryPaperImplementationRuntimeRepository();
  const feasibilityPlanningLineage = await seedHttpValidationLineage(feasibilityPlanningRepository);
  await assertRuntimeRouteFailsClosed({
    appOptions: {
      paperImplementationRuntimeRepository: feasibilityPlanningRepository,
      paperImplementationFeasibilityPlanningLlmGateway: feasibilityPlanningGateway,
    },
    url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/feasibility-planning-probe-plan-candidates/run`,
    payload: feasibilityPlanningRunPayload('openai', feasibilityPlanningLineage),
    expectedSlotId: PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_SLOT_ID,
    expectedFailureCode: 'TimeoutError',
  });
  assert.equal(feasibilityPlanningGateway.calls.length, 2);

  const crossBoardSynthesisGateway = new FailingProviderGateway();
  await assertRuntimeRouteFailsClosed({
    appOptions: {
      paperImplementationRuntimeRepository: new InMemoryPaperImplementationRuntimeRepository(),
      paperImplementationCrossBoardSynthesisLlmGateway: crossBoardSynthesisGateway,
    },
    url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/cross-board-synthesis-merge-split-reuse-scenarios/run`,
    payload: crossBoardSynthesisRunPayload(),
    expectedSlotId: PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_SLOT_ID,
    expectedFailureCode: 'TimeoutError',
  });
  assert.equal(crossBoardSynthesisGateway.calls.length, 2);

  const evidenceBoardCurationGateway = new FailingProviderGateway();
  await assertRuntimeRouteFailsClosed({
    appOptions: {
      paperImplementationRuntimeRepository: new InMemoryPaperImplementationRuntimeRepository(),
      paperImplementationEvidenceBoardCurationLlmGateway: evidenceBoardCurationGateway,
    },
    url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/evidence-board-curation-binding-gap-candidates/run`,
    payload: evidenceBoardCurationRunPayload(),
    expectedSlotId: PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_SLOT_ID,
    expectedFailureCode: 'TimeoutError',
  });
  assert.equal(evidenceBoardCurationGateway.calls.length, 2);

  const motiveDecompositionGateway = new FailingProviderGateway();
  await assertRuntimeRouteFailsClosed({
    appOptions: {
      paperImplementationRuntimeRepository: new InMemoryPaperImplementationRuntimeRepository(),
      paperImplementationMotiveDecompositionLlmGateway: motiveDecompositionGateway,
    },
    url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/motive-decomposition-draft-assertion-candidates/run`,
    payload: motiveDecompositionRunPayload(),
    expectedSlotId: PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_SLOT_ID,
    expectedFailureCode: 'TimeoutError',
  });
  assert.equal(motiveDecompositionGateway.calls.length, 2);

  const motiveEvolutionGateway = new FailingProviderGateway();
  await assertRuntimeRouteFailsClosed({
    appOptions: {
      paperImplementationRuntimeRepository: new InMemoryPaperImplementationRuntimeRepository(),
      paperImplementationMotiveEvolutionLlmGateway: motiveEvolutionGateway,
    },
    url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/motive-evolution-decision-support/run`,
    payload: motiveEvolutionRunPayload(),
    expectedSlotId: PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_SLOT_ID,
    expectedFailureCode: 'TimeoutError',
  });
  assert.equal(motiveEvolutionGateway.calls.length, 2);

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
  'PaperImplementation route-architecture live provider canary uses the configured gateway',
  {
    skip: shouldRunLiveRoutePlanningCanary('architecture')
      ? false
      : 'set T114_ROUTE_ARCHITECTURE_PROVIDER_CANARY_LIVE=1, BACKEND_TEST_PRESERVE_REAL_ENV=1, provider id/key to run',
    timeout: 900_000,
  },
  async () => {
    const providerId = liveProviderId();
    const app = buildApp({
      paperImplementationRuntimeRepository: new InMemoryPaperImplementationRuntimeRepository(),
      paperImplementationRoutePlanningLlmGateway: liveProviderGateway(),
    });
    try {
      const response = await app.inject({
        method: 'POST',
        url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/route-architecture-route-candidates/run`,
        payload: routePlanningRunPayload('architecture', providerId),
      });

      assertSingleRoleProposalProviderCanaryResponse(response, {
        expectedSlotId: PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_SLOT_ID,
        requiredPayloadFlags: ['no_domain_gate_request', 'no_queue_side_effect'],
        forbiddenPayloadFields: ['technical_route_candidate_create_request'],
      });
    } finally {
      await app.close();
    }
  },
);

test(
  'PaperImplementation route-skeptic live provider canary uses the configured gateway',
  {
    skip: shouldRunLiveRoutePlanningCanary('skeptic')
      ? false
      : 'set T114_ROUTE_SKEPTIC_PROVIDER_CANARY_LIVE=1, BACKEND_TEST_PRESERVE_REAL_ENV=1, provider id/key to run',
    timeout: 900_000,
  },
  async () => {
    const providerId = liveProviderId();
    const runtimeRepository = new InMemoryPaperImplementationRuntimeRepository();
    const lineage = await seedHttpRouteLineage(runtimeRepository);
    const app = buildApp({
      paperImplementationRuntimeRepository: runtimeRepository,
      paperImplementationRoutePlanningLlmGateway: liveProviderGateway(),
    });
    try {
      const response = await app.inject({
        method: 'POST',
        url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/route-skeptic-review-route-risk-critique/run`,
        payload: routePlanningRunPayload('skeptic', providerId, {
          ref: lineage.routeProposalRef,
          hash: lineage.routeProposalHash,
        }),
      });

      assertSingleRoleProposalProviderCanaryResponse(response, {
        expectedSlotId: PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_SLOT_ID,
        requiredPayloadFlags: ['no_queue_side_effect'],
        forbiddenPayloadFields: ['technical_route_candidate_create_request'],
      });
    } finally {
      await app.close();
    }
  },
);

test(
  'PaperImplementation validation-cycle live provider canary uses the configured gateway',
  {
    skip: shouldRunLiveValidationCyclePlanningCanary()
      ? false
      : 'set T114_VALIDATION_CYCLE_PROVIDER_CANARY_LIVE=1, BACKEND_TEST_PRESERVE_REAL_ENV=1, provider id/key to run',
    timeout: 900_000,
  },
  async () => {
    const providerId = liveProviderId();
    const runtimeRepository = new InMemoryPaperImplementationRuntimeRepository();
    const lineage = await seedHttpRouteLineage(runtimeRepository);
    const app = buildApp({
      paperImplementationRuntimeRepository: runtimeRepository,
      paperImplementationValidationCyclePlanningLlmGateway: liveProviderGateway(),
    });
    try {
      const response = await app.inject({
        method: 'POST',
        url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/validation-cycle-planning-cycle-candidates/run`,
        payload: validationCyclePlanningRunPayload(providerId, lineage),
      });

      assertSingleRoleProposalProviderCanaryResponse(response, {
        expectedSlotId: PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_SLOT_ID,
        requiredPayloadFlags: [
          'no_domain_gate_request',
          'no_queue_side_effect',
          'no_validation_cycle_side_effect',
        ],
        forbiddenPayloadFields: ['validation_cycle_id', 'create_validation_cycle_draft_request'],
      });
    } finally {
      await app.close();
    }
  },
);

test(
  'PaperImplementation feasibility-planning live provider canary uses the configured gateway',
  {
    skip: shouldRunLiveFeasibilityPlanningCanary()
      ? false
      : 'set T114_FEASIBILITY_PLANNING_PROVIDER_CANARY_LIVE=1, BACKEND_TEST_PRESERVE_REAL_ENV=1, provider id/key to run',
    timeout: 900_000,
  },
  async () => {
    const providerId = liveProviderId();
    const runtimeRepository = new InMemoryPaperImplementationRuntimeRepository();
    const lineage = await seedHttpValidationLineage(runtimeRepository);
    const app = buildApp({
      paperImplementationRuntimeRepository: runtimeRepository,
      paperImplementationFeasibilityPlanningLlmGateway: liveProviderGateway(),
    });
    try {
      const response = await app.inject({
        method: 'POST',
        url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/feasibility-planning-probe-plan-candidates/run`,
        payload: feasibilityPlanningRunPayload(providerId, lineage),
      });

      assertSingleRoleProposalProviderCanaryResponse(response, {
        expectedSlotId: PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_SLOT_ID,
        requiredPayloadFlags: [
          'no_domain_gate_request',
          'no_queue_side_effect',
          'no_feasibility_probe_side_effect',
          'no_experiment_plan_light_side_effect',
          'no_validation_cycle_side_effect',
        ],
        forbiddenPayloadFields: [
          'feasibility_probe_id',
          'experiment_plan_light_id',
          'create_feasibility_probe_request',
          'create_experiment_plan_light_request',
        ],
      });
    } finally {
      await app.close();
    }
  },
);

test(
  'PaperImplementation cross-board-synthesis live provider canary uses the configured gateway',
  {
    skip: shouldRunLiveCrossBoardSynthesisCanary()
      ? false
      : 'set T114_CROSS_BOARD_SYNTHESIS_PROVIDER_CANARY_LIVE=1, BACKEND_TEST_PRESERVE_REAL_ENV=1, provider id/key to run',
    timeout: 900_000,
  },
  async () => {
    const providerId = liveProviderId();
    const app = buildApp({
      paperImplementationRuntimeRepository: new InMemoryPaperImplementationRuntimeRepository(),
      paperImplementationCrossBoardSynthesisLlmGateway: liveProviderGateway(),
    });
    try {
      const response = await app.inject({
        method: 'POST',
        url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/cross-board-synthesis-merge-split-reuse-scenarios/run`,
        payload: crossBoardSynthesisRunPayload(providerId),
      });

      assertSingleRoleProposalProviderCanaryResponse(response, {
        expectedSlotId: PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_SLOT_ID,
        requiredPayloadFlags: [
          'no_domain_gate_request',
          'no_queue_side_effect',
          'no_cross_board_review_side_effect',
          'no_evidence_transfer_binding_side_effect',
          'no_portfolio_mutation_side_effect',
          'no_motive_evolution_side_effect',
        ],
        forbiddenPayloadFields: [
          'cross_board_review_id',
          'create_cross_board_review_request',
          'evidence_transfer_binding_request',
          'motive_portfolio_decision_id',
        ],
      });
    } finally {
      await app.close();
    }
  },
);

test(
  'PaperImplementation evidence-board-curation live provider canary uses the configured gateway',
  {
    skip: shouldRunLiveEvidenceBoardCurationCanary()
      ? false
      : 'set T114_EVIDENCE_BOARD_CURATION_PROVIDER_CANARY_LIVE=1, BACKEND_TEST_PRESERVE_REAL_ENV=1, provider id/key to run',
    timeout: 900_000,
  },
  async () => {
    const providerId = liveProviderId();
    const app = buildApp({
      paperImplementationRuntimeRepository: new InMemoryPaperImplementationRuntimeRepository(),
      paperImplementationEvidenceBoardCurationLlmGateway: liveProviderGateway(),
    });
    try {
      const response = await app.inject({
        method: 'POST',
        url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/evidence-board-curation-binding-gap-candidates/run`,
        payload: evidenceBoardCurationRunPayload(providerId),
      });

      assertSingleRoleProposalProviderCanaryResponse(response, {
        expectedSlotId: PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_SLOT_ID,
        requiredPayloadFlags: [
          'no_domain_gate_request',
          'no_queue_side_effect',
          'no_board_write_side_effect',
          'no_evidence_binding_side_effect',
          'no_evidence_transfer_binding_side_effect',
          'no_citation_candidate_side_effect',
          'no_trace_repair_queue_side_effect',
        ],
        forbiddenPayloadFields: [
          'motive_evidence_board_version_id',
          'board_draft',
          'bindings',
          'create_evidence_binding_request',
          'citation_candidate_request',
          'trace_repair_queue_item',
        ],
      });
    } finally {
      await app.close();
    }
  },
);

test(
  'PaperImplementation motive-decomposition live provider canary uses the configured gateway',
  {
    skip: shouldRunLiveMotiveDecompositionCanary()
      ? false
      : 'set T114_MOTIVE_DECOMPOSITION_PROVIDER_CANARY_LIVE=1, BACKEND_TEST_PRESERVE_REAL_ENV=1, provider id/key to run',
    timeout: 900_000,
  },
  async () => {
    const providerId = liveProviderId();
    const app = buildApp({
      paperImplementationRuntimeRepository: new InMemoryPaperImplementationRuntimeRepository(),
      paperImplementationMotiveDecompositionLlmGateway: liveProviderGateway(),
    });
    try {
      const response = await app.inject({
        method: 'POST',
        url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/motive-decomposition-draft-assertion-candidates/run`,
        payload: motiveDecompositionRunPayload(providerId),
      });

      assertSingleRoleProposalProviderCanaryResponse(response, {
        expectedSlotId: PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_SLOT_ID,
        requiredPayloadFlags: [
          'no_domain_gate_request',
          'no_queue_side_effect',
          'no_motive_write_side_effect',
          'no_motive_evolution_side_effect',
          'no_board_write_side_effect',
          'no_evidence_binding_side_effect',
          'no_trace_repair_queue_side_effect',
        ],
        forbiddenPayloadFields: [
          'assertion_id',
          'candidate_assertion_ref',
          'create_motive_assertion_input',
          'motive_assertion_create_request',
          'core_motive_version_patch',
          'motive_evolution_decision_request',
        ],
      });
    } finally {
      await app.close();
    }
  },
);

test(
  'PaperImplementation motive-evolution live provider canary uses the configured gateway',
  {
    skip: shouldRunLiveMotiveEvolutionCanary()
      ? false
      : 'set T114_MOTIVE_EVOLUTION_PROVIDER_CANARY_LIVE=1, BACKEND_TEST_PRESERVE_REAL_ENV=1, provider id/key to run',
    timeout: 900_000,
  },
  async () => {
    const providerId = liveProviderId();
    const app = buildApp({
      paperImplementationRuntimeRepository: new InMemoryPaperImplementationRuntimeRepository(),
      paperImplementationMotiveEvolutionLlmGateway: liveProviderGateway(),
    });
    try {
      const response = await app.inject({
        method: 'POST',
        url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/motive-evolution-decision-support/run`,
        payload: motiveEvolutionRunPayload(providerId),
      });

      assertMotiveEvolutionProviderCanaryResponse(response);
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

      await assertLiveProviderRuntimeRouteFailsClosed({
        appOptions: {
          paperImplementationRuntimeRepository: new InMemoryPaperImplementationRuntimeRepository(),
          paperImplementationRoutePlanningLlmGateway: liveFailClosedGateway(),
        },
        url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/route-architecture-route-candidates/run`,
        payload: {
          ...routePlanningRunPayload('architecture', providerId),
          run_id: `route-architecture-http-live-fail-closed-${Date.now()}`,
        },
        expectedSlotId: PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_SLOT_ID,
      });

      const liveSkepticRepository = new InMemoryPaperImplementationRuntimeRepository();
      const liveSkepticLineage = await seedHttpRouteLineage(liveSkepticRepository);
      await assertLiveProviderRuntimeRouteFailsClosed({
        appOptions: {
          paperImplementationRuntimeRepository: liveSkepticRepository,
          paperImplementationRoutePlanningLlmGateway: liveFailClosedGateway(),
        },
        url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/route-skeptic-review-route-risk-critique/run`,
        payload: {
          ...routePlanningRunPayload('skeptic', providerId, {
            ref: liveSkepticLineage.routeProposalRef,
            hash: liveSkepticLineage.routeProposalHash,
          }),
          run_id: `route-skeptic-http-live-fail-closed-${Date.now()}`,
        },
        expectedSlotId: PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_SLOT_ID,
      });

      const liveCycleRepository = new InMemoryPaperImplementationRuntimeRepository();
      const liveCycleLineage = await seedHttpRouteLineage(liveCycleRepository);
      await assertLiveProviderRuntimeRouteFailsClosed({
        appOptions: {
          paperImplementationRuntimeRepository: liveCycleRepository,
          paperImplementationValidationCyclePlanningLlmGateway: liveFailClosedGateway(),
        },
        url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/validation-cycle-planning-cycle-candidates/run`,
        payload: {
          ...validationCyclePlanningRunPayload(providerId, liveCycleLineage),
          run_id: `validation-cycle-planning-http-live-fail-closed-${Date.now()}`,
        },
        expectedSlotId: PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_SLOT_ID,
      });

      const liveFeasibilityRepository = new InMemoryPaperImplementationRuntimeRepository();
      const liveFeasibilityLineage = await seedHttpValidationLineage(liveFeasibilityRepository);
      await assertLiveProviderRuntimeRouteFailsClosed({
        appOptions: {
          paperImplementationRuntimeRepository: liveFeasibilityRepository,
          paperImplementationFeasibilityPlanningLlmGateway: liveFailClosedGateway(),
        },
        url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/feasibility-planning-probe-plan-candidates/run`,
        payload: {
          ...feasibilityPlanningRunPayload(providerId, liveFeasibilityLineage),
          run_id: `feasibility-planning-http-live-fail-closed-${Date.now()}`,
        },
        expectedSlotId: PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_SLOT_ID,
      });

      await assertLiveProviderRuntimeRouteFailsClosed({
        appOptions: {
          paperImplementationRuntimeRepository: new InMemoryPaperImplementationRuntimeRepository(),
          paperImplementationCrossBoardSynthesisLlmGateway: liveFailClosedGateway(),
        },
        url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/cross-board-synthesis-merge-split-reuse-scenarios/run`,
        payload: {
          ...crossBoardSynthesisRunPayload(providerId),
          run_id: `cross-board-synthesis-http-live-fail-closed-${Date.now()}`,
        },
        expectedSlotId: PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_SLOT_ID,
      });

      await assertLiveProviderRuntimeRouteFailsClosed({
        appOptions: {
          paperImplementationRuntimeRepository: new InMemoryPaperImplementationRuntimeRepository(),
          paperImplementationEvidenceBoardCurationLlmGateway: liveFailClosedGateway(),
        },
        url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/evidence-board-curation-binding-gap-candidates/run`,
        payload: {
          ...evidenceBoardCurationRunPayload(providerId),
          run_id: `evidence-board-curation-http-live-fail-closed-${Date.now()}`,
        },
        expectedSlotId: PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_SLOT_ID,
      });

      await assertLiveProviderRuntimeRouteFailsClosed({
        appOptions: {
          paperImplementationRuntimeRepository: new InMemoryPaperImplementationRuntimeRepository(),
          paperImplementationMotiveDecompositionLlmGateway: liveFailClosedGateway(),
        },
        url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/motive-decomposition-draft-assertion-candidates/run`,
        payload: {
          ...motiveDecompositionRunPayload(providerId),
          run_id: `motive-decomposition-http-live-fail-closed-${Date.now()}`,
        },
        expectedSlotId: PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_SLOT_ID,
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

type RuntimeRunWithFinalArtifactBody = {
  status: string;
  final_runtime_artifact: PaperImplementationRuntimeArtifactEnvelope | null;
  final_admission_record: PaperImplementationRuntimeAdmissionRecord | null;
};

type SupportOnlyDomainGateRejectionScenario = {
  key: string;
  expectedSlotId: string;
  runUrl: string;
  payload: Record<string, unknown>;
};

function runtimeSlotRunUrl(routeSlug: string): string {
  return `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/${routeSlug}/run`;
}

function supportOnlyDomainGateRejectionScenarios(
  lineage: PaperImplementationSeededValidationLineage,
): SupportOnlyDomainGateRejectionScenario[] {
  return [
    {
      key: 'trace_integrity_review.boundary_debate',
      expectedSlotId: PAPER_IMPLEMENTATION_TRACE_INTEGRITY_BOUNDARY_DEBATE_SLOT_ID,
      runUrl: runtimeSlotRunUrl('trace-integrity-boundary-debate'),
      payload: traceIntegrityRunPayload(),
    },
    {
      key: 'route_architecture.route_candidates',
      expectedSlotId: PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_SLOT_ID,
      runUrl: runtimeSlotRunUrl('route-architecture-route-candidates'),
      payload: routePlanningRunPayload('architecture'),
    },
    {
      key: 'route_skeptic_review.route_risk_critique',
      expectedSlotId: PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_SLOT_ID,
      runUrl: runtimeSlotRunUrl('route-skeptic-review-route-risk-critique'),
      payload: routePlanningRunPayload('skeptic', 'openai', {
        ref: lineage.routeProposalRef,
        hash: lineage.routeProposalHash,
      }),
    },
    {
      key: 'validation_cycle_planning.cycle_candidates',
      expectedSlotId: PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_SLOT_ID,
      runUrl: runtimeSlotRunUrl('validation-cycle-planning-cycle-candidates'),
      payload: validationCyclePlanningRunPayload('openai', lineage),
    },
    {
      key: 'feasibility_planning.probe_plan_candidates',
      expectedSlotId: PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_SLOT_ID,
      runUrl: runtimeSlotRunUrl('feasibility-planning-probe-plan-candidates'),
      payload: feasibilityPlanningRunPayload('openai', lineage),
    },
    {
      key: 'cross_board_synthesis.merge_split_reuse_scenarios',
      expectedSlotId: PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_SLOT_ID,
      runUrl: runtimeSlotRunUrl('cross-board-synthesis-merge-split-reuse-scenarios'),
      payload: crossBoardSynthesisRunPayload(),
    },
    {
      key: 'evidence_board_curation.binding_gap_candidates',
      expectedSlotId: PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_SLOT_ID,
      runUrl: runtimeSlotRunUrl('evidence-board-curation-binding-gap-candidates'),
      payload: evidenceBoardCurationRunPayload(),
    },
    {
      key: 'motive_decomposition.draft_assertion_candidates',
      expectedSlotId: PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_SLOT_ID,
      runUrl: runtimeSlotRunUrl('motive-decomposition-draft-assertion-candidates'),
      payload: motiveDecompositionRunPayload(),
    },
    {
      key: 'motive_evolution.evolution_decision_support',
      expectedSlotId: PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_SLOT_ID,
      runUrl: runtimeSlotRunUrl('motive-evolution-decision-support'),
      payload: motiveEvolutionRunPayload(),
    },
    {
      key: 'experiment_design.work_order_draft',
      expectedSlotId: PAPER_IMPLEMENTATION_EXPERIMENT_DESIGN_SLOT_ID,
      runUrl: runtimeSlotRunUrl('experiment-design-work-order-draft'),
      payload: experimentPlanningRunPayload('design'),
    },
    {
      key: 'experiment_critique.plan_critique',
      expectedSlotId: PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_SLOT_ID,
      runUrl: runtimeSlotRunUrl('experiment-critique-plan-critique'),
      payload: experimentPlanningRunPayload('critique'),
    },
  ];
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

function shouldRunLiveRoutePlanningCanary(kind: 'architecture' | 'skeptic'): boolean {
  return shouldRunLiveProviderCanary(
    kind === 'architecture'
      ? 'T114_ROUTE_ARCHITECTURE_PROVIDER_CANARY_LIVE'
      : 'T114_ROUTE_SKEPTIC_PROVIDER_CANARY_LIVE',
  );
}

function shouldRunLiveValidationCyclePlanningCanary(): boolean {
  return shouldRunLiveProviderCanary('T114_VALIDATION_CYCLE_PROVIDER_CANARY_LIVE');
}

function shouldRunLiveFeasibilityPlanningCanary(): boolean {
  return shouldRunLiveProviderCanary('T114_FEASIBILITY_PLANNING_PROVIDER_CANARY_LIVE');
}

function shouldRunLiveCrossBoardSynthesisCanary(): boolean {
  return shouldRunLiveProviderCanary('T114_CROSS_BOARD_SYNTHESIS_PROVIDER_CANARY_LIVE');
}

function shouldRunLiveEvidenceBoardCurationCanary(): boolean {
  return shouldRunLiveProviderCanary('T114_EVIDENCE_BOARD_CURATION_PROVIDER_CANARY_LIVE');
}

function shouldRunLiveMotiveDecompositionCanary(): boolean {
  return shouldRunLiveProviderCanary('T114_MOTIVE_DECOMPOSITION_PROVIDER_CANARY_LIVE');
}

function shouldRunLiveMotiveEvolutionCanary(): boolean {
  return shouldRunLiveProviderCanary('T114_MOTIVE_EVOLUTION_PROVIDER_CANARY_LIVE');
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

function liveProviderGateway(): BackendLlmGateway {
  return new BackendLlmGateway({
    defaultTimeoutMs: 300_000,
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
  // S3-α2 deepened contract: each role carries its structured section.
  const structured: Partial<PaperImplementationTraceIntegrityRoleOutput> =
    roleSlotId === 'trace_integrity_review.support_mapper_map'
      ? {
        per_statement_support_map: [{
          statement_ref: ref('reviewed_statement', 'statement-http-1'),
          support_kind: 'direct',
          cited_refs: [ref('run_evidence_unit', 'run-evidence-unit-http-1')],
        }],
      }
      : roleSlotId === 'trace_integrity_review.skeptic_challenge'
        ? { challenge_findings: [] }
        : roleSlotId === 'trace_integrity_review.support_mapper_reconcile'
          ? { finding_dispositions: [] }
          : roleSlotId === 'trace_integrity_review.arbiter_final'
            ? {
              coverage: {
                statement_refs: [ref('reviewed_statement', 'statement-http-1')],
                finding_ids: [],
              },
            }
            : {};
  return {
    role_slot_id: roleSlotId as PaperImplementationTraceIntegrityRoleOutput['role_slot_id'],
    role_status: 'passed',
    summary: `HTTP provider canary role output for ${roleSlotId}.`,
    reviewed_statement_refs: [ref('reviewed_statement', 'statement-http-1')],
    cited_source_refs: [ref('run_evidence_unit', 'run-evidence-unit-http-1')],
    blocker_codes: [],
    warning_codes: [],
    ...structured,
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

function routePlanningRunPayload(
  kind: 'architecture' | 'skeptic',
  providerId: 'openai' | 'dashscope' = 'openai',
  admittedRouteProposal?: { ref: TopicSelectionFunctionalRef; hash: string },
) {
  const architecture = kind === 'architecture';
  const profileId = architecture
    ? PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_PROFILE_ID
    : PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_PROFILE_ID;
  return {
    run_id: architecture ? 'route-architecture-http-run-1' : 'route-skeptic-http-run-1',
    run_mode: 'product',
    execution_mode: 'provider_llm',
    model_profile_id: profileId,
    model_option_id: providerModelOptionId(profileId, providerId),
    target_ref: ref('implementation_input_snapshot', 'input-snapshot-http-1'),
    target_version_id: 'input-snapshot-http-1@v1',
    input_snapshot_ref: ref('implementation_input_snapshot', 'input-snapshot-http-1'),
    input_snapshot_hash: hash('input-snapshot-http-1'),
    source_refs: [
      ref('implementation_input_snapshot', 'input-snapshot-http-1'),
      ref('trace_manifest', 'trace-manifest-route-http-1'),
      ref('literature_evidence', 'literature-evidence-route-http-1'),
    ],
    source_hashes: [
      hash('input-snapshot-http-1'),
      hash('trace-manifest-route-http-1'),
      hash('literature-evidence-route-http-1'),
    ],
    admitted_route_proposal_artifact_ref: architecture
      ? null
      : admittedRouteProposal?.ref ?? ref('route_architecture_runtime_artifact', 'route-architecture-final-http-1'),
    admitted_route_proposal_artifact_hash: architecture
      ? null
      : admittedRouteProposal?.hash ?? hash('route-architecture-final-http-1'),
    reviewed_candidate_keys: architecture ? [] : ['exploratory-route-candidate'],
    secondary_route_candidate_refs: architecture
      ? []
      : [ref('technical_route_candidate', 'technical-route-secondary-http-1')],
    preflight_blocker_codes: [],
  };
}

function validationCyclePlanningRunPayload(
  providerId: 'openai' | 'dashscope' = 'openai',
  lineage?: PaperImplementationSeededRouteLineage,
) {
  return {
    run_id: 'validation-cycle-planning-http-run-1',
    run_mode: 'product',
    execution_mode: 'provider_llm',
    model_profile_id: PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_PROFILE_ID,
    model_option_id: providerModelOptionId(PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_PROFILE_ID, providerId),
    target_ref: ref('technical_route_candidate', 'technical-route-candidate-http-1'),
    target_version_id: 'technical-route-candidate-http-1@v1',
    input_snapshot_ref: ref('implementation_input_snapshot', 'input-snapshot-http-1'),
    input_snapshot_hash: hash('input-snapshot-http-1'),
    source_refs: [
      ref('route_architecture_runtime_artifact', 'route-architecture-final-http-1'),
      ref('route_skeptic_review_runtime_artifact', 'route-skeptic-final-http-1'),
      ref('trace_manifest', 'trace-manifest-route-http-1'),
    ],
    source_hashes: [
      hash('route-architecture-final-http-1'),
      hash('route-skeptic-final-http-1'),
      hash('trace-manifest-route-http-1'),
    ],
    admitted_route_proposal_artifact_ref: lineage?.routeProposalRef
      ?? ref('route_architecture_runtime_artifact', 'route-architecture-final-http-1'),
    admitted_route_proposal_artifact_hash: lineage?.routeProposalHash ?? hash('route-architecture-final-http-1'),
    admitted_route_skeptic_artifact_ref: lineage?.routeSkepticRef
      ?? ref('route_skeptic_review_runtime_artifact', 'route-skeptic-final-http-1'),
    admitted_route_skeptic_artifact_hash: lineage?.routeSkepticHash ?? hash('route-skeptic-final-http-1'),
    reviewed_candidate_keys: ['exploratory-route-candidate'],
    secondary_route_candidate_refs: [ref('technical_route_candidate', 'technical-route-secondary-http-1')],
    preflight_blocker_codes: [],
  };
}

function feasibilityPlanningRunPayload(
  providerId: 'openai' | 'dashscope' = 'openai',
  lineage?: PaperImplementationSeededValidationLineage,
) {
  return {
    run_id: 'feasibility-planning-http-run-1',
    run_mode: 'product',
    execution_mode: 'provider_llm',
    model_profile_id: PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_PROFILE_ID,
    model_option_id: providerModelOptionId(PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_PROFILE_ID, providerId),
    target_ref: ref('validation_cycle_candidate', 'validation-cycle-candidate-http-1'),
    target_version_id: 'validation-cycle-candidate-http-1@v1',
    input_snapshot_ref: ref('implementation_input_snapshot', 'input-snapshot-http-1'),
    input_snapshot_hash: hash('input-snapshot-http-1'),
    source_refs: [
      ref('validation_cycle_planning_runtime_artifact', 'validation-cycle-final-http-1'),
      ref('route_architecture_runtime_artifact', 'route-architecture-final-http-1'),
      ref('route_skeptic_review_runtime_artifact', 'route-skeptic-final-http-1'),
      ref('trace_manifest', 'trace-manifest-feasibility-http-1'),
    ],
    source_hashes: [
      hash('validation-cycle-final-http-1'),
      hash('route-architecture-final-http-1'),
      hash('route-skeptic-final-http-1'),
      hash('trace-manifest-feasibility-http-1'),
    ],
    admitted_validation_cycle_artifact_ref: lineage?.validationCycleRef
      ?? ref('validation_cycle_planning_runtime_artifact', 'validation-cycle-final-http-1'),
    admitted_validation_cycle_artifact_hash: lineage?.validationCycleHash ?? hash('validation-cycle-final-http-1'),
    admitted_route_proposal_artifact_ref: lineage?.routeProposalRef
      ?? ref('route_architecture_runtime_artifact', 'route-architecture-final-http-1'),
    admitted_route_proposal_artifact_hash: lineage?.routeProposalHash ?? hash('route-architecture-final-http-1'),
    admitted_route_skeptic_artifact_ref: lineage?.routeSkepticRef
      ?? ref('route_skeptic_review_runtime_artifact', 'route-skeptic-final-http-1'),
    admitted_route_skeptic_artifact_hash: lineage?.routeSkepticHash ?? hash('route-skeptic-final-http-1'),
    reviewed_cycle_candidate_keys: ['exploratory-cycle-candidate'],
    reviewed_route_candidate_keys: ['exploratory-route-candidate'],
    secondary_route_candidate_refs: [ref('technical_route_candidate', 'technical-route-secondary-http-1')],
    secondary_validation_cycle_refs: [ref('validation_cycle', 'validation-cycle-secondary-http-1')],
    secondary_feasibility_probe_refs: [],
    preflight_blocker_codes: [],
  };
}

function crossBoardSynthesisRunPayload(providerId: 'openai' | 'dashscope' = 'openai') {
  return {
    run_id: 'cross-board-synthesis-http-run-1',
    run_mode: 'product',
    execution_mode: 'provider_llm',
    model_profile_id: PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_PROFILE_ID,
    model_option_id: providerModelOptionId(PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_PROFILE_ID, providerId),
    target_ref: ref('motive_evidence_board_version', 'board-version-http-1'),
    target_version_id: 'board-version-http-1@v1',
    input_snapshot_ref: ref('implementation_input_snapshot', 'input-snapshot-http-1'),
    input_snapshot_hash: hash('input-snapshot-http-1'),
    source_refs: [
      ref('motive_evidence_board_version', 'board-version-http-1'),
      ref('motive_evidence_board_version', 'board-version-http-2'),
      ref('trace_manifest', 'trace-manifest-cross-board-http-1'),
    ],
    source_hashes: [
      hash('board-version-http-1'),
      hash('board-version-http-2'),
      hash('trace-manifest-cross-board-http-1'),
    ],
    board_anchors: [
      crossBoardAnchor('1'),
      crossBoardAnchor('2'),
    ],
    reviewed_board_version_refs: [
      ref('motive_evidence_board_version', 'board-version-http-1'),
      ref('motive_evidence_board_version', 'board-version-http-2'),
    ],
    reviewed_conflict_refs: [ref('motive_board_conflict', 'conflict-http-1')],
    reviewed_challenge_refs: [ref('motive_board_challenge', 'challenge-http-1')],
    evidence_transfer_binding_refs: [ref('evidence_transfer_binding', 'transfer-binding-http-1')],
    reuse_policy: {
      require_transfer_binding_for_viable_reuse: true,
      allow_blocked_reuse_without_transfer_binding: true,
    },
    secondary_cross_board_review_refs: [ref('cross_board_review', 'cross-board-review-http-1')],
    secondary_evidence_transfer_binding_refs: [ref('evidence_transfer_binding', 'transfer-binding-http-1')],
    secondary_motive_assertion_refs: [ref('motive_assertion', 'motive-assertion-http-1')],
    secondary_evidence_binding_refs: [ref('evidence_binding', 'evidence-binding-http-1')],
    secondary_route_refs: [ref('technical_route_candidate', 'technical-route-http-1')],
    secondary_experiment_refs: [ref('experiment_run', 'experiment-run-http-1')],
    preflight_blocker_codes: [],
  };
}

function evidenceBoardCurationRunPayload(providerId: 'openai' | 'dashscope' = 'openai') {
  return {
    run_id: 'evidence-board-curation-http-run-1',
    run_mode: 'product',
    execution_mode: 'provider_llm',
    model_profile_id: PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_PROFILE_ID,
    model_option_id: providerModelOptionId(PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_PROFILE_ID, providerId),
    curation_mode: 'curate_existing_board',
    target_ref: ref('motive_evidence_board_version', 'board-version-http-1'),
    target_version_id: 'board-version-http-1@v1',
    target_motive_ref: ref('core_motive', 'core-motive-http-1'),
    target_core_motive_version_ref: ref('core_motive_version', 'core-motive-version-http-1'),
    target_board_ref: ref('motive_evidence_board_version', 'board-version-http-1'),
    target_board_hash: hash('board-version-http-1'),
    target_assertion_refs: [ref('motive_assertion', 'assertion-http-1')],
    input_snapshot_ref: ref('implementation_input_snapshot', 'input-snapshot-http-1'),
    input_snapshot_hash: hash('input-snapshot-http-1'),
    source_refs: [
      ref('source_locator', 'source-locator-http-1'),
      ref('citation_candidate', 'citation-candidate-http-1'),
      ref('evidence_unit', 'evidence-http-1'),
    ],
    source_hashes: [
      hash('source-locator-http-1'),
      hash('citation-candidate-http-1'),
      hash('evidence-http-1'),
    ],
    source_context_packets: [{
      packet_ref: ref('source_context_packet', 'source-context-packet-http-1'),
      packet_hash: hash('source-context-packet-http-1'),
      source_ref: ref('source_locator', 'source-locator-http-1'),
      source_hash: hash('source-locator-http-1'),
      evidence_kind: 'source_locator',
      content_summary: 'HTTP fixture locator points to a concrete paper section and line range.',
      key_facts: [
        'The source locator is primary review material only.',
        'The runtime cannot create evidence bindings.',
      ],
      covered_evidence_refs: [],
      covered_source_locator_refs: [ref('source_locator', 'source-locator-http-1')],
      covered_citation_candidate_refs: [],
      covered_trace_manifest_refs: [],
    }],
    trace_manifest_refs: [ref('trace_manifest', 'trace-manifest-evidence-board-http-1')],
    trace_manifest_hashes: [hash('trace-manifest-evidence-board-http-1')],
    source_locator_refs: [ref('source_locator', 'source-locator-http-1')],
    citation_candidate_refs: [ref('citation_candidate', 'citation-candidate-http-1')],
    reviewed_citation_candidate_refs: [ref('citation_candidate', 'citation-candidate-http-1')],
    evidence_refs: [
      ref('evidence_unit', 'evidence-http-1'),
      ref('evidence_unit', 'existing-bound-evidence-http-1'),
    ],
    existing_evidence_binding_refs: [ref('evidence_binding', 'existing-binding-http-1')],
    existing_bound_evidence_refs: [ref('evidence_unit', 'existing-bound-evidence-http-1')],
    accepted_risk_refs: [ref('accepted_risk', 'accepted-risk-http-1')],
    freshness_policy: {
      stale_evidence_requires_gap_candidate: true,
      unreviewed_citation_requires_gap_candidate: true,
      duplicate_existing_binding_requires_gap_candidate: true,
    },
    secondary_evidence_transfer_binding_refs: [ref('evidence_transfer_binding', 'transfer-binding-http-1')],
    secondary_cross_board_review_refs: [ref('cross_board_review', 'cross-board-review-http-1')],
    secondary_trace_repair_queue_refs: [],
    preflight_blocker_codes: [],
  };
}

function motiveDecompositionRunPayload(providerId: 'openai' | 'dashscope' = 'openai') {
  return {
    run_id: 'motive-decomposition-http-run-1',
    run_mode: 'product',
    execution_mode: 'provider_llm',
    model_profile_id: PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_PROFILE_ID,
    model_option_id: providerModelOptionId(PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_PROFILE_ID, providerId),
    decomposition_mode: 'decompose_existing_assertions',
    target_ref: ref('core_motive_version', 'core-motive-version-http-1'),
    target_version_id: 'core-motive-version-http-1@v1',
    target_motive_ref: ref('core_motive', 'core-motive-http-1'),
    target_core_motive_version_ref: ref('core_motive_version', 'core-motive-version-http-1'),
    target_assertion_refs: [ref('motive_assertion', 'assertion-http-1')],
    input_snapshot_ref: ref('implementation_input_snapshot', 'input-snapshot-http-1'),
    input_snapshot_hash: hash('input-snapshot-http-1'),
    source_refs: [
      ref('source_locator', 'source-locator-motive-decomposition-http-1'),
      ref('citation_candidate', 'citation-candidate-motive-decomposition-http-1'),
      ref('evidence_unit', 'evidence-motive-decomposition-http-1'),
    ],
    source_hashes: [
      hash('source-locator-motive-decomposition-http-1'),
      hash('citation-candidate-motive-decomposition-http-1'),
      hash('evidence-motive-decomposition-http-1'),
    ],
    assertion_context_packets: [{
      packet_ref: ref('assertion_context_packet', 'assertion-context-packet-motive-decomposition-http-1'),
      packet_hash: hash('assertion-context-packet-motive-decomposition-http-1'),
      assertion_ref: ref('motive_assertion', 'assertion-http-1'),
      assertion_hash: hash('assertion-http-1'),
      assertion_text: 'The retrieval grounding component reduces unsupported generated claims.',
      scope_boundary_summary: 'Scope is limited to source-backed retrieval grounding behavior.',
      covered_evidence_refs: [ref('evidence_unit', 'evidence-motive-decomposition-http-1')],
      covered_trace_manifest_refs: [ref('trace_manifest', 'trace-manifest-motive-decomposition-http-1')],
      covered_source_refs: [ref('source_locator', 'source-locator-motive-decomposition-http-1')],
    }],
    trace_manifest_refs: [ref('trace_manifest', 'trace-manifest-motive-decomposition-http-1')],
    trace_manifest_hashes: [hash('trace-manifest-motive-decomposition-http-1')],
    source_locator_refs: [ref('source_locator', 'source-locator-motive-decomposition-http-1')],
    citation_candidate_refs: [ref('citation_candidate', 'citation-candidate-motive-decomposition-http-1')],
    evidence_refs: [ref('evidence_unit', 'evidence-motive-decomposition-http-1')],
    accepted_risk_refs: [ref('accepted_risk', 'accepted-risk-motive-decomposition-http-1')],
    admitted_upstream_artifact_refs: [
      ref('paper_implementation_runtime_artifact', 'evidence-board-final-motive-decomposition-http-1'),
    ],
    admitted_upstream_artifact_hashes: [hash('evidence-board-final-motive-decomposition-http-1')],
    preflight_blocker_codes: [],
  };
}

function motiveEvolutionRunPayload(providerId: 'openai' | 'dashscope' = 'openai') {
  return {
    run_id: 'motive-evolution-http-run-1',
    run_mode: 'product',
    execution_mode: 'provider_llm',
    model_profile_id: PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_PROFILE_ID,
    model_option_id: providerModelOptionId(PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_PROFILE_ID, providerId),
    target_ref: ref('core_motive_version', 'core-motive-version-motive-evolution-http-1'),
    target_version_id: 'core-motive-version-motive-evolution-http-1@v1',
    target_motive_refs: [ref('core_motive', 'core-motive-motive-evolution-http-1')],
    target_motive_hashes: [hash('core-motive-motive-evolution-http-1')],
    target_core_motive_version_refs: [ref('core_motive_version', 'core-motive-version-motive-evolution-http-1')],
    target_core_motive_version_hashes: [hash('core-motive-version-motive-evolution-http-1')],
    input_snapshot_ref: ref('implementation_input_snapshot', 'input-snapshot-motive-evolution-http-1'),
    input_snapshot_hash: hash('input-snapshot-motive-evolution-http-1'),
    portfolio_snapshot_ref: ref('motive_portfolio_snapshot', 'portfolio-snapshot-motive-evolution-http-1'),
    portfolio_snapshot_hash: hash('portfolio-snapshot-motive-evolution-http-1'),
    evidence_board_refs: [ref('motive_evidence_board_version', 'board-version-motive-evolution-http-1')],
    evidence_board_hashes: [hash('board-version-motive-evolution-http-1')],
    evidence_binding_refs: [ref('evidence_binding', 'evidence-binding-motive-evolution-http-1')],
    evidence_binding_hashes: [hash('evidence-binding-motive-evolution-http-1')],
    challenge_refs: [ref('motive_challenge', 'challenge-motive-evolution-http-1')],
    conflict_refs: [ref('motive_conflict', 'conflict-motive-evolution-http-1')],
    trace_manifest_refs: [ref('trace_manifest', 'trace-manifest-motive-evolution-http-1')],
    trace_manifest_hashes: [hash('trace-manifest-motive-evolution-http-1')],
    human_confirmation_policy_ref: ref('human_confirmation_policy', 'human-confirmation-policy-motive-evolution-http-1'),
    human_confirmation_policy_hash: hash('human-confirmation-policy-motive-evolution-http-1'),
    source_refs: [
      ref('source', 'source-motive-evolution-http-1'),
      ref('motive_evidence_board_version', 'board-version-motive-evolution-http-1'),
      ref('evidence_binding', 'evidence-binding-motive-evolution-http-1'),
      ref('trace_manifest', 'trace-manifest-motive-evolution-http-1'),
    ],
    source_hashes: [
      hash('source-motive-evolution-http-1'),
      hash('board-version-motive-evolution-http-1'),
      hash('evidence-binding-motive-evolution-http-1'),
      hash('trace-manifest-motive-evolution-http-1'),
    ],
    motive_context_packets: [{
      packet_ref: ref('motive_context_packet', 'motive-context-packet-motive-evolution-http-1'),
      packet_hash: hash('motive-context-packet-motive-evolution-http-1'),
      packet_kind: 'motive_version_state',
      content_summary: 'HTTP fixture motive version state is bound to target, evidence, trace, and source refs.',
      key_facts: [
        'Current motive version has an evidence-board repair option but runtime cannot write motive decisions.',
      ],
      covered_target_refs: [
        ref('core_motive_version', 'core-motive-version-motive-evolution-http-1'),
        ref('core_motive', 'core-motive-motive-evolution-http-1'),
      ],
      covered_evidence_refs: [
        ref('motive_evidence_board_version', 'board-version-motive-evolution-http-1'),
        ref('evidence_binding', 'evidence-binding-motive-evolution-http-1'),
      ],
      covered_trace_manifest_refs: [ref('trace_manifest', 'trace-manifest-motive-evolution-http-1')],
      covered_source_refs: [ref('source', 'source-motive-evolution-http-1')],
    }],
    validation_cycle_refs: [ref('validation_cycle', 'validation-cycle-motive-evolution-http-1')],
    validation_cycle_hashes: [hash('validation-cycle-motive-evolution-http-1')],
    result_packet_refs: [ref('result_interpretation_packet', 'result-packet-motive-evolution-http-1')],
    result_packet_hashes: [hash('result-packet-motive-evolution-http-1')],
    cross_board_review_refs: [ref('cross_board_review', 'cross-board-review-motive-evolution-http-1')],
    cross_board_review_hashes: [hash('cross-board-review-motive-evolution-http-1')],
    prior_evolution_decision_refs: [ref('motive_evolution_decision', 'prior-evolution-motive-evolution-http-1')],
    prior_evolution_decision_hashes: [hash('prior-evolution-motive-evolution-http-1')],
    prior_portfolio_decision_refs: [ref('motive_portfolio_decision', 'portfolio-decision-motive-evolution-http-1')],
    prior_portfolio_decision_hashes: [hash('portfolio-decision-motive-evolution-http-1')],
    accepted_risk_refs: [ref('accepted_risk', 'accepted-risk-motive-evolution-http-1')],
    accepted_risk_hashes: [hash('accepted-risk-motive-evolution-http-1')],
    human_request_refs: [ref('human_request', 'human-request-motive-evolution-http-1')],
    human_request_hashes: [hash('human-request-motive-evolution-http-1')],
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

function assertSingleRoleProposalProviderCanaryResponse(
  response: Awaited<ReturnType<FastifyInstance['inject']>>,
  options: {
    expectedSlotId: string;
    requiredPayloadFlags: string[];
    forbiddenPayloadFields: string[];
  },
): void {
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
  assert.equal(body.status, 'passed');
  assert.equal(body.provider_call_count >= 1, true);
  assert.equal(body.provider_call_count <= 2, true);
  assert.equal(body.runtime_artifacts.length >= 2, true);
  assert.equal(body.runtime_artifacts.every((artifact) => artifact.slot_id === options.expectedSlotId), true);
  assert.equal(body.runtime_artifacts.every((artifact) => artifact.execution_mode === 'provider_llm'), true);
  assert.equal(
    body.runtime_artifacts.some((artifact) => artifact.runtime_status === 'failed_runtime'),
    false,
  );
  assert.ok(body.final_runtime_artifact);
  assert.equal(body.final_runtime_artifact.execution_mode, 'provider_llm');
  assert.equal(body.final_runtime_artifact.slot_id, options.expectedSlotId);
  assert.equal(body.final_runtime_artifact.runtime_status, 'passed');
  const finalPayload = body.final_runtime_artifact.artifact_payload as Record<string, unknown>;
  for (const flagName of options.requiredPayloadFlags) {
    assert.equal(finalPayload[flagName], true, `${flagName} must stay explicit in live provider canary output`);
  }
  for (const fieldName of ['domain_gate_request', 'queue_action', ...options.forbiddenPayloadFields]) {
    assert.equal(fieldName in finalPayload, false, `${fieldName} must not appear in live provider canary output`);
  }
  assert.equal(body.admission_records.every((record) => record.admission_status === 'admitted'), true);
  assert.equal(body.final_admission_record?.admission_status, 'admitted');
  assert.equal(body.operational_telemetry.status, 'passed');
  assert.equal(body.operational_telemetry.provider_call_count_consistent, true);
  assert.equal(body.operational_telemetry.non_provider_artifact_count, 0);
}

function assertMotiveEvolutionProviderCanaryResponse(
  response: Awaited<ReturnType<FastifyInstance['inject']>>,
): void {
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
  assert.equal(body.status, 'passed');
  assert.equal(body.provider_call_count >= 2, true);
  assert.equal(body.provider_call_count <= 4, true);
  assert.equal(body.runtime_artifacts.length >= 3, true);
  assert.equal(
    body.runtime_artifacts.every((artifact) =>
      artifact.slot_id === PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_SLOT_ID),
    true,
  );
  assert.equal(body.runtime_artifacts.every((artifact) => artifact.execution_mode === 'provider_llm'), true);
  assert.equal(
    body.runtime_artifacts.some((artifact) => artifact.runtime_status === 'failed_runtime'),
    false,
  );
  assert.ok(body.final_runtime_artifact);
  assert.equal(body.final_runtime_artifact.execution_mode, 'provider_llm');
  assert.equal(body.final_runtime_artifact.slot_id, PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_SLOT_ID);
  assert.equal(body.final_runtime_artifact.runtime_status, 'passed');
  const finalPayload = body.final_runtime_artifact.artifact_payload as Record<string, unknown>;
  for (const flagName of [
    'no_domain_gate_request',
    'no_queue_side_effect',
    'no_motive_write_side_effect',
    'no_motive_evolution_side_effect',
    'no_portfolio_mutation_side_effect',
    'no_board_write_side_effect',
    'no_evidence_binding_side_effect',
    'no_trace_repair_queue_side_effect',
  ]) {
    assert.equal(finalPayload[flagName], true, `${flagName} must stay explicit in live provider canary output`);
  }
  for (const fieldName of [
    'domain_gate_request',
    'queue_action',
    'motive_evolution_decision_request',
    'create_motive_evolution_decision_request',
    'ApplyMotivePortfolioDecisionRequest',
    'core_motive_version_patch',
    'motive_roles_after_decision',
    'writer_dto_payload',
    'board_draft',
    'create_motive_evidence_board_version_request',
    'create_evidence_binding_request',
    'trace_repair_queue_item',
  ]) {
    assert.equal(fieldName in finalPayload, false, `${fieldName} must not appear in live provider canary output`);
  }
  assert.equal(body.admission_records.every((record) => record.admission_status === 'admitted'), true);
  assert.equal(body.final_admission_record?.admission_status, 'admitted');
  assert.equal(body.operational_telemetry.status, 'passed');
  assert.equal(body.operational_telemetry.provider_call_count_consistent, true);
  assert.equal(body.operational_telemetry.non_provider_artifact_count, 0);
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

/**
 * T-124 S3 复审 F5-1: the provider wire shape of a P1 role output — canonical
 * output with `domain_gate_request` and `scenario_outputs` replaced by their
 * JSON-string carriers (`domain_gate_request_json` / `scenario_output_jsons`).
 * This is what a real provider emits under the wire schema; the runtime service
 * canonicalizes it back before recording.
 */
function p1WireReviewRoleOutput(roleSlotId: string): Record<string, unknown> {
  const { domain_gate_request: domainGate, scenario_outputs: scenarios, ...rest } = p1ReviewRoleOutput(roleSlotId);
  return {
    ...rest,
    domain_gate_request_json: domainGate === null || domainGate === undefined
      ? null
      : JSON.stringify(domainGate),
    scenario_output_jsons: (scenarios ?? []).map((scenario) => JSON.stringify(scenario)),
  };
}

/**
 * T-124 S3 复审 F5-1: the provider wire shape of a result-analysis role output —
 * `domain_gate_request` replaced by the `domain_gate_request_json` string
 * carrier; `scenario_outputs` stays canonical (typed, strict-representable).
 */
function resultAnalysisWireRoleOutput(
  output: PaperImplementationResultAnalysisRoleOutput,
): Record<string, unknown> {
  const { domain_gate_request: domainGate, ...rest } = output;
  return {
    ...rest,
    domain_gate_request_json: domainGate === null || domainGate === undefined
      ? null
      : JSON.stringify(domainGate),
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

function routePlanningRoleOutput(
  roleSlotId: string,
  messages?: Array<{ role: 'system' | 'user'; content: string }>,
): PaperImplementationRoutePlanningRoleOutput {
  if (roleSlotId === PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_ROLE_SLOT_ID) {
    // S3-α4: a well-behaved skeptic echoes the request-injected admitted
    // upstream values — mirror that by parsing them from the built user message.
    const userMessage = messages?.find((message) => message.role === 'user');
    if (userMessage) {
      const parsed = JSON.parse(userMessage.content) as {
        admitted_route_proposal_artifact_ref?: TopicSelectionFunctionalRef | null;
        admitted_route_proposal_artifact_hash?: string | null;
        reviewed_candidate_keys?: string[];
      };
      return routeSkepticRoleOutput({
        reviewed_route_proposal_ref: parsed.admitted_route_proposal_artifact_ref ?? null,
        reviewed_route_proposal_hash: parsed.admitted_route_proposal_artifact_hash ?? null,
        reviewed_candidate_keys: parsed.reviewed_candidate_keys ?? [],
      });
    }
    return routeSkepticRoleOutput();
  }
  return routeArchitectureRoleOutput();
}

function routeCandidateProposal(
  candidateKey: string,
  confirmatoryMarker: boolean,
): PaperImplementationRouteCandidateProposal {
  return {
    candidate_key: candidateKey,
    route_summary: `${candidateKey} proposes a bounded route candidate.`,
    expected_information_gain: 'Clarifies route feasibility before deterministic validation admission.',
    baseline_gap_status: confirmatoryMarker ? 'partial' : 'unknown',
    cited_source_refs: [ref('implementation_input_snapshot', 'input-snapshot-http-1')],
    trace_refs: [ref('trace_manifest', 'trace-manifest-route-http-1')],
    validation_signal_refs: [ref('validation_signal', `${candidateKey}-signal-http-1`)],
    dataset_refs: [ref('dataset_version', `${candidateKey}-dataset-http-1`)],
    metric_refs: [ref('metric', `${candidateKey}-metric-http-1`)],
    baseline_refs: [ref('baseline_version', `${candidateKey}-baseline-http-1`)],
    code_refs: [ref('code_version', `${candidateKey}-code-http-1`)],
    config_refs: [ref('config_snapshot', `${candidateKey}-config-http-1`)],
    scope_boundary: 'Proposal only; deterministic validation planning owns persisted route records.',
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
    summary: 'HTTP route architecture runtime proposed bounded route candidates.',
    cited_source_refs: [ref('implementation_input_snapshot', 'input-snapshot-http-1')],
    blocker_codes: [],
    warning_codes: [],
    route_candidate_proposals: [
      routeCandidateProposal('exploratory-route-candidate', false),
      routeCandidateProposal('confirmatory-route-candidate', true),
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
    summary: 'HTTP route skeptic runtime covered all required route-risk dimensions.',
    cited_source_refs: [ref('route_architecture_runtime_artifact', 'route-architecture-final-http-1')],
    blocker_codes: [],
    warning_codes: [],
    reviewed_route_proposal_ref: ref('route_architecture_runtime_artifact', 'route-architecture-final-http-1'),
    reviewed_route_proposal_hash: hash('route-architecture-final-http-1'),
    reviewed_candidate_keys: ['exploratory-route-candidate'],
    checked_dimensions: [...PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_RISK_DIMENSIONS],
    risk_findings: [{
      finding_id: 'route-risk-finding-budget-http-1',
      risk_dimension: 'compute_budget',
      severity: 'warning',
      summary: 'Budget must be confirmed before deterministic route admission proceeds.',
      evidence_refs: [ref('validation_budget', 'budget-http-1')],
      affected_candidate_keys: ['exploratory-route-candidate'],
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
    reviewed_route_candidate_key: 'exploratory-route-candidate',
    target_ref: ref('technical_route_candidate', `technical-route-candidate-${candidateKey}-http-1`),
    target_frame_summary: `${candidateKey} validates a bounded route signal before deterministic cycle admission.`,
    cycle_type: confirmatoryMarker ? 'baseline_challenge' : 'route_feasibility',
    trigger_refs: [ref('route_risk_finding', `route-risk-finding-${candidateKey}-http-1`)],
    validation_question: `Can ${candidateKey} produce a useful route validation signal within budget?`,
    assumptions_under_test: ['Route context is sufficient to validate against the baseline.'],
    assertion_refs_under_test: [ref('motive_assertion', `motive-assertion-${candidateKey}-http-1`)],
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
      budget_ref: ref('validation_budget', `budget-${candidateKey}-http-1`),
      iteration_budget_ref: ref('iteration_budget', `iteration-budget-${candidateKey}-http-1`),
      retry_budget: 1,
      max_runtime: '2h',
      max_compute: 'single-gpu-smoke',
      max_human_review_count: 1,
    },
    included_context_refs: [ref('route_architecture_runtime_artifact', 'route-architecture-final-http-1')],
    trace_refs: [ref('trace_manifest', `trace-manifest-${candidateKey}-http-1`)],
    confirmatory_marker: confirmatoryMarker,
    blocker_codes: [],
    warning_codes: [],
  };
}

function validationCyclePlanningRoleOutput(
  overrides: Partial<PaperImplementationValidationCyclePlanningRoleOutput> = {},
  lineage?: PaperImplementationSeededRouteLineage,
): PaperImplementationValidationCyclePlanningRoleOutput {
  return {
    role_slot_id: PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_ROLE_SLOT_ID,
    role_status: 'passed',
    summary: 'HTTP validation-cycle planning runtime proposed bounded cycle candidates.',
    cited_source_refs: [lineage?.routeProposalRef ?? ref('route_architecture_runtime_artifact', 'route-architecture-final-http-1')],
    blocker_codes: [],
    warning_codes: [],
    reviewed_route_proposal_ref: lineage?.routeProposalRef
      ?? ref('route_architecture_runtime_artifact', 'route-architecture-final-http-1'),
    reviewed_route_proposal_hash: lineage?.routeProposalHash ?? hash('route-architecture-final-http-1'),
    reviewed_route_skeptic_artifact_ref: lineage?.routeSkepticRef
      ?? ref('route_skeptic_review_runtime_artifact', 'route-skeptic-final-http-1'),
    reviewed_route_skeptic_artifact_hash: lineage?.routeSkepticHash ?? hash('route-skeptic-final-http-1'),
    reviewed_candidate_keys: ['exploratory-route-candidate'],
    cycle_candidate_proposals: [
      validationCycleCandidateProposal('exploratory-cycle-candidate', false),
      validationCycleCandidateProposal('confirmatory-cycle-candidate', true),
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
    reviewed_cycle_candidate_key: 'exploratory-cycle-candidate',
    reviewed_route_candidate_key: 'exploratory-route-candidate',
    probe_kind: confirmatoryMarker ? 'baseline_check' : 'data_feasibility',
    probe_question: `Can ${candidateKey} produce enough feasibility signal before deterministic probe admission?`,
    plan_summary: `${candidateKey} proposes a bounded feasibility probe or plan-light candidate without creating downstream records.`,
    expected_information_gain: confirmatoryMarker ? 'medium' : 'high',
    baseline_gap_status: confirmatoryMarker ? 'resolved' : 'open',
    primary_metric_refs: [ref('metric', `${candidateKey}-metric-http-1`)],
    dataset_version_refs: [ref('dataset_version', `${candidateKey}-dataset-http-1`)],
    baseline_version_refs: [ref('baseline_version', `${candidateKey}-baseline-http-1`)],
    code_version_refs: [ref('code_version', `${candidateKey}-code-http-1`)],
    config_refs: [ref('config_snapshot', `${candidateKey}-config-http-1`)],
    budget_envelope: {
      budget_ref: ref('validation_budget', `${candidateKey}-budget-http-1`),
      iteration_budget_ref: ref('iteration_budget', `${candidateKey}-iteration-budget-http-1`),
      retry_budget: 1,
      estimated_cost_class: confirmatoryMarker ? 'medium' : 'low',
      max_runtime: '2h',
      max_compute: 'single-gpu-smoke',
      max_human_review_count: 1,
    },
    stop_condition_refs: [ref('stop_condition', `${candidateKey}-stop-condition-http-1`)],
    trace_refs: [ref('trace_manifest', `${candidateKey}-trace-manifest-http-1`)],
    confirmatory_marker: confirmatoryMarker,
    blocker_codes: [],
    warning_codes: [],
  };
}

function feasibilityPlanningRoleOutput(
  overrides: Partial<PaperImplementationFeasibilityPlanningRoleOutput> = {},
  lineage?: PaperImplementationSeededValidationLineage,
): PaperImplementationFeasibilityPlanningRoleOutput {
  return {
    role_slot_id: PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_ROLE_SLOT_ID,
    role_status: 'passed',
    summary: 'HTTP feasibility planning runtime proposed bounded probe and plan-light candidates.',
    cited_source_refs: [lineage?.validationCycleRef ?? ref('validation_cycle_planning_runtime_artifact', 'validation-cycle-final-http-1')],
    blocker_codes: [],
    warning_codes: [],
    reviewed_validation_cycle_artifact_ref: lineage?.validationCycleRef
      ?? ref('validation_cycle_planning_runtime_artifact', 'validation-cycle-final-http-1'),
    reviewed_validation_cycle_artifact_hash: lineage?.validationCycleHash ?? hash('validation-cycle-final-http-1'),
    reviewed_route_proposal_ref: lineage?.routeProposalRef
      ?? ref('route_architecture_runtime_artifact', 'route-architecture-final-http-1'),
    reviewed_route_proposal_hash: lineage?.routeProposalHash ?? hash('route-architecture-final-http-1'),
    reviewed_route_skeptic_artifact_ref: lineage?.routeSkepticRef
      ?? ref('route_skeptic_review_runtime_artifact', 'route-skeptic-final-http-1'),
    reviewed_route_skeptic_artifact_hash: lineage?.routeSkepticHash ?? hash('route-skeptic-final-http-1'),
    reviewed_cycle_candidate_keys: ['exploratory-cycle-candidate'],
    reviewed_route_candidate_keys: ['exploratory-route-candidate'],
    probe_plan_candidate_proposals: [
      feasibilityProbePlanCandidateProposal('exploratory-probe-candidate', false),
      feasibilityProbePlanCandidateProposal('plan-light-readiness-candidate', true),
    ],
    no_domain_gate_request: true,
    no_queue_side_effect: true,
    no_feasibility_probe_side_effect: true,
    no_experiment_plan_light_side_effect: true,
    no_validation_cycle_side_effect: true,
    ...overrides,
  };
}

function crossBoardAnchor(id: '1' | '2'): PaperImplementationCrossBoardAnchor {
  return {
    board_version_ref: ref('motive_evidence_board_version', `board-version-http-${id}`),
    board_version_hash: hash(`board-version-http-${id}`),
    motive_ref: ref('core_motive', `core-motive-http-${id}`),
    core_motive_version_ref: ref('core_motive_version', `core-motive-version-http-${id}`),
    trace_manifest_ref: ref('trace_manifest', `trace-manifest-cross-board-http-${id}`),
    trace_manifest_hash: hash(`trace-manifest-cross-board-http-${id}`),
    evidence_binding_refs: [ref('evidence_binding', `evidence-binding-http-${id}`)],
    source_locator_refs: [ref('source_locator', `source-locator-http-${id}`)],
    conflict_refs: id === '1' ? [ref('motive_board_conflict', 'conflict-http-1')] : [],
    challenge_refs: id === '1' ? [ref('motive_board_challenge', 'challenge-http-1')] : [],
    freshness_status: 'fresh',
  };
}

function crossBoardReuseScenarioProposal(
  overrides: Partial<PaperImplementationCrossBoardScenarioProposal> = {},
): PaperImplementationCrossBoardScenarioProposal {
  return {
    scenario_key: 'reuse-scenario-http-1',
    scenario_kind: 'reuse',
    disposition: 'viable_candidate',
    source_board_version_refs: [
      ref('motive_evidence_board_version', 'board-version-http-1'),
      ref('motive_evidence_board_version', 'board-version-http-2'),
    ],
    source_board_version_hashes: [
      hash('board-version-http-1'),
      hash('board-version-http-2'),
    ],
    target_motive_refs: [ref('core_motive', 'core-motive-http-1')],
    evidence_transfer_binding_refs: [ref('evidence_transfer_binding', 'transfer-binding-http-1')],
    conflict_refs: [ref('motive_board_conflict', 'conflict-http-1')],
    challenge_refs: [ref('motive_board_challenge', 'challenge-http-1')],
    freshness_blockers: [],
    source_locator_refs: [
      ref('source_locator', 'source-locator-http-1'),
      ref('source_locator', 'source-locator-http-2'),
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
    scenario_key: 'park-conflict-scenario-http-1',
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
    summary: 'HTTP cross-board synthesis runtime proposed bounded cross-board scenarios.',
    cited_source_refs: [ref('motive_evidence_board_version', 'board-version-http-1')],
    reviewed_board_version_refs: [
      ref('motive_evidence_board_version', 'board-version-http-1'),
      ref('motive_evidence_board_version', 'board-version-http-2'),
    ],
    reviewed_conflict_refs: [ref('motive_board_conflict', 'conflict-http-1')],
    reviewed_challenge_refs: [ref('motive_board_challenge', 'challenge-http-1')],
    reviewed_evidence_transfer_binding_refs: [ref('evidence_transfer_binding', 'transfer-binding-http-1')],
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

function evidenceBoardBindingCandidateProposal(
  candidateKey: string,
  overrides: Partial<PaperImplementationEvidenceBoardBindingCandidateProposal> = {},
): PaperImplementationEvidenceBoardBindingCandidateProposal {
  return {
    candidate_key: candidateKey,
    target_assertion_ref: ref('motive_assertion', 'assertion-http-1'),
    evidence_ref: ref('evidence_unit', 'evidence-http-1'),
    source_locator_refs: [ref('source_locator', 'source-locator-http-1')],
    citation_candidate_refs: [ref('citation_candidate', 'citation-candidate-http-1')],
    proposed_role: 'supporting_evidence',
    proposed_scope: 'assertion_local',
    proposed_strength: 'moderate',
    support_state: 'viable_binding',
    challenge_status: 'passed',
    freshness_status: 'fresh',
    interpretation: 'HTTP fixture proposes an append-only evidence binding candidate without domain mutation.',
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
    summary: 'HTTP evidence-board curation runtime proposed append-only binding candidates.',
    cited_source_refs: [ref('source_locator', 'source-locator-http-1')],
    reviewed_assertion_refs: [ref('motive_assertion', 'assertion-http-1')],
    reviewed_source_locator_refs: [ref('source_locator', 'source-locator-http-1')],
    reviewed_citation_candidate_refs: [ref('citation_candidate', 'citation-candidate-http-1')],
    reviewed_evidence_refs: [
      ref('evidence_unit', 'evidence-http-1'),
      ref('evidence_unit', 'existing-bound-evidence-http-1'),
    ],
    reviewed_existing_evidence_binding_refs: [ref('evidence_binding', 'existing-binding-http-1')],
    binding_candidate_proposals: [evidenceBoardBindingCandidateProposal('binding-candidate-http-1')],
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

function motiveDecompositionDraftAssertionCandidate(
  overrides: Partial<PaperImplementationMotiveDecompositionDraftAssertionCandidate> = {},
): PaperImplementationMotiveDecompositionDraftAssertionCandidate {
  return {
    candidate_key: 'split-child-motive-decomposition-http-1',
    source_assertion_ref: ref('motive_assertion', 'assertion-http-1'),
    candidate_kind: 'split_child',
    draft_assertion_text: 'The retrieval grounding component reduces unsupported generated claims.',
    scope_boundary_summary: 'Scope is limited to retrieval grounding behavior with request-owned evidence.',
    support_obligation_summary: 'Requires source locator, citation candidate, evidence unit, and trace manifest coverage.',
    covered_evidence_refs: [ref('evidence_unit', 'evidence-motive-decomposition-http-1')],
    covered_source_refs: [ref('source_locator', 'source-locator-motive-decomposition-http-1')],
    covered_source_locator_refs: [ref('source_locator', 'source-locator-motive-decomposition-http-1')],
    covered_citation_candidate_refs: [ref('citation_candidate', 'citation-candidate-motive-decomposition-http-1')],
    covered_trace_manifest_refs: [ref('trace_manifest', 'trace-manifest-motive-decomposition-http-1')],
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
    summary: 'HTTP motive decomposition runtime proposed draft assertion candidates for deterministic review.',
    cited_source_refs: [ref('source_locator', 'source-locator-motive-decomposition-http-1')],
    decomposition_result_status: 'candidates_proposed',
    reviewed_assertion_refs: [ref('motive_assertion', 'assertion-http-1')],
    draft_assertion_candidates: [motiveDecompositionDraftAssertionCandidate()],
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

interface MotiveEvolutionPriorRoleMaterial {
  designer_role_artifact_ref: TopicSelectionFunctionalRef;
  designer_role_artifact_hash: string;
  option_set_hash: string;
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
    designer_role_artifact_ref: ref('motive_evolution_role_artifact', 'designer-role-motive-evolution-http-1'),
    designer_role_artifact_hash: hash('designer-role-motive-evolution-http-1'),
    option_set_hash: hash('motive-evolution-option-set-http-1'),
  };
}

function motiveEvolutionFixtureRoleOutputs() {
  const prior = motiveEvolutionFallbackPrior();
  return {
    [PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_OPTION_DESIGNER_ROLE_SLOT_ID]: motiveEvolutionDesignerRoleOutput(),
    [PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_RISK_CHALLENGER_ROLE_SLOT_ID]:
      motiveEvolutionRiskChallengerRoleOutput(prior),
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
      ref('core_motive_version', 'core-motive-version-motive-evolution-http-1'),
      ref('motive_evidence_board_version', 'board-version-motive-evolution-http-1'),
      ref('evidence_binding', 'evidence-binding-motive-evolution-http-1'),
    ],
    challenging_refs: [
      ref('motive_challenge', 'challenge-motive-evolution-http-1'),
      ref('trace_manifest', 'trace-manifest-motive-evolution-http-1'),
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
    summary: 'HTTP motive evolution runtime designed support options for deterministic review.',
    cited_source_refs: [ref('source', 'source-motive-evolution-http-1')],
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
    reviewed_target_motive_refs: [ref('core_motive', 'core-motive-motive-evolution-http-1')],
    reviewed_core_motive_version_refs: [ref('core_motive_version', 'core-motive-version-motive-evolution-http-1')],
    designed_options: motiveEvolutionDesignedOptionsByKey('evolution-option-http-1'),
    option_set_hash: hash('motive-evolution-option-set-http-1'),
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
    summary: 'HTTP motive evolution runtime challenged every support option for deterministic review.',
    cited_source_refs: [ref('source', 'source-motive-evolution-http-1')],
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
    challenged_option_keys: ['evolution-option-http-1'],
    decision_options: motiveEvolutionDecisionOptionsByKey('evolution-option-http-1'),
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
