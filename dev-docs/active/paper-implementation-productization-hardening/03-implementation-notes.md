# 03 Implementation Notes

## 2026-07-11 S5 首条 golden scenario 落地 + live 首跑（gs-001-lora，status=partial）
- **素材**（`.ai/golden-scenarios/paper-implementation/gs-001-lora/`）：LoRA（arXiv 2106.09685）反推的测试用选题包（bridge handoff 全形态+hash 纪律）、ground-truth.md 答案卡（实际路线/对照路线空间/实验矩阵/结论边界/已知局限）、rubric.md 四维评分表。**Runner** `.ai/scripts/paper-implementation-golden-scenario.mjs`（env 门控 `PAPER_IMPLEMENTATION_GOLDEN_SCENARIO_LIVE=1`；真 bootstrap 路由入链 → 确定性动机脊柱 → 三条 coordinator lane provider_llm 真跑 → 受理桥物化 → review-packet 汇总；停驻如实记录+override 带 actor）。
- **live 首跑 run `gs001-lora-live-003`**（8 次 provider 调用，~9 分钟，人审包 `.ai/.tmp/paper-implementation-golden-scenario/gs001-lora-live-003/review-packet.md`）：
  - **走通即证据**：bootstrap/hash 门、W4 回流（blocked→resolve→re-advance）与 waiting_review 停驻+override（actor 记录）、**受理桥 live 物化**（TechnicalRouteCandidate 从真跑 artifact 血缘创建）全部在真实路径成立。
  - **三类结局解码**：①技术缺口——motive_evolution `InvalidRequestError`（failed_runtime，待查请求构造）+ motive lane run_mode 映射不一致（dry_run→test 与 provider eligibility 冲突，runner 以 replay 模式绕行并登记）；②链上下文设计缺口——skeptic 首攻报 `BLOCK_PRIMARY_ROUTE_ARTIFACT_BODY_UNAVAILABLE`（coordinator 只穿引 ref/hash 不穿提案正文，runner 以 source_context_packets 补喂后才进入语义批判）→ **S2 胖 packet 穿引的直接案由**；③真语义批判（rubric 金料）——skeptic 四条实质 blocker（confirmatory 预算矩阵未定/数据集指标阈值未预承诺/基线控制不全/基线选择依赖可行性）与 curation 三条（重复绑定/缺低秩直接探针/缺复现基线证据）都是对选题包的合理批评。
  - feasibility_probe 物化 skipped（lane 未达 feasibility 步——skeptic 语义停驻属实）。
- **移交**：evolution InvalidRequestError 与 run_mode 映射 → S2 排查项；提案正文穿引 → S2（PC-S1..S4 语境同域）；人审 rubric 首评待用户（评分留档 04）。

## 2026-07-11 S1-W4 落地（队列回流：coordinator blocked → 入队 → resolve → re-advance）
- **契约（加性）**：`DecisionWorkQueueItem` +`source_coordinator_run_ref/source_step_index`（coordinator 血缘，harness lane 恒 null）；`ResolveDecisionWorkQueueItemRequest` +`re_advance` 与 `retry_budget_override`（提额语义定案：**经 resolve 请求可选 override**，只升不降，替代仓储显式提额方法）；queue_type 枚举加性 +`unclassified`；新 `ResolveDecisionWorkQueueItemResponse`（item 展开 + 可选 `coordinator_advance`，平 resolve 响应形状不变）。schema 同步 + schema 测试 +1（注：fastify ajv coerceTypes 会把 override=0 归并到 null 分支=无 override，负例用 -1 钉）。
- **coordinator 入队**：step 结局 blocked/failed_runtime（含 no-eligible-candidate 停驻——step 记 passed 但 run 转 blocked，同样入队；waiting_review 是语义停驻不入队）→ 经**窄接口** `PaperImplementationDecisionQueueWriter`（仓储接口文件定义，仅 `enqueueDecisionWorkQueueItem`，app.ts/测试均以对象字面量收窄运行时表面）物化 queue item。分类=**枚举映射表** `PAPER_IMPLEMENTATION_COORDINATOR_QUEUE_TYPE_BY_BLOCKER_CODE`（精确码：TIER_BUDGET_INSUFFICIENT→loop_budget_review、COORDINATOR_NO_ELIGIBLE_CANDIDATE→human_review、SLOT_INVOCATION_FAILED→failed_workflow、AGENT_EXECUTION_FAILED/SCHEMA_VALIDATION_FAILED/TimeoutError/TransientError/RateLimitError/UpstreamError→failed_run_review、GATE_CONSTRAINT_FAILED/INVALID_PAYLOAD/NOT_FOUND/VERSION_CONFLICT→gate_blocker）+ 前缀表（TIER_BUDGET_/COORDINATOR_/TRACE_），无表命中时按 outcome 枚举（failed_runtime→failed_run_review）否则 `unclassified`；dedup_key=`coordinator:{run_id}:{slot_id}:{主 blocker}`。入队失败按崩溃语义（CoordinatorPersistenceFailure，re-advance 幂等重试）。**W3 零权威结构断言有意演进**：允许 coordinatorRepository+projectRepository+decisionQueueWriter 三持久化句柄，且 writer 运行时键面断言仅 enqueue 一个方法（测试注释注明 deliberate boundary evolution）。
- **retry/cooldown 真语义**（in-memory + prisma 两处，**修复 Prisma reopen 覆盖 retry_count=0 的复审 bug，in-memory 同型同修**）：reopen 时 `retry_count=旧值+1`、`retry_budget=max(旧,新)`、`cooldown_until=reopen 时刻+15min`（`PAPER_IMPLEMENTATION_DECISION_QUEUE_REOPEN_COOLDOWN_MS` 常量，v1 固定值；仓储构造可注入仅供测试）；`retry_count>=retry_budget` 时不新增状态枚举——保持 open + `recommended_actions` 加 `raise_retry_budget`（取舍：item 仍可见可人工处理，"需人工"语义由标记+resolve 路由 409 承载）。resolve 带 override 时提额并撤掉 raise 标记。coordinator 队列项默认 retry_budget=2（常量）。
- **回流（controller 组合，harness 不依赖 coordinator）**：resolve 路由在 `re_advance===true` 且 item 有 source_coordinator_run_ref 时，**先**做门检（预算→cooldown，顺序为预算优先：提额提示不被 cooldown 遮蔽且可测），409 时 item 原样未 resolve；门过后 resolve 成功 → `coordinator.advance` 一次，advance 投影随响应 `coordinator_advance` 返回（advance 抛错则错误透传，item 已 resolve、终态重放可再触发）。harness service 新增 `getDecisionWorkQueueItem`（仓储 `findDecisionWorkQueueItemById`）供门检。
- **持久化**：schema.prisma 队列表 +`sourceCoordinatorRunRef Json?`/`sourceStepIndex Int?`（**迁移未出，S1 统一**；`prisma generate`+ssot sync 已跑）。
- **测试**：L5 必检 +2 先注册后实现（`coordinator_blocked_step_materializes_queue_item`→coordinator unit、`queue_resolve_readvance_resumes_run`→runtime-routes integration，subtest 逐字一致）；coordinator unit 14/14（新增：blocked 入队+dedup+reopen retry 累加+cooldown、分类表未知→unclassified）；harness service unit 13/13（reopen 测试加固 retry=1/cooldown/raise 标记）；prisma repo unit 2/2（覆盖 bug 回归钉死）；runtime-routes integration 49（33 pass/16 env-skip，新增 resolve+re_advance 断点续推、cooldown 409、预算耗尽 409+override 续推）；shared schema 6/6；双包 tsc 零错。未跑全量（W 级收口）。

