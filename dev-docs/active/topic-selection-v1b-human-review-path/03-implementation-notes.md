# 03 Implementation Notes

> 每个 phase 完成后追加：改了什么、为什么、遗留 TODO。

## Status
- Pending Phase 1（尚未动代码）。本任务包先行落地评估与方案设计（00/01/02）。

## Pre-implementation findings (carried from assessment, 2026-06-03)
- v1b 单写入口 = `/workflow-harness/nodes/:nodeId/invocations` → `controller.ln` → `TopicSelectionV1bWorkflowHarnessService`。
- 人审节点 = N2 / N5 / N7（`allowed_execution_modes` 含 `human_delegated`）。N8 model-like；N9/N10 deterministic `['none']`。
- N5 lineage hash 可从持久化取：`comparison_payload.authority_hash`（option set 记录）+ N4 handoff artifact。canonical `hash()` 为可复用 service 方法。
- 详见 `02-architecture.md`。

## Decisions (2026-06-03)
- D1 复用：抽 canonical 哈希为后端模块；D2 per-node 新语义路径；D3 先只做 Phase 1（service+单测，零 UI，尽量不改 harness `ln`）。

## Phase 1 refined plan (post deep-spec, 2026-06-03)
精确实现面（file:line 来自调研）：
- harness 入口：`TopicSelectionV1bWorkflowHarnessService.invokeNode(req): Promise<RunResult>`（service ~L568）；构造器 deps：`controlPlane` + `{ idFactory?, now?, modelProfileRegistry?, runnerDependencies? }`（~L523）。
- N5 handler **re-derive 校验**（caller 必须给对）：`accepted_selection_payload_hash`=`hash(accepted_payload)`（~L2686）、`research_slice_option_set_hash` 必须等于 option-set 记录 `comparison_payload.authority_hash`（~L2727）、`selected_option_hash`=`hashResearchSliceOptionAuthority(option)`（~L8850）。`n4_handoff_hash` 仅作 replay component，不 re-derive。
- canonical 哈希：`hash(v)=sha256Text(stableStringify(v))`（`literature-content-processing-utils.ts`），`stableStringify` 排序 key → 哈希与字段顺序无关。`hashResearchSliceOptionAuthority` 形状见 service ~L12309；`ref` 形状 `{ref_type,ref_id,version_id:null,title_card_id}`（~L12634）。
- 仓库 getters：`findOptionSetById`、`listOptionsByOptionSetId`（`topic-selection-v1b-research-slice.repository.ts`）。

### ⚠️ Phase-0 blocker confirmed: `n4_handoff_hash` 未持久化在 option-set 上
`comparison_payload` 存 `authority_hash / constraint_profile_hash / intake_readiness_hash / n3_handoff_hash`，**没有 `n4_handoff_hash` / `n4_handoff_ref`**（N4 runner ~L2642）。N4 handoff 落了 control-plane artifact，但无"按 option-set-id 反查"的干净 getter。
- **Phase 2 prerequisite（需碰 harness N4 runner，与 T-088 协调）**：在 N4 runner 的 `comparison_payload` 增写 `n4_handoff_ref` + `n4_handoff_hash`（1 处小补丁，非 `ln`/`invokeNode`）。
- **Phase 1 处理**：`V1bSliceHumanSelectionService` 从 `comparison_payload.n4_handoff_hash` 读取；Phase 1 集成测试在跑完 N1→N4 后，用 N4 result 的 `hashes.handoff_hash` 手动补写该字段（模拟 Phase 2 持久化），再经 wrapper 驱动 N5。

## Phase 1 steps & status
- [x] (1a) canonical 哈希模块 `topic-selection-v1b-harness-authority-hash.ts`（+ 6 单测，golden 锁定）。
- [x] (1b) `V1bSliceHumanSelectionService.selectSlice(...)`：从持久化拼 `human_delegated` N5 run-request → `invokeNode`（service `topic-selection-v1b-slice-human-selection-service.ts` + 5 单测：自洽请求装配 + 4 负例）。backend typecheck exit 0 / 0 errors；两文件共 11/11 pass。
- [~] (1c) **rescoped → Phase 2**：full harness-admission e2e（跑 N1→N4 → wrapper → 断言 admitted + ResearchSlice）。理由见下。

