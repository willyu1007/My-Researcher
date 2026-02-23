# 06 Task Packages

## Package list

### PKG-FE-01 Desktop scaffold baseline
- Scope: 初始化 Electron main/preload/renderer + workspace scripts
- Exit: `pnpm --filter @paper-engineering-assistant/desktop typecheck` 通过

### PKG-FE-02 Brand style landing
- Scope: 接入 `morethan` 主题 tokens + logo assets
- Exit: UI spec validate/codegen 通过且界面渲染品牌色

### PKG-FE-03 Workspace shell
- Scope: 实现桌面壳层（导航、内容区、状态信息）
- Exit: 本地 smoke 可用，关键交互路径可演示

### PKG-FE-04 Desktop integration guardrails
- Scope: IPC 白名单、错误边界、最小 CI 校验
- Exit: governance + frontend checks 全绿
