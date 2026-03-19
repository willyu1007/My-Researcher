import type {
  AutoPullScope,
  UpdateAutoPullRuleRequest,
} from '@paper-engineering-assistant/shared';
import { AppError } from '../../errors/app-error.js';
import type {
  AutoPullQuerySpec,
  AutoPullRepository,
  AutoPullRuleRecord,
  AutoPullTimeSpec,
  TopicProfileRecord,
} from '../../repositories/auto-pull-repository.js';
import type { SourceTimeWindowMode, TopicExecutionContext } from './auto-pull-types.js';

type ActiveGlobalRuleGuardInput = {
  ruleId?: string;
  currentScope?: AutoPullRuleRecord['scope'];
  currentStatus?: AutoPullRuleRecord['status'];
  nextScope: AutoPullRuleRecord['scope'] | null;
  nextStatus: AutoPullRuleRecord['status'] | null;
};

export function normalizeTopicIdsFromPayload(
  topicIds?: string[] | null,
  topicId?: string | null,
): string[] {
  const values = [
    ...(topicIds ?? []),
    ...(topicId ? [topicId] : []),
  ];
  return [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))];
}

export async function ensureAtLeastOneActiveGlobalRule(
  repository: AutoPullRepository,
  input: ActiveGlobalRuleGuardInput,
): Promise<void> {
  const activeGlobalRules = await repository.listRules({
    scope: 'GLOBAL',
    status: 'ACTIVE',
  });
  const activeGlobalRuleIds = new Set(activeGlobalRules.map((rule) => rule.id));

  const currentRuleIsActiveGlobal = input.ruleId !== undefined
    && input.currentScope === 'GLOBAL'
    && input.currentStatus === 'ACTIVE'
    && activeGlobalRuleIds.has(input.ruleId);
  const nextRuleIsActiveGlobal = input.nextScope === 'GLOBAL' && input.nextStatus === 'ACTIVE';

  const remainingCount = activeGlobalRuleIds.size
    - (currentRuleIsActiveGlobal ? 1 : 0)
    + (nextRuleIsActiveGlobal ? 1 : 0);
  if (remainingCount < 1) {
    throw new AppError(
      400,
      'INVALID_PAYLOAD',
      'At least one ACTIVE GLOBAL rule is required.',
    );
  }
}

export function resolveNextRuleTopicIds(
  request: UpdateAutoPullRuleRequest,
  existingTopicIds: string[],
  nextScope: AutoPullRuleRecord['scope'],
): string[] {
  if (request.scope === 'GLOBAL' && request.topic_ids === undefined && request.topic_id === undefined) {
    return [];
  }
  if (request.topic_ids !== undefined) {
    return normalizeTopicIdsFromPayload(request.topic_ids, request.topic_id);
  }
  if (request.topic_id !== undefined) {
    return normalizeTopicIdsFromPayload(undefined, request.topic_id);
  }
  if (nextScope === 'GLOBAL') {
    return [];
  }
  return existingTopicIds;
}

export async function loadTopicProfilesOrThrow(
  repository: AutoPullRepository,
  topicIds: string[],
): Promise<TopicProfileRecord[]> {
  const normalizedTopicIds = [...new Set(topicIds)];
  const profiles = await Promise.all(
    normalizedTopicIds.map(async (topicId) => {
      const profile = await repository.findTopicProfileById(topicId);
      if (!profile) {
        throw new AppError(404, 'NOT_FOUND', `Topic profile ${topicId} not found.`);
      }
      return profile;
    }),
  );
  return profiles;
}

export async function resolveTopicRuleIds(
  repository: AutoPullRepository,
  ruleIds: string[],
): Promise<string[]> {
  const normalizedRuleIds = [...new Set(ruleIds.map((value) => value.trim()).filter((value) => value.length > 0))];
  await Promise.all(
    normalizedRuleIds.map(async (ruleId) => {
      const rule = await repository.findRuleById(ruleId);
      if (!rule) {
        throw new AppError(404, 'NOT_FOUND', `Rule ${ruleId} not found.`);
      }
      if (rule.scope !== 'TOPIC') {
        throw new AppError(400, 'INVALID_PAYLOAD', `Rule ${ruleId} is not a TOPIC rule.`);
      }
    }),
  );
  return normalizedRuleIds;
}

export function ensureTopicSingleRuleBinding(ruleIds: string[]): void {
  const normalizedRuleIds = [...new Set(ruleIds.map((value) => value.trim()).filter((value) => value.length > 0))];
  if (normalizedRuleIds.length > 1) {
    throw new AppError(400, 'INVALID_PAYLOAD', 'Each topic can bind at most one TOPIC rule.');
  }
}

export async function assignRuleToTopics(
  repository: AutoPullRepository,
  ruleId: string,
  topicIds: string[],
): Promise<void> {
  const normalizedTopicIds = [...new Set(topicIds.map((value) => value.trim()).filter((value) => value.length > 0))];
  await repository.replaceRuleTopics(ruleId, normalizedTopicIds);
  for (const topicId of normalizedTopicIds) {
    await repository.replaceTopicRules(topicId, [ruleId]);
  }
}

export function buildTopicExecutionContexts(
  rule: AutoPullRuleRecord,
  topics: TopicProfileRecord[],
): TopicExecutionContext[] {
  if (rule.scope === 'GLOBAL') {
    return [{
      topicId: null,
      querySpec: rule.querySpec,
      timeSpec: rule.timeSpec,
      initialPullPending: false,
    }];
  }

  return topics
    .filter((topic) => topic.isActive)
    .map((topic) => ({
      topicId: topic.id,
      querySpec: mergeQuerySpecForTopic(rule.querySpec, topic),
      timeSpec: mergeTimeSpecForTopic(rule.timeSpec, topic),
      initialPullPending: topic.initialPullPending,
    }));
}

export function resolveTimeWindowModeForContext(
  scope: AutoPullScope,
  context: TopicExecutionContext,
  fallbackMode: SourceTimeWindowMode,
  fullRefresh: boolean,
): SourceTimeWindowMode {
  if (fullRefresh) {
    return 'bootstrap_full_range';
  }
  if (scope === 'TOPIC') {
    return context.initialPullPending ? 'bootstrap_full_range' : 'incremental_lookback';
  }
  return fallbackMode;
}

function mergeQuerySpecForTopic(
  baseQuerySpec: AutoPullQuerySpec,
  topic: TopicProfileRecord,
): AutoPullQuerySpec {
  return {
    includeKeywords: baseQuerySpec.includeKeywords.length > 0
      ? baseQuerySpec.includeKeywords
      : topic.includeKeywords,
    excludeKeywords: baseQuerySpec.excludeKeywords.length > 0
      ? baseQuerySpec.excludeKeywords
      : topic.excludeKeywords,
    authors: baseQuerySpec.authors,
    venues: baseQuerySpec.venues.length > 0 ? baseQuerySpec.venues : topic.venueFilters,
    maxResultsPerSource: baseQuerySpec.maxResultsPerSource,
  };
}

function mergeTimeSpecForTopic(
  baseTimeSpec: AutoPullTimeSpec,
  topic: TopicProfileRecord,
): AutoPullTimeSpec {
  return {
    lookbackDays: baseTimeSpec.lookbackDays || topic.defaultLookbackDays,
    minYear: baseTimeSpec.minYear ?? topic.defaultMinYear,
    maxYear: baseTimeSpec.maxYear ?? topic.defaultMaxYear,
  };
}
