# 03 Implementation Notes

## Status
- Current status: `done`
- Last updated: 2026-02-23

## What changed
- 创建任务包：`dev-docs/active/analemma-borrowing-governance-v1/`。
- 新增文档骨架：`roadmap.md`, `00~05`, `.ai-task.yaml`。
- 新增扩展文档：
  - `06-borrowing-matrix.md`
  - `07-integration-adjustment-plan.md`
  - `08-interface-delta-spec.md`
- 新增治理映射（已完成）：`R-003` + `T-005`（挂载 `F-001/M-001`）。
- 完成归档收口：状态更新为 done，并迁移任务包至 `dev-docs/archive/analemma-borrowing-governance-v1/`。

## Decisions & tradeoffs
- 决策: 新建独立任务 `T-005`，不并入 `T-003`。
  - 理由: 避免治理主线任务边界漂移，便于独立评审/归档。
  - 替代方案: 直接并入 `T-003`；未采用原因是会提高单任务复杂度并放大单写者边界冲突风险。
- 决策: 文档先行，不实施前后端。
  - 理由: 用户要求当前轮次仅完成治理落盘与联动方案。
  - 替代方案: 同步落地接口/页面实现；未采用原因是会引入额外未确认实现细节，超出本任务范围。
- 决策: 接口增量采用“可空字段 + 新事件”策略。
  - 理由: 降低对现有契约与实现的破坏风险。
  - 替代方案: 直接修改既有字段语义；未采用原因是兼容性风险高，且不满足增量发布约束。

## Follow-up entry points
- 已完成拆分并落盘：
  - `T-006`（前端联动）：`dev-docs/archive/desktop-governance-observability-panels`
  - `T-007`（后端联动）：`dev-docs/active/governance-read-api-and-release-review-gate`
