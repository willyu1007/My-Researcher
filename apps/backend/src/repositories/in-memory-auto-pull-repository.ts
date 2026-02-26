import type {
  AutoPullAlertLevel,
  AutoPullRuleStatus,
  AutoPullRunStatus,
  AutoPullScope,
  AutoPullSource,
} from '@paper-engineering-assistant/shared';
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
} from './auto-pull-repository.js';

export class InMemoryAutoPullRepository implements AutoPullRepository {
  private readonly topicProfiles = new Map<string, TopicProfileRecord>();

  private readonly rules = new Map<string, AutoPullRuleRecord>();
  private readonly ruleSourcesByRule = new Map<string, AutoPullRuleSourceRecord[]>();
  private readonly ruleSchedulesByRule = new Map<string, AutoPullRuleScheduleRecord[]>();

  private readonly runs = new Map<string, AutoPullRunRecord>();
  private readonly runAttemptsByRun = new Map<string, AutoPullRunSourceAttemptRecord[]>();
  private readonly suggestionsByRun = new Map<string, AutoPullSuggestionRecord[]>();

  private readonly cursorByRuleSource = new Map<string, AutoPullCursorRecord>();
  private readonly alerts = new Map<string, AutoPullAlertRecord>();

  async createTopicProfile(record: TopicProfileRecord): Promise<TopicProfileRecord> {
    this.topicProfiles.set(record.id, record);
    return record;
  }

  async listTopicProfiles(): Promise<TopicProfileRecord[]> {
    return [...this.topicProfiles.values()].sort((a, b) => a.id.localeCompare(b.id));
  }

  async findTopicProfileById(topicId: string): Promise<TopicProfileRecord | null> {
    return this.topicProfiles.get(topicId) ?? null;
  }

  async updateTopicProfile(
    topicId: string,
    patch: Partial<Omit<TopicProfileRecord, 'id' | 'createdAt'>>,
  ): Promise<TopicProfileRecord> {
    const existing = this.topicProfiles.get(topicId);
    if (!existing) {
      throw new Error(`Topic profile ${topicId} not found.`);
    }

    const next: TopicProfileRecord = {
      ...existing,
      ...patch,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: patch.updatedAt ?? existing.updatedAt,
    };
    this.topicProfiles.set(topicId, next);
    return next;
  }

  async createRule(record: AutoPullRuleRecord): Promise<AutoPullRuleRecord> {
    this.rules.set(record.id, record);
    return record;
  }

  async findRuleById(ruleId: string): Promise<AutoPullRuleRecord | null> {
    return this.rules.get(ruleId) ?? null;
  }

