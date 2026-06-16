# 01 Plan

## Phase 依赖关系（2026-06-16 对齐后相位序）
```
Phase 0 (M0 夯实) ──► Phase 1 (M1 鲁棒性) ──► Phase 2 (M2 拆透 harness / 选项 A)
                                                    │
                                                    └──► Phase 3 (M3 选项 B：N6 full + recheck + provider-diverse)
                                                             │
                                                             └──► Phase 4 (M4 选项 C 工作台收口)   ← 核心段终点 (sign-off)
                                                                      ┊
                                                                      └┄► Phase 5 (M5 选项 D 标定，延期尾巴，不阻塞核心)
```
- 用户对齐次序:**先夯实后端 → 拆透 harness（A）→ B → C → D**。**拆透提前到 B 之前**:N6 debate 的 harness 接入落在已模块化代码里。
- 两段验收:**核心 = Phase 0–4**;**尾巴 = Phase 5（D 标定 record-and-defer,语料门控）**。
- W-12（拆分）/ W-07（N6 debate）触碰 harness 本体——动代码前先在 T-088 `06-joint-decisions.md` 登记 D-T127-NN（D6）。
- 每个 Phase 收口时:更新 `03-implementation-notes.md`、`04-verification.md`,状态变化更新 `00-overview.md`。

---

## Phase 0 — 后端夯实（M0,核心）
- **0.1（W-01）落地 T-123 工作树残留**:`git add` 仅 F-10 estimator/budget-gate 改动 + 6 个 `topic-selection-v1b-n8-calibration-*.ts(+.unit.test.ts)` + `evidence/f10-token-calibration/` + `evidence/dp33-n8-threshold-calibration/`;逐文件确认排除并行 session 文件（`paper-implementation-*`、`literature-*`、`topic-selection-v1b-human-review-path/00-overview.md`、`title-card-management-contracts.schema.test.ts`、`.ai/project/main/registry.yaml` 的并行 timestamp 行）。提交后 backend 套件 + tsc 复跑确认绿。
- **0.2（W-02）N11 handoff recipe**:核 `contracts.ts` N11 `execution_kind`;若 deterministic gate → `HANDOFF_BUILDER_TABLE` 补 `n11` 条目（`handoff_hash_key: 'n10_handoff_hash'`）;coordinator `advanceLocked()` 加 N11 穿越单测。
- **0.3（W-03）代码卫生**:① 三处只读 service 去 `@deprecated` + 加 DMP-10 单路径注释;② 5 处 admission `legacy_unverified` 拒绝消息补根因/恢复指引（可选新错误码 `LEGACY_ARTIFACT_REQUIRES_V1B_INTAKE`）;③ decision-memory packet 持久化/查询路径文档注记进 contracts。
- **AC**:工作树仅剩并行 session 文件（T-127/T-123 残留清零）;N11 穿越单测绿;卫生改动零行为变化、grep 确认无生成方法的测试引用、backend 套件 + tsc 双绿。

## Phase 1 — 后端鲁棒性（M1,核心）
- **1.1（W-04）Coordinator 故障恢复**:feedback 工件 pre-flight 校验、upstream-blocked 检测、node_timeout retry 指引、人审 nonce 守卫（详见 `02-architecture.md`）。全在 coordinator 层,不触碰 harness。
- **1.2（W-05）准入/运行时单测补齐**:~12 个无独立单测 service,按优先级（admission-common → N6 draft admission → N8 admission → runtime services）每个补 `legacy_unverified` 拒绝 + happy path;N6 补 dedup warning 码断言、N8 补阈值应用 + provisional tripwire 交互。
- **1.3（W-06）N8 provisional 产品门禁形式化**:tripwire 语义文档化为"warning 不阻断、但需 stakeholder sign-off 记录方可推进真实选题过 N8";可选 production-gated 覆盖入口;**不翻 `provisional:false`、不撤 tripwire**（W-13 延期 → 门禁全程保留）。
- **AC**:三类故障恢复负例覆盖且返回结构化 halt;nonce 守卫负例;~12 service 单测达标;backend 套件无回归、tsc 0。

## Phase 2 — 复杂度治理 / 选项 A：harness 一次拆透（M2,核心,承 D-T123-03）
- **2.0（W-12 前置）登记 D-T127-01**:在 T-088 `06-joint-decisions.md` 登记拆分续推（承 D-T123-03 的 slice 边界 + replay-identity 守卫承袭说明,一次拆透至壳）。
- **2.1（W-12）续抽纯函数簇**:parse-and-resolve 簇（`parseN*` + `resolveN*Payload` / `resolveN7SupportContext` / `resolveEarlySemanticSupportPayload`）→ hash-authority 簇（`hashContext` 外 ~11 个 `hashN*Authority` + ref builder + `outcomeGateResultHash` 纯计算部分）→ ref/issue builder 簇;逐字搬迁为 module 级函数（无 `this`）,调用点逐字替换。T-123 的 3 处 5.3 harness-body parser 合并并入。
- **2.2（W-12）逐 slice 守卫 + 一次拆透**:每 slice 前后 replay-identity 守卫（N1 golden 哈希）+ 全套件 + replay 幂等对比保持绿;**本期拆至 harness 壳仅余生命周期 8 步 + 持久化**(b1,不留长尾)。
- **AC**:拆分前后 v1b 全套件 + `topic-selection:v1a-harness-replay-smoke` + replay 幂等对比全绿;`pnpm typecheck` 0;harness 类对外契约不变;harness 行数显著下降、纯函数簇出文件。

