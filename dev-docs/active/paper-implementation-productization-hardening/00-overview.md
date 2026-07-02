# 00 Overview

## Status
- State: in-progress
- Progress: 包创建（2026-06-11）。审计发现 P-01..P-13 已登记（as-verified，含代码证据指针）；待签核决策 D1~D7 列于下方；Phase 0 对齐项未开工。
- Task ID: `T-124`
- Feature / Milestone / Requirement: `F-001` / `M-001` / `R-013`
- Depends on: `T-114`（paper-implementation-runtime-orchestration-hardening，done——本包直接继承其 runtime/admission/Domain Gate 边界、95 必检用例与 L1-L6 证据体系；闭环复跑 run id 见 T-114 `04-verification.md` 2026-06-11 两行）
- Coordinates with: `T-127`（topic-selection-backend-hardening-and-expansion，planned——共享 orchestrator / llm-gateway / model-profile registry / context-policy registry 的**后续**改动需两包联合决策，机制见 `02-architecture.md` §共享面协调）。**T-123（topic-selection-productization-hardening）于 2026-06-16 收尾关闭归档，其已交付产出（价格表 F-09、provider_overrides 类型化 F-07、D1·D2 决策形态）为历史引用不变；共享面后续协调对象转为 T-127。**
- Reuses: `T-112` 的 context policy profile / prompt packet / 压缩 / token 预算基础设施；`T-114` 的 runtime-stress / near-prod gate / ownership-scan 证据机制
- Trigger: 2026-06-11 paper-implementation 产品化审计（单次调用上下文工程与跨 run 记忆 / harness 与编排分工 / 语义节点参数规范化 / debate 细化与复杂度检查 / 工程优化与技术债 五维 + 开发测试节奏）

## Goal
- 把 PaperImplementation 从 T-114 的"逐 slot 运行时已硬化、证据机器可验"推进到"产品可 run、长上下文不卡死、决策可记忆、参数零死角、debate 按需启用、任务级债清零"，并固化开发与测试节奏，使每个交付 slice 既有 fail-closed 证据也有 usage-fit（满足实际使用需求）验证。

## Audit Findings（本任务包的问题清单，as-verified 2026-06-11）

### 维度一：单次调用上下文工程 + 跨 run 记忆
- **P-01 压缩闭环缺失**：token gate 的 `requires_compression` 永远终结为 blocked——`apps/backend/src/services/topic-selection-agent-orchestrator-service.ts:1401-1499` 的 `blockForCompressionAttempt` 只记录压缩报告证据即返回 blockedSource，不存在"压缩→重过 gate→继续 provider 调用"的恢复分支。压缩目前是审计制品而非执行能力。产品长上下文（trace manifest / evidence board / 论文级输入）一旦超预算整链 fail-closed 无出路；L5 的 `*_over_budget_zero_provider_calls` 必检用例证明的是 fail-closed 分支而非恢复分支。
- **P-02 context policy profile 内联漂移**：11 个 paper-implementation runtime service 各自内联构造 `contextPolicyProfile(...)`（如 `apps/backend/src/services/paper-implementation-feasibility-planning-runtime-service.ts:937-1040`），token 目标硬编码（如 32k 输入 / 3k 输出），不在 `topic-selection-context-policy-profile-registry-service.ts` 中央 registry（grep 零命中）；各内联副本之间约 85% 控制流重复。无注册校验 → 新 slot 的预算/压缩/缓存策略漂移无人发现。
- **P-03 跨 run 记忆层不存在**：所有 paper-implementation slot 的 `memory_policy.allowed_memory_families: []`（同上 `:957`）。唯一跨步上下文是 admitted runtime artifact 血缘链（route→skeptic→cycle→feasibility）。无失败 probe/run 记忆、无 provider variance 记忆、无 park/abandon disposition 记忆 → 产品化使用后必然重复提案已否决路线、重复踩已知失败。topic-selection 侧已有 recheck-risk / decision memory 体系可借结构（不可直接借语义）。

