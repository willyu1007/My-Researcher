# 06 D10 终验收证据汇编报告（E1 产出，2026-07-18）

## 报告定位与方法

- **对应工单**：`14-d10-acceptance-workorder.md` §E1（证据汇编）。本报告为 D10 五项验收的**证据汇编与裁定建议**，纯文档汇编，零代码改动，`experiment-foundation*` 面不触碰。
- **验收对象**：T-124 三条 golden scenario 正式版全链 live run（G5 素材面证据，2026-07-18 闭合，详 `03-implementation-notes.md` §G5 / `04-verification.md` §G5）。
  | 简称（工单口径） | 权威 run_id / 目录名 | 场景 | runner 版本 |
  |---|---|---|---|
  | gs-001 run 014 | `gs001-lora-live-014` | gs-001-lora | `t124-g1-golden-full-chain-v9` |
  | gs-002 run 002 | `gs002-distilbert-live-002` | gs-002-distilbert | `t124-g1-golden-full-chain-v9` |
  | gs-003 run 002 | `gs003-bitfit-live-002` | gs-003-bitfit（负结论场景） | `t124-g1-golden-full-chain-v9` |
  - 三个 run 目录均在 `.ai/.tmp/paper-implementation-golden-scenario/<run_id>/`。
- **证据基线**：G5 修复轮（FIX-A 产品 13 项 / FIX-B runner·素材 9 项）后全量 stress `t114-paper-implementation-runtime-stress-1784299784254` **passed**；迁移 `20260716120000`（确认内容绑定列 `reviewed_claim_statement_hash`）**用户已审批 apply**；迁移后 prisma smoke **39/0/15**。
- **AI 代评审声明**：A5 的四维评分为 AI 代评审（fable-5，用户委托、人工可覆盖），留档各 run 目录 `rubric-scored.md`。达标以用户抽验认可为前提（见 §E4 判断点④）。
- **矩阵结构**：每项验收 = **命题**（可证伪陈述）/ **证据指针**（run id + 目录 + 测试/L5 case + 03·04 文档锚）/ **机器可复验命令** / **裁定建议**。

---

## A1 血缘无断链

### 命题（可证伪）
三条 golden run 达成 dossier `ready_for_writing` 后，其血缘断言器对 `dossier → claim → packet → REU → WO → cycle → probe → route → runtime proposal` 全环逐环回溯：gs-001 与 gs-002 应 **20/20 全过、gaps=0**；gs-003 的失败项应**当且仅当**落在"claim 强度诚实降档 ×1 + skeptic blocked 导致下游确定形状 ×2"三处，且这三处均可裁定为合规差异而非断链。若任一被引 ref 悬空、hash 不匹配、或出现设计外的失败项，则命题被证伪。

### 证据指针
- **断言器产物**（机器判定，非恒真——每项检查带 `detail` 实体 id/hash）：
  - gs-001：`gs001-lora-live-014/58-lineage-assertion.json` → `status:passed, total:20, failed:0`。
  - gs-002：`gs002-distilbert-live-002/58-lineage-assertion.json` → `status:passed, total:20, failed:0`。
  - gs-003：`gs003-bitfit-live-002/56-lineage-assertion.json` → `status:failed, total:20, failed:3`。
- **20 项检查覆盖全环**（以 gs-001 为样本，逐项落 `detail`）：`dossier.status_ready` / `dossier->claim ref` / `dossier->packet ref` / `dossier.readiness_gate` / `claim.status_supported` / `claim->packet ref` / `claim->reu support ref` / `claim->trace packet` / `claim.strong_confirmation_required` / `packet->reu ref` / `packet->cycle` / `reu.trusted` / `reu->wo` / `reu.result_hash_matches_material` / `wo->cycle` / `wo.admission_gate` / `cycle->probe trigger ref` / `cycle->route ref` / `probe->runtime proposal lineage` / `route->runtime proposal lineage`。**无恒真项**：`reu.result_hash_matches_material` 比对内容 hash（gs-001 `3e07cfd5…89dd`）、`probe/route->runtime proposal lineage` 比对 `source_proposal_artifact_id` + `source_proposal_artifact_hash`（gs-001 probe `pi_runtime_final_7640a7bf…` / `531d7d38…`）。
- **gs-003 三项失败正式裁定为"合规差异"**（依据落 `56-lineage-assertion.json` 的三个 `ok:false` detail）：
  1. `claim.strong_confirmation_required` → `human_confirmation_required:false, boundary_gate_status:allow_moderate`。**裁定依据**：gs-003 是负/无定论结论场景，模型跨 run 一致把 claim 强度诚实降档为 `moderate`（真实认识论立场，非粉饰——负结论无任何弱化），故边界门判 `allow_moderate` 不触发强 claim 确认；断言器写死"必须 strong+需确认"故计失败。这是 GAP-N1（claim 强度语义），登记为移交项，非血缘断链。参见 `gs003-bitfit-live-002/rubric-scored.md`（claim boundary 行"strength=moderate 与答案卡 strong 分歧（GAP-N1，诚实降档非粉饰）"）。
  2. `cycle->probe trigger ref` → 仅含 `motive_evidence_board_version`，缺 `feasibility_probe`。
  3. `probe->runtime proposal lineage` → `feasibility_probe.status:skipped, reason:"feasibility_planning step did not pass (lane stopped earlier)."`。
     - **裁定依据（2·3 同源）**：gs-003 的 route_skeptic_review 槽正确 blocked（`recommended_disposition=revise` + 2 blocking findings，双命中 GAP-1/GAP-2 设计缺口，见 §A5 与 `90-summary.json` lane-a-validation-planning `run_status:blocked`），lane A 在 skeptic 处诚实终止 → feasibility_probe 未物化 → cycle 触发 ref 少一项。这是**"治理正确工作"的确定性下游形状**，即"skeptic 拦下有真实缺陷的输入"的必然结果，非血缘缺陷。属 GAP-N2（skeptic 槽缺 revise→waiting_review 出口）家族。
