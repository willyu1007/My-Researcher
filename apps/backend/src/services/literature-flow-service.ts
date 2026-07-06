import crypto from 'node:crypto';
import { LITERATURE_KEY_CONTENT_CATEGORY_KEYS } from '@paper-engineering-assistant/shared/research-lifecycle/literature-contracts';
import type {
  DryRunImportLiteratureKeyContentDossierResponse,
  GetLiteratureContentProcessingResponse,
  ImportLiteratureKeyContentDossierRequest,
  ImportLiteratureKeyContentDossierResponse,
  LiteratureContentProcessingActionReasonCode,
  LiteratureContentProcessingActionSet,
  LiteratureContentProcessingRunDTO,
  LiteratureContentProcessingRunStepDTO,
  LiteratureContentProcessingStageCode,
  LiteratureContentProcessingStageStatus,
  LiteratureContentProcessingStageStatusMap,
  LiteratureContentProcessingTriggerSource,
  LiteratureContentProcessingStateDTO,
  LiteratureKeyContentCategoryKey,
  LiteratureKeyContentCurationBundleResponse,
  LiteratureKeyContentDossierPayload,
  LiteratureKeyContentReadyMethod,
  LiteratureKeyContentSourceRef,
  ListLiteratureContentProcessingRunsResponse,
  RightsClass,
  TopicScopeStatus,
} from '@paper-engineering-assistant/shared/research-lifecycle/literature-contracts';
import { AppError } from '../errors/app-error.js';
import type {
  LiteraturePipelineDedupStatus,
  LiteraturePipelineRunRecord,
  LiteraturePipelineRunStepRecord,
  LiteraturePipelineStageStateRecord,
  LiteraturePipelineStateRecord,
  LiteratureFulltextAnchorRecord,
  LiteratureFulltextDocumentRecord,
  LiteratureFulltextParagraphRecord,
  LiteratureFulltextSectionRecord,
  LiteratureRecord,
  LiteratureRepository,
} from '../repositories/literature-repository.js';
import { sha256Text, stableStringify } from './literature-content-processing-utils.js';
import { LiteratureFlowArtifactRuntime } from './literature-flow/literature-flow-artifact-runtime.js';
import type { LiteratureContentProcessingSettingsService } from './literature-content-processing-settings-service.js';
import { LiteratureAbstractReadinessService } from './literature-abstract-readiness-service.js';
import { LiteratureCitationNormalizationService } from './literature-citation-normalization-service.js';
import type { BackendLlmGateway } from './llm-gateway.js';
import { LiteratureEvidenceActivationService } from './literature-evidence-activation-service.js';
import { OverviewStatusResolver, type OverviewStatusResolverInput } from './overview-status-resolver.js';
import { PipelineOrchestrator, type StageExecutionContext, type StageExecutionResult } from './pipeline-orchestrator.js';

const PIPELINE_STAGE_CODES: LiteratureContentProcessingStageCode[] = [
  'CITATION_NORMALIZED',
  'ABSTRACT_READY',
  'FULLTEXT_PREPROCESSED',
  'KEY_CONTENT_READY',
  'CHUNKED',
  'EMBEDDED',
  'INDEXED',
];

const DEFAULT_EXECUTABLE_STAGES: LiteratureContentProcessingStageCode[] = [...PIPELINE_STAGE_CODES];

const DEEP_PIPELINE_STAGES: LiteratureContentProcessingStageCode[] = [
  'FULLTEXT_PREPROCESSED',
  'KEY_CONTENT_READY',
  'CHUNKED',
  'EMBEDDED',
  'INDEXED',
];

