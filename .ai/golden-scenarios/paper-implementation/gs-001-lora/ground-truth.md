# GS-001 Ground Truth（人审对照答案卡）

> 版本注记：v2（2026-07-12）——选题包按首跑 skeptic 四条批判修订后，本卡增补 §GT-7 预承诺对照段；GT-1..GT-6 未变。

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
