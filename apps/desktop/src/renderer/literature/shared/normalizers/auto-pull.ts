import { citationStatusOptions } from '../constants';
import type {
  AutoPullRule,
  AutoPullRun,
  AutoPullRunStatus,
  AutoPullSource,
  AutoPullTopicProfile,
  CitationStatus,
  PaperLiteratureItem,
  ScopeStatus,
  TopicScopeItem,
} from '../types';
import {
  asRecord,
  toText,
} from './common';

function normalizeAutoPullSource(value: unknown): AutoPullSource | null {
  return value === 'CROSSREF' || value === 'ARXIV' || value === 'ZOTERO' ? value : null;
}

function normalizeAutoPullRunStatus(value: unknown): AutoPullRunStatus {
  return value === 'RUNNING'
    || value === 'PARTIAL'
    || value === 'SUCCESS'
    || value === 'FAILED'
    || value === 'SKIPPED'
    || value === 'PENDING'
    ? value
    : 'PENDING';
}

function normalizeScopeStatus(value: unknown): ScopeStatus {
  return value === 'excluded' ? 'excluded' : 'in_scope';
}

function normalizeCitationStatus(value: unknown): CitationStatus {
  return citationStatusOptions.find((status) => status === value) ?? 'seeded';
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
        initial_pull_pending: row.initial_pull_pending === true,
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
        !ruleId
        || !scope
        || !name
        || !status
        || !querySpec
        || !timeSpec
        || !qualitySpec
        || !createdAt
        || !updatedAt
      ) {
        return null;
      }

      const singleTopicId = toText(row.topic_id) ?? null;

      return {
        rule_id: ruleId,
        scope: scope === 'TOPIC' ? 'TOPIC' : 'GLOBAL',
        topic_id: singleTopicId,
        topic_ids: Array.isArray(row.topic_ids)
          ? row.topic_ids.filter((value): value is string => typeof value === 'string')
          : singleTopicId ? [singleTopicId] : [],
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
              .map((entry) => {
                const source = normalizeAutoPullSource(entry.source);
                if (!source) {
                  return null;
                }
                return {
                  source,
                  enabled: entry.enabled !== false,
                  priority: typeof entry.priority === 'number' ? entry.priority : 100,
                  config: asRecord(entry.config) ?? {},
                };
              })
              .filter((entry): entry is AutoPullRule['sources'][number] => entry !== null)
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
        .map((entry) => {
          const source = normalizeAutoPullSource(entry.source);
          if (!source) {
            return null;
          }
          return {
            source,
            status: normalizeAutoPullRunStatus(entry.status),
            fetched_count: typeof entry.fetched_count === 'number' ? entry.fetched_count : 0,
            imported_count: typeof entry.imported_count === 'number' ? entry.imported_count : 0,
            failed_count: typeof entry.failed_count === 'number' ? entry.failed_count : 0,
            error_code: toText(entry.error_code) ?? null,
            error_message: toText(entry.error_message) ?? null,
            started_at: toText(entry.started_at) ?? null,
            finished_at: toText(entry.finished_at) ?? null,
            meta: asRecord(entry.meta) ?? {},
          };
        })
        .filter((entry): entry is NonNullable<AutoPullRun['source_attempts']>[number] => entry !== null)
    : undefined;

  const suggestions = Array.isArray(row.suggestions)
    ? row.suggestions
        .map((entry) => asRecord(entry))
        .filter((entry): entry is Record<string, unknown> => entry !== null)
        .map((entry) => ({
          suggestion_id: toText(entry.suggestion_id) ?? '',
          literature_id: toText(entry.literature_id) ?? '',
          topic_id: toText(entry.topic_id) ?? null,
          suggested_scope: normalizeScopeStatus(entry.suggested_scope),
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
    status: normalizeAutoPullRunStatus(status),
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
        scope_status: normalizeScopeStatus(scopeStatus),
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
        !linkId
        || !paperId
        || !literatureId
        || !citationStatus
        || !createdAt
        || !updatedAt
        || !title
      ) {
        return null;
      }

      return {
        link_id: linkId,
        paper_id: paperId,
        topic_id: toText(row.topic_id) ?? null,
        literature_id: literatureId,
        citation_status: normalizeCitationStatus(citationStatus),
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
