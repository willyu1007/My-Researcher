# 03 Implementation Notes

## Initial decisions
- 决定新建 `R-010 / T-022`，而不是继续把 legacy CSS 退役工作混入 `T-021`。
- 决定把 `apps/desktop/src/renderer/styles/**` 的官方身份固定为 frozen legacy compatibility layer。
- 决定 `app-layout.css` 继续作为唯一 legacy 聚合入口，直到后续迁移波次逐步删除 import。
- 决定本 tranche 只做“声明边界 + 硬冻结”，不做视觉迁移和样式删除。
- 决定冻结规则以“文档 + 治理口径”落地，不在本 tranche 引入 diff-based CI 阻断器。

## Dependency notes
- 依赖 `T-017 frontend-normalizers-and-css-split-wave2` 提供的历史聚合边界。
- 依赖 `T-021 topic-management-workbench-ui` 已完成的 desktop renderer gate coverage 与 legacy styles exclusion。
- 若后续要开始任一波次迁移，应在 `T-022` 下继续扩展或新增明确的后续迁移任务，而不是让功能任务顺手修改 legacy CSS。

## Tranche notes
- 本 tranche 的实现边界是：
  - 新 requirement / task 注册
  - repo docs / UI context / README / AGENTS 统一口径
  - 运行时入口注释
- 本 tranche 的非目标是：
  - 删除 CSS 文件
  - 修改 selector / class 语义
  - 调整 import order
  - 迁移旧界面到 `data-ui`
