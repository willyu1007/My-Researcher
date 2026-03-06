import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from '../app.js';

const TERMINAL_RUN_STATUSES = new Set(['SUCCESS', 'PARTIAL', 'FAILED', 'SKIPPED']);

async function waitForTerminalRun(
  app: ReturnType<typeof buildApp>,
  runId: string,
): Promise<Record<string, unknown>> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const res = await app.inject({
      method: 'GET',
      url: `/auto-pull/runs/${encodeURIComponent(runId)}`,
    });
    if (res.statusCode === 200) {
      const run = res.json() as Record<string, unknown>;
      const status = typeof run.status === 'string' ? run.status : '';
      if (TERMINAL_RUN_STATUSES.has(status)) {
        return run;
      }
    }
    await new Promise((resolve) => {
      setTimeout(resolve, 20);
    });
  }
  throw new Error(`Timed out waiting run ${runId} to complete.`);
}

test('auto-pull and topic-settings routes support CRUD, run, retry and alert ack', async () => {
  const app = buildApp();

  const createTopicRes = await app.inject({
    method: 'POST',
    url: '/topics/settings',
    payload: {
      topic_id: 'TOPIC-AUTO-INT-1',
      name: 'Auto Pull Topic',
      include_keywords: ['llm', 'evaluation'],
      exclude_keywords: ['biology'],
      venue_filters: ['NeurIPS'],
      default_lookback_days: 30,
    },
  });
  assert.equal(createTopicRes.statusCode, 201);
  const createdTopic = createTopicRes.json();
  assert.equal(createdTopic.topic_id, 'TOPIC-AUTO-INT-1');
  assert.equal(createdTopic.is_active, true);

  const listTopicRes = await app.inject({ method: 'GET', url: '/topics/settings' });
  assert.equal(listTopicRes.statusCode, 200);
  const topicItems = listTopicRes.json().items;
  assert.equal(Array.isArray(topicItems), true);
  assert.equal(topicItems.some((item: { topic_id: string }) => item.topic_id === 'TOPIC-AUTO-INT-1'), true);

  const patchTopicRes = await app.inject({
    method: 'PATCH',
    url: '/topics/settings/TOPIC-AUTO-INT-1',
    payload: {
      default_lookback_days: 90,
      venue_filters: ['NeurIPS', 'ICML'],
    },
  });
  assert.equal(patchTopicRes.statusCode, 200);
  assert.equal(patchTopicRes.json().default_lookback_days, 90);

  const createTopicRes2 = await app.inject({
    method: 'POST',
    url: '/topics/settings',
    payload: {
      topic_id: 'TOPIC-AUTO-INT-2',
      name: 'Auto Pull Topic 2',
      is_active: true,
    },
  });
  assert.equal(createTopicRes2.statusCode, 201);

  const createRuleRes = await app.inject({
    method: 'POST',
    url: '/auto-pull/rules',
    payload: {
      scope: 'GLOBAL',
      name: 'Global Rule Without Enabled Source',
      sources: [
        {
          source: 'CROSSREF',
          enabled: false,
          priority: 1,
        },
      ],
      schedules: [
        {
          frequency: 'DAILY',
          hour: 9,
          minute: 0,
          timezone: 'UTC',
          active: true,
        },
      ],
    },
  });
  assert.equal(createRuleRes.statusCode, 201);
  const ruleId = createRuleRes.json().rule_id as string;
  assert.ok(ruleId);

  const createBackupGlobalRuleRes = await app.inject({
    method: 'POST',
    url: '/auto-pull/rules',
    payload: {
      scope: 'GLOBAL',
      name: 'Backup Active Global Rule',
      status: 'ACTIVE',
      sources: [
        {
          source: 'ARXIV',
          enabled: false,
          priority: 1,
        },
      ],
      schedules: [
        {
          frequency: 'DAILY',
          hour: 9,
          minute: 30,
          timezone: 'UTC',
          active: true,
        },
      ],
    },
  });
  assert.equal(createBackupGlobalRuleRes.statusCode, 201);

  const listRulesRes = await app.inject({
    method: 'GET',
    url: '/auto-pull/rules?scope=GLOBAL&status=ACTIVE',
  });
  assert.equal(listRulesRes.statusCode, 200);
  const rules = listRulesRes.json().items;
  assert.equal(Array.isArray(rules), true);
  assert.equal(rules.some((item: { rule_id: string }) => item.rule_id === ruleId), true);

  const triggerRunRes = await app.inject({
    method: 'POST',
    url: `/auto-pull/rules/${ruleId}/runs`,
    payload: {
      trigger_type: 'MANUAL',
    },
  });
  assert.equal(triggerRunRes.statusCode, 201);
  const queuedRun = triggerRunRes.json();
  assert.equal(queuedRun.status, 'PENDING');
  const failedRun = await waitForTerminalRun(app, queuedRun.run_id as string);
  assert.equal(failedRun.status, 'FAILED');
  assert.equal(failedRun.error_code, 'NO_SOURCE_CONFIG');

  const listRunsRes = await app.inject({
    method: 'GET',
    url: `/auto-pull/runs?rule_id=${encodeURIComponent(ruleId)}&limit=10`,
  });
  assert.equal(listRunsRes.statusCode, 200);
  assert.equal(listRunsRes.json().items.length > 0, true);

  const runId = queuedRun.run_id as string;
  const runDetailRes = await app.inject({
    method: 'GET',
    url: `/auto-pull/runs/${runId}`,
  });
  assert.equal(runDetailRes.statusCode, 200);
  assert.equal(runDetailRes.json().run_id, runId);

  const listAlertsRes = await app.inject({
    method: 'GET',
    url: `/auto-pull/alerts?rule_id=${encodeURIComponent(ruleId)}&acked=false`,
  });
  assert.equal(listAlertsRes.statusCode, 200);
  const alerts = listAlertsRes.json().items;
  assert.equal(Array.isArray(alerts), true);
  assert.equal(alerts.length > 0, true);
  const alertId = alerts[0]?.alert_id as string;
  assert.ok(alertId);

  const ackRes = await app.inject({
    method: 'POST',
    url: `/auto-pull/alerts/${alertId}/ack`,
    payload: {},
  });
  assert.equal(ackRes.statusCode, 200);
  assert.equal(typeof ackRes.json().ack_at, 'string');

  const patchRuleRes = await app.inject({
    method: 'PATCH',
    url: `/auto-pull/rules/${ruleId}`,
    payload: {
      status: 'PAUSED',
    },
  });
  assert.equal(patchRuleRes.statusCode, 200);
  assert.equal(patchRuleRes.json().status, 'PAUSED');

  const createTopicRuleRes = await app.inject({
    method: 'POST',
    url: '/auto-pull/rules',
    payload: {
      scope: 'TOPIC',
      topic_ids: ['TOPIC-AUTO-INT-1', 'TOPIC-AUTO-INT-2'],
      name: 'Topic Rule Invalid Zotero Config',
      sources: [
        {
          source: 'ZOTERO',
          enabled: true,
          priority: 1,
          config: {},
        },
      ],
      schedules: [
        {
          frequency: 'WEEKLY',
          days_of_week: ['MON'],
          hour: 9,
          minute: 0,
          timezone: 'UTC',
        },
      ],
    },
  });
  assert.equal(createTopicRuleRes.statusCode, 201);
  const topicRuleId = createTopicRuleRes.json().rule_id as string;
  assert.deepEqual(createTopicRuleRes.json().topic_ids, ['TOPIC-AUTO-INT-1', 'TOPIC-AUTO-INT-2']);

  const patchTopicActiveRes = await app.inject({
    method: 'PATCH',
    url: '/topics/settings/TOPIC-AUTO-INT-1',
    payload: {
      is_active: false,
      rule_ids: [topicRuleId],
    },
  });
  assert.equal(patchTopicActiveRes.statusCode, 200);
  assert.equal(patchTopicActiveRes.json().is_active, false);
  assert.deepEqual(patchTopicActiveRes.json().rule_ids, [topicRuleId]);

  const topicRunRes = await app.inject({
    method: 'POST',
    url: `/auto-pull/rules/${topicRuleId}/runs`,
    payload: {
      full_refresh: true,
    },
  });
  assert.equal(topicRunRes.statusCode, 201);
  const topicQueuedRun = topicRunRes.json();
  assert.equal(topicQueuedRun.status, 'PENDING');
  const topicRun = await waitForTerminalRun(app, topicQueuedRun.run_id as string);
  assert.equal(topicRun.status, 'FAILED');
  const topicRunSummary = (topicRun.summary as Record<string, unknown>) ?? {};
  assert.equal(topicRunSummary.full_refresh, true);
  assert.deepEqual(topicRunSummary.skipped_topic_ids, ['TOPIC-AUTO-INT-1']);
  const topicAttempts = Array.isArray(topicRun.source_attempts)
    ? (topicRun.source_attempts as Array<{ source?: string }>)
    : [];
  assert.equal(topicAttempts[0]?.source, 'ZOTERO');

  const retryRes = await app.inject({
    method: 'POST',
    url: `/auto-pull/runs/${encodeURIComponent(topicRun.run_id as string)}/retry-failed-sources`,
    payload: {},
  });
  assert.equal(retryRes.statusCode, 201);
  const retryQueuedRun = retryRes.json();
  assert.equal(retryQueuedRun.rule_id, topicRuleId);
  assert.equal(retryQueuedRun.status, 'PENDING');
  const retryRun = await waitForTerminalRun(app, retryQueuedRun.run_id as string);
  assert.equal(retryRun.status, 'FAILED');

  const deleteRuleRes = await app.inject({
    method: 'DELETE',
    url: `/auto-pull/rules/${ruleId}`,
  });
  assert.equal(deleteRuleRes.statusCode, 204);

  const listAfterDeleteRes = await app.inject({
    method: 'GET',
    url: `/auto-pull/rules?scope=GLOBAL`,
  });
  assert.equal(listAfterDeleteRes.statusCode, 200);
  assert.equal(
    listAfterDeleteRes.json().items.some((item: { rule_id: string }) => item.rule_id === ruleId),
    false,
  );

  await app.close();
});

