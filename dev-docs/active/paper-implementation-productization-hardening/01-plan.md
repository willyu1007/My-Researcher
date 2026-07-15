# 01 Plan

## Phase 总览与依赖

```
Phase 0 对齐与登记
  └─> Phase 1 参数规范化闭环（P-06/P-07）          [地基：manifest 是 2/4 的校验载体]
        ├─> Phase 2 上下文工程闭环（P-01/P-02）     [共享面，与 T-127 协调]
        ├─> Phase 3 Run Coordinator（P-04/P-10）   [纯 paper-implementation 侧，可与 Phase 2 并行]
        └─> Phase 4 debate 档位 + 复杂度（P-05/P-09 部分）
              └─> Phase 5 跨 run 记忆（P-03）       [复杂度信号消费记忆，故在其后]
                    └─> Phase 6 工程清债 + usage-fit（P-08/P-11/P-12/P-13）
```

Phase 2 与 Phase 3 互不依赖可并行/换序：Phase 2 改共享 orchestrator 需等 T-127 联合决策，若协调有等待期则先推 Phase 3。（T-123 于 2026-06-16 收尾关闭，共享面后续协调对象转为 T-127。）

## 2026-07-10 执行顺序修订（D8 签核，上方 Phase 图保留作历史）
复审（`06-review-2026-07-10.md`）新增 N1..N9 后，执行顺序按切片 S0-S5 重排；Phase 编号保留用于内容引用，实际推进以本节为准：

```
S0 治理与正确性补洞（新增，07-s0-workorder.md）          [N1 + N6 前两项；~2d]
  └─> S1 Coordinator + 受理桥 + 队列回流（Phase 3 扩展）   [P-04 + N4 + N5；受理命令带 proposal 血缘、
        │                                                  链内消费前回查 admission 且仅接受 passed、
        │                                                  runtime blocked→queue 物化 + resolve→re-advance]
        │     S5 usage-fit 薄验收（Phase 6.4 前移）：S1 落地当周 1 条 golden scenario 全链 + 人审 rubric，
        │     此后作为各切片回归门。素材=测试用选题包（D10：arXiv 带代码论文取材、经真实 bootstrap
        │     路由进入、论文已知结论作 rubric ground truth；素材构造随 S1 并行准备）
        ├─> S2 单调用鲁棒包（Phase 2 承接，PC-S1..S4 并入） [P-01 caller 半边 + N3 token 双计修复 +
        │      retry 分类对齐(role echo/blocked 无码改可重试) + runtimeIdentityHash unique 幂等 +
        │      N6 preflight 终态统一；Phase 1 manifest 作并行地基，含 materialization class 字段]
        └─> S3 多角色 debate kernel 硬化（新增，D2 档位的地基）
               [N2 role output 契约加深(per-statement/per-finding) + 11 号文档 admission 规则真实现 +
                blocked 输出也过语义检查 + D9 resume 契约(断点续跑) + N7 dossier 项目级失败对账（legacy S3 实现，目标语义已被 T-132 D-16 取代）;
                Phase 4 debate 档位在 S3 之后]
                 └─> S4 观测与人审面（Phase 6 部分前移）    [N9：telemetry sink + per-project token/cost
                       聚合读模型 + 桌面 runtime lane 视图]
                       └─> Phase 5 记忆 / Phase 6 清债（D4/D6 殿后不变）
```

依据与证据见 `06-review-2026-07-10.md`；S0 工单见 `07-s0-workorder.md`。N8（claim literature lineage）待裁定，裁定后并入 S0-5 或 S3。

