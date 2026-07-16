# GS-001 Ground Truth（人审对照答案卡）

> 版本注记：v4（2026-07-16，T-124 G1）——后半链答案卡增补：§GT-9（acceptance 实验数据段 + 预期 claim 边界）、§GT-10（dossier 完备清单）。GT-1..GT-8 未变。
> v3（2026-07-15）——选题包按 run gs001-lora-live-004 复评（RF-* 七条）修订后，本卡增补 §GT-8 v3 预承诺对照段；GT-1..GT-7 未变（GT-7 仍是 v2 承诺基线，v3 在其上收口顺序矛盾并吸收 warning）。

素材来源：LoRA — Low-Rank Adaptation of Large Language Models（arXiv:2106.09685，带官方代码 microsoft/LoRA）。
本卡是人审时的对照答案：LLM 工位的产出**不需要**复现论文原文，但候选质量维度按"命中合理路线空间、与论文实际路线对齐或合理偏离"打分；幻觉对照按"是否虚构了选题包/本卡都不支持的事实"判定。

## GT-1 论文实际路线
- 冻结预训练权重 W 不动；只训练适配增量 ΔW，并把 ΔW 参数化为低秩分解 ΔW = BA（B∈R^{d×r}, A∈R^{r×k}，r ≪ min(d,k)）。
- A 高斯初始化、B 零初始化，训练起点等价于原模型；ΔW 以 α/r 缩放。
- 部署时 BA 可**合并**进 W（W' = W + BA），因此推理路径与原模型完全相同——零额外推理延迟；切换任务只需换很小的 BA 参数对。
- 只对 Transformer 自注意力的部分投影矩阵施加低秩适配（最优组合为 Wq 与 Wv），MLP 层冻结。

## GT-2 对照路线空间（论文对比的替代路线及其代价）
- Full fine-tuning：性能上限基线；每任务一份全量权重，存储/切换成本最高。
- Adapter 系（Houlsby/Lin 等变体）：可训练参数少，但插入串行层在推理（尤其小 batch/在线场景）引入可测的额外延迟。
- Prefix/Prompt tuning 系（prefix-embedding / prefix-layer）：占用可用序列长度预算；优化不稳定、性能非单调随参数量变化。
- BitFit（只训 bias）：极少参数的轻基线。
- 合理偏离说明：候选路线若提出"结构化稀疏更新/量化适配"等不在论文对比集内的路线，不算幻觉，但候选质量按其与研究问题（参数效率+零推理延迟+性能不降）的贴合度打分。

## GT-3 关键实验
- RoBERTa (base/large) + GLUE：LoRA 以 ~0.3M 可训练参数达到或超过 full FT 的 GLUE 表现。
- DeBERTa XXL + GLUE：扩展验证。
- GPT-2 (medium/large) + E2E NLG / WebNLG / DART：生成任务对比 adapter/prefix 系。
- GPT-3 175B + WikiSQL / MNLI-matched / SAMSum：极大模型上 LoRA 匹敌或超过 full FT，且显存需求大幅下降（175B 场景 VRAM ~1.2TB→~350GB，checkpoint 350GB→35MB 量级）。
- 基线集：full FT、BitFit、prefix-embed、prefix-layer、多种 adapter 变体。

## GT-4 消融（论文回答"为什么这样设计"的实验）
- 秩 r 扫描（r ∈ 1…64）：极低秩（r=1~4）已足够，性能对 r 不敏感——支撑低内在秩假设。
- 作用矩阵选择：固定参数预算下，把 r 分给 {Wq,Wv}（或四矩阵均分）优于只调单一矩阵；Wq+Wv 为推荐组合。
- 子空间分析：不同 r、不同随机种子学到的 ΔW 子空间高度重叠；ΔW 与 W 的顶层奇异方向不重合——ΔW 放大的是 W 中未被强调的方向。

## GT-5 结论边界（论文自己声明的界限）
- 以 ~0.01%-0.5% 量级的可训练参数达到或超过 full FT 的任务性能（依模型/任务而定）。
- 零额外推理延迟（合并后推理图与原模型相同）——这是相对 adapter 系的核心差异化主张。
- 训练显存与每任务存储成本大幅降低；不主张训练加速比与参数占比同比例。

