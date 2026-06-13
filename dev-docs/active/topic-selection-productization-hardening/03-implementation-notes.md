# 03 Implementation Notes

> 每个 Phase 收口后追加：改了什么、为什么、关键决策、未尽事项（actionable TODO）。F-01..F-11 逐项关闭时在此记录证据指针。

## Findings 关闭追踪
| Finding | Phase | 状态 | 证据 |
|---|---|---|---|
| F-01 SSOT 漂移 | 0 | **closed (2026-06-11)** | 新 SSOT `docs/context/process/topic-selection-workflow-matrix.md` + 一致性脚本进默认套件；验证见 `04-verification.md` Phase 0 |
| F-02 N8 参数硬编码 | 1.1 | **closed (2026-06-12)** | 实为 DMP-10 双轨。2026-06-11 先 registry 化清零 DEFAULT_MODEL；2026-06-12 按用户指令**全量移除遗留生成路径**（trio 重写为读投影 + IntakeService 整体删除），双轨不复存在；见 §2026-06-12 补充 |
| F-03 N4/N6 profile 未注册 | 1.2 | **closed (2026-06-11)** | 审计结论修正：三个 single-agent profiles 实际已注册（registry `:147-151`），矩阵 slot map 状态过期。已对账更新矩阵；harness provenance 哈希断言已存在（orchestrator 单测 :282-283） |
| F-04 编排层缺位 | 2 | **closed (2026-06-12)** | `TopicSelectionV1bRunCoordinatorService`（投影/advance-until-blocked/预算/超时/互斥）+ 2 条 HTTP 路由；全链 e2e 含双人审续跑绿；见 §Phase 2 实施 |
| F-05 N8 debate 仅政策 | 3 | open | |
| F-06 跨 run 决策记忆缺失 | 4 | **closed (2026-06-12)** | `TopicSelectionDecisionMemoryProjectionService`（六类来源投影）+ `TopicSelectionDecisionMemoryPacket@v1` artifact 注入 v1b N6/N8 runtime context + N6 gate `decision_memory_duplicate_candidate` warning；e2e 绿；见 §Phase 4 实施 |
| F-07 provider_overrides 无类型 | 1.3 | **closed (2026-06-11)** | 契约层 `TopicSelectionProviderOverrides` 三 provider union + `provider_id` enum 收紧 + schema anyOf 严格化 + registry 加载期键校验（`PROVIDER_OVERRIDES_INVALID`）；见 §Phase 1 实施 |
| F-08 prompt/schema 无 registry | 1.4 | **closed (2026-06-11)** | `topic-selection-llm-invocation-registry.ts`（30 模板 + 19 schema）+ gateway 运行时强校验（topic-selection 前缀必须注册）+ lint 静态守卫；见 §Phase 1 实施 |
| F-09 cost_usd 恒 null | 1.5 | **closed (2026-06-12)** | 机制（价格表+telemetry 计算+fail-soft）验证通过；2026-06-12 已填入核实牌价（gpt-5.5 $5/$30、qwen3.6-plus $0.325/$1.95、deepseek-v4-pro $1.74/$3.48），来源记于 config $comment |
| F-10 压缩/token 估计未规范化 | 5.2 | open | |
| F-11 harness 单文件复杂度 | 5.1 | open | |

## 决策记录

