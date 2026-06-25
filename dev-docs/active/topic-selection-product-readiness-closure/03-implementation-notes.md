# 03 Implementation Notes

> 进度 SoT 之一（与 00 `## Status` 配合）。工作项矩阵 + 决策留痕 + 台账。开工后逐相追加实施条。

## 工作项矩阵
| 工作项 | Phase | 类别 | 状态 | 备注 |
|---|---|---|---|---|
| W-01 建包治理收口 | 0 | closeable | **done（2026-06-25）** | git mv 重命名 ✓、.ai-task.yaml ✓、registry 注册 T-128（`query` 可见，`status:planned`）✓、`lint --check` 绿（仅 T-123/T-115 既有 acceptance-未勾 warning）✓；T-127 `00-overview` 已是 `State:done` + 含「残留移交登记 → T-128」（stale 行已不存在）✓；T-088 `D-T128-00` JD 开篇已落（line 1929）✓ |
| W-02 撰写状态台账 | 0 | closeable | **done（2026-06-25）** | 27 非-canary id 全勘定（grounding `wf_0478aceb`，8 表面簇并行 + critic）。分布 **0 产品级 / 7 骨架 / 20 部分**；**全 27 个正文皆无 per-prompt golden byte-identity 锚**（Phase 1 每项定稿须新增）；6 项标定门控→Phase 5。台账见下「W-02 产出」。3 处承重断言已人工抽验吻合。 |
| W-03 孤儿开口认领 | 0 | closeable | **done（2026-06-25）** | 3 孤儿开口正式认领：N6 升级可达性→`D-T128-01` 占位（W-12）；P-01 压缩恢复 topic-selection 半边→`D-T128-02` 占位（W-11，跨 T-124）；v1c-N2 接线 **= W-13 已 done、D6=否（无 harness）→ 核销、不开空 JD**。JD 链 D-T128-00 开篇→01/02 占位（T-088 line 1929-1943）。见下「W-03 留痕」。 |
| W-04 v1a 表面 prompt | 1 | closeable | **进行中（2026-06-25）** | 8 prompt（4 单 agent + 4 need-discovery 角色）。grounding `wf_79f66a5e`（blast-radius 测绘 + golden-anchor 策略 + keystone-first 序）。**slice A done**：arbiter-final + arbiter-issue-frame 产品化 + `arbiterMessages` 按 stage 拆分 + 2 rendered-text 锚（commit 见 W-04 留痕）。余 slice B（generate-need-candidate）/C（explorer+deep_critic 拆 roleMessages）/D（need-adjudication）/E（human-confirmation）/F（evidence-map）待续。 |
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

## 台账（W-02 产出，2026-06-25）
> prompt-template-id × {现状(骨架/部分/产品级), 正文位置, version 来源, hash 锚定, 标定门控?}
>
> 方法：grounding `wf_0478aceb`（8 表面簇并行勘定 27 非-canary id → 完整性 critic：`allCovered:true`、0 missing/dup、0 location 错配、0 标定门控分歧）。3 处承重断言主验证人工抽验吻合：N6-divergent 自带 `SKELETON … product-grade authoring is T-128` 注释（divergent-debate-runtime-service:294）、`GUARD_GOLDEN_N1` 确为 N1-only harness 哈希（workflow-harness-service.unit.test:6990）、v1c promotion-support 系统正文仅 3 句（promotion-gate-service:618-633）。

