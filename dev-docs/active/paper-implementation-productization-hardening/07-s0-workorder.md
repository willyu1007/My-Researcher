# 07 S0 工单：治理与正确性补洞（draft，待开工）

## 定位
- 切片：S0（D8 排序首位，先于 Coordinator/压缩/debate kernel）。
- 来源：`06-review-2026-07-10.md` N1（P0 治理洞）、N6 前两项（免烧钱/身份钉死）。
- 原则：只补洞不改边界——不动 runtime/admission/Domain Gate 权威四分法，不新增 LLM 通路，不做编排。全部为确定性防线。
- 预估：~2d（不含 DB 迁移审批等待）。

## 工作项

### S0-1 HumanConfirmationRecord 一等实体化
- **问题**：实体全系统不存在；强 claim 只查 `human_confirmation_ref` 非空，该字段可由 LLM 的 `domain_gate_request` 自证（N1）。
- **改动面**：
  - shared 契约：`HumanConfirmationRecord`（对齐 T-091 02-architecture 既有设计：target refs、transition_attempt_ref、gate_result_refs、reviewed source refs/hashes、rationale、policy_version_id、actor、created_at；source 漂移即失效语义先落字段、失效判定可后置）。
  - 仓储三层（interface / in-memory / prisma）+ Prisma model（**走 `sync-db-schema-from-code` skill，迁移需审批，本项先出 schema diff 不擅自 apply**）。
  - 路由：`POST/GET /paper-implementation/projects/:id/human-confirmations`（capture 面只写记录，不做任何权威状态变更——02-architecture 既定）。
- **验收**：L1 契约 schema 正反例；L2 创建/查询/按 target 过滤；负例=确认记录不触发任何权威写。

### S0-2 确认/gate ref 存在性校验（关死自由文本）
- **问题**：strong claim / portfolio / motive-evolution human gate 的确认 ref，与 WO admit `admission_gate_result_id`、dossier `readiness_gate_result_id` 全部仅 hasText；`evaluateTraceGate` 结果不持久化（N1）。
- **改动面**：
  - `createClaimCandidate`：`claim_strength='strong'` 时 `human_confirmation_ref` 必须解析到已存在 `HumanConfirmationRecord` 且 target 覆盖该 claim（`result-claim-dossier-service.ts:709-715` 处收紧）。
  - `applyMotivePortfolioDecision` / motive-evolution human gate：同上存在性校验。
  - TraceGateResult 持久化：`evaluateTraceGate` 落库（仓储三层），WO admit / dossier ready 的 gate_result_id 校验存在性（解析不到→409）。
  - Domain Gate materialize 层同步校验（LLM `domain_gate_request` 内治理字段不可自证，`runtime-domain-gate-service.ts` materialize 前置断言）。
- **验收**：L1 负例=悬空 ref 409（逐门：strong claim / portfolio / WO admit / dossier ready / materialize）；L2 正例=先 capture 确认→再过门；回归=既有非 strong claim 路径零改动。
- **兼容注意**：既有测试夹具若用自由文本 ref 需同步造记录；grep `human_confirmation_ref|gate_result_id` 全量对账。

### S0-3 runtime preflight 项目存在/active 校验
- **问题**：7 个上游 runtime service 0 命中项目校验，可对 archived/不存在项目烧真 provider 调用（N6）。
- **改动面**：共享小助手（纯函数+projectRepository 注入）`requireActiveImplementationProject`，10 个 runtime service（7 上游 + result-analysis + P1 两槽复核是否已有）preflight 首步接入；blocked 语义=400/404 拒绝于 orchestrator 之前、零 provider 调用。
- **验收**：L1 每 service 两负例（不存在/非 active）断言 provider_call_count=0；L5 必检用例注册 `*_inactive_project_rejected_before_orchestrator`（先注册再实现，D7 节奏）。

### S0-4 trace debate profile/model-option 钉死
- **问题**：`runtimeBase` 直接采纳 `request.model_profile_id`（`trace-integrity-debate-runtime-service.ts:825`）无注册表校验；P1R 有（`p1-runtime-review-service.ts:1130-1160`），不对称（N6）。
- **改动面**：对齐 P1R——profile 必须为注册的 trace-integrity profile，显式 model_option 必须属于该 profile，drift→400 拒绝于 gateway 之前。
- **验收**：L1 负例=陌生 profile / 越权 option / 跨域 profile（topic-selection 的）均拒；L5 注册 `trace_integrity_profile_drift_rejected_before_gateway`。

### S0-5（待 N8 裁定后可并入）claim literature lineage 放宽
- **前置**：用户裁定 N8（有意锚定 vs 过度约束）。若裁定放宽：`trace-kernel-service.ts:50-70` 的 claimcandidate/claimtracepacket/implementationdossier required lineage 由 `['literature']` 改为 `literature 或 experiment 至少其一`（表述待定），并补两侧正反例。若裁定保持：本项改为在 02-architecture 补明文 + 负例锁定。

## 边界（本工单不做）
- 不做确认记录的审批流/UI（S4 承接 capture 表面即可先用 API）。
- 不做 blocked/failed 入队与回流（S1）。
- 不做 preflight 终态统一、token 双计、压缩接线、幂等 unique（S2）。
- 不做 admission 语义规则实现与 resume 契约（S3/D9）。
- 不改 topic-selection 侧任何共享面（无共享面触碰，无需 JD）。

## 收口（D7 节奏）
- 全量 runtime-stress（新增必检用例先注册）+ focused 集成 + `tsc --noEmit` + governance sync/lint。
- `03-implementation-notes.md` 逐项登记证据指针；`04-verification.md` 记 run id。
- S0-1 的 Prisma 迁移单独列审批项，不与其他项混提交。
