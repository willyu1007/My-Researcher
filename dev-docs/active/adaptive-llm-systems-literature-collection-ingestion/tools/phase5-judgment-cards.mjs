import fs from 'node:fs/promises';
import path from 'node:path';

import { getPrismaClient } from '../../../../apps/backend/src/repositories/prisma/prisma-client.ts';

const OUT_DIR = 'dev-docs/active/adaptive-llm-systems-literature-collection-ingestion/artifacts';
const JSON_PATH = path.join(OUT_DIR, 'phase5-judgment-cards.json');
const MD_PATH = 'dev-docs/active/adaptive-llm-systems-literature-collection-ingestion/10-judgment-cards.md';
const REPORT_PATH = path.join(OUT_DIR, 'phase5-judgment-cards-report.json');

const PHASE_BATCH_TAGS = [
  'batch:b1-core-high-precision',
  'batch:b2-core-system-bridge',
  'batch:b3-system-substrate',
  'batch:b4-strategy-policy',
  'batch:b5-theory-mapping',
  'batch:b6-citation-expansion',
];

const NEEDS_CARD_TAG = 'classification:needs-judgment-card';
const CARD_READY_TAG = 'classification:judgment-card-ready';
const THEORY_CARD_READY_TAG = 'classification:theory-inclusion-card-ready';

const ALIAS_NOTES = {
  'LIT-0178': 'Seed alias: FLARE.',
  'LIT-0188': 'Seed alias: TARG.',
};

