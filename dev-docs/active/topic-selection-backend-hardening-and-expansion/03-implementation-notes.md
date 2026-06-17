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
| W-12 harness 单文件一次拆透（b1，承 D-T123-03，D-T127-01） | 2 | 核心 | in-progress | D-T127-01；hash-authority + pure-utils + predicates + **parser 簇全抽完(N1–N11 + 2 validators)** 已出壳（harness 12898→12140，golden 守卫绿）；余 resolver 簇收壳 |
| W-07 v1b N6 有界对抗 debate 完整运行时（full a–i，D-T127-02） | 3 | 核心 | planned | 待 |
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

### Phase 3 — 能力扩展 / 选项 B（待开工）
### Phase 4 — 工作台收口 / 选项 C（待开工）
### Phase 5 — 阈值标定 / 选项 D（延期尾巴，待语料）
