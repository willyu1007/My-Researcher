# 05 Pitfalls

## do-not-repeat（从 T-114 继承的护栏，本包所有 Phase 适用）
- **不开双轨入口**：任何新能力（coordinator、压缩分支、记忆注入）必须走既有 runtime route/service/admission 路径，不得出现第二条产生 runtime artifact 或绕过 admission 的入口。T-114 用 no-dual-track 必检用例钉死过一次，新代码同样要进 scan。
- **harness 不得变成第二生产者**：harness 只验证/录证。历史上多次想"顺手"让 harness 编译 prompt/选模型/修输出，全部被边界检查拦下；本包的 coordinator 同理——它是调用方不是生产者。
- **人读摘要不可作为验收制品**：promotion/closure 证据必须机器可验（TAP 解析、JSON summary、ownership scan exit code）。审计叙述只能是快照。
- **先注册必检用例再实现**：T-114 的经验是 runner 的 `required_*` 列表是防漏的唯一可靠机制；先写实现后补注册曾导致用例改名后静默脱离闭环门。
- **共享面改动不单方面合入**：orchestrator/gateway/registry 同时服务 topic-selection；改动前 JD 登记互链，topic-selection 回归确认后才算闭环（教训来源：T-114 期间 matrix 与 06-node-runtime-matrix 的文档漂移靠最终 review 才发现，跨包漂移更难发现）。
- **压缩/记忆产物不是证据**：`durable_memory_as_standalone_evidence: false`；压缩报告是 lineage 制品。任何把它们当 primary input/evidence 的设计直接拒绝。
- **不要混淆三种 Run/attempt/branch 词义**：`PaperImplementationCoordinatorRun` 是 PI 编排实例，不是 EF experiment Run；PI runtime `node_attempt_id` 不是 EF ExecutionAttempt；coordinator candidate path/override “分支”不是 WorkOrder branch。新文档/契约必须使用全名。
- **不要靠语义判断 revise/fork**：PI 显式发 `revise | fork`，服务端只比较冻结 branch semantic-frame hash/relation；任何 branch semantic/relation change 必须 fork，existing/in-flight experiment Run 永不重绑。
- **不要把停驻再做成一份授权**：CoordinatorStop 是派生暂停，必须引用 owning Gate/action；Gate 通过后自动续推。不得对 admitted boundary 内 batch Run/cell Attempt/retry/reconcile 重复确认，也不得用全局 policy/decision engine“统一”两层。
- **不要把“四个 coordinator stop”写成“四次必然人工确认”**：先固定每条 golden fixture 的 Cycle/revision/claim/export/external-effect 基数，再按 Initiation/Authority/Recovery/Plumbing 分类计数。参考 full-paper happy path 是 `1/4/0/0`；Stop-only acknowledgement、技术重试和手工 ID/hash/JSON 搬运都不在允许增量内。
- **不要把每个 seed/repeat/参数 cell 建成 Run 再补 RunSet**：T-132 D-13a 已固定一个 paper-bound revision 对应一个 immutable required-cell batch Run；cell 只是 EF value object，技术重试才创建 cell-scoped Attempt。
- **不要复用现有 HarnessRun/coordinator run/status 充当 experiment Run 或 branch head**：D-13a/D-13b 是新的 PI↔EF v2 契约；历史运行对象保持原语义。
- **不要让 PI 回写 Run manifest 或按指标重跑 cell**：PI 只冻结 admitted scientific plan 并投影 EF 返回的 exact manifest binding；科学 cell 变化必须新 revision/admission。
- **不要让同库部署抹掉领域事务边界**：即使 PI 与 EF 共用一个 Postgres，也不得让同一 transaction callback/shared write repository 同时写两域 canonical/inbox/outbox 表，不得引入共享可变 authority 表、分布式锁或 2PC。EF 发 `RunManifestFrozen`，PI 本地 sequence-fenced CAS 并发 `BranchHeadAdvanced`，EF exact inbox receipt 后才可首 Attempt。
- **不要把 inbox receipt 与本域 mutation/outbox 拆成多个事务**：consumer Unit-of-Work 必须原子提交 receipt、owning-domain writes 与结果 outbox；否则 receipt-first 会丢状态，state-first 会在重放时重复写。冲突/stale outcome 也必须有确定性本域收敛，不能无限重试或同步直写兜底。
- **不要把 relay 状态当成领域 acknowledgement**：outbox `published | delivered`、HTTP 2xx、lease/retry marker 都只是基础设施 bookkeeping；唯一 acknowledgement 是 EF 原子提交的 exact `BranchHeadAdvanced` inbox receipt，不新增 `dispatch_eligible` mirror。
- **不要把“四个 Unit-of-Work”误写成全系统只有四次 SQL transaction**：四个边界指 happy path 的领域权威提交；relay lease/delivery 可以有基础设施事务，但不得写领域权威或跨域合并。
- **不要用人工确认、manual promotion、成功/完成/指标/证据来选择或回退 head**：head 是最新 frozen lineage；失败/取消仍保持，旧 Run 也不自动取消。
- **不要把 terminal simulation Attempt 映射成 terminal scientific Run**：Run 是 mode-neutral；PI 只从 exact Attempt events 重建 `workflow_simulation_status`，Run/cells 在没有 eligible real result 时保持 scientifically `not_started`，不得创建 SimulationRun、科学结果或 RunEvidenceUnit。
- **不要用 no-evidence Cycle closure 回写 EF 状态**：`control_flow_validated_no_paper_evidence` 只作为 PI `closure_kind` 记录 D-18 exact refs，必须带 null disposition/selected exit 与 `evidence_eligibility=false`；它不改变 EF facts，也不增加第二次确认。
- **不要让 ranges/generator/autotune 成为 scientific-cell authority**：T-132 D-15 已固定 admission 前 embedded exact cells/`cell_plan_hash`；TaskSpec refs 是 EF 后置绑定，EF 不得补点/换点/科学字段默认，runtime mutation 必须新 revision/admission，当前 S3 不得顺带实现这一待排期联合切片。
- **不要把 exact cell plan 做成新聚合或逐 cell 审批**：它是 WorkOrder revision 的内嵌值集合；draft 自动编译/预览、EF parity validation 和 N-cell materialization 都不增加用户动作。
- **不要为 failed/cancelled/incomplete execution 创建或信任 REU**：T-132 D-16 将 REU 限定为 complete、protocol-compliant、validation-passed EvidenceCandidate；执行失败只进入 existing Cycle closure record 的 embedded immutable snapshot/hash 与 Sidecar display。
- **不要把 negative/inconclusive 写进 execution status**：完整有效的 positive/negative/inconclusive 都是 completed execution；差异属于独立 scientific result/Cycle disposition 轴。
- **不要把 protocol `passed` 写成 scientific `positive`**：EF validation 只确认 exact batch 的测量/可比性/血缘合规；EvidenceCandidate/REU 只携可信证据身份，不能选择 ValidationCycle 结论或 exit。
- **不要让 Result Analysis、调用方、EF 或 REU 成为科研结论 writer**：Result Analysis 只产出 exact-hash-bound proposal；现有 Cycle ClosureService/StateWriter 在一次 closure AuthorityAction 中唯一写 nullable scientific disposition，并从 admission-frozen definitions 派生 selected exit。直接 `cycle_assessment`/`decision_exit` 输入必须拒绝。
- **不要让 open proposal/packet 进入 claim 或 dossier**：ResultInterpretationPacket 只能由 exact closed Cycle + accepted proposal/ref/hash 物化；不得新增 ScientificConclusion aggregate、第二 accepted-packet authority、proposal acknowledgement 或 selected-exit confirmation。
- **不要用 project-wide REU scan 或 Sidecar 替代 Cycle closure scope**：dossier 只消费显式 closed-Cycle snapshot refs/hashes，并重验 project/Cycle/hash；Sidecar 不是可独立修订的失败账本。
- **不要以兼容名义保留 D-16 双轨**：S3 `assertProjectRunEvidenceAccounting`、trusted failed/cancelled REU、mixed status 与旧 acceptance tests 必须在同一迁移切片中被替换；不得保留 dual-read、fallback、FailureEvidenceUnit 或第二 gateway。
- **不要为 snapshot entry 或 dossier accounting 新增确认**：Cycle closure 与 dossier export 沿用既有 AuthorityAction；D-16 不改变 `1/4/0/0` 参考预算。
- **不要把 Cycle closure 变成全历史扫描或“最新值”查询**：closure 只冻结一个 CAS 保护的 current-effective branch-head watermark。每个 admitted branch 必须有 durable head；non-head history 默认排除，旧结果只有 exact `comparison_input_ref` 才能进入比较血缘且不能扩 execution scope；Cycle 任意 active real Attempt（含 non-head）都必须先终态/显式取消，scope/head 漂移则整批丢弃重建，禁止部分关闭或迟到结果回流。
- **不要把 T-132 D-19 的 pre-bound fixture 变成产品 bootstrap 旁路**：它只是首个 PI↔EF seam integration 的前置 fixture；typed assets 仍须走真实 v2 identity/readiness path，T-124 D10 的最终 golden scenario 仍须经真实 bootstrap 路由入链并推进到 dossier ready。
- **不要把首切片扩成“顺手跑一次实验”**：D-19 的终点是 EF exact inbox receipt/acknowledgement，必须保持零 ExecutionAttempt、provider、result、validation、evidence、Cycle closure、UI/search 与 legacy migration 写入；D-16/D-17/D-18 是后续原子切换，不能部分混入或据此宣称完整 seam 已关闭。
- **不要用 singular legacy 记录伪装 D-19**：两个 required cells 必须一一 materialize 并共享一个 immutable batch Run；现有 ResearchWorkOrder 的 singular TaskSpec/external-job 字段、WorkOrderHarnessRun、CoordinatorRun 或 runtime attempt 都不能被重解释成 v2 revision/cell/Run/head/inbox/outbox authority。
- **不要用 additive schema 制造运行时双轨**：D-21 的 PI/EF v2 table families 各自领域所有；旧 singular ResearchWorkOrder/WorkOrderHarnessRun/generic EF rows 只能 existing-field diagnostics/admin read。禁止 backfill、dual write、runtime union view、legacy adapter fallback 或把 legacy row 标注成 v2 eligible。
- **不要把 default-off capability 当 saga kill switch**：开关只控制新的 PI v2 admission；`WorkOrderRevisionAdmitted` 一旦提交，后续 EF preparation、PI head CAS 与 EF acknowledgement 必须继续 drain。中途按开关跳过消费会制造永久半完成 authority。
- **不要把 rollback 实现成恢复 legacy writer**：D-19 验收后的产品切换只让新 paper-bound admission 进入 v2。Rollback 只能停止新 v2 intake并保留/重放已提交 v2 canonical/inbox/outbox，不能路由到旧 writer、删除 v2 事实或重绑 active object。
- **不要把 D-22 最小 schema pack 扩成 future-complete data model**：首次 migration 只含 Phase 1 identity/readiness 与 D-19 durable-ack spine。Bootstrap/promotion、Attempt/provider/result/validation/evidence/closure/UI/search、legacy migration/backfill 与 global cutover 必须保持在后续授权切片，不能因“以后会用”提前建表。
- **不要为满足旧 VersionLock schema 伪造 baseline/method 资产**：Pack A 的 exact allowlist 只有 Dataset、DataPolicy、MetricDefinition、Benchmark、EvaluationProtocol v2。`BaselineImplementationVersion` 与 `MethodRecipeComponent` 的 v1 `minItems: 1` 是契约债，不能扩大 D-19 fixture 或制造虚假 source-backed readiness。
- **不要把 readiness closure 当成实施授权**：`ready_for_implementation_authorization` 只表示矩阵、人口和基线可供授权审查；代码/config/Prisma migration、DB apply 与产品 enable/cutover 分别需要独立确认。
- **不要用 JSON 逃避数据库 invariant**：identity/unique/CAS/cell/event relationship 必须落在同域关系字段、constraint/FK；只有具名、schema-versioned、server-hashed typed frozen snapshot/event payload 可用 canonical JSON。禁止 generic `kind/payload`、EAV、caller hash 或 untyped event-authority blob。
- **不要用跨域 FK 或 eligibility mirror 制造隐式共享权威**：PI/EF 之间只保存 exact external ref/hash/sequence/event，不建 ORM relation/FK/cascade；default-off capability 是 admission config/routing guard，不写 legacy/v2 eligibility、`dispatch_eligible` 或 saga kill-switch 字段。

