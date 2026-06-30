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

### （待开工）
