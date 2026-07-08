# 04 Verification

## 2026-07-08 - 晋升全链验证
- protocol_hash 复算:脚本对协议定义工件重算 = 存储值(`cpu_adapter:sha256:aac51e52…d6f84`)一致。
- 执行(真库):runner 全链 23 记录创建成功,`decidePromotion` 通过,candidate 终态 **promoted**;摘要工件 `artifacts/lit-0204-evaluation-protocol-promotion-run.json`。
- `--verify-only` 终态:candidate=promoted / triage=ready_for_promotion / policy=open / request=manual_promote / result=promoted / protocol、metric 存在。
- 负例:`--negative` 重放 → `GATE_CONSTRAINT_FAILED: Promotion request candidate_hash is stale`(拒);首版模式缺陷(创建段 409 提前拒)已修并留痕 03。
- duplicate 复查:registry `ragperf` 命中 **23**(晋升前 0),分布 = candidate/triage/policy/protocol/request/result 各 1 + metric_definition 17。
- 零 backend 代码改动(判定留痕 03),未跑后端套件;governance sync/lint 见 commit。
