import crypto from 'node:crypto';
import {
  LITERATURE_FULLTEXT_ACQUISITION_NON_RETRYABLE_ERROR_CODES,
} from '@paper-engineering-assistant/shared/research-lifecycle/literature-contracts';
import type {
  CreateLiteratureFulltextAcquisitionJobResponse,
  LiteratureAcquisitionSettingsDTO,
  LiteratureFulltextAcquisitionCandidateDTO,
  LiteratureFulltextAcquisitionDryRunEstimateDTO,
  LiteratureFulltextAcquisitionDryRunRequest,
  LiteratureFulltextAcquisitionDryRunResponse,
  LiteratureFulltextAcquisitionHealthSourceKind,
  LiteratureFulltextAcquisitionItemDTO,
  LiteratureFulltextAcquisitionJobDTO,
  LiteratureFulltextAcquisitionPlanItemDTO,
  LiteratureFulltextAcquisitionSourceKind,
  LiteratureFulltextAcquisitionWorkset,
  ListLiteratureFulltextAcquisitionJobsQuery,
  ListLiteratureFulltextAcquisitionJobsResponse,
  RightsClass,
} from '@paper-engineering-assistant/shared/research-lifecycle/literature-contracts';
import { AppError } from '../errors/app-error.js';
import type {
  LiteratureFulltextAcquisitionItemRecord,
  LiteratureFulltextAcquisitionItemStatus,
  LiteratureFulltextAcquisitionJobRecord,
  LiteratureRecord,
  LiteratureRepository,
} from '../repositories/literature-repository.js';
import { LiteratureAcquisitionSettingsService } from './literature-acquisition-settings-service.js';
import { LiteratureEvidenceActivationService } from './literature-evidence-activation-service.js';
import { LiteratureService } from './literature-service.js';

type NormalizedOptions = LiteratureFulltextAcquisitionDryRunEstimateDTO['options'];

type PlannedFulltextItem = LiteratureFulltextAcquisitionPlanItemDTO & {
  title: string;
};

type AcquisitionThrottleSource = keyof LiteratureAcquisitionSettingsDTO['source_throttle'];
type SourceLimiterState = {
  active: number;
  queue: Array<() => void>;
};

const TERMINAL_JOB_STATUSES = new Set(['SUCCEEDED', 'PARTIAL', 'FAILED', 'CANCELED']);
// T-130 W-09 (L-14): sourced from the shared registry instead of a service-local literal.
const NON_RETRYABLE_CODES = new Set<string>(LITERATURE_FULLTEXT_ACQUISITION_NON_RETRYABLE_ERROR_CODES);
const ACQUISITION_HEALTH_SOURCES: LiteratureFulltextAcquisitionHealthSourceKind[] = [
  'explicit_url',
  'arxiv',
  'unpaywall',
  'download',
];
const FAILURE_LIKE_ITEM_STATUSES = new Set<LiteratureFulltextAcquisitionItemStatus>([
  'FAILED',
  'PARTIAL',
  'BLOCKED',
]);

export class LiteratureFulltextAcquisitionService {
  private readonly activeJobs = new Map<string, Promise<void>>();
  private readonly sourceLimiters = new Map<AcquisitionThrottleSource, SourceLimiterState>();
  private readonly sourcePacingQueues = new Map<AcquisitionThrottleSource, Promise<void>>();

  constructor(
    private readonly repository: LiteratureRepository,
    private readonly literatureService: LiteratureService,
    private readonly settingsService: LiteratureAcquisitionSettingsService,
    private readonly options: { pollIntervalMs?: number } = {},
    private readonly evidenceActivationService = new LiteratureEvidenceActivationService(repository),
  ) {}

  async resumeRunnableJobs(): Promise<void> {
    const jobs = await this.repository.listFulltextAcquisitionJobs(100);
    for (const job of jobs) {
      if (job.status === 'QUEUED' || job.status === 'RUNNING' || job.status === 'CANCELING') {
        this.scheduleJob(job.id);
      }
    }
  }

  async dryRun(request: LiteratureFulltextAcquisitionDryRunRequest): Promise<LiteratureFulltextAcquisitionDryRunResponse> {
    return {
      estimate: await this.buildDryRunEstimate(request),
    };
  }

