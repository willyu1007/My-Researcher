# 04 Verification

> 每项收口的证据在此留痕（命令 + 结果）。回归门沿用 T-127 约定。

## 回归门（每个工作项）
- `tsc -p tsconfig.json --noEmit`：shared + backend 双 0。
- 全后端套件：`apps/backend` `node scripts/run-node-tests.mjs`（基线随 T-127 收口 = **1560/0/35skip**，本包改动不得回归）。
- shared 套件：`packages/shared` `npm test`（基线 267/0）。
- **replay byte-identity 守卫**：harness golden（`GUARD_GOLDEN_N1` / `OPTION_AUTHORITY_GOLDEN`）—— 凡 prompt 正文定稿 / harness-touch 必绿（hash 漂移仅出现在有意定稿处且台账留痕）。
- `topic-selection-llm-invocation-lint`：prompt id/version 对齐绿。
- 治理：`node .ai/scripts/ctl-project-governance.mjs lint --check --project main` 绿。

## 按相位验证期望
- **Phase 0**：治理 sync/lint 绿、`query T-128` 可见、台账覆盖全部非-canary id。
- **Phase 1**：每个被授权 prompt 四要素完备 + 经评审 + version/hash 定稿 + drift 锚点同步 + lint 绿；无机制改动（replay 守卫绿）。
- **Phase 2**：≥1 product-eligible model_option 真解析（无 `MISSING_PROVIDER_MODEL_OPTION`）；product WorkflowScenario + canary 就绪。
- **Phase 3**：一次真实 `run_mode:'product'` 非-debate 端到端跑通；真跑证据 + per-node trace 在此留痕（**核心可达性 sign-off**）。
- **Phase 4**：W-11..W-16 各项闭环证据 + harness-touch JD 链接；全套件 + replay 守卫绿。
- **Phase 5**：维持 provisional + tripwire（W-13 三重防绿）；门控条件登记（≥100 多 provider 语料 + FP<5% + sign-off + 独立 assessor）；**不计入可达性 sign-off**。

### 2026-06-25 · W-13 v1c-N2 + v1c-N4 dead-slot 真 caller 接线
- **v1c-N2**:协调器单测 4/0（happy 经 verified-runtime-draft gate 持久化 + schema_version/forbidden-authority/missing-output 三负例证 admit 被穿）；HTTP 集成测证路由经 coordinator→runtime→admission 触达（422，admit 不绕过）。
- **v1c-N4**:delegated service 单测 5/0（非人 actor fail-fast / park happy 带 provenance 标记 + human_actor 来自请求 / promote 无 reconfirm→409 / promote 有 reconfirm→记 / admit blocker→GATE_CONSTRAINT_FAILED）；2 HTTP 集成测（非人边界经 HTTP 触发 + runtime+admission 经 HTTP 触达）；human-writer + N4 runtime/admission 既有测 18/0（provenance 穿线零回归）；shared schema 套件 267/0（S0 contract）。
- **回归门**:双 tsc **0**、**full backend 1572/0/35**（1564 + 5 S4 + 2 S5 + 1 S3）、replay 不受影响（纯加法、不触 harness，D6=否）。commits `dc9ff27f`/`40cf3e00`（N2）、`ce889186`/`4463dfca`/`3cba7a5c`（N4）。

### 2026-06-25 · W-02 撰写状态台账（Phase 0）
- **产出**：03-implementation-notes「W-02 产出」台账（27 非-canary prompt-template-id × 现状/正文位置/version/hash 锚/标定门控 + 全局结论 + 现状校正 + Phase 1 排序）。grounding `wf_0478aceb`（8 表面簇并行 + 完整性 critic，`allCovered:true`、0 missing/dup/location-错配/门控-分歧）。
- **回归门**：纯文档项,**零代码改动** → 套件/双 tsc/replay byte-identity 守卫均不受影响（无需重跑）。治理 `lint --check --project main` **绿**（仅 T-123/T-115 既有 acceptance-未勾 warning,非本项）。
- **主验证抽验（不盲信工作流）**：3 处承重断言人工核对吻合——N6-divergent 自带 `SKELETON … product-grade authoring is T-128` 注释（divergent-debate-runtime-service:294-295）、`GUARD_GOLDEN_N1` 为 N1-only harness 哈希（workflow-harness-service.unit.test:6990-6997）、v1c promotion-support 系统正文 3 句 + raw stableStringify 用户体（promotion-gate-service:618-633）。
- **关键发现（驱动 Phase 1 验证策略）**：**全 27 个 prompt 正文皆无 per-prompt golden byte-identity 锚** → Phase 1 每项定稿须同事务新增 golden drift 锚,否则 replay 守卫对正文漂移**无覆盖**。

### 2026-06-25 · W-01 治理收口 + W-03 孤儿开口认领（Phase 0）
- **W-01（done）**：registry 注册 T-128（`ctl-project-governance query` 可见，`status:planned/in-progress`，F-001/M-001）；`lint --check --project main` **绿**（仅 T-123/T-115 既有 acceptance-未勾 warning）；T-127 `00-overview` 经核对**已是** `State:done` + 完整移交登记（stale 行已不存在）；T-088 `D-T128-00` JD 开篇已落。
- **W-03（done）**：三孤儿开口认领——`D-T128-01`（N6 升级可达性，W-12）+ `D-T128-02`（P-01 压缩恢复 topic-selection 半边，W-11，跨 T-124）JD 占位落 T-088 `06-joint-decisions.md`（line 1929-1943，承 D-T127-02）；v1c-N2 接线 = W-13 已 done + D6=否 → 核销不开空 JD。
- **回归门**：纯文档 + JD 登记，**零代码改动** → 套件/双 tsc/replay byte-identity 守卫不受影响（无需重跑）。治理 `lint --check` 绿。path-scoped commit（仅 T-128 `00/03/04` + T-088 `06-joint-decisions`，排除全部并行 session 文件）。

### 2026-06-25 · W-04 slice A — arbiter-final + arbiter-issue-frame 产品化（Phase 1）
- **改动**：`topic-selection-need-discovery-debate-loop-service.ts` `arbiterMessages` 按 stage 拆分 + 两 arbiter 系统正文产品化（final 保留 5 安全子句 verbatim + USER 字节不变；issue-frame 弃 batch 语言/丢 output_constraints、保 role_level_summaries）；同文件单测加专用 rendered-text 漂移锚（calls[3]/[4]）。grounding `wf_79f66a5e`。
- **回归门**：debate 单测 **16/16**；双 tsc **0**（backend + shared）；full backend **1577/0/35**（+1 锚测试、0 回归）。replay byte-identity：v1a 无 harness golden 覆盖这些 prompt 正文（已证），新增 2 锚是其**唯一**漂移守卫——非「不破既有 golden」而是「补上原先缺失的守卫」。
- **对抗式 review（agent）**：SHIP-WITH-FOLLOWUP，**0 critical / 2 should-fix**——硬编「cap 5」→ arbiter-context cap；issue-frame signal 字段误归角色 → each-summary。两项已修 + 锚 re-baseline，复跑全绿。
- **slice A 锚值**：`arbiter_issue_frame=1bdbef20…`、`arbiter_final=8ee59593…`（re-baseline ONLY for 有意正文改动）。

### 2026-06-25 · W-04 slice B — generate-need-candidate 产品化（Phase 1）
- **改动**：`topic-selection-generate-need-candidate-orchestrator-adapter-service.ts` `buildMessages` SYSTEM 块加角色 persona + 2 内联 per-field 契约行（纯加法，USER 不变）；同文件单测加 sys/user 双 rendered-text 锚。
- **回归门**：adapter 单测 **14/14**；双 tsc **0**；full backend **1578/0/35**（+1 锚、0 回归）。既有 body matcher（`empty pool…` / `candidate_pool_digest_role` / role_ref_constraints）全绿。
- **对抗式 review（agent）**：**SHIP**，0 critical/0 should-fix，2 nit（1-based 经 validator 强制、字段全吻合）；nit「optional 字段措辞」已修 + re-baseline。
- **slice B 锚值**：`system=16dbcf5d…`、`user=64bf5c63…`。