### 2026-07-10 S0 复审移交项（code-review 发现，登记进后续切片范围）
- **S1 追加**：HumanConfirmationRecord 的 target 绑定 + 消费/supersede 语义（复审发现：一张同 scope active 记录可无限重放授权任意多不相关决策——受理桥落地时确认记录必须绑定其授权的具体 transition/target 并在使用后标记 consumed/superseded）；TraceGateResult 的 supersede/新鲜度语义（同 manifest 重评后旧 passed 行应失效；本轮已加 manifest 绑定断言，新鲜度归 S1）；治理校验器收敛（requireActiveConfirmation / requirePassedGateResult 共享化，消除 4 服务 5 处内联复制；preflight 建议挂到共享 admission service；profile 钉死块参数化）。
- **S4 追加**：桌面确认记录入口（POST /human-confirmations 的 api 绑定 + portfolio/evolution 提交流程引导创建确认记录——当前重大结构变更在桌面只能 curl 完成）；utils.ts 队列 blocker 推导从 `confirmed_by` 改为 confirmation_ref/记录状态（与新门语义对齐）。
- **测试债**：13 个 runtime 测试文件各复制 ~125 行项目夹具 → 抽共享 helper（S1 动这些文件时顺手）。

## Cross-task PI↔EF iteration seam（T-132 D-10 through D-22；Pack A source-backed control-plane slice passed）
- 本节记录跨任务前置条件，不改变当前 S3 工单范围，也不把已完成 coordinator slice 重新打开。
- T-132 D-19 first joint slice：从已绑定 PaperProject/ValidationCycle fixture 与经真实 v2 identity/readiness 路径持久化的 typed assets 开始；PI 通过既有 AuthorityGate admit 一个含 canonical `exact_cell_plan[1..N]` 的 immutable WorkOrder revision，验收 fixture 取 `N=2`；EF 一一 materialize VersionLock/RunRecipe/TrainingTaskSpec bindings，冻结该 revision 唯一 batch Run/manifest 并原子发出 `RunManifestFrozen`；PI inbox 校验 exact scope/sequence 后 CAS 更新 branch head 并原子发出 `BranchHeadAdvanced`；EF 提交 exact inbox receipt 作为 durable acknowledgement 后结束。该 slice 不创建 Attempt，不接 provider/result/validation/evidence/closure/UI/search/legacy migration，也不实现 PaperProject bootstrap。pre-bound fixture 只用于 joint seam integration，不能替代 D10 最终 golden scenario 的真实 bootstrap 路径。
- T-132 D-20 transaction model：D-19 成功路径固定四个 domain-owned authoritative Unit-of-Work：① PI admission/current revision + `WorkOrderRevisionAdmitted` outbox；② EF 对该事件的 inbox receipt + exact materialization + unique Run/manifest + `RunManifestFrozen` outbox；③ PI `RunManifestFrozen` inbox receipt + exact-scope head CAS + `BranchHeadAdvanced` outbox；④ EF `BranchHeadAdvanced` inbox receipt，该 receipt 本身就是 exact durable acknowledgement。每个消费者的 inbox receipt、本域 authority 写入与结果 outbox 必须同事务提交；即使共用一个 Postgres，也禁止跨域事务、共享可变 authority 表、共享写 repository 或 2PC。
- D-20 replay/recovery：same `event_id` + canonical payload hash 精确重放返回既有 outcome；same `event_id` + different payload 终态冲突；lower sequence 原子记录 stale-consumed 且零 head/outbox 变更；same sequence + different Run/manifest 原子记录 invariant conflict 且零 head/outbox 变更；prerequisite 暂不可见保持 retryable 且零领域/outbox 写。Outbox relay 的 lease/delivery bookkeeping 是基础设施状态，不证明消费方已提交；EF 对 `BranchHeadAdvanced` 的 exact inbox receipt 是唯一 acknowledgement，禁止第二 acknowledgement 记录或 `dispatch_eligible` mirror。
- T-132 D-21 storage/cutover model：新增独立 domain-owned PI v2 与 EF v2 canonical table families；PI owns branch/revision/admission/head/inbox/outbox persistence，EF owns typed identity/readiness/materialization/Run-manifest/cell-binding/inbox/outbox persistence。跨域只交换 versioned exact refs/hashes/events，不使用 shared mutable table、cross-domain write repository、runtime union view 或 legacy adapter authority。现有 singular ResearchWorkOrder/WorkOrderHarnessRun 与 generic EF rows 原样保留，仅能读取已有字段用于 diagnostics/admin；不 backfill、不 dual-write、不 fallback。
- D-21 capability/cutover：default-off capability 只阻止新的 PI v2 admission，返回稳定 fail-closed 结果并产生零 PI/EF/legacy 写；一旦 PI admission/outbox 已提交，后续 capability 关闭不得截断 saga，必须 drain 到 EF durable acknowledgement。D-19 在批准的 acceptance scope 内临时启用并通过后，新建 paper-bound product entrance 单切 v2，同时关闭所有重叠 legacy writer。Rollback 只停止新 v2 intake并保留 v2 canonical/inbox/outbox 审计与重放，禁止恢复 legacy writer。
- T-132 D-22 first migration boundary：只新增 Phase 1 所需 typed identity/readiness logical families 与 D-19 所需 PI branch/revision/admission/head、EF VersionLock/RunRecipe/TrainingTaskSpec binding/Run-manifest-cell、两域 inbox/outbox，终点是 EF durable acknowledgement。D-22 冻结 logical object families 与 invariant 落点，不冻结最终 Prisma model/column name 或 DDL；fixture 仍须经真实 v2 identity/readiness writer，不新增 bootstrap/promotion 旁路。
- D-22 invariant placement：同域 identity、unique、CAS、cell/event relationship 用关系字段、约束和 owning-domain FK；跨域只存 exact external ref/hash/sequence/event，无 ORM relation/FK/cascade。冻结科研内容用具名、schema-versioned、server-hashed typed canonical JSON，禁止 generic `kind/payload`/EAV；event type/version/idempotency/scope/hash 为结构字段并包围 typed canonical payload。default-off capability 只在 admission routing/config 检查，不写 eligibility/`dispatch_eligible` mirror。
- Later-slice PI work outside the D-22 first migration：Attempt-provenance-preserving `workflow_simulation_status`、current-effective branch-head `closure_scope_watermark`、embedded immutable Cycle closure accounting snapshot/hash、Cycle-wide active-real-Attempt census、stable no-head/scope-drift blockers、`CycleReadyForInterpretation` detection、exact-hash-bound Result Analysis proposal、closure-authoritative nullable scientific disposition/server-derived selected exit、closed-Cycle-only ResultInterpretation/Claim/Dossier/next-step consumers、PI-owned retrieval projection and structured query/read model。Pack B has since implemented EF-owned same-payload simulation Attempts/events/provider-control persistence only; it deliberately does not add the PI projection or any result/validation/evidence/UI/search/global-cutover behavior.
- T-132 readiness closure freezes the exact first-pack asset allowlist to Dataset, DataPolicy, MetricDefinition, Benchmark and EvaluationProtocol v2; PI consumes exact refs/hashes only and introduces no BaselineImplementationVersion, MethodRecipeComponent, DatasetMirror or provider/platform persistence in Pack A.
- The PI-owned new-intake key defaults to `PAPER_IMPLEMENTATION_EXPERIMENT_V2_ADMISSION_ENABLED=false`; one-way writer closure defaults to `PAPER_IMPLEMENTATION_EXPERIMENT_V2_CUTOVER_COMMITTED=false`. Pack A code/config/schema implementation is complete, A01-A04/B01-B10 passed on disposable PostgreSQL and source-backed final run `packa-d19-source-policy-20260713-r2` passed. The named local target then completed versioned DB apply, exact typed readiness import and committed single-writer cutover; source defaults and non-local environments remain disabled.
- Full target shared seam（含后续 migrations，非 D-22 首包范围）：PI draft constraints → canonical exact cells/hash → one admission → EF one-to-one TaskSpec/provider/Run materialization；`revise | fork` command；one mode-neutral immutable required-cell batch Run per revision；`RunManifestFrozen → PI sequence-fenced head/BranchHeadAdvanced → EF exact inbox receipt/acknowledgement → first Attempt`；EF canonical typed required rules → exact-batch ResultValidationReport/EvidenceCandidate → sole PI Gateway → REU；freeze Cycle frame/branch set plus each branch's current admitted revision and head sequence into one current-effective watermark → account every head Run's complete manifest/cells/Attempts/eligibility/eligible REU refs while excluding non-head history by default → immutable closure-input snapshot/hash → automatic Result Analysis proposal → existing Cycle-closure AuthorityAction writes the sole scientific disposition and derives selected exit → accepted ResultInterpretationPacket/Claim/Dossier/retrieval/next-step consumers. Historical Runs enter comparison lineage only through exact `comparison_input_ref` on the current admitted revision and never become execution scope；any Cycle-wide active real Attempt blocks closure；watermark/head CAS drift writes nothing and rebuilds。Terminal simulation remains Attempt/control-projection-only，Run/cells stay scientifically `not_started`；existing Run rebinding and automatic cancellation forbidden。
- Terminology migration：new docs/contracts use experiment Run versus `PaperImplementationCoordinatorRun`, EF ExecutionAttempt versus PI runtime `node_attempt_id`, and WorkOrder branch versus coordinator candidate path. Historical workorders remain unchanged.
- Human interaction contract：AuthorityGate is the only durable authorization; CoordinatorStop is derived/local and creates no second decision record. Overlap is one owning-screen action plus auto-resume; no per-Run/cell-Attempt/retry/reconcile confirmation. Golden scenarios count Initiation/Authority/Recovery/Plumbing actions. The one-Cycle/one-admitted-revision/one-strong-claim/one-export reference flow is `1/4/0/0`; every fixture's AuthorityAction target is its named revision-admission + Cycle-closure + strong-claim + export + external-effect + explicit-promotion gate count, while N cells/M valid technical Attempts and automatic recovery add no action.
- Scheduling gate：The D-22 schema/invariant matrix, readiness review, implementation authorization and source-backed D-19 Pack A slice are complete. The slice closes only the PI↔EF admission-to-head-acknowledgement control-plane seam under D-20's four local authoritative Unit-of-Work boundaries on D-21's additive v2 storage and D-22's minimal pack. It uses capability-gated v2 identities with no same-object dual write, fallback or legacy trust upgrade. D-16/D-17/D-18 evidence, conclusion and current-effective closure migration remains a later atomic cutover: current mixed `PaperImplementationRunStatus`, failed/cancelled REU writers, `assertProjectRunEvidenceAccounting`, project-wide reader, opaque protocol blocks/heuristic validator/generic writers, caller-authored `cycle_assessment`/`decision_exit`, free-standing Result Analysis scenarios and open packet consumers must still be replaced together. The source-backed Pack A pass cannot be claimed as closure of that later seam, product cutover, golden-scenario acceptance or scientific execution readiness.
- D-19/D-20/D-21/D-22 exit evidence：joint shared-contract and PI/EF service/repository/Prisma tests prove the real v2 path with one admitted revision and exactly two cells; one-to-one TaskSpec binding; one immutable batch Run/manifest; four separately committed domain-owned authoritative Unit-of-Work stages; atomic `RunManifestFrozen`; exact-scope sequence-fenced PI head plus atomic `BranchHeadAdvanced`; one EF exact inbox receipt/acknowledgement; same-input/idempotent/lost-ack replay; payload conflict; lower-sequence no rollback; same-sequence conflict fail-closed; prerequisite retry; one revision/one Run/one head/one acknowledgement; and zero Attempt/provider/result/validation/evidence/Cycle closure/UI/search/legacy writes. Capability-off, drain-after-admission, legacy digest, no-runtime-union and later product-cutover tests prove D-21. The D-22 schema census and migration diff must prove only the minimal logical pack, same-domain relational invariants, no cross-domain FK, typed named snapshots/events, no generic EAV/mirror and zero excluded tables. Transaction/repository ownership scans must prove no writer crosses domains or reaches legacy tables. Existing WorkOrder/HarnessRun/coordinator fields and tests cannot satisfy these assertions.
- Next joint step：the reviewed Pack B migration and local-only capability are now landed on the named local-development target, but no formal Pack A Run/head acknowledgement exists and E1-E5 did not run. Establish the prerequisite through real product bootstrap, PI admission and the Pack A four-transaction saga before named-local simulation. D-16/D-17/D-18, the PI event-derived projection, full bootstrap-to-dossier golden scenarios, every non-local rollout and scientific execution remain open; no D-23 decision was introduced.
- Exit evidence：joint shared-contract and PI/EF service/repository tests reject range/generator-only admission, illegal revise, logical-id/`latest`, wrong scope, runtime cell mutation and Run rebinding; reject malformed/unknown/unsupported required rules before Run/head/Attempt and at final validation; prove one immutable exact-batch report/hash and sole EvidenceCandidate writer; prove failed/cancelled/incomplete execution creates zero REU and current-effective head-Run snapshot entries while results later assigned positive/negative/inconclusive share the completed-execution/evidence path without REU disposition; prove every admitted branch is present at the closure watermark, a missing durable head fails with stable `BRANCH_HEAD_NOT_FROZEN`, non-head history is absent unless named by exact `comparison_input_ref`, and comparison refs do not expand execution scope; prove any active real-provider Attempt anywhere in the Cycle, including a non-head Run Attempt, fails with stable `CYCLE_ACTIVE_REAL_ATTEMPT`; mutate Cycle/branch-set/current-revision/head sequence during snapshot build and require `CYCLE_CLOSURE_SCOPE_DRIFT`, zero closure write and deterministic rebuild; derive Cycle readiness idempotently, produce one proposal without authority, reject caller/model writes to disposition/exit, derive the selected exit from frozen definitions and skip scientific interpretation for no-evidence/control-only closure; require exact closed-Cycle refs/hashes for ResultInterpretation/Claim/Dossier/retrieval/next-step consumption; preserve the T-124 `1/4/0/0` action budget. Ownership scans must prove no generic validation/evidence writer, full-history closure scan, project-wide REU scan, Sidecar authority, model/caller conclusion writer, open-proposal consumer, FailureEvidenceUnit, second gateway, ScientificConclusion aggregate or compatibility alias. Evidence must be recorded in both T-124 and T-132.

