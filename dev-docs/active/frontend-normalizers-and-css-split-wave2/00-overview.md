# 00-overview

## Goal
- 将文献管理相关的前端 utility 与 CSS 热点文件拆成稳定的 domain/style 边界，并通过兼容聚合层维持现有运行行为。

## Non-goals
- 不做视觉重设计。
- 不修改 class / selector / `data-ui` 的语义。
- 不承担 Wave 1B 的 controller/view 拆分。
- 不改 backend/shared contract。

## Status
- State: planned
- Next step: 在开始实施前冻结当前 CSS import order 和 `normalizers.ts` 调用面，并确认 `T-011` 的最新 normalizer 变更已被吸收。

## Scope
- `apps/desktop/src/renderer/literature/shared/normalizers.ts`
- `apps/desktop/src/renderer/styles/shell.css`
- `apps/desktop/src/renderer/styles/literature-auto-import.css`
- `apps/desktop/src/renderer/styles/literature-manual-import.css`
- 允许最小化触碰：
  - `apps/desktop/src/renderer/styles/`
  - `apps/desktop/src/renderer/literature/shared/`
  - 相关 feature 入口文件的 import wiring

## Dependencies and coordination
- Upstream governance: `T-015 maintainability-file-split-governance`
- Preferred predecessor: `literature-container-controller-split-wave1`
- Overlap warning:
  - `T-011 literature-management-flow` 已修改 `normalizers.ts`，实施前必须吸收其最新基线。
  - 若 `T-012` 或 Wave 1B 仍在大改样式入口，本包不得提前启动。

## Acceptance criteria
- [ ] `normalizers.ts` 已按 domain 拆分，并保留兼容导出层。
- [ ] `shell.css` 已收敛为 shell/governance 基础样式，不再混装 feature 语义。
- [ ] auto/manual import 样式已分解为更清晰的聚合入口与子模块。
- [ ] selector、class、`data-ui` 语义和 import order 保持兼容。
- [ ] desktop `typecheck/build/smoke:e2e` 全通过。

