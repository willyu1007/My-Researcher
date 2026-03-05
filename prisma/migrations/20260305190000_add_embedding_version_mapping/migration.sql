ALTER TABLE "LiteratureRecord"
ADD COLUMN "activeEmbeddingVersionId" TEXT;

CREATE TABLE "LiteratureEmbeddingVersion" (
    "id" TEXT NOT NULL,
    "literatureId" TEXT NOT NULL,
    "versionNo" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "dimension" INTEGER NOT NULL,
    "chunkCount" INTEGER NOT NULL,
    "vectorCount" INTEGER NOT NULL,
    "tokenCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "LiteratureEmbeddingVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LiteratureEmbeddingChunk" (
    "id" TEXT NOT NULL,
    "embeddingVersionId" TEXT NOT NULL,
    "literatureId" TEXT NOT NULL,
    "chunkId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "startOffset" INTEGER NOT NULL,
    "endOffset" INTEGER NOT NULL,
    "vector" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "LiteratureEmbeddingChunk_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LiteratureEmbeddingTokenIndex" (
    "id" TEXT NOT NULL,
    "embeddingVersionId" TEXT NOT NULL,
    "literatureId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "chunkIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "LiteratureEmbeddingTokenIndex_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LiteratureEmbeddingVersion_literatureId_versionNo_key"
  ON "LiteratureEmbeddingVersion"("literatureId", "versionNo");
CREATE INDEX "LiteratureEmbeddingVersion_literatureId_createdAt_idx"
  ON "LiteratureEmbeddingVersion"("literatureId", "createdAt");
CREATE INDEX "LiteratureEmbeddingVersion_provider_model_dimension_idx"
  ON "LiteratureEmbeddingVersion"("provider", "model", "dimension");

CREATE UNIQUE INDEX "LiteratureEmbeddingChunk_embeddingVersionId_chunkId_key"
  ON "LiteratureEmbeddingChunk"("embeddingVersionId", "chunkId");
CREATE INDEX "LiteratureEmbeddingChunk_embeddingVersionId_chunkIndex_idx"
  ON "LiteratureEmbeddingChunk"("embeddingVersionId", "chunkIndex");
CREATE INDEX "LiteratureEmbeddingChunk_literatureId_chunkId_idx"
  ON "LiteratureEmbeddingChunk"("literatureId", "chunkId");

CREATE UNIQUE INDEX "LiteratureEmbeddingTokenIndex_embeddingVersionId_token_key"
  ON "LiteratureEmbeddingTokenIndex"("embeddingVersionId", "token");
CREATE INDEX "LiteratureEmbeddingTokenIndex_literatureId_token_idx"
  ON "LiteratureEmbeddingTokenIndex"("literatureId", "token");

CREATE INDEX "LiteratureRecord_activeEmbeddingVersionId_idx"
  ON "LiteratureRecord"("activeEmbeddingVersionId");

ALTER TABLE "LiteratureEmbeddingVersion"
ADD CONSTRAINT "LiteratureEmbeddingVersion_literatureId_fkey"
FOREIGN KEY ("literatureId") REFERENCES "LiteratureRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LiteratureEmbeddingChunk"
ADD CONSTRAINT "LiteratureEmbeddingChunk_embeddingVersionId_fkey"
FOREIGN KEY ("embeddingVersionId") REFERENCES "LiteratureEmbeddingVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LiteratureEmbeddingChunk"
ADD CONSTRAINT "LiteratureEmbeddingChunk_literatureId_fkey"
FOREIGN KEY ("literatureId") REFERENCES "LiteratureRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LiteratureEmbeddingTokenIndex"
ADD CONSTRAINT "LiteratureEmbeddingTokenIndex_embeddingVersionId_fkey"
FOREIGN KEY ("embeddingVersionId") REFERENCES "LiteratureEmbeddingVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LiteratureEmbeddingTokenIndex"
ADD CONSTRAINT "LiteratureEmbeddingTokenIndex_literatureId_fkey"
FOREIGN KEY ("literatureId") REFERENCES "LiteratureRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LiteratureRecord"
ADD CONSTRAINT "LiteratureRecord_activeEmbeddingVersionId_fkey"
FOREIGN KEY ("activeEmbeddingVersionId") REFERENCES "LiteratureEmbeddingVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