- **文档锚**：`04-verification.md` §G5 表（"gs-003：17/20，3 失败全定性"）；`03-implementation-notes.md` §G5 登记 GAP-N1/N2。

### 抽 1 条链人工逐环 ref/hash 复核清单（建议对 gs-001 run 014）
读者对 `gs001-lora-live-014/` 逐环人眼核对（机器断言的独立复核）：
1. `52-lineage-fetch-dossier.json`：dossier `status=ready_for_writing`；记下其 `claim_candidate_refs`（`gs001_claim_candidate_001`）与 `result_interpretation_packet_refs`（`gs001_result_interpretation_packet_001`）。
2. `53-lineage-fetch-claim.json`：claim `status=supported`，`support_refs` 含 `run_evidence_unit gs001_run_evidence_unit_001`，`claim_trace_packet_id=claim_trace_packet_932e830a…`；`boundary_gate_status=allow_strong_with_confirmation`，`human_confirmation_required=true`。
3. `54-lineage-fetch-result-packet.json`：packet `run_evidence_refs` = 同一 REU，`validation_cycle_id=gs001_validation_cycle_001`。
4. `55-lineage-fetch-run-evidence.json`：REU `trusted_status=trusted`，`work_order_id=gs001_research_work_order_001`，`result_hash=3e07cfd5…89dd`；与 `45-bh-strong-claim-human-confirmation.json` 的 `reviewed_sources[0].source_hash` 逐字相等（内容绑定证据）。
5. `56-lineage-fetch-work-order.json`：WO `validation_cycle_id=gs001_validation_cycle_001`，`admission_gate_result_id=trace_gate_result_debf7002…`。
6. `57-lineage-fetch-validation-cycle.json`：cycle `route_refs`→`gs001_route_candidate_001`，`trigger_refs`含 `gs001_feasibility_probe_001`。
7. `23-bridge-technical-route-candidate.json` / `25-bridge-feasibility-probe.json`：`source_proposal_artifact_id/hash` 与 `58-lineage-assertion.json` 中 `route/probe->runtime proposal lineage` 项逐字相等。

### 机器可复验命令
```bash
# 断言器直读（三 run 逐环 pass/fail 与 detail）
jq '{status,total,failed}' .ai/.tmp/paper-implementation-golden-scenario/gs001-lora-live-014/58-lineage-assertion.json
jq '{status,total,failed}' .ai/.tmp/paper-implementation-golden-scenario/gs002-distilbert-live-002/58-lineage-assertion.json
jq '{status,total,failed,fails:[.checks[]|select(.ok==false)|{check,detail}]}' \
  .ai/.tmp/paper-implementation-golden-scenario/gs003-bitfit-live-002/56-lineage-assertion.json
# 重跑一条链（LIVE，需 OPENAI_API_KEY）：
PAPER_IMPLEMENTATION_GOLDEN_SCENARIO_LIVE=1 \
  node --env-file=.env.local --loader ./apps/backend/node_modules/ts-node/esm.mjs \
  .ai/scripts/paper-implementation-golden-scenario.mjs --scenario gs-001-lora --run-id <new-id>
```

### 裁定建议
**达成（gs-001/gs-002）+ 合规差异（gs-003 三项）**。gs-001/gs-002 血缘 20/20 硬达标；gs-003 三项失败经逐项 detail 复核，全部落在 claim 强度诚实降档（GAP-N1）与 skeptic 诚实终止的确定性下游形状（GAP-N2）两族，无设计外断链、无悬空 ref、无 hash 失配。**gs-003 三项裁定为合规差异需用户点头**（见 §E4 判断点①）。

---

## A2 四点停驻集（双向：四点必停 + 四点之外不停）

### 命题（可证伪）
系统的人工介入闸门恰为四点——① skeptic/curation 非 proceed → waiting_review；② 强 claim 人工确认（含内容绑定 hash）；③ dossier export；④ 预算门 `TIER_BUDGET_INSUFFICIENT → loop_budget_review`。三 golden run 的**所有非四点节点必须零人工介入自动推进**；四点节点必须真实停驻。若出现四点之外的人工闸门、或四点中任一在其触发条件下未停，则命题被证伪。

### 必停证据
- **停驻#1 curation/skeptic 非 proceed → waiting_review**（skeptic 家族语义停驻）：
  - 三 run `90-summary.json` 的 `stops[]` 均含 `{kind:"waiting_review", node:"evidence_board_curation.binding_gap_candidates"}` + `{kind:"waiting_review_terminal"}`；lane-board-curation `run_status=waiting_review`。停驻产物：`15-lane-board-curation-waiting-review-stop.json`（override 复跑仍 revise：`16-…advance-2-override.json` / `17-…final-state.json`）。
  - gs-003 另有 route_skeptic_review 槽真实 blocked（`90-summary.json` lane-a-validation-planning `run_status:blocked`，step `route_skeptic_review.route_risk_critique:blocked`）——skeptic 非 proceed 的 blocked 形态实证（对照 gs-001/002 的 skeptic passed）。
  - 历史 live 佐证：`04-verification.md` §D2（run 008 curation `recommended_disposition=revise` → coordinator waiting_review 停驻，override 复跑再停驻）；runs 006-014 多次。
