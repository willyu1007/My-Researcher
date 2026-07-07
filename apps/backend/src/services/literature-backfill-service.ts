import crypto from 'node:crypto';
import {
  LITERATURE_BACKFILL_NON_RETRYABLE_ERROR_CODES,
} from '@paper-engineering-assistant/shared/research-lifecycle/literature-contracts';
import type {
  LiteratureBackfillSkipReason,
} from '@paper-engineering-assistant/shared/research-lifecycle/literature-contracts';
import type {
  CreateLiteratureContentProcessingBackfillJobResponse,
  LiteratureContentProcessingBackfillDryRunEstimateDTO,
  LiteratureContentProcessingBackfillDryRunRequest,
  LiteratureContentProcessingBackfillDryRunResponse,
  LiteratureContentProcessingBackfillOptions,
  LiteratureContentProcessingBackfillPlanItemDTO,
  LiteratureContentProcessingBatchItemDTO,
  LiteratureContentProcessingBatchJobDTO,
  LiteratureContentProcessingCleanupDryRunRequest,
  LiteratureContentProcessingCleanupDryRunResponse,
  LiteratureContentProcessingRunDTO,
  LiteratureContentProcessingStageCode,
  LiteratureContentProcessingBackfillWorkset,
  LiteratureKeyContentBackfillCurationStatus,
  LiteratureKeyContentReadyMethod,
  ListLiteratureContentProcessingBackfillJobsQuery,
  ListLiteratureContentProcessingBackfillJobsResponse,
  RightsClass,
} from '@paper-engineering-assistant/shared/research-lifecycle/literature-contracts';
import { AppError } from '../errors/app-error.js';
import type {
  LiteratureContentProcessingBatchItemRecord,
  LiteratureContentProcessingBatchItemStatus,
  LiteratureContentProcessingBatchJobRecord,
  LiteraturePipelineRunRecord,
  LiteraturePipelineStageStateRecord,
  LiteratureRecord,
  LiteratureRepository,
} from '../repositories/literature-repository.js';
import { LiteratureEvidenceActivationService } from './literature-evidence-activation-service.js';
import { LiteratureFlowService } from './literature-flow-service.js';

const STAGE_ORDER: LiteratureContentProcessingStageCode[] = [
  'CITATION_NORMALIZED',
  'ABSTRACT_READY',
  'FULLTEXT_PREPROCESSED',
  'KEY_CONTENT_READY',
  'CHUNKED',
  'EMBEDDED',
  'INDEXED',
];

const DEEP_STAGES = new Set<LiteratureContentProcessingStageCode>([
  'FULLTEXT_PREPROCESSED',
  'KEY_CONTENT_READY',
  'CHUNKED',
  'EMBEDDED',
  'INDEXED',
]);

const TERMINAL_RUN_STATUSES = new Set(['SUCCESS', 'PARTIAL', 'FAILED', 'SKIPPED']);
// T-130 W-09 (L-14): sourced from the shared registry instead of a service-local literal.
const NON_RETRYABLE_CODES = new Set<string>(LITERATURE_BACKFILL_NON_RETRYABLE_ERROR_CODES);

type NormalizedBackfillOptions = LiteratureContentProcessingBackfillDryRunEstimateDTO['options'];

type PlannedBackfillItem = LiteratureContentProcessingBackfillPlanItemDTO & {
  title: string;
};

// T-130 W-09 (L-15): non-actionable plan outcome with an explicit reason (was a silent null).
type BackfillPlanSkip = {
  skipped: true;
  skip_reason: LiteratureBackfillSkipReason;
};

type RunFailureResolution = {
  itemStatus: LiteratureContentProcessingBatchItemStatus;
  errorCode: string;
  errorMessage: string;
  retryable: boolean;
  checkpointPatch: Record<string, unknown>;
};

type StageRunLimiter = <T>(stage: LiteratureContentProcessingStageCode, run: () => Promise<T>) => Promise<T>;

export class LiteratureBackfillService {
  private readonly activeJobs = new Map<string, Promise<void>>();

  constructor(
    private readonly repository: LiteratureRepository,
    private readonly flowService: LiteratureFlowService,
    private readonly options: {
      pollIntervalMs?: number;
      contentRunTimeoutMs?: number;
      resolvePreferredKeyContentMethod?: () => Promise<LiteratureKeyContentReadyMethod>;
    } = {},
    private readonly evidenceActivationService = new LiteratureEvidenceActivationService(repository),
  ) {}

  async resumeRunnableJobs(): Promise<void> {
    const jobs = await this.repository.listContentProcessingBatchJobs(100);
    for (const job of jobs) {
      if (job.status === 'QUEUED' || job.status === 'RUNNING' || job.status === 'CANCELING') {
        this.scheduleJob(job.id);
      }
    }
  }

  async dryRun(
    request: LiteratureContentProcessingBackfillDryRunRequest,
  ): Promise<LiteratureContentProcessingBackfillDryRunResponse> {
    return {
      estimate: await this.buildDryRunEstimate(request),
    };
  }

