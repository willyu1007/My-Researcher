-- T-121 Phase 1 infrastructure foundation.
-- Enables pgvector storage without changing the user-visible retrieval path.

CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE "LiteratureEmbeddingChunk"
ADD COLUMN "retrievalVector" vector(3072);

CREATE TABLE "LiteratureEmbeddingVectorBackfillRun" (
  "id" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "targetScope" JSONB NOT NULL DEFAULT '{}',
  "targetDimension" INTEGER NOT NULL,
  "targetColumn" TEXT NOT NULL DEFAULT 'retrievalVector',
  "totals" JSONB NOT NULL DEFAULT '{}',
  "errorCode" TEXT,
  "errorMessage" TEXT,
  "startedAt" TIMESTAMPTZ(6),
  "completedAt" TIMESTAMPTZ(6),
  "createdAt" TIMESTAMPTZ(6) NOT NULL,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "LiteratureEmbeddingVectorBackfillRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LiteratureEmbeddingVectorQuarantineIssue" (
  "id" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "literatureId" TEXT,
  "embeddingVersionId" TEXT,
  "embeddingChunkId" TEXT,
  "chunkId" TEXT,
  "issueCode" TEXT NOT NULL,
  "severity" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "observedDimension" INTEGER,
  "observedNorm" DOUBLE PRECISION,
  "details" JSONB NOT NULL DEFAULT '{}',
  "resolvedAt" TIMESTAMPTZ(6),
  "createdAt" TIMESTAMPTZ(6) NOT NULL,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "LiteratureEmbeddingVectorQuarantineIssue_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LiteratureEmbeddingVectorBackfillRun_status_createdAt_idx"
ON "LiteratureEmbeddingVectorBackfillRun"("status", "createdAt");

CREATE INDEX "LiteratureEmbeddingVectorBackfillRun_targetColumn_status_idx"
ON "LiteratureEmbeddingVectorBackfillRun"("targetColumn", "status");

CREATE INDEX "LiteratureEmbeddingVectorQuarantineIssue_runId_status_idx"
ON "LiteratureEmbeddingVectorQuarantineIssue"("runId", "status");

CREATE INDEX "LiteratureEmbeddingVectorQuarantineIssue_literatureId_status_idx"
ON "LiteratureEmbeddingVectorQuarantineIssue"("literatureId", "status");

CREATE INDEX "LiteratureEmbeddingVectorQuarantineIssue_embeddingVersionId_status_idx"
ON "LiteratureEmbeddingVectorQuarantineIssue"("embeddingVersionId", "status");

CREATE INDEX "LiteratureEmbeddingVectorQuarantineIssue_embeddingChunkId_idx"
ON "LiteratureEmbeddingVectorQuarantineIssue"("embeddingChunkId");

CREATE INDEX "LiteratureEmbeddingVectorQuarantineIssue_issueCode_status_idx"
ON "LiteratureEmbeddingVectorQuarantineIssue"("issueCode", "status");

ALTER TABLE "LiteratureEmbeddingVectorQuarantineIssue"
ADD CONSTRAINT "LiteratureEmbeddingVectorQuarantineIssue_runId_fkey"
FOREIGN KEY ("runId") REFERENCES "LiteratureEmbeddingVectorBackfillRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
