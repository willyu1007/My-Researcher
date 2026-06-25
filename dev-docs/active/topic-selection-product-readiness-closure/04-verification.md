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

### （待开工）
