import type { PrismaClient } from '@prisma/client';
import type {
  LiteratureEmbeddingChunkRecord,
  LiteratureEmbeddingTokenIndexRecord,
  LiteratureEmbeddingVersionRecord,
  LiteraturePipelineArtifactRecord,
  LiteraturePipelineRunRecord,
  LiteraturePipelineRunStepRecord,
  LiteraturePipelineStageStateRecord,
  LiteraturePipelineStateRecord,
  LiteratureRecord,
  LiteratureRepository,
  LiteratureSourceRecord,
  PaperLiteratureLinkRecord,
  TopicLiteratureScopeRecord,
} from '../literature-repository.js';
import { PrismaLiteratureCoreStore } from './literature/prisma-literature-core-store.js';
import { PrismaLiteratureEmbeddingStore } from './literature/prisma-literature-embedding-store.js';
import { PrismaLiteraturePipelineStore } from './literature/prisma-literature-pipeline-store.js';

export class PrismaLiteratureRepository implements LiteratureRepository {
  private readonly coreStore: PrismaLiteratureCoreStore;
  private readonly pipelineStore: PrismaLiteraturePipelineStore;
  private readonly embeddingStore: PrismaLiteratureEmbeddingStore;

  constructor(prisma: PrismaClient) {
    this.coreStore = new PrismaLiteratureCoreStore(prisma);
    this.pipelineStore = new PrismaLiteraturePipelineStore(prisma);
    this.embeddingStore = new PrismaLiteratureEmbeddingStore(prisma);
  }

  async countLiteratures(): Promise<number> {
    return this.coreStore.countLiteratures();
  }

  async countLiteratureSources(): Promise<number> {
    return this.coreStore.countLiteratureSources();
  }

  async countTopicScopes(): Promise<number> {
    return this.coreStore.countTopicScopes();
  }

  async countPaperLiteratureLinks(): Promise<number> {
    return this.coreStore.countPaperLiteratureLinks();
  }

  async createLiterature(record: LiteratureRecord): Promise<LiteratureRecord> {
    return this.coreStore.createLiterature(record);
  }

  async updateLiterature(record: LiteratureRecord): Promise<LiteratureRecord> {
    return this.coreStore.updateLiterature(record);
  }

  async findLiteratureById(literatureId: string): Promise<LiteratureRecord | null> {
    return this.coreStore.findLiteratureById(literatureId);
  }

  async listLiteratures(): Promise<LiteratureRecord[]> {
    return this.coreStore.listLiteratures();
  }

  async findLiteratureByDoi(doiNormalized: string): Promise<LiteratureRecord | null> {
    return this.coreStore.findLiteratureByDoi(doiNormalized);
  }

  async findLiteratureByArxivId(arxivId: string): Promise<LiteratureRecord | null> {
    return this.coreStore.findLiteratureByArxivId(arxivId);
  }

  async findLiteratureByTitleAuthorsYearHash(hash: string): Promise<LiteratureRecord | null> {
    return this.coreStore.findLiteratureByTitleAuthorsYearHash(hash);
  }

  async listLiteraturesByIds(literatureIds: string[]): Promise<LiteratureRecord[]> {
    return this.coreStore.listLiteraturesByIds(literatureIds);
  }

  async upsertLiteratureSource(
    record: LiteratureSourceRecord,
  ): Promise<{ record: LiteratureSourceRecord; created: boolean }> {
    return this.coreStore.upsertLiteratureSource(record);
  }

  async listSourcesByLiteratureId(literatureId: string): Promise<LiteratureSourceRecord[]> {
    return this.coreStore.listSourcesByLiteratureId(literatureId);
  }

  async upsertTopicScope(
    record: TopicLiteratureScopeRecord,
  ): Promise<{ record: TopicLiteratureScopeRecord; created: boolean }> {
    return this.coreStore.upsertTopicScope(record);
  }

  async listTopicScopesByTopicId(topicId: string): Promise<TopicLiteratureScopeRecord[]> {
    return this.coreStore.listTopicScopesByTopicId(topicId);
  }

