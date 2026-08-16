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
  assertScientificEvidenceP5ClosurePacketAcceptanceV1,
  assertScientificEvidenceP5ClosurePacketPreparedV1,
  isScientificEvidenceP5ClosurePacketSuccessorSourceV1,
  type ScientificEvidenceP5ClosurePacketAcceptanceV1,
  type ScientificEvidenceP5ClosurePacketPreparedV1,
} from '../src/services/scientific-evidence-p5-closure-packet-continuation-service.js';
import {
  SCIENTIFIC_EVIDENCE_P5_PACKET_ONLY_RECOVERY_PACKAGE_SCHEMA_V1,
  SCIENTIFIC_EVIDENCE_P5_PACKET_ONLY_RECOVERY_PREPARED_SCHEMA_V1,
  assertScientificEvidenceP5PacketOnlyRecoveryPreparedV1,
  buildScientificEvidenceP5PacketOnlyRecoveryPackageV1,
  exactScientificEvidenceP5PacketOnlyRecoveryEffectsV1,
  preflightScientificEvidenceP5PacketOnlyRecoveryPackageV1,
  type ScientificEvidenceP5PacketOnlyRecoveryPackageContentV1,
  type ScientificEvidenceP5PacketOnlyRecoveryPreparedV1,
} from '../src/services/scientific-evidence-p5-packet-only-recovery-service.js';
import {
  PaperImplementationResultPacketV2Materializer,
} from '../src/services/paper-implementation-result-packet-v2-materializer.js';
import {
  assertExperimentFoundationLiveNamedLocalTarget,
  assertExperimentFoundationNamedLocalDatabaseUrl,
} from './experiment-foundation-named-local-evidence.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const MANIFEST_DIRECTORY = path.join(REPO_ROOT, 'workloads/scifact-recall-p5/manifests');
const OUTPUT_PATH = path.join(MANIFEST_DIRECTORY, 'prepared-packet-only-recovery-v1.json');
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
const RECOVERY_ROOT = '/Users/yurui/Desktop/My-Researcher-Recovery/T-136';
const RECOVERY_MANIFEST_PATH = path.join(
  RECOVERY_ROOT,
  'packet-only-recovery-20260816-1008/t136-p5-packet-only-recovery-point.json',
);
const EXECUTOR_SOURCE_PATH = path.join(
  REPO_ROOT,
  'apps/backend/scripts/run-scientific-evidence-p5-packet-only-recovery.ts',
);
const SOURCE_BINDING_PATHS = [
  'apps/backend/src/repositories/experiment-v2-stored-integration-event.ts',
  'apps/backend/src/repositories/paper-implementation-result-claim-dossier.repository.ts',
  'apps/backend/src/repositories/prisma/prisma-paper-implementation-result-claim-dossier-repository.ts',
  'apps/backend/src/services/paper-implementation-result-packet-v2-materializer.ts',
  'apps/backend/src/services/scientific-evidence-p5-attempt-terminal-service.ts',
  'apps/backend/src/services/scientific-evidence-p5-packet-only-recovery-service.ts',
] as const;

const RECOVERY_ATTEMPT_ID = 't136-p5-packet-only-recovery-1';
const PREDECESSOR_ATTEMPT_ID = 't136-p5-closure-packet-continuation-2';
const PREDECESSOR_PACKAGE_HASH =
  'sha256:6b356bc4cac7b04c9b68b44fa651cdda4e91b7a9bb4af6291c7b5f4273551b04';
const PREDECESSOR_PREPARED_SHA256 =
  'sha256:76430fd9969c5da54481e817cf7f127923462d81ce6711d64bcbdac546dc89f2';
const PREDECESSOR_ACCEPTANCE_SHA256 =
  'sha256:f65872475573231d33eee9715810b5c67c7b11a31b4be76428a2fd40067f2bae';
const PREDECESSOR_CLAIM_SHA256 =
  'sha256:305e7357468fef04169844cc5a695b71801c7a608721b1cbb14d69a2f688db55';
const PREDECESSOR_TERMINAL_SHA256 =
  'sha256:8d60689c0be68d842eed43b51b7cab62d65161ec39e807d6040a3eb30c844d49';