test('cannot pause or delete last active global rule via routes', async () => {
  const app = buildApp();
  try {
    const createGlobalRes = await app.inject({
      method: 'POST',
      url: '/auto-pull/rules',
      payload: {
        scope: 'GLOBAL',
        name: 'Only Active Global Rule',
        status: 'ACTIVE',
        sources: [
          {
            source: 'CROSSREF',
            enabled: false,
            priority: 1,
          },
        ],
        schedules: [
          {
            frequency: 'DAILY',
            hour: 9,
            minute: 0,
            timezone: 'UTC',
          },
        ],
      },
    });
    assert.equal(createGlobalRes.statusCode, 201);
    const ruleId = createGlobalRes.json().rule_id as string;

    const pauseRes = await app.inject({
      method: 'PATCH',
      url: `/auto-pull/rules/${ruleId}`,
      payload: { status: 'PAUSED' },
    });
    assert.equal(pauseRes.statusCode, 400);
    assert.equal(
      String(pauseRes.json().error?.message).includes('At least one ACTIVE GLOBAL rule is required'),
      true,
    );

    const deleteRes = await app.inject({
      method: 'DELETE',
      url: `/auto-pull/rules/${ruleId}`,
    });
    assert.equal(deleteRes.statusCode, 400);
    assert.equal(
      String(deleteRes.json().error?.message).includes('At least one ACTIVE GLOBAL rule is required'),
      true,
    );
  } finally {
    await app.close();
  }
});

