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
- **Common envelope（所有 LLM 自审产出必含）**：`schema_version`；`template_name`；`review_id`；`topic_id`；`target_type`（枚举：literature | need | question | value_assessment）；`target_id`；`review_goal`；`review_status`（draft | completed | needs_human_review | superseded）；`reviewer_role`（extractor | skeptic | comparator | gatekeeper | packager | human）；`input_refs`（至少一项，每项含 `ref_type`、`ref_id`，ref_type 含 topic_profile、literature、literature_artifact、evidence_review、need_review、question、value_assessment、paper_project、snapshot、external_doc）；`judgement_summary`；`confidence`（0–1）；`missing_information`（数组）；`blocking_issues`（数组）；`recommendation`（accept | refine | reject | park | escalate | monitor）；`next_actions`（数组，每项含 `action`、`owner`（llm | human | system | retriever | reviewer）、`priority`（p0–p3））；`created_by`；`created_at`。任一评分或 gate 决策须带 reason，并尽量带 evidence_refs。

## LLM 自审契约与对象对应（内嵌）

以下为三类 LLM 自审产物的契约要点及与 MVP 对象的对应，实现时以本节为准、不依赖外部 schema 文件。

### 三类 template 与节点对应
| 自审节点 | template_name | target_type | 对应 MVP 对象 / 产出 |
|----------|---------------|-------------|------------------------|
| Evidence extraction review | evidence_review | literature | EvidenceMap-core 的 EvidenceUnit；下游产出 need_candidates、comparison_targets、related_solution_cluster |
| Need falsification review | need_review | need | ValidatedNeed 的输入与成立判定；review_judgement.validated_need、falsification_check.verdict；下游 research_slice_candidates、contribution_hypotheses |
| Value assessment review | value_assessment | value_assessment | TopicValueAssessment 的持久化形态；hard_gates、scored_dimensions、decision、reviewer_objections、scenario_analysis |

### EvidenceReview（evidence_review）关键字段
- 除 common envelope 外必含：`literature_id`；`bibliographic_snapshot`（title，可选 authors/year/venue/doi_or_arxiv）；`relevance_assessment`（relevance_score 1–5、relevance_reason、scope_action: include | exclude | monitor）；`problem_extraction`（target_problem、problem_context，可选 facts/inferences/evidence_refs）；`solution_extraction`（claimed_solution，可选 method_family、key_mechanism、facts、inferences、evidence_refs）；`evidence_extraction`（main_claims 数组，每项 claim + claim_type: empirical | theoretical | engineering | benchmark | survey；evaluation_summary 可选 datasets/baselines/metrics/headline_results）；`limitation_extraction`（stated_limitations、implicit_limitations、assumptions 数组）；`reuse_potential`（reusable_assets 数组：dataset | benchmark | code | protocol | taxonomy | analysis_frame | none，reusable_for_topic）；`review_judgement`（contribution_value: high | medium | low | unclear，novelty_signal，trustworthiness_signal，可选 rationale/evidence_refs）；`downstream_outputs`（need_candidates、comparison_targets、related_solution_cluster）。单篇文献的结构化抽取（EvidenceUnit）在实现时与此形态一致，便于存入 LiteraturePipelineArtifact.payload。

