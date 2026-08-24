# 04 Verification

## Planned Verification
### Baseline checks
- `pnpm --filter @paper-engineering-assistant/shared typecheck`
- `pnpm --filter @paper-engineering-assistant/shared test`
- `pnpm --filter @paper-engineering-assistant/backend typecheck`
- targeted experiment foundation backend route/service tests
- `pnpm --filter @paper-engineering-assistant/desktop typecheck`

### Capability validation checks
- backend scenario test suite for registry/readiness/promotion/execution/result/evidence paths
- LocalScript safe execution suite
- mocked Aliyun mirror/policy/checksum suite
- result/evidence/sidecar robustness suite
- adjacent workflow no-copy/no-second-track suite
- desktop smoke/e2e for `实验基座` operator workflow

### Optional environment checks
- Prisma/live DB smoke with `DATABASE_URL` and migrated test DB
- browser/manual smoke only when the desktop dev environment is available

### Governance
- `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
- `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- `git diff --check`

## Creation Verification - 2026-05-19
- [pass] `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
  - Result: registered `T-090 experiment-foundation-capability-validation` and regenerated project derived views.
- [pass] registry mapping corrected to `M-001 > F-001 > R-012 > T-090`, then sync regenerated derived views.
- [pass] `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
  - Result: project governance lint passed.
- [pass] `git diff --check`
  - Result: no whitespace errors in current diff.

## Test Matrix Sync - 2026-05-20
- [pass] `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
- [pass] `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- [pass] `git diff --check`

## Harness / Fixture Design Sync - 2026-05-20
- [pass] `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
- [pass] `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- [pass] `git diff --check`

## Critical-node Deep-test Sync - 2026-05-20
- [pass] `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
- [pass] `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- [pass] `git diff --check`

## Minimal Harness Vertical Slice - 2026-05-23
- [pass] `pnpm --filter @paper-engineering-assistant/backend typecheck`
  - Result: backend TypeScript compile passed after replacing a readonly fixture tuple with the shared mutable contract type.
- [pass] `node --test --loader ts-node/esm src/services/experiment-foundation-capability-harness.test.ts` from `apps/backend`
  - Result: the new route-level capability harness test passed.
  - Covered: registry create/list, dataset/task readiness, submit gate failure before readiness, LocalScript submit, repeat submit idempotency, idempotency conflict, sync, collect, evidence refs, no inline adapter metadata, and generic registry job-write rejection.
- [blocked] `pnpm --filter @paper-engineering-assistant/backend test`
  - Result: the new harness test was included and passed, but the full default backend run is currently blocked by existing opt-in Prisma HTTP smoke tests that require `DATABASE_URL` (`T-054` v1b and `T-067` v1c).
  - T-090 follow-up: keep live DB coverage opt-in as planned; do not make T-090 default local validation depend on a live database.
- [pass] `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
- [pass] `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- [pass] `git diff --check`

## Harness Hardening and Candidate Promotion Slice - 2026-05-23
- [pass] `pnpm --filter @paper-engineering-assistant/backend typecheck`
  - Result: backend TypeScript compile passed with scenario-id fixtures and promotion builders.
- [pass] `node --test --loader ts-node/esm src/services/experiment-foundation-capability-harness.test.ts` from `apps/backend`
  - Result: both route-level capability harness tests passed.
  - Covered new checks: configurable sync wait, construction-failure-safe cleanup structure, per-scenario fixture ids, successful candidate promotion, low-confidence and duplicate gate failures, and missing canonical ref handling.

## Mocked Aliyun Boundary Slice - 2026-05-23
- [pass] `node --test --loader ts-node/esm src/services/experiment-foundation-capability-harness.test.ts` from `apps/backend`
  - Result: all three route-level capability harness tests passed.
  - Covered new checks: mocked Aliyun submit success, credential/private-payload-free job surface, missing mirror gate failure, stale mirror gate failure, checksum mismatch gate failure, restricted approval-required policy gate failure, and `training_task_spec` private platform field schema rejection.
