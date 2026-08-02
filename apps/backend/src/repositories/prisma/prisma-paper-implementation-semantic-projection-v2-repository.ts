import { Ajv } from 'ajv';
import {
  Prisma,
  type PrismaClient,
} from '@prisma/client';
import {
  PAPER_IMPLEMENTATION_SEMANTIC_VECTOR_DIMENSION_V2,
  paperImplementationSemanticDocumentV2Schema,
  type PaperImplementationSemanticDocumentV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-semantic-retrieval-v2-contracts';
import {
  canonicalizeExperimentV2Json,
  serverHashPaperImplementationSemanticDocumentV2,
  serverHashPaperImplementationSemanticEmbeddingV2,
  serverHashPaperImplementationSemanticSourceV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';

import {
  assertPaperImplementationSemanticProjectionReplacementV2,
  PAPER_IMPLEMENTATION_SEMANTIC_NORMALIZED_VECTOR_TOLERANCE_V2,
  PaperImplementationSemanticProjectionV2RepositoryError,
  type PaperImplementationSemanticProjectionRecordV2,
  type PaperImplementationSemanticProjectionV2Repository,
  type ReplacePaperImplementationSemanticProjectProjectionV2Input,
} from '../paper-implementation-semantic-projection-v2.repository.js';

export interface PrismaPaperImplementationSemanticProjectionV2RepositoryOptions {
  /** Test-only fault fence inside the atomic project replacement transaction. */
  failpoint?: (point: 'after-first-upsert') => void;
}

interface StoredProjectionRow {
  id: string;
  implementationProjectId: string;
  schemaVersion: string;
  sourceType: string;
  sourceId: string;
  sourceVersion: string;
  sourceHash: string;
  semanticText: string;
  documentHash: string;
  content: unknown;
  embeddingProfileId: string;
  embeddingProvider: string;
  embeddingModel: string;
  embeddingDimension: number;
  embeddingHash: string;
  retrievalVector: string;
  indexedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const storedDocumentAjv = new Ajv({ allErrors: true, strict: false });
const validateStoredDocument = storedDocumentAjv.compile<PaperImplementationSemanticDocumentV2>(
  paperImplementationSemanticDocumentV2Schema,
);

function projectionError(message: string): PaperImplementationSemanticProjectionV2RepositoryError {
  return new PaperImplementationSemanticProjectionV2RepositoryError(
    'PROJECTION_STORED_INTEGRITY_ERROR',
    message,
  );
}

function toPgvectorLiteral(values: readonly number[]): string {
  return `[${values.map((value) => {
    if (!Number.isFinite(value)) {
      throw new PaperImplementationSemanticProjectionV2RepositoryError(
        'PROJECTION_INPUT_INVALID',
        'Semantic projection vector contains a non-finite value',
      );
    }
    return Object.is(value, -0) ? '0' : String(value);
  }).join(',')}]`;
}

function parsePgvectorLiteral(value: string): number[] {
  if (!value.startsWith('[') || !value.endsWith(']')) {
    throw projectionError('Stored semantic projection vector is malformed');
  }
  const values = value.slice(1, -1).split(',').map((item) => {
    const parsed = Math.fround(Number(item));
    return Object.is(parsed, -0) ? 0 : parsed;
  });
  if (
    values.length !== PAPER_IMPLEMENTATION_SEMANTIC_VECTOR_DIMENSION_V2
    || values.some((item) => !Number.isFinite(item))
  ) {
    throw projectionError('Stored semantic projection vector has invalid values');
  }
  return values;
}

function mapStoredRow(row: StoredProjectionRow): PaperImplementationSemanticProjectionRecordV2 {
  const storedDocument: unknown = {
    schema_version: row.schemaVersion,
    document_id: row.id,
    implementation_project_id: row.implementationProjectId,
    source: {
      source_type: row.sourceType,
      source_id: row.sourceId,
      source_version: row.sourceVersion,
      source_hash: row.sourceHash,
    },
    semantic_text: row.semanticText,
    document_hash: row.documentHash,
    content: row.content,
  };
  if (!validateStoredDocument(storedDocument)) {
    throw projectionError(`Stored semantic projection document is invalid: ${row.id}`);
  }
  const document = storedDocument;
  if (
    canonicalizeExperimentV2Json(document.content) !== document.semantic_text
    || serverHashPaperImplementationSemanticSourceV2(document.content)
      !== document.source.source_hash
    || serverHashPaperImplementationSemanticDocumentV2({
      implementation_project_id: document.implementation_project_id,
      source: document.source,
      semantic_text: document.semantic_text,
      content: document.content,
    }) !== document.document_hash
  ) {
    throw projectionError(`Stored semantic projection hashes disagree: ${row.id}`);
  }
  const normalizedVector = parsePgvectorLiteral(row.retrievalVector);
  const squaredNorm = normalizedVector.reduce((sum, value) => sum + (value * value), 0);
  if (
    Math.abs(Math.sqrt(squaredNorm) - 1)
      > PAPER_IMPLEMENTATION_SEMANTIC_NORMALIZED_VECTOR_TOLERANCE_V2
  ) {
    throw projectionError(`Stored semantic projection vector is not normalized: ${row.id}`);
  }
  const embeddingProfile = {
    profile_id: row.embeddingProfileId,
    provider: row.embeddingProvider,
    model: row.embeddingModel,
    dimension: row.embeddingDimension,
  };
  if (serverHashPaperImplementationSemanticEmbeddingV2({
    document_id: document.document_id,
    document_hash: document.document_hash,
    profile_id: embeddingProfile.profile_id,
    provider: embeddingProfile.provider,
    model: embeddingProfile.model,
    dimension: embeddingProfile.dimension,
    normalized_vector: normalizedVector,
  }) !== row.embeddingHash) {
    throw projectionError(`Stored semantic projection embedding hash disagrees: ${row.id}`);
  }
  return {
    ...document,
    embedding_profile: embeddingProfile,
    embedding_hash: row.embeddingHash,
    normalized_vector: normalizedVector,
    indexed_at: row.indexedAt.toISOString(),
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

export class PrismaPaperImplementationSemanticProjectionV2Repository
implements PaperImplementationSemanticProjectionV2Repository {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly options: PrismaPaperImplementationSemanticProjectionV2RepositoryOptions = {},
  ) {}

  async replaceProjectProjection(
    input: ReplacePaperImplementationSemanticProjectProjectionV2Input,
  ) {
    assertPaperImplementationSemanticProjectionReplacementV2(input);
    return this.prisma.$transaction(async (transaction) => {
      const project = await transaction.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT "id"
        FROM "PaperImplementationProject"
        WHERE "id" = ${input.implementation_project_id}
        FOR UPDATE
      `);
      if (project.length !== 1) {
        throw new PaperImplementationSemanticProjectionV2RepositoryError(
          'IMPLEMENTATION_PROJECT_NOT_FOUND',
          `ImplementationProject does not exist: ${input.implementation_project_id}`,
        );
      }

      const existing = await transaction.paperImplementationSemanticDocumentProjectionV2
        .findMany({
          where: { implementationProjectId: input.implementation_project_id },
          select: {
            id: true,
            sourceType: true,
            sourceId: true,
          },
        });
      const existingById = new Map(existing.map((row) => [row.id, row]));
      const existingBySource = new Map(existing.map((row) => [
        `${row.sourceType}:${row.sourceId}`,
        row,
      ]));
      const incomingIds = input.documents.map((document) => document.document_id);
      if (incomingIds.length > 0) {
        const collidingIds = await transaction.paperImplementationSemanticDocumentProjectionV2
          .findMany({
            where: {
              id: { in: incomingIds },
              implementationProjectId: { not: input.implementation_project_id },
            },
            select: { id: true },
          });
        if (collidingIds.length > 0) {
          throw new PaperImplementationSemanticProjectionV2RepositoryError(
            'PROJECTION_INPUT_INVALID',
            `Semantic document identity collides across projects: ${collidingIds[0]!.id}`,
          );
        }
      }

      let changedCount = 0;
      for (const [index, document] of input.documents.entries()) {
        const current = existingById.get(document.document_id);
        const currentSource = existingBySource.get(
          `${document.source.source_type}:${document.source.source_id}`,
        );
        if (
          (current && (
            current.sourceType !== document.source.source_type
            || current.sourceId !== document.source.source_id
          ))
          || (currentSource && currentSource.id !== document.document_id)
        ) {
          throw new PaperImplementationSemanticProjectionV2RepositoryError(
            'PROJECTION_INPUT_INVALID',
            `Semantic document identity changed source: ${document.document_id}`,
          );
        }
        const indexedAt = new Date(document.indexed_at);
        const vectorLiteral = toPgvectorLiteral(document.normalized_vector);
        changedCount += await transaction.$executeRaw(Prisma.sql`
          INSERT INTO "PaperImplementationSemanticDocumentProjectionV2" (
            "id", "implementationProjectId", "schemaVersion", "sourceType", "sourceId",
            "sourceVersion", "sourceHash", "semanticText", "documentHash", "content",
            "embeddingProfileId", "embeddingProvider", "embeddingModel",
            "embeddingDimension", "embeddingHash", "retrievalVector",
            "indexedAt", "createdAt", "updatedAt"
          ) VALUES (
            ${document.document_id}, ${document.implementation_project_id},
            ${document.schema_version}, ${document.source.source_type},
            ${document.source.source_id}, ${document.source.source_version},
            ${document.source.source_hash}, ${document.semantic_text},
            ${document.document_hash}, ${JSON.stringify(document.content)}::jsonb,
            ${document.embedding_profile.profile_id}, ${document.embedding_profile.provider},
            ${document.embedding_profile.model}, ${document.embedding_profile.dimension},
            ${document.embedding_hash}, ${vectorLiteral}::vector,
            ${indexedAt}, ${indexedAt}, ${indexedAt}
          )
          ON CONFLICT ("id") DO UPDATE SET
            "schemaVersion" = EXCLUDED."schemaVersion",
            "sourceVersion" = EXCLUDED."sourceVersion",
            "sourceHash" = EXCLUDED."sourceHash",
            "semanticText" = EXCLUDED."semanticText",
            "documentHash" = EXCLUDED."documentHash",
            "content" = EXCLUDED."content",
            "embeddingProfileId" = EXCLUDED."embeddingProfileId",
            "embeddingProvider" = EXCLUDED."embeddingProvider",
            "embeddingModel" = EXCLUDED."embeddingModel",
            "embeddingDimension" = EXCLUDED."embeddingDimension",
            "embeddingHash" = EXCLUDED."embeddingHash",
            "retrievalVector" = EXCLUDED."retrievalVector",
            "indexedAt" = EXCLUDED."indexedAt",
            "updatedAt" = EXCLUDED."updatedAt"
          WHERE
            "PaperImplementationSemanticDocumentProjectionV2"."schemaVersion"
              IS DISTINCT FROM EXCLUDED."schemaVersion"
            OR "PaperImplementationSemanticDocumentProjectionV2"."sourceVersion"
              IS DISTINCT FROM EXCLUDED."sourceVersion"
            OR "PaperImplementationSemanticDocumentProjectionV2"."sourceHash"
              IS DISTINCT FROM EXCLUDED."sourceHash"
            OR "PaperImplementationSemanticDocumentProjectionV2"."semanticText"
              IS DISTINCT FROM EXCLUDED."semanticText"
            OR "PaperImplementationSemanticDocumentProjectionV2"."documentHash"
              IS DISTINCT FROM EXCLUDED."documentHash"
            OR "PaperImplementationSemanticDocumentProjectionV2"."content"
              IS DISTINCT FROM EXCLUDED."content"
            OR "PaperImplementationSemanticDocumentProjectionV2"."embeddingProfileId"
              IS DISTINCT FROM EXCLUDED."embeddingProfileId"
            OR "PaperImplementationSemanticDocumentProjectionV2"."embeddingProvider"
              IS DISTINCT FROM EXCLUDED."embeddingProvider"
            OR "PaperImplementationSemanticDocumentProjectionV2"."embeddingModel"
              IS DISTINCT FROM EXCLUDED."embeddingModel"
            OR "PaperImplementationSemanticDocumentProjectionV2"."embeddingDimension"
              IS DISTINCT FROM EXCLUDED."embeddingDimension"
            OR "PaperImplementationSemanticDocumentProjectionV2"."embeddingHash"
              IS DISTINCT FROM EXCLUDED."embeddingHash"
            OR "PaperImplementationSemanticDocumentProjectionV2"."retrievalVector"
              IS DISTINCT FROM EXCLUDED."retrievalVector"
        `);
        if (index === 0) this.options.failpoint?.('after-first-upsert');
      }

      const deleted = await transaction.paperImplementationSemanticDocumentProjectionV2
        .deleteMany({
          where: {
            implementationProjectId: input.implementation_project_id,
            ...(incomingIds.length > 0 ? { id: { notIn: incomingIds } } : {}),
          },
        });
      return {
        changed_count: changedCount,
        unchanged_count: input.documents.length - changedCount,
        deleted_count: deleted.count,
        total_count: input.documents.length,
      };
    }, { timeout: 30_000 });
  }

  async listProjectProjection(implementationProjectId: string) {
    const rows = await this.prisma.$queryRaw<StoredProjectionRow[]>(Prisma.sql`
      SELECT
        "id", "implementationProjectId", "schemaVersion", "sourceType", "sourceId",
        "sourceVersion", "sourceHash", "semanticText", "documentHash", "content",
        "embeddingProfileId", "embeddingProvider", "embeddingModel",
        "embeddingDimension", "embeddingHash", "retrievalVector"::text AS "retrievalVector",
        "indexedAt", "createdAt", "updatedAt"
      FROM "PaperImplementationSemanticDocumentProjectionV2"
      WHERE "implementationProjectId" = ${implementationProjectId}
      ORDER BY "id" ASC
    `);
    return rows.map(mapStoredRow);
  }
}
