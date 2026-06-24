# 03 Implementation Notes

> 进度 SoT 之一（与 00 `## Status` 配合）。工作项矩阵 + 决策留痕 + 台账。开工后逐相追加实施条。

## 工作项矩阵
| 工作项 | Phase | 类别 | 状态 | 备注 |
|---|---|---|---|---|
| W-01 建包治理收口 | 0 | closeable | 进行中 | git mv 重命名 + .ai-task.yaml + registry + sync/lint + 回填 T-127 stale 状态行 + T-088 D-T128-00 JD 开篇 |
| W-02 撰写状态台账 | 0 | closeable | planned | 遍历 registry prompt-template-ids，标现状/version/hash/门控 |
| W-03 孤儿开口认领 | 0 | closeable | planned | N6 可达性 / v1c-N2 / P-01 confirm 半边 纳 ledger + JD 占位 |
| W-04 v1a 表面 prompt | 1 | closeable | planned | 承 T-128 W-P1 |
| W-05 v1b 非-debate 槽位 prompt | 1 | closeable | planned | 承 W-P2；含 N6 loopback-triage 阈值 advisory 注入正文 |
| W-06 v1c 表面 prompt | 1 | closeable | planned | 承 W-P3 |
| W-07 资源采样 prompt | 1 | closeable | planned | 承 W-P4 |
| W-08 live-surface 分类 | 2 | closeable | planned | T-089 切片；对齐 SSOT 矩阵勿 re-fork |
| W-09 产品跑使能 | 2 | closeable | planned | model_option 注册 + product 场景 + canary（扩展 real-e2e 包） |
| W-10 首次真跑 ★ | 3 | closeable | planned | 核心可达性 sign-off；N8/N6 provisional behind tripwire |
| W-11 P-01 压缩恢复 | 4 | coordination | planned | 跨 T-124/T-088 JD；gates product-robust（不阻塞 W-10）；当前最大未追踪开口 |
| W-12 N6 升级可达性 | 4 | closeable | planned | n6_gate_failure_retry_context projection + 幂等 |
| W-13 v1c-N2 **+ v1c-N4** 生产接线/收口 | 4 | closeable | **done（2026-06-25，全接 codex_assisted 真 caller）** | 用户定**全接**（非 reserved），D6=否（v1c 无 harness、只用纯 `canonicalHash` leaf，纯加法 coordinator/DI/route）。**v1c-N2**（`dc9ff27f` 协调器+单测、`40cf3e00` DI+controller+route+HTTP 测）:`TopicSelectionV1cN2BoundedDebateCoordinatorService` 循环 4 角色 codex_assisted→**穿 admit**（canary 漏的关键步）→既有 verified-runtime-draft gate 入口;路由 `POST …/promotion-decision-support/bounded-debate`。**v1c-N4**（`ce889186` S0 provenance contract、`4463dfca` S4 delegated service+5 单测、`3cba7a5c` S5 DI+operator-only route+2 HTTP 测）:delegated agent 起草、人仍授权——`human_actor` 来自**请求**（admission 再断言 `actor_type==='human'`）、promote-class 草案需 `promote_reconfirmed:true`、决定带 `delegated_decision_provenance` 标记（可审计/非冒充）;operator-only route `POST …/promotion-decisions/delegated`（默认人审 route 字节不变）。codex_assisted=operator 供输出 verbatim、无 provider、测试无需 stub。全后端 **1572/0/35**、双 tsc 0。**两 dead slot 现皆 caller-reached、admit 不再被绕过。** |
| W-14 provider_llm debate 管路预接 | 4 | closeable | planned | 类型并集放宽 + model_option_id 穿线，dormant + 守卫 |
| W-15 D5 HumanOverride + Trace | 4 | closeable | planned | 先权限边界 spec 再建写面 + Trace 抽屉 |
| W-16 sign-off 工件 schema | 4 | closeable | planned | requires_stakeholder_sign_off artifact/表；不接自动翻门 |
| W-17 N8/N6 真标定翻门 | 5 | externally-gated | deferred | 语料 + FP<5% + assessor + sign-off 就绪后 |
| W-18 语料耦合 debate 正文 | 5 | externally-gated | deferred | 承 W-P5/W-P6/W-P7；与 W-17 同期 |
| W-19 provider_llm debate 开启 | 5 | externally-gated | deferred | W-14 管路标定后 turn-on |

