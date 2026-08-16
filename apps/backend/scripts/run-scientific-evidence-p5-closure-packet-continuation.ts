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
  PrismaPaperImplementationResultClaimDossierRepository,
} from '../src/repositories/prisma/prisma-paper-implementation-result-claim-dossier-repository.js';
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
  PaperImplementationResultPacketV2Materializer,
  PaperImplementationValidationCycleClosedCompositeConsumer,
} from '../src/services/paper-implementation-result-packet-v2-materializer.js';
import {
  PaperImplementationValidationCycleClosureV2Service,
} from '../src/services/paper-implementation-validation-cycle-closure-v2-service.js';
import {
  runScientificEvidenceP5ClaimedStageV1,
  scientificEvidenceP5TerminalReasonCode,
  type ScientificEvidenceP5AttemptBindingV1,
} from '../src/services/scientific-evidence-p5-attempt-terminal-service.js';
import {
  assertScientificEvidenceP5ClosurePacketAcceptanceV1,
  assertScientificEvidenceP5ClosurePacketPreparedV1,
  assertScientificEvidenceP5ClosurePacketWindow,
  isScientificEvidenceP5ClosurePacketSuccessorSourceV1,
  type ScientificEvidenceP5ClosurePacketAcceptanceV1,
  type ScientificEvidenceP5ClosurePacketPreparedV1,
} from '../src/services/scientific-evidence-p5-closure-packet-continuation-service.js';
import {
  assertScientificEvidenceP5PacketTraceSuccessorAcceptanceV1,
  assertScientificEvidenceP5PacketTraceSuccessorPreparedV1,
  type ScientificEvidenceP5PacketTraceSuccessorAcceptanceV1,
  type ScientificEvidenceP5PacketTraceSuccessorPreparedV1,
} from '../src/services/scientific-evidence-p5-packet-trace-result-analysis-successor-service.js';
import {
  assertExperimentFoundationLiveNamedLocalTarget,
  assertExperimentFoundationNamedLocalDatabaseUrl,
} from './experiment-foundation-named-local-evidence.js';

type RunnerMode = 'offline-preflight' | 'execute';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const MANIFEST_DIRECTORY = path.join(REPO_ROOT, 'workloads/scifact-recall-p5/manifests');
const PREPARED_PATH = path.join(MANIFEST_DIRECTORY, 'prepared-closure-packet-continuation-v1.json');
const ACCEPTANCE_PATH = path.join(
  MANIFEST_DIRECTORY,
  'authorization-acceptance-closure-packet-continuation-v1.json',
);
const SOURCE_PREPARED_PATH = path.join(
  MANIFEST_DIRECTORY,
  'prepared-packet-trace-result-analysis-successor-v1.json',
);
const SOURCE_ACCEPTANCE_PATH = path.join(
  MANIFEST_DIRECTORY,
  'authorization-acceptance-packet-trace-result-analysis-successor-v1.json',
);
const SOURCE_CLAIM_PATH = path.join(
  MANIFEST_DIRECTORY,
  'credential-attempt-t136-p5-packet-trace-result-analysis-successor-3-packet_trace_result_analysis_successor-claim.json',
);
const SOURCE_COMPLETION_PATH = path.join(
  MANIFEST_DIRECTORY,
  'credential-attempt-t136-p5-packet-trace-result-analysis-successor-3-packet_trace_result_analysis_successor-completion.json',
);
const SOURCE_TERMINAL_PATH = path.join(
  MANIFEST_DIRECTORY,
  'credential-attempt-terminal-t136-p5-packet-trace-result-analysis-successor-3.json',
);
const RECOVERY_ROOT = '/Users/yurui/Desktop/My-Researcher-Recovery/T-136';
const CLOSURE_CAPABILITY = 'PAPER_IMPLEMENTATION_EXPERIMENT_V2_CYCLE_CLOSURE_ENABLED';
const PAI_CAPABILITIES = [
  'EXPERIMENT_FOUNDATION_V2_REAL_PROVIDER_INTAKE_ENABLED',
  'EXPERIMENT_FOUNDATION_V2_REAL_PROVIDER_CONTROL_DRAIN_ENABLED',
  'EXPERIMENT_FOUNDATION_V2_SCIENTIFIC_VALIDATION_ENABLED',
] as const;
const TARGET = Object.freeze({
  database: 'postgres',
  schema: 'my_researcher_dev',
  host: '127.0.0.1',
  port: '5432',
  fingerprint: 'sha256:8851b255b079ad1f049dc1842c41cb3516d5a3ff0b69e21a30e8f2675409cca0',
});