### 全局结论
- **成熟度分布：0 产品级 / 7 骨架 / 20 部分**（27 项，含 6 个标定门控）。无任何 prompt 达产品级——Phase 1 是真实工作量，非走过场。
- **version 来源（统一形态）**：全部为**内联 const**（无集中模板库；templates inline by design）。字面值：v1a/v1b 表面 = `'v1'`；resource-sampling 与**全部 v1c** = `'1'`。唯一例外：`topic-selection-promotion-decision-support` 接受 caller override，缺省回落 `'1'`。registry 只强制 **id-membership + 非空 version**，精确 pinning 延期（[registry header](apps/backend/src/services/topic-selection-llm-invocation-registry.ts:13)）。
- **hash 锚定（统一缺口，最重要发现）**：**全 27 个 prompt 正文皆无 committed golden byte-identity 锚**。现存 `GUARD_GOLDEN_N1` 仅钉 v1b-N1 harness 哈希、`OPTION_AUTHORITY_GOLDEN`（`b7f43aa3…`）钉 v1b-N1 authority，皆**非 prompt 正文**。运行期 `prompt_packet_hash`/`ln_hash` 只做**同跑自洽 / 自决定性 / admission 等式**校验（非锚定到 checked-in 字面）。n6-debate 三角色另有**仅-ID 漂移守卫**（`PROMPT_TEMPLATE_ID_BY_SLOT` single-sourced 到 scenario `role_stage_slots`），仍非正文锚。→ **Phase 1 每项定稿都须同事务新增 per-prompt golden drift 锚**（承雷区 prompt_packet_hash 漂移；任何正文定稿改 hash，否则 replay byte-identity 无守卫即漂移）。
- **标定门控（Phase 5 defer，恰 6 项，与 00-overview/包规则一致）**：`topic-selection-v1b-n6-debate-explorer/critic/arbiter`、`topic-selection.v1b.n8.topic-value-assessment.runtime-draft`、`topic-selection.v1b.n8.bounded-micro-debate.runtime-role`、`topic-selection-v1c-promotion-support-bounded-micro-debate`。其余 21 项皆 Phase 1（不被语料门控）。

### 台账表（27 行）
> 现状缩写：骨架=skeleton｜部分=partial｜产品级=product-grade。hash 锚一律 NONE（见全局结论）。门控=Y 即 Phase 5 defer。归属 W-item 按 01-plan 表面定义（W-04 v1a / W-05 v1b 非-debate / W-06 v1c / W-07 资源采样；6 门控项→W-18 Phase 5）。