  async createJob(
    request: LiteratureContentProcessingBackfillDryRunRequest,
  ): Promise<CreateLiteratureContentProcessingBackfillJobResponse> {
    const estimate = await this.buildDryRunEstimate(request);
    const providerBudget = estimate.options.provider_call_budget;
    const estimatedProviderCalls =
      estimate.estimated_provider_calls.extraction_calls
      + estimate.estimated_provider_calls.embedding_calls;
    if (providerBudget !== null && estimatedProviderCalls > providerBudget) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        `Backfill provider call estimate ${estimatedProviderCalls} exceeds budget ${providerBudget}.`,
      );
    }

    const now = new Date().toISOString();
    const jobId = crypto.randomUUID();
    const items = estimate.plan_items.map((item) => ({
      id: crypto.randomUUID(),
      jobId,
      literatureId: item.literature_id,
      status: item.blocked ? 'BLOCKED' as const : 'QUEUED' as const,
      requestedStages: item.requested_stages,
      nextStageIndex: 0,
      pipelineRunId: null,
      attemptCount: 0,
      errorCode: item.blocked ? item.blocker_code : null,
      errorMessage: item.blocked ? 'Backfill item is blocked by current rights or run state.' : null,
      blockerCode: item.blocker_code,
      retryable: item.retryable,
      checkpoint: {
        key_content_curation_status: item.key_content_curation_status ?? 'NOT_APPLICABLE',
      },
      createdAt: now,
      startedAt: null,
      finishedAt: item.blocked ? now : null,
      updatedAt: now,
    } satisfies LiteratureContentProcessingBatchItemRecord));
    const totals = this.computeTotals(items);
    const job = await this.repository.createContentProcessingBatchJob({
      id: jobId,
      status: 'QUEUED',
      targetStage: estimate.target_stage,
      workset: estimate.workset as unknown as Record<string, unknown>,
      options: estimate.options as unknown as Record<string, unknown>,
      dryRunEstimate: estimate as unknown as Record<string, unknown>,
      totals,
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
    query: ListLiteratureContentProcessingBackfillJobsQuery,
  ): Promise<ListLiteratureContentProcessingBackfillJobsResponse> {
    const jobs = await this.repository.listContentProcessingBatchJobs(query.limit ?? 20);
    return {
      items: await Promise.all(jobs.map((job) => this.toJobDTO(job, undefined, false))),
    };
  }

  async getJob(jobId: string): Promise<{ job: LiteratureContentProcessingBatchJobDTO }> {
    const job = await this.requireJob(jobId);
    const items = await this.repository.listContentProcessingBatchItemsByJobId(jobId);
    return {
      job: await this.toJobDTO(job, items, true),
    };
  }

  async pauseJob(jobId: string): Promise<{ job: LiteratureContentProcessingBatchJobDTO }> {
    const job = await this.requireJob(jobId);
    if (job.status !== 'QUEUED' && job.status !== 'RUNNING') {
      return this.getJob(jobId);
    }
    const now = new Date().toISOString();
    await this.repository.updateContentProcessingBatchJob(jobId, {
      status: 'PAUSED',
      pausedAt: now,
      updatedAt: now,
    });
    return this.getJob(jobId);
  }

  async resumeJob(jobId: string): Promise<{ job: LiteratureContentProcessingBatchJobDTO }> {
    const job = await this.requireJob(jobId);
    if (job.status !== 'PAUSED') {
      return this.getJob(jobId);
    }
    const now = new Date().toISOString();
    await this.repository.updateContentProcessingBatchJob(jobId, {
      status: 'QUEUED',
      pausedAt: null,
      finishedAt: null,
      updatedAt: now,
    });
    this.scheduleJob(jobId);
    return this.getJob(jobId);
  }

  async cancelJob(jobId: string): Promise<{ job: LiteratureContentProcessingBatchJobDTO }> {
    const job = await this.requireJob(jobId);
    if (this.isTerminalJobStatus(job.status)) {
      return this.getJob(jobId);
    }
    const now = new Date().toISOString();
    await this.repository.updateContentProcessingBatchJob(jobId, {
      status: 'CANCELING',
      canceledAt: now,
      updatedAt: now,
    });
    await this.cancelQueuedItems(jobId, now);
    this.scheduleJob(jobId);
    return this.getJob(jobId);
  }

  async retryFailed(jobId: string): Promise<{ job: LiteratureContentProcessingBatchJobDTO }> {
    const job = await this.requireJob(jobId);
    if (job.status === 'RUNNING' || job.status === 'QUEUED' || job.status === 'CANCELING') {
      throw new AppError(409, 'INVALID_PAYLOAD', 'Cannot retry a job while it is running, queued, or canceling.');
    }
    const retryableItems = (await this.repository.listContentProcessingBatchItemsByJobId(jobId))
      .filter((item) =>
        item.retryable
        && (item.status === 'FAILED'
          || item.status === 'PARTIAL'
          || item.status === 'SKIPPED'
          || item.status === 'BLOCKED'));
    if (retryableItems.length === 0) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'No retryable failed backfill items are available.');
    }

    const targetStage = job.targetStage;
    const originalFilters = this.normalizeStageFilters(this.readWorkset(job.workset).stage_filters);
    const retryStageFilters = {
      ...originalFilters,
      failed: true,
    };
    const preferredKeyContentMethod = await this.resolvePreferredKeyContentMethod();
    const now = new Date().toISOString();
    for (const item of retryableItems) {
      const literature = await this.repository.findLiteratureById(item.literatureId);
      if (!literature) {
        await this.repository.updateContentProcessingBatchItem(item.id, {
          status: 'FAILED',
          errorCode: 'LITERATURE_NOT_FOUND',
          errorMessage: `Literature ${item.literatureId} not found.`,
          retryable: false,
          updatedAt: now,
        });
        continue;
      }
      const stageStates = await this.repository.listPipelineStageStatesByLiteratureId(item.literatureId);
      const planned = this.planLiteratureItem(
        literature,
        stageStates,
        targetStage,
        retryStageFilters,
        preferredKeyContentMethod,
      );
      if ('skipped' in planned) {
        await this.repository.updateContentProcessingBatchItem(item.id, {
          status: 'SKIPPED',
          requestedStages: [],
          nextStageIndex: 0,
          pipelineRunId: null,
          errorCode: planned.skip_reason,
          errorMessage: planned.skip_reason === 'ALL_STAGES_CURRENT'
            ? 'All stages up to the target are current; nothing to backfill.'
            : 'Actionable stages exist but the active stage filters exclude them.',
          retryable: false,
          finishedAt: now,
          updatedAt: now,
        });
        continue;
      }
      await this.repository.updateContentProcessingBatchItem(item.id, {
        status: planned.blocked ? 'BLOCKED' : 'QUEUED',
        requestedStages: planned.requested_stages,
        nextStageIndex: 0,
        pipelineRunId: null,
        attemptCount: item.attemptCount,
        errorCode: planned.blocked ? planned.blocker_code : null,
        errorMessage: planned.blocked ? 'Backfill item is blocked by current rights or run state.' : null,
        blockerCode: planned.blocker_code,
        retryable: planned.retryable,
        checkpoint: {
          key_content_curation_status: planned.key_content_curation_status ?? 'NOT_APPLICABLE',
        },
        startedAt: null,
        finishedAt: planned.blocked ? now : null,
        updatedAt: now,
      });
    }

    await this.refreshJobTotals(jobId);
    await this.repository.updateContentProcessingBatchJob(jobId, {
      status: 'QUEUED',
      errorCode: null,
      errorMessage: null,
      finishedAt: null,
      updatedAt: now,
    });
    this.scheduleJob(jobId);
    return this.getJob(jobId);
  }

  async deleteJob(jobId: string): Promise<void> {
    const job = await this.requireJob(jobId);
    if (job.status === 'RUNNING' || job.status === 'QUEUED' || job.status === 'CANCELING') {
      throw new AppError(409, 'INVALID_PAYLOAD', 'Cancel the backfill job before deleting it.');
    }
    if (this.activeJobs.has(jobId)) {
      throw new AppError(409, 'INVALID_PAYLOAD', 'Wait for the active backfill worker to stop before deleting it.');
    }
    await this.repository.deleteContentProcessingBatchJob(jobId);
  }

  async cleanupDryRun(
    request: LiteratureContentProcessingCleanupDryRunRequest,
  ): Promise<LiteratureContentProcessingCleanupDryRunResponse> {
    const retentionDays = Math.max(0, Math.min(3650, request.retention_days ?? 30));
    const selectedLiteratures = request.literature_ids?.length
      ? await this.repository.listLiteraturesByIds([...new Set(request.literature_ids)])
      : await this.repository.listLiteratures();
    const literatureIds = selectedLiteratures.map((literature) => literature.id);
    const activeVersionIds = new Set(
      selectedLiteratures
        .map((literature) => literature.activeEmbeddingVersionId)
        .filter((value): value is string => Boolean(value)),
    );
    const versions = await this.repository.listEmbeddingVersionsByLiteratureIds(literatureIds);
    const cutoffMs = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
    const candidates = versions
      .filter((version) => {
        if (activeVersionIds.has(version.id)) {
          return false;
        }
        return new Date(version.createdAt).getTime() <= cutoffMs;
      })
      .map((version) => ({
        embedding_version_id: version.id,
        literature_id: version.literatureId,
        version_no: version.versionNo,
        status: version.status,
        chunk_count: version.chunkCount,
        token_index_count: version.tokenCount,
        created_at: version.createdAt,
        protected_reason: null,
      }));

    let rawAssetCount = 0;
    for (const literatureId of literatureIds) {
      rawAssetCount += (await this.repository.listContentAssetsByLiteratureId(literatureId))
        .filter((asset) => asset.assetKind === 'raw_fulltext')
        .length;
    }

    return {
      generated_at: new Date().toISOString(),
      retention_days: retentionDays,
      candidate_count: candidates.length,
      protected_active_version_count: activeVersionIds.size,
      protected_raw_asset_count: rawAssetCount,
      estimated_chunks_to_remove: candidates.reduce((sum, item) => sum + item.chunk_count, 0),
      estimated_token_indexes_to_remove: candidates.reduce((sum, item) => sum + item.token_index_count, 0),
      candidates,
    };
  }

  private async buildDryRunEstimate(
    request: LiteratureContentProcessingBackfillDryRunRequest,
  ): Promise<LiteratureContentProcessingBackfillDryRunEstimateDTO> {
    const targetStage = this.normalizeTargetStage(request.target_stage);
    const workset = this.normalizeWorkset(request.workset);
    const options = this.normalizeOptions(request.options);
    const stageFilters = this.normalizeStageFilters(workset.stage_filters);
    const allLiteratures = await this.repository.listLiteratures();
    const selectedLiteratures = await this.selectLiteratures(allLiteratures, workset);
    const selectedIds = selectedLiteratures.map((literature) => literature.id);
    const stageStates = await this.repository.listPipelineStageStatesByLiteratureIds(selectedIds);
    const stageStatesByLiterature = new Map<string, LiteraturePipelineStageStateRecord[]>();
    for (const stageState of stageStates) {
      const rows = stageStatesByLiterature.get(stageState.literatureId) ?? [];
      rows.push(stageState);
      stageStatesByLiterature.set(stageState.literatureId, rows);
    }

    const planItems: PlannedBackfillItem[] = [];
    let skippedReadyCount = 0;
    let skippedFilterExcludedCount = 0;
    const preferredKeyContentMethod = await this.resolvePreferredKeyContentMethod();
    for (const literature of selectedLiteratures) {
      const planned = this.planLiteratureItem(
        literature,
        stageStatesByLiterature.get(literature.id) ?? [],
        targetStage,
        stageFilters,
        preferredKeyContentMethod,
      );
      if ('skipped' in planned) {
        skippedReadyCount += 1;
        if (planned.skip_reason === 'STAGE_FILTER_EXCLUDED') {
          skippedFilterExcludedCount += 1;
        }
        continue;
      }
      planItems.push(planned);
    }

    const stageCounts = Object.fromEntries(STAGE_ORDER.map((stage) => [stage, 0])) as Record<LiteratureContentProcessingStageCode, number>;
    const rightsCounts = new Map<RightsClass, number>();
    let extractionCalls = 0;
    let embeddingCalls = 0;
    for (const item of planItems) {
      rightsCounts.set(item.rights_class, (rightsCounts.get(item.rights_class) ?? 0) + 1);
      for (const stage of item.requested_stages) {
        stageCounts[stage] += 1;
      }
      if (preferredKeyContentMethod === 'llm_gateway' && item.requested_stages.includes('KEY_CONTENT_READY')) {
        extractionCalls += await this.estimateKeyContentExtractionCalls(item.literature_id);
      }
      if (item.requested_stages.includes('EMBEDDED')) {
        embeddingCalls += 1;
      }
    }

    return {
      dry_run_id: crypto.randomUUID(),
      generated_at: new Date().toISOString(),
      target_stage: targetStage,
      workset,
      options,
      total_literatures: allLiteratures.length,
      selected_count: selectedLiteratures.length,
      planned_item_count: planItems.length,
      skipped_ready_count: skippedReadyCount,
      skipped_filter_excluded_count: skippedFilterExcludedCount,
      blocked_count: planItems.filter((item) => item.blocked).length,
      curation_required_count: planItems.filter((item) =>
        item.key_content_curation_status !== null
        && item.key_content_curation_status !== 'NOT_APPLICABLE').length,
      stage_counts: stageCounts,
      rights_class_counts: [...rightsCounts.entries()].map(([rightsClass, count]) => ({
        rights_class: rightsClass,
        count,
      })),
      estimated_provider_calls: {
        extraction_calls: extractionCalls,
        embedding_calls: embeddingCalls,
      },
      estimated_storage_bytes: embeddingCalls * 4096,
      blockers: planItems
        .filter((item) => item.blocked)
        .map((item) => ({
          literature_id: item.literature_id,
          title: item.title,
          reason_code: item.blocker_code ?? 'BACKFILL_ITEM_BLOCKED',
          reason_message: 'Backfill item cannot start until its blocker is resolved.',
          retryable: item.retryable,
        })),
      plan_items: planItems.map((item) => ({
        literature_id: item.literature_id,
        title: item.title,
        rights_class: item.rights_class,
        requested_stages: item.requested_stages,
        blocked: item.blocked,
        blocker_code: item.blocker_code,
        retryable: item.retryable,
        key_content_curation_status: item.key_content_curation_status,
      })),
    };
  }

  private async selectLiteratures(
    allLiteratures: LiteratureRecord[],
    workset: LiteratureContentProcessingBackfillWorkset,
  ): Promise<LiteratureRecord[]> {
    const hasExplicitLiteratureIds = Boolean(workset.literature_ids?.length);
    let selectedIds: Set<string> | null = workset.literature_ids?.length
      ? new Set(workset.literature_ids)
      : null;

    if (workset.topic_id) {
      const topicIds = await this.evidenceActivationService.resolveTopicAutomaticProcessingLiteratureIds(workset.topic_id);
      selectedIds = selectedIds
        ? new Set([...selectedIds].filter((id) => topicIds.has(id)))
        : topicIds;
    }

    if (workset.paper_id) {
      const paperIds = await this.evidenceActivationService.resolvePaperAutomaticProcessingLiteratureIds(workset.paper_id);
      selectedIds = selectedIds
        ? new Set([...selectedIds].filter((id) => paperIds.has(id)))
        : paperIds;
    }

    const rightsFilter = workset.rights_classes?.length ? new Set(workset.rights_classes) : null;
    const fromMs = this.parseOptionalDateMs(workset.updated_at_from, 'updated_at_from') ?? Number.NEGATIVE_INFINITY;
    const toMs = this.parseOptionalDateMs(workset.updated_at_to, 'updated_at_to') ?? Number.POSITIVE_INFINITY;
    if (fromMs > toMs) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'updated_at_from must be earlier than or equal to updated_at_to.');
    }

    let filteredLiteratures = allLiteratures
      .filter((literature) => !selectedIds || selectedIds.has(literature.id))
      .filter((literature) => !rightsFilter || rightsFilter.has(literature.rightsClass))
      .filter((literature) => {
        const updatedMs = Date.parse(literature.updatedAt);
        return updatedMs >= fromMs && updatedMs <= toMs;
      });
    if (!hasExplicitLiteratureIds && !workset.topic_id && !workset.paper_id) {
      const processableIds = await this.evidenceActivationService.filterGlobalAutomaticProcessingLiteratureIds(
        filteredLiteratures.map((literature) => literature.id),
      );
      filteredLiteratures = filteredLiteratures.filter((literature) => processableIds.has(literature.id));
    }
    return filteredLiteratures.sort((left, right) => left.id.localeCompare(right.id));
  }

  private planLiteratureItem(
    literature: LiteratureRecord,
    stageStates: LiteraturePipelineStageStateRecord[],
    targetStage: LiteratureContentProcessingStageCode,
    stageFilters: Required<NonNullable<LiteratureContentProcessingBackfillWorkset['stage_filters']>>,
    preferredKeyContentMethod: LiteratureKeyContentReadyMethod,
  ): PlannedBackfillItem | BackfillPlanSkip {
    const targetIndex = STAGE_ORDER.indexOf(targetStage);
    const stageStatus = new Map(stageStates.map((stage) => [stage.stageCode, stage.status]));
    const relevantStages = STAGE_ORDER.slice(0, targetIndex + 1);
    let firstActionableIndex = -1;
    let blockerCode: string | null = null;
    let blocked = false;
    let retryable = true;

    for (const [index, stage] of relevantStages.entries()) {
      const status = stageStatus.get(stage) ?? 'NOT_STARTED';
      const matches =
        (stageFilters.missing && (status === 'NOT_STARTED' || status === 'SKIPPED'))
        || (stageFilters.stale && status === 'STALE')
        || (stageFilters.failed && (status === 'FAILED' || status === 'BLOCKED'));
      if (matches && firstActionableIndex === -1) {
        firstActionableIndex = index;
      }
      if (status === 'PENDING' || status === 'RUNNING') {
        firstActionableIndex = firstActionableIndex === -1 ? index : firstActionableIndex;
        blocked = true;
        blockerCode = 'RUN_IN_FLIGHT';
        retryable = true;
      }
    }

    if (firstActionableIndex === -1) {
      // T-130 W-09 (L-15): distinguish "everything up to target is current" from "the active
      // stage_filters excluded stages that would otherwise be actionable" — the latter was a
      // silent skip that read as completed.
      const hasNonCurrentStage = relevantStages.some((stage) => {
        const status = stageStatus.get(stage) ?? 'NOT_STARTED';
        return status !== 'SUCCEEDED';
      });
      return {
        skipped: true,
        skip_reason: hasNonCurrentStage ? 'STAGE_FILTER_EXCLUDED' : 'ALL_STAGES_CURRENT',
      };
    }

    const requestedStages = relevantStages.slice(firstActionableIndex);
    const keyContentCurationStatus = this.resolveKeyContentCurationStatus(
      requestedStages,
      stageStatus,
      preferredKeyContentMethod,
    );
    if (requestedStages.some((stage) => DEEP_STAGES.has(stage))) {
      const rightsGate = this.checkDeepStageRights(literature.rightsClass);
      if (!rightsGate.ok) {
        blocked = true;
        blockerCode = rightsGate.reasonCode;
        retryable = false;
      }
    }

    return {
      literature_id: literature.id,
      title: literature.title,
      rights_class: literature.rightsClass,
      requested_stages: requestedStages,
      blocked,
      blocker_code: blockerCode,
      retryable,
      key_content_curation_status: keyContentCurationStatus,
    };
  }

  private resolveKeyContentCurationStatus(
    requestedStages: LiteratureContentProcessingStageCode[],
    stageStatus: Map<LiteratureContentProcessingStageCode, LiteraturePipelineStageStateRecord['status']>,
    preferredKeyContentMethod: LiteratureKeyContentReadyMethod,
  ): LiteratureKeyContentBackfillCurationStatus | null {
    if (preferredKeyContentMethod === 'llm_gateway' || !requestedStages.includes('KEY_CONTENT_READY')) {
      return null;
    }

    const keyContentStatus = stageStatus.get('KEY_CONTENT_READY') ?? 'NOT_STARTED';
    if (keyContentStatus === 'SUCCEEDED') {
      return 'NOT_APPLICABLE';
    }
    if (keyContentStatus === 'BLOCKED') {
      return 'WAITING_FOR_DOSSIER';
    }
    if (keyContentStatus === 'FAILED') {
      return 'IMPORT_FAILED';
    }
    return 'CURATION_REQUIRED';
  }

  private scheduleJob(jobId: string): void {
    if (this.activeJobs.has(jobId)) {
      return;
    }
    const job = this.processJob(jobId)
      .catch(async (error) => {
        await this.failJob(jobId, error);
      })
      .finally(() => {
        this.activeJobs.delete(jobId);
      });
    this.activeJobs.set(jobId, job);
  }

  private async processJob(jobId: string): Promise<void> {
    let job = await this.requireJob(jobId);
    if (this.isTerminalJobStatus(job.status) || job.status === 'PAUSED') {
      return;
    }

    const startedAt = new Date().toISOString();
    if (job.status === 'QUEUED') {
      job = await this.repository.updateContentProcessingBatchJob(jobId, {
        status: 'RUNNING',
        startedAt: job.startedAt ?? startedAt,
        updatedAt: startedAt,
      });
    }
    if (job.status === 'RUNNING') {
      await this.requeueInterruptedRunningItems(jobId);
    }

    const options = this.readOptions(job.options);
    const queuedItems = await this.repository.listContentProcessingBatchItemsByJobIdAndStatuses(
      jobId,
      ['QUEUED'],
    );
    const runWithStageLimiter = this.createStageRunLimiter(options);
    let cursor = 0;
    const workerCount = Math.min(options.max_parallel_literature_runs, queuedItems.length);
    await Promise.all(Array.from({ length: workerCount }, async () => {
      while (cursor < queuedItems.length) {
        const currentIndex = cursor;
        cursor += 1;
        const item = queuedItems[currentIndex];
        if (!item) {
          continue;
        }
        const currentJob = await this.requireJob(jobId);
        if (currentJob.status === 'PAUSED' || currentJob.status === 'CANCELING' || currentJob.status === 'CANCELED') {
          break;
        }
        try {
          await this.processItem(currentJob, item, runWithStageLimiter);
        } catch (error) {
          await this.failItem(item.id, error);
        }
        await this.refreshJobTotals(jobId);
      }
    }));

    await this.finishJobIfSettled(jobId);
  }

  private async processItem(
    job: LiteratureContentProcessingBatchJobRecord,
    item: LiteratureContentProcessingBatchItemRecord,
    runWithStageLimiter: StageRunLimiter,
  ): Promise<void> {
    const startedAt = new Date().toISOString();
    let currentItem = await this.repository.updateContentProcessingBatchItem(item.id, {
      status: 'RUNNING',
      startedAt: item.startedAt ?? startedAt,
      updatedAt: startedAt,
    });

    for (let index = currentItem.nextStageIndex; index < currentItem.requestedStages.length; index += 1) {
      const currentJob = await this.requireJob(job.id);
      if (currentJob.status === 'PAUSED') {
        await this.repository.updateContentProcessingBatchItem(currentItem.id, {
          status: 'QUEUED',
          nextStageIndex: index,
          updatedAt: new Date().toISOString(),
        });
        return;
      }
      if (currentJob.status === 'CANCELING' || currentJob.status === 'CANCELED') {
        await this.repository.updateContentProcessingBatchItem(currentItem.id, {
          status: 'CANCELED',
          nextStageIndex: index,
          errorCode: 'BATCH_JOB_CANCELED',
          errorMessage: 'Batch job was canceled.',
          retryable: false,
          finishedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        return;
      }

      const stage = currentItem.requestedStages[index]!;
      const run = await runWithStageLimiter(
        stage,
        () => this.flowService.triggerContentProcessingRun(currentItem.literatureId, [stage], 'BACKFILL'),
      );
      currentItem = await this.repository.updateContentProcessingBatchItem(currentItem.id, {
        pipelineRunId: run.run_id,
        attemptCount: currentItem.attemptCount + 1,
        checkpoint: {
          ...currentItem.checkpoint,
          current_stage: stage,
          current_stage_index: index,
          content_processing_run_id: run.run_id,
        },
        updatedAt: new Date().toISOString(),
      });

      const terminalRun = await this.waitForRunTerminal(run);
      if (terminalRun.status === 'SUCCESS') {
        currentItem = await this.repository.updateContentProcessingBatchItem(currentItem.id, {
          nextStageIndex: index + 1,
          errorCode: null,
          errorMessage: null,
          blockerCode: null,
          checkpoint: {
            ...currentItem.checkpoint,
            last_succeeded_stage: stage,
            last_content_processing_run_id: terminalRun.id,
            ...(stage === 'KEY_CONTENT_READY' ? { key_content_curation_status: 'NOT_APPLICABLE' } : {}),
          },
          updatedAt: new Date().toISOString(),
        });
        continue;
      }

      const failure = await this.resolveRunFailure(terminalRun);
      await this.repository.updateContentProcessingBatchItem(currentItem.id, {
        status: failure.itemStatus,
        nextStageIndex: index,
        errorCode: failure.errorCode,
        errorMessage: failure.errorMessage,
        blockerCode: failure.itemStatus === 'BLOCKED' ? failure.errorCode : null,
        retryable: failure.retryable,
        checkpoint: {
          ...currentItem.checkpoint,
          failed_stage: stage,
          failed_content_processing_run_id: terminalRun.id,
          ...failure.checkpointPatch,
        },
        finishedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      return;
    }

    await this.repository.updateContentProcessingBatchItem(currentItem.id, {
      status: 'SUCCEEDED',
      nextStageIndex: currentItem.requestedStages.length,
      errorCode: null,
      errorMessage: null,
      blockerCode: null,
      retryable: true,
      checkpoint: {
        ...currentItem.checkpoint,
        key_content_curation_status: 'NOT_APPLICABLE',
      },
      finishedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  private async waitForRunTerminal(run: LiteratureContentProcessingRunDTO): Promise<LiteraturePipelineRunRecord> {
    if (TERMINAL_RUN_STATUSES.has(run.status)) {
      return {
        id: run.run_id,
        literatureId: run.literature_id,
        triggerSource: run.trigger_source,
        status: run.status,
        requestedStages: run.requested_stages,
        errorCode: run.error_code,
        errorMessage: run.error_message,
        createdAt: run.created_at,
        startedAt: run.started_at,
        finishedAt: run.finished_at,
        updatedAt: run.updated_at,
      };
    }

    const timeoutMs = this.options.contentRunTimeoutMs ?? 15 * 60_000;
    const pollIntervalMs = this.options.pollIntervalMs ?? 25;
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const current = await this.repository.findPipelineRunById(run.run_id);
      if (current && TERMINAL_RUN_STATUSES.has(current.status)) {
        return current;
      }
      await this.sleep(pollIntervalMs);
    }

    throw new Error(`Timed out after ${timeoutMs}ms waiting for content-processing run ${run.run_id}.`);
  }

  private async resolveRunFailure(run: LiteraturePipelineRunRecord): Promise<RunFailureResolution> {
    const steps = await this.repository.listPipelineRunStepsByRunId(run.id);
    const failedStep = [...steps].reverse().find((step) =>
      step.status === 'FAILED' || step.status === 'BLOCKED' || step.status === 'SKIPPED');
    const errorCode = failedStep?.errorCode ?? run.errorCode ?? 'CONTENT_PROCESSING_RUN_FAILED';
    const errorMessage = failedStep?.errorMessage ?? run.errorMessage ?? 'Content-processing run failed.';
    const checkpointPatch = await this.resolveFailureCheckpointPatch(run, failedStep?.stageCode ?? null, errorCode);
    if (errorCode === 'KEY_CONTENT_CURATION_REQUIRED') {
      return {
        itemStatus: 'BLOCKED',
        errorCode,
        errorMessage,
        retryable: true,
        checkpointPatch,
      };
    }
    if (failedStep?.status === 'BLOCKED') {
      return {
        itemStatus: 'BLOCKED',
        errorCode,
        errorMessage,
        retryable: !NON_RETRYABLE_CODES.has(errorCode),
        checkpointPatch,
      };
    }
    if (run.status === 'SKIPPED') {
      return {
        itemStatus: 'SKIPPED',
        errorCode,
        errorMessage,
        retryable: true,
        checkpointPatch,
      };
    }
    if (run.status === 'PARTIAL') {
      return {
        itemStatus: 'PARTIAL',
        errorCode,
        errorMessage,
        retryable: !NON_RETRYABLE_CODES.has(errorCode),
        checkpointPatch,
      };
    }
    return {
      itemStatus: 'FAILED',
      errorCode,
      errorMessage,
      retryable: !NON_RETRYABLE_CODES.has(errorCode),
      checkpointPatch,
    };
  }

  private async resolveFailureCheckpointPatch(
    run: LiteraturePipelineRunRecord,
    stageCode: LiteratureContentProcessingStageCode | null,
    errorCode: string,
  ): Promise<Record<string, unknown>> {
    if (errorCode !== 'KEY_CONTENT_CURATION_REQUIRED') {
      return {};
    }

    const stageStates = await this.repository.listPipelineStageStatesByLiteratureId(run.literatureId);
    const stageState = stageStates.find((state) => state.stageCode === (stageCode ?? 'KEY_CONTENT_READY'));
    const diagnostics = Array.isArray(stageState?.detail.diagnostics)
      ? stageState.detail.diagnostics.filter((item): item is Record<string, unknown> =>
        Boolean(item && typeof item === 'object' && !Array.isArray(item)))
      : [];
    const firstDiagnostic = diagnostics[0] ?? {};
    return {
      key_content_curation_status: 'WAITING_FOR_DOSSIER',
      key_content_curation_required_at: new Date().toISOString(),
      curation_bundle_route: typeof firstDiagnostic.curation_bundle_route === 'string'
        ? firstDiagnostic.curation_bundle_route
        : `/literature/${run.literatureId}/content-processing/key-content-curation-bundle`,
      dossier_import_route: typeof firstDiagnostic.dossier_import_route === 'string'
        ? firstDiagnostic.dossier_import_route
        : `/literature/${run.literatureId}/content-processing/key-content-dossier`,
    };
  }

  private async finishJobIfSettled(jobId: string): Promise<void> {
    const job = await this.requireJob(jobId);
    const items = await this.repository.listContentProcessingBatchItemsByJobId(jobId);
    const totals = this.computeTotals(items);
    const now = new Date().toISOString();

    if (job.status === 'CANCELING') {
      await this.cancelQueuedItems(jobId, now);
      const settledItems = await this.repository.listContentProcessingBatchItemsByJobId(jobId);
      const settledTotals = this.computeTotals(settledItems);
      await this.repository.updateContentProcessingBatchJob(jobId, {
        status: 'CANCELED',
        totals: settledTotals,
        finishedAt: now,
        updatedAt: now,
      });
      return;
    }

    if (job.status === 'PAUSED') {
      await this.repository.updateContentProcessingBatchJob(jobId, {
        totals,
        updatedAt: now,
      });
      return;
    }

    if (totals.queued > 0 || totals.running > 0) {
      await this.repository.updateContentProcessingBatchJob(jobId, {
        status: 'QUEUED',
        totals,
        updatedAt: now,
      });
      this.scheduleJob(jobId);
      return;
    }

    const finalStatus = this.resolveFinalJobStatus(totals);
    await this.repository.updateContentProcessingBatchJob(jobId, {
      status: finalStatus,
      totals,
      finishedAt: now,
      updatedAt: now,
      errorCode: finalStatus === 'FAILED' || finalStatus === 'PARTIAL' ? 'BACKFILL_JOB_COMPLETED_WITH_ERRORS' : null,
      errorMessage: finalStatus === 'FAILED' || finalStatus === 'PARTIAL' ? 'One or more backfill items did not succeed.' : null,
    });
  }

  private resolveFinalJobStatus(totals: LiteratureContentProcessingBatchJobDTO['totals']): LiteratureContentProcessingBatchJobRecord['status'] {
    if (totals.canceled > 0 && totals.succeeded === 0 && totals.failed === 0 && totals.blocked === 0 && totals.partial === 0) {
      return 'CANCELED';
    }
    if (totals.failed > 0) {
      return totals.succeeded > 0 || totals.skipped > 0 || totals.blocked > 0 || totals.partial > 0 ? 'PARTIAL' : 'FAILED';
    }
    if (totals.blocked > 0 || totals.partial > 0) {
      return 'PARTIAL';
    }
    return 'SUCCEEDED';
  }

  private async failJob(jobId: string, error: unknown): Promise<void> {
    const now = new Date().toISOString();
    const runningItems = await this.repository.listContentProcessingBatchItemsByJobIdAndStatuses(jobId, ['RUNNING'])
      .catch(() => []);
    for (const item of runningItems) {
      await this.repository.updateContentProcessingBatchItem(item.id, {
        status: 'FAILED',
        errorCode: 'BACKFILL_JOB_WORKER_FAILED',
        errorMessage: error instanceof Error ? error.message : 'Backfill worker failed.',
        retryable: true,
        finishedAt: now,
        updatedAt: now,
      }).catch(() => undefined);
    }
    const items = await this.repository.listContentProcessingBatchItemsByJobId(jobId).catch(() => []);
    const patch: Partial<Omit<LiteratureContentProcessingBatchJobRecord, 'id' | 'createdAt'>> = {
      status: 'FAILED',
      errorCode: 'BACKFILL_JOB_WORKER_FAILED',
      errorMessage: error instanceof Error ? error.message : 'Backfill worker failed.',
      finishedAt: now,
      updatedAt: now,
    };
    if (items.length > 0) {
      patch.totals = this.computeTotals(items);
    }
    await this.repository.updateContentProcessingBatchJob(jobId, patch).catch(() => undefined);
  }

  private async failItem(itemId: string, error: unknown): Promise<void> {
    const now = new Date().toISOString();
    await this.repository.updateContentProcessingBatchItem(itemId, {
      status: 'FAILED',
      errorCode: 'BACKFILL_ITEM_WORKER_FAILED',
      errorMessage: error instanceof Error ? error.message : 'Backfill item worker failed.',
      retryable: true,
      finishedAt: now,
      updatedAt: now,
    });
  }

  private async requeueInterruptedRunningItems(jobId: string): Promise<void> {
    const runningItems = await this.repository.listContentProcessingBatchItemsByJobIdAndStatuses(jobId, ['RUNNING']);
    for (const item of runningItems) {
      await this.closeInterruptedPipelineRun(item);
      await this.repository.updateContentProcessingBatchItem(item.id, {
        status: 'QUEUED',
        pipelineRunId: null,
        checkpoint: {
          ...item.checkpoint,
          resumed_after_interruption_at: new Date().toISOString(),
        },
        updatedAt: new Date().toISOString(),
      });
    }
  }

  private async closeInterruptedPipelineRun(item: LiteratureContentProcessingBatchItemRecord): Promise<void> {
    if (!item.pipelineRunId) {
      return;
    }
    const interruptedAt = new Date().toISOString();
    const run = await this.repository.findPipelineRunById(item.pipelineRunId);
    if (run && !TERMINAL_RUN_STATUSES.has(run.status)) {
      await this.repository.updatePipelineRun(run.id, {
        status: 'FAILED',
        errorCode: 'BACKFILL_RUN_INTERRUPTED',
        errorMessage: 'Backfill worker recovered an interrupted content-processing run.',
        finishedAt: interruptedAt,
        updatedAt: interruptedAt,
      });
    }

    const currentStage = this.readCheckpointStage(item.checkpoint);
    if (!currentStage) {
      return;
    }
    const stageStates = await this.repository.listPipelineStageStatesByLiteratureId(item.literatureId);
    const stageState = stageStates.find((state) => state.stageCode === currentStage);
    if (!stageState || (stageState.status !== 'PENDING' && stageState.status !== 'RUNNING')) {
      return;
    }
    await this.repository.upsertPipelineStageState({
      ...stageState,
      status: 'FAILED',
      lastRunId: item.pipelineRunId,
      detail: {
        ...stageState.detail,
        error_code: 'BACKFILL_RUN_INTERRUPTED',
        error_message: 'Backfill worker recovered an interrupted content-processing stage.',
        recovered_at: interruptedAt,
      },
      updatedAt: interruptedAt,
    });
  }

  private readCheckpointStage(checkpoint: Record<string, unknown>): LiteratureContentProcessingStageCode | null {
    const stage = checkpoint.current_stage;
    return typeof stage === 'string' && STAGE_ORDER.includes(stage as LiteratureContentProcessingStageCode)
      ? stage as LiteratureContentProcessingStageCode
      : null;
  }

  private readKeyContentCurationStatus(
    checkpoint: Record<string, unknown>,
  ): LiteratureKeyContentBackfillCurationStatus | null {
    const status = checkpoint.key_content_curation_status;
    if (
      status === 'NOT_APPLICABLE'
      || status === 'CURATION_REQUIRED'
      || status === 'WAITING_FOR_DOSSIER'
      || status === 'READY_TO_IMPORT'
      || status === 'IMPORT_FAILED'
    ) {
      return status;
    }
    return null;
  }

  private async refreshJobTotals(jobId: string): Promise<void> {
    const items = await this.repository.listContentProcessingBatchItemsByJobId(jobId);
    await this.repository.updateContentProcessingBatchJob(jobId, {
      totals: this.computeTotals(items),
      updatedAt: new Date().toISOString(),
    });
  }

  private async cancelQueuedItems(jobId: string, now: string): Promise<void> {
    const queuedItems = await this.repository.listContentProcessingBatchItemsByJobIdAndStatuses(jobId, ['QUEUED']);
    for (const item of queuedItems) {
      await this.repository.updateContentProcessingBatchItem(item.id, {
        status: 'CANCELED',
        errorCode: 'BATCH_JOB_CANCELED',
        errorMessage: 'Batch job was canceled before this item started.',
        retryable: false,
        finishedAt: now,
        updatedAt: now,
      });
    }
  }

  private createStageRunLimiter(options: NormalizedBackfillOptions): StageRunLimiter {
    const extractionLimiter = new AsyncLimiter(options.extraction_concurrency);
    const embeddingLimiter = new AsyncLimiter(options.embedding_concurrency);
    return async <T>(stage: LiteratureContentProcessingStageCode, run: () => Promise<T>): Promise<T> => {
      if (stage === 'KEY_CONTENT_READY') {
        return extractionLimiter.run(run);
      }
      if (stage === 'EMBEDDED') {
        return embeddingLimiter.run(run);
      }
      return run();
    };
  }

  private computeTotals(items: LiteratureContentProcessingBatchItemRecord[]): LiteratureContentProcessingBatchJobDTO['totals'] {
    return {
      total: items.length,
      queued: items.filter((item) => item.status === 'QUEUED').length,
      running: items.filter((item) => item.status === 'RUNNING').length,
      succeeded: items.filter((item) => item.status === 'SUCCEEDED').length,
      partial: items.filter((item) => item.status === 'PARTIAL').length,
      blocked: items.filter((item) => item.status === 'BLOCKED').length,
      failed: items.filter((item) => item.status === 'FAILED').length,
      skipped: items.filter((item) => item.status === 'SKIPPED').length,
      canceled: items.filter((item) => item.status === 'CANCELED').length,
    };
  }

  private async toJobDTO(
    job: LiteratureContentProcessingBatchJobRecord,
    items: LiteratureContentProcessingBatchItemRecord[] | undefined,
    includeItems: boolean,
  ): Promise<LiteratureContentProcessingBatchJobDTO> {
    const itemRows = includeItems
      ? (items ?? await this.repository.listContentProcessingBatchItemsByJobId(job.id))
      : undefined;
    const titleByLiteratureId = new Map<string, string>();
    if (itemRows && itemRows.length > 0) {
      const literatures = await this.repository.listLiteraturesByIds([...new Set(itemRows.map((item) => item.literatureId))]);
      for (const literature of literatures) {
        titleByLiteratureId.set(literature.id, literature.title);
      }
    }

    return {
      job_id: job.id,
      status: job.status,
      target_stage: job.targetStage,
      workset: this.readWorkset(job.workset),
      options: this.readOptions(job.options),
      dry_run_estimate: job.dryRunEstimate as unknown as LiteratureContentProcessingBackfillDryRunEstimateDTO,
      totals: this.readTotals(job.totals),
      error_code: job.errorCode,
      error_message: job.errorMessage,
      created_at: job.createdAt,
      started_at: job.startedAt,
      paused_at: job.pausedAt,
      canceled_at: job.canceledAt,
      finished_at: job.finishedAt,
      updated_at: job.updatedAt,
      ...(itemRows ? {
        items: itemRows.map((item) => this.toItemDTO(item, titleByLiteratureId.get(item.literatureId) ?? null)),
      } : {}),
    };
  }

  private toItemDTO(
    item: LiteratureContentProcessingBatchItemRecord,
    title: string | null,
  ): LiteratureContentProcessingBatchItemDTO {
    return {
      item_id: item.id,
      job_id: item.jobId,
      literature_id: item.literatureId,
      title,
      status: item.status,
      requested_stages: item.requestedStages,
      next_stage_index: item.nextStageIndex,
      content_processing_run_id: item.pipelineRunId,
      attempt_count: item.attemptCount,
      error_code: item.errorCode,
      error_message: item.errorMessage,
      blocker_code: item.blockerCode,
      retryable: item.retryable,
      key_content_curation_status: this.readKeyContentCurationStatus(item.checkpoint),
      checkpoint: item.checkpoint,
      created_at: item.createdAt,
      started_at: item.startedAt,
      finished_at: item.finishedAt,
      updated_at: item.updatedAt,
    };
  }

  private async requireJob(jobId: string): Promise<LiteratureContentProcessingBatchJobRecord> {
    const job = await this.repository.findContentProcessingBatchJobById(jobId);
    if (!job) {
      throw new AppError(404, 'NOT_FOUND', `Content-processing backfill job ${jobId} not found.`);
    }
    return job;
  }

  private normalizeTargetStage(stage?: LiteratureContentProcessingStageCode): LiteratureContentProcessingStageCode {
    return stage && STAGE_ORDER.includes(stage) ? stage : 'INDEXED';
  }

  private normalizeWorkset(workset: LiteratureContentProcessingBackfillWorkset | undefined): LiteratureContentProcessingBackfillWorkset {
    return {
      ...(workset?.topic_id?.trim() ? { topic_id: workset.topic_id.trim() } : {}),
      ...(workset?.paper_id?.trim() ? { paper_id: workset.paper_id.trim() } : {}),
      ...(workset?.literature_ids?.length ? { literature_ids: [...new Set(workset.literature_ids.map((id) => id.trim()).filter(Boolean))] } : {}),
      ...(workset?.rights_classes?.length ? { rights_classes: [...new Set(workset.rights_classes)] } : {}),
      ...(workset?.stage_filters ? { stage_filters: this.normalizeStageFilters(workset.stage_filters) } : {}),
      ...(workset?.updated_at_from?.trim() ? { updated_at_from: workset.updated_at_from.trim() } : {}),
      ...(workset?.updated_at_to?.trim() ? { updated_at_to: workset.updated_at_to.trim() } : {}),
    };
  }

  private normalizeStageFilters(
    filters: LiteratureContentProcessingBackfillWorkset['stage_filters'],
  ): Required<NonNullable<LiteratureContentProcessingBackfillWorkset['stage_filters']>> {
    if (!filters) {
      return this.defaultStageFilters();
    }
    const normalized = {
      missing: filters.missing ?? false,
      stale: filters.stale ?? false,
      failed: filters.failed ?? false,
    };
    if (!normalized.missing && !normalized.stale && !normalized.failed) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'At least one backfill stage filter must be enabled.');
    }
    return normalized;
  }

  private defaultStageFilters(): Required<NonNullable<LiteratureContentProcessingBackfillWorkset['stage_filters']>> {
    return {
      missing: true,
      stale: true,
      failed: true,
    };
  }

  private normalizeOptions(options: LiteratureContentProcessingBackfillOptions | undefined): NormalizedBackfillOptions {
    return {
      max_parallel_literature_runs: this.clampInteger(options?.max_parallel_literature_runs, 1, 1, 4),
      extraction_concurrency: this.clampInteger(options?.extraction_concurrency, 1, 1, 4),
      embedding_concurrency: this.clampInteger(options?.embedding_concurrency, 1, 1, 4),
      provider_call_budget: typeof options?.provider_call_budget === 'number' && Number.isFinite(options.provider_call_budget)
        ? Math.max(1, Math.floor(options.provider_call_budget))
        : null,
    };
  }

  private async estimateKeyContentExtractionCalls(literatureId: string): Promise<number> {
    const documents = await this.repository.listFulltextDocumentsByLiteratureId(literatureId);
    const document = documents
      .filter((item) => item.status === 'READY')
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
    if (!document) {
      return 1;
    }

    const [sections, paragraphs] = await Promise.all([
      this.repository.listFulltextSectionsByDocumentId(document.id),
      this.repository.listFulltextParagraphsByDocumentId(document.id),
    ]);
    const sectionIdsWithText = new Set(
      paragraphs
        .filter((paragraph) => paragraph.text.trim().length > 0)
        .map((paragraph) => paragraph.sectionId),
    );
    const extractionUnitCount = sections.filter((section) => sectionIdsWithText.has(section.sectionId)).length;
    return extractionUnitCount > 0 ? extractionUnitCount + 1 : 1;
  }

  private async resolvePreferredKeyContentMethod(): Promise<LiteratureKeyContentReadyMethod> {
    return this.options.resolvePreferredKeyContentMethod?.() ?? 'codex_curated';
  }

  private readOptions(value: Record<string, unknown>): NormalizedBackfillOptions {
    return this.normalizeOptions({
      max_parallel_literature_runs: typeof value.max_parallel_literature_runs === 'number' ? value.max_parallel_literature_runs : undefined,
      extraction_concurrency: typeof value.extraction_concurrency === 'number' ? value.extraction_concurrency : undefined,
      embedding_concurrency: typeof value.embedding_concurrency === 'number' ? value.embedding_concurrency : undefined,
      provider_call_budget: typeof value.provider_call_budget === 'number' ? value.provider_call_budget : undefined,
    });
  }

  private readWorkset(value: Record<string, unknown>): LiteratureContentProcessingBackfillWorkset {
    return this.normalizeWorkset(value as LiteratureContentProcessingBackfillWorkset);
  }

  private readTotals(value: Record<string, unknown>): LiteratureContentProcessingBatchJobDTO['totals'] {
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

  private readNumber(value: unknown): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
  }

  private parseOptionalDateMs(value: string | undefined, fieldName: string): number | null {
    if (!value) {
      return null;
    }
    const parsed = Date.parse(value);
    if (!Number.isFinite(parsed)) {
      throw new AppError(400, 'INVALID_PAYLOAD', `${fieldName} must be a valid date-time string.`);
    }
    return parsed;
  }

  private clampInteger(value: number | undefined, fallback: number, min: number, max: number): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return fallback;
    }
    return Math.max(min, Math.min(max, Math.floor(value)));
  }

  private checkDeepStageRights(rightsClass: RightsClass):
    | { ok: true }
    | { ok: false; reasonCode: 'RIGHTS_RESTRICTED' | 'USER_AUTH_DISABLED' } {
    if (rightsClass === 'RESTRICTED') {
      return { ok: false, reasonCode: 'RIGHTS_RESTRICTED' };
    }
    if (rightsClass === 'USER_AUTH' && !this.isUserAuthContentProcessingEnabled()) {
      return { ok: false, reasonCode: 'USER_AUTH_DISABLED' };
    }
    return { ok: true };
  }

  private isUserAuthContentProcessingEnabled(): boolean {
    const raw = (process.env.LITERATURE_USER_AUTH_CONTENT_PROCESSING_ENABLED ?? 'false').trim().toLowerCase();
    return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on';
  }

  private isTerminalJobStatus(status: LiteratureContentProcessingBatchJobRecord['status']): boolean {
    return status === 'SUCCEEDED' || status === 'PARTIAL' || status === 'FAILED' || status === 'CANCELED';
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

class AsyncLimiter {
  private active = 0;
  private readonly queue: Array<() => void> = [];

  constructor(private readonly limit: number) {}

  async run<T>(task: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await task();
    } finally {
      this.release();
    }
  }

  private acquire(): Promise<void> {
    if (this.active < this.limit) {
      this.active += 1;
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.queue.push(() => {
        this.active += 1;
        resolve();
      });
    });
  }

  private release(): void {
    this.active = Math.max(0, this.active - 1);
    this.queue.shift()?.();
  }
}
