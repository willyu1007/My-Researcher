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

### （待开工）