| # | prompt-template-id | 节点 | 执行类型 | 现状 | 正文位置 (file:line) | version | 门控 | W-item |
|---|---|---|---|---|---|---|---|---|
| 1 | topic-selection-evidence-map-extraction | v1a N5 evidence-map | single-agent | partial | v1a-llm-runtime-binding-service:511-544 | v1 | N | W-04 |
| 2 | topic-selection-generate-need-candidate | v1a N6 single-agent | single-agent | partial | generate-need-candidate-orchestrator-adapter-service:924-974 | v1 | N | W-04 |
| 3 | topic-selection-need-adjudication | v1a N7 adjudication | single-agent | partial | v1a-llm-runtime-binding-service:573-654 | v1 | N | W-04 |
| 4 | topic-selection-human-confirmation-semantic-review | v1a N8 semantic-review | single-agent | partial | v1a-llm-runtime-binding-service:729-763 | v1 | N | W-04 |
| 5 | topic-selection-need-discovery-explorer | v1a need-discovery debate | debate-role | **skeleton** | need-discovery-debate-loop-service:302 / scenario-contracts:386-409 | v1 | N | W-04 |
| 6 | topic-selection-need-discovery-deep-critic | v1a need-discovery debate | debate-role | **skeleton** | need-discovery-debate-loop-service:348 / scenario-contracts:410-434 | v1 | N | W-04 |
| 7 | topic-selection-need-discovery-arbiter-issue-frame | v1a need-discovery debate | debate-role | partial⚠ | need-discovery-debate-loop-service:397 / scenario-contracts:435-459 | v1 | N | W-04 |
| 8 | topic-selection-need-discovery-arbiter-final | v1a need-discovery debate（**external 权威 feed**） | debate-role | partial⚠ | need-discovery-debate-loop-service:451 / scenario-contracts:460-484 | v1 | N | W-04 |
| 9 | topic-selection-resource-sampling-classification | resource-sampling | single-agent | partial | resource-sampling-service:629-664 | 1 | N | W-07 |
| 10 | topic-selection.v1b.n2.constraint-profile.runtime-support | v1b N2 | runtime-support | partial（**共享体**） | v1b-early-semantic-support-runtime-service:474-499 | v1 | N | W-05 |
| 11 | topic-selection.v1b.n3.intake-readiness.runtime-support | v1b N3 | runtime-support | partial（**共享体**） | v1b-early-semantic-support-runtime-service:474-499 | v1 | N | W-05 |
| 12 | topic-selection.v1b.n4.research-slice-options.runtime-draft | v1b N4 | single-agent | partial | v1b-n4-research-slice-runtime-service:474-500 | v1 | N | W-05 |
| 13 | topic-selection.v1b.n5.slice-selection.runtime-support | v1b N5 | runtime-support | partial（**共享体**） | v1b-early-semantic-support-runtime-service:474-499 | v1 | N | W-05 |
| 14 | topic-selection.v1b.n6.question-candidate-draft.runtime-initial | v1b N6 | single-agent | partial | v1b-n6-draft-runtime-service:482-510 | v1 | N | W-05 |
| 15 | topic-selection.v1b.n6.loopback-triage.runtime-support | v1b N6 | single-agent | partial | v1b-n6-loopback-triage-runtime-service:427-452 | v1 | N | W-05 |
| 16 | topic-selection-v1b-n6-debate-explorer | v1b N6 divergent debate | debate-role | **skeleton** | v1b-n6-divergent-debate-runtime-service:290-322 | v1 | **Y** | W-18 |
| 17 | topic-selection-v1b-n6-debate-critic | v1b N6 divergent debate | debate-role | **skeleton** | v1b-n6-divergent-debate-runtime-service:290-322 | v1 | **Y** | W-18 |
| 18 | topic-selection-v1b-n6-debate-arbiter | v1b N6 divergent debate | debate-role | **skeleton** | v1b-n6-divergent-debate-runtime-service:290-322 | v1 | **Y** | W-18 |
| 19 | topic-selection.v1b.n7.candidate-grouping.runtime-support | v1b N7 | runtime-support | partial（**共享体**） | v1b-n7-support-runtime-service:415-440 | v1 | N | W-05 |
| 20 | topic-selection.v1b.n7.failed-trial-synthesis.runtime-support | v1b N7 | runtime-support | partial（**共享体**） | v1b-n7-support-runtime-service:415-440 | v1 | N | W-05 |
| 21 | topic-selection.v1b.n7.n8-debate-admission-review.runtime-support | v1b N7（**荐 N8 debate-level**） | runtime-support | partial⚠（**共享体**） | v1b-n7-support-runtime-service:415-440 | v1 | N | W-05 |
| 22 | topic-selection.v1b.n8.topic-value-assessment.runtime-draft | v1b N8 | single-agent | partial | v1b-n8-value-assessment-runtime-service:519-547 | v1 | **Y** | W-18 |
| 23 | topic-selection.v1b.n8.bounded-micro-debate.runtime-role | v1b N8 | debate-role | partial | v1b-n8-bounded-debate-runtime-service:446-471 | v1 | **Y** | W-18 |
| 24 | topic-selection-promotion-decision-support | v1c-N2 promotion support | single-agent | **skeleton** | v1c-promotion-gate-service:618-633 | 1（caller override） | N | W-06 |
| 25 | topic-selection-v1c-promotion-support-bounded-micro-debate | v1c-N2 bounded micro-debate | debate-role | **skeleton** | v1c-n2-bounded-debate-runtime-service:531-551 | 1 | **Y** | W-18 |
| 26 | topic-selection-v1c-delegated-promotion-decision | v1c-N4 delegated | single-agent | partial | v1c-n4-delegated-promotion-decision-runtime-service:623-644 | 1 | N | W-06 |
| 27 | topic-selection-v1c-downstream-feedback-normalization | v1c-N6 feedback-norm | single-agent | partial | v1c-n6-feedback-normalization-runtime-service:492-512 | 1 | N | W-06 |

