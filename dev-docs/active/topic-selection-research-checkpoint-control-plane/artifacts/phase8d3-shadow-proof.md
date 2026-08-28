# Phase 8D-3 影子验证（人读版）

> 状态：可执行冻结夹具通过；保持 shadow-only，等待研究者审阅。本文不是激活决定，也不写入 checkpoint、HumanConfirmedDecision、AcceptedRisk、promotion 或 bridge 权威。

## 结论

- DP-1、DP-2 的优势顺序均保持：被支配候选没有获得高于替代候选的处置。
- PV-1 的近似先验工作冲突只在加入指定 2026 nearest-work evidence delta 后由 topic killer 触发；缺少该证据时不会制造对应 drop。
- AF-1 保留为 `inspect`，不把连贯但中等价值的当前链路伪装成“应继续”或“应停止”的绝对标签。
- 一次 retry 必须绑定变化后的 InputSnapshot，并且 delta ref 必须出现在新快照；第三次尝试被拒绝。
- 当前建议：**暂不激活**。Phase 9 前仍需研究者审阅具体证据、drop 理由、重开条件和 AF-1。

## 冻结案例

| 案例 | 输入关系 | 结果 | 判定 |
|---|---|---|---|
| AF-1 | gate `promotion_gate_check_39bfb045-47d2-4e67-b6b4-f9a125aa88be` / snapshot `64ede7615c3c31ebaa7a5b9dfd558d2f7cbccd7700bd024b2e0b86b428cea36c` | scout/killer 不形成安全共识 | `inspect`，保留人工判断 |
| DP-1 | `topic_question_contract_9a1aaa47-6931-4eb6-83e1-08be9e8d6d56` → `topic_question_contract_fd208913-dde6-466b-a311-808d66c4ad02` | `dropped` → `selected` | 通过 |
| DP-2 | parameter-only negative title card `title_card_fd55f127-1748-49f4-9340-654c37cc2650` → mechanism-level positive title card `title_card_6f4b268d-ba00-450d-a6be-ac083a32623f` | `dropped` → `selected` | 通过 |
| PV-1 | 不含 nearest work → 加入 evidence delta `0c948144-88f4-4afa-b116-c0d908ff16d5` | killer `parked` → coded `dropped` | 通过 |

## 证据独立性与重放

- 每次 attempt 恰有 opportunity scout 和 prior-art/topic killer 两条 `first_pass` execution。
- 两条 execution 使用不同 EvidencePacket hash；exposure 仅含自己的 EvidencePacket，`prior_role_hashes=[]`。
- proof evaluator 重新计算每份角色输出的 canonical SHA-256，并与持久化 output artifact hash 对比。
- 同一 proof input 重算得到相同 `technical_trace_hash`。
- runner → 两份 output artifact → 两条 execution → transcript → proof evaluator 的组合测试通过。

## 成本与避免的工作

- 冻结矩阵共 7 次 attempt、14 次非 provider 角色调用、14 次检索运行、14 条检索命中、280 个模型可见摘录字符、fixture 记录耗时 70 ms。
- provider 调用：0；live authority 写入：0。
- 两个 `none_viable` 对照按 gap 后的研究问题、价值、选题包、晋级四个主要阶段估算，可避免 8 个下游阶段。该数字是透明的流程估算，不是实测节省。

## 限制与下一次人工判断

- 当前矩阵验证的是决策过程性质，不是“题目绝对值得研究”的标签准确率。
- fixture 的 token、延迟和 work-avoided 不是生产实测；override convergence 需要 shadow/advisory 使用中持续积累。
- 多 provider 校准仍归 T-129，不属于本阶段。
- 请研究者重点判断：drop 的证据与重开条件是否足够、DP/PV 是否代表真实高价值错误模式、AF-1 的暂存是否符合直觉，以及这些结果是否足以进入 Phase 9 集成设计。

## 可执行证据

- `apps/backend/src/services/topic-selection-research-arena-shadow-proof-service.unit.test.ts`
- `apps/backend/src/services/topic-selection-research-arena-shadow-runner-service.unit.test.ts`
- `apps/backend/src/services/topic-selection-research-arena-service.unit.test.ts`

