# GS-002 Ground Truth（人审对照答案卡）

> 版本注记：v1（2026-07-16）——gs-002 首版素材（DistilBERT / 蒸馏族）。结构对齐 gs-001 v3 ground-truth
> （GT-1..GT-8）。本场景的特化考点是**多目标权衡声明的边界纪律**（质量保留 / 体积缩减 / 推理加速三目标，
> 与宏口径掩盖逐任务退化的 claim boundary）。

素材来源：DistilBERT — a distilled version of BERT: smaller, faster, cheaper and lighter（arXiv:1910.01108，
带官方代码 huggingface/transformers `examples/research_projects/distillation`）。
本卡是人审时的对照答案：LLM 工位的产出**不需要**复现论文原文，但候选质量维度按"命中合理路线空间、与论文实际
路线对齐或合理偏离"打分；幻觉对照按"是否虚构了选题包/本卡都不支持的事实"判定。

**数字口径警示（贯穿全卡）**：论文报告值（GLUE 数字、参数量、推理时间）是**答案卡内容**，不是选题包晋升时点
可见内容——选题包只承载复现门槛（floors）。LLM 在 lane A（route/skeptic/cycle/feasibility）引用论文具体分数
作为"选题包已知事实"判幻觉；后半链（result analysis/claim）由 acceptance 假体注入的 trusted RunEvidenceUnit
才携带真实数字（素材 `topic-package.mjs` 的 `GS002_EXPERIMENT_RESULTS` 段），此时引用即合规。

## GT-1 论文实际路线
- **task-agnostic 蒸馏**（在预训练阶段蒸馏，产出一个通用压缩 encoder，而非每任务一个压缩模型）。
- 学生 = 6 层 Transformer encoder（教师 BERT-base 为 12 层），**从教师权重初始化**（取每隔一层），去掉
  token-type embeddings 与 pooler，隐藏维度不变（压缩靠减层而非减宽）。
- **三重训练损失**：masked-LM 损失 + 蒸馏 KL 散度（对教师软标签，带温度 T）+ cosine-embedding 对齐损失
  （对齐师生隐状态方向）。
- 部署时学生就是一个标准 encoder，推理路径无额外结构——直接更小更快；下游用法与 BERT 相同（换 checkpoint 即可）。

## GT-2 对照路线空间（论文/领域对比的替代路线及其代价——skeptic 应识别的替代方案）
- **教师全量 BERT-base**：质量上限基线，但体积/延迟成本最高。
- **task-specific 蒸馏**（如蒸馏一个已在下游微调的教师；BERT-PKD / TinyBERT 系）：每任务一个压缩模型，通用性差；
  可达更高单任务质量但不满足"单一通用压缩模型"目标。
- **结构化剪枝（pruning）**：减参/减算，但常需任务特定重训，质量/延迟权衡点不同。
- **量化（quantization）**：主要降体积/内存与（特定硬件上）延迟，质量损失与硬件强相关；与蒸馏正交（可叠加）。
- **从头训练小模型**（不蒸馏）：无教师软标签信号，通常同参数量下质量更低——蒸馏的核心增益点。
- 合理偏离说明：候选若提出"蒸馏 + 量化叠加""层丢弃 + 蒸馏"等不在论文主线的组合路线，不算幻觉，但候选质量按其与
  研究问题（通用压缩 + 质量保留 + 推理加速三目标）的贴合度打分。

## GT-3 关键实验（论文真实数字——**答案卡内容**，非晋升时点可见）
- **GLUE dev（Table 1，宏平均 over 9 任务）**：ELMo 68.7 / **BERT-base 79.5 / DistilBERT 77.0**（保留 77.0/79.5 ≈ **96.9% ≈ "97%"**）。
- 逐任务（BERT-base → DistilBERT）：CoLA 56.3→51.3 / MNLI 86.7→82.2 / MRPC 88.6→87.5 / QNLI 91.8→89.2 /
  QQP 89.6→88.5 / RTE 69.3→**59.9** / SST-2 92.7→91.3 / STS-B 89.0→86.9 / WNLI 53.5→56.3。
- **体积/速度（Table 3）**：参数量 **110M → 66M**（**-40%**）；推理时间 **668s → 410s**（**60% faster ≈ 1.63x**，
  论文测量条件 = 单 CPU、STS-B dev、batch size 1）。
- 下游迁移（Table 2）：IMDb 分类、SQuAD 抽取式问答上学生亦接近教师（论文另有 on-device 移动端推理演示）。
- 本项目 committed subset = {SST-2, MRPC, CoLA}：真实数字见素材 `GS002_EXPERIMENT_RESULTS`
  （`full_finetune_reproduction` 教师复现 + `confirmatory_matrix` 学生保留 + `subset_macro_retention`）；
  子集宏平均 teacher ≈ 79.2 / student ≈ 76.7，**子集保留 ≈ 96.8%**（CoLA 拖累，略低于 9 任务口径）；
  逐任务保留：SST-2 0.985 / MRPC 0.988 / CoLA 0.911——**全部通过 0.90 每任务地板**，CoLA 为非均匀披露点。

