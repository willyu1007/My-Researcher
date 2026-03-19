# 02-architecture

## Purpose
- 固化仓库文件拆分的长期维护原则、边界约束、波次依赖和兼容性策略，确保后续子任务能在不改变外部行为的前提下推进。

## Decomposition principles
- 外部行为不变优先。
- 先容器/编排层，再 feature 视图，再 util/style，再 backend boundary，再 shared contracts。
- 公共 API、DTO、import path 先兼容，后收口。
- CSS 先保持 import order 和 selector 稳定。
- 优先引入内部 facade / barrel 过渡层，避免一次性切全仓引用。

## Boundary model
| Layer | Target responsibility | Must not do in early waves |
|---|---|---|
| App orchestration | 路由、模块切换、共享 shell state、顶层 wiring | 不再承载 feature 细节逻辑 |
| Frontend controllers | 数据加载、状态转换、命令处理 | 不承担大型 JSX 视图拼装 |
| Frontend views | 纯展示、局部 UI 交互、受控表单 | 不直接承担跨模块数据编排 |
| Frontend utilities/styles | domain-specific normalizers、formatters、feature styles | 不继续跨 feature 杂糅 |
| Backend services | orchestration、domain rules、adapter coordination | 不同时承担 CRUD、adapter、scoring、mapping 全部角色 |
| Backend repositories | persistence boundary | 不跨 core/pipeline/embedding 多子域混装 |
| Shared contracts | bounded context 的类型与 schema 聚合 | 不继续承载全仓所有领域常量与 schema |

## Wave-by-wave target boundaries
### Wave 1A
- `App.tsx` 目标边界：
  - 只保留顶层 orchestration
  - 只持有必须共享的壳层状态
  - 将 feature 视图和局部逻辑下沉到现有或新增模块出口
- `T-012` 的边界保持不变：
  - 不接管 `AutoImportTab.tsx`
  - 不接管 controller hook
  - 不接管 backend/shared contracts

### Wave 1B
- `AutoImportTab.tsx` 目标边界：
  - 拆成稳定的 feature container 与 subviews
  - modal、rule center、run detail、quick editor 视图解耦
- `useAutoImportController.ts` 目标边界：
  - 划分成 data loaders、form commands、run detail commands、derived view models
- `useManualImportController.ts` 目标边界：
  - 分离 upload、review table、DEV seed、Zotero、submit/import 流程

### Wave 2
- `normalizers.ts` 目标边界：
  - 按 manual import / auto-pull / overview / metadata domain 拆分
- CSS 目标边界：
  - `shell.css` 仅保留 shell/topbar/sidebar/governance 基础样式
  - feature-specific styles 下沉到 literature/manual/auto-import 等文件组
  - 聚合入口只负责 import order，不承载所有语义

### Wave 3
- `auto-pull-service.ts` 目标边界：
  - config CRUD
  - run orchestration
  - source adapters
  - scoring/ranking
  - DTO/alert mappers
- `literature-flow-service.ts` 目标边界：
  - pipeline coordinator
  - stage executors
  - embedding/index builders
  - artifact persistence helpers
- `prisma-literature-repository.ts` 目标边界：
  - literature core
  - pipeline state/artifact
  - embedding persistence

### Wave 4
- `interface-field-contracts.ts` 目标边界：
  - paper project contracts
  - literature contracts
  - auto-pull contracts
  - research lifecycle contracts
  - schema/query constants
- 在 Wave 4 完成前，旧 export surface 必须保持兼容。

## Public interface policy
- Wave 0~3 默认不改变：
  - REST API path/method
  - DB schema
  - shared DTO 外部语义
  - UI 文案与交互语义
- 可变更项：
  - 内部文件拆分
  - import 关系
  - facade/barrel 组织方式
  - 组件、hook、service、repository 职责边界
- Wave 4 特殊规则：
  - 允许 shared contracts 内部拆分
  - MUST 保留旧 barrel export 兼容层，直到 desktop/backend consumers 全量切换

## Task and ownership strategy
- 总任务负责：
  - 波次规划
  - 范围锁定
  - 子任务创建策略
  - project hub 同步
  - 逐包合同 review 与整体执行顺序收口
- 子任务负责：
  - 单波次或单子域的具体实施
  - 实施期 verification 和 handoff
- 既有任务：
  - `T-012 app-tsx-layout-split` 仅承接 Wave 1A
  - 其余既有任务只作为上下文，不并入本治理任务
- 已创建的新任务：
  - `T-018 literature-container-controller-split-wave1` 承接 Wave 1B
  - `T-017 frontend-normalizers-and-css-split-wave2` 承接 Wave 2
  - `T-016 backend-service-boundary-split-wave3` 承接 Wave 3
  - `T-019 shared-contract-decomposition-wave4` 承接 Wave 4

## Excluded artifacts
- 当前拆分治理不把以下文件当作主目标：
  - `docs/context/api/openapi.yaml`
  - `docs/context/db/schema.json`
  - `docs/context/api/api-index.json`
  - `prisma/schema.prisma`
- 这些文件仅在后续实施波次触发生成/同步时被动更新。

## Dependency controls
- 每一波开始前必须满足：
  - 对应 task bundle 已创建或复用
  - 波次边界、验收、验证矩阵已写入该 task bundle
  - `sync --apply` 已登记到 project hub
- 每一波结束前必须满足：
  - 该波次 verification 已执行并记录
  - handoff notes 已更新
- 当前已知额外门槛：
  - Wave 1B 依赖 `T-012` 的最新 host baseline
  - Wave 2 依赖 Wave 1B 稳定，且需先吸收 `T-011` 对 `normalizers.ts` 的最新 baseline
  - Wave 3 依赖 `T-011` / `T-013` 的 backend overlap baseline 收口
  - Wave 4 依赖 Wave 3 稳定、`T-011` shared baseline 收口，以及 consumer audit 完成

## Key risks and controls
| Risk | Impact | Control |
|---|---|---|
| 在早期波次顺手改外部行为 | 导致回归范围失控 | 明确 Wave 0~3 行为冻结策略 |
| 把 `T-012` 无声扩成前端总任务 | 任务边界混乱 | 固定 `T-012` 仅为 Wave 1A |
| CSS 拆分打乱 cascade | UI 回归 | 保持 selector 与 import order 稳定 |
| shared contracts 过早拆分 | 影响 desktop/backend 广泛引用 | Wave 4 最后执行，并保留兼容导出 |
| backend service 一次性大拆 | 业务规则回归难定位 | Wave 3 仅按明确子边界拆，不改 REST/DB 契约 |

## Decision checkpoints
- Checkpoint 1:
  - 启动 Wave 1 时，确认先做 `T-012` 还是直接补建 Wave 1B 子任务。
- Checkpoint 2:
  - 启动 Wave 3 前，确认前端边界是否已经足够稳定，避免前后端并发大改。
- Checkpoint 3:
  - 启动 Wave 4 前，确认 desktop/backend import surface 已可接受兼容迁移。
