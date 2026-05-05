import type { Prisma, PrismaClient } from '@prisma/client';
import type {
  LiteratureEmbeddingChunkRecord,
  LiteratureEmbeddingTokenIndexRecord,
  LiteratureEmbeddingVersionRecord,
} from '../../literature-repository.js';
import {
  toEmbeddingChunkRecord,
  toEmbeddingTokenIndexRecord,
  toEmbeddingVersionRecord,
} from './prisma-literature-record-mappers.js';

export class PrismaLiteratureEmbeddingStore {
  constructor(private readonly prisma: PrismaClient) {}

  async createEmbeddingVersion(record: LiteratureEmbeddingVersionRecord): Promise<LiteratureEmbeddingVersionRecord> {
    const created = await this.prisma.literatureEmbeddingVersion.create({
      data: {
        id: record.id,
        literatureId: record.literatureId,
        versionNo: record.versionNo,
        status: record.status,
        profileId: record.profileId,
        provider: record.provider,
        model: record.model,
        dimension: record.dimension,
        chunkCount: record.chunkCount,
        vectorCount: record.vectorCount,
        tokenCount: record.tokenCount,
        inputChecksum: record.inputChecksum,
        chunkArtifactChecksum: record.chunkArtifactChecksum,
        embeddingArtifactChecksum: record.embeddingArtifactChecksum,
        indexArtifactChecksum: record.indexArtifactChecksum,
        indexedAt: record.indexedAt ? new Date(record.indexedAt) : null,
        activatedAt: record.activatedAt ? new Date(record.activatedAt) : null,
        createdAt: new Date(record.createdAt),
        updatedAt: new Date(record.updatedAt),
      },
    });
    return toEmbeddingVersionRecord(created);
  }

  async updateEmbeddingVersion(
    embeddingVersionId: string,
    patch: Partial<Omit<LiteratureEmbeddingVersionRecord, 'id' | 'literatureId' | 'versionNo' | 'createdAt'>>,
  ): Promise<LiteratureEmbeddingVersionRecord> {
    const data: Prisma.LiteratureEmbeddingVersionUpdateInput = {
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.profileId !== undefined ? { profileId: patch.profileId } : {}),
      ...(patch.provider !== undefined ? { provider: patch.provider } : {}),
      ...(patch.model !== undefined ? { model: patch.model } : {}),
      ...(patch.dimension !== undefined ? { dimension: patch.dimension } : {}),
      ...(patch.chunkCount !== undefined ? { chunkCount: patch.chunkCount } : {}),
      ...(patch.vectorCount !== undefined ? { vectorCount: patch.vectorCount } : {}),
      ...(patch.tokenCount !== undefined ? { tokenCount: patch.tokenCount } : {}),
      ...(patch.inputChecksum !== undefined ? { inputChecksum: patch.inputChecksum } : {}),
      ...(patch.chunkArtifactChecksum !== undefined ? { chunkArtifactChecksum: patch.chunkArtifactChecksum } : {}),
      ...(patch.embeddingArtifactChecksum !== undefined ? { embeddingArtifactChecksum: patch.embeddingArtifactChecksum } : {}),
      ...(patch.indexArtifactChecksum !== undefined ? { indexArtifactChecksum: patch.indexArtifactChecksum } : {}),
      ...(patch.indexedAt !== undefined ? { indexedAt: patch.indexedAt ? new Date(patch.indexedAt) : null } : {}),
      ...(patch.activatedAt !== undefined ? { activatedAt: patch.activatedAt ? new Date(patch.activatedAt) : null } : {}),
      ...(patch.updatedAt !== undefined ? { updatedAt: new Date(patch.updatedAt) } : {}),
    };

