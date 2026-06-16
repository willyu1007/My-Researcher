# 03 Implementation Notes

> 每个 Phase 收口后追加：改了什么、为什么、关键决策、未尽事项（actionable TODO）。F-01..F-11 逐项关闭时在此记录证据指针。

## Findings 关闭追踪
| Finding | Phase | 状态 | 证据 |
|---|---|---|---|
| F-01 SSOT 漂移 | 0 | **closed (2026-06-11)** | 新 SSOT `docs/context/process/topic-selection-workflow-matrix.md` + 一致性脚本进默认套件；验证见 `04-verification.md` Phase 0 |
| F-02 N8 参数硬编码 | 1.1 | **closed (2026-06-12)** | 实为 DMP-10 双轨。2026-06-11 先 registry 化清零 DEFAULT_MODEL；2026-06-12 按用户指令**全量移除遗留生成路径**（trio 重写为读投影 + IntakeService 整体删除），双轨不复存在；见 §2026-06-12 补充 |
| F-03 N4/N6 profile 未注册 | 1.2 | **closed (2026-06-11)** | 审计结论修正：三个 single-agent profiles 实际已注册（registry `:147-151`），矩阵 slot map 状态过期。已对账更新矩阵；harness provenance 哈希断言已存在（orchestrator 单测 :282-283） |
| F-04 编排层缺位 | 2 | **closed (2026-06-12)** | `TopicSelectionV1bRunCoordinatorService`（投影/advance-until-blocked/预算/超时/互斥）+ 2 条 HTTP 路由；全链 e2e 含双人审续跑绿；见 §Phase 2 实施 |
| F-05 N8 debate 仅政策 | 3 | **closed (2026-06-14)** | 信号触发有界对抗 debate 全链交付：共享骨架 core + v1b N8 debate 运行时/admission（byte-match 准入 + 13 例 drift 负测）+ gate bridge（synthesizer draft 经单 agent 路径重记，零 gate 改动）+ harness T1/T3 gate/loopback + coordinator feedback recipe + N7 debate-admission 支撑输入；harness 级与 coordinator 驱动两条全闭环 e2e 均绿。延期项（非阻断，记 spec 07）：STEP-7 压缩 facts→Phase 5.2、DP-3.3 阈值标定（2026-06-15 标定执行：真实分布不可用→维持 provisional，tripwire 续守 product；见实施记录 §2026-06-15 DP-3.3）、DP-3.5 provider-diverse 角色 profile（加法）。详见 `07-phase3-debate-skeleton-spec.md` |
| F-06 跨 run 决策记忆缺失 | 4 | **closed (2026-06-12)** | `TopicSelectionDecisionMemoryProjectionService`（六类来源投影）+ `TopicSelectionDecisionMemoryPacket@v1` artifact 注入 v1b N6/N8 runtime context + N6 gate `decision_memory_duplicate_candidate` warning；e2e 绿；见 §Phase 4 实施 |
| F-07 provider_overrides 无类型 | 1.3 | **closed (2026-06-11)** | 契约层 `TopicSelectionProviderOverrides` 三 provider union + `provider_id` enum 收紧 + schema anyOf 严格化 + registry 加载期键校验（`PROVIDER_OVERRIDES_INVALID`）；见 §Phase 1 实施 |
| F-08 prompt/schema 无 registry | 1.4 | **closed (2026-06-11)** | `topic-selection-llm-invocation-registry.ts`（30 模板 + 19 schema）+ gateway 运行时强校验（topic-selection 前缀必须注册）+ lint 静态守卫；见 §Phase 1 实施 |
| F-09 cost_usd 恒 null | 1.5 | **closed (2026-06-12)** | 机制（价格表+telemetry 计算+fail-soft）验证通过；2026-06-12 已填入核实牌价（gpt-5.5 $5/$30、qwen3.6-plus $0.325/$1.95、deepseek-v4-pro $1.74/$3.48），来源记于 config $comment |
| F-10 压缩/token 估计未规范化 | 5.2 | **closed (2026-06-15)** | 两部分均落地：①压缩策略去硬编码（executor kind 从 profile `allowed_executor_kinds` 主项 SSOT 解析，byte-identical，见 §2026-06-15 partial）。②**per-provider token 估计**：estimator 加 `provider_id`-keyed 校准表 + budget gate 透传 `provider_id`；default/unknown **维持统一保守值（byte-identical）**。校准值来自**真实分词器实测**（o200k_base / Qwen-BBPE / DeepSeek-V3 对代表性选题 payload）：CJK tok/char 实测均值 openai 0.84 / dashscope 0.73 / deepseek 0.67，取保守值 **0.90/0.95/0.85**——取值由**整输入最差边际**封顶而非裸 CJK 比：dashscope 裸 CJK 最省却 Latin/结构最不省、整输入边际最薄，故**最少收紧**（0.95），非按 0.73 激进；newline 项 provider 收紧到 ÷1（真实 ~1 tok/换行）以防 CJK 收紧后 newline-dense CJK 低估；Latin 维持 default（实测变异大，收紧不安全）。一轮对抗性多角度审查（4 lens + skeptic 复核）：1 真回归（newline-dense CJK 低估）已修，2 误报（paper-impl identity hash、compression-runtime 不一致）经核证安全，余为既有/范围外限制（已记）。**1200 输入（33% newline-heavy + 25% CJK-heavy）×1.25 验证 0 例低估、最差 est/actual ≈1.04（≥4%；exact 随 doc 派生语料漂移，"0 低估"为不变量，复跑 measure.py 验证）**。证据+复现脚本见 §2026-06-15 F-10 per-provider token 校准 + `evidence/f10-token-calibration/measure.py`。验证：tsc 0、backend 套件 1314/0/35skip、debate byte-identity 保持。STEP-7 debate 压缩 facts 仍为独立 consumer-dependent 延期（属 spec 07 / F-05，**非 F-10 阻断**）。 |
| F-11 harness 单文件复杂度 | 5.1 | **migrated → T-127 W-12 (2026-06-16)** | 基础就绪：**D-T123-03** 联合决策登记（T-088 `06-joint-decisions.md`，用户签核拆分范式）+ **replay-identity 守卫**（钉死确定性 N1 的 6 个 byte-bearing 哈希；N2/N3 因 semantic-support 生成含非 idFactory 随机不可钉）。**slice 1 已交付**：dedup 工具（uniqueRefs/uniqueStrings/uniqueIssues，63 调用点）逐字搬迁至 `topic-selection-v1b-harness-dedup-utils.ts`，守卫金值不变（byte-identical 实证）、套件 1313/0。剩余簇（parse-and-resolve / hash-authority / ref-builder）按同一守卫保护逐 slice 推进，多 session。**2026-06-16 收尾：余项所有权移交 T-127 W-12（一次拆透 b1，承 D-T123-03）；slice 1 成果保留。** |

