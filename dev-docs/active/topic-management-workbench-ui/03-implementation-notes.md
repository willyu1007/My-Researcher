# 03 Implementation Notes

## Initial decisions
- 决定新建 `T-021 topic-management-workbench-ui`，而不是继续把 UI 细节并入 `T-014 automated-topic-management`。
- 决定把本任务从旧 `topic-root workbench` 改写为 `retrieval-topics + title-cards` 双对象语义。
- 决定把工作台定位为独立 `TitleCardManagementModule`，不挂在 `文献管理` 下。
- 决定首版工作方式为“入口页看队列，进入后单题目深入”，而不是 portfolio-first 工作台。
- 决定单题目页面采用 workflow 节点导航，并为每个节点提供详情检查器。
- 决定首版 UI 使用“直接覆写当前版”语义，不提供显式版本历史 UI。
- 决定本任务以桌面 UI 为主，但允许必要的后端 read model / detail / update / bridge 补齐。
- 决定把 literature-side evidence bridge 纳入本任务，并要求其可写入，而不是只读查看。
- 决定 promotion 在工作台内闭环，允许直接创建 `paper-project`。
- 决定把 desktop renderer 的 UI governance 覆盖修复纳入同任务，而不是留给后续单独治理任务。
- 决定公开 API 和文档采用单批切换，不保留旧 `topic_id` 作为公开兼容字段。
- 决定 `TitleCard` 不绑定 `retrieval-topic`，证据发现来自全库文献筛选而不是 topic-only 综览。
- 决定 legacy CSS 退役主权不继续留在本任务；在 gate 覆盖与绿灯达成后，后续 retirement 由 `T-022 desktop-legacy-css-retirement` 接管。
- 决定选题工作流导航对齐文献管理：一级/二级 tab 统一收口到 `Topbar`，不再保留模块内部 workflow tab 条。
- 决定 `主界面` 正式改名为 `总揽`。
- 决定跨模块共用的顶部 metrics strip 从 `选题管理 / 论文管理 / 写作中心` 等模块统一移除，而不是只在选题模块局部隐藏。

## Dependency notes
- 依赖 `T-014` 的既有 topic-management backend、OpenAPI 与测试基线，以及旧 `topicId` 数据作为迁移来源。
- 若实施中需要修改 `T-014` 已落地的后端实现，仍以 `T-021` 的产品目标和验收为主，不回退到“仅薄工作台”。

## Open implementation hooks
- 待实现时需明确 `TitleCard` list/detail 的返回 shape 与入口页摘要模型。
- 待实现时需明确 `detail` / `PATCH current record` 路由命名与 schema 位置。
- 待实现时需明确 evidence basket 与全库 evidence candidates 的字段边界。
- 待实现时需明确旧 `topicId` -> `titleCardId` 的回填与迁移执行方式。
- 待实现时需明确 legacy CSS exclusion 在 `T-022` 波次迁移中的回收顺序。

## Implemented in this phase
- `Topbar` 已扩展为支持 `选题管理` 的一级/二级 tab，结构对齐 `文献管理`。
- `TitleCardManagementModule` 已移除模块内部 workflow tab 条，改由顶栏状态驱动内容区。
- 一级 tab 固定为 `总揽 / Evidence / Need / Research Question / Value / Package / Promotion`。
- `Evidence / Need / Research Question / Value / Package / Promotion` 已分别落到对应的二级 tab 视图。
- `App.tsx` 里的共享顶部 metrics strip 已移除，不再对 `选题管理 / 论文管理 / 写作中心` 等模块渲染。
- review/fix 收尾中，已把模块导航回调从“`overview + 空字符串`”的隐式约定改成显式 primary/secondary handlers，避免后续实现继续依赖魔法值。
- 顶部 metrics strip 移除后，旧 `useDashboardMetrics` helper 已删除，避免保留只剩死逻辑的 shell 辅助层。

## Refactor wave: semantic drift + modularization
- 2026-03-25 启动新一轮结构性重构，目标是根除 `title-card` 工作台主链中的语义漂移，并降低超大文件对后续开发的阻力。
- 当前确认的漂移热点：
  - backend/public 语义已切到 `title-card`，但 route/controller/service/repository 文件名仍保留 `topic-management`。
  - Prisma schema 中子实体仍使用 `TopicResearchRecord / TopicQuestion / TopicNeedReview / TopicValueAssessment / TopicPackage / TopicPromotionDecision` 与 `topicId`。
  - desktop 入口文件 `TitleCardManagementModule.tsx` 已达约 1.4k LOC，service/repository 也已超过后续 feature 可安全演进的体量。
- 当前 dependency map（重构首批；以下 compat targets 已在 final cleanup pass 删除）：
  - shared:
    - `packages/shared/src/research-lifecycle/topic-management-contracts.ts`
  - backend entry:
    - `apps/backend/src/routes/topic-management.ts`
    - `apps/backend/src/controllers/topic-management.controller.ts`
    - `apps/backend/src/services/topic-management.service.ts`
    - `apps/backend/src/repositories/topic-management.repository.ts`
    - `apps/backend/src/repositories/prisma/prisma-topic-management-repository.ts`
  - desktop entry:
    - `apps/desktop/src/renderer/modules/TitleCardManagementModule.tsx`
    - `apps/desktop/src/renderer/App.tsx`
    - `apps/desktop/src/renderer/shell/components/Topbar.tsx`
