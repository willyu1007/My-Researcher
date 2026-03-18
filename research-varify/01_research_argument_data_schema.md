# Research Argument Data Schema

**来源**：基于 `00_research_argument_framework_rchr.md` 拆分出的实现规格文档。  

**定位**：面向数据建模、对象落库、状态合成、对象关系与安全落库规则。  

**建议仓库位置**：`docs/architecture/research_argument_data_schema.md`

## 文档用途

- 定义研究论证层的抽象状态与论证对象图。
- 为 Postgres/Prisma schema、服务层 DTO、状态合成器提供统一字段约束。
- 明确哪些对象是一等公民、如何关联、哪些内容允许落库、哪些必须保留为候选态。

## 与总文档的关系

- 总文档回答“为什么这样设计、整体框架是什么”。
- 本文档回答“系统里到底要存什么、怎么存、对象之间如何映射到审稿约束层”。

# 第 6 章 审稿约束层：方向性目标空间

## 6.1 为什么选择“审稿约束层”作为抽象状态空间
研究论证如果没有明确方向，很容易沦为：

- 任意 brainstorm
- 无尽的低收益实验
- 文本上看起来很忙，实质上无关键推进

“审稿约束层”的作用是把“研究进展”改写成：

- 哪些关键维度已足够
- 哪些维度仍被 blocker 阻塞
- 哪些维度只是低置信度的暂时判断
- 下一步做什么最可能推进整体 readiness

因此，它是 LLM 自动化的**方向盘**，而不是最终真理。

## 6.2 约束维度定义
结合前面的讨论，建议将审稿约束层定义为以下 9 个维度。

### 6.2.1 第一段：是否值得继续投入
1. **ProblemImportance**  
   问题是否重要，是否值得社区或目标受众关注。

2. **ContributionValue**  
   即使结果成立，它是否具有足够发表价值，而不是低价值增量。

3. **NoveltyDelta**  
   相对于代表性已有工作，新意是否真实存在，是否具备足够 delta。

4. **OutcomeFeasibility**  
   当前方案是否存在合理产出路径，是否可能在预算内拿到可论证结果。

### 6.2.2 第二段：是否具备进入写作的论证基础
5. **ClaimSharpness**  
   核心 claim 是否清晰、可检验、边界明确、避免 over-claim。

6. **EvidenceCompleteness**  
   claim 对应所需 evidence 是否基本齐备，缺口是否已经可控。

7. **EvaluationSoundness**  
   protocol、baseline、metric、对比、公平性是否基本成立。

8. **BoundaryRiskCoverage**  
   已知边界、失败模式、limitation、风险是否被识别并纳入。

9. **ReproducibilityReadiness**  
   支撑主结果的 run/artifact/config/procedure 是否已达到最低复现准备度。

> 注：`Clarity / Presentation` 不放在当前层。  
> 它属于后续写作层，而不是本轮讨论的研究论证层。

## 6.3 每个维度的状态表示
每个维度建议采用统一的混合状态结构。

### 6.3.1 核心字段
| 字段 | 类型 | 含义 |
|---|---|---|
| `level` | enum | 语义层级状态 |
| `score` | number | 连续分数，用于排序 |
| `confidence` | number | 当前判断置信度 |
| `blockers` | string[] / structured[] | 当前硬阻塞项 |
| `gap` | number | 距离当前阶段门槛的距离 |
| `velocity` | number | 最近若干轮改善速度 |
| `evidenceRefs` | id[] | 支撑当前状态判断的对象引用 |
| `updatedAt` | datetime | 最近更新时间 |

### 6.3.2 `level` 建议取值
```ts
type ReadinessLevel =
  | "Unknown"
  | "Blocked"
  | "Partial"
  | "Sufficient"
  | "Strong";
```

语义建议：

- `Unknown`：信息不足，无法判断
- `Blocked`：存在明确一级阻塞
- `Partial`：已有部分支撑，但仍不足
- `Sufficient`：达到当前阶段最低门槛
- `Strong`：明显高于最低门槛

### 6.3.3 `score` 的作用
`score` 不是最终判定，而是辅助启发式搜索做排序。  
例如，当两个动作都能把某维度从 `Partial` 推进向 `Sufficient` 时，`score` 能帮助比较谁的边际收益更大。

建议区间：
- `[0, 100]` 更利于 UI 和排序
- 也可内部使用 `[0, 1]`，对外转换为百分制

