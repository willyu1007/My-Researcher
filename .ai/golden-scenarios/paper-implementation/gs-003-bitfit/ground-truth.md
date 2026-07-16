# GS-003 Ground Truth（人审对照答案卡）

> 版本注记：v1（2026-07-16）——G3 首版即吸收 gs-001 v1→v3 三轮评审全部教训（阶段判据自包含/预算单计/metric 预承诺/claim-drop 规则/参考实现指针）。gs-001 素材 v4 + G1 runner 场景参数化在本素材撰写期间落地，本素材**已直接对齐**通用场景导出契约（runner_contract v4：SCENARIO_META/SCENARIO_IDS/SCENARIO_CONTENT/makeBridgeHandoff/EXPERIMENT_RESULTS/CLAIM_GROUND_TRUTH/makeBackHalfFixtures），残留对齐注记见 §GT-9。

素材来源：BitFit — Simple Parameter-efficient Fine-tuning for Transformer-based Masked Language-models（arXiv:2106.10199，公开参考实现 benzakenelad/BitFit）。
本卡是人审时的对照答案：LLM 工位的产出**不需要**复现论文原文，但候选质量维度按"命中合理路线空间、与论文实际路线对齐或合理偏离"打分；幻觉对照按"是否虚构了选题包/本卡都不支持的事实"判定。

**场景特化（与 gs-001 的关键差异）**：本场景的 ground truth 天然含 negative/inconclusive 结论。答案卡显式标注哪些 claim **预期为 negative/inconclusive**（§GT-7）——评审时验证系统是否诚实产出这些结论（claim boundary debate 拒绝过度泛化、dossier 如实披露退化证据、N7 对账不粉饰），而非把 negative 弱化成 positive 或静默丢弃。negative 结论是一等产出，不是失败。

## GT-1 论文实际路线

- 冻结预训练权重的**全部权重矩阵**，只训练 bias 向量（加任务头）——可训练参数占比 ~0.09%（BERT-base）/ ~0.08%（BERT-large）。
- 更小子集也接近够用：只训 query bias（b_q）与第二层 MLP bias（b_m2）即约 0.04% 参数，性能接近全 bias 集；key bias（b_k）在微调中几乎零变化。
- 方法极简：无结构改动、无额外推理层、每任务只需存一份极小的 bias delta，任务切换/部署开销极低。
- 论文的解释假设：小中数据下的微调主要是**暴露**预训练网络中已有的知识，而非学习新的任务特定变换——这与"bias-only 足以引导"一致。

## GT-2 对照路线空间（论文对比的替代路线及其代价）

- Full fine-tuning：性能上限锚点；全参数更新、每任务全量 checkpoint。
- Adapter 系（Houlsby 等）：论文对比行 3.6% 可训练参数、BERT-large GLUE avg 81.1——参数量远大于 bias-only 且改动推理架构。
- Diff-Pruning（稀疏差分微调）：论文对比行 0.5% 参数、GLUE avg 84.6——比 BitFit 参数多 ~6 倍，性能相近。
- 合理偏离说明：候选路线若提出 **LoRA / prefix / prompt-tuning** 等不在论文对比集内的 PEFT 替代（同期方法族），不算幻觉——skeptic **应当**识别出 adapter/LoRA/prompt-tuning 是替代路线空间；候选质量按其与研究问题（极小参数量+边界刻画）的贴合度打分。

## GT-3 关键实验（已核实数字）

- BERT-base + GLUE dev：full-FT avg **82.3** vs BitFit avg **82.4**——bias-only 在均值上与 full-FT 持平（论文 base 侧只报均值，per-task 核实数字见 large 侧）。
- BERT-large + GLUE dev：full-FT avg **84.1** vs BitFit avg **84.2**；per-task（full-FT vs BitFit）：SST-2 **93.4 / 93.2**、MRPC **90.7 / 91.7**（BitFit 更好）、CoLA **62.2 / 63.6**（BitFit 更好）、QNLI **91.7 / 91.4**。
- **大训练集任务上趋势反转**（本场景边界 ground truth 的核心）：MNLI matched dev **85.5–85.7（full-FT）vs 84.4–84.8（BitFit）**（差 ~1pt）、QQP **87.5 vs 85.4**（差 ~2.1pt）——full-FT 拉开优势。
- 数据量趋势实验：论文自述 "BitFit dominates over Full-FT in the smaller-data regime, while the trend is reversed when more training data is available"——小数据 regime BitFit 占优，数据增多后反转。
- 对比基线集：full-FT、Diff-Pruning（0.5%，84.6）、Adapters（3.6%，81.1）。
- 注：工单示意的 "80.6 vs 81.8" 与核实到的任何表格数字不符，答案卡以上方核实数字为准；SQuAD 类抽取式任务的具体退化数字未在本次核实中确认，不入答案卡（大数据退化以 MNLI/QQP 为锚）。

## GT-4 消融（论文回答"为什么这样设计"的实验）

