# Maintainability File Split Governance - Roadmap

## Goal
- 为仓库建立一条面向长期维护的文件拆分治理主线，先完成任务包、波次规划和 project hub 同步，再按波次拆出执行子任务。

## Governance decision
- 决策：`NEW_TASK`
- 任务 slug：`maintainability-file-split-governance`
- 项目映射：`M-000 > F-000 > T-pending`
- 总体策略：
  - 先总任务、后子任务
  - 先治理与文档、后产品代码
  - 第一波坚持零行为变化
  - 第一波优先前端容器与控制层
- 现有任务处理：
  - 保留 `T-012 app-tsx-layout-split` 为 Wave 1A 窄子任务
  - 不扩展 `T-012` scope，不把 Wave 1B/2/3/4 塞回 `T-012`

## Input sources and usage
| Source | Path/reference | Used for | Notes |
|---|---|---|---|
| User-approved execution plan | chat (2026-03-19) | 固化任务形态、波次、治理动作 | 本任务最高优先级输入 |
| Existing narrow split task | `dev-docs/active/app-tsx-layout-split/` | 确认 `T-012` 仅覆盖 App orchestration split | 作为 Wave 1A 复用基线 |
| Existing active tasks | `dev-docs/active/literature-management-flow/`, `dev-docs/active/topic-initial-pull-and-rule-preview/` | 避免误改其他任务状态或 scope | 仅引用，不改动 |
| Project governance contract | `.ai/project/CONTRACT.md`, `.ai/project/AGENTS.md`, `dev-docs/AGENTS.md` | 任务包结构、State 语法、sync/lint 顺序 | 本任务必须遵守 |
| Product requirements | `docs/project/overview/requirements.md` | 校验“长期维护”和“不可破坏现有行为”约束 | 仅作为约束背景 |
| Context registry/index | `docs/context/INDEX.md` | 明确 `openapi.yaml` / `schema.json` 是契约层，不作为首轮拆分目标 | 只定义排除边界 |

## Non-goals
- 不修改产品代码、业务语义、DB schema 或 REST 契约。
- 不在本任务中启动 Wave 1A/1B/2/3/4 的产品代码实施。
- 不修改 `T-011`、`T-012`、`T-013`、`T-014` 的状态、范围或 project 映射。
- 不把生成型 contract artifact 当作拆分对象：
  - `docs/context/api/openapi.yaml`
  - `docs/context/db/schema.json`
- 不把 `prisma/schema.prisma` 设为第一轮拆分目标。

## Candidate split inventory
| Priority | Candidate | Type | Planned wave | Why it is a candidate |
|---|---|---|---|---|
| P1 | `apps/desktop/src/renderer/App.tsx` | frontend container | Wave 1A | orchestration、state、props fan-out 过大 |
| P1 | `apps/desktop/src/renderer/literature/auto-import/AutoImportTab.tsx` | frontend view | Wave 1B | 多子视图、modal、portal、rule center 混装 |
| P1 | `apps/desktop/src/renderer/literature/auto-import/useAutoImportController.ts` | frontend controller | Wave 1B | 数据加载、表单、运行详情、命令处理集中 |
| P1 | `apps/desktop/src/renderer/literature/manual-import/useManualImportController.ts` | frontend controller | Wave 1B | upload、DEV seed、Zotero、review submit 混装 |
| P2 | `apps/desktop/src/renderer/literature/shared/normalizers.ts` | frontend utility | Wave 2 | 多域 normalizer/formatter/parse logic 杂糅 |
| P2 | `apps/desktop/src/renderer/styles/shell.css` | frontend style | Wave 2 | shell 与 feature 样式边界混杂 |
| P2 | `apps/desktop/src/renderer/styles/literature-auto-import.css` | frontend style | Wave 2 | topic/rule/runs 多块样式混装 |
| P2 | `apps/desktop/src/renderer/styles/literature-manual-import.css` | frontend style | Wave 2 | upload/Zotero/review table 样式混装 |
| P3 | `apps/backend/src/services/auto-pull-service.ts` | backend service | Wave 3 | CRUD、orchestration、adapter、scoring、alerting 集中 |
| P3 | `apps/backend/src/services/literature-flow-service.ts` | backend service | Wave 3 | pipeline policy、stage execution、embedding/indexing 集中 |
| P3 | `apps/backend/src/repositories/prisma/prisma-literature-repository.ts` | backend repository | Wave 3 | core/pipeline/embedding/persistence 全揉在一个仓储 |
| P4 | `packages/shared/src/research-lifecycle/interface-field-contracts.ts` | shared contracts | Wave 4 | 多 bounded context 契约、schema 常量、barrel 导出集中 |

## Child-task policy
- Wave 0：
  - 当前总任务自身完成治理与盘点。
- Wave 1A：
  - 直接复用 `T-012 app-tsx-layout-split`。
- Wave 1B：
  - 已创建 `T-018 literature-container-controller-split-wave1`
- Wave 2：
  - 已创建 `T-017 frontend-normalizers-and-css-split-wave2`
- Wave 3：
  - 已创建 `T-016 backend-service-boundary-split-wave3`
- Wave 4：
  - 已创建 `T-019 shared-contract-decomposition-wave4`
- 规则：
  - 每次只启动一个波次任务或一个明确的并行子任务集合。
  - 任务包虽然已预创建，但每次真正进入实施前仍必须重新核对该包 entry gate、baseline 和 overlap 条件。
  - 已注册的 task bundle 仍需在状态变化后再次运行 `sync --apply`。

