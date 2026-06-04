# 01 Plan

## Phase 0 - Evidence Lock
- Status: completed.
- Record the current schema and retrieval facts:
  - `LiteratureEmbeddingChunk.vector` is `Json` in Prisma.
  - DB column type is `jsonb`.
  - `pg_extension` has no `vector` extension.
  - retrieval loads chunks through `listEmbeddingChunksByEmbeddingVersionIds`.
  - similarity is computed in `LiteratureRetrievalService.normalizedCosine`.

## Phase 1 - Target Architecture
- Status: planned.
- Decide the native vector storage shape:
  - recommended starting point: additive pgvector column on `LiteratureEmbeddingChunk`.
  - keep JSONB vector during migration for rollback and parity checks.
  - make the default literature embedding dimension explicit, currently 3072 for `text-embedding-3-large`.
- Decide index strategy:
  - HNSW or IVFFlat after measuring local corpus size and expected growth.
  - keep B-tree indexes for active version/literature/profile filtering.
  - use DB-side vector candidate selection before service-level hybrid rerank.
- Decide query shape:
  - prefilter by active embedding version/profile/status.
  - query native vector distance in Postgres.
  - return bounded top candidate chunks.
  - rerank in service with existing lexical/metadata/staleness/work-dedup logic.

## Phase 2 - Migration Design
- Status: planned.
- Additive migration:
  - install/enable `vector` extension.
  - add native vector column while retaining JSONB vector.
  - backfill native vectors from existing JSONB values.
  - validate dimensions and checksum parity.
- Write-path migration:
  - content-processing/indexing writes both JSONB and native vector during migration window.
  - fail fast when embedding dimension does not match the active native index dimension.
- Read-path migration:
  - keep old JSONB retrieval behind fallback/feature flag.
  - add pgvector retrieval repository method.
  - cut over only after parity and performance evidence.

## Phase 3 - Verification Design
- Status: planned.
- Temporary Postgres migration test:
  - create extension.
  - apply migration.
  - seed representative 3072-dimensional embeddings.
  - verify native vector backfill and index creation.
- Retrieval parity:
  - compare scoped and unscoped query results against current JSONB implementation on a fixed query set.
  - preserve evidence activation filtering.
  - preserve stale-warning behavior.
  - preserve same-work dedup behavior.
- Performance:
  - measure query path without loading all chunks.
  - assert max chunks loaded into Node stays bounded.

## Phase 4 - Implementation Handoff
- Status: planned.
- Convert design into an implementation task only after:
  - schema migration approach is approved.
  - rollback approach is documented.
  - temporary-Postgres verification harness is defined.
  - active embedding dimension policy is accepted.

## Acceptance Gates
- Gate A: design doc explains why current JSONB retrieval fails under scale.
- Gate B: pgvector schema and query shape are explicit enough for implementation.
- Gate C: additive migration preserves rollback.
- Gate D: retrieval parity and performance checks are defined before code changes.
- Gate E: governance sync/lint passes.