## Phase 0 对齐与登记（~0.5 d）
- 与 T-127 登记共享面联合决策点（JD 编号互链）：orchestrator 压缩执行分支、SlotParameterManifest 落点、provider_overrides 类型化消费、价格表消费。（注：provider_overrides 类型化 F-07 与价格表 F-09 已由 T-123 交付，属消费既成产出；前向 JD 对象为 T-127。）
- 盘点 `T114_*` 资源清单与更名映射表（env flag×16、gate flag、证据目录前缀、package.json 脚本）。
- 产出 `SlotParameterManifest@v1` 字段草案并评审冻结。
- 验收：`03-implementation-notes.md` 登记 DP-0.x 决策；T-127 `03-implementation-notes.md` 对应 JD 条目互链。

## Phase 1 参数规范化闭环（P-06/P-07，~2 d；D5 已签核）
- 1.1 backend registry 导出 `SlotParameterManifest@v1`（18 个 promoted slot 全量；字段含 D1/D2/D4 挂载位：debate policy id+version、candidate selection policy id+version、memory family 声明，未落地前显式 null 占位）。
- 1.2 提交式生成快照：脚本导出 JSON 快照入 repo（建议 `.ai/llm-config/registry/slot-parameter-manifest.snapshot.json`），CI 新鲜度校验（registry 改动未再生成即红）——参数变更强制成为可 review 的 diff（沿 DB SSOT 同步模式）。
- 1.3 四向完备性测试进默认 CI 与 runtime-stress 新 step：`runtime-slots/*/run` 路由集合 ↔ manifest 条目 ↔ `REQUIRED_*` 必检用例归属 ↔ 金丝雀 env flag；任一缺失即红，含注入式负例。
- 1.4 L1 负例：per-request 裸模型参数注入在 schema（strict 拒绝未知键）/service 双层被拒；显式 `model_option_id` 不属于 profile 被拒（既有）保持。
- 1.5 slot execution overrides：test/acceptance 限定可覆盖 execution_mode/model_option（镜像 topic-selection `slot_execution_overrides` 形态），product 模式 schema 层拒绝（负例）。
- 1.6 dev-docs：新 slot 不再手写 Profile Resolution Block（仅留 manifest 指针）；T-114 matrix 历史 block 加"已由 manifest 取代"注记，不重写历史。
- 1.7 双源方向 JD 提案：backend 权威、YAML 降为对账输入——与 T-127 登记 JD 后在 registry 测试中固化方向。
- 测试：L1 schema 负例；L2 manifest 解析与 service 一致性 + 快照新鲜度负例；runtime-stress 新增 `required_slot_parameter_manifest_cases`。

