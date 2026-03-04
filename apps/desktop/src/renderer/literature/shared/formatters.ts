import type { AutoPullRun } from './types';

export function formatNumber(value: number | null): string {
  if (value === null) {
    return '--';
  }

  return value.toLocaleString('en-US');
}

export function formatCurrency(value: number | null): string {
  if (value === null) {
    return '--';
  }

  return `$${value.toFixed(4)}`;
}

export function formatTimestamp(value: string): string {
  if (!value) {
    return '--';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
}

export function formatRunDuration(startedAt: string | null, finishedAt: string | null): string {
  if (!startedAt) {
    return '--';
  }
  const startMs = new Date(startedAt).getTime();
  if (Number.isNaN(startMs)) {
    return '--';
  }
  const endMs = finishedAt ? new Date(finishedAt).getTime() : Date.now();
  if (Number.isNaN(endMs)) {
    return '--';
  }
  const durationMs = Math.max(0, endMs - startMs);
  if (durationMs < 1_000) {
    return `${durationMs}ms`;
  }
  if (durationMs < 60_000) {
    return `${(durationMs / 1_000).toFixed(1)}s`;
  }
  const minutes = Math.floor(durationMs / 60_000);
  const seconds = Math.floor((durationMs % 60_000) / 1_000);
  return `${minutes}m ${seconds}s`;
}

export function resolveRunSortTimestamp(run: AutoPullRun): string {
  return run.finished_at ?? run.started_at ?? run.updated_at ?? run.created_at;
}

export function resolveRunSortTimeMs(run: AutoPullRun): number {
  const timestamp = resolveRunSortTimestamp(run);
  const parsedMs = new Date(timestamp).getTime();
  return Number.isNaN(parsedMs) ? 0 : parsedMs;
}

export function tryGetSnapshotId(summary: string): string | null {
  const matched = summary.match(/SP-\d{4}/);
  return matched ? matched[0] : null;
}
