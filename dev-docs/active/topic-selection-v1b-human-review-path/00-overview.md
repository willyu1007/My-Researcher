# 00 Overview

## Status
- State: in-progress
- Task ID: `T-115`
- Feature / Milestone / Requirement: `F-001` / `M-001` / `R-009`
- Parent: `T-087` (topic-selection desktop workbench) · Depends on: `T-088` (workflow-runtime-foundation, in-progress)
- Decisions (2026-06-03): D1 复用 builder · D2 per-node 新语义路径 · D3 先只做 Phase 1（后端 service+单测，零 UI）。
- Progress: **Phase 1a + 1b done**（canonical 哈希模块 + `V1bSliceHumanSelectionService`，11/11 单测、backend typecheck 0 error、UI gate 0/0）。1c 完整 harness-admission e2e 重定位到 Phase 2。
- Next step: **Phase 2** — ✅ ① N4 runner 已持久化 `comparison_payload.n4_handoff_hash`（backend typecheck 0 error；v1b 集成 6/6，含 N1–N11 链 + legacy-404 + Prisma smoke）。→ ② per-node 人审路由 `/research-slice-option-sets/:id/human-selection`；③ `SliceOptionSetCard` 接 `/options` + 选定表单；④ 完整 e2e（复用集成测试 N1→N4 链）；⑤ 复制到 N7/N2。

## Goal
- 让 v1b 决策链中**真正需要人的节点**（N2 约束档案 / N5 选切片 / N7 题目契约物化）可在桌面工作台内由人审完成，且与 harness（codex/fixture/provider）运行时**兼容共存**——人审是 runtime 的一种 `human_delegated` 输入，走 harness、不绕 harness、产出同一 authority artifact。
- 把 v1b 工作台从"全段只读窗口"升级为"读 + 三个人审决策点可操作"，对齐 v1a/v1c 已有的 reviewer-workbench 口径。

## Non-goals
- 不重新引入被刻意删除的 v1b legacy direct-write 路由（`…/selection-decisions`、`…/disposition-decisions`、`/topic-packages/drafts`）；这些由 `topic-selection-v1b-routes.integration.test.ts` 的 `'legacy write routes are not registered'` 测试钉死成 404，本任务必须保持其 404。
- 不给 N8（value-assessment，model-like）、N9（value-disposition，deterministic）、N10（draft-package，deterministic）加人审写入——它们在 UI 只读是**正确**的。
- 不改 v1a/v1b/v1c 的授权契约 / 数据模型 / 决策链语义（与 T-088 non-goal 一致）。
- 不实现 multi-agent debate（属 T-089 范围）。
- 不做 N1/N3/N4/N6/N11 的生成/闸门动作 UI（agent/deterministic 域）。

## Context（评估结论，as-verified 2026-06-03）
- **v1b 是单写入口**：所有节点写入只走 `POST /topic-selection/v1b/workflow-harness/nodes/:nodeId/invocations` → `controller.ln` → `TopicSelectionV1bWorkflowHarnessService`。v1a 式的人审 direct-write 路由在 v1b 已被删除（404 测试钉死）。
- **节点本质分类**（决定哪些该接人审）：
  - 自动/确定性：N1 intake-snapshot、N3 intake-readiness、N9 value-disposition、N10 draft-package、N11 publish-bundle（`allowed_execution_modes` 含 `['none']` 或纯 deterministic）→ 只读正确。
  - model-like（LLM/codex 生成）：N4 slice-options、N6 question-candidates、N8 value-assessment → 只读 + 触发重生成属 agent 域。
  - **human_delegated 可**：**N2、N5、N7** → 当前 UI 无人审入口（本任务目标）。
- **N5 frozen_input 所需的 N4 lineage hash 可从持久化状态取到**（无需重跑 N4）：
  - `research_slice_option_set_hash`（=N4 `authority_hash`）已持久化在 option-set 记录的 `comparison_payload.authority_hash`，`findOptionSetById` 可取；N5 handler 本身就读它回来自校验（service ~L2643 写、~L2727 读）。
  - `n4_handoff_hash` 已作为 control-plane artifact 持久化（N4→N5 handoff，`handoff_ref`），可取回或 `this.hash(handoff)` 重算；handoff 必须进 N5 的 `source_refs`。
  - canonical 哈希 `this.hash`（`stableStringify`+sha256）是可复用 service 方法。
  - 残留细节：由 `option_set_id` 反查 `handoff_ref` 的路径需在 Phase 0/1 收口（最坏在 option set 上补存 `handoff_ref` 或加 getter）。
- **运行时底座在建**：`T-088` workflow-runtime-foundation **in-progress**（non-goal: "Do not make desktop UI changes" / 不改授权契约）；`T-089` agent-workflow-review 在定节点 agent/debate/human 分类（non-goal: "Do not add UI"）。→ v1b 人审进 UI 不属于 T-088/T-089，是独立工作，但依赖的契约稳定，可独立推进（须与 T-088 对齐 harness service 改动边界）。

## Acceptance criteria (high level)
- [ ] 人可在 UI 内完成 **N5 选切片**：选定一个 option → 产出合法 `ResearchSlice` + `SliceSelectionDecision`（与 harness 产物一致），全程走 `harnessService.ln`。
- [ ] 同模式覆盖 **N7**（题目契约物化）与 **N2**（约束档案）的人审入口。
- [ ] 人审路径用 `human_delegated` / `authority_input_provider`，与 harness（codex/fixture）路径**并存不冲突**；同一 option set 二者择一驱动。
- [ ] 不破坏既有不变量：`'legacy write routes are not registered'` 仍 404；harness-native N1–N11 链路与 offline-replay 仍绿。
- [ ] N8/N9/N10 维持只读；N9/N10 不暴露人审写入。
- [ ] `pnpm typecheck` / desktop build / 后端 v1b 套件无回归；新增 service 单测覆盖成功 + hash-mismatch + 陈旧 option-set 负例。
