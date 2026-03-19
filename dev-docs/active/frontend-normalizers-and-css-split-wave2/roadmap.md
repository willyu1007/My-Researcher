# Frontend Normalizers and CSS Split Wave 2 - Roadmap

## Goal
- 在前端容器/控制层边界稳定后，拆分文献管理相关的 utility 与样式热点文件，建立清晰的 domain normalizer 边界和可控的 CSS import/cascade 结构。

## Program position
- Parent governance task: `T-015 maintainability-file-split-governance`
- Wave: `2`
- Task slug: `frontend-normalizers-and-css-split-wave2`
- Project mapping target: `M-000 > F-000 > T-pending`
- Current status target: `planned`

## Why this task exists
- `normalizers.ts` 达到 `1475` 行，混合了 manual import、auto-pull、overview、metadata、upload format 等多域转换逻辑。
- `shell.css` 达到 `3722` 行，已不只是 shell，还夹带 governance、literature、manual、topic 等样式语义。
- `literature-auto-import.css` 达到 `1317` 行，topic/rule/run detail 样式混装。
- `literature-manual-import.css` 达到 `901` 行，upload/Zotero/review table 样式混装。

## Scope
- Primary targets:
  - `apps/desktop/src/renderer/literature/shared/normalizers.ts`
  - `apps/desktop/src/renderer/styles/shell.css`
  - `apps/desktop/src/renderer/styles/literature-auto-import.css`
  - `apps/desktop/src/renderer/styles/literature-manual-import.css`
- Allowed integration surfaces:
  - `apps/desktop/src/renderer/styles/`
  - `apps/desktop/src/renderer/literature/shared/`
  - 受这些 CSS 或 normalizer 直接引用的 feature 入口文件（仅限 import path / aggregation wiring 调整）

## Explicit non-goals
- 不做视觉 redesign。
- 不改 selector 语义、`data-ui` 语义、class 名称含义。
- 不把 controller/view 拆分工作吸回来；该职责属于 Wave 1B。
- 不改 backend/shared contracts。
- 不借机做 Tailwind/token/system 迁移。

## Inputs and fixed assumptions
| Input | Why it matters | Constraint carried into this task |
|---|---|---|
| `T-015` parent roadmap | 定义本包是 Wave 2 | 必须在容器边界稳定后进入 |
| Wave 1B package | controller/view 边界决定 style 与 normalizer 的最终归属 | 不得在边界未稳前提前拆散入口 |
| `T-011 literature-management-flow` | 已真实修改 `normalizers.ts` | 启动前需吸收其最新基线 |
| existing CSS files | 现有 cascade 已被运行路径依赖 | 必须保持 import order 和 selector 稳定 |

## Decomposition strategy
### Workstream A - Domain normalizer split
- 目标边界：
  - manual import
  - auto-pull
  - overview
  - metadata
  - shared primitive coercion/common helpers
- 保留兼容 barrel：
  - `normalizers.ts` 在迁移期作为兼容导出入口，直到调用点稳定切换完成。

### Workstream B - Shell/base style split
- `shell.css` 仅保留：
  - shell/layout
  - topbar/sidebar
  - governance 基础块
- feature-specific styles 必须下沉到更明确的 feature 样式文件组。

### Workstream C - Feature style split
- `literature-auto-import.css` 按 topic/rule/run detail/editor 子域拆分。
- `literature-manual-import.css` 按 upload/zotero/review table/status 子域拆分。
- 聚合入口只负责 import order，不再同时承载所有样式语义。

## Entry gates
- Wave 1B 或等效前端边界收口已完成。
- 目标 CSS/normalizer 文件在其他活跃任务中无并发重写，或已达成明确的 rebase/合流方案。
- 已记录现有 import order 和关键 selector 清单，用作回归检查基线。

## Acceptance
- `normalizers.ts` 不再作为全域杂物间；按 domain 拆分并保留兼容导出。
- `shell.css` 只保留 shell/governance 基础样式，feature 样式下沉。
- auto/manual import 样式拥有更清晰的分组与聚合入口。
- 现有 selector、`data-ui` 语义、import order 与 cascade 行为保持兼容。
- desktop `typecheck/build/smoke:e2e` 通过。

## Rollback
- 保留聚合入口与兼容 barrel，可在不回退全部子模块的前提下恢复旧导出/旧 import order。
- 若某次样式拆分引发回归，应先回退聚合入口或单个子文件导入顺序，而不是直接推翻整个 wave。

## Review closure for this package
- 该任务包实施前必须再确认：
  - Wave 1B 的 feature 边界是否已稳定
  - `T-011` 对 `normalizers.ts` 的最新修改是否已吸收
  - 当前 CSS import order 是否已形成明确基线清单

