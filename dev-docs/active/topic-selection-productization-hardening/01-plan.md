# 01 Plan

## Phase 依赖关系
```
Phase 0 (M0 SSOT) ──► Phase 1 (M1 参数) ──► Phase 3 (M3 N8 debate, 依赖 1.1 + D2)
                          │
                          ├──► Phase 2 (M2 Coordinator, 依赖 D1)   ─┐ 可并行
                          └──► Phase 4 (M4 Decision Memory)        ─┘
Phase 5 (M5 复杂度治理) 最后，且 5.1 需 D3 联合决策
```
每个 Phase 收口时：更新 `03-implementation-notes.md`、`04-verification.md`，状态变化更新 `00-overview.md`。

---

## Phase 0 — SSOT 对齐 + 防漂移校验（M0）
> 决策已对齐（DP-0.1~0.8，见 `03-implementation-notes.md` §Phase 0 决策）。

- **0.1** 矩阵迁移 + 修订（DP-0.1/0.3/0.4/0.5）：矩阵从 T-089 包迁至 `docs/context/process/topic-selection-workflow-matrix.md`（永久 SSOT），原址与 T-123 留指针；修订内容：
  - v1a 行：ID 已对齐（核实 9/9），仅轻校字段。
  - v1b 行：重写为 11 节点真实 ID（contracts `:541-994`；N1/N3/N9/N10/N11 deterministic，N2/N5/N7 delegated，N4/N6/N8 model_like）；N2/N5 反映 T-115 人审 surface。
  - v1c/downstream 行：命名以代码为准改文档（`record-human-promotion-decision`、`topic-selection.v1c.downstream-feedback-recheck`）。
  - 扩两列：`human_delegated_allowed`、`debate_primitive`（divergent_loop | bounded_sequence | reserved | none）。
  - v1b N6 debate 登记 `reserved`（escalation 已预埋、scenario 未定义、触发即 blocked）；N7 注记 "contract-capable but product-mechanical"（T-115 结论）；v1b N4 记录 "rejected debate, allow multi-instance divergent sampling"。
  - 在 T-089 `03-implementation-notes.md` 留痕。
- **0.2** v1c 节点常量收编（DP-0.2，唯一代码改动）：shared contracts 新增导出 `TOPIC_SELECTION_V1C_NODE_IDS`；既有 3 处散落 node_id 字面量改引用；纯常量、零行为变化。
- **0.3** Slot Map 全收录（DP-0.6）：v1b 10 槽（3 required + 7 support-only）+ v1c N2 四角色/N4/N6 槽位状态更新为 implemented。
- **0.4** 一致性校验脚本（DP-0.8）：`.ai/scripts/topic-selection-workflow-matrix-consistency.mjs` 校验 `docs/context` 矩阵——① 四段 node_id 集合相等（v1a/v1b contracts、v1c 常量、resource-sampling 常量）；② v1b slot_id 集合相等；③ 粗粒度模式一致性（codex_allowed ⇔ allowed_execution_modes）；产品决策列不自动校验。带 `--self-test` + 薄 backend test 包装进默认套件。
- **AC**：脚本对修订后矩阵通过；三类注入漂移（多余/缺失/改名）分别失败；v1c 常量被 3 处既有引用消费（typecheck 钉死）；矩阵新列在 N2/N5/N8/N4(v1a N8/v1c N4) 抽样行语义正确。