### 6.3.4 `confidence` 的作用
很多时候问题不是“低分”，而是“低置信度”。  
例如：
- novelty 可能看起来不错，但 related work 覆盖不足
- feasibility 可能有希望，但还没有 probe
- evidence 可能看起来足够，但只有单次 run

因此 `confidence` 是启发式搜索的关键输入之一。

## 6.4 分数与阶段门槛

### 6.4.1 为什么既要 level，又要 score
- `level` 用于：
  - 阶段切换
  - blocker 判断
  - 状态解释
  - UI 标签
- `score` 用于：
  - 候选动作排序
  - bundle 价值估计
  - 细粒度比较

### 6.4.2 为什么不能只用总分
总分最大化会导致：

- 系统偏向刷低成本、易提升的小项
- 忽略关键 blocker
- 隐藏“结构性不成立”的风险
- 导致“看起来进步很大，实际上仍不能继续投入”

因此：
- 不使用单一全局总分作为主决策依据
- 阶段切换必须同时检查 `level + blockers + confidence`

### 6.4.3 阶段门槛建议
**阶段 1 通过条件（WorthContinuing）**  
以下四维至少达到 `Sufficient`，且无一级 blocker：
- ProblemImportance
- ContributionValue
- NoveltyDelta
- OutcomeFeasibility

**阶段 2 通过条件（ReadyForWritingEntry）**  
以下五维至少达到 `Sufficient`，且无一级 blocker：
- ClaimSharpness
- EvidenceCompleteness
- EvaluationSoundness
- BoundaryRiskCoverage
- ReproducibilityReadiness

## 6.5 收敛、回退与重开
维度状态不应假定单调提升。  
典型反例：

- 补入更强 baseline 后，`EvaluationSoundness` 上升，但 superiority claim 被削弱，`ContributionValue` 下降
- 新 related work 出现后，`NoveltyDelta` 下降
- 新 probe 失败后，`OutcomeFeasibility` 下降
- claim 收缩后，`ClaimSharpness` 上升，但 `ContributionValue` 可能下降

因此系统必须允许：
- score 降低
- level 回退
- blockers 重开
- stage 重新评估

## 6.6 建议的抽象状态类型定义
```ts
type DimensionName =
  | "ProblemImportance"
  | "ContributionValue"
  | "NoveltyDelta"
  | "OutcomeFeasibility"
  | "ClaimSharpness"
  | "EvidenceCompleteness"
  | "EvaluationSoundness"
  | "BoundaryRiskCoverage"
  | "ReproducibilityReadiness";

type ReadinessLevel =
  | "Unknown"
  | "Blocked"
  | "Partial"
  | "Sufficient"
  | "Strong";

interface BlockerRef {
  id: string;
  severity: "low" | "medium" | "high" | "critical";
  summary: string;
  linkedObjectIds?: string[];
  linkedRequirementIds?: string[];
}

interface DimensionState {
  name: DimensionName;
  level: ReadinessLevel;
  score: number;           // 0-100
  confidence: number;      // 0-1
  gap: number;             // 0-100, to current stage threshold
  velocity: number;        // signed, recent trend
  blockers: BlockerRef[];
  evidenceRefs: string[];
  updatedAt: string;
  rationale?: string;
}

interface AbstractState {
  projectId: string;
  branchId: string;
  stage: "Stage1_WorthContinuing" | "Stage2_ReadyForWritingEntry";
  dimensions: Record<DimensionName, DimensionState>;
  globalFlags: {
    hasCriticalBlocker: boolean;
    isPlateauing: boolean;
    isOscillating: boolean;
    hasDominatedBranch: boolean;
  };
  derived: {
    currentGoalSatisfied: boolean;
    nextBestTargets: DimensionName[];
  };
  version: number;
  createdAt: string;
}
```

---

# 第 7 章 论证对象图：真实研究状态层

## 7.1 为什么需要对象图
审稿约束层只能回答“离目标多远”，却不能回答：

- 为什么还没收敛
- 缺少什么具体对象
- 哪个动作会改变哪一部分状态
- 某个结论到底依据什么

因此必须引入**论证对象图**作为真实状态层。

它是系统的“研究世界模型”，而不是简单的数据表集合。

## 7.2 核心对象定义
建议最少定义以下对象。

