import type {
  BlockerRef,
  ObjectPointer,
  SourceTraceRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/research-argument-contracts';

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function roundNumber(value: number, fractionDigits = 2): number {
  return Number(value.toFixed(fractionDigits));
}

export function pickLatestByUpdatedAt<T extends { updated_at: string }>(
  items: T[],
): T | undefined {
  return [...items].sort((left, right) => right.updated_at.localeCompare(left.updated_at))[0];
}

export function dedupeStrings(values: string[]): string[] {
  return [...new Set(values)];
}

export function dedupeSourceTraceRefs(values: SourceTraceRef[]): SourceTraceRef[] {
  const seen = new Set<string>();
  const deduped: SourceTraceRef[] = [];
  for (const value of values) {
    const key = `${value.source_kind}:${value.source_id}:${value.locator ?? ''}:${value.note ?? ''}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(value);
  }
  return deduped;
}

export function dedupeObjectPointers(values: ObjectPointer[]): ObjectPointer[] {
  const seen = new Set<string>();
  const deduped: ObjectPointer[] = [];
  for (const value of values) {
    const key = `${value.pointer_kind}:${value.object_id}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(value);
  }
  return deduped;
}

export function dedupeBlockers(values: BlockerRef[]): BlockerRef[] {
  const seen = new Set<string>();
  const deduped: BlockerRef[] = [];
  for (const value of values) {
    if (seen.has(value.blocker_id)) {
      continue;
    }
    seen.add(value.blocker_id);
    deduped.push(value);
  }
  return deduped;
}
