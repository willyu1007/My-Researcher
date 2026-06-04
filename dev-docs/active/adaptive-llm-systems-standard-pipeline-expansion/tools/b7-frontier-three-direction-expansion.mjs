import fs from 'node:fs/promises';
import path from 'node:path';

import { buildApp } from '../../../../apps/backend/src/app.ts';
import { getPrismaClient } from '../../../../apps/backend/src/repositories/prisma/prisma-client.ts';

process.env.RESEARCH_LIFECYCLE_REPOSITORY ??= 'prisma';
process.env.TITLE_CARD_REPOSITORY ??= process.env.RESEARCH_LIFECYCLE_REPOSITORY;
process.env.AUTO_PULL_REPOSITORY ??= process.env.RESEARCH_LIFECYCLE_REPOSITORY;
process.env.APPLICATION_SETTINGS_REPOSITORY ??= process.env.RESEARCH_LIFECYCLE_REPOSITORY;
process.env.EXPERIMENT_FOUNDATION_REPOSITORY ??= process.env.RESEARCH_LIFECYCLE_REPOSITORY;
process.env.PAPER_IMPLEMENTATION_REPOSITORY ??= process.env.RESEARCH_LIFECYCLE_REPOSITORY;

const TASK_DIR = 'dev-docs/active/adaptive-llm-systems-standard-pipeline-expansion';
const OUT_DIR = path.join(TASK_DIR, 'artifacts');
const TMP_DETAIL_DIR = '.ai/.tmp/adaptive-llm-systems-standard-pipeline-expansion';
const REPORT_PATH = path.join(OUT_DIR, 'b7-frontier-three-direction-expansion-report.json');
const MANIFEST_PATH = path.join(OUT_DIR, 'b7-frontier-three-direction-expansion-manifest.json');
const DETAIL_PATH = path.join(TMP_DETAIL_DIR, 'b7-frontier-three-direction-expansion-detail.json');
const MD_PATH = path.join(TASK_DIR, '06-b7-frontier-three-direction-expansion.md');

const APPLY = process.argv.includes('--apply');
const USE_EXACT_PLAN = process.argv.includes('--exact-plan') || process.env.B7_USE_EXACT_PLAN === '1';
const REQUEST_DELAY_MS = Number.parseInt(process.env.ARXIV_B7_DELAY_MS ?? '1400', 10);
const REQUEST_TIMEOUT_MS = Number.parseInt(process.env.ARXIV_B7_TIMEOUT_MS ?? '15000', 10);
const QUERY_MAX_RESULTS = Number.parseInt(process.env.ARXIV_B7_QUERY_MAX_RESULTS ?? '25', 10);
const IMPORT_PER_DIRECTION_LIMIT = Number.parseInt(process.env.B7_IMPORT_PER_DIRECTION_LIMIT ?? '6', 10);
const MIN_YEAR = Number.parseInt(process.env.B7_MIN_YEAR ?? '2023', 10);

const BATCH = {
  batch_id: 'B7-frontier-three-direction-expansion',
  batch_kind: 'frontier-three-direction-controlled-import',
  source_route: USE_EXACT_PLAN ? 'arxiv:html-exact-id-sequential' : 'arxiv:api-search',
  purpose: 'Expand the adaptive LLM systems corpus around the three agreed directions through standard controlled metadata import.',
  content_processing_enqueued: false,
};

