#!/usr/bin/env node

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { $OpenApiUtil } from '@alicloud/openapi-core';
import { PrismaClient } from '@prisma/client';
import type {
  ExperimentFoundationAliyunRealProviderProfileV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-real-provider-v2-contracts';

import {
  PrismaExperimentFoundationExecutionBundleV2Repository,
} from '../src/repositories/prisma/prisma-experiment-foundation-execution-bundle-v2-repository.js';
import {
  PrismaExperimentFoundationExecutionV2Repository,
} from '../src/repositories/prisma/prisma-experiment-foundation-execution-v2-repository.js';
import {
  PrismaExperimentFoundationScientificValidationV2Repository,
} from '../src/repositories/prisma/prisma-experiment-foundation-scientific-validation-v2-repository.js';
import {
  PrismaExperimentFoundationSpineV2Repository,
} from '../src/repositories/prisma/prisma-experiment-foundation-spine-v2-repository.js';
import {
  PrismaPaperImplementationEvidenceV2Repository,
} from '../src/repositories/prisma/prisma-paper-implementation-evidence-v2-repository.js';
import {
  PrismaPaperImplementationExperimentSpineV2Repository,
} from '../src/repositories/prisma/prisma-paper-implementation-experiment-spine-v2-repository.js';
import {
  PrismaPaperImplementationValidationCycleClosureV2Repository,
} from '../src/repositories/prisma/prisma-paper-implementation-validation-cycle-closure-v2-repository.js';
import {
  createExperimentFoundationAliyunOssSdkClientV2,
  ExperimentFoundationAliyunOssExactResultReaderV2,
} from '../src/services/experiment-foundation-aliyun-oss-exact-result-reader-v2.js';
import {
  type ExperimentFoundationAliyunPaiDlcSdkClientV2,
  ExperimentFoundationAliyunRealProviderTransportV2,
} from '../src/services/experiment-foundation-aliyun-real-provider-v2-transport.js';
import {
  ExperimentFoundationExecutionBundleV2Service,
} from '../src/services/experiment-foundation-execution-bundle-v2-service.js';
import {
  ExperimentFoundationRealProviderCommandV2Worker,
} from '../src/services/experiment-foundation-real-provider-command-v2-worker.js';
import {
  ExperimentFoundationRealProviderIntakeV2Service,
} from '../src/services/experiment-foundation-real-provider-intake-v2-service.js';
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
  readScientificEvidenceP5AttemptTerminalV1,
  resolveScientificEvidenceP5AttemptTerminalPath,
  runScientificEvidenceP5ClaimedStageV1,
  scientificEvidenceP5TerminalReasonCode,
  type ScientificEvidenceP5AttemptBindingV1,
} from '../src/services/scientific-evidence-p5-attempt-terminal-service.js';
import {
  assertScientificEvidenceP5CredentialIntegrityReceiptV1,
  clearScientificEvidenceP5TemporaryCredential,
  parseScientificEvidenceP5CredentialIntegrityReceiptV1,
  readScientificEvidenceP5TemporaryCredentialEnvironment,
  SCIENTIFIC_EVIDENCE_P5_CREDENTIAL_ENV_KEYS_V1,
  SCIENTIFIC_EVIDENCE_P5_CREDENTIAL_INTEGRITY_RECEIPT_ENV_KEY,
  type ScientificEvidenceP5TemporaryCredentialV1,
} from '../src/services/scientific-evidence-p5-credential-integrity-service.js';
import {
  assertScientificEvidenceP5CredentialOperationsWindow,
  assertScientificEvidenceP5LiveStartWindow,
} from '../src/services/scientific-evidence-p5-operational-timeline-service.js';
import {
  ExperimentFoundationScientificSourcePreparationServiceV1,
} from '../src/services/experiment-foundation-scientific-source-v1-service.js';
import {
  ExperimentFoundationV2ScientificValidationService,
} from '../src/services/experiment-foundation-v2-scientific-validation-service.js';
import {
  ExperimentV2IntegrationRelayService,
} from '../src/services/experiment-v2-integration-relay-service.js';
import {
  PaperImplementationEvidenceTrustGatewayService,
} from '../src/services/paper-implementation-evidence-trust-gateway-service.js';
import {
  PaperImplementationProjectionFeedV2Consumer,
} from '../src/services/paper-implementation-projection-feed-v2-consumer.js';
import {
  assertExperimentFoundationLiveNamedLocalTarget,
  assertExperimentFoundationNamedLocalDatabaseUrl,
  changedExperimentFoundationNamedLocalTables,
  countExperimentFoundationNamedLocalTables,
  digestExperimentFoundationNamedLocalTableRowVersions,
  listExperimentFoundationNamedLocalApplicationTables,
} from './experiment-foundation-named-local-evidence.js';

