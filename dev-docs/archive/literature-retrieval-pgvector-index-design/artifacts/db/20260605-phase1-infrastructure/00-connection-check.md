# 00 Connection Check

## Scope
- Task: `T-121`
- Phase: Phase 1 infrastructure foundation
- DB SSOT mode: `repo-prisma`
- Normal dev/staging/prod DB migration apply: not executed.
- Disposable Postgres preflight: executed against a temporary database and cleaned up by `dropdb`.

## Result
- Status: passed for disposable preflight.
- The preflight script created or confirmed the database-level `vector` extension only in the disposable database.
- The execute path used `--database-is-disposable` and `--allow-create-extension`.
- No Phase 1 command applied the migration to the default local dev database.

## Evidence
- Command:
  - `DATABASE_URL=<temporary-postgres-url> node .ai/scripts/literature-pgvector-phase1-preflight.mjs --execute --database-is-disposable --allow-create-extension`
- Observed result:
  - `status: "passed"`
  - `schema_retained: false`
  - `extension_created_by_script: true`
  - `schema: "t121_pgvector_preflight_20260605104857"`

## Boundary
- This proves local pgvector capability for a disposable substrate.
- It does not approve normal DB migration apply, corpus backfill, shadow reads, canary, or user-visible pgvector retrieval.
