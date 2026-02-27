import crypto from 'node:crypto';
import {
  AUTO_PULL_SOURCES,
  type AcknowledgeAlertRequest,
  type AutoPullAlertDTO,
  type AutoPullFrequency,
  type AutoPullRuleDTO,
  type AutoPullRunDTO,
  type AutoPullSource,
  type AutoPullSuggestionDTO,
  type CreateAutoPullRuleRequest,
  type CreateAutoPullRunRequest,
  type CreateTopicProfileRequest,
  type LiteratureImportItem,
  type RetryFailedSourcesRequest,
  type TopicProfileDTO,
  type TopicScopeStatus,
  type UpdateAutoPullRuleRequest,
  type UpdateTopicProfileRequest,
  type ZoteroLibraryType,
} from '@paper-engineering-assistant/shared';
import { AppError } from '../errors/app-error.js';
import type {
  AutoPullAlertRecord,
  AutoPullQualitySpec,
  AutoPullQuerySpec,
  AutoPullRepository,
  AutoPullRuleRecord,
  AutoPullRuleScheduleRecord,
  AutoPullRuleSourceRecord,
  AutoPullRunRecord,
  AutoPullRunSourceAttemptRecord,
  AutoPullSuggestionRecord,
  AutoPullTimeSpec,
  TopicProfileRecord,
} from '../repositories/auto-pull-repository.js';
import { LiteratureService } from './literature-service.js';

type SourceExecutionResult = {
  source: AutoPullSource;
  fetchedItems: LiteratureImportItem[];
  importedCount: number;
  failedCount: number;
  errorCode: string | null;
  errorMessage: string | null;
  attemptStatus: AutoPullRunSourceAttemptRecord['status'];
  suggestions: Array<{
    literatureId: string;
    topicId: string | null;
    suggestedScope: TopicScopeStatus;
    reason: string;
    score: number;
  }>;
  meta?: Record<string, unknown>;
};

type RuleBundle = {
  rule: AutoPullRuleRecord;
  topicIds: string[];
  topics: TopicProfileRecord[];
  sources: AutoPullRuleSourceRecord[];
  schedules: AutoPullRuleScheduleRecord[];
};

type TopicExecutionContext = {
  topicId: string | null;
  querySpec: AutoPullQuerySpec;
  timeSpec: AutoPullTimeSpec;
};

const AUTOPULL_ALERT_CODES = {
  NO_SOURCE_CONFIG: 'NO_SOURCE_CONFIG',
  NO_ACTIVE_TOPIC: 'NO_ACTIVE_TOPIC',
  SOURCE_UNREACHABLE: 'SOURCE_UNREACHABLE',
  SOURCE_AUTH_ERROR: 'SOURCE_AUTH_ERROR',
  SOURCE_RATE_LIMIT: 'SOURCE_RATE_LIMIT',
  PARSE_FAILED: 'PARSE_FAILED',
  IMPORT_FAILED: 'IMPORT_FAILED',
  RUN_SKIPPED_SINGLE_FLIGHT: 'RUN_SKIPPED_SINGLE_FLIGHT',
} as const;

export class AutoPullService {
  private readonly runJobs = new Map<string, Promise<void>>();

  constructor(
    private readonly repository: AutoPullRepository,
    private readonly literatureService: LiteratureService,
  ) {}

