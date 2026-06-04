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
const REPORT_PATH = path.join(OUT_DIR, 'b8-direction-balanced-scaleout-report.json');
const MANIFEST_PATH = path.join(OUT_DIR, 'b8-direction-balanced-scaleout-manifest.json');
const DETAIL_PATH = path.join(TMP_DETAIL_DIR, 'b8-direction-balanced-scaleout-detail.json');
const MD_PATH = path.join(TASK_DIR, '07-b8-direction-balanced-scaleout.md');

const APPLY = process.argv.includes('--apply');
const REQUEST_DELAY_MS = Number.parseInt(process.env.OPENALEX_B8_DELAY_MS ?? '650', 10);
const REQUEST_TIMEOUT_MS = Number.parseInt(process.env.OPENALEX_B8_TIMEOUT_MS ?? '20000', 10);
const QUERY_PER_PAGE = Number.parseInt(process.env.OPENALEX_B8_QUERY_PER_PAGE ?? '40', 10);
const IMPORT_PER_DIRECTION_LIMIT = Number.parseInt(process.env.B8_IMPORT_PER_DIRECTION_LIMIT ?? '8', 10);
const MIN_YEAR = Number.parseInt(process.env.B8_MIN_YEAR ?? '2024', 10);
const MIN_SCORE = Number.parseInt(process.env.B8_MIN_SCORE ?? '10', 10);
const MAILTO = process.env.OPENALEX_MAILTO ?? 'researcher@example.com';

const BATCH = {
  batch_id: 'B8-direction-balanced-scaleout',
  batch_kind: 'openalex-discovery-pool-controlled-import',
  source_route: 'openalex:works-search',
  purpose: 'Scale direction-balanced literature collection using discovery-pool scoring before controlled metadata import.',
  content_processing_enqueued: false,
};

const DIRECTIONS = [
  {
    direction_id: 'rag-aware-allocation',
    direction_tag: 'direction:rag-aware-allocation',
    collection_tag: 'collection:core',
    required_any: ['retrieval', 'rag', 'augmented generation'],
    focus_any: ['retrieval augmented generation', 'rag'],
    focus_pair_any: ['serving', 'cache', 'caching', 'routing', 'resource', 'latency', 'budget', 'context', 'chunk'],
    title_focus_any: ['rag', 'retrieval-augmented generation', 'retrieval augmented generation'],
    title_pair_any: ['serving', 'cache', 'caching', 'routing', 'optimization', 'optimized', 'resource', 'latency', 'budget', 'chunk'],
    title_exclude_any: [
      'ai agents vs. agentic ai',
      'calibrated llm-as-a-judge',
      'disaster response',
      'microservice deployment',
      'recent innovations',
    ],
    strong_terms: [
      'retrieval augmented generation',
      'rag',
      'adaptive retrieval',
      'retrieval routing',
      'cache',
      'context',
      'serving',
      'budget',
      'latency',
      'resource',
    ],
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
      ['Q-B8-RAG-01', 'RAG Serving', 'retrieval augmented generation serving'],
      ['Q-B8-RAG-02', 'RAG Cache And Reuse', 'retrieval augmented generation cache context reuse'],
      ['Q-B8-RAG-03', 'RAG Routing', 'retrieval augmented generation routing adaptive retrieval'],
      ['Q-B8-RAG-04', 'RAG Resource Allocation', 'retrieval augmented generation resource allocation latency'],
      ['Q-B8-RAG-05', 'Dynamic RAG Compute', 'dynamic retrieval augmented generation compute budget'],
    ],
  },
  {
    direction_id: 'llm-serving-resource-allocation',
    direction_tag: 'direction:llm-serving-resource-allocation',
    collection_tag: 'collection:system-support',
    required_any: ['serving', 'inference', 'kv cache', 'prefill', 'decode', 'scheduling'],
    focus_any: ['large language model', 'llm'],
    focus_pair_any: ['serving', 'inference', 'scheduling', 'kv cache', 'prefill', 'decode', 'batching', 'resource', 'throughput', 'latency'],
    strong_terms: [
      'large language model',
      'llm',
      'serving',
      'inference',
      'scheduling',
      'kv cache',
      'prefill',
      'decode',
      'batching',
      'memory',
      'latency',
      'throughput',
    ],
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
      ['Q-B8-SYS-01', 'LLM Serving Scheduling', 'large language model serving scheduling'],
      ['Q-B8-SYS-02', 'KV Cache Management', 'large language model KV cache serving'],
      ['Q-B8-SYS-03', 'Prefill Decode', 'prefill decode disaggregated large language model serving'],
      ['Q-B8-SYS-04', 'LLM Inference Resource Allocation', 'LLM inference resource allocation scheduling'],
      ['Q-B8-SYS-05', 'Continuous Batching', 'continuous batching large language model serving'],
    ],
  },
  {
    direction_id: 'test-time-compute-budgeting',
    direction_tag: 'direction:test-time-compute-budgeting',
    collection_tag: 'collection:strategy-support',
    required_any: ['test-time', 'test time', 'inference-time', 'compute budget', 'reasoning budget', 'adaptive compute'],
    focus_any: ['test-time', 'test time', 'inference-time', 'inference time', 'compute budget', 'test-time scaling', 'adaptive compute'],
    focus_pair_any: ['reasoning', 'budget', 'token', 'routing', 'cascade', 'early stopping', 'verifier', 'allocation', 'compute'],
    title_focus_any: ['test-time', 'test time', 'inference', 'compute', 'budget', 'reasoning'],
    strong_terms: [
      'test-time',
      'test time',
      'inference-time',
      'compute',
      'budget',
      'adaptive',
      'reasoning',
      'routing',
      'cascade',
      'early stopping',
      'verifier',
      'cost',
    ],
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
      ['Q-B8-STR-01', 'Test-Time Compute Budget', 'test-time compute budget large language model'],
      ['Q-B8-STR-02', 'Inference-Time Scaling', 'inference-time scaling language model reasoning'],
      ['Q-B8-STR-03', 'Adaptive Reasoning Compute', 'adaptive compute reasoning language model'],
      ['Q-B8-STR-04', 'Model Routing Cascades', 'model routing cascade language model cost quality'],
      ['Q-B8-STR-05', 'Early Stop / Verifier Budget', 'early stopping verifier budget language model reasoning'],
    ],
  },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function normalizeDoi(value) {
  return normalizeText(value)
    .replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '')
    .replace(/^doi:\s*/i, '')
    .toLowerCase();
}

