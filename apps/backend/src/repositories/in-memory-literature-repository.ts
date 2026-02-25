import type {
  LiteratureRepository,
  LiteratureRecord,
  LiteratureSourceRecord,
  PaperLiteratureLinkRecord,
  TopicLiteratureScopeRecord,
} from './literature-repository.js';

export class InMemoryLiteratureRepository implements LiteratureRepository {
  private readonly literatures = new Map<string, LiteratureRecord>();
  private readonly doiIndex = new Map<string, string>();
  private readonly arxivIndex = new Map<string, string>();
  private readonly titleAuthorsYearIndex = new Map<string, string>();

  private readonly literatureSources = new Map<string, LiteratureSourceRecord>();
  private readonly sourceByProviderItem = new Map<string, string>();
  private readonly sourceIdsByLiterature = new Map<string, string[]>();

  private readonly topicScopes = new Map<string, TopicLiteratureScopeRecord>();
  private readonly topicScopeByTopic = new Map<string, string[]>();

  private readonly paperLinks = new Map<string, PaperLiteratureLinkRecord>();
  private readonly paperLinkByPair = new Map<string, string>();
  private readonly paperLinkByPaper = new Map<string, string[]>();

  async countLiteratures(): Promise<number> {
    return this.literatures.size;
  }

  async countLiteratureSources(): Promise<number> {
    return this.literatureSources.size;
  }

  async countTopicScopes(): Promise<number> {
    return this.topicScopes.size;
  }

  async countPaperLiteratureLinks(): Promise<number> {
    return this.paperLinks.size;
  }

  async createLiterature(record: LiteratureRecord): Promise<LiteratureRecord> {
    this.literatures.set(record.id, record);
    this.reindexLiterature(record);
    return record;
  }

  async updateLiterature(record: LiteratureRecord): Promise<LiteratureRecord> {
    this.literatures.set(record.id, record);
    this.reindexLiterature(record);
    return record;
  }

  async findLiteratureById(literatureId: string): Promise<LiteratureRecord | null> {
    return this.literatures.get(literatureId) ?? null;
  }

  async findLiteratureByDoi(doiNormalized: string): Promise<LiteratureRecord | null> {
    const id = this.doiIndex.get(doiNormalized);
    return id ? (this.literatures.get(id) ?? null) : null;
  }

  async findLiteratureByArxivId(arxivId: string): Promise<LiteratureRecord | null> {
    const id = this.arxivIndex.get(arxivId);
    return id ? (this.literatures.get(id) ?? null) : null;
  }

  async findLiteratureByTitleAuthorsYearHash(hash: string): Promise<LiteratureRecord | null> {
    const id = this.titleAuthorsYearIndex.get(hash);
    return id ? (this.literatures.get(id) ?? null) : null;
  }

  async listLiteraturesByIds(literatureIds: string[]): Promise<LiteratureRecord[]> {
    return literatureIds
      .map((id) => this.literatures.get(id))
      .filter((row): row is LiteratureRecord => row !== undefined);
  }

  async upsertLiteratureSource(
    record: LiteratureSourceRecord,
  ): Promise<{ record: LiteratureSourceRecord; created: boolean }> {
    const sourceKey = `${record.provider}::${record.sourceItemId}`;
    const existingId = this.sourceByProviderItem.get(sourceKey);
    if (existingId) {
      const current = this.literatureSources.get(existingId);
      if (!current) {
        throw new Error(`Source ${existingId} not found.`);
      }

      const next: LiteratureSourceRecord = {
        ...current,
        sourceUrl: record.sourceUrl,
        rawPayload: record.rawPayload,
        fetchedAt: record.fetchedAt,
      };
      this.literatureSources.set(existingId, next);
      return { record: next, created: false };
    }

    this.literatureSources.set(record.id, record);
    this.sourceByProviderItem.set(sourceKey, record.id);
    const sourceIds = this.sourceIdsByLiterature.get(record.literatureId) ?? [];
    this.sourceIdsByLiterature.set(record.literatureId, [...sourceIds, record.id]);
    return { record, created: true };
  }

  async listSourcesByLiteratureId(literatureId: string): Promise<LiteratureSourceRecord[]> {
    const ids = this.sourceIdsByLiterature.get(literatureId) ?? [];
    return ids
      .map((id) => this.literatureSources.get(id))
      .filter((row): row is LiteratureSourceRecord => row !== undefined)
      .sort((a, b) => a.fetchedAt.localeCompare(b.fetchedAt));
  }

