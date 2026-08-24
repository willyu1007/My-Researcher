# 15 T-124 尾巴 tracker（验收后硬化，2026-07-18 开）

## 定位
T-124（paper-implementation 产品化硬化）D10 五项验收全部达成、四判断点已签核（见 `06-d10-acceptance-report.md`），**主包完成、可归档**。以下为验收签核时确认的移交项——均非验收阻断，属验收后独立硬化，按需推进（外部语料/校准数据/特性排期门控）。仿 T-129 极简 tracker 模式。

## 移交项

### N1 gs-003 答案卡强度精修（+ 重跑验证）
- 事由：gs-003 claim 强度模型跨 run 一致降档 moderate（单种子不足以支撑 strong），签核裁定=**模型正确、答案卡偏乐观**。
- **状态：DONE（2026-07-18）**。处置=把 gs-003 诚实改为 **moderate claim 场景**（strength/ceiling strong→moderate、requires_human_confirmation→false、scope→null、rationale 改 moderate 理由；论文数字零改动，diff 无数字行）。runner 用素材自身确认契约作谓词 `EXPECTS_STRONG_CLAIM_CONFIRMATION` 条件化 5 处（确认 ref/声明面/beforeMaterialize 确认步/血缘断言 PASS 条件），**gs-001/002 强 claim 路径不破**（三场景冒烟全 completed，前两者 stop#2 仍 created、gs-003 skipped_moderate_claim）。live 重跑 `gs003-bitfit-live-003`：claim 强度血缘项 **failed→passed**（moderate 与 v2 答案卡同调），停驻#2 正确跳过。血缘 **18/20**（前 17/20）——剩 2 项 = skeptic 再 blocked lane A 的下游 probe skip（GAP-N2 家族，非本项），**未为凑 20/20 做 override**。四维各≥4.5（claim boundary 行 4.5→5.0，分歧扣分消解）。三语义诚实度未劣化。遗留：血缘 check 名 `claim.strong_confirmation_required` 对 moderate 略失准（保 D10 20-check 枚举一致故保留 + PASS 条件适配），如需可后续改名 `claim.confirmation_discipline`。

### N2 skeptic 槽 revise→waiting_review 出口
- 事由：D2-pre2 给了 curation 的 `revise→waiting_review` 出口，skeptic 槽未覆盖——gs-003 lane A 的 skeptic 双命中设计缺口后 disposition=revise 无出口→直接 blocked 终止（GAP-N2），下游 probe/cycle ref 缺失。
- **状态：DONE via T-133（2026-07-18）**。裁定=D-133-1 形状 2（passed-final 单扳机 + disposition 确定性钳制 + 下游 proceed 门），coordinator 既有分支零改动。live 实证：两种出口均行使——gs-002 live-003 `waiting_review→override→passed→全链 completed`（设计停驻点首次触发）、gs-003/gs-002 live-004 `waiting_review→override→仍 revise→waiting_review_terminal`（gs-003 从终态死堵变可复审停驻，血缘 18/20 为设计内形状）。详见 `../paper-implementation-debate-disposition-closure/03-implementation-notes.md` / `05-p3-closeout.md`。

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
- 事由：motive-evolution 的 park/split 选项在缺人工确认时诚实停驻（停驻码为 **LLM 自产 blocking code**，如 `HUMAN_CONFIRMATION_REQUIRED_FOR_LINEAGE_CHANGE`——T-133 P0 勘察更正：非后端常量），golden 流程中该停驻无产品化续链出口。
- **状态：DONE via T-133（2026-07-18）**。裁定=D-133-2/3：`human_decision_required_option_keys` 服务端结构推导 + 聚合排除（纯等人选项 → passed final → coordinator waiting_review 停驻）+ confirm-and-continue 动词（`review_acceptance` ref 校验直通不重跑,无条件要求已消费人工确认,双向动词锁）；混合缺陷照旧终态 blocked（红线,live 实证 gs-001 live-015）。停驻+权威门 live 实证（gs-002 live-003）,confirm 直通由 L5 must-case 钉死,live 全链行使按"机会主义"纪律待后续抽中。详见 T-133 包文档。

### N7（观测，非缺陷）board lane waiting_review 使 run 恒 partial
- 注（T-133 后）：motive lane 现可 completed（evolution 停驻有 confirm 出口）；lane A 的 waiting_review 终止为新增设计性停驻形态。partial 的构成 = 各语义停驻，表述面问题不变。
- 三场景 run status 恒 partial，唯一构成=board/motive lane 的设计性 waiting_review 停驻（非缺陷）。若未来需要"全 completed"的验收面表述，需重定义 runner status 公式对语义停驻的处理（waiting_review 不计入 non-completed）。纯表述面，登记备查。
- 状态：backlog。

## 附：gateway map-schema 静默降解（跨域，S3-β1 附带发现）
- llm-gateway 的 strict-schema 归一化会静默降解一切 map-schema 为空对象；S3-β1/G4.6 已在 paper-implementation 侧全部 wire 编码规避，但 gateway 层本身未 fail-closed。属共享层隐患，跨域，登记备查（非 paper-implementation 独有）。
