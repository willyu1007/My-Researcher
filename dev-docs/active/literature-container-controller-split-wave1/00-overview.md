# 00-overview

## Goal
- 以零行为变化为前提，拆分文献管理前端的 container/controller 热点文件，形成可维护的视图、命令和 view-model 边界。

## Non-goals
- 不做 CSS 分层重构。
- 不做 `normalizers.ts` 大拆。
- 不改 REST path、shared DTO 或 backend 行为。
- 不改变现有 copy、交互语义、`data-ui` / class 语义。

## Status
- State: done
- Next step: Wave 1B 已收口；后续进入 `T-017 frontend-normalizers-and-css-split-wave2` 前，保持当前 auto/manual import interface 稳定，不在本包继续吸收 CSS 或 `normalizers.ts` 大拆。

## Scope
- `apps/desktop/src/renderer/literature/auto-import/AutoImportTab.tsx`
- `apps/desktop/src/renderer/literature/auto-import/useAutoImportController.ts`
- `apps/desktop/src/renderer/literature/manual-import/useManualImportController.ts`
- 允许最小化触碰：
  - `apps/desktop/src/renderer/App.tsx`
  - `apps/desktop/src/renderer/literature/auto-import/`
  - `apps/desktop/src/renderer/literature/manual-import/`
  - `apps/desktop/src/renderer/literature/shared/`

## Dependencies and coordination
- Upstream governance: `T-015 maintainability-file-split-governance`
- Recommended host baseline: `T-012 app-tsx-layout-split`
- Coordination rule:
  - 若 `T-012` 仍在改 `App.tsx` host wiring，本任务必须先吸收其最新边界再进入实作。
  - 若实施中需要 CSS/normalizer 大拆，必须回退到 Wave 2，而不是在本包扩 scope。

## Acceptance criteria
- [x] `AutoImportTab.tsx` 收敛为 container + subview composition，而不是继续承担全部视图细节。
- [x] `useAutoImportController.ts` 至少拆成 loader/command/view-model 三类稳定边界。
- [x] `useManualImportController.ts` 至少拆出 upload、review、Zotero、submit 四类稳定边界。
- [x] `App.tsx` 对文献 tab 的接线不再继续扩大 prop fan-out。
- [x] desktop `typecheck/build/smoke:e2e` 全通过，且无用户可见行为变化。