### Phase 0 决策（2026-06-11 全部对齐，DP-0.1~0.4 用户签核，DP-0.5~0.8 推荐默认无异议）
- **DP-0.1 矩阵 SSOT 居所**：迁移到 `docs/context/process/topic-selection-workflow-matrix.md` 作为永久 SSOT；T-089 与 T-123 各留指针；一致性脚本校验新路径。理由：dev-docs 任务包归档后活文档不应陪葬。
- **DP-0.2 v1c 校验权威源**：在 shared contracts 新增导出常量 `TOPIC_SELECTION_V1C_NODE_IDS`（6 节点 + downstream intake），既有 3 处散落 node_id 字面量改为引用该常量（纯常量收编，零行为变化）。已核实的 v1c 命名漂移（矩阵 `human-promotion-decision` vs 代码 `record-human-promotion-decision`；矩阵 `topic-selection.downstream.feedback-recheck` vs 代码 `topic-selection.v1c.downstream-feedback-recheck`）以**代码为准**改文档。
- **DP-0.3 矩阵扩列**：新增 `human_delegated_allowed`（区分"人审必须" v1a N8/v1c N4 与"人可介入" v1b N2/N5）与 `debate_primitive`（`divergent_loop | bounded_sequence | reserved | none`）两列。
- **DP-0.4 v1b N6 debate 登记**：登记为 `reserved`——`debate_escalation` loopback 目标与 `n6_loopback_triage` 槽已实现但无 scenario 定义，触发即 blocked（对齐 DMP-03）；scenario 定义不进 Phase 3（Phase 3 仅 N8），按需另开任务。
- **DP-0.5 N7 表述**：矩阵照实登记契约能力（human_delegated 允许），在 node-policies 注记 T-115 产品决策"contract-capable but product-mechanical（`chooseN7Candidate`），不开人审面"。
- **DP-0.6 slot map 全收录**：按 DMP-11 收录全部 model-like 参与点——v1b 10 槽（3 required：n4/n6/n8 draft；7 support-only 含 `n7_n8_debate_admission_review`）+ v1c N2 四角色槽 / N4 delegated 槽 / N6 normalization 槽（planned → implemented）。
- **DP-0.7 留痕**：T-123 代为修订，在 T-089 `03-implementation-notes.md` 记录范围与理由；T-089 保留"未来新增 debate 节点分类"职责，所有权不转移。
- **DP-0.8 脚本形态**：`.ai/scripts/topic-selection-workflow-matrix-consistency.mjs`（带 `--self-test` 三类漂移负例）+ 薄 backend test 包装进默认 `pnpm --filter backend test` 套件。校验深度 v1：① v1a/v1b/v1c/resource-sampling node_id 集合相等；② v1b slot_id 集合相等（10 槽）；③ 粗粒度模式一致性（`codex_allowed=yes ⇔ codex_assisted ∈ allowed_execution_modes`）；`debate_allowed`/`human_review_required` 等产品决策列**不**做自动校验（非契约可导出）。

### 整包决策（2026-06-12 用户签核，全部锁定）
- **D1 Run Coordinator 形态**：后端薄服务 + 分阶交付。Phase 2 先交付同步 `advance-until-blocked`（步数上限，HTTP/UI/脚本触发，人在环）；常驻自动推进/队列 daemon 为后续可选扩展。
- **D2 N8 debate 入口语义**：**N6 同形 gate/loopback 触发**（用户追问"能否共用 N6 触发器"后重新框定并锁定）。实现 = ① N8/N9 确定性 gate 新增 borderline/维度冲突 warning/blocker 编码（T1/T3，纯编码无新引擎）；② 升级路径复用既有 loopback 路由（N8→N7 feedback / N9→N8）；③ 准入 = 实装 N7 既有 planned 槽 `n7_n8_debate_admission_review`（warning `n8_debate_level_selected` 已预埋）；④ 运行时复用 v1c N2 有界对抗序列；⑤ T2 重跑漂移降级为 admission review 的参考输入（读 trial ledger，不做独立检测）；⑥ T4 operator 强制 = DMP-11 既有 execution_plan 显式选择。零新触发引擎。
- **D3 与 T-088 关系**：维持 proposed 方案——独立推进，触碰 harness 本体前两包互记联合决策（Phase 0/1 未触碰 harness 本体，无需触发）。
- **D3 触发记录（2026-06-12，Phase 4）**：harness 本体加法式改动（N6 gate dedup warning + N6/N8 runtime 的 memory packet 解析）已在 T-088 `06-joint-decisions.md` 登记为 D-T123-01。
- **Phase 4 设计修正（实施中发现）**：注入方式从"runtime 活查询投影"修正为"**预持久化 artifact + frozen_input.source_refs 引用**"（与 N7 loopback projection 同构）。原因：N6/N8 的 admission `buildAdmissionExpectedIdentity` 会在准入时从 frozen input 全量重算 context packet 与 source_hashes（精确键集全等比对）——活查询的时变记忆会破坏生成↔准入恒等式。修正后三方（生成/准入/gate）从同一冻结引用解析，replay 确定；packet 时效性由 frozen-input 组装方负责（Phase 2 coordinator 是未来的天然组装者）。
- **追加指令（2026-06-12 用户）**：不留双轨/语义漂移技术债务——遗留直调生成路径**全量移除**（升级 Phase 1.1 的 C 方案为 A 方案），三个遗留 service 收缩为读投影 service。

