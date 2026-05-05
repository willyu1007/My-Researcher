import type {
  LiteratureAbstractProfileRecord,
  LiteratureCitationProfileRecord,
  LiteratureContentAssetRecord,
  LiteratureContentProcessingBatchItemRecord,
  LiteratureContentProcessingBatchItemStatus,
  LiteratureContentProcessingBatchJobRecord,
  LiteratureEmbeddingChunkRecord,
  LiteratureEmbeddingTokenIndexRecord,
  LiteratureEmbeddingVersionRecord,
  LiteratureFulltextDocumentRecord,
  LiteratureFulltextExtractionBundle,
  LiteratureFulltextParagraphRecord,
  LiteratureFulltextSectionRecord,
  LiteraturePipelineArtifactRecord,
  LiteratureRepository,
  LiteraturePipelineRunRecord,
  LiteraturePipelineRunStepRecord,
  LiteraturePipelineStageStateRecord,
  LiteraturePipelineStateRecord,
  LiteratureRecord,
  LiteratureSourceRecord,
  LiteratureFulltextAnchorRecord,
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
  private readonly citationProfilesByLiterature = new Map<string, LiteratureCitationProfileRecord>();
  private readonly abstractProfilesByLiterature = new Map<string, LiteratureAbstractProfileRecord>();
  private readonly contentAssets = new Map<string, LiteratureContentAssetRecord>();
  private readonly contentAssetByLiteraturePath = new Map<string, string>();
  private readonly contentAssetIdsByLiterature = new Map<string, string[]>();
  private readonly fulltextDocuments = new Map<string, LiteratureFulltextDocumentRecord>();
  private readonly fulltextDocumentBySourceAsset = new Map<string, string>();
  private readonly fulltextDocumentIdsByLiterature = new Map<string, string[]>();
  private readonly fulltextSectionsByDocument = new Map<string, LiteratureFulltextSectionRecord[]>();
  private readonly fulltextParagraphsByDocument = new Map<string, LiteratureFulltextParagraphRecord[]>();
  private readonly fulltextAnchorsByDocument = new Map<string, LiteratureFulltextAnchorRecord[]>();

  private readonly topicScopes = new Map<string, TopicLiteratureScopeRecord>();
  private readonly topicScopeByTopic = new Map<string, string[]>();

  private readonly paperLinks = new Map<string, PaperLiteratureLinkRecord>();
  private readonly paperLinkByPair = new Map<string, string>();
  private readonly paperLinkByPaper = new Map<string, string[]>();

  private readonly pipelineStates = new Map<string, LiteraturePipelineStateRecord>();
  private readonly pipelineStageStates = new Map<string, LiteraturePipelineStageStateRecord>();
  private readonly pipelineStageIdsByLiterature = new Map<string, string[]>();
  private readonly pipelineRuns = new Map<string, LiteraturePipelineRunRecord>();
  private readonly pipelineRunIdsByLiterature = new Map<string, string[]>();
  private readonly pipelineRunSteps = new Map<string, LiteraturePipelineRunStepRecord>();
  private readonly pipelineStepIdsByRun = new Map<string, string[]>();
  private readonly pipelineArtifacts = new Map<string, LiteraturePipelineArtifactRecord>();
  private readonly pipelineArtifactIdsByLiterature = new Map<string, string[]>();
  private readonly embeddingVersions = new Map<string, LiteratureEmbeddingVersionRecord>();
  private readonly embeddingVersionIdsByLiterature = new Map<string, string[]>();
  private readonly embeddingChunks = new Map<string, LiteratureEmbeddingChunkRecord>();
  private readonly embeddingChunkIdsByVersion = new Map<string, string[]>();
  private readonly embeddingTokenIndexes = new Map<string, LiteratureEmbeddingTokenIndexRecord>();
  private readonly embeddingTokenIndexIdsByVersion = new Map<string, string[]>();
  private readonly contentProcessingBatchJobs = new Map<string, LiteratureContentProcessingBatchJobRecord>();
  private readonly contentProcessingBatchItems = new Map<string, LiteratureContentProcessingBatchItemRecord>();
  private readonly contentProcessingBatchItemIdsByJob = new Map<string, string[]>();

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

  async listLiteratures(): Promise<LiteratureRecord[]> {
    return [...this.literatures.values()].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
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

  async upsertCitationProfile(
    record: LiteratureCitationProfileRecord,
  ): Promise<{ record: LiteratureCitationProfileRecord; created: boolean }> {
    const existing = this.citationProfilesByLiterature.get(record.literatureId);
    const next = existing
      ? {
          ...record,
          id: existing.id,
          createdAt: existing.createdAt,
        }
      : record;
    this.citationProfilesByLiterature.set(record.literatureId, next);
    return { record: next, created: !existing };
  }

  async findCitationProfileByLiteratureId(literatureId: string): Promise<LiteratureCitationProfileRecord | null> {
    return this.citationProfilesByLiterature.get(literatureId) ?? null;
  }

  async upsertAbstractProfile(
    record: LiteratureAbstractProfileRecord,
  ): Promise<{ record: LiteratureAbstractProfileRecord; created: boolean }> {
    const existing = this.abstractProfilesByLiterature.get(record.literatureId);
    const next = existing
      ? {
          ...record,
          id: existing.id,
          createdAt: existing.createdAt,
        }
      : record;
    this.abstractProfilesByLiterature.set(record.literatureId, next);
    return { record: next, created: !existing };
  }

  async findAbstractProfileByLiteratureId(literatureId: string): Promise<LiteratureAbstractProfileRecord | null> {
    return this.abstractProfilesByLiterature.get(literatureId) ?? null;
  }

  async upsertContentAsset(
    record: LiteratureContentAssetRecord,
  ): Promise<{ record: LiteratureContentAssetRecord; created: boolean }> {
    const key = this.contentAssetPathKey(record.literatureId, record.localPath);
    const existingId = this.contentAssetByLiteraturePath.get(key);
    if (existingId) {
      const existing = this.contentAssets.get(existingId);
      if (!existing) {
        throw new Error(`Content asset ${existingId} not found.`);
      }
      const next: LiteratureContentAssetRecord = {
        ...record,
        id: existing.id,
        createdAt: existing.createdAt,
      };
      this.contentAssets.set(existing.id, next);
      return { record: next, created: false };
    }

    this.contentAssets.set(record.id, record);
    this.contentAssetByLiteraturePath.set(key, record.id);
    const ids = this.contentAssetIdsByLiterature.get(record.literatureId) ?? [];
    this.contentAssetIdsByLiterature.set(record.literatureId, [...ids, record.id]);
    return { record, created: true };
  }

  async listContentAssetsByLiteratureId(literatureId: string): Promise<LiteratureContentAssetRecord[]> {
    const ids = this.contentAssetIdsByLiterature.get(literatureId) ?? [];
    return ids
      .map((id) => this.contentAssets.get(id))
      .filter((record): record is LiteratureContentAssetRecord => record !== undefined)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  async findContentAssetById(assetId: string): Promise<LiteratureContentAssetRecord | null> {
    return this.contentAssets.get(assetId) ?? null;
  }

  async upsertFulltextExtractionBundle(
    bundle: LiteratureFulltextExtractionBundle,
  ): Promise<LiteratureFulltextExtractionBundle> {
    const existingId = this.fulltextDocumentBySourceAsset.get(bundle.document.sourceAssetId);
    const document = existingId
      ? {
          ...bundle.document,
          id: existingId,
          createdAt: this.fulltextDocuments.get(existingId)?.createdAt ?? bundle.document.createdAt,
        }
      : bundle.document;
    this.fulltextDocuments.set(document.id, document);
    this.fulltextDocumentBySourceAsset.set(document.sourceAssetId, document.id);

    if (!existingId) {
      const ids = this.fulltextDocumentIdsByLiterature.get(document.literatureId) ?? [];
      this.fulltextDocumentIdsByLiterature.set(document.literatureId, [...ids, document.id]);
    }

    const sections = bundle.sections.map((section) => ({ ...section, documentId: document.id }));
    const paragraphs = bundle.paragraphs.map((paragraph) => ({ ...paragraph, documentId: document.id }));
    const anchors = bundle.anchors.map((anchor) => ({ ...anchor, documentId: document.id }));
    this.fulltextSectionsByDocument.set(document.id, sections);
    this.fulltextParagraphsByDocument.set(document.id, paragraphs);
    this.fulltextAnchorsByDocument.set(document.id, anchors);
    return { document, sections, paragraphs, anchors };
  }

  async findFulltextDocumentBySourceAssetId(sourceAssetId: string): Promise<LiteratureFulltextDocumentRecord | null> {
    const documentId = this.fulltextDocumentBySourceAsset.get(sourceAssetId);
    return documentId ? (this.fulltextDocuments.get(documentId) ?? null) : null;
  }

  async listFulltextDocumentsByLiteratureId(literatureId: string): Promise<LiteratureFulltextDocumentRecord[]> {
    const ids = this.fulltextDocumentIdsByLiterature.get(literatureId) ?? [];
    return ids
      .map((id) => this.fulltextDocuments.get(id))
      .filter((record): record is LiteratureFulltextDocumentRecord => record !== undefined)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  async listFulltextSectionsByDocumentId(documentId: string): Promise<LiteratureFulltextSectionRecord[]> {
    return [...(this.fulltextSectionsByDocument.get(documentId) ?? [])].sort(
      (left, right) => left.orderIndex - right.orderIndex,
    );
  }

  async listFulltextParagraphsByDocumentId(documentId: string): Promise<LiteratureFulltextParagraphRecord[]> {
    return [...(this.fulltextParagraphsByDocument.get(documentId) ?? [])].sort(
      (left, right) => left.orderIndex - right.orderIndex,
    );
  }

  async listFulltextAnchorsByDocumentId(documentId: string): Promise<LiteratureFulltextAnchorRecord[]> {
    return [...(this.fulltextAnchorsByDocument.get(documentId) ?? [])].sort(
      (left, right) => left.anchorId.localeCompare(right.anchorId),
    );
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

  async upsertPipelineState(
    record: LiteraturePipelineStateRecord,
  ): Promise<{ record: LiteraturePipelineStateRecord; created: boolean }> {
    const existing = this.pipelineStates.get(record.literatureId);
    if (existing) {
      const next: LiteraturePipelineStateRecord = {
        ...existing,
        citationComplete: record.citationComplete,
        abstractReady: record.abstractReady,
        keyContentReady: record.keyContentReady,
        dedupStatus: record.dedupStatus,
        updatedAt: record.updatedAt,
      };
      this.pipelineStates.set(record.literatureId, next);
      return { record: next, created: false };
    }

    this.pipelineStates.set(record.literatureId, record);
    return { record, created: true };
  }

  async findPipelineStateByLiteratureId(literatureId: string): Promise<LiteraturePipelineStateRecord | null> {
    return this.pipelineStates.get(literatureId) ?? null;
  }

  async listPipelineStatesByLiteratureIds(literatureIds: string[]): Promise<LiteraturePipelineStateRecord[]> {
    return literatureIds
      .map((literatureId) => this.pipelineStates.get(literatureId))
      .filter((record): record is LiteraturePipelineStateRecord => record !== undefined);
  }

  async upsertPipelineStageState(
    record: LiteraturePipelineStageStateRecord,
  ): Promise<{ record: LiteraturePipelineStageStateRecord; created: boolean }> {
    const key = this.pipelineStageKey(record.literatureId, record.stageCode);
    const existing = this.pipelineStageStates.get(key);
    if (existing) {
      const next: LiteraturePipelineStageStateRecord = {
        ...existing,
        status: record.status,
        lastRunId: record.lastRunId,
        detail: record.detail,
        updatedAt: record.updatedAt,
      };
      this.pipelineStageStates.set(key, next);
      return { record: next, created: false };
    }

    this.pipelineStageStates.set(key, record);
    const ids = this.pipelineStageIdsByLiterature.get(record.literatureId) ?? [];
    this.pipelineStageIdsByLiterature.set(record.literatureId, [...ids, key]);
    return { record, created: true };
  }

  async listPipelineStageStatesByLiteratureId(literatureId: string): Promise<LiteraturePipelineStageStateRecord[]> {
    const keys = this.pipelineStageIdsByLiterature.get(literatureId) ?? [];
    return keys
      .map((key) => this.pipelineStageStates.get(key))
      .filter((record): record is LiteraturePipelineStageStateRecord => record !== undefined)
      .sort((left, right) => left.stageCode.localeCompare(right.stageCode));
  }

  async listPipelineStageStatesByLiteratureIds(literatureIds: string[]): Promise<LiteraturePipelineStageStateRecord[]> {
    if (literatureIds.length === 0) {
      return [];
    }
    const keys = literatureIds.flatMap((literatureId) => this.pipelineStageIdsByLiterature.get(literatureId) ?? []);
    return keys
      .map((key) => this.pipelineStageStates.get(key))
      .filter((record): record is LiteraturePipelineStageStateRecord => record !== undefined);
  }

  async upsertPipelineArtifact(
    record: LiteraturePipelineArtifactRecord,
  ): Promise<{ record: LiteraturePipelineArtifactRecord; created: boolean }> {
    const key = this.pipelineArtifactKey(record.literatureId, record.stageCode, record.artifactType);
    const existing = this.pipelineArtifacts.get(key);
    if (existing) {
      const next: LiteraturePipelineArtifactRecord = {
        ...existing,
        payload: record.payload,
        payloadPath: record.payloadPath,
        checksum: record.checksum,
        updatedAt: record.updatedAt,
      };
      this.pipelineArtifacts.set(key, next);
      return { record: next, created: false };
    }

    this.pipelineArtifacts.set(key, record);
    const ids = this.pipelineArtifactIdsByLiterature.get(record.literatureId) ?? [];
    this.pipelineArtifactIdsByLiterature.set(record.literatureId, [...ids, key]);
    return { record, created: true };
  }

  async findPipelineArtifact(
    literatureId: string,
    stageCode: LiteraturePipelineArtifactRecord['stageCode'],
    artifactType: LiteraturePipelineArtifactRecord['artifactType'],
  ): Promise<LiteraturePipelineArtifactRecord | null> {
    const key = this.pipelineArtifactKey(literatureId, stageCode, artifactType);
    return this.pipelineArtifacts.get(key) ?? null;
  }

  async listPipelineArtifactsByLiteratureId(literatureId: string): Promise<LiteraturePipelineArtifactRecord[]> {
    const keys = this.pipelineArtifactIdsByLiterature.get(literatureId) ?? [];
    return keys
      .map((key) => this.pipelineArtifacts.get(key))
      .filter((record): record is LiteraturePipelineArtifactRecord => record !== undefined)
      .sort((left, right) => left.updatedAt.localeCompare(right.updatedAt));
  }

  async createEmbeddingVersion(record: LiteratureEmbeddingVersionRecord): Promise<LiteratureEmbeddingVersionRecord> {
    this.embeddingVersions.set(record.id, record);
    const ids = this.embeddingVersionIdsByLiterature.get(record.literatureId) ?? [];
    this.embeddingVersionIdsByLiterature.set(record.literatureId, [...ids, record.id]);
    return record;
  }

  async updateEmbeddingVersion(
    embeddingVersionId: string,
    patch: Partial<Omit<LiteratureEmbeddingVersionRecord, 'id' | 'literatureId' | 'versionNo' | 'createdAt'>>,
  ): Promise<LiteratureEmbeddingVersionRecord> {
    const existing = this.embeddingVersions.get(embeddingVersionId);
    if (!existing) {
      throw new Error(`Embedding version ${embeddingVersionId} not found.`);
    }
    const next = {
      ...existing,
      ...patch,
    };
    this.embeddingVersions.set(embeddingVersionId, next);
    return next;
  }

  async findEmbeddingVersionById(embeddingVersionId: string): Promise<LiteratureEmbeddingVersionRecord | null> {
    return this.embeddingVersions.get(embeddingVersionId) ?? null;
  }

  async findLatestEmbeddingVersionByLiteratureId(literatureId: string): Promise<LiteratureEmbeddingVersionRecord | null> {
    const ids = this.embeddingVersionIdsByLiterature.get(literatureId) ?? [];
    const versions = ids
      .map((id) => this.embeddingVersions.get(id))
      .filter((record): record is LiteratureEmbeddingVersionRecord => record !== undefined)
      .sort((left, right) => right.versionNo - left.versionNo);
    return versions[0] ?? null;
  }

  async listActiveEmbeddingVersions(): Promise<LiteratureEmbeddingVersionRecord[]> {
    return [...this.literatures.values()]
      .map((record) => (record.activeEmbeddingVersionId ? this.embeddingVersions.get(record.activeEmbeddingVersionId) : null))
      .filter((record): record is LiteratureEmbeddingVersionRecord => record !== null && record !== undefined);
  }

  async listEmbeddingVersionsByLiteratureIds(literatureIds: string[]): Promise<LiteratureEmbeddingVersionRecord[]> {
    if (literatureIds.length === 0) {
      return [];
    }
    const ids = literatureIds.flatMap((literatureId) => this.embeddingVersionIdsByLiterature.get(literatureId) ?? []);
    return ids
      .map((id) => this.embeddingVersions.get(id))
      .filter((record): record is LiteratureEmbeddingVersionRecord => record !== undefined)
      .sort((left, right) => {
        if (left.literatureId !== right.literatureId) {
          return left.literatureId.localeCompare(right.literatureId);
        }
        return left.versionNo - right.versionNo;
      });
  }

  async listActiveEmbeddingVersionsByLiteratureIds(literatureIds: string[]): Promise<LiteratureEmbeddingVersionRecord[]> {
    if (literatureIds.length === 0) {
      return [];
    }
    return literatureIds
      .map((literatureId) => this.literatures.get(literatureId))
      .filter((record): record is LiteratureRecord => record !== undefined)
      .map((record) => record.activeEmbeddingVersionId ? this.embeddingVersions.get(record.activeEmbeddingVersionId) : null)
      .filter((record): record is LiteratureEmbeddingVersionRecord => record !== undefined && record !== null);
  }

  async createEmbeddingChunks(records: LiteratureEmbeddingChunkRecord[]): Promise<LiteratureEmbeddingChunkRecord[]> {
    for (const record of records) {
      this.embeddingChunks.set(record.id, record);
      const ids = this.embeddingChunkIdsByVersion.get(record.embeddingVersionId) ?? [];
      this.embeddingChunkIdsByVersion.set(record.embeddingVersionId, [...ids, record.id]);
    }
    return records;
  }

  async listEmbeddingChunksByEmbeddingVersionId(embeddingVersionId: string): Promise<LiteratureEmbeddingChunkRecord[]> {
    const ids = this.embeddingChunkIdsByVersion.get(embeddingVersionId) ?? [];
    return ids
      .map((id) => this.embeddingChunks.get(id))
      .filter((record): record is LiteratureEmbeddingChunkRecord => record !== undefined)
      .sort((left, right) => left.chunkIndex - right.chunkIndex);
  }

  async listEmbeddingChunksByEmbeddingVersionIds(embeddingVersionIds: string[]): Promise<LiteratureEmbeddingChunkRecord[]> {
    if (embeddingVersionIds.length === 0) {
      return [];
    }
    const ids = embeddingVersionIds.flatMap((embeddingVersionId) => this.embeddingChunkIdsByVersion.get(embeddingVersionId) ?? []);
    return ids
      .map((id) => this.embeddingChunks.get(id))
      .filter((record): record is LiteratureEmbeddingChunkRecord => record !== undefined);
  }

  async replaceEmbeddingTokenIndexes(
    embeddingVersionId: string,
    records: LiteratureEmbeddingTokenIndexRecord[],
  ): Promise<LiteratureEmbeddingTokenIndexRecord[]> {
    const existingIds = this.embeddingTokenIndexIdsByVersion.get(embeddingVersionId) ?? [];
    for (const id of existingIds) {
      this.embeddingTokenIndexes.delete(id);
    }
    this.embeddingTokenIndexIdsByVersion.set(embeddingVersionId, []);

    for (const record of records) {
      this.embeddingTokenIndexes.set(record.id, record);
      const ids = this.embeddingTokenIndexIdsByVersion.get(record.embeddingVersionId) ?? [];
      this.embeddingTokenIndexIdsByVersion.set(record.embeddingVersionId, [...ids, record.id]);
    }
    return records;
  }

  async listEmbeddingTokenIndexesByEmbeddingVersionId(
    embeddingVersionId: string,
  ): Promise<LiteratureEmbeddingTokenIndexRecord[]> {
    const ids = this.embeddingTokenIndexIdsByVersion.get(embeddingVersionId) ?? [];
    return ids
      .map((id) => this.embeddingTokenIndexes.get(id))
      .filter((record): record is LiteratureEmbeddingTokenIndexRecord => record !== undefined)
      .sort((left, right) => left.token.localeCompare(right.token));
  }

  async createContentProcessingBatchJob(
    record: LiteratureContentProcessingBatchJobRecord,
    items: LiteratureContentProcessingBatchItemRecord[],
  ): Promise<LiteratureContentProcessingBatchJobRecord> {
    this.contentProcessingBatchJobs.set(record.id, record);
    this.contentProcessingBatchItemIdsByJob.set(record.id, []);
    for (const item of items) {
      this.contentProcessingBatchItems.set(item.id, item);
      const ids = this.contentProcessingBatchItemIdsByJob.get(item.jobId) ?? [];
      this.contentProcessingBatchItemIdsByJob.set(item.jobId, [...ids, item.id]);
    }
    return record;
  }

  async findContentProcessingBatchJobById(
    jobId: string,
  ): Promise<LiteratureContentProcessingBatchJobRecord | null> {
    return this.contentProcessingBatchJobs.get(jobId) ?? null;
  }

  async listContentProcessingBatchJobs(limit?: number): Promise<LiteratureContentProcessingBatchJobRecord[]> {
    const sorted = [...this.contentProcessingBatchJobs.values()]
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    if (typeof limit === 'number' && limit > 0) {
      return sorted.slice(0, limit);
    }
    return sorted;
  }

  async updateContentProcessingBatchJob(
    jobId: string,
    patch: Partial<Omit<LiteratureContentProcessingBatchJobRecord, 'id' | 'createdAt'>>,
  ): Promise<LiteratureContentProcessingBatchJobRecord> {
    const existing = this.contentProcessingBatchJobs.get(jobId);
    if (!existing) {
      throw new Error(`Content-processing batch job ${jobId} not found.`);
    }
    const next = {
      ...existing,
      ...patch,
    };
    this.contentProcessingBatchJobs.set(jobId, next);
    return next;
  }

  async deleteContentProcessingBatchJob(jobId: string): Promise<void> {
    const itemIds = this.contentProcessingBatchItemIdsByJob.get(jobId) ?? [];
    for (const itemId of itemIds) {
      this.contentProcessingBatchItems.delete(itemId);
    }
    this.contentProcessingBatchItemIdsByJob.delete(jobId);
    this.contentProcessingBatchJobs.delete(jobId);
  }

  async listContentProcessingBatchItemsByJobId(jobId: string): Promise<LiteratureContentProcessingBatchItemRecord[]> {
    const ids = this.contentProcessingBatchItemIdsByJob.get(jobId) ?? [];
    return ids
      .map((id) => this.contentProcessingBatchItems.get(id))
      .filter((record): record is LiteratureContentProcessingBatchItemRecord => record !== undefined)
      .sort((left, right) => {
        if (left.createdAt !== right.createdAt) {
          return left.createdAt.localeCompare(right.createdAt);
        }
        return left.id.localeCompare(right.id);
      });
  }

  async listContentProcessingBatchItemsByJobIdAndStatuses(
    jobId: string,
    statuses: LiteratureContentProcessingBatchItemStatus[],
    limit?: number,
  ): Promise<LiteratureContentProcessingBatchItemRecord[]> {
    const statusSet = new Set(statuses);
    const sorted = (await this.listContentProcessingBatchItemsByJobId(jobId))
      .filter((item) => statusSet.has(item.status));
    if (typeof limit === 'number' && limit > 0) {
      return sorted.slice(0, limit);
    }
    return sorted;
  }

  async updateContentProcessingBatchItem(
    itemId: string,
    patch: Partial<Omit<LiteratureContentProcessingBatchItemRecord, 'id' | 'jobId' | 'literatureId' | 'createdAt'>>,
  ): Promise<LiteratureContentProcessingBatchItemRecord> {
    const existing = this.contentProcessingBatchItems.get(itemId);
    if (!existing) {
      throw new Error(`Content-processing batch item ${itemId} not found.`);
    }
    const next = {
      ...existing,
      ...patch,
    };
    this.contentProcessingBatchItems.set(itemId, next);
    return next;
  }

  async createPipelineRun(record: LiteraturePipelineRunRecord): Promise<LiteraturePipelineRunRecord> {
    this.pipelineRuns.set(record.id, record);
    const ids = this.pipelineRunIdsByLiterature.get(record.literatureId) ?? [];
    this.pipelineRunIdsByLiterature.set(record.literatureId, [...ids, record.id]);
    return record;
  }

  async findPipelineRunById(runId: string): Promise<LiteraturePipelineRunRecord | null> {
    return this.pipelineRuns.get(runId) ?? null;
  }

  async listInFlightPipelineRunsByLiteratureId(literatureId: string): Promise<LiteraturePipelineRunRecord[]> {
    const ids = this.pipelineRunIdsByLiterature.get(literatureId) ?? [];
    return ids
      .map((id) => this.pipelineRuns.get(id))
      .filter((record): record is LiteraturePipelineRunRecord => record !== undefined)
      .filter((record) => record.status === 'PENDING' || record.status === 'RUNNING')
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  async listPipelineRunsByLiteratureId(literatureId: string, limit?: number): Promise<LiteraturePipelineRunRecord[]> {
    const ids = this.pipelineRunIdsByLiterature.get(literatureId) ?? [];
    const sorted = ids
      .map((id) => this.pipelineRuns.get(id))
      .filter((record): record is LiteraturePipelineRunRecord => record !== undefined)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    if (typeof limit === 'number' && limit > 0) {
      return sorted.slice(0, limit);
    }
    return sorted;
  }

  async updatePipelineRun(
    runId: string,
    patch: Partial<Omit<LiteraturePipelineRunRecord, 'id' | 'literatureId' | 'triggerSource' | 'createdAt'>>,
  ): Promise<LiteraturePipelineRunRecord> {
    const existing = this.pipelineRuns.get(runId);
    if (!existing) {
      throw new Error(`Pipeline run ${runId} not found.`);
    }
    const next: LiteraturePipelineRunRecord = {
      ...existing,
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.requestedStages !== undefined ? { requestedStages: patch.requestedStages } : {}),
      ...(patch.errorCode !== undefined ? { errorCode: patch.errorCode } : {}),
      ...(patch.errorMessage !== undefined ? { errorMessage: patch.errorMessage } : {}),
      ...(patch.startedAt !== undefined ? { startedAt: patch.startedAt } : {}),
      ...(patch.finishedAt !== undefined ? { finishedAt: patch.finishedAt } : {}),
      ...(patch.updatedAt !== undefined ? { updatedAt: patch.updatedAt } : {}),
    };
    this.pipelineRuns.set(runId, next);
    return next;
  }

  async createPipelineRunStep(record: LiteraturePipelineRunStepRecord): Promise<LiteraturePipelineRunStepRecord> {
    this.pipelineRunSteps.set(record.id, record);
    const ids = this.pipelineStepIdsByRun.get(record.runId) ?? [];
    this.pipelineStepIdsByRun.set(record.runId, [...ids, record.id]);
    return record;
  }

  async updatePipelineRunStep(
    stepId: string,
    patch: Partial<Omit<LiteraturePipelineRunStepRecord, 'id' | 'runId' | 'stageCode'>>,
  ): Promise<LiteraturePipelineRunStepRecord> {
    const existing = this.pipelineRunSteps.get(stepId);
    if (!existing) {
      throw new Error(`Pipeline run step ${stepId} not found.`);
    }
    const next: LiteraturePipelineRunStepRecord = {
      ...existing,
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.inputRef !== undefined ? { inputRef: patch.inputRef } : {}),
      ...(patch.outputRef !== undefined ? { outputRef: patch.outputRef } : {}),
      ...(patch.errorCode !== undefined ? { errorCode: patch.errorCode } : {}),
      ...(patch.errorMessage !== undefined ? { errorMessage: patch.errorMessage } : {}),
      ...(patch.startedAt !== undefined ? { startedAt: patch.startedAt } : {}),
      ...(patch.finishedAt !== undefined ? { finishedAt: patch.finishedAt } : {}),
    };
    this.pipelineRunSteps.set(stepId, next);
    return next;
  }

  async listPipelineRunStepsByRunId(runId: string): Promise<LiteraturePipelineRunStepRecord[]> {
    const ids = this.pipelineStepIdsByRun.get(runId) ?? [];
    return ids
      .map((id) => this.pipelineRunSteps.get(id))
      .filter((record): record is LiteraturePipelineRunStepRecord => record !== undefined)
      .sort((left, right) => {
        const leftTime = left.startedAt ? new Date(left.startedAt).getTime() : Number.POSITIVE_INFINITY;
        const rightTime = right.startedAt ? new Date(right.startedAt).getTime() : Number.POSITIVE_INFINITY;
        if (leftTime !== rightTime) {
          return leftTime - rightTime;
        }
        return left.id.localeCompare(right.id);
      });
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

  private pipelineStageKey(literatureId: string, stageCode: string): string {
    return `${literatureId}::${stageCode}`;
  }

  private pipelineArtifactKey(
    literatureId: string,
    stageCode: string,
    artifactType: string,
  ): string {
    return `${literatureId}::${stageCode}::${artifactType}`;
  }

  private contentAssetPathKey(literatureId: string, localPath: string): string {
    return `${literatureId}::${localPath}`;
  }
}
