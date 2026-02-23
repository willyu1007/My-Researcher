import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  FileGovernanceDeliveryAuditStore,
  buildGovernanceDeliveryAuditRecord,
} from './event-delivery/governance-delivery-audit-store.js';
import type { GovernanceEventEnvelope } from './event-delivery/governance-event-delivery-adapter.js';

function createEnvelope(overrides: Partial<GovernanceEventEnvelope> = {}): GovernanceEventEnvelope {
  return {
    event_id: 'EV-0100',
    event_type: 'research.timeline.event.appended',
    aggregate_id: 'P100',
    occurred_at: '2026-02-23T10:00:00.000Z',
    payload_version: 'v1',
    trace_id: 'trace-EV-0100',
    dedupe_key: 'EV-0100',
    ...overrides,
  };
}

test('file audit store persists records as jsonl lines', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'pea-audit-store-'));
  const filePath = path.join(dir, 'audit.jsonl');
  const store = new FileGovernanceDeliveryAuditStore({ filePath });

  const record = buildGovernanceDeliveryAuditRecord({
    paperId: 'P100',
    envelope: createEnvelope(),
    result: {
      status: 'failed',
      mode: 'in-process',
      envelope: createEnvelope(),
      attempts: [
        {
          attempt: 1,
          started_at: '2026-02-23T10:00:00.000Z',
          finished_at: '2026-02-23T10:00:00.100Z',
          ok: false,
          error_message: 'network timeout',
        },
      ],
      final_error: 'network timeout',
    },
    now: () => '2026-02-23T10:00:01.000Z',
  });

  await store.append(record);

  const raw = await fs.readFile(filePath, 'utf8');
  const lines = raw.trim().split('\n');
  assert.equal(lines.length, 1);
  const parsed = JSON.parse(lines[0] ?? '{}') as { status?: string; paper_id?: string; final_error?: string };
  assert.equal(parsed.status, 'failed');
  assert.equal(parsed.paper_id, 'P100');
  assert.equal(parsed.final_error, 'network timeout');
});
