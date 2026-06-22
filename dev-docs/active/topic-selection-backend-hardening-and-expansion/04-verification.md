# 04 Verification

## 测试分层总览
- **单测**：单组件、mock 依赖——coordinator 故障恢复分支（W-04）、准入/运行时 service（W-05）、N6 触发器（W-07）、v1c recheck 发射（W-08）、provider-diverse profile 解析（W-09）、标定分析（W-13）。
- **集成**：组件 + 共享 service（harness）——N6 debate 准入路径、人审 N2/N5 回归。
- **全链 e2e（mocked acceptance 隔离）**：N6 debate（生成→triage escalation→debate→synthesizer→gate 准入）、coordinator 故障注入。
- **不变量回归 / replay 守卫**：legacy 404、mocked product 拒绝、replay 幂等、N1 golden replay-identity（W-12 每 slice）、T-108 前向唯一（W-08）、debate byte-identity（W-09）。
- **执行模式隔离**：`mocked_llm`（test DB / fixture）vs `provider_llm` product（live，门控）vs `codex_assisted`（operator）边界承 T-088 D-04。

## Phase 验证矩阵
### Phase 0（夯实）
- W-01：提交后 backend 套件 + tsc 双绿；`git status` 核对仅剩并行 session 文件（排除清单逐项确认）。
- W-02：coordinator N11 穿越单测（deterministic 自动穿越 / model-like 正确组装 input）。
- W-03：grep 确认无生成方法测试引用（删则连带删测）；卫生改动零行为、套件无回归。

### Phase 1（鲁棒性）
- W-04：三类负例——feedback 工件缺失 → 结构化报错（非 500）；upstream blocked → `halt('upstream_blocked')`；node_timeout → halt 附 retry 指引；nonce 守卫拒陈旧重跑。
- W-05：~12 service 各 ≥1 `legacy_unverified` 拒绝 + 1 happy path；N6 dedup warning 码、N8 阈值 + provisional tripwire 交互断言。
- W-06：provisional 门禁文档化；可选覆盖入口隔离 A/B 测试；确认未翻 `provisional:false`、tripwire 仍发射。

### Phase 2（选项 A：harness 一次拆透）
- W-12：每 slice 前后 N1 golden replay-identity 守卫 + v1b 全套件 + `topic-selection:v1a-harness-replay-smoke` + replay 幂等对比（同输入同 replay key 同结果）；`pnpm typecheck` 0；harness 类对外契约不变；**一次拆透**——壳仅余生命周期 + 持久化、纯函数簇出文件、行数显著下降；D-T127-01 登记。

### Phase 3（选项 B）
- W-07：触发器单测全分支（原语对应的候选质量 gate）；mocked debate e2e 绿 + provenance `debate_extension` 完整 + **触发后正常继续**（escalation→debate→synthesizer→gate 准入→下一节点）；不触发时既有 N6 路径回归不变（对比）；**harness 改动 replay byte-identity 保持**（差分探针 prompt_packet_hash / runtime_invocation_context_hash / source_hashes 跨角色 byte-identical）；D-T127-02 登记 + 矩阵 N6 行 reserved→implemented + T-089 留痕。
- W-08：recheck 发射单测（建议性记录 + 排序）；**T-108 前向唯一回归绿**（无新回环路由、downstream-recheck 仍 record-only）。
- W-09：provider-diverse execution plan 解析单测（slot_overrides 映射）；debate byte-identity 不变；既有 profile 解析回归。

### Phase 4（选项 C：工作台收口，核心段终点）
- W-10：`topic-workbench-ui-vs-flow-gaps` 审计条目逐条结论；只读节点（N7/N9/N10）注释；gate 拒绝 UX（可选 trace 细化）；desktop typecheck + UI gate 0/0。
- W-11：迁移脚本对样本旧 option-set backfill `n4_handoff_hash`，验证人审 N5 选择不再 409；脚本幂等可重跑；人审 N2/N5 e2e 回归绿。**→ 核心段 sign-off。**

