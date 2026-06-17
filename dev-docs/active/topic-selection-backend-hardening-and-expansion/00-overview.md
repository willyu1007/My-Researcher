# 00 Overview

## Status
- State: in-progress（Phase 0–1 / M0–M1 已收口 2026-06-16；**Phase 2 / W-12 进行中** 2026-06-17——D-T127-01 已登记 + hash-authority 簇已抽 N8/N9/N10 + N7/N5〔harness 12898→12753，golden 守卫绿〕；含一次对抗式质量评审〔0 确认缺陷〕）
- Progress: **任务包创建 + 顶层决策对齐（2026-06-16）**——承接 T-123（选题管理产品化加固）**收尾关闭后移交**的 F-11 拆分线、DP-3.3 标定线，并新建本伞型包统一推进。**用户对齐的修订相位序：先夯实后端 → 拆透 harness（选项 A）→ 选项 B（能力扩展）→ 选项 C（工作台收口）→ 选项 D（N8 标定，延期）**。工作项 W-01..W-13 见下；顶层决策 D1..D6 经 2026-06-16 两轮对齐锁定。状态盘点基于 2026-06-16 全链 ground-truth 调查（backend-solidity / Option-B / Option-C / 约定与依赖四路并行）。**Phase 0（M0）已于 2026-06-16 收口**：W-01 残留落地（commit `bfe5ae31`）、W-02 N11 终端穿越单测、W-03 ②/③ 代码卫生；其中 W-02/W-03 经代码核验**重定标**（W-02 N11 条目实已存在、W-03 ① moot，详见 03/04）。**Phase 1（M1）亦于 2026-06-16 收口**：W-04 coordinator 故障恢复（`upstream_blocked`/`feedback_artifact_missing` 结构化 halt + 人审 nonce 守卫；timeout 指引核验已存在）、W-05 12 个 admission/runtime service 单测（66/0）、W-06 N8 provisional 产品门禁形式化（`N8_DEBATE_THRESHOLDS_PROVISIONAL_PRODUCT_GATE`）。基线 backend 1402/0/35、shared 256/0、tsc 0。Phase 2+ 待开工。
- Task ID: `T-127`
- Feature / Milestone / Requirement: `F-001` / `M-001` / `R-009`
- Depends on / 承接: `T-123`（topic-selection-productization-hardening，**done，已关闭归档**——其 F-11 拆分线与 DP-3.3 标定线**所有权移交本包 W-12 / W-13**；本包复用其 coordinator / debate-core / decision-memory / token-estimator / 校准 scaffold）；`T-088`（workflow-runtime-foundation，in-progress——凡触碰 harness 本体的改动按 D6 先在 `06-joint-decisions.md` 登记联合决策）
- Writes into: `T-089`（agent-workflow-review）的 `docs/context/process/topic-selection-workflow-matrix.md` 矩阵 SSOT——W-07 把 v1b N6 debate 由 `reserved` 实装为 full runtime（`debate_primitive` 落定），须与 T-089 节点分类协调并留痕（矩阵 §147 的"需另立任务"指向本包 W-07）
- Coordinates with: `T-124`（paper-implementation-productization-hardening，in-progress——共享 orchestrator / model-profile registry / decision-memory；W-09 provider-diverse profiles 若动共享 registry 需 JD 协调。注：T-123 关闭后,共享面后续改动的协调对象由 T-123 转为本包）
- Reuses: `T-112`（llm-context-cache-runtime）的 context policy profile / packet hash / 压缩 / token 预算；`T-115` 确立的人审兼容不变量（human_delegated 单写入口，**不可变**）；`T-123` 已交付的共享 debate 骨架 core / Run Coordinator / Decision Memory 投影 / per-provider token 校准 / DP-3.3 标定 scaffold
- Trigger: 2026-06-16 在 T-123 收尾节点对"选题管理后端实际状态 + 后续规划"的复盘——用户要求先夯实后端、再按 A/B/C/D 次序推进，并新建一个完整治理任务包对齐 roadmap

## Goal
- 把选题管理后端从"产品可 run（T-123 已达成）"推进到"**产品可信赖**"：消除未落地的工作树残留与编排层故障恢复缺口、补齐准入层单测、明确 provisional 产品门禁语义（**夯实后端**）。
- 在稳固底座上**先把 12.9k 行 harness 一次拆透（选项 A）**——纯机械重构、行为/哈希不变,使本次与后续开发都落在清晰可维护的模块结构里,避免在巨石上堆料。
- 在干净 harness 上做**能力扩展（选项 B）**:实装 v1b N6 有界对抗 debate 的**完整运行时**（full runtime,触发→真跑→准入→继续）、v1c 反馈触发 recheck 的**建议性发射**（不破坏 T-108 前向唯一）、provider-diverse debate 角色 profile（加法）。
- 完成**工作台产品化收口（选项 C）**:只读节点文档化、`n4_handoff_hash` 数据迁移、gate 拒绝 UX 打磨（深度督查 HumanOverride/Trace 抽屉**延期**）。
- **阈值标定（选项 D,延期尾巴）**:真实语料暂不可得,**record-and-defer**——N8 维持 provisional + 签核门,scaffold 就绪,待语料再标定。
- 每项交付配齐完备测试（单测 / 集成 / 全链 e2e / 故障注入负例 / 不变量回归 / replay byte-identity 守卫）。

