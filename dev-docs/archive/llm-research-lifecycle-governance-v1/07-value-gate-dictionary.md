# 07 Value Gate Dictionary

## Purpose
- 定义 `Stage DAG + Value Gate` 的统一术语与最小字段契约，用于支撑 LLM 主导的发散式科研流程治理。
- 本文件是治理层词典，不包含实现细节与算法细节。

## Scope
- 覆盖对象：`M1..M8` 全模块，以及写作章节对象。
- 重点覆盖：`M4..M7` 的多分支、回流、保留/淘汰决策。

## Core model
1. Pipeline 不是单链路，而是 `Stage DAG`。
2. 每个阶段可产生多个候选节点（branch nodes）。
3. 每个候选节点都必须带一条 `value_judgement`。
4. 只有通过 `Value Gate` 的节点，才允许进入后续动作。
5. 失败/淘汰节点必须保留决策原因和血缘信息。

## Entity glossary
### 1) stage_node
- 含义: 任一模块产出的一个版本化节点（可候选、可晋级、可淘汰）。
- Required fields:
  - `node_id`
  - `paper_id`
  - `module_id` (`M1..M8`)
  - `stage_id`
  - `version_id`
  - `parent_node_ids` (array, allow empty for root)
  - `created_by` (`llm|human|hybrid`)
  - `run_id`
  - `lane_id` (parallel execution lane id)
  - `attempt_id` (iteration id inside one lane)
  - `status`

### 2) value_judgement
- 含义: 对节点价值的结构化判断结果，用于“保留/淘汰/回流”决策。
- Required fields:
  - `judgement_id`
  - `node_id`
  - `decision` (`promote|hold|reject|loopback`)
  - `reason_summary`
  - `core_score_vector` (fixed dimensions, gate main input)
  - `extension_score_vector` (module-specific dimensions, explanation/ranking input)
  - `confidence`
  - `reviewer` (`llm|human|hybrid`)
  - `timestamp`

### 3) loopback_edge
- 含义: 从后序模块回流到前序模块的显式关系。
- Required fields:
  - `from_node_id`
  - `to_module_id`
  - `to_parent_node_id` (optional)
  - `loopback_reason`
  - `trigger_judgement_id`

### 4) paper_effect_metric
- 含义: 论文推进的效果指标，不以 milestone 为主驱动。
- Required fields:
  - `metric_id`
  - `paper_id`
  - `metric_name`
  - `target_value`
  - `current_value`
  - `trend` (`up|flat|down`)
  - `evidence_node_ids`
  - `last_updated_at`

### 5) section_node (writing)
- 含义: 章节级写作对象，接收上游证据节点。
- Required fields:
  - `section_node_id`
  - `paper_id`
  - `section_key`
  - `input_node_ids`
  - `value_judgement_id`
  - `status`

## Dimension model (recommended)
### Hybrid scoring strategy (recommended)
- 使用“全局固定维度 + 模块扩展维度”的混合方案。
- `core_score_vector` MUST 作为门禁主判输入，确保跨模块可比较与稳定治理。
- `extension_score_vector` SHOULD 作为模块内排序与解释输入，不单独触发晋级。

### A) Global fixed dimensions (`core_score_vector`)
1. `problem_value`: 问题价值与贡献清晰度（是否值得做）。
2. `technical_soundness`: 技术正确性与方法严谨性。
3. `evaluation_rigor`: 评测质量与公平性（强 baseline、预算公平、统计可靠）。
4. `reproducibility_transparency`: 可复现与透明度（参数/数据/环境可重构）。
5. `positioning_accuracy`: 与相关工作的定位准确性（不遗漏关键、差异说清）。
6. `clarity_claim_alignment`: 表达清晰度与 claim-evidence 对齐程度。
7. `efficiency_cost_reasonableness`: 成本收益合理性（性能 vs 资源开销）。
8. `risk_compliance`: 风险与合规（隐私/偏见/安全/伦理）控制程度。

### B) Module extension dimensions (`extension_score_vector`)
- M1 文献管理:
  - `source_credibility`
  - `coverage_recency`
  - `dedup_trace_quality`
- M2 选题管理:
  - `problem_statement_precision`
  - `novelty_delta_confidence`
  - `venue_fit`
- M3 论文项目管理:
  - `gate_consistency`
  - `branch_governance_health`
  - `decision_latency`
