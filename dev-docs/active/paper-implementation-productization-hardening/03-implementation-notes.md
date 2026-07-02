# 03 Implementation Notes

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

## 联合决策登记（JD-x，与 T-127 互链）
> T-123 于 2026-06-16 收尾关闭归档；共享面后续 JD 互链对象转为 **T-127**（topic-selection-backend-hardening-and-expansion）。下列条目涉及 T-123 的**前向对齐 / 共决**对象转 T-127；涉及 T-123 **已签决策形态**（D1/D2 文本）的为历史引用，不变。
- **JD-候选（待 Phase 0 正式登记）**：T-123 D1 文本为"同步 advance-until-blocked + 人在环触发"（该形态现由 T-127 承接）。Phase 0 需与 T-127 对齐：topic-selection 或同步采纳自动化优先形态，或在两包各自记录域差异理由（topic-selection 节点单步耗时短，同步语义代价低；paper-implementation 单 slot 分钟级，异步是硬约束）。
