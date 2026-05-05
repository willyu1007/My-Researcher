import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import type {
  LiteratureContentProcessingRunDTO,
  LiteratureContentProcessingStageCode,
  RightsClass,
} from '@paper-engineering-assistant/shared/research-lifecycle/literature-contracts';
import { InMemoryLiteratureRepository } from '../repositories/in-memory-literature-repository.js';
import type { LiteratureFlowService } from './literature-flow-service.js';
import { LiteratureBackfillService } from './literature-backfill-service.js';

class FakeFlowRunner {
  readonly calls: Array<{
    literatureId: string;
    stages: LiteratureContentProcessingStageCode[];
    triggerSource: string;
  }> = [];
  readonly activeByStage = new Map<LiteratureContentProcessingStageCode, number>();
  readonly maxActiveByStage = new Map<LiteratureContentProcessingStageCode, number>();

  constructor(readonly options: { delayMs?: number; failStage?: LiteratureContentProcessingStageCode } = {}) {}

  async triggerContentProcessingRun(
    literatureId: string,
    stages: LiteratureContentProcessingStageCode[],
    triggerSource = 'CONTENT_PROCESSING_ACTION',
  ): Promise<LiteratureContentProcessingRunDTO> {
    this.calls.push({ literatureId, stages, triggerSource });
    const primaryStage = stages[0];
    if (primaryStage) {
      const active = (this.activeByStage.get(primaryStage) ?? 0) + 1;
      this.activeByStage.set(primaryStage, active);
      this.maxActiveByStage.set(primaryStage, Math.max(active, this.maxActiveByStage.get(primaryStage) ?? 0));
    }
    try {
      if (this.options.delayMs) {
        await new Promise((resolve) => setTimeout(resolve, this.options.delayMs));
      }
      const now = new Date().toISOString();
      const failed = this.options.failStage && stages.includes(this.options.failStage);
      return {
        run_id: crypto.randomUUID(),
        literature_id: literatureId,
        trigger_source: triggerSource as LiteratureContentProcessingRunDTO['trigger_source'],
        status: failed ? 'FAILED' : 'SUCCESS',
        requested_stages: stages,
        error_code: failed ? 'OPENAI_RATE_LIMIT' : null,
        error_message: failed ? 'Provider rate limit.' : null,
        created_at: now,
        started_at: now,
        finished_at: now,
        updated_at: now,
      };
    } finally {
      if (primaryStage) {
        this.activeByStage.set(primaryStage, Math.max(0, (this.activeByStage.get(primaryStage) ?? 1) - 1));
      }
    }
  }
}

test('backfill dry-run scales to 10000 literature records without triggering processing runs', async () => {
  const repository = new InMemoryLiteratureRepository();
  const fakeFlow = new FakeFlowRunner();
  const service = new LiteratureBackfillService(repository, fakeFlow as unknown as LiteratureFlowService);

  for (let index = 0; index < 10000; index += 1) {
    await seedLiterature(repository, `LIT-BACKFILL-${String(index).padStart(5, '0')}`);
  }

  const response = await service.dryRun({
    target_stage: 'ABSTRACT_READY',
    workset: {
      stage_filters: {
        missing: true,
        stale: true,
        failed: true,
      },
    },
  });

  assert.equal(response.estimate.total_literatures, 10000);
  assert.equal(response.estimate.planned_item_count, 10000);
  assert.equal(response.estimate.stage_counts.CITATION_NORMALIZED, 10000);
  assert.equal(response.estimate.stage_counts.ABSTRACT_READY, 10000);
  assert.equal(fakeFlow.calls.length, 0);
});