## Phase 2 上下文工程闭环（P-01/P-02，~3 d，共享面；D3 已签核：单执行器定案）
- 2.1 context profile registry 化：11 个内联 `contextPolicyProfile` 迁入中央 registry（或 registry 的 paper-implementation 段），service 只持 id；哈希对照测试证明逐字段零漂移后删除内联副本；registry 同步声明各 context family 的 packet 可裁等级（请求方只可收紧不可放松）；**从 paper-implementation profile 的 `allowed_executor_kinds` 删除 `codex_assisted`**（不保留已声明未实现的双轨面）。
- 2.2 **[已被取代 2026-07-05——orchestrator 恢复分支已由 T-128 W-11 以 caller-supplied 架构落地(D-T128-02),本项余量改为 caller 侧 attempt 构建器,修订切片 PC-S1..S4 见 03 §2026-07-05 P-01 对账]** orchestrator 压缩执行分支（JD 联合决策后动工）：`requires_compression` → 执行 `deterministic_structural` 分级裁剪（永不裁 authority/conflict/challenge refs 与 `preserved_fact_kinds` 骨架；按可裁等级先裁正文保 ref 骨架、再整包剔除，逐级重估达标即停；纯函数可复算）→ re-gate → within_budget 则继续 provider 调用并记录 `compressed_context_hash` / `compression_report_ref`，`COMPRESSION_APPLIED` warning 传播至 role/final artifact；质量门失败、压缩后仍超预算、不允许压缩 → 维持 blocked，blocker 携带最大占用 packet 与 digest 化建议。最多一次压缩尝试；复杂度信号（Phase 4）使用压缩前 token 估计。
- 2.3 语义浓缩边界声明：不做调用路径内的 LLM 压缩（输出不可复算，破坏 identity/replay 根基）；长素材语义浓缩走上游 digest artifact 模式（经 admission 的一等制品，runtime 只消费 ref）——本 Phase 仅立契约边界并加负例（声明语义压缩执行器的 profile/请求被拒），digest 生产链路不在本包范围。
- 2.4 既有 L5 over-budget 用例拆双分支：`不可裁剪→blocked 零 provider 调用`（保留）+ `可裁剪→压缩后完成调用且血缘可验`（新增）。
- 2.5 长上下文金丝雀：用公开论文构造的论文级输入（素材由本包准备，与 Phase 6 golden scenario 同源，见 D3.c）对 trace integrity 或 evidence board curation 跑 env-gated 金丝雀，证明压缩分支在 live 路径成立。
- 测试：L2 压缩分支双向 + 可裁等级收紧语义；L5 对抗（压缩丢 conflict ref 必须 block、压缩未减小 token 走 warning、压缩参与下 replay identity 稳定、admission 复算压缩结果一致、语义压缩声明负例）；L4/L6 长上下文金丝雀；T-127 侧 topic-selection 回归确认。

