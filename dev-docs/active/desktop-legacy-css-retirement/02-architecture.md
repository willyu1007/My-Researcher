# 02 Architecture

## Purpose
- 冻结 desktop renderer legacy CSS 的身份、入口、owner 和迁移顺序，避免旧样式层继续被当作默认扩展面。

## Current-state architecture
- 运行时样式来源分为两层：
  - contract/token layer: `ui/styles/ui.css`
  - compatibility layer: `apps/desktop/src/renderer/app-layout.css` -> `apps/desktop/src/renderer/styles/**`
- compatibility layer 当前仍覆盖这些界面簇：
  - `shell/*`
  - `literature-overview`
  - `literature-auto-import/*`
  - `literature-manual-import/*`
  - `modules-paper-writing`

## Frozen compatibility-layer contract
- `apps/desktop/src/renderer/app-layout.css` 是唯一 legacy CSS 聚合入口。
- `apps/desktop/src/renderer/styles/**` 是 frozen legacy compatibility layer，不是主线 UI 样式层。
- legacy compatibility layer 的职责只有一个：
  - 在迁移完成前维持历史桌面界面的可运行性。

## Hard-freeze rules
- 新功能、新模块不得新增对 `apps/desktop/src/renderer/styles/**` 的直接依赖。
- 新 UI 必须优先使用：
  - `data-ui`
  - `ui/styles` token/contract
  - Tailwind `B1-layout-only`
- 除 `T-022` 及其后续明确迁移子任务外，其他任务不得扩展 legacy CSS 语义。
- 若旧界面确需修改，应优先将修改归类为退役性迁移，而不是向 legacy 层继续追加新规则。

## Ownership boundary
- `T-017`:
  - 历史前置拆分任务，已完成
  - 不再承担 retirement owner 角色
- `T-021`:
  - 负责 topic/title-card 工作台与 UI gate 覆盖修复
  - 不再承担 legacy CSS 退役主权
- `T-022`:
  - 唯一 legacy CSS retirement owner
  - 负责冻结规则、波次迁移、import 删除与最终移除

## Future migration order
- Wave A: `shell/*`
- Wave B: `modules-paper-writing.css`
- Wave C: `literature-overview.css`
- Wave D: `literature-auto-import/*`
- Wave E: `literature-manual-import/*`

## End-state definition
- `app-layout.css` 不再 import legacy feature CSS。
- `apps/desktop/src/renderer/styles/**` 被删除，或只剩极少数待删 shim。
- `ui/config/governance.json` 不再对该目录保持 exclusion。
- 桌面 UI 新旧模块全部回到 contract/token 主线。
