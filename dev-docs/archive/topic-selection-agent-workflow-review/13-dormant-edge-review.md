# 13 Dormant/Edge Exhaustive Review（backlog ④）+ Supplemental 裁决落地（⑤）

日期:2026-07-06。方法:多代理工作流(21 代理/~150 万 token)——三视角清单(矩阵+注册表 / shared 契约 / backend 运行时)→ 合并为 24 个规范面 → 按簇四面一致性复核(矩阵分类 ↔ 契约 ↔ 运行时守卫 ↔ 测试/文档)→ 逐发现对抗式反驳。纪律:D8——dormant/provisional/gated 是设计态不是缺陷,复核目标是四面一致,不提议开门。

## 面清单与判定(24 面/22 簇)

| 面 | 类别 | 判定 |
|---|---|---|
| w14-provider-debate-path-dormancy | dormant_path | 守卫本体四面一致(双入口 409 前置拒 + 翻门未接线撞 500 + W-14 双测钉 dormant 身份);报告项经反驳不成立(见反驳 r1) |
| n6-n8-provisional-thresholds-and-product-tripwires | provisional_threshold | 两 provisional 块+两 PRODUCT_GATE+双 emitter+coordinator 单源映射一致,schema test 钉;报告项经反驳不成立(r2) |
| operator-signoff-and-budget-raise-records | reserved_hook | coherent——C-1 结构化门槛与文档逐字相符,release-scope 拒绝面/幂等/预算帽全钉,无自动翻门路径 |
| coordinator-node-inputs-admission-guards | reserved_hook | coherent——execution_spec reserved 前置拒身份四面一致,W-19 接线权归 T-129 C-3 无漂移 |
| w09-debate-execution-plan-dormancy | dormant_path | coherent——3 named plans/mixing guards/Option-A caller seam 与 W-09 dormancy 注释逐字一致 |
| v1b-n6-loopback-edges / v1b-n8-debate-onramp-loopback / v1b-per-node-loopback-arrays / v1a-loopbacks-and-supplemental-round | loopback_edge | coherent(n8 onramp 一项报告经反驳 r3 不成立);v1a supplemental 面另由 ⑤ 裁决处置(下) |
| v1c-n6-downstream-feedback-recheck | candidate_runtime | **确认 F1(minor)**:注册表条目 status/execution_modes 停留在未建成态,而 normalization 候选运行时已实装+pnpm 接线+单测——已修(08-scenarios status→partial_runner_migrated、modes+codex_assisted、补 implementation_note) |
| v1c-n4-delegated-promotion-candidate / human-delegated-capability-vs-product-default / v1c-n2-bounded-micro-debate / gated-debate-prompt-bodies-c2 | candidate/dormant/gated | coherent——delegated 候选与产品默认边界、C-2 门控 prompt 骨架身份全部四面一致 |
| debate-scenario-registry-status-vocabulary | policy_only_scenario | **确认 F2(major)+F3(major)**:①矩阵 v1a N6 行 "supplemental repair" 表述过强(自动编排当时未实装)——随 D-29 落地按实况改写;②v1b value-tension 三方错位(矩阵 implemented/注册表 planned_after_node_policy/Notes policy-only,运行时实为已实装+产品接线)——注册表 status→runtime_implemented_prompts_gated+implementation_note(Notes 措辞经反驳 r3 判为准确,不动) |
| rs-polarity-debate-policy-only | policy_only_scenario | coherent——reserved 触发必须 blocked(DMP-03)身份一致 |
| rs-profile-escalation-superseded-drift | candidate_runtime | **复核中直接顺迁修正**(D-27):Slot Map resource_classification 行退役 stale escalation 陈述(从未实现的 profile-escalation id → 实际注册化标识,status policy-ready→implemented),07-node-policies 同步标注,矩阵 Change Log 2026-07-06 留痕;polarity debate 为另一概念不受影响 |
| v1a-evidence-extraction-none-default | other_edge | coherent(与 rs 面同簇复核) |
| v1b-n4-multi-instance-diversity-sampling | other_edge | **确认 F4(minor)**:矩阵 N4 行宣称 "允许 multi-instance 发散采样" 无任何契约/运行时佐证——已删能力性表述,保留设计理由 |
| debate-rejected-nodes-absence-guarantee / provider-coverage-outside-product-runs / matrix-machine-check-boundary / d08-codex-substitution-enforcement-asymmetry / reserved-validated-need-ref-disambiguation | other_edge | coherent |

## 对抗式反驳留档(5 项,不改)
r1 W-14 `opened_by` 半条件说;r2 PRODUCT_GATE `released_by` 名义 W-13;r3 N8 Notes 前实装措辞;r4 07-node-policies downstream stub;r5 v1a-need-discovery 注册表 status。各经独立反驳代理判 refuted(证据不精确/实为准确/属既档语境)。

## ⑤ Supplemental 跨执行语义裁决(用户拍板 2026-07-06:建有界自动重入)
- 证据链:所有既有调用方(E2E/单测/HTTP invokeNode)手动重入;routing service 预算判定 `<3 且 budget>0`;v1b divergent loop 是单调用多角色遍历(非多轮重入),两形态并存。
- 落地:**JD D-29**(T-088 06,承 D-22)+ harness 加法式 wrapper `runGenerateNeedCandidateSupplementalChain`(默认零接线、单轮 byte-identical、attempt id 逐轮派生 `__rN`、expectations 仅首轮、硬上限 3 与 routing service 双守卫、无新持久化面)+ 4 单测(链续跑至 finalize/硬上限 3/terminal 立即停/caller 低帽),harness 单测文件 111/111。
- 矩阵 v1a N6 行 debate_primitive 注解按实况改写(即 F2 的修复)。

## 结论
④⑤ 完成。dormant/edge 面 18/22 簇四面一致;4 项确认漂移全部当轮修复(均为文档/注册表状态词,零运行时行为改动——D-29 除外,其为 ⑤ 的用户裁决落地);D8 纪律全程未破(零门禁开启、零 tripwire/provisional 变更)。T-089 剩余=①尾巴(v1a/resource-sampling 语义列结构化导出,另行切片)。