test('backfill job fans out through BACKFILL single-stage runs and checkpoints items', async () => {
  const repository = new InMemoryLiteratureRepository();
  const fakeFlow = new FakeFlowRunner();
  const service = new LiteratureBackfillService(repository, fakeFlow as unknown as LiteratureFlowService, {
    pollIntervalMs: 1,
  });
  await seedLiterature(repository, 'LIT-BACKFILL-RUN');

  const created = await service.createJob({
    target_stage: 'ABSTRACT_READY',
    workset: {
      literature_ids: ['LIT-BACKFILL-RUN'],
    },
  });
  const job = await waitForJobTerminal(service, created.job.job_id);

  assert.equal(job.status, 'SUCCEEDED');
  assert.equal(job.totals.succeeded, 1);
  assert.deepEqual(fakeFlow.calls.map((call) => call.stages), [
    ['CITATION_NORMALIZED'],
    ['ABSTRACT_READY'],
  ]);
  assert.equal(fakeFlow.calls.every((call) => call.triggerSource === 'BACKFILL'), true);
  assert.equal(job.items?.[0]?.status, 'SUCCEEDED');
  assert.equal(job.items?.[0]?.next_stage_index, 2);
});

test('backfill job deletion rejects active jobs and removes terminal job records', async () => {
  const repository = new InMemoryLiteratureRepository();
  const fakeFlow = new FakeFlowRunner({ delayMs: 15 });
  const service = new LiteratureBackfillService(repository, fakeFlow as unknown as LiteratureFlowService, {
    pollIntervalMs: 1,
  });
  await seedLiterature(repository, 'LIT-BACKFILL-DELETE');

  const created = await service.createJob({
    target_stage: 'ABSTRACT_READY',
    workset: {
      literature_ids: ['LIT-BACKFILL-DELETE'],
    },
  });

  await assert.rejects(
    () => service.deleteJob(created.job.job_id),
    /Cancel the backfill job before deleting it|Wait for the active backfill worker/,
  );

  await waitForJobTerminal(service, created.job.job_id);
  await service.deleteJob(created.job.job_id);
  await assert.rejects(
    () => service.getJob(created.job.job_id),
    /Content-processing backfill job .* not found/,
  );
});

test('backfill job supports pause resume and retrying retryable failures', async () => {
  const repository = new InMemoryLiteratureRepository();
  const fakeFlow = new FakeFlowRunner({ failStage: 'ABSTRACT_READY' });
  const service = new LiteratureBackfillService(repository, fakeFlow as unknown as LiteratureFlowService, {
    pollIntervalMs: 1,
  });
  await seedLiterature(repository, 'LIT-BACKFILL-RETRY');

  const created = await service.createJob({
    target_stage: 'ABSTRACT_READY',
    workset: {
      literature_ids: ['LIT-BACKFILL-RETRY'],
    },
  });
  const failed = await waitForJobTerminal(service, created.job.job_id);
  assert.equal(failed.status, 'FAILED');
  assert.equal(failed.items?.[0]?.retryable, true);

  fakeFlow.options.failStage = undefined;
  const retried = await service.retryFailed(created.job.job_id);
  assert.equal(retried.job.status, 'QUEUED');
  const succeeded = await waitForJobTerminal(service, created.job.job_id);
  assert.equal(succeeded.status, 'SUCCEEDED');
});

test('backfill retry preserves original workset filters while allowing failed-stage retry', async () => {
  const repository = new InMemoryLiteratureRepository();
  const fakeFlow = new FakeFlowRunner({ failStage: 'ABSTRACT_READY' });
  const service = new LiteratureBackfillService(repository, fakeFlow as unknown as LiteratureFlowService, {
    pollIntervalMs: 1,
  });
  await seedLiterature(repository, 'LIT-BACKFILL-RETRY-FILTERS');
  const now = new Date().toISOString();
  await repository.upsertPipelineStageState({
    id: 'STAGE-ABSTRACT-STALE',
    literatureId: 'LIT-BACKFILL-RETRY-FILTERS',
    stageCode: 'ABSTRACT_READY',
    status: 'STALE',
    lastRunId: null,
    detail: {},
    updatedAt: now,
  });

  const created = await service.createJob({
    target_stage: 'ABSTRACT_READY',
    workset: {
      literature_ids: ['LIT-BACKFILL-RETRY-FILTERS'],
      stage_filters: {
        stale: true,
      },
    },
  });
  const failed = await waitForJobTerminal(service, created.job.job_id);
  assert.equal(failed.status, 'FAILED');
  assert.deepEqual(fakeFlow.calls.map((call) => call.stages), [['ABSTRACT_READY']]);

  fakeFlow.options.failStage = undefined;
  await service.retryFailed(created.job.job_id);
  const succeeded = await waitForJobTerminal(service, created.job.job_id);
  assert.equal(succeeded.status, 'SUCCEEDED');
  assert.deepEqual(fakeFlow.calls.map((call) => call.stages), [
    ['ABSTRACT_READY'],
    ['ABSTRACT_READY'],
  ]);
});

