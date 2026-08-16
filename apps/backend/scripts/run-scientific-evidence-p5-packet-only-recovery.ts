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
import type {
  ValidationCycleClosedEventV1,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-experiment-v2-contracts';
import {
  PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SLOT_ID,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-runtime-contracts';

import {
  reconstructExperimentV2Event,
} from '../src/repositories/experiment-v2-stored-integration-event.js';
import {
  PrismaPaperImplementationResultClaimDossierRepository,
} from '../src/repositories/prisma/prisma-paper-implementation-result-claim-dossier-repository.js';
import {
  PrismaPaperImplementationValidationCycleClosureV2Repository,
} from '../src/repositories/prisma/prisma-paper-implementation-validation-cycle-closure-v2-repository.js';
import {
  runScientificEvidenceP5ClaimedStageV1,
  type ScientificEvidenceP5AttemptBindingV1,
} from '../src/services/scientific-evidence-p5-attempt-terminal-service.js';
import {
  assertScientificEvidenceP5ClosurePacketAcceptanceV1,
  assertScientificEvidenceP5ClosurePacketPreparedV1,
  type ScientificEvidenceP5ClosurePacketAcceptanceV1,
  type ScientificEvidenceP5ClosurePacketPreparedV1,
} from '../src/services/scientific-evidence-p5-closure-packet-continuation-service.js';
import {
  assertScientificEvidenceP5PacketOnlyRecoveryAcceptanceV1,
  assertScientificEvidenceP5PacketOnlyRecoveryPreparedV1,
  assertScientificEvidenceP5PacketOnlyRecoveryWindow,
  type ScientificEvidenceP5PacketOnlyRecoveryAcceptanceV1,
  type ScientificEvidenceP5PacketOnlyRecoveryPreparedV1,
} from '../src/services/scientific-evidence-p5-packet-only-recovery-service.js';
import {
  PaperImplementationResultPacketV2Materializer,
} from '../src/services/paper-implementation-result-packet-v2-materializer.js';
import {
  assertExperimentFoundationLiveNamedLocalTarget,
  assertExperimentFoundationNamedLocalDatabaseUrl,
} from './experiment-foundation-named-local-evidence.js';

type RunnerMode = 'offline-preflight' | 'execute';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const MANIFEST_DIRECTORY = path.join(REPO_ROOT, 'workloads/scifact-recall-p5/manifests');
const PREPARED_PATH = path.join(MANIFEST_DIRECTORY, 'prepared-packet-only-recovery-v1.json');
const ACCEPTANCE_PATH = path.join(
  MANIFEST_DIRECTORY,
  'authorization-acceptance-packet-only-recovery-v1.json',
);
const PREDECESSOR_PREPARED_PATH = path.join(
  MANIFEST_DIRECTORY,
  'prepared-closure-packet-continuation-v1.json',
);
const PREDECESSOR_ACCEPTANCE_PATH = path.join(
  MANIFEST_DIRECTORY,
  'authorization-acceptance-closure-packet-continuation-v1.json',
);
const PREDECESSOR_CLAIM_PATH = path.join(
  MANIFEST_DIRECTORY,
  'credential-attempt-t136-p5-closure-packet-continuation-2-closure_packet_continuation-claim.json',
);
const PREDECESSOR_COMPLETION_PATH = path.join(
  MANIFEST_DIRECTORY,
  'credential-attempt-t136-p5-closure-packet-continuation-2-closure_packet_continuation-completion.json',
);
const PREDECESSOR_TERMINAL_PATH = path.join(
  MANIFEST_DIRECTORY,
  'credential-attempt-terminal-t136-p5-closure-packet-continuation-2.json',
);
const SUCCESSOR_PREPARED_PATH = path.join(
  MANIFEST_DIRECTORY,
  'prepared-packet-trace-result-analysis-successor-v1.json',
);
const SUCCESSOR_ACCEPTANCE_PATH = path.join(
  MANIFEST_DIRECTORY,
  'authorization-acceptance-packet-trace-result-analysis-successor-v1.json',
);
const SUCCESSOR_CLAIM_PATH = path.join(
  MANIFEST_DIRECTORY,
  'credential-attempt-t136-p5-packet-trace-result-analysis-successor-3-packet_trace_result_analysis_successor-claim.json',
);
const SUCCESSOR_COMPLETION_PATH = path.join(
  MANIFEST_DIRECTORY,
  'credential-attempt-t136-p5-packet-trace-result-analysis-successor-3-packet_trace_result_analysis_successor-completion.json',
);
const RECOVERY_ROOT = '/Users/yurui/Desktop/My-Researcher-Recovery/T-136';
const PAI_CAPABILITIES = [
  'EXPERIMENT_FOUNDATION_V2_REAL_PROVIDER_INTAKE_ENABLED',
  'EXPERIMENT_FOUNDATION_V2_REAL_PROVIDER_CONTROL_DRAIN_ENABLED',
  'EXPERIMENT_FOUNDATION_V2_SCIENTIFIC_VALIDATION_ENABLED',
  'PAPER_IMPLEMENTATION_EXPERIMENT_V2_CYCLE_CLOSURE_ENABLED',
] as const;
const TARGET = Object.freeze({
  database: 'postgres',
  schema: 'my_researcher_dev',
  host: '127.0.0.1',
  port: '5432',
  fingerprint: 'sha256:8851b255b079ad1f049dc1842c41cb3516d5a3ff0b69e21a30e8f2675409cca0',
});

interface RecoveryPointManifest {
  schema: 'ScientificEvidenceP5PacketOnlyRecoveryPoint@v1';
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
    assertScientificEvidenceP5PacketOnlyRecoveryWindow(prepared.recovery_package);
    const output = await runScientificEvidenceP5ClaimedStageV1({
      manifest_directory: MANIFEST_DIRECTORY,
      binding: attemptBinding(prepared),
      stage: 'packet_only_recovery',
      operation: async () => runWindow(mode, prepared, acceptance),
    });
    writeOutput(output);
    return;
  }
  writeOutput(await runWindow(mode, prepared, null));
}

async function runWindow(
  mode: RunnerMode,
  prepared: ScientificEvidenceP5PacketOnlyRecoveryPreparedV1,
  acceptance: ScientificEvidenceP5PacketOnlyRecoveryAcceptanceV1 | null,
): Promise<Record<string, unknown>> {
  assertNoProviderCredentialMaterial();
  assertAllCapabilitiesDisabled();
  await assertBoundFiles(prepared);
  const databaseUrl = requireEnvironment('DATABASE_URL');
  assertExperimentFoundationNamedLocalDatabaseUrl(
    databaseUrl,
    TARGET,
    'T136_P5_PACKET_ONLY_RECOVERY_TARGET_MISMATCH',
  );
  const prisma = new PrismaClient();
  await prisma.$connect();
  try {
    const target = await assertExperimentFoundationLiveNamedLocalTarget(prisma, TARGET);
    const before = await readExactAuthority(prisma, prepared);
    const packetRepository = new PrismaPaperImplementationResultClaimDossierRepository(prisma);
    const closureRepository = new PrismaPaperImplementationValidationCycleClosureV2Repository(prisma);
    const materializer = new PaperImplementationResultPacketV2Materializer(
      closureRepository,
      packetRepository,
    );
    const packet = await materializer.assembleClosedPacket(before.event);
    assert.ok(packet, 'T136_P5_PACKET_ONLY_RECOVERY_PACKET_NOT_SCIENTIFIC');
    assert.equal(
      packet.result_interpretation_packet_id,
      prepared.recovery_package.authority.packet.result_interpretation_packet_id,
    );
    assert.equal(
      packet.packet_content_hash,
      prepared.recovery_package.authority.packet.packet_content_hash,
    );
    assert.equal(packet.trace_manifest_id, prepared.recovery_package.authority.packet.trace_manifest_id);
    assert.equal(packet.created_at, prepared.recovery_package.authority.packet.created_at);
    if (mode === 'offline-preflight') {
      return {
        schema_version: 'ScientificEvidenceP5PacketOnlyRecoveryOfflinePreflight@v1',
        status: 'passed_awaiting_exact_authorization',
        recovery_attempt_id: prepared.recovery_package.recovery_attempt_id,
        package_hash: prepared.recovery_package.package_hash,
        target_fingerprint: target.fingerprint,
        packet: prepared.recovery_package.authority.packet,
        terminal_outbox_binding_verified: true,
        processed_inbox_binding_verified: true,
        predecessor_binding_verified: true,
        successor_binding_verified: true,
        source_binding_verified: true,
        executor_binding_verified: true,
        recovery_point_verified: true,
        acceptance_present: await fileExists(ACCEPTANCE_PATH),
        current: before.counts,
        database_write_count: 0,
        external_call_count: 0,
        create_job_call_count: 0,
        capability_change_count: 0,
      };
    }
    assert.ok(acceptance);
    const authority = prepared.recovery_package.authority;
    const result = await packetRepository.recoverTerminalClosedResultInterpretationPacket({
      packet,
      terminal_outbox: {
        outbox_id: authority.terminal_outbox.outbox_id,
        event_id: authority.terminal_outbox.event_id,
        event_envelope_hash: authority.terminal_outbox.event_envelope_hash,
        payload_hash: authority.terminal_outbox.payload_hash,
        relay_attempt_count: authority.terminal_outbox.relay_attempt_count,
        last_relay_error_code: authority.terminal_outbox.last_relay_error_code,
        terminal_updated_at: authority.terminal_outbox.terminal_updated_at,
      },
      processed_inbox: {
        inbox_id: authority.processed_inbox.inbox_id,
        consumer_name: authority.processed_inbox.consumer_name,
        event_id: authority.processed_inbox.event_id,
        event_envelope_hash: authority.processed_inbox.event_envelope_hash,
        payload_hash: authority.processed_inbox.payload_hash,
        processed_at: authority.processed_inbox.processed_at,
      },
      recovered_at: new Date().toISOString(),
    });
    assert.equal(result.outbox_transition, 'terminal_to_delivered');
    const after = await readPostState(prisma, prepared);
    assert.equal(after.packetTraceManifests, before.counts.packet_trace_manifests);
    assert.equal(after.packetTraceRepairQueueItems, before.counts.packet_trace_repair_queue_items);
    assert.equal(after.runtimeArtifacts, before.counts.runtime_artifacts);
    assert.equal(after.runtimeAdmissions, before.counts.runtime_admissions);
    assert.equal(after.closures, before.counts.closures);
    assert.equal(after.packets, 1);
    assert.equal(after.validationCycleClosedOutboxes, 1);
    assert.equal(after.validationCycleClosedInboxes, 1);
    assert.equal(after.undeliveredIntegrationOutboxes, 0);
    assert.equal(after.claims, 0);
    assert.equal(after.dossiers, 0);
    assert.equal(after.outbox?.relayStatus, 'delivered');
    assert.ok(after.outbox?.deliveredAt);
    assert.equal(after.outbox?.lastRelayErrorCode, null);
    assert.equal(after.packet?.packetContentHash, packet.packet_content_hash);
    return {
      schema_version: 'ScientificEvidenceP5PacketOnlyRecoveryResult@v1',
      status: 'packet_materialized_terminal_outbox_delivered',
      recovery_attempt_id: prepared.recovery_package.recovery_attempt_id,
      package_hash: prepared.recovery_package.package_hash,
      packet: {
        packet_id: result.packet.result_interpretation_packet_id,
        packet_content_hash: result.packet.packet_content_hash,
      },
      outbox: {
        outbox_id: authority.terminal_outbox.outbox_id,
        transition: result.outbox_transition,
      },
      packet_write_count: 1,
      terminal_outbox_delivery_count: 1,
      terminal_outbox_reset_count: 0,
      closure_write_count: 0,
      projection_inbox_write_count: 0,
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
    await prisma.$disconnect();
    assertAllCapabilitiesDisabled();
  }
}

async function readExactAuthority(
  prisma: PrismaClient,
  prepared: ScientificEvidenceP5PacketOnlyRecoveryPreparedV1,
) {
  const authority = prepared.recovery_package.authority;
  const post = await readPostState(prisma, prepared);
  assert.deepEqual(post.counts, authority.current_effects);
  const closure = post.closure;
  const outbox = post.outbox;
  const inbox = post.inbox;
  assert.ok(closure && outbox && inbox);
  assert.deepEqual({
    closure_id: closure.id,
    closure_snapshot_hash: closure.closureSnapshotHash,
    closure_kind: closure.closureKind,
    accepted_proposal_id: closure.acceptedProposalId,
    accepted_proposal_hash: closure.acceptedProposalHash,
    scientific_disposition: closure.scientificDisposition,
    created_at: closure.createdAt.toISOString(),
  }, authority.closure);
  assert.deepEqual({
    outbox_id: outbox.id,
    event_id: outbox.eventId,
    event_envelope_hash: outbox.eventEnvelopeHash,
    payload_hash: outbox.payloadHash,
    relay_status: outbox.relayStatus,
    relay_attempt_count: outbox.relayAttemptCount,
    last_relay_error_code: outbox.lastRelayErrorCode,
    terminal_updated_at: outbox.updatedAt.toISOString(),
  }, authority.terminal_outbox);
  assert.equal(outbox.relayLeaseOwner, null);
  assert.equal(outbox.relayLeaseExpiresAt, null);
  assert.equal(outbox.relayNextAttemptAt, null);
  assert.equal(outbox.publishedAt, null);
  assert.equal(outbox.deliveredAt, null);
  assert.deepEqual({
    inbox_id: inbox.id,
    consumer_name: inbox.consumerName,
    event_id: inbox.eventId,
    event_envelope_hash: inbox.eventEnvelopeHash,
    payload_hash: inbox.payloadHash,
    status: inbox.status,
    outcome: inbox.outcome,
    processed_at: inbox.processedAt.toISOString(),
  }, authority.processed_inbox);
  assert.equal(inbox.reasonCode, null);
  const event = reconstructExperimentV2Event(outbox);
  assert.equal(event.event_type, 'ValidationCycleClosed@v1');
  return {
    counts: post.counts,
    event: event as ValidationCycleClosedEventV1,
  };
}

async function readPostState(
  prisma: PrismaClient,
  prepared: ScientificEvidenceP5PacketOnlyRecoveryPreparedV1,
) {
  const authority = prepared.recovery_package.authority;
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
    closure,
    outbox,
    inbox,
    packet,
  ] = await Promise.all([
    prisma.paperImplementationTraceManifest.count({
      where: { id: authority.packet.trace_manifest_id },
    }),
    prisma.paperImplementationTraceRepairQueueItem.count({
      where: { traceManifestId: authority.packet.trace_manifest_id },
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
    prisma.paperImplementationValidationCycleClosureV2.findUnique({
      where: { validationCycleId: authority.validation_cycle_id },
    }),
    prisma.paperImplementationExperimentIntegrationOutboxV2.findUnique({
      where: { id: authority.terminal_outbox.outbox_id },
    }),
    prisma.paperImplementationExperimentIntegrationInboxV2.findUnique({
      where: { id: authority.processed_inbox.inbox_id },
    }),
    prisma.paperImplementationResultInterpretationPacket.findFirst({
      where: {
        implementationProjectId: authority.implementation_project_id,
        id: authority.packet.result_interpretation_packet_id,
      },
    }),
  ]);
  const counts = {
    packet_trace_manifests: packetTraceManifests,
    packet_trace_repair_queue_items: packetTraceRepairQueueItems,
    runtime_artifacts: runtimeArtifacts,
    runtime_admissions: runtimeAdmissions,
    closures,
    packets,
    validation_cycle_closed_outboxes: validationCycleClosedOutboxes,
    validation_cycle_closed_inboxes: validationCycleClosedInboxes,
    undelivered_integration_outboxes: undeliveredPi + undeliveredEf + undeliveredPromotion,
    claims,
    dossiers,
  };
  return {
    packetTraceManifests,
    packetTraceRepairQueueItems,
    runtimeArtifacts,
    runtimeAdmissions,
    closures,
    packets,
    validationCycleClosedOutboxes,
    validationCycleClosedInboxes,
    undeliveredIntegrationOutboxes: counts.undelivered_integration_outboxes,
    claims,
    dossiers,
    closure,
    outbox,
    inbox,
    packet,
    counts,
  };
}

async function assertBoundFiles(
  prepared: ScientificEvidenceP5PacketOnlyRecoveryPreparedV1,
): Promise<void> {
  const recoveryPackage = prepared.recovery_package;
  const predecessor = recoveryPackage.predecessor;
  const [
    predecessorPreparedBytes,
    predecessorAcceptanceBytes,
    predecessorClaimBytes,
    predecessorTerminalBytes,
    successorPreparedBytes,
    successorAcceptanceBytes,
    successorClaimBytes,
    successorCompletionBytes,
  ] = await Promise.all([
    fs.readFile(PREDECESSOR_PREPARED_PATH, 'utf8'),
    fs.readFile(PREDECESSOR_ACCEPTANCE_PATH, 'utf8'),
    fs.readFile(PREDECESSOR_CLAIM_PATH, 'utf8'),
    fs.readFile(PREDECESSOR_TERMINAL_PATH, 'utf8'),
    fs.readFile(SUCCESSOR_PREPARED_PATH, 'utf8'),
    fs.readFile(SUCCESSOR_ACCEPTANCE_PATH, 'utf8'),
    fs.readFile(SUCCESSOR_CLAIM_PATH, 'utf8'),
    fs.readFile(SUCCESSOR_COMPLETION_PATH, 'utf8'),
  ]);
  await assertFileAbsent(
    PREDECESSOR_COMPLETION_PATH,
    'T136_P5_PACKET_ONLY_RECOVERY_PREDECESSOR_COMPLETION_PRESENT',
  );
  assert.equal(sha256(predecessorPreparedBytes), predecessor.prepared_record_sha256);
  assert.equal(sha256(predecessorAcceptanceBytes), predecessor.acceptance_record_sha256);
  assert.equal(sha256(predecessorClaimBytes), predecessor.claim_record_sha256);
  assert.equal(sha256(predecessorTerminalBytes), predecessor.terminal_record_sha256);
  const predecessorPrepared = JSON.parse(predecessorPreparedBytes) as
    ScientificEvidenceP5ClosurePacketPreparedV1;
  assertScientificEvidenceP5ClosurePacketPreparedV1(predecessorPrepared);
  assert.equal(
    predecessorPrepared.continuation_package.continuation_attempt_id,
    predecessor.continuation_attempt_id,
  );
  assert.equal(predecessorPrepared.continuation_package.package_hash, predecessor.package_hash);
  assertScientificEvidenceP5ClosurePacketAcceptanceV1({
    prepared: predecessorPrepared,
    acceptance: JSON.parse(predecessorAcceptanceBytes) as
      ScientificEvidenceP5ClosurePacketAcceptanceV1,
  });
  assertStageRecord(JSON.parse(predecessorClaimBytes), {
    status: 'claimed',
    attempt: predecessor.continuation_attempt_id,
    packageHash: predecessor.package_hash,
    stage: 'closure_packet_continuation',
  });
  assertStageRecord(JSON.parse(predecessorTerminalBytes), {
    status: 'terminal',
    attempt: predecessor.continuation_attempt_id,
    packageHash: predecessor.package_hash,
    failedStage: 'closure_packet_continuation',
    reasonCode: predecessor.terminal_reason_code,
  });
  const source = predecessor.source_successor;
  assert.equal(sha256(successorPreparedBytes), source.prepared_record_sha256);
  assert.equal(sha256(successorAcceptanceBytes), source.acceptance_record_sha256);
  assert.equal(sha256(successorClaimBytes), source.claim_record_sha256);
  assert.equal(sha256(successorCompletionBytes), source.completion_record_sha256);
  assertStageRecord(JSON.parse(successorClaimBytes), {
    status: 'claimed',
    attempt: source.successor_attempt_id,
    packageHash: source.package_hash,
    stage: 'packet_trace_result_analysis_successor',
  });
  assertStageRecord(JSON.parse(successorCompletionBytes), {
    status: 'completed',
    attempt: source.successor_attempt_id,
    packageHash: source.package_hash,
    stage: 'packet_trace_result_analysis_successor',
  });
  for (const file of recoveryPackage.source_binding.source_files) {
    assert.equal(await sha256File(path.join(REPO_ROOT, file.path)), file.sha256);
  }
  assert.equal(
    await sha256File(path.join(REPO_ROOT, recoveryPackage.executor.path)),
    recoveryPackage.executor.sha256,
  );
  await assertRecoveryPoint(prepared);
}

async function assertRecoveryPoint(
  prepared: ScientificEvidenceP5PacketOnlyRecoveryPreparedV1,
): Promise<void> {
  const binding = prepared.recovery_package.recovery_point;
  const manifestPath = path.join(RECOVERY_ROOT, binding.manifest_ref);
  const point = JSON.parse(await fs.readFile(manifestPath, 'utf8')) as RecoveryPointManifest;
  assert.equal(point.schema, 'ScientificEvidenceP5PacketOnlyRecoveryPoint@v1');
  assert.equal(point.created_at, binding.created_at);
  assert.equal(point.target_fingerprint, binding.target_fingerprint);
  assert.deepEqual(point.restore_order, ['schema_pre_data', 'authority_data', 'schema_post_data']);
  assert.equal(point.schema_dump.selected_toc_entries, 2046);
  assert.equal(point.authority_data_dump.table_data_entries, 114);
  assert.equal(point.recovery_fingerprint, binding.recovery_fingerprint);
  assert.equal(recoveryFingerprint(point), point.recovery_fingerprint);
  const directory = path.dirname(manifestPath);
  assert.equal((await fs.stat(directory)).mode & 0o777, 0o700);
  const schemaDumpPath = path.join(directory, point.schema_dump.file);
  const dataDumpPath = path.join(directory, point.authority_data_dump.file);
  assert.equal(await sha256File(schemaDumpPath), binding.schema_dump_sha256);
  assert.equal(await sha256File(dataDumpPath), binding.authority_data_dump_sha256);
  assert.equal((await fs.stat(schemaDumpPath)).size, point.schema_dump.byte_size);
  assert.equal((await fs.stat(dataDumpPath)).size, point.authority_data_dump.byte_size);
  for (const filePath of [manifestPath, schemaDumpPath, dataDumpPath]) {
    assert.equal((await fs.stat(filePath)).mode & 0o777, 0o600);
  }
}

function assertStageRecord(value: unknown, expected: {
  status: 'claimed' | 'completed' | 'terminal';
  attempt: string;
  packageHash: string;
  stage?: string;
  failedStage?: string;
  reasonCode?: string;
}): void {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value));
  const record = value as Record<string, unknown>;
  assert.equal(record.status, expected.status);
  assert.equal(record.p5_attempt_id, expected.attempt);
  assert.equal(record.package_hash, expected.packageHash);
  if (expected.stage) assert.equal(record.stage, expected.stage);
  if (expected.failedStage) assert.equal(record.failed_stage, expected.failedStage);
  if (expected.reasonCode) assert.equal(record.reason_code, expected.reasonCode);
}

async function readPrepared(): Promise<ScientificEvidenceP5PacketOnlyRecoveryPreparedV1> {
  const prepared = JSON.parse(await fs.readFile(PREPARED_PATH, 'utf8')) as
    ScientificEvidenceP5PacketOnlyRecoveryPreparedV1;
  assertScientificEvidenceP5PacketOnlyRecoveryPreparedV1(prepared);
  return prepared;
}

async function readAcceptance(
  prepared: ScientificEvidenceP5PacketOnlyRecoveryPreparedV1,
): Promise<ScientificEvidenceP5PacketOnlyRecoveryAcceptanceV1> {
  const acceptance = JSON.parse(await fs.readFile(ACCEPTANCE_PATH, 'utf8')) as
    ScientificEvidenceP5PacketOnlyRecoveryAcceptanceV1;
  assertScientificEvidenceP5PacketOnlyRecoveryAcceptanceV1({ prepared, acceptance });
  return acceptance;
}

function attemptBinding(
  prepared: ScientificEvidenceP5PacketOnlyRecoveryPreparedV1,
): ScientificEvidenceP5AttemptBindingV1 {
  return {
    p5_attempt_id: prepared.recovery_package.recovery_attempt_id,
    package_hash: prepared.recovery_package.package_hash,
  };
}

function assertNoProviderCredentialMaterial(): void {
  for (const key of [
    'ALIBABA_CLOUD_ACCESS_KEY_ID',
    'ALIBABA_CLOUD_ACCESS_KEY_SECRET',
    'ALIBABA_CLOUD_SECURITY_TOKEN',
    'ALIBABA_CLOUD_SESSION_TOKEN',
  ]) assert.equal(process.env[key], undefined, `${key} must be absent from Packet-only recovery.`);
}

function assertAllCapabilitiesDisabled(): void {
  for (const key of PAI_CAPABILITIES) {
    const value = process.env[key]?.trim().toLowerCase();
    assert.ok(
      value === undefined || value === '' || value === 'false' || value === '0',
      `${key} must remain disabled during Packet-only recovery.`,
    );
  }
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

function requireEnvironment(key: string): string {
  const value = process.env[key]?.trim();
  if (!value) throw new Error(`${key} is required.`);
  return value;
}

function writeOutput(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

await main();