## 2026-07-11 S1-W3 落地（Run Coordinator 状态机，D1 形态照签核）
- **契约**：新 `paper-implementation-coordinator-contracts.ts`（index+package.json 双注册 + schema 正反例测试）：`PaperImplementationCoordinatorRun@v1`（created→advancing→waiting_review|blocked|budget_exhausted|completed|failed；budget_envelope/consumed/lease/execution 参数/slot_request_payloads）、step 记录（step_index/slot_id/node_attempt_id/runtime_artifact_ref+hash/admission_ref/decision_record/outcome）、`CandidateSelectionPolicy@v1`（纯函数投影→选中 key+决策记录，inputs_hash+rationale codes 可复算；v1=无 blocker 中 gain 最高、平手稳定序第一）。`ERROR_CODES` 加性 +`CONCURRENT_ADVANCE`。
- **服务** `paper-implementation-run-coordinator-service.ts`：lane 注册表代码级 const——lane A validation-planning 四步链（W2 硬化请求形态：上一步 admitted final ref/hash + 选中 candidate_key 注入下一 slot 请求）、lane B motive 双步（同冻结 source refs/hashes bundle，create 时强校验，无 artifact 链）、board 两条单步 pipeline。构造依赖面=7 个 slot service + coordinator repository + projectRepository（preflight 复用）+ idFactory/now/leaseTtl，**结构性零权威写入**（unit test 断言实例键面）。skeptic `recommended_disposition!=='proceed'`→waiting_review 停驻；slot 语义/异常→blocked（re-advance 同 slot 新 attempt）；`TIER_BUDGET_INSUFFICIENT`/包络耗尽→budget_exhausted；`failed` 仅 coordinator 逻辑故障（持久化失败按崩溃语义原样抛出、run 保持 advancing）。product 前置拒 fixture payload；非 product 下 coordinator 机械对齐 fixture 的上游 echo 字段（cycle/feasibility 语义校验要求 echo==注入 ref/hash，静态 fixture 无法预知——仅 fixture 管道、零语义）。
- **并发/恢复**：lease CAS（in-memory 单 turn 原子；prisma updateMany 条件行级原子）→ 后到者 409 CONCURRENT_ADVANCE；崩溃恢复=lease 过期后 re-advance 从最后 passed step 断点续推（node_attempt_id=`run.step-i.attempt-n`，无重复 step/artifact）。
- **持久化/路由**：repository 三层 + prisma 两 model（`PaperImplementationCoordinatorRun/Step`，pi_coord_* 索引；**迁移未出，S1 统一**；`prisma generate`+ssot sync 已跑）；三条路由 POST create(201)/POST advance(**202**，实现同步驱动、真 daemon 留扩展)/GET(含 steps)，controller+app.ts 沿惯例装配。
- **测试**：contracts schema 6/6；coordinator unit 12/12（lane A 一次 advance 完链+血缘串联、skeptic 停驻+override 续推、lane B、board、故障注入三件套、选择复算、product 拒 fixture、零权威依赖面）；runtime-routes integration +1（create→advance→get 真实服务路径）全文件 30 pass/16 skip（env-gated）；L5 stress 文件 52/52；backend+shared tsc 零错。L5 注册 +5 条（coordinator_lane_a_single_advance_completes / concurrent_advance_single_execution / crash_readvance_resumes_without_duplicates / budget_exhausted / selection_decision_replayable），unit test 文件已入 step 01 列表。