- **停驻#2 强 claim 人工确认（内容绑定）**：
  - gs-001/gs-002 边界门判 `allow_strong_with_confirmation`、`human_confirmation_required=true`（`58-lineage-assertion.json` check `claim.strong_confirmation_required` ok）；确认单产物 `45-bh-strong-claim-human-confirmation.json`，其 `reviewed_sources[].source_hash` 与 REU `result_hash`/packet hash 逐字相等（迁移 `20260716120000` 落 `reviewed_claim_statement_hash`，产品物化时校验）。`90-summary.json.stops[]` 含 `four_point_stop_2_strong_claim_confirmation`。
  - **诚实边界**：gs-003 该点未构成绑定停驻——claim 降档 moderate，门判 `allow_moderate`、`human_confirmation_required=false`；runner 仍走了确认 step（`43-bh-strong-claim-human-confirmation.json` 存在）但门未要求之。故停驻#2 的"确认+内容绑定"必停证据来自 gs-001/gs-002（各一条），gs-003 是不触发形态。
- **停驻#3 dossier export**：三 run `back_half.export_stop = "stopped_at_export"`，`stops[]` 含 `four_point_stop_3_dossier_export`；runner 终点即 export 停驻，无越权"已导出"。
- **停驻#4 预算门**：golden run 未行使（三 run 均无预算耗尽），由 L5 必检覆盖——`L5 trace debate tier budget insufficiency fails closed with zero provider calls and classifies to loop_budget_review`（`.ai/scripts/paper-implementation-runtime-stress.mjs` REQUIRED_L5_CASES）+ D2 的 R4 分类 `loop_budget_review`（`04-verification.md` §D2）。

### 不停证据（零人工介入节点清单，从 `90-summary.json` lane/back_half 提取）
三 run 的以下节点均**自动推进无人工闸门**（passed 即续，无停驻）：
- 前半链 lane（`lanes[].step_outcomes`）：`motive_decomposition.draft_assertion_candidates`（三 run passed 自动）、`motive_evolution.evolution_decision_support`（gs-002 passed 自动续；gs-001/003 blocked 为**诚实语义终止**非人工闸门）、`route_architecture.route_candidates`（三 run passed 自动）、`route_skeptic_review.route_risk_critique`（gs-001/002 passed 自动续）、`validation_cycle_planning.cycle_candidates`（gs-001/002 passed 自动）、`feasibility_planning.probe_plan_candidates`（gs-001/002 passed 自动）。
- 后半链（`back_half`）自动推进链：`work_order:admitted` → `acceptance_experiment:trusted_reu_created` → `result_analysis:materialized` → （停驻#2）→ `claim_boundary:materialized` → `dossier_readiness:materialized` →（停驻#3）。即 WO 受理、REU 落账、result-analysis 物化、claim 物化、dossier readiness 物化 **五个权威写入节点全部零人工介入**。
- 受理桥（`acceptance_bridge`）：`technical_route_candidate:created` + `feasibility_probe:created`（gs-001/002）自动物化，无人工闸门。

### waiting_review 家族停驻归类（需用户点头）
curation `revise→waiting_review` 与 motive 确认类停驻，本报告主张**归入第 1 点（skeptic 非 proceed）同族语义停驻**——三者同为"角色产出非 proceed 处置 → coordinator 语义停驻（不入队、可 override 续跑）"，共享 D2 的 `disposition` 确定性推导出口。此归类使四点集在语义上闭合（curation 停驻不另立第五点）。**该归类需用户裁定**（见 §E4 判断点②）。

### 机器可复验命令
```bash
# 停驻集 + 自动推进节点一次性提取
for d in gs001-lora-live-014 gs002-distilbert-live-002 gs003-bitfit-live-002; do echo "== $d =="; \
  jq '{lanes:(.lanes|to_entries|map({lane:.key,status:.value.run_status,steps:.value.step_outcomes})),back_half,stops:(.stops|map({kind,node}))}' \
  .ai/.tmp/paper-implementation-golden-scenario/$d/90-summary.json; done
# 预算门 L5 case（零 provider 调用 fail-closed）
cd apps/backend && node --test --loader ts-node/esm \
  --test-name-pattern "tier budget insufficiency fails closed" \
  src/routes/paper-implementation-runtime-routes.integration.test.ts
```

### 裁定建议
**达成（待归类点用户点头）**。四点必停均有证据（#1/#2/#3 golden live 实证，#4 L5 覆盖），四点之外零人工介入由三 run 的 lane/back_half 结构逐节点证实。唯一待裁定=waiting_review 家族归类（判断点②）。诚实标注：停驻#2 的绑定必停证据仅 gs-001/gs-002 两条（gs-003 因 moderate 降档不触发）。

---

## A3 治理门对抗不可穿透

### 命题（可证伪）
审查以来登记的全部攻击类别（N1-N9 + 复审各轮 CONFIRMED 攻击路径 + G 切片对抗性组装审计）均有对应测试/gate/L5 case 钉死；任一攻击类别若无对应防线（或防线可被绕过），即为验收缺陷。并且，硬化在近生产路径（live provider + Prisma + 同路由）实际工作——以 D10 快照实拍一条新鲜实证佐证。

