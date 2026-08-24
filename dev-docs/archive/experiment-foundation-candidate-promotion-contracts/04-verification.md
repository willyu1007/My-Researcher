# 04 Verification

## 2026-05-18 - T-075 landing verification
- Scope: candidate payloads, triage reports, promotion request/result contracts, and canonical lifecycle guards.
- Post-review fixes:
  - [pass] DTO alias leakage such as `dataset_asset_dto`, `dataset_version`, `run_recipe_dto`, and `training_task_spec_dto` is explicitly rejected.
  - [pass] Promoted results with empty canonical version/protocol/policy refs are rejected.
- Commands:
  - [pass] `pnpm --filter @paper-engineering-assistant/shared typecheck`
  - [pass] `pnpm --filter @paper-engineering-assistant/shared test`
  - [pass] `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
  - [pass] `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
  - [pass] `git diff --check`
- Result:
  - [pass] candidate family schemas accept canonical grounded payloads.
  - [pass] auto-promotion rejects missing source/provenance, low confidence, high/restricted risk, unclear/restricted/forbidden policy, incomplete fields, and duplicate status.
  - [pass] candidate and promotion schemas reject execution, result, paper-claim, platform-private, and embedded canonical DTO fields.
  - [pass] canonical asset/protocol/method schemas explicitly reject candidate lifecycle fields.
  - [pass] product-layer implementation remains open for `T-076` and later tasks.

## Planned Checks
- Negative tests for ungrounded auto-promotion.
- Negative tests for missing license/policy/version/source refs.
- Duplicate check and risk classification tests.

## Review Checklist
- [x] Promotion outputs canonical refs, not partial asset blobs.
- [x] Candidate states cannot leak into canonical lifecycle.
- [x] High-risk candidates require review.
