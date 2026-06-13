import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  TopicSelectionV1bN8DebateTriggerThresholds,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-workflow-harness-contracts';
import { computeTopicSelectionV1bN8DebateTriggers } from './topic-selection-v1b-workflow-harness-service.js';

// Provisional thresholds locked in the N8 node policy (DP-3.3); the unit pins the boundaries.
const THRESHOLDS: TopicSelectionV1bN8DebateTriggerThresholds = {
  provisional: true,
  t1_total_score_min: 60,
  t1_total_score_max_exclusive: 72,
  t1_confidence_min: 0.55,
  t3_dimension_spread_min: 40,
  t3_single_dimension_floor: 35,
  t3_total_score_min: 60,
};

type Dim = { dimension_key: string; score: number };
function draft(total: number, confidence: number, dims: Dim[]) {
  return { total_score: total, confidence, dimension_scores: dims };
}
function codes(total: number, confidence: number, dims: Dim[]): string[] {
  return computeTopicSelectionV1bN8DebateTriggers(draft(total, confidence, dims), THRESHOLDS).map((i) => i.code);
}

const T1 = 'N8_VALUE_BORDERLINE_DEBATE_TRIGGER';
const T3 = 'N8_DIMENSION_CONFLICT_DEBATE_TRIGGER';
const EVEN = [{ dimension_key: 'a', score: 80 }, { dimension_key: 'b', score: 82 }]; // spread 2, no weak

test('null thresholds yield no triggers', () => {
  assert.deepEqual(computeTopicSelectionV1bN8DebateTriggers(draft(65, 0.5, EVEN), null), []);
});

test('clear assessment (existing fixture shape) triggers nothing', () => {
  // total 83, conf 0.82, spread 12 — the value used by the green harness e2e/n8 smoke
  assert.deepEqual(codes(83, 0.82, [{ dimension_key: 'a', score: 84 }, { dimension_key: 'b', score: 72 }]), []);
});

test('T1 borderline by total-score band, inclusive lower / exclusive upper', () => {
  assert.deepEqual(codes(60, 0.9, EVEN), [T1]); // 60 is in band (>= min)
  assert.deepEqual(codes(71, 0.9, EVEN), [T1]); // 71 < 72
  assert.deepEqual(codes(72, 0.9, EVEN), []);    // 72 is excluded
  assert.deepEqual(codes(59, 0.9, EVEN), []);    // below band, conf ok, dims ok
});

test('T1 borderline by confidence floor (strictly below)', () => {
  assert.deepEqual(codes(83, 0.54, EVEN), [T1]); // 0.54 < 0.55
  assert.deepEqual(codes(83, 0.55, EVEN), []);    // 0.55 not < 0.55
});

test('T3 dimension conflict by spread, threshold inclusive', () => {
  assert.deepEqual(codes(83, 0.9, [{ dimension_key: 'a', score: 90 }, { dimension_key: 'b', score: 50 }]), [T3]); // spread 40
  assert.deepEqual(codes(83, 0.9, [{ dimension_key: 'a', score: 90 }, { dimension_key: 'b', score: 51 }]), []);    // spread 39
});

test('T3 (spread AND weak-dim) respects the t3_total_score_min floor', () => {
  // low total: even a large spread / very weak dim must NOT trigger T3 — the score gate owns it
  assert.deepEqual(codes(40, 0.9, [{ dimension_key: 'a', score: 90 }, { dimension_key: 'b', score: 45 }]), []); // spread 45 but total < 60
  assert.deepEqual(codes(59, 0.9, [{ dimension_key: 'a', score: 90 }, { dimension_key: 'b', score: 20 }]), []); // weak 20 + spread 70 but total < 60
  // total 72 is above the T1 band (exclusive) so it isolates T3 at an admissible total
  assert.deepEqual(codes(72, 0.9, [{ dimension_key: 'a', score: 90 }, { dimension_key: 'b', score: 45 }]), [T3]); // spread 45, total >= floor
  // total 60 is at the floor (T3 fires) but is also inside the T1 band, so both fire
  assert.deepEqual(codes(60, 0.9, [{ dimension_key: 'a', score: 90 }, { dimension_key: 'b', score: 45 }]).sort(), [T3, T1].sort());
});

test('T3 dimension conflict by weak single dimension (isolated from spread, low-spread dims)', () => {
  // low spread (< 40) so only the weak-single-dimension branch can fire
  assert.deepEqual(codes(80, 0.9, [{ dimension_key: 'a', score: 36 }, { dimension_key: 'b', score: 34 }]), [T3]); // spread 2, 34 < 35, total >= 60
  assert.deepEqual(codes(80, 0.9, [{ dimension_key: 'a', score: 36 }, { dimension_key: 'b', score: 35 }]), []);    // spread 1, 35 not < 35
  assert.deepEqual(codes(59, 0.9, [{ dimension_key: 'a', score: 36 }, { dimension_key: 'b', score: 30 }]), []);    // spread 6, weak dim ignored when total < 60
});

test('T1 and T3 can fire together', () => {
  const out = codes(65, 0.5, [{ dimension_key: 'a', score: 90 }, { dimension_key: 'b', score: 40 }]);
  assert.deepEqual(out.sort(), [T3, T1].sort());
});
