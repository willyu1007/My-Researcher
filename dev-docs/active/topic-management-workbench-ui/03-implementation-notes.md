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
