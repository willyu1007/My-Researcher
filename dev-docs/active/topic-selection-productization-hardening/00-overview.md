# 00 Overview

## Status
- State: in-progress
- Progress: **Phase 0 DONE（2026-06-11）**——F-01 关闭。矩阵迁移至 `docs/context/process/topic-selection-workflow-matrix.md`（v1b 11 节点对齐 + v1c 命名修正 + 两新列 + slot map 全收录）；v1c 节点常量 `TOPIC_SELECTION_V1C_NODE_ID(S)` 落地并收编 9 处引用；一致性脚本 + 7 项漂移负例 + backend 包装测试进默认套件。验证：typecheck 双绿、backend 套件 1332/0 fail、v1b harness e2e 绿；v1a replay smoke 失败经 stash 基线证实为既有环境数据问题（资源池采样前置不满足），与改动无关。
- Progress: **Phase 1 DONE（2026-06-11）**——F-02/F-03/F-07/F-08/F-09 关闭（F-09 价目待人工填入）。要点：审计修正（harness 路径原生 registry 驱动，硬编码在遗留双轨）；5 个 service 去硬编码改 registry 解析 + `@deprecated` 围栏；契约层 provider union + typed overrides + 两层校验；invocation registry（30 模板/19 schema）+ gateway 运行时强校验 + lint 四守卫；cost_usd 机制接通。验证：backend 1375/0 fail、v1b e2e、n8 smoke 全绿。遗留生成路径全量移除（~5.8k 行）超预算未做，留待 Phase 5 或独立任务。
- Progress: **Phase 1 补充收口（2026-06-12）**——①遗留双轨**全量移除**（用户指令"不留技术债务"）：trio 重写为读投影（~5.6k 行删除）+ 死代码 IntakeService 整体删除 + 注入缝/Fake/孤儿全清 + registry 修剪（27 模板/16 schema）；backend 1291/0 fail、v1b e2e、N8 smoke 全绿。②牌价已核实填入，cost_usd 实际点亮。③ **D1/D2 用户签核锁定**（D1 后端薄服务分阶交付；D2 = N6 同形 gate/loopback 触发，零新引擎，详见 03 决策记录）。
- Progress: **Phase 4 DONE（2026-06-12）**——F-06 关闭。投影 service（六类来源）+ packet 契约 + 4 个仓储 list 方法（零迁移）+ N6/N8 注入（frozen_input artifact 引用同构 projection 模式，准入恒等式安全）+ N6 gate dedup warning（D-T123-01 加法式 harness 改动）。验证：单测 8/8、e2e dedup warning 绿、N6/N8 smoke 绿、v1b harness e2e 绿。偏差：v1a N6 注入显式缓（admission 已有池 dedup）、压缩专项以设计注记代替。
- Next: Phase 2（Coordinator）→ Phase 3（N8 debate）→ Phase 5 收尾。
- Task ID: `T-123`
- Feature / Milestone / Requirement: `F-001` / `M-001` / `R-009`
- Depends on: `T-088`（workflow-runtime-foundation，in-progress——harness 周边改动需联合决策，见 `02-architecture.md` §协调）
- Writes into: `T-089`（agent-workflow-review）的 `06-workflow-matrix.md` 是矩阵 SSOT 文件，Phase 0 直接修订该文件并在 T-089 `03-implementation-notes.md` 留痕
- Reuses: `T-112`（llm-context-cache-runtime）的 context policy profile / prompt packet / 压缩 / token 预算基础设施；`T-115` 确立的人审兼容不变量
- Trigger: 2026-06-11 全链产品化审计（节点 debate 必要性 / 复杂度 / 编排-harness 配合 / 压缩-上下文-记忆 / 参数规范化 五维）

## Goal
- 收口审计发现 F-01..F-11（见下），把选题管理模块从"政策完备、契约完备"推进到"产品可run、故障可恢复、决策可记忆、参数零死角"，并为每项交付配齐完备测试（单测 / 集成 / 全链 e2e / 故障注入负例 / 不变量回归）。