interface RecoveryPointManifest {
  schema: 'ScientificEvidenceP5ClosurePacketRecoveryPoint@v1';
  created_at: string;
  target_fingerprint: string;
  restore_order: ['schema_pre_data', 'authority_data', 'schema_post_data'];
  schema_dump: {
    file: string;
    sha256: string;
    byte_size: number;
    selected_toc_entries: number;
  };
  authority_data_dump: {
    file: string;
    sha256: string;
    byte_size: number;
    table_data_entries: number;
  };
  recovery_fingerprint: string;
}

async function main(): Promise<void> {
  const mode = parseMode(process.argv.slice(2));
  const prepared = await readPrepared();
  if (mode === 'execute') {
    const acceptance = await readAcceptance(prepared);
    assertScientificEvidenceP5ClosurePacketWindow(prepared.continuation_package);
    const output = await runScientificEvidenceP5ClaimedStageV1({
      manifest_directory: MANIFEST_DIRECTORY,
      binding: attemptBinding(prepared),
      stage: 'closure_packet_continuation',
      operation: async () => runWindow(mode, prepared, acceptance),
    });
    writeOutput(output);
    return;
  }
  writeOutput(await runWindow(mode, prepared, null));
}

async function runWindow(
  mode: RunnerMode,
  prepared: ScientificEvidenceP5ClosurePacketPreparedV1,
  acceptance: ScientificEvidenceP5ClosurePacketAcceptanceV1 | null,
): Promise<Record<string, unknown>> {
  const continuationPackage = prepared.continuation_package;
  assertNoProviderCredentialMaterial();
  assertAllCapabilitiesDisabled();
  await assertBoundFiles(prepared);
  const databaseUrl = requireEnvironment('DATABASE_URL');
  assertExperimentFoundationNamedLocalDatabaseUrl(
    databaseUrl,
    TARGET,
    'T136_P5_CLOSURE_PACKET_TARGET_MISMATCH',
  );

  const prisma = new PrismaClient();
  await prisma.$connect();
  try {
    const target = await assertExperimentFoundationLiveNamedLocalTarget(prisma, TARGET);
    const before = await readAuthorityState(prisma, prepared);
    if (mode === 'offline-preflight') {
      return {
        schema_version: 'ScientificEvidenceP5ClosurePacketOfflinePreflight@v1',
        status: 'passed_awaiting_exact_authorization',
        continuation_attempt_id: continuationPackage.continuation_attempt_id,
        package_hash: continuationPackage.package_hash,
        target_fingerprint: target.fingerprint,
        current: before.counts,
        source_result_analysis_binding_verified: true,
        source_packet_trace_successor_binding_verified: true,
        packet_trace_binding_verified: true,
        source_binding_verified: true,
        executor_binding_verified: true,
        recovery_point_verified: true,
        acceptance_present: await fileExists(ACCEPTANCE_PATH),
        external_call_count: 0,
        database_write_count: 0,
        create_job_call_count: 0,
        capability_change_count: 0,
      };
    }

    assert.ok(acceptance);
    enableClosureCapability();
    const authority = continuationPackage.authority;
    const closureRepository =
      new PrismaPaperImplementationValidationCycleClosureV2Repository(prisma);
    const closureService = new PaperImplementationValidationCycleClosureV2Service({
      repository: closureRepository,
      enabled: () => closureCapabilityEnabled(),
    });
    const closed = await closureService.close({
      validation_cycle_id: authority.validation_cycle_id,
      expected_cycle_version: authority.expected_cycle_version,
      expected_closure_input_hash: authority.closure_watermark_hash,
      ...continuationPackage.closure_request,
    });
    assert.ok(closed.closure.scientific_disposition);
    assert.ok(closed.closure.selected_exit_key);

    const piSpineRepository = new PrismaPaperImplementationExperimentSpineV2Repository(prisma);
    const projectionConsumer = new PaperImplementationProjectionFeedV2Consumer({
      repository: piSpineRepository,
    });
    const packetRepository = new PrismaPaperImplementationResultClaimDossierRepository(prisma);
    const relay = new ExperimentV2IntegrationRelayService({
      paperImplementationRepository: piSpineRepository,
      experimentFoundationRepository: new PrismaExperimentFoundationSpineV2Repository(prisma),
      materializationConsumer: { async consume() { throw new Error('Unexpected admission event.'); } },
      headConsumer: { async consume() { throw new Error('Unexpected frozen event.'); } },
      acknowledgementConsumer: { async consume() { throw new Error('Unexpected head event.'); } },
      evidenceTrustGatewayConsumer: { async consume() {
        throw new Error('Unexpected evidence event during Closure/Packet continuation.');
      } },
      runEvidenceProjectionConsumer: { async consume() {
        throw new Error('Unexpected REU event during Closure/Packet continuation.');
      } },
      validationCycleClosedProjectionConsumer:
        new PaperImplementationValidationCycleClosedCompositeConsumer(
          projectionConsumer,
          new PaperImplementationResultPacketV2Materializer(
            closureRepository,
            packetRepository,
          ),
        ),
      workerId: `t136-p5-closure-packet-continuation-${process.pid}`,
    });
    const relayOutcome = await relay.drainUntilIdle({ max_passes: 3, limit_per_domain: 2 });
    assert.equal(relayOutcome.idle, true);
    assert.deepEqual(relayOutcome.failures, []);
    assert.equal(relayOutcome.claimed, 1);
    assert.equal(relayOutcome.delivered, 1);

    const packet = await packetRepository.findResultInterpretationPacketById(
      authority.implementation_project_id,
      authority.result_interpretation_packet_id,
    );
    assert.ok(packet);
    assert.equal(packet.closure_id, closed.closure.closure_id);
    assert.equal(packet.closure_snapshot_hash, closed.closure.closure_snapshot_hash);
    assert.equal(packet.validation_cycle_id, authority.validation_cycle_id);
    assert.deepEqual(await closureService.close({
      validation_cycle_id: authority.validation_cycle_id,
      expected_cycle_version: authority.expected_cycle_version,
      expected_closure_input_hash: authority.closure_watermark_hash,
      ...continuationPackage.closure_request,
    }), closed);
    const replayRelay = await relay.drainUntilIdle({ max_passes: 2, limit_per_domain: 2 });
    assert.equal(replayRelay.idle, true);
    assert.equal(replayRelay.claimed, 0);

    const after = await readPostState(prisma, prepared);
    assert.equal(after.packetTraceManifests, before.counts.packetTraceManifests);
    assert.equal(after.packetTraceRepairQueueItems, before.counts.packetTraceRepairQueueItems);
    assert.equal(after.runtimeArtifacts, before.counts.runtimeArtifacts);
    assert.equal(after.runtimeAdmissions, before.counts.runtimeAdmissions);
    assert.equal(after.closures, 1);
    assert.equal(after.packets, 1);
    assert.equal(after.validationCycleClosedOutboxes, 1);
    assert.equal(after.validationCycleClosedInboxes, 1);
    assert.equal(after.undeliveredIntegrationOutboxes, 0);
    assert.equal(after.claims, before.claims);
    assert.equal(after.dossiers, before.dossiers);
    return {
      schema_version: 'ScientificEvidenceP5ClosurePacketContinuationResult@v1',
      status: 'scientific_closure_and_packet_passed',
      continuation_attempt_id: continuationPackage.continuation_attempt_id,
      package_hash: continuationPackage.package_hash,
      source_final_artifact_id:
        continuationPackage.source_result_analysis.final_artifact.id,
      source_final_artifact_hash:
        continuationPackage.source_result_analysis.final_artifact.final_artifact_hash,
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
      provider_call_count: 0,
      runtime_artifact_write_count: 0,
      runtime_admission_write_count: 0,
      create_job_call_count: 0,
      alibaba_cloud_call_count: 0,
      claim_write_count: 0,
      dossier_write_count: 0,
      persistent_capability_change_count: 0,
    };
  } finally {
    disableClosureCapability();
    await prisma.$disconnect();
    assertAllCapabilitiesDisabled();
  }
}

