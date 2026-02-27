import assert from 'node:assert/strict';
import test from 'node:test';
import { InMemoryAutoPullRepository } from '../repositories/in-memory-auto-pull-repository.js';
import { InMemoryLiteratureRepository } from '../repositories/in-memory-literature-repository.js';
import { InMemoryResearchLifecycleRepository } from '../repositories/in-memory-research-lifecycle-repository.js';
import { AutoPullService } from './auto-pull-service.js';
import { LiteratureService } from './literature-service.js';

function buildService(): {
  service: AutoPullService;
  repository: InMemoryAutoPullRepository;
} {
  const repository = new InMemoryAutoPullRepository();
  const literatureService = new LiteratureService(
    new InMemoryLiteratureRepository(),
    new InMemoryResearchLifecycleRepository(),
  );

  return {
    service: new AutoPullService(repository, literatureService),
    repository,
  };
}

const TERMINAL_RUN_STATUSES = new Set(['SUCCESS', 'PARTIAL', 'FAILED', 'SKIPPED']);

async function waitForTerminalRun(service: AutoPullService, runId: string) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const run = await service.getRun(runId);
    if (TERMINAL_RUN_STATUSES.has(run.status)) {
      return run;
    }
    await new Promise((resolve) => {
      setTimeout(resolve, 10);
    });
  }
  throw new Error(`Timed out waiting run ${runId} to complete.`);
}

test('single-flight guard creates skipped run and warning alert', async () => {
  const { service, repository } = buildService();

  const rule = await service.createRule({
    scope: 'GLOBAL',
    name: 'single-flight-rule',
    sources: [{ source: 'CROSSREF', enabled: false, priority: 1 }],
    schedules: [{ frequency: 'DAILY', hour: 9, minute: 0, timezone: 'UTC' }],
  });

  const now = new Date().toISOString();
  await repository.createRun({
    id: 'RUN-EXISTING',
    ruleId: rule.rule_id,
    triggerType: 'MANUAL',
    status: 'RUNNING',
    startedAt: now,
    finishedAt: null,
    summary: {},
    errorCode: null,
    errorMessage: null,
    createdAt: now,
    updatedAt: now,
  });

  const skipped = await service.triggerRuleRun(rule.rule_id, { trigger_type: 'MANUAL' });
  assert.equal(skipped.status, 'SKIPPED');
  assert.equal(skipped.error_code, 'RUN_SKIPPED_SINGLE_FLIGHT');

  const alerts = await service.listAlerts({ ruleId: rule.rule_id, acked: false });
  assert.equal(alerts.some((alert) => alert.code === 'RUN_SKIPPED_SINGLE_FLIGHT'), true);
});

test('run fails with NO_SOURCE_CONFIG when no enabled source exists', async () => {
  const { service } = buildService();

  const rule = await service.createRule({
    scope: 'GLOBAL',
    name: 'no-source-rule',
    sources: [{ source: 'CROSSREF', enabled: false, priority: 1 }],
    schedules: [{ frequency: 'DAILY', hour: 9, minute: 0, timezone: 'UTC' }],
  });

  const queued = await service.triggerRuleRun(rule.rule_id, { trigger_type: 'MANUAL' });
  assert.equal(queued.status, 'PENDING');
  const run = await waitForTerminalRun(service, queued.run_id);
  assert.equal(run.status, 'FAILED');
  assert.equal(run.error_code, 'NO_SOURCE_CONFIG');

  const alerts = await service.listAlerts({ ruleId: rule.rule_id });
  assert.equal(alerts.length > 0, true);
  assert.equal(alerts[0]?.code, 'NO_SOURCE_CONFIG');
});

test('topic rule creation requires existing topic profile', async () => {
  const { service } = buildService();
  await service.createRule({
    scope: 'GLOBAL',
    name: 'baseline-global-active-rule',
    status: 'ACTIVE',
    sources: [{ source: 'CROSSREF', enabled: true, priority: 1 }],
    schedules: [{ frequency: 'DAILY', hour: 9, minute: 0, timezone: 'UTC' }],
  });
  await assert.rejects(
    async () => service.createRule({
      scope: 'TOPIC',
      topic_id: 'TOPIC-NOT-EXISTS',
      name: 'topic-rule',
      sources: [{ source: 'CROSSREF', enabled: true, priority: 1 }],
      schedules: [{ frequency: 'DAILY', hour: 9, minute: 0, timezone: 'UTC' }],
    }),
    (error: unknown) => {
      if (!(error instanceof Error)) {
        return false;
      }
      return error.message.includes('not found');
    },
  );
});

