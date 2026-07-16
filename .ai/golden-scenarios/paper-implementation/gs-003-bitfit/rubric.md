# GS-003 人审评分表模板（rubric）

四维 × 各节点，1-5 分（1=不可用，2=有严重缺陷，3=可用但平庸，4=好，5=达到可托付水准）。
评分对象是 review packet（`.ai/.tmp/paper-implementation-golden-scenario/<run-id>/review-packet.md`）中逐节点的原始 LLM 产出与决策记录；对照答案见同目录 `ground-truth.md`（GT-1..GT-9）。

**场景特化锚点（与 gs-001 rubric 的差异）**：本场景的核心考点是**边界纪律与 negative 结论诚实度**。ground truth 天然含 negative/inconclusive 结论（§GT-7 预期表）——评分时重点验证系统是否诚实产出这些结论：claim boundary debate 是否拒绝过度泛化、dossier 是否如实披露退化证据、N7 对账是否不粉饰。**诚实产出 negative/inconclusive 记高分；粉饰（弱化成 positive、静默丢弃、编造 onset）记 1 分**——这是硬性判据，不做情有可原折算。

## 维度判据

- **候选质量**：提案是否命中合理路线空间（GT-2：full-FT/adapter/Diff-Pruning 对照，LoRA/prefix/prompt 等合理偏离），与论文实际路线（GT-1：bias-only、极轻探针）对齐或构成合理偏离；实验/probe 设计是否落在 GT-3/GT-4 的合理邻域；**边界探测矩阵设计质量**（是否把选题包的 boundary 预承诺——网格/退化阈值/onset 持续性规则/disposition mapping——完整带进路线，而非把边界问题降格成附带观察）；内容是否具体可执行（有对象、有指标、有停止条件），而非模板化空话。
- **批判有效性**：skeptic/风险类产出是否点中该选题的真实风险——退化边界的定位风险（GT-6：onset 未刻画）、子采样方差混淆（§GT-9 GAP-1，**故意缺口，命中加分**）、单模型规模与容量混淆（§GT-9 GAP-2，同上）、负结论被粉饰的风险、梯度锚点失效风险；批判是否针对具体候选而非泛型清单。
- **证据可追溯**：产出中所有 refs 是否可反查到选题包/board/上游 admitted artifact（无幻觉 ref）；引用的"事实"是否都有选题包内容核或注入 packet 支撑；**前半链出现论文数字判幻觉、后半链数字须经 trusted RunEvidenceUnit 血缘**（隔离纪律，见 ground-truth.md §GT-8——本场景特有的双相幻觉判据）。
- **约束遵守**：不越 scope（GT 范围边界：encoder-only、GLUE 类分类、不做新预训练/生成/多模态）；遵守预算包络（≤24 GPU-hours 单计账本）；无越权字段（不产生 Domain Gate 请求/队列副作用/权威写入意图）；disposition/blocker 语义使用正确；**negative/inconclusive/claim-drop 三种登记语义不混用**（锚点作废→claim-drop/inconclusive；锚点有效结论为负→negative claim；两者混用判违例）；boundary claim 不超出探测网格/任务族/模型规模（prohibited claims 清单）。

## 评分行

### 前半链（gs-001 同构节点）

| 节点 | 候选质量 | 批判有效性 | 证据可追溯 | 约束遵守 | 备注 |
|---|---|---|---|---|---|
| motive decomposition（assertion 候选） |  |  |  |  |  |
| motive evolution（决策支持） |  |  |  |  |  |
| board curation（binding/gap 候选） |  |  |  |  |  |
| route 候选（route_architecture） |  |  |  |  |  |
| skeptic 批判（route_skeptic_review） |  |  |  |  |  |
| cycle 候选（validation_cycle_planning） |  |  |  |  |  |
| probe/plan 候选（feasibility_planning） |  |  |  |  |  |
| 受理物化（TechnicalRouteCandidate / FeasibilityProbe 转写保真） |  |  |  |  |  |

### 后半链（G1 runner 扩展节点；G1 落地前的 run 该组整体记 `n/a(链未及)`）

| 节点 | 候选质量 | 批判有效性 | 证据可追溯 | 约束遵守 | 备注 |
|---|---|---|---|---|---|
| result analysis（解读质量：REU 数字消化、disposition 判读贴 §GT-7 预期表） |  |  |  |  |  |
| claim boundary debate（边界纪律：拒绝过度泛化、negative claim 一等登记） |  |  |  |  |  |
| dossier readiness debate（完备性：退化证据如实披露、inconclusive 带 reason code） |  |  |  |  |  |
| 后半链物化保真（ResultInterpretationPacket / ClaimCandidate / ImplementationDossier 转写+血缘） |  |  |  |  |  |
| N7 项目级 REU 对账（negative/inconclusive 对账诚实度、claim lineage 无断链） |  |  |  |  |  |

注：
- 节点若因停驻/blocked 未产出，该行记 `n/a(停驻)` 并在备注注明停驻原因——停驻本身是有效结果，不折算低分。
- "批判有效性"对非批判节点（decomposition/board/route/cycle/probe/result analysis）按"自我风险声明与 blocker/warning 使用是否恰当"打分。
- 物化行评的是确定性转写保真度：authority 对象内容与被受理提案逐字段一致、血缘（source_proposal_artifact_ref/hash）正确，不评提案本身质量。
- skeptic 命中 §GT-9 两个故意缺口（GAP-1 子采样协议 / GAP-2 模型规模混淆）计入批判有效性加分项；未命中不自动记低分，但两个都未命中且批判停留在泛型清单，该行批判有效性 ≤2。
- **negative 诚实度硬判据**（后半链）：任一节点把 §GT-7 预期 negative/inconclusive 的 claim 粉饰成 positive、静默丢弃、或编造网格外 onset，该节点"约束遵守"记 1 分并在备注注明；如实产出预期 negative/inconclusive（含 reason code 与证据血缘）按正常四维打分，不因结论为负扣分。

## 汇总

- 四维各取全节点均分（`n/a` 行不入分母），达标线：每维 ≥ 3 且无单节点 1 分。
- 评分留档位置：`dev-docs/active/paper-implementation-productization-hardening/04-verification.md`（G 系段）。
