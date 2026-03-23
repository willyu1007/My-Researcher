# 00 Overview

## Status
- State: in-progress
- Next step: 在具备 `DATABASE_URL` 的环境执行 Prisma migration/apply，补跑 legacy data backfill，并完成这轮顶栏 tab 的手工验收。

## Goal
- 交付一个桌面端、独立模块化的“选题题目管理工作台”。
- 公开语义从混用的 `topic` 拆成两类对象：
  - 文献侧上游对象：`retrieval-topics`，中文统一叫“检索主题”
  - 选题侧根对象：`title-cards`，中文统一叫“选题题目”
- `title-card` 是选题流程根对象，不绑定任何 `retrieval-topic`；题目卡从全库文献中检索/筛选证据，自己维护 evidence basket，再派生 `Need / Research Question / Value / Package / Promotion`。
- `总揽` 负责 `title-card` 列表、创建入口与跨题目待办摘要；进入单个题目后，工作流通过顶栏一级/二级 tab 组织：
  - 一级 tab：`总揽 / Evidence / Need / Research Question / Value / Package / Promotion`
  - 二级 tab：按节点继续细分为候选/篮子/检查器或列表/表单等子视图
- 保持人工主导：用户可直接创建和修订核心对象，并在工作台内直接完成 `promote-to-paper-project`。

## Non-goals
- 不交付 `apps/frontend` 的 web-only 前端。
- 不在首版暴露显式版本历史 UI。
- 不把工作台继续挂回 `文献管理` 子页，也不把“检索主题”误当作选题流程根对象。
- 不把 task 目标降级为“只读 title-card dashboard”。
- 不用手工验收替代 UI governance gate。
- 不在本轮给 `retrieval-topic` 和 `title-card` 增加持久化绑定关系。

## Context
- 现有 [automated-topic-management](/Volumes/DataDisk/Project/My-Researcher/dev-docs/active/automated-topic-management/00-overview.md) 已完成后端 v1 主链、Prisma 接通、topic-management nested routes 与基础测试，但该任务的语义仍以旧 `topicId` 为根，且明确把桌面端工作台后置。
- 本任务已完成 shared contract、OpenAPI/API-INDEX、backend routes/controller/service/repository、desktop module 与 project docs 的公开语义切换，公开对象统一为 `retrieval-topics + title-cards`。
- 桌面端现在已有独立 `TitleCardManagementModule`，并已接入“选题管理”主模块入口。
- 当前实施将把选题工作流 tab 从模块内容区内迁移到 `Topbar`，对齐文献管理的顶栏导航模式。
- `source_evidence_review_ids` 已不再被 schema 层直接拒绝；service 以题目卡 evidence basket 作为最小 bridge 约束面。
- UI governance gate 已覆盖 `apps/desktop/src/renderer`，并已通过 time-bounded exception 将历史 feature CSS 目录排除出 scan root；当前 gate 已绿，新增模块与现存 TSX 入口违规都已收口。
- 非文献管理模块共用的顶部 metrics strip 将被移除，避免选题/论文/写作模块继续占用无意义的顶部视觉。

## High-level acceptance criteria
- [x] 新任务包完整创建并注册到 project hub。
- [x] 任务文档明确冻结 `retrieval-topics + title-cards` 语义、IA、主视图、覆写语义、evidence bridge 范围与 promotion 深度。
- [x] 文档明确本任务复用 `T-014` 的后端基线，但不再把 UI 细节并回 `T-014`。
- [x] 文档明确 UI 为主任务，但允许必要的后端补齐。
- [x] 文档中预置可执行的验证命令与手工闭环场景。
- [x] 文档明确本轮采用公开语义单批切换，不保留旧 `topic_id` 作为公开兼容字段。
- [x] shared contract、OpenAPI/API index、backend canonical routes、desktop module 已完成同批切换。
- [x] Prisma SSOT 已新增 `TitleCard` 根表、evidence basket 持久化表，以及旧 topic-management 数据回填 migration。
