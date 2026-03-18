# Research Argument Planner Spec

**来源**：基于 `00_research_argument_framework_rchr.md` 拆分出的实现规格文档。  

**定位**：面向 planner、meta-controller、critic hub、动作空间与启发式搜索实现。  

**建议仓库位置**：`docs/architecture/research_argument_planner_spec.md`

## 文档用途

- 把“研究论证收敛”形式化成可执行的规划问题。
- 定义两段式收敛、动作空间、bundle 规划、启发式评分、停滞检测、退出与回退。
- 给后续 planner service、critic orchestration、execution queue 提供统一行为规范。

## 规划器的一句话定义

规划器不是在“写论文”，而是在**审稿约束定义的目标空间里，围绕论证对象图持续重规划下一步最值得做的动作包**。

## 5.2 框架总览
本框架由五个核心层构成：

1. **审稿约束层（Abstract Review-Constraint State）**  
   作为自动化的抽象目标空间。

2. **论证对象图（Argument Object Graph）**  
   作为真实研究状态的结构化表示。

3. **动作空间（Action Space）**  
   以 sub-function 3–6 为宏动作族，以对象级 operator 为原子动作。

4. **启发式搜索（Heuristic Search / Replanning）**  
   用于在当前状态下选择最值得执行的动作或动作包。

5. **控制与记忆（Meta-control & Memory）**  
   负责阶段切换、停滞诊断、回退、转向、退出与经验吸收。

## 5.3 核心目标：两段式收敛

### 5.3.1 第一段：值得继续投入
这一段回答：

- 这个问题是否重要？
- 这项工作是否可能形成有价值的贡献？
- 当前的新意是否真实成立？
- 在现有资源与路径下，是否有合理产出可能？

如果这一段不能过关，系统应优先：
- pivot
- kill
- archive  
而不是继续补实验。

### 5.3.2 第二段：具备进入真实写作的论证基础
这一段回答：

- claim 是否足够清晰
- 证据是否基本闭环
- 评测与对比是否基本站住
- 边界与风险是否被识别
- 复现准备度是否达到最低要求

达到该阶段后，系统才能判定：
- `ready-for-writing entry`

## 5.4 成功状态的定义
这里的“收敛”不是指：

- 研究已经绝对正确
- 所有 reviewer 一定接受
- 所有未来修改都不再需要

而是指：

> 对当前目标 venue / 研究类型而言，核心问题与价值已明确，关键 claim 已稳定，主要 evidence 与 protocol 已具备，关键 reviewer 风险无一级阻塞，已经具备进入真实写作流程的论证基础。

因此，本框架的终点是：

- `WorthContinuing`（阶段 1 终点）
- `ReadyForWritingEntry`（阶段 2 终点）

而不是“文章自动写完”。

---

# 第 8 章 动作空间设计：以 sub-function 3–6 为宏动作族

## 8.1 为什么动作空间不能直接等于“当前在第几步”
如果动作空间只是：

- 进入理论设计
- 进入实验设计
- 进入模型训练
- 进入数据分析

那么 planner 依旧不知道：

- 具体要做哪个动作
- 它会改变哪些状态
- 它依赖哪些前置条件
- 它的成本、风险、信息增益是什么

因此，sub-function 3–6 只能作为**宏动作族**，不能作为 primitive actions。

## 8.2 为什么 sub-function 3–6 适合作为宏动作族
我们在讨论中已经达成一致：

- 研究推进的核心区不是 1–8 全部
- 而是 3–6 这一段形成的**论证核心区**
- 这一区域天然网状推进，最适合被 planner 接管

原因：
- 1（文献管理）更像基础支持层
- 2（研究方向）偏候选池与上游筛选
- 7（写作、投稿、修稿）属于后续写作层
- 8（论文管理）应上升为控制面，而不是动作本身

## 8.3 对 sub-function 3–6 的收敛性重定义
建议把它们重命名为：

### SF3：Problem / Theory / Claim Design
负责：
- 问题界定
- 价值假设
- contribution delta
- claim 生成、拆分、收缩、删除
- evidence requirement 派生

### SF4：Evaluation Protocol Design
负责：
- baseline 选择
- metric / split / fairness protocol
- ablation / robustness / stress test 设计
- requirement 与 protocol 的绑定