### 攻击类别 → 防线映射编目

| 攻击类别 | 攻击面 | 钉死它的防线（测试/gate/L5/文档锚） | 状态 |
|---|---|---|---|
| **N1** 强 claim 人工确认可被 LLM 伪造 | boundary adjudicator 自证 `human_confirmation_ref` | `HumanConfirmationRecord` 实体化 + 单次燃烧消费 + **内容绑定 `reviewed_claim_statement_hash`**（迁移 20260716120000）；gs-001/002 `45-bh-strong-claim-human-confirmation.json` hash 机器验证相等 | 已钉 |
| **N2** admission 自证恒等 + per-role 语义校验空心 | 服务内自 admit expected_* 拷贝自身；blocked 旁路 | S3-α3 `paper-implementation-trace-debate-semantics.ts` 服务端独立复核（refs⊆packet / disposition 恰一处置 / arbiter 双向覆盖 / passed 与 blocked 同跑，N2 旁路关闭）；admission 从 payload 独立复核非拷贝比对 | 已钉 |
| **N3** debate 无断点 + token 双计 + 不幂等 | 整链失败全价重打；echo 漂移打死链 | D9 resume（`L5 trace resume rejects identity drift with 409`）；token 单源估算；identity DB unique（同执行重放 409）；echo 失配→可重试单源码 | 已钉 |
| **N4** 提案受理无载体、血缘权威边界断裂 | 受理命令无血缘、不回查 admission | S1 受理桥血缘字段 + 链内回查 admission 且仅接受 passed（`acceptance_bridge_lineage_drift_rejected`）；A1 血缘 20/20 即其正向证据 | 已钉 |
| **N5** runtime 失败善后缺失（队列半环） | runtime lane blocked/failed 不入队 | S1 coordinator blocked 入队 + resolve re_advance；S4-D 队列分类穷举（`L5 coordinator queue classification is exhaustive…unclassified reachable only via an unregistered trusted code`） | 已钉 |
| **N6** 免烧钱洞 + profile 不钉死 + 终态分裂 | archived 项目跑真调用；model_profile_id 未钉 | S0 项目 active 校验（11×`*_inactive_project_rejected_before_orchestrator`）；`trace_integrity_profile_and_model_option_drift_rejected_before_gateway`；S2 终态统一 blocked final | 已钉 |
| **N7** dossier 可静默漏失败 run | 未被 packet 引用的失败 REU 从 ready dossier 消失 | dossier readiness 项目级失败对账 409（缺失清单）；**双侧实证**：gs-003 首跑拦假账 **409** / 本跑放真账 **201**（`04-verification.md` §G5；`03` §G5） | 已钉 |
| **N8** claim literature lineage 强制疑似过度约束 | — | 属**待用户裁定**项（有意锚定 vs 放宽），非穿透面 | 待裁定 |
| **N9** 观测与人审面成本全丢弃 | cost_usd 被 paper 层丢弃 | S4 遥测 sink（见 §A4）；桌面 runtime lane 视图 | 已闭合 |
| **复审 CONFIRMED：后门直改 payload** | 绕组装直接改 `domain_gate_request` | Domain Gate 自身校验零改动（纵深）——`paper-implementation-domain-gate-assembly.unit.test.ts` "后门直改仍 400 的 backstop"（`03` §G4.6） | 已钉 |
| **复审 CONFIRMED：hollow request / 空心 final** | OpenAI strict 模式空心 final 物化率恒 0 的 P0 | F5 wire 编码 + gateway strict 降解 fail-closed 护栏；G4.6 服务侧确定性组装（`RESULT_ANALYSIS/P1_DOMAIN_GATE_REQUEST_MISSING` 可重试） | 已钉 |
| **复审 CONFIRMED：围栏 hash 漂移 / proposal refs 未围栏** | claim proposal refs 未围栏；围栏键缺 version | `P1_CLAIM_PROPOSAL_REFS_UNFENCED` + 围栏键含 version + 重复拒绝；FIX-A 真 hash（REU/报告内容 hash 入 source fence） | 已钉 |
| **复审 CONFIRMED：证据地板洗白 / 豁免列表** | 服务代模型垫入 REU support；豁免列表洗白 | **证据地板回落退役**（FIX-A item 4，空选择 fail-closed 重试）；dossier 豁免列表实校验（须解析真实 REU 且证被取代） | 已钉 |
| **复审 CONFIRMED：预算投毒 DoS-park** | payload 注入 provider_call_budget | coordinator 保留字段 `provider_call_budget`（防 payload 投毒 DoS-park，`04` §D2 对抗性审计） | 已钉 |
| **复审 CONFIRMED：`__proto__` 双污染** | evolution canonicalize 原型污染 | F3 `Object.create(null)` + `defineProperty` 双污染点修复 | 已钉 |
| **G 切片对抗性组装审计** | 6 角度含对抗性组装审计（结构字段来源表正反例） | `paper-implementation-domain-gate-assembly.unit.test` 6/6（packet 混入被滤 / 纯 interpretation 回落声明 REU 地板 / 无证据→空 support ajv fail-closed）；`03` §G4.6 | 已钉 |
| **L5 对抗必检全集** | 伪造 disposition/blocked 冒充/echo 漂移/identity 漂移等 | `.ai/scripts/paper-implementation-runtime-stress.mjs` `REQUIRED_L5_CASES` **76 条**（含 forbidden output fail-closed / adversarial prompt blocked / resume identity·tier drift 409 / coverage·disposition·human-gate missing 系列）；D10 stress `1784327908613` 全命中，manifest 完备性断言保证每条映射到通过 subtest | 已钉 |

