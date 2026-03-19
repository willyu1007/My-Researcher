# 03-implementation-notes

## Current state
- 任务包已实施完成，并已完成验证与收口。
- `sync --apply` 已分配任务 ID：`T-018`。
- 本包作为 `T-015` 的 Wave 1B 子任务，目标是承接 `T-012` 已完成的 controller 下沉结果，而不是重做 App orchestration。

## Baseline received from T-012
- Reviewed on: 2026-03-19
- Baseline:
  - `App.tsx` 已从 `1549` 行收敛到 `1388` 行。
  - `shell/useGovernancePanelController.ts` 已从 App 中下沉治理面板控制逻辑。
  - `literature/LiteratureWorkspace.tsx` 已从 App 中下沉文献工作台组合层。
- Consequence:
  - 后续继续减少 `App.tsx` 复杂度的有效路径，已经主要落在 tab/container/controller props 与边界上，属于本任务包而不是 `T-012`。

## Package contract review
### Review 1 - Scope lock
- Reviewed on: 2026-03-19
- Findings:
  - 本包只处理 container/controller 边界，不处理 CSS/normalizer 大拆。
  - `App.tsx` 仅作为 integration surface，可做最小接线清理。
  - `AutoImportTab` props typing 被提升为第一批关键收口项。
- Closure:
  - Scope 已收口，可进入后续实施。

### Review 2 - Dependency lock
- Reviewed on: 2026-03-19
- Findings:
  - `T-012` 当前已经把部分业务 handler 从 `App.tsx` 下沉到 controller。
  - 本包必须基于 `T-012` 最新 host baseline，而不是绕过它另起一套接线。
- Closure:
  - 依赖关系已显式写入；实施前需再检查 `T-012` 是否有新增 host 改动。

## Decision log
| Date | Decision | Rationale | Follow-up |
|---|---|---|---|
| 2026-03-19 | 将 Wave 1B 单独建包 | 避免继续向 `T-012` 扩 scope | 保持 `T-012` 只承接 App orchestration |
| 2026-03-19 | `App.tsx` 只允许做 integration touch | 本包目标是减少 host fan-out，不是回流逻辑 | 实施时检查是否出现 host 反向膨胀 |
| 2026-03-19 | Wave 2 的 CSS/normalizer 工作不前置 | 防止本包边界失焦 | 遇到样式/utility 大拆需求时推迟到 Wave 2 |
| 2026-03-19 | controller facade 继续保留原始公共出口文件名 | 避免 host wiring 与后续子任务出现 import 面震荡 | 内部拆分为 `controllers/*`，外部继续使用 facade |
| 2026-03-19 | tab 对外接口改为 grouped props DTO | 直接降低 `App.tsx` 到 feature tab 的离散传参与 `any` 边界 | Wave 2 前不再扩大 tab props surface |

## Implementation summary
### Phase 2 - Auto-import container decomposition
- `AutoImportTab.tsx` 从 `1931` 行降到 `1074` 行。
- 新增 `auto-import/views/AutoImportTopicSettingsView.tsx`、`AutoImportRuleCenterView.tsx`、`AutoImportRunsAlertsView.tsx`。
- `AutoImportTab.tsx` 现在只保留局部 UI state、rule editor helper 和 subview composition。

### Phase 3 - Auto-import controller decomposition
- 新增 `auto-import/controllers/useAutoImportViewModel.ts`。
- 新增 `auto-import/controllers/useAutoImportLoaders.ts`。
- 新增 `auto-import/controllers/useAutoImportCommands.ts`。
- `useAutoImportController.ts` 收敛为 36 行 facade，统一聚合 view-model / loader / command 三类边界。

### Phase 4 - Manual-import controller decomposition
- 新增 `manual-import/controllers/useManualImportReviewController.ts`。
- 新增 `manual-import/controllers/useManualImportUploadController.ts`。
- 新增 `manual-import/controllers/useManualImportZoteroController.ts`。
- 新增 `manual-import/controllers/useManualImportSubmitController.ts`。
- 新增 `manual-import/controllers/manualImportSession.ts` 作为 upload / Zotero 共用 session helper。
- `useManualImportController.ts` 收敛为 37 行 facade，保留原始公共 hook 出口。

### Phase 5 - Host wiring reduction and compatibility cleanup
- `App.tsx` 从 `1388` 行进一步收敛到 `1299` 行。
- `App.tsx` 不再平铺解构 auto/manual controller 的大批字段，改为 `autoImportController` / `manualImportController` facade 对象。
- `AutoImportTab` / `ManualImportTab` 对外接口改为 grouped props DTO，host 只负责 wiring，不再继续扩大 prop fan-out。

## Review 3 - Acceptance closure
### Reviewed on: 2026-03-19
- Findings:
  - `AutoImportTab` 已拆成 container + `views/*` 组合。
  - `useAutoImportController` 已拆成 `view-model / loaders / commands`。
  - `useManualImportController` 已拆成 `upload / review / Zotero / submit`。
  - `App.tsx` 已收紧为 grouped tab props + controller facade 接线。
- Closure:
  - T-018 的产品代码实施目标已达成，可进入验证收尾。

## Review 4 - Wave handoff closure
### Reviewed on: 2026-03-19
- Findings:
  - 本包没有提前拆 `normalizers.ts`，也没有吸收 CSS 分层。
  - 当前剩余样式/utility 热点仍然明确留在 Wave 2。
- Closure:
  - Wave 1B 边界清晰，可安全交接到后续任务包。

## Review 5 - Post-close review fix closure
### Reviewed on: 2026-03-19
- Findings:
  - 新建主题的保存路径已恢复为与界面预览一致的 `topic_id` 生成逻辑，不再回退到原始主题名。
  - `AutoImportTab.tsx` 的 rule/schedule/source helper 已清除本轮 review 指出的 `any`，改为 `AutoPullRule` / `AutoPullRuleScheduleItem` / typed option 边界。
- Closure:
  - T-018 的 review findings 已全部收口；后续 Wave 2 不需要再为本包兜底补这两项修复。

## Handoff notes
- Wave 2 前保持稳定的边界：
  - `apps/desktop/src/renderer/literature/auto-import/types.ts`
  - `apps/desktop/src/renderer/literature/manual-import/types.ts`
  - `apps/desktop/src/renderer/literature/auto-import/controllers/*`
  - `apps/desktop/src/renderer/literature/manual-import/controllers/*`
- 明确留后项：
  - `normalizers.ts` domain decomposition
  - `shell.css`
  - `literature-auto-import.css`
  - `literature-manual-import.css`
