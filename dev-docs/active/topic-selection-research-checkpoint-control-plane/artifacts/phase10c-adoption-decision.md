# Phase 10C — Research Arena 采用决策

日期：2026-08-31

研究者决策：**`remain_advisory`（保持建议模式）**

## 这项决策意味着什么

- Research Arena 继续保持 `support_only=true`，其输出可以帮助研究者审阅，但不能选择、阻止或推进题目。
- HumanConfirmNeed 仍是 gap 阶段唯一的研究决定权；没有 Arena advice 时，现有人工路径仍然可用。
- 不启用强制 Arena advice 的 gap policy，不进入 Phase 10D，也不改变任何现行 checkpoint、candidate、promotion 或 bridge authority。
- `remain_advisory` 不是延迟生效的 `activate`。未来若要激活，必须先出现明确的新证据或协议变化，经过至多一个单独审阅的 delta-bearing 校准批次，并重新取得研究者采用决策。

## 决策读取的证据

### Phase 10A：现有结果不足以判断采用

- 规范报告：`offline_eval_run_d64bd0c4-8074-4474-bf41-d9c6ef51bfe1`
- 技术追踪哈希：`143a4639c8b8c0ba964d109226a5f3b9715ba3620e72ad9a54e5afc26cf8847f`
- 当前报告建议：`insufficient_evidence`
- product-v2 成员：0；严格人工标签：0；coverage gap：12；规范报告 hard blocker：0。
- 仅有的历史 v1 案例证明 EvidencePacket grounding 与 replay integrity 各 1/1；它不能证明认知独立、人工一致性、成本记录或避免下游工作的效果。

### Phase 10B：不能合法组成第一个新校准样本

- 1,183 条 TitleCard 中，703 条只通过结构性 map-plus-candidate 预筛。
- 只有五张现行 EvidenceMap 含非手工 locator；其中四张共 17 条 EvidenceUnit 全部解析失败。
- 唯一 11/11 可解析的 map 属于已耗尽一次 retry 的 Arena 链路，并且没有现行待决 gap checkpoint。
- v2 recipe 所需的初始 NeedCandidate-targeted exact-source InputSnapshot 也尚不能通过规范 HTTP 操作面创建。
- Phase 10B 因此在 protocol freeze 和首个案例注册前停止，新增案例、session、角色调用、人工标签及供应商调用均为 0。

## 为什么不是 `activate` 或 `retire`

`activate` 不满足预先声明的门槛：没有 dominance pair、没有相关或无关 evidence perturbation、没有 product-v2 独立执行、没有严格人工覆盖，也没有任何实际决策改善或可测量的下游工作避免。把技术正确性或历史回放能力当成采用证据，会在结果出现后降低门槛。

`retire` 同样证据不足：现有实现已经证明 support-only 边界、证据 grounding、回放、风险携带和人工 override 合同能够工作；当前失败来自校准语料与操作准备不足，不是已经确认机制有害或无用。

因此 `remain_advisory` 是唯一与现有证据相符的决定：保留可用的建议能力，同时拒绝未经证明的强制执行。

## 权威与下一步

研究者在收到“接受 Phase 10B 决定性停止并在 Phase 10C 选择 `remain_advisory`”这一明确建议后回复“批准10c”。本检查点据此记录 `remain_advisory`，不把批准解释为 `activate`、供应商调用或任何产品写入授权。

Phase 10D 已跳过。下一步是单独审阅 Phase 10E 的负向收尾：按事实收窄任务结论、保持 Arena advisory、保留 A9-A13 未证实部分，并决定哪些遗留问题应进入独立后续任务；不能制造正向验收结果。