const DIRECTIONS = [
  {
    direction_id: 'rag-aware-allocation',
    direction_tag: 'direction:rag-aware-allocation',
    collection_tag: 'collection:core',
    common_tags: [
      'subcluster:rag-serving-optimization',
      'resource:retrieval-depth',
      'resource:context-window',
      'decision:retrieve-or-not',
      'decision:budget-allocate',
      'metric:answer-quality',
      'metric:cost-per-query',
      'bridge:core-system',
    ],
    queries: [
      {
        query_id: 'Q-B7-RAG-01',
        query_family: 'RAG Serving And Resource Allocation',
        search_query: 'all:"retrieval augmented generation" AND all:"serving"',
      },
      {
        query_id: 'Q-B7-RAG-02',
        query_family: 'Adaptive Retrieval / Routing',
        search_query: 'all:"retrieval augmented generation" AND (all:"routing" OR all:"adaptive")',
      },
      {
        query_id: 'Q-B7-RAG-03',
        query_family: 'RAG Cache / Context Reuse',
        search_query: 'all:"retrieval augmented generation" AND (all:"cache" OR all:"context reuse")',
      },
      {
        query_id: 'Q-B7-RAG-04',
        query_family: 'Retrieval-Compute Allocation',
        search_query: 'all:"retrieval" AND all:"compute" AND all:"language model"',
      },
    ],
    exact_plan: [
      { arxiv_id: '2605.27494', query_id: 'Q-B7-RAG-03', query_family: 'RAG Cache / Context Reuse' },
      { arxiv_id: '2604.26176', query_id: 'Q-B7-RAG-03', query_family: 'RAG Cache / Context Reuse' },
      { arxiv_id: '2604.22849', query_id: 'Q-B7-RAG-02', query_family: 'Adaptive Retrieval / Routing' },
      { arxiv_id: '2601.10644', query_id: 'Q-B7-RAG-01', query_family: 'RAG Serving And Resource Allocation' },
      { arxiv_id: '2511.02919', query_id: 'Q-B7-RAG-03', query_family: 'RAG Cache / Context Reuse' },
      { arxiv_id: '2504.01281', query_id: 'Q-B7-RAG-04', query_family: 'Retrieval-Compute Allocation' },
    ],
  },
  {
    direction_id: 'llm-serving-resource-allocation',
    direction_tag: 'direction:llm-serving-resource-allocation',
    collection_tag: 'collection:system-support',
    common_tags: [
      'subcluster:llm-serving-scheduling',
      'resource:batch-slots',
      'resource:kv-cache',
      'resource:prefill',
      'resource:decode',
      'resource:gpu-memory',
      'decision:schedule',
      'decision:cache-admit-evict',
      'metric:ttft',
      'metric:tpot',
      'metric:p95-latency',
    ],
    queries: [
      {
        query_id: 'Q-B7-SYS-01',
        query_family: 'LLM Serving Scheduling',
        search_query: 'all:"large language model" AND all:"serving" AND all:"scheduling"',
      },
      {
        query_id: 'Q-B7-SYS-02',
        query_family: 'KV Cache Scheduling',
        search_query: 'all:"large language model" AND all:"KV cache"',
      },
      {
        query_id: 'Q-B7-SYS-03',
        query_family: 'Prefill Decode Scheduling',
        search_query: 'all:"prefill" AND all:"decode" AND all:"large language model"',
      },
      {
        query_id: 'Q-B7-SYS-04',
        query_family: 'LLM Inference Resource Allocation',
        search_query: 'all:"LLM inference" AND (all:"resource allocation" OR all:"scheduling")',
      },
    ],
    exact_plan: [
      { arxiv_id: '2605.13734', query_id: 'Q-B7-SYS-02', query_family: 'KV Cache Scheduling' },
      { arxiv_id: '2508.06133', query_id: 'Q-B7-SYS-03', query_family: 'Prefill Decode Scheduling' },
      { arxiv_id: '2501.06709', query_id: 'Q-B7-SYS-02', query_family: 'KV Cache Scheduling' },
      { arxiv_id: '2504.11320', query_id: 'Q-B7-SYS-04', query_family: 'LLM Inference Resource Allocation' },
      { arxiv_id: '2407.00023', query_id: 'Q-B7-SYS-01', query_family: 'LLM Serving Scheduling' },
      { arxiv_id: '2408.08147', query_id: 'Q-B7-SYS-03', query_family: 'Prefill Decode Scheduling' },
    ],
  },
  {
    direction_id: 'test-time-compute-budgeting',
    direction_tag: 'direction:test-time-compute-budgeting',
    collection_tag: 'collection:strategy-support',
    common_tags: [
      'subcluster:test-time-scaling',
      'subcluster:adaptive-compute',
      'resource:generation-tokens',
      'resource:reasoning-steps',
      'resource:cost-budget',
      'decision:budget-allocate',
      'decision:model-route',
      'decision:reason-continue-stop',
      'metric:answer-quality',
      'metric:cost-per-query',
      'bridge:core-strategy',
    ],
    queries: [
      {
        query_id: 'Q-B7-STR-01',
        query_family: 'Test-Time Compute Budget',
        search_query: 'all:"test-time compute" AND all:"budget"',
      },
      {
        query_id: 'Q-B7-STR-02',
        query_family: 'Inference-Time Scaling',
        search_query: 'all:"inference time scaling" AND all:"language model"',
      },
      {
        query_id: 'Q-B7-STR-03',
        query_family: 'Adaptive Reasoning Compute',
        search_query: 'all:"adaptive compute" AND all:"reasoning" AND all:"language model"',
      },
      {
        query_id: 'Q-B7-STR-04',
        query_family: 'Model Routing And Cascades',
        search_query: 'all:"model routing" AND all:"language model"',
      },
    ],
    exact_plan: [
      { arxiv_id: '2604.14853', query_id: 'Q-B7-STR-01', query_family: 'Test-Time Compute Budget' },
      { arxiv_id: '2603.18411', query_id: 'Q-B7-STR-03', query_family: 'Adaptive Reasoning Compute' },
      { arxiv_id: '2602.09574', query_id: 'Q-B7-STR-01', query_family: 'Test-Time Compute Budget' },
      { arxiv_id: '2602.03975', query_id: 'Q-B7-STR-01', query_family: 'Test-Time Compute Budget' },
      { arxiv_id: '2602.03814', query_id: 'Q-B7-STR-01', query_family: 'Test-Time Compute Budget' },
      { arxiv_id: '2604.12262', query_id: 'Q-B7-STR-04', query_family: 'Model Routing And Cascades' },
      { arxiv_id: '2503.07572', query_id: 'Q-B7-STR-03', query_family: 'Adaptive Reasoning Compute' },
      { arxiv_id: '2502.13962', query_id: 'Q-B7-STR-02', query_family: 'Inference-Time Scaling' },
      { arxiv_id: '2503.24235', query_id: 'Q-B7-STR-02', query_family: 'Inference-Time Scaling' },
    ],
  },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function decodeXml(value) {
  return String(value ?? '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function normalizeText(value) {
  return decodeXml(value).replace(/\s+/g, ' ').trim();
}

function normalizeArxivId(value) {
  return normalizeText(value)
    .replace(/^https?:\/\/arxiv\.org\/abs\//, '')
    .replace(/v\d+$/i, '')
    .replace(/^arxiv:/i, '');
}

function unique(values) {
  return [...new Set(values.filter((value) => typeof value === 'string' && value.length > 0))];
}

function extractTagValue(xml, tagName) {
  const match = xml.match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i'));
  return match ? normalizeText(match[1]) : '';
}

function extractAuthors(entryXml) {
  const authors = [];
  for (const match of entryXml.matchAll(/<author>\s*<name>([\s\S]*?)<\/name>\s*<\/author>/gi)) {
    authors.push(normalizeText(match[1]));
  }
  return unique(authors);
}

function parseArxivApiEntries(xml) {
  const entries = [];
  for (const match of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/gi)) {
    const entryXml = match[1] ?? '';
    const id = normalizeArxivId(extractTagValue(entryXml, 'id'));
    const title = normalizeText(extractTagValue(entryXml, 'title'));
    const abstract = normalizeText(extractTagValue(entryXml, 'summary'));
    const published = normalizeText(extractTagValue(entryXml, 'published'));
    const updated = normalizeText(extractTagValue(entryXml, 'updated'));
    const year = Number.parseInt((published || updated).slice(0, 4), 10);
    const authors = extractAuthors(entryXml);
    if (!id || !title || !abstract || authors.length === 0) {
      continue;
    }
    entries.push({
      provider: 'arxiv',
      external_id: id,
      title,
      abstract,
      authors,
      year: Number.isFinite(year) ? year : undefined,
      arxiv_id: id,
      source_url: `https://arxiv.org/abs/${id}`,
      rights_class: 'UNKNOWN',
      published,
      updated,
    });
  }
  return entries;
}

function readMetaContent(html, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const direct = html.match(new RegExp(`<meta\\s+name=["']${escaped}["']\\s+content=["']([\\s\\S]*?)["']\\s*/?>`, 'i'));
  if (direct) {
    return decodeXml(direct[1] ?? '');
  }
  const reversed = html.match(new RegExp(`<meta\\s+content=["']([\\s\\S]*?)["']\\s+name=["']${escaped}["']\\s*/?>`, 'i'));
  return reversed ? decodeXml(reversed[1] ?? '') : '';
}

function readRepeatedMetaContent(html, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const results = [];
  for (const match of html.matchAll(new RegExp(`<meta\\s+name=["']${escaped}["']\\s+content=["']([\\s\\S]*?)["']\\s*/?>`, 'gi'))) {
    results.push(decodeXml(match[1] ?? ''));
  }
  return results;
}

function normalizeCitationAuthor(value) {
  const cleaned = normalizeText(value);
  const commaIndex = cleaned.indexOf(',');
  if (commaIndex > 0) {
    const last = cleaned.slice(0, commaIndex).trim();
    const first = cleaned.slice(commaIndex + 1).trim();
    return normalizeText(`${first} ${last}`);
  }
  return cleaned;
}

function parseArxivHtml(html, arxivId) {
  const title = normalizeText(readMetaContent(html, 'citation_title'));
  const authors = readRepeatedMetaContent(html, 'citation_author')
    .map(normalizeCitationAuthor)
    .filter(Boolean);
  const citationDate = normalizeText(readMetaContent(html, 'citation_date'));
  const parsedId = normalizeArxivId(normalizeText(readMetaContent(html, 'citation_arxiv_id')) || arxivId);
  const year = Number.parseInt(citationDate.slice(0, 4), 10);
  const abstract = normalizeText(readMetaContent(html, 'citation_abstract'));
  if (!title || authors.length === 0 || !abstract) {
    throw new Error(`Incomplete arXiv HTML metadata for ${arxivId}`);
  }
  return {
    provider: 'arxiv',
    external_id: parsedId || arxivId,
    title,
    abstract,
    authors,
    year: Number.isFinite(year) ? year : undefined,
    arxiv_id: parsedId || arxivId,
    source_url: `https://arxiv.org/abs/${parsedId || arxivId}`,
    rights_class: 'UNKNOWN',
  };
}

async function fetchArxivSearch(queryPlan) {
  const url = new URL('https://export.arxiv.org/api/query');
  url.searchParams.set('search_query', queryPlan.search_query);
  url.searchParams.set('start', '0');
  url.searchParams.set('max_results', String(QUERY_MAX_RESULTS));
  url.searchParams.set('sortBy', 'submittedDate');
  url.searchParams.set('sortOrder', 'descending');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': `paper-engineering-assistant/0.1 ${BATCH.batch_id}`,
      },
    });
    if (!response.ok) {
      throw new Error(`arXiv API search failed for ${queryPlan.query_id}: ${response.status}`);
    }
    const xml = await response.text();
    return parseArxivApiEntries(xml);
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchOneArxivHtml(arxivId) {
  const url = new URL(`https://arxiv.org/abs/${encodeURIComponent(arxivId)}`);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': `paper-engineering-assistant/0.1 ${BATCH.batch_id}`,
      },
    });
    if (!response.ok) {
      throw new Error(`arXiv HTML exact-id request failed for ${arxivId}: ${response.status}`);
    }
    return parseArxivHtml(await response.text(), arxivId);
  } finally {
    clearTimeout(timeout);
  }
}

