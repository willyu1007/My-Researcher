import fs from 'node:fs/promises';
import path from 'node:path';

const TMP_DIR = '.ai/.tmp/literature-scaleout-corpus-strategy';

const runId = readArg('--run-id', process.env.B11_SELECTOR_RUN_ID ?? new Date().toISOString().replace(/[:.]/g, '-'));
const decisionsPath = readArg('--decisions', process.env.B11_SELECTOR_DECISIONS_PATH ?? '');
const targetCount = readInteger('B11_SELECTOR_TARGET_COUNT', 10, { min: 1, max: 100 });
const statusAllowlist = new Set(readCsvArg('--statuses', process.env.B11_SELECTOR_STATUSES ?? 'READY_FOR_PROMOTION'));
const directionQuotas = readQuotas(process.env.B11_SELECTOR_DIRECTION_QUOTAS ?? [
  'rag-aware-allocation=3',
  'llm-serving-resource-allocation=5',
  'test-time-compute-budgeting=2',
].join(','));
const assumeSourceAvailable = process.env.B11_SELECTOR_ASSUME_SOURCE_AVAILABLE === 'true';
const allowApplicationTail = process.argv.includes('--allow-application-tail');

if (!decisionsPath) {
  throw new Error('B11 selector requires --decisions or B11_SELECTOR_DECISIONS_PATH.');
}

const APPLICATION_TAIL_TERMS = [
  'agriculture',
  'cancer',
  'chatbot',
  'clinical',
  'cyber attack',
  'dialogue agent',
  'dialogue system',
  'education',
  'financial question answering',
  'legal',
  'medical',
  'mental health',
  'patient',
  'psychological',
  'radiology',
  'sentiment analysis',
  'sql',
  'student',
  'teaching',
  'text-to-sql',
  'tourism',
];

const DIRECTION_PREFERRED_TERMS = {
  'rag-aware-allocation': [
    'adaptive retrieval',
    'dynamic',
    'filtering',
    'hallucination',
    'knowledge graph',
    'multi-agent',
    'query',
    'retrievalqa',
    'self-aware',
    'web search',
  ],
  'llm-serving-resource-allocation': [
    'admission',
    'batch',
    'cache',
    'decode',
    'disaggregate',
    'inference',
    'kv',
    'latency',
    'placement',
    'prefill',
    'resource',
    'scaling',
    'scheduling',
    'serving',
    'slo',
    'throughput',
  ],
  'test-time-compute-budgeting': [
    'anytime',
    'budget',
    'compute',
    'faithfulness',
    'inference scaling',
    'mcts',
    'monte carlo tree search',
    'reasoning',
    'self-consistency',
    'test time',
    'test-time',
    'verifier',
  ],
};

const DIRECTION_TAIL_TERMS = {
  'rag-aware-allocation': [
    'personalized dialogue',
    'text-to-speech',
  ],
  'llm-serving-resource-allocation': [
    'geo-distributed language model training',
    'training time',
  ],
  'test-time-compute-budgeting': [
    'autonomous research automation',
    'cancer staging',
    'chart generation',
    'code world',
    'dialogue agents',
    'multimodal',
    'space',
    'table reasoning',
    'text-to-image',
    'test-time finetuning',
    'visual reasoning',
  ],
};

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

function readInteger(name, fallback, options) {
  const raw = process.env[name];
  const parsed = raw ? Number.parseInt(raw, 10) : fallback;
  const value = Number.isFinite(parsed) ? parsed : fallback;
  return Math.max(options.min, Math.min(options.max, value));
}

function readQuotas(raw) {
  const entries = raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const [direction, count] = item.split('=');
      return [direction?.trim(), Number.parseInt(count, 10)];
    })
    .filter(([direction, count]) => direction && Number.isFinite(count) && count > 0);
  return Object.fromEntries(entries);
}

