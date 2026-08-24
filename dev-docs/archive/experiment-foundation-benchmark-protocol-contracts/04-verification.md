# 04 Verification

## Planned Checks
- Schema tests for protocol hash/version requirements.
- Tests preventing baseline implementation fields from drifting into benchmark protocol ownership.
- Compatibility checks against existing research-argument baseline_set and readiness contracts.

## Review Checklist
- [x] Benchmark identity and evaluation rules are separate.
- [x] Baseline identity and implementation version are separate.
- [x] Protocol fields support result validation and paper sidecar locking.

## 2026-05-17 - Landing Verification
- Expected:
  - shared contract typecheck passes
  - schema tests pass, including benchmark/protocol/baseline negative boundary cases
  - governance sync/lint passes
  - `T-071` is `done`, `T-072` remains `planned`, and `T-043` remains `planned`
- Actual:
  - [pass] `pnpm --filter @paper-engineering-assistant/shared typecheck`
  - [pass] `pnpm --filter @paper-engineering-assistant/shared test`
  - [pass] shared test suite reports 57 passing tests
  - [pass] `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
  - [pass] `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`

## 2026-05-17 - Post-review Boundary Verification
- Expected:
  - `BaselineAsset` rejects protocol/evaluation protocol ownership variants.
  - `BenchmarkAsset` rejects baseline implementation ownership variants.
  - Existing canonical payloads and export checks still pass.
- Actual:
  - [pass] `pnpm --filter @paper-engineering-assistant/shared typecheck`
  - [pass] `pnpm --filter @paper-engineering-assistant/shared test`
  - [pass] shared test suite reports 57 passing tests.
  - [pass] Fastify injection check rejects `baseline.evaluation_protocol_refs`, `baseline.evaluation_protocol_id`, and `benchmark.baseline_implementation_version_id` with HTTP 400.
  - [pass] `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
  - [pass] `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
  - [pass] `git diff --check`