### 2026-06-25 · W-04 slice C — explorer + deep_critic 产品化（拆 roleMessages，Phase 1）
- **改动**：`topic-selection-need-discovery-debate-loop-service.ts` `roleMessages` 由 instruction-参重构为按 `role` 分支（explorer/deep_critic 各 persona+per-field 契约+边界，generic 3 行共享，USER 不变）；两调用点删 instruction 参；debate 锚测试扩展为 4 角色（`NEED_DISCOVERY_PROMPT_BODY_GOLDEN`）。
- **回归门**：debate 单测 **16/16**（4 锚全绿，arbiter 两锚 hex 字节不变证拆分未扰 arbiter 体）；双 tsc **0**；full backend（slice C 复跑，下方确认）。
- **对抗式 review（agent）**：**SHIP**，0 critical/0 should-fix，2 nit（schema 字段全吻合、两角色 distinct 无串味）；nit「注释 cross-ref」已修（注释-only），nit「只 pin calls[0]」by-construction 安全保留。
- **slice C 新锚值**：`explorer=4bd5b6ae…`、`deep_critic=e66d5a63…`（arbiter 两锚不变）。

### 2026-06-25 · W-04 slice D/E/F — need-adjudication + human-confirmation + evidence-map（Phase 1，W-04 收口）
- **改动**：`topic-selection-v1a-llm-runtime-binding-service.ts` 三构造体 SYSTEM 块纯加法（角色 + per-field 契约；既有反 spoof/advisory 边界 verbatim；D appendix spread 末位 + schema-version const 保留）；binding 单测加 3 system-hash 锚 + D concatenation-lock。
- **回归门**：binding 单测 **6/6**（既有 N5/N7/N8 + N7 `Carry the fixture risk.` appendix 断言全绿）；双 tsc **0**；full backend（D/E/F 复跑，下方确认）。
- **对抗式 review（agent）**：**SHIP**，0 critical/0 should-fix，2 预存 nit 无需修（schema 全准、无软化、3 锚独立重算字节吻合）。详见 03 留痕。
- **slice D/E/F 锚值**：F=`1222d4e3…`、D=`4783f90b…`、E=`b01b05fe…`。
- **W-04 收口**：8 prompt 全产品化 + 各得唯一漂移锚；keystone-first 5 commit（A/B/C/D-E-F）。

### 2026-06-25 · Phase 0 + W-04 深入对抗式审查 + findings 处置（`wf_92ca7f98`）
- **回归独立实跑（reviewer 重跑，非信旧报）= GREEN**:双 tsc **0**、full backend **1579/0/35**、3 单测各自全绿、**3 漂移锚 36/36 复现**、治理 lint 绿、path-scoping 干净。
- **2 实质 finding**:1 confirmed should-fix（连贯性不对称,已修）+ 1 refuted（candidate_need 嵌套误判,对抗式验证驳回为假阳）。10 nit 已分诊（详见 03 深审留痕）。
- **review-followup 处置（已修 + re-baseline + 复验）**:
  - generate-need-candidate 补 cap+诚实边界 + adapter 锚去双包 → `system=4d964a25…`、`user=b1dca968…`。
  - evidence-map(F) 补 `interpretation_payload` → `F=58000ae9…`（旧 1222d4e3 已 superseded）。
  - need-adjudication(D) 补 `gap_codes` + searchplan 措辞 → `D=a0deee32…`（旧 4783f90b 已 superseded）。E 锚不变 `b01b05fe…`。
  - 验证:adapter 14/14、binding 6/6、双 tsc 0、full backend 复跑确认 1579/0/35。
- **登记跟踪（不动）**:N8 review_reason_codes blocked 措辞（预存）、debate 锚 per-message 化（可选）、预存 flaky test（非 W-04，建议另起 de-flake）。

### 2026-06-29 · W-05 Commit 1 — SPLIT-1 早期语义支持 N2/N3/N5 拆分
- **改动**：`topic-selection-v1b-early-semantic-support-runtime-service.ts` 系统内容提取为导出纯函数 `buildV1bEarlySemanticSupportSystemContent`（按 slot_id 分支），messages() 委托；同文件单测加 3 SYSTEM 漂移锚 + cross-slot 不等式 + N3 wiring 断言。
- **回归门**：early-semantic 单测 **5/5**、admission **3/3**（无破）；双 tsc **0**；full backend 复跑确认 1579/0/35（纯函数重构 + 纯加法 prompt）。
- **对抗式 review（agent）**：**SHIP**，0 critical/0 should-fix，1 非-load-bearing nit（N3「handoff」措辞,留）；3 锚 hash 独立重算字节吻合、schema 全准、无字段串味、无软化、无禁-token。
- **锚值**：`n2=2ec0534c…`、`n3=17183102…`、`n5=556edf0c…`。
- **设计要点**：避开 N2/N5 full-fixture rabbit-hole（node_id+完整 payload+mocked output+conditional allOf），改纯函数直接锚 + N3 wiring 断言闭合缺口。

### 2026-06-29 · W-05 Commit 2 — N4 research-slice option-set draft
- **改动**：`topic-selection-v1b-n4-research-slice-runtime-service.ts` 系统内容提取为导出纯函数 `buildV1bN4ResearchSliceSystemContent()`，messages() 委托；同文件单测加 SYSTEM 漂移锚 + closer 子串 + 扩 prompt_packet_hash 自决定性。
- **回归门**：N4 单测 **5/5**、admission **4/4**（无破）；双 tsc **0**；full backend 复跑确认（纯函数 + 纯加法 prompt）。
- **对抗式 review（agent）**：**SHIP-WITH-FOLLOWUP** → 1 should-fix（`confidence` 顶层↔per-option 放反:top-level 无此字段 + additionalProperties:false,per-option 必填 nullable）+ 1 nit（planning_input 限定）**均已修 + re-baseline**。其余 verified clean（全字段/enum 准、边界 verbatim、无禁-token、锚 hash 独立重算吻合）。
- **锚值**：`n4=9006518e…`（修前 df45821a 已 superseded）。

### 2026-06-29 · W-05 Commit 3 — N6 question-candidate-set draft
- **改动**：`topic-selection-v1b-n6-draft-runtime-service.ts` 系统内容提取为导出纯函数 `buildV1bN6DraftSystemContent(hasDecisionMemory)`，messages() 委托（传 `Boolean(contextPacket.decision_memory)`）；同文件单测加**双分支 SYSTEM 漂移锚** + clause 不变式（`with===without+' '+clause`，startsWith + slice 精确）+ 非权威框架/closer 子串。
- **回归门**：N6 单测 **6/6**、双 tsc **0**；full backend 复跑确认 **1582/0/35**（vs 基线 1581，净 +1 锚测试）；纯函数重构 + 纯加法 prompt。
- **对抗式 review（人工）**：**SHIP**，0 critical/0 should-fix；candidate 20 required + question_frame 10 + top-level 5 + falsification 9 字段全覆盖、4 组 enum 字面精确、decision_memory clause verbatim、双锚 hash 独立重算吻合、纯委托、USER 不变、无禁-token。
- **锚值**：`without_decision_memory=c0972b12…`、`with_decision_memory=265d66b7…`。
- **设计要点**：N6 单槽无 harness/replay golden over body → 双锚是其唯一漂移护栏；decision_memory 仅在 hasDecisionMemory 分支追加 verbatim anti-repeat clause。

### 2026-06-30 · W-05 Commit 3 Review follow-up — Bugbot 超范围发现修复（×2，已提交 `ad1aa8c4`）
> Bugbot 在 Commit 3 review 报出 2 个**超本 commit 范围**的既有缺陷（归并行 session，本轮顺修但**不动其文档、不并入 Commit 3**）。
- **发现 1（真缺陷 · 归 `paper-implementation-runtime-orchestration-hardening`）**：`PaperImplementationController` 改为**单依赖对象**构造（21 字段）后，工具脚本 `.ai/scripts/paper-implementation-v1-runnable-replay.mjs` 仍用**旧 11 位置参数**实例化 → 服务错位 + 缺 11 个 runtime service，bootstrap **500**（应 201）；`.mjs` 不过 tsc 故 CI 静默。**修**：补 11 个 `PaperImplementation*RuntimeService` import + 依赖对象构造（未被 V1 route-replay 触达的 runtime AI 节点共用一个 throwing stub orchestrator——构造需要、replay 不触达其端点）。**验**：replay `status:passed` / `blockers:[]`（修前 failed/bootstrap 500）。
- **发现 2（真缺陷 · 归 `topic-selection-v1b-human-review-path`）**：`topic-selection-v1b-controller.ts` `assertHumanRunBinding` 的 frontier 检查含 `&& !humanNode?.latest` 短路 → human node 一旦 admit（`latest` 存在），即便 frontier 已前进，迟到/重复的同-run human 写入仍被放行 → 落 stale attempt 污染 run。**修**：删 `&& !humanNode?.latest`，frontier 严格只认 `next_node_id`（retry/loopback 因 next_node_id 仍指向自身而通过；coordinator `getRunState` 投影由 lastCompleted 的 invoke_next 边即时派生 next_node_id，admit 即前进）+ 更新注释。**测**：integration coordinator e2e 在 N5 admit 后加 frontier 回归断言（late 同-run + 正确 N4 target → 409 `VERSION_CONFLICT` "is not awaiting"；既有 `wrongTarget` 仅覆盖 upstream-authority-mismatch 分支，frontier 分支此前**零覆盖**）。
- **回归门**：双发现 backend tsc **0**、coordinator e2e 单测绿、full backend **1617/1582/0/35**（净 +1 frontier 锚测试，无回归）；replay `passed`。**已提交 `ad1aa8c4`**（单 commit，4 文件，仅本轮改动）。

