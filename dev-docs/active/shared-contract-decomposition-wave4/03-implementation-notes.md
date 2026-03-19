# 03-implementation-notes

## Current state
- 任务包已创建，尚未进入产品代码实施。
- `sync --apply` 已分配任务 ID：`T-019`。
- 本包聚焦 shared contract internal decomposition，不改变 contract 对外业务语义。

## Package contract review
### Review 1 - Consumer lock
- Reviewed on: 2026-03-19
- Findings:
  - 当前 `interface-field-contracts.ts` 主要通过 `research-lifecycle/index.ts` 和 shared 顶层 barrel 暴露。
  - 因此本包真正的风险不只是拆文件，而是破坏 barrel compatibility。
- Closure:
  - barrel compatibility 已被写成硬合同，consumer audit 为强制 entry gate。

### Review 2 - Overlap lock
- Reviewed on: 2026-03-19
- Findings:
  - `T-011` 对 `interface-field-contracts.ts` 有真实扩展记录。
  - `T-014` 通过同一 `research-lifecycle/` barrel 暴露 sibling contracts。
- Closure:
  - 已将 `T-011` baseline 吸收与 sibling compatibility 写入实施前门槛。

## Decision log
| Date | Decision | Rationale | Follow-up |
|---|---|---|---|
| 2026-03-19 | Wave 4 独立建包 | shared contract 拆分影响面最广，必须最后处理 | 以前几波稳定为前提 |
| 2026-03-19 | 保留 `interface-field-contracts.ts` 兼容聚合层 | 避免 consumer 一次性大迁移 | 实施时记录哪些导出仍需长期兼容 |
| 2026-03-19 | cleanup compat layer 不并入本包 | 防止同一任务同时承担拆分和彻底迁移 | 如有需要后续单独立项 |

## Handoff notes
- 实施前先核对：
  - `T-011` 最新 shared baseline
  - backend/desktop consumer audit
  - `research-lifecycle/index.ts` 与顶层 shared barrel 的当前导出面
