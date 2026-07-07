import crypto from 'node:crypto';
import dns from 'node:dns/promises';
import fs from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import type {
  CreateLiteratureContentProcessingRunRequest,
  CreateLiteratureContentProcessingRunResponse,
  DedupMatchType,
  DryRunImportLiteratureKeyContentDossierResponse,
  DownloadLiteratureContentAssetRequest,
  DownloadLiteratureContentAssetResponse,
  GetLiteratureContentProcessingResponse,
  GetLiteratureMetadataResponse,
  GetPaperLiteratureResponse,
  ImportLiteratureKeyContentDossierRequest,
  ImportLiteratureKeyContentDossierResponse,
  LiteratureKeyContentCurationBundleResponse,
  LiteratureCollectionImportItem,
  LiteratureCollectionImportRequest,
  LiteratureCollectionImportResponse,
  LiteratureRetrieveRequest,
  LiteratureRetrieveResponse,
  LiteratureOverviewQuery,
  LiteratureOverviewResponse,
  ListLiteratureContentProcessingRunsQuery,
  ListLiteratureContentProcessingRunsResponse,
  ListLiteratureContentAssetsResponse,
  LiteratureProvider,
  LiteratureContentAssetDTO,
  PaperLiteratureLinkView,
  PaperCitationStatus,
  RegisterLiteratureContentAssetRequest,
  RegisterLiteratureContentAssetResponse,
  RightsClass,
  SyncPaperLiteratureFromTopicRequest,
  SyncPaperLiteratureFromTopicResponse,
  UpdateTopicLiteratureEvidenceActivationRequest,
  TopicScopeStatus,
  TopicLiteratureScopeResponse,
  UpdateLiteratureMetadataRequest,
  UpdateLiteratureMetadataResponse,
  UpdatePaperLiteratureLinkRequest,
  UpdatePaperLiteratureLinkResponse,
  UpsertTopicLiteratureScopeRequest,
  ZoteroImportRequest,
  ZoteroImportResponse,
  ZoteroPreviewRequest,
  ZoteroPreviewResponse,
} from '@paper-engineering-assistant/shared/research-lifecycle/literature-contracts';
import { AppError } from '../errors/app-error.js';
import type {
  LiteraturePipelineStageStateRecord,
  LiteratureRecord,
  LiteratureRepository,
  LiteratureContentAssetRecord,
} from '../repositories/literature-repository.js';
import type { ResearchLifecycleRepository } from '../repositories/research-lifecycle-repository.js';
import { LiteratureFlowService } from './literature-flow-service.js';
import { LiteratureEvidenceActivationService } from './literature-evidence-activation-service.js';
import type { EvidenceActivationClassification } from './literature-evidence-activation-service.js';
import type { LiteratureAcquisitionSettingsService } from './literature-acquisition-settings-service.js';
import {
  resolveDefaultLiteratureContentProcessingRoot,
  type LiteratureContentProcessingSettingsService,
} from './literature-content-processing-settings-service.js';
import { LiteratureRetrievalService } from './literature-retrieval-service.js';
import {
  buildLiteratureDedupCandidate,
  buildLiteratureTitleAuthorsYearHash,
  buildLiteratureWorkIdentity,
  normalizeLiteratureArxivId,
  normalizeLiteratureDoi,
  normalizeLiteratureTitle,
  type LiteratureDedupCandidate,
} from './literature-work-identity.js';
import type { BackendLlmGateway } from './llm-gateway.js';

type MatchedDedup = {
  matchedBy: DedupMatchType;
  literature: LiteratureRecord | null;
};

type DownloadPolicy = {
  maxByteSize: number;
  timeoutMs: number;
  maxRedirects: number;
  requirePdfSignature: boolean;
};

type DownloadFetchResult = {
  response: Response;
  finalUrl: string;
  redirectChain: string[];
};

type LiteratureServiceDependencies = {
  literatureFlowService?: LiteratureFlowService;
  literatureRetrievalService?: LiteratureRetrievalService;
  evidenceActivationService?: LiteratureEvidenceActivationService;
  literatureAcquisitionSettingsService?: Pick<LiteratureAcquisitionSettingsService, 'resolveDownloaderOptions'>;
  llmGateway?: BackendLlmGateway;
};

const DEFAULT_DOWNLOAD_MAX_BYTES = 100 * 1024 * 1024;
const DEFAULT_DOWNLOAD_TIMEOUT_MS = 60_000;
const DEFAULT_DOWNLOAD_MAX_REDIRECTS = 5;

export class LiteratureService {
  constructor(
    private readonly literatureRepository: LiteratureRepository,
    private readonly researchRepository: ResearchLifecycleRepository,
    private readonly contentProcessingSettingsService?: LiteratureContentProcessingSettingsService,
    dependencies: LiteratureServiceDependencies = {},
  ) {
    this.evidenceActivationService = dependencies.evidenceActivationService
      ?? new LiteratureEvidenceActivationService(literatureRepository);
    this.literatureFlowService = dependencies.literatureFlowService
      ?? new LiteratureFlowService(
        literatureRepository,
        contentProcessingSettingsService,
        dependencies.llmGateway,
        this.evidenceActivationService,
      );
    this.literatureRetrievalService = dependencies.literatureRetrievalService
      ?? new LiteratureRetrievalService(
        literatureRepository,
        contentProcessingSettingsService,
        dependencies.llmGateway,
        this.evidenceActivationService,
      );
    this.literatureAcquisitionSettingsService = dependencies.literatureAcquisitionSettingsService;
  }

  private readonly evidenceActivationService: LiteratureEvidenceActivationService;
  private readonly literatureFlowService: LiteratureFlowService;
  private readonly literatureRetrievalService: LiteratureRetrievalService;
  private readonly literatureAcquisitionSettingsService?: Pick<LiteratureAcquisitionSettingsService, 'resolveDownloaderOptions'>;

  async collectionImport(request: LiteratureCollectionImportRequest): Promise<LiteratureCollectionImportResponse> {
    if (request.items.length === 0) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Collection import items cannot be empty.');
    }

    const results: LiteratureCollectionImportResponse['results'] = [];
    const failures: NonNullable<LiteratureCollectionImportResponse['failures']> = [];

    for (let requestIndex = 0; requestIndex < request.items.length; requestIndex += 1) {
      const item = request.items[requestIndex]!;
      // T-130 W-07 (L-09): one bad item must not abort the batch — writes for an item are
      // ordered literature → source → flow-state, so a mid-item failure leaves a dedupable
      // record that a re-import self-heals; the failure is reported instead of thrown.
      try {
        await this.importCollectionItem(item, requestIndex, results);
      } catch (error) {
        failures.push({
          request_index: requestIndex,
          title: item.title ?? '',
          error_code: error instanceof AppError ? error.errorCode : 'INTERNAL_ERROR',
          error_message: error instanceof Error ? error.message : 'Collection import item failed.',
        });
      }
    }

