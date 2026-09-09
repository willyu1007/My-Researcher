# Codex-assisted research operator

This note fixes the current meaning of `codex_assisted` for API-first research operation and
separates the immediate rehearsal from a later product integration.

## Current runtime truth

- `codex_assisted` is a product execution mode, not a requirement to run inside the Codex desktop
  app. The backend accepts an externally produced, contract-shaped `codex_response` and records its
  workflow, attempt, hash, approval, and reuse provenance.
- The separate `codex_cli` executor has an app-owned runner, fresh attempt threads and persisted
  execution traces. Shipped topic-selection profiles still exclude it pending T-153 qualification.
  This does not change the external-output meaning of `codex_assisted`.
- The current operator path is Codex calling the canonical local HTTP APIs directly. GUI actions,
  writing-center work, direct database access, and a parallel workflow state file are outside this
  path.

## Product-driven CLI integration (qualification pending)

N6/N8 canonical harness `invocations` and coordinator `advance` consume
`execution_spec: { execution_mode: "codex_cli", model_option_id: null }`. This branch defaults to
`product`, compiles frozen research/evidence through existing owners, and generates its own outputs.
It cannot be combined with caller drafts or Debate answers. Other coordinator execution modes/nodes
remain reserved. Profiles remain closed until real-input qualification; this is an implemented
consumer contract, not an instruction to bypass eligibility.

N6 runs its existing four-role Debate, including its frozen regeneration contexts. Ordinary N8 uses
one assessment attempt; post-feedback N8 uses the existing bounded Debate. N8 checks the exact
question Human checkpoint before model work. The CLI Debate draft is a deterministic projection
with `debate_derived` provenance pointing to the actual final-role audit; it is not an additional
single-agent invocation. The existing gates remain responsible for advancement.

Configuration uses `TOPIC_SELECTION_CODEX_HOME` (product-owned) and `TOPIC_SELECTION_CODEX_MODEL`.
The existing factory also accepts `TOPIC_SELECTION_CODEX_REASONING_EFFORT`,
`TOPIC_SELECTION_CODEX_TIMEOUT_MS`, `TOPIC_SELECTION_CODEX_BINARY`, and
`TOPIC_SELECTION_CODEX_TRANSPORT` (default `app_server`). Runner shutdown follows backend shutdown.
Completed attempts reuse persisted results; an interrupted claim without a recorded outcome
requires an explicit new attempt identity. Never automatically retry ambiguous metered work.

N7 admission support, exact-delta refinement, and live qualification remain unfinished in this
integration checkpoint. The external operator paths below remain the usable shipped route.

## Regular N6 question candidates

A fresh N5 selection now receives one bounded review: two Explorer responses, one Critic response,
and one Arbiter response over the same frozen N5 evidence. The Arbiter supplies
`synthesized_candidate_set`; the existing deterministic N6 gate still owns candidate admission.

- Through coordinator `advance`, use `node_inputs[N6].debate` with `kind: n6_divergent`,
  `generation_mode: initial_from_n5`, `execution_mode: codex_assisted` and `role_outputs`.
  A bare initial `draft_payload` halts before recording a candidate attempt.
- Through `/topic-selection/v1b/workflow-harness/nodes/{nodeId}/codex-assisted-invocations`,
  N6 accepts `{ request, role_outputs }`. The three keys are `n6_debate_explorer` (two items),
  `n6_debate_critic` (one) and `n6_debate_arbiter` (one). Each item carries `codex_response`
  with `output` and `operator_label`; `output.role_slot` matches its key and
  `output.schema_version` is `TopicSelectionV1bN6DivergentDebateRoleOutput@v1`.
- Reuse the exact attempt, frozen input, execution settings and role responses for replay.
  A completed receipt retains all four role audits, the transcript and the gate-facing draft;
  changed input under that attempt conflicts. Correct a blocked review before retrying.

The four role audits and existing draft-bridge audit are non-provider work; they do not claim
retrieval or provider calls. Provider Debate remains dormant. N7 still stops at the question Human
checkpoint, and role responses cannot author a Human decision. Regeneration/escalation and
refinement delta retain their existing recovery contracts. Low-level acceptance/test draft fixtures
and historical harness replay remain available; new initial product drafts require a Debate receipt.

## Promotion review support

For the frozen promotion input, either `accepted_risk_refs` or material `RiskFinding` refs requires
one bounded N2 Debate. Material refs include the snapshot and source bundle's `risk_finding_refs`
and legacy bundle artifact refs. Free-text package risks are displayed but do not classify material
findings. With neither typed signal, `POST /topic-selection/v1c/promotion-decision-support` defaults
to deterministic support with no role/provider work; its optional single-agent mode remains explicit.

For risk-bearing input, submit `POST /topic-selection/v1c/promotion-decision-support/bounded-debate`
with `promotion_input_snapshot_id`, stable `workflow_run_id`, `node_attempt_id` and `debate_role_outputs`.
The four keys, in execution order, are:

1. `n2_bounded_micro_debate.promotion_supporter_draft`
2. `n2_bounded_micro_debate.reviewer_critic_review`
3. `n2_bounded_micro_debate.promotion_supporter_repair`
4. `n2_bounded_micro_debate.synthesizer_final`

