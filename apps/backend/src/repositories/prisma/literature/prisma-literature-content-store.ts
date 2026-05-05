import type { Prisma, PrismaClient } from '@prisma/client';
import type {
  LiteratureAbstractProfileRecord,
  LiteratureCitationProfileRecord,
  LiteratureContentAssetRecord,
  LiteratureFulltextAnchorRecord,
  LiteratureFulltextDocumentRecord,
  LiteratureFulltextExtractionBundle,
  LiteratureFulltextParagraphRecord,
  LiteratureFulltextSectionRecord,
} from '../../literature-repository.js';
import {
  toAbstractProfileRecord,
  toCitationProfileRecord,
  toContentAssetRecord,
  toFulltextAnchorRecord,
  toFulltextDocumentRecord,
  toFulltextParagraphRecord,
  toFulltextSectionRecord,
} from './prisma-literature-record-mappers.js';

export class PrismaLiteratureContentStore {
  constructor(private readonly prisma: PrismaClient) {}

  async upsertCitationProfile(
    record: LiteratureCitationProfileRecord,
  ): Promise<{ record: LiteratureCitationProfileRecord; created: boolean }> {
    const existing = await this.prisma.literatureCitationProfile.findUnique({
      where: { literatureId: record.literatureId },
    });

    if (existing) {
      const updated = await this.prisma.literatureCitationProfile.update({
        where: { id: existing.id },
        data: {
          normalizedDoi: record.normalizedDoi,
          normalizedArxivId: record.normalizedArxivId,
          normalizedTitle: record.normalizedTitle,
          normalizedAuthors: record.normalizedAuthors,
          parsedYear: record.parsedYear,
          normalizedSourceUrl: record.normalizedSourceUrl,
          titleAuthorsYearHash: record.titleAuthorsYearHash,
          citationComplete: record.citationComplete,
          incompleteReasonCodes: record.incompleteReasonCodes,
          sourceRefs: record.sourceRefs as Prisma.InputJsonValue,
          inputChecksum: record.inputChecksum,
          confidence: record.confidence,
          updatedAt: new Date(record.updatedAt),
        },
      });
      return { record: toCitationProfileRecord(updated), created: false };
    }

    const created = await this.prisma.literatureCitationProfile.create({
      data: {
        id: record.id,
        literatureId: record.literatureId,
        normalizedDoi: record.normalizedDoi,
        normalizedArxivId: record.normalizedArxivId,
        normalizedTitle: record.normalizedTitle,
        normalizedAuthors: record.normalizedAuthors,
        parsedYear: record.parsedYear,
        normalizedSourceUrl: record.normalizedSourceUrl,
        titleAuthorsYearHash: record.titleAuthorsYearHash,
        citationComplete: record.citationComplete,
        incompleteReasonCodes: record.incompleteReasonCodes,
        sourceRefs: record.sourceRefs as Prisma.InputJsonValue,
        inputChecksum: record.inputChecksum,
        confidence: record.confidence,
        createdAt: new Date(record.createdAt),
        updatedAt: new Date(record.updatedAt),
      },
    });
    return { record: toCitationProfileRecord(created), created: true };
  }

  async findCitationProfileByLiteratureId(literatureId: string): Promise<LiteratureCitationProfileRecord | null> {
    const row = await this.prisma.literatureCitationProfile.findUnique({ where: { literatureId } });
    return row ? toCitationProfileRecord(row) : null;
  }

  async upsertAbstractProfile(
    record: LiteratureAbstractProfileRecord,
  ): Promise<{ record: LiteratureAbstractProfileRecord; created: boolean }> {
    const existing = await this.prisma.literatureAbstractProfile.findUnique({
      where: { literatureId: record.literatureId },
    });

    if (existing) {
      const updated = await this.prisma.literatureAbstractProfile.update({
        where: { id: existing.id },
        data: {
          abstractText: record.abstractText,
          abstractSource: record.abstractSource,
          sourceRef: record.sourceRef as Prisma.InputJsonValue,
          checksum: record.checksum,
          language: record.language,
          confidence: record.confidence,
          reasonCodes: record.reasonCodes,
          generated: record.generated,
          updatedAt: new Date(record.updatedAt),
        },
      });
      return { record: toAbstractProfileRecord(updated), created: false };
    }

    const created = await this.prisma.literatureAbstractProfile.create({
      data: {
        id: record.id,
        literatureId: record.literatureId,
        abstractText: record.abstractText,
        abstractSource: record.abstractSource,
        sourceRef: record.sourceRef as Prisma.InputJsonValue,
        checksum: record.checksum,
        language: record.language,
        confidence: record.confidence,
        reasonCodes: record.reasonCodes,
        generated: record.generated,
        createdAt: new Date(record.createdAt),
        updatedAt: new Date(record.updatedAt),
      },
    });
    return { record: toAbstractProfileRecord(created), created: true };
  }