test('backfill job enforces extraction and embedding stage slot limits', async () => {
  const repository = new InMemoryLiteratureRepository();
  const fakeFlow = new FakeFlowRunner({ delayMs: 15 });
  const service = new LiteratureBackfillService(repository, fakeFlow as unknown as LiteratureFlowService, {
    pollIntervalMs: 1,
  });
  await seedLiterature(repository, 'LIT-BACKFILL-SLOTS-1');
  await seedLiterature(repository, 'LIT-BACKFILL-SLOTS-2');

  const created = await service.createJob({
    target_stage: 'INDEXED',
    workset: {
      literature_ids: ['LIT-BACKFILL-SLOTS-1', 'LIT-BACKFILL-SLOTS-2'],
    },
    options: {
      max_parallel_literature_runs: 2,
      extraction_concurrency: 1,
      embedding_concurrency: 1,
    },
  });
  const job = await waitForJobTerminal(service, created.job.job_id);

  assert.equal(job.status, 'SUCCEEDED');
  assert.equal(fakeFlow.maxActiveByStage.get('KEY_CONTENT_READY'), 1);
  assert.equal(fakeFlow.maxActiveByStage.get('EMBEDDED'), 1);
  assert.equal((fakeFlow.maxActiveByStage.get('CITATION_NORMALIZED') ?? 0) >= 1, true);
});

test('backfill dry-run rejects invalid date selectors', async () => {
  const repository = new InMemoryLiteratureRepository();
  const fakeFlow = new FakeFlowRunner();
  const service = new LiteratureBackfillService(repository, fakeFlow as unknown as LiteratureFlowService);
  await seedLiterature(repository, 'LIT-BACKFILL-DATE');

  await assert.rejects(
    () => service.dryRun({
      workset: {
        updated_at_from: 'not-a-date',
      },
    }),
    /updated_at_from must be a valid date-time string/,
  );

  await assert.rejects(
    () => service.dryRun({
      workset: {
        updated_at_from: '2026-05-06T00:00:00.000Z',
        updated_at_to: '2026-05-05T00:00:00.000Z',
      },
    }),
    /updated_at_from must be earlier than or equal to updated_at_to/,
  );
});

test('backfill dry-run rejects explicitly empty stage filters', async () => {
  const repository = new InMemoryLiteratureRepository();
  const fakeFlow = new FakeFlowRunner();
  const service = new LiteratureBackfillService(repository, fakeFlow as unknown as LiteratureFlowService);
  await seedLiterature(repository, 'LIT-BACKFILL-FILTERS');

  await assert.rejects(
    () => service.dryRun({
      workset: {
        stage_filters: {
          missing: false,
          stale: false,
          failed: false,
        },
      },
    }),
    /At least one backfill stage filter must be enabled/,
  );
});

test('backfill job pause stops new items and resume finishes remaining work', async () => {
  const repository = new InMemoryLiteratureRepository();
  const fakeFlow = new FakeFlowRunner({ delayMs: 25 });
  const service = new LiteratureBackfillService(repository, fakeFlow as unknown as LiteratureFlowService, {
    pollIntervalMs: 1,
  });
  await seedLiterature(repository, 'LIT-BACKFILL-PAUSE-1');
  await seedLiterature(repository, 'LIT-BACKFILL-PAUSE-2');

  const created = await service.createJob({
    target_stage: 'CITATION_NORMALIZED',
    workset: {
      literature_ids: ['LIT-BACKFILL-PAUSE-1', 'LIT-BACKFILL-PAUSE-2'],
    },
    options: {
      max_parallel_literature_runs: 1,
    },
  });
  await service.pauseJob(created.job.job_id);

  let paused = await waitForJobStatus(service, created.job.job_id, 'PAUSED');
  assert.equal(paused.totals.queued >= 1, true);

  await service.resumeJob(created.job.job_id);
  paused = await waitForJobTerminal(service, created.job.job_id);
  assert.equal(paused.status, 'SUCCEEDED');
  assert.equal(paused.totals.succeeded, 2);
});