Each output uses its matching `role_slot`. The first three use schema version
`topic-selection-v1c-n2-bounded-micro-debate-role.v1`; the final uses
`topic-selection-v1c-n2-bounded-micro-debate-final.v1`. Final `n3_semantic_layer` must preserve
accepted risks, recheck obligations and critic resolutions, plus every material finding under
`material_risk_acknowledgements.risk_refs`. These acknowledgements do not resolve findings or
confirm promotion conditions.

The final also supplies `condition_candidates`, covering the exact union of material findings,
accepted risks, memory suggestions and recheck refs. Group related refs under concrete typed
verification actions; every ref belongs to exactly one group. Each candidate has `condition_id`,
`condition_code`, `refs`, `required_action` (`action_code`, `severity`, `loopback_target`, `refs`,
`reason`), nonempty `early_check_obligations`, and optional `verification_note`. IDs/codes/actions
must be unique; the group and its action carry identical exact refs, with no invented or stale refs.
Place supporting evidence context in the semantic layer. Each early check names what to inspect
and when. No candidate contains an `owner` or Human confirmation.

Read the groups from `promotion_dossier.dossier_payload.condition_candidates`; LLM support also
retains them in `promotion_decision_support.llm_draft_payload.condition_candidates`. They remain
advisory in the N3 handoff. The Human edits the groups, assigns each `owner` and submits the exact
`conditions` at N4. N4 does not copy candidates automatically: omitted risk mappings still fail
with `UNMAPPED_PASS_WITH_RISK_FINDING`, before PromotionDecision/commitment persistence. A condition
cannot waive an unresolved recheck gate. The deterministic fast path offers mechanical memory and
recheck proposals when these are carried; an input with no such refs returns an empty group list.

The endpoint records four product `codex_assisted` role audits under existing per-role budgets,
with zero backend provider calls and no automatic retry/fallback. External authoring cost remains
external; a zero-provider audit does not claim that authoring was free. The dossier exposes
`support_policy` and `debate_execution`, including the admitted identity and four role artifacts.
Reuse exact frozen input and request for completed replay; changed input under the same attempt
returns 409. Concurrent callers sharing the gate service share one execution; this is not a
cross-process claim or interrupted-provider recovery protocol.

Submit the returned support ID to `POST /topic-selection/v1c/promotion-gate-checks`. Required Debate
cannot be bypassed through ordinary support, single-agent support or the combined compatibility
gate-create request. Legacy support lacking Debate evidence cannot create a new material-risk gate;
existing gate replay stays historical. N3 owns deterministic readiness, and N4 still requires the
exact Human decision. Correct rejected role output before retrying; never infer Human consent from
admitted support. New N3 checks also reject missing/inconsistent condition coverage; regenerate support
under a new attempt after a legacy support refusal. Completed gate replay stays historical.
Provider activation remains separate work.

## Current rehearsal

The first small real-project rehearsal uses one fresh lineage and the maintained SciFact assets.
Historical owner records are precedent only.

```text
profile: scifact-retrieval-depth
intent: compare retrieval top-k 10 with top-k 5 under the frozen SciFact setup
metric: micro_recall_ppm
support: top-k 10 minus top-k 5 >= 10,000 ppm
contradiction: top-k 10 minus top-k 5 <= -10,000 ppm
otherwise: inconclusive
claim ceiling: fixed SciFact exact-token retrieval setup only
literature scope: ai-rag-finetuning-2022-2026
initial evidence basket: LIT-0328, LIT-0190, LIT-0252, LIT-0765
```

The route is:

```text
retrieval-ready literature snapshot
  -> literature and evidence convergence
  -> research-gap selection and Human-confirmed need
  -> research-question convergence and research-value assessment
  -> topic package
  -> promotion review and Human-confirmed PaperProject bridge
  -> CoreMotive and Evidence Board
  -> ValidationCycle and WorkOrder
  -> fresh two-cell Run and local workflow simulation
  -> separately authorized provider execution, if requested
  -> scientific validation and bounded Claim/Dossier state
```

Codex may prepare structured semantic support. It must stop for research-need adjudication,
constraint and slice acceptance, promotion review, confirmatory review, every provider/cost action,
and destructive/control actions. The rehearsal stops before writing-center or prose-generation
work.

## Deferred product integration

A later product slice may replace the client-owned conversational boundary with a transport-neutral
Codex operator adapter. The preferred durable integration is Codex App Server or the Codex SDK,
with `codex exec` retained for bounded one-shot nodes rather than treated as the workflow owner.

The minimum correlation contract is:

```text
operator_run_id
codex_thread_id
codex_turn_id
title_card_id or paper_project_id
workflow_run_id
node_attempt_id
last_completed_node
pending_human_decision
selected_artifact_refs
updated_at
```

The adapter may start, resume, or fork Codex threads, but it must reconstruct research truth from
product owners and immutable artifacts. Codex conversation history is execution context, never a
second source of research authority. This adapter is deliberately outside the current rehearsal;
open a bounded implementation task only after the API-first flow has produced concrete recovery
and operability evidence.