const PIPELINE_ACTION_REASON_MESSAGES: Record<LiteratureContentProcessingActionReasonCode, string> = {
  READY: '可以执行。',
  EXCLUDED_BY_SCOPE: '当前文献已被排除，不可执行该动作。',
  RIGHTS_RESTRICTED: 'RESTRICTED 文献禁止全文预处理与嵌入/索引。',
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

type KeyContentCurationFulltextBundle = {
  document: LiteratureFulltextDocumentRecord;
  sections: LiteratureFulltextSectionRecord[];
  paragraphs: LiteratureFulltextParagraphRecord[];
  anchors: LiteratureFulltextAnchorRecord[];
};

type KeyContentCurationValidationContext = {
  documentChecksum: string;
  abstractProfileId: string | null;
  sectionIds: Set<string>;
  paragraphIds: Set<string>;
  anchorIds: Set<string>;
  anchorLabels: Map<string, string>;
};

type RepairedKeyContentSourceRef = {
  ref: LiteratureKeyContentSourceRef;
  repaired: boolean;
  strategy: string | null;
};

export class LiteratureFlowService {
  private readonly overviewStatusResolver = new OverviewStatusResolver();
  private readonly pipelineOrchestrator: PipelineOrchestrator;
  private readonly artifactRuntime: LiteratureFlowArtifactRuntime;
  private readonly citationNormalizationService: LiteratureCitationNormalizationService;
  private readonly abstractReadinessService: LiteratureAbstractReadinessService;

  constructor(
    private readonly repository: LiteratureRepository,
    private readonly settingsService?: LiteratureContentProcessingSettingsService,
    llmGateway?: BackendLlmGateway,
    private readonly evidenceActivationService = new LiteratureEvidenceActivationService(repository),
  ) {
    this.citationNormalizationService = new LiteratureCitationNormalizationService(repository);
    this.abstractReadinessService = new LiteratureAbstractReadinessService(repository);
    this.artifactRuntime = new LiteratureFlowArtifactRuntime(repository, {
      refreshPipelineState: async (literatureId) => this.refreshPipelineState(literatureId),
      settingsService: this.settingsService,
      llmGateway,
    });
    this.pipelineOrchestrator = new PipelineOrchestrator(repository, {
      executeStage: async (context) => this.executeStage(context),
      onRunCompleted: async ({ literatureId }) => {
        await this.refreshPipelineState(literatureId);
      },
    });
  }

  // T-130 W-01: startup orphan recovery — closes in-flight pipeline runs left behind by a
  // previous process so the single-flight guard cannot permanently block a literature record.
  async recoverOrphanedPipelineRuns(): Promise<{ recoveredRunIds: string[] }> {
    return this.pipelineOrchestrator.recoverOrphanedRuns();
  }

  async recordCollectionUpserted(input: {
    literatureId: string;
    dedupStatus?: LiteraturePipelineDedupStatus;
  }): Promise<LiteratureContentProcessingStateDTO> {
    const state = await this.refreshPipelineState(input.literatureId, input.dedupStatus ?? 'unknown');
    const stageStates = await this.repository.listPipelineStageStatesByLiteratureId(input.literatureId);
    return this.toPipelineStateDTO(state, stageStates);
  }

  async refreshContentProcessingState(literatureId: string): Promise<LiteratureContentProcessingStateDTO> {
    const state = await this.refreshPipelineState(literatureId);
    const stageStates = await this.repository.listPipelineStageStatesByLiteratureId(literatureId);
    return this.toPipelineStateDTO(state, stageStates);
  }

  async markStagesStale(input: {
    literatureId: string;
    stages: LiteratureContentProcessingStageCode[];
    reasonCode: string;
    reasonMessage: string;
  }): Promise<void> {
    await this.ensurePipelineScaffold(input.literatureId);
    const uniqueStages = this.sortStageCodes([...new Set(input.stages)]);
    const existingStages = await this.repository.listPipelineStageStatesByLiteratureId(input.literatureId);
    const stageByCode = new Map(existingStages.map((stage) => [stage.stageCode, stage]));
    const now = new Date().toISOString();
    for (const stageCode of uniqueStages) {
      const existing = stageByCode.get(stageCode);
      if (!existing || (existing.status !== 'SUCCEEDED' && existing.status !== 'STALE')) {
        continue;
      }
      await this.repository.upsertPipelineStageState({
        ...existing,
        status: 'STALE',
        detail: {
          ...existing.detail,
          reason_code: input.reasonCode,
          reason_message: input.reasonMessage,
          stale_at: now,
        },
        updatedAt: now,
      });
    }
  }

  async triggerContentProcessingRun(
    literatureId: string,
    requestedStages?: LiteratureContentProcessingStageCode[],
    triggerSource: LiteratureContentProcessingTriggerSource = 'CONTENT_PROCESSING_ACTION',
  ): Promise<LiteratureContentProcessingRunDTO> {
    await this.ensurePipelineScaffold(literatureId);
    const stages = requestedStages?.length
      ? this.sortStageCodes([...new Set(requestedStages)])
      : [...DEFAULT_EXECUTABLE_STAGES];
    const run = await this.pipelineOrchestrator.enqueueRun({
      literatureId,
      triggerSource,
      requestedStages: stages,
    });
    return this.toPipelineRunDTO(run);
  }

  async getContentProcessing(literatureId: string): Promise<GetLiteratureContentProcessingResponse> {
    await this.ensurePipelineScaffold(literatureId);
    const state = await this.repository.findPipelineStateByLiteratureId(literatureId);
    if (!state) {
      throw new AppError(500, 'INTERNAL_ERROR', `Content processing state for ${literatureId} was not initialized.`);
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

  async getKeyContentCurationBundle(literatureId: string): Promise<LiteratureKeyContentCurationBundleResponse> {
    await this.ensurePipelineScaffold(literatureId);
    await this.assertKeyContentCurationPrerequisites(literatureId);
    const literature = await this.assertLiteratureExists(literatureId);
    const bundle = await this.loadLatestReadyFulltextBundle(literatureId);
    if (!bundle) {
      throw new AppError(409, 'INVALID_PAYLOAD', 'FULLTEXT_PREPROCESSED artifact is required before exporting a key-content curation bundle.');
    }
    const abstractProfile = await this.repository.findAbstractProfileByLiteratureId(literatureId);

    return {
      literature_id: literature.id,
      title: literature.title,
      authors: literature.authors,
      year: literature.year,
      abstract: literature.abstractText,
      abstract_profile: abstractProfile
        ? {
            id: abstractProfile.id,
            checksum: abstractProfile.checksum,
            confidence: abstractProfile.confidence,
            generated: abstractProfile.generated,
          }
        : null,
      document: {
        id: bundle.document.id,
        source_asset_id: bundle.document.sourceAssetId,
        normalized_text_checksum: bundle.document.normalizedTextChecksum,
        parser_name: bundle.document.parserName,
        parser_version: bundle.document.parserVersion,
        status: bundle.document.status,
        diagnostics: bundle.document.diagnostics,
      },
      sections: bundle.sections
        .sort((left, right) => left.orderIndex - right.orderIndex)
        .map((section) => ({
          section_id: section.sectionId,
          title: section.title,
          level: section.level,
          order_index: section.orderIndex,
          start_offset: section.startOffset,
          end_offset: section.endOffset,
          page_start: section.pageStart,
          page_end: section.pageEnd,
          checksum: section.checksum,
        })),
      paragraphs: bundle.paragraphs
        .sort((left, right) => left.orderIndex - right.orderIndex)
        .map((paragraph) => ({
          paragraph_id: paragraph.paragraphId,
          section_id: paragraph.sectionId,
          order_index: paragraph.orderIndex,
          text: paragraph.text,
          start_offset: paragraph.startOffset,
          end_offset: paragraph.endOffset,
          page_number: paragraph.pageNumber,
          checksum: paragraph.checksum,
          confidence: paragraph.confidence,
        })),
      anchors: bundle.anchors.map((anchor) => ({
        anchor_id: anchor.anchorId,
        anchor_type: anchor.anchorType,
        label: anchor.label,
        text: anchor.text,
        page_number: anchor.pageNumber,
        bbox: anchor.bbox,
        target_refs: anchor.targetRefs,
        checksum: anchor.checksum,
      })),
      source_refs: this.buildCurationSourceRefs(abstractProfile, bundle),
      export_policy: {
        accepted_curation_sources: ['codex_curated', 'manual_curated'],
        required_schema_version: 'key_content.v1',
        required_extraction_profile: 'paper_semantic_dossier.v1',
        require_resolvable_source_refs: true,
      },
    };
  }

  async importKeyContentDossier(
    literatureId: string,
    request: ImportLiteratureKeyContentDossierRequest,
  ): Promise<ImportLiteratureKeyContentDossierResponse> {
    await this.ensurePipelineScaffold(literatureId);
    await this.assertKeyContentCurationPrerequisites(literatureId);
    const literature = await this.assertLiteratureExists(literatureId);
    const bundle = await this.loadLatestReadyFulltextBundle(literatureId);
    if (!bundle) {
      throw new AppError(409, 'INVALID_PAYLOAD', 'FULLTEXT_PREPROCESSED artifact is required before importing a key-content dossier.');
    }
    const abstractProfile = await this.repository.findAbstractProfileByLiteratureId(literatureId);
    const validationContext = this.buildCurationValidationContext(bundle, abstractProfile?.id ?? null);
    const repairedDossier = this.repairCuratedDossierSourceRefs(request.dossier, validationContext);
    const validationIssues = this.validateCuratedDossier(repairedDossier.dossier, validationContext);
    if (validationIssues.length > 0) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Imported key-content dossier failed validation.', {
        issues: validationIssues.slice(0, 50),
      });
    }

    const now = new Date().toISOString();
    const importedPayload = this.buildImportedDossierPayload(
      { ...request, dossier: repairedDossier.dossier },
      bundle.document.normalizedTextChecksum,
      now,
      repairedDossier.diagnostics,
    );
    const checksum = sha256Text(stableStringify(importedPayload));
    const existingArtifact = await this.repository.findPipelineArtifact(literatureId, 'KEY_CONTENT_READY', 'KEY_CONTENT_DOSSIER');
    const artifact = await this.repository.upsertPipelineArtifact({
      id: existingArtifact?.id ?? crypto.randomUUID(),
      literatureId,
      stageCode: 'KEY_CONTENT_READY',
      artifactType: 'KEY_CONTENT_DOSSIER',
      payload: importedPayload as unknown as Record<string, unknown>,
      payloadPath: null,
      checksum,
      createdAt: existingArtifact?.createdAt ?? now,
      updatedAt: now,
    });
    const readinessStatus = importedPayload.readiness_status;
    if (readinessStatus === 'FAILED') {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Imported key-content dossier must not have FAILED readiness_status.');
    }

    const existingStages = await this.repository.listPipelineStageStatesByLiteratureId(literatureId);
    const existingKeyStage = existingStages.find((stage) => stage.stageCode === 'KEY_CONTENT_READY');
    const diagnostics = importedPayload.quality_report.extraction_diagnostics;
    await this.repository.upsertPipelineStageState({
      id: existingKeyStage?.id ?? crypto.randomUUID(),
      literatureId,
      stageCode: 'KEY_CONTENT_READY',
      status: 'SUCCEEDED',
      lastRunId: null,
      detail: {
        stage_code: 'KEY_CONTENT_READY',
        key_content_ready: true,
        readiness_status: readinessStatus,
        artifact_id: artifact.record.id,
        checksum,
        generated: true,
        source: request.curation_source,
        diagnostics,
      },
      updatedAt: now,
    });

    if (existingArtifact?.checksum !== checksum) {
      await this.markStagesStale({
        literatureId,
        stages: ['CHUNKED', 'EMBEDDED', 'INDEXED'],
        reasonCode: 'KEY_CONTENT_DOSSIER_IMPORTED',
        reasonMessage: 'A curated key-content dossier was imported.',
      });
    }

    const existingDigest = (literature.keyContentDigest ?? '').trim();
    if (!existingDigest && importedPayload.display_digest.trim()) {
      await this.repository.updateLiterature({
        ...literature,
        keyContentDigest: importedPayload.display_digest.trim(),
        updatedAt: now,
      });
    }

    const state = await this.refreshPipelineState(literatureId);
    const stageStates = await this.repository.listPipelineStageStatesByLiteratureId(literatureId);
    return {
      literature_id: literatureId,
      artifact_id: artifact.record.id,
      readiness_status: readinessStatus,
      checksum,
      display_digest: importedPayload.display_digest,
      source: request.curation_source,
      diagnostics,
      state: this.toPipelineStateDTO(state, stageStates),
    };
  }

  async dryRunImportKeyContentDossier(
    literatureId: string,
    request: ImportLiteratureKeyContentDossierRequest,
  ): Promise<DryRunImportLiteratureKeyContentDossierResponse> {
    await this.ensurePipelineScaffold(literatureId);
    await this.assertKeyContentCurationPrerequisites(literatureId);
    await this.assertLiteratureExists(literatureId);
    const bundle = await this.loadLatestReadyFulltextBundle(literatureId);
    if (!bundle) {
      throw new AppError(409, 'INVALID_PAYLOAD', 'FULLTEXT_PREPROCESSED artifact is required before importing a key-content dossier.');
    }
    const abstractProfile = await this.repository.findAbstractProfileByLiteratureId(literatureId);
    const validationContext = this.buildCurationValidationContext(bundle, abstractProfile?.id ?? null);
    const repairedDossier = this.repairCuratedDossierSourceRefs(request.dossier, validationContext);
    const validationIssues = this.validateCuratedDossier(repairedDossier.dossier, validationContext);
    const importedAt = new Date().toISOString();
    const importedPayload = this.buildImportedDossierPayload(
      { ...request, dossier: repairedDossier.dossier },
      bundle.document.normalizedTextChecksum,
      importedAt,
      repairedDossier.diagnostics,
    );
    const checksum = validationIssues.length === 0
      ? sha256Text(stableStringify(importedPayload))
      : null;
    const existingArtifact = await this.repository.findPipelineArtifact(literatureId, 'KEY_CONTENT_READY', 'KEY_CONTENT_DOSSIER');
    return {
      literature_id: literatureId,
      valid: validationIssues.length === 0,
      readiness_status: repairedDossier.dossier.readiness_status,
      checksum,
      display_digest: repairedDossier.dossier.display_digest,
      source: request.curation_source,
      issues: validationIssues,
      diagnostics: importedPayload.quality_report.extraction_diagnostics,
      repaired_source_ref_count: repairedDossier.diagnostics.filter((item) =>
        item.code === 'KEY_CONTENT_SOURCE_REF_REPAIRED').length,
      would_mark_downstream_stale: Boolean(checksum && existingArtifact?.checksum !== checksum),
    };
  }

  async listContentProcessingRuns(literatureId: string, limit?: number): Promise<ListLiteratureContentProcessingRunsResponse> {
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

  private async assertKeyContentCurationPrerequisites(literatureId: string): Promise<void> {
    if (!(await this.isStageUsable(literatureId, 'ABSTRACT_READY'))) {
      throw new AppError(409, 'INVALID_PAYLOAD', 'ABSTRACT_READY stage is required before key-content curation.');
    }
    if (!(await this.isStageUsable(literatureId, 'FULLTEXT_PREPROCESSED'))) {
      throw new AppError(409, 'INVALID_PAYLOAD', 'FULLTEXT_PREPROCESSED stage is required before key-content curation.');
    }
  }

  private async loadLatestReadyFulltextBundle(literatureId: string): Promise<KeyContentCurationFulltextBundle | null> {
    const documents = await this.repository.listFulltextDocumentsByLiteratureId(literatureId);
    const document = documents
      .filter((item) => item.status === 'READY')
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
    if (!document) {
      return null;
    }
    const [sections, paragraphs, anchors] = await Promise.all([
      this.repository.listFulltextSectionsByDocumentId(document.id),
      this.repository.listFulltextParagraphsByDocumentId(document.id),
      this.repository.listFulltextAnchorsByDocumentId(document.id),
    ]);
    return { document, sections, paragraphs, anchors };
  }

  private buildCurationSourceRefs(
    abstractProfile: Awaited<ReturnType<LiteratureRepository['findAbstractProfileByLiteratureId']>>,
    bundle: KeyContentCurationFulltextBundle,
  ): Array<Record<string, unknown>> {
    const refs: Array<Record<string, unknown>> = [];
    if (abstractProfile) {
      refs.push({
        ref_type: 'abstract',
        ref_id: abstractProfile.id,
        checksum: abstractProfile.checksum,
      });
    }
    refs.push(...bundle.sections.map((section) => ({
      ref_type: 'section',
      ref_id: section.sectionId,
      title: section.title,
      checksum: section.checksum,
    })));
    refs.push(...bundle.paragraphs.map((paragraph) => ({
      ref_type: 'paragraph',
      ref_id: paragraph.paragraphId,
      section_id: paragraph.sectionId,
      checksum: paragraph.checksum,
    })));
    refs.push(...bundle.anchors.map((anchor) => ({
      ref_type: 'anchor',
      ref_id: anchor.anchorId,
      anchor_type: anchor.anchorType,
      label: anchor.label,
      checksum: anchor.checksum,
    })));
    return refs;
  }

  private buildCurationValidationContext(
    bundle: KeyContentCurationFulltextBundle,
    abstractProfileId: string | null,
  ): KeyContentCurationValidationContext {
    return {
      documentChecksum: bundle.document.normalizedTextChecksum,
      abstractProfileId,
      sectionIds: new Set(bundle.sections.map((section) => section.sectionId)),
      paragraphIds: new Set(bundle.paragraphs.map((paragraph) => paragraph.paragraphId)),
      anchorIds: new Set(bundle.anchors.map((anchor) => anchor.anchorId)),
      anchorLabels: new Map(
        bundle.anchors
          .map((anchor) => [this.normalizeSourceRefLabel(anchor.label), anchor.anchorId] as const)
          .filter(([label]) => label.length > 0),
      ),
    };
  }

  private repairCuratedDossierSourceRefs(
    dossier: LiteratureKeyContentDossierPayload,
    context: KeyContentCurationValidationContext,
  ): {
    dossier: LiteratureKeyContentDossierPayload;
    diagnostics: Record<string, unknown>[];
  } {
    const diagnostics: Record<string, unknown>[] = [];
    const categories = Object.fromEntries(LITERATURE_KEY_CONTENT_CATEGORY_KEYS.map((category) => {
      const rows = dossier.categories[category].map((row) => ({
        ...row,
        source_refs: row.source_refs.map((ref) => {
          const repaired = this.repairCuratedSourceRef(ref, context);
          if (repaired.repaired) {
            diagnostics.push({
              code: 'KEY_CONTENT_SOURCE_REF_REPAIRED',
              severity: 'info',
              message: 'Repaired curated key-content source_ref to the active fulltext source-ref inventory.',
              category,
              item_id: row.id,
              repair_strategy: repaired.strategy,
              from: {
                ref_type: ref.ref_type,
                ref_id: ref.ref_id,
              },
              to: {
                ref_type: repaired.ref.ref_type,
                ref_id: repaired.ref.ref_id,
              },
            });
          }
          return repaired.ref;
        }),
      }));
      return [category, rows];
    })) as LiteratureKeyContentDossierPayload['categories'];

    return {
      dossier: {
        ...dossier,
        categories,
      },
      diagnostics,
    };
  }

  private repairCuratedSourceRef(
    ref: LiteratureKeyContentSourceRef,
    context: KeyContentCurationValidationContext,
  ): RepairedKeyContentSourceRef {
    const typedIdCandidate = this.refIdFromTypedField(ref);
    if (typedIdCandidate) {
      const repaired = this.normalizeCuratedSourceRefCandidate(
        ref,
        typedIdCandidate.refType,
        typedIdCandidate.refId,
        context,
        `${typedIdCandidate.refType}_id_field`,
      );
      if (repaired) {
        return repaired;
      }
    }

    const prefixed = this.parseSourceRefPrefixedId(ref.ref_id);
    if (prefixed) {
      const repaired = this.normalizeCuratedSourceRefCandidate(
        ref,
        prefixed.refType,
        prefixed.refId,
        context,
        'prefixed_ref_id',
      );
      if (repaired) {
        return repaired;
      }
    }

    const exact = this.normalizeCuratedSourceRefCandidate(ref, ref.ref_type, ref.ref_id, context, 'exact');
    if (exact) {
      return exact;
    }

    if (ref.ref_type === 'anchor') {
      const anchorId = context.anchorLabels.get(this.normalizeSourceRefLabel(ref.ref_id));
      if (anchorId) {
        return {
          ref: {
            ...ref,
            ref_type: 'anchor',
            ref_id: anchorId,
            anchor_id: anchorId,
          },
          repaired: true,
          strategy: 'anchor_label',
        };
      }
    }

    if (ref.ref_type === 'abstract' && context.abstractProfileId && ref.ref_id === 'abstract') {
      return {
        ref: {
          ...ref,
          ref_type: 'abstract',
          ref_id: context.abstractProfileId,
        },
        repaired: true,
        strategy: 'abstract_alias',
      };
    }

    return { ref, repaired: false, strategy: null };
  }

  private normalizeCuratedSourceRefCandidate(
    original: LiteratureKeyContentSourceRef,
    refType: LiteratureKeyContentSourceRef['ref_type'],
    refId: string,
    context: KeyContentCurationValidationContext,
    strategy: string,
  ): RepairedKeyContentSourceRef | null {
    const normalizedId = refId.trim();
    if (!normalizedId) {
      return null;
    }

    const candidate: LiteratureKeyContentSourceRef = {
      ...original,
      ref_type: refType,
      ref_id: normalizedId,
    };
    if (refType === 'section') {
      candidate.section_id = normalizedId;
    } else if (refType === 'paragraph') {
      candidate.paragraph_id = normalizedId;
    } else if (refType === 'anchor') {
      candidate.anchor_id = normalizedId;
    }

    if (!this.isResolvableKeyContentSourceRef(candidate, context)) {
      return null;
    }

    return {
      ref: candidate,
      repaired: candidate.ref_type !== original.ref_type || candidate.ref_id !== original.ref_id,
      strategy,
    };
  }

  private refIdFromTypedField(
    ref: LiteratureKeyContentSourceRef,
  ): { refType: LiteratureKeyContentSourceRef['ref_type']; refId: string } | null {
    if (ref.paragraph_id?.trim()) {
      return { refType: 'paragraph', refId: ref.paragraph_id.trim() };
    }
    if (ref.section_id?.trim()) {
      return { refType: 'section', refId: ref.section_id.trim() };
    }
    if (ref.anchor_id?.trim()) {
      return { refType: 'anchor', refId: ref.anchor_id.trim() };
    }
    return null;
  }

  private parseSourceRefPrefixedId(
    value: string,
  ): { refType: LiteratureKeyContentSourceRef['ref_type']; refId: string } | null {
    const trimmed = value.trim();
    for (const refType of ['abstract', 'section', 'paragraph', 'anchor', 'manual'] satisfies Array<LiteratureKeyContentSourceRef['ref_type']>) {
      const prefix = `${refType}:`;
      if (trimmed.startsWith(prefix)) {
        const refId = trimmed.slice(prefix.length).split(':')[0]?.trim() ?? '';
        return refId ? { refType, refId } : null;
      }
    }
    return null;
  }

  private normalizeSourceRefLabel(value: string | null): string {
    return (value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  private validateCuratedDossier(
    dossier: LiteratureKeyContentDossierPayload,
    context: KeyContentCurationValidationContext,
  ): string[] {
    const issues: string[] = [];
    if (dossier.schema_version !== 'key_content.v1') {
      issues.push('schema_version must be key_content.v1.');
    }
    if (dossier.extraction_profile !== 'paper_semantic_dossier.v1') {
      issues.push('extraction_profile must be paper_semantic_dossier.v1.');
    }
    if (dossier.readiness_status === 'FAILED') {
      issues.push('readiness_status must be READY or PARTIAL_READY.');
    }
    const inputChecksum = this.readString(dossier.input_refs.fulltext_checksum)
      ?? this.readString(dossier.input_refs.normalized_text_checksum);
    if (inputChecksum && inputChecksum !== context.documentChecksum) {
      issues.push('input_refs.fulltext_checksum does not match the active FULLTEXT_PREPROCESSED document.');
    }
    if (dossier.quality_report.blockers.length > 0) {
      issues.push('quality_report.blockers must be empty for import.');
    }

    for (const category of LITERATURE_KEY_CONTENT_CATEGORY_KEYS) {
      const rows = dossier.categories[category];
      if (!Array.isArray(rows)) {
        issues.push(`categories.${category} must be an array.`);
        continue;
      }
      for (const row of rows) {
        if (!row.statement.trim()) {
          issues.push(`categories.${category}.${row.id || '<missing-id>'} has an empty statement.`);
        }
        if (row.provenance !== 'model_generated' && row.provenance !== 'user_edited') {
          issues.push(
            `categories.${category}.${row.id || '<missing-id>'}.provenance must be item-level "model_generated" or "user_edited"; use request.curation_source for codex_curated/manual_curated.`,
          );
        }
        if (!Array.isArray(row.source_refs) || row.source_refs.length === 0) {
          issues.push(`categories.${category}.${row.id} must include at least one source_ref.`);
          continue;
        }
        for (const ref of row.source_refs) {
          if (!this.isResolvableKeyContentSourceRef(ref, context)) {
            issues.push(`categories.${category}.${row.id} has unresolved source_ref ${ref.ref_type}:${ref.ref_id}.`);
          }
        }
      }
    }
    for (const coreCategory of ['research_problem', 'contributions', 'key_findings'] satisfies LiteratureKeyContentCategoryKey[]) {
      if (dossier.categories[coreCategory].length === 0) {
        issues.push(`categories.${coreCategory} must not be empty.`);
      }
    }
    return [...new Set(issues)];
  }

  private isResolvableKeyContentSourceRef(
    ref: LiteratureKeyContentSourceRef,
    context: {
      abstractProfileId: string | null;
      sectionIds: Set<string>;
      paragraphIds: Set<string>;
      anchorIds: Set<string>;
    },
  ): boolean {
    if (ref.ref_type === 'abstract') {
      return Boolean(context.abstractProfileId && ref.ref_id === context.abstractProfileId);
    }
    if (ref.ref_type === 'section') {
      return context.sectionIds.has(ref.ref_id);
    }
    if (ref.ref_type === 'paragraph') {
      return context.paragraphIds.has(ref.ref_id);
    }
    if (ref.ref_type === 'anchor') {
      return context.anchorIds.has(ref.ref_id);
    }
    return ref.ref_type === 'manual' && ref.ref_id.trim().length > 0;
  }

  private buildImportedDossierPayload(
    request: ImportLiteratureKeyContentDossierRequest,
    documentChecksum: string,
    importedAt: string,
    repairDiagnostics: Record<string, unknown>[] = [],
  ): LiteratureKeyContentDossierPayload {
    const existingDiagnostics = request.dossier.quality_report.extraction_diagnostics.filter((item) => {
      const row = item && typeof item === 'object' && !Array.isArray(item) ? item as Record<string, unknown> : {};
      const code = this.readString(row.code);
      return code !== 'KEY_CONTENT_CURATED_IMPORT' && code !== 'KEY_CONTENT_LLM_TELEMETRY';
    });
    const diagnostics = [
      ...existingDiagnostics,
      ...repairDiagnostics,
      {
        code: 'KEY_CONTENT_CURATED_IMPORT',
        severity: 'info',
        message: `Imported curated key-content dossier from ${request.curation_source}.`,
        curation_source: request.curation_source,
        curator: request.curator ?? null,
        imported_at: importedAt,
      },
      {
        code: 'KEY_CONTENT_LLM_TELEMETRY',
        severity: 'info',
        message: 'LLM calls=0, retries=0, elapsed_ms=0.',
        request_count: 0,
        retry_count: 0,
        timeout_count: 0,
        rate_limit_count: 0,
        elapsed_ms_total: 0,
        prompt_templates: ['curated-import@none'],
      },
    ];
    return {
      ...request.dossier,
      input_refs: {
        ...request.dossier.input_refs,
        fulltext_checksum: documentChecksum,
        curation_source: request.curation_source,
        curator: request.curator ?? null,
        imported_at: importedAt,
        external_model_calls: 0,
      },
      quality_report: {
        ...request.dossier.quality_report,
        extraction_diagnostics: diagnostics,
      },
    };
  }

  resolveOverviewStatus(input: OverviewStatusResolverInput) {
    return this.overviewStatusResolver.resolve(input);
  }

  buildPipelineStateDTO(
    stateRecord: LiteraturePipelineStateRecord,
    stageStates: LiteraturePipelineStageStateRecord[],
  ): LiteratureContentProcessingStateDTO {
    return this.toPipelineStateDTO(stateRecord, stageStates);
  }

  buildStageStatusMap(stageStates: LiteraturePipelineStageStateRecord[]): LiteratureContentProcessingStageStatusMap {
    const map = Object.fromEntries(
      PIPELINE_STAGE_CODES.map((stageCode) => [stageCode, 'NOT_STARTED' as LiteratureContentProcessingStageStatus]),
    ) as LiteratureContentProcessingStageStatusMap;

    for (const stageState of stageStates) {
      map[stageState.stageCode] = stageState.status;
    }

    return map;
  }

  buildOverviewPipelineActions(input: {
    topicScopeStatus: TopicScopeStatus | null;
    rightsClass: RightsClass;
    pipelineState: LiteratureContentProcessingStateDTO;
    stageStatusMap: LiteratureContentProcessingStageStatusMap;
  }): LiteratureContentProcessingActionSet {
    const hasInFlight = (stageCodes: LiteratureContentProcessingStageCode[]) =>
      stageCodes.some((stageCode) => {
        const status = input.stageStatusMap[stageCode];
        return status === 'PENDING' || status === 'RUNNING';
      });

    const resolveRightsGate = ():
      | { ok: true }
      | { ok: false; reasonCode: Extract<LiteratureContentProcessingActionReasonCode, 'RIGHTS_RESTRICTED' | 'USER_AUTH_DISABLED'> } => {
      if (input.rightsClass === 'RESTRICTED') {
        return { ok: false, reasonCode: 'RIGHTS_RESTRICTED' };
      }
      if (input.rightsClass === 'USER_AUTH' && !this.isUserAuthContentProcessingEnabled()) {
        return { ok: false, reasonCode: 'USER_AUTH_DISABLED' };
      }
      return { ok: true };
    };

    const toAvailability = (
      actionCode: LiteratureContentProcessingActionSet['process_content']['action_code'],
      requestedStages: LiteratureContentProcessingStageCode[],
      options: {
        requiresScope?: boolean;
        requiresRightsGate?: boolean;
        prerequisite?: boolean;
        alreadyReady?: boolean;
        alwaysEnabled?: boolean;
      },
    ) => {
      if (options.alwaysEnabled) {
        return {
          ...this.buildActionAvailability(actionCode, requestedStages, 'READY'),
          reason_message: '存在失败、阻塞或过期阶段，可查看阶段原因。',
        };
      }

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

      if (options.alreadyReady) {
        return this.buildActionAvailability(actionCode, requestedStages, 'STAGE_ALREADY_READY');
      }

      if (options.prerequisite === false) {
        return this.buildActionAvailability(actionCode, requestedStages, 'PREREQUISITE_NOT_READY');
      }

      return this.buildActionAvailability(actionCode, requestedStages, 'READY');
    };

    const processContentStages: LiteratureContentProcessingStageCode[] = [
      'CITATION_NORMALIZED',
      'ABSTRACT_READY',
      'FULLTEXT_PREPROCESSED',
      'KEY_CONTENT_READY',
    ];
    const processToRetrievableStages: LiteratureContentProcessingStageCode[] = [...PIPELINE_STAGE_CODES];
    const failedOrStaleStages = PIPELINE_STAGE_CODES.filter((stageCode) => {
      const status = input.stageStatusMap[stageCode];
      return status === 'FAILED' || status === 'BLOCKED' || status === 'STALE';
    });
    const hasReasonToView = PIPELINE_STAGE_CODES.some((stageCode) => {
      const status = input.stageStatusMap[stageCode];
      return status === 'FAILED' || status === 'BLOCKED' || status === 'STALE' || status === 'SKIPPED';
    });
    const allStagesSucceeded = (stageCodes: LiteratureContentProcessingStageCode[]) =>
      stageCodes.every((stageCode) => input.stageStatusMap[stageCode] === 'SUCCEEDED');

    return {
      process_content: toAvailability('process_content', processContentStages, {
        requiresRightsGate: true,
        alreadyReady: allStagesSucceeded(processContentStages),
      }),
      process_to_retrievable: toAvailability('process_to_retrievable', processToRetrievableStages, {
        requiresRightsGate: true,
        alreadyReady: allStagesSucceeded(processToRetrievableStages),
      }),
      rebuild_index: toAvailability('rebuild_index', ['INDEXED'], {
        prerequisite: input.pipelineState.embedded,
        alreadyReady: allStagesSucceeded(['INDEXED']),
      }),
      reextract: toAvailability('reextract', ['FULLTEXT_PREPROCESSED', 'KEY_CONTENT_READY'], {
        requiresRightsGate: true,
        prerequisite: input.pipelineState.abstract_ready,
        alreadyReady: false,
      }),
      retry_failed: toAvailability('retry_failed', failedOrStaleStages, {
        requiresRightsGate: failedOrStaleStages.some((stageCode) => DEEP_PIPELINE_STAGES.includes(stageCode)),
        prerequisite: failedOrStaleStages.length > 0,
        alreadyReady: failedOrStaleStages.length === 0,
      }),
      view_reason: toAvailability('view_reason', [], {
        requiresScope: false,
        alwaysEnabled: hasReasonToView,
        alreadyReady: !hasReasonToView,
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
      const sources = await this.repository.listSourcesByLiteratureId(context.literatureId);
      const profile = await this.citationNormalizationService.normalizeAndPersist(literature, sources);
      await this.refreshPipelineState(context.literatureId);
      const profileRef = {
        citation_profile_id: profile.id,
        normalized_doi: profile.normalizedDoi,
        normalized_arxiv_id: profile.normalizedArxivId,
        normalized_title: profile.normalizedTitle,
        normalized_authors: profile.normalizedAuthors,
        parsed_year: profile.parsedYear,
        normalized_source_url: profile.normalizedSourceUrl,
        title_authors_year_hash: profile.titleAuthorsYearHash,
        citation_complete: profile.citationComplete,
        incomplete_reason_codes: profile.incompleteReasonCodes,
        source_refs: profile.sourceRefs,
        input_checksum: profile.inputChecksum,
        confidence: profile.confidence,
      };
      return {
        status: 'SUCCEEDED',
        detail: {
          stage_code: context.stageCode,
          ...profileRef,
        },
        outputRef: profileRef,
      };
    }

    if (context.stageCode === 'ABSTRACT_READY') {
      const sources = await this.repository.listSourcesByLiteratureId(context.literatureId);
      const profile = await this.abstractReadinessService.resolveAndPersist(literature, sources);
      await this.refreshPipelineState(context.literatureId);
      const profileRef = {
        abstract_profile_id: profile.id,
        abstract_ready: this.abstractReadinessService.isReady(profile),
        generated: profile.generated,
        source: profile.abstractSource,
        source_ref: profile.sourceRef,
        checksum: profile.checksum,
        language: profile.language,
        confidence: profile.confidence,
        reason_codes: profile.reasonCodes,
      };
      if (!this.abstractReadinessService.isReady(profile)) {
        const reasonMessage = 'A trusted abstract source is required before ABSTRACT_READY can complete.';
        return {
          status: 'BLOCKED',
          detail: {
            stage_code: context.stageCode,
            reason_code: 'ABSTRACT_SOURCE_MISSING',
            reason_message: reasonMessage,
            ...profileRef,
          },
          outputRef: profileRef,
          errorCode: 'ABSTRACT_SOURCE_MISSING',
          errorMessage: reasonMessage,
        };
      }
      return {
        status: 'SUCCEEDED',
        detail: {
          stage_code: context.stageCode,
          ...profileRef,
        },
        outputRef: profileRef,
      };
    }

    if (DEEP_PIPELINE_STAGES.includes(context.stageCode)) {
      const rightsGate = this.checkDeepStageRights(literature.rightsClass);
      if (!rightsGate.ok) {
        return this.blockedResult(context.stageCode, rightsGate.reasonCode, rightsGate.reasonMessage);
      }
    }

    if (context.stageCode === 'FULLTEXT_PREPROCESSED') {
      if (!state.abstractReady || !(await this.isStageUsable(context.literatureId, 'ABSTRACT_READY'))) {
        return this.blockedResult(context.stageCode, 'PREREQUISITE_NOT_READY', 'ABSTRACT_READY stage is required first.');
      }
      const preprocessed = await this.artifactRuntime.ensureFulltextPreprocessed(literature);
      if (!preprocessed.ready) {
        return this.blockedResult(
          context.stageCode,
          preprocessed.reasonCode,
          preprocessed.reasonMessage,
          preprocessed.diagnostics,
        );
      }
      return {
        status: 'SUCCEEDED',
        detail: {
          stage_code: context.stageCode,
          artifact_type: preprocessed.artifactType,
          text_length: preprocessed.textLength,
          document_id: preprocessed.documentId,
          source_asset_id: preprocessed.sourceAssetId,
          normalized_text_checksum: preprocessed.normalizedTextChecksum,
          section_count: preprocessed.sectionCount,
          paragraph_count: preprocessed.paragraphCount,
          anchor_count: preprocessed.anchorCount,
          diagnostics: preprocessed.diagnostics,
        },
        outputRef: {
          artifact_id: preprocessed.id,
          artifact_type: preprocessed.artifactType,
          document_id: preprocessed.documentId,
          source_asset_id: preprocessed.sourceAssetId,
          normalized_text_checksum: preprocessed.normalizedTextChecksum,
        },
      };
    }

    if (context.stageCode === 'KEY_CONTENT_READY') {
      if (!state.abstractReady || !(await this.isStageUsable(context.literatureId, 'ABSTRACT_READY'))) {
        return this.blockedResult(context.stageCode, 'PREREQUISITE_NOT_READY', 'ABSTRACT_READY stage is required first.');
      }
      if (!(await this.isStageUsable(context.literatureId, 'FULLTEXT_PREPROCESSED'))) {
        return this.blockedResult(context.stageCode, 'PREREQUISITE_NOT_READY', 'FULLTEXT_PREPROCESSED stage is required first.');
      }
      const preprocessed = await this.repository.findPipelineArtifact(
        context.literatureId,
        'FULLTEXT_PREPROCESSED',
        'PREPROCESSED_TEXT',
      );
      if (!preprocessed) {
        return this.blockedResult(context.stageCode, 'PREREQUISITE_NOT_READY', 'FULLTEXT_PREPROCESSED artifact is required first.');
      }
      const preprocessedChecksum = preprocessed.checksum ?? this.readString(preprocessed.payload.normalized_text_checksum);
      if (!preprocessedChecksum) {
        return this.blockedResult(context.stageCode, 'PREREQUISITE_NOT_READY', 'FULLTEXT_PREPROCESSED checksum is required first.');
      }
      const preferredMethod = await this.resolvePreferredKeyContentMethod();
      if (preferredMethod !== 'llm_gateway') {
        const curatedResult = await this.reuseCuratedKeyContentIfCurrent(
          context.literatureId,
          preprocessedChecksum,
          preferredMethod,
        );
        if (curatedResult) {
          return curatedResult;
        }
        return this.blockedResult(
          context.stageCode,
          'KEY_CONTENT_CURATION_REQUIRED',
          `Preferred KEY_CONTENT_READY method is ${preferredMethod}; import a curated key-content dossier before continuing.`,
          [{
            code: 'KEY_CONTENT_CURATION_REQUIRED',
            severity: 'blocker',
            preferred_key_content_method: preferredMethod,
            curation_bundle_route: `/literature/${context.literatureId}/content-processing/key-content-curation-bundle`,
            dossier_import_route: `/literature/${context.literatureId}/content-processing/key-content-dossier`,
          }],
        );
      }
      const digestResult = await this.artifactRuntime.ensureKeyContentReady(literature);
      if (!digestResult.keyContentReady) {
        return this.blockedResult(
          context.stageCode,
          digestResult.reasonCode,
          digestResult.reasonMessage,
          digestResult.diagnostics,
        );
      }
      return {
        status: 'SUCCEEDED',
        detail: {
          stage_code: context.stageCode,
          key_content_ready: digestResult.keyContentReady,
          readiness_status: digestResult.readinessStatus,
          artifact_id: digestResult.artifactId,
          checksum: digestResult.checksum,
          generated: digestResult.generated,
          source: digestResult.source,
          diagnostics: digestResult.diagnostics,
        },
        outputRef: {
          artifact_id: digestResult.artifactId,
          artifact_type: 'KEY_CONTENT_DOSSIER',
          key_content_ready: digestResult.keyContentReady,
          readiness_status: digestResult.readinessStatus,
          checksum: digestResult.checksum,
          generated: digestResult.generated,
          source: digestResult.source,
        },
      };
    }

    if (context.stageCode === 'CHUNKED') {
      if (!(await this.isStageUsable(context.literatureId, 'KEY_CONTENT_READY'))) {
        return this.blockedResult(context.stageCode, 'PREREQUISITE_NOT_READY', 'KEY_CONTENT_READY stage is required first.');
      }
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
      if (!(await this.isStageUsable(context.literatureId, 'CHUNKED'))) {
        return this.blockedResult(context.stageCode, 'PREREQUISITE_NOT_READY', 'CHUNKED stage is required first.');
      }
      const chunkArtifact = await this.repository.findPipelineArtifact(context.literatureId, 'CHUNKED', 'CHUNKS');
      if (!chunkArtifact) {
        return this.blockedResult(context.stageCode, 'PREREQUISITE_NOT_READY', 'CHUNKED artifact is required first.');
      }
      const embedded = await this.artifactRuntime.ensureEmbedded(context.literatureId, chunkArtifact);
      if (!embedded.ready) {
        return this.blockedResult(
          context.stageCode,
          embedded.reasonCode,
          embedded.reasonMessage,
          embedded.diagnostics,
        );
      }
      const vectorCount = Array.isArray(embedded.artifact.payload.vectors)
        ? embedded.artifact.payload.vectors.length
        : 0;
      const embeddingTelemetry = this.readRecord(embedded.artifact.payload.telemetry);
      const embeddingVersion = await this.artifactRuntime.persistEmbeddingVersionSnapshot({
        literatureId: context.literatureId,
        chunkArtifact,
        embeddedArtifact: embedded.artifact,
      });
      return {
        status: 'SUCCEEDED',
        detail: {
          stage_code: context.stageCode,
          embedding_provider: embedded.artifact.payload.provider,
          vector_count: vectorCount,
          embedding_version_id: embeddingVersion.id,
          embedding_version_status: embeddingVersion.status,
          reused_existing: embedded.reusedExisting,
          activated: false,
          telemetry: embeddingTelemetry,
        },
        outputRef: {
          artifact_id: embedded.artifact.id,
          vector_count: vectorCount,
          embedding_provider: embedded.artifact.payload.provider,
          embedding_version_id: embeddingVersion.id,
          embedding_version_status: embeddingVersion.status,
          reused_existing: embedded.reusedExisting,
          activated: false,
          telemetry: embeddingTelemetry,
        },
      };
    }

    if (context.stageCode === 'INDEXED') {
      if (!(await this.isStageUsable(context.literatureId, 'EMBEDDED'))) {
        return this.blockedResult(context.stageCode, 'PREREQUISITE_NOT_READY', 'EMBEDDED stage is required first.');
      }
      const embedded = await this.repository.findPipelineArtifact(context.literatureId, 'EMBEDDED', 'EMBEDDINGS');
      const chunked = await this.repository.findPipelineArtifact(context.literatureId, 'CHUNKED', 'CHUNKS');
      if (!embedded || !chunked) {
        return this.blockedResult(context.stageCode, 'PREREQUISITE_NOT_READY', 'EMBEDDED and CHUNKED artifacts are required first.');
      }
      const indexed = await this.artifactRuntime.ensureIndexed(context.literatureId, chunked, embedded);
      const tokenCount = typeof indexed.payload.token_count === 'number' ? indexed.payload.token_count : 0;
      const embeddingVersion = await this.artifactRuntime.activateLatestReadyEmbeddingVersion({
        literatureId: context.literatureId,
        chunkArtifact: chunked,
        embeddedArtifact: embedded,
        indexedArtifact: indexed,
      });
      await this.evidenceActivationService.refreshAfterIndexed(context.literatureId);
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

    const [sources, citationProfile, abstractProfile, stageStates, keyContentArtifact] = await Promise.all([
      this.repository.listSourcesByLiteratureId(literatureId),
      this.repository.findCitationProfileByLiteratureId(literatureId),
      this.repository.findAbstractProfileByLiteratureId(literatureId),
      this.repository.listPipelineStageStatesByLiteratureId(literatureId),
      this.repository.findPipelineArtifact(literatureId, 'KEY_CONTENT_READY', 'KEY_CONTENT_DOSSIER'),
    ]);
    const keyContentStageStatus = stageStates.find((stage) => stage.stageCode === 'KEY_CONTENT_READY')?.status ?? 'NOT_STARTED';
    const keyContentReady = Boolean(keyContentArtifact && this.isArtifactPresentStatus(keyContentStageStatus));
    const signals = this.deriveSignals(literature, sources.map((source) => source.sourceUrl), {
      citationComplete: citationProfile?.citationComplete ?? false,
      abstractReady: abstractProfile ? this.abstractReadinessService.isReady(abstractProfile) : false,
    });
    const existing = await this.repository.findPipelineStateByLiteratureId(literatureId);
    const now = new Date().toISOString();

    const upserted = await this.repository.upsertPipelineState({
      id: existing?.id ?? crypto.randomUUID(),
      literatureId,
      citationComplete: signals.citationComplete,
      abstractReady: signals.abstractReady,
      keyContentReady,
      dedupStatus: dedupStatusOverride ?? existing?.dedupStatus ?? 'unknown',
      updatedAt: now,
    });

    return upserted.record;
  }

  private deriveSignals(
    literature: LiteratureRecord,
    sourceUrls: string[],
    profileOverrides: { citationComplete?: boolean; abstractReady?: boolean } = {},
  ): PipelineSignalState {
    const hasAuthors = literature.authors.some((author) => author.trim().length > 0);
    const hasYear = typeof literature.year === 'number' && Number.isFinite(literature.year);
    const hasLocator = Boolean(
      (literature.doiNormalized ?? '').trim()
      || (literature.arxivId ?? '').trim()
      || sourceUrls.some((url) => url.trim().length > 0),
    );

    return {
      citationComplete: profileOverrides.citationComplete ?? (hasAuthors && hasYear && hasLocator),
      abstractReady: profileOverrides.abstractReady ?? Boolean((literature.abstractText ?? '').trim()),
      keyContentReady: false,
    };
  }

  private deriveExtendedSignals(
    baseState: LiteraturePipelineStateRecord,
    stageStatusMap: LiteratureContentProcessingStageStatusMap,
  ): ExtendedPipelineSignalState {
    return {
      citationComplete: baseState.citationComplete && this.isArtifactPresentStatus(stageStatusMap.CITATION_NORMALIZED),
      abstractReady: baseState.abstractReady && this.isArtifactPresentStatus(stageStatusMap.ABSTRACT_READY),
      keyContentReady: baseState.keyContentReady && this.isArtifactPresentStatus(stageStatusMap.KEY_CONTENT_READY),
      fulltextPreprocessed: this.isArtifactPresentStatus(stageStatusMap.FULLTEXT_PREPROCESSED),
      chunked: this.isArtifactPresentStatus(stageStatusMap.CHUNKED),
      embedded: this.isArtifactPresentStatus(stageStatusMap.EMBEDDED),
      indexed: this.isArtifactPresentStatus(stageStatusMap.INDEXED),
    };
  }

  private isArtifactPresentStatus(status: LiteratureContentProcessingStageStatus): boolean {
    return status === 'SUCCEEDED' || status === 'STALE';
  }

  private async isStageUsable(
    literatureId: string,
    stageCode: LiteratureContentProcessingStageCode,
  ): Promise<boolean> {
    const stageStates = await this.repository.listPipelineStageStatesByLiteratureId(literatureId);
    const status = stageStates.find((stage) => stage.stageCode === stageCode)?.status ?? 'NOT_STARTED';
    return this.isArtifactPresentStatus(status);
  }

  private async assertLiteratureExists(literatureId: string): Promise<LiteratureRecord> {
    const literature = await this.repository.findLiteratureById(literatureId);
    if (!literature) {
      throw new AppError(404, 'NOT_FOUND', `Literature ${literatureId} not found.`);
    }
    return literature;
  }

  private sortStageStates(stageStates: LiteraturePipelineStageStateRecord[]): LiteraturePipelineStageStateRecord[] {
    return [...stageStates].sort((left, right) => {
      const leftOrder = PIPELINE_STAGE_ORDER.get(left.stageCode) ?? 999;
      const rightOrder = PIPELINE_STAGE_ORDER.get(right.stageCode) ?? 999;
      return leftOrder - rightOrder;
    });
  }

  private sortStageCodes(stageCodes: LiteratureContentProcessingStageCode[]): LiteratureContentProcessingStageCode[] {
    return [...stageCodes].sort((left, right) => {
      const leftOrder = PIPELINE_STAGE_ORDER.get(left) ?? 999;
      const rightOrder = PIPELINE_STAGE_ORDER.get(right) ?? 999;
      return leftOrder - rightOrder;
    });
  }

  private toPipelineStateDTO(
    record: LiteraturePipelineStateRecord,
    stageStates: LiteraturePipelineStageStateRecord[],
  ): LiteratureContentProcessingStateDTO {
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

  private toPipelineRunStepDTO(record: LiteraturePipelineRunStepRecord): LiteratureContentProcessingRunStepDTO {
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
  ): LiteratureContentProcessingRunDTO {
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
    actionCode: LiteratureContentProcessingActionSet['process_content']['action_code'],
    requestedStages: LiteratureContentProcessingStageCode[],
    reasonCode: LiteratureContentProcessingActionReasonCode,
  ): LiteratureContentProcessingActionSet['process_content'] {
    return {
      action_code: actionCode,
      enabled: reasonCode === 'READY',
      reason_code: reasonCode,
      reason_message: PIPELINE_ACTION_REASON_MESSAGES[reasonCode],
      requested_stages: requestedStages,
    };
  }

  private isUserAuthContentProcessingEnabled(): boolean {
    const raw = (process.env.LITERATURE_USER_AUTH_CONTENT_PROCESSING_ENABLED ?? 'false').trim().toLowerCase();
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
    if (rightsClass === 'USER_AUTH' && !this.isUserAuthContentProcessingEnabled()) {
      return {
        ok: false,
        reasonCode: 'USER_AUTH_DISABLED',
        reasonMessage: PIPELINE_ACTION_REASON_MESSAGES.USER_AUTH_DISABLED,
      };
    }
    return { ok: true };
  }

  private async resolvePreferredKeyContentMethod(): Promise<LiteratureKeyContentReadyMethod> {
    return this.settingsService?.resolvePreferredKeyContentMethod?.() ?? 'codex_curated';
  }

  private async reuseCuratedKeyContentIfCurrent(
    literatureId: string,
    fulltextChecksum: string,
    preferredMethod: LiteratureKeyContentReadyMethod,
  ): Promise<StageExecutionResult | null> {
    const artifact = await this.repository.findPipelineArtifact(literatureId, 'KEY_CONTENT_READY', 'KEY_CONTENT_DOSSIER');
    if (!artifact) {
      return null;
    }

    const payload = artifact.payload as unknown as Partial<LiteratureKeyContentDossierPayload>;
    const inputRefs = payload.input_refs && typeof payload.input_refs === 'object' && !Array.isArray(payload.input_refs)
      ? payload.input_refs as Record<string, unknown>
      : {};
    const artifactFulltextChecksum = this.readString(inputRefs.fulltext_checksum)
      ?? this.readString(inputRefs.normalized_text_checksum);
    const curationSource = this.readString(inputRefs.curation_source);
    if (artifactFulltextChecksum !== fulltextChecksum) {
      return null;
    }
    if (curationSource !== 'codex_curated' && curationSource !== 'manual_curated') {
      return null;
    }

    const readinessStatus = payload.readiness_status === 'PARTIAL_READY' ? 'PARTIAL_READY' : 'READY';
    const diagnostics = Array.isArray(payload.quality_report?.extraction_diagnostics)
      ? payload.quality_report.extraction_diagnostics
      : [];
    return {
      status: 'SUCCEEDED',
      detail: {
        stage_code: 'KEY_CONTENT_READY',
        key_content_ready: true,
        readiness_status: readinessStatus,
        artifact_id: artifact.id,
        checksum: artifact.checksum,
        generated: false,
        source: curationSource,
        preferred_key_content_method: preferredMethod,
        diagnostics,
      },
      outputRef: {
        artifact_id: artifact.id,
        artifact_type: 'KEY_CONTENT_DOSSIER',
        key_content_ready: true,
        readiness_status: readinessStatus,
        checksum: artifact.checksum,
        generated: false,
        source: curationSource,
      },
    };
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
    stageCode: LiteratureContentProcessingStageCode,
    reasonCode: string,
    reasonMessage: string,
    diagnostics: Record<string, unknown>[] = [],
  ): StageExecutionResult {
    return {
      status: 'BLOCKED',
      detail: {
        stage_code: stageCode,
        reason_code: reasonCode,
        reason_message: reasonMessage,
        ...(diagnostics.length > 0 ? { diagnostics } : {}),
      },
      inputRef: {},
      outputRef: {},
      errorCode: reasonCode,
      errorMessage: reasonMessage,
    };
  }

  private readString(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
  }

  private readRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : null;
  }
}

export { PIPELINE_STAGE_CODES, DEFAULT_EXECUTABLE_STAGES };