  async createTopicProfile(request: CreateTopicProfileRequest): Promise<TopicProfileDTO> {
    const topicId = request.topic_id.trim();
    if (!topicId) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'topic_id is required.');
    }
    const topicName = request.name.trim();
    if (!topicName) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'name is required.');
    }

    const now = new Date().toISOString();
    const existing = await this.repository.findTopicProfileById(topicId);
    if (existing) {
      throw new AppError(409, 'VERSION_CONFLICT', `Topic profile ${topicId} already exists.`);
    }

    const record = await this.repository.createTopicProfile({
      id: topicId,
      name: topicName,
      isActive: request.is_active ?? true,
      includeKeywords: this.normalizeKeywords(request.include_keywords),
      excludeKeywords: this.normalizeKeywords(request.exclude_keywords),
      venueFilters: this.normalizeKeywords(request.venue_filters),
      defaultLookbackDays: this.normalizeLookbackDays(request.default_lookback_days),
      defaultMinYear: this.normalizeOptionalYear(request.default_min_year),
      defaultMaxYear: this.normalizeOptionalYear(request.default_max_year),
      createdAt: now,
      updatedAt: now,
    });

    if (request.rule_ids !== undefined) {
      const ruleIds = await this.resolveTopicRuleIds(request.rule_ids);
      await this.repository.replaceTopicRules(topicId, ruleIds);
    }

    return this.toTopicProfileDTO(record, await this.repository.listTopicRuleIds(topicId));
  }

  async listTopicProfiles(): Promise<TopicProfileDTO[]> {
    const profiles = await this.repository.listTopicProfiles();
    return Promise.all(
      profiles.map(async (item) => this.toTopicProfileDTO(item, await this.repository.listTopicRuleIds(item.id))),
    );
  }

  async updateTopicProfile(topicId: string, request: UpdateTopicProfileRequest): Promise<TopicProfileDTO> {
    const normalizedTopicId = topicId.trim();
    const existing = await this.repository.findTopicProfileById(normalizedTopicId);
    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', `Topic profile ${normalizedTopicId} not found.`);
    }
    if (request.name !== undefined && request.name.trim().length === 0) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'name cannot be empty.');
    }

    const updated = await this.repository.updateTopicProfile(normalizedTopicId, {
      ...(request.name !== undefined ? { name: request.name.trim() } : {}),
      ...(request.is_active !== undefined ? { isActive: request.is_active } : {}),
      ...(request.include_keywords !== undefined
        ? { includeKeywords: this.normalizeKeywords(request.include_keywords) }
        : {}),
      ...(request.exclude_keywords !== undefined
        ? { excludeKeywords: this.normalizeKeywords(request.exclude_keywords) }
        : {}),
      ...(request.venue_filters !== undefined
        ? { venueFilters: this.normalizeKeywords(request.venue_filters) }
        : {}),
      ...(request.default_lookback_days !== undefined
        ? { defaultLookbackDays: this.normalizeLookbackDays(request.default_lookback_days) }
        : {}),
      ...(request.default_min_year !== undefined
        ? { defaultMinYear: this.normalizeOptionalYear(request.default_min_year) }
        : {}),
      ...(request.default_max_year !== undefined
        ? { defaultMaxYear: this.normalizeOptionalYear(request.default_max_year) }
        : {}),
      updatedAt: new Date().toISOString(),
    });

    if (request.rule_ids !== undefined) {
      const ruleIds = await this.resolveTopicRuleIds(request.rule_ids);
      await this.repository.replaceTopicRules(normalizedTopicId, ruleIds);
    }

    return this.toTopicProfileDTO(updated, await this.repository.listTopicRuleIds(normalizedTopicId));
  }

  async createRule(request: CreateAutoPullRuleRequest): Promise<AutoPullRuleDTO> {
    const ruleName = request.name.trim();
    if (!ruleName) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'name is required.');
    }
    const topicIds = this.normalizeTopicIdsFromPayload(request.topic_ids, request.topic_id);
    if (request.scope === 'TOPIC' && topicIds.length === 0) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'topic_ids is required when scope is TOPIC.');
    }
    if (request.scope === 'GLOBAL' && topicIds.length > 0) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'topic_ids must be empty when scope is GLOBAL.');
    }

    const topicProfiles = await this.loadTopicProfilesOrThrow(topicIds);
    const primaryTopicProfile = topicProfiles[0] ?? null;
    const now = new Date().toISOString();
    const ruleId = crypto.randomUUID();

    const querySpec = this.normalizeQuerySpec(request.query_spec, primaryTopicProfile);
    const timeSpec = this.normalizeTimeSpec(request.time_spec, primaryTopicProfile);
    const qualitySpec = this.normalizeQualitySpec(request.quality_spec);
    const sources = this.normalizeSources(ruleId, request.sources);
    const schedules = this.normalizeSchedules(ruleId, request.schedules);

    const rule = await this.repository.createRule({
      id: ruleId,
      scope: request.scope,
      name: ruleName,
      status: request.status ?? 'ACTIVE',
      querySpec,
      timeSpec,
      qualitySpec,
      createdAt: now,
      updatedAt: now,
    });
    await this.repository.replaceRuleTopics(rule.id, topicIds);
    await this.repository.replaceRuleSources(rule.id, sources);
    await this.repository.replaceRuleSchedules(rule.id, schedules);

    return this.buildRuleDTO({
      rule,
      topicIds,
      topics: topicProfiles,
      sources,
      schedules,
    });
  }

  async listRules(filters?: {
    scope?: AutoPullRuleRecord['scope'];
    topicId?: string;
    status?: AutoPullRuleRecord['status'];
  }): Promise<AutoPullRuleDTO[]> {
    const rules = await this.repository.listRules(filters);
    const bundles = await Promise.all(rules.map(async (rule) => this.loadRuleBundle(rule.id)));
    return bundles.map((bundle) => this.buildRuleDTO(bundle));
  }

  async updateRule(ruleId: string, request: UpdateAutoPullRuleRequest): Promise<AutoPullRuleDTO> {
    const existing = await this.loadRuleBundle(ruleId);
    if (!existing.rule) {
      throw new AppError(404, 'NOT_FOUND', `Rule ${ruleId} not found.`);
    }
    if (request.name !== undefined && request.name.trim().length === 0) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'name cannot be empty.');
    }

    const nextScope = request.scope ?? existing.rule.scope;
    const requestedTopicIds = this.resolveNextRuleTopicIds(request, existing.topicIds, nextScope);
    if (nextScope === 'TOPIC' && requestedTopicIds.length === 0) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'topic_ids is required when scope is TOPIC.');
    }
    if (nextScope === 'GLOBAL' && requestedTopicIds.length > 0) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'topic_ids must be empty when scope is GLOBAL.');
    }
    const topicProfiles = await this.loadTopicProfilesOrThrow(requestedTopicIds);
    const primaryTopicProfile = topicProfiles[0] ?? existing.topics[0] ?? null;

    const now = new Date().toISOString();
    const updatedRule = await this.repository.updateRule(ruleId, {
      ...(request.scope !== undefined ? { scope: request.scope } : {}),
      ...(request.name !== undefined ? { name: request.name.trim() } : {}),
      ...(request.status !== undefined ? { status: request.status } : {}),
      ...(request.query_spec !== undefined
        ? { querySpec: this.normalizeQuerySpec(request.query_spec, primaryTopicProfile) }
        : {}),
      ...(request.time_spec !== undefined
        ? { timeSpec: this.normalizeTimeSpec(request.time_spec, primaryTopicProfile) }
        : {}),
      ...(request.quality_spec !== undefined
        ? { qualitySpec: this.normalizeQualitySpec(request.quality_spec) }
        : {}),
      updatedAt: now,
    });

    if (request.sources !== undefined) {
      await this.repository.replaceRuleSources(ruleId, this.normalizeSources(ruleId, request.sources));
    }
    if (request.schedules !== undefined) {
      await this.repository.replaceRuleSchedules(ruleId, this.normalizeSchedules(ruleId, request.schedules));
    }
    if (request.scope !== undefined || request.topic_id !== undefined || request.topic_ids !== undefined) {
      await this.repository.replaceRuleTopics(ruleId, nextScope === 'TOPIC' ? requestedTopicIds : []);
    }

    return this.buildRuleDTO(await this.loadRuleBundle(ruleId, updatedRule));
  }

  async deleteRule(ruleId: string): Promise<void> {
    const existing = await this.repository.findRuleById(ruleId);
    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', `Rule ${ruleId} not found.`);
    }
    await this.repository.deleteRule(ruleId);
  }

  async triggerRuleRun(ruleId: string, request?: CreateAutoPullRunRequest): Promise<AutoPullRunDTO> {
    return this.enqueueRuleRun(ruleId, request?.trigger_type ?? 'MANUAL');
  }

  async retryFailedSources(runId: string, request: RetryFailedSourcesRequest): Promise<AutoPullRunDTO> {
    const baseRun = await this.repository.findRunById(runId);
    if (!baseRun) {
      throw new AppError(404, 'NOT_FOUND', `Run ${runId} not found.`);
    }
    const attempts = await this.repository.listRunSourceAttempts(runId);
    const failedSources = attempts
      .filter((attempt) => attempt.failedCount > 0 || attempt.status === 'FAILED')
      .map((attempt) => attempt.source);

    const selected = request.sources && request.sources.length > 0
      ? request.sources
      : failedSources;
    if (selected.length === 0) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'No failed sources available to retry.');
    }

    return this.enqueueRuleRun(baseRun.ruleId, 'MANUAL', new Set(selected));
  }

  async listRuns(filters?: {
    ruleId?: string;
    status?: AutoPullRunRecord['status'];
    limit?: number;
  }): Promise<AutoPullRunDTO[]> {
    const runs = await this.repository.listRuns(filters);
    return runs.map((run) => this.toRunDTO(run));
  }

  async getRun(runId: string): Promise<AutoPullRunDTO> {
    const run = await this.repository.findRunById(runId);
    if (!run) {
      throw new AppError(404, 'NOT_FOUND', `Run ${runId} not found.`);
    }
    const attempts = await this.repository.listRunSourceAttempts(runId);
    const suggestions = await this.repository.listSuggestionsByRunId(runId);
    return this.toRunDTO(run, attempts, suggestions.map((item) => this.toSuggestionDTO(item)));
  }

  async listAlerts(filters?: {
    ruleId?: string;
    level?: AutoPullAlertRecord['level'];
    acked?: boolean;
    limit?: number;
  }): Promise<AutoPullAlertDTO[]> {
    const alerts = await this.repository.listAlerts(filters);
    return alerts.map((item) => this.toAlertDTO(item));
  }

  async acknowledgeAlert(alertId: string, request: AcknowledgeAlertRequest): Promise<AutoPullAlertDTO> {
    const ackAt = request.ack_at ?? new Date().toISOString();
    const updated = await this.repository.acknowledgeAlert(alertId, ackAt);
    return this.toAlertDTO(updated);
  }

  async runScheduledTick(now: Date): Promise<void> {
    const rules = await this.repository.listRules({ status: 'ACTIVE' });
    for (const rule of rules) {
      const schedules = await this.repository.listRuleSchedules(rule.id);
      const due = schedules.some((schedule) => schedule.active && this.isScheduleDue(schedule, now));
      if (!due) {
        continue;
      }

      await this.enqueueRuleRun(rule.id, 'SCHEDULE');
    }
  }

  private async enqueueRuleRun(
    ruleId: string,
    triggerType: AutoPullRunRecord['triggerType'],
    sourceFilter?: Set<AutoPullSource>,
  ): Promise<AutoPullRunDTO> {
    const bundle = await this.loadRuleBundle(ruleId);
    const rule = bundle.rule;
    if (!rule) {
      throw new AppError(404, 'NOT_FOUND', `Rule ${ruleId} not found.`);
    }

    const now = new Date().toISOString();
    const inFlightRuns = await this.repository.listInFlightRunsByRuleId(rule.id);
    if (inFlightRuns.length > 0) {
      const skippedRun = await this.repository.createRun({
        id: crypto.randomUUID(),
        ruleId: rule.id,
        triggerType,
        status: 'SKIPPED',
        startedAt: now,
        finishedAt: now,
        summary: {
          reason: AUTOPULL_ALERT_CODES.RUN_SKIPPED_SINGLE_FLIGHT,
          in_flight_run_ids: inFlightRuns.map((item) => item.id),
        },
        errorCode: AUTOPULL_ALERT_CODES.RUN_SKIPPED_SINGLE_FLIGHT,
        errorMessage: 'Existing run is still in-flight.',
        createdAt: now,
        updatedAt: now,
      });
      await this.repository.createAlert({
        id: crypto.randomUUID(),
        ruleId: rule.id,
        runId: skippedRun.id,
        source: null,
        level: 'WARNING',
        code: AUTOPULL_ALERT_CODES.RUN_SKIPPED_SINGLE_FLIGHT,
        message: 'Scheduled/manual trigger skipped due to single-flight guard.',
        detail: {
          in_flight_run_ids: inFlightRuns.map((item) => item.id),
        },
        ackAt: null,
        createdAt: now,
      });
      return this.toRunDTO(skippedRun);
    }

    const run = await this.repository.createRun({
      id: crypto.randomUUID(),
      ruleId: rule.id,
      triggerType,
      status: 'PENDING',
      startedAt: null,
      finishedAt: null,
      summary: {
        queued_at: now,
        ...(sourceFilter ? { source_filter: [...sourceFilter] } : {}),
      },
      errorCode: null,
      errorMessage: null,
      createdAt: now,
      updatedAt: now,
    });
    this.scheduleRunProcessing(run.id, sourceFilter);
    return this.toRunDTO(run);
  }

  private scheduleRunProcessing(runId: string, sourceFilter?: Set<AutoPullSource>): void {
    if (this.runJobs.has(runId)) {
      return;
    }

    const task = this.processRun(runId, sourceFilter ? new Set(sourceFilter) : undefined)
      .catch(() => undefined)
      .finally(() => {
        this.runJobs.delete(runId);
      });
    this.runJobs.set(runId, task);
  }

  private async processRun(runId: string, sourceFilter?: Set<AutoPullSource>): Promise<void> {
    const initialRun = await this.repository.findRunById(runId);
    if (!initialRun) {
      return;
    }

    const startedAt = new Date().toISOString();
    const runningRun = await this.repository.updateRun(runId, {
      status: 'RUNNING',
      startedAt,
      updatedAt: startedAt,
      summary: {
        ...initialRun.summary,
        started_at: startedAt,
      },
    });

    try {
      const bundle = await this.loadRuleBundle(runningRun.ruleId);
      const rule = bundle.rule;
      const enabledSources = bundle.sources
        .filter((source) => source.enabled)
        .filter((source) => (sourceFilter ? sourceFilter.has(source.source) : true))
        .sort((a, b) => a.priority - b.priority);
      const topicContexts = this.buildTopicExecutionContexts(rule, bundle.topics);
      const skippedTopicIds = rule.scope === 'TOPIC'
        ? bundle.topics.filter((topic) => !topic.isActive).map((topic) => topic.id)
        : [];

      if (enabledSources.length === 0) {
        const finishedAt = new Date().toISOString();
        await this.repository.updateRun(runId, {
          status: 'FAILED',
          finishedAt,
          summary: {
            ...runningRun.summary,
            imported_count: 0,
            failed_count: 0,
            reason: AUTOPULL_ALERT_CODES.NO_SOURCE_CONFIG,
          },
          errorCode: AUTOPULL_ALERT_CODES.NO_SOURCE_CONFIG,
          errorMessage: 'No enabled sources configured for rule.',
          updatedAt: finishedAt,
        });
        await this.repository.createAlert({
          id: crypto.randomUUID(),
          ruleId: rule.id,
          runId,
          source: null,
          level: 'ERROR',
          code: AUTOPULL_ALERT_CODES.NO_SOURCE_CONFIG,
          message: 'Rule has no enabled source.',
          detail: {},
          ackAt: null,
          createdAt: finishedAt,
        });
        return;
      }

      if (rule.scope === 'TOPIC' && topicContexts.length === 0) {
        const finishedAt = new Date().toISOString();
        await this.repository.updateRun(runId, {
          status: 'SKIPPED',
          finishedAt,
          summary: {
            ...runningRun.summary,
            imported_count: 0,
            failed_count: 0,
            reason: AUTOPULL_ALERT_CODES.NO_ACTIVE_TOPIC,
            skipped_topic_ids: skippedTopicIds,
          },
          errorCode: AUTOPULL_ALERT_CODES.NO_ACTIVE_TOPIC,
          errorMessage: 'No active topics linked to current rule.',
          updatedAt: finishedAt,
        });
        await this.repository.createAlert({
          id: crypto.randomUUID(),
          ruleId: rule.id,
          runId,
          source: null,
          level: 'WARNING',
          code: AUTOPULL_ALERT_CODES.NO_ACTIVE_TOPIC,
          message: 'Rule has no active topics; run skipped.',
          detail: {
            skipped_topic_ids: skippedTopicIds,
          },
          ackAt: null,
          createdAt: finishedAt,
        });
        return;
      }

      const sourceResults: SourceExecutionResult[] = [];
      for (const source of enabledSources) {
        const scopedResults: SourceExecutionResult[] = [];
        for (const context of topicContexts) {
          scopedResults.push(await this.executeSource(rule, source, runId, context));
        }
        sourceResults.push(
          this.aggregateSourceResults(
            source.source,
            scopedResults,
            topicContexts.map((context) => context.topicId),
            skippedTopicIds,
          ),
        );
      }

      const finishedAt = new Date().toISOString();
      const totalImported = sourceResults.reduce((sum, item) => sum + item.importedCount, 0);
      const totalFailed = sourceResults.reduce((sum, item) => sum + item.failedCount, 0);
      const sourceFailures = sourceResults.filter((item) => item.attemptStatus === 'FAILED').length;

      const status = sourceFailures === 0
        ? 'SUCCESS'
        : totalImported > 0
          ? 'PARTIAL'
          : 'FAILED';

      await this.repository.updateRun(runId, {
        status,
        finishedAt,
        summary: {
          ...runningRun.summary,
          imported_count: totalImported,
          failed_count: totalFailed,
          source_total: sourceResults.length,
          ...(rule.scope === 'TOPIC'
            ? {
              active_topic_ids: topicContexts.map((context) => context.topicId),
              skipped_topic_ids: skippedTopicIds,
            }
            : {}),
        },
        errorCode: status === 'FAILED' ? AUTOPULL_ALERT_CODES.IMPORT_FAILED : null,
        errorMessage: status === 'FAILED' ? 'All sources failed.' : null,
        updatedAt: finishedAt,
      });

      const attempts: AutoPullRunSourceAttemptRecord[] = sourceResults.map((item) => ({
        id: crypto.randomUUID(),
        runId,
        source: item.source,
        status: item.attemptStatus,
        fetchedCount: item.fetchedItems.length,
        importedCount: item.importedCount,
        failedCount: item.failedCount,
        errorCode: item.errorCode,
        errorMessage: item.errorMessage,
        startedAt,
        finishedAt,
        meta: item.meta ?? { fetched_count: item.fetchedItems.length },
      }));
      await this.repository.createRunSourceAttempts(attempts);

      const suggestions: AutoPullSuggestionRecord[] = sourceResults.flatMap((item) =>
        item.suggestions.map((suggestion) => ({
          id: crypto.randomUUID(),
          runId,
          literatureId: suggestion.literatureId,
          topicId: suggestion.topicId,
          suggestedScope: suggestion.suggestedScope,
          reason: suggestion.reason,
          score: suggestion.score,
          createdAt: finishedAt,
        })),
      );
      await this.repository.createSuggestions(suggestions);

      if (status === 'FAILED') {
        await this.repository.createAlert({
          id: crypto.randomUUID(),
          ruleId: rule.id,
          runId,
          source: null,
          level: 'ERROR',
          code: AUTOPULL_ALERT_CODES.IMPORT_FAILED,
          message: 'All enabled sources failed during run execution.',
          detail: {
            source_total: sourceResults.length,
          },
          ackAt: null,
          createdAt: finishedAt,
        });
      }
    } catch (error) {
      const failedAt = new Date().toISOString();
      const latestRun = await this.repository.findRunById(runId);
      if (!latestRun) {
        return;
      }

      await this.repository.updateRun(runId, {
        status: 'FAILED',
        finishedAt: failedAt,
        summary: {
          ...latestRun.summary,
          reason: AUTOPULL_ALERT_CODES.IMPORT_FAILED,
        },
        errorCode: AUTOPULL_ALERT_CODES.IMPORT_FAILED,
        errorMessage: error instanceof Error ? error.message : 'Run processing failed unexpectedly.',
        updatedAt: failedAt,
      });

      await this.repository.createAlert({
        id: crypto.randomUUID(),
        ruleId: latestRun.ruleId,
        runId,
        source: null,
        level: 'ERROR',
        code: AUTOPULL_ALERT_CODES.IMPORT_FAILED,
        message: error instanceof Error ? error.message : 'Run processing failed unexpectedly.',
        detail: {},
        ackAt: null,
        createdAt: failedAt,
      });
    }
  }

  private async executeSource(
    rule: AutoPullRuleRecord,
    source: AutoPullRuleSourceRecord,
    runId: string,
    context: TopicExecutionContext,
  ): Promise<SourceExecutionResult> {
    try {
      const fetchedItems = await this.fetchSourceItems(source, context.querySpec, context.timeSpec);
      const accepted = fetchedItems
        .map((item) => ({
          item,
          gate: this.evaluateQualityGate(item, context.querySpec, rule.qualitySpec),
        }))
        .filter((item) => item.gate.allowed);

      const imported = accepted.length > 0
        ? await this.literatureService.import({
          items: accepted.map((item) => item.item),
        })
        : { results: [] };

      const suggestions = imported.results.map((result, index) => {
        const gate = accepted[index]?.gate;
        return {
          literatureId: result.literature_id,
          topicId: context.topicId,
          suggestedScope: gate?.suggestedScope ?? 'in_scope',
          reason: gate?.reason ?? 'quality-gate-pass',
          score: gate?.score ?? 0.8,
        };
      });

      await this.repository.upsertCursor({
        id: crypto.randomUUID(),
        ruleId: rule.id,
        source: source.source,
        cursorValue: new Date().toISOString(),
        cursorAt: new Date().toISOString(),
      });

      const failedCount = fetchedItems.length - imported.results.length;
      if (failedCount > 0) {
        await this.repository.createAlert({
          id: crypto.randomUUID(),
          ruleId: rule.id,
          runId,
          source: source.source,
          level: 'WARNING',
          code: AUTOPULL_ALERT_CODES.PARSE_FAILED,
          message: `Some items were filtered out by quality gate for ${source.source}.`,
          detail: {
            fetched_count: fetchedItems.length,
            imported_count: imported.results.length,
            topic_id: context.topicId,
          },
          ackAt: null,
          createdAt: new Date().toISOString(),
        });
      }

      return {
        source: source.source,
        fetchedItems,
        importedCount: imported.results.length,
        failedCount,
        errorCode: null,
        errorMessage: null,
        attemptStatus: failedCount > 0 ? 'PARTIAL' : 'SUCCESS',
        suggestions,
        meta: {
          topic_id: context.topicId,
          fetched_count: fetchedItems.length,
          imported_count: imported.results.length,
          failed_count: failedCount,
        },
      };
    } catch (error) {
      const { alertCode, level } = this.resolveSourceError(error);
      await this.repository.createAlert({
        id: crypto.randomUUID(),
        ruleId: rule.id,
        runId,
        source: source.source,
        level,
        code: alertCode,
        message: error instanceof Error ? error.message : 'Unknown source error.',
        detail: {
          topic_id: context.topicId,
        },
        ackAt: null,
        createdAt: new Date().toISOString(),
      });

      return {
        source: source.source,
        fetchedItems: [],
        importedCount: 0,
        failedCount: 1,
        errorCode: alertCode,
        errorMessage: error instanceof Error ? error.message : 'Unknown source error.',
        attemptStatus: 'FAILED',
        suggestions: [],
        meta: {
          topic_id: context.topicId,
          fetched_count: 0,
          imported_count: 0,
          failed_count: 1,
        },
      };
    }
  }

  private resolveSourceError(error: unknown): {
    alertCode: string;
    level: AutoPullAlertRecord['level'];
  } {
    const message = error instanceof Error ? error.message.toLowerCase() : '';
    if (message.includes('429')) {
      return { alertCode: AUTOPULL_ALERT_CODES.SOURCE_RATE_LIMIT, level: 'WARNING' };
    }
    if (message.includes('401') || message.includes('403')) {
      return { alertCode: AUTOPULL_ALERT_CODES.SOURCE_AUTH_ERROR, level: 'ERROR' };
    }
    return { alertCode: AUTOPULL_ALERT_CODES.SOURCE_UNREACHABLE, level: 'ERROR' };
  }

  private async fetchSourceItems(
    source: AutoPullRuleSourceRecord,
    querySpec: AutoPullQuerySpec,
    timeSpec: AutoPullTimeSpec,
  ): Promise<LiteratureImportItem[]> {
    const queryText = this.buildSearchQuery(querySpec);
    if (source.source === 'CROSSREF') {
      return this.fetchCrossrefItems(queryText, querySpec.maxResultsPerSource, timeSpec);
    }
    if (source.source === 'ARXIV') {
      return this.fetchArxivItems(queryText, querySpec.maxResultsPerSource, timeSpec);
    }
    return this.fetchZoteroItems(queryText, source.config, querySpec.maxResultsPerSource, timeSpec);
  }

  private async fetchCrossrefItems(
    query: string,
    limit: number,
    timeSpec: AutoPullTimeSpec,
  ): Promise<LiteratureImportItem[]> {
    const response = await fetch(
      `https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=${limit}`,
    );
    if (!response.ok) {
      throw new Error(`Crossref request failed with status ${response.status}`);
    }
    const payload = (await response.json()) as {
      message?: {
        items?: Array<Record<string, unknown>>;
      };
    };
    const items = payload.message?.items ?? [];
    return items
      .map((item, index) => this.mapCrossrefRecord(item, `crossref-${index + 1}`))
      .filter((item): item is LiteratureImportItem => item !== null)
      .filter((item) => this.matchesTimeWindow(item, timeSpec));
  }

  private async fetchArxivItems(
    query: string,
    limit: number,
    timeSpec: AutoPullTimeSpec,
  ): Promise<LiteratureImportItem[]> {
    const response = await fetch(
      `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=${limit}`,
    );
    if (!response.ok) {
      throw new Error(`arXiv request failed with status ${response.status}`);
    }
    const xml = await response.text();
    const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)];
    return entries
      .map((entry) => this.mapArxivEntry(entry[1] ?? ''))
      .filter((item): item is LiteratureImportItem => item !== null)
      .filter((item) => this.matchesTimeWindow(item, timeSpec));
  }

  private async fetchZoteroItems(
    query: string,
    config: Record<string, unknown>,
    maxResultsPerSource: number,
    timeSpec: AutoPullTimeSpec,
  ): Promise<LiteratureImportItem[]> {
    const libraryType = this.readString(config.library_type) as ZoteroLibraryType | undefined;
    const libraryId = this.readString(config.library_id);
    if (!libraryType || !libraryId) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Zotero source config requires library_type and library_id.');
    }

    const url = new URL(
      `https://api.zotero.org/${libraryType}/${encodeURIComponent(libraryId)}/items/top`,
    );
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', String(maxResultsPerSource));
    url.searchParams.set('sort', 'dateModified');
    url.searchParams.set('direction', 'desc');
    url.searchParams.set('q', this.readString(config.query) ?? query);

    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    const apiKey = this.readString(config.api_key);
    if (apiKey) {
      headers['Zotero-API-Key'] = apiKey;
    }

    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`Zotero request failed with status ${response.status}`);
    }
    const payload = (await response.json()) as Array<Record<string, unknown>>;
    return payload
      .map((entry) => this.mapZoteroEntry(entry, libraryType, libraryId))
      .filter((item): item is LiteratureImportItem => item !== null)
      .filter((item) => this.matchesTimeWindow(item, timeSpec));
  }

  private mapCrossrefRecord(record: Record<string, unknown>, fallbackId: string): LiteratureImportItem | null {
    const title = this.readFirstString(record.title);
    if (!title) {
      return null;
    }
    const doi = this.normalizeDoi(this.readString(record.DOI));
    const sourceUrl = this.readString(record.URL) ?? (doi ? `https://doi.org/${doi}` : null);
    if (!sourceUrl) {
      return null;
    }
    const year = this.readCrossrefYear(record);
    return {
      provider: 'crossref',
      external_id: doi ?? fallbackId,
      title,
      abstract: this.stripMarkup(this.readString(record.abstract)) ?? undefined,
      authors: this.readCrossrefAuthors(record),
      year: year ?? undefined,
      doi: doi ?? undefined,
      source_url: sourceUrl,
      rights_class: 'UNKNOWN',
      tags: [],
    };
  }

  private mapArxivEntry(entry: string): LiteratureImportItem | null {
    const id = this.readXmlTag(entry, 'id');
    const title = this.readXmlTag(entry, 'title');
    if (!id || !title) {
      return null;
    }
    const summary = this.readXmlTag(entry, 'summary');
    const published = this.readXmlTag(entry, 'published');
    const year = published ? Number.parseInt(published.slice(0, 4), 10) : undefined;
    const authors = [...entry.matchAll(/<author>\s*<name>([\s\S]*?)<\/name>\s*<\/author>/g)]
      .map((match) => this.decodeXmlText(match[1] ?? '').trim())
      .filter((item) => item.length > 0);
    const arxivId = this.extractArxivId(id);
    return {
      provider: 'arxiv',
      external_id: arxivId ?? id,
      title: this.decodeXmlText(title),
      abstract: summary ? this.decodeXmlText(summary) : undefined,
      authors,
      year: Number.isFinite(year ?? Number.NaN) ? year : undefined,
      arxiv_id: arxivId ?? undefined,
      source_url: id,
      rights_class: 'UNKNOWN',
      tags: [],
    };
  }

  private mapZoteroEntry(
    entry: Record<string, unknown>,
    libraryType: ZoteroLibraryType,
    libraryId: string,
  ): LiteratureImportItem | null {
    const data = this.readRecord(entry.data);
    if (!data) {
      return null;
    }
    const title = this.readString(data.title);
    if (!title) {
      return null;
    }

    const creators = Array.isArray(data.creators) ? data.creators : [];
    const authors = creators
      .map((creator) => this.readRecord(creator))
      .filter((creator): creator is Record<string, unknown> => creator !== null)
      .map((creator) => {
        const fullName = this.readString(creator.name);
        if (fullName) {
          return fullName;
        }
        const firstName = this.readString(creator.firstName);
        const lastName = this.readString(creator.lastName);
        return [firstName, lastName].filter((part): part is string => Boolean(part)).join(' ');
      })
      .map((name) => name.trim())
      .filter((name) => name.length > 0);

    const itemKey = this.readString(entry.key) ?? this.readString(data.key);
    const doi = this.normalizeDoi(this.readString(data.DOI) ?? this.readString(data.doi));
    const arxivId = this.normalizeArxivId(this.readString(data.arxivId) ?? this.readString(data.arxiv));
    const sourceUrl =
      this.readString(data.url) ??
      (itemKey
        ? `https://www.zotero.org/${libraryType}/${libraryId}/items/${itemKey}`
        : `https://www.zotero.org/${libraryType}/${libraryId}`);
    const dateText = this.readString(data.date);
    const year = this.parseYear(dateText);

    return {
      provider: 'zotero',
      external_id: itemKey ?? doi ?? arxivId ?? sourceUrl,
      title: title.trim(),
      abstract: this.readString(data.abstractNote) ?? undefined,
      authors,
      year: year ?? undefined,
      doi: doi ?? undefined,
      arxiv_id: arxivId ?? undefined,
      source_url: sourceUrl,
      rights_class: 'USER_AUTH',
      tags: [],
    };
  }

  private evaluateQualityGate(
    item: LiteratureImportItem,
    querySpec: AutoPullQuerySpec,
    qualitySpec: AutoPullQualitySpec,
  ): { allowed: boolean; suggestedScope: TopicScopeStatus; reason: string; score: number } {
    const title = item.title.toLowerCase();
    const abstract = (item.abstract ?? '').toLowerCase();
    const corpus = `${title} ${abstract} ${(item.authors ?? []).join(' ').toLowerCase()}`;
    const includeMatched = querySpec.includeKeywords.length === 0
      || querySpec.includeKeywords.some((keyword) => corpus.includes(keyword.toLowerCase()));
    const excludeMatched = querySpec.excludeKeywords.some((keyword) =>
      corpus.includes(keyword.toLowerCase()),
    );

    const completenessScore = this.computeCompletenessScore(item);
    if (excludeMatched) {
      return {
        allowed: false,
        suggestedScope: 'excluded',
        reason: 'matched exclude keyword',
        score: completenessScore,
      };
    }
    if (qualitySpec.requireIncludeMatch && !includeMatched) {
      return {
        allowed: false,
        suggestedScope: 'excluded',
        reason: 'include keywords not matched',
        score: completenessScore,
      };
    }
    if (completenessScore < qualitySpec.minCompletenessScore) {
      return {
        allowed: false,
        suggestedScope: 'excluded',
        reason: 'completeness score below threshold',
        score: completenessScore,
      };
    }

    return {
      allowed: true,
      suggestedScope: 'in_scope',
      reason: includeMatched ? 'matched include keywords' : 'quality gate pass',
      score: completenessScore,
    };
  }

  private computeCompletenessScore(item: LiteratureImportItem): number {
    const fields = [
      item.title.trim().length > 0,
      (item.authors ?? []).length > 0,
      typeof item.year === 'number',
      Boolean(item.doi || item.arxiv_id),
      item.source_url.trim().length > 0,
    ];
    const hit = fields.filter(Boolean).length;
    return Number((hit / fields.length).toFixed(4));
  }

  private matchesTimeWindow(item: LiteratureImportItem, timeSpec: AutoPullTimeSpec): boolean {
    const nowYear = new Date().getUTCFullYear();
    const minYearByLookback = nowYear - Math.max(0, timeSpec.lookbackDays / 365);
    const minYear = timeSpec.minYear ?? Math.floor(minYearByLookback);
    const maxYear = timeSpec.maxYear ?? nowYear + 1;
    const year = item.year;
    if (!year) {
      return true;
    }
    return year >= minYear && year <= maxYear;
  }

  private isScheduleDue(schedule: AutoPullRuleScheduleRecord, now: Date): boolean {
    const local = this.toLocalParts(now, schedule.timezone);
    if (!local) {
      return false;
    }
    if (local.hour !== schedule.hour || local.minute !== schedule.minute) {
      return false;
    }
    if (schedule.frequency === 'DAILY') {
      return true;
    }
    if (schedule.daysOfWeek.length === 0) {
      return false;
    }
    return schedule.daysOfWeek.map((item) => item.toUpperCase()).includes(local.dayOfWeek);
  }

  private toLocalParts(
    now: Date,
    timezone: string,
  ): { hour: number; minute: number; dayOfWeek: string } | null {
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      const parts = formatter.formatToParts(now);
      const hourPart = parts.find((part) => part.type === 'hour')?.value;
      const minutePart = parts.find((part) => part.type === 'minute')?.value;
      const dayPart = parts.find((part) => part.type === 'weekday')?.value;
      if (!hourPart || !minutePart || !dayPart) {
        return null;
      }
      return {
        hour: Number.parseInt(hourPart, 10),
        minute: Number.parseInt(minutePart, 10),
        dayOfWeek: dayPart.toUpperCase(),
      };
    } catch {
      return null;
    }
  }

  private async loadRuleBundle(ruleId: string, ruleOverride?: AutoPullRuleRecord): Promise<RuleBundle> {
    const rule = ruleOverride ?? await this.repository.findRuleById(ruleId);
    if (!rule) {
      throw new AppError(404, 'NOT_FOUND', `Rule ${ruleId} not found.`);
    }
    const [topicIds, topics, sources, schedules] = await Promise.all([
      this.repository.listRuleTopicIds(ruleId),
      this.repository.listRuleTopics(ruleId),
      this.repository.listRuleSources(ruleId),
      this.repository.listRuleSchedules(ruleId),
    ]);
    return { rule, topicIds, topics, sources, schedules };
  }

  private buildRuleDTO(bundle: RuleBundle): AutoPullRuleDTO {
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
        min_completeness_score: bundle.rule.qualitySpec.minCompletenessScore,
        require_include_match: bundle.rule.qualitySpec.requireIncludeMatch,
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

  private toTopicProfileDTO(record: TopicProfileRecord, ruleIds: string[]): TopicProfileDTO {
    return {
      topic_id: record.id,
      name: record.name,
      is_active: record.isActive,
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

  private toRunDTO(
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

  private toSuggestionDTO(record: AutoPullSuggestionRecord): AutoPullSuggestionDTO {
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

  private toAlertDTO(record: AutoPullAlertRecord): AutoPullAlertDTO {
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

  private normalizeTopicIdsFromPayload(
    topicIds?: string[] | null,
    topicId?: string | null,
  ): string[] {
    const values = [
      ...(topicIds ?? []),
      ...(topicId ? [topicId] : []),
    ];
    return [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))];
  }

  private resolveNextRuleTopicIds(
    request: UpdateAutoPullRuleRequest,
    existingTopicIds: string[],
    nextScope: AutoPullRuleRecord['scope'],
  ): string[] {
    if (request.scope === 'GLOBAL' && request.topic_ids === undefined && request.topic_id === undefined) {
      return [];
    }
    if (request.topic_ids !== undefined) {
      return this.normalizeTopicIdsFromPayload(request.topic_ids, request.topic_id);
    }
    if (request.topic_id !== undefined) {
      return this.normalizeTopicIdsFromPayload(undefined, request.topic_id);
    }
    if (nextScope === 'GLOBAL') {
      return [];
    }
    return existingTopicIds;
  }

  private async loadTopicProfilesOrThrow(topicIds: string[]): Promise<TopicProfileRecord[]> {
    const normalizedTopicIds = [...new Set(topicIds)];
    const profiles = await Promise.all(
      normalizedTopicIds.map(async (topicId) => {
        const profile = await this.repository.findTopicProfileById(topicId);
        if (!profile) {
          throw new AppError(404, 'NOT_FOUND', `Topic profile ${topicId} not found.`);
        }
        return profile;
      }),
    );
    return profiles;
  }

  private async resolveTopicRuleIds(ruleIds: string[]): Promise<string[]> {
    const normalizedRuleIds = [...new Set(ruleIds.map((value) => value.trim()).filter((value) => value.length > 0))];
    await Promise.all(
      normalizedRuleIds.map(async (ruleId) => {
        const rule = await this.repository.findRuleById(ruleId);
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

  private buildTopicExecutionContexts(
    rule: AutoPullRuleRecord,
    topics: TopicProfileRecord[],
  ): TopicExecutionContext[] {
    if (rule.scope === 'GLOBAL') {
      return [{
        topicId: null,
        querySpec: rule.querySpec,
        timeSpec: rule.timeSpec,
      }];
    }

    return topics
      .filter((topic) => topic.isActive)
      .map((topic) => ({
        topicId: topic.id,
        querySpec: this.mergeQuerySpecForTopic(rule.querySpec, topic),
        timeSpec: this.mergeTimeSpecForTopic(rule.timeSpec, topic),
      }));
  }

  private mergeQuerySpecForTopic(
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

  private mergeTimeSpecForTopic(
    baseTimeSpec: AutoPullTimeSpec,
    topic: TopicProfileRecord,
  ): AutoPullTimeSpec {
    return {
      lookbackDays: baseTimeSpec.lookbackDays || topic.defaultLookbackDays,
      minYear: baseTimeSpec.minYear ?? topic.defaultMinYear,
      maxYear: baseTimeSpec.maxYear ?? topic.defaultMaxYear,
    };
  }

  private aggregateSourceResults(
    source: AutoPullSource,
    results: SourceExecutionResult[],
    activeTopicIds: Array<string | null>,
    skippedTopicIds: string[],
  ): SourceExecutionResult {
    const fetchedItems = results.flatMap((item) => item.fetchedItems);
    const importedCount = results.reduce((sum, item) => sum + item.importedCount, 0);
    const failedCount = results.reduce((sum, item) => sum + item.failedCount, 0);
    const hasFailure = results.some((item) => item.attemptStatus === 'FAILED');
    const hasPartial = results.some((item) => item.attemptStatus === 'PARTIAL');
    const attemptStatus: AutoPullRunSourceAttemptRecord['status'] = hasFailure
      ? importedCount > 0
        ? 'PARTIAL'
        : 'FAILED'
      : hasPartial
        ? 'PARTIAL'
        : 'SUCCESS';

    const firstError = results.find((item) => Boolean(item.errorCode || item.errorMessage));
    return {
      source,
      fetchedItems,
      importedCount,
      failedCount,
      errorCode: firstError?.errorCode ?? null,
      errorMessage: firstError?.errorMessage ?? null,
      attemptStatus,
      suggestions: results.flatMap((item) => item.suggestions),
      meta: {
        topic_ids: activeTopicIds.filter((value): value is string => typeof value === 'string'),
        skipped_topic_ids: skippedTopicIds,
        fetched_count: fetchedItems.length,
        imported_count: importedCount,
        failed_count: failedCount,
      },
    };
  }

  private normalizeQuerySpec(
    querySpec: CreateAutoPullRuleRequest['query_spec'] | UpdateAutoPullRuleRequest['query_spec'] | undefined,
    topicProfile: TopicProfileRecord | null,
  ): AutoPullQuerySpec {
    return {
      includeKeywords: this.normalizeKeywords(querySpec?.include_keywords ?? topicProfile?.includeKeywords),
      excludeKeywords: this.normalizeKeywords(querySpec?.exclude_keywords ?? topicProfile?.excludeKeywords),
      authors: this.normalizeKeywords(querySpec?.authors),
      venues: this.normalizeKeywords(querySpec?.venues ?? topicProfile?.venueFilters),
      maxResultsPerSource: this.normalizeMaxResults(querySpec?.max_results_per_source),
    };
  }

  private normalizeTimeSpec(
    timeSpec: CreateAutoPullRuleRequest['time_spec'] | UpdateAutoPullRuleRequest['time_spec'] | undefined,
    topicProfile: TopicProfileRecord | null,
  ): AutoPullTimeSpec {
    return {
      lookbackDays: this.normalizeLookbackDays(timeSpec?.lookback_days ?? topicProfile?.defaultLookbackDays),
      minYear: this.normalizeOptionalYear(timeSpec?.min_year ?? topicProfile?.defaultMinYear),
      maxYear: this.normalizeOptionalYear(timeSpec?.max_year ?? topicProfile?.defaultMaxYear),
    };
  }

  private normalizeQualitySpec(
    qualitySpec: CreateAutoPullRuleRequest['quality_spec'] | UpdateAutoPullRuleRequest['quality_spec'] | undefined,
  ): AutoPullRuleRecord['qualitySpec'] {
    const minScore = qualitySpec?.min_completeness_score ?? 0.6;
    return {
      minCompletenessScore: Number.isFinite(minScore)
        ? Math.max(0, Math.min(1, minScore))
        : 0.6,
      requireIncludeMatch: qualitySpec?.require_include_match ?? true,
    };
  }

  private normalizeSources(
    ruleId: string,
    sources: Array<{
      source: AutoPullSource;
      enabled?: boolean;
      priority?: number;
      config?: Record<string, unknown>;
    }>,
  ): AutoPullRuleSourceRecord[] {
    const normalized = sources.map((source) => ({
      id: crypto.randomUUID(),
      ruleId,
      source: source.source,
      enabled: source.enabled ?? true,
      priority: this.normalizePriority(source.priority),
      config: source.config ?? {},
    }));
    const unique = new Set<AutoPullSource>();
    for (const source of normalized) {
      if (!AUTO_PULL_SOURCES.includes(source.source)) {
        throw new AppError(400, 'INVALID_PAYLOAD', `Unsupported source: ${source.source}`);
      }
      if (unique.has(source.source)) {
        throw new AppError(400, 'INVALID_PAYLOAD', `Duplicate source: ${source.source}`);
      }
      unique.add(source.source);
    }
    return normalized;
  }

  private normalizeSchedules(
    ruleId: string,
    schedules: Array<{
      frequency: AutoPullFrequency;
      days_of_week?: string[];
      hour: number;
      minute: number;
      timezone: string;
      active?: boolean;
    }>,
  ): AutoPullRuleScheduleRecord[] {
    if (schedules.length === 0) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'At least one schedule is required.');
    }

    return schedules.map((schedule) => {
      const hour = Number.isInteger(schedule.hour) ? schedule.hour : Number.NaN;
      const minute = Number.isInteger(schedule.minute) ? schedule.minute : Number.NaN;
      if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        throw new AppError(400, 'INVALID_PAYLOAD', 'Schedule hour/minute is invalid.');
      }
      return {
        id: crypto.randomUUID(),
        ruleId,
        frequency: schedule.frequency,
        daysOfWeek: (schedule.days_of_week ?? []).map((day) => day.toUpperCase()),
        hour,
        minute,
        timezone: schedule.timezone.trim(),
        active: schedule.active ?? true,
      };
    });
  }

  private normalizeKeywords(values?: string[] | null): string[] {
    if (!values) {
      return [];
    }
    return [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))];
  }

  private normalizeLookbackDays(value?: number | null): number {
    if (!value || !Number.isFinite(value)) {
      return 30;
    }
    const floored = Math.floor(value);
    return Math.max(1, Math.min(3650, floored));
  }

  private normalizeOptionalYear(value?: number | null): number | null {
    if (value === null || value === undefined) {
      return null;
    }
    if (!Number.isFinite(value)) {
      return null;
    }
    const year = Math.floor(value);
    if (year < 1900 || year > 2100) {
      return null;
    }
    return year;
  }

  private normalizePriority(value?: number): number {
    if (!value || !Number.isFinite(value)) {
      return 100;
    }
    const priority = Math.floor(value);
    return Math.max(1, Math.min(999, priority));
  }

  private normalizeMaxResults(value?: number): number {
    if (!value || !Number.isFinite(value)) {
      return 20;
    }
    const normalized = Math.floor(value);
    return Math.max(1, Math.min(200, normalized));
  }

  private buildSearchQuery(querySpec: AutoPullQuerySpec): string {
    const segments = [...querySpec.includeKeywords];
    if (querySpec.authors.length > 0) {
      segments.push(...querySpec.authors.map((author) => `author:${author}`));
    }
    if (querySpec.venues.length > 0) {
      segments.push(...querySpec.venues.map((venue) => `venue:${venue}`));
    }
    if (segments.length === 0) {
      return 'computer science';
    }
    return segments.join(' ');
  }

  private readRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }
    return value as Record<string, unknown>;
  }

  private readString(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
  }

  private readFirstString(value: unknown): string | undefined {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'string' && item.trim().length > 0) {
          return item;
        }
      }
      return undefined;
    }
    return this.readString(value);
  }

  private readCrossrefYear(record: Record<string, unknown>): number | undefined {
    const candidateKeys = ['published-print', 'published-online', 'issued'] as const;
    for (const key of candidateKeys) {
      const container = this.readRecord(record[key]);
      const dateParts = container?.['date-parts'];
      if (!Array.isArray(dateParts) || dateParts.length === 0) {
        continue;
      }
      const first = dateParts[0];
      if (!Array.isArray(first) || first.length === 0) {
        continue;
      }
      const year = first[0];
      if (typeof year === 'number' && Number.isFinite(year)) {
        return year;
      }
    }
    return undefined;
  }

  private readCrossrefAuthors(record: Record<string, unknown>): string[] {
    const authors = Array.isArray(record.author) ? record.author : [];
    return authors
      .map((author) => this.readRecord(author))
      .filter((author): author is Record<string, unknown> => author !== null)
      .map((author) => {
        const given = this.readString(author.given);
        const family = this.readString(author.family);
        return [given, family].filter((part): part is string => Boolean(part)).join(' ').trim();
      })
      .filter((author) => author.length > 0);
  }

  private stripMarkup(value?: string): string | null {
    if (!value) {
      return null;
    }
    return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private decodeXmlText(value: string): string {
    return value
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }

  private readXmlTag(xml: string, tag: string): string | undefined {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
    const match = xml.match(regex);
    if (!match || !match[1]) {
      return undefined;
    }
    const text = this.decodeXmlText(match[1]).replace(/\s+/g, ' ').trim();
    return text.length > 0 ? text : undefined;
  }

  private extractArxivId(value?: string): string | null {
    if (!value) {
      return null;
    }
    const normalized = value
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\/arxiv\.org\/abs\//, '')
      .replace(/^arxiv:/, '')
      .trim();
    return normalized.replace(/v\d+$/, '');
  }

  private normalizeDoi(value?: string): string | null {
    if (!value) {
      return null;
    }
    return value
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\/doi\.org\//, '')
      .replace(/^doi:/, '')
      .trim();
  }

  private normalizeArxivId(value?: string): string | null {
    if (!value) {
      return null;
    }
    const normalized = value
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\/arxiv\.org\/abs\//, '')
      .replace(/^arxiv:/, '')
      .trim();
    return normalized.replace(/v\d+$/, '');
  }

  private parseYear(value?: string): number | undefined {
    if (!value) {
      return undefined;
    }
    const match = value.match(/(19|20)\d{2}/);
    if (!match) {
      return undefined;
    }
    const year = Number.parseInt(match[0], 10);
    return Number.isFinite(year) ? year : undefined;
  }
}