### SF5：Method Implementation & Execution
负责：
- feasibility probe
- 代码/系统实现
- 训练或 benchmark 执行
- artifact capture
- run management
- 失败恢复

> 之所以不用“模型与训练”，是为了避免动作空间过度 ML-specific。  
> 当前项目明确面向更广义的 CS research，需要一个能兼容 systems / security / empirical CS 的名字。

### SF6：Evidence Analysis & Boundary Update
负责：
- 结果聚合
- support / weakens / refutes / inconclusive 判定
- error analysis
- limitation / boundary / risk 提取
- claim-evidence graph 更新

### X：Search Control / Branch Governance
这是必须新增的一类宏动作族，负责：
- branch
- merge
- reopen
- pivot
- kill
- archive
- escalate-to-human

## 8.4 primitive operators
下面给出更适合 planner 直接调度的原子级 operator。

### 8.4.1 SF3 类 operator
- `define_problem`
- `refine_problem_scope`
- `create_value_hypothesis`
- `build_contribution_delta`
- `create_claim`
- `split_claim`
- `shrink_claim`
- `drop_claim`
- `derive_evidence_requirements`
- `record_scope_assumption`

### 8.4.2 SF4 类 operator
- `create_protocol`
- `revise_protocol`
- `add_baseline`
- `replace_baseline`
- `add_metric`
- `add_ablation_plan`
- `add_robustness_check`
- `add_stress_test`
- `bind_requirement_to_protocol`
- `audit_comparison_fairness`

### 8.4.3 SF5 类 operator
- `run_feasibility_probe`
- `launch_pilot_run`
- `launch_full_run`
- `run_baseline_experiment`
- `run_ablation`
- `run_robustness_eval`
- `capture_artifact`
- `register_run_failure`
- `retry_with_modified_config`

### 8.4.4 SF6 类 operator
- `ingest_result`
- `aggregate_metrics`
- `classify_evidence_support`
- `extract_failure_case`
- `extract_limitation`
- `extract_boundary`
- `derive_analysis_finding`
- `link_finding_to_claim`
- `update_claim_support_state`

### 8.4.5 X 类 operator
- `spawn_branch`
- `merge_branch`
- `reopen_claim`
- `reopen_protocol`
- `reopen_method`
- `reopen_problem`
- `pivot_branch`
- `kill_branch`
- `archive_branch`
- `request_human_review`

## 8.5 控制动作的必要性
如果没有控制动作，系统会出现几个严重问题：

- 只能“继续做”，不会“停止做”
- 不会因为 evidence 反证而主动退回前序节点
- 不会把一条低价值路线淘汰
- 不会形成真正的 branch competition

因此，控制动作必须是一等动作，而不是隐藏逻辑。

## 8.6 动作空间设计的注意事项

### 8.6.1 粒度不能过粗
过粗会让 planner 看不到真实差异。例如：
- “去做实验”比“补一个强 baseline 的小规模 probe”粗太多

### 8.6.2 粒度也不能过细
过细会导致：
- 动作过多、难以排序
- 状态更新碎片化
- UI 难以呈现
- planner 像任务调度器而不是研究控制器

### 8.6.3 要避免 domain-specific 命名绑死架构
例如“模型与训练”过于 ML-specific。  
如果未来扩展到 systems/security/PL，这种命名会误导动作空间。

### 8.6.4 动作必须声明“状态影响”
每个动作不能只定义“做什么”，还要定义：
- 影响哪些维度
- 可能解除哪些 blocker
- 需要哪些前置对象
- 可能生成哪些对象
- 成本和风险大概如何