## 历史教训（待本包推进中补充）

### 2026-07-03/04 双会话并发跑 backend 全量 → 文件级崩溃假红（已根治：runner 跨进程互斥锁）
- **Symptom**：full suite 出现大批文件级 `not ok`（集中在引 buildApp 的重文件：routes/integration/app-config），子进程 ~11-13s 死亡并留 ts-node TSError 风格 `[Object: null prototype]` dump；总测数骤降（崩溃文件丢失全部 subtests，如 1635→1020）、wall time 反而偏短。同一文件单跑全绿。
- **Root cause**：`run-node-tests.mjs` 把全部测试文件交给单个 `node --test --loader ts-node/esm`（默认并发 ~cores-1 个子进程，每个全图类型检查）；两个会话同时跑 → 双倍舰队耗尽 CPU/RAM，子进程装载期崩溃。测试代码本身无错。
- **Tried**：按常规红灯排查逐文件复跑（全绿，误导性极强）；靠"人记得别同时跑"不可靠。
- **Fix**：runner 启动舰队前取 `os.tmpdir()` 排他锁文件，后到者轮询等待；2026-07-04 复审后加固——claim 文件串行化 stale 接管、child-exit 后才释放、release 仅删自己的 payload、心跳+5min 年龄兜底（详见 03 同日条目、04 Log）。
- **Prevention**：信任红灯前先认签名——"文件级崩溃 + 总数骤降 + 单跑即绿"= 资源争用非代码错；勿设 `BACKEND_TEST_SUITE_LOCK=0`（仅争用取证用）；旁路重型入口（runtime-stress 13 文件步等）尚未取锁，并行会话期间勿与全量同跑；共享工作树有并行会话时**禁用 git stash**（会卷走对方中间态制造 franken 假红，教训见 T-128 侧记录）。