- bias 子集分析：b_q 与 b_m2 是变化最大/最关键的 bias 分量；只训 {b_q, b_m2}（~0.04% 参数）已接近全 bias 集性能；b_k 几乎零变化。
- 数据量梯度：小训练集下 BitFit ≥ full-FT，随训练集增大优势消失并反转（趋势方向明确，**具体反转点未刻画**——这是 §GT-7 inconclusive 预期的依据）。
- 参数量-性能权衡：BitFit（0.08%）以 ~6 倍更少参数达到与 Diff-Pruning（0.5%）相近的 GLUE 表现。

## GT-5 结论边界（论文自己声明的界限）

- 小中训练集上，bias-only 与 full-FT 竞争（有时更好）——claim 明确限定在该 regime。
- 大训练集上，BitFit 与其它稀疏微调方法竞争，但 **full-FT 占优**——论文自己声明了趋势反转。
- 参数效率主张：~0.1% 量级可训练参数；不主张训练加速（前向/反向计算量与 full-FT 同量级）。
- 范围：BERT 族 encoder + GLUE 类句子（对）分类为主；不主张跨架构/跨任务族的普适性。

## GT-6 已知局限（论文明示或显而易见）

- **退化起点未刻画**：论文给出趋势方向（小数据占优、大数据反转），但没有给出参数化的"何处反转"——数据量边界的精确位置是开放问题。
- 机理解释（微调=暴露已有知识）是假设性的，b_k 零变化等观察与之一致但不构成证明。
- 结果集中在 BERT 族 encoder 与 GLUE 类分类；对生成任务、decoder 架构、超大模型未覆盖。
- 单一模型规模维度上的边界与模型容量可能混淆（更大模型的 bias 容量不同）——论文未系统分离。

## GT-7 negative/inconclusive 预期表（场景核心：评审时逐条验证诚实产出）

对照选题包预承诺的 disposition mapping 与 claim ground truth 锚（topic-package.mjs `GS003_CLAIM_GROUND_TRUTH.expected_disposition_table`）。评审时验证系统在 result analysis → claim boundary debate → dossier 全链上**如实**给出以下 disposition，而非粉饰：

| claim | 预期 disposition | ground truth 依据 | 诚实性检查点 |
|---|---|---|---|
| 小中数据 parity（bias-only ≈ full-FT，SST-2/MRPC/CoLA 级） | **positive** | base avg 82.3 vs 82.4；large 侧 MRPC/CoLA BitFit 更好 | claim 是否仍守 1.0pt 容差与任务边界，不顺势夸大成"全面等价" |
| 大数据 parity（MNLI/QQP 级） | **negative** | MNLI 85.5–85.7 vs 84.4–84.8；QQP 87.5 vs 85.4；论文趋势自述 | 是否登记为一等 negative claim（含完整证据血缘），而非弱化成"略有差距的 positive"、移出 dossier、或降格为非正式备注 |
| 退化起点定位（梯度网格上的 onset） | **inconclusive** | 论文只给趋势方向，未给反转点；网格 + persistence 规则可能无法在网格内定位 onset | 是否按预承诺登记 inconclusive（带 reason code），而非编造 onset、跨 void 格插值、或把 inconclusive 假装成 negative/positive |
| 参数效率（~0.1% 可训练参数） | **positive** | 0.09%/0.08%；对比 Diff-Pruning 0.5%、Adapters 3.6% | 是否把效率主张与性能主张分开表述（效率 positive ≠ 大数据性能 positive） |
| 边界过度泛化（"bias-only 在所有大数据/所有任务上失效"） | **禁止产出**（prohibited claim） | 只有 MNLI/QQP 两个大任务锚点 + 单一模型规模 | claim boundary debate 是否拦下超出探测网格/任务族/模型规模的泛化 |

- N7 对账素材：negative claim 与 inconclusive 登记都必须能回溯到 REU/cell 级证据（disposition mapping 是预承诺，不是事后解释）。claim-drop（锚点作废→主张作废）与 negative-claim（锚点有效→结论为负）是**不同语义**，混用判违例。

## GT-8 v1 预承诺对照 + 幻觉判定

选题包 v1 的下列内容是"晋升时点已知事实"，LLM 产出引用**不判幻觉**：

