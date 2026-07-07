import assert from 'node:assert/strict';
import test from 'node:test';
import type { LiteratureContentProcessingBackfillDryRunRequest } from '@paper-engineering-assistant/shared/research-lifecycle/literature-contracts';
import type { LiteratureContentProcessingBatchJobRecord } from '../repositories/literature-repository.js';
import { LiteratureAutoAdvanceService } from './literature-auto-advance-service.js';
import type { LiteratureAutoAdvanceRuntimeSettings } from './literature-content-processing-settings-service.js';

// T-130 W-06 (D8): import auto-advance gate unit coverage.

const BASE_SETTINGS: LiteratureAutoAdvanceRuntimeSettings = {
  enabled: true,
  full_chain_min_score: 75,
  fulltext_only_min_score: 55,
  daily_literature_limit: 50,
  max_parallel_literature_runs: 2,
  advance_unscored: 'none',
};

function makeService(options: {
  settings?: Partial<LiteratureAutoAdvanceRuntimeSettings>;
  existingJobs?: LiteratureContentProcessingBatchJobRecord[];
  createJobError?: Error;
} = {}) {
  const createdRequests: LiteratureContentProcessingBackfillDryRunRequest[] = [];
  let jobCounter = 0;
  const service = new LiteratureAutoAdvanceService(
    {
      listContentProcessingBatchJobs: async () => options.existingJobs ?? [],
    },
    {
      createJob: async (request: LiteratureContentProcessingBackfillDryRunRequest) => {
        if (options.createJobError) {
          throw options.createJobError;
        }
        createdRequests.push(request);
        jobCounter += 1;
        return { job: { job_id: `job-${jobCounter}` } } as never;
      },
    },
    {
      resolveAutoAdvanceSettings: async () => ({ ...BASE_SETTINGS, ...options.settings }),
    },
  );
  return { service, createdRequests };
}

function autoAdvanceJob(createdAt: string, total: number): LiteratureContentProcessingBatchJobRecord {
  return {
    id: `existing-${createdAt}-${total}`,
    status: 'SUCCEEDED',
    targetStage: 'INDEXED',
    workset: {},
    options: { trigger: 'auto_advance' },
    dryRunEstimate: {},
    totals: { total },
    errorCode: null,
    errorMessage: null,
    createdAt,
    startedAt: null,
    pausedAt: null,
    canceledAt: null,
    finishedAt: null,
    updatedAt: createdAt,
  };
}

test('auto-advance is a no-op when disabled', async () => {
  const { service, createdRequests } = makeService({ settings: { enabled: false } });
  const outcome = await service.advanceAfterImport({
    source: 'auto_pull',
    imported: [{ literatureId: 'L1', qualityScore: 90, isNew: true }],
  });
  assert.equal(outcome.enabled, false);
  assert.equal(createdRequests.length, 0);
});

test('auto-advance partitions by quality tier and creates two tiered jobs', async () => {
  const { service, createdRequests } = makeService();
  const outcome = await service.advanceAfterImport({
    source: 'auto_pull',
    imported: [
      { literatureId: 'L-full', qualityScore: 80, isNew: true },
      { literatureId: 'L-mid', qualityScore: 60, isNew: true },
      { literatureId: 'L-low', qualityScore: 40, isNew: true },
      { literatureId: 'L-unscored', qualityScore: null, isNew: true },
      { literatureId: 'L-existing', qualityScore: 95, isNew: false },
    ],
  });

  assert.equal(outcome.enabled, true);
  assert.equal(outcome.advanced_full_count, 1);
  assert.equal(outcome.advanced_fulltext_count, 1);
  assert.equal(outcome.skipped_below_threshold, 1);
  assert.equal(outcome.skipped_unscored, 1);
  assert.equal(outcome.skipped_not_new, 1);
  assert.deepEqual(outcome.job_ids, ['job-1', 'job-2']);

  assert.equal(createdRequests.length, 2);
  assert.deepEqual(createdRequests[0]?.workset?.literature_ids, ['L-full']);
  assert.equal(createdRequests[0]?.target_stage, 'INDEXED');
  assert.equal(createdRequests[0]?.options?.trigger, 'auto_advance');
  assert.equal(createdRequests[0]?.options?.max_parallel_literature_runs, 2);
  assert.deepEqual(createdRequests[1]?.workset?.literature_ids, ['L-mid']);
  assert.equal(createdRequests[1]?.target_stage, 'FULLTEXT_PREPROCESSED');
});

test('auto-advance enforces the daily budget with full tier prioritized', async () => {
  const today = new Date().toISOString();
  const { service, createdRequests } = makeService({
    settings: { daily_literature_limit: 3 },
    existingJobs: [autoAdvanceJob(today, 2)],
  });
  const outcome = await service.advanceAfterImport({
    source: 'auto_pull',
    imported: [
      { literatureId: 'F1', qualityScore: 90, isNew: true },
      { literatureId: 'F2', qualityScore: 88, isNew: true },
      { literatureId: 'M1', qualityScore: 60, isNew: true },
    ],
  });

  assert.equal(outcome.daily_used_before, 2);
  assert.equal(outcome.advanced_full_count, 1);
  assert.equal(outcome.advanced_fulltext_count, 0);
  assert.equal(outcome.skipped_daily_limit, 2);
  assert.equal(createdRequests.length, 1);
  assert.deepEqual(createdRequests[0]?.workset?.literature_ids, ['F1']);
});

test('yesterday and manual jobs do not consume the daily budget', async () => {
  const yesterday = new Date(Date.now() - 24 * 60 * 60_000).toISOString();
  const today = new Date().toISOString();
  const manualJob = { ...autoAdvanceJob(today, 10), options: {} };
  const { service } = makeService({
    settings: { daily_literature_limit: 5 },
    existingJobs: [autoAdvanceJob(yesterday, 10), manualJob],
  });
  const outcome = await service.advanceAfterImport({
    source: 'auto_pull',
    imported: [{ literatureId: 'F1', qualityScore: 90, isNew: true }],
  });
  assert.equal(outcome.daily_used_before, 0);
  assert.equal(outcome.advanced_full_count, 1);
});

test('advance_unscored=fulltext routes unscored manual imports to the fulltext tier', async () => {
  const { service, createdRequests } = makeService({ settings: { advance_unscored: 'fulltext' } });
  const outcome = await service.advanceAfterImport({
    source: 'collection_import',
    imported: [{ literatureId: 'Z1', qualityScore: null, isNew: true }],
  });
  assert.equal(outcome.advanced_fulltext_count, 1);
  assert.equal(outcome.skipped_unscored, 0);
  assert.equal(createdRequests[0]?.target_stage, 'FULLTEXT_PREPROCESSED');
});

test('auto-advance never throws — backfill failures surface in the outcome', async () => {
  const { service } = makeService({ createJobError: new Error('budget exceeded') });
  const outcome = await service.advanceAfterImport({
    source: 'auto_pull',
    imported: [{ literatureId: 'F1', qualityScore: 90, isNew: true }],
  });
  assert.equal(outcome.error, 'budget exceeded');
  assert.equal(outcome.job_ids.length, 0);
});
