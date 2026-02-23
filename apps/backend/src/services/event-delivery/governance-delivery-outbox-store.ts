import { promises as fs } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import type { GovernanceEventEnvelope } from './governance-event-delivery-adapter.js';

export type GovernanceOutboxStatus = 'pending' | 'delivered' | 'failed';

export type GovernanceOutboxRecord = {
  outbox_id: string;
  envelope: GovernanceEventEnvelope;
  status: GovernanceOutboxStatus;
  enqueued_at: string;
  updated_at: string;
  attempts: number;
  last_error?: string;
};

export interface GovernanceDeliveryOutboxStore {
  enqueue(envelope: GovernanceEventEnvelope): Promise<GovernanceOutboxRecord>;
  markDelivered(outboxId: string): Promise<void>;
  markFailed(outboxId: string, errorMessage: string): Promise<void>;
}

export class InMemoryGovernanceDeliveryOutboxStore
  implements GovernanceDeliveryOutboxStore
{
  private readonly records = new Map<string, GovernanceOutboxRecord>();
  private sequence = 0;
  private readonly now: () => string;

  constructor(now: () => string = () => new Date().toISOString()) {
    this.now = now;
  }

  async enqueue(envelope: GovernanceEventEnvelope): Promise<GovernanceOutboxRecord> {
    this.sequence += 1;
    const outboxId = `OB-${String(this.sequence).padStart(6, '0')}`;
    const now = this.now();
    const record: GovernanceOutboxRecord = {
      outbox_id: outboxId,
      envelope,
      status: 'pending',
      enqueued_at: now,
      updated_at: now,
      attempts: 0,
    };
    this.records.set(outboxId, record);
    return record;
  }

  async markDelivered(outboxId: string): Promise<void> {
    const current = this.records.get(outboxId);
    if (!current) {
      return;
    }
    this.records.set(outboxId, {
      ...current,
      status: 'delivered',
      updated_at: this.now(),
      attempts: current.attempts + 1,
      last_error: undefined,
    });
  }

  async markFailed(outboxId: string, errorMessage: string): Promise<void> {
    const current = this.records.get(outboxId);
    if (!current) {
      return;
    }
    this.records.set(outboxId, {
      ...current,
      status: 'failed',
      updated_at: this.now(),
      attempts: current.attempts + 1,
      last_error: errorMessage,
    });
  }

  getRecords(): GovernanceOutboxRecord[] {
    return [...this.records.values()];
  }
}

type FileGovernanceDeliveryOutboxStoreOptions = {
  filePath?: string;
  now?: () => string;
};

type GovernanceOutboxEventLogEntry =
  | {
      type: 'enqueued';
      outbox_id: string;
      envelope: GovernanceEventEnvelope;
      at: string;
    }
  | {
      type: 'delivered';
      outbox_id: string;
      at: string;
    }
  | {
      type: 'failed';
      outbox_id: string;
      at: string;
      error: string;
    };

const defaultOutboxPath = (): string =>
  path.join(tmpdir(), 'paper-engineering-assistant', 'governance-delivery-outbox.jsonl');

export class FileGovernanceDeliveryOutboxStore
  implements GovernanceDeliveryOutboxStore
{
  private readonly filePath: string;
  private readonly now: () => string;
  private sequence = 0;

  constructor(options: FileGovernanceDeliveryOutboxStoreOptions = {}) {
    this.filePath = options.filePath ?? defaultOutboxPath();
    this.now = options.now ?? (() => new Date().toISOString());
  }

  async enqueue(envelope: GovernanceEventEnvelope): Promise<GovernanceOutboxRecord> {
    this.sequence += 1;
    const outboxId = `OB-${String(this.sequence).padStart(6, '0')}`;
    const now = this.now();
    await this.appendLog({
      type: 'enqueued',
      outbox_id: outboxId,
      envelope,
      at: now,
    });
    return {
      outbox_id: outboxId,
      envelope,
      status: 'pending',
      enqueued_at: now,
      updated_at: now,
      attempts: 0,
    };
  }

  async markDelivered(outboxId: string): Promise<void> {
    await this.appendLog({
      type: 'delivered',
      outbox_id: outboxId,
      at: this.now(),
    });
  }

  async markFailed(outboxId: string, errorMessage: string): Promise<void> {
    await this.appendLog({
      type: 'failed',
      outbox_id: outboxId,
      at: this.now(),
      error: errorMessage,
    });
  }

  private async appendLog(entry: GovernanceOutboxEventLogEntry): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.appendFile(this.filePath, `${JSON.stringify(entry)}\n`, 'utf8');
  }
}
