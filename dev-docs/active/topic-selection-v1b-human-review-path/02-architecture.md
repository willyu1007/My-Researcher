# 02 Architecture

## Design principle
人审 = runtime 的一种 `human_delegated` 输入（项目口径 "runtime ↔ 人审兼容"）。所有人审写入**经 harness、不绕 harness**：与 native runner 同一条 `harnessService.ln` 路径，同套 gate / trace / replay / audit，产出与 codex/fixture 路径一致的 authority artifact。不复活被删的 legacy 直写路由（那是绕过 harness 的并行写路径）。

## Three-layer architecture
```
UI 卡片（N2/N5/N7 交互表单；N8/N9/N10 维持只读）
  │  POST 新语义瘦路由（待定名，见 Open decisions）
  ▼
瘦人审路由  /topic-selection/v1b/research-slice-option-sets/:id/human-selection  （示例：N5）
  │  + 守卫 blockWorkflowHarnessAutomationOnDirectWrite（拒带 harness marker 的自动化 payload）
  ▼
V1bSliceHumanSelectionService（中等：从持久化拼 human_delegated frozen_input + hashes）
  │
  ▼
harnessService.ln(runRequest)   ← 与 native runner 同一路径、同套 gate/trace/audit
  │
  ▼
ResearchSlice + SliceSelectionDecision（authority artifact，与 harness 产物一致）
```

## N5 frozen_input 组装（from persisted state，已验证可行）
run-request 形状（实测样例：`apps/backend/src/routes/topic-selection-v1b-routes.integration.test.ts` L581-616）：

| 字段 | 取值来源 |
|---|---|
| `schema_version` | 常量 `TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_RUN_REQUEST_SCHEMA_VERSION` |
| `node_id` | `'topic-selection.v1b.select-research-slice.v1'` |
| `policy_version` | `'topic-selection-v1b-node-policy-v1'` |
| `workflow_run_id` / `node_attempt_id` | service 生成 |
| `created_by` | `'human'` |
| `frozen_input.input_contract` | `'N4ToN5Handoff@v1'` |
| `frozen_input.snapshot_kind` | `'research_slice_option_set'` |
| `frozen_input.source_refs` | `[optionSetRef, n4HandoffRef]`（handoff 必须在内） |
| `frozen_input.frozen_input_hash` | 可省，service 端 `declaredFrozenInputHash ?? computed` 自算 |
| `…payload.research_slice_option_set_ref` | option set ref |
| `…payload.research_slice_option_set_hash` | **持久化**：`findOptionSetById(id).comparison_payload.authority_hash`（N5 会自校验回比对） |
| `…payload.n4_handoff_hash` | **持久化**：N4→N5 handoff artifact，或 `this.hash(handoff)` 重算 |
| `…payload.authority_input_provider` | `'human_delegated'` |
| `…payload.accepted_selection_payload` | 人审输入构造（见下） |
| `…payload.accepted_selection_payload_hash` | `this.hash(accepted_selection_payload)` |
| `…payload.delegation_artifact_hash` | `null`（纯人审；如走委托代执行再填） |

`accepted_selection_payload`（`TopicSelectionV1bAcceptedSliceSelectionPayload`）：
`decision:'select'`、`selected_option_ref`、`selected_option_hash = hash(option)`、`selection_rationale`（人输入）、`decision_basis:{selected_option_key}`、`confidence`（人输入）、`requires_human_review:false`、`loopback_*:null`、`rejected_option_reasons/required_actions/accepted_risk_refs:[]`。

> N7 / N2 同构：换 node_id、input_contract、snapshot_kind 与各自的 accepted payload；lineage hash 取自各自上游（N7←N6 candidate set，N2←intake snapshot）。

## Boundaries & invariants（必须保持）
- 经 `harnessService.ln`，不直写 authority 表。
- `'legacy write routes are not registered'`（`…/selection-decisions` 等）维持 404。
- harness-native N1–N11 链路 + offline replay 不回归。
- N8 只读（model-like）；N9/N10 只读（deterministic `['none']`）。
- 同一 option set：human_delegated 与 codex/fixture 二者择一驱动，互不并发覆盖。

