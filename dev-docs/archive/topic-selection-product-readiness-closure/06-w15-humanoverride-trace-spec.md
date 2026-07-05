# 06 · W-15 HumanOverride + Trace 抽屉 — 产品 Spec（v1.0,已锁定）

> 状态:**已锁定**(2026-07-03,用户按推荐批准 D1–D5)。承 T-127 D5 延期项;实施切片 S1–S4 见文末。
> 进度:**W-15 全部落地(2026-07-05)** — S1+S2(0c6a0ce0+复审修复 4362648a)、S3(45fc3036,workbench run 标签三面)、S4(第二次产品跑 `t128-w15-s4-signoff-1783213389279`,§6 验收口径全满足,证据见 T-128 `04` 07-05 S4 段)。
> 复审修正(2026-07-05):D1 的锚点/触发键语义按对抗复审结论修正(见 §3 D1「复审修正」段);
> S1 路由路径笔误更正为 `workflow-runs/:workflowRunId`。
> 原则约束:确定性 gate = 权威脊柱,LLM 产物 = 非权威草稿,人经由既定写面行动。本 spec 的
> "Override" **不是**推翻 gate 结论(硬 NO),而是两类合法动作的审计化产品表面。

## 1. 定位

- **A 类:政策性放行的记录。** 产品级政策(非 harness)要求人签才能继续之处,把"签"变成一等操作。
  v1 唯一实例:N8/N6 provisional 阈值 tripwire——gate 契约原文 "sign-off record IS the
  production-gated override entry"。记录载体已由 W-16 定义:`TopicSelectionStakeholderSignOff@v1`
  的 `provisional_threshold_run_override` scope(run/node/attempt 锚定 + human 签署人 + rationale)。
- **B 类:既有合法旋钮的审计化。** 本就存在、目前以裸参数逐次传入且无留痕的操作员参数。
  v1 唯一实例:`loopback_budget_per_node`(coordinator 默认 2;升级 stranded 的 halt 消息本身
  就在教操作员调它)。

## 2. Override 目录(v1,D5 已锁)

| # | 动作 | 机制 | 新建面 |
|---|---|---|---|
| O-1 | Provisional 逐跑签核(N8/N6) | 记录 W-16 run-override sign-off(schema 校验后存控制面工件通道) | 后端签核路由 + workbench 写卡(出现在带 tripwire warning 的 product 跑上) |
| O-2 | Loopback 预算提额 | 按 (run, node) 记录带 rationale 的提额工件;coordinator 取生效值 = max(调用参数, 有效提额记录),**硬上限 5** | 小载荷契约 + 写卡;`loopback_budget_exhausted` halt 消息指向卡片 |
| Trace | 只读 trace 抽屉 | 按 node attempt 展示 trace 工件:元数据/哈希/blockers/warnings/refs 直接展示;redacted 消息体二次点击展开;**永不展示未脱敏原文** | workbench 只读抽屉(读取走既有控制面工件读端点,缺则补只读 GET) |

O-3(Halt 解决台:7 种 halt 与其既定解决通道的聚合操作卡)**列 v2**——体量偏大且与 T-115
human-review 路径部分重叠。

## 3. 已锁定决策

- **D1 = (c) coordinator 政策 halt。** advance 在**越过** N8/N6 前,检查该节点**最新带 tripwire
  warning 的 attempt**(投影字段 `latest_provisional_tripwire`)是否存在匹配的 run-override
  sign-off 工件;缺失 → halt `sign_off_required`(新 halt reason,联合类型在 coordinator
  本地——非 shared、非 harness,按 D-T128-00 无需 JD),halt 消息内联签核路径。签核后 advance 继续。
  - 语义细节:检查点在"**下一步** invoke 之前"(N8 带警 admit 后,推进 N9 前;N6 同理推进 N7 前),
    不改 N8/N6 节点本身的 admit 行为——harness 零触碰,warning 仍非阻断,tripwire 语义原样。
  - **复审修正(2026-07-05,对抗复审 A-DEFECT)**,两处替换初稿语义:
    1. **锚点不是 latest_admitted。** harness 的 N8 tripwire 落在 admitted attempt 上,但 N6
       tripwire 只落在**升级 LOOPBACK attempt** 上(post-debate 重入 admit 是干净的)。按
       admitted 锚定会让 N6 臂成死代码且签核永远 409。签核锚 = `latest_provisional_tripwire`
       (N8 → admitted attempt;N6 → loopback attempt;后续干净 admit 不清除)。
    2. **触发键 = tripwire 存在性,不是本次调用的 `run_mode`。** harness 只在 product 跑上
       发射这两个 warning,acceptance/test 由构造即无摩擦;若按 run_mode 键控,后续 advance
       省略 run_mode 即可绕过 gate。存在性键控把这个旁路焊死。
  - **明示的流程代价**:W-17 标定完成前,每次 product 跑过 N8 都会停一次等签——这正是 D8
    tripwire 的本意;acceptance/test 模式完全不受影响(run9 型验收跑无摩擦)。
