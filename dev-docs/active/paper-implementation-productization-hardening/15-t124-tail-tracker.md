# 15 T-124 尾巴 tracker（验收后硬化，2026-07-18 开）

## 定位
T-124（paper-implementation 产品化硬化）D10 五项验收全部达成、四判断点已签核（见 `06-d10-acceptance-report.md`），**主包完成、可归档**。以下为验收签核时确认的移交项——均非验收阻断，属验收后独立硬化，按需推进（外部语料/校准数据/特性排期门控）。仿 T-129 极简 tracker 模式。

## 移交项

### N1 gs-003 答案卡强度精修（+ 重跑验证）
- 事由：gs-003 claim 强度模型跨 run 一致降档 moderate（单种子不足以支撑 strong），签核裁定=**模型正确、答案卡偏乐观**。
- **状态：DONE（2026-07-18）**。处置=把 gs-003 诚实改为 **moderate claim 场景**（strength/ceiling strong→moderate、requires_human_confirmation→false、scope→null、rationale 改 moderate 理由；论文数字零改动，diff 无数字行）。runner 用素材自身确认契约作谓词 `EXPECTS_STRONG_CLAIM_CONFIRMATION` 条件化 5 处（确认 ref/声明面/beforeMaterialize 确认步/血缘断言 PASS 条件），**gs-001/002 强 claim 路径不破**（三场景冒烟全 completed，前两者 stop#2 仍 created、gs-003 skipped_moderate_claim）。live 重跑 `gs003-bitfit-live-003`：claim 强度血缘项 **failed→passed**（moderate 与 v2 答案卡同调），停驻#2 正确跳过。血缘 **18/20**（前 17/20）——剩 2 项 = skeptic 再 blocked lane A 的下游 probe skip（GAP-N2 家族，非本项），**未为凑 20/20 做 override**。四维各≥4.5（claim boundary 行 4.5→5.0，分歧扣分消解）。三语义诚实度未劣化。遗留：血缘 check 名 `claim.strong_confirmation_required` 对 moderate 略失准（保 D10 20-check 枚举一致故保留 + PASS 条件适配），如需可后续改名 `claim.confirmation_discipline`。

### N2 skeptic 槽 revise→waiting_review 出口
- 事由：D2-pre2 给了 curation 的 `revise→waiting_review` 出口，skeptic 槽未覆盖——gs-003 lane A 的 skeptic 双命中设计缺口后 disposition=revise 无出口→直接 blocked 终止（GAP-N2），下游 probe/cycle ref 缺失。
- 处置：把 D2-pre2 的确定性 disposition 出口机制扩到 route_skeptic（及同族单角色 skeptic 面）；coordinator lane A pipeline 对 admitted+revise 停驻 waiting_review（对齐 curation 语义）。含复审 + L5 + gs-003 重跑验证 lane A 可停驻复审。
- 状态：pending。

### N3 纯 light 地板批判有效性探针（D2 校准）
- 事由：D2 档位对比只行使了 light→standard 升档路径；**纯 light 地板**（skeptic 零 findings、不升档、3 角色完链）的批判有效性 vs 原生 standard 未 live 验证——D2 阈值校准的下一最高价值探针。
- 处置：构造一个"缺陷足够微妙、light skeptic 返回零 findings"的对抗目标，双跑 light-floor vs standard，判读 light 是否放过 standard 会拦的缺陷。若放过=阈值需上调 high-stakes floor。
- 状态：pending（需构造微妙缺陷素材）。

### N4 D4 memory families
- 原 T-124 决策 D4（记忆族）延后为验收后特性开发。D10 不引用其能力。独立排期。
- 状态：deferred。

### N5 D6 命名统一
- 原 T-124 决策 D6（renaming）。纯机械更名，验收后做避免验收对象漂移。
- 状态：deferred。

### N6 evolution 人工确认停驻的产品化续链出口
- 事由：motive-evolution 的 park/split 选项在缺人工确认时诚实停驻（`HUMAN_CONFIRMATION_REQUIRED_FOR_LINEAGE_CHANGE` 等），golden 流程中该停驻无产品化续链出口（三 run 均停于此）。
- 处置：设计确认后续链的产品路径（与 N2 同族的 disposition→waiting_review→override 语义）。
- 状态：pending。

### N7（观测，非缺陷）board lane waiting_review 使 run 恒 partial
- 三场景 run status 恒 partial，唯一构成=board/motive lane 的设计性 waiting_review 停驻（非缺陷）。若未来需要"全 completed"的验收面表述，需重定义 runner status 公式对语义停驻的处理（waiting_review 不计入 non-completed）。纯表述面，登记备查。
- 状态：backlog。

## 附：gateway map-schema 静默降解（跨域，S3-β1 附带发现）
- llm-gateway 的 strict-schema 归一化会静默降解一切 map-schema 为空对象；S3-β1/G4.6 已在 paper-implementation 侧全部 wire 编码规避，但 gateway 层本身未 fail-closed。属共享层隐患，跨域，登记备查（非 paper-implementation 独有）。
