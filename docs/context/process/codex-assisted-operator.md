# Codex-assisted research operator

This note fixes the current meaning of `codex_assisted` for API-first research operation and
separates externally authored operation from product-driven CLI execution.

## Current runtime truth

- `codex_assisted` is a product execution mode, not a requirement to run inside the Codex desktop
  app. The backend accepts an externally produced, contract-shaped `codex_response` and records its
  workflow, attempt, hash, approval, and reuse provenance.
- The separate `codex_cli` executor has an app-owned runner, fresh attempt threads and persisted
  execution traces. Its qualified sampling, extraction, need-discovery, N6/N7-admission/N8 and exact-delta profiles admit product mode.
  Other topic-selection profiles remain closed; `codex_assisted` still means external output.
- The current operator path is Codex calling the canonical local HTTP APIs directly. GUI actions,
  writing-center work, direct database access, and a parallel workflow state file are outside this
  path.

## Product-driven CLI operation

N6/N7-admission/N8 canonical harness `invocations` and coordinator `advance` consume
`execution_spec: { execution_mode: "codex_cli", model_option_id: null }`. This branch defaults to
`product`, compiles frozen research/evidence through existing owners, and generates its own outputs.
It cannot be combined with caller drafts or Debate answers. Other coordinator execution modes/nodes
remain reserved. The default registry admits the 11 profiles used by this slice; no registry override
is needed. Sampling and evidence/need discovery/adjudication/confirmation add nine enabled profiles through their v1a entries
below; three evidence-convergence and two optional Arena roles bring the total to 25. Other selection/promotion roles remain closed.

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

Domain finalization has its own persistent claim. A concurrent CLI request receives 409 until the
winner finishes, then the same request can replay the protected completion. If interrupted after
domain writing starts but before completion is recorded, inspect persisted authority before any new
attempt; the product does not automatically repair or repeat that ambiguous write. Both successful
and blocked CLI completions support exact replay. Caller-authored audits or traces cannot establish
CLI execution or completion.

N7 consumes the CLI setting to generate `n7_n8_debate_admission_review` support on initial and
N8-feedback entry. Its mechanical contract selection and Human boundary remain unchanged;
completed entry requests reuse their support and gate results.

At the question-checkpoint `n6_refinement_delta_debate` recovery frontier, coordinator `advance`
also consumes the N7 CLI setting. It recovers the exact persisted Human refinement and executes
Explorer → Critic → Arbiter without caller role answers. A substantive unchanged delta with material
findings stays blocked; the model cannot repair Human fields. An admitted review reuses the current
contract and opens a fresh pending Human checkpoint. Canonical no-op refinement needs no CLI setting.
The support artifact's audit is a deterministic derivation record linking all three real CLI role
outputs, audits and traces; it is not an extra model invocation. Completed reviews remain bound to
the exact source decision/delta and runtime identity, including when reused at a later node attempt.
A supported result may request more evidence or block an unchanged overclaim. Model completion
and draft admission do not establish scientific readiness or authorize a Human decision. The external
operator paths below remain available under their separate provenance contract.

## Upstream integration boundary

`POST /topic-selection/v1a/resource-samples` supports product CLI with
`execution_spec: { execution_mode: "codex_cli", submission_id: "your-stable-request-id" }`.
Do not supply a provider `model` or non-null model option. The app-owned runner records its actual
model identity and invokes each batch once. Calls without the spec retain the provider behavior.

Reuse the same submission ID and input after a lost response: a completed sample is replayed, or an
already prepared sample is committed without another model call. A changed request under that ID
returns a conflict. If preparation was interrupted or still running, the response refuses automatic
execution; inspect retained workflow/CLI traces before deliberately choosing a new submission ID.
A new ID is a new paid operation. The CLI profile requires a configured runner; it never falls back
to a provider. Sample readiness does not establish evidence sufficiency or a Human research decision.


### Evidence extraction and need discovery

The native endpoint is `POST /topic-selection/v1a/workflow-harness/nodes/<node_id>/invocations`.
Use the normal envelope with `workflow_run_id`, `node_attempt_id`, `title_card_id` and `policy_version`;
inside `scenario_input`, set `execution_mode: "codex_cli"`, `run_mode: "product"`,
`output_schema_version: "v1"`, and the normal scenario ID. Eligibility is controlled by the default
profile registry; a configured runner is required.

- `topic-selection.v1a.build-evidence-map.v1`: supply the preceding persisted `search_run_handoff`.
  The product resolves original stored abstracts or exact `fulltext_paragraph` refs already bound
  to the SearchRun and compiles extraction context. Do not supply an
  extraction draft/context or an external model answer. Abstract source ID/URL and checksum must
  match the frozen search inputs. Generated summaries, missing source provenance and unresolved
  bound paragraphs are refused. Bound paragraphs must resolve uniquely within their literature, match their
  stored document/paragraph checksums and have one bound literature source. Unselected paragraphs
  are excluded; section/document wildcard reads are unsupported. Abstract output retains its warnings.
