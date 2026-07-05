/**
 * DP-3.3 N8 debate-threshold calibration — PURE analysis harness.
 *
 * Given a set of captured N8 value-assessment records (each a real draft score + a human
 * ground-truth label), this scores how well a candidate T1/T3 threshold set separates the
 * topics that SHOULD trigger a value debate (borderline / dimension-conflicted) from the
 * clear pass/fail topics. It is the evaluator the calibration run feeds once a labeled corpus
 * and a content-grounded N8 execution path exist (see
 * dev-docs/archive/topic-selection-productization-hardening/evidence/dp33-n8-threshold-calibration/README.md).
 *
 * It is deliberately PURE and executor-agnostic: it reuses the SAME deterministic trigger
 * function the production N8 gate uses (computeTopicSelectionV1bN8DebateTriggers), so the
 * confusion matrix it reports is a faithful simulation of what the deployed gate would do.
 * No I/O, no gateway, no credentials — fully unit-testable with synthetic records.
 *
 * This is calibration TOOLING, not a product service: it never sets thresholds itself and
 * never mutates the node policy. It only reports whether a given threshold set separates the
 * bands, leaving the decision (and the `provisional` flip) to a human reviewing the evidence.
 */
import {
  computeTopicSelectionV1bN8DebateTriggers,
} from './topic-selection-v1b-workflow-harness-service.js';
import type {
  TopicSelectionV1bN8DebateTriggerThresholds,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-workflow-harness-contracts';

/** The deterministic trigger codes the production N8 gate emits (mirrored for attribution). */
export const N8_CALIBRATION_T1_CODE = 'N8_VALUE_BORDERLINE_DEBATE_TRIGGER' as const;
export const N8_CALIBRATION_T3_CODE = 'N8_DIMENSION_CONFLICT_DEBATE_TRIGGER' as const;

export const N8_CALIBRATION_GROUND_TRUTH_LABELS = [
  'clear_pass',
  'clear_fail',
  'borderline',
  'dimension_conflict',
] as const;
export type TopicSelectionN8CalibrationGroundTruthLabel =
  (typeof N8_CALIBRATION_GROUND_TRUTH_LABELS)[number];

export const N8_CALIBRATION_RECORD_STATUSES = ['succeeded', 'blocked', 'error'] as const;
export type TopicSelectionN8CalibrationRecordStatus =
  (typeof N8_CALIBRATION_RECORD_STATUSES)[number];

/** One captured N8 assessment for one topic under one executor. */
export interface TopicSelectionN8CalibrationRecord {
  topic_id: string;
  /** How the draft was produced — recorded so per-executor score-scale skew is visible. */
  executor: 'codex_assisted' | 'provider_llm' | 'mocked';
  /** Provider id when executor is provider_llm (or the codex model), else null. */
  provider?: string | null;
  status: TopicSelectionN8CalibrationRecordStatus;
  /** Present when status !== 'succeeded' — why no usable draft was produced. */
  blocker_codes?: string[];
  /** Draft signals — present iff status === 'succeeded'. */
  total_score?: number;
  confidence?: number;
  dimension_scores?: Array<{ dimension_key: string; score: number }>;
  /** The human-assigned ground truth — the gold the thresholds are scored against. */
  ground_truth_label: TopicSelectionN8CalibrationGroundTruthLabel;
}

export interface TopicSelectionN8CalibrationVerdictGates {
  /** Minimum precision for a 'separates' verdict (needless-debate ceiling). */
  precision_min: number;
  /** Minimum recall for a 'separates' verdict (missed-debate floor). */
  recall_min: number;
}

export const DEFAULT_N8_CALIBRATION_VERDICT_GATES: TopicSelectionN8CalibrationVerdictGates = {
  precision_min: 0.85,
  recall_min: 0.9,
};

interface ConfusionCounts {
  tp: number;
  fp: number;
  fn: number;
  tn: number;
}

export interface TopicSelectionN8CalibrationMetrics extends ConfusionCounts {
  n: number;
  /** Null when the denominator is 0 (no positive predictions / no positives) — never silently 1.0. */
  precision: number | null;
  recall: number | null;
  f1: number | null;
  accuracy: number | null;
}

export interface TopicSelectionN8CalibrationGroupMetrics extends TopicSelectionN8CalibrationMetrics {
  group: string;
  mean_total_score: number | null;
  mean_confidence: number | null;
  mean_spread: number | null;
}

export interface TopicSelectionN8CalibrationAnalysis {
  thresholds_used: TopicSelectionV1bN8DebateTriggerThresholds;
  verdict_gates: TopicSelectionN8CalibrationVerdictGates;
  n_records_total: number;
  n_records_excluded: number;
  excluded_topic_ids: string[];
  overall: TopicSelectionN8CalibrationMetrics;
  per_executor: TopicSelectionN8CalibrationGroupMetrics[];
  per_provider: TopicSelectionN8CalibrationGroupMetrics[];
  per_trigger: {
    borderline_count: number;
    borderline_caught_by_t1: number;
    dimension_conflict_count: number;
    dimension_conflict_caught_by_t3: number;
    /** borderline caught ONLY by T3, or conflict caught ONLY by T1 — bands not cleanly separated. */
    cross_misfire_count: number;
    cross_misfire_topic_ids: string[];
  };
  band_separation_verdict: 'separates' | 'leaky' | 'insufficient_data';
  false_positive_topic_ids: string[];
  false_negative_topic_ids: string[];
  recommendation: string;
}

function bandOf(label: TopicSelectionN8CalibrationGroundTruthLabel): 'clear' | 'borderline' | 'dimension_conflict' {
  return label === 'clear_pass' || label === 'clear_fail' ? 'clear' : label;
}

function shouldDebate(label: TopicSelectionN8CalibrationGroundTruthLabel): boolean {
  return bandOf(label) !== 'clear';
}

function dimensionSpread(dims: Array<{ score: number }>): number | null {
  if (dims.length === 0) return null;
  const scores = dims.map((d) => d.score);
  return Math.max(...scores) - Math.min(...scores);
}

function ratio(numerator: number, denominator: number): number | null {
  return denominator === 0 ? null : numerator / denominator;
}

function f1Of(precision: number | null, recall: number | null): number | null {
  if (precision === null || recall === null) return null;
  if (precision + recall === 0) return 0;
  return (2 * precision * recall) / (precision + recall);
}

interface EvaluatedRecord {
  record: TopicSelectionN8CalibrationRecord;
  should_debate: boolean;
  predicted_debate: boolean;
  predicted_t1: boolean;
  predicted_t3: boolean;
  spread: number | null;
}

function metricsFor(rows: EvaluatedRecord[]): TopicSelectionN8CalibrationMetrics {
  const counts: ConfusionCounts = { tp: 0, fp: 0, fn: 0, tn: 0 };
  for (const r of rows) {
    if (r.should_debate && r.predicted_debate) counts.tp += 1;
    else if (!r.should_debate && r.predicted_debate) counts.fp += 1;
    else if (r.should_debate && !r.predicted_debate) counts.fn += 1;
    else counts.tn += 1;
  }
  const precision = ratio(counts.tp, counts.tp + counts.fp);
  const recall = ratio(counts.tp, counts.tp + counts.fn);
  return {
    ...counts,
    n: rows.length,
    precision,
    recall,
    f1: f1Of(precision, recall),
    accuracy: ratio(counts.tp + counts.tn, rows.length),
  };
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function groupMetrics(group: string, rows: EvaluatedRecord[]): TopicSelectionN8CalibrationGroupMetrics {
  return {
    group,
    ...metricsFor(rows),
    mean_total_score: mean(rows.map((r) => r.record.total_score ?? Number.NaN).filter((v) => !Number.isNaN(v))),
    mean_confidence: mean(rows.map((r) => r.record.confidence ?? Number.NaN).filter((v) => !Number.isNaN(v))),
    mean_spread: mean(rows.map((r) => r.spread).filter((v): v is number => v !== null)),
  };
}

function groupBy(rows: EvaluatedRecord[], keyOf: (r: EvaluatedRecord) => string): TopicSelectionN8CalibrationGroupMetrics[] {
  const byKey = new Map<string, EvaluatedRecord[]>();
  for (const r of rows) {
    const key = keyOf(r);
    const bucket = byKey.get(key);
    if (bucket) bucket.push(r);
    else byKey.set(key, [r]);
  }
  return [...byKey.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, bucket]) => groupMetrics(key, bucket));
}

