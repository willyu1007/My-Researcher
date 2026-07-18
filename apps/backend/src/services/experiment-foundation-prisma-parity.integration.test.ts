import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { PrismaClient } from '@prisma/client';
import type {
  ExperimentFoundationExternalTrainingJobStatus,
  ExperimentFoundationRecordKind,
  ExperimentFoundationRef,
  ResultArtifact,
  ResultLogRef,
  ResultMetricValue,
  TrainingTaskSpec,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-contracts';
import { AppError } from '../errors/app-error.js';
import { PrismaExperimentFoundationExecutionRepository } from '../repositories/prisma/prisma-experiment-foundation-execution-repository.js';
import { PrismaExperimentFoundationRepository } from '../repositories/prisma/prisma-experiment-foundation-repository.js';
import {
  type AdapterCollectResult,
  type AdapterStatusResult,
  type AdapterSubmitResult,
  hashPayload,
  type TrainingPlatformAdapter,
} from './experiment-foundation-execution-adapters.js';
import { ExperimentFoundationExecutionService } from './experiment-foundation-execution-service.js';
import {
  completenessCheckFixture,
  createExperimentFoundationMinimalGraph,
  datasetAssetCandidateFixture,
  experimentFoundationRef,
  experimentFoundationScenarioIds,
  promotionRequestFixture,
  promotionResultFixture,
  type ExperimentFoundationScenarioRecord,
} from './experiment-foundation-scenario-fixtures.js';
import { ExperimentFoundationService } from './experiment-foundation-service.js';
import { stableStringify } from './literature-content-processing-utils.js';

const RUN_PRISMA_PARITY = process.env.EXPERIMENT_FOUNDATION_PRISMA_PARITY === '1';
const TEST_TIMEOUT_MS = 120_000;
const MIGRATION_TIMEOUT_MS = 60_000;
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

test(
  'experiment-foundation Prisma parity covers readiness, promotion, and execution recovery',
  { skip: RUN_PRISMA_PARITY ? false : 'set EXPERIMENT_FOUNDATION_PRISMA_PARITY=1 with DATABASE_URL to run', timeout: TEST_TIMEOUT_MS },
  async () => {
    assert.ok(process.env.DATABASE_URL, 'DATABASE_URL is required for experiment-foundation Prisma parity.');
    assertPostgresDatabaseUrl(process.env.DATABASE_URL);

    const outputRoot = await mkdtemp(path.join(tmpdir(), 'experiment-foundation-prisma-parity-'));
    let context: Awaited<ReturnType<typeof createDisposablePrismaContext>> | null = null;
    let primaryError: unknown = null;
    try {
      context = await createDisposablePrismaContext(process.env.DATABASE_URL, 't106_prisma_parity');
      const registry = new ExperimentFoundationService(
        new PrismaExperimentFoundationRepository(context.prisma),
      );
      const execution = new ExperimentFoundationExecutionService(
        new PrismaExperimentFoundationExecutionRepository(context.prisma),
        registry,
        { adapters: { local_script: new DeterministicLocalScriptAdapter() } },
      );

      const readinessGraph = createExperimentFoundationMinimalGraph({
        outputRoot,
        scenarioId: 'prisma_readiness',
        datasetMirrorOverrides: { freshness_status: 'stale' },
      });
      await seedGraphRecords(registry, readinessGraph.records);
      await assertRejectsAppError(
        () => registry.createRecord({
          record_kind: 'dataset_asset',
          payload: readinessGraph.datasetAsset as unknown as Record<string, unknown>,
        }),
        409,
        'VERSION_CONFLICT',
      );
      const blockedReadiness = await registry.checkReadiness({
        target_ref: experimentFoundationRef('dataset_version', readinessGraph.datasetVersion.dataset_version_id),
        source_refs: [experimentFoundationRef('test_case', 'prisma_parity_readiness_blocked')],
      });
      assert.equal(blockedReadiness.readiness_status, 'blocked');
      assert.ok(blockedReadiness.blockers.some((blocker) => blocker.includes('stale')));
      const persistedBlocked = await registry.getLatestReadinessReport(
        'dataset_version',
        readinessGraph.datasetVersion.dataset_version_id,
      );
      assert.equal(persistedBlocked.readiness_report_id, blockedReadiness.readiness_report_id);

      await registry.upsertRecord('dataset_mirror', readinessGraph.datasetMirror.dataset_mirror_id, {
        record_kind: 'dataset_mirror',
        payload: {
          ...readinessGraph.datasetMirror,
          freshness_status: 'fresh',
        },
      });
      const recoveredReadiness = await registry.checkReadiness({
        target_ref: experimentFoundationRef('dataset_version', readinessGraph.datasetVersion.dataset_version_id),
        source_refs: [experimentFoundationRef('test_case', 'prisma_parity_readiness_recovered')],
      });
      assert.equal(recoveredReadiness.readiness_status, 'passed');

      const promotionIds = experimentFoundationScenarioIds('prisma_promotion');
      const promotionGraph = createExperimentFoundationMinimalGraph({
        outputRoot,
        scenarioId: 'prisma_promotion',
      });
      await seedPromotionCanonicalRecords(registry, promotionGraph.records);
      await registry.createRecord({
        record_kind: 'dataset_asset_candidate',
        payload: {
          ...datasetAssetCandidateFixture({
            completeness_check: completenessCheckFixture({
              completeness_status: 'incomplete',
              missing_fields: ['policy_check'],
            }, promotionIds),
          }, promotionIds),
        },
      });
      await assertRejectsAppError(
        () => registry.decidePromotion(promotionIds.datasetAssetCandidateId, {
          promotion_request: promotionRequestFixture({}, promotionIds),
          promotion_result: promotionResultFixture({}, promotionIds),
        }),
        422,
        'GATE_CONSTRAINT_FAILED',
      );
      const failedPromotionRequests = await registry.listRecords({ record_kind: 'asset_promotion_request' });
      assert.equal(failedPromotionRequests.records.some((record) => record.record_id === promotionIds.promotionRequestId), false);
      const candidateAfterFailure = await registry.getRecord(
        'dataset_asset_candidate',
        promotionIds.datasetAssetCandidateId,
      );
      assert.equal(candidateAfterFailure.status, 'ready_for_promotion');

      await registry.upsertRecord('dataset_asset_candidate', promotionIds.datasetAssetCandidateId, {
        record_kind: 'dataset_asset_candidate',
        payload: datasetAssetCandidateFixture({}, promotionIds) as unknown as Record<string, unknown>,
      });
      const promoted = await registry.decidePromotion(promotionIds.datasetAssetCandidateId, {
        promotion_request: promotionRequestFixture({}, promotionIds),
        promotion_result: promotionResultFixture({}, promotionIds),
      });
      assert.equal(promoted.candidate_record.status, 'promoted');
      assert.equal(
        (await registry.getRecord('asset_promotion_result', promotionIds.promotionResultId)).status,
        'promoted',
      );

      const successGraph = createExperimentFoundationMinimalGraph({
        outputRoot,
        scenarioId: 'prisma_success_evidence',
      });
      await seedGraphRecords(registry, successGraph.records);
      await registry.checkReadiness({
        target_ref: experimentFoundationRef('training_task_spec', successGraph.trainingTaskSpec.training_task_spec_id),
        source_refs: [experimentFoundationRef('test_case', 'prisma_parity_success_readiness')],
      });
      const successSubmitted = await execution.submitJob(successGraph.submitRequest);
      await assertRejectsAppError(
        () => execution.collectJob(successSubmitted.external_job.external_job_id, {
          accept_partial: false,
          source_refs: [experimentFoundationRef('test_case', 'prisma_parity_success_collect')],
        }),
        409,
        'GATE_CONSTRAINT_FAILED',
        'LEGACY_SCIENTIFIC_WRITER_CLOSED',
      );
      const successAfterClosedCollect = await execution.getJob(
        successSubmitted.external_job.external_job_id,
      );
      assert.deepEqual(successAfterClosedCollect.external_job.result_refs, []);
      assert.deepEqual(successAfterClosedCollect.external_job.partial_result_refs, []);

      const submitGraph = createExperimentFoundationMinimalGraph({
        outputRoot,
        scenarioId: 'prisma_submit_cancel',
      });
      await seedGraphRecords(registry, submitGraph.records);
      await registry.checkReadiness({
        target_ref: experimentFoundationRef('training_task_spec', submitGraph.trainingTaskSpec.training_task_spec_id),
        source_refs: [experimentFoundationRef('test_case', 'prisma_parity_submit_readiness')],
      });
      await assertRejectsAppError(
        () => execution.submitJob({
          ...submitGraph.submitRequest,
          materialization_result_hash: 'sha256:prisma-parity-mismatch',
        }),
        422,
        'GATE_CONSTRAINT_FAILED',
      );
      assert.equal(
        (await execution.listJobs({ training_task_spec_id: submitGraph.trainingTaskSpec.training_task_spec_id }))
          .jobs.length,
        0,
      );

      const submitted = await execution.submitJob(submitGraph.submitRequest);
      assert.equal(submitted.external_job.job_status, 'running');
      const repeatedSubmit = await execution.submitJob(submitGraph.submitRequest);
      assert.equal(repeatedSubmit.external_job.external_job_id, submitted.external_job.external_job_id);
      await assertRejectsAppError(
        () => execution.submitJob({
          ...submitGraph.submitRequest,
          materialization_result_hash: 'sha256:prisma-parity-idempotency-conflict',
        }),
        409,
        'VERSION_CONFLICT',
      );
      const cancelled = await execution.cancelJob(submitted.external_job.external_job_id, {
        reason: 'T-106 Prisma parity cancellation',
        idempotency_key: 'prisma-parity-cancel',
        requested_by_ref: experimentFoundationRef('user', 'capability_tester'),
        source_refs: [experimentFoundationRef('test_case', 'prisma_parity_cancel')],
      });
      assert.equal(cancelled.external_job.job_status, 'cancelled');
      const repeatedCancel = await execution.cancelJob(submitted.external_job.external_job_id, {
        reason: 'T-106 Prisma parity cancellation',
        idempotency_key: 'prisma-parity-cancel',
        requested_by_ref: experimentFoundationRef('user', 'capability_tester'),
        source_refs: [experimentFoundationRef('test_case', 'prisma_parity_cancel')],
      });
      assert.equal(
        repeatedCancel.external_job.stage_event_refs.length,
        cancelled.external_job.stage_event_refs.length,
      );
      const syncedCancelled = await execution.syncJob(submitted.external_job.external_job_id, {
        source_refs: [experimentFoundationRef('test_case', 'prisma_parity_sync_cancelled')],
      });
      assert.equal(syncedCancelled.external_job.job_status, 'cancelled');

      const cancelledList = await execution.listJobs({ status: 'cancelled' });
      assert.ok(
        cancelledList.jobs.some((job) => job.external_job_id === submitted.external_job.external_job_id),
      );
      await assertRejectsAppError(
        () => execution.collectJob(submitted.external_job.external_job_id, {
          accept_partial: false,
          source_refs: [experimentFoundationRef('test_case', 'prisma_parity_collect_cancelled')],
        }),
        409,
        'GATE_CONSTRAINT_FAILED',
        'LEGACY_SCIENTIFIC_WRITER_CLOSED',
      );
      const cancelledAfterClosedCollect = await execution.getJob(
        submitted.external_job.external_job_id,
      );
      assert.equal(cancelledAfterClosedCollect.external_job.job_status, 'cancelled');
      assert.deepEqual(cancelledAfterClosedCollect.external_job.result_refs, []);
      assert.deepEqual(cancelledAfterClosedCollect.external_job.partial_result_refs, []);
    } catch (error) {
      primaryError = error;
      throw error;
    } finally {
      await cleanupPrismaParityResources(context, outputRoot, primaryError);
    }
  },
);

class DeterministicLocalScriptAdapter implements TrainingPlatformAdapter {
  readonly adapterKind = 'local_script' as const;
  private readonly statuses = new Map<string, ExperimentFoundationExternalTrainingJobStatus>();

  async submit(taskSpec: TrainingTaskSpec): Promise<AdapterSubmitResult> {
    const externalJobRef = {
      ref_type: 'local_script_process',
      ref_id: `deterministic_${taskSpec.training_task_spec_id}`,
    };
    this.statuses.set(externalJobRef.ref_id, 'running');
    return {
      externalJobRef,
      externalJobHash: hashPayload({
        external_job_ref: externalJobRef,
        training_task_spec_id: taskSpec.training_task_spec_id,
      }),
      status: 'running',
      submittedAt: nowIso(),
      completedAt: null,
      metadata: { adapter: 'deterministic_prisma_parity', status: 'running' },
    };
  }

  async getStatus(externalJobRef: ExperimentFoundationRef): Promise<AdapterStatusResult> {
    return this.reconcile(externalJobRef);
  }

  async reconcile(externalJobRef: ExperimentFoundationRef): Promise<AdapterStatusResult> {
    const status = this.statuses.get(externalJobRef.ref_id) ?? 'unknown';
    return {
      status,
      syncedAt: nowIso(),
      completedAt: isTerminalStatus(status) ? nowIso() : null,
      metadata: { adapter: 'deterministic_prisma_parity', status },
    };
  }

  async cancel(externalJobRef: ExperimentFoundationRef, reason: string): Promise<AdapterStatusResult> {
    this.statuses.set(externalJobRef.ref_id, 'cancelled');
    return {
      status: 'cancelled',
      syncedAt: nowIso(),
      completedAt: nowIso(),
      metadata: { adapter: 'deterministic_prisma_parity', reason, status: 'cancelled' },
    };
  }

  async collectResults(
    taskSpec: TrainingTaskSpec,
    externalJobRef: ExperimentFoundationRef,
  ): Promise<AdapterCollectResult> {
    const currentStatus = this.statuses.get(externalJobRef.ref_id) ?? 'unknown';
    const status = currentStatus === 'running' ? 'succeeded' : currentStatus;
    this.statuses.set(externalJobRef.ref_id, status);
    return buildCollectedResult(taskSpec, externalJobRef, status, {
      adapter: 'deterministic_prisma_parity',
      status,
    });
  }
}

async function createDisposablePrismaContext(
  rawDatabaseUrl: string,
  label: string,
): Promise<{ prisma: PrismaClient; cleanup: () => Promise<void> }> {
  const schemaName = disposableSchemaName(label);
  const disposableDatabaseUrl = databaseUrlWithSchema(rawDatabaseUrl, schemaName);
  const admin = new PrismaClient({ datasources: { db: { url: rawDatabaseUrl } } });
  try {
    await admin.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
  } finally {
    await admin.$disconnect();
  }

  try {
    await runPrismaMigrateDeploy(disposableDatabaseUrl);
    const prisma = new PrismaClient({ datasources: { db: { url: disposableDatabaseUrl } } });
    await prisma.$connect();
    return {
      prisma,
      cleanup: async () => {
        await prisma.$disconnect();
        await dropDisposableSchema(rawDatabaseUrl, schemaName);
      },
    };
  } catch (error) {
    await dropDisposableSchema(rawDatabaseUrl, schemaName);
    throw error;
  }
}

async function cleanupPrismaParityResources(
  context: Awaited<ReturnType<typeof createDisposablePrismaContext>> | null,
  outputRoot: string,
  primaryError: unknown,
): Promise<void> {
  const cleanupResults = await Promise.allSettled([
    context?.cleanup() ?? Promise.resolve(),
    rm(outputRoot, { recursive: true, force: true }),
  ]);
  const cleanupErrors = cleanupResults
    .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
    .map((result) => result.reason);
  if (cleanupErrors.length > 0 && primaryError === null) {
    throw new AggregateError(cleanupErrors, 'Experiment-foundation Prisma parity cleanup failed.');
  }
}

async function dropDisposableSchema(rawDatabaseUrl: string, schemaName: string): Promise<void> {
  const admin = new PrismaClient({ datasources: { db: { url: rawDatabaseUrl } } });
  try {
    await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
  } finally {
    await admin.$disconnect();
  }
}

async function runPrismaMigrateDeploy(disposableDatabaseUrl: string): Promise<void> {
  const result = await runCommand('pnpm', [
    'exec',
    'prisma',
    'migrate',
    'deploy',
    '--schema',
    'prisma/schema.prisma',
  ], {
    cwd: REPO_ROOT,
    env: { ...process.env, DATABASE_URL: disposableDatabaseUrl },
  });
  if (result.exitCode !== 0) {
    throw new Error([
      `Prisma migrate deploy failed with exit code ${result.exitCode}.`,
      `stdout: ${redactSecrets(result.stdout)}`,
      `stderr: ${redactSecrets(result.stderr)}`,
    ].join('\n'));
  }
}

function runCommand(
  command: string,
  args: string[],
  options: { cwd: string; env: NodeJS.ProcessEnv },
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    let timedOut = false;
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk: string) => {
      stderr += chunk;
    });
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, MIGRATION_TIMEOUT_MS);
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({
        exitCode: timedOut ? 124 : code ?? 1,
        stdout,
        stderr: timedOut ? `${stderr}\nTimed out after ${MIGRATION_TIMEOUT_MS}ms.` : stderr,
      });
    });
  });
}

