import crypto from 'node:crypto';
import type {
  GetLiteraturePipelineResponse,
  LiteraturePipelineRunDTO,
  LiteraturePipelineRunStepDTO,
  LiteraturePipelineStageCode,
  LiteraturePipelineStateDTO,
  LiteraturePipelineTriggerSource,
  ListLiteraturePipelineRunsResponse,
} from '@paper-engineering-assistant/shared';
import { AppError } from '../errors/app-error.js';
import type {
  LiteraturePipelineDedupStatus,
  LiteraturePipelineRunRecord,
  LiteraturePipelineRunStepRecord,
  LiteraturePipelineStageStateRecord,
  LiteraturePipelineStateRecord,
  LiteratureRecord,
  LiteratureRepository,
} from '../repositories/literature-repository.js';
import { OverviewStatusResolver, type OverviewStatusResolverInput } from './overview-status-resolver.js';
import { PipelineOrchestrator, type StageExecutionContext, type StageExecutionResult } from './pipeline-orchestrator.js';

const PIPELINE_STAGE_CODES: LiteraturePipelineStageCode[] = [
  'CITATION_NORMALIZED',
  'ABSTRACT_READY',
  'KEY_CONTENT_READY',
  'FULLTEXT_PREPROCESSED',
  'CHUNKED',
  'EMBEDDED',
  'INDEXED',
];

const V1_EXECUTABLE_STAGES: LiteraturePipelineStageCode[] = [
  'CITATION_NORMALIZED',
  'ABSTRACT_READY',
  'KEY_CONTENT_READY',
];

export type PipelineSignalState = {
  citationComplete: boolean;
  abstractReady: boolean;
  keyContentReady: boolean;
};

export class LiteratureFlowService {
  private readonly overviewStatusResolver = new OverviewStatusResolver();
  private readonly pipelineOrchestrator: PipelineOrchestrator;

  constructor(private readonly repository: LiteratureRepository) {
    this.pipelineOrchestrator = new PipelineOrchestrator(repository, {
      executeStage: async (context) => this.executeStage(context),
      onRunCompleted: async ({ literatureId }) => {
        await this.refreshPipelineState(literatureId);
      },
    });
  }

  async handleLiteratureUpserted(input: {
    literatureId: string;
    triggerSource: LiteraturePipelineTriggerSource;
    dedupStatus?: LiteraturePipelineDedupStatus;
    requestedStages?: LiteraturePipelineStageCode[];
  }): Promise<LiteraturePipelineRunDTO> {
    await this.ensurePipelineScaffold(input.literatureId, input.dedupStatus ?? 'unique');
    const run = await this.pipelineOrchestrator.enqueueRun({
      literatureId: input.literatureId,
      triggerSource: input.triggerSource,
      requestedStages: input.requestedStages ?? [...V1_EXECUTABLE_STAGES],
    });
    return this.toPipelineRunDTO(run);
  }

  async triggerOverviewRun(
    literatureId: string,
    requestedStages?: LiteraturePipelineStageCode[],
  ): Promise<LiteraturePipelineRunDTO> {
    return this.handleLiteratureUpserted({
      literatureId,
      triggerSource: 'OVERVIEW_ACTION',
      requestedStages: requestedStages?.length ? requestedStages : [...V1_EXECUTABLE_STAGES],
    });
  }

  async getPipeline(literatureId: string): Promise<GetLiteraturePipelineResponse> {
    await this.ensurePipelineScaffold(literatureId);
    const state = await this.repository.findPipelineStateByLiteratureId(literatureId);
    if (!state) {
      throw new AppError(500, 'INTERNAL_ERROR', `Pipeline state for ${literatureId} was not initialized.`);
    }
    const stageStates = await this.repository.listPipelineStageStatesByLiteratureId(literatureId);

    return {
      literature_id: literatureId,
      state: this.toPipelineStateDTO(state),
      stage_states: this.sortStageStates(stageStates).map((stage) => ({
        stage_code: stage.stageCode,
        status: stage.status,
        last_run_id: stage.lastRunId,
        detail: stage.detail,
        updated_at: stage.updatedAt,
      })),
    };
  }