test('scheduled tick only runs due rules', async () => {
  const { service } = buildService();

  const now = new Date();
  const hour = now.getUTCHours();
  const minute = now.getUTCMinutes();

  const dueRule = await service.createRule({
    scope: 'GLOBAL',
    name: 'due-rule',
    sources: [{ source: 'CROSSREF', enabled: false, priority: 1 }],
    schedules: [{ frequency: 'DAILY', hour, minute, timezone: 'UTC' }],
  });

  const notDueRule = await service.createRule({
    scope: 'GLOBAL',
    name: 'not-due-rule',
    sources: [{ source: 'ARXIV', enabled: false, priority: 1 }],
    schedules: [{ frequency: 'DAILY', hour, minute: (minute + 1) % 60, timezone: 'UTC' }],
  });

  await service.runScheduledTick(now);

  const dueRuns = await service.listRuns({ ruleId: dueRule.rule_id });
  const notDueRuns = await service.listRuns({ ruleId: notDueRule.rule_id });
  assert.equal(dueRuns.length, 1);
  assert.equal(notDueRuns.length, 0);
});

test('retry-failed-sources creates a follow-up run', async () => {
  const { service } = buildService();
  await service.createRule({
    scope: 'GLOBAL',
    name: 'baseline-global-active-rule',
    status: 'ACTIVE',
    sources: [{ source: 'CROSSREF', enabled: true, priority: 1 }],
    schedules: [{ frequency: 'DAILY', hour: 9, minute: 0, timezone: 'UTC' }],
  });

  await service.createTopicProfile({
    topic_id: 'TOPIC-AUTO-UNIT-1',
    name: 'Auto Topic',
  });

  const rule = await service.createRule({
    scope: 'TOPIC',
    topic_id: 'TOPIC-AUTO-UNIT-1',
    name: 'invalid-zotero-config',
    sources: [{ source: 'ZOTERO', enabled: true, priority: 1, config: {} }],
    schedules: [{ frequency: 'WEEKLY', days_of_week: ['MON'], hour: 9, minute: 0, timezone: 'UTC' }],
  });

  const initialQueued = await service.triggerRuleRun(rule.rule_id, { trigger_type: 'MANUAL' });
  assert.equal(initialQueued.status, 'PENDING');
  const initial = await waitForTerminalRun(service, initialQueued.run_id);
  assert.equal(initial.status, 'FAILED');
  assert.equal(initial.source_attempts?.[0]?.status, 'FAILED');

  const retried = await service.retryFailedSources(initial.run_id, {});
  assert.equal(retried.status, 'PENDING');
  const retriedDone = await waitForTerminalRun(service, retried.run_id);
  assert.equal(retried.rule_id, rule.rule_id);
  assert.equal(retriedDone.status, 'FAILED');
  assert.equal(retriedDone.source_attempts?.[0]?.source, 'ZOTERO');
});

test('many-to-many topic binding executes only active topics', async () => {
  const { service } = buildService();
  await service.createRule({
    scope: 'GLOBAL',
    name: 'baseline-global-active-rule',
    status: 'ACTIVE',
    sources: [{ source: 'CROSSREF', enabled: true, priority: 1 }],
    schedules: [{ frequency: 'DAILY', hour: 9, minute: 0, timezone: 'UTC' }],
  });

  await service.createTopicProfile({
    topic_id: 'TOPIC-AUTO-UNIT-ACTIVE',
    name: 'Active Topic',
    is_active: true,
  });
  await service.createTopicProfile({
    topic_id: 'TOPIC-AUTO-UNIT-INACTIVE',
    name: 'Inactive Topic',
    is_active: false,
  });

  const rule = await service.createRule({
    scope: 'TOPIC',
    topic_ids: ['TOPIC-AUTO-UNIT-ACTIVE', 'TOPIC-AUTO-UNIT-INACTIVE'],
    name: 'topic-many-to-many-rule',
    sources: [{ source: 'ZOTERO', enabled: true, priority: 1, config: {} }],
    schedules: [{ frequency: 'DAILY', hour: 9, minute: 0, timezone: 'UTC' }],
  });
  assert.deepEqual(rule.topic_ids, ['TOPIC-AUTO-UNIT-ACTIVE', 'TOPIC-AUTO-UNIT-INACTIVE']);

  const queued = await service.triggerRuleRun(rule.rule_id, { trigger_type: 'MANUAL' });
  const terminal = await waitForTerminalRun(service, queued.run_id);
  assert.equal(terminal.status, 'FAILED');
  assert.deepEqual(terminal.summary.skipped_topic_ids, ['TOPIC-AUTO-UNIT-INACTIVE']);
  assert.deepEqual(terminal.source_attempts?.[0]?.meta.topic_ids, ['TOPIC-AUTO-UNIT-ACTIVE']);
});

