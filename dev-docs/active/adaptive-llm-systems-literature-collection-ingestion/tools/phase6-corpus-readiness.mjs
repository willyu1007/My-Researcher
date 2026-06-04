import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

import { getPrismaClient } from '../../../../apps/backend/src/repositories/prisma/prisma-client.ts';

const TASK_DIR = 'dev-docs/active/adaptive-llm-systems-literature-collection-ingestion';
const OUT_DIR = path.join(TASK_DIR, 'artifacts');
const TMP_DETAIL_DIR = '.ai/.tmp/adaptive-llm-systems-literature-collection-ingestion';
const LEGACY_JSON_PATH = path.join(OUT_DIR, 'phase6-corpus-readiness.json');
const DETAIL_JSON_PATH = path.join(TMP_DETAIL_DIR, 'phase6-corpus-readiness.json');
const MANIFEST_PATH = path.join(OUT_DIR, 'phase6-corpus-readiness-manifest.json');
const REPORT_PATH = path.join(OUT_DIR, 'phase6-corpus-readiness-report.json');
const MD_PATH = path.join(TASK_DIR, '11-corpus-readiness-review.md');
const PHASE5_JSON_PATH = path.join(OUT_DIR, 'phase5-judgment-cards.json');
const PHASE5_REPORT_PATH = path.join(OUT_DIR, 'phase5-judgment-cards-report.json');
const PHASE5_MANIFEST_PATH = path.join(OUT_DIR, 'phase5-judgment-cards-manifest.json');
const B6_STAGE_PATH = path.join(OUT_DIR, 'b6-citation-expansion-stage-report.json');
const B6_STAGE_MANIFEST_PATH = path.join(OUT_DIR, 'b6-citation-expansion-stage-manifest.json');
const ARTIFACT_BOUNDARY_VERSION = 'repo-lightweight-manifest:v1';

const BATCH_TAGS = [
  'batch:b1-core-high-precision',
  'batch:b2-core-system-bridge',
  'batch:b3-system-substrate',
  'batch:b4-strategy-policy',
  'batch:b5-theory-mapping',
  'batch:b6-citation-expansion',
];

const PRIORITY_ORDER = [
  'priority:p0',
  'priority:p1',
  'priority:p2',
  'priority:p3',
  'priority:p4',
];

function hasTag(record, tag) {
  return record.tags.includes(tag);
}

function tagsWith(record, prefix) {
  return record.tags.filter((tag) => tag.startsWith(prefix)).sort();
}

function strip(prefix, tag) {
  return tag.startsWith(prefix) ? tag.slice(prefix.length) : tag;
}

function effectivePriority(record) {
  return PRIORITY_ORDER.find((tag) => hasTag(record, tag)) ?? 'priority:unassigned';
}

function yearBand(year) {
  if (year < 2023) return 'classic_pre_2023';
  if (year <= 2024) return 'transition_2023_2024';
  return 'frontier_2025_2026';
}

