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
  PrismaPaperImplementationCycleReadinessV2Repository,
} from '../src/repositories/prisma/prisma-paper-implementation-cycle-readiness-v2-repository.js';
import {
  PrismaPaperImplementationValidationCycleClosureV2Repository,
} from '../src/repositories/prisma/prisma-paper-implementation-validation-cycle-closure-v2-repository.js';
import {
  PaperImplementationCycleReadinessV2Service,
} from '../src/services/paper-implementation-cycle-readiness-v2-service.js';
import {
  SCIENTIFIC_EVIDENCE_P5_CLOSURE_PACKET_PACKAGE_SCHEMA_V1,
  SCIENTIFIC_EVIDENCE_P5_CLOSURE_PACKET_PREPARED_SCHEMA_V1,
  assertScientificEvidenceP5ClosurePacketAcceptanceV1,
  assertScientificEvidenceP5ClosurePacketPreparedV1,
  buildScientificEvidenceP5ClosurePacketPackageV1,
  exactScientificEvidenceP5ClosurePacketEffectsV1,
  preflightScientificEvidenceP5ClosurePacketPackageV1,
  type ScientificEvidenceP5ClosurePacketAcceptanceV1,
  type ScientificEvidenceP5ClosurePacketPackageContentV1,
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

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const MANIFEST_DIRECTORY = path.join(REPO_ROOT, 'workloads/scifact-recall-p5/manifests');
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
const OUTPUT_PATH = path.join(
  MANIFEST_DIRECTORY,
  'prepared-closure-packet-continuation-v1.json',
);
const TERMINAL_PREDECESSOR_PATH = path.join(
  MANIFEST_DIRECTORY,
  'prepared-closure-packet-continuation-attempt1-terminal-v1.json',
);
const CONTINUATION_ACCEPTANCE_PATH = path.join(
  MANIFEST_DIRECTORY,
  'authorization-acceptance-closure-packet-continuation-v1.json',
);
const TERMINAL_PREDECESSOR_ACCEPTANCE_PATH = path.join(
  MANIFEST_DIRECTORY,
  'authorization-acceptance-closure-packet-continuation-attempt1-v1.json',
);
const RECOVERY_ROOT = '/Users/yurui/Desktop/My-Researcher-Recovery/T-136';
const RECOVERY_MANIFEST_PATH = path.join(
  RECOVERY_ROOT,
  'closure-packet-post-successor-20260816-0855/t136-p5-post-successor-closure-packet-recovery-point.json',
);
const EXECUTOR_SOURCE_PATH = path.join(
  REPO_ROOT,
  'apps/backend/scripts/run-scientific-evidence-p5-closure-packet-continuation.ts',
);
const SOURCE_BINDING_PATHS = [
  'apps/backend/src/services/paper-implementation-validation-cycle-closure-v2-service.ts',
  'apps/backend/src/services/paper-implementation-result-packet-v2-materializer.ts',
  'apps/backend/src/services/experiment-v2-integration-relay-service.ts',
  'apps/backend/src/services/paper-implementation-projection-feed-v2-consumer.ts',
  'apps/backend/src/services/scientific-evidence-p5-closure-packet-continuation-service.ts',
] as const;

const TERMINAL_PREDECESSOR_ATTEMPT_ID = 't136-p5-closure-packet-continuation-1';
const TERMINAL_PREDECESSOR_PACKAGE_HASH =
  'sha256:0d68a8789fbc97673dbbc5e0d7488370e82a4bde1098fa8cb9a01b922593247a';
const TERMINAL_PREDECESSOR_MANIFEST_SHA256 =
  'sha256:5db1f0e27ebd26c04edca4300f44b394b499e55db24204d55df411b5fd8b0dbf';
const TERMINAL_PREDECESSOR_ACCEPTANCE_SHA256 =
  'sha256:8f553760bc46e9cb02fb02510f14d1f7fc1a0439fc4f50b7d2a9590ff92bfd97';
const TERMINAL_PREDECESSOR_CLAIM_SHA256 =
  'sha256:5a3dda0c2ed10941b5a31bbd8c268e67cc12d9b5fabb1180ad328ef82028da02';
const TERMINAL_PREDECESSOR_TERMINAL_SHA256 =
  'sha256:3ef341ba46aeaec60c0df393efc94c92068d455148668d6bfdef4a2b307271d9';
const CONTINUATION_ATTEMPT_ID = 't136-p5-closure-packet-continuation-2';
const SOURCE_SUCCESSOR_ATTEMPT_ID = 't136-p5-packet-trace-result-analysis-successor-3';
const SOURCE_PACKAGE_HASH =
  'sha256:61edf09649732fc13f8afc404317d868b02121b91b81dc34d44c0a77d9e08f88';
const SOURCE_PREPARED_SHA256 =
  'sha256:76922d5e283ede9d2e9d36419847aa85ccc95d1c86e2d279faa254e9f6102a4a';
const SOURCE_ACCEPTANCE_SHA256 =
  'sha256:f2d50e386dc96a46c564749bfeb22e7bfe3ca2f5ae481a3e5a313c0a556e1786';
const SOURCE_CLAIM_SHA256 =
  'sha256:bfc305f8d67df78d85f888febe896b16f6dfdb88d716b0a8bdce8ba4f0303ff2';
const SOURCE_COMPLETION_SHA256 =
  'sha256:44e375cb6efaa8bf0245336a7d55bbe5b03905ca313f408d37dba0924d3c94ca';
const SOURCE_FINAL_ARTIFACT_ID = 'pi_runtime_final_b8f3bf37-2f23-4a58-9ff3-6513ba0814fe';
const SOURCE_FINAL_ADMISSION_ID = 'pi_runtime_admission_917cd29b-f4c2-4a86-bfe7-5d056c655e9c';
const SOURCE_FINAL_ARTIFACT_HASH =
  'bb7527851c14d1fcfff1afba3f65de79bab86035a35e6551b33cdd93518d54ee';
const PROJECT_ID = 'implementation_project_642a1879-1137-40f5-b340-330b66509975';
const VALIDATION_CYCLE_ID = 'validation_cycle_t136_p5_scifact_v4';
const RUN_ID = 'ef_run_v2_t136_p5_scifact_v4_1';
const RUN_MANIFEST_HASH =
  'sha256:72d5aa100f4663ae490946c7e7dcb3e4d36f56333dca5768625d61ce12f4a65a';
const PACKET_ID = 'result_interpretation_packet_t136_p5_scifact_v4';
const PACKET_TRACE_ID = 'trace_manifest_t136_p5_scifact_v4_result_packet';
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

interface SourceCompletionRecord {
  schema_version: 'ScientificEvidenceP5AttemptStageCompletion@v1';
  status: 'completed';
  p5_attempt_id: string;
  package_hash: string;
  stage: 'packet_trace_result_analysis_successor';
  completed_at: string;
}

interface StageRecord {
  schema_version: string;
  status: string;
  p5_attempt_id: string;
  package_hash: string;
  stage?: string;
  reason_code?: string;
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  assertNoProviderCredentialMaterial();
  await archiveTerminalPredecessor(options.writeManifest);
  await assertContinuationAttemptArtifactsAbsent(CONTINUATION_ATTEMPT_ID);
  const preparedAt = await resolvePreparedAt(options.writeManifest);
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required');
  assertExperimentFoundationNamedLocalDatabaseUrl(
    databaseUrl,
    TARGET,
    'T136_P5_CLOSURE_PACKET_TARGET_MISMATCH',
  );

  const [
    sourcePreparedBytes,
    sourceAcceptanceBytes,
    sourceClaimBytes,
    sourceCompletionBytes,
    recoveryPoint,
  ] =
    await Promise.all([
      fs.readFile(SOURCE_PREPARED_PATH, 'utf8'),
      fs.readFile(SOURCE_ACCEPTANCE_PATH, 'utf8'),
      fs.readFile(SOURCE_CLAIM_PATH, 'utf8'),
      fs.readFile(SOURCE_COMPLETION_PATH, 'utf8'),
      readRecoveryPoint(),
    ]);
  await assertFileAbsent(SOURCE_TERMINAL_PATH, 'T136_P5_CLOSURE_PACKET_SOURCE_TERMINAL_PRESENT');
  const sourcePrepared = JSON.parse(sourcePreparedBytes) as
    ScientificEvidenceP5PacketTraceSuccessorPreparedV1;
  const sourceAcceptance = JSON.parse(sourceAcceptanceBytes) as
    ScientificEvidenceP5PacketTraceSuccessorAcceptanceV1;
  const sourceCompletion = JSON.parse(sourceCompletionBytes) as SourceCompletionRecord;
  assert.equal(sha256(sourcePreparedBytes), SOURCE_PREPARED_SHA256);
  assert.equal(sha256(sourceAcceptanceBytes), SOURCE_ACCEPTANCE_SHA256);
  assert.equal(sha256(sourceClaimBytes), SOURCE_CLAIM_SHA256);
  assert.equal(sha256(sourceCompletionBytes), SOURCE_COMPLETION_SHA256);
  assertScientificEvidenceP5PacketTraceSuccessorPreparedV1(sourcePrepared);
  assertScientificEvidenceP5PacketTraceSuccessorAcceptanceV1({
    prepared: sourcePrepared,
    acceptance: sourceAcceptance,
  });
  assertStageRecord(JSON.parse(sourceClaimBytes), {
    status: 'claimed',
    attemptId: SOURCE_SUCCESSOR_ATTEMPT_ID,
    packageHash: SOURCE_PACKAGE_HASH,
    stage: 'packet_trace_result_analysis_successor',
  });
  assertSourceCompletion(sourceCompletion);
  assert.equal(
    sourcePrepared.successor_package.successor_attempt_id,
    SOURCE_SUCCESSOR_ATTEMPT_ID,
  );
  assert.equal(sourcePrepared.successor_package.package_hash, SOURCE_PACKAGE_HASH);

  const prisma = new PrismaClient();
  await prisma.$connect();
  try {
    await assertExperimentFoundationLiveNamedLocalTarget(prisma, TARGET);
    const readiness = await new PaperImplementationCycleReadinessV2Service({
      repository: new PrismaPaperImplementationCycleReadinessV2Repository(prisma),
    }).evaluate(VALIDATION_CYCLE_ID);
    assert.equal(readiness.status, 'ready_with_evidence');
    assert.equal(readiness.eligible_run_evidence_unit_count, 1);
    assert.equal(readiness.watermark.active_real_attempt_count, 0);

    const [
      project,
      artifacts,
      admissions,
      packetTrace,
      packetTraceRepairQueueItems,
      closures,
      packets,
      closedOutboxes,
      closedInboxes,
      undeliveredPi,
      undeliveredEf,
      undeliveredPromotion,
    ] = await Promise.all([
      prisma.paperImplementationProject.findUnique({
        where: { id: PROJECT_ID },
        select: { titleCardId: true },
      }),
      prisma.paperImplementationRuntimeArtifact.findMany({
        where: {
          implementationProjectId: PROJECT_ID,
          slotId: PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SLOT_ID,
          targetRefId: VALIDATION_CYCLE_ID,
        },
        select: {
          id: true,
          artifactScope: true,
          runtimeStatus: true,
          artifactIdentityHash: true,
          runtimeIdentityHash: true,
          finalArtifactHash: true,
        },
      }),
      prisma.paperImplementationRuntimeAdmissionRecord.findMany({
        where: {
          implementationProjectId: PROJECT_ID,
          slotId: PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SLOT_ID,
          targetRefId: VALIDATION_CYCLE_ID,
        },
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
        where: { id: PACKET_TRACE_ID },
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
      prisma.paperImplementationTraceRepairQueueItem.count({
        where: { traceManifestId: PACKET_TRACE_ID },
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
    ]);
    assert.ok(project?.titleCardId);
    assert.equal(artifacts.length, 4);
    assert.equal(admissions.length, 4);
    assert.ok(packetTrace);
    assert.equal(packetTrace.targetRefType, 'result_interpretation_packet');
    assert.equal(packetTrace.targetRefId, PACKET_ID);
    assert.equal(packetTrace.targetVersionId, null);
    assert.equal(packetTrace.traceStatus, 'complete');
    assert.equal(packetTrace.missingRefCount, 0);
    assert.equal(packetTrace.brokenRefCount, 0);
    assert.equal(packetTrace.staleRefCount, 0);
    assert.equal(packetTraceRepairQueueItems, 0);
    assert.equal(runEvidenceRefCount(packetTrace.experimentLineage), 1);
    assert.equal(closures, 0);
    assert.equal(packets, 0);
    assert.equal(closedOutboxes, 0);
    assert.equal(closedInboxes, 0);
    assert.equal(undeliveredPi + undeliveredEf + undeliveredPromotion, 0);
    const finalArtifact = artifacts.find((artifact) => artifact.id === SOURCE_FINAL_ARTIFACT_ID);
    assert.ok(finalArtifact?.finalArtifactHash);
    assert.equal(finalArtifact.runtimeStatus, 'passed');
    assert.equal(finalArtifact.finalArtifactHash, SOURCE_FINAL_ARTIFACT_HASH);
    const finalAdmission = admissions.find((admission) => (
      admission.id === SOURCE_FINAL_ADMISSION_ID
      && admission.runtimeArtifactId === finalArtifact.id
    ));
    assert.ok(finalAdmission?.admittedArtifactHash);
    assert.equal(finalAdmission.admissionStatus, 'admitted');
    assert.equal(finalAdmission.runtimeArtifactHash, finalArtifact.artifactIdentityHash);
    assert.equal(finalAdmission.admittedArtifactHash, finalArtifact.finalArtifactHash);
    const officialProposal = await new PrismaPaperImplementationValidationCycleClosureV2Repository(
      prisma,
    ).withTransaction((transaction) => transaction.findAdmittedScientificClosureProposal(
      finalArtifact.id,
      finalArtifact.finalArtifactHash!,
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
      PACKET_ID,
      'T136_P5_CLOSURE_PACKET_TRACE_TARGET_MISMATCH',
    );
    assert.equal(
      officialProposal.packet_materialization.request.trace_manifest_id,
      PACKET_TRACE_ID,
      'T136_P5_CLOSURE_PACKET_TRACE_TARGET_MISMATCH',
    );

    const authorizationNotAfter = new Date(Date.parse(preparedAt) + 6 * 60 * 60 * 1_000).toISOString();
    const executeNotAfter = new Date(Date.parse(authorizationNotAfter) + 30 * 60 * 1_000).toISOString();
    const content: ScientificEvidenceP5ClosurePacketPackageContentV1 = {
      schema_version: SCIENTIFIC_EVIDENCE_P5_CLOSURE_PACKET_PACKAGE_SCHEMA_V1,
      continuation_attempt_id: CONTINUATION_ATTEMPT_ID,
      source_result_analysis: {
        source_stage: 'packet_trace_result_analysis_successor',
        successor_attempt_id: SOURCE_SUCCESSOR_ATTEMPT_ID,
        package_hash: SOURCE_PACKAGE_HASH,
        prepared_record_sha256: sha256(sourcePreparedBytes),
        acceptance_record_sha256: sha256(sourceAcceptanceBytes),
        claim_record_sha256: sha256(sourceClaimBytes),
        completion_record_sha256: sha256(sourceCompletionBytes),
        final_artifact: {
          id: finalArtifact.id,
          artifact_identity_hash: finalArtifact.artifactIdentityHash,
          runtime_identity_hash: finalArtifact.runtimeIdentityHash,
          final_artifact_hash: finalArtifact.finalArtifactHash,
        },
        final_admission: {
          id: finalAdmission.id,
          admission_identity_hash: finalAdmission.admissionIdentityHash,
          runtime_artifact_hash: finalAdmission.runtimeArtifactHash,
          admitted_artifact_hash: finalAdmission.admittedArtifactHash,
          status: 'admitted',
        },
      },
      authority: {
        target_fingerprint: TARGET.fingerprint,
        implementation_project_id: PROJECT_ID,
        title_card_id: project.titleCardId,
        validation_cycle_id: VALIDATION_CYCLE_ID,
        expected_cycle_version: readiness.watermark.expected_cycle_version,
        closure_watermark_hash: readiness.watermark.closure_input_hash,
        run_id: RUN_ID,
        run_manifest_hash: RUN_MANIFEST_HASH,
        result_interpretation_packet_id: PACKET_ID,
        packet_trace: {
          id: PACKET_TRACE_ID,
          target_ref_type: 'result_interpretation_packet',
          target_ref_id: PACKET_ID,
          target_version_id: null,
          expected_status: 'complete',
        },
        current_effects: {
          packet_trace_manifests: 1,
          packet_trace_repair_queue_items: 0,
          runtime_artifacts: 4,
          runtime_admissions: 4,
          closures: 0,
          packets: 0,
          validation_cycle_closed_outboxes: 0,
          validation_cycle_closed_inboxes: 0,
          undelivered_integration_outboxes: 0,
        },
      },
      closure_request: {
        closure_kind: 'scientific_evidence_assessed',
        accepted_proposal_id: finalArtifact.id,
        expected_proposal_hash: finalArtifact.finalArtifactHash,
        idempotency_key: `${CONTINUATION_ATTEMPT_ID}:scientific-close`,
      },
      executor: {
        mode: 'closure_packet_only',
        path: path.relative(REPO_ROOT, EXECUTOR_SOURCE_PATH),
        sha256: await sha256File(EXECUTOR_SOURCE_PATH),
      },
      source_binding: {
        source_files: await Promise.all(SOURCE_BINDING_PATHS.map(async (sourcePath) => ({
          path: sourcePath,
          sha256: await sha256File(path.join(REPO_ROOT, sourcePath)),
        }))) as ScientificEvidenceP5ClosurePacketPackageContentV1['source_binding']['source_files'],
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
      authorized_effects: exactScientificEvidenceP5ClosurePacketEffectsV1(),
      operational_window: {
        prepared_at: preparedAt,
        authorization_not_after: authorizationNotAfter,
        execute_not_after: executeNotAfter,
      },
    };
    const continuationPackage = buildScientificEvidenceP5ClosurePacketPackageV1(content);
    const eligibility = preflightScientificEvidenceP5ClosurePacketPackageV1(continuationPackage);
    assert.equal(eligibility.status, 'eligible', eligibility.reason_codes.join(', '));
    assert.deepEqual(eligibility.reason_codes, []);
    const prepared: ScientificEvidenceP5ClosurePacketPreparedV1 = {
      schema_version: SCIENTIFIC_EVIDENCE_P5_CLOSURE_PACKET_PREPARED_SCHEMA_V1,
      status: 'eligible',
      continuation_package: continuationPackage,
      eligibility,
      preparation_effect_census: {
        database_writes: 0,
        external_calls: 0,
        create_job_calls: 0,
        capability_changes: 0,
        provider_credentials_read: 0,
      },
    };
    assertScientificEvidenceP5ClosurePacketPreparedV1(prepared);
    const serialized = `${JSON.stringify(prepared, null, 2)}\n`;
    if (options.writeManifest) await writeNewExactManifest(OUTPUT_PATH, serialized);
    process.stdout.write(serialized);
  } finally {
    await prisma.$disconnect();
  }
}

function parseOptions(args: string[]): { writeManifest: boolean } {
  const normalized = args[0] === '--' ? args.slice(1) : args;
  const writeManifest = normalized.includes('--write-manifest');
  if (normalized.length !== (writeManifest ? 1 : 0)) {
    throw new Error(
      'Usage: prepare-scientific-evidence-p5-closure-packet-continuation-package '
      + '[--write-manifest]',
    );
  }
  return { writeManifest };
}

async function archiveTerminalPredecessor(writeManifest: boolean): Promise<void> {
  const stage = 'closure_packet_continuation';
  const claimPath = path.join(
    MANIFEST_DIRECTORY,
    `credential-attempt-${TERMINAL_PREDECESSOR_ATTEMPT_ID}-${stage}-claim.json`,
  );
  const completionPath = path.join(
    MANIFEST_DIRECTORY,
    `credential-attempt-${TERMINAL_PREDECESSOR_ATTEMPT_ID}-${stage}-completion.json`,
  );
  const terminalPath = path.join(
    MANIFEST_DIRECTORY,
    `credential-attempt-terminal-${TERMINAL_PREDECESSOR_ATTEMPT_ID}.json`,
  );
  const [
    currentPreparedBytes,
    archivedPreparedBytes,
    currentAcceptanceBytes,
    archivedAcceptanceBytes,
    claimBytes,
    terminalBytes,
  ] = await Promise.all([
    readOptionalFile(OUTPUT_PATH),
    readOptionalFile(TERMINAL_PREDECESSOR_PATH),
    readOptionalFile(CONTINUATION_ACCEPTANCE_PATH),
    readOptionalFile(TERMINAL_PREDECESSOR_ACCEPTANCE_PATH),
    fs.readFile(claimPath, 'utf8'),
    fs.readFile(terminalPath, 'utf8'),
  ]);
  await assertFileAbsent(
    completionPath,
    'T136_P5_CLOSURE_PACKET_TERMINAL_PREDECESSOR_COMPLETION_PRESENT',
  );
  assert.equal(sha256(claimBytes), TERMINAL_PREDECESSOR_CLAIM_SHA256);
  assert.equal(sha256(terminalBytes), TERMINAL_PREDECESSOR_TERMINAL_SHA256);
  assertStageRecord(JSON.parse(claimBytes), {
    status: 'claimed',
    attemptId: TERMINAL_PREDECESSOR_ATTEMPT_ID,
    packageHash: TERMINAL_PREDECESSOR_PACKAGE_HASH,
    stage,
  });
  assertStageRecord(JSON.parse(terminalBytes), {
    status: 'terminal',
    attemptId: TERMINAL_PREDECESSOR_ATTEMPT_ID,
    packageHash: TERMINAL_PREDECESSOR_PACKAGE_HASH,
    reasonCode: 'T136_P5_CLOSURE_PACKET_CONTINUATION_FAILED',
  });

  if (currentPreparedBytes) {
    const current = JSON.parse(currentPreparedBytes) as ScientificEvidenceP5ClosurePacketPreparedV1;
    assertScientificEvidenceP5ClosurePacketPreparedV1(current);
    if (current.continuation_package.continuation_attempt_id === CONTINUATION_ATTEMPT_ID) {
      assert.equal(currentAcceptanceBytes, null);
      const predecessor = assertTerminalPredecessorPreparedBytes(archivedPreparedBytes);
      assertTerminalPredecessorAcceptanceBytes(archivedAcceptanceBytes, predecessor);
      return;
    }
  }

  assert.equal(
    currentPreparedBytes !== null && archivedPreparedBytes !== null,
    false,
    'T136_P5_CLOSURE_PACKET_TERMINAL_PREDECESSOR_PREPARED_DUPLICATED',
  );
  assert.equal(
    currentAcceptanceBytes !== null && archivedAcceptanceBytes !== null,
    false,
    'T136_P5_CLOSURE_PACKET_TERMINAL_PREDECESSOR_ACCEPTANCE_DUPLICATED',
  );
  const predecessor = assertTerminalPredecessorPreparedBytes(
    currentPreparedBytes ?? archivedPreparedBytes,
  );
  assertTerminalPredecessorAcceptanceBytes(
    currentAcceptanceBytes ?? archivedAcceptanceBytes,
    predecessor,
  );

  const requiresArchive = currentPreparedBytes !== null || currentAcceptanceBytes !== null;
  if (requiresArchive && !writeManifest) {
    throw new Error('T136_P5_CLOSURE_PACKET_REQUIRES_FIRST_WRITE_MANIFEST');
  }
  if (currentPreparedBytes) await fs.rename(OUTPUT_PATH, TERMINAL_PREDECESSOR_PATH);
  if (currentAcceptanceBytes) {
    await fs.rename(CONTINUATION_ACCEPTANCE_PATH, TERMINAL_PREDECESSOR_ACCEPTANCE_PATH);
  }
  if (requiresArchive) await syncManifestDirectory();
  const archivedPrepared = assertTerminalPredecessorPreparedBytes(
    await readOptionalFile(TERMINAL_PREDECESSOR_PATH),
  );
  assertTerminalPredecessorAcceptanceBytes(
    await readOptionalFile(TERMINAL_PREDECESSOR_ACCEPTANCE_PATH),
    archivedPrepared,
  );
}

function assertTerminalPredecessorPreparedBytes(
  bytes: string | null,
): ScientificEvidenceP5ClosurePacketPreparedV1 {
  assert.ok(bytes, 'T136_P5_CLOSURE_PACKET_TERMINAL_PREDECESSOR_MISSING');
  assert.equal(sha256(bytes), TERMINAL_PREDECESSOR_MANIFEST_SHA256);
  const prepared = JSON.parse(bytes) as ScientificEvidenceP5ClosurePacketPreparedV1;
  assertScientificEvidenceP5ClosurePacketPreparedV1(prepared);
  assert.equal(
    prepared.continuation_package.continuation_attempt_id,
    TERMINAL_PREDECESSOR_ATTEMPT_ID,
  );
  assert.equal(
    prepared.continuation_package.package_hash,
    TERMINAL_PREDECESSOR_PACKAGE_HASH,
  );
  return prepared;
}

function assertTerminalPredecessorAcceptanceBytes(
  bytes: string | null,
  prepared: ScientificEvidenceP5ClosurePacketPreparedV1,
): void {
  assert.ok(bytes, 'T136_P5_CLOSURE_PACKET_TERMINAL_ACCEPTANCE_MISSING');
  assert.equal(sha256(bytes), TERMINAL_PREDECESSOR_ACCEPTANCE_SHA256);
  assertScientificEvidenceP5ClosurePacketAcceptanceV1({
    prepared,
    acceptance: JSON.parse(bytes) as ScientificEvidenceP5ClosurePacketAcceptanceV1,
  });
}

async function assertContinuationAttemptArtifactsAbsent(attemptId: string): Promise<void> {
  const stage = 'closure_packet_continuation';
  await Promise.all([
    assertFileAbsent(
      CONTINUATION_ACCEPTANCE_PATH,
      'T136_P5_CLOSURE_PACKET_ACCEPTANCE_PRESENT',
    ),
    assertFileAbsent(
      path.join(MANIFEST_DIRECTORY, `credential-attempt-${attemptId}-${stage}-claim.json`),
      'T136_P5_CLOSURE_PACKET_CLAIM_PRESENT',
    ),
    assertFileAbsent(
      path.join(MANIFEST_DIRECTORY, `credential-attempt-${attemptId}-${stage}-completion.json`),
      'T136_P5_CLOSURE_PACKET_COMPLETION_PRESENT',
    ),
    assertFileAbsent(
      path.join(MANIFEST_DIRECTORY, `credential-attempt-terminal-${attemptId}.json`),
      'T136_P5_CLOSURE_PACKET_TERMINAL_PRESENT',
    ),
  ]);
}

async function readOptionalFile(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

async function syncManifestDirectory(): Promise<void> {
  const directory = await fs.open(MANIFEST_DIRECTORY, 'r');
  try {
    await directory.sync();
  } finally {
    await directory.close();
  }
}

async function resolvePreparedAt(writeManifest: boolean): Promise<string> {
  try {
    const existing = JSON.parse(await fs.readFile(OUTPUT_PATH, 'utf8')) as
      ScientificEvidenceP5ClosurePacketPreparedV1;
    assertScientificEvidenceP5ClosurePacketPreparedV1(existing);
    return existing.continuation_package.operational_window.prepared_at;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    if (!writeManifest) throw new Error('T136_P5_CLOSURE_PACKET_REQUIRES_FIRST_WRITE_MANIFEST');
    return new Date().toISOString();
  }
}

async function readRecoveryPoint(): Promise<RecoveryPointManifest> {
  const bytes = await fs.readFile(RECOVERY_MANIFEST_PATH, 'utf8');
  const point = JSON.parse(bytes) as RecoveryPointManifest;
  assert.equal(point.schema, 'ScientificEvidenceP5ClosurePacketRecoveryPoint@v1');
  assert.equal(point.target_fingerprint, TARGET.fingerprint);
  assert.deepEqual(point.restore_order, ['schema_pre_data', 'authority_data', 'schema_post_data']);
  assert.equal(point.schema_dump.selected_toc_entries, 2046);
  assert.equal(point.authority_data_dump.table_data_entries, 114);
  assert.equal(recoveryFingerprint(point), point.recovery_fingerprint);
  const directory = path.dirname(RECOVERY_MANIFEST_PATH);
  assert.equal((await fs.stat(directory)).mode & 0o777, 0o700);
  const schemaDumpPath = path.join(directory, point.schema_dump.file);
  const authorityDumpPath = path.join(directory, point.authority_data_dump.file);
  assert.equal(await sha256File(schemaDumpPath), point.schema_dump.sha256);
  assert.equal(await sha256File(authorityDumpPath), point.authority_data_dump.sha256);
  assert.equal((await fs.stat(schemaDumpPath)).size, point.schema_dump.byte_size);
  assert.equal((await fs.stat(authorityDumpPath)).size, point.authority_data_dump.byte_size);
  for (const filePath of [RECOVERY_MANIFEST_PATH, schemaDumpPath, authorityDumpPath]) {
    assert.equal((await fs.stat(filePath)).mode & 0o777, 0o600);
  }
  return point;
}

function recoveryFingerprint(point: RecoveryPointManifest): string {
  const { recovery_fingerprint: _stored, ...core } = point;
  return sha256(canonicalizeExperimentV2Json(core));
}

function assertSourceCompletion(completion: SourceCompletionRecord): void {
  assert.deepEqual(Object.keys(completion).sort(), [
    'completed_at',
    'p5_attempt_id',
    'package_hash',
    'schema_version',
    'stage',
    'status',
  ]);
  assert.equal(completion.schema_version, 'ScientificEvidenceP5AttemptStageCompletion@v1');
  assert.equal(completion.status, 'completed');
  assert.equal(completion.p5_attempt_id, SOURCE_SUCCESSOR_ATTEMPT_ID);
  assert.equal(completion.package_hash, SOURCE_PACKAGE_HASH);
  assert.equal(completion.stage, 'packet_trace_result_analysis_successor');
  assert.equal(new Date(completion.completed_at).toISOString(), completion.completed_at);
}

function assertStageRecord(
  value: unknown,
  expected: {
    status: 'claimed' | 'completed' | 'terminal';
    attemptId: string;
    packageHash: string;
    stage?: string;
    reasonCode?: string;
  },
): void {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value));
  const record = value as StageRecord;
  assert.equal(record.status, expected.status);
  assert.equal(record.p5_attempt_id, expected.attemptId);
  assert.equal(record.package_hash, expected.packageHash);
  if (expected.stage) assert.equal(record.stage, expected.stage);
  if (expected.reasonCode) assert.equal(record.reason_code, expected.reasonCode);
}

function runEvidenceRefCount(experimentLineage: unknown): number {
  if (!experimentLineage || typeof experimentLineage !== 'object' || Array.isArray(experimentLineage)) {
    return -1;
  }
  const refs = (experimentLineage as { run_evidence_refs?: unknown }).run_evidence_refs;
  return Array.isArray(refs) ? refs.length : -1;
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

async function writeNewExactManifest(filePath: string, serialized: string): Promise<void> {
  try {
    const existing = await fs.readFile(filePath, 'utf8');
    assert.equal(existing, serialized, 'Existing Closure/Packet manifest differs from generated output.');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    await fs.writeFile(filePath, serialized, { encoding: 'utf8', flag: 'wx' });
  }
}

function assertNoProviderCredentialMaterial(): void {
  for (const key of [
    'ALIBABA_CLOUD_ACCESS_KEY_ID',
    'ALIBABA_CLOUD_ACCESS_KEY_SECRET',
    'ALIBABA_CLOUD_SECURITY_TOKEN',
    'ALIBABA_CLOUD_SESSION_TOKEN',
  ]) {
    assert.equal(process.env[key], undefined, `${key} must be absent during continuation preparation.`);
  }
}

async function sha256File(filePath: string): Promise<string> {
  return sha256(await fs.readFile(filePath));
}

function sha256(value: string | Uint8Array): string {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

main().catch((error: unknown) => {
  process.stderr.write(`${JSON.stringify({
    schema_version: 'ScientificEvidenceP5ClosurePacketPreparationFailure@v1',
    status: 'failed',
    reason: stableFailureCode(error),
  })}\n`);
  process.exitCode = 1;
});

function stableFailureCode(error: unknown): string {
  if (!(error instanceof Error)) return 'T136_P5_CLOSURE_PACKET_PREPARATION_FAILED';
  return /^((?:T136_P5|P5_CP)_[A-Z0-9_]+)/.exec(error.message)?.[1]
    ?? 'T136_P5_CLOSURE_PACKET_PREPARATION_FAILED';
}