## Work Items（本任务包的工作清单,as-scoped 2026-06-16；W-ID 稳定,相位为对齐后次序）
### Phase 0 — 后端夯实（M0,核心段）
- **W-01 落地 T-123 工作树残留**:提交当前未落地的 F-10 per-provider token estimator / budget-gate 改动 + 6 个未跟踪的 DP-3.3 标定 scaffold 文件（`topic-selection-v1b-n8-calibration-{analysis,materializer,runner}.ts(+.unit.test.ts)`）+ 其 `evidence/` 证据目录。提交**必须排除**并行 session 文件（`paper-implementation-*`、`literature-*`、`topic-selection-v1b-human-review-path/00-overview.md`、`title-card-management-contracts.schema.test.ts`、`registry.yaml` 的并行 timestamp 改动）。
- **W-02 校验 N11 handoff recipe**:coordinator `HANDOFF_BUILDER_TABLE` 经核 N11 条目缺失。确认 N11（`package-topic.v1b`）执行类,若为 deterministic gate 补 `handoff_hash_key: 'n10_handoff_hash'` 最小条目并加 advance() 穿越单测;若 model-like 则补完整 recipe。 **【实施修正 2026-06-16，done】** 经核 N11 条目实际已存在（`topic-selection-v1b-run-coordinator-service.ts:156-158`，N11 为 deterministic、覆盖断言 164-169 通过）——"条目缺失"前提作废；W-02 落地 = 仅补 N11 终端穿越单测（coordinator 16/0）。
- **W-03 代码卫生收口**:① 移除三处只读投影 service 的 `@deprecated` 双轨标记并加澄清注释（`research-slice` / `topic-question` / `value-assessment` service,生成路径已于 T-123 Phase 1.1 删除,DMP-10 单路径）;② 丰富 5 处 admission 的 `legacy_unverified` 拒绝消息（指明 v1a→v1b 须经 N1 intake、不可直接复用 v1a 工件）;③ 为 decision-memory packet 持久化/查询路径补 SSOT 文档注记。 **【实施修正 2026-06-16，done】** ① **moot**（全 topic-selection service 无 `@deprecated`、三件套已于 T-123 P1.1 随生成路径删除）；②实为 **6 处** admission（含 n6-loopback-triage）已丰富、错误码不变（零行为变化）；③ 已写入 `topic-selection-decision-memory-packet-contracts.ts`。

### Phase 1 — 后端鲁棒性（M1,核心段）
- **W-04 Coordinator 故障恢复补强**:① feedback 工件 pre-flight 校验（`loopback.authority_ref/hash` 缺失→明确报错而非 500）;② upstream-blocked 检测（recipe 需上游 hash/ref 但上游 blocked/replayed → `halt('upstream_blocked')` 而非 500 'missing lineage'）;③ node_timeout halt 附带 retry 指引;④ 人审路由 node_attempt nonce 守卫。
- **W-05 准入/运行时 service 单测补齐**:~12 个无独立单测的 v1b admission/runtime service,每个至少补 ① `legacy_unverified` 拒绝门 + ② 1 条 happy path;N6 draft admission 补 dedup warning 码、N8 admission 补阈值应用 + provisional tripwire 交互。
- **W-06 N8 provisional 阈值产品门禁形式化**:把 `n8_debate_thresholds_provisional` tripwire 明确为**产品门禁语义**（warning 不阻断执行,但需显式 stakeholder sign-off 记录方可推进真实选题过 N8）;可选 production-gated 覆盖入口,**不翻 `provisional:false`、不撤 tripwire**（需 W-13 标定证据,而 W-13 延期 → 本门禁在整个包期间保留）。

### Phase 2 — 复杂度治理 / 选项 A：harness 一次拆透（M2,核心段,承 D-T123-03）
- **W-12 harness 单文件拆分（一次拆透,b1）**:承 D-T123-03 与已交付 slice 1（dedup utils）,**一次性**续抽 parse-and-resolve 簇、hash-authority 簇（`hashContext` 外 ~11 个 authority hash 纯计算部分）、ref/issue builder 簇,直至 harness 壳仅保留生命周期 8 步 + 持久化——逐字搬迁 + 差分核验,每 slice 前后 replay-identity 守卫（N1 golden 哈希）+ 全套件保持绿;T-123 的 3 处 5.3 harness-body parser 合并并入。**置于 B 之前**:后续 N6 debate 的 gate/准入（W-07 步骤 g）落在已模块化结构里,避免往巨石堆料。需登记 D-T127-01（承 D-T123-03 的续推说明）。

