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
| Should a materially refined question bypass the regular N6 Debate because its original candidate already passed N6? | Direct N9→N7 is cheaper, but lets changed claims, metrics, thresholds, baselines, and evaluation design avoid adversarial convergence; a full N6 restart would unnecessarily reopen candidate and slice selection. | Classify the refinement delta deterministically. Route substantive changes through exactly one bounded N6 delta Debate over changed fields, then N7; allow mechanical-only changes to proceed directly to N7. Freeze the selected candidate, slice, evidence ceiling, and Human authority. | confirmed | User | User direction after inspecting the real N9→N7 recovery result | FIND-024 revises the Phase 5 target and requires replanning before further implementation or N8 execution. |

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
- Approach: Treat the deterministic N9 decision and its frozen `loopback_target_ref` as the route authority; do not add a second human/model judgment or infer a different disposition.
- Planned changes:
  1. Emit a typed handoff and registered route for each recoverable non-advance disposition.
  2. Classify the human refinement delta against the previous contract: changes to question, claim, metrics, thresholds, baselines, or evaluation design route through one bounded N6 delta Debate; mechanical-only changes may proceed directly to N7.
  3. Keep the selected candidate, slice, evidence ceiling, and human payload frozen across Debate; make coordinator retry/resume consume the exact N9 decision, delta hash, support artifacts, target ref, and hashes idempotently.
  4. Make a strict-human question checkpoint `loopback` emit the same actionable recovery route rather than leaving N8 exposed.
  5. Preserve terminal behavior for `park` and `drop`, and preserve the existing N10 path only for `advance_to_package`.
  6. Add focused recovery, single-pass Debate, mechanical-bypass, replay, stale-target, wrong-target, and no-N8-leak tests.
- Affected boundaries / entry points: N9 disposition gate, route policy, run coordinator, N7/N5/evidence-search re-entry contracts.
- Dependencies: Phase 1 classifies the intended owner for each non-advance disposition.
- Exit criteria: TSRF-11 and TSRF-13 pass without weakening deterministic N9, reopening candidate selection, or creating a second authority gate.
- Verification: Real `refine_question` round-trip plus focused coordinator/harness integration tests for substantive delta Debate, mechanical bypass, and strict-human loopback recovery.
- Recovery: Restore terminal stop behavior while preserving recorded N9 decisions; never delete disposition authority.
- Implementation checkpoint (2026-09-02): The earlier authorized N9 `refine_question`→N7 slice is implemented and exercised, but it is now only a partial recovery path. It created replacement contract `topic_question_contract_97c59cf9-5aa2-4826-bd97-56d0a730b0cd` without re-reviewing its substantive delta at N6. Exact loopback decision `research_checkpoint_decision_c7c82712-8b2e-4d91-a123-37de25ea84e2` then closed the new checkpoint, but emitted no Debate handoff and left the coordinator pointing at N8. FIND-024 invalidates direct N9→N7 as the complete target for substantive refinements; no further route-dependent implementation or N8 execution is authorized until the revised design is planned and approved. Other non-advance owners (`refine_slice`, evidence recheck) remain unchanged.

### Phase 6 — Re-run the real workflow and disposition adjacent gaps
- Outcome: The fixed module completes the same reject-and-replace path with decision-ready output, while adjacent gaps have explicit owners.
- Approach: Repeat the bounded real flow through the evidence-landscape checkpoint and review all acceptance references.
- Planned changes:
  1. Verify rejection, replacement, lineage isolation, locators, strict-human blocking, and decision recovery.
  2. Review the human stage view against the packet, N8 assessment, N9 disposition, and evidence source statements.
  3. Evaluate retriever use by query intent, retrieval/provider call count, evidence delta, and decision effect at each literature-dependent step.
  4. Verify that `refine_question` has an executable, replay-safe route back to its owning contract boundary before any package path resumes.
  5. Propose separate tracked work for any still-material backup or workload capability gap.
- Affected boundaries / entry points: End-to-end topic-selection path through the evidence-landscape checkpoint.
- Dependencies: Phases 2 through 5; exact human decisions remain user-owned.
- Exit criteria: TSRF-04 through TSRF-06 and TSRF-12 pass; no material in-scope finding remains open.
- Verification: Rehearsal evidence packet and clean focused checks.
- Recovery: Preserve immutable decision lineage and use only new replaceable rehearsal records.

## Kickoff gate

- Status: pending
- Authorized boundary: none
- [x] Decisions: The deterministic N9 disposition remains route authority; substantive refinements require one bounded delta Debate, mechanical-only edits may bypass it, and candidate/slice selection stays frozen.
- [ ] Design: Settle the deterministic delta classifier, one-pass Debate support contract, N6/N7 handoff, strict-human loopback recovery, and no-N8-leak behavior without adding another authority gate.
- [ ] Route: Obtain explicit implementation authorization for the revised Phase 5 route; the previous direct N9→N7 authorization is exhausted and no other phase is authorized.
- [ ] Verification: Add focused red-green coverage for substantive delta Debate, mechanical bypass, exact replay, stale/wrong-target rejection, strict-human loopback recovery, and unchanged terminal/advance dispositions.

## Risks and recovery

| Risk | Detection | Mitigation | Recovery / rollback |
|---|---|---|---|
| A presentation fix creates a second decision authority. | Human view values cannot be traced to the checkpoint packet. | Derive all view content from canonical packet and referenced EvidenceMap records. | Revert the projection; preserve packet authority. |
| “Open risk” and “material conflict” have intentionally different meanings. | Contract definitions show non-equivalent semantics. | Record the distinction and change wording rather than collapsing fields. | Drop the semantic merge and keep only a clearer explanation. |
| Real-flow tests leave durable noise or require provider spend. | Fixture inventory grows or a provider action is requested. | Use bounded local replaceable records; require explicit authorization and cost disclosure before provider actions. | Remove only clearly owned fixtures through supported APIs if authorized. |
| Adjacent findings cause scope creep. | Planned work touches backup infrastructure or experiment implementation. | Stop at evidence-backed disposition and open a separately approved task. | Return this task to topic-selection-owned boundaries. |

## Phase closeout

- Review: User reviews finding dispositions, project placement, and any proposed follow-up split before implementation.
- Record update: Keep `01-status.md`, `findings.md`, architecture, and verification synchronized with confirmed scope and evidence.
- Checkpoint: After approval, create a task-linked commit containing only this task bundle and its governance projection.
