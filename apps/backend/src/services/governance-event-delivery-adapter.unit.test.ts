import assert from 'node:assert/strict';
import test from 'node:test';
import {
  InProcessGovernanceEventDeliveryAdapter,
  type GovernanceEventEnvelope,
} from './event-delivery/governance-event-delivery-adapter.js';

function buildEnvelope(overrides: Partial<GovernanceEventEnvelope> = {}): GovernanceEventEnvelope {
  return {
    event_id: 'EV-0001',
    event_type: 'research.timeline.event.appended',
    aggregate_id: 'P001',
    occurred_at: '2026-02-23T00:00:00.000Z',
    payload_version: 'v1',
    trace_id: 'trace-EV-0001',
    dedupe_key: 'EV-0001',
    ...overrides,
  };
}

test('in-process adapter delivers on first attempt', async () => {
  const adapter = new InProcessGovernanceEventDeliveryAdapter({
    maxAttempts: 3,
    backoffMs: 0,
  });
  let dispatchCount = 0;

  const result = await adapter.deliver(buildEnvelope(), async () => {
    dispatchCount += 1;
    return { ok: true };
  });

  assert.equal(dispatchCount, 1);
  assert.equal(result.status, 'delivered');
  assert.equal(result.mode, 'in-process');
  assert.equal(result.attempts.length, 1);
  assert.equal(result.attempts[0]?.ok, true);
  assert.deepEqual(result.value, { ok: true });
});

test('in-process adapter retries then succeeds', async () => {
  const adapter = new InProcessGovernanceEventDeliveryAdapter({
    maxAttempts: 3,
    backoffMs: 0,
  });
  let dispatchCount = 0;

  const result = await adapter.deliver(buildEnvelope(), async () => {
    dispatchCount += 1;
    if (dispatchCount < 2) {
      throw new Error('transient failure');
    }
    return { ok: true, retry: true };
  });

  assert.equal(dispatchCount, 2);
  assert.equal(result.status, 'delivered');
  assert.equal(result.attempts.length, 2);
  assert.equal(result.attempts[0]?.ok, false);
  assert.equal(result.attempts[1]?.ok, true);
  assert.equal(result.value?.retry, true);
});

test('in-process adapter returns failed after max attempts', async () => {
  const adapter = new InProcessGovernanceEventDeliveryAdapter({
    maxAttempts: 3,
    backoffMs: 0,
  });
  let dispatchCount = 0;

  const result = await adapter.deliver(buildEnvelope(), async () => {
    dispatchCount += 1;
    throw new Error('always fail');
  });

  assert.equal(dispatchCount, 3);
  assert.equal(result.status, 'failed');
  assert.equal(result.attempts.length, 3);
  assert.equal(result.attempts.every((attempt) => !attempt.ok), true);
  assert.match(result.final_error ?? '', /always fail/);
});

test('in-process adapter dedupe cache skips duplicated dispatch', async () => {
  const adapter = new InProcessGovernanceEventDeliveryAdapter({
    maxAttempts: 3,
    backoffMs: 0,
  });
  let dispatchCount = 0;

  const first = await adapter.deliver(buildEnvelope(), async () => {
    dispatchCount += 1;
    return { value: 'first' };
  });

  const second = await adapter.deliver(
    buildEnvelope({
      event_id: 'EV-9999',
      trace_id: 'trace-EV-9999',
      // keep the same dedupe key to emulate duplicate delivery
      dedupe_key: 'EV-0001',
    }),
    async () => {
      dispatchCount += 1;
      return { value: 'second' };
    },
  );

  assert.equal(dispatchCount, 1);
  assert.equal(first.status, 'delivered');
  assert.equal(second.status, 'duplicate');
  assert.equal(second.attempts.length, 0);
  assert.equal(second.value?.value, 'first');
});
