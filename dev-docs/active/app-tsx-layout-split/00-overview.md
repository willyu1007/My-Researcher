# 00-overview

## Goal
Implement the approved App.tsx + app-layout.css split plan with strict no-behavior-change guarantees.

## Non-goals
- No backend/database/business-rule changes
- No REST contract changes
- No UI redesign or class/data-ui semantics changes

## Status
- State: done
- Next step: 将后续仍属于 container/controller 边界的问题转入 `T-018 literature-container-controller-split-wave1`，不再在 `T-012` 内继续扩 scope。

## Scope
- `apps/desktop/src/renderer/App.tsx`
- `apps/desktop/src/renderer/app-layout.css`
- split modules under `shell/`, `literature/`, `modules/`, `styles/`

## Acceptance criteria
- [x] `App.tsx` 继续保留为 orchestration layer，而不再内联治理面板控制逻辑。
- [x] 文献工作台组合层已从 `App.tsx` 下沉，不再在 App 中直接展开完整 literature module tree。
- [x] desktop `typecheck/build/smoke:e2e` 通过。
- [x] 未改 REST path/method，也未进入 Wave 1B 的 container/controller 内部边界。