async function readAuthorityState(
  prisma: PrismaClient,
  prepared: ScientificEvidenceP5ClosurePacketPreparedV1,
) {
  const continuationPackage = prepared.continuation_package;
  const authority = continuationPackage.authority;
  assert.ok(isScientificEvidenceP5ClosurePacketSuccessorSourceV1(
    continuationPackage.source_result_analysis,
  ));
  assert.ok(authority.packet_trace);
  const readiness = await new PaperImplementationCycleReadinessV2Service({
    repository: new PrismaPaperImplementationCycleReadinessV2Repository(prisma),
  }).evaluate(authority.validation_cycle_id);
  assert.equal(readiness.status, 'ready_with_evidence');
  assert.equal(readiness.watermark.expected_cycle_version, authority.expected_cycle_version);
  assert.equal(readiness.watermark.closure_input_hash, authority.closure_watermark_hash);
  assert.equal(readiness.watermark.active_real_attempt_count, 0);
  const post = await readPostState(prisma, prepared);
  const counts = {
    packetTraceManifests: post.packetTraceManifests,
    packetTraceRepairQueueItems: post.packetTraceRepairQueueItems,
    runtimeArtifacts: post.runtimeArtifacts,
    runtimeAdmissions: post.runtimeAdmissions,
    closures: post.closures,
    packets: post.packets,
    validationCycleClosedOutboxes: post.validationCycleClosedOutboxes,
    validationCycleClosedInboxes: post.validationCycleClosedInboxes,
    undeliveredIntegrationOutboxes: post.undeliveredIntegrationOutboxes,
  };
  assert.deepEqual({
    packet_trace_manifests: counts.packetTraceManifests,
    packet_trace_repair_queue_items: counts.packetTraceRepairQueueItems,
    runtime_artifacts: counts.runtimeArtifacts,
    runtime_admissions: counts.runtimeAdmissions,
    closures: counts.closures,
    packets: counts.packets,
    validation_cycle_closed_outboxes: counts.validationCycleClosedOutboxes,
    validation_cycle_closed_inboxes: counts.validationCycleClosedInboxes,
    undelivered_integration_outboxes: counts.undeliveredIntegrationOutboxes,
  }, authority.current_effects);
  const [artifact, admission, packetTrace] = await Promise.all([
    prisma.paperImplementationRuntimeArtifact.findUnique({
      where: { id: continuationPackage.source_result_analysis.final_artifact.id },
      select: {
        id: true,
        artifactScope: true,
        runtimeStatus: true,
        artifactIdentityHash: true,
        runtimeIdentityHash: true,
        finalArtifactHash: true,
      },
    }),
    prisma.paperImplementationRuntimeAdmissionRecord.findUnique({
      where: { id: continuationPackage.source_result_analysis.final_admission.id },
      select: {
        id: true,
        runtimeArtifactId: true,
        admissionScope: true,
        admissionStatus: true,
        admissionIdentityHash: true,
        runtimeArtifactHash: true,
        admittedArtifactHash: true,
      },
    }),
    prisma.paperImplementationTraceManifest.findUnique({
      where: { id: authority.packet_trace.id },
      select: {
        id: true,
        targetRefType: true,
        targetRefId: true,
        targetVersionId: true,
        traceStatus: true,
        missingRefCount: true,
        brokenRefCount: true,
        staleRefCount: true,
        experimentLineage: true,
      },
    }),
  ]);
  assert.ok(artifact);
  assert.ok(admission);
  assert.ok(packetTrace);
  assert.equal(packetTrace.id, authority.packet_trace.id);
  assert.equal(packetTrace.targetRefType, authority.packet_trace.target_ref_type);
  assert.equal(packetTrace.targetRefId, authority.packet_trace.target_ref_id);
  assert.equal(packetTrace.targetVersionId, authority.packet_trace.target_version_id);
  assert.equal(packetTrace.traceStatus, authority.packet_trace.expected_status);
  assert.equal(packetTrace.missingRefCount, 0);
  assert.equal(packetTrace.brokenRefCount, 0);
  assert.equal(packetTrace.staleRefCount, 0);
  assert.equal(runEvidenceRefCount(packetTrace.experimentLineage), 1);
  assert.deepEqual({
    id: artifact.id,
    artifact_identity_hash: artifact.artifactIdentityHash,
    runtime_identity_hash: artifact.runtimeIdentityHash,
    final_artifact_hash: artifact.finalArtifactHash,
  }, continuationPackage.source_result_analysis.final_artifact);
  assert.equal(artifact.artifactScope, 'final');
  assert.equal(artifact.runtimeStatus, 'passed');
  assert.deepEqual({
    id: admission.id,
    admission_identity_hash: admission.admissionIdentityHash,
    runtime_artifact_hash: admission.runtimeArtifactHash,
    admitted_artifact_hash: admission.admittedArtifactHash,
    status: admission.admissionStatus,
  }, continuationPackage.source_result_analysis.final_admission);
  assert.equal(admission.runtimeArtifactId, artifact.id);
  assert.equal(admission.admissionScope, 'final');
  const officialProposal = await new PrismaPaperImplementationValidationCycleClosureV2Repository(
    prisma,
  ).withTransaction((transaction) => transaction.findAdmittedScientificClosureProposal(
    artifact.id,
    continuationPackage.source_result_analysis.final_artifact.final_artifact_hash,
  ));
  assert.ok(
    officialProposal,
    'T136_P5_CLOSURE_PACKET_OFFICIAL_PROPOSAL_UNRESOLVED',
  );
  assert.ok(
    officialProposal.packet_materialization,
    'T136_P5_CLOSURE_PACKET_MATERIALIZATION_UNRESOLVED',
  );
  assert.equal(
    officialProposal.packet_materialization.request.result_interpretation_packet_id,
    authority.result_interpretation_packet_id,
    'T136_P5_CLOSURE_PACKET_TRACE_TARGET_MISMATCH',
  );
  assert.equal(
    officialProposal.packet_materialization.request.trace_manifest_id,
    authority.packet_trace.id,
    'T136_P5_CLOSURE_PACKET_TRACE_TARGET_MISMATCH',
  );
  return { counts, claims: post.claims, dossiers: post.dossiers };
}

