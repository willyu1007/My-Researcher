import fs from 'node:fs/promises';
import path from 'node:path';
import { inspect } from 'node:util';

import { buildApp } from '../../../../apps/backend/src/app.ts';
import { getPrismaClient } from '../../../../apps/backend/src/repositories/prisma/prisma-client.ts';

process.env.RESEARCH_LIFECYCLE_REPOSITORY ??= 'prisma';
process.env.TITLE_CARD_REPOSITORY ??= process.env.RESEARCH_LIFECYCLE_REPOSITORY;
process.env.AUTO_PULL_REPOSITORY ??= process.env.RESEARCH_LIFECYCLE_REPOSITORY;
process.env.APPLICATION_SETTINGS_REPOSITORY ??= process.env.RESEARCH_LIFECYCLE_REPOSITORY;
process.env.EXPERIMENT_FOUNDATION_REPOSITORY ??= process.env.RESEARCH_LIFECYCLE_REPOSITORY;
process.env.PAPER_IMPLEMENTATION_REPOSITORY ??= process.env.RESEARCH_LIFECYCLE_REPOSITORY;

const TASK_DIR = 'dev-docs/active/adaptive-llm-systems-literature-pipeline-completion';
const OUT_DIR = path.join(TASK_DIR, 'artifacts');
const TMP_DIR = '.ai/.tmp/adaptive-llm-systems-literature-pipeline-completion';
const POLL_MS = Number.parseInt(process.env.PIPELINE_CAMPAIGN_POLL_MS ?? '1000', 10);
const POLL_ATTEMPTS = Number.parseInt(process.env.PIPELINE_CAMPAIGN_POLL_ATTEMPTS ?? '240', 10);

const args = new Set(process.argv.slice(2));
const mode = process.argv.find((arg) => arg.startsWith('--mode='))?.slice('--mode='.length) ?? 'summary';
const limit = Number.parseInt(process.argv.find((arg) => arg.startsWith('--limit='))?.slice('--limit='.length) ?? '3', 10);
const literatureIdsArg = process.argv.find((arg) => arg.startsWith('--literature-ids='))?.slice('--literature-ids='.length);
const targetStage = process.argv.find((arg) => arg.startsWith('--target-stage='))?.slice('--target-stage='.length) ?? 'ABSTRACT_READY';
const selector = process.argv.find((arg) => arg.startsWith('--selector='))?.slice('--selector='.length) ?? 'priority-arxiv';
const apply = args.has('--apply');
const runId = process.env.PIPELINE_CAMPAIGN_RUN_ID ?? new Date().toISOString().replace(/[:.]/g, '-');

process.on('uncaughtException', (error) => {
  console.error('[pipeline-campaign-runner] uncaughtException');
  console.error(inspect(error, { depth: 8, colors: false }));
  process.exitCode = 1;
});

process.on('unhandledRejection', (error) => {
  console.error('[pipeline-campaign-runner] unhandledRejection');
  console.error(inspect(error, { depth: 8, colors: false }));
  process.exitCode = 1;
});

function hasCorpusTag(row) {
  return row.tags.some((tag) =>
    tag.startsWith('collection:')
    || tag.startsWith('direction:')
    || tag.startsWith('batch:')
  );
}

function isPriority(row, priorities) {
  return row.tags.some((tag) => priorities.includes(tag));
}

function sortTargets(left, right) {
  const leftScore = scoreTarget(left);
  const rightScore = scoreTarget(right);
  return rightScore - leftScore || left.id.localeCompare(right.id);
}

function scoreTarget(row) {
  let score = 0;
  if (row.arxivId) score += 20;
  if (row.rightsClass === 'OA') score += 10;
  if (row.tags.includes('priority:p0')) score += 9;
  if (row.tags.includes('priority:p1')) score += 7;
  if (row.tags.includes('priority:p2')) score += 3;
  if (row.tags.some((tag) => tag.includes('experiment-foundation'))) score += 5;
  if (row.tags.some((tag) => tag.startsWith('batch:b8') || tag.startsWith('batch:b7'))) score += 4;
  return score;
}

function compactTarget(row) {
  return {
    id: row.id,
    title: row.title,
    arxiv_id: row.arxivId,
    doi: row.doiNormalized,
    rights_class: row.rightsClass,
    priority_tags: row.tags.filter((tag) => tag.startsWith('priority:')),
    collection_tags: row.tags.filter((tag) => tag.startsWith('collection:')),
    direction_tags: row.tags.filter((tag) => tag.startsWith('direction:')),
    batch_tags: row.tags.filter((tag) => tag.startsWith('batch:')),
  };
}

