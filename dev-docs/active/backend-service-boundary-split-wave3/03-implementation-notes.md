# 03-implementation-notes

## Current state
- 已进入产品代码实施，当前先处理 `AutoPullService` 的 internal slices。
- `sync --apply` 已分配任务 ID：`T-016`。
- 本包聚焦 backend internal boundary，不改 REST/DB/shared 对外语义。

## Package contract review
### Review 1 - Overlap lock
- Reviewed on: 2026-03-19
- Findings:
  - `T-011 literature-management-flow` 与本包三大目标文件均有真实重叠。
  - `T-013 topic-initial-pull-and-rule-preview` 对 `auto-pull-service` 也有直接测试依赖。
- Closure:
  - overlap reconciliation 已被写成强制 entry gate；未满足前不得启动本包。

### Review 2 - Facade lock
- Reviewed on: 2026-03-19
- Findings:
  - 后端拆分若不保留 facade，会把 route/controller/repository interface 一起拖进重构范围。
  - repository 层必须继续维持 Prisma-only boundary。
- Closure:
  - facade compatibility 与 Prisma-only boundary 已写成硬合同。

## Decision log
| Date | Decision | Rationale | Follow-up |
|---|---|---|---|
| 2026-03-19 | Wave 3 独立建包 | backend 大文件拆分与前端波次解耦，避免一次性跨层重构 | 待前端边界稳定后按基线推进 |
| 2026-03-19 | 三个目标文件都采用 facade + internal slices 策略 | 最小化上游联动与回退成本 | 实施时记录 facade public surface |
| 2026-03-19 | shared contract 保持冻结 | 防止 Wave 3/4 边界互相污染 | 若需要 contract 变化，转入 Wave 4 评审 |
| 2026-03-19 | `AutoPullService` 作为首刀 | 其 ranking / dto / topic binding 逻辑内部依赖相对集中，已有 targeted tests 覆盖关键语义 | 首刀完成后再评估 `LiteratureFlowService` coordinator/executor 拆分顺序 |

## Wave log
### Wave 3A baseline freeze
- Reviewed on: 2026-03-19
- Commands:
  - `pnpm --filter @paper-engineering-assistant/backend typecheck`
  - `pnpm --filter @paper-engineering-assistant/backend test`
- Result:
  - backend typecheck 通过。
  - backend test 通过，`93` tests passed / `0` failed。
  - `AutoPullService`、`LiteratureFlowService`、auto-pull route integration tests 均通过。

### Wave 3A surface inventory
- Reviewed on: 2026-03-19
- Findings:
  - `apps/backend/src/services/auto-pull-service.ts`
    - 约 `2493` 行，`97` methods。
    - public facade 聚焦 topic/rule/run/alert；内部混合了 ranking、topic binding、DTO mapping、source fetch、run aggregation。
  - `apps/backend/src/services/literature-flow-service.ts`
    - 约 `1198` 行，`46` methods。
    - 已有 `PipelineOrchestrator` 与 `OverviewStatusResolver`，下一步重点会放在 stage executors / artifact helpers。
  - `apps/backend/src/repositories/prisma/prisma-literature-repository.ts`
    - 约 `1052` 行，`49` methods。
    - 顶部 mapper helpers 与下半区 persistence methods 可按 core / pipeline / embedding 分区。
- Closure:
  - 先在 `AutoPullService` 内部做 facade-compatible 抽取，不拉动 route/controller/repository interface。

### Wave 3A implementation slice 1
- Implemented on: 2026-03-19
- Scope:
  - `apps/backend/src/services/auto-pull-service.ts`
  - `apps/backend/src/services/auto-pull/auto-pull-alert-codes.ts`
  - `apps/backend/src/services/auto-pull/auto-pull-types.ts`
  - `apps/backend/src/services/auto-pull/auto-pull-dto.ts`
  - `apps/backend/src/services/auto-pull/auto-pull-ranking.ts`
  - `apps/backend/src/services/auto-pull/auto-pull-topic-context.ts`
- Changes:
  - 将 `AutoPullService` 内部的 alert code 常量、DTO mapping、topic/rule binding + execution context、ranking/scorer 逻辑抽到 `services/auto-pull/` 子模块。
  - `AutoPullService` 保持原 public facade，不改 route/controller 调用面。
  - service file 现在保留 orchestration 与 source execution 主流程，把纯 helper 逻辑委派到内部 slices。
