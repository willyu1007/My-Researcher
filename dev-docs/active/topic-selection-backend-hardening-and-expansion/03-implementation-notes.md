# 03 Implementation Notes

## Work Items 关闭追踪（相位为 2026-06-16 对齐后次序；W-ID 稳定）
| Work Item | Phase | 段 | Status | Evidence |
| --- | --- | --- | --- | --- |
| W-01 落地 T-123 工作树残留（F-10 estimator + DP-3.3 6-file scaffold + evidence/） | 0 | 核心 | done | 见 Phase 0 记录（backend 1332/0/35skip · shared 255/0 · tsc 0） |
| W-02 校验/补 N11 handoff recipe | 0 | 核心 | done | recipe 条目已在 `coordinator:156–158`；补 N11 终端穿越单测（N1..N11→stop_v1b_complete），coordinator 16/0 |
| W-03 代码卫生（去 @deprecated / legacy_unverified 消息 / memory 持久化注记） | 0 | 核心 | done | ① moot；② 6 处 admission legacy_unverified 消息已丰富（码不变）；③ decision-memory SSOT 注记入 contracts |
| W-04 Coordinator 故障恢复（feedback pre-flight / upstream-blocked / timeout 指引 / nonce 守卫） | 1 | 核心 | done | 见 Phase 1 记录（coordinator 19/0；upstream_blocked / feedback_artifact_missing / nonce 负例） |
| W-05 准入/运行时 service 单测补齐（~12） | 1 | 核心 | done | 12 个 service 各补单测，66/0（见 Phase 1 记录） |
| W-06 N8 provisional 阈值产品门禁形式化 | 1 | 核心 | done | `N8_DEBATE_THRESHOLDS_PROVISIONAL_PRODUCT_GATE` + 守卫单测（provisional 仍 true） |
| W-12 harness 单文件一次拆透（b1，承 D-T123-03，D-T127-01） | 2 | 核心 | **done（2026-06-18）** | D-T127-01；**收壳完成**：70 个纯助手（+ ref-builders/asserts 共 90 搬迁函数）全数析出至 **16 个兄弟模块**，harness **12,898→9,933 行（-23%）**，严格 DAG 无环；余即字面壳（生命周期 + 持久化 + stateful async runner + runner-local 类型助手）。每批 golden 守卫绿 + 全套件 **1469/0/35** byte-identical；独立逐字对抗评审 90 函数 0 缺陷（`wf_063839cb`）。`resolve*`/local-type 助手按 D-T123-03 范式留壳。 |
| W-07 v1b N6 有界对抗 debate 完整运行时（full a–i，D-T127-02） | 3 | 核心 | **in-progress** | a/core-gen/b/c/d1/e 已落（见 Phase 3 记录）；原语=divergent_loop（3 角色，用户定）；共享 core 加法泛化 `runDivergentLoop`（Option A，N8/v1c byte-identical）+ N6 debate 契约 + scenario/profile 注册 + 触发阈值（advisory）。**step f 计划 2026-06-20 锁定**（f0–f6，五项决策定，prompt 正文延期 T-128）。续 f0（d1 arbiter codex 修订）→ f6 |
| W-08 v1c 反馈触发 recheck 建议性发射（record-only，T-108 保持） | 3 | 核心 | planned | 待 |
| W-09 provider-diverse debate 角色 profile（DP-3.5 加法） | 3 | 核心 | planned | 待 |
| W-10 工作台收口审计 + 只读节点文档化 | 4 | 核心 | planned | 待 |
| W-11 `n4_handoff_hash` 数据迁移 | 4 | 核心 | planned | 待 |
| W-13 DP-3.3 N8 阈值标定（record-and-defer，语料门控） | 5 | **延期尾巴** | planned | 待 |

## 决策记录
### 2026-06-16 顶层决策（用户两轮对齐锁定）
- **D1 任务包形态 + 验收切分（locked）**：单一伞型 T-127；两段验收——核心段 = Phase 0–4 阻塞 sign-off，延期尾巴 = Phase 5（选项 D）不阻塞核心。
- **D2 选项 B-2 范围（locked）**：v1c recheck = 建议性发射 + 排序（record-only），T-108 前向唯一保持。
- **D3 选项 B-1 深度（locked，第二轮确认）**：v1b N6 debate 做**完整运行时（full a–i）**——要让"候选弱→升级 debate→正常继续"真正可走必须 full runtime，spec-only 留死路/死能力，违"不留技术债务"。动 harness 前登记 D-T127-02（协调 T-089）。
- **D4 选项 A 次序 + 范围（locked，第二轮确认）**：harness **一次拆透（b1），提前到 Phase 2（B 之前）**——干净 harness 让本次与后续开发更顺，N6 运行时落在模块化结构。登记 D-T127-01。
- **D5 选项 C 范围（locked）**：工作台 = 收口 + 数据迁移；HumanOverride / Trace 抽屉延期。
- **D6 harness-touch 治理（承 T-123 D3）**：W-12 / W-07 触碰 harness 本体先登记 D-T127-NN（W-12=01，W-07=02）；均须 replay byte-identity 守卫。
- **D7 T-123 关闭与移交（locked）**：T-123 转 done 归档，F-11 / DP-3.3 所有权移交本包 W-12 / W-13；T-123 `03-implementation-notes.md` + T-088 D-T123-03 续推指针各留痕，避免双轨/漂移。
- **D8 选项 D 标定姿态（locked）**：record-and-defer——mock 不可标定真阈值（循环喂分），故显式登记阻塞于语料，N8 维持 provisional + 签核门直至真实语料达标。
- 依据：2026-06-16 全链 ground-truth 调查（backend-solidity / Option-B / Option-C / 约定与依赖四路）——结论摘要：① 后端残留 6 未跟踪 scaffold + F-10 改动未落地、coordinator 边界态裸 500、~12 准入 service 无单测、N11 recipe 疑缺、provisional 仅 warning；② N6 debate reserved（infra 预埋、scenario 未定义、DMP-03 触发即 blocked），v1c recheck record-only（T-108 锁前向唯一），provider-diverse 为 DP-3.5 加法位；③ 工作台人审面已建成且 e2e 绿，真实缺口为 `n4_handoff_hash` 数据迁移 + 只读文档化（HumanOverride/Trace 延期）；④ 约定：next id T-127、文件集与 D-record 格式承 T-123/T-115/T-088。