- M4 理论框架与研究设计:
  - `assumption_realism`
  - `hypothesis_falsifiability`
  - `mechanism_explainability`
- M5 实验设计与执行:
  - `protocol_fairness`
  - `leakage_control`
  - `robustness_coverage`
- M6 模型与训练:
  - `training_stability`
  - `resource_utilization`
  - `recovery_effectiveness`
- M7 数据分析与讨论:
  - `significance_strength`
  - `error_analysis_depth`
  - `cross_setting_consistency`
- M8 写作/投稿/修稿:
  - `section_readability`
  - `claim_evidence_coverage`
  - `rebuttal_completeness`

### C) LLM default global config (`llm-global-default-v1`)
- 适用范围: 当前项目默认研究方向为 LLM，`core_score_vector` 采用全局统一配置。
- 默认权重（sum=1.00）:
  - `problem_value`: `0.15`
  - `technical_soundness`: `0.20`
  - `evaluation_rigor`: `0.20`
  - `reproducibility_transparency`: `0.15`
  - `positioning_accuracy`: `0.10`
  - `clarity_claim_alignment`: `0.08`
  - `efficiency_cost_reasonableness`: `0.07`
  - `risk_compliance`: `0.05`
- 默认硬阈值:
  - `technical_soundness >= 0.70`
  - `evaluation_rigor >= 0.70`
  - `reproducibility_transparency >= 0.65`
  - `risk_compliance >= 0.60`
  - M8: `claim_evidence_coverage >= 0.70`
- 默认晋级阈值:
  - `weighted_core_score >= 0.72`

### Gate decision policy (recommended)
1. 先检查核心硬约束（hard constraints），再看综合得分。
2. 任一 hard constraint 失败时，`decision` 只能是 `hold|reject|loopback`。
3. `extension_score_vector` 不可绕过核心硬约束直接触发 `promote`。

### Hard constraints (minimum)
- `technical_soundness` 不达标 -> 禁止 `promote`。
- `evaluation_rigor` 不达标 -> 禁止 `promote`。
- `reproducibility_transparency` 不达标 -> 禁止 `promote`。
- M8 节点若 `claim_evidence_coverage` 不达标 -> 禁止 `promote`。

## Manual adjustment policy (allowed with audit)
- 允许手动调整 `core_score_vector` 的权重与阈值，但 MUST 记录审计信息。
- 手动调整是“配置调整”，不是对单个结果的人工强制改判。

### Override scope and precedence
1. `global`（默认）: 项目级统一配置。
2. `paper`（可选）: 单论文覆盖全局配置。
3. `stage`（可选）: 单阶段覆盖 paper/global 配置。
- 优先级: `stage > paper > global`。

### Required override metadata
- `override_id`
- `config_version`
- `scope` (`global|paper|stage`)
- `target_id` (`paper_id` or `stage_id`, global 可为空)
- `changed_fields`
- `old_value`
- `new_value`
- `reason`
- `approved_by`
- `approved_at`
- `effective_from`

### Adjustment boundaries
- LLM MAY 建议调整，但 MUST NOT 自动生效调整。
- 手动调整 SHOULD 由 human 或 hybrid 审批后生效。
- 调整后必须保留旧版本配置，禁止覆盖式无痕修改。

## Default activation and rollback policy (confirmed)
### Effective-from default
- 默认 `effective_from = next_gate_window`。
- 含义: 新配置从下一次 gate 批次开始生效，避免同一批候选节点混用两套标准。
- 生效范围默认:
  - 仅影响 `candidate` 与后续新节点。
  - 不自动重算已 `promoted` 节点（除非显式触发 re-evaluate 流程）。

### Rollback execution policy
- 回滚触发来源:
  - LLM MAY 提议回滚。
  - Human 或 hybrid MAY 提议回滚。
- 回滚执行原则:
  - `stage` 级回滚: 可由策略引擎自动执行（guarded auto rollback）。
  - `paper` 级回滚: 需 human/hybrid 审批后执行。
  - `global` 级回滚: 必须 human 审批后执行。
- 关键约束:
  - LLM MUST NOT 直接执行回滚。
  - 所有回滚必须记录 `override_id` 与 `config_version` 血缘。
  - 回滚动作 SHOULD 通过切换 active snapshot pointer 执行，不改写历史快照内容。