## 2026-07-11 S1-W1/W2 落地（受理桥 + 链内 passed-only 回查）
- **W1 受理桥**：6 个 Create* 契约与对应领域对象加可选 `source_proposal_artifact_ref/hash`；共享校验器 `paper-implementation-acceptance-bridge.ts`（10 步：成对必填→ref_type→artifact 存在→final scope→passed→workflow_type 映射→final_artifact_hash 对账→admitted 记录对账；全部拒于权威写入之前）；三个确定性服务接入（runtimeAdmission 可选注入沿 feedbackRecorder 惯例，app.ts 三处装配）；prisma schema 6 model +2 列（**迁移未出，S1 统一**）；45/45 测试 + L5 `acceptance_bridge_lineage_drift_rejected` 注册。
- **W2 链内回查**：共享校验器 `paper-implementation-runtime-artifact-consumption.ts`（400/409 语义，blocked final 冒充封死）；route_skeptic / cycle_planning / feasibility 三个消费 slot 接入全量回查（feasibility 的 route/skeptic 锚在 echo 检查之外补存在性+passed+hash）；**experiment_planning 经契约核实无上游 admitted artifact 消费字段，如实未接**（W3 lane 设计注意：experiment 链的消费语义若需要须先加契约字段）；测试 fixture 改为真跑上游 slot 播种真实血缘（新 `paper-implementation-runtime-chain-lineage-fixtures.ts`，不弱化校验）；L5 +4 条注册。
- 交叉验证：双包 tsc 零错；全量 runtime-stress run id 见 04。W3（coordinator）边界确认：v1 只做 slot 链推进与停驻/回流语义，**不做受理物化**（受理桥由人或后续 wiring 经 API 调用；ownership scan 继续证明 coordinator 零权威写入）。

## 2026-07-11 S0-5 落地（D-N8 裁定）+ S0 全包提交
- S0 全部改动（含复审修复轮）以 `506a6073` 提交（72 文件）。
- D-N8 签核并实现：claim 级 lineage 改 literature∨experiment any-of 机制（`WRITING_AFFECTING_TARGET_ANY_OF_REQUIREMENTS`），dossier 级 literature 保持；顺带修复 `inferLineageType` 不识别合成 `required_*_lineage` ref 的缺陷（此前 experiment 缺失项被误归 internal_interpretation——literature 那条只是关键词碰巧命中）。测试：纯实验 claim manifest complete、两者皆无 broken 且修复队列列出双选项、dossier 无文献仍 broken；旧用例期望值更新为双缺失项语义。S0 工单全五项闭合。
- 下一步：S1 开工（工单 `08-s1-workorder.md`）。

## 2026-07-10 S0 实施（治理与正确性补洞，`07-s0-workorder.md` 全四项落地）
- **S0-1 HumanConfirmationRecord 一等实体化**：新契约文件 `paper-implementation-human-confirmation-contracts.ts`（scope 枚举 6 值 / status active|invalidated|superseded / reviewed_sources ref+hash / strict schema）+ schema.test 4 用例；仓储三层（interface / in-memory / prisma）+ `PaperImplementationHumanConfirmationService`（capture 仅人 actor、项目须 active）+ controller/routes `POST|GET /human-confirmations` + app.ts 装配（strategy 工厂）。shared package.json exports 增补子路径。**Prisma 迁移未 apply（待审批）**：schema.prisma 新增 `PaperImplementationHumanConfirmationRecord` 与 `PaperImplementationTraceGateResult` 两 model，`prisma generate` 与 `ctl-db-ssot.mjs sync-to-context` 已跑；迁移命令待用户批准后执行。
- **S0-2 确认/gate ref 存在性校验**：`evaluateTraceGate` 结果落库 + `findTraceGateResultById`；WO admit `admission_gate_result_id` 与 ready dossier `readiness_gate_result_id` 必须解析到同项目 persisted TraceGateResult 且 `gate_status==='passed'`（replay/drift 分支语义不变）；strong claim `human_confirmation_ref` 必须解析到 active + scope=strong_claim_acceptance 的记录；motive evolution human-required 必须带可解析 ref（confirmed_by 单独不再放行）；portfolio 重大结构变更必须带可解析 ref（**新增契约字段** `ApplyMotivePortfolioDecisionRequest.confirmation_ref` 与 `AdmitCoreMotiveVersionRequest.confirmation_ref`，加性）；**审查发现并关闭旁路**：`admitCoreMotiveVersion` 带 primary 替换的内部 portfolio 决策路径同样强制解析（原只查 confirmed_by 字符串）。Domain Gate materialize 无需重复断言——它经由确定性创建方法，门自动透传（记录为设计决定）。routes 集成测试改为走真流程（evaluate 产出真实 gate id 再 admit/ready）。
- **S0-3 runtime preflight 项目校验**（子代理实施）：共享 `paper-implementation-runtime-preflight.ts`（400/404/409），11 个 runtime service options 必填 `projectRepository` + runXxx 首步校验（orchestrator 之前零 provider 调用）；app.ts 11 处注入；11 个负例测试 + L5 必检 `*_inactive_project_rejected_before_orchestrator` ×11 先注册后实现。
- **S0-4 trace debate profile 钉死**：assertRequest 增补 profile 匹配与 model-option 归属两段（镜像 P1R），负例测试 + 必检 `trace_integrity_profile_and_model_option_drift_rejected_before_gateway` 注册。
- **S0-5 未动**（待 N8 裁定）。
- 新增必检用例合计 14 条（11 preflight + 1 profile drift + 2 deterministic lane：WO admit gate 解析、trace gate 落库可解析）。
- 测试证据：`tsc --noEmit` 零错误；受影响套件逐文件全绿（human-confirmation service 3/3、schema 4/4、motive board 11/11、result-claim 11/11、bridge 14/14、trace kernel 11/11、live adapter 11/11、routes integration 4/4、11 runtime unit + l5 52/52 + domain gate 6/6 由子代理验证）；全量 runtime-stress run id 见 `04-verification.md`。