## Phase 实施记录
> 各 Phase 收口时在此追加：变更摘要、关键决策、测试证据（套件名 + 计数 + commit hash）、延期项与理由。

### Phase 0 — 后端夯实（已完成 2026-06-16）

**W-01 落地 T-123 工作树残留 — done（2026-06-16）**
- 提交内容（path-scoped，**未用 `git add -A`**）：F-10 `topic-selection-conservative-token-estimator-service`(+test) / `topic-selection-token-budget-gate-service`(+test)；DP-3.3 6-file scaffold `topic-selection-v1b-n8-calibration-{analysis,materializer,runner}`(+test)；comment-only `topic-selection-v1b-workflow-harness-contracts.ts`（仅追加 N8 provisional 说明注释，常量未变）；T-123 闭包文档 `04-verification.md` / `07-phase3-debate-skeleton-spec.md` + `evidence/{f10-token-calibration,dp33-n8-threshold-calibration}/`（2 个 `*.tokenizer.json` 受 `.gitignore` 自动排除）。
- 排除（并行 session，未提交）：`paper-implementation-runtime-orchestration-hardening/*`、`topic-selection-v1b-human-review-path/00-overview.md`、`title-card-management-contracts.schema.test.ts`、`adaptive-llm-systems-*` T-126 artifacts、`literature-*`、`paper-implementation-productization-hardening/`。
- 回归证据：backend 全套件 **1332 pass / 0 fail / 35 skip**（与基线吻合）、shared **255/0**、backend+shared `tsc --noEmit` **0**；W-01 文件单测 **32/0**、coordinator 单测 **47/0**。
- 核验副产物（**重定标**，待对应 W 项落地）：
  - **W-02** — coordinator `HANDOFF_BUILDER_TABLE` 的 N11（`topic-selection.v1b.publish-v1c-input-bundle.v1` → `handoff_hash_key:'n10_handoff_hash'`）条目**已存在**（行 156–158），且模块加载覆盖断言（行 164–169）通过；§30 调查里"N11 recipe 疑缺"前提作废。W-02 实际只剩 `advanceLocked()` 的 **N11 终端穿越单测**（当前测试无 `run_complete=true` / `stop_v1b_complete` 终端断言）。
  - **W-03 ①** — 全 topic-selection service `@deprecated` 计数为 **0**，`research-slice`/`topic-question`/`value-assessment` 只读投影三件套已于 T-123 Phase 1.1 随生成路径删除 → W-03 ① **moot**；仅 ②（12 处 `legacy_unverified` 消息）/③（decision-memory 文档注记）有落点。

**W-02 N11 handoff recipe — done（2026-06-16，重定标）**
- 核验结论：coordinator `HANDOFF_BUILDER_TABLE` 的 N11（`publish-v1c-input-bundle.v1` → `handoff_hash_key:'n10_handoff_hash'`）条目已存在（`topic-selection-v1b-run-coordinator-service.ts:156-158`），模块加载覆盖断言（164-169）通过——00 §W-02 / §30 的「N11 条目缺失」前提作废。
- 落地：补 coordinator `advanceUntilBlocked` 的 N11 终端穿越单测「drives the full N1..N11 chain to stop_v1b_complete and reports run completion」——驱动 N1→N11 全清洁链（N4/N6/N8 model draft、N2/N5 人审、N9/N10/N11 确定性自驱），断言 `run_complete=true` / `halt.reason='run_complete'` / `last_completed_node_id=N11` / `next_node_id=null`，并校验 N11 frozen payload 自 N10 handoff 组装（`n10_handoff_hash`）。coordinator 单测 **16/0**。

**W-03 代码卫生 — done（2026-06-16，重定标）**
- ① **moot**：全 topic-selection service 无 `@deprecated` 标记；`research-slice`/`topic-question`/`value-assessment` 只读投影三件套已于 T-123 Phase 1.1 随生成路径删除——无对象可去。
- ② 丰富 **6 处** admission `legacy_unverified` 拒绝消息（early-semantic-support / n4-research-slice / n6-draft / n6-loopback-triage / n7-support / n8-value-assessment），指明根因（无 runtime-verified v1b provenance）+ 恢复指引（经 v1b N1 intake 重产、v1a/legacy 工件不可直接复用）；**错误码不变**（零行为变化——测试仅断言 `code`）。
- ③ decision-memory packet **持久化/查询 SSOT** 注记写入 `packages/shared/.../topic-selection-decision-memory-packet-contracts.ts`：packet 为 build-on-read 投影、无独立持久化，持久化 SSOT 为各来源 authority 仓储（need-validation / value-assessment / recheck-risk-memory / topic-question），唯一查询路径 `TopicSelectionDecisionMemoryProjectionService.buildPacket({title_card_id, max_entries})`。
- 证据：affected admission + projection 单测 **32/0**；backend 全套件 **1333/0/35skip**、shared **255/0**、`tsc` **0**。

**Phase 0 收口（M0）**：W-01 / W-02 / W-03 全部 done；工作树仅余并行 session 文件；进入 Phase 1。

### Phase 1 — 后端鲁棒性（已完成 2026-06-16）

**W-04 Coordinator 故障恢复 — done（2026-06-16）**
- 全部落在 coordinator/controller 层，**未触碰 harness 本体**（无需 D-record）。
- ① feedback pre-flight + ② upstream-blocked：`buildNextRequest` / `resolveFeedbackReentry` 中「上游 lineage / 反馈工件缺失」的裸 500 改为**结构化 halt**——新增 `HaltReason` `upstream_blocked` / `feedback_artifact_missing`，经内部 `CoordinatorPreconditionHalt` 在 `advanceLocked` 转 halt（指名缺失工件）。
- ③ timeout retry 指引：`node_timeout` halt 消息**本就含** retry 指引（「harness is replay-idempotent, advance again to converge」，`invokeWithTimeout`）——核验已满足，未改（与 W-02/W-03 同属「计划前提部分已实现」）。
- ④ 人审 nonce 守卫：新增 `runHumanSubmissionExclusive(runId, nonce, fn)`——N2/N5 路由读 `X-Coordinator-Attempt-Nonce` 头；同 (run, nonce) 重复提交 → 409（**成功后才记录** nonce，失败可同 nonce 重试，null 不守卫；in-process，同 run-lock/in-flight 映射）。
- 负例单测（coordinator **19/0**）：`upstream_blocked`（缺 N7→N8 projection）、`feedback_artifact_missing`（反馈工件被删）、nonce 守卫（重复 409 / 失败可重试 / null 不守卫）。

