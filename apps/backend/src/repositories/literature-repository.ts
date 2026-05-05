import type {
  LiteratureProvider,
  LiteratureContentAssetKind,
  LiteratureContentAssetSourceKind,
  LiteratureContentAssetStatus,
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
  vector: number[];
  createdAt: string;
  updatedAt: string;
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

export type LiteratureFulltextDocumentRecord = {
  id: string;
  literatureId: string;
  sourceAssetId: string;
  normalizedText: string;
  normalizedTextChecksum: string;
  parserName: string;
  parserVersion: string;
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
  findContentAssetById(assetId: string): Promise<LiteratureContentAssetRecord | null>;

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

  replaceEmbeddingTokenIndexes(
    embeddingVersionId: string,
    records: LiteratureEmbeddingTokenIndexRecord[],
  ): Promise<LiteratureEmbeddingTokenIndexRecord[]>;
  listEmbeddingTokenIndexesByEmbeddingVersionId(embeddingVersionId: string): Promise<LiteratureEmbeddingTokenIndexRecord[]>;

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
