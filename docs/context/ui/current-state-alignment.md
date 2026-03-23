# UI Current-State Alignment (dual-track-current-first)

## 结论（当前执行口径）

- 本仓库 UI 文档采用 `dual-track-current-first`。
- 当前执行以 `effective_profile=desktop-hybrid-v1` 为准，目标治理以 `target_profile=b1-token-only-target` 为准。
- 当两者不一致时，必须在 `known_deviations` 中登记偏差与后续收敛入口。

## 当前实现事实（as-is）

1. 运行时栈
   - 桌面壳层：Electron。
   - 渲染层：React + Vite + TypeScript。
2. 样式来源
   - 全局 token/contract：`ui/styles/ui.css`。
   - 桌面 compatibility layer：`apps/desktop/src/renderer/app-layout.css`。
   - `app-layout.css` 是唯一 legacy 样式聚合入口，继续导入 `apps/desktop/src/renderer/styles/**` 以维持旧界面运行。
3. 主题机制
   - 主题模式：`system | light | dark`。
   - 解析主题：`morethan.light | morethan.dark`。
   - 生效方式：`document.documentElement[data-theme]`。
4. 桌面启动行为
   - dev 启动时窗口初始隐藏。
   - 用户点击 Dock/桌面应用图标后，窗口居中并聚焦显示。
5. 治理面板开关
   - 环境变量：`VITE_ENABLE_GOVERNANCE_PANELS=1` 可默认开启。
   - 不设置时默认关闭，可在 UI 会话内临时切换。
6. 样式分层现状
   - 当前桌面 UI 是双层结构：
     - `ui/styles/ui.css` 承载 token/contract 主线
     - `apps/desktop/src/renderer/styles/**` 承载 legacy compatibility layer
   - legacy compatibility layer 仍覆盖 shell、literature overview、auto import、manual import、paper/writing 等旧界面簇。

## 目标治理口径（to-be）

1. Tailwind 维持 `B1-layout-only`。
2. 主题维持 `token-only`。
3. 新 UI 回到 `data-ui` / token / contract 主线，不再扩展 legacy CSS。
4. 历史 feature CSS 通过 `T-022` 波次迁移逐步移除，而不是继续作为正式样式层。
5. UI governance gate 继续覆盖 monorepo 桌面路径，并在 legacy CSS 退役完成后收回 exclusion。

## 偏差清单（含证据）

1. D-001 Legacy compatibility layer still powers pre-data-ui screens（高）
   - 证据：`apps/desktop/src/renderer/app-layout.css`、`apps/desktop/src/renderer/styles/README.md`
   - 影响：当前可运行，但旧界面仍未迁移到 contract/token 主线。
2. D-002 Legacy styles are excluded from UI gate as a temporary containment measure（中）
   - 证据：`ui/config/governance.json`
   - 影响：gate 已覆盖 desktop renderer 主代码，但对 legacy CSS 采用临时 exclusion，而非完成式合规。

## 验证命令（可复现）

```bash
node .ai/skills/features/context-awareness/scripts/ctl-context.mjs touch --repo-root /Volumes/DataDisk/Project/My-Researcher
node .ai/skills/features/context-awareness/scripts/ctl-context.mjs verify --strict --repo-root /Volumes/DataDisk/Project/My-Researcher

rg -n "dual-track-current-first|effective_profile|target_profile|known_deviations" \
  /Volumes/DataDisk/Project/My-Researcher/docs/context/ui/ui-spec.json \
  /Volumes/DataDisk/Project/My-Researcher/docs/context/ui/current-state-alignment.md

rg -n "@import './styles/" \
  /Volumes/DataDisk/Project/My-Researcher/apps/desktop/src/renderer/app-layout.css

rg -n "import '.*styles/.*\\.css'|import \".*styles/.*\\.css\"" \
  /Volumes/DataDisk/Project/My-Researcher/apps/desktop/src/renderer \
  -g '*.{ts,tsx}'

rg -n "desktop:dev|smoke:e2e|DESKTOP_DEV_PORT|DESKTOP_OPEN_DEVTOOLS|窗口|图标" \
  /Volumes/DataDisk/Project/My-Researcher/README.md \
  /Volumes/DataDisk/Project/My-Researcher/apps/desktop/README.md
```

## 收敛建议（仅建议，不在本任务实施）

1. 按 `T-022` 波次顺序迁移 `shell -> paper/writing -> literature overview -> auto import -> manual import`。
2. 每完成一波，及时从 `app-layout.css` 移除对应 import，并删除不再需要的 legacy 文件。
3. 直到 legacy CSS 退役完成前，维持“新 UI 禁止接入 compatibility layer”的冻结规则。
4. 在最终 retirement 完成后，从 `ui/config/governance.json` 收回 `apps/desktop/src/renderer/styles` exclusion。