## 实施记录
- 2026-06-11：任务包创建（T-123）。来源：全链产品化审计（节点 debate / 复杂度 / 编排-harness / 压缩-上下文-记忆 / 参数规范化 五维）。

### 2026-06-13 Phase 2 代码审查（/code-review high 第二轮）与修复
7 路并行审查（3 正确性 + 3 清理 + 1 层级）对 Phase 2 全部 diff。正面结论：8 个 recipe 与 harness 精确键集解析器全等、草稿三件套哈希与 admission 三重校验一致、route_decision 全枚举覆盖（跨文件追踪角 50 次工具调用反向核实）。发现并**全部修复**以下问题：
1. **withRunLock 双缺陷（崩溃级）**：`void next.finally(...)` 派生链在 advance 抛错时无 handler → Node 默认策略 unhandledRejection 崩进程；`next.catch()` 每次新建 promise 身份比较恒 false → 锁表永不收缩。修复：单 `guarded` 变量（永不 reject）入表+比较。单测："a thrown advance neither crashes…nor leaks the run lock"。
2. **超时孤儿双发**：node_timeout 后锁释放但 harness 调用仍在飞，attempt_count 未变 → 重推会以**同 attempt_id** 并发重 invoke（harness 无唯一性守卫）。修复：`inFlight` 注册表 + 新停驻原因 `node_in_flight`（孤儿落地自清除）。单测覆盖（恰一次执行断言）。
3. **loopback 死端（设计缺口，部分缓解 + 记录）**：harness 规定的回路目标是上游（N8→N7 feedback 模式、N7→N6），coordinator 只能 retry 源节点；N7 的 `N8ToN7Feedback@v1` 入参契约 coordinator 不可组装。本轮：loopback 停驻消息如实标注回路目标与边界（"upstream re-entry 走 harness 路由"）；完整组装留作 **Phase 3 前置项**（feedback 模式 recipe）。
4. **/advance、/state 无 schema**：补 body schema（budgets 数值域、created_by/run_mode 枚举、bootstrap_request 复用直调路由同一契约 schema、node_inputs 形状）+ params schema；/state 对无 trace 的 run 返回 404（对齐本文件 GET-by-id 惯例）。e2e 断言 max_steps:0→400、未知 run→404。
5. **人审路由 run-id 绑定无校验 + 不经互斥**：controller 增加 `assertHumanRunBinding`（run 存在性 + 等待节点检查 + **路由目标必须源自该 run 上游 authority**——N5 的 optionSetId 必须等于该 run N4 authority ref，N2 的 intakeSnapshotId 必须等于 N1 authority ref）；命中 run id 的人审写入走 coordinator `runExclusive`（同一把 per-run 锁）。`node_attempt_id` 从 HTTP 面移除（coordinator 从不发它，纯 footgun；service 层仍支持测试直传）。e2e 断言错误绑定→409。
6. **retype-unshift 门禁失效**：兜底从"全节点无条件"收紧为 recipe 表显式 `retype_authority_as_snapshot` 仅 N6 开启（N5 authority 即 selection decision 快照的已记录形态）；其余节点缺匹配引用将如实 blocked。e2e 全链通过证明无其他节点依赖兜底。
7. **fixture_replay 语义（决策记录）**：维持 caller 草稿 = `fixture_replay` 类（现有 enum 无 human-curated 类），但 ① `run_mode` 可由 caller 透传（默认 acceptance；传 product 时 harness 将如实拒绝 fixture_replay——诚实失败而非静默混类）；② 仅在携带草稿/execution_spec 时下发 run_mode（裸确定性节点会触发 harness `RUNTIME_FIELDS_REQUIRE_SEMANTIC_ARTIFACT` 守卫——实测发现）；③ **新增 provenance 类（如 human_curated_draft）为 shared contracts 级改动，列入 Phase 3/5 候选**，在此之前产品路径草稿审计按 fixture_replay+acceptance 识别。
8. **投影三处脆弱**：created_at 毫秒平手 → 以 artifact 列表序 `seq` 决胜（latest/pendingHalt 全切换）；新增 `latest_admitted`（最近 admitted invoke_next/stop 尝试）——完成扫描与 lineage 组装全部改读它，后续 blocked 重试不再抹除已完成 lineage（修复 prev 选择回退错节点 → 500 级联）；run_complete 检查移到 max_steps 之前（恰好最后一步完成不再误报）。单测：同毫秒平手、blocked 重试不抹 lineage。
9. **draft+execution_spec 组合**：显式 400 拒绝（草稿固定 codex_assisted 与 provider spec 必然 admission 失配）；草稿**单工件**双引用（support/normalized 本就同 payload 同 checksum）+ provenance 并行写。
10. **SSOT 收编**：trace schema 字面量 → 契约常量+类型；`MODEL_DRAFT_SLOT_TABLE` 删除 → 槽位元数据从 `POLICY_BY_NODE_ID.semantic_support_slots`（model_draft_for_gate）解析；recipe 表删 input_contract/snapshot_kind 列 → 从 policy `input_contract`/`required_frozen_snapshot_kind` 取；handoff kind 校验 → 上游 policy `output_handoff_kind`（消灭 `.replace('@v1','')` 字符串手术）；模块加载期**节点覆盖断言**（每个 policy 节点必属 bootstrap/human/recipe 三类之一，N7 auto-driven 例外注记 DP-0.5）；halt 复用在手投影（减一次全量扫描）；execution_spec 用契约类型（去 cast）；语义工件返回值去 `as`（暴露并修复 checksum 可空洞）。
**留 5.3 backlog**：advance 循环增量投影（O(S×K)→O(K)）、loadTraces kind 过滤仓储查询、uniqueRefs/占位哈希/POLICY_VERSION 共享常量收编（跨 6/3/4 文件）。

