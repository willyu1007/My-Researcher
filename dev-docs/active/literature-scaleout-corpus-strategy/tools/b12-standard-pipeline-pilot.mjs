import fs from 'node:fs/promises';
import path from 'node:path';

import { getPrismaClient } from '../../../../apps/backend/src/repositories/prisma/prisma-client.ts';
import { PrismaApplicationSettingsRepository } from '../../../../apps/backend/src/repositories/prisma/prisma-application-settings-repository.ts';
import { PrismaLiteratureRepository } from '../../../../apps/backend/src/repositories/prisma/prisma-literature-repository.ts';
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

const STAGES = [
  'CITATION_NORMALIZED',
  'ABSTRACT_READY',
  'FULLTEXT_PREPROCESSED',
  'KEY_CONTENT_READY',
  'CHUNKED',
  'EMBEDDED',
  'INDEXED',
];

const APPLY = process.argv.includes('--apply');
const runId = readArg('--run-id', process.env.B12_PIPELINE_RUN_ID ?? new Date().toISOString().replace(/[:.]/g, '-'));
const batchIdFilter = readArg('--batch-id', process.env.B12_BATCH_ID ?? '');
const batchCodeFilter = readArg('--batch-code', process.env.B12_BATCH_CODE ?? '');
const explicitLiteratureIds = readCsvArg('--literature-ids', process.env.B12_LITERATURE_IDS ?? '');
const requestedStages = readStages('--stages', process.env.B12_STAGES ?? 'CITATION_NORMALIZED,ABSTRACT_READY,FULLTEXT_PREPROCESSED');
const maxRecords = readInteger('B12_MAX_RECORDS', 10, { min: 1, max: 120 });
const pollIntervalMs = readInteger('B12_POLL_INTERVAL_MS', 250, { min: 50, max: 5000 });
const pollTimeoutMs = readInteger('B12_POLL_TIMEOUT_MS', 60000, { min: 1000, max: 600000 });

const TERMINAL_RUN_STATUSES = new Set(['SUCCESS', 'PARTIAL', 'FAILED', 'SKIPPED']);

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

function readStages(name, fallback) {
  const stages = readCsvArg(name, fallback);
  const invalid = stages.filter((stage) => !STAGES.includes(stage));
  if (invalid.length > 0) {
    throw new Error(`Unsupported B12 stage(s): ${invalid.join(', ')}`);
  }
  return [...new Set(stages)].sort((left, right) => STAGES.indexOf(left) - STAGES.indexOf(right));
}