## 8.7 建议的动作定义类型
```ts
type ActionFamily =
  | "SF3_ProblemTheoryClaimDesign"
  | "SF4_EvaluationProtocolDesign"
  | "SF5_MethodImplementationExecution"
  | "SF6_EvidenceAnalysisBoundaryUpdate"
  | "CTRL_SearchControlGovernance";

interface ActionPrecondition {
  type: "object_exists" | "state_threshold" | "no_critical_blocker" | "human_approval";
  ref?: string;
  rule?: string;
}

interface ExpectedEffect {
  targetDimensions: DimensionName[];
  deltaType: "score_up" | "confidence_up" | "blocker_release" | "reopen" | "uncertainty_reduce";
  magnitudeHint?: number;
  note?: string;
}

interface ActionSpec {
  id: string;
  family: ActionFamily;
  operator: string;
  title: string;
  description: string;
  inputObjectIds: string[];
  preconditions: ActionPrecondition[];
  expectedEffects: ExpectedEffect[];
  estimatedCost: {
    wallClock: number;
    compute: number;
    humanAttention: number;
  };
  estimatedRisk: {
    invalidity: number;
    failure: number;
    branchDestabilization: number;
  };
  parallelizable: boolean;
  requiresHumanApproval: boolean;
  outputTypes: string[];
}
```

---

# 第 9 章 启发式搜索算法框架

## 9.1 为什么是启发式搜索
我们在讨论中排除了三种不适合作为主框架的做法：

1. **固定流程**  
   太僵硬，无法表达分支、回退和重规划。

2. **端到端生成**  
   与项目边界不符，也无法保证证据约束。

3. **纯规则树**  
   可解释性强，但在真实研究中不够灵活，无法处理不确定性、信息增益和探索-利用平衡。

因此，最自然的形式是：

> **以审稿约束层为抽象状态空间，以论证对象图为底层真实状态，在不完全信息下进行启发式重规划。**

## 9.2 搜索问题形式化
建议将系统状态抽象为：

```text
S = <Z, G, U, B, H>
```

其中：

- `Z`：抽象状态（审稿约束层）
- `G`：论证对象图
- `U`：不确定性信息
- `B`：预算信息
- `H`：历史轨迹 / 决策历史

### 9.2.1 不确定性 `U`
包括：
- 某维度判断置信度低
- 某 run 结果不稳定
- novelty 检索覆盖不足
- feasibility 只有假设，没有 probe

### 9.2.2 预算 `B`
包括：
- 时间预算
- 算力预算
- 人工注意力预算
- API 成本预算
- 截止时间（可选）

### 9.2.3 历史 `H`
包括：
- 已做动作
- 动作结果
- 决策历史
- lessons
- tabu memory

## 9.3 两段式收敛的搜索目标

### 9.3.1 第一段目标
目标集合 `Goal_1`：
- `ProblemImportance >= Sufficient`
- `ContributionValue >= Sufficient`
- `NoveltyDelta >= Sufficient`
- `OutcomeFeasibility >= Sufficient`
- 无 critical blocker

达到后：
- `Advance(Stage2)` 或 `Kill/Pivot/Archive`

### 9.3.2 第二段目标
目标集合 `Goal_2`：
- `ClaimSharpness >= Sufficient`
- `EvidenceCompleteness >= Sufficient`
- `EvaluationSoundness >= Sufficient`
- `BoundaryRiskCoverage >= Sufficient`
- `ReproducibilityReadiness >= Sufficient`
- 无 critical blocker

达到后：
- `ReadyForWritingEntry`

## 9.4 启发式函数
不建议只优化状态总分。  
更合理的是对**动作包**进行价值估计。

设动作包为 `P`，当前状态为 `S`，则：

```text
BundleValue(P | S) =
  Σ_i w_i * E[Δscore_i(P)]
+ α * E[Δconfidence(P)]
+ β * E[blocker_release(P)]
+ γ * E[coverage(P)]
+ δ * E[information_gain(P)]
+ ρ * parallelism_bonus(P)
- λ * stage_weighted_cost(P)
- μ * risk(P)
- τ * revisit_penalty(P)
```

### 9.4.1 各项含义
- `Δscore_i(P)`：对关键维度的预期推进
- `Δconfidence(P)`：消除不确定性的程度
- `blocker_release(P)`：是否解除高优 blocker
- `coverage(P)`：是否同时覆盖多个关键缺口
- `information_gain(P)`：即使不直接提分，也是否显著提升判断能力
- `parallelism_bonus(P)`：是否能并行带来更好的 critical path
- `stage_weighted_cost(P)`：阶段化成本惩罚
- `risk(P)`：动作失败、误导或污染状态的风险
- `revisit_penalty(P)`：重复低效尝试的惩罚

## 9.5 为什么抽象状态需要分数
我们在讨论中已明确：