- `topic-selection.v1a.generate-need-candidate.v1`: supply the current `evidence_map_ref`, its
  `evidence_strength_ref`, exact `search_snapshot_refs` / `resource_snapshot_refs`, topic scope and
  the normal exploration/arbiter request payloads. Create the strength assessment through its existing
  API first. The product replaces evidence digests/tables with resolved original quotes and complete
  strength/conflict records. Use `profile_id: "topic-selection.generate-need-candidate.single-agent.v1"`
  and `executor_kind: "single_agent"` or `"multi_agent_debate"`. Debate runs two Explorers, one Critic,
  issue framing and final synthesis through Codex. Critic reads both actual Explorer proposals; final
  reads recorded summaries and the issue frame. Exact role identity and complete output references are
  checked, and a failed required worker stops subsequent calls. No role execution overrides or caller answers are
  accepted on this node. To persist admitted candidates, supply `persist_admitted_candidates: true`
  and a `persistence_context` whose SearchRun, SearchPlan and literature-snapshot refs exactly match
  the current evidence map. A mismatch is rejected before model execution. Candidate
  admission/persistence and Human confirmation keep their usual gates.
  A model-selected portfolio may retain substantive parked alternatives; model preference is not
  Human approval. Mechanism axes describe source-grounded distinctions, with unknown axes left null.
  The existing gap checkpoint still requires genuinely distinct viable alternatives and exact Human
  comparison; a second rewording does not satisfy it. The product shares repeated source excerpts
  while preserving all quote/locator bindings, including during single-agent compression. An intact
  evidence context that exceeds the existing budget stops before model work.

Reuse the exact workflow/node-attempt identity and request after a lost response; completed results
replay without another model invocation. Changed input or an unfinished claim returns 409. Inspect
retained model/domain artifacts before creating a new attempt after an interrupted commit; unlike
sampling, this node does not automatically resume partial domain writes. An `expand_evidence` or
`stop_without_candidate` result is a valid non-advancing conclusion, not a confirmed research need.

### Need adjudication and Human confirmation

The same v1a native endpoint accepts `execution_mode: "codex_cli"`, `run_mode: "product"`
and stable workflow/node-attempt IDs for these single-agent consumers:

- `topic-selection.v1a.validate-need-adjudication.v1`: supply the selected `need_candidate_ref`
  and exact evidence-map/search-plan/search-run/literature-snapshot refs. Existing fresh readiness
  and support-packet creation remain the default; use `readiness_packet_mode` and
  `support_packet_mode` set to `consume_explicit_ref` with their corresponding refs to consume
  an existing frozen packet. The model receives the selected original excerpts and the frozen
  strength/conflict records. Abstract-only readiness blockers still apply; unreadable, stale or
  manual-only sources cannot be replaced silently. Do not supply `adjudication_actor`,
  `fixture_human_decision` or a model answer. High-risk recommendations stop for Human review.
- `topic-selection.v1a.human-confirm-need.v1`: supply the exact adjudication, candidate,
  support-packet and reserved-ValidatedNeed refs plus the user's `confirmation_input`. Codex checks
  that input's alignment, required checks and risk coverage. Existing gap-checkpoint and advisory
  review bindings remain required where the app's checkpoint policy applies. Model review cannot
  author the confirmation, accept omitted risks or bypass a checkpoint. Only a confirmed result
  can proceed to the deterministic `publish-v1b-input-bundle` node.

Use the registered default profiles; external `mocked_output`/`codex_response`, a different executor
or profile and acceptance-mode CLI requests are rejected. Completed or blocked submissions replay
their exact receipts without another model call. Changed input requires a new attempt; an unfinished
claim first requires inspection of retained model and domain records, including any already written
Human decision. No automatic recovery of a partial confirmation write is promised.

### Evidence convergence

Use the existing retrieval request and evidence-map successor endpoints to admit exact retrieved
claims and publish a successor. Then `POST /topic-selection/evidence-convergence/linked-rounds`
accepts `execution_mode: "codex_cli"` with the existing predecessor Arena, successor EvidenceMap,
EvidenceDelta, issue and accounting fields. Supply exactly three `role_inputs` in order:
`opportunity_scout`, `empirical_skeptic`, `synthesis_arbiter`. Each contains `participant_role` and
`evidence_packet_artifact_ref`; omit model output and fixture/operator labels.

The backend verifies packets against repository originals, runs both independent first passes,
then gives their actual bodies to the Arbiter. The existing deterministic checkpoint remains the
Human boundary. `remain_unresolved`/`evidence_expansion_required` is a legitimate conclusion, even
when the checkpoint is eligible for Human review.

Replay the same input for an exact completed or blocked result. A changed request or partially
written claimed round cannot silently run again; inspect its retained model, role and transcript
records first. Existing convergence limits apply between CLI roles and before checkpoint creation;
`boundary_exhausted_unresolved` cannot advance. These checks do not interrupt an active role before
its separately configured runner deadline.

### Optional candidate Arena

`POST /topic-selection/research/arena/shadow/run` accepts `execution_mode: "codex_cli"` for the
current open gap-portfolio Arena. Keep the existing session/workflow/attempt identity, complete
candidate-ref pool and exactly two `role_inputs` (Scout and prior-art topic killer). Each role input
contains its `role_slot_id`, `participant_role` and ready `evidence_preparation`; omit structured
output and fixture/operator labels. The preparation must resolve against repository originals and
the Arena snapshot’s evidence-map scope.

The backend runs independent first passes and preserves disagreement in its advisory synthesis.
A Scout proposal requires reframing before candidate selection. Neither an advisory recommendation
nor a pending gap checkpoint records Human acceptance. Replay the exact completed request to obtain
its persisted response without another model call. A different request or interrupted claim needs
inspection; a synthesized session’s missing checkpoint can use the existing gap-projection recovery
endpoint. This optional support does not imply Arena decision-quality activation.

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