    const updated = await this.prisma.literatureEmbeddingVersion.update({
      where: { id: embeddingVersionId },
      data,
    });
    return toEmbeddingVersionRecord(updated);
  }

  async findEmbeddingVersionById(embeddingVersionId: string): Promise<LiteratureEmbeddingVersionRecord | null> {
    const row = await this.prisma.literatureEmbeddingVersion.findUnique({
      where: { id: embeddingVersionId },
    });
    return row ? toEmbeddingVersionRecord(row) : null;
  }

  async findLatestEmbeddingVersionByLiteratureId(literatureId: string): Promise<LiteratureEmbeddingVersionRecord | null> {
    const row = await this.prisma.literatureEmbeddingVersion.findFirst({
      where: { literatureId },
      orderBy: { versionNo: 'desc' },
    });
    return row ? toEmbeddingVersionRecord(row) : null;
  }

  async listActiveEmbeddingVersions(): Promise<LiteratureEmbeddingVersionRecord[]> {
    const rows = await this.prisma.literatureRecord.findMany({
      where: {
        activeEmbeddingVersionId: {
          not: null,
        },
      },
      select: {
        activeEmbeddingVersion: true,
      },
    });
    return rows
      .map((row) => row.activeEmbeddingVersion)
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .map((row) => toEmbeddingVersionRecord(row));
  }

  async listEmbeddingVersionsByLiteratureIds(literatureIds: string[]): Promise<LiteratureEmbeddingVersionRecord[]> {
    if (literatureIds.length === 0) {
      return [];
    }
    const rows = await this.prisma.literatureEmbeddingVersion.findMany({
      where: {
        literatureId: {
          in: literatureIds,
        },
      },
      orderBy: [
        { literatureId: 'asc' },
        { versionNo: 'asc' },
      ],
    });
    return rows.map((row) => toEmbeddingVersionRecord(row));
  }

  async listActiveEmbeddingVersionsByLiteratureIds(literatureIds: string[]): Promise<LiteratureEmbeddingVersionRecord[]> {
    if (literatureIds.length === 0) {
      return [];
    }
    const rows = await this.prisma.literatureRecord.findMany({
      where: {
        id: {
          in: literatureIds,
        },
        activeEmbeddingVersionId: {
          not: null,
        },
      },
      select: {
        activeEmbeddingVersion: true,
      },
    });
    return rows
      .map((row) => row.activeEmbeddingVersion)
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .map((row) => toEmbeddingVersionRecord(row));
  }

  async createEmbeddingChunks(records: LiteratureEmbeddingChunkRecord[]): Promise<LiteratureEmbeddingChunkRecord[]> {
    if (records.length === 0) {
      return [];
    }
    await this.prisma.literatureEmbeddingChunk.createMany({
      data: records.map((record) => ({
        id: record.id,
        embeddingVersionId: record.embeddingVersionId,
        literatureId: record.literatureId,
        chunkId: record.chunkId,
        chunkIndex: record.chunkIndex,
        text: record.text,
        startOffset: record.startOffset,
        endOffset: record.endOffset,
        chunkType: record.chunkType,
        sourceRefs: record.sourceRefs as unknown as Prisma.InputJsonValue,
        metadata: record.metadata as unknown as Prisma.InputJsonValue,
        contentChecksum: record.contentChecksum,
        vector: record.vector as unknown as Prisma.InputJsonValue,
        createdAt: new Date(record.createdAt),
        updatedAt: new Date(record.updatedAt),
      })),
    });
    return records;
  }

  async listEmbeddingChunksByEmbeddingVersionId(embeddingVersionId: string): Promise<LiteratureEmbeddingChunkRecord[]> {
    const rows = await this.prisma.literatureEmbeddingChunk.findMany({
      where: { embeddingVersionId },
      orderBy: { chunkIndex: 'asc' },
    });
    return rows.map((row) => toEmbeddingChunkRecord(row));
  }

  async listEmbeddingChunksByEmbeddingVersionIds(embeddingVersionIds: string[]): Promise<LiteratureEmbeddingChunkRecord[]> {
    if (embeddingVersionIds.length === 0) {
      return [];
    }
    const rows = await this.prisma.literatureEmbeddingChunk.findMany({
      where: {
        embeddingVersionId: {
          in: embeddingVersionIds,
        },
      },
    });
    return rows.map((row) => toEmbeddingChunkRecord(row));
  }

  async replaceEmbeddingTokenIndexes(
    embeddingVersionId: string,
    records: LiteratureEmbeddingTokenIndexRecord[],
  ): Promise<LiteratureEmbeddingTokenIndexRecord[]> {
    await this.prisma.$transaction(async (tx) => {
      await tx.literatureEmbeddingTokenIndex.deleteMany({
        where: { embeddingVersionId },
      });
      if (records.length === 0) {
        return;
      }
      await tx.literatureEmbeddingTokenIndex.createMany({
        data: records.map((record) => ({
          id: record.id,
          embeddingVersionId: record.embeddingVersionId,
          literatureId: record.literatureId,
          token: record.token,
          chunkIds: record.chunkIds,
          createdAt: new Date(record.createdAt),
          updatedAt: new Date(record.updatedAt),
        })),
      });
    });
    return records;
  }

  async listEmbeddingTokenIndexesByEmbeddingVersionId(
    embeddingVersionId: string,
  ): Promise<LiteratureEmbeddingTokenIndexRecord[]> {
    const rows = await this.prisma.literatureEmbeddingTokenIndex.findMany({
      where: { embeddingVersionId },
      orderBy: { token: 'asc' },
    });
    return rows.map((row) => toEmbeddingTokenIndexRecord(row));
  }
}