### 关于 1c rescope（诚实记录）
N5 handler 读 `loaded.value.planRun`（constraint_profile_ref / readiness_assessment_ref）+ option-set 的 lineage hashes，需要**完整 N4 输出结构**才能 admit。service 级手工 seed 易碎；真实 N1→N4 种子需移植集成测试约 500 行 builder。该 e2e 更适合放到 **Phase 2**：届时人审路由已建，可直接复用 `topic-selection-v1b-routes.integration.test.ts` 的 N1→N4 HTTP 链，在其后追加"经人审路由选 option → admitted"断言。
当前置信度来源（已足够支撑 1b 落地）：
- 1a：哈希与 harness 私有 `hashResearchSliceOptionAuthority`/`hash` **逐字段源码比对一致** + golden 锁定。
- 1b：wrapper 产出的请求**自洽**——`accepted_selection_payload_hash`/`selected_option_hash`/`research_slice_option_set_hash` 正是 N5 re-derive 比对的三个值；且已核实 `n5CodexDelegationBlocker` 对 `human_delegated` 直接放行（`delegation_artifact_hash:null` 不被拦）。
- 残留唯一未经真实 harness 跑通的是"N5 对完整 lineage 的 gate"——留待 Phase 2 e2e。

## Phase 2 steps & status
- [x] (2-①) N4 runner 持久化 `comparison_payload.n4_handoff_hash`（`runN4GenerateResearchSliceOptions`，将 outer-scope `handoffHash`@2547 写入 `writeAuthority` 闭包的 comparison_payload）。T-088 协调：动手前确认该 harness 文件**未被并行工作修改**（git status 干净），collision 风险低；仅 1 行加字段，非 `ln`/`invokeNode`。验证：backend typecheck 0 error；`topic-selection-v1b-routes.integration.test.ts` **6/6**（N1–N11 链 + legacy-404 + offline replay + Prisma smoke）。只加 `n4_handoff_hash`（service 只读它；handoff_ref 暂不需要）。
- [x] (2-②) per-node 人审路由 `POST /research-slice-option-sets/:optionSetId/human-selection`。**全程走 clean 文件、无 app.ts 改动**：在 research-slice **service** 加公开 `findOptionSetById`（委托 repo）；在 **controller** 用既有 `this.workflowHarness` + `this.researchSlice` 构造 `V1bSliceHumanSelectionService`（两者结构上满足 service 的 invoker/read-port），加 `selectResearchSliceHuman` handler + `SliceHumanSelectionBody`；在 **routes** 加路由 + body schema（新语义路径，不撞 legacy 404）。
- [x] (2-③) `SliceOptionSetCard` 升级为交互：`api/v1b.ts` 加 `selectResearchSliceHuman` client（`listResearchSliceOptionsByOptionSet` 已有）；卡片在 `status==='ready_for_selection' && !selected_option_id` 时渲染 `SliceSelectionForm`（拉 options + reviewer actor_id + rationale + confidence → POST 人审路由 → admitted 则 `onMutated` reload，blocked 则提示）；`V1bStageView` 传 `onMutated` + 更新只读口径文案。全部 contract-valid `data-ui`（warning 用 alert，非 text tone）。验证：`pnpm desktop:typecheck` exit 0；UI gate minimal `--fail-on warnings` **0/0**（128 文件）。
- [x] (2-④) 完整 e2e（先于 ③ 做，验证后端全链）：集成测试新增 "human N5 selection (T-115) produces a ResearchSlice through the harness" —— 真实跑 N1→N4 → POST 人审路由 → `human_delegated` → admitted + authority_ref + N5→N6 handoff；非 human actor→400。**v1b 集成 7/7**（含 legacy-404 / N1–N11 / offline replay / Prisma smoke 全绿，非回归）。ts-node 全类型检查覆盖 route→controller→service 图（full-project tsc 因环境内存被 kill，非类型错误）。
- [ ] (2-⑤) 复制到 N7（question contract）/ N2（constraint profile）。

## Open TODOs
- [ ] (later) harness service 改用共享哈希模块，完成 D1 consolidation。
- [ ] (later) 旧 option set（本次 commit 前创建的）无 `n4_handoff_hash`；service 会 409 提示，需重跑 N4 或迁移。