### 维度二：harness 设计与编排分工
- **P-04 编排层缺位（Run Coordinator）**：18 个 `runtime-slots/*/run` HTTP 端点在产品代码中无任何非测试调用方（grep 证实仅 `apps/backend/src/routes/paper-implementation-routes.ts` 路由定义自身命中）。无 run 级状态机、无断点恢复、无同 project 并发推进防护、无跨 slot 预算/步数管理。harness（`paper-implementation-ai-workflow-harness-service.ts`）按 `10-harness-runtime-boundary.md` 是验证/录证/队列面，设计评估为扎实，但不能也不应回收编排。与 T-123 F-04 同构。

### 维度三：debate 细化与复杂度检查
- **P-05 debate 拓扑硬编码、复杂度判定缺失**：4 个多角色 slot 的角色链写死在 service 内（trace integrity 4 角色 `paper-implementation-trace-integrity-debate-runtime-service.ts:107-128`；claim boundary / dossier readiness 各 3 角色 `paper-implementation-p1-runtime-review-service.ts:169-237`；motive evolution 2 角色），其余 10 个单角色 slot 无升档路径。orchestrator 合同中 `debate_extension`（debate_policy_id / round_index / role / stage）管道已存在但 policy 全部写死。不存在任何"复杂度信号 → 执行档位"的机器可检映射。`13-pending-node-processing-matrix.md:48` 的 shared debate helper 抽取 revisit 条件（route 双 slot promoted + L5/L6 证据）已满足。

### 维度四：语义节点参数规范化
- **P-06 参数规范是文档制品、真相分散 4 处**：slot 参数事实分散在 YAML registry（`.ai/llm-config/registry/model_profiles.yaml`）、backend registry 常量（`topic-selection-model-profile-registry-service.ts:795-1130`）、各 service 硬编码 profile/prompt/context id、dev-docs Profile Resolution Block（T-114 matrix `:51-95` 模板），靠人工对齐。无机器可读 SlotParameterManifest，无"路由 ↔ manifest ↔ L5 必检用例 ↔ 金丝雀 env flag"四向完备性校验。
- **P-07 参数边界负例缺失 + overrides 不对齐**：无 L1 负例锁定"per-request 裸模型参数（temperature / max_tokens / raw provider params）注入被拒绝"；paper-implementation 无 slot execution overrides（topic-selection v1a debate 有 `slot_execution_overrides`，`topic-selection-need-discovery-debate-loop-service.ts:98-116`），acceptance 模式下编排调试不便。`provider_overrides: Record<string, unknown>` 无类型化（T-123 F-07，归 T-123 修，本包登记消费）。

### 维度五：工程优化与技术债
- **P-08 任务级资源烧进项目级入口**：16 个 `T114_*` env flag 写死在 `package.json` 金丝雀/烟测脚本与 `.ai/scripts/paper-implementation-runtime-stress.mjs` runner 护栏；near-prod gate 由 `T114_NEAR_PROD_RUNTIME_GATE` 门控；证据目录与 run id 前缀 `t114-*`。任务已关闭，命名即漂移为债：新 slice 不知该挂 T114 还是新任务前缀。
- **P-09 大文件可维护性**：`paper-implementation-p1-runtime-review-service.ts` 1338 行；`topic-selection-model-profile-registry-service.ts` 1400+ 行承载两个域的 profile；T-114 `13-pending-node-processing-matrix.md` 2171 行（promotion 记录与边界检查单混存）。
- **P-10 并行鲁棒性覆盖薄**：L6 仅覆盖"minimal concurrency"（并发 materialization 恰一成功）。未覆盖：同 implementation_project_id 并发跑同一 slot 的重入语义、admission >2 并发幂等压力、coordinator 出现后的并发推进互斥。
- **P-12 文档一致性无脚本守卫**：T-114 matrix 是 promotion 记录 SSOT，但矩阵中 slot/profile/prompt id 与代码注册之间无一致性脚本（类比 T-123 F-01 的矩阵一致性脚本进入测试链）。

### 维度六：其他产品化必需
- **P-11 成本治理缺数据**：`LlmCallTelemetry.cost_usd` 恒 null（无 provider 价格表，与 T-123 F-09 同源）。debate 升档、模型档位选择、压缩收益的经济性决策无数据支撑。价格表归 T-123/共享面；本包负责 paper-implementation 侧消费与档位决策接入。
- **P-13 usage-fit 验证缺层**：L1-L6 全部是 fail-closed/边界/幂等证明；provider variance 评估只测 schema/稳定性。没有任何一层回答"语义产出质量是否满足实际科研工作需求"（golden 项目素材、全链推进、人审 rubric、输出可用性评分）。产品化验收不能只靠"不出错"。

