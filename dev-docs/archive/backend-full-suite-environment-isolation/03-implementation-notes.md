# 03 Implementation Notes

## 2026-05-18 Intake
- Triggered by full backend suite failures after T-082 verification.
- Observed failures included shared title-card counts, PaperProject id drift, settings state leakage, auto-pull global rule leakage, and fulltext acquisition timing failures.
- Initial diagnosis points to `.env.local` forcing regular `buildApp()` tests onto Prisma repositories and a non-empty development DB.

## 2026-05-18 Fix
- Confirmed the migrated Prisma path itself was healthy by running the full backend suite against a disposable schema through `pnpm ci:prisma-smoke`.
- Updated `apps/backend/scripts/run-node-tests.mjs` to build a test-specific environment:
  - preserve `DATABASE_URL`;
  - remove repository strategy env vars so default app wiring uses memory repositories;
  - remove LLM provider API keys so settings and gateway tests do not depend on local secrets;
  - disable the auto-pull scheduler for default suite runs;
  - set `NODE_ENV=test` when unset.
- Added escape hatch `BACKEND_TEST_PRESERVE_REAL_ENV=1` for intentional debugging against the unsanitized shell environment.
- Replaced placeholder root `test` and broken root `typecheck` scripts with explicit monorepo aggregation:
  - `pnpm test` runs shared schema tests, then backend tests;
  - `pnpm typecheck` runs shared, backend, and desktop typechecks.
