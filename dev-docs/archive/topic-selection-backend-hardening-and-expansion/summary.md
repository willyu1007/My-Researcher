# topic-selection-backend-hardening-and-expansion

## Outcome

- 把选题管理后端从"产品可 run（T-123 已达成）"推进到"**产品可信赖**"：消除未落地的工作树残留与编排层故障恢复缺口、补齐准入层单测、明确 provisional 产品门禁语义（**夯实后端**）。
- 在稳固底座上**先把 12.9k 行 harness 一次拆透（选项 A）**——纯机械重构、行为/哈希不变,使本次与后续开发都落在清晰可维护的模块结构里,避免在巨石上堆料。
- 在干净 harness 上做**能力扩展（选项 B）**:实装 v1b N6 有界对抗 debate 的**完整运行时**（full runtime,触发→真跑→准入→继续）、v1c 反馈触发 recheck 的**建议性发射**（不破坏 T-108 前向唯一）、provider-diverse debate 角色 profile（加法）。
- 完成**工作台产品化收口（选项 C）**:只读节点文档化、`n4_handoff_hash` 数据迁移、gate 拒绝 UX 打磨（深度督查 HumanOverride/Trace 抽屉**延期**）。
- **阈值标定（选项 D,延期尾巴）**:真实语料暂不可得,**record-and-defer**——N8 维持 provisional + 签核门,scaffold 就绪,待语料再标定。
- 每项交付配齐完备测试（单测 / 集成 / 全链 e2e / 故障注入负例 / 不变量回归 / replay byte-identity 守卫）。

The task was complete under the previous repository contract and is archived by location under the current contract.

## Project placement

- Task: `T-127`
- Feature: `F-001` — Research Lifecycle Governance Core
- Milestone: `M-001` — LLM Research Lifecycle v1
- Last old-contract update: `2026-07-05`

### Historical Requirement provenance

- `R-009` — Automated topic management decision layer baseline

The retired Requirement objects are provenance only; they were not promoted into the current Milestone/Feature graph.

## Durable verification

- The complete old verification record remains available at the recovery reference below.

## Recovery and migration note

The complete pre-conversion bundle, including detailed decisions, verification, tools, and historical artifacts, is recoverable from Git at `5cf904fb:dev-docs/archive/topic-selection-backend-hardening-and-expansion/`. During T-145 the archive was compressed only after live fixtures and maintained contracts had moved to supported owners. Historical paths and commands in that snapshot are evidence, not current operational interfaces.
