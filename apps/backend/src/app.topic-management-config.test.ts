import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp, resolveTopicManagementStoreConfig } from './app.js';

const STORE_ENV_KEYS = [
  'TOPIC_REPOSITORY',
  'RESEARCH_LIFECYCLE_REPOSITORY',
  'AUTO_PULL_REPOSITORY',
] as const;

function resetStoreEnv(snapshot: Record<string, string | undefined>) {
  for (const key of STORE_ENV_KEYS) {
    const value = snapshot[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

test('resolveTopicManagementStoreConfig cascades TOPIC_REPOSITORY to dependent stores', () => {
  const snapshot = Object.fromEntries(STORE_ENV_KEYS.map((key) => [key, process.env[key]]));
  try {
    process.env.TOPIC_REPOSITORY = 'prisma';
    delete process.env.RESEARCH_LIFECYCLE_REPOSITORY;
    delete process.env.AUTO_PULL_REPOSITORY;

    assert.deepEqual(resolveTopicManagementStoreConfig(), {
      topicStrategy: 'prisma',
      researchLifecycleStrategy: 'prisma',
      literatureStrategy: 'prisma',
      autoPullStrategy: 'prisma',
    });
  } finally {
    resetStoreEnv(snapshot);
  }
});

test('buildApp rejects mixed store strategies for topic-management dependencies', () => {
  const snapshot = Object.fromEntries(STORE_ENV_KEYS.map((key) => [key, process.env[key]]));
  try {
    process.env.TOPIC_REPOSITORY = 'prisma';
    process.env.AUTO_PULL_REPOSITORY = 'memory';
    delete process.env.RESEARCH_LIFECYCLE_REPOSITORY;

    assert.throws(
      () => buildApp(),
      /same strategy/i,
    );
  } finally {
    resetStoreEnv(snapshot);
  }
});
