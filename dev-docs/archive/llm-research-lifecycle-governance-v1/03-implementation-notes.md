# 03 Implementation Notes

## Status
- Current status: `done`
- Last updated: 2026-02-22

## What changed
- 新建任务 `llm-research-lifecycle-governance-v1`。
- 生成 `roadmap.md`，将 8 模块组织为 4 阶段执行主线。
- 在架构文档中引入模块 4 到 7 的 Version Spine 与 lineage 字段约束。
- 执行 project governance `sync --apply`，新任务已注册到 hub 派生视图。
- 执行 governance `lint --check`，通过并识别到历史遗留 warning（T-001 归档路径缺失）。
- 新增跨任务单写者契约，明确 `T-002` 与 `T-003` 的 SSOT 边界。
- 新增 `07-value-gate-dictionary.md`，定义 `Stage DAG + Value Gate` 统一词典。
- 将词典接入 roadmap/plan/architecture/overview，形成统一治理入口。
- 参考外部文档 `自动科研助手.md`，补充全局固定维度与模块扩展维度建议，并形成 reviewer-aligned 证据包要求。
- 按用户确认，将评分策略收敛为“LLM 全局统一默认值 + 允许手动调整（带审计）”。
- 按用户确认，固化配置生效与回滚策略：`effective_from=next_gate_window`，回滚分级执行（stage 自动守护，paper/global 人工审批）。
- 按用户确认，固化三层版本命名策略：`P-M-B-N`（工作节点）、`SP-*`（冻结快照）、`Rx.y.z`（发布标签）。
- 按用户确认，固化并行冻结策略：采用快照冻结 `SP-partial/SP-full`，并引入兼容性约束组装快照。
- 按用户确认，固化 M7 双分支契约：`with_m6/no_m6`，并为 `no_m6` 定义更严格阈值与写作约束。
- 补充并行线程执行建议：为节点治理加入 `lane_id/attempt_id`，并采用 `paper_active_sp_full` 指针切换作为回滚/晋级执行面。
- 输出 `08-interface-field-contracts.md`，将治理规则细化为 REST 字段契约、事件 payload、错误模型与接口层 R/C/F 约束。
- 在 `packages/shared` 新增 research lifecycle 合同代码：TypeScript DTO、JSON-schema 风格对象、`no_m6` 最小校验函数与版本命名格式校验函数。
- 在 `apps/backend` 新增 Fastify 实现（routes/controllers/services 分层），并将 shared schema 接入 4 个契约路由。
- 在 backend service 实现 `paper_active_sp_full/paper_active_sp_partial` 指针切换逻辑（切换指针，不改写快照内容）。
- 新增 backend 统一错误映射：schema 验证失败统一返回 `INVALID_PAYLOAD`，业务异常返回结构化 `error.code/message`。
- 新增 backend 自动化测试基线（Node test runner）：service 单测 + 路由集成测试，覆盖 happy path 与关键失败场景。
- 将 backend service 改为 repository 注入，新增 `InMemoryResearchLifecycleRepository` 与 `PrismaResearchLifecycleRepository` 两种实现。
- 新增 Prisma SSOT：`prisma/schema.prisma` 与初始化 migration SQL，并已执行开发库 migration（`20260222120000_init_research_lifecycle`）。
- `buildApp` 支持通过 `RESEARCH_LIFECYCLE_REPOSITORY=prisma|memory` 切换后端存储策略。
- 完成 Prisma 模式在线烟测：以临时 schema 执行 `migrate deploy` + backend 全量测试（8/8），并在验证后自动清理 schema（避免污染长期环境）。
- 修复 Prisma 在线烟测执行路径问题：统一使用 `pnpm --filter @paper-engineering-assistant/backend ...` 在 backend workspace 运行 `ts-node/esm`，避免 root 目录 loader 解析失败。
- 通过 project governance 显式映射任务语义：新增 `M-001`（milestone）/`F-001`（feature）/`R-001`（requirement），并将 `T-003` 从 Inbox（`M-000/F-000`）迁移到 `M-001/F-001/R-001`。
- 新增可复用 CI 脚本 `ci/scripts/prisma-smoke.mjs`：自动创建临时 schema、执行 `prisma migrate deploy`、在 `RESEARCH_LIFECYCLE_REPOSITORY=prisma` 下运行 backend 测试，并在结束后执行 schema 清理。
- 重构 `.github/workflows/ci.yml` 为当前仓库可执行基线：`governance-lint` + `backend-checks` + `prisma-smoke`（Postgres service + artifact 上传）。
- 在 root `package.json` 增加脚本 `ci:prisma-smoke`，统一本地/CI 调用入口。
- 补齐历史归档任务路径：新增 `dev-docs/archive/unify-ci-verify-entrypoint/`（`T-001`），消除 governance `lint` 中缺失 `dev_docs_path` warning。

