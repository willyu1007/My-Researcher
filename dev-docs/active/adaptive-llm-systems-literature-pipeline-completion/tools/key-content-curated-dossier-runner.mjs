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
const CATEGORY_KEYS = [
  'research_problem',
  'contributions',
  'method',
  'datasets_and_benchmarks',
  'experiments',
  'key_findings',
  'limitations',
  'reproducibility',
  'related_work_positioning',
  'evidence_candidates',
  'figure_insights',
  'table_insights',
  'claim_evidence_map',
  'automation_signals',
];

const args = new Set(process.argv.slice(2));
const limit = Number.parseInt(process.argv.find((arg) => arg.startsWith('--limit='))?.slice('--limit='.length) ?? '3', 10);
const selector = process.argv.find((arg) => arg.startsWith('--selector='))?.slice('--selector='.length) ?? 'priority-arxiv';
const literatureIdsArg = process.argv.find((arg) => arg.startsWith('--literature-ids='))?.slice('--literature-ids='.length);
const apply = args.has('--apply');
const runId = process.env.PIPELINE_CAMPAIGN_RUN_ID ?? new Date().toISOString().replace(/[:.]/g, '-');

process.on('uncaughtException', (error) => {
  console.error('[key-content-curated-dossier-runner] uncaughtException');
  console.error(inspect(error, { depth: 8, colors: false }));
  process.exitCode = 1;
});