### 2026-06-30 · W-05 Commit 4 — N6 loopback-triage support
- **改动**：`topic-selection-v1b-n6-loopback-triage-runtime-service.ts` 系统内容由 5 行骨架提取为导出**无参纯函数** `buildV1bN6LoopbackTriageSystemContent()`，messages() 委托；同文件单测加**单 SYSTEM 漂移锚** + 非权威框架/closer 子串 + **3 个 conditional 分支镜像子串**，并扩 self-determinism（补 `prompt_packet_hash` + `runtime_invocation_context_hash` first===second）。
- **回归门**：N6-loopback 单测 **7/7**（+1 单锚 + 扩自决定性 + 既有 5）、双 tsc **0**（backend + shared）；full backend 复跑 **1618/1583/0/35**（vs 上轮 1617，净 +1 锚测试，无回归）。纯函数重构 + 纯加法 prompt（骨架→产品级），无新字段/schema/harness。
- **对抗式 review（人工）**：**SHIP**，0 critical/0 should-fix；8 required 全覆盖（loopback_target_code 3 enum / failure_scope 4 enum / dominant_reason_codes ≥1 / affected_refs ≥1 supplied / regeneration_hints / debate_escalation object-null / upstream_rollback object-null / rationale）、**3 个 allOf conditional 分支精确镜像**（每 target → failure_scope 子集 + debate_escalation/upstream_rollback 的 object-vs-null）、debate_level 2 enum + upstream_rollback 2 const 字面精确；admission 用合成 fixture（非 messages 派生）零破；无禁-token（self-determinism 过证 buildPromptPacket 未拒包）。
- **锚值**：`n6_loopback_triage=142e31fe…`。
- **设计要点**：N6-loopback 单槽无 harness/replay golden over body → 单锚是其唯一漂移护栏；正文**无条件分支**（不依赖 contextPacket flag）故单锚；conditional 镜像子串额外钉住 schema allOf 的 prose 表达。**已提交 `2f06fb99`**（4 文件，+92/−12）。

### 2026-06-30 · W-05 Commit 5 — N7×3 support SPLIT-2（W-05 收口）
- **改动**：`topic-selection-v1b-n7-support-runtime-service.ts` messages() 由单一通用 5 行骨架重构为按 `binding.slot_id` 分支的导出纯函数 `buildV1bN7SupportSystemContent(slotId)`（SPLIT-2，同 SPLIT-1 结构）；3 slot 产品级 per-field（candidate-grouping 6 / failed-trial 5 / admission-review 5）+ 共享尾 verbatim。同文件单测加 **3 per-slot 漂移锚** + cross-slot 不等式 + 共享尾子串 + admission **2 enum 字面** includes + grouping/failed_trial 不含 debate_level，新增 **2 个 directly-invoking slot 测试**（failed_trial + admission），扩 byte-stable 加 `prompt_packet_hash`。
- **回归门**：N7 单测 **8/8**（+1 anchor + 2 新 slot + 扩自决定性 + 既有 5）、N7 admission **4/4**（无破）、双 tsc **0**（backend + shared）；full backend 复跑 **1621/1586/0/35**（vs 上轮 1618，净 +3 = anchor + 2 新 slot，无回归）。纯函数重构 + 纯加法 prompt（骨架→产品级），无新字段/schema/harness。
- **对抗式 review（人工）**：**SHIP**，0 critical/0 should-fix；3 slot 逐字段精确镜像各 schema（6/5/5 required 全覆盖）、admission `compact_assessment_debate`/`provider_diverse_deep_debate` 2 enum 字面 + debate-level rubric 精确（驱动真 N8 execution-plan 成本）、共享尾 verbatim、cross-slot 隔离；admission 用合成 fixture 故 N7 admission 零破；无禁-token（self-determinism 过证 buildPromptPacket 未拒包）。
- **锚值**：`grouping=5341c315…`、`failed_trial=c013e630…`、`admission=a91ad1dc…`。
- **设计要点**：N7 三槽无 harness/replay golden over body → 3 per-slot 锚是其唯一漂移护栏；admission slot 的 2 enum 字面是 N8 成本高价值护栏。**W-05 收口**：9 槽全产品化（5 commit C1–C5）、各得唯一漂移锚、2 共享构造体拆分（SPLIT-1 early-semantic + SPLIT-2 n7-support）。

### 2026-06-30 · W-06 Commit 1 — #24 v1c promotion-decision-support
- **改动**：`topic-selection-v1c-promotion-gate-service.ts` system content 由 3 行骨架（内联于 `invokeStructuredOutput`）提取为导出纯函数 `buildV1cPromotionDecisionSupportSystemContent()`，system message 委托；产品级正文镜像 `TopicSelectionPromotionDecisionSupportLlmDraft@v1` 5 字段（summary/reviewer_questions/risk_notes/recheck_notes/dossier_markdown）+ 非权威边界 + ref 纪律。同文件单测加 **1 单漂移锚** + 5 字段镜像子串 + 4 类非权威边界子串（不决 disposition / 不授权 promotion / HumanPromotionDecision / PromotionCommitmentProfile / PaperProjectBridge）+ ref 纪律子串（never invent refs, hashes）。
- **回归门**：promotion-gate 单测 **18/18**（+1 anchor，既有 17 含 LLM-draft/admission/replay/migration 无破）、backend tsc **0**；full backend 复跑 **1622/1587/0/35**（vs 上轮 1621/1586，净 +1 = anchor，无回归）。纯函数重构 + 纯加法 prompt，无新字段/schema/YAML。
- **对抗式 review（人工）**：**SHIP**，0 critical/0 should-fix；5 字段全镜像、非权威边界穷举（7 authority 对象 + promote_allowed + automation）、ref/hash 纪律精确；schema **未动**（5 字段本无 per-field description，薄 prompt 是唯一自然语言引导）；YAML `description` 仍准确未动；旧正文无 .test 钉（grep 仅命中 service + YAML description），改正文断 0 既有断言。
- **锚值**：`promotion_decision_support=a164d8ac…`。
- **设计要点**：v1c promotion-support 单槽无 harness/replay golden over body → 单锚是其唯一漂移护栏；正文无条件分支故单锚。**已提交 `87d35d9f`**。

### 2026-06-30 · W-06 Commit 2 — #26 v1c delegated-promotion-decision
- **改动**：`topic-selection-v1c-n4-delegated-promotion-decision-runtime-service.ts` `messages()` 的 5 行 partial system content 提取为导出纯函数 `buildV1cN4DelegatedPromotionDecisionSystemContent()`，`messages()` 委托；产品级正文镜像 `TopicSelectionV1cDelegatedPromotionDecisionCandidate@v1` 10 decision enum + 3 conditional 分支 + loopback 7 值 + 3 const confirm + key preserve + per-field + 非权威边界。同文件单测加 **1 单漂移锚** + decision/conditional/loopback 整句 match + const/per-field/边界/ref 子串。
- **回归门**：N4 delegated runtime 单测 **4/4**（+1 anchor，既有 3 含 happy/drift/oob 无破）、backend tsc **0**；full backend 复跑 **1623/1588/0/35**（vs 上轮 1622/1587，净 +1 = anchor，无回归）。纯函数重构 + 纯加法 prompt，无新字段/schema/YAML。
- **对抗式 review（人工）**：**SHIP**，0 critical/0 should-fix；10 decision enum + 3 conditional（conditions minItems/maxItems + loopback null-vs-enum）精确镜像 schema allOf、3 const confirm + key preserve + per-field 全覆盖、非权威边界 verbatim；runtime/admission 经 mocked_output/合成 fixture 故零破；schema/YAML 未动。
- **锚值**：`delegated_promotion_decision=168804f2…`。
- **设计要点**：v1c delegated 单槽无 harness/replay golden over body → 单锚是其唯一漂移护栏；3 decision 分支均 verbatim 同一正文故单锚。**已提交 `c8a995f1`**。

