# Phase 4 人工审阅提案

状态：**建议回环补强，尚未记录 Human 决策。** 先前的“接受缺口并推进”草案已撤下；历史内容可从提交 `c339fc17` 恢复。

[本轮补查与最小基准草案](phase4-evidence-recheck-2026-09-08.md)已完成。新近工作进一步收窄了贡献空间；现有研究已经涵盖效用预测、校准、检索器对比及选择性回答。本轮未找到直接验证“冻结原路由器→同语料替换检索器→少量目标标签修复”完整链条的研究，但不据此断言新颖性。

建议对下面的原冻结检查点选择 **回环补强（loopback → evidence_landscape）**，内容为：

- 保留直接机制证据与替换基准的两项缺口，不将相邻研究标成已满足。
- 先按现有准入路径纳入两篇 8 月的校准迁移/停止风险反例，再提交新的证据包。
- 用同语料 BM25→稠密检索器的小规模配对方案判断迁移问题是否存在、简单阈值重调是否已经足够；“回退”指路由器交给固定基线，不自动等同于拒答。
- 本次决定只回到证据补强，不批准研究晋升或实验/provider 执行。

精确草案见[待确认 payload](phase4-human-decision-proposal-2026-09-08.json)。三个 semantic-review 标记保持 false，因为本次不声明完成推进所需的全面人工审阅；草案没有 accepted_coverage。原必做动作引用保留。

下面是**仍未改变的产品冻结视图**，不含本轮外部新增文献。补充报告不能代替其快照或自动获得下一阶段权限。你可以确认该回环、修改要求、暂缓或拒绝；未确认前不提交决定。

## 产品生成的冻结审阅视图

# 证据版图

> 当前状态：当前有效；流程位置：证据版图

## 结论
- A retrieval-utility router calibrated for one retriever can become unsafe after an explicit retriever or index replacement; low-label recalibration plus an abstaining fallback should restore useful routing under matched retrieval budgets.
- Compare the frozen original router, unsupervised routing, from-scratch retraining, low-label recalibration without fallback, and the proposed recalibration-plus-abstention policy under matched label and retrieval budgets.
- Human review required: both historical coverage gaps remain missing, and current literature freshness is unverified.
- Measure router calibration and harmful retrieval before and after a controlled retriever or index replacement, then compare low-label recalibration and abstaining fallback against frozen, unsupervised, and from-scratch baselines.
- Prior work supports utility-aware retrieval, calibration, budget-aware evaluation, and the risk of distribution mismatch, but does not directly validate frozen-router transfer after retriever replacement.
- RAGRouter and retriever-routing research already model retrieval-induced shifts and per-query retriever choice, so novelty is restricted to post-replacement transfer safety for a frozen utility router.
- 证据版图已有当前版本，状态为 pending。

## 证据与反证
- 反证：RAGRouter explicitly accounts for knowledge shifts introduced by document retrieval when estimating model capability in RAG settings.
- 反证：Retriever-routing methods dynamically select the most suitable retriever from a candidate pool for each query and are evaluated against sequential, conditional, and iterative retrieval paradigms.
- 基线：Supervised query routing depends on costly paired annotations and suffers from distribution mismatch between public datasets and real queries, limiting OOD generalization.
- 支持：Adaptive retrieval can reduce unnecessary computation and encourage abstention, but calibrated confidence can be unsafe outside its validation domain and may skip retrieval when evidence is needed.
- 支持：Relevance-biased retrievers can ignore passage utility and become misaligned with downstream generation; learning utility-aware retrieval remains an open challenge.
- 背景：Calibration improves probability quality while preserving ranking, graded allocation changes passage and context budget frontiers, and held-out thresholds approach diagnostic operating points.
- 背景：RAGRouter-Bench characterizes retrieval environments using structural-topology and semantic-space metrics to delineate where different RAG paradigms apply.
- 背景：Retrieval-utility prediction is evaluated on Natural Questions using answer F1 and Spearman correlation between predicted scores and ground-truth context utility or answer quality.
- 背景：The cross-dataset evaluation fixes model families, example counts, retrieval depth, and retrieval method so that utility, calibration, and cost comparisons remain budget-aware.

## 备选与拒绝理由
- 暂无。

## 主张与证伪边界
- A controlled retriever/index-replacement setting with a frozen utility router and explicitly constructed benchmark; no general claim about all adaptive RAG, all retrievers, or production robustness.
- A retrieval-utility router calibrated for one retriever can become unsafe after an explicit retriever or index replacement; low-label recalibration plus an abstaining fallback should restore useful routing under matched retrieval budgets.
- Abstention reduces harmful routing only by sacrificing answer quality beyond the accepted operating point.
- Apparent gains disappear under matched retrieval and annotation budgets.
- Measure router calibration and harmful retrieval before and after a controlled retriever or index replacement, then compare low-label recalibration and abstaining fallback against frozen, unsupervised, and from-scratch baselines.
- Simple unsupervised or threshold-only adaptation matches low-label recalibration.
- The frozen router remains calibrated after replacement, leaving no material transfer problem.

## 开放风险
- 实质证据冲突：claim_conflict（evidence_conflict_d8a5b112-8290-470d-a335-bb72564d1d1a）；RETRIEVER_SHIFT_NOVELTY_BOUNDARY、REPLACEMENT_BENCHMARK_REQUIRED
- 已有基线与反证不能排除遗漏近重复工作；选题的新颖性仍需结合近期相关研究判断。
- 当前证据快照未验证近期直接重叠研究的覆盖情况；请核对检索时段、来源范围及相关工作。
- 必要覆盖缺失：Find direct conceptual or empirical evidence for the exact frozen-router transfer mechanism rather than adjacent adaptive routing.（coverage_intent_aff79ce4-01e6-483f-9aa9-10afa9d5d0f8）；DIRECT_FROZEN_ROUTER_TRANSFER_STUDY_NOT_FOUND
- 必要覆盖缺失：Find or falsify the availability of an evaluation asset that directly models retriever or index replacement.（coverage_intent_8d18adc6-a5d6-42f9-9009-8c226ca35bd8）；RETRIEVER_REPLACEMENT_SPECIFIC_BENCHMARK_NOT_FOUND

## 建议
优先补齐必要覆盖；如决定承担当前缺口，接受并推进时必须确认上列精确覆盖行并说明理由。

## 下一次人工判断
请审阅本阶段并选择：接受并推进、暂缓决定、回环补强、拒绝当前结果。

## 技术追踪
- Manifest：3ddcadae64a91d222a5cea5a49de0251413fe2c2ac5b6017a332d3980cb7e94d
- 阶段快照：cdf732d6c4fb55f2e32f5d9242f85d01e4cf61c054bfbc0289b59be4590187e5
- 当前选择规则：checkpoint_unique_current_key
- 权威与检查点引用：evidence_map/evidence_map_10dd5a3a-553f-47fb-ba8b-0d0524623b4f；research_checkpoint/research_checkpoint_300dc6d5-e741-40ba-b85b-1e547796f8fc
- 可解析产物：无