const THEORY_MAPPINGS = {
  'LIT-0249': {
    theory_concept: 'Submodular set maximization under budget constraints',
    llm_rag_phenomenon: 'Evidence selection and context packing under token budget',
    possible_research_question: 'Can context packing be approximated as coverage maximization with diminishing returns?',
    experimental_variable: 'chunk budget, diversity penalty, context order',
    metric_or_bound: 'answer quality, citation coverage, approximation-style Pareto frontier',
    risk: 'Evidence utility may not be submodular after generator interaction.',
  },
  'LIT-0250': {
    theory_concept: 'Document resemblance, containment, and sketching',
    llm_rag_phenomenon: 'Chunk overlap, deduplication, and semantic equivalence',
    possible_research_question: 'Can chunk definitions preserve containment/resemblance under split and merge transforms?',
    experimental_variable: 'chunk size, overlap, sketch/hash rule',
    metric_or_bound: 'retrieval stability, duplicate rate, citation support',
    risk: 'Shingle resemblance can miss semantic equivalence and paraphrase.',
  },
  'LIT-0251': {
    theory_concept: 'Approximate nearest neighbor search and LSH',
    llm_rag_phenomenon: 'Retrieval latency-quality tradeoff in embedding indexes',
    possible_research_question: 'Can adaptive RAG choose index/search settings by query difficulty or latency budget?',
    experimental_variable: 'ANN recall target, probes, hash/index parameter',
    metric_or_bound: 'recall-at-k, retrieval latency, answer quality',
    risk: 'Modern dense retrieval assumptions may diverge from classic LSH analysis.',
  },
  'LIT-0252': {
    theory_concept: 'Distance concentration and nearest-neighbor meaningfulness',
    llm_rag_phenomenon: 'Embedding-space retrieval instability under high-dimensional noise',
    possible_research_question: 'When should retrieval depth increase because nearest-neighbor evidence is unstable?',
    experimental_variable: 'embedding dimension, corpus size, noise level, top-k',
    metric_or_bound: 'retrieval stability, nDCG, answer quality',
    risk: 'Difficult to isolate geometry from encoder training and corpus artifacts.',
  },
  'LIT-0253': {
    theory_concept: 'Random projection and distance preservation',
    llm_rag_phenomenon: 'Low-cost semantic projection for approximate retrieval or routing',
    possible_research_question: 'Can lower-dimensional projections preserve routing decisions while reducing retrieval cost?',
    experimental_variable: 'projection dimension, index type, rerank depth',
    metric_or_bound: 'recall-at-k, latency, routing agreement',
    risk: 'Distance preservation does not guarantee task relevance preservation.',
  },
  'LIT-0254': {
    theory_concept: 'Finite-time multi-armed bandit regret',
    llm_rag_phenomenon: 'Online selection of retrieval, model, verifier, or reasoning policies',
    possible_research_question: 'Can query-level RAG policy selection be learned with regret-aware exploration?',
    experimental_variable: 'arms as RAG strategies, exploration rate, reward shaping',
    metric_or_bound: 'regret, answer quality, cost per query',
    risk: 'Non-stationary corpora and user distributions can break simple bandit assumptions.',
  },
  'LIT-0255': {
    theory_concept: 'Entropy-regularized optimal transport',
    llm_rag_phenomenon: 'Query-corpus alignment and corpus routing under distribution shift',
    possible_research_question: 'Can corpus routing use transport distance between query classes and corpus partitions?',
    experimental_variable: 'transport cost, regularization strength, corpus partition',
    metric_or_bound: 'answer quality, compatibility, retrieval cost',
    risk: 'Transport cost design may dominate the observed effect.',
  },
  'LIT-0256': {
    theory_concept: 'Entropy, redundancy, channel capacity, and coding',
    llm_rag_phenomenon: 'Evidence compression and context-window allocation',
    possible_research_question: 'Can RAG context selection be modeled as preserving task-relevant information under a token-rate constraint?',
    experimental_variable: 'context length, redundancy removal, chunk coding rule',
    metric_or_bound: 'faithfulness, citation coverage, answer quality',
    risk: 'Classic information theory is not task-aware without a relevance model.',
  },
  'LIT-0257': {
    theory_concept: 'Online computation and competitive analysis',
    llm_rag_phenomenon: 'Online serving, admission, batching, and SLO-aware scheduling',
    possible_research_question: 'Can adaptive serving policies be bounded against offline allocation under unknown request streams?',
    experimental_variable: 'arrival rate, admission threshold, batch policy, SLO target',
    metric_or_bound: 'competitive ratio proxy, p95 latency, regret',
    risk: 'GPU batching and KV-cache interactions may violate simplified online models.',
  },
  'LIT-0258': {
    theory_concept: 'Information bottleneck',
    llm_rag_phenomenon: 'Context compression and answer-relevant evidence retention',
    possible_research_question: 'Can context budget allocation preserve answer-relevant information while dropping nuisance text?',
    experimental_variable: 'compression ratio, selected spans, bottleneck objective',
    metric_or_bound: 'faithfulness, citation quality, answer quality',
    risk: 'Mutual information is difficult to estimate robustly for LLM outputs.',
  },
  'LIT-0259': {
    theory_concept: 'Group equivariance',
    llm_rag_phenomenon: 'Invariant retrieval under chunk transformations',
    possible_research_question: 'Can split, merge, reorder, or paraphrase transforms define equivalence classes for chunks?',
    experimental_variable: 'transformation operator, chunk grouping rule, invariant scorer',
    metric_or_bound: 'retrieval stability, faithfulness, citation support',
    risk: 'Chunk transformations may be non-invertible and require semigroup rather than group structure.',
  },
  'LIT-0260': {
    theory_concept: 'Geometric deep learning, quotient spaces, and hierarchy',
    llm_rag_phenomenon: 'Structured chunk space, semantic equivalence, and evidence hierarchy',
    possible_research_question: 'Can quotient-space or ultrametric thinking define chunk granularity and evidence equivalence?',
    experimental_variable: 'equivalence relation, hierarchy level, grouping rule',
    metric_or_bound: 'retrieval stability, citation support, answer quality',
    risk: 'The abstraction is broad and needs a concrete operator design before experiments.',
  },
  'LIT-0261': {
    theory_concept: 'Queueing under variable token length',
    llm_rag_phenomenon: 'LLM serving latency with variable input/output length and adaptive context budget',
    possible_research_question: 'Can queueing explain when adaptive retrieval or context budgets overload serving?',
    experimental_variable: 'input length, output length, arrival rate, batching policy',
    metric_or_bound: 'TTFT, p95 latency, tail overload threshold',
    risk: 'Simplified queue assumptions may diverge from GPU scheduler behavior.',
  },
};

const QUALITY_METRIC_TAGS = new Set([
  'metric:answer-quality',
  'metric:faithfulness',
  'metric:citation-quality',
  'metric:recall-at-k',
  'metric:retrieval-stability',
  'metric:pareto-frontier',
  'metric:regret',
]);

