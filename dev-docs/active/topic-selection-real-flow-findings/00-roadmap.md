# Roadmap

## Scope and constraints

### In scope
- Reproduce and classify findings from the 2026-09-01 real topic-selection run.
- Make the evidence-landscape and research-question human views substantively useful at their strict-human checkpoints.
- Keep risk/conflict language consistent across the checkpoint packet and human stage view.
- Align the public EvidenceMap request contract with the accepted runtime payload.
- Diagnose why directly overlapping 2026 adaptive-budget and retrieval-utility papers were absent from the evidence landscape, and make unresolved coverage risk visible at the human checkpoint.
- Observe whether every literature-dependent convergence loop actually invokes a retriever, separates local retrieval from provider work, and changes the evidence state rather than merely repeating reads.
- Make bounded N6 Debate a regular part of topic-question candidate convergence rather than a failure-only recovery path.
- Route substantive post-N9 question refinements through one bounded N6 delta Debate before N7 rematerialization while allowing mechanical-only edits to remain direct.
- Make non-advance N9 dispositions recoverable through one explicit upstream route, and keep post-N8/N9 human/status projections aligned with the current value authority.
- Ensure evidence-landscape eligibility consumes required coverage outcomes, so a retriever-backed `missing` row cannot silently look satisfied merely because adjacent EvidenceUnits exist.
- Add focused verification for the successful controls and failure/recovery paths observed in the run.
- Record and disposition adjacent operational or experiment-asset limitations without silently expanding this task.

### Out of scope
- Advancing, rejecting, or otherwise deciding the active research topic on the user's behalf.
- Building the per-query marginal-utility experiment or extending the SciFact workload.
- Designing a repository-wide backup system unless discovery proves that topic-selection durability owns that requirement.
- Broad redesign of the topic-selection UI, workflow DAG, or research methodology.

### Constraints and dependencies
- Canonical product APIs remain the authority; verification must not use direct database writes or reads.
- Strict-human checkpoints remain decision authority. Human views and summaries are read projections, not a new authority source.
- Rejected checkpoint `research_checkpoint_4fa82ea5-d030-4b4e-affc-36a53da4b83c` and its decision lineage are immutable; replacement work must use the fresh root `title_card_e80b4a40-544c-41c6-9c12-a80428c6604f`.
- Historical rejected evidence is tied to EvidenceMap `evidence_map_2388bad8-5ced-4dce-8b3c-ba9bd7367fda` and packet hash `adbceb89fbdafc5b2f349d6e551373fd07dcb1afdf88b9b59f996cf03d380d28`; it cannot be presented as current replacement-topic evidence.

## Decision alignment