  async upsertPaperLiteratureLink(
    record: PaperLiteratureLinkRecord,
  ): Promise<{ record: PaperLiteratureLinkRecord; created: boolean }> {
    return this.coreStore.upsertPaperLiteratureLink(record);
  }

  async findPaperLiteratureLinkById(linkId: string): Promise<PaperLiteratureLinkRecord | null> {
    return this.coreStore.findPaperLiteratureLinkById(linkId);
  }

  async listPaperLiteratureLinksByPaperId(paperId: string): Promise<PaperLiteratureLinkRecord[]> {
    return this.coreStore.listPaperLiteratureLinksByPaperId(paperId);
  }

  async updatePaperLiteratureLink(
    linkId: string,
    patch: { citationStatus?: PaperLiteratureLinkRecord['citationStatus']; note?: string | null },
  ): Promise<PaperLiteratureLinkRecord> {
    return this.coreStore.updatePaperLiteratureLink(linkId, patch);
  }

  async upsertPipelineState(
    record: LiteraturePipelineStateRecord,
  ): Promise<{ record: LiteraturePipelineStateRecord; created: boolean }> {
    return this.pipelineStore.upsertPipelineState(record);
  }

  async findPipelineStateByLiteratureId(literatureId: string): Promise<LiteraturePipelineStateRecord | null> {
    return this.pipelineStore.findPipelineStateByLiteratureId(literatureId);
  }

  async listPipelineStatesByLiteratureIds(literatureIds: string[]): Promise<LiteraturePipelineStateRecord[]> {
    return this.pipelineStore.listPipelineStatesByLiteratureIds(literatureIds);
  }

  async upsertPipelineStageState(
    record: LiteraturePipelineStageStateRecord,
  ): Promise<{ record: LiteraturePipelineStageStateRecord; created: boolean }> {
    return this.pipelineStore.upsertPipelineStageState(record);
  }

  async listPipelineStageStatesByLiteratureId(literatureId: string): Promise<LiteraturePipelineStageStateRecord[]> {
    return this.pipelineStore.listPipelineStageStatesByLiteratureId(literatureId);
  }

  async listPipelineStageStatesByLiteratureIds(literatureIds: string[]): Promise<LiteraturePipelineStageStateRecord[]> {
    return this.pipelineStore.listPipelineStageStatesByLiteratureIds(literatureIds);
  }

  async upsertPipelineArtifact(
    record: LiteraturePipelineArtifactRecord,
  ): Promise<{ record: LiteraturePipelineArtifactRecord; created: boolean }> {
    return this.pipelineStore.upsertPipelineArtifact(record);
  }

  async findPipelineArtifact(
    literatureId: string,
    stageCode: LiteraturePipelineArtifactRecord['stageCode'],
    artifactType: LiteraturePipelineArtifactRecord['artifactType'],
  ): Promise<LiteraturePipelineArtifactRecord | null> {
    return this.pipelineStore.findPipelineArtifact(literatureId, stageCode, artifactType);
  }

  async listPipelineArtifactsByLiteratureId(literatureId: string): Promise<LiteraturePipelineArtifactRecord[]> {
    return this.pipelineStore.listPipelineArtifactsByLiteratureId(literatureId);
  }

  async createEmbeddingVersion(record: LiteratureEmbeddingVersionRecord): Promise<LiteratureEmbeddingVersionRecord> {
    return this.embeddingStore.createEmbeddingVersion(record);
  }

  async findEmbeddingVersionById(embeddingVersionId: string): Promise<LiteratureEmbeddingVersionRecord | null> {
    return this.embeddingStore.findEmbeddingVersionById(embeddingVersionId);
  }

  async findLatestEmbeddingVersionByLiteratureId(literatureId: string): Promise<LiteratureEmbeddingVersionRecord | null> {
    return this.embeddingStore.findLatestEmbeddingVersionByLiteratureId(literatureId);
  }

