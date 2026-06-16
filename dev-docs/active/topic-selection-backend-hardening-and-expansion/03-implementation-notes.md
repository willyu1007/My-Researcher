# 03 Implementation Notes

## Work Items 关闭追踪（相位为 2026-06-16 对齐后次序；W-ID 稳定）
| Work Item | Phase | 段 | Status | Evidence |
| --- | --- | --- | --- | --- |
| W-01 落地 T-123 工作树残留（F-10 estimator + DP-3.3 6-file scaffold + evidence/） | 0 | 核心 | done | 见 Phase 0 记录（backend 1332/0/35skip · shared 255/0 · tsc 0） |
| W-02 校验/补 N11 handoff recipe | 0 | 核心 | done | recipe 条目已在 `coordinator:156–158`；补 N11 终端穿越单测（N1..N11→stop_v1b_complete），coordinator 16/0 |
| W-03 代码卫生（去 @deprecated / legacy_unverified 消息 / memory 持久化注记） | 0 | 核心 | done | ① moot；② 6 处 admission legacy_unverified 消息已丰富（码不变）；③ decision-memory SSOT 注记入 contracts |
| W-04 Coordinator 故障恢复（feedback pre-flight / upstream-blocked / timeout 指引 / nonce 守卫） | 1 | 核心 | done | 见 Phase 1 记录（coordinator 19/0；upstream_blocked / feedback_artifact_missing / nonce 负例） |
| W-05 准入/运行时 service 单测补齐（~12） | 1 | 核心 | done | 12 个 service 各补单测，66/0（见 Phase 1 记录） |
| W-06 N8 provisional 阈值产品门禁形式化 | 1 | 核心 | done | `N8_DEBATE_THRESHOLDS_PROVISIONAL_PRODUCT_GATE` + 守卫单测（provisional 仍 true） |
| W-12 harness 单文件一次拆透（b1，承 D-T123-03，D-T127-01） | 2 | 核心 | planned | 待 |
| W-07 v1b N6 有界对抗 debate 完整运行时（full a–i，D-T127-02） | 3 | 核心 | planned | 待 |
| W-08 v1c 反馈触发 recheck 建议性发射（record-only，T-108 保持） | 3 | 核心 | planned | 待 |
| W-09 provider-diverse debate 角色 profile（DP-3.5 加法） | 3 | 核心 | planned | 待 |
| W-10 工作台收口审计 + 只读节点文档化 | 4 | 核心 | planned | 待 |
| W-11 `n4_handoff_hash` 数据迁移 | 4 | 核心 | planned | 待 |
| W-13 DP-3.3 N8 阈值标定（record-and-defer，语料门控） | 5 | **延期尾巴** | planned | 待 |

## 决策记录
### 2026-06-16 顶层决策（用户两轮对齐锁定）
- **D1 任务包形态 + 验收切分（locked）**：单一伞型 T-127；两段验收——核心段 = Phase 0–4 阻塞 sign-off，延期尾巴 = Phase 5（选项 D）不阻塞核心。
- **D2 选项 B-2 范围（locked）**：v1c recheck = 建议性发射 + 排序（record-only），T-108 前向唯一保持。
- **D3 选项 B-1 深度（locked，第二轮确认）**：v1b N6 debate 做**完整运行时（full a–i）**——要让"候选弱→升级 debate→正常继续"真正可走必须 full runtime，spec-only 留死路/死能力，违"不留技术债务"。动 harness 前登记 D-T127-02（协调 T-089）。
- **D4 选项 A 次序 + 范围（locked，第二轮确认）**：harness **一次拆透（b1），提前到 Phase 2（B 之前）**——干净 harness 让本次与后续开发更顺，N6 运行时落在模块化结构。登记 D-T127-01。
- **D5 选项 C 范围（locked）**：工作台 = 收口 + 数据迁移；HumanOverride / Trace 抽屉延期。
- **D6 harness-touch 治理（承 T-123 D3）**：W-12 / W-07 触碰 harness 本体先登记 D-T127-NN（W-12=01，W-07=02）；均须 replay byte-identity 守卫。
- **D7 T-123 关闭与移交（locked）**：T-123 转 done 归档，F-11 / DP-3.3 所有权移交本包 W-12 / W-13；T-123 `03-implementation-notes.md` + T-088 D-T123-03 续推指针各留痕，避免双轨/漂移。
- **D8 选项 D 标定姿态（locked）**：record-and-defer——mock 不可标定真阈值（循环喂分），故显式登记阻塞于语料，N8 维持 provisional + 签核门直至真实语料达标。
- 依据：2026-06-16 全链 ground-truth 调查（backend-solidity / Option-B / Option-C / 约定与依赖四路）——结论摘要：① 后端残留 6 未跟踪 scaffold + F-10 改动未落地、coordinator 边界态裸 500、~12 准入 service 无单测、N11 recipe 疑缺、provisional 仅 warning；② N6 debate reserved（infra 预埋、scenario 未定义、DMP-03 触发即 blocked），v1c recheck record-only（T-108 锁前向唯一），provider-diverse 为 DP-3.5 加法位；③ 工作台人审面已建成且 e2e 绿，真实缺口为 `n4_handoff_hash` 数据迁移 + 只读文档化（HumanOverride/Trace 延期）；④ 约定：next id T-127、文件集与 D-record 格式承 T-123/T-115/T-088。