| Decision question | Options / tradeoffs | Current direction | Status | Owner / required confirmation | Closure evidence | Consequences |
|---|---|---|---|---|---|---|
| Which Feature owns this work? | Existing `F-001 Research Lifecycle Governance Core` keeps checkpoint and stage-view reliability together; `F-000` defers placement. | Propose `F-001`. | proposed | User | Explicit placement confirmation | Mapping remains `F-000` until confirmed. |
| Should adjacent backup and workload limitations be implemented here? | Including them broadens the task across operational durability and experiment assets; separate follow-ups preserve ownership. | Classify here, implement only topic-selection-owned defects, propose follow-ups for the rest. | proposed | User after Phase 1 evidence | Finding disposition review | Prevents one rehearsal task from becoming an unbounded platform project. |
| Should N6 Debate remain conditional on candidate failure? | Failure-only escalation is cheaper, but lets a consequential single-agent recommendation reach N7 without routine adversarial review; a bounded regular Debate adds convergence cost but tests framing, overlap, and value axes before contract materialization. | Make Debate a regular N6 component; keep deterministic gate admission and reserve deeper escalation for exceptional cases. | confirmed | User | User direction after reviewing the N6/N7 path | FIND-018 enters the product-fix route and the implementation must preserve bounded cost and replayability. |
| What exact refinement contract should resolve N9 `refine_question`? | Primary metrics, safety/quality thresholds, coverage, and benchmark-validity checks must be fixed by the researcher rather than inferred by the operator. | Brier Score primary with ECE/NLL secondary; harmful-routing rate at fixed coverage primary with AURC secondary; task-quality degradation capped at 1 percentage point; coverage at least 90% of the frozen router; two real replacement environments with paired same-query evaluation, disjoint calibration/test splits, matched-budget strong baselines, and a no-shift control. | confirmed | User | Exact acceptance of the complete refinement proposal | The Human-authority content is settled. It must be materialized only through the supported Phase 5 N9 recovery route; the task record is not a substitute for TopicQuestionContract authority. |
| Should a materially refined question bypass the regular N6 Debate because its original candidate already passed N6? | Direct N9→N7 is cheaper, but lets changed claims, metrics, thresholds, baselines, and evaluation design avoid adversarial convergence; a full N6 restart would unnecessarily reopen candidate and slice selection. | Classify the refinement delta fail-closed. Every content-bearing field in the current refinement schema is substantive and receives exactly one bounded delta Debate; only canonicalization-neutral/no-op edits bypass Debate and do not mint a replacement contract. Freeze the selected candidate, slice, evidence ceiling, and Human authority. | implemented | User | Focused green checks plus real replay of decision `research_checkpoint_decision_c7c82712-8b2e-4d91-a123-37de25ea84e2` | FIND-024 is closed for the approved Phase 5 slice: the substantive replay ran exactly one three-role delta Debate, reused the exact current N7 contract, opened a fresh checkpoint, and never executed N8. |

### Assumptions

| Assumption | Risk if wrong | Validation |
|---|---|---|
| The human stage view is intended to be sufficient for a human checkpoint decision without an operator reconstructing source statements manually. | The task could over-specify presentation responsibilities. | Check stage-view product contract, current UI consumer, and acceptance language before design approval. |
| The material-conflict/no-open-risk mismatch is projection logic rather than an intentional distinction. | A legitimate semantic boundary could be erased. | Trace both fields to their canonical definitions and record the settled distinction. |
| EvidenceMap OpenAPI omissions are accidental contract drift. | Expanding the schema could expose fields meant to remain internal. | Compare route schema, service input, API authority, and supported client usage. |

## Task relationships

| Task | Relationship from this task | Owned boundary / exchanged contract | Coordination condition |
|---|---|---|---|
| T-149 | depends-on follow-up | T-149 owns FIND-008's native-vector persistence and failed-literature recovery; this task owns the topic-selection rehearsal and consumes the restored retrieval-ready paper. | T-149 returns the recovered `LIT-2297` owner and zero-provider-replay evidence before this task continues the replacement-topic evidence path. |

## Implementation plan

### Phase 1 — Reproduce and classify the rehearsal findings
- Outcome: Each recorded finding has decisive reproduction evidence, severity, an owning boundary, and a disposition.
- Approach: Replay only read projections and bounded replaceable topic-selection fixtures; compare human views, packets, API schemas, and runtime behavior.
- Planned changes:
  1. Reproduce FIND-001 through FIND-004 and FIND-008 through FIND-013, diagnose FIND-007, and confirm which are product defects.
  2. Validate PASS-001 through PASS-007 so fixes preserve controls that already worked.
  3. Classify FIND-005 and FIND-006 as in-scope defects, dependencies, or follow-up candidates.
- Affected boundaries / entry points: Evidence-landscape stage view, research checkpoint packet/status, EvidenceMap request contract, real-flow verification harness.
- Dependencies: Local backend, replaceable test data, canonical API documentation.
- Exit criteria: Every finding has an evidence-backed disposition; no implementation route depends on an unverified premise.
- Verification: API projection comparison, contract inspection, and focused reproduction records in `verification.md`.
- Recovery: Read-only discovery is reversible; remove only task-owned replaceable fixtures if later authorized and clearly identified.

