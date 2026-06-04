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

const TASK_DIR = 'dev-docs/active/adaptive-llm-systems-literature-pipeline-completion';
const OUT_DIR = path.join(TASK_DIR, 'artifacts');
const TMP_DETAIL_DIR = '.ai/.tmp/adaptive-llm-systems-literature-pipeline-completion';
const REPORT_PATH = path.join(OUT_DIR, 'b9-import-report.json');
const QUERY_LEDGER_PATH = path.join(OUT_DIR, 'b9-query-ledger.json');
const CANDIDATE_MANIFEST_PATH = path.join(OUT_DIR, 'b9-candidates-manifest.json');
const DETAIL_PATH = path.join(TMP_DETAIL_DIR, 'b9-new-collection-round-detail.json');
const MD_PATH = path.join(TASK_DIR, '07-b9-new-collection-round.md');

const APPLY = process.argv.includes('--apply');
const REQUEST_DELAY_MS = Number.parseInt(process.env.B9_REQUEST_DELAY_MS ?? '900', 10);
const REQUEST_TIMEOUT_MS = Number.parseInt(process.env.B9_REQUEST_TIMEOUT_MS ?? '20000', 10);
const OPENALEX_PER_PAGE = Number.parseInt(process.env.B9_OPENALEX_PER_PAGE ?? '35', 10);
const MIN_YEAR = Number.parseInt(process.env.B9_MIN_YEAR ?? '2024', 10);
const MAX_YEAR = Number.parseInt(process.env.B9_MAX_YEAR ?? '2026', 10);
const MIN_SCORE = Number.parseInt(process.env.B9_MIN_SCORE ?? '11', 10);
const MAILTO = process.env.OPENALEX_MAILTO ?? 'researcher@example.com';

const BATCH = {
  batch_id: 'B9-new-collection-round',
  batch_kind: 'frontier-and-theory-bridge-controlled-import',
  source_route: 'arxiv-exact-plus-openalex-works-search',
  purpose: 'Expand the adaptive LLM systems corpus around large-model systems optimization and adaptive resource allocation.',
  content_processing_enqueued: false,
};

const WEB_ANCHORS = [
  {
    source: 'web-search',
    url: 'https://arxiv.org/abs/2606.01667',
    note: 'Recent test-time learning-to-allocate scaling seed.',
  },
  {
    source: 'web-search',
    url: 'https://arxiv.org/abs/2606.02581',
    note: 'Recent RAG cost-aware query routing seed.',
  },
  {
    source: 'web-search',
    url: 'https://arxiv.org/abs/2604.25080',
    note: 'Recent LLM serving KV-cache restoration and scheduling seed.',
  },
  {
    source: 'web-search',
    url: 'https://docs.openalex.org/api-entities/works/search-works',
    note: 'OpenAlex works-search source contract.',
  },
];

