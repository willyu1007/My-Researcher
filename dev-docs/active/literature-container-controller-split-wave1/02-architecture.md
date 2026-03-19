# 02-architecture

## Purpose
- 固化 Wave 1B 的前端容器/控制层拆分合同，确保后续实施时既不会回流到 `App.tsx`，也不会提前把 Wave 2 的 util/CSS 工作吸进来。

## Current-state signals
| File | Current signal | Consequence |
|---|---|---|
| `AutoImportTab.tsx` | `1931` 行，单组件内同时存在 render/helper/editor/portal 逻辑 | 需要 container + subview 边界 |
| `useAutoImportController.ts` | `994` 行 | loader/command/view-model 需要分层 |
| `useManualImportController.ts` | `1307` 行 | upload/review/zotero/submit 需要分区 |
| `App.tsx` | 已在 `T-012` 中将部分 handler 下沉 | Wave 1B 应继续减接线复杂度，而不是回流逻辑 |

## Boundary contract
### App host layer
- 只允许保留：
  - tab 选择与顶层切换
  - 跨 tab 必须共享的壳层状态
  - 将 grouped DTO / command bundle 传给 feature container
- 不允许：
  - 恢复 feature-specific derived state
  - 恢复 auto/manual import 命令逻辑

### Auto-import container layer
- 允许负责：
  - 组合 subviews
  - 本地 UI-only 状态（如局部 editor open/close）
  - 将 controller 输出映射到视图 props
- 不允许负责：
  - 远程数据获取细节
  - 大量 schedule/helper 纯函数长期滞留在 JSX 文件中

### Auto-import controller layer
- 允许负责：
  - 数据加载
  - 表单命令
  - run detail / alert / retry 命令
  - 纯派生 view model
- 不允许负责：
  - 大块 JSX
  - 与 DOM 位置耦合的 portal 布局逻辑

### Manual-import controller layer
- 允许负责：
  - upload intake / parsing state
  - review row editing and selection
  - Zotero connection / preview / import command
  - submit/import orchestration
- 不允许负责：
  - 将所有派生状态和命令继续维持在单个 hook 中

## Allowed internal modules
- Candidate module groups:
  - `auto-import/views/*`
  - `auto-import/controllers/*`
  - `auto-import/view-models/*`
  - `manual-import/controllers/*`
  - `manual-import/view-models/*`
  - `manual-import/zotero/*`
  - `manual-import/upload/*`
- Compatibility rule:
  - 现有公共入口 `AutoImportTab.tsx`、`useAutoImportController.ts`、`useManualImportController.ts` 在收口前必须保留兼容出口。

## Explicit defer-to-Wave-2 list
- `normalizers.ts` 的 domain decomposition
- `shell.css`
- `literature-auto-import.css`
- `literature-manual-import.css`
- 任何为了“顺手整理”而触发的样式入口重排

## Integration rules
- 若需要 touch `App.tsx`：
  - 只能为 DTO bundle / command bundle 接线
  - 不得新增 feature-specific branch explosion
- 若需要 touch shared utilities：
  - 只能新增局部 typed helper / contract helper
  - 不得把 `normalizers.ts` 拆分工作提前执行

## Verification contract
- 必须证明：
  - TS 类型边界稳定
  - 打包仍通过
  - smoke 主流程无回归
- 若出现 UI 回归：
  - 先检查 props bundle 与 effect 时序
  - 不得以“临时把逻辑塞回大文件”作为默认修复

## Risks and controls
| Risk | Impact | Control |
|---|---|---|
| `T-012` 与 Wave 1B 同时改 host wiring | merge/conflict 和职责回流 | 进入实施前先确认最新 App baseline |
| 视图拆分顺手带出 CSS 大改 | 任务扩 scope | 明确 CSS 拆分留给 Wave 2 |
| controller 拆分后对外 shape 震荡 | App/container 接口失稳 | 保留 facade/export compatibility |
| `AutoImportTab` 继续使用 `any` props | 类型边界无法稳住 | props typing 收紧作为第一批 deliverable |

## Decision checkpoints
- Checkpoint 1:
  - `AutoImportTab` 的 props typing 是否先于 subview 拆分完成。
- Checkpoint 2:
  - `useManualImportController` 是否先拆 upload/review，再拆 Zotero/submit。
- Checkpoint 3:
  - `App.tsx` 是否只做 wiring 清理，而没有重新吸收 feature 逻辑。

