import fs from 'node:fs/promises';
import path from 'node:path';

import { getPrismaClient } from '../../../../apps/backend/src/repositories/prisma/prisma-client.ts';

process.env.RESEARCH_LIFECYCLE_REPOSITORY ??= 'prisma';
process.env.TITLE_CARD_REPOSITORY ??= process.env.RESEARCH_LIFECYCLE_REPOSITORY;
process.env.AUTO_PULL_REPOSITORY ??= process.env.RESEARCH_LIFECYCLE_REPOSITORY;
process.env.APPLICATION_SETTINGS_REPOSITORY ??= process.env.RESEARCH_LIFECYCLE_REPOSITORY;
process.env.EXPERIMENT_FOUNDATION_REPOSITORY ??= process.env.RESEARCH_LIFECYCLE_REPOSITORY;
process.env.PAPER_IMPLEMENTATION_REPOSITORY ??= process.env.RESEARCH_LIFECYCLE_REPOSITORY;

const TASK_DIR = 'dev-docs/active/literature-scaleout-corpus-strategy';
const OUT_DIR = path.join(TASK_DIR, 'artifacts');
const TMP_DIR = '.ai/.tmp/literature-scaleout-corpus-strategy';
const runId = process.env.SCALEOUT_COUNTING_RUN_ID ?? new Date().toISOString().replace(/[:.]/g, '-');

const STAGES = [
  'CITATION_NORMALIZED',
  'ABSTRACT_READY',
  'FULLTEXT_PREPROCESSED',
  'KEY_CONTENT_READY',
  'CHUNKED',
  'EMBEDDED',
  'INDEXED',
];

const CANDIDATE_STATUSES = [
  'DISCOVERED',
  'DUPLICATE',
  'REJECTED',
  'DEFERRED',
  'READY_FOR_PROMOTION',
  'PROMOTED',
];

function hasCorpusTag(row) {
  return row.tags.some((tag) =>
    tag.startsWith('collection:')
    || tag.startsWith('direction:')
    || tag.startsWith('batch:')
    || tag === 'corpus:managed'
    || tag === 'corpus:effective'
  );
}

function isExcludedFromCorpus(row) {
  return row.tags.includes('classification:excluded-from-corpus');
}

function isManagedCorpus(row) {
  return hasCorpusTag(row) && !isExcludedFromCorpus(row);
}

function stageStatus(row, stageCode) {
  return row.pipelineStageStates.find((state) => state.stageCode === stageCode)?.status ?? 'NOT_STARTED';
}

