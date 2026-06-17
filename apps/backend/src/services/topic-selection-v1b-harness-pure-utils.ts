/**
 * W-12 / D-T127-01: pure, stateless utilities relocated VERBATIM from the v1b harness
 * (`topic-selection-v1b-workflow-harness-service.ts`). No instance state — each is a `this`-free
 * function with identical behavior to the private method it replaced. These underpin the
 * parse-and-resolve and authority-hash clusters, so they are extracted ahead of those slices.
 *
 * Note: the harness `ref(...)` builder is exported here as `buildRef` and imported under that name,
 * because the harness has many local/parameter bindings named `ref` that a bare `ref` import would
 * shadow. The hash regex `HASH_PATTERN` is the single source shared by `isHash` and the harness's
 * own direct `.test(...)` checks.
 */
import type { TopicSelectionFunctionalRef } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

/** 64-hex sha256 shape. */
export const HASH_PATTERN = /^[a-f0-9]{64}$/;

/** Functional ref builder (harness `ref`). Imported into the harness as `buildRef`. */
export function buildRef(
  refType: string,
  refId: string,
  titleCardId?: string | null,
  versionId?: string | null,
): TopicSelectionFunctionalRef {
  return {
    ref_type: refType,
    ref_id: refId,
    version_id: versionId ?? null,
    title_card_id: titleCardId ?? null,
  };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function hasOnlyKeys(value: Record<string, unknown>, allowedKeys: string[]): boolean {
  const allowed = new Set(allowedKeys);
  return Object.keys(value).every((key) => allowed.has(key));
}

export function isHash(value: unknown): value is string {
  return typeof value === 'string' && HASH_PATTERN.test(value);
}

export function recordString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}
