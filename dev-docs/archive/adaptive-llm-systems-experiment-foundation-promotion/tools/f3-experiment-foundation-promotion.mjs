import fs from 'node:fs/promises';
import path from 'node:path';

const TASK_DIR = 'dev-docs/active/adaptive-llm-systems-experiment-foundation-promotion';
const OUT_DIR = path.join(TASK_DIR, 'artifacts');
const MATRIX_PATH = path.join(OUT_DIR, 'f3-promotion-matrix.json');
const MD_PATH = path.join(TASK_DIR, '06-f3-promotion-matrix.md');
const F2_DETAIL_PATH = '.ai/.tmp/adaptive-llm-systems-readiness-followup/f2-fulltext-code-readiness.json';

const OVERRIDES = {
  'LIT-0181': {
    promotion_priority: 6,
    primary_candidate_family: 'baseline',
    secondary_candidate_families: ['method_component'],
    proposed_asset_output: 'Adaptive RAG policy baseline for query-complexity-aware retrieval/generation allocation.',
    experiment_lane: 'rag-aware-allocation-policy-baseline',
    risk_level: 'low',
    risk_reasons: ['Requires repository smoke and benchmark compatibility check before promotion.'],
    missing_fields: ['duplicate_check', 'version_ref', 'policy_ref', 'benchmark_refs', 'entrypoint_smoke'],
    next_verification_action: 'Inspect repository entrypoint and identify minimal benchmark-compatible run command.',
  },
  'LIT-0189': {
    promotion_priority: 2,
    primary_candidate_family: 'dataset',
    secondary_candidate_families: ['benchmark', 'evaluation_protocol'],
    proposed_asset_output: 'RAG serving workload-trace dataset candidate for retrieval/prefill/decode load modeling.',
    experiment_lane: 'rag-serving-workload-trace',
    risk_level: 'medium',
    risk_reasons: ['Workload traces need privacy, redistribution, schema, and replay policy review.'],
    missing_fields: ['trace_schema', 'split_protocol', 'data_policy_ref', 'privacy_review', 'checksum_manifest'],
    next_verification_action: 'Inspect trace schema, license text, and replay instructions before dataset candidate promotion.',
  },
  'LIT-0195': {
    promotion_priority: 3,
    primary_candidate_family: 'method_component',
    secondary_candidate_families: ['baseline', 'evaluation_protocol'],
    proposed_asset_output: 'Reusable RAG toolkit/method component candidate for benchmark harness integration.',
    experiment_lane: 'rag-toolkit-baseline-harness',
    risk_level: 'low',
    risk_reasons: ['Toolkit scope must be narrowed to reproducible components and compatible evaluation protocols.'],
    missing_fields: ['component_spec', 'version_ref', 'supported_benchmark_refs', 'entrypoint_smoke'],
    next_verification_action: 'Identify a minimal FlashRAG pipeline and its dataset/evaluator dependencies.',
  },
  'LIT-0197': {
    promotion_priority: 4,
    primary_candidate_family: 'evaluation_protocol',
    secondary_candidate_families: ['benchmark', 'method_component'],
    proposed_asset_output: 'Fine-grained RAG diagnosis/evaluation protocol candidate.',
    experiment_lane: 'rag-quality-diagnosis-protocol',
    risk_level: 'low',
    risk_reasons: ['Metric definitions and evaluator inputs must be separated from benchmark assets.'],
    missing_fields: ['metric_definition_refs', 'protocol_summary', 'evaluator_ref', 'benchmark_ref'],
    next_verification_action: 'Extract metric definitions and evaluator entrypoints for protocol candidate payload.',
  },
  'LIT-0198': {
    promotion_priority: 5,
    primary_candidate_family: 'method_component',
    secondary_candidate_families: ['baseline', 'evaluation_protocol'],
    proposed_asset_output: 'Research-oriented RAG framework candidate for modular baseline construction.',
    experiment_lane: 'rag-framework-baseline-harness',
    risk_level: 'low',
    risk_reasons: ['Framework must be scoped to reproducible baseline components.'],
    missing_fields: ['component_spec', 'version_ref', 'supported_benchmark_refs', 'entrypoint_smoke'],
    next_verification_action: 'Identify RAGLAB runnable examples and supported evaluation datasets.',
  },
  'LIT-0204': {
    promotion_priority: 1,
    primary_candidate_family: 'benchmark',
    secondary_candidate_families: ['evaluation_protocol', 'dataset'],
    proposed_asset_output: 'End-to-end RAG systems benchmark candidate for quality/latency/cost tradeoff evaluation.',
    experiment_lane: 'rag-systems-benchmark',
    risk_level: 'low',
    risk_reasons: ['Benchmark protocol and evaluator smoke must be verified before promotion.'],
    missing_fields: ['benchmark_protocol_ref', 'metric_definition_refs', 'dataset_refs', 'evaluator_smoke', 'version_ref'],
    next_verification_action: 'Inspect RAGPerf benchmark protocol, datasets, metrics, and minimal smoke command.',
  },
  'LIT-0215': {
    promotion_priority: 7,
    primary_candidate_family: 'dataset',
    secondary_candidate_families: ['benchmark'],
    proposed_asset_output: 'LLM serving workload dataset candidate for queueing/scheduling substrate experiments.',
    experiment_lane: 'llm-serving-workload-trace',
    risk_level: 'medium',
    risk_reasons: ['Real-world workload traces need policy, privacy, and redistribution review.'],
    missing_fields: ['trace_schema', 'split_protocol', 'data_policy_ref', 'privacy_review', 'checksum_manifest'],
    next_verification_action: 'Inspect workload format, license constraints, and replay compatibility with serving simulators.',
  },
  'LIT-0218': {
    promotion_priority: 8,
    primary_candidate_family: 'method_component',
    secondary_candidate_families: ['baseline'],
    proposed_asset_output: 'LLM inference simulator component candidate for serving policy experiments.',
    experiment_lane: 'llm-serving-simulator',
    risk_level: 'low',
    risk_reasons: ['Simulator must be bound to workload traces and version-locked configs.'],
    missing_fields: ['component_spec', 'version_ref', 'workload_dataset_refs', 'entrypoint_smoke'],
    next_verification_action: 'Identify a minimal Vidur simulation run using a local or synthetic workload.',
  },
  'LIT-0234': {
    promotion_priority: 9,
    primary_candidate_family: 'baseline',
    secondary_candidate_families: ['method_component'],
    proposed_asset_output: 'LLM routing baseline candidate for adaptive model-choice cost/quality experiments.',
    experiment_lane: 'test-time-routing-baseline',
    risk_level: 'low',
    risk_reasons: ['Preference-data assumptions and model/provider dependencies need review.'],
    missing_fields: ['supported_benchmark_refs', 'version_ref', 'policy_ref', 'entrypoint_smoke'],
    next_verification_action: 'Inspect RouteLLM examples and define a provider-independent smoke path.',
  },
  'LIT-0273': {
    promotion_priority: 10,
    primary_candidate_family: 'baseline',
    secondary_candidate_families: ['method_component'],
    proposed_asset_output: 'Long-context LLM serving baseline candidate for context-window/prefill/decode resource allocation.',
    experiment_lane: 'long-context-serving-baseline',
    risk_level: 'low',
    risk_reasons: ['System requirements may exceed local reproducibility and need adapter/resource constraints.'],
    missing_fields: ['hardware_profile', 'version_ref', 'entrypoint_smoke', 'supported_workload_refs'],
    next_verification_action: 'Inspect LoongServe minimum hardware assumptions and decide whether to keep as local-smoke or external-run candidate.',
  },
};