test('create rule rejects quality_spec.min_quality_score out of range', async () => {
  const app = buildApp();
  try {
    const res = await app.inject({
      method: 'POST',
      url: '/auto-pull/rules',
      payload: {
        scope: 'GLOBAL',
        name: 'Invalid Quality Rule',
        quality_spec: {
          min_quality_score: 101,
        },
        sources: [
          {
            source: 'CROSSREF',
            enabled: true,
            priority: 1,
          },
        ],
        schedules: [
          {
            frequency: 'DAILY',
            hour: 9,
            minute: 0,
            timezone: 'UTC',
            active: true,
          },
        ],
      },
    });
    assert.equal(res.statusCode, 400);
  } finally {
    await app.close();
  }
});

test('patch rule rejects quality_spec.min_quality_score out of range', async () => {
  const app = buildApp();
  try {
    const createRes = await app.inject({
      method: 'POST',
      url: '/auto-pull/rules',
      payload: {
        scope: 'GLOBAL',
        name: 'Patch Validation Rule',
        sources: [
          {
            source: 'CROSSREF',
            enabled: true,
            priority: 1,
          },
        ],
        schedules: [
          {
            frequency: 'DAILY',
            hour: 9,
            minute: 0,
            timezone: 'UTC',
            active: true,
          },
        ],
      },
    });
    assert.equal(createRes.statusCode, 201);
    const ruleId = createRes.json().rule_id as string;
    assert.ok(ruleId);

    const patchRes = await app.inject({
      method: 'PATCH',
      url: `/auto-pull/rules/${ruleId}`,
      payload: {
        quality_spec: {
          min_quality_score: -1,
        },
      },
    });
    assert.equal(patchRes.statusCode, 400);
  } finally {
    await app.close();
  }
});

