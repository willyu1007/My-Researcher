# 08 S1 工单：Coordinator + 受理桥 + 队列回流（开工 2026-07-11）

## 定位
- 切片：S1（D8 排序第二位，S0 已闭合）。承接 D1（已签核：自动化优先异步推进）+ 复审 N4/N5 + S0 复审移交项。
- 目标：把"14 个工位 + 权威服务"接成一条可自动推进、失败可回流、受理有血缘的主干。S1 收口即 golden scenario（S5）可开始全链推进。
- 预估：~5d，按 W1→W5 顺序，每个 W 独立可验收。

## 工作项

### W1 受理桥：Create* 契约加血缘 + 受理命令
- **契约（加性）**：`CreateTechnicalRouteCandidateRequest` / `CreateValidationCycleDraftRequest` / `CreateFeasibilityProbeRequest` / `CreateExperimentPlanLightRequest` / `CreateResearchWorkOrderDraftRequest` / `CreateCoreMotiveDraftRequest` 增加可选 `source_proposal_artifact_ref/hash`（admitted runtime final artifact 的 ref+hash）。
- **服务端**：字段存在时校验——artifact 存在、admission_status=admitted、runtime_status=passed、hash 一致、workflow_type 与目标对象类型匹配（route↔route_architecture 等映射表）；校验过则把血缘写入权威对象（各对象加可选 `source_proposal_artifact_ref` 持久化字段，Prisma 迁移一次出）。
- **边界**：字段缺省=人工直创（现状兼容，不破坏既有调用方）；proposal-only 边界不变（runtime 仍不写权威）。
- 验收：带血缘创建→对象可反查提案；伪 hash/未 admitted/blocked final→409；L5 注册 `acceptance_bridge_lineage_drift_rejected`。

### W2 链内消费硬化：回查 admission + passed-only
- 4 个链式 slot（skeptic/cycle/feasibility + experiment_design 消费上游 artifact 处）的 preflight 从"字段存在+回显"升级为：**回查 admission 仓库**确认 primary input artifact 已 admitted 且 final、`runtime_status='passed'`（blocked final 不再可作下游输入）、hash 与仓储实值一致。
- 落点：各 runtime service preflight（复用 S0-3 模式）；共享小校验器 `requireAdmittedPassedFinalArtifact(admissionService, ref, hash, expectedSlotId)` 放 preflight 模块旁。
- 验收：伪造 hash / blocked final / 未 admitted / 错 slot 来源均拒于 orchestrator 之前；L5 注册 4 条。

### W3 Coordinator 状态机（D1 形态照签核落）
- 契约 `PaperImplementationCoordinatorRun@v1`：`created → advancing → waiting_review | blocked | budget_exhausted | completed | failed`；step 记录 `(coordinator_run_id, step_index, slot_id, node_attempt_id, runtime_artifact_ref, admission_ref, decision_record, outcome, lease_heartbeat_at)`；`failed` 仅 coordinator 自身故障。
- 服务 `PaperImplementationRunCoordinatorService`：`POST /coordinator-runs`（创建，绑定 lane + 预算包络）、`POST /coordinator-runs/:id/advance`（202 异步推进循环，逐 step 持久化）、`GET /coordinator-runs/:id`（含 steps）。lease 互斥（同 run 并发 advance 单执行）；崩溃恢复=lease 过期后 re-advance 从断点续推（同 slot 新 attempt、无重复 artifact）。
- 首期两条 lane（代码级 const 注册表，非用户可配置）：**lane A** validation-planning 四步链 route→skeptic→cycle→feasibility（artifact 血缘经 W2 硬化路径）；**lane B** motive 链 decomposition→evolution（领域锚耦合，同一冻结 source bundle）。board 两 slot 单步 pipeline 纳入同一状态机。
- 扇出决策：`CandidateSelectionPolicy@v1` 纯函数（版本化、决策记录可复算、人可事后 override 重跑分支）；skeptic `recommended_disposition != proceed` → `waiting_review` 停驻；`TIER_BUDGET_INSUFFICIENT`/预算耗尽 → `budget_exhausted`。
- Coordinator 零语义、零 prompt/model 选择、零域权威写入；只调既有 runtime slot service 与确定性服务；持久化仅限自身状态机（新表，随 W1 迁移一并出）。
- 验收（D1 AC 照抄）：acceptance 隔离下一次 advance 推完 lane A 至 completed 或语义停驻；故障注入三件套（并发双发→单执行、崩溃 re-advance 续推无重复 artifact、预算耗尽）；ownership scan 证明无权威写入。

### W4 队列回流：runtime blocked → 入队 → resolve → re-advance
- **入队**：coordinator step 结局为 blocked/failed_runtime 时物化 DecisionWorkQueueItem（复用 harness 仓储与 dedup/reopen 语义；queue_type 按 blocker 分类，摆脱字符串 includes 启发式——枚举映射表）；直连路由跑出的 blocked 保持现状（不入队），队列物化归 coordinator 所有（回答 10-doc 归属问题：翻译层放 coordinator 而非 Domain Gate，贴自动化优先）。
- **回流**：`resolveDecisionWorkQueueItem` 增加可选 `re_advance: true`——resolve 后对关联 coordinator run 触发一次 advance（同 slot 新 attempt、预算封顶）；激活 retry_budget/cooldown 字段语义（reopen 时 retryCount 累加不再被覆盖，超 retry_budget → 终态 blocked 需人工提额）。
- 验收：blocked step→queue item（dedup 生效）；resolve+re_advance→断点续推；retry_budget 耗尽不再自动回流；L5 注册 2 条。

### W5 确认记录收口（S0 复审移交）+ 校验器收敛
- HumanConfirmationRecord 增加 **target 绑定校验**（使用时 target_refs 必须覆盖被授权对象 ref）与**消费语义**（use 后标记 `consumed_by_ref`，同记录二次使用→409；contracts 加 `consumed_at/consumed_by_ref` 字段，迁移随 W1/W3 合并）。
- 校验器收敛：`requireActiveConfirmation` / `requirePassedTraceGateResult` 提为共享模块，替换 4 服务 5 处内联副本（对照测试保证行为等价）；13×测试项目夹具抽共享 helper（动这些文件时顺手）。
- 验收：跨 target 挪用→409、二次使用→409；收敛后全部既有负例保持绿。

## 顺序与依赖
W1、W2 并行（不同文件面）→ W3（依赖 W2 的链内硬化语义）→ W4（依赖 W3 的 run/step）→ W5（独立，可与 W3/W4 并行）。S5 素材构造（测试用选题包 ×1 第一条）随 W3 并行准备。

## 边界（不做）
- 不做通用工作流引擎/分支 DSL；不做常驻 daemon 自动续推（lease 过期显式 re-advance，扩展留后）；不做 debate 档位（S3/D2）；不做压缩 caller 半边（S2）；不改共享 orchestrator（若需触碰走 T-088 JD）。
- Prisma 迁移合并为一次（coordinator 两表 + 血缘字段 + 确认消费字段），单独审批项。

## 收口（D7 节奏）
每 W 收口跑受影响套件；S1 整体收口跑全量 runtime-stress（新增必检先注册）+ near-prod gate（里程碑级）+ governance sync；03/04 登记证据；S5 第一条 golden scenario 随 S1 收口试跑。
