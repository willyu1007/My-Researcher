# Codex-assisted research operator

This note fixes the current meaning of `codex_assisted` for API-first research operation and
separates externally authored operation from product-driven CLI execution.

## Current runtime truth

- `codex_assisted` is a product execution mode, not a requirement to run inside the Codex desktop
  app. The backend accepts an externally produced, contract-shaped `codex_response` and records its
  workflow, attempt, hash, approval, and reuse provenance.
- The separate `codex_cli` executor has an app-owned runner, fresh attempt threads and persisted
  execution traces. Its qualified sampling, extraction, need-discovery, N2/N3/N5 support, N4/N6/N7-support/N8 and exact-delta profiles admit product mode.
  Delegated decision candidates and downstream feedback are also qualified; `codex_assisted` still means external output.
- The current operator path is Codex calling the canonical local HTTP APIs directly. GUI actions,
  writing-center work, direct database access, and a parallel workflow state file are outside this
  path.

## Product-driven CLI operation

N3-support/N4/N6/N7-support/N8 canonical harness `invocations` and coordinator `advance` consume
`execution_spec: { execution_mode: "codex_cli", model_option_id: null }`. This branch defaults to
`product`, compiles frozen research/evidence through existing owners, and generates its own outputs.
It cannot be combined with caller drafts or Debate answers. Other coordinator execution modes/nodes
remain reserved. The default registry admits the 16 profiles used by this coordinator slice; no registry override
is needed. Sampling and evidence/need discovery/adjudication/confirmation add nine enabled profiles through their v1a entries
below; three evidence-convergence, two optional Arena roles and N2/N5 Human-input support bring the total to 32. Ordinary promotion, risk Debate, delegated decision candidates and feedback complete all 36 topic-selection profiles.

N4 accepts the same CLI execution spec on its frozen `N3ToN4Handoff@v1` request. The runtime loads
N1 intake, Human constraints, N3 readiness and the original role-bound evidence. Its model draft
passes through the existing option gate: a selectable recommendation stops at N5 Human selection;
insufficient evidence or infeasible options can request evidence expansion, scope revision or stop.
No option is selected by the CLI. Draft receipts bind the original evidence, prompt and execution
identity; a completed model attempt can recover a missing generation receipt without another call.

N2 and N5 can request optional CLI review through the canonical harness `invocations`: keep the
exact accepted Human payload and its hash, `authority_input_provider: "human_delegated"`,
`profile_id: null` and add the CLI spec above. Do not supply semantic artifacts or a model answer.
The model reads the original evidence, constraints/option portfolio and actual risk records; the
domain write still uses the accepted Human fields. N5 `request_more_options` preserves the Human
loopback. Coordinator advance continues to stop for N2/N5; existing Human routes remain available.
N3's same opt-in spec reviews actual rechecks and accepted-risk coverage, while the deterministic
readiness gate decides advancement. Without an opt-in, all three keep their existing behavior.

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

N6/N7 accept optional `cli_support_slots` alongside the CLI execution spec, both on canonical
invocations and inside coordinator `node_inputs[N6 or N7]`. The array must be nonempty and unique;
external drafts, support answers, Debate answers and refinement payloads cannot accompany it.

- N6 accepts `["n6_loopback_triage"]`. It invokes triage only when the generated portfolio has an
  actual semantic candidate failure, passing the failed draft, gate reasons and original evidence.
  Admitted portfolios and technical/structural refusals do not spend a triage call. Omission keeps
  the existing fallback. Triage recommends recovery; the deterministic gate chooses the route.
- N7 omission preserves `n7_n8_debate_admission_review`. An explicit array runs only the selected
  roles in its order: `n7_candidate_grouping`, `n7_n8_debate_admission_review`, and/or
  `n7_failed_trial_synthesis`. Grouping requires a remaining candidate; synthesis requires all
  candidates to have exhausted semantic trials. Technical N8 failure requires N8 recovery, and
  gate-rejected feedback accepts only admission review. Exact Human refinement recovery uses the
  separate frontier below and does not accept this array.