### 7.2.1 `Project`
项目级容器，保存：
- 项目基本信息
- 领域 profile
- 当前 active branch
- 阶段状态
- 预算约束
- venue 目标（可选）
- 与 Git、工作区、同步的绑定关系

### 7.2.2 `Branch`
分支代表一条研究 formulation / 实验路线 / 论证路线。  
它不是 Git branch 的替代，而是**研究语义分支**。

字段建议：
- `id`
- `projectId`
- `name`
- `status` (`active / paused / archived / killed / merged`)
- `parentBranchId`
- `branchReason`
- `hypothesisSummary`
- `ownedClaimIds`
- `decisionRefs`

### 7.2.3 `Problem`
描述研究要解决的问题。

字段建议：
- `statement`
- `targetDomain`
- `audience`
- `painPoint`
- `importanceRationale`
- `scope`
- `nonGoals`

### 7.2.4 `ValueHypothesis`
回答“做成之后为什么值得发”。

字段建议：
- `valueType`  
  例如 `performance / efficiency / reliability / robustness / insight / usability / benchmark / framework`
- `expectedImpact`
- `targetUsersOrCommunity`
- `successCondition`
- `failureCondition`

### 7.2.5 `ContributionDelta`
表示与已有工作的差异化位置。

字段建议：
- `anchorWorkIds`
- `deltaType`  
  例如 `new_method / new_insight / new_analysis / stronger_empirical_case / efficiency_tradeoff / dataset / benchmark`
- `deltaSummary`
- `noveltyRiskNotes`
- `closestCompetitors`

### 7.2.6 `Claim`
系统中的一等公民。  
建议类型化，而不是泛化单桶。

字段建议：
- `claimType`
  - `problem_claim`
  - `novelty_claim`
  - `performance_claim`
  - `efficiency_claim`
  - `mechanistic_claim`
  - `scope_claim`
  - `limitation_claim`
- `text`
- `status`
  - `candidate / active / weakened / rejected / retired`
- `strength`
  - `tentative / moderate / strong`
- `scope`
- `ownerBranchId`
- `supportState`
- `linkedEvidenceRequirementIds`
- `linkedBoundaryIds`

### 7.2.7 `EvidenceRequirement`
描述“要让某个 claim 成立，需要什么证据”。

字段建议：
- `claimId`
- `requiredEvidenceType`
  - `main_result`
  - `ablation`
  - `robustness`
  - `efficiency`
  - `error_analysis`
  - `theoretical`
  - `qualitative`
  - `reproduction`
- `isMandatory`
- `satisfactionRule`
- `priority`
- `status`

### 7.2.8 `EvidenceItem`
表示已经收集到的证据项。  
注意：它不应只是一段文本，也可以是表格、图、日志摘要、统计结果。

字段建议：
- `evidenceType`
- `sourceType`
  - `run`
  - `analysis`
  - `literature`
  - `manual_input`
  - `artifact`
- `sourceRef`
- `summary`
- `supportDirection`
  - `supports / weakens / refutes / inconclusive`
- `confidence`
- `linkedRequirementIds`
- `linkedClaimIds`
- `provenance`

### 7.2.9 `BaselineSet`
表示某组对照方案及其选择理由。

字段建议：
- `baselines`
- `selectionPolicy`
- `coverageNotes`
- `missingStrongBaselineNotes`
- `fairnessRisks`
- `linkedProtocolIds`

### 7.2.10 `Protocol`
评测/训练/数据/统计协议的统一表示。

字段建议：
- `protocolType`
  - `evaluation / training / data / comparison / stats`
- `datasetInfo`
- `splitInfo`
- `metrics`
- `comparisonRules`
- `statisticalChecks`
- `reproRequirements`
- `status`

### 7.2.11 `Run`
代表一次实际执行。

字段建议：
- `runType`
  - `probe / pilot / full / ablation / robustness / baseline`
- `configRef`
- `executorRef`
- `inputs`
- `outputs`
- `status`
- `cost`
- `duration`
- `failureReason`
- `artifactIds`

### 7.2.12 `Artifact`
支撑复现或分析的产物。

字段建议：
- `artifactType`
  - `code / config / model / log / table / figure / script / report`
- `location`
- `version`
- `hash`
- `isReusable`
- `accessPolicy`

### 7.2.13 `AnalysisFinding`
分析得出的结构化结论，不等于最终 claim。

字段建议：
- `findingType`
  - `pattern / anomaly / failure_case / limitation / comparative_observation / stability`
