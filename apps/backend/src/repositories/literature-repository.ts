import type {
  LiteratureProvider,
  PaperCitationStatus,
  RightsClass,
  TopicScopeStatus,
} from '@paper-engineering-assistant/shared';

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
  createdAt: string;
  updatedAt: string;
};

export type LiteratureOverviewStatus = 'excluded' | 'automation_ready' | 'citable' | 'not_citable';

export type LiteraturePipelineStageCode =
  | 'CITATION_NORMALIZED'
  | 'ABSTRACT_READY'
  | 'KEY_CONTENT_READY'
  | 'FULLTEXT_PREPROCESSED'
  | 'CHUNKED'
  | 'EMBEDDED'
  | 'INDEXED';

export type LiteraturePipelineStageStatus =
  | 'NOT_STARTED'
  | 'PENDING'
  | 'RUNNING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'BLOCKED'
  | 'SKIPPED';

export type LiteraturePipelineRunStatus = 'PENDING' | 'RUNNING' | 'PARTIAL' | 'SUCCESS' | 'FAILED' | 'SKIPPED';

export type LiteraturePipelineTriggerSource =
  | 'AUTO_PULL'
  | 'MANUAL_IMPORT'
  | 'ZOTERO_IMPORT'
  | 'METADATA_PATCH'
  | 'OVERVIEW_ACTION'
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

export type LiteratureSourceRecord = {
  id: string;
  literatureId: string;
  provider: LiteratureProvider;
  sourceItemId: string;
  sourceUrl: string;
  rawPayload: Record<string, unknown>;
  fetchedAt: string;
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
  findLiteratureByDoi(doiNormalized: string): Promise<LiteratureRecord | null>;
  findLiteratureByArxivId(arxivId: string): Promise<LiteratureRecord | null>;
  findLiteratureByTitleAuthorsYearHash(hash: string): Promise<LiteratureRecord | null>;
  listLiteraturesByIds(literatureIds: string[]): Promise<LiteratureRecord[]>;

  upsertLiteratureSource(
    record: LiteratureSourceRecord,
  ): Promise<{ record: LiteratureSourceRecord; created: boolean }>;
  listSourcesByLiteratureId(literatureId: string): Promise<LiteratureSourceRecord[]>;

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

  createPipelineRun(record: LiteraturePipelineRunRecord): Promise<LiteraturePipelineRunRecord>;
  findPipelineRunById(runId: string): Promise<LiteraturePipelineRunRecord | null>;
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
