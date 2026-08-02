import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { GetImageRequest } from '@alicloud/aiworkspace20210204';
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
// DEBUG-MODE: BEGIN dbg-20260729-142414-8438
import {
  observeExperimentFoundationM7L1CreateJobError,
  T132_CREATE_JOB_ERROR_DEBUG_RUN_ID,
} from '../src/services/experiment-foundation-m7-l1-create-job-error-observation.js';
// DEBUG-MODE: END dbg-20260729-142414-8438
import {
  ExperimentFoundationExecutionBundleV2Service,
} from '../src/services/experiment-foundation-execution-bundle-v2-service.js';
// DEBUG-MODE: BEGIN dbg-20260729-151747-2ddb
import {
  observeExperimentFoundationM7L1CreateJobThroughSdkOffline,
  T132_CREATE_JOB_WIRE_DEBUG_RUN_ID,
} from '../src/services/experiment-foundation-m7-l1-create-job-wire-observation.js';
// DEBUG-MODE: END dbg-20260729-151747-2ddb
import {
  ExperimentFoundationRealProviderCommandV2Worker,
} from '../src/services/experiment-foundation-real-provider-command-v2-worker.js';
import {
  ExperimentFoundationRealProviderIntakeV2Service,
} from '../src/services/experiment-foundation-real-provider-intake-v2-service.js';
// DEBUG-MODE: BEGIN dbg-20260729-151747-2ddb
import {
  ExperimentFoundationRealProviderPayloadV2Service,
} from '../src/services/experiment-foundation-real-provider-payload-v2-service.js';
// DEBUG-MODE: END dbg-20260729-151747-2ddb
import {
  assertExperimentFoundationLiveNamedLocalTarget,
  assertExperimentFoundationNamedLocalDatabaseUrl,
  changedExperimentFoundationNamedLocalTables,
  countExperimentFoundationNamedLocalTables,
  digestExperimentFoundationNamedLocalTableRowVersions,
  listExperimentFoundationNamedLocalApplicationTables,
} from './experiment-foundation-named-local-evidence.js';

type RunnerMode =
  | 'offline-preflight'
  | 'image-preflight'
  | 'sequence9-recover'
  | 'execute';

const require = createRequire(import.meta.url);
const AIWorkspaceClientConstructor = require('@alicloud/aiworkspace20210204').default as
  typeof import('@alicloud/aiworkspace20210204').default;
const PaiDlcClientConstructor = require('@alicloud/pai-dlc20201203').default as
  typeof import('@alicloud/pai-dlc20201203').default;

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const MANIFEST_PATH = path.join(
  REPO_ROOT,
  'workloads/ragperf-canary/manifests/execution-bundle-v2.json',
);
const CONTROLLER_POLICY_PATH = path.join(
  REPO_ROOT,
  'workloads/ragperf-canary/ram/controller-policy.json',
);
const TARGET = Object.freeze({
  database: 'postgres',
  schema: 'my_researcher_dev',
  host: '127.0.0.1',
  port: '5432',
  fingerprint: 'sha256:8851b255b079ad1f049dc1842c41cb3516d5a3ff0b69e21a30e8f2675409cca0',
});
interface LiveRunScope {
  revision_sequence: number;
  run_id: string;
  run_manifest_hash: string | null;
  business_idempotency_key: string;
}

const HISTORICAL_SEQUENCE9_RECOVERY_SCOPE: LiveRunScope = Object.freeze({
  revision_sequence: 8,
  run_id: 'ef_run_v2_t132_m7_l1_console_default_access_successor_v8_1',
  run_manifest_hash:
    'sha256:8e7cc561da119ab3383980247d04d58f01defcb016f6eb29a285208055aeab96',
  business_idempotency_key: 't132-m7-l1-live-p313-v8',
});
const DURABLE_TWO_CELL_SUCCESSOR_SCOPE: LiveRunScope = Object.freeze({
  revision_sequence: 9,
  run_id: 'ef_run_v2_t132_m7_l1_durable_two_cell_successor_v9_1',
  run_manifest_hash:
    'sha256:c74bea341813166132f42b6398356a23aaf4785dfdb8e77a75efad5597473cea',
  business_idempotency_key: 't132-m7-l1-durable-two-cell-live-p313-v9',
});
const BUNDLE_REVISION_ID =
  'ef_execution_bundle_revision_2c60e151719be2e109e4b2d3964aaa8c315e0b48';