process.on('unhandledRejection', (error) => {
  console.error('[key-content-curated-dossier-runner] unhandledRejection');
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

function stageStatus(row, stageCode) {
  return row.pipelineStageStates.find((state) => state.stageCode === stageCode)?.status ?? 'NOT_STARTED';
}

function scoreTarget(row) {
  let score = 0;
  if (row.fulltextDocuments.length > 0) score += 30;
  if (row.arxivId) score += 20;
  if (row.rightsClass === 'OA') score += 10;
  if (row.tags.includes('priority:p0')) score += 9;
  if (row.tags.includes('priority:p1')) score += 7;
  if (row.tags.includes('priority:p2')) score += 3;
  if (stageStatus(row, 'KEY_CONTENT_READY') === 'FAILED') score += 6;
  if (row.tags.some((tag) => tag.startsWith('batch:b8') || tag.startsWith('batch:b7'))) score += 4;
  return score;
}

function sortTargets(left, right) {
  return scoreTarget(right) - scoreTarget(left) || left.id.localeCompare(right.id);
}

function compactTarget(row) {
  return {
    id: row.id,
    title: row.title,
    arxiv_id: row.arxivId,
    doi: row.doiNormalized,
    rights_class: row.rightsClass,
    key_content_status: stageStatus(row, 'KEY_CONTENT_READY'),
    priority_tags: row.tags.filter((tag) => tag.startsWith('priority:')),
    collection_tags: row.tags.filter((tag) => tag.startsWith('collection:')),
    direction_tags: row.tags.filter((tag) => tag.startsWith('direction:')),
    batch_tags: row.tags.filter((tag) => tag.startsWith('batch:')),
  };
}

async function request(app, method, url, payload) {
  const res = await app.inject({ method, url, payload });
  let body;
  try {
    body = JSON.parse(res.payload);
  } catch {
    body = res.payload;
  }
  if (res.statusCode >= 400) {
    const error = new Error(`${method} ${url} failed: ${res.statusCode} ${JSON.stringify(body)}`);
    error.statusCode = res.statusCode;
    error.body = body;
    throw error;
  }
  return body;
}

function normalizeText(value) {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function truncate(value, maxLength) {
  const text = normalizeText(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1)).trim()}...`;
}

function splitSentences(text) {
  return normalizeText(text)
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 30);
}

function firstSentenceMatching(text, pattern) {
  return splitSentences(text).find((sentence) => pattern.test(sentence)) ?? null;
}

function findParagraph(bundle, pattern) {
  return bundle.paragraphs
    .filter((paragraph) => normalizeText(paragraph.text).length >= 80)
    .find((paragraph) => {
      const section = bundle.sections.find((item) => item.section_id === paragraph.section_id);
      return pattern.test(`${section?.title ?? ''} ${paragraph.text}`);
    }) ?? null;
}

function firstMeaningfulParagraph(bundle) {
  return bundle.paragraphs
    .filter((paragraph) => normalizeText(paragraph.text).length >= 80)
    .sort((left, right) => left.order_index - right.order_index)[0] ?? null;
}

function sourceRefForAbstract(bundle) {
  if (!bundle.abstract_profile?.id) return null;
  return {
    ref_type: 'abstract',
    ref_id: bundle.abstract_profile.id,
    checksum: bundle.abstract_profile.checksum ?? null,
  };
}

function sourceRefForParagraph(bundle, paragraph) {
  if (!paragraph?.paragraph_id) return null;
  return {
    ref_type: 'paragraph',
    ref_id: paragraph.paragraph_id,
    document_id: bundle.document.id,
    section_id: paragraph.section_id,
    paragraph_id: paragraph.paragraph_id,
    checksum: paragraph.checksum,
    start_offset: paragraph.start_offset,
    end_offset: paragraph.end_offset,
  };
}

function sourceRefForSection(bundle, section) {
  if (!section?.section_id) return null;
  return {
    ref_type: 'section',
    ref_id: section.section_id,
    document_id: bundle.document.id,
    section_id: section.section_id,
    checksum: section.checksum,
    start_offset: section.start_offset,
    end_offset: section.end_offset,
  };
}

function fallbackSourceRef(bundle) {
  const paragraphRef = sourceRefForParagraph(bundle, firstMeaningfulParagraph(bundle));
  if (paragraphRef) return paragraphRef;
  const sectionRef = sourceRefForSection(bundle, bundle.sections[0]);
  if (sectionRef) return sectionRef;
  return { ref_type: 'manual', ref_id: `codex-curated:${bundle.literature_id}` };
}

function emptyCategories() {
  return Object.fromEntries(CATEGORY_KEYS.map((key) => [key, []]));
}

function item(category, index, type, statement, details, sourceRefs, options = {}) {
  return {
    id: `codex-lite-${category}-${index}`,
    type,
    statement: truncate(statement, 420) || 'Curated statement pending stronger extraction.',
    details: truncate(details, 800),
    source_refs: sourceRefs.filter(Boolean),
    confidence: options.confidence ?? 0.62,
    evidence_strength: options.evidenceStrength ?? 'medium',
    notes: options.notes ?? null,
    provenance: 'model_generated',
  };
}

function buildDossier(bundle) {
  const categories = emptyCategories();
  const abstractText = normalizeText(bundle.abstract);
  const primaryParagraph = firstMeaningfulParagraph(bundle);
  const methodParagraph = findParagraph(bundle, /\b(method|approach|architecture|system|design|scheduler|scheduling|allocation|retrieval|serving|inference)\b/i)
    ?? primaryParagraph;
  const experimentParagraph = findParagraph(bundle, /\b(experiment|evaluation|result|benchmark|throughput|latency|accuracy|cost|token|gpu)\b/i)
    ?? primaryParagraph;
  const primaryRef = sourceRefForAbstract(bundle) ?? sourceRefForParagraph(bundle, primaryParagraph) ?? fallbackSourceRef(bundle);
  const methodRef = sourceRefForParagraph(bundle, methodParagraph) ?? primaryRef;
  const evidenceRef = sourceRefForParagraph(bundle, experimentParagraph) ?? primaryRef;

  const firstAbstractSentence = splitSentences(abstractText)[0] ?? `This paper studies ${bundle.title}.`;
  const contributionSentence = firstSentenceMatching(
    abstractText,
    /\b(propose|present|introduce|develop|contribute|show|demonstrate|design)\b/i,
  ) ?? firstAbstractSentence;
  const findingSentence = firstSentenceMatching(
    `${abstractText} ${experimentParagraph?.text ?? ''}`,
    /\b(result|show|demonstrate|improve|reduce|increase|outperform|evaluation|experiment)\b/i,
  ) ?? contributionSentence;
  const methodSentence = splitSentences(methodParagraph?.text ?? '')[0]
    ?? `The fulltext describes a method or system design related to ${bundle.title}.`;
  const experimentSentence = splitSentences(experimentParagraph?.text ?? '')[0]
    ?? `The fulltext contains evidence that can support downstream retrieval and review.`;

  categories.research_problem.push(item(
    'research_problem',
    1,
    'problem',
    firstAbstractSentence,
    `Lightweight curated problem statement grounded in the abstract or first available fulltext evidence for "${bundle.title}".`,
    [primaryRef],
  ));
  categories.contributions.push(item(
    'contributions',
    1,
    'contribution',
    contributionSentence,
    'Contribution candidate selected from abstract language with source-preserving provenance.',
    [primaryRef],
  ));
  categories.method.push(item(
    'method',
    1,
    'method',
    methodSentence,
    'Method candidate selected from a method/system/retrieval/scheduling-related section when available.',
    [methodRef],
    { confidence: 0.58 },
  ));
  categories.key_findings.push(item(
    'key_findings',
    1,
    'finding',
    findingSentence,
    'Finding candidate selected from abstract or evaluation-related fulltext evidence.',
    [evidenceRef],
    { confidence: 0.57 },
  ));
  categories.evidence_candidates.push(item(
    'evidence_candidates',
    1,
    'retrieval_evidence',
    experimentSentence,
    `Primary retrieval evidence candidate. Sections=${bundle.sections.length}; paragraphs=${bundle.paragraphs.length}.`,
    [evidenceRef],
    { confidence: 0.56, evidenceStrength: 'medium' },
  ));
  categories.automation_signals.push(item(
    'automation_signals',
    1,
    'pipeline_signal',
    `This dossier was generated to unblock retrieval, chunking, embedding, and indexing for ${bundle.literature_id}.`,
    'The signal is intentionally lightweight and should be superseded by a stronger human or LLM dossier for close reading.',
    [primaryRef],
    { confidence: 0.5, evidenceStrength: 'low' },
  ));

  const displayDigest = truncate(
    [
      bundle.title,
      firstAbstractSentence,
      contributionSentence !== firstAbstractSentence ? contributionSentence : '',
    ].filter(Boolean).join(' '),
    700,
  );
  return {
    schema_version: 'key_content.v1',
    extraction_profile: 'paper_semantic_dossier.v1',
    readiness_status: 'PARTIAL_READY',
    input_refs: {
      fulltext_checksum: bundle.document.normalized_text_checksum,
      curation_strategy: 'codex_lightweight_source_anchored_v1',
      paragraph_count: bundle.paragraphs.length,
      section_count: bundle.sections.length,
    },
    categories,
    quality_report: {
      completeness_score: 0.43,
      confidence: 0.6,
      blockers: [],
      warnings: [
        'Lightweight codex_curated dossier generated without section-level LLM extraction.',
        'Use for retrieval/index availability; replace with stronger dossier before deep paper claims.',
      ],
      conflicts: [],
      extraction_diagnostics: [{
        code: 'CODEX_LIGHTWEIGHT_DOSSIER',
        severity: 'warning',
        message: 'Generated from abstract and selected fulltext paragraphs with resolvable source refs.',
        external_model_calls: 0,
      }],
    },
    display_digest: displayDigest,
    generated_at: new Date().toISOString(),
  };
}

function summarizeTargets(corpus) {
  const withFulltext = corpus.filter((row) => row.fulltextDocuments.length > 0).length;
  const keyReady = corpus.filter((row) => stageStatus(row, 'KEY_CONTENT_READY') === 'SUCCEEDED').length;
  const keyFailed = corpus.filter((row) => stageStatus(row, 'KEY_CONTENT_READY') === 'FAILED').length;
  return {
    corpus_count: corpus.length,
    fulltext_ready_count: withFulltext,
    key_content_ready_count: keyReady,
    key_content_failed_count: keyFailed,
  };
}

async function countState(prisma, corpusIds) {
  const rows = await prisma.literatureRecord.findMany({
    where: { id: { in: corpusIds } },
    select: {
      id: true,
      contentAssets: { select: { id: true } },
      fulltextDocuments: { select: { id: true } },
      embeddingChunks: { select: { id: true }, take: 1 },
      pipelineStageStates: { select: { stageCode: true, status: true } },
    },
  });
  const status = (row, stage) => row.pipelineStageStates.find((state) => state.stageCode === stage)?.status ?? 'NOT_STARTED';
  return {
    corpus: rows.length,
    with_assets: rows.filter((row) => row.contentAssets.length > 0).length,
    fulltext_preprocessed: rows.filter((row) => status(row, 'FULLTEXT_PREPROCESSED') === 'SUCCEEDED').length,
    key_content_ready: rows.filter((row) => status(row, 'KEY_CONTENT_READY') === 'SUCCEEDED').length,
    chunked: rows.filter((row) => status(row, 'CHUNKED') === 'SUCCEEDED').length,
    embedded: rows.filter((row) => status(row, 'EMBEDDED') === 'SUCCEEDED').length,
    indexed: rows.filter((row) => status(row, 'INDEXED') === 'SUCCEEDED').length,
    with_embedding_chunks: rows.filter((row) => row.embeddingChunks.length > 0).length,
  };
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
      pipelineStageStates: { select: { stageCode: true, status: true } },
    },
    orderBy: { id: 'asc' },
  });
  const corpus = rows.filter(hasCorpusTag);
  const explicitIds = literatureIdsArg
    ? new Set(literatureIdsArg.split(',').map((item) => item.trim()).filter(Boolean))
    : null;
  const selected = corpus
    .filter((row) => {
      if (explicitIds) return explicitIds.has(row.id);
      if (selector === 'all-tagged') return true;
      if (selector === 'all-fulltext') return row.fulltextDocuments.length > 0;
      if (selector === 'key-failed') return stageStatus(row, 'KEY_CONTENT_READY') === 'FAILED';
      if (selector === 'oa-fulltext') return row.rightsClass === 'OA' && row.fulltextDocuments.length > 0;
      return row.arxivId && row.fulltextDocuments.length > 0 && isPriority(row, ['priority:p0', 'priority:p1', 'priority:p2']);
    })
    .filter((row) => row.fulltextDocuments.length > 0)
    .filter((row) => stageStatus(row, 'KEY_CONTENT_READY') !== 'SUCCEEDED')
    .sort(sortTargets)
    .slice(0, Number.isFinite(limit) ? limit : 3);
  return { rows, corpus, selected };
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
const { rows, corpus, selected } = await selectTargets(prisma);
const corpusIds = corpus.map((row) => row.id);
const before = await countState(prisma, corpusIds);
const app = buildApp();
await app.ready();

let result = {
  run_id: runId,
  apply,
  selector,
  limit,
  generated_at: new Date().toISOString(),
  total_records: rows.length,
  target_summary: summarizeTargets(corpus),
  selected_targets: selected.map(compactTarget),
  imports: [],
};

try {
  for (const target of selected) {
    const startedAt = new Date().toISOString();
    try {
      const bundle = await request(
        app,
        'GET',
        `/literature/${encodeURIComponent(target.id)}/content-processing/key-content-curation-bundle`,
      );
      const dossier = buildDossier(bundle);
      const payload = {
        curation_source: 'codex_curated',
        curator: 'codex:key-content-curated-dossier-runner',
        dossier,
      };
      const dryRun = await request(
        app,
        'POST',
        `/literature/${encodeURIComponent(target.id)}/content-processing/key-content-dossier/dry-run`,
        payload,
      );
      let imported = null;
      if (apply && dryRun.valid) {
        imported = await request(
          app,
          'POST',
          `/literature/${encodeURIComponent(target.id)}/content-processing/key-content-dossier`,
          payload,
        );
      }
      result.imports.push({
        literature_id: target.id,
        title: target.title,
        started_at: startedAt,
        status: dryRun.valid ? (apply ? 'IMPORTED' : 'DRY_RUN_VALID') : 'DRY_RUN_INVALID',
        readiness_status: dryRun.readiness_status,
        dry_run: {
          valid: dryRun.valid,
          checksum: dryRun.checksum,
          issues: dryRun.issues,
          diagnostics: dryRun.diagnostics,
          repaired_source_ref_count: dryRun.repaired_source_ref_count,
          would_mark_downstream_stale: dryRun.would_mark_downstream_stale,
        },
        import_result: imported
          ? {
              artifact_id: imported.artifact_id,
              checksum: imported.checksum,
              readiness_status: imported.readiness_status,
              source: imported.source,
              state_key_content_ready: imported.state?.key_content_ready,
            }
          : null,
      });
    } catch (error) {
      result.imports.push({
        literature_id: target.id,
        title: target.title,
        started_at: startedAt,
        status: 'FAILED',
        error: error instanceof Error ? error.message : 'Unknown import error.',
        error_body: error?.body ?? null,
      });
    }
  }
} finally {
  await app.close();
}

const after = await countState(prisma, corpusIds);
await prisma.$disconnect();

const importedCount = result.imports.filter((item) => item.status === 'IMPORTED').length;
const dryRunValidCount = result.imports.filter((item) => item.status === 'DRY_RUN_VALID').length;
const invalidCount = result.imports.filter((item) => item.status === 'DRY_RUN_INVALID').length;
const failedCount = result.imports.filter((item) => item.status === 'FAILED').length;
result = {
  ...result,
  before,
  after,
  summary: {
    selected: selected.length,
    imported: importedCount,
    dry_run_valid: dryRunValidCount,
    dry_run_invalid: invalidCount,
    failed: failedCount,
  },
};

const artifact = await writeArtifact(`${runId}-key-content-curated${apply ? '-apply' : '-dry-run'}`, {
  report: {
    run_id: result.run_id,
    apply: result.apply,
    selector: result.selector,
    limit: result.limit,
    generated_at: result.generated_at,
    target_summary: result.target_summary,
    selected_targets: result.selected_targets,
    summary: result.summary,
    before: result.before,
    after: result.after,
    imports: result.imports.map((item) => ({
      literature_id: item.literature_id,
      title: item.title,
      status: item.status,
      readiness_status: item.readiness_status,
      dry_run_valid: item.dry_run?.valid ?? null,
      import_result: item.import_result,
      issues: item.dry_run?.issues ?? null,
      error: item.error ?? null,
    })),
  },
  detail: result,
});

console.log(JSON.stringify({ ...artifact, summary: result.summary, before: result.before, after: result.after }, null, 2));
