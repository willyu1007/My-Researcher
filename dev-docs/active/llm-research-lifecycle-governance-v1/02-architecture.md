# 02 Architecture

## Context & current state
- 项目当前处于“能力规划到可执行治理”过渡阶段。
- 已有首版任务包覆盖 8 模块，但尚未形成“4 阶段 + 版本门禁”的统一执行协议。
- 用户明确强调：大模型驱动自动化，以及模块 4 到 7 的版本管理必须可追溯。

## Cross-task SoT split
- 模块定义 SSOT: `dev-docs/active/paper-assistant-core-modules/06-task-packages.md`。
- 治理规则 SSOT: 本任务（阶段门禁、LLM 编排、4~7 版本主线）。
- 统一契约: `dev-docs/active/llm-research-lifecycle-governance-v1/06-task-boundary-and-anti-drift.md`。
- 本任务禁止重写 TP-01..TP-08 的正文定义与批次表，仅可引用其编号与结论。

## Proposed design

### Stage DAG + Value Gate model
- M4 到 M7 采用可分支 DAG，而非单线流水线。
- 每个候选节点必须附带 `value_judgement`，作为是否进入后续动作的唯一治理输入。
- 允许显式回流（例如 `M6 -> M5`、`M7 -> M4/M5`），并记录 `loopback_edge`。
- Paper 推进主轴采用效果指标（metric-driven），而不是里程碑时间点。
- 评分模型采用“`core_score_vector`（全局固定）+ `extension_score_vector`（模块扩展）”。
- 当前策略: 研究方向默认 LLM，`core_score_vector` 使用全局统一默认配置，并允许手动调整（带审计）。
- 版本命名采用三层策略: 工作节点 `P-M-B-N`、冻结快照 `SP-*`、发布标签 `Rx.y.z`。
- 冻结策略采用快照冻结而非模块进度冻结: `SP-partial` 用于中间评审，`SP-full` 作为 M8 默认消费输入。
- M7 分析契约采用双分支: `with_m6`（含训练链路）/ `no_m6`（training-free，阈值更严格）。
- 统一词典见：`dev-docs/active/llm-research-lifecycle-governance-v1/07-value-gate-dictionary.md`。

### Components / modules
- M1 文献管理：文献注册表、去重、标签、来源追溯。
- M2 选题管理：方向生成、评分、立项建议、淘汰链路。
- M3 论文项目管理：论文主键、生命周期状态机、里程碑。
- M4 理论框架与研究设计：研究问题、假设、变量、评价指标。
- M5 实验设计与执行：实验矩阵、协议、运行编排。
- M6 模型与训练（可选）：训练配置、运行轨迹、产物登记。
- M7 数据分析与讨论：统计分析、图表、结论映射。
- M8 写作/投稿/修稿：稿件生成、投稿检查、修稿回链。

### Interfaces & contracts
- API endpoints:
  - `POST /paper-projects`：创建论文主键与初始化状态。
  - `POST /paper-projects/:id/stage-gates/:gate/verify`：执行阶段门禁检查。
  - `POST /paper-projects/:id/version-spine/commit`：提交 4 到 7 模块版本对象。
  - `POST /paper-projects/:id/writing-packages/build`：基于冻结证据生成写作/投稿包。
  - 字段级契约索引：`dev-docs/active/llm-research-lifecycle-governance-v1/08-interface-field-contracts.md`
- Data models / schemas:
  - `research_spec_v`（M4 输出）
  - `experiment_plan_v`（M5 输出）
  - `training_run_v` + `model_artifact_v`（M6 输出，可选）
  - `analysis_report_v` + `claim_evidence_map_v`（M7 输出）
  - 共用 lineage 字段：`paper_id`, `stage_id`, `version_id`, `parent_version_id`, `run_id`, `lane_id`, `attempt_id`, `created_by`, `created_at`, `frozen_at`
  - 价值判断字段组：`judgement_id`, `decision`, `core_score_vector`, `extension_score_vector`, `confidence`, `reason_summary`
  - 快照控制字段：`snapshot_manifest_id`, `spine_type`, `paper_active_sp_full`, `paper_active_sp_partial`
- Events / jobs (if any):
  - `llm.workflow.plan.generated`
  - `stage.gate.check.requested`
  - `stage.gate.check.passed|failed`
  - `version.spine.committed`
  - `snapshot.pointer.switched`

### Boundaries & dependency rules
- Allowed dependencies:
  - M2 依赖 M1 的文献证据输入。
  - M3 接收 M2 已通过立项的选题。
  - M4 到 M7 只能在 M3 激活项目下工作。
  - M8 只读消费 M4 到 M7 的冻结版本对象。
  - 模块名称与 TP 编号从 `T-002` 只读引用。
- Forbidden dependencies:
  - M8 直接修改 M4 到 M7 的原始版本数据。
  - M4 绕过 M5 直接写入训练或分析结果。
  - M2 在无文献证据时直接推动立项通过。
  - 在本任务维护独立的 TP 定义或批次优先级表。
  - 跳过 `value_judgement` 直接把候选节点推进到下游阶段。

## Data migration (if applicable)
- Migration steps:
  - 当前仅文档规划，不做 schema 迁移。
- Backward compatibility strategy:
  - 与现有 `paper-assistant-core-modules` 并行，不破坏旧任务记录。
- Rollout plan:
  - 先完成治理文档，再分阶段进入实现任务。

## Non-functional considerations
- Security/auth/permissions:
  - 自动化流程区分“自动执行”和“需人工审批”，关键门禁保留人工确认。
- Performance:
  - 大模型编排采用异步任务队列与可重试机制，避免长流程阻塞。
- Observability (logs/metrics/traces):
  - 关键流程统一 `run_id`；记录 prompt 版本、模型版本、执行时间与失败原因。

## Open questions
- (none)
