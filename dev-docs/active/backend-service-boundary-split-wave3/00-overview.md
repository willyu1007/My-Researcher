# 00-overview

## Goal
- 把 backend service/repository 热点文件拆成可测试、可委派、可回退的职责边界，同时保持外部接口和持久化语义稳定。

## Non-goals
- 不改 REST path/method。
- 不改 Prisma schema 或数据库结构。
- 不改 shared contract 的对外语义。
- 不新增行为能力或重做业务规则。

## Status
- State: planned
- Next step: 在开始实施前确认 `T-011` / `T-013` 对目标 backend 文件的最新修改已吸收，并冻结一版 backend 绿色基线。

## Scope
- `apps/backend/src/services/auto-pull-service.ts`
- `apps/backend/src/services/literature-flow-service.ts`
- `apps/backend/src/repositories/prisma/prisma-literature-repository.ts`
- 允许最小化触碰：
  - `apps/backend/src/repositories/literature-repository.ts`
  - `apps/backend/src/services/`
  - `apps/backend/src/repositories/prisma/`
  - 相关 controller/route wiring
  - 相关测试文件

## Dependencies and coordination
- Upstream governance: `T-015 maintainability-file-split-governance`
- Major overlap tasks:
  - `T-011 literature-management-flow`
  - `T-013 topic-initial-pull-and-rule-preview`
- Coordination rule:
  - 若上述任务仍在活跃改写目标文件，本包不得直接开工，必须先完成 baseline 吸收或明确 rebase 方案。
  - 若实施中需要 shared contract 大拆，必须回退到 Wave 4，而不是在本包扩 scope。

## Acceptance criteria
- [ ] `AutoPullService` 已收敛为 facade + 明确子职责模块。
- [ ] `LiteratureFlowService` 已收敛为 facade + coordinator/executor 边界。
- [ ] `PrismaLiteratureRepository` 已收敛为 facade + 分区持久化模块。
- [ ] Prisma 依赖没有泄露到 repository 之外的 business layer。
- [ ] backend/shared 验证矩阵通过，且 REST/DB 语义保持不变。

