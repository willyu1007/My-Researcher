# 01 Plan

## Phases
1. 任务语义改写与治理映射
2. 公共契约/API 切换与 title-card 根模型
3. 数据迁移与 evidence basket / candidates
4. 桌面端入口页与单题目流程工作台
5. UI governance 覆盖修复与 promotion 闭环
6. 综合验证、handoff 与收尾

## Detailed steps
- Phase 1:
  - 改写 `T-021` 文档，使公开语义从旧 `topic-root workbench` 收敛为 `retrieval-topics + title-cards`。
  - 将任务映射保持在 `M-001 > F-001 > R-009`。
  - 在文档中声明与 `T-014 automated-topic-management` 的依赖边界：
    - `T-014` 继续作为旧后端基线与迁移来源。
    - `T-021` 承担新的题目卡工作台、必要后端补齐和语义切换。
- Phase 2:
  - 切换公开资源名：
    - `topics/settings` 语义收敛为 `retrieval-topics`
    - 选题侧根资源切到 `title-cards`
  - 将 `NeedReview`、`ResearchQuestion`、`ValueAssessment`、`Package`、`PromotionDecision` 的公开字段统一切到 `title_card_id` / `research_question_id`。
  - 为 `TitleCard`、`NeedReview`、`ResearchQuestion`、`ValueAssessment`、`Package`、`PromotionDecision` 补齐 `detail + PATCH current record`。
- Phase 3:
  - 新增 `TitleCard` 根实体与 evidence basket 持久化。
  - 让旧 `topicId` 分组数据回填为 `TitleCard`：
    - 每个旧 `topicId` 生成一个 `TitleCard`
    - 旧 need/question/value/package/promotion 全部挂回对应 `titleCardId`
  - 新增全库 evidence candidates read model，支持关键词、年份、标签、pipeline readiness、rights/provider 与已选状态过滤。
- Phase 4:
  - 实现独立 `TitleCardManagementModule` 入口页，并将其命名为 `总揽` 一级 tab。
  - 顶栏一级 tab 固定为：`总揽 / Evidence / Need / Research Question / Value / Package / Promotion`。
  - 每个 workflow 一级 tab 可带二级 tab：
    - `Evidence`: `候选证据 / 证据篮 / 检查器`
    - `Need / Research Question / Value / Package`: `列表 / 表单-检查器`
    - `Promotion`: `决策 / 晋升`
  - 模块内容区不再保留内部 workflow tab 按钮，切换入口统一收口到顶栏。
  - mutation 后统一执行 authoritative reload，不做乐观更新。
  - Promotion tab 必须能直达 `promote-to-paper-project`，返回 `paper_id` 并给出明确反馈。
  - 删掉跨模块共用的顶部 metrics strip，不再为选题/论文/写作模块保留该视觉层。
- Phase 5:
  - 修复 UI governance gate scan root，覆盖 `apps/desktop/src/renderer`。
  - 使用现有 `data-ui` 合约和 Tailwind B1 layout-only 约束实现工作台。
  - 更新 OpenAPI / API index / context docs，使公开文档与代码语义一致。
  - 若实现过程中发现合约能力不足，必须走 approval gate，不得静默扩展 token/contract。
- Phase 6:
  - 执行 governance sync/lint。
  - 执行 shared/backend/desktop typecheck 和测试。
  - 执行 `ui_gate.py run --mode full` 与 `node .ai/tests/run.mjs --suite ui`。
  - 记录手工验收：从 `title-card` 创建、全库选证据，到 `promotion` 的桌面端完整闭环。

## Deliverables by phase
- Phase 1:
  - 改写后的任务包与依赖边界
- Phase 2:
  - `title-cards` 公开契约与 PATCH 语义
- Phase 3:
  - 数据迁移与 evidence basket / candidate read model
- Phase 4:
  - `title-card` 入口页、单题目流程页、检查器与编辑表单
- Phase 5:
  - 真实覆盖 desktop renderer 的 UI governance gate
- Phase 6:
  - 自动化验证记录与 handoff 说明

## Risks & mitigations
- Risk: 继续把“检索主题”和“选题题目”混为一谈，导致 IA 和 API 再次漂移。
  - Mitigation: 本任务先做语义切换，再做代码实现；公开命名统一采用 `retrieval-topics + title-cards`。
- Risk: “接近完整台”被误解为 portfolio-first 大型产品台。
  - Mitigation: 冻结为“入口页看队列，进入后单题目深入”。
- Risk: 直接覆写当前版导致审计与回溯完全丢失。
  - Mitigation: 首版 UI 不展示显式版本历史，但实现仍应保留最小审计能力。
- Risk: UI gate 未覆盖 desktop renderer，导致验收失真。
  - Mitigation: 将 scan root 修复列为同任务内强制项。
- Risk: evidence bridge 与 UI 同时推进造成范围爆炸。
  - Mitigation: bridge 只做 `title-card` 首版所需的读取和可写入桥接，不扩展为完整 literature artifact 台。

## Step-level acceptance criteria
- 每一 phase 都必须明确：
  - 输入依赖
  - 输出工件
  - 验证方式
- 实施阶段不得重新拍板以下事项：
  - 公开对象边界（`retrieval-topic` vs `title-card`）
  - 信息架构位置
  - 主视图形态
  - 覆写语义
  - promotion 深度
  - governance gate 覆盖要求