test('backfill resume closes interrupted pipeline runs before requeueing items', async () => {
  const repository = new InMemoryLiteratureRepository();
  const fakeFlow = new FakeFlowRunner();
  const service = new LiteratureBackfillService(repository, fakeFlow as unknown as LiteratureFlowService, {
    pollIntervalMs: 1,
  });
  const literature = await seedLiterature(repository, 'LIT-BACKFILL-RECOVER');
  const now = new Date().toISOString();
  const jobId = 'JOB-BACKFILL-RECOVER';
  const itemId = 'ITEM-BACKFILL-RECOVER';
  const interruptedRunId = 'RUN-BACKFILL-INTERRUPTED';
  await repository.createPipelineRun({
    id: interruptedRunId,
    literatureId: literature.id,
    triggerSource: 'BACKFILL',
    status: 'RUNNING',
    requestedStages: ['CITATION_NORMALIZED'],
    errorCode: null,
    errorMessage: null,
    createdAt: now,
    startedAt: now,
    finishedAt: null,
    updatedAt: now,
  });
  await repository.upsertPipelineStageState({
    id: 'STAGE-BACKFILL-RECOVER',
    literatureId: literature.id,
    stageCode: 'CITATION_NORMALIZED',
    status: 'RUNNING',
    lastRunId: interruptedRunId,
    detail: {},
    updatedAt: now,
  });
  await repository.createContentProcessingBatchJob({
    id: jobId,
    status: 'RUNNING',
    targetStage: 'CITATION_NORMALIZED',
    workset: { literature_ids: [literature.id] },
    options: {
      max_parallel_literature_runs: 1,
      extraction_concurrency: 1,
      embedding_concurrency: 1,
      provider_call_budget: null,
    },
    dryRunEstimate: {},
    totals: { total: 1, queued: 0, running: 1, succeeded: 0, partial: 0, blocked: 0, failed: 0, skipped: 0, canceled: 0 },
    errorCode: null,
    errorMessage: null,
    createdAt: now,
    startedAt: now,
    pausedAt: null,
    canceledAt: null,
    finishedAt: null,
    updatedAt: now,
  }, [{
    id: itemId,
    jobId,
    literatureId: literature.id,
    status: 'RUNNING',
    requestedStages: ['CITATION_NORMALIZED'],
    nextStageIndex: 0,
    pipelineRunId: interruptedRunId,
    attemptCount: 1,
    errorCode: null,
    errorMessage: null,
    blockerCode: null,
    retryable: true,
    checkpoint: {
      current_stage: 'CITATION_NORMALIZED',
      current_stage_index: 0,
      content_processing_run_id: interruptedRunId,
    },
    createdAt: now,
    startedAt: now,
    finishedAt: null,
    updatedAt: now,
  }]);

  await service.resumeRunnableJobs();
  const recovered = await waitForJobTerminal(service, jobId);
  const interruptedRun = await repository.findPipelineRunById(interruptedRunId);

  assert.equal(recovered.status, 'SUCCEEDED');
  assert.equal(interruptedRun?.status, 'FAILED');
  assert.equal(interruptedRun?.errorCode, 'BACKFILL_RUN_INTERRUPTED');
  assert.deepEqual(fakeFlow.calls.map((call) => call.stages), [['CITATION_NORMALIZED']]);
});