## Phase 3 Run Coordinator（P-04/P-10，~4 d，可与 Phase 2 并行；D1 已签核：自动化优先）
- 3.1 `PaperImplementationCoordinatorRun@v1` 状态机契约：`created → advancing → waiting_review | blocked | budget_exhausted | completed | failed`；step 记录 `(coordinator_run_id, step_index, slot_id, node_attempt_id, runtime_artifact_ref, admission_ref, decision_record, outcome, lease_heartbeat_at)`。`failed` 仅 coordinator 自身故障；slot 语义/provider 失败 → `blocked`，可 re-advance（同 slot 新 attempt、预算封顶）。
- 3.2 pipeline const 注册表 `PAPER_IMPLEMENTATION_COORDINATOR_PIPELINES`：lane A `route_architecture → route_skeptic_review → validation_cycle_planning → feasibility_planning`（artifact 血缘耦合，coordinator 逐步线程化 admitted ref/hash）；lane B `motive_decomposition → motive_evolution`（领域锚耦合：同一冻结 source bundle，无 artifact 链——契约核实见 `03` 2026-06-12 条目）；board 两 slot（evidence_board_curation / cross_board_synthesis）为单步 pipeline。非用户可配置、无分支 DSL。
- 3.3 链内延续决策确定性化：`CandidateSelectionPolicy@v1` 纯函数（expected_information_gain / baseline_gap_status / blocker+warning 计数 / confirmatory_marker，平票按 candidate_key 序哈希）选 reviewed candidate，选择作为决策记录入 step；skeptic `recommended_disposition`：`proceed` → 续推，`revise|park|abandon` → `waiting_review` 停驻，人查看后可带显式 override 标记 re-advance（override 含 actor 记录）。
- 3.4 异步推进：advance 置 `advancing` 并启动进程内推进循环（202 + `GET /coordinator-runs/:id` 轮询），逐步持久化 + lease 心跳；同 run 互斥（乐观锁 / expected_step_index，并发双发恰一执行）；崩溃后 lease 过期 → 显式 re-advance 从最后持久化步续推（v1 不自动续推，常驻 daemon 留作扩展）；不在 coordinator 层重复 slot 内置重试。
- 3.5 Prisma 表（coordinator run / step）——迁移走显式审批；in-memory 仓储先行打通 L1/L2。
- 3.6 ownership scan 扩展：coordinator 文件清单内无域写入调用、无 prompt 编译、无模型选择、无 envelope 直写、无 queue 创建。
- 测试：L1 状态机/policy 契约；L2 一次 advance 自动推完 lane A 至 completed、selection 确定性、disposition 三分支、lane B 锚耦合推进、崩溃续推；L5 必检新增（并发双发→单执行、崩溃后 re-advance 续推且无重复 artifact、预算耗尽、selection 决策可复算、override 含 actor）；L6 near-prod gate 增加 coordinator 一键推完 lane A 的证据段。

