import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  TopicSelectionV1bN8DebateTriggerThresholds,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-workflow-harness-contracts';
import {
  analyzeN8DebateThresholdCalibration,
  type TopicSelectionN8CalibrationRecord,
} from './topic-selection-v1b-n8-calibration-analysis.js';

// The provisional DP-3.3 set (mirrors the N8 node policy + the trigger-unit fixture).
const THRESHOLDS: TopicSelectionV1bN8DebateTriggerThresholds = {
  provisional: true,
  t1_total_score_min: 60,
  t1_total_score_max_exclusive: 72,
  t1_confidence_min: 0.55,
  t3_dimension_spread_min: 40,
  t3_single_dimension_floor: 35,
  t3_total_score_min: 60,
};

function dims(values: Record<string, number>): Array<{ dimension_key: string; score: number }> {
  return Object.entries(values).map(([dimension_key, score]) => ({ dimension_key, score }));
}

const evenDims = dims({ a: 80, b: 82 }); // spread 2, no weak dim

function rec(
  topic_id: string,
  ground: TopicSelectionN8CalibrationRecord['ground_truth_label'],
  total: number,
  confidence: number,
  dimensionScores: Array<{ dimension_key: string; score: number }> = evenDims,
  extra: Partial<TopicSelectionN8CalibrationRecord> = {},
): TopicSelectionN8CalibrationRecord {
  return {
    topic_id,
    executor: 'mocked',
    status: 'succeeded',
    total_score: total,
    confidence,
    dimension_scores: dimensionScores,
    ground_truth_label: ground,
    ...extra,
  };
}

// A gold set where the provisional thresholds separate the bands perfectly.
const CLEAN_SET: TopicSelectionN8CalibrationRecord[] = [
  rec('clear_pass_fixture', 'clear_pass', 83, 0.82, dims({ a: 84, reviewer_risk: 72 })), // spread 12 → no trigger
  rec('borderline_band', 'borderline', 65, 0.9, evenDims), // total in [60,72) → T1
  rec('borderline_conf', 'borderline', 83, 0.5, evenDims), // conf < 0.55 → T1
  rec('dimension_conflict', 'dimension_conflict', 83, 0.9, dims({ a: 90, b: 45 })), // spread 45, total≥60 → T3
  rec('clear_fail', 'clear_fail', 40, 0.9, dims({ a: 90, b: 45 })), // total < 60 → no trigger
];

test('clean gold set: provisional thresholds separate the bands (precision=recall=1, no cross-misfire)', () => {
  const out = analyzeN8DebateThresholdCalibration(CLEAN_SET, THRESHOLDS);
  assert.equal(out.overall.tp, 3);
  assert.equal(out.overall.fp, 0);
  assert.equal(out.overall.fn, 0);
  assert.equal(out.overall.tn, 2);
  assert.equal(out.overall.precision, 1);
  assert.equal(out.overall.recall, 1);
  assert.equal(out.overall.f1, 1);
  assert.equal(out.overall.accuracy, 1);
  assert.equal(out.per_trigger.borderline_caught_by_t1, 2);
  assert.equal(out.per_trigger.dimension_conflict_caught_by_t3, 1);
  assert.equal(out.per_trigger.cross_misfire_count, 0);
  assert.equal(out.band_separation_verdict, 'separates');
  assert.match(out.recommendation, /flip provisional/);
});

test('a missed borderline (no trigger) lowers recall and flips the verdict to leaky', () => {
  // total 75 is above the T1 band (exclusive) and conf ok and spread small → NO trigger, but labeled borderline.
  const leaky = [...CLEAN_SET, rec('borderline_missed', 'borderline', 75, 0.9, evenDims)];
  const out = analyzeN8DebateThresholdCalibration(leaky, THRESHOLDS);
  assert.equal(out.overall.fn, 1);
  assert.ok(out.overall.recall !== null && out.overall.recall < 1);
  assert.equal(out.band_separation_verdict, 'leaky');
  assert.deepEqual(out.false_negative_topic_ids, ['borderline_missed']);
  assert.match(out.recommendation, /LEAK/);
  assert.match(out.recommendation, /borderline_missed/);
});

