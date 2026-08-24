# 04 Verification

> Supersession (2026-07-12): the T-074 green results below are historical contract evidence. `accepted_partial` acceptance cannot satisfy current T-132 D-03b/D-16 productized gates and must be replaced, not retained as an alternate passing path.

## 2026-05-17 - T-074 landing verification
- Scope: result, evidence, evaluation fact, and paper sidecar shared contracts.
- Commands:
  - [pass] `pnpm --filter @paper-engineering-assistant/shared typecheck`
  - [pass] `pnpm --filter @paper-engineering-assistant/shared test`
  - [pass] `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
  - [pass] `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
  - [pass] `git diff --check`
- Result:
  - [pass] `ExperimentResult` / `FineTuningResult` packets carry task/materialization/run/version/config hashes and reject direct claim/table/leaderboard fields.
  - [pass] `ResultValidationReport` supports `valid | invalid | partial | accepted_partial`, with explicit partial acceptance required for `accepted_partial`.
  - [pass] `EvidenceCandidate` can only be created from `valid` or `accepted_partial` validation status.
  - [pass] `EvaluationFact`, `MetricObservation`, and `ComparisonObservation` require run/result/protocol/asset context.
  - [pass] `PaperExperimentSidecar` stores refs/locks/hashes/snapshots and rejects full reusable DTO copies.

## Planned Checks
- Negative tests for invalid result creating evidence.
- Negative tests for claim text in EvidenceCandidate.
- Negative tests for sidecar full DTO copies.

## Review Checklist
- [x] EvidenceCandidate has enough fields for downstream review.
- [x] Sidecar can answer traceability questions.
- [x] Evaluation facts do not become leaderboard rows.
