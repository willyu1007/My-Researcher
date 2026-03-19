import type {
  AutoPullAlertDTO,
  AutoPullRuleDTO,
  AutoPullRunDTO,
  AutoPullSuggestionDTO,
  TopicProfileDTO,
} from '@paper-engineering-assistant/shared';
import type {
  AutoPullAlertRecord,
  AutoPullRunRecord,
  AutoPullRunSourceAttemptRecord,
  AutoPullSuggestionRecord,
  TopicProfileRecord,
} from '../../repositories/auto-pull-repository.js';
import type { RuleBundle } from './auto-pull-types.js';

export function buildAutoPullRuleDTO(bundle: RuleBundle): AutoPullRuleDTO {
  return {
    rule_id: bundle.rule.id,
    scope: bundle.rule.scope,
    topic_id: bundle.topicIds[0] ?? null,
    topic_ids: bundle.topicIds,
    name: bundle.rule.name,
    status: bundle.rule.status,
    query_spec: {
      include_keywords: bundle.rule.querySpec.includeKeywords,
      exclude_keywords: bundle.rule.querySpec.excludeKeywords,
      authors: bundle.rule.querySpec.authors,
      venues: bundle.rule.querySpec.venues,
      max_results_per_source: bundle.rule.querySpec.maxResultsPerSource,
    },
    time_spec: {
      lookback_days: bundle.rule.timeSpec.lookbackDays,
      min_year: bundle.rule.timeSpec.minYear,
      max_year: bundle.rule.timeSpec.maxYear,
    },
    quality_spec: {
      min_quality_score: bundle.rule.qualitySpec.minQualityScore,
    },
    sources: bundle.sources.map((source) => ({
      source: source.source,
      enabled: source.enabled,
      priority: source.priority,
      config: source.config,
    })),
    schedules: bundle.schedules.map((schedule) => ({
      frequency: schedule.frequency,
      days_of_week: schedule.daysOfWeek,
      hour: schedule.hour,
      minute: schedule.minute,
      timezone: schedule.timezone,
      active: schedule.active,
    })),
    created_at: bundle.rule.createdAt,
    updated_at: bundle.rule.updatedAt,
  };
}

export function toTopicProfileDTO(record: TopicProfileRecord, ruleIds: string[]): TopicProfileDTO {
  return {
    topic_id: record.id,
    name: record.name,
    is_active: record.isActive,
    initial_pull_pending: record.initialPullPending,
    include_keywords: record.includeKeywords,
    exclude_keywords: record.excludeKeywords,
    venue_filters: record.venueFilters,
    default_lookback_days: record.defaultLookbackDays,
    default_min_year: record.defaultMinYear,
    default_max_year: record.defaultMaxYear,
    rule_ids: ruleIds,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  };
}

export function toAutoPullRunDTO(
  run: AutoPullRunRecord,
  attempts?: AutoPullRunSourceAttemptRecord[],
  suggestions?: AutoPullSuggestionDTO[],
): AutoPullRunDTO {
  return {
    run_id: run.id,
    rule_id: run.ruleId,
    trigger_type: run.triggerType,
    status: run.status,
    started_at: run.startedAt,
    finished_at: run.finishedAt,
    summary: run.summary,
    error_code: run.errorCode,
    error_message: run.errorMessage,
    created_at: run.createdAt,
    updated_at: run.updatedAt,
    ...(attempts
      ? {
        source_attempts: attempts.map((attempt) => ({
          source: attempt.source,
          status: attempt.status,
          fetched_count: attempt.fetchedCount,
          imported_count: attempt.importedCount,
          failed_count: attempt.failedCount,
          error_code: attempt.errorCode,
          error_message: attempt.errorMessage,
          started_at: attempt.startedAt,
          finished_at: attempt.finishedAt,
          meta: attempt.meta,
        })),
      }
      : {}),
    ...(suggestions ? { suggestions } : {}),
  };
}

export function toAutoPullSuggestionDTO(record: AutoPullSuggestionRecord): AutoPullSuggestionDTO {
  return {
    suggestion_id: record.id,
    literature_id: record.literatureId,
    topic_id: record.topicId,
    suggested_scope: record.suggestedScope,
    reason: record.reason,
    score: record.score,
    created_at: record.createdAt,
  };
}

export function toAutoPullAlertDTO(record: AutoPullAlertRecord): AutoPullAlertDTO {
  return {
    alert_id: record.id,
    rule_id: record.ruleId,
    run_id: record.runId,
    source: record.source,
    level: record.level,
    code: record.code,
    message: record.message,
    detail: record.detail,
    ack_at: record.ackAt,
    created_at: record.createdAt,
  };
}