  async listPipelineRuns(literatureId: string, limit?: number): Promise<ListLiteraturePipelineRunsResponse> {
    await this.assertLiteratureExists(literatureId);
    const runs = await this.repository.listPipelineRunsByLiteratureId(literatureId, limit);
    return {
      literature_id: literatureId,
      items: await Promise.all(runs.map(async (run) => {
        const steps = await this.repository.listPipelineRunStepsByRunId(run.id);
        return this.toPipelineRunDTO(run, steps);
      })),
    };
  }

  async refreshPipelineStatesByLiteratureIds(literatureIds: string[]): Promise<Map<string, LiteraturePipelineStateRecord>> {
    const uniqueIds = [...new Set(literatureIds)];
    const records = await Promise.all(uniqueIds.map(async (literatureId) => {
      await this.ensurePipelineScaffold(literatureId);
      return this.refreshPipelineState(literatureId);
    }));

    return new Map(records.map((record) => [record.literatureId, record]));
  }

  resolveOverviewStatus(input: OverviewStatusResolverInput) {
    return this.overviewStatusResolver.resolve(input);
  }

  private async executeStage(context: StageExecutionContext): Promise<StageExecutionResult> {
    const literature = await this.repository.findLiteratureById(context.literatureId);
    if (!literature) {
      return {
        status: 'FAILED',
        detail: {},
        errorCode: 'LITERATURE_NOT_FOUND',
        errorMessage: `Literature ${context.literatureId} not found.`,
      };
    }

    const state = await this.refreshPipelineState(context.literatureId);

    if (context.stageCode === 'CITATION_NORMALIZED') {
      return {
        status: 'SUCCEEDED',
        detail: {
          citation_complete: state.citationComplete,
        },
        outputRef: {
          citation_complete: state.citationComplete,
        },
      };
    }

    if (context.stageCode === 'ABSTRACT_READY') {
      return {
        status: 'SUCCEEDED',
        detail: {
          abstract_ready: state.abstractReady,
        },
        outputRef: {
          abstract_ready: state.abstractReady,
        },
      };
    }

    if (context.stageCode === 'KEY_CONTENT_READY') {
      return {
        status: 'SUCCEEDED',
        detail: {
          key_content_ready: state.keyContentReady,
        },
        outputRef: {
          key_content_ready: state.keyContentReady,
        },
      };
    }

    return {
      status: 'SKIPPED',
      detail: {
        stage: context.stageCode,
        reason: 'STAGE_NOT_IMPLEMENTED_IN_V1',
      },
      outputRef: {},
    };
  }

  private async ensurePipelineScaffold(
    literatureId: string,
    dedupStatus: LiteraturePipelineDedupStatus = 'unknown',
  ): Promise<void> {
    await this.assertLiteratureExists(literatureId);
    await this.refreshPipelineState(literatureId, dedupStatus);

    const existingStages = await this.repository.listPipelineStageStatesByLiteratureId(literatureId);
    const stageMap = new Map(existingStages.map((stage) => [stage.stageCode, stage]));
    const now = new Date().toISOString();

    for (const stageCode of PIPELINE_STAGE_CODES) {
      const existing = stageMap.get(stageCode);
      await this.repository.upsertPipelineStageState({
        id: existing?.id ?? crypto.randomUUID(),
        literatureId,
        stageCode,
        status: existing?.status ?? 'NOT_STARTED',
        lastRunId: existing?.lastRunId ?? null,
        detail: existing?.detail ?? {},
        updatedAt: existing?.updatedAt ?? now,
      });
    }
  }