### 现状校正（critic maturity 挑战，落 Phase 1 优先级）
- **#8 need-discovery-arbiter-final**（标 partial，⚠）：实为 **external NeedCandidate 权威 feed**（`final_synthesis` → `RankedCandidateDraftBatch`，`allowed_execution_modes` 仅 `provider_llm`、禁 codex 替换），角色/输出框架仍只一句话，倚赖**借来的** ranked-batch-shaped guardrail 块。**最高 drift/正确性 blast radius** → Phase 1 按 **skeleton-优先级**处理 + golden 锚列为该簇最高优先。
- **#7 need-discovery-arbiter-issue-frame**（标 partial，⚠）：partial 靠的是 final-synthesis-shaped 借用 guardrail，对 issue-framing 仅「部分适用」，issue-frame-相关内容近 skeleton；Phase 1 须**拆分共享 arbiterMessages 块**（issue-frame vs final-synthesis 两形）。
- **#21 n7 n8-debate-admission-review**（标 partial，⚠）：以 enum `debate_level:[compact_assessment_debate, provider_diverse_deep_debate]` **推荐**下游 N8 debate 级别却**零 NL 选择 rubric**,且与另两个 N7 槽共用字节相同的通用体——实质近 skeleton,partial 全靠共享 boilerplate 撑。
- **共享构造体须拆分（Phase 1 结构动作）**：N2/N3/N5 共用一个 `early-semantic-support` `messages()` 体（#10/11/13）；三个 N7 槽共用一个 `n7-support` `messages()` 体（#19/20/21）。Phase 1 须按节点拆出 slot-specific 正文,否则「定稿一个」会连带改另两个的 hash。

### Phase 1 推荐排序（critic，已映射回 01-plan 的 W-item 表面定义）
> 关键路径优先（v1a need-discovery 链先行,external 权威 feed 最高优先）；W-item 身份不变,仅排执行序。
1. **W-04 v1a 优先**：先 need-discovery debate 簇——**arbiter-final（#8）= 单点最高优先**（external 权威 feed + golden 锚），explorer/deep-critic（#5/#6）真骨架紧随,issue-frame（#7）并拆共享 arbiter 块；再 v1a 单 agent 四件（#1-4）。
2. **W-07 资源采样（#9）**：单件,与 W-04 可并行（不在关键 debate 链上）。
3. **W-05 v1b 非-debate（#10-15,19-21,共 9 件）**：最大单桶,先拆两组共享构造体（early-semantic-support、n7-support）再逐槽定稿；**#21 admission-review rubric 风险最高**。
4. **W-06 v1c（#24/26/27）**：`promotion-decision-support（#24）`是唯一剩余**非门控 skeleton**,不应等,提前到 W-06 前列或并入 W-04 批；delegated（#26）/feedback-norm（#27）boundaries 已强,仅缺 per-field 描述 + golden 锚。
5. **Phase 5 defer（#16/17/18/22/23/25,共 6 件）**：随标定语料,W-18 同期定稿。

### W-03 衔接（孤儿开口正式认领，下一步）
- 台账已为 Phase 1（W-04..W-07）铺定 SSOT；下一步 W-03 把 N6 升级可达性、v1c-N2 生产接线（W-13 已 done，可核销）、P-01 压缩恢复 confirm 半边正式纳 ledger + 开 `D-T128-0N` JD 占位。

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