const SYSTEM_METRIC_TAGS = new Set([
  'metric:ttft',
  'metric:tpot',
  'metric:p95-latency',
  'metric:p99-latency',
  'metric:gpu-utilization',
  'metric:cache-hit-rate',
  'metric:tokens-per-query',
  'metric:cost-per-query',
]);

function hasTag(record, tag) {
  return record.tags.includes(tag);
}

function tagsWith(record, prefix) {
  return record.tags.filter((tag) => tag.startsWith(prefix)).sort();
}

function strip(prefix, tag) {
  return tag.startsWith(prefix) ? tag.slice(prefix.length) : tag;
}

function values(record, prefix) {
  return tagsWith(record, prefix).map((tag) => strip(prefix, tag));
}

function firstValue(record, prefix, fallback = 'unspecified') {
  return values(record, prefix)[0] ?? fallback;
}

function sourceUrl(record) {
  return record.sources[0]?.sourceUrl ?? (record.arxivId ? `https://arxiv.org/abs/${record.arxivId}` : null);
}

function primaryBatch(record) {
  return tagsWith(record, 'batch:')[0] ?? 'batch:unknown';
}

function priority(record) {
  return firstValue(record, 'priority:', 'unassigned');
}

function collection(record) {
  return firstValue(record, 'collection:', 'unassigned');
}

function direction(record) {
  const directions = values(record, 'direction:');
  return directions.length > 0 ? directions : ['not-explicit'];
}

function compactMetricTags(record, metricSet) {
  const metrics = record.tags.filter((tag) => metricSet.has(tag)).map((tag) => strip('metric:', tag)).sort();
  return metrics.length > 0 ? metrics : ['not-specified'];
}

function benchmarkOrDataset(record) {
  const title = record.title.toLowerCase();
  if (title.includes('bench') || title.includes('benchmark')) {
    return 'benchmark candidate from title/metadata';
  }
  if (title.includes('dataset')) {
    return 'dataset candidate from title/metadata';
  }
  if (title.includes('trace') || title.includes('workload')) {
    return 'workload or trace candidate from title/metadata';
  }
  if (title.includes('framework') || title.includes('toolkit') || title.includes('simulator') || title.includes('open-source')) {
    return 'tooling/framework candidate from title/metadata';
  }
  if (hasTag(record, 'fit:experiment-foundation')) {
    return 'experiment-foundation candidate; confirm benchmark/protocol in fulltext before promotion';
  }
  return 'none identified from metadata';
}

function codeAvailable(record) {
  const title = record.title.toLowerCase();
  if (title.includes('open-source') || title.includes('toolkit') || title.includes('framework')) {
    return 'likely candidate; verify repository URL before evidence-active promotion';
  }
  if (hasTag(record, 'fit:experiment-foundation')) {
    return 'unknown; check GitHub/Papers-with-Code before experiment promotion';
  }
  return 'unknown from metadata';
}

function experimentFoundationFit(record) {
  const title = record.title.toLowerCase();
  const systemSignals = tagsWith(record, 'metric:').some((tag) => SYSTEM_METRIC_TAGS.has(tag))
    || tagsWith(record, 'resource:').some((tag) => ['resource:prefill', 'resource:decode', 'resource:kv-cache', 'resource:gpu-memory', 'resource:batch-slots', 'resource:latency-budget'].includes(tag));
  if (hasTag(record, 'fit:experiment-foundation') || title.includes('bench') || title.includes('trace') || title.includes('workload') || title.includes('toolkit') || title.includes('framework')) {
    return {
      level: 'high',
      rationale: 'Has benchmark, workload, toolkit, framework, or explicit experiment-foundation tag suitable for downstream reusable assets.',
    };
  }
  if (systemSignals || collection(record) === 'system-support') {
    return {
      level: 'medium',
      rationale: 'Provides system metrics, serving substrate, or policy variables that can become baselines or run-recipe inputs after fulltext/code checks.',
    };
  }
  if (collection(record) === 'theory-support') {
    return {
      level: 'low',
      rationale: 'Use as theory support unless a concrete experiment variable is selected in a later modeling task.',
    };
  }
  return {
    level: 'medium',
    rationale: 'Defines resource and decision variables for adaptive RAG/LLM allocation; needs fulltext review before experiment promotion.',
  };
}

