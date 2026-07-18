import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import test from 'node:test';

import { PrismaClient } from '@prisma/client';
import type {
  ImplementationFeedbackEvent,
  ImplementationIntakeSnapshot,
  ImplementationProject,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-contracts';
import type {
  ResultInterpretationPacket,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-result-claim-dossier-contracts';
import type {
  ClaimTracePacket,
  TraceLineageBundle,
  TraceManifest,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-trace-contracts';
import {
  PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_PROFILE_ID,
  PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_SLOT_ID,
  PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_REVIEW_ROLE_SLOT_IDS,
  PAPER_IMPLEMENTATION_DOSSIER_READINESS_AUDIT_PROFILE_ID,
  PAPER_IMPLEMENTATION_DOSSIER_READINESS_AUDIT_SLOT_ID,
  PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_PROFILE_ID,
  PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_SLOT_ID,
  PAPER_IMPLEMENTATION_EXPERIMENT_DESIGN_PROFILE_ID,
  PAPER_IMPLEMENTATION_EXPERIMENT_DESIGN_SLOT_ID,
  PAPER_IMPLEMENTATION_RESULT_ANALYSIS_PROFILE_ID,
  PAPER_IMPLEMENTATION_RESULT_ANALYSIS_ROLE_SLOT_ID,
  PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SCENARIO_KINDS,
  PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SLOT_ID,
  PAPER_IMPLEMENTATION_TRACE_INTEGRITY_BOUNDARY_DEBATE_SLOT_ID,
  PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_PROFILE_ID,
  type PaperImplementationP1RuntimeReviewRoleOutput,
  type PaperImplementationResultAnalysisRoleOutput,
  type PaperImplementationRuntimeAdmissionRecord,
  type PaperImplementationRuntimeArtifactEnvelope,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-runtime-contracts';
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
import { InMemoryPaperImplementationResultClaimDossierRepository } from '../repositories/in-memory-paper-implementation-result-claim-dossier-repository.js';
import { InMemoryPaperImplementationTraceRepository } from '../repositories/in-memory-paper-implementation-trace-repository.js';
import { InMemoryPaperImplementationValidationRepository } from '../repositories/in-memory-paper-implementation-validation-repository.js';
import { InMemoryPaperImplementationWorkOrderRepository } from '../repositories/in-memory-paper-implementation-workorder-repository.js';
import type {
  PaperImplementationRuntimeOperationalTelemetry,
} from '../services/paper-implementation-runtime-operational-telemetry.js';
import type {
  PaperImplementationBootstrapPersistence,
  PaperImplementationBootstrapResult,
  PaperImplementationRepository,
} from '../repositories/paper-implementation.repository.js';
import { BackendLlmGateway } from '../services/llm-gateway.js';
import { buildClaimCandidateProposal } from '../services/paper-implementation-p1-proposal-test-fixtures.js';

const TITLE_CARD_ID = 'title-card-near-prod-runtime-gate';
const PROJECT_ID = 'implementation-project-near-prod-runtime-gate';
const NOW = '2026-06-04T00:00:00.000Z';
const RUN_ID = normalizeId(
  process.env.PAPER_IMPLEMENTATION_NEAR_PROD_RUNTIME_GATE_RUN_ID
    ?? `near-prod-runtime-gate-${Date.now()}`,
);
const RESULT_PACKET_ID = `${RUN_ID}-result-packet`;
const RESULT_ANALYSIS_DOMAIN_PACKET_ID = `${RUN_ID}-result-analysis-domain-packet`;
const RESULT_ANALYSIS_VALIDATION_CYCLE_ID = `${RUN_ID}-result-analysis-validation-cycle`;
const RESULT_ANALYSIS_INPUT_SNAPSHOT_ID = `${RUN_ID}-result-analysis-input-snapshot`;
const RESULT_ANALYSIS_RUN_EVIDENCE_UNIT_ID = `${RUN_ID}-result-analysis-run-evidence`;
const RESULT_ANALYSIS_VALIDATION_REPORT_ID = `${RUN_ID}-result-analysis-validation-report`;
const RESULT_ANALYSIS_METRIC_ID = `${RUN_ID}-result-analysis-metric`;
const RESULT_ANALYSIS_WORK_ORDER_ID = `${RUN_ID}-result-analysis-work-order`;
const RESULT_ANALYSIS_MONITOR_INTAKE_ID = `${RUN_ID}-result-analysis-monitor-intake`;
const RESULT_ANALYSIS_TRACE_MANIFEST_ID = `${RUN_ID}-trace-manifest-result-analysis`;
const CLAIM_CANDIDATE_ID = `${RUN_ID}-claim-candidate`;
const CLAIM_TRACE_PACKET_ID = `${RUN_ID}-claim-trace-packet`;
const TRACE_MANIFEST_CLAIM_ID = `${RUN_ID}-trace-manifest-claim`;

class StaticProjectRepository implements PaperImplementationRepository {
  readonly project: ImplementationProject = {
    implementation_project_id: PROJECT_ID,
    intake_snapshot_id: `${RUN_ID}-intake-snapshot`,
    workspace_id: 'workspace-near-prod-runtime-gate',
    title_card_id: TITLE_CARD_ID,
    paper_project_bridge_id: `${RUN_ID}-paper-project-bridge`,
    bridge_payload_hash: hash('bridge-payload'),
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

test(
  'T-114 near-prod runtime gate exercises live provider, Prisma admission, and Domain Gate replay',
  {
    skip: process.env.T114_NEAR_PROD_RUNTIME_GATE === '1'
      ? false
      : 'set T114_NEAR_PROD_RUNTIME_GATE=1, DATABASE_URL, provider key, and migrated runtime/admission tables',
    timeout: 1_200_000,
  },
  async () => {
    await assertDatabaseReady();
    assertLiveProviderReady();
    const previousEnv = {
      PAPER_IMPLEMENTATION_REPOSITORY: process.env.PAPER_IMPLEMENTATION_REPOSITORY,
      AUTO_PULL_SCHEDULER_ENABLED: process.env.AUTO_PULL_SCHEDULER_ENABLED,
      BACKEND_TEST_PRESERVE_REAL_ENV: process.env.BACKEND_TEST_PRESERVE_REAL_ENV,
    };
    process.env.PAPER_IMPLEMENTATION_REPOSITORY = 'prisma';
    process.env.AUTO_PULL_SCHEDULER_ENABLED = 'false';
    process.env.BACKEND_TEST_PRESERVE_REAL_ENV = '1';

    const seeded = await seededDomainRepositories();
    const gateway = new BackendLlmGateway({
      defaultTimeoutMs: 300_000,
      defaultMaxRetries: 0,
    });
    const app = buildApp({
      paperImplementationRepository: seeded.projectRepository,
      paperImplementationTraceRepository: seeded.traceRepository,
      paperImplementationValidationRepository: seeded.validationRepository,
      paperImplementationWorkOrderRepository: seeded.workOrderRepository,
      paperImplementationResultClaimDossierRepository: seeded.resultRepository,
      paperImplementationTraceIntegrityDebateLlmGateway: gateway,
      paperImplementationP1RuntimeReviewLlmGateway: gateway,
      paperImplementationResultAnalysisLlmGateway: gateway,
      paperImplementationExperimentPlanningLlmGateway: gateway,
    });

    try {
      const providerId = liveProviderId();
      const traceCanary = await app.inject({
        method: 'POST',
        url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/trace-integrity-boundary-debate/run`,
        payload: traceIntegrityRunPayload(providerId),
      });
      const traceBody = assertProviderCanaryResponse(traceCanary, {
        expectedCallCount: 4,
        maxProviderCallCount: 8,
        expectedSlotId: PAPER_IMPLEMENTATION_TRACE_INTEGRITY_BOUNDARY_DEBATE_SLOT_ID,
      });

      const claimCanary = await app.inject({
        method: 'POST',
        url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/claim-boundary-debate/run`,
        payload: p1ProviderRunPayload('claim', providerId),
      });
      const claimBody = assertProviderCanaryResponse(claimCanary, {
        expectedCallCount: 3,
        maxProviderCallCount: 6,
        expectedSlotId: PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_SLOT_ID,
      });

      const dossierCanary = await app.inject({
        method: 'POST',
        url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/dossier-readiness-audit/run`,
        payload: p1ProviderRunPayload('dossier', providerId),
      });
      const dossierBody = assertProviderCanaryResponse(dossierCanary, {
        expectedCallCount: 3,
        maxProviderCallCount: 6,
        expectedSlotId: PAPER_IMPLEMENTATION_DOSSIER_READINESS_AUDIT_SLOT_ID,
      });

      const resultAnalysisCanary = await app.inject({
        method: 'POST',
        url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/result-analysis-scenarios/run`,
        payload: resultAnalysisProviderRunPayload(providerId),
      });
      const resultAnalysisBody = assertProviderCanaryResponse(resultAnalysisCanary, {
        expectedCallCount: 1,
        maxProviderCallCount: 2,
        expectedSlotId: PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SLOT_ID,
      });

      const experimentDesignCanary = await app.inject({
        method: 'POST',
        url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/experiment-design-work-order-draft/run`,
        payload: experimentPlanningProviderRunPayload('design', providerId),
      });
      const experimentDesignBody = assertProviderCanaryResponse(experimentDesignCanary, {
        expectedCallCount: 1,
        maxProviderCallCount: 2,
        expectedSlotId: PAPER_IMPLEMENTATION_EXPERIMENT_DESIGN_SLOT_ID,
        expectedStatus: 'passed',
        expectNoDomainGatePayload: true,
      });

      const experimentCritiqueCanary = await app.inject({
        method: 'POST',
        url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/experiment-critique-plan-critique/run`,
        payload: experimentPlanningProviderRunPayload('critique', providerId),
      });
      const experimentCritiqueBody = assertProviderCanaryResponse(experimentCritiqueCanary, {
        expectedCallCount: 1,
        maxProviderCallCount: 2,
        expectedSlotId: PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_SLOT_ID,
        expectedStatus: 'passed',
        expectNoDomainGatePayload: true,
      });

      assert.ok(experimentDesignBody.final_runtime_artifact);
      const experimentDesignMaterialize = await app.inject({
        method: 'POST',
        url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-artifacts/${encodeURIComponent(
          experimentDesignBody.final_runtime_artifact.runtime_artifact_id,
        )}/materialize-domain-gate`,
      });
      assert.equal(experimentDesignMaterialize.statusCode, 409);
      assert.equal(
        (experimentDesignMaterialize.json() as { error: { code: string } }).error.code,
        'GATE_CONSTRAINT_FAILED',
      );

      assert.ok(experimentCritiqueBody.final_runtime_artifact);
      const experimentCritiqueMaterialize = await app.inject({
        method: 'POST',
        url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-artifacts/${encodeURIComponent(
          experimentCritiqueBody.final_runtime_artifact.runtime_artifact_id,
        )}/materialize-domain-gate`,
      });
      assert.equal(experimentCritiqueMaterialize.statusCode, 409);
      assert.equal(
        (experimentCritiqueMaterialize.json() as { error: { code: string } }).error.code,
        'GATE_CONSTRAINT_FAILED',
      );

      const domainRun = await app.inject({
        method: 'POST',
        url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/claim-boundary-debate/run`,
        payload: p1MockedDomainGateRunPayload('domain-materialize'),
      });
      assert.equal(domainRun.statusCode, 201);
      const domainBody = domainRun.json() as {
        provider_call_count: number;
        final_runtime_artifact: PaperImplementationRuntimeArtifactEnvelope | null;
        final_admission_record: PaperImplementationRuntimeAdmissionRecord | null;
      };
      assert.equal(domainBody.provider_call_count, 0);
      assert.ok(domainBody.final_runtime_artifact);
      assert.equal(domainBody.final_admission_record?.admission_status, 'admitted');

      const materializePath = `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-artifacts/${encodeURIComponent(
        domainBody.final_runtime_artifact.runtime_artifact_id,
      )}/materialize-domain-gate`;
      const concurrent = await Promise.all([
        app.inject({ method: 'POST', url: materializePath }),
        app.inject({ method: 'POST', url: materializePath }),
      ]);
      const concurrentStatuses = concurrent.map((response) =>
        (response.json() as { status: string }).status).sort();
      assert.deepEqual(concurrentStatuses, ['already_materialized', 'materialized']);

      const replay = await app.inject({ method: 'POST', url: materializePath });
      assert.equal(replay.statusCode, 200);
      assert.equal((replay.json() as { status: string }).status, 'already_materialized');

      const driftRun = await app.inject({
        method: 'POST',
        url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/claim-boundary-debate/run`,
        payload: p1MockedDomainGateRunPayload('domain-drift', {
          claim_statement: 'Runtime drifted near-prod claim.',
        }),
      });
      assert.equal(driftRun.statusCode, 201);
      const driftBody = driftRun.json() as {
        final_runtime_artifact: PaperImplementationRuntimeArtifactEnvelope | null;
      };
      assert.ok(driftBody.final_runtime_artifact);
      const driftMaterialize = await app.inject({
        method: 'POST',
        url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-artifacts/${encodeURIComponent(
          driftBody.final_runtime_artifact.runtime_artifact_id,
        )}/materialize-domain-gate`,
      });
      assert.equal(driftMaterialize.statusCode, 409);
      assert.equal((driftMaterialize.json() as { error: { code: string } }).error.code, 'VERSION_CONFLICT');

      const resultDomainRun = await app.inject({
        method: 'POST',
        url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/result-analysis-scenarios/run`,
        payload: resultAnalysisMockedDomainGateRunPayload('result-domain-materialize'),
      });
      assert.equal(resultDomainRun.statusCode, 201);
      const resultDomainBody = resultDomainRun.json() as {
        provider_call_count: number;
        final_runtime_artifact: PaperImplementationRuntimeArtifactEnvelope | null;
        final_admission_record: PaperImplementationRuntimeAdmissionRecord | null;
      };
      assert.equal(resultDomainBody.provider_call_count, 0);
      assert.ok(resultDomainBody.final_runtime_artifact);
      assert.equal(resultDomainBody.final_admission_record?.admission_status, 'admitted');

      const resultMaterializePath = `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-artifacts/${encodeURIComponent(
        resultDomainBody.final_runtime_artifact.runtime_artifact_id,
      )}/materialize-domain-gate`;
      const resultMaterialize = await app.inject({ method: 'POST', url: resultMaterializePath });
      assert.equal(resultMaterialize.statusCode, 201);
      const resultMaterializeBody = resultMaterialize.json() as {
        status: string;
        domain_artifact_ref: TopicSelectionFunctionalRef;
      };
      assert.equal(resultMaterializeBody.status, 'materialized');
      assert.equal(resultMaterializeBody.domain_artifact_ref.ref_type, 'result_interpretation_packet');
      assert.equal(resultMaterializeBody.domain_artifact_ref.ref_id, RESULT_ANALYSIS_DOMAIN_PACKET_ID);

      const resultReplay = await app.inject({ method: 'POST', url: resultMaterializePath });
      assert.equal(resultReplay.statusCode, 200);
      assert.equal((resultReplay.json() as { status: string }).status, 'already_materialized');

      const resultDriftRun = await app.inject({
        method: 'POST',
        url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-slots/result-analysis-scenarios/run`,
        payload: resultAnalysisMockedDomainGateRunPayload('result-domain-drift', {
          result_summary: 'Runtime drifted near-prod result interpretation.',
        }),
      });
      assert.equal(resultDriftRun.statusCode, 201);
      const resultDriftBody = resultDriftRun.json() as {
        final_runtime_artifact: PaperImplementationRuntimeArtifactEnvelope | null;
      };
      assert.ok(resultDriftBody.final_runtime_artifact);
      const resultDriftMaterialize = await app.inject({
        method: 'POST',
        url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-artifacts/${encodeURIComponent(
          resultDriftBody.final_runtime_artifact.runtime_artifact_id,
        )}/materialize-domain-gate`,
      });
      assert.equal(resultDriftMaterialize.statusCode, 409);
      assert.equal(
        (resultDriftMaterialize.json() as { error: { code: string } }).error.code,
        'VERSION_CONFLICT',
      );

      const artifactList = await app.inject({
        method: 'GET',
        url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-artifacts?slot_id=${encodeURIComponent(
          PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_SLOT_ID,
        )}&artifact_scope=final`,
      });
      assert.equal(artifactList.statusCode, 200);
      const artifactItems = (artifactList.json() as { items: PaperImplementationRuntimeArtifactEnvelope[] }).items;
      assert.equal(
        artifactItems.some((artifact) =>
          artifact.runtime_artifact_id === domainBody.final_runtime_artifact?.runtime_artifact_id),
        true,
      );

      const admissionList = await app.inject({
        method: 'GET',
        url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-admission-records?runtime_artifact_id=${encodeURIComponent(
          domainBody.final_runtime_artifact.runtime_artifact_id,
        )}&admission_scope=final`,
      });
      assert.equal(admissionList.statusCode, 200);
      const admissionItems = (admissionList.json() as { items: PaperImplementationRuntimeAdmissionRecord[] }).items;
      assert.equal(admissionItems.length >= 1, true);
      await writeEvidence({
        route_evidence: {
          build_app_path: true,
          routes: [
            'POST /paper-implementation/projects/:implementation_project_id/runtime-slots/trace-integrity-boundary-debate/run',
            'POST /paper-implementation/projects/:implementation_project_id/runtime-slots/claim-boundary-debate/run',
            'POST /paper-implementation/projects/:implementation_project_id/runtime-slots/dossier-readiness-audit/run',
            'POST /paper-implementation/projects/:implementation_project_id/runtime-slots/result-analysis-scenarios/run',
            'POST /paper-implementation/projects/:implementation_project_id/runtime-slots/experiment-design-work-order-draft/run',
            'POST /paper-implementation/projects/:implementation_project_id/runtime-slots/experiment-critique-plan-critique/run',
            'POST /paper-implementation/projects/:implementation_project_id/runtime-artifacts/:runtime_artifact_id/materialize-domain-gate',
            'GET /paper-implementation/projects/:implementation_project_id/runtime-artifacts',
            'GET /paper-implementation/projects/:implementation_project_id/runtime-admission-records',
          ],
        },
        provider_evidence: {
          provider_id: providerId,
          gateway_path: 'TopicSelectionAgentOrchestratorService -> BackendLlmGateway',
          trace_integrity_provider_call_count: traceBody.provider_call_count,
          claim_boundary_provider_call_count: claimBody.provider_call_count,
          dossier_readiness_provider_call_count: dossierBody.provider_call_count,
          result_analysis_provider_call_count: resultAnalysisBody.provider_call_count,
          experiment_design_provider_call_count: experimentDesignBody.provider_call_count,
          experiment_critique_provider_call_count: experimentCritiqueBody.provider_call_count,
          profile_ids: [
            PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_PROFILE_ID,
            PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_PROFILE_ID,
            PAPER_IMPLEMENTATION_DOSSIER_READINESS_AUDIT_PROFILE_ID,
            PAPER_IMPLEMENTATION_RESULT_ANALYSIS_PROFILE_ID,
            PAPER_IMPLEMENTATION_EXPERIMENT_DESIGN_PROFILE_ID,
            PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_PROFILE_ID,
          ],
          raw_provider_response_persisted: false,
        },
        prisma_evidence: {
          repository_strategy: 'prisma',
          runtime_artifact_query_hit: true,
          final_artifact_query_count: artifactItems.length,
          final_admission_query_count: admissionItems.length,
        },
        idempotency_evidence: {
          concurrent_materialization_statuses: concurrentStatuses,
          replay_materialization_status: 'already_materialized',
          drift_materialization_error_code: 'VERSION_CONFLICT',
          domain_artifact_ref: (replay.json() as { domain_artifact_ref: TopicSelectionFunctionalRef }).domain_artifact_ref,
        },
        result_analysis_domain_gate_evidence: {
          materialization_status: resultMaterializeBody.status,
          replay_materialization_status: (resultReplay.json() as { status: string }).status,
          drift_materialization_error_code: (
            resultDriftMaterialize.json() as { error: { code: string } }
          ).error.code,
          domain_artifact_ref: resultMaterializeBody.domain_artifact_ref,
        },
        experiment_planning_boundary_evidence: {
          design_status: experimentDesignBody.status,
          critique_status: experimentCritiqueBody.status,
          design_final_no_domain_gate_request: !('domain_gate_request' in experimentDesignBody.final_runtime_artifact.artifact_payload),
          critique_final_no_domain_gate_request: !('domain_gate_request' in experimentCritiqueBody.final_runtime_artifact.artifact_payload),
          design_materialization_error_code: (
            experimentDesignMaterialize.json() as { error: { code: string } }
          ).error.code,
          critique_materialization_error_code: (
            experimentCritiqueMaterialize.json() as { error: { code: string } }
          ).error.code,
        },
        no_dual_track_evidence: {
          no_direct_provider_sdk: true,
          no_harness_proposal_artifact_substitution: true,
          no_runtime_envelope_write_route: true,
          domain_gate_called_via_http_route: true,
        },
        redaction_guardrails: {
          provider_key_values_written: false,
          prompt_text_written_to_summary: false,
          raw_provider_response_written_to_summary: false,
          hidden_reasoning_written_to_summary: false,
        },
      });
    } finally {
      await app.close();
      restoreEnv(previousEnv);
    }
  },
);

async function assertDatabaseReady(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  assert.ok(databaseUrl, 'DATABASE_URL is required for T-114 near-prod runtime gate.');
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  try {
    await prisma.$queryRaw`SELECT 1`;
    await prisma.$queryRaw`SELECT 1 FROM "PaperImplementationRuntimeArtifact" LIMIT 1`;
    await prisma.$queryRaw`SELECT 1 FROM "PaperImplementationRuntimeAdmissionRecord" LIMIT 1`;
  } finally {
    await prisma.$disconnect();
  }
}

function assertLiveProviderReady(): void {
  const providerId = liveProviderId();
  const keyName = providerId === 'dashscope' ? 'DASHSCOPE_API_KEY' : 'OPENAI_API_KEY';
  assert.ok(process.env[keyName]?.trim(), `${keyName} is required for T-114 near-prod runtime gate.`);
}

async function seededDomainRepositories() {
  const projectRepository = new StaticProjectRepository();
  const traceRepository = new InMemoryPaperImplementationTraceRepository();
  const validationRepository = new InMemoryPaperImplementationValidationRepository();
  const workOrderRepository = new InMemoryPaperImplementationWorkOrderRepository();
  const resultRepository = new InMemoryPaperImplementationResultClaimDossierRepository();
  await traceRepository.createTraceManifest(
    traceManifest(TRACE_MANIFEST_CLAIM_ID, 'claim_candidate', CLAIM_CANDIDATE_ID),
    [],
  );
  await traceRepository.createTraceManifest(
    traceManifest(RESULT_ANALYSIS_TRACE_MANIFEST_ID, 'result_interpretation_packet', RESULT_ANALYSIS_DOMAIN_PACKET_ID),
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
  // T-124 G5 FIX-A item 3: assertClaimSupport now resolves every run_evidence_unit
  // support ref against the project's REUs. The mocked claim-boundary canary
  // (nearProdClaimProposal) supports its claim with `${RUN_ID}-run-evidence`
  // (also the packet's cited evidence), so that REU must exist in the project.
  await workOrderRepository.recordMonitorIngestion({
    monitor_intake: claimSupportMonitorIntake(),
    run_evidence_unit: claimSupportRunEvidenceUnit(),
    work_order: null,
  });
  await traceRepository.createClaimTracePacket(claimTracePacket());
  await resultRepository.createResultInterpretationPacket(resultPacket());
  return {
    projectRepository,
    traceRepository,
    validationRepository,
    workOrderRepository,
    resultRepository,
  };
}

function traceIntegrityRunPayload(providerId: 'openai' | 'dashscope') {
  return {
    run_id: `${RUN_ID}-trace-live`,
    run_mode: 'product',
    execution_mode: 'provider_llm',
    model_profile_id: PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_PROFILE_ID,
    model_option_id: providerModelOptionId(PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_PROFILE_ID, providerId),
    target_ref: ref('claim_candidate', `${RUN_ID}-trace-claim`),
    target_version_id: `${RUN_ID}-trace-claim@v1`,
    input_snapshot_ref: ref('implementation_input_snapshot', `${RUN_ID}-trace-input`),
    input_snapshot_hash: hash(`${RUN_ID}-trace-input`),
    reviewed_statement_packet_ref: ref('trace_reviewed_statement_packet', `${RUN_ID}-statement-packet`),
    reviewed_statement_packet_hash: hash(`${RUN_ID}-statement-packet`),
    reviewed_statement_refs: [ref('reviewed_statement', `${RUN_ID}-statement`)],
    reviewed_statement_packets: [{
      statement_ref: ref('reviewed_statement', `${RUN_ID}-statement`),
      statement_hash: hash(`${RUN_ID}-statement-text`),
      statement_text: 'Near-prod live provider canary links runtime evidence to a bounded implementation result.',
      semantic_role: 'result_claim',
    }],
    // D2-core: three source refs (incl. the live canary) pin this near-prod
    // fixture to the STANDARD tier (packet_ref_count >= 3), matching the HTTP
    // route fixture. A single-ref fixture judged LIGHT and issued only 3 provider
    // calls whenever the live skeptic found nothing, which made the gate's
    // provider-call-count bound non-deterministic.
    source_refs: [
      ref('run_evidence_unit', `${RUN_ID}-trace-evidence`),
      ref('claim_trace_packet', `${RUN_ID}-trace-lineage`),
      ref('result_interpretation_packet', `${RUN_ID}-trace-interpretation`),
    ],
    source_hashes: [
      hash(`${RUN_ID}-trace-evidence`),
      hash(`${RUN_ID}-trace-lineage`),
      hash(`${RUN_ID}-trace-interpretation`),
    ],
    source_packets: [{
      source_ref: ref('run_evidence_unit', `${RUN_ID}-trace-evidence`),
      source_hash: hash(`${RUN_ID}-trace-evidence`),
      source_family: 'run_evidence',
      freshness_status: 'fresh',
      evidence_role: 'primary_result',
      content_summary: 'Near-prod route evidence supports the bounded runtime claim.',
      source_excerpt: 'near-prod route evidence supports the bounded runtime claim',
    }, {
      source_ref: ref('claim_trace_packet', `${RUN_ID}-trace-lineage`),
      source_hash: hash(`${RUN_ID}-trace-lineage`),
      source_family: 'claim_trace_packet',
      freshness_status: 'fresh',
      evidence_role: 'lineage',
      content_summary: 'Claim trace packet carries the claim-to-run lineage.',
      source_excerpt: 'claim lineage links the near-prod result to its validation runs',
    }, {
      source_ref: ref('result_interpretation_packet', `${RUN_ID}-trace-interpretation`),
      source_hash: hash(`${RUN_ID}-trace-interpretation`),
      source_family: 'result_packet',
      freshness_status: 'fresh',
      evidence_role: 'non_primary_interpretation',
      content_summary: 'Result interpretation packet, labeled non-primary evidence.',
      source_excerpt: 'interpretation: the near-prod gain is attributed to the method',
    }],
    preflight_blocker_codes: [],
  };
}

function p1ProviderRunPayload(kind: 'claim' | 'dossier', providerId: 'openai' | 'dashscope') {
  const claim = kind === 'claim';
  const profileId = claim
    ? PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_PROFILE_ID
    : PAPER_IMPLEMENTATION_DOSSIER_READINESS_AUDIT_PROFILE_ID;
  return {
    run_id: `${RUN_ID}-${claim ? 'claim' : 'dossier'}-live`,
    run_mode: 'product',
    execution_mode: 'provider_llm',
    model_profile_id: profileId,
    model_option_id: providerModelOptionId(profileId, providerId),
    target_ref: claim
      ? ref('result_interpretation_packet', `${RUN_ID}-live-result-packet`)
      : ref('implementation_dossier', `${RUN_ID}-live-dossier`),
    target_version_id: `${RUN_ID}-target@v1`,
    input_snapshot_ref: ref('implementation_input_snapshot', `${RUN_ID}-p1-input`),
    input_snapshot_hash: hash(`${RUN_ID}-p1-input`),
    // T-124 G4.6 structural context: every id the service assembles into the
    // Create*Request is a declared source ref.
    source_refs: claim
      ? [
        ref('result_interpretation_packet', `${RUN_ID}-live-result-packet`),
        ref('claim_trace_packet', `${RUN_ID}-live-claim-trace`),
        ref('claim_candidate', `${RUN_ID}-live-claim`),
        ref('trace_manifest', `${RUN_ID}-live-claim-trace-manifest`),
        ref('run_evidence_unit', `${RUN_ID}-run-evidence`),
      ]
      : [
        ref('claim_candidate', `${RUN_ID}-live-claim`),
        ref('claim_trace_packet', `${RUN_ID}-live-claim-trace`),
        ref('result_interpretation_packet', `${RUN_ID}-live-result-packet`),
        ref('trace_manifest', `${RUN_ID}-live-dossier-trace-manifest`),
      ],
    source_hashes: claim
      ? [
        hash(`${RUN_ID}-live-result-packet`),
        hash(`${RUN_ID}-live-claim-trace`),
        hash(`${RUN_ID}-live-claim`),
        hash(`${RUN_ID}-live-claim-trace-manifest`),
        hash(`${RUN_ID}-run-evidence`),
      ]
      : [
        hash(`${RUN_ID}-live-claim`),
        hash(`${RUN_ID}-live-claim-trace`),
        hash(`${RUN_ID}-live-result-packet`),
        hash(`${RUN_ID}-live-dossier-trace-manifest`),
      ],
    preflight_blocker_codes: [],
  };
}

function resultAnalysisProviderRunPayload(providerId: 'openai' | 'dashscope') {
  return {
    run_id: `${RUN_ID}-result-analysis-live`,
    run_mode: 'product',
    execution_mode: 'provider_llm',
    model_profile_id: PAPER_IMPLEMENTATION_RESULT_ANALYSIS_PROFILE_ID,
    model_option_id: providerModelOptionId(PAPER_IMPLEMENTATION_RESULT_ANALYSIS_PROFILE_ID, providerId),
    target_ref: ref('validation_cycle', `${RUN_ID}-validation-cycle-live`),
    target_version_id: `${RUN_ID}-result-analysis-target@v1`,
    input_snapshot_ref: ref('implementation_input_snapshot', `${RUN_ID}-result-analysis-input`),
    input_snapshot_hash: hash(`${RUN_ID}-result-analysis-input`),
    // T-124 G4.6 structural context refs (service-assembled Create request).
    source_refs: [
      ref('run_evidence_unit', `${RUN_ID}-run-evidence`),
      ref('result_validation_report', `${RUN_ID}-validation-report`),
      ref('result_interpretation_packet', `${RUN_ID}-live-result-analysis-packet`),
      ref('trace_manifest', `${RUN_ID}-live-result-analysis-trace-manifest`),
    ],
    source_hashes: [
      hash(`${RUN_ID}-run-evidence`),
      hash(`${RUN_ID}-validation-report`),
      hash(`${RUN_ID}-live-result-analysis-packet`),
      hash(`${RUN_ID}-live-result-analysis-trace-manifest`),
    ],
    preflight_blocker_codes: [],
  };
}

function experimentPlanningProviderRunPayload(
  kind: 'design' | 'critique',
  providerId: 'openai' | 'dashscope',
) {
  const design = kind === 'design';
  const profileId = design
    ? PAPER_IMPLEMENTATION_EXPERIMENT_DESIGN_PROFILE_ID
    : PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_PROFILE_ID;
  return {
    run_id: `${RUN_ID}-${design ? 'experiment-design' : 'experiment-critique'}-live`,
    run_mode: 'product',
    execution_mode: 'provider_llm',
    model_profile_id: profileId,
    model_option_id: providerModelOptionId(profileId, providerId),
    target_ref: design
      ? ref('validation_cycle', `${RUN_ID}-experiment-validation-cycle-live`)
      : ref('experiment_plan_light', `${RUN_ID}-experiment-plan-live`),
    target_version_id: `${RUN_ID}-${design ? 'experiment-design' : 'experiment-critique'}-target@v1`,
    input_snapshot_ref: ref('implementation_input_snapshot', `${RUN_ID}-experiment-planning-input`),
    input_snapshot_hash: hash(`${RUN_ID}-experiment-planning-input`),
    source_refs: [
      ref('technical_route_candidate', `${RUN_ID}-route-candidate`),
      ref('feasibility_probe', `${RUN_ID}-feasibility-probe`),
      ref('experiment_plan_light', `${RUN_ID}-experiment-plan-light`),
      ref('metric', `${RUN_ID}-primary-metric`),
      ref('dataset_version', `${RUN_ID}-dataset`),
      ref('baseline_version', `${RUN_ID}-baseline`),
      ref('code_version', `${RUN_ID}-code`),
      ref('config_snapshot', `${RUN_ID}-config`),
      ref('validation_budget', `${RUN_ID}-budget`),
      ref('stop_condition', `${RUN_ID}-stop-condition`),
    ],
    source_hashes: [
      hash(`${RUN_ID}-route-candidate`),
      hash(`${RUN_ID}-feasibility-probe`),
      hash(`${RUN_ID}-experiment-plan-light`),
      hash(`${RUN_ID}-primary-metric`),
      hash(`${RUN_ID}-dataset`),
      hash(`${RUN_ID}-baseline`),
      hash(`${RUN_ID}-code`),
      hash(`${RUN_ID}-config`),
      hash(`${RUN_ID}-budget`),
      hash(`${RUN_ID}-stop-condition`),
    ],
    source_context_packets: experimentPlanningSourceContextPackets(),
    preflight_blocker_codes: [],
  };
}

function experimentPlanningSourceContextPackets() {
  return [
    {
      source_ref: ref('technical_route_candidate', `${RUN_ID}-route-candidate`),
      evidence_kind: 'technical_route_candidate',
      content_summary: 'Route uses a deterministic RAG runtime evaluation with isolated confirmatory and exploratory branches.',
      key_facts: [
        'Confirmatory branch evaluates the frozen RAG runtime on dataset version near-prod-dataset-v1.',
        'Exploratory branch may inspect prompt ablations but cannot affect confirmatory pass/fail.',
      ],
    },
    {
      source_ref: ref('experiment_plan_light', `${RUN_ID}-experiment-plan-light`),
      evidence_kind: 'experiment_plan_light',
      content_summary: 'Plan draft separates confirmatory accuracy, latency, and faithfulness checks from exploratory follow-up analysis.',
      key_facts: [
        'Primary confirmatory metric is exact-match accuracy on the frozen validation split.',
        'Secondary metrics are retrieval recall, answer faithfulness, and p95 latency.',
        'The plan uses baseline version near-prod-baseline-v1 and code version near-prod-code-v1.',
        'No WorkOrder is created by this runtime; it only emits admitted draft or critique artifacts.',
      ],
    },
    {
      source_ref: ref('validation_budget', `${RUN_ID}-budget`),
      evidence_kind: 'validation_budget',
      content_summary: 'Budget caps the confirmatory run to one dataset pass, one baseline comparison, and no live experiment submission.',
      key_facts: [
        'Compute budget is bounded to a single dry-run-sized validation cycle.',
        'Stop condition is triggered by budget exhaustion, provider failure, or missing dataset/baseline refs.',
      ],
    },
    {
      source_ref: ref('dataset_version', `${RUN_ID}-dataset`),
      evidence_kind: 'dataset_metric_alignment',
      content_summary: 'Dataset, metric, baseline, code, and config refs are all present and aligned to the same near-prod validation cycle.',
      key_facts: [
        'Dataset ref, baseline ref, code ref, config ref, metric ref, and stop-condition ref are all included in source_refs.',
        'The critique should verify these refs and may approve if no blocking mismatch remains.',
      ],
    },
  ];
}

function p1MockedDomainGateRunPayload(
  suffix: string,
  proposalOverrides: Partial<NonNullable<PaperImplementationP1RuntimeReviewRoleOutput['claim_proposal']>> = {},
) {
  const finalProposal = {
    ...nearProdClaimProposal(),
    ...proposalOverrides,
  };
  return {
    run_id: `${RUN_ID}-${suffix}`,
    run_mode: 'dry_run',
    execution_mode: 'mocked_llm',
    model_profile_id: PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_PROFILE_ID,
    target_ref: ref('result_interpretation_packet', RESULT_PACKET_ID),
    target_version_id: `${RESULT_PACKET_ID}@v1`,
    input_snapshot_ref: ref('implementation_input_snapshot', `${RUN_ID}-domain-input`),
    input_snapshot_hash: hash(`${RUN_ID}-domain-input`),
    // T-124 G4.6 structural context: claim id + trace manifest ride source_refs.
    source_refs: [
      ref('result_interpretation_packet', RESULT_PACKET_ID),
      ref('claim_trace_packet', CLAIM_TRACE_PACKET_ID),
      ref('claim_candidate', CLAIM_CANDIDATE_ID),
      ref('trace_manifest', TRACE_MANIFEST_CLAIM_ID),
      ref('run_evidence_unit', `${RUN_ID}-run-evidence`),
    ],
    source_hashes: [
      hash(RESULT_PACKET_ID),
      hash(CLAIM_TRACE_PACKET_ID),
      hash(CLAIM_CANDIDATE_ID),
      hash(TRACE_MANIFEST_CLAIM_ID),
      hash(`${RUN_ID}-run-evidence`),
    ],
    mocked_role_outputs: Object.fromEntries(
      PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_REVIEW_ROLE_SLOT_IDS.map((slotId) => [
        slotId,
        claimBoundaryRoleOutput(slotId, finalProposal),
      ]),
    ),
  };
}

function resultAnalysisMockedDomainGateRunPayload(
  suffix: string,
  interpretationOverrides: Partial<NonNullable<PaperImplementationResultAnalysisRoleOutput['interpretation']>> = {},
) {
  return {
    run_id: `${RUN_ID}-${suffix}`,
    run_mode: 'dry_run',
    execution_mode: 'mocked_llm',
    model_profile_id: PAPER_IMPLEMENTATION_RESULT_ANALYSIS_PROFILE_ID,
    target_ref: ref('validation_cycle', RESULT_ANALYSIS_VALIDATION_CYCLE_ID),
    target_version_id: `${RESULT_ANALYSIS_VALIDATION_CYCLE_ID}@v1`,
    input_snapshot_ref: ref('implementation_input_snapshot', RESULT_ANALYSIS_INPUT_SNAPSHOT_ID),
    input_snapshot_hash: hash(RESULT_ANALYSIS_INPUT_SNAPSHOT_ID),
    // T-124 G4.6 structural context: packet id + trace manifest + metric ride source_refs.
    source_refs: [
      ref('run_evidence_unit', RESULT_ANALYSIS_RUN_EVIDENCE_UNIT_ID),
      ref('result_validation_report', RESULT_ANALYSIS_VALIDATION_REPORT_ID),
      ref('result_interpretation_packet', RESULT_ANALYSIS_DOMAIN_PACKET_ID),
      ref('trace_manifest', RESULT_ANALYSIS_TRACE_MANIFEST_ID),
      ref('metric', RESULT_ANALYSIS_METRIC_ID),
    ],
    source_hashes: [
      hash(RESULT_ANALYSIS_RUN_EVIDENCE_UNIT_ID),
      hash(RESULT_ANALYSIS_VALIDATION_REPORT_ID),
      hash(RESULT_ANALYSIS_DOMAIN_PACKET_ID),
      hash(RESULT_ANALYSIS_TRACE_MANIFEST_ID),
      hash(RESULT_ANALYSIS_METRIC_ID),
    ],
    preflight_blocker_codes: [],
    mocked_role_outputs: {
      [PAPER_IMPLEMENTATION_RESULT_ANALYSIS_ROLE_SLOT_ID]: resultAnalysisRoleOutput(interpretationOverrides),
    },
  };
}

function assertProviderCanaryResponse(
  response: Awaited<ReturnType<ReturnType<typeof buildApp>['inject']>>,
  options: {
    expectedCallCount: number;
    maxProviderCallCount?: number;
    expectedSlotId: string;
    expectedStatus?: string;
    expectNoDomainGatePayload?: boolean;
  },
): {
  status: string;
  provider_call_count: number;
  runtime_artifacts: PaperImplementationRuntimeArtifactEnvelope[];
  admission_records: PaperImplementationRuntimeAdmissionRecord[];
  final_runtime_artifact: PaperImplementationRuntimeArtifactEnvelope | null;
  final_admission_record: PaperImplementationRuntimeAdmissionRecord | null;
  operational_telemetry: PaperImplementationRuntimeOperationalTelemetry;
} {
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
  assert.notEqual(body.status, 'failed_runtime');
  if (options.expectedStatus) {
    assert.equal(body.status, options.expectedStatus);
  }
  const maxProviderCallCount = options.maxProviderCallCount ?? options.expectedCallCount;
  assert.equal(body.provider_call_count >= options.expectedCallCount, true);
  assert.equal(body.provider_call_count <= maxProviderCallCount, true);
  assert.equal(body.operational_telemetry.provider_call_count, body.provider_call_count);
  assert.equal(body.operational_telemetry.role_provider_call_count, body.provider_call_count);
  assert.equal(body.operational_telemetry.final_provider_call_count, body.provider_call_count);
  assert.equal(body.operational_telemetry.provider_call_count_consistent, true);
  assert.equal(body.operational_telemetry.rejected_admission_count, 0);
  assert.equal(body.operational_telemetry.non_provider_artifact_count, 0);
  assert.equal(body.runtime_artifacts.every((artifact) => artifact.slot_id === options.expectedSlotId), true);
  assert.equal(body.runtime_artifacts.some((artifact) => artifact.runtime_status === 'failed_runtime'), false);
  assert.equal(body.admission_records.every((record) => record.admission_status === 'admitted'), true);
  assert.equal(body.final_admission_record?.admission_status, 'admitted');
  if (options.expectNoDomainGatePayload) {
    assert.ok(body.final_runtime_artifact);
    assert.equal('domain_gate_request' in body.final_runtime_artifact.artifact_payload, false);
    assert.equal(body.final_runtime_artifact.artifact_payload.no_execution_side_effect, true);
  }
  return body;
}

function claimBoundaryRoleOutput(
  roleSlotId: string,
  finalProposal: NonNullable<PaperImplementationP1RuntimeReviewRoleOutput['claim_proposal']>,
): PaperImplementationP1RuntimeReviewRoleOutput {
  const final = roleSlotId.endsWith('final');
  return {
    role_slot_id: roleSlotId as PaperImplementationP1RuntimeReviewRoleOutput['role_slot_id'],
    role_status: 'passed',
    summary: `Near-prod runtime role ${roleSlotId} passed.`,
    cited_source_refs: [ref('result_interpretation_packet', RESULT_PACKET_ID)],
    blocker_codes: [],
    warning_codes: [],
    // T-124 G4.6: the adjudicator proposes typed semantic content; the runtime
    // service assembles the CreateClaimCandidateRequest from the request context.
    claim_proposal: final ? structuredClone(finalProposal) : null,
    dossier_proposal: null,
    scenario_outputs: [],
  };
}

function nearProdClaimProposal(): NonNullable<PaperImplementationP1RuntimeReviewRoleOutput['claim_proposal']> {
  return buildClaimCandidateProposal({
    claim_statement: 'Near-prod runtime gate materialized a bounded claim.',
    claim_strength: 'moderate',
    support_refs: [ref('run_evidence_unit', `${RUN_ID}-run-evidence`)],
    scope: {
      population_scope: 'near-prod route smoke',
      method_scope: 'PaperImplementation runtime orchestration',
      dataset_scope: 'fixture dataset',
      metric_scope: 'runtime admission correctness',
      negative_scope_notes: [],
      excluded_scope_notes: [],
    },
    boundary_rationale: 'Bounded to near-prod route smoke evidence.',
    forbidden_overclaims: ['broad generalization'],
  });
}

function resultAnalysisRoleOutput(
  interpretationOverrides: Partial<NonNullable<PaperImplementationResultAnalysisRoleOutput['interpretation']>> = {},
): PaperImplementationResultAnalysisRoleOutput {
  return {
    role_slot_id: PAPER_IMPLEMENTATION_RESULT_ANALYSIS_ROLE_SLOT_ID,
    role_status: 'passed',
    summary: 'Near-prod result-analysis runtime produced bounded interpretation scenarios.',
    cited_source_refs: [
      ref('run_evidence_unit', RESULT_ANALYSIS_RUN_EVIDENCE_UNIT_ID),
      ref('result_validation_report', RESULT_ANALYSIS_VALIDATION_REPORT_ID),
    ],
    blocker_codes: [],
    warning_codes: [],
    scenario_outputs: PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SCENARIO_KINDS.map((kind) => ({
      scenario_id: `${RUN_ID}-${kind}-scenario`,
      scenario_kind: kind,
      summary: `${kind} scenario for near-prod result analysis Domain Gate.`,
      support_refs: [ref('run_evidence_unit', RESULT_ANALYSIS_RUN_EVIDENCE_UNIT_ID)],
      challenge_refs: [ref('result_validation_report', RESULT_ANALYSIS_VALIDATION_REPORT_ID)],
      limitation_refs: [ref('limitation', `${RUN_ID}-${kind}-limitation`)],
      forbidden_overclaims: ['broad generalization'],
      recommended_claim_refs: [ref('claim_candidate', `${RUN_ID}-${kind}-claim`)],
      required_followup_refs: [ref('validation_feedback_item', `${RUN_ID}-${kind}-followup`)],
    })),
    // T-124 G4.6: typed SEMANTIC blocks; the runtime service assembles the
    // CreateResultInterpretationPacketRequest from the request context.
    interpretation: {
      result_summary: 'The near-prod result-analysis runtime route supports a bounded result interpretation.',
      supports_assertion_refs: [ref('motive_assertion', `${RUN_ID}-result-analysis-assertion`)],
      challenges_assertion_refs: [],
      unexpected_findings: [],
      failed_run_refs: [],
      inconclusive_run_refs: [],
      stale_or_invalidated_evidence_refs: [],
      failed_runs_accounted_for: true,
      inconclusive_runs_accounted_for: true,
      exploratory_confirmatory_separated: true,
      ...interpretationOverrides,
    },
    reliability: {
      failed_runs_retained: true,
      confound_refs: [],
      limitation_refs: [ref('limitation', `${RUN_ID}-result-analysis-limitation`)],
      reliability_notes: [],
    },
    claim_implications: {
      allowed_claim_ceiling: 'moderate',
      forbidden_overclaims: ['broad generalization'],
      recommended_claim_refs: [],
      required_followup_refs: [],
    },
  };
}

function resultAnalysisInputSnapshot(): ValidationCycleInputSnapshot {
  return {
    input_snapshot_id: RESULT_ANALYSIS_INPUT_SNAPSHOT_ID,
    implementation_project_id: PROJECT_ID,
    context_policy_version_id: 'policy-v1',
    included_refs: {
      motive_version_refs: [],
      board_version_refs: [],
      evidence_refs: [ref('run_evidence_unit', RESULT_ANALYSIS_RUN_EVIDENCE_UNIT_ID)],
      route_refs: [],
      work_order_refs: [ref('research_work_order', RESULT_ANALYSIS_WORK_ORDER_ID)],
      result_packet_refs: [],
      experiment_plan_light_refs: [],
    },
    excluded_context_notes: [],
    input_snapshot_hash: hash(RESULT_ANALYSIS_INPUT_SNAPSHOT_ID),
    created_by: 'system',
    created_at: NOW,
  };
}

function resultAnalysisValidationCycle(): ValidationCycle {
  const context = resultAnalysisInputSnapshot();
  return {
    validation_cycle_id: RESULT_ANALYSIS_VALIDATION_CYCLE_ID,
    implementation_project_id: PROJECT_ID,
    input_snapshot_id: RESULT_ANALYSIS_INPUT_SNAPSHOT_ID,
    target: {
      target_type: 'result_interpretation',
      target_id: RESULT_ANALYSIS_DOMAIN_PACKET_ID,
      target_version_id: `${RESULT_ANALYSIS_DOMAIN_PACKET_ID}@v1`,
    },
    trigger: {
      trigger_type: 'experiment_result',
      trigger_refs: [ref('run_evidence_unit', RESULT_ANALYSIS_RUN_EVIDENCE_UNIT_ID)],
    },
    cycle_type: 'result_interpretation',
    validation_frame: {
      validation_question: 'Does near-prod result-analysis evidence support a bounded interpretation?',
      assumptions_under_test: ['runtime admission is complete before Domain Gate materialization'],
      assertions_under_test: [ref('motive_assertion', `${RUN_ID}-result-analysis-assertion`)],
      decision_if_pass: 'materialize bounded result interpretation',
      decision_if_fail: 'block result interpretation',
      decision_if_inconclusive: 'retain inconclusive evidence and follow up',
      expected_information_gain: 'medium',
      why_this_cycle_now: 'near-prod runtime gate verifies HTTP materialization for result analysis',
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
      budget_id: `${RUN_ID}-result-analysis-budget`,
      retry_budget: 1,
    },
    lifecycle_status: 'completed',
    execution_status: 'completed',
    outputs: {
      evidence_unit_refs: [ref('run_evidence_unit', RESULT_ANALYSIS_RUN_EVIDENCE_UNIT_ID)],
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
      rationale: 'Seeded near-prod evidence is trusted and bounded.',
    },
    trace_manifest_ref: ref('trace_manifest', RESULT_ANALYSIS_TRACE_MANIFEST_ID),
    trace_manifest_id: RESULT_ANALYSIS_TRACE_MANIFEST_ID,
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
    monitor_intake_id: RESULT_ANALYSIS_MONITOR_INTAKE_ID,
    implementation_project_id: PROJECT_ID,
    work_order_id: RESULT_ANALYSIS_WORK_ORDER_ID,
    external_job_ref: ref('external_job', `${RUN_ID}-result-analysis-job`),
    external_job_hash: hash(`${RUN_ID}-result-analysis-job`),
    monitor_event_kind: 'result_available',
    run_status: 'succeeded',
    trust_status: 'trusted',
    result_ref: ref('run_result', `${RUN_ID}-result-analysis-run-result`),
    result_hash: hash(`${RUN_ID}-result-analysis-run-result`),
    result_validation_report_ref: ref('result_validation_report', RESULT_ANALYSIS_VALIDATION_REPORT_ID),
    result_validation_report_hash: hash(RESULT_ANALYSIS_VALIDATION_REPORT_ID),
    evidence_candidate_refs: [],
    evidence_candidate_hashes: [],
    raw_payload: { redacted_fixture: true },
    received_at: NOW,
    created_by: 'system',
  };
}

function resultAnalysisRunEvidenceUnit(): RunEvidenceUnit {
  return {
    run_evidence_unit_id: RESULT_ANALYSIS_RUN_EVIDENCE_UNIT_ID,
    implementation_project_id: PROJECT_ID,
    work_order_id: RESULT_ANALYSIS_WORK_ORDER_ID,
    validation_cycle_id: RESULT_ANALYSIS_VALIDATION_CYCLE_ID,
    monitor_intake_id: RESULT_ANALYSIS_MONITOR_INTAKE_ID,
    external_job_ref: ref('external_job', `${RUN_ID}-result-analysis-job`),
    external_job_hash: hash(`${RUN_ID}-result-analysis-job`),
    run_type: 'confirmatory',
    run_status: 'succeeded',
    trusted_status: 'trusted',
    dataset_version_refs: [ref('dataset_version', `${RUN_ID}-dataset`)],
    baseline_version_refs: [ref('baseline_version', `${RUN_ID}-baseline`)],
    code_version_refs: [ref('code_version', `${RUN_ID}-code`)],
    config_refs: [ref('config_snapshot', `${RUN_ID}-config`)],
    result_ref: ref('run_result', `${RUN_ID}-result-analysis-run-result`),
    result_hash: hash(`${RUN_ID}-result-analysis-run-result`),
    result_validation_report_ref: ref('result_validation_report', RESULT_ANALYSIS_VALIDATION_REPORT_ID),
    result_validation_report_hash: hash(RESULT_ANALYSIS_VALIDATION_REPORT_ID),
    evidence_candidate_refs: [],
    evidence_candidate_hashes: [],
    trace_manifest_ref: ref('trace_manifest', RESULT_ANALYSIS_TRACE_MANIFEST_ID),
    trace_manifest_id: RESULT_ANALYSIS_TRACE_MANIFEST_ID,
    created_by: 'system',
    created_at: NOW,
  };
}

function claimSupportMonitorIntake(): RunMonitorIntakeRecord {
  return {
    monitor_intake_id: `${RUN_ID}-claim-support-intake`,
    implementation_project_id: PROJECT_ID,
    work_order_id: RESULT_ANALYSIS_WORK_ORDER_ID,
    external_job_ref: ref('external_job', `${RUN_ID}-claim-support-job`),
    external_job_hash: hash(`${RUN_ID}-claim-support-job`),
    monitor_event_kind: 'result_available',
    run_status: 'succeeded',
    trust_status: 'trusted',
    result_ref: ref('run_result', `${RUN_ID}-run-evidence-run-result`),
    result_hash: hash(`${RUN_ID}-run-evidence-run-result`),
    result_validation_report_ref: ref('result_validation_report', `${RUN_ID}-validation-report`),
    result_validation_report_hash: hash(`${RUN_ID}-validation-report`),
    evidence_candidate_refs: [],
    evidence_candidate_hashes: [],
    raw_payload: { redacted_fixture: true },
    received_at: NOW,
    created_by: 'system',
  };
}

function claimSupportRunEvidenceUnit(): RunEvidenceUnit {
  return {
    run_evidence_unit_id: `${RUN_ID}-run-evidence`,
    implementation_project_id: PROJECT_ID,
    work_order_id: RESULT_ANALYSIS_WORK_ORDER_ID,
    validation_cycle_id: RESULT_ANALYSIS_VALIDATION_CYCLE_ID,
    monitor_intake_id: `${RUN_ID}-claim-support-intake`,
    external_job_ref: ref('external_job', `${RUN_ID}-claim-support-job`),
    external_job_hash: hash(`${RUN_ID}-claim-support-job`),
    run_type: 'confirmatory',
    run_status: 'succeeded',
    trusted_status: 'trusted',
    dataset_version_refs: [ref('dataset_version', `${RUN_ID}-dataset`)],
    baseline_version_refs: [ref('baseline_version', `${RUN_ID}-baseline`)],
    code_version_refs: [ref('code_version', `${RUN_ID}-code`)],
    config_refs: [ref('config_snapshot', `${RUN_ID}-config`)],
    result_ref: ref('run_result', `${RUN_ID}-run-evidence-run-result`),
    result_hash: hash(`${RUN_ID}-run-evidence-run-result`),
    result_validation_report_ref: ref('result_validation_report', `${RUN_ID}-validation-report`),
    result_validation_report_hash: hash(`${RUN_ID}-validation-report`),
    evidence_candidate_refs: [],
    evidence_candidate_hashes: [],
    trace_manifest_ref: ref('trace_manifest', RESULT_ANALYSIS_TRACE_MANIFEST_ID),
    trace_manifest_id: RESULT_ANALYSIS_TRACE_MANIFEST_ID,
    created_by: 'system',
    created_at: NOW,
  };
}

function resultPacket(): ResultInterpretationPacket {
  return {
    result_interpretation_packet_id: RESULT_PACKET_ID,
    implementation_project_id: PROJECT_ID,
    validation_cycle_id: `${RUN_ID}-validation-cycle`,
    experiment_plan_light_id: null,
    source: {
      run_evidence_refs: [ref('run_evidence_unit', `${RUN_ID}-run-evidence`)],
      validation_report_refs: [ref('result_validation_report', `${RUN_ID}-validation-report`)],
      metric_refs: [ref('metric', `${RUN_ID}-metric`)],
      failed_run_refs: [],
      inconclusive_run_refs: [],
      stale_or_invalidated_evidence_refs: [],
    },
    result_summary: {
      result_summary: 'The near-prod runtime route supports a bounded implementation claim.',
      supports_assertion_refs: [ref('motive_assertion', `${RUN_ID}-assertion`)],
      challenges_assertion_refs: [],
      unexpected_findings: [],
      failed_runs_accounted_for: true,
      inconclusive_runs_accounted_for: true,
      exploratory_confirmatory_separated: true,
    },
    reliability: {
      failed_runs_retained: true,
      confound_refs: [],
      limitation_refs: [],
      reliability_notes: [],
    },
    claim_implications: {
      allowed_claim_ceiling: 'moderate',
      forbidden_overclaims: ['broad generalization'],
      recommended_claim_refs: [],
      required_followup_refs: [],
    },
    interpretation_gate_status: 'passed',
    trace_manifest_ref: ref('trace_manifest', `${RUN_ID}-trace-manifest-result`),
    trace_manifest_id: `${RUN_ID}-trace-manifest-result`,
    policy_version_id: 'policy-v1',
    created_by: 'system',
    created_at: NOW,
  };
}

function claimTracePacket(): ClaimTracePacket {
  return {
    claim_trace_packet_id: CLAIM_TRACE_PACKET_ID,
    implementation_project_id: PROJECT_ID,
    claim_ref: ref('claim_candidate', CLAIM_CANDIDATE_ID),
    claim_statement: 'Near-prod runtime gate materialized a bounded claim.',
    trace_manifest_id: TRACE_MANIFEST_CLAIM_ID,
    trace_manifest_ref: ref('trace_manifest', TRACE_MANIFEST_CLAIM_ID),
    lineage: emptyLineage(),
    challenge: {
      challenging_result_refs: [],
      counter_evidence_refs: [],
      unresolved_objections: [],
    },
    scope: {
      task_scope: 'near-prod route smoke',
      method_scope: 'PaperImplementation runtime orchestration',
      dataset_scope: 'fixture dataset',
      evaluation_scope: 'runtime admission correctness',
      baseline_scope: null,
    },
    boundary: {
      forbidden_overclaims: ['broad generalization'],
      claim_strength: 'moderate',
      human_confirmation_required: false,
    },
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

function providerModelOptionId(profileId: string, providerId: 'openai' | 'dashscope'): string {
  return providerId === 'dashscope'
    ? `${profileId}.dashscope-thinking-budget`
    : `${profileId}.openai-balanced`;
}

function liveProviderId(): 'openai' | 'dashscope' {
  return process.env.PAPER_IMPLEMENTATION_PROVIDER_CANARY_PROVIDER_ID === 'dashscope'
    ? 'dashscope'
    : 'openai';
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
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function normalizeId(value: string): string {
  return value.trim().replace(/[^A-Za-z0-9_-]/gu, '_') || `near-prod-runtime-gate-${Date.now()}`;
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

async function writeEvidence(evidence: unknown): Promise<void> {
  const evidencePath = process.env.T114_NEAR_PROD_RUNTIME_GATE_EVIDENCE_PATH;
  if (!evidencePath?.trim()) {
    return;
  }
  await fs.writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
}