### NeedReview（need_review）关键字段
- 除 common envelope 外必含：`need_id`；`input_basis`（evidence_review_ids、literature_ids 数组，可选 compared_solution_clusters）；`need_statement`（unmet_need、who_needs_it、scenario、boundary）；`need_type`（category: performance | cost | robustness | interpretability | usability | scalability | data_efficiency | evaluation_gap | resource_gap | safety | compliance；severity: critical | high | medium | low；breadth: broad | moderate | niche）；`why_unmet`（current_solutions 数组，每项 solution_cluster、what_it_solves、what_it_fails_to_solve；insufficiency_summary）；`falsification_check`（solved_under_other_terms、merely_incremental、blocked_by_wrong_assumption、duplicated_existing_direction 布尔；verdict: validated | weak | pseudo_gap | unclear）；`importance_assessment`（significance_score 1–5、significance_reason、stakeholders、why_now）；`measurability`（observable_success_criteria、candidate_metrics、candidate_eval_path、measurability_score 1–5）；`resource_and_constraint_check`（likely_data_requirement/likely_compute_requirement: none | low | medium | high | unknown；ethics_or_access_constraints；feasibility_signal: strong | moderate | weak | unknown）；`review_judgement`（validated_need 布尔，可选 rationale/evidence_refs）；`downstream_outputs`（research_slice_candidates、contribution_hypotheses: method | benchmark | analysis | resource | system，blocked_reasons）。ValidatedNeed 的成立条件与 review_judgement.validated_need 及 falsification_check.verdict 一致。

### ValueAssessment（value_assessment）关键字段
- 除 common envelope 外必含：`assessment_id`；`question_snapshot`（main_question、sub_questions、research_slice、contribution_hypothesis: method | benchmark | analysis | resource | system）；`claim_design`（strongest_claim_if_success、fallback_claim_if_success、claim_scope: narrow | moderate | broad、claim_fragility: low | medium | high）；`evidence_basis`（validated_need_ids、core_literature_ids、comparison_targets）；`hard_gates`（significance、originality、answerability、feasibility、venue_fit 各为 pass 布尔 + reason，可选 evidence_refs）；`scored_dimensions`（significance、originality、claim_strength、answerability、venue_fit、strategic_leverage 各为 score 1–5 + reason + confidence，可选 evidence_refs）；`risk_penalty`（data_risk/compute_risk/baseline_risk/execution_risk/ethics_risk: low | medium | high | unknown；penalty_summary）；`reviewer_objections`（top_1、top_2、top_3 字符串）；`scenario_analysis`（ceiling_case、base_case、floor_case）；`decision`（verdict: promote | refine | park | drop；total_score 0–100；confidence；可选 judgement_summary、promotion_target: paper_project | topic_backlog | none）；`required_refinements` 数组。TopicValueAssessment 持久化形态与此对齐；任一评分或 gate 须带 reason，并尽量带 evidence_refs。

### Artifact landing strategy
- **Phase 1**：EvidenceReview 存于 LiteraturePipelineArtifact.payload；NeedReview、ValueAssessment 存为 topic-level artifact（不要求独立表）。
- **Phase 2（后置）**：可晋升为一类表 TopicEvidenceReview / TopicNeedReview / TopicValueAssessment；本任务包阶段仅在文档中记录该策略，不落代码。

## 后端契约与实现基线（内嵌）

以下为后端契约要点，实现时以本节为准、不依赖外部文件。

### 设计目标
- **Traceability**：每个判断必须能回溯到文献或前置 artifact。
- **Separation of concerns**：topic settings、evidence extraction、need validation、question formation、value judgement 不得混入同一对象。
- **Gateability**：value assessment 输出必须能驱动 topic -> paper-project promotion。
- **Human override support**：每阶段支持人工审阅与修正。
- **Versionability**：review 与 assessment 须历史保留，不得原地覆盖。
- **Robustness under partial evidence**：显式追踪 uncertainty、missing_information、blocking_issues。

### 领域对象图
```
TopicProfile
 ├─ TopicLiteratureScope[]
 ├─ TopicEvidenceReview[]
 ├─ TopicNeedReview[]
 ├─ TopicQuestion[]
 ├─ TopicValueAssessment[]
 ├─ TopicPackage[]
 └─ TopicPromotionDecision[]

LiteratureRecord
 ├─ LiteraturePipelineArtifact[]
 └─ TopicEvidenceReview[]

TopicQuestion
 └─ TopicValueAssessment[]

TopicValueAssessment
 └─ TopicPromotionDecision

PaperProject
 └─ created from TopicPromotionDecision
```

