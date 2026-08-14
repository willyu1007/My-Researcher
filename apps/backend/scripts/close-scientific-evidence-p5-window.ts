#!/usr/bin/env node

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { PrismaClient } from '@prisma/client';
import {
  PAPER_IMPLEMENTATION_RESULT_ANALYSIS_PROFILE_ID,
  PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SLOT_ID,
  type PaperImplementationRuntimeAdmissionRecord,
  type PaperImplementationRuntimeArtifactEnvelope,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-runtime-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import {
  PrismaExperimentFoundationSpineV2Repository,
} from '../src/repositories/prisma/prisma-experiment-foundation-spine-v2-repository.js';
import {
  PrismaPaperImplementationCycleReadinessV2Repository,
} from '../src/repositories/prisma/prisma-paper-implementation-cycle-readiness-v2-repository.js';
import {
  PrismaPaperImplementationExperimentSpineV2Repository,
} from '../src/repositories/prisma/prisma-paper-implementation-experiment-spine-v2-repository.js';
import {
  PrismaPaperImplementationRepository,
} from '../src/repositories/prisma/prisma-paper-implementation-repository.js';
import {
  PrismaPaperImplementationResultClaimDossierRepository,
} from '../src/repositories/prisma/prisma-paper-implementation-result-claim-dossier-repository.js';
import {
  PrismaPaperImplementationRuntimeRepository,
} from '../src/repositories/prisma/prisma-paper-implementation-runtime-repository.js';
import {
  PrismaPaperImplementationValidationCycleClosureV2Repository,
} from '../src/repositories/prisma/prisma-paper-implementation-validation-cycle-closure-v2-repository.js';
import {
  ExperimentV2IntegrationRelayService,
} from '../src/services/experiment-v2-integration-relay-service.js';
import {
  PaperImplementationCycleReadinessV2Service,
} from '../src/services/paper-implementation-cycle-readiness-v2-service.js';
import {
  PaperImplementationProjectionFeedV2Consumer,
} from '../src/services/paper-implementation-projection-feed-v2-consumer.js';
import {
  PaperImplementationResultAnalysisRuntimeService,
} from '../src/services/paper-implementation-result-analysis-runtime-service.js';
import {
  PaperImplementationResultPacketV2Materializer,
  PaperImplementationValidationCycleClosedCompositeConsumer,
} from '../src/services/paper-implementation-result-packet-v2-materializer.js';
import {
  PaperImplementationRuntimeAdmissionService,
} from '../src/services/paper-implementation-runtime-admission-service.js';
import {
  PaperImplementationScientificClosureContextService,
} from '../src/services/paper-implementation-scientific-closure-context-service.js';
import {
  PaperImplementationValidationCycleClosureV2Service,
} from '../src/services/paper-implementation-validation-cycle-closure-v2-service.js';
import {
  TopicSelectionAgentOrchestratorService,
} from '../src/services/topic-selection-agent-orchestrator-service.js';
import {
  TopicSelectionModelProfileRegistryService,
} from '../src/services/topic-selection-model-profile-registry-service.js';
import {
  assertScientificEvidenceP5AuthorizationAcceptanceV3,
  assertScientificEvidenceP5PreparedAuthorizationV3,
  type ScientificEvidenceP5AuthorizationAcceptanceV3,
  type ScientificEvidenceP5PreparedAuthorizationV3,
} from '../src/services/scientific-evidence-p5-authorization-service.js';
import {
  assertScientificEvidenceP5CredentialQualificationV1,
  type ScientificEvidenceP5CredentialQualificationV1,
} from '../src/services/scientific-evidence-p5-credential-qualification-service.js';
import {
  runScientificEvidenceP5ClaimedStageV1,
  scientificEvidenceP5TerminalReasonCode,
  type ScientificEvidenceP5AttemptBindingV1,
} from '../src/services/scientific-evidence-p5-attempt-terminal-service.js';
import {
  assertScientificEvidenceP5ClosureWindow,
} from '../src/services/scientific-evidence-p5-operational-timeline-service.js';
import {
  assertExperimentFoundationLiveNamedLocalTarget,
  assertExperimentFoundationNamedLocalDatabaseUrl,
} from './experiment-foundation-named-local-evidence.js';

type RunnerMode = 'offline-preflight' | 'execute';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const PREPARED_PATH = path.join(
  REPO_ROOT,
  'workloads/scifact-recall-p5/manifests/prepared-authorization-v15.json',
);
const AUTHORIZATION_PATH = path.join(
  REPO_ROOT,
  'workloads/scifact-recall-p5/manifests/authorization-acceptance-v15.json',
);
const QUALIFICATION_PATH = path.join(
  REPO_ROOT,
  'workloads/scifact-recall-p5/manifests/credential-qualification-v1.json',
);
const IMAGE_ID = 'image-liuxvj7p2qcnflha84';
const PROJECT_ID = 'implementation_project_642a1879-1137-40f5-b340-330b66509975';
const VALIDATION_CYCLE_ID = 'validation_cycle_t136_p5_scifact_v1';
const RUN_ID = 'ef_run_v2_t136_p5_scifact_v1_1';
const RUN_MANIFEST_HASH =
  'sha256:e29925d2543ee6376d216dfc3b4dfc94a1192c01dc3478cc13ac91d6d6e467b2';
const TRACE_ID = 'trace_manifest_t136_p5_scifact_v1';
const PACKET_ID = 'result_interpretation_packet_t136_p5_scifact_v1';
const RUNTIME_RUN_ID = 'pi_result_analysis_runtime_t136_p5_scifact_v1';
const CLOSURE_CAPABILITY = 'PAPER_IMPLEMENTATION_EXPERIMENT_V2_CYCLE_CLOSURE_ENABLED';
const TARGET = Object.freeze({
  database: 'postgres',
  schema: 'my_researcher_dev',
  host: '127.0.0.1',
  port: '5432',
  fingerprint: 'sha256:8851b255b079ad1f049dc1842c41cb3516d5a3ff0b69e21a30e8f2675409cca0',
});

async function main(): Promise<void> {
  const mode = parseMode(process.argv.slice(2));
  const prepared = await readPreparedAuthorization();
  const binding = attemptBinding(prepared);
  if (mode === 'execute') {
    const output = await runScientificEvidenceP5ClaimedStageV1({
      manifest_directory: path.dirname(PREPARED_PATH),
      binding,
      stage: 'close',
      operation: async () => {
        await readAuthorization(prepared);
        const qualification = await readQualification();
        assertScientificEvidenceP5CredentialQualificationV1({
          execution_package: prepared.execution_package,
          qualification,
          expected_image_id: IMAGE_ID,
        });
        return runWindow(mode, prepared);
      },
    });
    writeOutput(output);
    return;
  }
  writeOutput(await runWindow(mode, prepared));
}

async function runWindow(
  mode: RunnerMode,
  prepared: ScientificEvidenceP5PreparedAuthorizationV3,
): Promise<Record<string, unknown>> {
  const executionPackage = prepared.execution_package;
  assertNoAlibabaCredentialMaterial();
  assertClosureCapabilityDisabled();
  const databaseUrl = requireEnvironment('DATABASE_URL');
  assertExperimentFoundationNamedLocalDatabaseUrl(
    databaseUrl,
    TARGET,
    'T136_P5_CLOSURE_TARGET_MISMATCH',
  );
  const modelBinding = assertResultAnalysisModelBinding();
  const prisma = new PrismaClient();
  await prisma.$connect();
  try {
    const target = await assertExperimentFoundationLiveNamedLocalTarget(prisma, TARGET);
    const state = await readState(prisma);
    if (mode === 'offline-preflight') {
      assert.equal(state.runtimeArtifacts, 0);
      assert.equal(state.runtimeAdmissions, 0);
      assert.equal(state.closures, 0);
      assert.equal(state.packets, 0);
      return {
        schema_version: 'ScientificEvidenceP5ClosureOfflinePreflight@v1',
        status: 'passed_waiting_for_real_evidence',
        target_fingerprint: target.fingerprint,
        package_hash: executionPackage.package_hash,
        run_id: RUN_ID,
        current: state,
        expected_execute_prerequisite: {
          scientific_results: 2,
          passed_validation_reports: 1,
          run_evidence_units: 1,
        },
        result_analysis_model_binding: modelBinding,
        external_call_count: 0,
        database_write_count: 0,
        alibaba_credential_read_count: 0,
        model_provider_secret_value_logged: false,
        capability_change_count: 0,
      };
    }

    assertScientificEvidenceP5ClosureWindow(executionPackage.operational_timeline, Date.now());
    assert.deepEqual(
      {
        scientificResults: state.scientificResults,
        passedValidationReports: state.passedValidationReports,
        runEvidenceUnits: state.runEvidenceUnits,
        closures: state.closures,
        packets: state.packets,
      },
      {
        scientificResults: 2,
        passedValidationReports: 1,
        runEvidenceUnits: 1,
        closures: 0,
        packets: 0,
      },
    );
    enableClosureCapability();
    const closureRepository =
      new PrismaPaperImplementationValidationCycleClosureV2Repository(prisma);
    const readinessService = new PaperImplementationCycleReadinessV2Service({
      repository: new PrismaPaperImplementationCycleReadinessV2Repository(prisma),
    });
    const readiness = await readinessService.evaluate(VALIDATION_CYCLE_ID);
    assert.equal(readiness.status, 'ready_with_evidence');
    assert.equal(readiness.eligible_run_evidence_unit_count, 1);
    const project = await prisma.paperImplementationProject.findUniqueOrThrow({
      where: { id: PROJECT_ID },
      select: { titleCardId: true },
    });
    const runtimeRepository = new PrismaPaperImplementationRuntimeRepository(prisma);
    let finalArtifact: PaperImplementationRuntimeArtifactEnvelope;
    let finalAdmission: PaperImplementationRuntimeAdmissionRecord;
    let providerCallCount: number;
    if (state.runtimeArtifacts === 0 && state.runtimeAdmissions === 0) {
      const runtime = new PaperImplementationResultAnalysisRuntimeService({
        projectRepository: new PrismaPaperImplementationRepository(prisma),
        runtimeAdmission: new PaperImplementationRuntimeAdmissionService({
          repository: runtimeRepository,
        }),
        agentOrchestrator: new TopicSelectionAgentOrchestratorService(),
        scientificClosureContextResolver:
          new PaperImplementationScientificClosureContextService(closureRepository),
      });
      assertScientificEvidenceP5ClosureWindow(executionPackage.operational_timeline, Date.now());
      const runtimeResult = await runtime.runInterpretationScenarios(PROJECT_ID, {
        run_id: RUNTIME_RUN_ID,
        run_mode: 'product',
        execution_mode: 'provider_llm',
        model_profile_id: PAPER_IMPLEMENTATION_RESULT_ANALYSIS_PROFILE_ID,
        target_ref: ref('validation_cycle', VALIDATION_CYCLE_ID, project.titleCardId),
        target_version_id: RUN_MANIFEST_HASH,
        input_snapshot_ref: ref(
          'implementation_input_snapshot',
          'implementation_input_snapshot_t136_p5_scifact_v1',
          project.titleCardId,
        ),
        input_snapshot_hash: semanticHash('P5ResultAnalysisInput', {
          package_hash: executionPackage.package_hash,
          run_id: RUN_ID,
          run_manifest_hash: RUN_MANIFEST_HASH,
        }),
        source_refs: [
          ref('result_interpretation_packet', PACKET_ID, project.titleCardId),
          ref('trace_manifest', TRACE_ID, project.titleCardId),
        ],
        source_hashes: [
          semanticHash('P5FutureResultPacket', { packet_id: PACKET_ID }),
          semanticHash('P5TraceManifestRef', { trace_manifest_id: TRACE_ID }),
        ],
        scientific_closure_intent: {
          schema_version: 'PaperImplementationScientificClosureIntent@v1',
          expected_closure_watermark_hash: readiness.watermark.closure_input_hash,
        },
      });
      assert.equal(runtimeResult.status, 'passed');
      assert.ok(runtimeResult.final_runtime_artifact);
      assert.ok(runtimeResult.final_admission_record);
      finalArtifact = runtimeResult.final_runtime_artifact;
      finalAdmission = runtimeResult.final_admission_record;
      providerCallCount = runtimeResult.provider_call_count;
    } else {
      assert.ok(
        state.runtimeArtifacts >= 2 && state.runtimeAdmissions >= 2,
        'T136_P5_RUNTIME_PARTIAL_RECOVERY_REQUIRES_REVIEW',
      );
      const artifacts = await runtimeRepository.listRuntimeArtifacts(PROJECT_ID, {
        slot_id: PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SLOT_ID,
        artifact_scope: 'final',
      });
      const candidates = artifacts.filter((artifact) => (
        artifact.target_ref.ref_id === VALIDATION_CYCLE_ID
        && artifact.runtime_status === 'passed'
        && artifact.final_artifact_hash
      ));
      assert.equal(candidates.length, 1);
      finalArtifact = candidates[0]!;
      const admissions = await runtimeRepository.listAdmissionRecords(PROJECT_ID, {
        runtime_artifact_id: finalArtifact.runtime_artifact_id,
        admission_scope: 'final',
      });
      assert.equal(admissions.length, 1);
      finalAdmission = admissions[0]!;
      providerCallCount = 0;
    }
    assert.ok(finalArtifact.final_artifact_hash);
    assert.equal(finalAdmission.admission_status, 'admitted');
    assert.equal(finalAdmission.runtime_artifact_id, finalArtifact.runtime_artifact_id);
    assertScientificEvidenceP5ClosureWindow(executionPackage.operational_timeline, Date.now());
    const closureService = new PaperImplementationValidationCycleClosureV2Service({
      repository: closureRepository,
      enabled: () => closureCapabilityEnabled(),
    });
    const closureRequest = {
      validation_cycle_id: VALIDATION_CYCLE_ID,
      expected_cycle_version: readiness.watermark.expected_cycle_version,
      expected_closure_input_hash: readiness.watermark.closure_input_hash,
      closure_kind: 'scientific_evidence_assessed' as const,
      accepted_proposal_id: finalArtifact.runtime_artifact_id,
      expected_proposal_hash: finalArtifact.final_artifact_hash,
      idempotency_key: 't136-p5-scifact-attempt-13:scientific-close',
    };
    const closed = await closureService.close(closureRequest);
    assert.ok(closed.closure.scientific_disposition);
    assert.ok(closed.closure.selected_exit_key);

    const piSpineRepository = new PrismaPaperImplementationExperimentSpineV2Repository(prisma);
    const efSpineRepository = new PrismaExperimentFoundationSpineV2Repository(prisma);
    const projectionConsumer = new PaperImplementationProjectionFeedV2Consumer({
      repository: piSpineRepository,
    });
    const packetRepository = new PrismaPaperImplementationResultClaimDossierRepository(prisma);
    const packetMaterializer = new PaperImplementationResultPacketV2Materializer(
      closureRepository,
      packetRepository,
    );
    const relay = new ExperimentV2IntegrationRelayService({
      paperImplementationRepository: piSpineRepository,
      experimentFoundationRepository: efSpineRepository,
      materializationConsumer: { async consume() { throw new Error('Unexpected admission event.'); } },
      headConsumer: { async consume() { throw new Error('Unexpected frozen event.'); } },
      acknowledgementConsumer: { async consume() { throw new Error('Unexpected head event.'); } },
      evidenceTrustGatewayConsumer: { async consume() {
        throw new Error('Unexpected evidence event after P5 trust phase.');
      } },
      runEvidenceProjectionConsumer: projectionConsumer,
      validationCycleClosedProjectionConsumer:
        new PaperImplementationValidationCycleClosedCompositeConsumer(
          projectionConsumer,
          packetMaterializer,
        ),
      workerId: `t136-p5-closure-relay-${process.pid}`,
    });
    const relayOutcome = await relay.drainUntilIdle({ max_passes: 5, limit_per_domain: 20 });
    assert.equal(relayOutcome.idle, true);
    assert.deepEqual(relayOutcome.failures, []);
    const packet = await packetRepository.findResultInterpretationPacketById(
      PROJECT_ID,
      PACKET_ID,
    );
    assert.ok(packet);
    assert.equal(packet.closure_id, closed.closure.closure_id);
    assert.equal(packet.closure_snapshot_hash, closed.closure.closure_snapshot_hash);
    assert.equal(packet.validation_cycle_id, VALIDATION_CYCLE_ID);

    assert.deepEqual(await closureService.close(closureRequest), closed);
    const replayRelay = await relay.drainUntilIdle({ max_passes: 2, limit_per_domain: 20 });
    assert.equal(replayRelay.idle, true);
    const finalState = await readState(prisma);
    assert.equal(finalState.closures, 1);
    assert.equal(finalState.packets, 1);
    return {
      schema_version: 'ScientificEvidenceP5ClosureResult@v1',
      status: 'scientific_closure_and_packet_passed',
      target_fingerprint: target.fingerprint,
      package_hash: executionPackage.package_hash,
      run_id: RUN_ID,
      result_analysis: {
        runtime_run_id: RUNTIME_RUN_ID,
        model_binding: modelBinding,
        provider_call_count_this_process: providerCallCount,
        proposal_id: finalArtifact.runtime_artifact_id,
        proposal_hash: finalArtifact.final_artifact_hash,
      },
      closure: {
        closure_id: closed.closure.closure_id,
        closure_snapshot_hash: closed.closure.closure_snapshot_hash,
        scientific_disposition: closed.closure.scientific_disposition,
        selected_exit_key: closed.closure.selected_exit_key,
      },
      packet: {
        packet_id: packet.result_interpretation_packet_id,
        packet_content_hash: packet.packet_content_hash,
      },
      relay: relayOutcome,
      replay_new_row_count: 0,
      alibaba_credential_read_count: 0,
      create_job_call_count: 0,
      capability_persistence_count: 0,
    };
  } finally {
    disableClosureCapability();
    await prisma.$disconnect();
  }
}

function writeOutput(output: Record<string, unknown>): void {
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}

function attemptBinding(
  prepared: ScientificEvidenceP5PreparedAuthorizationV3,
): ScientificEvidenceP5AttemptBindingV1 {
  return {
    p5_attempt_id: prepared.execution_package.p5_attempt_id,
    package_hash: prepared.execution_package.package_hash,
  };
}

async function readState(prisma: PrismaClient) {
  const [
    scientificResults,
    passedValidationReports,
    runEvidenceUnits,
    runtimeArtifacts,
    runtimeAdmissions,
    closures,
    packets,
  ] = await Promise.all([
    prisma.experimentFoundationExperimentResultV2.count({ where: { runId: RUN_ID } }),
    prisma.experimentFoundationScientificValidationReportV2.count({
      where: { runId: RUN_ID, status: 'passed' },
    }),
    prisma.paperImplementationRunEvidenceUnitV2.count({
      where: { validationCycleId: VALIDATION_CYCLE_ID },
    }),
    prisma.paperImplementationRuntimeArtifact.count({
      where: {
        implementationProjectId: PROJECT_ID,
        slotId: PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SLOT_ID,
        targetRefId: VALIDATION_CYCLE_ID,
      },
    }),
    prisma.paperImplementationRuntimeAdmissionRecord.count({
      where: {
        implementationProjectId: PROJECT_ID,
        slotId: PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SLOT_ID,
        targetRefId: VALIDATION_CYCLE_ID,
      },
    }),
    prisma.paperImplementationValidationCycleClosureV2.count({
      where: { validationCycleId: VALIDATION_CYCLE_ID },
    }),
    prisma.paperImplementationResultInterpretationPacket.count({
      where: { validationCycleId: VALIDATION_CYCLE_ID },
    }),
  ]);
  return {
    scientificResults,
    passedValidationReports,
    runEvidenceUnits,
    runtimeArtifacts,
    runtimeAdmissions,
    closures,
    packets,
  };
}

async function readPreparedAuthorization(): Promise<ScientificEvidenceP5PreparedAuthorizationV3> {
  const parsed = JSON.parse(
    await fs.readFile(PREPARED_PATH, 'utf8'),
  ) as ScientificEvidenceP5PreparedAuthorizationV3;
  assertScientificEvidenceP5PreparedAuthorizationV3(parsed);
  return parsed;
}

async function readAuthorization(
  prepared: ScientificEvidenceP5PreparedAuthorizationV3,
): Promise<void> {
  const parsed = JSON.parse(
    await fs.readFile(AUTHORIZATION_PATH, 'utf8'),
  ) as ScientificEvidenceP5AuthorizationAcceptanceV3;
  assertScientificEvidenceP5AuthorizationAcceptanceV3({ prepared, acceptance: parsed });
  assert.deepEqual(
    parsed.authorization.operational_timeline.closure.capability_keys,
    [CLOSURE_CAPABILITY],
  );
}

async function readQualification(): Promise<ScientificEvidenceP5CredentialQualificationV1> {
  return JSON.parse(
    await fs.readFile(QUALIFICATION_PATH, 'utf8'),
  ) as ScientificEvidenceP5CredentialQualificationV1;
}

function ref(
  refType: string,
  refId: string,
  titleCardId: string,
): TopicSelectionFunctionalRef {
  return { ref_type: refType, ref_id: refId, title_card_id: titleCardId, version_id: 'v1' };
}

function semanticHash(recordKind: string, content: Record<string, unknown>): string {
  return `sha256:${createHash('sha256').update(JSON.stringify({
    record_kind: recordKind,
    schema_version: 'v1',
    content,
  }), 'utf8').digest('hex')}`;
}

function assertNoAlibabaCredentialMaterial(): void {
  for (const key of [
    'ALIBABA_CLOUD_ACCESS_KEY_ID',
    'ALIBABA_CLOUD_ACCESS_KEY_SECRET',
    'ALIBABA_CLOUD_SECURITY_TOKEN',
    'ALIBABA_CLOUD_SESSION_TOKEN',
    'ALIBABA_CLOUD_STS_ISSUED_AT',
    'ALIBABA_CLOUD_STS_EXPIRATION',
    'ALIBABA_CLOUD_STS_ASSUME_ROLE_REQUEST_ID',
  ]) {
    assert.equal(process.env[key], undefined, `${key} must be absent from the closure process.`);
  }
}

function assertResultAnalysisModelBinding(): {
  profile_id: string;
  option_id: string;
  provider_id: 'openai';
  model_id: 'gpt-5.6-sol';
  api_key_configured: true;
} {
  const resolved = new TopicSelectionModelProfileRegistryService().resolveProfile({
    profile_id: PAPER_IMPLEMENTATION_RESULT_ANALYSIS_PROFILE_ID,
    execution_mode: 'provider_llm',
    run_mode: 'product',
    model_option_id: null,
  });
  const option = resolved.selected_model_option;
  assert.ok(option, 'T136_P5_RESULT_ANALYSIS_MODEL_OPTION_MISSING');
  assert.equal(option.provider_id, 'openai', 'T136_P5_RESULT_ANALYSIS_PROVIDER_DRIFT');
  assert.equal(option.model_id, 'gpt-5.6-sol', 'T136_P5_RESULT_ANALYSIS_MODEL_DRIFT');
  assert.ok(process.env.OPENAI_API_KEY?.trim(), 'T136_P5_OPENAI_API_KEY_MISSING');
  return {
    profile_id: PAPER_IMPLEMENTATION_RESULT_ANALYSIS_PROFILE_ID,
    option_id: option.option_id,
    provider_id: 'openai',
    model_id: 'gpt-5.6-sol',
    api_key_configured: true,
  };
}

function assertClosureCapabilityDisabled(): void {
  const value = process.env[CLOSURE_CAPABILITY];
  if (value !== undefined && !['false', '0', ''].includes(value.trim().toLowerCase())) {
    throw new Error(`${CLOSURE_CAPABILITY} must be disabled before the closure window.`);
  }
}

function enableClosureCapability(): void {
  assertClosureCapabilityDisabled();
  process.env[CLOSURE_CAPABILITY] = 'true';
}

function disableClosureCapability(): void {
  delete process.env[CLOSURE_CAPABILITY];
}

function closureCapabilityEnabled(): boolean {
  return process.env[CLOSURE_CAPABILITY]?.trim().toLowerCase() === 'true';
}

function parseMode(args: string[]): RunnerMode {
  const index = args.indexOf('--mode');
  const mode = index >= 0 ? args[index + 1] : undefined;
  if (mode === 'offline-preflight' || mode === 'execute') return mode;
  throw new Error('Usage: --mode offline-preflight|execute');
}

function requireEnvironment(key: string): string {
  const value = process.env[key]?.trim();
  if (!value) throw new Error(`${key} is required.`);
  return value;
}

main().catch((error: unknown) => {
  disableClosureCapability();
  process.stderr.write(`${JSON.stringify({
    schema_version: 'ScientificEvidenceP5ClosureFailure@v1',
    status: 'failed',
    reason: scientificEvidenceP5TerminalReasonCode(error, 'T136_P5_CLOSURE_FAILED'),
  })}\n`);
  process.exitCode = 1;
});
