import type { PrismaClient } from '@prisma/client';
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
  LiteratureEmbeddingVectorCandidateResult,
  LiteratureEmbeddingTokenIndexRecord,
  LiteratureEmbeddingVersionRecord,
  LiteratureFulltextAcquisitionItemRecord,
  LiteratureFulltextAcquisitionItemStatus,
  LiteratureFulltextAcquisitionJobRecord,
  LiteratureFulltextDocumentRecord,
  LiteratureFulltextExtractionBundle,
  LiteratureFulltextAnchorRecord,
  LiteratureFulltextParagraphRecord,
  LiteratureFulltextSectionRecord,
  LiteraturePipelineArtifactRecord,
  LiteraturePipelineRunRecord,
  LiteraturePipelineRunStepRecord,
  LiteraturePipelineStageStateRecord,
  LiteraturePipelineStateRecord,
  LiteratureQualityAssessmentRecord,
  LiteratureRecord,
  LiteratureRepository,
  ListLiteratureClustersFilter,
  LiteratureSourceRuntimeStateRecord,
  LiteratureSourceRecord,
  PaperLiteratureLinkRecord,
  TopicLiteratureScopeRecord,
} from '../literature-repository.js';
import { PrismaLiteratureBatchStore } from './literature/prisma-literature-batch-store.js';
import { PrismaLiteratureClusterStore } from './literature/prisma-literature-cluster-store.js';
import { PrismaLiteratureCoreStore } from './literature/prisma-literature-core-store.js';
import { PrismaLiteratureContentStore } from './literature/prisma-literature-content-store.js';
import { PrismaLiteratureEmbeddingStore } from './literature/prisma-literature-embedding-store.js';
import { PrismaLiteraturePipelineStore } from './literature/prisma-literature-pipeline-store.js';

export class PrismaLiteratureRepository implements LiteratureRepository {
  private readonly coreStore: PrismaLiteratureCoreStore;
  private readonly contentStore: PrismaLiteratureContentStore;
  private readonly pipelineStore: PrismaLiteraturePipelineStore;
  private readonly embeddingStore: PrismaLiteratureEmbeddingStore;
  private readonly batchStore: PrismaLiteratureBatchStore;
  private readonly clusterStore: PrismaLiteratureClusterStore;