- `summary`
- `derivedFrom`
- `linkedEvidenceItemIds`
- `suggestedClaimUpdates`
- `riskFlags`

### 7.2.14 `Boundary`
对范围、限制、失效条件的结构化表示。

字段建议：
- `boundaryType`
  - `scope / limitation / threat_to_validity / failure_mode / ethical_risk`
- `statement`
- `triggerCondition`
- `severity`
- `linkedClaimIds`

### 7.2.15 `Decision`
表示系统/用户做出的结构性决策。

字段建议：
- `decisionType`
  - `advance / continue / reopen / pivot / kill / archive / merge`
- `targetBranchId`
- `reason`
- `triggeredBy`
- `linkedObjectIds`
- `humanConfirmed`

### 7.2.16 `Lesson`
经验教训对象。

字段建议：
- `lessonType`
  - `positive_pattern / failure_pattern / blocker_pattern / heuristic_prior`
- `summary`
- `originDecisionId`
- `originRunIds`
- `applicabilityTags`
- `reliability`

## 7.3 对象关系
对象图的价值不在于“有很多表”，而在于“关系明确”。

建议至少定义以下关系类型：

- `derives_from`
- `supports`
- `weakens`
- `refutes`
- `requires`
- `constrains`
- `blocks`
- `belongs_to_branch`
- `supersedes`
- `motivates`
- `triggered_by`
- `reopens`
- `produces`
- `summarizes`

例如：

- `Problem -> motivates -> ValueHypothesis`
- `ValueHypothesis -> derives_from -> ContributionDelta`
- `Claim -> requires -> EvidenceRequirement`
- `EvidenceItem -> supports -> Claim`
- `BaselineSet -> constrains -> Protocol`
- `Run -> produces -> Artifact`
- `AnalysisFinding -> weakens -> Claim`
- `Boundary -> constrains -> Claim`
- `Decision(pivot) -> reopens -> Problem`

## 7.4 对象图如何投影到审稿约束层
抽象状态不手工维护，而是由对象图合成。

示例：

### 7.4.1 `NoveltyDelta`
主要由以下对象投影而来：
- `ContributionDelta`
- `closestCompetitors`
- `noveltyRiskNotes`
- 文献检索结果
- 与近邻工作的差异证据

### 7.4.2 `EvidenceCompleteness`
主要由以下对象投影而来：
- 各 `Claim` 的 `EvidenceRequirement`
- requirement 的满足状态
- `EvidenceItem` 的支持强度
- 关键 requirement 是否缺失

### 7.4.3 `EvaluationSoundness`
主要由以下对象投影而来：
- `BaselineSet`
- `Protocol`
- `Run`
- `AnalysisFinding` 中的 fairness / stability / stats 相关结论

### 7.4.4 `BoundaryRiskCoverage`
主要由以下对象投影而来：
- `Boundary`
- failure case
- limitation finding
- threat to validity
- ethics / misuse / external validity notes

## 7.5 与仓库现有实体的映射关系
当前 `requirements.md` 已有高层实体：

- `Project`
- `Document`
- `Section`
- `Claim`
- `Evidence`
- `ClaimEvidence`
- `Baseline`
- `Protocol`
- `ReproItem`
- `Issue`
- `Report`

本次讨论建议：

### 7.5.1 可直接承接
- `Project`
- `Claim`
- `Evidence`
- `Baseline`
- `Protocol`
- `ReproItem`

### 7.5.2 需要扩展
- `Evidence` → 细分为 `EvidenceRequirement + EvidenceItem`
- `Issue` → 继续保留，但建议与 `Blocker / Risk / Boundary` 打通
- `Report` → 可作为 `AbstractState` 投影产物之一

### 7.5.3 需要新增
- `ValueHypothesis`
- `ContributionDelta`
- `Run`
- `Artifact`
- `AnalysisFinding`
- `Boundary`
- `Branch`
- `Decision`
- `Lesson`

---

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

## 11.6 LLM 输出落库的条件
任何 LLM 输出若要进入对象图，建议满足至少一项：

1. 带来源引用（文献、run、artifact、analysis）
2. 只是候选对象，状态标记为 `candidate / low-confidence`
3. 通过规则引擎或 critic hub 交叉检查
4. 经过人工确认

---

