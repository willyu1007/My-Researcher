# Topic Management Workbench UI Roadmap

## Decision
- New complex task: `T-021 topic-management-workbench-ui`
- Mapping: `M-001 > F-001 > R-009`
- Primary goal: 建立独立 `TitleCardManagementModule`，以桌面端工作台承接 `title-card` 选题决策链，并完成 `retrieval-topics + title-cards` 公开语义切换。

## Why this is a separate task
- `T-014 automated-topic-management` 已经承担了 topic-management backend v1 的基线工作。
- 本轮新增了语义重构、工作台 UI、evidence bridge、read model、governance gate 覆盖修复，范围已经明显超过 `T-014`。
- 将 UI 工作台独立建包，可以让：
  - `T-014` 保持后端基线职责稳定
  - `T-021` 以题目卡工作台和公开语义切换为中心组织实施和验收

## Phases
1. Semantic rewrite and governance mapping
2. Shared contracts / backend API switch
3. Title-card persistence and evidence basket
4. Entry page and single-title workflow workbench
5. Promotion closure and UI governance coverage
6. Verification and handoff

## Phase outcomes
- Phase 1:
  - `T-021` 文档全部改写到 `retrieval-topics + title-cards`
  - registry 映射到 `R-009`
  - `T-014` 标注依赖与迁移来源关系
- Phase 2:
  - `title-cards` 公开契约、PATCH 语义与 canonical 路径明确
- Phase 3:
  - `TitleCard` 根实体、evidence basket 与全库 evidence candidates 可用
- Phase 4:
  - 入口页具备 `title-card` 列表、创建入口、跨题目摘要
  - 单题目流程 tab、详情检查器、编辑表单可用
- Phase 5:
  - 工作台内可直接 promotion 到 `paper-project`
  - UI governance gate 真正覆盖 desktop renderer
- Phase 6:
  - 自动化验证与手工闭环记录齐全

## Explicit defaults
- UI is desktop-only.
- Chinese copy remains the default.
- Editing semantics use current-record overwrite.
- Mutation flow uses authoritative reload.
- Token/contract changes are out of scope unless separately approved.
- Public naming uses `retrieval-topics`, `title-cards`, and `research_question_id`.

## Rollback
- 若任务命名或映射错误，可删除 `dev-docs/active/topic-management-workbench-ui/`，回退 registry 新增任务项后重新执行 `sync --apply`。
