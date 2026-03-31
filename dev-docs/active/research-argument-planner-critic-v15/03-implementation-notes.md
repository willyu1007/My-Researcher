# 03 Implementation Notes

## Initial decisions
- 决定把 planner / critic 放在单独的 V1.5 任务，而不是塞进 V1 graph/state。
- 决定 CriticHub 与 RuleEngine 分开建模，避免 reviewer critique 与 deterministic checks 混淆。
- 决定 `RiskReportAssembler` 与 `severity/detail/pointers` 报告投影在本任务内明确 owner。
- 决定 async reliability、API governance、cost、audit 和 observability hooks 也在本任务内明确 owner。

## Open hooks
- 待实施时需要决定 async execution 复用现有后台任务能力的接入面。
- 待实施时需要决定 planner reason 在 UI 中如何呈现给用户。
- 待实施时需要决定 risk report 输出如何映射到 `T-027` 的 review surface。
