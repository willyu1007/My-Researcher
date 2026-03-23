# 00 Overview

## Status
- State: in-progress
- Next step: 保持 legacy CSS 冻结状态，后续按 `shell -> paper/writing -> literature overview -> auto import -> manual import` 的波次逐步迁移并删除 import。

## Goal
- 将 `apps/desktop/src/renderer/styles/**` 正式定义为 `legacy compatibility layer`，而不是桌面 UI 的主线样式层。
- 固化仓库口径：legacy CSS 只为现有界面提供运行兼容，不再接纳新模块和新语义。
- 建立唯一退役主任务，后续所有 legacy CSS 的迁移、import 删除和最终移除都由本任务及其后续子任务承接。

## Non-goals
- 本 tranche 不迁移任何旧界面到 `data-ui` / token / contract。
- 不删除任何 legacy CSS 文件。
- 不调整 `apps/desktop/src/renderer/app-layout.css` 的 import 列表。
- 不做视觉重设计。
- 不修改 backend / OpenAPI / shared contracts。

## Context
- 桌面端当前仍通过 [app-layout.css](/Volumes/DataDisk/Project/My-Researcher/apps/desktop/src/renderer/app-layout.css) 聚合 legacy feature CSS，并覆盖 shell、文献管理、论文管理与写作中心等现有界面。
- `T-017 frontend-normalizers-and-css-split-wave2` 已把部分历史样式拆成更清晰的聚合入口，但当时目标是维持兼容运行，不是开始退役。
- `T-021 topic-management-workbench-ui` 已把 UI gate 拉绿，并通过临时 exception 将 `apps/desktop/src/renderer/styles` 排除出 scan root；该任务不再承担 legacy CSS 的长期治理主权。
- 新的 `TitleCardManagementModule` 基本已走 `data-ui` 路线，这使得现在成为冻结 legacy CSS 边界的合适时点。

## High-level acceptance criteria
- [x] 新 requirement `R-010` 与新任务 `T-022` 已注册到 project hub。
- [x] 任务文档明确 legacy CSS 的身份为 compatibility layer，并冻结 4 步路径：声明 -> 冻结 -> 波次迁移 -> 最终移除。
- [x] 仓库文档、UI context 和根 `AGENTS.md` 已统一声明：非 `T-022` 系列任务不得扩展 `apps/desktop/src/renderer/styles/**`。
- [x] `apps/desktop/src/renderer/app-layout.css` 已被标注为唯一 legacy CSS 聚合入口。
- [x] `apps/desktop/src/renderer/styles/README.md` 已写明覆盖界面簇、冻结规则和未来退役顺序。
- [x] 本 tranche 不改任何现有桌面运行视觉行为。