## 2026-06-16 收尾移交（T-123 关闭归档）
- 触发：2026-06-16 对"选题管理后端实际状态 + 后续规划"复盘后，用户决定新建伞型包 **T-127**（`topic-selection-backend-hardening-and-expansion`）统一推进后续工作，并按 D7 把 T-123 的开口线移交、关闭本包，避免双轨/语义漂移。
- 终态：Phase 0–4 + 5.2/5.3 全 DONE（F-01..F-10 closed）；F-11、DP-3.3 两条开口线**所有权移交 T-127**：
  - **F-11 harness 单文件拆分 → T-127 W-12**（一次拆透 b1，承 D-T123-03；slice 1 dedup-utils 成果保留为起点）。
  - **DP-3.3 N8 阈值标定 → T-127 W-13**（record-and-defer：真实语料暂不可得，mock 不可标定真阈值；N8 维持 provisional + tripwire；scaffold 经 T-127 W-01 落地）。
  - 未落地工作树残留（F-10 estimator/budget-gate 改动 + 6 个 DP-3.3 scaffold 文件 + evidence/）→ **T-127 W-01** 落地提交。
- 一致性同步：T-088 `06-joint-decisions.md` D-T123-03 加续推指针（→ T-127 W-12）；矩阵 `docs/context/process/topic-selection-workflow-matrix.md` §147「需另立任务」指向 T-127 W-07（N6 debate 实装）；registry / task-index / feature-map / dashboard 状态转 done。
- 本包自此为只读归档记录，不再持有进行中工作。

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

### Phase 3 决策（2026-06-13 全部对齐，DP-3.1~3.6 用户签核锁定）
**勘察修正的起点**（三路审计，详见本节末"现状基线"）：触发/准入/回路的契约层 ~80% 已预埋（N8 loopback 边+码+`N8ToN7Feedback@v1`、N7 `feedback_from_n8` 解析器、`n7_n8_debate_admission_review` 槽全规格+已注册 profile+N7 runner 已织 ref 进 handoff、`trial_ledger_ref/hash` 已在 N7→N8 投影、矩阵 N8 行已是 `bounded_sequence`）；真正要建：N8 debate 运行时、N8 gate T1/T3 + runner 回路选择（harness 本体）、N7 warning 发射、coordinator feedback recipe、DMP-13/矩阵/profiles。
- **DP-3.1 共享执行器形态**：**骨架共享 + 版本注入**。抽取角色循环骨架（角色序走表、prior-artifact 线程、token 预算/压缩脚手架、debate provenance hash 组装）为共享核心；context packet 构建、输出契约、preserved facts 由 v1c/v1b 各自注入（strategy 接口）。v1c N2 改薄适配（行为不变，`v1c-n2-runtime-smoke` 钉死，基线已核实绿）；v1b N8 实现自己的 builder。否决项：完全通用抽取（v1c 回归风险过大）、独立双实现（违背"不留技术债务"指令）。
- **DP-3.2 触发形态**：**首评回路、复评告警**。首评（frozen payload 无 `n8_debate_admission_ref`）命中 T1/T3 → loopback blocker（`n8_feedback_to_n7`，自动升级）；debate 复评（feedback 重入的 handoff 已携带 admission ref——零新字段的确定性判据）仍命中 → warning 准入，不再回路。coordinator loopback 预算为二重保险。
- **DP-3.3 阈值标定**：**临时值落 node policy + 挖历史**。provisional 初值（T1: total_score∈[60,72) 或 confidence<0.55；T3: 维度分差≥40 或 单维<35 且 total≥60）显式标注 provisional 落 N8 node policy；解析既有 near-prod deep-test 工件提取 N8 分数分布复核；历史不可用则记偏差、标定跑列独立小任务（不阻断收口）。**标定执行（2026-06-15）**：挖掘判定**真实分布不可用**——既有 N8 工件全是单一 fixture（total 83/conf 0.82/spread 12）或循环/价值中性探针，非真实评估分布；按本条"历史不可用则记偏差"维持 provisional、不猜值、保留 tripwire，列出 provider_llm 标定语料采集需求。详见本文件实施记录 §2026-06-15 DP-3.3。
- **DP-3.4 范围**：**N8-only**。N9 维持现状（其 loopback 目标码 declared-unused，矩阵注记）；N9 是 N8 输出的确定性分发器，重判 borderline 属重复检测。D2 原文"N8/N9"按审计收窄，记录在案。
- **DP-3.5 角色 profile 模式**（用户追问"codex 1 profile / provider 独立 profile 是否都要支持"后精化锁定）：**4 角色槽位 + 1 共享多-option model profile + 4 context-policy profiles**；多样性与注册面解耦——`provider_diverse_deep_debate` 级 = DMP-12 named-profile 把 per-role `model_option_id` 映射进 execution_plan slot 覆盖（如 critic→deepseek option），非独立 profile×4。codex_assisted / provider-compact / provider-diverse 三情景全覆盖；未来升格某角色为独立 profile 是纯加法。
- **DP-3.6 coordinator 回路闭环**：**本阶段做，含 coordinator e2e**。HANDOFF_BUILDER_TABLE 增 N7 feedback 变体（读 N8 blocked trace + `N8ToN7Feedback` 工件组装 `feedback_from_n8` frozen input）；`retry_node_id=N7` 走升级回路；e2e 覆盖全闭环（N8 首评 T1 回路 → N7 feedback 重入+admission → N8 debate 复评 → admit）。同时关闭上轮审查的 loopback 死端（03 §2026-06-13 #3）。
- **D3 程序**：✅ 已登记（2026-06-13）——T-088 `06-joint-decisions.md` D-T123-02（N8 gate T1/T3 + runner 回路实装 + N7 warning 发射 + N8 debate 路径消费，全加法；不改 invokeNode 生命周期/replay key/N9）。
- **现状基线**：`v1c-n2-runtime-smoke` ✅（2026-06-13 实测，.ai/.tmp 旧失败 manifest 为陈旧产物）；`v1b-n8-runtime-smoke` 为单 agent 基线门；v1c N2 实际角色序 `supporter_draft → critic_review → supporter_repair → synthesizer_final`（计划文档 assessor_* 命名系 v1b 侧新命名，二者并存各自注册）。

