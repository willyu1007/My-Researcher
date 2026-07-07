import type { Prisma, PrismaClient } from '@prisma/client';
import type {
  LiteratureEmbeddingChunkRecord,
  LiteratureEmbeddingRetrievalVectorChunkRecord,
  LiteratureEmbeddingRetrievalVectorWrite,
  LiteratureEmbeddingRetrievalVectorCoverageQuery,
  LiteratureEmbeddingRetrievalVectorCoverageSummary,
  LiteratureEmbeddingVectorCandidateQuery,
  LiteratureEmbeddingVectorCandidateRecord,
  LiteratureEmbeddingVectorCandidateResult,
  LiteratureEmbeddingTokenIndexRecord,
  LiteratureEmbeddingVersionRecord,
} from '../../literature-repository.js';
import {
  asRecord,
  toEmbeddingChunkRecord,
  toEmbeddingTokenIndexRecord,
  toEmbeddingVersionRecord,
} from './prisma-literature-record-mappers.js';

const RETRIEVAL_VECTOR_DIMENSION = 3072;
const MAX_VECTOR_CANDIDATE_LIMIT = 5000;
const EMBEDDING_CHUNK_SELECT = {
  id: true,
  embeddingVersionId: true,
  literatureId: true,
  chunkId: true,
  chunkIndex: true,
  text: true,
  startOffset: true,
  endOffset: true,
  chunkType: true,
  sourceRefs: true,
  metadata: true,
  contentChecksum: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.LiteratureEmbeddingChunkSelect;

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
        createdAt: new Date(record.createdAt),
        updatedAt: new Date(record.updatedAt),
      })),
    });
    return records;
  }

  async listEmbeddingChunksByEmbeddingVersionId(embeddingVersionId: string): Promise<LiteratureEmbeddingChunkRecord[]> {
    const rows = await this.prisma.literatureEmbeddingChunk.findMany({
      where: { embeddingVersionId },
      select: EMBEDDING_CHUNK_SELECT,
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
      select: EMBEDDING_CHUNK_SELECT,
    });
    return rows.map((row) => toEmbeddingChunkRecord(row));
  }

  async listEmbeddingRetrievalVectorChunksByEmbeddingVersionIds(
    embeddingVersionIds: string[],
  ): Promise<LiteratureEmbeddingRetrievalVectorChunkRecord[]> {
    if (embeddingVersionIds.length === 0) {
      return [];
    }
    const versionIdArray = `ARRAY[${embeddingVersionIds.map((id) => sqlString(id)).join(', ')}]::text[]`;
    const rows = await this.prisma.$queryRawUnsafe<Array<{
      embeddingVersionId: string;
      literatureId: string;
      chunkId: string;
      retrievalVector: string | null;
    }>>(`
      SELECT
        c."embeddingVersionId",
        c."literatureId",
        c."chunkId",
        c."retrievalVector"::text AS "retrievalVector"
      FROM "LiteratureEmbeddingChunk" c
      WHERE c."embeddingVersionId" = ANY(${versionIdArray})
        AND c."retrievalVector" IS NOT NULL
      ORDER BY c."embeddingVersionId" ASC, c."chunkIndex" ASC
    `);
    return rows.map((row) => ({
      embeddingVersionId: row.embeddingVersionId,
      literatureId: row.literatureId,
      chunkId: row.chunkId,
      vector: parsePgvectorLiteral(row.retrievalVector),
    }));
  }

  async writeEmbeddingRetrievalVectors(records: LiteratureEmbeddingRetrievalVectorWrite[]): Promise<number> {
    if (records.length === 0) {
      return 0;
    }
    let writtenCount = 0;
    await this.prisma.$transaction(async (tx) => {
      for (const record of records) {
        const vectorLiteral = toPgvectorLiteral(record.normalizedVector);
        writtenCount += await tx.$executeRawUnsafe(`
          UPDATE "LiteratureEmbeddingChunk"
          SET
            "retrievalVector" = ${sqlString(vectorLiteral)}::vector,
            "updatedAt" = ${sqlString(new Date(record.updatedAt).toISOString())}::timestamptz
          WHERE "id" = ${sqlString(record.embeddingChunkId)}
        `);
      }
    });
    return writtenCount;
  }

  async summarizeEmbeddingRetrievalVectorCoverage(
    query: LiteratureEmbeddingRetrievalVectorCoverageQuery,
  ): Promise<LiteratureEmbeddingRetrievalVectorCoverageSummary> {
    const embeddingVersionIds = [...new Set(query.embeddingVersionIds)];
    if (embeddingVersionIds.length === 0) {
      return emptyRetrievalVectorCoverageSummary();
    }

    const versionIdArray = `ARRAY[${embeddingVersionIds.map((id) => sqlString(id)).join(', ')}]::text[]`;
    const rows = await this.prisma.$queryRawUnsafe<Array<{
      embeddingVersionId: string;
      literatureId: string;
      chunkCount: unknown;
      nativeVectorCount: unknown;
      missingNativeVectorCount: unknown;
    }>>(`
      SELECT
        c."embeddingVersionId",
        c."literatureId",
        COUNT(*)::int AS "chunkCount",
        COUNT(c."retrievalVector")::int AS "nativeVectorCount",
        (COUNT(*) - COUNT(c."retrievalVector"))::int AS "missingNativeVectorCount"
      FROM "LiteratureEmbeddingChunk" c
      WHERE c."embeddingVersionId" = ANY(${versionIdArray})
      GROUP BY c."embeddingVersionId", c."literatureId"
      ORDER BY c."literatureId" ASC, c."embeddingVersionId" ASC
    `);
    const byVersion = rows.map((row) => ({
      embeddingVersionId: row.embeddingVersionId,
      literatureId: row.literatureId,
      chunkCount: toNumber(row.chunkCount),
      nativeVectorCount: toNumber(row.nativeVectorCount),
      missingNativeVectorCount: toNumber(row.missingNativeVectorCount),
    }));
    const chunkCount = byVersion.reduce((sum, row) => sum + row.chunkCount, 0);
    const nativeVectorCount = byVersion.reduce((sum, row) => sum + row.nativeVectorCount, 0);
    return {
      embeddingVersionCount: byVersion.length,
      literatureCount: new Set(byVersion.map((row) => row.literatureId)).size,
      chunkCount,
      nativeVectorCount,
      missingNativeVectorCount: byVersion.reduce((sum, row) => sum + row.missingNativeVectorCount, 0),
      coverageRatio: chunkCount === 0 ? 0 : nativeVectorCount / chunkCount,
      byVersion,
    };
  }

  async listEmbeddingVectorCandidates(
    query: LiteratureEmbeddingVectorCandidateQuery,
  ): Promise<LiteratureEmbeddingVectorCandidateResult> {
    const candidateLimit = clampInteger(query.candidateLimit, 1, MAX_VECTOR_CANDIDATE_LIMIT);
    const perLiteratureCandidateCap = clampInteger(query.perLiteratureCandidateCap, 1, MAX_VECTOR_CANDIDATE_LIMIT);
    if (query.eligibleEmbeddingVersionIds.length === 0) {
      return {
        candidates: [],
        telemetry: {
          candidateLimit,
          candidateReturned: 0,
          candidateLimitHit: false,
          perLiteratureCandidateCap,
          filteredEmbeddingVersionCount: 0,
          filteredChunkCount: 0,
          dbSimilarityQueryMs: 0,
        },
      };
    }

    const queryVectorLiteral = toPgvectorLiteral(query.normalizedQueryVector);
    const versionIdArray = `ARRAY[${query.eligibleEmbeddingVersionIds.map((id) => sqlString(id)).join(', ')}]::text[]`;
    // T-130 W-03 (D6): the knn CTE is an index-friendly top-window scan — both sides of `<#>`
    // are cast to halfvec(3072) to match the hnsw expression index
    // (LiteratureEmbeddingChunk_retrievalVector_halfvec_hnsw_idx). Per-literature capping and
    // scoring happen over the fetched window only (over-fetch ×4, bounded), instead of the old
    // whole-table window-function scan that could never use an ANN index. statement_timeout is a
    // real DB-side cancel; hnsw.iterative_scan keeps fetching when the version filter or a
    // LIMIT above ef_search would otherwise truncate results.
    const knnWindow = Math.min(candidateLimit * 4, 5_000);
    const efSearch = Math.min(Math.max(candidateLimit, 100), 1_000);
    const timeoutMs = clampInteger(query.queryTimeoutMs ?? 0, 0, 600_000);
    const distanceExpr = `(c."retrievalVector"::halfvec(3072)) <#> ${sqlString(queryVectorLiteral)}::halfvec(3072)`;
    const startedAt = Date.now();
    const runCandidateQuery = async () => this.prisma.$transaction(async (tx) => {
      if (timeoutMs > 0) {
        await tx.$executeRawUnsafe(`SET LOCAL statement_timeout = ${timeoutMs}`);
      }
      await tx.$executeRawUnsafe(`SET LOCAL hnsw.ef_search = ${efSearch}`);
      await tx.$executeRawUnsafe(`SET LOCAL hnsw.iterative_scan = 'relaxed_order'`);
      const candidateRows = await tx.$queryRawUnsafe<Array<Record<string, unknown>>>(`
        WITH knn AS (
          SELECT
            c."id",
            c."embeddingVersionId",
            c."literatureId",
            c."chunkId",
            c."chunkIndex",
            c."text",
            c."startOffset",
            c."endOffset",
            c."chunkType",
            c."sourceRefs",
            c."metadata",
            c."contentChecksum",
            c."createdAt",
            c."updatedAt",
            ${distanceExpr} AS "negativeInnerProduct"
          FROM "LiteratureEmbeddingChunk" c
          WHERE c."embeddingVersionId" = ANY(${versionIdArray})
            AND c."retrievalVector" IS NOT NULL
          ORDER BY ${distanceExpr} ASC, c."id" ASC
          LIMIT ${knnWindow}
        ),
        ranked AS (
          SELECT
            *,
            ROW_NUMBER() OVER (
              PARTITION BY "literatureId"
              ORDER BY "negativeInnerProduct" ASC, "id" ASC
            ) AS "literatureRank"
          FROM knn
        )
        SELECT
          "id",
          "embeddingVersionId",
          "literatureId",
          "chunkId",
          "chunkIndex",
          "text",
          "startOffset",
          "endOffset",
          "chunkType",
          "sourceRefs",
          "metadata",
          "contentChecksum",
          "createdAt",
          "updatedAt",
          "negativeInnerProduct",
          LEAST(1, GREATEST(0, ((-1 * "negativeInnerProduct") + 1) / 2))::float8 AS "vectorScore"
        FROM ranked
        WHERE "literatureRank" <= ${perLiteratureCandidateCap}
        ORDER BY "negativeInnerProduct" ASC, "id" ASC
        LIMIT ${candidateLimit}
      `);
      const countRows = await tx.$queryRawUnsafe<Array<{ filteredChunkCount: unknown }>>(`
        SELECT COUNT(*)::int AS "filteredChunkCount"
        FROM "LiteratureEmbeddingChunk" c
        WHERE c."embeddingVersionId" = ANY(${versionIdArray})
          AND c."retrievalVector" IS NOT NULL
      `);
      return { candidateRows, countRows };
    }, {
      // Prisma interactive transactions default to a 5s cap; the DB-side statement_timeout must
      // be the binding constraint, so give the transaction headroom above it (+ count query).
      timeout: Math.max(timeoutMs, 5_000) + 15_000,
    });

    let queryResult: Awaited<ReturnType<typeof runCandidateQuery>>;
    try {
      queryResult = await runCandidateQuery();
    } catch (error) {
      if (error instanceof Error && /statement timeout|57014/i.test(error.message)) {
        const timeoutError = new Error(
          `Literature pgvector candidate query exceeded statement_timeout (${timeoutMs}ms).`,
        );
        (timeoutError as Error & { code?: string }).code = 'RETRIEVAL_PGVECTOR_TIMEOUT';
        throw timeoutError;
      }
      throw error;
    }

    const rows = queryResult.candidateRows as Array<{
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
      createdAt: Date | string;
      updatedAt: Date | string;
      negativeInnerProduct: unknown;
      vectorScore: unknown;
    }>;
    const dbSimilarityQueryMs = Date.now() - startedAt;
    const filteredChunkCount = queryResult.countRows.length > 0
      ? toNumber(queryResult.countRows[0].filteredChunkCount)
      : 0;
    const candidates = rows.map((row): LiteratureEmbeddingVectorCandidateRecord => ({
      id: row.id,
      embeddingVersionId: row.embeddingVersionId,
      literatureId: row.literatureId,
      chunkId: row.chunkId,
      chunkIndex: row.chunkIndex,
      text: row.text,
      startOffset: row.startOffset,
      endOffset: row.endOffset,
      chunkType: row.chunkType,
      sourceRefs: asRecordArray(row.sourceRefs),
      metadata: asRecord(row.metadata),
      contentChecksum: row.contentChecksum,
      createdAt: toIsoString(row.createdAt),
      updatedAt: toIsoString(row.updatedAt),
      vectorScore: toNumber(row.vectorScore),
      negativeInnerProduct: toNumber(row.negativeInnerProduct),
    }));

    return {
      candidates,
      telemetry: {
        candidateLimit,
        candidateReturned: candidates.length,
        candidateLimitHit: candidates.length >= candidateLimit,
        perLiteratureCandidateCap,
        filteredEmbeddingVersionCount: query.eligibleEmbeddingVersionIds.length,
        filteredChunkCount,
        dbSimilarityQueryMs,
      },
    };
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

function emptyRetrievalVectorCoverageSummary(): LiteratureEmbeddingRetrievalVectorCoverageSummary {
  return {
    embeddingVersionCount: 0,
    literatureCount: 0,
    chunkCount: 0,
    nativeVectorCount: 0,
    missingNativeVectorCount: 0,
    coverageRatio: 0,
    byVersion: [],
  };
}

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function toPgvectorLiteral(values: number[]): string {
  if (values.length !== RETRIEVAL_VECTOR_DIMENSION) {
    throw new Error(`Expected ${RETRIEVAL_VECTOR_DIMENSION}-dimensional vector.`);
  }
  return `[${values.map((value) => {
    if (!Number.isFinite(value)) {
      throw new Error('Vector values must be finite numbers.');
    }
    return Number(value).toPrecision(12);
  }).join(',')}]`;
}

function parsePgvectorLiteral(value: string | null): number[] {
  if (!value) {
    return [];
  }
  const trimmed = value.trim();
  if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) {
    throw new Error('Invalid pgvector literal returned by database.');
  }
  const inner = trimmed.slice(1, -1).trim();
  if (!inner) {
    return [];
  }
  return inner.split(',').map((part) => {
    const number = Number(part.trim());
    if (!Number.isFinite(number)) {
      throw new Error('Invalid pgvector numeric value returned by database.');
    }
    return number;
  });
}

function sqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'bigint') {
    return Number(value);
  }
  if (value && typeof value === 'object' && typeof (value as { toString?: unknown }).toString === 'function') {
    return Number((value as { toString: () => string }).toString());
  }
  return Number(value);
}

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function asRecordArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is Record<string, unknown> =>
    Boolean(item) && typeof item === 'object' && !Array.isArray(item),
  );
}