## Phase 1 — 参数规范化收口（M1）
- **1.1** N8 去硬编码：在 model-profile-registry 注册 `topic-selection.v1b.assess-topic-value` profile（options 含 openai-quality / dashscope-thinking / deepseek 备选，沿用 DMP-12 超时目标）；`topic-selection-v1b-value-assessment-service.ts` 改为 registry 解析（删除 `DEFAULT_MODEL` 与静态 params 直传路径，保留显式 `model_option_id` 覆盖位）。
- **1.2** 注册 v1b N4 / N6 槽位 profiles（slot map planned → implemented），harness 调用点接 registry 解析。
- **1.3** typed provider_overrides：定义 `OpenAiProviderOverrides | DashScopeProviderOverrides | DeepSeekProviderOverrides` 联合类型；registry 加载期校验 fail-fast；`llm-gateway` 适配层消费 typed 形态（DMP-06 边界不变：domain/契约层仍不见 provider 参数名）。
- **1.4** prompt template registry + output schema registry（轻量）：versioned id → 内容（或内容 hash）映射，启动期校验"调用点引用的 id@version 必须已注册"；先收编 topic-selection 域全部调用点。
- **1.5** cost_usd：provider 价格表（配置数据，非硬编码）+ gateway telemetry 计算 `cost_estimate_usd`；缺价目时记 null 并 warning，不阻断（DMP-07：telemetry 缺失不 block）。
- **AC**：新增 grep/lint 守卫——topic-selection 域内除 registry 自身外无 `providerId:`/`modelId:` 字面量与 provider SDK 直引；N8 集成测试断言 provenance 含 `profile_hash`/`normalized_params_hash`；`topic-selection:v1b-n8-runtime-smoke` 与 v1b 套件回归绿。

## Phase 2 — Run Coordinator + 鲁棒性（M2；D1 已锁定：后端薄服务 + 分阶交付）
- **2.0** 并发现状核实：确认 v1b invocation 持久化（control-plane artifact 路径）对同 `(workflow_run_id, node_id, node_attempt_id)` 双发的实际行为；选定防护方案（`02-architecture.md` §并发方案 A/B），若需 prisma 迁移走 `sync-db-schema-from-code` skill。
- **2.1** RunStateProjection：从 trace artifacts 重建 run 级状态（当前节点、各节点最新 gate_status/route_decision、loopback 计数）的读侧投影 + 持久化 checkpoint；提供 `GET run state` 查询。
- **2.2** `TopicSelectionRunCoordinatorService`：同步 `advance-until-blocked`（步数上限参数）；仅通过 `harnessService.invokeNode` 驱动；`invoke_next` 自动推进（按节点 execution profile 取默认 execution_spec）、`loopback` 受预算约束推进、`blocked`/`requires_human_review`/`wait`/`stop_v1b_complete` 停驻并返回停驻原因。human/delegated 节点一律停驻——人通过既有 `human_delegated` 路径行动后可再次触发推进（人审兼容不变量）。
- **2.3** 预算与超时策略：loopback 预算（per loopback-target 次数上限，超额 → blocked `LOOPBACK_BUDGET_EXHAUSTED`）；节点级 invocation 超时与 run 级推进超时（policy 配置，默认值在 `02-architecture.md` 定）。
- **2.4**（可选，最小增量）HTTP 触发路由 + 桌面工作台"推进"按钮；不做新工作台。
- **AC**：故障注入三件套（并发双发 → 恰好单次执行/另一次得到 replay 或冲突；推进中崩溃 → 重新触发经 replay 恢复且无重复副作用；loopback 超额 → budget_exhausted blocked）；全链 auto-advance e2e（mocked acceptance 隔离，N1→人审停驻→human_delegated 续→N11）；既有 `topic-selection:v1b-harness-e2e` / `v1b-runtime-stress` 回归绿。

## Phase 3 — v1b N8 有界对抗 debate（M3，依赖 1.1；D2 已锁定：N6 同形 gate/loopback 触发）
> D2 终态（2026-06-12 签核）：零新触发引擎，全部复用既有机制。详见 `03-implementation-notes.md` §整包决策。
- **3.1** 复用 v1c N2 bounded-debate runtime：抽取角色表驱动的共享有界辩论执行器（或参数化现 service），禁止新建第二套 debate 实现（DMP-10）。
- **3.2** 触发与准入（N6 同形）：
  - T1 borderline / T3 维度冲突 = N8/N9 确定性 gate 新增 warning/blocker 编码（阈值进 node policy）；
  - 升级路径 = 既有 loopback 路由（N8→N7 feedback；N9→N8 `n9_loopback_to_n8`）；
  - 准入 = 实装 N7 既有 planned 槽 `n7_n8_debate_admission_review`（输出 debate level，warning `n8_debate_level_selected` 已预埋）；
  - T2 重跑漂移 = admission review 的参考输入（读 trial ledger，`trial_ledger_hash` 已在 N7 replay 组件），不做独立检测机制；
  - T4 operator 强制 = DMP-11 既有 execution_plan 显式选择。