### 2026-06-13 Phase 3 代码审查（/code-review high，7 路）与修复
7 路并行审查（3 正确性 + 3 清理 + 1 层级）对 Phase 3 全部 diff。**byte-identity 审计零漂移**（与差分探针互证）；v1c facade 公共签名/编排 envelope/坐标 coordinator 分类全过。发现 10 项，用户裁定**全部就地修复，保持单 slice**：
1. **`n8_bounded_debate` model profile 未注册**（4 角色槽引用却无注册 → 任何提交触发 `RUNTIME_PROFILE_REGISTRY_REJECTED`）：在 registry 注册（仿 v1c bounded-micro-debate，输出 `TopicSelectionV1bN8BoundedDebateRoleOutput@v1`，provider options + low/high/large 归一参数）+ 导出常量。
2. **N8 反馈重入语义澄清**：harness 只做触发检测 + N6 同形 loopback 门；4 角色 debate 执行是**调用方侧**（v1b N8 debate 运行时，与 v1c N2 同构）——代码注释明示，避免"debate 已跑"误读。
3. **反环加固**：loopback 仅由**显式** `input_mode === 'initial_from_n6'` 武装；缺失/未知模式 → 降级 warning，绝不 re-arm 无界 N8↔N7 振荡（原 `!== 'feedback_from_n8'` 的默认会在缺字段时 re-arm）。
4. **T3 floor 对称**：spread 分支也受 `t3_total_score_min` 约束（原仅 weak-dim 分支受约束）；低总分高分差不再误触发；+3 单测边界用例。
5. **feedback `n8_gate_result_hash`**：digest 计入 `loopback_target_code: n8_feedback_to_n7`（与该尝试记录的路由决策一致）；注释澄清它是触发决策 digest（因循环依赖无法等于尝试最终 gate_result_hash）。
6. **producer/validator 同构守卫**：`persistN8DebateLoopback` 写入前 `isN8ToN7FeedbackPayload(feedbackPayload)` 断言（N7 重入用同一谓词），17 键形 producer/predicate/schema 漂移在源头响亮失败。
7. **canonicalHash 收编**：core + v1c strategy 内联 `hash` 改用 D1 共识的 `canonicalHash`（核实 byte-equal → 安全）；消除潜在跨服务漂移。
8. **provisional 阈值 tripwire**：`provisional && run_mode==='product'` → 发 `n8_debate_thresholds_provisional` warning（DP-3.3 未标定守卫）；契约 warning_codes 增该码。
9. **binding/profile per-turn 一次解析**：v1c strategy 按 slotId memo（原 3-6×/角色，放大未缓存 resolveProfile）；只读、byte-identical。
10. **runLoop 加固 + 删死代码**：空 roleOrder / 重复 slot 抛错；删除 zero-reader 的 `step` 字段 + 编排 `topicSelectionBoundedDebateStepContext` 调用 + 整个 orphan shared `bounded-debate-loop-contracts.ts`（含 exports map 条目）。另：n8Warnings 三元映射改穷举 map（未知触发码抛错而非静默误标）；删 `n8DebateTriggerIssues` 转发壳。
**验证**：shared+backend tsc 0；n8 触发单测 8/8；v1c 单测 7/7 + smoke pass（canonicalHash/memo 后 byte-identity 保持）；model-profile-registry 单测 10/10；矩阵一致；n8 smoke / harness e2e / backend 全套件（运行中补记）。

### 2026-06-13 Phase 3 实施进度
**架构定调**：debate 运行时是**调用方侧 service**（与 v1c N2 同构，非 harness 内部）——4 角色序列由调用方/coordinator 在 N7 handoff 标示 debate 时调用，synthesizer 产出 `TopicValueAssessmentDraft@v1` 同时记录为 `n8_value_assessment_draft` 语义工件（model_draft_for_gate）+ 4 个角色工件（support_only）；harness 只做确定性 gate（触发检测/loopback）。harness 不跑 debate（DMP-10 单实现，D-07 调用边界）。
- **3.0 ✅** D-T123-02 联合决策登记（T-088 `06-joint-decisions.md`）。
- **3.1 ✅** 契约层（`topic-selection-v1b-workflow-harness-contracts.ts`）：
  - 4 角色槽位 id（`n8_debate_assessor_draft/value_critic/assessor_repair/synthesizer_final`）+ 4 槽位 spec（support_only，输出 `TopicSelectionV1bN8BoundedDebateRoleOutput@v1`，共用 `n8_bounded_debate` profile）。
  - `TOPIC_SELECTION_V1B_N8_BOUNDED_DEBATE_ROLE_ORDER` 角色序常量 + `TopicSelectionV1bN8BoundedDebateRolePayload` 角色输出契约。
  - `TopicSelectionV1bN8DebateTriggerThresholds`（provisional 初值）落 N8 node policy；N8 blocker/warning codes 增 T1/T3 触发码与 after-debate 告警码。
  - 矩阵 slot map +4 行（一致性脚本动态解析槽集合，无需改脚本）。