- **需要分数**
- 但**不能只有分数**

原因：

### 9.5.1 需要分数的原因
- 排序候选动作
- 比较 bundle 边际收益
- 做并行包优先级
- 观察局部趋势与收益递减

### 9.5.2 不能只有分数的原因
- 会丢失 blocker 语义
- 会被刷分
- 难以解释门槛是否通过
- 无法自然表达 `Unknown / Blocked / Partial / Sufficient / Strong`

因此最终采用混合状态表示。

## 9.6 并行与动作包
我们也达成了一致：

- 应支持并行计算
- 动作成本惩罚不应过重，尤其第二阶段
- 大动作常常是后期收敛所必需的

因此，planner 的基本调度单位应是**动作包**而不是单动作。

### 9.6.1 动作包的构造原则
可并行动作通常要求：
- 输入对象不冲突
- 输出对象不直接覆盖同一字段
- 资源上可同时执行
- 不存在强先后依赖

### 9.6.2 成本模型
并行动作包的成本不应用简单求和，而应用：

```text
cost(P) =
  η1 * critical_path(P)
+ η2 * peak_resource(P)
+ η3 * coordination_overhead(P)
```

### 9.6.3 阶段化成本权重
- **第一阶段**：成本权重相对较高  
  目标是低成本、高信息增益、快速止损
- **第二阶段**：成本权重明显降低  
  目标是避免系统逃避关键闭环动作

## 9.7 收敛慢时的处理：停滞检测
Meta-controller 应检测至少四类模式。

### 9.7.1 Plateau
关键维度长时间无改善：
- `gap` 长期不降
- `velocity ≈ 0`
- blocker 未解除

### 9.7.2 Oscillation
状态在几个配置间来回摆动：
- claim 变强导致 evidence 不足
- claim 收缩后 value 又下降
- 多轮往返无净进展

### 9.7.3 Expensive Non-yielding Search
高成本动作频繁执行，但无决定性收益：
- 多轮 full run 结果仍不稳定
- 不断加 baseline 后 claim 优势消失
- 反复 probe 后 feasibility 仍不明

### 9.7.4 Dominated Branch
某分支长期被另一条支线支配：
- 价值更低
- 成本更高
- 风险更大
- 收敛更慢

## 9.8 推荐算法框架
经过讨论，最推荐的主框架是：

> **分层式 anytime best-first / beam replanning**

配套机制：

- **tabu-style memory**：防循环、防重复无效尝试
- **contextual bandit scorer**：学习动作排序偏好（可后续增强）
- **MCTS-style short rollout**：做短视野 lookahead（可后续增强）
- **meta-controller**：检测停滞并做 continue / pivot / kill / archive

### 9.8.1 为什么不推荐 GA / ACO / SA / 纯 Tabu 作为主框架
我们讨论后得出的判断是：

- **遗传算法**：适合生成多样候选，不适合主控
- **蚁群算法**：适合固定图路径优化，不适合异质研究动作
- **模拟退火**：可用于局部扰动，不适合主规划层
- **禁忌搜索**：很适合作为反循环记忆，但不适合作为唯一主框架

原因在于本问题具有：
- 结构化对象状态
- 不确定转移
- 高成本动作
- 需要解释性
- 需要回退与分支治理

这些特性更适合分层重规划，而不是纯元启发式作为顶层主框架。

---

# 第 10 章 退出、回退、转向与经验吸收

## 10.1 为什么这些机制必须内建
如果系统只会“继续做”，最终会出现两种坏模式：

1. **低效徘徊**  
   持续做小修小补，没有决定性推进。

2. **路径依赖**  
   明明方向已经不值得做，系统仍因为局部已有投入而继续补实验。

因此，退出、回退、转向和经验吸收必须是显式机制，而不是异常处理。

## 10.2 退出机制
建议统一定义以下 5 类决策：

### 10.2.1 `Advance`
当前阶段达标，进入下一阶段。  
例如从“值得继续投入”进入“写作前论证收敛”。

### 10.2.2 `Continue`
继续当前阶段搜索。  
这是最常见状态，但必须说明继续的原因和目标缺口。

### 10.2.3 `Pivot`
不是终止项目，而是改变 formulation、目标或 claim 结构。  
例如：
- superiority claim → insight claim
- 通用问题 → 限定场景问题
- method paper → empirical study

