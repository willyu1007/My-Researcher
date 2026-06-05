# 00 Overview

## Status
- State: in-progress
- Origin: follow-up from T-120 LIT-0252 partial visual index verification.
- Next step: design the pgvector-backed retrieval architecture and migration plan before any schema or repository implementation.

## Goal
- Move literature retrieval toward a PostgreSQL-native vector retrieval design so future scaleout does not require a late disruptive migration.
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
- Define migration-only durable artifacts for backfill/quarantine evidence without making them stable runtime state.
- Define rollout/config boundaries so migration switches are finite-state and removable after stabilization.
- Define implementation phases so schema, small-scale validation, large-scale data migration, cutover acceptance, and cleanup are independently verifiable.
- Define repository/service changes needed for DB-side vector candidate selection.
- Define first-phase DB candidate window and service rerank boundary.
- Define verification gates for schema, migration, retrieval quality, and rollback.
- Define final cleanup gates so the migration ends without JSONB retrieval dual-track debt.
- Define final retrieval-vector field semantics so the stable schema does not reuse the legacy raw JSONB `vector` name.
- Record tradeoffs around dimension handling, profile compatibility, and hybrid reranking.

## Non-goals
- Do not implement the schema migration in this task package.
- Do not mutate production/default DB schema before a reviewed plan exists.
- Do not remove JSONB vectors before dual-read/rollback evidence exists.
- Do not leave JSONB retrieval storage, fallback, rollback flags, shadow-read harnesses, or compatibility tests in the stable/default-on terminal state.
- Do not leave migration-only backfill/quarantine tables, repositories, or services as stable runtime infrastructure after final cleanup.
- Do not leave migration-only rollout flags, shadow/canary/fallback switches, or explicit JSONB rollback controls in the stable terminal state.
- Do not rename the normalized pgvector field back to `vector` during final cleanup; `vector` refers to the legacy raw JSONB provider vector.
- Do not change literature collection, fulltext preprocessing, key-content extraction, or evidence activation semantics.
- Do not use OpenAI Vector Store as the primary retrieval SSOT.
- Do not combine large-scale data backfill with user-visible read-path cutover in the same implementation phase.

## Acceptance Criteria
- [ ] Current JSONB-vector retrieval bottleneck is documented with exact code/schema references.
- [ ] First-phase pgvector target architecture is documented, including extension, native column strategy, exact candidate-query shape, and known bottleneck.
- [ ] First-phase candidate window and rerank policy are documented with bounded defaults and parity evidence.
- [ ] Migration plan covers additive dual-write/backfill before cutover.
- [ ] Rollback plan preserves current JSONB vector retrieval.
- [ ] Final cleanup plan removes JSONB retrieval dual-track content after stable pgvector gates pass.
- [ ] Final cleanup plan removes or archives migration-only durable artifacts after they have served cutover verification.
- [ ] Final cleanup plan removes migration-only rollout/fallback/shadow/rollback configuration after stable pgvector proof.
- [ ] Final schema naming plan keeps normalized retrieval storage as `retrievalVector` and removes the legacy `vector Json` field.
- [ ] Implementation phase plan separates infrastructure, small-scale validation, large-scale migration, cutover acceptance, and final cleanup.
- [ ] Verification plan includes temporary-Postgres migration tests and retrieval parity tests.
- [ ] Governance sync/lint passes.
