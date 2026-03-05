import {
  convertImportItemsToDraftRows,
  validateManualDraftRows,
} from '../manual-import-utils';
import type {
  ManualDraftRow,
  ManualImportPayload,
  ManualRowValidation,
} from '../manual-import-types';
import {
  APP_MODE_STORAGE_KEY,
  autoPullWeekdayOptions,
  citationStatusOptions,
} from './constants';
import type {
  AppMode,
  AutoImportSubTabKey,
  AutoPullRule,
  AutoPullRun,
  AutoPullRunStatus,
  AutoPullSource,
  AutoPullTopicProfile,
  AutoPullWeekday,
  CitationStatus,
  LiteratureOverviewData,
  LiteratureOverviewItem,
  LiteratureOverviewStatus,
  LiteratureOverviewSummary,
  LiteratureProvider,
  ManualImportSubTabKey,
  ManualUploadFileItem,
  OverviewContentStatus,
  OverviewScopeFilterInput,
  PaperLiteratureItem,
  QuerySort,
  ReleaseGateResponse,
  RuntimeMetric,
  ScopeStatus,
  SortDirection,
  PipelineActionSet,
  PipelineStageStatusMap,
  TimelineEvent,
  TopicScopeItem,
  ArtifactBundle,
} from './types';

export function detectMacDesktopFromNavigator(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }

  const navWithUaData = navigator as Navigator & {
    userAgentData?: {
      platform?: string;
    };
  };
  const platform = navWithUaData.userAgentData?.platform ?? navigator.platform ?? navigator.userAgent ?? '';
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

export function normalizeManualDedupDoi(value: string): string | null {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/doi\.org\//, '')
    .replace(/^doi:/, '')
    .trim();
  return normalized.length > 0 ? normalized : null;
}

export function normalizeManualDedupArxivId(value: string): string | null {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/arxiv\.org\/abs\//, '')
    .replace(/^arxiv:/, '')
    .trim()
    .replace(/v\d+$/, '');
  return normalized.length > 0 ? normalized : null;
}

export function normalizeManualDedupToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseManualDedupAuthors(value: string): string[] {
  return value
    .split(/\s+and\s+|,|;/i)
    .map((author) => normalizeManualDedupToken(author))
    .filter((author) => author.length > 0)
    .sort();
}

export function buildManualDraftRowDedupKey(row: ManualDraftRow): string | null {
  const doi = normalizeManualDedupDoi(row.doi);
  if (doi) {
    return `doi:${doi}`;
  }

  const arxivId = normalizeManualDedupArxivId(row.arxiv_id);
  if (arxivId) {
    return `arxiv:${arxivId}`;
  }

  const year = Number.parseInt(row.year_text.trim(), 10);
  if (!Number.isFinite(year)) {
    return null;
  }

  const normalizedTitle = normalizeManualDedupToken(row.title);
  const normalizedAuthors = parseManualDedupAuthors(row.authors_text);
  if (!normalizedTitle || normalizedAuthors.length === 0) {
    return null;
  }

  return `tay:${normalizedTitle}|${normalizedAuthors.join('|')}|${year}`;
}

export function mergeManualDraftRows(existingRows: ManualDraftRow[], incomingRows: ManualDraftRow[]) {
  const rows = [...existingRows];
  const seenKeys = new Set<string>();

  for (const row of existingRows) {
    const key = buildManualDraftRowDedupKey(row);
    if (key) {
      seenKeys.add(key);
    }
  }

  let skippedDuplicates = 0;
  let appendedCount = 0;

  for (const row of incomingRows) {
    const key = buildManualDraftRowDedupKey(row);
    if (key && seenKeys.has(key)) {
      skippedDuplicates += 1;
      continue;
    }
    if (key) {
      seenKeys.add(key);
    }
    rows.push(row);
    appendedCount += 1;
  }

  return {
    rows,
    appendedCount,
    skippedDuplicates,
  };
}

export type ManualFieldErrorKey =
  | 'title'
  | 'authors_text'
  | 'year_text'
  | 'doi'
  | 'arxiv_id'
  | 'source_url'
  | 'tags_text';

export type ManualFieldErrorMap = Partial<Record<ManualFieldErrorKey, string[]>>;

export function pushManualFieldError(map: ManualFieldErrorMap, key: ManualFieldErrorKey, message: string): void {
  const bucket = map[key] ?? [];
  if (!bucket.includes(message)) {
    bucket.push(message);
  }
  map[key] = bucket;
}

export function mapManualValidationErrors(validation?: ManualRowValidation): ManualFieldErrorMap {
  const map: ManualFieldErrorMap = {};
  if (!validation || validation.is_valid) {
    return map;
  }

  for (const message of validation.errors) {
    if (message.includes('标题')) {
      pushManualFieldError(map, 'title', message);
    }
    if (message.includes('作者')) {
      pushManualFieldError(map, 'authors_text', message);
    }
    if (message.includes('年份')) {
      pushManualFieldError(map, 'year_text', message);
    }
    if (message.includes('需要 DOI / arXiv ID / 来源链接 其中之一')) {
      pushManualFieldError(map, 'doi', message);
      pushManualFieldError(map, 'arxiv_id', message);
      pushManualFieldError(map, 'source_url', message);
    }
    if (message.includes('来源链接')) {
      pushManualFieldError(map, 'source_url', message);
    }
  }

  return map;
}