/**
 * Score a candidate threshold set against captured, labeled N8 records.
 * Non-`succeeded` records are EXCLUDED from the confusion metrics (a blocked draft is not a
 * value signal); they are counted + listed so silent dropping never reads as "all clear".
 */
export function analyzeN8DebateThresholdCalibration(
  records: readonly TopicSelectionN8CalibrationRecord[],
  thresholds: TopicSelectionV1bN8DebateTriggerThresholds,
  verdictGates: TopicSelectionN8CalibrationVerdictGates = DEFAULT_N8_CALIBRATION_VERDICT_GATES,
): TopicSelectionN8CalibrationAnalysis {
  const excluded = records.filter((r) => r.status !== 'succeeded');
  const evaluated: EvaluatedRecord[] = records
    .filter((r) => r.status === 'succeeded')
    .map((record) => {
      const draft = {
        total_score: record.total_score ?? 0,
        confidence: record.confidence ?? 0,
        dimension_scores: record.dimension_scores ?? [],
      };
      const codes = computeTopicSelectionV1bN8DebateTriggers(draft, thresholds).map((issue) => issue.code);
      return {
        record,
        should_debate: shouldDebate(record.ground_truth_label),
        predicted_debate: codes.length > 0,
        predicted_t1: codes.includes(N8_CALIBRATION_T1_CODE),
        predicted_t3: codes.includes(N8_CALIBRATION_T3_CODE),
        spread: dimensionSpread(record.dimension_scores ?? []),
      };
    });

  const overall = metricsFor(evaluated);

  const borderline = evaluated.filter((r) => bandOf(r.record.ground_truth_label) === 'borderline');
  const conflict = evaluated.filter((r) => bandOf(r.record.ground_truth_label) === 'dimension_conflict');
  const crossMisfires = evaluated.filter((r) =>
    (bandOf(r.record.ground_truth_label) === 'borderline' && r.predicted_debate && !r.predicted_t1 && r.predicted_t3)
    || (bandOf(r.record.ground_truth_label) === 'dimension_conflict' && r.predicted_debate && !r.predicted_t3 && r.predicted_t1));

  const perTrigger = {
    borderline_count: borderline.length,
    borderline_caught_by_t1: borderline.filter((r) => r.predicted_t1).length,
    dimension_conflict_count: conflict.length,
    dimension_conflict_caught_by_t3: conflict.filter((r) => r.predicted_t3).length,
    cross_misfire_count: crossMisfires.length,
    cross_misfire_topic_ids: crossMisfires.map((r) => r.record.topic_id),
  };

  const falsePositives = evaluated.filter((r) => !r.should_debate && r.predicted_debate).map((r) => r.record.topic_id);
  const falseNegatives = evaluated.filter((r) => r.should_debate && !r.predicted_debate).map((r) => r.record.topic_id);

  const verdict = computeVerdict(overall, perTrigger, evaluated.length, verdictGates);

  return {
    thresholds_used: thresholds,
    verdict_gates: verdictGates,
    n_records_total: records.length,
    n_records_excluded: excluded.length,
    excluded_topic_ids: excluded.map((r) => r.topic_id),
    overall,
    per_executor: groupBy(evaluated, (r) => r.record.executor),
    per_provider: groupBy(evaluated, (r) => r.record.provider ?? r.record.executor),
    per_trigger: perTrigger,
    band_separation_verdict: verdict,
    false_positive_topic_ids: falsePositives,
    false_negative_topic_ids: falseNegatives,
    recommendation: buildRecommendation(verdict, overall, perTrigger, evaluated.length, falsePositives, falseNegatives, verdictGates),
  };
}