## Wave roadmap
### Wave 0 - Governance and inventory
- Objective:
  - 创建总任务包，登记 project hub，冻结拆分边界、波次和子任务策略。
- Scope:
  - `dev-docs/active/maintainability-file-split-governance/`
  - `.ai/project/main/registry.yaml`
  - `.ai/project/main/dashboard.md`
  - `.ai/project/main/feature-map.md`
  - `.ai/project/main/task-index.md`
- Acceptance:
  - 新任务已被 sync 分配 `T-xxx`
  - registry 和 derived views 已登记该任务
  - 文档已明确波次、候选文件、排除项、子任务策略
- Rollback:
  - 删除该任务目录后重新运行 `sync --apply`
  - 确认 registry 和 derived views 中该任务条目被清理

### Wave 1A - App orchestration split
- Objective:
  - 将 `App.tsx` 收敛为 orchestration layer。
- Scope:
  - 仅复用 `T-012`
  - `App.tsx`
  - `app-layout.css`
  - 必要的 shell/literature/module 出口整理
- Dependency:
  - 依赖 Wave 0 完成
- Acceptance:
  - `T-012` 的目标不发生扩 scope
  - App 保持现有对外行为不变
  - controller 与 tab 逻辑不并入 `T-012`
- Rollback:
  - 仅在 `T-012` 内回退 App orchestration 拆分

### Wave 1B - Frontend containers and controllers
- Objective:
  - 将文献管理前端的容器、控制器、视图边界分开。
- Scope:
  - `AutoImportTab.tsx`
  - `useAutoImportController.ts`
  - `useManualImportController.ts`
- Dependency:
  - 依赖 Wave 0 完成
  - SHOULD 在 Wave 1A 稳定后进入
- Acceptance:
  - prop fan-out 降低
  - 文案、交互、effect 时序、API path、class/data-ui 语义不变
- Rollback:
  - 逐文件回退到 wave 前边界

### Wave 2 - Frontend utilities and styles
- Objective:
  - 将 utility 和 CSS 组织成稳定的 feature 边界。
- Scope:
  - `normalizers.ts`
  - `shell.css`
  - `literature-auto-import.css`
  - `literature-manual-import.css`
- Dependency:
  - SHOULD 在 Wave 1A/1B 之后进入
- Acceptance:
  - normalizer 按 domain 拆分
  - CSS import order 与 cascade 行为稳定
  - selector 文本与 data-ui 语义保持兼容
- Rollback:
  - 恢复样式入口和原始 import order

### Wave 3 - Backend services and repositories
- Objective:
  - 将超大 service/repository 按职责边界拆分。
- Scope:
  - `auto-pull-service.ts`
  - `literature-flow-service.ts`
  - `prisma-literature-repository.ts`
- Dependency:
  - SHOULD 在前端边界收口后进入
- Acceptance:
  - REST path/method 不变
  - Prisma schema 不变
  - 持久化语义不变
- Rollback:
  - 保持兼容 facade 或回退为原 service/repository 入口

### Wave 4 - Shared contract decomposition
- Objective:
  - 将 shared contracts 拆成 bounded context 文件组。
- Scope:
  - `packages/shared/src/research-lifecycle/interface-field-contracts.ts`
- Dependency:
  - SHOULD 在 Wave 3 稳定后进入
- Acceptance:
  - 旧 barrel export 暂时保留兼容层
  - desktop/backend consumers 可渐进切换
- Rollback:
  - 回退到单文件 contract 入口，保留旧导出形态

## Public interface and compatibility policy
- Wave 0~3 默认不改：
  - REST API path/method
  - DB schema
  - shared DTO 外部语义
  - UI 文案与交互语义
- 允许改动的范围：
  - 内部模块边界
  - 文件位置
  - 组件/服务职责划分
  - 兼容 facade / barrel exports
- Wave 4 才允许做 shared contract 内部拆分，但必须保留兼容导出，直到 desktop/backend 全部迁移完毕。

## Excluded artifacts
- 以下文件是契约或生成产物，不作为当前拆分对象：
  - `docs/context/api/openapi.yaml`
  - `docs/context/db/schema.json`
  - `docs/context/api/api-index.json`
- `prisma/schema.prisma` 不进入第一轮拆分范围，除非后续单独立项。

## Default verification commands
### Governance
```bash
node .ai/scripts/ctl-project-governance.mjs sync --apply --project main
node .ai/scripts/ctl-project-governance.mjs lint --check --project main
```

### Frontend waves
```bash
pnpm --filter @paper-engineering-assistant/desktop typecheck
pnpm --filter @paper-engineering-assistant/desktop build
pnpm --filter @paper-engineering-assistant/desktop smoke:e2e
```

### Backend wave
```bash
pnpm --filter @paper-engineering-assistant/backend typecheck
pnpm --filter @paper-engineering-assistant/backend test
pnpm --filter @paper-engineering-assistant/shared typecheck
```

### Shared contract wave
```bash
pnpm --filter @paper-engineering-assistant/shared typecheck
pnpm --filter @paper-engineering-assistant/shared test
pnpm --filter @paper-engineering-assistant/backend typecheck
pnpm --filter @paper-engineering-assistant/desktop typecheck
```

## Current next step
- 所有规划子任务包已落地；下一步直接从实施序列中选择起点，推荐顺序为 `T-012 -> T-018 -> T-017 -> T-016 -> T-019`。