- **D2:O-2 生效边界。** 按 (workflow_run_id, node_id) 记录、仅对该 run 生效、`raised_to ≤ 5`
  硬上限(schema `maximum`)、必填 rationale + human 签署人;coordinator 读最近一条有效记录。
  - **实施注(2026-07-05)**:生效值实际取 **max(调用参数, 全体有效记录最大值)** 而非"最近一条"——
    后录较低值不降低已生效预算(单调不降,复审轮单测 pin:4 后录 3 生效仍 4)。
- **D3:Trace 披露深度。** v1 直接展示:node_attempt 元数据、replay 身份、全部哈希、
  blockers/warnings、source/authority/handoff refs;redacted prompt 消息体二次点击展开
  (仍是既有 redaction 管道的产物);未脱敏原文不存在于 trace,亦不新增任何取回路径。
- **D4:RBAC 姿态。** 沿 v1c N4 先例:distinct endpoint + `human_actor` 来自请求 +
  provenance/工件留痕,**无 RBAC**——文档如实声明,硬鉴权列为已知 follow-up(与 v1c N4 同一
  follow-up 池)。
- **D5:v1 范围。** O-1 + O-2 + Trace 抽屉;O-3 → v2。

## 4. 硬边界(不论任何切片)

不可覆写:gate 结论、authority 记录、route edges、`provisional` 标志、阈值数值、replay 身份。
不新增第二写入路径(签核/提额均走控制面工件通道,分别以 W-16 schema / O-2 小契约校验)。
`fixture_replay` 维持非 product。所有写动作必须携带 human actor + rationale 并留工件痕。
harness / orchestrator / bounded-debate-core / 共享压缩 orchestrator **零触碰**;若实施中发现
必须触碰,先回 T-088 `06-joint-decisions.md` 按 D-T128-00 登记再动。

## 5. 实施切片(S1–S4)

- **S1 后端 O-1 + D1(c)**:签核记录路由 `POST /topic-selection/v1b/workflow-runs/:workflowRunId/sign-offs`
  (体校验 = W-16 schema 的 run-override 分支 + run/node/attempt 与真实 attempt 匹配校验)→
  存控制面工件;coordinator 政策检查 + `sign_off_required` halt;单测(product-only 触发 /
  签核解锁 / acceptance-test 不受影响 / 无警 attempt 不受影响 / N6 与 N8 两路)。
- **S2 后端 O-2**:提额工件小契约(`raised_to ≤ 5`、rationale、human actor、run/node 锚)+
  路由 + coordinator 生效值读取(max(参数, 记录), 仍受硬上限)+ 单测(提额生效 / 超限拒 /
  跨 run 不串 / halt 消息指卡)。
- **S3 桌面**:workbench 两张写卡(签核卡挂 tripwire warning 的 run;提额卡挂
  `loopback_budget_exhausted` halt)+ Trace 只读抽屉;`data-ui` token 路径,Tailwind 限
  B1-layout-only。
- **S4 收口**:03/04 台账与验证证据;下一次真实产品跑顺带验证 D1(c) 的真实摩擦形态
  (预期:N8 后停一次 → workbench 一键签 → 续跑)。

## 6. 验收口径

S1/S2:coordinator + 路由单测全绿,full backend 零回归,harness goldens 原样(零触碰的构造性
证明);S3:两卡 + 抽屉在真实 run 数据上可用,无未脱敏泄漏;S4:第二次产品跑证据含
`sign_off_required` halt → 签核 → 续跑的完整链。
