# 03 Implementation Notes

## 2026-07-08 - A 段:LIT-0204 evaluation-protocol 第一条真实晋升全链
- **protocol_hash 落地**:`.ai/scripts/experiment-foundation-protocol-hash.mjs`(canonical-JSON sha256,哈希协议定义非 repo tree;cpu_adapter 档拼 13 补丁清单摘要)。协议定义工件 `artifacts/lit-0204-ragperf-protocol-definition.json`;hash = `cpu_adapter:sha256:aac51e52…d6f84`,复算验证一致。
- **runner**:`tools/lit-0204-evaluation-protocol-promotion-runner.mjs`——走真实 service 路径(`createRecord` Ajv 校验 + `decidePromotion` 的 assertPromotionGate/canonical refs 断言),非直插表。记录链:data_policy(代码 license 政策,policy 门 clear 结论落记录)→ metric_definition ×17(informational 3 条标 faithful-only)→ canonical evaluation_protocol(protocol_version=v1-cpu-adapter,benchmark_asset_id 前向引用)→ evaluation_protocol_candidate(六门内嵌,ready_for_promotion)→ triage report → manual_promote request(reviewer=yurui)+ promoted result(四组 canonical refs 全非空)。candidate 终态 **promoted**。
- **形状踩坑**:data_policy schema 与能力 fixture 演进版不同(无 name/license_ref/usage_restrictions,有 access_level/privacy_level)——Ajv 报错即修,恰证明走的是真实校验路径。
- **负例(意外更强)**:`--negative` 重放晋升被 **`GATE_CONSTRAINT_FAILED: Promotion request candidate_hash is stale`** 拒——服务有 request.candidate_hash ↔ candidate 当前 hash 的内容漂移守卫(比预期的重复 id 拒绝更强的一层);首版负例模式因先走 createRecord 在 data_policy 处 409 提前拒(也是幂等证据),已修为跳过创建直达裁决断言点。
- **duplicate 复查**:RAGPerf 现命中 23 条(晋升前 0)——duplicate 门从此有真数据可防。
- **判定留痕**:①benchmark_asset_id 前向引用(不为必填字段绕过用户裁决建 benchmark 资产;消费时验证承接解引用风险);②canonical_version_refs 复用协议 ref(协议记录携带 protocol_version,无独立 version 记录类;label 注明);③payload hash 约定=去自身 hash 字段后 canonical-JSON sha256;④零 backend 代码改动(runner/脚本均在包内与 .ai/scripts),无需跑后端套件。

## 2026-07-08 - B/C 段:playbook 固化 + 范围登记
- Playbook:`docs/context/process/experiment-foundation-promotion-lane-playbook.md`(7 步 lane + 档位/前向引用/消费时验证/负例守卫约定 + 需求拉动策略)。
- C 段登记:benchmark 候选 manual_review_required(外部依赖 faithful GPU + dataset payloads);dataset 两候选 needs_info;其余 8 篇按需拉动——均在 playbook Registry 现状锚与 T-118 07 留痕。
- D 段(消费时验证)defer:第一个真实 RunRecipe 锁定时执行,约定已入 playbook。

## 2026-07-12 - D-17 catalog/execution 边界对账

- 2026-07-08 的 23 条 registry 记录、`promoted` 裁决、protocol_hash 复算和重放负例均保持有效且不回写；这些事实证明的是 catalog promotion lane，不是可执行协议或科学证据链。
- `v1-cpu-adapter` 继续作为 immutable catalog/reference 资产。其 free-shape policies、未托管 seed、smoke repeat 和 benchmark 前向引用无法满足 D-17 typed runtime contract，因此在 Run freeze/head/真实 Attempt 前必须被 readiness 阻断，并且不能产生 protocol-compliant passed validation report/EvidenceCandidate。
- 唯一升级路径是新建 versioned `evaluation_protocol_id`、typed v2 protocol/version/hash 和对应 candidate/promotion，再通过 exact dependencies + validator capability readiness；不得覆盖 v1、双读新旧规则或借 manual promotion 例外放行 runtime。
- 本次只同步目标文档，没有修改 runner、registry 数据、backend、schema 或运行时状态；typed v2 导入与 readiness/validator 实施仍属于后续产品化切片。
