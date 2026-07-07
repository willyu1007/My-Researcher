import { Prisma, type PrismaClient } from '@prisma/client';
import { AppError } from '../../../errors/app-error.js';
import type {
  LiteratureRecord,
  LiteratureQualityAssessmentRecord,
  LiteratureSourceRecord,
  PaperLiteratureLinkRecord,
  TopicLiteratureScopeRecord,
} from '../../literature-repository.js';
import {
  toLiteratureRecord,
  toQualityAssessmentRecord,
  toPaperLinkRecord,
  toSourceRecord,
  toTopicScopeRecord,
} from './prisma-literature-record-mappers.js';

export class PrismaLiteratureCoreStore {
  constructor(private readonly prisma: PrismaClient) {}

  async countLiteratures(): Promise<number> {
    return this.prisma.literatureRecord.count();
  }

  async countLiteratureSources(): Promise<number> {
    return this.prisma.literatureSource.count();
  }

  async listTopicScopeIds(): Promise<string[]> {
    const rows = await this.prisma.topicLiteratureScope.findMany({
      select: { id: true },
    });
    return rows.map((row) => row.id);
  }

  async listPaperLiteratureLinkIds(): Promise<string[]> {
    const rows = await this.prisma.paperLiteratureLink.findMany({
      select: { id: true },
    });
    return rows.map((row) => row.id);
  }

  async listLiteratureSourceIds(): Promise<string[]> {
    const rows = await this.prisma.literatureSource.findMany({
      select: { id: true },
    });
    return rows.map((row) => row.id);
  }

  // T-130 W-07 (L-09): concurrent imports of the same work race past the read-then-write
  // dedup check and land on the DB unique constraints (doiNormalized/arxivId/titleAuthorsYearHash).
  // Map that to a structured 409 instead of leaking a raw Prisma 500.
  private mapUniqueConstraintConflict(error: unknown, literatureId: string): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const target = Array.isArray(error.meta?.target)
        ? (error.meta.target as string[]).join(',')
        : String(error.meta?.target ?? 'unique constraint');
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        `Literature unique constraint conflict on ${target}; a concurrent import likely created the same work.`,
        { literature_id: literatureId, constraint: target },
      );
    }
    throw error;
  }

  async createLiterature(record: LiteratureRecord): Promise<LiteratureRecord> {
    try {
      return await this.createLiteratureUnmapped(record);
    } catch (error) {
      this.mapUniqueConstraintConflict(error, record.id);
    }
  }

  private async createLiteratureUnmapped(record: LiteratureRecord): Promise<LiteratureRecord> {
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
        activeEmbeddingVersionId: record.activeEmbeddingVersionId,
        createdAt: new Date(record.createdAt),
        updatedAt: new Date(record.updatedAt),
      },
    });
    return toLiteratureRecord(created);
  }

  async updateLiterature(record: LiteratureRecord): Promise<LiteratureRecord> {
    try {
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
          activeEmbeddingVersionId: record.activeEmbeddingVersionId,
          updatedAt: new Date(record.updatedAt),
        },
      });
      return toLiteratureRecord(updated);
    } catch (error) {
      this.mapUniqueConstraintConflict(error, record.id);
    }
  }

  async findLiteratureById(literatureId: string): Promise<LiteratureRecord | null> {
    const row = await this.prisma.literatureRecord.findUnique({ where: { id: literatureId } });
    return row ? toLiteratureRecord(row) : null;
  }

  async listLiteratures(): Promise<LiteratureRecord[]> {
    const rows = await this.prisma.literatureRecord.findMany({
      orderBy: { updatedAt: 'desc' },
    });
    return rows.map((row) => toLiteratureRecord(row));
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
          literatureId: record.literatureId,
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

  async upsertQualityAssessment(
    record: LiteratureQualityAssessmentRecord,
  ): Promise<{ record: LiteratureQualityAssessmentRecord; created: boolean }> {
    const existing = await this.prisma.literatureQualityAssessment.findUnique({
      where: { literatureId: record.literatureId },
    });
    if (existing) {
      const updated = await this.prisma.literatureQualityAssessment.update({
        where: { id: existing.id },
        data: {
          qualityStatus: record.qualityStatus,
          qualityScore: record.qualityScore,
          qualityComponents: record.qualityComponents as Prisma.InputJsonValue,
          blockerCodes: record.blockerCodes,
          source: record.source,
          assessedAt: new Date(record.assessedAt),
          updatedAt: new Date(record.updatedAt),
        },
      });
      return { record: toQualityAssessmentRecord(updated), created: false };
    }

    const created = await this.prisma.literatureQualityAssessment.create({
      data: {
        id: record.id,
        literatureId: record.literatureId,
        qualityStatus: record.qualityStatus,
        qualityScore: record.qualityScore,
        qualityComponents: record.qualityComponents as Prisma.InputJsonValue,
        blockerCodes: record.blockerCodes,
        source: record.source,
        assessedAt: new Date(record.assessedAt),
        createdAt: new Date(record.createdAt),
        updatedAt: new Date(record.updatedAt),
      },
    });
    return { record: toQualityAssessmentRecord(created), created: true };
  }

  async findQualityAssessmentByLiteratureId(literatureId: string): Promise<LiteratureQualityAssessmentRecord | null> {
    const row = await this.prisma.literatureQualityAssessment.findUnique({
      where: { literatureId },
    });
    return row ? toQualityAssessmentRecord(row) : null;
  }

  async listQualityAssessmentsByLiteratureIds(literatureIds: string[]): Promise<LiteratureQualityAssessmentRecord[]> {
    if (literatureIds.length === 0) {
      return [];
    }
    const rows = await this.prisma.literatureQualityAssessment.findMany({
      where: { literatureId: { in: literatureIds } },
    });
    return rows.map((row) => toQualityAssessmentRecord(row));
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
          activationStatus: record.activationStatus,
          activationReason: record.activationReason,
          activationScore: record.activationScore,
          activatedAt: record.activatedAt ? new Date(record.activatedAt) : null,
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
        activationStatus: record.activationStatus,
        activationReason: record.activationReason,
        activationScore: record.activationScore,
        activatedAt: record.activatedAt ? new Date(record.activatedAt) : null,
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

  async listTopicScopesByLiteratureId(literatureId: string): Promise<TopicLiteratureScopeRecord[]> {
    const rows = await this.prisma.topicLiteratureScope.findMany({
      where: { literatureId },
      orderBy: { updatedAt: 'asc' },
    });
    return rows.map((row) => toTopicScopeRecord(row));
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
    const existing = await this.prisma.topicLiteratureScope.findUnique({
      where: {
        topicId_literatureId: {
          topicId,
          literatureId,
        },
      },
    });
    if (!existing) {
      throw new Error(`Topic scope ${topicId}/${literatureId} not found.`);
    }
    const updated = await this.prisma.topicLiteratureScope.update({
      where: { id: existing.id },
      data: {
        activationStatus: patch.activationStatus,
        ...(patch.activationReason !== undefined ? { activationReason: patch.activationReason } : {}),
        ...(patch.activationScore !== undefined ? { activationScore: patch.activationScore } : {}),
        ...(patch.activatedAt !== undefined ? { activatedAt: patch.activatedAt ? new Date(patch.activatedAt) : null } : {}),
        updatedAt: new Date(patch.updatedAt),
      },
    });
    return toTopicScopeRecord(updated);
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