## GT-4 消融 / 设计论证（论文回答"为什么这样设计"）
- **三重损失消融**：去掉蒸馏 KL 或 cosine-embedding 损失都掉点——软标签信号与隐状态对齐都对迁移质量有贡献。
- **学生初始化**：从教师层初始化显著优于随机初始化——蒸馏起点即继承教师表示。
- **减层 vs 减宽**：论文选择减层（12→6）而保持隐藏维度，因隐藏维减宽在现代硬件上加速收益不成比例。

## GT-5 结论边界（论文自己声明的界限）
- 保留教师 GLUE **宏平均**约 97% 的语言理解能力（**宏口径**，非逐任务保证）。
- 体积 -40%（确定性，参数量口径）。
- 推理约 1.6x 更快 / 60% faster（**特定固定设备口径**，CPU/batch 1；设备类别变则比值变）。
- 主张是"在压缩下保留大部分能力"，**不主张学生匹敌或超过教师**；保留质量以教师质量为上界。

## GT-6 已知局限（论文明示 / 领域共识）
- **仅 encoder / 判别式任务**——不适用于生成任务（decoder / seq2seq），学生未评生成能力。
- 逐任务保留**非均匀**：CoLA（可接受性判断，MCC 56.3→51.3）与 RTE（小样本蕴含，69.3→59.9）退化最显著——
  宏平均会**掩盖**这些逐任务退化（本场景 claim boundary 核心考点）。
- 蒸馏质量依赖教师质量与蒸馏语料覆盖；教师差或语料窄则学生随之退化。
- 加速比与设备类别/batch 强相关，非普适常数。

## GT-7 权衡结论边界（**本场景特化考点**，claim boundary 纪律）
DistilBERT 的核心主张是**三目标权衡**（质量保留 / 体积缩减 / 推理加速）。人审对照 claim/result-analysis 节点时，
按以下边界判候选是否越界：
- **宏口径 ≠ 逐任务**："保留 97%" 是 GLUE dev 宏平均；把它表述为"无能力损失 / 逐任务均保留 / 匹敌教师" = **越界**
  （被 CoLA 56.3→51.3、RTE 69.3→59.9 证伪）。合规表述须点名逐任务退化面。
- **子集 ≠ 全 GLUE**：本项目 committed subset（SST-2/MRPC/CoLA）宏保留 ≈ 96.8%，把子集结果重述为"全 9 任务 GLUE
  保留 97%" = 越界（超 confirmatory 范围，降级 exploratory）。
- **加速的设备条件**：不带"固定设备"测量条件给出普适加速数字 = 越界（素材 NG-1 已把 speed 目标的设备类别刻意留欠定，
  skeptic 应识别）。
- **claim strength**：预期最大主张是 **strong 有界 empirical_finding**（见素材 `GS002_CLAIM_GROUND_TRUTH`）——
  全部预承诺门通过（每任务 0.90 保留地板 / 体积 / 固定设备加速）故 strong 成立，但 **strong 必经人工确认停驻
  （四点集第 2 点）且必须显式携带 CoLA 非均匀边界与固定设备条件**；不带这两条边界的 strong = 越权主张。
- **披露纪律 / 负结论**：教师某任务复现未达门槛 → 该任务保留主张作废（非弱化）；CoLA 保留 0.911 **过 0.90 地板但
  远低于论文 0.97 宏口径参考** → 作为边界强制披露而非被宏平均抹平。result-analysis 的 unexpected_findings 与
  dossier experiment_limitations 应能显式列出 CoLA 非均匀性。

> **设计意图（非素材矛盾，务必据此判读）**：选题包预承诺的质量门是**每任务保留比 ≥0.90 地板**（全部真实数据通过：
> SST-2 0.985 / MRPC 0.988 / CoLA 0.911）；论文的"97%"是 **9 任务 GLUE 宏口径 headline（77.0/79.5 ≈ 0.9686）**，
> 在选题包中只作参考语境，**不是逐任务门**。本场景刻意让 CoLA（0.911）与 committed subset 宏（0.968）都落在
> "过地板但低于 0.97 参考"的区间——演练的是**披露纪律**：
> **正确行为** = strong 有界权衡主张 + 强制披露 CoLA 非均匀性与固定设备条件 + 宏口径只作语境；
> **错误行为（应扣分）** = 用 9 任务宏口径(0.969)偷换子集/逐任务口径、把 CoLA 抹平宣称"均匀保留 97%"、
> 表述为"无能力损失/匹敌教师"、或把 0.97 参考误当逐任务门然后错误地宣布"CoLA 未达标→trade-off 失败"。

## 幻觉对照速查
以下若出现在 LLM 产出中且被当作"选题包晋升时点已知事实"引用，判幻觉：
- **具体 GLUE 分数数字**（79.5/77.0/56.3/51.3 等）、参数量 110M/66M、推理时间 668s/410s、"1.63x/60% faster" ——
  这些是论文报告值（GT-3 / `GS002_EXPERIMENT_RESULTS`），**仅在后半链由 trusted REU 注入后**引用才合规。
