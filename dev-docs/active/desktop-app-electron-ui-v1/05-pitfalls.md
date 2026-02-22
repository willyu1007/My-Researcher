# 05 Pitfalls (do not repeat)

## Do-not-repeat summary (keep current)
- Do not expose unrestricted Node APIs to renderer.
- Do not hardcode visual styles outside token/theme system.
- `pnpm <script> -- <args>` 透传参数会传入独立 `--` token，可复用脚本应兼容处理。

## Pitfall log (append-only)

### 2026-02-22 - 初始化阶段无已解决坑点
- Symptom:
  - 当前无已解决故障。
- Context:
  - 任务刚创建。
- What we tried:
  - N/A
- Why it failed (or current hypothesis):
  - N/A
- Fix / workaround (if any):
  - N/A
- Prevention (how to avoid repeating it):
  - 后续出现问题后按模板补充。
- References (paths/commands/log keywords):
  - `dev-docs/active/desktop-app-electron-ui-v1/`

### 2026-02-22 - Desktop build emits shared UI CSS import-order warning（已识别）
- Symptom:
  - `pnpm desktop:build` 时 Vite 提示 `@import must precede all other statements`，来源 `ui/styles/ui.css`。
- Context:
  - Renderer 直接复用仓库全局 UI 样式入口。
- What we tried:
  - 保留现有 shared UI 文件顺序并继续构建。
- Why it failed (or current hypothesis):
  - `ui/styles/ui.css` 中 `@layer reset` 代码块位于 `@import` 之前，触发 Vite CSS 语法告警。
- Fix / workaround (if any):
  - 当前告警不阻塞构建，后续在专门 UI 任务中调整 shared entrypoint 顺序。
- Prevention (how to avoid repeating it):
  - 对共享样式入口改动前先做 Vite build dry run，避免在功能任务中引入额外样式治理变更。
- References (paths/commands/log keywords):
  - `ui/styles/ui.css`
  - `pnpm desktop:build`
