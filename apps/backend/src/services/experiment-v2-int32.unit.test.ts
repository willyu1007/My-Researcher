import assert from 'node:assert/strict';
import test from 'node:test';

import { EXPERIMENT_V2_INT32_MAX } from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-contract-limits';

import {
  assertExperimentV2PositiveInt32,
  incrementExperimentV2Int32Counter,
  nextExperimentV2Int32Sequence,
} from './experiment-v2-int32.js';

const errorFactory = (message: string) => new RangeError(message);

test('shared experiment v2 Int32 read fence accepts only positive PostgreSQL Int values', () => {
  for (const value of [1, EXPERIMENT_V2_INT32_MAX]) {
    assert.doesNotThrow(() => assertExperimentV2PositiveInt32(value, 'sequence', errorFactory));
  }
  for (const value of [0, -1, 1.5, EXPERIMENT_V2_INT32_MAX + 1, Number.NaN]) {
    assert.throws(
      () => assertExperimentV2PositiveInt32(value, 'sequence', errorFactory),
      RangeError,
    );
  }
});

test('shared experiment v2 Int32 counter increment fails closed at invalid or exhausted state', () => {
  assert.equal(incrementExperimentV2Int32Counter(0, 'counter', errorFactory), 1);
  assert.equal(
    incrementExperimentV2Int32Counter(EXPERIMENT_V2_INT32_MAX - 1, 'counter', errorFactory),
    EXPERIMENT_V2_INT32_MAX,
  );
  for (const value of [-1, 1.5, EXPERIMENT_V2_INT32_MAX]) {
    assert.throws(
      () => incrementExperimentV2Int32Counter(value, 'counter', errorFactory),
      RangeError,
    );
  }
});

test('shared experiment v2 next-sequence helper validates complete persisted history', () => {
  assert.equal(nextExperimentV2Int32Sequence([], 'sequence', errorFactory), 1);
  assert.equal(nextExperimentV2Int32Sequence([2, 1, 3], 'sequence', errorFactory), 4);
  assert.equal(
    nextExperimentV2Int32Sequence(
      [EXPERIMENT_V2_INT32_MAX - 1],
      'sequence',
      errorFactory,
    ),
    EXPERIMENT_V2_INT32_MAX,
  );
  for (const history of [[0], [1.5], [EXPERIMENT_V2_INT32_MAX]]) {
    assert.throws(
      () => nextExperimentV2Int32Sequence(history, 'sequence', errorFactory),
      RangeError,
    );
  }
});