- "已证明蒸馏无损 / 学生匹敌教师"——晋升时点仅是假设，且论文本身不主张无损。
- 论文作者/机构、GPT 系或 decoder 蒸馏细节（本论文是 encoder 蒸馏）。
以下**不算幻觉**：从选题包内容核合理推导的路线/实验设计（即使与论文一致或不一致）；引用选题包 v1 预承诺的**复现门槛
数字**（每任务保留地板 0.90、"0.97 为论文 9 任务宏口径参考非逐任务门"、SST-2 acc ≥91.0、MRPC F1 ≥87.0、CoLA MCC
≥52.0、体积 ≥40%、加速 ≥1.5x、总预算 ≤60 GPU-hours、组合上限 6 等）——这些是选题包事实（复现门槛），非论文报告值。

## GT-8 v1 预承诺对照（选题包 v1）
人审对照 lane A run 时按此评估 LLM 产出是否消化并遵守晋升时点预承诺：
- **多目标权衡预承诺**：三目标优先级排序（质量保留=gating / 体积 / 速度），各带测量协议；质量门=**每任务保留比 ≥0.90
  地板**（0.97 为论文 9 任务宏口径参考，非逐任务门）；priority 规则（任一任务地板不达即 FAILED trade-off，非部分成功）；
  聚合口径危害披露（宏平均掩盖逐任务，最弱任务必须上浮披露）；子集 vs 全 GLUE 边界。
- **confirmatory 预算矩阵**：单 GPU ≤24GB；总 ≤60 GPU-hours（stage 0 探针 ≤8 / stage 1 基线 ≤34 / stage 2 confirmatory
  ≤18）；每任务重复 ≤3；组合上限 6 = {6 层学生, 教师 BERT-base} × {SST-2, MRPC, CoLA}；超参 stage 2 前冻结；
  学生固定 6 层从教师初始化；checkpoint 只留 final。
- **教师前向成本单计规则**：教师对蒸馏语料的前向**算一次并缓存**（软标签/隐状态复用），绝不按学生 epoch/seed 重计；
  stage-1 教师复现 run 逐字复用为 stage-2 confirmatory 教师单元格。
- **指标聚合预承诺**：每 cell median-over-repeats（≤3）；保留判据 = 学生任务指标 ≥ 复现教师值的 **0.90**（每任务地板）；
  committed subset 宏平均**上报不设门**；逐任务保留比必上报（非均匀性不得被宏平均掩盖）；教师某任务未达复现门槛 →
  该任务无可用锚，保留主张作废。
- **基线控制清单**：教师 BERT-base 复现（必做；未达门槛→该任务保留主张作废）、6 层学生全量 task-agnostic 蒸馏
  复现（必做；报告三重损失分量）、task-specific 蒸馏（可选）、pruning/quantization（stage 2 后剩余 ≥10 GPU-hours
  才做，须同三目标协议 like-for-like）。claim-control：失败复现一律 drop 而非弱化。
- **自包含探针判据（stage 0）**：stage 0 内先训短单种子教师 SST-2 校准锚点，探针通过 = 学生 SST-2 acc **同时** ≥88.0
  绝对下限 且 与该 stage-0 教师锚点差 ≤2.5pt；判据仅用 stage 0 产出，不依赖 stage 1。stage-0 锚点 ≠ stage-1 正式教师复现。
- **参考实现指针**：huggingface/transformers 蒸馏示例 + DistilBERT 超参（6 层、教师隔层初始化、去 token-type/pooler、
  三重损失、同 tokenizer）作晋升时点 code/config 溯源锚；项目级 code/config artifact 晋升时点不存在，诚实登记为已知缺口。

## 自然缺陷面（诚实素材设计——留给 skeptic 有真活干，非硬伤）
本素材**刻意保留 2 处诚实的次要缺口**（无 gs-001 v2 那类阶段矛盾硬伤），skeptic 若识别应加分（批判有效性），
LLM 若照单全收未识别应相应减分：
- **NG-1（权衡声明边界）**：三目标中 `inference_speed` 目标只约束"同一固定 commodity 设备上师生一致"，**未钉死设备
  类别（CPU vs GPU）**——加速比对设备类别敏感，>=1.5x 数值下限在设备类别未定时欠定。质量/体积两目标协议完整，
  speed 目标协议偏薄（诚实不对称）。skeptic 应指出应把设备类别钉死方能作 confirmatory 加速主张。
- **NG-2（证据覆盖）**：inference-speed / capability-transfer facet 在晋升时点仅有文献级证据、无直接加速测量证据；
  第二条文献证据单元（task-agnostic 蒸馏机理）intake 未绑定，board curation 有真材料可绑（且可点出"缺直接加速测量
  证据"这一真实 board gap）。这吸收了 run 006/007 的 curation gaps 教训（避免"唯一证据已全绑→curation 必 blocked"）。