type RunnerMode = 'offline-preflight' | 'execute';

type TemporaryCredential = ScientificEvidenceP5TemporaryCredentialV1;

const require = createRequire(import.meta.url);
const PaiDlcClientConstructor = require('@alicloud/pai-dlc20201203').default as
  typeof import('@alicloud/pai-dlc20201203').default;

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const PREPARED_PATH = path.join(
  REPO_ROOT,
  'workloads/scifact-recall-p5/manifests/prepared-authorization-v13.json',
);
const AUTHORIZATION_PATH = path.join(
  REPO_ROOT,
  'workloads/scifact-recall-p5/manifests/authorization-acceptance-v13.json',
);
const QUALIFICATION_PATH = path.join(
  REPO_ROOT,
  'workloads/scifact-recall-p5/manifests/credential-qualification-v1.json',
);
const IMAGE_ID = 'image-liuxvj7p2qcnflha84';
const RUN_ID = 'ef_run_v2_t136_p5_scifact_v1_1';
const RUN_MANIFEST_HASH =
  'sha256:e29925d2543ee6376d216dfc3b4dfc94a1192c01dc3478cc13ac91d6d6e467b2';
const VALIDATION_CYCLE_ID = 'validation_cycle_t136_p5_scifact_v1';
const BUNDLE_REVISION_ID =
  'ef_execution_bundle_revision_e87768c5205729b01ff8ceec8a8d0aaa69a15c3b';
const BUNDLE_REVISION_HASH =
  'sha256:ea9cf75556dff3c34938c8937089b223dc8eb9513c658b722932e55bebce1437';
const BUSINESS_KEY = 't136-p5-scifact-attempt-11:real-provider';
const REGION_ID = 'cn-shanghai';
const WORKSPACE_ID = '1450165';
const BUCKET_NAME = 'pea-m7-canary-6194-202607';
const MAXIMUM_CREATE_JOB_CALLS = 2;
const MAXIMUM_WINDOW_COST_CNY = 50;
const RUNNER_DEADLINE_MS = 48 * 60 * 1_000;
const POLL_INTERVAL_MS = 5_000;
const TARGET = Object.freeze({
  database: 'postgres',
  schema: 'my_researcher_dev',
  host: '127.0.0.1',
  port: '5432',
  fingerprint: 'sha256:8851b255b079ad1f049dc1842c41cb3516d5a3ff0b69e21a30e8f2675409cca0',
});
const AUTHORIZED_CAPABILITY_KEYS = [
  'EXPERIMENT_FOUNDATION_V2_REAL_PROVIDER_INTAKE_ENABLED',
  'EXPERIMENT_FOUNDATION_V2_REAL_PROVIDER_CONTROL_DRAIN_ENABLED',
  'EXPERIMENT_FOUNDATION_V2_SCIENTIFIC_VALIDATION_ENABLED',
  'PAPER_IMPLEMENTATION_EXPERIMENT_V2_CYCLE_CLOSURE_ENABLED',
] as const;
const LIVE_CAPABILITY_KEYS = AUTHORIZED_CAPABILITY_KEYS.slice(0, 3);
const MUTABLE_TABLES = [
  'ExperimentFoundationProviderPayloadV2',
  'ExperimentFoundationExecutionAttemptV2',
  'ExperimentFoundationExecutionAttemptEventV2',
  'ExperimentFoundationProviderCommandV2',
  'ExperimentFoundationCollectionAttemptV2',
  'ExperimentFoundationProvisionalOutputV2',
  'ExperimentFoundationExperimentResultV2',
  'ExperimentFoundationScientificValidationReportV2',
  'ExperimentFoundationEvidenceCandidateV2',
  'ExperimentFoundationIntegrationOutboxV2',
  'PaperImplementationExperimentIntegrationInboxV2',
  'PaperImplementationExperimentIntegrationOutboxV2',
  'PaperImplementationRunEvidenceUnitV2',
  'PaperImplementationEvidenceTraceManifestV2',
] as const;
let localAttemptTerminalWriteCount = 0;

