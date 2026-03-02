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
  literatureService: LiteratureService;
} {
  const repository = new InMemoryAutoPullRepository();
  const literatureService = new LiteratureService(
    new InMemoryLiteratureRepository(),
    new InMemoryResearchLifecycleRepository(),
  );

  return {
    service: new AutoPullService(repository, literatureService),
    repository,
    literatureService,
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

function crossrefPayload(items: Array<Record<string, unknown>>): Record<string, unknown> {
  return {
    message: {
      items,
    },
  };
}

function buildCrossrefItem(input: {
  title: string;
  doi?: string;
  year?: number;
  url?: string;
  authorFamily?: string;
  citedBy?: number;
}): Record<string, unknown> {
  const year = input.year ?? 2024;
  return {
    title: [input.title],
    DOI: input.doi,
    URL: input.url ?? (input.doi ? `https://doi.org/${input.doi}` : undefined),
    issued: {
      'date-parts': [[year]],
    },
    author: [{ given: 'Ada', family: input.authorFamily ?? 'Lovelace' }],
    'is-referenced-by-count': input.citedBy ?? 0,
  };
}

function buildCrossrefItems(prefix: string, count: number, year = 2025): Array<Record<string, unknown>> {
  return Array.from({ length: count }, (_, index) =>
    buildCrossrefItem({
      title: `${prefix} ${index + 1}`,
      doi: `10.1000/${prefix.toLowerCase().replace(/\s+/g, '-')}-${index + 1}`,
      year,
    }),
  );
}

function buildArxivFeed(entries: Array<{ id: string; title: string; year: number }>): string {
  const body = entries.map((entry) => `
    <entry>
      <id>https://arxiv.org/abs/${entry.id}v1</id>
      <title>${entry.title}</title>
      <summary>summary for ${entry.title}</summary>
      <published>${entry.year}-01-01T00:00:00Z</published>
      <author><name>Ada Lovelace</name></author>
    </entry>
  `).join('');
  return `<?xml version="1.0" encoding="UTF-8"?><feed>${body}</feed>`;
}

async function withEnv<T>(
  values: Record<string, string | undefined>,
  run: () => Promise<T>,
): Promise<T> {
  const snapshot = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(values)) {
    snapshot.set(key, process.env[key]);
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  try {
    return await run();
  } finally {
    for (const [key, value] of snapshot.entries()) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

async function withMockedFetch<T>(
  fetchImpl: typeof fetch,
  run: () => Promise<T>,
): Promise<T> {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = fetchImpl;
  try {
    return await run();
  } finally {
    globalThis.fetch = originalFetch;
  }
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

test('time window mode switches to incremental after cursor is present', async () => {
  const { service, repository } = buildService();
  await service.createRule({
    scope: 'GLOBAL',
    name: 'baseline-global-active-rule',
    status: 'ACTIVE',
    sources: [{ source: 'CROSSREF', enabled: true, priority: 1 }],
    schedules: [{ frequency: 'DAILY', hour: 9, minute: 0, timezone: 'UTC' }],
  });

  const rule = await service.createRule({
    scope: 'GLOBAL',
    name: 'window-mode-rule',
    sources: [{ source: 'ZOTERO', enabled: true, priority: 1, config: {} }],
    schedules: [{ frequency: 'DAILY', hour: 9, minute: 0, timezone: 'UTC' }],
  });

  const firstQueued = await service.triggerRuleRun(rule.rule_id, { trigger_type: 'MANUAL' });
  const firstRun = await waitForTerminalRun(service, firstQueued.run_id);
  assert.equal(firstRun.source_attempts?.[0]?.status, 'FAILED');
  const firstMeta = firstRun.source_attempts?.[0]?.meta as Record<string, unknown> | undefined;
  assert.equal(firstMeta?.time_window_mode, 'bootstrap_full_range');

  const now = new Date().toISOString();
  await repository.upsertCursor({
    id: 'CURSOR-UNIT-1',
    ruleId: rule.rule_id,
    source: 'ZOTERO',
    cursorValue: now,
    cursorAt: now,
  });

  const secondQueued = await service.triggerRuleRun(rule.rule_id, { trigger_type: 'MANUAL' });
  const secondRun = await waitForTerminalRun(service, secondQueued.run_id);
  assert.equal(secondRun.source_attempts?.[0]?.status, 'FAILED');
  const secondMeta = secondRun.source_attempts?.[0]?.meta as Record<string, unknown> | undefined;
  assert.equal(secondMeta?.time_window_mode, 'incremental_lookback');

  const thirdQueued = await service.triggerRuleRun(rule.rule_id, {
    trigger_type: 'MANUAL',
    full_refresh: true,
  });
  const thirdRun = await waitForTerminalRun(service, thirdQueued.run_id);
  const thirdMeta = thirdRun.source_attempts?.[0]?.meta as Record<string, unknown> | undefined;
  assert.equal(thirdMeta?.time_window_mode, 'bootstrap_full_range');
  const thirdSummary = thirdRun.summary as Record<string, unknown>;
  assert.equal(thirdSummary.full_refresh, true);
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

test('quality pipeline rejects incomplete records before scoring', async () => {
  const { service } = buildService();
  let scoreCallCount = 0;

  await withEnv({
    AUTO_PULL_LLM_SCORER_URL: 'https://mock-llm.local/score',
    AUTO_PULL_LLM_SCORER_MODEL: 'mock-quality-model',
  }, async () => {
    await withMockedFetch((async (input: Parameters<typeof fetch>[0]) => {
      const url = String(input);
      if (url.startsWith('https://api.crossref.org/works')) {
        return new Response(JSON.stringify(crossrefPayload([
          buildCrossrefItem({ title: 'Missing DOI Item', doi: undefined, url: 'https://example.com/paper', year: 2024 }),
          buildCrossrefItem({ title: 'Valid DOI Item', doi: '10.1000/valid-item', year: 2025 }),
        ])), { status: 200 });
      }
      if (url === 'https://mock-llm.local/score') {
        scoreCallCount += 1;
        return new Response(JSON.stringify({ quality_score: 88 }), { status: 200 });
      }
      return new Response('not found', { status: 404 });
    }) as typeof fetch, async () => {
      const rule = await service.createRule({
        scope: 'GLOBAL',
        name: 'quality-pipeline-incomplete',
        quality_spec: { min_quality_score: 70 },
        sources: [{ source: 'CROSSREF', enabled: true, priority: 1 }],
        schedules: [{ frequency: 'DAILY', hour: 9, minute: 0, timezone: 'UTC' }],
      });

      const queued = await service.triggerRuleRun(rule.rule_id, { trigger_type: 'MANUAL' });
      const run = await waitForTerminalRun(service, queued.run_id);
      const meta = run.source_attempts?.[0]?.meta as Record<string, unknown>;
      assert.equal(meta.incomplete_rejected_count, 1);
      assert.equal(meta.scored_count, 1);
      assert.equal(meta.imported_count, 1);
      assert.equal(scoreCallCount, 1);
    });
  });
});

test('quality pipeline skips existing duplicates before scoring', async () => {
  const { service, literatureService } = buildService();
  let scoreCallCount = 0;

  await literatureService.import({
    items: [{
      provider: 'manual',
      external_id: 'seed-existing',
      title: 'Existing Duplicate Paper',
      authors: ['Ada Lovelace'],
      year: 2024,
      doi: '10.1000/existing-duplicate',
      source_url: 'https://doi.org/10.1000/existing-duplicate',
      rights_class: 'UNKNOWN',
      tags: [],
    }],
  });

  await withEnv({
    AUTO_PULL_LLM_SCORER_URL: 'https://mock-llm.local/score',
    AUTO_PULL_LLM_SCORER_MODEL: 'mock-quality-model',
  }, async () => {
    await withMockedFetch((async (input: Parameters<typeof fetch>[0]) => {
      const url = String(input);
      if (url.startsWith('https://api.crossref.org/works')) {
        return new Response(JSON.stringify(crossrefPayload([
          buildCrossrefItem({ title: 'Existing Duplicate Paper', doi: '10.1000/existing-duplicate', year: 2024 }),
          buildCrossrefItem({ title: 'Fresh Candidate Paper', doi: '10.1000/fresh-candidate', year: 2025 }),
        ])), { status: 200 });
      }
      if (url === 'https://mock-llm.local/score') {
        scoreCallCount += 1;
        return new Response(JSON.stringify({ quality_score: 82 }), { status: 200 });
      }
      return new Response('not found', { status: 404 });
    }) as typeof fetch, async () => {
      const rule = await service.createRule({
        scope: 'GLOBAL',
        name: 'quality-pipeline-duplicate',
        quality_spec: { min_quality_score: 70 },
        sources: [{ source: 'CROSSREF', enabled: true, priority: 1 }],
        schedules: [{ frequency: 'DAILY', hour: 9, minute: 0, timezone: 'UTC' }],
      });

      const queued = await service.triggerRuleRun(rule.rule_id, { trigger_type: 'MANUAL' });
      const run = await waitForTerminalRun(service, queued.run_id);
      const meta = run.source_attempts?.[0]?.meta as Record<string, unknown>;
      assert.equal(meta.duplicate_skipped_count, 1);
      assert.equal(meta.scored_count, 1);
      assert.equal(meta.imported_count, 1);
      assert.equal(scoreCallCount, 1);
    });
  });
});

test('quality threshold filters low-score items', async () => {
  const { service } = buildService();

  await withEnv({
    AUTO_PULL_LLM_SCORER_URL: 'https://mock-llm.local/score',
    AUTO_PULL_LLM_SCORER_MODEL: 'mock-quality-model',
  }, async () => {
    await withMockedFetch((async (input: Parameters<typeof fetch>[0]) => {
      const url = String(input);
      if (url.startsWith('https://api.crossref.org/works')) {
        return new Response(JSON.stringify(crossrefPayload([
          buildCrossrefItem({ title: 'Low Score Candidate', doi: '10.1000/low-score', year: 2025 }),
        ])), { status: 200 });
      }
      if (url === 'https://mock-llm.local/score') {
        return new Response(JSON.stringify({ quality_score: 65 }), { status: 200 });
      }
      return new Response('not found', { status: 404 });
    }) as typeof fetch, async () => {
      const rule = await service.createRule({
        scope: 'GLOBAL',
        name: 'quality-threshold-low',
        quality_spec: { min_quality_score: 70 },
        sources: [{ source: 'CROSSREF', enabled: true, priority: 1 }],
        schedules: [{ frequency: 'DAILY', hour: 9, minute: 0, timezone: 'UTC' }],
      });

      const queued = await service.triggerRuleRun(rule.rule_id, { trigger_type: 'MANUAL' });
      const run = await waitForTerminalRun(service, queued.run_id);
      const meta = run.source_attempts?.[0]?.meta as Record<string, unknown>;
      assert.equal(meta.scored_count, 1);
      assert.equal(meta.below_threshold_count, 1);
      assert.equal(meta.imported_count, 0);
      assert.equal(meta.eligible_count, 0);
    });
  });
});

test('quality threshold imports high-score items', async () => {
  const { service } = buildService();

  await withEnv({
    AUTO_PULL_LLM_SCORER_URL: 'https://mock-llm.local/score',
    AUTO_PULL_LLM_SCORER_MODEL: 'mock-quality-model',
  }, async () => {
    await withMockedFetch((async (input: Parameters<typeof fetch>[0]) => {
      const url = String(input);
      if (url.startsWith('https://api.crossref.org/works')) {
        return new Response(JSON.stringify(crossrefPayload([
          buildCrossrefItem({ title: 'High Score Candidate', doi: '10.1000/high-score', year: 2025 }),
        ])), { status: 200 });
      }
      if (url === 'https://mock-llm.local/score') {
        return new Response(JSON.stringify({ quality_score: 85 }), { status: 200 });
      }
      return new Response('not found', { status: 404 });
    }) as typeof fetch, async () => {
      const rule = await service.createRule({
        scope: 'GLOBAL',
        name: 'quality-threshold-high',
        quality_spec: { min_quality_score: 70 },
        sources: [{ source: 'CROSSREF', enabled: true, priority: 1, config: { sort_mode: 'llm_score' } }],
        schedules: [{ frequency: 'DAILY', hour: 9, minute: 0, timezone: 'UTC' }],
      });

      const queued = await service.triggerRuleRun(rule.rule_id, { trigger_type: 'MANUAL' });
      const run = await waitForTerminalRun(service, queued.run_id);
      const meta = run.source_attempts?.[0]?.meta as Record<string, unknown>;
      assert.equal(meta.scored_count, 1);
      assert.equal(meta.below_threshold_count, 0);
      assert.equal(meta.imported_count, 1);
      assert.equal(run.suggestions?.[0]?.score, 85);
    });
  });
});

test('hybrid score reorders candidates when llm scores tie', async () => {
  const { service } = buildService();

  await withEnv({
    AUTO_PULL_LLM_SCORER_URL: 'https://mock-llm.local/score',
    AUTO_PULL_LLM_SCORER_MODEL: 'mock-quality-model',
  }, async () => {
    await withMockedFetch((async (input: Parameters<typeof fetch>[0]) => {
      const url = String(input);
      if (url.startsWith('https://api.crossref.org/works')) {
        return new Response(JSON.stringify(crossrefPayload([
          buildCrossrefItem({
            title: 'Low Citation Candidate',
            doi: '10.1000/hybrid-low-citation',
            year: 2025,
            citedBy: 0,
          }),
          buildCrossrefItem({
            title: 'High Citation Candidate',
            doi: '10.1000/hybrid-high-citation',
            year: 2025,
            citedBy: 500,
          }),
        ])), { status: 200 });
      }
      if (url === 'https://mock-llm.local/score') {
        return new Response(JSON.stringify({ quality_score: 80 }), { status: 200 });
      }
      return new Response('not found', { status: 404 });
    }) as typeof fetch, async () => {
      const rule = await service.createRule({
        scope: 'GLOBAL',
        name: 'hybrid-score-ordering',
        quality_spec: { min_quality_score: 70 },
        sources: [{ source: 'CROSSREF', enabled: true, priority: 1, config: { sort_mode: 'hybrid_score' } }],
        schedules: [{ frequency: 'DAILY', hour: 9, minute: 0, timezone: 'UTC' }],
      });

      const queued = await service.triggerRuleRun(rule.rule_id, { trigger_type: 'MANUAL' });
      const run = await waitForTerminalRun(service, queued.run_id);
      const meta = run.source_attempts?.[0]?.meta as Record<string, unknown>;
      assert.equal(meta.ranking_mode, 'hybrid_score');
      assert.equal(run.suggestions?.length, 2);
      assert.equal(run.suggestions?.[0]?.score, 85);
      assert.equal(run.suggestions?.[1]?.score, 80);
    });
  });
});

test('initial pull uses 5x limit and subsequent pull uses configured limit', async () => {
  const { service } = buildService();
  let crossrefCallCount = 0;

  await withEnv({
    AUTO_PULL_LLM_SCORER_URL: 'https://mock-llm.local/score',
    AUTO_PULL_LLM_SCORER_MODEL: 'mock-quality-model',
  }, async () => {
    await withMockedFetch((async (input: Parameters<typeof fetch>[0]) => {
      const url = String(input);
      if (url.startsWith('https://api.crossref.org/works')) {
        crossrefCallCount += 1;
        const requestUrl = new URL(url);
        const rows = Number.parseInt(requestUrl.searchParams.get('rows') ?? '20', 10);
        const prefix = crossrefCallCount === 1 ? 'Bootstrap Candidate' : 'Incremental Candidate';
        const items = buildCrossrefItems(prefix, 12).slice(0, rows);
        return new Response(JSON.stringify(crossrefPayload(items)), { status: 200 });
      }
      if (url === 'https://mock-llm.local/score') {
        return new Response(JSON.stringify({ quality_score: 85 }), { status: 200 });
      }
      return new Response('not found', { status: 404 });
    }) as typeof fetch, async () => {
      const rule = await service.createRule({
        scope: 'GLOBAL',
        name: 'initial-vs-incremental-limit',
        query_spec: {
          max_results_per_source: 2,
        },
        quality_spec: { min_quality_score: 70 },
        sources: [{ source: 'CROSSREF', enabled: true, priority: 1 }],
        schedules: [{ frequency: 'DAILY', hour: 9, minute: 0, timezone: 'UTC' }],
      });

      const firstQueued = await service.triggerRuleRun(rule.rule_id, { trigger_type: 'MANUAL' });
      const firstRun = await waitForTerminalRun(service, firstQueued.run_id);
      const firstMeta = (firstRun.source_attempts?.[0]?.meta ?? {}) as Record<string, unknown>;
      assert.equal(firstRun.source_attempts?.[0]?.imported_count, 10);
      assert.equal(firstMeta.fetch_limit, 10);

      const secondQueued = await service.triggerRuleRun(rule.rule_id, { trigger_type: 'MANUAL' });
      const secondRun = await waitForTerminalRun(service, secondQueued.run_id);
      const secondMeta = (secondRun.source_attempts?.[0]?.meta ?? {}) as Record<string, unknown>;
      assert.equal(secondRun.source_attempts?.[0]?.imported_count, 2);
      assert.equal(secondMeta.fetch_limit, 2);
    });
  });
});

test('global top-k is applied after cross-source dedup and ranking', async () => {
  const { service, repository } = buildService();

  await withEnv({
    AUTO_PULL_LLM_SCORER_URL: 'https://mock-llm.local/score',
    AUTO_PULL_LLM_SCORER_MODEL: 'mock-quality-model',
  }, async () => {
    const scoreMap: Record<string, number> = {
      'Crossref A': 96,
      'Crossref B': 72,
      'arXiv A': 95,
      'arXiv B': 71,
    };

    await withMockedFetch((async (
      input: Parameters<typeof fetch>[0],
      init?: Parameters<typeof fetch>[1],
    ) => {
      const url = String(input);
      if (url.startsWith('https://api.crossref.org/works')) {
        const requestUrl = new URL(url);
        const rows = Number.parseInt(requestUrl.searchParams.get('rows') ?? '20', 10);
        const items = [
          buildCrossrefItem({ title: 'Crossref A', doi: '10.1000/global-topk-crossref-a', year: 2025 }),
          buildCrossrefItem({ title: 'Crossref B', doi: '10.1000/global-topk-crossref-b', year: 2024 }),
          buildCrossrefItem({ title: 'Crossref C', doi: '10.1000/global-topk-crossref-c', year: 2023 }),
        ].slice(0, rows);
        return new Response(JSON.stringify(crossrefPayload(items)), { status: 200 });
      }
      if (url.startsWith('https://export.arxiv.org/api/query')) {
        const requestUrl = new URL(url);
        const maxResults = Number.parseInt(requestUrl.searchParams.get('max_results') ?? '20', 10);
        const entries = [
          { id: '2501.00001', title: 'arXiv A', year: 2025 },
          { id: '2501.00002', title: 'arXiv B', year: 2024 },
          { id: '2501.00003', title: 'arXiv C', year: 2023 },
        ].slice(0, maxResults);
        return new Response(buildArxivFeed(entries), { status: 200 });
      }
      if (url === 'https://mock-llm.local/score') {
        const payload = init?.body && typeof init.body === 'string'
          ? (JSON.parse(init.body) as { input?: { title?: string } })
          : {};
        const title = payload.input?.title ?? '';
        const score = scoreMap[title] ?? 70;
        return new Response(JSON.stringify({ quality_score: score }), { status: 200 });
      }
      return new Response('not found', { status: 404 });
    }) as typeof fetch, async () => {
      const rule = await service.createRule({
        scope: 'GLOBAL',
        name: 'global-topk-after-dedup',
        query_spec: {
          max_results_per_source: 2,
        },
        quality_spec: { min_quality_score: 60 },
        sources: [
          { source: 'CROSSREF', enabled: true, priority: 1, config: { sort_mode: 'llm_score' } },
          { source: 'ARXIV', enabled: true, priority: 2, config: { sort_mode: 'llm_score' } },
        ],
        schedules: [{ frequency: 'DAILY', hour: 9, minute: 0, timezone: 'UTC' }],
      });

      const now = new Date().toISOString();
      await repository.upsertCursor({
        id: 'CURSOR-GLOBAL-TOPK-CROSSREF',
        ruleId: rule.rule_id,
        source: 'CROSSREF',
        cursorValue: now,
        cursorAt: now,
      });
      await repository.upsertCursor({
        id: 'CURSOR-GLOBAL-TOPK-ARXIV',
        ruleId: rule.rule_id,
        source: 'ARXIV',
        cursorValue: now,
        cursorAt: now,
      });

      const queued = await service.triggerRuleRun(rule.rule_id, { trigger_type: 'MANUAL' });
      const run = await waitForTerminalRun(service, queued.run_id);
      const summary = (run.summary ?? {}) as Record<string, unknown>;
      assert.equal(summary.initial_pull, false);
      assert.equal(summary.effective_limit, 2);
      assert.equal(summary.selected_topk_count, 2);
      assert.equal(run.summary.imported_count, 2);
      assert.equal(run.source_attempts?.length, 2);
      const importedCounts = (run.source_attempts ?? []).map((attempt) => attempt.imported_count).sort((a, b) => a - b);
      assert.deepEqual(importedCounts, [1, 1]);
      assert.equal(run.suggestions?.length, 2);
      assert.equal(run.suggestions?.[0]?.score, 96);
      assert.equal(run.suggestions?.[1]?.score, 95);
    });
  });
});

test('run fails with QUALITY_SCORE_UNAVAILABLE when scorer config is missing', async () => {
  const { service } = buildService();

  await withEnv({
    AUTO_PULL_LLM_SCORER_URL: undefined,
    AUTO_PULL_LLM_SCORER_MODEL: undefined,
  }, async () => {
    await withMockedFetch((async (input: Parameters<typeof fetch>[0]) => {
      const url = String(input);
      if (url.startsWith('https://api.crossref.org/works')) {
        return new Response(JSON.stringify(crossrefPayload([
          buildCrossrefItem({ title: 'Scorer Required Candidate', doi: '10.1000/scorer-required', year: 2025 }),
        ])), { status: 200 });
      }
      return new Response('not found', { status: 404 });
    }) as typeof fetch, async () => {
      const rule = await service.createRule({
        scope: 'GLOBAL',
        name: 'quality-scorer-missing',
        quality_spec: { min_quality_score: 70 },
        sources: [{ source: 'CROSSREF', enabled: true, priority: 1 }],
        schedules: [{ frequency: 'DAILY', hour: 9, minute: 0, timezone: 'UTC' }],
      });

      const queued = await service.triggerRuleRun(rule.rule_id, { trigger_type: 'MANUAL' });
      const run = await waitForTerminalRun(service, queued.run_id);
      assert.equal(run.status, 'FAILED');
      assert.equal(run.error_code, 'QUALITY_SCORE_UNAVAILABLE');
      assert.equal(run.source_attempts?.[0]?.error_code, 'QUALITY_SCORE_UNAVAILABLE');
    });
  });
});
