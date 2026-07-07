// T-130 W-06 (D8): import auto-advance gate — newly imported literature is pushed through the
// content-processing pipeline automatically, via AUTO_ADVANCE backfill jobs (reusing backfill's
// concurrency clamp, cancellation, checkpointing, and crash recovery; the orchestrator
// single-flight guard stays untouched).
//
// Quality tiers (D8): auto-pull score >= full_chain_min_score -> full chain (target INDEXED);
// >= fulltext_only_min_score -> up to FULLTEXT_PREPROCESSED (KEY_CONTENT_READY defaults to
// codex_curated, a natural human stop; saves LLM/embedding spend on mid-tier items); below ->
// untouched. Unscored imports (manual/Zotero) follow the advance_unscored setting (default none).
// Cost gates: daily literature budget + per-job parallel clamp; master switch default OFF.
//
// Boundary note: this deliberately revises T-029's "collection never triggers processing" into
// "collection may ORCHESTRATE processing through an explicit gate" — recorded in T-130 03 and to
// be encoded in the literature SSOT matrix (W-08).

import type {
  LiteratureContentProcessingBatchJobRecord,
  LiteratureRepository,
} from '../repositories/literature-repository.js';
import type { LiteratureBackfillService } from './literature-backfill-service.js';
import type {
  LiteratureAutoAdvanceRuntimeSettings,
  LiteratureContentProcessingSettingsService,
} from './literature-content-processing-settings-service.js';

export type LiteratureAutoAdvanceImportedItem = {
  literatureId: string;
  qualityScore: number | null;
  isNew: boolean;
};

export type LiteratureAutoAdvanceOutcome = {
  enabled: boolean;
  source: 'auto_pull' | 'collection_import';
  advanced_full_count: number;
  advanced_fulltext_count: number;
  skipped_not_new: number;
  skipped_below_threshold: number;
  skipped_unscored: number;
  skipped_daily_limit: number;
  daily_used_before: number;
  job_ids: string[];
  error: string | null;
};

type AutoAdvanceRepository = Pick<LiteratureRepository, 'listContentProcessingBatchJobs'>;
type AutoAdvanceBackfill = Pick<LiteratureBackfillService, 'createJob'>;
type AutoAdvanceSettings = Pick<LiteratureContentProcessingSettingsService, 'resolveAutoAdvanceSettings'>;

const DAILY_JOB_SCAN_LIMIT = 500;

export class LiteratureAutoAdvanceService {
  constructor(
    private readonly repository: AutoAdvanceRepository,
    private readonly backfillService: AutoAdvanceBackfill,
    private readonly settingsService: AutoAdvanceSettings,
  ) {}

  // Never throws: auto-advance is a best-effort follow-up and must not break the import flow.
  async advanceAfterImport(input: {
    source: 'auto_pull' | 'collection_import';
    imported: LiteratureAutoAdvanceImportedItem[];
  }): Promise<LiteratureAutoAdvanceOutcome> {
    const outcome: LiteratureAutoAdvanceOutcome = {
      enabled: false,
      source: input.source,
      advanced_full_count: 0,
      advanced_fulltext_count: 0,
      skipped_not_new: 0,
      skipped_below_threshold: 0,
      skipped_unscored: 0,
      skipped_daily_limit: 0,
      daily_used_before: 0,
      job_ids: [],
      error: null,
    };

    try {
      const settings = await this.settingsService.resolveAutoAdvanceSettings();
      if (!settings.enabled) {
        return outcome;
      }
      outcome.enabled = true;

      const fresh = input.imported.filter((item) => item.isNew);
      outcome.skipped_not_new = input.imported.length - fresh.length;

      const full: string[] = [];
      const fulltextOnly: string[] = [];
      for (const item of fresh) {
        if (item.qualityScore === null) {
          if (settings.advance_unscored === 'full') {
            full.push(item.literatureId);
          } else if (settings.advance_unscored === 'fulltext') {
            fulltextOnly.push(item.literatureId);
          } else {
            outcome.skipped_unscored += 1;
          }
          continue;
        }
        if (item.qualityScore >= settings.full_chain_min_score) {
          full.push(item.literatureId);
        } else if (item.qualityScore >= settings.fulltext_only_min_score) {
          fulltextOnly.push(item.literatureId);
        } else {
          outcome.skipped_below_threshold += 1;
        }
      }

      const usedToday = await this.countAutoAdvancedToday();
      outcome.daily_used_before = usedToday;
      let remaining = Math.max(0, settings.daily_literature_limit - usedToday);
      // Higher tier gets the budget first.
      const admittedFull = full.slice(0, remaining);
      remaining -= admittedFull.length;
      const admittedFulltext = fulltextOnly.slice(0, remaining);
      outcome.skipped_daily_limit = (full.length - admittedFull.length) + (fulltextOnly.length - admittedFulltext.length);

      if (admittedFull.length > 0) {
        const job = await this.backfillService.createJob({
          workset: { literature_ids: admittedFull },
          target_stage: 'INDEXED',
          options: {
            max_parallel_literature_runs: settings.max_parallel_literature_runs,
            trigger: 'auto_advance',
          },
        });
        outcome.job_ids.push(job.job.job_id);
        outcome.advanced_full_count = admittedFull.length;
      }
      if (admittedFulltext.length > 0) {
        const job = await this.backfillService.createJob({
          workset: { literature_ids: admittedFulltext },
          target_stage: 'FULLTEXT_PREPROCESSED',
          options: {
            max_parallel_literature_runs: settings.max_parallel_literature_runs,
            trigger: 'auto_advance',
          },
        });
        outcome.job_ids.push(job.job.job_id);
        outcome.advanced_fulltext_count = admittedFulltext.length;
      }
      return outcome;
    } catch (error) {
      outcome.error = error instanceof Error ? error.message : 'Auto-advance failed.';
      return outcome;
    }
  }

  resolveSettings(): Promise<LiteratureAutoAdvanceRuntimeSettings> {
    return this.settingsService.resolveAutoAdvanceSettings();
  }

  private async countAutoAdvancedToday(): Promise<number> {
    const jobs = await this.repository.listContentProcessingBatchJobs(DAILY_JOB_SCAN_LIMIT);
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayStartIso = todayStart.toISOString();
    return jobs
      .filter((job) => this.isAutoAdvanceJob(job) && job.createdAt >= todayStartIso)
      .reduce((sum, job) => sum + this.jobLiteratureCount(job), 0);
  }

  private isAutoAdvanceJob(job: LiteratureContentProcessingBatchJobRecord): boolean {
    return (job.options as { trigger?: unknown } | null)?.trigger === 'auto_advance';
  }

  private jobLiteratureCount(job: LiteratureContentProcessingBatchJobRecord): number {
    const total = Number((job.totals as { total?: unknown } | null)?.total);
    if (Number.isFinite(total) && total >= 0) {
      return total;
    }
    const ids = (job.workset as { literature_ids?: unknown } | null)?.literature_ids;
    return Array.isArray(ids) ? ids.length : 0;
  }
}