## 锁定决策（2026-06-24，用户）
- **D-128-1 T-128 重定范围**：复用 id，prompt-content-authoring 升格伞型包，撰写降为 Phase 1。
- **D-128-2 首次真跑纳入核心**：非 debate 路径真实 product run = 核心可达性 sign-off。
- **D-128-3 debate 管路现在预接（dormant）**：放宽类型并集，由 tripwire/标定门控开启。
- **D-128-4 宽 DoD**：Phase 0–4 工程可闭环项全闭环；Phase 5 外部尾巴唯一延期。
- **承 T-127**：D5（HumanOverride/Trace 延期）、D8（标定 record-and-defer，不翻门）、D6（harness-touch JD 协议）继承生效。

## 台账（W-02 产出，待填）
> prompt-template-id × {现状(骨架/部分/产品级), 正文位置, version 来源, hash 锚定, 标定门控?}

（W-02 开工后填）

## 节点逐环审计确认（2026-06-24，`wf_034f15eb`）
> 34 节点逐环只读审计（6 段并行 → 每 issue 对抗式验证 → 综合）：**10 确认 / 37 反驳**。结论：**全链节点级 functional + 生产可达**——v1a need-discovery 链、v1b N1–N11 链、v1c promotion 链 + paper-project bridge 皆有真生产 caller、在 codex/mocked +（非 debate）provider_llm 下端到端跑通；**权威骨架（确定性 gate / 人审面 / bridge）完整可达；无 blocker**。

**确认 T-128 清单（节点级核实）：** 非-debate 单 agent 生产 prompt「结构完整但偏薄」、真正 skeleton 是 N8 4-角色 bounded debate 正文 + N7 n8-debate-admission 槽（皆 W-18/Phase-1 已含）；v1c-N2 无生产 caller（确认）；N6 升级可达性 detector 工作、retry-context 硬化是开放尾巴（确认）；STEP-7 compression-facts N6/N8 传 null（确认）；P-01 压缩恢复 fail-closed（确认，最大开口）；N8 provisional/tripwire（确认，故 skeleton 无生产 blast radius）。

**审计新增/细化（已并入工作项）：**
- **v1c-N4 delegated-promotion 同为 dead code（NEW，原清单只列 v1c-N2）**：`...v1c-n4-delegated-promotion-decision-runtime-service.ts:184` + admission 全仓零非测试 caller，`app.ts` 只构造 `HumanPromotionDecisionService`、`recordHumanPromotionDecision` 不穿 delegated candidate，仅 canary inline `orchestrator.invokeStructuredOutput` 自证 → **并入 W-13**（与 v1c-N2 同：接 caller vs 文档化 reserved）。
- **need-discovery debate fail-closed 且无延期注释/测试**：`need-discovery-debate-loop-service.ts:518-577` 的 `runtimeTokenBudgetInput` 从不设 `compression_attempt`，explorer profile 继承 `compression_mode='required_when_over_budget'` → 超预算即 block（gate-service:148-150 `requires_compression`）。与 N6/N8 同根（STEP-7/P-01）**但缺 N6/N8 那样的 deferral 注释 + 负例测试** → **W-11/W-12 区域补注释 + 测试**（即便完整压缩恢复延期）。
- **DOC-vs-CODE 矛盾（NEW）**：binding 矩阵 `dev-docs/active/topic-selection-llm-context-cache-runtime/06-node-scope-matrix.md` 的 v1c-N4 行称「implemented L1–L5…v1c harness 与 Prisma smoke 用此路径；无 provider-canary-only 路径残留」**与代码相悖**（N4 runtime 零非测试 caller）。该行应降级为与 N2 行同样诚实的「defensive guard / 无生产 caller」措辞。**注：该文件属并行 session（T-112 cache-runtime），本包不直接改 → W-08 live-surface 对齐时与该 owner 协调 reconcile**。
- **N5 framing 校正**：N5 slice-selection 非硬人审 gate，是**产品默认 delegated/可选人审**面（`human_review_required=no`、`human_delegated_allowed=yes`、executor_kind=delegated；`slice-human-selection-service.ts:64-72` codex_assisted 与人审经同一 invokeNode seam 并存）。文档用词以此为准。
- **steering 面偏薄（细化）**：v1c promotion-support 生产 prompt（gate-service:618-633）+ schema 无 per-field description，薄 prompt 是唯一自然语言引导 → W-06 撰写时一并补 schema 描述/引导。

