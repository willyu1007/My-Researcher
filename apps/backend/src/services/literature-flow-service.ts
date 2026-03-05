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
  LiteratureEmbeddingVersionRecord,
  LiteraturePipelineArtifactRecord,
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

type ChunkRecord = {
  chunk_id: string;
  index: number;
  text: string;
  start_offset: number;
  end_offset: number;
};

type EmbeddingRecord = {
  chunk_id: string;
  index: number;
  vector: number[];
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
      const abstractResult = await this.ensureAbstractReady(literature);
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
      const digestResult = await this.ensureKeyContentReady(literature);
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
      const preprocessed = await this.ensureFulltextPreprocessed(literature);
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
      const chunkArtifact = await this.ensureChunked(context.literatureId, preprocessed);
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
      const embedded = await this.ensureEmbedded(context.literatureId, chunkArtifact);
      const vectorCount = Array.isArray(embedded.payload.vectors)
        ? embedded.payload.vectors.length
        : 0;
      const embeddingVersion = await this.persistEmbeddingVersionSnapshot({
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
      const indexed = await this.ensureIndexed(context.literatureId, chunked, embedded);
      const tokenCount = typeof indexed.payload.token_count === 'number' ? indexed.payload.token_count : 0;
      const embeddingVersion = await this.persistEmbeddingVersionSnapshot({
        literatureId: context.literatureId,
        chunkArtifact: chunked,
        embeddedArtifact: embedded,
        tokenToChunkIds: this.readTokenToChunkIds(indexed),
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

  private async ensureAbstractReady(literature: LiteratureRecord): Promise<{ abstractReady: boolean; generated: boolean }> {
    const existing = (literature.abstractText ?? '').trim();
    if (existing.length > 0) {
      await this.refreshPipelineState(literature.id);
      return { abstractReady: true, generated: false };
    }

    const generatedAbstract = this.generateFallbackAbstract(literature);
    const now = new Date().toISOString();
    await this.repository.updateLiterature({
      ...literature,
      abstractText: generatedAbstract,
      updatedAt: now,
    });
    await this.refreshPipelineState(literature.id);
    return { abstractReady: true, generated: true };
  }

  private async ensureKeyContentReady(literature: LiteratureRecord): Promise<{ keyContentReady: boolean; generated: boolean }> {
    const existing = (literature.keyContentDigest ?? '').trim();
    if (existing.length > 0) {
      await this.refreshPipelineState(literature.id);
      return { keyContentReady: true, generated: false };
    }

    const digest = this.generateFallbackKeyContentDigest(literature);
    const now = new Date().toISOString();
    await this.repository.updateLiterature({
      ...literature,
      keyContentDigest: digest,
      updatedAt: now,
    });
    await this.refreshPipelineState(literature.id);
    return { keyContentReady: true, generated: true };
  }

  private async ensureFulltextPreprocessed(literature: LiteratureRecord): Promise<{ id: string; artifactType: string; textLength: number }> {
    const preprocessedText = this.buildPreprocessedText(literature);
    const artifact = await this.upsertPipelineArtifact({
      literatureId: literature.id,
      stageCode: 'FULLTEXT_PREPROCESSED',
      artifactType: 'PREPROCESSED_TEXT',
      payload: {
        text: preprocessedText,
        generated_at: new Date().toISOString(),
      },
      checksum: this.sha256(preprocessedText),
    });

    return {
      id: artifact.id,
      artifactType: artifact.artifactType,
      textLength: preprocessedText.length,
    };
  }

  private async ensureChunked(
    literatureId: string,
    preprocessed: LiteraturePipelineArtifactRecord,
  ): Promise<LiteraturePipelineArtifactRecord> {
    const text = typeof preprocessed.payload.text === 'string' ? preprocessed.payload.text : '';
    const chunks = this.chunkText(text);

    return this.upsertPipelineArtifact({
      literatureId,
      stageCode: 'CHUNKED',
      artifactType: 'CHUNKS',
      payload: {
        chunks,
        chunk_size: 480,
        overlap: 80,
      },
      checksum: this.sha256(JSON.stringify(chunks)),
    });
  }

  private async ensureEmbedded(
    literatureId: string,
    chunkArtifact: LiteraturePipelineArtifactRecord,
  ): Promise<LiteraturePipelineArtifactRecord> {
    const chunks = this.readChunks(chunkArtifact);
    const embedded = await this.embedChunks(chunks);

    return this.upsertPipelineArtifact({
      literatureId,
      stageCode: 'EMBEDDED',
      artifactType: 'EMBEDDINGS',
      payload: {
        provider: embedded.provider,
        model: embedded.model,
        dimension: embedded.dimension,
        vectors: embedded.vectors,
      },
      checksum: this.sha256(JSON.stringify(embedded.vectors)),
    });
  }

  private async ensureIndexed(
    literatureId: string,
    chunkArtifact: LiteraturePipelineArtifactRecord,
    embeddedArtifact: LiteraturePipelineArtifactRecord,
  ): Promise<LiteraturePipelineArtifactRecord> {
    const chunks = this.readChunks(chunkArtifact);
    const vectors = Array.isArray(embeddedArtifact.payload.vectors)
      ? embeddedArtifact.payload.vectors.length
      : 0;

    const tokenToChunkIds = new Map<string, string[]>();
    for (const chunk of chunks) {
      const tokens = this.tokenize(chunk.text);
      for (const token of tokens) {
        const existing = tokenToChunkIds.get(token) ?? [];
        if (!existing.includes(chunk.chunk_id)) {
          tokenToChunkIds.set(token, [...existing, chunk.chunk_id]);
        }
      }
    }

    const tokenIndexObject = Object.fromEntries(tokenToChunkIds.entries());

    return this.upsertPipelineArtifact({
      literatureId,
      stageCode: 'INDEXED',
      artifactType: 'LOCAL_INDEX',
      payload: {
        index_version: 'local-v1',
        token_count: tokenToChunkIds.size,
        chunk_count: chunks.length,
        vector_count: vectors,
        token_to_chunk_ids: tokenIndexObject,
      },
      checksum: this.sha256(JSON.stringify(tokenIndexObject)),
    });
  }

  private async persistEmbeddingVersionSnapshot(input: {
    literatureId: string;
    chunkArtifact: LiteraturePipelineArtifactRecord;
    embeddedArtifact: LiteraturePipelineArtifactRecord;
    tokenToChunkIds?: Map<string, string[]>;
    activate: boolean;
  }): Promise<LiteratureEmbeddingVersionRecord> {
    const literature = await this.repository.findLiteratureById(input.literatureId);
    if (!literature) {
      throw new AppError(404, 'NOT_FOUND', `Literature ${input.literatureId} not found.`);
    }

    const latestVersion = await this.repository.findLatestEmbeddingVersionByLiteratureId(input.literatureId);
    const now = new Date().toISOString();
    const chunks = this.readChunks(input.chunkArtifact);
    const vectors = this.readEmbeddings(input.embeddedArtifact);
    const vectorByChunkId = new Map(vectors.map((vector) => [vector.chunk_id, vector.vector]));
    const tokenEntries = [...(input.tokenToChunkIds?.entries() ?? [])];
    const provider = typeof input.embeddedArtifact.payload.provider === 'string'
      ? input.embeddedArtifact.payload.provider
      : 'local';
    const model = typeof input.embeddedArtifact.payload.model === 'string'
      ? input.embeddedArtifact.payload.model
      : 'local-hash-embedding-v1';
    const dimension = vectors[0]?.vector.length ?? 0;

    const version = await this.repository.createEmbeddingVersion({
      id: crypto.randomUUID(),
      literatureId: input.literatureId,
      versionNo: (latestVersion?.versionNo ?? 0) + 1,
      provider,
      model,
      dimension,
      chunkCount: chunks.length,
      vectorCount: vectors.length,
      tokenCount: tokenEntries.length,
      createdAt: now,
      updatedAt: now,
    });

    const embeddingChunks = chunks.map((chunk) => ({
      id: crypto.randomUUID(),
      embeddingVersionId: version.id,
      literatureId: input.literatureId,
      chunkId: chunk.chunk_id,
      chunkIndex: chunk.index,
      text: chunk.text,
      startOffset: chunk.start_offset,
      endOffset: chunk.end_offset,
      vector: vectorByChunkId.get(chunk.chunk_id) ?? [],
      createdAt: now,
      updatedAt: now,
    }));
    await this.repository.createEmbeddingChunks(embeddingChunks);

    const tokenIndexes = tokenEntries.map(([token, chunkIds]) => ({
      id: crypto.randomUUID(),
      embeddingVersionId: version.id,
      literatureId: input.literatureId,
      token,
      chunkIds,
      createdAt: now,
      updatedAt: now,
    }));
    if (tokenIndexes.length > 0) {
      await this.repository.createEmbeddingTokenIndexes(tokenIndexes);
    }

    if (input.activate) {
      await this.repository.updateLiterature({
        ...literature,
        activeEmbeddingVersionId: version.id,
        updatedAt: now,
      });
    }

    return version;
  }

  private async upsertPipelineArtifact(input: {
    literatureId: string;
    stageCode: LiteraturePipelineArtifactRecord['stageCode'];
    artifactType: LiteraturePipelineArtifactRecord['artifactType'];
    payload: Record<string, unknown>;
    checksum: string;
  }): Promise<LiteraturePipelineArtifactRecord> {
    const existing = await this.repository.findPipelineArtifact(input.literatureId, input.stageCode, input.artifactType);
    const now = new Date().toISOString();

    const upserted = await this.repository.upsertPipelineArtifact({
      id: existing?.id ?? crypto.randomUUID(),
      literatureId: input.literatureId,
      stageCode: input.stageCode,
      artifactType: input.artifactType,
      payload: input.payload,
      checksum: input.checksum,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });

    return upserted.record;
  }

  private buildPreprocessedText(literature: LiteratureRecord): string {
    const lines = [
      `title: ${literature.title}`,
      `authors: ${literature.authors.join(', ')}`,
      `year: ${literature.year ?? 'unknown'}`,
      `doi: ${literature.doiNormalized ?? 'n/a'}`,
      `arxiv_id: ${literature.arxivId ?? 'n/a'}`,
      `abstract: ${(literature.abstractText ?? '').trim()}`,
      `key_content_digest: ${(literature.keyContentDigest ?? '').trim()}`,
      `tags: ${literature.tags.join(', ')}`,
    ];
    return lines.join('\n').trim();
  }

  private chunkText(text: string): ChunkRecord[] {
    const normalized = text.replace(/\s+/g, ' ').trim();
    if (!normalized) {
      return [];
    }

    const chunkSize = 480;
    const overlap = 80;
    const chunks: ChunkRecord[] = [];
    let start = 0;
    let index = 0;

    while (start < normalized.length) {
      const end = Math.min(normalized.length, start + chunkSize);
      const slice = normalized.slice(start, end).trim();
      if (slice.length > 0) {
        chunks.push({
          chunk_id: `chunk-${String(index + 1).padStart(4, '0')}`,
          index,
          text: slice,
          start_offset: start,
          end_offset: end,
        });
        index += 1;
      }
      if (end >= normalized.length) {
        break;
      }
      start = Math.max(0, end - overlap);
    }

    return chunks;
  }

  private readChunks(chunkArtifact: LiteraturePipelineArtifactRecord): ChunkRecord[] {
    const payloadChunks = chunkArtifact.payload.chunks;
    if (!Array.isArray(payloadChunks)) {
      return [];
    }

    return payloadChunks
      .map((item, index) => {
        if (!item || typeof item !== 'object') {
          return null;
        }
        const row = item as Record<string, unknown>;
        const text = typeof row.text === 'string' ? row.text : '';
        if (!text) {
          return null;
        }
        const chunkId = typeof row.chunk_id === 'string' ? row.chunk_id : `chunk-${String(index + 1).padStart(4, '0')}`;
        return {
          chunk_id: chunkId,
          index: typeof row.index === 'number' ? row.index : index,
          text,
          start_offset: typeof row.start_offset === 'number' ? row.start_offset : 0,
          end_offset: typeof row.end_offset === 'number' ? row.end_offset : text.length,
        } satisfies ChunkRecord;
      })
      .filter((row): row is ChunkRecord => row !== null);
  }

  private readEmbeddings(embeddedArtifact: LiteraturePipelineArtifactRecord): EmbeddingRecord[] {
    const payloadVectors = embeddedArtifact.payload.vectors;
    if (!Array.isArray(payloadVectors)) {
      return [];
    }
    return payloadVectors
      .map((item, index) => {
        if (!item || typeof item !== 'object') {
          return null;
        }
        const row = item as Record<string, unknown>;
        const rawVector = Array.isArray(row.vector)
          ? row.vector.map((value) => Number(value)).filter((value) => Number.isFinite(value))
          : [];
        const chunkId = typeof row.chunk_id === 'string' ? row.chunk_id : `chunk-${String(index + 1).padStart(4, '0')}`;
        const chunkIndex = typeof row.index === 'number' ? row.index : index;
        return {
          chunk_id: chunkId,
          index: chunkIndex,
          vector: rawVector,
        } satisfies EmbeddingRecord;
      })
      .filter((row): row is EmbeddingRecord => row !== null);
  }

  private readTokenToChunkIds(indexedArtifact: LiteraturePipelineArtifactRecord): Map<string, string[]> {
    const payload = indexedArtifact.payload.token_to_chunk_ids;
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return new Map();
    }
    return new Map(
      Object.entries(payload).flatMap(([token, rawChunkIds]) => {
        if (!Array.isArray(rawChunkIds)) {
          return [];
        }
        const chunkIds = rawChunkIds
          .map((value) => (typeof value === 'string' ? value : null))
          .filter((value): value is string => value !== null);
        return chunkIds.length > 0 ? [[token, [...new Set(chunkIds)]]] : [];
      }),
    );
  }

  private async embedChunks(chunks: ChunkRecord[]): Promise<{
    provider: 'external' | 'local';
    model: string;
    dimension: number;
    vectors: EmbeddingRecord[];
  }> {
    const externalConfig = this.resolveExternalEmbeddingConfig();
    if (externalConfig) {
      try {
        const externalVectors = await this.embedChunksViaExternalService(chunks, externalConfig);
        return {
          provider: 'external',
          model: externalConfig.model,
          dimension: externalVectors[0]?.vector.length ?? 0,
          vectors: externalVectors,
        };
      } catch {
        // Fallback to local deterministic embeddings.
      }
    }

    const vectors = chunks.map((chunk) => ({
      chunk_id: chunk.chunk_id,
      index: chunk.index,
      vector: this.buildLocalEmbeddingVector(chunk.text),
    }));

    return {
      provider: 'local',
      model: 'local-hash-embedding-v1',
      dimension: vectors[0]?.vector.length ?? 0,
      vectors,
    };
  }

  private resolveExternalEmbeddingConfig(): { endpoint: string; apiKey: string | null; model: string } | null {
    const endpoint = (process.env.LITERATURE_PIPELINE_EMBEDDING_URL ?? '').trim();
    if (!endpoint) {
      return null;
    }
    const apiKey = (process.env.LITERATURE_PIPELINE_EMBEDDING_API_KEY ?? '').trim() || null;
    const model = (process.env.LITERATURE_PIPELINE_EMBEDDING_MODEL ?? 'text-embedding-v1').trim() || 'text-embedding-v1';
    return { endpoint, apiKey, model };
  }

  private async embedChunksViaExternalService(
    chunks: ChunkRecord[],
    config: { endpoint: string; apiKey: string | null; model: string },
  ): Promise<EmbeddingRecord[]> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (config.apiKey) {
      headers.Authorization = `Bearer ${config.apiKey}`;
    }

    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: config.model,
        inputs: chunks.map((chunk) => chunk.text),
      }),
    });

    if (!response.ok) {
      throw new Error(`External embedding request failed: ${response.status}`);
    }

    const payload = (await response.json()) as Record<string, unknown>;

    let rawVectors: number[][] = [];
    if (Array.isArray(payload.vectors)) {
      rawVectors = payload.vectors
        .map((item) => (Array.isArray(item) ? item.map((value) => Number(value)).filter((v) => Number.isFinite(v)) : null))
        .filter((item): item is number[] => Array.isArray(item));
    } else if (Array.isArray(payload.data)) {
      rawVectors = payload.data
        .map((row) => {
          if (!row || typeof row !== 'object') {
            return null;
          }
          const embedding = (row as Record<string, unknown>).embedding;
          if (!Array.isArray(embedding)) {
            return null;
          }
          const vector = embedding.map((value) => Number(value)).filter((v) => Number.isFinite(v));
          return vector.length > 0 ? vector : null;
        })
        .filter((item): item is number[] => item !== null);
    }

    if (rawVectors.length !== chunks.length || rawVectors.some((vector) => vector.length === 0)) {
      throw new Error('External embedding response shape mismatch.');
    }

    return chunks.map((chunk, index) => ({
      chunk_id: chunk.chunk_id,
      index: chunk.index,
      vector: rawVectors[index]!,
    }));
  }

  private buildLocalEmbeddingVector(text: string): number[] {
    const digest = crypto.createHash('sha256').update(text).digest();
    const dimension = 16;
    return Array.from({ length: dimension }, (_, index) => {
      const byte = digest[index % digest.length] ?? 0;
      const normalized = (byte / 255) * 2 - 1;
      return Number(normalized.toFixed(6));
    });
  }

  private tokenize(text: string): string[] {
    return [...new Set(
      (text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [])
        .filter((token) => token.length > 1),
    )];
  }

  private generateFallbackAbstract(literature: LiteratureRecord): string {
    const authorSegment = literature.authors.length > 0 ? literature.authors.slice(0, 3).join(', ') : 'unknown authors';
    const yearSegment = literature.year ?? 'unknown year';
    return `Auto-generated abstract placeholder for "${literature.title}" (${yearSegment}) by ${authorSegment}.`;
  }

  private generateFallbackKeyContentDigest(literature: LiteratureRecord): string {
    const abstractText = (literature.abstractText ?? '').replace(/\s+/g, ' ').trim();
    if (!abstractText) {
      return `Key content placeholder for ${literature.title}.`;
    }
    return abstractText.length <= 280 ? abstractText : `${abstractText.slice(0, 277)}...`;
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

  private sha256(text: string): string {
    return crypto.createHash('sha256').update(text).digest('hex');
  }
}

export { PIPELINE_STAGE_CODES, DEFAULT_EXECUTABLE_STAGES };
