-- AlterTable
ALTER TABLE "LiteratureEmbeddingVersion"
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'READY',
ADD COLUMN "profileId" TEXT,
ADD COLUMN "inputChecksum" TEXT,
ADD COLUMN "chunkArtifactChecksum" TEXT,
ADD COLUMN "embeddingArtifactChecksum" TEXT,
ADD COLUMN "indexArtifactChecksum" TEXT,
ADD COLUMN "indexedAt" TIMESTAMPTZ(6),
ADD COLUMN "activatedAt" TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "LiteratureEmbeddingChunk"
ADD COLUMN "chunkType" TEXT NOT NULL DEFAULT 'fulltext_paragraph',
ADD COLUMN "sourceRefs" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "metadata" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN "contentChecksum" TEXT;

-- Backfill pre-cutover versions as historical indexed versions. This prevents
-- legacy inactive rows from being mistaken for v1 READY snapshots that can be
-- activated by the new same-version INDEXED flow.
UPDATE "LiteratureEmbeddingVersion"
SET "status" = 'INDEXED',
    "indexedAt" = COALESCE("indexedAt", "updatedAt");

UPDATE "LiteratureEmbeddingVersion"
SET "activatedAt" = COALESCE("activatedAt", "updatedAt")
WHERE "id" IN (
  SELECT "activeEmbeddingVersionId"
  FROM "LiteratureRecord"
  WHERE "activeEmbeddingVersionId" IS NOT NULL
);

-- CreateIndex
CREATE INDEX "LiteratureEmbeddingVersion_literatureId_status_idx" ON "LiteratureEmbeddingVersion"("literatureId", "status");

-- CreateIndex
CREATE INDEX "LiteratureEmbeddingChunk_literatureId_chunkType_idx" ON "LiteratureEmbeddingChunk"("literatureId", "chunkType");