### Phase 2 — Repair decision presentation and risk semantics
- Outcome: A human can understand the evidence landscape, active research question, and their material risks directly from stage views without consulting raw IDs.
- Approach: Keep the checkpoint packet canonical and improve its deterministic human projection; avoid introducing a parallel summary authority.
- Planned changes:
  1. Present substantive evidence and decision implications in the human view.
  2. Make conflict and risk language follow settled checkpoint semantics.
  3. Make required `missing` coverage outcomes visible and prevent them from becoming implicitly eligible without an explicit accepted-risk or obligation path.
  4. Present the actual main question and its answerability warnings, gaps, dependencies, and falsifiers at the question checkpoint.
  5. Project current N8 value readiness, N9 disposition, and material risk findings instead of leaving checkpoint-era status and “no open risks” text current.
  6. Add focused projection and gate tests for eligible, conflicted, required-missing, answerable-with-risk, and terminal-refinement states.
- Affected boundaries / entry points: Human evidence-landscape projection and its UI/API consumers.
- Dependencies: Phase 1 semantic decisions.
- Exit criteria: TSRF-01, TSRF-02, TSRF-09, and TSRF-12 pass without weakening strict-human gating.
- Verification: Deterministic projection tests plus a real-flow human review.
- Recovery: Revert the projection change while retaining canonical packet records.

### Phase 3 — Align the EvidenceMap API contract
- Outcome: An API client can construct the accepted runtime payload from the public contract alone.
- Approach: Reconcile the authoritative OpenAPI request schema with the existing validated route and service contract.
- Planned changes:
  1. Document supported evidence-unit provenance and review fields.
  2. Document structural links, clusters, patterns, conflict sets, digest payload, and enums.
  3. Add a drift check that fails when the documented and runtime request contracts diverge materially.
- Affected boundaries / entry points: `POST /topic-selection/v1a/evidence-maps` and API contract checks.
- Dependencies: Phase 1 confirms the intended public surface.
- Exit criteria: TSRF-03 passes and focused request examples validate against both schemas.
- Verification: OpenAPI validation, route-schema tests, and a paragraph-locator request.
- Recovery: Revert documentation/schema changes without changing persisted evidence records.

### Phase 4 — Make N6 Debate a regular convergence component
- Outcome: Every normal N6 candidate-generation path receives bounded Explorer/Critic/Arbiter review before a recommendation can be materialized by N7.
- Approach: Reuse the implemented divergent-loop runtime and existing N6 gate; choose the smallest bounded default that preserves deterministic admission, replay identity, and a distinct deeper-escalation path.
- Planned changes:
  1. Route initial N6 candidate generation through a bounded regular Debate rather than waiting for failure-only `n6_debate_escalation`.
  2. Preserve the existing single N6 authority gate and make role outputs support-only until the arbiter draft passes it.
  3. Keep cost, role arity, trigger/escalation semantics, and non-provider/provider provenance visible and testable.
- Affected boundaries / entry points: N6 coordinator, divergent-debate runtime, Codex-assisted invocation path, N6 trace and handoff.
- Dependencies: Phase 1 confirms current happy-path behavior and the smallest safe default Debate profile.
- Exit criteria: TSRF-10 passes without duplicating the N6 gate or weakening N7 and strict-human checkpoints.
- Verification: Initial-path Debate integration tests plus the real-flow N6-to-N7 trace.
- Recovery: Restore conditional routing while retaining the existing divergent-loop runtime and recorded evidence.

