import type { Prisma, PrismaClient } from '@prisma/client';
import type {
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

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function toLiteratureRecord(row: {
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
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toSourceRecord(row: {
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

function toTopicScopeRecord(row: {
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

function toPaperLinkRecord(row: {
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

function toPipelineStateRecord(row: {
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

function toPipelineStageStateRecord(row: {
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

function toPipelineRunRecord(row: {
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

function toPipelineRunStepRecord(row: {
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

export class PrismaLiteratureRepository implements LiteratureRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async countLiteratures(): Promise<number> {
    return this.prisma.literatureRecord.count();
  }

  async countLiteratureSources(): Promise<number> {
    return this.prisma.literatureSource.count();
  }

  async countTopicScopes(): Promise<number> {
    return this.prisma.topicLiteratureScope.count();
  }

  async countPaperLiteratureLinks(): Promise<number> {
    return this.prisma.paperLiteratureLink.count();
  }

  async createLiterature(record: LiteratureRecord): Promise<LiteratureRecord> {
    const created = await this.prisma.literatureRecord.create({
      data: {
        id: record.id,
        title: record.title,
        abstractText: record.abstractText,
        keyContentDigest: record.keyContentDigest,
        authors: record.authors,
        year: record.year,
        doiNormalized: record.doiNormalized,
        arxivId: record.arxivId,
        normalizedTitle: record.normalizedTitle,
        titleAuthorsYearHash: record.titleAuthorsYearHash,
        rightsClass: record.rightsClass,
        tags: record.tags,
        createdAt: new Date(record.createdAt),
        updatedAt: new Date(record.updatedAt),
      },
    });
    return toLiteratureRecord(created);
  }

  async updateLiterature(record: LiteratureRecord): Promise<LiteratureRecord> {
    const updated = await this.prisma.literatureRecord.update({
      where: { id: record.id },
      data: {
        title: record.title,
        abstractText: record.abstractText,
        keyContentDigest: record.keyContentDigest,
        authors: record.authors,
        year: record.year,
        doiNormalized: record.doiNormalized,
        arxivId: record.arxivId,
        normalizedTitle: record.normalizedTitle,
        titleAuthorsYearHash: record.titleAuthorsYearHash,
        rightsClass: record.rightsClass,
        tags: record.tags,
        updatedAt: new Date(record.updatedAt),
      },
    });
    return toLiteratureRecord(updated);
  }

  async findLiteratureById(literatureId: string): Promise<LiteratureRecord | null> {
    const row = await this.prisma.literatureRecord.findUnique({ where: { id: literatureId } });
    return row ? toLiteratureRecord(row) : null;
  }

  async findLiteratureByDoi(doiNormalized: string): Promise<LiteratureRecord | null> {
    const row = await this.prisma.literatureRecord.findUnique({
      where: { doiNormalized },
    });
    return row ? toLiteratureRecord(row) : null;
  }

  async findLiteratureByArxivId(arxivId: string): Promise<LiteratureRecord | null> {
    const row = await this.prisma.literatureRecord.findUnique({
      where: { arxivId },
    });
    return row ? toLiteratureRecord(row) : null;
  }

  async findLiteratureByTitleAuthorsYearHash(hash: string): Promise<LiteratureRecord | null> {
    const row = await this.prisma.literatureRecord.findUnique({
      where: { titleAuthorsYearHash: hash },
    });
    return row ? toLiteratureRecord(row) : null;
  }

  async listLiteraturesByIds(literatureIds: string[]): Promise<LiteratureRecord[]> {
    if (literatureIds.length === 0) {
      return [];
    }

    const rows = await this.prisma.literatureRecord.findMany({
      where: { id: { in: literatureIds } },
    });
    return rows.map((row) => toLiteratureRecord(row));
  }

  async upsertLiteratureSource(
    record: LiteratureSourceRecord,
  ): Promise<{ record: LiteratureSourceRecord; created: boolean }> {
    const existing = await this.prisma.literatureSource.findUnique({
      where: {
        provider_sourceItemId: {
          provider: record.provider,
          sourceItemId: record.sourceItemId,
        },
      },
    });

    if (existing) {
      const updated = await this.prisma.literatureSource.update({
        where: { id: existing.id },
        data: {
          sourceUrl: record.sourceUrl,
          rawPayload: record.rawPayload as Prisma.InputJsonValue,
          fetchedAt: new Date(record.fetchedAt),
        },
      });
      return { record: toSourceRecord(updated), created: false };
    }

    const created = await this.prisma.literatureSource.create({
      data: {
        id: record.id,
        literatureId: record.literatureId,
        provider: record.provider,
        sourceItemId: record.sourceItemId,
        sourceUrl: record.sourceUrl,
        rawPayload: record.rawPayload as Prisma.InputJsonValue,
        fetchedAt: new Date(record.fetchedAt),
      },
    });
    return { record: toSourceRecord(created), created: true };
  }

  async listSourcesByLiteratureId(literatureId: string): Promise<LiteratureSourceRecord[]> {
    const rows = await this.prisma.literatureSource.findMany({
      where: { literatureId },
      orderBy: { fetchedAt: 'asc' },
    });
    return rows.map((row) => toSourceRecord(row));
  }

  async upsertTopicScope(
    record: TopicLiteratureScopeRecord,
  ): Promise<{ record: TopicLiteratureScopeRecord; created: boolean }> {
    const existing = await this.prisma.topicLiteratureScope.findUnique({
      where: {
        topicId_literatureId: {
          topicId: record.topicId,
          literatureId: record.literatureId,
        },
      },
    });

    if (existing) {
      const updated = await this.prisma.topicLiteratureScope.update({
        where: { id: existing.id },
        data: {
          scopeStatus: record.scopeStatus,
          reason: record.reason,
          updatedAt: new Date(record.updatedAt),
        },
      });
      return { record: toTopicScopeRecord(updated), created: false };
    }

    const created = await this.prisma.topicLiteratureScope.create({
      data: {
        id: record.id,
        topicId: record.topicId,
        literatureId: record.literatureId,
        scopeStatus: record.scopeStatus,
        reason: record.reason,
        createdAt: new Date(record.createdAt),
        updatedAt: new Date(record.updatedAt),
      },
    });
    return { record: toTopicScopeRecord(created), created: true };
  }

  async listTopicScopesByTopicId(topicId: string): Promise<TopicLiteratureScopeRecord[]> {
    const rows = await this.prisma.topicLiteratureScope.findMany({
      where: { topicId },
      orderBy: { updatedAt: 'asc' },
    });
    return rows.map((row) => toTopicScopeRecord(row));
  }

  async upsertPaperLiteratureLink(
    record: PaperLiteratureLinkRecord,
  ): Promise<{ record: PaperLiteratureLinkRecord; created: boolean }> {
    const existing = await this.prisma.paperLiteratureLink.findUnique({
      where: {
        paperId_literatureId: {
          paperId: record.paperId,
          literatureId: record.literatureId,
        },
      },
    });

    if (existing) {
      const updated = await this.prisma.paperLiteratureLink.update({
        where: { id: existing.id },
        data: {
          topicId: record.topicId ?? existing.topicId,
          note: record.note ?? existing.note,
          updatedAt: new Date(record.updatedAt),
        },
      });
      return { record: toPaperLinkRecord(updated), created: false };
    }

    const created = await this.prisma.paperLiteratureLink.create({
      data: {
        id: record.id,
        paperId: record.paperId,
        topicId: record.topicId,
        literatureId: record.literatureId,
        citationStatus: record.citationStatus,
        note: record.note,
        createdAt: new Date(record.createdAt),
        updatedAt: new Date(record.updatedAt),
      },
    });
    return { record: toPaperLinkRecord(created), created: true };
  }

  async findPaperLiteratureLinkById(linkId: string): Promise<PaperLiteratureLinkRecord | null> {
    const row = await this.prisma.paperLiteratureLink.findUnique({
      where: { id: linkId },
    });
    return row ? toPaperLinkRecord(row) : null;
  }

  async listPaperLiteratureLinksByPaperId(paperId: string): Promise<PaperLiteratureLinkRecord[]> {
    const rows = await this.prisma.paperLiteratureLink.findMany({
      where: { paperId },
      orderBy: { updatedAt: 'asc' },
    });
    return rows.map((row) => toPaperLinkRecord(row));
  }

  async updatePaperLiteratureLink(
    linkId: string,
    patch: { citationStatus?: PaperLiteratureLinkRecord['citationStatus']; note?: string | null },
  ): Promise<PaperLiteratureLinkRecord> {
    const updated = await this.prisma.paperLiteratureLink.update({
      where: { id: linkId },
      data: {
        ...(patch.citationStatus !== undefined
          ? { citationStatus: patch.citationStatus }
          : {}),
        ...(patch.note !== undefined ? { note: patch.note } : {}),
        updatedAt: new Date(),
      },
    });
    return toPaperLinkRecord(updated);
  }

  async upsertPipelineState(
    record: LiteraturePipelineStateRecord,
  ): Promise<{ record: LiteraturePipelineStateRecord; created: boolean }> {
    const existing = await this.prisma.literaturePipelineState.findUnique({
      where: { literatureId: record.literatureId },
    });

    if (existing) {
      const updated = await this.prisma.literaturePipelineState.update({
        where: { id: existing.id },
        data: {
          citationComplete: record.citationComplete,
          abstractReady: record.abstractReady,
          keyContentReady: record.keyContentReady,
          dedupStatus: record.dedupStatus,
          updatedAt: new Date(record.updatedAt),
        },
      });
      return { record: toPipelineStateRecord(updated), created: false };
    }

    const created = await this.prisma.literaturePipelineState.create({
      data: {
        id: record.id,
        literatureId: record.literatureId,
        citationComplete: record.citationComplete,
        abstractReady: record.abstractReady,
        keyContentReady: record.keyContentReady,
        dedupStatus: record.dedupStatus,
        updatedAt: new Date(record.updatedAt),
      },
    });
    return { record: toPipelineStateRecord(created), created: true };
  }

  async findPipelineStateByLiteratureId(literatureId: string): Promise<LiteraturePipelineStateRecord | null> {
    const row = await this.prisma.literaturePipelineState.findUnique({
      where: { literatureId },
    });
    return row ? toPipelineStateRecord(row) : null;
  }

  async listPipelineStatesByLiteratureIds(literatureIds: string[]): Promise<LiteraturePipelineStateRecord[]> {
    if (literatureIds.length === 0) {
      return [];
    }

    const rows = await this.prisma.literaturePipelineState.findMany({
      where: {
        literatureId: {
          in: literatureIds,
        },
      },
    });
    return rows.map((row) => toPipelineStateRecord(row));
  }

  async upsertPipelineStageState(
    record: LiteraturePipelineStageStateRecord,
  ): Promise<{ record: LiteraturePipelineStageStateRecord; created: boolean }> {
    const existing = await this.prisma.literaturePipelineStageState.findUnique({
      where: {
        literatureId_stageCode: {
          literatureId: record.literatureId,
          stageCode: record.stageCode,
        },
      },
    });

    if (existing) {
      const updated = await this.prisma.literaturePipelineStageState.update({
        where: { id: existing.id },
        data: {
          status: record.status,
          lastRunId: record.lastRunId,
          detail: record.detail as Prisma.InputJsonValue,
          updatedAt: new Date(record.updatedAt),
        },
      });
      return { record: toPipelineStageStateRecord(updated), created: false };
    }

    const created = await this.prisma.literaturePipelineStageState.create({
      data: {
        id: record.id,
        literatureId: record.literatureId,
        stageCode: record.stageCode,
        status: record.status,
        lastRunId: record.lastRunId,
        detail: record.detail as Prisma.InputJsonValue,
        updatedAt: new Date(record.updatedAt),
      },
    });
    return { record: toPipelineStageStateRecord(created), created: true };
  }

  async listPipelineStageStatesByLiteratureId(literatureId: string): Promise<LiteraturePipelineStageStateRecord[]> {
    const rows = await this.prisma.literaturePipelineStageState.findMany({
      where: { literatureId },
      orderBy: { updatedAt: 'asc' },
    });
    return rows.map((row) => toPipelineStageStateRecord(row));
  }

  async createPipelineRun(record: LiteraturePipelineRunRecord): Promise<LiteraturePipelineRunRecord> {
    const created = await this.prisma.literaturePipelineRun.create({
      data: {
        id: record.id,
        literatureId: record.literatureId,
        triggerSource: record.triggerSource,
        status: record.status,
        requestedStages: record.requestedStages,
        errorCode: record.errorCode,
        errorMessage: record.errorMessage,
        createdAt: new Date(record.createdAt),
        startedAt: record.startedAt ? new Date(record.startedAt) : null,
        finishedAt: record.finishedAt ? new Date(record.finishedAt) : null,
        updatedAt: new Date(record.updatedAt),
      },
    });
    return toPipelineRunRecord(created);
  }

  async findPipelineRunById(runId: string): Promise<LiteraturePipelineRunRecord | null> {
    const row = await this.prisma.literaturePipelineRun.findUnique({
      where: { id: runId },
    });
    return row ? toPipelineRunRecord(row) : null;
  }

  async listPipelineRunsByLiteratureId(literatureId: string, limit?: number): Promise<LiteraturePipelineRunRecord[]> {
    const rows = await this.prisma.literaturePipelineRun.findMany({
      where: { literatureId },
      orderBy: { createdAt: 'desc' },
      ...(typeof limit === 'number' && limit > 0 ? { take: limit } : {}),
    });
    return rows.map((row) => toPipelineRunRecord(row));
  }

  async updatePipelineRun(
    runId: string,
    patch: Partial<Omit<LiteraturePipelineRunRecord, 'id' | 'literatureId' | 'triggerSource' | 'createdAt'>>,
  ): Promise<LiteraturePipelineRunRecord> {
    const updated = await this.prisma.literaturePipelineRun.update({
      where: { id: runId },
      data: {
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.requestedStages !== undefined ? { requestedStages: patch.requestedStages } : {}),
        ...(patch.errorCode !== undefined ? { errorCode: patch.errorCode } : {}),
        ...(patch.errorMessage !== undefined ? { errorMessage: patch.errorMessage } : {}),
        ...(patch.startedAt !== undefined
          ? { startedAt: patch.startedAt ? new Date(patch.startedAt) : null }
          : {}),
        ...(patch.finishedAt !== undefined
          ? { finishedAt: patch.finishedAt ? new Date(patch.finishedAt) : null }
          : {}),
        ...(patch.updatedAt !== undefined ? { updatedAt: new Date(patch.updatedAt) } : {}),
      },
    });
    return toPipelineRunRecord(updated);
  }

  async createPipelineRunStep(record: LiteraturePipelineRunStepRecord): Promise<LiteraturePipelineRunStepRecord> {
    const created = await this.prisma.literaturePipelineRunStep.create({
      data: {
        id: record.id,
        runId: record.runId,
        stageCode: record.stageCode,
        status: record.status,
        inputRef: record.inputRef as Prisma.InputJsonValue,
        outputRef: record.outputRef as Prisma.InputJsonValue,
        errorCode: record.errorCode,
        errorMessage: record.errorMessage,
        startedAt: record.startedAt ? new Date(record.startedAt) : null,
        finishedAt: record.finishedAt ? new Date(record.finishedAt) : null,
      },
    });
    return toPipelineRunStepRecord(created);
  }

  async updatePipelineRunStep(
    stepId: string,
    patch: Partial<Omit<LiteraturePipelineRunStepRecord, 'id' | 'runId' | 'stageCode'>>,
  ): Promise<LiteraturePipelineRunStepRecord> {
    const updated = await this.prisma.literaturePipelineRunStep.update({
      where: { id: stepId },
      data: {
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.inputRef !== undefined ? { inputRef: patch.inputRef as Prisma.InputJsonValue } : {}),
        ...(patch.outputRef !== undefined ? { outputRef: patch.outputRef as Prisma.InputJsonValue } : {}),
        ...(patch.errorCode !== undefined ? { errorCode: patch.errorCode } : {}),
        ...(patch.errorMessage !== undefined ? { errorMessage: patch.errorMessage } : {}),
        ...(patch.startedAt !== undefined
          ? { startedAt: patch.startedAt ? new Date(patch.startedAt) : null }
          : {}),
        ...(patch.finishedAt !== undefined
          ? { finishedAt: patch.finishedAt ? new Date(patch.finishedAt) : null }
          : {}),
      },
    });
    return toPipelineRunStepRecord(updated);
  }

  async listPipelineRunStepsByRunId(runId: string): Promise<LiteraturePipelineRunStepRecord[]> {
    const rows = await this.prisma.literaturePipelineRunStep.findMany({
      where: { runId },
      orderBy: [
        { startedAt: 'asc' },
        { id: 'asc' },
      ],
    });
    return rows.map((row) => toPipelineRunStepRecord(row));
  }
}