### D10 快照新鲜实证（近生产路径硬化活证）
- **实拍**：FIX-A item 3（`assertClaimSupport` 现对每个 `run_evidence_unit` support ref 解析到项目 REU）在 near-prod gate（live provider + Prisma + 同路由）路径**正确拦下未落地证据引用**。
  - 失败跑 `t114-paper-implementation-near-prod-runtime-gate-1784328631075`（2026-07-17T22:50Z）**failed** 于 `02-near-prod-route-gate`：claim/dossier 物化断言期望 `['already_materialized','materialized']`，实际 `[undefined,undefined]`——因 near-prod fixture 的 claim-boundary canary 以 `${RUN_ID}-run-evidence` 支撑其 claim，而该 REU 未被 seed → 硬化门拒绝物化。
  - 修 seed 后通过跑 `t114-paper-implementation-near-prod-runtime-gate-1784329108190`（2026-07-17T23:02Z）**passed**（`90-summary.json status:passed, exit_code:0`）。修法=在 `paper-implementation-near-prod-runtime-gate.integration.test.ts` 补 `claimSupportRunEvidenceUnit()` + `claimSupportMonitorIntake()`（工作树 60 insertions，git diff 可查）。
  - **意义**：这是硬化在近生产路径正确工作的活证——未落地的证据引用即便在 live+Prisma 全路径也被 fail-closed，而非静默物化空心 claim。诚实标注：该拒绝在集成测试面表现为物化产出 `undefined`（materialization 被拒），summary log 未直接打印 `409` wire 码；根因（缺 seed REU → 硬化拒绝）由 git diff 与失败断言共同锁定。

### E2 红队穿透结果（2026-07-17 新鲜实施）
对 running app（`buildApp` + 真实路由/服务/门，in-memory 仓储，`execution_mode=mocked_llm` 一等生产模式、provider_call_count 0、每道治理门与 `provider_llm` 完全相同）实施 12 条子探针，**10/10 攻击类别被拒、零穿透、零错误**。每条拒绝均配正向对照（基线成功、仅攻击变异触雷），非坏 fixture 假拒。证据：`.ai/.tmp/paper-implementation-d10-redteam/{results.json,judgment.md,redteam-probe.mts}`（探针一次性开发后即移除，未入库）。

| # | 攻击 | 实得 | 判定 |
|---|---|---|---|
| 01a | 强 claim 引用从未创建的确认记录 | 409 confirmation_ref 须解析到存在的 HumanConfirmationRecord | 门有效 |
| 01b | 复用已消费确认物化第二个强 claim | 首=201；次=409 already consumed（单次燃烧） | 门有效 |
| 02 | 确认批准 statement A、写入 claim=B | 409 reviewed_claim_statement_hash 不符 | 门有效 |
| 03 | support_refs 引用不存在的 REU id（已声明过 P1 围栏） | 409 REU support 须解析到项目内 | 门有效 |
| 04a | interpretation packet 作唯一 claim support | failed_runtime（P1 无证据预检），无 artifact 可物化 | 门有效 |
| 04b | packet + 有效 REU 混入 support | 201 物化，packet 被剥离出 support（run-012 过滤） | 门有效 |
| 05 | ready dossier 遗漏一条 trusted failed REU | 409 N7 须对账每条 trusted failed REU | 门有效 |
| 06 | passed adjudicator + null proposal（空心 gate request） | failed_runtime（P1_DOMAIN_GATE_REQUEST_MISSING），无空心通过 | 门有效 |
| 07 | 后门直改已存 domain_gate_request payload | 409 ClaimBoundaryGate 独立复校（schema-valid 篡改）；malformed 篡改额外撞 schema 400 | 门有效 |
| 08 | source_context_packet.source_hash 与声明不符 | blocked + source_hash_drift，0 provider 调用（malformed hash 额外 400） | 门有效 |
| 09 | provider_call_budget=1 DoS | blocked + TIER_BUDGET_INSUFFICIENT（loop_budget_review），0 调用、可恢复 | 门有效 |
| 10 | blocked（admitted）final 作 passed 下游消费 | 409 Domain Gate 仅物化 passed runtime artifact | 门有效 |

**行为偏离（均仍为拒绝，据实记录非缺陷）**：#08 期望 400、实为 source_hash_drift→blocked（malformed hash 才 400）；#07 语义门 409（schema-valid 篡改）vs schema 400（malformed）；#04a/#06 早于物化以 failed_runtime 拦截（no-hollow/no-launder 意图在更早层强制）。行使的门源：P1 语义预检、result-claim-dossier（N7/强 claim 确认/REU 解析）、domain-gate-assembly、governance-gate-refs（确认燃烧+绑定）、runtime-domain-gate（passed-only 物化）、trace retrieval（source_hash_drift）、debate runtime（预算 preflight）。

### 机器可复验命令
```bash
# L5 对抗必检全集（stress runner，含套件锁）
node .ai/scripts/paper-implementation-runtime-stress.mjs
# near-prod gate 终跑快照（live provider + Prisma，需 .env.local + OPENAI_API_KEY）
node .ai/scripts/paper-implementation-near-prod-runtime-gate.mjs
# 后门直改 payload 仍 400 backstop + 组装来源表正反例
cd apps/backend && node --test --loader ts-node/esm \
  src/services/paper-implementation-domain-gate-assembly.unit.test.ts
# D10 快照两跑对照
jq '{status,exit_code}' .ai/.tmp/paper-implementation-near-prod-runtime-gate/t114-paper-implementation-near-prod-runtime-gate-1784328631075/90-summary.json
jq '{status,exit_code}' .ai/.tmp/paper-implementation-near-prod-runtime-gate/t114-paper-implementation-near-prod-runtime-gate-1784329108190/90-summary.json
```