### 2026-06-12 Phase 2 实施（M2 Run Coordinator + 鲁棒性）
**2.0 并发核实与裁决**：harness 零防护实锤（无锁/无唯一约束/authority 无 upsert，双发=双 authority）。裁决方案 B：coordinator 进程内 per-run promise-chain 互斥；残余风险（直打 harness 路由）与方案 A 候选记入 02-architecture。
**2.1 RunStateProjection**：复用既有 `listArtifactRefsByWorkflowRunId`（零新仓储方法），从 trace artifacts 重建——per-node attempt_count/loopback_count/latest（gate/route/authority+handoff ref&hash/trace_snapshot_ref/blockers/replayed）+ frontier/next/run_complete。持久化 checkpoint **未做**（投影即时计算自权威 trace，确定可重建；偏差记录）。
**2.2 advance-until-blocked**（`topic-selection-v1b-run-coordinator-service.ts` + GET `/workflow-runs/:id/state` + POST `/workflow-runs/:id/advance`）：
- 只经 `harness.invokeNode`；bootstrap_request 启动；后继节点 frozen_input 由 **recipe 表**从上游 handoff artifact 通用组装（移植验收套件配方），实施中按 gate 反馈补齐四类扩展：跨级 lineage 哈希（N4 需 n2_handoff_hash）、上游 authority 进 payload（N4 需 N1 的 intake_snapshot_ref/hash，hasOnlyKeys 精确键集）、snapshot_kind 引用 retype 保证（N5 authority ref_type ≠ N6 snapshot_kind）、runtime projection 引用扫描（N8 需 N7→N8 projection artifact）。
- 停驻分类：human_node（N2/N5 一律停，人经既有人审路由以**同 run id** 续接——路由/控制器补了 workflow_run_id/node_attempt_id 透传，service 本就支持）、model_input_required（N4/N6/N8 无 caller 输入即停，D1 人在环）、harness_blocked/wait/requires_human_review/retryable/loopback（透出 latest blockers）、run_complete。
- model 节点输入：`node_inputs[node].draft_payload`（coordinator 服务端复刻语义工件三件套记录，fixture_replay 类）或 `execution_spec`（provider 路径直通）。
- `retry_node_id`：loopback/blocked 后显式重试入口（预算检查先行）。
**2.3 预算/超时**：per-node loopback 预算（超额 → `loopback_budget_exhausted` 停驻，不触碰 harness）；节点级 Promise.race 超时（提示 replay 幂等可重推进收敛）；run 级推进超时；max_steps。
**2.4 HTTP 入口**：两条路由（controller 第 8 依赖位注入）；桌面按钮未做（可选项，留待 UI 批次）。
**AC 映射**：并发双发→互斥单测（同 run 双 advance 串行、N1 仅执行一次）；崩溃恢复→多次 advance 续跑 + run_complete 幂等重推进（e2e §8）+ harness replay 既有语义；loopback 超额→单测（预算 2、第 3 次重试停驻、harness 仅 2 次调用）；超时→单测；全链 auto-advance e2e（mocked acceptance：N1→N2 人审→N3→N4 草稿→N5 人审→N6 草稿→N7→N8 草稿→N9..N11 → run_complete）✅。
**测试**：coordinator 单测 7/7；集成新 e2e 1 条（文件 9 pass / 1 fail=既有 T-054 环境项）；v1b harness e2e ✅；runtime-stress ✅；backend 套件后台中。

