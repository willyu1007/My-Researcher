# Backend Service Boundary Split Wave 3 - Roadmap

## Goal
- 在不改变 REST/DB/持久化语义的前提下，拆分后端超大 service/repository 文件，保留稳定 facade，并让业务规则、适配器、mapper、持久化职责更容易定位与测试。

## Program position
- Parent governance task: `T-015 maintainability-file-split-governance`
- Wave: `3`
- Task slug: `backend-service-boundary-split-wave3`
- Project mapping target: `M-000 > F-000 > T-pending`
- Current status target: `planned`

## Why this task exists
- `auto-pull-service.ts` 达到 `2493` 行，单类同时承担 config CRUD、run orchestration、source adapter、scoring、alerting、DTO normalize。
- `literature-flow-service.ts` 达到 `1198` 行，pipeline policy、stage execution、embedding/indexing、artifact persistence 混装。
- `prisma-literature-repository.ts` 达到 `1052` 行，core/source/topic scope/paper link/pipeline/artifact/embedding 持久化全在一个仓储实现中。
- 这些文件已被 `T-011` 与 `T-013` 真实使用和修改，因此后续拆分必须以兼容 facade 和测试保护为前提。

## Scope
- Primary targets:
  - `apps/backend/src/services/auto-pull-service.ts`
  - `apps/backend/src/services/literature-flow-service.ts`
  - `apps/backend/src/repositories/prisma/prisma-literature-repository.ts`
- Allowed integration surfaces:
  - `apps/backend/src/repositories/literature-repository.ts`
  - `apps/backend/src/services/`
  - `apps/backend/src/repositories/prisma/`
  - 直接依赖这些文件的 controller/route/service wiring（仅限 import/facade 接线）
  - 对应单元测试与集成测试

## Explicit non-goals
- 不改 REST path/method。
- 不改 Prisma schema 或 DB 结构。
- 不改 shared contract 外部语义。
- 不重写 scheduler、pipeline 业务规则或 quality gate 语义。
- 不把 shared contract 分拆工作提前到本包。

## Inputs and fixed assumptions
| Input | Why it matters | Constraint carried into this task |
|---|---|---|
| `T-015` parent roadmap | 定义本包属于 Wave 3 | 必须保持外部契约不变 |
| `T-011 literature-management-flow` | 已引入 `literature-flow-service`、更新 repository、扩展 `auto-pull-service` | 启动前必须吸收其最新 backend baseline |
| `T-013 topic-initial-pull-and-rule-preview` | 已覆盖 `auto-pull-service` 的行为验证 | 不得破坏既有 `auto-pull-service.unit.test.ts` 语义 |
| `literature-repository.ts` interface | 当前接口本身已很宽 | 可最小化重组，但不改外部语义 |

## Decomposition strategy
### Workstream A - Auto-pull service split
- 目标子边界：
  - config CRUD
  - run orchestration
  - source adapters
  - scoring / ranking
  - alert / DTO mapper
- `AutoPullService` 类可保留为 facade，内部委派到新模块。

### Workstream B - Literature flow service split
- 目标子边界：
  - pipeline coordinator
  - stage executors
  - embedding/index adapter
  - artifact persistence helpers
- `LiteratureFlowService` 对外入口保持兼容，避免 controller/service 上游大面积联动。

### Workstream C - Prisma literature repository split
- 目标子边界：
  - literature core + source persistence
  - topic scope + paper link persistence
  - pipeline state + artifact persistence
  - embedding persistence
  - record mapper helpers
- `PrismaLiteratureRepository` 保持 facade；Prisma 依赖不外泄到 business layer。

## Entry gates
- `T-011` 与 `T-013` 对目标文件的活跃变更已吸收或停稳。
- backend baseline 的 typecheck/test 在拆分前处于绿色状态。
- shared contract 在本 wave 内保持冻结，不与 Wave 4 并发大改。

## Acceptance
- 三个目标大文件均已形成明确内部边界，并保留稳定 facade。
- controller/route 上游无需感知内部拆分，只需最小 import/facade 接线。
- Prisma 依赖仍只停留在 repository 层。
- REST path/method、Prisma schema、持久化语义保持不变。
- backend/shared 的类型和测试矩阵通过。

## Rollback
- 保留 facade 与原有 public method surface，可先回退单个内部模块而不回退整体。
- 若 repository 拆分引发问题，优先回退内部委派而不是放弃整个 facade 模式。
- 若 service 拆分引发行为漂移，优先回退对应 orchestrator/executor 模块接线。

## Review closure for this package
- 该任务包实施前必须再确认：
  - `T-011` / `T-013` 是否仍在活跃改写目标文件
  - baseline 测试是否全绿
  - shared contract 是否已冻结，避免与 Wave 4 并发漂移