### 12.2.1 Argument Graph Store
职责：
- 存储对象图
- 存储抽象状态快照
- 存储动作历史、决策、lesson
- 提供对象关系查询与变更追踪

建议基于当前 Postgres/Prisma 方案实现。

## 12.5 与本地优先 / Git / 多设备同步的关系
当前项目正式要求：

- local-first
- Git 深度集成
- 多设备同步控制面

本框架与这些要求并不冲突，反而能自然承接。

### 12.5.1 Local-first
对象图、动作历史、artifact 引用、抽象状态都应默认本地可用。  
远程同步的是：
- 元数据
- 允许同步的对象快照
- 任务状态
- lesson / decision（按策略）

### 12.5.2 Git 的位置
Git 不是研究对象图本身，但承担：
- 工作区内容版本化
- 配置/脚本/文稿 diff
- 回放与对比参考
- 与 branch 决策的弱关联

研究分支 `Branch` 不等于 Git branch，但可建立映射。

### 12.5.3 多设备同步
多设备同步应更像**控制面同步**，而非无差别传输所有 artifact。  
需考虑：
- 权限
- 全文 RAG 授权边界
- artifact 大对象
- 冲突恢复

## 13.2 需要调整或新增的部分
### 13.2.1 命名层面
- “论文管理”建议在内部改称“研究论证控制面”或“Research Argument Control Plane”
- sub-function 5 改成 `Method Implementation & Execution`
- sub-function 6 改成 `Evidence Analysis & Boundary Update`

### 13.2.2 数据层面
新增对象：
- `ValueHypothesis`
- `ContributionDelta`
- `EvidenceRequirement`
- `Branch`
- `Run`
- `Artifact`
- `AnalysisFinding`
- `Boundary`
- `Decision`
- `Lesson`

### 13.2.3 算法层面
新增模块：
- `StateSynthesizer`
- `Planner`
- `MetaController`
- `Memory`
- `CriticHub`

## 14.3 系统层面的坑

### 14.3.1 状态与对象不同步
风险：
- UI 看起来一切正常，但对象图已经过时
- planner 依据旧状态规划

缓解：
- 任何对象更新后触发 state synthesis
- 支持 snapshot + recompute

### 14.3.2 无 evidence 的内容污染对象图
风险：
- LLM 幻觉进入系统真状态
- 后续所有规划建立在伪前提上

缓解：
- 落库要求：来源 / candidate 标记 / cross-check / human confirmation

### 14.3.3 回退不可追溯
风险：
- 用户不知道为什么系统回退
- 决策难以复盘

缓解：
- 所有 reopen / pivot / kill 都写入 `DecisionRecord`

### 14.3.4 长时任务不可恢复
风险：
- full run / 检索 / 分析中断后状态损坏

缓解：
- 幂等设计
- checkpoint
- task status persistence

# 附录 A 术语表

| 术语 | 含义 |
|---|---|
| 研究论证 | 从问题到 claim / evidence / protocol / boundary 收敛的过程 |
| 审稿约束层 | 以 reviewer-facing readiness 为方向的抽象状态空间 |
| 论证对象图 | 保存真实研究状态的结构化对象与关系图 |
| 两段式收敛 | 阶段 1 判断是否值得继续；阶段 2 判断是否具备进入写作的论证基础 |
| Claim | 论文/研究要表达的结构化主张 |
| EvidenceRequirement | 支撑某个 claim 所需的证据要求 |
| EvidenceItem | 实际收集到的证据项 |
| BaselineSet | 一组对照对象及其选择理由 |
| Protocol | 评测/训练/数据/统计等协议 |
| Boundary | 范围、限制、失效条件、威胁有效性的结构化表示 |
| Branch | 一条研究 formulation 或执行路线 |
| Pivot | 改变路线但不必终止项目 |
| Reopen | 回到更早层级重新规划 |
| ReadyForWritingEntry | 已具备进入真实写作流程的论证基础 |

---

# 附录 B 核心数据结构草案

## B.1 AbstractState
```ts
type Stage =
  | "Stage1_WorthContinuing"
  | "Stage2_ReadyForWritingEntry";

interface AbstractState {
  projectId: string;
  branchId: string;
  stage: Stage;
  dimensions: Record<DimensionName, DimensionState>;
  globalFlags: {
    hasCriticalBlocker: boolean;
    isPlateauing: boolean;
    isOscillating: boolean;
    hasDominatedBranch: boolean;
  };
  derived: {
    currentGoalSatisfied: boolean;
    nextBestTargets: DimensionName[];
  };
  version: number;
  createdAt: string;
}
```