### 10.2.4 `Kill`
终止当前路线。  
典型原因：
- 价值不足
- 新意不足
- feasibility 长期不成立
- 证据成本远超预期且不值得

### 10.2.5 `Archive`
暂时归档，保留未来重启可能。  
典型原因：
- 预算不足
- 外部依赖未满足
- 当前时机不适合继续

## 10.3 回退机制
不建议把回退理解为事务回滚，而应理解为：

> 基于新证据或新判断，从更早层级重新规划。

建议四级回退：

### 10.3.1 Claim-level reopen
适用于：
- claim 过强
- claim 边界不清
- evidence 不足以支撑当前强度

### 10.3.2 Protocol / Baseline-level reopen
适用于：
- baseline 选择不充分
- metric 与任务不匹配
- comparison 不公平
- statistical validity 有问题

### 10.3.3 Method / Execution-level reopen
适用于：
- 多轮执行失败
- 实现方案不可行
- run 显示核心机制不成立

### 10.3.4 Problem / Value-level reopen
适用于：
- 问题本身不够重要
- delta 不足
- 即使做成也缺乏发表价值

## 10.4 经验吸收机制
经验吸收是系统长期变强的关键。  
建议分为两层。

### 10.4.1 项目内经验
保存本项目中的：
- 哪类动作在什么状态下有效
- 哪些 blocker 经常出现
- 哪些路径导致高成本低收益
- 哪些 pivot 最终效果较好

### 10.4.2 跨项目经验
作为后续增强：
- 某类 problem / claim / protocol 的常见失败模式
- 某类贡献常被 reviewer 质疑的点
- 某类 action 在某领域里的历史成效

## 10.5 记忆层设计
建议至少保存以下结构：

### 10.5.1 Recent tabu memory
防止短期重复做无效动作：
- 类似动作在相似状态下近期失败
- 同一 blocker 被低效反复尝试

### 10.5.2 Action history
每次动作记录：
- 输入状态摘要
- 动作 spec
- 实际输出
- 对维度的实际影响
- 成本
- 失败原因

### 10.5.3 Lesson store
结构化 lesson：
- 正向模式
- 失败模式
- blocker 模式
- 转向先验

### 10.5.4 Decision rationale
记录：
- 为什么 continue / pivot / kill / archive
- 该决策依赖了哪些对象和维度
- 是否有人类确认

## 10.6 建议的 Decision / Lesson 类型
```ts
type DecisionType =
  | "advance"
  | "continue"
  | "reopen"
  | "pivot"
  | "kill"
  | "archive"
  | "merge";

interface DecisionRecord {
  id: string;
  projectId: string;
  branchId: string;
  type: DecisionType;
  reason: string;
  triggeredBy: {
    blockers?: string[];
    stagnationSignals?: string[];
    dimensionRefs?: DimensionName[];
    objectRefs?: string[];
  };
  humanConfirmed: boolean;
  createdAt: string;
}

type LessonType =
  | "positive_pattern"
  | "failure_pattern"
  | "blocker_pattern"
  | "heuristic_prior";

interface LessonRecord {
  id: string;
  projectId: string;
  branchId?: string;
  type: LessonType;
  summary: string;
  applicabilityTags: string[];
  originDecisionId?: string;
  reliability: number; // 0-1
  createdAt: string;
}
```

---

## 11.1 为什么这个框架适配 LLM
本次讨论的核心结论之一是：

> 研究论证的 reviewer-constrained 搜索，比端到端自动写论文更适合 LLM。

原因如下：

### 11.1.1 LLM 擅长候选生成与归纳
LLM 在以下任务上通常表现较强：
- 生成 problem / claim / protocol 候选
- 归纳 literature gap
- 提炼 failure mode
- 总结结果与边界
- 从 reviewer 角度找缺口

### 11.1.2 LLM 擅长批判与重规划
在本框架中，LLM 的作用不是“给答案”，而是：
- 提出下一步可选动作
- 分析为什么当前状态没收敛
- 在 evidence 改变后重新解释路径
- 建议 pivot / reopen / kill

