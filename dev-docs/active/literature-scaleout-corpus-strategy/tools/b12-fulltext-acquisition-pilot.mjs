import fs from 'node:fs/promises';
import path from 'node:path';

import { getPrismaClient } from '../../../../apps/backend/src/repositories/prisma/prisma-client.ts';
import { PrismaApplicationSettingsRepository } from '../../../../apps/backend/src/repositories/prisma/prisma-application-settings-repository.ts';
import { PrismaLiteratureRepository } from '../../../../apps/backend/src/repositories/prisma/prisma-literature-repository.ts';
import { PrismaResearchLifecycleRepository } from '../../../../apps/backend/src/repositories/prisma/prisma-research-lifecycle-repository.ts';
import { LiteratureAcquisitionSettingsService } from '../../../../apps/backend/src/services/literature-acquisition-settings-service.ts';
import { LiteratureContentProcessingSettingsService } from '../../../../apps/backend/src/services/literature-content-processing-settings-service.ts';
import { LiteratureFlowService } from '../../../../apps/backend/src/services/literature-flow-service.ts';
import { LiteratureFulltextAcquisitionService } from '../../../../apps/backend/src/services/literature-fulltext-acquisition-service.ts';
import { LiteratureService } from '../../../../apps/backend/src/services/literature-service.ts';

process.env.RESEARCH_LIFECYCLE_REPOSITORY ??= 'prisma';
process.env.TITLE_CARD_REPOSITORY ??= process.env.RESEARCH_LIFECYCLE_REPOSITORY;
process.env.AUTO_PULL_REPOSITORY ??= process.env.RESEARCH_LIFECYCLE_REPOSITORY;
process.env.APPLICATION_SETTINGS_REPOSITORY ??= process.env.RESEARCH_LIFECYCLE_REPOSITORY;
process.env.EXPERIMENT_FOUNDATION_REPOSITORY ??= process.env.RESEARCH_LIFECYCLE_REPOSITORY;
process.env.PAPER_IMPLEMENTATION_REPOSITORY ??= process.env.RESEARCH_LIFECYCLE_REPOSITORY;

const TASK_DIR = 'dev-docs/active/literature-scaleout-corpus-strategy';
const OUT_DIR = path.join(TASK_DIR, 'artifacts');
const TMP_DIR = '.ai/.tmp/literature-scaleout-corpus-strategy';

const APPLY = process.argv.includes('--apply');
const runId = readArg('--run-id', process.env.B12_ACQUISITION_RUN_ID ?? new Date().toISOString().replace(/[:.]/g, '-'));
const batchIdFilter = readArg('--batch-id', process.env.B12_BATCH_ID ?? '');
const batchCodeFilter = readArg('--batch-code', process.env.B12_BATCH_CODE ?? '');
const explicitLiteratureIds = readCsvArg('--literature-ids', process.env.B12_LITERATURE_IDS ?? '');
const explicitUrls = readExplicitUrls(process.env.B12_EXPLICIT_URLS ?? '');
const maxRecords = readInteger('B12_MAX_RECORDS', 10, { min: 1, max: 120 });
const maxParallelDownloads = readInteger('B12_ACQUISITION_MAX_PARALLEL_DOWNLOADS', 1, { min: 1, max: 4 });
const providerCallBudget = readNullableInteger('B12_ACQUISITION_PROVIDER_CALL_BUDGET', 20, { min: 1, max: 500 });
const maxByteSize = readNullableInteger('B12_ACQUISITION_MAX_BYTE_SIZE', null, { min: 1, max: 500 * 1024 * 1024 });
const forceRefresh = readBoolean('B12_ACQUISITION_FORCE_REFRESH', false);
const pollIntervalMs = readInteger('B12_ACQUISITION_POLL_INTERVAL_MS', 500, { min: 100, max: 10000 });
const pollTimeoutMs = readInteger('B12_ACQUISITION_POLL_TIMEOUT_MS', 300000, { min: 1000, max: 1800000 });
const TERMINAL_JOB_STATUSES = new Set(['SUCCEEDED', 'PARTIAL', 'FAILED', 'CANCELED']);

function readArg(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index >= 0 && process.argv[index + 1]) {
    return process.argv[index + 1];
  }
  return fallback;
}

