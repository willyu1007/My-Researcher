import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';

import { getPrismaClient } from '../../../../apps/backend/src/repositories/prisma/prisma-client.ts';
import { PrismaApplicationSettingsRepository } from '../../../../apps/backend/src/repositories/prisma/prisma-application-settings-repository.ts';
import { PrismaLiteratureRepository } from '../../../../apps/backend/src/repositories/prisma/prisma-literature-repository.ts';
import { LiteratureBackfillService } from '../../../../apps/backend/src/services/literature-backfill-service.ts';
import { LiteratureContentProcessingSettingsService } from '../../../../apps/backend/src/services/literature-content-processing-settings-service.ts';
import { LiteratureFlowService } from '../../../../apps/backend/src/services/literature-flow-service.ts';

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
const runId = readArg('--run-id', process.env.B12_BACKFILL_RUN_ID ?? new Date().toISOString().replace(/[:.]/g, '-'));
const batchIdFilter = readArg('--batch-id', process.env.B12_BATCH_ID ?? '');
const batchCodeFilter = readArg('--batch-code', process.env.B12_BATCH_CODE ?? '');
const explicitLiteratureIds = readCsvArg('--literature-ids', process.env.B12_LITERATURE_IDS ?? '');
const targetStage = readArg('--target-stage', process.env.B12_BACKFILL_TARGET_STAGE ?? 'INDEXED');
const maxRecords = readInteger('B12_MAX_RECORDS', 10, { min: 1, max: 120 });
const maxParallelLiteratureRuns = readInteger('B12_BACKFILL_MAX_PARALLEL_LITERATURE_RUNS', 1, { min: 1, max: 4 });
const extractionConcurrency = readInteger('B12_BACKFILL_EXTRACTION_CONCURRENCY', 1, { min: 1, max: 4 });
const embeddingConcurrency = readInteger('B12_BACKFILL_EMBEDDING_CONCURRENCY', 1, { min: 1, max: 4 });
const sectionConcurrency = readNullableInteger('B12_BACKFILL_SECTION_CONCURRENCY', 1, { min: 1, max: 8 });
const extractionRequestTimeoutMs = readNullableInteger('B12_BACKFILL_EXTRACTION_REQUEST_TIMEOUT_MS', null, {
  min: 1000,
  max: 600000,
});
const extractionMaxRetries = readNullableInteger('B12_BACKFILL_EXTRACTION_MAX_RETRIES', null, {
  min: 0,
  max: 3,
});
const contentRunTimeoutMs = readNullableInteger('B12_BACKFILL_CONTENT_RUN_TIMEOUT_MS', null, {
  min: 1000,
  max: 7200000,
});
const providerCallBudget = readNullableInteger('B12_BACKFILL_PROVIDER_CALL_BUDGET', 30, { min: 1, max: 500 });
const pollIntervalMs = readInteger('B12_BACKFILL_POLL_INTERVAL_MS', 500, { min: 100, max: 10000 });
const pollTimeoutMs = readInteger('B12_BACKFILL_POLL_TIMEOUT_MS', 1800000, { min: 1000, max: 7200000 });
const terminalJobStatuses = new Set(['SUCCEEDED', 'PARTIAL', 'FAILED', 'CANCELED']);
const terminalPipelineRunStatuses = new Set(['SUCCESS', 'PARTIAL', 'FAILED', 'SKIPPED']);

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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function compactEstimate(estimate) {
  return {
    dry_run_id: estimate.dry_run_id,
    generated_at: estimate.generated_at,
    target_stage: estimate.target_stage,
    total_literatures: estimate.total_literatures,
    selected_count: estimate.selected_count,
    planned_item_count: estimate.planned_item_count,
    skipped_ready_count: estimate.skipped_ready_count,
    blocked_count: estimate.blocked_count,
    curation_required_count: estimate.curation_required_count,
    stage_counts: estimate.stage_counts,
    rights_class_counts: estimate.rights_class_counts,
    estimated_provider_calls: estimate.estimated_provider_calls,
    estimated_storage_bytes: estimate.estimated_storage_bytes,
    blockers: estimate.blockers,
    plan_items: estimate.plan_items,
  };
}

