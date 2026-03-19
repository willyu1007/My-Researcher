import crypto from 'node:crypto';
import type {
  GetLiteraturePipelineResponse,
  LiteraturePipelineActionReasonCode,
  LiteraturePipelineActionSet,
  LiteraturePipelineRunDTO,
  LiteraturePipelineRunStepDTO,
  LiteraturePipelineStageCode,
  LiteraturePipelineStageStatus,
  LiteraturePipelineStageStatusMap,
  LiteraturePipelineStateDTO,
  LiteraturePipelineTriggerSource,
  ListLiteraturePipelineRunsResponse,
  RightsClass,
  TopicScopeStatus,
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
import { LiteratureFlowArtifactRuntime } from './literature-flow/literature-flow-artifact-runtime.js';
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

const DEFAULT_EXECUTABLE_STAGES: LiteraturePipelineStageCode[] = [...PIPELINE_STAGE_CODES];

const DEEP_PIPELINE_STAGES: LiteraturePipelineStageCode[] = [
  'FULLTEXT_PREPROCESSED',
  'CHUNKED',
  'EMBEDDED',
  'INDEXED',
];

const PIPELINE_ACTION_REASON_MESSAGES: Record<LiteraturePipelineActionReasonCode, string> = {
  READY: '可以执行。',
  EXCLUDED_BY_SCOPE: '当前文献已被排除，不可执行该动作。',
  RIGHTS_RESTRICTED: 'RESTRICTED 文献禁止全文预处理与向量化。',
  USER_AUTH_DISABLED: 'USER_AUTH 文献需开启全局开关后才可执行。',
  PREREQUISITE_NOT_READY: '前置阶段尚未就绪。',
  STAGE_ALREADY_READY: '目标阶段已完成。',
  RUN_IN_FLIGHT: '相关阶段正在执行，请稍后重试。',
};

const PIPELINE_STAGE_ORDER = new Map(PIPELINE_STAGE_CODES.map((code, index) => [code, index]));

type PipelineSignalState = {
  citationComplete: boolean;
  abstractReady: boolean;
  keyContentReady: boolean;
};

type ExtendedPipelineSignalState = PipelineSignalState & {
  fulltextPreprocessed: boolean;
  chunked: boolean;
  embedded: boolean;
  indexed: boolean;
};

export class LiteratureFlowService {
  private readonly overviewStatusResolver = new OverviewStatusResolver();
  private readonly pipelineOrchestrator: PipelineOrchestrator;
  private readonly artifactRuntime: LiteratureFlowArtifactRuntime;

  constructor(private readonly repository: LiteratureRepository) {
    this.artifactRuntime = new LiteratureFlowArtifactRuntime(repository, {
      refreshPipelineState: async (literatureId) => this.refreshPipelineState(literatureId),
    });
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
      requestedStages: input.requestedStages ?? [...DEFAULT_EXECUTABLE_STAGES],
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
      requestedStages: requestedStages?.length ? requestedStages : [...DEFAULT_EXECUTABLE_STAGES],
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
      state: this.toPipelineStateDTO(state, stageStates),
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
    if (uniqueIds.length === 0) {
      return new Map();
    }

    const existingStates = await this.repository.listPipelineStatesByLiteratureIds(uniqueIds);
    const stateByLiteratureId = new Map(existingStates.map((record) => [record.literatureId, record]));

    const missingLiteratureIds = uniqueIds.filter((literatureId) => !stateByLiteratureId.has(literatureId));
    if (missingLiteratureIds.length > 0) {
      const initializedStates = await Promise.all(
        missingLiteratureIds.map(async (literatureId) => {
          await this.ensurePipelineScaffold(literatureId);
          const state = await this.repository.findPipelineStateByLiteratureId(literatureId);
          if (state) {
            return state;
          }
          return this.refreshPipelineState(literatureId);
        }),
      );

      for (const record of initializedStates) {
        stateByLiteratureId.set(record.literatureId, record);
      }
    }

    return stateByLiteratureId;
  }

  resolveOverviewStatus(input: OverviewStatusResolverInput) {
    return this.overviewStatusResolver.resolve(input);
  }

  buildPipelineStateDTO(
    stateRecord: LiteraturePipelineStateRecord,
    stageStates: LiteraturePipelineStageStateRecord[],
  ): LiteraturePipelineStateDTO {
    return this.toPipelineStateDTO(stateRecord, stageStates);
  }

  buildStageStatusMap(stageStates: LiteraturePipelineStageStateRecord[]): LiteraturePipelineStageStatusMap {
    const map = Object.fromEntries(
      PIPELINE_STAGE_CODES.map((stageCode) => [stageCode, 'NOT_STARTED' as LiteraturePipelineStageStatus]),
    ) as LiteraturePipelineStageStatusMap;

    for (const stageState of stageStates) {
      map[stageState.stageCode] = stageState.status;
    }

    return map;
  }

  buildOverviewPipelineActions(input: {
    topicScopeStatus: TopicScopeStatus | null;
    rightsClass: RightsClass;
    pipelineState: LiteraturePipelineStateDTO;
    stageStatusMap: LiteraturePipelineStageStatusMap;
  }): LiteraturePipelineActionSet {
    const hasInFlight = (stageCodes: LiteraturePipelineStageCode[]) =>
      stageCodes.some((stageCode) => {
        const status = input.stageStatusMap[stageCode];
        return status === 'PENDING' || status === 'RUNNING';
      });

    const resolveRightsGate = ():
      | { ok: true }
      | { ok: false; reasonCode: Extract<LiteraturePipelineActionReasonCode, 'RIGHTS_RESTRICTED' | 'USER_AUTH_DISABLED'> } => {
      if (input.rightsClass === 'RESTRICTED') {
        return { ok: false, reasonCode: 'RIGHTS_RESTRICTED' };
      }
      if (input.rightsClass === 'USER_AUTH' && !this.isUserAuthPipelineEnabled()) {
        return { ok: false, reasonCode: 'USER_AUTH_DISABLED' };
      }
      return { ok: true };
    };

    const toAvailability = (
      actionCode: LiteraturePipelineActionSet['extract_abstract']['action_code'],
      requestedStages: LiteraturePipelineStageCode[],
      options: {
        requiresScope?: boolean;
        requiresRightsGate?: boolean;
        prerequisite?: boolean;
        alreadyReady?: boolean;
      },
    ) => {
      if (options.requiresScope !== false && input.topicScopeStatus === 'excluded') {
        return this.buildActionAvailability(actionCode, requestedStages, 'EXCLUDED_BY_SCOPE');
      }

      if (hasInFlight(requestedStages)) {
        return this.buildActionAvailability(actionCode, requestedStages, 'RUN_IN_FLIGHT');
      }

      if (options.requiresRightsGate) {
        const rightsGate = resolveRightsGate();
        if (!rightsGate.ok) {
          return this.buildActionAvailability(actionCode, requestedStages, rightsGate.reasonCode);
        }
      }

      if (options.prerequisite === false) {
        return this.buildActionAvailability(actionCode, requestedStages, 'PREREQUISITE_NOT_READY');
      }

      if (options.alreadyReady) {
        return this.buildActionAvailability(actionCode, requestedStages, 'STAGE_ALREADY_READY');
      }

      return this.buildActionAvailability(actionCode, requestedStages, 'READY');
    };

    return {
      extract_abstract: toAvailability('EXTRACT_ABSTRACT', ['ABSTRACT_READY'], {
        alreadyReady: input.pipelineState.abstract_ready,
      }),
      preprocess_fulltext: toAvailability('PREPROCESS_FULLTEXT', ['FULLTEXT_PREPROCESSED'], {
        requiresRightsGate: true,
        prerequisite: input.pipelineState.abstract_ready,
        alreadyReady: input.pipelineState.fulltext_preprocessed,
      }),
      vectorize: toAvailability('VECTORIZE', ['CHUNKED', 'EMBEDDED', 'INDEXED'], {
        requiresRightsGate: true,
        prerequisite: input.pipelineState.fulltext_preprocessed,
        alreadyReady: input.pipelineState.chunked && input.pipelineState.embedded && input.pipelineState.indexed,
      }),
    };
  }

  private async executeStage(context: StageExecutionContext): Promise<StageExecutionResult> {
    const literature = await this.repository.findLiteratureById(context.literatureId);
    if (!literature) {
      return this.failedResult('LITERATURE_NOT_FOUND', `Literature ${context.literatureId} not found.`);
    }

    const state = await this.refreshPipelineState(context.literatureId);

    if (context.stageCode === 'CITATION_NORMALIZED') {
      return {
        status: 'SUCCEEDED',
        detail: {
          stage_code: context.stageCode,
          citation_complete: state.citationComplete,
        },
        outputRef: {
          citation_complete: state.citationComplete,
        },
      };
    }

    if (context.stageCode === 'ABSTRACT_READY') {
      const abstractResult = await this.artifactRuntime.ensureAbstractReady(literature);
      return {
        status: 'SUCCEEDED',
        detail: {
          stage_code: context.stageCode,
          abstract_ready: abstractResult.abstractReady,
          generated: abstractResult.generated,
        },
        outputRef: {
          abstract_ready: abstractResult.abstractReady,
          generated: abstractResult.generated,
        },
      };
    }

    if (context.stageCode === 'KEY_CONTENT_READY') {
      if (!state.abstractReady) {
        return this.blockedResult(context.stageCode, 'PREREQUISITE_NOT_READY', 'ABSTRACT_READY stage is required first.');
      }
      const digestResult = await this.artifactRuntime.ensureKeyContentReady(literature);
      return {
        status: 'SUCCEEDED',
        detail: {
          stage_code: context.stageCode,
          key_content_ready: digestResult.keyContentReady,
          generated: digestResult.generated,
        },
        outputRef: {
          key_content_ready: digestResult.keyContentReady,
          generated: digestResult.generated,
        },
      };
    }

    if (DEEP_PIPELINE_STAGES.includes(context.stageCode)) {
      const rightsGate = this.checkDeepStageRights(literature.rightsClass);
      if (!rightsGate.ok) {
        return this.blockedResult(context.stageCode, rightsGate.reasonCode, rightsGate.reasonMessage);
      }
    }

    if (context.stageCode === 'FULLTEXT_PREPROCESSED') {
      if (!state.abstractReady) {
        return this.blockedResult(context.stageCode, 'PREREQUISITE_NOT_READY', 'ABSTRACT_READY stage is required first.');
      }
      const preprocessed = await this.artifactRuntime.ensureFulltextPreprocessed(literature);
      return {
        status: 'SUCCEEDED',
        detail: {
          stage_code: context.stageCode,
          artifact_type: preprocessed.artifactType,
          text_length: preprocessed.textLength,
        },
        outputRef: {
          artifact_id: preprocessed.id,
          artifact_type: preprocessed.artifactType,
        },
      };
    }

    if (context.stageCode === 'CHUNKED') {
      const preprocessed = await this.repository.findPipelineArtifact(
        context.literatureId,
        'FULLTEXT_PREPROCESSED',
        'PREPROCESSED_TEXT',
      );
      if (!preprocessed) {
        return this.blockedResult(context.stageCode, 'PREREQUISITE_NOT_READY', 'FULLTEXT_PREPROCESSED artifact is required first.');
      }
      const chunkArtifact = await this.artifactRuntime.ensureChunked(context.literatureId, preprocessed);
      const chunkCount = Array.isArray(chunkArtifact.payload.chunks)
        ? chunkArtifact.payload.chunks.length
        : 0;
      return {
        status: 'SUCCEEDED',
        detail: {
          stage_code: context.stageCode,
          chunk_count: chunkCount,
        },
        outputRef: {
          artifact_id: chunkArtifact.id,
          chunk_count: chunkCount,
        },
      };
    }

    if (context.stageCode === 'EMBEDDED') {
      const chunkArtifact = await this.repository.findPipelineArtifact(context.literatureId, 'CHUNKED', 'CHUNKS');
      if (!chunkArtifact) {
        return this.blockedResult(context.stageCode, 'PREREQUISITE_NOT_READY', 'CHUNKED artifact is required first.');
      }
      const embedded = await this.artifactRuntime.ensureEmbedded(context.literatureId, chunkArtifact);
      const vectorCount = Array.isArray(embedded.payload.vectors)
        ? embedded.payload.vectors.length
        : 0;
      const embeddingVersion = await this.artifactRuntime.persistEmbeddingVersionSnapshot({
        literatureId: context.literatureId,
        chunkArtifact,
        embeddedArtifact: embedded,
        activate: false,
      });
      return {
        status: 'SUCCEEDED',
        detail: {
          stage_code: context.stageCode,
          embedding_provider: embedded.payload.provider,
          vector_count: vectorCount,
          embedding_version_id: embeddingVersion.id,
          activated: false,
        },
        outputRef: {
          artifact_id: embedded.id,
          vector_count: vectorCount,
          embedding_provider: embedded.payload.provider,
          embedding_version_id: embeddingVersion.id,
          activated: false,
        },
      };
    }

    if (context.stageCode === 'INDEXED') {
      const embedded = await this.repository.findPipelineArtifact(context.literatureId, 'EMBEDDED', 'EMBEDDINGS');
      const chunked = await this.repository.findPipelineArtifact(context.literatureId, 'CHUNKED', 'CHUNKS');
      if (!embedded || !chunked) {
        return this.blockedResult(context.stageCode, 'PREREQUISITE_NOT_READY', 'EMBEDDED and CHUNKED artifacts are required first.');
      }
      const indexed = await this.artifactRuntime.ensureIndexed(context.literatureId, chunked, embedded);
      const tokenCount = typeof indexed.payload.token_count === 'number' ? indexed.payload.token_count : 0;
      const embeddingVersion = await this.artifactRuntime.persistEmbeddingVersionSnapshot({
        literatureId: context.literatureId,
        chunkArtifact: chunked,
        embeddedArtifact: embedded,
        tokenToChunkIds: this.artifactRuntime.readTokenToChunkIds(indexed),
        activate: true,
      });
      return {
        status: 'SUCCEEDED',
        detail: {
          stage_code: context.stageCode,
          token_count: tokenCount,
          embedding_version_id: embeddingVersion.id,
          activated: true,
        },
        outputRef: {
          artifact_id: indexed.id,
          token_count: tokenCount,
          embedding_version_id: embeddingVersion.id,
          activated: true,
        },
      };
    }

    return this.blockedResult(context.stageCode, 'PREREQUISITE_NOT_READY', 'Unsupported stage transition.');
  }

  private async ensurePipelineScaffold(
    literatureId: string,
    dedupStatus: LiteraturePipelineDedupStatus = 'unknown',
  ): Promise<void> {
    await this.assertLiteratureExists(literatureId);
    const existingState = await this.repository.findPipelineStateByLiteratureId(literatureId);
    const shouldRefreshState = !existingState || dedupStatus !== 'unknown';
    if (shouldRefreshState) {
      await this.refreshPipelineState(literatureId, dedupStatus);
    }

    const existingStages = await this.repository.listPipelineStageStatesByLiteratureId(literatureId);
    const stageMap = new Map(existingStages.map((stage) => [stage.stageCode, stage]));
    const now = new Date().toISOString();

    for (const stageCode of PIPELINE_STAGE_CODES) {
      const existing = stageMap.get(stageCode);
      if (existing) {
        continue;
      }
      await this.repository.upsertPipelineStageState({
        id: crypto.randomUUID(),
        literatureId,
        stageCode,
        status: 'NOT_STARTED',
        lastRunId: null,
        detail: {},
        updatedAt: now,
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

  private deriveExtendedSignals(
    baseState: LiteraturePipelineStateRecord,
    stageStatusMap: LiteraturePipelineStageStatusMap,
  ): ExtendedPipelineSignalState {
    return {
      citationComplete: baseState.citationComplete,
      abstractReady: baseState.abstractReady,
      keyContentReady: baseState.keyContentReady,
      fulltextPreprocessed: stageStatusMap.FULLTEXT_PREPROCESSED === 'SUCCEEDED',
      chunked: stageStatusMap.CHUNKED === 'SUCCEEDED',
      embedded: stageStatusMap.EMBEDDED === 'SUCCEEDED',
      indexed: stageStatusMap.INDEXED === 'SUCCEEDED',
    };
  }

  private async assertLiteratureExists(literatureId: string): Promise<void> {
    const literature = await this.repository.findLiteratureById(literatureId);
    if (!literature) {
      throw new AppError(404, 'NOT_FOUND', `Literature ${literatureId} not found.`);
    }
  }

  private sortStageStates(stageStates: LiteraturePipelineStageStateRecord[]): LiteraturePipelineStageStateRecord[] {
    return [...stageStates].sort((left, right) => {
      const leftOrder = PIPELINE_STAGE_ORDER.get(left.stageCode) ?? 999;
      const rightOrder = PIPELINE_STAGE_ORDER.get(right.stageCode) ?? 999;
      return leftOrder - rightOrder;
    });
  }

  private toPipelineStateDTO(
    record: LiteraturePipelineStateRecord,
    stageStates: LiteraturePipelineStageStateRecord[],
  ): LiteraturePipelineStateDTO {
    const stageStatusMap = this.buildStageStatusMap(stageStates);
    const extended = this.deriveExtendedSignals(record, stageStatusMap);

    return {
      literature_id: record.literatureId,
      citation_complete: extended.citationComplete,
      abstract_ready: extended.abstractReady,
      key_content_ready: extended.keyContentReady,
      fulltext_preprocessed: extended.fulltextPreprocessed,
      chunked: extended.chunked,
      embedded: extended.embedded,
      indexed: extended.indexed,
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

  private buildActionAvailability(
    actionCode: LiteraturePipelineActionSet['extract_abstract']['action_code'],
    requestedStages: LiteraturePipelineStageCode[],
    reasonCode: LiteraturePipelineActionReasonCode,
  ): LiteraturePipelineActionSet['extract_abstract'] {
    return {
      action_code: actionCode,
      enabled: reasonCode === 'READY',
      reason_code: reasonCode,
      reason_message: PIPELINE_ACTION_REASON_MESSAGES[reasonCode],
      requested_stages: requestedStages,
    };
  }

  private isUserAuthPipelineEnabled(): boolean {
    const raw = (process.env.LITERATURE_USER_AUTH_PIPELINE_ENABLED ?? 'false').trim().toLowerCase();
    return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on';
  }

  private checkDeepStageRights(rightsClass: RightsClass):
    | { ok: true }
    | { ok: false; reasonCode: 'RIGHTS_RESTRICTED' | 'USER_AUTH_DISABLED'; reasonMessage: string } {
    if (rightsClass === 'RESTRICTED') {
      return {
        ok: false,
        reasonCode: 'RIGHTS_RESTRICTED',
        reasonMessage: PIPELINE_ACTION_REASON_MESSAGES.RIGHTS_RESTRICTED,
      };
    }
    if (rightsClass === 'USER_AUTH' && !this.isUserAuthPipelineEnabled()) {
      return {
        ok: false,
        reasonCode: 'USER_AUTH_DISABLED',
        reasonMessage: PIPELINE_ACTION_REASON_MESSAGES.USER_AUTH_DISABLED,
      };
    }
    return { ok: true };
  }

  private failedResult(errorCode: string, errorMessage: string): StageExecutionResult {
    return {
      status: 'FAILED',
      detail: {
        error_code: errorCode,
        error_message: errorMessage,
      },
      inputRef: {},
      outputRef: {},
      errorCode,
      errorMessage,
    };
  }

  private blockedResult(
    stageCode: LiteraturePipelineStageCode,
    reasonCode: string,
    reasonMessage: string,
  ): StageExecutionResult {
    return {
      status: 'BLOCKED',
      detail: {
        stage_code: stageCode,
        reason_code: reasonCode,
        reason_message: reasonMessage,
      },
      inputRef: {},
      outputRef: {},
      errorCode: reasonCode,
      errorMessage: reasonMessage,
    };
  }
}

export { PIPELINE_STAGE_CODES, DEFAULT_EXECUTABLE_STAGES };
