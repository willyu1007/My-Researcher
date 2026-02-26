# 01 Plan

## Plan principle
- 按 UI 流程分阶段推进，不按“先后优先级”裁剪功能。
- 验收基线是“全功能并行可用”，不是“单点先可用”。

## Phase A — 信息架构与容器层（标签页分步）
1. 建立 3 标签工作台骨架：自动导入 / 手动导入 / 文献综览。
2. 将共用上下文（Topic/Paper、默认 tags、范围原因）上移为共享控制区。
3. 接入统一顶部反馈区与内联状态位。

Acceptance criteria:
- 3 标签切换稳定，移动端与桌面布局都可读可操作。
- 共享控制区可被各标签复用，不出现重复输入碎片化。

## Phase B — 三入口同级可用
1. 自动导入标签：关键词检索候选 + URL 批量导入 + 成功/失败/重试反馈。
2. 手动导入标签：JSON/CSV/BibTeX 上传解析 + Zotero users/groups 联动（可选 key/query/limit）。
3. 两条入口并行可用，状态互不干扰。

Acceptance criteria:
- 三入口均可独立完成“导入 -> 加入范围 -> 反馈”的完整路径。
- 失败场景均提供可执行恢复动作。

## Phase C — 高级查询与结果视图
1. 新增条件构建器：字段、操作符、值，支持 group 的 AND/OR。
2. 支持保存查询（命名 preset + 默认排序）。
3. 结果视图采用列表 + 行内关键信息（作者/年份/provider/tags/scope/citation）。

Acceptance criteria:
- 多条件查询可复用，结果可快速扫描并执行行内操作。
- 查询为空、无结果、错误状态均有清晰反馈。

## Phase D — 综览与分类工作台
1. 展示核心统计（总量、in scope、cited、top tags）。
2. 提供筛选与批量维护入口（标签、rights、scope/citation 快速动作）。
3. 完成元数据编辑闭环（编辑、保存中、成功/失败回执）。

Acceptance criteria:
- 用户可在该页完成主要维护任务，无需跳转其他模块。
- 状态更新后视图一致，无明显延迟错位。

## Phase E — 验证与灰度
1. 执行自动化检查（typecheck/test/build/UI gate/ui suite）。
2. 执行手工可用性场景清单。
3. 按灰度条件评估 Go/No-Go，必要时回滚。

Acceptance criteria:
- Go 门槛全通过。
- 回滚条件与动作可执行。

## Risks & mitigations
- Risk: 条件构建器规则复杂，导致误筛选。
  - Mitigation: 收敛字段与操作符集合；先实现可解释的前端求值器。
- Risk: 多入口流程文案与状态不一致。
  - Mitigation: 统一反馈模型与术语表，按同一状态机渲染。
- Risk: 列表性能下降。
  - Mitigation: 首版限制展示数量并保留后续分页/虚拟化扩展点。