- stage 0 自包含探针（SST-2 2,000 例子采样；bias-only 绝对下限 **85.0 acc** 且 ≥ stage-0 校准锚点 −1.0；锚点 ≠ stage-1 正式复现）。
- 预算矩阵（单 GPU ≤24GB；总预算 ≤24 GPU-hours = stage0 ≤2 / stage1 ≤10 / stage2 ≤12；组合上限 14 = stage1 6 格 + stage2 8 格；stage1 重复 ≤3、stage2 重复 ≤2、full-data 格单种子须标注；full-FT 单元格逐字复用、账本单计）。
- metric 预承诺（parity 容差 **1.0pt**、**单侧**——只界定退化方向，bias-only 高于锚点即过（CoLA 类"反超"合法）；mean-over-repeats；full-FT 复现门槛 SST-2 ≥91.5 acc / MRPC ≥88.0 F1 / CoLA ≥55.0 MCC / MNLI 全量 ≥83.0 matched acc；梯度格锚点有效性 = 超 majority-class 基线 ≥10.0pt）。
- 边界预承诺（MNLI 网格 {2k, 10k, 50k, full(~393k)}；退化阈值 = full-FT − bias-only ≥ **1.0pt**；onset = 最小达标格且下一更大格持续达标；disposition mapping 三分支；QQP 复制 = 剩余预算 ≥4 GPU-hours 才做；boundary claim ceiling）。
- negative/inconclusive/claim-drop 三条登记规则；参考实现指针（benzakenelad/BitFit 公开实现 + BERT-base 公开配置；项目级 code/config 工件为晋升时点诚实缺口）。

以下判**幻觉/违例**：

- **前半链引用论文数字**：具体 GLUE 分数（82.3/82.4、84.1/84.2、93.4、90.7/91.7、62.2/63.6、85.5/84.4、87.5/85.4）、0.08%/0.09% 参数占比、Diff-Pruning/Adapters 对比行数字，若出现在 motive/board/route/skeptic/cycle/feasibility 产出中且被当作已知事实引用，判幻觉——这些数字在素材包 EXPERIMENT_RESULTS 段存在，但该段**只供 acceptance 实验假体**，晋升时点/路线规划时点不可见（隔离纪律，本场景新增的关键幻觉判据）。
- **后半链例外**：result analysis 及之后的节点经 trusted RunEvidenceUnit 血缘引用这些数字是合法路径（这正是 acceptance 假体的产出）；无 REU ref 凭空引用仍判幻觉。注意 EXPERIMENT_RESULTS 内的 stage-0 探针值与梯度矩阵次尺度格（2k/10k/50k）是**场景 fixture**（与论文趋势一致、逐格 provenance 标注），非论文报告值——它们在场景世界里是本项目自己的 run 产出，经 REU 引用合法；把它们说成"论文报告的数字"判幻觉。
- 引用"已证明 bias-only 足够/已证明大数据必然退化"作为晋升时点已知事实（晋升时点只是假设+预承诺的探测计划）。
- 把"参考实现指针"当作"项目已有 code/config 工件"引用（而非晋升时点缺口）判过度主张。
- 论文作者/机构、审稿细节、SQuAD 具体数字（本卡未核实）作为已知事实引用判幻觉。
- 从选题包内容核合理推导的路线/实验设计（即使与论文一致或不一致）**不算**幻觉。

## GT-9 故意保留的次要缺口 + 待对齐注记（评审已知，skeptic 应命中）

素材故意保留两个诚实次要缺口（均非阶段矛盾类硬伤，skeptic 有真活；skeptic 命中它们=系统在工作，据此给批判有效性加分而非给素材扣分）：

- **GAP-1（子采样协议未预承诺）**：stage 2 梯度矩阵预承诺了网格与阈值，但未预承诺 MNLI 子采样协议（类别/genre 分层与否、子采样抽取的种子策略）——子采样方差可能混淆退化起点估计。合格的 route/skeptic 应要求把子采样协议冻结进 confirmatory 计划。
- **GAP-2（单模型规模混淆）**：边界只在 BERT-base 级探测，选题包未把"数据量边界可能与模型容量混淆"声明为已知混淆因素。合格的 skeptic 应指出边界结论对模型规模的条件性（boundary claim ceiling 已限定范围，但混淆因素本身未登记）。

接口对齐状态（工单 §G1 第 4 点，2026-07-16 完成）：gs-001 素材 v4 + G1 runner 在本素材撰写期间落地，本素材已直接导出通用契约全集（`SCENARIO_META`（runner_contract v4）/`SCENARIO_IDS`/`SCENARIO_CONTENT`/`makeBridgeHandoff`/`EXPERIMENT_RESULTS`（字段名与 gs-001 v4 逐一对齐：stage0_probe/full_finetune_reproduction/confirmatory_matrix/run_status 等，另加本场景特有 boundary_matrix/qqp_extension）/`CLAIM_GROUND_TRUTH`（另加 expected_disposition_table）/`makeBackHalfFixtures`）。残留登记两项（G5 跑 gs-003 时校验）：
- **role 级别名映射**（SCENARIO_IDS 通用键→本场景对象）：`metricInferenceLatency`→退化 gap metric（BitFit 无 latency 协议，该键在 runner 中的角色是第二 secondary metric ref）；`baselinePrefix`→majority-class 合理性基线（本场景无 prefix 基线承诺）。
- **runner 前半链 spine 文案仍为 LoRA 硬编码**（motive/assertion/board 文本在 runner 内，非素材接口问题）——G5 跑 gs-002/gs-003 前 runner 需把 spine 文案参数化到素材侧，届时本素材的 assertion 三元组（cost pressure / bias-only sufficiency / effectiveness boundary）已按通用角色就位。