const TRACKS = [
  {
    track_id: 'rag-core-frontier',
    direction_id: 'rag-aware-allocation',
    direction_tag: 'direction:rag-aware-allocation',
    collection_tag: 'collection:core',
    import_limit: Number.parseInt(process.env.B9_RAG_CORE_LIMIT ?? '7', 10),
    required_any: ['retrieval', 'rag', 'augmented generation'],
    focus_any: ['retrieval augmented generation', 'rag'],
    focus_pair_any: ['routing', 'adaptive', 'cache', 'serving', 'budget', 'cost', 'latency', 'multi-step', 'context'],
    strong_terms: [
      'retrieval augmented generation',
      'rag',
      'adaptive retrieval',
      'query routing',
      'retriever routing',
      'cost-aware',
      'budget',
      'cache',
      'serving',
      'multi-step',
    ],
    common_tags: [
      'subcluster:rag-routing',
      'subcluster:rag-serving-optimization',
      'resource:retrieval-depth',
      'resource:context-window',
      'decision:retrieve-or-not',
      'decision:budget-allocate',
      'metric:answer-quality',
      'metric:cost-per-query',
      'metric:latency',
      'bridge:core-system',
    ],
    exact_arxiv: [
      ['2606.02581', 'Q-B9-RAG-EX-01', 'Cost-Aware RAG Routing'],
      ['2604.14222', 'Q-B9-RAG-EX-02', 'Adaptive Query Routing'],
      ['2604.15621', 'Q-B9-RAG-EX-03', 'Adaptive Retrieval Decision'],
      ['2511.07328', 'Q-B9-RAG-EX-04', 'Multi-Step Retrieval Budget'],
      ['2512.09487', 'Q-B9-RAG-EX-05', 'Graph/Text RouteRAG'],
      ['2604.16401', 'Q-B9-RAG-EX-06', 'GraphRAG Routing'],
      ['2505.23052', 'Q-B9-RAG-EX-07', 'RAGRouter'],
    ],
    openalex_queries: [
      ['Q-B9-RAG-01', 'RAG Adaptive Routing', 'retrieval augmented generation adaptive routing'],
      ['Q-B9-RAG-02', 'RAG Cost-Aware Retrieval', 'retrieval augmented generation cost aware retrieval depth'],
      ['Q-B9-RAG-03', 'RAG Cache Context Reuse', 'retrieval augmented generation cache context reuse'],
      ['Q-B9-RAG-04', 'RAG Serving Optimization', 'retrieval augmented generation serving optimization latency'],
      ['Q-B9-RAG-05', 'RAG Retrieval Compute Budget', 'retrieval augmented generation compute budget routing'],
    ],
  },
  {
    track_id: 'rag-theory-bridge',
    direction_id: 'rag-aware-allocation',
    direction_tag: 'direction:rag-aware-allocation',
    collection_tag: 'collection:theory-support',
    import_limit: Number.parseInt(process.env.B9_RAG_THEORY_LIMIT ?? '1', 10),
    required_any: ['retrieval', 'ranking', 'submodular', 'measure', 'metric'],
    focus_any: ['retrieval', 'ranking', 'metric', 'submodular', 'measure'],
    focus_pair_any: ['allocation', 'budget', 'selection', 'diversity', 'stability', 'context'],
    strong_terms: [
      'submodular',
      'measure',
      'metric',
      'ranking',
      'retrieval',
      'selection',
      'budget',
      'diversity',
      'stability',
    ],
    common_tags: [
      'bridge:core-theory',
      'theory:submodular',
      'theory:measure',
      'theory:metric-space',
      'resource:context-window',
      'decision:context-packing',
      'metric:retrieval-stability',
    ],
    exact_arxiv: [],
    openalex_queries: [
      ['Q-B9-THY-RAG-01', 'Submodular Context Selection', 'submodular selection retrieval budget context'],
      ['Q-B9-THY-RAG-02', 'Metric Retrieval Stability', 'metric space retrieval stability ranking'],
      ['Q-B9-THY-RAG-03', 'Measure Retrieval Allocation', 'measure theory retrieval allocation ranking'],
    ],
  },
  {
    track_id: 'serving-system-frontier',
    direction_id: 'llm-serving-resource-allocation',
    direction_tag: 'direction:llm-serving-resource-allocation',
    collection_tag: 'collection:system-support',
    import_limit: Number.parseInt(process.env.B9_SERVING_SYSTEM_LIMIT ?? '6', 10),
    required_any: ['serving', 'inference', 'kv cache', 'prefill', 'decode', 'scheduling'],
    focus_any: ['large language model', 'llm', 'language model'],
    focus_pair_any: ['serving', 'inference', 'scheduling', 'kv cache', 'prefill', 'decode', 'batch', 'resource', 'latency', 'throughput'],
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
      'latency',
      'throughput',
      'resource',
    ],
    common_tags: [
      'subcluster:llm-serving-scheduling',
      'subcluster:kv-cache',
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
    exact_arxiv: [
      ['2602.02987', 'Q-B9-SYS-EX-01', 'Prefill Decode Control'],
      ['2604.25080', 'Q-B9-SYS-EX-02', 'KV Cache Restoration'],
      ['2604.15039', 'Q-B9-SYS-EX-03', 'Prefill-as-a-Service'],
      ['2511.02230', 'Q-B9-SYS-EX-04', 'Agent Scheduling KV TTL'],
      ['2604.21231', 'Q-B9-SYS-EX-05', 'KV Cache Loading'],
    ],
    openalex_queries: [
      ['Q-B9-SYS-01', 'LLM Serving Resource Allocation', 'large language model serving resource allocation scheduling'],
      ['Q-B9-SYS-02', 'KV Cache Scheduling', 'large language model KV cache scheduling serving'],
      ['Q-B9-SYS-03', 'Prefill Decode Resource Allocation', 'prefill decode resource allocation large language model serving'],
      ['Q-B9-SYS-04', 'LLM Inference SLO Scheduling', 'LLM inference SLO scheduling latency throughput'],
      ['Q-B9-SYS-05', 'Agent LLM Serving Scheduling', 'agent large language model serving scheduling KV cache'],
    ],
  },
  {
    track_id: 'serving-theory-bridge',
    direction_id: 'llm-serving-resource-allocation',
    direction_tag: 'direction:llm-serving-resource-allocation',
    collection_tag: 'collection:theory-support',
    import_limit: Number.parseInt(process.env.B9_SERVING_THEORY_LIMIT ?? '0', 10),
    required_any: ['scheduling', 'queueing', 'control', 'resource allocation'],
    focus_any: ['serving', 'inference', 'workload', 'queueing', 'scheduling'],
    focus_pair_any: ['large language model', 'llm', 'gpu', 'latency', 'resource', 'optimal control'],
    strong_terms: [
      'queueing',
      'scheduling',
      'stochastic control',
      'resource allocation',
      'latency',
      'workload',
      'gpu',
      'serving',
    ],
    common_tags: [
      'bridge:system-strategy',
      'theory:queueing',
      'theory:online-scheduling',
      'theory:constrained-optimization',
      'resource:latency-budget',
      'decision:batch-schedule',
      'metric:p95-latency',
      'metric:regret',
    ],
    exact_arxiv: [],
    openalex_queries: [
      ['Q-B9-THY-SYS-01', 'Queueing For LLM Serving', 'queueing large language model serving scheduling'],
      ['Q-B9-THY-SYS-02', 'Optimal Control For LLM Inference', 'optimal control LLM inference resource allocation'],
      ['Q-B9-THY-SYS-03', 'Online Scheduling LLM Serving', 'online scheduling large language model serving latency'],
    ],
  },
  {
    track_id: 'ttc-strategy-frontier',
    direction_id: 'test-time-compute-budgeting',
    direction_tag: 'direction:test-time-compute-budgeting',
    collection_tag: 'collection:strategy-support',
    import_limit: Number.parseInt(process.env.B9_TTC_STRATEGY_LIMIT ?? '7', 10),
    required_any: ['test-time', 'test time', 'inference-time', 'compute budget', 'adaptive compute', 'reasoning budget'],
    focus_any: ['test-time', 'test time', 'inference-time', 'compute budget', 'adaptive compute', 'reasoning'],
    focus_pair_any: ['budget', 'allocation', 'reasoning', 'scaling', 'tokens', 'verifier', 'routing', 'early stopping'],
    strong_terms: [
      'test-time',
      'test time',
      'inference-time',
      'compute',
      'budget',
      'adaptive',
      'allocation',
      'reasoning',
      'verifier',
      'early stopping',
      'scaling',
    ],
    common_tags: [
      'subcluster:test-time-scaling',
      'subcluster:adaptive-compute',
      'resource:generation-tokens',
      'resource:reasoning-steps',
      'resource:cost-budget',
      'decision:budget-allocate',
      'decision:reason-continue-stop',
      'metric:answer-quality',
      'metric:cost-per-query',
      'bridge:core-strategy',
    ],
    exact_arxiv: [
      ['2606.01667', 'Q-B9-STR-EX-01', 'Agentic TTC Allocation'],
      ['2604.21018', 'Q-B9-STR-EX-02', 'Evolving Demonstration Compute Allocation'],
      ['2601.16486', 'Q-B9-STR-EX-03', 'Time-Aware Agentic Scaling'],
      ['2602.01070', 'Q-B9-STR-EX-04', 'Adaptive TTC Framework'],
      ['2501.19393', 'Q-B9-STR-EX-05', 'Budget Forcing'],
      ['2502.05171', 'Q-B9-STR-EX-06', 'Latent Reasoning Scaling'],
    ],
    openalex_queries: [
      ['Q-B9-STR-01', 'Adaptive Test-Time Compute', 'adaptive test-time compute allocation reasoning large language model'],
      ['Q-B9-STR-02', 'Inference-Time Scaling Budget', 'inference-time scaling budget language model reasoning'],
      ['Q-B9-STR-03', 'Verifier Budget Allocation', 'verifier budget allocation test-time reasoning'],
      ['Q-B9-STR-04', 'Budget Forcing Reasoning', 'budget forcing test-time scaling reasoning language model'],
      ['Q-B9-STR-05', 'Early Stop Reasoning Budget', 'early stopping reasoning budget large language model'],
    ],
  },
  {
    track_id: 'ttc-theory-bridge',
    direction_id: 'test-time-compute-budgeting',
    direction_tag: 'direction:test-time-compute-budgeting',
    collection_tag: 'collection:theory-support',
    import_limit: Number.parseInt(process.env.B9_TTC_THEORY_LIMIT ?? '1', 10),
    required_any: ['constrained optimization', 'bandit', 'optimal stopping', 'budget allocation', 'policy optimization'],
    focus_any: ['compute', 'budget', 'reasoning', 'allocation', 'policy'],
    focus_pair_any: ['test-time', 'inference-time', 'large language model', 'llm', 'reasoning'],
    strong_terms: [
      'constrained optimization',
      'bandit',
      'optimal stopping',
      'budget allocation',
      'policy optimization',
      'reasoning',
      'test-time',
    ],
    common_tags: [
      'bridge:strategy-theory',
      'theory:bandit',
      'theory:optimal-stopping',
      'theory:constrained-optimization',
      'decision:budget-allocate',
      'metric:regret',
      'metric:cost-per-query',
    ],
    exact_arxiv: [],
    openalex_queries: [
      ['Q-B9-THY-STR-01', 'Bandit Budget Allocation For Reasoning', 'bandit budget allocation reasoning large language model'],
      ['Q-B9-THY-STR-02', 'Optimal Stopping Test-Time Reasoning', 'optimal stopping test-time reasoning language model'],
      ['Q-B9-THY-STR-03', 'Constrained Optimization Test-Time Compute', 'constrained optimization test-time compute allocation'],
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

function readMetaContent(html, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const direct = html.match(new RegExp(`<meta\\s+name=["']${escaped}["']\\s+content=["']([\\s\\S]*?)["']\\s*/?>`, 'i'));
  if (direct) return decodeXml(direct[1] ?? '');
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

async function fetchOneArxivHtml(arxivId) {
  const url = new URL(`https://arxiv.org/abs/${encodeURIComponent(arxivId)}`);
  let lastError = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
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
        throw new Error(`arXiv exact request failed for ${arxivId}: ${response.status}`);
      }
      return parseArxivHtml(await response.text(), arxivId);
    } catch (error) {
      lastError = error;
      if (attempt < 3) {
        await sleep(REQUEST_DELAY_MS * attempt);
      }
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError;
}

function abstractFromInvertedIndex(index) {
  if (!index || typeof index !== 'object') return '';
  const pairs = [];
  for (const [word, positions] of Object.entries(index)) {
    if (!Array.isArray(positions)) continue;
    for (const position of positions) {
      if (Number.isInteger(position)) pairs.push([position, word]);
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
    const match = String(rawUrl).match(/arxiv\.org\/(?:abs|pdf)\/([^?#/]+)(?:\.pdf)?/i);
    if (match) return normalizeArxivId(match[1]);
  }
  return null;
}

function arxivIdFromDoi(doi) {
  const match = normalizeDoi(doi).match(/^10\.48550\/arxiv\.([^/]+)$/i);
  return match ? normalizeArxivId(match[1]) : null;
}

function sourceUrlForWork(work, arxivId) {
  if (arxivId) return `https://arxiv.org/abs/${arxivId}`;
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

function hasAny(text, terms) {
  const textLower = lower(text);
  return terms.some((term) => textLower.includes(term.toLowerCase()));
}

function isReviewLikeTitle(title) {
  const titleLower = lower(title);
  return [
    'survey',
    'comprehensive survey',
    'recent advances',
    'recent innovations',
    'open problems',
    'a review',
    'thesis',
  ].some((term) => titleLower.includes(term));
}

function isBlockedSource(candidate) {
  const title = lower(candidate.title);
  const doi = lower(candidate.doi);
  const sourceUrl = lower(candidate.source_url);
  const blockedTitleFragments = [
    'invasive alien species',
    'deep neighborhood-preserving hashing',
    'evaluating job scheduling algorithms in large language model inference servers',
    'uav command information system',
    'when should inference be split?',
    'cost-aware model selection and adaptive reasoning in large language models via online learning',
  ];
  const blockedDoiPrefixes = [
    '10.5281/zenodo',
    '10.65109/',
  ];
  const blockedSourceFragments = [
    'hdl.handle.net/10356/214524',
  ];
  return blockedTitleFragments.some((fragment) => title.includes(fragment))
    || blockedDoiPrefixes.some((fragment) => doi.startsWith(fragment))
    || blockedSourceFragments.some((fragment) => sourceUrl.includes(fragment));
}

function scoreCandidate(candidate, track, sourceKind) {
  const title = normalizeText(candidate.title);
  const abstract = normalizeText(candidate.abstract);
  const text = `${title} ${abstract}`;
  const year = Number.isInteger(candidate.year) ? candidate.year : null;
  let score = sourceKind === 'arxiv-exact' ? 8 : 0;
  if (year >= 2026) score += 7;
  else if (year === 2025) score += 6;
  else if (year === 2024) score += 4;
  else if (year && year >= 2020) score += 1;
  score += termCount(title, track.strong_terms) * 2;
  score += termCount(abstract, track.strong_terms);
  score += hasAny(text, track.required_any) ? 5 : -7;
  score += hasAny(text, track.focus_pair_any) ? 3 : -4;
  if (isReviewLikeTitle(title)) score -= 8;
  return score;
}

function isFocusedCandidate(candidate, track, sourceKind) {
  if (sourceKind === 'arxiv-exact') return true;
  const text = lower(`${candidate.title} ${candidate.abstract}`);
  if (!hasAny(text, track.required_any)) return false;
  if (!hasAny(text, track.focus_any)) return false;
  if (!hasAny(text, track.focus_pair_any)) return false;
  if (isReviewLikeTitle(candidate.title)) return false;
  return true;
}

function parseOpenAlexWork(work, track, query) {
  const [queryId, queryFamily] = query;
  const title = normalizeText(work.display_name);
  const abstract = abstractFromInvertedIndex(work.abstract_inverted_index);
  const authors = (work.authorships ?? [])
    .map((authorship) => normalizeText(authorship.author?.display_name))
    .filter(Boolean);
  const year = Number.isInteger(work.publication_year) ? work.publication_year : undefined;
  const doi = work.doi ? normalizeDoi(work.doi) : null;
  const arxivId = extractArxivId(work) ?? arxivIdFromDoi(doi);
  const candidate = {
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
    track_id: track.track_id,
    direction_id: track.direction_id,
    query_ids: [queryId],
    query_families: [queryFamily],
    normalized_title: normalizeTitle(title),
  };
  return {
    ...candidate,
    score: scoreCandidate(candidate, track, 'openalex'),
  };
}

function parseArxivCandidate(entry, track, queryId, queryFamily) {
  const candidate = {
    ...entry,
    track_id: track.track_id,
    direction_id: track.direction_id,
    query_ids: [queryId],
    query_families: [queryFamily],
    normalized_title: normalizeTitle(entry.title),
  };
  return {
    ...candidate,
    score: scoreCandidate(candidate, track, 'arxiv-exact'),
  };
}

function candidateKey(candidate) {
  if (candidate.arxiv_id) return `arxiv:${candidate.arxiv_id}`;
  if (candidate.doi) return `doi:${candidate.doi}`;
  if (candidate.normalized_title) return `title:${candidate.normalized_title}`;
  return `source:${candidate.source_url}`;
}

function mergeCandidate(current, next) {
  const score = Math.max(current.score ?? 0, next.score ?? 0);
  return {
    ...(score === (next.score ?? 0) ? next : current),
    query_ids: unique([...(current.query_ids ?? []), ...(next.query_ids ?? [])]),
    query_families: unique([...(current.query_families ?? []), ...(next.query_families ?? [])]),
    source_routes: unique([...(current.source_routes ?? []), ...(next.source_routes ?? [])]),
    score,
  };
}

async function fetchOpenAlexQuery(track, query) {
  const [queryId, queryFamily, search] = query;
  const url = new URL('https://api.openalex.org/works');
  url.searchParams.set('search', search);
  url.searchParams.set('filter', `from_publication_date:${MIN_YEAR}-01-01,to_publication_date:${MAX_YEAR}-12-31`);
  url.searchParams.set('per-page', String(OPENALEX_PER_PAGE));
  url.searchParams.set('mailto', MAILTO);
  let lastError = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
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
        .map((work) => parseOpenAlexWork(work, track, query))
        .filter((candidate) =>
          candidate.title
          && candidate.authors.length > 0
          && (candidate.abstract?.length ?? 0) >= 160
          && (candidate.year ?? 0) >= MIN_YEAR
          && (candidate.year ?? 0) <= MAX_YEAR
          && candidate.score >= 0
          && !isBlockedSource(candidate)
          && isFocusedCandidate(candidate, track, 'openalex')
        )
        .map((candidate) => ({
          ...candidate,
          source_routes: ['openalex:works-search'],
        }));
      return {
        track_id: track.track_id,
        direction_id: track.direction_id,
        query_id: queryId,
        query_family: queryFamily,
        search_query: search,
        source: 'openalex',
        result_count: payload.results?.length ?? 0,
        candidate_count: candidates.length,
        candidates,
      };
    } catch (error) {
      lastError = error;
      if (attempt < 3) {
        await sleep(REQUEST_DELAY_MS * attempt);
      }
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError;
}

async function discoverCandidates() {
  const byKey = new Map();
  const querySummaries = [];
  for (const track of TRACKS) {
    for (const [arxivId, queryId, queryFamily] of track.exact_arxiv) {
      console.error(`[b9] arxiv ${queryId}: ${arxivId}`);
      try {
        const entry = await fetchOneArxivHtml(arxivId);
        const candidate = {
          ...parseArxivCandidate(entry, track, queryId, queryFamily),
          source_routes: ['arxiv:html-exact-id'],
        };
        querySummaries.push({
          track_id: track.track_id,
          direction_id: track.direction_id,
          query_id: queryId,
          query_family: queryFamily,
          search_query: `exact-arxiv:${arxivId}`,
          source: 'arxiv',
          result_count: 1,
          candidate_count: 1,
        });
        const key = candidateKey(candidate);
        byKey.set(key, byKey.has(key) ? mergeCandidate(byKey.get(key), candidate) : candidate);
      } catch (error) {
        querySummaries.push({
          track_id: track.track_id,
          direction_id: track.direction_id,
          query_id: queryId,
          query_family: queryFamily,
          search_query: `exact-arxiv:${arxivId}`,
          source: 'arxiv',
          result_count: 0,
          candidate_count: 0,
          error: error instanceof Error ? error.message : String(error),
        });
      }
      await sleep(REQUEST_DELAY_MS);
    }
    for (const query of track.openalex_queries) {
      const [queryId, , search] = query;
      console.error(`[b9] openalex ${queryId}: ${search}`);
      try {
        const result = await fetchOpenAlexQuery(track, query);
        querySummaries.push({
          track_id: result.track_id,
          direction_id: result.direction_id,
          query_id: result.query_id,
          query_family: result.query_family,
          search_query: result.search_query,
          source: result.source,
          result_count: result.result_count,
          candidate_count: result.candidate_count,
        });
        for (const candidate of result.candidates) {
          const key = candidateKey(candidate);
          byKey.set(key, byKey.has(key) ? mergeCandidate(byKey.get(key), candidate) : candidate);
        }
      } catch (error) {
        querySummaries.push({
          track_id: track.track_id,
          direction_id: track.direction_id,
          query_id: queryId,
          query_family: query[1],
          search_query: search,
          source: 'openalex',
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

function priorityForRank(rankWithinTrack, track) {
  if (track.collection_tag === 'collection:theory-support') {
    return rankWithinTrack <= 1 ? 'priority:p2' : 'priority:p3';
  }
  return rankWithinTrack <= 4 ? 'priority:p1' : 'priority:p2';
}

function tagsForCandidate(candidate, rankWithinTrack) {
  const track = TRACKS.find((item) => item.track_id === candidate.track_id);
  const priority = priorityForRank(rankWithinTrack, track);
  return unique([
    track.collection_tag,
    track.direction_tag,
    ...track.common_tags,
    'classification:rule-derived',
    priority === 'priority:p1' || priority === 'priority:p2' ? 'classification:needs-judgment-card' : '',
    'batch:b9-new-collection-round',
    `track:${track.track_id}`,
    priority,
    ...candidate.query_ids.map((queryId) => `query:${queryId.toLowerCase()}`),
  ]);
}

function selectCandidates(candidates, existingRecords) {
  const selected = [];
  const perTrack = new Map(TRACKS.map((track) => [track.track_id, 0]));
  const importedKeys = new Set();
  const byTrack = new Map(TRACKS.map((track) => [track.track_id, []]));
  for (const candidate of candidates) {
    if (candidate.score < MIN_SCORE || isExisting(candidate, existingRecords)) continue;
    byTrack.get(candidate.track_id)?.push(candidate);
  }
  for (const track of TRACKS) {
    const ranked = (byTrack.get(track.track_id) ?? [])
      .sort((left, right) => right.score - left.score || String(right.year).localeCompare(String(left.year)) || left.title.localeCompare(right.title));
    for (const candidate of ranked) {
      const key = candidateKey(candidate);
      if (importedKeys.has(key)) continue;
      const trackCount = perTrack.get(track.track_id) ?? 0;
      if (trackCount >= track.import_limit) break;
      const rankWithinTrack = trackCount + 1;
      selected.push({
        ...candidate,
        rank_within_track: rankWithinTrack,
        tags: tagsForCandidate(candidate, rankWithinTrack),
      });
      importedKeys.add(key);
      perTrack.set(track.track_id, rankWithinTrack);
    }
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

function compactCandidate(candidate, includeTags = true) {
  return {
    title: candidate.title,
    year: candidate.year,
    arxiv_id: candidate.arxiv_id ?? null,
    doi: candidate.doi ?? null,
    source_url: candidate.source_url,
    provider: candidate.provider,
    external_id: candidate.external_id,
    openalex_id: candidate.openalex_id ?? null,
    cited_by_count: candidate.cited_by_count ?? null,
    track_id: candidate.track_id,
    direction_id: candidate.direction_id,
    query_ids: candidate.query_ids,
    query_families: candidate.query_families,
    source_routes: candidate.source_routes ?? [],
    normalized_title: candidate.normalized_title,
    score: candidate.score,
    author_count: candidate.authors.length,
    tags: includeTags ? candidate.tags ?? [] : undefined,
  };
}

function escapePipe(value) {
  return normalizeText(value).replace(/\|/g, '/');
}

function linkedId(item) {
  if (item.arxiv_id) return `[${item.arxiv_id}](https://arxiv.org/abs/${item.arxiv_id})`;
  const label = item.doi ?? item.external_id;
  return `[${escapePipe(label)}](${item.source_url})`;
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# 07 B9 New Collection Round');
  lines.push('');
  lines.push('## Decision');
  lines.push(`- State: ${report.apply ? 'imported' : 'dry-run'}.`);
  lines.push(`- Batch ID: \`${report.batch.batch_id}\`.`);
  lines.push('- Scope: controlled metadata import only; content-processing is handled by later pipeline commands.');
  lines.push('');
  lines.push('## Summary');
  lines.push('| Metric | Value |');
  lines.push('| --- | ---: |');
  lines.push(`| Query groups | ${report.query_summaries.length} |`);
  lines.push(`| Discovered candidates | ${report.discovered_count} |`);
  lines.push(`| Existing DB matches | ${report.existing_count} |`);
  lines.push(`| Selected candidates | ${report.selected_count} |`);
  lines.push(`| Import status code | ${report.import_result?.status_code ?? 'n/a'} |`);
  lines.push(`| New literature delta | ${report.deltas.literature_count} |`);
  lines.push(`| New source delta | ${report.deltas.source_count} |`);
  lines.push(`| Pipeline/content/fulltext deltas | ${report.deltas.pipeline_run_count}/${report.deltas.content_asset_count}/${report.deltas.content_processing_batch_job_count}/${report.deltas.fulltext_acquisition_job_count} |`);
  lines.push('');
  lines.push('## Track Coverage');
  lines.push('| Track | Direction | Collection | Selected | Imported/New |');
  lines.push('| --- | --- | --- | ---: | ---: |');
  for (const row of report.track_summary) {
    lines.push(`| \`${row.track_id}\` | \`${row.direction_id}\` | \`${row.collection_tag}\` | ${row.selected_count} | ${row.new_count} |`);
  }
  lines.push('');
  lines.push('## Selected Records');
  lines.push('| ID | Year | Track | Direction | Score | Title | New | Literature ID |');
  lines.push('| --- | ---: | --- | --- | ---: | --- | --- | --- |');
  for (const item of report.selected_items) {
    lines.push(`| ${linkedId(item)} | ${item.year ?? ''} | \`${item.track_id}\` | \`${item.direction_id}\` | ${item.score} | ${escapePipe(item.title)} | ${String(item.is_new)} | \`${item.literature_id ?? ''}\` |`);
  }
  lines.push('');
  lines.push('## Safety');
  lines.push('- Content-processing enqueued by this script: `false`.');
  lines.push('- No raw fulltext, PDFs, embeddings, cloned repos, or experiment artifacts are stored in repo by this script.');
  lines.push(`- Query ledger: \`${QUERY_LEDGER_PATH}\`.`);
  lines.push(`- Candidate manifest: \`${CANDIDATE_MANIFEST_PATH}\`.`);
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

const resultBySourceUrl = new Map();
if (Array.isArray(importResult?.payload?.results)) {
  for (const result of importResult.payload.results) {
    resultBySourceUrl.set(result.source_url, result);
  }
}

const selectedItems = selected.map((item) => {
  const imported = resultBySourceUrl.get(item.source_url);
  return {
    ...compactCandidate(item),
    literature_id: imported?.literature_id ?? null,
    is_new: imported?.is_new ?? null,
    matched_by: imported?.matched_by ?? null,
    source_provider: imported?.source_provider ?? null,
  };
});

const trackSummary = TRACKS.map((track) => {
  const selectedForTrack = selectedItems.filter((item) => item.track_id === track.track_id);
  return {
    track_id: track.track_id,
    direction_id: track.direction_id,
    collection_tag: track.collection_tag,
    selected_count: selectedForTrack.length,
    new_count: selectedForTrack.filter((item) => item.is_new === true).length,
  };
});

const report = {
  generated_at: new Date().toISOString(),
  apply: APPLY,
  batch: BATCH,
  request_delay_ms: REQUEST_DELAY_MS,
  request_timeout_ms: REQUEST_TIMEOUT_MS,
  openalex_per_page: OPENALEX_PER_PAGE,
  min_year: MIN_YEAR,
  max_year: MAX_YEAR,
  min_score: MIN_SCORE,
  web_anchors: WEB_ANCHORS,
  query_summaries: querySummaries,
  discovered_count: candidates.length,
  existing_count: existingRecords.length,
  selected_count: selected.length,
  track_summary: trackSummary,
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

const queryLedger = {
  generated_at: report.generated_at,
  batch_id: BATCH.batch_id,
  source_contract: {
    arxiv_exact: 'https://arxiv.org/abs/<id>',
    openalex_works_search: 'https://api.openalex.org/works?search=...',
  },
  web_anchors: WEB_ANCHORS,
  queries: querySummaries,
};

const candidateManifest = {
  generated_at: report.generated_at,
  artifact_boundary_version: 'repo-lightweight-manifest:v1',
  batch_id: BATCH.batch_id,
  apply: APPLY,
  selected_count: selectedItems.length,
  selected_literature_ids: selectedItems.map((item) => item.literature_id).filter(Boolean),
  selected_items: selectedItems.map((item) => ({
    title: item.title,
    year: item.year,
    literature_id: item.literature_id,
    arxiv_id: item.arxiv_id,
    doi: item.doi,
    source_url: item.source_url,
    track_id: item.track_id,
    direction_id: item.direction_id,
    score: item.score,
    is_new: item.is_new,
    tags: item.tags,
  })),
};

const detail = {
  ...report,
  all_candidates: candidates.map((candidate) => ({
    ...compactCandidate(candidate, false),
    abstract: candidate.abstract,
  })),
};

await fs.mkdir(OUT_DIR, { recursive: true });
await fs.mkdir(TMP_DETAIL_DIR, { recursive: true });
await fs.writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
await fs.writeFile(QUERY_LEDGER_PATH, `${JSON.stringify(queryLedger, null, 2)}\n`);
await fs.writeFile(CANDIDATE_MANIFEST_PATH, `${JSON.stringify(candidateManifest, null, 2)}\n`);
await fs.writeFile(DETAIL_PATH, `${JSON.stringify(detail, null, 2)}\n`);
await fs.writeFile(MD_PATH, renderMarkdown(report));

console.log(JSON.stringify({
  report_path: REPORT_PATH,
  query_ledger_path: QUERY_LEDGER_PATH,
  candidate_manifest_path: CANDIDATE_MANIFEST_PATH,
  detail_path: DETAIL_PATH,
  markdown_path: MD_PATH,
  selected_count: report.selected_count,
  deltas: report.deltas,
  track_summary: report.track_summary,
}, null, 2));
