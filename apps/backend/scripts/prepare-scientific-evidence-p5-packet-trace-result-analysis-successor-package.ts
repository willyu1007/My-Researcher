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
  PAPER_IMPLEMENTATION_RESULT_ANALYSIS_PROFILE_ID,
  PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SLOT_ID,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-runtime-contracts';

import {
  PrismaPaperImplementationCycleReadinessV2Repository,
} from '../src/repositories/prisma/prisma-paper-implementation-cycle-readiness-v2-repository.js';
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
  PaperImplementationScientificClosureContextService,
} from '../src/services/paper-implementation-scientific-closure-context-service.js';
import {
  assertScientificEvidenceP5ClosurePacketAcceptanceV1,
  assertScientificEvidenceP5ClosurePacketPreparedV1,
  type ScientificEvidenceP5ClosurePacketAcceptanceV1,
  type ScientificEvidenceP5ClosurePacketPreparedV1,
} from '../src/services/scientific-evidence-p5-closure-packet-continuation-service.js';
import {
  SCIENTIFIC_EVIDENCE_P5_PACKET_TRACE_SUCCESSOR_PACKAGE_SCHEMA_V1,
  SCIENTIFIC_EVIDENCE_P5_PACKET_TRACE_SUCCESSOR_PREPARED_SCHEMA_V1,
  assertScientificEvidenceP5PacketTraceSuccessorAcceptanceV1,
  assertScientificEvidenceP5PacketTraceSuccessorPreparedV1,
  buildScientificEvidenceP5PacketTraceLineageV1,
  buildScientificEvidenceP5PacketTraceSuccessorPackageV1,
  exactScientificEvidenceP5PacketTraceSuccessorEffectsV1,
  preflightScientificEvidenceP5PacketTraceSuccessorPackageV1,
  type ScientificEvidenceP5PacketTraceSuccessorAcceptanceV1,
  type ScientificEvidenceP5PacketTraceSuccessorPackageContentV1,
  type ScientificEvidenceP5PacketTraceSuccessorPreparedV1,
} from '../src/services/scientific-evidence-p5-packet-trace-result-analysis-successor-service.js';
import {
  assertScientificEvidenceP5ResultAnalysisRecoveryAcceptanceV1,
  assertScientificEvidenceP5ResultAnalysisRecoveryPreparedV1,
  type ScientificEvidenceP5ResultAnalysisRecoveryAcceptanceV1,
  type ScientificEvidenceP5ResultAnalysisRecoveryPreparedV1,
} from '../src/services/scientific-evidence-p5-result-analysis-recovery-service.js';
import {
  TopicSelectionModelProfileRegistryService,
} from '../src/services/topic-selection-model-profile-registry-service.js';
import {
  assertExperimentFoundationLiveNamedLocalTarget,
  assertExperimentFoundationNamedLocalDatabaseUrl,
} from './experiment-foundation-named-local-evidence.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const MANIFEST_DIRECTORY = path.join(REPO_ROOT, 'workloads/scifact-recall-p5/manifests');
const OUTPUT_PATH = path.join(
  MANIFEST_DIRECTORY,
  'prepared-packet-trace-result-analysis-successor-v1.json',
);
const EXPIRED_PREDECESSOR_PATH = path.join(
  MANIFEST_DIRECTORY,
  'prepared-packet-trace-result-analysis-successor-attempt1-expired-v1.json',
);
const TERMINAL_PREDECESSOR_PATH = path.join(
  MANIFEST_DIRECTORY,
  'prepared-packet-trace-result-analysis-successor-attempt2-terminal-v1.json',
);
const SUCCESSOR_ACCEPTANCE_PATH = path.join(
  MANIFEST_DIRECTORY,
  'authorization-acceptance-packet-trace-result-analysis-successor-v1.json',
);
const TERMINAL_PREDECESSOR_ACCEPTANCE_PATH = path.join(
  MANIFEST_DIRECTORY,
  'authorization-acceptance-packet-trace-result-analysis-successor-attempt2-v1.json',
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
const SOURCE_RA_TERMINAL_PATH = path.join(
  MANIFEST_DIRECTORY,
  'credential-attempt-terminal-t136-p5-result-analysis-recovery-3.json',
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
const SOURCE_CONTINUATION_COMPLETION_PATH = path.join(
  MANIFEST_DIRECTORY,
  'credential-attempt-t136-p5-closure-packet-continuation-1-closure_packet_continuation-completion.json',
);
const RECOVERY_ROOT = '/Users/yurui/Desktop/My-Researcher-Recovery/T-136';
const RECOVERY_MANIFEST_PATH = path.join(
  RECOVERY_ROOT,
  'packet-trace-result-analysis-successor-20260815-2107',
  't136-p5-packet-trace-result-analysis-successor-recovery-point.json',
);
const EXECUTOR_SOURCE_PATH = path.join(
  REPO_ROOT,
  'apps/backend/scripts/run-scientific-evidence-p5-packet-trace-result-analysis-successor.ts',
);
const SOURCE_FILE_PATHS = [
  'apps/backend/src/services/paper-implementation-trace-kernel-service.ts',
  'apps/backend/src/repositories/prisma/prisma-paper-implementation-trace-repository.ts',
  'apps/backend/src/services/paper-implementation-result-analysis-runtime-service.ts',
  'apps/backend/src/services/topic-selection-agent-orchestrator-service.ts',
  'apps/backend/src/repositories/prisma/prisma-paper-implementation-validation-cycle-closure-v2-repository.ts',
  'apps/backend/src/services/scientific-evidence-p5-packet-trace-result-analysis-successor-service.ts',
] as const;

const EXPIRED_PREDECESSOR_ATTEMPT_ID = 't136-p5-packet-trace-result-analysis-successor-1';
const EXPIRED_PREDECESSOR_PACKAGE_HASH =
  'sha256:2b55d735da79dd293bee70f946aa84521ec731e0ec515b7cf1a9e0a13adb9860';
const EXPIRED_PREDECESSOR_MANIFEST_SHA256 =
  'sha256:10caa0837ab19804bb74c6a86f97ab741a1eb172c55674a248f477dfa3a7a0af';
const TERMINAL_PREDECESSOR_ATTEMPT_ID =
  't136-p5-packet-trace-result-analysis-successor-2';
const TERMINAL_PREDECESSOR_PACKAGE_HASH =
  'sha256:517faaa1d47cadfb781b92c64a060a7503e49acc99ba4ee5e58650c38886ab0d';
const TERMINAL_PREDECESSOR_MANIFEST_SHA256 =
  'sha256:7c2f64ade73e3b2ace4c39de72a8d488883153979389e490c1de466ef3c0886d';
const TERMINAL_PREDECESSOR_ACCEPTANCE_SHA256 =
  'sha256:dcad620e2ea64ee87ff44ebf4bc0211e9ed00a3a66d9ff6da786a2a5755db6a6';
const TERMINAL_PREDECESSOR_CLAIM_SHA256 =
  'sha256:5845c5afe1864cc33708dac7338330661323df21dfc9921a15c0f1f16d66bd71';
const TERMINAL_PREDECESSOR_TERMINAL_SHA256 =
  'sha256:059a38d4c5428f357cb34865ef9a3252d53235f08eec2260b3038d843075882f';
const SUCCESSOR_ATTEMPT_ID = 't136-p5-packet-trace-result-analysis-successor-3';
const SOURCE_RA_ATTEMPT_ID = 't136-p5-result-analysis-recovery-3';
const SOURCE_RA_PACKAGE_HASH =
  'sha256:79687bf823c52f440664da71ec56ba323ffedbc244815cc3a04593103b7cb9d1';
const SOURCE_CONTINUATION_ATTEMPT_ID = 't136-p5-closure-packet-continuation-1';
const SOURCE_CONTINUATION_PACKAGE_HASH =
  'sha256:0d68a8789fbc97673dbbc5e0d7488370e82a4bde1098fa8cb9a01b922593247a';
const PROJECT_ID = 'implementation_project_642a1879-1137-40f5-b340-330b66509975';
const VALIDATION_CYCLE_ID = 'validation_cycle_t136_p5_scifact_v4';
const RUN_ID = 'ef_run_v2_t136_p5_scifact_v4_1';
const RUN_MANIFEST_HASH =
  'sha256:72d5aa100f4663ae490946c7e7dcb3e4d36f56333dca5768625d61ce12f4a65a';
const CYCLE_TRACE_ID = 'trace_manifest_t136_p5_scifact_v4';
const PACKET_TRACE_ID = 'trace_manifest_t136_p5_scifact_v4_result_packet';
const PACKET_ID = 'result_interpretation_packet_t136_p5_scifact_v4';
const RUNTIME_RUN_ID = 'pi_result_analysis_runtime_t136_p5_scifact_v4_packet_trace_successor_3';
const INPUT_SNAPSHOT_REF_ID =
  'implementation_input_snapshot_t136_p5_scifact_v4_packet_trace_successor_3';
const TARGET = Object.freeze({
  database: 'postgres',
  schema: 'my_researcher_dev',
  host: '127.0.0.1',
  port: '5432',
  fingerprint: 'sha256:8851b255b079ad1f049dc1842c41cb3516d5a3ff0b69e21a30e8f2675409cca0',
});

interface RecoveryPointManifest {
  schema: 'ScientificEvidenceP5PacketTraceResultAnalysisSuccessorRecoveryPoint@v1';
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
  assertNoAlibabaCredentialMaterial();
  assertExpiredPredecessorBytes(await readOptionalFile(EXPIRED_PREDECESSOR_PATH));
  await archiveTerminalPredecessor(options.writeManifest);
  await assertSuccessorAttemptArtifactsAbsent(SUCCESSOR_ATTEMPT_ID);
  const preparedAt = await resolvePreparedAt(options.writeManifest);
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required');
  assertExperimentFoundationNamedLocalDatabaseUrl(
    databaseUrl,
    TARGET,
    'T136_P5_PACKET_TRACE_SUCCESSOR_TARGET_MISMATCH',
  );

  const [
    sourceRaPreparedBytes,
    sourceRaAcceptanceBytes,
    sourceRaClaimBytes,
    sourceRaCompletionBytes,
    sourceContinuationPreparedBytes,
    sourceContinuationAcceptanceBytes,
    sourceContinuationClaimBytes,
    sourceContinuationTerminalBytes,
    recoveryPoint,
  ] = await Promise.all([
    fs.readFile(SOURCE_RA_PREPARED_PATH, 'utf8'),
    fs.readFile(SOURCE_RA_ACCEPTANCE_PATH, 'utf8'),
    fs.readFile(SOURCE_RA_CLAIM_PATH, 'utf8'),
    fs.readFile(SOURCE_RA_COMPLETION_PATH, 'utf8'),
    fs.readFile(SOURCE_CONTINUATION_PREPARED_PATH, 'utf8'),
    fs.readFile(SOURCE_CONTINUATION_ACCEPTANCE_PATH, 'utf8'),
    fs.readFile(SOURCE_CONTINUATION_CLAIM_PATH, 'utf8'),
    fs.readFile(SOURCE_CONTINUATION_TERMINAL_PATH, 'utf8'),
    readRecoveryPoint(),
  ]);
  await Promise.all([
    assertFileAbsent(SOURCE_RA_TERMINAL_PATH, 'T136_P5_PACKET_TRACE_SUCCESSOR_RA_TERMINAL_PRESENT'),
    assertFileAbsent(
      SOURCE_CONTINUATION_COMPLETION_PATH,
      'T136_P5_PACKET_TRACE_SUCCESSOR_CONTINUATION_COMPLETION_PRESENT',
    ),
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
  assert.equal(sourceRaPrepared.recovery_package.recovery_attempt_id, SOURCE_RA_ATTEMPT_ID);
  assert.equal(sourceRaPrepared.recovery_package.package_hash, SOURCE_RA_PACKAGE_HASH);
  assertStageRecord(JSON.parse(sourceRaClaimBytes), {
    status: 'claimed',
    attemptId: SOURCE_RA_ATTEMPT_ID,
    packageHash: SOURCE_RA_PACKAGE_HASH,
    stage: 'result_analysis_recovery',
  });
  assertStageRecord(JSON.parse(sourceRaCompletionBytes), {
    status: 'completed',
    attemptId: SOURCE_RA_ATTEMPT_ID,
    packageHash: SOURCE_RA_PACKAGE_HASH,
    stage: 'result_analysis_recovery',
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
  assert.equal(
    sourceContinuationPrepared.continuation_package.continuation_attempt_id,
    SOURCE_CONTINUATION_ATTEMPT_ID,
  );
  assert.equal(
    sourceContinuationPrepared.continuation_package.package_hash,
    SOURCE_CONTINUATION_PACKAGE_HASH,
  );
  assertStageRecord(JSON.parse(sourceContinuationClaimBytes), {
    status: 'claimed',
    attemptId: SOURCE_CONTINUATION_ATTEMPT_ID,
    packageHash: SOURCE_CONTINUATION_PACKAGE_HASH,
    stage: 'closure_packet_continuation',
  });
  assertStageRecord(JSON.parse(sourceContinuationTerminalBytes), {
    status: 'terminal',
    attemptId: SOURCE_CONTINUATION_ATTEMPT_ID,
    packageHash: SOURCE_CONTINUATION_PACKAGE_HASH,
    reasonCode: 'T136_P5_CLOSURE_PACKET_CONTINUATION_FAILED',
  });

  const resolvedProfile = new TopicSelectionModelProfileRegistryService().resolveProfile({
    profile_id: PAPER_IMPLEMENTATION_RESULT_ANALYSIS_PROFILE_ID,
    execution_mode: 'provider_llm',
    run_mode: 'product',
    model_option_id: null,
  });
  const selectedOption = resolvedProfile.selected_model_option;
  assert.ok(selectedOption, 'T136_P5_PACKET_TRACE_SUCCESSOR_MODEL_OPTION_MISSING');
  assert.equal(selectedOption.provider_id, 'openai');
  assert.equal(selectedOption.model_id, 'gpt-5.6-sol');
  assert.ok(resolvedProfile.normalized_params_hash);

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

    const traceRepository = new PrismaPaperImplementationTraceRepository(prisma);
    const cycleTrace = await traceRepository.findTraceManifestById(PROJECT_ID, CYCLE_TRACE_ID);
    assert.ok(cycleTrace);
    assert.equal(cycleTrace.trace_status, 'complete');
    assert.equal(cycleTrace.target_ref.ref_type, 'validation_cycle');
    assert.equal(cycleTrace.target_ref.ref_id, VALIDATION_CYCLE_ID);

    const sourceFinal = sourceContinuationPrepared.continuation_package.source_result_analysis;
    const [
      project,
      finalArtifact,
      finalAdmission,
      packetTraceCount,
      runtimeArtifacts,
      runtimeAdmissions,
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
      prisma.paperImplementationRuntimeArtifact.findUnique({
        where: { id: sourceFinal.final_artifact.id },
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
        where: { id: sourceFinal.final_admission.id },
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
      prisma.paperImplementationTraceManifest.count({ where: { id: PACKET_TRACE_ID } }),
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
    ]);
    assert.ok(project?.titleCardId);
    assert.ok(finalArtifact?.finalArtifactHash);
    assert.ok(finalAdmission?.admittedArtifactHash);
    assert.equal(finalArtifact.artifactScope, 'final');
    assert.equal(finalArtifact.runtimeStatus, 'passed');
    assert.equal(finalAdmission.runtimeArtifactId, finalArtifact.id);
    assert.equal(finalAdmission.admissionScope, 'final');
    assert.equal(finalAdmission.admissionStatus, 'admitted');
    assert.deepEqual({
      id: finalArtifact.id,
      artifact_identity_hash: finalArtifact.artifactIdentityHash,
      runtime_identity_hash: finalArtifact.runtimeIdentityHash,
      final_artifact_hash: finalArtifact.finalArtifactHash,
    }, sourceFinal.final_artifact);
    assert.deepEqual({
      id: finalAdmission.id,
      admission_identity_hash: finalAdmission.admissionIdentityHash,
      runtime_artifact_hash: finalAdmission.runtimeArtifactHash,
      admitted_artifact_hash: finalAdmission.admittedArtifactHash,
      status: finalAdmission.admissionStatus,
    }, sourceFinal.final_admission);
    assert.deepEqual({
      packetTraceCount,
      runtimeArtifacts,
      runtimeAdmissions,
      closures,
      packets,
      closedOutboxes,
      closedInboxes,
      undelivered: undeliveredPi + undeliveredEf + undeliveredPromotion,
    }, {
      packetTraceCount: 0,
      runtimeArtifacts: 2,
      runtimeAdmissions: 2,
      closures: 0,
      packets: 0,
      closedOutboxes: 0,
      closedInboxes: 0,
      undelivered: 0,
    });

    const closureRepository =
      new PrismaPaperImplementationValidationCycleClosureV2Repository(prisma);
    const closureContext = await new PaperImplementationScientificClosureContextService(
      closureRepository,
    ).resolve({
      implementation_project_id: PROJECT_ID,
      validation_cycle_id: VALIDATION_CYCLE_ID,
      expected_closure_watermark_hash: readiness.watermark.closure_input_hash,
      title_card_id: project.titleCardId,
    });
    const authoritativeRunEvidenceRefs = closureContext.authoritative_sources
      .map((source) => source.source_ref)
      .filter((sourceRef) => sourceRef.ref_type === 'run_evidence_unit');
    const packetTraceLineage = buildScientificEvidenceP5PacketTraceLineageV1({
      source_lineage: cycleTrace.lineage,
      authoritative_run_evidence_refs: authoritativeRunEvidenceRefs,
      title_card_id: project.titleCardId,
    });
    assert.deepEqual(
      packetTraceLineage.experiment.run_evidence_refs,
      authoritativeRunEvidenceRefs,
    );

    const oldOfficialProposal = await closureRepository.withTransaction(
      (transaction) => transaction.findAdmittedScientificClosureProposal(
        finalArtifact.id,
        finalArtifact.finalArtifactHash!,
      ),
    );
    assert.equal(
      oldOfficialProposal,
      null,
      'T136_P5_PACKET_TRACE_SUCCESSOR_SOURCE_PROPOSAL_UNEXPECTEDLY_RESOLVED',
    );

    assert.ok(
      Date.parse(recoveryPoint.created_at) <= Date.parse(preparedAt),
      'T136_P5_PACKET_TRACE_SUCCESSOR_RECOVERY_POINT_LATE',
    );
    const authorizationNotAfter = new Date(Date.parse(preparedAt) + 6 * 60 * 60 * 1_000)
      .toISOString();
    const executeNotAfter = new Date(Date.parse(authorizationNotAfter) + 30 * 60 * 1_000)
      .toISOString();
    const content: ScientificEvidenceP5PacketTraceSuccessorPackageContentV1 = {
      schema_version: SCIENTIFIC_EVIDENCE_P5_PACKET_TRACE_SUCCESSOR_PACKAGE_SCHEMA_V1,
      successor_attempt_id: SUCCESSOR_ATTEMPT_ID,
      source_result_analysis: {
        recovery_attempt_id: SOURCE_RA_ATTEMPT_ID,
        package_hash: SOURCE_RA_PACKAGE_HASH,
        prepared_record_sha256: sha256(sourceRaPreparedBytes),
        acceptance_record_sha256: sha256(sourceRaAcceptanceBytes),
        claim_record_sha256: sha256(sourceRaClaimBytes),
        completion_record_sha256: sha256(sourceRaCompletionBytes),
        final_artifact: sourceFinal.final_artifact,
        final_admission: sourceFinal.final_admission,
      },
      source_continuation: {
        continuation_attempt_id: SOURCE_CONTINUATION_ATTEMPT_ID,
        package_hash: SOURCE_CONTINUATION_PACKAGE_HASH,
        prepared_record_sha256: sha256(sourceContinuationPreparedBytes),
        acceptance_record_sha256: sha256(sourceContinuationAcceptanceBytes),
        claim_record_sha256: sha256(sourceContinuationClaimBytes),
        terminal_record_sha256: sha256(sourceContinuationTerminalBytes),
        terminal_reason_code: 'T136_P5_CLOSURE_PACKET_CONTINUATION_FAILED',
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
        source_cycle_trace: {
          id: cycleTrace.trace_manifest_id,
          identity_hash: semanticHash('P5PacketTraceSourceCycleTrace', cycleTrace),
          target_ref_type: 'validation_cycle',
          target_ref_id: VALIDATION_CYCLE_ID,
          trace_status: 'complete',
        },
        packet_trace: {
          id: PACKET_TRACE_ID,
          target_ref_type: 'result_interpretation_packet',
          target_ref_id: PACKET_ID,
          target_version_id: null,
          expected_status: 'complete',
        },
        current_effects: {
          packet_trace_manifests: 0,
          runtime_artifacts: 2,
          runtime_admissions: 2,
          closures: 0,
          packets: 0,
          validation_cycle_closed_outboxes: 0,
          validation_cycle_closed_inboxes: 0,
          undelivered_integration_outboxes: 0,
        },
      },
      runtime_request: {
        run_mode: 'product',
        execution_mode: 'provider_llm',
        runtime_run_id: RUNTIME_RUN_ID,
        model_profile_id: PAPER_IMPLEMENTATION_RESULT_ANALYSIS_PROFILE_ID,
        model_option_id: selectedOption.option_id,
        model_profile_hash: prefixedHash(resolvedProfile.profile_hash),
        normalized_params_hash: prefixedHash(resolvedProfile.normalized_params_hash),
        provider_id: 'openai',
        model_id: 'gpt-5.6-sol',
        max_provider_call_count: 2,
        target_version_id: RUN_MANIFEST_HASH,
        input_snapshot_ref_id: INPUT_SNAPSHOT_REF_ID,
        input_snapshot_hash: semanticHash('P5PacketTraceResultAnalysisSuccessorInput', {
          successor_attempt_id: SUCCESSOR_ATTEMPT_ID,
          source_continuation_package_hash: SOURCE_CONTINUATION_PACKAGE_HASH,
          run_id: RUN_ID,
          run_manifest_hash: RUN_MANIFEST_HASH,
          closure_watermark_hash: readiness.watermark.closure_input_hash,
          packet_trace_id: PACKET_TRACE_ID,
        }),
        source_hashes: [
          legacySemanticHash('P5FutureResultPacket', { packet_id: PACKET_ID }),
          legacySemanticHash('P5TraceManifestRef', { trace_manifest_id: PACKET_TRACE_ID }),
        ],
      },
      executor: {
        mode: 'packet_trace_then_result_analysis',
        path: path.relative(REPO_ROOT, EXECUTOR_SOURCE_PATH),
        sha256: await sha256File(EXECUTOR_SOURCE_PATH),
      },
      source_binding: {
        source_files: await Promise.all(SOURCE_FILE_PATHS.map(async (sourcePath) => ({
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
      authorized_effects: exactScientificEvidenceP5PacketTraceSuccessorEffectsV1(),
      operational_window: {
        prepared_at: preparedAt,
        authorization_not_after: authorizationNotAfter,
        execute_not_after: executeNotAfter,
      },
    };
    const successorPackage = buildScientificEvidenceP5PacketTraceSuccessorPackageV1(content);
    const eligibility = preflightScientificEvidenceP5PacketTraceSuccessorPackageV1(successorPackage);
    assert.equal(eligibility.status, 'eligible', eligibility.reason_codes.join(', '));
    assert.deepEqual(eligibility.reason_codes, []);
    const prepared: ScientificEvidenceP5PacketTraceSuccessorPreparedV1 = {
      schema_version: SCIENTIFIC_EVIDENCE_P5_PACKET_TRACE_SUCCESSOR_PREPARED_SCHEMA_V1,
      status: 'eligible',
      successor_package: successorPackage,
      eligibility,
      preparation_effect_census: {
        database_writes: 0,
        external_calls: 0,
        create_job_calls: 0,
        capability_changes: 0,
        provider_credentials_read: 0,
      },
    };
    assertScientificEvidenceP5PacketTraceSuccessorPreparedV1(prepared);
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
      'Usage: prepare-scientific-evidence-p5-packet-trace-result-analysis-successor-package '
      + '[--write-manifest]',
    );
  }
  return { writeManifest };
}

async function resolvePreparedAt(writeManifest: boolean): Promise<string> {
  try {
    const existing = JSON.parse(await fs.readFile(OUTPUT_PATH, 'utf8')) as
      ScientificEvidenceP5PacketTraceSuccessorPreparedV1;
    assertScientificEvidenceP5PacketTraceSuccessorPreparedV1(existing);
    return existing.successor_package.operational_window.prepared_at;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    if (!writeManifest) {
      throw new Error('T136_P5_PACKET_TRACE_SUCCESSOR_REQUIRES_FIRST_WRITE_MANIFEST');
    }
    return new Date().toISOString();
  }
}

async function archiveTerminalPredecessor(writeManifest: boolean): Promise<void> {
  const stage = 'packet_trace_result_analysis_successor';
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
    readOptionalFile(SUCCESSOR_ACCEPTANCE_PATH),
    readOptionalFile(TERMINAL_PREDECESSOR_ACCEPTANCE_PATH),
    fs.readFile(claimPath, 'utf8'),
    fs.readFile(terminalPath, 'utf8'),
  ]);
  await assertFileAbsent(
    completionPath,
    'T136_P5_PACKET_TRACE_SUCCESSOR_TERMINAL_PREDECESSOR_COMPLETION_PRESENT',
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
    reasonCode: 'T136_P5_PACKET_TRACE_RESULT_ANALYSIS_SUCCESSOR_FAILED',
  });

  if (currentPreparedBytes) {
    const current = JSON.parse(currentPreparedBytes) as
      ScientificEvidenceP5PacketTraceSuccessorPreparedV1;
    assertScientificEvidenceP5PacketTraceSuccessorPreparedV1(current);
    if (current.successor_package.successor_attempt_id === SUCCESSOR_ATTEMPT_ID) {
      assert.equal(currentAcceptanceBytes, null);
      const predecessor = assertTerminalPredecessorPreparedBytes(archivedPreparedBytes);
      assertTerminalPredecessorAcceptanceBytes(archivedAcceptanceBytes, predecessor);
      return;
    }
  }

  assert.equal(
    currentPreparedBytes !== null && archivedPreparedBytes !== null,
    false,
    'T136_P5_PACKET_TRACE_SUCCESSOR_TERMINAL_PREDECESSOR_PREPARED_DUPLICATED',
  );
  assert.equal(
    currentAcceptanceBytes !== null && archivedAcceptanceBytes !== null,
    false,
    'T136_P5_PACKET_TRACE_SUCCESSOR_TERMINAL_PREDECESSOR_ACCEPTANCE_DUPLICATED',
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
    throw new Error('T136_P5_PACKET_TRACE_SUCCESSOR_REQUIRES_FIRST_WRITE_MANIFEST');
  }
  if (currentPreparedBytes) await fs.rename(OUTPUT_PATH, TERMINAL_PREDECESSOR_PATH);
  if (currentAcceptanceBytes) {
    await fs.rename(SUCCESSOR_ACCEPTANCE_PATH, TERMINAL_PREDECESSOR_ACCEPTANCE_PATH);
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
): ScientificEvidenceP5PacketTraceSuccessorPreparedV1 {
  assert.ok(bytes, 'T136_P5_PACKET_TRACE_SUCCESSOR_TERMINAL_PREDECESSOR_MISSING');
  assert.equal(sha256(bytes), TERMINAL_PREDECESSOR_MANIFEST_SHA256);
  const prepared = JSON.parse(bytes) as ScientificEvidenceP5PacketTraceSuccessorPreparedV1;
  assertScientificEvidenceP5PacketTraceSuccessorPreparedV1(prepared);
  assert.equal(
    prepared.successor_package.successor_attempt_id,
    TERMINAL_PREDECESSOR_ATTEMPT_ID,
  );
  assert.equal(
    prepared.successor_package.package_hash,
    TERMINAL_PREDECESSOR_PACKAGE_HASH,
  );
  return prepared;
}

function assertTerminalPredecessorAcceptanceBytes(
  bytes: string | null,
  prepared: ScientificEvidenceP5PacketTraceSuccessorPreparedV1,
): void {
  assert.ok(bytes, 'T136_P5_PACKET_TRACE_SUCCESSOR_TERMINAL_ACCEPTANCE_MISSING');
  assert.equal(sha256(bytes), TERMINAL_PREDECESSOR_ACCEPTANCE_SHA256);
  assertScientificEvidenceP5PacketTraceSuccessorAcceptanceV1({
    prepared,
    acceptance: JSON.parse(bytes) as ScientificEvidenceP5PacketTraceSuccessorAcceptanceV1,
  });
}

async function syncManifestDirectory(): Promise<void> {
  const directory = await fs.open(MANIFEST_DIRECTORY, 'r');
  try {
    await directory.sync();
  } finally {
    await directory.close();
  }
}

function assertExpiredPredecessorBytes(bytes: string | null): asserts bytes is string {
  assert.ok(bytes, 'T136_P5_PACKET_TRACE_SUCCESSOR_EXPIRED_PREDECESSOR_MISSING');
  assert.equal(sha256(bytes), EXPIRED_PREDECESSOR_MANIFEST_SHA256);
  const prepared = JSON.parse(bytes) as ScientificEvidenceP5PacketTraceSuccessorPreparedV1;
  assertScientificEvidenceP5PacketTraceSuccessorPreparedV1(prepared);
  assert.equal(
    prepared.successor_package.successor_attempt_id,
    EXPIRED_PREDECESSOR_ATTEMPT_ID,
  );
  assert.equal(prepared.successor_package.package_hash, EXPIRED_PREDECESSOR_PACKAGE_HASH);
}

async function assertSuccessorAttemptArtifactsAbsent(attemptId: string): Promise<void> {
  const stage = 'packet_trace_result_analysis_successor';
  await Promise.all([
    assertFileAbsent(
      SUCCESSOR_ACCEPTANCE_PATH,
      'T136_P5_PACKET_TRACE_SUCCESSOR_ACCEPTANCE_PRESENT',
    ),
    assertFileAbsent(
      path.join(MANIFEST_DIRECTORY, `credential-attempt-${attemptId}-${stage}-claim.json`),
      'T136_P5_PACKET_TRACE_SUCCESSOR_CLAIM_PRESENT',
    ),
    assertFileAbsent(
      path.join(MANIFEST_DIRECTORY, `credential-attempt-${attemptId}-${stage}-completion.json`),
      'T136_P5_PACKET_TRACE_SUCCESSOR_COMPLETION_PRESENT',
    ),
    assertFileAbsent(
      path.join(MANIFEST_DIRECTORY, `credential-attempt-terminal-${attemptId}.json`),
      'T136_P5_PACKET_TRACE_SUCCESSOR_TERMINAL_PRESENT',
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

async function readRecoveryPoint(): Promise<RecoveryPointManifest> {
  const bytes = await fs.readFile(RECOVERY_MANIFEST_PATH, 'utf8');
  const point = JSON.parse(bytes) as RecoveryPointManifest;
  assert.equal(
    point.schema,
    'ScientificEvidenceP5PacketTraceResultAnalysisSuccessorRecoveryPoint@v1',
  );
  assert.equal(point.target_fingerprint, TARGET.fingerprint);
  assert.deepEqual(point.restore_order, ['schema_pre_data', 'authority_data', 'schema_post_data']);
  assert.equal(point.authority_data_dump.table_data_entries, 114);
  assert.equal(recoveryFingerprint(point), point.recovery_fingerprint);
  const directory = path.dirname(RECOVERY_MANIFEST_PATH);
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

async function writeNewExactManifest(filePath: string, serialized: string): Promise<void> {
  try {
    const existing = await fs.readFile(filePath, 'utf8');
    assert.equal(existing, serialized, 'Existing Packet-trace successor manifest differs.');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    await fs.writeFile(filePath, serialized, { encoding: 'utf8', flag: 'wx' });
  }
}

async function assertFileAbsent(filePath: string, reason: string): Promise<void> {
  try {
    await fs.access(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
    throw error;
  }
  throw new Error(reason);
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
    assert.equal(process.env[key], undefined, `${key} must be absent during package preparation.`);
  }
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

function legacySemanticHash(recordKind: string, content: Record<string, unknown>): string {
  return sha256(JSON.stringify({
    record_kind: recordKind,
    schema_version: 'v1',
    content,
  }));
}

function prefixedHash(value: string): string {
  assert.match(value, /^[a-f0-9]{64}$/);
  return `sha256:${value}`;
}

main().catch((error: unknown) => {
  process.stderr.write(`${JSON.stringify({
    schema_version: 'ScientificEvidenceP5PacketTraceResultAnalysisSuccessorPreparationFailure@v1',
    status: 'failed',
    reason: stableFailureCode(error),
  })}\n`);
  process.exitCode = 1;
});

function stableFailureCode(error: unknown): string {
  if (!(error instanceof Error)) return 'T136_P5_PACKET_TRACE_SUCCESSOR_PREPARATION_FAILED';
  return /^((?:T136_P5|P5_PTRAS)_[A-Z0-9_]+)/.exec(error.message)?.[1]
    ?? 'T136_P5_PACKET_TRACE_SUCCESSOR_PREPARATION_FAILED';
}
