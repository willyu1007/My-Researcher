# 03 Implementation Notes

## Status
- Current status: `in-progress`
- Last updated: 2026-02-25

## What changed
- 已落地文献管理首批实现（后端 + 桌面端同批）：
  - shared 合同新增文献检索/导入/选题范围/论文引用状态接口类型与 JSON schema。
  - backend 新增 literature controller/routes/service 与 memory/prisma 仓储实现。
  - Prisma 新增文献相关 4 张表与迁移脚本。
  - desktop 新增文献管理交互区（检索、导入、选题范围）、论文管理引用状态更新、写作中心只读联动。
  - desktop 主进程代理放行 `/literature`、`/topics` 路径和 `PATCH` 方法。
  - backend 新增 literature service 单元测试与端到端路由集成测试。

## Files/modules touched (high level)
- `dev-docs/active/literature-management-flow/roadmap.md`
- `dev-docs/active/literature-management-flow/00-overview.md`
- `dev-docs/active/literature-management-flow/01-plan.md`
- `dev-docs/active/literature-management-flow/02-architecture.md`
- `dev-docs/active/literature-management-flow/03-implementation-notes.md`
- `dev-docs/active/literature-management-flow/04-verification.md`
- `dev-docs/active/literature-management-flow/05-pitfalls.md`
- `dev-docs/active/literature-management-flow/.ai-task.yaml`
- `packages/shared/src/research-lifecycle/interface-field-contracts.ts`
- `apps/backend/src/repositories/literature-repository.ts`
- `apps/backend/src/repositories/in-memory-literature-repository.ts`
- `apps/backend/src/repositories/prisma/prisma-literature-repository.ts`
- `apps/backend/src/services/literature-service.ts`
- `apps/backend/src/services/literature-service.unit.test.ts`
- `apps/backend/src/controllers/literature-controller.ts`
- `apps/backend/src/routes/literature-routes.ts`
- `apps/backend/src/routes/research-lifecycle-routes.integration.test.ts`
- `apps/backend/src/app.ts`
- `prisma/schema.prisma`
- `prisma/migrations/20260225170000_add_literature_management/migration.sql`
- `apps/desktop/src/main/main.ts`
- `apps/desktop/src/main/preload.ts`
- `apps/desktop/src/renderer/env.d.ts`
- `apps/desktop/src/renderer/App.tsx`
- `apps/desktop/src/renderer/app-layout.css`

## Decisions & tradeoffs
- Decision:
  - 先做流程与契约收敛，再进入代码实现。
  - Rationale:
    - 当前实现与需求存在明显断层，先冻结流程能降低返工。
  - Alternatives considered:
    - 先写后端 API 再回补文档（风险：边界漂移）。

- Decision:
  - M0 只交付摘要级能力与可追溯来源，不做全文能力。
  - Rationale:
    - 与需求和风险控制一致，且实现复杂度可控。
  - Alternatives considered:
    - 提前引入全文策略（风险：授权与同步治理复杂度激增）。

## Deviations from plan
- Change:
  - 先产出完整 dev-docs bundle，再同步项目治理索引。
  - Why:
    - 满足“使用 plan-maker 生成完整任务包”的用户要求。
  - Impact:
    - 进入实现前可直接作为执行基线。

- Change:
  - 后端与 UI 按同批交付先实现核心闭环，OpenAPI 上下文索引更新延后。
  - Why:
    - 先保障功能与测试可用，再补上下文文档可减少返工。
  - Impact:
    - 代码功能可用，context API 文档仍待补齐。

## Known issues / follow-ups
- 待补充：`docs/context/api/openapi.yaml` 与 `api-index.json` 的文献 API 更新。
- 待补充：真实后端环境下的 `ci:prisma-smoke`（需要 PRISMA_SMOKE_BASE_DATABASE_URL）。

## Pitfalls / dead ends (do not repeat)
- Keep the detailed log in `05-pitfalls.md` (append-only).
