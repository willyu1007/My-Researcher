# 00 Overview

## Status
- State: done
- Archived: 2026-06-06
- Origin: follow-up from T-120 LIT-0252 partial visual index verification.
- Phase 1 status: infrastructure foundation implemented and verified against disposable pgvector preflight.
- Phase 2 status: completed on the approved local target with sample backfill execute, `shadow_pgvector` parity, and final verification `PASS`.
- Phase 3 status: broad local backfill completed on the approved local target with final verification `PASS`; public retrieval remains `jsonb_only`.
- Phase 4 status: approved local target cutover executed through `shadow_pgvector -> pgvector_canary -> pgvector_default`; rollback drill and stable/default audit now pass on the approved local target.
- Phase 5 status: code/schema cleanup and post-cleanup residue audit completed; destructive DB cleanup and obsolete rollout-setting cleanup migrations applied successfully on the approved local target.
- Next step: archived historical reference; future pgvector tuning or production-target rollout work must use a new task package with its own target approval.
- Phase 1 boundary: implementation does not approve large-scale backfill, read-path cutover, or cleanup.
- Phase 2 boundary: target schema apply is approved only for the recorded local target; sample backfill execution remains sample-scoped and approval-gated by the runner; public pgvector reads, large-scale backfill, staging/prod mutation, and cleanup remain out of scope.

## Goal
- Move literature retrieval toward a PostgreSQL-native vector retrieval design so future scaleout does not require a late disruptive migration.
- Replace the current all-active-chunks JSONB vector load pattern with a bounded retrieval path.
- Preserve the existing literature pipeline semantics:
  - active embedding versions remain the retrieval authority.
  - evidence activation gates remain enforced.
  - stale-index warnings remain visible.
  - partial visual indexes such as `LIT-0252` remain distinguishable from standard `INDEXED` completion.

## Current Finding
- Original discovery found `LiteratureEmbeddingChunk.vector` stored as Prisma `Json`/physical `jsonb`, with unbounded TypeScript cosine reranking as the public retrieval bottleneck.
- Approved local Phase 2 target installed `vector` and added `retrievalVector vector(3072)`; see `artifacts/db/20260605-phase2-readiness/target-db-apply-log.md`.
- Phase 3 backfilled native retrieval vectors for the approved local corpus.
- Phase 4 promoted public retrieval through `shadow_pgvector`, `pgvector_canary`, and `pgvector_default`.
- Phase 5 made pgvector the single stable retrieval path:
  - public retrieval resolves active embedding versions and asks the DB for bounded native-vector candidates.
  - service-layer rerank/cap semantics remain intact.
  - the legacy JSONB `vector` column and migration-only backfill/quarantine tables are removed on the approved local target.
  - obsolete rollout setting state is removed by `20260606100000_remove_literature_retrieval_rollout_setting`.
- Post-cleanup audit found no active backend/schema/package/script dual-track runtime; historical task logs still mention prior phase modes as evidence.

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
- Define Phase 2 implementation-readiness contracts for target DB apply, sample workset, shadow query set, shadow artifact schema, stale/cap ordering, and backfill runner behavior.
- Define Phase 3 implementation-readiness findings for large-scale backfill, dual-write, activation blocking, full-corpus coverage, target approval, and recovery evidence.
- Define Phase 4 implementation-readiness findings for public read-path cutover, canary fallback evidence, promotion gates, and stable/default audit.