- **3.2 ✅** harness gate/runner（`topic-selection-v1b-workflow-harness-service.ts`，加法）：
  - `computeTopicSelectionV1bN8DebateTriggers`（导出纯函数，边界值可单测）+ `n8DebateTriggerIssues`（读 node policy 阈值）。
  - `resolveN8DebateAdmission`（读 N7 handoff 钉的 admission 工件，`input_mode` 作首评/复评判别）。
  - `persistN8DebateLoopback`（首评 T1/T3 命中 → route `RB_N8_N7` + `loopback_target_code: n8_feedback_to_n7` + 组装 `N8ToN7Feedback@v1` 工件，零 authority 写入，镜像 N7→N6 exhaustion 形态）。
  - `n8Warnings` 增 postDebateTriggers 参数（复评仍命中 → after-debate 告警，不再回路）。
  - N7 `n7Warnings` 已发射 `n8_debate_level_selected`（既有，核实保留）。
  - **验证**：backend tsc 0、shared tsc 0、矩阵一致、`v1b-n8-runtime-smoke` exit 0、`v1b-harness-e2e` exit 0（既有单 agent 路径不变——provisional 阈值对现有 fixture total 83/conf 0.82/spread 12 不触发）。
- **3.6（docs 部分）✅** DMP-13 锁定（`11-debate-model-invocation-policy.md`：原语二分 + N8 N6-同形触发/准入语义 + 命名 N8 profiles，locked marker DMP-12→13）；矩阵 N8 行 planned→implemented + 触发码 + DMP-13 引用，一致性脚本绿。
- **3.3 设计 ✅** 共享骨架抽取方案经设计 workflow（3 候选评审，按真实行号核实）。winning：HYBRID middle-template-method core + loop_transcript_hash + **gate bridge**。关键修正（所有评审 agent 标记）：既有 N8 gate 把 expected identity 钉死到单 agent runtime 的 `buildAdmissionExpectedIdentity`，debate synthesizer 工件若直接记录会被 block；bridge = synthesizer 的 `assessment_draft` 经**既有单 agent `generateDraftArtifact()`** 重新记录为 `n8_value_assessment_draft`（携单 agent identity），零 gate 改动。spec 持久化于 `07-phase3-debate-skeleton-spec.md`。
- **3.3 STEP 1–4 ✅（v1c 抽取，byte-identical 已验证）**：
  - 新建 `topic-selection-bounded-debate-loop-contracts.ts`（shared StepContext）+ `topic-selection-bounded-debate-core-service.ts`（generateRoleArtifact 单轮 + runLoop + loop_transcript_hash）+ `topic-selection-bounded-debate-strategy.ts`（版本注入 strategy 接口）。
  - v1c runtime 重写为 core 薄 facade + 私有 `V1cN2BoundedDebateStrategy`（所有 v1c byte-bearing 逻辑 + buildAdmissionExpectedIdentity 逐字搬迁）。
  - **验证方法修正**：smoke 的 prompt_packet_hash 依赖 `workflow_run_id`（来自 RUN_KEY）且 smoke DB 有状态（断言 fresh 缓存行），跨 run 绝对哈希不可比——故采用对**纯函数 `buildAdmissionExpectedIdentity`**（固定 id）的 old-vs-new 差分探针：4 角色的 prompt_packet_hash / runtime_invocation_context_hash / context_policy_profile_hash / source_hashes **全 byte-identical**。v1c 单测 7/7、smoke pass、backend tsc 0。
- **3.3 STEP 5–11 ✅ + 3.5 ✅ + 收口（2026-06-14）**：v1b N8 单 agent helpers 共享缝 → 4 context-policy profiles + 4 invocation slots → debate 运行时 + admission（13 例 drift 负测）→ gate bridge → debate smoke + 回归 → coordinator feedback recipe + N7 debate-admission 支撑输入（**全闭环 coordinator 驱动**）。两条全闭环 e2e（harness 级 `n7_runtime_smoke` 变体 + coordinator 驱动集成测试）均绿。一轮多角度审查（9 项修复：gate-bridge execution_mode 穿线、critic-resolution 守卫、loop-id/canonicalHash 单源、若干文档/测试）。F-05 关闭，详见 `07-phase3-debate-skeleton-spec.md`。

## 实施记录

### 2026-06-15 Phase 5 实施（M5 复杂度治理，进行中）
- **5.2（F-10）closed**：压缩策略去硬编码（profile `allowed_executor_kinds` 主项 SSOT，byte-identical）+ **per-provider token 估计落地**（真实分词器实测校准，见 §2026-06-15 F-10 per-provider token 校准）。STEP-7 debate 压缩 facts 仍独立延期（consumer-dependent，非 F-10 阻断）。见 F-10 行。
- **5.3 非 harness 收口（已做）**：① **POLICY_VERSION 收编**——`'topic-selection-v1b-node-policy-v1'` 原散落 4 个 backend service const + 14 处 contracts `slot_policy_version` 字面量，统一为 shared `TOPIC_SELECTION_V1B_NODE_POLICY_VERSION`（byte-identical）。② **S5 并行化**——decision-memory `buildPacket` 的 per-candidate-set 加载由 O(S) 顺序 await 改 `Promise.all`（保序，packet byte-identical——它进 N6/N8 frozen-input lineage）。验证：tsc 0、套件 1308/0。
- **5.3 剩余项评估（低实际价值，记 backlog）**：validateRegistry 缓存（仅加载期一次）、loadTraces kind 仓储过滤（仓储契约改动换边际收益）、advance-loop 投影增量化（典型 run T 小、可变 checkpoint 引入风险）、gateway 校验钩子化（多 gateway 实现不存在，YAGNI）——均为非热路径 perf/思辨性 hygiene，change-risk 高于边际收益，暂不做。
- **5.3 harness 本体项 → 5.1 窗口**：3 个 artifact 解析器收编（resolveN7SemanticPayload/resolveN8DraftPayload/resolveDecisionMemoryPacketFromSourceRefs）+ N6 单次解析——触碰 harness 本体（D3），并入 5.1 拆分窗口处理。
- **5.1（F-11）进行中**：harness 单文件 12,929 行**纯机械拆分**（抽纯函数簇：parse-and-resolve / hash-authority / ref builder）。**D-T123-03 已登记**（T-088 `06-joint-decisions.md`，2026-06-15，用户签核拆分范式）；先落 **replay-identity 守卫单测**（钉死 hashContext / authority hashes / outcomeGateResultHash / frozen_input_hash 具体值），每 slice 前后守卫 + 全套件保持绿。增量推进、多 session。byte-identity 范式复用 v1c debate-core 抽取（逐字搬迁 + 差分核验）。