test('a needless debate on a clear topic lowers precision', () => {
  // clear_pass but total 65 → T1 fires (false positive).
  const leaky = [...CLEAN_SET, rec('clear_but_triggers', 'clear_pass', 65, 0.9, evenDims)];
  const out = analyzeN8DebateThresholdCalibration(leaky, THRESHOLDS);
  assert.equal(out.overall.fp, 1);
  assert.ok(out.overall.precision !== null && out.overall.precision < 1);
  assert.deepEqual(out.false_positive_topic_ids, ['clear_but_triggers']);
  assert.equal(out.band_separation_verdict, 'leaky');
});

test('cross-misfire: a borderline topic caught only by T3 (not T1) is flagged', () => {
  // labeled borderline, but total 80 (above T1 band) + spread 45 → T3 only, no T1.
  const set = [...CLEAN_SET, rec('borderline_via_t3', 'borderline', 80, 0.9, dims({ a: 90, b: 45 }))];
  const out = analyzeN8DebateThresholdCalibration(set, THRESHOLDS);
  assert.equal(out.per_trigger.cross_misfire_count, 1);
  assert.deepEqual(out.per_trigger.cross_misfire_topic_ids, ['borderline_via_t3']);
  // it IS caught (TP, recall stays high) but the band attribution is wrong → leaky.
  assert.equal(out.band_separation_verdict, 'leaky');
  assert.match(out.recommendation, /cross-misfire/);
});

test('non-succeeded records are excluded from metrics, counted, and listed', () => {
  const set: TopicSelectionN8CalibrationRecord[] = [
    ...CLEAN_SET,
    { topic_id: 'blocked_over_budget', executor: 'provider_llm', provider: 'openai', status: 'blocked', blocker_codes: ['TOKEN_BUDGET_OVER_LIMIT_AFTER_COMPRESSION'], ground_truth_label: 'borderline' },
  ];
  const out = analyzeN8DebateThresholdCalibration(set, THRESHOLDS);
  assert.equal(out.n_records_total, 6);
  assert.equal(out.n_records_excluded, 1);
  assert.deepEqual(out.excluded_topic_ids, ['blocked_over_budget']);
  // the blocked record must NOT count as a false negative (it is not a value signal, not a total_score=0).
  assert.equal(out.overall.n, 5);
  assert.equal(out.overall.fn, 0);
});

test('empty / all-excluded input yields insufficient_data, not a misleading 1.0', () => {
  const out = analyzeN8DebateThresholdCalibration([], THRESHOLDS);
  assert.equal(out.overall.precision, null);
  assert.equal(out.overall.recall, null);
  assert.equal(out.band_separation_verdict, 'insufficient_data');
  assert.match(out.recommendation, /Insufficient/);
});

test('per-executor and per-provider breakdowns surface score-scale skew', () => {
  const set: TopicSelectionN8CalibrationRecord[] = [
    rec('a_openai', 'borderline', 65, 0.9, evenDims, { executor: 'provider_llm', provider: 'openai' }),
    rec('b_dashscope', 'clear_pass', 83, 0.82, dims({ a: 84, reviewer_risk: 72 }), { executor: 'provider_llm', provider: 'dashscope' }),
  ];
  const out = analyzeN8DebateThresholdCalibration(set, THRESHOLDS);
  const providers = out.per_provider.map((g) => g.group);
  assert.deepEqual(providers, ['dashscope', 'openai']); // sorted
  const openai = out.per_provider.find((g) => g.group === 'openai');
  assert.ok(openai);
  assert.equal(openai?.mean_total_score, 65);
  assert.equal(out.per_executor.length, 1); // both are provider_llm
  assert.equal(out.per_executor[0]?.group, 'provider_llm');
});

test('the analysis evaluates the EXACT thresholds passed (a different set changes the verdict)', () => {
  // Tighten the T1 band so the 65-total borderline no longer triggers → that borderline becomes a miss.
  const tightened: TopicSelectionV1bN8DebateTriggerThresholds = { ...THRESHOLDS, t1_total_score_min: 66 };
  const out = analyzeN8DebateThresholdCalibration(CLEAN_SET, tightened);
  assert.ok(out.overall.fn >= 1); // borderline_band (65) now missed
  assert.equal(out.band_separation_verdict, 'leaky');
});