### Phase 5（选项 D：延期尾巴，record-and-defer）
- W-13：标定姿态登记 record-and-defer；N8 维持 provisional + tripwire；可选 mock dry-run **仅自检工具链不产出阈值**；真实语料就绪后标定分析单测、阈值更新经 contracts 数据层、达标证据（样本量 ≥100 多 provider、precision/recall 误报 <5%）记本文件；不达标维持 provisional（零产品风险）。

## 回归清单（每个 Phase 收口必跑）
- `apps/backend` v1b 全套件（当前基线 1332/0 fail / 35 skip）。
- `pnpm --filter @paper-engineering-assistant/shared test`（当前 255/0）。
- `cd apps/backend && npx tsc --noEmit -p tsconfig.json`（0 error）。
- `topic-selection:v1b-harness-e2e` / `v1b-runtime-stress`。
- F-11 replay-identity 守卫（N1 golden 哈希，`topic-selection-v1b-workflow-harness-service.unit.test.ts`）。
- desktop typecheck + UI gate 0/0（涉 Phase 4 选项 C）。
- 不变量：v1b legacy write 404、mocked product 拒绝、replay 幂等、T-108 前向唯一。

## 运行记录
> 各 Phase 收口验证在此追加（日期 + 套件计数 + commit hash + 结论）。