### 裁定建议
**达成**。N1-N9 + 复审各轮 CONFIRMED 攻击路径 + G 切片对抗组装审计逐条有对应防线，无无防线的攻击类别（N8 为待裁定语义非穿透面）；D10 快照新鲜实证证明硬化在近生产路径 fail-closed；**E2 红队 10/10 攻击类别被拒、零穿透**，前置条件满足，A3 终判达成。L5 对抗必检实测 **76 条**注册（G4.6 记 77、E1 初稿记 75 均为数法差异；覆盖完整性由绿 stress 的 manifest 完备性断言保证——每条注册必检映射到通过 subtest）。

---

## A4 成本重付率有数

### 命题（可证伪）
三条 golden run 的总成本、provider 调用数、重付率、per-slot 分布均有遥测端点落数；重付率口径（run-local / 项目级双层）可从原始 telemetry 记录手工复算并与端点聚合一致。若端点数与原始记录不可复算一致，则命题被证伪。

### 三场景遥测汇总表
（数据源：各 run 目录 `telemetry-repaid-rate.json` `response` 节，均 GET `…/runtime-telemetry/repaid-rate` 200）

| 场景 | run_id | 总成本 USD | provider 调用 | 项目 run 数 | 重付成本 USD | 重付率 | 重付来源（per-slot） |
|---|---|---|---|---|---|---|---|
| gs-001 | `gs001-lora-live-014` | 3.00024 | 16 | 11 | 0.264805 | **8.83%** | evidence_board_curation override 复跑 $0.2648 |
| gs-002 | `gs002-distilbert-live-002` | 3.11040 | 17 | 11 | 0.464495 | **14.93%** | curation override $0.2647 + route_skeptic runtime 重试 $0.1998 |
| gs-003 | `gs003-bitfit-live-002` | 2.32618 | 14 | 9 | 0.216935 | **9.33%** | evidence_board_curation override 复跑 $0.2169 |

- per-slot top 明细文件：`60-telemetry-repaid-rate.json`（gs-001/002）/ `58-telemetry-repaid-rate.json`（gs-003）；单 run 明细 `62/63/64-telemetry-run-detail-*.json`；coordinator step 明细 `65-72-telemetry-run-detail-*.step-N.attempt-M_*.json`。
- **run 007 全档位对照基线**（`gs001-lora-live-007/telemetry-baseline.json`）：总成本 $2.043305 / 8 provider 调用 / 7 run / **重付率 0（干净全档位基线，本次零重试）**；shadow_tier 分布 `none×6`（单角色槽）+ `standard×2`（debate 槽）。文档锚 `04-verification.md` §S4。

### 重付口径双层定义
- **run-local**：`outcome=retried` + 同 `(slot,role,call_index)` 跨执行重放（D9 resume 同 run 重录）。
- **项目级**：run-local 基础上额外含 coordinator re-advance 整 run 重付（识别 `node_attempt_id` 格式 `{run}.step-{i}.attempt-{n}`，`n≥1` 为重放——coordinator attempt 0-based）。
- 文档锚：`03-implementation-notes.md` §S4-A（重付率口径）。

### 口径可复算性抽验步骤（以 gs-002 为样本）
1. 读 `gs002-distilbert-live-002/telemetry-baseline.json`（或 `60-telemetry-repaid-rate.json`）的 `per_slot[]` 原始记录。
2. 手工求和 `repaid_cost_usd`：`evidence_board_curation 0.264675 + route_skeptic_review 0.19982 = 0.464495`（其余 slot 均 0）。
3. 除以 `total_cost_usd 3.1104` → `0.149336` = 端点 `repaid_cost_rate`（14.93%），**逐字一致**。
4. 交叉核对 per-slot：`route_skeptic_review` provider_call_count=2（一次原始 + 一次 runtime 重试），对应 §A5 gs-002 rubric"skeptic 1 次 runtime 重试（$0.20 重付）"。

### 机器可复验命令
```bash
# 端点聚合 vs per-slot 手工求和一致性抽验（gs-002）
jq '{total_cost_usd:.response.total_cost_usd, endpoint_rate:.response.repaid_cost_rate,
     recomputed_repaid:([.response.per_slot[].repaid_cost_usd]|add),
     recomputed_rate:(([.response.per_slot[].repaid_cost_usd]|add)/.response.total_cost_usd)}' \
  .ai/.tmp/paper-implementation-golden-scenario/gs002-distilbert-live-002/60-telemetry-repaid-rate.json
# 三 run 汇总
for d in gs001-lora-live-014 gs002-distilbert-live-002 gs003-bitfit-live-002; do echo "== $d =="; \
  jq '.response|{total_cost_usd,provider_call_count,repaid_cost_usd,repaid_cost_rate}' \
  .ai/.tmp/paper-implementation-golden-scenario/$d/*-telemetry-repaid-rate.json; done
```

### 裁定建议
**达成**。三场景成本/调用/重付率/per-slot 全有端点落数，run 007 提供全档位零重付对照基线，双层口径明确且 gs-002 抽验复算与端点逐字一致（14.93%）。无待用户点头项——此项证据自洽。