test('run is skipped when all linked topics are inactive', async () => {
  const { service } = buildService();
  await service.createRule({
    scope: 'GLOBAL',
    name: 'baseline-global-active-rule',
    status: 'ACTIVE',
    sources: [{ source: 'CROSSREF', enabled: true, priority: 1 }],
    schedules: [{ frequency: 'DAILY', hour: 9, minute: 0, timezone: 'UTC' }],
  });

  await service.createTopicProfile({
    topic_id: 'TOPIC-AUTO-UNIT-INACTIVE-ONLY',
    name: 'Inactive Topic',
    is_active: false,
  });

  const rule = await service.createRule({
    scope: 'TOPIC',
    topic_ids: ['TOPIC-AUTO-UNIT-INACTIVE-ONLY'],
    name: 'inactive-only-topic-rule',
    sources: [{ source: 'ZOTERO', enabled: true, priority: 1, config: {} }],
    schedules: [{ frequency: 'DAILY', hour: 9, minute: 0, timezone: 'UTC' }],
  });

  const queued = await service.triggerRuleRun(rule.rule_id, { trigger_type: 'MANUAL' });
  const terminal = await waitForTerminalRun(service, queued.run_id);
  assert.equal(terminal.status, 'SKIPPED');
  assert.equal(terminal.error_code, 'NO_ACTIVE_TOPIC');

  const alerts = await service.listAlerts({ ruleId: rule.rule_id, acked: false });
  assert.equal(alerts.some((alert) => alert.code === 'NO_ACTIVE_TOPIC'), true);
});

test('topic rule can be created without bound topics', async () => {
  const { service } = buildService();
  await service.createRule({
    scope: 'GLOBAL',
    name: 'baseline-global-active-rule',
    status: 'ACTIVE',
    sources: [{ source: 'CROSSREF', enabled: true, priority: 1 }],
    schedules: [{ frequency: 'DAILY', hour: 9, minute: 0, timezone: 'UTC' }],
  });

  const topicRule = await service.createRule({
    scope: 'TOPIC',
    topic_ids: [],
    name: 'topic-rule-without-binding',
    sources: [{ source: 'CROSSREF', enabled: true, priority: 1 }],
    schedules: [{ frequency: 'DAILY', hour: 9, minute: 0, timezone: 'UTC' }],
  });

  assert.equal(topicRule.scope, 'TOPIC');
  assert.deepEqual(topicRule.topic_ids, []);
});

test('cannot pause or delete last active global rule', async () => {
  const { service } = buildService();
  const onlyGlobal = await service.createRule({
    scope: 'GLOBAL',
    name: 'only-active-global-rule',
    status: 'ACTIVE',
    sources: [{ source: 'CROSSREF', enabled: true, priority: 1 }],
    schedules: [{ frequency: 'DAILY', hour: 9, minute: 0, timezone: 'UTC' }],
  });

  await assert.rejects(
    async () => service.updateRule(onlyGlobal.rule_id, { status: 'PAUSED' }),
    (error: unknown) => error instanceof Error && error.message.includes('At least one ACTIVE GLOBAL rule is required'),
  );
  await assert.rejects(
    async () => service.deleteRule(onlyGlobal.rule_id),
    (error: unknown) => error instanceof Error && error.message.includes('At least one ACTIVE GLOBAL rule is required'),
  );
});
