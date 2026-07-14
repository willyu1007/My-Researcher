import type { ExperimentV2IntegrationRelayService } from './experiment-v2-integration-relay-service.js';

const DEFAULT_TICK_MS = 1_000;

export interface ExperimentV2IntegrationRelaySchedulerOptions {
  tickMs?: number;
  onError?: (error: unknown) => void;
}

/**
 * Process-local wake-up loop for the database-backed v2 outboxes.
 *
 * Delivery safety does not depend on this timer: leases, inbox receipts, and
 * idempotency live in the two domain repositories. The timer only guarantees
 * that a running backend keeps draining committed sagas even after admission
 * has been disabled.
 */
export class ExperimentV2IntegrationRelayScheduler {
  private readonly tickMs: number;
  private readonly onError: (error: unknown) => void;
  private timer: NodeJS.Timeout | null = null;
  private inFlight: Promise<boolean> | null = null;

  constructor(
    private readonly relay: Pick<ExperimentV2IntegrationRelayService, 'drainUntilIdle'>,
    options: ExperimentV2IntegrationRelaySchedulerOptions = {},
  ) {
    const tickMs = options.tickMs ?? DEFAULT_TICK_MS;
    this.tickMs = Number.isFinite(tickMs) && tickMs >= 100
      ? Math.floor(tickMs)
      : DEFAULT_TICK_MS;
    this.onError = options.onError ?? (() => undefined);
  }

  start(): void {
    if (this.timer) {
      return;
    }
    this.timer = setInterval(() => {
      void this.runTick();
    }, this.tickMs);
    this.timer.unref();
  }

  async stop(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    await this.inFlight;
  }

  async runTick(): Promise<boolean> {
    if (this.inFlight) {
      return false;
    }
    const operation = this.runDrain();
    this.inFlight = operation;
    try {
      return await operation;
    } finally {
      this.inFlight = null;
    }
  }

  private async runDrain(): Promise<boolean> {
    try {
      await this.relay.drainUntilIdle({
        limit_per_domain: 100,
        max_passes: 100,
      });
      return true;
    } catch (error) {
      // A schema-not-yet-applied or temporarily unavailable database must not
      // become an unhandled rejection. A later tick retries the durable rows.
      this.onError(error);
      return false;
    }
  }
}