async function readPostState(
  prisma: PrismaClient,
  prepared: ScientificEvidenceP5ClosurePacketPreparedV1,
) {
  const authority = prepared.continuation_package.authority;
  const packetTraceId = authority.packet_trace?.id ?? '__no_packet_trace__';
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
    claims,
    dossiers,
  ] = await Promise.all([
    prisma.paperImplementationTraceManifest.count({ where: { id: packetTraceId } }),
    prisma.paperImplementationTraceRepairQueueItem.count({
      where: { traceManifestId: packetTraceId },
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
      where: {
        validationCycleId: authority.validation_cycle_id,
        eventType: 'ValidationCycleClosed@v1',
      },
    }),
    prisma.paperImplementationExperimentIntegrationInboxV2.count({
      where: {
        validationCycleId: authority.validation_cycle_id,
        eventType: 'ValidationCycleClosed@v1',
      },
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
    prisma.paperImplementationClaimCandidate.count({
      where: { implementationProjectId: authority.implementation_project_id },
    }),
    prisma.paperImplementationDossier.count({
      where: { implementationProjectId: authority.implementation_project_id },
    }),
  ]);
  return {
    packetTraceManifests,
    packetTraceRepairQueueItems,
    runtimeArtifacts,
    runtimeAdmissions,
    closures,
    packets,
    validationCycleClosedOutboxes,
    validationCycleClosedInboxes,
    undeliveredIntegrationOutboxes: undeliveredPi + undeliveredEf + undeliveredPromotion,
    claims,
    dossiers,
  };
}

async function assertBoundFiles(
  prepared: ScientificEvidenceP5ClosurePacketPreparedV1,
): Promise<void> {
  const continuationPackage = prepared.continuation_package;
  const source = continuationPackage.source_result_analysis;
  assert.ok(isScientificEvidenceP5ClosurePacketSuccessorSourceV1(source));
  const sourcePreparedBytes = await fs.readFile(SOURCE_PREPARED_PATH, 'utf8');
  const sourceAcceptanceBytes = await fs.readFile(SOURCE_ACCEPTANCE_PATH, 'utf8');
  const sourceClaimBytes = await fs.readFile(SOURCE_CLAIM_PATH, 'utf8');
  const sourceCompletionBytes = await fs.readFile(SOURCE_COMPLETION_PATH, 'utf8');
  assert.equal(sha256(sourcePreparedBytes), source.prepared_record_sha256);
  assert.equal(sha256(sourceAcceptanceBytes), source.acceptance_record_sha256);
  assert.equal(sha256(sourceClaimBytes), source.claim_record_sha256);
  assert.equal(sha256(sourceCompletionBytes), source.completion_record_sha256);
  await assertFileAbsent(SOURCE_TERMINAL_PATH, 'T136_P5_CLOSURE_PACKET_SOURCE_TERMINAL_PRESENT');
  const sourcePrepared = JSON.parse(sourcePreparedBytes) as
    ScientificEvidenceP5PacketTraceSuccessorPreparedV1;
  const sourceAcceptance = JSON.parse(sourceAcceptanceBytes) as
    ScientificEvidenceP5PacketTraceSuccessorAcceptanceV1;
  assertScientificEvidenceP5PacketTraceSuccessorPreparedV1(sourcePrepared);
  assertScientificEvidenceP5PacketTraceSuccessorAcceptanceV1({
    prepared: sourcePrepared,
    acceptance: sourceAcceptance,
  });
  assert.equal(
    sourcePrepared.successor_package.successor_attempt_id,
    source.successor_attempt_id,
  );
  assert.equal(sourcePrepared.successor_package.package_hash, source.package_hash);
  const sourceClaim = JSON.parse(sourceClaimBytes) as {
    status: string;
    p5_attempt_id: string;
    package_hash: string;
    stage: string;
  };
  assert.deepEqual({
    status: sourceClaim.status,
    p5_attempt_id: sourceClaim.p5_attempt_id,
    package_hash: sourceClaim.package_hash,
    stage: sourceClaim.stage,
  }, {
    status: 'claimed',
    p5_attempt_id: source.successor_attempt_id,
    package_hash: source.package_hash,
    stage: source.source_stage,
  });
  const sourceCompletion = JSON.parse(sourceCompletionBytes) as {
    status: string;
    p5_attempt_id: string;
    package_hash: string;
    stage: string;
  };
  assert.deepEqual({
    status: sourceCompletion.status,
    p5_attempt_id: sourceCompletion.p5_attempt_id,
    package_hash: sourceCompletion.package_hash,
    stage: sourceCompletion.stage,
  }, {
    status: 'completed',
    p5_attempt_id: source.successor_attempt_id,
    package_hash: source.package_hash,
    stage: source.source_stage,
  });
  for (const source of continuationPackage.source_binding.source_files) {
    assert.equal(await sha256File(path.join(REPO_ROOT, source.path)), source.sha256);
  }
  assert.equal(
    await sha256File(path.join(REPO_ROOT, continuationPackage.executor.path)),
    continuationPackage.executor.sha256,
  );
  const recoveryManifestPath = path.join(
    RECOVERY_ROOT,
    continuationPackage.recovery_point.manifest_ref,
  );
  const recoveryPoint = JSON.parse(
    await fs.readFile(recoveryManifestPath, 'utf8'),
  ) as RecoveryPointManifest;
  assert.equal(recoveryPoint.schema, 'ScientificEvidenceP5ClosurePacketRecoveryPoint@v1');
  assert.equal(recoveryPoint.created_at, continuationPackage.recovery_point.created_at);
  assert.equal(recoveryPoint.target_fingerprint, continuationPackage.recovery_point.target_fingerprint);
  assert.deepEqual(recoveryPoint.restore_order, [
    'schema_pre_data',
    'authority_data',
    'schema_post_data',
  ]);
  assert.equal(recoveryPoint.schema_dump.selected_toc_entries, 2046);
  assert.equal(recoveryPoint.recovery_fingerprint, continuationPackage.recovery_point.recovery_fingerprint);
  assert.equal(recoveryFingerprint(recoveryPoint), recoveryPoint.recovery_fingerprint);
  assert.equal(recoveryPoint.schema_dump.sha256, continuationPackage.recovery_point.schema_dump_sha256);
  assert.equal(
    recoveryPoint.authority_data_dump.sha256,
    continuationPackage.recovery_point.authority_data_dump_sha256,
  );
  assert.equal(recoveryPoint.authority_data_dump.table_data_entries, 114);
  const directory = path.dirname(recoveryManifestPath);
  assert.equal((await fs.stat(directory)).mode & 0o777, 0o700);
  const schemaDumpPath = path.join(directory, recoveryPoint.schema_dump.file);
  const authorityDumpPath = path.join(directory, recoveryPoint.authority_data_dump.file);
  assert.equal(await sha256File(schemaDumpPath), recoveryPoint.schema_dump.sha256);
  assert.equal(
    await sha256File(authorityDumpPath),
    recoveryPoint.authority_data_dump.sha256,
  );
  assert.equal((await fs.stat(schemaDumpPath)).size, recoveryPoint.schema_dump.byte_size);
  assert.equal((await fs.stat(authorityDumpPath)).size, recoveryPoint.authority_data_dump.byte_size);
  for (const filePath of [recoveryManifestPath, schemaDumpPath, authorityDumpPath]) {
    assert.equal((await fs.stat(filePath)).mode & 0o777, 0o600);
  }
}

async function readPrepared(): Promise<ScientificEvidenceP5ClosurePacketPreparedV1> {
  const parsed = JSON.parse(await fs.readFile(PREPARED_PATH, 'utf8')) as
    ScientificEvidenceP5ClosurePacketPreparedV1;
  assertScientificEvidenceP5ClosurePacketPreparedV1(parsed);
  return parsed;
}

async function readAcceptance(
  prepared: ScientificEvidenceP5ClosurePacketPreparedV1,
): Promise<ScientificEvidenceP5ClosurePacketAcceptanceV1> {
  const parsed = JSON.parse(await fs.readFile(ACCEPTANCE_PATH, 'utf8')) as
    ScientificEvidenceP5ClosurePacketAcceptanceV1;
  assertScientificEvidenceP5ClosurePacketAcceptanceV1({ prepared, acceptance: parsed });
  return parsed;
}

function attemptBinding(
  prepared: ScientificEvidenceP5ClosurePacketPreparedV1,
): ScientificEvidenceP5AttemptBindingV1 {
  return {
    p5_attempt_id: prepared.continuation_package.continuation_attempt_id,
    package_hash: prepared.continuation_package.package_hash,
  };
}

function assertNoProviderCredentialMaterial(): void {
  for (const key of [
    'ALIBABA_CLOUD_ACCESS_KEY_ID',
    'ALIBABA_CLOUD_ACCESS_KEY_SECRET',
    'ALIBABA_CLOUD_SECURITY_TOKEN',
    'ALIBABA_CLOUD_SESSION_TOKEN',
  ]) {
    assert.equal(process.env[key], undefined, `${key} must be absent from continuation execution.`);
  }
}

function assertAllCapabilitiesDisabled(): void {
  for (const key of [...PAI_CAPABILITIES, CLOSURE_CAPABILITY]) {
    const value = process.env[key]?.trim().toLowerCase();
    assert.ok(
      value === undefined || value === '' || value === 'false' || value === '0',
      `${key} must remain disabled outside the Closure/Packet operation.`,
    );
  }
}

function enableClosureCapability(): void {
  assertAllCapabilitiesDisabled();
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

async function assertFileAbsent(filePath: string, code: string): Promise<void> {
  try {
    await fs.access(filePath);
    throw new Error(code);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
    throw error;
  }
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

async function sha256File(filePath: string): Promise<string> {
  return sha256(await fs.readFile(filePath));
}

function sha256(value: string | Uint8Array): string {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

function recoveryFingerprint(point: RecoveryPointManifest): string {
  const { recovery_fingerprint: _stored, ...core } = point;
  return sha256(canonicalizeExperimentV2Json(core));
}

function runEvidenceRefCount(experimentLineage: unknown): number {
  if (!experimentLineage || typeof experimentLineage !== 'object' || Array.isArray(experimentLineage)) {
    return -1;
  }
  const refs = (experimentLineage as { run_evidence_refs?: unknown }).run_evidence_refs;
  return Array.isArray(refs) ? refs.length : -1;
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
  disableClosureCapability();
  process.stderr.write(`${JSON.stringify({
    schema_version: 'ScientificEvidenceP5ClosurePacketContinuationFailure@v1',
    status: 'failed',
    reason: scientificEvidenceP5TerminalReasonCode(
      error,
      'T136_P5_CLOSURE_PACKET_CONTINUATION_FAILED',
    ),
  })}\n`);
  process.exitCode = 1;
});