const PREDECESSOR_TERMINAL_REASON = 'T136_P5_CLOSURE_PACKET_CONTINUATION_FAILED';
const PROJECT_ID = 'implementation_project_642a1879-1137-40f5-b340-330b66509975';
const TITLE_CARD_ID = 'title_card_671d3b55-b58d-4333-b9c7-333b34e2eb83';
const VALIDATION_CYCLE_ID = 'validation_cycle_t136_p5_scifact_v4';
const PACKET_ID = 'result_interpretation_packet_t136_p5_scifact_v4';
const PACKET_TRACE_ID = 'trace_manifest_t136_p5_scifact_v4_result_packet';
const OUTBOX_ID =
  'pi_validation_cycle_closure_outbox_v2_72953d1397dadad52403ef147732e6b81acdbf767f47ed0a624fa63ac3c553c8';
const INBOX_ID = 'pi_projection_feed_inbox_84318486-0f4c-4d16-90ec-ac3c76906fb5';
const TARGET = Object.freeze({
  database: 'postgres',
  schema: 'my_researcher_dev',
  host: '127.0.0.1',
  port: '5432',
  fingerprint: 'sha256:8851b255b079ad1f049dc1842c41cb3516d5a3ff0b69e21a30e8f2675409cca0',
});
const CAPABILITIES = [
  'EXPERIMENT_FOUNDATION_V2_REAL_PROVIDER_INTAKE_ENABLED',
  'EXPERIMENT_FOUNDATION_V2_REAL_PROVIDER_CONTROL_DRAIN_ENABLED',
  'EXPERIMENT_FOUNDATION_V2_SCIENTIFIC_VALIDATION_ENABLED',
  'PAPER_IMPLEMENTATION_EXPERIMENT_V2_CYCLE_CLOSURE_ENABLED',
] as const;

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
  const writeManifest = parseOptions(process.argv.slice(2));
  assertNoProviderCredentialMaterial();
  assertAllCapabilitiesDisabled();
  await assertPreparationArtifactsAbsent();
  const predecessor = await readPredecessor();
  const recoveryPoint = await readRecoveryPoint();
  const preparedAt = await resolvePreparedAt(writeManifest);
  const databaseUrl = requireEnvironment('DATABASE_URL');
  assertExperimentFoundationNamedLocalDatabaseUrl(
    databaseUrl,
    TARGET,
    'T136_P5_PACKET_ONLY_RECOVERY_TARGET_MISMATCH',
  );
  const prisma = new PrismaClient();
  await prisma.$connect();
  try {
    await assertExperimentFoundationLiveNamedLocalTarget(prisma, TARGET);
    const [project, closure, outbox, inbox, counts] = await Promise.all([
      prisma.paperImplementationProject.findUnique({
        where: { id: PROJECT_ID },
        select: { titleCardId: true },
      }),
      prisma.paperImplementationValidationCycleClosureV2.findUnique({
        where: { validationCycleId: VALIDATION_CYCLE_ID },
      }),
      prisma.paperImplementationExperimentIntegrationOutboxV2.findUnique({
        where: { id: OUTBOX_ID },
      }),
      prisma.paperImplementationExperimentIntegrationInboxV2.findUnique({
        where: { id: INBOX_ID },
      }),
      readCounts(prisma),
    ]);
    assert.equal(project?.titleCardId, TITLE_CARD_ID);
    assert.ok(closure && outbox && inbox);
    assert.deepEqual(counts, exactCurrentEffects());
    assert.equal(outbox.relayStatus, 'terminal');
    assert.equal(outbox.relayAttemptCount, 1);
    assert.equal(outbox.lastRelayErrorCode, 'RESULT_INTERPRETATION_PACKET_AUTHORITY_CONFLICT');
    assert.equal(outbox.relayLeaseOwner, null);
    assert.equal(outbox.relayLeaseExpiresAt, null);
    assert.equal(outbox.relayNextAttemptAt, null);
    assert.equal(outbox.publishedAt, null);
    assert.equal(outbox.deliveredAt, null);
    assert.equal(inbox.consumerName, 'pi-projection-feed-v2');
    assert.equal(inbox.status, 'processed');
    assert.equal(inbox.outcome, 'processed');
    assert.equal(inbox.reasonCode, null);
    assert.equal(inbox.eventId, outbox.eventId);
    assert.equal(inbox.eventEnvelopeHash, outbox.eventEnvelopeHash);
    assert.equal(inbox.payloadHash, outbox.payloadHash);
    const event = reconstructExperimentV2Event(outbox);
    assert.equal(event.event_type, 'ValidationCycleClosed@v1');
    const packetRepository = new PrismaPaperImplementationResultClaimDossierRepository(prisma);
    const materializer = new PaperImplementationResultPacketV2Materializer(
      new PrismaPaperImplementationValidationCycleClosureV2Repository(prisma),
      packetRepository,
    );
    const packet = await materializer.assembleClosedPacket(
      event as ValidationCycleClosedEventV1,
    );
    assert.ok(packet);
    assert.equal(packet.result_interpretation_packet_id, PACKET_ID);
    assert.equal(packet.trace_manifest_id, PACKET_TRACE_ID);
    assert.equal(packet.closure_id, closure.id);
    assert.equal(packet.closure_snapshot_hash, closure.closureSnapshotHash);

    const authorizationNotAfter = new Date(
      Date.parse(preparedAt) + 6 * 60 * 60 * 1_000,
    ).toISOString();
    const executeNotAfter = new Date(
      Date.parse(authorizationNotAfter) + 30 * 60 * 1_000,
    ).toISOString();
    const content: ScientificEvidenceP5PacketOnlyRecoveryPackageContentV1 = {
      schema_version: SCIENTIFIC_EVIDENCE_P5_PACKET_ONLY_RECOVERY_PACKAGE_SCHEMA_V1,
      recovery_attempt_id: RECOVERY_ATTEMPT_ID,
      predecessor: {
        continuation_attempt_id: PREDECESSOR_ATTEMPT_ID,
        package_hash: PREDECESSOR_PACKAGE_HASH,
        prepared_record_sha256: PREDECESSOR_PREPARED_SHA256,
        acceptance_record_sha256: PREDECESSOR_ACCEPTANCE_SHA256,
        claim_record_sha256: PREDECESSOR_CLAIM_SHA256,
        terminal_record_sha256: PREDECESSOR_TERMINAL_SHA256,
        completion_absent: true,
        terminal_reason_code: PREDECESSOR_TERMINAL_REASON,
        source_successor: {
          successor_attempt_id: predecessor.source.successor_attempt_id,
          package_hash: predecessor.source.package_hash,
          prepared_record_sha256: predecessor.source.prepared_record_sha256,
          acceptance_record_sha256: predecessor.source.acceptance_record_sha256,
          claim_record_sha256: predecessor.source.claim_record_sha256,
          completion_record_sha256: predecessor.source.completion_record_sha256,
        },
      },
      authority: {
        target_fingerprint: TARGET.fingerprint,
        implementation_project_id: PROJECT_ID,
        title_card_id: TITLE_CARD_ID,
        validation_cycle_id: VALIDATION_CYCLE_ID,
        closure: {
          closure_id: closure.id,
          closure_snapshot_hash: closure.closureSnapshotHash,
          closure_kind: 'scientific_evidence_assessed',
          accepted_proposal_id: closure.acceptedProposalId!,
          accepted_proposal_hash: closure.acceptedProposalHash!,
          scientific_disposition: 'positive',
          created_at: closure.createdAt.toISOString(),
        },
        terminal_outbox: {
          outbox_id: outbox.id,
          event_id: outbox.eventId,
          event_envelope_hash: outbox.eventEnvelopeHash,
          payload_hash: outbox.payloadHash,
          relay_status: 'terminal',
          relay_attempt_count: 1,
          last_relay_error_code: 'RESULT_INTERPRETATION_PACKET_AUTHORITY_CONFLICT',
          terminal_updated_at: outbox.updatedAt.toISOString(),
        },
        processed_inbox: {
          inbox_id: inbox.id,
          consumer_name: 'pi-projection-feed-v2',
          event_id: inbox.eventId,
          event_envelope_hash: inbox.eventEnvelopeHash,
          payload_hash: inbox.payloadHash,
          status: 'processed',
          outcome: 'processed',
          processed_at: inbox.processedAt.toISOString(),
        },
        packet: {
          result_interpretation_packet_id: packet.result_interpretation_packet_id,
          packet_content_hash: packet.packet_content_hash,
          trace_manifest_id: packet.trace_manifest_id,
          created_at: packet.created_at,
        },
        current_effects: counts,
      },
      executor: {
        mode: 'packet_only_terminal_outbox_recovery',
        path: path.relative(REPO_ROOT, EXECUTOR_SOURCE_PATH),
        sha256: await sha256File(EXECUTOR_SOURCE_PATH),
      },
      source_binding: {
        source_files: await Promise.all(SOURCE_BINDING_PATHS.map(async (sourcePath) => ({
          path: sourcePath,
          sha256: await sha256File(path.join(REPO_ROOT, sourcePath)),
        }))),
      },
      recovery_point: {
        manifest_ref: path.relative(RECOVERY_ROOT, RECOVERY_MANIFEST_PATH),
        created_at: recoveryPoint.created_at,
        target_fingerprint: recoveryPoint.target_fingerprint,
        recovery_fingerprint: recoveryPoint.recovery_fingerprint,
        schema_dump_sha256: recoveryPoint.schema_dump.sha256,
        authority_data_dump_sha256: recoveryPoint.authority_data_dump.sha256,
        authority_table_count: 114,
      },
      authorized_effects: exactScientificEvidenceP5PacketOnlyRecoveryEffectsV1(),
      operational_window: {
        prepared_at: preparedAt,
        authorization_not_after: authorizationNotAfter,
        execute_not_after: executeNotAfter,
      },
    };
    const recoveryPackage = buildScientificEvidenceP5PacketOnlyRecoveryPackageV1(content);
    const eligibility = preflightScientificEvidenceP5PacketOnlyRecoveryPackageV1(recoveryPackage);
    assert.equal(eligibility.status, 'eligible', eligibility.reason_codes.join(', '));
    assert.deepEqual(eligibility.reason_codes, []);
    const prepared: ScientificEvidenceP5PacketOnlyRecoveryPreparedV1 = {
      schema_version: SCIENTIFIC_EVIDENCE_P5_PACKET_ONLY_RECOVERY_PREPARED_SCHEMA_V1,
      status: 'eligible',
      recovery_package: recoveryPackage,
      eligibility,
      preparation_effect_census: {
        database_writes: 0,
        external_calls: 0,
        create_job_calls: 0,
        capability_changes: 0,
        provider_credentials_read: 0,
      },
    };
    assertScientificEvidenceP5PacketOnlyRecoveryPreparedV1(prepared);
    const serialized = `${JSON.stringify(prepared, null, 2)}\n`;
    if (writeManifest) await writeNewExactManifest(OUTPUT_PATH, serialized);
    const existing = await fs.readFile(OUTPUT_PATH, 'utf8');
    assert.equal(existing, serialized, 'T136_P5_PACKET_ONLY_RECOVERY_REPLAY_BYTES_MISMATCH');
    process.stdout.write(serialized);
  } finally {
    await prisma.$disconnect();
    assertAllCapabilitiesDisabled();
  }
}

