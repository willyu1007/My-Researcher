import type { Prisma, PrismaClient } from '@prisma/client';
import type {
  AutoPullAlertLevel,
  AutoPullRunStatus,
  AutoPullSource,
} from '@paper-engineering-assistant/shared/research-lifecycle/auto-pull-contracts';
import type {
  AutoPullAlertRecord,
  AutoPullCursorRecord,
  AutoPullRepository,
  AutoPullRuleRecord,
  AutoPullRuleScheduleRecord,
  AutoPullRuleSourceRecord,
  AutoPullRunRecord,
  AutoPullRunSourceAttemptRecord,
  AutoPullSuggestionRecord,
  TopicProfileRecord,
} from '../auto-pull-repository.js';

function toTopicProfileRecord(row: {
  id: string;
  name: string;
  isActive: boolean;
  initialPullPending: boolean;
  includeKeywords: string[];
  excludeKeywords: string[];
  venueFilters: string[];
  defaultLookbackDays: number;
  defaultMinYear: number | null;
  defaultMaxYear: number | null;
  createdAt: Date;
  updatedAt: Date;
}): TopicProfileRecord {
  return {
    id: row.id,
    name: row.name,
    isActive: row.isActive,
    initialPullPending: row.initialPullPending,
    includeKeywords: row.includeKeywords,
    excludeKeywords: row.excludeKeywords,
    venueFilters: row.venueFilters,
    defaultLookbackDays: row.defaultLookbackDays,
    defaultMinYear: row.defaultMinYear,
    defaultMaxYear: row.defaultMaxYear,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toRuleRecord(row: {
  id: string;
  scope: string;
  name: string;
  status: string;
  querySpec: Prisma.JsonValue;
  timeSpec: Prisma.JsonValue;
  qualitySpec: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
}): AutoPullRuleRecord {
  return {
    id: row.id,
    scope: row.scope as AutoPullRuleRecord['scope'],
    name: row.name,
    status: row.status as AutoPullRuleRecord['status'],
    querySpec: (row.querySpec as AutoPullRuleRecord['querySpec']) ?? {
      includeKeywords: [],
      excludeKeywords: [],
      authors: [],
      venues: [],
      maxResultsPerSource: 20,
    },
    timeSpec: (row.timeSpec as AutoPullRuleRecord['timeSpec']) ?? {
      lookbackDays: 30,
      minYear: null,
      maxYear: null,
    },
    qualitySpec: (row.qualitySpec as AutoPullRuleRecord['qualitySpec']) ?? {
      minQualityScore: 70,
    },
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toRuleSourceRecord(row: {
  id: string;
  ruleId: string;
  source: string;
  enabled: boolean;
  priority: number;
  config: Prisma.JsonValue;
}): AutoPullRuleSourceRecord {
  return {
    id: row.id,
    ruleId: row.ruleId,
    source: row.source as AutoPullSource,
    enabled: row.enabled,
    priority: row.priority,
    config: (row.config as Record<string, unknown>) ?? {},
  };
}

function toRuleScheduleRecord(row: {
  id: string;
  ruleId: string;
  frequency: string;
  daysOfWeek: string[];
  hour: number;
  minute: number;
  timezone: string;
  active: boolean;
}): AutoPullRuleScheduleRecord {
  return {
    id: row.id,
    ruleId: row.ruleId,
    frequency: row.frequency as AutoPullRuleScheduleRecord['frequency'],
    daysOfWeek: row.daysOfWeek,
    hour: row.hour,
    minute: row.minute,
    timezone: row.timezone,
    active: row.active,
  };
}

function toRunRecord(row: {
  id: string;
  ruleId: string;
  triggerType: string;
  status: string;
  startedAt: Date | null;
  finishedAt: Date | null;
  summary: Prisma.JsonValue;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}): AutoPullRunRecord {
  return {
    id: row.id,
    ruleId: row.ruleId,
    triggerType: row.triggerType as AutoPullRunRecord['triggerType'],
    status: row.status as AutoPullRunRecord['status'],
    startedAt: row.startedAt?.toISOString() ?? null,
    finishedAt: row.finishedAt?.toISOString() ?? null,
    summary: (row.summary as Record<string, unknown>) ?? {},
    errorCode: row.errorCode,
    errorMessage: row.errorMessage,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toRunAttemptRecord(row: {
  id: string;
  runId: string;
  source: string;
  status: string;
  fetchedCount: number;
  importedCount: number;
  failedCount: number;
  errorCode: string | null;
  errorMessage: string | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  meta: Prisma.JsonValue;
}): AutoPullRunSourceAttemptRecord {
  return {
    id: row.id,
    runId: row.runId,
    source: row.source as AutoPullSource,
    status: row.status as AutoPullRunSourceAttemptRecord['status'],
    fetchedCount: row.fetchedCount,
    importedCount: row.importedCount,
    failedCount: row.failedCount,
    errorCode: row.errorCode,
    errorMessage: row.errorMessage,
    startedAt: row.startedAt?.toISOString() ?? null,
    finishedAt: row.finishedAt?.toISOString() ?? null,
    meta: (row.meta as Record<string, unknown>) ?? {},
  };
}

function toCursorRecord(row: {
  id: string;
  ruleId: string;
  source: string;
  cursorValue: string;
  cursorAt: Date;
}): AutoPullCursorRecord {
  return {
    id: row.id,
    ruleId: row.ruleId,
    source: row.source as AutoPullSource,
    cursorValue: row.cursorValue,
    cursorAt: row.cursorAt.toISOString(),
  };
}

function toAlertRecord(row: {
  id: string;
  ruleId: string;
  runId: string | null;
  source: string | null;
  level: string;
  code: string;
  message: string;
  detail: Prisma.JsonValue;
  ackAt: Date | null;
  createdAt: Date;
}): AutoPullAlertRecord {
  return {
    id: row.id,
    ruleId: row.ruleId,
    runId: row.runId,
    source: (row.source as AutoPullAlertRecord['source']) ?? null,
    level: row.level as AutoPullAlertRecord['level'],
    code: row.code,
    message: row.message,
    detail: (row.detail as Record<string, unknown>) ?? {},
    ackAt: row.ackAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

function toSuggestionRecord(row: {
  id: string;
  runId: string;
  literatureId: string;
  topicId: string | null;
  suggestedScope: string;
  reason: string;
  score: number;
  createdAt: Date;
}): AutoPullSuggestionRecord {
  return {
    id: row.id,
    runId: row.runId,
    literatureId: row.literatureId,
    topicId: row.topicId,
    suggestedScope: row.suggestedScope as AutoPullSuggestionRecord['suggestedScope'],
    reason: row.reason,
    score: row.score,
    createdAt: row.createdAt.toISOString(),
  };
}

export class PrismaAutoPullRepository implements AutoPullRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createTopicProfile(record: TopicProfileRecord): Promise<TopicProfileRecord> {
    const created = await this.prisma.topicProfile.create({
      data: {
        id: record.id,
        name: record.name,
        isActive: record.isActive,
        initialPullPending: record.initialPullPending,
        includeKeywords: record.includeKeywords,
        excludeKeywords: record.excludeKeywords,
        venueFilters: record.venueFilters,
        defaultLookbackDays: record.defaultLookbackDays,
        defaultMinYear: record.defaultMinYear,
        defaultMaxYear: record.defaultMaxYear,
        createdAt: new Date(record.createdAt),
        updatedAt: new Date(record.updatedAt),
      },
    });
    return toTopicProfileRecord(created);
  }

  async listTopicProfiles(): Promise<TopicProfileRecord[]> {
    const rows = await this.prisma.topicProfile.findMany({
      orderBy: { id: 'asc' },
    });
    return rows.map((row) => toTopicProfileRecord(row));
  }

  async findTopicProfileById(topicId: string): Promise<TopicProfileRecord | null> {
    const row = await this.prisma.topicProfile.findUnique({ where: { id: topicId } });
    return row ? toTopicProfileRecord(row) : null;
  }

  async updateTopicProfile(
    topicId: string,
    patch: Partial<Omit<TopicProfileRecord, 'id' | 'createdAt'>>,
  ): Promise<TopicProfileRecord> {
    const updated = await this.prisma.topicProfile.update({
      where: { id: topicId },
      data: {
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.isActive !== undefined ? { isActive: patch.isActive } : {}),
        ...(patch.initialPullPending !== undefined ? { initialPullPending: patch.initialPullPending } : {}),
        ...(patch.includeKeywords !== undefined ? { includeKeywords: patch.includeKeywords } : {}),
        ...(patch.excludeKeywords !== undefined ? { excludeKeywords: patch.excludeKeywords } : {}),
        ...(patch.venueFilters !== undefined ? { venueFilters: patch.venueFilters } : {}),
        ...(patch.defaultLookbackDays !== undefined ? { defaultLookbackDays: patch.defaultLookbackDays } : {}),
        ...(patch.defaultMinYear !== undefined ? { defaultMinYear: patch.defaultMinYear } : {}),
        ...(patch.defaultMaxYear !== undefined ? { defaultMaxYear: patch.defaultMaxYear } : {}),
        ...(patch.updatedAt !== undefined ? { updatedAt: new Date(patch.updatedAt) } : {}),
      },
    });
    return toTopicProfileRecord(updated);
  }

  async createRule(record: AutoPullRuleRecord): Promise<AutoPullRuleRecord> {
    const created = await this.prisma.autoPullRule.create({
      data: {
        id: record.id,
        scope: record.scope,
        name: record.name,
        status: record.status,
        querySpec: record.querySpec as Prisma.InputJsonValue,
        timeSpec: record.timeSpec as Prisma.InputJsonValue,
        qualitySpec: record.qualitySpec as Prisma.InputJsonValue,
        createdAt: new Date(record.createdAt),
        updatedAt: new Date(record.updatedAt),
      },
    });
    return toRuleRecord(created);
  }

  async findRuleById(ruleId: string): Promise<AutoPullRuleRecord | null> {
    const row = await this.prisma.autoPullRule.findUnique({ where: { id: ruleId } });
    return row ? toRuleRecord(row) : null;
  }

  async listRules(filters?: {
    scope?: AutoPullRuleRecord['scope'];
    topicId?: string;
    status?: AutoPullRuleRecord['status'];
  }): Promise<AutoPullRuleRecord[]> {
    const rows = await this.prisma.autoPullRule.findMany({
      where: {
        ...(filters?.scope ? { scope: filters.scope } : {}),
        ...(filters?.topicId
          ? {
            topics: {
              some: {
                topicId: filters.topicId,
              },
            },
          }
          : {}),
        ...(filters?.status ? { status: filters.status } : {}),
      },
      orderBy: { updatedAt: 'desc' },
    });
    return rows.map((row) => toRuleRecord(row));
  }

  async updateRule(
    ruleId: string,
    patch: Partial<Omit<AutoPullRuleRecord, 'id' | 'createdAt'>>,
  ): Promise<AutoPullRuleRecord> {
    const updated = await this.prisma.autoPullRule.update({
      where: { id: ruleId },
      data: {
        ...(patch.scope !== undefined ? { scope: patch.scope } : {}),
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.querySpec !== undefined
          ? { querySpec: patch.querySpec as Prisma.InputJsonValue }
          : {}),
        ...(patch.timeSpec !== undefined
          ? { timeSpec: patch.timeSpec as Prisma.InputJsonValue }
          : {}),
        ...(patch.qualitySpec !== undefined
          ? { qualitySpec: patch.qualitySpec as Prisma.InputJsonValue }
          : {}),
        ...(patch.updatedAt !== undefined ? { updatedAt: new Date(patch.updatedAt) } : {}),
      },
    });
    return toRuleRecord(updated);
  }

  async deleteRule(ruleId: string): Promise<void> {
    await this.prisma.autoPullRule.delete({ where: { id: ruleId } });
  }

  async replaceRuleSources(ruleId: string, sources: AutoPullRuleSourceRecord[]): Promise<void> {
    await this.prisma.autoPullRuleSource.deleteMany({ where: { ruleId } });
    if (sources.length === 0) {
      return;
    }

    await this.prisma.autoPullRuleSource.createMany({
      data: sources.map((source) => ({
        id: source.id,
        ruleId,
        source: source.source,
        enabled: source.enabled,
        priority: source.priority,
        config: source.config as Prisma.InputJsonValue,
      })),
    });
  }

  async listRuleSources(ruleId: string): Promise<AutoPullRuleSourceRecord[]> {
    const rows = await this.prisma.autoPullRuleSource.findMany({
      where: { ruleId },
      orderBy: { priority: 'asc' },
    });
    return rows.map((row) => toRuleSourceRecord(row));
  }

  async replaceRuleTopics(ruleId: string, topicIds: string[]): Promise<void> {
    await this.prisma.autoPullRuleTopic.deleteMany({ where: { ruleId } });
    const uniqueTopicIds = [...new Set(topicIds)];
    if (uniqueTopicIds.length === 0) {
      return;
    }

    await this.prisma.autoPullRuleTopic.createMany({
      data: uniqueTopicIds.map((topicId) => ({
        id: `rule-topic:${ruleId}:${topicId}`,
        ruleId,
        topicId,
        createdAt: new Date(),
      })),
    });
  }

  async listRuleTopics(ruleId: string): Promise<TopicProfileRecord[]> {
    const rows = await this.prisma.autoPullRuleTopic.findMany({
      where: { ruleId },
      include: { topic: true },
      orderBy: { topicId: 'asc' },
    });
    return rows.map((row) => toTopicProfileRecord(row.topic));
  }

  async listRuleTopicIds(ruleId: string): Promise<string[]> {
    const rows = await this.prisma.autoPullRuleTopic.findMany({
      where: { ruleId },
      select: { topicId: true },
      orderBy: { topicId: 'asc' },
    });
    return rows.map((row) => row.topicId);
  }

  async replaceRuleSchedules(ruleId: string, schedules: AutoPullRuleScheduleRecord[]): Promise<void> {
    await this.prisma.autoPullRuleSchedule.deleteMany({ where: { ruleId } });
    if (schedules.length === 0) {
      return;
    }
    await this.prisma.autoPullRuleSchedule.createMany({
      data: schedules.map((schedule) => ({
        id: schedule.id,
        ruleId,
        frequency: schedule.frequency,
        daysOfWeek: schedule.daysOfWeek,
        hour: schedule.hour,
        minute: schedule.minute,
        timezone: schedule.timezone,
        active: schedule.active,
      })),
    });
  }

  async listRuleSchedules(ruleId: string): Promise<AutoPullRuleScheduleRecord[]> {
    const rows = await this.prisma.autoPullRuleSchedule.findMany({
      where: { ruleId },
      orderBy: [{ hour: 'asc' }, { minute: 'asc' }],
    });
    return rows.map((row) => toRuleScheduleRecord(row));
  }

  async replaceTopicRules(topicId: string, ruleIds: string[]): Promise<void> {
    await this.prisma.autoPullRuleTopic.deleteMany({ where: { topicId } });
    const uniqueRuleIds = [...new Set(ruleIds)];
    if (uniqueRuleIds.length === 0) {
      return;
    }

    await this.prisma.autoPullRuleTopic.createMany({
      data: uniqueRuleIds.map((ruleId) => ({
        id: `rule-topic:${ruleId}:${topicId}`,
        ruleId,
        topicId,
        createdAt: new Date(),
      })),
    });
  }

  async listTopicRuleIds(topicId: string): Promise<string[]> {
    const rows = await this.prisma.autoPullRuleTopic.findMany({
      where: { topicId },
      select: { ruleId: true },
      orderBy: { ruleId: 'asc' },
    });
    return rows.map((row) => row.ruleId);
  }

  async createRun(record: AutoPullRunRecord): Promise<AutoPullRunRecord> {
    const created = await this.prisma.autoPullRun.create({
      data: {
        id: record.id,
        ruleId: record.ruleId,
        triggerType: record.triggerType,
        status: record.status,
        startedAt: record.startedAt ? new Date(record.startedAt) : null,
        finishedAt: record.finishedAt ? new Date(record.finishedAt) : null,
        summary: record.summary as Prisma.InputJsonValue,
        errorCode: record.errorCode,
        errorMessage: record.errorMessage,
        createdAt: new Date(record.createdAt),
        updatedAt: new Date(record.updatedAt),
      },
    });
    return toRunRecord(created);
  }

  async findRunById(runId: string): Promise<AutoPullRunRecord | null> {
    const row = await this.prisma.autoPullRun.findUnique({ where: { id: runId } });
    return row ? toRunRecord(row) : null;
  }

  async listRuns(filters?: {
    ruleId?: string;
    status?: AutoPullRunStatus;
    limit?: number;
  }): Promise<AutoPullRunRecord[]> {
    const rows = await this.prisma.autoPullRun.findMany({
      where: {
        ...(filters?.ruleId ? { ruleId: filters.ruleId } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: filters?.limit ?? 50,
    });
    return rows.map((row) => toRunRecord(row));
  }

  async listInFlightRunsByRuleId(ruleId: string): Promise<AutoPullRunRecord[]> {
    const rows = await this.prisma.autoPullRun.findMany({
      where: {
        ruleId,
        status: {
          in: ['PENDING', 'RUNNING'],
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => toRunRecord(row));
  }

  async updateRun(
    runId: string,
    patch: Partial<Omit<AutoPullRunRecord, 'id' | 'ruleId' | 'triggerType' | 'createdAt'>>,
  ): Promise<AutoPullRunRecord> {
    const updated = await this.prisma.autoPullRun.update({
      where: { id: runId },
      data: {
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.startedAt !== undefined
          ? { startedAt: patch.startedAt ? new Date(patch.startedAt) : null }
          : {}),
        ...(patch.finishedAt !== undefined
          ? { finishedAt: patch.finishedAt ? new Date(patch.finishedAt) : null }
          : {}),
        ...(patch.summary !== undefined ? { summary: patch.summary as Prisma.InputJsonValue } : {}),
        ...(patch.errorCode !== undefined ? { errorCode: patch.errorCode } : {}),
        ...(patch.errorMessage !== undefined ? { errorMessage: patch.errorMessage } : {}),
        ...(patch.updatedAt !== undefined ? { updatedAt: new Date(patch.updatedAt) } : {}),
      },
    });
    return toRunRecord(updated);
  }

  async listRunningRunsByRuleId(ruleId: string): Promise<AutoPullRunRecord[]> {
    const rows = await this.prisma.autoPullRun.findMany({
      where: {
        ruleId,
        status: 'RUNNING',
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => toRunRecord(row));
  }

  async createRunSourceAttempts(records: AutoPullRunSourceAttemptRecord[]): Promise<void> {
    if (records.length === 0) {
      return;
    }

    await this.prisma.autoPullRunSourceAttempt.createMany({
      data: records.map((record) => ({
        id: record.id,
        runId: record.runId,
        source: record.source,
        status: record.status,
        fetchedCount: record.fetchedCount,
        importedCount: record.importedCount,
        failedCount: record.failedCount,
        errorCode: record.errorCode,
        errorMessage: record.errorMessage,
        startedAt: record.startedAt ? new Date(record.startedAt) : null,
        finishedAt: record.finishedAt ? new Date(record.finishedAt) : null,
        meta: record.meta as Prisma.InputJsonValue,
      })),
    });
  }

  async listRunSourceAttempts(runId: string): Promise<AutoPullRunSourceAttemptRecord[]> {
    const rows = await this.prisma.autoPullRunSourceAttempt.findMany({
      where: { runId },
      orderBy: { source: 'asc' },
    });
    return rows.map((row) => toRunAttemptRecord(row));
  }

  async upsertCursor(record: AutoPullCursorRecord): Promise<AutoPullCursorRecord> {
    const existing = await this.prisma.autoPullCursor.findUnique({
      where: {
        ruleId_source: {
          ruleId: record.ruleId,
          source: record.source,
        },
      },
    });

    if (existing) {
      const updated = await this.prisma.autoPullCursor.update({
        where: { id: existing.id },
        data: {
          cursorValue: record.cursorValue,
          cursorAt: new Date(record.cursorAt),
        },
      });
      return toCursorRecord(updated);
    }

    const created = await this.prisma.autoPullCursor.create({
      data: {
        id: record.id,
        ruleId: record.ruleId,
        source: record.source,
        cursorValue: record.cursorValue,
        cursorAt: new Date(record.cursorAt),
      },
    });
    return toCursorRecord(created);
  }

  async findCursor(ruleId: string, source: AutoPullSource): Promise<AutoPullCursorRecord | null> {
    const row = await this.prisma.autoPullCursor.findUnique({
      where: {
        ruleId_source: {
          ruleId,
          source,
        },
      },
    });
    return row ? toCursorRecord(row) : null;
  }

  async clearCursor(ruleId: string, source?: AutoPullSource): Promise<void> {
    await this.prisma.autoPullCursor.deleteMany({
      where: {
        ruleId,
        ...(source ? { source } : {}),
      },
    });
  }

  async createAlert(record: AutoPullAlertRecord): Promise<AutoPullAlertRecord> {
    const created = await this.prisma.autoPullAlert.create({
      data: {
        id: record.id,
        ruleId: record.ruleId,
        runId: record.runId,
        source: record.source,
        level: record.level,
        code: record.code,
        message: record.message,
        detail: record.detail as Prisma.InputJsonValue,
        ackAt: record.ackAt ? new Date(record.ackAt) : null,
        createdAt: new Date(record.createdAt),
      },
    });
    return toAlertRecord(created);
  }

  async listAlerts(filters?: {
    ruleId?: string;
    level?: AutoPullAlertLevel;
    acked?: boolean;
    limit?: number;
  }): Promise<AutoPullAlertRecord[]> {
    const rows = await this.prisma.autoPullAlert.findMany({
      where: {
        ...(filters?.ruleId ? { ruleId: filters.ruleId } : {}),
        ...(filters?.level ? { level: filters.level } : {}),
        ...(filters?.acked === undefined
          ? {}
          : filters.acked
            ? { ackAt: { not: null } }
            : { ackAt: null }),
      },
      orderBy: { createdAt: 'desc' },
      take: filters?.limit ?? 100,
    });
    return rows.map((row) => toAlertRecord(row));
  }

  async acknowledgeAlert(alertId: string, ackAt: string): Promise<AutoPullAlertRecord> {
    const updated = await this.prisma.autoPullAlert.update({
      where: { id: alertId },
      data: {
        ackAt: new Date(ackAt),
      },
    });
    return toAlertRecord(updated);
  }

  async createSuggestions(records: AutoPullSuggestionRecord[]): Promise<void> {
    if (records.length === 0) {
      return;
    }
    await this.prisma.autoPullSuggestion.createMany({
      data: records.map((record) => ({
        id: record.id,
        runId: record.runId,
        literatureId: record.literatureId,
        topicId: record.topicId,
        suggestedScope: record.suggestedScope,
        reason: record.reason,
        score: record.score,
        createdAt: new Date(record.createdAt),
      })),
    });
  }

  async listSuggestionsByRunId(runId: string): Promise<AutoPullSuggestionRecord[]> {
    const rows = await this.prisma.autoPullSuggestion.findMany({
      where: { runId },
      orderBy: { score: 'desc' },
    });
    return rows.map((row) => toSuggestionRecord(row));
  }
}
