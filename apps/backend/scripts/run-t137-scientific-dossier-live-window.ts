#!/usr/bin/env node

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import process from 'node:process';

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
  clearScientificEvidenceP5TemporaryCredential,
  readScientificEvidenceP5TemporaryCredentialEnvironment,
  SCIENTIFIC_EVIDENCE_P5_CREDENTIAL_ENV_KEYS_V1,
  type ScientificEvidenceP5TemporaryCredentialV1,
} from '../src/services/scientific-evidence-p5-credential-integrity-service.js';
import {
  scientificEvidenceP5LiveSourceGateV1,
} from '../src/services/scientific-evidence-p5-live-source-gate-service.js';
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
} from './experiment-foundation-named-local-evidence.js';

type RunnerMode = 'offline-preflight' | 'execute';

const require = createRequire(import.meta.url);
const PaiDlcClientConstructor = require('@alicloud/pai-dlc20201203').default as
  typeof import('@alicloud/pai-dlc20201203').default;

const PROJECT_ID = 'implementation_project_4ccca1d1-6782-413a-a6fd-a8c56ab9d40b';
const VALIDATION_CYCLE_ID = 'validation_cycle_t137_t137_pre_pai_20260817_v2_v1';
const RUN_ID = 'ef_run_v2_0369f26c-d784-4c5c-b8dd-7c9b7008bc1c';
const RUN_MANIFEST_HASH =
  'sha256:5b122de63c877294cef9078cafe52e2102778836fe638a5ab87fe7a9b81897a5';
const BUNDLE_REVISION_ID =
  'ef_execution_bundle_revision_1e2a87f2867ca8a89743464eaad8654454702468';
const BUNDLE_REVISION_HASH =
  'sha256:bdf9c260c23c1f8eb079f84a0d8dfe879fe5cba670c6e1a961ad2ddba3198db3';
const BUSINESS_KEY = 't137-scifact-two-cell:t137-pre-pai-20260817-v2:real-provider';
const REGION_ID = 'cn-shanghai';
const WORKSPACE_ID = '1450165';
const BUCKET_NAME = 'pea-m7-canary-6194-202607';
const MAXIMUM_CREATE_JOB_CALLS = 2;
const MAXIMUM_COST_CNY = 50;
const CREDENTIAL_DURATION_SECONDS = 3_600;
const MINIMUM_REMAINING_AT_START_SECONDS = 2_400;
const CREDENTIAL_STOP_MARGIN_SECONDS = 360;
const MAXIMUM_EXECUTION_WINDOW_MS = 48 * 60 * 1_000;
const POLL_INTERVAL_MS = 5_000;
const TARGET = Object.freeze({
  database: 'postgres',
  schema: 'my_researcher_dev',
  host: '127.0.0.1',
  port: '5432',
  fingerprint: 'sha256:8851b255b079ad1f049dc1842c41cb3516d5a3ff0b69e21a30e8f2675409cca0',
});
const CAPABILITY_KEYS = [
  'EXPERIMENT_FOUNDATION_V2_REAL_PROVIDER_INTAKE_ENABLED',
  'EXPERIMENT_FOUNDATION_V2_REAL_PROVIDER_CONTROL_DRAIN_ENABLED',
  'EXPERIMENT_FOUNDATION_V2_SCIENTIFIC_VALIDATION_ENABLED',
] as const;