## Phase 4 debate 档位与复杂度 gate（P-05/P-09 部分，~3.5 d；D2 已签核）
- 4.1 `ComplexityAssessment@v1`（纯函数信号→档位，slot service preflight 内执行）+ `DebatePolicy@v1`（注册表版本化：阈值表 + 档位→角色链/角色 profile 绑定；版本进 runtime identity 与 manifest 对账）契约与注册。
- 4.2 共享 bounded debate kernel 抽取（角色循环、有界重试、role artifact 记录、admission 调用）；P1 review 与 trace integrity service 迁移其上，瘦身 1338 行大文件；行为零变化以既有全部用例为证。
- 4.3 双试点条件升档：`validation_cycle_planning.cycle_candidates` 与 `cross_board_synthesis.merge_split_reuse_scenarios` 接入三档（默认 single_role，信号触发 with_skeptic/full_debate；full_debate 复用 P1 三角色模式）；为新增批判/仲裁角色编写 prompt 模板并注册 profile/registry 条目。
- 4.4 admission 复算 `ComplexityAssessment` 并拒绝档位漂移；升档不改 final artifact 契约。
- 4.5 强制开关：product 仅 force-up（含 actor 记录），force-down 在 schema/service 双层拒绝；test/acceptance 双向。
- 4.6 预算交互：升档所需 provider 调用数超出 run 余额 → `TIER_BUDGET_INSUFFICIENT` 转 blocked（不静默降档），提额后 re-advance。
- 测试：L1 policy/assessment schema + product force-down 负例；L2 同输入同档位、升档仅增角色、kernel 迁移前后逐字段对照；L5 必检新增（档位漂移拒绝、升档 telemetry provider_call_count 一致、replay 同档位幂等、policy 版本变更旧 identity drift 阻断、`TIER_BUDGET_INSUFFICIENT` fail-closed、product force-down 拒绝）；L4 双试点升档路径 env-gated 金丝雀。

