import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { getPrismaClient } from '../../../../apps/backend/src/repositories/prisma/prisma-client.ts';
import {
  buildLiteratureTitleAuthorsYearHash,
  normalizeLiteratureArxivId,
  normalizeLiteratureAuthors,
  normalizeLiteratureDoi,
  normalizeLiteratureTitle,
} from '../../../../apps/backend/src/services/literature-work-identity.ts';

process.env.RESEARCH_LIFECYCLE_REPOSITORY ??= 'prisma';
process.env.TITLE_CARD_REPOSITORY ??= process.env.RESEARCH_LIFECYCLE_REPOSITORY;
process.env.AUTO_PULL_REPOSITORY ??= process.env.RESEARCH_LIFECYCLE_REPOSITORY;
process.env.APPLICATION_SETTINGS_REPOSITORY ??= process.env.RESEARCH_LIFECYCLE_REPOSITORY;
process.env.EXPERIMENT_FOUNDATION_REPOSITORY ??= process.env.RESEARCH_LIFECYCLE_REPOSITORY;
process.env.PAPER_IMPLEMENTATION_REPOSITORY ??= process.env.RESEARCH_LIFECYCLE_REPOSITORY;

const TASK_DIR = 'dev-docs/active/literature-scaleout-corpus-strategy';
const OUT_DIR = path.join(TASK_DIR, 'artifacts');
const TMP_DIR = '.ai/.tmp/literature-scaleout-corpus-strategy';
const SUPPORTED_PROVIDERS = ['openalex', 'arxiv', 'semantic_scholar'];

const APPLY = process.argv.includes('--apply');
const runId = readArg('--run-id', process.env.B10_DISCOVERY_RUN_ID ?? new Date().toISOString().replace(/[:.]/g, '-'));
const batchCode = readArg('--batch-code', process.env.B10_BATCH_CODE ?? `B10-${runId}`);
const queryLimitPerTrack = readInteger('B10_QUERY_LIMIT', 1, { min: 1, max: 20 });
const providerResultLimit = readInteger('B10_PROVIDER_RESULT_LIMIT', 8, { min: 1, max: 200 });
const maxCandidates = readInteger('B10_MAX_CANDIDATES', 80, { min: 1, max: 1000 });
const requestTimeoutMs = readInteger('B10_REQUEST_TIMEOUT_MS', 20000, { min: 1000, max: 120000 });
const requestDelayMs = readInteger('B10_REQUEST_DELAY_MS', 1100, { min: 0, max: 60000 });
const arxivDelayMs = readInteger('B10_ARXIV_DELAY_MS', 3200, { min: 0, max: 60000 });
const providerRetries = readInteger('B10_PROVIDER_RETRIES', 2, { min: 1, max: 5 });
const minYear = readInteger('B10_MIN_YEAR', 2018, { min: 1900, max: 2100 });
const openAlexMailto = process.env.OPENALEX_MAILTO ?? process.env.UNPAYWALL_EMAIL ?? '';
const openAlexApiKey = process.env.OPENALEX_API_KEY ?? '';
const semanticScholarApiKey = process.env.SEMANTIC_SCHOLAR_API_KEY ?? '';
const providerSelection = resolveProviderSelection(readArg('--providers', process.env.B10_PROVIDERS ?? 'auto'));
const providerList = providerSelection.enabledProviders;

const SOURCE_CONTRACT = {
  openalex: {
    docs: 'https://developers.openalex.org/api-reference/works/list-works',
    paging_docs: 'https://docs.openalex.org/how-to-use-the-api/get-lists-of-entities/paging',
  },
  arxiv: {
    docs: 'https://info.arxiv.org/help/api/user-manual.html',
  },
  semantic_scholar: {
    docs: 'https://api.semanticscholar.org/api-docs/graph',
    product_docs: 'https://www.semanticscholar.org/product/api',
  },
};