### 2026-06-12 代码审查（/code-review high）与处置
- 7 路审查（3 正确性 + 3 清理 + 1 抽象层级）对 T-123 全部 diff：**正确性零硬伤**（删除行为审计零缺口、契约收紧全构造点合法、跨文件追踪全通过）。10 项清理/层级 findings，处置：
  - **已修（分钟级）**：① resolver 增加 opt-in `maxAgeMs` 时效守卫（读 artifact created_at；确定性路径不传——注释明示，避免破坏准入恒等式）+ `artifact_created_at` 暴露 + 单测；② packet 契约 `entry_counts_by_source` 补"截断前全量计数"语义注释；③ N6/N8 `sourceHashes` 的 memory hash 参数去掉死默认值改必传。
  - **登记 Phase 5.3（#3~#7）**：gateway 校验钩子化、三份 artifact 解析器收编、N6 单次解析、validateRegistry 缓存、投影 S5 并行化。
  - **约定入 05-pitfalls（#8/#10）**：lint 单引号约定、双 normalizer 作用域。

### 2026-06-12 Phase 4 实施（M4 Decision Memory 投影）
**审计修正（实施前探查）**：体系比预期更"连接现成件"——`DecisionMemoryEntry`/`CandidateDecisionMemory` 记录早已存在（v1a recheck-risk-memory 遗产），v1a N6 admission 已有跨 run 候选池 dedup，v1b N8 的 `negative_memory_check` 是 LLM 输出维度但**没有记忆输入**（本 Phase 填的洞），v1b N6 gate 的 duplicate 契约码已声明未实现跨历史比对。
**4.1 投影**
- 契约：`topic-selection-decision-memory-packet-contracts.ts`（packet + entry，7 种 source_type；`non_authority:true` + `evidence_policy:'not_evidence'`）。
- 仓储新增 list-by-title-card ×4（recheck-risk-memory 的 memory entries/candidate memories、need-validation 的 adjudication results、value-assessment 的 disposition decisions；接口+in-memory+prisma 三层，prisma 零迁移——表已存在）。
- `TopicSelectionDecisionMemoryProjectionService.buildPacket`：六类来源（S1 否决/park/merge 候选+裁决理由、S2 非 advance 处置、S3 AcceptedRisk、S4 memory entries+候选链接、S5 历史问句候选）；newest-first、max_entries 截断、`normalized_text_key` 精确 dedup 键（v1 不做语义判重）。`recordPacketArtifact` 持久化为 control-plane diagnostic artifact（checksum=canonical hash）。
**4.2 注入（设计修正后）**
- **修正**：从"runtime 活查询"改为"**预持久化 artifact + frozen_input.source_refs 引用**"（N7 loopback projection 同构）——原因：N6/N8 admission 的 `buildAdmissionExpectedIdentity` 在准入时从 frozen input 全量重算（source_hashes 精确键集全等），时变记忆会破坏生成↔准入恒等式。共享解析器 `resolveDecisionMemoryPacketFromSourceRefs`（artifact_ref 扫描/checksum 校验/至多一个/title-card 匹配），三方（生成、准入、gate）同源。
- N6/N8 runtime service：context packet 类型新增 `decision_memory(_packet_ref/_hash)` 三字段；生成与准入两路径穿线；`source_hashes.decision_memory_packet_hash`（仅 ref 存在时，两侧一致）；system prompt 条件提示（N6 防重述、N8 锚定 negative_memory_check 维度）。memory 不进 N8 required_preserved_facts（advisory 可被压缩丢弃，设计取舍）。
**4.3 gate 告警**
- 契约 N6 `warning_codes` += `decision_memory_duplicate_candidate`；harness runN6 解析 packet → `validateAndBuildN6Candidates` 调纯函数 `computeDecisionMemoryDedupWarnings`（normalize 后精确匹配 main_question）。**只发 warning 不 block**（非权威边界 by construction）。harness 改动为 D-T123-01 登记的加法式范围。
**测试**
- 投影/解析器/dedup 纯函数单测 8/8；**e2e 绿**：N1→N5 真链 + 预置 parked 问句 memory artifact 进 N6 frozen_input → handoff envelope `warning_codes` 含 `decision_memory_duplicate_candidate`；N6/N8 runtime smoke 绿（memory 缺省路径零行为变化）。
**偏差与遗留**
- v1a N6 生成上下文注入**显式缓**：v1a admission 已有候选池 dedup（candidate_pool_entries 跨 run 比对），边际价值低且 v1a 上下文编译缝隙深；后续按需补。
- 压缩专项测试未新增：memory 走 T-112 既有 token 预算/压缩机制（在 context packet 内计入预算），advisory 不入 required facts；以设计注记代替专项用例。

