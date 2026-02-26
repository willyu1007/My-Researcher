import { AutoPullService } from './auto-pull-service.js';

const DEFAULT_TICK_MS = 60_000;

type AutoPullSchedulerOptions = {
  tickMs?: number;
};

export class AutoPullScheduler {
  private readonly tickMs: number;

  private timer: NodeJS.Timeout | null = null;

  private running = false;

  constructor(
    private readonly service: AutoPullService,
    options: AutoPullSchedulerOptions = {},
  ) {
    const tickMs = options.tickMs ?? DEFAULT_TICK_MS;
    this.tickMs = Number.isFinite(tickMs) && tickMs >= 1_000 ? Math.floor(tickMs) : DEFAULT_TICK_MS;
  }

  start(): void {
    if (this.timer) {
      return;
    }

    this.timer = setInterval(() => {
      void this.runTick();
    }, this.tickMs);
  }

  async stop(): Promise<void> {
    if (!this.timer) {
      return;
    }

    clearInterval(this.timer);
    this.timer = null;
  }

  async runTick(now: Date = new Date()): Promise<boolean> {
    if (this.running) {
      return false;
    }

    this.running = true;
    try {
      await this.service.runScheduledTick(now);
      return true;
    } finally {
      this.running = false;
    }
  }
}