export function getManualFieldErrorText(map: ManualFieldErrorMap, key: ManualFieldErrorKey): string {
  return (map[key] ?? []).join('；');
}

export function parseZoteroPreviewItems(payload: unknown): ManualImportPayload[] {
  const root = asRecord(payload);
  const items = Array.isArray(root?.items) ? root.items : [];
  const parsedItems: ManualImportPayload[] = [];
  items.forEach((item, index) => {
    const record = asRecord(item);
    if (!record) {
      return;
    }
    const title = toText(record.title)?.trim() ?? '';
    if (!title) {
      return;
    }
    const provider = normalizeLiteratureProvider(record.provider);
    const normalizedProvider = provider === 'zotero' ? 'zotero' : 'manual';
    const sourceUrl = toText(record.source_url)?.trim() ?? '';
    const externalIdFromPayload = toText(record.external_id)?.trim() ?? '';
    const externalId = externalIdFromPayload || sourceUrl || `zotero-preview-${index + 1}`;
    if (!externalId) {
      return;
    }

    parsedItems.push({
      provider: normalizedProvider,
      external_id: externalId,
      title,
      abstract: toText(record.abstract)?.trim() ?? undefined,
      authors: toTextArray(record.authors),
      year: toOptionalYear(record.year),
      doi: toText(record.doi)?.trim() || undefined,
      arxiv_id: toText(record.arxiv_id)?.trim() || undefined,
      source_url: sourceUrl,
      tags: toTextArray(record.tags),
    });
  });

  return parsedItems;
}

export function computeZoteroPreviewResult(
  payload: unknown,
  existingRows: ManualDraftRow[],
): {
  rows: ManualDraftRow[];
  fetchedCount: number;
  duplicateCount: number;
  unparsedCount: number;
  importableCount: number;
} {
  const root = asRecord(payload);
  const fetchedCountRaw = typeof root?.fetched_count === 'number'
    ? root.fetched_count
    : Array.isArray(root?.items)
      ? root.items.length
      : 0;
  const fetchedCount = Number.isFinite(fetchedCountRaw) ? Math.max(0, Math.trunc(fetchedCountRaw)) : 0;
  const previewItems = parseZoteroPreviewItems(payload);
  const rows = convertImportItemsToDraftRows(previewItems);
  const merged = mergeManualDraftRows(existingRows, rows);
  const appendedRows = merged.rows.slice(existingRows.length);
  const importableCount = validateManualDraftRows(appendedRows).filter((item) => item.is_valid).length;

  return {
    rows,
    fetchedCount,
    duplicateCount: merged.skippedDuplicates,
    unparsedCount: Math.max(0, fetchedCount - previewItems.length),
    importableCount,
  };
}

export function isAutoImportSubTabKey(value: string): value is AutoImportSubTabKey {
  return value === 'topic-settings' || value === 'runs-alerts';
}

export function isManualImportSubTabKey(value: string): value is ManualImportSubTabKey {
  return value === 'file-review' || value === 'zotero-sync';
}