## 实施留痕（逐相追加）
（W-01 进行中：见本轮建包 commit）

### W-13 — v1c-N2 + v1c-N4 dead-slot 真 caller 接线（2026-06-25，全接）
设计 study `wf_c2753144` 定 **D6=否**（v1c 无 run-coordinator/harness;N2/N4 runtime/admission 不调 `invokeNode`、只引 W-12 析出的纯 `canonicalHash` leaf;改动纯加法 coordinator/DI/route + 一个 N4 contract 可选字段）。**codex_assisted 真相**:`response_source='operator_supplied'` 时 orchestrator 把 operator 供的角色输出 **verbatim** 返回（不调 provider）、`run_mode='acceptance'`;canary 的 bug 是**绕过 `admission.admit()`**（schema_version pin + 所有深检查只在 admit 内），真 caller 必须穿 admit。
- **v1c-N2**（S1 `dc9ff27f` / S2+S3 `40cf3e00`）:`TopicSelectionV1cN2BoundedDebateCoordinatorService`(在 gate 之上、不给 gate 加 control-plane 依赖)循环 4 角色 `generateRoleArtifact`(codex_assisted)→**admit**→既有 `createPromotionDecisionSupportFromVerifiedRuntimeDraft` gate 入口;默认确定性 registry 与 gate 校验匹配(单测证)。4 单测(happy 持久化 + schema_version/forbidden-authority/missing-output 负例证 admit 被穿)+ HTTP 测(422 证 admit 经 HTTP 触达)。
- **v1c-N4**（S0 `ce889186` / S4 `4463dfca` / S5 `3cba7a5c`）:delegated agent 起草促进**决定**内容、人仍授权。**权威边界构造性保证**:`human_actor` 来自请求(非 agent)、admission 再断言 `actor_type==='human'`、禁 authority-write keys;**promote-class 草案**(能在人授权后驱动真实 PaperProjectBridge)须 `promote_reconfirmed:true`(用户锁的安全门);决定带 **`delegated_decision_provenance`**({source:'codex_delegated',admission_identity_hash},S0 contract + 经 `recordHumanPromotionDecision` 穿线)使其可审计、不与纯人审混淆。operator-only route(默认人审 route 字节不变)。5 单测(非人 actor fail-fast/park happy 带标记/promote 无 reconfirm→409/promote 有 reconfirm→记/admit blocker)+ 2 HTTP 测(非人边界 + runtime+admission 触达)。
- **验证**:双 tsc 0、标定与 v1c 套件绿、full backend **1572/0/35**、replay 不受影响(纯加法)。**节点审计的 v1c-N2/N4 dead-slot 项 → 收口**。
- **遗留(归 W-08)**:并行 T-112 所有的 `06-node-scope-matrix.md` v1c-N4 行仍高估为 production-wired,实地核对后 reconcile(本包不直接改并行 session 文件)。
