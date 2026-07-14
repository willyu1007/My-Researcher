const DEFAULT_TICK_MS = 1_000;
const DEFAULT_MAX_BACKOFF_MS = 60_000;

export interface ExperimentFoundationProviderCommandV2Drain {
  drainUntilIdle(options?: {
    limit?: number;
    max_passes?: number;
  }): Promise<unknown>;
}

export interface ExperimentFoundationProviderCommandV2SchedulerOptions {
  tickMs?: number;
  maxBackoffMs?: number;
  onError?: (error: unknown) => void;
}

export function nextProviderCommandDrainDelay(input: {
  succeeded: boolean;
  currentDelayMs: number;
  tickMs: number;
  maxBackoffMs: number;
}): number {
  if (input.succeeded) {
    return input.tickMs;
  }
  return Math.min(
    input.maxBackoffMs,
    Math.max(input.tickMs, input.currentDelayMs * 2),
  );
}

/**
 * Process-local wake-up loop for the durable Pack B provider-command outbox.
 * Intake capability is deliberately absent: committed simulation commands
 * must keep draining after new Attempt creation is disabled.
 */
export class ExperimentFoundationProviderCommandV2Scheduler {
  private readonly tickMs: number;
  private readonly maxBackoffMs: number;
  private readonly onError: (error: unknown) => void;
  private timer: NodeJS.Timeout | null = null;
  private inFlight: Promise<boolean> | null = null;
  private running = false;
  private currentDelayMs: number;

  constructor(
    private readonly worker: ExperimentFoundationProviderCommandV2Drain,
    options: ExperimentFoundationProviderCommandV2SchedulerOptions = {},
  ) {
    const tickMs = options.tickMs ?? DEFAULT_TICK_MS;
    this.tickMs = Number.isFinite(tickMs) && tickMs >= 100
      ? Math.floor(tickMs)
      : DEFAULT_TICK_MS;
    const maxBackoffMs = options.maxBackoffMs ?? DEFAULT_MAX_BACKOFF_MS;
    this.maxBackoffMs = Number.isFinite(maxBackoffMs) && maxBackoffMs >= this.tickMs
      ? Math.floor(maxBackoffMs)
      : Math.max(DEFAULT_MAX_BACKOFF_MS, this.tickMs);
    this.currentDelayMs = this.tickMs;
    this.onError = options.onError ?? (() => undefined);
  }

  start(): void {
    if (this.running) {
      return;
    }
    this.running = true;
    this.currentDelayMs = this.tickMs;
    this.schedule(this.currentDelayMs);
  }

  async stop(): Promise<void> {
    this.running = false;
    if (this.timer) {
      clearTimeout(this.timer);
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
      await this.worker.drainUntilIdle({ limit: 100, max_passes: 100 });
      return true;
    } catch (error) {
      // Missing migrations and transient database failures are retried on a
      // later tick; they must not become unhandled process rejections.
      this.onError(error);
      return false;
    }
  }

  private schedule(delayMs: number): void {
    if (!this.running) {
      return;
    }
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.runScheduledTick();
    }, delayMs);
    this.timer.unref();
  }

  private async runScheduledTick(): Promise<void> {
    const succeeded = await this.runTick();
    this.currentDelayMs = nextProviderCommandDrainDelay({
      succeeded,
      currentDelayMs: this.currentDelayMs,
      tickMs: this.tickMs,
      maxBackoffMs: this.maxBackoffMs,
    });
    this.schedule(this.currentDelayMs);
  }
}