### 2026-06-30 · W-06 Commit 3 — #27 v1c downstream-feedback-normalization（W-06 收口）
- **改动**：`topic-selection-v1c-n6-feedback-normalization-runtime-service.ts` `messages()` 的 5 行 partial system content 提取为导出纯函数 `buildV1cN6FeedbackNormalizationSystemContent()`，`messages()` 委托；产品级正文镜像 `TopicSelectionV1cDownstreamFeedbackCandidate@v1` 全 15 required + 3 enum 穷举（source_kind 6 / severity 4 / feedback_signal 13）+ normalization_hints 4 子字段 + record-only 边界。同文件单测加 **1 单漂移锚** + 3 enum 整句 match + hints/边界/ref 子串。
- **回归门**：N6 feedback-norm runtime 单测 **6/6**（+1 anchor，既有 5 无破）、backend tsc **0**；full backend 复跑 **1624/1589/0/35**（vs 上轮 1623/1588，净 +1 = anchor，无回归）。纯函数重构 + 纯加法 prompt，无新字段/schema/YAML。
- **对抗式 review（人工）**：**SHIP**，0 critical/0 should-fix；15 required 全镜像、3 enum 穷举精确、normalization_hints 4 子字段、record-only/no-upstream-mutation 边界 verbatim；runtime/admission 经 mocked_output/合成 fixture 故零破；schema/YAML 未动。
- **锚值**：`downstream_feedback_normalization=e16ced58…`。
- **W-06 收口**：3 surface 全产品化（C1 #24 / C2 #26 / C3 #27），各得唯一漂移锚；schema/YAML 零改动。**Phase 1 v1c 非-debate prompt 收口**（#25 门控→W-18）。**已提交 `06ceb295`**。

### 2026-07-01 · W-06 Review follow-up — prompt↔admission 契约对齐（订正上方三段「0 should-fix」）
> 复检判定：上方 C1–C3 对抗式 review **仅对照 schema（含 allOf），漏查各 surface admission service 的业务校验**（prompt 输出的真实下游验收者）。重审 admission 后定位 **6 处 prompt↔admission 漂移**——prompt 会引导 LLM 产 *schema 合法但 admission 拒* 的 candidate。**非安全/非正确性 bug**（admission fail-closed 拦截、既有负例测试已证拦截、系统安全），属**产品质量缺陷**（降首跑 admission 通过率 + 重试浪费）。
- **#26 delegated（3 should-fix）**：① non-promote `loopback_target` 实为 decision→target **唯一映射**（`LOOPBACK_TARGET_BY_DECISION`：merge_packages/refine_package→package、reassess_value→value、revise_question→question、revise_slice→slice、recheck_evidence_or_search→evidence_or_search、park→park、drop→none），原正文「7 选 1」误导；② promote-class 须 `required_actions` 空（admission `loopback||required_actions` 双拒）；③ non-promote（除 park/drop）须 `required_actions` 非空。→ 正文句 4-5 重写。
- **#27 feedback-norm（3 should-fix）**：① `downstream_source_kind` 须 echo source（admission `candidate!==source` 即拒），原「6 选 1」误导；② `required_action` 有无由 feedback_signal/policy 定（recheck-producing→非空、no_recheck_needed→null），原「string-or-null」未绑定；③ `normalization_hints` 须匹配确定性 policy（requires_recheck_hint===policy、loopback_target_hint/affected_ref_hint null-or-policy），原「advisory-only」误导。→ 正文句 3-5-6 重写。
- **#24 promotion-support（1 nit）**：5 字段本全 optional，原仅 dossier_markdown 单标「optional」易令 LLM 误判其余必填 → 补「Every field is optional」统句 + 去单标。（#24 无 admission 字段约束，仅措辞。）
- **锚 re-baseline**：`#24=0eefd9f0…`（原 a164d8ac）、`#26=271c75b5…`（原 168804f2）、`#27=49e23cc7…`（原 e16ced58）；3 test 各加契约断言钉新约束（promote-class required_actions 空 / non-promote loopback 映射 / source_kind echo / required_action 绑定 / hints 匹配 policy / 全 optional）。
- **复跑**：3 runtime/service 单测 **28/28**、ReadLints **0**、全量 typecheck **0**；full backend **1624/1589/0/35**（3 test 仅改断言未增 test 数，与 W-06 收口同，无回归）。**已提交 `9d457c64`**。

### 2026-06-25 · W-05 study + plan（未起 code）
- **产出**:grounding `wf_e093ee2d`（4 簇深读 9 槽 + plan，`allCovered:true`）→ `03`「W-05 计划」5-commit 路线（2 共享构造体拆分 + golden 策略 + must-preserve + 禁-token + 各 schema enum 核验）。SPLIT-1 production 正文已设计+schema 核验后**回退**（保持工作树干净）,gating=N2/N5 测试 fixture。
- **回归门**:无 code 改动 → 套件/tsc 不涉。基线维持 full backend **1579/0/35**。

### 2026-07-01 · W-07 — #9 resource-sampling-classification（Phase 1 收口）
- **改动**：`topic-selection-resource-sampling-service.ts` `classificationRequest()` 的 6 行 partial inline system content 提取为导出纯函数 `buildResourceSamplingClassificationSystemContent()`，system message 委托；产品级正文镜像 `TopicSelectionResourceSamplingLlmOutput@v1` 全 7 required（literature_ref copy / primary_role 6-role 完整语义含 review+excluded / topic_relevance·confidence·role_scores 各 [0,1] / evidence_polarity 7 enum 对齐 role）+ 3 optional（exclusion_reason↔excluded / review_reason↔review / method_families）+ 契约名。同文件单测加 **1 单漂移锚** + 6 role/7 polarity/范围/optional 配套/copy-verbatim/契约名子串。
- **回归门**：resource-sampling 单测 **16/16**（+1 anchor，既有 15 全绿）、ReadLints **0**、backend tsc **0**；full backend 复跑 **1625/1590/0/35**（vs 上轮 1624/1589，净 +1 = anchor，无回归）。纯函数重构 + 纯加法 prompt，无新字段/schema/YAML。
- **下游核对（替 admission）**：resource-sampling 是 single-agent **无 admission**；下游 `applyGuardrails` `clampUnit` 限 [0,1]、`normalizeRole`/`normalizeEvidencePolarity` 兜底、excluded→exclusion_reason·review→review_reason 配套、`detectDeterministicRoleSignals` 强信号纠偏（非拒绝）——prompt 引导（[0,1]、primary↔scores、配套 reason）与 guardrail 期望一致，无契约漂移（吸取 W-06 教训主动核对下游消费者）。
- **锚值**：`resource_sampling_classification=a91aac9c…`。
- **W-07 收口**：单件 #9 partial→产品级，得唯一漂移锚；**Phase 1 非-debate prompt 全收口**（W-04 v1a + W-05 v1b 非-debate + W-06 v1c + W-07 资源采样）。下一步 → Phase 2（W-08 live-surface 分类 / W-09 产品跑使能）。**已提交 `edf7e27a`**。