## 2026-07-10 D10 签核（顶层目标与完成定义）
- 用户发起顶层决策对话，确认本包目标从"六个能力谓词"收敛为**可证伪的完成定义**：3 条 golden scenario 全链自动推进至 dossier ready + 五项验收（无人工转录血缘、四点停驻集、治理门对抗不可穿透、成本/重付率有数、rubric 四维达标）。§Goal 已重写（原目标保留作背景）。
- 三项子决策：终点站=全链 dossier ready（否决半链收口——会把最难的 claim/dossier 治理留在验收外）；素材=**测试用选题包**（用户核心洞察：论文与选题不是一个维度，模块入口契约是晋升选题包——故手工构造形态合规的选题包、内容取材 arXiv 带代码论文、经真实 bootstrap 路由进入不开后门、论文已知结论作 rubric ground truth）；停驻点=四点集（skeptic 非 proceed/强 claim/dossier export/预算超限），否决"受理点也停驻"（会退化成审批链）与"更少停驻"（先跑通第一条全链再考虑）。
- 解决方案骨架定为五动作：①关死治理门(S0) ②接上主干(S1) ③单调用活下来付得起(S2) ④链条失败不破产、通过不空心(S3) ⑤看得见+用得上(S4/S5)。工程卫生项不占主干。
- 文档落点：`00-overview.md` §Goal 重写 + D10 条目；`01-plan.md` S5 素材注记。下一步：S0 开工（`07-s0-workorder.md`）；素材构造随 S1 并行准备。

## 2026-07-10 全模块复审登记 + D8/D9 签核 + S0 起草
- 复审形态：四路并行深读（上游链/下游链/debate+共享运行时/harness+队列+产品面）+ gpt-5.5 独立视角 + 既往会话检索；全部 P0 与关键 P1 经主会话到 file:line 复核。SSOT=`06-review-2026-07-10.md`（新发现 N1..N9 + P-01..P-13 复核全为真 + 分工配合审查结论 + 正面确认保持项）。
- 关键新事实（P-01..P-13 之外）：N1 强 claim 人确可被 LLM 伪造（HumanConfirmationRecord 无实体、gate/确认 ref 全链自由文本、TraceGateResult 不持久化）；N2 服务内 admission 自证恒等 + 11 号文档 per-role 语义规则零实现 + role output 契约过平（语义空心可 passed）+ blocked 旁路；N3 debate 无断点续跑（单角色失败=整场作废重付）+ token 估算双重计入（24k 实际≈12k）+ paper 侧压缩未接线 + 不幂等；N4 提案受理无载体（Create* 契约无血缘字段、血缘=回显不回查）；N5 runtime 失败不入队/resolve 无回流/终态 job 无兜底；N6 runtime 不查项目存在性（免烧钱洞）+ trace debate profile 不钉死 + preflight 终态 7 slot 分裂；N7 dossier 可漏未被 packet 引用的失败 REU；N8 claim literature lineage 疑似过度约束（待裁定）；N9 cost 数据 gateway 就绪但 paper 层丢弃 + 桌面对 runtime lane 盲视。
- 用户决策：**D8**（S0-S5 重排序，`01-plan.md` §2026-07-10 修订节）与 **D9**（resume 契约：同 identity 续跑+admission 复核=技术续跑非语义 fallback，S3 实施）签核；PC-S1..S4 并入 S2（07-05 开口关闭）。
- 产出：`06-review-2026-07-10.md`（复审 SSOT）、`07-s0-workorder.md`（S0 工单 draft：S0-1 HumanConfirmationRecord 实体化、S0-2 确认/gate ref 存在性校验+TraceGateResult 落库、S0-3 runtime preflight 项目校验、S0-4 trace debate profile 钉死、S0-5 待 N8 裁定）。下一步：S0 开工（S0-1 Prisma 迁移单独审批）。

## 2026-06-11 包创建与审计来源
- 本包由 2026-06-11 paper-implementation 产品化审计触发，审计基线是 T-114 闭环复跑的两份证据：
  - runtime-stress run id `t114-paper-implementation-runtime-stress-1781132291471`（290 tests / 0 failed / 95 必检全过）；
  - near-prod gate run id `t114-paper-implementation-near-prod-runtime-gate-1781132560502`（live openai 13 次调用与 debate 拓扑一致、Prisma/幂等/漂移/无双轨证据全绿）。
- 审计发现登记为 P-01..P-13（见 `00-overview.md`），其中关键代码事实：
  - `requires_compression` 永远 blocked（orchestrator `blockForCompressionAttempt` 无恢复分支）；
  - 11 个 runtime service 内联 contextPolicyProfile、`allowed_memory_families: []` 全关；
  - 18 个 runtime-slots 路由无产品调用方（仅测试/金丝雀）；
  - debate 角色链全部硬编码、无复杂度档位判定；
  - slot 参数真相分散 4 处无机器对账；16 个 `T114_*` flag 烧进项目级脚本。
