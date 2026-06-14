// T-123 Phase 5.1 (F-11) — pure dedup utilities relocated VERBATIM from the v1b workflow harness
// service (D-T123-03 mechanical split). No instance state, no `this`; byte-identical to the former
// private methods, so every call site (`this.uniqueRefs(...)` -> `uniqueRefs(...)`) is behavior- and
// hash-preserving (guarded by the harness replay-identity test).

import type {
  TopicSelectionFunctionalRef,
  TopicSelectionGateIssue,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

/** De-dup functional refs by (ref_type, ref_id, version_id, title_card_id); skips null/undefined. */
export function uniqueRefs(
  refs: Array<TopicSelectionFunctionalRef | null | undefined>,
): TopicSelectionFunctionalRef[] {
  const seen = new Set<string>();
  const result: TopicSelectionFunctionalRef[] = [];
  for (const ref of refs) {
    if (!ref) {
      continue;
    }
    const key = [
      ref.ref_type,
      ref.ref_id,
      ref.version_id ?? '',
      ref.title_card_id ?? '',
    ].join(':');
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(ref);
  }
  return result;
}

export function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

/** De-dup gate issues by `code` (first occurrence wins). */
export function uniqueIssues(values: TopicSelectionGateIssue[]): TopicSelectionGateIssue[] {
  const seen = new Set<string>();
  const result: TopicSelectionGateIssue[] = [];
  for (const value of values) {
    if (seen.has(value.code)) {
      continue;
    }
    seen.add(value.code);
    result.push(value);
  }
  return result;
}
