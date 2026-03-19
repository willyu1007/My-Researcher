# 03-implementation-notes

## Current state
- 任务包已创建，尚未进入产品代码实施。
- `sync --apply` 已分配任务 ID：`T-016`。
- 本包聚焦 backend internal boundary，不改 REST/DB/shared 对外语义。

## Package contract review
### Review 1 - Overlap lock
- Reviewed on: 2026-03-19
- Findings:
  - `T-011 literature-management-flow` 与本包三大目标文件均有真实重叠。
  - `T-013 topic-initial-pull-and-rule-preview` 对 `auto-pull-service` 也有直接测试依赖。
- Closure:
  - overlap reconciliation 已被写成强制 entry gate；未满足前不得启动本包。

### Review 2 - Facade lock
- Reviewed on: 2026-03-19
- Findings:
  - 后端拆分若不保留 facade，会把 route/controller/repository interface 一起拖进重构范围。
  - repository 层必须继续维持 Prisma-only boundary。
- Closure:
  - facade compatibility 与 Prisma-only boundary 已写成硬合同。

## Decision log
| Date | Decision | Rationale | Follow-up |
|---|---|---|---|
| 2026-03-19 | Wave 3 独立建包 | backend 大文件拆分与前端波次解耦，避免一次性跨层重构 | 待前端边界稳定后按基线推进 |
| 2026-03-19 | 三个目标文件都采用 facade + internal slices 策略 | 最小化上游联动与回退成本 | 实施时记录 facade public surface |
| 2026-03-19 | shared contract 保持冻结 | 防止 Wave 3/4 边界互相污染 | 若需要 contract 变化，转入 Wave 4 评审 |

## Handoff notes
- 实施前先核对：
  - `T-011` / `T-013` 最新目标文件 baseline
  - backend typecheck/test 是否全绿
  - `literature-repository.ts` 当前 interface 是否需要仅做最小分区整理
