# topic-selection-productization-hardening

## Outcome

- 收口审计发现 F-01..F-11（见下），把选题管理模块从"政策完备、契约完备"推进到"产品可run、故障可恢复、决策可记忆、参数零死角"，并为每项交付配齐完备测试（单测 / 集成 / 全链 e2e / 故障注入负例 / 不变量回归）。

The task was complete under the previous repository contract and is archived by location under the current contract.

## Project placement

- Task: `T-123`
- Feature: `F-001` — Research Lifecycle Governance Core
- Milestone: `M-001` — LLM Research Lifecycle v1
- Last old-contract update: `2026-07-05`

### Historical Requirement provenance

- `R-009` — Automated topic management decision layer baseline

The retired Requirement objects are provenance only; they were not promoted into the current Milestone/Feature graph.

## Durable verification

- 阈值标定证据（DP-3.3，2026-06-15）：挖掘判定**真实 N8 分数分布不可用**（全 `.ai/.tmp` 仅单一 fixture total 83，详见 03 §2026-06-15 DP-3.3 + 07-spec），故**维持 provisional、不改阈值、保留 tripwire**；阈值带内部自洽（8 例触发器边界单测背书），翻 false 才属被禁猜测。所需 provider_llm 标定语料采集已列 03 计划。见下 §2026-06-15 DP-3.3 运行记录。
- token 估计函数单测（F-10）：三 provider 校准收紧 CJK + deepseek 最省、unknown/Latin-only byte-identical、校准表金值钉死、newline 每行 1 token。real-tokenizer 误差界由 `evidence/f10-token-calibration/measure.py` 800-输入验证背书（见 §2026-06-15 F-10 运行记录）。
- 压缩 profile 化：profile 指定策略生效、未指定时默认策略行为不变（Phase 5.2 partial，已收）。
- 并发双发 → 恰一次执行（coordinator 互斥单测；方案 B 裁决与残余风险记录于 02-architecture）。
- 崩溃恢复语义 → 多次 advance 从投影续跑 + run_complete 幂等重推进（e2e）+ harness replay 既有幂等。
- loopback 超额 → `loopback_budget_exhausted` 停驻（单测：预算 2、第三次重试不调用 harness）。
- 节点/run 超时 → 单测覆盖节点级（含收敛提示）；run 级与 max_steps 实现并默认生效。
- 全链 auto-advance e2e（mocked acceptance，含两次人审同 run 续接）。

## Recovery and migration note

The complete pre-conversion bundle, including detailed decisions, verification, tools, and historical artifacts, is recoverable from Git at `5cf904fb:dev-docs/archive/topic-selection-productization-hardening/`. During T-145 the archive was compressed only after live fixtures and maintained contracts had moved to supported owners. Historical paths and commands in that snapshot are evidence, not current operational interfaces.
