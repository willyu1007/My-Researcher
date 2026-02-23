export type DeliveryMode = 'in-process' | 'durable-outbox';

export type GovernanceEventEnvelope = {
  event_id: string;
  event_type: string;
  aggregate_id: string;
  occurred_at: string;
  payload_version: string;
  trace_id: string;
  dedupe_key: string;
};

export type GovernanceDeliveryAttempt = {
  attempt: number;
  started_at: string;
  finished_at: string;
  ok: boolean;
  error_message?: string;
};

export type GovernanceDeliveryResult<T> = {
  status: 'delivered' | 'duplicate' | 'failed';
  mode: DeliveryMode;
  envelope: GovernanceEventEnvelope;
  attempts: GovernanceDeliveryAttempt[];
  value?: T;
  final_error?: string;
};

export interface GovernanceEventDeliveryAdapter {
  readonly mode: DeliveryMode;
  deliver<T>(
    envelope: GovernanceEventEnvelope,
    dispatch: () => Promise<T>,
  ): Promise<GovernanceDeliveryResult<T>>;
}

type InProcessGovernanceEventDeliveryAdapterOptions = {
  maxAttempts?: number;
  backoffMs?: number;
  now?: () => string;
  sleep?: (ms: number) => Promise<void>;
};

const defaultNow = (): string => new Date().toISOString();
const defaultSleep = async (ms: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, ms));
};

export class InProcessGovernanceEventDeliveryAdapter
  implements GovernanceEventDeliveryAdapter
{
  readonly mode: DeliveryMode = 'in-process';
  private readonly maxAttempts: number;
  private readonly backoffMs: number;
  private readonly now: () => string;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly dedupeCache = new Map<string, unknown>();

  constructor(options: InProcessGovernanceEventDeliveryAdapterOptions = {}) {
    this.maxAttempts = Math.max(1, options.maxAttempts ?? 3);
    this.backoffMs = Math.max(0, options.backoffMs ?? 25);
    this.now = options.now ?? defaultNow;
    this.sleep = options.sleep ?? defaultSleep;
  }

  async deliver<T>(
    envelope: GovernanceEventEnvelope,
    dispatch: () => Promise<T>,
  ): Promise<GovernanceDeliveryResult<T>> {
    if (this.dedupeCache.has(envelope.dedupe_key)) {
      return {
        status: 'duplicate',
        mode: this.mode,
        envelope,
        attempts: [],
        value: this.dedupeCache.get(envelope.dedupe_key) as T,
      };
    }

    const attempts: GovernanceDeliveryAttempt[] = [];

    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      const startedAt = this.now();
      try {
        const value = await dispatch();
        const finishedAt = this.now();

        attempts.push({
          attempt,
          started_at: startedAt,
          finished_at: finishedAt,
          ok: true,
        });

        this.dedupeCache.set(envelope.dedupe_key, value as unknown);

        return {
          status: 'delivered',
          mode: this.mode,
          envelope,
          attempts,
          value,
        };
      } catch (error) {
        const finishedAt = this.now();
        attempts.push({
          attempt,
          started_at: startedAt,
          finished_at: finishedAt,
          ok: false,
          error_message: error instanceof Error ? error.message : 'Unknown delivery error.',
        });

        if (attempt < this.maxAttempts && this.backoffMs > 0) {
          await this.sleep(this.backoffMs * attempt);
        }
      }
    }

    return {
      status: 'failed',
      mode: this.mode,
      envelope,
      attempts,
      final_error: attempts[attempts.length - 1]?.error_message ?? 'Delivery failed.',
    };
  }
}