**W-05 准入/运行时单测补齐 — done（2026-06-16）**
- 12 个无独立单测的 service 各补 co-located `.unit.test.ts`（5 admission + 7 runtime），共 **66 测试 / 0 fail**：early-semantic-support-runtime、n4-research-slice-{admission,runtime}、n6-draft-runtime、n6-loopback-triage-{admission,runtime}、n7-support-runtime、n8-value-assessment-{admission,runtime}、v1c-n2-bounded-debate-admission、v1c-n4-delegated-promotion-decision-admission、v1c-n6-feedback-normalization-admission。
- 每个含 happy path + 负例（admission：`legacy_unverified`/provenance/drift 拒绝码；runtime：lineage/输入不变量拒绝 + byte-stability）。
- 注：计划提到的「N6 dedup-warning / N8 阈值应用」断言**不适用于这 12 个 service**——dedup-warning 属 n6-draft-admission（已有单测）、N8 阈值属确定性 harness gate；这 12 个是 provenance/identity 准入与 draft 生成 runtime，据实未强加无关断言。

**W-06 N8 provisional 产品门禁形式化 — done（2026-06-16）**
- shared `topic-selection-v1b-workflow-harness-contracts.ts` 新增 `N8_DEBATE_THRESHOLDS_PROVISIONAL_PRODUCT_GATE`：把 `n8_debate_thresholds_provisional` tripwire 形式化为产品门禁——harness 层 non-blocking（**阈值判定不变、不动 harness 本体**），产品层「真选题过 N8 须有记录的 stakeholder sign-off」；门禁保留至 W-13 标定达标（≥100 多 provider 标注 + FP<5%），其间不翻 `provisional:false`、不撤 tripwire。
- 守卫单测（shared **256/0**）：断言 N8 policy `provisional===true`（防早翻 tripwire）+ 门禁常量形状。

**Phase 1 收口（M1）**：W-04 / W-05 / W-06 全 done；backend 全套件 **1402/0/35skip**、shared **256/0**、`tsc` 0。进入 Phase 2（harness 一次拆透 / 选项 A）。

### Phase 2 — harness 一次拆透 / 选项 A（进行中）

**2.0 D-T127-01 登记 — done（2026-06-17）**：在 T-088 `06-joint-decisions.md` 续 D-T123-03 登记 **D-T127-01**（一次拆透 b1 至壳：parse-and-resolve / hash-authority〔`hashContext` 外〕/ ref-issue builder 三簇逐字搬迁；不改 byte-bearing 哈希与 `invokeNode` 生命周期；逐 slice N1 golden 守卫 + 全套件兜底；拆透期间 T-088 改 harness 本体先在此协调）。

**W-12 slice — N8/N9/N10 authority-hash 簇 — done（2026-06-17）**
- 把 `hashN8ValueAssessmentAuthority` / `hashN8ValueReasoningMemoAuthority` / `hashN9DispositionAuthority` / `hashN10PackageAuthority` / `hashN10V1cInputBundleAuthority` 5 个纯函数**逐字搬迁**到 `topic-selection-v1b-harness-authority-hash.ts`（`this.hash` → `canonicalHash`，同一单源），harness 16 处调用点改模块调用、移除 5 个私有方法。
- harness **12,898 → 12,829 行**（−69）；`tsc` 0；harness 单测 **97/0**（含 `GUARD_GOLDEN_N1` + `OPTION_AUTHORITY_GOLDEN` replay-identity 守卫绿，N1 byte-identical）；backend 全套件 **1402/0/35**（N8/N9/N10 authority hash byte-identical 兜底）。
- 续接：parse-and-resolve 簇（`parseN1..parseN11` / `resolveN*Payload`，体量最大）、剩余 `hashN*Authority`（N5/N6/N7）、ref/issue builder 簇——后续 slice 逐个推进至壳。

**W-12 slice 2 — N7 + N5 authority-hash — done（2026-06-17）**
- 续抽 5 个纯函数到 `topic-selection-v1b-harness-authority-hash.ts`：`hashN7TopicQuestionAuthority` / `hashN7ContractAuthority` / `hashN7AnswerabilityPlanAuthority` / `hashN5DecisionAuthority` / `hashN5ResearchSliceAuthority`（`this.hash`→`canonicalHash`，逐字），harness 11 调用点改模块调用、移除 5 私有方法。
- 自检副产物：原 purity 扫描把 `hashN7AnswerabilityPlanAuthority` 误判为依赖 `this.ref`（实为扫描越界读到下一个函数 `recordN7DebateAdmissionArtifact` 的 `this.ref`），核对函数体确认纯函数后纳入本 slice。
- harness **12,829 → 12,753 行**；`tsc` 0；harness 单测 **97/0**（golden 守卫绿）；backend 全套件 **1403/0/35**（抽取前后一致 → byte-identical；1402→1403 的 +1 是 nits commit `d2df3f7a` 的并发 nonce 竞态测试，非本 slice）。
- 剩余 hash-authority：`hashN6CandidateAuthority`（依赖 `this.hasOnlyKeys`/`isRecord`/`ref`）+ `hashN7AnswerabilityPlanAuthority` 之外凡用 `this.ref`/`hasOnlyKeys` 者，需先抽 `ref`/`isRecord`/`hasOnlyKeys` 小工具簇方可搬迁；下一刀转 parse-and-resolve（体量主体）或先抽 ref/isRecord 工具簇解耦 N6。

