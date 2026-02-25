# 05 Pitfalls (do not repeat)

This file exists to prevent repeating mistakes within this task.

## Do-not-repeat summary (keep current)
- 不要在文献 API 未定稿前直接落库实现，否则会导致去重键、引用状态与前端交互反复返工。
- Desktop 端新增 API 前必须同步放行主进程代理路径与 HTTP 方法，否则 renderer 会被误判为后端失败。

## Pitfall log (append-only)

### 2026-02-25 - 规划阶段暂未出现已解决陷阱
- Symptom:
  - 无。
- Context:
  - 当前处于任务包建立阶段，尚未进入实现。
- What we tried:
  - 无。
- Why it failed (or current hypothesis):
  - 无。
- Fix / workaround (if any):
  - 无。
- Prevention (how to avoid repeating it):
  - 进入实现后，任何失败案例按本文件 append-only 追加。
- References (paths/commands/log keywords):
  - `dev-docs/active/literature-management-flow/`

### 2026-02-25 - Desktop 代理白名单遗漏导致联调失败
- Symptom:
  - renderer 调用新文献 API 报错 `Unsupported governance path` / `METHOD_NOT_ALLOWED`。
- Context:
  - Electron 主进程代理初始仅允许 `/paper-projects/*` 且仅支持 `GET/POST`。
- What we tried:
  - 先在 renderer 直接切换请求路径与方法，仍失败。
- Why it failed (or current hypothesis):
  - 失败点在主进程 IPC 桥接层而非后端服务。
- Fix / workaround (if any):
  - 放行 `/literature/*`、`/topics/*` 路径，并新增 `PATCH` 方法。
- Prevention (how to avoid repeating it):
  - 任何新增 backend route 同步检查：shared type -> renderer request -> preload/main whitelist 三处一致。
- References (paths/commands/log keywords):
  - `apps/desktop/src/main/main.ts`
  - `apps/desktop/src/main/preload.ts`
  - `apps/desktop/src/renderer/env.d.ts`
