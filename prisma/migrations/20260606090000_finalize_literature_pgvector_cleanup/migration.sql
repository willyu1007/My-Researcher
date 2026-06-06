-- T-121 Phase 5 final cleanup.
-- Removes legacy JSONB vector storage and migration-only pgvector control-plane tables.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "LiteratureEmbeddingChunk"
    WHERE "retrievalVector" IS NULL
    LIMIT 1
  ) THEN
    RAISE EXCEPTION 'Cannot drop LiteratureEmbeddingChunk.vector while retrievalVector coverage is incomplete.';
  END IF;
END $$;

ALTER TABLE "LiteratureEmbeddingVectorQuarantineIssue"
DROP CONSTRAINT IF EXISTS "LiteratureEmbeddingVectorQuarantineIssue_runId_fkey";

ALTER TABLE "LiteratureEmbeddingChunk"
DROP COLUMN "vector";

DROP TABLE "LiteratureEmbeddingVectorQuarantineIssue";

DROP TABLE "LiteratureEmbeddingVectorBackfillRun";