## Phase 实施记录
> 各 Phase 收口时在此追加：变更摘要、关键决策、测试证据（套件名 + 计数 + commit hash）、延期项与理由。

### Phase 0 — 后端夯实（已完成 2026-06-16）

**W-01 落地 T-123 工作树残留 — done（2026-06-16）**
- 提交内容（path-scoped，**未用 `git add -A`**）：F-10 `topic-selection-conservative-token-estimator-service`(+test) / `topic-selection-token-budget-gate-service`(+test)；DP-3.3 6-file scaffold `topic-selection-v1b-n8-calibration-{analysis,materializer,runner}`(+test)；comment-only `topic-selection-v1b-workflow-harness-contracts.ts`（仅追加 N8 provisional 说明注释，常量未变）；T-123 闭包文档 `04-verification.md` / `07-phase3-debate-skeleton-spec.md` + `evidence/{f10-token-calibration,dp33-n8-threshold-calibration}/`（2 个 `*.tokenizer.json` 受 `.gitignore` 自动排除）。
- 排除（并行 session，未提交）：`paper-implementation-runtime-orchestration-hardening/*`、`topic-selection-v1b-human-review-path/00-overview.md`、`title-card-management-contracts.schema.test.ts`、`adaptive-llm-systems-*` T-126 artifacts、`literature-*`、`paper-implementation-productization-hardening/`。
- 回归证据：backend 全套件 **1332 pass / 0 fail / 35 skip**（与基线吻合）、shared **255/0**、backend+shared `tsc --noEmit` **0**；W-01 文件单测 **32/0**、coordinator 单测 **47/0**。
- 核验副产物（**重定标**，待对应 W 项落地）：
  - **W-02** — coordinator `HANDOFF_BUILDER_TABLE` 的 N11（`topic-selection.v1b.publish-v1c-input-bundle.v1` → `handoff_hash_key:'n10_handoff_hash'`）条目**已存在**（行 156–158），且模块加载覆盖断言（行 164–169）通过；§30 调查里"N11 recipe 疑缺"前提作废。W-02 实际只剩 `advanceLocked()` 的 **N11 终端穿越单测**（当前测试无 `run_complete=true` / `stop_v1b_complete` 终端断言）。
  - **W-03 ①** — 全 topic-selection service `@deprecated` 计数为 **0**，`research-slice`/`topic-question`/`value-assessment` 只读投影三件套已于 T-123 Phase 1.1 随生成路径删除 → W-03 ① **moot**；仅 ②（12 处 `legacy_unverified` 消息）/③（decision-memory 文档注记）有落点。

**W-02 N11 handoff recipe — done（2026-06-16，重定标）**
- 核验结论：coordinator `HANDOFF_BUILDER_TABLE` 的 N11（`publish-v1c-input-bundle.v1` → `handoff_hash_key:'n10_handoff_hash'`）条目已存在（`topic-selection-v1b-run-coordinator-service.ts:156-158`），模块加载覆盖断言（164-169）通过——00 §W-02 / §30 的「N11 条目缺失」前提作废。
- 落地：补 coordinator `advanceUntilBlocked` 的 N11 终端穿越单测「drives the full N1..N11 chain to stop_v1b_complete and reports run completion」——驱动 N1→N11 全清洁链（N4/N6/N8 model draft、N2/N5 人审、N9/N10/N11 确定性自驱），断言 `run_complete=true` / `halt.reason='run_complete'` / `last_completed_node_id=N11` / `next_node_id=null`，并校验 N11 frozen payload 自 N10 handoff 组装（`n10_handoff_hash`）。coordinator 单测 **16/0**。

