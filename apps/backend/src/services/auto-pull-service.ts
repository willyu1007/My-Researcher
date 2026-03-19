import crypto from 'node:crypto';
import {
  AUTO_PULL_SOURCES,
  type AcknowledgeAlertRequest,
  type AutoPullAlertDTO,
  type AutoPullFrequency,
  type AutoPullRuleDTO,
  type AutoPullRunDTO,
  type AutoPullScope,
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
import { AUTOPULL_ALERT_CODES } from './auto-pull/auto-pull-alert-codes.js';
import {
  buildAutoPullRuleDTO,
  toAutoPullAlertDTO,
  toAutoPullRunDTO,
  toAutoPullSuggestionDTO,
  toTopicProfileDTO,
} from './auto-pull/auto-pull-dto.js';
import {
  readAutoPullRankingMode,
  scoreAutoPullRankedCandidates,
} from './auto-pull/auto-pull-ranking.js';
import {
  assignRuleToTopics,
  buildTopicExecutionContexts,
  ensureAtLeastOneActiveGlobalRule,
  ensureTopicSingleRuleBinding,
  loadTopicProfilesOrThrow,
  normalizeTopicIdsFromPayload,
  resolveNextRuleTopicIds,
  resolveTimeWindowModeForContext,
  resolveTopicRuleIds,
} from './auto-pull/auto-pull-topic-context.js';
import type {
  AutoPullRankingMode,
  EligibleCandidate,
  FetchedCandidate,
  PublicationStatusSignal,
  RankedCandidate,
  RuleBundle,
  SourceExecutionResult,
  SourceTimeWindowMode,
  TopicExecutionContext,
} from './auto-pull/auto-pull-types.js';
import { LiteratureService } from './literature-service.js';

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
      initialPullPending: request.initial_pull_pending ?? true,
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
      this.ensureTopicSingleRuleBinding(request.rule_ids);
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
      ...(request.initial_pull_pending !== undefined ? { initialPullPending: request.initial_pull_pending } : {}),
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
      this.ensureTopicSingleRuleBinding(request.rule_ids);
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
    const nextStatus = request.status ?? 'ACTIVE';
    const topicIds = this.normalizeTopicIdsFromPayload(request.topic_ids, request.topic_id);
    if (request.scope === 'GLOBAL' && topicIds.length > 0) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'topic_ids must be empty when scope is GLOBAL.');
    }
    await this.ensureAtLeastOneActiveGlobalRule({
      nextScope: request.scope,
      nextStatus,
    });

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
      status: nextStatus,
      querySpec,
      timeSpec,
      qualitySpec,
      createdAt: now,
      updatedAt: now,
    });
    await this.assignRuleToTopics(rule.id, request.scope === 'TOPIC' ? topicIds : []);
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
    const nextStatus = request.status ?? existing.rule.status;
    const requestedTopicIds = this.resolveNextRuleTopicIds(request, existing.topicIds, nextScope);
    if (nextScope === 'GLOBAL' && requestedTopicIds.length > 0) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'topic_ids must be empty when scope is GLOBAL.');
    }
    await this.ensureAtLeastOneActiveGlobalRule({
      ruleId: existing.rule.id,
      currentScope: existing.rule.scope,
      currentStatus: existing.rule.status,
      nextScope,
      nextStatus,
    });
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
      await this.assignRuleToTopics(ruleId, nextScope === 'TOPIC' ? requestedTopicIds : []);
    }

    return this.buildRuleDTO(await this.loadRuleBundle(ruleId, updatedRule));
  }

  async deleteRule(ruleId: string): Promise<void> {
    const existing = await this.repository.findRuleById(ruleId);
    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', `Rule ${ruleId} not found.`);
    }
    await this.ensureAtLeastOneActiveGlobalRule({
      ruleId: existing.id,
      currentScope: existing.scope,
      currentStatus: existing.status,
      nextScope: null,
      nextStatus: null,
    });
    await this.repository.deleteRule(ruleId);
  }

  async triggerRuleRun(ruleId: string, request?: CreateAutoPullRunRequest): Promise<AutoPullRunDTO> {
    return this.enqueueRuleRun(ruleId, request?.trigger_type ?? 'MANUAL', undefined, {
      fullRefresh: request?.full_refresh ?? false,
    });
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

      if (rule.scope === 'TOPIC') {
        const topicIds = await this.repository.listRuleTopicIds(rule.id);
        if (topicIds.length === 0) {
          continue;
        }
      }

      await this.enqueueRuleRun(rule.id, 'SCHEDULE');
    }
  }

  private async enqueueRuleRun(
    ruleId: string,
    triggerType: AutoPullRunRecord['triggerType'],
    sourceFilter?: Set<AutoPullSource>,
    options?: {
      fullRefresh?: boolean;
    },
  ): Promise<AutoPullRunDTO> {
    const bundle = await this.loadRuleBundle(ruleId);
    const rule = bundle.rule;
    if (!rule) {
      throw new AppError(404, 'NOT_FOUND', `Rule ${ruleId} not found.`);
    }
    if (rule.scope === 'TOPIC' && bundle.topicIds.length === 0) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        `Rule ${ruleId} is not bound to any topic. Bind a topic before running.`,
      );
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
          ...(options?.fullRefresh ? { full_refresh: true } : {}),
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
        ...(options?.fullRefresh ? { full_refresh: true } : {}),
      },
      errorCode: null,
      errorMessage: null,
      createdAt: now,
      updatedAt: now,
    });
    this.scheduleRunProcessing(run.id, sourceFilter, options?.fullRefresh ?? false);
    return this.toRunDTO(run);
  }

  private scheduleRunProcessing(
    runId: string,
    sourceFilter?: Set<AutoPullSource>,
    fullRefresh = false,
  ): void {
    if (this.runJobs.has(runId)) {
      return;
    }

    const task = this.processRun(runId, sourceFilter ? new Set(sourceFilter) : undefined, fullRefresh)
      .catch(() => undefined)
      .finally(() => {
        this.runJobs.delete(runId);
      });
    this.runJobs.set(runId, task);
  }

  private async processRun(
    runId: string,
    sourceFilter?: Set<AutoPullSource>,
    fullRefresh = false,
  ): Promise<void> {
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
      const seenRunDedupKeys = new Set<string>();
      const sourcePlans: Array<{ source: AutoPullRuleSourceRecord; defaultTimeWindowMode: SourceTimeWindowMode }> = [];
      for (const source of enabledSources) {
        if (fullRefresh) {
          await this.repository.clearCursor(rule.id, source.source);
        }
        let defaultTimeWindowMode: SourceTimeWindowMode = 'incremental_lookback';
        if (rule.scope === 'GLOBAL') {
          const existingCursor = fullRefresh
            ? null
            : await this.repository.findCursor(rule.id, source.source);
          defaultTimeWindowMode = existingCursor
            ? 'incremental_lookback'
            : 'bootstrap_full_range';
        }
        sourcePlans.push({ source, defaultTimeWindowMode });
      }
      const isInitialPull = rule.scope === 'TOPIC'
        ? topicContexts.some((context) => context.initialPullPending)
        : sourcePlans.every((plan) => plan.defaultTimeWindowMode === 'bootstrap_full_range');
      const effectivePullLimit = this.resolveEffectivePullLimit(rule.querySpec.maxResultsPerSource, isInitialPull);

      for (const plan of sourcePlans) {
        const scopedResults: SourceExecutionResult[] = [];
        for (const context of topicContexts) {
          const timeWindowMode = this.resolveTimeWindowModeForContext(
            rule.scope,
            context,
            plan.defaultTimeWindowMode,
            fullRefresh,
          );
          scopedResults.push(
            await this.executeSource(
              rule,
              plan.source,
              runId,
              context,
              timeWindowMode,
              seenRunDedupKeys,
              effectivePullLimit,
            ),
          );
        }
        sourceResults.push(
          this.aggregateSourceResults(
            plan.source.source,
            scopedResults,
            topicContexts.map((context) => context.topicId),
            skippedTopicIds,
          ),
        );
      }

      const globalEligibleCandidates = sourceResults
        .flatMap((item) => item.eligibleCandidates)
        .sort((left, right) => {
          if (right.rankingScore !== left.rankingScore) {
            return right.rankingScore - left.rankingScore;
          }
          return right.qualityScore - left.qualityScore;
        });
      const selectedCandidates = globalEligibleCandidates.slice(0, effectivePullLimit);
      const imported = selectedCandidates.length > 0
        ? await this.literatureService.importFromAutoPull({
          items: selectedCandidates.map((item) => item.candidate.item),
        })
        : { results: [] };
      const selectedBySource = new Map<AutoPullSource, number>();
      const importedBySource = new Map<AutoPullSource, {
        importedCount: number;
        importedNewCount: number;
        importedExistingCount: number;
        suggestions: SourceExecutionResult['suggestions'];
      }>();
      for (const source of enabledSources) {
        importedBySource.set(source.source, {
          importedCount: 0,
          importedNewCount: 0,
          importedExistingCount: 0,
          suggestions: [],
        });
      }

      selectedCandidates.forEach((item) => {
        selectedBySource.set(item.source, (selectedBySource.get(item.source) ?? 0) + 1);
      });

      imported.results.forEach((result, index) => {
        const selected = selectedCandidates[index];
        if (!selected) {
          return;
        }
        const stats = importedBySource.get(selected.source);
        if (!stats) {
          return;
        }
        stats.importedCount += 1;
        if (result.is_new) {
          stats.importedNewCount += 1;
        } else {
          stats.importedExistingCount += 1;
        }
        stats.suggestions.push({
          literatureId: result.literature_id,
          topicId: selected.topicId,
          suggestedScope: selected.suggestedScope,
          reason: selected.scopeReason,
          score: selected.rankingScore,
        });
      });

      const scopeUpsertByTopic = new Map<string, Array<{
        literature_id: string;
        scope_status: TopicScopeStatus;
        reason: string;
      }>>();
      for (let index = 0; index < imported.results.length; index += 1) {
        const result = imported.results[index];
        const selected = selectedCandidates[index];
        if (!selected || !selected.topicId) {
          continue;
        }
        const actions = scopeUpsertByTopic.get(selected.topicId) ?? [];
        actions.push({
          literature_id: result.literature_id,
          scope_status: selected.suggestedScope,
          reason: selected.scopeReason,
        });
        scopeUpsertByTopic.set(selected.topicId, actions);
      }
      for (const [topicId, actions] of scopeUpsertByTopic.entries()) {
        await this.literatureService.upsertTopicScope(topicId, {
          actions,
        });
      }

      for (const result of sourceResults) {
        const stats = importedBySource.get(result.source) ?? {
          importedCount: 0,
          importedNewCount: 0,
          importedExistingCount: 0,
          suggestions: [],
        };
        const selectedCount = selectedBySource.get(result.source) ?? 0;
        const topkSkippedCount = Math.max(0, result.eligibleCandidates.length - selectedCount);
        result.importedCount = stats.importedCount;
        result.suggestions = stats.suggestions;
        result.meta = {
          ...(result.meta ?? {}),
          configured_limit: rule.querySpec.maxResultsPerSource,
          fetch_limit: effectivePullLimit,
          effective_limit: effectivePullLimit,
          limit_multiplier: isInitialPull ? 5 : 1,
          initial_pull: isInitialPull,
          selected_topk_count: selectedCount,
          topk_skipped_count: topkSkippedCount,
          imported_new_count: stats.importedNewCount,
          imported_existing_count: stats.importedExistingCount,
          imported_count: stats.importedCount,
          failed_count: result.failedCount,
        };
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
      const terminalErrorCode = status === 'FAILED'
        ? this.resolveRunFailureCode(sourceResults)
        : null;
      const terminalErrorMessage = status === 'FAILED'
        ? this.resolveRunFailureMessage(sourceResults, terminalErrorCode)
        : null;

      await this.repository.updateRun(runId, {
        status,
        finishedAt,
        summary: {
          ...runningRun.summary,
          imported_count: totalImported,
          failed_count: totalFailed,
          configured_limit: rule.querySpec.maxResultsPerSource,
          effective_limit: effectivePullLimit,
          limit_multiplier: isInitialPull ? 5 : 1,
          initial_pull: isInitialPull,
          selected_topk_count: selectedCandidates.length,
          deduped_eligible_count: globalEligibleCandidates.length,
          source_total: sourceResults.length,
          ...(rule.scope === 'TOPIC'
            ? {
              active_topic_ids: topicContexts.map((context) => context.topicId),
              skipped_topic_ids: skippedTopicIds,
            }
            : {}),
        },
        errorCode: terminalErrorCode,
        errorMessage: terminalErrorMessage,
        updatedAt: finishedAt,
      });

      if (status === 'SUCCESS' && rule.scope === 'TOPIC') {
        const topicIdsToFinalizeInitialPull = [...new Set(
          topicContexts
            .filter((context) => context.initialPullPending && context.topicId)
            .map((context) => context.topicId as string),
        )];
        for (const topicId of topicIdsToFinalizeInitialPull) {
          await this.repository.updateTopicProfile(topicId, {
            initialPullPending: false,
            updatedAt: finishedAt,
          });
        }
      }

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
          code: terminalErrorCode ?? AUTOPULL_ALERT_CODES.IMPORT_FAILED,
          message: terminalErrorMessage ?? 'All enabled sources failed during run execution.',
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
    timeWindowMode: SourceTimeWindowMode,
    seenRunDedupKeys: Set<string>,
    fetchLimit: number,
  ): Promise<SourceExecutionResult> {
    try {
      const fetchedCandidates = await this.fetchSourceItems(
        source,
        context.querySpec,
        context.timeSpec,
        timeWindowMode,
        fetchLimit,
      );
      const fetchedItems = fetchedCandidates.map((candidate) => candidate.item);
      const rankingMode = this.readRankingMode(source.config);
      const threshold = rule.qualitySpec.minQualityScore;

      const completeCandidates: FetchedCandidate[] = [];
      let incompleteRejectedCount = 0;
      let duplicateSkippedCount = 0;
      let signalRejectedCount = 0;

      for (const candidate of fetchedCandidates) {
        if (!this.isReferenceReady(candidate.item)) {
          incompleteRejectedCount += 1;
          continue;
        }

        const runDedupKey = this.buildRunDedupFingerprint(candidate.item);
        if (runDedupKey && seenRunDedupKeys.has(runDedupKey)) {
          duplicateSkippedCount += 1;
          continue;
        }

        const dedupMatchedBy = await this.literatureService.findImportDedupMatch(candidate.item);
        if (dedupMatchedBy !== 'none') {
          duplicateSkippedCount += 1;
          if (runDedupKey) {
            seenRunDedupKeys.add(runDedupKey);
          }
          continue;
        }

        if (runDedupKey) {
          seenRunDedupKeys.add(runDedupKey);
        }

        if (!this.matchesRuleSignals(candidate.item, context.querySpec)) {
          signalRejectedCount += 1;
          continue;
        }
        completeCandidates.push(candidate);
      }

      const rankedCandidates = await this.scoreRankedCandidates(completeCandidates, rankingMode);
      const scoredCount = rankedCandidates.length;
      const eligibleCandidates = rankedCandidates
        .map((item): EligibleCandidate => ({
          source: source.source,
          topicId: context.topicId,
          candidate: item.candidate,
          qualityScore: item.qualityScore,
          rankingScore: item.rankingScore,
          rankingMode: item.rankingMode,
          suggestedScope: item.qualityScore >= threshold ? 'in_scope' : 'excluded',
          scopeReason: item.qualityScore >= threshold
            ? 'AUTO_RULE_SCORE_GTE_THRESHOLD'
            : 'AUTO_RULE_SCORE_LT_THRESHOLD',
        }));

      await this.repository.upsertCursor({
        id: crypto.randomUUID(),
        ruleId: rule.id,
        source: source.source,
        cursorValue: new Date().toISOString(),
        cursorAt: new Date().toISOString(),
      });

      const belowThresholdCount = eligibleCandidates.filter((item) => item.suggestedScope === 'excluded').length;
      const eligibleCount = eligibleCandidates.filter((item) => item.suggestedScope === 'in_scope').length;
      const failedCount = incompleteRejectedCount + duplicateSkippedCount + signalRejectedCount + belowThresholdCount;
      const llmScoreAvg = scoredCount === 0
        ? null
        : Number((rankedCandidates.reduce((sum, item) => sum + item.qualityScore, 0) / scoredCount).toFixed(2));

      if (failedCount > 0) {
        await this.repository.createAlert({
          id: crypto.randomUUID(),
          ruleId: rule.id,
          runId,
          source: source.source,
          level: 'WARNING',
          code: AUTOPULL_ALERT_CODES.PARSE_FAILED,
          message: `Some fetched items were filtered before global top-k import for ${source.source}.`,
          detail: {
            fetched_count: fetchedItems.length,
            incomplete_rejected_count: incompleteRejectedCount,
            duplicate_skipped_count: duplicateSkippedCount,
            signal_rejected_count: signalRejectedCount,
            scored_count: scoredCount,
            below_threshold_count: belowThresholdCount,
            eligible_count: eligibleCount,
            imported_count: 0,
            topic_id: context.topicId,
          },
          ackAt: null,
          createdAt: new Date().toISOString(),
        });
      }

      return {
        source: source.source,
        fetchedItems,
        eligibleCandidates,
        importedCount: 0,
        failedCount,
        errorCode: null,
        errorMessage: null,
        attemptStatus: failedCount > 0 ? 'PARTIAL' : 'SUCCESS',
        suggestions: [],
        meta: {
          topic_id: context.topicId,
          time_window_mode: timeWindowMode,
          ranking_mode: rankingMode,
          threshold,
          configured_limit: context.querySpec.maxResultsPerSource,
          fetch_limit: fetchLimit,
          fetched_count: fetchedItems.length,
          incomplete_rejected_count: incompleteRejectedCount,
          duplicate_skipped_count: duplicateSkippedCount,
          signal_rejected_count: signalRejectedCount,
          scored_count: scoredCount,
          below_threshold_count: belowThresholdCount,
          eligible_count: eligibleCount,
          imported_new_count: 0,
          imported_existing_count: 0,
          llm_score_avg: llmScoreAvg,
          imported_count: 0,
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
        eligibleCandidates: [],
        importedCount: 0,
        failedCount: 1,
        errorCode: alertCode,
        errorMessage: error instanceof Error ? error.message : 'Unknown source error.',
        attemptStatus: 'FAILED',
        suggestions: [],
        meta: {
          topic_id: context.topicId,
          time_window_mode: timeWindowMode,
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
    if (
      error instanceof AppError
      && error.errorCode === 'INTERNAL_ERROR'
      && error.message.includes(AUTOPULL_ALERT_CODES.QUALITY_SCORE_UNAVAILABLE)
    ) {
      return { alertCode: AUTOPULL_ALERT_CODES.QUALITY_SCORE_UNAVAILABLE, level: 'ERROR' };
    }
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
    timeWindowMode: SourceTimeWindowMode,
    fetchLimit: number,
  ): Promise<FetchedCandidate[]> {
    const queryText = this.buildSearchQuery(querySpec);
    if (source.source === 'CROSSREF') {
      return this.fetchCrossrefItems(
        queryText,
        fetchLimit,
        timeSpec,
        timeWindowMode,
      );
    }
    if (source.source === 'ARXIV') {
      return this.fetchArxivItems(
        queryText,
        fetchLimit,
        timeSpec,
        timeWindowMode,
      );
    }
    return this.fetchZoteroItems(
      queryText,
      source.config,
      fetchLimit,
      timeSpec,
      timeWindowMode,
    );
  }

  private async fetchCrossrefItems(
    query: string,
    limit: number,
    timeSpec: AutoPullTimeSpec,
    timeWindowMode: SourceTimeWindowMode,
  ): Promise<FetchedCandidate[]> {
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
      .filter((item): item is FetchedCandidate => item !== null)
      .filter((item) => this.matchesTimeWindow(item.item, timeSpec, timeWindowMode));
  }

  private async fetchArxivItems(
    query: string,
    limit: number,
    timeSpec: AutoPullTimeSpec,
    timeWindowMode: SourceTimeWindowMode,
  ): Promise<FetchedCandidate[]> {
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
      .filter((item): item is FetchedCandidate => item !== null)
      .filter((item) => this.matchesTimeWindow(item.item, timeSpec, timeWindowMode));
  }

  private async fetchZoteroItems(
    query: string,
    config: Record<string, unknown>,
    maxResultsPerSource: number,
    timeSpec: AutoPullTimeSpec,
    timeWindowMode: SourceTimeWindowMode,
  ): Promise<FetchedCandidate[]> {
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
      .filter((item): item is FetchedCandidate => item !== null)
      .filter((item) => this.matchesTimeWindow(item.item, timeSpec, timeWindowMode));
  }

  private mapCrossrefRecord(record: Record<string, unknown>, fallbackId: string): FetchedCandidate | null {
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
    const publicationStatus = this.resolveCrossrefPublicationStatus(record, year);
    const item: LiteratureImportItem = {
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
    return {
      item,
      rankingSignals: {
        publicationStatus,
        publicationYear: year ?? null,
        citationCount: this.readCrossrefCitationCount(record),
      },
    };
  }

  private mapArxivEntry(entry: string): FetchedCandidate | null {
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
    const item: LiteratureImportItem = {
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
    return {
      item,
      rankingSignals: {
        publicationStatus: 'preprint',
        publicationYear: Number.isFinite(year ?? Number.NaN) ? year ?? null : null,
        citationCount: null,
      },
    };
  }

  private mapZoteroEntry(
    entry: Record<string, unknown>,
    libraryType: ZoteroLibraryType,
    libraryId: string,
  ): FetchedCandidate | null {
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

    const item: LiteratureImportItem = {
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
    return {
      item,
      rankingSignals: {
        publicationStatus: 'unknown',
        publicationYear: year ?? null,
        citationCount: this.readZoteroCitationCount(data),
      },
    };
  }

  private isReferenceReady(item: LiteratureImportItem): boolean {
    const hasTitle = item.title.trim().length > 0;
    const hasAuthors = (item.authors ?? []).length > 0;
    const hasValidYear = typeof item.year === 'number'
      && Number.isInteger(item.year)
      && item.year >= 1900
      && item.year <= 2100;
    const hasIdentifier = Boolean(this.normalizeDoi(item.doi ?? undefined) || this.normalizeArxivId(item.arxiv_id ?? undefined));
    const hasSourceUrl = this.isHttpUrl(item.source_url);
    return hasTitle && hasAuthors && hasValidYear && hasIdentifier && hasSourceUrl;
  }

  private buildRunDedupFingerprint(item: LiteratureImportItem): string | null {
    const doi = this.normalizeDoi(item.doi ?? undefined);
    if (doi) {
      return `doi:${doi}`;
    }
    const arxivId = this.normalizeArxivId(item.arxiv_id ?? undefined);
    if (arxivId) {
      return `arxiv:${arxivId}`;
    }
    const year = item.year ?? null;
    if (!year) {
      return null;
    }
    const title = this.normalizeTitle(item.title);
    const authors = this.normalizeAuthors(item.authors ?? []);
    if (!title || authors.length === 0) {
      return null;
    }
    return `tay:${crypto.createHash('sha1').update(`${title}|${authors.join('|')}|${year}`).digest('hex')}`;
  }

  private async scoreRankedCandidates(
    candidates: FetchedCandidate[],
    rankingMode: AutoPullRankingMode,
  ): Promise<RankedCandidate[]> {
    return scoreAutoPullRankedCandidates(candidates, rankingMode);
  }

  private readRankingMode(config: Record<string, unknown>): AutoPullRankingMode {
    return readAutoPullRankingMode(config);
  }

  private isHttpUrl(value?: string): boolean {
    if (!value) {
      return false;
    }
    return /^https?:\/\/.+/i.test(value.trim());
  }

  private matchesTimeWindow(
    item: LiteratureImportItem,
    timeSpec: AutoPullTimeSpec,
    timeWindowMode: SourceTimeWindowMode,
  ): boolean {
    const nowYear = new Date().getUTCFullYear();
    const maxYear = timeSpec.maxYear ?? nowYear + 1;
    const year = item.year;
    if (!year) {
      return true;
    }
    if (timeWindowMode === 'bootstrap_full_range') {
      const minYear = timeSpec.minYear ?? Number.NEGATIVE_INFINITY;
      return year >= minYear && year <= maxYear;
    }
    const minYearByLookback = nowYear - Math.max(0, timeSpec.lookbackDays / 365);
    const lookbackMinYear = Math.floor(minYearByLookback);
    const minYear = typeof timeSpec.minYear === 'number'
      ? Math.max(timeSpec.minYear, lookbackMinYear)
      : lookbackMinYear;
    return year >= minYear && year <= maxYear;
  }

  private matchesRuleSignals(item: LiteratureImportItem, querySpec: AutoPullQuerySpec): boolean {
    const text = [
      item.title,
      item.abstract ?? '',
      (item.authors ?? []).join(' '),
      item.doi ?? '',
      item.arxiv_id ?? '',
      item.source_url,
      (item.tags ?? []).join(' '),
    ]
      .join(' ')
      .toLowerCase();

    const includeKeywords = querySpec.includeKeywords
      .map((keyword) => keyword.trim().toLowerCase())
      .filter((keyword) => keyword.length > 0);
    if (includeKeywords.length > 0) {
      const hitInclude = includeKeywords.some((keyword) => text.includes(keyword));
      if (!hitInclude) {
        return false;
      }
    }

    const excludeKeywords = querySpec.excludeKeywords
      .map((keyword) => keyword.trim().toLowerCase())
      .filter((keyword) => keyword.length > 0);
    const hitExclude = excludeKeywords.some((keyword) => text.includes(keyword));
    return !hitExclude;
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
    return buildAutoPullRuleDTO(bundle);
  }

  private toTopicProfileDTO(record: TopicProfileRecord, ruleIds: string[]): TopicProfileDTO {
    return toTopicProfileDTO(record, ruleIds);
  }

  private toRunDTO(
    run: AutoPullRunRecord,
    attempts?: AutoPullRunSourceAttemptRecord[],
    suggestions?: AutoPullSuggestionDTO[],
  ): AutoPullRunDTO {
    return toAutoPullRunDTO(run, attempts, suggestions);
  }

  private toSuggestionDTO(record: AutoPullSuggestionRecord): AutoPullSuggestionDTO {
    return toAutoPullSuggestionDTO(record);
  }

  private toAlertDTO(record: AutoPullAlertRecord): AutoPullAlertDTO {
    return toAutoPullAlertDTO(record);
  }

  private normalizeTopicIdsFromPayload(
    topicIds?: string[] | null,
    topicId?: string | null,
  ): string[] {
    return normalizeTopicIdsFromPayload(topicIds, topicId);
  }

  private async ensureAtLeastOneActiveGlobalRule(input: {
    ruleId?: string;
    currentScope?: AutoPullRuleRecord['scope'];
    currentStatus?: AutoPullRuleRecord['status'];
    nextScope: AutoPullRuleRecord['scope'] | null;
    nextStatus: AutoPullRuleRecord['status'] | null;
  }): Promise<void> {
    return ensureAtLeastOneActiveGlobalRule(this.repository, input);
  }

  private resolveNextRuleTopicIds(
    request: UpdateAutoPullRuleRequest,
    existingTopicIds: string[],
    nextScope: AutoPullRuleRecord['scope'],
  ): string[] {
    return resolveNextRuleTopicIds(request, existingTopicIds, nextScope);
  }

  private async loadTopicProfilesOrThrow(topicIds: string[]): Promise<TopicProfileRecord[]> {
    return loadTopicProfilesOrThrow(this.repository, topicIds);
  }

  private async resolveTopicRuleIds(ruleIds: string[]): Promise<string[]> {
    return resolveTopicRuleIds(this.repository, ruleIds);
  }

  private ensureTopicSingleRuleBinding(ruleIds: string[]): void {
    return ensureTopicSingleRuleBinding(ruleIds);
  }

  private async assignRuleToTopics(ruleId: string, topicIds: string[]): Promise<void> {
    return assignRuleToTopics(this.repository, ruleId, topicIds);
  }

  private buildTopicExecutionContexts(
    rule: AutoPullRuleRecord,
    topics: TopicProfileRecord[],
  ): TopicExecutionContext[] {
    return buildTopicExecutionContexts(rule, topics);
  }

  private resolveTimeWindowModeForContext(
    scope: AutoPullScope,
    context: TopicExecutionContext,
    fallbackMode: SourceTimeWindowMode,
    fullRefresh: boolean,
  ): SourceTimeWindowMode {
    return resolveTimeWindowModeForContext(scope, context, fallbackMode, fullRefresh);
  }

  private aggregateSourceResults(
    source: AutoPullSource,
    results: SourceExecutionResult[],
    activeTopicIds: Array<string | null>,
    skippedTopicIds: string[],
  ): SourceExecutionResult {
    const fetchedItems = results.flatMap((item) => item.fetchedItems);
    const eligibleCandidates = results.flatMap((item) => item.eligibleCandidates);
    const importedCount = results.reduce((sum, item) => sum + item.importedCount, 0);
    const failedCount = results.reduce((sum, item) => sum + item.failedCount, 0);
    const incompleteRejectedCount = results.reduce(
      (sum, item) => sum + this.readMetaCount(item.meta, 'incomplete_rejected_count'),
      0,
    );
    const duplicateSkippedCount = results.reduce(
      (sum, item) => sum + this.readMetaCount(item.meta, 'duplicate_skipped_count'),
      0,
    );
    const signalRejectedCount = results.reduce(
      (sum, item) => sum + this.readMetaCount(item.meta, 'signal_rejected_count'),
      0,
    );
    const scoredCount = results.reduce(
      (sum, item) => sum + this.readMetaCount(item.meta, 'scored_count'),
      0,
    );
    const belowThresholdCount = results.reduce(
      (sum, item) => sum + this.readMetaCount(item.meta, 'below_threshold_count'),
      0,
    );
    const eligibleCount = results.reduce(
      (sum, item) => sum + this.readMetaCount(item.meta, 'eligible_count'),
      0,
    );
    const importedNewCount = results.reduce(
      (sum, item) => sum + this.readMetaCount(item.meta, 'imported_new_count'),
      0,
    );
    const importedExistingCount = results.reduce(
      (sum, item) => sum + this.readMetaCount(item.meta, 'imported_existing_count'),
      0,
    );
    const llmScoreWeightedSum = results.reduce((sum, item) => {
      const avg = this.readMetaFloat(item.meta, 'llm_score_avg');
      const count = this.readMetaCount(item.meta, 'scored_count');
      return sum + (avg * count);
    }, 0);
    const llmScoreAvg = scoredCount > 0 ? Number((llmScoreWeightedSum / scoredCount).toFixed(2)) : null;
    const rankingMode = this.readMetaText(results, 'ranking_mode') ?? 'llm_score';
    const threshold = this.readMetaFloatFromResults(results, 'threshold');
    const mergedTimeWindowModes = [...new Set(
      results
        .map((item) => this.readString(item.meta?.time_window_mode))
        .filter((value): value is string => Boolean(value)),
    )];
    const mergedTimeWindowMode = mergedTimeWindowModes.length === 0
      ? 'incremental_lookback'
      : mergedTimeWindowModes.length === 1
        ? mergedTimeWindowModes[0]
        : 'mixed';
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
      eligibleCandidates,
      importedCount,
      failedCount,
      errorCode: firstError?.errorCode ?? null,
      errorMessage: firstError?.errorMessage ?? null,
      attemptStatus,
      suggestions: results.flatMap((item) => item.suggestions),
      meta: {
        topic_ids: activeTopicIds.filter((value): value is string => typeof value === 'string'),
        skipped_topic_ids: skippedTopicIds,
        time_window_mode: mergedTimeWindowMode,
        ranking_mode: rankingMode,
        ...(threshold !== null ? { threshold } : {}),
        fetched_count: fetchedItems.length,
        incomplete_rejected_count: incompleteRejectedCount,
        duplicate_skipped_count: duplicateSkippedCount,
        signal_rejected_count: signalRejectedCount,
        scored_count: scoredCount,
        below_threshold_count: belowThresholdCount,
        eligible_count: eligibleCount,
        imported_new_count: importedNewCount,
        imported_existing_count: importedExistingCount,
        llm_score_avg: llmScoreAvg,
        imported_count: importedCount,
        failed_count: failedCount,
      },
    };
  }

  private resolveRunFailureCode(results: SourceExecutionResult[]): string {
    const codes = [...new Set(results.map((item) => item.errorCode).filter((code): code is string => Boolean(code)))];
    if (codes.length === 1 && codes[0] === AUTOPULL_ALERT_CODES.QUALITY_SCORE_UNAVAILABLE) {
      return AUTOPULL_ALERT_CODES.QUALITY_SCORE_UNAVAILABLE;
    }
    return AUTOPULL_ALERT_CODES.IMPORT_FAILED;
  }

  private resolveRunFailureMessage(
    results: SourceExecutionResult[],
    code: string | null,
  ): string {
    if (code === AUTOPULL_ALERT_CODES.QUALITY_SCORE_UNAVAILABLE) {
      const first = results.find((item) => item.errorCode === AUTOPULL_ALERT_CODES.QUALITY_SCORE_UNAVAILABLE);
      return first?.errorMessage ?? 'Quality scorer is unavailable.';
    }
    return 'All enabled sources failed.';
  }

  private readMetaCount(meta: Record<string, unknown> | undefined, key: string): number {
    const value = meta?.[key];
    return this.readNonNegativeNumber(value) ?? 0;
  }

  private readMetaFloat(meta: Record<string, unknown> | undefined, key: string): number {
    const value = meta?.[key];
    return this.readNonNegativeNumber(value) ?? 0;
  }

  private readMetaText(results: SourceExecutionResult[], key: string): string | null {
    for (const item of results) {
      const meta = item.meta;
      if (!meta) {
        continue;
      }
      const value = this.readString(meta[key]);
      if (value) {
        return value;
      }
    }
    return null;
  }

  private readMetaFloatFromResults(results: SourceExecutionResult[], key: string): number | null {
    for (const item of results) {
      const meta = item.meta;
      if (!meta) {
        continue;
      }
      const value = this.readNonNegativeNumber(meta[key]);
      if (value !== null) {
        return value;
      }
    }
    return null;
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
    const minScore = qualitySpec?.min_quality_score ?? 70;
    return {
      minQualityScore: Number.isFinite(minScore)
        ? Math.max(0, Math.min(100, Math.round(minScore)))
        : 70,
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

  private resolveEffectivePullLimit(baseLimit: number, initialPull: boolean): number {
    const multiplier = initialPull ? 5 : 1;
    return Math.max(1, Math.min(1000, baseLimit * multiplier));
  }

  private buildSearchQuery(querySpec: AutoPullQuerySpec): string {
    const segments = [...querySpec.includeKeywords];
    if (querySpec.excludeKeywords.length > 0) {
      segments.push(...querySpec.excludeKeywords.map((keyword) => `-${keyword}`));
    }
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

  private readNonNegativeNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number.parseFloat(value.trim());
      if (Number.isFinite(parsed) && parsed >= 0) {
        return parsed;
      }
    }
    return null;
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

  private normalizeTitle(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private normalizeAuthors(authors: string[]): string[] {
    return authors
      .map((name) =>
        name
          .trim()
          .toLowerCase()
          .replace(/[^\p{L}\p{N}]+/gu, ' ')
          .replace(/\s+/g, ' ')
          .trim(),
      )
      .filter((name) => name.length > 0)
      .sort();
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

  private resolveCrossrefPublicationStatus(
    record: Record<string, unknown>,
    publishedYear: number | undefined,
  ): PublicationStatusSignal {
    if (typeof publishedYear === 'number' && Number.isFinite(publishedYear)) {
      return 'published';
    }
    const accepted = this.readRecord(record.accepted);
    const acceptedDateParts = accepted?.['date-parts'];
    if (Array.isArray(acceptedDateParts) && acceptedDateParts.length > 0) {
      return 'accepted';
    }
    return 'unknown';
  }

  private readCrossrefCitationCount(record: Record<string, unknown>): number | null {
    return this.readNonNegativeNumber(record['is-referenced-by-count']);
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

  private readZoteroCitationCount(record: Record<string, unknown>): number | null {
    return this.readNonNegativeNumber(
      record.numCitations ?? record.citationCount ?? record.timesCited,
    );
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