const TRACKS = [
  {
    track_id: 'rag-aware-allocation-core',
    direction: 'rag-aware-allocation',
    collection_role: 'collection:core',
    direction_tag: 'direction:rag-aware-allocation',
    role_scores: { core: 0.9, system_support: 0.4, strategy_support: 0.7, theory_support: 0.3 },
    implementation_score: 0.78,
    theory_score: 0.36,
    queries: [
      'adaptive retrieval augmented generation',
      'self aware knowledge retrieval adaptive retrieval augmented generation',
      'dynamic adaptive retrieval augmented generation',
      'retrieval augmented generation adaptive routing resource allocation',
      'RAG cost-aware retrieval depth compute budget',
      'adaptive retrieval compute allocation context budget',
    ],
  },
  {
    track_id: 'rag-aware-allocation-theory',
    direction: 'rag-aware-allocation',
    collection_role: 'collection:theory-support',
    direction_tag: 'direction:rag-aware-allocation',
    role_scores: { core: 0.35, system_support: 0.2, strategy_support: 0.62, theory_support: 0.86 },
    implementation_score: 0.35,
    theory_score: 0.84,
    queries: [
      'submodular retrieval context selection budget',
      'retrieval ranking allocation theory adaptive selection',
    ],
  },
  {
    track_id: 'llm-serving-resource-allocation-system',
    direction: 'llm-serving-resource-allocation',
    collection_role: 'collection:system-support',
    direction_tag: 'direction:llm-serving-resource-allocation',
    role_scores: { core: 0.72, system_support: 0.94, strategy_support: 0.58, theory_support: 0.25 },
    implementation_score: 0.88,
    theory_score: 0.28,
    queries: [
      'large language model serving scheduling resource allocation',
      'LLM inference KV cache scheduling prefill decode',
      'LLM serving batching latency throughput resource allocation',
    ],
  },
  {
    track_id: 'llm-serving-resource-allocation-strategy',
    direction: 'llm-serving-resource-allocation',
    collection_role: 'collection:strategy-support',
    direction_tag: 'direction:llm-serving-resource-allocation',
    role_scores: { core: 0.52, system_support: 0.76, strategy_support: 0.84, theory_support: 0.38 },
    implementation_score: 0.7,
    theory_score: 0.44,
    queries: [
      'online scheduling LLM serving latency resource allocation',
      'queueing scheduling inference serving GPU memory allocation',
    ],
  },
  {
    track_id: 'test-time-compute-budgeting-strategy',
    direction: 'test-time-compute-budgeting',
    collection_role: 'collection:strategy-support',
    direction_tag: 'direction:test-time-compute-budgeting',
    role_scores: { core: 0.78, system_support: 0.32, strategy_support: 0.92, theory_support: 0.48 },
    implementation_score: 0.64,
    theory_score: 0.52,
    queries: [
      'test-time compute large language model',
      'test time scaling language models',
      'token budget aware LLM reasoning',
      'adaptive inference reasoning budget',
      'adaptive reasoning budget large language model test-time scaling',
    ],
  },
  {
    track_id: 'test-time-compute-budgeting-theory',
    direction: 'test-time-compute-budgeting',
    collection_role: 'collection:theory-support',
    direction_tag: 'direction:test-time-compute-budgeting',
    role_scores: { core: 0.38, system_support: 0.2, strategy_support: 0.72, theory_support: 0.88 },
    implementation_score: 0.32,
    theory_score: 0.86,
    queries: [
      'provable scaling laws test-time compute language models',
      'test-time compute scaling laws large language models',
      'sequential decision compute budget allocation stopping policy',
      'adaptive computation allocation online learning budget',
    ],
  },
];

const trackLimit = readInteger('B10_TRACK_LIMIT', TRACKS.length, { min: 1, max: TRACKS.length });

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