async function readPredecessor() {
  const [preparedBytes, acceptanceBytes, claimBytes, terminalBytes] = await Promise.all([
    fs.readFile(PREDECESSOR_PREPARED_PATH, 'utf8'),
    fs.readFile(PREDECESSOR_ACCEPTANCE_PATH, 'utf8'),
    fs.readFile(PREDECESSOR_CLAIM_PATH, 'utf8'),
    fs.readFile(PREDECESSOR_TERMINAL_PATH, 'utf8'),
  ]);
  await assertFileAbsent(
    PREDECESSOR_COMPLETION_PATH,
    'T136_P5_PACKET_ONLY_RECOVERY_PREDECESSOR_COMPLETION_PRESENT',
  );
  assert.equal(sha256(preparedBytes), PREDECESSOR_PREPARED_SHA256);
  assert.equal(sha256(acceptanceBytes), PREDECESSOR_ACCEPTANCE_SHA256);
  assert.equal(sha256(claimBytes), PREDECESSOR_CLAIM_SHA256);
  assert.equal(sha256(terminalBytes), PREDECESSOR_TERMINAL_SHA256);
  const prepared = JSON.parse(preparedBytes) as ScientificEvidenceP5ClosurePacketPreparedV1;
  assertScientificEvidenceP5ClosurePacketPreparedV1(prepared);
  assert.equal(prepared.continuation_package.continuation_attempt_id, PREDECESSOR_ATTEMPT_ID);
  assert.equal(prepared.continuation_package.package_hash, PREDECESSOR_PACKAGE_HASH);
  assertScientificEvidenceP5ClosurePacketAcceptanceV1({
    prepared,
    acceptance: JSON.parse(acceptanceBytes) as ScientificEvidenceP5ClosurePacketAcceptanceV1,
  });
  const claim = JSON.parse(claimBytes) as Record<string, unknown>;
  const terminal = JSON.parse(terminalBytes) as Record<string, unknown>;
  assert.equal(claim.status, 'claimed');
  assert.equal(claim.stage, 'closure_packet_continuation');
  assert.equal(claim.p5_attempt_id, PREDECESSOR_ATTEMPT_ID);
  assert.equal(claim.package_hash, PREDECESSOR_PACKAGE_HASH);
  assert.equal(terminal.status, 'terminal');
  assert.equal(terminal.failed_stage, 'closure_packet_continuation');
  assert.equal(terminal.reason_code, PREDECESSOR_TERMINAL_REASON);
  const source = prepared.continuation_package.source_result_analysis;
  assert.ok(isScientificEvidenceP5ClosurePacketSuccessorSourceV1(source));
  return { prepared, source };
}

