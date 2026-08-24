# 04 Verification

## 2026-05-18 - Post-review hardening verification
- [pass] `pnpm --filter @paper-engineering-assistant/backend typecheck`
- [pass] `node --test --loader ts-node/esm src/services/experiment-foundation-execution-service.unit.test.ts` from `apps/backend`
  - Covers asynchronous LocalScript submit/sync/collect, true cancel of a long-running process, cancel idempotency, Aliyun mirror dataset-version mismatch rejection, protocol-backed validation facts, and in-memory repository `AppError` mapping.
- [pass] `git diff --check`
- [blocked external] `pnpm --filter @paper-engineering-assistant/backend test`
  - Result remains 507 pass, 2 fail, 1 skipped.
  - Blocker remains existing Prisma smoke tests `T-054` / `T-067` requiring `DATABASE_URL` and a migrated Postgres DB; T-077 focused tests passed.

## 2026-05-18 - T-077 landing verification
- [pass] `pnpm --filter @paper-engineering-assistant/shared typecheck`
- [pass] `pnpm --filter @paper-engineering-assistant/shared test`
- [pass] `pnpm --filter @paper-engineering-assistant/backend prisma:format`
- [pass] `DATABASE_URL='postgresql://user:pass@localhost:5432/paper_engineering_assistant' pnpm --filter @paper-engineering-assistant/backend prisma:validate`
  - Dummy URL used only because Prisma validate requires `DATABASE_URL` to parse the repo schema; no live DB migration was applied.
- [pass] `pnpm --filter @paper-engineering-assistant/backend prisma:generate`
- [pass] `node .ai/scripts/ctl-db-ssot.mjs sync-to-context`
- [pass] `pnpm --filter @paper-engineering-assistant/backend typecheck`
- [pass] `node --test --loader ts-node/esm src/services/experiment-foundation-execution-service.unit.test.ts` from `apps/backend`
- [pass] `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
- [pass] `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- [blocked external] `pnpm --filter @paper-engineering-assistant/backend test`
  - Result: 507 pass, 2 fail, 1 skipped.
  - Blocker: existing Prisma smoke tests `T-054` / `T-067` require a real `DATABASE_URL` and migrated Postgres DB. T-077 intentionally generated repo migration only and did not apply live DB migrations.
- [pass] `git diff --check`

## Acceptance
- [pass] LocalScript submit/sync/cancel/collect path creates jobs, stage events, adapter metadata refs, partial result refs, result validation, and eligible evidence candidates.
- [pass] LocalScript rejects missing readiness and disallowed commands.
- [pass] Submit idempotency returns the existing job for the same task/materialization and returns `VERSION_CONFLICT` for mismatched reuse.
- [pass] Mock Aliyun submit consumes dataset-version-matched ready/fresh mirrors and rejects stale or mismatched mirrors.
- [pass] Mock Aliyun submit rejects restricted/approval-required policy without approval refs.
- [pass] Route smoke covers submit/read/list/sync/cancel/collect plus malformed payload `INVALID_PAYLOAD`.
- [pass] Shared schemas reject missing hashes, private platform/adapter fields, inline adapter payloads, and invalid external job status.

## Closure Checklist
- [x] No cloud credentials required for LocalScript smoke.
- [x] Aliyun credentials remain behind auth refs.
- [x] Collected outputs satisfy result contracts and generate protocol-backed facts.
