import crypto from 'node:crypto';
import type {
  LiteraturePipelineRunRecord,
  LiteraturePipelineRunStatus,
  LiteraturePipelineStageCode,
  LiteraturePipelineStageStatus,
  LiteraturePipelineTriggerSource,
  LiteratureRepository,
} from '../repositories/literature-repository.js';

type StageExecutionResult = {
  status: Extract<LiteraturePipelineStageStatus, 'SUCCEEDED' | 'FAILED' | 'BLOCKED' | 'SKIPPED'>;
  detail?: Record<string, unknown>;
  inputRef?: Record<string, unknown>;
  outputRef?: Record<string, unknown>;
  errorCode?: string | null;
  errorMessage?: string | null;
};

type StageExecutionContext = {
  literatureId: string;
  runId: string;
  stageCode: LiteraturePipelineStageCode;
};

type PipelineOrchestratorCallbacks = {
  executeStage: (context: StageExecutionContext) => Promise<StageExecutionResult>;
  onRunCompleted?: (context: {
    literatureId: string;
    runId: string;
    status: LiteraturePipelineRunStatus;
  }) => Promise<void> | void;
};

export class PipelineOrchestrator {
  private readonly runJobs = new Map<string, Promise<void>>();

  constructor(
    private readonly repository: LiteratureRepository,
    private readonly callbacks: PipelineOrchestratorCallbacks,
  ) {}

  async enqueueRun(input: {
    literatureId: string;
    triggerSource: LiteraturePipelineTriggerSource;
    requestedStages: LiteraturePipelineStageCode[];
  }): Promise<LiteraturePipelineRunRecord> {
    const inFlightRuns = await this.repository.listInFlightPipelineRunsByLiteratureId(input.literatureId);
    if (inFlightRuns.length > 0) {
      const now = new Date().toISOString();
      return this.repository.createPipelineRun({
        id: crypto.randomUUID(),
        literatureId: input.literatureId,
        triggerSource: input.triggerSource,
        status: 'SKIPPED',
        requestedStages: [...input.requestedStages],
        errorCode: 'PIPELINE_RUN_SKIPPED_SINGLE_FLIGHT',
        errorMessage: 'Existing pipeline run is still in-flight.',
        createdAt: now,
        startedAt: now,
        finishedAt: now,
        updatedAt: now,
      });
    }

    const now = new Date().toISOString();
    const run = await this.repository.createPipelineRun({
      id: crypto.randomUUID(),
      literatureId: input.literatureId,
      triggerSource: input.triggerSource,
      status: 'PENDING',
      requestedStages: [...input.requestedStages],
      errorCode: null,
      errorMessage: null,
      createdAt: now,
      startedAt: null,
      finishedAt: null,
      updatedAt: now,
    });

    this.scheduleRun(run.id);
    return run;
  }

  private scheduleRun(runId: string): void {
    if (this.runJobs.has(runId)) {
      return;
    }

    const task = this.processRun(runId)
      .catch(async (error) => {
        await this.failRunOnUnhandledError(runId, error);
      })
      .finally(() => {
        this.runJobs.delete(runId);
      });

    this.runJobs.set(runId, task);
  }

