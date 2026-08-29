# Phase 8D-3 独立 Agent 校准报告

## 结论

两个 `fork_turns=none` 的独立 subagent 分别只读取自己的产品 EvidencePacket，在没有 peer 输出、没有仓库上下文、没有外部检索和没有供应商调用的条件下完成了 scout 与 killer 首轮判断。

经过一次**契约失败重试**后，两位角色都建议将两条候选保持 `parked`，集合级结果为 `evidence_expansion_required`。这与前一轮同一主代理模拟角色所得的最终集合级结果一致：当前两个窄 EvidencePacket 只能确认自适应不确定性路由是成熟基线，不能建立唯一比较胜者，也不能提供证据充分的 fatal drop。

因此当前题目不继续推进，Phase 9 仍不激活。Phase 8D-3 已具备研究者 closeout 所需的独立认知样本、失败样本、提示词修复和确定性合成预期，但是否正式关闭该阶段仍由研究者确认。

## 独立边界

| 角色 | subagent | EvidencePacket | 可见 EvidenceUnit | peer 输出 |
|---|---|---|---|---:|
| opportunity scout | `/root/independent_scout` | `artifact_ref_93b5a0a3-d609-4291-9941-34a2d31255ad` / `7644ca…97d` | `evidence_unit_d80feb2f-eed0-42bf-9e2f-508194561950`（SEAKR） | 0 |
| prior-art/topic killer | `/root/independent_killer` | `artifact_ref_510616b9-738b-48fa-a64c-dcfcd935be19` / `fd08a4…8df` | `evidence_unit_9da3bf90-c49f-47f4-8f73-bf16adb83ce8`（DTR） | 0 |

两位 subagent 均以 `fork_turns=none` 启动；任务消息内只含共同的两个 canonical candidate 描述和各自独占的 EvidencePacket。没有向任何一方提供上一轮角色输出、综合结果或另一方的回答。

## 实际结果

### Scout

- 集合级建议：`evidence_expansion_required`，置信度 `0.96`
- signed-depthwise：`parked`
- post-`k=1` feedback：`parked`
- 主要判断：SEAKR 支持“内部状态不确定性可以驱动是否检索”，但没有涉及相邻深度有符号效用、`k=0/1/5` 比较、post-`k=1` 反馈或完整成本。

### Killer 首次输出：契约失败

- 集合级建议：`selected`，置信度 `0.88`
- 两条候选均被标成 `selected`
- 有效研究判断：DTR 与基于置信度的条件检索存在 material collision，但当前段落不能证明任一候选是 near-isomorphic 或具有 fatal flaw。
- 失败原因：角色把“没有被当前 prior art 杀死”误当成“值得选择”，并同时选择两个候选。旧 admission 会错误接纳该输出。

### Killer 契约重试

只向原 killer subagent反馈新的选择契约，没有提供 scout 输出：`selected` 必须是唯一比较胜者；未被证伪不等于被选中；不能从 packet 选出唯一胜者时应 `park`。

- 集合级建议：`evidence_expansion_required`，置信度 `0.93`
- signed-depthwise：`parked`
- post-`k=1` feedback：`parked`
- 主要判断：DTR 对两条候选都形成 material baseline collision，但该 packet 既不支持 fatal drop，也不支持两者之间的唯一比较选择。

## 产品修复

独立失败样本暴露并修复了两个契约错误：

1. 每个角色现在最多只能将一个 canonical candidate 标记为 `selected`；多选以 `422 GATE_CONSTRAINT_FAILED` 拒绝。
2. 当两位角色一致选择唯一候选、并一致保留其他 `parked` alternatives 时，综合器现在允许集合级 `selected`。先前的 `consensusClosed` 条件错误地要求所有未选候选必须被 drop，与“一个 active path + parked alternatives”设计冲突。

scout 与 killer 生产提示词已升级到 `v2`，明确 `selected` 是唯一比较选择，不是“未被证伪”；缺少唯一胜者时必须 park 并请求证据。测试以红→绿证明“多选拒绝”和“唯一 selected + parked alternative 可综合”为可观察行为。

## 确定性合成预期

使用最终两个独立位置：两位角色对两个候选均为 `parked`，因此确定性综合结果仍为：

- outcome：`evidence_expansion_required`
- 两个 candidate disposition：`parked`
- required next delta：`evidence`
- unresolved role dissent：空

这不表示应立即补证据。结合当前题目已经消耗的工作和“廉价停止”的产品目标，本轮研究操作保持停放；只有出现直接比较 signed-depthwise 与 post-`k=1` feedback 的新证据时才考虑重开。

## 限制与 authority

为保持产品的 at-most-one retry 约束，本次没有创建第三个 arena session，也没有把 subagent 输出写成新的 `TopicSelectionResearchArenaRoleExecution`。它是对已有精确产品 EvidencePacket 的独立认知校准，任务包保存契约字段、关键内容、首次失败摘要和完整边界；产品 session `research_arena_def21744-92fb-41cb-96f1-20798e76392a` 保持不变。

本轮供应商调用为 0；未写 checkpoint decision、accepted risk、promotion decision、bridge 或 PaperProject；Phase 9 未激活。