## Version naming strategy (confirmed)
### Why hybrid naming
- LLM 发散式探索会产生大量高频分支，单一语义版号不适合内部治理。
- 写作/投稿阶段需要对人可读版本，单一递增版号表达不足。

### Layer 1: Work node version (machine-first)
- 命名: `P{paper}-M{module}-B{branch}-N{seq}`
- 示例: `P023-M6-B04-N0012`
- 规则:
  - `B` 表示分支号；回流或新探索分支创建时递增。
  - `N` 表示分支内节点序号；同分支严格递增。
  - 每个节点 MUST 记录 `parent_node_ids` 与 `run_id`。
  - `lane_id` / `attempt_id` 作为元数据字段记录，不进入版本命名串。

### Layer 2: Spine snapshot (gate-frozen)
- 命名: `SP-{nnnn}`
- 示例: `SP-0042`
- 规则:
  - 仅在 gate `promote` 后生成。
  - 一个 `SP-*` 对应 M4 到 M7 的冻结证据集合。
  - M8 默认只消费带 `SP-*` 的冻结集合。

### Layer 3: Release tag (human-readable)
- 命名: `R{major}.{minor}.{patch}`
- 示例: `R1.3.2`
- 规则:
  - `major`: 问题定义或 claims 集合变化。
  - `minor`: 方法/实验主线变化，但 claims 集合不变。
  - `patch`: 复算、修复或表达改进，不改变核心结论。

### Mapping and constraints
- 每个 `release_tag` MUST 对应至少一个 `SP-*`。
- 每个 `SP-*` MUST 能回链到一组 `P-M-B-N` 节点。
- 禁止跳过 `SP-*` 直接从工作节点发布 `release_tag`。

## Freeze granularity in parallel mode (confirmed)
### Why snapshot-based freeze
- 多线程自动化下，不同线程可能停在不同模块（如 M4 与 M5 并行推进）。
- 因此冻结对象不应依赖“当前模块进度对齐”，而应基于“可兼容节点集合”。

### Freeze object
- 冻结对象定义为 `SP-*` 快照中的节点清单（snapshot manifest）。
- `SP-*` 是节点引用集合，不要求所有线程在同一模块或同一步。

### Snapshot types
1. `SP-partial`
   - 含义: 冻结当前兼容的子集节点，用于内部分析与中间评审。
   - 约束: 不作为默认投稿输入。
2. `SP-full`
   - 含义: 满足 M4-M7（M6 可按可选策略处理）的完整冻结集合。
   - 约束: M8 默认只消费 `SP-full`。

### Compatibility constraints (minimum)
- 进入同一 `SP-*` 的节点 MUST 通过兼容性校验：
  - `claim_set` 一致
  - `problem_scope` 一致
  - `dataset_protocol` 一致
  - `evaluation_protocol` 一致
- 任一约束不满足时:
  - 不能并入当前 `SP-*`
  - 必须新建分支或进入下一个 `SP-*`

### Concurrency rules
- 线程无需停机；快照是“切时间线”，不是“暂停系统”。
- 生成新 `SP-*` 不会改写旧 `SP-*` 的内容。
- 回滚以 `SP-*` 为目标切换，不直接回滚运行中的模块实时状态。

### Parallel lane governance recommendations
- `lane_id` 是并行线程主键；不同 `lane_id` 可以停留在不同模块。
- `attempt_id` 用于标记同一线程内的反复试验（如 `M6 -> M5 -> M6`）。
- Gate 调度单位 SHOULD 是“兼容候选集合”，而不是“模块同步步点”。
- `paper_active_sp_full` 是写作/投稿默认基线；切换该指针即完成回滚或晋级。
- 若两个线程在 `claim_set` 或协议上冲突，应保留为并行分支并进入下一次快照决策。

## M7 contract when M6 is optional (confirmed)
### Contract branches
- `analysis_contract = with_m6 | no_m6`
- `with_m6`: 使用训练链路证据（M6 节点存在）。
- `no_m6`: 跳过训练链路（M6 节点缺省）。

### Entry conditions for `no_m6`
- MUST 存在 `skip_m6_reason`。
- MUST 经 M3 gate 审批通过。
- MUST 设置 `training_claim_allowed = false`。