- Review closure:
  - `QUALITY_SCORE_UNAVAILABLE`、`ACTIVE GLOBAL` guard、topic binding、ranking mode 等关键语义已通过既有 tests 回归。
  - 本 slice 不触碰 repository interface、REST path、Prisma schema、shared contracts。

### Wave 3A implementation slice 2
- Implemented on: 2026-03-19
- Scope:
  - `apps/backend/src/services/literature-flow-service.ts`
  - `apps/backend/src/services/literature-flow/literature-flow-artifact-runtime.ts`
- Changes:
  - 将 `LiteratureFlowService` 中的 abstract/key-content/fulltext/chunk/embed/index/version snapshot 运行时逻辑下沉到 `LiteratureFlowArtifactRuntime`。
  - `LiteratureFlowService` 保留 facade、orchestrator 接线、stage branch dispatch 与 overview/state 组装。
  - 主 service 文件由约 `1198` 行收敛到 `691` 行。
- Review closure:
  - `PipelineOrchestrator` 契约未变，`executeStage` 的分支语义保持不变。
  - rerun artifact overwrite、embedding version activate/failure fallback、rights gate 等关键路径均通过既有 unit tests 回归。

### Wave 3A implementation slice 3
- Implemented on: 2026-03-19
- Scope:
  - `apps/backend/src/repositories/prisma/prisma-literature-repository.ts`
  - `apps/backend/src/repositories/prisma/literature/prisma-literature-record-mappers.ts`
  - `apps/backend/src/repositories/prisma/literature/prisma-literature-core-store.ts`
  - `apps/backend/src/repositories/prisma/literature/prisma-literature-pipeline-store.ts`
  - `apps/backend/src/repositories/prisma/literature/prisma-literature-embedding-store.ts`
- Changes:
  - 将 `PrismaLiteratureRepository` 改造成 facade-only repository，实现仍保持 `LiteratureRepository` 接口不变。
  - row mapper 独立到 `prisma-literature-record-mappers.ts`。
  - Prisma persistence 逻辑按 `core / pipeline / embedding` 分到独立 store。
  - facade 文件由约 `1052` 行收敛到 `252` 行。
- Review closure:
  - business layer 仍只依赖 `LiteratureRepository`，没有泄露 Prisma import。
  - 全量 backend tests 通过，说明 route/service 对 repository facade 的依赖未漂移。

### Wave 3A post-review hardening
- Implemented on: 2026-03-19
- Scope:
  - `apps/backend/src/services/auto-pull/auto-pull-topic-context.test.ts`
  - `apps/backend/src/repositories/prisma/literature/prisma-literature-record-mappers.test.ts`
- Changes:
  - 为 `auto-pull-topic-context` 补充 helper 级回归测试，覆盖 topic id 归一化、scope 切换到 `GLOBAL` 时的解绑、topic execution context 合并逻辑、最后一个 active global rule guard、以及 topic binding rewiring。
  - 为 `prisma-literature-record-mappers` 补充 mapper 级测试，覆盖 plain-object 收口、embedding vector 归一化、pipeline/paper-link record 序列化语义。
- Review closure:
  - `T-016` 新拆出的纯 helper / mapper 边界不再只依赖编译通过和上层 service 集成路径。
  - 拆分后最容易漂移的 contract normalization 语义已经被定向锁定。

## Closure summary
- Completed on: 2026-03-19
- Outcome:
  - `AutoPullService` 主文件约 `2493 -> 2094` 行。
  - `LiteratureFlowService` 主文件约 `1198 -> 691` 行。
  - `PrismaLiteratureRepository` 主文件约 `1052 -> 252` 行。
  - Wave 3 三个热点文件都已形成 facade + internal slices 的可维护边界。

## Handoff notes
- 实施前先核对：
  - `T-011` / `T-013` 最新目标文件 baseline
  - backend typecheck/test 是否全绿
  - `literature-repository.ts` 当前 interface 是否需要仅做最小分区整理
- 首刀优先级：
  - `auto-pull` ranking / scorer config
  - `auto-pull` DTO mapping
  - `auto-pull` topic/rule binding + execution context
