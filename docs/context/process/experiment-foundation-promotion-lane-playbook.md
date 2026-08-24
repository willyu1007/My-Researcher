# Experiment-Foundation Promotion Lane Playbook

## Purpose & Ownership
- 本文件是**文献 → experiment-foundation canonical 资产**晋升 lane 的执行手册(SSOT):步骤、每步产物、证据边界、hash/档位约定。由 T-131 从第一条真实 lane(LIT-0204 RAGPerf evaluation-protocol,2026-07-08 promoted)固化;T-118 F3 矩阵的其余候选按需复用。
- 晋升机制的契约权威 = `packages/shared/src/research-lifecycle/experiment-foundation-contracts.ts`(candidate/gate/triage/promotion request/result schema);服务权威 = `ExperimentFoundationService`(Ajv 校验 + `assertPromotionGate` + canonical refs 存在性 + candidate_hash 漂移守卫)。
- `promoted` 只回答资产是否可作为 canonical catalog 记录被检索、引用和继续治理；它**不等于**协议已经可执行、结果已经 protocol-compliant，或该协议可以产生 EvidenceCandidate。科学执行资格由 D-17 的不可豁免 runtime readiness/validator capability gate 单独裁决。
- **策略:需求拉动,不做批量晋升**——registry 里每条 canonical 资产都是维护负债(漂移面/政策复审面);仅当下游(PaperImplementation 选定研究论点)真需要某资产族时推进对应 lane。

## Lane 步骤(7 步)
| # | 步骤 | 产物/证据 | 要点 |
|---|---|---|---|
| 1 | S0 静态协议检查 | 可达性清单(repo HEAD pin/LICENSE/入口/配置) | HEAD 用 `git ls-remote` 钉;本地路径类配置标注须改写 |
| 2 | S1 冒烟(adapter 档起步) | 工件 JSON:补丁清单/偏差/env pins/结果/blockers_remaining | 一次性工作区在 repo 外;工件不入原始数据;独立复现加分 |
| 3 | payload 回填与门对账 | 候选 payload 文档:缺字段列收敛 + gate blockers 分活跃/已解除 | 档位必须显式标注(adapter ≠ faithful) |
| 4 | duplicate check 实测 | registry 全查记录(计数/命中/判定) | 机械项,写进 duplicate_check.rationale |
| 5 | protocol_hash + 协议定义工件 | `<lane>-protocol-definition.json` + 档位化 hash | canonical-JSON sha256 哈希**协议定义**（非 repo tree）；`cpu_adapter` 档拼入补丁摘要 |
| 6 | registry 记录化 | canonical 前置记录(data_policy/metric_definition/协议本体)→ candidate(六门内嵌)→ triage report | 走 `service.createRecord`(真实 schema 校验),不直插表;payload hash 约定=去自身 hash 字段后 canonical-JSON sha256 |
| 7 | 晋升裁决执行 | promotion request(manual_promote,reviewer 留痕)+ result(promoted,四组 canonical refs 全非空) | `service.decidePromotion`;promoted 要求全部 canonical refs 已存在且非候选记录 |

历史验证由 T-131 完成；该一次性 runner 不再作为维护中的操作入口。

## 约定(第一条 lane 落定,2026-07-08)
- **档位(tier)**:`cpu_adapter` 与 `faithful` 是不同协议版本(protocol_version 后缀 + hash 分档)。adapter 档证据**不得**冒充 faithful 档能力;faithful 化 = 新 protocol_version + 新 hash,非覆写。
- **前向引用**:必填 ref 字段指向尚未晋升的资产时(如 evaluation_protocol.benchmark_asset_id),允许前向 id + label 留痕,**不得**为满足字段绕过裁决先建资产;解引用风险由消费时验证承接。
- **消费时验证(闭环 D 段,D-17 收敛)**:在 Run freeze、`RunManifestFrozen`、head advancement 和任何真实 Attempt 创建之前，runtime readiness MUST 对 exact protocol ref/version/hash 做一次确定性编译：解析全部依赖 ref，复算 canonical revision/content hash，校验 tier 与上游 pin，并将规范排序后的 typed `required_rules` 逐条解析到 exact validator `type + version` handler。任一 ref 未解析、hash/tier 漂移、legacy free-shape 无法编译或 required rule 无 exact handler，均 MUST 阻断；unsupported required rule 使用稳定 `UNSUPPORTED_RULE`，不得 best-effort、静默忽略、LLM 解释或人工豁免。通过结果连同 validator profile/version/hash 冻结进 readiness snapshot/hash；漂移复核仍在消费时触发，不改为周期巡检。
- **六道门在 manual_promote 下的角色**:T-131 v1 的 2026-07-08 历史裁决按当时语义将六道门作为逐项过目清单并记录已知缺口，该记录保持不变。前向产品契约按 D-04 收敛为 manual promotion 只裁决已经满足 deterministic catalog eligibility 的 Candidate，不能豁免 blocker。无论历史或前向语义，promotion 都 MUST NOT 覆盖 runtime readiness、放行 Run/head/Attempt，或授予 EvidenceCandidate 资格。
- **负例守卫(实测在案)**:重放晋升被 `candidate_hash is stale`(GATE_CONSTRAINT_FAILED)拒——服务比对 request.candidate_hash 与 candidate 当前 hash;重复记录被 VERSION_CONFLICT 拒。