function keywordScore(text, patterns) {
  const lower = text.toLowerCase();
  return patterns.reduce((score, pattern) => score + (lower.includes(pattern) ? 1 : 0), 0);
}

function scoreCandidate(candidate) {
  const text = `${candidate.title} ${candidate.abstract}`.toLowerCase();
  let score = 0;
  if ((candidate.year ?? 0) >= 2026) score += 6;
  else if ((candidate.year ?? 0) === 2025) score += 5;
  else if ((candidate.year ?? 0) === 2024) score += 3;
  else if ((candidate.year ?? 0) === 2023) score += 1;
  score += keywordScore(text, [
    'retrieval augmented generation',
    'rag',
    'serving',
    'scheduling',
    'resource',
    'allocation',
    'cache',
    'kv cache',
    'prefill',
    'decode',
    'test-time',
    'test time',
    'budget',
    'adaptive',
    'routing',
    'latency',
    'throughput',
  ]);
  score += candidate.query_ids.length;
  return score;
}

function tagsForCandidate(candidate, rankWithinDirection) {
  const direction = DIRECTIONS.find((item) => item.direction_id === candidate.direction_id);
  const priority = rankWithinDirection <= 3 ? 'priority:p1' : 'priority:p2';
  return unique([
    direction.collection_tag,
    direction.direction_tag,
    ...direction.common_tags,
    'classification:rule-derived',
    rankWithinDirection <= 3 ? 'classification:needs-judgment-card' : '',
    'batch:b7-frontier-three-direction-expansion',
    priority,
    ...candidate.query_ids.map((queryId) => `query:${queryId.toLowerCase()}`),
  ]);
}