### Evidence requirements for `no_m6`
- 强 baseline 对比结果。
- 公平预算与协议说明。
- 多次重复统计（建议 `>= 3` seeds）。
- 误差分析（error analysis）。
- 敏感性分析（sensitivity）。

### Gate thresholds
- `with_m6`：沿用默认核心阈值。
- `no_m6`：采用更严格阈值：
  - `evaluation_rigor >= 0.75`
  - `reproducibility_transparency >= 0.70`

### Snapshot compatibility tag
- `SP-full` MUST 标注 `spine_type = with_m6 | no_m6`。
- 同一 `SP-full` MUST NOT 混用两种 `spine_type`。

### Writing constraints (M8)
- 当输入来自 `no_m6`：
  - MUST 标注“training-free / no additional training”。
  - MUST NOT 声称“训练带来提升”类结论。

## Evidence packet requirements (reviewer-aligned)
### M4-M7 candidate minimum packet
- 问题定义与假设范围（输入/输出/约束/适用边界）。
- 主结果对比（含强 baseline）。
- 公平性说明（数据、预算、调参策略）。
- 统计可靠性（如重复试验方差或置信区间）。
- 机制解释证据（ablation / sensitivity / error analysis 至少其一，建议齐备）。

### M8 candidate minimum packet
- 章节级 claim-evidence 绑定清单。
- 主要结果亮点的数字化引用。
- 修稿/回复条目的证据回链。

## Status and transitions
### Node status enum
- `draft`: 草稿节点，允许继续发散。
- `candidate`: 已提交价值判断，等待 gate。
- `promoted`: 通过 gate，允许进入后续阶段。
- `hold`: 暂缓，保留但不推进。
- `rejected`: 淘汰，不推进但保留审计记录。
- `superseded`: 被新版本替代，默认不继续推进。

### Transition responsibility
- 模块内推进（`draft -> candidate`）: 由模块 owner（R）负责。
- Gate 决策（`candidate -> promoted|hold|rejected|superseded`）: 由 `M3` 负责。
- 回流创建（`loopback_edge`）: 由触发模块与 `M3` 协同。

## Retention policy (what to keep)
### Must keep
- 所有 `promoted` 节点。
- 所有 `rejected` 节点（必须附 `reason_summary`）。
- 所有产生 `loopback_edge` 的节点（含触发判断）。
- 所有被 `M8` 引用的上游节点（M4..M7）。

### Can be compacted (not deleted immediately)
- 长期未被引用的 `draft` 节点。
- 被替代且无下游引用的 `superseded` 节点。

### Forbidden
- 删除已参与门禁决策的节点审计信息。
- 删除已被章节或投稿包引用的证据节点。

## Decision semantics
### promote
- 含义: 节点价值满足继续推进条件。
- Effect: 允许触发下一阶段动作。

### hold
- 含义: 信息不足或成本过高，暂不推进。
- Effect: 保留节点，等待补充信息后复审。

### reject
- 含义: 节点价值不足，不进入后续。
- Effect: 终止该分支推进，但保留审计与原因。

### loopback
- 含义: 后序阶段发现问题，需要回流重做前序阶段。
- Effect: 生成 `loopback_edge`，并创建新的前序候选节点。

## Module-level value embedding rule (M1..M8)
1. 每个模块输出节点必须附带 `value_judgement`（至少一条）。
2. M8 的章节对象 (`section_node`) 也必须附带价值判断。
3. 任一写作/投稿输出都必须能回链到 `promoted` 的 M4..M7 节点。

## Paper progression rule (metric-driven)
- Paper 状态推进以 `paper_effect_metric` 达标为主，不以 milestone 时间点为主。
- Milestone 可作为运营视图保留，但不作为 gate 的唯一通过条件。

## Query and visibility requirements
- 必须支持查看 M4..M8 全版本时间线。
- 必须支持按 `decision` 过滤节点（promoted/hold/rejected/loopback）。
- 必须支持从章节反查上游证据节点及其价值判断。

## Boundaries
- 本词典只定义治理语义，不定义数据库实现和算法实现。
- 具体评价标准的计算逻辑在后续实现任务定义。

## Source note
- 本词典维度建议参考：
  - `/Volumes/DataDisk/Project/My-Holder-Project-Docs/The-Researcher/自动科研助手.md`