function ref(kind, id) {
  return { kind, id };
}

function statusFromOverride(override) {
  return override.missing_fields.length > 0 ? 'manual_review_required' : 'ready_for_promotion';
}

function policyStatus(license) {
  if (!license || license === 'unknown') return 'unknown';
  return 'clear';
}

function confidenceScore(item, override) {
  const base = item.code_evidence?.status === 'verified-api' ? 0.86 : 0.82;
  return override.risk_level === 'medium' ? base - 0.05 : base;
}

function buildMatrixItem(item) {
  const override = OVERRIDES[item.id];
  if (!override) return null;
  const confidence = confidenceScore(item, override);
  const candidateStatus = statusFromOverride(override);
  const license = item.code_evidence?.license ?? 'unknown';
  return {
    literature_id: item.id,
    title: item.title,
    year: item.year,
    promotion_priority: override.promotion_priority,
    experiment_lane: override.experiment_lane,
    primary_candidate_family: override.primary_candidate_family,
    secondary_candidate_families: override.secondary_candidate_families,
    candidate_status: candidateStatus,
    promotion_decision_kind: candidateStatus === 'ready_for_promotion' ? 'manual_promote' : 'manual_review_required',
    auto_promotion_allowed: false,
    auto_promotion_blockers: [
      'duplicate_check_not_completed',
      'version_or_policy_refs_missing',
      'repository_smoke_not_verified',
      ...override.missing_fields.map((field) => `missing_${field}`),
    ],
    proposed_asset_output: override.proposed_asset_output,
    source_refs: [
      ref('literature_record', item.id),
      ref('external_repository', item.code_evidence?.repo ?? 'unknown'),
    ],
    repository: item.code_evidence?.url ?? null,
    repository_verification_status: item.code_evidence?.status ?? 'unknown',
    license,
    protocol_signal: item.protocol_signal,
    runnable_baseline_feasibility: item.runnable_baseline_feasibility,
    confidence_score: confidence,
    duplicate_status: 'not_checked',
    completeness_status: 'needs_info',
    policy_status: policyStatus(license),
    risk_level: override.risk_level,
    risk_reasons: override.risk_reasons,
    metric_tags: item.metric_tags,
    resource_tags: item.resource_tags,
    direction_tags: item.direction_tags,
    missing_fields: override.missing_fields,
    next_verification_action: override.next_verification_action,
  };
}

