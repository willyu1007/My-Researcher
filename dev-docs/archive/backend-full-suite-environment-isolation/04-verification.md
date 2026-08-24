# 04 Verification

## 2026-05-18 Initial Failure
- Command:
  ```bash
  cd apps/backend
  set -a
  . ../../.env.local
  set +a
  pnpm test
  ```
- Result: failed outside the T-082 surface.
- Representative failures:
  - title-card demo data default test saw existing DB rows;
  - auto-pull last active global rule test saw additional active global rules;
  - settings tests saw persisted real settings;
  - fulltext acquisition tests failed or timed out;
  - PaperProject id expected `P001` but real DB sequence/state returned a later id.

## 2026-05-18 Baseline Isolated Prisma Smoke
- Command:
  ```bash
  pnpm ci:prisma-smoke -- --base-url "$(sed -n 's/^DATABASE_URL=//p' .env.local)" --schema-prefix t083_baseline --artifacts-dir .ai/.tmp/prisma-smoke-t083-baseline
  ```
- Result: pass.
- Evidence:
  - Artifact: `.ai/.tmp/prisma-smoke-t083-baseline/20260518-101041/90-summary.json`
  - Backend tests: 524 tests, 523 pass, 1 skipped, 0 fail.
  - Disposable schema was dropped successfully.

## 2026-05-18 Full Suite With `.env.local`
- Command:
  ```bash
  cd apps/backend
  set -a
  . ../../.env.local
  set +a
  pnpm test
  ```
- Result: pass.
- Evidence:
  - Backend tests: 524 tests, 523 pass, 1 skipped, 0 fail.

## 2026-05-18 Post-fix Isolated Prisma Smoke
- Command:
  ```bash
  pnpm ci:prisma-smoke -- --base-url "$(sed -n 's/^DATABASE_URL=//p' .env.local)" --schema-prefix t083_after_runner --artifacts-dir .ai/.tmp/prisma-smoke-t083-after-runner
  ```
- Result: pass.
- Evidence:
  - Artifact: `.ai/.tmp/prisma-smoke-t083-after-runner/20260518-101502`
  - Backend tests: 524 tests, 523 pass, 1 skipped, 0 fail.
  - Disposable schema was dropped successfully.

## 2026-05-18 Package Checks
- `pnpm --filter @paper-engineering-assistant/backend typecheck`: pass.
- `pnpm --filter @paper-engineering-assistant/shared test`: pass, 91 tests.
- `pnpm --filter @paper-engineering-assistant/shared typecheck`: pass.
- `pnpm --filter @paper-engineering-assistant/desktop typecheck`: pass.
- `pnpm typecheck`: pass after replacing the broken root `tsc --noEmit` placeholder with package aggregation.

## 2026-05-18 Root Full Suite With `.env.local`
- Command:
  ```bash
  set -a
  . ./.env.local
  set +a
  pnpm test
  ```
- Result: pass.
- Evidence:
  - Shared tests: 91 tests, 91 pass.
  - Backend tests: 524 tests, 523 pass, 1 skipped, 0 fail.
