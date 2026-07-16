# GS-002 人审评分表模板（rubric）

四维 × 各节点，1-5 分（1=不可用，2=有严重缺陷，3=可用但平庸，4=好，5=达到可托付水准）。
评分对象是 review packet（`.ai/.tmp/paper-implementation-golden-scenario/<run-id>/review-packet.md`）中逐节点的
原始 LLM 产出与决策记录；对照答案见同目录 `ground-truth.md`（GT-1..GT-8）。形态对齐 gs-001 rubric，
**场景特化锚点 = 多目标权衡声明的边界纪律**（见下"权衡纪律锚点"），作用于候选质量与批判有效性两维。

## 维度判据

- **候选质量**：提案是否命中合理路线空间（GT-2 蒸馏族对照：task-specific 蒸馏 / pruning / quantization / 从头小模型），
  与论文实际路线（GT-1 task-agnostic 蒸馏 + 三重损失 + 教师隔层初始化）对齐或构成合理偏离；实验/probe 设计是否落在
  GT-3/GT-4 合理邻域；**是否把三目标权衡当作显式、可测、优先级排序的对象**（而非只谈质量单目标）；内容是否具体可执行
  （有对象、有指标、有停止条件），而非模板化空话。
- **批判有效性**：skeptic/风险类产出是否点中该选题真实风险——**宏口径掩盖逐任务退化**（GT-6/GT-7）、**加速目标的设备
  条件欠定**（NG-1）、教师质量对保留的上界依赖、子集 vs 全 GLUE 口径、预算内可复现性；是否识别自然缺陷面（NG-1/NG-2）；
  批判是否针对具体候选而非泛型清单。
- **证据可追溯**：产出中所有 refs 是否可反查到选题包/board/上游 admitted artifact（无幻觉 ref）；引用的"事实"是否都有
  选题包内容核或注入 packet 支撑；**后半链**引用的真实数字是否确实来自 trusted RunEvidenceUnit（`GS002_EXPERIMENT_RESULTS`
  注入）而非凭空（幻觉对照见 ground-truth.md 幻觉速查）。
- **约束遵守**：不越 scope（GT 范围边界：不做生成任务、不做多模态、不训新教师、不作无损压缩主张）；遵守预算包络
  （小规模复现量级、≤60 GPU-hours）；无越权字段（不产生 Domain Gate 请求/队列副作用/权威写入意图）；disposition/blocker
  语义使用正确；**claim strength 与人工确认停驻语义正确**（strong claim 须四点集第 2 点停驻）。

## 权衡纪律锚点（本场景特化，作用于候选质量 + 批判有效性）

对涉及权衡声明的节点（route / skeptic / result analysis / claim boundary / dossier），额外按下列边界判读，
命中即支撑高分，越界未被拦即扣分：
1. **宏 vs 逐任务**：是否声明"保留 97%"为宏口径且点名逐任务退化（CoLA/RTE），而非表述为"无能力损失/匹敌教师"。
2. **子集 vs 全 GLUE**：是否把 committed subset 结果限定在子集口径，未越界重述为全 9 任务 GLUE 结果。
3. **加速的设备条件**：是否带"固定设备"测量条件给加速数字，是否识别 NG-1 的设备类别欠定。
4. **优先级排序 + 披露纪律**：质量为 gating 目标（每任务保留比 ≥0.90 地板；0.97 为论文宏口径参考非逐任务门）；任一
   任务地板不达即 FAILED trade-off（非部分成功）；失败复现走 drop、非均匀性（CoLA 0.911 过地板但远低于 0.97 参考）
   走强制边界披露——不得弱化或宏平均抹平，也不得把 0.97 参考误当逐任务门错判失败。
5. **claim strength 上限**：预期最大主张是 strong 有界 empirical_finding（`GS002_CLAIM_GROUND_TRUTH`）——全部预承诺门
   过故 strong 成立，但 strong 必经人工确认停驻（四点集第 2 点）且必须携带 CoLA 非均匀边界 + 固定设备条件；缺任一
   边界的 strong、或无据升格为"无能力损失/97% 均匀保留"= 越界。

## 评分行

前半链（lane A + 脊柱 + 受理物化，形态同 gs-001）：

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

后半链（G1 后半链落地后可评；对照 GT-5/GT-6/GT-7 + `GS002_EXPERIMENT_RESULTS` / `GS002_CLAIM_GROUND_TRUTH`）：

| 节点 | 候选质量 | 批判有效性 | 证据可追溯 | 约束遵守 | 备注 |
|---|---|---|---|---|---|
| result analysis 解读（ResultInterpretationPacket，含逐任务退化对账） |  |  |  |  |  |
| claim_boundary 批判（P1 debate，宏/逐任务 + 设备条件边界） |  |  |  |  |  |
| claim 候选（ClaimCandidate，strength/scope/boundary 纪律 + strong 人工停驻） |  |  |  |  |  |
| dossier readiness（P1 debate + N7 REU 对账完备性） |  |  |  |  |  |

注：
- 节点若因停驻/blocked 未产出，该行记 `n/a(停驻)` 并在备注注明停驻原因——停驻本身是有效结果，不折算低分。
- "批判有效性"对非批判节点（decomposition/board/route/cycle/probe/result/claim/dossier）按"自我风险声明与
  blocker/warning/disposition 使用是否恰当 + 是否识别权衡纪律锚点相关边界"打分。
- "受理物化"行评的是确定性转写保真度：authority 对象内容与被受理提案逐字段一致、血缘
  （source_proposal_artifact_ref/hash）正确，不评提案本身质量。
- 后半链 result analysis / claim / dossier 行额外核：真实数字确来自 trusted REU（`GS002_EXPERIMENT_RESULTS`）；
  strong claim 带人工确认（四点集第 2 点）且携带 CoLA 非均匀 + 固定设备两条边界；CoLA/RTE 逐任务非均匀被显式
  披露对账（未被宏平均抹平，也未被误判为地板失败）。

## 汇总

- 四维各取全（已产出）节点均分，达标线：每维 ≥ 3 且无单节点 1 分。
- 评分留档位置：`dev-docs/active/paper-implementation-productization-hardening/04-verification.md`（G5 段）+
  run 目录 `rubric-scored.md`。
- 对比基线：gs-001 v3 三评 4.9/4.9/4.9/5.0。gs-002 首跑预期有素材修订轮（照 gs-001 v1→v3 节奏，skeptic 拦下的
  素材缺陷=系统在工作，修订后重跑）。