## GT-6 已知局限（论文明示）
- 合并 BA 后，同一 batch 内混多任务需换回未合并形态或分批——跨任务批处理不便。
- r 的选择依赖任务/模型，无先验最优值；何时低秩假设失效（如目标域与预训练分布差距极大时）未完全刻画。
- prefix 系对比中观察到的优化不稳定是经验现象，机理未完全解释。

## 幻觉对照速查
以下若出现在 LLM 产出中且被当作"选题包内已知事实"引用，判幻觉：具体 GLUE 分数数字（**v2 例外见 GT-7**）、GPT-3 实验细节、论文作者/机构、"已证明低秩假设成立"（晋升时点仅是假设）。以下不算幻觉：从选题包内容核合理推导的路线/实验设计（即使与论文一致或不一致）。

## GT-7 v2 预承诺对照（选题包 v2，2026-07-12 增补）
run `gs001-lora-live-003` 的 route skeptic 四条 blocker（RR-002 confirmatory 预算矩阵未定 / RR-003 数据集指标预承诺缺失 / RR-004 基线控制部分化 / RR-006 confirmatory 路线含可行性依赖的基线选择）→ 选题包 v2 把以下预承诺升级为"晋升时点已知事实"。人审对照 v2 run 时按此评估 LLM 产出是否消化并遵守这些预承诺：

- **confirmatory 预算矩阵**：单 GPU ≤24GB VRAM；总训练预算 ≤40 GPU-hours（stage 0 探针 ≤4 / stage 1 基线复现 ≤14 / stage 2 confirmatory ≤22）；每任务重复 ≤3；confirmatory 训练任务组合上限 6 = {LoRA r=8, full FT} × {SST-2, MRPC, CoLA}；超参在 stage 2 前冻结（矩阵内无 post-hoc 搜索）；confirmatory rank 固定 r=8（{4,8} 之外为 exploratory）；latency 协议（同 GPU 同 serving stack，batch {1,8}、seq len 128、100 warmup + 1000 计时迭代、中位数）；checkpoint 只留 final。
- **数据集指标预承诺**（主指标预注册）：对齐判据 = LoRA 任务指标与**本项目复现的** full FT 值差 ≤0.5pt（重复均值）；full FT 复现门槛 SST-2 acc ≥94.0 / MRPC F1 ≥89.0 / CoLA MCC ≥60.0；次级指标 = 可训练参数量、每任务 checkpoint 体积、协议内 latency 中位数。
- **基线控制清单**：full FT（必做复现；任一任务未达门槛→该任务 parity 主张作废并如实报告）、Houlsby adapter（必做；SST-2/MRPC ≤1pt + latency 协议；失败→对照主张 drop 而非弱化）、BitFit（可选；SST-2 ≤2pt；缺席必报告）、prefix tuning（stage 2 后剩余预算 ≥8 GPU-hours 才做；3 seeds 不发散 + SST-2 ≤2pt）。
- **staged 依赖化解**：stage 0 探针通过判据 = LoRA r∈{4,8} 在 SST-2 与复现 full FT 差 ≤1pt，confirmatory 矩阵在 stage 0 门后才开始；比较主张另需 stage 1 必做基线达标；confirmatory/exploratory 边界 = stage 0/1 所学只可中止或收缩计划，不可事后增/换/重权 confirmatory 对比（违者降为 exploratory）。

幻觉判定更新（v2）：上述阈值数字（94.0/89.0/60.0、0.5pt/1pt/2pt、40 GPU-hours、组合上限 6 等）在 v2 中是选题包事实，引用**不判幻觉**；引用论文报告的具体分数（如 RoBERTa-base full FT 的 94.8/90.2/63.6"论文值"）作为已知事实仍判幻觉——预承诺是复现门槛，不是论文答案。