## Non-goals
- Do not apply the schema migration to any persistent DB other than the approved local target without explicit approval.
- Do not mutate production/default DB schema before a reviewed apply plan exists.
- Do not remove JSONB vectors before dual-read/rollback evidence exists.
- Do not leave JSONB retrieval storage, fallback, rollback flags, shadow-read harnesses, or compatibility tests in the stable/default-on terminal state.
- Do not leave migration-only backfill/quarantine tables, repositories, or services as stable runtime infrastructure after final cleanup.
- Do not leave migration-only rollout flags, shadow/canary/fallback switches, or explicit JSONB rollback controls in the stable terminal state.
- Do not rename the normalized pgvector field back to `vector` during final cleanup; `vector` refers to the legacy raw JSONB provider vector.
- Do not change literature collection, fulltext preprocessing, key-content extraction, or evidence activation semantics.
- Do not use OpenAI Vector Store as the primary retrieval SSOT.
- Do not combine large-scale data backfill with user-visible read-path cutover in the same implementation phase.
- Do not run the Phase 1 pgvector preflight against the normal local dev DB, staging DB, or production DB; it may create the database-level `vector` extension.
- Do not begin Phase 2 sample backfill or `shadow_pgvector` execution on any target before its persistent local/dev DB apply gate is explicitly approved and post-smoked.
- Do not expose Phase 2 shadow telemetry through public literature retrieve responses.
- Do not treat Phase 2 sample-corpus parity as approval for large-scale backfill, canary/default pgvector reads, staging/prod migration, or cleanup.
- Do not begin Phase 3 large-scale backfill execution without the Phase 3 runner target approval gate, reviewed workset, and reviewed dry-run artifact.
- Do not begin Phase 4 public read-path cutover until the new Phase 4 evidence and promotion-decision artifacts pass on the approved target and the controlled `apply-promotion` gate is deliberately executed.

## Acceptance Criteria
- [x] Current JSONB-vector retrieval bottleneck is documented with exact code/schema references.
- [x] First-phase pgvector target architecture is documented, including extension, native column strategy, exact candidate-query shape, and known bottleneck.
- [x] First-phase candidate window and rerank policy are documented with bounded defaults and parity evidence.
- [x] Migration plan covers additive dual-write/backfill before cutover.
- [x] Rollback plan preserves current JSONB vector retrieval.
- [x] Final cleanup plan removes JSONB retrieval dual-track content after stable pgvector gates pass.
- [x] Final cleanup plan removes or archives migration-only durable artifacts after they have served cutover verification.
- [x] Final cleanup plan removes migration-only rollout/fallback/shadow/rollback configuration after stable pgvector proof.
- [x] Final schema naming plan keeps normalized retrieval storage as `retrievalVector` and removes the legacy `vector Json` field.
- [x] Implementation phase plan separates infrastructure, small-scale validation, large-scale migration, cutover acceptance, and final cleanup.
- [x] Verification plan includes temporary-Postgres migration tests and retrieval parity tests.
- [x] Governance sync/lint passes.
- [x] Phase 2 readiness findings are resolved with explicit target DB gate, sample workset, shadow query set, artifact schema, shadow boundary, stale/cap ordering, and backfill runner contracts.
- [x] Repository candidate query contract requires service-resolved `eligibleEmbeddingVersionIds` before DB-side per-literature capping.
- [x] Phase 2 sample execution passes coverage, quarantine, score drift, topK overlap, and candidate-limit gates on the approved local target.
- [x] Phase 3 readiness review records implementation blockers before large-scale migration execution.
- [x] Phase 3 readiness findings F1-F5 are resolved with implementation and regression tests.
- [x] Phase 4 readiness review records implementation blockers before public read-path cutover.
- [x] Phase 4 readiness findings F1-F6 are implemented with service tests and an approval-gated Phase 4 runner command.
- [x] Phase 5 readiness review records implementation blockers before legacy cleanup.
- [x] Phase 5 code/schema cleanup removes JSONB retrieval runtime, rollout controls, migration runners, raw JSONB chunk-vector domain dependence, and migration-only backfill/quarantine contracts.
- [x] Phase 5 destructive DB cleanup migration is explicitly approved and applied on the target DB.
- [x] Phase 5 post-cleanup residue audit removes obsolete rollout setting state, stale runner writes, and temporary `.ai/.tmp` artifacts.
