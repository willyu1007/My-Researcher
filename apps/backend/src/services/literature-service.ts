import crypto from 'node:crypto';
import {
  LITERATURE_SEARCH_PROVIDERS,
  type DedupMatchType,
  type GetPaperLiteratureResponse,
  type LiteratureImportItem,
  type LiteratureImportRequest,
  type LiteratureImportResponse,
  type LiteratureOverviewQuery,
  type LiteratureOverviewResponse,
  type LiteratureProvider,
  type LiteratureSearchRequest,
  type LiteratureSearchResponse,
  type LiteratureWebAutoImportRequest,
  type LiteratureWebAutoImportResponse,
  type PaperLiteratureLinkView,
  type PaperCitationStatus,
  type RightsClass,
  type SyncPaperLiteratureFromTopicRequest,
  type SyncPaperLiteratureFromTopicResponse,
  type TopicScopeStatus,
  type TopicLiteratureScopeResponse,
  type UpdateLiteratureMetadataRequest,
  type UpdateLiteratureMetadataResponse,
  type UpdatePaperLiteratureLinkRequest,
  type UpdatePaperLiteratureLinkResponse,
  type UpsertTopicLiteratureScopeRequest,
  type ZoteroImportRequest,
  type ZoteroImportResponse,
} from '@paper-engineering-assistant/shared';
import { AppError } from '../errors/app-error.js';
import type { LiteratureRecord, LiteratureRepository } from '../repositories/literature-repository.js';
import type { ResearchLifecycleRepository } from '../repositories/research-lifecycle-repository.js';

type DedupCandidate = {
  doiNormalized: string | null;
  arxivId: string | null;
  titleAuthorsYearHash: string | null;
};

type MatchedDedup = {
  matchedBy: DedupMatchType;
  literature: LiteratureRecord | null;
};

type SearchableProvider = (typeof LITERATURE_SEARCH_PROVIDERS)[number];

export class LiteratureService {
  constructor(
    private readonly literatureRepository: LiteratureRepository,
    private readonly researchRepository: ResearchLifecycleRepository,
  ) {}

  async search(request: LiteratureSearchRequest): Promise<LiteratureSearchResponse> {
    const query = request.query.trim();
    const limit = this.resolveLimit(request.limit);
    const providers = this.resolveProviders(request.providers);

    const providerResults = await Promise.all(
      providers.map(async (provider) => this.searchWithProvider(provider, query, limit)),
    );

    const merged = providerResults.flat();
    const items = await Promise.all(
      merged.map(async (candidate) => {
        const dedup = await this.findExisting(candidate);
        return {
          import_payload: candidate,
          dedup: {
            is_existing: dedup.literature !== null,
            literature_id: dedup.literature?.id,
            matched_by: dedup.matchedBy,
          },
        };
      }),
    );

    return {
      query,
      items,
    };
  }

  async import(request: LiteratureImportRequest): Promise<LiteratureImportResponse> {
    if (request.items.length === 0) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Import items cannot be empty.');
    }

    const results: LiteratureImportResponse['results'] = [];