  async upsertTopicScope(
    record: TopicLiteratureScopeRecord,
  ): Promise<{ record: TopicLiteratureScopeRecord; created: boolean }> {
    const key = this.topicScopeKey(record.topicId, record.literatureId);
    const existing = this.topicScopes.get(key);
    if (existing) {
      const next: TopicLiteratureScopeRecord = {
        ...existing,
        scopeStatus: record.scopeStatus,
        reason: record.reason,
        updatedAt: record.updatedAt,
      };
      this.topicScopes.set(key, next);
      return { record: next, created: false };
    }

    this.topicScopes.set(key, record);
    const ids = this.topicScopeByTopic.get(record.topicId) ?? [];
    this.topicScopeByTopic.set(record.topicId, [...ids, key]);
    return { record, created: true };
  }

  async listTopicScopesByTopicId(topicId: string): Promise<TopicLiteratureScopeRecord[]> {
    const keys = this.topicScopeByTopic.get(topicId) ?? [];
    return keys
      .map((key) => this.topicScopes.get(key))
      .filter((row): row is TopicLiteratureScopeRecord => row !== undefined)
      .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
  }

  async upsertPaperLiteratureLink(
    record: PaperLiteratureLinkRecord,
  ): Promise<{ record: PaperLiteratureLinkRecord; created: boolean }> {
    const pairKey = this.paperPairKey(record.paperId, record.literatureId);
    const existingId = this.paperLinkByPair.get(pairKey);
    if (existingId) {
      const existing = this.paperLinks.get(existingId);
      if (!existing) {
        throw new Error(`Paper link ${existingId} not found.`);
      }

      const next: PaperLiteratureLinkRecord = {
        ...existing,
        topicId: record.topicId ?? existing.topicId,
        citationStatus: existing.citationStatus,
        note: record.note ?? existing.note,
        updatedAt: record.updatedAt,
      };
      this.paperLinks.set(existing.id, next);
      return { record: next, created: false };
    }

    this.paperLinks.set(record.id, record);
    this.paperLinkByPair.set(pairKey, record.id);
    const ids = this.paperLinkByPaper.get(record.paperId) ?? [];
    this.paperLinkByPaper.set(record.paperId, [...ids, record.id]);
    return { record, created: true };
  }

  async findPaperLiteratureLinkById(linkId: string): Promise<PaperLiteratureLinkRecord | null> {
    return this.paperLinks.get(linkId) ?? null;
  }

  async listPaperLiteratureLinksByPaperId(paperId: string): Promise<PaperLiteratureLinkRecord[]> {
    const ids = this.paperLinkByPaper.get(paperId) ?? [];
    return ids
      .map((id) => this.paperLinks.get(id))
      .filter((row): row is PaperLiteratureLinkRecord => row !== undefined)
      .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
  }

  async updatePaperLiteratureLink(
    linkId: string,
    patch: { citationStatus?: PaperLiteratureLinkRecord['citationStatus']; note?: string | null },
  ): Promise<PaperLiteratureLinkRecord> {
    const existing = this.paperLinks.get(linkId);
    if (!existing) {
      throw new Error(`Paper literature link ${linkId} not found.`);
    }

    const next: PaperLiteratureLinkRecord = {
      ...existing,
      citationStatus: patch.citationStatus ?? existing.citationStatus,
      note: patch.note === undefined ? existing.note : patch.note,
      updatedAt: new Date().toISOString(),
    };

    this.paperLinks.set(linkId, next);
    return next;
  }

  private reindexLiterature(record: LiteratureRecord): void {
    if (record.doiNormalized) {
      this.doiIndex.set(record.doiNormalized, record.id);
    }
    if (record.arxivId) {
      this.arxivIndex.set(record.arxivId, record.id);
    }
    if (record.titleAuthorsYearHash) {
      this.titleAuthorsYearIndex.set(record.titleAuthorsYearHash, record.id);
    }
  }

  private topicScopeKey(topicId: string, literatureId: string): string {
    return `${topicId}::${literatureId}`;
  }

  private paperPairKey(paperId: string, literatureId: string): string {
    return `${paperId}::${literatureId}`;
  }
}