## Phase 3 — 能力扩展 / 选项 B（M3,核心,依赖 Phase 2 拆透完成）
- **3.0（W-07 前置）登记 D-T127-02**:在 T-088 `06-joint-decisions.md` 登记 N6 debate 对（已拆透的）harness 的加法式改动 + scenario 注册,协调 T-089 节点分类（N6 `debate_primitive` reserved → 实装）。
- **3.1（W-07）N6 debate 设计（a–e）**:决定原语（生成型任务倾向 divergent_loop,亦可 bounded_sequence）;定义 2–4 角色 + 质量目标 + normalized params + allowed_executor_kinds;量化触发阈值（复用 `weak_topic_question_candidate_set` / `duplicate_or_overlapping_candidates`）。
- **3.2（W-07）N6 debate 实装（f–i,full runtime）**:scenario 注册（`topic-selection-debate-scenario-contracts.ts` 加 N6 条目）;profile 注册（DP-3.5 共享多 option + per-role 覆盖）;运行时 service（复用共享 debate-core,注入 N6 strategy）;harness 准入/gate 加法接入（triage `debate_escalation=true` → 运行时 → synthesizer → gate 准入 → **正常继续**,镜像 N8 gate-bridge 模式,落在 Phase 2 拆透后的模块化结构）;矩阵 N6 行 `reserved → implemented` + T-089 留痕。
- **3.3（W-08）v1c recheck 建议性发射**:v1c downstream-feedback 节点发射 recheck-request 建议性记录 + 排序信号（record-only,typed loopback candidates 已存在）;**不新增回环路由、不改 T-108 前向唯一**。
- **3.4（W-09）provider-diverse profile**:把 DP-3.5 共享 model profile 的 per-role `model_option_id` 覆盖补成命名 execution plan（codex_assisted / provider-compact / provider-diverse）;纯加法。若动共享 model-profile registry 先与 T-124 JD 协调。
- **AC**:N6 触发器单测全分支 + mocked debate e2e 绿（含触发后正常继续）+ 不触发回归不变 + replay byte-identity 保持 + D-T127-02 登记 + 矩阵/T-089 留痕;v1c recheck 单测 + **T-108 前向唯一回归绿**;provider-diverse profile 解析单测 + debate byte-identity 不变。

## Phase 4 — 工作台产品化收口 / 选项 C（M4,核心,核心段终点）
- **4.1（W-10）收口审计 + 文档化**:逐条核对 `topic-workbench-ui-vs-flow-gaps` 审计注记 vs 现状（人审面已建成结论）;N7/N9/N10 只读语义补代码注释（mechanical/deterministic）;gate 拒绝 UX 可选增量。
- **4.2（W-11）`n4_handoff_hash` 数据迁移**:backfill 脚本为旧 option-set 的 `comparison_payload.n4_handoff_hash` 补值（或重跑 N4）;脚本幂等、可重跑;迁移后旧 option-set 人审 N5 选择不再 409。
- **AC**:审计条目逐条结论;只读注释落地;迁移脚本对样本旧 option-set 验证消除 409;desktop typecheck + UI gate 0/0;人审 N2/N5 e2e 回归绿。**→ 核心段 sign-off。**

## Phase 5 — 阈值标定 / 选项 D（M5,延期尾巴,不阻塞核心 sign-off）
- **5.1（W-13）record-and-defer 登记**:真实标注语料暂不可得;显式登记"W-13 真标定阻塞于语料"。scaffold（analysis/materializer/runner,W-01 已落地）就绪可用。
- **5.2（W-13,可选）mock dry-run 自检**:用 mock 语料跑一次 runner 端到端,**仅验证工具链不报错,不产出/采纳阈值**（mock 喂分循环,无法标定真阈值）。
- **5.3（W-13,语料就绪后）统计标定**:真实语料（clear-advance / borderline / clear-refine / dimension-conflict × 3 provider）采集持久化 `TopicValueAssessmentDraft`;分析 (total_score, confidence, dimension_spread, single-dim floor) 分布,标定 T1/T3;达标（≥100 多 provider 标注样本 + 误报率 <5%）后方可 `provisional:false` + 撤 tripwire（解除 W-06 门禁）。
- **AC**:标定姿态登记 record-and-defer;N8 维持 provisional + tripwire;不达标维持现状（零产品风险）;真标定走 contracts 数据层 + 达标证据记 `04-verification.md`。

## Risks & Mitigations
| 风险 | 缓解 |
| --- | --- |
| W-12 拆分引入哈希漂移（破 replay） | 承 D-T123-03 范式:逐字搬迁 + 差分核验 + N1 golden 守卫 + 逐 slice 全套件;D-T127-01 先行 |
| W-07 N6 debate 触碰 harness（D6 敏感） | D-T127-02 先行登记;加法式接入（落在已拆透结构）;replay byte-identity 守卫;矩阵/T-089 协调 |
| W-08 误把"建议性发射"做成真实回环（违 T-108） | D2 明确 record-only;AC 含 T-108 前向唯一回归;review gate 核对无新回环路由 |
| W-01 误提交并行 session 文件 | 显式路径 `git add` + 提交前 `git status` 核对排除清单 |
| W-09 动共享 registry 撞 T-124 | 改前与 T-124 JD 协调（T-123 关闭后协调对象转本包） |
| W-13 无语料被迫定阈值 / mock 充真阈值 | record-and-defer;mock 仅 dry-run;不达标维持 provisional |
