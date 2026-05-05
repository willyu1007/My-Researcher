import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import type {
  CreateLiteratureContentProcessingRunRequest,
  CreateLiteratureContentProcessingRunResponse,
  DedupMatchType,
  GetLiteratureContentProcessingResponse,
  GetLiteratureMetadataResponse,
  GetPaperLiteratureResponse,
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
import type { LiteratureContentProcessingSettingsService } from './literature-content-processing-settings-service.js';
import { LiteratureRetrievalService } from './literature-retrieval-service.js';

type DedupCandidate = {
  doiNormalized: string | null;
  arxivId: string | null;
  titleAuthorsYearHash: string | null;
};

type MatchedDedup = {
  matchedBy: DedupMatchType;
  literature: LiteratureRecord | null;
};

export class LiteratureService {
  constructor(
    private readonly literatureRepository: LiteratureRepository,
    private readonly researchRepository: ResearchLifecycleRepository,
    contentProcessingSettingsService?: LiteratureContentProcessingSettingsService,
    literatureFlowService?: LiteratureFlowService,
    literatureRetrievalService?: LiteratureRetrievalService,
  ) {
    this.literatureFlowService = literatureFlowService
      ?? new LiteratureFlowService(literatureRepository, contentProcessingSettingsService);
    this.literatureRetrievalService = literatureRetrievalService
      ?? new LiteratureRetrievalService(literatureRepository, contentProcessingSettingsService);
  }

  private readonly literatureFlowService: LiteratureFlowService;
  private readonly literatureRetrievalService: LiteratureRetrievalService;

  async collectionImport(request: LiteratureCollectionImportRequest): Promise<LiteratureCollectionImportResponse> {
    if (request.items.length === 0) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Collection import items cannot be empty.');
    }

    const results: LiteratureCollectionImportResponse['results'] = [];

    for (const item of request.items) {
      const now = new Date().toISOString();
      const normalized = this.normalizeImportItem(item);
      const dedup = await this.findExisting(normalized);

      let literatureRecord: LiteratureRecord;
      let isNew = false;

      if (dedup.literature) {
        const previous = dedup.literature;
        const nextAuthors = previous.authors.length > 0 ? previous.authors : normalized.authors ?? [];
        const nextYear = previous.year ?? normalized.year ?? null;
        const nextDoi = previous.doiNormalized ?? this.normalizeDoi(normalized.doi);
        const nextArxivId = previous.arxivId ?? this.normalizeArxivId(normalized.arxiv_id);
        const nextAbstract = previous.abstractText || normalized.abstract || null;
        const abstractChanged = previous.abstractText !== nextAbstract;
        literatureRecord = {
          ...previous,
          title: previous.title || normalized.title,
          abstractText: nextAbstract,
          keyContentDigest: previous.keyContentDigest,
          authors: nextAuthors,
          year: nextYear,
          doiNormalized: nextDoi,
          arxivId: nextArxivId,
          rightsClass: this.resolveRightsClass(previous.rightsClass, normalized.rights_class),
          tags: this.mergeTags(previous.tags, normalized.tags ?? []),
          updatedAt: now,
        };
        literatureRecord = await this.literatureRepository.updateLiterature(literatureRecord);
        await this.markCollectionImportStale(literatureRecord.id, {
          citationChanged: true,
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
        rawPayload: normalized as unknown as Record<string, unknown>,
        fetchedAt: now,
      });

      await this.literatureFlowService.recordCollectionUpserted({
        literatureId: literatureRecord.id,
        dedupStatus: dedup.matchedBy === 'none' ? 'unique' : 'duplicate',
      });

      results.push({
        literature_id: literatureRecord.id,
        is_new: isNew,
        matched_by: dedup.matchedBy,
        title: literatureRecord.title,
        source_provider: normalized.provider,
        source_url: normalized.source_url,
      });
    }

    return { results };
  }

  async importFromAutoPull(request: LiteratureCollectionImportRequest): Promise<LiteratureCollectionImportResponse> {
    return this.collectionImport(request);
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
    const pipelineStageStatesByLiterature = new Map<string, LiteraturePipelineStageStateRecord[]>();
    for (const stageState of pipelineStageStates) {
      const rows = pipelineStageStatesByLiterature.get(stageState.literatureId) ?? [];
      rows.push(stageState);
      pipelineStageStatesByLiterature.set(stageState.literatureId, rows);
    }

    const scopeStatusByLiterature = new Map<string, TopicScopeStatus>();
    for (const scope of topicScopes) {
      scopeStatusByLiterature.set(scope.literatureId, scope.scopeStatus);
    }

    const citationStatusByLiterature = new Map<string, PaperCitationStatus>();
    for (const link of paperLinks) {
      citationStatusByLiterature.set(link.literatureId, link.citationStatus);
    }

    const providerCounts = new Map<LiteratureProvider, number>();
    const rightsCounts = new Map<RightsClass, number>();
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

      items.push({
        literature_id: literature.id,
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
            updated_at: scope.updatedAt,
            title: literature.title,
            authors: literature.authors,
            year: literature.year,
            doi: literature.doiNormalized,
            arxiv_id: literature.arxivId,
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

    for (const action of request.actions) {
      const literature = await this.literatureRepository.findLiteratureById(action.literature_id);
      if (!literature) {
        throw new AppError(
          404,
          'NOT_FOUND',
          `Literature ${action.literature_id} not found.`,
        );
      }

      await this.literatureRepository.upsertTopicScope({
        id: await this.nextTopicScopeId(),
        topicId,
        literatureId: action.literature_id,
        scopeStatus: action.scope_status,
        reason: action.reason ?? null,
        createdAt: now,
        updatedAt: now,
      });
    }

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
    const inScopeRows = scopes.filter((scope) => scope.scopeStatus === 'in_scope');

    let linkedCount = 0;
    let skippedCount = 0;

    for (const scope of inScopeRows) {
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
    const asset = await this.literatureRepository.upsertContentAsset({
      id: crypto.randomUUID(),
      literatureId,
      assetKind: request.asset_kind ?? 'raw_fulltext',
      sourceKind,
      localPath,
      checksum: detected.checksum,
      mimeType: request.mime_type?.trim() || this.inferMimeType(localPath),
      byteSize: detected.byteSize,
      rightsClass: request.rights_class ?? literature.rightsClass,
      status: detected.readable ? 'registered' : 'missing',
      metadata: request.metadata ?? {},
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

  private buildDedupCandidate(item: LiteratureCollectionImportItem): DedupCandidate {
    return {
      doiNormalized: this.normalizeDoi(item.doi),
      arxivId: this.normalizeArxivId(item.arxiv_id),
      titleAuthorsYearHash: this.buildTitleAuthorsYearHash(item),
    };
  }

  private buildTitleAuthorsYearHash(item: LiteratureCollectionImportItem): string | null {
    return this.buildTitleAuthorsYearHashFromFields(item.title, item.authors ?? [], item.year ?? null);
  }

  private buildTitleAuthorsYearHashFromFields(
    title: string,
    authors: string[],
    year: number | null,
  ): string | null {
    if (!year) {
      return null;
    }
    const normalizedTitle = this.normalizeTitle(title);
    const normalizedAuthors = this.normalizeAuthors(authors);
    if (!normalizedTitle || normalizedAuthors.length === 0) {
      return null;
    }

    const raw = `${normalizedTitle}|${normalizedAuthors.join('|')}|${year}`;
    return crypto.createHash('sha1').update(raw).digest('hex');
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
    if (!value) {
      return null;
    }

    return value
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\/doi\.org\//, '')
      .replace(/^doi:/, '')
      .trim();
  }

  private normalizeArxivId(value?: string): string | null {
    if (!value) {
      return null;
    }

    const normalized = value
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\/arxiv\.org\/abs\//, '')
      .replace(/^arxiv:/, '')
      .trim();
    return normalized.replace(/v\d+$/, '');
  }

  private normalizeTitle(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private normalizeAuthors(authors: string[]): string[] {
    return authors
      .map((name) =>
        name
          .trim()
          .toLowerCase()
          .replace(/[^\p{L}\p{N}]+/gu, ' ')
          .replace(/\s+/g, ' ')
          .trim(),
      )
      .filter((name) => name.length > 0)
      .sort();
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
    keys: DedupCandidate,
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
    const next = (await this.literatureRepository.countLiteratures()) + 1;
    return `LIT-${String(next).padStart(4, '0')}`;
  }

  private async nextLiteratureSourceId(): Promise<string> {
    const next = (await this.literatureRepository.countLiteratureSources()) + 1;
    return `LSRC-${String(next).padStart(4, '0')}`;
  }

  private async nextTopicScopeId(): Promise<string> {
    const next = (await this.literatureRepository.countTopicScopes()) + 1;
    return `TSCP-${String(next).padStart(4, '0')}`;
  }

  private async nextPaperLiteratureLinkId(): Promise<string> {
    const next = (await this.literatureRepository.countPaperLiteratureLinks()) + 1;
    return `PLNK-${String(next).padStart(4, '0')}`;
  }
}
