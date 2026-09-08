# Phase 4 更新后的证据审阅

**你确认的“先补充证据，再重新审阅”已完成。** 原决定已记录，无需再次确认回环。本文件是产品审阅视图的可读副本；产品 API 中的证据包和决定仍是准据。

现在要判断的问题是：**在直接替换证据与现成配对基准仍未找到的情况下，是否接受这些缺口，继续细化这个研究问题？** 这与批准实验是两件不同的事。

- 新增 [Confidence-Gated Retrieval](https://arxiv.org/abs/2608.26846) 与 [When Should Multi-Round RAG Stop?](https://arxiv.org/abs/2608.13237) 两篇论文，均已下载全文、通过本地解析并建立真实段落定位。
- 当前证据包有 **11 条证据：9 条段落定位、2 条章节定位**，包含 2 条新增反例。它们说明校准、覆盖、安全和成本必须分别评估，但没有直接验证“冻结路由器后仅替换检索器”。
- 两项缺口继续保留：直接机制证据，以及合格的现成配对基准。近重复研究与文献时效风险也未消除。
- [最小基准草案](phase4-evidence-recheck-2026-09-08.md)仍供讨论；未运行实验或调用项目模型服务。新论文的关键内容整理、向量化和检索索引未执行，本轮不宣称它们已检索就绪。

我的建议是围绕更窄、可证伪的问题继续讨论：**替换检索器是否真的使冻结路由器失效；如果失效，简单重调阈值是否已经足够？** 若你选择继续细化，需要明确接受上述两项缺口；也可以指定进一步补查、暂缓或拒绝。此次回环没有代替这个新的研究判断。

当前检查点：`research_checkpoint_7662e626-bcf6-43e9-a214-a1f7b5110e13`。完整操作与历史保留核对见[验证记录](phase4-loopback-strengthening-2026-09-08.json)。中间的摘要级草案曾被来源门槛拦住，已由下面的全文版本取代；无需对中间草案作决定。

## 产品生成的当前审阅视图

# 证据版图

> 当前状态：当前有效；流程位置：证据版图

## 结论
- 优先比较冻结原阈值与使用全部目标标注预算的阈值重调；再比较校准、同一固定基线回退、随机同回退率、无标注规则、始终/从不检索和同预算重训。
- 在相同语料、查询、生成器和预算定义下比较替换前后表现；先检验冻结路由器是否失效，再比较同标注预算的阈值重调、校准和固定基线回退。
- 已按用户决定补充证据。建议继续评估这个更窄的问题；是否接受仍未补齐的两项证据缺口并进入问题细化，由用户在新证据包上决定。
- 已有路由工作限制了宽泛的新颖性主张。新增两篇全文反例表明：校准可能随检索深度失效，整体准确率容许范围与提前停止安全不同，减少检索也不证明总成本降低。它们属于相邻干预。
- 待检验：只替换检索器，是否足以使冻结的检索效用路由器出现有实际影响的失准；如果有，简单重调阈值是否已经足够？
- 现有证据支持关注效用、分布变化和校准，但仍缺直接验证“冻结路由器后仅替换检索器”的研究。
- 证据版图已有当前版本，状态为 pending。

## 证据与反证
- 反证：RAGRouter explicitly accounts for knowledge shifts introduced by document retrieval when estimating model capability in RAG settings.
- 反证：Retriever-routing methods dynamically select the most suitable retriever from a candidate pool for each query and are evaluated against sequential, conditional, and iterative retrieval paradigms.
- 反证：停止判断器的答案准确率略低于原系统；整体准确率损失在容许范围内仍可能包含不安全的提前停止。验证集上的精度约束未迁移到最终评估。更少的检索调用也未计入判断器的推理、内存和延迟成本。
- 反证：在固定回答、证据和成本的轨迹回放中，校准改变固定阈值的决策而非已保存的答案；它提高已回答样本的准确率，但整体准确率与检索成本的效果随数据集和模型变化。检索前拟合的校准在前两层有效，在第三层过度校正高置信状态。
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
- 固定基线回退只有通过降低覆盖才得到表面安全收益。
- 在相同语料、查询、生成器和预算定义下比较替换前后表现；先检验冻结路由器是否失效，再比较同标注预算的阈值重调、校准和固定基线回退。
- 待检验：只替换检索器，是否足以使冻结的检索效用路由器出现有实际影响的失准；如果有，简单重调阈值是否已经足够？
- 收益在同标注预算或同实际使用预算下消失。
- 替换后未观察到有实际影响的失准；小样本阴性结果只记为尚无定论。
- 目前是研究候选问题，尚无实验结果。后续结论仅限实际测试的检索器替换、语料、生成器和预算；路由器回退不是最终答案拒答。
- 简单阈值重调已匹配校准收益。

## 开放风险
- 实质证据冲突：claim_conflict（evidence_conflict_61bfd16b-3b7d-493c-a5c2-ea2388dba5a2）；RETRIEVER_SHIFT_NOVELTY_BOUNDARY、REPLACEMENT_BENCHMARK_REQUIRED
- 已有基线与反证不能排除遗漏近重复工作；选题的新颖性仍需结合近期相关研究判断。
- 当前证据快照未验证近期直接重叠研究的覆盖情况；请核对检索时段、来源范围及相关工作。
- 必要覆盖缺失：Find direct conceptual or empirical evidence for the exact frozen-router transfer mechanism rather than adjacent adaptive routing.（coverage_intent_c729a679-d165-47a9-b91b-2ac644031118）；DIRECT_FROZEN_ROUTER_TRANSFER_STUDY_NOT_FOUND
- 必要覆盖缺失：Find or falsify the availability of an evaluation asset that directly models retriever or index replacement.（coverage_intent_2be2c335-9d25-4b41-8b2c-48f0c5d73c8f）；RETRIEVER_REPLACEMENT_SPECIFIC_BENCHMARK_NOT_FOUND

## 建议
优先补齐必要覆盖；如决定承担当前缺口，接受并推进时必须确认上列精确覆盖行并说明理由。

## 下一次人工判断
请审阅本阶段并选择：接受并推进、暂缓决定、回环补强、拒绝当前结果。

## 技术追踪
- Manifest：97fbc35a2fed37d0cfee9dae17b3ca90a5644cbf6b6203f67553e54b04e1d2d4
- 阶段快照：c7affc0d643bf7dddf359e6b2301b5d2e2ba43617dfbb3a722a2d68f36e9fb6e
- 当前选择规则：checkpoint_unique_current_key
- 权威与检查点引用：evidence_map/evidence_map_9d29ce53-0f40-4af7-862a-c2822126424f；research_checkpoint/research_checkpoint_7662e626-bcf6-43e9-a214-a1f7b5110e13；research_checkpoint/research_checkpoint_8c65a4a3-06de-4474-b926-d9ce7c18002c
- 可解析产物：无
