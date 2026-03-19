# 02-architecture

## Purpose
- 固化 Wave 3 的 backend service/repository 拆分合同，确保拆分只改变内部模块边界，不改变 HTTP/DB/shared 对外语义。

## Current-state signals
| File | Current signal | Consequence |
|---|---|---|
| `auto-pull-service.ts` | `2493` 行，单类承担多子域责任 | 需要 facade + internal modules |
| `literature-flow-service.ts` | `1198` 行，编排与阶段实现混装 | 需要 coordinator/executor 分层 |
| `prisma-literature-repository.ts` | `1052` 行，持久化子域与 mapper 集中 | 需要 repository slices + mapper helpers |
| `literature-repository.ts` | interface 很宽 | 允许最小化重组，但不改外部语义 |

## Service contract
### AutoPullService
- Allowed responsibilities after split:
  - 对外 facade
  - 请求参数校验后的 orchestration 入口
  - 内部模块委派
- Internal slices:
  - config CRUD
  - run orchestration
  - source adapters
  - scoring/ranking
  - alert/DTO mapper
- Must not do:
  - 继续把所有 helper 和副作用流程留在单类中

### LiteratureFlowService
- Allowed responsibilities after split:
  - facade
  - pipeline coordinator
  - executor selection / orchestration
- Internal slices:
  - stage executors
  - embedding/index adapter
  - artifact persistence helper
  - rights-gate / availability helper
- Must not do:
  - 让单个 service 文件继续同时承载 stage execution 与全部 adapter 细节

## Repository contract
### PrismaLiteratureRepository
- Must remain:
  - repository facade implementing `LiteratureRepository`
  - Prisma-only dependency boundary
- Internal slices:
  - literature core + source
  - topic scope + paper link
  - pipeline state + artifacts
  - embeddings
  - record mappers
- Must not do:
  - 将 Prisma client 暴露到 service/controller
  - 在拆分中改变 repository interface 的对外语义

## Compatibility rules
- 对外 class 名称与主要 public method surface 保持兼容。
- 允许新增内部模块、helper、delegates。
- 若需要调整 `literature-repository.ts`：
  - 只能做可读性/分区整理
  - 不得改变方法语义或返回结构

## Coordination constraints
- 与 `T-011 literature-management-flow` 的重叠：
  - 该任务已引入并修改 `literature-flow-service.ts`、`prisma-literature-repository.ts`、`auto-pull-service.ts`
  - 本包启动前必须吸收其最新 backend baseline
- 与 `T-013 topic-initial-pull-and-rule-preview` 的重叠：
  - `auto-pull-service` 的行为测试已被该任务覆盖
  - 拆分后不得破坏对应测试语义
- 与 Wave 4 的边界：
  - shared contract 拆分不在本包进行
  - 若内部拆分需要 contract surface 变化，则必须另行评审并转入 Wave 4

## Verification contract
- 必须证明：
  - facade 行为兼容
  - targeted unit tests 继续通过
  - backend/shared type boundaries 稳定
- 推荐保留的关键测试入口：
  - `src/services/auto-pull-service.unit.test.ts`
  - `src/services/literature-flow-service.unit.test.ts`

## Risks and controls
| Risk | Impact | Control |
|---|---|---|
| 与 `T-011` / `T-013` 并发修改同文件 | 冲突和基线错位 | 先完成 overlap reconciliation |
| facade 未保留 | 上游 route/controller 大面积联动 | facade compatibility 作为硬约束 |
| repository 拆分导致 Prisma 泄露 | 破坏 layered backend 约束 | Prisma-only boundary 写入硬合同 |
| Wave 3 顺手改 shared contracts | 范围失控，影响全仓 | shared contract 冻结，留给 Wave 4 |

## Decision checkpoints
- Checkpoint 1:
  - `AutoPullService` 内哪些 helper 应先落为模块，哪些保留在 facade。
- Checkpoint 2:
  - `LiteratureFlowService` 的 stage executors 是否按阶段分文件还是按能力分文件。
- Checkpoint 3:
  - `PrismaLiteratureRepository` 是否需要同步将 mapper helpers 单独抽离。

