import {
  APP_MODE_STORAGE_KEY,
  autoPullWeekdayOptions,
} from '../constants';
import type {
  AppMode,
  AutoImportSubTabKey,
  AutoPullWeekday,
  ContentProcessingSubTabKey,
  LiteratureProvider,
  ManualImportSubTabKey,
  QuerySort,
  SortDirection,
} from '../types';

type NavigatorWithUaData = Navigator & {
  userAgentData?: {
    platform?: string;
  };
};

export function detectMacDesktopFromNavigator(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }

  const platform = (navigator as NavigatorWithUaData).userAgentData?.platform
    ?? navigator.platform
    ?? navigator.userAgent
    ?? '';
  return platform.toLowerCase().includes('mac');
}

export function isFlagEnabled(value?: string): boolean {
  if (!value) {
    return false;
  }

  return value === '1' || value.toLowerCase() === 'true';
}

export function readStoredAppMode(): AppMode {
  if (typeof window === 'undefined') {
    return 'standard';
  }
  try {
    const value = window.localStorage.getItem(APP_MODE_STORAGE_KEY);
    return value === 'dev' ? 'dev' : 'standard';
  } catch {
    return 'standard';
  }
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

export function toText(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

export function toTextArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export function toOptionalYear(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value.trim(), 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

export function toOptionalNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function isAutoImportSubTabKey(value: string): value is AutoImportSubTabKey {
  return value === 'topic-settings' || value === 'rule-center' || value === 'runs-alerts';
}

export function isManualImportSubTabKey(value: string): value is ManualImportSubTabKey {
  return value === 'file-review' || value === 'zotero-sync';
}

export function isContentProcessingSubTabKey(value: string): value is ContentProcessingSubTabKey {
  return value === 'operations' || value === 'settings';
}

export function normalizeLiteratureProvider(value: unknown): LiteratureProvider {
  if (
    value === 'crossref'
    || value === 'arxiv'
    || value === 'manual'
    || value === 'web'
    || value === 'zotero'
  ) {
    return value;
  }
  return 'crossref';
}

export function normalizeWeekdayToken(value: string | undefined): AutoPullWeekday {
  const token = (value ?? '').trim().toUpperCase();
  const matched = autoPullWeekdayOptions.find((option) => option.value === token);
  return matched?.value ?? 'MON';
}

export function normalizeQualityPresetValue(input: number): string {
  if (!Number.isFinite(input)) {
    return '70';
  }
  const candidates = [60, 70, 80, 90];
  const nearest = candidates.reduce((best, current) =>
    Math.abs(current - input) < Math.abs(best - input) ? current : best,
  candidates[0] ?? 70);
  return String(nearest);
}

export function resolveSystemTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function hashTopicName(input: string): string {
  let hash = 0x811c9dc5;
  for (const char of Array.from(input)) {
    const codePoint = char.codePointAt(0) ?? 0;
    const bytes = [
      codePoint & 0xff,
      (codePoint >>> 8) & 0xff,
      (codePoint >>> 16) & 0xff,
      (codePoint >>> 24) & 0xff,
    ];
    for (const byte of bytes) {
      hash ^= byte;
      hash = Math.imul(hash, 0x01000193);
    }
  }
  return (hash >>> 0).toString(16).toUpperCase().padStart(8, '0');
}

export function generateTopicIdByName(name: string, existingTopicIds: string[] = []): string {
  const normalizedName = name.normalize('NFKC').trim();
  const hash = hashTopicName(normalizedName || 'topic');
  const baseId = `TOPIC-${hash}`;
  const existingSet = new Set(existingTopicIds.map((item) => item.toUpperCase()));

  if (!existingSet.has(baseId.toUpperCase())) {
    return baseId;
  }

  let suffix = 2;
  while (existingSet.has(`${baseId}-${suffix}`.toUpperCase())) {
    suffix += 1;
  }
  return `${baseId}-${suffix}`;
}

export function normalizeComparableText(value: string): string {
  return value.trim().toLowerCase();
}

export function isPaperNotFoundMessage(message: string): boolean {
  const normalized = message.trim().toLowerCase();
  return normalized.includes('not_found') && normalized.includes('paper') && normalized.includes('not found');
}

export function parseYearFilterInput(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  const currentYear = new Date().getFullYear() + 1;
  return Math.max(1900, Math.min(currentYear, parsed));
}

export function parseQuerySortPreset(value: string): { sort: QuerySort; direction: SortDirection } {
  const [sortToken, directionToken] = value.split('|');
  const sort: QuerySort =
    sortToken === 'importance'
    || sortToken === 'updated_at'
    || sortToken === 'published_at'
    || sortToken === 'title_initial'
      ? sortToken
      : 'importance';
  const direction: SortDirection = directionToken === 'asc' || directionToken === 'desc' ? directionToken : 'desc';
  return { sort, direction };
}
