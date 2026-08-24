# 04 Verification

## Planned Checks
- Shared contract typecheck and schema tests.
- Negative tests for `DatasetAsset` field leakage.
- Negative tests for mirror canonical drift and missing checksum source hash.

## Review Checklist
- [x] Dataset fields support RunRecipe locking.
- [x] Dataset fields support persistence without storing blobs.
- [x] Dataset fields support candidate promotion without canonical candidate state.
- [x] Dataset fields support LocalScript and Aliyun mirror materialization.

## 2026-05-17 - Landing Verification
- Expected:
  - shared contract typecheck passes
  - schema tests pass, including dataset negative boundary cases
  - governance sync/lint passes
  - `T-070` is `done`, `T-071` remains `planned`, and `T-043` remains `planned`
- Actual:
  - [pass] `pnpm --filter @paper-engineering-assistant/shared typecheck`
  - [pass] `pnpm --filter @paper-engineering-assistant/shared test`
  - [pass] `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
  - [pass] `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`

## 2026-05-17 - Post-review fix verification
- Expected:
  - `DatasetLocation` rejects locations without local or remote refs
  - `LocalFileRef.relative_path` rejects absolute and parent-traversal paths
  - shared typecheck/test pass
  - governance sync/lint pass
- Actual:
  - [pass] `pnpm --filter @paper-engineering-assistant/shared typecheck`
  - [pass] `pnpm --filter @paper-engineering-assistant/shared test`
  - [pass] shared test suite reports 52 passing tests
  - [pass] `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
  - [pass] `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