### 2026-06-15 F-10 per-provider token 校准（真实分词器实测 → 保守校准 → 对抗复核）
**结论先行**：用三家 provider 的**真实分词器**对代表性选题 payload 实测 CJK / Latin token 比率，给 estimator 装 `provider_id`-keyed 校准表（budget gate 透传 `provider_id`）。**default / unknown provider 维持原统一保守值，估计 byte-identical**（硬不变量）；只有已实测的 provider 在**含 CJK 的 payload**上收紧。F-10 partial 注记的"数据依赖延期"由本次实测消除——这是当初提示中"独立标定任务"的执行。

**改了什么（代码）**
- `topic-selection-conservative-token-estimator-service.ts`：加 `ProviderTokenCalibration` + `DEFAULT_TOKEN_CALIBRATION`（`{latin_chars_per_token:4, latin_words_multiplier:1.15, cjk_tokens_per_char:1, newline_divisor:8}` = 原行为逐字）+ `PROVIDER_TOKEN_CALIBRATIONS`（openai/dashscope/deepseek）；`estimateText/estimatePayload/estimateSchemaOverhead` 加可选 calibration 参数（缺省 = DEFAULT）；`estimateInputTokens` 入参加 `provider_id?`，经 `resolveCalibration(provider_id)` 解析并贯穿。
- `topic-selection-token-budget-gate-service.ts`：`evaluate` 已持有的 `provider_id` 透传进 `estimateInputTokens`。
- 其余 gate 调用点（harness human-confirmation / need-adjudication / evidence-map @4467/5697/6610）**不**透传 provider——其 `runtimeBinding` 无已解析 provider（仅 provider-agnostic profile），故落 default（安全高估、byte-identical）；唯一已解析 provider 的产品主路径 = agent-orchestrator @1373（N4/N6/N8 生成），已透传并受益。compression-runtime 同样维持 default（其 input 无 provider；after 估计偏保守 = 安全）。

**测量方法（可复现：`evidence/f10-token-calibration/measure.py`）**
- provider→model→tokenizer：openai/gpt-5.5 → tiktoken **o200k_base**；dashscope/qwen3.6-plus → **Qwen-BBPE**（Qwen2.5/Qwen3 共享 151,643 词表，用 `Qwen/Qwen2.5-7B-Instruct` tokenizer.json）；deepseek/deepseek-v4-pro → **DeepSeek-V3 BBPE**。
- 语料从本仓 dev-docs 技术中文（同域同作者）+ backend 源码英文/代码重新派生；CJK 比率在**纯 CJK 串**上测，Latin 比率在英文/代码行上测。
- **实测 CJK tok/char 均值：openai 0.842 / qwen 0.730 / deepseek 0.669**（均 < 统一估计的 1.0——统一估计在 CJK 上系统性高估，正是收紧空间）。Latin 实测 chars/token 在代码重语料上 ~3.9–4.5（含 p5 ~2.8、deepseek 均值甚至 < 4），变异大 → **divisor=4 已在安全边缘，全 provider 维持不收紧**。
- **校准取值（保守，> 实测均值；由整输入最差边际封顶）：CJK tok/char openai 0.90 / dashscope 0.95 / deepseek 0.85**。取值**不**按裸 CJK 比设，而按"整输入 ×1.25 后最差边际须留 ~5% 稳健头寸"反推：dashscope 裸 CJK 最省（0.73）却 Latin/结构 token 化最不省，整输入最差边际最薄——0.90 仅余 ~2% 头寸且随语料漂移，故**最少收紧到 0.95**（最差 ~4.4%）；openai 0.90（~7.5%）/ deepseek 0.85（~5.4%）头寸充裕。即：dashscope 反而收紧最少，正因其整输入安全余量最小。
- **验证（全输入级，非裸比率）**：1200 个 repo 派生输入（12 seed，33% newline-heavy 消息内容 + 25% CJK-heavy stress），过完整 estimator（含 structure/key/schema/role overhead）× 1.25 profile 安全边际后对真实分词器计数：**0 例低估**，最差 est/actual ≈1.04（o200k 1.075 / qwen 1.044 / deepseek 1.054），default 仍 byte-identical（脚本内置断言）。exact 最差值随 doc 派生语料演进略漂移，**"0 低估"是不变量**——复跑 measure.py 实时核验。

