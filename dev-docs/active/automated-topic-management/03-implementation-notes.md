# 03 Implementation Notes

## Current state
- 当前阶段未进入产品代码实现。
- 已完成的工作是：根据 `automated_topic_notes.md`、product requirements、现有 API/代码边界，创建任务包并登记治理映射。
- 已执行 project governance `sync --apply` 与 `lint --check`，新任务已进入 project hub。

## Decisions made
- 决定新建复杂任务 `automated-topic-management`，不复用 `topic-initial-pull-and-rule-preview`。
- 决定把模块定位为 `topic settings` 与 `paper-project` 之间的中间决策层。
- 决定 MVP 先做四对象闭环，不先做完整 `EvidenceMap`。
- 决定 promotion 维持人工审批，不做自动立项。
- 采纳 EvidenceReview / NeedReview / ValueAssessment 及 common envelope 作为 LLM 自审产物的契约基线；契约内容（必填字段、三份 template 关键字段、对象对应、artifact landing strategy）已内嵌于 02-architecture，文档自包含、不依赖外部 schema 文件路径。

## Deviations from the initial design note
- 原始设计稿把完整链路写到了 `TopicSeed -> EvidenceMap -> ...`。
- 本任务包为保证首版可落地，明确将 `EvidenceMap` 完整化后置到增强阶段。
- 这不是推翻设计稿，而是对 Phase 1 / Phase 2 的执行顺序做了收敛。

## Integration notes（内嵌）
- **Repo 锚点**：Fastify 后端、Postgres、shared 契约包；route 校验 schema 来自 @paper-engineering-assistant/shared；repository 支持 memory 或 prisma。
- **文件落点**：packages/shared/src/research-lifecycle/topic-management-contracts.ts；apps/backend/src/routes/topic-management.ts、controllers/topic-management.controller.ts、services/topic-management.service.ts、repositories/topic-management.repository.ts。
- **路由注册**：app.ts 中按 paper-project 模式注册；resolve repository strategy -> instantiate service -> instantiate controller -> register routes with shared schemas。
- **Promotion flow invariants（service 层强制）**：TopicQuestion 须引用至少一个 NeedReview 或 EvidenceReview；TopicValueAssessment 任一 hard gate 失败不得返回 promote；promotion decision verdict=promote 须含 package_id 与 target_paper_title；promote-to-paper-project 须 question_id、value_assessment_id、package_id 对齐、hard gates 全过、至少一个 selected_literature_evidence_id。
- **v1 存储**：EvidenceReview 存 LiteraturePipelineArtifact.payload（stageCode=evidence_review, artifactType=llm_review）；NeedReview/Question/ValueAssessment/Package/PromotionDecision 用 topic-level 表。
- **迁移前确认**：topic_id 的 FK 目标（dedicated topic 表 vs 逻辑外键）；EvidenceReview v1 是否仅存 literature 侧。

## Phase 3 实现决策（2025-03）

- **参考制品路径**：`C:\Users\Administrator\Downloads\topic_management\` 下 `topic_management_impl_bundle`、`topic_management_contract_bundle`、`topic_management_test_bundle`；契约与实现迁入 repo，测试迁入并调整 import 为 `@paper-engineering-assistant/shared` 与 `.js` 路径。
- **API 结构**：采用嵌套路径，如 `/topics/:topicId/questions/:questionId/value-assessments`、`/topics/:topicId/questions/:questionId/value-assessments/:valueAssessmentId/topic-package`，与参考一致。
- **数据模型**：采用 unified record 设计（topic_research_records、topic_questions 等表），见 `prisma/schema.prisma` 与 migration `20260318120000_topic_management_v1`。
- **topic_id FK**：`topic_id` 采用逻辑外键，未建 FK 到 TopicProfile；migration 注释中已说明，决策记录于本段。
- **Promotion 流程**：先实现单端点 `POST /topics/:topicId/promote-to-paper-project`，通过 `PaperProjectGateway` 调用现有 `createPaperProject`；未拆 verify/commit 两步。
- **Promotion 原子性风险**：当前实现先调用 `createPaperProject` 再写入 `createPromotionDecision`。若第二步失败会导致“已立项但无 promotion 记录”。引入 Prisma 时须用事务或“先写 decision 再创建 paper、失败时回滚/标记”保证一致；InMemory 场景下可接受。

## Open follow-ups
- 与用户继续讨论并确认 MVP 边界和命名：
  - `topic-assessment`
  - `topic-workspace`
  - `direction-pool`
- 继续细化 `TopicPackage -> createPaperProject` 的 payload 映射。
- 确认 requirement / feature 语义是否足够稳定，或后续需要单独抽出 topic selection feature。
- 若将 JSON Schema 迁入 repo：确认契约 SSOT 的正式存放位置及与 docs/context、API/DB 的集成方式（当前以 02-architecture 内嵌为准）。
