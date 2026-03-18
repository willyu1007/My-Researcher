# 02 Architecture

## Purpose
- 在不进入实现的前提下，明确“选题管理模块”的架构落点、边界、核心对象和与现有 topic / literature / paper lifecycle 的衔接关系。

## Architectural position
- 上游输入层：
  - `topic settings`
  - `literature scope`
  - `auto-pull`
  - literature retrieval / overview
- 中间决策层（本模块）：
  - `ValidatedNeed`
  - `TopicQuestion`
  - `TopicValueAssessment`
  - `TopicPackage`
  - `TopicPromotionDecision`
- 下游执行层：
  - `paper-project`
  - stage-gates
  - writing packages
  - release/risk/rebuttal workflows

## Boundary model
| Layer | Primary responsibility | Must not do |
|---|---|---|
| Topic settings / profile | 定义检索对象、关键词、时间窗、规则绑定 | 不直接表达 research question / value judgement |
| Topic decision layer | 把证据整理成 need/question/value/package，并通过模板化自审推进流程 | 不把大多数中间节点都推回给用户手工审批 |
| Paper project lifecycle | 消费已成立的 research package，进入执行、写作、评审准备 | 不从零承担选题决策过程 |

## MVP object set
| Object | Responsibility | Why it exists in MVP |
|---|---|---|
| `EvidenceMap-core` | 维护最小证据结构，支撑从文献到 need/question/value 的回溯与重审 | 没有它流程无法形成闭环 |
| `ValidatedNeed` | 记录经支持/反证审查后仍成立的问题需求 | 解决“gap 不等于 need” |
| `TopicQuestion` | 记录主问题、子问题、贡献类型、claim 候选 | 解决“题目先行”偏差 |
| `TopicValueAssessment` | 记录 significance/originality/answerability/venue fit 等独立价值判断 | 解决“有问题不等于值得做” |
| `TopicPackage` | 聚合背景、问题、价值、标题候选、evaluation plan 的可交付对象 | 作为 topic 阶段正式输出 |
| `TopicPromotionDecision` | 记录从 topic 到 paper-project 的人工审批决策与 payload | 对齐现有 promotion / stage-gate 风格 |

## EvidenceMap-core minimum contract
- 至少要能记录：
  - evidence unit
  - source refs / literature ids
  - problem pattern
  - solution pattern
  - limitation or unresolved pattern
  - support/challenge relationship to a candidate need
- 至少要支持三类操作：
  - review: 合并、拆分、驳回、标记别名
  - trace: 从 need/question/value 回溯到 evidence refs
  - recheck: 新文献进入后触发 refresh/review_required

## EvidenceMap-core content layers
| Layer | Content | Purpose | Output to next stage |
|---|---|---|---|
| `EvidenceUnit` | 单篇文献的结构化抽取 | 保留原始证据与出处 | pattern lists |
| `ImprovementCandidates` | 可改进列表 | 收集潜在 unmet points | cross-check |
| `SolvedPatterns` | 已解决列表 | 标记已被充分覆盖的问题与方案族 | cross-check |
| `CandidateNeeds` | 交叉审查后的候选真实需求 | 从线索收敛到待确认需求 | validated needs |
| `ValidatedNeeds` | 经人工确认的真实需求 | 进入 question/value/package | package foundation |

### EvidenceMap-core interpretation rule
- “可改进列表”不是最终需求，只是 evidence-derived signals。
- “已解决列表”不是背景附录，而是 need 过滤器。
- “真实需求”应被建模为 `ValidatedNeed`，它既是独立对象，也必须保留在 evidence map 的链路里可追溯。
- 因此更准确的说法不是“不要 `ValidatedNeed`，都放进 EvidenceMap”，而是：
  - `EvidenceMap-core` 负责产生并支撑 `ValidatedNeed`
  - `ValidatedNeed` 是从 map 中晋升出来、供后续 package 消费的正式对象

## Review execution model
| Review node | Default executor | User role | Output |
|---|---|---|---|
| Evidence extraction review | LLM | 查看进展 | cleaned evidence units |
| Improvement vs solved cross-check | LLM | 仅在异常时介入 | candidate needs |
| Need falsification review | LLM | 查看结果、必要时 override | validated needs with objections |
| Question/package consistency review | LLM | 查看 package 质量 | coherent package sections |
| Value assessment review | LLM | 确认 assessment 结果 | recommendation + rationale |
| Promotion approval | User | 必须决策 | selected package promotion |

### Review template requirements
- 每个 LLM 自审模板至少输出：
  - applied criteria
  - supporting evidence refs
  - objections or counter-evidence
  - confidence
  - next action recommendation
- 模板可以按以下层次配置：
  - global default template
  - venue-aware template
  - contribution-type-aware template