- 与 `T-123`（topic-selection-productization-hardening）的关系：同一审计在两个域的镜像包。共享面（orchestrator/gateway/两个 registry）改动走 JD 联合决策互链机制（`02-architecture.md` §共享面协调）；D1/D2 决策形态与 T-123 D1/D2 对齐。

## 待签核决策清单（开工前需用户确认）
- D1 Run Coordinator 形态 —— **已签核 2026-06-12**（自动化优先异步推进，见同日条目）
- D2 debate/复杂度确定性档位 —— **已签核 2026-06-13**（双试点 + 注册表版本化阈值 + 仅 force-up + 预算不足 fail-closed，见同日条目）
- D3 压缩闭环 —— **已签核 2026-06-13**（单执行器定案：删除 codex_assisted 声明，语义浓缩走上游 digest artifact 模式，见同日条目）
- D4 记忆首批三 families —— **已签核 2026-06-13**（三族齐发 + 项目域/variance 全局 + v1 含 retire 面，见同日条目）
- D5 SlotParameterManifest@v1 —— **已签核 2026-06-13**（运行时导出 + 提交式快照；backend 权威/YAML 对账，见同日条目）
- D6 T114_* → PAPER_IMPLEMENTATION_* 迁移 —— **2026-06-13 自我修正为原子更名无 alias**（依据 D3"未上线不留双轨"原则，见同日条目）
- D7 开发与测试节奏（每 slice runtime-stress 收口 + 每 Phase 用户验收 + 里程碑金丝雀/near-prod + usage-fit rubric）

## 2026-06-12 D1 签核（Run Coordinator 形态）
- 用户确认**自动化优先**总原则：本项目设计目标是尽可能自动化，人一般只负责确认和查看，不做流程内闸门。该原则覆盖 D1 全部子决策，并将影响后续 D2-D7 的讨论基线。
- D1.a 推进粒度：异步自动推进——advance 启动 run 内推进循环（202 + 轮询），逐步持久化，直至 completed/waiting_review/blocked/budget_exhausted；否决了"人在环逐步推进"与"同步长调用"两个备选。
- D1.d 扇出点：route 候选选择由版本化 `CandidateSelectionPolicy@v1` 纯函数自动完成，决策记录可审计、人可事后 override 重跑分支；否决了"product 停驻人选"。
- D1.f 重进语义：blocked 可直接 re-advance（同 slot 新 attempt、预算封顶）；`failed` 仅 coordinator 自身故障不可重进。
- D1.c 首期范围：lane A validation-planning 四步链 + lane B motive 链（decomposition→evolution）+ board 两 slot 单步 pipeline；pipeline 用代码级 const 注册表，非用户可配置、无分支 DSL。
- Lane B 血缘核实：`RunPaperImplementationMotiveEvolutionRuntimeRequest`（`packages/shared/src/research-lifecycle/paper-implementation-runtime-contracts.ts:2276-2329`）只要求领域锚（motive/board/portfolio/challenge refs+hashes）与 `human_confirmation_policy_ref`，不要求 decomposition admitted artifact 作 primary input——lane B 为锚耦合序列，coordinator 不做两步间 artifact 链校验，只保证同一冻结 source bundle。
- 文档落点：`00-overview.md` D1 与 AC-5、`01-plan.md` Phase 3、`02-architecture.md` 状态机/分工/R7-R8 已同步更新。

## 2026-06-13 D2 签核（debate 档位与复杂度检查）
- D2.a 试点范围：`cycle_candidates` + `cross_board_synthesis` 双试点（前者下游爆炸半径最大：cycle→feasibility→workorder；后者触及 portfolio 决策），其余单角色 slot 二期推广。
- D2.b 阈值归属：`DebatePolicy@v1` 注册表版本化——阈值表是 policy 制品，版本进 runtime identity 与 SlotParameterManifest 对账；调阈值=发新版本，旧 identity 按 drift 阻断。
- D2.c 强制开关：product 仅允许 force-up（含 actor 记录），不允许降档绕过 policy；test/acceptance 双向可覆盖。
- D2.d 预算不足：fail-closed——`TIER_BUDGET_INSUFFICIENT` 转 blocked，人提额后 re-advance；不静默降档（与全链无 fallback 原则一致）。
- 关键边界重申：档位判定在 slot service preflight 内执行（coordinator 零语义决策）；升档只增加角色证据，final artifact 契约不变；LLM 不拥有档位决策。在自动化优先（D1）前提下，该确定性档位是无人值守 run 的唯一质量节流阀。
- 文档落点：`00-overview.md` D2 与 AC-6、`01-plan.md` Phase 4 已同步。