function computeVerdict(
  overall: TopicSelectionN8CalibrationMetrics,
  perTrigger: TopicSelectionN8CalibrationAnalysis['per_trigger'],
  evaluatedCount: number,
  gates: TopicSelectionN8CalibrationVerdictGates,
): TopicSelectionN8CalibrationAnalysis['band_separation_verdict'] {
  if (evaluatedCount === 0 || overall.precision === null || overall.recall === null) {
    return 'insufficient_data';
  }
  const separates = overall.recall >= gates.recall_min
    && overall.precision >= gates.precision_min
    && perTrigger.cross_misfire_count === 0;
  return separates ? 'separates' : 'leaky';
}

function buildRecommendation(
  verdict: TopicSelectionN8CalibrationAnalysis['band_separation_verdict'],
  overall: TopicSelectionN8CalibrationMetrics,
  perTrigger: TopicSelectionN8CalibrationAnalysis['per_trigger'],
  evaluatedCount: number,
  falsePositives: string[],
  falseNegatives: string[],
  gates: TopicSelectionN8CalibrationVerdictGates,
): string {
  if (verdict === 'insufficient_data') {
    return `Insufficient succeeded records (${evaluatedCount}) to judge separation — collect more labeled, content-grounded N8 assessments before deciding.`;
  }
  if (verdict === 'separates') {
    return `These thresholds separate the bands at precision=${fmt(overall.precision)} / recall=${fmt(overall.recall)} (gates ${gates.precision_min}/${gates.recall_min}), zero cross-misfires. Safe to adopt this set and flip provisional → false, provided per-executor/per-provider metrics do not hide a leak.`;
  }
  const issues: string[] = [];
  if (overall.recall !== null && overall.recall < gates.recall_min) {
    issues.push(`recall ${fmt(overall.recall)} < ${gates.recall_min} (missed debates: ${falseNegatives.join(', ') || 'none listed'}) — consider widening the T1 band or raising t1_confidence_min / lowering t3 floors`);
  }
  if (overall.precision !== null && overall.precision < gates.precision_min) {
    issues.push(`precision ${fmt(overall.precision)} < ${gates.precision_min} (needless debates: ${falsePositives.join(', ') || 'none listed'}) — consider narrowing the T1 band or lowering t1_confidence_min / raising t3 floors`);
  }
  if (perTrigger.cross_misfire_count > 0) {
    issues.push(`${perTrigger.cross_misfire_count} cross-misfire(s) (${perTrigger.cross_misfire_topic_ids.join(', ')}) — borderline/conflict bands are not cleanly separated by T1 vs T3`);
  }
  return `Thresholds LEAK: ${issues.join('; ')}. Do NOT flip provisional → false yet.`;
}

function fmt(value: number | null): string {
  return value === null ? 'n/a' : value.toFixed(3);
}
