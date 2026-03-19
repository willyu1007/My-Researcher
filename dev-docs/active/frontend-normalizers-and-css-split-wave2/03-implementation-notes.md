# 03-implementation-notes

## Current state
- 任务包已创建，尚未进入产品代码实施。
- `sync --apply` 已分配任务 ID：`T-017`。
- 本包聚焦 utility/style 边界，不处理 controller/view 结构，不改 backend/shared contract。

## Package contract review
### Review 1 - Overlap lock
- Reviewed on: 2026-03-19
- Findings:
  - `normalizers.ts` 与 `T-011 literature-management-flow` 存在真实重叠。
  - Wave 1B 未完成前，style/utility 归属容易漂移。
- Closure:
  - 已将这两个条件写成显式 entry gate；未满足前不得启动本包。

### Review 2 - Compatibility lock
- Reviewed on: 2026-03-19
- Findings:
  - `normalizers.ts` 必须保留兼容 barrel。
  - CSS 拆分的核心风险不是文件数量，而是 import order / cascade。
- Closure:
  - 兼容 barrel 与聚合入口已被写入硬合同。

## Decision log
| Date | Decision | Rationale | Follow-up |
|---|---|---|---|
| 2026-03-19 | Wave 2 独立建包 | 避免与 Wave 1B 的 controller/view 拆分混在一起 | 待 Wave 1B 稳定后再启动 |
| 2026-03-19 | `normalizers.ts` 采取兼容 barrel 策略 | 减少 consumer 一次性迁移成本 | 实施时记录调用点切换节奏 |
| 2026-03-19 | CSS 聚合入口只负责 import order | 防止再次形成“新的大杂烩样式文件” | 在 verification 记录顺序原因 |

## Handoff notes
- 实施前先核对：
  - `T-011` 最新 `normalizers.ts` baseline
  - 当前 CSS import order 清单
  - Wave 1B 是否已稳定 container/view 边界
