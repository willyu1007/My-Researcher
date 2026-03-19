# 00-overview

## Goal
- 建立长期维护导向的文件拆分治理方案、候选文件清单、波次顺序和子任务策略；补齐所有规划中的子任务包并完成逐包合同 review；再将整体方案同步到 project hub。

## Non-goals
- 不做业务语义变更。
- 不修改 REST/DB 契约。
- 不做视觉重设计。
- 不把生成型 contract artifact 作为拆分对象。
- 不在本任务中启动 Wave 1A/1B/2/3/4 的产品代码实施。

## Status
- State: done
- Next step: 从已准备好的实施任务中选择起始波次，推荐顺序为 `T-012 -> T-018 -> T-017 -> T-016 -> T-019`。

## Scope
- `dev-docs/active/maintainability-file-split-governance/`
- `dev-docs/active/literature-container-controller-split-wave1/`
- `dev-docs/active/frontend-normalizers-and-css-split-wave2/`
- `dev-docs/active/backend-service-boundary-split-wave3/`
- `dev-docs/active/shared-contract-decomposition-wave4/`
- `.ai/project/main/registry.yaml`
- `.ai/project/main/dashboard.md`
- `.ai/project/main/feature-map.md`
- `.ai/project/main/task-index.md`

## Locked decisions
- 使用治理路径：`project-orchestrator` + `project-sync-lint`
- 任务形态：总任务 + 后续子任务
- 项目挂载：`M-000 > F-000`
- 第一波实施策略：零行为变化优先
- 第一波实施层次：前端容器与控制层优先
- `T-012 app-tsx-layout-split` 保持窄边界，只承接 Wave 1A
- 已创建的后续子任务：
  - `T-018 literature-container-controller-split-wave1`
  - `T-017 frontend-normalizers-and-css-split-wave2`
  - `T-016 backend-service-boundary-split-wave3`
  - `T-019 shared-contract-decomposition-wave4`
- 所有子任务包均已完成首轮合同 review，并写入进入门槛与收口条件

## Explicit exclusions
- `docs/context/api/openapi.yaml`
- `docs/context/db/schema.json`
- `docs/context/api/api-index.json`
- `prisma/schema.prisma`（不作为第一轮拆分目标）

## Acceptance criteria
- [x] 新治理任务包已创建，覆盖 `roadmap.md` 与 `00~05` 文档。
- [x] project hub 已登记该任务，registry 与 derived views 可查询。
- [x] roadmap 已明确波次、候选文件、排除项、子任务策略。
- [x] 已明确 `T-012` 只作为 Wave 1A 窄子任务复用。
- [x] 未修改 `T-011`、`T-012`、`T-013`、`T-014` 的状态或 scope。
- [x] 已补建 `T-016`、`T-017`、`T-018`、`T-019` 四个规划子任务包。
- [x] 每个子任务包都已完成逐包合同 review，并记录关键进入门槛与兼容策略。
- [x] 已完成整体执行顺序与阻塞条件回顾，可直接支撑后续逐波实施。