## B.2 ArgumentObjectGraph（核心接口示例）
```ts
interface ProjectNode {
  id: string;
  title: string;
  domainProfile?: string;
  activeBranchId?: string;
  venueProfile?: string;
  budget?: {
    timeHours?: number;
    computeUnits?: number;
    apiBudget?: number;
  };
  createdAt: string;
}

interface BranchNode {
  id: string;
  projectId: string;
  name: string;
  status: "active" | "paused" | "archived" | "killed" | "merged";
  parentBranchId?: string;
  hypothesisSummary?: string;
  branchReason?: string;
  createdAt: string;
}

interface ClaimNode {
  id: string;
  branchId: string;
  claimType:
    | "problem_claim"
    | "novelty_claim"
    | "performance_claim"
    | "efficiency_claim"
    | "mechanistic_claim"
    | "scope_claim"
    | "limitation_claim";
  text: string;
  status: "candidate" | "active" | "weakened" | "rejected" | "retired";
  strength: "tentative" | "moderate" | "strong";
  scope?: string;
  createdAt: string;
}

interface EvidenceRequirementNode {
  id: string;
  claimId: string;
  requiredEvidenceType:
    | "main_result"
    | "ablation"
    | "robustness"
    | "efficiency"
    | "error_analysis"
    | "theoretical"
    | "qualitative"
    | "reproduction";
  isMandatory: boolean;
  priority: "low" | "medium" | "high";
  status: "missing" | "partial" | "satisfied" | "invalidated";
  satisfactionRule?: string;
}

interface EvidenceItemNode {
  id: string;
  branchId: string;
  evidenceType: string;
  sourceType: "run" | "analysis" | "literature" | "manual_input" | "artifact";
  sourceRef?: string;
  summary: string;
  supportDirection: "supports" | "weakens" | "refutes" | "inconclusive";
  confidence: number;
  provenance?: {
    sourceUrl?: string;
    objectId?: string;
    locator?: string;
  };
  createdAt: string;
}

interface ProtocolNode {
  id: string;
  branchId: string;
  protocolType: "evaluation" | "training" | "data" | "comparison" | "stats";
  datasetInfo?: string;
  splitInfo?: string;
  metrics?: string[];
  comparisonRules?: string[];
  statisticalChecks?: string[];
  reproRequirements?: string[];
  status: "draft" | "active" | "needs_revision" | "retired";
}

interface BaselineSetNode {
  id: string;
  branchId: string;
  baselines: string[];
  selectionPolicy?: string;
  coverageNotes?: string;
  fairnessRisks?: string[];
}

interface RunNode {
  id: string;
  branchId: string;
  runType: "probe" | "pilot" | "full" | "ablation" | "robustness" | "baseline";
  status: "queued" | "running" | "succeeded" | "failed" | "cancelled";
  configRef?: string;
  cost?: number;
  durationSec?: number;
  failureReason?: string;
  createdAt: string;
}

interface AnalysisFindingNode {
  id: string;
  branchId: string;
  findingType:
    | "pattern"
    | "anomaly"
    | "failure_case"
    | "limitation"
    | "comparative_observation"
    | "stability";
  summary: string;
  linkedEvidenceItemIds: string[];
  riskFlags?: string[];
  createdAt: string;
}

interface BoundaryNode {
  id: string;
  branchId: string;
  boundaryType: "scope" | "limitation" | "threat_to_validity" | "failure_mode" | "ethical_risk";
  statement: string;
  severity: "low" | "medium" | "high";
  linkedClaimIds: string[];
  createdAt: string;
}
```

## B.3 Action / Bundle / Decision
```ts
interface ActionBundle {
  id: string;
  projectId: string;
  branchId: string;
  actionIds: string[];
  expectedValue: number;
  expectedInformationGain: number;
  expectedBlockerRelease: number;
  estimatedCriticalPath: number;
  estimatedPeakResource: number;
  riskScore: number;
  createdAt: string;
}

interface ExecutionResult {
  bundleId: string;
  actionId: string;
  status: "succeeded" | "failed" | "partial";
  createdObjects: string[];
  updatedObjects: string[];
  deltaSummary: string;
  actualCost?: number;
  failureReason?: string;
}
```

---
