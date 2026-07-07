import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// LLM pricing table (T-123 Phase 1.5).
// Config data lives in <repo>/config/llm-pricing.json (USD per 1M tokens).
// Missing file, malformed content, or null rates degrade to "no cost computed"
// (telemetry cost_usd stays null) — pricing must never block an invocation.

export type LlmPricingEntry = {
  input_usd_per_mtok: number | null;
  output_usd_per_mtok: number | null;
};

export type LlmPricingTable = Record<string, Record<string, LlmPricingEntry>>;

const PRICING_CONFIG_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..', '..', '..', '..',
  'config',
  'llm-pricing.json',
);

const warnedModels = new Set<string>();

export function loadDefaultLlmPricingTable(): LlmPricingTable {
  try {
    const parsed = JSON.parse(readFileSync(PRICING_CONFIG_PATH, 'utf8')) as Record<string, unknown>;
    const table: LlmPricingTable = {};
    for (const [providerId, models] of Object.entries(parsed)) {
      if (providerId.startsWith('$') || typeof models !== 'object' || models === null) {
        continue;
      }
      table[providerId] = models as Record<string, LlmPricingEntry>;
    }
    return table;
  } catch {
    if (!warnedModels.has('__config__')) {
      warnedModels.add('__config__');
      console.warn(`[llm-pricing] config not readable at ${PRICING_CONFIG_PATH}; cost_usd stays null.`);
    }
    return {};
  }
}

export function computeLlmCostUsd(
  table: LlmPricingTable,
  providerId: string,
  modelId: string,
  inputTokens: number | null,
  outputTokens: number | null,
): number | null {
  const entry = table[providerId]?.[modelId];
  const inputRate = entry?.input_usd_per_mtok;
  const outputRate = entry?.output_usd_per_mtok;
  const warnMissing = (): null => {
    const key = `${providerId}:${modelId}`;
    if (entry === undefined && !warnedModels.has(key)) {
      warnedModels.add(key);
      console.warn(`[llm-pricing] no pricing entry for ${key}; cost_usd stays null.`);
    }
    return null;
  };

  if (typeof inputRate !== 'number' || inputTokens === null) {
    return warnMissing();
  }

  // T-130 W-04 (L-05): input-only billing — embeddings responses carry no completion tokens, so
  // an entry with output_usd_per_mtok: null bills input only. Guard: if the response DOES report
  // positive output tokens but the entry has no output rate, stay null instead of underbilling.
  if (typeof outputRate !== 'number') {
    if (outputTokens !== null && outputTokens > 0) {
      return warnMissing();
    }
    return (inputTokens * inputRate) / 1_000_000;
  }

  if (outputTokens === null) {
    return warnMissing();
  }
  return (inputTokens * inputRate + outputTokens * outputRate) / 1_000_000;
}