async function main(): Promise<void> {
  const mode = parseMode(process.argv.slice(2));
  const prepared = await readPreparedAuthorization();
  const binding = attemptBinding(prepared);
  const terminalPath = resolveScientificEvidenceP5AttemptTerminalPath({
    manifest_directory: path.dirname(PREPARED_PATH),
    binding,
  });
  if (mode === 'execute') {
    const output = await runScientificEvidenceP5ClaimedStageV1({
      manifest_directory: path.dirname(PREPARED_PATH),
      binding,
      stage: 'live',
      on_terminalized: (created) => {
        localAttemptTerminalWriteCount = Math.max(localAttemptTerminalWriteCount, created ? 1 : 0);
      },
      operation: async () => {
        await readAuthorization(prepared);
        return runWindow(mode, prepared, null);
      },
    });
    writeOutput(output);
    return;
  }
  const terminal = await readScientificEvidenceP5AttemptTerminalV1({
    terminal_path: terminalPath,
    binding,
  });
  writeOutput(await runWindow(mode, prepared, terminal));
}

async function runWindow(
  mode: RunnerMode,
  prepared: ScientificEvidenceP5PreparedAuthorizationV3,
  terminal: Awaited<ReturnType<typeof readScientificEvidenceP5AttemptTerminalV1>>,
): Promise<Record<string, unknown>> {
  const executionPackage = prepared.execution_package;
  assertCapabilitiesDisabled();
  const databaseUrl = requireEnvironment('DATABASE_URL');
  assertExperimentFoundationNamedLocalDatabaseUrl(
    databaseUrl,
    TARGET,
    'T136_P5_LIVE_TARGET_MISMATCH',
  );

  const prisma = new PrismaClient();
  await prisma.$connect();
  let credential: TemporaryCredential | null = null;
  try {
    const target = await assertExperimentFoundationLiveNamedLocalTarget(prisma, TARGET);
    const executionRepository = new PrismaExperimentFoundationExecutionV2Repository(prisma);
    const closureRepository =
      new PrismaPaperImplementationValidationCycleClosureV2Repository(prisma);
    const bundleService = new ExperimentFoundationExecutionBundleV2Service({
      repository: new PrismaExperimentFoundationExecutionBundleV2Repository(prisma),
    });
    const prerequisite = await executionRepository.resolveRealProviderRunPrerequisite(RUN_ID);
    assert.ok(prerequisite, 'Exact T-136 P5 Run prerequisite is missing.');
    assert.equal(prerequisite.run.run_manifest_hash, RUN_MANIFEST_HASH);
    assert.equal(prerequisite.validation_cycle_id, VALIDATION_CYCLE_ID);
    assert.equal(prerequisite.cells.length, MAXIMUM_CREATE_JOB_CALLS);
    assert.deepEqual(
      prerequisite.cells.map(({ run_cell: cell }) => cell.run_cell_id),
      executionPackage.authorized_operations.map((operation) => operation.run_cell_id),
    );
    assert.ok(prerequisite.cells.every(({ task_spec: task }) => (
      task.execution_bundle.execution_bundle_revision_id === BUNDLE_REVISION_ID
      && task.execution_bundle.content_hash === BUNDLE_REVISION_HASH
      && task.retry_snapshot.max_attempts === 1
      && task.retry_snapshot.timeout_seconds === 1_800
      && task.resource_snapshot.cpu_cores === 2
      && task.resource_snapshot.memory_mb === 8_192
    )));
    assert.equal(await closureRepository.isCycleClosed(VALIDATION_CYCLE_ID), false);
    const frozenBundle = await bundleService.resolveActiveReadyExact({
      execution_bundle_revision_id: BUNDLE_REVISION_ID,
      content_hash: BUNDLE_REVISION_HASH,
    });
    const profile = buildProfile(frozenBundle.revision.revision_content.container_image.image_ref);
    assert.deepEqual(profile, executionPackage.provider.profile);
    const existingAttempts = await executionRepository.listRunAttempts(RUN_ID);
    assert.ok(existingAttempts.length === 0 || existingAttempts.length === 2);
    assert.ok(existingAttempts.every((attempt) => (
      attempt.workflow_business_key === BUSINESS_KEY
      && attempt.execution_mode === 'real_provider'
      && attempt.provenance === 'real_provider'
    )));
    const undeliveredOutboxCount = await countUndeliveredOutboxes(prisma);
    assert.equal(
      undeliveredOutboxCount,
      0,
      'P5 refuses to run while any unrelated EF/PI integration outbox is undelivered.',
    );

    if (mode === 'offline-preflight') {
      const [resultCount, validationCount, evidenceCount] = await Promise.all([
        prisma.experimentFoundationExperimentResultV2.count({ where: { runId: RUN_ID } }),
        prisma.experimentFoundationScientificValidationReportV2.count({ where: { runId: RUN_ID } }),
        prisma.paperImplementationRunEvidenceUnitV2.count({
          where: { validationCycleId: VALIDATION_CYCLE_ID },
        }),
      ]);
      return {
        schema_version: 'ScientificEvidenceP5LiveWindowOfflinePreflight@v1',
        status: 'passed',
        target_fingerprint: target.fingerprint,
        package_hash: executionPackage.package_hash,
        run_id: RUN_ID,
        run_manifest_hash: RUN_MANIFEST_HASH,
        execution_bundle_revision_hash: BUNDLE_REVISION_HASH,
        existing_attempt_count: existingAttempts.length,
        existing_scientific_result_count: resultCount,
        existing_validation_count: validationCount,
        existing_run_evidence_count: evidenceCount,
        undelivered_integration_outbox_count: undeliveredOutboxCount,
        planned_create_job_count: MAXIMUM_CREATE_JOB_CALLS,
        planned_monetary_ceiling_cny: MAXIMUM_WINDOW_COST_CNY,
        operational_timeline: executionPackage.operational_timeline,
        credential_qualification_required: true,
        attempt_terminal_record_exists: terminal !== null,
        cloud_call_count: 0,
        database_write_count: 0,
        credential_read_count: 0,
        capability_change_count: 0,
      };
    }

    assertScientificEvidenceP5LiveStartWindow(
      executionPackage.operational_timeline,
      Date.now(),
    );
    credential = readTemporaryCredential(prepared);
    const qualification = await readQualification();
    assertScientificEvidenceP5CredentialQualificationV1({
      execution_package: executionPackage,
      qualification,
      expected_image_id: IMAGE_ID,
      current_credential: credential,
    });
    enableProcessCapabilities();
    const applicationTables = await listExperimentFoundationNamedLocalApplicationTables(
      prisma,
      [...MUTABLE_TABLES],
    );
    const protectedTables = applicationTables.filter(
      (table) => !MUTABLE_TABLES.includes(table.name as typeof MUTABLE_TABLES[number]),
    );
    const [protectedBefore, mutableBefore] = await Promise.all([
      digestExperimentFoundationNamedLocalTableRowVersions(prisma, protectedTables),
      countExperimentFoundationNamedLocalTables(prisma, [...MUTABLE_TABLES]),
    ]);
    const live = buildLiveTransport(credential, executionPackage.operational_timeline);
    const scientificRepository =
      new PrismaExperimentFoundationScientificValidationV2Repository(prisma);
    const intake = new ExperimentFoundationRealProviderIntakeV2Service({
      repository: executionRepository,
      cycleClosureLookup: closureRepository,
      executionBundleResolver: bundleService,
      profileResolver: async () => structuredClone(profile),
      intakeEnabled: () => capabilityEnabled(AUTHORIZED_CAPABILITY_KEYS[0]),
    });
    const started = await intake.start(RUN_ID, BUSINESS_KEY);
    assert.equal(started.attempts.length, MAXIMUM_CREATE_JOB_CALLS);
    const attemptIds = started.attempts.map((attempt) => attempt.id);
    const worker = new ExperimentFoundationRealProviderCommandV2Worker({
      repository: executionRepository,
      transport: live.transport,
      executionBundleResolver: bundleService,
      profileResolver: async () => structuredClone(profile),
      controlDrainEnabled: () => capabilityEnabled(AUTHORIZED_CAPABILITY_KEYS[1]),
      scientificSourcePreparationService:
        new ExperimentFoundationScientificSourcePreparationServiceV1({
          protocolResolver: (runId) => scientificRepository.resolveEvaluationProtocol(runId),
        }),
      leaseOwner: `t136-p5-live-${process.pid}`,
    });
    const deadline = Math.min(
      Date.now() + RUNNER_DEADLINE_MS,
      Date.parse(executionPackage.operational_timeline.live.credential_operations_stop_at)
        - 60_000,
    );
    const drain = { passes: 0, claimed_count: 0, completed_count: 0, terminal_count: 0 };
    while (Date.now() < deadline) {
      const outcome = await worker.runOnce(20);
      drain.passes += 1;
      drain.claimed_count += outcome.claimed_count;
      drain.completed_count += outcome.completed_count;
      drain.terminal_count += outcome.terminal_count;
      const attempts = await loadAttempts(prisma, attemptIds);
      const allSucceededAndCollected = attempts.length === MAXIMUM_CREATE_JOB_CALLS
        && attempts.every((attempt) => (
          attempt.lifecycleState === 'succeeded'
          && attempt.terminalReasonCode === 'real_provider_succeeded'
          && attempt.collectionAttempt?.collectionState === 'collected'
          && attempt.collectionAttempt.provisionalOutputs.some(
            (output) => output.outputClass === 'scientific_source',
          )
        ));
      const pendingCommands = await prisma.experimentFoundationProviderCommandV2.count({
        where: {
          executionAttemptId: { in: attemptIds },
          commandState: { in: ['pending', 'claimed'] },
        },
      });
      if (allSucceededAndCollected && pendingCommands === 0) break;
      await delay(POLL_INTERVAL_MS);
    }
    const attempts = await loadAttempts(prisma, attemptIds);
    assert.equal(attempts.length, MAXIMUM_CREATE_JOB_CALLS);
    assert.ok(attempts.every((attempt) => (
      attempt.lifecycleState === 'succeeded'
      && attempt.terminalReasonCode === 'real_provider_succeeded'
      && attempt.collectionAttempt?.collectionState === 'collected'
      && attempt.collectionAttempt.provisionalOutputs.filter(
        (output) => output.outputClass === 'scientific_source',
      ).length === 1
    )));
    assert.ok(live.createJobCallCount() <= MAXIMUM_CREATE_JOB_CALLS);
    assert.equal(new Set(attempts.map((attempt) => JSON.stringify(attempt.externalJobRefJson))).size, 2);
    assertScientificEvidenceP5CredentialOperationsWindow(
      executionPackage.operational_timeline,
      Date.now(),
    );

    const scientificService = new ExperimentFoundationV2ScientificValidationService({
      repository: scientificRepository,
      enabled: () => capabilityEnabled(AUTHORIZED_CAPABILITY_KEYS[2]),
    });
    const generatedResults = [];
    for (const attempt of attempts) {
      const source = attempt.collectionAttempt?.provisionalOutputs.find(
        (output) => output.outputClass === 'scientific_source',
      );
      assert.ok(source);
      generatedResults.push(await scientificService.generateExperimentResult({
        run_cell_id: attempt.runCellId,
        scientific_source_output_id: source.id,
        idempotency_key: `${source.id}:generate-scientific-result@v1`,
      }));
    }
    const validated = await scientificService.validateScientificBatch({
      run_id: RUN_ID,
      expected_run_manifest_hash: RUN_MANIFEST_HASH,
      idempotency_key: `${BUSINESS_KEY}:scientific-validation`,
    });
    assert.equal(validated.report.status, 'passed');
    assert.ok(validated.evidence_candidate);
    assert.equal(await countUndeliveredOutboxes(prisma), 1);

    const piSpineRepository = new PrismaPaperImplementationExperimentSpineV2Repository(prisma);
    const efSpineRepository = new PrismaExperimentFoundationSpineV2Repository(prisma);
    const projectionConsumer = new PaperImplementationProjectionFeedV2Consumer({
      repository: piSpineRepository,
    });
    const relay = new ExperimentV2IntegrationRelayService({
      paperImplementationRepository: piSpineRepository,
      experimentFoundationRepository: efSpineRepository,
      materializationConsumer: { async consume() { throw new Error('Unexpected admission event.'); } },
      headConsumer: { async consume() { throw new Error('Unexpected frozen event.'); } },
      acknowledgementConsumer: { async consume() { throw new Error('Unexpected head event.'); } },
      evidenceTrustGatewayConsumer: new PaperImplementationEvidenceTrustGatewayService({
        repository: new PrismaPaperImplementationEvidenceV2Repository(prisma),
        scientificValidationReadRepository: scientificRepository,
      }),
      runEvidenceProjectionConsumer: projectionConsumer,
      validationCycleClosedProjectionConsumer: { async consume() {
        throw new Error('Unexpected closure event before P5 closure phase.');
      } },
      workerId: `t136-p5-scientific-relay-${process.pid}`,
    });
    const relayOutcome = await relay.drainUntilIdle({ max_passes: 8, limit_per_domain: 20 });
    assert.equal(relayOutcome.idle, true);
    assert.deepEqual(relayOutcome.failures, []);
    const evidenceUnits = await prisma.paperImplementationRunEvidenceUnitV2.findMany({
      where: { validationCycleId: VALIDATION_CYCLE_ID },
      orderBy: { id: 'asc' },
    });
    assert.equal(evidenceUnits.length, 1);

    const mutableAfter = await countExperimentFoundationNamedLocalTables(
      prisma,
      [...MUTABLE_TABLES],
    );
    const protectedAfter =
      await digestExperimentFoundationNamedLocalTableRowVersions(prisma, protectedTables);
    assert.deepEqual(
      changedExperimentFoundationNamedLocalTables(protectedBefore, protectedAfter),
      [],
    );
    const replayBefore = structuredClone(mutableAfter);
    const replayStart = await intake.start(RUN_ID, BUSINESS_KEY);
    assert.equal(replayStart.replayed, true);
    for (const result of generatedResults) {
      await scientificService.generateExperimentResult({
        run_cell_id: result.run_cell_id,
        scientific_source_output_id: result.source_output_id,
        idempotency_key: `${result.source_output_id}:generate-scientific-result@v1`,
      });
    }
    await scientificService.validateScientificBatch({
      run_id: RUN_ID,
      expected_run_manifest_hash: RUN_MANIFEST_HASH,
      idempotency_key: `${BUSINESS_KEY}:scientific-validation`,
    });
    const relayReplay = await relay.drainUntilIdle({ max_passes: 2, limit_per_domain: 20 });
    assert.equal(relayReplay.idle, true);
    assert.deepEqual(
      await countExperimentFoundationNamedLocalTables(prisma, [...MUTABLE_TABLES]),
      replayBefore,
    );

    return {
      schema_version: 'ScientificEvidenceP5LiveWindowResult@v1',
      status: 'real_provider_scientific_evidence_passed',
      target_fingerprint: target.fingerprint,
      package_hash: executionPackage.package_hash,
      run_id: RUN_ID,
      run_manifest_hash: RUN_MANIFEST_HASH,
      create_job_call_count: live.createJobCallCount(),
      monetary_ceiling_cny: MAXIMUM_WINDOW_COST_CNY,
      credential_access_key_id_hash: sha256(credential.access_key_id),
      credential_expiration: credential.expiration,
      credential_qualification_record_hash: qualification.qualification_record_hash,
      result_ids: generatedResults.map((result) => result.result_id),
      validation_report_id: validated.report.report_id,
      evidence_candidate_id: validated.evidence_candidate.candidate_id,
      run_evidence_unit_id: evidenceUnits[0]!.id,
      drain,
      relay: relayOutcome,
      mutable_table_row_deltas: rowDeltas(mutableBefore, mutableAfter),
      replay_new_row_count: 0,
      protected_table_change_count: 0,
      capability_persistence_count: 0,
      secret_output_count: 0,
    };
  } finally {
    disableProcessCapabilities();
    clearCredentialMaterial(credential);
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

function buildProfile(imageUri: string): ExperimentFoundationAliyunRealProviderProfileV2 {
  return {
    schema_version: 'AliyunPaiDlcRealProviderProfile@v1',
    region_id: REGION_ID,
    workspace_id: WORKSPACE_ID,
    resource_binding: {
      mode: 'public_resource',
      ecs_spec: 'ecs.g6.large',
      cpu_cores: 2,
      memory_mb: 8_192,
    },
    image_uri: imageUri,
    job_type: 'PyTorchJob',
    job_spec_type: 'Worker',
    pod_count: 1,
    workload_binding: {
      schema_version: 'AliyunPaiDlcWorkloadBinding@v1',
      runtime_role_arn: 'acs:ram::1183869713036194:role/pea-m7-canary-runtime',
      code_mount_path: '/mnt/pea-code',
      input_mount_root: '/mnt/pea-input',
      output_mount_path: '/mnt/pea-output',
      output_uri_prefix:
        `oss://${BUCKET_NAME}.oss-${REGION_ID}-internal.aliyuncs.com/output/t136-p5/scifact/attempt-11/`,
    },
  };
}

function buildLiveTransport(
  credential: TemporaryCredential,
  timeline: ScientificEvidenceP5PreparedAuthorizationV3['execution_package']['operational_timeline'],
): {
  transport: ExperimentFoundationAliyunRealProviderTransportV2;
  createJobCallCount: () => number;
} {
  const client = new PaiDlcClientConstructor(new $OpenApiUtil.Config({
    accessKeyId: credential.access_key_id,
    accessKeySecret: credential.access_key_secret,
    securityToken: credential.security_token,
    endpoint: `pai-dlc.${REGION_ID}.aliyuncs.com`,
    regionId: REGION_ID,
    protocol: 'https',
    connectTimeout: 10_000,
    readTimeout: 15_000,
  }));
  let createJobCallCount = 0;
  const boundedClient: ExperimentFoundationAliyunPaiDlcSdkClientV2 = {
    createJobWithOptions: async (request, headers, runtime) => {
      assertScientificEvidenceP5CredentialOperationsWindow(
        timeline,
        Date.now(),
      );
      if (createJobCallCount >= MAXIMUM_CREATE_JOB_CALLS) {
        throw new Error('T136_P5_CREATE_JOB_CEILING_EXCEEDED');
      }
      createJobCallCount += 1;
      return client.createJobWithOptions(request, headers, runtime);
    },
    getJobWithOptions: client.getJobWithOptions.bind(client),
    listJobsWithOptions: client.listJobsWithOptions.bind(client),
    stopJobWithOptions: client.stopJobWithOptions.bind(client),
  };
  const ossClient = createExperimentFoundationAliyunOssSdkClientV2({
    bucket_name: BUCKET_NAME,
    region_id: REGION_ID,
    credential,
  });
  return {
    transport: new ExperimentFoundationAliyunRealProviderTransportV2({
      client: boundedClient,
      resultReader: new ExperimentFoundationAliyunOssExactResultReaderV2({
        client: ossClient,
        bucket_name: BUCKET_NAME,
        region_id: REGION_ID,
      }),
    }),
    createJobCallCount: () => createJobCallCount,
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
): Promise<ScientificEvidenceP5AuthorizationAcceptanceV3> {
  const parsed = JSON.parse(
    await fs.readFile(AUTHORIZATION_PATH, 'utf8'),
  ) as ScientificEvidenceP5AuthorizationAcceptanceV3;
  assertScientificEvidenceP5AuthorizationAcceptanceV3({ prepared, acceptance: parsed });
  return parsed;
}

async function readQualification(): Promise<ScientificEvidenceP5CredentialQualificationV1> {
  return JSON.parse(
    await fs.readFile(QUALIFICATION_PATH, 'utf8'),
  ) as ScientificEvidenceP5CredentialQualificationV1;
}

function readTemporaryCredential(
  prepared: ScientificEvidenceP5PreparedAuthorizationV3,
): TemporaryCredential {
  const credential = readScientificEvidenceP5TemporaryCredentialEnvironment(process.env);
  try {
    const serializedReceipt =
      process.env[SCIENTIFIC_EVIDENCE_P5_CREDENTIAL_INTEGRITY_RECEIPT_ENV_KEY];
    if (serializedReceipt === undefined) {
      throw new Error('T136_P5_CREDENTIAL_INTEGRITY_RECEIPT_MISSING');
    }
    assertScientificEvidenceP5CredentialIntegrityReceiptV1({
      credential,
      receipt: parseScientificEvidenceP5CredentialIntegrityReceiptV1(serializedReceipt),
    });
    const issuedAt = Date.parse(credential.issued_at);
    const expiration = Date.parse(credential.expiration);
    const policy = prepared.execution_package.credential_policy;
    const issuance = prepared.execution_package.operational_timeline.issuance;
    assert.ok(Number.isFinite(issuedAt) && Number.isFinite(expiration));
    assert.ok(
      issuedAt >= Date.parse(issuance.not_before)
        && issuedAt <= Date.parse(issuance.dispatch_not_after),
      'T136_P5_STS_ISSUED_BEFORE_AUTHORIZED_WINDOW',
    );
    assert.equal(expiration - issuedAt, policy.issued_duration_seconds * 1_000);
    assert.ok(expiration <= Date.parse(policy.automatic_expiration_not_after));
    assert.ok(
      expiration - Date.now()
        >= policy.minimum_remaining_at_live_start_seconds * 1_000,
    );
    assert.equal(process.env.ALIBABA_CLOUD_CONFIG_FILE, undefined);
    return credential;
  } catch (error) {
    clearCredentialMaterial(credential);
    throw error;
  }
}

function enableProcessCapabilities(): void {
  assertCapabilitiesDisabled();
  for (const key of LIVE_CAPABILITY_KEYS) process.env[key] = 'true';
}

function disableProcessCapabilities(): void {
  for (const key of AUTHORIZED_CAPABILITY_KEYS) delete process.env[key];
}

function capabilityEnabled(key: typeof AUTHORIZED_CAPABILITY_KEYS[number]): boolean {
  return process.env[key]?.trim().toLowerCase() === 'true';
}

function assertCapabilitiesDisabled(): void {
  for (const key of AUTHORIZED_CAPABILITY_KEYS) {
    const value = process.env[key];
    if (value !== undefined && !['false', '0', ''].includes(value.trim().toLowerCase())) {
      throw new Error(`${key} must be disabled before P5 enters its process-local window.`);
    }
  }
}

function clearCredentialMaterial(credential: TemporaryCredential | null): void {
  if (credential) clearScientificEvidenceP5TemporaryCredential(credential);
  for (const key of SCIENTIFIC_EVIDENCE_P5_CREDENTIAL_ENV_KEYS_V1) {
    delete process.env[key];
  }
}

async function loadAttempts(prisma: PrismaClient, ids: string[]) {
  return prisma.experimentFoundationExecutionAttemptV2.findMany({
    where: { id: { in: ids } },
    include: { collectionAttempt: { include: { provisionalOutputs: true } } },
    orderBy: { cellKey: 'asc' },
  });
}

async function countUndeliveredOutboxes(prisma: PrismaClient): Promise<number> {
  const [ef, pi] = await Promise.all([
    prisma.experimentFoundationIntegrationOutboxV2.count({
      where: { relayStatus: { in: ['pending', 'claimed'] } },
    }),
    prisma.paperImplementationExperimentIntegrationOutboxV2.count({
      where: { relayStatus: { in: ['pending', 'claimed'] } },
    }),
  ]);
  return ef + pi;
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

function sha256(value: string): string {
  return `sha256:${createHash('sha256').update(value, 'utf8').digest('hex')}`;
}

function rowDeltas(
  before: Record<string, number>,
  after: Record<string, number>,
): Record<string, number> {
  return Object.fromEntries(
    Object.keys(after).sort().map((table) => [
      table,
      (after[table] ?? 0) - (before[table] ?? 0),
    ]),
  );
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

main().catch((error: unknown) => {
  disableProcessCapabilities();
  clearCredentialMaterial(null);
  process.stderr.write(`${JSON.stringify({
    schema_version: 'ScientificEvidenceP5LiveWindowFailure@v1',
    status: 'failed',
    reason: scientificEvidenceP5TerminalReasonCode(error, 'T136_P5_LIVE_FAILED'),
    local_attempt_terminal_write_count: localAttemptTerminalWriteCount,
  })}\n`);
  process.exitCode = 1;
});
