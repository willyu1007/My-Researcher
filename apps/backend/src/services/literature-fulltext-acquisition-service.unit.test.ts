import assert from 'node:assert/strict';
import test from 'node:test';

import { AppError } from '../errors/app-error.js';
import { InMemoryLiteratureRepository } from '../repositories/in-memory-literature-repository.js';
import type { LiteratureRecord } from '../repositories/literature-repository.js';
import type { LiteratureAcquisitionSettingsService } from './literature-acquisition-settings-service.js';
import { LiteratureFulltextAcquisitionService } from './literature-fulltext-acquisition-service.js';
import type { LiteratureService } from './literature-service.js';

// T-130 W-07 (L-07): the 9-state job/item machine had zero direct tests. These pin the
// state machine's core paths: planning/blockers, budget gate, happy path, failure
// classification, retry, pause/resume/cancel, crash re-entry, and unpaywall resolution.

const NOW = '2026-07-08T00:00:00.000Z';

type DownloadImpl = (literatureId: string, options: Record<string, unknown>) => Promise<{
  item: {
    asset_id: string;
    checksum: string;
    byte_size: number;
    mime_type: string;
    metadata: Record<string, unknown>;
  };
}>;

function successDownload(finalUrl: string | null = null): DownloadImpl {
  return async (literatureId) => ({
    item: {
      asset_id: `asset-${literatureId}`,
      checksum: `sum-${literatureId}`,
      byte_size: 1024,
      mime_type: 'application/pdf',
      metadata: finalUrl ? { final_url: finalUrl } : {},
    },
  });
}

function makeLiteratureServiceStub(impl: DownloadImpl = successDownload()): LiteratureService & { calls: Array<{ literatureId: string; options: Record<string, unknown> }> } {
  const calls: Array<{ literatureId: string; options: Record<string, unknown> }> = [];
  const stub = {
    calls,
    downloadContentAsset: async (literatureId: string, options: Record<string, unknown>) => {
      calls.push({ literatureId, options });
      return impl(literatureId, options);
    },
  };
  return stub as unknown as LiteratureService & { calls: typeof calls };
}

function makeSettingsStub(options: { unpaywallEnabled?: boolean; unpaywallEmail?: string | null } = {}): LiteratureAcquisitionSettingsService {
  const stub = {
    isUnpaywallEnabled: async () => options.unpaywallEnabled ?? false,
    resolveUnpaywallEmail: async () => options.unpaywallEmail ?? null,
    resolveDownloaderOptions: async () => ({
      max_byte_size: 10_000_000,
      timeout_ms: 30_000,
      max_redirects: 5,
      require_pdf_signature: true,
    }),
    resolveSourceThrottle: async () => ({ min_interval_ms: 0, concurrency: 2 }),
  };
  return stub as unknown as LiteratureAcquisitionSettingsService;
}

async function seedLiterature(
  repository: InMemoryLiteratureRepository,
  overrides: Partial<LiteratureRecord> & { id: string },
): Promise<LiteratureRecord> {
  return repository.createLiterature({
    title: `Fixture ${overrides.id}`,
    abstractText: null,
    keyContentDigest: null,
    authors: ['Tester'],
    year: 2026,
    doiNormalized: null,
    arxivId: null,
    normalizedTitle: `fixture ${overrides.id.toLowerCase()}`,
    titleAuthorsYearHash: `hash-${overrides.id}`,
    rightsClass: 'OA',
    tags: [],
    activeEmbeddingVersionId: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  });
}

async function waitForJobStatus(
  repository: InMemoryLiteratureRepository,
  jobId: string,
  statuses: string[],
  timeoutMs = 3_000,
): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const job = await repository.findFulltextAcquisitionJobById(jobId);
    if (job && statuses.includes(job.status)) {
      return job.status;
    }
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  const job = await repository.findFulltextAcquisitionJobById(jobId);
  throw new Error(`Timed out waiting for job ${jobId} to reach ${statuses.join('/')}; current: ${job?.status ?? 'missing'}`);
}

