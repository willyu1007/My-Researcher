# 02 Architecture

## 分层不变量（本任务包不动的东西）
- `invokeNode` 生命周期（8 步校验 + replay + route_decision）语义不变；所有 byte-bearing 哈希（`frozen_input_hash` / `execution_spec_hash` / `gate_result_hash` / `route_hash` / runtime_admission / 11 个 authority hash / `node_replay_key`）组成规则不变——W-12 机械重构、W-07 加法接入均须 replay byte-identity 保持。
- v1a/v1b/v1c 授权契约与决策链语义不变；**T-108 v1c 前向唯一不变量不变**（W-08 仅建议性发射）。
- DMP-10 单路径：唯一 debate 运行时（共享 debate-core）、唯一 LLM 调用路径、唯一 hash 实现（canonicalHash）；W-07 N6 debate 复用共享 core，不建第二套。
- T-115 人审兼容不变量：human_delegated 单写入口、产出同一 authority artifact、N7/N8/N9/N10 只读正确——W-10 仅文档化与 UX 打磨，不改写入语义。
- Decision Memory 为输入性上下文，gate 不因 memory 内容直接 block。

## 后端夯实与鲁棒性（Phase 0/1）
### Coordinator 故障恢复（W-04，`topic-selection-v1b-run-coordinator-service.ts`）
- 现状：Scheme-B per-run mutex + inFlight tracking（Phase 2 已修 10 项 high）；残留缺口在边界态返回裸 500 而非结构化 halt。
- 加法点（防御性，零既有 happy-path 改动）：
  - feedback pre-flight：`loopback.authority_ref/hash` 缺失 → 结构化 fail-fast（指名缺失工件）。
  - upstream-blocked：recipe 需上游 hash/ref 但上游非 ready → `halt('upstream_blocked')`。
  - timeout retry 指引：`node_timeout` halt 附 retry 建议。
  - 人审 nonce 守卫：N2/N5 路由 opt-in `X-Coordinator-Attempt-Nonce`。
- 边界（与 T-088 D6）：coordinator 是 harness 之上的新增层，不触碰 harness 本体——W-04 全在 coordinator 内，无需 D-record。
### N11 recipe（W-02）+ 准入单测（W-05）+ 卫生（W-03）
- W-02 在 coordinator `HANDOFF_BUILDER_TABLE` 补 N11 条目（coordinator 层，无 harness 触碰）。
- W-05 纯加测试，不改产品逻辑。
- W-03 去 `@deprecated` / 丰富消息 / 文档注记——只读 service + admission 消息串 + contracts 注释，零行为变化。
### N8 provisional 产品门禁（W-06）
- tripwire `n8_debate_thresholds_provisional`（harness 内既有 warning 发射）语义文档化为产品门禁；可选 production-gated 覆盖入口走 coordinator/route 层，不改 harness 阈值判定。阈值仍为 contracts 数据层（`node_policy.debate_trigger_thresholds`），W-13（延期）达标前不翻 → 门禁全程保留。

## 复杂度治理 / 选项 A：harness 一次拆透（Phase 2，承 D-T123-03，**提前至 B 之前**）
- W-12 续推 F-11 拆分：parse-and-resolve 簇 → hash-authority 簇（`hashContext` 外 ~11 个 authority hash 纯计算）→ ref/issue builder 簇，逐字搬迁为 module 级函数（无 `this`）+ 差分核验 + N1 golden replay-identity 守卫 + 逐 slice 全套件对比。**本期一次拆透（b1）**:harness 壳仅余生命周期 8 步 + 持久化。T-123 的 3 处 5.3 harness-body parser 合并并入。
- **次序理由**:拆透置于 B 之前,使 N6 debate 的 gate/准入（W-07 步骤 g）落在已模块化结构里,避免往 12.9k 行巨石堆料,且后续开发更顺。
- **D-T127-01（proposed → locked，登记 T-088 `06-joint-decisions.md`）**:承 D-T123-03 的续推说明（slice 边界 + 守卫承袭 + 一次拆透至壳）。harness 本体属 T-088 D-02 边界,按 D6 治理；纯机械、零行为/契约改动。

## 能力扩展 / 选项 B（Phase 3，依赖 Phase 2 拆透完成）
### v1b N6 有界对抗 debate 完整运行时（W-07，full runtime a–i，D-T127-02 先行）
- 现状（reserved，DMP-03）：`debate_escalation` loopback target + `n6_loopback_triage` 支撑槽已预埋；scenario / runtime / trigger 未定义,触发即 blocked（honest failure,operator 见"建议 debate"但 run 停住）。
- **做完整运行时**（非半成品）——要让"候选弱→升级 debate→正常继续"真正可走,必须 a–i 全做:
  - 原语:生成型任务,倾向 divergent_loop（explorer 探不同 framing → critic 挑战 → arbiter 综合子集）;亦可 bounded_sequence（复用 v1c N2 / v1b N8 范式）。最终原语在 3.1 设计阶段定。
  - 角色/触发/profile:见 `01-plan.md` 3.1–3.2;触发信号复用既有 N6 blocker 码（`weak_topic_question_candidate_set` / `duplicate_or_overlapping_candidates`）。
  - harness 接入（落在 Phase 2 拆透后的模块化结构）:triage `debate_escalation=true` → 运行时（harness 外共享 core + N6 builder）→ synthesizer draft → N6 gate 准入 → **正常继续**（加法编码,镜像 N8 gate-bridge 模式）。
