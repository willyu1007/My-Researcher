# 00 Overview

## Status
- State: in-progress
- Origin: follow-up from T-120 LIT-0252 partial visual index verification.
- Next step: design the pgvector-backed retrieval architecture and migration plan before any schema or repository implementation.

## Goal
- Move literature retrieval toward a PostgreSQL-native vector index design so future scaleout does not require a late disruptive migration.
- Replace the current all-active-chunks JSONB vector load pattern with a bounded retrieval path.
- Preserve the existing literature pipeline semantics:
  - active embedding versions remain the retrieval authority.
  - evidence activation gates remain enforced.
  - stale-index warnings remain visible.
  - partial visual indexes such as `LIT-0252` remain distinguishable from standard `INDEXED` completion.

## Current Finding
- Current schema stores `LiteratureEmbeddingChunk.vector` as Prisma `Json`; the physical DB column is `jsonb`.
- Current database has no `vector` extension installed.
- Current retrieval path:
  - resolves active embedding versions.
  - loads all matching chunks through Prisma `findMany`.
  - computes cosine similarity in TypeScript.
- Unscoped `/literature/retrieve` can fail at the Prisma read boundary after attempting to load all active chunks and 3072-dimensional JSONB vectors at once.
- Scoped retrieval for `LIT-0252` succeeds, which isolates the problem to unbounded retrieval scale rather than the partial visual index itself.

## Scope
- Design pgvector adoption for literature embeddings.
- Define migration strategy from JSONB vectors to native vector storage.
- Define repository/service changes needed for DB-side vector candidate selection.
- Define verification gates for schema, migration, retrieval quality, and rollback.
- Record tradeoffs around dimension handling, profile compatibility, and hybrid reranking.

## Non-goals
- Do not implement the schema migration in this task package.
- Do not mutate production/default DB schema before a reviewed plan exists.
- Do not remove JSONB vectors until dual-read/rollback evidence exists.
- Do not change literature collection, fulltext preprocessing, key-content extraction, or evidence activation semantics.
- Do not use OpenAI Vector Store as the primary retrieval SSOT.

## Acceptance Criteria
- [ ] Current JSONB-vector retrieval bottleneck is documented with exact code/schema references.
- [ ] pgvector target architecture is documented, including extension, column/index strategy, and query shape.
- [ ] Migration plan covers additive dual-write/backfill before cutover.
- [ ] Rollback plan preserves current JSONB vector retrieval.
- [ ] Verification plan includes temporary-Postgres migration tests and retrieval parity tests.
- [ ] Governance sync/lint passes.
