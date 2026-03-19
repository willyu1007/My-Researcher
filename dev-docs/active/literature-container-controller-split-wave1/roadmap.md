# Literature Container/Controller Split Wave 1 - Roadmap

## Goal
- 将文献管理前端中已经从 `App.tsx` 下沉出来、但仍然过大的 container/controller 文件继续拆分成可维护边界，并保持现有行为、API 调用和 UI 语义不变。

## Program position
- Parent governance task: `T-015 maintainability-file-split-governance`
- Wave: `1B`
- Task slug: `literature-container-controller-split-wave1`
- Project mapping target: `M-000 > F-000 > T-pending`
- Current status target: `planned`

## Why this task exists
- `AutoImportTab.tsx` 已达到 `1931` 行，视图渲染、schedule 计算、inline editor、rule preview、portal/modal 混在单组件。
- `useAutoImportController.ts` 已达到 `994` 行，数据加载、表单命令、run detail 派生逻辑集中。
- `useManualImportController.ts` 已达到 `1307` 行，upload、DEV seed、review table、Zotero、submit 流程混装。
- `T-012` 已经把业务 handler 从 `App.tsx` 下沉到 controller，但这只是第一步，当前 controller/tab 自身仍是新的单体热点。

## Scope
- Primary targets:
  - `apps/desktop/src/renderer/literature/auto-import/AutoImportTab.tsx`
  - `apps/desktop/src/renderer/literature/auto-import/useAutoImportController.ts`
  - `apps/desktop/src/renderer/literature/manual-import/useManualImportController.ts`
- Allowed integration surfaces:
  - `apps/desktop/src/renderer/App.tsx`（仅限 host wiring、prop handoff、import rewrites）
  - `apps/desktop/src/renderer/literature/auto-import/`
  - `apps/desktop/src/renderer/literature/manual-import/`
  - `apps/desktop/src/renderer/literature/shared/`（仅限新增 typed DTO/view-model helper，不做 `normalizers.ts` 大拆）

## Explicit non-goals
- 不做 CSS 大拆；样式边界调整留给 Wave 2。
- 不做 `normalizers.ts` 的 domain decomposition；仅允许最小调用点调整。
- 不改 backend/shared contracts/REST path。
- 不新增视觉交互、不重写 copy、不改 `data-ui` / class 语义。
- 不把此任务扩展成“文献管理前端总体重构”。

## Inputs and fixed assumptions
| Input | Why it matters | Constraint carried into this task |
|---|---|---|
| `T-015` parent roadmap | 确认本任务属于 Wave 1B | 必须保持“零行为变化” |
| `T-012 app-tsx-layout-split` | 当前 App orchestration 已部分收敛 | 本任务基于其 controller 下沉成果继续拆 |
| `AutoImportTab.tsx` current shape | UI 复杂度最高热点之一 | 先拆 subview/view-model，再拆 host wiring |
| `useAutoImportController.ts` current shape | auto-import 逻辑聚集点 | 需要按 loader/command/view-model 分层 |
| `useManualImportController.ts` current shape | manual import 行为聚集点 | upload/review/zotero/submit 需要分区 |

## Decomposition strategy
### Workstream A - Auto import view boundary
- 将 `AutoImportTab.tsx` 收口为稳定 container。
- 抽离以下视图边界：
  - topic settings / topic modal
  - rules list / preview panel
  - rule inline editor / quick editor portal
  - runs / alerts / run detail
- `AutoImportTab` 对外入口暂时保留，以减少 `App.tsx` 联动风险。

### Workstream B - Auto import controller boundary
- 将 `useAutoImportController.ts` 拆成明确子职责：
  - data loaders
  - topic form commands
  - rule form commands
  - run detail commands
  - derived view model builders
- controller 对外仍保留兼容出口，避免一次性改所有调用方。

### Workstream C - Manual import controller boundary
- 将 `useManualImportController.ts` 拆成明确子职责：
  - upload intake
  - review table editing
  - DEV seed helpers
  - Zotero request/state handling
  - submit/import pipeline commands
- 优先将“高副作用命令”与“纯派生状态”分离。

### Workstream D - Host wiring reduction
- `App.tsx` 若仍需参与接线，只允许：
  - 用 grouped DTO / command bundle 代替大量离散 props
  - import path 改写
  - 与 `T-012` 既有 orchestration 层保持一致
- 不在本任务中重新扩大 `App.tsx` 职责。

## Entry gates
- `T-015` 已完成总治理与 project hub 注册。
- `T-012` 当前 controller 下沉结果已作为基线可复用。
- 执行前需确认没有其他进行中的任务正在并发重写这三个目标文件。

## Acceptance
- `AutoImportTab.tsx` 不再承载大段混杂 render/helper/command 逻辑；主文件聚焦 container 编排。
- `useAutoImportController.ts` 与 `useManualImportController.ts` 形成可命名的子边界，不再是单 hook 吞掉所有责任。
- `App.tsx` 到 tab/controller 的传参方式收敛为少量 typed bundles，而不是继续扩散 scalar props。
- 现有 API path、effect 时序、copy、`data-ui` / class 语义不变。
- desktop `typecheck/build/smoke:e2e` 通过。

## Rollback
- 保留兼容 export surface，支持逐步回退到原始入口。
- 每个子边界提取都应能独立回退，不要求整包一次性撤销。
- 若 host wiring 变更引发回归，优先回退 wiring，而不是回退已稳定的内部子模块。

## Review closure for this package
- 该任务包必须在实施前再次确认：
  - `T-012` 的当前产物是否仍是最新 host baseline
  - Wave 2 未提前吸收的 CSS / normalizer 变更是否仍被排除
  - `AutoImportTab` props typing 是否作为第一批必做项