function readInteger(name, fallback, options) {
  const raw = process.env[name];
  const parsed = raw ? Number.parseInt(raw, 10) : fallback;
  const value = Number.isFinite(parsed) ? parsed : fallback;
  return Math.max(options.min, Math.min(options.max, value));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stageStatus(row, stageCode) {
  return row.pipelineStageStates.find((state) => state.stageCode === stageCode)?.status ?? 'NOT_STARTED';
}

function stageDetail(row, stageCode) {
  return row.pipelineStageStates.find((state) => state.stageCode === stageCode)?.detail ?? {};
}

function firstBlocker(row) {
  for (const stageCode of STAGES) {
    const state = row.pipelineStageStates.find((item) => item.stageCode === stageCode);
    if (!state || (state.status !== 'FAILED' && state.status !== 'BLOCKED')) {
      continue;
    }
    const detail = state.detail && typeof state.detail === 'object' && !Array.isArray(state.detail)
      ? state.detail
      : {};
    const diagnostic = Array.isArray(detail.diagnostics)
      ? detail.diagnostics.find((item) => item && typeof item === 'object' && !Array.isArray(item))
      : null;
    return {
      stage_code: stageCode,
      status: state.status,
      reason_code: typeof detail.reason_code === 'string'
        ? detail.reason_code
        : typeof detail.error_code === 'string'
          ? detail.error_code
          : typeof diagnostic?.code === 'string'
            ? diagnostic.code
            : null,
      reason_message: typeof detail.reason_message === 'string'
        ? detail.reason_message
        : typeof detail.error_message === 'string'
          ? detail.error_message
          : typeof diagnostic?.message === 'string'
            ? diagnostic.message
            : null,
    };
  }
  return null;
}

function compactSource(source) {
  return {
    provider: source.provider,
    source_item_id: source.sourceItemId,
    source_url: source.sourceUrl,
  };
}

function compactLiterature(row, candidate = null) {
  return {
    literature_id: row.id,
    title: row.title,
    rights_class: row.rightsClass,
    tags: row.tags,
    candidate_id: candidate?.id ?? null,
    candidate_batch_id: candidate?.batchId ?? null,
    candidate_batch_code: candidate?.batch?.batchCode ?? null,
    source_count: row.sources.length,
    sources: row.sources.map(compactSource),
    content_asset_count: row.contentAssets.length,
    fulltext_document_count: row.fulltextDocuments.length,
    latest_runs: row.pipelineRuns.map((pipelineRun) => ({
      run_id: pipelineRun.id,
      trigger_source: pipelineRun.triggerSource,
      status: pipelineRun.status,
      requested_stages: pipelineRun.requestedStages,
      error_code: pipelineRun.errorCode,
      error_message: pipelineRun.errorMessage,
      created_at: pipelineRun.createdAt.toISOString(),
      finished_at: pipelineRun.finishedAt?.toISOString() ?? null,
    })),
    stages: Object.fromEntries(STAGES.map((stageCode) => [stageCode, stageStatus(row, stageCode)])),
    requested_stage_details: Object.fromEntries(requestedStages.map((stageCode) => [stageCode, stageDetail(row, stageCode)])),
    blocker: firstBlocker(row),
  };
}

function runSummary(run, steps) {
  return {
    run_id: run.id,
    literature_id: run.literatureId,
    trigger_source: run.triggerSource,
    status: run.status,
    requested_stages: run.requestedStages,
    error_code: run.errorCode,
    error_message: run.errorMessage,
    created_at: run.createdAt,
    started_at: run.startedAt,
    finished_at: run.finishedAt,
    updated_at: run.updatedAt,
    steps: steps.map((step) => ({
      step_id: step.id,
      stage_code: step.stageCode,
      status: step.status,
      error_code: step.errorCode,
      error_message: step.errorMessage,
      output_ref: step.outputRef,
      finished_at: step.finishedAt,
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

async function listTargets(prisma) {
  if (explicitLiteratureIds.length > 0) {
    const rows = await loadLiteratureRows(prisma, explicitLiteratureIds);
    const rowById = new Map(rows.map((row) => [row.id, row]));
    return explicitLiteratureIds
      .map((literatureId) => rowById.get(literatureId))
      .filter(Boolean)
      .map((literature) => ({ literature, candidate: null }));
  }

  const candidates = await prisma.literatureDiscoveryCandidate.findMany({
    where: {
      status: 'PROMOTED',
      promotedLiteratureId: { not: null },
      ...(batchIdFilter ? { batchId: batchIdFilter } : {}),
      ...(batchCodeFilter ? { batch: { batchCode: batchCodeFilter } } : {}),
    },
    select: {
      id: true,
      batchId: true,
      title: true,
      promotedLiteratureId: true,
      decisionAt: true,
      createdAt: true,
      batch: {
        select: {
          batchCode: true,
        },
      },
    },
    orderBy: [
      { decisionAt: 'asc' },
      { createdAt: 'asc' },
    ],
    take: maxRecords,
  });
  const literatureIds = [...new Set(candidates.map((candidate) => candidate.promotedLiteratureId).filter(Boolean))];
  const rows = await loadLiteratureRows(prisma, literatureIds);
  const rowById = new Map(rows.map((row) => [row.id, row]));
  return candidates
    .map((candidate) => ({
      candidate,
      literature: rowById.get(candidate.promotedLiteratureId),
    }))
    .filter((item) => item.literature);
}

async function loadLiteratureRows(prisma, literatureIds) {
  if (literatureIds.length === 0) {
    return [];
  }

  return prisma.literatureRecord.findMany({
    where: {
      id: {
        in: literatureIds,
      },
    },
    select: {
      id: true,
      title: true,
      abstractText: true,
      authors: true,
      year: true,
      rightsClass: true,
      tags: true,
      sources: {
        select: {
          provider: true,
          sourceItemId: true,
          sourceUrl: true,
        },
        orderBy: { fetchedAt: 'asc' },
      },
      contentAssets: {
        select: {
          id: true,
          assetKind: true,
          status: true,
        },
      },
      fulltextDocuments: {
        select: {
          id: true,
          status: true,
        },
      },
      pipelineStageStates: {
        select: {
          stageCode: true,
          status: true,
          detail: true,
          updatedAt: true,
        },
      },
      pipelineRuns: {
        select: {
          id: true,
          triggerSource: true,
          status: true,
          requestedStages: true,
          errorCode: true,
          errorMessage: true,
          createdAt: true,
          finishedAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 3,
      },
    },
  });
}

async function waitForRun(repository, pipelineRunId) {
  const started = Date.now();
  while (Date.now() - started <= pollTimeoutMs) {
    const run = await repository.findPipelineRunById(pipelineRunId);
    if (run && TERMINAL_RUN_STATUSES.has(run.status)) {
      const steps = await repository.listPipelineRunStepsByRunId(pipelineRunId);
      return { run, steps, timed_out: false };
    }
    await sleep(pollIntervalMs);
  }

  const run = await repository.findPipelineRunById(pipelineRunId);
  const steps = run ? await repository.listPipelineRunStepsByRunId(pipelineRunId) : [];
  return { run, steps, timed_out: true };
}

async function main() {
  const prisma = getPrismaClient();
  const repository = new PrismaLiteratureRepository(prisma);
  const settingsRepository = new PrismaApplicationSettingsRepository(prisma);
  const contentProcessingSettingsService = new LiteratureContentProcessingSettingsService(settingsRepository);
  const flowService = new LiteratureFlowService(repository, contentProcessingSettingsService);

  const beforeTargets = await listTargets(prisma);
  const before = beforeTargets.map((target) => compactLiterature(target.literature, target.candidate));
  const executions = [];

  if (APPLY) {
    for (const target of beforeTargets) {
      const trigger = await flowService.triggerContentProcessingRun(target.literature.id, requestedStages, 'BACKFILL');
      const completed = await waitForRun(repository, trigger.run_id);
      executions.push({
        literature_id: target.literature.id,
        candidate_id: target.candidate?.id ?? null,
        timed_out: completed.timed_out,
        run: completed.run ? runSummary(completed.run, completed.steps) : null,
      });
    }
  }

  const afterIds = beforeTargets.map((target) => target.literature.id);
  const afterRows = await loadLiteratureRows(prisma, afterIds);
  const afterById = new Map(afterRows.map((row) => [row.id, row]));
  const after = beforeTargets
    .map((target) => ({
      literature: afterById.get(target.literature.id),
      candidate: target.candidate,
    }))
    .filter((target) => target.literature)
    .map((target) => compactLiterature(target.literature, target.candidate));

  const requestedStageStatusCounts = Object.fromEntries(
    requestedStages.map((stageCode) => [
      stageCode,
      countBy(after, (row) => row.stages[stageCode] ?? 'NOT_STARTED'),
    ]),
  );
  const blockerCounts = countBy(after.filter((row) => row.blocker), (row) => row.blocker.reason_code ?? 'UNKNOWN');
  const report = {
    run_id: runId,
    generated_at: new Date().toISOString(),
    mode: APPLY ? 'apply' : 'dry-run',
    selection: {
      batch_id_filter: batchIdFilter || null,
      batch_code_filter: batchCodeFilter || null,
      explicit_literature_ids: explicitLiteratureIds,
      max_records: maxRecords,
      selected_records: before.length,
    },
    pipeline: {
      trigger_source: 'BACKFILL',
      requested_stages: requestedStages,
      poll_interval_ms: pollIntervalMs,
      poll_timeout_ms: pollTimeoutMs,
      writes_enabled: APPLY,
    },
    summary: {
      selected_records: before.length,
      pipeline_runs_created: executions.length,
      run_status_counts: countBy(executions, (execution) => execution.run?.status ?? 'NO_RUN'),
      timed_out_runs: executions.filter((execution) => execution.timed_out).length,
      requested_stage_status_counts: requestedStageStatusCounts,
      blocker_counts: blockerCounts,
      records_with_content_assets: after.filter((row) => row.content_asset_count > 0).length,
      records_with_fulltext_documents: after.filter((row) => row.fulltext_document_count > 0).length,
    },
    selected_literature: after,
    executions,
  };

  await prisma.$disconnect();

  const artifact = await writeArtifact(`${runId}-b12-standard-pipeline-pilot-report`, {
    report,
    detail: {
      before,
      after,
      executions,
      report,
    },
  });

  console.log(JSON.stringify({
    ...artifact,
    mode: report.mode,
    selection: report.selection,
    pipeline: report.pipeline,
    summary: report.summary,
  }, null, 2));
}

await main();