### 2026-07-01 · Phase 1 闭环审查 — P0 #8 arbiter-final prompt↔gate 对齐
> 整体闭环审查（2 对抗式子代理用 W-06 盲区模式复查 W-04/W-05 共 17 prompt + 亲核下游 gate）确认：W-06 的「prompt 仅对照 schema（含 allOf）、漏对照下游 gate 业务校验」盲区是**系统性**的，W-04/W-05 同存同类 prompt↔gate 漂移（去噪后 ~13🔴+~16🟡，子代理原报 ~60 条含约半数噪音/低优先）。最高 blast-radius = **#8 arbiter-final**（debate 路径唯一 external NeedCandidate feed，与孪生 single-agent #2 共用 RankedCandidateDraftBatch validator+admission，但 prompt 约束显著弱于 #2）。本段先收 **P0 #8**。
- **改动**：`topic-selection-need-discovery-debate-loop-service.ts` `arbiterMessages` final_synthesis system 9→13 句（role-bundle 安全句 verbatim 保留、USER 3 条 load-bearing 约束 byte 不变），补 4 句镜像 validator+admission 强校验：① identity echo（batch.schema_version=node_input.schema_version、draft_batch.node_attempt_id=node_input.node_attempt_id，validator:74/81）+ terminal_result=finalize 须有 admissible draft（validator:109）；② scope_notes 非空 + speculative=false 默认（admission:169）；③ rank contiguous 1..N（validator:184）+ candidate_need(distinct unmet_need_statement / mechanism_type / prior_art_status / ≥1 gap_code，validator:211）；④ 每 draft support|challenge≥1（admission:151）+ strength_assessment_refs≥1（validator:203）+ prior_art already_solved/falsified 丢弃不排名（admission:157）。
- **identity echo 有据非臆造**：debate `node_input` 类型 = `TopicSelectionGenerateNeedCandidateNodeInput`（debate-loop:97，与 #2 同），含 schema_version/node_attempt_id 且 USER 已注入（:1070）LLM 可见；final batch 走同一 ranked-batch validator。
- **回归门**：debate 单测 **16/16**（+8 final system 子串断言钉 4 子句的 8 处措辞，0 新增 test 数）、ReadLints **0**、backend tsc **0**；full backend **1625/1590/0/35**（断言增强未增 test 数，与 W-07 收口同基线，0 回归）。
- **锚 re-baseline**：`arbiter_final=76f32df7…`（原 `8ee59593…`）。
- **范围说明**：本次仅 P0 #8；P1（W-05 N4/N6 draft + W-04 #2/#1/#3，~9🔴+~11🟡）与 P2（低优先）已在闭环报告分级登记，**本次未实施**——建议立「Phase 1.5 prompt↔gate 一致性收尾」或并入 Phase 3 真跑前置。**已提交 `69b42b4a`**。

### 2026-07-01 · Phase 1.5 — prompt↔下游 gate 一致性收尾（P1 批量 + P2 文档）
> 承 P0 #8，用户「按建议实施」。逐 prompt **亲核真 gate 的 file:line** 后补最小加法句 + 锚 re-baseline + 子串断言双护栏。全程纯加法 prompt，无新字段/schema/harness/registry。
- **#12 N4**（gate `topic-selection-v1b-harness-n4.ts:n4DraftGateBlocker`）：+1 句镜像 6 blocker（source_validated_need_refs echo:159 / boundaries 双非空:166 / target_community aligns:173 / non_goal⊆excluded:180 / evidence refs:188 / claim_ceiling≠exceeds:207）。锚 `9006518e…→c1113299…`，+5 子串断言；N4 单测 **5/5**。
- **#14 N6-draft**（gate `topic-selection-v1b-workflow-harness-service.ts:n6CandidateSemanticBlocker`:9015 + candidate-cap）：+2 句镜像 9 校验（candidates≤5 / answerability 限 2 值:9019 / main_question `isSpecificQuestion`:9037 / traceability 四角色非空:9043 / answerability_plan 4 字段非空:9049 / claim_ceiling:9060 / observable 非空:9070 / falsification 非弱:9076）。双锚 `c0972b12…/265d66b7…→664737f4…/1acbbaa4…`，+9 子串断言；N6 单测 **6/6**。
- **#1 evidence-map**（gate `topic-selection-evidence-map-materialization-service.ts`）：+2 句镜像 lineage echo（8 draft 字段回显 handoff+node_input，`validateLineage`:135-150，**确认 lineage 为 LLM-produced 非 harness 注入**）+ source_attribution_kind≠llm_inference:243 + locator.literature_ref 一致:277。锚 `58000ae9…→5f8a2082…`，+3 子串断言。
- **#3 need-adjudication**（gate `topic-selection-workflow-harness-service.ts:validateNeedAdjudicationRecommendationGate`:5859——**LLM recommendation 专用 gate，区别于 human `adjudicateNeed` 写入路径**）：+1 句镜像 return_to_candidate **无条件** required_actions:5882 + merge **self-ban**:5922 + reject rejected_reason:5903 + park required_actions|rationale:5932。锚 `a0deee32…→1fe8bf8b…`，+3 子串断言。**方法论价值**：初判 prompt(586-591)已含条件式 required_actions 疑无漂移；亲核真 gate 后确认 2🔴 未表达——印证「必读下游 blocker file:line，勿凭 schema/prose 直觉」。#1+#3 合于 v1a-binding 单测 **6/6**。
- **#2 generate-need — 去噪 cancelled**：核 `need-discovery-debate-loop-service.ts` 仅 4 messages 函数（roleMessages×2 + arbiterMessages×2）→ #2 **无独立 prompt**，输出契约=#8 `RankedCandidateDraftBatch`；B 清单三条（strength≥1 / prior_art 拒 / support·challenge）已被 P0 #8 补句完全覆盖（validator evidenceRefs≥1:195 / strength≥1:203 / gap_codes≥1:211 + admission prior_art:157）。
- **回归门**：ReadLints **0**、backend typecheck **0**；full backend **1625/1590/0/35**（与 W-07/P0 同基线，纯断言增强未增 test 数，**0 回归**）。4 锚 re-baseline byte-identity + 子串断言双护栏；USER key 集/load-bearing 断言 byte 不变。
- **P2 文档闭环**：`03` 台账表 21 非门控 prompt 现状列 partial/skeleton→product-grade + 锚 + 正文位置改稳定纯函数名（消除「锚一律 NONE」+ 旧 file:line stale）；`ad1aa8c4` 两跨任务 defect 在 owner task（`paper-implementation-runtime-orchestration-hardening` 发现1 / `topic-selection-v1b-human-review-path` 发现2）补交叉引用留痕。
- **提交**：W-05r（N4+N6）`8bf73078` / W-04r（#1+#3）`39169a42` / docs（本段 + 台账回填 + owner 留痕）本次 docs commit。

### 2026-07-02 · Phase 2 — live-surface 分类核对 + 产品跑使能
> 用户「开始实施 phase 2」。现状探查超预期（W-08 核心已达标、W-09 registry+v1a 已就绪）；ready-only + doc-plus-canary + verify-only。
- **W-08 核对**：`topic-selection-workflow-matrix-consistency.unit.test.ts` **2/2**；脚本 `--self-test` 注入漂移全检出（deleted v1b slot / flipped codex / renamed v1c）；矩阵 `docs/context/process/topic-selection-workflow-matrix.md` ↔ 代码权威源集合相等，**无 re-fork**。分类/policy 无空洞。结构化硬化留 T-089。
- **W-09b/c canary product tier**：`provider-canary-service.ts` constructor `runMode`（默认 acceptance 不变）+ 8 处 run_mode 参数化 + evidence `run_mode` 字段（取 provenance，证穿透）。5 新 product-tier 单测（v1a / v1b N4·N6·N8 / v1c N2·N4·N6 / resource-sampling）证 `run_mode:'product'` 下 succeeded + `evidence.run_mode==='product'` + provider_call_count=2 + model_option 正确（StubGateway，无 live provider）；+1 acceptance 默认回归。provider-canary 单测 **41 pass / 16 skip（live-gated 无 key）/ 0 fail**。
- **W-09 model_option 可解析**：registry `resolveProfile({run_mode:'product',provider_llm})` 全 profile 成功；唯一 product 分支=拒 mocked_llm（orchestrator:426/1622）。**无 `MISSING_PROVIDER_MODEL_OPTION`**。
- **回归门**：ReadLints **0**、backend typecheck **0**；full backend **1630/1595/0/35**（Phase 1.5 基线 1625/1590/0/35 → **+5 pass 0 fail 0 回归**，新增即 5 product-tier 单测）；skip 恒 35（无 key live-gate）。product 场景+canary **就绪**，真跑留 Phase 3（W-10）。
- **提交**：code+test `07fc019d`；docs（本段 + 台账回填）本次 commit。

### 2026-07-02 · Phase 1.5 补刀 + W-08 协调项收口（审查驱动）
> 外部对抗式提交审查复核 Phase 1.5/2 五 commit（`8bf73078`/`39169a42`/`69b42b4a`/`edf7e27a`/`07fc019d`）：4 SOLID / 1 MINOR，MINOR 即本次补刀对象。用户「从第一项开始实施」。
- **#14 N6-draft falsification 全称量词**（gate `v1b-workflow-harness-service.ts`:9076 `.some(n6FalsificationConditionWeak)` + 弱定义 `harness-n6.ts`:230-238）：prompt「at least one non-weak」（存在量词）→「give at least one falsification_condition and make every falsification_condition non-weak (…)」+ 正面镜像非弱四条件（statement≥24 字符 / ≥1 trigger_evidence_ref|trigger_source_ref / related_contract_fields 非空 / expected_action 非空；单弱 block 整候选）。双锚 `664737f4…/1acbbaa4…→28e7932b…/e657ae03…`，falsification 子串断言 **1→5**（断言旁注 gate file:line）；N6 单测 **6/6**。commit `3af583be`。
- **W-08 协调项（T-112 matrix reconcile）落盘**：工作树既有修订（canary=「acceptance 能力代理，非生产运行时」×6 处 + v1c-N2 per-role-class `schema_version` admission-pin NOTE ×5 处）经代码核证准确——pin 仅存在于 admission service（grep `-role.v1|-final.v1` 全库仅 admission+test 命中）、provider 侧 runtime/prompt 零发射；修正一处口径：W-13 后 codex_assisted coordinator route（`POST /topic-selection/v1c/promotion-decision-support/bounded-debate`）已是生产调用方（operator-supplied 输出须自带 pinned version 过 admit），「无生产调用方」限定到 provider_llm 路径。commit `fbf65d01`。
- **工作树卫生（随行）**：shared barrel 值面测试自维护化（41 硬编码 namespace import → 运行期解析 index.ts export-star + 动态 import 并集，≥40 守卫；shared **267/0** 计数不变）commit `ac95db7c`；`.gitignore` 加 `*.tsbuildinfo`（`packages/shared/tsconfig.tsbuildinfo` 纳入忽略）commit `4be670f2`。
- **回归门**：backend & shared tsc **0**；N6 单测 6/6；shared **267/0**（两次独立复跑）；**full backend 1630/1595/0/35**（与 Phase 2 基线逐字一致，纯措辞收紧未增 test 数，**0 回归**）；governance lint **passed**（仅既有 T-123/T-115 acceptance-criteria warning，历史登记 non-blocking）。
- **提交**：fix `3af583be` / matrix docs `fbf65d01` / shared test `ac95db7c` / chore `4be670f2` / docs（本段 + 03 补刀段 + 台账 #14 锚更新 + W-08 协调项收口注）随本次 docs commit。

### 2026-07-02 · Phase 3 — W-10 首次真实产品跑（核心可达性 sign-off）
> 用户「完成后进入 W-10」授权（真实 provider 花费经确认;语料池 410 条中间档经用户选定）。**run9 passed** = Acceptance「一次真实 `run_mode:'product'` 非-debate 端到端跑通,证据 + trace 留痕」达成。
- **最终通过跑**：`t128-w10-product-run9-1782995163`（`pnpm topic-selection:real-e2e`,dashscope/qwen3.6-plus,`LLM_TIMEOUT_MS=420000`,复用采样集 `resource_sample_set_a852ffb2…`）。工件 `.ai/.tmp/topic-selection-real-e2e/t128-w10-product-run9-1782995163/`（00 采样 / 01 选文 16 条 4/4/4/4 角色平衡 / 02 v1a / 03 v1b harness 日志+摘要 / 04 v1c / 05 intake / 06 downstream / 90 summary **passed**）。
- **产品身份证据**：v1a generate `harness_trace_snapshot.run_mode==='product'`、`execution_mode==='provider_llm'`、scenario assertions 全过（execution_mode/node_attempt/persistence-after-finalize/routing `finalize_with_admitted_batch`/min 计数）、3 persisted candidates;v1c `paper_project_bridge_d956e811…` **active** 带 `bridge_payload_hash`;downstream 13 feedback/12 recheck 含 400/409 负例断言。
- **九跑取证台账**（详见 `03` Phase 3 段）：run1 资源池空（6 月清理副作用,410 条经产品 scope API 重挂）→ run2/3 设置行旧 OpenAI key（settings-first 无 401 回退;产品 PATCH 刷新）+ **F2 token target 校准**（`literature_classification_batch` 24000→40000,实测 32,632;P-01 缺位使 requires_compression=fail-closed,「W-11 不阻塞 W-10」以校准债形式被证伪）→ run4 过采样、count 期望钉死 1 vs 真模型 5（**F3** provider 模式 min 形态,harness 契约原生支持）→ run5/6 OpenAI 5xx 窗口（TransientError;双 provider 探测后切 dashscope;**健壮性登记**:分类循环无批级重试）→ run7 v1a+v1b 通,**F4 `v1b_to_v1c_bundle_hash_drift`**（harness N11 4 字段异名键 vs route/v1c 5 字段,结构性永不相等;单源化 `hashV1bToV1cBundle` 三处消费 + 形状钉测,**JD `D-T128-03`** 于 T-088 `06-joint-decisions.md`）→ run8 qwen thinking 180s 超时（参数 420s）→ **run9 passed**。
- **回归门**：backend tsc **0**;authority-hash 单测 **7/0**（+1 形状钉测）;harness+v1c-promotion-input+topic-package 三套件 **123/0**（harness goldens 完好=byte-identity 维持,bundle_hash 变化仅及新 run）;**full backend 1632/1597/0/35**（Phase 2 基线 1630/1595 → +1 TSCP 回归测 +1 形状钉测,0 fail）;governance lint passed。
- **提交**：F4+JD `ef62a56f` / F2 校准 `948fa3c9` / F3 脚本 `0dfed952` / F1 TSCP id `9fb04a26` / docs+状态翻转 `f5aaab27`。

### 2026-07-02 · Phase 4 — W-11 压缩恢复 topic-selection 半边（D-T128-02 回填落地）
> 用户「进入 Phase 4，先做 W-11」授权。P-01 恢复分支 + 首个消费方落地；T-123 D3 孤儿回归确认以钉测集合完成。
- **S1 orchestrator**（`41ac51b3`）：恢复分支单测 3 新增——成功续跑（gateway 实收压缩消息、`COMPRESSION_APPLIED`+`COMPRESSION_REPORT_RECORDED` 传播、post-gate `within_budget`、报告工件 quality_gate=passed）/ 压缩后仍超（`TOKEN_BUDGET_OVER_LIMIT_AFTER_COMPRESSION`，零 provider 调用，报告 refs 在 provenance）/ 质量门 blocked 不可恢复（掉必留事实时即便供有合尺寸压缩消息仍 fail-closed）。orchestrator 套件 **25/25**（22 既有钉测含 :891 over-budget 前置拦截 / :945 记录报告仍 block / :993 掉事实 block 全部原样）。执行尾逐字抽取 `finishInvocation`,两形态共用同一管线。
- **S2 resource-sampling**（`cb5479ef`）：采样套件 **17/17**——16 既有测试零改动全绿（预算内 attempt 被 gate 忽略=零行为改证明）+1 穿透恢复测（双 ~200k 字符胖 digest 候选 → requires_compression → provider 实收 `key_content_digest:null` 压缩形态 → 分类成功、无 `LLM_CLASSIFICATION_FAILED` → `TopicSelectionCompressionReportEnvelope@v1` 工件落控制面）。
- **兄弟套件**：compression-runtime + token-budget-gate **27/27**（quality-gate/decide 语义未动）。
- **回归门**：backend tsc **0**；**full backend 1639/1604/0/35**（注：本跑包含共居工作树中并行 chip 会话未提交的 research-lifecycle 修复 +3 测；本包自身增量 = 恢复分支 3 + 采样穿透 1 = +4，0 fail 对两条工作流同时成立）。
- **JD**：`D-T128-02` 占位回填（grounding/S1/S2/不改动边界/回归口径/事故记录）于 T-088 `06-joint-decisions.md`，随 `41ac51b3` 提交。
- **事故留痕**：首次落地的未提交编辑于 2026-07-03 22:14 被本目录外部 `git reset` 清除（chip 会话引导副作用；reflog `reset: moving to HEAD`）。已全量重放；此后每步即改即提交。**后续注意：启动 chip 会话前确认主工作树干净；共居期间禁用 `git add -A`。**
- **遗留（登记不做）**：paper-implementation 侧 caller 启用归 T-124；N6/N8 debate 压缩-facts builder 在恢复下游跟做；采样分类**批级重试**（W-10 run5 TransientError 教训）仍为 Phase 4 独立小项。

### 2026-07-03 · Phase 4 — W-R1 采样分类批级重试
> W-10 run5 教训收口（用户批准的 Phase 4 优先序①）。纯采样服务内改动，无 harness/orchestrator/debate-core 触碰，无需 JD。
- **行为**：批级有界重试（默认 2 次、退避 1.5s/3s，`classificationRetryPolicy` 可注入）+ 每 attempt 独立 `.retry_N` node/invocation attempt id + 部分批容忍（失败批候选单独 `LLM_CLASSIFICATION_FAILED` review-block，余批存活，新 warning `LLM_CLASSIFICATION_PARTIAL`，`output_summary.classification_batches` 统计）+ 全败保留 legacy fail-closed（blocked + `LLM_CLASSIFICATION_FAILED`）。
- **测试**：采样套件 **20/20**（17 既有零改动 = 成功路径不变证明；+3：瞬态恢复 3 调用含 retry 后缀断言 / 单批永久失败 4 调用 PARTIAL+`ready_with_warning`+存活批选样 / 全批失败 6 调用 legacy blocked）。
- **回归门**：backend tsc **0**；**full backend 1642/1607/0/35**（前基线 1639/1604 含 chip 会话已入库的 research-lifecycle +3 测；本项 +3，0 fail）。
- **提交**：feat `28da56a4` / docs 本段随本次 docs commit。

### 2026-07-03 · Phase 4 — W-12 N6 升级可达性（D-T128-01 回填落地）
> 用户「继续W-12」。grounding 先行修正占位声明（构建/记录/debate 穿线/runtime 消费/升级 e2e/marker 复用均已在），真残余三项全落。
- **(A) 单代理再生穿线**：`n6RegenerateProjectionOpts` presence-based extraProjection（regenerate 判别、most-recent、`buildNextRequest` 零改动、初次进入 byte-identical）。commit `06b01b1f`。
- **(B) 幂等负例**：+3 测——再生穿线（retry 带 projection ref/首入不带）/ 最近优先+跨路由隔离（escalation projection 永不误附单代理路径）/ crash-mid-debate 干净重跑（无 marker 即重跑、恰一 marker、admit 新 draft；`throwError` 首用，补齐 completed→rejection 复用测的另一半窗口）。
- **(C) 契约文档化**：coordinator `node_inputs` 契约块 + JD `D-T128-01` 回填 `e819d919`。
- **回归门**：coordinator **48/48**（45 既有零改动）；backend tsc **0**；**full backend 1645/1610/0/35**（W-R1 基线 1642/1607 → +3，0 fail）；harness 本体零改动（goldens 天然不受扰）。
- **提交**：JD 回填 `e819d919` / feat `06b01b1f` / docs 本段随本次 docs commit。

### 2026-07-03 · Phase 4 — W-16 sign-off 工件契约
> 用户「按照计划推进清理W-16」。纯契约项：零 harness 触碰（无需 JD）、零 route/表、零自动翻门路径（D8）。
- **契约**：`TopicSelectionStakeholderSignOff@v1` 单契约双 scope（逐跑覆写 + 标定释放），释放门槛结构化（≥100 样本 / ≥2 相异 provider[F6] / FP 严格<0.05 / leak 已查 / 独立 assessor + corpus/report refs——不达标结构性无法校验通过）；层层 strict、仅 human 签署、跨 scope 混填拒；两 `*_PROVISIONAL_PRODUCT_GATE` 加 `sign_off_contract` 指针（守卫 +1 断言各钉）；DP-3.3 README 清单第 4 条更新为已定义。
- **回归门**：shared **272/0**（+3 schema 测：双 canonical / 释放门槛负例组 / 严格性负例组）；双 tsc **0**；**full backend 1645/1610/0/35**（backend 计数不变——纯 shared 契约，0 fail）。
- **提交**：feat `ce3cd67b` / docs 本段随本次 docs commit。

### 2026-07-03 · Phase 4 波次对抗式复审 + 修复（W-11/W-R1/W-12/W-16 全覆盖）
> 用户「检查下本轮实施的代码质量」。双代理三路复审：代码对抗（A–E 深检 + HEAD 复跑四套件）/ 文档一致性（JD↔代码、台账↔提交、计数链、DP-3.3 指针、收口声明——**全绿零问题**）/ 本会话自查（基线时间线与 chip 会话 5 提交增量精确对账、warnings 下游消费面清零）。
- **裁定**：W-11 S1（逐字 diff 提取尾零漂移、防循环双路证明、既有三 fail-closed 钉原样、身份无陈旧泄漏、报告工件单次记录）与 S2（单源 builder 两形态唯一分歧=digest、穿透测真 E2E）**SOLID**;W-16 **SOLID**（`validatesBody` 实配 `removeAdditional:false`——严格性负例为"正确原因"通过;oneOf 互斥探针验证;gate 常量无 deepEqual 消费者）;W-R1 **2 MINOR**;W-12 **1 边角 DEFECT**。
- **W-12 DEFECT（已修 `592c42d0`）**：presence-based 检查在「N6 regenerate 失败→二次失败路由 N5 slice 回滚→提额重驱 N5→全新 N6 前向进入」上误附陈旧 projection,runtime fail-close 双变体（prompt-identity / lineage-hash drift）死端。修正=**pending-aware**（`pendingN6RegenerateLoopback`：N6 最新 loopback 且无升级 warning + N5 未在其后重 admit;JD D-T128-01 同步修正留痕）。+1 回归测;coordinator **49/49**。
- **W-R1 MINOR（已修,同 commit）**：① makeService 未注零退避 → 一个既有 gateway 失败测真睡产线退避 ~4.5s/全量跑——注入 `backoffMs () => 0`;② 确定性 pre-provider block（TOKEN_BUDGET_/COMPRESSION_QUALITY_GATE_ 前缀,批输入纯函数）重试必然同败——命中即跳过重试（provider/schema 失败保持可重试）。+1 测（胖 abstract 压缩后仍超 → 恰一调用/零 retry/零 provider/blocked）;sampling **21/21**。
- **登记不修（复审观察项）**：S1 `blocked_after_compression` 下 estimate-unknown 走 `TOKEN_BUDGET_ESTIMATE_UNKNOWN` 而非 `_AFTER_COMPRESSION`（忠实 gate 产物,仅超限例被钉）;W-R1 attempt-id 唯一性为 by-construction（控制面无唯一约束,后缀价值=审计判别);W-16 `validatesBody` 的 Fastify `coerceTypes` 令数值字符串可过（无后端记录器消费此宽松性,立记录器时收紧）;W-12 stub 手录最小 projection payload（真 harness↔runtime 互作由 harness e2e 覆盖）。
- **回归门**：coordinator 49/49、sampling 21/21、tsc 0;**full backend **1647/1612/0/35**(1645+2 回归测,0 fail)**。
- **提交**：修复 `592c42d0` / JD 修正 + docs 本段随本次 docs commit。