function compactJob(job) {
  return {
    job_id: job.job_id,
    status: job.status,
    target_stage: job.target_stage,
    options: job.options,
    totals: job.totals,
    error_code: job.error_code,
    error_message: job.error_message,
    created_at: job.created_at,
    started_at: job.started_at,
    finished_at: job.finished_at,
    items: (job.items ?? []).map((item) => ({
      item_id: item.item_id,
      literature_id: item.literature_id,
      title: item.title,
      status: item.status,
      requested_stages: item.requested_stages,
      next_stage_index: item.next_stage_index,
      content_processing_run_id: item.content_processing_run_id,
      attempt_count: item.attempt_count,
      error_code: item.error_code,
      error_message: item.error_message,
      blocker_code: item.blocker_code,
      retryable: item.retryable,
      key_content_curation_status: item.key_content_curation_status,
      checkpoint: item.checkpoint,
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

function estimateProviderRetryWindowMs(requestTimeoutMs, maxRetries) {
  const attempts = Math.max(1, maxRetries + 1);
  let retryDelayMs = 0;
  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    retryDelayMs += Math.min(250 * (2 ** attempt), 1000);
  }
  return requestTimeoutMs * attempts + retryDelayMs;
}

function isContentRunTimeoutItem(item) {
  return item
    && item.status === 'FAILED'
    && item.content_processing_run_id
    && item.error_code === 'BACKFILL_ITEM_WORKER_FAILED'
    && typeof item.error_message === 'string'
    && item.error_message.includes('Timed out after')
    && item.error_message.includes('waiting for content-processing run');
}

function readCurrentStage(item) {
  const checkpointStage = item.checkpoint && typeof item.checkpoint === 'object' && !Array.isArray(item.checkpoint)
    ? item.checkpoint.current_stage
    : null;
  if (typeof checkpointStage === 'string' && checkpointStage.trim()) {
    return checkpointStage;
  }
  if (Array.isArray(item.requested_stages) && item.requested_stages.length > 0) {
    return item.requested_stages[Math.min(item.next_stage_index ?? 0, item.requested_stages.length - 1)];
  }
  return null;
}

async function terminalizeTimedOutPipelineRuns(prisma, job) {
  const timeoutItems = (job.items ?? []).filter(isContentRunTimeoutItem);
  const results = [];
  for (const item of timeoutItems) {
    const runId = item.content_processing_run_id;
    const stageCode = readCurrentStage(item);
    const now = new Date().toISOString();
    const errorCode = 'B12_BACKFILL_CONTENT_RUN_TIMEOUT';
    const errorMessage =
      `B12 content backfill timed out after the configured content-run timeout for ${item.literature_id}; `
      + 'the pilot runner terminalized the dangling pipeline run.';
    const run = await prisma.literaturePipelineRun.findUnique({
      where: { id: runId },
      select: { id: true, literatureId: true, status: true },
    });
    if (!run) {
      results.push({
        literature_id: item.literature_id,
        content_processing_run_id: runId,
        terminalized: false,
        reason: 'pipeline_run_not_found',
      });
      continue;
    }

    if (terminalPipelineRunStatuses.has(run.status)) {
      results.push({
        literature_id: item.literature_id,
        content_processing_run_id: runId,
        terminalized: false,
        previous_run_status: run.status,
        reason: 'pipeline_run_already_terminal',
      });
      continue;
    }

    const steps = await prisma.literaturePipelineRunStep.findMany({
      where: {
        runId,
        ...(stageCode ? { stageCode } : {}),
      },
      select: { id: true },
    });

    await prisma.$transaction(async (tx) => {
      await Promise.all(steps.map((step) => tx.literaturePipelineRunStep.update({
        where: { id: step.id },
        data: {
          status: 'FAILED',
          errorCode,
          errorMessage,
          finishedAt: now,
        },
      })));

      if (stageCode) {
        await tx.literaturePipelineStageState.upsert({
          where: {
            literatureId_stageCode: {
              literatureId: item.literature_id,
              stageCode,
            },
          },
          create: {
            id: crypto.randomUUID(),
            literatureId: item.literature_id,
            stageCode,
            status: 'FAILED',
            lastRunId: runId,
            detail: {
              stage_code: stageCode,
              reason_code: errorCode,
              reason_message: errorMessage,
              timed_out_at: now,
              terminalized_by: 'b12-content-backfill-pilot',
            },
            updatedAt: now,
          },
          update: {
            status: 'FAILED',
            lastRunId: runId,
            detail: {
              stage_code: stageCode,
              reason_code: errorCode,
              reason_message: errorMessage,
              timed_out_at: now,
              terminalized_by: 'b12-content-backfill-pilot',
            },
            updatedAt: now,
          },
        });
      }

      await tx.literaturePipelineRun.update({
        where: { id: runId },
        data: {
          status: 'FAILED',
          errorCode,
          errorMessage,
          finishedAt: now,
          updatedAt: now,
        },
      });
    });

    results.push({
      literature_id: item.literature_id,
      stage_code: stageCode,
      content_processing_run_id: runId,
      terminalized: true,
      previous_run_status: run.status,
      step_count: steps.length,
      error_code: errorCode,
    });
  }
  return results;
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
    if (terminalJobStatuses.has(response.job.status)) {
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
  const settingsRepository = new PrismaApplicationSettingsRepository(prisma);
  const contentProcessingSettingsService = new LiteratureContentProcessingSettingsService(settingsRepository);
  const resolveExtractionConfig = contentProcessingSettingsService.resolveExtractionConfig.bind(contentProcessingSettingsService);
  contentProcessingSettingsService.resolveExtractionConfig = async () => {
    const config = await resolveExtractionConfig();
    return {
      ...config,
      runtime: {
        ...config.runtime,
        ...(sectionConcurrency === null ? {} : { section_concurrency: sectionConcurrency }),
        ...(extractionRequestTimeoutMs === null ? {} : { request_timeout_ms: extractionRequestTimeoutMs }),
        ...(extractionMaxRetries === null ? {} : { max_retries: extractionMaxRetries }),
      },
    };
  };
  const effectiveExtractionConfig = await contentProcessingSettingsService.resolveExtractionConfig();
  const providerRetryWindowMs = estimateProviderRetryWindowMs(
    effectiveExtractionConfig.runtime.request_timeout_ms,
    effectiveExtractionConfig.runtime.max_retries,
  );
  const timeoutBudget = {
    effective_request_timeout_ms: effectiveExtractionConfig.runtime.request_timeout_ms,
    effective_max_retries: effectiveExtractionConfig.runtime.max_retries,
    estimated_single_section_retry_window_ms: providerRetryWindowMs,
    content_run_timeout_ms: contentRunTimeoutMs,
    content_run_timeout_margin_ms: contentRunTimeoutMs === null ? null : contentRunTimeoutMs - providerRetryWindowMs,
    warning: contentRunTimeoutMs !== null && contentRunTimeoutMs <= providerRetryWindowMs
      ? 'CONTENT_RUN_TIMEOUT_NOT_ABOVE_SINGLE_SECTION_PROVIDER_RETRY_WINDOW'
      : null,
  };
  const flowService = new LiteratureFlowService(literatureRepository, contentProcessingSettingsService);
  const backfillService = new LiteratureBackfillService(
    literatureRepository,
    flowService,
    {
      pollIntervalMs,
      ...(contentRunTimeoutMs === null ? {} : { contentRunTimeoutMs }),
      resolvePreferredKeyContentMethod: () => contentProcessingSettingsService.resolvePreferredKeyContentMethod(),
    },
  );

  const literatureIds = await listTargetLiteratureIds(prisma);
  const request = {
    target_stage: targetStage,
    workset: {
      literature_ids: literatureIds,
      stage_filters: {
        missing: true,
        stale: true,
        failed: true,
      },
    },
    options: {
      max_parallel_literature_runs: maxParallelLiteratureRuns,
      extraction_concurrency: extractionConcurrency,
      embedding_concurrency: embeddingConcurrency,
      section_concurrency: sectionConcurrency,
      extraction_request_timeout_ms: extractionRequestTimeoutMs,
      extraction_max_retries: extractionMaxRetries,
      provider_call_budget: providerCallBudget,
    },
  };
  const dryRun = await backfillService.dryRun(request);
  let jobResult = null;
  let timeoutCleanup = [];
  if (APPLY) {
    const created = await backfillService.createJob(request);
    const completed = await waitForJob(backfillService, created.job.job_id);
    timeoutCleanup = await terminalizeTimedOutPipelineRuns(prisma, completed.job);
    jobResult = {
      timed_out: completed.timed_out,
      job: compactJob(completed.job),
      timeout_cleanup: timeoutCleanup,
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
    },
    backfill: {
      target_stage: targetStage,
      max_parallel_literature_runs: maxParallelLiteratureRuns,
      extraction_concurrency: extractionConcurrency,
      embedding_concurrency: embeddingConcurrency,
      section_concurrency: sectionConcurrency,
      extraction_request_timeout_ms: extractionRequestTimeoutMs,
      extraction_max_retries: extractionMaxRetries,
      content_run_timeout_ms: contentRunTimeoutMs,
      timeout_budget: timeoutBudget,
      provider_call_budget: providerCallBudget,
      poll_interval_ms: pollIntervalMs,
      poll_timeout_ms: pollTimeoutMs,
      writes_enabled: APPLY,
    },
    dry_run_estimate: compactEstimate(dryRun.estimate),
    summary: {
      dry_run_selected_count: dryRun.estimate.selected_count,
      dry_run_planned_item_count: dryRun.estimate.planned_item_count,
      dry_run_blocked_count: dryRun.estimate.blocked_count,
      dry_run_stage_counts: dryRun.estimate.stage_counts,
      estimated_provider_calls: dryRun.estimate.estimated_provider_calls,
      job_status: jobResult?.job.status ?? null,
      job_totals: jobResult?.job.totals ?? null,
      timed_out: jobResult?.timed_out ?? false,
      timeout_cleanup_count: timeoutCleanup.length,
      timeout_cleanup_terminalized_runs: timeoutCleanup.filter((item) => item.terminalized).length,
      item_status_counts: countBy(items, (item) => item.status),
      item_error_counts: countBy(items.filter((item) => item.error_code), (item) => item.error_code),
    },
    job: jobResult,
  };

  const artifact = await writeArtifact(`${runId}-b12-content-backfill-pilot-report`, {
    report,
    detail: report,
  });

  console.log(JSON.stringify({
    ...artifact,
    mode: report.mode,
    selection: report.selection,
    backfill: report.backfill,
    summary: report.summary,
  }, null, 2));

  if (timeoutCleanup.some((item) => item.terminalized)) {
    process.exit(0);
  }
}

await main();