## D-17 catalog → executable 边界

### RAGPerf v1 的保留语义

- `evaluation_protocol_lit_0204_ragperf@v1-cpu-adapter` 及其既有 candidate/promotion/metric/policy 记录保持 immutable `promoted` 历史；不得回写 payload/hash，也不得把历史裁决改记为失败。
- v1 的 seed/repeat/comparison/statistical/fairness 等仍是 free-shape 描述，且 `benchmark_asset_id` 是未完成晋升的前向引用。因此 v1 只能用于 catalog 检索、来源追踪和后续 v2 起草，runtime readiness 必须把它判为 non-executable。
- v1 可以在 catalog/preflight 中被读取并显示 blocker，但不得通过 runtime readiness，不得到达 Run freeze、`RunManifestFrozen`、head advancement 或真实 Attempt，也不得生成 protocol-compliant passed validation report/EvidenceCandidate。既有 S1 adapter smoke 只证明上游观察与 catalog promotion 证据，不证明 D-17 科学验证能力。

### Typed v2 的唯一升级路径

1. 需求方从 v1 的 source refs/observations 起草一条新的 typed v2 protocol；不得原地改写 v1。
2. v2 MUST 使用新的 versioned `evaluation_protocol_id`、新的 `protocol_version` 和覆盖完整 canonical payload、normalized typed rules 与 dependency refs 的新 server-canonical revision/content hash；若继续暴露 `protocol_hash`，它只能从同一 canonical payload/profile 派生，不能成为调用方提供的第二 hash authority。当前 registry 以 `evaluation_protocol_id` 作为 canonical record identity，因此只改 `protocol_version` 不能形成第二条记录。
3. v2 MUST 重新走 candidate → triage → promotion 链；可复用的 metric/policy 记录只有在其 exact refs 与 D-17 typed contract 相容时才能继续引用。
4. runtime readiness MUST 确认 benchmark 等全部前向依赖已经解析为可消费 canonical 资产，并确认每条 required rule 有 exact validator handler。首个支持切片只执行 `metric_contract@v1` 与 `artifact_contract@v1`；exact cell/seed/repeat/params/result lineage/real-provider 属于不可配置 envelope invariants。主动声明的 comparison/statistical/threshold/fairness/derived/custom-evaluator rule 在未实现时一律 `UNSUPPORTED_RULE`。catalog promotion 即使成功，也不能替代该检查。
5. 只有 readiness 通过并冻结 exact protocol/validator snapshot 后，v2 才可进入 RunRecipe；完整 immutable batch Run 的 validation 整体通过后，才有资格产生 EvidenceCandidate。

## Registry 现状锚(2026-07-08)
- 第一条真实资产链:RAGPerf 23 记录(candidate promoted;canonical = evaluation_protocol ×1 + metric_definition ×17 + data_policy ×1;promotion request/result ×2;triage ×1)。此前 registry 仅有能力验证场景记录。
- T-118 F3 其余候选:benchmark 候选 manual_review_required(等 faithful 环境+dataset payloads);dataset 两候选 needs_info(政策/获取);另 8 篇文献候选按需拉动。

## Change Log
- 2026-07-12(D-17):区分 catalog promotion 与 scientific-execution readiness；保留 RAGPerf v1 promoted 历史但标为 catalog-only/non-executable，冻结 typed v2/new versioned id + non-waivable readiness 升级路径。
- 2026-07-08(T-131):创建;LIT-0204 evaluation-protocol lane 全链穿越后固化。