### 2026-06-12 Phase 1 补充：遗留双轨全量移除 + 牌价填入（用户指令）
**双轨清除（C 方案升级为 A 方案）**
- 三个遗留 service 重写为纯读投影（行数 1753→63 / 2242→49 / 1832→37）：仅保留 controller 消费的 5 个 list* + T-115/human-selection 消费的 `findOptionSetById`；全部生成/选择/输入提供方法（plan/form/assess/select×2/decideValueDisposition/build*Input×3）连同 prompt 构建、LLM 调用、控制面记录、私有 helpers 一并删除。
- **连带发现并清除的死代码**：`TopicSelectionV1bIntakeService` 整体（仅 app.ts 构造，方法 `createOrUpdateResearchConstraintProfile`/`buildResearchSlicePlanningInput` 全是遗留生成配套；产品 N2 走 harness/human service）——service + 单测删除。
- app.ts：trio 构造简化为 `{repository}`；`topicSelectionV1bLlmGateway` 选项+常量删除（消费方仅 trio）。
- 集成测试清理：`FakeTopicSelectionV1bLlmGateway` 注入 ×8、Fake 类、3 个 output 工厂、6 个孤儿 helper、4 个孤儿类型导入。`.ai/scripts/topic-selection-real-e2e.mjs` 同步去掉失效注入（其 v1b 流量走 harness HTTP 路由，不受影响）。
- 三个遗留 service 单测文件删除（测的是被移除的能力）；Phase 1 的 N8 registry 解析补充测试随之移除——**AC 证据不受影响**：orchestrator 单测 :282-283（provenance 哈希）+ resource-sampling/promotion-gate 活路径回归仍覆盖 registry 解析。
- invocation registry 修剪：移除 3 个死模板 id + 3 个死 schema 名（30→27 / 19→16，零非测试引用核实后）。
- shared 的 LLM 输出 schema 契约保留（v1b-workflow-harness-contracts 仍引用）。
**牌价填入（来源核实 2026-06-12）**
- gpt-5.5 $5/$30、qwen3.6-plus $0.325/$1.95、deepseek-v4-pro 标准价 $1.74/$3.48（促销 $0.435/$0.87 已于 2026-05-31 到期，按标准价记；若促销延期可下调）。来源记录在 config 文件 $comment。

