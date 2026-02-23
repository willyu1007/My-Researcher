# 06 Closure Decision

## Purpose
- 启动 `T-008` 收口决议，确认“机制定义任务”是否满足 done/archived 条件。

## Readiness matrix
| Closure condition | Evidence | Status |
| --- | --- | --- |
| delivery mode 机制已定义（in-process / durable-outbox） | `02-architecture.md` + `T-009` adapter/outbox 实现与测试 | pass |
| envelope/幂等字段已落地约束 | `T-009` 代码与测试（`event_id/dedupe_key/trace_id`） | pass |
| retry/dlq/manual 边界可执行 | `T-009` 失败审计 + `T-010` replay/incident 文档 | pass |
| 实施任务拆分并完成 | `T-009`、`T-010` 已归档 | pass |
| 治理映射一致且无漂移 | `sync --apply` + `lint --check` pass | pass |

## Decision options
1. Option A (recommended): 将 `T-008` 标记 `done`，并在本轮确认后归档。
2. Option B: 保持 `in-progress`，等待后续 outbox 持久化升级（Prisma 表 + worker）再收口。

## Risk analysis
- 若现在收口（Option A）：
  - 风险：后续 outbox 工程升级不再由 `T-008` 承载。
  - 控制：将升级明确转入新任务（例如后续 `T-011`），`T-008` 保持机制基线定位。
- 若延后收口（Option B）：
  - 风险：任务边界膨胀，`T-008` 与实现任务职责再次混写。
  - 控制：需要额外 owner 边界治理，增加管理成本。

## Recommendation
- 采用 Option A：`T-008` 作为“机制定义与拆分母任务”收口，后续工程增强开新任务承接。

## Pending approval
- 需用户确认：
  - [x] 是否按 Option A 将 `T-008` 置为 `done` 并归档。

## Decision outcome
- Confirmed decision: Option A
- Execution date: 2026-02-23
- Result: `T-008` 已转入 done，并执行归档流程。