const BUNDLE_REVISION_HASH =
  'sha256:458b0e58d93974e3a09b63247bac675d26deef5fdafb111a6eae66177a3b178e';
const VALIDATION_CYCLE_ID = 'validation_cycle_t132_m7_l1_p313_v1';
const LIVE_AUTHORIZATION_ENV = 'T132_M7_L1_LIVE_AUTHORIZATION';
const LIVE_AUTHORIZATION_VALUE: string | null = null;
const CONTROLLER_ROLE_ARN =
  'acs:ram::1183869713036194:role/pea-m7-canary-controller';
const CONTROLLER_POLICY_SHA256 =
  '6566a47ee9c07ce6a75c9aeedcbc721d299ae52e7620bbbf91e14564b04220d8';
const BUCKET_NAME = 'pea-m7-canary-6194-202607';
const REGION_ID = 'cn-shanghai';
const WORKSPACE_ID = '1450165';
const IMAGE_ID = 'image-liuxvj7p2qcnflha84';
const MAXIMUM_CREATE_JOB_CALLS = 2;
const MAXIMUM_WINDOW_COST_CNY = 50;
const MAXIMUM_RUNNING_MINUTES_PER_JOB = 30;
const MINIMUM_STS_REMAINING_MS = 55 * 60 * 1_000;
const RUNNER_DEADLINE_MS = 50 * 60 * 1_000;
const POLL_INTERVAL_MS = 5_000;
const PACK_B_TABLES = [
  'ExperimentFoundationProviderPayloadV2',
  'ExperimentFoundationExecutionAttemptV2',
  'ExperimentFoundationExecutionAttemptEventV2',
  'ExperimentFoundationProviderCommandV2',
  'ExperimentFoundationCollectionAttemptV2',
  'ExperimentFoundationProvisionalOutputV2',
] as const;
const CAPABILITY_KEYS = [
  'EXPERIMENT_FOUNDATION_V2_REAL_PROVIDER_INTAKE_ENABLED',
  'EXPERIMENT_FOUNDATION_V2_REAL_PROVIDER_CONTROL_DRAIN_ENABLED',
  'EXPERIMENT_FOUNDATION_V2_SCIENTIFIC_VALIDATION_ENABLED',
  'PAPER_IMPLEMENTATION_EXPERIMENT_V2_CYCLE_CLOSURE_ENABLED',
] as const;

interface AuthoringManifest {
  container_image: {
    image_ref: string;
    provider_managed_asset: {
      asset_id: string;
      region_id: string;
      modified_at: string;
      size_bytes: number;
      accessibility: string;
      source_type: string;
    };
  };
  offline_preview_profile: ExperimentFoundationAliyunRealProviderProfileV2;
  offline_preview_cells: Array<{
    ordinal: number;
    cell_key: string;
    cpu_cores: number;
    memory_mb: number;
    timeout_seconds: number;
  }>;
}

interface TemporaryCredential {
  access_key_id: string;
  access_key_secret: string;
  security_token: string;
  expiration: string;
}