### 2026-06-11 Phase 1 实施（M1 参数规范化收口）
**1.1 去硬编码（范围比计划大：5 个 service，不止 N8）**
- 审计修正：harness 产品路径（N4/N6/N8 runner → runtime service → orchestrator → registry）**本来就是 registry 驱动**，三个 single-agent profiles 已注册。硬编码住在**遗留直调路径**（DMP-10 双轨）：`topic-selection-v1b-value-assessment/research-slice/topic-question-service.ts`（LLM 生成方法仅单测可达；controller 只用其 list* 读投影）+ 两个真硬编码残留 `topic-selection-resource-sampling-service.ts`（活路径）与 `topic-selection-v1c-promotion-gate-service.ts`。
- 处置（C 方案）：五个 service 的 `DEFAULT_MODEL`/静态 params 全部删除，改为 `TopicSelectionModelProfileRegistryService.resolveProfile` 解析（provider_llm/product，显式 `model_option_id` 覆盖位保留）；三个遗留生成方法加 `@deprecated`（指向 harness 路径，禁新调用方）。**全量移除遗留生成路径未做**（~5.8k 行结构改动，超 Phase 1 预算）——留待后续决策（可并 Phase 5 或独立任务）。
- 输入契约变化：`model?: LlmModelRef` → `model_option_id?: string | null`（三个遗留 service；调用方仅单测，零破坏）。
**1.2 N4/N6/N8 registry 对账**
- profiles 已注册（F-03 审计过期）；矩阵 slot map 状态 cell 更新为 registry-aligned；provenance `profile_hash`/`normalized_params_hash` 断言已存在于 orchestrator 单测。
**1.3 typed provider_overrides**
- shared 契约：`TOPIC_SELECTION_REGISTERED_PROVIDER_IDS` + `provider_id` 收紧为 union + `TopicSelectionProviderOverrides`（OpenAI `reasoning.effort` / DashScope `enable_thinking` / DeepSeek `thinking.type`+`reasoning_effort`，值集与 gateway 适配层一致）+ schema `anyOf` 严格化（additionalProperties:false）。
- registry：`PROVIDER_OVERRIDE_ALLOWED_KEYS` per-provider 键校验，新 issue code `PROVIDER_OVERRIDES_INVALID`；schema 层先拦未知 provider（`SCHEMA_VALIDATION_FAILED`），语义层守 registeredProviderIds 子集场景（测试两层分别覆盖）。
- gateway：`providerOverrides` 接受 typed union。
**1.4 prompt/schema invocation registry**
- `topic-selection-llm-invocation-registry.ts`：30 模板 id（services 静态扫描 25 + shared debate 角色 4 + resource-sampling 1）+ 19 schema 名，SSOT 注释明确两层执法。
- 运行时：`BackendLlmGateway.createStructuredOutput` 入口强校验 topic-selection 前缀模板必须注册（AppError fail-fast，未注册不发任何 provider 请求）；版本仅做非空校验（v1 决策：模板内容未中心化前不锁版本，调用方版本覆盖是设计内行为）。
- 静态：`topic-selection-llm-invocation-lint.unit.test.ts` 四项守卫——模板字面量 ⊆ registry（services+shared）、schema 字面量 ⊆ registry、**无 provider/model 对象字面量**（白名单仅 model-profile-registry；模式用 `'[,}]` 收尾避免误伤类型注解）、无 provider SDK 直引（llm-gateway 外）。
**1.5 cost_usd**
- `config/llm-pricing.json`（USD/MTok，null 占位 + 填写说明）+ `llm-pricing-table.ts`（fail-soft 加载、warn-once、纯函数 `computeLlmCostUsd`）+ gateway 构造器注入位 + `buildTelemetry` 计算。**真实牌价需人工核实填入**（gpt-5.5/qwen3.6-plus/deepseek-v4-pro），填入即点亮。
**杂项**
- registry unknown-provider 单测随 schema enum 收紧调整为两层断言。
- 矩阵 Change Log 增补 Phase 1 行；slot map 三处状态 cell 更新。