### 11.1.3 LLM 不需要当唯一真值源
一旦系统中存在：
- 对象图
- 规则引擎
- 可追溯 evidence
- 确定性执行器  
LLM 就不需要“知道一切”，而是负责在约束下进行高价值推理。

## 11.2 LLM 不适合独自承担什么
以下事情不应交给 LLM 作为唯一裁决者：

- 充当实验数值真值源
- 声称 evidence 已存在而实际上没有
- 作为唯一 reviewer oracle
- 绕过规则引擎直接写入状态
- 在无对象图支撑下评估“总体 readiness”

## 11.3 建议的角色拆分
建议将 LLM 角色拆为四类。

### 11.3.1 Proposer
负责提出：
- candidate claims
- protocol 候选
- action bundles
- pivot 方案
- branch formulation

### 11.3.2 Critic
负责批判：
- value 是否站得住
- novelty 是否真实
- protocol 是否有漏洞
- evidence 是否充分
- claim 是否过强
- boundary 是否诚实

### 11.3.3 Synthesizer
负责把来自：
- literature
- runs
- logs
- analysis
- reviews  
的结果整合为结构化对象更新，而不是 prose。

### 11.3.4 Controller Assistant
辅助 meta-controller 做：
- 是否进入下一阶段
- 是否出现停滞
- 是否建议 pivot / kill
- 是否应请求人工确认

## 11.4 Critic Hub
我们讨论后，建议不要只用一个通用 reviewer agent，而是建立 **Critic Hub**。  
它可以包含：

- `GeneralReviewerCritic`
- `NoveltyCritic`
- `ValueCritic`
- `EvaluationFairnessCritic`
- `ReproducibilityCritic`
- `BoundaryRiskCritic`
- `RuleEngine`

其中：
- LLM critic 负责归纳、批判、建议
- RuleEngine 负责确定性硬约束检查

## 11.5 Human-in-the-loop 的位置
虽然目标是高自动化，但仍建议在以下节点要求或鼓励人工确认：

### 11.5.1 建议人工确认的动作
- kill / archive
- problem/value 层 pivot
- 删除或显著弱化核心 claim
- 改写 branch 主假设
- 进行高成本 full run 前
- 写入高风险 boundary / ethics note 时

### 11.5.2 可全自动执行的动作
- 文献整理
- 候选动作生成
- 低成本 probe
- 日志/结果 ingestion
- evidence classification 初稿
- coverage 检查
- 风险清单生成

### 12.2.2 State Synthesizer
职责：
- 从对象图合成抽象状态
- 计算维度 level / score / confidence / blockers
- 产出当前 stage readiness 视图

### 12.2.3 Planner
职责：
- 基于当前 `AbstractState + ArgumentGraph`
- 生成候选动作池
- 组装动作包
- 对动作包评分并排序
- 将 top bundle 提交给 executor

### 12.2.4 Critic Hub
职责：
- 生成 reviewer-style critique
- 校验 novelty / fairness / reproducibility / value
- 与规则引擎一起产出 blocker / issue / risk

### 12.2.5 Executor Layer
职责：
- 触发文献检索
- 触发 run / probe / analysis
- 收集 artifacts
- 对接本地脚本、外部执行器或 API

### 12.2.6 Meta-Controller
职责：
- 阶段判定
- 停滞检测
- continue / pivot / kill / archive / advance
- 调整 planner 参数
- 更新 memory

## 12.3 一轮 planner loop 的控制流
建议控制流如下：

1. `Graph Update`
2. `State Synthesis`
3. `Meta Diagnosis`
4. `Candidate Generation`
5. `Critic / Rule Pass`
6. `Bundle Planning`
7. `Execution`
8. `Structured Update`
9. `Decision`
10. `Memory Update`

这形成 **anytime replanning loop**。

## 12.4 后台任务与长时运行
与当前仓库 requirements 一致，系统必须支持：

- 队列
- 重试
- 断点恢复
- 状态追踪
- 幂等执行
- 错误分级
- 调用成本统计

### 12.4.1 任务类型建议
- `retrieval_task`
- `probe_run_task`
- `full_run_task`
- `analysis_task`
- `critic_task`
- `state_recompute_task`
- `report_task`

### 12.4.2 状态建议
- `queued`
- `running`
- `succeeded`
- `failed`
- `retrying`
- `cancelled`
- `blocked`

