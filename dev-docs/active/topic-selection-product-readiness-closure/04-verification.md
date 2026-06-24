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

### （待开工）