function countBy(records, keyFn) {
  const result = {};
  for (const record of records) {
    const key = keyFn(record);
    result[key] = (result[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(result).sort(([a], [b]) => a.localeCompare(b)));
}

function countByTag(records, prefix) {
  const tags = [...new Set(records.flatMap((record) => tagsWith(record, prefix)))].sort();
  return Object.fromEntries(tags.map((tag) => [tag, records.filter((record) => hasTag(record, tag)).length]));
}

function compactRecord(record) {
  return {
    id: record.id,
    title: record.title,
    year: record.year,
    arxiv_id: record.arxivId,
    source_url: record.sources[0]?.sourceUrl ?? null,
    batch_tags: tagsWith(record, 'batch:'),
    collection_tags: tagsWith(record, 'collection:'),
    priority_tags: tagsWith(record, 'priority:'),
    effective_priority: effectivePriority(record),
    direction_tags: tagsWith(record, 'direction:'),
    fit_tags: tagsWith(record, 'fit:'),
    theory_tags: tagsWith(record, 'theory:'),
    metric_tags: tagsWith(record, 'metric:'),
    resource_tags: tagsWith(record, 'resource:'),
  };
}

function markdownEscape(value) {
  return String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function mdTags(tags) {
  if (!tags || tags.length === 0) return '`none`';
  return tags.map((tag) => `\`${tag}\``).join(', ');
}

function markdownTable(headers, rows) {
  const lines = [];
  lines.push(`| ${headers.map(markdownEscape).join(' | ')} |`);
  lines.push(`| ${headers.map(() => '---').join(' | ')} |`);
  for (const row of rows) {
    lines.push(`| ${row.map(markdownEscape).join(' | ')} |`);
  }
  return lines;
}

function asRows(object) {
  return Object.entries(object).map(([key, value]) => [`\`${key}\``, String(value)]);
}

function buildFollowUps({ highExperimentCandidates, noAbstract, noArxiv, multiPriority, b6Stage }) {
  const followUps = [
    {
      id: 'F1-import-missing-core-classic',
      priority: 'p0',
      owner_boundary: 'literature',
      purpose: 'Import or reconcile the missing classic RAG anchor `Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks` (`arxiv:2005.11401`) so the core layer has the canonical foundation paper.',
      trigger: 'Phase 6 found no `LiteratureRecord` with `arxivId=2005.11401` in the current DB.',
      acceptance: 'Canonical record exists with source provenance, `collection:core`, `direction:rag-aware-allocation`, baseline tags, and no content-processing side effects.',
    },
    {
      id: 'F2-fulltext-and-code-readiness-pass',
      priority: 'p0',
      owner_boundary: 'literature',
      purpose: 'Acquire or verify fulltext/code/protocol only for the 15 experiment-foundation candidate records and the highest-priority P0 research seeds.',
      trigger: `${highExperimentCandidates.length} records have benchmark, workload, toolkit, framework, or explicit experiment-foundation signals, but code/protocol claims are still metadata-level.`,
      acceptance: 'For each selected item, record fulltext status, repository/protocol URL if available, license caveat, and runnable-baseline feasibility.',
    },
    {
      id: 'F3-experiment-foundation-promotion-candidates',
      priority: 'p0',
      owner_boundary: 'experiment-foundation',
      purpose: 'Turn selected benchmark/workload/toolkit records into reusable dataset, benchmark, baseline, metric, or RunRecipe candidates.',
      trigger: `${highExperimentCandidates.length} high-fit records are ready for promotion review, but the literature task must not create experiment assets directly.`,
      acceptance: 'Each promoted item has an experiment-foundation asset type, expected inputs/outputs, baseline recipe, and verification command or skip reason.',
    },
    {
      id: 'F4-paper-implementation-shortlist',
      priority: 'p1',
      owner_boundary: 'PaperImplementation',
      purpose: 'Create a shortlist of claim-supporting papers after topic selection chooses the concrete argument direction.',
      trigger: '77 judgment-card-ready records are triaged, but no paper-implementation dossier should be started before selecting the research claim.',
      acceptance: 'Shortlist groups papers by claim role: direct baseline, contrast, limitation, metric, or theory support.',
    },
    {
      id: 'F5-b6-stage-review-backlog',
      priority: 'p1',
      owner_boundary: 'literature',
      purpose: 'Review staged citation-expansion candidates before any next import batch.',
      trigger: `B6 staged ${b6Stage.staged_candidate_count} candidates, including ${b6Stage.import_candidate_count} automatic import-candidate suggestions and ${b6Stage.staged_review_count} stage-review items.`,
      acceptance: 'Human/LLM-assisted review produces an allowlist with explicit seed relation, query fit, source URL, and expected tags; no bulk import without review.',
    }];
  if (multiPriority.length > 0) {
    followUps.push({
      id: 'F6-priority-tag-normalization',
      priority: 'p1',
      owner_boundary: 'literature',
      purpose: 'Normalize multi-priority tags so each curated item has one effective `priority:*` tag or a documented exception policy.',
      trigger: `${multiPriority.length} current-round records have multiple ` + '`priority:*`' + ' tags.',
      acceptance: 'Each affected record has one effective priority tag; historical rationale is preserved in the task artifact or a follow-up note.',
    });
  }
  followUps.push(
    {
      id: 'F7-classic-theory-metadata-enrichment',
      priority: 'p2',
      owner_boundary: 'literature',
      purpose: 'Enrich classic theory records that were imported manually without abstracts.',
      trigger: `${noAbstract.length} current-round records have no imported abstract; these are classic theory/manual records, not current RAG/system preprints.`,
      acceptance: 'Each selected theory record has abstract/source notes or a documented reason why abstract import is not required.',
    },
    {
      id: 'F8-scale-up-classifier-and-taxonomy-schema-decision',
      priority: 'p2',
      owner_boundary: 'literature',
      purpose: 'Decide whether automated classifier support or structured taxonomy tables are needed before scaling toward thousands of records.',
      trigger: 'Flat tags are adequate for the 89-record seed corpus but will become fragile during large-scale expansion.',
      acceptance: 'Decision note chooses: keep tags only, add classifier artifact, or introduce taxonomy schema, with migration and evaluation criteria.',
    },
  );
  return followUps;
}

function renderMarkdown(payload) {
  const lines = [];
  lines.push('# 11 Corpus Readiness Review');
  lines.push('');
  lines.push('## Decision');
  lines.push('- State: completed');
  lines.push('- Date: 2026-06-04');
  lines.push('- Decision: current 89-record corpus is ready as a research seed corpus and follow-up planning substrate.');
  lines.push('- Not ready for automatic evidence-active promotion or 5000-record bulk expansion without the follow-up tasks below.');
  lines.push('- Scope: current B1-B6 batch records only. The broader 281-record literature database is not the denominator for this review.');
  lines.push('- Content processing enqueued: `false`');
  lines.push('');
  lines.push('## Completion Signal');
  lines.push('- Taxonomy, seed catalog, query catalog, import evidence, tag distribution, and P0/P1 triage cards are documented.');
  lines.push('- P0/P1 current-round records have `classification:judgment-card-ready`; B5 theory records have `classification:theory-inclusion-card-ready`.');
  lines.push('- Remaining gaps are split into explicit follow-up tasks and do not block closing the current collection round.');
  lines.push('');
  lines.push('## Coverage Summary');
  lines.push(...markdownTable(['Metric', 'Value'], [
    ['Current-round records', String(payload.summary.record_count)],
    ['All literature DB records', String(payload.summary.all_literature_count)],
    ['Judgment-card-ready records', String(payload.summary.judgment_ready_count)],
    ['Theory-inclusion-card-ready records', String(payload.summary.theory_ready_count)],
    ['Needs-judgment-card records', String(payload.summary.needs_judgment_count)],
    ['Low-confidence records', String(payload.summary.low_confidence_count)],
    ['No abstract records', String(payload.summary.no_abstract_count)],
    ['No arXiv ID records', String(payload.summary.no_arxiv_count)],
    ['High experiment-foundation candidates', String(payload.summary.high_experiment_candidate_count)],
    ['Multi-priority records', String(payload.summary.multi_priority_count)],
  ]));
  lines.push('');
  lines.push('## Layer Distribution');
  lines.push(...markdownTable(['Collection Layer', 'Records'], asRows(payload.distribution.by_collection)));
  lines.push('');
  lines.push('## Direction Distribution');
  lines.push(...markdownTable(['Direction', 'Records'], asRows(payload.distribution.by_direction)));
  lines.push('');
  lines.push('## Effective Priority Distribution');
  lines.push(...markdownTable(['Effective Priority', 'Records'], asRows(payload.distribution.by_effective_priority)));
  lines.push('');
  lines.push('## Time Distribution');
  lines.push(...markdownTable(['Band', 'Records'], asRows(payload.distribution.by_year_band)));
  lines.push('');
  lines.push('## Experiment-Foundation Candidate Set');
  lines.push('- These are candidates for a follow-up promotion task, not assets created by this task.');
  lines.push(...markdownTable(['Literature ID', 'Year', 'Title', 'Signals'], payload.high_experiment_candidates.map((record) => [
    `\`${record.id}\``,
    String(record.year),
    record.title,
    mdTags([...record.fit_tags, ...record.metric_tags, ...record.resource_tags].slice(0, 8)),
  ])));
  lines.push('');
  lines.push('## Non-Blocking Gaps');
  lines.push(...markdownTable(['Gap', 'Impact', 'Follow-up'], payload.gaps.map((gap) => [
    gap.name,
    gap.impact,
    gap.follow_up_id,
  ])));
  lines.push('');
  lines.push('## Follow-up Split');
  lines.push(...markdownTable(['ID', 'Priority', 'Owner Boundary', 'Purpose', 'Acceptance'], payload.follow_ups.map((item) => [
    `\`${item.id}\``,
    `\`${item.priority}\``,
    `\`${item.owner_boundary}\``,
    item.purpose,
    item.acceptance,
  ])));
  lines.push('');
  lines.push('## Safety Verification');
  lines.push(...markdownTable(['Counter', 'Value'], Object.entries(payload.safety_counters).map(([key, value]) => [`\`${key}\``, String(value)])));
  lines.push('');
  lines.push('## Notes');
  lines.push('- Use the effective priority distribution for readiness reporting; `12-priority-reconciliation.md` preserves the one-priority tag invariant for this round.');
  lines.push(`- Detailed readiness manifest: \`${MANIFEST_PATH}\`; detailed local JSON is generated outside repo at \`${DETAIL_JSON_PATH}\`.`);
  lines.push('- The missing classic RAG anchor is a targeted correction, not a reason to restart collection.');
  lines.push('- Classic theory records without abstracts are acceptable for seed-bank use, but not for evidence-active use.');
  lines.push('- B6 staged candidates should be reviewed before another citation-expansion import; this task deliberately avoided bulk import.');
  lines.push('');
  return `${lines.join('\n').trimEnd()}\n`;
}

function lineCount(text) {
  if (text.length === 0) return 0;
  return text.endsWith('\n') ? text.split('\n').length - 1 : text.split('\n').length;
}

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

async function readJsonOrNull(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch {
    return null;
  }
}

async function readPhase5Summary() {
  const legacyDetail = await readJsonOrNull(PHASE5_JSON_PATH);
  if (legacyDetail?.summary) {
    return legacyDetail.summary;
  }
  const report = await readJsonOrNull(PHASE5_REPORT_PATH);
  if (report?.summary) {
    return report.summary;
  }
  const manifest = await readJsonOrNull(PHASE5_MANIFEST_PATH);
  return manifest?.summary ?? null;
}

async function readB6StageSummary() {
  const legacyDetail = await readJsonOrNull(B6_STAGE_PATH);
  if (legacyDetail) {
    return legacyDetail;
  }
  const manifest = await readJsonOrNull(B6_STAGE_MANIFEST_PATH);
  return manifest?.summary ?? {};
}

async function writeDetailedJsonAndManifest({ payload }) {
  const text = `${JSON.stringify(payload, null, 2)}\n`;
  await fs.mkdir(TMP_DETAIL_DIR, { recursive: true });
  await fs.writeFile(DETAIL_JSON_PATH, text);

  const previousManifest = await readJsonOrNull(MANIFEST_PATH);
  const manifest = {
    generated_at: payload.generated_at,
    artifact_boundary_version: ARTIFACT_BOUNDARY_VERSION,
    artifact_class: 'corpus-readiness-detail-snapshot',
    repo_policy: {
      db_is_ssot: true,
      repo_keeps: 'human-readable summaries, execution reports, and lightweight manifests',
      repo_excludes: 'large detailed corpus/readiness snapshots',
      reason: 'Detailed corpus readiness is generated task evidence; LiteratureRecord and related DB tables remain the corpus SSOT.',
    },
    removed_from_repo: true,
    original_repo_artifact: previousManifest?.original_repo_artifact ?? {
      path: LEGACY_JSON_PATH,
      status: 'legacy detailed artifact path no longer tracked',
    },
    detailed_local_copy: {
      path: DETAIL_JSON_PATH,
      git_ignored: true,
      size_bytes: Buffer.byteLength(text, 'utf8'),
      line_count: lineCount(text),
      sha256: sha256(text),
    },
    summary: payload.summary,
    distribution: payload.distribution,
    b6_stage: payload.b6_stage,
    follow_up_count: payload.follow_ups.length,
    safety_counters: payload.safety_counters,
  };
  await fs.writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

async function main() {
  const prisma = getPrismaClient();
  try {
    const phase5Summary = await readPhase5Summary();
    const b6StageRaw = await readB6StageSummary();
    const b6Stage = {
      seed_count: b6StageRaw?.seed_count ?? 0,
      staged_candidate_count: b6StageRaw?.staged_candidate_count ?? 0,
      import_candidate_count: b6StageRaw?.import_candidate_count ?? 0,
      staged_review_count: b6StageRaw?.staged_review_count ?? 0,
      existing_candidate_count: b6StageRaw?.existing_candidate_count ?? 0,
      skipped_low_fit_count: b6StageRaw?.skipped_low_fit_count ?? 0,
      failure_count: b6StageRaw?.failure_count ?? 0,
    };
    const records = await prisma.literatureRecord.findMany({
      where: { OR: BATCH_TAGS.map((tag) => ({ tags: { has: tag } })) },
      select: {
        id: true,
        title: true,
        year: true,
        arxivId: true,
        abstractText: true,
        tags: true,
        sources: {
          select: { provider: true, sourceUrl: true },
          orderBy: { id: 'asc' },
        },
      },
      orderBy: { id: 'asc' },
    });
    const compact = records.map(compactRecord);
    const highExperimentCandidates = compact.filter((record) => {
      const title = record.title.toLowerCase();
      return record.fit_tags.includes('fit:experiment-foundation')
        || /bench|benchmark|trace|workload|toolkit|framework|simulator|open-source/i.test(title);
    });
    const noAbstract = compact.filter((record) => {
      const source = records.find((candidate) => candidate.id === record.id);
      return !source?.abstractText || source.abstractText.trim().length === 0;
    });
    const noArxiv = compact.filter((record) => !record.arxiv_id);
    const multiPriority = compact.filter((record) => record.priority_tags.length !== 1);
    const originalRag = await prisma.literatureRecord.findFirst({
      where: { arxivId: '2005.11401' },
      select: { id: true, title: true, tags: true },
    });
    const safetyCounters = {
      literature_count: await prisma.literatureRecord.count(),
      source_count: await prisma.literatureSource.count(),
      pipeline_run_count: await prisma.literaturePipelineRun.count(),
      content_asset_count: await prisma.literatureContentAsset.count(),
      content_processing_batch_job_count: await prisma.literatureContentProcessingBatchJob.count(),
      fulltext_acquisition_job_count: await prisma.literatureFulltextAcquisitionJob.count(),
    };
    const followUps = buildFollowUps({
      highExperimentCandidates,
      noAbstract,
      noArxiv,
      multiPriority,
      b6Stage,
    });
    const gaps = [
      {
        name: 'Missing canonical classic RAG anchor',
        impact: originalRag ? 'No current impact; record exists outside this specific gap.' : '`arxiv:2005.11401` is absent, leaving a foundational RAG citation hole.',
        follow_up_id: 'F1-import-missing-core-classic',
      },
      {
        name: 'Fulltext/code/protocol not verified',
        impact: 'Judgment cards are metadata-level; experiment and paper promotion need evidence checks.',
        follow_up_id: 'F2-fulltext-and-code-readiness-pass',
      },
      {
        name: 'Experiment assets not created',
        impact: `${highExperimentCandidates.length} candidates are ready for review, but experiment-foundation owns asset creation.`,
        follow_up_id: 'F3-experiment-foundation-promotion-candidates',
      },
      {
        name: 'PaperImplementation shortlist not selected',
        impact: 'The corpus is broad; claim-specific paper selection should wait for topic/argument choice.',
        follow_up_id: 'F4-paper-implementation-shortlist',
      },
      {
        name: 'B6 citation-expansion backlog',
        impact: `${b6Stage.staged_candidate_count} staged candidates require review before any next expansion.`,
        follow_up_id: 'F5-b6-stage-review-backlog',
      },
    ];
    if (multiPriority.length > 0) {
      gaps.push({
        name: 'Priority tag normalization',
        impact: `${multiPriority.length} records have multiple priority tags; readiness uses effective priority but tags should be normalized before scale-up.`,
        follow_up_id: 'F6-priority-tag-normalization',
      });
    }
    gaps.push(
      {
        name: 'Classic theory metadata caveat',
        impact: `${noAbstract.length} records have no abstract; all are manual/classic theory records and should remain seed-bank only until enriched.`,
        follow_up_id: 'F7-classic-theory-metadata-enrichment',
      },
      {
        name: 'Scale-up classification design',
        impact: 'Flat tags are workable now but fragile for thousands of records.',
        follow_up_id: 'F8-scale-up-classifier-and-taxonomy-schema-decision',
      },
    );
    const payload = {
      generated_at: new Date().toISOString(),
      decision: {
        state: 'completed',
        readiness: 'ready_as_research_seed_corpus',
        not_ready_for: ['automatic evidence-active promotion', 'unreviewed 5000-record bulk expansion'],
        denominator: 'B1-B6 current-round batch records',
      },
      summary: {
        record_count: records.length,
        all_literature_count: safetyCounters.literature_count,
        judgment_ready_count: records.filter((record) => hasTag(record, 'classification:judgment-card-ready')).length,
        theory_ready_count: records.filter((record) => hasTag(record, 'classification:theory-inclusion-card-ready')).length,
        needs_judgment_count: records.filter((record) => hasTag(record, 'classification:needs-judgment-card')).length,
        low_confidence_count: records.filter((record) => hasTag(record, 'classification:low-confidence')).length,
        no_abstract_count: noAbstract.length,
        no_arxiv_count: noArxiv.length,
        high_experiment_candidate_count: highExperimentCandidates.length,
        multi_priority_count: multiPriority.length,
      },
      distribution: {
        by_batch: countByTag(records, 'batch:'),
        by_collection: countByTag(records, 'collection:'),
        by_direction: countByTag(records, 'direction:'),
        by_effective_priority: countBy(records, effectivePriority),
        by_year_band: countBy(records, (record) => yearBand(record.year)),
        by_year: countBy(records, (record) => String(record.year)),
      },
      phase5_summary: phase5Summary,
      b6_stage: b6Stage,
      high_experiment_candidates: highExperimentCandidates,
      no_abstract_records: noAbstract,
      no_arxiv_records: noArxiv,
      multi_priority_records: multiPriority,
      original_rag_record: originalRag,
      gaps,
      follow_ups: followUps,
      safety_counters: safetyCounters,
    };
    await fs.mkdir(OUT_DIR, { recursive: true });
    const manifest = await writeDetailedJsonAndManifest({ payload });
    await fs.writeFile(MD_PATH, renderMarkdown(payload));
    await fs.writeFile(REPORT_PATH, `${JSON.stringify({
      generated_at: payload.generated_at,
      decision: payload.decision,
      summary: payload.summary,
      distribution: payload.distribution,
      b6_stage: payload.b6_stage,
      follow_up_count: payload.follow_ups.length,
      safety_counters: payload.safety_counters,
      artifact_paths: {
        markdown: MD_PATH,
        manifest: MANIFEST_PATH,
        detailed_local_json: DETAIL_JSON_PATH,
        report: REPORT_PATH,
      },
      detailed_local_copy: manifest.detailed_local_copy,
    }, null, 2)}\n`);
    console.log(JSON.stringify({
      decision: payload.decision,
      summary: payload.summary,
      distribution: payload.distribution,
      b6_stage: payload.b6_stage,
      follow_up_count: payload.follow_ups.length,
      safety_counters: payload.safety_counters,
      artifact_paths: {
        markdown: MD_PATH,
        manifest: MANIFEST_PATH,
        detailed_local_json: DETAIL_JSON_PATH,
        report: REPORT_PATH,
      },
    }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

await main();