    for (const item of request.items) {
      const now = new Date().toISOString();
      const normalized = this.normalizeImportItem(item);
      const dedup = await this.findExisting(normalized);

      let literatureRecord: LiteratureRecord;
      let isNew = false;

      if (dedup.literature) {
        literatureRecord = {
          ...dedup.literature,
          title: dedup.literature.title || normalized.title,
          abstractText: dedup.literature.abstractText || normalized.abstract || null,
          authors: dedup.literature.authors.length > 0 ? dedup.literature.authors : normalized.authors ?? [],
          year: dedup.literature.year ?? normalized.year ?? null,
          doiNormalized: dedup.literature.doiNormalized ?? this.normalizeDoi(normalized.doi),
          arxivId: dedup.literature.arxivId ?? this.normalizeArxivId(normalized.arxiv_id),
          rightsClass: this.resolveRightsClass(dedup.literature.rightsClass, normalized.rights_class),
          tags: this.mergeTags(dedup.literature.tags, normalized.tags ?? []),
          updatedAt: now,
        };
        literatureRecord = await this.literatureRepository.updateLiterature(literatureRecord);
      } else {
        isNew = true;
        const literatureId = await this.nextLiteratureId();
        const dedupKeys = this.buildDedupCandidate(normalized);
        literatureRecord = await this.literatureRepository.createLiterature({
          id: literatureId,
          title: normalized.title,
          abstractText: normalized.abstract ?? null,
          authors: normalized.authors ?? [],
          year: normalized.year ?? null,
          doiNormalized: dedupKeys.doiNormalized,
          arxivId: dedupKeys.arxivId,
          normalizedTitle: this.normalizeTitle(normalized.title),
          titleAuthorsYearHash: dedupKeys.titleAuthorsYearHash,
          rightsClass: normalized.rights_class ?? 'UNKNOWN',
          tags: normalized.tags ?? [],
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

  async webAutoImport(
    request: LiteratureWebAutoImportRequest,
  ): Promise<LiteratureWebAutoImportResponse> {
    const topicId = request.topic_id?.trim();
    const scopeStatus = request.scope_status ?? 'in_scope';
    const scopeReason = request.scope_reason?.trim() || undefined;
    const tags = this.normalizeTags(request.tags ?? []);
    const rightsClass = request.rights_class ?? 'UNKNOWN';

    const prepared: Array<{ url: string; item: LiteratureImportItem }> = [];
    const failed: LiteratureWebAutoImportResponse['results'] = [];

    for (const rawUrl of request.urls) {
      const url = rawUrl.trim();
      if (!url) {
        failed.push({
          url: rawUrl,
          imported: false,
          message: 'URL is empty.',
        });
        continue;
      }

      try {
        const item = await this.fetchImportItemFromWebUrl(url, tags, rightsClass);
        if (!item) {
          failed.push({
            url,
            imported: false,
            message: 'Unable to extract literature metadata from the URL.',
          });
          continue;
        }
        prepared.push({ url, item });
      } catch (error) {
        failed.push({
          url,
          imported: false,
          message: error instanceof Error ? error.message : 'Web import failed.',
        });
      }
    }

    const imported = prepared.length > 0 ? await this.import({ items: prepared.map((row) => row.item) }) : { results: [] };
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

    const succeeded: LiteratureWebAutoImportResponse['results'] = prepared.map((row, index) => {
      const result = imported.results[index];
      if (!result) {
        return {
          url: row.url,
          imported: false,
          message: 'Import result missing.',
        };
      }

      return {
        url: row.url,
        imported: true,
        literature_id: result.literature_id,
        title: result.title,
        matched_by: result.matched_by,
        source_provider: result.source_provider,
      };
    });

    return {
      topic_id: topicId || undefined,
      imported_count: imported.results.length,
      scope_upserted_count: scopeUpsertedCount,
      results: [...succeeded, ...failed],
    };
  }

  async zoteroImport(request: ZoteroImportRequest): Promise<ZoteroImportResponse> {
    const topicId = request.topic_id?.trim();
    const scopeStatus = request.scope_status ?? 'in_scope';
    const scopeReason = request.scope_reason?.trim() || undefined;
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
    const importItems = payload
      .map((entry) =>
        this.mapZoteroEntryToImportItem(entry, {
          libraryType: request.library_type,
          libraryId,
          tags: baseTags,
          rightsClass,
        }),
      )
      .filter((item): item is LiteratureImportItem => item !== null);

    const imported = importItems.length > 0 ? await this.import({ items: importItems }) : { results: [] };
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
    const nextHash = this.buildTitleAuthorsYearHashFromFields(nextTitle, nextAuthors, nextYear);

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
      updatedAt: now,
    });

    return {
      literature_id: updated.id,
      title: updated.title,
      abstract: updated.abstractText,
      authors: updated.authors,
      year: updated.year,
      doi: updated.doiNormalized,
      arxiv_id: updated.arxivId,
      rights_class: updated.rightsClass,
      tags: updated.tags,
      updated_at: updated.updatedAt,
    };
  }

  private async searchWithProvider(
    provider: SearchableProvider,
    query: string,
    limit: number,
  ): Promise<LiteratureImportItem[]> {
    try {
      switch (provider) {
        case 'crossref':
          return await this.searchCrossref(query, limit);
        case 'arxiv':
          return await this.searchArxiv(query, limit);
        default:
          return [];
      }
    } catch {
      return [];
    }
  }

  private async searchCrossref(query: string, limit: number): Promise<LiteratureImportItem[]> {
    const response = await fetch(
      `https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=${limit}`,
    );
    if (!response.ok) {
      throw new Error(`Crossref request failed: ${response.status}`);
    }

    const payload = (await response.json()) as {
      message?: {
        items?: Array<Record<string, unknown>>;
      };
    };

    const items = payload.message?.items ?? [];
    return items
      .map((item) => {
        return this.mapCrossrefRecordToImportItem(item, {
          provider: 'crossref',
          fallbackExternalId: this.readString(item.DOI) ?? this.readString(item.URL) ?? crypto.randomUUID(),
          fallbackSourceUrl: this.readString(item.URL) ?? '',
          tags: [],
          rightsClass: 'UNKNOWN',
        });
      })
      .filter((item): item is LiteratureImportItem => item !== null);
  }

  private async searchArxiv(query: string, limit: number): Promise<LiteratureImportItem[]> {
    const response = await fetch(
      `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=${limit}`,
    );
    if (!response.ok) {
      throw new Error(`arXiv request failed: ${response.status}`);
    }

    const xml = await response.text();
    const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)];
    return entries
      .map((entryMatch) => {
        const entry = entryMatch[1] ?? '';
        return this.mapArxivEntryToImportItem(entry, {
          provider: 'arxiv',
          fallbackSourceUrl: 'https://arxiv.org',
          tags: [],
          rightsClass: 'UNKNOWN',
        });
      })
      .filter((item): item is LiteratureImportItem => item !== null);
  }

