# 04 Verification

## Planned Checks
- DB SSOT diff and sync-to-context after schema changes.
- Backend typecheck and service/repository/API tests.
- Readiness blocker tests for incomplete and stale assets.

## Review Checklist
- [x] Services return domain/API DTOs.
- [x] Prisma does not leak into business layer.
- [x] APIs do not expose secrets or adapter-private payloads.

## 2026-05-18 Verification
- `pnpm --filter @paper-engineering-assistant/shared typecheck`
  - Result: pass.
- `pnpm --filter @paper-engineering-assistant/shared test`
  - Result: pass, 89 tests.
- `pnpm --filter @paper-engineering-assistant/backend prisma:format`
  - Result: pass.
- `pnpm --filter @paper-engineering-assistant/backend prisma:validate`
  - Result: initial run failed because shell had no `DATABASE_URL`; rerun with a dummy Postgres URL passed. This did not connect to or migrate a live database.
- `pnpm --filter @paper-engineering-assistant/backend prisma:generate`
  - Result: pass with dummy Postgres URL.
- `node .ai/scripts/ctl-db-ssot.mjs sync-to-context`
  - Result: pass; `docs/context/db/schema.json` refreshed.
- `pnpm --filter @paper-engineering-assistant/backend typecheck`
  - Result: pass with dummy Postgres URL for Prisma generate.
- `cd apps/backend && node --test --loader ts-node/esm src/services/experiment-foundation-service.unit.test.ts`
  - Result: pass, 7 tests covering in-memory repository, service schema gates, readiness blockers, promotion gates, and routes.
- `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
  - Result: pass; project registry and derived views refreshed with `T-076=done`, `T-077=planned`, and `T-043=planned`.
- `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
  - Result: pass.
- `git diff --check`
  - Result: pass.
- `pnpm --filter @paper-engineering-assistant/backend test`
  - Result: blocked by existing Prisma smoke tests `T-054` and `T-067`, which require a reachable live `DATABASE_URL` with repo migrations applied. This task intentionally did not apply live migrations, so the full suite cannot pass in the current shell without using a migrated development database.

## Acceptance Notes
- The T-076-specific backend test target passed.
- Full backend suite failure is environmental and pre-existing to this slice: both failing tests are unrelated Prisma HTTP smoke gates requiring live DB connectivity.
- No command applied the new migration to a live database.

## 2026-05-18 Post-Review Fix Verification
- `cd apps/backend && node --test --loader ts-node/esm src/services/experiment-foundation-service.unit.test.ts`
  - Result: pass, 10 tests. Added coverage for candidate ref/family drift rejection, in-memory promotion rollback, and Prisma `P2002` mapping to `VERSION_CONFLICT`.
- `DATABASE_URL='postgresql://user:pass@127.0.0.1:5432/postgres?schema=public' pnpm --filter @paper-engineering-assistant/backend typecheck`
  - Result: pass. Dummy URL was only used for Prisma client generation/typecheck and did not apply migrations.
- `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
  - Result: pass.
- `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
  - Result: pass.
- `git diff --check`
  - Result: pass.
