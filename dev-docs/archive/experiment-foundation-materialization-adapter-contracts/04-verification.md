# 04 Verification

## 2026-05-17 - Post-review Boundary Fix Verification
- Scope: fixes for T-073 quality review findings.
- Commands:
  - [pass] `pnpm --filter @paper-engineering-assistant/shared typecheck`
  - [pass] `pnpm --filter @paper-engineering-assistant/shared test`
  - [pass] `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
  - [pass] `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
  - [pass] `git diff --check`
- Schema coverage:
  - [pass] mismatched platform/adapter pairs are rejected.
  - [pass] blocked materialization results can omit task spec and adapter metadata refs while carrying blockers.
  - [pass] materialized results still require task spec and adapter metadata refs/hashes.
  - [pass] stage event, cancellation, and partial result hook refs require `training_task_spec_hash`.

## 2026-05-17 - T-073 Landing Verification
- Scope: shared contract-only materialization and adapter-boundary slice.
- Commands:
  - [pass] `pnpm --filter @paper-engineering-assistant/shared typecheck`
  - [pass] `pnpm --filter @paper-engineering-assistant/shared test`
  - [pass] `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
  - [pass] `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
  - [pass] `git diff --check`
- Schema coverage:
  - [pass] canonical materialization request, standard/evaluation/fine-tuning task specs, fine-tuning task profile, adapter metadata ref, materialization result, stage event, cancellation request, and partial result ref.
  - [pass] stale/blocked/unknown `RunRecipe` cannot be materialized.
  - [pass] draft-shaped payload cannot replace `RunRecipe`.
  - [pass] missing recipe/runtime/config/task/materialization hashes are rejected.
  - [pass] platform-private fields and inline adapter payloads are rejected at request/spec/result/platform-ref/metadata-ref boundaries.
  - [pass] `llm_fine_tuning` requires `FineTuningTaskProfile`; non-fine-tuning specs reject it.

## Review Checklist
- [x] Materialization result has traceability back to RunRecipe.
- [x] Adapter metadata ref does not expose secrets.
- [x] TrainingTaskSpec remains normalized.