test('topic profile rejects binding multiple rules', async () => {
  const app = buildApp();
  try {
    const createGlobalRes = await app.inject({
      method: 'POST',
      url: '/auto-pull/rules',
      payload: {
        scope: 'GLOBAL',
        name: 'Single Global For Topic Rule Validation',
        sources: [
          {
            source: 'CROSSREF',
            enabled: true,
            priority: 1,
          },
        ],
        schedules: [
          {
            frequency: 'DAILY',
            hour: 9,
            minute: 0,
            timezone: 'UTC',
            active: true,
          },
        ],
      },
    });
    assert.equal(createGlobalRes.statusCode, 201);

    const createTopicRes = await app.inject({
      method: 'POST',
      url: '/topics/settings',
      payload: {
        topic_id: 'TOPIC-AUTO-INT-SINGLE-RULE',
        name: 'Single Rule Topic',
      },
    });
    assert.equal(createTopicRes.statusCode, 201);

    const createTopicRuleARes = await app.inject({
      method: 'POST',
      url: '/auto-pull/rules',
      payload: {
        scope: 'TOPIC',
        name: 'Topic Single Rule A',
        sources: [
          {
            source: 'CROSSREF',
            enabled: true,
            priority: 1,
          },
        ],
        schedules: [
          {
            frequency: 'DAILY',
            hour: 10,
            minute: 0,
            timezone: 'UTC',
            active: true,
          },
        ],
      },
    });
    assert.equal(createTopicRuleARes.statusCode, 201);
    const ruleAId = createTopicRuleARes.json().rule_id as string;

    const createTopicRuleBRes = await app.inject({
      method: 'POST',
      url: '/auto-pull/rules',
      payload: {
        scope: 'TOPIC',
        name: 'Topic Single Rule B',
        sources: [
          {
            source: 'ARXIV',
            enabled: true,
            priority: 1,
          },
        ],
        schedules: [
          {
            frequency: 'DAILY',
            hour: 11,
            minute: 0,
            timezone: 'UTC',
            active: true,
          },
        ],
      },
    });
    assert.equal(createTopicRuleBRes.statusCode, 201);
    const ruleBId = createTopicRuleBRes.json().rule_id as string;

    const patchTopicRes = await app.inject({
      method: 'PATCH',
      url: '/topics/settings/TOPIC-AUTO-INT-SINGLE-RULE',
      payload: {
        rule_ids: [ruleAId, ruleBId],
      },
    });
    assert.equal(patchTopicRes.statusCode, 400);
  } finally {
    await app.close();
  }
});

test('topic-scoped rule run is rejected when no topic binding exists', async () => {
  const app = buildApp();
  try {
    const createGlobalRes = await app.inject({
      method: 'POST',
      url: '/auto-pull/rules',
      payload: {
        scope: 'GLOBAL',
        name: 'Global Baseline For Topic Run Guard',
        status: 'ACTIVE',
        sources: [
          {
            source: 'CROSSREF',
            enabled: true,
            priority: 1,
          },
        ],
        schedules: [
          {
            frequency: 'DAILY',
            hour: 9,
            minute: 0,
            timezone: 'UTC',
            active: true,
          },
        ],
      },
    });
    assert.equal(createGlobalRes.statusCode, 201);

    const createTopicRuleRes = await app.inject({
      method: 'POST',
      url: '/auto-pull/rules',
      payload: {
        scope: 'TOPIC',
        name: 'Unbound Topic Rule',
        topic_ids: [],
        sources: [
          {
            source: 'ARXIV',
            enabled: true,
            priority: 1,
          },
        ],
        schedules: [
          {
            frequency: 'DAILY',
            hour: 10,
            minute: 0,
            timezone: 'UTC',
            active: true,
          },
        ],
      },
    });
    assert.equal(createTopicRuleRes.statusCode, 201);
    const topicRuleId = createTopicRuleRes.json().rule_id as string;

    const triggerRunRes = await app.inject({
      method: 'POST',
      url: `/auto-pull/rules/${topicRuleId}/runs`,
      payload: {
        trigger_type: 'MANUAL',
      },
    });
    assert.equal(triggerRunRes.statusCode, 400);
    assert.equal(
      String(triggerRunRes.json().error?.message).includes('not bound to any topic'),
      true,
    );
  } finally {
    await app.close();
  }
});
