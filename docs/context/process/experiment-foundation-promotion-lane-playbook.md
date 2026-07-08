# Experiment-Foundation Promotion Lane Playbook

## Purpose & Ownership
- 本文件是**文献 → experiment-foundation canonical 资产**晋升 lane 的执行手册(SSOT):步骤、每步产物、证据边界、hash/档位约定。由 T-131 从第一条真实 lane(LIT-0204 RAGPerf evaluation-protocol,2026-07-08 promoted)固化;T-118 F3 矩阵的其余候选按需复用。
- 晋升机制的契约权威 = `packages/shared/src/research-lifecycle/experiment-foundation-contracts.ts`(candidate/gate/triage/promotion request/result schema);服务权威 = `ExperimentFoundationService`(Ajv 校验 + `assertPromotionGate` + canonical refs 存在性 + candidate_hash 漂移守卫)。
- **策略:需求拉动,不做批量晋升**——registry 里每条 canonical 资产都是维护负债(漂移面/政策复审面);仅当下游(PaperImplementation 选定研究论点)真需要某资产族时推进对应 lane。

## Lane 步骤(7 步)
| # | 步骤 | 产物/证据 | 要点 |
|---|---|---|---|
| 1 | S0 静态协议检查 | 可达性清单(repo HEAD pin/LICENSE/入口/配置) | HEAD 用 `git ls-remote` 钉;本地路径类配置标注须改写 |
| 2 | S1 冒烟(adapter 档起步) | 工件 JSON:补丁清单/偏差/env pins/结果/blockers_remaining | 一次性工作区在 repo 外;工件不入原始数据;独立复现加分 |
| 3 | payload 回填与门对账 | 候选 payload 文档:缺字段列收敛 + gate blockers 分活跃/已解除 | 档位必须显式标注(adapter ≠ faithful) |
| 4 | duplicate check 实测 | registry 全查记录(计数/命中/判定) | 机械项,写进 duplicate_check.rationale |
| 5 | protocol_hash + 协议定义工件 | `<lane>-protocol-definition.json` + 档位化 hash | 脚本 `.ai/scripts/experiment-foundation-protocol-hash.mjs`:canonical-JSON sha256 哈希**协议定义**(非 repo tree);cpu_adapter 档拼补丁摘要 |
| 6 | registry 记录化 | canonical 前置记录(data_policy/metric_definition/协议本体)→ candidate(六门内嵌)→ triage report | 走 `service.createRecord`(真实 schema 校验),不直插表;payload hash 约定=去自身 hash 字段后 canonical-JSON sha256 |
| 7 | 晋升裁决执行 | promotion request(manual_promote,reviewer 留痕)+ result(promoted,四组 canonical refs 全非空) | `service.decidePromotion`;promoted 要求全部 canonical refs 已存在且非候选记录 |

参考实现:`dev-docs/active/experiment-foundation-first-promotion-closure/tools/lit-0204-evaluation-protocol-promotion-runner.mjs`(含 `--verify-only`/`--negative` 模式)。

## 约定(第一条 lane 落定,2026-07-08)
- **档位(tier)**:`cpu_adapter` 与 `faithful` 是不同协议版本(protocol_version 后缀 + hash 分档)。adapter 档证据**不得**冒充 faithful 档能力;faithful 化 = 新 protocol_version + 新 hash,非覆写。
- **前向引用**:必填 ref 字段指向尚未晋升的资产时(如 evaluation_protocol.benchmark_asset_id),允许前向 id + label 留痕,**不得**为满足字段绕过裁决先建资产;解引用风险由消费时验证承接。
- **消费时验证(闭环 D 段,defer)**:第一个真实 RunRecipe 锁定 canonical 资产时做 consumption smoke——ref 解析、protocol_hash 校验、tier 字段消费、上游(repo HEAD)可达性/漂移复核。漂移复核定为**消费时**而非周期巡检。
- **六道门在 manual_promote 下的角色**:非硬闸而是逐项过目清单——可带已知缺口做有记录的例外裁决,前提是 request/candidate 如实携带各门状态(auto_promote 才跑 deterministic eligibility)。
- **负例守卫(实测在案)**:重放晋升被 `candidate_hash is stale`(GATE_CONSTRAINT_FAILED)拒——服务比对 request.candidate_hash 与 candidate 当前 hash;重复记录被 VERSION_CONFLICT 拒。

## Registry 现状锚(2026-07-08)
- 第一条真实资产链:RAGPerf 23 记录(candidate promoted;canonical = evaluation_protocol ×1 + metric_definition ×17 + data_policy ×1;promotion request/result ×2;triage ×1)。此前 registry 仅有能力验证场景记录。
- T-118 F3 其余候选:benchmark 候选 manual_review_required(等 faithful 环境+dataset payloads);dataset 两候选 needs_info(政策/获取);另 8 篇文献候选按需拉动。

## Change Log
- 2026-07-08(T-131):创建;LIT-0204 evaluation-protocol lane 全链穿越后固化。