## Files/modules touched (high level)
- `dev-docs/active/llm-research-lifecycle-governance-v1/roadmap.md`
- `dev-docs/active/llm-research-lifecycle-governance-v1/00-overview.md`
- `dev-docs/active/llm-research-lifecycle-governance-v1/01-plan.md`
- `dev-docs/active/llm-research-lifecycle-governance-v1/02-architecture.md`
- `dev-docs/active/llm-research-lifecycle-governance-v1/03-implementation-notes.md`
- `dev-docs/active/llm-research-lifecycle-governance-v1/04-verification.md`
- `dev-docs/active/llm-research-lifecycle-governance-v1/05-pitfalls.md`
- `dev-docs/active/llm-research-lifecycle-governance-v1/06-task-boundary-and-anti-drift.md`
- `dev-docs/active/llm-research-lifecycle-governance-v1/07-value-gate-dictionary.md`
- `dev-docs/active/llm-research-lifecycle-governance-v1/08-interface-field-contracts.md`
- `packages/shared/src/research-lifecycle/interface-field-contracts.ts`
- `packages/shared/src/research-lifecycle/index.ts`
- `packages/shared/src/index.ts`
- `packages/shared/package.json`
- `packages/shared/tsconfig.json`
- `packages/shared/README.md`
- `apps/backend/package.json`
- `apps/backend/tsconfig.json`
- `apps/backend/src/app.ts`
- `apps/backend/src/server.ts`
- `apps/backend/src/errors/app-error.ts`
- `apps/backend/src/controllers/research-lifecycle-controller.ts`
- `apps/backend/src/routes/research-lifecycle-routes.ts`
- `apps/backend/src/services/research-lifecycle-service.ts`
- `apps/backend/src/services/research-lifecycle-service.unit.test.ts`
- `apps/backend/src/routes/research-lifecycle-routes.integration.test.ts`
- `apps/backend/src/repositories/research-lifecycle-repository.ts`
- `apps/backend/src/repositories/in-memory-research-lifecycle-repository.ts`
- `apps/backend/src/repositories/prisma/prisma-client.ts`
- `apps/backend/src/repositories/prisma/prisma-research-lifecycle-repository.ts`
- `apps/backend/README.md`
- `prisma/schema.prisma`
- `prisma/migrations/20260222120000_init_research_lifecycle/migration.sql`
- `prisma/migrations/migration_lock.toml`
- `dev-docs/active/llm-research-lifecycle-governance-v1/.ai-task.yaml`
- `.ai/project/main/registry.yaml`
- `.ai/project/main/dashboard.md`
- `.ai/project/main/feature-map.md`
- `.ai/project/main/task-index.md`
- `.github/workflows/ci.yml`
- `ci/scripts/prisma-smoke.mjs`
- `package.json`

## Decisions & tradeoffs
- Decision: 新建任务而不是复用 `paper-assistant-core-modules`。
  - Rationale: 本次需求新增“4 阶段 + 4~7 版本治理”强约束，属于独立规划增量。
  - Alternatives considered: 在原任务内追加 roadmap（被拒绝，原因是任务语义不够聚焦）。
- Decision: 先做治理文档，不做实现代码。
  - Rationale: 用户当前目标是任务与 roadmap 明确化。
  - Alternatives considered: 直接开工模块实现（被延后到后续任务）。
- Decision: 对 T-002/T-003 采用单写者模型，按主题拆分 SSOT。
  - Rationale: 避免同题双写造成边界和命名漂移。
  - Alternatives considered: 保持双边自由编辑；风险不可控，放弃。
- Decision: 采用 `Stage DAG + Value Gate` 作为 M4 到 M7 的治理模型。
  - Rationale: LLM 发散式尝试会形成多分支，线性流水线无法表达保留/淘汰/回流决策。
  - Alternatives considered: 仅保留里程碑推进；无法覆盖高频回流和价值判断，放弃。
- Decision: 采用“固定核心维度 + 模块扩展维度”的混合评分模型。
  - Rationale: 需要兼顾跨模块一致门禁和模块内差异化判断。
  - Alternatives considered: 纯固定维度（表达力不足）/纯扩展维度（不可比较，易漂移）。
- Decision: 当前默认研究方向为 LLM，启用全局统一 `core_score_vector` 默认配置。
  - Rationale: 先保证门禁一致性和实现简化，再按需局部调整。
  - Alternatives considered: 初始即按领域模板分裂配置；早期维护成本高，暂不采用。