## Non-goals
- 不改 T-114 确立的 runtime/admission/Domain Gate 权威边界与 fail-closed 语义；压缩闭环只新增"可恢复"分支，不削弱任何既有 blocked 分支。
- 不把编排塞回 harness：harness 的验证/录证/DecisionWorkQueue 职责保持不变；Coordinator 是新的独立薄服务。
- 不引入第二 LLM gateway、第二 model-profile registry、第二 debate 运行时、第二 hash 实现（继承 T-114 non-goal 与 DMP-10 单路径规则）。
- 不让记忆/缓存/压缩产物成为独立证据或权威输入（`durable_memory_as_standalone_evidence: false` 不变量沿用；admission 不修复、不重跑、不 materialize 的边界不变）。
- 不做论文写作/投稿/rebuttal 工作流（仍是显式 non-goal）。
- 不在本包内修共享面的 provider_overrides 类型化与价格表（T-123 拥有；本包登记联合决策并消费其产出）。
- 不未经批准应用 Prisma 迁移到 live 数据库（coordinator run 状态机新表走审批流程）。

## Proposed Decisions（待签核）
- **D1 Run Coordinator 形态（已签核 2026-06-12，自动化优先）**：后端薄服务 `PaperImplementationRunCoordinatorService`。`POST /coordinator-runs/:id/advance` 异步启动 run 内自动推进循环（202 + 轮询），逐 slot 持久化推进直到 `completed | waiting_review | blocked | budget_exhausted`，**默认无人在环停驻**——人通过 run/step/决策记录查询面做事后确认与 override，不做流程内闸门。链内延续决策确定性化：route 候选选择由版本化 `CandidateSelectionPolicy@v1` 纯函数自动完成（决策记录可审计、可 override 重跑分支）；skeptic `recommended_disposition != proceed` → `waiting_review` 语义停驻。blocked 可直接 re-advance（同 slot 新 attempt、预算封顶）。首期两条 lane：validation-planning 四步链（artifact 血缘耦合）+ motive lane `motive_decomposition → motive_evolution`（领域锚耦合，无 artifact 链，契约已核实）；board 两 slot 以单步 pipeline 纳入同一状态机；pipeline 以代码级 const 注册表声明（非用户可配置、无分支 DSL）。崩溃恢复 = lease 过期后显式 re-advance 从断点续推（常驻 daemon 自动续推留作扩展）。Coordinator 只调用既有 runtime slot service 与确定性服务；零语义处理、零 prompt/model 选择、零域权威写入；持久化仅限 coordinator run 状态机。
- **D2 debate/复杂度档位（已签核 2026-06-13）**：确定性信号触发升档（对齐 T-123 D2）。`ComplexityAssessment@v1` 纯函数信号提取（上下文 token 估计、冲突/challenge ref 数、上游 blocker/warning 数、confirmatory_marker、baseline_gap_status、预算包络、记忆中的历史失败计数），映射 `single_role | with_skeptic | full_debate` 三档，判定在 slot service preflight 内执行（不在 coordinator）；升档只增加角色证据，final artifact 契约不变。`DebatePolicy@v1` 注册表版本化（含阈值表；policy 版本进 runtime identity 并入 manifest 对账；复用既有 `debate_extension.debate_policy_id` 管道）；admission 复算档位并拒绝漂移。首批双试点：`validation_cycle_planning.cycle_candidates` + `cross_board_synthesis.merge_split_reuse_scenarios`，full_debate 复用 P1 三角色模式做模板。强制开关：product 仅允许 force-up（含 actor 记录），test/acceptance 双向。run 预算不足以升档 → fail-closed（`TIER_BUDGET_INSUFFICIENT` 转 blocked，提额后 re-advance），不静默降档。LLM 不拥有档位决策。
- **D3 压缩闭环（已签核 2026-06-13，单执行器定案）**：runtime 压缩路径唯一执行器 = `deterministic_structural`（按 registry 声明的 packet 可裁等级 + `preserved_fact_kinds` 做保 ref 分级裁剪，纯函数可复算），gate→压缩→re-gate→通过继续/不足 blocked；最多一次压缩尝试；压缩发生时 `COMPRESSION_APPLIED` warning 传播至 role/final artifact；复杂度信号（D2）使用压缩前 token 估计。**`codex_assisted` 从 paper-implementation context profile 的 `allowed_executor_kinds` 中删除**——项目未上线，不保留"已声明未实现"的双轨/漂移面；LLM 压缩器输出不可复算，会破坏 identity/replay 根基。语义浓缩不进调用路径，走上游 digest artifact 模式（一次生成、经 admission、有独立 identity 的一等制品，复用文献模块 key-content extraction 已验证模式），runtime 只消费其 ref；digest 生产链路不在本包，仅立边界与负例。packet 可裁等级在 registry 按 context family 静态声明，请求方只可收紧不可放松。over-budget blocked 时 blocker 携带可操作指引（最大占用 packet、建议 digest 化）。共享 orchestrator 改动（内部压缩循环）走 JD 联合决策。
- **D4 记忆首批 families（已签核 2026-06-13，三族齐发）**：`paper_implementation_failed_probe_memory`（失败 probe/run 与原因码）、`paper_implementation_disposition_memory`（route/motive 的 park/abandon 决策史）、`paper_implementation_provider_variance_memory`（variance 评估投影）。写入面是确定性投影（live adapter 失败 run、variance 评估、disposition 决策），不是 LLM 写入；人不可创建记忆，但 v1 提供 retire/批注管理面（retire 含 actor+理由，retired 条目从消费查询排除）。作用域：failed_probe/disposition 限定单 implementation_project，provider_variance 为 workspace 全局，跨项目提炼留二期。消费形态：带 use-label 的辅助上下文；锚版本漂移的条目确定性过滤为 miss+warning（不阻断调用），仅当 slot 声明某 family 为 required 且完全缺失时按 policy 行为；同 target+原因码语义去重（计数累加，沿 DecisionWorkQueue dedup 模式），供 D2 历史失败信号直接消费。`durable_memory_as_standalone_evidence: false` 不变量沿用。
- **D5 SlotParameterManifest@v1（已签核 2026-06-13）**：backend registry 运行时导出为唯一权威 + 提交式生成快照（脚本导出 JSON 快照入 repo，CI 校验新鲜度——参数变更强制成为可 review 的 diff，沿本 repo DB SSOT 同步模式）。manifest 字段：profile id + 全部 model option（provider/model/normalized params/timeout）、prompt template id+version、context policy profile id+hash、token 预算、retry/fallback policy、run-mode eligibility、debate policy id+version、candidate selection policy id+version、memory family 声明。四向完备性测试（路由↔manifest↔必检用例↔金丝雀 flag）同时进默认 CI（纯静态）与 runtime-stress 闭环 step。双源方向（T-124 提案立场，最终走 JD）：backend 权威，YAML 降为 provider/model 候选声明的对账输入。新 slot 不再手写 dev-docs Profile Resolution Block（仅留 manifest 指针）；T-114 历史 block 不重写、仅加取代注记。裸参数禁令：schema 层 strict 拒绝未知键 + service 层负例。
- **D6 任务级→项目级资源迁移（2026-06-13 自我修正：原子更名、无 alias）**：`T114_*` env flag 更名为 `PAPER_IMPLEMENTATION_*`，stress/gate 证据目录与 run id 前缀去任务化，package.json 脚本/runner 护栏/meta 测试在同一 slice 内原子完成，旧名即刻失效。依据 D3 裁定原则：项目未上线、无外部消费者，保留 alias 就是保留双轨/漂移面；全部引用 grep 可达，原子更名零风险。更名后全量 runtime-stress + near-prod gate 重跑作为收口证据。
- **D7 开发与测试节奏**：见 `01-plan.md` §开发与测试节奏。核心：每 slice 收口必跑全量 runtime-stress（新增必检用例先注册再实现）+ governance sync/lint；每 Phase 收口加用户验收对话；里程碑跑受影响 slot 金丝雀 + near-prod gate 并记 run id；Phase 6 起 golden scenario usage-fit 验收常态化。