## GT-8 v3 预承诺对照（选题包 v3，2026-07-15 增补）
run `gs001-lora-live-004` 的 route skeptic 复评：唯一 blocking `RF-BASE-001`（stage 0 探针判据依赖 stage 1 才复现的 full-FT 锚点——阶段顺序矛盾）+ 5 条 warning（RF-COMP-001 预算账本不可审 / RF-DATA-001 聚合规则丢失 / RF-BASE-002 claim-drop 规则需保留 / RF-TRACE-001 code/config refs 空 / 另 RF-SCOPE/RF-CONF 为 info）。v3 逐条化解，人审对照 v3 run 时按此评估 LLM 产出是否消化并遵守：

- **自包含探针判据（收口 RF-BASE-001）**：stage 0 内先训一条**短单种子 SST-2 full-FT 校准锚点**（固定公开参考配置），探针通过判据 = LoRA best-of-{r=4,r=8} 的 SST-2 acc **同时**满足（a）绝对下限 **≥90.0 acc** 且（b）与该 stage-0 锚点差 ≤1.0pt。判据仅用 stage 0 产出即可判读，不依赖 stage 1。stage-0 校准锚点 ≠ stage-1 正式 full-FT 复现。
- **预算复用规则（收口 RF-COMP-001）**：stage-1 正式 full-FT 复现 run **逐字复用**为 stage-2 confirmatory full-FT 单元格（同 checkpoint/指标，绝不在 stage 2 重训），full-FT 对 40 GPU-hours 账本只计一次；stage 2（≤22）只覆盖新 LoRA r=8 run + latency 协议。
- **指标聚合（收口 RF-DATA-001）**：parity = 每 (method,task) cell 的 **mean-over-repeats**（每任务重复 ≤3），LoRA 均值与复现 full-FT 均值差 ≤0.5pt；full-FT 复现门槛为锚点，未达门槛的任务其 parity 主张作废。
- **基线 claim-control（收口 RF-BASE-002）**：失败复现一律 **drop** 受影响对照主张（adapter latency/参数主张，或某任务 full-FT parity 主张）而非弱化/改述/静默省略，drop 及理由必报告。
- **参考实现指针（部分吸收 RF-TRACE-001）**：v3 加 reference_implementation（公开 LoRA 官方实现 + RoBERTa-base 参考配置）作晋升时点 code/config 溯源锚；但项目级 code/config artifact 晋升时点确实不存在，作为诚实登记的 route-planning 已知缺口保留（**不完全吸收理由**：需 stage-0 执行才产出真实工件，选题包不得伪造）。

幻觉判定更新（v3）：上述 v3 新增阈值/规则（**90.0 绝对下限**、stage-0 校准锚点、full-FT 复用规则、mean-over-repeats 聚合等）在 v3 中是选题包事实，引用**不判幻觉**；参考实现指向公开实现/配置属 intake 事实亦不判幻觉。引用论文报告的具体分数作为已知事实仍判幻觉；把"参考实现指针"当作"项目已有 code/config 工件"引用（而非晋升时点缺口）判过度主张。

## GT-9 后半链答案卡：acceptance 实验数据段 + 预期 claim 边界（素材 v4，2026-07-16 增补）

后半链（G1）从 acceptance 假体实验开始，素材 `topic-package.mjs` 的 `GS001_EXPERIMENT_RESULTS` 是"实验已发生"的事实来源——数字取 LoRA 论文真实报告值（arXiv:2106.09685 Table 2，RoBERTa-base）作为本测试场景的实验结果：

- **stage-0 探针**：stage-0 校准锚点 SST-2 full-FT 94.6 acc；LoRA best-of-{r=4,r=8} 95.1 acc → 同时满足 ≥90.0 绝对下限与 ≤1.0pt 锚点差，探针**通过**。
- **stage-1 full-FT 复现**（全部达门槛，parity 锚可用）：SST-2 94.8 acc（≥94.0）/ MRPC 90.2 F1（≥89.0）/ CoLA 63.6 MCC（≥60.0）。
- **stage-2 confirmatory 矩阵**（mean-over-repeats，容差 0.5pt）：SST-2 95.1 vs 94.8（+0.3，parity）/ MRPC 89.7 vs 90.2（−0.5，parity 恰在容差边界）/ CoLA 63.4 vs 63.6（−0.2，parity）。
- **资源面**：可训练参数 ~0.3M vs ~125M（约省 99.76%）；合并后零额外推理延迟。
- 本场景**无 failed / inconclusive / negative run**——N7 项目级 REU 对账应无未对账项。

