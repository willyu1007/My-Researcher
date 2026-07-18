# 04 Verification

## 2026-07-08 - 晋升全链验证
- protocol_hash 复算:脚本对协议定义工件重算 = 存储值(`cpu_adapter:sha256:aac51e52…d6f84`)一致。
- 执行(真库):runner 全链 23 记录创建成功,`decidePromotion` 通过,candidate 终态 **promoted**;摘要工件 `artifacts/lit-0204-evaluation-protocol-promotion-run.json`。
- `--verify-only` 终态:candidate=promoted / triage=ready_for_promotion / policy=open / request=manual_promote / result=promoted / protocol、metric 存在。
- 负例:`--negative` 重放 → `GATE_CONSTRAINT_FAILED: Promotion request candidate_hash is stale`(拒);首版模式缺陷(创建段 409 提前拒)已修并留痕 03。
- duplicate 复查:registry `ragperf` 命中 **23**(晋升前 0),分布 = candidate/triage/policy/protocol/request/result 各 1 + metric_definition 17。
- 零 backend 代码改动(判定留痕 03),未跑后端套件;governance sync/lint 见 commit。

## 2026-07-12 - D-17 证据解释与后续验收边界

- 本节是 documentation-only 对账，不新增 runtime 通过证据。2026-07-08 的 green evidence 只覆盖 schema-valid registry creation、promotion gate、canonical refs、hash 复算和幂等/漂移守卫；不得用于证明 typed rule 编译、validator capability、完整 batch validation 或 EvidenceCandidate eligibility。
- D-17 实施后的最低负例 MUST 证明：`v1-cpu-adapter` 在 Run freeze/`RunManifestFrozen`/head/真实 Attempt 前因 legacy free-shape 或未解析 benchmark ref 被 readiness 阻断，且 manual-promote 历史不能覆盖该阻断、不能创建 passed validation report/EvidenceCandidate。
- D-17 实施后的最低正例 MUST 使用新的 versioned-id typed v2，证明 exact protocol/version/hash 与全部 dependency refs 可解析、所有 required rules 均命中 exact validator `type + version` handler、validator profile/version/hash 被纳入 readiness snapshot，并且只有完整 immutable batch validation 整体通过才产生 EvidenceCandidate。
- 还 MUST 覆盖 unsupported required rule → 稳定 `UNSUPPORTED_RULE`、hash/ref/profile tamper → 阻断、v1/v2 无 overwrite/dual-read。上述断言在实现并运行前一律保持未验证，不得从本包既有 23 条记录推导为通过。
