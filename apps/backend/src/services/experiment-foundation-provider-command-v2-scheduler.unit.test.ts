import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ExperimentFoundationProviderCommandV2Scheduler,
  nextProviderCommandDrainDelay,
} from './experiment-foundation-provider-command-v2-scheduler.js';

test('provider command scheduler coalesces concurrent ticks and can restart', async () => {
  let drains = 0;
  let release: (() => void) | undefined;
  const blocker = new Promise<void>((resolve) => {
    release = resolve;
  });
  const scheduler = new ExperimentFoundationProviderCommandV2Scheduler({
    async drainUntilIdle() {
      drains += 1;
      await blocker;
    },
  });

  const first = scheduler.runTick();
  assert.equal(await scheduler.runTick(), false);
  release?.();
  assert.equal(await first, true);
  assert.equal(drains, 1);
  assert.equal(await scheduler.runTick(), true);
  assert.equal(drains, 2);
});

test('provider command scheduler reports failures without throwing', async () => {
  const failures: unknown[] = [];
  const scheduler = new ExperimentFoundationProviderCommandV2Scheduler(
    {
      async drainUntilIdle() {
        throw new Error('database unavailable');
      },
    },
    { onError: (error) => failures.push(error) },
  );

  assert.equal(await scheduler.runTick(), false);
  assert.equal(failures.length, 1);
});

test('provider command scheduler uses bounded exponential failure backoff and resets on success', () => {
  const base = {
    tickMs: 1_000,
    maxBackoffMs: 60_000,
  };
  const first = nextProviderCommandDrainDelay({
    ...base,
    succeeded: false,
    currentDelayMs: 1_000,
  });
  const second = nextProviderCommandDrainDelay({
    ...base,
    succeeded: false,
    currentDelayMs: first,
  });
  const capped = nextProviderCommandDrainDelay({
    ...base,
    succeeded: false,
    currentDelayMs: 40_000,
  });
  const reset = nextProviderCommandDrainDelay({
    ...base,
    succeeded: true,
    currentDelayMs: capped,
  });

  assert.equal(first, 2_000);
  assert.equal(second, 4_000);
  assert.equal(capped, 60_000);
  assert.equal(reset, 1_000);
});