async function main(): Promise<void> {
  const mode = parseMode(process.argv.slice(2));
  assertCapabilitiesRemainDisabled();
  const liveScope = mode === 'sequence9-recover'
    ? HISTORICAL_SEQUENCE9_RECOVERY_SCOPE
    : DURABLE_TWO_CELL_SUCCESSOR_SCOPE;
  const runManifestHash = requirePinnedRunManifestHash(liveScope);
  const databaseUrl = requireEnvironment('DATABASE_URL');
  assertExperimentFoundationNamedLocalDatabaseUrl(
    databaseUrl,
    TARGET,
    'T132_M7_L1_LIVE_TARGET_MISMATCH',
  );
  const [manifest, policyBytes] = await Promise.all([
    readManifest(),
    fs.readFile(CONTROLLER_POLICY_PATH),
  ]);
  assert.equal(sha256(policyBytes), CONTROLLER_POLICY_SHA256);

  const prisma = new PrismaClient();
  await prisma.$connect();
  try {
    const target = await assertExperimentFoundationLiveNamedLocalTarget(prisma, TARGET);
    const dependencies = buildDependencies(prisma, manifest.offline_preview_profile);
    const prerequisite = await dependencies.executionRepository
      .resolveRealProviderRunPrerequisite(liveScope.run_id);
    assert.ok(prerequisite, 'Exact M7-L1 executable Run prerequisite is missing.');
    assert.equal(prerequisite.run.run_manifest_hash, runManifestHash);
    assert.equal(prerequisite.validation_cycle_id, VALIDATION_CYCLE_ID);
    assert.equal(prerequisite.cells.length, MAXIMUM_CREATE_JOB_CALLS);
    assert.deepEqual(
      prerequisite.cells.map(({ run_cell: cell, task_spec: task }) => ({
        ordinal: cell.ordinal,
        cell_key: cell.cell_key,
        cpu_cores: task.resource_snapshot.cpu_cores,
        memory_mb: task.resource_snapshot.memory_mb,
        timeout_seconds: task.retry_snapshot.timeout_seconds,
        max_attempts: task.retry_snapshot.max_attempts,
      })),
      manifest.offline_preview_cells.map((cell) => ({
        ...cell,
        max_attempts: 1,
      })),
    );
    assert.ok(prerequisite.cells.every(
      ({ task_spec: task }) => (
        task.execution_bundle.execution_bundle_revision_id === BUNDLE_REVISION_ID
        && task.execution_bundle.content_hash === BUNDLE_REVISION_HASH
        && Math.ceil(task.retry_snapshot.timeout_seconds / 60)
          === MAXIMUM_RUNNING_MINUTES_PER_JOB
      ),
    ));
    assert.equal(
      await dependencies.cycleClosureRepository.isCycleClosed(VALIDATION_CYCLE_ID),
      false,
    );
    const frozenBundle = await dependencies.bundleService.resolveActiveReadyExact({
      execution_bundle_revision_id: BUNDLE_REVISION_ID,
      content_hash: BUNDLE_REVISION_HASH,
    });
    assert.equal(
      frozenBundle.revision.revision_content.container_image.image_ref,
      manifest.container_image.image_ref,
    );

    const existingAttempts = await dependencies.executionRepository
      .listRunAttempts(liveScope.run_id);
    assert.ok(existingAttempts.length === 0 || existingAttempts.length === 2);
    assert.ok(existingAttempts.every((attempt) => (
      attempt.workflow_business_key === liveScope.business_idempotency_key
      && attempt.execution_mode === 'real_provider'
      && attempt.provenance === 'real_provider'
    )));

    if (mode === 'offline-preflight') {
      // DEBUG-MODE: BEGIN dbg-20260729-151747-2ddb
      if (existingAttempts.length === MAXIMUM_CREATE_JOB_CALLS) {
        const payloadService = new ExperimentFoundationRealProviderPayloadV2Service();
        for (const { run_cell: runCell, task_spec: taskSpec } of prerequisite.cells) {
          const attempt = existingAttempts.find(
            (candidate) => candidate.run_cell_id === runCell.run_cell_id,
          );
          assert.ok(attempt, `Missing exact attempt for ordinal ${runCell.ordinal}.`);
          const materialized = payloadService.materialize({
            run: prerequisite.run,
            run_cell: runCell,
            task_spec: taskSpec,
            execution_bundle_revision: frozenBundle.revision,
            provider_idempotency_key: attempt.provider_idempotency_key,
          }, manifest.offline_preview_profile);
          const observation =
            await observeExperimentFoundationM7L1CreateJobThroughSdkOffline(
              materialized.create_job_request,
            );
          console.error(JSON.stringify({
            run_id: T132_CREATE_JOB_WIRE_DEBUG_RUN_ID,
            marker: `[DBG:${T132_CREATE_JOB_WIRE_DEBUG_RUN_ID}]`,
            event: 'pai_dlc.create_job.offline_final_wire_observed',
            sequence: liveScope.revision_sequence,
            cell_ordinal: runCell.ordinal,
            network_blocked_before_send: true,
            ...observation,
          }));
        }
      }
      // DEBUG-MODE: END dbg-20260729-151747-2ddb
      console.log(JSON.stringify({
        schema_version: 't132-m7-l1-live-window-offline-preflight@v1',
        status: 'passed',
        target_fingerprint: target.fingerprint,
        run_id: liveScope.run_id,
        run_manifest_hash: runManifestHash,
        execution_bundle_revision_id: BUNDLE_REVISION_ID,
        execution_bundle_revision_hash: BUNDLE_REVISION_HASH,
        job_ceiling: MAXIMUM_CREATE_JOB_CALLS,
        monetary_ceiling_cny: MAXIMUM_WINDOW_COST_CNY,
        per_job: {
          ecs_spec: 'ecs.g6.large',
          cpu_cores: 2,
          memory_mb: 8192,
          maximum_running_minutes: MAXIMUM_RUNNING_MINUTES_PER_JOB,
        },
        controller_policy_sha256: CONTROLLER_POLICY_SHA256,
        existing_attempt_count: existingAttempts.length,
        cloud_call_count: 0,
        database_write_count: 0,
      }));
      return;
    }

    if (mode === 'execute') requireLiveAuthorization();
    const credential = readTemporaryCredential(
      mode === 'sequence9-recover' ? 5 * 60 * 1_000 : MINIMUM_STS_REMAINING_MS,
    );
    if (mode === 'sequence9-recover') {
      assert.equal(existingAttempts.length, MAXIMUM_CREATE_JOB_CALLS);
      const first = prerequisite.cells[0];
      assert.ok(first, 'Sequence-9 recovery requires the first exact sequence-8 cell.');
      const attempt = existingAttempts.find(
        (candidate) => candidate.run_cell_id === first.run_cell.run_cell_id,
      );
      assert.ok(attempt, 'Sequence-9 recovery requires the prior exact first-cell attempt.');
      const materialized = new ExperimentFoundationRealProviderPayloadV2Service().materialize({
        run: prerequisite.run,
        run_cell: first.run_cell,
        task_spec: first.task_spec,
        execution_bundle_revision: frozenBundle.revision,
        provider_idempotency_key: attempt.provider_idempotency_key,
      }, manifest.offline_preview_profile);
      const live = buildLiveTransport(credential, 0);
      const input = {
        materialized,
        task_spec: first.task_spec,
        provider_idempotency_key: attempt.provider_idempotency_key,
        create_permitted: false,
        external_job_ref: null,
      };
      const recovered = await live.transport.submit(input);
      assert.equal(live.createJobCallCount(), 0);
      const externalJobRef = recovered.external_job_ref;
      assert.ok(externalJobRef, 'Sequence-9 recovery returned no external Job reference.');
      const synced = await live.transport.sync({
        ...input,
        external_job_ref: externalJobRef,
      });
      assert.equal(synced.normalized_state, 'succeeded');
      const collected = await live.transport.collect({
        ...input,
        external_job_ref: externalJobRef,
      });
      console.log(JSON.stringify({
        schema_version: 't132-m7-l1-sequence9-recovery-result@v1',
        status: 'real_provider_probe_recovered_and_collected',
        target_fingerprint: target.fingerprint,
        run_id: liveScope.run_id,
        cell_ordinal: first.run_cell.ordinal,
        job_id: externalJobRef.job_id,
        provider_status: synced.provider_status,
        normalized_state: synced.normalized_state,
        result_manifest_hash: collected.result_manifest_hash,
        create_job_call_count: live.createJobCallCount(),
        database_write_count: 0,
        scientific_evidence_write_count: 0,
        capability_persistence_count: 0,
        secret_output_count: 0,
      }));
      return;
    }
    const imageRequestHash = await freshImagePreflight(manifest, credential);
    if (mode === 'image-preflight') {
      console.log(JSON.stringify({
        schema_version: 't132-m7-l1-live-window-image-preflight@v1',
        status: 'passed',
        target_fingerprint: target.fingerprint,
        run_id: liveScope.run_id,
        execution_bundle_revision_id: BUNDLE_REVISION_ID,
        execution_bundle_revision_hash: BUNDLE_REVISION_HASH,
        image_request_hash: imageRequestHash,
        cloud_call_count: 1,
        provider_write_count: 0,
        create_job_call_count: 0,
        database_write_count: 0,
      }));
      return;
    }
    const applicationTables =
      await listExperimentFoundationNamedLocalApplicationTables(prisma, [...PACK_B_TABLES]);
    const protectedTables = applicationTables.filter(
      (table) => !PACK_B_TABLES.includes(table.name as typeof PACK_B_TABLES[number]),
    );
    const [protectedBefore, packBBefore] = await Promise.all([
      digestExperimentFoundationNamedLocalTableRowVersions(prisma, protectedTables),
      countExperimentFoundationNamedLocalTables(prisma, [...PACK_B_TABLES]),
    ]);

    const live = buildLiveTransport(credential);
    const intake = new ExperimentFoundationRealProviderIntakeV2Service({
      repository: dependencies.executionRepository,
      cycleClosureLookup: dependencies.cycleClosureRepository,
      executionBundleResolver: dependencies.bundleService,
      profileResolver: async () => structuredClone(manifest.offline_preview_profile),
      intakeEnabled: () => true,
    });
    const started = await intake.start(
      liveScope.run_id,
      liveScope.business_idempotency_key,
    );
    assert.equal(started.attempts.length, MAXIMUM_CREATE_JOB_CALLS);
    const attemptIds = started.attempts.map((attempt) => attempt.id);
    const worker = new ExperimentFoundationRealProviderCommandV2Worker({
      repository: dependencies.executionRepository,
      transport: live.transport,
      executionBundleResolver: dependencies.bundleService,
      profileResolver: async () => structuredClone(manifest.offline_preview_profile),
      controlDrainEnabled: () => true,
      leaseOwner: `t132-m7-l1-live-${process.pid}`,
    });
    const deadline = Date.now() + RUNNER_DEADLINE_MS;
    const drain = {
      passes: 0,
      claimed_count: 0,
      completed_count: 0,
      released_count: 0,
      terminal_count: 0,
    };
    while (Date.now() < deadline) {
      const outcome = await worker.runOnce(20);
      drain.passes += 1;
      drain.claimed_count += outcome.claimed_count;
      drain.completed_count += outcome.completed_count;
      drain.released_count += outcome.released_count;
      drain.terminal_count += outcome.terminal_count;
      const attempts = await prisma.experimentFoundationExecutionAttemptV2.findMany({
        where: { id: { in: attemptIds } },
        include: {
          collectionAttempt: {
            include: { provisionalOutputs: true },
          },
        },
        orderBy: { cellKey: 'asc' },
      });
      const allTerminal = attempts.length === MAXIMUM_CREATE_JOB_CALLS
        && attempts.every((attempt) => (
          ['succeeded', 'failed', 'cancelled'].includes(attempt.lifecycleState)
        ));
      const allCollected = attempts.every((attempt) => (
        attempt.lifecycleState !== 'succeeded'
        || (
          attempt.collectionAttempt?.collectionState === 'collected'
          && attempt.collectionAttempt.provisionalOutputs.length === 1
        )
      ));
      const pendingCommands = await prisma.experimentFoundationProviderCommandV2.count({
        where: {
          executionAttemptId: { in: attemptIds },
          commandState: { in: ['pending', 'claimed'] },
        },
      });
      if (allTerminal && allCollected && pendingCommands === 0) break;
      await delay(POLL_INTERVAL_MS);
    }

    const attempts = await prisma.experimentFoundationExecutionAttemptV2.findMany({
      where: { id: { in: attemptIds } },
      include: {
        collectionAttempt: {
          include: { provisionalOutputs: true },
        },
      },
      orderBy: { cellKey: 'asc' },
    });
    assert.equal(attempts.length, MAXIMUM_CREATE_JOB_CALLS);
    assert.ok(attempts.every((attempt) => (
      attempt.lifecycleState === 'succeeded'
      && attempt.terminalReasonCode === 'real_provider_succeeded'
      && attempt.collectionAttempt?.collectionState === 'collected'
      && attempt.collectionAttempt.provisionalOutputs.length === 1
      && attempt.collectionAttempt.provisionalOutputs[0]?.outputClass === 'diagnostic_only'
    )));
    assert.ok(live.createJobCallCount() <= MAXIMUM_CREATE_JOB_CALLS);
    assert.equal(new Set(
      attempts.map((attempt) => JSON.stringify(attempt.externalJobRefJson)),
    ).size, MAXIMUM_CREATE_JOB_CALLS);

    const packBAfter = await countExperimentFoundationNamedLocalTables(
      prisma,
      [...PACK_B_TABLES],
    );
    const protectedAfter =
      await digestExperimentFoundationNamedLocalTableRowVersions(prisma, protectedTables);
    assert.deepEqual(
      changedExperimentFoundationNamedLocalTables(protectedBefore, protectedAfter),
      [],
    );
    const replayCountsBefore = structuredClone(packBAfter);
    const replay = await intake.start(
      liveScope.run_id,
      liveScope.business_idempotency_key,
    );
    assert.equal(replay.replayed, true);
    assert.deepEqual(
      await countExperimentFoundationNamedLocalTables(prisma, [...PACK_B_TABLES]),
      replayCountsBefore,
    );
    assertCapabilitiesRemainDisabled();

    console.log(JSON.stringify({
      schema_version: 't132-m7-l1-live-window-result@v1',
      status: 'real_provider_canary_passed',
      target_fingerprint: target.fingerprint,
      run_id: liveScope.run_id,
      run_manifest_hash: runManifestHash,
      execution_bundle_revision_id: BUNDLE_REVISION_ID,
      execution_bundle_revision_hash: BUNDLE_REVISION_HASH,
      image_preflight_request_hash: imageRequestHash,
      job_ceiling: MAXIMUM_CREATE_JOB_CALLS,
      create_job_call_count: live.createJobCallCount(),
      distinct_terminal_job_count: MAXIMUM_CREATE_JOB_CALLS,
      monetary_ceiling_cny: MAXIMUM_WINDOW_COST_CNY,
      per_job_maximum_running_minutes: MAXIMUM_RUNNING_MINUTES_PER_JOB,
      drain,
      pack_b_row_deltas: rowDeltas(packBBefore, packBAfter),
      replay_new_row_count: 0,
      protected_table_change_count: 0,
      scientific_evidence_write_count: 0,
      evidence_eligibility: false,
      capability_persistence_count: 0,
      secret_output_count: 0,
    }));
  } finally {
    await prisma.$disconnect();
  }
}

