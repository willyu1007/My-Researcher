# 06 Task Packages

> 本文件定义 8 个子功能的任务包（讨论版）。目标是形成可执行排期，不提前锁定实现细节。

## Package template
- Goal
- Scope (MUST)
- Out-of-scope (NOT)
- Internal vs Integration boundary (TBD allowed)
- Deliverables
- Acceptance criteria (DoD)
- Dependencies
- Priority batch

## TP-01 文献管理
- Goal: 建立可追溯文献台账与去重机制，支撑检索与引用。
- Scope (MUST): 文献注册表、去重键、来源记录、标签体系、引用状态。
- Out-of-scope (NOT): 跨团队共享知识库。
- Boundary: 内部实体模型 + 外部检索接口（细节 TBD）。
- Deliverables: 文献对象模型、去重策略、基础检索接入清单。
- DoD: 可稳定导入/去重/标注文献并关联到项目。
- Dependencies: 无（底座模块）。
- Priority batch: Batch A

## TP-02 研究方向（备选池）
- Goal: 用结构化候选池支持方向筛选与淘汰。
- Scope (MUST): 候选池、评分维度、淘汰历史、决策备注。
- Out-of-scope (NOT): 自动替代研究判断。
- Boundary: 内部评分流程 + 外部趋势检索输入。
- Deliverables: 候选池模型、评分模板、方向评审流程。
- DoD: 可对候选方向进行排序、淘汰并保留决策链路。
- Dependencies: TP-01
- Priority batch: Batch A

## TP-03 理论框架与研究设计
- Goal: 把研究问题转成可验证框架与假设边界。
- Scope (MUST): 问题定义模板、假设清单、机制映射。
- Out-of-scope (NOT): 自动生成理论结论。
- Boundary: 内部结构化模板 + LLM 辅助建议接口。
- Deliverables: 研究设计模板、假设追踪机制。
- DoD: 每个研究主题可形成结构化设计稿并可追溯修改。
- Dependencies: TP-02
- Priority batch: Batch B

## TP-04 实验设计
- Goal: 形成公平、可复验的实验计划。
- Scope (MUST): 实验矩阵、消融模板、对标协议、复现清单。
- Out-of-scope (NOT): 自动执行所有实验。
- Boundary: 内部计划管理 + 外部执行器编排接口。
- Deliverables: 实验计划模板、协议检查器。
- DoD: 任一 claim 能映射到明确实验证据计划。
- Dependencies: TP-03
- Priority batch: Batch B

## TP-05 模型与训练
- Goal: 管理训练配置、运行轨迹和模型资产。
- Scope (MUST): 配置版本化、运行记录、失败恢复、产物登记。
- Out-of-scope (NOT): 大规模集群调度平台。
- Boundary: 内部训练元数据层 + 本地/远程训练接口。
- Deliverables: 训练任务实体、运行日志规范、恢复策略。
- DoD: 训练流程具备可追踪与可恢复能力。
- Dependencies: TP-04
- Priority batch: Batch B

## TP-06 数据分析与讨论
- Goal: 形成统计稳健分析与可复核讨论结论。
- Scope (MUST): 指标聚合、误差分析、失败案例归档。
- Out-of-scope (NOT): 自动生成未经证据支持结论。
- Boundary: 内部分析管线 + 可视化工具接口。
- Deliverables: 分析报告模板、关键指标检查规则。
- DoD: 可输出结构化分析结论并回链到实验证据。
- Dependencies: TP-04, TP-05
- Priority batch: Batch B

## TP-07 写作、投稿、修稿
- Goal: 打通写作到投稿再到修稿的闭环流程。
- Scope (MUST): claims-evidence 追溯、投稿前检查、评审意见映射。
- Out-of-scope (NOT): 自研完整富文本编辑器。
- Boundary: 内部流程编排 + Prism/Overleaf/LaTeX 接口。
- Deliverables: 投稿前检查器、修稿任务映射器。
- DoD: 能将研究证据链稳定映射到投稿与修稿动作。
- Dependencies: TP-01~TP-06
- Priority batch: Batch C

## TP-08 论文管理
- Goal: 管理论文项目全生命周期与状态。
- Scope (MUST): 项目状态、里程碑、版本快照、任务追踪。
- Out-of-scope (NOT): 跨团队协作权限体系（首发）。
- Boundary: 内部项目管理内核 + Git/同步控制面接口。
- Deliverables: 生命周期状态机、里程碑与版本策略。
- DoD: 项目状态与交付进度可追踪、可回溯。
- Dependencies: TP-01
- Priority batch: Batch A

## Batch plan (discussion draft)
- Batch A (foundation): TP-01, TP-02, TP-08
- Batch B (research loop): TP-03, TP-04, TP-05, TP-06
- Batch C (delivery loop): TP-07

## Next discussion checkpoints
1. 是否确认 Batch A 先行并作为 M0 实现入口。
2. TP-07 在 M0 的范围是否仅限“集成编排层”。
3. 每个 TP 的内部实现与接口调用比例（先实现还是先集成）。