### W-01 + W-03 — Phase 0 治理收口 + 孤儿开口认领（2026-06-25）
- **W-01 治理收口（done）**：建包 git mv 重命名 + `.ai-task.yaml`（slug/keywords/edges）+ registry 注册 T-128（`ctl-project-governance query` 可见，`status:planned`，F-001/M-001）+ `lint --check --project main` 绿（仅 T-123/T-115 既有 acceptance-未勾 warning，非本包）。文档卫生：T-127 `00-overview` 经核对**已是** `State:done` + 完整「残留移交登记 → T-128」（① N8/N6 翻门→W-17、② D5→W-15、③ P-01→W-11、④ dormant debate→W-14、⑤ step-f prompt 骨架→Phase 1/5），stale「Phase 2+ 待开工」行已不存在 → W-01 该子项无需再改。
- **W-03 孤儿/无主开口认领（done）**：三孤儿正式纳入本包 ledger，按 D6 协议在触碰前于 T-088 `06-joint-decisions.md` 登记 JD（承 D-T127-02）：
  - **D-T128-00 开篇**（line 1929）：声明本包 harness-touch 协议——prompt 撰写 / v1c 接线**不触 harness 无需 JD**；凡触 harness 壳/节点体/orchestrator 边界/`bounded-debate-core`/共享压缩 orchestrator **先开 D-T128-0N**；全包不变量承诺（replay byte-identity、DMP-10 单 core、不翻 provisional/不撤 tripwire）。
  - **D-T128-01 占位**（line 1936，W-12）：N6 升级可达性——`n6_gate_failure_retry_context` projection 未穿线（现 clean `debate_blocked` halt 软死端）+ crash-mid-debate/blocked-then-retry 幂等。预期加法式触 harness N6 节点体，待 Phase 4 grounding 回填。
  - **D-T128-02 占位**（line 1943，W-11，跨 T-124+T-088）：P-01 压缩恢复——共享 orchestrator `blockForCompressionAttempt` 只记录不恢复（无 compress→re-gate→continue）；本包认领 **topic-selection 侧回归确认半边**（T-123 D3 孤儿义务）；STEP-7 debate 压缩-facts 严格其下游；gates product-robust（**不阻塞** W-10 可达性）。
  - **v1c-N2 接线核销**：原 chip 已由 **T-127/T-128 W-13 完成**（真 caller 接线、admit 不再被绕过），且设计 study `wf_c2753144` 定 **D6=否**（v1c 无 harness、纯 `canonicalHash` leaf）→ **不开空 JD，直接核销**。
- **验证**：纯文档/JD 登记，零代码改动 → 套件/双 tsc/replay 守卫不受影响；治理 `lint --check` 绿。path-scoped commit（仅 T-128 `03` + T-088 `06-joint-decisions`，排除全部并行 session 文件）。

### W-04 — v1a 表面 prompt 产品化（2026-06-25，进行中）
**study/grounding `wf_79f66a5e`（3 簇深读 + plan，已主验证 blast-radius）**：
- **统一发现**：8 个 v1a 系统正文今日**全无** golden/harness/replay/e2e 锚（`GUARD_GOLDEN_N1` 仅钉 v1b-N1 无-LLM 节点；v1a harness StubGateway 按 schemaName 打桩、忽略 messages；replay-smoke 只解析 USER）→ **改正文断 0 既有断言**,但漂移当前无守卫。
- **golden-anchor 策略（统一）**：每 prompt 在其同文件单测加 **rendered-text-hash 锚**（`sha256Text(stableStringify(messages))`，非 packet-hash——packet-hash 含 profile/context 哈希、过脆且 Stub/Provider 测不可达）。record→paste→同 commit。
- **element(b) 输出契约走 prompt 内联系统文本**（非改共享 schema）：降风险、避免触 cross-package contract 文件 + fingerprint 锚复杂度；prompt 永远发给模型故内联更可靠。
- **2 处共享构造体须拆分**：`arbiterMessages`（issue_framing vs final_synthesis，非对称）、`roleMessages`（explorer vs deep_critic，role-aware）。其余 6 prompt 用专用构造体、无需拆。
- **keystone-first 序 + commit 分组**：A=arbiter-final+issue-frame（拆 arbiterMessages，一 commit）→ B=generate-need-candidate → C=explorer+deep_critic（拆 roleMessages，一 commit）→ D=need-adjudication → E=human-confirmation → F=evidence-map。每 prompt 锚与正文同 commit。
- **必 verbatim 保留**：adapter `empty pool means there are no known duplicates`(test@333)+`candidate_pool_digest_role` key、N7 diagnostic-appendix spread(@232)、arbiter-final `output_constraints.role_ref_constraints.*`(@468-491)、schema-version 插值 const。