  async findAbstractProfileByLiteratureId(literatureId: string): Promise<LiteratureAbstractProfileRecord | null> {
    const row = await this.prisma.literatureAbstractProfile.findUnique({ where: { literatureId } });
    return row ? toAbstractProfileRecord(row) : null;
  }

  async upsertContentAsset(
    record: LiteratureContentAssetRecord,
  ): Promise<{ record: LiteratureContentAssetRecord; created: boolean }> {
    const existing = await this.prisma.literatureContentAsset.findUnique({
      where: {
        literatureId_localPath: {
          literatureId: record.literatureId,
          localPath: record.localPath,
        },
      },
    });

    if (existing) {
      const updated = await this.prisma.literatureContentAsset.update({
        where: { id: existing.id },
        data: {
          assetKind: record.assetKind,
          sourceKind: record.sourceKind,
          checksum: record.checksum,
          mimeType: record.mimeType,
          byteSize: record.byteSize,
          rightsClass: record.rightsClass,
          status: record.status,
          metadata: record.metadata as Prisma.InputJsonValue,
          updatedAt: new Date(record.updatedAt),
        },
      });
      return { record: toContentAssetRecord(updated), created: false };
    }

    const created = await this.prisma.literatureContentAsset.create({
      data: {
        id: record.id,
        literatureId: record.literatureId,
        assetKind: record.assetKind,
        sourceKind: record.sourceKind,
        localPath: record.localPath,
        checksum: record.checksum,
        mimeType: record.mimeType,
        byteSize: record.byteSize,
        rightsClass: record.rightsClass,
        status: record.status,
        metadata: record.metadata as Prisma.InputJsonValue,
        createdAt: new Date(record.createdAt),
        updatedAt: new Date(record.updatedAt),
      },
    });
    return { record: toContentAssetRecord(created), created: true };
  }

  async listContentAssetsByLiteratureId(literatureId: string): Promise<LiteratureContentAssetRecord[]> {
    const rows = await this.prisma.literatureContentAsset.findMany({
      where: { literatureId },
      orderBy: { updatedAt: 'desc' },
    });
    return rows.map((row) => toContentAssetRecord(row));
  }

  async findContentAssetById(assetId: string): Promise<LiteratureContentAssetRecord | null> {
    const row = await this.prisma.literatureContentAsset.findUnique({ where: { id: assetId } });
    return row ? toContentAssetRecord(row) : null;
  }

