# 05 Pitfalls (do not repeat)

## Do-not-repeat summary
- 导入失败后必须给出可执行恢复动作（重试/修复输入/切换来源），不能只提示失败。
- 顶部提示与内联状态必须一致，禁止“顶部成功但行内失败”或相反。
- 条件构建器变更后要同步验证 AND/OR 逻辑，避免隐式语义变化。
- 元数据保存必须有 `saving` 态与失败回滚提示。
- 三入口保持同等级可用，不能因局部优化形成“主入口依赖”。

## Pitfall log (append-only)

### 2026-02-26 - 初始化预防清单
- Symptom:
  - 暂无（执行前预防）。
- Root cause:
  - 历史上文献管理入口分散，状态反馈不统一，导致可用性不足。
- What we tried:
  - 在任务包阶段预置“不要重复”清单与验收门。
- Fix/workaround:
  - 将反馈模型、状态机、对齐门槛前置到架构与验证文档。
- Prevention:
  - 每次修复后必须追加到本日志（append-only）。
- References:
  - `dev-docs/active/literature-management-flow/02-architecture.md`
  - `dev-docs/active/literature-management-flow/04-verification.md`

### 2026-02-26 - 后端旧进程未重启导致新路由不可见
- Symptom:
  - UI 顶部报错：`Route GET:/literature/overview?... not found`。
- Root cause:
  - 后端进程在新路由上线前启动，未重启加载最新路由注册；前端已调用新路径。
- What we tried:
  - 直接在 UI 端重试“恢复动作”，错误持续。
- Fix/workaround:
  - 重启 backend 开发进程，并补种 `TOPIC-001/P001` 初始数据，确认 `/literature/overview` 返回 200。
- Prevention:
  - 每次新增 backend route 后，先执行 `curl /health` + `curl /literature/overview` 冒烟，再进入 UI 验收。
- References:
  - `apps/backend/src/app.ts`
  - `apps/backend/src/routes/literature-routes.ts`