- **3.3** N8 debate 角色序列 `assessor_draft → value_critic → assessor_repair → synthesizer_final`，每角色注册 profile；政策文档增补 DMP-13（debate 原语二分 + N6 同形触发语义）；矩阵 N8 行 conditional → 机制引用。
- **AC**：gate 编码单测覆盖 T1/T3 边界值与组合；admission 槽实装测试（含 T2 trial-ledger 参考输入路径）；debate 路径 e2e（mocked，acceptance 隔离）绿且 provenance `debate_extension` 完整；不触发时单 agent 路径行为不变（回归对比）；`topic-selection:v1b-n8-runtime-smoke` 绿。

## Phase 4 — Decision Memory 投影（M4）
- **4.1** `TopicSelectionDecisionMemoryProjectionService`：读侧聚合（per title-card + 全局）——否决的 NeedCandidate/adjudication 路径与理由、ValueDispositionDecision 非 advance 记录、AcceptedRisk、recheck 记录、v1b N7 failed trial 综合。不新建权威对象、不写入决策链。
- **4.2** 以 context packet 形态注入（走 T-112 context policy profile / packet hash / 压缩 / token 预算门）：v1a N6 与 v1b N6 的生成上下文（dedup：已否决候选 + 理由摘要）、v1b N8 的负面记忆输入（历史 reviewer risk / 否决理由）。
- **4.3** 边界：memory packet 是输入性材料（`payload_is_not_business_authority`），gate 不因 memory 内容直接 block；N6/N8 的政策如需"与历史重复"告警，走既有 warning_codes 机制由确定性校验器判定。
- **AC**：投影正确性单测（来源对象齐全性、title-card 范围隔离、空历史降级）；packet hash 稳定性测试；e2e——预置被否决候选后跑 N6，断言上下文 packet 含该候选且生成结果触发 dedup warning；token 超预算时压缩路径覆盖；全链回归绿。

## Phase 5 — 复杂度治理（M5，5.1 需 D3 联合决策）
- **5.1** harness service 拆分：11 个节点 runner 各自成文件（`topic-selection-v1b-harness-runners/n*.ts`），harness 壳保留生命周期 8 步与持久化；**纯机械重构，行为不变**。
- **5.2** 压缩策略 profile 化（compression strategy 进 context policy profile 可选字段）+ per-provider token 估计函数（openai/dashscope/deepseek 各一，保守估计为 fallback）。
- **5.3** 代码审查遗留清理（2026-06-12 /code-review high 的 #3~#7，详见 `03-implementation-notes.md` §审查记录）：
  - gateway 的 topic-selection invocation 校验上提为通用注入式 policy 钩子（消除共享层领域特例）；
  - 抽取共享 `resolveProjectionArtifact(kindPredicate, validator)`，收编三份同构 artifact 解析器（N7 loopback / N6 gate-failure / decision-memory）；
  - N6 的 memory packet 解析收敛为 loaded-context 阶段一次（gate 与 runtime 共用）；
  - model-profile registry 的 `validateRegistry` 结果按 registry hash 缓存（每 resolveProfile 全量 AJV → 一次）；
  - 投影 S5 的 per-set 查询 Promise.all 并行 + 截断前避免全量物化。
- **AC**：拆分前后 `apps/backend` v1b 全套件 + `topic-selection:v1a-harness-replay-smoke` + replay 幂等对比（同输入同 replay key 同结果）全绿；估计函数单测（样本载荷、与保守估计的误差界断言）；`pnpm typecheck` 0 error。
