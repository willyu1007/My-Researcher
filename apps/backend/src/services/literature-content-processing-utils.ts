import crypto from 'node:crypto';

export function sha256Text(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function stableStringify(value: unknown): string {
  if (value === undefined) {
    return 'undefined';
  }
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(',')}}`;
}

export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

// T-130 W-04 (L-08): split embedding inputs into provider-safe batches. OpenAI caps an
// embeddings request at 2048 inputs and ~300k total tokens; we stay conservative (chars/3 as a
// token over-estimate, 200k budget). A single oversized input still ships alone — the provider
// rejects it with a clear per-input error instead of failing the whole literature.
export const EMBEDDING_BATCH_MAX_ITEMS = 2048;
export const EMBEDDING_BATCH_MAX_ESTIMATED_TOKENS = 200_000;

export function estimateEmbeddingTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 3));
}

export function splitEmbeddingInputBatches(
  texts: string[],
  limits: { maxItems?: number; maxEstimatedTokens?: number } = {},
): number[][] {
  const maxItems = Math.max(1, limits.maxItems ?? EMBEDDING_BATCH_MAX_ITEMS);
  const maxTokens = Math.max(1, limits.maxEstimatedTokens ?? EMBEDDING_BATCH_MAX_ESTIMATED_TOKENS);
  const batches: number[][] = [];
  let current: number[] = [];
  let currentTokens = 0;
  for (let index = 0; index < texts.length; index += 1) {
    const tokens = estimateEmbeddingTokens(texts[index] ?? '');
    const wouldOverflow = current.length > 0
      && (current.length >= maxItems || currentTokens + tokens > maxTokens);
    if (wouldOverflow) {
      batches.push(current);
      current = [];
      currentTokens = 0;
    }
    current.push(index);
    currentTokens += tokens;
  }
  if (current.length > 0) {
    batches.push(current);
  }
  return batches;
}