    if (results.length === 0 && failures.length > 0) {
      // All items failed — keep the pre-W-07 contract for total failure (surface the error).
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        `All ${failures.length} collection import items failed; first: ${failures[0]!.error_message}`,
        { failures },
      );
    }

    return failures.length > 0 ? { results, failures } : { results };
  }

  private async importCollectionItem(
    item: LiteratureCollectionImportItem,
    requestIndex: number,
    results: LiteratureCollectionImportResponse['results'],
  ): Promise<void> {
    {
      const now = new Date().toISOString();
      const normalized = this.normalizeImportItem(item);
      const dedup = await this.findExisting(normalized);

      let literatureRecord: LiteratureRecord;
      let isNew = false;

      if (dedup.literature) {
        const previous = dedup.literature;
        const nextTitle = previous.title || normalized.title;
        const nextAuthors = previous.authors.length > 0 ? previous.authors : normalized.authors ?? [];
        const nextYear = previous.year ?? normalized.year ?? null;
        const nextDoi = previous.doiNormalized ?? this.normalizeDoi(normalized.doi);
        const nextArxivId = previous.arxivId ?? this.normalizeArxivId(normalized.arxiv_id);
        const nextAbstract = previous.abstractText || normalized.abstract || null;
        const nextRightsClass = this.resolveRightsClass(previous.rightsClass, normalized.rights_class);
        const nextTags = this.mergeTags(previous.tags, normalized.tags ?? []);
        const nextNormalizedTitle = this.normalizeTitle(nextTitle);
        const nextTitleAuthorsYearHash = this.buildTitleAuthorsYearHashFromFields(
          nextTitle,
          nextAuthors,
          nextYear,
        );
        const citationChanged = nextTitle !== previous.title
          || !this.stringArraysEqual(nextAuthors, previous.authors)
          || nextYear !== previous.year
          || nextDoi !== previous.doiNormalized
          || nextArxivId !== previous.arxivId
          || nextNormalizedTitle !== previous.normalizedTitle
          || nextTitleAuthorsYearHash !== previous.titleAuthorsYearHash;
        const abstractChanged = previous.abstractText !== nextAbstract;
        await this.assertDedupUniqueness(previous.id, {
          doiNormalized: nextDoi,
          arxivId: nextArxivId,
          titleAuthorsYearHash: nextTitleAuthorsYearHash,
        });
        literatureRecord = {
          ...previous,
          title: nextTitle,
          abstractText: nextAbstract,
          keyContentDigest: previous.keyContentDigest,
          authors: nextAuthors,
          year: nextYear,
          doiNormalized: nextDoi,
          arxivId: nextArxivId,
          normalizedTitle: nextNormalizedTitle,
          titleAuthorsYearHash: nextTitleAuthorsYearHash,
          rightsClass: nextRightsClass,
          tags: nextTags,
          updatedAt: now,
        };
        literatureRecord = await this.literatureRepository.updateLiterature(literatureRecord);
        await this.markCollectionImportStale(literatureRecord.id, {
          citationChanged: citationChanged || dedup.matchedBy !== 'none',
          abstractChanged,
        });
      } else {
        isNew = true;
        const literatureId = await this.nextLiteratureId();
        const dedupKeys = this.buildDedupCandidate(normalized);
        literatureRecord = await this.literatureRepository.createLiterature({
          id: literatureId,
          title: normalized.title,
          abstractText: normalized.abstract ?? null,
          keyContentDigest: null,
          authors: normalized.authors ?? [],
          year: normalized.year ?? null,
          doiNormalized: dedupKeys.doiNormalized,
          arxivId: dedupKeys.arxivId,
          normalizedTitle: this.normalizeTitle(normalized.title),
          titleAuthorsYearHash: dedupKeys.titleAuthorsYearHash,
          rightsClass: normalized.rights_class ?? 'UNKNOWN',
          tags: normalized.tags ?? [],
          activeEmbeddingVersionId: null,
          createdAt: now,
          updatedAt: now,
        });
      }

      await this.literatureRepository.upsertLiteratureSource({
        id: await this.nextLiteratureSourceId(),
        literatureId: literatureRecord.id,
        provider: normalized.provider,
        sourceItemId: normalized.external_id,
        sourceUrl: normalized.source_url,
        rawPayload: {
          ...(normalized as unknown as Record<string, unknown>),
          canonical_work_key: this.toCanonicalWorkKey(literatureRecord),
          matched_by: dedup.matchedBy,
        },
        fetchedAt: now,
      });

      await this.literatureFlowService.recordCollectionUpserted({
        literatureId: literatureRecord.id,
        dedupStatus: dedup.matchedBy === 'none' ? 'unique' : 'duplicate',
      });

      results.push({
        literature_id: literatureRecord.id,
        canonical_work_key: this.toCanonicalWorkKey(literatureRecord),
        is_new: isNew,
        matched_by: dedup.matchedBy,
        title: literatureRecord.title,
        source_provider: normalized.provider,
        source_url: normalized.source_url,
        request_index: requestIndex,
      });
    }
  }

  async importFromAutoPull(request: LiteratureCollectionImportRequest): Promise<LiteratureCollectionImportResponse> {
    return this.collectionImport(request);
  }

  classifyAutoPullScore(score: number): EvidenceActivationClassification {
    return this.evidenceActivationService.classifyAutoPullScore(score);
  }

  async recordAutoPullQualityAssessment(input: {
    literatureId: string;
    score: number;
    rankingScore: number;
    rankingMode: string;
    source: string;
  }): Promise<void> {
    await this.evidenceActivationService.upsertAutoPullAssessment(input);
  }

  async findCollectionDedupMatch(item: LiteratureCollectionImportItem): Promise<DedupMatchType> {
    const normalized = this.normalizeImportItem(item);
    const dedup = await this.findExisting(normalized);
    return dedup.matchedBy;
  }

  async zoteroCollectionPreview(request: ZoteroPreviewRequest): Promise<ZoteroPreviewResponse> {
    const items = await this.fetchZoteroImportItems(request);
    return {
      fetched_count: items.length,
      items,
    };
  }


  async zoteroCollectionImport(request: ZoteroImportRequest): Promise<ZoteroImportResponse> {
    const topicId = request.topic_id?.trim();
    const scopeStatus = request.scope_status ?? 'in_scope';
    const scopeReason = request.scope_reason?.trim() || undefined;
    const importItems = await this.fetchZoteroImportItems(request);

    const imported = importItems.length > 0
      ? await this.collectionImport({ items: importItems })
      : { results: [] };
    const importedIds = imported.results.map((row) => row.literature_id);
    let scopeUpsertedCount = 0;

    if (topicId && importedIds.length > 0) {
      await this.upsertTopicScope(topicId, {
        actions: importedIds.map((literatureId) => ({
          literature_id: literatureId,
          scope_status: scopeStatus,
          reason: scopeReason,
        })),
      });
      scopeUpsertedCount = importedIds.length;
    }

    return {
      topic_id: topicId || undefined,
      imported_count: imported.results.length,
      scope_upserted_count: scopeUpsertedCount,
      results: imported.results,
    };
  }

  private async fetchZoteroImportItems(request: ZoteroImportRequest): Promise<LiteratureCollectionImportItem[]> {
    const limit = this.resolveZoteroLimit(request.limit);
    const query = request.query?.trim();
    const libraryId = request.library_id.trim();
    const baseTags = this.normalizeTags(request.tags ?? []);
    const rightsClass = request.rights_class ?? 'USER_AUTH';

    const url = new URL(
      `https://api.zotero.org/${request.library_type}/${encodeURIComponent(libraryId)}/items/top`,
    );
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('sort', 'dateModified');
    url.searchParams.set('direction', 'desc');
    if (query) {
      url.searchParams.set('q', query);
    }

    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    const apiKey = request.api_key?.trim();
    if (apiKey) {
      headers['Zotero-API-Key'] = apiKey;
    }

    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new AppError(
        502,
        'INTERNAL_ERROR',
        `Zotero request failed with status ${response.status}.`,
      );
    }

    const payload = (await response.json()) as Array<Record<string, unknown>>;
    return payload
      .map((entry) =>
        this.mapZoteroEntryToImportItem(entry, {
          libraryType: request.library_type,
          libraryId,
          tags: baseTags,
          rightsClass,
        }),
      )
      .filter((item): item is LiteratureCollectionImportItem => item !== null);
  }

  async getOverview(query: LiteratureOverviewQuery): Promise<LiteratureOverviewResponse> {
    const topicId = query.topic_id?.trim();
    const paperId = query.paper_id?.trim();
    if (!topicId && !paperId) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Either topic_id or paper_id is required.');
    }

    const topicScopes = topicId
      ? await this.literatureRepository.listTopicScopesByTopicId(topicId)
      : [];

    let paperLinks = [] as Awaited<ReturnType<LiteratureRepository['listPaperLiteratureLinksByPaperId']>>;
    if (paperId) {
      const paper = await this.researchRepository.findPaperById(paperId);
      if (!paper) {
        throw new AppError(404, 'NOT_FOUND', `Paper ${paperId} not found.`);
      }
      paperLinks = await this.literatureRepository.listPaperLiteratureLinksByPaperId(paper.id);
    }

    const literatureIds = [...new Set([
      ...topicScopes.map((scope) => scope.literatureId),
      ...paperLinks.map((link) => link.literatureId),
    ])];

    const literatures = await this.literatureRepository.listLiteraturesByIds(literatureIds);
    const literatureMap = new Map(literatures.map((row) => [row.id, row]));
    const pipelineStateMap = await this.literatureFlowService.refreshPipelineStatesByLiteratureIds(literatureIds);
    const pipelineStageStates = await this.literatureRepository.listPipelineStageStatesByLiteratureIds(literatureIds);
    const qualityAssessments = await this.literatureRepository.listQualityAssessmentsByLiteratureIds(literatureIds);
    const qualityByLiterature = new Map(qualityAssessments.map((record) => [record.literatureId, record]));
    const pipelineStageStatesByLiterature = new Map<string, LiteraturePipelineStageStateRecord[]>();
    for (const stageState of pipelineStageStates) {
      const rows = pipelineStageStatesByLiterature.get(stageState.literatureId) ?? [];
      rows.push(stageState);
      pipelineStageStatesByLiterature.set(stageState.literatureId, rows);
    }

    const scopeStatusByLiterature = new Map<string, TopicScopeStatus>();
    const activationByLiterature = new Map<string, Awaited<ReturnType<LiteratureRepository['listTopicScopesByTopicId']>>[number]>();
    for (const scope of topicScopes) {
      scopeStatusByLiterature.set(scope.literatureId, scope.scopeStatus);
      activationByLiterature.set(scope.literatureId, scope);
    }

    const citationStatusByLiterature = new Map<string, PaperCitationStatus>();
    for (const link of paperLinks) {
      citationStatusByLiterature.set(link.literatureId, link.citationStatus);
    }

    const providerCounts = new Map<LiteratureProvider, number>();
    const rightsCounts = new Map<RightsClass, number>();
    const activationStatusCounts = new Map<string, number>();
    const qualityStatusCounts = new Map<string, number>();
    const tagCounts = new Map<string, number>();
    const items: LiteratureOverviewResponse['items'] = [];

    for (const literatureId of literatureIds) {
      const literature = literatureMap.get(literatureId);
      if (!literature) {
        continue;
      }

      rightsCounts.set(literature.rightsClass, (rightsCounts.get(literature.rightsClass) ?? 0) + 1);
      for (const tag of literature.tags) {
        tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
      }

      const sources = await this.literatureRepository.listSourcesByLiteratureId(literatureId);
      const latestSource = sources[sources.length - 1] ?? null;
      const providers = [...new Set(sources.map((source) => source.provider))];
      for (const provider of providers) {
        providerCounts.set(provider, (providerCounts.get(provider) ?? 0) + 1);
      }

      const pipelineStateRecord = pipelineStateMap.get(literature.id);
      const stageStates = pipelineStageStatesByLiterature.get(literature.id) ?? [];
      const normalizedPipelineState = this.literatureFlowService.buildPipelineStateDTO(
        pipelineStateRecord ?? {
          id: `__virtual_${literature.id}`,
          literatureId: literature.id,
          citationComplete: false,
          abstractReady: false,
          keyContentReady: false,
          dedupStatus: 'unknown',
          updatedAt: new Date(0).toISOString(),
        },
        stageStates,
      );
      const stageStatusMap = this.literatureFlowService.buildStageStatusMap(stageStates);
      const pipelineActions = this.literatureFlowService.buildOverviewPipelineActions({
        topicScopeStatus: scopeStatusByLiterature.get(literature.id) ?? null,
        rightsClass: literature.rightsClass,
        pipelineState: normalizedPipelineState,
        stageStatusMap,
      });
      const activation = activationByLiterature.get(literature.id);
      const qualityAssessment = qualityByLiterature.get(literature.id);
      if (activation) {
        activationStatusCounts.set(
          activation.activationStatus,
          (activationStatusCounts.get(activation.activationStatus) ?? 0) + 1,
        );
      }
      if (qualityAssessment) {
        qualityStatusCounts.set(
          qualityAssessment.qualityStatus,
          (qualityStatusCounts.get(qualityAssessment.qualityStatus) ?? 0) + 1,
        );
      }

      items.push({
        literature_id: literature.id,
        canonical_work_key: this.toCanonicalWorkKey(literature),
        title: literature.title,
        authors: literature.authors,
        year: literature.year,
        doi: literature.doiNormalized,
        arxiv_id: literature.arxivId,
        rights_class: literature.rightsClass,
        tags: literature.tags,
        providers,
        source_url: latestSource?.sourceUrl ?? null,
        source_updated_at: latestSource?.fetchedAt ?? null,
        topic_scope_status: scopeStatusByLiterature.get(literature.id),
        evidence_activation_status: activation?.activationStatus,
        evidence_activation_reason: activation?.activationReason ?? null,
        evidence_activation_score: activation?.activationScore ?? null,
        evidence_activated_at: activation?.activatedAt ?? null,
        quality_assessment: qualityAssessment
          ? this.evidenceActivationService.toQualityAssessmentDTO(qualityAssessment)
          : null,
        citation_status: citationStatusByLiterature.get(literature.id),
        overview_status: this.literatureFlowService.resolveOverviewStatus({
          topicScopeStatus: scopeStatusByLiterature.get(literature.id) ?? null,
          citationComplete: normalizedPipelineState.citation_complete,
          abstractReady: normalizedPipelineState.abstract_ready,
          keyContentReady: normalizedPipelineState.key_content_ready,
        }),
        content_processing_state: {
          citation_complete: normalizedPipelineState.citation_complete,
          abstract_ready: normalizedPipelineState.abstract_ready,
          key_content_ready: normalizedPipelineState.key_content_ready,
          fulltext_preprocessed: normalizedPipelineState.fulltext_preprocessed,
          chunked: normalizedPipelineState.chunked,
          embedded: normalizedPipelineState.embedded,
          indexed: normalizedPipelineState.indexed,
        },
        content_processing_stage_status: stageStatusMap,
        content_processing_actions: pipelineActions,
      });
    }

    const sortedItems = items.sort((left, right) => {
      const yearLeft = left.year ?? 0;
      const yearRight = right.year ?? 0;
      if (yearLeft !== yearRight) {
        return yearRight - yearLeft;
      }
      return left.title.localeCompare(right.title);
    });

    return {
      topic_id: topicId || undefined,
      paper_id: paperId || undefined,
      summary: {
        total_literatures: sortedItems.length,
        topic_scope_total: topicScopes.length,
        in_scope_count: topicScopes.filter((scope) => scope.scopeStatus === 'in_scope').length,
        excluded_count: topicScopes.filter((scope) => scope.scopeStatus === 'excluded').length,
        paper_link_total: paperLinks.length,
        cited_count: paperLinks.filter((link) => link.citationStatus === 'cited').length,
        used_count: paperLinks.filter((link) => link.citationStatus === 'used').length,
        provider_counts: [...providerCounts.entries()]
          .map(([provider, count]) => ({ provider, count }))
          .sort((left, right) => right.count - left.count),
        rights_class_counts: [...rightsCounts.entries()]
          .map(([rightsClass, count]) => ({ rights_class: rightsClass, count }))
          .sort((left, right) => right.count - left.count),
        activation_status_counts: [...activationStatusCounts.entries()]
          .map(([activationStatus, count]) => ({
            activation_status: activationStatus as LiteratureOverviewResponse['summary']['activation_status_counts'][number]['activation_status'],
            count,
          }))
          .sort((left, right) => right.count - left.count),
        quality_status_counts: [...qualityStatusCounts.entries()]
          .map(([qualityStatus, count]) => ({
            quality_status: qualityStatus as LiteratureOverviewResponse['summary']['quality_status_counts'][number]['quality_status'],
            count,
          }))
          .sort((left, right) => right.count - left.count),
        top_tags: [...tagCounts.entries()]
          .map(([tag, count]) => ({ tag, count }))
          .sort((left, right) => right.count - left.count)
          .slice(0, 10),
      },
      items: sortedItems,
    };
  }

  async getTopicScope(topicId: string): Promise<TopicLiteratureScopeResponse> {
    const scopes = await this.literatureRepository.listTopicScopesByTopicId(topicId);
    const literatures = await this.literatureRepository.listLiteraturesByIds(
      scopes.map((scope) => scope.literatureId),
    );
    const literatureMap = new Map(literatures.map((row) => [row.id, row]));
    const qualityAssessments = await this.literatureRepository.listQualityAssessmentsByLiteratureIds(
      scopes.map((scope) => scope.literatureId),
    );
    const qualityByLiterature = new Map(qualityAssessments.map((record) => [record.literatureId, record]));

    return {
      topic_id: topicId,
      items: scopes
        .map((scope) => {
          const literature = literatureMap.get(scope.literatureId);
          if (!literature) {
            return null;
          }

          return {
            scope_id: scope.id,
            topic_id: scope.topicId,
            literature_id: scope.literatureId,
            scope_status: scope.scopeStatus,
            reason: scope.reason ?? undefined,
            activation_status: scope.activationStatus,
            activation_reason: scope.activationReason,
            activation_score: scope.activationScore,
            activated_at: scope.activatedAt,
            updated_at: scope.updatedAt,
            title: literature.title,
            authors: literature.authors,
            year: literature.year,
            doi: literature.doiNormalized,
            arxiv_id: literature.arxivId,
            quality_assessment: qualityByLiterature.get(scope.literatureId)
              ? this.evidenceActivationService.toQualityAssessmentDTO(qualityByLiterature.get(scope.literatureId)!)
              : null,
          };
        })
        .filter((item) => item !== null),
    };
  }

  async upsertTopicScope(
    topicId: string,
    request: UpsertTopicLiteratureScopeRequest,
  ): Promise<TopicLiteratureScopeResponse> {
    const now = new Date().toISOString();
    const existingScopes = new Map(
      (await this.literatureRepository.listTopicScopesByTopicId(topicId))
        .map((scope) => [scope.literatureId, scope]),
    );

    for (const action of request.actions) {
      const literature = await this.literatureRepository.findLiteratureById(action.literature_id);
      if (!literature) {
        throw new AppError(
          404,
          'NOT_FOUND',
          `Literature ${action.literature_id} not found.`,
        );
      }

      const existing = existingScopes.get(action.literature_id);
      const defaultActivation = this.evidenceActivationService.defaultActivationForScopeStatus(action.scope_status);
      const activationStatus = action.scope_status === 'excluded'
        ? 'excluded'
        : action.activation_status ?? existing?.activationStatus ?? defaultActivation.activationStatus;
      await this.literatureRepository.upsertTopicScope({
        id: await this.nextTopicScopeId(),
        topicId,
        literatureId: action.literature_id,
        scopeStatus: action.scope_status,
        reason: action.reason ?? null,
        activationStatus,
        activationReason: action.scope_status === 'excluded'
          ? defaultActivation.reason
          : action.activation_reason ?? existing?.activationReason ?? defaultActivation.reason,
        activationScore: action.scope_status === 'excluded' ? null : action.activation_score ?? existing?.activationScore ?? null,
        activatedAt: action.scope_status === 'excluded' ? null : existing?.activatedAt ?? null,
        createdAt: now,
        updatedAt: now,
      });
      const nextScope = (await this.literatureRepository.listTopicScopesByTopicId(topicId))
        .find((scope) => scope.literatureId === action.literature_id);
      if (nextScope) {
        await this.evidenceActivationService.refreshTopicActivation(nextScope);
      }
    }

    return this.getTopicScope(topicId);
  }

  async updateTopicEvidenceActivation(
    topicId: string,
    request: UpdateTopicLiteratureEvidenceActivationRequest,
  ): Promise<TopicLiteratureScopeResponse> {
    const now = new Date().toISOString();
    const existingScopes = new Map(
      (await this.literatureRepository.listTopicScopesByTopicId(topicId))
        .map((scope) => [scope.literatureId, scope]),
    );
    for (const action of request.actions) {
      const scope = existingScopes.get(action.literature_id);
      if (!scope) {
        throw new AppError(404, 'NOT_FOUND', `Topic scope ${topicId}/${action.literature_id} not found.`);
      }
      const activatedAt = action.activation_status === 'active'
        ? scope.activatedAt ?? now
        : null;
      const activationReason = action.reason ?? `MANUAL_${action.activation_status.toUpperCase()}`;
      if (action.activation_status === 'active') {
        await this.evidenceActivationService.upsertManualReviewAssessment({
          literatureId: action.literature_id,
          qualityScore: action.activation_score ?? scope.activationScore,
          reason: activationReason,
        });
      }
      await this.literatureRepository.updateTopicScopeActivation(topicId, action.literature_id, {
        activationStatus: action.activation_status,
        activationReason,
        activationScore: action.activation_score ?? scope.activationScore,
        activatedAt,
        updatedAt: now,
      });
    }
    const updatedScopes = await this.literatureRepository.listTopicScopesByTopicId(topicId);
    await Promise.all(updatedScopes.map((scope) => this.evidenceActivationService.refreshTopicActivation(scope)));
    return this.getTopicScope(topicId);
  }

  async syncPaperLiteratureFromTopic(
    paperId: string,
    request: SyncPaperLiteratureFromTopicRequest,
  ): Promise<SyncPaperLiteratureFromTopicResponse> {
    const paper = await this.researchRepository.findPaperById(paperId);
    if (!paper) {
      throw new AppError(404, 'NOT_FOUND', `Paper ${paperId} not found.`);
    }

    const topicId = request.topic_id.trim();
    const now = new Date().toISOString();
    const scopes = await this.literatureRepository.listTopicScopesByTopicId(topicId);
    const evidenceActiveIds = await this.evidenceActivationService.resolveTopicEvidenceActiveLiteratureIds(topicId);
    const evidenceActiveRows = scopes.filter((scope) => evidenceActiveIds.has(scope.literatureId));

    let linkedCount = 0;
    let skippedCount = scopes.length - evidenceActiveRows.length;

    for (const scope of evidenceActiveRows) {
      const upserted = await this.literatureRepository.upsertPaperLiteratureLink({
        id: await this.nextPaperLiteratureLinkId(),
        paperId: paper.id,
        topicId,
        literatureId: scope.literatureId,
        citationStatus: 'seeded',
        note: null,
        createdAt: now,
        updatedAt: now,
      });

      if (upserted.created) {
        linkedCount += 1;
      } else {
        skippedCount += 1;
      }
    }

    return {
      paper_id: paper.id,
      topic_id: topicId,
      linked_count: linkedCount,
      skipped_count: skippedCount,
    };
  }

  async getPaperLiterature(paperId: string): Promise<GetPaperLiteratureResponse> {
    const paper = await this.researchRepository.findPaperById(paperId);
    if (!paper) {
      throw new AppError(404, 'NOT_FOUND', `Paper ${paperId} not found.`);
    }

    const links = await this.literatureRepository.listPaperLiteratureLinksByPaperId(paper.id);
    const literatures = await this.literatureRepository.listLiteraturesByIds(
      links.map((link) => link.literatureId),
    );
    const literatureMap = new Map(literatures.map((row) => [row.id, row]));
    const views: PaperLiteratureLinkView[] = [];

    for (const link of links) {
      const literature = literatureMap.get(link.literatureId);
      if (!literature) {
        continue;
      }

      const sources = await this.literatureRepository.listSourcesByLiteratureId(link.literatureId);
      const latestSource = sources[sources.length - 1] ?? null;

      views.push({
        link_id: link.id,
        paper_id: link.paperId,
        topic_id: link.topicId,
        literature_id: link.literatureId,
        citation_status: link.citationStatus,
        note: link.note,
        created_at: link.createdAt,
        updated_at: link.updatedAt,
        title: literature.title,
        authors: literature.authors,
        year: literature.year,
        doi: literature.doiNormalized,
        arxiv_id: literature.arxivId,
        source_provider: latestSource?.provider ?? null,
        source_url: latestSource?.sourceUrl ?? null,
        tags: literature.tags,
      });
    }

    return {
      paper_id: paper.id,
      items: views,
    };
  }

  async updatePaperLiteratureLink(
    paperId: string,
    linkId: string,
    request: UpdatePaperLiteratureLinkRequest,
  ): Promise<UpdatePaperLiteratureLinkResponse> {
    if (request.citation_status === undefined && request.note === undefined) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        'At least one field is required for paper literature update.',
      );
    }

    const existingLink = await this.literatureRepository.findPaperLiteratureLinkById(linkId);
    if (!existingLink || existingLink.paperId !== paperId) {
      throw new AppError(404, 'NOT_FOUND', `Paper literature link ${linkId} not found.`);
    }

    const updated = await this.literatureRepository.updatePaperLiteratureLink(linkId, {
      citationStatus: request.citation_status,
      note: request.note === undefined ? undefined : request.note,
    });

    const response = await this.getPaperLiterature(updated.paperId);
    const item = response.items.find((row) => row.link_id === updated.id);
    if (!item) {
      throw new AppError(500, 'INVALID_PAYLOAD', 'Paper literature link render failed.');
    }

    return {
      paper_id: response.paper_id,
      item,
    };
  }

  async updateLiteratureMetadata(
    literatureId: string,
    request: UpdateLiteratureMetadataRequest,
  ): Promise<UpdateLiteratureMetadataResponse> {
    const existing = await this.literatureRepository.findLiteratureById(literatureId);
    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', `Literature ${literatureId} not found.`);
    }

    const nextTitle = request.title === undefined ? existing.title : request.title.trim();
    if (!nextTitle) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'title cannot be empty.');
    }

    const nextAbstract = request.abstract === undefined
      ? existing.abstractText
      : request.abstract === null
        ? null
        : request.abstract.trim() || null;
    const nextAuthors = request.authors === undefined
      ? existing.authors
      : request.authors.map((author) => author.trim()).filter((author) => author.length > 0);
    const nextYear = request.year === undefined ? existing.year : request.year;
    const nextDoi = request.doi === undefined
      ? existing.doiNormalized
      : this.normalizeDoi(request.doi ?? undefined);
    const nextArxivId = request.arxiv_id === undefined
      ? existing.arxivId
      : this.normalizeArxivId(request.arxiv_id ?? undefined);
    const nextRightsClass = request.rights_class ?? existing.rightsClass;
    const nextTags = request.tags === undefined ? existing.tags : this.normalizeTags(request.tags);
    const nextKeyContentDigest = request.key_content_digest === undefined
      ? existing.keyContentDigest
      : request.key_content_digest === null
        ? null
        : request.key_content_digest.trim() || null;
    const nextHash = this.buildTitleAuthorsYearHashFromFields(nextTitle, nextAuthors, nextYear);
    const citationChanged = nextTitle !== existing.title
      || !this.stringArraysEqual(nextAuthors, existing.authors)
      || nextYear !== existing.year
      || nextDoi !== existing.doiNormalized
      || nextArxivId !== existing.arxivId;
    const abstractChanged = nextAbstract !== existing.abstractText;

    await this.assertDedupUniqueness(literatureId, {
      doiNormalized: nextDoi,
      arxivId: nextArxivId,
      titleAuthorsYearHash: nextHash,
    });

    const now = new Date().toISOString();
    const updated = await this.literatureRepository.updateLiterature({
      ...existing,
      title: nextTitle,
      abstractText: nextAbstract,
      authors: nextAuthors,
      year: nextYear,
      doiNormalized: nextDoi,
      arxivId: nextArxivId,
      normalizedTitle: this.normalizeTitle(nextTitle),
      titleAuthorsYearHash: nextHash,
      rightsClass: nextRightsClass,
      tags: nextTags,
      keyContentDigest: nextKeyContentDigest,
      updatedAt: now,
    });

    await this.literatureFlowService.refreshContentProcessingState(updated.id);
    if (citationChanged) {
      await this.literatureFlowService.markStagesStale({
        literatureId: updated.id,
        stages: ['CITATION_NORMALIZED', 'KEY_CONTENT_READY', 'CHUNKED', 'EMBEDDED', 'INDEXED'],
        reasonCode: 'CITATION_METADATA_CHANGED',
        reasonMessage: 'Citation identity metadata changed.',
      });
    }
    if (abstractChanged) {
      await this.literatureFlowService.markStagesStale({
        literatureId: updated.id,
        stages: ['ABSTRACT_READY', 'KEY_CONTENT_READY', 'CHUNKED', 'EMBEDDED', 'INDEXED'],
        reasonCode: 'ABSTRACT_CHANGED',
        reasonMessage: 'Abstract text changed.',
      });
    }
    return {
      literature_id: updated.id,
      canonical_work_key: this.toCanonicalWorkKey(updated),
      title: updated.title,
      abstract: updated.abstractText,
      key_content_digest: updated.keyContentDigest,
      authors: updated.authors,
      year: updated.year,
      doi: updated.doiNormalized,
      arxiv_id: updated.arxivId,
      rights_class: updated.rightsClass,
      tags: updated.tags,
      updated_at: updated.updatedAt,
    };
  }

  async getLiteratureMetadata(literatureId: string): Promise<GetLiteratureMetadataResponse> {
    const literature = await this.literatureRepository.findLiteratureById(literatureId);
    if (!literature) {
      throw new AppError(404, 'NOT_FOUND', `Literature ${literatureId} not found.`);
    }

    return {
      literature_id: literature.id,
      canonical_work_key: this.toCanonicalWorkKey(literature),
      title: literature.title,
      abstract: literature.abstractText,
      key_content_digest: literature.keyContentDigest,
      updated_at: literature.updatedAt,
    };
  }

  async registerContentAsset(
    literatureId: string,
    request: RegisterLiteratureContentAssetRequest,
  ): Promise<RegisterLiteratureContentAssetResponse> {
    const literature = await this.literatureRepository.findLiteratureById(literatureId);
    if (!literature) {
      throw new AppError(404, 'NOT_FOUND', `Literature ${literatureId} not found.`);
    }

    const requestedLocalPath = request.local_path.trim();
    if (!requestedLocalPath) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'local_path must not be empty.');
    }
    if (!path.isAbsolute(requestedLocalPath)) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'local_path must be an absolute filesystem path.');
    }
    const localPath = path.resolve(requestedLocalPath);

    const sourceKind = request.source_kind ?? 'local_path';
    if (sourceKind !== 'local_path') {
      throw new AppError(400, 'INVALID_PAYLOAD', `Unsupported content asset source_kind ${sourceKind}.`);
    }

    const detected = await this.inspectLocalAsset(localPath, {
      checksum: request.checksum,
      byteSize: request.byte_size,
    });
    const now = new Date().toISOString();
    const assetKind = request.asset_kind ?? 'raw_fulltext';
    const status = detected.readable ? 'registered' : 'missing';
    const metadata = await this.withStorageCoalescingMetadata({
      literatureId,
      assetKind,
      localPath,
      checksum: detected.checksum,
      status,
      metadata: request.metadata ?? {},
      detectedAt: now,
    });
    const asset = await this.literatureRepository.upsertContentAsset({
      id: crypto.randomUUID(),
      literatureId,
      assetKind,
      sourceKind,
      localPath,
      checksum: detected.checksum,
      mimeType: request.mime_type?.trim() || this.inferMimeType(localPath),
      byteSize: detected.byteSize,
      rightsClass: request.rights_class ?? literature.rightsClass,
      status,
      metadata,
      createdAt: now,
      updatedAt: now,
    });

    if (asset.record.assetKind === 'raw_fulltext') {
      await this.literatureFlowService.markStagesStale({
        literatureId,
        stages: ['FULLTEXT_PREPROCESSED', 'KEY_CONTENT_READY', 'CHUNKED', 'EMBEDDED', 'INDEXED'],
        reasonCode: 'RAW_FULLTEXT_ASSET_CHANGED',
        reasonMessage: 'A raw fulltext asset was registered or updated.',
      });
    }

    return { item: this.toContentAssetDTO(asset.record) };
  }

  private async withStorageCoalescingMetadata(input: {
    literatureId: string;
    assetKind: LiteratureContentAssetRecord['assetKind'];
    localPath: string;
    checksum: string;
    status: LiteratureContentAssetRecord['status'];
    metadata: Record<string, unknown>;
    detectedAt: string;
  }): Promise<Record<string, unknown>> {
    if (
      input.assetKind !== 'raw_fulltext'
      || !['registered', 'ready'].includes(input.status)
      || !input.checksum.trim()
    ) {
      return input.metadata;
    }

    const checksumMatches = (await this.literatureRepository.listContentAssetsByChecksum(input.checksum))
      .filter((asset) => asset.assetKind === 'raw_fulltext' && ['registered', 'ready'].includes(asset.status));
    const existingSelf = checksumMatches.find((asset) =>
      asset.literatureId === input.literatureId && asset.localPath === input.localPath,
    );
    const candidates = checksumMatches.filter((asset) =>
      asset.literatureId !== input.literatureId || asset.localPath !== input.localPath,
    );
    if (candidates.length === 0) {
      const metadata = { ...input.metadata };
      delete metadata.storage_coalescing;
      return metadata;
    }
    const currentComparable = {
      id: existingSelf?.id ?? null,
      literatureId: input.literatureId,
      localPath: input.localPath,
      createdAt: existingSelf?.createdAt ?? input.detectedAt,
    };
    const canonical = [
      ...candidates.map((asset) => ({
        id: asset.id,
        literatureId: asset.literatureId,
        localPath: asset.localPath,
        createdAt: asset.createdAt,
      })),
      currentComparable,
    ].sort((left, right) => {
      if (left.createdAt !== right.createdAt) {
        return left.createdAt.localeCompare(right.createdAt);
      }
      if (left.literatureId !== right.literatureId) {
        return left.literatureId.localeCompare(right.literatureId);
      }
      return (left.id ?? '').localeCompare(right.id ?? '');
    })[0];
    if (!canonical || canonical === currentComparable || canonical.id === null) {
      const metadata = { ...input.metadata };
      delete metadata.storage_coalescing;
      return metadata;
    }

    return {
      ...input.metadata,
      storage_coalescing: {
        status: 'candidate',
        strategy: 'same_checksum_reuse_candidate_v1',
        checksum: input.checksum,
        canonical_asset_id: canonical.id,
        canonical_literature_id: canonical.literatureId,
        canonical_local_path: canonical.localPath,
        candidate_count: candidates.length,
        destructive_cleanup_allowed: false,
        detected_at: input.detectedAt,
      },
    };
  }

  async downloadContentAsset(
    literatureId: string,
    request: DownloadLiteratureContentAssetRequest,
  ): Promise<DownloadLiteratureContentAssetResponse> {
    const literature = await this.literatureRepository.findLiteratureById(literatureId);
    if (!literature) {
      throw new AppError(404, 'NOT_FOUND', `Literature ${literatureId} not found.`);
    }

    const sourceUrl = this.normalizeDownloadUrl(request.source_url);
    const downloadPolicy = await this.resolveDownloadPolicy(request.max_byte_size);
    let response: Response;
    let finalUrl = sourceUrl.toString();
    let redirectChain: string[] = [];
    try {
      const fetched = await this.fetchDownloadResponse(sourceUrl, downloadPolicy);
      response = fetched.response;
      finalUrl = fetched.finalUrl;
      redirectChain = fetched.redirectChain;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        502,
        'INTERNAL_ERROR',
        `Content asset download failed: ${error instanceof Error ? error.message : 'unknown network error'}.`,
      );
    }

    if (!response.ok) {
      throw new AppError(
        502,
        'INTERNAL_ERROR',
        `Content asset download failed with status ${response.status}.`,
      );
    }

    const contentLengthHeader = response.headers.get('content-length');
    const contentLength = contentLengthHeader ? Number.parseInt(contentLengthHeader, 10) : null;
    if (contentLength !== null && Number.isFinite(contentLength) && contentLength > downloadPolicy.maxByteSize) {
      throw new AppError(
        413,
        'INVALID_PAYLOAD',
        `Downloaded content exceeds max_byte_size ${downloadPolicy.maxByteSize}.`,
      );
    }

    const buffer = await this.readResponseBuffer(response, downloadPolicy.maxByteSize);
    if (buffer.length === 0) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Downloaded content is empty.');
    }

    const responseMimeType = this.normalizeMimeType(response.headers.get('content-type'));
    const mimeType = request.mime_type?.trim() || responseMimeType || this.inferMimeType(sourceUrl.pathname);
    if (
      (request.asset_kind ?? 'raw_fulltext') === 'raw_fulltext'
      && !this.isPdfLikeDownload(mimeType, buffer, downloadPolicy.requirePdfSignature)
    ) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        'Downloaded raw_fulltext must be a PDF response or start with a PDF signature.',
      );
    }
    const directory = path.join(await this.resolveRawFilesRoot(), this.safePathSegment(literatureId));
    await fs.mkdir(directory, { recursive: true });
    const fileName = this.buildDownloadedFileName({
      requestedFileName: request.file_name,
      contentDisposition: response.headers.get('content-disposition'),
      sourceUrl,
      mimeType,
    });
    const localPath = path.join(directory, `${Date.now()}-${crypto.randomUUID()}-${fileName}`);
    await fs.writeFile(localPath, buffer);

    const checksum = crypto.createHash('sha256').update(buffer).digest('hex');
    return this.registerContentAsset(literatureId, {
      asset_kind: request.asset_kind ?? 'raw_fulltext',
      local_path: localPath,
      checksum,
      byte_size: buffer.length,
      mime_type: mimeType,
      rights_class: request.rights_class ?? literature.rightsClass,
      metadata: {
        ...(request.metadata ?? {}),
        downloaded_from: sourceUrl.toString(),
        final_url: finalUrl,
        redirect_chain: redirectChain,
        content_length: buffer.length,
      },
    });
  }

  async listContentAssets(literatureId: string): Promise<ListLiteratureContentAssetsResponse> {
    const literature = await this.literatureRepository.findLiteratureById(literatureId);
    if (!literature) {
      throw new AppError(404, 'NOT_FOUND', `Literature ${literatureId} not found.`);
    }
    const assets = await this.literatureRepository.listContentAssetsByLiteratureId(literatureId);
    return {
      literature_id: literatureId,
      items: assets.map((asset) => this.toContentAssetDTO(asset)),
    };
  }

  async retrieveLiterature(request: LiteratureRetrieveRequest): Promise<LiteratureRetrieveResponse> {
    return this.literatureRetrievalService.retrieve(request);
  }

  async getContentProcessing(literatureId: string): Promise<GetLiteratureContentProcessingResponse> {
    return this.literatureFlowService.getContentProcessing(literatureId);
  }

  async getKeyContentCurationBundle(literatureId: string): Promise<LiteratureKeyContentCurationBundleResponse> {
    return this.literatureFlowService.getKeyContentCurationBundle(literatureId);
  }

  async importKeyContentDossier(
    literatureId: string,
    request: ImportLiteratureKeyContentDossierRequest,
  ): Promise<ImportLiteratureKeyContentDossierResponse> {
    return this.literatureFlowService.importKeyContentDossier(literatureId, request);
  }

  async dryRunImportKeyContentDossier(
    literatureId: string,
    request: ImportLiteratureKeyContentDossierRequest,
  ): Promise<DryRunImportLiteratureKeyContentDossierResponse> {
    return this.literatureFlowService.dryRunImportKeyContentDossier(literatureId, request);
  }

  async createContentProcessingRun(
    literatureId: string,
    request: CreateLiteratureContentProcessingRunRequest,
  ): Promise<CreateLiteratureContentProcessingRunResponse> {
    const run = await this.literatureFlowService.triggerContentProcessingRun(
      literatureId,
      request.requested_stages,
    );
    return { run };
  }

  async listContentProcessingRuns(
    literatureId: string,
    query: ListLiteratureContentProcessingRunsQuery,
  ): Promise<ListLiteratureContentProcessingRunsResponse> {
    return this.literatureFlowService.listContentProcessingRuns(literatureId, query.limit);
  }

  private mapZoteroEntryToImportItem(
    entry: Record<string, unknown>,
    options: {
      libraryType: 'users' | 'groups';
      libraryId: string;
      tags: string[];
      rightsClass: RightsClass;
    },
  ): LiteratureCollectionImportItem | null {
    const data = this.readRecord(entry.data);
    if (!data) {
      return null;
    }

    const title = this.readString(data.title);
    if (!title) {
      return null;
    }

    const creatorsRaw = Array.isArray(data.creators) ? data.creators : [];
    const authors = creatorsRaw
      .map((creator) => this.readRecord(creator))
      .filter((creator): creator is Record<string, unknown> => creator !== null)
      .map((creator) => {
        const name = this.readString(creator.name);
        if (name) {
          return name;
        }
        const firstName = this.readString(creator.firstName);
        const lastName = this.readString(creator.lastName);
        return [firstName, lastName].filter((part): part is string => Boolean(part)).join(' ');
      })
      .map((author) => author.trim())
      .filter((author) => author.length > 0);

    const dateText = this.readString(data.date);
    const year = this.parseYearFromText(dateText);
    const doi = this.normalizeDoi(this.readString(data.DOI) ?? this.readString(data.doi));
    const arxivId = this.normalizeArxivId(
      this.readString(data.arxivId) ?? this.readString(data.arxiv) ?? undefined,
    );
    const itemKey = this.readString(entry.key) ?? this.readString(data.key);
    const sourceUrl =
      this.readString(data.url) ??
      (itemKey
        ? `https://www.zotero.org/${options.libraryType}/${options.libraryId}/items/${itemKey}`
        : `https://www.zotero.org/${options.libraryType}/${options.libraryId}`);

    const abstractText = this.readString(data.abstractNote);
    const itemTags = Array.isArray(data.tags)
      ? data.tags
          .map((tagEntry) => {
            const asRecord = this.readRecord(tagEntry);
            if (asRecord) {
              return this.readString(asRecord.tag);
            }
            return typeof tagEntry === 'string' ? tagEntry : undefined;
          })
          .filter((tag): tag is string => typeof tag === 'string')
      : [];

    return this.normalizeImportItem({
      provider: 'zotero',
      external_id: itemKey || doi || arxivId || sourceUrl,
      title,
      abstract: abstractText ?? undefined,
      authors,
      year: year ?? undefined,
      doi: doi ?? undefined,
      arxiv_id: arxivId ?? undefined,
      source_url: sourceUrl,
      rights_class: options.rightsClass,
      tags: this.mergeTags(options.tags, itemTags),
    });
  }

  private async findExisting(item: LiteratureCollectionImportItem): Promise<MatchedDedup> {
    const candidate = this.buildDedupCandidate(item);
    if (candidate.doiNormalized) {
      const row = await this.literatureRepository.findLiteratureByDoi(candidate.doiNormalized);
      if (row) {
        return { matchedBy: 'doi', literature: row };
      }
    }

    if (candidate.arxivId) {
      const row = await this.literatureRepository.findLiteratureByArxivId(candidate.arxivId);
      if (row) {
        return { matchedBy: 'arxiv_id', literature: row };
      }
    }

    if (candidate.titleAuthorsYearHash) {
      const row = await this.literatureRepository.findLiteratureByTitleAuthorsYearHash(
        candidate.titleAuthorsYearHash,
      );
      if (row) {
        return { matchedBy: 'title_authors_year', literature: row };
      }
    }

    return { matchedBy: 'none', literature: null };
  }

  private buildDedupCandidate(item: LiteratureCollectionImportItem): LiteratureDedupCandidate {
    return buildLiteratureDedupCandidate({
      title: item.title,
      authors: item.authors ?? [],
      year: item.year ?? null,
      doi: item.doi,
      arxiv_id: item.arxiv_id,
    });
  }

  private toCanonicalWorkKey(literature: LiteratureRecord): string {
    return buildLiteratureWorkIdentity({
      id: literature.id,
      title: literature.title,
      authors: literature.authors,
      year: literature.year,
      doiNormalized: literature.doiNormalized,
      arxivId: literature.arxivId,
      titleAuthorsYearHash: literature.titleAuthorsYearHash,
    }).canonicalWorkKey;
  }

  private buildTitleAuthorsYearHashFromFields(
    title: string,
    authors: string[],
    year: number | null,
  ): string | null {
    return buildLiteratureTitleAuthorsYearHash(title, authors, year);
  }

  private normalizeImportItem(item: LiteratureCollectionImportItem): LiteratureCollectionImportItem {
    return {
      provider: item.provider,
      external_id: item.external_id.trim(),
      title: item.title.trim(),
      abstract: item.abstract?.trim(),
      authors: (item.authors ?? []).map((name) => name.trim()).filter((name) => name.length > 0),
      year: item.year,
      doi: this.normalizeDoi(item.doi) ?? undefined,
      arxiv_id: this.normalizeArxivId(item.arxiv_id) ?? undefined,
      source_url: item.source_url.trim(),
      rights_class: item.rights_class ?? 'UNKNOWN',
      tags: (item.tags ?? []).map((tag) => tag.trim()).filter((tag) => tag.length > 0),
    };
  }

  private normalizeDoi(value?: string): string | null {
    return normalizeLiteratureDoi(value);
  }

  private normalizeArxivId(value?: string): string | null {
    return normalizeLiteratureArxivId(value);
  }

  private normalizeTitle(value: string): string {
    return normalizeLiteratureTitle(value);
  }

  private normalizeTags(tags: string[]): string[] {
    return [...new Set(tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0))];
  }

  private resolveZoteroLimit(limit?: number): number {
    if (!limit || !Number.isFinite(limit)) {
      return 20;
    }

    if (limit < 1) {
      return 1;
    }
    if (limit > 50) {
      return 50;
    }
    return Math.floor(limit);
  }

  private mergeTags(existing: string[], incoming: string[]): string[] {
    return this.normalizeTags([...existing, ...incoming]);
  }

  private stringArraysEqual(left: string[], right: string[]): boolean {
    if (left.length !== right.length) {
      return false;
    }
    return left.every((value, index) => value === right[index]);
  }

  private async markCollectionImportStale(
    literatureId: string,
    input: { citationChanged: boolean; abstractChanged: boolean },
  ): Promise<void> {
    if (input.citationChanged) {
      await this.literatureFlowService.markStagesStale({
        literatureId,
        stages: ['CITATION_NORMALIZED', 'KEY_CONTENT_READY', 'CHUNKED', 'EMBEDDED', 'INDEXED'],
        reasonCode: 'COLLECTION_CITATION_SOURCE_CHANGED',
        reasonMessage: 'Collection import updated citation identity or source metadata.',
      });
    }
    if (input.abstractChanged) {
      await this.literatureFlowService.markStagesStale({
        literatureId,
        stages: ['ABSTRACT_READY', 'KEY_CONTENT_READY', 'CHUNKED', 'EMBEDDED', 'INDEXED'],
        reasonCode: 'COLLECTION_ABSTRACT_SOURCE_CHANGED',
        reasonMessage: 'Collection import updated trusted abstract metadata.',
      });
    }
  }

  private async assertDedupUniqueness(
    literatureId: string,
    keys: LiteratureDedupCandidate,
  ): Promise<void> {
    if (keys.doiNormalized) {
      const existing = await this.literatureRepository.findLiteratureByDoi(keys.doiNormalized);
      if (existing && existing.id !== literatureId) {
        throw new AppError(409, 'VERSION_CONFLICT', `DOI ${keys.doiNormalized} already exists.`);
      }
    }

    if (keys.arxivId) {
      const existing = await this.literatureRepository.findLiteratureByArxivId(keys.arxivId);
      if (existing && existing.id !== literatureId) {
        throw new AppError(409, 'VERSION_CONFLICT', `arXiv ID ${keys.arxivId} already exists.`);
      }
    }

    if (keys.titleAuthorsYearHash) {
      const existing = await this.literatureRepository.findLiteratureByTitleAuthorsYearHash(
        keys.titleAuthorsYearHash,
      );
      if (existing && existing.id !== literatureId) {
        throw new AppError(
          409,
          'VERSION_CONFLICT',
          'A literature record with same title/authors/year already exists.',
        );
      }
    }
  }

  private resolveRightsClass(current: RightsClass, incoming?: RightsClass): RightsClass {
    if (!incoming) {
      return current;
    }
    if (current === 'UNKNOWN') {
      return incoming;
    }
    return current;
  }

  private normalizeDownloadUrl(value: string): URL {
    const normalized = value.trim();
    if (!normalized) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'source_url must not be empty.');
    }
    let url: URL;
    try {
      url = new URL(normalized);
    } catch {
      throw new AppError(400, 'INVALID_PAYLOAD', 'source_url must be a valid URL.');
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new AppError(400, 'INVALID_PAYLOAD', 'source_url must use http or https.');
    }
    return url;
  }

  private async fetchDownloadResponse(sourceUrl: URL, downloadPolicy: DownloadPolicy): Promise<DownloadFetchResult> {
    let currentUrl = sourceUrl;
    const redirectChain: string[] = [];
    for (let redirectCount = 0; redirectCount <= downloadPolicy.maxRedirects; redirectCount += 1) {
      await this.assertPublicDownloadUrl(currentUrl);
      const response = await fetch(currentUrl.toString(), {
        headers: {
          Accept: 'application/pdf,*/*',
          'User-Agent': 'paper-engineering-assistant/0.1 literature-content-download',
        },
        redirect: 'manual',
        signal: AbortSignal.timeout(downloadPolicy.timeoutMs),
      });
      if (!this.isRedirectStatus(response.status)) {
        return {
          response,
          finalUrl: currentUrl.toString(),
          redirectChain,
        };
      }
      const location = response.headers.get('location');
      if (!location) {
        throw new AppError(502, 'INTERNAL_ERROR', `Content asset download redirect ${response.status} is missing Location.`);
      }
      const nextUrl = new URL(location, currentUrl);
      redirectChain.push(nextUrl.toString());
      currentUrl = nextUrl;
      if (redirectCount === downloadPolicy.maxRedirects) {
        throw new AppError(502, 'INTERNAL_ERROR', 'Content asset download exceeded max redirects.');
      }
    }
    throw new AppError(502, 'INTERNAL_ERROR', 'Content asset download exceeded max redirects.');
  }

  private async readResponseBuffer(response: Response, maxByteSize: number): Promise<Buffer> {
    if (!response.body) {
      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length > maxByteSize) {
        throw new AppError(413, 'INVALID_PAYLOAD', `Downloaded content exceeds max_byte_size ${maxByteSize}.`);
      }
      return buffer;
    }

    const reader = response.body.getReader();
    const chunks: Buffer[] = [];
    let byteLength = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        const chunk = Buffer.from(value);
        byteLength += chunk.length;
        if (byteLength > maxByteSize) {
          await reader.cancel().catch(() => undefined);
          throw new AppError(413, 'INVALID_PAYLOAD', `Downloaded content exceeds max_byte_size ${maxByteSize}.`);
        }
        chunks.push(chunk);
      }
    } finally {
      reader.releaseLock();
    }

    return Buffer.concat(chunks, byteLength);
  }

  private async assertPublicDownloadUrl(url: URL): Promise<void> {
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new AppError(400, 'INVALID_PAYLOAD', 'source_url must use http or https.');
    }
    const hostname = this.normalizeUrlHostname(url.hostname);
    if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'source_url must not target localhost.');
    }
    const directIpVersion = net.isIP(hostname);
    if (directIpVersion && this.isBlockedAddress(hostname)) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'source_url must not target private or reserved IP ranges.');
    }
    if (directIpVersion) {
      return;
    }
    const addresses = await dns.lookup(hostname, { all: true, verbatim: true });
    if (addresses.length === 0 || addresses.some((address) => this.isBlockedAddress(address.address))) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'source_url must resolve only to public IP addresses.');
    }
  }

  private isRedirectStatus(status: number): boolean {
    return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
  }

  private normalizeUrlHostname(hostname: string): string {
    const normalized = hostname.toLowerCase();
    return normalized.startsWith('[') && normalized.endsWith(']')
      ? normalized.slice(1, -1)
      : normalized;
  }

  private isBlockedAddress(address: string): boolean {
    if (net.isIPv4(address)) {
      const octets = address.split('.').map((part) => Number.parseInt(part, 10));
      const [a, b, c] = octets;
      if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(c)) {
        return true;
      }
      return a === 0
        || a === 10
        || a === 127
        || (a === 100 && b >= 64 && b <= 127)
        || (a === 169 && b === 254)
        || (a === 172 && b >= 16 && b <= 31)
        || (a === 192 && b === 0 && c === 0)
        || (a === 192 && b === 0 && c === 2)
        || (a === 192 && b === 168)
        || (a === 198 && b === 51 && c === 100)
        || (a === 203 && b === 0 && c === 113)
        || a >= 224;
    }
    const normalized = address.toLowerCase();
    const mappedIpv4 = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mappedIpv4?.[1]) {
      return this.isBlockedAddress(mappedIpv4[1]);
    }
    const hexMappedIpv4 = normalized.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
    if (hexMappedIpv4?.[1] && hexMappedIpv4[2]) {
      const high = Number.parseInt(hexMappedIpv4[1], 16);
      const low = Number.parseInt(hexMappedIpv4[2], 16);
      const ipv4 = [
        (high >> 8) & 255,
        high & 255,
        (low >> 8) & 255,
        low & 255,
      ].join('.');
      return this.isBlockedAddress(ipv4);
    }
    return normalized === '::1'
      || normalized === '::'
      || normalized.startsWith('fc')
      || normalized.startsWith('fd')
      || normalized.startsWith('fe80')
      || normalized.startsWith('2001:db8');
  }

  private isPdfLikeDownload(mimeType: string, buffer: Buffer, requirePdfSignature: boolean): boolean {
    const hasPdfSignature = buffer.subarray(0, 5).toString('ascii') === '%PDF-';
    if (requirePdfSignature) {
      return hasPdfSignature;
    }
    const normalizedMimeType = mimeType.toLowerCase();
    return normalizedMimeType.includes('application/pdf')
      || normalizedMimeType.includes('application/x-pdf')
      || hasPdfSignature;
  }

  private async resolveDownloadPolicy(requestMaxByteSize: number | undefined): Promise<DownloadPolicy> {
    const settings = this.literatureAcquisitionSettingsService
      ? await this.literatureAcquisitionSettingsService.resolveDownloaderOptions()
      : null;
    const configuredMaxByteSize = this.clampDownloadInteger(
      settings?.max_byte_size,
      DEFAULT_DOWNLOAD_MAX_BYTES,
      1,
      500 * 1024 * 1024,
    );
    return {
      maxByteSize: this.clampDownloadInteger(
        requestMaxByteSize,
        configuredMaxByteSize,
        1,
        configuredMaxByteSize,
      ),
      timeoutMs: this.clampDownloadInteger(
        settings?.timeout_ms,
        DEFAULT_DOWNLOAD_TIMEOUT_MS,
        1_000,
        300_000,
      ),
      maxRedirects: this.clampDownloadInteger(
        settings?.max_redirects,
        DEFAULT_DOWNLOAD_MAX_REDIRECTS,
        0,
        10,
      ),
      requirePdfSignature: settings?.require_pdf_signature ?? true,
    };
  }

  private clampDownloadInteger(value: number | undefined, fallback: number, minimum: number, maximum: number): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return fallback;
    }
    const normalized = Math.max(minimum, Math.trunc(value));
    return Math.min(normalized, maximum);
  }

  private async resolveRawFilesRoot(): Promise<string> {
    if (this.contentProcessingSettingsService) {
      return this.contentProcessingSettingsService.resolveStorageRoot('raw_files');
    }
    return path.join(resolveDefaultLiteratureContentProcessingRoot(), 'raw');
  }

  private buildDownloadedFileName(input: {
    requestedFileName?: string;
    contentDisposition: string | null;
    sourceUrl: URL;
    mimeType: string;
  }): string {
    const rawFileName =
      input.requestedFileName?.trim()
      || this.parseContentDispositionFileName(input.contentDisposition)
      || path.basename(input.sourceUrl.pathname)
      || 'downloaded-fulltext';
    const extension = this.extensionForMimeType(input.mimeType);
    const withExtension = path.extname(rawFileName) || !extension
      ? rawFileName
      : `${rawFileName}${extension}`;
    return this.safePathSegment(withExtension);
  }

  private parseContentDispositionFileName(value: string | null): string | null {
    if (!value) {
      return null;
    }
    const starMatch = /filename\*=UTF-8''([^;]+)/i.exec(value);
    if (starMatch?.[1]) {
      try {
        return decodeURIComponent(starMatch[1].trim().replace(/^"|"$/g, ''));
      } catch {
        return starMatch[1].trim().replace(/^"|"$/g, '');
      }
    }
    const match = /filename=([^;]+)/i.exec(value);
    return match?.[1]?.trim().replace(/^"|"$/g, '') || null;
  }

  private normalizeMimeType(value: string | null): string | null {
    if (!value) {
      return null;
    }
    return value.split(';')[0]?.trim().toLowerCase() || null;
  }

  private extensionForMimeType(value: string): string {
    const mimeType = value.toLowerCase();
    if (mimeType === 'application/pdf') {
      return '.pdf';
    }
    if (mimeType === 'text/markdown') {
      return '.md';
    }
    if (mimeType === 'text/plain') {
      return '.txt';
    }
    if (mimeType === 'text/html') {
      return '.html';
    }
    return '';
  }

  private safePathSegment(value: string): string {
    const cleaned = value.trim().replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
    return cleaned || 'downloaded-fulltext';
  }

  private async inspectLocalAsset(
    localPath: string,
    provided: { checksum?: string; byteSize?: number },
  ): Promise<{ checksum: string; byteSize: number; readable: boolean }> {
    const providedChecksum = provided.checksum?.trim();
    const providedByteSize = typeof provided.byteSize === 'number' && Number.isFinite(provided.byteSize)
      ? Math.max(0, Math.trunc(provided.byteSize))
      : undefined;
    try {
      const stat = await fs.stat(localPath);
      if (!stat.isFile()) {
        throw new Error('Path is not a file.');
      }
      const buffer = await fs.readFile(localPath);
      const actualChecksum = crypto.createHash('sha256').update(buffer).digest('hex');
      if (providedChecksum && providedChecksum !== actualChecksum) {
        throw new AppError(400, 'INVALID_PAYLOAD', 'checksum does not match the readable local_path content.');
      }
      if (providedByteSize !== undefined && providedByteSize !== stat.size) {
        throw new AppError(400, 'INVALID_PAYLOAD', 'byte_size does not match the readable local_path content.');
      }
      return {
        checksum: actualChecksum,
        byteSize: stat.size,
        readable: true,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      if (!providedChecksum || providedByteSize === undefined) {
        throw new AppError(
          400,
          'INVALID_PAYLOAD',
          'local_path must be readable unless checksum and byte_size are provided.',
        );
      }
      return {
        checksum: providedChecksum,
        byteSize: providedByteSize,
        readable: false,
      };
    }
  }

  private inferMimeType(localPath: string): string {
    const extension = path.extname(localPath).toLowerCase();
    if (extension === '.md' || extension === '.markdown') {
      return 'text/markdown';
    }
    if (extension === '.txt') {
      return 'text/plain';
    }
    if (extension === '.pdf') {
      return 'application/pdf';
    }
    if (extension === '.html' || extension === '.htm') {
      return 'text/html';
    }
    return 'application/octet-stream';
  }

  private toContentAssetDTO(record: LiteratureContentAssetRecord): LiteratureContentAssetDTO {
    return {
      asset_id: record.id,
      literature_id: record.literatureId,
      asset_kind: record.assetKind,
      source_kind: record.sourceKind,
      local_path: record.localPath,
      checksum: record.checksum,
      mime_type: record.mimeType,
      byte_size: record.byteSize,
      rights_class: record.rightsClass,
      status: record.status,
      metadata: record.metadata,
      created_at: record.createdAt,
      updated_at: record.updatedAt,
    };
  }

  private readString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
  }

  private readRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }
    return value as Record<string, unknown>;
  }

  private parseYearFromText(value?: string): number | null {
    if (!value) {
      return null;
    }
    const match = value.match(/\b(19|20)\d{2}\b/);
    if (!match || !match[0]) {
      return null;
    }

    const year = Number.parseInt(match[0], 10);
    if (!Number.isInteger(year) || year < 1900 || year > 2100) {
      return null;
    }
    return year;
  }

  private async nextLiteratureId(): Promise<string> {
    const rows = await this.literatureRepository.listLiteratures();
    return this.nextPrefixedNumericId(rows.map((row) => row.id), 'LIT');
  }

  private async nextLiteratureSourceId(): Promise<string> {
    return this.nextPrefixedNumericId(await this.literatureRepository.listLiteratureSourceIds(), 'LSRC');
  }

  private async nextTopicScopeId(): Promise<string> {
    // max+1 over existing ids, NOT count+1: after row deletions the count lags behind the
    // highest surviving id and count+1 collides with it (surfaced by the first product run).
    return this.nextPrefixedNumericId(await this.literatureRepository.listTopicScopeIds(), 'TSCP');
  }

  private nextPrefixedNumericId(ids: string[], prefix: string): string {
    const pattern = new RegExp(`^${prefix}-(\\d+)$`);
    const maxId = ids
      .map((id) => pattern.exec(id)?.[1])
      .filter((value): value is string => Boolean(value))
      .map((value) => Number.parseInt(value, 10))
      .filter(Number.isFinite)
      .reduce((currentMax, value) => Math.max(currentMax, value), 0);
    return `${prefix}-${String(maxId + 1).padStart(4, '0')}`;
  }

  private async nextPaperLiteratureLinkId(): Promise<string> {
    return this.nextPrefixedNumericId(await this.literatureRepository.listPaperLiteratureLinkIds(), 'PLNK');
  }
}