  async createJob(
    request: LiteratureFulltextAcquisitionDryRunRequest,
  ): Promise<CreateLiteratureFulltextAcquisitionJobResponse> {
    const estimate = await this.buildDryRunEstimate(request);
    const budget = estimate.options.provider_call_budget;
    const estimatedCalls = estimate.estimated_provider_calls.unpaywall_calls
      + estimate.estimated_provider_calls.download_calls;
    if (budget !== null && estimatedCalls > budget) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        `Fulltext acquisition provider call estimate ${estimatedCalls} exceeds budget ${budget}.`,
      );
    }

    const now = new Date().toISOString();
    const jobId = crypto.randomUUID();
    const baseTime = Date.parse(now);
    const items = estimate.plan_items.map((item, index) => ({
      id: crypto.randomUUID(),
      jobId,
      literatureId: item.literature_id,
      status: item.blocked ? 'BLOCKED' as const : 'QUEUED' as const,
      selectedSourceKind: item.selected_source_kind,
      sourceUrl: item.source_url,
      finalUrl: null,
      contentAssetId: null,
      attemptCount: 0,
      errorCode: item.blocker_code,
      errorMessage: item.blocker_message,
      blockerCode: item.blocker_code,
      retryable: item.retryable,
      resolutionCandidates: item.candidates as unknown as Record<string, unknown>[],
      checkpoint: {},
      createdAt: new Date(baseTime + index).toISOString(),
      startedAt: null,
      finishedAt: item.blocked ? now : null,
      updatedAt: now,
    } satisfies LiteratureFulltextAcquisitionItemRecord));
    const job = await this.repository.createFulltextAcquisitionJob({
      id: jobId,
      status: 'QUEUED',
      workset: estimate.workset as unknown as Record<string, unknown>,
      options: estimate.options as unknown as Record<string, unknown>,
      dryRunEstimate: estimate as unknown as Record<string, unknown>,
      totals: this.computeTotals(items),
      errorCode: null,
      errorMessage: null,
      createdAt: now,
      startedAt: null,
      pausedAt: null,
      canceledAt: null,
      finishedAt: null,
      updatedAt: now,
    }, items);
    this.scheduleJob(job.id);
    return {
      job: await this.toJobDTO(job, items, true),
    };
  }

  async listJobs(
    query: ListLiteratureFulltextAcquisitionJobsQuery,
  ): Promise<ListLiteratureFulltextAcquisitionJobsResponse> {
    const jobs = await this.repository.listFulltextAcquisitionJobs(query.limit ?? 20);
    return {
      items: await Promise.all(jobs.map((job) => this.toJobDTO(job, undefined, false))),
    };
  }

  async getJob(jobId: string): Promise<{ job: LiteratureFulltextAcquisitionJobDTO }> {
    const job = await this.requireJob(jobId);
    const items = await this.repository.listFulltextAcquisitionItemsByJobId(jobId);
    return {
      job: await this.toJobDTO(job, items, true),
    };
  }

  async pauseJob(jobId: string): Promise<{ job: LiteratureFulltextAcquisitionJobDTO }> {
    const job = await this.requireJob(jobId);
    if (job.status !== 'QUEUED' && job.status !== 'RUNNING') {
      return this.getJob(jobId);
    }
    const now = new Date().toISOString();
    await this.repository.updateFulltextAcquisitionJob(jobId, {
      status: 'PAUSED',
      pausedAt: now,
      updatedAt: now,
    });
    return this.getJob(jobId);
  }

  async resumeJob(jobId: string): Promise<{ job: LiteratureFulltextAcquisitionJobDTO }> {
    const job = await this.requireJob(jobId);
    if (job.status !== 'PAUSED') {
      return this.getJob(jobId);
    }
    const now = new Date().toISOString();
    await this.repository.updateFulltextAcquisitionJob(jobId, {
      status: 'QUEUED',
      pausedAt: null,
      finishedAt: null,
      updatedAt: now,
    });
    this.scheduleJob(jobId);
    return this.getJob(jobId);
  }

  async cancelJob(jobId: string): Promise<{ job: LiteratureFulltextAcquisitionJobDTO }> {
    const job = await this.requireJob(jobId);
    if (this.isTerminalJobStatus(job.status)) {
      return this.getJob(jobId);
    }
    const now = new Date().toISOString();
    await this.repository.updateFulltextAcquisitionJob(jobId, {
      status: 'CANCELING',
      canceledAt: now,
      updatedAt: now,
    });
    await this.cancelQueuedItems(jobId, now);
    this.scheduleJob(jobId);
    return this.getJob(jobId);
  }

  async retryFailed(jobId: string): Promise<{ job: LiteratureFulltextAcquisitionJobDTO }> {
    const job = await this.requireJob(jobId);
    if (job.status === 'RUNNING' || job.status === 'QUEUED' || job.status === 'CANCELING') {
      throw new AppError(409, 'INVALID_PAYLOAD', 'Cannot retry a job while it is running, queued, or canceling.');
    }
    const items = (await this.repository.listFulltextAcquisitionItemsByJobId(jobId))
      .filter((item) => item.retryable && (item.status === 'FAILED' || item.status === 'BLOCKED' || item.status === 'PARTIAL'));
    if (items.length === 0) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'No retryable failed fulltext acquisition items are available.');
    }
    const now = new Date().toISOString();
    for (const item of items) {
      await this.repository.updateFulltextAcquisitionItem(item.id, {
        status: 'QUEUED',
        errorCode: null,
        errorMessage: null,
        blockerCode: null,
        finishedAt: null,
        updatedAt: now,
      });
    }
    await this.repository.updateFulltextAcquisitionJob(jobId, {
      status: 'QUEUED',
      errorCode: null,
      errorMessage: null,
      finishedAt: null,
      totals: this.computeTotals(await this.repository.listFulltextAcquisitionItemsByJobId(jobId)),
      updatedAt: now,
    });
    this.scheduleJob(jobId);
    return this.getJob(jobId);
  }

  async deleteJob(jobId: string): Promise<void> {
    const job = await this.requireJob(jobId);
    if (!this.isTerminalJobStatus(job.status) && job.status !== 'PAUSED') {
      throw new AppError(409, 'INVALID_PAYLOAD', 'Cancel the fulltext acquisition job before deleting it.');
    }
    if (this.activeJobs.has(jobId)) {
      throw new AppError(409, 'INVALID_PAYLOAD', 'Wait for the active fulltext acquisition worker to stop before deleting it.');
    }
    await this.repository.deleteFulltextAcquisitionJob(jobId);
  }

  private async buildDryRunEstimate(
    request: LiteratureFulltextAcquisitionDryRunRequest,
  ): Promise<LiteratureFulltextAcquisitionDryRunEstimateDTO> {
    const workset = this.normalizeWorkset(request.workset);
    const options = await this.normalizeOptions(request.options);
    const selectedLiteratures = await this.selectLiteratures(workset);
    const planItems: PlannedFulltextItem[] = [];
    let skippedExistingAssetCount = 0;
    const explicitUrlByLiterature = new Map(
      (workset.explicit_urls ?? []).map((item) => [item.literature_id, item.source_url]),
    );

    for (const literature of selectedLiteratures) {
      const existingAssets = await this.repository.listContentAssetsByLiteratureId(literature.id);
      const hasRegisteredFulltext = existingAssets.some((asset) =>
        asset.assetKind === 'raw_fulltext' && (asset.status === 'registered' || asset.status === 'ready'));
      if ((workset.only_missing_assets ?? true) && !options.force_refresh && hasRegisteredFulltext) {
        skippedExistingAssetCount += 1;
        continue;
      }
      planItems.push(await this.planLiterature(literature, explicitUrlByLiterature.get(literature.id)));
    }

    const blockers = planItems
      .filter((item) => item.blocked)
      .map((item) => ({
        literature_id: item.literature_id,
        title: item.title,
        reason_code: item.blocker_code ?? 'FULLTEXT_SOURCE_MISSING',
        reason_message: item.blocker_message ?? 'No downloadable fulltext source is available.',
        retryable: item.retryable,
      }));
    const sourceCounts = this.computeSourceCounts(planItems);
    const unpaywallCalls = planItems.filter((item) => item.selected_source_kind === 'unpaywall').length;
    const downloadCalls = planItems.filter((item) => !item.blocked).length;

    return {
      dry_run_id: crypto.randomUUID(),
      generated_at: new Date().toISOString(),
      workset,
      options,
      total_literatures: selectedLiteratures.length,
      selected_count: planItems.length,
      planned_item_count: planItems.filter((item) => !item.blocked).length,
      skipped_existing_asset_count: skippedExistingAssetCount,
      blocked_count: blockers.length,
      source_counts: sourceCounts,
      estimated_provider_calls: {
        unpaywall_calls: unpaywallCalls,
        download_calls: downloadCalls,
      },
      blockers,
      plan_items: planItems,
    };
  }

  private async selectLiteratures(workset: LiteratureFulltextAcquisitionWorkset): Promise<LiteratureRecord[]> {
    const hasExplicitLiteratureIds = Boolean(workset.literature_ids?.length);
    let literatures = await this.repository.listLiteratures();
    if (workset.literature_ids?.length) {
      const idSet = new Set(workset.literature_ids);
      literatures = literatures.filter((item) => idSet.has(item.id));
    }
    if (workset.topic_id) {
      const scopedIds = await this.evidenceActivationService.resolveTopicAutomaticProcessingLiteratureIds(workset.topic_id);
      literatures = literatures.filter((item) => scopedIds.has(item.id));
    }
    if (workset.paper_id) {
      const linkedIds = await this.evidenceActivationService.resolvePaperAutomaticProcessingLiteratureIds(workset.paper_id);
      literatures = literatures.filter((item) => linkedIds.has(item.id));
    }
    if (workset.rights_classes?.length) {
      const rightsSet = new Set<RightsClass>(workset.rights_classes);
      literatures = literatures.filter((item) => rightsSet.has(item.rightsClass));
    }
    if (workset.updated_at_from) {
      literatures = literatures.filter((item) => item.updatedAt >= workset.updated_at_from!);
    }
    if (workset.updated_at_to) {
      literatures = literatures.filter((item) => item.updatedAt <= workset.updated_at_to!);
    }
    if (!hasExplicitLiteratureIds && !workset.topic_id && !workset.paper_id) {
      const processableIds = await this.evidenceActivationService.filterGlobalAutomaticProcessingLiteratureIds(
        literatures.map((literature) => literature.id),
      );
      literatures = literatures.filter((literature) => processableIds.has(literature.id));
    }
    return literatures.sort((left, right) => left.title.localeCompare(right.title));
  }

  private async planLiterature(
    literature: LiteratureRecord,
    explicitUrl: string | undefined,
  ): Promise<PlannedFulltextItem> {
    if (literature.rightsClass === 'RESTRICTED') {
      return this.blockedPlanItem(literature, 'RIGHTS_RESTRICTED', 'Restricted literature cannot be downloaded automatically.', false);
    }
    if (literature.rightsClass === 'USER_AUTH') {
      return this.blockedPlanItem(literature, 'USER_AUTH_REQUIRED', 'User-authenticated fulltext acquisition is outside T-041 v1.', false);
    }

    const candidates: LiteratureFulltextAcquisitionCandidateDTO[] = [];
    if (explicitUrl) {
      candidates.push({
        source_kind: 'explicit_url',
        source_url: explicitUrl,
        requires_resolution: false,
        provenance: { source: 'workset.explicit_urls' },
      });
    }
    if (literature.arxivId) {
      candidates.push({
        source_kind: 'arxiv',
        source_url: `https://arxiv.org/pdf/${literature.arxivId}`,
        requires_resolution: false,
        provenance: { arxiv_id: literature.arxivId },
      });
    }
    const unpaywallEnabled = await this.settingsService.isUnpaywallEnabled();
    const unpaywallEmail = await this.settingsService.resolveUnpaywallEmail();
    if (literature.doiNormalized && unpaywallEnabled && unpaywallEmail) {
      candidates.push({
        source_kind: 'unpaywall',
        source_url: null,
        requires_resolution: true,
        provenance: { doi: literature.doiNormalized },
      });
    }

    if (candidates.length === 0) {
      const code = literature.doiNormalized ? 'UNPAYWALL_NOT_CONFIGURED' : 'FULLTEXT_SOURCE_MISSING';
      const message = literature.doiNormalized
        ? 'Unpaywall is not enabled or has no configured email for DOI-based OA resolution.'
        : 'No explicit URL, arXiv id, or DOI OA resolver is available.';
      return this.blockedPlanItem(literature, code, message, code === 'UNPAYWALL_NOT_CONFIGURED');
    }

    const selected = candidates[0]!;
    return {
      literature_id: literature.id,
      title: literature.title,
      rights_class: literature.rightsClass,
      selected_source_kind: selected.source_kind,
      source_url: selected.source_url,
      candidates,
      blocked: false,
      blocker_code: null,
      blocker_message: null,
      retryable: true,
    };
  }

  private blockedPlanItem(
    literature: LiteratureRecord,
    code: string,
    message: string,
    retryable: boolean,
  ): PlannedFulltextItem {
    return {
      literature_id: literature.id,
      title: literature.title,
      rights_class: literature.rightsClass,
      selected_source_kind: null,
      source_url: null,
      candidates: [],
      blocked: true,
      blocker_code: code,
      blocker_message: message,
      retryable,
    };
  }

  private scheduleJob(jobId: string): void {
    if (this.activeJobs.has(jobId)) {
      return;
    }
    const promise = this.runJob(jobId)
      .catch(async (error) => {
        await this.failJob(jobId, error);
      })
      .finally(() => {
        this.activeJobs.delete(jobId);
      });
    this.activeJobs.set(jobId, promise);
  }

  private async runJob(jobId: string): Promise<void> {
    let job = await this.requireJob(jobId);
    if (job.status !== 'QUEUED' && job.status !== 'RUNNING' && job.status !== 'CANCELING') {
      return;
    }
    const now = new Date().toISOString();
    if (job.status !== 'CANCELING') {
      job = await this.repository.updateFulltextAcquisitionJob(jobId, {
        status: 'RUNNING',
        startedAt: job.startedAt ?? now,
        updatedAt: now,
      });
    }
    if (job.status === 'RUNNING') {
      await this.requeueInterruptedRunningItems(jobId);
    }
    const options = this.readOptions(job.options);
    while (true) {
      job = await this.requireJob(jobId);
      if (job.status === 'PAUSED') {
        return;
      }
      if (job.status === 'CANCELING') {
        await this.cancelQueuedOrRunningItems(jobId, new Date().toISOString());
        await this.finalizeJob(jobId);
        return;
      }
      const queued = await this.repository.listFulltextAcquisitionItemsByJobIdAndStatuses(
        jobId,
        ['QUEUED'],
        options.max_parallel_downloads,
      );
      if (queued.length === 0) {
        await this.finalizeJob(jobId);
        return;
      }
      await Promise.all(queued.map((item) => this.runItem(item, options)));
      await this.refreshJobTotals(jobId);
      if (this.options.pollIntervalMs) {
        await new Promise((resolve) => setTimeout(resolve, this.options.pollIntervalMs));
      }
    }
  }

  private async runItem(item: LiteratureFulltextAcquisitionItemRecord, options: NormalizedOptions): Promise<void> {
    const now = new Date().toISOString();
    let downloadSlotClaimed = false;
    let unpaywallResolutionSucceeded = item.selectedSourceKind !== 'unpaywall';
    await this.repository.updateFulltextAcquisitionItem(item.id, {
      status: 'RUNNING',
      attemptCount: item.attemptCount + 1,
      startedAt: item.startedAt ?? now,
      updatedAt: now,
    });
    try {
      const literature = await this.repository.findLiteratureById(item.literatureId);
      if (!literature) {
        throw new AppError(404, 'NOT_FOUND', `Literature ${item.literatureId} not found.`);
      }
      const sourceKind = item.selectedSourceKind;
      if (!sourceKind) {
        throw new AppError(400, 'INVALID_PAYLOAD', 'No selected fulltext source is available.');
      }
      const sourceUrl = item.sourceUrl ?? await this.resolveSourceUrl(literature, sourceKind);
      if (sourceKind === 'unpaywall') {
        unpaywallResolutionSucceeded = true;
      }
      const sourceThrottle = this.sourceKindToThrottleSource(sourceKind);
      const downloadOperation = async () => {
        downloadSlotClaimed = true;
        return this.literatureService.downloadContentAsset(literature.id, {
          source_url: sourceUrl,
          max_byte_size: options.max_byte_size,
          rights_class: literature.rightsClass === 'UNKNOWN' ? 'OA' : literature.rightsClass,
          metadata: {
            acquisition_job_id: item.jobId,
            acquisition_item_id: item.id,
            selected_source_kind: sourceKind,
            resolution_candidates: item.resolutionCandidates,
          },
        });
      };
      const downloaded = sourceThrottle
        ? await this.runWithSourceSlot(sourceThrottle, () => this.runWithSourceSlot('download', downloadOperation))
        : await this.runWithSourceSlot('download', downloadOperation);
      const finalUrl = typeof downloaded.item.metadata.final_url === 'string'
        ? downloaded.item.metadata.final_url
        : sourceUrl;
      await this.repository.updateFulltextAcquisitionItem(item.id, {
        status: 'SUCCEEDED',
        sourceUrl,
        finalUrl,
        contentAssetId: downloaded.item.asset_id,
        errorCode: null,
        errorMessage: null,
        blockerCode: null,
        retryable: true,
        checkpoint: {
          checksum: downloaded.item.checksum,
          byte_size: downloaded.item.byte_size,
          mime_type: downloaded.item.mime_type,
        },
        finishedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      if (sourceKind !== 'unpaywall') {
        await this.recordSourceSuccess(sourceKind);
      }
      await this.recordSourceSuccess('download');
    } catch (error) {
      const errorCode = this.readErrorCode(error);
      const retryable = !NON_RETRYABLE_CODES.has(errorCode) && !(error instanceof AppError && error.statusCode < 500);
      await this.repository.updateFulltextAcquisitionItem(item.id, {
        status: 'FAILED',
        errorCode,
        errorMessage: error instanceof Error ? error.message : 'Fulltext acquisition failed.',
        blockerCode: retryable ? null : errorCode,
        retryable,
        finishedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      if (
        this.shouldRecordSourceFailure(errorCode)
        && item.selectedSourceKind
        && (item.selectedSourceKind !== 'unpaywall' || !unpaywallResolutionSucceeded)
      ) {
        await this.recordSourceFailure(item.selectedSourceKind, errorCode, error instanceof Error ? error.message : null);
      }
      if (this.shouldRecordSourceFailure(errorCode) && downloadSlotClaimed) {
        await this.recordSourceFailure('download', errorCode, error instanceof Error ? error.message : null);
      }
    }
  }

  private async resolveSourceUrl(literature: LiteratureRecord, sourceKind: LiteratureFulltextAcquisitionSourceKind): Promise<string> {
    if (sourceKind === 'arxiv' && literature.arxivId) {
      return `https://arxiv.org/pdf/${literature.arxivId}`;
    }
    if (sourceKind !== 'unpaywall' || !literature.doiNormalized) {
      throw new AppError(400, 'INVALID_PAYLOAD', `Cannot resolve ${sourceKind} source for literature ${literature.id}.`);
    }
    const email = await this.settingsService.resolveUnpaywallEmail();
    if (!email) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'UNPAYWALL_NOT_CONFIGURED: Unpaywall email is required.');
    }
    const doi = literature.doiNormalized;
    return this.runWithSourceSlot('unpaywall', async () => {
      const url = new URL(`https://api.unpaywall.org/v2/${encodeURIComponent(doi)}`);
      url.searchParams.set('email', email);
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': `paper-engineering-assistant/0.1 (mailto:${email})`,
        },
        signal: AbortSignal.timeout(30_000),
      });
      if (response.status === 429) {
        throw new AppError(502, 'INTERNAL_ERROR', 'SOURCE_RATE_LIMIT: Unpaywall resolver rate limited with status 429.');
      }
      if (!response.ok) {
        throw new AppError(502, 'INTERNAL_ERROR', `Unpaywall resolver failed with status ${response.status}.`);
      }
      const payload = await response.json() as Record<string, unknown>;
      const pdfUrl = this.readUnpaywallPdfUrl(payload);
      if (!pdfUrl) {
        throw new AppError(404, 'NOT_FOUND', 'UNPAYWALL_NO_OA_PDF: Unpaywall did not return an OA PDF URL.');
      }
      await this.recordSourceSuccess('unpaywall');
      return pdfUrl;
    });
  }

  private readUnpaywallPdfUrl(payload: Record<string, unknown>): string | null {
    const best = this.readRecord(payload.best_oa_location);
    const bestPdf = this.readString(best.url_for_pdf);
    if (bestPdf) {
      return bestPdf;
    }
    const locations = Array.isArray(payload.oa_locations) ? payload.oa_locations : [];
    for (const location of locations) {
      const pdf = this.readString(this.readRecord(location).url_for_pdf);
      if (pdf) {
        return pdf;
      }
    }
    return null;
  }

  private async recordSourceRequest(source: string): Promise<void> {
    const existing = await this.repository.findSourceRuntimeState(source);
    const now = new Date().toISOString();
    await this.repository.upsertSourceRuntimeState({
      id: existing?.id ?? crypto.randomUUID(),
      source,
      status: existing?.status ?? 'READY',
      cooldownUntil: existing?.cooldownUntil ?? null,
      failureCount: existing?.failureCount ?? 0,
      lastErrorCode: existing?.lastErrorCode ?? null,
      lastErrorMessage: existing?.lastErrorMessage ?? null,
      lastRequestAt: now,
      lastSuccessAt: existing?.lastSuccessAt ?? null,
      lastFailureAt: existing?.lastFailureAt ?? null,
      metadata: existing?.metadata ?? {},
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
  }

  private async recordSourceSuccess(source: string): Promise<void> {
    const existing = await this.repository.findSourceRuntimeState(source);
    const now = new Date().toISOString();
    await this.repository.upsertSourceRuntimeState({
      id: existing?.id ?? crypto.randomUUID(),
      source,
      status: 'READY',
      cooldownUntil: null,
      failureCount: 0,
      lastErrorCode: null,
      lastErrorMessage: null,
      lastRequestAt: existing?.lastRequestAt ?? now,
      lastSuccessAt: now,
      lastFailureAt: existing?.lastFailureAt ?? null,
      metadata: existing?.metadata ?? {},
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
  }

  private async recordSourceFailure(source: string, errorCode: string, errorMessage: string | null): Promise<void> {
    const existing = await this.repository.findSourceRuntimeState(source);
    const now = new Date().toISOString();
    const failureCount = (existing?.failureCount ?? 0) + 1;
    const cooldownUntil = new Date(Date.now() + Math.min(60_000 * failureCount, 900_000)).toISOString();
    await this.repository.upsertSourceRuntimeState({
      id: existing?.id ?? crypto.randomUUID(),
      source,
      status: 'COOLDOWN',
      cooldownUntil,
      failureCount,
      lastErrorCode: errorCode,
      lastErrorMessage: errorMessage,
      lastRequestAt: existing?.lastRequestAt ?? now,
      lastSuccessAt: existing?.lastSuccessAt ?? null,
      lastFailureAt: now,
      metadata: existing?.metadata ?? {},
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
  }

  private shouldRecordSourceFailure(errorCode: string): boolean {
    return !NON_RETRYABLE_CODES.has(errorCode);
  }

  private async runWithSourceSlot<T>(source: AcquisitionThrottleSource, operation: () => Promise<T>): Promise<T> {
    const throttle = await this.settingsService.resolveSourceThrottle(source);
    const release = await this.acquireSourceSlot(source, throttle.concurrency);
    try {
      await this.waitForSourcePacingQueued(source, throttle.min_interval_ms);
      return await operation();
    } finally {
      release();
    }
  }

  private async acquireSourceSlot(source: AcquisitionThrottleSource, concurrency: number): Promise<() => void> {
    const normalizedConcurrency = Math.max(1, Math.floor(concurrency));
    const state = this.sourceLimiters.get(source) ?? { active: 0, queue: [] };
    this.sourceLimiters.set(source, state);
    if (state.active < normalizedConcurrency) {
      state.active += 1;
      return () => this.releaseSourceSlot(source, state);
    }
    await new Promise<void>((resolve) => {
      state.queue.push(resolve);
    });
    return () => this.releaseSourceSlot(source, state);
  }

  private releaseSourceSlot(source: AcquisitionThrottleSource, state: SourceLimiterState): void {
    const next = state.queue.shift();
    if (next) {
      next();
      return;
    }
    state.active = Math.max(0, state.active - 1);
    if (state.active === 0) {
      this.sourceLimiters.delete(source);
    }
  }

  private async waitForSourcePacingQueued(source: AcquisitionThrottleSource, minIntervalMs: number): Promise<void> {
    const previous = this.sourcePacingQueues.get(source) ?? Promise.resolve();
    const current = previous
      .catch(() => undefined)
      .then(() => this.waitForSourcePacing(source, minIntervalMs));
    this.sourcePacingQueues.set(source, current);
    try {
      await current;
    } finally {
      if (this.sourcePacingQueues.get(source) === current) {
        this.sourcePacingQueues.delete(source);
      }
    }
  }

  private async waitForSourcePacing(source: AcquisitionThrottleSource, minIntervalMs: number): Promise<void> {
    const existing = await this.repository.findSourceRuntimeState(source);
    const now = Date.now();
    const cooldownWaitMs = existing?.cooldownUntil
      ? Math.max(0, Date.parse(existing.cooldownUntil) - now)
      : 0;
    const intervalWaitMs = existing?.lastRequestAt
      ? Math.max(0, Date.parse(existing.lastRequestAt) + minIntervalMs - now)
      : 0;
    const waitMs = Math.max(cooldownWaitMs, intervalWaitMs);
    if (waitMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
    await this.recordSourceRequest(source);
  }

  private sourceKindToThrottleSource(
    sourceKind: LiteratureFulltextAcquisitionSourceKind,
  ): AcquisitionThrottleSource | null {
    if (sourceKind === 'arxiv') {
      return 'arxiv';
    }
    return null;
  }

  private normalizeWorkset(workset: LiteratureFulltextAcquisitionWorkset | undefined): LiteratureFulltextAcquisitionWorkset {
    return {
      ...(workset?.topic_id ? { topic_id: workset.topic_id.trim() } : {}),
      ...(workset?.paper_id ? { paper_id: workset.paper_id.trim() } : {}),
      ...(workset?.literature_ids?.length ? { literature_ids: [...new Set(workset.literature_ids.map((id) => id.trim()).filter(Boolean))] } : {}),
      ...(workset?.rights_classes?.length ? { rights_classes: [...new Set(workset.rights_classes)] } : {}),
      only_missing_assets: workset?.only_missing_assets ?? true,
      ...(workset?.explicit_urls?.length
        ? {
            explicit_urls: workset.explicit_urls.map((item) => ({
              literature_id: item.literature_id.trim(),
              source_url: item.source_url.trim(),
            })),
          }
        : {}),
      ...(workset?.updated_at_from ? { updated_at_from: workset.updated_at_from } : {}),
      ...(workset?.updated_at_to ? { updated_at_to: workset.updated_at_to } : {}),
    };
  }

  private async normalizeOptions(options: LiteratureFulltextAcquisitionDryRunRequest['options']): Promise<NormalizedOptions> {
    const downloader = await this.settingsService.resolveDownloaderOptions();
    const downloadThrottle = await this.settingsService.resolveSourceThrottle('download');
    const maxDownloadConcurrency = Math.min(4, downloadThrottle.concurrency);
    return {
      max_parallel_downloads: this.clampInteger(options?.max_parallel_downloads, 1, 1, maxDownloadConcurrency),
      provider_call_budget: typeof options?.provider_call_budget === 'number' && Number.isFinite(options.provider_call_budget)
        ? Math.max(1, Math.floor(options.provider_call_budget))
        : null,
      max_byte_size: this.clampInteger(options?.max_byte_size, downloader.max_byte_size, 1, downloader.max_byte_size),
      force_refresh: options?.force_refresh ?? false,
    };
  }

  private readOptions(value: Record<string, unknown>): NormalizedOptions {
    return {
      max_parallel_downloads: this.clampInteger(
        typeof value.max_parallel_downloads === 'number' ? value.max_parallel_downloads : undefined,
        1,
        1,
        4,
      ),
      provider_call_budget: typeof value.provider_call_budget === 'number' ? value.provider_call_budget : null,
      max_byte_size: this.clampInteger(
        typeof value.max_byte_size === 'number' ? value.max_byte_size : undefined,
        100 * 1024 * 1024,
        1,
        500 * 1024 * 1024,
      ),
      force_refresh: typeof value.force_refresh === 'boolean' ? value.force_refresh : false,
    };
  }

  private async requireJob(jobId: string): Promise<LiteratureFulltextAcquisitionJobRecord> {
    const job = await this.repository.findFulltextAcquisitionJobById(jobId);
    if (!job) {
      throw new AppError(404, 'NOT_FOUND', `Fulltext acquisition job ${jobId} not found.`);
    }
    return job;
  }

  private async refreshJobTotals(jobId: string): Promise<void> {
    const items = await this.repository.listFulltextAcquisitionItemsByJobId(jobId);
    await this.repository.updateFulltextAcquisitionJob(jobId, {
      totals: this.computeTotals(items),
      updatedAt: new Date().toISOString(),
    });
  }

  private async finalizeJob(jobId: string): Promise<void> {
    const items = await this.repository.listFulltextAcquisitionItemsByJobId(jobId);
    const totals = this.computeTotals(items);
    const now = new Date().toISOString();
    if (totals.queued > 0 || totals.running > 0) {
      await this.repository.updateFulltextAcquisitionJob(jobId, {
        status: 'QUEUED',
        totals,
        updatedAt: now,
      });
      this.scheduleJob(jobId);
      return;
    }
    const failedLike = totals.failed + totals.blocked + totals.partial;
    await this.repository.updateFulltextAcquisitionJob(jobId, {
      status: totals.canceled > 0
        ? 'CANCELED'
        : failedLike > 0 && totals.succeeded > 0
          ? 'PARTIAL'
          : failedLike > 0
            ? 'FAILED'
            : 'SUCCEEDED',
      totals,
      finishedAt: now,
      updatedAt: now,
    });
  }

  private async cancelQueuedItems(jobId: string, now: string): Promise<void> {
    const queued = await this.repository.listFulltextAcquisitionItemsByJobIdAndStatuses(jobId, ['QUEUED']);
    for (const item of queued) {
      await this.repository.updateFulltextAcquisitionItem(item.id, {
        status: 'CANCELED',
        retryable: true,
        finishedAt: now,
        updatedAt: now,
      });
    }
  }

  private async cancelQueuedOrRunningItems(jobId: string, now: string): Promise<void> {
    const items = await this.repository.listFulltextAcquisitionItemsByJobIdAndStatuses(jobId, ['QUEUED', 'RUNNING']);
    for (const item of items) {
      await this.repository.updateFulltextAcquisitionItem(item.id, {
        status: 'CANCELED',
        errorCode: 'FULLTEXT_ACQUISITION_JOB_CANCELED',
        errorMessage: 'Fulltext acquisition job was canceled.',
        blockerCode: null,
        retryable: true,
        finishedAt: now,
        updatedAt: now,
      });
    }
  }

  private async requeueInterruptedRunningItems(jobId: string): Promise<void> {
    const running = await this.repository.listFulltextAcquisitionItemsByJobIdAndStatuses(jobId, ['RUNNING']);
    const now = new Date().toISOString();
    for (const item of running) {
      await this.repository.updateFulltextAcquisitionItem(item.id, {
        status: 'QUEUED',
        errorCode: 'FULLTEXT_ACQUISITION_RUN_INTERRUPTED',
        errorMessage: 'Previous fulltext acquisition worker stopped before this item finished.',
        blockerCode: null,
        retryable: true,
        finishedAt: null,
        updatedAt: now,
      });
    }
  }

  private async failJob(jobId: string, error: unknown): Promise<void> {
    const now = new Date().toISOString();
    const runningItems = await this.repository.listFulltextAcquisitionItemsByJobIdAndStatuses(jobId, ['RUNNING'])
      .catch(() => []);
    for (const item of runningItems) {
      await this.repository.updateFulltextAcquisitionItem(item.id, {
        status: 'FAILED',
        errorCode: 'FULLTEXT_ACQUISITION_WORKER_FAILED',
        errorMessage: error instanceof Error ? error.message : 'Fulltext acquisition worker failed.',
        blockerCode: null,
        retryable: true,
        finishedAt: now,
        updatedAt: now,
      }).catch(() => undefined);
    }

    const items = await this.repository.listFulltextAcquisitionItemsByJobId(jobId).catch(() => []);
    await this.repository.updateFulltextAcquisitionJob(jobId, {
      status: 'FAILED',
      totals: this.computeTotals(items),
      errorCode: 'FULLTEXT_ACQUISITION_WORKER_FAILED',
      errorMessage: error instanceof Error ? error.message : 'Fulltext acquisition worker failed.',
      finishedAt: now,
      updatedAt: now,
    }).catch(() => undefined);
  }

  private computeTotals(items: LiteratureFulltextAcquisitionItemRecord[]): LiteratureFulltextAcquisitionJobDTO['totals'] {
    const total = items.length;
    const count = (status: LiteratureFulltextAcquisitionItemStatus) => items.filter((item) => item.status === status).length;
    return {
      total,
      queued: count('QUEUED'),
      running: count('RUNNING'),
      succeeded: count('SUCCEEDED'),
      partial: count('PARTIAL'),
      blocked: count('BLOCKED'),
      failed: count('FAILED'),
      skipped: count('SKIPPED'),
      canceled: count('CANCELED'),
    };
  }

  private computeSourceCounts(
    planItems: LiteratureFulltextAcquisitionPlanItemDTO[],
  ): Array<{ source_kind: LiteratureFulltextAcquisitionSourceKind; count: number }> {
    const counts = new Map<LiteratureFulltextAcquisitionSourceKind, number>();
    for (const item of planItems) {
      if (item.selected_source_kind) {
        counts.set(item.selected_source_kind, (counts.get(item.selected_source_kind) ?? 0) + 1);
      }
    }
    return [...counts.entries()].map(([source_kind, count]) => ({ source_kind, count }));
  }

  private async toJobDTO(
    job: LiteratureFulltextAcquisitionJobRecord,
    items?: LiteratureFulltextAcquisitionItemRecord[],
    includeItems = false,
  ): Promise<LiteratureFulltextAcquisitionJobDTO> {
    const resolvedItems = items ?? await this.repository.listFulltextAcquisitionItemsByJobId(job.id);
    return {
      job_id: job.id,
      status: job.status,
      workset: job.workset as unknown as LiteratureFulltextAcquisitionWorkset,
      options: this.readOptions(job.options),
      dry_run_estimate: job.dryRunEstimate as unknown as LiteratureFulltextAcquisitionDryRunEstimateDTO,
      totals: this.readTotals(job.totals),
      error_code: job.errorCode,
      error_message: job.errorMessage,
      created_at: job.createdAt,
      started_at: job.startedAt,
      paused_at: job.pausedAt,
      canceled_at: job.canceledAt,
      finished_at: job.finishedAt,
      updated_at: job.updatedAt,
      source_health: await this.buildSourceHealth(resolvedItems),
      ...(includeItems ? { items: await Promise.all(resolvedItems.map((item) => this.toItemDTO(item))) } : {}),
    };
  }

  private async buildSourceHealth(
    items: LiteratureFulltextAcquisitionItemRecord[],
  ): Promise<LiteratureFulltextAcquisitionJobDTO['source_health']> {
    const runtimeStates = await this.repository.listSourceRuntimeStates();
    const runtimeStateBySource = new Map(runtimeStates.map((state) => [state.source, state]));
    return ACQUISITION_HEALTH_SOURCES.map((sourceKind) => {
      const sourceItems = this.itemsForHealthSource(sourceKind, items);
      const runtimeSource = this.healthSourceToRuntimeSource(sourceKind);
      const runtimeState = runtimeStateBySource.get(runtimeSource) ?? null;
      const errorCounts = new Map<string, number>();
      for (const item of sourceItems) {
        if (item.errorCode) {
          errorCounts.set(item.errorCode, (errorCounts.get(item.errorCode) ?? 0) + 1);
        }
      }
      const fallbackError = this.latestItemError(sourceItems);
      return {
        source_kind: sourceKind,
        runtime_source: runtimeSource,
        planned_count: sourceItems.length,
        succeeded_count: sourceItems.filter((item) => item.status === 'SUCCEEDED').length,
        failed_count: sourceItems.filter((item) => item.status === 'FAILED' || item.status === 'PARTIAL').length,
        blocked_count: sourceItems.filter((item) => item.status === 'BLOCKED').length,
        retryable_failure_count: sourceItems.filter((item) => FAILURE_LIKE_ITEM_STATUSES.has(item.status) && item.retryable).length,
        non_retryable_failure_count: sourceItems.filter((item) => FAILURE_LIKE_ITEM_STATUSES.has(item.status) && !item.retryable).length,
        error_counts_by_code: Object.fromEntries([...errorCounts.entries()].sort()),
        runtime_status: runtimeState?.status ?? null,
        cooldown_until: runtimeState?.cooldownUntil ?? null,
        failure_count: runtimeState?.failureCount ?? 0,
        last_error_code: runtimeState?.lastErrorCode ?? fallbackError?.errorCode ?? null,
        last_error_message: runtimeState?.lastErrorMessage ?? fallbackError?.errorMessage ?? null,
        last_request_at: runtimeState?.lastRequestAt ?? null,
        last_success_at: runtimeState?.lastSuccessAt ?? null,
        last_failure_at: runtimeState?.lastFailureAt ?? null,
      };
    });
  }

  private itemsForHealthSource(
    sourceKind: LiteratureFulltextAcquisitionHealthSourceKind,
    items: LiteratureFulltextAcquisitionItemRecord[],
  ): LiteratureFulltextAcquisitionItemRecord[] {
    if (sourceKind === 'download') {
      return items.filter((item) =>
        item.selectedSourceKind !== null
        && (
          item.selectedSourceKind !== 'unpaywall'
          || item.sourceUrl !== null
          || item.finalUrl !== null
          || item.contentAssetId !== null
        ));
    }
    return items.filter((item) => item.selectedSourceKind === sourceKind);
  }

  private healthSourceToRuntimeSource(sourceKind: LiteratureFulltextAcquisitionHealthSourceKind): string {
    if (sourceKind === 'explicit_url') {
      return 'download';
    }
    return sourceKind;
  }

  private latestItemError(
    items: LiteratureFulltextAcquisitionItemRecord[],
  ): Pick<LiteratureFulltextAcquisitionItemRecord, 'errorCode' | 'errorMessage'> | null {
    return [...items]
      .filter((item) => item.errorCode || item.errorMessage)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0] ?? null;
  }

  private async toItemDTO(item: LiteratureFulltextAcquisitionItemRecord): Promise<LiteratureFulltextAcquisitionItemDTO> {
    const literature = await this.repository.findLiteratureById(item.literatureId);
    return {
      item_id: item.id,
      job_id: item.jobId,
      literature_id: item.literatureId,
      title: literature?.title ?? null,
      status: item.status,
      selected_source_kind: item.selectedSourceKind,
      source_url: item.sourceUrl,
      final_url: item.finalUrl,
      content_asset_id: item.contentAssetId,
      attempt_count: item.attemptCount,
      error_code: item.errorCode,
      error_message: item.errorMessage,
      blocker_code: item.blockerCode,
      retryable: item.retryable,
      resolution_candidates: item.resolutionCandidates as unknown as LiteratureFulltextAcquisitionCandidateDTO[],
      checkpoint: item.checkpoint,
      created_at: item.createdAt,
      started_at: item.startedAt,
      finished_at: item.finishedAt,
      updated_at: item.updatedAt,
    };
  }

  private readTotals(value: Record<string, unknown>): LiteratureFulltextAcquisitionJobDTO['totals'] {
    return {
      total: this.readNumber(value.total),
      queued: this.readNumber(value.queued),
      running: this.readNumber(value.running),
      succeeded: this.readNumber(value.succeeded),
      partial: this.readNumber(value.partial),
      blocked: this.readNumber(value.blocked),
      failed: this.readNumber(value.failed),
      skipped: this.readNumber(value.skipped),
      canceled: this.readNumber(value.canceled),
    };
  }

  private readErrorCode(error: unknown): string {
    if (error instanceof AppError && error.message.includes('SOURCE_RATE_LIMIT')) {
      return 'SOURCE_RATE_LIMIT';
    }
    if (error instanceof AppError && error.message.includes('UNPAYWALL_NO_OA_PDF')) {
      return 'UNPAYWALL_NO_OA_PDF';
    }
    if (error instanceof AppError && error.message.includes('UNPAYWALL_NOT_CONFIGURED')) {
      return 'UNPAYWALL_NOT_CONFIGURED';
    }
    if (error instanceof AppError && error.statusCode === 400) {
      return 'DOWNLOAD_REJECTED';
    }
    if (error instanceof AppError) {
      return error.errorCode;
    }
    return 'FULLTEXT_ACQUISITION_FAILED';
  }

  private isTerminalJobStatus(status: LiteratureFulltextAcquisitionJobRecord['status']): boolean {
    return TERMINAL_JOB_STATUSES.has(status);
  }

  private readRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  }

  private readString(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
  }

  private readNumber(value: unknown): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
  }

  private clampInteger(value: number | undefined, fallback: number, minimum: number, maximum: number): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return fallback;
    }
    return Math.max(minimum, Math.min(maximum, Math.trunc(value)));
  }
}