- **2026-06-16 · Phase 0 / W-01 预检 + 落地**：backend 全套件 `apps/backend pnpm test` = **1367 tests / 1332 pass / 0 fail / 35 skip**（基线吻合）；`pnpm --filter @paper-engineering-assistant/shared test` = **255/0**；backend & shared `tsc --noEmit` = **0**；W-01 文件单测 32/0、coordinator 单测 47/0。结论：W-01 残留落地、双绿，工作树仅余并行 session 文件。重定标：W-02 N11 recipe 条目已存在→仅缺终端穿越测试；W-03 ① 已 moot。
- **2026-06-16 · Phase 0 收口 / W-02 + W-03**：W-02 补 N11 终端穿越单测（coordinator 16/0）；W-03 ② 丰富 6 处 admission `legacy_unverified` 消息（码不变）+ ③ decision-memory SSOT 注记入 contracts。证据：affected admission+projection 单测 32/0；backend 全套件 **1367 tests / 1333 pass / 0 fail / 35 skip**；shared **255/0**；backend & shared `tsc --noEmit` **0**。结论：**Phase 0（M0）收口** —— W-01/02/03 全 done，核心段进入 Phase 1。
- **2026-06-16 · Phase 1 收口 / W-04 + W-05 + W-06**：W-04 coordinator 故障恢复（upstream_blocked / feedback_artifact_missing 结构化 halt + 人审 nonce 守卫；timeout 指引核验已存在）+ 3 负例（coordinator 19/0）；W-05 为 12 个 admission/runtime service 各补单测（66/0）；W-06 形式化 N8 provisional 产品门禁常量 + 守卫单测。证据：backend 全套件 **1402 pass / 0 fail / 35 skip**；shared **256/0**；backend & shared `tsc --noEmit` **0**。结论：**Phase 1（M1）收口** —— 进入 Phase 2（选项 A：harness 一次拆透，先登记 D-T127-01）。
- **2026-06-17 · Phase 2 / W-12 slice — N8/N9/N10 authority-hash 簇**：D-T127-01 已登记；5 个 `hashN8/N9/N10*Authority` 纯函数逐字搬迁到 `harness-authority-hash.ts`（`this.hash`→`canonicalHash`），harness 16 调用点改模块调用、移除 5 私有方法。证据：harness **12,898→12,829 行**；harness 单测 **97/0**（`GUARD_GOLDEN_N1` + `OPTION_AUTHORITY_GOLDEN` 绿，N1 byte-identical）；backend 全套件 **1402/0/35**（与拆分前**完全一致** → N8/N9/N10 authority hash byte-identical）；`tsc` 0。结论：W-12 首个 slice 落地、replay byte-identity 保持；Phase 2 进行中（续抽 parse-and-resolve / 剩余 hash-authority / ref-issue builder 至壳）。
- **2026-06-17 · Phase 2 / W-12 slice 2 — N7 + N5 authority-hash**：续抽 5 纯函数（`hashN7TopicQuestionAuthority`/`hashN7ContractAuthority`/`hashN7AnswerabilityPlanAuthority`/`hashN5DecisionAuthority`/`hashN5ResearchSliceAuthority`）到 `harness-authority-hash.ts`，11 调用点改模块调用。证据：harness **12,829→12,753 行**；harness 单测 **97/0**（golden 守卫绿）；backend 全套件 **1403/0/35**（抽取前后一致 → byte-identical；基线 1402→1403 的 +1 为 nits 的并发 nonce 测试）；`tsc` 0。另：本 session 已就质量做对抗式评审（4 维 0 个确认缺陷，3 个 nit 已修：W-04 并发 nonce 竞态测试、W-05 n8 正则收紧、W-06 注释精确化，commit `d2df3f7a`）。
- **2026-06-17 · Phase 2 / W-12 slice 3 — pure-utils 工具簇**：新建 `harness-pure-utils.ts`，抽 `buildRef`（原 `ref`，别名避遮蔽）/`isRecord`/`hasOnlyKeys`/`isHash`/`recordString` + `HASH_PATTERN`，~270 调用点改模块调用。证据：harness **12,753→12,729 行**；`tsc` 0（裸名遮蔽核验通过）；harness 单测 **97/0**（golden 守卫绿）；backend 全套件 **1403/0/35**（byte-identical）。意义：解耦 parse-and-resolve 簇与 `hashN6CandidateAuthority`，为后续主体拆分铺路。
- **2026-06-17 · Phase 2 / W-12 slice 4 — hashN6CandidateAuthority（hash-authority 簇收口）**：抽最后一个 `hashN*Authority` 到 `harness-authority-hash.ts`（用 slice 3 的 `buildRef`）。证据：harness **12,714 行**、`private hashN*Authority` 计数归 0（N5–N10 全出壳）；`tsc` 0；harness 单测 **97/0**（golden 守卫绿）；backend 全套件 **1403/0/35**（byte-identical）。另：slice 2+3 对抗式评审 **0 确认缺陷**。**hash-authority 簇完成**；W-12 续推 parse-and-resolve 主体。
- **2026-06-17 · Phase 2 / W-12 slice 5 — predicate 类型守卫簇**：新建 `harness-predicates.ts`，抽 12 个纯守卫（`isFunctionalRefValue`/`isStringArray`/`isFunctionalRefArray`/… 连续块），161 调用点改模块调用；簇内互调模块内解析，`isRecord`/`isHash`/`hasOnlyKeys` 由 pure-utils import。证据：harness **12,714→12,648 行**；`tsc` 0（无遮蔽/孤立 import）；harness 单测 **97/0**（golden 守卫绿）；backend 全套件 **1403/0/35**（byte-identical）。意义：解锁 `parseN1..parseN11` 搬迁。
- **2026-06-17 · Phase 2 / W-12 slice 6 — parser batch 1（N1/N3/N4/N6）**：新建 `harness-parsers.ts`，抽 4 个纯 frozen-input 解析器（依赖核查：9/11 parser 已 PURE，仅 N2/N5 待验证器先抽）。证据：harness **12,648→12,526 行**；`tsc` 0（清理了 1 个孤立类型 import）；harness 单测 **97/0**（golden 守卫绿）；backend 全套件 **1403/0/35**（byte-identical）。
- **2026-06-17 · Phase 2 / W-12 slice 7 — parser batch 2（N7–N11）**：续抽 5 个纯解析器到 `harness-parsers.ts`（模块补 4 个 predicate import + N7–N11 类型）。证据：harness **12,526→12,328 行**；`tsc` 0；harness 单测 **97/0**（golden 守卫绿）；backend 全套件 **1403/0/35**（byte-identical）。parser 簇仅余 N2/N5（依赖验证器，待下一刀）。
- **2026-06-17 · Phase 2 / W-12 slice 8 — parser 簇收口（N2/N5 + 2 validators）**：抽 2 个 accepted-payload 验证器 + parseN2/parseN5 到 `harness-parsers.ts`（6 调用点改模块调用；清理 4 个孤立 predicate import）。证据：harness **12,328→12,140 行**、`private parseN*` 计数归 0（**parser 簇 N1–N11 全出壳**）；`tsc` 0；harness 单测 **97/0**（golden 守卫绿）；backend 全套件 **1403/0/35**（byte-identical）。仅余 resolver 簇收壳。
- **2026-06-17 · Phase 2 / W-12 核查 + slice 9**：核查发现 `resolve*` 均 async/stateful → 留壳（无纯 resolver 簇）；到字面壳尚余 ~107 个纯节点助手，用户定 grind 至壳。slice 9 抽 5 个 N7 support-payload guards 并入 `harness-predicates.ts`（清理 3 个孤立 import）。证据：harness **12,140→12,030 行**；`tsc` 0；harness 单测 **97/0**（golden 守卫绿）；backend 全套件 **1403/0/35**（byte-identical）。
- **2026-06-17 · slices 4–9 对抗式评审 + 覆盖补强**：评审 byte-identity **0 缺陷** + DAG 无环/无孤立 import；确认既有覆盖盲点（parser/guard 负分支无测试，mutation 可证）→ 新增 `harness-parsers.unit.test.ts`（41）+ `harness-predicates.unit.test.ts`（25），独立 mutation 复验闭合（削 parseN9 isHash → 测试转红）。backend 全套件 **1469/0/35**；`tsc` 0。
- **2026-06-18 · Phase 2 / W-12 收壳完成（slices 10–13 + batches 0–6c）**：slice 10 gate-utils（`a83decbe`）、slice 11 守卫收口（`015fdc6c`）、slice 12 ref-builders（`15e72aec`）、slice 13 asserts（`922f84c3`）；清单工作流 `wf_2dd916ca` 裁定 132 候选 = 70 可抽/62 留壳后，batches **b0 折叠**（`a809904b` hash→canonicalHash / hashResearchSliceOptionAuthority→shared，删 2 委托壳）→ **b1** route-handoff（`2ab7b3b7`）→ **b2** intake-readiness（`db78d775`）→ **b3** n5（`50143b88`）→ **b4** n6（`9ec3d1c8`）→ **b5** n4+leaf-trio（`3ab3ea8c`）→ **b6a** n7（`78220492`）→ **b6b** n8（`dec4f51e`）→ **b6c** node-misc（`21fc36db`）逐批逐字搬迁。证据：harness **12,898→9,933 行（-2,965，-23%）**、`private hash`/`hashResearchSliceOptionAuthority` 归 0；**16 个兄弟模块严格 DAG 无环、无模块反向 import harness service**；每批 harness 单测 **97/0**（`GUARD_GOLDEN_N1`+`OPTION_AUTHORITY_GOLDEN` 绿）、`tsc` 0、backend 全套件 **1469/0/35**（11 次 commit 全程 byte-identical）；完整性核查确认余下 sync 方法皆 `this.<stateful>` 或 runner-local 类型绑定。**独立逐字对抗评审**（`wf_063839cb`，10 模块 / **90 函数** vs 基线 `015fdc6c`）：**CLEAN，0 确认缺陷**（每函数 token-for-token 一致，差异仅 `private`→`export`/`this.`→bare·别名/缩进）。结论：**W-12（M2 选项 A）收口** —— harness 即字面壳（生命周期 + 持久化 + stateful async runner + runner-local 类型助手），后续 W-07 N6 debate 准入/gate 落于模块化结构。
- **2026-06-21 · W-07 item (a) 后续 / triage 供给半 — coordinator `support_payloads` 通道**：补 N6 escalation 真实可达的另一半（与 projection-threading 合一即 coordinator 驱动真实 run 端到端可达）。coordinator per-node input 加 `support_payloads` 通道，把 caller 的 `n6_loopback_triage` 经 `recordSupportSemanticArtifacts`（复用 `recordDraftSemanticArtifact` 的 targetSlotId 路径）记为 fixture_replay/support_only 工件、additive 附到失败 N6 attempt，harness 据此路由 `n6_debate_escalation`（否则默认 `n6_regenerate_candidates`）。守卫：slot 必 support_only / 不与 debate·execution_spec 同供 / 不重 record draft 已占 slot。**对抗式复核** `wns5xk7rr`（4 lens〔production-path-proof / coordinator-logic / test-fidelity / consistency〕+ 完整性批判；21 raised / 每条独立复核 / 1 false-positive）：**0 critical / 0 high，生产路径逐 check 确认 sound**（真 harness round-trip 由 harness e2e `:5946` 独立覆盖）；finding 集中**测保真 + caller 合同文档**，已修（field doc 补 caller 合同〔bare payload / triage 需 candidate-level loopback draft / affected_refs lineage / product 拒〕、execution_spec+duplicate-slot 守卫、provenance label 参数化、测名诚实化 + 补 product-propagation 与守卫负例测）。证据：coordinator **41/0**、backend tsc 0、shared **258/0**、**full backend 套件 1521/0/35skip**。

