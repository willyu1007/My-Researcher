import type {
  LiteratureAbstractProfileRecord,
  LiteratureCitationProfileRecord,
  LiteratureClusterEvidenceRecord,
  LiteratureClusterGraphRecord,
  LiteratureClusterMemberRecord,
  LiteratureClusterRecord,
  LiteratureClusterUpdatePatch,
  LiteratureContentAssetRecord,
  LiteratureContentProcessingBatchItemRecord,
  LiteratureContentProcessingBatchItemStatus,
  LiteratureContentProcessingBatchJobRecord,
  LiteratureEmbeddingChunkRecord,
  LiteratureEmbeddingRetrievalVectorChunkRecord,
  LiteratureEmbeddingRetrievalVectorWrite,
  LiteratureEmbeddingRetrievalVectorCoverageQuery,
  LiteratureEmbeddingRetrievalVectorCoverageSummary,
  LiteratureEmbeddingVectorCandidateQuery,
  LiteratureEmbeddingVectorCandidateRecord,
  LiteratureEmbeddingVectorCandidateResult,
  LiteratureEmbeddingTokenIndexRecord,
  LiteratureEmbeddingVersionRecord,
  LiteratureFulltextAcquisitionItemRecord,
  LiteratureFulltextAcquisitionItemStatus,
  LiteratureFulltextAcquisitionJobRecord,
  LiteratureFulltextDocumentRecord,
  LiteratureFulltextExtractionBundle,
  LiteratureFulltextParagraphRecord,
  LiteratureFulltextSectionRecord,
  LiteraturePipelineArtifactRecord,
  LiteratureRepository,
  LiteraturePipelineRunExclusiveCreateResult,
  LiteraturePipelineRunRecord,
  LiteraturePipelineRunStepRecord,
  LiteraturePipelineStageStateRecord,
  LiteraturePipelineStateRecord,
  LiteratureQualityAssessmentRecord,
  LiteratureRecord,
  LiteratureSourceRuntimeStateRecord,
  LiteratureSourceRecord,
  LiteratureFulltextAnchorRecord,
  ListLiteratureClustersFilter,
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
  private readonly qualityAssessmentsByLiterature = new Map<string, LiteratureQualityAssessmentRecord>();
  private readonly citationProfilesByLiterature = new Map<string, LiteratureCitationProfileRecord>();
  private readonly abstractProfilesByLiterature = new Map<string, LiteratureAbstractProfileRecord>();
  private readonly contentAssets = new Map<string, LiteratureContentAssetRecord>();
  private readonly contentAssetByLiteraturePath = new Map<string, string>();
  private readonly contentAssetIdsByLiterature = new Map<string, string[]>();
  private readonly literatureClusters = new Map<string, LiteratureClusterRecord>();
  private readonly literatureClusterMembers = new Map<string, LiteratureClusterMemberRecord>();
  private readonly literatureClusterEvidence = new Map<string, LiteratureClusterEvidenceRecord>();
  private readonly literatureClusterMemberIdsByCluster = new Map<string, string[]>();
  private readonly literatureClusterEvidenceIdsByCluster = new Map<string, string[]>();
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
  private readonly embeddingRetrievalVectors = new Map<string, number[]>();
  private readonly embeddingTokenIndexes = new Map<string, LiteratureEmbeddingTokenIndexRecord>();
  private readonly embeddingTokenIndexIdsByVersion = new Map<string, string[]>();
  private readonly contentProcessingBatchJobs = new Map<string, LiteratureContentProcessingBatchJobRecord>();
  private readonly contentProcessingBatchItems = new Map<string, LiteratureContentProcessingBatchItemRecord>();
  private readonly contentProcessingBatchItemIdsByJob = new Map<string, string[]>();
  private readonly fulltextAcquisitionJobs = new Map<string, LiteratureFulltextAcquisitionJobRecord>();
  private readonly fulltextAcquisitionItems = new Map<string, LiteratureFulltextAcquisitionItemRecord>();
  private readonly fulltextAcquisitionItemIdsByJob = new Map<string, string[]>();
  private readonly sourceRuntimeStates = new Map<string, LiteratureSourceRuntimeStateRecord>();

  async countLiteratures(): Promise<number> {
    return this.literatures.size;
  }

  async countLiteratureSources(): Promise<number> {
    return this.literatureSources.size;
  }

  async listTopicScopeIds(): Promise<string[]> {
    return [...this.topicScopes.values()].map((scope) => scope.id);
  }

  async listPaperLiteratureLinkIds(): Promise<string[]> {
    return [...this.paperLinks.values()].map((link) => link.id);
  }

  async listLiteratureSourceIds(): Promise<string[]> {
    return [...this.literatureSources.keys()];
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
        literatureId: record.literatureId,
        sourceUrl: record.sourceUrl,
        rawPayload: record.rawPayload,
        fetchedAt: record.fetchedAt,
      };
      if (current.literatureId !== record.literatureId) {
        const currentIds = this.sourceIdsByLiterature.get(current.literatureId) ?? [];
        this.sourceIdsByLiterature.set(
          current.literatureId,
          currentIds.filter((id) => id !== existingId),
        );
        const nextIds = this.sourceIdsByLiterature.get(record.literatureId) ?? [];
        if (!nextIds.includes(existingId)) {
          this.sourceIdsByLiterature.set(record.literatureId, [...nextIds, existingId]);
        }
      }
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

  async upsertQualityAssessment(
    record: LiteratureQualityAssessmentRecord,
  ): Promise<{ record: LiteratureQualityAssessmentRecord; created: boolean }> {
    const existing = this.qualityAssessmentsByLiterature.get(record.literatureId);
    const next = existing
      ? {
          ...record,
          id: existing.id,
          createdAt: existing.createdAt,
        }
      : record;
    this.qualityAssessmentsByLiterature.set(record.literatureId, next);
    return { record: next, created: !existing };
  }

  async findQualityAssessmentByLiteratureId(literatureId: string): Promise<LiteratureQualityAssessmentRecord | null> {
    return this.qualityAssessmentsByLiterature.get(literatureId) ?? null;
  }

  async listQualityAssessmentsByLiteratureIds(literatureIds: string[]): Promise<LiteratureQualityAssessmentRecord[]> {
    const ids = new Set(literatureIds);
    return [...this.qualityAssessmentsByLiterature.values()].filter((record) => ids.has(record.literatureId));
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

  async listContentAssetsByChecksum(checksum: string): Promise<LiteratureContentAssetRecord[]> {
    const normalizedChecksum = checksum.trim();
    if (!normalizedChecksum) {
      return [];
    }
    return [...this.contentAssets.values()]
      .filter((record) => record.checksum === normalizedChecksum)
      .sort((left, right) => {
        if (left.createdAt !== right.createdAt) {
          return left.createdAt.localeCompare(right.createdAt);
        }
        if (left.literatureId !== right.literatureId) {
          return left.literatureId.localeCompare(right.literatureId);
        }
        return left.id.localeCompare(right.id);
      });
  }

  async findContentAssetById(assetId: string): Promise<LiteratureContentAssetRecord | null> {
    return this.contentAssets.get(assetId) ?? null;
  }

  async upsertLiteratureCluster(
    record: LiteratureClusterRecord,
    members: LiteratureClusterMemberRecord[],
    evidence: LiteratureClusterEvidenceRecord[],
  ): Promise<LiteratureClusterGraphRecord> {
    const existing = this.literatureClusters.get(record.id);
    const next: LiteratureClusterRecord = existing
      ? {
          ...record,
          status: existing.status,
          representativeLiteratureId: existing.representativeLiteratureId ?? record.representativeLiteratureId,
          confidence: Math.max(existing.confidence, record.confidence),
          createdAt: existing.createdAt,
        }
      : record;
    this.literatureClusters.set(record.id, next);

    for (const member of members) {
      const existingMember = [...this.literatureClusterMembers.values()].find((item) =>
        item.clusterId === member.clusterId && item.literatureId === member.literatureId);
      const nextMember: LiteratureClusterMemberRecord = existingMember
        ? {
            ...member,
            id: existingMember.id,
            decisionStatus: existingMember.decisionStatus,
            createdAt: existingMember.createdAt,
          }
        : member;
      this.literatureClusterMembers.set(nextMember.id, nextMember);
      const ids = this.literatureClusterMemberIdsByCluster.get(member.clusterId) ?? [];
      if (!ids.includes(nextMember.id)) {
        this.literatureClusterMemberIdsByCluster.set(member.clusterId, [...ids, nextMember.id]);
      }
    }

    for (const item of evidence) {
      const existingEvidence = [...this.literatureClusterEvidence.values()].find((row) =>
        row.clusterId === item.clusterId
        && row.literatureIdA === item.literatureIdA
        && row.literatureIdB === item.literatureIdB
        && row.signalType === item.signalType);
      const nextEvidence: LiteratureClusterEvidenceRecord = existingEvidence
        ? { ...item, id: existingEvidence.id, createdAt: existingEvidence.createdAt }
        : item;
      this.literatureClusterEvidence.set(nextEvidence.id, nextEvidence);
      const ids = this.literatureClusterEvidenceIdsByCluster.get(item.clusterId) ?? [];
      if (!ids.includes(nextEvidence.id)) {
        this.literatureClusterEvidenceIdsByCluster.set(item.clusterId, [...ids, nextEvidence.id]);
      }
    }

    const graph = await this.findLiteratureClusterById(record.id);
    if (!graph) {
      throw new Error(`Literature cluster ${record.id} was not persisted.`);
    }
    return graph;
  }

  async findLiteratureClusterById(clusterId: string): Promise<LiteratureClusterGraphRecord | null> {
    const cluster = this.literatureClusters.get(clusterId);
    if (!cluster) {
      return null;
    }
    return {
      cluster,
      members: (this.literatureClusterMemberIdsByCluster.get(clusterId) ?? [])
        .map((id) => this.literatureClusterMembers.get(id))
        .filter((item): item is LiteratureClusterMemberRecord => item !== undefined)
        .sort((left, right) => left.role.localeCompare(right.role) || left.literatureId.localeCompare(right.literatureId)),
      evidence: (this.literatureClusterEvidenceIdsByCluster.get(clusterId) ?? [])
        .map((id) => this.literatureClusterEvidence.get(id))
        .filter((item): item is LiteratureClusterEvidenceRecord => item !== undefined)
        .sort((left, right) =>
          left.signalType.localeCompare(right.signalType)
          || left.literatureIdA.localeCompare(right.literatureIdA)
          || left.literatureIdB.localeCompare(right.literatureIdB)),
    };
  }

  async listLiteratureClusters(filter: ListLiteratureClustersFilter = {}): Promise<LiteratureClusterGraphRecord[]> {
    const graphs = await Promise.all(
      [...this.literatureClusters.values()]
        .filter((cluster) => !filter.status || cluster.status === filter.status)
        .filter((cluster) => !filter.clusterType || cluster.clusterType === filter.clusterType)
        .map((cluster) => this.findLiteratureClusterById(cluster.id)),
    );
    return graphs
      .filter((graph): graph is LiteratureClusterGraphRecord => graph !== null)
      .filter((graph) => !filter.literatureId || graph.members.some((member) => member.literatureId === filter.literatureId))
      .filter((graph) => {
        const literatureIds = filter.literatureIds ?? [];
        return literatureIds.length === 0
          || graph.members.some((member) => literatureIds.includes(member.literatureId));
      })
      .sort((left, right) => right.cluster.updatedAt.localeCompare(left.cluster.updatedAt) || left.cluster.id.localeCompare(right.cluster.id))
      .slice(0, filter.limit ?? graphs.length);
  }

  async updateLiteratureCluster(
    clusterId: string,
    patch: LiteratureClusterUpdatePatch,
  ): Promise<LiteratureClusterGraphRecord> {
    const existing = this.literatureClusters.get(clusterId);
    if (!existing) {
      throw new Error(`Literature cluster ${clusterId} not found.`);
    }
    this.literatureClusters.set(clusterId, {
      ...existing,
      status: patch.status ?? existing.status,
      representativeLiteratureId: patch.representativeLiteratureId !== undefined
        ? patch.representativeLiteratureId
        : existing.representativeLiteratureId,
      confidence: patch.confidence ?? existing.confidence,
      method: patch.method ?? existing.method,
      updatedAt: patch.updatedAt ?? new Date().toISOString(),
    });
    const graph = await this.findLiteratureClusterById(clusterId);
    if (!graph) {
      throw new Error(`Literature cluster ${clusterId} not found after update.`);
    }
    return graph;
  }

  async updateLiteratureClusterMember(
    clusterId: string,
    literatureId: string,
    patch: Partial<Omit<LiteratureClusterMemberRecord, 'id' | 'clusterId' | 'literatureId' | 'createdAt'>>,
  ): Promise<LiteratureClusterMemberRecord> {
    const existing = [...this.literatureClusterMembers.values()].find((member) =>
      member.clusterId === clusterId && member.literatureId === literatureId);
    if (!existing) {
      throw new Error(`Literature cluster member ${clusterId}/${literatureId} not found.`);
    }
    const next = {
      ...existing,
      role: patch.role ?? existing.role,
      relationType: patch.relationType ?? existing.relationType,
      confidence: patch.confidence ?? existing.confidence,
      decisionStatus: patch.decisionStatus ?? existing.decisionStatus,
      updatedAt: patch.updatedAt ?? new Date().toISOString(),
    };
    this.literatureClusterMembers.set(existing.id, next);
    return next;
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
        activationStatus: record.activationStatus,
        activationReason: record.activationReason,
        activationScore: record.activationScore,
        activatedAt: record.activatedAt,
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

  async listTopicScopesByLiteratureId(literatureId: string): Promise<TopicLiteratureScopeRecord[]> {
    return [...this.topicScopes.values()]
      .filter((row) => row.literatureId === literatureId)
      .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
  }

  async updateTopicScopeActivation(
    topicId: string,
    literatureId: string,
    patch: {
      activationStatus: TopicLiteratureScopeRecord['activationStatus'];
      activationReason?: string | null;
      activationScore?: number | null;
      activatedAt?: string | null;
      updatedAt: string;
    },
  ): Promise<TopicLiteratureScopeRecord> {
    const key = this.topicScopeKey(topicId, literatureId);
    const existing = this.topicScopes.get(key);
    if (!existing) {
      throw new Error(`Topic scope ${topicId}/${literatureId} not found.`);
    }
    const next: TopicLiteratureScopeRecord = {
      ...existing,
      activationStatus: patch.activationStatus,
      activationReason: patch.activationReason !== undefined ? patch.activationReason : existing.activationReason,
      activationScore: patch.activationScore !== undefined ? patch.activationScore : existing.activationScore,
      activatedAt: patch.activatedAt !== undefined ? patch.activatedAt : existing.activatedAt,
      updatedAt: patch.updatedAt,
    };
    this.topicScopes.set(key, next);
    return next;
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

  async listEmbeddingRetrievalVectorChunksByEmbeddingVersionIds(
    embeddingVersionIds: string[],
  ): Promise<LiteratureEmbeddingRetrievalVectorChunkRecord[]> {
    if (embeddingVersionIds.length === 0) {
      return [];
    }
    const versionIds = new Set(embeddingVersionIds);
    return [...this.embeddingChunks.values()]
      .filter((chunk) => versionIds.has(chunk.embeddingVersionId))
      .map((chunk) => ({
        chunk,
        vector: this.embeddingRetrievalVectors.get(chunk.id),
      }))
      .filter((item): item is { chunk: LiteratureEmbeddingChunkRecord; vector: number[] } => item.vector !== undefined)
      .map(({ chunk, vector }) => ({
        embeddingVersionId: chunk.embeddingVersionId,
        literatureId: chunk.literatureId,
        chunkId: chunk.chunkId,
        vector: [...vector],
      }));
  }

  async writeEmbeddingRetrievalVectors(records: LiteratureEmbeddingRetrievalVectorWrite[]): Promise<number> {
    let writtenCount = 0;
    for (const record of records) {
      if (!this.embeddingChunks.has(record.embeddingChunkId)) {
        continue;
      }
      this.embeddingRetrievalVectors.set(record.embeddingChunkId, [...record.normalizedVector]);
      writtenCount += 1;
    }
    return writtenCount;
  }

  async summarizeEmbeddingRetrievalVectorCoverage(
    query: LiteratureEmbeddingRetrievalVectorCoverageQuery,
  ): Promise<LiteratureEmbeddingRetrievalVectorCoverageSummary> {
    const versionIds = new Set(query.embeddingVersionIds);
    if (versionIds.size === 0) {
      return {
        embeddingVersionCount: 0,
        literatureCount: 0,
        chunkCount: 0,
        nativeVectorCount: 0,
        missingNativeVectorCount: 0,
        coverageRatio: 0,
        byVersion: [],
      };
    }
    const byVersionMap = new Map<string, {
      embeddingVersionId: string;
      literatureId: string;
      chunkCount: number;
      nativeVectorCount: number;
      missingNativeVectorCount: number;
    }>();
    for (const chunk of this.embeddingChunks.values()) {
      if (!versionIds.has(chunk.embeddingVersionId)) {
        continue;
      }
      const existing = byVersionMap.get(chunk.embeddingVersionId) ?? {
        embeddingVersionId: chunk.embeddingVersionId,
        literatureId: chunk.literatureId,
        chunkCount: 0,
        nativeVectorCount: 0,
        missingNativeVectorCount: 0,
      };
      existing.chunkCount += 1;
      if (this.embeddingRetrievalVectors.has(chunk.id)) {
        existing.nativeVectorCount += 1;
      } else {
        existing.missingNativeVectorCount += 1;
      }
      byVersionMap.set(chunk.embeddingVersionId, existing);
    }
    const byVersion = [...byVersionMap.values()]
      .sort((left, right) =>
        left.literatureId.localeCompare(right.literatureId)
        || left.embeddingVersionId.localeCompare(right.embeddingVersionId));
    const chunkCount = byVersion.reduce((sum, row) => sum + row.chunkCount, 0);
    const nativeVectorCount = byVersion.reduce((sum, row) => sum + row.nativeVectorCount, 0);
    return {
      embeddingVersionCount: byVersion.length,
      literatureCount: new Set(byVersion.map((row) => row.literatureId)).size,
      chunkCount,
      nativeVectorCount,
      missingNativeVectorCount: byVersion.reduce((sum, row) => sum + row.missingNativeVectorCount, 0),
      coverageRatio: chunkCount === 0 ? 0 : nativeVectorCount / chunkCount,
      byVersion,
    };
  }

  async listEmbeddingVectorCandidates(
    query: LiteratureEmbeddingVectorCandidateQuery,
  ): Promise<LiteratureEmbeddingVectorCandidateResult> {
    const candidateLimit = Math.max(1, Math.min(5000, Math.trunc(query.candidateLimit)));
    const perLiteratureCandidateCap = Math.max(1, Math.min(5000, Math.trunc(query.perLiteratureCandidateCap)));
    const versionIds = new Set(query.eligibleEmbeddingVersionIds);
    const startedAt = Date.now();
    const filtered = [...this.embeddingChunks.values()]
      .filter((chunk) => versionIds.has(chunk.embeddingVersionId))
      .map((chunk) => ({
        chunk,
        vector: this.embeddingRetrievalVectors.get(chunk.id),
      }))
      .filter((item): item is { chunk: LiteratureEmbeddingChunkRecord; vector: number[] } => item.vector !== undefined);
    const rankedByLiterature = new Map<string, Array<{ chunk: LiteratureEmbeddingChunkRecord; vector: number[]; negativeInnerProduct: number }>>();
    for (const item of filtered) {
      const negativeInnerProduct = -dotProduct(item.vector, query.normalizedQueryVector);
      const rows = rankedByLiterature.get(item.chunk.literatureId) ?? [];
      rows.push({ ...item, negativeInnerProduct });
      rankedByLiterature.set(item.chunk.literatureId, rows);
    }
    const capped = [...rankedByLiterature.values()].flatMap((rows) =>
      rows
        .sort((left, right) => left.negativeInnerProduct - right.negativeInnerProduct || left.chunk.id.localeCompare(right.chunk.id))
        .slice(0, perLiteratureCandidateCap),
    );
    const candidates = capped
      .sort((left, right) => left.negativeInnerProduct - right.negativeInnerProduct || left.chunk.id.localeCompare(right.chunk.id))
      .slice(0, candidateLimit)
      .map(({ chunk, negativeInnerProduct }): LiteratureEmbeddingVectorCandidateRecord => ({
        id: chunk.id,
        embeddingVersionId: chunk.embeddingVersionId,
        literatureId: chunk.literatureId,
        chunkId: chunk.chunkId,
        chunkIndex: chunk.chunkIndex,
        text: chunk.text,
        startOffset: chunk.startOffset,
        endOffset: chunk.endOffset,
        chunkType: chunk.chunkType,
        sourceRefs: chunk.sourceRefs,
        metadata: chunk.metadata,
        contentChecksum: chunk.contentChecksum,
        createdAt: chunk.createdAt,
        updatedAt: chunk.updatedAt,
        vectorScore: Math.max(0, Math.min(1, (-negativeInnerProduct + 1) / 2)),
        negativeInnerProduct,
      }));

    return {
      candidates,
      telemetry: {
        candidateLimit,
        candidateReturned: candidates.length,
        candidateLimitHit: candidates.length >= candidateLimit,
        perLiteratureCandidateCap,
        filteredEmbeddingVersionCount: query.eligibleEmbeddingVersionIds.length,
        filteredChunkCount: filtered.length,
        dbSimilarityQueryMs: Date.now() - startedAt,
      },
    };
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

  async createFulltextAcquisitionJob(
    record: LiteratureFulltextAcquisitionJobRecord,
    items: LiteratureFulltextAcquisitionItemRecord[],
  ): Promise<LiteratureFulltextAcquisitionJobRecord> {
    this.fulltextAcquisitionJobs.set(record.id, record);
    this.fulltextAcquisitionItemIdsByJob.set(record.id, []);
    for (const item of items) {
      this.fulltextAcquisitionItems.set(item.id, item);
      const ids = this.fulltextAcquisitionItemIdsByJob.get(item.jobId) ?? [];
      this.fulltextAcquisitionItemIdsByJob.set(item.jobId, [...ids, item.id]);
    }
    return record;
  }

  async findFulltextAcquisitionJobById(jobId: string): Promise<LiteratureFulltextAcquisitionJobRecord | null> {
    return this.fulltextAcquisitionJobs.get(jobId) ?? null;
  }

  async listFulltextAcquisitionJobs(limit?: number): Promise<LiteratureFulltextAcquisitionJobRecord[]> {
    const sorted = [...this.fulltextAcquisitionJobs.values()]
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    return typeof limit === 'number' && limit > 0 ? sorted.slice(0, limit) : sorted;
  }

  async updateFulltextAcquisitionJob(
    jobId: string,
    patch: Partial<Omit<LiteratureFulltextAcquisitionJobRecord, 'id' | 'createdAt'>>,
  ): Promise<LiteratureFulltextAcquisitionJobRecord> {
    const existing = this.fulltextAcquisitionJobs.get(jobId);
    if (!existing) {
      throw new Error(`Fulltext acquisition job ${jobId} not found.`);
    }
    const next = { ...existing, ...patch };
    this.fulltextAcquisitionJobs.set(jobId, next);
    return next;
  }

  async deleteFulltextAcquisitionJob(jobId: string): Promise<void> {
    const itemIds = this.fulltextAcquisitionItemIdsByJob.get(jobId) ?? [];
    for (const itemId of itemIds) {
      this.fulltextAcquisitionItems.delete(itemId);
    }
    this.fulltextAcquisitionItemIdsByJob.delete(jobId);
    this.fulltextAcquisitionJobs.delete(jobId);
  }

  async listFulltextAcquisitionItemsByJobId(jobId: string): Promise<LiteratureFulltextAcquisitionItemRecord[]> {
    const ids = this.fulltextAcquisitionItemIdsByJob.get(jobId) ?? [];
    return ids
      .map((id) => this.fulltextAcquisitionItems.get(id))
      .filter((record): record is LiteratureFulltextAcquisitionItemRecord => record !== undefined)
      .sort((left, right) => {
        if (left.createdAt !== right.createdAt) {
          return left.createdAt.localeCompare(right.createdAt);
        }
        return left.id.localeCompare(right.id);
      });
  }

  async listFulltextAcquisitionItemsByJobIdAndStatuses(
    jobId: string,
    statuses: LiteratureFulltextAcquisitionItemStatus[],
    limit?: number,
  ): Promise<LiteratureFulltextAcquisitionItemRecord[]> {
    const statusSet = new Set(statuses);
    const sorted = (await this.listFulltextAcquisitionItemsByJobId(jobId))
      .filter((item) => statusSet.has(item.status));
    return typeof limit === 'number' && limit > 0 ? sorted.slice(0, limit) : sorted;
  }

  async updateFulltextAcquisitionItem(
    itemId: string,
    patch: Partial<Omit<LiteratureFulltextAcquisitionItemRecord, 'id' | 'jobId' | 'literatureId' | 'createdAt'>>,
  ): Promise<LiteratureFulltextAcquisitionItemRecord> {
    const existing = this.fulltextAcquisitionItems.get(itemId);
    if (!existing) {
      throw new Error(`Fulltext acquisition item ${itemId} not found.`);
    }
    const next = { ...existing, ...patch };
    this.fulltextAcquisitionItems.set(itemId, next);
    return next;
  }

  async upsertSourceRuntimeState(
    record: LiteratureSourceRuntimeStateRecord,
  ): Promise<{ record: LiteratureSourceRuntimeStateRecord; created: boolean }> {
    const created = !this.sourceRuntimeStates.has(record.source);
    this.sourceRuntimeStates.set(record.source, record);
    return { record, created };
  }

  async findSourceRuntimeState(source: string): Promise<LiteratureSourceRuntimeStateRecord | null> {
    return this.sourceRuntimeStates.get(source) ?? null;
  }

  async listSourceRuntimeStates(): Promise<LiteratureSourceRuntimeStateRecord[]> {
    return [...this.sourceRuntimeStates.values()].sort((left, right) => left.source.localeCompare(right.source));
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

  // T-130 W-01: global in-flight listing for startup orphan recovery.
  async listInFlightPipelineRuns(): Promise<LiteraturePipelineRunRecord[]> {
    return [...this.pipelineRuns.values()]
      .filter((record) => record.status === 'PENDING' || record.status === 'RUNNING')
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  // T-130 W-01: close an abandoned in-flight run and fail its still-open stage states.
  async closePipelineRunAsOrphaned(runId: string, nowIso: string): Promise<void> {
    this.closePipelineRunAsOrphanedSync(
      runId,
      nowIso,
      'In-flight run had no live worker (process restart or stale in-flight window) and was closed by orphan recovery.',
    );
  }

  private closePipelineRunAsOrphanedSync(runId: string, nowIso: string, message: string): void {
    const run = this.pipelineRuns.get(runId);
    if (!run || (run.status !== 'PENDING' && run.status !== 'RUNNING')) {
      return;
    }
    this.pipelineRuns.set(runId, {
      ...run,
      status: 'FAILED',
      errorCode: 'PIPELINE_RUN_ORPHANED',
      errorMessage: message,
      finishedAt: nowIso,
      updatedAt: nowIso,
    });
    for (const [key, stage] of this.pipelineStageStates) {
      if (stage.lastRunId === runId && (stage.status === 'PENDING' || stage.status === 'RUNNING')) {
        this.pipelineStageStates.set(key, {
          ...stage,
          status: 'FAILED',
          updatedAt: nowIso,
        });
      }
    }
  }

  // T-130 W-01: atomic single-flight admission. The body is fully synchronous, so concurrent
  // callers within one process cannot interleave between the in-flight check and the insert —
  // mirroring the Postgres advisory-xact-lock semantics of the Prisma implementation.
  async createPipelineRunExclusive(
    record: LiteraturePipelineRunRecord,
    staleBeforeIso: string,
  ): Promise<LiteraturePipelineRunExclusiveCreateResult> {
    const ids = this.pipelineRunIdsByLiterature.get(record.literatureId) ?? [];
    const inFlight = ids
      .map((id) => this.pipelineRuns.get(id))
      .filter((candidate): candidate is LiteraturePipelineRunRecord => candidate !== undefined)
      .filter((candidate) => candidate.status === 'PENDING' || candidate.status === 'RUNNING');
    const live = inFlight.filter((candidate) => candidate.updatedAt >= staleBeforeIso);
    if (live.length > 0) {
      return { outcome: 'in_flight', inFlight: live.map((candidate) => ({ ...candidate })) };
    }

    const orphanedRunIds: string[] = [];
    for (const candidate of inFlight) {
      if (candidate.updatedAt < staleBeforeIso) {
        this.closePipelineRunAsOrphanedSync(
          candidate.id,
          record.createdAt,
          'In-flight run exceeded the stale window without progress and was closed by orphan recovery.',
        );
        orphanedRunIds.push(candidate.id);
      }
    }

    const created: LiteraturePipelineRunRecord = { ...record, requestedStages: [...record.requestedStages] };
    this.pipelineRuns.set(created.id, created);
    this.pipelineRunIdsByLiterature.set(record.literatureId, [...ids, created.id]);
    return { outcome: 'created', run: { ...created }, orphanedRunIds };
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
    for (const [key, id] of this.doiIndex.entries()) {
      if (id === record.id && key !== record.doiNormalized) {
        this.doiIndex.delete(key);
      }
    }
    for (const [key, id] of this.arxivIndex.entries()) {
      if (id === record.id && key !== record.arxivId) {
        this.arxivIndex.delete(key);
      }
    }
    for (const [key, id] of this.titleAuthorsYearIndex.entries()) {
      if (id === record.id && key !== record.titleAuthorsYearHash) {
        this.titleAuthorsYearIndex.delete(key);
      }
    }
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

function dotProduct(left: number[], right: number[]): number {
  const length = Math.min(left.length, right.length);
  let dot = 0;
  for (let index = 0; index < length; index += 1) {
    dot += (left[index] ?? 0) * (right[index] ?? 0);
  }
  return dot;
}
