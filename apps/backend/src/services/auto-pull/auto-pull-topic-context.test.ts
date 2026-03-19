import assert from 'node:assert/strict';
import test from 'node:test';
import { AppError } from '../../errors/app-error.js';
import { InMemoryAutoPullRepository } from '../../repositories/in-memory-auto-pull-repository.js';
import type {
  AutoPullRuleRecord,
  TopicProfileRecord,
} from '../../repositories/auto-pull-repository.js';
import {
  assignRuleToTopics,
  buildTopicExecutionContexts,
  ensureAtLeastOneActiveGlobalRule,
  normalizeTopicIdsFromPayload,
  resolveNextRuleTopicIds,
} from './auto-pull-topic-context.js';

function buildRule(overrides: Partial<AutoPullRuleRecord> = {}): AutoPullRuleRecord {
  return {
    id: 'rule-1',
    scope: 'TOPIC',
    name: 'Rule 1',
    status: 'ACTIVE',
    querySpec: {
      includeKeywords: [],
      excludeKeywords: [],
      authors: ['Ada Lovelace'],
      venues: [],
      maxResultsPerSource: 25,
    },
    timeSpec: {
      lookbackDays: 0,
      minYear: null,
      maxYear: null,
    },
    qualitySpec: {
      minQualityScore: 70,
    },
    createdAt: '2026-03-19T00:00:00.000Z',
    updatedAt: '2026-03-19T00:00:00.000Z',
    ...overrides,
  };
}

function buildTopic(overrides: Partial<TopicProfileRecord> = {}): TopicProfileRecord {
  return {
    id: 'topic-1',
    name: 'Topic 1',
    isActive: true,
    initialPullPending: true,
    includeKeywords: ['retrieval'],
    excludeKeywords: ['biology'],
    venueFilters: ['NeurIPS'],
    defaultLookbackDays: 90,
    defaultMinYear: 2020,
    defaultMaxYear: 2026,
    createdAt: '2026-03-19T00:00:00.000Z',
    updatedAt: '2026-03-19T00:00:00.000Z',
    ...overrides,
  };
}

test('normalizeTopicIdsFromPayload trims, deduplicates, and drops empty ids', () => {
  assert.deepEqual(
    normalizeTopicIdsFromPayload([' topic-a ', '', 'topic-b', 'topic-a'], ' topic-b '),
    ['topic-a', 'topic-b'],
  );
});

test('resolveNextRuleTopicIds clears bindings when rule switches to GLOBAL', () => {
  const nextTopicIds = resolveNextRuleTopicIds(
    { scope: 'GLOBAL' },
    ['topic-a', 'topic-b'],
    'GLOBAL',
  );

  assert.deepEqual(nextTopicIds, []);
});

test('buildTopicExecutionContexts merges topic defaults and skips inactive topics', () => {
  const contexts = buildTopicExecutionContexts(
    buildRule(),
    [
      buildTopic({ id: 'topic-active' }),
      buildTopic({ id: 'topic-inactive', isActive: false }),
    ],
  );

  assert.equal(contexts.length, 1);
  assert.deepEqual(contexts[0], {
    topicId: 'topic-active',
    querySpec: {
      includeKeywords: ['retrieval'],
      excludeKeywords: ['biology'],
      authors: ['Ada Lovelace'],
      venues: ['NeurIPS'],
      maxResultsPerSource: 25,
    },
    timeSpec: {
      lookbackDays: 90,
      minYear: 2020,
      maxYear: 2026,
    },
    initialPullPending: true,
  });
});

test('ensureAtLeastOneActiveGlobalRule rejects removing the last active global rule', async () => {
  const repository = new InMemoryAutoPullRepository();
  await repository.createRule(buildRule({ id: 'rule-global', scope: 'GLOBAL' }));

  await assert.rejects(
    () =>
      ensureAtLeastOneActiveGlobalRule(repository, {
        ruleId: 'rule-global',
        currentScope: 'GLOBAL',
        currentStatus: 'ACTIVE',
        nextScope: null,
        nextStatus: null,
      }),
    (error: unknown) =>
      error instanceof AppError
      && error.statusCode === 400
      && error.message === 'At least one ACTIVE GLOBAL rule is required.',
  );
});

test('assignRuleToTopics rewires prior topic bindings through repository helpers', async () => {
  const repository = new InMemoryAutoPullRepository();
  await repository.createRule(buildRule({ id: 'rule-1' }));
  await repository.createTopicProfile(buildTopic({ id: 'topic-a' }));
  await repository.createTopicProfile(buildTopic({ id: 'topic-b' }));
  await repository.replaceRuleTopics('rule-1', ['topic-a']);

  await assignRuleToTopics(repository, 'rule-1', ['topic-b']);

  assert.deepEqual(await repository.listRuleTopicIds('rule-1'), ['topic-b']);
  assert.deepEqual(await repository.listTopicRuleIds('topic-a'), []);
  assert.deepEqual(await repository.listTopicRuleIds('topic-b'), ['rule-1']);
});