## 2026-06-13 D3 签核（压缩执行闭环：单执行器定案）
- 用户裁定原则：项目未上线，不留漂移风险与双轨问题，从鲁棒性与清晰度做真设计——否决了"codex_assisted 二期保留"的含糊选项。
- 定案：runtime 压缩路径唯一执行器 = `deterministic_structural`（分级裁剪纯函数，可复算，replay/admission 复核成立）；**从 paper-implementation context profile 的 `allowed_executor_kinds` 删除 `codex_assisted`**——当前内联 profile 声明了该执行器但从未实现，正是"已声明未实现"的漂移面。
- 鲁棒性论证：LLM 压缩器输出不可复算（同输入可产不同摘要），嵌入调用路径等于在 identity 链条心脏埋不确定源，且构成第二条 LLM 通路（non-goal 明令禁止的双轨）。
- 语义浓缩的归宿：上游 digest artifact 模式——一次生成、经 admission、有独立 identity 的一等制品（复用文献模块 key-content extraction 已验证模式），runtime 只消费 ref。digest 生产链路不在本包，T-124 只立边界与负例。
- D3.b：packet 可裁等级在 registry 按 context family 静态声明，请求方只可收紧不可放松。
- D3.c：长上下文金丝雀与 Phase 6 golden scenario 素材 = 公开论文构造（arXiv 带代码论文 3-5 篇），由本包准备，不依赖用户私有素材。
- 默认设计确认：`COMPRESSION_APPLIED` warning 传播至 role/final artifact；复杂度信号用压缩前 token 估计；blocked blocker 携带最大占用 packet 与 digest 化建议。
- 文档落点：`00-overview.md` D3 与 AC-2/AC-9、`01-plan.md` Phase 2 与 6.4 已同步。

## 2026-06-13 D4 签核（跨 run 记忆）
- D4.a 范围：三族齐发——failed_probe、disposition、provider_variance（variance 写入源已存在，增量成本低）。
- D4.b 作用域：failed_probe/disposition 限定单 implementation_project（避免跨项目误导）；provider_variance 为 workspace 全局（provider 可靠性天然全局）；跨项目提炼留二期。
- D4.c 管理面：v1 含 retire/批注面——retire 含 actor+理由，retired 条目从消费查询排除；人不可创建记忆（写入仅限确定性投影）。场景依据：probe 因基础设施失败不 retire 会永久误导自动推进。
- 设计默认（随签核生效）：锚版本漂移条目确定性过滤为 miss+warning 而非 block（记忆是辅助上下文非权威，因它停机违背自动化优先；仅 required family 完全缺失按 policy 行为）；同 target+原因码语义去重计数累加（沿 DecisionWorkQueue dedup 模式），供 D2 历史失败信号直接消费。
- 文档落点：`00-overview.md` D4 与 AC-4、`01-plan.md` Phase 5 已同步。

## 2026-06-13 D5 签核（SlotParameterManifest）+ D6 自我修正
- D5.a manifest 形态：backend registry 运行时导出为唯一权威 + 提交式生成快照（CI 新鲜度校验，参数变更强制成为可 review 的 diff，沿 DB SSOT 同步模式）。
- D5.b 双源方向：backend 权威、YAML 降为 provider/model 候选声明的对账输入——此为 T-124 的 JD 提案立场，registry 为跨域共享面，最终与 T-127 共决。
- D5 默认设计（随签核生效）：四向对账同时进默认 CI 与 runtime-stress；裸参数禁令 schema strict + service 双层；新 slot 不手写 dev-docs block（manifest 指针）；T-114 历史 block 仅加取代注记；manifest 含 D1/D2/D4 挂载位（debate policy / candidate selection policy / memory family，未落地前 null 占位）。
- D6 自我修正：原草案"保留旧名过渡 alias + 告警"与用户 D3 裁定原则（未上线不留双轨/漂移面）冲突，修正为**原子更名无 alias**——T114_* 全部引用 grep 可达，同一 slice 内一次切换，meta 测试负例捕获残留旧名，更名后全门重跑。
- 文档落点：`00-overview.md` D5/D6 与 AC-7、`01-plan.md` Phase 1 与 6.1、`02-architecture.md` R5 已同步。

## 2026-07-05 P-01 对账:orchestrator 半边已由 D-T128-02 落地(caller-supplied 架构),Phase 2.2 原设计被取代
- **既成事实**(T-128 W-11,commits `41ac51b3`/`cb5479ef`,JD=T-088 `06-joint-decisions.md` D-T128-02 回填段):共享 orchestrator 的 `requires_compression` 恢复分支已存在,形态为 **caller 预供**——`TopicSelectionAgentRuntimeCompressionAttemptInput` 携可选 `compressed_messages`,orchestrator 验证(确定性质量门)→ 记录报告 → 以 `compression_already_applied=true` re-gate → 过门则以压缩消息续跑,仍超则 `TOKEN_BUDGET_OVER_LIMIT_AFTER_COMPRESSION` 硬 block(防循环,最多一次尝试)。**orchestrator 不在内部执行裁剪**——这取代了本包 01-plan Phase 2.2 的「orchestrator 压缩执行分支(内部分级裁剪)」设计;D3 的核心裁定(deterministic_structural 唯一执行器、无调用路径内 LLM 压缩、可复算、质量门强制)在新架构下**逐条保持**,只是裁剪执行位从 orchestrator 移到 caller 侧纯函数。JD 明文:「paper-implementation L5 `*_over_budget_zero_provider_calls` 不受影响——其调用方不供 compressed_messages,**启用归 T-124 后续**」= 本包 P-01 剩余义务。
- **caller 面盘点**(2026-07-05 grounding):10 个 runtime slot service 构建 runtime token budget,其中 **6 个携带同一胖字段 `source_context_packets`**(evidence-board-curation / cross-board-synthesis / feasibility-planning / experiment-planning / route-planning / validation-cycle-planning——正是 P-01 点名的「evidence board / 论文级输入」风险面;其余载荷均为 refs/hashes 骨架);motive 两槽(decomposition/evolution)无 packets,构造上不构成超预算面;trace-integrity-debate 已有自有压缩感知管路且属 debate 路径(STEP-7 facts builder 的下游义务,D-T128-02 明文「跟其后做、不独立建」)。
- **修订后的 caller 半边切片(PC-S1..S4,待用户对齐后开工)**:
  - **PC-S1 设计落栓(本条+01-plan 注记)**:降级语义承 D3/D3.b——层级 L1=逐 packet 正文裁至定长摘录(保 packet id/ref 骨架+截断标记),L2=整包剔除(refs/hashes 全保);caller 侧以既有 token 估计器**预估并择取最小充分层级**(「逐级重估达标即停」在 caller 侧实现,orchestrator 单次尝试语义不变);**永不裁** authority/conflict/challenge refs 与 `preserved_fact_kinds` 骨架;`required_preserved_facts` 声明 ref 骨架+逐 packet id,packet 正文显式不列 required。**v1 层级以 attempt-builder 内静态常量声明**(单源可测);Phase 2.1 的 registry 化(11 内联 profile 迁移+可裁等级入 registry)保持独立计划位,不并入本切片——避免一次吞下迁移面。
  - **PC-S2 共享构建器+首槽穿透**:paper-impl 侧共享纯函数 attempt 构建器 + 首个消费方 **evidence-board-curation**(P-01 与 Phase 2.5 金丝雀双点名):roleMessages 参数化(includePackets 层级,单源无镜像漂移)+ 穿透测试(胖 packets 逼出 requires_compression → 恢复续跑 → 成功+报告工件)+ 既有 L5 fail-closed 钉测零改动(不供 attempt 的调用方行为原样)。
  - **PC-S3 铺开其余 5 packet 槽**:同构建器机械应用+逐槽 required-facts+测试。
  - **PC-S4 边界收尾**:motive 两槽 document-as-within-budget;trace-integrity-debate 明文留在 STEP-7 下游;L5 over-budget 用例按 Phase 2.4 拆双分支(不可裁→blocked 保留 / 可裁→压缩后完成且血缘可验)。