### 推荐 Prisma 枚举（canonical values）
- `reviewStatus`: draft | completed | needs_human_review | superseded | archived
- `recommendation`: accept | refine | reject | park | escalate
- `valueVerdict`: promote | refine | park | drop
- `questionStatus`: draft | candidate | shortlisted | assessed | packaged | promoted | archived
- `promotionStatus`: pending | approved | rejected | superseded
- `artifactSourceType`: abstract | key_content | fulltext_chunk | metadata | manual_note | prior_artifact
- `contributionHypothesis`: method | benchmark | analysis | resource | system
- `needVerdict`: validated | weak | pseudo_gap | unclear

### 共享 JSON 块（v1 复用）
- inputRefs、evidenceRefs、facts、inferences、scores、missingInformation、blockingIssues、nextActions

### Prisma 模型草案（二选一）
- **方案 A（TopicResearchRecord 包装）**：TopicResearchRecord 1:1 TopicProfile，含 lifecycleStatus、currentQuestionId、currentPackageId；TopicQuestion、TopicNeedReview、TopicValueAssessment、TopicPackage、TopicPromotionDecision 通过 topicResearchRecordId 关联。
- **方案 B（直接 topicId）**：各表直接含 topicId 外键至 TopicProfile；TopicQuestion 含 sourceNeedIds；TopicValueAssessment 含 questionId；TopicPackage 含 questionId、sourceValueAssessmentId；TopicPromotionDecision 含 questionId、assessmentId、packageId。
- 共同核心表：TopicNeedReview（evidenceReviewRefs、literatureIds、unmetNeed、needCategory、whyUnmet、falsificationCheck、verdict、confidence）；TopicQuestion（mainQuestion、subQuestions、researchSlice、contributionHypothesis、inputNeedReviewIds、inputEvidenceReviewIds）；TopicValueAssessment（evidenceBasis、hardGates、scoredDimensions、riskPenalty、verdict）；TopicPackage（titleCandidates、researchBackground、candidateMethods、evaluationPlan、coreLiteratureIds）；TopicPromotionDecision（verdict、decisionReason、selectedLiteratureIds、targetPaperTitle、createdPaperId）。

### OpenAPI 端点（topic-research tag）
| 方法 | 路径 | 操作 |
|------|------|------|
| GET/POST | /topics/{topicId}/research-record | getTopicResearchRecord / createTopicResearchRecord |
| POST/GET | /topics/{topicId}/need-reviews | createNeedReview / listNeedReviews |
| POST/GET | /topics/{topicId}/questions | createTopicQuestion / listTopicQuestions |
| POST/GET | /topics/{topicId}/value-assessments | createValueAssessment / listValueAssessments |
| POST | /topics/{topicId}/packages | createTopicPackage |
| POST | /topics/{topicId}/promotion-decisions | createTopicPromotionDecision |
| POST | /topics/{topicId}/promote-to-paper-project | promoteTopicToPaperProject |

### 关键请求契约
- **CreateNeedReviewRequest**：必填 version_no, status, evidence_review_refs, literature_ids（非空）, unmet_need, need_category, why_unmet, falsification_check, importance_assessment, measurability, resource_constraint_check, verdict, confidence, judgement_summary, recommendation, created_by。
- **CreateTopicQuestionRequest**：必填 version_no, status, main_question, research_slice, contribution_hypothesis, created_by；至少提供 input_need_review_ids 或 input_evidence_review_ids 之一。
- **CreateValueAssessmentRequest**：必填 question_id, version_no, status, evidence_basis, hard_gates, scored_dimensions, risk_penalty, reviewer_objections, scenario_analysis, verdict, confidence, judgement_summary, recommendation, created_by。
- **CreateTopicPromotionDecisionRequest**：verdict=promote 时需 target_paper_title；verdict=loopback 时需 loopback_target。
- **PromoteTopicToPaperProjectRequest**：必填 promotion_decision_id, created_by；需已批准的 promotion decision。