function readCsvArg(name, fallback) {
  return readArg(name, fallback)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function readExplicitUrls(raw) {
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const separatorIndex = item.indexOf('=');
      if (separatorIndex <= 0 || separatorIndex >= item.length - 1) {
        throw new Error('B12_EXPLICIT_URLS entries must use literature_id=source_url.');
      }
      return {
        literature_id: item.slice(0, separatorIndex).trim(),
        source_url: item.slice(separatorIndex + 1).trim(),
      };
    });
}

function readInteger(name, fallback, options) {
  const raw = process.env[name];
  const parsed = raw ? Number.parseInt(raw, 10) : fallback;
  const value = Number.isFinite(parsed) ? parsed : fallback;
  return Math.max(options.min, Math.min(options.max, value));
}

function readNullableInteger(name, fallback, options) {
  const raw = process.env[name];
  if (!raw && fallback === null) {
    return null;
  }
  const parsed = raw ? Number.parseInt(raw, 10) : fallback;
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(options.min, Math.min(options.max, parsed));
}

function readBoolean(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined) {
    return fallback;
  }
  return ['1', 'true', 'yes', 'on'].includes(raw.trim().toLowerCase());
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function compactEstimate(estimate) {
  return {
    dry_run_id: estimate.dry_run_id,
    generated_at: estimate.generated_at,
    total_literatures: estimate.total_literatures,
    selected_count: estimate.selected_count,
    planned_item_count: estimate.planned_item_count,
    skipped_existing_asset_count: estimate.skipped_existing_asset_count,
    blocked_count: estimate.blocked_count,
    source_counts: estimate.source_counts,
    estimated_provider_calls: estimate.estimated_provider_calls,
    blockers: estimate.blockers,
    plan_items: estimate.plan_items.map((item) => ({
      literature_id: item.literature_id,
      title: item.title,
      rights_class: item.rights_class,
      selected_source_kind: item.selected_source_kind,
      source_url: item.source_url,
      blocked: item.blocked,
      blocker_code: item.blocker_code,
      blocker_message: item.blocker_message,
      retryable: item.retryable,
      candidates: item.candidates,
    })),
  };
}

function compactJob(job) {
  return {
    job_id: job.job_id,
    status: job.status,
    totals: job.totals,
    error_code: job.error_code,
    error_message: job.error_message,
    created_at: job.created_at,
    started_at: job.started_at,
    finished_at: job.finished_at,
    source_health: job.source_health,
    items: (job.items ?? []).map((item) => ({
      item_id: item.item_id,
      literature_id: item.literature_id,
      status: item.status,
      selected_source_kind: item.selected_source_kind,
      source_url: item.source_url,
      final_url: item.final_url,
      content_asset_id: item.content_asset_id,
      attempt_count: item.attempt_count,
      error_code: item.error_code,
      error_message: item.error_message,
      blocker_code: item.blocker_code,
      retryable: item.retryable,
    })),
  };
}