- **跨包边界**:全部改动在 paper-implementation caller 侧(共享 orchestrator 零触碰——恢复分支已存在);若实施中需动共享面,按既定协议先在 T-088 JD 登记。

## 2026-07-03 外部修复留痕：research-lifecycle id 生成 count+1 主键碰撞（9fb04a26 同类）
- 来源：T-128 W-10 首次产品跑同日的对抗式审查确认 literature 同类缺陷仍存于 `research-lifecycle-service.ts`——nextPaperId/nextNodeId/nextSnapshotId 用"行数+1"生成 `P___`/`NODE-____`/`SP-____` id，而 `deletePaperProject` 删除路径真实存在：删任何非最新 paper 后下一次创建即撞主键（500）。本项经查未被 T-124 认领，由独立会话修复并在此留痕。
- 修复形态（镜像 9fb04a26）：repository 三层（interface / in-memory / prisma）`countPapers/countNodes/countSnapshots` → `listPaperIds/listNodeIds/listSnapshotIds`（count 三方法全仓库无其他调用方，直接替换）；服务侧镜像 literature 的 `nextPrefixedNumericId` 改 max+1，带 padWidth 参数适配 `P`=3 位无连字符、`NODE-`/`SP-`=4 位。id 对外形态不变、无契约变更；paper-implementation 依赖的 paper/node/snapshot id 生成自此删除安全。
- 回归测 3 个（mutation-solid）：预置幸存高位 id（P009/NODE-0009/SP-0009，行数=1）断言新 id = max+1（P010/NODE-0010/SP-0010）；经 count+1 变异反验，恰好三个新测红、七个旧测不受扰。

## 2026-07-03 工具链修复留痕：backend 套件跨进程互斥锁（并发全量假红根治）
- 背景：同日取证确认（见 04 Log 2026-07-03 行）双会话并发跑全量套件时，双倍 ts-node 子进程舰队耗尽机器资源，子进程装载期崩溃（~11-13s，TSError 风格 `[Object: null prototype]` dump），产生文件级 `not ok` 假红（两次取证分别 43/4 个文件）、总测数骤降（崩溃文件丢失全部 subtests，如 1635→1020）与误导性偏短 wall time。"全量须单会话独占"靠人记不可靠，改由 runner 自身强制。
- 形态：`apps/backend/scripts/run-node-tests.mjs` 在 spawn 舰队前以排他锁文件（`O_EXCL` 创建 + pid JSON 内容，零依赖）取跨进程互斥；已被持有则打印持有者 pid 并每 2s 轮询（15s 心跳行），空闲后接管继续。持有者 pid 已死（`process.kill(pid,0)` ESRCH）判定 stale 自动接管，接管前重读内容比对防误删他人新锁；内容不可解析仅在 mtime > 60s 时视为 stale（防误杀写入中途的锁）。
- 锁域取 `os.tmpdir()`（机器级/每用户）而非仓根：争用的资源是机器 CPU/RAM 而非工作树，跨 worktree/克隆的两次运行同样必须串行；也不脏 git status。逃生口 `BACKEND_TEST_SUITE_LOCK=0`（仅用于刻意复现争用取证）。
- 释放路径全覆盖：`exit` 事件（覆盖 process.exit 与 uncaughtException）+ SIGINT/SIGTERM/SIGHUP once 处理器（先 `child.kill(signal)` 带走测试舰队再释放锁再重抛默认终止——保证"锁空闲 ⇒ 无舰队在跑"，定向 kill runner 不再留孤儿舰队诱发下一位等待者撞上争用）；等待期间不装信号处理器，排队中 Ctrl-C 立即退出且无锁可漏。
- `run-node-tests-repeat.mjs` 无需改动：它逐次 shell 出真 runner，每次迭代天然继承锁（其他会话可在两次迭代之间公平插队，表现为该迭代 elapsed 偏长）；两脚本 header 均已注明。
- 测试形态说明：脚本为顶层副作用 .mjs，不在 src 测试图内，不加单测；验证走真实行为——stale 接管/等待-接管/信号释放三条路径手验 + 双并发全量真跑（见 04 Log 同日行）。