### 2026-07-03 · Phase 4 — W-15 S1+S2（O-1 签核 + D1(c) 政策 halt + O-2 预算提额）
> spec v1.0（`06-w15-humanoverride-trace-spec.md`）落地前两片。**harness/orchestrator/debate-core 零触碰**（halt reason 联合类型 coordinator 本地,按 D-T128-00 无需 JD）;不可覆写面全守（gate 结论/authority/route/provisional/阈值/replay 身份零改动）。
- **S1 O-1+D1(c)**：run-override 分支具名导出（oneOf 语义不变,sign-off 既有 4 测原样）;coordinator `sign_off_required` halt——product-only、置于 HUMAN_HALT 之前（先签再进人节点）、last_completed∈{N6,N8} 且 latest_admitted 带对应 provisional warning 且无匹配签核工件才触发;`recordProvisionalRunOverrideSignOff` 严格 Ajv（未知键/跨 scope 拒）+ latest-admitted attempt/warning 实存校验（否则 409）+ 幂等（重签返回同工件）;路由 body 宽松、服务权威（W-09 模式,注释成文）。
- **S2 O-2**：`TopicSelectionLoopbackBudgetRaise@v1`（strict、`raised_to` integer 1..5 硬上限、human-only、rationale 必填）;`recordLoopbackBudgetRaise`（严格校验+run/node 匹配）;advance 生效预算 = max(参数, 最高有效提额)且读取处防御性再封顶 5;exhausted 消息内联提额路由。
- **测试**：coordinator **56/56**（+7:product 停签/签核解锁+幂等/acceptance 与无警双旁路/严格负例四连/无警签拒/提额解锁 exhausted+消息/提额负例三连）;shared **273/0**（+1 提额 schema 测:cap 6·0·2.5 拒、非 human 拒、未知键拒）;backend tsc **0**;**full backend **1654/1619/0/35**(1647+7,0 fail)**。
- **提交**：feat `0c6a0ce0` / docs 本段随本次 docs commit。**S3（桌面两卡+抽屉）/S4（收口+第二次产品跑）待做。**