### Phase 5 — Make non-advance N9 dispositions recoverable and convergence-complete
- Outcome: `refine_question`, `refine_slice`, and evidence-recheck decisions stop packaging while exposing one supported route to the owning upstream boundary; a substantive question refinement completes one bounded delta Debate before N7 rematerialization.
- Approach: Treat the deterministic N9 decision and an exact strict-human question-checkpoint loopback as route authorities. Insert a support-only delta-review frontier before N7 without re-running the candidate-set authority gate, reopening N5/N6 selection, or allowing a model to edit Human content.
- Planned changes:
  1. Keep the existing `N9ToN7RefinementHandoff@v1` readable and authoritative; add an additive reviewed-refinement input mode and a typed `N6RefinementDeltaDebateAdmission@v1` support contract instead of rewriting persisted N9 decisions.
  2. Classify against the previous contract with a fixed field map. All currently accepted update fields (`main_question`, claims, evaluation setting, metrics, baselines/comparisons, dependencies, gaps, and risks) are substantive. Only changes erased by canonical normalization are mechanical/no-op; they reuse the current authority and never rely on punctuation or model judgment to bypass review.
  3. Add one bounded delta scenario over the shared Debate core: one Explorer, one Critic, and one Arbiter. Roles may inspect or challenge the frozen delta, but the arbiter can only `admit_unchanged` or `block_with_findings`; it cannot rewrite the Human payload or create candidate/contract authority.
  4. Bind admission to the workflow run, source N9 or checkpoint decision, previous and proposed contract hashes, refinement id and payload hash, selected candidate, ResearchSlice, evidence ceiling, role transcript, and policy version. Cache/reuse the exact admission by route-source plus delta hash; a blocked unchanged delta cannot spend another Debate pass and requires a new Human refinement hash.
  5. Require the admitted support on substantive N7 re-entry. N7 validates all bindings and materializes the exact Human payload. For the already-materialized rehearsal contract, N7 uses an idempotent reviewed-existing mode: verify that the active contract is exactly the persisted refinement result, reuse it rather than minting a duplicate contract, then reopen the strict-human checkpoint.
  6. Make the question checkpoint a coordinator barrier. `pending`/`hold`/`reject` suppress N8; `advance` releases N8; `loopback` on the exact active contract exposes the delta-Debate recovery frontier. Recover the rehearsal's original Human payload from the persisted N7 trace rather than asking the researcher to resubmit it.
  7. Reuse the existing topic-selection provider calls, model options, and role-family policies. Add only delta-specific prompt/output contracts needed for the different semantic task; keep `provider_llm` dormant and use Codex-assisted or mocked role outputs until the separate provider release gate is approved.
  8. Preserve terminal behavior for `park` and `drop`, preserve N10 only for `advance_to_package`, and leave `refine_slice`/evidence-recheck owner routes outside this approved slice.
  9. Implement test-first at stable seams: coordinator checkpoint barrier and current-decision recovery; delta classification; role admission and forbidden-authority checks; exact-once/replay behavior; N7 binding/current-contract reuse; stale/wrong-target rejection; unchanged terminal/advance dispositions; and no N8 leakage.
