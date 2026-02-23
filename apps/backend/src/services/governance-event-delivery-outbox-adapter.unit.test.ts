import assert from 'node:assert/strict';
import test from 'node:test';
import { DurableOutboxGovernanceEventDeliveryAdapter } from './event-delivery/governance-event-delivery-outbox-adapter.js';
import { InMemoryGovernanceDeliveryOutboxStore } from './event-delivery/governance-delivery-outbox-store.js';
import type { GovernanceEventEnvelope } from './event-delivery/governance-event-delivery-adapter.js';

function envelope(overrides: Partial<GovernanceEventEnvelope> = {}): GovernanceEventEnvelope {
  return {
    event_id: 'EV-2000',
    event_type: 'research.timeline.event.appended',
    aggregate_id: 'P200',
    occurred_at: '2026-02-23T12:00:00.000Z',
    payload_version: 'v1',
    trace_id: 'trace-EV-2000',
    dedupe_key: 'EV-2000',
    ...overrides,
  };
}

test('durable-outbox adapter marks delivered when delegate succeeds', async () => {
  const store = new InMemoryGovernanceDeliveryOutboxStore(() => '2026-02-23T12:00:00.000Z');
  const adapter = new DurableOutboxGovernanceEventDeliveryAdapter(store);

  const result = await adapter.deliver(envelope(), async () => ({ ok: true }));

  assert.equal(result.mode, 'durable-outbox');
  assert.equal(result.status, 'delivered');
  const records = store.getRecords();
  assert.equal(records.length, 1);
  assert.equal(records[0]?.status, 'delivered');
  assert.equal(records[0]?.attempts, 1);
});

test('durable-outbox adapter marks failed when delegate fails', async () => {
  const store = new InMemoryGovernanceDeliveryOutboxStore(() => '2026-02-23T12:00:00.000Z');
  const adapter = new DurableOutboxGovernanceEventDeliveryAdapter(store);

  const result = await adapter.deliver(envelope(), async () => {
    throw new Error('forced outbox failure');
  });

  assert.equal(result.mode, 'durable-outbox');
  assert.equal(result.status, 'failed');
  assert.match(result.final_error ?? '', /forced outbox failure/);
  const records = store.getRecords();
  assert.equal(records.length, 1);
  assert.equal(records[0]?.status, 'failed');
  assert.equal(records[0]?.attempts, 1);
  assert.match(records[0]?.last_error ?? '', /forced outbox failure/);
});