function paperImplementationFit(record) {
  const coll = collection(record);
  const prio = priority(record);
  if (prio === 'p0' && coll === 'core') {
    return {
      level: 'high',
      rationale: 'Directly shapes the adaptive RAG/resource-allocation research problem and can seed claims or baselines.',
    };
  }
  if (prio === 'p0' || hasTag(record, 'bridge:core-strategy') || hasTag(record, 'bridge:core-system')) {
    return {
      level: 'medium',
      rationale: 'Useful as a bridge, baseline, or contrast case for claims after evidence review.',
    };
  }
  if (coll === 'theory-support') {
    return {
      level: 'theory-support',
      rationale: 'Best used as modeling support or inspiration, not as direct implementation evidence by default.',
    };
  }
  return {
    level: 'medium',
    rationale: 'Useful as a supporting baseline or limitation case after fulltext review.',
  };
}

function whyRelevant(record) {
  const coll = collection(record);
  const resources = values(record, 'resource:');
  const decisions = values(record, 'decision:');
  const subclusters = values(record, 'subcluster:');
  const metrics = values(record, 'metric:');
  const parts = [];
  if (coll === 'core') {
    parts.push('Core adaptive RAG/resource-allocation record');
  } else if (coll === 'system-support') {
    parts.push('System substrate or serving baseline for adaptive allocation experiments');
  } else if (coll === 'strategy-support') {
    parts.push('Policy or test-time budgeting baseline for adaptive compute allocation');
  } else if (coll === 'theory-support') {
    parts.push('Theory bridge for modeling adaptive resource allocation');
  } else {
    parts.push('Curated literature record in the adaptive LLM systems collection');
  }
  if (subclusters.length > 0) {
    parts.push(`focus=${subclusters.join(', ')}`);
  }
  if (resources.length > 0 || decisions.length > 0) {
    parts.push(`maps resources (${resources.join(', ') || 'none'}) to decisions (${decisions.join(', ') || 'none'})`);
  }
  if (metrics.length > 0) {
    parts.push(`evaluated through ${metrics.join(', ')}`);
  }
  return `${parts.join('; ')}.`;
}

function judgmentCard(record) {
  const expFit = experimentFoundationFit(record);
  const paperFit = paperImplementationFit(record);
  const resourceVariables = values(record, 'resource:');
  const decisionVariables = values(record, 'decision:');
  return {
    literature_id: record.id,
    title: record.title,
    year: record.year,
    source_url: sourceUrl(record),
    arxiv_id: record.arxivId,
    doi_normalized: record.doiNormalized,
    batch: primaryBatch(record),
    collection: collection(record),
    priority: priority(record),
    directions: direction(record),
    alias_note: ALIAS_NOTES[record.id] ?? null,
    why_relevant: whyRelevant(record),
    resource_variable: resourceVariables.length > 0 ? resourceVariables : ['not-specified'],
    decision_variable: decisionVariables.length > 0 ? decisionVariables : ['not-specified'],
    quality_metric: compactMetricTags(record, QUALITY_METRIC_TAGS),
    system_metric: compactMetricTags(record, SYSTEM_METRIC_TAGS),
    benchmark_or_dataset: benchmarkOrDataset(record),
    code_available: codeAvailable(record),
    experiment_foundation_fit: expFit,
    paper_implementation_fit: paperFit,
    evidence_status: 'lightweight-card-only-not-evidence-active',
    basis: {
      metadata_available: true,
      abstract_available: Boolean(record.abstractText && record.abstractText.trim().length > 0),
      author_count: record.authors.length,
      tag_derived: true,
      fulltext_reviewed: false,
    },
    limitations: [
      'Generated from imported metadata, abstracts when available, and curated tags.',
      'Fulltext, code, and benchmark claims must be checked before experiment or paper-implementation promotion.',
    ],
    tags_snapshot: record.tags,
  };
}

function theoryInclusionCard(record) {
  const mapping = THEORY_MAPPINGS[record.id] ?? {
    theory_concept: values(record, 'theory:').join(', ') || 'unspecified theory concept',
    llm_rag_phenomenon: 'Adaptive LLM/RAG system phenomenon to be specified',
    possible_research_question: 'Needs follow-up modeling before use.',
    experimental_variable: values(record, 'resource:').join(', ') || 'unspecified',
    metric_or_bound: values(record, 'metric:').join(', ') || 'unspecified',
    risk: 'Mapping is underspecified.',
  };
  return {
    literature_id: record.id,
    title: record.title,
    year: record.year,
    source_url: sourceUrl(record),
    priority: priority(record),
    theory_tags: values(record, 'theory:'),
    query_tags: values(record, 'query:'),
    ...mapping,
    inclusion_status: record.id === 'LIT-0261'
      ? 'theory-bridge-and-p1-judgment-card-ready'
      : 'theory-seed-bank-only-not-evidence-active',
    metadata_caveat: record.abstractText && record.abstractText.trim().length > 0
      ? 'abstract imported'
      : 'manual classic-theory record without imported abstract in this batch',
  };
}

