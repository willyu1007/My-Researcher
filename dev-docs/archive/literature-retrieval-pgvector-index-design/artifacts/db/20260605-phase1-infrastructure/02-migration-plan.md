# 02 Migration Plan

## Apply Plan
1. Confirm target DB is the intended local/dev environment, not staging or production.
2. Confirm `pgvector` extension policy for the target environment.
3. Apply repo-prisma migration `20260605104000_add_literature_pgvector_phase1`.
4. Re-run DB context sync after successful apply if generated context changed.
5. Run a small post-apply smoke:
   - extension exists.
   - `"LiteratureEmbeddingChunk"."retrievalVector"` exists and is nullable.
   - backfill/quarantine tables exist.

## Rollback Plan
- Rollback is schema-only while no production backfill has been run:
  - drop `"LiteratureEmbeddingVectorQuarantineIssue"`.
  - drop `"LiteratureEmbeddingVectorBackfillRun"`.
  - drop `"LiteratureEmbeddingChunk"."retrievalVector"`.
- Do not drop the database-level `vector` extension unless the DB owner confirms no other object depends on it.

## Not In This Phase
- No active corpus backfill.
- No dual-write from the embedding write path.
- No shadow-read parity run.
- No canary/default pgvector retrieval.
- No JSONB vector cleanup.

## Approval Boundary
- This implementation prepares the migration artifacts.
- It does not apply the migration to the normal local dev DB without explicit approval.