### 2026-06-11 Phase 0 实施（M0 SSOT 对齐 + 防漂移校验）
**0.2 v1c 节点常量收编（唯一代码改动）**
- 新增 `packages/shared/src/research-lifecycle/topic-selection-v1c-node-ids.ts`：`TOPIC_SELECTION_V1C_NODE_ID`（6 节点 keyed record）+ `TOPIC_SELECTION_V1C_NODE_IDS`（数组）+ `TOPIC_SELECTION_DOWNSTREAM_NODE_ID/IDS`（paper-project-intake）。登记 shared `package.json` exports + `research-lifecycle/index.ts` re-export。
- 收编 8 个 backend 文件共 9 处值位字面量改为常量引用（3 个 runtime service 的 `const NODE_ID` + provider-canary ×3 + promotion-gate ×1 + 3 个 admission service 各 1）。admission 接口的字面量**类型位**保持不变——赋值点经常量引用后已被 typecheck 钉死，无需改公共类型形状。
- 实际字面量分布比 00-overview 预估（"3 处"）多：值位共 9 处，已全部收编。
**0.1 + 0.3 矩阵迁移重写**
- 新 SSOT：`docs/context/process/topic-selection-workflow-matrix.md`。内容字段级对齐契约：v1b 11 行（execution_kind/allowed modes/blockers/gates/handoffs 来自 contracts `:538-1024` 精读）；v1a 9 行轻校（N5 default 修正为 `none`——旧矩阵行与 DMP-12 冲突，以 DMP-12 locked 政策为准）；v1c 6 行（命名以代码为准）；downstream 1 行；resource-sampling 1 行。
- 新列落地：`human_delegated_allowed`（v1b N2/N5/N7、v1a N8、v1c N4 = yes）+ `debate_primitive`（v1a N6 divergent_loop implemented；v1c N2 bounded_sequence implemented；v1b N8 bounded_sequence planned；v1b N6 reserved；resource-sampling reserved）。
- Slot map 全收录：v1a 9 行（含 4 debate 槽）+ v1b 10 槽（slot_id/effect/modes/fallback/output contract 来自 contracts `:356-497`）+ v1c 6 槽（N2 四角色 `n2_bounded_micro_debate.*` + `n4_delegated_promotion_decision_candidate` + `downstream_feedback_normalization`，ID 来自 admission services 核实）。
- 旧址 `dev-docs/active/topic-selection-agent-workflow-review/06-workflow-matrix.md` 改为指针存根；T-089 `03-implementation-notes.md` 留痕。
- Node Policy Notes 更新：v1b N4 rejected+多实例采样、N6 reserved、N8 conditional→planned、N7 product-mechanical、v1c N2 implemented 注记（runtime 不经 debate-scenario registry 的说明）。
**0.4 一致性校验脚本**
- `.ai/scripts/topic-selection-workflow-matrix-consistency.mjs`（纯 JS，正则提取代码权威源，无 ts-node 依赖）：五段 node_id 集合 + v1b slot_id 集合 + v1b codex_allowed⇔allowed_execution_modes（节点级∪槽位级）。
- `--self-test` = 真实文件 + 漂移注入（改名/删行/伪造行/删槽/codex 翻转/v1c 改名）7 项断言。
- backend 包装测试 `apps/backend/src/services/topic-selection-workflow-matrix-consistency.unit.test.ts`（spawn 脚本，进默认套件）；root npm script `topic-selection:workflow-matrix-consistency`。
**发现/修正**
- v1a N5 `evidence_extraction` 默认模式：旧矩阵行写 codex_assisted，DMP-12 锁定为 `none`（caller-supplied draft）——已按 DMP-12 修正并在矩阵行注明。
- v1c N2 的 `topic-selection.debate.v1c-promotion-support-risk.v1` 仅是政策引用名；实现走独立 bounded micro-debate 机制（不经 debate-scenario registry）——矩阵已注记，避免后续误判"scenario 已注册"。