function resolveProviderSelection(rawValue) {
  const requestedProviders = String(rawValue ?? 'auto')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  const mode = requestedProviders.length === 0
    || (requestedProviders.length === 1 && requestedProviders[0] === 'auto')
    ? 'auto'
    : requestedProviders.includes('all')
      ? 'all'
      : 'explicit';
  if (mode === 'explicit') {
    return {
      mode,
      requestedProviders,
      enabledProviders: unique(requestedProviders),
      skippedProviders: [],
    };
  }
  if (mode === 'all') {
    return {
      mode,
      requestedProviders,
      enabledProviders: SUPPORTED_PROVIDERS,
      skippedProviders: [],
    };
  }
  const enabledProviders = ['openalex'];
  const skippedProviders = [];
  if (semanticScholarApiKey) {
    enabledProviders.push('semantic_scholar');
  } else {
    skippedProviders.push({
      provider: 'semantic_scholar',
      reason: 'auto mode requires SEMANTIC_SCHOLAR_API_KEY for reliable scaleout requests',
    });
  }
  skippedProviders.push({
    provider: 'arxiv',
    reason: 'auto mode keeps arXiv explicit-only after the local canary returned ECONNRESET',
  });
  return {
    mode,
    requestedProviders: ['auto'],
    enabledProviders,
    skippedProviders,
  };
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

function normalizeText(value) {
  return String(value ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeXml(value) {
  return normalizeText(value)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function clampScore(value) {
  if (!Number.isFinite(value)) return null;
  return Math.max(0, Math.min(1, Math.round(value * 1000) / 1000));
}

function unique(values) {
  return [...new Set(values.filter((value) => typeof value === 'string' && value.trim().length > 0))];
}

function firstAuthorKey(authors) {
  return normalizeLiteratureAuthors(authors)[0] ?? '';
}

function buildDedupKey(candidate) {
  if (candidate.doiNormalized) return `doi:${candidate.doiNormalized}`;
  if (candidate.arxivId) return `arxiv:${candidate.arxivId}`;
  if (candidate.openalexId) return `openalex:${candidate.openalexId}`;
  if (candidate.semanticScholarId) return `semantic_scholar:${candidate.semanticScholarId}`;
  return `title:${candidate.normalizedTitle}|year:${candidate.year ?? ''}|author:${firstAuthorKey(candidate.authors)}`;
}

function abstractFromInvertedIndex(index) {
  if (!index || typeof index !== 'object' || Array.isArray(index)) return '';
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

function arxivIdFromUrl(value) {
  const match = String(value ?? '').match(/arxiv\.org\/(?:abs|pdf)\/([^?#/]+)(?:\.pdf)?/i);
  return match ? normalizeLiteratureArxivId(match[1]) : null;
}

function arxivIdFromDoi(doi) {
  const match = normalizeLiteratureDoi(doi)?.match(/^10\.48550\/arxiv\.([^/]+)$/i);
  return match ? normalizeLiteratureArxivId(match[1]) : null;
}

function toDirectionScores(track, relevanceScore) {
  return {
    'rag-aware-allocation': track.direction === 'rag-aware-allocation' ? relevanceScore : 0,
    'llm-serving-resource-allocation': track.direction === 'llm-serving-resource-allocation' ? relevanceScore : 0,
    'test-time-compute-budgeting': track.direction === 'test-time-compute-budgeting' ? relevanceScore : 0,
  };
}

function candidateIdentityHash(candidate) {
  const raw = [
    candidate.sourceProvider,
    candidate.openalexId,
    candidate.semanticScholarId,
    candidate.arxivId,
    candidate.doiNormalized,
    candidate.normalizedTitle,
    candidate.year,
    firstAuthorKey(candidate.authors),
  ].filter(Boolean).join('|');
  return crypto.createHash('sha1').update(raw).digest('hex');
}

function makeCandidate(providerCandidate, track, query, sourceProvider, sourcePayload) {
  const title = normalizeText(providerCandidate.title);
  const abstractText = normalizeText(providerCandidate.abstractText);
  const authors = unique((providerCandidate.authors ?? []).map(normalizeText));
  const year = Number.isInteger(providerCandidate.year) ? providerCandidate.year : null;
  const doiNormalized = normalizeLiteratureDoi(providerCandidate.doiNormalized ?? providerCandidate.doi);
  const arxivId = normalizeLiteratureArxivId(providerCandidate.arxivId) ?? arxivIdFromDoi(doiNormalized);
  const normalizedTitle = normalizeLiteratureTitle(title);
  const relevanceScore = scoreCandidate({ title, abstractText, year }, track, query);
  const candidate = {
    id: crypto.randomUUID(),
    title,
    normalizedTitle,
    abstractText,
    authors,
    year,
    venue: normalizeText(providerCandidate.venue) || null,
    doiNormalized,
    arxivId,
    openalexId: normalizeText(providerCandidate.openalexId) || null,
    semanticScholarId: normalizeText(providerCandidate.semanticScholarId) || null,
    dblpUrl: normalizeText(providerCandidate.dblpUrl) || null,
    sourceUrl: normalizeText(providerCandidate.sourceUrl) || null,
    sourceProvider,
    sourcePayload,
    directionScores: toDirectionScores(track, relevanceScore),
    roleScores: track.role_scores,
    relevanceScore,
    implementationScore: track.implementation_score,
    theoryScore: track.theory_score,
    trackId: track.track_id,
    direction: track.direction,
    collectionRole: track.collection_role,
    queryText: query,
  };
  return {
    ...candidate,
    dedupKey: buildDedupKey(candidate),
    identityHash: candidateIdentityHash(candidate),
  };
}

function scoreCandidate(candidate, track, query) {
  const text = `${candidate.title} ${candidate.abstractText}`.toLowerCase();
  const queryTerms = query.toLowerCase().split(/\s+/).filter((term) => term.length > 3);
  const matchedTerms = queryTerms.filter((term) => text.includes(term)).length;
  const queryScore = queryTerms.length ? matchedTerms / queryTerms.length : 0;
  const yearScore = candidate.year && candidate.year >= 2024
    ? 1
    : candidate.year && candidate.year >= 2020
      ? 0.7
      : 0.4;
  const roleBoost = text.includes(track.direction.replace(/-/g, ' ')) ? 0.15 : 0;
  return clampScore((queryScore * 0.65) + (yearScore * 0.25) + roleBoost);
}

function shouldKeepCandidate(candidate) {
  return candidate.title.length > 0
    && candidate.normalizedTitle.length > 0
    && candidate.abstractText.length >= 80
    && candidate.authors.length > 0
    && (!candidate.year || candidate.year >= minYear)
    && candidate.relevanceScore !== null
    && candidate.relevanceScore >= 0.42
    && passesTrackFocus(candidate);
}

function passesTrackFocus(candidate) {
  const text = `${candidate.title} ${candidate.abstractText}`.toLowerCase();
  const title = candidate.title.toLowerCase();
  if (/\b(survey|review|overview|bibliometric|resource center|database|toolbox|solver)\b/.test(title)) {
    return false;
  }
  if (candidate.direction === 'rag-aware-allocation') {
    if (candidate.collectionRole === 'collection:theory-support') {
      return hasAny(text, ['retrieval', 'ranking', 'selection', 'submodular', 'budget'])
        && hasAny(text, ['allocation', 'budget', 'selection', 'adaptive', 'optimization', 'stopping']);
    }
    return hasRagSignal(title)
      && hasAny(text, [
        'allocation',
        'routing',
        'budget',
        'adaptive',
        'compute',
        'cost',
        'latency',
        'context',
        'control',
        'dynamic',
        'selection',
        'optimization',
        'pipeline',
        'confidence',
      ]);
  }
  if (candidate.direction === 'llm-serving-resource-allocation') {
    return hasAny(title, [
      'llm',
      'large language model',
      'language model',
      'serving',
      'inference',
      'kv',
      'prefill',
      'decode',
      'batching',
      'gpu',
      'throughput',
      'latency',
    ])
      && hasAny(text, ['serving', 'inference', 'scheduling', 'kv cache', 'prefill', 'decode', 'batching', 'resource', 'latency']);
  }
  if (candidate.direction === 'test-time-compute-budgeting') {
    const titleHasTestTime = hasAny(title, ['test-time', 'test time', 'inference-time', 'inference time']);
    const titleHasBudgetReasoning = hasAny(title, ['reasoning', 'verifier', 'inference'])
      && hasAny(title, ['budget', 'token', 'compute', 'scaling', 'allocation', 'stopping']);
    return (titleHasTestTime || titleHasBudgetReasoning)
      && hasAny(text, ['budget', 'allocation', 'adaptive', 'verifier', 'stopping', 'scaling', 'tokens', 'token', 'compute']);
  }
  return false;
}

function hasAny(text, terms) {
  return terms.some((term) => text.includes(term));
}

function hasRagSignal(text) {
  return /\brag\b/i.test(text)
    || hasAny(text, ['retrieval augmented generation', 'retrieval-augmented generation']);
}

async function requestWithRetry(url, options = {}) {
  let lastError = null;
  for (let attempt = 1; attempt <= providerRetries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'User-Agent': `paper-engineering-assistant/0.1 ${batchCode}`,
          ...(options.headers ?? {}),
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < providerRetries) {
        await sleep(requestDelayMs * attempt);
      }
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError;
}

async function fetchOpenAlex(track, query) {
  const url = new URL('https://api.openalex.org/works');
  url.searchParams.set('search', query);
  url.searchParams.set('filter', `from_publication_date:${minYear}-01-01`);
  url.searchParams.set('per-page', String(providerResultLimit));
  url.searchParams.set('sort', 'relevance_score:desc');
  if (openAlexMailto) url.searchParams.set('mailto', openAlexMailto);
  if (openAlexApiKey) url.searchParams.set('api_key', openAlexApiKey);
  const response = await requestWithRetry(url);
  const payload = await response.json();
  const rawResults = Array.isArray(payload.results) ? payload.results : [];
  const candidates = rawResults.map((work) => {
    const locations = [
      ...(Array.isArray(work.locations) ? work.locations : []),
      work.primary_location,
    ].filter(Boolean);
    const arxivId = locations.map((location) => arxivIdFromUrl(location?.landing_page_url) ?? arxivIdFromUrl(location?.pdf_url)).find(Boolean);
    return makeCandidate({
      title: work.display_name,
      abstractText: abstractFromInvertedIndex(work.abstract_inverted_index),
      authors: (work.authorships ?? []).map((authorship) => authorship.author?.display_name).filter(Boolean),
      year: work.publication_year,
      doiNormalized: work.doi,
      arxivId,
      openalexId: work.id,
      venue: work.primary_location?.source?.display_name,
      sourceUrl: arxivId ? `https://arxiv.org/abs/${arxivId}` : work.primary_location?.landing_page_url ?? work.doi ?? work.id,
    }, track, query, 'openalex', work);
  }).filter(shouldKeepCandidate);
  return {
    provider: 'openalex',
    query,
    request_url: redactUrl(url),
    result_count: rawResults.length,
    candidate_count: candidates.length,
    candidates,
  };
}

function parseArxivEntries(xml) {
  const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((match) => match[1]);
  return entries.map((entry) => {
    const id = decodeXml(readXmlTag(entry, 'id'));
    const published = decodeXml(readXmlTag(entry, 'published'));
    return {
      title: decodeXml(readXmlTag(entry, 'title')),
      abstractText: decodeXml(readXmlTag(entry, 'summary')),
      authors: [...entry.matchAll(/<author>\s*<name>([\s\S]*?)<\/name>\s*<\/author>/g)].map((match) => decodeXml(match[1])),
      year: Number.parseInt(published.slice(0, 4), 10),
      doiNormalized: decodeXml(readXmlTag(entry, 'arxiv:doi') || readXmlTag(entry, 'doi')),
      arxivId: arxivIdFromUrl(id),
      venue: 'arXiv',
      sourceUrl: id,
    };
  });
}

function readXmlTag(xml, tagName) {
  const escaped = tagName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = xml.match(new RegExp(`<${escaped}[^>]*>([\\s\\S]*?)<\\/${escaped}>`, 'i'));
  return match ? match[1] : '';
}

async function fetchArxiv(track, query) {
  const url = new URL('https://export.arxiv.org/api/query');
  url.searchParams.set('search_query', `all:${query}`);
  url.searchParams.set('start', '0');
  url.searchParams.set('max_results', String(providerResultLimit));
  url.searchParams.set('sortBy', 'submittedDate');
  url.searchParams.set('sortOrder', 'descending');
  const response = await requestWithRetry(url);
  const xml = await response.text();
  const rawResults = parseArxivEntries(xml);
  const candidates = rawResults.map((entry) =>
    makeCandidate(entry, track, query, 'arxiv', { ...entry, query }),
  ).filter(shouldKeepCandidate);
  return {
    provider: 'arxiv',
    query,
    request_url: redactUrl(url),
    result_count: rawResults.length,
    candidate_count: candidates.length,
    candidates,
  };
}

async function fetchSemanticScholar(track, query) {
  const url = new URL('https://api.semanticscholar.org/graph/v1/paper/search');
  url.searchParams.set('query', query);
  url.searchParams.set('limit', String(providerResultLimit));
  url.searchParams.set('fields', [
    'paperId',
    'title',
    'abstract',
    'authors',
    'year',
    'venue',
    'url',
    'externalIds',
    'citationCount',
    'publicationVenue',
  ].join(','));
  const headers = semanticScholarApiKey ? { 'x-api-key': semanticScholarApiKey } : {};
  const response = await requestWithRetry(url, { headers });
  const payload = await response.json();
  const rawResults = Array.isArray(payload.data) ? payload.data : [];
  const candidates = rawResults.map((paper) =>
    makeCandidate({
      title: paper.title,
      abstractText: paper.abstract,
      authors: (paper.authors ?? []).map((author) => author.name).filter(Boolean),
      year: paper.year,
      venue: paper.venue || paper.publicationVenue?.name,
      doiNormalized: paper.externalIds?.DOI,
      arxivId: paper.externalIds?.ArXiv,
      openalexId: paper.externalIds?.OpenAlex,
      semanticScholarId: paper.paperId,
      sourceUrl: paper.url,
    }, track, query, 'semantic_scholar', paper),
  ).filter(shouldKeepCandidate);
  return {
    provider: 'semantic_scholar',
    query,
    request_url: redactUrl(url),
    result_count: rawResults.length,
    candidate_count: candidates.length,
    candidates,
  };
}

function redactUrl(url) {
  const copy = new URL(url.toString());
  if (copy.searchParams.has('api_key')) copy.searchParams.set('api_key', '<redacted>');
  if (copy.searchParams.has('mailto')) copy.searchParams.set('mailto', '<redacted>');
  return copy.toString();
}

function compactCandidate(candidate) {
  return {
    candidate_id: candidate.id,
    title: candidate.title,
    year: candidate.year,
    source_provider: candidate.sourceProvider,
    source_url: candidate.sourceUrl,
    doi_normalized: candidate.doiNormalized,
    arxiv_id: candidate.arxivId,
    openalex_id: candidate.openalexId,
    semantic_scholar_id: candidate.semanticScholarId,
    dedup_key: candidate.dedupKey,
    relevance_score: candidate.relevanceScore,
    implementation_score: candidate.implementationScore,
    theory_score: candidate.theoryScore,
    track_id: candidate.trackId,
    direction: candidate.direction,
    collection_role: candidate.collectionRole,
    status: candidate.status,
    duplicate_reason: candidate.duplicateReason,
    duplicate_confidence: candidate.duplicateConfidence,
    matched_candidate_id: candidate.matchedCandidateId,
    matched_literature_id: candidate.matchedLiteratureId,
  };
}

async function discover() {
  const queryLedger = providerSelection.skippedProviders.map((skipped) => ({
    provider: skipped.provider,
    track_id: null,
    direction: null,
    collection_role: null,
    query: null,
    result_count: 0,
    candidate_count: 0,
    skipped: true,
    skip_reason: skipped.reason,
  }));
  const candidatesByHash = new Map();
  const providers = {
    openalex: fetchOpenAlex,
    arxiv: fetchArxiv,
    semantic_scholar: fetchSemanticScholar,
  };
  for (const track of TRACKS.slice(0, trackLimit)) {
    for (const query of track.queries.slice(0, queryLimitPerTrack)) {
      for (const providerName of providerList) {
        const fetcher = providers[providerName];
        if (!fetcher) {
          queryLedger.push({
            provider: providerName,
            track_id: track.track_id,
            query,
            result_count: 0,
            candidate_count: 0,
            error: `unsupported provider ${providerName}`,
          });
          continue;
        }
        try {
          const result = await fetcher(track, query);
          queryLedger.push({
            provider: result.provider,
            track_id: track.track_id,
            direction: track.direction,
            collection_role: track.collection_role,
            query: result.query,
            request_url: result.request_url,
            result_count: result.result_count,
            candidate_count: result.candidate_count,
          });
          for (const candidate of result.candidates) {
            const current = candidatesByHash.get(candidate.identityHash);
            if (!current || (candidate.relevanceScore ?? 0) > (current.relevanceScore ?? 0)) {
              candidatesByHash.set(candidate.identityHash, candidate);
            }
          }
        } catch (error) {
          queryLedger.push({
            provider: providerName,
            track_id: track.track_id,
            direction: track.direction,
            collection_role: track.collection_role,
            query,
            result_count: 0,
            candidate_count: 0,
            error: error instanceof Error ? error.message : String(error),
          });
        }
        await sleep(providerName === 'arxiv' ? arxivDelayMs : requestDelayMs);
      }
    }
  }
  return {
    queryLedger,
    candidates: [...candidatesByHash.values()]
      .sort((left, right) =>
        (right.relevanceScore ?? 0) - (left.relevanceScore ?? 0)
        || (right.year ?? 0) - (left.year ?? 0)
        || left.title.localeCompare(right.title),
      )
      .slice(0, maxCandidates),
  };
}

async function loadExistingMatches(prisma, candidates) {
  const dois = unique(candidates.map((candidate) => candidate.doiNormalized).filter(Boolean));
  const arxivIds = unique(candidates.map((candidate) => candidate.arxivId).filter(Boolean));
  const titleHashes = unique(candidates.map((candidate) =>
    buildLiteratureTitleAuthorsYearHash(candidate.title, candidate.authors, candidate.year),
  ).filter(Boolean));
  const dedupKeys = unique(candidates.map((candidate) => candidate.dedupKey));
  const openalexIds = unique(candidates.map((candidate) => candidate.openalexId).filter(Boolean));
  const semanticScholarIds = unique(candidates.map((candidate) => candidate.semanticScholarId).filter(Boolean));
  const normalizedTitleYears = candidates
    .filter((candidate) => candidate.normalizedTitle && candidate.year)
    .map((candidate) => ({ normalizedTitle: candidate.normalizedTitle, year: candidate.year }));

  const literatureOr = [
    ...(dois.length ? [{ doiNormalized: { in: dois } }] : []),
    ...(arxivIds.length ? [{ arxivId: { in: arxivIds } }] : []),
    ...(titleHashes.length ? [{ titleAuthorsYearHash: { in: titleHashes } }] : []),
    ...normalizedTitleYears.map((item) => ({ normalizedTitle: item.normalizedTitle, year: item.year })),
  ];
  const candidateOr = [
    ...(dedupKeys.length ? [{ dedupKey: { in: dedupKeys } }] : []),
    ...(dois.length ? [{ doiNormalized: { in: dois } }] : []),
    ...(arxivIds.length ? [{ arxivId: { in: arxivIds } }] : []),
    ...(openalexIds.length ? [{ openalexId: { in: openalexIds } }] : []),
    ...(semanticScholarIds.length ? [{ semanticScholarId: { in: semanticScholarIds } }] : []),
    ...normalizedTitleYears.map((item) => ({ normalizedTitle: item.normalizedTitle, year: item.year })),
  ];

  const [literatureRows, candidateRows] = await Promise.all([
    literatureOr.length
      ? prisma.literatureRecord.findMany({
        where: { OR: literatureOr },
        select: {
          id: true,
          title: true,
          authors: true,
          year: true,
          doiNormalized: true,
          arxivId: true,
          normalizedTitle: true,
          titleAuthorsYearHash: true,
        },
      })
      : [],
    candidateOr.length
      ? prisma.literatureDiscoveryCandidate.findMany({
        where: { OR: candidateOr },
        select: {
          id: true,
          title: true,
          authors: true,
          year: true,
          dedupKey: true,
          doiNormalized: true,
          arxivId: true,
          openalexId: true,
          semanticScholarId: true,
          normalizedTitle: true,
        },
      })
      : [],
  ]);

  return { literatureRows, candidateRows };
}

function literatureDuplicateMatch(candidate, rows) {
  const titleHash = buildLiteratureTitleAuthorsYearHash(candidate.title, candidate.authors, candidate.year);
  return rows.find((row) =>
    (candidate.doiNormalized && row.doiNormalized === candidate.doiNormalized)
    || (candidate.arxivId && row.arxivId === candidate.arxivId)
    || (titleHash && row.titleAuthorsYearHash === titleHash)
    || (
      candidate.normalizedTitle
      && candidate.year
      && row.normalizedTitle === candidate.normalizedTitle
      && row.year === candidate.year
      && firstAuthorKey(row.authors) === firstAuthorKey(candidate.authors)
    )
  ) ?? null;
}

function candidateDuplicateMatch(candidate, rows) {
  return rows.find((row) =>
    (candidate.dedupKey && row.dedupKey === candidate.dedupKey)
    || (candidate.doiNormalized && row.doiNormalized === candidate.doiNormalized)
    || (candidate.arxivId && row.arxivId === candidate.arxivId)
    || (candidate.openalexId && row.openalexId === candidate.openalexId)
    || (candidate.semanticScholarId && row.semanticScholarId === candidate.semanticScholarId)
    || (
      candidate.normalizedTitle
      && candidate.year
      && row.normalizedTitle === candidate.normalizedTitle
      && row.year === candidate.year
      && firstAuthorKey(row.authors) === firstAuthorKey(candidate.authors)
    )
  ) ?? null;
}

function applyDuplicateDecisions(candidates, matches) {
  const stagedRows = [];
  const decided = [];
  for (const candidate of candidates) {
    const literatureMatch = literatureDuplicateMatch(candidate, matches.literatureRows);
    if (literatureMatch) {
      decided.push({
        ...candidate,
        status: 'DUPLICATE',
        duplicateReason: 'matched_existing_literature',
        duplicateConfidence: 0.98,
        decisionReason: `B10 obvious duplicate matched LiteratureRecord ${literatureMatch.id}.`,
        decisionAt: new Date().toISOString(),
        matchedLiteratureId: literatureMatch.id,
        matchedCandidateId: null,
      });
      continue;
    }
    const existingCandidateMatch = candidateDuplicateMatch(candidate, matches.candidateRows);
    if (existingCandidateMatch) {
      decided.push({
        ...candidate,
        status: 'DUPLICATE',
        duplicateReason: 'matched_existing_candidate',
        duplicateConfidence: 0.96,
        decisionReason: `B10 obvious duplicate matched candidate ${existingCandidateMatch.id}.`,
        decisionAt: new Date().toISOString(),
        matchedLiteratureId: null,
        matchedCandidateId: existingCandidateMatch.id,
      });
      continue;
    }
    const stagedMatch = candidateDuplicateMatch(candidate, stagedRows);
    if (stagedMatch) {
      decided.push({
        ...candidate,
        status: 'DUPLICATE',
        duplicateReason: 'matched_same_batch_candidate',
        duplicateConfidence: 0.94,
        decisionReason: `B10 obvious duplicate matched same-batch candidate ${stagedMatch.id}.`,
        decisionAt: new Date().toISOString(),
        matchedLiteratureId: null,
        matchedCandidateId: stagedMatch.id,
      });
      continue;
    }
    stagedRows.push(candidate);
    decided.push({
      ...candidate,
      status: 'DISCOVERED',
      duplicateReason: null,
      duplicateConfidence: null,
      decisionReason: null,
      decisionAt: null,
      matchedLiteratureId: null,
      matchedCandidateId: null,
    });
  }
  return decided;
}

async function persistBatch(prisma, candidates, queryLedger, startedAt) {
  const now = new Date();
  const batchId = crypto.randomUUID();
  const querySummary = summarizeQueryLedger(queryLedger);
  await prisma.literatureDiscoveryBatch.create({
    data: {
      id: batchId,
      batchCode,
      directionScope: unique(TRACKS.map((track) => track.direction_tag)),
      sourceProviders: providerList,
      queryLedger: {
        run_id: runId,
        source_contract: SOURCE_CONTRACT,
        provider_selection: providerSelection,
        providers: providerList,
        queries: queryLedger,
      },
      summaryStats: {
        apply: APPLY,
        candidate_count: candidates.length,
        discovered_count: candidates.filter((candidate) => candidate.status === 'DISCOVERED').length,
        duplicate_count: candidates.filter((candidate) => candidate.status === 'DUPLICATE').length,
        query_count: querySummary.executed_query_count,
        skipped_provider_entries: querySummary.skipped_provider_entries,
      },
      status: 'RUNNING',
      createdAt: startedAt,
      updatedAt: now,
    },
  });
  try {
    for (const candidate of candidates) {
      await prisma.literatureDiscoveryCandidate.create({
        data: {
          id: candidate.id,
          batchId,
          title: candidate.title,
          normalizedTitle: candidate.normalizedTitle,
          abstractText: candidate.abstractText,
          authors: candidate.authors,
          year: candidate.year,
          venue: candidate.venue,
          doiNormalized: candidate.doiNormalized,
          arxivId: candidate.arxivId,
          openalexId: candidate.openalexId,
          semanticScholarId: candidate.semanticScholarId,
          dblpUrl: candidate.dblpUrl,
          sourceUrl: candidate.sourceUrl,
          sourceProvider: candidate.sourceProvider,
          sourcePayload: {
            provider_payload: candidate.sourcePayload,
            b10: {
              run_id: runId,
              batch_code: batchCode,
              track_id: candidate.trackId,
              direction: candidate.direction,
              collection_role: candidate.collectionRole,
              query_text: candidate.queryText,
            },
          },
          dedupKey: candidate.dedupKey,
          duplicateReason: candidate.duplicateReason,
          duplicateConfidence: candidate.duplicateConfidence,
          status: candidate.status,
          directionScores: candidate.directionScores,
          roleScores: candidate.roleScores,
          relevanceScore: candidate.relevanceScore,
          implementationScore: candidate.implementationScore,
          theoryScore: candidate.theoryScore,
          decisionReason: candidate.decisionReason,
          decisionAt: candidate.decisionAt ? new Date(candidate.decisionAt) : null,
          matchedCandidateId: candidate.matchedCandidateId,
          matchedLiteratureId: candidate.matchedLiteratureId,
          promotedLiteratureId: null,
          createdAt: now,
          updatedAt: now,
        },
      });
    }
    await prisma.literatureDiscoveryBatch.update({
      where: { id: batchId },
      data: {
        status: 'COMPLETED',
        summaryStats: {
          apply: APPLY,
          candidate_count: candidates.length,
          discovered_count: candidates.filter((candidate) => candidate.status === 'DISCOVERED').length,
          duplicate_count: candidates.filter((candidate) => candidate.status === 'DUPLICATE').length,
          query_count: querySummary.executed_query_count,
          skipped_provider_entries: querySummary.skipped_provider_entries,
        },
        completedAt: new Date(),
        updatedAt: new Date(),
      },
    });
    return batchId;
  } catch (error) {
    await prisma.literatureDiscoveryBatch.update({
      where: { id: batchId },
      data: {
        status: 'FAILED',
        errorSummary: error instanceof Error ? error.message : String(error),
        updatedAt: new Date(),
      },
    });
    throw error;
  }
}

function summarize(candidates) {
  return {
    candidate_count: candidates.length,
    discovered_count: candidates.filter((candidate) => candidate.status === 'DISCOVERED').length,
    duplicate_count: candidates.filter((candidate) => candidate.status === 'DUPLICATE').length,
    by_source_provider: countBy(candidates, (candidate) => candidate.sourceProvider),
    by_status: countBy(candidates, (candidate) => candidate.status),
    by_direction: countBy(candidates, (candidate) => candidate.direction),
    by_collection_role: countBy(candidates, (candidate) => candidate.collectionRole),
  };
}

function summarizeQueryLedger(queryLedger) {
  return {
    ledger_entry_count: queryLedger.length,
    executed_query_count: queryLedger.filter((query) => !query.skipped).length,
    skipped_provider_entries: queryLedger.filter((query) => query.skipped).length,
    provider_errors: queryLedger.filter((query) => query.error).length,
    total_provider_results: queryLedger.reduce((sum, query) => sum + query.result_count, 0),
    total_provider_candidates: queryLedger.reduce((sum, query) => sum + query.candidate_count, 0),
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

async function writeArtifacts(report) {
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.mkdir(TMP_DIR, { recursive: true });
  const reportPath = path.join(OUT_DIR, `${runId}-b10-candidate-discovery-report.json`);
  const candidatesPath = path.join(OUT_DIR, `${runId}-b10-candidates.json`);
  const queryLedgerPath = path.join(OUT_DIR, `${runId}-b10-query-ledger.json`);
  const detailPath = path.join(TMP_DIR, `${runId}-b10-candidate-discovery-detail.json`);
  await fs.writeFile(reportPath, `${JSON.stringify(report.report, null, 2)}\n`);
  await fs.writeFile(candidatesPath, `${JSON.stringify(report.candidates, null, 2)}\n`);
  await fs.writeFile(queryLedgerPath, `${JSON.stringify(report.query_ledger, null, 2)}\n`);
  await fs.writeFile(detailPath, `${JSON.stringify(report.detail, null, 2)}\n`);
  return { reportPath, candidatesPath, queryLedgerPath, detailPath };
}

const startedAt = new Date();
const prisma = getPrismaClient();
const before = {
  batches: await prisma.literatureDiscoveryBatch.count(),
  candidates: await prisma.literatureDiscoveryCandidate.count(),
};
const { queryLedger, candidates } = await discover();
const matches = await loadExistingMatches(prisma, candidates);
const decidedCandidates = applyDuplicateDecisions(candidates, matches);
let batchId = null;
if (APPLY) {
  batchId = await persistBatch(prisma, decidedCandidates, queryLedger, startedAt);
}
const after = {
  batches: await prisma.literatureDiscoveryBatch.count(),
  candidates: await prisma.literatureDiscoveryCandidate.count(),
};
await prisma.$disconnect();

const summary = summarize(decidedCandidates);
const querySummary = summarizeQueryLedger(queryLedger);
const artifact = await writeArtifacts({
  report: {
    run_id: runId,
    batch_code: batchCode,
    batch_id: batchId,
    apply: APPLY,
    generated_at: new Date().toISOString(),
    provider_selection: providerSelection,
    providers: providerList,
    source_contract: SOURCE_CONTRACT,
    config: {
      query_limit_per_track: queryLimitPerTrack,
      track_limit: trackLimit,
      provider_result_limit: providerResultLimit,
      max_candidates: maxCandidates,
      min_year: minYear,
      request_delay_ms: requestDelayMs,
      arxiv_delay_ms: arxivDelayMs,
      provider_retries: providerRetries,
      openalex_mailto_configured: Boolean(openAlexMailto),
      openalex_api_key_configured: Boolean(openAlexApiKey),
      semantic_scholar_api_key_configured: Boolean(semanticScholarApiKey),
    },
    query_summary: querySummary,
    candidate_summary: summary,
    db_delta: {
      batches: after.batches - before.batches,
      candidates: after.candidates - before.candidates,
    },
  },
  candidates: decidedCandidates.map(compactCandidate),
  query_ledger: {
    run_id: runId,
    batch_code: batchCode,
    source_contract: SOURCE_CONTRACT,
    provider_selection: providerSelection,
    queries: queryLedger,
  },
  detail: {
    before,
    after,
    matches: {
      existing_literature_count: matches.literatureRows.length,
      existing_candidate_count: matches.candidateRows.length,
    },
    candidates: decidedCandidates.map((candidate) => ({
      ...compactCandidate(candidate),
      abstract_text: candidate.abstractText,
      authors: candidate.authors,
      direction_scores: candidate.directionScores,
      role_scores: candidate.roleScores,
    })),
  },
});

console.log(JSON.stringify({
  ...artifact,
  apply: APPLY,
  batch_id: batchId,
  candidate_summary: summary,
  db_delta: {
    batches: after.batches - before.batches,
    candidates: after.candidates - before.candidates,
  },
}, null, 2));