**W-12 slice 3 — pure-utils 工具簇 — done（2026-06-17）**
- 新建 `topic-selection-v1b-harness-pure-utils.ts`，逐字搬迁 5 个无状态纯函数 + `HASH_PATTERN`：`buildRef`（原 `ref`，因 harness 多处局部变量名 `ref` 会遮蔽 → 以别名 `buildRef` import）、`isRecord` / `hasOnlyKeys` / `isHash` / `recordString`（裸名 import，`tsc` 确认无遮蔽）。harness `HASH_PATTERN` 本地常量移入模块、回 import（单源）。
- ~279 调用点改模块调用（`this.ref`99 / `isRecord`76 / `isHash`64 / `hasOnlyKeys`36 / `recordString`4；注：commit `765482a4` message 里 isRecord/isHash 的计数 68/63 是 `grep -c` 按行计、偏少，实为 76/64，代码全部守恒正确），移除 5 私有方法 + 本地 `HASH_PATTERN`。
- harness **12,753 → 12,729 行**（净减小因工具体量小；价值在解耦——parse-and-resolve 簇与 `hashN6CandidateAuthority` 现可搬迁）；`tsc` 0（含遮蔽核验）；harness 单测 **97/0**（golden 守卫绿，`buildRef` 喂入哈希 byte-identical）；backend 全套件 **1403/0/35**。
- 下一刀：`hashN6CandidateAuthority`（现已解耦）+ parse-and-resolve 簇主体。

**W-12 slice 4 — hashN6CandidateAuthority（hash-authority 簇收口）— done（2026-06-17）**
- 抽最后一个 `hashN*Authority`（依赖 slice 3 的 `buildRef`，故现可搬迁）到 `harness-authority-hash.ts`（`this.hash`→`canonicalHash`，`buildRef` 由模块 import pure-utils）；3 调用点改模块调用、移除私有方法。authority-hash 模块新增 `import { buildRef }`（authority-hash→pure-utils 单向依赖，无环）。
- harness **12,729 → 12,714 行**；harness 内 `private hashN*Authority` 计数归 **0 ——hash-authority 簇（N5–N10）全部出壳**；`tsc` 0；harness 单测 **97/0**（golden 守卫绿）；backend 全套件 **1403/0/35**（byte-identical）。
- 对抗式评审（slice 2+3，3 维）**0 确认缺陷**；唯一 nit 是 commit message 计数偏差（已在上方 slice 3 记录订正）。
- 下一刀：**parse-and-resolve 簇**（`parseN1..parseN11` / `resolveN*Payload` / `resolveN7SupportContext` / `resolveEarlySemanticSupportPayload`）——拆到壳的体量主体，逐个/分组 slice 推进。

**W-12 slice 5 — predicate（类型守卫）工具簇 — done（2026-06-17）**
- 新建 `topic-selection-v1b-harness-predicates.ts`，逐字搬迁 12 个纯类型守卫（连续块 12313–12391：`isNullableHash`/`isStringArray`/`isFunctionalRefArray`/`isNullableString`/`isRiskLevel`/`isSliceSelectionDecision`/`isSliceLoopbackTarget`/`isNullableSliceLoopbackTarget`/`isRejectedOptionReasonArray`/`isClaimCeilingAlignment`/`isFunctionalRefValue`/`isNullableFunctionalRefValue`）。簇内互调（`isFunctionalRefArray→isFunctionalRefValue` 等）模块内解析；`isRecord`/`isHash`/`hasOnlyKeys` 由 pure-utils import。注：`pushRefMismatchIssue`（非纯，用 `this.refsEqual`/`blocker`）夹在块后，未动。
- **161 调用点**改模块调用（`isStringArray`55 / `isFunctionalRefValue`45 / `isFunctionalRefArray`33 等）；移除 12 私有方法。裸名 import，`tsc` 0 确认无遮蔽/无孤立类型 import。
- harness **12,714 → 12,648 行**；harness 单测 **97/0**（golden 守卫绿——守卫喂入 parser→frozen_input_hash，byte-identical）；backend 全套件 **1403/0/35**。
- 解锁：parseN* 现可逐个搬迁（其依赖的类型守卫已出壳）。下一刀起拆 parsers。

**W-12 slice 6 — parser 簇 batch 1（N1/N3/N4/N6）— done（2026-06-17）**
- 新建 `topic-selection-v1b-harness-parsers.ts`，逐字搬迁 4 个纯 frozen-input 解析器（`parseN1Payload`/`parseN3Payload`/`parseN4Payload`/`parseN6Payload`，各 1 调用点）。模块 import `hasOnlyKeys`/`isHash`（pure-utils）+ `isFunctionalRefValue`（predicates）+ 4 个 frozen-payload 类型。解析器为纯校验器（不算哈希），行为/byte-identical。
- 依赖核查：9/11 parser（N1/N3/N4/N6/N7/N8/N9/N10/N11）经 slice 5 后已 PURE；仅 N2/N5 仍依赖 `accepted*PayloadIsValid` 验证器（待 slice 7 先抽验证器）。
- 移除 4 私有方法 + harness 内 N3 类型孤立 import（`tsc` 报 TS6133 后清理）。harness **12,648 → 12,526 行**；`tsc` 0；harness 单测 **97/0**（golden 守卫绿）；backend 全套件 **1403/0/35**（byte-identical）。
- 下一刀：N7/N8/N9/N10/N11 parser（较大、纯）；再 N2/N5 验证器 + N2/N5 parser；最后 resolveN*Payload + resolver 簇 → 收壳。

**W-12 slice 7 — parser 簇 batch 2（N7–N11）— done（2026-06-17）**
- 续抽 5 个纯 frozen-input 解析器（`parseN7..parseN11Payload`，各 1 调用点，逐字）到 `harness-parsers.ts`；模块补 import `isFunctionalRefArray`/`isStringArray`/`isNullableFunctionalRefValue`/`isNullableHash`（predicates）+ N7–N11 frozen-payload 类型。移除 5 私有方法。
- harness **12,526 → 12,328 行**；`tsc` 0（N7–N11 类型仍他处使用，无孤立 import）；harness 单测 **97/0**（golden 守卫绿）；backend 全套件 **1403/0/35**（byte-identical）。
- **parser 簇仅余 N2/N5**——二者依赖 `acceptedConstraintProfilePayloadIsValid`/`acceptedSliceSelectionPayloadIsValid` 验证器（下一刀先抽这两个验证器〔查纯度〕，再抽 N2/N5 parser）；之后 resolveN*Payload/resolver 簇收壳。

