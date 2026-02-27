import type {
  AutoPullAlertLevel,
  AutoPullFrequency,
  AutoPullRuleStatus,
  AutoPullRunStatus,
  AutoPullScope,
  AutoPullSource,
  AutoPullTriggerType,
  TopicScopeStatus,
} from '@paper-engineering-assistant/shared';

export type TopicProfileRecord = {
  id: string;
  name: string;
  isActive: boolean;
  includeKeywords: string[];
  excludeKeywords: string[];
  venueFilters: string[];
  defaultLookbackDays: number;
  defaultMinYear: number | null;
  defaultMaxYear: number | null;
  createdAt: string;
  updatedAt: string;
};

export type AutoPullQuerySpec = {
  includeKeywords: string[];
  excludeKeywords: string[];
  authors: string[];
  venues: string[];
  maxResultsPerSource: number;
};

export type AutoPullTimeSpec = {
  lookbackDays: number;
  minYear: number | null;
  maxYear: number | null;
};

export type AutoPullQualitySpec = {
  minCompletenessScore: number;
  requireIncludeMatch: boolean;
};

export type AutoPullRuleRecord = {
  id: string;
  scope: AutoPullScope;
  name: string;
  status: AutoPullRuleStatus;
  querySpec: AutoPullQuerySpec;
  timeSpec: AutoPullTimeSpec;
  qualitySpec: AutoPullQualitySpec;
  createdAt: string;
  updatedAt: string;
};

export type AutoPullRuleTopicRecord = {
  id: string;
  ruleId: string;
  topicId: string;
  createdAt: string;
};

export type AutoPullRuleSourceRecord = {
  id: string;
  ruleId: string;
  source: AutoPullSource;
  enabled: boolean;
  priority: number;
  config: Record<string, unknown>;
};

export type AutoPullRuleScheduleRecord = {
  id: string;
  ruleId: string;
  frequency: AutoPullFrequency;
  daysOfWeek: string[];
  hour: number;
  minute: number;
  timezone: string;
  active: boolean;
};

export type AutoPullRunRecord = {
  id: string;
  ruleId: string;
  triggerType: AutoPullTriggerType;
  status: AutoPullRunStatus;
  startedAt: string | null;
  finishedAt: string | null;
  summary: Record<string, unknown>;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AutoPullRunSourceAttemptRecord = {
  id: string;
  runId: string;
  source: AutoPullSource;
  status: AutoPullRunStatus;
  fetchedCount: number;
  importedCount: number;
  failedCount: number;
  errorCode: string | null;
  errorMessage: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  meta: Record<string, unknown>;
};

export type AutoPullCursorRecord = {
  id: string;
  ruleId: string;
  source: AutoPullSource;
  cursorValue: string;
  cursorAt: string;
};

export type AutoPullAlertRecord = {
  id: string;
  ruleId: string;
  runId: string | null;
  source: AutoPullSource | null;
  level: AutoPullAlertLevel;
  code: string;
  message: string;
  detail: Record<string, unknown>;
  ackAt: string | null;
  createdAt: string;
};

export type AutoPullSuggestionRecord = {
  id: string;
  runId: string;
  literatureId: string;
  topicId: string | null;
  suggestedScope: TopicScopeStatus;
  reason: string;
  score: number;
  createdAt: string;
};

export interface AutoPullRepository {
  createTopicProfile(record: TopicProfileRecord): Promise<TopicProfileRecord>;
  listTopicProfiles(): Promise<TopicProfileRecord[]>;
  findTopicProfileById(topicId: string): Promise<TopicProfileRecord | null>;
  updateTopicProfile(
    topicId: string,
    patch: Partial<Omit<TopicProfileRecord, 'id' | 'createdAt'>>,
  ): Promise<TopicProfileRecord>;

  createRule(record: AutoPullRuleRecord): Promise<AutoPullRuleRecord>;
  findRuleById(ruleId: string): Promise<AutoPullRuleRecord | null>;
  listRules(filters?: {
    scope?: AutoPullScope;
    topicId?: string;
    status?: AutoPullRuleStatus;
  }): Promise<AutoPullRuleRecord[]>;
  updateRule(
    ruleId: string,
    patch: Partial<Omit<AutoPullRuleRecord, 'id' | 'createdAt'>>,
  ): Promise<AutoPullRuleRecord>;
  deleteRule(ruleId: string): Promise<void>;

  replaceRuleSources(ruleId: string, sources: AutoPullRuleSourceRecord[]): Promise<void>;
  listRuleSources(ruleId: string): Promise<AutoPullRuleSourceRecord[]>;
  replaceRuleTopics(ruleId: string, topicIds: string[]): Promise<void>;
  listRuleTopics(ruleId: string): Promise<TopicProfileRecord[]>;
  listRuleTopicIds(ruleId: string): Promise<string[]>;
  replaceRuleSchedules(ruleId: string, schedules: AutoPullRuleScheduleRecord[]): Promise<void>;
  listRuleSchedules(ruleId: string): Promise<AutoPullRuleScheduleRecord[]>;
  replaceTopicRules(topicId: string, ruleIds: string[]): Promise<void>;
  listTopicRuleIds(topicId: string): Promise<string[]>;

  createRun(record: AutoPullRunRecord): Promise<AutoPullRunRecord>;
  findRunById(runId: string): Promise<AutoPullRunRecord | null>;
  listRuns(filters?: {
    ruleId?: string;
    status?: AutoPullRunStatus;
    limit?: number;
  }): Promise<AutoPullRunRecord[]>;
  listInFlightRunsByRuleId(ruleId: string): Promise<AutoPullRunRecord[]>;
  updateRun(
    runId: string,
    patch: Partial<Omit<AutoPullRunRecord, 'id' | 'ruleId' | 'triggerType' | 'createdAt'>>,
  ): Promise<AutoPullRunRecord>;
  listRunningRunsByRuleId(ruleId: string): Promise<AutoPullRunRecord[]>;

  createRunSourceAttempts(records: AutoPullRunSourceAttemptRecord[]): Promise<void>;
  listRunSourceAttempts(runId: string): Promise<AutoPullRunSourceAttemptRecord[]>;

  upsertCursor(record: AutoPullCursorRecord): Promise<AutoPullCursorRecord>;
  findCursor(ruleId: string, source: AutoPullSource): Promise<AutoPullCursorRecord | null>;

  createAlert(record: AutoPullAlertRecord): Promise<AutoPullAlertRecord>;
  listAlerts(filters?: {
    ruleId?: string;
    level?: AutoPullAlertLevel;
    acked?: boolean;
    limit?: number;
  }): Promise<AutoPullAlertRecord[]>;
  acknowledgeAlert(alertId: string, ackAt: string): Promise<AutoPullAlertRecord>;

  createSuggestions(records: AutoPullSuggestionRecord[]): Promise<void>;
  listSuggestionsByRunId(runId: string): Promise<AutoPullSuggestionRecord[]>;
}