- Decision: 默认生效时机采用 `next_gate_window`，并采用分级回滚执行权。
  - Rationale: 保证同批候选节点判定标准一致，同时控制高影响回滚风险。
  - Alternatives considered: 即时生效（易混用标准）、LLM 直接执行回滚（治理风险高）。
- Decision: 采用三层版本命名策略（机器追踪 + 冻结快照 + 人类可读发布）。
  - Rationale: 同时满足 LLM 高频分支治理与写作/投稿可读性。
  - Alternatives considered: 单层语义版号/单层递增版号；单一方案无法兼顾两类诉求。
- Decision: 冻结粒度采用快照清单（snapshot manifest），不依赖模块进度对齐。
  - Rationale: 并行线程下各线程模块位置不同，模块/阶段冻结会冲突。
  - Alternatives considered: 模块级冻结/阶段级冻结；并发场景一致性与可操作性不足。
- Decision: M6 可选缺省时，M7 采用双分支分析契约并显式标注 `spine_type`。
  - Rationale: 允许 training-free 路径同时保持门禁严谨与写作可解释性。
  - Alternatives considered: 单一 M7 契约；无法区分训练链路差异，风险高。
- Decision: 并行多线程治理采用“lane 元数据 + 快照指针切换”模型。
  - Rationale: 模块级/阶段级冻结无法覆盖并行线程不同步推进场景。
  - Alternatives considered: 继续依赖模块级冻结；在 M4~M7 并发下易产生冲突与误回滚。
- Decision: 先锁定“最小稳定接口字段集（v1 draft）”，实现阶段再扩展细分字段。
  - Rationale: 先保证治理一致性与接口边界清晰，降低一次性过度设计风险。
  - Alternatives considered: 直接进入 API 代码实现；在无字段契约前容易引入双写与语义漂移。
- Decision: DTO/schema 先落在 `packages/shared`，作为 backend route 层的单一输入源。
  - Rationale: 避免接口字段在 route/service/docs 三处重复维护。
  - Alternatives considered: 直接在 backend app 内定义；短期快但后续复用和治理一致性较差。
- Decision: backend 先采用 in-memory 存储推进验证。
  - Rationale: 当前目标是先打通路由验证和指针切换语义，避免过早引入数据库迁移复杂度。
  - Alternatives considered: 直接接入数据库；实现成本更高且不利于快速验证治理契约。
- Decision: 使用 Node 内置 test runner (`node:test`) 作为首轮测试框架。
  - Rationale: 零额外框架依赖、启动成本低，适合当前基础设施阶段的回归基线。
  - Alternatives considered: 引入 Vitest/Jest；功能更丰富但当前收益不高。
- Decision: 采用双仓储策略（memory/prisma）并通过环境变量切换。
  - Rationale: 在无 DB 写入审批前保持测试稳定（memory），同时具备可切换的 Postgres 持久化实现（prisma）。
  - Alternatives considered: 一次性切换到 Prisma-only；会阻塞当前自动化测试与本地无库环境验证。
- Decision: 将 `T-003` 显式映射到独立 Feature/Requirement，而不是继续停留在 Inbox。
  - Rationale: 使任务归属与后续优先级管理可追踪，避免长期挂在 `F-000` 造成治理漂移。
  - Alternatives considered: 维持 Inbox 映射；短期省事但不利于项目语义图维护与后续拆分。
- Decision: CI 采用“仓库可执行最小门禁”而非继续沿用通用模板套件。
  - Rationale: 现阶段仓库并无 Newman/Playwright/k6 对应脚本，模板化 job 会导致持续失败并掩盖真实回归信号。
  - Alternatives considered: 保留模板 job 并逐步补脚本；短期不可执行，不满足当前稳定门禁要求。

## Deviations from plan
- Change: 无偏离，按 roadmap + bundle 创建执行。
  - Why: N/A
  - Impact: N/A

## Known issues / follow-ups
- 需要后续在两任务执行中持续使用 `06-task-boundary-and-anti-drift.md` 做变更前检查。
- 需要在 GitHub 真实 runner 上完成首轮 CI 运行，验证 Postgres service 网络与 artifact 上传行为。
- `T-004` 已归档；桌面端后续增强建议新建独立任务承接（避免回写本任务）。

## Pitfalls / dead ends (do not repeat)
- Keep the detailed log in `05-pitfalls.md` (append-only).

## Completion note
- `T-007/T-008/T-009/T-010` 相关治理增量均已完成并归档，`T-003` 作为治理主干任务在本轮收口。