### Phase 3 — 能力扩展 / 选项 B（M3,核心段）
- **W-07 v1b N6 有界对抗 debate 完整运行时（full runtime,a–i,D-T127-02 先行）**:现 infra 已预埋（`debate_escalation` loopback target + `n6_loopback_triage` 支撑槽）但 scenario 未定义、触发即 blocked（DMP-03）。**做完整运行时**——非半成品:a 决定原语（divergent_loop vs bounded_sequence）、b 角色/质量目标、c scenario 注册（`topic-selection-debate-scenario-contracts.ts`）、d profile 注册（DP-3.5 形态）、e 触发阈值（复用 `weak_topic_question_candidate_set` / `duplicate_or_overlapping_candidates`）、f N6 运行时 service（复用共享 debate-core）、g harness 准入/gate 加法接入（triage escalation → 运行时 → synthesizer → gate 准入）、h 全链 e2e、i 矩阵 reserved→implemented + T-089 协调。落在 Phase 2 拆透后的干净 harness 上。**先登记 D-T127-02 再动 harness 本体。**
- **W-08 v1c 反馈触发 recheck 建议性发射**:T-108 锁 v1c **前向唯一**（明确拒绝 recheck 回环）。本项**不建真实 loopback**——仅在 v1c downstream-feedback 节点发射 recheck-request 的**建议性记录 + 排序信号**（record-only,供上游 operator 参考）,完全保留 T-108 前向唯一不变量。
- **W-09 provider-diverse debate 角色 profile（DP-3.5 加法）**:把 DP-3.5 既有"共享多 option model profile + per-role `model_option_id` 覆盖"补成可命名的 provider-diverse execution plan（codex_assisted / provider-compact / provider-diverse）,纯加法、不改既有 profile,不引入第二套 debate 实现。

### Phase 4 — 工作台产品化收口 / 选项 C（M4,核心段）
- **W-10 工作台收口审计 + 只读节点文档化**:复核 ground-truth 调查的"人审面已建成"结论对照 `topic-workbench-ui-vs-flow-gaps` 审计注记的全部条目;为 N7/N9/N10 只读语义补代码注释（mechanical/deterministic 原因,防后人误改）;gate 拒绝 UX 增量（可选:拉 trace 展示细化 blockers）。
- **W-11 `n4_handoff_hash` 数据迁移**:为 Phase-2 修复前缺 `comparison_payload.n4_handoff_hash` 的旧 option-set 做 backfill 脚本（或重跑 N4）,消除人审 N5 选择时的 409。

### Phase 5 — 阈值标定 / 选项 D（M5,**延期尾巴,不阻塞核心 sign-off**）
- **W-13 DP-3.3 N8 阈值标定执行（record-and-defer,语料门控）**:真实标注语料暂不可得;**mock 无法标定真阈值**（循环喂分,只能 dry-run 自检工具链）。故 **record-and-defer**——显式登记"阻塞于语料",N8 维持 `provisional` + tripwire（W-06 门禁保留）;可选一次 mock dry-run 验证 runner 端到端不报错。待真实语料（clear-advance / borderline / dimension-conflict × 3 provider,≥100 标注样本 + 误报率 <5%）就绪再标定 + 撤 provisional。

## Non-goals
- **不放松 T-108 v1c 前向唯一政策**——W-08 仅做建议性发射,不建 recheck 真实回环（如确需回环须另起 T-108 政策复审 + 新 JD,不在本包）。
- 不重新引入 v1b legacy direct-write 路由（`'legacy write routes are not registered'` 404 测试必须保持绿）。
- 不引入第二套 debate 运行时 / 第二条 LLM 调用路径 / 第二个 hash 实现（DMP-10 / canonicalHash 单源）;N6 debate 复用共享 debate-core。
- 不改 `invokeNode` 生命周期语义、replay key 组成、route edges 集合、既有 gate/blocker 语义;W-12 机械重构 + W-07 加法接入均经 D-record 登记且 replay byte-identity 保持。
- 不建工作台深度督查 surface（**HumanOverride 写面 / Trace-snapshot 抽屉延期**,非本包 C 收口范围）;不给 N8/N9/N10 加人审写入。
- 不让 memory/cache/compression 参与权威决策（Decision Memory 仍为输入性上下文）。
- **不在真实标注语料就绪前翻转 N8 provisional 阈值,也不以 mock 充当真阈值**（W-13 record-and-defer,维持 tripwire）。