  async listActiveEmbeddingVersions(): Promise<LiteratureEmbeddingVersionRecord[]> {
    return this.embeddingStore.listActiveEmbeddingVersions();
  }

  async listEmbeddingVersionsByLiteratureIds(literatureIds: string[]): Promise<LiteratureEmbeddingVersionRecord[]> {
    return this.embeddingStore.listEmbeddingVersionsByLiteratureIds(literatureIds);
  }

  async listActiveEmbeddingVersionsByLiteratureIds(
    literatureIds: string[],
  ): Promise<LiteratureEmbeddingVersionRecord[]> {
    return this.embeddingStore.listActiveEmbeddingVersionsByLiteratureIds(literatureIds);
  }

  async createEmbeddingChunks(records: LiteratureEmbeddingChunkRecord[]): Promise<LiteratureEmbeddingChunkRecord[]> {
    return this.embeddingStore.createEmbeddingChunks(records);
  }

  async listEmbeddingChunksByEmbeddingVersionId(embeddingVersionId: string): Promise<LiteratureEmbeddingChunkRecord[]> {
    return this.embeddingStore.listEmbeddingChunksByEmbeddingVersionId(embeddingVersionId);
  }

  async listEmbeddingChunksByEmbeddingVersionIds(
    embeddingVersionIds: string[],
  ): Promise<LiteratureEmbeddingChunkRecord[]> {
    return this.embeddingStore.listEmbeddingChunksByEmbeddingVersionIds(embeddingVersionIds);
  }

  async createEmbeddingTokenIndexes(
    records: LiteratureEmbeddingTokenIndexRecord[],
  ): Promise<LiteratureEmbeddingTokenIndexRecord[]> {
    return this.embeddingStore.createEmbeddingTokenIndexes(records);
  }

  async listEmbeddingTokenIndexesByEmbeddingVersionId(
    embeddingVersionId: string,
  ): Promise<LiteratureEmbeddingTokenIndexRecord[]> {
    return this.embeddingStore.listEmbeddingTokenIndexesByEmbeddingVersionId(embeddingVersionId);
  }

  async createPipelineRun(record: LiteraturePipelineRunRecord): Promise<LiteraturePipelineRunRecord> {
    return this.pipelineStore.createPipelineRun(record);
  }

  async findPipelineRunById(runId: string): Promise<LiteraturePipelineRunRecord | null> {
    return this.pipelineStore.findPipelineRunById(runId);
  }

  async listInFlightPipelineRunsByLiteratureId(literatureId: string): Promise<LiteraturePipelineRunRecord[]> {
    return this.pipelineStore.listInFlightPipelineRunsByLiteratureId(literatureId);
  }

  async listPipelineRunsByLiteratureId(literatureId: string, limit?: number): Promise<LiteraturePipelineRunRecord[]> {
    return this.pipelineStore.listPipelineRunsByLiteratureId(literatureId, limit);
  }

  async updatePipelineRun(
    runId: string,
    patch: Partial<Omit<LiteraturePipelineRunRecord, 'id' | 'literatureId' | 'triggerSource' | 'createdAt'>>,
  ): Promise<LiteraturePipelineRunRecord> {
    return this.pipelineStore.updatePipelineRun(runId, patch);
  }

  async createPipelineRunStep(record: LiteraturePipelineRunStepRecord): Promise<LiteraturePipelineRunStepRecord> {
    return this.pipelineStore.createPipelineRunStep(record);
  }

  async updatePipelineRunStep(
    stepId: string,
    patch: Partial<Omit<LiteraturePipelineRunStepRecord, 'id' | 'runId' | 'stageCode'>>,
  ): Promise<LiteraturePipelineRunStepRecord> {
    return this.pipelineStore.updatePipelineRunStep(stepId, patch);
  }

  async listPipelineRunStepsByRunId(runId: string): Promise<LiteraturePipelineRunStepRecord[]> {
    return this.pipelineStore.listPipelineRunStepsByRunId(runId);
  }
}
