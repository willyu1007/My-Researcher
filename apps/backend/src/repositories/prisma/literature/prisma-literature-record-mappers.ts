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
  LiteratureSourceRecord,
  PaperLiteratureLinkRecord,
  TopicLiteratureScopeRecord,
} from '../../literature-repository.js';

export function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export function toLiteratureRecord(row: {
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
  rightsClass: string;
  tags: string[];
  activeEmbeddingVersionId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): LiteratureRecord {
  return {
    id: row.id,
    title: row.title,
    abstractText: row.abstractText,
    keyContentDigest: row.keyContentDigest,
    authors: row.authors,
    year: row.year,
    doiNormalized: row.doiNormalized,
    arxivId: row.arxivId,
    normalizedTitle: row.normalizedTitle,
    titleAuthorsYearHash: row.titleAuthorsYearHash,
    rightsClass: row.rightsClass as LiteratureRecord['rightsClass'],
    tags: row.tags,
    activeEmbeddingVersionId: row.activeEmbeddingVersionId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toSourceRecord(row: {
  id: string;
  literatureId: string;
  provider: string;
  sourceItemId: string;
  sourceUrl: string;
  rawPayload: unknown;
  fetchedAt: Date;
}): LiteratureSourceRecord {
  return {
    id: row.id,
    literatureId: row.literatureId,
    provider: row.provider as LiteratureSourceRecord['provider'],
    sourceItemId: row.sourceItemId,
    sourceUrl: row.sourceUrl,
    rawPayload: asRecord(row.rawPayload),
    fetchedAt: row.fetchedAt.toISOString(),
  };
}

export function toTopicScopeRecord(row: {
  id: string;
  topicId: string;
  literatureId: string;
  scopeStatus: string;
  reason: string | null;
  createdAt: Date;
  updatedAt: Date;
}): TopicLiteratureScopeRecord {
  return {
    id: row.id,
    topicId: row.topicId,
    literatureId: row.literatureId,
    scopeStatus: row.scopeStatus as TopicLiteratureScopeRecord['scopeStatus'],
    reason: row.reason,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toPaperLinkRecord(row: {
  id: string;
  paperId: string;
  topicId: string | null;
  literatureId: string;
  citationStatus: string;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}): PaperLiteratureLinkRecord {
  return {
    id: row.id,
    paperId: row.paperId,
    topicId: row.topicId,
    literatureId: row.literatureId,
    citationStatus: row.citationStatus as PaperLiteratureLinkRecord['citationStatus'],
    note: row.note,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toPipelineStateRecord(row: {
  id: string;
  literatureId: string;
  citationComplete: boolean;
  abstractReady: boolean;
  keyContentReady: boolean;
  dedupStatus: string;
  updatedAt: Date;
}): LiteraturePipelineStateRecord {
  return {
    id: row.id,
    literatureId: row.literatureId,
    citationComplete: row.citationComplete,
    abstractReady: row.abstractReady,
    keyContentReady: row.keyContentReady,
    dedupStatus: row.dedupStatus as LiteraturePipelineStateRecord['dedupStatus'],
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toPipelineStageStateRecord(row: {
  id: string;
  literatureId: string;
  stageCode: string;
  status: string;
  lastRunId: string | null;
  detail: unknown;
  updatedAt: Date;
}): LiteraturePipelineStageStateRecord {
  return {
    id: row.id,
    literatureId: row.literatureId,
    stageCode: row.stageCode as LiteraturePipelineStageStateRecord['stageCode'],
    status: row.status as LiteraturePipelineStageStateRecord['status'],
    lastRunId: row.lastRunId,
    detail: asRecord(row.detail),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toPipelineRunRecord(row: {
  id: string;
  literatureId: string;
  triggerSource: string;
  status: string;
  requestedStages: string[];
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
  updatedAt: Date;
}): LiteraturePipelineRunRecord {
  return {
    id: row.id,
    literatureId: row.literatureId,
    triggerSource: row.triggerSource as LiteraturePipelineRunRecord['triggerSource'],
    status: row.status as LiteraturePipelineRunRecord['status'],
    requestedStages: row.requestedStages as LiteraturePipelineRunRecord['requestedStages'],
    errorCode: row.errorCode,
    errorMessage: row.errorMessage,
    createdAt: row.createdAt.toISOString(),
    startedAt: row.startedAt ? row.startedAt.toISOString() : null,
    finishedAt: row.finishedAt ? row.finishedAt.toISOString() : null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toPipelineRunStepRecord(row: {
  id: string;
  runId: string;
  stageCode: string;
  status: string;
  inputRef: unknown;
  outputRef: unknown;
  errorCode: string | null;
  errorMessage: string | null;
  startedAt: Date | null;
  finishedAt: Date | null;
}): LiteraturePipelineRunStepRecord {
  return {
    id: row.id,
    runId: row.runId,
    stageCode: row.stageCode as LiteraturePipelineRunStepRecord['stageCode'],
    status: row.status as LiteraturePipelineRunStepRecord['status'],
    inputRef: asRecord(row.inputRef),
    outputRef: asRecord(row.outputRef),
    errorCode: row.errorCode,
    errorMessage: row.errorMessage,
    startedAt: row.startedAt ? row.startedAt.toISOString() : null,
    finishedAt: row.finishedAt ? row.finishedAt.toISOString() : null,
  };
}

export function toPipelineArtifactRecord(row: {
  id: string;
  literatureId: string;
  stageCode: string;
  artifactType: string;
  payload: unknown;
  checksum: string | null;
  createdAt: Date;
  updatedAt: Date;
}): LiteraturePipelineArtifactRecord {
  return {
    id: row.id,
    literatureId: row.literatureId,
    stageCode: row.stageCode as LiteraturePipelineArtifactRecord['stageCode'],
    artifactType: row.artifactType as LiteraturePipelineArtifactRecord['artifactType'],
    payload: asRecord(row.payload),
    checksum: row.checksum,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toEmbeddingVersionRecord(row: {
  id: string;
  literatureId: string;
  versionNo: number;
  provider: string;
  model: string;
  dimension: number;
  chunkCount: number;
  vectorCount: number;
  tokenCount: number;
  createdAt: Date;
  updatedAt: Date;
}): LiteratureEmbeddingVersionRecord {
  return {
    id: row.id,
    literatureId: row.literatureId,
    versionNo: row.versionNo,
    provider: row.provider,
    model: row.model,
    dimension: row.dimension,
    chunkCount: row.chunkCount,
    vectorCount: row.vectorCount,
    tokenCount: row.tokenCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toEmbeddingChunkRecord(row: {
  id: string;
  embeddingVersionId: string;
  literatureId: string;
  chunkId: string;
  chunkIndex: number;
  text: string;
  startOffset: number;
  endOffset: number;
  vector: unknown;
  createdAt: Date;
  updatedAt: Date;
}): LiteratureEmbeddingChunkRecord {
  const vectorSource = Array.isArray(row.vector) ? row.vector : [];
  const vector = vectorSource
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));
  return {
    id: row.id,
    embeddingVersionId: row.embeddingVersionId,
    literatureId: row.literatureId,
    chunkId: row.chunkId,
    chunkIndex: row.chunkIndex,
    text: row.text,
    startOffset: row.startOffset,
    endOffset: row.endOffset,
    vector,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toEmbeddingTokenIndexRecord(row: {
  id: string;
  embeddingVersionId: string;
  literatureId: string;
  token: string;
  chunkIds: string[];
  createdAt: Date;
  updatedAt: Date;
}): LiteratureEmbeddingTokenIndexRecord {
  return {
    id: row.id,
    embeddingVersionId: row.embeddingVersionId,
    literatureId: row.literatureId,
    token: row.token,
    chunkIds: row.chunkIds,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