- Affected boundaries / entry points: N9 disposition gate, route policy, run coordinator, N7/N5/evidence-search re-entry contracts.
- Dependencies: Phase 1 classifies the intended owner for each non-advance disposition.
- Exit criteria: TSRF-11 and TSRF-13 pass without weakening deterministic N9, reopening candidate selection, or creating a second authority gate.
- Verification: Real `refine_question` round-trip plus focused coordinator/harness integration tests for substantive delta Debate, mechanical bypass, and strict-human loopback recovery.
- Recovery: Restore terminal stop behavior while preserving recorded N9 decisions; never delete disposition authority.
- Approved implementation checkpoint (2026-09-02): The earlier N9 `refine_question`→N7 slice remains backward-compatible input lineage, but direct materialization is no longer the complete substantive route. The user approved the executable delta-Debate design above and authorized its narrow implementation plus focused verification. The first red seam is the current failure: exact loopback decision `research_checkpoint_decision_c7c82712-8b2e-4d91-a123-37de25ea84e2` must project a delta-Debate frontier and must not expose N8. No provider activation, new Human decision, Phase 4 regular-N6 routing, other Phase 5 owner route, or N8 execution is included in this authorization.
- Implemented checkpoint (2026-09-02): The coordinator now enforces the exact-contract checkpoint barrier, recovers and fail-closed classifies the persisted refinement, runs one support-only Explorer/Critic/Arbiter delta Debate for substantive changes, and validates its hash-bound admission before N7 exact current-contract reuse. The real loopback replay opened fresh pending checkpoint `research_checkpoint_40ddf095-4d28-4844-bdfc-11aaff0ba6ee` without adding an N8 attempt; retriever/provider counts were 0/0 because the bounded disagreement concerned the frozen experiment contract rather than missing literature.
- N8 recovery checkpoint (2026-09-02): After the researcher advanced the fresh checkpoint, the first refined-contract N8 attempt exposed FIND-025: its N7 projection carried legal refinement audit hashes, but the N8 runtime enforced an initial-path-only exact key set. The authorized correction keeps the core source hashes and refs mandatory and byte-matched, validates every additional value as a hash, and allows additive audit keys. A focused red/green runtime test plus the exact real-run retry admitted assessment `topic_value_assessment_257ba79c-a281-4c22-b327-96c6bedb98ed` and exposed N9 without retriever or provider work.
- N9 disposition checkpoint (2026-09-02): One deterministic `max_steps=1` advance consumed the current 73-point N8 assessment, admitted decision `value_disposition_decision_22e9b282-5609-42a8-bf93-c6be2360cb69` as `advance_to_package` with the value-gate risks carried forward, and emitted handoff `artifact_ref_7f7c19f9-5d11-495d-bb65-1dca1c0fbd1d`. The run stopped at N10 with zero topic packages and zero retriever/provider calls.
- N10 packaging checkpoint (2026-09-02): One deterministic `max_steps=1` advance created TopicPackage `topic_package_ab6a7f4f-18b1-4aa0-9cb6-addba7c0c5c1` at readiness `ready_for_promotion_review`, preserved 25 material risk findings and 20 key risks with zero blockers, and emitted handoff `artifact_ref_aef8236e-80eb-42b2-b733-47934e8dc553`. The transaction prepared v1c bundle `v1b_to_v1c_input_bundle_9d685a2e-76ea-4263-ad6b-a0ba7a0931ce`, but N11 publication remains unexecuted; retriever/provider counts were 0/0.
- N10 content-review checkpoint (2026-09-02): The package passes trace/readiness checks but is not yet decision-ready prose. Its two title candidates are a full research question and a `method:`-prefixed full claim, five non-goals are repeated as ten semantically duplicate strings, and deterministic sentence assembly produces `..`. FIND-026 records the missing narrative-quality boundary; do not publish N11 until the researcher dispositions that finding.
- FIND-026 implementation decision (2026-09-02): The researcher authorized repair before N11. N10 title candidates derive from the ResearchSlice statement rather than question/claim prose, the current TopicQuestionContract is the non-goal display authority, sentence assembly normalizes terminal punctuation, and the readiness boundary rejects malformed narrative. Recovery uses fresh N9 and N10 attempts for the same assessment and atomically marks the prior package, research record, and v1c bundle superseded before one deterministic N11 publication.

### Phase 6 — Re-run the real workflow and disposition adjacent gaps
- Outcome: The fixed module completes the same reject-and-replace path with decision-ready output, while adjacent gaps have explicit owners.
- Approach: Repeat the bounded real flow through the evidence-landscape checkpoint and review all acceptance references.
- Planned changes:
  1. Verify rejection, replacement, lineage isolation, locators, strict-human blocking, and decision recovery.
  2. Review the human stage view against the packet, N8 assessment, N9 disposition, and evidence source statements.
  3. Evaluate retriever use by query intent, retrieval/provider call count, evidence delta, and decision effect at each literature-dependent step.
  4. Verify that `refine_question` has an executable, replay-safe route back to its owning contract boundary before any package path resumes.
  5. Propose separate tracked work for any still-material backup or workload capability gap.
  6. Repair FIND-026 at the N10 narrative/readiness boundary, replay only the required N9→N10 recovery path, verify stale package/bundle supersession, and publish the corrected bundle through N11 once.