function normalizeArxivId(value) {
  return normalizeText(value)
    .replace(/^https?:\/\/arxiv\.org\/abs\//i, '')
    .replace(/^https?:\/\/arxiv\.org\/pdf\//i, '')
    .replace(/\.pdf$/i, '')
    .replace(/v\d+$/i, '')
    .replace(/^arxiv:/i, '');
}

function unique(values) {
  return [...new Set(values.filter((value) => typeof value === 'string' && value.length > 0))];
}

function lower(value) {
  return normalizeText(value).toLowerCase();
}

function normalizeTitle(value) {
  return lower(value)
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(v\d+|version)\b/g, ' ')
    .replace(/^\d+\s+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const ARXIV_ID_BY_NORMALIZED_TITLE = new Map([
  ['ragboost efficient retrieval augmented generation with accuracy preserving context reuse', '2511.03475'],
  ['subgcache accelerating graph based rag with subgraph level kv cache', '2505.10951'],
]);

function abstractFromInvertedIndex(index) {
  if (!index || typeof index !== 'object') {
    return '';
  }
  const pairs = [];
  for (const [word, positions] of Object.entries(index)) {
    if (!Array.isArray(positions)) {
      continue;
    }
    for (const position of positions) {
      if (Number.isInteger(position)) {
        pairs.push([position, word]);
      }
    }
  }
  return pairs
    .sort((left, right) => left[0] - right[0])
    .map(([, word]) => word)
    .join(' ')
    .replace(/\s+([.,;:!?])/g, '$1')
    .trim();
}

function extractArxivId(work) {
  const urls = [];
  for (const location of work.locations ?? []) {
    urls.push(location?.landing_page_url, location?.pdf_url);
  }
  urls.push(work.primary_location?.landing_page_url, work.primary_location?.pdf_url);
  for (const rawUrl of urls.filter(Boolean)) {
    const url = String(rawUrl);
    const match = url.match(/arxiv\.org\/(?:abs|pdf)\/([^?#/]+)(?:\.pdf)?/i);
    if (match) {
      return normalizeArxivId(match[1]);
    }
  }
  return null;
}

function arxivIdFromDoi(doi) {
  const normalized = normalizeDoi(doi);
  const match = normalized.match(/^10\.48550\/arxiv\.([^/]+)$/i);
  return match ? normalizeArxivId(match[1]) : null;
}

function arxivIdOverrideForTitle(title) {
  return ARXIV_ID_BY_NORMALIZED_TITLE.get(normalizeTitle(title)) ?? null;
}

function sourceUrlForWork(work, arxivId) {
  if (arxivId) {
    return `https://arxiv.org/abs/${arxivId}`;
  }
  return work.primary_location?.landing_page_url
    ?? work.primary_location?.pdf_url
    ?? work.doi
    ?? work.id;
}

function providerForWork(arxivId) {
  return arxivId ? 'arxiv' : 'web';
}

function externalIdForWork(work, arxivId, doi) {
  return arxivId ?? doi ?? work.id;
}

function termCount(text, terms) {
  const textLower = lower(text);
  return terms.reduce((count, term) => count + (textLower.includes(term.toLowerCase()) ? 1 : 0), 0);
}

function hasRequiredTerm(text, terms) {
  const textLower = lower(text);
  return terms.some((term) => textLower.includes(term.toLowerCase()));
}

function isReviewLikeTitle(title) {
  const titleLower = lower(title);
  return [
    'survey',
    'comprehensive survey',
    'recent innovations',
    'thesis proposal',
    'open problems',
    'advances and open problems',
    'towards efficient large language model serving: a survey',
  ].some((term) => titleLower.includes(term));
}

function isBlockedSource(candidate) {
  const doi = lower(candidate.doi);
  const sourceUrl = lower(candidate.source_url);
  return [
    '10.5281/zenodo',
    '10.22541/au.',
  ].some((term) => doi.includes(term) || sourceUrl.includes(term));
}

function isFocusedCandidate(candidate, direction) {
  const text = lower(`${candidate.title} ${candidate.abstract}`);
  const title = lower(candidate.title);
  if (!hasRequiredTerm(text, direction.required_any)) {
    return false;
  }
  if (direction.title_exclude_any?.length && hasRequiredTerm(title, direction.title_exclude_any)) {
    return false;
  }
  if (direction.title_focus_any?.length && !hasRequiredTerm(title, direction.title_focus_any)) {
    return false;
  }
  if (direction.title_pair_any?.length && !hasRequiredTerm(title, direction.title_pair_any)) {
    return false;
  }
  if (direction.focus_any?.length && !hasRequiredTerm(text, direction.focus_any)) {
    return false;
  }
  if (direction.focus_pair_any?.length && !hasRequiredTerm(text, direction.focus_pair_any)) {
    return false;
  }
  return true;
}

function scoreWork(work, direction, queryId) {
  const title = normalizeText(work.display_name);
  const abstract = abstractFromInvertedIndex(work.abstract_inverted_index);
  const text = `${title} ${abstract}`;
  let score = 0;
  const year = Number.isInteger(work.publication_year) ? work.publication_year : null;
  if (year >= 2026) score += 7;
  else if (year === 2025) score += 6;
  else if (year === 2024) score += 4;
  score += termCount(title, direction.strong_terms) * 2;
  score += termCount(abstract, direction.strong_terms);
  score += hasRequiredTerm(text, direction.required_any) ? 5 : -6;
  if (isReviewLikeTitle(title)) score -= 8;
  score += Number(work.cited_by_count ?? 0) > 20 ? 1 : 0;
  score += queryId ? 1 : 0;
  return { score, title, abstract, year };
}

function parseOpenAlexWork(work, direction, query) {
  const [queryId, queryFamily] = query;
  const { score, title, abstract, year } = scoreWork(work, direction, queryId);
  const authors = (work.authorships ?? [])
    .map((authorship) => normalizeText(authorship.author?.display_name))
    .filter(Boolean);
  const doi = work.doi ? normalizeDoi(work.doi) : null;
  const arxivId = extractArxivId(work) ?? arxivIdFromDoi(doi) ?? arxivIdOverrideForTitle(title);
  return {
    provider: providerForWork(arxivId),
    external_id: externalIdForWork(work, arxivId, doi),
    title,
    abstract,
    authors: unique(authors),
    year,
    doi: doi ?? undefined,
    arxiv_id: arxivId ?? undefined,
    source_url: sourceUrlForWork(work, arxivId),
    rights_class: work.open_access?.is_oa ? 'OA' : 'UNKNOWN',
    openalex_id: work.id,
    cited_by_count: work.cited_by_count ?? 0,
    direction_id: direction.direction_id,
    direction_ids: [direction.direction_id],
    query_ids: [queryId],
    query_families: [queryFamily],
    normalized_title: normalizeTitle(title),
    score,
  };
}

function mergeCandidate(current, next) {
  return {
    ...current,
    direction_ids: unique([...(current.direction_ids ?? []), ...(next.direction_ids ?? [])]),
    query_ids: unique([...(current.query_ids ?? []), ...(next.query_ids ?? [])]),
    query_families: unique([...(current.query_families ?? []), ...(next.query_families ?? [])]),
    score: Math.max(current.score ?? 0, next.score ?? 0),
  };
}

function candidateKey(candidate) {
  if (candidate.normalized_title) return `title:${candidate.normalized_title}`;
  if (candidate.arxiv_id) return `arxiv:${candidate.arxiv_id}`;
  if (candidate.doi) return `doi:${candidate.doi}`;
  return `openalex:${candidate.openalex_id}`;
}

async function fetchOpenAlexQuery(direction, query) {
  const [queryId, queryFamily, search] = query;
  const url = new URL('https://api.openalex.org/works');
  url.searchParams.set('search', search);
  url.searchParams.set('filter', `from_publication_date:${MIN_YEAR}-01-01`);
  url.searchParams.set('per-page', String(QUERY_PER_PAGE));
  url.searchParams.set('mailto', MAILTO);
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
      throw new Error(`OpenAlex search failed for ${queryId}: ${response.status}`);
    }
    const payload = await response.json();
    const candidates = (payload.results ?? [])
      .map((work) => parseOpenAlexWork(work, direction, query))
      .filter((candidate) =>
        candidate.title
        && candidate.authors.length > 0
        && (candidate.abstract?.length ?? 0) >= 160
        && !isReviewLikeTitle(candidate.title)
        && !isBlockedSource(candidate)
        && isFocusedCandidate(candidate, direction)
      );
    return {
      direction_id: direction.direction_id,
      query_id: queryId,
      query_family: queryFamily,
      search_query: search,
      result_count: payload.results?.length ?? 0,
      candidate_count: candidates.length,
      candidates,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function discoverCandidates() {
  const byKey = new Map();
  const querySummaries = [];
  for (const direction of DIRECTIONS) {
    for (const query of direction.queries) {
      const [queryId, , search] = query;
      console.error(`[b8] openalex ${queryId}: ${search}`);
      try {
        const result = await fetchOpenAlexQuery(direction, query);
        querySummaries.push({
          direction_id: result.direction_id,
          query_id: result.query_id,
          query_family: result.query_family,
          search_query: result.search_query,
          result_count: result.result_count,
          candidate_count: result.candidate_count,
        });
        for (const candidate of result.candidates) {
          const key = candidateKey(candidate);
          byKey.set(key, byKey.has(key) ? mergeCandidate(byKey.get(key), candidate) : candidate);
        }
      } catch (error) {
        querySummaries.push({
          direction_id: direction.direction_id,
          query_id: queryId,
          query_family: query[1],
          search_query: search,
          result_count: 0,
          candidate_count: 0,
          error: error instanceof Error ? error.message : String(error),
        });
      }
      await sleep(REQUEST_DELAY_MS);
    }
  }
  return {
    candidates: [...byKey.values()].sort((left, right) => right.score - left.score || String(right.year).localeCompare(String(left.year)) || left.title.localeCompare(right.title)),
    querySummaries,
  };
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

async function readExistingRecords(prisma, candidates) {
  const arxivIds = unique(candidates.map((candidate) => candidate.arxiv_id).filter(Boolean));
  const dois = unique(candidates.map((candidate) => candidate.doi).filter(Boolean));
  const titles = unique(candidates.map((candidate) => candidate.title).filter(Boolean));
  const rows = await prisma.literatureRecord.findMany({
    where: {
      OR: [
        ...(arxivIds.length ? [{ arxivId: { in: arxivIds } }] : []),
        ...(dois.length ? [{ doiNormalized: { in: dois } }] : []),
        ...(titles.length ? [{ title: { in: titles } }] : []),
      ],
    },
    select: {
      id: true,
      arxivId: true,
      doiNormalized: true,
      title: true,
      tags: true,
    },
  });
  return rows.map((row) => ({
    literature_id: row.id,
    arxiv_id: row.arxivId,
    doi: row.doiNormalized,
    title: row.title,
    normalized_title: normalizeTitle(row.title),
    tags: row.tags,
  }));
}

function isExisting(candidate, existing) {
  return existing.some((record) => {
    if (candidate.arxiv_id && record.arxiv_id === candidate.arxiv_id) return true;
    if (candidate.doi && record.doi === candidate.doi) return true;
    if (candidate.normalized_title && record.normalized_title === candidate.normalized_title) return true;
    return false;
  });
}

function tagsForCandidate(candidate, rankWithinDirection) {
  const direction = DIRECTIONS.find((item) => item.direction_id === candidate.direction_id);
  const priority = rankWithinDirection <= 4 ? 'priority:p1' : 'priority:p2';
  return unique([
    direction.collection_tag,
    direction.direction_tag,
    ...direction.common_tags,
    'classification:rule-derived',
    rankWithinDirection <= 4 ? 'classification:needs-judgment-card' : '',
    'batch:b8-direction-balanced-scaleout',
    priority,
    ...candidate.query_ids.map((queryId) => `query:${queryId.toLowerCase()}`),
  ]);
}

function selectCandidates(candidates, existingRecords) {
  const selected = [];
  const perDirection = new Map(DIRECTIONS.map((direction) => [direction.direction_id, 0]));
  for (const candidate of candidates) {
    if (candidate.score < MIN_SCORE || isExisting(candidate, existingRecords)) {
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
        doi: item.doi,
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

function compactCandidate(candidate) {
  return {
    title: candidate.title,
    year: candidate.year,
    arxiv_id: candidate.arxiv_id ?? null,
    doi: candidate.doi ?? null,
    source_url: candidate.source_url,
    provider: candidate.provider,
    external_id: candidate.external_id,
    openalex_id: candidate.openalex_id,
    cited_by_count: candidate.cited_by_count,
    direction_id: candidate.direction_id,
    query_ids: candidate.query_ids,
    normalized_title: candidate.normalized_title,
    score: candidate.score,
    author_count: candidate.authors.length,
    tags: candidate.tags ?? [],
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# 07 B8 Direction-Balanced Scaleout');
  lines.push('');
  lines.push('## Decision');
  lines.push(`- State: ${report.apply ? 'imported' : 'dry-run'}.`);
  lines.push(`- Batch ID: \`${report.batch.batch_id}\`.`);
  lines.push('- Scope: OpenAlex discovery pool plus controlled metadata import; no content-processing side effects.');
  lines.push('');
  lines.push('## Summary');
  lines.push('| Metric | Value |');
  lines.push('| --- | ---: |');
  lines.push(`| Query groups | ${report.query_summaries.length} |`);
  lines.push(`| Discovery candidates | ${report.discovered_count} |`);
  lines.push(`| Existing DB matches | ${report.existing_count} |`);
  lines.push(`| Selected candidates | ${report.selected_count} |`);
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
  lines.push('| ID | Year | Direction | Score | Title | New |');
  lines.push('| --- | ---: | --- | ---: | --- | --- |');
  for (const item of report.selected_items) {
    const id = item.arxiv_id ? `[${item.arxiv_id}](https://arxiv.org/abs/${item.arxiv_id})` : `[${item.doi ?? item.external_id}](${item.source_url})`;
    lines.push(`| ${id} | ${item.year ?? ''} | \`${item.direction_id}\` | ${item.score} | ${item.title.replace(/\|/g, '/')} | ${String(item.is_new)} |`);
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
const existingRecords = await readExistingRecords(prisma, candidates);
const selected = selectCandidates(candidates, existingRecords);
const importResult = APPLY ? await importSelected(selected) : null;
const after = await countState(prisma);
await prisma.$disconnect();

const resultByExternalId = new Map();
if (Array.isArray(importResult?.payload?.results)) {
  for (const result of importResult.payload.results) {
    resultByExternalId.set(result.source_url, result);
  }
}

const selectedItems = selected.map((item) => {
  const imported = resultByExternalId.get(item.source_url);
  return {
    ...compactCandidate(item),
    literature_id: imported?.literature_id ?? null,
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
  query_per_page: QUERY_PER_PAGE,
  import_per_direction_limit: IMPORT_PER_DIRECTION_LIMIT,
  min_year: MIN_YEAR,
  min_score: MIN_SCORE,
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
  deltas: report.deltas,
  direction_summary: report.direction_summary,
};

const detail = {
  ...report,
  all_candidates: candidates.map((candidate) => ({
    ...compactCandidate(candidate),
    abstract: candidate.abstract,
  })),
};

await fs.mkdir(OUT_DIR, { recursive: true });
await fs.mkdir(TMP_DETAIL_DIR, { recursive: true });
await fs.writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
await fs.writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
await fs.writeFile(DETAIL_PATH, `${JSON.stringify(detail, null, 2)}\n`);
await fs.writeFile(MD_PATH, renderMarkdown(report));
console.log(JSON.stringify(manifest, null, 2));