## 2026-07-04 质量复审修复：套件锁四处边角加固 + flow-runner 预算适配
- 背景：对本轮未提交 diff 的 high-effort 复审（8 视角 finder × 独立验证，findings 全 CONFIRMED）在锁实现上确认四个边角缺口与两个生态缺口，按验证者方案修复（其中 stale 接管一项验证者建议的 rename 方案推演仍有残洞，改为更强的 claim 文件串行化）。
- 修复形态（`run-node-tests.mjs`）：
  - stale 接管 TOCTOU → **O_EXCL claim 文件串行化**：接管前必须原子创建 `<lock>.takeover-claim`，唯一 claim 持有者才可在"内容仍等于 stale 原文"前提下 unlink 主锁；claim 60s 年龄自愈防中途死亡。read-compare-unlink 三步在跨进程下可被对手的"接管+重建"插入（rename 同理——rename 挪走的是路径上当前的任何东西），claim 串行化把删除权收敛到单持有者。
  - 信号路径提前放锁 → 处理器只发信号，释放与重抛统一收敛到 child 'exit'；实测又揪出下一层：node --test 协调器收 TERM 默认瞬死、compute-bound ts-node worker 全部孤儿化——fleet 改 `detached` 独立进程组 + `process.kill(-pid)` 组信号直达每个 worker（实测 12 进程 200ms 全灭且锁后于舰队消失）；二次信号走默认终止，遗留锁由 staleness 规则回收。
  - release 无主校验 → tryTake 返回写入的精确 payload，release 先读文件比对，仅删除仍载有本 run payload 的锁（手删+他人重建后不再误删他人活锁）。
  - pid 复用无限等待 → 持有者每 15s touch 锁 mtime 心跳；合法 JSON 锁 mtime 超 5min 一律判 stale（不再唯 pid 存活论——EPERM 对每用户 tmpdir 锁恰是反向信号）；等待消息补 startedAt/cwd 与 `ps -p` 排查提示。
- `experiment-foundation-full-flow-runner.mjs` backend-test 预算 300s→900s：solo 全量本就 ~286-294s（余量 ~2%），锁排队会把等待变 timeout 假红。
- 复审当日的两项待确认（SP 契约拓宽、锁抽共享模块）经用户确认后于同日落地，见下一条目。

## 2026-07-04 复审待确认两项落地：SP 校验拓宽 + 套件锁共享模块化
- **snapshot id 校验 `\d{4}`→`\d{4,}`（纯放宽，27ad677b）**：生成器 padStart(4) 不截断、SP-9999 后照常铸出 SP-10000，但三处校验硬编码 4 位——快照建档成功且为活跃指针，却永远过不了 buildWritingPackage；桌面端无锚提取还会截成 SP-1000 误导航。拓宽 SNAPSHOT_ID_PATTERN、writing-package body schema、desktop tryGetSnapshotId 三处，与 VERSION_ID_PATTERN 的 `P\d+` 弹性风格对齐；paper/node 无硬编码位数校验不需要动。新增 `paper-project-contracts.schema.test.ts` 回归（isSnapshotId 4/5 位接受 + 3 位拒绝；schema SP-10000 过/SP-999 400）。
- **套件锁抽共享模块 `apps/backend/scripts/lib/suite-lock.mjs`**：复审确认 runtime-stress 13 文件步在 12 核机上瞬时舰队宽度与全量完全相同却不取锁（v1c-production-depth 7 文件步次之）。锁全部机制（心跳/年龄兜底/claim 串行化接管/ownership release/逃生口）移入单一模块——一份锁路径常量，杜绝双份漂移；`run-node-tests.mjs` 改 import。两个 .ai runner 的多文件（≥2 个 .test.ts 参数）`node --test` 步在**步计时器启动前**取锁：锁等待不吃步预算，且子步默认预算宽裕（runtime-stress 900s / v1c 1800s），不复刻 flow-runner 300s 那类超时假红。单文件步不取锁（舰队宽度 1-2,过度串行只亏不赚）。
- 残留声明：步超时路径只杀协调器,孤儿 worker 可能短暂活过锁释放（两 runner 预先存在的行为,集成注释已表）;修复它需 detached 组信号改造 .ai runner 的 Ctrl-C 语义,不在本轮范围。

## 联合决策登记（JD-x，与 T-127 互链）
> T-123 于 2026-06-16 收尾关闭归档；共享面后续 JD 互链对象转为 **T-127**（topic-selection-backend-hardening-and-expansion）。下列条目涉及 T-123 的**前向对齐 / 共决**对象转 T-127；涉及 T-123 **已签决策形态**（D1/D2 文本）的为历史引用，不变。
- **JD-候选（待 Phase 0 正式登记）**：T-123 D1 文本为"同步 advance-until-blocked + 人在环触发"（该形态现由 T-127 承接）。Phase 0 需与 T-127 对齐：topic-selection 或同步采纳自动化优先形态，或在两包各自记录域差异理由（topic-selection 节点单步耗时短，同步语义代价低；paper-implementation 单 slot 分钟级，异步是硬约束）。