async function clearSourceCooldown(repository: InMemoryLiteratureRepository, source: string): Promise<void> {
  const existing = await repository.findSourceRuntimeState(source);
  if (!existing) {
    return;
  }
  await repository.upsertSourceRuntimeState({
    ...existing,
    status: 'READY',
    cooldownUntil: null,
    failureCount: 0,
    updatedAt: new Date().toISOString(),
  });
}

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void; reject: (error: unknown) => void } {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

test('dry run classifies blockers and picks sources by explicit > arxiv > unpaywall priority', async () => {
  const repository = new InMemoryLiteratureRepository();
  const service = new LiteratureFulltextAcquisitionService(
    repository,
    makeLiteratureServiceStub(),
    makeSettingsStub(),
  );
  await seedLiterature(repository, { id: 'LIT-RESTRICTED', rightsClass: 'RESTRICTED', arxivId: 'r1' });
  await seedLiterature(repository, { id: 'LIT-USERAUTH', rightsClass: 'USER_AUTH' });
  await seedLiterature(repository, { id: 'LIT-ARXIV', arxivId: '2401.00001' });
  await seedLiterature(repository, { id: 'LIT-DOI-NO-UNPAYWALL', doiNormalized: '10.1000/nooa' });
  await seedLiterature(repository, { id: 'LIT-NO-SOURCE' });
  await seedLiterature(repository, { id: 'LIT-EXPLICIT', arxivId: '2401.00002' });

  const { estimate } = await service.dryRun({
    workset: {
      literature_ids: ['LIT-RESTRICTED', 'LIT-USERAUTH', 'LIT-ARXIV', 'LIT-DOI-NO-UNPAYWALL', 'LIT-NO-SOURCE', 'LIT-EXPLICIT'],
      explicit_urls: [{ literature_id: 'LIT-EXPLICIT', source_url: 'https://example.org/paper.pdf' }],
    },
  });

  assert.equal(estimate.total_literatures, 6);
  assert.equal(estimate.planned_item_count, 2);
  assert.equal(estimate.blocked_count, 4);
  const blockerByLiterature = new Map(estimate.blockers.map((blocker) => [blocker.literature_id, blocker]));
  assert.equal(blockerByLiterature.get('LIT-RESTRICTED')?.reason_code, 'RIGHTS_RESTRICTED');
  assert.equal(blockerByLiterature.get('LIT-RESTRICTED')?.retryable, false);
  assert.equal(blockerByLiterature.get('LIT-USERAUTH')?.reason_code, 'USER_AUTH_REQUIRED');
  assert.equal(blockerByLiterature.get('LIT-DOI-NO-UNPAYWALL')?.reason_code, 'UNPAYWALL_NOT_CONFIGURED');
  assert.equal(blockerByLiterature.get('LIT-DOI-NO-UNPAYWALL')?.retryable, true);
  assert.equal(blockerByLiterature.get('LIT-NO-SOURCE')?.reason_code, 'FULLTEXT_SOURCE_MISSING');
  const planByLiterature = new Map(estimate.plan_items.map((item) => [item.literature_id, item]));
  assert.equal(planByLiterature.get('LIT-ARXIV')?.selected_source_kind, 'arxiv');
  assert.equal(planByLiterature.get('LIT-ARXIV')?.source_url, 'https://arxiv.org/pdf/2401.00001');
  // Explicit URL wins over the also-available arXiv source.
  assert.equal(planByLiterature.get('LIT-EXPLICIT')?.selected_source_kind, 'explicit_url');
  assert.equal(planByLiterature.get('LIT-EXPLICIT')?.source_url, 'https://example.org/paper.pdf');
  assert.equal(estimate.estimated_provider_calls.unpaywall_calls, 0);
  assert.equal(estimate.estimated_provider_calls.download_calls, 2);
});

test('dry run skips literatures with registered fulltext assets unless force_refresh', async () => {
  const repository = new InMemoryLiteratureRepository();
  const service = new LiteratureFulltextAcquisitionService(
    repository,
    makeLiteratureServiceStub(),
    makeSettingsStub(),
  );
  await seedLiterature(repository, { id: 'LIT-HAS-ASSET', arxivId: '2401.00010' });
  await repository.upsertContentAsset({
    id: 'asset-existing',
    literatureId: 'LIT-HAS-ASSET',
    assetKind: 'raw_fulltext',
    sourceKind: 'local_path',
    localPath: '/tmp/existing.pdf',
    checksum: 'sum',
    mimeType: 'application/pdf',
    byteSize: 10,
    rightsClass: 'OA',
    status: 'registered',
    metadata: {},
    createdAt: NOW,
    updatedAt: NOW,
  });

  const skipped = await service.dryRun({ workset: { literature_ids: ['LIT-HAS-ASSET'] } });
  assert.equal(skipped.estimate.selected_count, 0);
  assert.equal(skipped.estimate.skipped_existing_asset_count, 1);

  const forced = await service.dryRun({
    workset: { literature_ids: ['LIT-HAS-ASSET'] },
    options: { force_refresh: true },
  });
  assert.equal(forced.estimate.selected_count, 1);
  assert.equal(forced.estimate.skipped_existing_asset_count, 0);
});

test('createJob rejects when estimated provider calls exceed the budget', async () => {
  const repository = new InMemoryLiteratureRepository();
  const service = new LiteratureFulltextAcquisitionService(
    repository,
    makeLiteratureServiceStub(),
    makeSettingsStub(),
  );
  await seedLiterature(repository, { id: 'LIT-B1', arxivId: '2401.00021' });
  await seedLiterature(repository, { id: 'LIT-B2', arxivId: '2401.00022' });

  await assert.rejects(
    service.createJob({
      workset: { literature_ids: ['LIT-B1', 'LIT-B2'] },
      options: { provider_call_budget: 1 },
    }),
    (error: unknown) => error instanceof AppError && error.statusCode === 400 && /exceeds budget/.test(error.message),
  );
  assert.equal((await repository.listFulltextAcquisitionJobs(10)).length, 0);
});

test('createJob runs queued items to SUCCEEDED with asset checkpoint and download health', async () => {
  const repository = new InMemoryLiteratureRepository();
  const literatureService = makeLiteratureServiceStub(successDownload('https://cdn.example.org/final.pdf'));
  const service = new LiteratureFulltextAcquisitionService(
    repository,
    literatureService,
    makeSettingsStub(),
  );
  await seedLiterature(repository, { id: 'LIT-OK-1', arxivId: '2401.00031' });
  await seedLiterature(repository, { id: 'LIT-OK-2', arxivId: '2401.00032' });

  const created = await service.createJob({ workset: { literature_ids: ['LIT-OK-1', 'LIT-OK-2'] } });
  await waitForJobStatus(repository, created.job.job_id, ['SUCCEEDED']);

  const { job } = await service.getJob(created.job.job_id);
  assert.equal(job.status, 'SUCCEEDED');
  assert.deepEqual(
    { total: job.totals.total, succeeded: job.totals.succeeded, failed: job.totals.failed },
    { total: 2, succeeded: 2, failed: 0 },
  );
  const item = job.items?.find((entry) => entry.literature_id === 'LIT-OK-1');
  assert.equal(item?.status, 'SUCCEEDED');
  assert.equal(item?.content_asset_id, 'asset-LIT-OK-1');
  assert.equal(item?.final_url, 'https://cdn.example.org/final.pdf');
  assert.equal(item?.attempt_count, 1);
  assert.deepEqual(item?.checkpoint, { checksum: 'sum-LIT-OK-1', byte_size: 1024, mime_type: 'application/pdf' });
  assert.equal(literatureService.calls.length, 2);
  const downloadHealth = job.source_health.find((entry) => entry.source_kind === 'download');
  assert.equal(downloadHealth?.runtime_status, 'READY');
  assert.ok(downloadHealth?.last_success_at);
});

test('item failures classify retryability: 400 download rejection is terminal, 5xx stays retryable', async () => {
  const repository = new InMemoryLiteratureRepository();
  const literatureService = makeLiteratureServiceStub(async (literatureId) => {
    if (literatureId === 'LIT-REJECTED') {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Downloaded asset is not a PDF.');
    }
    if (literatureId === 'LIT-Z-FLAKY') {
      throw new AppError(502, 'INTERNAL_ERROR', 'Upstream download failed with status 503.');
    }
    return successDownload()(literatureId, {});
  });
  const service = new LiteratureFulltextAcquisitionService(
    repository,
    literatureService,
    makeSettingsStub(),
  );
  // Items run in title order; the 5xx failure puts the download source into cooldown,
  // so the cooldown-recording item must sort last or the next item stalls on pacing.
  await seedLiterature(repository, { id: 'LIT-REJECTED', arxivId: '2401.00041' });
  await seedLiterature(repository, { id: 'LIT-Z-FLAKY', arxivId: '2401.00042' });
  await seedLiterature(repository, { id: 'LIT-GOOD', arxivId: '2401.00043' });

  const created = await service.createJob({ workset: { literature_ids: ['LIT-REJECTED', 'LIT-Z-FLAKY', 'LIT-GOOD'] } });
  await waitForJobStatus(repository, created.job.job_id, ['PARTIAL']);

  const { job } = await service.getJob(created.job.job_id);
  assert.equal(job.status, 'PARTIAL');
  const rejected = job.items?.find((entry) => entry.literature_id === 'LIT-REJECTED');
  assert.equal(rejected?.status, 'FAILED');
  assert.equal(rejected?.error_code, 'DOWNLOAD_REJECTED');
  assert.equal(rejected?.retryable, false);
  assert.equal(rejected?.blocker_code, 'DOWNLOAD_REJECTED');
  const flaky = job.items?.find((entry) => entry.literature_id === 'LIT-Z-FLAKY');
  assert.equal(flaky?.status, 'FAILED');
  assert.equal(flaky?.error_code, 'INTERNAL_ERROR');
  assert.equal(flaky?.retryable, true);
  assert.equal(flaky?.blocker_code, null);
  assert.equal(job.items?.find((entry) => entry.literature_id === 'LIT-GOOD')?.status, 'SUCCEEDED');
});

test('retryFailed requeues only retryable failures and is rejected while the job runs', async () => {
  const repository = new InMemoryLiteratureRepository();
  let failOnce = true;
  const gate = deferred<void>();
  let holdNextDownload = false;
  const literatureService = makeLiteratureServiceStub(async (literatureId) => {
    if (holdNextDownload) {
      await gate.promise;
    }
    if (failOnce) {
      failOnce = false;
      throw new AppError(502, 'INTERNAL_ERROR', 'Transient download failure.');
    }
    return successDownload()(literatureId, {});
  });
  const service = new LiteratureFulltextAcquisitionService(
    repository,
    literatureService,
    makeSettingsStub(),
  );
  await seedLiterature(repository, { id: 'LIT-RETRY', arxivId: '2401.00051' });

  const created = await service.createJob({ workset: { literature_ids: ['LIT-RETRY'] } });
  await waitForJobStatus(repository, created.job.job_id, ['FAILED']);

  // The transient failure put the download source into cooldown; clear it so the
  // retry runs immediately instead of sleeping out the backoff window.
  await clearSourceCooldown(repository, 'download');
  await clearSourceCooldown(repository, 'arxiv');

  holdNextDownload = true;
  const retried = await service.retryFailed(created.job.job_id);
  assert.ok(['QUEUED', 'RUNNING'].includes(retried.job.status));
  await waitForJobStatus(repository, created.job.job_id, ['RUNNING']);

  await assert.rejects(
    service.retryFailed(created.job.job_id),
    (error: unknown) => error instanceof AppError && error.statusCode === 409,
  );

  gate.resolve();
  await waitForJobStatus(repository, created.job.job_id, ['SUCCEEDED']);
  const { job } = await service.getJob(created.job.job_id);
  assert.equal(job.items?.[0]?.status, 'SUCCEEDED');
  assert.equal(job.items?.[0]?.attempt_count, 2);

  await assert.rejects(
    service.retryFailed(created.job.job_id),
    (error: unknown) => error instanceof AppError && error.statusCode === 400 && /No retryable/.test(error.message),
  );
});

test('pause stops the loop after in-flight items and resume completes the remainder', async () => {
  const repository = new InMemoryLiteratureRepository();
  const gate = deferred<void>();
  let holdDownloads = true;
  const literatureService = makeLiteratureServiceStub(async (literatureId) => {
    if (holdDownloads) {
      await gate.promise;
    }
    return successDownload()(literatureId, {});
  });
  const service = new LiteratureFulltextAcquisitionService(
    repository,
    literatureService,
    makeSettingsStub(),
  );
  await seedLiterature(repository, { id: 'LIT-P1', arxivId: '2401.00061' });
  await seedLiterature(repository, { id: 'LIT-P2', arxivId: '2401.00062' });

  const created = await service.createJob({
    workset: { literature_ids: ['LIT-P1', 'LIT-P2'] },
    options: { max_parallel_downloads: 1 },
  });
  await waitForJobStatus(repository, created.job.job_id, ['RUNNING']);

  const paused = await service.pauseJob(created.job.job_id);
  assert.equal(paused.job.status, 'PAUSED');
  gate.resolve();
  holdDownloads = false;
  // The worker loop observes PAUSED after the held item finishes and leaves the rest queued.
  const afterPause = await (async () => {
    const deadline = Date.now() + 2_000;
    while (Date.now() < deadline) {
      const items = await repository.listFulltextAcquisitionItemsByJobId(created.job.job_id);
      if (items.every((item) => item.status !== 'RUNNING')) {
        return items;
      }
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    throw new Error('Timed out waiting for the held item to settle after pause.');
  })();
  assert.deepEqual(afterPause.map((item) => item.status).sort(), ['QUEUED', 'SUCCEEDED']);

  await service.resumeJob(created.job.job_id);
  await waitForJobStatus(repository, created.job.job_id, ['SUCCEEDED']);
});

test('cancel marks queued and running items CANCELED and finalizes the job as CANCELED', async () => {
  const repository = new InMemoryLiteratureRepository();
  const gate = deferred<void>();
  const literatureService = makeLiteratureServiceStub(async (literatureId) => {
    await gate.promise;
    return successDownload()(literatureId, {});
  });
  const service = new LiteratureFulltextAcquisitionService(
    repository,
    literatureService,
    makeSettingsStub(),
  );
  await seedLiterature(repository, { id: 'LIT-C1', arxivId: '2401.00071' });
  await seedLiterature(repository, { id: 'LIT-C2', arxivId: '2401.00072' });

  const created = await service.createJob({
    workset: { literature_ids: ['LIT-C1', 'LIT-C2'] },
    options: { max_parallel_downloads: 1 },
  });
  await waitForJobStatus(repository, created.job.job_id, ['RUNNING']);

  const canceling = await service.cancelJob(created.job.job_id);
  assert.ok(['CANCELING', 'CANCELED'].includes(canceling.job.status));
  gate.resolve();
  await waitForJobStatus(repository, created.job.job_id, ['CANCELED']);

  const { job } = await service.getJob(created.job.job_id);
  assert.equal(job.status, 'CANCELED');
  assert.ok((job.totals.canceled ?? 0) >= 1);

  // deleteJob guard: allowed once terminal.
  await service.deleteJob(created.job.job_id);
  assert.equal(await repository.findFulltextAcquisitionJobById(created.job.job_id), null);
});

test('resumeRunnableJobs requeues RUNNING items from a crashed worker and completes them', async () => {
  const repository = new InMemoryLiteratureRepository();
  const literatureService = makeLiteratureServiceStub();
  await seedLiterature(repository, { id: 'LIT-CRASH', arxivId: '2401.00081' });
  await repository.createFulltextAcquisitionJob({
    id: 'job-crashed',
    status: 'RUNNING',
    workset: { literature_ids: ['LIT-CRASH'], only_missing_assets: true },
    options: { max_parallel_downloads: 1, provider_call_budget: null, max_byte_size: 10_000_000, force_refresh: false },
    dryRunEstimate: {},
    totals: { total: 1, queued: 0, running: 1, succeeded: 0, partial: 0, blocked: 0, failed: 0, skipped: 0, canceled: 0 },
    errorCode: null,
    errorMessage: null,
    createdAt: NOW,
    startedAt: NOW,
    pausedAt: null,
    canceledAt: null,
    finishedAt: null,
    updatedAt: NOW,
  }, [{
    id: 'item-crashed',
    jobId: 'job-crashed',
    literatureId: 'LIT-CRASH',
    status: 'RUNNING',
    selectedSourceKind: 'arxiv',
    sourceUrl: 'https://arxiv.org/pdf/2401.00081',
    finalUrl: null,
    contentAssetId: null,
    attemptCount: 1,
    errorCode: null,
    errorMessage: null,
    blockerCode: null,
    retryable: true,
    resolutionCandidates: [],
    checkpoint: {},
    createdAt: NOW,
    startedAt: NOW,
    finishedAt: null,
    updatedAt: NOW,
  }]);

  const service = new LiteratureFulltextAcquisitionService(
    repository,
    literatureService,
    makeSettingsStub(),
  );
  await service.resumeRunnableJobs();
  await waitForJobStatus(repository, 'job-crashed', ['SUCCEEDED']);

  const { job } = await service.getJob('job-crashed');
  assert.equal(job.items?.[0]?.status, 'SUCCEEDED');
  // Requeue + rerun: the interrupted attempt plus the recovery attempt.
  assert.equal(job.items?.[0]?.attempt_count, 2);
  assert.equal(job.items?.[0]?.error_code, null);
});

test('unpaywall resolution feeds the download and classifies 429 and missing-OA outcomes', async (t) => {
  const repository = new InMemoryLiteratureRepository();
  const literatureService = makeLiteratureServiceStub();
  const service = new LiteratureFulltextAcquisitionService(
    repository,
    literatureService,
    makeSettingsStub({ unpaywallEnabled: true, unpaywallEmail: 'oa@example.org' }),
  );
  await seedLiterature(repository, { id: 'LIT-OA', doiNormalized: '10.1000/oa-ok' });
  await seedLiterature(repository, { id: 'LIT-RATED', doiNormalized: '10.1000/oa-429' });
  await seedLiterature(repository, { id: 'LIT-NOOA', doiNormalized: '10.1000/oa-none' });

  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    if (url.includes(encodeURIComponent('10.1000/oa-ok'))) {
      return new Response(JSON.stringify({ best_oa_location: { url_for_pdf: 'https://oa.example.org/ok.pdf' } }), { status: 200 });
    }
    if (url.includes(encodeURIComponent('10.1000/oa-429'))) {
      return new Response('rate limited', { status: 429 });
    }
    return new Response(JSON.stringify({ best_oa_location: {}, oa_locations: [] }), { status: 200 });
  }) as typeof fetch;

  const created = await service.createJob({ workset: { literature_ids: ['LIT-OA', 'LIT-RATED', 'LIT-NOOA'] } });
  await waitForJobStatus(repository, created.job.job_id, ['PARTIAL']);

  const { job } = await service.getJob(created.job.job_id);
  const ok = job.items?.find((entry) => entry.literature_id === 'LIT-OA');
  assert.equal(ok?.status, 'SUCCEEDED');
  assert.equal(ok?.source_url, 'https://oa.example.org/ok.pdf');
  assert.equal(literatureService.calls.find((call) => call.literatureId === 'LIT-OA')?.options.source_url, 'https://oa.example.org/ok.pdf');

  const rated = job.items?.find((entry) => entry.literature_id === 'LIT-RATED');
  assert.equal(rated?.status, 'FAILED');
  assert.equal(rated?.error_code, 'SOURCE_RATE_LIMIT');
  assert.equal(rated?.retryable, true);
  const unpaywallState = await repository.findSourceRuntimeState('unpaywall');
  assert.equal(unpaywallState?.status, 'COOLDOWN');

  const noOa = job.items?.find((entry) => entry.literature_id === 'LIT-NOOA');
  assert.equal(noOa?.status, 'FAILED');
  assert.equal(noOa?.error_code, 'UNPAYWALL_NO_OA_PDF');
  assert.equal(noOa?.retryable, false);
  assert.equal(noOa?.blocker_code, 'UNPAYWALL_NO_OA_PDF');
});