function countBy(items, resolveKey) {
  const counts = new Map();
  for (const item of items) {
    const key = resolveKey(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort());
}

async function writeArtifact(name, payload) {
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.mkdir(TMP_DIR, { recursive: true });
  const reportPath = path.join(OUT_DIR, `${name}.json`);
  const detailPath = path.join(TMP_DIR, `${name}-detail.json`);
  await fs.writeFile(reportPath, `${JSON.stringify(payload.report, null, 2)}\n`);
  await fs.writeFile(detailPath, `${JSON.stringify(payload.detail ?? payload.report, null, 2)}\n`);
  return { report_path: reportPath, detail_path: detailPath };
}

async function listTargetLiteratureIds(prisma) {
  if (explicitLiteratureIds.length > 0) {
    return explicitLiteratureIds;
  }

  const candidates = await prisma.literatureDiscoveryCandidate.findMany({
    where: {
      status: 'PROMOTED',
      promotedLiteratureId: { not: null },
      ...(batchIdFilter ? { batchId: batchIdFilter } : {}),
      ...(batchCodeFilter ? { batch: { batchCode: batchCodeFilter } } : {}),
    },
    select: {
      promotedLiteratureId: true,
      decisionAt: true,
      createdAt: true,
    },
    orderBy: [
      { decisionAt: 'asc' },
      { createdAt: 'asc' },
    ],
    take: maxRecords,
  });
  return [...new Set(candidates.map((candidate) => candidate.promotedLiteratureId).filter(Boolean))];
}

async function waitForJob(service, jobId) {
  const started = Date.now();
  while (Date.now() - started <= pollTimeoutMs) {
    const response = await service.getJob(jobId);
    if (TERMINAL_JOB_STATUSES.has(response.job.status)) {
      return { job: response.job, timed_out: false };
    }
    await sleep(pollIntervalMs);
  }
  const response = await service.getJob(jobId);
  return { job: response.job, timed_out: true };
}

async function main() {
  const prisma = getPrismaClient();
  const literatureRepository = new PrismaLiteratureRepository(prisma);
  const lifecycleRepository = new PrismaResearchLifecycleRepository(prisma);
  const settingsRepository = new PrismaApplicationSettingsRepository(prisma);
  const acquisitionSettingsService = new LiteratureAcquisitionSettingsService(settingsRepository);
  const contentProcessingSettingsService = new LiteratureContentProcessingSettingsService(settingsRepository);
  const flowService = new LiteratureFlowService(literatureRepository, contentProcessingSettingsService);
  const literatureService = new LiteratureService(
    literatureRepository,
    lifecycleRepository,
    contentProcessingSettingsService,
    {
      literatureFlowService: flowService,
      literatureAcquisitionSettingsService: acquisitionSettingsService,
    },
  );
  const acquisitionService = new LiteratureFulltextAcquisitionService(
    literatureRepository,
    literatureService,
    acquisitionSettingsService,
    { pollIntervalMs },
  );

  const literatureIds = await listTargetLiteratureIds(prisma);
  const request = {
    workset: {
      literature_ids: literatureIds,
      only_missing_assets: true,
      ...(explicitUrls.length > 0 ? { explicit_urls: explicitUrls } : {}),
    },
    options: {
      max_parallel_downloads: maxParallelDownloads,
      provider_call_budget: providerCallBudget,
      ...(maxByteSize === null ? {} : { max_byte_size: maxByteSize }),
      force_refresh: forceRefresh,
    },
  };
  const dryRun = await acquisitionService.dryRun(request);
  let jobResult = null;
  if (APPLY) {
    const created = await acquisitionService.createJob(request);
    const completed = await waitForJob(acquisitionService, created.job.job_id);
    jobResult = {
      timed_out: completed.timed_out,
      job: compactJob(completed.job),
    };
  }

  await prisma.$disconnect();

  const items = jobResult?.job.items ?? [];
  const report = {
    run_id: runId,
    generated_at: new Date().toISOString(),
    mode: APPLY ? 'apply' : 'dry-run',
    selection: {
      batch_id_filter: batchIdFilter || null,
      batch_code_filter: batchCodeFilter || null,
      explicit_literature_ids: explicitLiteratureIds,
      selected_literature_ids: literatureIds,
      max_records: maxRecords,
      explicit_url_count: explicitUrls.length,
    },
    acquisition: {
      max_parallel_downloads: maxParallelDownloads,
      provider_call_budget: providerCallBudget,
      max_byte_size: maxByteSize,
      force_refresh: forceRefresh,
      poll_interval_ms: pollIntervalMs,
      poll_timeout_ms: pollTimeoutMs,
      writes_enabled: APPLY,
    },
    dry_run_estimate: compactEstimate(dryRun.estimate),
    summary: {
      dry_run_selected_count: dryRun.estimate.selected_count,
      dry_run_planned_item_count: dryRun.estimate.planned_item_count,
      dry_run_blocked_count: dryRun.estimate.blocked_count,
      dry_run_source_counts: dryRun.estimate.source_counts,
      job_status: jobResult?.job.status ?? null,
      job_totals: jobResult?.job.totals ?? null,
      timed_out: jobResult?.timed_out ?? false,
      item_status_counts: countBy(items, (item) => item.status),
      item_error_counts: countBy(items.filter((item) => item.error_code), (item) => item.error_code),
      content_assets_created: items.filter((item) => item.content_asset_id).length,
    },
    job: jobResult,
  };

  const artifact = await writeArtifact(`${runId}-b12-fulltext-acquisition-pilot-report`, {
    report,
    detail: report,
  });

  console.log(JSON.stringify({
    ...artifact,
    mode: report.mode,
    selection: report.selection,
    acquisition: report.acquisition,
    summary: report.summary,
  }, null, 2));
}

await main();