  private async processRun(runId: string): Promise<void> {
    const queued = await this.repository.findPipelineRunById(runId);
    if (!queued) {
      return;
    }

    const startedAt = new Date().toISOString();
    const running = await this.repository.updatePipelineRun(runId, {
      status: 'RUNNING',
      startedAt,
      updatedAt: startedAt,
      errorCode: null,
      errorMessage: null,
    });

    if (running.requestedStages.length === 0) {
      const finishedAt = new Date().toISOString();
      await this.repository.updatePipelineRun(runId, {
        status: 'SKIPPED',
        finishedAt,
        updatedAt: finishedAt,
      });
      await this.notifyRunCompleted(running.literatureId, runId, 'SKIPPED');
      return;
    }

    const terminalStatuses: LiteraturePipelineStageStatus[] = [];
    let firstFailure: { code: string | null; message: string | null } | null = null;

    for (const stageCode of running.requestedStages) {
      const stageQueuedAt = new Date().toISOString();
      await this.repository.upsertPipelineStageState({
        id: crypto.randomUUID(),
        literatureId: running.literatureId,
        stageCode,
        status: 'PENDING',
        lastRunId: running.id,
        detail: {
          queued_at: stageQueuedAt,
        },
        updatedAt: stageQueuedAt,
      });

      const stepId = crypto.randomUUID();
      await this.repository.createPipelineRunStep({
        id: stepId,
        runId: running.id,
        stageCode,
        status: 'RUNNING',
        inputRef: {
          literature_id: running.literatureId,
          run_id: running.id,
          stage_code: stageCode,
        },
        outputRef: {},
        errorCode: null,
        errorMessage: null,
        startedAt: stageQueuedAt,
        finishedAt: null,
      });

      await this.repository.upsertPipelineStageState({
        id: crypto.randomUUID(),
        literatureId: running.literatureId,
        stageCode,
        status: 'RUNNING',
        lastRunId: running.id,
        detail: {
          started_at: stageQueuedAt,
        },
        updatedAt: stageQueuedAt,
      });

      let result: StageExecutionResult;
      try {
        result = await this.callbacks.executeStage({
          literatureId: running.literatureId,
          runId: running.id,
          stageCode,
        });
      } catch (error) {
        result = {
          status: 'FAILED',
          detail: {},
          inputRef: {},
          outputRef: {},
          errorCode: 'STAGE_EXECUTION_FAILED',
          errorMessage: error instanceof Error ? error.message : 'Stage execution failed.',
        };
      }

      const stageFinishedAt = new Date().toISOString();
      await this.repository.updatePipelineRunStep(stepId, {
        status: result.status,
        inputRef: result.inputRef ?? {},
        outputRef: result.outputRef ?? {},
        errorCode: result.errorCode ?? null,
        errorMessage: result.errorMessage ?? null,
        finishedAt: stageFinishedAt,
      });

      await this.repository.upsertPipelineStageState({
        id: crypto.randomUUID(),
        literatureId: running.literatureId,
        stageCode,
        status: result.status,
        lastRunId: running.id,
        detail: result.detail ?? {},
        updatedAt: stageFinishedAt,
      });

      terminalStatuses.push(result.status);
      if (!firstFailure && (result.status === 'FAILED' || result.status === 'BLOCKED')) {
        firstFailure = {
          code: result.errorCode ?? 'PIPELINE_STAGE_FAILED',
          message: result.errorMessage ?? `Stage ${stageCode} failed.`,
        };
      }
    }

    const runStatus = this.resolveRunStatus(terminalStatuses);
    const finishedAt = new Date().toISOString();

    await this.repository.updatePipelineRun(runId, {
      status: runStatus,
      finishedAt,
      updatedAt: finishedAt,
      errorCode: runStatus === 'FAILED' || runStatus === 'PARTIAL' ? (firstFailure?.code ?? null) : null,
      errorMessage: runStatus === 'FAILED' || runStatus === 'PARTIAL' ? (firstFailure?.message ?? null) : null,
    });

    await this.notifyRunCompleted(running.literatureId, runId, runStatus);
  }

  private resolveRunStatus(stageStatuses: LiteraturePipelineStageStatus[]): LiteraturePipelineRunStatus {
    if (stageStatuses.length === 0) {
      return 'SKIPPED';
    }

    const onlySkipped = stageStatuses.every((status) => status === 'SKIPPED');
    if (onlySkipped) {
      return 'SKIPPED';
    }

    const hasFailure = stageStatuses.some((status) => status === 'FAILED' || status === 'BLOCKED');
    const hasSuccess = stageStatuses.some((status) => status === 'SUCCEEDED');
    const hasSkipped = stageStatuses.some((status) => status === 'SKIPPED');

    if (hasFailure && hasSuccess) {
      return 'PARTIAL';
    }

    if (hasFailure && hasSkipped) {
      return 'PARTIAL';
    }

    if (hasFailure) {
      return 'FAILED';
    }

    if (hasSuccess && hasSkipped) {
      return 'PARTIAL';
    }

    return 'SUCCESS';
  }

  private async notifyRunCompleted(
    literatureId: string,
    runId: string,
    status: LiteraturePipelineRunStatus,
  ): Promise<void> {
    if (!this.callbacks.onRunCompleted) {
      return;
    }

    await this.callbacks.onRunCompleted({
      literatureId,
      runId,
      status,
    });
  }

  private async failRunOnUnhandledError(runId: string, error: unknown): Promise<void> {
    try {
      const run = await this.repository.findPipelineRunById(runId);
      if (!run) {
        return;
      }

      if (run.status === 'SUCCESS' || run.status === 'FAILED' || run.status === 'PARTIAL' || run.status === 'SKIPPED') {
        return;
      }

      const finishedAt = new Date().toISOString();
      const message = error instanceof Error ? error.message : 'Pipeline run processing failed.';
      await this.repository.updatePipelineRun(runId, {
        status: 'FAILED',
        errorCode: 'PIPELINE_RUN_PROCESSING_FAILED',
        errorMessage: message,
        finishedAt,
        updatedAt: finishedAt,
      });
      await this.notifyRunCompleted(run.literatureId, run.id, 'FAILED');
    } catch {
      // Do not rethrow from async scheduler error handling.
    }
  }
}

export type { StageExecutionResult, StageExecutionContext };