async function readCounts(prisma: PrismaClient) {
  const values = await Promise.all([
    prisma.paperImplementationTraceManifest.count({ where: { id: PACKET_TRACE_ID } }),
    prisma.paperImplementationTraceRepairQueueItem.count({ where: { traceManifestId: PACKET_TRACE_ID } }),
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
    prisma.paperImplementationExperimentIntegrationOutboxV2.count({
      where: { validationCycleId: VALIDATION_CYCLE_ID, eventType: 'ValidationCycleClosed@v1' },
    }),
    prisma.paperImplementationExperimentIntegrationInboxV2.count({
      where: { validationCycleId: VALIDATION_CYCLE_ID, eventType: 'ValidationCycleClosed@v1' },
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
    prisma.paperImplementationClaimCandidate.count({ where: { implementationProjectId: PROJECT_ID } }),
    prisma.paperImplementationDossier.count({ where: { implementationProjectId: PROJECT_ID } }),
  ]);
  return {
    packet_trace_manifests: values[0],
    packet_trace_repair_queue_items: values[1],
    runtime_artifacts: values[2],
    runtime_admissions: values[3],
    closures: values[4],
    packets: values[5],
    validation_cycle_closed_outboxes: values[6],
    validation_cycle_closed_inboxes: values[7],
    undelivered_integration_outboxes: values[8]! + values[9]! + values[10]!,
    claims: values[11],
    dossiers: values[12],
  } as const;
}

function exactCurrentEffects() {
  return {
    packet_trace_manifests: 1,
    packet_trace_repair_queue_items: 0,
    runtime_artifacts: 4,
    runtime_admissions: 4,
    closures: 1,
    packets: 0,
    validation_cycle_closed_outboxes: 1,
    validation_cycle_closed_inboxes: 1,
    undelivered_integration_outboxes: 1,
    claims: 0,
    dossiers: 0,
  } as const;
}

async function readRecoveryPoint(): Promise<RecoveryPointManifest> {
  const point = JSON.parse(await fs.readFile(RECOVERY_MANIFEST_PATH, 'utf8')) as
    RecoveryPointManifest;
  assert.equal(point.schema, 'ScientificEvidenceP5PacketOnlyRecoveryPoint@v1');
  assert.equal(point.target_fingerprint, TARGET.fingerprint);
  assert.deepEqual(point.restore_order, ['schema_pre_data', 'authority_data', 'schema_post_data']);
  assert.equal(point.schema_dump.selected_toc_entries, 2046);
  assert.equal(point.authority_data_dump.table_data_entries, 114);
  assert.equal(recoveryFingerprint(point), point.recovery_fingerprint);
  const directory = path.dirname(RECOVERY_MANIFEST_PATH);
  assert.equal((await fs.stat(directory)).mode & 0o777, 0o700);
  const schemaDumpPath = path.join(directory, point.schema_dump.file);
  const dataDumpPath = path.join(directory, point.authority_data_dump.file);
  assert.equal(await sha256File(schemaDumpPath), point.schema_dump.sha256);
  assert.equal(await sha256File(dataDumpPath), point.authority_data_dump.sha256);
  assert.equal((await fs.stat(schemaDumpPath)).size, point.schema_dump.byte_size);
  assert.equal((await fs.stat(dataDumpPath)).size, point.authority_data_dump.byte_size);
  for (const filePath of [RECOVERY_MANIFEST_PATH, schemaDumpPath, dataDumpPath]) {
    assert.equal((await fs.stat(filePath)).mode & 0o777, 0o600);
  }
  return point;
}

async function assertPreparationArtifactsAbsent(): Promise<void> {
  await Promise.all([
    assertFileAbsent(ACCEPTANCE_PATH, 'T136_P5_PACKET_ONLY_RECOVERY_ACCEPTANCE_PRESENT'),
    assertFileAbsent(
      path.join(
        MANIFEST_DIRECTORY,
        `credential-attempt-${RECOVERY_ATTEMPT_ID}-packet_only_recovery-claim.json`,
      ),
      'T136_P5_PACKET_ONLY_RECOVERY_CLAIM_PRESENT',
    ),
    assertFileAbsent(
      path.join(
        MANIFEST_DIRECTORY,
        `credential-attempt-${RECOVERY_ATTEMPT_ID}-packet_only_recovery-completion.json`,
      ),
      'T136_P5_PACKET_ONLY_RECOVERY_COMPLETION_PRESENT',
    ),
    assertFileAbsent(
      path.join(MANIFEST_DIRECTORY, `credential-attempt-terminal-${RECOVERY_ATTEMPT_ID}.json`),
      'T136_P5_PACKET_ONLY_RECOVERY_TERMINAL_PRESENT',
    ),
  ]);
}

async function resolvePreparedAt(writeManifest: boolean): Promise<string> {
  try {
    const existing = JSON.parse(await fs.readFile(OUTPUT_PATH, 'utf8')) as
      ScientificEvidenceP5PacketOnlyRecoveryPreparedV1;
    assertScientificEvidenceP5PacketOnlyRecoveryPreparedV1(existing);
    return existing.recovery_package.operational_window.prepared_at;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    if (!writeManifest) throw new Error('T136_P5_PACKET_ONLY_RECOVERY_REQUIRES_FIRST_WRITE');
    return new Date().toISOString();
  }
}

async function writeNewExactManifest(filePath: string, serialized: string): Promise<void> {
  let handle: fs.FileHandle | null = null;
  try {
    handle = await fs.open(filePath, 'wx', 0o600);
    await handle.writeFile(serialized, 'utf8');
    await handle.sync();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
  } finally {
    await handle?.close();
  }
  const directory = await fs.open(path.dirname(filePath), 'r');
  try {
    await directory.sync();
  } finally {
    await directory.close();
  }
}

function parseOptions(args: string[]): boolean {
  const normalized = args[0] === '--' ? args.slice(1) : args;
  const writeManifest = normalized.includes('--write-manifest');
  if (normalized.length !== (writeManifest ? 1 : 0)) {
    throw new Error('Usage: prepare-scientific-evidence-p5-packet-only-recovery-package [--write-manifest]');
  }
  return writeManifest;
}

function assertNoProviderCredentialMaterial(): void {
  for (const key of [
    'ALIBABA_CLOUD_ACCESS_KEY_ID',
    'ALIBABA_CLOUD_ACCESS_KEY_SECRET',
    'ALIBABA_CLOUD_SECURITY_TOKEN',
    'ALIBABA_CLOUD_SESSION_TOKEN',
  ]) assert.equal(process.env[key], undefined, `${key} must be absent from package preparation.`);
}

function assertAllCapabilitiesDisabled(): void {
  for (const key of CAPABILITIES) {
    const value = process.env[key]?.trim().toLowerCase();
    assert.ok(
      value === undefined || value === '' || value === 'false' || value === '0',
      `${key} must remain disabled during package preparation.`,
    );
  }
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

await main();