function buildDependencies(
  prisma: PrismaClient,
  profile: ExperimentFoundationAliyunRealProviderProfileV2,
) {
  const executionRepository = new PrismaExperimentFoundationExecutionV2Repository(prisma);
  const cycleClosureRepository =
    new PrismaPaperImplementationValidationCycleClosureV2Repository(prisma);
  const bundleService = new ExperimentFoundationExecutionBundleV2Service({
    repository: new PrismaExperimentFoundationExecutionBundleV2Repository(prisma),
  });
  return {
    executionRepository,
    cycleClosureRepository,
    bundleService,
    profileResolver: async () => structuredClone(profile),
  };
}

function buildLiveTransport(
  credential: TemporaryCredential,
  maximumCreateJobCalls = MAXIMUM_CREATE_JOB_CALLS,
): {
  transport: ExperimentFoundationAliyunRealProviderTransportV2;
  createJobCallCount: () => number;
} {
  const dlcClient = new PaiDlcClientConstructor(new $OpenApiUtil.Config({
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
      if (createJobCallCount >= maximumCreateJobCalls) {
        throw new Error('T132_M7_L1_CREATE_JOB_CEILING_EXCEEDED');
      }
      createJobCallCount += 1;
      try {
        return await dlcClient.createJobWithOptions(request, headers, runtime);
      } catch (error) {
        // DEBUG-MODE: BEGIN dbg-20260729-142414-8438
        console.error(JSON.stringify({
          run_id: T132_CREATE_JOB_ERROR_DEBUG_RUN_ID,
          marker: `[DBG:${T132_CREATE_JOB_ERROR_DEBUG_RUN_ID}]`,
          event: 'pai_dlc.create_job.error',
          operation: 'CreateJob',
          ...observeExperimentFoundationM7L1CreateJobError(error),
        }));
        // DEBUG-MODE: END dbg-20260729-142414-8438
        throw error;
      }
    },
    getJobWithOptions: dlcClient.getJobWithOptions.bind(dlcClient),
    listJobsWithOptions: dlcClient.listJobsWithOptions.bind(dlcClient),
    stopJobWithOptions: dlcClient.stopJobWithOptions.bind(dlcClient),
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

async function freshImagePreflight(
  manifest: AuthoringManifest,
  credential: TemporaryCredential,
): Promise<string> {
  const client = new AIWorkspaceClientConstructor(new $OpenApiUtil.Config({
    accessKeyId: credential.access_key_id,
    accessKeySecret: credential.access_key_secret,
    securityToken: credential.security_token,
    endpoint: `aiworkspace.${REGION_ID}.aliyuncs.com`,
    regionId: REGION_ID,
    protocol: 'https',
    connectTimeout: 10_000,
    readTimeout: 15_000,
  }));
  const response = await client.getImage(IMAGE_ID, new GetImageRequest({ verbose: false }));
  const body = response.body;
  assert.ok(body?.requestId);
  assert.equal(body.imageUri, manifest.container_image.image_ref);
  assert.equal(body.gmtModifiedTime, manifest.container_image.provider_managed_asset.modified_at);
  assert.equal(body.size, manifest.container_image.provider_managed_asset.size_bytes);
  assert.equal(body.accessibility, manifest.container_image.provider_managed_asset.accessibility);
  assert.equal(body.sourceType, manifest.container_image.provider_managed_asset.source_type);
  return sha256(Buffer.from(JSON.stringify({
    operation: 'GetImage',
    image_id: IMAGE_ID,
    request_id: body.requestId,
    image_uri: body.imageUri,
    workspace_id: body.workspaceId ?? null,
    gmt_modified_time: body.gmtModifiedTime,
    size: body.size,
    accessibility: body.accessibility,
    source_type: body.sourceType,
  }), 'utf8'));
}

function readTemporaryCredential(minimumRemainingMs: number): TemporaryCredential {
  const credential = {
    access_key_id: requireEnvironment('ALIBABA_CLOUD_ACCESS_KEY_ID'),
    access_key_secret: requireEnvironment('ALIBABA_CLOUD_ACCESS_KEY_SECRET'),
    security_token:
      process.env.ALIBABA_CLOUD_SECURITY_TOKEN
      ?? requireEnvironment('ALIBABA_CLOUD_SESSION_TOKEN'),
    expiration: requireEnvironment('ALIBABA_CLOUD_STS_EXPIRATION'),
  };
  if (!credential.access_key_id.startsWith('STS.')) {
    throw new Error('M7-L1 requires a temporary STS AccessKey ID.');
  }
  const expirationMs = Date.parse(credential.expiration);
  if (
    !Number.isFinite(expirationMs)
    || expirationMs - Date.now() < minimumRemainingMs
  ) {
    throw new Error(
      `M7-L1 STS must have at least ${Math.ceil(minimumRemainingMs / 60_000)} minutes remaining.`,
    );
  }
  assert.equal(requireEnvironment('T132_M7_L1_CONTROLLER_ROLE_ARN'), CONTROLLER_ROLE_ARN);
  assert.equal(
    requireEnvironment('T132_M7_L1_CONTROLLER_POLICY_SHA256'),
    CONTROLLER_POLICY_SHA256,
  );
  return credential;
}

async function readManifest(): Promise<AuthoringManifest> {
  const parsed = JSON.parse(await fs.readFile(MANIFEST_PATH, 'utf8')) as AuthoringManifest;
  assert.equal(parsed.container_image.provider_managed_asset.asset_id, IMAGE_ID);
  assert.equal(parsed.container_image.provider_managed_asset.region_id, REGION_ID);
  assert.equal(parsed.offline_preview_profile.region_id, REGION_ID);
  assert.equal(parsed.offline_preview_profile.workspace_id, WORKSPACE_ID);
  assert.equal(
    parsed.offline_preview_profile.workload_binding.output_uri_prefix,
    `oss://${BUCKET_NAME}.oss-${REGION_ID}-internal.aliyuncs.com/output/`,
  );
  assert.deepEqual(
    parsed.offline_preview_cells.map(({ cpu_cores, memory_mb, timeout_seconds }) => ({
      cpu_cores,
      memory_mb,
      timeout_seconds,
    })),
    [
      { cpu_cores: 2, memory_mb: 8192, timeout_seconds: 1800 },
      { cpu_cores: 2, memory_mb: 8192, timeout_seconds: 1800 },
    ],
  );
  return parsed;
}

function parseMode(args: string[]): RunnerMode {
  const modeIndex = args.indexOf('--mode');
  const mode = modeIndex >= 0 ? args[modeIndex + 1] : undefined;
  if (
    mode === 'offline-preflight'
    || mode === 'image-preflight'
    || mode === 'sequence9-recover'
    || mode === 'execute'
  ) {
    return mode;
  }
  throw new Error(
    'Usage: --mode offline-preflight|image-preflight|sequence9-recover|execute',
  );
}

function requireLiveAuthorization(): void {
  if (
    LIVE_AUTHORIZATION_VALUE === null
    || process.env[LIVE_AUTHORIZATION_ENV] !== LIVE_AUTHORIZATION_VALUE
  ) {
    throw new Error(
      `No active two-job/¥50 authorization is recorded for ${LIVE_AUTHORIZATION_ENV}.`,
    );
  }
}

function requirePinnedRunManifestHash(scope: LiveRunScope): string {
  if (scope.run_manifest_hash === null) {
    throw new Error(
      `Run manifest hash is not pinned for immutable successor ${scope.run_id}.`,
    );
  }
  return scope.run_manifest_hash;
}

function assertCapabilitiesRemainDisabled(): void {
  for (const key of CAPABILITY_KEYS) {
    const value = process.env[key];
    if (value !== undefined && !['false', '0', ''].includes(value.trim().toLowerCase())) {
      throw new Error(`${key} must remain disabled; the runner uses process-local dependencies.`);
    }
  }
}

function requireEnvironment(key: string): string {
  const value = process.env[key]?.trim();
  if (!value) throw new Error(`${key} is required.`);
  return value;
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
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

await main();