**W-12 slice 8 — parser 簇收口（N2/N5 + 2 validators）— done（2026-06-17）**
- 把 `acceptedConstraintProfilePayloadIsValid`/`acceptedSliceSelectionPayloadIsValid`（纯）+ `parseN2Payload`/`parseN5Payload` 逐字搬迁到 `harness-parsers.ts`（验证器 export，N2/N5 parser 模块内调用；二验证器各另有 1 harness gate 调用点也改模块调用）。模块补 import `isRecord`(pure-utils) + `isNullableString`/`isSliceSelectionDecision`/`isRejectedOptionReasonArray`/`isNullableSliceLoopbackTarget`/`isSliceLoopbackTarget`(predicates) + N2/N5 类型。
- 6 调用点改模块调用；移除连续 4 方法块。harness 内 4 个 predicate import 变孤立（`tsc` TS6133 后清理：`isNullableSliceLoopbackTarget`/`isRejectedOptionReasonArray`/`isSliceLoopbackTarget`/`isSliceSelectionDecision`）。
- harness **12,328 → 12,140 行**；harness 内 `private parseN*Payload` 计数归 **0 —— parser 簇（N1–N11 + 2 validators）全部出壳**；`tsc` 0；harness 单测 **97/0**（golden 守卫绿）；backend 全套件 **1403/0/35**（byte-identical）。
- 仅余 **resolver 簇**（`resolveN*Payload` / `resolveN7SupportContext` / `resolveEarlySemanticSupportPayload` 等）→ 收壳。

**W-12 收壳核查 + 范围决策（2026-06-17）**
- **关键核查**：计划名义的 `resolveN*Payload` 纯簇**不存在**——harness 所有 `resolve*` 均为 `private async` **有状态**（await 控制面/仓储/工件解析、互调 this runner）；按 D-T123-03/D-T127-01「有状态 per-node runner 留壳」，它们**不出壳**。
- 到「字面壳」（仅生命周期 8 步 + 持久化 + 有状态 runner）尚余 **~107 个纯（非 async、无 this）节点助手**：support-payload guards（`isN*…SupportPayload`/`isN8ReasoningMemoDraft`…）、节点 ref/issue builders（`n7SupportRefs`/`n8KnownRefs`…）、`assert*` 校验器、`policyBlocker`/`handoffEdge` 等。
- **用户范围决策**：grind 至壳——逐个 coherent 子簇继续搬迁（每刀 verbatim + golden + 全套件守卫）。

**W-12 slice 9 — N7 support-payload guards — done（2026-06-17）**
- 把 5 个 N7 输入/支撑 payload 类型守卫（`isN6ToN7HandoffArtifactPayload`/`isN8ToN7FeedbackPayload`/`isN7CandidateGroupingSupportPayload`/`isN7DebateAdmissionSupportPayload`/`isN7FailedTrialSynthesisSupportPayload`）逐字并入 `harness-predicates.ts`（簇内调既有 predicates + pure-utils；补 5 个 harness-contracts 类型）。调用点含 `this.X(` 与 `this.X.bind(this)` 两形（bind 形 → 裸函数引用，无需 bind）。
- 移除 5 私有方法；harness 3 个 predicate import 变孤立（`tsc` TS6133 清理：`isFunctionalRefValue`/`isNullableFunctionalRefValue`/`isNullableHash`——其 harness 内用途已随 parsers/guards 全部出壳）。
- harness **12,140 → 12,030 行**；`tsc` 0；harness 单测 **97/0**（golden 守卫绿）；backend 全套件 **1403/0/35**（byte-identical）。

**W-12 slices 4–9 对抗式评审 + 覆盖补强 — done（2026-06-17）**
- 评审（3 维 + 验证，slices 4–9 = hashN6 / predicates / parsers / N7 guards）：**byte-identity 0 缺陷**（32 个搬迁函数逐字 diff 为空 + mutation 验证）；模块依赖 DAG 无环、无孤立 import、无死导出、无重复定义、contracts 类型 import 皆 type-only。
- 唯一确认项（medium，**非搬迁缺陷、属既有覆盖盲点**）：搬迁后的 parser 9/11 与 3 个 N7 guard 的 `{ok:false}`/false 分支**无任何测试断言**——评审用 mutation 证明（删 parseN9 的 `isHash` 检查让坏 payload ADMIT 仍全绿）。
- **补强**：新增 `topic-selection-v1b-harness-parsers.unit.test.ts`（41 测试：每个 parser happy + 精确 `*_INVALID` 码负例 + 2 validator）与 `topic-selection-v1b-harness-predicates.unit.test.ts`（25 测试：17 guard 各 true/false，复杂/N7 guard 多负例）。独立 mutation 复验：削弱 parseN9 `isHash` → parsers 测试转红（40/1），git 还原干净。覆盖盲点**已闭合**。

**W-12 slices 10–11 — gate-utils + 守卫簇收口 — done（2026-06-17）**
- slice 10（`a83decbe`）`topic-selection-v1b-harness-gate-utils.ts`：`blocker`/`warning`/`refsEqual`/`nullableRefsEqual`/`refArraysEqual`/`stringArraysEqual`/`refKey`/`normalize`/`versionFromId`/`nodeAttemptRef`/`firstDuplicate`/`effectiveRunMode`/`requiredModelLikeSlot`（gate-issue + 比较 + key 工具簇）。slice 11（`015fdc6c`）补抽残余类型守卫簇至 `harness-predicates.ts`。

