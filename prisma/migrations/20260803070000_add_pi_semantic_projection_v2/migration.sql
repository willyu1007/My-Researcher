-- T-134 Phase 4B: PI-owned, rebuildable semantic projection only.
-- Structured lineage remains authoritative; this table is safe to prune/rebuild.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE "PaperImplementationSemanticDocumentProjectionV2" (
  "id" TEXT NOT NULL,
  "implementationProjectId" TEXT NOT NULL,
  "schemaVersion" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "sourceVersion" TEXT NOT NULL,
  "sourceHash" TEXT NOT NULL,
  "semanticText" TEXT NOT NULL,
  "documentHash" TEXT NOT NULL,
  "content" JSONB NOT NULL,
  "embeddingProfileId" TEXT NOT NULL,
  "embeddingProvider" TEXT NOT NULL,
  "embeddingModel" TEXT NOT NULL,
  "embeddingDimension" INTEGER NOT NULL,
  "embeddingHash" TEXT NOT NULL,
  "retrievalVector" vector(3072) NOT NULL,
  "indexedAt" TIMESTAMPTZ(6) NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "pi_semantic_projection_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "pi_semantic_projection_schema_check"
    CHECK ("schemaVersion" = 'v1'),
  CONSTRAINT "pi_semantic_projection_source_type_check"
    CHECK ("sourceType" IN ('validation_cycle', 'effective_branch_head')),
  CONSTRAINT "pi_semantic_projection_content_type_check"
    CHECK ("content"->>'source_type' = "sourceType"),
  CONSTRAINT "pi_semantic_projection_dimension_check"
    CHECK ("embeddingDimension" = 3072),
  CONSTRAINT "pi_semantic_projection_hashes_check"
    CHECK (
      "sourceHash" ~ '^sha256:[0-9a-f]{64}$'
      AND "documentHash" ~ '^sha256:[0-9a-f]{64}$'
      AND "embeddingHash" ~ '^sha256:[0-9a-f]{64}$'
    )
);

CREATE UNIQUE INDEX "pi_semantic_projection_project_source_unique"
ON "PaperImplementationSemanticDocumentProjectionV2"
("implementationProjectId", "sourceType", "sourceId");

CREATE INDEX "pi_semantic_projection_project_type_idx"
ON "PaperImplementationSemanticDocumentProjectionV2"
("implementationProjectId", "sourceType");

CREATE INDEX "pi_semantic_projection_project_doc_hash_idx"
ON "PaperImplementationSemanticDocumentProjectionV2"
("implementationProjectId", "documentHash");

CREATE INDEX "pi_semantic_projection_project_source_hash_idx"
ON "PaperImplementationSemanticDocumentProjectionV2"
("implementationProjectId", "sourceHash");

CREATE INDEX "pi_semantic_projection_embedding_profile_idx"
ON "PaperImplementationSemanticDocumentProjectionV2"
("embeddingProfileId", "embeddingModel");

CREATE INDEX "pi_semantic_projection_vector_hnsw_idx"
ON "PaperImplementationSemanticDocumentProjectionV2"
USING hnsw ((("retrievalVector")::halfvec(3072)) halfvec_ip_ops)
WITH (m = 16, ef_construction = 64);

ALTER TABLE "PaperImplementationSemanticDocumentProjectionV2"
ADD CONSTRAINT "pi_semantic_projection_project_fkey"
FOREIGN KEY ("implementationProjectId")
REFERENCES "PaperImplementationProject"("id")
ON DELETE CASCADE
ON UPDATE RESTRICT;