- **D-T127-02（proposed → locked，登记 T-088 `06-joint-decisions.md`）**:N6 debate 对（已拆透的）harness 的加法式改动（gate/准入接入）+ scenario/profile 注册;不改 `invokeNode` 生命周期 / replay key / route edges 集合;协调 T-089 节点分类（N6 `debate_primitive` reserved → implemented）。冲突面:纯加法、与 T-088 runtime primitives 不重叠。
### v1c recheck 建议性发射（W-08，T-108 边界）
- T-108 锁 v1c 前向唯一、拒绝 recheck 回环。本项**不建回环**——v1c downstream-feedback 节点（`topic-selection.v1c.downstream-feedback-recheck`，现 record-only + typed loopback candidates）发射 recheck-request 的**建议性记录 + 排序信号**供上游 operator 参考。无新路由、无 escalation 触发、无 frozen-input 回流。回退 = 不发射。
### provider-diverse profile（W-09，DP-3.5 加法）
- DP-3.5 既有：4 角色槽 + 1 共享多 option model profile + per-role `model_option_id` 覆盖。本项补命名 execution plan（slot_overrides 映射 provider-specific option）：codex_assisted / provider-compact / provider-diverse。纯加法、不改既有 profile、不引入独立 per-role profile（未来可纯加法升级）。**若动共享 model-profile registry 需与 T-124 JD 协调（T-123 关闭后协调对象转本包）。**

## 工作台产品化收口 / 选项 C（Phase 4）
- 现状（ground-truth 2026-06-16）：人审面已建成且 e2e 绿——v1b N2 `ResearchConstraintProfileCard` / N5 `SliceOptionSetCard`、v1a N8 `ValidatedNeedDecisionCard`、v1c N4 `HumanPromotionDecisionCard`（10 决策 + 决策支撑钻取）；HTTP surface 完整；N7/N9/N10 只读正确。
- W-10：收口审计（对 `topic-workbench-ui-vs-flow-gaps` 逐条核）+ 只读节点注释 + gate 拒绝 UX 打磨。
- W-11：`n4_handoff_hash` 数据迁移（旧 option-set backfill，消除 409）——数据层脚本，无代码行为改动。
- 延期（非本包,D5）：HumanOverride 写面 / Trace-snapshot 抽屉。

## 阈值标定 / 选项 D（Phase 5，延期尾巴，record-and-defer）
- W-13 现状:真实标注语料暂不可得;**mock 无法标定真阈值**（fixture 同分 → 循环喂分,只能 dry-run 自检工具链）。
- **record-and-defer**:显式登记"真标定阻塞于语料";N8 维持 `provisional` + tripwire（W-06 门禁保留）;scaffold（W-01 落地）就绪。语料就绪后:走 contracts 数据层标定 T1/T3,达标（≥100 多 provider 标注 + 误报 <5%）方撤 provisional。离线工具,零产品阻断。

## 关键风险
| 风险 | 缓解 | 解决 Phase |
| --- | --- | --- |
| W-12 拆分破 replay 哈希 | D-T123-03 范式 + N1 golden 守卫 + 逐 slice 对比；D-T127-01 先行 | Phase 2 |
| W-07 N6 debate 触碰 harness（D6） | D-T127-02 先行 + 加法接入（落已拆透结构）+ replay 守卫 | Phase 3 |
| W-08 越界做成回环（违 T-108） | D2 record-only + T-108 回归 AC + review 核对 | Phase 3 |
| W-01 误提交并行 session 文件 | 显式路径 `git add` + 提交前排除清单核对 | Phase 0 |
| W-09 动共享 registry 撞 T-124 | 改前与 T-124 JD 协调 | Phase 3 |
| W-13 无语料被迫定阈值 / mock 充真阈值 | record-and-defer + mock 仅 dry-run + 不达标维持 provisional | Phase 5 |

## 与 T-088 / T-089 / T-108 / T-124 的边界
- **T-088（D6）**：W-12（拆分）、W-07（N6 准入/gate）触碰 harness 本体，先在 `06-joint-decisions.md` 登记 D-T127-01 / D-T127-02。W-04 coordinator 补强不触碰 harness、无需 JD。
- **T-089**：N6 debate 节点分类是 T-089 边界；W-07 实装 scenario 须协调 T-089 并在其 `03-implementation-notes.md` 留痕，矩阵 SSOT（`docs/context/process/topic-selection-workflow-matrix.md` §147「需另立任务」已指向本包 W-07）N6 行 reserved→implemented。
- **T-108（immutable）**：v1c 前向唯一不可破；W-08 仅建议性发射。
- **T-124（in-progress）**：共享 orchestrator / model-profile registry / decision-memory；W-09 若动共享 registry 需 JD 协调。**T-123 关闭后,共享面后续改动的协调对象由 T-123 转为本包**（T-124 文档现仍写「coordinates with T-123」,属其包维护范围,待其 session 同步）。
- **T-115（immutable）**：human_delegated 人审契约不可改；W-10 仅文档化 + UX。

## 边界外提示（不在本包做）
- 不放松 T-108 v1c 前向唯一（如需另起政策复审）。
- 不建工作台 HumanOverride / Trace 抽屉（延期）。
- 不做 literature / paper-implementation 模块工作（T-122/T-124/T-125/T-126 边界）。
- 不翻 N8 provisional 阈值直到 W-13 真实语料达标（且不以 mock 充真阈值）。