## Phase 5 跨 run 记忆（P-03，~2.5 d；D4 已签核：三族齐发）
- 5.1 三 families 契约/仓储（借 topic-selection recheck memory 结构）：failed_probe / disposition（单 implementation_project 域）+ provider_variance（workspace 全局域）；同 target+原因码语义去重（计数累加，沿 DecisionWorkQueue dedup 模式）。
- 5.2 写入面（确定性投影，非 LLM）：live adapter 失败 run、variance 评估结果、route/motive park/abandon 决策；人工创建记忆被拒。
- 5.3 retire/批注管理面：controlled 路由，retire 含 actor+理由，retired 条目从消费查询排除；批注不改条目语义内容。
- 5.4 消费面：feasibility/cycle/route slot 的 `memory_policy.allowed_memory_families` 打开 + `required_use_labels` 注入；锚版本漂移条目确定性过滤为 miss+warning（不阻断调用），仅 required family 完全缺失时按 policy 行为；复杂度信号（Phase 4）接入历史失败计数。
- 测试：L2 注入与标签、retire 排除、去重计数；L5 必检新增（锚漂移过滤 miss+warning、required family 缺失按 policy、记忆冒充 primary evidence 被 admission 拒、跨项目越域注入被拒、retire 后不再注入、人工创建被拒）；不产生新权威对象的 ownership 断言。