- **2026-06-21 · W-07 收尾 / N6 `schema_version` 专用 blocker code 落地 + `9671be11` 残缺提交补全**：承 holistic-review item (3)。`9671be11` 仅提交 admission 的 `block('N6_DIVERGENT_DEBATE_ROLE_OUTPUT_SCHEMA_VERSION')` 发射、漏提交契约 union 成员 + 测，致 **HEAD 单独 `tsc` 不过**（TS2345）。补全：契约 union 加该码（N6 blocker **14→15**）、admission 单测 **13→17**（role_slot↔schema_version 分离 + drifted/missing/empty-string 三例，均重哈希三身份字段直达分支）、`N6_DEBATE_OUTPUT_CONTRACT` 单源化（alias 导入常量，镜像 runtime:93）。质检：多 agent 对抗式复核 `wf_8caad487`（5 lens，**29/29 confirmed / 0 refuted**）裁定 "correct, well-tested, genuine hardening"。证据：admission **17/0**、shared **258/0**、backend & shared `tsc --noEmit` **0**、**full backend 套件 1523/0/35skip**。跟进：N8/v1c-N2 同款 schema_version 守卫 levelling-up（另起任务，additive-safe）。

- **2026-06-21 · W-07 收尾 II / N8 + v1c-N2 admission schema_version 守卫 levelling-up（风险台账 8 RESOLVED）**：把 N6 的 model self-declared schema_version 强校验回填 N8 + v1c-N2，关闭同源 free-string 缺口。N8 复用既有常量 + 新码 `N8_BOUNDED_DEBATE_ROLE_OUTPUT_SCHEMA_VERSION`（+3 测）。**v1c-N2 关键发现**：role-output schema_version **非单值**——`RoleOrFinal` union 按 `…-role.v1`（role）/`…-final.v1`（final）判别，正交于 artifact output_contract；首版单常量误设致 v1c-N2 runtime 5 红，改为**按角色类**钉值（两常量 + `N2_FINAL_SLOT_ID` + 新码 `N2_BOUNDED_DEBATE_ROLE_OUTPUT_SCHEMA_VERSION`，+4 测含 class-swap）。dotted 值在 provider-canary（**acceptance 诊断,非 production runtime**）+ runtime test + canary test 全部单源化 import（唯一源 = admission service 常量）。纯 gate、replay byte-identity 保持、契约成员与发射同提交。**对抗式复核** `wf_9d702c03-ba9`（5 lens，**14/14 confirmed / 0 refuted**）裁定 **"SHIP WITH FOLLOW-UP"**：fail-closed gate、无 live 回归（v1c-N2 admit() 无 production caller）；**v1c-N2 生产可达性未决**——真实 runtime 未在 emission/prompt 层产出 dotted 值，接入 production 前须抓真 provider 样本 + emission↔admission 对齐（已 spawn 跟进，见风险台账 8）；复核后补 reverse class-swap 测。证据：N8 admission **16/0**、v1c-N2 admission **21/0**、v1c-N2 runtime **7/0**、provider-canary **36/0**、backend & shared `tsc` **0**、shared **258/0**、**full backend 套件 1531/0/35skip**。

### （待开工）
