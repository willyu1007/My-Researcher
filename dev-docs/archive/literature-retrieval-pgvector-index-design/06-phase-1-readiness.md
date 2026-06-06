# 06 Phase 1 Readiness

## Conclusion
- Phase 1 infrastructure foundation has been implemented and verified as an infrastructure/preflight implementation only.
- This readiness decision does not approve large-scale backfill, user-visible pgvector reads, canary/default cutover, or final cleanup.
- User-visible `/literature/retrieve` MUST remain on the JSONB retrieval path throughout Phase 1.

## Finding Resolution

### F1 - Implementation Handoff Boundary
- Resolution: Phase 1 has a scoped handoff boundary.
- Allowed work:
  - pgvector capability preflight.
  - repo-prisma SSOT preparation for nullable `retrievalVector`.
  - repository-scoped raw SQL skeletons.
  - migration-only run/quarantine scaffolding.
  - rollout mode scaffolding defaulting to `jsonb_only`.
  - telemetry and validation helpers.
- Disallowed work:
  - active corpus backfill beyond representative preflight data.
  - user-visible pgvector retrieval.
  - automatic JSONB fallback outside canary.
  - cleanup of legacy JSONB vectors.

### F2 - Temporary Postgres Preflight Substrate
- Resolution: Phase 1 has an executable preflight entrypoint:
  - `.ai/scripts/literature-pgvector-phase1-preflight.mjs`
- Dry-run command:
  - `node .ai/scripts/literature-pgvector-phase1-preflight.mjs --dry-run`
- Execute command, only against a disposable database:
  - `DATABASE_URL=<throwaway-postgres-url> node .ai/scripts/literature-pgvector-phase1-preflight.mjs --execute --database-is-disposable --allow-create-extension`
- The execute path MUST NOT target the normal local dev DB, staging DB, or production DB.
- Passing evidence MUST include:
  - pgvector extension installed or created.
  - `vector(3072)` DDL succeeds.
  - 3072-dimensional inserts succeed.
  - wrong-dimension insert is rejected.
  - `vector_norm(...)` is near `1` for normalized storage.
  - `<#>` exact inner-product ordering returns the expected top candidate.
  - JSONB-to-normalized-vector backfill write stores a normalized `retrieval_vector`.

### F3 - Partial Index Semantics
- Resolution: Phase 1 pgvector SQL MUST query by service-resolved `eligibleEmbeddingVersionIds`.
- The pgvector repository method MUST NOT hard-code `status = 'INDEXED'`.
- `PARTIAL_INDEXED` active embedding versions such as `LIT-0252` MUST remain retrievable when their literature is evidence-ready and active.
- Phase 1 tests SHOULD include a candidate row with:
  - `literature_id = 'LIT-0252'`.
  - a partial active embedding version identifier.
  - 3072-dimensional normalized vector storage.

## Phase 1 Entry Checklist
- [x] T-121 task package exists and is registered as `T-121`.
- [x] Current JSONB retrieval bottleneck is documented.
- [x] Phase 1 storage/query/service boundaries are documented.
- [x] Phase 1 preflight script exists.
- [x] `PARTIAL_INDEXED` guardrail is documented.
- [x] Preflight script has been run against a disposable Postgres database with pgvector available.
- [x] Phase 1 implementation branch has applied only infrastructure changes.
- [x] User-visible retrieval remains JSONB after Phase 1 verification.

## Phase 1 Exit Evidence
- [x] `node .ai/scripts/literature-pgvector-phase1-preflight.mjs --dry-run` passes.
- [x] Disposable-DB preflight execute command returns `status: "passed"`.
- [x] Prisma schema validates after adding nullable `retrievalVector Unsupported("vector(3072)")?`.
- [x] DB context is regenerated with `node .ai/scripts/ctl-db-ssot.mjs sync-to-context` after schema changes.
- [x] Backend tests cover repository boundary behavior without exposing raw JSONB vectors to the pgvector service path.
- [x] Governance lint passes after final Phase 1 doc sync.

## Phase 1 Evidence
- Evidence root: `artifacts/db/20260605-phase1-infrastructure/`.
- Targeted Phase 1 tests passed, `5/5`.
- Backend typecheck passed.
- Full backend test has an environment-scoped caveat: existing Prisma smoke/rollback tests failed because the placeholder `DATABASE_URL` was not a migrated reachable database.