test('a job whose items are all blocked finalizes as FAILED without touching the downloader', async () => {
  const repository = new InMemoryLiteratureRepository();
  const literatureService = makeLiteratureServiceStub();
  const service = new LiteratureFulltextAcquisitionService(
    repository,
    literatureService,
    makeSettingsStub(),
  );
  await seedLiterature(repository, { id: 'LIT-ONLY-RESTRICTED', rightsClass: 'RESTRICTED' });

  const created = await service.createJob({ workset: { literature_ids: ['LIT-ONLY-RESTRICTED'] } });
  await waitForJobStatus(repository, created.job.job_id, ['FAILED']);

  const { job } = await service.getJob(created.job.job_id);
  assert.equal(job.totals.blocked, 1);
  assert.equal(job.items?.[0]?.status, 'BLOCKED');
  assert.equal(job.items?.[0]?.blocker_code, 'RIGHTS_RESTRICTED');
  assert.equal(literatureService.calls.length, 0);

  // deleteJob guard: a non-terminal job refuses deletion.
  const held = deferred<void>();
  const holdService = new LiteratureFulltextAcquisitionService(
    repository,
    makeLiteratureServiceStub(async (literatureId) => {
      await held.promise;
      return successDownload()(literatureId, {});
    }),
    makeSettingsStub(),
  );
  await seedLiterature(repository, { id: 'LIT-DELETE-GUARD', arxivId: '2401.00091' });
  const running = await holdService.createJob({ workset: { literature_ids: ['LIT-DELETE-GUARD'] } });
  await waitForJobStatus(repository, running.job.job_id, ['RUNNING']);
  await assert.rejects(
    holdService.deleteJob(running.job.job_id),
    (error: unknown) => error instanceof AppError && error.statusCode === 409,
  );
  held.resolve();
  await waitForJobStatus(repository, running.job.job_id, ['SUCCEEDED']);
});