async function request(app, method, url, payload) {
  const res = await app.inject({
    method,
    url,
    payload,
  });
  let body;
  try {
    body = JSON.parse(res.payload);
  } catch {
    body = res.payload;
  }
  if (res.statusCode >= 400) {
    throw new Error(`${method} ${url} failed: ${res.statusCode} ${JSON.stringify(body)}`);
  }
  return body;
}

async function waitForJob(app, baseUrl, jobId) {
  let last = null;
  for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt += 1) {
    const body = await request(app, 'GET', `${baseUrl}/${encodeURIComponent(jobId)}`);
    last = body.job;
    if (['SUCCEEDED', 'PARTIAL', 'FAILED', 'CANCELED'].includes(last.status)) {
      return last;
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
  return last;
}

async function countState(prisma) {
  const [
    records,
    sources,
    pipelineStates,
    stageStates,
    pipelineRuns,
    pipelineArtifacts,
    assets,
    fulltextDocs,
    embeddingVersions,
    embeddingChunks,
    tokenIndexes,
    processingJobs,
    processingItems,
    acquisitionJobs,
    acquisitionItems,
  ] = await Promise.all([
    prisma.literatureRecord.count(),
    prisma.literatureSource.count(),
    prisma.literaturePipelineState.count(),
    prisma.literaturePipelineStageState.count(),
    prisma.literaturePipelineRun.count(),
    prisma.literaturePipelineArtifact.count(),
    prisma.literatureContentAsset.count(),
    prisma.literatureFulltextDocument.count(),
    prisma.literatureEmbeddingVersion.count(),
    prisma.literatureEmbeddingChunk.count(),
    prisma.literatureEmbeddingTokenIndex.count(),
    prisma.literatureContentProcessingBatchJob.count(),
    prisma.literatureContentProcessingBatchItem.count(),
    prisma.literatureFulltextAcquisitionJob.count(),
    prisma.literatureFulltextAcquisitionItem.count(),
  ]);
  return {
    records,
    sources,
    pipelineStates,
    stageStates,
    pipelineRuns,
    pipelineArtifacts,
    assets,
    fulltextDocs,
    embeddingVersions,
    embeddingChunks,
    tokenIndexes,
    processingJobs,
    processingItems,
    acquisitionJobs,
    acquisitionItems,
  };
}

function delta(after, before) {
  return Object.fromEntries(Object.entries(after).map(([key, value]) => [key, value - before[key]]));
}

async function selectTargets(prisma) {
  const rows = await prisma.literatureRecord.findMany({
    select: {
      id: true,
      title: true,
      tags: true,
      rightsClass: true,
      arxivId: true,
      doiNormalized: true,
      contentAssets: { select: { id: true } },
      fulltextDocuments: { select: { id: true } },
      embeddingChunks: { select: { id: true }, take: 1 },
      pipelineStageStates: { select: { stageCode: true, status: true } },
    },
    orderBy: { id: 'asc' },
  });
  const corpus = rows.filter(hasCorpusTag);
  const explicitIds = literatureIdsArg
    ? new Set(literatureIdsArg.split(',').map((item) => item.trim()).filter(Boolean))
    : null;
  const canaryPool = corpus
    .filter((row) => {
      if (explicitIds) return explicitIds.has(row.id);
      if (selector === 'all-tagged') return true;
      if (selector === 'all-arxiv') return Boolean(row.arxivId);
      if (selector === 'oa-arxiv') return Boolean(row.arxivId) && row.rightsClass === 'OA';
      return row.arxivId && isPriority(row, ['priority:p0', 'priority:p1', 'priority:p2']);
    })
    .sort(sortTargets)
    .slice(0, Number.isFinite(limit) ? limit : 3);
  return { rows, corpus, canaryPool };
}

function summarizeTargets(corpus) {
  const byRights = new Map();
  const byCollection = new Map();
  const byDirection = new Map();
  const withArxiv = corpus.filter((row) => row.arxivId).length;
  const withAssets = corpus.filter((row) => row.contentAssets.length > 0).length;
  const withFulltextDocs = corpus.filter((row) => row.fulltextDocuments.length > 0).length;
  const withEmbeddings = corpus.filter((row) => row.embeddingChunks.length > 0).length;
  for (const row of corpus) {
    byRights.set(row.rightsClass, (byRights.get(row.rightsClass) ?? 0) + 1);
    for (const tag of row.tags) {
      if (tag.startsWith('collection:')) byCollection.set(tag, (byCollection.get(tag) ?? 0) + 1);
      if (tag.startsWith('direction:')) byDirection.set(tag, (byDirection.get(tag) ?? 0) + 1);
    }
  }
  return {
    corpus_count: corpus.length,
    with_arxiv_id: withArxiv,
    with_assets: withAssets,
    with_fulltext_docs: withFulltextDocs,
    with_embedding_chunks: withEmbeddings,
    by_rights: Object.fromEntries([...byRights.entries()].sort()),
    by_collection: Object.fromEntries([...byCollection.entries()].sort()),
    by_direction: Object.fromEntries([...byDirection.entries()].sort()),
  };
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

const prisma = getPrismaClient();
const before = await countState(prisma);
const { rows, corpus, canaryPool } = await selectTargets(prisma);
const app = buildApp();
await app.ready();

let result = {
  run_id: runId,
  mode,
  apply,
  selector,
  target_stage: targetStage,
  generated_at: new Date().toISOString(),
  before,
  target_summary: summarizeTargets(corpus),
  selected_targets: canaryPool.map(compactTarget),
};

try {
  if (mode === 'settings' || mode === 'summary') {
    const [contentSettings, parserHealth, acquisitionSettings] = await Promise.all([
      request(app, 'GET', '/settings/literature-content-processing'),
      request(app, 'GET', '/settings/literature-content-processing/fulltext-parser/health'),
      request(app, 'GET', '/settings/literature-acquisition'),
    ]);
    result = {
      ...result,
      total_records: rows.length,
      content_processing_settings: contentSettings,
      fulltext_parser_health: parserHealth,
      acquisition_settings: acquisitionSettings,
    };
  }

  if (mode === 'acquisition') {
    const payload = {
      workset: { literature_ids: canaryPool.map((row) => row.id), only_missing_assets: true },
      options: {
        max_parallel_downloads: 1,
        provider_call_budget: Number.parseInt(process.env.PIPELINE_CAMPAIGN_PROVIDER_BUDGET ?? '20', 10),
        max_byte_size: Number.parseInt(process.env.PIPELINE_CAMPAIGN_MAX_BYTE_SIZE ?? String(100 * 1024 * 1024), 10),
      },
    };
    const dryRun = await request(app, 'POST', '/literature/fulltext-acquisition/dry-runs', payload);
    result = { ...result, request_payload: payload, dry_run: dryRun };
    if (apply) {
      const created = await request(app, 'POST', '/literature/fulltext-acquisition/jobs', payload);
      const job = await waitForJob(app, '/literature/fulltext-acquisition/jobs', created.job.job_id);
      result = { ...result, created_job: created.job, final_job: job };
    }
  }

  if (mode === 'backfill') {
    const payload = {
      target_stage: targetStage,
      workset: {
        literature_ids: canaryPool.map((row) => row.id),
        stage_filters: { missing: true, stale: true, failed: true },
      },
      options: {
        max_parallel_literature_runs: 1,
        extraction_concurrency: 1,
        embedding_concurrency: 1,
        provider_call_budget: Number.parseInt(process.env.PIPELINE_CAMPAIGN_PROVIDER_BUDGET ?? '20', 10),
      },
    };
    const dryRun = await request(app, 'POST', '/literature/content-processing/backfill/dry-runs', payload);
    result = { ...result, request_payload: payload, dry_run: dryRun };
    if (apply) {
      const created = await request(app, 'POST', '/literature/content-processing/backfill/jobs', payload);
      const job = await waitForJob(app, '/literature/content-processing/backfill/jobs', created.job.job_id);
      result = { ...result, created_job: created.job, final_job: job };
    }
  }
} finally {
  await app.close();
}

const after = await countState(prisma);
await prisma.$disconnect();

result = {
  ...result,
  after,
  deltas: delta(after, before),
};

const artifact = await writeArtifact(`${runId}-${mode}${apply ? '-apply' : '-dry-run'}`, {
  report: {
    run_id: result.run_id,
    mode: result.mode,
    apply: result.apply,
    selector: result.selector,
    target_stage: result.target_stage,
    generated_at: result.generated_at,
    target_summary: result.target_summary,
    selected_targets: result.selected_targets,
    request_payload: result.request_payload,
    dry_run: result.dry_run,
    created_job: result.created_job,
    final_job: result.final_job,
    fulltext_parser_health: result.fulltext_parser_health,
    deltas: result.deltas,
  },
  detail: result,
});

console.log(JSON.stringify({ ...artifact, report: result.report, summary: result.target_summary, deltas: result.deltas }, null, 2));