- Affected boundaries / entry points: End-to-end topic-selection path through the evidence-landscape checkpoint.
- Dependencies: Phases 2 through 5; exact human decisions remain user-owned.
- Exit criteria: TSRF-04 through TSRF-06, TSRF-12, and TSRF-14 pass; no material in-scope finding remains open.
- Verification: Rehearsal evidence packet and clean focused checks.
- Recovery: Preserve immutable decision lineage and use only new replaceable rehearsal records.

## Kickoff gate

- Status: ready
- Authorized boundary: Phase 5 FIND-024, the directly encountered FIND-025 N8 refinement-projection correction, one refined-contract N8 re-assessment, its deterministic N9 disposition and N10 draft packaging, plus FIND-026 repair, bounded same-assessment N9→N10 recovery, and one deterministic N11 publication. Provider execution, strict-human v1c promotion, Phase 4 regular-N6 routing, and other Phase 5 owner routes remain unauthorized.
- [x] Decisions: The deterministic N9 disposition remains route authority; substantive refinements require one bounded delta Debate, mechanical-only edits may bypass it, and candidate/slice selection stays frozen.
- [x] Design: Use a fail-closed typed field classifier, a distinct support-only one-pass delta scenario on the shared Debate core, an admitted-support N7 precondition, exact persisted-trace recovery, and a coordinator checkpoint barrier.
- [x] Route: The user explicitly approved the executable loopback route, then authorized and continued through FIND-025, N8 re-assessment, N9/N10, and the directly encountered FIND-026 repair plus bounded N9→N10 recovery and one N11 publication.
- [x] Verification: Focused red/green seams cover substantive delta classification, authority immutability, exact replay, current-contract reuse, and additive N8 audit hashes; the real route produced one delta Debate, one N7 reuse, exact checkpoint advance, a current 73-point N8 assessment, a risk-carrying `advance_to_package` N9 decision, and one ready-for-promotion-review N10 package that stops before N11.

## Risks and recovery

| Risk | Detection | Mitigation | Recovery / rollback |
|---|---|---|---|
| A presentation fix creates a second decision authority. | Human view values cannot be traced to the checkpoint packet. | Derive all view content from canonical packet and referenced EvidenceMap records. | Revert the projection; preserve packet authority. |
| “Open risk” and “material conflict” have intentionally different meanings. | Contract definitions show non-equivalent semantics. | Record the distinction and change wording rather than collapsing fields. | Drop the semantic merge and keep only a clearer explanation. |
| Real-flow tests leave durable noise or require provider spend. | Fixture inventory grows or a provider action is requested. | Use bounded local replaceable records; require explicit authorization and cost disclosure before provider actions. | Remove only clearly owned fixtures through supported APIs if authorized. |
| Adjacent findings cause scope creep. | Planned work touches backup infrastructure or experiment implementation. | Stop at evidence-backed disposition and open a separately approved task. | Return this task to topic-selection-owned boundaries. |
| Delta Debate mutates or reselects Human-owned content. | Arbiter output contains revised refinement fields, candidate refs, contract refs, or authority ids. | Use a delta-specific output schema with `admit_unchanged` / `block_with_findings` only and recursively reject authority-bearing keys. | Reject admission; preserve the current contract and wait for a new Human refinement hash. |
| Retry spends multiple Debate passes for the same delta. | More than one admitted/blocked transcript exists for the same route-source and delta hash. | Stable route identity plus persisted exact-replay marker; an unchanged blocked delta is terminal until Human content changes. | Reuse the first result and suppress subsequent role execution. |
| Checkpoint state leaks N8 during recovery. | Run state or advance reports N8 while the current exact-contract checkpoint is pending, held, rejected, or looped back. | Apply a checkpoint barrier before frontier selection and bind decisions to the latest N7 contract ref. | Halt before N8; retain immutable decision and trace lineage while repairing the projection. |

## Phase closeout

- Review: User reviews finding dispositions, project placement, and any proposed follow-up split before implementation.
- Record update: Keep `01-status.md`, `findings.md`, architecture, and verification synchronized with confirmed scope and evidence.
- Checkpoint: After approval, create a task-linked commit containing only this task bundle and its governance projection.