## Audit Findings（本任务包的问题清单，as-verified 2026-06-11）
- **F-01 SSOT 漂移**：`dev-docs/active/topic-selection-agent-workflow-review/06-workflow-matrix.md` 的 v1b 行仍是旧 8 节点 ID（`plan-research-slice`、`form-topic-question-contract`、`assess-package-readiness` 等），而实现是 11 节点新 ID（`packages/shared/src/research-lifecycle/topic-selection-v1b-workflow-harness-contracts.ts:538-1024`）。slot map 标 v1c N2 debate 为 planned/policy-only，但 `topic-selection-v1c-n2-bounded-debate-runtime-service.ts` 已实现。debate/override 决策绑不到真实 node_id。**补充核实（2026-06-11，Phase 0 对齐时）**：v1a 行 9/9 无漂移；v1c 另有两处命名漂移（矩阵 `human-promotion-decision` vs 代码 `record-human-promotion-decision`；矩阵 `topic-selection.downstream.feedback-recheck` vs 代码 `topic-selection.v1c.downstream-feedback-recheck`），且 v1c 仅 3/6 节点在代码有正式 node_id；v1b 语义槽实为 10 个（旧 slot map 只列 4 行 planned）。Phase 0 决策已全部对齐（DP-0.1~0.8，见 `03-implementation-notes.md`）。
- **F-02 N8 参数硬编码**：`apps/backend/src/services/topic-selection-v1b-value-assessment-service.ts:49-53` `DEFAULT_MODEL = openai/gpt-5.5`，`:164` `input.model ?? DEFAULT_MODEL`，`:238` 静态 `DEFAULT_HIGH_REASONING_JSON_SCHEMA_PARAMS`——绕过 model profile registry，违反 DMP-10 单路径规则（topic-selection 域内唯一一处）。
- **F-03 v1b N4/N6 槽位 profile 未注册**：slot map 中 `research_slice_planning` / `topic_question_contracting` 标 "planned"，profile/contract 未在 registry 落地。
- **F-04 编排层缺位**：harness 返回 `route_decision` 给调用方，但产品中无持久化调用方。无人认领：并发防护（v1b invocation trace 走 control-plane artifact，prisma 无 v1b invocation 模型，疑似无 `(workflow_run_id, node_id, node_attempt_id)` 唯一性保障——Phase 2.0 核实）、loopback 次数预算、节点/run 级超时、run 级状态机/断点恢复。
- **F-05 v1b N8 debate 仅政策**：`topic-selection.debate.v1b-value-tension.v1` scenario policy-only；矩阵 `debate_allowed: conditional` 的触发条件未量化（何为"边缘/不稳定/冲突"无判据）。
- **F-06 跨 run 决策记忆缺失**：v1b N8 blocking conditions 提及 "negative memory check"，但不存在跨 run 的否决候选/失败试验/AcceptedRisk 投影供 N6/N8 消费；run 内仅有 N7 `failed_trial_synthesis`。产品化使用后必然重复生成已否决候选、重复踩同一 reviewer risk。
- **F-07 provider_overrides 无类型**：`Record<string, unknown>`（`llm-gateway.ts` / model-profile-registry），OpenAI `reasoning.effort` / DashScope `enable_thinking` / DeepSeek thinking controls 无 schema 校验。
- **F-08 prompt template / output schema 无中央 registry**：各 service 硬编码 ID+version（如 value-assessment `:47`），无版本化注册与启动期校验。
- **F-09 telemetry `cost_usd` 恒 null**：无 provider 价格表，成本治理（codex vs provider 升级决策）缺数据。
- **F-10 压缩与 token 估计未规范化**：压缩策略是单一写死的 'deterministic structural compaction'；token 估计为统一保守估计，无 per-provider 计数函数。
- **F-11 复杂度热点**：`topic-selection-v1b-workflow-harness-service.ts` 单文件 ~540KB / ~12.7k 行，11 个节点 runner 内联。

## Non-goals
- 不实现 T-088 拥有的 runtime primitives；harness `invokeNode` 生命周期语义（8 步校验 + replay + route_decision）**不改**。
- 不改 v1a/v1b/v1c 授权契约与决策链语义；F-01 矩阵对齐是文档+注册修正，不改节点行为。
- 不重新引入 v1b legacy direct-write 路由（`'legacy write routes are not registered'` 404 测试必须保持绿）。
- 不引入第二套 debate 运行时、第二条 LLM 调用路径、第二个 hash 实现（DMP-10 / canonicalHash 单源）。
- 不让 memory/cache/compression 参与权威决策——Decision Memory 是输入性上下文，gate 仍由确定性校验器与既有政策决定。
- 不做新 UI 工作台；UI 增量仅限 coordinator 最小触发入口（Phase 2.4，可选）。
- 不做 literature 模块的参数规范化（边界外，仅在 `02-architecture.md` 提示不一致）。

## Decisions（2026-06-12 全部签核锁定，终态详见 `03-implementation-notes.md` §整包决策）
- **D1 Run Coordinator 形态（locked）**：后端薄服务 + 分阶段交付。Phase 2 先交付同步 `advance-until-blocked`（带步数上限，由 HTTP/UI/脚本触发，人在环），常驻自动推进/队列 daemon 作为后续可选扩展。
- **D2 N8 debate 入口语义（locked，经用户两轮追问后重新框定）**：**N6 同形 gate/loopback 触发，零新引擎**——T1/T3 = N8/N9 gate 新增 warning/blocker 编码；升级 = 既有 loopback 路由；准入 = 实装 N7 既有 `n7_n8_debate_admission_review` 槽；T2 = admission 的 trial-ledger 参考输入；T4 = 既有 execution_plan 显式选择；运行时复用 v1c N2 有界序列。
- **D3 与 T-088 的关系（locked）**：T-123 独立推进；凡触碰 harness service 本体（含 Phase 5.1 拆分）的改动先在两包的 implementation-notes 各记一条联合决策再动手。

## Acceptance Criteria (high level)
- [ ] F-01..F-11 逐项关闭，每项在 `03-implementation-notes.md` 有对应条目与证据指针。
- [ ] 矩阵一致性脚本进入测试链：矩阵 node_id 集合 == 代码注册节点策略集合；注入漂移时校验失败（负例覆盖）。
- [ ] topic-selection 域内所有 LLM 调用经 model profile registry 解析（含 N8/N4/N6）；provenance 含 `profile_hash` + `normalized_params_hash`；lint/grep 级守卫防回潮。
- [ ] coordinator 在 acceptance 隔离下自动推进 v1b N1→N11 至人审/blocked 停驻；故障注入三件套（并发双发→单执行、崩溃→replay 恢复、loopback 超额→budget_exhausted blocked）全绿。
- [ ] v1b N8 debate：触发器单测全分支；mocked debate e2e 绿；不触发时单 agent 路径回归不变；provenance `debate_extension` 完整。
- [ ] Decision Memory：预置否决候选的 e2e 中，N6 上下文 packet 含 dedup 信息、N8 收到负面记忆输入；token 预算/压缩路径有覆盖；不产生新权威对象。
- [ ] 既有不变量回归：legacy 404、mocked product 拒绝、replay 幂等（拆分前后对比）、v1b 人审 N2/N5 e2e、`pnpm typecheck` + desktop typecheck + UI gate 0/0。