**slice A — arbiter-final + arbiter-issue-frame（commit 见下）**：
- `arbiterMessages` 按 `stage:'issue_framing'|'final_synthesis'` 分支。**final_synthesis**：保留 5 条安全子句(role-bundle/role_ref_constraints/EvidenceMap-authoritative/conflict-strength/no-authority)**verbatim** + USER 载荷**字节不变**（test@468-491 仍读 role_ref_constraints.*），ADD 角色框架 + 排名/terminal 契约 + terminal-honesty 边界。**issue_framing**：弃 ranked-batch 语言、USER 丢 `output_constraints`（保留 `debate_payloads.role_level_summaries`，test@462-466 仍绿），ADD DebateIssueFrame 字段契约 + 「不在此产 ranked batch/role-bundle」边界。两调用点(397/451)传 stage 字面。
- **2 rendered-text 锚**（专用漂移测试，`NEED_DISCOVERY_ARBITER_PROMPT_BODY_GOLDEN`，pin calls[3]=issue_frame / calls[4]=final 的 `sha256Text(stableStringify(messages))`）。
- **对抗式 review（agent，SHIP-WITH-FOLLOWUP，0 critical/2 should-fix，均已修+re-baseline）**：① 硬编「(cap 5)」是平行真值源（`max_persisted_candidates` 已经 `arbiter_context.payload` 送达模型）→ 改「set to the cap given in arbiter context」；② issue-frame 把 candidate_need_signals/risk_signals/unresolved_questions 误归特定角色（`RoleLevelSummary` 两角色皆有三字段）→ 改「each role-level summary」。其余 verified clean（拆分/schema-enum 准确/不变量未软化/锚 stage-correct/roleMessages 未动）。
- **验证**：debate 单测 **16/16**、双 tsc **0**、full backend **1577/0/35**（+1 锚测试，0 回归）；replay 守卫不涉（v1a 无 harness golden 覆盖这些正文，新锚是其唯一漂移守卫）。