async function seedGraphRecords(
  registry: ExperimentFoundationService,
  records: ExperimentFoundationScenarioRecord[],
): Promise<void> {
  for (const item of records) {
    await registry.createRecord({
      record_kind: item.record_kind,
      payload: item.payload,
    });
  }
}

async function seedPromotionCanonicalRecords(
  registry: ExperimentFoundationService,
  records: ExperimentFoundationScenarioRecord[],
): Promise<void> {
  for (const item of records) {
    if (isPromotionCanonicalRecordKind(item.record_kind)) {
      await registry.createRecord({
        record_kind: item.record_kind,
        payload: item.payload,
      });
    }
  }
}

async function assertRejectsAppError(
  action: () => Promise<unknown>,
  statusCode: number,
  errorCode: string,
  reasonCode?: string,
): Promise<void> {
  await assert.rejects(
    action,
    (error: unknown) => (
      error instanceof AppError
      && error.statusCode === statusCode
      && error.errorCode === errorCode
      && (reasonCode === undefined || error.details?.reason_code === reasonCode)
    ),
  );
}

function buildCollectedResult(
  taskSpec: TrainingTaskSpec,
  externalJobRef: ExperimentFoundationRef,
  status: ExperimentFoundationExternalTrainingJobStatus,
  metadata: Record<string, unknown>,
): AdapterCollectResult {
  const baseRef = `${taskSpec.training_task_spec_id}_${externalJobRef.ref_id}`;
  const metricKey = status === 'succeeded' ? 'adapter_success' : 'adapter_failure';
  const metricsArtifact = resultArtifact('metric_bundle', `${baseRef}_metric_bundle`, metadata);
  const configArtifact = resultArtifact('config_snapshot', `${baseRef}_config_snapshot`, taskSpec.config_snapshot_hash);
  return {
    status,
    metrics: [resultMetric(metricKey, metricsArtifact, metadata)],
    artifacts: [metricsArtifact, configArtifact],
    logs: [resultLog(`${baseRef}_stdout`, externalJobRef, metadata)],
    configSnapshotRef: configArtifact.artifact_ref,
    configSnapshotHash: taskSpec.config_snapshot_hash,
    metadata,
  };
}