## Acceptance Criteria (high level)
- [ ] P-01..P-13 逐项关闭或显式降级（写明理由与去向），每项在 `03-implementation-notes.md` 有对应条目与证据指针。
- [ ] 压缩闭环：超预算且可裁剪的上下文经 `deterministic_structural` 压缩后完成 provider 调用，envelope 记录 `compressed_context_hash` 血缘且 admission 复算验证；`COMPRESSION_APPLIED` warning 传播至 role/final artifact；不可裁剪/质量门失败/压缩后仍超预算维持 fail-closed 且 blocker 携带最大占用 packet 指引；paper-implementation context profile 不再声明 `codex_assisted` 执行器（负例：声明语义压缩的 profile/请求被拒）；既有全部 over-budget blocked 必检用例改写为双分支后保持绿；topic-selection 侧回归由 T-127 共同确认。
- [ ] context profile registry 化：paper-implementation 全部 slot 的 context policy profile 经中央 registry 解析，内联副本删除；registry 值与原内联值的哈希对照测试证明迁移零语义漂移。
- [ ] 跨 run 记忆：三个 families 落地（failed_probe/disposition 项目域、variance 全局域），至少两个消费 slot（feasibility/cycle planning 与 route planning）以 use-label 上下文注入；retire/批注面可用（retired 条目被排除、retire 含 actor+理由、人工创建记忆被拒）；L5 负例覆盖锚漂移条目过滤为 miss+warning、required family 缺失按 policy 行为、记忆冒充 primary evidence 被 admission 拒绝、跨项目记忆越域注入被拒、语义去重计数累加可复算。
- [ ] Coordinator：acceptance 隔离下一次 advance 自动推完 route→skeptic→cycle→feasibility（无人工介入）至 completed 或语义停驻；`CandidateSelectionPolicy@v1` 同输入同选择且决策记录可复算；skeptic 非 proceed 处置 → `waiting_review` 停驻、override 重进含 actor 记录；motive lane 与单步 board pipeline 经同一状态机推进；故障注入三件套（并发双发→单执行、崩溃后 re-advance 从断点续推且无重复 artifact、预算耗尽→budget_exhausted）全绿；ownership scan 扩展证明 coordinator 无任何域权威写入与语义处理。
- [ ] debate/复杂度：`ComplexityAssessment@v1` + `DebatePolicy@v1`（注册表版本化阈值）落地——同输入同档位、admission 复算拒漂移、升档仅增角色不改单角色 profile/prompt identity 且 final artifact 契约不变、policy 版本变更使旧 identity 按 drift 阻断；共享 bounded debate kernel 抽取且 P1/trace service 迁移其上（瘦身验证）；cycle_candidates 与 cross_board_synthesis 双试点接入条件升档并各有 env-gated live 金丝雀证据；product force-up（含 actor）可用且 force-down 被拒；预算不足升档 fail-closed（`TIER_BUDGET_INSUFFICIENT`）负例覆盖。
- [ ] 参数规范化：`SlotParameterManifest@v1` 四向对账（18 路由 ↔ manifest ↔ runtime-stress 必检用例 ↔ 金丝雀 flag）进入默认 CI 与 runtime-stress 新 step，注入缺失即红（负例覆盖）；提交式快照新鲜度校验（registry 改动未再生成快照即红）；L1 负例锁定裸参数注入被拒；test/acceptance 限定的 slot execution overrides 可用且 product 模式拒绝。
- [ ] 工程清债：`T114_*`→`PAPER_IMPLEMENTATION_*` 迁移完成且 stress/canary/gate 全绿；矩阵一致性脚本进入测试链（matrix slot/profile/prompt id 集合 == 代码注册集合，注入漂移失败）；`cost_usd` 在 paper-implementation telemetry 中非 null（或登记 T-123 依赖降级）。
- [ ] usage-fit：golden scenario 套件存在——≥3 个公开论文构造的复现项目（arXiv 带代码论文，素材由本包准备）在 acceptance 模式经 coordinator 全链推进，人审 rubric（至少含候选质量/批判有效性/证据可追溯/约束遵守四维）评分留档于 `04-verification.md`。
- [ ] 既有不变量回归：T-114 的 95 个必检用例（更名后）持续全绿；near-prod gate 重跑 passed；`tsc --noEmit` 与 governance sync/lint 通过。
