# 01 Plan

## Phases
1. Foundation intake（文献 + 选题）
2. Paper project initiation（论文主键 + 生命周期）
3. Versioned research spine（理论框架/实验/训练/分析）
4. Writing delivery loop（写作/投稿/修稿）

## Detailed steps
- Step 1: 固化 8 模块职责矩阵，明确每个模块的 Responsible / Collaborate / Forbidden。
- Step 2: 定义 `Stage DAG + Value Gate` 词典（节点、判断、回流、保留策略、效果指标）。
- Step 2.1: 固化 `core_score_vector` 的 LLM 全局默认权重/阈值与手动调整审计规则。
- Step 3: 定义 4 阶段门禁，明确阶段进入条件、退出条件和失败回退策略。
- Step 4: 对模块 4 到 7 设计版本对象、lineage 字段和冻结点规则。
- Step 4.1: 固化三层版本命名（`P-M-B-N` / `SP-*` / `Rx.y.z`）及映射约束。
- Step 4.2: 固化并行模式冻结语义（`SP-partial`/`SP-full` + 兼容性约束 + 快照切片）。
- Step 4.3: 固化 M7 双分支契约（`with_m6/no_m6`）及 `no_m6` 的阈值与写作约束。
- Step 4.4: 固化并行线程元数据与执行面（`lane_id`/`attempt_id` + `paper_active_sp_full` 指针切换回滚）。
- Step 4.5: 输出字段级接口契约（REST request/response + event payload + error model）。
- Step 5: 设计 LLM 自动化任务编排约束（可自动执行、需人工审批、禁止自动执行）。
- Step 6: 形成写作/投稿/修稿对阶段 3 产物的消费契约（只读证据、可回链修订）。
- Step 7: 按 `06-task-boundary-and-anti-drift.md` 校验与 `T-002` 的单写者边界并记录结果。
- Step 8: 更新 project governance（sync + lint），输出下一步实现入口。

## Risks & mitigations
- Risk: 阶段定义和模块边界交叉，导致责任不清。
  - Mitigation: 每个阶段附带“允许写入对象列表”，禁止跨阶段越权写入。
- Risk: 自动化流程过强，绕过人工审查。
  - Mitigation: 在阶段门禁中定义 mandatory human checkpoint。
- Risk: 4 到 7 版本对象定义不统一，后续实现碎片化。
  - Mitigation: 用统一命名和 lineage 字段契约作为硬约束。
- Risk: 与 `T-002` 并行维护相同语义，导致双写漂移。
  - Mitigation: 模块清单只读引用 `T-002`，本任务只维护治理规则正文。
- Risk: 发散节点数量激增导致治理失控。
  - Mitigation: 强制每个候选节点附带 `value_judgement`，并由 M3 gate 决策保留/淘汰/回流。
