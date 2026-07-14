import assert from 'node:assert/strict';
import test from 'node:test';

import { ExperimentV2IntegrationRelayScheduler } from './experiment-v2-integration-relay-scheduler.js';

test('relay scheduler serializes ticks and drains independently of admission state', async () => {
  let release: (() => void) | undefined;
  let calls = 0;
  const scheduler = new ExperimentV2IntegrationRelayScheduler({
    async drainUntilIdle() {
      calls += 1;
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      return {
        claimed: 0,
        delivered: 0,
        released: 0,
        terminalized: 0,
        failures: [],
        passes: 1,
        idle: true,
      };
    },
  });

  const first = scheduler.runTick();
  assert.equal(await scheduler.runTick(), false);
  assert.equal(calls, 1);
  release?.();
  assert.equal(await first, true);
  await scheduler.stop();
});

test('relay scheduler contains transient failures so a later tick can retry', async () => {
  const failures: unknown[] = [];
  let calls = 0;
  const scheduler = new ExperimentV2IntegrationRelayScheduler({
    async drainUntilIdle() {
      calls += 1;
      if (calls === 1) {
        throw new Error('database temporarily unavailable');
      }
      return {
        claimed: 0,
        delivered: 0,
        released: 0,
        terminalized: 0,
        failures: [],
        passes: 1,
        idle: true,
      };
    },
  }, {
    onError: (error) => failures.push(error),
  });

  assert.equal(await scheduler.runTick(), false);
  assert.equal(failures.length, 1);
  assert.equal(await scheduler.runTick(), true);
  assert.equal(calls, 2);
  await scheduler.stop();
});