async function main(): Promise<void> {
  const mode = parseMode(process.argv.slice(2));
  assertCapabilitiesDisabled();
  const databaseUrl = requireEnvironment('DATABASE_URL');
  assertExperimentFoundationNamedLocalDatabaseUrl(
    databaseUrl,
    TARGET,
    'T137_LIVE_TARGET_MISMATCH',
  );

  const prisma = new PrismaClient();
  await prisma.$connect();
  let credential: ScientificEvidenceP5TemporaryCredentialV1 | null = null;
  try {
    const target = await assertExperimentFoundationLiveNamedLocalTarget(prisma, TARGET);
    const executionRepository = new PrismaExperimentFoundationExecutionV2Repository(prisma);
    const closureRepository =
      new PrismaPaperImplementationValidationCycleClosureV2Repository(prisma);
    const bundleService = new ExperimentFoundationExecutionBundleV2Service({
      repository: new PrismaExperimentFoundationExecutionBundleV2Repository(prisma),
    });
    const prerequisite = await executionRepository.resolveRealProviderRunPrerequisite(RUN_ID);
    assert.ok(prerequisite, 'The exact T-137 Run prerequisite is missing.');
    assert.equal(prerequisite.implementation_project_id, PROJECT_ID);
    assert.equal(prerequisite.validation_cycle_id, VALIDATION_CYCLE_ID);
    assert.equal(prerequisite.run.run_manifest_hash, RUN_MANIFEST_HASH);
    assert.equal(prerequisite.cells.length, MAXIMUM_CREATE_JOB_CALLS);
    assert.ok(prerequisite.cells.every(({ task_spec: task }) => (
      task.execution_bundle.execution_bundle_revision_id === BUNDLE_REVISION_ID
      && task.execution_bundle.content_hash === BUNDLE_REVISION_HASH
      && task.retry_snapshot.max_attempts === 1
      && task.retry_snapshot.timeout_seconds === 1_800
      && task.resource_snapshot.cpu_cores === 2
      && task.resource_snapshot.memory_mb === 8_192
    )));
    const cycleClosed = await closureRepository.isCycleClosed(VALIDATION_CYCLE_ID);
    const frozenBundle = await bundleService.resolveActiveReadyExact({
      execution_bundle_revision_id: BUNDLE_REVISION_ID,
      content_hash: BUNDLE_REVISION_HASH,
    });
    const profile = buildProfile(frozenBundle.revision.revision_content.container_image.image_ref);
    const existingAttempts = await executionRepository.listRunAttempts(RUN_ID);
    assert.ok(existingAttempts.length === 0 || existingAttempts.length === 2);
    assert.ok(existingAttempts.every((attempt) => (
      attempt.workflow_business_key === BUSINESS_KEY
      && attempt.execution_mode === 'real_provider'
      && attempt.provenance === 'real_provider'
    )));
    assert.equal(await countScopedUndeliveredOutboxes(prisma), 0);
    const state = await readState(prisma);

    if (mode === 'offline-preflight') {
      writeOutput({
        schema_version: 'T137ScientificDossierLivePreflight@v1',
        status: resolvePreflightStatus(state, cycleClosed),
        target_fingerprint: target.fingerprint,
        run_id: RUN_ID,
        run_manifest_hash: RUN_MANIFEST_HASH,
        execution_policy: {
          maximum_paid_jobs: MAXIMUM_CREATE_JOB_CALLS,
          maximum_cost_cny: MAXIMUM_COST_CNY,
          credential_expires_at: 'ALIBABA_CLOUD_STS_EXPIRATION supplied at execute time',
          execution_window: 'up to 48 minutes; always stops at least 6 minutes before credential expiry',
        },
        current: state,
        validation_cycle_closed: cycleClosed,
        credential_material_present: hasCredentialMaterial(),
        cloud_call_count: 0,
        database_write_count: 0,
        capability_change_count: 0,
      });
      return;
    }

    if (cycleClosed) throw new Error('T137_VALIDATION_CYCLE_ALREADY_CLOSED');
    credential = readTemporaryCredential();
    enableCapabilities();
    const live = buildLiveTransport(credential);
    const scientificRepository =
      new PrismaExperimentFoundationScientificValidationV2Repository(prisma);
    const intake = new ExperimentFoundationRealProviderIntakeV2Service({
      repository: executionRepository,
      cycleClosureLookup: closureRepository,
      executionBundleResolver: bundleService,
      profileResolver: async () => structuredClone(profile),
      intakeEnabled: () => capabilityEnabled(CAPABILITY_KEYS[0]),
    });
    const started = await intake.start(RUN_ID, BUSINESS_KEY);
    assert.equal(started.attempts.length, MAXIMUM_CREATE_JOB_CALLS);
    const attemptIds = started.attempts.map((attempt) => attempt.id);
    const worker = new ExperimentFoundationRealProviderCommandV2Worker({
      repository: executionRepository,
      transport: live.transport,
      executionBundleResolver: bundleService,
      profileResolver: async () => structuredClone(profile),
      controlDrainEnabled: () => capabilityEnabled(CAPABILITY_KEYS[1]),
      scientificSourcePreparationService:
        new ExperimentFoundationScientificSourcePreparationServiceV1({
          protocolResolver: (runId) => scientificRepository.resolveEvaluationProtocol(runId),
        }),
      leaseOwner: `t137-scientific-live-${process.pid}`,
    });
    const deadline = Math.min(
      Date.now() + MAXIMUM_EXECUTION_WINDOW_MS,
      Date.parse(credential.expiration) - CREDENTIAL_STOP_MARGIN_SECONDS * 1_000,
    );
    const drain = { passes: 0, claimed_count: 0, completed_count: 0, terminal_count: 0 };
    while (Date.now() < deadline) {
      const outcome = await worker.runOnce(20);
      drain.passes += 1;
      drain.claimed_count += outcome.claimed_count;
      drain.completed_count += outcome.completed_count;
      drain.terminal_count += outcome.terminal_count;
      const attempts = await loadAttempts(prisma, attemptIds);
      const pendingCommands = await prisma.experimentFoundationProviderCommandV2.count({
        where: {
          executionAttemptId: { in: attemptIds },
          commandState: { in: ['pending', 'claimed'] },
        },
      });
      if (scientificEvidenceP5LiveSourceGateV1({
        attempts,
        expected_attempt_count: MAXIMUM_CREATE_JOB_CALLS,
        pending_command_count: pendingCommands,
      }) === 'complete') break;
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
    assertCredentialWindow(credential);

    const scientificService = new ExperimentFoundationV2ScientificValidationService({
      repository: scientificRepository,
      enabled: () => capabilityEnabled(CAPABILITY_KEYS[2]),
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
        throw new Error('Unexpected closure event during evidence collection.');
      } },
      workerId: `t137-scientific-relay-${process.pid}`,
    });
    const relayOutcome = await relay.drainUntilIdle({ max_passes: 8, limit_per_domain: 20 });
    assert.equal(relayOutcome.idle, true);
    assert.deepEqual(relayOutcome.failures, []);
    const evidenceUnits = await prisma.paperImplementationRunEvidenceUnitV2.findMany({
      where: {
        implementationProjectId: PROJECT_ID,
        validationCycleId: VALIDATION_CYCLE_ID,
        runId: RUN_ID,
      },
      orderBy: { id: 'asc' },
    });
    assert.equal(evidenceUnits.length, 1);

    const replay = await intake.start(RUN_ID, BUSINESS_KEY);
    assert.equal(replay.replayed, true);
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
    const replayRelay = await relay.drainUntilIdle({ max_passes: 2, limit_per_domain: 20 });
    assert.equal(replayRelay.idle, true);
    assert.equal(await countScopedUndeliveredOutboxes(prisma), 0);

    writeOutput({
      schema_version: 'T137ScientificDossierLiveResult@v1',
      status: 'real_provider_scientific_evidence_passed',
      target_fingerprint: target.fingerprint,
      run_id: RUN_ID,
      run_manifest_hash: RUN_MANIFEST_HASH,
      execution_policy: {
        maximum_paid_jobs: MAXIMUM_CREATE_JOB_CALLS,
        maximum_cost_cny: MAXIMUM_COST_CNY,
        credential_expires_at: credential.expiration,
        execution_window_ended_before_credential_expiry: true,
      },
      create_job_call_count_this_process: live.createJobCallCount(),
      credential_access_key_id_hash: sha256(credential.access_key_id),
      attempt_ids: attempts.map((attempt) => attempt.id),
      result_ids: generatedResults.map((result) => result.result_id),
      validation_report_id: validated.report.report_id,
      evidence_candidate_id: validated.evidence_candidate.candidate_id,
      run_evidence_unit_id: evidenceUnits[0]!.id,
      relay: relayOutcome,
      replay_new_row_count: 0,
      persistent_capability_change_count: 0,
      secret_output_count: 0,
    });
  } finally {
    disableCapabilities();
    clearCredentialMaterial(credential);
    await prisma.$disconnect();
  }
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
        `oss://${BUCKET_NAME}.oss-${REGION_ID}-internal.aliyuncs.com/output/`,
    },
  };
}