  constructor(prisma: PrismaClient) {
    this.coreStore = new PrismaLiteratureCoreStore(prisma);
    this.contentStore = new PrismaLiteratureContentStore(prisma);
    this.pipelineStore = new PrismaLiteraturePipelineStore(prisma);
    this.embeddingStore = new PrismaLiteratureEmbeddingStore(prisma);
    this.batchStore = new PrismaLiteratureBatchStore(prisma);
    this.clusterStore = new PrismaLiteratureClusterStore(prisma);
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

  async upsertQualityAssessment(
    record: LiteratureQualityAssessmentRecord,
  ): Promise<{ record: LiteratureQualityAssessmentRecord; created: boolean }> {
    return this.coreStore.upsertQualityAssessment(record);
  }

  async findQualityAssessmentByLiteratureId(literatureId: string): Promise<LiteratureQualityAssessmentRecord | null> {
    return this.coreStore.findQualityAssessmentByLiteratureId(literatureId);
  }

  async listQualityAssessmentsByLiteratureIds(literatureIds: string[]): Promise<LiteratureQualityAssessmentRecord[]> {
    return this.coreStore.listQualityAssessmentsByLiteratureIds(literatureIds);
  }

  async upsertCitationProfile(
    record: LiteratureCitationProfileRecord,
  ): Promise<{ record: LiteratureCitationProfileRecord; created: boolean }> {
    return this.contentStore.upsertCitationProfile(record);
  }

  async findCitationProfileByLiteratureId(literatureId: string): Promise<LiteratureCitationProfileRecord | null> {
    return this.contentStore.findCitationProfileByLiteratureId(literatureId);
  }

  async upsertAbstractProfile(
    record: LiteratureAbstractProfileRecord,
  ): Promise<{ record: LiteratureAbstractProfileRecord; created: boolean }> {
    return this.contentStore.upsertAbstractProfile(record);
  }

  async findAbstractProfileByLiteratureId(literatureId: string): Promise<LiteratureAbstractProfileRecord | null> {
    return this.contentStore.findAbstractProfileByLiteratureId(literatureId);
  }

  async upsertContentAsset(
    record: LiteratureContentAssetRecord,
  ): Promise<{ record: LiteratureContentAssetRecord; created: boolean }> {
    return this.contentStore.upsertContentAsset(record);
  }

  async listContentAssetsByLiteratureId(literatureId: string): Promise<LiteratureContentAssetRecord[]> {
    return this.contentStore.listContentAssetsByLiteratureId(literatureId);
  }

  async listContentAssetsByChecksum(checksum: string): Promise<LiteratureContentAssetRecord[]> {
    return this.contentStore.listContentAssetsByChecksum(checksum);
  }

  async findContentAssetById(assetId: string): Promise<LiteratureContentAssetRecord | null> {
    return this.contentStore.findContentAssetById(assetId);
  }

  async upsertLiteratureCluster(
    record: LiteratureClusterRecord,
    members: LiteratureClusterMemberRecord[],
    evidence: LiteratureClusterEvidenceRecord[],
  ): Promise<LiteratureClusterGraphRecord> {
    return this.clusterStore.upsertLiteratureCluster(record, members, evidence);
  }

  async findLiteratureClusterById(clusterId: string): Promise<LiteratureClusterGraphRecord | null> {
    return this.clusterStore.findLiteratureClusterById(clusterId);
  }

  async listLiteratureClusters(filter?: ListLiteratureClustersFilter): Promise<LiteratureClusterGraphRecord[]> {
    return this.clusterStore.listLiteratureClusters(filter);
  }

  async updateLiteratureCluster(
    clusterId: string,
    patch: LiteratureClusterUpdatePatch,
  ): Promise<LiteratureClusterGraphRecord> {
    return this.clusterStore.updateLiteratureCluster(clusterId, patch);
  }

  async updateLiteratureClusterMember(
    clusterId: string,
    literatureId: string,
    patch: Partial<Omit<LiteratureClusterMemberRecord, 'id' | 'clusterId' | 'literatureId' | 'createdAt'>>,
  ): Promise<LiteratureClusterMemberRecord> {
    return this.clusterStore.updateLiteratureClusterMember(clusterId, literatureId, patch);
  }

  async upsertFulltextExtractionBundle(
    bundle: LiteratureFulltextExtractionBundle,
  ): Promise<LiteratureFulltextExtractionBundle> {
    return this.contentStore.upsertFulltextExtractionBundle(bundle);
  }

  async findFulltextDocumentBySourceAssetId(sourceAssetId: string): Promise<LiteratureFulltextDocumentRecord | null> {
    return this.contentStore.findFulltextDocumentBySourceAssetId(sourceAssetId);
  }

  async listFulltextDocumentsByLiteratureId(literatureId: string): Promise<LiteratureFulltextDocumentRecord[]> {
    return this.contentStore.listFulltextDocumentsByLiteratureId(literatureId);
  }

  async listFulltextSectionsByDocumentId(documentId: string): Promise<LiteratureFulltextSectionRecord[]> {
    return this.contentStore.listFulltextSectionsByDocumentId(documentId);
  }

  async listFulltextParagraphsByDocumentId(documentId: string): Promise<LiteratureFulltextParagraphRecord[]> {
    return this.contentStore.listFulltextParagraphsByDocumentId(documentId);
  }

  async listFulltextAnchorsByDocumentId(documentId: string): Promise<LiteratureFulltextAnchorRecord[]> {
    return this.contentStore.listFulltextAnchorsByDocumentId(documentId);
  }

  async upsertTopicScope(
    record: TopicLiteratureScopeRecord,
  ): Promise<{ record: TopicLiteratureScopeRecord; created: boolean }> {
    return this.coreStore.upsertTopicScope(record);
  }

  async listTopicScopesByTopicId(topicId: string): Promise<TopicLiteratureScopeRecord[]> {
    return this.coreStore.listTopicScopesByTopicId(topicId);
  }

  async listTopicScopesByLiteratureId(literatureId: string): Promise<TopicLiteratureScopeRecord[]> {
    return this.coreStore.listTopicScopesByLiteratureId(literatureId);
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
    return this.coreStore.updateTopicScopeActivation(topicId, literatureId, patch);
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

  async updateEmbeddingVersion(
    embeddingVersionId: string,
    patch: Partial<Omit<LiteratureEmbeddingVersionRecord, 'id' | 'literatureId' | 'versionNo' | 'createdAt'>>,
  ): Promise<LiteratureEmbeddingVersionRecord> {
    return this.embeddingStore.updateEmbeddingVersion(embeddingVersionId, patch);
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

  async listEmbeddingRetrievalVectorChunksByEmbeddingVersionIds(
    embeddingVersionIds: string[],
  ): Promise<LiteratureEmbeddingRetrievalVectorChunkRecord[]> {
    return this.embeddingStore.listEmbeddingRetrievalVectorChunksByEmbeddingVersionIds(embeddingVersionIds);
  }

  async writeEmbeddingRetrievalVectors(records: LiteratureEmbeddingRetrievalVectorWrite[]): Promise<number> {
    return this.embeddingStore.writeEmbeddingRetrievalVectors(records);
  }

  async summarizeEmbeddingRetrievalVectorCoverage(
    query: LiteratureEmbeddingRetrievalVectorCoverageQuery,
  ): Promise<LiteratureEmbeddingRetrievalVectorCoverageSummary> {
    return this.embeddingStore.summarizeEmbeddingRetrievalVectorCoverage(query);
  }

  async listEmbeddingVectorCandidates(
    query: LiteratureEmbeddingVectorCandidateQuery,
  ): Promise<LiteratureEmbeddingVectorCandidateResult> {
    return this.embeddingStore.listEmbeddingVectorCandidates(query);
  }

  async replaceEmbeddingTokenIndexes(
    embeddingVersionId: string,
    records: LiteratureEmbeddingTokenIndexRecord[],
  ): Promise<LiteratureEmbeddingTokenIndexRecord[]> {
    return this.embeddingStore.replaceEmbeddingTokenIndexes(embeddingVersionId, records);
  }

  async listEmbeddingTokenIndexesByEmbeddingVersionId(
    embeddingVersionId: string,
  ): Promise<LiteratureEmbeddingTokenIndexRecord[]> {
    return this.embeddingStore.listEmbeddingTokenIndexesByEmbeddingVersionId(embeddingVersionId);
  }

  async createContentProcessingBatchJob(
    record: LiteratureContentProcessingBatchJobRecord,
    items: LiteratureContentProcessingBatchItemRecord[],
  ): Promise<LiteratureContentProcessingBatchJobRecord> {
    return this.batchStore.createContentProcessingBatchJob(record, items);
  }

  async findContentProcessingBatchJobById(
    jobId: string,
  ): Promise<LiteratureContentProcessingBatchJobRecord | null> {
    return this.batchStore.findContentProcessingBatchJobById(jobId);
  }

  async listContentProcessingBatchJobs(limit?: number): Promise<LiteratureContentProcessingBatchJobRecord[]> {
    return this.batchStore.listContentProcessingBatchJobs(limit);
  }

  async updateContentProcessingBatchJob(
    jobId: string,
    patch: Partial<Omit<LiteratureContentProcessingBatchJobRecord, 'id' | 'createdAt'>>,
  ): Promise<LiteratureContentProcessingBatchJobRecord> {
    return this.batchStore.updateContentProcessingBatchJob(jobId, patch);
  }

  async deleteContentProcessingBatchJob(jobId: string): Promise<void> {
    return this.batchStore.deleteContentProcessingBatchJob(jobId);
  }

  async listContentProcessingBatchItemsByJobId(jobId: string): Promise<LiteratureContentProcessingBatchItemRecord[]> {
    return this.batchStore.listContentProcessingBatchItemsByJobId(jobId);
  }

  async listContentProcessingBatchItemsByJobIdAndStatuses(
    jobId: string,
    statuses: LiteratureContentProcessingBatchItemStatus[],
    limit?: number,
  ): Promise<LiteratureContentProcessingBatchItemRecord[]> {
    return this.batchStore.listContentProcessingBatchItemsByJobIdAndStatuses(jobId, statuses, limit);
  }

  async updateContentProcessingBatchItem(
    itemId: string,
    patch: Partial<Omit<LiteratureContentProcessingBatchItemRecord, 'id' | 'jobId' | 'literatureId' | 'createdAt'>>,
  ): Promise<LiteratureContentProcessingBatchItemRecord> {
    return this.batchStore.updateContentProcessingBatchItem(itemId, patch);
  }

  async createFulltextAcquisitionJob(
    record: LiteratureFulltextAcquisitionJobRecord,
    items: LiteratureFulltextAcquisitionItemRecord[],
  ): Promise<LiteratureFulltextAcquisitionJobRecord> {
    return this.batchStore.createFulltextAcquisitionJob(record, items);
  }

  async findFulltextAcquisitionJobById(jobId: string): Promise<LiteratureFulltextAcquisitionJobRecord | null> {
    return this.batchStore.findFulltextAcquisitionJobById(jobId);
  }

  async listFulltextAcquisitionJobs(limit?: number): Promise<LiteratureFulltextAcquisitionJobRecord[]> {
    return this.batchStore.listFulltextAcquisitionJobs(limit);
  }

  async updateFulltextAcquisitionJob(
    jobId: string,
    patch: Partial<Omit<LiteratureFulltextAcquisitionJobRecord, 'id' | 'createdAt'>>,
  ): Promise<LiteratureFulltextAcquisitionJobRecord> {
    return this.batchStore.updateFulltextAcquisitionJob(jobId, patch);
  }

  async deleteFulltextAcquisitionJob(jobId: string): Promise<void> {
    return this.batchStore.deleteFulltextAcquisitionJob(jobId);
  }

  async listFulltextAcquisitionItemsByJobId(jobId: string): Promise<LiteratureFulltextAcquisitionItemRecord[]> {
    return this.batchStore.listFulltextAcquisitionItemsByJobId(jobId);
  }

  async listFulltextAcquisitionItemsByJobIdAndStatuses(
    jobId: string,
    statuses: LiteratureFulltextAcquisitionItemStatus[],
    limit?: number,
  ): Promise<LiteratureFulltextAcquisitionItemRecord[]> {
    return this.batchStore.listFulltextAcquisitionItemsByJobIdAndStatuses(jobId, statuses, limit);
  }

  async updateFulltextAcquisitionItem(
    itemId: string,
    patch: Partial<Omit<LiteratureFulltextAcquisitionItemRecord, 'id' | 'jobId' | 'literatureId' | 'createdAt'>>,
  ): Promise<LiteratureFulltextAcquisitionItemRecord> {
    return this.batchStore.updateFulltextAcquisitionItem(itemId, patch);
  }

  async upsertSourceRuntimeState(
    record: LiteratureSourceRuntimeStateRecord,
  ): Promise<{ record: LiteratureSourceRuntimeStateRecord; created: boolean }> {
    return this.batchStore.upsertSourceRuntimeState(record);
  }

  async findSourceRuntimeState(source: string): Promise<LiteratureSourceRuntimeStateRecord | null> {
    return this.batchStore.findSourceRuntimeState(source);
  }

  async listSourceRuntimeStates(): Promise<LiteratureSourceRuntimeStateRecord[]> {
    return this.batchStore.listSourceRuntimeStates();
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