**对抗性复核（4-lens workflow + skeptic 复核，14 agent）发现与处置**
- 🔴**真回归（已修）**：CJK 收紧后 **newline-dense CJK** 会低估——`'阻断项\n'×8` 在 qwen/openai 下 calib×1.25=29 < 实际 32（default×1.25=32 恰好不低估）。根因：原 `newline ÷8` 松散启发式，原本靠统一 CJK 高估掩盖了换行欠计；CJK 一收紧就暴露。**修法**：把 newline 项纳入 calibration，**default 维持 ÷8（byte-identical）、provider 收紧到 ÷1（≈真实每换行 1 token）**。修后 newline-heavy 进 1200 输入验证集，0 低估。realistic 多行内容（换行每 ~30–60 字）本就安全；仅"换行每 3 字"的病态串触发，但仍按"绝不低估"封死。
- ⚪**误报 1（核证安全）**：`paper-implementation-motive-evolution-runtime-service.ts` 把 token budget gate result（含 estimated_input_tokens）哈希进 `artifact_identity_hash`，疑破坏 replay byte-identity。核证：paper-impl **从不实例化本 gate**（无 `evaluate()` 调用），其 gate result 由上游 role 结果供给；全套件绿（无 golden 破），**replay 返回存储结果**（不重算估计）→ 旧 run 不受影响；该"估计入 identity"是 paper-impl（另一模块）既有设计、非本改动引入，新 run 用更准估计得确定 identity 是正确行为。不在 F-10 范围、不动。
- ⚪**误报 2（核证安全）**：compression-runtime 用 default 而 gate 用 provider 校准，疑 before/after 不一致误翻压缩质量门。核证：before 多由 gate 经 override 传入；after 用 default 重算 = 偏**高**（保守、更难误判"压缩不足"），非低估风险；且 compression-runtime input 无 provider。维持 default。
- ⚪**既有/范围外（已记，不在本任务修）**：Japanese 假名 / Hangul 不在 `CJK_PATTERN`，按 Latin 计 → 低估——但这是**既有**行为（本改动对假名 cjk=0 → byte-identical，未恶化），且改 `CJK_PATTERN` 会破坏 default byte-identity（硬不变量）、选题域为中文，故记为已知边界不动。语料代表性（技术中文+技术英文域）、post-cutoff tokenizer 家族假设（已在 measure.py 注记，建议随真实模型分词器可得时复测）—— 记为复测建议。

**残留/复测建议**：校准基于 post-cutoff 模型的**家族** tokenizer（厂商每代至多换一次分词器 + 取值高于实测均值 + 1.25 边际，三重保守）；真实 gpt-5.5/qwen3.6-plus/deepseek-v4-pro 分词器可得时按 `measure.py` 复测确认。语料随真实选题 payload 积累后建议扩充复跑。

### 2026-06-15 DP-3.3 N8 debate 阈值标定（数据挖掘 → 真实分布不可用 → 维持 provisional）
**结论先行**：现有数据**无法**标定 T1/T3 阈值；按 DP-3.3 / 本任务第 3 项**维持 provisional、不猜值、保留 `n8_debate_thresholds_provisional` product tripwire**，并记录所需数据采集。阈值常量与 `provisional: true` **零改动**（仅把 contract 内联注释从误导性的"calibrate against near-prod deep-test distribution"更正为本发现的指针——comment-only，不动值/flag/行为）。

**数据挖掘范围与发现（全量扫 `.ai/.tmp`）**
- 带完整 N8 分数（`total_score`/`confidence`/9 维 `dimension_scores`）的工件**只存在于** `external-codex-n8-variance` 样本组：`t107-external-codex-n8-variance-20260528d/.../sample-{1,2,3}/last-message.json` + `t112-v1b-deep-review-external-codex-n8-20260601/.../sample-{1,2,3}/last-message.json`，**共 6 个文件**。
- 这 6 个样本在数值轴上**逐字相同**：`total_score=83`、`confidence=0.82`、9 维全 84 唯 `reviewer_risk=72`（→ spread=12，单维 floor 72），`readiness=ready`、`disposition=advance_to_package`。
- 全 `.ai/.tmp` 中**唯一**出现的 N8 `total_score` 值就是 **83**（`grep -rho '"total_score": *[0-9]+'` → 仅 83，零其他值）：共 36 处**行匹配**、跨 26 个文件，其中只有 **6 个 `last-message.json`** 是完整 9 维 assessment payload（+ 2 个 `result.json` 各嵌 3 处 `total_score=83` 但**不含** dimension_scores），其余 18 个是 `prompt.md`/`stdout.log`/`stderr.log` 的 prompt 文本/控制台回显，非持久化 payload。
- 根因：`external_codex_n8_variance` 探针的 prompt **显式钉死** "total_score must stay 83" 且 "you may vary only natural-language wording"（`topic-selection-v1b-harness-e2e.mjs:4429-4433`）——它是**散文非决定性**的方差探针，不是分数分布。
- harness / deep-test 的 N8 路径全程 `semantic_mode: fixture`，用的是**手写固定 fixture**：
  - `v1bHarnessN8ValueDraft`（happy/advance）：total 83 / conf 0.82 / dims 84·reviewer_risk 72（`:1120-1135`）。
  - `v1bHarnessN8NonAdvanceDraft`（refine）：total 55 / dims ≤55·58（`:1203-1210`）。
  - `v1bHarnessN8BlockingGateDraft`：与 happy 同分 + 一个 blocking hard_gate（**门级**否决，非分数级）。
  - debate-loop e2e（`runN8DebateTriggerLoopVariant`）：`total_score:66` 在 e2e 内**内联写死**专为落入 [60,72) 触发 T1（`:3390`,`:3436`）——相对阈值**循环自证**。
  - provider canary：它是 **transport/prompt-cache/provenance 探针，非价值探针**。**default（非 live）路径**用 `StubProviderCanaryGateway` 返回 canned `v1bN8CanaryOutput`（total 76 / conf 0.78 / dims 80·reviewer_risk 72，`provider-canary-service.unit.test.ts:584-617`），**显式声明价值中性**（"show provider-live runtime semantics, not topic value"）。**live 路径**（`shouldRunLiveV1bN8Canary`：`T112_V1B_N8_PROVIDER_CANARY_LIVE=1`＋`BACKEND_TEST_PRESERVE_REAL_ENV=1`＋真实 key，near-prod canary 层确有置位，`package.json:59`）**确实**用真实 `new BackendLlmGateway(...)` 打真 provider（`:2150-2196`）——但断言函数 `assertV1bN8PromptCacheLiveRequiredResult`（`:786-889`）**只校验 transport/telemetry/prompt-cache 复用，从不读/不持久化** `total_score`·`dimension_scores`·`confidence`。故**两条路径都不产可用分布**：stub 价值中性、live 真分数**产出即丢弃**。（更正：先前版本误述"即便 live 标志开 gateway 仍是 fake"——live 网关是真的，但分数不被捕获，结论不变且更强。）