  private async refreshPipelineState(
    literatureId: string,
    dedupStatusOverride?: LiteraturePipelineDedupStatus,
  ): Promise<LiteraturePipelineStateRecord> {
    const literature = await this.repository.findLiteratureById(literatureId);
    if (!literature) {
      throw new AppError(404, 'NOT_FOUND', `Literature ${literatureId} not found.`);
    }

    const sources = await this.repository.listSourcesByLiteratureId(literatureId);
    const signals = this.deriveSignals(literature, sources.map((source) => source.sourceUrl));
    const existing = await this.repository.findPipelineStateByLiteratureId(literatureId);
    const now = new Date().toISOString();

    const upserted = await this.repository.upsertPipelineState({
      id: existing?.id ?? crypto.randomUUID(),
      literatureId,
      citationComplete: signals.citationComplete,
      abstractReady: signals.abstractReady,
      keyContentReady: signals.keyContentReady,
      dedupStatus: dedupStatusOverride ?? existing?.dedupStatus ?? 'unknown',
      updatedAt: now,
    });

    return upserted.record;
  }

  private deriveSignals(literature: LiteratureRecord, sourceUrls: string[]): PipelineSignalState {
    const hasAuthors = literature.authors.some((author) => author.trim().length > 0);
    const hasYear = typeof literature.year === 'number' && Number.isFinite(literature.year);
    const hasLocator = Boolean(
      (literature.doiNormalized ?? '').trim()
      || (literature.arxivId ?? '').trim()
      || sourceUrls.some((url) => url.trim().length > 0),
    );

    return {
      citationComplete: hasAuthors && hasYear && hasLocator,
      abstractReady: Boolean((literature.abstractText ?? '').trim()),
      keyContentReady: Boolean((literature.keyContentDigest ?? '').trim()),
    };
  }

  private async assertLiteratureExists(literatureId: string): Promise<void> {
    const literature = await this.repository.findLiteratureById(literatureId);
    if (!literature) {
      throw new AppError(404, 'NOT_FOUND', `Literature ${literatureId} not found.`);
    }
  }

  private sortStageStates(stageStates: LiteraturePipelineStageStateRecord[]): LiteraturePipelineStageStateRecord[] {
    const order = new Map(PIPELINE_STAGE_CODES.map((code, index) => [code, index]));
    return [...stageStates].sort((left, right) => {
      const leftOrder = order.get(left.stageCode) ?? 999;
      const rightOrder = order.get(right.stageCode) ?? 999;
      return leftOrder - rightOrder;
    });
  }

  private toPipelineStateDTO(record: LiteraturePipelineStateRecord): LiteraturePipelineStateDTO {
    return {
      literature_id: record.literatureId,
      citation_complete: record.citationComplete,
      abstract_ready: record.abstractReady,
      key_content_ready: record.keyContentReady,
      dedup_status: record.dedupStatus,
      updated_at: record.updatedAt,
    };
  }

  private toPipelineRunStepDTO(record: LiteraturePipelineRunStepRecord): LiteraturePipelineRunStepDTO {
    return {
      step_id: record.id,
      stage_code: record.stageCode,
      status: record.status,
      input_ref: record.inputRef,
      output_ref: record.outputRef,
      error_code: record.errorCode,
      error_message: record.errorMessage,
      started_at: record.startedAt,
      finished_at: record.finishedAt,
    };
  }

  private toPipelineRunDTO(
    record: LiteraturePipelineRunRecord,
    steps?: LiteraturePipelineRunStepRecord[],
  ): LiteraturePipelineRunDTO {
    return {
      run_id: record.id,
      literature_id: record.literatureId,
      trigger_source: record.triggerSource,
      status: record.status,
      requested_stages: record.requestedStages,
      error_code: record.errorCode,
      error_message: record.errorMessage,
      created_at: record.createdAt,
      started_at: record.startedAt,
      finished_at: record.finishedAt,
      updated_at: record.updatedAt,
      ...(steps ? { steps: steps.map((step) => this.toPipelineRunStepDTO(step)) } : {}),
    };
  }
}

export { PIPELINE_STAGE_CODES, V1_EXECUTABLE_STAGES };
