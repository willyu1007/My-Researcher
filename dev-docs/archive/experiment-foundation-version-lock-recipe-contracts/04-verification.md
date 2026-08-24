# 04 Verification

## Planned Checks
- Schema tests for required locks and hashes.
- Negative tests for draft execution, platform-private fields, and stale readiness.
- Contract review against materialization and sidecar consumers.

## Review Checklist
- [x] Locks are complete enough for sidecar traceability.
- [x] Locks are complete enough for materialization reproducibility.
- [x] Locks are not platform-specific.

## 2026-05-17 - Landing Verification
- Expected:
  - shared contract typecheck passes
  - schema tests pass, including version-lock/recipe negative boundary cases
  - governance sync/lint passes
  - `T-072` is `done`, `T-073` remains `planned`, and `T-043` remains `planned`
- Actual:
  - [pass] `pnpm --filter @paper-engineering-assistant/shared typecheck`
  - [pass] `pnpm --filter @paper-engineering-assistant/shared test`
  - [pass] shared test suite reports 64 passing tests
  - [pass] `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
  - [pass] `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
  - [pass] `git diff --check`

## 2026-05-17 - Post-review Boundary Verification
- Expected:
  - baseline implementation locks include runtime identity/hash
  - `RecipeDraft` rejects platform-private aliases
  - only `llm_fine_tuning` profiles can carry fine-tuning external lock refs
- Actual:
  - [pass] `pnpm --filter @paper-engineering-assistant/shared typecheck`
  - [pass] `pnpm --filter @paper-engineering-assistant/shared test`
  - [pass] shared test suite reports 64 passing tests
  - [pass] Fastify injection rejects `RecipeDraft.region`, `RecipeDraft.queue`, `RecipeDraft.provider`, and standard profiles carrying `fine_tuning_external_lock_refs`
  - [pass] `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
  - [pass] `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
  - [pass] `git diff --check`