## Phase 6 工程清债 + usage-fit（P-08/P-11/P-12/P-13，~2 d）
- 6.1 `T114_*`→`PAPER_IMPLEMENTATION_*` 迁移：runner/gate/package.json/meta 测试/证据目录与 run id 前缀全链**原子更名，无 alias**（项目未上线无外部消费者，保留 alias 即保留双轨面）；同 slice 内全量 runtime-stress + near-prod gate 重跑作为收口证据。
- 6.2 矩阵一致性脚本进测试链：T-114 matrix（与本包新增 slot 文档）中 slot/profile/prompt id 集合 == 代码注册集合，注入漂移失败。
- 6.3 `cost_usd` 消费接入（依赖 T-123 价格表；未就绪则登记降级与复活条件）。
- 6.4 golden scenario usage-fit 套件：≥3 个公开论文构造的复现项目（arXiv 带代码论文，素材由本包准备，与 Phase 2.5 长上下文金丝雀素材同源），acceptance 模式 coordinator 全链推进，人审 rubric（候选质量/批判有效性/证据可追溯/约束遵守）评分留档；后续每里程碑重跑对比不劣化。
- 测试：更名后全量 runtime-stress + near-prod gate 重跑；一致性脚本负例；rubric 评分表进 `04-verification.md`。

## 开发与测试节奏（D7，本包工作方式约定）

| 节奏 | 触发 | 内容 | 通过标准 |
|---|---|---|---|
| 每次提交 | 默认本地/CI | `tsc --noEmit` + 受影响单测/schema 测试 | 0 失败 |
| 每 slice 收口 | slice 完成 | 新必检用例先注册进 runtime-stress 对应 `required_*` 组再实现（防漏）→ 全量 runtime-stress；governance sync/lint；`03`/`04` 留痕 | `status=passed`，必检 0 缺失/0 skip |
| 每 Phase 收口 | Phase 完成 | runtime-stress + focused 集成 + `git diff --check` + 用户验收对话（确认进入下一 Phase） | 全绿 + 用户确认 |
| 里程碑 | Phase 2/3/4 各完成后 | 受影响 slot 的 env-gated provider canary + near-prod gate 重跑 | `passed`（非 blocked），run id 记入 `04` |
| usage-fit | Phase 6 起每里程碑 | golden scenario 全链推进 + 人审 rubric 评分 | 评分留档，对比上轮不劣化 |

## 风险与回滚
- 每 Phase 独立可回滚。压缩闭环回滚=关闭恢复分支回到全 blocked 语义（保留报告记录）；coordinator 回滚=下线路由不影响 slot 端点；kernel 抽取回滚=保留迁移前 service 的 git 历史，对照测试保证行为等价；更名回滚=alias 双向有效期内无破坏。
- Prisma 迁移仅在显式批准后应用；审批前 coordinator 用 in-memory 仓储推进 L1/L2。
