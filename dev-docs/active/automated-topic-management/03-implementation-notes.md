# 03 Implementation Notes

## Current state
- 当前阶段已进入产品代码实现，后端 v1 主链已可运行。
- 已落地的内容包括：shared contract 调整、topic-management service/controller/repository 重构、Prisma repository 接通、OpenAPI/API-INDEX 校正、route/service/integration/contract drift 测试补齐。
- 当前剩余缺口主要在 phase 2：桌面端 `TopicManagementModule` 工作台、literature-side evidence bridge，以及 topic -> paper 的结构化映射增强。

## Decisions made
- 决定新建复杂任务 `automated-topic-management`，不复用 `topic-initial-pull-and-rule-preview`。
- 决定把模块定位为 `topic settings` 与 `paper-project` 之间的中间决策层。
- 决定 MVP 先做四对象闭环，不先做完整 `EvidenceMap`。
- 决定 promotion 维持人工审批，不做自动立项。
- 采纳 EvidenceReview / NeedReview / ValueAssessment 及 common envelope 作为 LLM 自审产物的契约基线；契约内容（必填字段、三份 template 关键字段、对象对应、artifact landing strategy）已内嵌于 02-architecture，文档自包含、不依赖外部 schema 文件路径。
- 决定 v1 以 nested write paths 为唯一 canonical API 风格，保留 `/topics/{topicId}/questions/{questionId}/value-assessments` 及其下游 package 路径，不再维护旧的 topic-level 平铺写接口。
- 决定 `TopicResearchRecord` 在 v1 仅作为 Prisma 内部基座，不公开 `/topics/{topicId}/research-record`。
- 决定 `CreateNeedReviewRequest.evidence_review_refs` 改为可选；NeedReview v1 权威输入是 `literature_ids + evidence_refs`，EvidenceReview 对象化后置到 literature-side bridge。
- 决定所有 topic 写路径在 service 层统一做应用级强校验：topic profile 必须存在；literature/need/question/value/package 引用必须满足“存在 + 属于同一 topic + 状态可用”。
- 决定在 evidence bridge 落地前，`source_evidence_review_ids` 直接返回 `422 GATE_CONSTRAINT_FAILED`，避免 topic side 先行维护一套伪引用。

## Deviations from the initial design note
- 原始设计稿把完整链路写到了 `TopicSeed -> EvidenceMap -> ...`。
- 本任务包为保证首版可落地，明确将 `EvidenceMap` 完整化后置到增强阶段。
- 这不是推翻设计稿，而是对 Phase 1 / Phase 2 的执行顺序做了收敛。

## Integration notes（内嵌）
- **Repo 锚点**：Fastify 后端、Postgres、shared 契约包；route 校验 schema 来自 @paper-engineering-assistant/shared；repository 支持 memory 或 prisma。
- **文件落点**：packages/shared/src/research-lifecycle/topic-management-contracts.ts；apps/backend/src/routes/topic-management.ts、controllers/topic-management.controller.ts、services/topic-management.service.ts、repositories/topic-management.repository.ts。
- **路由注册**：`app.ts` 统一解析 topic-management store config；当 `TOPIC_REPOSITORY=prisma` 时，会把 research-lifecycle / literature / auto-pull 同步级联到 Prisma，并对 mixed-store 配置 fail-fast。service 额外注入 `TopicManagementReferenceGateway`，从 auto-pull repo 校验 topic profile、从 literature repo 校验 literature existence。
- **canonical route inventory**：`/topics/:topicId/need-reviews`、`/topics/:topicId/questions`、`/topics/:topicId/questions/:questionId/value-assessments`、`/topics/:topicId/questions/:questionId/value-assessments/:valueAssessmentId/topic-packages`、`/topics/:topicId/questions/:questionId/value-assessments/:valueAssessmentId/topic-package`、`/topics/:topicId/promotion-decisions`、`/topics/:topicId/promote-to-paper-project`。
- **错误语义（service/controller）**：输入缺失/条件缺失用 `400 INVALID_PAYLOAD`；topic 或引用对象不存在用 `404 NOT_FOUND`；archived/superseded 或 question/value/package 错位用 `409 VERSION_CONFLICT`；evidence bridge 未就绪、promotion gate 失败等用 `422 GATE_CONSTRAINT_FAILED`。
- **Promotion flow invariants（service 层强制）**：TopicQuestion 须引用至少一个 NeedReview 或 EvidenceReview；但 v1 暂只接受 NeedReview 作为可用上游。TopicValueAssessment 任一 hard gate 失败不得返回 promote；promotion decision verdict=promote 须含 package_id 与 target_paper_title；promote-to-paper-project 须 question_id、value_assessment_id、package_id 对齐、hard gates 全过、至少一个 selected_literature_evidence_id。
- **v1 存储**：EvidenceReview 继续存 LiteraturePipelineArtifact.payload（stageCode=evidence_review, artifactType=llm_review）；NeedReview/Question/ValueAssessment/Package 使用 `TopicResearchRecord + child table` 双表持久化；PromotionDecision 独立表持久化。
- **Prisma repository 形态**：采用事务式两步写入，先写 `TopicResearchRecord`，再写 child row；避免依赖复杂 nested create typing，同时保证重启后 topic records 可读回。
- **topic_id FK 决策**：`topic_id` 维持逻辑外键，不对 `TopicProfile` 建真实 FK；一致性由应用层强校验承担。