export function toOptionalNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function normalizeLiteratureProvider(value: unknown): LiteratureProvider {
  if (
    value === 'crossref' ||
    value === 'arxiv' ||
    value === 'manual' ||
    value === 'web' ||
    value === 'zotero'
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

export function normalizeScheduleHourValue(hourInput: string): string {
  const hour = Number.parseInt(hourInput.trim(), 10);
  const normalizedHour = Number.isFinite(hour) ? Math.max(0, Math.min(23, hour)) : 9;
  return String(normalizedHour);
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

export function normalizeTimelinePayload(payload: unknown): TimelineEvent[] {
  const root = asRecord(payload);
  if (!root) {
    return [];
  }

  const eventsRaw = root.events;
  if (!Array.isArray(eventsRaw)) {
    return [];
  }

  const events = eventsRaw
    .map((item): TimelineEvent | null => {
      const row = asRecord(item);
      if (!row) {
        return null;
      }

      const eventId = toText(row.event_id);
      const eventType = toText(row.event_type);
      const timestamp = toText(row.timestamp);
      const summary = toText(row.summary);
      if (!eventId || !eventType || !timestamp || !summary) {
        return null;
      }

      const severity = toText(row.severity);
      const normalizedSeverity: TimelineEvent['severity'] =
        severity === 'warning' || severity === 'error' || severity === 'info' ? severity : undefined;

      return {
        event_id: eventId,
        event_type: eventType,
        module_id: toText(row.module_id),
        timestamp,
        node_id: toText(row.node_id),
        summary,
        severity: normalizedSeverity,
      };
    })
    .filter((item): item is TimelineEvent => item !== null);

  return events;
}

export function normalizeMetricPayload(payload: unknown): RuntimeMetric | null {
  const root = asRecord(payload);
  const metric = root ? asRecord(root.paper_runtime_metric) : null;
  if (!metric) {
    return null;
  }

  const updatedAt = toText(metric.updated_at);
  if (!updatedAt) {
    return null;
  }

  return {
    tokens: toOptionalNumber(metric.tokens),
    cost_usd: toOptionalNumber(metric.cost_usd),
    gpu_requested: toOptionalNumber(metric.gpu_requested),
    gpu_total: toOptionalNumber(metric.gpu_total),
    updated_at: updatedAt,
  };
}

export function normalizeArtifactPayload(payload: unknown): ArtifactBundle | null {
  const root = asRecord(payload);
  const bundle = root ? asRecord(root.artifact_bundle) : null;
  if (!bundle) {
    return null;
  }

  return {
    proposal_url: toText(bundle.proposal_url) ?? null,
    paper_url: toText(bundle.paper_url) ?? null,
    repo_url: toText(bundle.repo_url) ?? null,
    review_url: toText(bundle.review_url) ?? null,
  };
}

export function normalizeReleasePayload(payload: unknown): ReleaseGateResponse | null {
  const root = asRecord(payload);
  const gateResult = root ? asRecord(root.gate_result) : null;
  if (!gateResult) {
    return null;
  }

  const reviewId = toText(gateResult.review_id);
  const auditRef = toText(gateResult.audit_ref);
  const accepted = gateResult.accepted;
  if (!reviewId || !auditRef || typeof accepted !== 'boolean') {
    return null;
  }

  return {
    gate_result: {
      accepted,
      review_id: reviewId,
      approved_by: toText(gateResult.approved_by),
      approved_at: toText(gateResult.approved_at),
      audit_ref: auditRef,
    },
  };
}

export function normalizeTopicProfilePayload(payload: unknown): AutoPullTopicProfile[] {
  const root = asRecord(payload);
  const itemsRaw = root?.items;
  if (!Array.isArray(itemsRaw)) {
    return [];
  }

  return itemsRaw
    .map((item): AutoPullTopicProfile | null => {
      const row = asRecord(item);
      if (!row) {
        return null;
      }

      const topicId = toText(row.topic_id);
      const name = toText(row.name);
      const createdAt = toText(row.created_at);
      const updatedAt = toText(row.updated_at);
      if (!topicId || !name || !createdAt || !updatedAt) {
        return null;
      }

      return {
        topic_id: topicId,
        name,
        is_active: row.is_active !== false,
        include_keywords: Array.isArray(row.include_keywords)
          ? row.include_keywords.filter((value): value is string => typeof value === 'string')
          : [],
        exclude_keywords: Array.isArray(row.exclude_keywords)
          ? row.exclude_keywords.filter((value): value is string => typeof value === 'string')
          : [],
        venue_filters: Array.isArray(row.venue_filters)
          ? row.venue_filters.filter((value): value is string => typeof value === 'string')
          : [],
        default_lookback_days:
          typeof row.default_lookback_days === 'number' ? row.default_lookback_days : 30,
        default_min_year: typeof row.default_min_year === 'number' ? row.default_min_year : null,
        default_max_year: typeof row.default_max_year === 'number' ? row.default_max_year : null,
        rule_ids: Array.isArray(row.rule_ids)
          ? row.rule_ids.filter((value): value is string => typeof value === 'string')
          : [],
        created_at: createdAt,
        updated_at: updatedAt,
      };
    })
    .filter((item): item is AutoPullTopicProfile => item !== null);
}

export function normalizeAutoPullRulePayload(payload: unknown): AutoPullRule[] {
  const root = asRecord(payload);
  const itemsRaw = root?.items;
  if (!Array.isArray(itemsRaw)) {
    return [];
  }

  return itemsRaw
    .map((item): AutoPullRule | null => {
      const row = asRecord(item);
      if (!row) {
        return null;
      }

      const ruleId = toText(row.rule_id);
      const scope = toText(row.scope);
      const name = toText(row.name);
      const status = toText(row.status);
      const querySpec = asRecord(row.query_spec);
      const timeSpec = asRecord(row.time_spec);
      const qualitySpec = asRecord(row.quality_spec);
      const createdAt = toText(row.created_at);
      const updatedAt = toText(row.updated_at);
      if (
        !ruleId ||
        !scope ||
        !name ||
        !status ||
        !querySpec ||
        !timeSpec ||
        !qualitySpec ||
        !createdAt ||
        !updatedAt
      ) {
        return null;
      }

      return {
        rule_id: ruleId,
        scope: scope === 'TOPIC' ? 'TOPIC' : 'GLOBAL',
        topic_id: toText(row.topic_id) ?? null,
        topic_ids: Array.isArray(row.topic_ids)
          ? row.topic_ids.filter((value): value is string => typeof value === 'string')
          : (toText(row.topic_id) ? [toText(row.topic_id) as string] : []),
        name,
        status: status === 'PAUSED' ? 'PAUSED' : 'ACTIVE',
        query_spec: {
          include_keywords: Array.isArray(querySpec.include_keywords)
            ? querySpec.include_keywords.filter((value): value is string => typeof value === 'string')
            : [],
          exclude_keywords: Array.isArray(querySpec.exclude_keywords)
            ? querySpec.exclude_keywords.filter((value): value is string => typeof value === 'string')
            : [],
          authors: Array.isArray(querySpec.authors)
            ? querySpec.authors.filter((value): value is string => typeof value === 'string')
            : [],
          venues: Array.isArray(querySpec.venues)
            ? querySpec.venues.filter((value): value is string => typeof value === 'string')
            : [],
          max_results_per_source:
            typeof querySpec.max_results_per_source === 'number'
              ? querySpec.max_results_per_source
              : 20,
        },
        time_spec: {
          lookback_days: typeof timeSpec.lookback_days === 'number' ? timeSpec.lookback_days : 30,
          min_year: typeof timeSpec.min_year === 'number' ? timeSpec.min_year : null,
          max_year: typeof timeSpec.max_year === 'number' ? timeSpec.max_year : null,
        },
        quality_spec: {
          min_quality_score:
            typeof qualitySpec.min_quality_score === 'number'
              ? qualitySpec.min_quality_score
              : 70,
        },
        sources: Array.isArray(row.sources)
          ? row.sources
              .map((entry) => asRecord(entry))
              .filter((entry): entry is Record<string, unknown> => entry !== null)
              .map((entry) => ({
                source: toText(entry.source) as AutoPullSource,
                enabled: entry.enabled !== false,
                priority: typeof entry.priority === 'number' ? entry.priority : 100,
                config: asRecord(entry.config) ?? {},
              }))
              .filter((entry) =>
                entry.source === 'CROSSREF' || entry.source === 'ARXIV' || entry.source === 'ZOTERO',
              )
          : [],
        schedules: Array.isArray(row.schedules)
          ? row.schedules
              .map((entry) => asRecord(entry))
              .filter((entry): entry is Record<string, unknown> => entry !== null)
              .map((entry) => ({
                frequency: toText(entry.frequency) === 'WEEKLY' ? 'WEEKLY' : 'DAILY',
                days_of_week: Array.isArray(entry.days_of_week)
                  ? entry.days_of_week.filter((value): value is string => typeof value === 'string')
                  : [],
                hour: typeof entry.hour === 'number' ? entry.hour : 9,
                minute: typeof entry.minute === 'number' ? entry.minute : 0,
                timezone: toText(entry.timezone) ?? 'UTC',
                active: entry.active !== false,
              }))
          : [],
        created_at: createdAt,
        updated_at: updatedAt,
      };
    })
    .filter((item): item is AutoPullRule => item !== null);
}

export function normalizeAutoPullRunsPayload(payload: unknown): AutoPullRun[] {
  const root = asRecord(payload);
  const itemsRaw = root?.items;
  if (!Array.isArray(itemsRaw)) {
    return [];
  }

  return itemsRaw
    .map((item) => normalizeAutoPullRun(item))
    .filter((item): item is AutoPullRun => item !== null);
}

export function normalizeAutoPullRun(payload: unknown): AutoPullRun | null {
  const row = asRecord(payload);
  if (!row) {
    return null;
  }

  const runId = toText(row.run_id);
  const ruleId = toText(row.rule_id);
  const triggerType = toText(row.trigger_type);
  const status = toText(row.status);
  const createdAt = toText(row.created_at);
  const updatedAt = toText(row.updated_at);
  if (!runId || !ruleId || !triggerType || !status || !createdAt || !updatedAt) {
    return null;
  }

  const attempts = Array.isArray(row.source_attempts)
    ? row.source_attempts
        .map((entry) => asRecord(entry))
        .filter((entry): entry is Record<string, unknown> => entry !== null)
        .map((entry) => ({
          source: toText(entry.source) as AutoPullSource,
          status: toText(entry.status) as AutoPullRunStatus,
          fetched_count: typeof entry.fetched_count === 'number' ? entry.fetched_count : 0,
          imported_count: typeof entry.imported_count === 'number' ? entry.imported_count : 0,
          failed_count: typeof entry.failed_count === 'number' ? entry.failed_count : 0,
          error_code: toText(entry.error_code) ?? null,
          error_message: toText(entry.error_message) ?? null,
          started_at: toText(entry.started_at) ?? null,
          finished_at: toText(entry.finished_at) ?? null,
          meta: asRecord(entry.meta) ?? {},
        }))
        .filter((entry) =>
          entry.source === 'CROSSREF' || entry.source === 'ARXIV' || entry.source === 'ZOTERO',
        )
    : undefined;

  const suggestions = Array.isArray(row.suggestions)
    ? row.suggestions
        .map((entry) => asRecord(entry))
        .filter((entry): entry is Record<string, unknown> => entry !== null)
        .map((entry) => ({
          suggestion_id: toText(entry.suggestion_id) ?? '',
          literature_id: toText(entry.literature_id) ?? '',
          topic_id: toText(entry.topic_id) ?? null,
          suggested_scope: (toText(entry.suggested_scope) === 'excluded' ? 'excluded' : 'in_scope') as ScopeStatus,
          reason: toText(entry.reason) ?? '',
          score: typeof entry.score === 'number' ? entry.score : 0,
          created_at: toText(entry.created_at) ?? '',
        }))
        .filter((entry) => entry.suggestion_id && entry.literature_id)
    : undefined;

  return {
    run_id: runId,
    rule_id: ruleId,
    trigger_type: triggerType === 'SCHEDULE' ? 'SCHEDULE' : 'MANUAL',
    status:
      status === 'RUNNING' ||
      status === 'PARTIAL' ||
      status === 'SUCCESS' ||
      status === 'FAILED' ||
      status === 'SKIPPED'
        ? status
        : 'PENDING',
    started_at: toText(row.started_at) ?? null,
    finished_at: toText(row.finished_at) ?? null,
    summary: asRecord(row.summary) ?? {},
    error_code: toText(row.error_code) ?? null,
    error_message: toText(row.error_message) ?? null,
    created_at: createdAt,
    updated_at: updatedAt,
    source_attempts: attempts,
    suggestions,
  };
}

export function normalizeTopicScopePayload(payload: unknown): TopicScopeItem[] {
  const root = asRecord(payload);
  const itemsRaw = root?.items;
  if (!Array.isArray(itemsRaw)) {
    return [];
  }

  return itemsRaw
    .map((item): TopicScopeItem | null => {
      const row = asRecord(item);
      if (!row) {
        return null;
      }

      const scopeId = toText(row.scope_id);
      const topicId = toText(row.topic_id);
      const literatureId = toText(row.literature_id);
      const scopeStatus = toText(row.scope_status);
      const updatedAt = toText(row.updated_at);
      const title = toText(row.title);
      if (!scopeId || !topicId || !literatureId || !scopeStatus || !updatedAt || !title) {
        return null;
      }

      return {
        scope_id: scopeId,
        topic_id: topicId,
        literature_id: literatureId,
        scope_status: scopeStatus === 'excluded' ? 'excluded' : 'in_scope',
        reason: toText(row.reason),
        updated_at: updatedAt,
        title,
        authors: Array.isArray(row.authors)
          ? row.authors.filter((author): author is string => typeof author === 'string')
          : [],
        year: typeof row.year === 'number' ? row.year : null,
        doi: toText(row.doi) ?? null,
        arxiv_id: toText(row.arxiv_id) ?? null,
      };
    })
    .filter((row): row is TopicScopeItem => row !== null);
}

export function normalizePaperLiteraturePayload(payload: unknown): PaperLiteratureItem[] {
  const root = asRecord(payload);
  const itemsRaw = root?.items;
  if (!Array.isArray(itemsRaw)) {
    return [];
  }

  return itemsRaw
    .map((item): PaperLiteratureItem | null => {
      const row = asRecord(item);
      if (!row) {
        return null;
      }

      const linkId = toText(row.link_id);
      const paperId = toText(row.paper_id);
      const literatureId = toText(row.literature_id);
      const citationStatus = toText(row.citation_status);
      const createdAt = toText(row.created_at);
      const updatedAt = toText(row.updated_at);
      const title = toText(row.title);
      if (
        !linkId ||
        !paperId ||
        !literatureId ||
        !citationStatus ||
        !createdAt ||
        !updatedAt ||
        !title
      ) {
        return null;
      }

      const normalizedCitationStatus = citationStatusOptions.includes(citationStatus as CitationStatus)
        ? (citationStatus as CitationStatus)
        : 'seeded';

      return {
        link_id: linkId,
        paper_id: paperId,
        topic_id: toText(row.topic_id) ?? null,
        literature_id: literatureId,
        citation_status: normalizedCitationStatus,
        note: toText(row.note) ?? null,
        created_at: createdAt,
        updated_at: updatedAt,
        title,
        authors: Array.isArray(row.authors)
          ? row.authors.filter((author): author is string => typeof author === 'string')
          : [],
        year: typeof row.year === 'number' ? row.year : null,
        doi: toText(row.doi) ?? null,
        arxiv_id: toText(row.arxiv_id) ?? null,
        source_provider: toText(row.source_provider) ?? null,
        source_url: toText(row.source_url) ?? null,
        tags: Array.isArray(row.tags)
          ? row.tags.filter((tag): tag is string => typeof tag === 'string')
          : [],
      };
    })
    .filter((row): row is PaperLiteratureItem => row !== null);
}

export function normalizeLiteratureOverviewPayload(payload: unknown): LiteratureOverviewData | null {
  const root = asRecord(payload);
  if (!root) {
    return null;
  }

  const summary = asRecord(root.summary);
  const itemsRaw = root.items;
  if (!summary || !Array.isArray(itemsRaw)) {
    return null;
  }

  const normalizedSummary: LiteratureOverviewSummary = {
    total_literatures: typeof summary.total_literatures === 'number' ? summary.total_literatures : 0,
    topic_scope_total: typeof summary.topic_scope_total === 'number' ? summary.topic_scope_total : 0,
    in_scope_count: typeof summary.in_scope_count === 'number' ? summary.in_scope_count : 0,
    excluded_count: typeof summary.excluded_count === 'number' ? summary.excluded_count : 0,
    paper_link_total: typeof summary.paper_link_total === 'number' ? summary.paper_link_total : 0,
    cited_count: typeof summary.cited_count === 'number' ? summary.cited_count : 0,
    used_count: typeof summary.used_count === 'number' ? summary.used_count : 0,
    provider_counts: Array.isArray(summary.provider_counts)
      ? summary.provider_counts
          .map((item) => asRecord(item))
          .filter((item): item is Record<string, unknown> => item !== null)
          .map((item) => ({
            provider: normalizeLiteratureProvider(toText(item.provider)),
            count: typeof item.count === 'number' ? item.count : 0,
          }))
      : [],
    top_tags: Array.isArray(summary.top_tags)
      ? summary.top_tags
          .map((item) => asRecord(item))
          .filter((item): item is Record<string, unknown> => item !== null)
          .map((item) => ({
            tag: toText(item.tag) ?? '',
            count: typeof item.count === 'number' ? item.count : 0,
          }))
          .filter((item) => item.tag.length > 0)
      : [],
  };

  const items = itemsRaw
    .map((item): LiteratureOverviewItem | null => {
      const row = asRecord(item);
      if (!row) {
        return null;
      }

      const literatureId = toText(row.literature_id);
      const title = toText(row.title);
      if (!literatureId || !title) {
        return null;
      }

      const topicScopeStatus = toText(row.topic_scope_status);
      const citationStatus = toText(row.citation_status);
      const pipelineStateRoot = asRecord(row.pipeline_state);
      const citationComplete = typeof pipelineStateRoot?.citation_complete === 'boolean'
        ? pipelineStateRoot.citation_complete
        : false;
      const abstractReady = typeof pipelineStateRoot?.abstract_ready === 'boolean'
        ? pipelineStateRoot.abstract_ready
        : false;
      const keyContentReady = typeof pipelineStateRoot?.key_content_ready === 'boolean'
        ? pipelineStateRoot.key_content_ready
        : false;
      const fulltextPreprocessed = typeof pipelineStateRoot?.fulltext_preprocessed === 'boolean'
        ? pipelineStateRoot.fulltext_preprocessed
        : false;
      const chunked = typeof pipelineStateRoot?.chunked === 'boolean'
        ? pipelineStateRoot.chunked
        : false;
      const embedded = typeof pipelineStateRoot?.embedded === 'boolean'
        ? pipelineStateRoot.embedded
        : false;
      const indexed = typeof pipelineStateRoot?.indexed === 'boolean'
        ? pipelineStateRoot.indexed
        : false;
      const pipelineStageStatus = normalizePipelineStageStatusMap(asRecord(row.pipeline_stage_status));
      const pipelineActions = normalizePipelineActions(asRecord(row.pipeline_actions));
      const overviewStatusRaw = toText(row.overview_status);
      const overviewStatus = normalizeOverviewStatus(overviewStatusRaw)
        ?? deriveOverviewStatusFromSignals({
          topic_scope_status: topicScopeStatus === 'excluded' ? 'excluded' : topicScopeStatus === 'in_scope' ? 'in_scope' : undefined,
          citation_complete: citationComplete,
          abstract_ready: abstractReady,
          key_content_ready: keyContentReady,
        });

      return {
        literature_id: literatureId,
        title,
        authors: Array.isArray(row.authors)
          ? row.authors.filter((author): author is string => typeof author === 'string')
          : [],
        year: typeof row.year === 'number' ? row.year : null,
        doi: toText(row.doi) ?? null,
        arxiv_id: toText(row.arxiv_id) ?? null,
        tags: Array.isArray(row.tags) ? row.tags.filter((tag): tag is string => typeof tag === 'string') : [],
        providers: Array.isArray(row.providers)
          ? row.providers
              .map((provider) => normalizeLiteratureProvider(provider))
              .filter((provider, index, array) => array.indexOf(provider) === index)
          : [],
        source_url: toText(row.source_url) ?? null,
        source_updated_at: toText(row.source_updated_at) ?? null,
        topic_scope_status: topicScopeStatus === 'excluded' ? 'excluded' : topicScopeStatus === 'in_scope' ? 'in_scope' : undefined,
        citation_status:
          citationStatus && citationStatusOptions.includes(citationStatus as CitationStatus)
            ? (citationStatus as CitationStatus)
            : undefined,
        overview_status: overviewStatus,
        pipeline_state: {
          citation_complete: citationComplete,
          abstract_ready: abstractReady,
          key_content_ready: keyContentReady,
          fulltext_preprocessed: fulltextPreprocessed,
          chunked,
          embedded,
          indexed,
        },
        pipeline_stage_status: pipelineStageStatus,
        pipeline_actions: pipelineActions,
      };
    })
    .filter((item): item is LiteratureOverviewItem => item !== null);

  return {
    topic_id: toText(root.topic_id),
    paper_id: toText(root.paper_id),
    summary: normalizedSummary,
    items,
  };
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

export function normalizeOverviewStatus(value: string | null | undefined): LiteratureOverviewStatus | null {
  if (value === 'automation_ready' || value === 'citable' || value === 'not_citable' || value === 'excluded') {
    return value;
  }
  return null;
}

export function deriveOverviewStatusFromSignals(input: {
  topic_scope_status?: ScopeStatus;
  citation_complete: boolean;
  abstract_ready: boolean;
  key_content_ready: boolean;
}): LiteratureOverviewStatus {
  if (input.topic_scope_status === 'excluded') {
    return 'excluded';
  }
  if (input.abstract_ready && input.key_content_ready) {
    return 'automation_ready';
  }
  if (input.citation_complete) {
    return 'citable';
  }
  return 'not_citable';
}

function normalizePipelineStageStatusMap(
  root: Record<string, unknown> | null,
): PipelineStageStatusMap {
  return {
    CITATION_NORMALIZED: readPipelineStageStatus(root?.CITATION_NORMALIZED),
    ABSTRACT_READY: readPipelineStageStatus(root?.ABSTRACT_READY),
    KEY_CONTENT_READY: readPipelineStageStatus(root?.KEY_CONTENT_READY),
    FULLTEXT_PREPROCESSED: readPipelineStageStatus(root?.FULLTEXT_PREPROCESSED),
    CHUNKED: readPipelineStageStatus(root?.CHUNKED),
    EMBEDDED: readPipelineStageStatus(root?.EMBEDDED),
    INDEXED: readPipelineStageStatus(root?.INDEXED),
  };
}

function readPipelineStageStatus(value: unknown): PipelineStageStatusMap['CITATION_NORMALIZED'] {
  return value === 'NOT_STARTED'
    || value === 'PENDING'
    || value === 'RUNNING'
    || value === 'SUCCEEDED'
    || value === 'FAILED'
    || value === 'BLOCKED'
    || value === 'SKIPPED'
    ? value
    : 'NOT_STARTED';
}

function normalizePipelineActions(root: Record<string, unknown> | null): PipelineActionSet {
  return {
    extract_abstract: normalizePipelineActionItem(root?.extract_abstract, 'EXTRACT_ABSTRACT', ['ABSTRACT_READY']),
    preprocess_fulltext: normalizePipelineActionItem(
      root?.preprocess_fulltext,
      'PREPROCESS_FULLTEXT',
      ['FULLTEXT_PREPROCESSED'],
    ),
    vectorize: normalizePipelineActionItem(root?.vectorize, 'VECTORIZE', ['CHUNKED', 'EMBEDDED', 'INDEXED']),
  };
}

function normalizePipelineActionItem(
  value: unknown,
  fallbackCode: PipelineActionSet['extract_abstract']['action_code'],
  fallbackStages: PipelineActionSet['extract_abstract']['requested_stages'],
): PipelineActionSet['extract_abstract'] {
  const row = asRecord(value);
  const actionCode = toText(row?.action_code);
  const reasonCode = toText(row?.reason_code);
  const reasonMessage = toText(row?.reason_message) ?? null;
  const requestedStages = Array.isArray(row?.requested_stages)
    ? row.requested_stages
        .map((item) => toText(item))
        .filter((item): item is PipelineActionSet['extract_abstract']['requested_stages'][number] =>
          item === 'CITATION_NORMALIZED'
          || item === 'ABSTRACT_READY'
          || item === 'KEY_CONTENT_READY'
          || item === 'FULLTEXT_PREPROCESSED'
          || item === 'CHUNKED'
          || item === 'EMBEDDED'
          || item === 'INDEXED')
    : fallbackStages;

  return {
    action_code:
      actionCode === 'EXTRACT_ABSTRACT' || actionCode === 'PREPROCESS_FULLTEXT' || actionCode === 'VECTORIZE'
        ? actionCode
        : fallbackCode,
    enabled: typeof row?.enabled === 'boolean' ? row.enabled : true,
    reason_code:
      reasonCode === 'READY'
      || reasonCode === 'EXCLUDED_BY_SCOPE'
      || reasonCode === 'RIGHTS_RESTRICTED'
      || reasonCode === 'USER_AUTH_DISABLED'
      || reasonCode === 'PREREQUISITE_NOT_READY'
      || reasonCode === 'STAGE_ALREADY_READY'
      || reasonCode === 'RUN_IN_FLIGHT'
        ? reasonCode
        : null,
    reason_message: reasonMessage,
    requested_stages: requestedStages.length > 0 ? requestedStages : fallbackStages,
  };
}

export function isOverviewExcluded(item: LiteratureOverviewItem): boolean {
  return item.overview_status === 'excluded';
}

export function isOverviewAutomationReady(item: LiteratureOverviewItem): boolean {
  return item.overview_status === 'automation_ready';
}

export function isOverviewCitable(item: LiteratureOverviewItem): boolean {
  return item.overview_status === 'citable';
}

export function resolveLiteratureOverviewStatus(item: LiteratureOverviewItem): LiteratureOverviewStatus {
  return item.overview_status;
}

export function formatLiteratureOverviewStatus(status: LiteratureOverviewStatus): string {
  if (status === 'automation_ready') {
    return '自动化就绪';
  }
  if (status === 'citable') {
    return '可被引用';
  }
  if (status === 'excluded') {
    return '已排除';
  }
  return '不可引用';
}

export function formatOverviewContentStatus(status: OverviewContentStatus): string {
  if (status === 'abstract_ready') {
    return '摘要就绪';
  }
  if (status === 'key_content_ready') {
    return '关键内容就绪';
  }
  return '未就绪';
}

export function resolveOverviewContentStatus(item: LiteratureOverviewItem): OverviewContentStatus {
  if (item.pipeline_state.key_content_ready) {
    return 'key_content_ready';
  }
  if (item.pipeline_state.abstract_ready) {
    return 'abstract_ready';
  }
  return 'not_ready';
}

export function resolveOverviewPublicationLabel(item: LiteratureOverviewItem): string {
  const providers = new Set(item.providers);
  if (providers.has('crossref')) {
    return '已发表/已收录';
  }
  if (providers.has('arxiv')) {
    return '预印本';
  }
  return '--';
}

export function parseCitationCountFromTags(tags: string[]): number | null {
  for (const tag of tags) {
    const matched = tag.match(/(?:cite|cites|citation|citations|引用|引用量)[\s:_=-]*(\d+)/i);
    if (!matched) {
      continue;
    }
    const parsed = Number.parseInt(matched[1] ?? '', 10);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed;
    }
  }
  return null;
}

export function getLiteratureImportanceScore(item: LiteratureOverviewItem): number {
  let score = 0;
  if (item.citation_status === 'cited') {
    score += 50;
  } else if (item.citation_status === 'used') {
    score += 40;
  } else if (item.citation_status === 'selected') {
    score += 30;
  } else if (item.citation_status === 'seeded') {
    score += 20;
  } else if (item.citation_status === 'dropped') {
    score += 5;
  }

  if (item.topic_scope_status === 'in_scope') {
    score += 20;
  } else if (item.topic_scope_status === 'excluded') {
    score -= 20;
  }

  if (typeof item.year === 'number') {
    score += Math.max(0, Math.min(20, item.year - 2005));
  }

  if (item.source_updated_at) {
    const deltaMs = Date.now() - new Date(item.source_updated_at).getTime();
    const deltaDays = Number.isFinite(deltaMs) ? Math.max(0, Math.floor(deltaMs / 86_400_000)) : 365;
    score += Math.max(0, 10 - Math.floor(deltaDays / 30));
  }

  return score;
}

export function applyOverviewQuickFilters(
  items: LiteratureOverviewItem[],
  filters: {
    keyword: string;
    yearStart: number | null;
    yearEnd: number | null;
    tagKeywords: string[];
    statusFilter: OverviewScopeFilterInput;
  },
): LiteratureOverviewItem[] {
  const keyword = normalizeComparableText(filters.keyword);
  const normalizedTagKeywords = new Set(
    filters.tagKeywords
      .map((tag) => normalizeComparableText(tag))
      .filter((tag) => tag.length > 0),
  );

  return items.filter((item) => {
    if (keyword) {
      const hit = [
        item.title,
        item.authors.join(' '),
        item.tags.join(' '),
        item.providers.join(' '),
        item.doi ?? '',
        item.arxiv_id ?? '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(keyword);
      if (!hit) {
        return false;
      }
    }

    if (filters.yearStart !== null) {
      if (item.year === null || item.year < filters.yearStart) {
        return false;
      }
    }

    if (filters.yearEnd !== null) {
      if (item.year === null || item.year > filters.yearEnd) {
        return false;
      }
    }

    if (normalizedTagKeywords.size > 0) {
      const hit = item.tags.some((tag) => normalizedTagKeywords.has(normalizeComparableText(tag)));
      if (!hit) {
        return false;
      }
    }

    if (filters.statusFilter !== 'all') {
      const currentStatus = resolveLiteratureOverviewStatus(item);
      if (currentStatus !== filters.statusFilter) {
        return false;
      }
    }

    return true;
  });
}

export function projectOverviewItems(
  items: LiteratureOverviewItem[],
  options: {
    sort: QuerySort;
    direction: SortDirection;
    keyword: string;
    yearStart: number | null;
    yearEnd: number | null;
    tagKeywords: string[];
    statusFilter: OverviewScopeFilterInput;
  },
): LiteratureOverviewItem[] {
  const quickFilteredItems = applyOverviewQuickFilters(items, {
    keyword: options.keyword,
    yearStart: options.yearStart,
    yearEnd: options.yearEnd,
    tagKeywords: options.tagKeywords,
    statusFilter: options.statusFilter,
  });
  return sortOverviewItems(quickFilteredItems, options.sort, options.direction);
}

export function sortOverviewItems(items: LiteratureOverviewItem[], sort: QuerySort, direction: SortDirection): LiteratureOverviewItem[] {
  const sorted = [...items];
  const factor = direction === 'asc' ? 1 : -1;
  sorted.sort((a, b) => {
    if (sort === 'importance') {
      return (getLiteratureImportanceScore(a) - getLiteratureImportanceScore(b)) * factor;
    }
    if (sort === 'updated_at') {
      const left = a.source_updated_at ? new Date(a.source_updated_at).getTime() : 0;
      const right = b.source_updated_at ? new Date(b.source_updated_at).getTime() : 0;
      return (left - right) * factor;
    }
    if (sort === 'published_at') {
      return ((a.year ?? 0) - (b.year ?? 0)) * factor;
    }
    return a.title.localeCompare(b.title, 'zh-CN') * factor;
  });
  return sorted;
}

export function detectManualUploadFileFormat(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.json')) {
    return 'JSON';
  }
  if (lower.endsWith('.csv')) {
    return 'CSV';
  }
  if (lower.endsWith('.bib') || lower.endsWith('.bibtex')) {
    return 'BibTeX';
  }
  if (lower.endsWith('.pdf')) {
    return 'PDF';
  }
  if (lower.endsWith('.txt')) {
    return 'TXT';
  }
  if (lower.endsWith('.tex') || lower.endsWith('.ltx')) {
    return 'TeX';
  }
  if (lower.endsWith('.bbl')) {
    return 'BBL';
  }
  if (lower.endsWith('.aux')) {
    return 'AUX';
  }
  if (lower.endsWith('.ris')) {
    return 'RIS';
  }
  return '其他';
}

export function isManualUploadParseSupported(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return (
    lower.endsWith('.json')
    || lower.endsWith('.csv')
    || lower.endsWith('.bib')
    || lower.endsWith('.bibtex')
    || lower.endsWith('.txt')
  );
}

export function isManualUploadLlmSupported(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return (
    lower.endsWith('.pdf')
    || lower.endsWith('.tex')
    || lower.endsWith('.ltx')
    || lower.endsWith('.bbl')
    || lower.endsWith('.aux')
    || lower.endsWith('.ris')
  );
}

export function buildManualUploadDuplicateKey(value: string): string | null {
  const normalized = normalizeManualDedupToken(
    value.replace(/\.(json|csv|bib|bibtex|txt|pdf|tex|ltx|bbl|aux|ris)$/i, ''),
  );
  return normalized.length > 0 ? normalized : null;
}

export function formatManualUploadFileStatusLabel(item: ManualUploadFileItem): string {
  if (item.status === 'processing') {
    return '处理中';
  }
  if (item.status === 'parsed') {
    return '已解析';
  }
  if (item.status === 'duplicate') {
    return '重复';
  }
  if (item.status === 'accepted') {
    return '已接收';
  }
  if (item.status === 'empty') {
    return '已接收';
  }
  return '解析失败';
}