**W-03 代码卫生 — done（2026-06-16，重定标）**
- ① **moot**：全 topic-selection service 无 `@deprecated` 标记；`research-slice`/`topic-question`/`value-assessment` 只读投影三件套已于 T-123 Phase 1.1 随生成路径删除——无对象可去。
- ② 丰富 **6 处** admission `legacy_unverified` 拒绝消息（early-semantic-support / n4-research-slice / n6-draft / n6-loopback-triage / n7-support / n8-value-assessment），指明根因（无 runtime-verified v1b provenance）+ 恢复指引（经 v1b N1 intake 重产、v1a/legacy 工件不可直接复用）；**错误码不变**（零行为变化——测试仅断言 `code`）。
- ③ decision-memory packet **持久化/查询 SSOT** 注记写入 `packages/shared/.../topic-selection-decision-memory-packet-contracts.ts`：packet 为 build-on-read 投影、无独立持久化，持久化 SSOT 为各来源 authority 仓储（need-validation / value-assessment / recheck-risk-memory / topic-question），唯一查询路径 `TopicSelectionDecisionMemoryProjectionService.buildPacket({title_card_id, max_entries})`。
- 证据：affected admission + projection 单测 **32/0**；backend 全套件 **1333/0/35skip**、shared **255/0**、`tsc` **0**。

**Phase 0 收口（M0）**：W-01 / W-02 / W-03 全部 done；工作树仅余并行 session 文件；进入 Phase 1。

### Phase 1 — 后端鲁棒性（已完成 2026-06-16）

**W-04 Coordinator 故障恢复 — done（2026-06-16）**
- 全部落在 coordinator/controller 层，**未触碰 harness 本体**（无需 D-record）。
- ① feedback pre-flight + ② upstream-blocked：`buildNextRequest` / `resolveFeedbackReentry` 中「上游 lineage / 反馈工件缺失」的裸 500 改为**结构化 halt**——新增 `HaltReason` `upstream_blocked` / `feedback_artifact_missing`，经内部 `CoordinatorPreconditionHalt` 在 `advanceLocked` 转 halt（指名缺失工件）。
- ③ timeout retry 指引：`node_timeout` halt 消息**本就含** retry 指引（「harness is replay-idempotent, advance again to converge」，`invokeWithTimeout`）——核验已满足，未改（与 W-02/W-03 同属「计划前提部分已实现」）。
- ④ 人审 nonce 守卫：新增 `runHumanSubmissionExclusive(runId, nonce, fn)`——N2/N5 路由读 `X-Coordinator-Attempt-Nonce` 头；同 (run, nonce) 重复提交 → 409（**成功后才记录** nonce，失败可同 nonce 重试，null 不守卫；in-process，同 run-lock/in-flight 映射）。
- 负例单测（coordinator **19/0**）：`upstream_blocked`（缺 N7→N8 projection）、`feedback_artifact_missing`（反馈工件被删）、nonce 守卫（重复 409 / 失败可重试 / null 不守卫）。

**W-05 准入/运行时单测补齐 — done（2026-06-16）**
- 12 个无独立单测的 service 各补 co-located `.unit.test.ts`（5 admission + 7 runtime），共 **66 测试 / 0 fail**：early-semantic-support-runtime、n4-research-slice-{admission,runtime}、n6-draft-runtime、n6-loopback-triage-{admission,runtime}、n7-support-runtime、n8-value-assessment-{admission,runtime}、v1c-n2-bounded-debate-admission、v1c-n4-delegated-promotion-decision-admission、v1c-n6-feedback-normalization-admission。
- 每个含 happy path + 负例（admission：`legacy_unverified`/provenance/drift 拒绝码；runtime：lineage/输入不变量拒绝 + byte-stability）。
- 注：计划提到的「N6 dedup-warning / N8 阈值应用」断言**不适用于这 12 个 service**——dedup-warning 属 n6-draft-admission（已有单测）、N8 阈值属确定性 harness gate；这 12 个是 provenance/identity 准入与 draft 生成 runtime，据实未强加无关断言。

**W-06 N8 provisional 产品门禁形式化 — done（2026-06-16）**
- shared `topic-selection-v1b-workflow-harness-contracts.ts` 新增 `N8_DEBATE_THRESHOLDS_PROVISIONAL_PRODUCT_GATE`：把 `n8_debate_thresholds_provisional` tripwire 形式化为产品门禁——harness 层 non-blocking（**阈值判定不变、不动 harness 本体**），产品层「真选题过 N8 须有记录的 stakeholder sign-off」；门禁保留至 W-13 标定达标（≥100 多 provider 标注 + FP<5%），其间不翻 `provisional:false`、不撤 tripwire。
- 守卫单测（shared **256/0**）：断言 N8 policy `provisional===true`（防早翻 tripwire）+ 门禁常量形状。

**Phase 1 收口（M1）**：W-04 / W-05 / W-06 全 done；backend 全套件 **1402/0/35skip**、shared **256/0**、`tsc` 0。进入 Phase 2（harness 一次拆透 / 选项 A）。

### Phase 2 — harness 一次拆透 / 选项 A（待开工）
### Phase 3 — 能力扩展 / 选项 B（待开工）
### Phase 4 — 工作台收口 / 选项 C（待开工）
### Phase 5 — 阈值标定 / 选项 D（延期尾巴，待语料）