**W-12 slices 12–13 — ref-builder + assert 簇 — done（2026-06-18）**
- slice 12（`15e72aec`）`topic-selection-v1b-harness-ref-builders.ts`：12 个 functional-ref builder（snapshotRef/profileRef/readinessRef/optionSetRef/optionRef/bundleRef/flattenEvidenceRoleBundle/draftEvidenceRefs/n5ArtifactRefs/v1aBundleSourceRefs/n6CandidateEvidenceRefs/n8DraftRefs，基于 pure-utils `buildRef` + dedup `uniqueRefs`）。其中 5 个（snapshot/profile/readiness/optionSet/bundle Ref）与 harness **局部变量同名** → import 起别名 `build*` 避免遮蔽（纯改名，零行为变化）；N7/N8 support-ref builder（n7SupportRefs/n7SupportHashes/n8KnownRefs，取 runner-local 上下文类型）留壳。
- slice 13（`922f84c3`）`topic-selection-v1b-harness-asserts.ts`：10 个纯 assert 校验器（assertResult/assertNonEmpty/assertOptionalStringId/assertOptionalRunMode/assertFunctionalRef/assertActorRef/assertHash/assertOptionalHash/assertSourceHashMap/assertRuntimeVerifiedSupportArtifact，模块自建 ACTOR_TYPE_SET/AGENT_RUN_MODE_SET）。两个 stateful assert（assertRequest/assertSemanticSupportArtifact 调 `this.getNodePolicy`）留壳，改 bare import 调叶子校验器。

**W-12 收尾分类（清单工作流 `wf_2dd916ca`，2026-06-18）**：对 harness 剩余 **132 个 private sync 方法**做 fan-out 分类（12 并行分类器 → 综合 → 逐批对抗证伪），裁定 **70 可抽 / 62 留壳**。留壳判据：体内引 `this.<statefulField>`（idFactory/now/modelProfileRegistry/各 admission·runtime/runnerDependencies/controlPlane），或经污染传播调到 stateful 方法，或参/返 **harness-local 类型**（HashContext / N5LoadedOptionSet / N6KnownContext·LoadedContext·LoopbackPlan / N7LoadedContext·SupportContext·CandidateChoice / N8DraftResolution·LoadedContext / N9LoadedContext / InheritedConstraints 等）。清单存项目记忆 `w12-harness-extraction-inventory`。

**W-12 batches 0–6c — 70 纯助手抽尽 / 收壳完成 — done（2026-06-18）**
- **b0 委托折叠**（`a809904b`）：`private hash`（88 调用点）与 `private hashResearchSliceOptionAuthority`（2 调用点）本是对**已抽**纯函数的一行委托 → 直接折叠为 `canonicalHash` / `sharedHashResearchSliceOptionAuthority` 并删壳；消解最高频同名碰撞（局部 `const hash`）。
- **b1 route-handoff**（`2ab7b3b7`，新模块）：buildHandoff/handoffEdge/nextNodeForImplementedHandoff/routeTargetNode。
- **b2 intake-readiness**（`db78d775`，新模块）：riskCoversRecheck/missingConstraintCodes/readinessBlockers/readinessRecommendation/profileParkReason + 折叠后 this-free 的 hashSnapshot/Profile/ReadinessAuthority；missingConstraintCodes 起别名避碰撞。
- **b3 n5**（`50143b88`，新模块）：10 个 N5 选片纯助手（codex/lineage/selected-option/non-select gate + 决策叶子）。
- **b4 n6**（`9ec3d1c8`，新模块）：12 个 N6 候选/回环纯叶子。
- **b5 n4**（`3ab3ea8c`，新模块）：6 个 N4 纯助手 + 共享字符串叶子 aligns/nonGoalsRemainExcluded/explicitClaimCeilingViolations（后者亦供留壳的 N6 结构/语义门用）。
- **b6a n7**（`78220492`，新模块）：9 个 N7 物化纯叶子。**b6b n8**（`dec4f51e`，新模块）：6 个 N8 估值纯叶子。**b6c node-misc**（`21fc36db`，新模块）：10 个跨节点纯叶子（isRegistryExecutionMode/earlyRuntimeAuditDrift/n10 叙事·携带·告警/legacyValueVerdict/n1·n2 lineage·codex 守卫/pushRefMismatchIssue〔20 调用点〕）。
- **每批不变式**：逐字搬迁（`private X`→`export function X`，`this.<已抽兄弟>`→bare/别名）；tsc 0；harness 单测 **97/0**（`GUARD_GOLDEN_N1`+`OPTION_AUTHORITY_GOLDEN` 绿）；backend 全套件 **1469/0/35** 抽前后一致（byte-identical）；删除每批 tsc 暴露的孤立 import；路径限定 commit。
- **收壳达成**：harness **12,898 → 9,933 行（-2,965，-23%）**；析出 **16 个兄弟模块**（pure-utils/dedup-utils 为叶，gate-utils/predicates/authority-hash→pure-utils，ref-builders/asserts/parsers→下层，节点模块 n4–n8/node-misc/intake-readiness/route-handoff→下层），**严格 DAG 无环、无模块反向 import harness service**。剩余 harness 即**字面壳**：生命周期（`invokeNode`）+ 持久化 + stateful per-node async runner + 绑定 runner-local 上下文类型的助手。完整性核查确认余下每个 sync 方法皆 `this.<stateful>` 或 local-type 绑定（无遗漏纯助手）。
- **独立逐字对抗评审**（工作流 `wf_063839cb`，10 个本会话模块 vs 基线 `015fdc6c`）：**CLEAN**——10 模块 / **90 个搬迁函数**逐字 diff，**0 确认缺陷**；每个函数与基线 `private` 原型 token-for-token 一致，差异仅为允许的三类（`private`→`export function`、`this.<已抽兄弟>`→bare/别名、缩进降一级）；逐项核对字符串字面量、枚举/数值常量、运算符、字段访问、分支、正则、默认值均无偏移。此为全套件 byte-identity 之外的独立兜底（防"测试语料内等价、未测输入分叉"）。

### Phase 3 — 能力扩展 / 选项 B（进行中 2026-06-19）