### 2026-07-05 · Phase 4 — W-15 S1+S2 对抗复审 + 修复(A-DEFECT:N6 臂死代码)
> 用户例行质量复审(「检查本轮实施的质量」)。判定:S2 与 N8 臂 SOLID;**S1 的 N6 臂 A-DEFECT** + 三处加固,全部当轮修复。上方 07-03 段中「latest-admitted 锚定」「product-only 触发」为**修复前语义**,以本段为准(spec `06` §3 D1 已同步)。
- **A-DEFECT(N6 臂死代码 + 签核不可记录)**:harness 的 N6 tripwire 只随**升级 LOOPBACK attempt** 发射(loopback persist 分支),post-debate 重入的 admitted attempt 是干净的;而 gate/记录两侧都锚定 latest_admitted → N6 的 gate 永不触发、签核目标校验永 409。**修复**:投影新增 `latest_provisional_tripwire`(逐 attempt 折叠,不论 gate 结局取最新带对应 warning 者;后续干净 admit 不清除;非 product 跑恒 null),gate 与 `recordProvisionalRunOverrideSignOff` 目标校验统一锚定该字段(N8 → admitted attempt 本身,N6 → loopback attempt)。
- **加固 1(run_mode 旁路)**:gate 触发键从「本次调用 run_mode='product'」改为 **tripwire 存在性**——warning 发射端本就 product-gated(N8 admitted 端与 N6 loopback 端均在 harness product 分支),acceptance 由构造即无摩擦;原键控下签核前换一次省略 run_mode 的 advance 即可绕过 gate,现焊死。
- **加固 2(手写工件不解锁)**:`matchesRunOverrideSignOff` 追加 `provisionalSignOffValidator(record)===true` 复验——绕过路由直投控制面通道的残缺「签核」(缺签署人/rationale)不再匹配。
- **加固 3(并发)**:`recordProvisionalRunOverrideSignOff` / `recordLoopbackBudgetRaise` 均纳入 `withRunLock`——记录与 in-flight advance 不再交错(advance 侧操作员工件懒加载缓存的不变量由此构造成立)。
- **测试**:3 处改写(presence 键控断言 + 两条 409 文案正则)+ **3 新增**:① N6 升级臂全链(loopback 带 tripwire → post-debate 干净 admit → 同次 advance 在 N7 前停 `sign_off_required`、消息锚 loopback attempt id → 签 admitted id 409 → 签 loopback id 解锁进 N7);② mid-advance 触发(同一次 product advance 内 [N6,N7,N8] 后停,非仅新 advance 起步);③ 多提额取 **max** 而非最新(4 后记 3,生效仍 4;第 5 次 loopback 才 exhausted 且消息含 budget (4))。路由集成 **+1**(unknown-key 400 证 W-09 服务层严格校验为权威 / 非 gate 对 400 / 跨 run 400 / 无 tripwire 409 / cap>5 400 / 非 v1b 节点 400 / 合法提额 201)。coordinator **59/59**,tsc **0**,full backend **1658/1623/0/35**(1654+4,0 fail)。
- **测试陷阱留痕**:gate 求值点在「admit 步之后**下一轮迭代**顶部」,而 max_steps 检查在 gate 之前——预算恰好耗尽时该次 advance 报 `max_steps_reached`,下次 advance 立即 `sign_off_required`,**非旁路**(任何越过 gate 节点的 invoke 必经 gate 检查);N6 臂测试因此用 max_steps:2。
- **提交**:fix 本段同 commit。