## Decisions（2026-06-16 两轮对齐锁定）
- **D1 任务包形态 + 验收切分（locked）**:单一伞型 T-127;**两段验收**——核心段 = Phase 0–4（夯实 + 鲁棒性 + 拆透 + B + C）阻塞 sign-off;**延期尾巴 = Phase 5（选项 D 标定）不阻塞核心**。
- **D2 选项 B-2 范围（locked）**:v1c 反馈触发 recheck = **建议性发射 + 排序**（record-only）,**T-108 前向唯一保持不变**,不建回环。
- **D3 选项 B-1 深度（locked,2026-06-16 第二轮确认）**:做 **v1b N6 debate 完整运行时（full runtime,a–i）**。理由:要让"候选弱→升级 debate→正常继续"真正可走,必须 full runtime;spec-only 会留 escalation 死路或死能力,违"不留技术债务"。动 harness 前先登记 D-T127-02（协调 T-089 节点分类 + 矩阵实装）。
- **D4 选项 A 次序 + 范围（locked,2026-06-16 第二轮确认）**:harness **一次拆透（b1）,且提前到 Phase 2（B 之前）**。理由:干净 harness 让本次与后续开发更顺,N6 运行时落在模块化结构里。
- **D5 选项 C 范围（locked）**:工作台 = **收口 + 数据迁移**（只读节点文档化 + `n4_handoff_hash` backfill + gate 拒绝 UX 打磨）;HumanOverride / Trace 抽屉延期。
- **D6 harness-touch 治理（承袭 T-123 D3）**:凡触碰 `topic-selection-v1b-workflow-harness-service.ts` 本体的改动（W-12 拆分、W-07 N6 准入/gate）先在 T-088 `06-joint-decisions.md` 登记 D-T127-NN;均须 replay byte-identity 守卫保护,逐 slice / 逐改动全套件对比。
- **D7 T-123 关闭与移交（locked）**:T-123 收尾转 `done` 并归档,F-11（拆分）与 DP-3.3（标定）两条开口线**所有权移交本包 W-12 / W-13**;在 T-123 `03-implementation-notes.md` 与 T-088 `06-joint-decisions.md`（D-T123-03 续推指针）各留移交痕迹,避免双轨/漂移。
- **D8 选项 D 标定姿态（locked）**:**record-and-defer**——mock 不可标定真阈值,故显式登记阻塞于语料,N8 维持 provisional + 签核门直至真实语料达标。

## Acceptance Criteria (high level)
### 核心段（Phase 0–4,阻塞 sign-off）
- [ ] W-01..W-12 逐项关闭,每项在 `03-implementation-notes.md` 有条目与证据指针;工作树无 T-127/T-123 未落地残留（W-01 提交且排除并行 session 文件）。
- [ ] Coordinator 故障恢复三类边界（feedback 工件缺失、upstream-blocked、node_timeout retry 指引）有负例覆盖且返回结构化 halt 而非 500;人审 nonce 守卫拒陈旧重跑。
- [ ] ~12 个准入/运行时 service 各有 ≥1 `legacy_unverified` 拒绝 + 1 happy path 单测;backend 套件无回归。
- [ ] **harness 一次拆透**:每 slice 前后 replay-identity 守卫（N1 golden 哈希）+ 全套件 + replay 幂等对比全绿;harness 壳仅余生命周期 + 持久化;D-T127-01 登记。
- [ ] v1b N6 debate full runtime:触发器单测全分支;mocked debate e2e 绿（生成→escalation→debate→synthesizer→gate 准入→继续）;不触发时既有 N6 路径回归不变;D-T127-02 登记、矩阵 N6 行 reserved→implemented、T-089 留痕;harness 改动 replay byte-identity 保持。
- [ ] v1c recheck 建议性发射有单测;**T-108 前向唯一不变量回归绿**（无新回环路由、`topic-selection.v1c.downstream-feedback-recheck` 仍 record-only）。
- [ ] 工作台收口:N7/N9/N10 只读语义有注释;`n4_handoff_hash` backfill 后旧 option-set 人审 N5 不再 409;desktop typecheck + UI gate 0/0。
- [ ] 既有不变量回归:legacy 404、mocked product 拒绝、replay 幂等、v1b 人审 N2/N5 e2e、`pnpm typecheck` + desktop typecheck + UI gate 0/0。
### 延期尾巴（Phase 5,独立追踪,不阻塞核心）
- [ ] W-13 标定姿态登记为 record-and-defer;N8 维持 `provisional` + tripwire;scaffold 已由 W-01 落地;真实语料达标前不翻 `provisional:false`、不以 mock 充真阈值。
