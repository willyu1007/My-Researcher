import { promises as fs } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import type {
  GovernanceDeliveryAttempt,
  GovernanceDeliveryResult,
  GovernanceEventEnvelope,
} from './governance-event-delivery-adapter.js';

export type GovernanceDeliveryAuditRecord = {
  audit_id: string;
  paper_id: string;
  event_id: string;
  event_type: string;
  mode: GovernanceDeliveryResult<unknown>['mode'];
  status: GovernanceDeliveryResult<unknown>['status'];
  dedupe_key: string;
  trace_id: string;
  occurred_at: string;
  recorded_at: string;
  attempts: GovernanceDeliveryAttempt[];
  final_error?: string;
};

export interface GovernanceDeliveryAuditStore {
  append(record: GovernanceDeliveryAuditRecord): Promise<void>;
}

export class InMemoryGovernanceDeliveryAuditStore implements GovernanceDeliveryAuditStore {
  private readonly records: GovernanceDeliveryAuditRecord[] = [];

  async append(record: GovernanceDeliveryAuditRecord): Promise<void> {
    this.records.push(record);
  }

  getRecords(): GovernanceDeliveryAuditRecord[] {
    return [...this.records];
  }
}

type FileGovernanceDeliveryAuditStoreOptions = {
  filePath?: string;
  now?: () => string;
};

const defaultAuditPath = (): string =>
  path.join(tmpdir(), 'paper-engineering-assistant', 'governance-delivery-audit.jsonl');

const defaultNow = (): string => new Date().toISOString();

export class FileGovernanceDeliveryAuditStore implements GovernanceDeliveryAuditStore {
  private readonly filePath: string;
  private readonly now: () => string;

  constructor(options: FileGovernanceDeliveryAuditStoreOptions = {}) {
    this.filePath = options.filePath ?? defaultAuditPath();
    this.now = options.now ?? defaultNow;
  }

  async append(record: GovernanceDeliveryAuditRecord): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    const line = JSON.stringify({
      ...record,
      recorded_at: record.recorded_at || this.now(),
    });
    await fs.appendFile(this.filePath, `${line}\n`, 'utf8');
  }
}

export function buildGovernanceDeliveryAuditRecord(input: {
  paperId: string;
  envelope: GovernanceEventEnvelope;
  result: GovernanceDeliveryResult<unknown>;
  now?: () => string;
}): GovernanceDeliveryAuditRecord {
  const now = input.now ?? defaultNow;
  return {
    audit_id: `AUD-${input.envelope.event_id}`,
    paper_id: input.paperId,
    event_id: input.envelope.event_id,
    event_type: input.envelope.event_type,
    mode: input.result.mode,
    status: input.result.status,
    dedupe_key: input.envelope.dedupe_key,
    trace_id: input.envelope.trace_id,
    occurred_at: input.envelope.occurred_at,
    recorded_at: now(),
    attempts: input.result.attempts,
    final_error: input.result.final_error,
  };
}
