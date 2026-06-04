import fs from 'node:fs/promises';
import path from 'node:path';

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
const runId = process.env.PIPELINE_CAMPAIGN_RUN_ID ?? new Date().toISOString().replace(/[:.]/g, '-');

const STAGES = [
  'CITATION_NORMALIZED',
  'ABSTRACT_READY',
  'FULLTEXT_PREPROCESSED',
  'KEY_CONTENT_READY',
  'CHUNKED',
  'EMBEDDED',
  'INDEXED',
];

function hasCorpusTag(row) {
  return row.tags.some((tag) =>
    tag.startsWith('collection:')
    || tag.startsWith('direction:')
    || tag.startsWith('batch:')
  );
}

function stageStatus(row, stageCode) {
  return row.pipelineStageStates.find((state) => state.stageCode === stageCode)?.status ?? 'NOT_STARTED';
}

function countBy(items, resolveKey) {
  const counts = new Map();
  for (const item of items) {
    const key = resolveKey(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort());
}

function countTags(rows, prefix) {
  const counts = new Map();
  for (const row of rows) {
    for (const tag of row.tags) {
      if (tag.startsWith(prefix)) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
  }
  return Object.fromEntries([...counts.entries()].sort());
}

function nonCorpusBucket(row) {
  if (/^Topic Selection v1b API Evidence/i.test(row.title)) {
    return 'topic_selection_v1b_api_evidence';
  }
  if (/^Topic Selection v1b Harness Evidence/i.test(row.title)) {
    return 'topic_selection_v1b_harness_evidence';
  }
  if (/^Topic Selection/i.test(row.title)) {
    return 'topic_selection_other';
  }
  if (/^Evidence/i.test(row.title)) {
    return 'evidence_other';
  }
  return 'other_untagged';
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

function compactRecord(row) {
  return {
    literature_id: row.id,
    title: row.title,
    tags: row.tags,
    stages: Object.fromEntries(STAGES.map((stageCode) => [stageCode, stageStatus(row, stageCode)])),
    blocker: firstBlocker(row),
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
const rows = await prisma.literatureRecord.findMany({
  select: {
    id: true,
    title: true,
    tags: true,
    rightsClass: true,
    contentAssets: { select: { id: true } },
    fulltextDocuments: { select: { id: true } },
    embeddingChunks: { select: { id: true }, take: 1 },
    pipelineStageStates: { select: { stageCode: true, status: true, detail: true } },
  },
  orderBy: { id: 'asc' },
});
const corpus = rows.filter(hasCorpusTag);
const nonCorpus = rows.filter((row) => !hasCorpusTag(row));
const pipelineComplete = corpus.filter((row) => stageStatus(row, 'INDEXED') === 'SUCCEEDED');
const pipelineBlocked = corpus.filter((row) => stageStatus(row, 'INDEXED') !== 'SUCCEEDED');

const stageCoverage = Object.fromEntries(
  STAGES.map((stageCode) => [
    stageCode,
    {
      succeeded: corpus.filter((row) => stageStatus(row, stageCode) === 'SUCCEEDED').length,
      blocked: corpus.filter((row) => stageStatus(row, stageCode) === 'BLOCKED').length,
      failed: corpus.filter((row) => stageStatus(row, stageCode) === 'FAILED').length,
      not_started: corpus.filter((row) => stageStatus(row, stageCode) === 'NOT_STARTED').length,
    },
  ]),
);

const report = {
  run_id: runId,
  generated_at: new Date().toISOString(),
  counting_contract: {
    db_total_records: 'All LiteratureRecord rows; includes historical evidence/test records.',
    adaptive_corpus_records: 'Rows with any collection:*, direction:*, or batch:* tag.',
    pipeline_complete_records: 'Adaptive corpus rows with INDEXED=SUCCEEDED.',
    pipeline_blocked_records: 'Adaptive corpus rows not indexed; use blocker list, not table-total subtraction.',
    non_corpus_records: 'Rows without corpus tags; excluded from collection progress.',
  },
  metrics: {
    db_total_records: rows.length,
    adaptive_corpus_records: corpus.length,
    pipeline_complete_records: pipelineComplete.length,
    pipeline_blocked_records: pipelineBlocked.length,
    non_corpus_records: nonCorpus.length,
    all_records_indexed: rows.filter((row) => stageStatus(row, 'INDEXED') === 'SUCCEEDED').length,
    all_records_not_indexed: rows.filter((row) => stageStatus(row, 'INDEXED') !== 'SUCCEEDED').length,
  },
  corpus_distribution: {
    by_collection: countTags(corpus, 'collection:'),
    by_direction: countTags(corpus, 'direction:'),
    by_batch: countTags(corpus, 'batch:'),
    by_priority: countTags(corpus, 'priority:'),
    by_rights_class: countBy(corpus, (row) => row.rightsClass),
  },
  corpus_pipeline: {
    stage_coverage: stageCoverage,
    with_raw_assets: corpus.filter((row) => row.contentAssets.length > 0).length,
    with_fulltext_documents: corpus.filter((row) => row.fulltextDocuments.length > 0).length,
    with_embedding_chunks: corpus.filter((row) => row.embeddingChunks.length > 0).length,
    blocked_records: pipelineBlocked.map(compactRecord),
  },
  non_corpus_distribution: {
    by_title_bucket: countBy(nonCorpus, nonCorpusBucket),
    sample: nonCorpus.slice(0, 20).map((row) => ({
      literature_id: row.id,
      title: row.title,
      bucket: nonCorpusBucket(row),
    })),
  },
  next_collection_baseline: {
    denominator_before_next_batch: corpus.length,
    indexed_before_next_batch: pipelineComplete.length,
    manual_blockers_before_next_batch: pipelineBlocked.length,
    excluded_non_corpus_records: nonCorpus.length,
  },
};

await prisma.$disconnect();

const artifact = await writeArtifact(runId, {
  report: {
    run_id: report.run_id,
    generated_at: report.generated_at,
    counting_contract: report.counting_contract,
    metrics: report.metrics,
    corpus_distribution: report.corpus_distribution,
    corpus_pipeline: {
      stage_coverage: report.corpus_pipeline.stage_coverage,
      with_raw_assets: report.corpus_pipeline.with_raw_assets,
      with_fulltext_documents: report.corpus_pipeline.with_fulltext_documents,
      with_embedding_chunks: report.corpus_pipeline.with_embedding_chunks,
      blocked_records: report.corpus_pipeline.blocked_records,
    },
    non_corpus_distribution: report.non_corpus_distribution,
    next_collection_baseline: report.next_collection_baseline,
  },
  detail: report,
});

console.log(JSON.stringify({
  ...artifact,
  metrics: report.metrics,
  next_collection_baseline: report.next_collection_baseline,
  blocked_records: report.corpus_pipeline.blocked_records.map((row) => ({
    literature_id: row.literature_id,
    title: row.title,
    blocker: row.blocker,
  })),
}, null, 2));