- [pass] `pnpm --filter @paper-engineering-assistant/backend typecheck`
  - Result: backend TypeScript compile passed after tightening harness `inject()` response typing.

## Result / Evidence / Sidecar Boundary Slice - 2026-05-23
- [pass] `node --test --loader ts-node/esm src/services/experiment-foundation-capability-harness.test.ts` from `apps/backend`
  - Result: all four route-level capability harness tests passed.
  - Covered new checks: collect-created result/validation/evidence refs, no claim/table leakage in result/evidence payloads, rejected result claim fields, rejected invalid evidence validation status, successful paper sidecar ref/hash persistence, rejected sidecar full DTO copy, failed-run partial validation, and no evidence candidate for partial validation.
- [pass] `pnpm --filter @paper-engineering-assistant/backend typecheck`
  - Result: backend TypeScript compile passed with the result/evidence/sidecar harness additions.

## Adjacent-flow No-copy Robustness Slice - 2026-05-24
- [pass] `node --test --loader ts-node/esm src/services/paper-implementation-workorder-experiment-bridge-service.unit.test.ts` from `apps/backend`
  - Result: all nine workorder bridge unit tests passed.
  - Covered new checks: `experiment_bridge` rejects copied `run_recipe`, `raw_payload` rejects nested copied `experiment_result`, `raw_payload` rejects `claim_text`, and lightweight refs/hashes still pass.
- [pass] `node --test --loader ts-node/esm src/services/experiment-foundation-capability-harness.test.ts` from `apps/backend`
  - Result: all four experiment-foundation capability harness tests still passed after adjacent-flow guard changes.
- [pass] `pnpm --filter @paper-engineering-assistant/backend typecheck`
  - Result: backend TypeScript compile passed with the adjacent-flow guard implementation.
- [pass] `env -u DATABASE_URL pnpm --filter @paper-engineering-assistant/backend test`
  - Result: full backend test suite passed through the default backend test runner after local env loading was aligned.
  - Summary: 772 tests, 771 passed, 1 skipped.
  - Covered: experiment-foundation harness tests plus existing backend memory and Prisma-backed suites using root `.env.local` for local `DATABASE_URL`.

## Desktop Smoke Slice - 2026-05-24
- [pass] `pnpm --filter @paper-engineering-assistant/desktop smoke:e2e`
  - Result: desktop smoke passed in backend memory mode and desktop dev mode.
  - Covered new checks: `实验基座` nav/mount source checks, renderer API client uses `/experiment-foundation/**` through `requestGovernance`, renderer boundary rejects backend/materialization ownership markers, registry create/list, readiness check/latest, and execution jobs list.
  - Note: the script intentionally terminates the dev server after the smoke; pnpm prints the child `SIGTERM` status while the smoke command itself exits 0.
- [pass] `pnpm --filter @paper-engineering-assistant/desktop typecheck`
- [pass] `pnpm --filter @paper-engineering-assistant/desktop build`
  - Result: build completed; generated renderer dist hash output was restored because build artifacts are verification output, not T-090 source changes.
- [pass] `node --test --loader ts-node/esm src/services/experiment-foundation-capability-harness.test.ts` from `apps/backend`
  - Result: backend capability harness still passed after the desktop smoke change.

## Closure Verification - 2026-05-24
- [pass] `pnpm --filter @paper-engineering-assistant/shared typecheck`
- [pass] `pnpm --filter @paper-engineering-assistant/shared test`
  - Result: 160 shared schema/barrel tests passed.
- [pass] `pnpm --filter @paper-engineering-assistant/backend typecheck`
  - Result: backend TypeScript compile passed.
- [pass] targeted backend tests listed above for experiment-foundation capability harness and adjacent workorder bridge.
- [pass] desktop checks listed above for typecheck, build, and smoke.
- [pass] `env -u DATABASE_URL pnpm --filter @paper-engineering-assistant/backend test`
  - Result: default backend test runner now loads repo-local `.env.local` and the full suite passed without shell-sourced `DATABASE_URL`.
  - Summary: 772 tests, 771 passed, 1 skipped.
