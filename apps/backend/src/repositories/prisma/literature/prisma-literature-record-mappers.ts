import type {
  LiteratureAbstractProfileRecord,
  LiteratureCitationProfileRecord,
  LiteratureContentAssetRecord,
  LiteratureEmbeddingChunkRecord,
  LiteratureEmbeddingTokenIndexRecord,
  LiteratureEmbeddingVersionRecord,
  LiteratureFulltextAnchorRecord,
  LiteratureFulltextDocumentRecord,
  LiteratureFulltextParagraphRecord,
  LiteratureFulltextSectionRecord,
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

function asRecordArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => (item && typeof item === 'object' && !Array.isArray(item) ? item as Record<string, unknown> : null))
    .filter((item): item is Record<string, unknown> => item !== null);
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

export function toCitationProfileRecord(row: {
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
  sourceRefs: unknown;
  inputChecksum: string;
  confidence: number;
  createdAt: Date;
  updatedAt: Date;
}): LiteratureCitationProfileRecord {
  return {
    id: row.id,
    literatureId: row.literatureId,
    normalizedDoi: row.normalizedDoi,
    normalizedArxivId: row.normalizedArxivId,
    normalizedTitle: row.normalizedTitle,
    normalizedAuthors: row.normalizedAuthors,
    parsedYear: row.parsedYear,
    normalizedSourceUrl: row.normalizedSourceUrl,
    titleAuthorsYearHash: row.titleAuthorsYearHash,
    citationComplete: row.citationComplete,
    incompleteReasonCodes: row.incompleteReasonCodes,
    sourceRefs: asRecordArray(row.sourceRefs),
    inputChecksum: row.inputChecksum,
    confidence: row.confidence,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toAbstractProfileRecord(row: {
  id: string;
  literatureId: string;
  abstractText: string | null;
  abstractSource: string | null;
  sourceRef: unknown;
  checksum: string | null;
  language: string | null;
  confidence: number;
  reasonCodes: string[];
  generated: boolean;
  createdAt: Date;
  updatedAt: Date;
}): LiteratureAbstractProfileRecord {
  return {
    id: row.id,
    literatureId: row.literatureId,
    abstractText: row.abstractText,
    abstractSource: row.abstractSource,
    sourceRef: asRecord(row.sourceRef),
    checksum: row.checksum,
    language: row.language,
    confidence: row.confidence,
    reasonCodes: row.reasonCodes,
    generated: row.generated,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toContentAssetRecord(row: {
  id: string;
  literatureId: string;
  assetKind: string;
  sourceKind: string;
  localPath: string;
  checksum: string;
  mimeType: string;
  byteSize: number;
  rightsClass: string;
  status: string;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
}): LiteratureContentAssetRecord {
  return {
    id: row.id,
    literatureId: row.literatureId,
    assetKind: row.assetKind as LiteratureContentAssetRecord['assetKind'],
    sourceKind: row.sourceKind as LiteratureContentAssetRecord['sourceKind'],
    localPath: row.localPath,
    checksum: row.checksum,
    mimeType: row.mimeType,
    byteSize: row.byteSize,
    rightsClass: row.rightsClass as LiteratureContentAssetRecord['rightsClass'],
    status: row.status as LiteratureContentAssetRecord['status'],
    metadata: asRecord(row.metadata),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toFulltextDocumentRecord(row: {
  id: string;
  literatureId: string;
  sourceAssetId: string;
  normalizedText: string;
  normalizedTextChecksum: string;
  parserName: string;
  parserVersion: string;
  status: string;
  diagnostics: unknown;
  createdAt: Date;
  updatedAt: Date;
}): LiteratureFulltextDocumentRecord {
  return {
    id: row.id,
    literatureId: row.literatureId,
    sourceAssetId: row.sourceAssetId,
    normalizedText: row.normalizedText,
    normalizedTextChecksum: row.normalizedTextChecksum,
    parserName: row.parserName,
    parserVersion: row.parserVersion,
    status: row.status as LiteratureFulltextDocumentRecord['status'],
    diagnostics: asRecordArray(row.diagnostics),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toFulltextSectionRecord(row: {
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
  createdAt: Date;
  updatedAt: Date;
}): LiteratureFulltextSectionRecord {
  return {
    id: row.id,
    documentId: row.documentId,
    sectionId: row.sectionId,
    title: row.title,
    level: row.level,
    orderIndex: row.orderIndex,
    startOffset: row.startOffset,
    endOffset: row.endOffset,
    pageStart: row.pageStart,
    pageEnd: row.pageEnd,
    checksum: row.checksum,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toFulltextParagraphRecord(row: {
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
  createdAt: Date;
  updatedAt: Date;
}): LiteratureFulltextParagraphRecord {
  return {
    id: row.id,
    documentId: row.documentId,
    paragraphId: row.paragraphId,
    sectionId: row.sectionId,
    orderIndex: row.orderIndex,
    text: row.text,
    startOffset: row.startOffset,
    endOffset: row.endOffset,
    pageNumber: row.pageNumber,
    checksum: row.checksum,
    confidence: row.confidence,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toFulltextAnchorRecord(row: {
  id: string;
  documentId: string;
  anchorId: string;
  anchorType: string;
  label: string | null;
  text: string | null;
  pageNumber: number | null;
  bbox: unknown;
  targetRefs: unknown;
  metadata: unknown;
  checksum: string | null;
  createdAt: Date;
  updatedAt: Date;
}): LiteratureFulltextAnchorRecord {
  return {
    id: row.id,
    documentId: row.documentId,
    anchorId: row.anchorId,
    anchorType: row.anchorType,
    label: row.label,
    text: row.text,
    pageNumber: row.pageNumber,
    bbox: row.bbox === null ? null : asRecord(row.bbox),
    targetRefs: asRecordArray(row.targetRefs),
    metadata: asRecord(row.metadata),
    checksum: row.checksum,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
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
  indexedAt: Date | null;
  activatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): LiteratureEmbeddingVersionRecord {
  return {
    id: row.id,
    literatureId: row.literatureId,
    versionNo: row.versionNo,
    status: row.status,
    profileId: row.profileId,
    provider: row.provider,
    model: row.model,
    dimension: row.dimension,
    chunkCount: row.chunkCount,
    vectorCount: row.vectorCount,
    tokenCount: row.tokenCount,
    inputChecksum: row.inputChecksum,
    chunkArtifactChecksum: row.chunkArtifactChecksum,
    embeddingArtifactChecksum: row.embeddingArtifactChecksum,
    indexArtifactChecksum: row.indexArtifactChecksum,
    indexedAt: row.indexedAt?.toISOString() ?? null,
    activatedAt: row.activatedAt?.toISOString() ?? null,
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
  chunkType: string;
  sourceRefs: unknown;
  metadata: unknown;
  contentChecksum: string | null;
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
    chunkType: row.chunkType,
    sourceRefs: Array.isArray(row.sourceRefs)
      ? row.sourceRefs.filter((item): item is Record<string, unknown> =>
          Boolean(item) && typeof item === 'object' && !Array.isArray(item),
        )
      : [],
    metadata: row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
      ? row.metadata as Record<string, unknown>
      : {},
    contentChecksum: row.contentChecksum,
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
