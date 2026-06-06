# 03 Execution Log

## Preflight
- `node --check .ai/scripts/literature-pgvector-phase1-preflight.mjs`
  - Result: passed.
- `node .ai/scripts/literature-pgvector-phase1-preflight.mjs --dry-run`
  - Result: passed with `status: "dry_run"`.
- Disposable execute:
  - `DATABASE_URL=<temporary-postgres-url> node .ai/scripts/literature-pgvector-phase1-preflight.mjs --execute --database-is-disposable --allow-create-extension`
  - Result: passed.
  - Checks passed:
    - `pgvector_extension`
    - `vector_3072_ddl`
    - `vector_3072_insert`
    - `wrong_dimension_rejected`
    - `exact_inner_product_ordering`
    - `normalized_norm_check`
    - `backfill_write_norm_check`
  - Norm tolerance: `0.00001`.
  - Top candidate: `LIT-0252`, `EV-PARTIAL`, `visual-001`, `negative_inner_product: -1`.

## Schema
- `pnpm --filter @paper-engineering-assistant/backend prisma:format`
  - Result: passed.
- `pnpm --filter @paper-engineering-assistant/backend prisma:validate`
  - First run result: failed because `DATABASE_URL` was absent from the shell.
  - Rerun with placeholder `DATABASE_URL`: passed.
- `pnpm --filter @paper-engineering-assistant/backend prisma:generate`
  - Result: passed.
- `node .ai/scripts/ctl-db-ssot.mjs sync-to-context`
  - Result: passed.

## Backend Verification
- Targeted new tests:
  - `node --test --loader ts-node/esm src/services/literature-retrieval-vector-settings-service.unit.test.ts src/repositories/prisma/literature/prisma-literature-embedding-store.unit.test.ts`
  - Result: passed, `5/5`.
- Typecheck:
  - `DATABASE_URL=<placeholder> pnpm --filter @paper-engineering-assistant/backend typecheck`
  - Result: passed.
- Full backend test:
  - `DATABASE_URL=<placeholder> pnpm --filter @paper-engineering-assistant/backend test`
  - Result: failed due environment-triggered Prisma smoke/rollback tests.
  - Summary: `1205` tests, `1170` passed, `8` failed, `27` skipped.
  - Failure boundary:
    - Existing Prisma transaction rollback tests for v1b N4, N5, N6, N7, N8, and N10 attempted to connect to the placeholder database.
    - T-054 and T-067 Prisma HTTP smoke tests also attempted to connect to the placeholder database.
    - The shared error was user `placeholder` denied access to `my_researcher.public`.
  - Phase 1 targeted tests passed before this environment boundary.
