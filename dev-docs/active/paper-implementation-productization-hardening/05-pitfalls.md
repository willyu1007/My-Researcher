# 05 Pitfalls

## do-not-repeat（从 T-114 继承的护栏，本包所有 Phase 适用）
- **不开双轨入口**：任何新能力（coordinator、压缩分支、记忆注入）必须走既有 runtime route/service/admission 路径，不得出现第二条产生 runtime artifact 或绕过 admission 的入口。T-114 用 no-dual-track 必检用例钉死过一次，新代码同样要进 scan。
- **harness 不得变成第二生产者**：harness 只验证/录证。历史上多次想"顺手"让 harness 编译 prompt/选模型/修输出，全部被边界检查拦下；本包的 coordinator 同理——它是调用方不是生产者。
- **人读摘要不可作为验收制品**：promotion/closure 证据必须机器可验（TAP 解析、JSON summary、ownership scan exit code）。审计叙述只能是快照。
- **先注册必检用例再实现**：T-114 的经验是 runner 的 `required_*` 列表是防漏的唯一可靠机制；先写实现后补注册曾导致用例改名后静默脱离闭环门。
- **共享面改动不单方面合入**：orchestrator/gateway/registry 同时服务 topic-selection；改动前 JD 登记互链，topic-selection 回归确认后才算闭环（教训来源：T-114 期间 matrix 与 06-node-runtime-matrix 的文档漂移靠最终 review 才发现，跨包漂移更难发现）。
- **压缩/记忆产物不是证据**：`durable_memory_as_standalone_evidence: false`；压缩报告是 lineage 制品。任何把它们当 primary input/evidence 的设计直接拒绝。

## 历史教训（待本包推进中补充）
- （暂无；按规范在问题解决后补：symptom / root cause / tried / fix / prevention）