function buildLiveTransport(credential: ScientificEvidenceP5TemporaryCredentialV1): {
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
      assertCredentialWindow(credential);
      if (createJobCallCount >= MAXIMUM_CREATE_JOB_CALLS) {
        throw new Error('T137_CREATE_JOB_CEILING_EXCEEDED');
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

function readTemporaryCredential(): ScientificEvidenceP5TemporaryCredentialV1 {
  const required = [
    'ALIBABA_CLOUD_ACCESS_KEY_ID',
    'ALIBABA_CLOUD_ACCESS_KEY_SECRET',
    'ALIBABA_CLOUD_STS_EXPIRATION',
    'ALIBABA_CLOUD_STS_ASSUME_ROLE_REQUEST_ID',
  ];
  if (
    required.some((key) => !process.env[key]?.trim())
    || !(process.env.ALIBABA_CLOUD_SECURITY_TOKEN?.trim()
      || process.env.ALIBABA_CLOUD_SESSION_TOKEN?.trim())
  ) {
    throw new Error('T137_TEMPORARY_CREDENTIAL_MISSING');
  }
  const credential = readScientificEvidenceP5TemporaryCredentialEnvironment(process.env, {
    issued_duration_seconds: CREDENTIAL_DURATION_SECONDS,
  });
  try {
    assert.equal(process.env.ALIBABA_CLOUD_CONFIG_FILE, undefined);
    assertCredentialWindow(credential, MINIMUM_REMAINING_AT_START_SECONDS);
    return credential;
  } catch (error) {
    clearCredentialMaterial(credential);
    throw error;
  }
}

function assertCredentialWindow(
  credential: ScientificEvidenceP5TemporaryCredentialV1,
  minimumRemainingSeconds = CREDENTIAL_STOP_MARGIN_SECONDS,
): void {
  const remaining = Date.parse(credential.expiration) - Date.now();
  assert.ok(Number.isFinite(remaining));
  assert.ok(
    remaining >= minimumRemainingSeconds * 1_000,
    'T137_TEMPORARY_CREDENTIAL_WINDOW_TOO_SHORT',
  );
}

function hasCredentialMaterial(): boolean {
  return SCIENTIFIC_EVIDENCE_P5_CREDENTIAL_ENV_KEYS_V1.some(
    (key) => Boolean(process.env[key]?.trim()),
  );
}

function clearCredentialMaterial(
  credential: ScientificEvidenceP5TemporaryCredentialV1 | null,
): void {
  if (credential) clearScientificEvidenceP5TemporaryCredential(credential);
  for (const key of SCIENTIFIC_EVIDENCE_P5_CREDENTIAL_ENV_KEYS_V1) delete process.env[key];
}

function enableCapabilities(): void {
  assertCapabilitiesDisabled();
  for (const key of CAPABILITY_KEYS) process.env[key] = 'true';
}

function disableCapabilities(): void {
  for (const key of CAPABILITY_KEYS) delete process.env[key];
}

function capabilityEnabled(key: typeof CAPABILITY_KEYS[number]): boolean {
  return process.env[key]?.trim().toLowerCase() === 'true';
}

function assertCapabilitiesDisabled(): void {
  for (const key of CAPABILITY_KEYS) {
    const value = process.env[key];
    if (value !== undefined && !['false', '0', ''].includes(value.trim().toLowerCase())) {
      throw new Error(`${key} must be disabled before the T-137 live window.`);
    }
  }
}

async function loadAttempts(prisma: PrismaClient, ids: string[]) {
  return prisma.experimentFoundationExecutionAttemptV2.findMany({
    where: { id: { in: ids } },
    include: { collectionAttempt: { include: { provisionalOutputs: true } } },
    orderBy: { cellKey: 'asc' },
  });
}

async function readState(prisma: PrismaClient) {
  const [attempts, results, validationReports, candidates, evidenceUnits, undeliveredOutboxes] =
    await Promise.all([
      prisma.experimentFoundationExecutionAttemptV2.count({ where: { runId: RUN_ID } }),
      prisma.experimentFoundationExperimentResultV2.count({ where: { runId: RUN_ID } }),
      prisma.experimentFoundationScientificValidationReportV2.count({ where: { runId: RUN_ID } }),
      prisma.experimentFoundationEvidenceCandidateV2.count({ where: { runId: RUN_ID } }),
      prisma.paperImplementationRunEvidenceUnitV2.count({
        where: {
          implementationProjectId: PROJECT_ID,
          validationCycleId: VALIDATION_CYCLE_ID,
          runId: RUN_ID,
        },
      }),
      countScopedUndeliveredOutboxes(prisma),
    ]);
  return {
    execution_attempts: attempts,
    experiment_results: results,
    scientific_validation_reports: validationReports,
    evidence_candidates: candidates,
    run_evidence_units: evidenceUnits,
    undelivered_integration_outboxes: undeliveredOutboxes,
  };
}

function resolvePreflightStatus(
  state: Awaited<ReturnType<typeof readState>>,
  cycleClosed: boolean,
): 'ready_waiting_for_temporary_credentials'
  | 'real_provider_resume_required'
  | 'real_provider_scientific_evidence_passed'
  | 'scientific_evidence_consumed_by_closed_cycle' {
  const evidenceComplete = state.execution_attempts === MAXIMUM_CREATE_JOB_CALLS
    && state.experiment_results === MAXIMUM_CREATE_JOB_CALLS
    && state.scientific_validation_reports === 1
    && state.evidence_candidates === 1
    && state.run_evidence_units === 1
    && state.undelivered_integration_outboxes === 0;
  if (cycleClosed) {
    assert.ok(evidenceComplete, 'T137_CLOSED_CYCLE_SCIENTIFIC_EVIDENCE_INCOMPLETE');
    return 'scientific_evidence_consumed_by_closed_cycle';
  }
  if (evidenceComplete) return 'real_provider_scientific_evidence_passed';
  if (state.execution_attempts > 0) return 'real_provider_resume_required';
  return 'ready_waiting_for_temporary_credentials';
}

async function countScopedUndeliveredOutboxes(prisma: PrismaClient): Promise<number> {
  const where = {
    implementationProjectId: PROJECT_ID,
    validationCycleId: VALIDATION_CYCLE_ID,
    relayStatus: { in: ['pending', 'claimed'] },
  };
  const [ef, pi] = await Promise.all([
    prisma.experimentFoundationIntegrationOutboxV2.count({ where }),
    prisma.paperImplementationExperimentIntegrationOutboxV2.count({ where }),
  ]);
  return ef + pi;
}

function parseMode(args: string[]): RunnerMode {
  const modeIndex = args.indexOf('--mode');
  const mode = modeIndex >= 0 ? args[modeIndex + 1] : undefined;
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

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function writeOutput(output: unknown): void {
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}

main().catch((error: unknown) => {
  disableCapabilities();
  clearCredentialMaterial(null);
  process.stderr.write(`${JSON.stringify({
    schema_version: 'T137ScientificDossierLiveFailure@v1',
    status: 'failed',
    reason: error instanceof Error ? error.message : 'T137_LIVE_FAILED',
  })}\n`);
  process.exitCode = 1;
});