function resultMetric(
  metricKey: string,
  artifact: ResultArtifact,
  metadata: Record<string, unknown>,
): ResultMetricValue {
  return {
    metric_key: metricKey,
    metric_definition_ref: { ref_type: 'metric_definition', ref_id: 'adapter_success' },
    value: metricKey === 'adapter_success' ? 1 : 0,
    value_type: 'number',
    unit: 'binary',
    split_name: 'execution',
    aggregation: { method: 'single_run' },
    source_artifact_ref: artifact.artifact_ref,
    source_artifact_hash: hashPayload({ metricKey, metadata }),
  };
}

function resultArtifact(
  artifactKind: ResultArtifact['artifact_kind'],
  id: string,
  payload: unknown,
): ResultArtifact {
  return {
    result_artifact_id: id,
    artifact_kind: artifactKind,
    artifact_ref: { ref_type: 'result_artifact', ref_id: id },
    artifact_hash: hashPayload(payload),
    checksum_hash: hashPayload({ checksum: payload }),
    byte_size: stableStringify(payload).length,
    retention_policy_ref: { ref_type: 'retention_policy', ref_id: 'experiment_foundation_default' },
    created_at: nowIso(),
    source_refs: [],
  };
}

function resultLog(
  id: string,
  externalJobRef: ExperimentFoundationRef,
  metadata: Record<string, unknown>,
): ResultLogRef {
  return {
    log_ref: { ref_type: 'result_log', ref_id: id },
    log_hash: hashPayload({ id, metadata }),
    log_kind: 'stdout',
    byte_size: stableStringify(metadata).length,
    source_refs: [externalJobRef],
  };
}

