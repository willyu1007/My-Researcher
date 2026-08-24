# 01 Plan

## Phase 1 - Failure Classification
- Reproduce the suite failures under the current `.env.local`.
- Classify each failure as shared DB state, environment variable leakage, network/background job timing, or product-code defect.
- Result: failures were environment leakage, not product contract failures. A clean isolated Prisma schema passed before code changes.

## Phase 2 - Test Runner Isolation
- Adjust the backend test entry point so the default full suite uses deterministic memory repositories.
- Keep `DATABASE_URL` available for explicit Prisma smoke subtests, but do not let `.env.local` repository strategy variables force every `buildApp()` call onto a shared DB.
- Result: `apps/backend/scripts/run-node-tests.mjs` now sanitizes repository strategy env vars and provider API keys by default while preserving `DATABASE_URL`.

## Phase 3 - Targeted Fixes
- Fix remaining tests that depend on shared settings, background jobs, or network state.
- Prefer deterministic mocks and per-test in-memory repositories.
- Result: no test body weakening was needed. The runner disables auto-pull scheduler by default for full-suite execution.

## Phase 4 - Verification
- Run targeted failing tests.
- Run full backend suite.
- Run isolated Prisma smoke if the full suite no longer includes a migrated disposable schema by default.
- Run backend typecheck, governance sync/lint, and whitespace checks.
- Result: completed; see `04-verification.md`.
