# 00 Overview

## Status
- State: in-progress
- Next step: 作为 `T-021` 语义切换与题目卡迁移的后端基线，维持 v1 数据和服务链稳定，不再承担桌面工作台的产品设计主线。

## Goal
- 将 `topic-management` 从“内存型后端原型 + 空前端入口 + 漂移文档”收口为“可持久化、契约一致、可被现有桌面入口承接的稳定子系统”，并为 phase 2 UI/workbench 留出清晰边界。

## Non-goals
- 不在本批次交付完整桌面“选题管理工作台”。
- 不把现有 `topic settings` 页面直接扩展成完整选题工作台。
- 不在 v1 新增独立 topic-side `EvidenceReview` CRUD。
- 不公开 `TopicResearchRecord` 通用 API 或 timeline/read model。
- 不让系统直接替代人工做选题、价值评估或 promote 决策。

## Context
- `automated_topic_notes.md` 已形成明确设计主线：`TopicSeed -> EvidenceMap -> ValidatedNeed -> ResearchSlice -> TopicQuestion -> TopicValueAssessment -> TopicPackage`。
- 当前仓库已具备 `topic settings`、`literature scope`、`auto-pull`、`paper-project` 等外围能力；本批次已补齐选题决策中间层的 shared contract、backend route/controller/service/repository、Prisma schema/migration 与 HTTP 测试主链。
- `topic-management` 现状已不再是纯文档阶段：后端原型已落地，但此前仍存在三处缺口：title-card persistence strategy 未真正接通、OpenAPI/API-INDEX 仍描述旧平铺路径、桌面端仅有“选题管理”导航入口而无工作台内容。
- 现有 `topic-initial-pull-and-rule-preview` 任务聚焦 topic 检索配置与 rule preview，不覆盖本模块的 question/value/promotion 语义；该语义在 `T-021` 中进一步切换为 `retrieval-topics + title-cards`。
- 产品 requirements 明确项目不替代研究选题与学术判断，因此本模块必须保持 human-in-the-loop。
- 本任务包采纳 **EvidenceReview / NeedReview / ValueAssessment** 及 **common envelope** 作为 LLM 自审产物的契约基线；v1 进一步收敛为“EvidenceReview 先走 literature-side bridge，NeedReview 以 `literature_ids + evidence_refs` 为权威输入”，避免在 topic side 过早复制第二套证据真相层。

## Acceptance criteria (high level)
- [x] `dev-docs/active/automated-topic-management/` 包含 `roadmap + 00~05 + .ai-task.yaml`。
- [x] roadmap 明确记录模块边界、MVP 闭环、后置增强项和关键 open questions。
- [x] `01-plan.md` 将后续工作拆成可执行阶段，并区分 planning / implementation / enhancement。
- [x] `02-architecture.md` 明确 `topic settings`、选题决策层、`paper-project` 三者边界。
- [x] `02-architecture.md` 已内嵌 LLM 自审契约（common envelope + 三份 template 关键字段）及与 EvidenceMap-core / ValidatedNeed / TopicValueAssessment 的对应关系。
- [x] 新任务已注册到项目治理索引并可通过 `sync/lint` 校验。
- [x] `TITLE_CARD_REPOSITORY=prisma` 已有真实仓储实现，不再 fallback 到 memory。
- [x] topic-management canonical write paths 以 nested routes 为准，OpenAPI/API-INDEX 已同步。
- [x] service/controller 错误语义已切换到 `AppError`，topic/profile/literature/cross-record 引用约束返回 `400 / 404 / 409 / 422`。
- [x] `CreateNeedReviewRequest` 已允许缺省 `evidence_review_refs`，并用测试覆盖 v1 契约。
- [x] 已明确把新的 `title-card` 语义和桌面工作台主实现迁移到 `T-021`，本任务仅保留后端 v1 基线与迁移来源角色。