**W-07 step a — D-T127-02 登记 + 原语锁定 — done（`948aac89` / `736d2340`）**
- 在 T-088 `06-joint-decisions.md` 登记 **D-T127-02**（镜像 D-T127-01 五段式）：N6 节点体加法式 debate-escalation 分支，不改 invokeNode 生命周期 / replay-key / route-edge，replay byte-identity 逐 slice 守卫；协调 T-089 N6 `debate_primitive` reserved→implemented。
- 原语 design gate（02-architecture §3.1）关定 **divergent_loop（3 角色 explorer→critic→arbiter，用户两轮确认）** —— 贴 N6 生成型探索，镜像 V1A divergent 角色编排。**调和 DMP-10**：读 `bounded-debate-core` 的 `runLoop` 发现它只支持 bounded_sequence 固定序列走、装不下 divergent；用户定**加法泛化共享 core**（非复制 V1A 独立 service）。

**W-07 core-gen slice — 共享 core 加法泛化 `runDivergentLoop` — done（`b91b2625` + `1817c5c6` hardening）**
- **Option A**（用户经鲁棒性/复杂性评估确认）：在同一 `TopicSelectionBoundedDebateCoreService` 加 `runDivergentLoop` 方法，每 turn 复用**现有** `generateRoleArtifact`；`runLoop` + `generateRoleArtifact` + `BoundedDebateStrategy` **字节零改**（122 插入/0 删除）→ **N8/v1c-N2 byte-identity 构造性成立**。新增 `DivergentDebateStrategy extends BoundedDebateStrategy` + `instanceCountFor` 扇出元数；`DivergentDebateLoopResult`；divergent `loop_transcript_hash = canonicalHash([loopId, [[slot,arity]…], ordered hashes])`。DMP-10 单 core 保持。
- 充分性 + 质量审查（3 评审）：adequacyVerdict=**SUFFICIENT_FOR_N6**（summary 聚合/记录、admission 重算、gate-bridge 都落 N6 strategy/consumer，**无需再动共享 core**）。修一个真缺陷（fan-out hash-map last-wins 会让 N6 arbiter 静默漏折 explorer 实例 → replay 分叉）：加法补 `priorRoleArtifactHashesAll`（全实例）+ 终端单例守卫 + arity `Number.isFinite` 加固 + 确定性契约文档。守卫：N8/v1c-N2 **40/0** 零基线改 + divergent 核心测试 **6/0** + 全套件 **1475/0/35**。

**W-07 step b — N6 debate 角色契约 — done（`b584166c`）**
- 在 `topic-selection-v1b-workflow-harness-contracts.ts` 紧挨 N8 块加 N6 divergent 契约（命名镜像 N8 + `DIVERGENT_DEBATE` 限定词）：role-order（3 角色）+ slot-id + LOOP_ID（byte-bearing 单源）+ ROLE_OUTPUT_SCHEMA_VERSION + `TopicSelectionV1bN6DivergentDebateRolePayload`（按 role_slot 判别：explorer→candidate_seeds / critic→critic_findings / arbiter→synthesized_candidate_set）+ debate-admission blocker 码 union。
- **arbiter→gate 对齐（零新 gate）**：arbiter `synthesized_candidate_set` 即既有 `TopicSelectionV1bTopicQuestionCandidateSetDraftPayload`（=FormTopicQuestionLlmOutput），既有 N6 gate（`isN6DraftPayload`/`validateAndBuildN6Candidates`）原样接受；runtime（step f）解包成裸 draft 再记 gate 工件。纯加法（step f 前无消费者）；shared/backend tsc 0、shared 256/0、backend 1475/0/35。
**W-07 step c — N6 divergent debate scenario 注册 — done（`a63e5db1` + `5bbc8bba` hardening）**
- `topic-selection-debate-scenario-contracts.ts` 加 `createTopicSelectionV1bN6DivergentDebateScenarioContract()`（node_id N6、3 role-stage slot：explorer 默认 2 / 上限 3 fan-out，critic，arbiter 终端单例 `merge_output_as: external_structured_output` → gate-facing draft；无 `temperature`/无 automatic_fallback）。
- **单源不漂移**：scenario `SLOT_IDS = TOPIC_SELECTION_V1B_N6_DIVERGENT_DEBATE_ROLE_ORDER`（从 harness-contracts re-export，无环）；schema test 加 slot-id↔role-order 不变式。lint：在 `topic-selection-llm-invocation-registry.ts` 注册 3 个 prompt-template-id（explorer/critic/arbiter）+ schema_name `topic_selection_v1b_n6_divergent_debate_role_output`，过 invocation-lint。
- **step d1 — N6 divergent profile 注册 — done（`416d725c`）**：`topic-selection-model-profile-registry-service.ts` 加 3 个 `profileBase`（explorer/deep_critic/arbiter，output_contract `TopicSelectionV1bN6DivergentDebateRoleOutput@v1`，镜像 V1A divergent）；3 个 `*_PROFILE_ID` 常量单源于 harness-contracts。d2（context-policy profile）随 step f（消费它的 runtime）co-design，暂缓。

**W-07 step e — N6 debate 触发阈值（node_policy，ADVISORY-CONTRACT）— done（`6eda4f70`）**
- 纯契约/策略数据，无 runtime：升级判定在上游 `n6_loopback_triage` LLM 工件，harness 仅校验/路由（DMP-10 / T-088 D6，无第二判定路径，无 N8 式 compute 函数）。镜像 W-06 N8 块。
- 加：`TopicSelectionV1bN6DebateTriggerThresholds` 接口（weak_blocked_fraction/count、admissible_floor、duplicate_distinct_ratio/overlap_count）+ node-policy 可选字段 `n6_debate_trigger_thresholds` + Zod validator；`N6_DEBATE_THRESHOLDS_PROVISIONAL_PRODUCT_GATE` 常量（镜像 N8，非阻断、需 stakeholder sign-off，W-13 标定前 hold）；N6 node policy 填 `provisional:true` + `n6_debate_thresholds_provisional` tripwire warning；守卫 test（provisional 早翻即红）。阈值→triage prompt 注入 + tripwire emit 留 step f。shared 258/0、backend 1475/0/35、双 tsc 0。
- 续：f N6 runtime+admission（用 `runDivergentLoop` + DivergentDebateStrategy 实现 + per-role context-policy profile〔补 d2〕+ prompt 模板内容 + output schema JSON + 阈值注入 triage prompt + 武装 provisional tripwire）→ g harness hook（`runN6GenerateTopicQuestionCandidates` 升级死端，加法）→ h e2e+N6 replay 守卫 → i matrix（N6 行 reserved→implemented）+T-089 trace。