N7 reads original evidence and the complete frozen trial chain, including available contracts,
plans, assessments, reasoning memos and evidence bodies. Missing assessments stay explicit.
Scientific content is preserved while duplicate operational fields are omitted after validation.
Grouping can order admitted candidates but cannot establish scientific superiority or bypass the
question Human checkpoint. Failed-trial synthesis retains every failed candidate for N6 recovery.

Completed requests reuse support and gate results. A common reservation prevents switching role
sets or switching between omitted and explicit slots under an existing attempt; use a new attempt
identity for changed work. Missing outer receipts recover completed role receipts without another
model call. Historical completed N7 requests from the former 18k context target replay only when
the original request/runtime identity and protected completed gate trace match; an unfinished
request cannot bypass a changed context policy. New targets are 32k for grouping/admission, 48k for
synthesis and 40k for N6 triage, within the existing 128k window. These are per-context limits.

Ordinary N8 uses a 28k input target, matching the initial Debate assessor. Completed N8 gates
from the former 22k target retain exact replay only when the protected completion and every other
request, source, prompt, model and runner identity match. An old uncommitted output cannot use
this compatibility path; context overflow still stops before model execution.

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
  stored document/paragraph checksums and have one bound literature source. The normal content parser
  stores normalized fulltext in a managed file; extraction reads that file when inline text is absent
  and verifies the whole-document checksum plus the bound paragraph's checksum and containment.
  A missing or changed file is refused before model execution. Unselected paragraphs
  are excluded; section/document wildcard reads are unsupported. Abstract output retains its warnings.
- `topic-selection.v1a.generate-need-candidate.v1`: supply the current `evidence_map_ref`, its
  `evidence_strength_ref`, exact `search_snapshot_refs` / `resource_snapshot_refs`, topic scope and
  the normal exploration/arbiter request payloads. Create the strength assessment through its existing
  API first. The product replaces evidence digests/tables with resolved original quotes and complete
  strength/conflict records. Use `profile_id: "topic-selection.generate-need-candidate.single-agent.v1"`
  and `executor_kind: "single_agent"` or `"multi_agent_debate"`. Debate runs two Explorers, one Critic,
  issue framing and final synthesis through Codex. Critic reads both actual Explorer proposals; final
  reads recorded summaries and the issue frame. Exact role identity and complete output references are
  checked against each recipient's supplied context before recording its role output or calling the
  next role. Changed title/version scope or legacy metadata is refused with the model audit retained;
  inspect an unfinished claim before using a new attempt. A failed required worker stops subsequent calls. No role execution overrides or caller answers are
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

With the app checkpoint policy enabled, read the current checkpoint through
`GET /topic-selection/title-cards/:titleCardId/research-status` and its
`GET /topic-selection/checkpoints/:checkpointId/packet`. Before candidate persistence, the researcher
must review the evidence landscape and submit the exact `target_snapshot_hash` as
`confirmed_snapshot_hash` to `POST /topic-selection/checkpoints/:checkpointId/decisions`.
An evidence update requires review of the new snapshot.

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

For the gap checkpoint, carry the current whole-pool hash in
`confirmation_input.gap_selection_review.confirmed_candidate_pool_hash`, the exact selected
candidate version and a review of every candidate. Compare substantive research differences;
having two drafts does not establish two viable alternatives. Stale snapshots, omitted candidates
or missing required risk/check acceptance are refused. Publication preserves the confirmed
candidate's evidence and risks; exact repeated publication returns the same frozen bundle.

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
with `promotion_input_snapshot_id`, stable `workflow_run_id`, `node_attempt_id` and
`execution_spec: { execution_mode: "codex_cli", model_option_id: null }`. Do not supply external
`debate_role_outputs`, operator labels, model options or caller budget/compression overrides. The
product launches four fresh CLI turns over the frozen scientific input, original evidence, actual
risk records and verified prior-role bodies. Ordinary support accepts the same CLI fields on its
endpoint when neither typed risk signal is carried; omission preserves the deterministic fast path.
The explicit `codex_assisted` compatibility path still accepts all four `debate_role_outputs`.
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

CLI records actual runner/model/thread identity, trace, structured output and per-role admission.
Stable IDs bind the full frozen input, original context, prompt, runtime profile and runner. A
completed model call or four-role chain recovers an interrupted support-bundle commit without
another paid call; exact completed requests replay the same support. A changed request or identity
under the same attempt returns 409. An unfinished paid attempt remains blocked for inspection; a
new attempt is an explicit new execution. The dossier exposes support policy and Debate provenance.
No automatic model fallback or upstream progression is introduced. External authoring on the
assisted path remains outside backend model-cost accounting.