  private async fetchImportItemFromWebUrl(
    rawUrl: string,
    tags: string[],
    rightsClass: RightsClass,
  ): Promise<LiteratureImportItem | null> {
    const normalizedUrl = this.normalizeHttpUrl(rawUrl);
    if (!normalizedUrl) {
      throw new AppError(400, 'INVALID_PAYLOAD', `Invalid URL: ${rawUrl}`);
    }

    const doi = this.extractDoiFromText(normalizedUrl);
    if (doi) {
      const crossrefItem = await this.fetchCrossrefByDoi(doi, normalizedUrl, tags, rightsClass);
      if (crossrefItem) {
        return crossrefItem;
      }
    }

    const arxivId = this.extractArxivId(normalizedUrl);
    if (arxivId) {
      const arxivItem = await this.fetchArxivById(arxivId, normalizedUrl, tags, rightsClass);
      if (arxivItem) {
        return arxivItem;
      }
    }

    return this.scrapeWebMetadataAsImportItem(normalizedUrl, tags, rightsClass);
  }

  private async fetchCrossrefByDoi(
    doi: string,
    fallbackSourceUrl: string,
    tags: string[],
    rightsClass: RightsClass,
  ): Promise<LiteratureImportItem | null> {
    const response = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`);
    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      message?: Record<string, unknown>;
    };
    const message = payload.message ?? {};
    return this.mapCrossrefRecordToImportItem(message, {
      provider: 'web',
      fallbackExternalId: doi,
      fallbackSourceUrl,
      tags,
      rightsClass,
    });
  }

  private async fetchArxivById(
    arxivId: string,
    fallbackSourceUrl: string,
    tags: string[],
    rightsClass: RightsClass,
  ): Promise<LiteratureImportItem | null> {
    const response = await fetch(
      `https://export.arxiv.org/api/query?id_list=${encodeURIComponent(arxivId)}&max_results=1`,
    );
    if (!response.ok) {
      return null;
    }

    const xml = await response.text();
    const entryMatch = xml.match(/<entry>([\s\S]*?)<\/entry>/);
    if (!entryMatch || !entryMatch[1]) {
      return null;
    }