- 本波次默认策略：
  - 先做结构重排和内部命名收敛，不主动改变公开 API 行为。
  - 如果 Prisma 物理命名改动会引出 DB 风险，优先使用 schema mapping 隔离物理层，不把“语义修正”升级为“数据库重建”。
  - desktop 以分视图、表单 helpers、数据 loader/controller 为拆分单位，不把单个大文件简单复制成多个同样臃肿的文件。

## Refactor wave outcomes
- shared contract 已新增 `title-card-management-contracts` 作为语义化主入口；旧 `topic-management-contracts` compat 文件与 shared public subpath 已删除。
- backend 已新增语义化入口文件：
  - `controllers/title-card-management.controller.ts`
  - `routes/title-card-management.ts`
  - `services/title-card-management.service.ts`
  - `repositories/title-card-management.repository.ts`
  - `repositories/prisma/prisma-title-card-management-repository.ts`
- 旧 `topic-management.*` backend 兼容入口已删除，避免新代码继续从旧命名扩散。
- `TitleCardManagementService` 已拆出：
  - `services/title-card-management/support.ts`
  - `services/title-card-management/guardrails.ts`
  - `services/title-card-management/read-models.ts`
- desktop `TitleCardManagementModule.tsx` 已从约 1.4k LOC 收敛为壳组件，并拆出：
  - `modules/title-card-management/types.ts`
  - `modules/title-card-management/utils.ts`
  - `modules/title-card-management/useTitleCardManagementController.ts`
  - `modules/title-card-management/TitleCardOverviewView.tsx`
  - `modules/title-card-management/TitleCardWorkflowView.tsx`
- OpenAPI title-card 相关 component schema 已同步从旧 `topic_id / record_id / question_id` 语义切到 `title_card_id / need_id / research_question_id / value_assessment_id / package_id`，并重生成 `api-index`。
- 当前剩余的语义遗留主要被收敛在 Prisma 持久化物理层与历史 migration 命名中；业务代码、shared contract、desktop workbench 与 OpenAPI 主路径/字段已对齐到 `title-card` 语义。

## Review-driven semantic fixes
- 2026-03-25 根据代码审查继续收口三类残留问题：
  - Prisma repository 新增 `title-card-management-normalizers.ts`，把 legacy `question / topic_package` 枚举值在 read boundary 统一归一化为 `research_question / package`，避免旧数据绕过新 contract。
  - `ResearchQuestion` 的上游证据字段从伪语义 `source_evidence_review_ids` 改为公开 canonical `source_literature_evidence_ids`，并同步 shared contract、service/repository、desktop 表单与 OpenAPI。
  - `title-card-management.contract-drift.test.ts` 从“只验路径”扩展到校验 OpenAPI component schema 的关键 required/enum/field，对齐 runtime schema。

## Final cleanup pass
- 2026-03-25 继续做 repo-local 清理，删除已无仓库内消费者的 compat wrapper：
  - `controllers/topic-management.controller.ts`
  - `services/topic-management.service.ts`
  - `repositories/topic-management.repository.ts`
  - `repositories/prisma/prisma-topic-management-repository.ts`
  - `routes/topic-management.ts`
  - `packages/shared/src/research-lifecycle/topic-management-contracts.ts`
- backend/shared 测试文件已全部迁到 `title-card-*` canonical 命名，避免当前验证层继续透出旧 bounded-context 术语。
- `app.ts` 内部 store config 命名已从 `resolveTopicManagementStoreConfig/topicStrategy` 收敛到 `resolveTitleCardManagementStoreConfig/titleCardStrategy`；`TOPIC_REPOSITORY` 仍作为兼容环境变量保留，不在本轮扩大为 env contract 变更。

## UIUX demo seed wave
- 2026-03-26 将选题管理 demo 数据并入 desktop 左下角既有“注入测试数据”按钮，不再保留 backend-only 的自动 seed 入口。
- 新增 `literature/manual-import/controllers/titleCardDemoInjection.ts`，点击按钮时通过公开 REST 路由创建三张题目卡：
  - Evidence 早期探索态
  - Need/Question/Value/Package/Promotion Decision 回环态
  - 完整 promote-to-paper-project 晋升完成态
- 为避免单文件继续膨胀，title-card demo 注入已拆成：
  - `titleCardDemoFixtures.ts`：样例语义与 payload fixture
  - `titleCardDemoApi.ts`：REST 读写包装
  - `titleCardDemoInjection.ts`：幂等 orchestration
- 同批补了独立 literature corpus、source provider 和 rights 差异，使 Evidence 候选列表在 UI 中具备更真实的 provider / rights 分布。
- backend `buildApp()` / `server.ts` 已删除 title-card demo auto-seed 逻辑与专用测试入口，避免出现“左下角按钮 + 开发启动自动灌数”两套注入链路并行的语义漂移。
- desktop 侧补了共享 refresh token 通知，左下角按钮注入完成后会主动刷新 `TitleCardManagementModule`，避免用户停留在“选题管理”时看不到刚注入的数据。
- Electron 主进程 `desktop:governance-request` 白名单已补入 `/title-cards`，否则 renderer 通过 desktop bridge 访问题目卡路由时会被误判为 unsupported path。