Submit the returned support ID to `POST /topic-selection/v1c/promotion-gate-checks`. Required Debate
cannot be bypassed through ordinary support, single-agent support or the combined compatibility
gate-create request. Legacy support lacking Debate evidence cannot create a new material-risk gate;
existing gate replay stays historical. N3 owns deterministic readiness, and N4 still requires the
exact Human decision. Correct rejected role output before retrying; never infer Human consent from
admitted support. New N3 checks also reject missing/inconsistent condition coverage; regenerate support
under a new attempt after a legacy support refusal. Completed gate replay stays historical.
Other generation providers remain outside this Codex rollout.

## Codex promotion candidate and Human acceptance

After N3, generate a reviewable candidate with
`POST /topic-selection/v1c/promotion-decisions/delegated/candidates`:

```json
{
  "promotion_gate_check_id": "<returned gate ID>",
  "workflow_run_id": "<stable workflow ID>",
  "node_attempt_id": "<stable candidate attempt ID>",
  "execution_spec": { "execution_mode": "codex_cli" }
}
```

The backend reads the frozen scientific/evidence context and actual gate, support and dossier.
The N4 model packet replaces only duplicated role-audit objects and runtime admission metadata
with their hashes. Scientific prose, critic resolutions, risks, conditions and lineage remain in
the packet; the complete canonical dossier and its audit records remain unchanged in storage.
The response contains `candidate`, `candidate_receipt_ref`, `candidate_hash`, `candidate_artifact`
and `human_review_required: true`. Generating or replaying it does not write a Human decision.
Review its rationale, decision, required actions and conditions. The model cannot assign a Human
condition owner or establish that research resources, novelty or scientific value are verified.

After explicit Human review, submit to
`POST /topic-selection/v1c/promotion-decisions/delegated`:

```json
{
  "promotion_gate_check_id": "<same gate ID>",
  "workflow_run_id": "<same workflow ID>",
  "node_attempt_id": "<same candidate attempt ID>",
  "candidate_receipt_ref": { "ref_type": "artifact_ref", "ref_id": "<returned receipt ID>", "title_card_id": "<returned title ID>" },
  "confirmed_candidate_hash": "<exact returned candidate_hash>",
  "human_actor": { "actor_type": "human", "actor_id": "<explicit Human ID>" },
  "condition_owners": [],
  "promote_reconfirmed": true
}
```

Copy the complete returned receipt ref, including any additional identity fields. For a candidate
with conditions, replace the empty array with exactly one `{ "condition_id": "<candidate ID>",
"owner": { "actor_type": "human", "actor_id": "<assigned Human ID>" } }` per condition.
A promote-class decision requires `promote_reconfirmed: true` from that Human; it is not inferred
from the candidate. For a non-promote decision the field may be omitted. The actor is an explicit
local API assertion, not an authenticated identity provided by this endpoint.

Acceptance consumes the reviewed candidate unchanged. If the Human changes the substantive decision
or conditions, use the existing direct Human decision endpoint with the exact gate/snapshot and
complete decision input. Do not edit the candidate receipt or hash. Accepted non-promote decisions
remain non-promoting; only an eligible Human decision can feed the existing PaperProject bridge.
Neither CLI endpoint accepts an externally authored `codex_response`.

Retry an interrupted candidate-receipt write with identical generation input: completed model output
is reused. Completed acceptance replays the same Human authority. Changed gate, context, prompt/runtime
or request identity under the same attempt returns conflict. An unfinished model claim requires
inspection before an explicit new attempt. Oversized full context blocks before model execution;
the CLI path cannot compress away scientific bodies into references alone.
A saved candidate's original context representation remains usable across the audit-only projection
upgrade: the product verifies its protected context and exact equivalence, including audit hashes.
Original evidence or audit changes still refuse admission; an unfinished model claim cannot rerun
merely because the context representation changed.

## PaperProject intake recovery