async function countState(prisma) {
  const [
    literature_count,
    source_count,
    pipeline_run_count,
    content_asset_count,
    content_processing_batch_job_count,
    fulltext_acquisition_job_count,
  ] = await Promise.all([
    prisma.literatureRecord.count(),
    prisma.literatureSource.count(),
    prisma.literaturePipelineRun.count(),
    prisma.literatureContentAsset.count(),
    prisma.literatureContentProcessingBatchJob.count(),
    prisma.literatureFulltextAcquisitionJob.count(),
  ]);
  return {
    literature_count,
    source_count,
    pipeline_run_count,
    content_asset_count,
    content_processing_batch_job_count,
    fulltext_acquisition_job_count,
  };
}

async function readExistingArxivIds(prisma, arxivIds) {
  const rows = await prisma.literatureRecord.findMany({
    where: { arxivId: { in: arxivIds } },
    select: { id: true, arxivId: true, title: true, tags: true },
  });
  return rows.map((row) => ({
    literature_id: row.id,
    arxiv_id: row.arxivId,
    title: row.title,
    tags: row.tags,
  }));
}

async function discoverCandidates() {
  const byId = new Map();
  const querySummaries = [];
  if (USE_EXACT_PLAN) {
    for (const direction of DIRECTIONS) {
      for (const plan of direction.exact_plan) {
        console.error(`[b7] exact ${plan.query_id}: ${plan.arxiv_id}`);
        try {
          const entry = await fetchOneArxivHtml(plan.arxiv_id);
          querySummaries.push({
            direction_id: direction.direction_id,
            query_id: plan.query_id,
            query_family: plan.query_family,
            search_query: `exact-arxiv:${plan.arxiv_id}`,
            result_count: 1,
          });
          if ((entry.year ?? 0) >= MIN_YEAR) {
            byId.set(entry.arxiv_id, {
              ...entry,
              direction_id: direction.direction_id,
              direction_ids: [direction.direction_id],
              query_ids: [plan.query_id],
              query_families: [plan.query_family],
              search_hits: [{
                direction_id: direction.direction_id,
                query_id: plan.query_id,
                query_family: plan.query_family,
              }],
            });
          }
        } catch (error) {
          querySummaries.push({
            direction_id: direction.direction_id,
            query_id: plan.query_id,
            query_family: plan.query_family,
            search_query: `exact-arxiv:${plan.arxiv_id}`,
            result_count: 0,
            error: error instanceof Error ? error.message : String(error),
          });
        }
        await sleep(REQUEST_DELAY_MS);
      }
    }
    const candidates = [...byId.values()]
      .map((candidate) => ({
        ...candidate,
        score: scoreCandidate(candidate),
      }))
      .sort((left, right) => right.score - left.score || String(right.year).localeCompare(String(left.year)) || left.title.localeCompare(right.title));
    return { candidates, querySummaries };
  }
  for (const direction of DIRECTIONS) {
    for (const queryPlan of direction.queries) {
      console.error(`[b7] search ${queryPlan.query_id}: ${queryPlan.search_query}`);
      const entries = await fetchArxivSearch(queryPlan);
      querySummaries.push({
        direction_id: direction.direction_id,
        query_id: queryPlan.query_id,
        query_family: queryPlan.query_family,
        search_query: queryPlan.search_query,
        result_count: entries.length,
      });
      for (const entry of entries) {
        if ((entry.year ?? 0) < MIN_YEAR) {
          continue;
        }
        const current = byId.get(entry.arxiv_id) ?? {
          ...entry,
          direction_id: direction.direction_id,
          direction_ids: [],
          query_ids: [],
          query_families: [],
          search_hits: [],
        };
        current.direction_ids.push(direction.direction_id);
        current.query_ids.push(queryPlan.query_id);
        current.query_families.push(queryPlan.query_family);
        current.search_hits.push({
          direction_id: direction.direction_id,
          query_id: queryPlan.query_id,
          query_family: queryPlan.query_family,
        });
        byId.set(entry.arxiv_id, {
          ...current,
          direction_ids: unique(current.direction_ids),
          query_ids: unique(current.query_ids),
          query_families: unique(current.query_families),
        });
      }
      await sleep(REQUEST_DELAY_MS);
    }
  }
  const candidates = [...byId.values()]
    .map((candidate) => ({
      ...candidate,
      score: scoreCandidate(candidate),
    }))
    .sort((left, right) => right.score - left.score || String(right.year).localeCompare(String(left.year)) || left.title.localeCompare(right.title));
  return { candidates, querySummaries };
}