## 13.3 与当前八个 sub-functions 的关系
建议重新解释如下：

| 现有 sub-function | 建议角色 |
|---|---|
| 1 文献管理 | 支撑层 |
| 2 研究方向 | 上游候选池 / 探索层 |
| 3 理论框架与研究设计 | 宏动作族 SF3 |
| 4 实验设计 | 宏动作族 SF4 |
| 5 模型与训练 | 改名后作为宏动作族 SF5 |
| 6 数据分析与讨论 | 改名后作为宏动作族 SF6 |
| 7 写作、投稿、修稿 | 后续写作层 |
| 8 论文管理 | 上升为控制面 / meta layer |

### 13.3.1 为什么不是废弃 8 个 sub-functions
因为它们仍然有价值：
- 适合做信息架构
- 适合做模块归属
- 适合做大类动作划分

### 13.3.2 为什么不能继续把 8 个 sub-functions 当主流程
因为真正的研究推进与决策依赖：
- 分支
- 回退
- constraints
- object graph  
而不是编号顺序。

## 13.4 分阶段落地路线

### 13.4.1 V1：最小可用研究论证层
- 对象图最小集合
- 9 维抽象状态
- 人工/规则驱动状态合成
- 候选动作生成与排序
- continue / pivot / kill / archive
- 基本控制面

### 13.4.2 V1.5：Critic 与 bundle planner
- Critic Hub
- 动作包与并行执行
- stagnation detection
- tabu-style memory
- stage-gated cost weighting

### 13.4.3 V2：学习型增强
- contextual bandit 动作排序
- lesson prior 学习
- MCTS-style short rollout
- domain-specific critic profile

### 13.4.4 V3：与写作层打通
- 从 `ReadyForWritingEntry` 进入文稿写作工作流
- 将对象图映射到章节骨架与写作建议
- 保持 evidence traceability 到最终手稿

## 14.2 算法层面的坑

### 14.2.1 只看总分
风险：
- blocker 被掩盖
- 小步刷分替代关键推进

缓解：
- 强制使用 `level + blockers + confidence` 进行阶段判断

### 14.2.2 成本惩罚过高
风险：
- 系统在第二阶段不愿做关键大动作
- 卡在“看起来在推进”的小修小补

缓解：
- 采用阶段化 cost weighting

### 14.2.3 忽略信息增益
风险：
- 系统偏好直接提分动作
- 不愿做 probe、对照检查、novelty 检索等高信息增益动作

缓解：
- 将 `information_gain` 显式纳入 heuristic

### 14.2.4 不支持回退
风险：
- 系统把错误路径越走越深
- 无法体现真实研究迭代

缓解：
- reopen / pivot / kill 一等公民化

## 15.2 可吸收的模式

### 15.2.1 ResearchAgent
可吸收点：
- 问题识别、方法设计、实验设计三段式生成
- reviewing agents 迭代 refinement
- 用多 reviewer feedback 驱动 idea 质量提升

对本项目的启发：
- 与 SF3/SF4 的划分天然契合
- 说明“proposal + review + revise”比单步生成更适合研究自动化

### 15.2.2 data-to-paper
可吸收点：
- backward traceability
- rewind
- record/replay
- coding guardrails
- API cost tracking

对本项目的启发：
- 我们讨论的 rollback、decision log、lesson、traceability 都可从这里得到工程化支持思路
- 证明“可追溯的 research pipeline”比“最终文本漂亮”更重要

### 15.2.3 AI co-scientist
可吸收点：
- 专用角色分工：generation / reflection / ranking / evolution / meta-review
- 强调多 agent 协同而不是单 agent 全知

对本项目的启发：
- Critic Hub 的角色拆分
- 第一阶段价值 / 新颖性 / feasibility 的多视角批判

### 15.2.4 AI-Researcher
可吸收点：
- literature → idea → implementation → validation → analysis 的循环
- experiment analysis / advisor agent

对本项目的启发：
- SF5/SF6 的执行与分析闭环
- “结果不好时如何给出下一轮动作建议”

### 15.2.5 OpenReviewer
可吸收点：
- reviewer 不是通用 LLM 的平替
- 专门 reviewer 模型能给出更 critical、更 realistic 的反馈

