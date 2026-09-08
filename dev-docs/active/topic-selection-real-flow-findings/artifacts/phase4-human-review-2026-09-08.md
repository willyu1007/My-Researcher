# Phase 4 人工审阅提案

状态：待确认，尚未记录 Human 决策。

本轮复验研究的是：检索器或索引替换后，少量标注校准与拒答回退是否能改善冻结效用路由器的可靠性。重用 9 条既有证据（7 条段落、2 条章节），没有新增检索或 provider 调用。

建议仅为继续复验而接受两个精确覆盖缺口，并保留义务：

- 缺少直接的冻结路由器迁移研究：后续实验必须检验该机制，不能把相邻研究当作直接证明。
- 缺少检索器替换专用基准：后续必须构建并验证配对基准，在匹配预算下比较强基线。

近期文献覆盖尚未重新验证；近重复工作风险与实质证据冲突仍保留。主张仅限受控替换、冻结路由器与匹配预算。

确认提案也表示你已审阅下面的相邻工作、反证、来源与局限。精确待提交 payload 见 [确认提案](phase4-human-decision-proposal-2026-09-08.json)。你也可以选择暂缓、回环补强或拒绝，不会自动写入任何决定。

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