function uniqueSorted(items) {
  return [...new Set(items)].sort();
}

function byBatch(cards) {
  const map = new Map();
  for (const card of cards) {
    const list = map.get(card.batch) ?? [];
    list.push(card);
    map.set(card.batch, list);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
}

function mdEscape(value) {
  return String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function mdList(valuesToRender) {
  if (!Array.isArray(valuesToRender)) {
    return mdEscape(valuesToRender);
  }
  return mdEscape(valuesToRender.join(', '));
}

function renderMarkdown(payload) {
  const lines = [];
  lines.push('# 10 Judgment Cards');
  lines.push('');
  lines.push('## Status');
  lines.push('- State: completed');
  lines.push('- Date: 2026-06-03');
  lines.push('- Storage: task evidence artifact, not DB schema.');
  lines.push(`- Detailed JSON artifact: \`${JSON_PATH}\``);
  lines.push(`- Execution report: \`${REPORT_PATH}\``);
  lines.push('- Content processing enqueued: `false`');
  lines.push('');
  lines.push('## Scope');
  lines.push(`- Lightweight judgment cards generated: ${payload.summary.judgment_card_count}.`);
  lines.push(`- Theory inclusion cards generated: ${payload.summary.theory_inclusion_card_count}.`);
  lines.push(`- Judgment-card-ready DB count: ${payload.counters.after.judgment_card_ready_count}.`);
  lines.push(`- Theory-inclusion-card-ready DB count: ${payload.counters.after.theory_inclusion_card_ready_count}.`);
  lines.push('- Initial Phase 5 tag-apply evidence: `dev-docs/active/adaptive-llm-systems-literature-collection-ingestion/artifacts/phase5-judgment-card-tag-apply-report.json`.');
  lines.push('- These cards are triage artifacts. They do not promote records to evidence-active status.');
  lines.push('');
  lines.push('## Judgment Card Fields');
  lines.push('| Field | Meaning |');
  lines.push('|---|---|');
  lines.push('| `why_relevant` | Why the item matters to adaptive LLM systems and resource allocation. |');
  lines.push('| `resource_variable` | Resource knobs exposed by the paper or baseline. |');
  lines.push('| `decision_variable` | Allocation/routing/scheduling decisions mapped from tags. |');
  lines.push('| `quality_metric` | Answer/retrieval/citation/faithfulness metrics. |');
  lines.push('| `system_metric` | Latency, throughput, cache, GPU, cost, or token metrics. |');
  lines.push('| `benchmark_or_dataset` | Metadata-level benchmark/dataset/workload/tool signal. |');
  lines.push('| `code_available` | Metadata-level code signal; repository must be verified before promotion. |');
  lines.push('| `experiment_foundation_fit` | Whether the item can plausibly become a benchmark, baseline, protocol, workload, metric, or run recipe input. |');
  lines.push('| `paper_implementation_fit` | Whether the item can plausibly support claims, baselines, limitations, or research problem framing. |');
  lines.push('');
  lines.push('## Coverage By Batch');
  lines.push('| Batch | Judgment Cards |');
  lines.push('|---|---:|');
  for (const [batch, cards] of byBatch(payload.judgment_cards)) {
    lines.push(`| \`${batch}\` | ${cards.length} |`);
  }
  lines.push('');
  lines.push('## Judgment Card Index');
  lines.push('| Literature ID | Priority | Collection | Resource Variable | Decision Variable | Quality Metric | System Metric | Experiment Fit | Paper Fit |');
  lines.push('|---|---|---|---|---|---|---|---|---|');
  for (const card of payload.judgment_cards) {
    lines.push(`| \`${card.literature_id}\` | \`${card.priority}\` | \`${card.collection}\` | ${mdList(card.resource_variable)} | ${mdList(card.decision_variable)} | ${mdList(card.quality_metric)} | ${mdList(card.system_metric)} | ${mdEscape(card.experiment_foundation_fit.level)} | ${mdEscape(card.paper_implementation_fit.level)} |`);
  }
  lines.push('');
  lines.push('## Theory Inclusion Cards');
  lines.push('| Literature ID | Priority | Theory Concept | LLM/RAG Phenomenon | Experimental Variable | Metric Or Bound | Inclusion Status |');
  lines.push('|---|---|---|---|---|---|---|');
  for (const card of payload.theory_inclusion_cards) {
    lines.push(`| \`${card.literature_id}\` | \`${card.priority}\` | ${mdEscape(card.theory_concept)} | ${mdEscape(card.llm_rag_phenomenon)} | ${mdEscape(card.experimental_variable)} | ${mdEscape(card.metric_or_bound)} | \`${card.inclusion_status}\` |`);
  }
  lines.push('');
  lines.push('## Promotion Guardrails');
  lines.push('- `classification:judgment-card-ready` means the lightweight card exists; it does not mean the paper is evidence-active.');
  lines.push('- `classification:theory-inclusion-card-ready` means the theory mapping exists; P3 theory items remain seed-bank material until a concrete modeling task selects them.');
  lines.push('- Before experiment-foundation promotion, verify fulltext claims, code/repository availability, benchmark protocol, license, and runnable baseline feasibility.');
  lines.push('- Before PaperImplementation promotion, verify the paper supports a concrete claim, limitation, negative result, or experimental contrast for the selected topic.');
  lines.push('');
  lines.push('## Open Follow-ups');
  lines.push('- Review the B6 staged but non-imported citation candidates before another citation expansion batch.');
  lines.push('- Phase 6 should summarize layer/year/card coverage and split follow-up tasks for fulltext acquisition, experiment-foundation promotion, and PaperImplementation candidate selection.');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function countSideEffects(prisma) {
  return {
    literature_count: await prisma.literatureRecord.count(),
    source_count: await prisma.literatureSource.count(),
    pipeline_run_count: await prisma.literaturePipelineRun.count(),
    content_asset_count: await prisma.literatureContentAsset.count(),
    content_processing_batch_job_count: await prisma.literatureContentProcessingBatchJob.count(),
    fulltext_acquisition_job_count: await prisma.literatureFulltextAcquisitionJob.count(),
    needs_judgment_card_count: await prisma.literatureRecord.count({ where: { tags: { has: NEEDS_CARD_TAG } } }),
    judgment_card_ready_count: await prisma.literatureRecord.count({ where: { tags: { has: CARD_READY_TAG } } }),
    theory_inclusion_card_ready_count: await prisma.literatureRecord.count({ where: { tags: { has: THEORY_CARD_READY_TAG } } }),
  };
}

function deltaCounts(before, after) {
  return Object.fromEntries(Object.keys(after).map((key) => [key, after[key] - before[key]]));
}

function nextTagsForRecord(record, isJudgmentTarget, isTheoryTarget) {
  const next = record.tags.filter((tag) => !(isJudgmentTarget && tag === NEEDS_CARD_TAG));
  if (isJudgmentTarget && !next.includes(CARD_READY_TAG)) {
    next.push(CARD_READY_TAG);
  }
  if (isTheoryTarget && !next.includes(THEORY_CARD_READY_TAG)) {
    next.push(THEORY_CARD_READY_TAG);
  }
  return uniqueSorted(next);
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const apply = process.env.PHASE5_APPLY === '1' || args.has('--apply');
  const writeArtifacts = apply || process.env.PHASE5_WRITE === '1' || args.has('--write');
  const prisma = getPrismaClient();
  try {
    const before = await countSideEffects(prisma);
    const select = {
      id: true,
      title: true,
      year: true,
      arxivId: true,
      doiNormalized: true,
      abstractText: true,
      authors: true,
      tags: true,
      sources: {
        select: { provider: true, sourceItemId: true, sourceUrl: true },
        orderBy: { id: 'asc' },
      },
    };
    const records = await prisma.literatureRecord.findMany({
      where: {
        OR: PHASE_BATCH_TAGS.map((tag) => ({ tags: { has: tag } })),
      },
      select,
      orderBy: { id: 'asc' },
    });
    const judgmentTargets = records.filter((record) => {
      const inJudgmentBatch = PHASE_BATCH_TAGS.some((tag) => tag !== 'batch:b5-theory-mapping' && hasTag(record, tag));
      const priorityTarget = hasTag(record, 'priority:p0') || hasTag(record, 'priority:p1');
      return hasTag(record, CARD_READY_TAG) || hasTag(record, NEEDS_CARD_TAG) || (priorityTarget && inJudgmentBatch);
    });
    const theoryTargets = records.filter((record) => hasTag(record, 'batch:b5-theory-mapping'));
    const judgmentCards = judgmentTargets.map(judgmentCard);
    const theoryCards = theoryTargets.map(theoryInclusionCard);
    const tagUpdates = [];
    for (const record of records) {
      const isJudgmentTarget = judgmentTargets.some((target) => target.id === record.id);
      const isTheoryTarget = theoryTargets.some((target) => target.id === record.id);
      if (!isJudgmentTarget && !isTheoryTarget) {
        continue;
      }
      const next = nextTagsForRecord(record, isJudgmentTarget, isTheoryTarget);
      if (JSON.stringify(next) === JSON.stringify(uniqueSorted(record.tags))) {
        continue;
      }
      tagUpdates.push({
        literature_id: record.id,
        previous_tags: uniqueSorted(record.tags),
        next_tags: next,
        removed: record.tags.filter((tag) => !next.includes(tag)).sort(),
        added: next.filter((tag) => !record.tags.includes(tag)).sort(),
      });
    }

    if (apply) {
      for (const update of tagUpdates) {
        await prisma.literatureRecord.update({
          where: { id: update.literature_id },
          data: { tags: update.next_tags },
        });
      }
    }

    const after = await countSideEffects(prisma);
    const payload = {
      generated_at: new Date().toISOString(),
      apply,
      write_artifacts: writeArtifacts,
      scope: {
        phase_batch_tags: PHASE_BATCH_TAGS,
        judgment_target_rule: 'phase B1/B2/B3/B4/B6 records with priority:p0 or priority:p1, plus existing judgment-card-needed/ready records',
        theory_target_rule: 'all batch:b5-theory-mapping records',
      },
      summary: {
        records_scanned: records.length,
        judgment_card_count: judgmentCards.length,
        theory_inclusion_card_count: theoryCards.length,
        judgment_cards_by_batch: Object.fromEntries(byBatch(judgmentCards).map(([batch, cards]) => [batch, cards.length])),
        theory_cards_by_priority: Object.fromEntries(uniqueSorted(theoryCards.map((card) => card.priority)).map((prio) => [prio, theoryCards.filter((card) => card.priority === prio).length])),
        tag_updates: {
          planned_records: tagUpdates.length,
          applied_records: apply ? tagUpdates.length : 0,
          judgment_card_ready_added: tagUpdates.filter((update) => update.added.includes(CARD_READY_TAG)).length,
          theory_inclusion_card_ready_added: tagUpdates.filter((update) => update.added.includes(THEORY_CARD_READY_TAG)).length,
          needs_judgment_card_removed: tagUpdates.filter((update) => update.removed.includes(NEEDS_CARD_TAG)).length,
        },
      },
      counters: {
        before,
        after,
        deltas: deltaCounts(before, after),
      },
      tag_updates: tagUpdates,
      judgment_cards: judgmentCards,
      theory_inclusion_cards: theoryCards,
    };
    if (writeArtifacts) {
      await fs.mkdir(OUT_DIR, { recursive: true });
      await fs.writeFile(JSON_PATH, `${JSON.stringify(payload, null, 2)}\n`);
      await fs.writeFile(MD_PATH, renderMarkdown(payload));
      await fs.writeFile(REPORT_PATH, `${JSON.stringify({
        generated_at: payload.generated_at,
        apply,
        write_artifacts: writeArtifacts,
        summary: payload.summary,
        counters: payload.counters,
        artifact_paths: {
          json: JSON_PATH,
          markdown: MD_PATH,
          report: REPORT_PATH,
        },
      }, null, 2)}\n`);
    }
    console.log(JSON.stringify({
      apply,
      write_artifacts: writeArtifacts,
      summary: payload.summary,
      counters: payload.counters,
      artifact_paths: {
        json: JSON_PATH,
        markdown: MD_PATH,
        report: REPORT_PATH,
      },
    }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

await main();