### Topic 生命周期状态
```
topic_seeded -> evidence_collecting -> evidence_reviewed -> need_reviewing -> needs_validated
  -> question_forming -> question_shortlisted -> value_assessing -> value_assessed
  -> packaging -> packaged -> promotion_pending -> promoted_to_paper
```

### 回退/拒绝转换
- need_reviewing -> evidence_reviewed（falsification 失败或证据不足）
- question_shortlisted -> needs_validated（问题表述弱）
- value_assessed -> question_shortlisted（verdict=refine）
- value_assessed -> needs_validated（根本问题在 need 定义）
- 任意状态 -> archived（用户放弃 topic）

### Artifact 生命周期规则
- **EvidenceReview**：created -> completed -> superseded；或 completed -> needs_human_review。保留历史版本；每 (topicId, literatureId) 仅一个标记为 current。
- **NeedReview**：draft -> completed -> validated | pseudo_gap | weak | unclear。仅 validatedNeed=true 可默认作为 question 创建种子。
- **TopicQuestion**：draft -> candidate -> shortlisted -> assessed -> packaged -> promoted。shortlisted 需至少一个 validated need、evidence refs、contribution hypothesis；assessed 需至少一个 completed value assessment；promoted 需 approved promotion decision。
- **TopicValueAssessment**：draft -> completed -> superseded；或 completed -> needs_human_review。仅 latest completed 用于 promotion 校验；refine 非终态；drop 阻塞 promotion 除非人工 override。
- **TopicPackage**：building -> ready -> superseded。package 为合成 artifact，非判断权威；权威仍在 validated needs、questions、value assessments。

### Promotion gate 规则（必须全部满足）
1. 至少一个 validated need review 存在。
2. Topic question 存在且为 shortlisted 或 assessed。
3. 该 question 存在 completed value assessment。
4. 所有 hard gates 通过：significance、originality、answerability、feasibility、venue_fit。
5. 无未解决的 blocking issues。
6. Evidence refs 非空且可解析。
7. Topic package 存在或可推导最小 paper seed。

### 人工 override 策略
- 可 override：failed score threshold、refine verdict、missing package。
- 不可静默 override；override 须持久化于 TopicPromotionDecision.decisionPayload 并带 reasons。

### 稳健性建议
- 不单独存储纯自由文本；每个 review 须含 structured blocks、evidence_refs、judgement_summary、confidence、next_actions。
- evidence ref 须可解析，推荐形状：literature_id、source_type、span_ref、note。
- 区分 facts 与 inferences，不得混入同一字段。
- 保留版本历史；避免破坏性更新。
- 允许不完整但可用的对象，记录 missingInfo、blockingIssues、confidence。
- TopicPackage 不得成为前序阶段的权威来源；权威在 evidence、need、question、value assessment。

### 建议实现顺序
- **Phase 1（最小可行）**：TopicQuestion、TopicPromotionDecision；EvidenceReview 存 LiteraturePipelineArtifact；NeedReview/ValueAssessment 存 topic-level artifact 或 JSON 表；promotion verify/commit 端点。
- **Phase 2（稳定研究对象）**：TopicEvidenceReview、TopicNeedReview、TopicValueAssessment 一类表；browsing/ranking APIs。
- **Phase 3（运营成熟）**：package builder、cross-topic ranking、reviewer-objection analytics、provenance dashboards。

### 集成锚点（与当前 repo 对齐）
- Shared：topic-management-contracts.ts 导出；research-lifecycle index 更新。
- Backend：routes、controller、service、repository；app.ts 注册路由；repository factory 支持 memory|prisma。
- EvidenceReview v1：LiteraturePipelineArtifact.payload，stageCode=evidence_review，artifactType=llm_review。

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
