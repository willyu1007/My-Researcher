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
   - 桌面特性样式：`apps/desktop/src/renderer/app-layout.css`。
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

## 目标治理口径（to-be）

1. Tailwind 维持 `B1-layout-only`。
2. 主题维持 `token-only`。
3. Feature CSS 仅承载结构性样式，不承载视觉 token 定义。
4. 避免 inline style 与硬编码颜色/阴影字面量。
5. UI governance gate 需要覆盖 monorepo 桌面路径并保持 approval 对齐。

## 偏差清单（含证据）

1. D-001 Feature CSS visual-token drift（高）
   - 证据：`apps/desktop/src/renderer/app-layout.css`
   - 影响：当前可运行，但与 `feature_css_audit` 目标口径有偏差。
2. D-002 Inline style for CSS variable injection（中）
   - 证据：`apps/desktop/src/renderer/App.tsx`
   - 影响：违反 `disallow_inline_style=true` 的严格口径。
3. D-003 Governance scan root coverage gap（高）
   - 证据：`ui/config/governance.json`、`.ai/.tmp/ui/20260301T140320Z-89775/ui-gate-report.json`
   - 影响：gate 对 desktop renderer 的扫描覆盖不足（`files_scanned=0`）。
4. D-004 Spec approval mismatch（高）
   - 证据：`.ai/.tmp/ui/20260301T140326Z-89813/ui-gate-report.json`、`.ai/.tmp/ui/20260301T140326Z-89813/approval.request.json`
   - 影响：UI gate 当前存在 `spec-approval-required` 错误。

## 验证命令（可复现）

```bash
node .ai/skills/features/context-awareness/scripts/ctl-context.mjs touch --repo-root /Volumes/DataDisk/Project/My-Researcher
node .ai/skills/features/context-awareness/scripts/ctl-context.mjs verify --strict --repo-root /Volumes/DataDisk/Project/My-Researcher

rg -n "dual-track-current-first|effective_profile|target_profile|known_deviations" \
  /Volumes/DataDisk/Project/My-Researcher/docs/context/ui/ui-spec.json \
  /Volumes/DataDisk/Project/My-Researcher/docs/context/ui/current-state-alignment.md

rg -n "desktop:dev|smoke:e2e|DESKTOP_DEV_PORT|DESKTOP_OPEN_DEVTOOLS|窗口|图标" \
  /Volumes/DataDisk/Project/My-Researcher/README.md \
  /Volumes/DataDisk/Project/My-Researcher/apps/desktop/README.md
```

## 收敛建议（仅建议，不在本任务实施）

1. 新建独立 UI 收敛任务，迁移 `app-layout.css` 中视觉属性到 token/contract 层。
2. 调整 UI gate 扫描根路径，覆盖 `apps/desktop/src`。
3. 对 inline style 场景做白名单例外或完成 class/token 替代。
4. 单独执行 UI spec approval 流程，解决 `spec_status=MISMATCH`。
