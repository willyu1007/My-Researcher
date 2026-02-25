import type { Prisma, PrismaClient } from '@prisma/client';
import type {
  LiteratureRecord,
  LiteratureRepository,
  LiteratureSourceRecord,
  PaperLiteratureLinkRecord,
  TopicLiteratureScopeRecord,
} from '../literature-repository.js';

function toLiteratureRecord(row: {
  id: string;
  title: string;
  abstractText: string | null;
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
    rawPayload: (row.rawPayload as Record<string, unknown>) ?? {},
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
}
