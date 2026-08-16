#!/usr/bin/env node

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { PrismaClient } from '@prisma/client';
import {
  canonicalizeExperimentV2Json,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';
import {
  PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SLOT_ID,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-runtime-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

import {
  PrismaPaperImplementationCycleReadinessV2Repository,
} from '../src/repositories/prisma/prisma-paper-implementation-cycle-readiness-v2-repository.js';
import {
  PrismaPaperImplementationRepository,
} from '../src/repositories/prisma/prisma-paper-implementation-repository.js';
import {
  PrismaPaperImplementationRuntimeRepository,
} from '../src/repositories/prisma/prisma-paper-implementation-runtime-repository.js';
import {
  PrismaPaperImplementationTraceRepository,
} from '../src/repositories/prisma/prisma-paper-implementation-trace-repository.js';
import {
  PrismaPaperImplementationValidationCycleClosureV2Repository,
} from '../src/repositories/prisma/prisma-paper-implementation-validation-cycle-closure-v2-repository.js';
import {
  PaperImplementationCycleReadinessV2Service,
} from '../src/services/paper-implementation-cycle-readiness-v2-service.js';
import {
  PaperImplementationResultAnalysisRuntimeService,
} from '../src/services/paper-implementation-result-analysis-runtime-service.js';
import {
  PaperImplementationRuntimeAdmissionService,
} from '../src/services/paper-implementation-runtime-admission-service.js';
import {
  PaperImplementationScientificClosureContextService,
} from '../src/services/paper-implementation-scientific-closure-context-service.js';
import {
  PaperImplementationTraceKernelService,
} from '../src/services/paper-implementation-trace-kernel-service.js';
import {
  runScientificEvidenceP5ClaimedStageV1,
  scientificEvidenceP5TerminalReasonCode,
  type ScientificEvidenceP5AttemptBindingV1,
} from '../src/services/scientific-evidence-p5-attempt-terminal-service.js';
import {
  assertScientificEvidenceP5ClosurePacketAcceptanceV1,
  assertScientificEvidenceP5ClosurePacketPreparedV1,
  type ScientificEvidenceP5ClosurePacketAcceptanceV1,
  type ScientificEvidenceP5ClosurePacketPreparedV1,
} from '../src/services/scientific-evidence-p5-closure-packet-continuation-service.js';
import {
  assertScientificEvidenceP5PacketTraceSuccessorAcceptanceV1,
  assertScientificEvidenceP5PacketTraceSuccessorPreparedV1,
  assertScientificEvidenceP5PacketTraceSuccessorWindow,
  buildScientificEvidenceP5PacketTraceLineageV1,
  type ScientificEvidenceP5PacketTraceSuccessorAcceptanceV1,
  type ScientificEvidenceP5PacketTraceSuccessorPreparedV1,
} from '../src/services/scientific-evidence-p5-packet-trace-result-analysis-successor-service.js';
import {
  assertScientificEvidenceP5ResultAnalysisRecoveryAcceptanceV1,
  assertScientificEvidenceP5ResultAnalysisRecoveryPreparedV1,
  type ScientificEvidenceP5ResultAnalysisRecoveryAcceptanceV1,
  type ScientificEvidenceP5ResultAnalysisRecoveryPreparedV1,
} from '../src/services/scientific-evidence-p5-result-analysis-recovery-service.js';
import {
  TopicSelectionAgentOrchestratorService,
} from '../src/services/topic-selection-agent-orchestrator-service.js';
import {
  TopicSelectionModelProfileRegistryService,
} from '../src/services/topic-selection-model-profile-registry-service.js';
import {
  assertExperimentFoundationLiveNamedLocalTarget,
  assertExperimentFoundationNamedLocalDatabaseUrl,
} from './experiment-foundation-named-local-evidence.js';

type RunnerMode = 'offline-preflight' | 'execute';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const MANIFEST_DIRECTORY = path.join(REPO_ROOT, 'workloads/scifact-recall-p5/manifests');
const PREPARED_PATH = path.join(
  MANIFEST_DIRECTORY,
  'prepared-packet-trace-result-analysis-successor-v1.json',
);
const ACCEPTANCE_PATH = path.join(
  MANIFEST_DIRECTORY,
  'authorization-acceptance-packet-trace-result-analysis-successor-v1.json',
);
const SOURCE_RA_PREPARED_PATH = path.join(
  MANIFEST_DIRECTORY,
  'prepared-result-analysis-recovery-attempt3-completed-v1.json',
);
const SOURCE_RA_ACCEPTANCE_PATH = path.join(
  MANIFEST_DIRECTORY,
  'authorization-acceptance-result-analysis-recovery-attempt3-v1.json',
);
const SOURCE_RA_CLAIM_PATH = path.join(
  MANIFEST_DIRECTORY,
  'credential-attempt-t136-p5-result-analysis-recovery-3-result_analysis_recovery-claim.json',
);
const SOURCE_RA_COMPLETION_PATH = path.join(
  MANIFEST_DIRECTORY,
  'credential-attempt-t136-p5-result-analysis-recovery-3-result_analysis_recovery-completion.json',
);
const SOURCE_CONTINUATION_PREPARED_PATH = path.join(
  MANIFEST_DIRECTORY,
  'prepared-closure-packet-continuation-v1.json',
);
const SOURCE_CONTINUATION_ACCEPTANCE_PATH = path.join(
  MANIFEST_DIRECTORY,
  'authorization-acceptance-closure-packet-continuation-v1.json',
);
const SOURCE_CONTINUATION_CLAIM_PATH = path.join(
  MANIFEST_DIRECTORY,
  'credential-attempt-t136-p5-closure-packet-continuation-1-closure_packet_continuation-claim.json',
);
const SOURCE_CONTINUATION_TERMINAL_PATH = path.join(
  MANIFEST_DIRECTORY,
  'credential-attempt-terminal-t136-p5-closure-packet-continuation-1.json',
);
const SOURCE_RA_TERMINAL_PATH = path.join(
  MANIFEST_DIRECTORY,
  'credential-attempt-terminal-t136-p5-result-analysis-recovery-3.json',
);
const SOURCE_CONTINUATION_COMPLETION_PATH = path.join(
  MANIFEST_DIRECTORY,
  'credential-attempt-t136-p5-closure-packet-continuation-1-closure_packet_continuation-completion.json',
);
const RECOVERY_ROOT = '/Users/yurui/Desktop/My-Researcher-Recovery/T-136';
const TARGET = Object.freeze({
  database: 'postgres',
  schema: 'my_researcher_dev',
  host: '127.0.0.1',
  port: '5432',
  fingerprint: 'sha256:8851b255b079ad1f049dc1842c41cb3516d5a3ff0b69e21a30e8f2675409cca0',
});
const CLOSURE_CAPABILITY = 'PAPER_IMPLEMENTATION_EXPERIMENT_V2_CYCLE_CLOSURE_ENABLED';
const PAI_CAPABILITIES = [
  'EXPERIMENT_FOUNDATION_V2_REAL_PROVIDER_INTAKE_ENABLED',
  'EXPERIMENT_FOUNDATION_V2_REAL_PROVIDER_CONTROL_DRAIN_ENABLED',
  'EXPERIMENT_FOUNDATION_V2_SCIENTIFIC_VALIDATION_ENABLED',
] as const;

async function main(): Promise<void> {
  const mode = parseMode(process.argv.slice(2));
  const prepared = await readPrepared();
  if (mode === 'execute') {
    const acceptance = await readAcceptance(prepared);
    assertScientificEvidenceP5PacketTraceSuccessorWindow(prepared.successor_package);
    const output = await runScientificEvidenceP5ClaimedStageV1({
      manifest_directory: MANIFEST_DIRECTORY,
      binding: attemptBinding(prepared),
      stage: 'packet_trace_result_analysis_successor',
      operation: async () => runWindow(mode, prepared, acceptance),
    });
    writeOutput(output);
    return;
  }
  writeOutput(await runWindow(mode, prepared, null));
}

async function runWindow(
  mode: RunnerMode,
  prepared: ScientificEvidenceP5PacketTraceSuccessorPreparedV1,
  acceptance: ScientificEvidenceP5PacketTraceSuccessorAcceptanceV1 | null,
): Promise<Record<string, unknown>> {
  const successorPackage = prepared.successor_package;
  assertNoAlibabaCredentialMaterial();
  assertAllCapabilitiesDisabled();
  await assertBoundFiles(prepared);
  assertCurrentModelBinding(prepared);
  const databaseUrl = requireEnvironment('DATABASE_URL');
  assertExperimentFoundationNamedLocalDatabaseUrl(
    databaseUrl,
    TARGET,
    'T136_P5_PACKET_TRACE_SUCCESSOR_TARGET_MISMATCH',
  );

  const prisma = new PrismaClient();
  await prisma.$connect();
  try {
    const target = await assertExperimentFoundationLiveNamedLocalTarget(prisma, TARGET);
    const before = await readAuthorityState(prisma, prepared);
    if (mode === 'offline-preflight') {
      return {
        schema_version: 'ScientificEvidenceP5PacketTraceResultAnalysisSuccessorOfflinePreflight@v1',
        status: 'passed_awaiting_exact_authorization',
        successor_attempt_id: successorPackage.successor_attempt_id,
        package_hash: successorPackage.package_hash,
        target_fingerprint: target.fingerprint,
        current: before.counts,
        source_result_analysis_binding_verified: true,
        source_continuation_terminal_binding_verified: true,
        source_cycle_trace_binding_verified: true,
        packet_trace_experiment_lineage_verified: true,
        executor_binding_verified: true,
        recovery_binding_verified: true,
        acceptance_present: await fileExists(ACCEPTANCE_PATH),
        external_call_count: 0,
        database_write_count: 0,
        create_job_call_count: 0,
        capability_change_count: 0,
      };
    }

    assert.ok(acceptance);
    assert.ok(process.env.OPENAI_API_KEY?.trim(), 'T136_P5_OPENAI_API_KEY_MISSING');
    const authority = successorPackage.authority;
    const traceRepository = new PrismaPaperImplementationTraceRepository(prisma);
    const traceService = new PaperImplementationTraceKernelService({
      projectRepository: new PrismaPaperImplementationRepository(prisma),
      traceRepository,
      idFactory: (prefix) => {
        assert.equal(prefix, 'trace_manifest');
        return authority.packet_trace.id;
      },
    });
    const packetTrace = await traceService.createTraceManifest(
      authority.implementation_project_id,
      {
        target_ref: {
          ...before.sourceCycleTrace.target_ref,
          ref_type: authority.packet_trace.target_ref_type,
          ref_id: authority.packet_trace.target_ref_id,
          version_id: authority.packet_trace.target_version_id,
        },
        lineage: before.packetTraceLineage,
        trace_policy_version_id: before.sourceCycleTrace.trace_policy_version_id,
        created_by: 'system',
      },
    );
    assert.equal(packetTrace.trace_manifest_id, authority.packet_trace.id);
    assert.equal(packetTrace.trace_status, authority.packet_trace.expected_status);
    assert.equal(packetTrace.target_ref.ref_type, authority.packet_trace.target_ref_type);
    assert.equal(packetTrace.target_ref.ref_id, authority.packet_trace.target_ref_id);
    assert.equal(packetTrace.target_ref.version_id, authority.packet_trace.target_version_id);
    assert.equal(
      (await traceRepository.listTraceRepairQueueItemsByManifest(
        authority.implementation_project_id,
        packetTrace.trace_manifest_id,
      )).length,
      0,
      'T136_P5_PACKET_TRACE_SUCCESSOR_REPAIR_QUEUE_NOT_EMPTY',
    );

    const closureRepository =
      new PrismaPaperImplementationValidationCycleClosureV2Repository(prisma);
    const runtime = new PaperImplementationResultAnalysisRuntimeService({
      projectRepository: new PrismaPaperImplementationRepository(prisma),
      runtimeAdmission: new PaperImplementationRuntimeAdmissionService({
        repository: new PrismaPaperImplementationRuntimeRepository(prisma),
      }),
      agentOrchestrator: new TopicSelectionAgentOrchestratorService(),
      scientificClosureContextResolver:
        new PaperImplementationScientificClosureContextService(closureRepository),
    });
    const request = successorPackage.runtime_request;
    const runtimeResult = await runtime.runInterpretationScenarios(
      authority.implementation_project_id,
      {
        run_id: request.runtime_run_id,
        run_mode: request.run_mode,
        execution_mode: request.execution_mode,
        model_profile_id: request.model_profile_id,
        model_option_id: request.model_option_id,
        target_ref: ref(
          'validation_cycle',
          authority.validation_cycle_id,
          authority.title_card_id,
        ),
        target_version_id: request.target_version_id,
        input_snapshot_ref: ref(
          'implementation_input_snapshot',
          request.input_snapshot_ref_id,
          authority.title_card_id,
        ),
        input_snapshot_hash: runtimeHash(request.input_snapshot_hash),
        source_refs: [
          ref(
            'result_interpretation_packet',
            authority.result_interpretation_packet_id,
            authority.title_card_id,
          ),
          ref('trace_manifest', authority.packet_trace.id, authority.title_card_id),
        ],
        source_hashes: request.source_hashes.map(runtimeHash),
        scientific_closure_intent: {
          schema_version: 'PaperImplementationScientificClosureIntent@v1',
          expected_closure_watermark_hash: authority.closure_watermark_hash,
        },
      },
    );
    assert.ok(
      runtimeResult.provider_call_count <= request.max_provider_call_count,
      'T136_P5_PACKET_TRACE_SUCCESSOR_PROVIDER_CALL_BOUND_EXCEEDED',
    );
    if (runtimeResult.status !== 'passed') {
      throw new Error('T136_P5_PACKET_TRACE_SUCCESSOR_RUNTIME_NOT_PASSED');
    }
    assert.ok(runtimeResult.final_runtime_artifact?.final_artifact_hash);
    assert.ok(runtimeResult.final_admission_record);
    assert.equal(runtimeResult.final_admission_record.admission_status, 'admitted');

    const officialProposal = await closureRepository.withTransaction(
      (transaction) => transaction.findAdmittedScientificClosureProposal(
        runtimeResult.final_runtime_artifact!.runtime_artifact_id,
        runtimeResult.final_runtime_artifact!.final_artifact_hash!,
      ),
    );
    assert.ok(officialProposal, 'T136_P5_PACKET_TRACE_SUCCESSOR_OFFICIAL_PROPOSAL_UNRESOLVED');
    assert.ok(
      officialProposal.packet_materialization,
      'T136_P5_PACKET_TRACE_SUCCESSOR_PACKET_MATERIALIZATION_UNRESOLVED',
    );
    assert.equal(
      officialProposal.packet_materialization.request.result_interpretation_packet_id,
      authority.result_interpretation_packet_id,
      'T136_P5_PACKET_TRACE_SUCCESSOR_PACKET_ID_MISMATCH',
    );
    assert.equal(
      officialProposal.packet_materialization.request.trace_manifest_id,
      authority.packet_trace.id,
      'T136_P5_PACKET_TRACE_SUCCESSOR_PACKET_TRACE_MISMATCH',
    );

    const after = await readAuthorityState(prisma, prepared, { allowSuccessorEffects: true });
    assert.deepEqual(after.counts, {
      packetTraceManifests: 1,
      packetTraceRepairQueueItems: 0,
      runtimeArtifacts: 4,
      runtimeAdmissions: 4,
      closures: 0,
      packets: 0,
      validationCycleClosedOutboxes: 0,
      validationCycleClosedInboxes: 0,
      undeliveredIntegrationOutboxes: 0,
    });
    return {
      schema_version: 'ScientificEvidenceP5PacketTraceResultAnalysisSuccessorResult@v1',
      status: 'packet_trace_and_result_analysis_passed_stopped_before_closure',
      successor_attempt_id: successorPackage.successor_attempt_id,
      package_hash: successorPackage.package_hash,
      packet_trace_id: packetTrace.trace_manifest_id,
      packet_trace_status: packetTrace.trace_status,
      runtime_run_id: request.runtime_run_id,
      provider_call_count: runtimeResult.provider_call_count,
      final_artifact_id: runtimeResult.final_runtime_artifact.runtime_artifact_id,
      final_artifact_hash: runtimeResult.final_runtime_artifact.final_artifact_hash,
      official_proposal_resolved: true,
      closure_write_count: 0,
      packet_write_count: 0,
      create_job_call_count: 0,
      alibaba_cloud_call_count: 0,
      persistent_capability_change_count: 0,
    };
  } finally {
    await prisma.$disconnect();
    assertAllCapabilitiesDisabled();
  }
}

async function readAuthorityState(
  prisma: PrismaClient,
  prepared: ScientificEvidenceP5PacketTraceSuccessorPreparedV1,
  options: { allowSuccessorEffects?: boolean } = {},
) {
  const authority = prepared.successor_package.authority;
  const readiness = await new PaperImplementationCycleReadinessV2Service({
    repository: new PrismaPaperImplementationCycleReadinessV2Repository(prisma),
  }).evaluate(authority.validation_cycle_id);
  assert.equal(readiness.status, 'ready_with_evidence');
  assert.equal(readiness.watermark.expected_cycle_version, authority.expected_cycle_version);
  assert.equal(readiness.watermark.closure_input_hash, authority.closure_watermark_hash);
  assert.equal(readiness.watermark.active_real_attempt_count, 0);

  const traceRepository = new PrismaPaperImplementationTraceRepository(prisma);
  const sourceCycleTrace = await traceRepository.findTraceManifestById(
    authority.implementation_project_id,
    authority.source_cycle_trace.id,
  );
  assert.ok(sourceCycleTrace);
  assert.equal(
    semanticHash('P5PacketTraceSourceCycleTrace', sourceCycleTrace),
    authority.source_cycle_trace.identity_hash,
  );
  assert.equal(sourceCycleTrace.trace_status, authority.source_cycle_trace.trace_status);
  assert.equal(sourceCycleTrace.target_ref.ref_type, authority.source_cycle_trace.target_ref_type);
  assert.equal(sourceCycleTrace.target_ref.ref_id, authority.source_cycle_trace.target_ref_id);

  const closureContext = await new PaperImplementationScientificClosureContextService(
    new PrismaPaperImplementationValidationCycleClosureV2Repository(prisma),
  ).resolve({
    implementation_project_id: authority.implementation_project_id,
    validation_cycle_id: authority.validation_cycle_id,
    expected_closure_watermark_hash: authority.closure_watermark_hash,
    title_card_id: authority.title_card_id,
  });
  const packetTraceLineage = buildScientificEvidenceP5PacketTraceLineageV1({
    source_lineage: sourceCycleTrace.lineage,
    authoritative_run_evidence_refs: closureContext.authoritative_sources
      .map((source) => source.source_ref)
      .filter((sourceRef) => sourceRef.ref_type === 'run_evidence_unit'),
    title_card_id: authority.title_card_id,
  });

  const [
    packetTraceManifests,
    packetTraceRepairQueueItems,
    runtimeArtifacts,
    runtimeAdmissions,
    closures,
    packets,
    validationCycleClosedOutboxes,
    validationCycleClosedInboxes,
    undeliveredPi,
    undeliveredEf,
    undeliveredPromotion,
  ] = await Promise.all([
    prisma.paperImplementationTraceManifest.count({ where: { id: authority.packet_trace.id } }),
    prisma.paperImplementationTraceRepairQueueItem.count({
      where: { traceManifestId: authority.packet_trace.id },
    }),
    prisma.paperImplementationRuntimeArtifact.count({
      where: {
        implementationProjectId: authority.implementation_project_id,
        slotId: PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SLOT_ID,
        targetRefId: authority.validation_cycle_id,
      },
    }),
    prisma.paperImplementationRuntimeAdmissionRecord.count({
      where: {
        implementationProjectId: authority.implementation_project_id,
        slotId: PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SLOT_ID,
        targetRefId: authority.validation_cycle_id,
      },
    }),
    prisma.paperImplementationValidationCycleClosureV2.count({
      where: { validationCycleId: authority.validation_cycle_id },
    }),
    prisma.paperImplementationResultInterpretationPacket.count({
      where: { validationCycleId: authority.validation_cycle_id },
    }),
    prisma.paperImplementationExperimentIntegrationOutboxV2.count({
      where: { validationCycleId: authority.validation_cycle_id, eventType: 'ValidationCycleClosed@v1' },
    }),
    prisma.paperImplementationExperimentIntegrationInboxV2.count({
      where: { validationCycleId: authority.validation_cycle_id, eventType: 'ValidationCycleClosed@v1' },
    }),
    prisma.paperImplementationExperimentIntegrationOutboxV2.count({
      where: { relayStatus: { not: 'delivered' } },
    }),
    prisma.experimentFoundationIntegrationOutboxV2.count({
      where: { relayStatus: { not: 'delivered' } },
    }),
    prisma.experimentFoundationPromotionOutboxV2.count({
      where: { relayStatus: { not: 'delivered' } },
    }),
  ]);
  const counts = {
    packetTraceManifests,
    packetTraceRepairQueueItems,
    runtimeArtifacts,
    runtimeAdmissions,
    closures,
    packets,
    validationCycleClosedOutboxes,
    validationCycleClosedInboxes,
    undeliveredIntegrationOutboxes: undeliveredPi + undeliveredEf + undeliveredPromotion,
  };
  if (!options.allowSuccessorEffects) {
    assert.deepEqual({
      packet_trace_manifests: packetTraceManifests,
      runtime_artifacts: runtimeArtifacts,
      runtime_admissions: runtimeAdmissions,
      closures,
      packets,
      validation_cycle_closed_outboxes: validationCycleClosedOutboxes,
      validation_cycle_closed_inboxes: validationCycleClosedInboxes,
      undelivered_integration_outboxes: counts.undeliveredIntegrationOutboxes,
    }, authority.current_effects);
    assert.equal(packetTraceRepairQueueItems, 0);
  }
  return { counts, sourceCycleTrace, packetTraceLineage };
}

async function assertBoundFiles(
  prepared: ScientificEvidenceP5PacketTraceSuccessorPreparedV1,
): Promise<void> {
  const successorPackage = prepared.successor_package;
  const [
    sourceRaPreparedBytes,
    sourceRaAcceptanceBytes,
    sourceRaClaimBytes,
    sourceRaCompletionBytes,
    sourceContinuationPreparedBytes,
    sourceContinuationAcceptanceBytes,
    sourceContinuationClaimBytes,
    sourceContinuationTerminalBytes,
  ] = await Promise.all([
    fs.readFile(SOURCE_RA_PREPARED_PATH, 'utf8'),
    fs.readFile(SOURCE_RA_ACCEPTANCE_PATH, 'utf8'),
    fs.readFile(SOURCE_RA_CLAIM_PATH, 'utf8'),
    fs.readFile(SOURCE_RA_COMPLETION_PATH, 'utf8'),
    fs.readFile(SOURCE_CONTINUATION_PREPARED_PATH, 'utf8'),
    fs.readFile(SOURCE_CONTINUATION_ACCEPTANCE_PATH, 'utf8'),
    fs.readFile(SOURCE_CONTINUATION_CLAIM_PATH, 'utf8'),
    fs.readFile(SOURCE_CONTINUATION_TERMINAL_PATH, 'utf8'),
  ]);
  const sourceRaPrepared = JSON.parse(sourceRaPreparedBytes) as
    ScientificEvidenceP5ResultAnalysisRecoveryPreparedV1;
  const sourceRaAcceptance = JSON.parse(sourceRaAcceptanceBytes) as
    ScientificEvidenceP5ResultAnalysisRecoveryAcceptanceV1;
  assertScientificEvidenceP5ResultAnalysisRecoveryPreparedV1(sourceRaPrepared);
  assertScientificEvidenceP5ResultAnalysisRecoveryAcceptanceV1({
    prepared: sourceRaPrepared,
    acceptance: sourceRaAcceptance,
  });
  const sourceContinuationPrepared = JSON.parse(sourceContinuationPreparedBytes) as
    ScientificEvidenceP5ClosurePacketPreparedV1;
  const sourceContinuationAcceptance = JSON.parse(sourceContinuationAcceptanceBytes) as
    ScientificEvidenceP5ClosurePacketAcceptanceV1;
  assertScientificEvidenceP5ClosurePacketPreparedV1(sourceContinuationPrepared);
  assertScientificEvidenceP5ClosurePacketAcceptanceV1({
    prepared: sourceContinuationPrepared,
    acceptance: sourceContinuationAcceptance,
  });
  assert.deepEqual({
    prepared_record_sha256: sha256(sourceRaPreparedBytes),
    acceptance_record_sha256: sha256(sourceRaAcceptanceBytes),
    claim_record_sha256: sha256(sourceRaClaimBytes),
    completion_record_sha256: sha256(sourceRaCompletionBytes),
  }, {
    prepared_record_sha256: successorPackage.source_result_analysis.prepared_record_sha256,
    acceptance_record_sha256: successorPackage.source_result_analysis.acceptance_record_sha256,
    claim_record_sha256: successorPackage.source_result_analysis.claim_record_sha256,
    completion_record_sha256: successorPackage.source_result_analysis.completion_record_sha256,
  });
  assert.deepEqual({
    prepared_record_sha256: sha256(sourceContinuationPreparedBytes),
    acceptance_record_sha256: sha256(sourceContinuationAcceptanceBytes),
    claim_record_sha256: sha256(sourceContinuationClaimBytes),
    terminal_record_sha256: sha256(sourceContinuationTerminalBytes),
  }, {
    prepared_record_sha256: successorPackage.source_continuation.prepared_record_sha256,
    acceptance_record_sha256: successorPackage.source_continuation.acceptance_record_sha256,
    claim_record_sha256: successorPackage.source_continuation.claim_record_sha256,
    terminal_record_sha256: successorPackage.source_continuation.terminal_record_sha256,
  });
  await Promise.all([
    assertFileAbsent(SOURCE_RA_TERMINAL_PATH, 'T136_P5_PACKET_TRACE_SUCCESSOR_RA_TERMINAL_PRESENT'),
    assertFileAbsent(
      SOURCE_CONTINUATION_COMPLETION_PATH,
      'T136_P5_PACKET_TRACE_SUCCESSOR_CONTINUATION_COMPLETION_PRESENT',
    ),
  ]);
  for (const source of successorPackage.source_binding.source_files) {
    assert.equal(await sha256File(path.join(REPO_ROOT, source.path)), source.sha256);
  }
  assert.equal(
    await sha256File(path.join(REPO_ROOT, successorPackage.executor.path)),
    successorPackage.executor.sha256,
  );
  const recoveryManifestPath = path.join(
    RECOVERY_ROOT,
    successorPackage.recovery_point.manifest_ref,
  );
  const recoveryPoint = JSON.parse(await fs.readFile(recoveryManifestPath, 'utf8')) as {
    created_at: string;
    target_fingerprint: string;
    recovery_fingerprint: string;
    schema_dump: { file: string; sha256: string };
    authority_data_dump: { file: string; sha256: string; table_data_entries: number };
  };
  assert.equal(recoveryPoint.created_at, successorPackage.recovery_point.created_at);
  assert.equal(recoveryPoint.target_fingerprint, successorPackage.recovery_point.target_fingerprint);
  assert.equal(
    recoveryPoint.recovery_fingerprint,
    successorPackage.recovery_point.recovery_fingerprint,
  );
  assert.equal(recoveryPoint.schema_dump.sha256, successorPackage.recovery_point.schema_dump_sha256);
  assert.equal(
    recoveryPoint.authority_data_dump.sha256,
    successorPackage.recovery_point.authority_data_dump_sha256,
  );
  assert.equal(recoveryPoint.authority_data_dump.table_data_entries, 114);
  const recoveryDirectory = path.dirname(recoveryManifestPath);
  assert.equal(
    await sha256File(path.join(recoveryDirectory, recoveryPoint.schema_dump.file)),
    recoveryPoint.schema_dump.sha256,
  );
  assert.equal(
    await sha256File(path.join(recoveryDirectory, recoveryPoint.authority_data_dump.file)),
    recoveryPoint.authority_data_dump.sha256,
  );
}

function assertCurrentModelBinding(
  prepared: ScientificEvidenceP5PacketTraceSuccessorPreparedV1,
): void {
  const request = prepared.successor_package.runtime_request;
  const resolved = new TopicSelectionModelProfileRegistryService().resolveProfile({
    profile_id: request.model_profile_id,
    execution_mode: request.execution_mode,
    run_mode: request.run_mode,
    model_option_id: request.model_option_id,
  });
  const option = resolved.selected_model_option;
  assert.ok(option, 'T136_P5_PACKET_TRACE_SUCCESSOR_MODEL_OPTION_MISSING');
  assert.equal(option.option_id, request.model_option_id);
  assert.equal(option.provider_id, request.provider_id);
  assert.equal(option.model_id, request.model_id);
  assert.equal(prefixedHash(resolved.profile_hash), request.model_profile_hash);
  assert.ok(resolved.normalized_params_hash);
  assert.equal(prefixedHash(resolved.normalized_params_hash), request.normalized_params_hash);
}

async function readPrepared(): Promise<ScientificEvidenceP5PacketTraceSuccessorPreparedV1> {
  const parsed = JSON.parse(await fs.readFile(PREPARED_PATH, 'utf8')) as
    ScientificEvidenceP5PacketTraceSuccessorPreparedV1;
  assertScientificEvidenceP5PacketTraceSuccessorPreparedV1(parsed);
  return parsed;
}

async function readAcceptance(
  prepared: ScientificEvidenceP5PacketTraceSuccessorPreparedV1,
): Promise<ScientificEvidenceP5PacketTraceSuccessorAcceptanceV1> {
  const parsed = JSON.parse(await fs.readFile(ACCEPTANCE_PATH, 'utf8')) as
    ScientificEvidenceP5PacketTraceSuccessorAcceptanceV1;
  assertScientificEvidenceP5PacketTraceSuccessorAcceptanceV1({ prepared, acceptance: parsed });
  return parsed;
}

function attemptBinding(
  prepared: ScientificEvidenceP5PacketTraceSuccessorPreparedV1,
): ScientificEvidenceP5AttemptBindingV1 {
  return {
    p5_attempt_id: prepared.successor_package.successor_attempt_id,
    package_hash: prepared.successor_package.package_hash,
  };
}

function ref(
  refType: string,
  refId: string,
  titleCardId: string,
): TopicSelectionFunctionalRef {
  return {
    ref_type: refType,
    ref_id: refId,
    title_card_id: titleCardId,
    version_id: 'v1',
  };
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
    assert.equal(process.env[key], undefined, `${key} must be absent from successor execution.`);
  }
}

function assertAllCapabilitiesDisabled(): void {
  for (const key of [...PAI_CAPABILITIES, CLOSURE_CAPABILITY]) {
    const value = process.env[key]?.trim().toLowerCase();
    assert.ok(
      value === undefined || value === '' || value === 'false' || value === '0',
      `${key} must remain disabled during Packet-trace successor execution.`,
    );
  }
}

function parseMode(args: string[]): RunnerMode {
  const index = args.indexOf('--mode');
  const mode = index >= 0 ? args[index + 1] : undefined;
  if (mode === 'offline-preflight' || mode === 'execute') return mode;
  throw new Error('Usage: --mode offline-preflight|execute');
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
}

async function assertFileAbsent(filePath: string, reason: string): Promise<void> {
  if (await fileExists(filePath)) throw new Error(reason);
}

async function sha256File(filePath: string): Promise<string> {
  return sha256(await fs.readFile(filePath));
}

function sha256(value: string | Uint8Array): string {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

function semanticHash(recordKind: string, content: unknown): string {
  return sha256(canonicalizeExperimentV2Json({
    record_kind: recordKind,
    schema_version: 'v1',
    content,
  }));
}

function prefixedHash(value: string): string {
  assert.match(value, /^[a-f0-9]{64}$/);
  return `sha256:${value}`;
}

function runtimeHash(value: string): string {
  assert.match(value, /^sha256:[a-f0-9]{64}$/);
  return value.slice('sha256:'.length);
}

function requireEnvironment(key: string): string {
  const value = process.env[key]?.trim();
  if (!value) throw new Error(`${key} is required.`);
  return value;
}

function writeOutput(output: Record<string, unknown>): void {
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${JSON.stringify({
    schema_version: 'ScientificEvidenceP5PacketTraceResultAnalysisSuccessorFailure@v1',
    status: 'failed',
    reason: scientificEvidenceP5TerminalReasonCode(
      error,
      'T136_P5_PACKET_TRACE_RESULT_ANALYSIS_SUCCESSOR_FAILED',
    ),
  })}\n`);
  process.exitCode = 1;
});
