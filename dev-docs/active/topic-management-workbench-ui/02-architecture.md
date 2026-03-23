# 02 Architecture

## Purpose
- 冻结“选题题目管理工作台”首版的产品边界、信息架构、后端补齐范围与治理约束，使后续实现不再需要重新做产品决策。

## Architectural position
- 上游依赖：
  - `retrieval-topics / 检索主题`
  - literature overview / scope
  - literature-side `EvidenceReview`
  - `T-014` 已落地的 topic-management 后端主链与旧 `topicId` 数据
- 中间层（本任务实现主体）：
  - 独立 `TitleCardManagementModule`
  - `TitleCard` 根实体
  - evidence basket / evidence candidate read model
  - detail/update APIs
  - evidence bridge 可写入
- 下游：
  - `promote-to-paper-project`
  - `paper-project`
  - UI governance gate

## Frozen semantics
- `retrieval-topics` 是文献侧对象，只负责拉取范围、规则、筛选配置。
- `title-cards` 是选题侧根对象，中文统一叫“选题题目”。
- `ResearchQuestion` 是题目卡下的独立子节点，中文统一叫“研究问题”。
- 首版不保留旧 `topic_id` 作为公开兼容字段。
- 允许内部实现保留部分旧技术名，但所有公开 API、文档、桌面 UI 文案必须切到新术语。

## Frozen IA
- `选题管理` 必须是独立主模块，不挂到 `文献管理` 子页。
- 首屏必须是 `总揽` 一级 tab，而不是直接进入单题目页面。
- `总揽` 职责：
  - `title-card` 列表
  - 新建题目卡
  - 跨题目待办/风险/晋升摘要
  - 进入单题目工作台
- 进入题目卡后，必须是单题目深入工作台，而不是跨题目 portfolio 台。
- 选题工作流切换入口固定放在 `Topbar`，不放在 `TitleCardManagementModule` 内容区内部。

## Frozen workflow
- 顶栏一级 tab 固定为：
  - `总揽`
  - `Evidence`
  - `Need`
  - `Research Question`
  - `Value`
  - `Package`
  - `Promotion`
- workflow 一级 tab 可带二级 tab：
  - `Evidence`: `候选证据 / 证据篮 / 检查器`
  - `Need / Research Question / Value / Package`: `列表 / 表单-检查器`
  - `Promotion`: `决策 / 晋升`
- 模块内部不再保留第二套 workflow tab 按钮。
- 若当前没有活动题目卡，workflow 一级 tab 只展示空态引导，要求用户回到 `总揽` 先选择题目卡。

## Frozen editing semantics
- 首版 UI 按“直接覆写当前版”设计。
- 首版不展示显式版本历史或版本切换器。
- 首版仍应允许实现层保留最小审计能力，但不作为 UI 交互中心。
- 所有 mutation 完成后必须 authoritative reload，避免本地状态漂移。

## Backend/API baseline for this task
- 本任务采用公开语义单批切换：
  - 文献侧对象统一为 `retrieval-topics`
  - 选题侧对象统一为 `title-cards`
- 首版必须新增或切换以下公开路径：
  - `GET/POST /title-cards`
  - `GET/PATCH /title-cards/{titleCardId}`
  - `GET/PATCH /title-cards/{titleCardId}/evidence-basket`
  - `GET /title-cards/{titleCardId}/evidence-candidates`
  - `GET/POST /title-cards/{titleCardId}/needs`
  - `GET/PATCH /title-cards/{titleCardId}/needs/{needId}`
  - `GET/POST /title-cards/{titleCardId}/research-questions`
  - `GET/PATCH /title-cards/{titleCardId}/research-questions/{researchQuestionId}`
  - `GET/POST /title-cards/{titleCardId}/value-assessments`
  - `GET/PATCH /title-cards/{titleCardId}/value-assessments/{valueAssessmentId}`
  - `GET/POST /title-cards/{titleCardId}/packages`
  - `GET/PATCH /title-cards/{titleCardId}/packages/{packageId}`
  - `GET/POST /title-cards/{titleCardId}/promotion-decisions`
  - `GET/PATCH /title-cards/{titleCardId}/promotion-decisions/{decisionId}`
  - `POST /title-cards/{titleCardId}/promote-to-paper-project`
- 首版必须提供三类能力：
  - root/read model
    - 入口页跨题目队列与摘要
    - 单题目 summary/read-model
  - detail/update
    - `NeedReview`
    - `ResearchQuestion`
    - `ValueAssessment`
    - `Package`
    - `PromotionDecision`
  - evidence
    - 读取全库 evidence candidates
    - 维护题目卡 evidence basket
    - 允许 `source_evidence_review_ids` 进入 create/update

## Title-card root model
- `TitleCard` 是新的根实体，最小字段固定为：
  - `title_card_id`
  - `working_title`
  - `brief`
  - `status`
  - `created_at`
  - `updated_at`
- `TitleCard` 拥有持久化的 evidence basket。
- `Need / ResearchQuestion / Value / Package / Promotion` 都挂在 `title_card_id` 下，不再以旧 `topicId` 为根语义。
- `ResearchQuestion` 仍是独立子节点，不并入题目卡本体。
- 首版 `TitleCard` 不与 `retrieval-topic` 建立持久化绑定关系。

## Evidence architecture
- `Evidence` tab 首版深度固定为“选证据 + 检查器”。
- 候选证据来自全库文献 read model，不依赖 `/literature/overview?topic_id=...`。
- evidence candidates 至少支持：
  - keyword
  - year range
  - tags
  - pipeline readiness
  - rights/provider
  - 当前 `title-card` 已选/未选状态

## Desktop module constraints
- `TitleCardManagementModule` 必须沿用现有桌面端风格：
  - `requestGovernance`
  - normalizer / controller / view 分层
  - 中文 UI 文案
  - `data-ui` 合约
  - Tailwind B1 layout-only
- 不得在首版引入新组件库或绕开现有主题系统。
- 跨模块顶部 metrics strip 不是本模块的一部分；其删除在 `App.tsx` 层统一完成，而不是在模块内做视觉掩盖。

## Promotion depth
- 首版 Promotion 不是“只写 decision”。
- 工作台内必须可直接触达 `promote-to-paper-project`。
- Promotion 成功后必须回显 `paper_id` 与明确反馈。
- `422 / 404 / 409` 约束必须在 UI 中具象呈现，不得静默失败。

## Governance requirements
- 本任务必须修复 UI governance gate 对 desktop renderer 的扫描覆盖。
- 默认不修改 token/contract。
- 若现有 `data-ui` 角色无法表达目标界面，必须停下走 approval gate，不得在 feature code 中引入硬编码视觉逃逸。

## Dependency note
- `T-014` 是本任务的后端基线与迁移来源，不再承担 workbench UI 的详细设计与验收。
- 本任务可以修改 topic-management 相关后端代码，但这些修改的产品目标、验收与 handoff 以 `T-021` 为准。
