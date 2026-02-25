import crypto from 'node:crypto';
import {
  LITERATURE_PROVIDERS,
  type DedupMatchType,
  type GetPaperLiteratureResponse,
  type LiteratureImportItem,
  type LiteratureImportRequest,
  type LiteratureImportResponse,
  type LiteratureProvider,
  type LiteratureSearchRequest,
  type LiteratureSearchResponse,
  type PaperLiteratureLinkView,
  type RightsClass,
  type SyncPaperLiteratureFromTopicRequest,
  type SyncPaperLiteratureFromTopicResponse,
  type TopicLiteratureScopeResponse,
  type UpdatePaperLiteratureLinkRequest,
  type UpdatePaperLiteratureLinkResponse,
  type UpsertTopicLiteratureScopeRequest,
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

  private async searchWithProvider(
    provider: LiteratureProvider,
    query: string,
    limit: number,
  ): Promise<LiteratureImportItem[]> {
    try {
      if (provider === 'crossref') {
        return await this.searchCrossref(query, limit);
      }
      return await this.searchArxiv(query, limit);
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
        const title = this.readFirstString(item.title);
        if (!title) {
          return null;
        }

        const doi = this.readString(item.DOI);
        const url = this.readString(item.URL);
        const year = this.readCrossrefYear(item);
        const authors = this.readCrossrefAuthors(item);
        const abstractText = this.stripMarkup(this.readString(item.abstract));
        const sourceUrl = url || (doi ? `https://doi.org/${doi}` : '');
        if (!sourceUrl) {
          return null;
        }

        return this.normalizeImportItem({
          provider: 'crossref',
          external_id: doi || sourceUrl,
          title,
          abstract: abstractText ?? undefined,
          authors,
          year: year ?? undefined,
          doi: doi ?? undefined,
          source_url: sourceUrl,
          rights_class: 'UNKNOWN',
          tags: [],
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
          provider: 'arxiv',
          external_id: normalizedArxivId || id,
          title: this.decodeXmlText(title),
          abstract: summary ? this.decodeXmlText(summary) : undefined,
          authors,
          year: Number.isFinite(year ?? Number.NaN) ? year : undefined,
          arxiv_id: normalizedArxivId || undefined,
          source_url: id,
          rights_class: 'UNKNOWN',
          tags: [],
        });
      })
      .filter((item): item is LiteratureImportItem => item !== null);
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
    if (!item.year) {
      return null;
    }
    const normalizedTitle = this.normalizeTitle(item.title);
    const normalizedAuthors = this.normalizeAuthors(item.authors ?? []);
    if (!normalizedTitle || normalizedAuthors.length === 0) {
      return null;
    }

    const raw = `${normalizedTitle}|${normalizedAuthors.join('|')}|${item.year}`;
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

  private resolveProviders(providers?: LiteratureProvider[]): LiteratureProvider[] {
    if (!providers || providers.length === 0) {
      return [...LITERATURE_PROVIDERS];
    }
    return providers;
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

  private mergeTags(existing: string[], incoming: string[]): string[] {
    return [...new Set([...existing, ...incoming])];
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