**W-07 step f — N6 完整运行时 — 计划锁定（2026-06-20 对齐，待开工）**
- 研究（study workflow `wmkkhjty7`）核实:N8 运行时不在 harness 内,而是**独立专用文件** `topic-selection-v1b-n8-bounded-debate-runtime-service.ts`（`runDebate` :195-285）+ `*-n8-bounded-debate-admission-service.ts`;N6 镜像此文件结构,调 `core.runDivergentLoop`（core-service.ts:268）而非 `runLoop`。dead-end 定位:harness-service.ts:3109-3120 + 8628-8638（今仅发 `N6_DEBATE_ESCALATION_RECOMMENDED` warning,无真跑）。
- **加法镜像不变量**:`runLoop`/`generateRoleArtifact` 不动 → N8/v1c byte-identical;arbiter `synthesized_candidate_set` 拆成裸 5-key draft（contracts.ts:1853-1857）→ 走**既有** N6 gate `validateAndBuildN6Candidates`,零新 gate;升级判定仍归上游 triage 工件,harness 只校验/路由（DMP-10 / T-088 D6,f6 落在 D-T127-02 治理下）。
- **五项决策锁定（2026-06-20，用户拍板）**:
  - **D1 prompt 深度** = 骨架（够驱动 codex/mocked e2e + pin `prompt_packet_hash`）;产品级正文**延期到新任务包 T-128**（`topic-selection-prompt-content-authoring`,范围=全选题节点,commit `16f272f9`）。
  - **D2 执行模式** = codex_assisted 统一默认（镜像 N8 的 `codex|mocked` 统一 runtime,provider 非 debate 模式）;测试用 fixture `codex_response` 保确定性,`mocked_llm` 非必需。
  - **D2-调和（→ f0）** = 放开 N6 arbiter 的 codex:修订 d1 的 `topic-selection-model-profile-registry-service.ts:792-796`（arbiter `allowed_execution_modes` 加回 `codex_assisted`、去掉 `run_mode_eligibility.codex_assisted:[]`）,对齐 N8 共享 profile（其 synthesizer 本就许 codex,:739）。**理由（决定性）**:N8 debate runtime 类型为 `codex_assisted|mocked_llm`,arbiter 禁 codex + product 禁 mocked + provider 非 debate 模式 → 三方死锁,codex N6 debate 在 product 下无法出结果。d1 原按 v1a arbiter-final 禁 codex,但 step f 镜像 N8（其 gate-facing synthesizer 许 codex）,放开更忠于镜像。
  - **D3 context profile** = 作为 **f2** 在 f 内落（`resolveRuntimeProfile` miss 即 throw,是 strategy 硬前置;放 d2 会跨切片阻塞）。
  - **D4 schema 粒度** = 最小镜像 N8（`schema_version`+`role_slot` required,`additionalProperties:true`);下游确定性 gate 已强校验 5-key 形状,网关再加严会在 gate 前误拒 explorer/critic 自由文本。
  - **D5 阈值注入** = f 内把 `n6_debate_trigger_thresholds` 作 advisory context 注入 `n6-loopback-triage-runtime-service`;升级仍是 triage LLM 判断;provisional warning 在 harness 步（f6）发射,与 N8 tripwire 同位。
- **子切片序列（data-up,各自独立可发,f0–f5 对运行中 harness 不可见,直到 f6 翻活）**:
  - **f0** 修订 d1:N6 arbiter codex-eligible（model-profile-registry）+ 守卫 test。
  - **f1** N6 role-output JSON schema **body** + 注册回填（今仅 name-registered,无 schema 常量）+ schema test（role_slot enum==ROLE_ORDER、additionalProperties:true）。
  - **f2** 3 个 N6 debate context-policy profile（explorer/critic/arbiter,family `v1b_n6_topic_question_generation` 已存在）+ slot/profile-id 常量 + CONTEXT_PROFILE_BY_SLOT。
  - **f3** `V1bN6DivergentDebateStrategy`(实现全 hook + `instanceCountFor`,从 frozen scenario 取 arity;arbiter hook **必须读 `priorRoleArtifactHashesAll`** 否则 fan-out 身份丢失;`invocationPassthrough` 拒混合 mode)。
  - **f4** `V1bN6DivergentDebateRuntimeService.runDivergentDebate` + arbiter 拆裸 draft + gate bridge（复用既有单 agent draft 路径,保 single-agent 身份）;`loop_transcript_hash` 用 divergent `[slot,arity]` fold。
  - **f5** `V1bN6DivergentDebateAdmissionService`（fan-out admission + forbidden authority keys + transcript 重折比对）——step h replay 守卫的 designed-for。
  - **f6** harness 接线:`n6_debate_escalation` 死端换真实 runtime + 失败回退 `n6_regenerate_candidates`（反震荡,不再升级）+ provisional tripwire 发射(product+provisional)。
- **风险台账（来自研究）**:(1) arbiter 误读 `priorRoleArtifactHashes`（last-wins 折叠丢 fan-out 身份）— f3 单测强制;(2) transcript fold 用错 bounded 公式 → admission 误报 `TRANSCRIPT_DRIFT` — f4/f5 交叉校验;(3) 拆包漏剥 `schema_version`/`role_slot` → `isN6DraftPayload` hasOnlyKeys 全拒 — f4 断言 5-key;(4) LOOP_ID 单常量,补轮复用同 id 致 hash 碰撞 — f4 绑 triage ref/补轮计数（designed-for h）;(5) `resolveRuntimeProfile` miss 须 throw 非 null — f2/f3 测;(6) 勿过建 g/h 的路由矩阵 — f 只做保守 regenerate-on-failure 回退。

### Phase 4 — 工作台收口 / 选项 C（待开工）
### Phase 5 — 阈值标定 / 选项 D（延期尾巴，待语料）