function mdEscape(value) {
  return String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function markdownTable(headers, rows) {
  const lines = [];
  lines.push(`| ${headers.map(mdEscape).join(' | ')} |`);
  lines.push(`| ${headers.map(() => '---').join(' | ')} |`);
  for (const row of rows) {
    lines.push(`| ${row.map(mdEscape).join(' | ')} |`);
  }
  return lines;
}

function renderMarkdown(payload) {
  const lines = [];
  lines.push('# 06 F3 Promotion Matrix');
  lines.push('');
  lines.push('## Status');
  lines.push('- State: in-progress');
  lines.push('- Date: 2026-06-04');
  lines.push('- Scope: 10 high runnable-feasibility candidates from T-117 F2 readiness.');
  lines.push('- Boundary: candidate promotion planning only; no canonical experiment-foundation assets are created.');
  lines.push('');
  lines.push('## Summary');
  lines.push(...markdownTable(['Metric', 'Value'], [
    ['Candidates', String(payload.summary.candidate_count)],
    ['Auto-promotion allowed', String(payload.summary.auto_promotion_allowed_count)],
    ['Manual review required', String(payload.summary.manual_review_required_count)],
    ['Dataset primary candidates', String(payload.summary.primary_family_counts.dataset ?? 0)],
    ['Benchmark primary candidates', String(payload.summary.primary_family_counts.benchmark ?? 0)],
    ['Baseline primary candidates', String(payload.summary.primary_family_counts.baseline ?? 0)],
    ['Evaluation-protocol primary candidates', String(payload.summary.primary_family_counts.evaluation_protocol ?? 0)],
    ['Method-component primary candidates', String(payload.summary.primary_family_counts.method_component ?? 0)],
  ]));
  lines.push('');
  lines.push('## Promotion Matrix');
  lines.push(...markdownTable([
    'Rank',
    'Literature ID',
    'Primary Family',
    'Secondary Families',
    'Lane',
    'Status',
    'Risk',
    'Proposed Output',
    'Next Verification',
  ], payload.matrix.map((item) => [
    String(item.promotion_priority),
    `\`${item.literature_id}\``,
    `\`${item.primary_candidate_family}\``,
    item.secondary_candidate_families.map((family) => `\`${family}\``).join(', '),
    item.experiment_lane,
    `\`${item.candidate_status}\``,
    `\`${item.risk_level}\``,
    item.proposed_asset_output,
    item.next_verification_action,
  ])));
  lines.push('');
  lines.push('## Auto-Promotion Gate');
  lines.push('- Current decision: `auto_promotion_allowed=false` for all candidates.');
  lines.push('- Reason: F2 verified repository reachability/license signals, but F3 still needs duplicate, completeness, policy, version/protocol, and smoke checks.');
  lines.push('- Promotion should use `manual_review_required` until candidate payloads satisfy the existing experiment-foundation gates.');
  lines.push('');
  lines.push('## Recommended First Lane');
  lines.push('- Start with `LIT-0204` RAGPerf because it is directly aligned with RAG-aware resource allocation and can provide benchmark/protocol structure for other RAG candidates.');
  lines.push('- Then review `LIT-0189` RAGPulse and `LIT-0195` FlashRAG so the benchmark has workload/toolkit anchors.');
  lines.push('');
  lines.push('## Artifact Boundary');
  lines.push(`- Matrix JSON: \`${MATRIX_PATH}\`.`);
  lines.push(`- Source F2 detail: \`${F2_DETAIL_PATH}\` (ignored local detail; regenerate via T-117 tool if absent).`);
  return `${lines.join('\n').trimEnd()}\n`;
}

function countBy(items, key) {
  return items.reduce((acc, item) => {
    const value = item[key];
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
}

async function main() {
  const f2 = JSON.parse(await fs.readFile(F2_DETAIL_PATH, 'utf8'));
  const matrix = f2.ready_candidates
    .map(buildMatrixItem)
    .filter(Boolean)
    .sort((a, b) => a.promotion_priority - b.promotion_priority);
  const payload = {
    generated_at: new Date().toISOString(),
    upstream: {
      task_id: 'T-117',
      source_detail_path: F2_DETAIL_PATH,
      source_summary: f2.summary,
    },
    decision: {
      f3_state: 'started',
      canonical_asset_creation: false,
      auto_promotion_allowed: false,
      first_lane_recommendation: 'LIT-0204',
    },
    summary: {
      candidate_count: matrix.length,
      auto_promotion_allowed_count: matrix.filter((item) => item.auto_promotion_allowed).length,
      manual_review_required_count: matrix.filter((item) => item.candidate_status === 'manual_review_required').length,
      primary_family_counts: countBy(matrix, 'primary_candidate_family'),
      risk_counts: countBy(matrix, 'risk_level'),
    },
    matrix,
    artifact_paths: {
      matrix_json: MATRIX_PATH,
      markdown: MD_PATH,
    },
  };
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(MATRIX_PATH, `${JSON.stringify(payload, null, 2)}\n`);
  await fs.writeFile(MD_PATH, renderMarkdown(payload));
  console.log(JSON.stringify({
    summary: payload.summary,
    first_lane_recommendation: payload.decision.first_lane_recommendation,
    artifact_paths: payload.artifact_paths,
  }, null, 2));
}

await main();
