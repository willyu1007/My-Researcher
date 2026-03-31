# 04 Verification

## Planned Checks
- Backend typecheck
- Backend targeted tests for repository, service, and read-model behavior
- Shared contract tests
- Prisma generate / schema validation
- DB context sync after schema changes
- Project governance sync and lint

## Executed Checks
- PASS: `pnpm --filter @paper-engineering-assistant/backend typecheck`
- PASS: `pnpm --filter @paper-engineering-assistant/backend test`
  - Result: `117` tests passed, `0` failed
- PASS: `pnpm --filter @paper-engineering-assistant/shared test`
  - Result: `19` tests passed, `0` failed
- PASS: T-025 scope scan for temporary test artifacts
  - Result: no repo-tracked temporary test outputs or scratch files found in `apps/backend` or `dev-docs/active/research-argument-graph-and-state-v1`
- PASS: repository-wide tracked artifact scan and cleanup
  - Result: removed raw Prisma smoke / CI logs plus machine-generated context-summary files from `dev-docs/archive/llm-research-lifecycle-governance-v1/artifacts/**`; retained markdown verification summaries and DB apply evidence docs
- PASS: `$env:DATABASE_URL='postgresql://user:pass@localhost:5432/paper_engineering'; pnpm --filter @paper-engineering-assistant/backend prisma:validate`
- PASS: `pnpm --filter @paper-engineering-assistant/backend prisma:generate`
  - Covered indirectly by backend `pretypecheck`, then re-run during verification as part of schema/client checks
- PASS: `node .ai/scripts/ctl-db-ssot.mjs sync-to-context`
  - Updated `docs/context/db/schema.json`
- PASS: `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
- PASS: `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`

## Review-Fix Checks
- PASS: in-memory repository test proves same `object_id` can exist in multiple branches without overwrite.
- PASS: in-memory repository test proves snapshot lookup uses `version` as a deterministic tiebreaker.
- PASS: service test proves `createBranch` initializes snapshot/projections for the new branch.
- PASS: service test proves recomputing an inactive branch does not clobber workspace-level active-branch summary state.
- PASS: service test proves switching `active_branch_id` rewires workspace summary/report pointers to the target branch surface.
- PASS: service test proves graph mutations reject mismatched `workspace_id` and `branch_id`.
- PASS: service test proves readiness projection exposes `run`, `artifact`, and `analysis_finding` pointers for downstream traceability.

## Pre-Handoff Review For `T-026` / `T-027`
- [x] `WorkspaceSummary`, `AbstractStateSnapshot`, coverage rows, readiness read model, and report projections are queryable.
- [x] Object ids, source refs, audit refs, and Git weak mapping refs are preserved end-to-end in T-025 storage and service flows.
- [x] Recompute semantics are synchronous and deterministic, so bridge and UI consumers do not depend on hidden background drift.
- [x] Unimplemented cross-machine sync or external-store behavior remains explicitly out of scope for T-025 rather than a silent gap.
