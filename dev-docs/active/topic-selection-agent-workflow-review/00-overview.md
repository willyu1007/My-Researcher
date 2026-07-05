# 00 Overview

## Status
- State: planned
- Progress: **现状对账（2026-07-05，随 T-088 对账切片落账）**——本包 05 月已交付主体资产：06 矩阵（已迁永久 SSOT `docs/context/process/topic-selection-workflow-matrix.md`，T-123 Phase 0 完成实现对齐+一致性脚本进默认套件）、07 节点策略、08 场景登记、09/10/11/12 专项。live-surface 分类切片被 T-128 W-08 吸收并完成（2026-07-02：consistency 2/2、分类对齐 SSOT 无 re-fork、LLM 槽 policy 无空洞）。
- Progress: **活跃 backlog（承 T-128 W-08 移交 + T-088 对账移交，2026-07-05 首次落本包账面）**：
  - ① 矩阵语义列（`executor_kind`/`default_execution_mode`/`debate_primitive`/`human_*`）接入一致性脚本（依赖②——SSOT 矩阵自述这些列"非契约可导出"故未校验，先有结构化导出才能校验）；
  - ② v1c 统一 `TOPIC_SELECTION_V1C_NODE_POLICIES` 结构化导出（v1a/v1b 已有对应物：`topic-selection-v1a-workflow-harness-contracts.ts` / `topic-selection-v1b-node-policy-contracts.ts`，v1c 缺）；
  - ③ `covered_scenarios` 机器校验（含 T-088 D-28 新约束：新增 topic-selection acceptance 脚本必须在本包 `08-scenarios.md` 登记 scenario 条目，scenario 台账↔脚本映射纳入机器校验）；
  - ④ 穷举式 dormant/边缘节点复核（W-08 只覆盖产品跑真实穿越节点）；
  - ⑤（T-088 对账移交 2026-07-05）v1a N6 supplemental 轮**跨执行自动化**语义裁决——现状：debate loop 单次执行一轮（`round_index` 入参），arbiter 路由 `run_supplemental_round` 时以节点状态上浮、调用方重入触发；D-22 已锁路由语义与轮次预算，「是否自动编排 2/3 轮」属工作流语义裁决（涉 runtime↔human-review 共存原则），归本包。
- Task ID: `T-089`
- Feature / Milestone / Requirement: `F-001` / `M-001` / `R-009`
- Depends on: `dev-docs/active/topic-selection-workflow-runtime-foundation/`
- Trigger: after v1b/v1c deep tests, the open design question is not whether every node can call an LLM, but which nodes deserve ordinary agent workflow, which deserve multi-agent debate, and which should be executed by Codex-assisted operator workflow instead of direct provider calls.

## Goal
- Review every topic-selection link from resource sampling through v1a/v1b/v1c and paper-project bridge.
- Clarify ordinary agent workflow semantics: node owner, inputs, outputs, blocking conditions, retry policy, profile, and audit.
- Decide where multi-agent debate is valuable, define the debate roles and model/profile choices, and reject debate where deterministic or single-agent workflow is enough.
- Define where Codex can substitute for direct LLM API calls during local/product acceptance, including structured prompt packets, operator responses, and audit labels.

## Non-goals
- Do not implement the runtime primitives owned by T-088.
- Do not add UI.
- Do not change existing v1a/v1b/v1c contracts until the review produces approved deltas.
- Do not create open-ended debate for every step.

## Acceptance Criteria
- [ ] A node-by-node workflow matrix exists for resource sampling, v1a need/evidence, v1b topic question/value/package, v1c promotion/bridge, and downstream recheck.
- [ ] Each node is classified as deterministic, ordinary single-agent, multi-agent debate, human review, or Codex-assisted acceptance.
- [ ] For each proposed debate node, roles, model/profile choices, inputs, turn limits, resolution rule, blocker rule, and audit artifact are specified.
- [ ] For each rejected debate node, the reason is recorded.
- [ ] Codex-assisted execution boundaries are explicit and distinguish local acceptance from product runtime.
- [ ] Every matrix node has a node policy covering blockers, validators, execution permissions, authority boundary, audit/artifact policy, and failure semantics.
- [ ] Every matrix node references at least one registered `WorkflowScenario`.
- [ ] The output is ready to become implementation tasks without semantic ambiguity.
