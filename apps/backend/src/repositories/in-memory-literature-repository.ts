import type {
  LiteraturePipelineArtifactRecord,
  LiteratureRepository,
  LiteraturePipelineRunRecord,
  LiteraturePipelineRunStepRecord,
  LiteraturePipelineStageStateRecord,
  LiteraturePipelineStateRecord,
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

  private readonly pipelineStates = new Map<string, LiteraturePipelineStateRecord>();
  private readonly pipelineStageStates = new Map<string, LiteraturePipelineStageStateRecord>();
  private readonly pipelineStageIdsByLiterature = new Map<string, string[]>();
  private readonly pipelineRuns = new Map<string, LiteraturePipelineRunRecord>();
  private readonly pipelineRunIdsByLiterature = new Map<string, string[]>();
  private readonly pipelineRunSteps = new Map<string, LiteraturePipelineRunStepRecord>();
  private readonly pipelineStepIdsByRun = new Map<string, string[]>();
  private readonly pipelineArtifacts = new Map<string, LiteraturePipelineArtifactRecord>();
  private readonly pipelineArtifactIdsByLiterature = new Map<string, string[]>();

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
}
