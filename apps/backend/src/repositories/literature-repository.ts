import type {
  LiteratureProvider,
  LiteratureContentAssetKind,
  LiteratureContentAssetSourceKind,
  LiteratureContentAssetStatus,
  LiteratureClusterEvidenceSignalType,
  LiteratureClusterMemberDecisionStatus,
  LiteratureClusterMemberRole,
  LiteratureClusterRelationType,
  LiteratureClusterStatus,
  LiteratureClusterType,
  LiteratureFulltextAcquisitionItemStatus as SharedLiteratureFulltextAcquisitionItemStatus,
  LiteratureFulltextAcquisitionJobStatus as SharedLiteratureFulltextAcquisitionJobStatus,
  LiteratureFulltextAcquisitionSourceKind,
  LiteratureEvidenceActivationStatus,
  LiteratureQualityStatus,
  PaperCitationStatus,
  RightsClass,
  TopicScopeStatus,
} from '@paper-engineering-assistant/shared/research-lifecycle/literature-contracts';

export type LiteratureRecord = {
  id: string;
  title: string;
  abstractText: string | null;
  keyContentDigest: string | null;
  authors: string[];
  year: number | null;
  doiNormalized: string | null;
  arxivId: string | null;
  normalizedTitle: string;
  titleAuthorsYearHash: string | null;
  rightsClass: RightsClass;
  tags: string[];
  activeEmbeddingVersionId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LiteratureOverviewStatus = 'excluded' | 'automation_ready' | 'citable' | 'not_citable';

export type LiteraturePipelineStageCode =
  | 'CITATION_NORMALIZED'
  | 'ABSTRACT_READY'
  | 'FULLTEXT_PREPROCESSED'
  | 'KEY_CONTENT_READY'
  | 'CHUNKED'
  | 'EMBEDDED'
  | 'INDEXED';

export type LiteraturePipelineStageStatus =
  | 'NOT_STARTED'
  | 'PENDING'
  | 'RUNNING'
  | 'SUCCEEDED'
  | 'STALE'
  | 'FAILED'
  | 'BLOCKED'
  | 'SKIPPED';

export type LiteraturePipelineRunStatus = 'PENDING' | 'RUNNING' | 'PARTIAL' | 'SUCCESS' | 'FAILED' | 'SKIPPED';

export type LiteraturePipelineTriggerSource =
  | 'CONTENT_PROCESSING_ACTION'
  | 'BACKFILL';

export type LiteraturePipelineDedupStatus = 'unique' | 'duplicate' | 'unknown';

export type LiteratureContentProcessingBatchJobStatus =
  | 'PLANNED'
  | 'QUEUED'
  | 'RUNNING'
  | 'PAUSED'
  | 'CANCELING'
  | 'CANCELED'
  | 'SUCCEEDED'
  | 'PARTIAL'
  | 'FAILED';

export type LiteratureContentProcessingBatchItemStatus =
  | 'QUEUED'
  | 'RUNNING'
  | 'SUCCEEDED'
  | 'PARTIAL'
  | 'BLOCKED'
  | 'FAILED'
  | 'SKIPPED'
  | 'CANCELED';

export type LiteratureFulltextAcquisitionJobStatus = SharedLiteratureFulltextAcquisitionJobStatus;
export type LiteratureFulltextAcquisitionItemStatus = SharedLiteratureFulltextAcquisitionItemStatus;

export type LiteraturePipelineStateRecord = {
  id: string;
  literatureId: string;
  citationComplete: boolean;
  abstractReady: boolean;
  keyContentReady: boolean;
  dedupStatus: LiteraturePipelineDedupStatus;
  updatedAt: string;
};

export type LiteraturePipelineStageStateRecord = {
  id: string;
  literatureId: string;
  stageCode: LiteraturePipelineStageCode;
  status: LiteraturePipelineStageStatus;
  lastRunId: string | null;
  detail: Record<string, unknown>;
  updatedAt: string;
};

export type LiteraturePipelineRunRecord = {
  id: string;
  literatureId: string;
  triggerSource: LiteraturePipelineTriggerSource;
  status: LiteraturePipelineRunStatus;
  requestedStages: LiteraturePipelineStageCode[];
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  updatedAt: string;
};

export type LiteraturePipelineRunStepRecord = {
  id: string;
  runId: string;
  stageCode: LiteraturePipelineStageCode;
  status: LiteraturePipelineStageStatus;
  inputRef: Record<string, unknown>;
  outputRef: Record<string, unknown>;
  errorCode: string | null;
  errorMessage: string | null;
  startedAt: string | null;
  finishedAt: string | null;
};

export type LiteraturePipelineArtifactType =
  | 'PREPROCESSED_TEXT'
  | 'KEY_CONTENT_DOSSIER'
  | 'CHUNKS'
  | 'EMBEDDINGS'
  | 'LOCAL_INDEX';

export type LiteraturePipelineArtifactRecord = {
  id: string;
  literatureId: string;
  stageCode: LiteraturePipelineStageCode;
  artifactType: LiteraturePipelineArtifactType;
  payload: Record<string, unknown>;
  payloadPath: string | null;
  checksum: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LiteratureEmbeddingVersionRecord = {
  id: string;
  literatureId: string;
  versionNo: number;
  status: string;
  profileId: string | null;
  provider: string;
  model: string;
  dimension: number;
  chunkCount: number;
  vectorCount: number;
  tokenCount: number;
  inputChecksum: string | null;
  chunkArtifactChecksum: string | null;
  embeddingArtifactChecksum: string | null;
  indexArtifactChecksum: string | null;
  indexedAt: string | null;
  activatedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LiteratureEmbeddingChunkRecord = {
  id: string;
  embeddingVersionId: string;
  literatureId: string;
  chunkId: string;
  chunkIndex: number;
  text: string;
  startOffset: number;
  endOffset: number;
  chunkType: string;
  sourceRefs: Record<string, unknown>[];
  metadata: Record<string, unknown>;
  contentChecksum: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LiteratureEmbeddingRetrievalVectorChunkRecord = {
  embeddingVersionId: string;
  literatureId: string;
  chunkId: string;
  vector: number[];
};

export type LiteratureEmbeddingRetrievalVectorWrite = {
  embeddingChunkId: string;
  normalizedVector: number[];
  updatedAt: string;
};

export type LiteratureEmbeddingRetrievalVectorCoverageQuery = {
  embeddingVersionIds: string[];
};

export type LiteratureEmbeddingRetrievalVectorCoverageByVersionRecord = {
  embeddingVersionId: string;
  literatureId: string;
  chunkCount: number;
  nativeVectorCount: number;
  missingNativeVectorCount: number;
};

export type LiteratureEmbeddingRetrievalVectorCoverageSummary = {
  embeddingVersionCount: number;
  literatureCount: number;
  chunkCount: number;
  nativeVectorCount: number;
  missingNativeVectorCount: number;
  coverageRatio: number;
  byVersion: LiteratureEmbeddingRetrievalVectorCoverageByVersionRecord[];
};

export type LiteratureEmbeddingVectorCandidateQuery = {
  /**
   * Service-resolved embedding version IDs that are already filtered for active,
   * evidence-ready, and request stale-policy eligibility.
   */
  eligibleEmbeddingVersionIds: string[];
  normalizedQueryVector: number[];
  candidateLimit: number;
  perLiteratureCandidateCap: number;
};

export type LiteratureEmbeddingVectorCandidateRecord = LiteratureEmbeddingChunkRecord & {
  vectorScore: number;
  negativeInnerProduct: number;
};

export type LiteratureEmbeddingVectorCandidateTelemetry = {
  candidateLimit: number;
  candidateReturned: number;
  candidateLimitHit: boolean;
  perLiteratureCandidateCap: number;
  filteredEmbeddingVersionCount: number;
  filteredChunkCount: number;
  dbSimilarityQueryMs: number;
};

export type LiteratureEmbeddingVectorCandidateResult = {
  candidates: LiteratureEmbeddingVectorCandidateRecord[];
  telemetry: LiteratureEmbeddingVectorCandidateTelemetry;
};

export type LiteratureEmbeddingTokenIndexRecord = {
  id: string;
  embeddingVersionId: string;
  literatureId: string;
  token: string;
  chunkIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type LiteratureContentProcessingBatchJobRecord = {
  id: string;
  status: LiteratureContentProcessingBatchJobStatus;
  targetStage: LiteraturePipelineStageCode;
  workset: Record<string, unknown>;
  options: Record<string, unknown>;
  dryRunEstimate: Record<string, unknown>;
  totals: Record<string, unknown>;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
  startedAt: string | null;
  pausedAt: string | null;
  canceledAt: string | null;
  finishedAt: string | null;
  updatedAt: string;
};

export type LiteratureContentProcessingBatchItemRecord = {
  id: string;
  jobId: string;
  literatureId: string;
  status: LiteratureContentProcessingBatchItemStatus;
  requestedStages: LiteraturePipelineStageCode[];
  nextStageIndex: number;
  pipelineRunId: string | null;
  attemptCount: number;
  errorCode: string | null;
  errorMessage: string | null;
  blockerCode: string | null;
  retryable: boolean;
  checkpoint: Record<string, unknown>;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  updatedAt: string;
};

export type LiteratureFulltextAcquisitionJobRecord = {
  id: string;
  status: LiteratureFulltextAcquisitionJobStatus;
  workset: Record<string, unknown>;
  options: Record<string, unknown>;
  dryRunEstimate: Record<string, unknown>;
  totals: Record<string, unknown>;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
  startedAt: string | null;
  pausedAt: string | null;
  canceledAt: string | null;
  finishedAt: string | null;
  updatedAt: string;
};

export type LiteratureFulltextAcquisitionItemRecord = {
  id: string;
  jobId: string;
  literatureId: string;
  status: LiteratureFulltextAcquisitionItemStatus;
  selectedSourceKind: LiteratureFulltextAcquisitionSourceKind | null;
  sourceUrl: string | null;
  finalUrl: string | null;
  contentAssetId: string | null;
  attemptCount: number;
  errorCode: string | null;
  errorMessage: string | null;
  blockerCode: string | null;
  retryable: boolean;
  resolutionCandidates: Record<string, unknown>[];
  checkpoint: Record<string, unknown>;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  updatedAt: string;
};

export type LiteratureSourceRuntimeStateRecord = {
  id: string;
  source: string;
  status: string;
  cooldownUntil: string | null;
  failureCount: number;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  lastRequestAt: string | null;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type LiteratureQualityAssessmentRecord = {
  id: string;
  literatureId: string;
  qualityStatus: LiteratureQualityStatus;
  qualityScore: number | null;
  qualityComponents: Record<string, unknown>;
  blockerCodes: string[];
  source: string;
  assessedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type LiteratureSourceRecord = {
  id: string;
  literatureId: string;
  provider: LiteratureProvider;
  sourceItemId: string;
  sourceUrl: string;
  rawPayload: Record<string, unknown>;
  fetchedAt: string;
};

export type LiteratureCitationProfileRecord = {
  id: string;
  literatureId: string;
  normalizedDoi: string | null;
  normalizedArxivId: string | null;
  normalizedTitle: string;
  normalizedAuthors: string[];
  parsedYear: number | null;
  normalizedSourceUrl: string | null;
  titleAuthorsYearHash: string | null;
  citationComplete: boolean;
  incompleteReasonCodes: string[];
  sourceRefs: Record<string, unknown>[];
  inputChecksum: string;
  confidence: number;
  createdAt: string;
  updatedAt: string;
};

export type LiteratureAbstractProfileRecord = {
  id: string;
  literatureId: string;
  abstractText: string | null;
  abstractSource: string | null;
  sourceRef: Record<string, unknown>;
  checksum: string | null;
  language: string | null;
  confidence: number;
  reasonCodes: string[];
  generated: boolean;
  createdAt: string;
  updatedAt: string;
};

export type LiteratureContentAssetRecord = {
  id: string;
  literatureId: string;
  assetKind: LiteratureContentAssetKind;
  sourceKind: LiteratureContentAssetSourceKind;
  localPath: string;
  checksum: string;
  mimeType: string;
  byteSize: number;
  rightsClass: RightsClass;
  status: LiteratureContentAssetStatus;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type LiteratureClusterRecord = {
  id: string;
  clusterType: LiteratureClusterType;
  status: LiteratureClusterStatus;
  representativeLiteratureId: string | null;
  confidence: number;
  method: string;
  createdAt: string;
  updatedAt: string;
};

export type LiteratureClusterMemberRecord = {
  id: string;
  clusterId: string;
  literatureId: string;
  role: LiteratureClusterMemberRole;
  relationType: LiteratureClusterRelationType;
  confidence: number;
  decisionStatus: LiteratureClusterMemberDecisionStatus;
  createdAt: string;
  updatedAt: string;
};

export type LiteratureClusterEvidenceRecord = {
  id: string;
  clusterId: string;
  literatureIdA: string;
  literatureIdB: string;
  signalType: LiteratureClusterEvidenceSignalType;
  score: number;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type LiteratureClusterGraphRecord = {
  cluster: LiteratureClusterRecord;
  members: LiteratureClusterMemberRecord[];
  evidence: LiteratureClusterEvidenceRecord[];
};

export type LiteratureClusterUpdatePatch = Partial<Pick<
  LiteratureClusterRecord,
  'status' | 'representativeLiteratureId' | 'confidence' | 'method' | 'updatedAt'
>>;

export type ListLiteratureClustersFilter = {
  status?: LiteratureClusterStatus;
  clusterType?: LiteratureClusterType;
  literatureId?: string;
  literatureIds?: string[];
  limit?: number;
};

export type LiteratureFulltextDocumentRecord = {
  id: string;
  literatureId: string;
  sourceAssetId: string;
  normalizedText: string | null;
  normalizedTextPath: string | null;
  normalizedTextChecksum: string;
  parserName: string;
  parserVersion: string;
  parserArtifactPath: string | null;
  parserArtifactMimeType: string | null;
  status: 'READY' | 'PARTIAL_READY' | 'BLOCKED' | 'FAILED';
  diagnostics: Record<string, unknown>[];
  createdAt: string;
  updatedAt: string;
};

export type LiteratureFulltextSectionRecord = {
  id: string;
  documentId: string;
  sectionId: string;
  title: string;
  level: number;
  orderIndex: number;
  startOffset: number;
  endOffset: number;
  pageStart: number | null;
  pageEnd: number | null;
  checksum: string;
  createdAt: string;
  updatedAt: string;
};

export type LiteratureFulltextParagraphRecord = {
  id: string;
  documentId: string;
  paragraphId: string;
  sectionId: string;
  orderIndex: number;
  text: string;
  startOffset: number;
  endOffset: number;
  pageNumber: number | null;
  checksum: string;
  confidence: number;
  createdAt: string;
  updatedAt: string;
};

export type LiteratureFulltextAnchorRecord = {
  id: string;
  documentId: string;
  anchorId: string;
  anchorType: string;
  label: string | null;
  text: string | null;
  pageNumber: number | null;
  bbox: Record<string, unknown> | null;
  targetRefs: Record<string, unknown>[];
  metadata: Record<string, unknown>;
  checksum: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LiteratureFulltextExtractionBundle = {
  document: LiteratureFulltextDocumentRecord;
  sections: LiteratureFulltextSectionRecord[];
  paragraphs: LiteratureFulltextParagraphRecord[];
  anchors: LiteratureFulltextAnchorRecord[];
};

export type TopicLiteratureScopeRecord = {
  id: string;
  topicId: string;
  literatureId: string;
  scopeStatus: TopicScopeStatus;
  reason: string | null;
  activationStatus: LiteratureEvidenceActivationStatus;
  activationReason: string | null;
  activationScore: number | null;
  activatedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PaperLiteratureLinkRecord = {
  id: string;
  paperId: string;
  topicId: string | null;
  literatureId: string;
  citationStatus: PaperCitationStatus;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

export interface LiteratureRepository {
  countLiteratures(): Promise<number>;
  countLiteratureSources(): Promise<number>;
  countTopicScopes(): Promise<number>;
  countPaperLiteratureLinks(): Promise<number>;
  listLiteratureSourceIds(): Promise<string[]>;

  createLiterature(record: LiteratureRecord): Promise<LiteratureRecord>;
  updateLiterature(record: LiteratureRecord): Promise<LiteratureRecord>;
  findLiteratureById(literatureId: string): Promise<LiteratureRecord | null>;
  listLiteratures(): Promise<LiteratureRecord[]>;
  findLiteratureByDoi(doiNormalized: string): Promise<LiteratureRecord | null>;
  findLiteratureByArxivId(arxivId: string): Promise<LiteratureRecord | null>;
  findLiteratureByTitleAuthorsYearHash(hash: string): Promise<LiteratureRecord | null>;
  listLiteraturesByIds(literatureIds: string[]): Promise<LiteratureRecord[]>;

  upsertLiteratureSource(
    record: LiteratureSourceRecord,
  ): Promise<{ record: LiteratureSourceRecord; created: boolean }>;
  listSourcesByLiteratureId(literatureId: string): Promise<LiteratureSourceRecord[]>;

  upsertQualityAssessment(
    record: LiteratureQualityAssessmentRecord,
  ): Promise<{ record: LiteratureQualityAssessmentRecord; created: boolean }>;
  findQualityAssessmentByLiteratureId(literatureId: string): Promise<LiteratureQualityAssessmentRecord | null>;
  listQualityAssessmentsByLiteratureIds(literatureIds: string[]): Promise<LiteratureQualityAssessmentRecord[]>;

  upsertCitationProfile(
    record: LiteratureCitationProfileRecord,
  ): Promise<{ record: LiteratureCitationProfileRecord; created: boolean }>;
  findCitationProfileByLiteratureId(literatureId: string): Promise<LiteratureCitationProfileRecord | null>;

  upsertAbstractProfile(
    record: LiteratureAbstractProfileRecord,
  ): Promise<{ record: LiteratureAbstractProfileRecord; created: boolean }>;
  findAbstractProfileByLiteratureId(literatureId: string): Promise<LiteratureAbstractProfileRecord | null>;

  upsertContentAsset(
    record: LiteratureContentAssetRecord,
  ): Promise<{ record: LiteratureContentAssetRecord; created: boolean }>;
  listContentAssetsByLiteratureId(literatureId: string): Promise<LiteratureContentAssetRecord[]>;
  listContentAssetsByChecksum(checksum: string): Promise<LiteratureContentAssetRecord[]>;
  findContentAssetById(assetId: string): Promise<LiteratureContentAssetRecord | null>;

  upsertLiteratureCluster(
    record: LiteratureClusterRecord,
    members: LiteratureClusterMemberRecord[],
    evidence: LiteratureClusterEvidenceRecord[],
  ): Promise<LiteratureClusterGraphRecord>;
  findLiteratureClusterById(clusterId: string): Promise<LiteratureClusterGraphRecord | null>;
  listLiteratureClusters(filter?: ListLiteratureClustersFilter): Promise<LiteratureClusterGraphRecord[]>;
  updateLiteratureCluster(
    clusterId: string,
    patch: LiteratureClusterUpdatePatch,
  ): Promise<LiteratureClusterGraphRecord>;
  updateLiteratureClusterMember(
    clusterId: string,
    literatureId: string,
    patch: Partial<Omit<LiteratureClusterMemberRecord, 'id' | 'clusterId' | 'literatureId' | 'createdAt'>>,
  ): Promise<LiteratureClusterMemberRecord>;

  upsertFulltextExtractionBundle(bundle: LiteratureFulltextExtractionBundle): Promise<LiteratureFulltextExtractionBundle>;
  findFulltextDocumentBySourceAssetId(sourceAssetId: string): Promise<LiteratureFulltextDocumentRecord | null>;
  listFulltextDocumentsByLiteratureId(literatureId: string): Promise<LiteratureFulltextDocumentRecord[]>;
  listFulltextSectionsByDocumentId(documentId: string): Promise<LiteratureFulltextSectionRecord[]>;
  listFulltextParagraphsByDocumentId(documentId: string): Promise<LiteratureFulltextParagraphRecord[]>;
  listFulltextAnchorsByDocumentId(documentId: string): Promise<LiteratureFulltextAnchorRecord[]>;

  upsertTopicScope(
    record: TopicLiteratureScopeRecord,
  ): Promise<{ record: TopicLiteratureScopeRecord; created: boolean }>;
  listTopicScopesByTopicId(topicId: string): Promise<TopicLiteratureScopeRecord[]>;
  listTopicScopesByLiteratureId(literatureId: string): Promise<TopicLiteratureScopeRecord[]>;
  updateTopicScopeActivation(
    topicId: string,
    literatureId: string,
    patch: {
      activationStatus: LiteratureEvidenceActivationStatus;
      activationReason?: string | null;
      activationScore?: number | null;
      activatedAt?: string | null;
      updatedAt: string;
    },
  ): Promise<TopicLiteratureScopeRecord>;

  upsertPaperLiteratureLink(
    record: PaperLiteratureLinkRecord,
  ): Promise<{ record: PaperLiteratureLinkRecord; created: boolean }>;
  findPaperLiteratureLinkById(linkId: string): Promise<PaperLiteratureLinkRecord | null>;
  listPaperLiteratureLinksByPaperId(paperId: string): Promise<PaperLiteratureLinkRecord[]>;
  updatePaperLiteratureLink(
    linkId: string,
    patch: { citationStatus?: PaperCitationStatus; note?: string | null },
  ): Promise<PaperLiteratureLinkRecord>;

  upsertPipelineState(
    record: LiteraturePipelineStateRecord,
  ): Promise<{ record: LiteraturePipelineStateRecord; created: boolean }>;
  findPipelineStateByLiteratureId(literatureId: string): Promise<LiteraturePipelineStateRecord | null>;
  listPipelineStatesByLiteratureIds(literatureIds: string[]): Promise<LiteraturePipelineStateRecord[]>;

  upsertPipelineStageState(
    record: LiteraturePipelineStageStateRecord,
  ): Promise<{ record: LiteraturePipelineStageStateRecord; created: boolean }>;
  listPipelineStageStatesByLiteratureId(literatureId: string): Promise<LiteraturePipelineStageStateRecord[]>;
  listPipelineStageStatesByLiteratureIds(literatureIds: string[]): Promise<LiteraturePipelineStageStateRecord[]>;

  upsertPipelineArtifact(
    record: LiteraturePipelineArtifactRecord,
  ): Promise<{ record: LiteraturePipelineArtifactRecord; created: boolean }>;
  findPipelineArtifact(
    literatureId: string,
    stageCode: LiteraturePipelineStageCode,
    artifactType: LiteraturePipelineArtifactType,
  ): Promise<LiteraturePipelineArtifactRecord | null>;
  listPipelineArtifactsByLiteratureId(literatureId: string): Promise<LiteraturePipelineArtifactRecord[]>;

  createEmbeddingVersion(record: LiteratureEmbeddingVersionRecord): Promise<LiteratureEmbeddingVersionRecord>;
  updateEmbeddingVersion(
    embeddingVersionId: string,
    patch: Partial<Omit<LiteratureEmbeddingVersionRecord, 'id' | 'literatureId' | 'versionNo' | 'createdAt'>>,
  ): Promise<LiteratureEmbeddingVersionRecord>;
  findEmbeddingVersionById(embeddingVersionId: string): Promise<LiteratureEmbeddingVersionRecord | null>;
  findLatestEmbeddingVersionByLiteratureId(literatureId: string): Promise<LiteratureEmbeddingVersionRecord | null>;
  listActiveEmbeddingVersions(): Promise<LiteratureEmbeddingVersionRecord[]>;
  listEmbeddingVersionsByLiteratureIds(literatureIds: string[]): Promise<LiteratureEmbeddingVersionRecord[]>;
  listActiveEmbeddingVersionsByLiteratureIds(literatureIds: string[]): Promise<LiteratureEmbeddingVersionRecord[]>;

  createEmbeddingChunks(records: LiteratureEmbeddingChunkRecord[]): Promise<LiteratureEmbeddingChunkRecord[]>;
  listEmbeddingChunksByEmbeddingVersionId(embeddingVersionId: string): Promise<LiteratureEmbeddingChunkRecord[]>;
  listEmbeddingChunksByEmbeddingVersionIds(embeddingVersionIds: string[]): Promise<LiteratureEmbeddingChunkRecord[]>;
  listEmbeddingRetrievalVectorChunksByEmbeddingVersionIds(
    embeddingVersionIds: string[],
  ): Promise<LiteratureEmbeddingRetrievalVectorChunkRecord[]>;
  writeEmbeddingRetrievalVectors(records: LiteratureEmbeddingRetrievalVectorWrite[]): Promise<number>;
  summarizeEmbeddingRetrievalVectorCoverage(
    query: LiteratureEmbeddingRetrievalVectorCoverageQuery,
  ): Promise<LiteratureEmbeddingRetrievalVectorCoverageSummary>;
  listEmbeddingVectorCandidates(
    query: LiteratureEmbeddingVectorCandidateQuery,
  ): Promise<LiteratureEmbeddingVectorCandidateResult>;

  replaceEmbeddingTokenIndexes(
    embeddingVersionId: string,
    records: LiteratureEmbeddingTokenIndexRecord[],
  ): Promise<LiteratureEmbeddingTokenIndexRecord[]>;
  listEmbeddingTokenIndexesByEmbeddingVersionId(embeddingVersionId: string): Promise<LiteratureEmbeddingTokenIndexRecord[]>;

  createContentProcessingBatchJob(
    record: LiteratureContentProcessingBatchJobRecord,
    items: LiteratureContentProcessingBatchItemRecord[],
  ): Promise<LiteratureContentProcessingBatchJobRecord>;
  findContentProcessingBatchJobById(jobId: string): Promise<LiteratureContentProcessingBatchJobRecord | null>;
  listContentProcessingBatchJobs(limit?: number): Promise<LiteratureContentProcessingBatchJobRecord[]>;
  updateContentProcessingBatchJob(
    jobId: string,
    patch: Partial<Omit<LiteratureContentProcessingBatchJobRecord, 'id' | 'createdAt'>>,
  ): Promise<LiteratureContentProcessingBatchJobRecord>;
  deleteContentProcessingBatchJob(jobId: string): Promise<void>;
  listContentProcessingBatchItemsByJobId(jobId: string): Promise<LiteratureContentProcessingBatchItemRecord[]>;
  listContentProcessingBatchItemsByJobIdAndStatuses(
    jobId: string,
    statuses: LiteratureContentProcessingBatchItemStatus[],
    limit?: number,
  ): Promise<LiteratureContentProcessingBatchItemRecord[]>;
  updateContentProcessingBatchItem(
    itemId: string,
    patch: Partial<Omit<LiteratureContentProcessingBatchItemRecord, 'id' | 'jobId' | 'literatureId' | 'createdAt'>>,
  ): Promise<LiteratureContentProcessingBatchItemRecord>;

  createFulltextAcquisitionJob(
    record: LiteratureFulltextAcquisitionJobRecord,
    items: LiteratureFulltextAcquisitionItemRecord[],
  ): Promise<LiteratureFulltextAcquisitionJobRecord>;
  findFulltextAcquisitionJobById(jobId: string): Promise<LiteratureFulltextAcquisitionJobRecord | null>;
  listFulltextAcquisitionJobs(limit?: number): Promise<LiteratureFulltextAcquisitionJobRecord[]>;
  updateFulltextAcquisitionJob(
    jobId: string,
    patch: Partial<Omit<LiteratureFulltextAcquisitionJobRecord, 'id' | 'createdAt'>>,
  ): Promise<LiteratureFulltextAcquisitionJobRecord>;
  deleteFulltextAcquisitionJob(jobId: string): Promise<void>;
  listFulltextAcquisitionItemsByJobId(jobId: string): Promise<LiteratureFulltextAcquisitionItemRecord[]>;
  listFulltextAcquisitionItemsByJobIdAndStatuses(
    jobId: string,
    statuses: LiteratureFulltextAcquisitionItemStatus[],
    limit?: number,
  ): Promise<LiteratureFulltextAcquisitionItemRecord[]>;
  updateFulltextAcquisitionItem(
    itemId: string,
    patch: Partial<Omit<LiteratureFulltextAcquisitionItemRecord, 'id' | 'jobId' | 'literatureId' | 'createdAt'>>,
  ): Promise<LiteratureFulltextAcquisitionItemRecord>;

  upsertSourceRuntimeState(
    record: LiteratureSourceRuntimeStateRecord,
  ): Promise<{ record: LiteratureSourceRuntimeStateRecord; created: boolean }>;
  findSourceRuntimeState(source: string): Promise<LiteratureSourceRuntimeStateRecord | null>;
  listSourceRuntimeStates(): Promise<LiteratureSourceRuntimeStateRecord[]>;

  createPipelineRun(record: LiteraturePipelineRunRecord): Promise<LiteraturePipelineRunRecord>;
  findPipelineRunById(runId: string): Promise<LiteraturePipelineRunRecord | null>;
  listInFlightPipelineRunsByLiteratureId(literatureId: string): Promise<LiteraturePipelineRunRecord[]>;
  listPipelineRunsByLiteratureId(literatureId: string, limit?: number): Promise<LiteraturePipelineRunRecord[]>;
  updatePipelineRun(
    runId: string,
    patch: Partial<Omit<LiteraturePipelineRunRecord, 'id' | 'literatureId' | 'triggerSource' | 'createdAt'>>,
  ): Promise<LiteraturePipelineRunRecord>;

  createPipelineRunStep(record: LiteraturePipelineRunStepRecord): Promise<LiteraturePipelineRunStepRecord>;
  updatePipelineRunStep(
    stepId: string,
    patch: Partial<Omit<LiteraturePipelineRunStepRecord, 'id' | 'runId' | 'stageCode'>>,
  ): Promise<LiteraturePipelineRunStepRecord>;
  listPipelineRunStepsByRunId(runId: string): Promise<LiteraturePipelineRunStepRecord[]>;
}