### W-13 — v1c-N2 + v1c-N4 dead-slot 真 caller 接线（2026-06-25，全接）
设计 study `wf_c2753144` 定 **D6=否**（v1c 无 run-coordinator/harness;N2/N4 runtime/admission 不调 `invokeNode`、只引 W-12 析出的纯 `canonicalHash` leaf;改动纯加法 coordinator/DI/route + 一个 N4 contract 可选字段）。**codex_assisted 真相**:`response_source='operator_supplied'` 时 orchestrator 把 operator 供的角色输出 **verbatim** 返回（不调 provider）、`run_mode='acceptance'`;canary 的 bug 是**绕过 `admission.admit()`**（schema_version pin + 所有深检查只在 admit 内），真 caller 必须穿 admit。
- **v1c-N2**（S1 `dc9ff27f` / S2+S3 `40cf3e00`）:`TopicSelectionV1cN2BoundedDebateCoordinatorService`(在 gate 之上、不给 gate 加 control-plane 依赖)循环 4 角色 `generateRoleArtifact`(codex_assisted)→**admit**→既有 `createPromotionDecisionSupportFromVerifiedRuntimeDraft` gate 入口;默认确定性 registry 与 gate 校验匹配(单测证)。4 单测(happy 持久化 + schema_version/forbidden-authority/missing-output 负例证 admit 被穿)+ HTTP 测(422 证 admit 经 HTTP 触达)。
- **v1c-N4**（S0 `ce889186` / S4 `4463dfca` / S5 `3cba7a5c`）:delegated agent 起草促进**决定**内容、人仍授权。**权威边界构造性保证**:`human_actor` 来自请求(非 agent)、admission 再断言 `actor_type==='human'`、禁 authority-write keys;**promote-class 草案**(能在人授权后驱动真实 PaperProjectBridge)须 `promote_reconfirmed:true`(用户锁的安全门);决定带 **`delegated_decision_provenance`**({source:'codex_delegated',admission_identity_hash},S0 contract + 经 `recordHumanPromotionDecision` 穿线)使其可审计、不与纯人审混淆。operator-only route(默认人审 route 字节不变)。5 单测(非人 actor fail-fast/park happy 带标记/promote 无 reconfirm→409/promote 有 reconfirm→记/admit blocker)+ 2 HTTP 测(非人边界 + runtime+admission 触达)。
- **验证**:双 tsc 0、标定与 v1c 套件绿、full backend **1572/0/35**、replay 不受影响(纯加法)。**节点审计的 v1c-N2/N4 dead-slot 项 → 收口**。
- **遗留(归 W-08)**:并行 T-112 所有的 `06-node-scope-matrix.md` v1c-N4 行仍高估为 production-wired,实地核对后 reconcile(本包不直接改并行 session 文件)。
- **对抗式审查（`wf_6799f8b7`，SHIP-WITH-FOLLOWUP，17 确认/5 反驳，0 critical/0 must-fix）**:**N4 权威边界 holds**——逐路径核实 agent 无法冒充人审、绕过授权、规避 provenance、绕过 promote-class 门、或直接建 bridge（human_actor 仅来自请求 + admission 三层断言 actor_type==='human' + admit 不可绕 + forbidden-authority 递归扫描 + bridge 仍需另次独立调用）。**1 真缺陷已修（commit `3e9a1bf2`）**:provenance-forgery（**审计可信性**问题,非授权升级）——`delegated_decision_provenance` 原在**公开** `RecordHumanPromotionDecisionInput`,纯人审 route body `additionalProperties:true` 可伪造该字段使纯人审决定被误标 delegated。修法:把标记移到 writer **内部专用第二参数** `RecordHumanPromotionDecisionInternalOptions`,writer 只从此读取;纯人审 controller 不传第二参数→伪造的 body 字段被静默忽略。加单测 + HTTP 回归测（纯人审 route 吞伪造标记不持久化）。全后端 **1575/0/35**。
- **审查 nit 已处置（commit 见 review-followup）**:① 「operator-only」措辞纠偏——该 route **今天无 RBAC 门控**（后端无 auth 基建）,改为「distinct delegated endpoint，RBAC 门控为 follow-up」诚实表述（权威边界 human_actor+admission 仍生效,HTTP 已测）;② N2 coordinator `FINAL_SLOT` 与 admission/gate 的 `synthesizer_final` 字面耦合**显式化**（module-load 不变量,reorder 即响亮报错;原本也 fail-closed 于 gate）。
- **追踪 follow-up（审查 should-fix，非授权、本轮不改以避动共享 gate 身份）**:**N2 `support_run_key` per-run 非幂等**——bounded-debate 路径的 `support_run_key` 折入 `admission_identity_hash`,其内嵌 `final_*_ref` 的 per-run UUID（control-plane 每跑新铸,非 content-addressed）→ 同一 frozen snapshot 用逐字节相同 operator 输入重 POST 会**每次新建 support+dossier**,与文档化验收 **N2-10**（content-hash replay 身份、同 run key 不重复）相悖。单 agent/deterministic 路径 `runtimeIdentityHash=null` 故仍幂等——仅 bounded-debate 回归。**正解**:`support_run_key` 折入 content-only 哈希（排除 per-run ref UUID）+ 真协调器跑两次的幂等测;触碰共享 gate 身份组成,宜独立 focused 切片做,不在长会尾仓促改。**非安全问题**（operator-gated、support_only 非权威投影、数据冗余/完整性）。其余 nice-to-have:N4 HTTP happy-path 201 测、S0 commit-msg 关于序列化的措辞、422 双码客户端边界——低优先,留待。
