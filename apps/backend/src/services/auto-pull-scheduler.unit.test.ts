import assert from 'node:assert/strict';
import test from 'node:test';
import { AutoPullScheduler } from './auto-pull-scheduler.js';

type SchedulerService = ConstructorParameters<typeof AutoPullScheduler>[0];

test('runTick skips when previous tick is still running', async () => {
  let callCount = 0;
  let resolvePending: (() => void) | undefined;

  const service = {
    runScheduledTick: async () => {
      callCount += 1;
      if (callCount === 1) {
        await new Promise<void>((resolve) => {
          resolvePending = resolve;
        });
      }
    },
  } as unknown as SchedulerService;

  const scheduler = new AutoPullScheduler(service, { tickMs: 1_000 });

  const first = scheduler.runTick(new Date('2026-02-26T09:00:00.000Z'));
  const second = await scheduler.runTick(new Date('2026-02-26T09:00:01.000Z'));

  assert.equal(second, false);
  assert.equal(callCount, 1);

  if (typeof resolvePending !== 'function') {
    throw new Error('expected resolvePending to be set');
  }
  resolvePending();
  const firstResult = await first;
  assert.equal(firstResult, true);

  const third = await scheduler.runTick(new Date('2026-02-26T09:00:02.000Z'));
  assert.equal(third, true);
  assert.equal(callCount, 2);
});

test('start and stop are idempotent', async () => {
  const service = {
    runScheduledTick: async () => {},
  } as unknown as SchedulerService;

  const scheduler = new AutoPullScheduler(service, { tickMs: 1_000 });
  scheduler.start();
  scheduler.start();

  await scheduler.stop();
  await scheduler.stop();

  assert.ok(true);
});
