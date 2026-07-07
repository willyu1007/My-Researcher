import assert from 'node:assert/strict';
import test from 'node:test';
import { computeLlmCostUsd, type LlmPricingTable } from './llm-pricing-table.js';

// T-130 W-04 (L-05): input-only billing rules for embedding-style models.

const TABLE: LlmPricingTable = {
  openai: {
    'chat-model': { input_usd_per_mtok: 5, output_usd_per_mtok: 30 },
    'embed-model': { input_usd_per_mtok: 0.13, output_usd_per_mtok: null },
  },
};

test('input-only entry bills input tokens when output tokens are null or zero', () => {
  assert.equal(computeLlmCostUsd(TABLE, 'openai', 'embed-model', 1_000_000, null), 0.13);
  assert.equal(computeLlmCostUsd(TABLE, 'openai', 'embed-model', 2_000_000, 0), 0.26);
});

test('input-only entry refuses to underbill when positive output tokens are reported', () => {
  assert.equal(computeLlmCostUsd(TABLE, 'openai', 'embed-model', 1_000_000, 50), null);
});

test('chat entry still requires both token counts', () => {
  assert.equal(computeLlmCostUsd(TABLE, 'openai', 'chat-model', 1_000_000, null), null);
  assert.equal(computeLlmCostUsd(TABLE, 'openai', 'chat-model', 1_000_000, 100_000), 8);
});

test('unknown model stays null', () => {
  assert.equal(computeLlmCostUsd(TABLE, 'openai', 'missing-model', 1_000, 1_000), null);
});