对本项目的启发：
- 不应只依赖单一通用 LLM critic
- 可以考虑 future 的 reviewer-profile critic 或 fine-tuned critic

### 15.2.6 SciFact / claim-evidence 相关工作
可吸收点：
- Claim–Evidence–Rationale 的结构化判定

对本项目的启发：
- 强化 claim-support 不是“凭感觉”，而应有结构化 evidence linking

## 15.3 不宜直接照搬的模式

### 15.3.1 end-to-end paper generation
以 AI Scientist、AI-Researcher 某些展示形态为代表，这类系统经常强调从 idea 到完整 paper。  
不宜直接照搬的原因：
- 与当前项目边界不一致
- 容易过度承诺
- 真实稳定性更多来自模板约束与代码表达型课题

### 15.3.2 无对象图支撑的纯 agent pipeline
只有多 agent chat、没有结构化状态，会导致：
- 状态无法稳定继承
- 难以回放
- 决策理由不清
- 经验无法沉淀

### 15.3.3 纯 reviewer 打分驱动
如果系统只是多 reviewer 打分：
- 容易变成评论生成器
- 无法直接驱动行动
- 不知道“该改什么对象、做什么动作”

# 附录 C Planner Loop 伪代码

```text
function planner_loop(project_id, branch_id):
    G = load_argument_graph(project_id, branch_id)
    Z = synthesize_abstract_state(G)

    meta_signal = meta_controller.diagnose(Z, G, history)

    if meta_signal.decision in ["kill", "archive", "pivot", "advance"]:
        persist_decision(meta_signal)
        return meta_signal

    candidates = candidate_generator.expand(G, Z, meta_signal)

    critiques = critic_hub.evaluate(candidates, G, Z)

    bundles = bundle_planner.compose(candidates, critiques, resource_state)

    scored_bundles = heuristic_scorer.rank(bundles, Z, history, memory)

    chosen = select_top_k(scored_bundles)

    results = executor.run(chosen)

    G2 = apply_structured_updates(G, results)

    Z2 = synthesize_abstract_state(G2)

    decision = meta_controller.decide(Z2, G2, results, history)

    memory.update(G, chosen, results, decision)

    persist(G2, Z2, decision)

    return {
        "state": Z2,
        "decision": decision,
        "results": results
    }
```

---

# 附录 D 示例场景

## 场景：一个新方法方向是否值得继续投入

### 初始状态
研究者提出一个方向：
- 想解决某个任务中的效率问题
- 认为自己有新机制
- 但还没有系统性 baseline 与协议设计

### 第 1 轮
系统执行：
- SF3：定义 problem、value hypothesis、初步 claims
- SF3：建立 contribution delta 草案
- SF4：补一个最小 baseline set 草案
- SF5：跑 feasibility probe

结果：
- `ProblemImportance` 上升到 `Partial`
- `ContributionValue` 上升到 `Partial`
- `NoveltyDelta` 仍 `Unknown`
- `OutcomeFeasibility` 从 `Unknown` 变为 `Partial`

### 第 2 轮
系统发现 novelty 置信度低，于是执行：
- literature 检索
- related work delta 比对
- claim 收缩
- baseline fairness 审查

结果：
- 发现已有近邻方法，原 superiority claim 过强
- 系统建议 `pivot`: 从“全面优于现有方法”改为“在资源受限场景下更优”

### 第 3 轮
新的 branch 继续：
- 更新 value hypothesis
- 更新 claim
- 设计更匹配的 evaluation protocol
- 跑两个小规模 baseline 比较

结果：
- `NoveltyDelta` 上升到 `Sufficient`
- `ContributionValue` 上升到 `Sufficient`
- `OutcomeFeasibility` 上升到 `Sufficient`
- 阶段 1 通过，进入阶段 2

### 第 4–6 轮
系统继续补：
- ablation
- robustness
- failure case
- boundary extraction
- artifact capture

最终：
- 核心 claim 清晰
- evidence requirement 基本满足
- protocol / baseline 合理
- limitation 已明确

系统输出：
- `ReadyForWritingEntry`

这说明：
- 研究论证层不是在写论文
- 它在为后续写作准备结构化、可追溯、可审稿的素材与判断

---