test('cleanup dry-run protects active embedding versions and raw source files', async () => {
  const repository = new InMemoryLiteratureRepository();
  const fakeFlow = new FakeFlowRunner();
  const service = new LiteratureBackfillService(repository, fakeFlow as unknown as LiteratureFlowService);
  const literature = await seedLiterature(repository, 'LIT-BACKFILL-CLEANUP');
  const now = new Date().toISOString();
  const old = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
  const inactive = await repository.createEmbeddingVersion({
    id: 'EV-INACTIVE',
    literatureId: literature.id,
    versionNo: 1,
    status: 'INDEXED',
    profileId: 'default',
    provider: 'openai',
    model: 'text-embedding-3-large',
    dimension: 3,
    chunkCount: 3,
    vectorCount: 3,
    tokenCount: 12,
    inputChecksum: 'inactive',
    chunkArtifactChecksum: 'chunks-inactive',
    embeddingArtifactChecksum: 'embeddings-inactive',
    indexArtifactChecksum: 'index-inactive',
    indexedAt: old,
    activatedAt: null,
    createdAt: old,
    updatedAt: old,
  });
  const active = await repository.createEmbeddingVersion({
    ...inactive,
    id: 'EV-ACTIVE',
    versionNo: 2,
    inputChecksum: 'active',
    chunkArtifactChecksum: 'chunks-active',
    embeddingArtifactChecksum: 'embeddings-active',
    indexArtifactChecksum: 'index-active',
    activatedAt: now,
    createdAt: old,
    updatedAt: now,
  });
  await repository.updateLiterature({
    ...literature,
    activeEmbeddingVersionId: active.id,
    updatedAt: now,
  });
  await repository.upsertContentAsset({
    id: 'ASSET-RAW',
    literatureId: literature.id,
    assetKind: 'raw_fulltext',
    sourceKind: 'local_path',
    localPath: '/tmp/paper.md',
    checksum: 'raw',
    mimeType: 'text/markdown',
    byteSize: 10,
    rightsClass: 'OA',
    status: 'registered',
    metadata: {},
    createdAt: now,
    updatedAt: now,
  });

  const dryRun = await service.cleanupDryRun({
    literature_ids: [literature.id],
    retention_days: 0,
  });

  assert.equal(dryRun.candidate_count, 1);
  assert.equal(dryRun.candidates[0]?.embedding_version_id, inactive.id);
  assert.equal(dryRun.protected_active_version_count, 1);
  assert.equal(dryRun.protected_raw_asset_count, 1);
  assert.equal(dryRun.estimated_chunks_to_remove, 3);
  assert.equal(dryRun.estimated_token_indexes_to_remove, 12);
});

async function seedLiterature(
  repository: InMemoryLiteratureRepository,
  literatureId: string,
  rightsClass: RightsClass = 'OA',
) {
  const now = new Date().toISOString();
  return repository.createLiterature({
    id: literatureId,
    title: `Backfill paper ${literatureId}`,
    abstractText: 'A trusted abstract.',
    keyContentDigest: null,
    authors: ['A. Researcher'],
    year: 2026,
    doiNormalized: null,
    arxivId: null,
    normalizedTitle: `backfill paper ${literatureId.toLowerCase()}`,
    titleAuthorsYearHash: null,
    rightsClass,
    tags: [],
    activeEmbeddingVersionId: null,
    createdAt: now,
    updatedAt: now,
  });
}

async function waitForJobTerminal(
  service: LiteratureBackfillService,
  jobId: string,
): Promise<NonNullable<Awaited<ReturnType<LiteratureBackfillService['getJob']>>['job']>> {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const { job } = await service.getJob(jobId);
    if (job.status === 'SUCCEEDED' || job.status === 'PARTIAL' || job.status === 'FAILED' || job.status === 'CANCELED') {
      return job;
    }
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error(`Timed out waiting for backfill job ${jobId}.`);
}

async function waitForJobStatus(
  service: LiteratureBackfillService,
  jobId: string,
  status: Awaited<ReturnType<LiteratureBackfillService['getJob']>>['job']['status'],
) {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const { job } = await service.getJob(jobId);
    if (job.status === status) {
      return job;
    }
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error(`Timed out waiting for backfill job ${jobId} to reach ${status}.`);
}
