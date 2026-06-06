# Target DB Apply Gate

## Decision
- The persistent local/dev DB migration apply remains blocked until the user explicitly approves the target.
- Disposable Phase 1 migration evidence is not permission to mutate the normal local dev DB.
- Staging and production are outside Phase 2 scope.

## Approval Record
Before applying the additive migration, record:
- approver.
- approval timestamp.
- target environment: `local` or `dev`.
- target DB reference name, not a raw secret.
- migration id: `20260605104000_add_literature_pgvector_phase1`.
- rollback expectation: explicit JSONB read path remains user-visible; additive schema is retained for repair unless a separate rollback task is approved.

## Apply Preconditions
- Working tree scope for T-121 is understood and no unrelated schema changes are included.
- `prisma/schema.prisma` validates.
- `docs/context/db/schema.json` is in sync with the repo-prisma SSOT.
- Target DB is reachable and confirmed to be local/dev.
- Backup/snapshot policy for the target local/dev DB is accepted by the operator.

## Post-Apply Smoke Checks
After explicit approval and apply, record:
- migration history includes `20260605104000_add_literature_pgvector_phase1`.
- `pg_extension` contains `vector`.
- `LiteratureEmbeddingChunk.retrievalVector` exists with `vector(3072)`.
- `LiteratureEmbeddingVectorBackfillRun` table exists.
- `LiteratureEmbeddingVectorQuarantineIssue` table exists.
- existing JSONB `LiteratureEmbeddingChunk.vector` remains present.
- user-visible retrieval mode remains `jsonb_only`.

## Evidence File
- Record the approval and post-apply smoke in:
  - `artifacts/db/20260605-phase2-readiness/target-db-apply-log.md`
- Do not create this file with a passing status until the approved apply has actually run.

## Blockers
- Missing explicit target approval blocks Phase 2 execution.
- A target that is not local/dev blocks Phase 2 execution.
- Post-apply smoke failure blocks sample backfill and shadow parity.
