import assert from 'node:assert/strict';
import test from 'node:test';
import {
  estimateEmbeddingTokens,
  splitEmbeddingInputBatches,
} from './literature-content-processing-utils.js';

// T-130 W-04 (L-08): provider-safe embedding input batching.

test('splitEmbeddingInputBatches respects the item cap and preserves order', () => {
  const texts = ['a', 'b', 'c', 'd', 'e'];
  const batches = splitEmbeddingInputBatches(texts, { maxItems: 2, maxEstimatedTokens: 10_000 });
  assert.deepEqual(batches, [[0, 1], [2, 3], [4]]);
});

test('splitEmbeddingInputBatches respects the estimated-token budget', () => {
  // ~34 estimated tokens each (100 chars / 3); budget 70 fits two per batch.
  const texts = Array.from({ length: 5 }, () => 'x'.repeat(100));
  const batches = splitEmbeddingInputBatches(texts, { maxItems: 100, maxEstimatedTokens: 70 });
  assert.deepEqual(batches, [[0, 1], [2, 3], [4]]);
});

test('a single oversized input still ships alone', () => {
  const texts = ['x'.repeat(9_000), 'y'];
  const batches = splitEmbeddingInputBatches(texts, { maxItems: 100, maxEstimatedTokens: 100 });
  assert.deepEqual(batches, [[0], [1]]);
});

test('default limits produce a single batch for typical literature sizes', () => {
  const texts = Array.from({ length: 300 }, () => 'z'.repeat(1_200));
  assert.equal(splitEmbeddingInputBatches(texts).length, 1);
});

test('estimateEmbeddingTokens is a conservative over-estimate with a floor of 1', () => {
  assert.equal(estimateEmbeddingTokens(''), 1);
  assert.equal(estimateEmbeddingTokens('abcdef'), 2);
});
