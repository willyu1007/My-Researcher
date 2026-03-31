# 04 Verification

## Planned checks
- targeted backend tests for planner / critic / memory
- idempotency and retry checks for async tasks
- governance sync/lint

## Executed checks
- Pending in current implementation pass.

## Pre-close review
- [ ] `PlannerCandidate` / `PlannerBundle` / `CriticFinding` / `RuleFinding` / `SubmissionRiskFinding` / `AsyncTaskRecord` 合同已冻结。
- [ ] `severity / detail / pointers` 与 UI review surface 对齐。
- [ ] async task taxonomy、retry/backoff、idempotency、error/cost/audit/observability 已收口。
- [ ] advisory-to-authority rule 已写清，避免 CriticHub 越权写入 source-of-truth。