- `n8_runtime_smoke` / `full-chain` 的 `result.json` **完全不含** `dimension_scores`/`total_score`/`confidence`——它们记的是 gate/route/hash provenance，不是 assessment payload。证实任务提示的告诫：这些 T-112-era 产物是 runtime-stress/harness 溯源，**不是 N8 分数分布**。

**为何不能据此标定**：6 个样本是**同一个固定 topic 的 n≈1**（且数值轴还被探针钉死），fixture 分数要么循环（66 borderline 是为匹配 T1 band 构造的）、要么价值中性（canary）。fixture 模式重跑 deep-test 只会复现同样 fixtures；**唯一**能产真实分布的是 `provider_llm` 模式跑**真实** N8 value-assessment prompt over 一个有标注的多样 topic 语料——该语料**不存在**，且现有脚本在 fixture 模式下**不可能**产出它。

**provisional 不是"没能决定"，是"合理但未实测校准"**：阈值带 **本身内部自洽**且无观测反例——T1 band [60,72) 取在 `advance_to_package` 地板 60 之上、clear-pass 区（fixture 83）之下；T3 spread≥40 / 单维<35 均门控在 total≥60（否则分数门已接管）。N8 trigger 单测 8 例边界（83/0.82/spread12 不触发；66→T1；spread40·total≥60→T3；单维<35·total≥60→T3）证实其编码意图一致，且现有 fixture 谱（83 pass / 66 borderline / 55 refine）没有任何点与该带矛盾。故保留 provisional 是"刻意保留一个合理缺省、待真实分布收紧"的决定，而非"判不出来"；把 `provisional` 翻 false（宣称已校准）才是被禁止的猜测。

**真要标定所需的数据采集（留给后续独立标定跑）**
1. 一个**有标注**的语料：N 个**不同的**真实候选 topic，覆盖价值谱（clear-advance / borderline / clear-refine·drop / 维度冲突），每个带人工/已知 ground-truth disposition。
2. 用 `topic_value_assessment_single_agent` profile 在 `provider_llm` 模式跑真实 N8 prompt over 该语料；最好**跨已注册 provider**（gpt-5.5 / qwen3.6-plus / deepseek-v4-pro）以捕捉跨 provider 的分数标度差异。
3. 持久化每 topic 完整 `TopicValueAssessmentDraft`（total_score、confidence、9 维 dimension_scores）。
4. 分析 borderline/冲突样本相对 clear pass/fail 在 (a) total_score、(b) confidence、(c) 维度 spread、(d) 单维 floor 上的实际落点；据此设 T1/T3 使其以可接受的 precision/recall 分离"真 borderline/冲突"与"清晰 pass/fail"。
5. 每 band 样本量需足以非轶事级（当前 6 个同分样本 ≈ n=1，远不足）。

**验证（无运行时/契约值改动 → 仅相关测试，full 套件无需重跑）**
- N8 debate-trigger 单测（钉死 T1/T3 边界，含 provisional 阈值副本）：**8/8 绿**。
- coordinator feedback recipe 单测：**15/15 绿**。
- coordinator 驱动全 debate-loop 集成（borderline T1 loopback → N7 feedback 重入＋debate-admission 支撑 → 复评 `admitted_with_warnings`）：**绿**；同文件唯一 fail = 既有 **T-054 Prisma-smoke 环境门**（缺 `DATABASE_URL`），与本任务无关。
- shared tsc 0、矩阵一致性绿（comment-only 改动不动 node_id/slot_id 正则面）。
- **未改阈值常量与 `provisional` flag** → 零 replay-identity / 行为影响，故 docs+comment-only 收口不触发 full 1308 套件重跑义务（相关三测已直接覆盖触发逻辑与全闭环）。

### 2026-06-15 DP-3.3 续：标定路径勘察（凭据已具备但发现更深阻塞 → 仍维持 provisional，记设计决策）
**触发**：独立标定任务启动后复核环境与调用路径——`.env.local` **三家 provider key 齐备**（openai/dashscope/deepseek），凭据非约束；但 understand-phase 勘察（3 agent，代码核证）发现**比"无语料"更深的阻塞**，并**纠正了上一版数据采集计划里的 provider_llm 设想**。证据全量留档 `evidence/dp33-n8-threshold-calibration/README.md`，要点：
- **F1 内容可见性**：N8 模型 prompt = `system + stableStringify(context_packet)`，context packet **只含 refs+content-hash + decision_memory packet**，**不内联任何价值实体**（main_question/claim_ceiling/answerability/slice/evidence 全是 ref+hash）。证：runtime-service `:476-547`；contracts `N7ToN8HandoffPayload :1278-1297`、projection `:1356-1380`（纯 refs/hashes + `preserved_fact_kinds` 名）。唯一内联自由文本是 decision_memory（`:210→515`）。
- **F2 执行模式**：production N8 草稿生成 `execution_mode` 类型**仅 `codex_assisted | mocked_llm`**（runtime-service `:136`），`codex_assisted` 要求 operator 外供 `codex_response.output`（orchestrator `:473-534`，外部 Codex CLI agent 另跑）。**provider_llm 从不走 production N8**——只在 transport canary 里出现且**丢弃分数**（canary `:338-361/:1234-1274`）。内容接地靠**外部 codex agent 的带外文件访问**（能解析 refs 读真件），裸 provider_llm API 无此能力→内容盲。
- **F3 上一版计划纠错**：03 上文"用 provider_llm 模式跨 gpt-5.5/qwen3.6-plus/deepseek-v4-pro 跑"**两处皆误**——(a) provider_llm 非 N8 production 路径且内容盲；(b) **deepseek 根本未注册为 N8 single-agent option**（仅 openai-balanced/dashscope-thinking-budget；registry `:179-182/:197-311/:1368-1385`）。且**至今无任何真实内容接地的 N8 评估**：现存 external-codex-n8-variance 是**钉死分数的散文方差探针**（prompt 明令"Do not inspect files"且"total_score must stay 83"，sample prompt.md `:1-20`）。
- **F4 设计决策（joint，D3 敏感）**：用户裁定内容可见性为**gap 非 by-design**。修法二选一（团队设计决策，**需与 T-088 联合决策 + replay-identity 守卫**，因内联体改 `prompt_packet_hash` → replay/admission identity）：**(A)** 维持 codex_assisted、给 codex agent 文件访问读真件后跑标定（无契约改动，操作性）；**(B)** 把价值实体解析内联进 context packet（仿 decision_memory `:515` 先例），使任意 executor（含 provider_llm）可见内容（字节级 harness 改动 + 需补 N8-runtime 的 provider_llm 实现）。**在 (A)/(B) 决策落地前，无可产生代表性 N8 分数分布的有效路径** → 阈值维持 provisional、tripwire 续守。
- **交付**（按用户裁定 **document-only，不建代码**——标定模块无可运行数据源前即建即是过早 seam）：① 本节 + evidence README 记全 blocker；② corpus-entry schema（`TopicSelectionN8CalibrationCorpusEntry@v1`）与 analysis-algorithm spec（纯函数，复用 `computeTopicSelectionV1bN8DebateTriggers`，混淆矩阵/precision-recall/per-executor）落 README；③ 跟踪任务已按纠正后路径重开。**零代码、零阈值改动、tripwire 保留。**
- **上文"真要标定所需的数据采集"小节中 provider_llm 跨 3-provider 表述以本节为准**（codex_assisted-over-labeled-corpus，或先做 (B) 内联再 provider_llm；deepseek 需先注册 N8 option）。

