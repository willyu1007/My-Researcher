# 00 Overview

## Status
- State: in_progress
- Next step: 基于 roadmap Phase 2 交付物，与用户收敛 MVP 边界细节并准备 Phase 3 实现拆分。

## Goal
- 为“选题管理模块”建立完整的规划与 handoff 基线，明确它作为 `topic settings` 与 `paper-project` 之间中间决策层的定位，并产出可直接指导后续实现拆分的任务文档。

## Non-goals
- 不在当前任务中直接实现前后端代码、数据库迁移或 API 改动。
- 不把现有 `topic settings` 页面直接扩展成完整选题工作台。
- 不在当前阶段承诺完整 `EvidenceMap` 图谱或自动化多 agent 编排。
- 不让系统直接替代人工做选题、价值评估或 promote 决策。

## Context
- `automated_topic_notes.md` 已形成明确设计主线：`TopicSeed -> EvidenceMap -> ValidatedNeed -> ResearchSlice -> TopicQuestion -> TopicValueAssessment -> TopicPackage`。
- 任务包已内嵌后端契约（Prisma 枚举与模型草案、OpenAPI 端点、状态机、artifact 生命周期、promotion gate 规则、稳健性建议）、实现集成说明、测试矩阵与清单；全部落于 02/03/04，无外部路径引用。
- 当前仓库已具备 `topic settings`、`literature scope`、`auto-pull`、`paper-project` 等外围能力，但缺失选题决策中间层。
- 现有 `topic-initial-pull-and-rule-preview` 任务聚焦 topic 检索配置与 rule preview，不覆盖本模块的 question/value/promotion 语义。
- 产品 requirements 明确项目不替代研究选题与学术判断，因此本模块必须保持 human-in-the-loop。
- 本任务包采纳 **EvidenceReview / NeedReview / ValueAssessment** 及 **common envelope** 作为 LLM 自审产物的契约基线；Phase 2 在 `02-architecture.md` 中写出对象与上述契约的字段级对应及落地策略，文档自包含、不依赖外部 schema 文件路径。

## Acceptance criteria (high level)
- [x] `dev-docs/active/automated-topic-management/` 包含 `roadmap + 00~05 + .ai-task.yaml`。
- [x] roadmap 明确记录模块边界、MVP 闭环、后置增强项和关键 open questions。
- [x] `01-plan.md` 将后续工作拆成可执行阶段，并区分 planning / implementation / enhancement。
- [x] `02-architecture.md` 明确 `topic settings`、选题决策层、`paper-project` 三者边界。
- [x] `02-architecture.md` 已内嵌 LLM 自审契约（common envelope + 三份 template 关键字段）及与 EvidenceMap-core / ValidatedNeed / TopicValueAssessment 的对应关系。
- [x] 新任务已注册到项目治理索引并可通过 `sync/lint` 校验。