    return this.mapArxivEntryToImportItem(entryMatch[1], {
      provider: 'web',
      fallbackSourceUrl,
      tags,
      rightsClass,
    });
  }

  private async scrapeWebMetadataAsImportItem(
    url: string,
    tags: string[],
    rightsClass: RightsClass,
  ): Promise<LiteratureImportItem | null> {
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }

    const html = await response.text();
    const citationTitle = this.readFirstMetaValue(html, ['citation_title', 'dc.title', 'og:title']);
    const title = citationTitle ?? this.readHtmlTitle(html);
    if (!title) {
      return null;
    }

    const authors = this.readAllMetaValues(html, ['citation_author', 'dc.creator'])
      .map((author) => author.trim())
      .filter((author) => author.length > 0);
    const publicationDate = this.readFirstMetaValue(html, [
      'citation_publication_date',
      'dc.date',
      'article:published_time',
    ]);
    const year = this.parseYearFromText(publicationDate);
    const doiMeta = this.readFirstMetaValue(html, ['citation_doi', 'dc.identifier', 'doi']);
    const doi = this.normalizeDoi(doiMeta ?? undefined);
    const arxivMeta = this.readFirstMetaValue(html, ['citation_arxiv_id', 'arxiv_id']);
    const arxivId = this.normalizeArxivId(arxivMeta ?? undefined) ?? this.extractArxivId(response.url || url);
    const abstractText = this.readFirstMetaValue(html, ['citation_abstract', 'description', 'og:description']);
    const sourceUrl = response.url || url;

    return this.normalizeImportItem({
      provider: 'web',
      external_id: doi || arxivId || sourceUrl,
      title: this.decodeXmlText(title),
      abstract: abstractText ? this.decodeXmlText(abstractText) : undefined,
      authors,
      year: year ?? undefined,
      doi: doi ?? undefined,
      arxiv_id: arxivId ?? undefined,
      source_url: sourceUrl,
      rights_class: rightsClass,
      tags,
    });
  }

  private mapCrossrefRecordToImportItem(
    item: Record<string, unknown>,
    options: {
      provider: LiteratureProvider;
      fallbackExternalId: string;
      fallbackSourceUrl: string;
      tags: string[];
      rightsClass: RightsClass;
    },
  ): LiteratureImportItem | null {
    const title = this.readFirstString(item.title);
    if (!title) {
      return null;
    }

    const doi = this.readString(item.DOI);
    const url = this.readString(item.URL);
    const year = this.readCrossrefYear(item);
    const authors = this.readCrossrefAuthors(item);
    const abstractText = this.stripMarkup(this.readString(item.abstract));
    const sourceUrl = url || (doi ? `https://doi.org/${doi}` : options.fallbackSourceUrl);
    if (!sourceUrl) {
      return null;
    }

    return this.normalizeImportItem({
      provider: options.provider,
      external_id: doi || options.fallbackExternalId,
      title,
      abstract: abstractText ?? undefined,
      authors,
      year: year ?? undefined,
      doi: doi ?? undefined,
      source_url: sourceUrl,
      rights_class: options.rightsClass,
      tags: options.tags,
    });
  }

  private mapArxivEntryToImportItem(
    entry: string,
    options: {
      provider: LiteratureProvider;
      fallbackSourceUrl: string;
      tags: string[];
      rightsClass: RightsClass;
    },
  ): LiteratureImportItem | null {
    const id = this.readXmlTag(entry, 'id');
    const title = this.readXmlTag(entry, 'title');
    if (!id || !title) {
      return null;
    }

    const summary = this.readXmlTag(entry, 'summary');
    const published = this.readXmlTag(entry, 'published');
    const authors = [...entry.matchAll(/<author>\s*<name>([\s\S]*?)<\/name>\s*<\/author>/g)]
      .map((match) => this.decodeXmlText(match[1] ?? '').trim())
      .filter((name) => name.length > 0);

    const normalizedArxivId = this.extractArxivId(id);
    const year = published ? Number.parseInt(published.slice(0, 4), 10) : undefined;

    return this.normalizeImportItem({
      provider: options.provider,
      external_id: normalizedArxivId || id,
      title: this.decodeXmlText(title),
      abstract: summary ? this.decodeXmlText(summary) : undefined,
      authors,
      year: Number.isFinite(year ?? Number.NaN) ? year : undefined,
      arxiv_id: normalizedArxivId || undefined,
      source_url: id || options.fallbackSourceUrl,
      rights_class: options.rightsClass,
      tags: options.tags,
    });
  }

  private mapZoteroEntryToImportItem(
    entry: Record<string, unknown>,
    options: {
      libraryType: 'users' | 'groups';
      libraryId: string;
      tags: string[];
      rightsClass: RightsClass;
    },
  ): LiteratureImportItem | null {
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

  private async findExisting(item: LiteratureImportItem): Promise<MatchedDedup> {
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

  private buildDedupCandidate(item: LiteratureImportItem): DedupCandidate {
    return {
      doiNormalized: this.normalizeDoi(item.doi),
      arxivId: this.normalizeArxivId(item.arxiv_id),
      titleAuthorsYearHash: this.buildTitleAuthorsYearHash(item),
    };
  }

  private buildTitleAuthorsYearHash(item: LiteratureImportItem): string | null {
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

  private normalizeImportItem(item: LiteratureImportItem): LiteratureImportItem {
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

  private extractArxivId(urlOrId: string): string | null {
    const normalized = this.normalizeArxivId(urlOrId);
    return normalized || null;
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

  private resolveProviders(providers?: SearchableProvider[]): SearchableProvider[] {
    if (!providers || providers.length === 0) {
      return [...LITERATURE_SEARCH_PROVIDERS];
    }

    const allowed = new Set<string>(LITERATURE_SEARCH_PROVIDERS);
    const filtered = providers.filter((provider) => allowed.has(provider));
    return filtered.length > 0 ? filtered : [...LITERATURE_SEARCH_PROVIDERS];
  }

  private resolveLimit(limit?: number): number {
    if (!limit || !Number.isFinite(limit)) {
      return 10;
    }

    if (limit < 1) {
      return 1;
    }
    if (limit > 20) {
      return 20;
    }
    return Math.floor(limit);
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

  private readString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
  }

  private readRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }
    return value as Record<string, unknown>;
  }

  private readFirstString(value: unknown): string | undefined {
    if (Array.isArray(value)) {
      const first = value.find((item) => typeof item === 'string');
      return typeof first === 'string' && first.trim().length > 0 ? first.trim() : undefined;
    }
    return this.readString(value);
  }

  private readCrossrefAuthors(item: Record<string, unknown>): string[] {
    const raw = item.author;
    if (!Array.isArray(raw)) {
      return [];
    }

    return raw
      .map((entry) => {
        if (!entry || typeof entry !== 'object') {
          return null;
        }
        const record = entry as Record<string, unknown>;
        const given = this.readString(record.given);
        const family = this.readString(record.family);
        const full = [given, family].filter((part): part is string => Boolean(part)).join(' ');
        return full || null;
      })
      .filter((name): name is string => name !== null);
  }

  private readCrossrefYear(item: Record<string, unknown>): number | null {
    const candidates = ['issued', 'published-print', 'published-online'];
    for (const key of candidates) {
      const raw = item[key];
      if (!raw || typeof raw !== 'object') {
        continue;
      }

      const parts = (raw as Record<string, unknown>)['date-parts'];
      if (!Array.isArray(parts) || parts.length === 0 || !Array.isArray(parts[0])) {
        continue;
      }

      const year = parts[0][0];
      if (typeof year === 'number' && Number.isInteger(year)) {
        return year;
      }
    }

    return null;
  }

  private normalizeHttpUrl(value: string): string | null {
    const attempt = (candidate: string): string | null => {
      try {
        const parsed = new URL(candidate);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          return null;
        }
        return parsed.toString();
      } catch {
        return null;
      }
    };

    const direct = attempt(value.trim());
    if (direct) {
      return direct;
    }

    if (!value.includes('://')) {
      return attempt(`https://${value.trim()}`);
    }

    return null;
  }

  private extractDoiFromText(value: string): string | null {
    const decoded = (() => {
      try {
        return decodeURIComponent(value);
      } catch {
        return value;
      }
    })();
    const matched = decoded.match(/10\.\d{4,9}\/[-._;()/:a-z0-9]+/i);
    return this.normalizeDoi(matched?.[0]);
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

  private readAllMetaValues(html: string, names: string[]): string[] {
    const values: string[] = [];
    for (const name of names) {
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(
        `<meta[^>]+(?:name|property)=["']${escaped}["'][^>]*content=["']([\\s\\S]*?)["'][^>]*>`,
        'gi',
      );
      for (const match of html.matchAll(regex)) {
        const content = this.decodeXmlText((match[1] ?? '').trim());
        if (content) {
          values.push(content);
        }
      }
    }
    return values;
  }

  private readFirstMetaValue(html: string, names: string[]): string | undefined {
    const values = this.readAllMetaValues(html, names);
    return values[0];
  }

  private readHtmlTitle(html: string): string | undefined {
    const matched = html.match(/<title>([\s\S]*?)<\/title>/i);
    const title = matched?.[1]?.trim();
    if (!title) {
      return undefined;
    }
    return this.decodeXmlText(title);
  }

  private stripMarkup(value?: string): string | undefined {
    if (!value) {
      return undefined;
    }

    const withoutTags = value.replace(/<[^>]+>/g, ' ');
    const normalized = this.decodeXmlText(withoutTags).replace(/\s+/g, ' ').trim();
    return normalized.length > 0 ? normalized : undefined;
  }

  private readXmlTag(xml: string, tagName: string): string | null {
    const match = xml.match(new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, 'i'));
    if (!match) {
      return null;
    }

    return match[1]?.trim() ?? null;
  }

  private decodeXmlText(value: string): string {
    return value
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
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