function lower(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function hasAny(text, terms) {
  return terms.some((term) => text.includes(term));
}

function sourceAvailable(decision) {
  if (assumeSourceAvailable) return true;
  const sourceUrl = lower(decision.source_url);
  const sourceItemId = lower(decision.source_item_id);
  return sourceUrl.includes('arxiv.org/')
    || sourceUrl.includes('doi.org/10.48550/arxiv')
    || sourceItemId.startsWith('arxiv:');
}

function tailReasons(decision) {
  const title = lower(decision.title);
  const direction = decision.direction;
  const reasons = [];
  for (const term of APPLICATION_TAIL_TERMS) {
    if (title.includes(term)) reasons.push(`application_tail:${term}`);
  }
  for (const term of DIRECTION_TAIL_TERMS[direction] ?? []) {
    if (title.includes(term)) reasons.push(`direction_tail:${term}`);
  }
  return reasons;
}

function preferredScore(decision) {
  const title = lower(decision.title);
  const terms = DIRECTION_PREFERRED_TERMS[decision.direction] ?? [];
  const termScore = terms.filter((term) => title.includes(term)).length * 0.025;
  const recencyScore = Number.isFinite(decision.year) && decision.year >= 2024 ? 0.02 : 0;
  const roleScore = decision.collection_role === 'collection:system-support'
    ? 0.015
    : decision.collection_role === 'collection:core'
      ? 0.012
      : 0;
  return Number(decision.triage_score ?? 0) + termScore + recencyScore + roleScore;
}

function candidateShape(decision) {
  return {
    candidate_id: decision.candidate_id,
    title: decision.title,
    year: decision.year,
    direction: decision.direction,
    collection_role: decision.collection_role,
    triage_score: decision.triage_score,
    selector_score: Math.round(preferredScore(decision) * 1000) / 1000,
    source_url: decision.source_url,
    source_item_id: decision.source_item_id,
  };
}

function selectByQuota(candidates) {
  const selected = [];
  const selectedIds = new Set();
  for (const [direction, quota] of Object.entries(directionQuotas)) {
    const group = candidates
      .filter((item) => item.direction === direction)
      .slice(0, quota);
    for (const item of group) {
      selected.push(item);
      selectedIds.add(item.candidate_id);
    }
  }
  for (const item of candidates) {
    if (selected.length >= targetCount) break;
    if (selectedIds.has(item.candidate_id)) continue;
    selected.push(item);
    selectedIds.add(item.candidate_id);
  }
  return selected.slice(0, targetCount);
}

const raw = await fs.readFile(decisionsPath, 'utf8');
const decisions = JSON.parse(raw);
const annotated = decisions.map((decision) => ({
  ...decision,
  source_available: sourceAvailable(decision),
  tail_reasons: tailReasons(decision),
  selector_score: preferredScore(decision),
}));
const excluded = annotated.filter((decision) =>
  !statusAllowlist.has(decision.to_status)
  || !decision.source_available
  || (!allowApplicationTail && decision.tail_reasons.length > 0),
);
const eligible = annotated
  .filter((decision) =>
    statusAllowlist.has(decision.to_status)
    && decision.source_available
    && (allowApplicationTail || decision.tail_reasons.length === 0),
  )
  .sort((left, right) =>
    right.selector_score - left.selector_score
    || Number(right.year ?? 0) - Number(left.year ?? 0)
    || String(left.title).localeCompare(String(right.title)),
  );
const selected = selectByQuota(eligible);

await fs.mkdir(TMP_DIR, { recursive: true });
const reportPath = path.join(TMP_DIR, `${runId}-b11-source-available-selector.json`);
const report = {
  run_id: runId,
  generated_at: new Date().toISOString(),
  decisions_path: decisionsPath,
  config: {
    target_count: targetCount,
    statuses: [...statusAllowlist],
    direction_quotas: directionQuotas,
    assume_source_available: assumeSourceAvailable,
    allow_application_tail: allowApplicationTail,
  },
  totals: {
    input_decisions: decisions.length,
    eligible: eligible.length,
    selected: selected.length,
    excluded: excluded.length,
  },
  selected_ids_csv: selected.map((item) => item.candidate_id).join(','),
  selected: selected.map(candidateShape),
  excluded_summary: {
    by_status: countBy(excluded, (item) => item.to_status),
    by_direction: countBy(excluded, (item) => item.direction),
    by_tail_reason: countBy(excluded.flatMap((item) => item.tail_reasons), (item) => item),
    not_source_available: excluded.filter((item) => !item.source_available).length,
  },
};
await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  report_path: reportPath,
  selected_ids_csv: report.selected_ids_csv,
  totals: report.totals,
  selected: report.selected,
}, null, 2));

function countBy(items, resolveKey) {
  const counts = new Map();
  for (const item of items) {
    const key = resolveKey(item);
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort());
}