function selectCandidates(candidates, existingIds) {
  const existing = new Set(existingIds);
  const selected = [];
  const perDirection = new Map(DIRECTIONS.map((direction) => [direction.direction_id, 0]));
  for (const candidate of candidates) {
    if (existing.has(candidate.arxiv_id)) {
      continue;
    }
    const directionCount = perDirection.get(candidate.direction_id) ?? 0;
    if (directionCount >= IMPORT_PER_DIRECTION_LIMIT) {
      continue;
    }
    const rankWithinDirection = directionCount + 1;
    selected.push({
      ...candidate,
      rank_within_direction: rankWithinDirection,
      tags: tagsForCandidate(candidate, rankWithinDirection),
    });
    perDirection.set(candidate.direction_id, rankWithinDirection);
  }
  return selected;
}

function compactItem(item) {
  return {
    arxiv_id: item.arxiv_id,
    title: item.title,
    year: item.year,
    author_count: item.authors.length,
    direction_id: item.direction_id,
    direction_ids: item.direction_ids,
    query_ids: item.query_ids,
    query_families: item.query_families,
    score: item.score,
    source_url: item.source_url,
    tags: item.tags,
  };
}

async function importSelected(selected) {
  const app = buildApp();
  await app.ready();
  const response = await app.inject({
    method: 'POST',
    url: '/literature/collections/import',
    payload: {
      items: selected.map((item) => ({
        provider: item.provider,
        external_id: item.external_id,
        title: item.title,
        abstract: item.abstract,
        authors: item.authors,
        year: item.year,
        arxiv_id: item.arxiv_id,
        source_url: item.source_url,
        rights_class: item.rights_class,
        tags: item.tags,
      })),
    },
  });
  await app.close();
  let parsedPayload = null;
  try {
    parsedPayload = JSON.parse(response.payload);
  } catch {
    parsedPayload = { raw: response.payload };
  }
  return {
    status_code: response.statusCode,
    payload: parsedPayload,
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# 06 B7 Frontier Three-Direction Expansion');
  lines.push('');
  lines.push('## Decision');
  lines.push(`- State: ${report.apply ? 'imported' : 'dry-run'}.`);
  lines.push(`- Batch ID: \`${report.batch.batch_id}\`.`);
  lines.push('- Scope: controlled metadata import only; no content-processing side effects.');
  lines.push('');
  lines.push('## Summary');
  lines.push('| Metric | Value |');
  lines.push('| --- | ---: |');
  lines.push(`| Query groups | ${report.query_summaries.length} |`);
  lines.push(`| Unique discovered candidates | ${report.discovered_count} |`);
  lines.push(`| Existing DB matches | ${report.existing_count} |`);
  lines.push(`| Selected import candidates | ${report.selected_count} |`);
  lines.push(`| Import status code | ${report.import_result?.status_code ?? 'n/a'} |`);
  lines.push(`| New literature delta | ${report.deltas.literature_count} |`);
  lines.push(`| New source delta | ${report.deltas.source_count} |`);
  lines.push(`| Pipeline/content/fulltext deltas | ${report.deltas.pipeline_run_count}/${report.deltas.content_asset_count}/${report.deltas.content_processing_batch_job_count}/${report.deltas.fulltext_acquisition_job_count} |`);
  lines.push('');
  lines.push('## Direction Coverage');
  lines.push('| Direction | Selected | Imported/New |');
  lines.push('| --- | ---: | ---: |');
  for (const row of report.direction_summary) {
    lines.push(`| \`${row.direction_id}\` | ${row.selected_count} | ${row.new_count} |`);
  }
  lines.push('');
  lines.push('## Selected Records');
  lines.push('| arXiv | Year | Direction | Title | New | Literature ID |');
  lines.push('| --- | ---: | --- | --- | --- | --- |');
  for (const item of report.selected_items) {
    lines.push(`| [${item.arxiv_id}](${item.source_url}) | ${item.year ?? ''} | \`${item.direction_id}\` | ${item.title.replace(/\|/g, '/')} | ${String(item.is_new)} | \`${item.literature_id ?? ''}\` |`);
  }
  lines.push('');
  lines.push('## Safety');
  lines.push('- Content-processing enqueued: `false`.');
  lines.push('- No raw fulltext, PDFs, embeddings, cloned repos, or experiment artifacts stored in repo.');
  lines.push(`- Detailed local evidence: \`${DETAIL_PATH}\`.`);
  return `${lines.join('\n').trimEnd()}\n`;
}

const prisma = getPrismaClient();
const before = await countState(prisma);
const { candidates, querySummaries } = await discoverCandidates();
const existingRecords = await readExistingArxivIds(prisma, candidates.map((candidate) => candidate.arxiv_id));
const selected = selectCandidates(candidates, existingRecords.map((record) => record.arxiv_id));
const importResult = APPLY ? await importSelected(selected) : null;
const after = await countState(prisma);
const existingAfter = await readExistingArxivIds(prisma, selected.map((candidate) => candidate.arxiv_id));
await prisma.$disconnect();

const afterByArxivId = new Map(existingAfter.map((record) => [record.arxiv_id, record]));
const resultByArxivId = new Map();
if (Array.isArray(importResult?.payload?.results)) {
  for (const result of importResult.payload.results) {
    resultByArxivId.set(normalizeArxivId(result.source_url), result);
  }
}

const selectedItems = selected.map((item) => {
  const imported = resultByArxivId.get(item.arxiv_id);
  const afterRecord = afterByArxivId.get(item.arxiv_id);
  return {
    ...compactItem(item),
    literature_id: imported?.literature_id ?? afterRecord?.literature_id ?? null,
    is_new: imported?.is_new ?? null,
    matched_by: imported?.matched_by ?? null,
    source_provider: imported?.source_provider ?? null,
  };
});

const directionSummary = DIRECTIONS.map((direction) => {
  const selectedForDirection = selectedItems.filter((item) => item.direction_id === direction.direction_id);
  return {
    direction_id: direction.direction_id,
    selected_count: selectedForDirection.length,
    new_count: selectedForDirection.filter((item) => item.is_new === true).length,
  };
});

const report = {
  generated_at: new Date().toISOString(),
  apply: APPLY,
  batch: BATCH,
  request_delay_ms: REQUEST_DELAY_MS,
  request_timeout_ms: REQUEST_TIMEOUT_MS,
  query_max_results: QUERY_MAX_RESULTS,
  import_per_direction_limit: IMPORT_PER_DIRECTION_LIMIT,
  min_year: MIN_YEAR,
  exact_plan: USE_EXACT_PLAN,
  query_summaries: querySummaries,
  discovered_count: candidates.length,
  existing_count: existingRecords.length,
  selected_count: selected.length,
  direction_summary: directionSummary,
  import_result: importResult,
  before,
  after,
  deltas: {
    literature_count: after.literature_count - before.literature_count,
    source_count: after.source_count - before.source_count,
    pipeline_run_count: after.pipeline_run_count - before.pipeline_run_count,
    content_asset_count: after.content_asset_count - before.content_asset_count,
    content_processing_batch_job_count: after.content_processing_batch_job_count - before.content_processing_batch_job_count,
    fulltext_acquisition_job_count: after.fulltext_acquisition_job_count - before.fulltext_acquisition_job_count,
  },
  selected_items: selectedItems,
  existing_records: existingRecords,
};

const detail = {
  ...report,
  all_candidates: candidates.map((candidate) => ({
    ...compactItem({
      ...candidate,
      tags: [],
    }),
    abstract: candidate.abstract,
  })),
};

const manifest = {
  generated_at: report.generated_at,
  artifact_boundary_version: 'repo-lightweight-manifest:v1',
  detail_path: DETAIL_PATH,
  report_path: REPORT_PATH,
  markdown_path: MD_PATH,
  batch_id: BATCH.batch_id,
  apply: APPLY,
  discovered_count: report.discovered_count,
  existing_count: report.existing_count,
  selected_count: report.selected_count,
  exact_plan: report.exact_plan,
  deltas: report.deltas,
  direction_summary: report.direction_summary,
};

await fs.mkdir(OUT_DIR, { recursive: true });
await fs.mkdir(TMP_DETAIL_DIR, { recursive: true });
await fs.writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
await fs.writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
await fs.writeFile(DETAIL_PATH, `${JSON.stringify(detail, null, 2)}\n`);
await fs.writeFile(MD_PATH, renderMarkdown(report));
console.log(JSON.stringify(manifest, null, 2));
