# 03 Implementation Notes

## Status
- Current status: `done`
- Last updated: 2026-02-23

## What changed
- 新建任务包：`dev-docs/active/governance-event-delivery-mechanism-v1/`。
- 输出 `roadmap + 00~05 + .ai-task.yaml` 基础治理文档。
- 将 `T-007` 收口中遗留的“事件交付机制细化”转入本任务处理。

## Decisions and tradeoffs
- 决策: 新建 `T-008`，不回写 `T-007` 继续扩展。
  - 理由: `T-007` 已归档，继续扩展会打破已确认的收口边界。
  - 替代方案: 在 `T-003` 内追加交付机制；未采用，避免语义与交付混写。
- 决策: 先治理决议，后实现拆分。
  - 理由: 先锁定交付约束，降低后续实现返工。
  - 替代方案: 直接编码 outbox；未采用，当前缺少冻结的交付契约。

## Open follow-ups
- 子任务状态：
  - `T-009` backend delivery implementation：已归档 `dev-docs/archive/governance-event-delivery-backend-implementation-v1/`
  - `T-010` observability and ops playbook：已归档 `dev-docs/archive/governance-event-delivery-observability-ops-v1/`
- 待完成：
  - 基于子任务完成情况执行 `T-008` 收口决议（见 `06-closure-decision.md`）。

## Progress log
- 2026-02-23: 任务创建并进入计划阶段。
- 2026-02-23: 已完成治理映射：`T-008 -> M-001/F-001/R-006`，并通过 `sync/lint/query` 校验。
- 2026-02-23: 已基于 `T-008` 拆分并创建 `T-009/T-010` 两个实施任务包。
- 2026-02-23: `T-009/T-010` 端到端测试通过并已归档，`T-008` 进入收口决议阶段。
- 2026-02-23: 收到收口确认，执行 Option A，将 `T-008` 标记为 done 并归档。