### 2026-07-05 · Phase 4 — W-15 S3(workbench 运行操作台:O-1 签核卡 + O-2 提额卡 + Trace 只读抽屉)
> 本包首次触桌面端。harness/coordinator 契约零改动;唯一后端触点 = spec §2 预授权的只读 GET。
- **后端(只读)**:`GET /topic-selection/v1b/workflow-runs/:workflowRunId/artifacts`(薄包 `listArtifactRefsByWorkflowRunId`,list 语义:未知 run → 空 items 非 404)。操作路由集成测试追加 (h) 段:读回含已录提额工件 + 未知 run 空表。
- **桌面 API**(`topic-workbench/api/v1b.ts`):`getWorkflowRunState` / `listWorkflowRunArtifacts` / `getWorkflowTraceSnapshot` / `recordProvisionalSignOff` / `recordLoopbackBudgetRaise`;run 投影类型按 D-T128-00 保持 coordinator 本地,桌面镜像**只渲染字段**的 view-model(`V1bRunStateView` 等),后端加字段不破此面;签核/提额载荷类型直接 import shared W-16/O-2 契约。
- **RunOperationsCard(`run` 子标签)**:run id 手输 + quick-pick(本题目卡四类 v1b 记录上出现过的 `workflow_run_id` 去重);投影概览(run_complete/next/last_completed + 逐节点 gate/route 徽章、attempts/loopbacks/warnings 计数);**O-1 签核卡**挂 `latest_provisional_tripwire` 节点——已签显示既有工件(展示性匹配,权威仍在 coordinator 严格校验),未签出表单(actor_id+rationale 必填,`sign_off_id` 按锚 attempt 确定性生成 → 误重提落后端幂等路径),tripwire attempt 可直开 trace(N6 锚是早期 loopback attempt,不在 latest 行上);**O-2 提额卡**(节点下拉默认 loopback 中节点、raised_to 1..5、rationale/actor 必填,已录提额按节点取 max 徽章展示);**Trace 抽屉**:元数据/snapshot_hash/五组 refs 直展,payload 为 redaction 管道产物、二次点击展开(textarea 只读)——无未脱敏取回路径,符合 D3。
- **D4 如实声明**:卡片文案明示 actor_id 随表单记录、暂无 RBAC(与 v1c N4 同一 follow-up 池)。
- **UI 治理**:desktop typecheck **0**;UI gate **0 errors / 0 warnings(131 files)**——中途 `data-ui="code"`(未知角色)+ inline style 两违例,改用合法 `textarea` 只读呈现后通过;literal-tone 徽章分支(contract-dynamic 规则)沿 fe9df82 先例。
- **表单卫生**:SignOffForm 按 (node, anchor attempt)、BudgetRaiseForm 按 run 加 key 重挂载,跨 run 装载不残留旧选择;`as never` 类型逃逸改为 `as const` 字面量联合(`ProvisionalGateWarningCode`)。
- **spec 对齐**:D2 增补实施注——生效预算 = max(参数, 全体记录 max) 而非"最近一条"(单调不降,复审轮已 pin);06 头部进度行更新 S3 已落地。
- **测试**:full backend **1658/1623/0/35**(含新 GET 与 (h) 段,总数与复审轮持平——(h) 为既有测试内追加断言);shared 未触。S4 剩余:第二次产品跑验证 `sign_off_required` → workbench 一键签 → 续跑全链。


### 2026-07-05 · Phase 4 — W-15 S4(第二次产品跑:签核摩擦全链验证)⇒ **W-15 全部收口**
> 驱动脚本 `.ai/scripts/topic-selection-w15-s4-signoff-product-run.mjs`;run `t128-w15-s4-signoff-1783213389279`(工件 `.ai/.tmp/topic-selection-real-e2e/` 同名目录);复用 run9 真实 bundle `v1b_input_bundle_b9b8ff1d…`(真实文献+真实 provider v1a 血统),全链 `run_mode='product'`,零新增 provider 花费。
- **摩擦链证据(90-summary `passed`)**:N8 product admit 携带 `N8_DEBATE_THRESHOLDS_PROVISIONAL`(+`N8_VALUE_RISK_NOTES_CARRIED_FORWARD`)→ 下一次 advance 停 `sign_off_required@N8`(steps=[],消息锚 tripwire attempt id)→ **负探针**:未签重 advance 门不松;错 attempt id 签核 409 → 真签核(workbench 卡同款载荷)201 落工件 `artifact_ref_e4b13e77…` → 续跑一次 advance 完成 [N9,N10,N11] → `run_complete`,v1c input bundle 发布。D1(c) 预期摩擦形态「N8 后停一次 → 一键签 → 续跑」逐字复现。
- **结构性发现(S4 探跑挖出,划归 W-14)**:coordinator 驱动的 **product** 跑今天在模型节点上三路全断——① caller draft_payload 落 `fixture_replay`,product 准入按设计拒(诚实防线,非 bug);② `node_inputs.execution_spec` 是未接线的透传,harness 直接 `N4_FROZEN_DRAFT_ARTIFACT_REQUIRED`(首次探跑 `t128-w15-s4-signoff-1783212811143` 的 failure.json 为证);③ v1b 单代理草稿 runtime 本身只收 `codex_assisted|mocked_llm`,provider_llm 单代理生成是 W-14/W-19 休眠尾(W-09 canary 证的是 orchestrator 槽位,不产 gate 可消费工件)。**当前 product 合法调用方形态** = runtime `codex_assisted`(操作员策展草稿 → runtime_verified 工件)+ 直接 harness invoke 挂同一 workflow_run_id(n4/n6/n8_runtime_smoke 早已在 product run_mode 下证明该配方;人审 N2/N5 路由同为「直接入闸、coordinator 投影收编」模式)——S4 即按此形态跑,gate/签核/续跑全在 coordinator。coordinator 的 execution_spec→runtime 接线归 W-14。
- **对照澄清**:W-10/run9 的 v1b 腿实为 acceptance run_mode + fixture 语义(real-e2e 未传 RUN_MODE env,provider 花费全在 v1a 生成腿)——product 姿态 v1b 链 + tripwire 真实触发,**S4 是第一次**。
- **W-15 验收口径(spec §6)全满足**:S1/S2 单测+复审修复(59/59,full backend 1658/1623/0/35);S3 两卡+抽屉(typecheck 0,UI gate 0/0);S4 `sign_off_required` halt → 签核 → 续跑完整链留痕。**W-15 DONE。**


### （待开工）