function isPromotionCanonicalRecordKind(recordKind: ExperimentFoundationRecordKind): boolean {
  return (
    recordKind === 'dataset_asset'
    || recordKind === 'dataset_version'
    || recordKind === 'data_policy'
    || recordKind === 'evaluation_protocol'
  );
}

function isTerminalStatus(status: ExperimentFoundationExternalTrainingJobStatus): boolean {
  return status === 'succeeded' || status === 'failed' || status === 'cancelled';
}

function disposableSchemaName(label: string): string {
  const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
  const normalized = label.toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
  return `${normalized || 'experiment_foundation'}_${suffix}`.slice(0, 63);
}

function databaseUrlWithSchema(rawDatabaseUrl: string, schemaName: string): string {
  const parsed = new URL(rawDatabaseUrl);
  parsed.searchParams.set('schema', schemaName);
  return parsed.toString();
}

function assertPostgresDatabaseUrl(rawDatabaseUrl: string): void {
  const protocol = new URL(rawDatabaseUrl).protocol;
  assert.ok(
    protocol === 'postgres:' || protocol === 'postgresql:',
    'DATABASE_URL must use a PostgreSQL protocol for experiment-foundation Prisma parity.',
  );
}

function redactSecrets(value: string): string {
  return value.replace(/postgres(?:ql)?:\/\/[^\s'"`<>]+/giu, '[REDACTED_DATABASE_URL]');
}

function nowIso(): string {
  return new Date().toISOString();
}
