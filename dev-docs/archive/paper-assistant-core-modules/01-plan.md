# 01 Plan

## Batches
1. Foundation: 文献管理、研究方向池、论文管理
2. Research loop: 理论框架与研究设计、实验设计、模型与训练、数据分析与讨论
3. Writing loop: 写作、投稿、修稿

## Execution status
- [x] Step 1: 统一模板冻结
- [x] Step 2: Foundation 三包定义与优先级
- [x] Step 3: Research loop 四包依赖链
- [x] Step 4: Writing loop 边界定义
- [x] Step 5: 跨模块共性能力归纳
- [x] Step 6: 首轮执行队列（Batch A/B/C）冻结
- [x] Step 7: 与 `T-003` 边界契约一致性校验

## Detailed steps
- Step 1: 确认 8 个任务包的统一模板（目标、范围、输入输出、验收、依赖、风险）
- Step 2: 输出 Foundation 三个任务包并确认优先级
- Step 3: 输出 Research loop 四个任务包并确认依赖链路
- Step 4: 输出 Writing loop 任务包并明确外部工具调用边界
- Step 5: 汇总跨模块共性能力（权限、同步、可观测性、审计）
- Step 6: 形成首轮执行队列（M0/M1 对齐）
- Step 7: 依据 `06-task-boundary-and-anti-drift.md` 执行跨任务同步，禁止在本任务复写阶段门禁和版本治理正文

## Risks & mitigations
- Risk: 任务包定义粒度不一致
  - Mitigation: 强制使用统一模板字段
- Risk: 模块边界讨论发散
  - Mitigation: 每轮只讨论 1-2 个模块，先产出可执行结论
- Risk: 与 `T-003` 双写导致语义漂移
  - Mitigation: 使用单写者模型；模块包只在 `T-002` 维护，阶段与版本规则只在 `T-003` 维护
