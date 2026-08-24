-- T-130 W-03 (D6): ANN index for literature retrieval.
-- pgvector hnsw/ivfflat cap `vector` at 2000 dims; retrievalVector is vector(3072)
-- (text-embedding-3-large), so the index is built over a halfvec(3072) expression
-- (pgvector >= 0.7; dev has 0.8.1). The retrieval SQL casts both sides identically so the
-- planner matches this expression. Exact-scan baseline before this index (261,631 vectors):
-- Historical T-121 benchmark: p50 771ms / p95 806ms before the exact-index change.
-- NOTE: not CONCURRENTLY — Prisma migrations run inside a transaction; single-instance
-- deployment (D1 assumption) makes the build-time write pause acceptable. Recorded as a
-- deviation from D6's CONCURRENTLY preference in T-130 03.
CREATE INDEX "LiteratureEmbeddingChunk_retrievalVector_halfvec_hnsw_idx"
ON "LiteratureEmbeddingChunk"
USING hnsw ((("retrievalVector")::halfvec(3072)) halfvec_ip_ops)
WITH (m = 16, ef_construction = 64);