## Open decisions（已于 2026-06-03 拍板）
1. **D1 — builder 复用**（RESOLVED：复用）：把 test-helper 的 frozen-input/哈希组装提升为可复用后端模块，新 service 与 harness/测试共用同一哈希真相源，避免漂移。
2. **D2 — 路由命名**（RESOLVED：per-node 新语义路径）：`/research-slice-option-sets/:id/human-selection`、`/topic-question-candidate-sets/:id/human-materialization` 等；不得撞被 404 钉死的 legacy 名。
3. **D3 — 时机/范围**（RESOLVED：先只做 Phase 1）：本轮只做后端 `V1bSliceHumanSelectionService` + 单测把"人选 option → 合法 ResearchSlice"证伪；零 UI、尽量不抢改 harness `ln`。Phase 2+（路由/UI/N7/N2）证通后再决定。

## Phase 2 ⑤ — human-node scope CORRECTION + N2 (2026-06-03)

### N7 materialize-topic-question-contract — NOT a human-review node (revised)
- Earlier scoped as a human slice purely because the contract lists `human_delegated` in N7's
  `allowed_execution_modes`. **CORRECTION after reading the handler**: N7 carries **no human
  decision**. `runN7MaterializeTopicQuestionContract` (harness ~L3262) picks the candidate itself
  via `chooseN7Candidate(...)` (~L3317); the Initial frozen-input is just the N6→N7 handoff replay
  + `input_mode` + `n6_handoff_hash` — zero human content. Direction was decided at N5 (human),
  candidates generated at N6 (model); N7 only materialises the chosen candidate into a contract.
  A "human N7" would be a content-free rubber-stamp → unnecessary surface / debt.
- **Decision: N7 stays read-only / harness-owned.** Contract `human_delegated` *allowance* ≠ a
  product *need* for review. (Earlier "no schema change / handoff-replay" design is moot — dropped.)
- Out of scope / future RFC: a *distinct* human "approve the materialised question" REVIEW gate
  before N8 would be a NEW gate, not N7's existing `human_delegated`. Defer.

### N2 record-research-constraint-profile — the real remaining human node ✅ (FOCUS)
- N2 modes `['codex_assisted','human_delegated']`, `authority_kind: 'ResearchConstraintProfile'`.
  Human path = the researcher **authors** the constraint profile (scope / budget / claim ceiling /
  prohibited claims / non-goals) that constrains the whole pipeline. Genuine human INPUT (unlike
  N5's pick or N7's trigger).
- Shape TBC during impl (read the N2 handler + frozen-input payload type): the human-authored
  accepted constraint-profile payload is likely **compact** (closer to N5's accepted-payload than
  N7's handoff-replay). Lineage = N1 intake snapshot (its hash); confirm whether it's retrievable
  from persisted state (like N4's hash) or carried in the bundle.
- Surfaces (confirm during impl): `V1bConstraintProfileHumanService` + a human route under the
  research-constraint-profile / v1b-input-bundle path + a new `ResearchConstraintProfileCard`
  authoring form (no such card today) + e2e (N1 → route → admitted N2). Reuse the canonical hash
  module (single source) for any authority/frozen-input hashes.

### Sequencing note (revised)
v1b human-review surfaces = **N5 (done) + N2 (focus)**. N4/N6/N7/N8 = model-or-mechanical → read-only;
N1/N3/N9/N10/N11 = auto/deterministic → read-only. ⑤ now = **N2 only** (N7 dropped).

## Key risks
- 与 T-088 共改 harness service（`ln`）→ 对齐边界、人审逻辑尽量外置新 service。
- hash lineage 不一致被 gate 拒 → 复用 canonical `hash()`、回填持久化 hash、负例覆盖。
- `handoff_ref` 反查路径未证实 → Phase 0 收口（最坏补 1 个 ref 字段）。