  async upsertFulltextExtractionBundle(
    bundle: LiteratureFulltextExtractionBundle,
  ): Promise<LiteratureFulltextExtractionBundle> {
    const existing = await this.prisma.literatureFulltextDocument.findUnique({
      where: { sourceAssetId: bundle.document.sourceAssetId },
    });
    const documentId = existing?.id ?? bundle.document.id;

    await this.prisma.$transaction(async (tx) => {
      await tx.literatureFulltextDocument.upsert({
        where: { sourceAssetId: bundle.document.sourceAssetId },
        create: {
          id: documentId,
          literatureId: bundle.document.literatureId,
          sourceAssetId: bundle.document.sourceAssetId,
          normalizedText: bundle.document.normalizedText,
          normalizedTextPath: bundle.document.normalizedTextPath,
          normalizedTextChecksum: bundle.document.normalizedTextChecksum,
          parserName: bundle.document.parserName,
          parserVersion: bundle.document.parserVersion,
          parserArtifactPath: bundle.document.parserArtifactPath,
          parserArtifactMimeType: bundle.document.parserArtifactMimeType,
          status: bundle.document.status,
          diagnostics: bundle.document.diagnostics as Prisma.InputJsonValue,
          createdAt: new Date(bundle.document.createdAt),
          updatedAt: new Date(bundle.document.updatedAt),
        },
        update: {
          normalizedText: bundle.document.normalizedText,
          normalizedTextPath: bundle.document.normalizedTextPath,
          normalizedTextChecksum: bundle.document.normalizedTextChecksum,
          parserName: bundle.document.parserName,
          parserVersion: bundle.document.parserVersion,
          parserArtifactPath: bundle.document.parserArtifactPath,
          parserArtifactMimeType: bundle.document.parserArtifactMimeType,
          status: bundle.document.status,
          diagnostics: bundle.document.diagnostics as Prisma.InputJsonValue,
          updatedAt: new Date(bundle.document.updatedAt),
        },
      });

      await tx.literatureFulltextAnchor.deleteMany({ where: { documentId } });
      await tx.literatureFulltextParagraph.deleteMany({ where: { documentId } });
      await tx.literatureFulltextSection.deleteMany({ where: { documentId } });

      if (bundle.sections.length > 0) {
        await tx.literatureFulltextSection.createMany({
          data: bundle.sections.map((section) => ({
            id: section.id,
            documentId,
            sectionId: section.sectionId,
            title: section.title,
            level: section.level,
            orderIndex: section.orderIndex,
            startOffset: section.startOffset,
            endOffset: section.endOffset,
            pageStart: section.pageStart,
            pageEnd: section.pageEnd,
            checksum: section.checksum,
            createdAt: new Date(section.createdAt),
            updatedAt: new Date(section.updatedAt),
          })),
        });
      }

      if (bundle.paragraphs.length > 0) {
        await tx.literatureFulltextParagraph.createMany({
          data: bundle.paragraphs.map((paragraph) => ({
            id: paragraph.id,
            documentId,
            paragraphId: paragraph.paragraphId,
            sectionId: paragraph.sectionId,
            orderIndex: paragraph.orderIndex,
            text: paragraph.text,
            startOffset: paragraph.startOffset,
            endOffset: paragraph.endOffset,
            pageNumber: paragraph.pageNumber,
            checksum: paragraph.checksum,
            confidence: paragraph.confidence,
            createdAt: new Date(paragraph.createdAt),
            updatedAt: new Date(paragraph.updatedAt),
          })),
        });
      }

      if (bundle.anchors.length > 0) {
        await tx.literatureFulltextAnchor.createMany({
          data: bundle.anchors.map((anchor) => ({
            id: anchor.id,
            documentId,
            anchorId: anchor.anchorId,
            anchorType: anchor.anchorType,
            label: anchor.label,
            text: anchor.text,
            pageNumber: anchor.pageNumber,
            bbox: anchor.bbox as Prisma.InputJsonValue,
            targetRefs: anchor.targetRefs as Prisma.InputJsonValue,
            metadata: anchor.metadata as Prisma.InputJsonValue,
            checksum: anchor.checksum,
            createdAt: new Date(anchor.createdAt),
            updatedAt: new Date(anchor.updatedAt),
          })),
        });
      }
    });

    const document = await this.prisma.literatureFulltextDocument.findUniqueOrThrow({
      where: { sourceAssetId: bundle.document.sourceAssetId },
    });
    const [sections, paragraphs, anchors] = await Promise.all([
      this.prisma.literatureFulltextSection.findMany({ where: { documentId }, orderBy: { orderIndex: 'asc' } }),
      this.prisma.literatureFulltextParagraph.findMany({ where: { documentId }, orderBy: { orderIndex: 'asc' } }),
      this.prisma.literatureFulltextAnchor.findMany({ where: { documentId }, orderBy: { anchorId: 'asc' } }),
    ]);

    return {
      document: toFulltextDocumentRecord(document),
      sections: sections.map((row) => toFulltextSectionRecord(row)),
      paragraphs: paragraphs.map((row) => toFulltextParagraphRecord(row)),
      anchors: anchors.map((row) => toFulltextAnchorRecord(row)),
    };
  }

  async findFulltextDocumentBySourceAssetId(sourceAssetId: string): Promise<LiteratureFulltextDocumentRecord | null> {
    const row = await this.prisma.literatureFulltextDocument.findUnique({ where: { sourceAssetId } });
    return row ? toFulltextDocumentRecord(row) : null;
  }

  async listFulltextDocumentsByLiteratureId(literatureId: string): Promise<LiteratureFulltextDocumentRecord[]> {
    const rows = await this.prisma.literatureFulltextDocument.findMany({
      where: { literatureId },
      orderBy: { updatedAt: 'desc' },
    });
    return rows.map((row) => toFulltextDocumentRecord(row));
  }

  async listFulltextSectionsByDocumentId(documentId: string): Promise<LiteratureFulltextSectionRecord[]> {
    const rows = await this.prisma.literatureFulltextSection.findMany({
      where: { documentId },
      orderBy: { orderIndex: 'asc' },
    });
    return rows.map((row) => toFulltextSectionRecord(row));
  }

  async listFulltextParagraphsByDocumentId(documentId: string): Promise<LiteratureFulltextParagraphRecord[]> {
    const rows = await this.prisma.literatureFulltextParagraph.findMany({
      where: { documentId },
      orderBy: { orderIndex: 'asc' },
    });
    return rows.map((row) => toFulltextParagraphRecord(row));
  }

  async listFulltextAnchorsByDocumentId(documentId: string): Promise<LiteratureFulltextAnchorRecord[]> {
    const rows = await this.prisma.literatureFulltextAnchor.findMany({
      where: { documentId },
      orderBy: { anchorId: 'asc' },
    });
    return rows.map((row) => toFulltextAnchorRecord(row));
  }
}
