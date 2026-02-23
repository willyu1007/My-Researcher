# 01 Plan

## Phases
1. Governance + task packaging bootstrap
2. UI style intake and theme integration
3. Desktop scaffold implementation
4. Verification and governance sync

## Detailed steps
- Step 1: 创建 `T-004` 任务包并映射到 Feature/Requirement。
- Step 2: 解析 `LOGO` 目录资产并输出风格映射（颜色/字体/圆角/密度）。
- Step 3: 在 `ui/tokens/themes` 新增 `morethan.light` / `morethan.dark`。
- Step 4: 运行 `ui_specctl.py codegen + validate`，刷新 UI context。
- Step 5: 初始化 `apps/desktop`（Electron main/preload + Vite React renderer）。
- Step 6: 接入 `ui/styles/ui.css` 与 `data-theme="morethan.light"`。
- Step 7: 编写首版 UI 壳层（导航、工作区、状态栏）。
- Step 8: 执行 typecheck/build/smoke，更新验证与治理记录。

## Risks & mitigations
- Risk: Electron 安全配置遗漏。
  - Mitigation: 强制 `contextIsolation=true`、禁用 `nodeIntegration`、仅通过 preload 暴露白名单 API。
- Risk: 品牌风格修改破坏 token contract。
  - Mitigation: 仅新增主题文件，不改 contract role 语义。
- Risk: 前端包与 workspace 脚本冲突。
  - Mitigation: 所有命令通过 pnpm workspace filter 执行并验证。