function isEffectiveLiterature(row) {
  return isManagedCorpus(row) && STAGES.every((stageCode) => stageStatus(row, stageCode) === 'SUCCEEDED');
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

function zeroStatusCounts() {
  return Object.fromEntries(CANDIDATE_STATUSES.map((status) => [status, 0]));
}

function countCandidateStatuses(candidates) {
  return {
    ...zeroStatusCounts(),
    ...countBy(candidates, (candidate) => candidate.status),
  };
}

function nonCorpusBucket(row) {
  if (isExcludedFromCorpus(row)) {
    return 'explicitly_excluded';
  }
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

function compactLiterature(row) {
  return {
    literature_id: row.id,
    title: row.title,
    tags: row.tags,
    stages: Object.fromEntries(STAGES.map((stageCode) => [stageCode, stageStatus(row, stageCode)])),
    blocker: firstBlocker(row),
  };
}

function compactCandidate(candidate) {
  return {
    candidate_id: candidate.id,
    batch_id: candidate.batchId,
    title: candidate.title,
    year: candidate.year,
    source_provider: candidate.sourceProvider,
    status: candidate.status,
    dedup_key: candidate.dedupKey,
    matched_literature_id: candidate.matchedLiteratureId,
    promoted_literature_id: candidate.promotedLiteratureId,
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

const literatureRows = await prisma.literatureRecord.findMany({
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

const batches = await prisma.literatureDiscoveryBatch.findMany({
  select: {
    id: true,
    batchCode: true,
    directionScope: true,
    sourceProviders: true,
    status: true,
    completedAt: true,
    createdAt: true,
    updatedAt: true,
    _count: { select: { candidates: true } },
  },
  orderBy: { createdAt: 'asc' },
});

const candidates = await prisma.literatureDiscoveryCandidate.findMany({
  select: {
    id: true,
    batchId: true,
    title: true,
    year: true,
    sourceProvider: true,
    status: true,
    dedupKey: true,
    matchedLiteratureId: true,
    promotedLiteratureId: true,
    createdAt: true,
  },
  orderBy: { createdAt: 'asc' },
});

const managedCorpus = literatureRows.filter(isManagedCorpus);
const effectiveLiterature = managedCorpus.filter(isEffectiveLiterature);
const pipelineIncomplete = managedCorpus.filter((row) => !isEffectiveLiterature(row));
const pipelineKnownBlockers = pipelineIncomplete.filter((row) => firstBlocker(row));
const pipelineNotStarted = pipelineIncomplete.filter((row) =>
  STAGES.every((stageCode) => stageStatus(row, stageCode) === 'NOT_STARTED'),
);
const excludedNonCorpus = literatureRows.filter((row) => !isManagedCorpus(row));
const candidateStatusCounts = countCandidateStatuses(candidates);

const stageCoverage = Object.fromEntries(
  STAGES.map((stageCode) => [
    stageCode,
    {
      succeeded: managedCorpus.filter((row) => stageStatus(row, stageCode) === 'SUCCEEDED').length,
      blocked: managedCorpus.filter((row) => stageStatus(row, stageCode) === 'BLOCKED').length,
      failed: managedCorpus.filter((row) => stageStatus(row, stageCode) === 'FAILED').length,
      not_started: managedCorpus.filter((row) => stageStatus(row, stageCode) === 'NOT_STARTED').length,
    },
  ]),
);

const report = {
  run_id: runId,
  generated_at: new Date().toISOString(),
  counting_contract: {
    candidate_pool_records: 'All LiteratureDiscoveryCandidate rows; broad metadata-first discovery only.',
    candidate_pool_discovered_records: 'Candidate rows with status DISCOVERED.',
    candidate_pool_accepted_records: 'Candidate rows with status READY_FOR_PROMOTION or PROMOTED.',
    candidate_pool_rejected_records: 'Candidate rows with status REJECTED.',
    candidate_pool_duplicate_records: 'Candidate rows with status DUPLICATE.',
    candidate_pool_deferred_records: 'Candidate rows with status DEFERRED.',
    managed_corpus_records: 'LiteratureRecord rows with stable corpus tags and no excluded-from-corpus tag.',
    adaptive_corpus_records: 'Compatibility alias for managed_corpus_records.',
    effective_literature_records: 'Managed corpus rows with all standard stages through INDEXED=SUCCEEDED.',
    pipeline_complete_records: 'Compatibility alias for effective_literature_records.',
    pipeline_incomplete_records: 'Managed corpus rows not effective yet; includes not-started, stale, failed, and blocked records.',
    pipeline_blocked_records: 'Managed corpus rows with an explicit FAILED/BLOCKED stage blocker.',
    pipeline_not_started_records: 'Managed corpus rows where every standard stage is still NOT_STARTED.',
    excluded_non_corpus_records: 'LiteratureRecord rows outside managed corpus, including historical evidence and explicit exclusions.',
    db_total_records: 'All LiteratureRecord rows; database hygiene only, not literature progress.',
  },
  metrics: {
    candidate_batches: batches.length,
    candidate_pool_records: candidates.length,
    candidate_pool_discovered_records: candidateStatusCounts.DISCOVERED,
    candidate_pool_accepted_records: candidateStatusCounts.READY_FOR_PROMOTION + candidateStatusCounts.PROMOTED,
    candidate_pool_ready_for_promotion_records: candidateStatusCounts.READY_FOR_PROMOTION,
    candidate_pool_promoted_records: candidateStatusCounts.PROMOTED,
    candidate_pool_rejected_records: candidateStatusCounts.REJECTED,
    candidate_pool_duplicate_records: candidateStatusCounts.DUPLICATE,
    candidate_pool_deferred_records: candidateStatusCounts.DEFERRED,
    managed_corpus_records: managedCorpus.length,
    adaptive_corpus_records: managedCorpus.length,
    effective_literature_records: effectiveLiterature.length,
    pipeline_complete_records: effectiveLiterature.length,
    pipeline_incomplete_records: pipelineIncomplete.length,
    pipeline_blocked_records: pipelineKnownBlockers.length,
    pipeline_not_started_records: pipelineNotStarted.length,
    excluded_non_corpus_records: excludedNonCorpus.length,
    db_total_records: literatureRows.length,
  },
  candidate_pool_distribution: {
    by_status: candidateStatusCounts,
    by_source_provider: countBy(candidates, (candidate) => candidate.sourceProvider),
    batches: batches.map((batch) => ({
      batch_id: batch.id,
      batch_code: batch.batchCode,
      status: batch.status,
      direction_scope: batch.directionScope,
      source_providers: batch.sourceProviders,
      candidate_count: batch._count.candidates,
      completed_at: batch.completedAt?.toISOString() ?? null,
    })),
    sample: candidates.slice(0, 20).map(compactCandidate),
  },
  managed_corpus_distribution: {
    by_collection: countTags(managedCorpus, 'collection:'),
    by_direction: countTags(managedCorpus, 'direction:'),
    by_batch: countTags(managedCorpus, 'batch:'),
    by_priority: countTags(managedCorpus, 'priority:'),
    by_rights_class: countBy(managedCorpus, (row) => row.rightsClass),
  },
  managed_corpus_pipeline: {
    stage_coverage: stageCoverage,
    with_raw_assets: managedCorpus.filter((row) => row.contentAssets.length > 0).length,
    with_fulltext_documents: managedCorpus.filter((row) => row.fulltextDocuments.length > 0).length,
    with_embedding_chunks: managedCorpus.filter((row) => row.embeddingChunks.length > 0).length,
    incomplete_records: pipelineIncomplete.map(compactLiterature),
    blocked_records: pipelineKnownBlockers.map(compactLiterature),
    not_started_records: pipelineNotStarted.map(compactLiterature),
  },
  excluded_non_corpus_distribution: {
    by_title_bucket: countBy(excludedNonCorpus, nonCorpusBucket),
    sample: excludedNonCorpus.slice(0, 20).map((row) => ({
      literature_id: row.id,
      title: row.title,
      bucket: nonCorpusBucket(row),
    })),
  },
  scaleout_baseline: {
    candidate_pool_before_b10: candidates.length,
    managed_corpus_before_b10: managedCorpus.length,
    effective_literature_before_b10: effectiveLiterature.length,
    incomplete_records_before_b10: pipelineIncomplete.length,
    manual_blockers_before_b10: pipelineKnownBlockers.length,
    not_started_records_before_b10: pipelineNotStarted.length,
    excluded_non_corpus_records: excludedNonCorpus.length,
  },
};

await prisma.$disconnect();

const artifact = await writeArtifact(runId, {
  report: {
    run_id: report.run_id,
    generated_at: report.generated_at,
    counting_contract: report.counting_contract,
    metrics: report.metrics,
    candidate_pool_distribution: report.candidate_pool_distribution,
    managed_corpus_distribution: report.managed_corpus_distribution,
    managed_corpus_pipeline: report.managed_corpus_pipeline,
    excluded_non_corpus_distribution: report.excluded_non_corpus_distribution,
    scaleout_baseline: report.scaleout_baseline,
  },
  detail: report,
});

console.log(JSON.stringify({
  ...artifact,
  metrics: report.metrics,
  scaleout_baseline: report.scaleout_baseline,
  blocked_records: report.managed_corpus_pipeline.blocked_records.map((row) => ({
    literature_id: row.literature_id,
    title: row.title,
    blocker: row.blocker,
  })),
}, null, 2));
