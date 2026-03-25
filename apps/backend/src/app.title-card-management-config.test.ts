import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp, resolveTitleCardManagementStoreConfig } from './app.js';

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

test('resolveTitleCardManagementStoreConfig cascades TOPIC_REPOSITORY to dependent stores', () => {
  const snapshot = Object.fromEntries(STORE_ENV_KEYS.map((key) => [key, process.env[key]]));
  try {
    process.env.TOPIC_REPOSITORY = 'prisma';
    delete process.env.RESEARCH_LIFECYCLE_REPOSITORY;
    delete process.env.AUTO_PULL_REPOSITORY;

    assert.deepEqual(resolveTitleCardManagementStoreConfig(), {
      titleCardStrategy: 'prisma',
      researchLifecycleStrategy: 'prisma',
      literatureStrategy: 'prisma',
      autoPullStrategy: 'prisma',
    });
  } finally {
    resetStoreEnv(snapshot);
  }
});

test('buildApp rejects mixed store strategies for title-card management dependencies', () => {
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

test('buildApp does not auto-seed title-card demo data by default', async () => {
  const app = buildApp();
  try {
    const response = await app.inject({
      method: 'GET',
      url: '/title-cards',
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as {
      items: unknown[];
      summary: {
        total_title_cards: number;
      };
    };
    assert.equal(body.items.length, 0);
    assert.equal(body.summary.total_title_cards, 0);
  } finally {
    await app.close();
  }
});