- MVP 先支持 global default template，保留向 venue-aware 扩展的接口。

## Deferred object set
- 多角色评审编排（sponsor / skeptic / comparator / gatekeeper）
- pairwise ranking
- portfolio 管理
- `EvidenceMap` 图形化视图
- 自动聚类、自动归一化、复杂图谱分析

这些对象不是不做，而是后置到 MVP 之后，避免 topic 模块在第一版就变成完整研究代理。

## Promotion bridge
当前 `createPaperProject` 已经要求：
- `topic_id`
- `title`
- `research_direction`
- `initial_context.literature_evidence_ids`

因此首版 bridge 原则应为：
1. `TopicPackage` 提供 title candidates、research background、question summary、evidence refs。
2. `TopicPromotionDecision` 选定一个 title，并生成对 `createPaperProject` 兼容的 payload。
3. promotion 必须由人工审批触发，不允许 auto-pull 或评分流程自动调用。

## TopicPackage required sections
| Section | Required content | Why it must exist |
|---|---|---|
| `validated_needs` | 一个或多个真实需求及其 evidence refs | 支撑引言动机与问题成立性 |
| `research_slice` | 问题边界、对象、场景、限制 | 防止问题空间漂移 |
| `main_question` / `sub_questions` | 主问题与子问题 | 支撑方法设计和 claims 拆分 |
| `research_background` | 现状、缺口、为什么现有工作不足 | 支撑引言和 related work |
| `solution_options` | 一组候选方案/贡献路径 | 避免过早单一路径绑定 |
| `answerability_path` | 数据、基线、指标、实验可达性 | 支撑实验设计与 feasibility 判断 |
| `value_assessment_summary` | 六维评分、风险、审稿 objections | 支撑是否继续投入 |
| `title_candidates` | 一组候选标题 | 作为包装层输出，而非驱动层输入 |
| `promotion_payload` | 面向 `paper-project` 的最小映射 | 支撑真正的立项切换 |

## TopicPackage generation order
1. 从 `validated_needs` 开始，而不是从标题开始。
2. 先确定 `research_slice`，再确定 `main_question / sub_questions`。
3. `research_background` 基于 evidence map 和 validated needs 生成，不允许脱离证据独立编写。
4. `solution_options` 在 question 稳定后生成，并保留多路径对比。
5. `answerability_path` 在 value assessment 之前形成，否则 value judgement 失真。
6. `title_candidates` 后置，且允许多个候选并存。
7. `promotion_payload` 最后生成，只在 package ready 后出现。

## Frontend architecture direction
- 不建议直接把当前 topic settings 页面扩展成完整选题工作台。
- 更合适的方向是：
  - 保留现有 topic settings 作为“发现与检索配置”入口
  - 新增 topic workspace / selection workspace 作为“审查与决策”入口
- MVP 视图建议按以下顺序展开：
  - Seed & Constraints
  - Literature Scope
  - Automated Review Progress
  - Validated Needs
  - Questions & Contribution Types
  - Value Assessment
  - Topic Package
  - Promote to Paper Project

### User interaction principle
- 用户默认不是每个节点的同步审批者。
- 用户主要做三件事：
  - 看当前流程跑到了哪里
  - 审阅 `assessment` 结果与 package 内容
  - 从候选 `TopicPackage` 中选择是否晋升
- 只有 promotion 是强制人工确认节点。

## Invariants
- Invariant 1: `topic settings` 不是 `research question`。
- Invariant 2: promotion 前必须存在 `TopicValueAssessment`，且最终决策由人工审批。
- Invariant 3: 自动评估必须绑定来源证据或 review notes，不能只有分数没有依据。
- Invariant 4: `TopicPackage` 是 topic 阶段对外正式输出，不是 UI 拼装文案。
- Invariant 5: MVP 不依赖完整图谱增强，但必须依赖 `EvidenceMap-core` 才能运行。
- Invariant 6: 任一 `ValidatedNeed` 都必须能回溯到支持/反证证据集合。
- Invariant 7: 任一 `TopicPackage` 都必须包含足够内容，以支撑后续 research framework 设计与写作引用。
- Invariant 8: `title_candidates` 后置生成，不允许反向驱动 need/question 结论。
- Invariant 9: 默认流程中，大多数审查节点由 LLM 自审执行，而非用户逐步点击确认。
- Invariant 10: 用户必须能查看进展、审阅 assessment，并从 package 中选择晋升对象。

## Open design decisions
- `TopicPackage` 是持久化快照还是可重建聚合视图。
- `ValidatedNeed` 的最小证据充分条件是否定量化。
- promotion 之后 topic 与 paper 哪些字段继续双向同步、哪些冻结。
- 多设备同步时，哪些审查状态进入同步控制面。
