# 13 Golden ×3 工单：素材扩容 + 全链 runner（开工 2026-07-15）

## 定位
- D10 完成定义的素材面：**3 条 golden scenario 全链自动推进至 dossier ready** + 五项验收。现状：gs-001 (LoRA) 素材 v3 成熟，但 runner 只到受理桥物化——**后半链（实验假体→REU→result analysis→claim→dossier→Domain Gate 物化）从未进 golden 场景**。D2 已闭合，档位在产品真实形态生效。
- 素材原则（D10 签核）：测试用选题包，arXiv 带代码论文反推、真实 bootstrap 路由入链、论文已知结论作 ground truth；诚实停驻（四点集），零测试后门。

## 工作项

### G1 runner 全链扩展（критical path）
`.ai/scripts/paper-implementation-golden-scenario.mjs` 扩展后半链（沿既有诚实停驻/override 纪律）：
1. **场景参数化**：runner 接受场景目录参数（gs-001 硬编码路径解耦），素材接口=topic-package.mjs 导出约定（沿 gs-001 形态）。
2. **后半链**：lane A completed + FeasibilityProbe created 之后——ResearchWorkOrder 创建与 admit（trace gate 按产品路径 evaluate，enforced 档位生效）→ **实验 acceptance 假体**（run_mode=acceptance 的实验执行面，产出 trusted RunEvidenceUnit——用产品既有 acceptance 通道，素材包内预置实验结果数据（论文真实数字），不伪造 provider）→ result_analysis slot（provider live，wire 编码已落）→ Domain Gate 物化 ResultInterpretationPacket → claim_boundary debate（P1 live）→ 强 claim 人工确认停驻（四点集第 2 点，runner override 记 actor）→ Domain Gate 物化 ClaimCandidate → dossier_readiness debate（P1 live）→ N7 项目级 REU 对账 → Domain Gate 物化 ImplementationDossier → **dossier ready**（export 停驻=四点集第 3 点，runner 停在此为终点）。
3. 每步如实记录（artifact 序列/review-packet 扩节/telemetry baseline 含后半链成本）；任何 slot 停驻/失败=诚实记录不 override（除四点集签核停驻）。血缘断言：dossier→claim→packet→REU→WO→probe→route 全链 ref 可回溯（五项验收之"血缘无断链"的机器检查节）。
4. RUNNER_VERSION 递增；素材接口若需新增字段（实验结果数据、claim ground truth 锚），gs-001 素材 v4 同步补齐（内容取论文真实数字，v3 其余不动）。

### G2 gs-002 素材（DistilBERT，蒸馏族）
arXiv 1910.01108（DistilBERT，代码=transformers 库）。选型理由：与 LoRA 不同方法族（蒸馏 vs PEFT）、**多目标权衡空间**（质量 97%/体积 -40%/速度 ×1.6——rubric 可考"权衡声明的边界纪律"）、GLUE 数字公开稳定、探针可自包含（小规模蒸馏 run + 单任务锚点）。产出：`.ai/golden-scenarios/paper-implementation/gs-002-distilbert/`（topic-package.mjs / ground-truth.md / rubric.md），结构对齐 gs-001 v3+G1 新接口；吸收 gs-001 三轮评审教训（阶段判据自包含、预算矩阵单计、metric 预承诺、claim-drop 规则、参考实现指针）。
### G3 gs-003 素材（BitFit，边界条件族）
arXiv 2106.10199（BitFit，bias-only 微调，代码公开）。选型理由：**已知有效边界**（小中数据集有效、大数据/复杂任务显著退化——ground truth 天然含 negative/inconclusive 结论，考验 claim boundary 纪律与 N7 失败对账、claim-drop 语义）；探针极轻。产出目录结构同 G2。三场景覆盖三种链形态：gs-001 分阶段 confirmatory、gs-002 多目标权衡、gs-003 边界/负结论。

### G4 gs-001 v5 全链首跑 + 复评
G1 落地后以 gs-001（素材 v4）跑全链 live：**首个 dossier ready 终点**。同时验证 D2 遗留两项——pre1 challenger 正向路径（motive lane designer 若再变异则如实记录并重跑一次）、claim/dossier debate 的 P1 wire 首次 golden live。**AI 代评审 v5**（四维 rubric 全链版：后半链新增可评面=result analysis 解读质量/claim 边界纪律/dossier 完备性；对比 v3 三评基线）。
### G5 gs-002/003 live + 评审
两场景全链 live（预期各有素材修订轮——照 gs-001 v1→v3 节奏，skeptic 拦下的素材缺陷=系统在工作，修订后重跑）；各自 AI 代评审 rubric 留档。

## 收口（D7）
全量门 + review 惯例（G1 代码面 8 角度；素材面走评审轮）；三场景终局 run + 评分 + 遥测汇总入 04（五项验收证据的素材面就位）；治理同步 + 提交。D10 终验收（五项验收正式核验）留待 D4/D6 后单独执行。