  async listRules(filters?: {
    scope?: AutoPullScope;
    topicId?: string;
    status?: AutoPullRuleStatus;
  }): Promise<AutoPullRuleRecord[]> {
    return [...this.rules.values()]
      .filter((rule) => (filters?.scope ? rule.scope === filters.scope : true))
      .filter((rule) => (filters?.topicId ? rule.topicId === filters.topicId : true))
      .filter((rule) => (filters?.status ? rule.status === filters.status : true))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async updateRule(
    ruleId: string,
    patch: Partial<Omit<AutoPullRuleRecord, 'id' | 'createdAt'>>,
  ): Promise<AutoPullRuleRecord> {
    const existing = this.rules.get(ruleId);
    if (!existing) {
      throw new Error(`Rule ${ruleId} not found.`);
    }

    const next: AutoPullRuleRecord = {
      ...existing,
      ...patch,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: patch.updatedAt ?? existing.updatedAt,
    };
    this.rules.set(ruleId, next);
    return next;
  }

  async deleteRule(ruleId: string): Promise<void> {
    this.rules.delete(ruleId);
    this.ruleSourcesByRule.delete(ruleId);
    this.ruleSchedulesByRule.delete(ruleId);

    const runIds = [...this.runs.values()]
      .filter((run) => run.ruleId === ruleId)
      .map((run) => run.id);
    for (const runId of runIds) {
      this.runs.delete(runId);
      this.runAttemptsByRun.delete(runId);
      this.suggestionsByRun.delete(runId);
    }

    for (const [key, cursor] of this.cursorByRuleSource.entries()) {
      if (cursor.ruleId === ruleId) {
        this.cursorByRuleSource.delete(key);
      }
    }
    for (const [alertId, alert] of this.alerts.entries()) {
      if (alert.ruleId === ruleId) {
        this.alerts.delete(alertId);
      }
    }
  }

  async replaceRuleSources(ruleId: string, sources: AutoPullRuleSourceRecord[]): Promise<void> {
    this.ruleSourcesByRule.set(ruleId, [...sources]);
  }

  async listRuleSources(ruleId: string): Promise<AutoPullRuleSourceRecord[]> {
    const items = this.ruleSourcesByRule.get(ruleId) ?? [];
    return [...items].sort((a, b) => a.priority - b.priority);
  }

  async replaceRuleSchedules(ruleId: string, schedules: AutoPullRuleScheduleRecord[]): Promise<void> {
    this.ruleSchedulesByRule.set(ruleId, [...schedules]);
  }

  async listRuleSchedules(ruleId: string): Promise<AutoPullRuleScheduleRecord[]> {
    return [...(this.ruleSchedulesByRule.get(ruleId) ?? [])];
  }

  async createRun(record: AutoPullRunRecord): Promise<AutoPullRunRecord> {
    this.runs.set(record.id, record);
    return record;
  }

  async findRunById(runId: string): Promise<AutoPullRunRecord | null> {
    return this.runs.get(runId) ?? null;
  }

  async listRuns(filters?: {
    ruleId?: string;
    status?: AutoPullRunStatus;
    limit?: number;
  }): Promise<AutoPullRunRecord[]> {
    const limit = filters?.limit ?? 50;
    return [...this.runs.values()]
      .filter((run) => (filters?.ruleId ? run.ruleId === filters.ruleId : true))
      .filter((run) => (filters?.status ? run.status === filters.status : true))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  async listInFlightRunsByRuleId(ruleId: string): Promise<AutoPullRunRecord[]> {
    return [...this.runs.values()]
      .filter((run) => run.ruleId === ruleId)
      .filter((run) => run.status === 'PENDING' || run.status === 'RUNNING')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async updateRun(
    runId: string,
    patch: Partial<Omit<AutoPullRunRecord, 'id' | 'ruleId' | 'triggerType' | 'createdAt'>>,
  ): Promise<AutoPullRunRecord> {
    const existing = this.runs.get(runId);
    if (!existing) {
      throw new Error(`Run ${runId} not found.`);
    }
    const next: AutoPullRunRecord = {
      ...existing,
      ...patch,
      id: existing.id,
      ruleId: existing.ruleId,
      triggerType: existing.triggerType,
      createdAt: existing.createdAt,
      updatedAt: patch.updatedAt ?? existing.updatedAt,
    };
    this.runs.set(runId, next);
    return next;
  }

  async listRunningRunsByRuleId(ruleId: string): Promise<AutoPullRunRecord[]> {
    return [...this.runs.values()].filter((run) => run.ruleId === ruleId && run.status === 'RUNNING');
  }

  async createRunSourceAttempts(records: AutoPullRunSourceAttemptRecord[]): Promise<void> {
    for (const record of records) {
      const current = this.runAttemptsByRun.get(record.runId) ?? [];
      current.push(record);
      this.runAttemptsByRun.set(record.runId, current);
    }
  }

  async listRunSourceAttempts(runId: string): Promise<AutoPullRunSourceAttemptRecord[]> {
    return [...(this.runAttemptsByRun.get(runId) ?? [])];
  }

  async upsertCursor(record: AutoPullCursorRecord): Promise<AutoPullCursorRecord> {
    this.cursorByRuleSource.set(this.cursorKey(record.ruleId, record.source), record);
    return record;
  }

  async findCursor(ruleId: string, source: AutoPullSource): Promise<AutoPullCursorRecord | null> {
    return this.cursorByRuleSource.get(this.cursorKey(ruleId, source)) ?? null;
  }

  async createAlert(record: AutoPullAlertRecord): Promise<AutoPullAlertRecord> {
    this.alerts.set(record.id, record);
    return record;
  }

  async listAlerts(filters?: {
    ruleId?: string;
    level?: AutoPullAlertLevel;
    acked?: boolean;
    limit?: number;
  }): Promise<AutoPullAlertRecord[]> {
    const limit = filters?.limit ?? 100;
    return [...this.alerts.values()]
      .filter((alert) => (filters?.ruleId ? alert.ruleId === filters.ruleId : true))
      .filter((alert) => (filters?.level ? alert.level === filters.level : true))
      .filter((alert) => (
        filters?.acked === undefined
          ? true
          : filters.acked
            ? alert.ackAt !== null
            : alert.ackAt === null
      ))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  async acknowledgeAlert(alertId: string, ackAt: string): Promise<AutoPullAlertRecord> {
    const existing = this.alerts.get(alertId);
    if (!existing) {
      throw new Error(`Alert ${alertId} not found.`);
    }
    const next: AutoPullAlertRecord = {
      ...existing,
      ackAt,
    };
    this.alerts.set(alertId, next);
    return next;
  }

  async createSuggestions(records: AutoPullSuggestionRecord[]): Promise<void> {
    for (const record of records) {
      const current = this.suggestionsByRun.get(record.runId) ?? [];
      current.push(record);
      this.suggestionsByRun.set(record.runId, current);
    }
  }

  async listSuggestionsByRunId(runId: string): Promise<AutoPullSuggestionRecord[]> {
    return [...(this.suggestionsByRun.get(runId) ?? [])];
  }

  private cursorKey(ruleId: string, source: AutoPullSource): string {
    return `${ruleId}::${source}`;
  }
}