### 2026-06-15 DP-3.3 scaffold 构建（用户裁定 "A + full scaffold"；标定工具，不接产品路由）
STEP-1 选 **A（codex_assisted + 文件访问）**首跑（无契约改动、不需 D3 联合决策、与 production 执行模式一致、最具代表性；B 留作"是否把 N8 production 改投 provider_llm"的独立设计决策）。按裁定建**纯工具 + 单测**三件（均不改阈值、不改 node policy、不接任何产品路由）：
- **分析仪** `apps/backend/src/services/topic-selection-v1b-n8-calibration-analysis.ts`（`analyzeN8DebateThresholdCalibration`）：纯函数，**复用 production `computeTopicSelectionV1bN8DebateTriggers`**（非另写触发逻辑）→ 混淆矩阵/precision/recall/f1 + per-executor·per-provider + T1/T3 band 归因（cross-misfire）+ `separates|leaky|insufficient_data` 裁决 + 建议。排除 `status!='succeeded'` 记录（blocked 不当 0 计）；0/0 返 `null` 不假装 1.0。单测 8/8。
- **物化器** `…-calibration-materializer.ts`（`materializeN8CalibrationRunRequest` + `verifyN8CalibrationRunRequest` + `buildN8CalibrationMockDraft`）：corpus entry → **过门的** N8 RunRequest（in-memory control plane 记录 bodies + N7→N8 projection；frozen payload 由 projection 派生使 9 ref/hash 对逐字相等）。**镜像** SSOT projection builder（harness-service.ts:8236）而非 import（harness D3 敏感、不触碰）；verify 跑**真实** `generateDraftArtifact`（mocked executor、零 provider 调用）= **漂移守卫**（harness 变更致构造失门则测试红）。单测 5/5（valid 过真门 + capture 读分数；3 负例 篡改 lineage hash/错 node_id/丢 projection → `INVALID_PAYLOAD`）。
- **corpus 模板** `evidence/dp33-n8-threshold-calibration/corpus-template.json`：2 个 `__placeholder:true` 示例（clear_pass/borderline），示 `TopicSelectionN8CalibrationCorpusEntry@v1` 形，真跑前须人工换真实有标注 topic。
- **option-A runner** `…-calibration-runner.ts`（`runN8Calibration` + `loadN8CalibrationCorpus` + `mockN8CalibrationAssessor`）：push-button 胶水——corpus → 逐 entry materialize + mocked 门 pre-flight → **可插拔 assessor** → 捕获 draft → analysis record → 分析。assessor 是唯一人/operator 供给项（真跑读 entry bodies 产 draft，须非 score-pinned 且**独立于标注者**，否则单评分者循环）；`loadN8CalibrationCorpus` **拒 placeholder**（含真实 corpus-template.json），防误标定。单测 5/5。

**STEP-1 锁定（2026-06-15，用户签核）：选 A**——保持 N8 codex_assisted、用内容接地非 score-pinned assessor 读真件标定，**无 harness 契约改动、无需 D3 联合决策**。**B 不推进**（移 N8 至内联体 + raw provider_llm = 字节级 harness 改动，需 T-088 联合决策；仅当未来团队决定 raw-API 成 N8 production executor 时再议）。A 路代码全建齐。

**仍未解（仅剩 2 个人/operator 门，非代码）**：① STEP-3 人工标注 corpus；② STEP-5 跑独立内容接地 assessor。两者落地前无可产生代表性 N8 分布的有效路径 → 阈值维持 provisional、tripwire 续守、**不猜阈值**。
**验证**：backend tsc 0；4 套 N8 单测（analysis 8 + materializer 5 + runner 5 + 既有 trigger 8）= 26/26；full 套件 1367/1332/0（+18，零回归）；仅**新增** 6 文件、零改既有 production 代码。详见 evidence README §"Scaffold (built)" + §"STEP-1 decision".
**mock-corpus 边界（2026-06-15 验证）**：10-entry mock corpus 过 `runN8Calibration` 端到端演示返 `leaky`（正确点名注入的 FP/FN + 给调参建议），证管线可辨好/漏阈值集；演示脚本 throwaway 已删（常驻证据 = runner 单测，含拒收 placeholder 模板）。**但 mock corpus 只能验管线、不能标定阈值**——分数+标签皆捏造→循环；翻 `provisional→false` 必须基于真实有标注 corpus + 独立内容接地 assessor 的真分数。详见 README §"Mock-corpus testing vs calibration".

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