## Phase 3 实现决策（2025-03）

- **参考制品路径**：`C:\Users\Administrator\Downloads\topic_management\` 下 `topic_management_impl_bundle`、`topic_management_contract_bundle`、`topic_management_test_bundle`；契约与实现迁入 repo，测试迁入并调整 import 为 `@paper-engineering-assistant/shared` 与 `.js` 路径。
- **API 结构**：采用嵌套路径，如 `/topics/:topicId/questions/:questionId/value-assessments`、`/topics/:topicId/questions/:questionId/value-assessments/:valueAssessmentId/topic-package`，与参考一致。
- **数据模型**：采用 unified record 设计（topic_research_records、topic_questions 等表），见 `prisma/schema.prisma` 与 migration `20260318120000_topic_management_v1`。
- **topic_id FK**：`topic_id` 采用逻辑外键，未建 FK 到 TopicProfile；migration 注释中已说明，决策记录于本段。
- **Promotion 流程**：先实现单端点 `POST /topics/:topicId/promote-to-paper-project`，通过 `PaperProjectGateway` 调用现有 `createPaperProject`；未拆 verify/commit 两步。
- **Promotion 失败补偿**：`promote-to-paper-project` 仍是跨 service 边界的两步操作，但现在若 `createPromotionDecision` 失败，会调用 `deletePaperProject` 补偿删除刚创建的 paper；若补偿自身失败，则返回 `500 INTERNAL_ERROR` 并附带 `created_paper_id / original_error / rollback_error` 细节。未来若 paper lifecycle 与 topic-management 合并到同一事务边界，再考虑升级为真正事务式提交。
- **契约漂移治理**：新增 contract drift test，要求 route source 与 `docs/context/api/openapi.yaml` 的 canonical topic-management paths 同步；并用 `ctl-api-index` 重建 `API-INDEX.md` / `api-index.json`。

## Open follow-ups
- 实现桌面端 phase 2：独立 `TopicManagementModule`，先做最薄工作台（topic 选择、need/question/value/package/promotion 列表与创建动作、当前状态摘要）。
- 在 literature 侧实现 evidence bridge：提供可解析的 evidence-review 载荷与读取接口，再把其 id 正式桥接到 `evidence_review_refs` / `source_evidence_review_ids`。
- 继续细化 `TopicPackage -> createPaperProject` 的结构化 payload 映射，优先考虑 `main_question`、`contribution_hypothesis`、`value_assessment_summary`、`top_reviewer_objections` 的落点。
- 将 `TopicPackage` 对 `paper-project` 的桥接从“仅 literature ids”扩展成更完整的结构化 payload，优先考虑 `main_question`、`contribution_hypothesis`、`value_assessment_summary`、`top_reviewer_objections` 的落点。