The existing bridge intake endpoint reserves a persistent bridge-scoped submission before creating
its project. A completed bridge replays the attached project; it does not create another. The complete
Human checkpoint chain is checked again before both first intake and replay.

If project creation partially writes or stops before attachment, the retained claim refuses another
creation. Inspect the bridge and its workflow artifacts together with existing PaperProjects; do not
change the title or invent a new request to bypass the pending claim. An attachment that succeeded
but lost its response is recovered from the existing refs. The service retains ambiguous projects
for inspection rather than deleting potentially attached work. Selected evidence and obligations
remain in the bridge working copy and returned handoff; generic project creation currently does not
copy the evidence-ID array into a separate PaperProject evidence record.

## Codex downstream feedback

With an existing PaperProject bridge, send the raw downstream report to
`POST /topic-selection/v1c/downstream-feedback/normalize`:

```json
{
  "paper_project_bridge_id": "<existing bridge ID>",
  "workflow_run_id": "<stable workflow ID>",
  "node_attempt_id": "<stable feedback attempt ID>",
  "execution_spec": { "execution_mode": "codex_cli" },
  "downstream_source_kind": "reviewer_check",
  "downstream_source_ref": { "ref_type": "artifact_ref", "ref_id": "<report artifact ID>" },
  "source_feedback_refs": [],
  "observed_blocker_refs": [],
  "artifact_refs": [],
  "raw_feedback_text": "<original report text>"
}
```

Use complete current source refs and include supporting report/blocker artifacts in the appropriate
arrays. The runtime reads the bridge's full working copy, commitments and Human controls, then
normalizes the submitted report. Caller observations are not independently verified facts.
The existing deterministic owner records feedback and creates a recheck only when required.
The response includes `classification`, `recheck_request`, `impact_summary`, candidate provenance
and the feedback record. A `no_recheck_needed` result records feedback without creating a recheck.
The endpoint does not advance the workflow or automatically execute its suggested loopback.

Exact completed requests replay without another paid call or duplicate feedback. An interrupted
candidate artifact write reuses completed model output; an ambiguous partial feedback/recheck write
fails closed. Inspect existing feedback and recheck authorities before deciding recovery; do not
bypass a pending submission by inventing another attempt. Changed inputs require an explicit new
execution once prior state is resolved. External answers and caller-supplied classification are rejected.

## Reproducible CLI workflow verification

`apps/backend/src/routes/topic-selection-v1b-routes.integration.test.ts` contains
`T-153 CLI product HTTP composes managed sources through intake and feedback without caller role answers`.
Run it from the repository root with:

```bash
pnpm --dir apps/backend exec node --import tsx --test --test-name-pattern='T-153 CLI product HTTP' src/routes/topic-selection-v1b-routes.integration.test.ts
```

The test uses the real application owners and a controlled external CLI process. Public APIs prepare
managed fulltext and a Human-curated dossier, then execute extraction, need discovery, adjudication,
confirmation support, v1b options/N6/N8, risk-bearing promotion, Human acceptance, bridge/intake and
feedback. Sixteen model calls are supplied at the process boundary; no request supplies role answers.
Exact question and promotion Human stops remain enforced. Synthetic source/readiness and Human
choices establish API composition, not research approval or real-model reasoning quality.

For persistence verification, provision a disposable local PostgreSQL database with the repository
migrations. Set DATABASE_URL to that database's public schema, T153_PRODUCT_HTTP_DATABASE to its name
(`t153_p5_` followed by 12 lowercase hexadecimal characters), and set RESEARCH_LIFECYCLE_REPOSITORY,
TITLE_CARD_REPOSITORY, APPLICATION_SETTINGS_REPOSITORY and AUTO_PULL_REPOSITORY to `prisma` before
running the same test. It reconstructs the app, replays all four upstream CLI nodes, verifies the
frozen publication, rereads the created PaperProject and replays intake without another project.
The test refuses a nonlocal or mismatched database; its synthetic records persist until the
operator removes that disposable database. Its temporary source/content files are removed on exit.

T-153 verification records the completed PostgreSQL run plus separate real Codex qualifications
for all 36 enabled profiles, including optional sampling/convergence/Arena/support and recovery
branches outside this advancing chain. Full GUI operation, autonomous Human decisions and downstream
PaperImplementation execution are separate capabilities.

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