**预期 claim 边界**（result analysis 解读质量与 claim 边界纪律的评分锚；素材 `GS001_CLAIM_GROUND_TRUTH`）：

- claim 类型 `empirical_finding`，强度 **strong**（三任务全 parity + 资源节省实测）→ 产品强制**人工确认**（scope `strong_claim_acceptance`，单次消费）。
- 合格 claim 语句形态：**限定在 probed 规模（RoBERTa-base）+ committed 任务集（SST-2/MRPC/CoLA）+ 预注册 0.5pt 容差内的 parity + 参数量/延迟资源事实**。禁止词形态：universal / all tasks / every task / superior / outperform / SOTA / always / generalize——任何这类词出现即越界（产品 high-risk overclaim gate 也会拒绝）。
- forbidden_overclaims 至少含：对所有适配方法的普适优越性、未 probed 的规模/模态、"每个任务每个数据集都赢 full FT"。
- 解读质量红线：MRPC −0.5 恰在容差边界，合格解读应报告为 **parity-at-boundary** 而非强赢；把 −0.5 说成"超过 full FT"或忽略边界性=解读失真。

幻觉判定更新（v4）：`GS001_EXPERIMENT_RESULTS` 数字（94.6/95.1/94.8/90.2/63.6/89.7/63.4、~0.3M vs ~125M）在后半链是**实验已产出的场景事实**（经 trusted RunEvidenceUnit 入链），后半链工位引用不判幻觉；但**前半链**工位（route/skeptic/cycle/feasibility，晋升时点）引用这些数字仍判幻觉——实验彼时尚未发生。

## GT-10 后半链答案卡：dossier 完备清单（素材 v4，2026-07-16 增补）

dossier_readiness 审计与 ImplementationDossier 物化（`ready_for_writing`）的完备性评分锚——合格 dossier 必须同时满足（产品 gate 亦逐条 enforced，评审时核对 LLM 审计是否独立命中这些点而非碰运气通过）：

1. **claim 处置完备**：包含的 claim candidate 全部显式 admitted 或 rejected（本场景：admitted = 唯一的 bounded parity claim；rejected = 无）；admitted claim 的 `claim_status` 必须是 `supported`（即有已解析的 ClaimTracePacket 且列入 `claim_trace_packet_ids`）。
2. **强 claim 确认已消费**：strong claim 携带的 HumanConfirmationRecord（scope `strong_claim_acceptance`，actor=human）在 claim 物化时被单次消费；dossier 阶段不得复用。
3. **禁越界主张显式化**：`claim_section.forbidden_overclaims` 非空（GT-9 的三条起）；claim_ceiling = strong（本场景）。
4. **run 对账（packet 级）**：包含的 result packet 声明的 failed/inconclusive run refs 必须全部收进 `experiment_section`——本场景两者皆空，vacuous 通过。
5. **N7 对账（项目级）**：项目内全部 trusted 且 run_status ∈ {failed, cancelled, negative, inconclusive} 的 RunEvidenceUnit 必须被 experiment_section/packet 覆盖或以"可证作废"豁免——本场景唯一 REU 为 succeeded，应报告"无未对账项"，而非省略该检查。
6. **readiness gate 真实通过**：`readiness.readiness_gate_result_id` 指向针对 dossier trace manifest 的 **passed** TraceGateResult；`blocker_refs` 必须为空。
7. **实验局限如实**：`experiment_limitations` 应包含 MRPC parity-at-boundary 与"仅 RoBERTa-base 规模 + 三任务"边界（对照 GT-9 红线）。
8. **终点纪律**：dossier ready 后停在 export 停驻（四点集 #3）——writing entry packet 的产出是 runner 终点之外的人工决策；审计产出若声称"已导出/已进写作"判越权。