---

## A5 rubric 四维达标

### 命题（可证伪）
三条 golden run 终版四维评分（候选质量 / 批判有效性 / 证据可追溯 / 约束遵守）各维 ≥ 拟定达标线 **4.5**，且 gs-001 历史评审轨迹（003→014）不劣化。评分为 AI 代评审，人工可覆盖——达标以用户抽验认可为前提。若任一维 <4.5 或轨迹出现劣化回退，则命题被证伪。

### 三场景终版评分汇总
| 场景 | run_id | 候选质量 | 批判有效性 | 证据可追溯 | 约束遵守 | 留档 |
|---|---|---|---|---|---|---|
| gs-001 | `gs001-lora-live-014` | **4.9** | **4.8** | **5.0** | **5.0** | `rubric-scored.md`（G5 正式版，四维汇总节） |
| gs-002 | `gs002-distilbert-live-002` | **5.0** | **4.8** | **5.0**（4.95 四舍五入） | **5.0** | `rubric-scored.md`（四维汇总节，line 95-98） |
| gs-003 | `gs003-bitfit-live-002` | 前~4.7 / 后~4.8 | 前~4.6 / 后 5.0 | 5.0 / 5.0 | 前~4.9 / 后 5.0 | `rubric-scored.md`（四维汇总按前/后半链分列，line 105-108） |

- **gs-003 结构说明（如实）**：gs-003 因 lane A 在 skeptic 处诚实终止，rubric 按前半链/后半链分列而非单一四数行。**各维前后半链均 ≥4.5**（最低为前半链批判有效性 ~4.6）。达标以此为据。
- 三场景 `rubric-scored.md` 头部均声明 AI 代评审（fable-5，2026-07-18，人工可覆盖）。

### gs-001 历史五评轨迹（不劣化）
| 评次 | run | 素材 | 候选质量 | 批判有效性 | 证据可追溯 | 约束遵守 | 备注 |
|---|---|---|---|---|---|---|---|
| S5 首评 | `gs001-lora-live-003` | v1 | 4.7 | 5.0 | 4.8 | 5.0 | L7 usage-fit 基线（`04` §S5 首评） |
| v2 复评 | `gs001-lora-live-004` | v2 | 4.8 | 5.0 | 4.8 | 5.0 | `04` §S2 |
| v3 三评 | `gs001-lora-live-006` | v3 | 4.9 | 4.9 | 4.9 | 5.0 | 前半链版（`04` §S3） |
| 全链首评 | `gs001-lora-live-013` | v5 | 4.9 | 4.8 | 4.9 | 5.0 | dossier ready 首达（`03` §G4.6） |
| **G5 终版** | `gs001-lora-live-014` | v4 | **4.9** | **4.8** | **5.0** | **5.0** | 锚定消除后首次真实测量；证据可追溯 +0.1，无维度回退 |
- 判读：候选质量单调不降（4.7→4.9），证据可追溯 003→014 净升（4.8→5.0），批判有效性在 5.0↔4.8 间波动（v3 后头条 blocking 已被素材修复故无"挡真缺陷"素材，非放行错误）。**全轨迹无劣化回退**。

### 显式化达标线（供用户确认）
- 各 `rubric-scored.md` 内部标注的达标线为"每维 ≥3 且无单节点 1 分"（三 run 均通过）。
- 本报告为 D10 验收**拟定更高达标线 ≥4.5（每维）**——沿用历史评审隐含高标。三场景全部各维 ≥4.5。**该 4.5 阈值需用户确认**（见 §E4 判断点③）。

### "AI 代评审人工可覆盖"建议抽验点（每场景 1-2 个最值得人眼看的节点产出）
- **gs-001**：① `39-bh-result-analysis-run.json`（result_analysis 解读——MRPC parity-at-boundary 是否显式入 unexpected_findings，GT-9 红线）；② `50-bh-dossier-readiness-run.json` + `51-…materialize.json`（dossier 八条完备性，尤其实验局限五条含 parity-at-boundary 逐字入 limitations）。
- **gs-002**：① `39-bh-result-analysis-run.json`（逐 cell 保留比/设备敏感/0.90 地板 vs 0.97 headline 分歧披露）；② `44-bh-claim-boundary-run.json`（forbidden_overclaims 六条覆盖 + strong 确认单次消费）。
- **gs-003**：① `route_skeptic_review` 产出（`19-lane-a-validation-planning-advance-1.json` 内 skeptic 段——GAP-1/GAP-2 双命中 blocking，本 run 最强前半链产出）；② `42-bh-claim-boundary-run.json`（negative claim 一等登记：`negative_scope_notes` 4 条 + moderate 降档诚实度）。

### 机器可复验命令
```bash
# 三 run 四维汇总节直读
for d in gs001-lora-live-014 gs002-distilbert-live-002 gs003-bitfit-live-002; do echo "== $d =="; \
  grep -nE "候选质量|批判有效性|证据可追溯|约束遵守|达标线" \
  .ai/.tmp/paper-implementation-golden-scenario/$d/rubric-scored.md; done
# 抽验点产物直读（示例 gs-001 result-analysis）
jq '.' .ai/.tmp/paper-implementation-golden-scenario/gs001-lora-live-014/39-bh-result-analysis-run.json | less
```

