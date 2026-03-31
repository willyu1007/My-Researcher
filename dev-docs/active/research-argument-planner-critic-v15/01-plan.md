# 01 Plan

## Phases
1. Action space and bundle planning
2. CriticHub and deterministic rule checks
3. Risk report assembly and reviewer-facing output
4. Memory / stagnation / async orchestration
5. Verification and handoff

## Detailed steps
- Phase 1:
  - 固定 primitive operators、bundle shape、排序输入与 reason surface。
- Phase 2:
  - 固定 `GeneralReviewer / Novelty / Value / EvaluationFairness / Reproducibility / BoundaryRisk` critic split。
  - 固定 RuleEngine 的 deterministic checks。
- Phase 3:
  - 固定 `RiskReportAssembler` 的输入、输出与 `severity/detail/pointers` 结构。
  - 固定 risk report 对 `IssueFinding / ReportProjection / UI review surface` 的投影规则。
- Phase 4:
  - 固定 recent tabu memory、lesson priors、stagnation detection 与 task types。
  - 固定 retry/backoff、idempotency keys、error classes、rate limiting、API cost accounting、observability hooks。
- Phase 5:
  - 执行 targeted backend tests、observability checks、governance sync/lint。

## Entry criteria
- `T-025` 的 graph/state/read-model DTO 已冻结。
- `T-026` 的 readiness / decision / packet / report surfaces 已冻结。
- `T-027` 的 explainability 和 human-confirmation UX 约束已冻结。

## Exit review before umbrella close
- planner / critic / rule / risk-report 输出合同已冻结，且不会反向篡改 source-of-truth。
- async/API governance 约束已冻结，后续实现不需要重新拍板 queue/retry/idempotency/cost。
- 所有 advisory output 都已明确 human confirmation / citation / rule-check 的升级路径。