### 裁定建议
**达成（达标线与抽验认可需用户点头）**。三场景四维全部 ≥4.5，gs-001 五评轨迹无劣化。两处待用户裁定：4.5 达标线确认（判断点③）+ AI 代评审抽验认可（判断点④）。

---

## E4 用户签核结果（2026-07-18 已签核）

**验收标准（元问题）先定**：D10 完成 = "三场景暴露的问题都已理解并有处置"，**非**"三场景全绿达标"。理由（用户认可）：三场景恰因未全部完美（gs-003 强度分歧/停驻恒 partial/样本量 2）才证明系统在诚实工作；按"全绿"标准反而要粉饰答案卡与停驻。运行语境=纯个人本地科研工作流（AI 仅用于工作流编排/调用，已核实 gateway 边界与 env 门控）。

| # | 判断点 | 裁定 | 依据/处置 |
|---|---|---|---|
| ① | gs-003 三项血缘差异 | **✅ 认可为合规差异** | ②③ = skeptic blocked 导致 probe 如实 skipped 的确定性下游形状（必然且正确）。① claim 强度分歧：**模型 moderate 正确、答案卡 strong 偏乐观**（单种子不足以支撑 strong=要的诚实批判）→ 处置=**修答案卡为 moderate（承认模型认识论立场），不算系统缺陷**。**耦合发现**：`expected_claim_strength` 流入 runner 的 ClaimTracePacket 权威语句+强 claim 确认流程（topic-package 1045/1074/1386），改动需"改+重跑验证"，故答案卡精修放入尾巴 tracker 谨慎做，不在验收收口动素材（保当前干净证据） |
| ② | waiting_review 家族归类 | **✅ 认可 + 定义抽象** | 四点集第 1 点表述由"skeptic 非 proceed"**抽象为"debate 角色产出非 proceed disposition → waiting_review 语义停驻"**，覆盖 skeptic/curation/未来 debate 槽，不逐槽打补丁。四点集语义闭合 |
| ③ | A5 达标线 ≥4.5 | **✅ 认可，且降为软信号** | A1-A4 为硬门（血缘/停驻/对抗/成本，机器可验），**A5 为参考+人工可覆盖，非硬闸**；≥4.5 作 advisory 线，三场景全满足 |
| ④ | AI 代评审抽验认可 | **✅ 已抽验认可** | 用户抽验 gs-003 claim/dossier 实际产出（负结论最考验诚实度）：negative/inconclusive/positive 三语义分离逐格引真值、`negative_result_refs`/`inconclusive_run_refs` 穿透 dossier 账本、明写"a negative conclusion is not a failed run"——确认如实产出非粉饰，采信 AI 代评审为最终评分 |

**结论：D10 五项验收全部达成，四判断点已签核，T-124 完成。**

---

## 移交后续项（验收后硬化，建议新开轻量 tracker）

- **GAP-N1**：claim 强度语义——模型跨 run 一致把负结论 claim 降档 moderate（真实认识论立场）；素材/契约层面明确强度语义与断言器期望的对齐。
- **GAP-N2**：skeptic 槽缺 `revise→waiting_review` 出口（D2 给了 curation 未给 skeptic）；补齐后 gs-003 的 lane A 可停驻复审而非直接 blocked 终止。
- **light 地板探针**：纯 light 地板（零 findings 不升档 3 角色完链）批判有效性未被 live 行使——D2 校准下一最高价值探针。
- **D4 memory families / D6 命名**：特性开发与更名，D10 五项验收不引用其能力，按工单 §定位延后为验收后硬化（避免验收对象漂移）。
- 另：evolution 人工确认停驻的产品化续链出口（`03` §G5 登记）。

---

## 证据缺口（如实标注，非粉饰）

1. ~~E2 红队穿透结果未并入~~ **已解决**：§A3 的 E2 小节已填入 2026-07-17 新鲜红队 12 子探针结果，10/10 攻击类别被拒、零穿透。A3 终判前置满足。
2. ~~E3 验收时点终跑快照未代跑~~ **已解决**：D10 时点已实跑全套一次性快照——全量 stress `t114-paper-implementation-runtime-stress-1784327908613` **passed**、prisma smoke **39/0/15**、near-prod gate `t114-paper-implementation-near-prod-runtime-gate-1784329108190` **passed**（含 near-prod fixture 修复，见 §A3 活证）、三场景 mocked 冒烟 completed+血缘 17/17×3。均为 2026-07-17 同批。
3. **停驻#2 绑定必停证据仅两条**（如实保留）：强 claim 确认+内容绑定的 live 实证来自 gs-001/gs-002；gs-003 因 moderate 降档不触发该点，属预期语义非缺陷，但样本量为 2 而非 3。E2 红队 #01a/#01b/#02 三条以 mocked 生产模式补充了该门的对抗覆盖（伪造/复用/内容不符全拒），弥补样本量。
4. **D10 快照 409 语义**（如实保留）：§A3 near-prod 活证中，硬化拒绝在集成测试面表现为物化产出 `undefined`（materialization 被拒），summary log 未逐字打印 `409` wire 码；根因由 git diff（缺 seed REU）与失败断言共同锁定。**E2 红队 #03 以独立探针复现了同一硬化的 409 报文**（"run_evidence_unit support refs must resolve…in this project"），补足 wire 码留档。
5. **L5 必检计数**：精确数为 **76 条**（G4.6 记 77、E1 初稿记 75 为数法差异）；覆盖完整性由绿 stress 的 manifest 完备性断言保证（每条注册必检映射到通过 subtest），非数字本身。
