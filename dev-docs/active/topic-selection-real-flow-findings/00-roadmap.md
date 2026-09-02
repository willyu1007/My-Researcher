# Roadmap

## Scope and constraints

### In scope
- Reproduce and classify findings from the 2026-09-01 real topic-selection run.
- Make the evidence-landscape and research-question human views substantively useful at their strict-human checkpoints.
- Keep risk/conflict language consistent across the checkpoint packet and human stage view.
- Align the public EvidenceMap request contract with the accepted runtime payload.
- Diagnose why directly overlapping 2026 adaptive-budget and retrieval-utility papers were absent from the evidence landscape, and make unresolved coverage risk visible at the human checkpoint.
- Make the entire accessible indexed literature library the default retrieval universe for topic work; topic snapshots preserve reproducibility and priority, not a hard whitelist of eligible papers.
- Separate the evidence process from its result: RetrievalRequests, SearchRuns, candidate evidence, and Debate drive convergence, while each EvidenceMap is an immutable result snapshot created after that convergence.
- Observe whether every literature-dependent convergence loop actually invokes or explicitly reuses a retriever-backed result, separates retrieval from provider work, and changes the evidence state rather than merely repeating reads.
- Let Debate roles issue structured `RetrievalRequest`s without a fixed request-count limit; coordinate, deduplicate, cache, and stop by evidence convergence rather than an arbitrary numeric cap.
- Make bounded N6 Debate a regular part of topic-question candidate convergence rather than a failure-only recovery path.
- Decide whether v1c promotion support should use its implemented bounded Debate on the regular N2 path, then align the runtime route, public contract, operator runbook, and provenance with that policy.
- Make `promote_with_conditions` decision support propose a complete, typed risk-to-condition mapping for human review without weakening the strict unmapped-risk gate.
- Route substantive post-N9 question refinements through one bounded N6 delta Debate before N7 rematerialization while allowing mechanical-only edits to remain direct.
- Make non-advance N9 dispositions recoverable through one explicit upstream route, and keep post-N8/N9 human/status projections aligned with the current value authority.
- Ensure evidence-landscape eligibility consumes required coverage outcomes, so a retriever-backed `missing` row cannot silently look satisfied merely because adjacent EvidenceUnits exist.
- Compose gates, Debate, and loopback as one resolution system: every material failure names its owning upstream route, required evidence or semantic delta, and recheck condition.
- Use human-readable research-stage names in user-facing copy and operating guidance; keep versioned node and API identifiers as internal technical references only.
- Add focused verification for the successful controls and failure/recovery paths observed in the run.
- Record and disposition adjacent operational or experiment-asset limitations without silently expanding this task.

### Out of scope
- Advancing, rejecting, or otherwise deciding the active research topic on the user's behalf.
- Building the per-query marginal-utility experiment or extending the SciFact workload.
- Designing a repository-wide backup system unless discovery proves that topic-selection durability owns that requirement.
- Wholesale renumbering or replacement of existing internal workflow nodes when the agreed behavior can be composed over their current authority boundaries.

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
| Should bounded Debate be part of the regular promotion-review support path? | The default deterministic path is cheaper, but it bypasses the already implemented four-role review; always-on Debate raises cost even for clean packages, while a material-risk trigger makes the behavior conditional but explicit. | Discuss whether to require one bounded pass whenever the input carries material risk findings, while allowing a documented deterministic fast path only for risk-free inputs. The gate remains the sole decision authority. | proposed | User | Explicit policy choice followed by route/OpenAPI/runbook alignment | Closes FIND-027 without creating a second promotion gate or assuming that promotion review must copy the research-question trigger policy verbatim. |
| How should conditional promotion cover pass-with-risk findings? | Manual raw-ref enumeration is exact but operator-heavy; weakening the gate is simpler but unsafe; typed condition candidates can preserve exact coverage while leaving wording and acceptance to the researcher. | Have promotion support and argument-readiness checks propose grouped condition candidates with complete risk-finding refs and early-check obligations; the human may edit or reject them, and the final promotion decision still fails closed if any finding is unmapped. | proposed | User | Approval of the decision-support contract | Closes FIND-028 while preserving explicit Human authority and the successful zero-partial-write guard. |
| What is the default literature universe for topic convergence? | A frozen topic whitelist is reproducible but suppresses recall; copying the full library into every topic duplicates state; a full-library retrieval view preserves recall while SearchRuns freeze what was actually consulted. | Search the entire accessible indexed library by default. Topic, recency, and collection signals may boost ranking but do not exclude otherwise eligible literature unless the researcher explicitly narrows scope. | confirmed | User | Explicit statement that the whole library is process fuel and should support RAG comprehensively | FIND-029 enters the current route; resource snapshots become reproducibility/provenance inputs rather than hard retrieval boundaries. |
| Is EvidenceMap process state or result authority? | Mutating one map as retrieval proceeds is convenient but destroys checkpoint meaning; freezing every transient candidate creates noise. | EvidenceMap is an immutable convergence result used for recording and replay. RetrievalRequest, SearchRun, candidate evidence, and Debate artifacts own the implementation process; new evidence produces a successor map. | confirmed | User | Explicit EvidenceMap/result and literature-library/process distinction | The map stays result-focused and auditable without constraining the searchable corpus. |
| How many retrieval requests may a Debate issue? | A fixed cap is predictable but can terminate before evidence converges; unlimited uncoordinated calls can repeat work. | No fixed request-count limit. All roles may request retrieval; a shared coordinator deduplicates and reuses equivalent work, and the loop stops on semantic convergence, no material evidence delta, an explicit Human decision, or an external execution boundary. | confirmed | User | Explicit rejection of a request-count limit | FIND-030 must be implemented with convergence controls rather than a mechanical quota. |
| How do gates, Debate, and loopback relate? | Independent gates detect failure but cannot repair it; standalone Debate produces commentary without authority routing; unconstrained loopback can repeat forever. | Treat them as one system: the gate identifies an unresolved condition, Debate diagnoses and requests evidence or semantic repair, loopback routes to the owning stage, and the same gate rechecks the declared delta. | confirmed | User | Explicit agreement that the three mechanisms must be composed | FIND-031 becomes the central orchestration correction; no material blocker may be emitted without a supported resolution route. |
| What terminology should users see? | Internal version/node names are precise for code but opaque to researchers. | Use literature and evidence convergence, research-gap selection, research-question convergence, research-value assessment, and promotion review in user-facing surfaces; retain version labels only in internal contracts and diagnostics. | confirmed | User | Explicit request not to expose v1a/v1b-style language | FIND-032 enters the presentation and operator-contract route. |
| What happens when the managed library cannot resolve a required evidence gap? | Stopping at the local library is predictable but may miss decisive work; automatic external discovery improves recall but adds acquisition, provenance, and cost policy. | Default to full managed-library retrieval first; settle the automatic external-discovery fallback before implementation. | proposed | User | Explicit fallback policy | Kickoff remains pending because this choice changes the retrieval coordinator's boundary. |

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

### Completed rehearsal foundation
- The real run produced a traceable reject-and-replace lineage, exercised strict Human authority, closed the missing question-refinement recovery route, repaired the refinement audit-hash and package-narrative defects, published the corrected package, and created an active conditional-promotion bridge.
- Those completed repairs remain current and verified. The next route changes how evidence is gathered and challenged before later gates; it does not rewrite historical decisions or EvidenceMaps.

### Phase 1 — Make the full literature library the retrieval substrate
- Outcome: Topic convergence searches every accessible indexed paper by default, while explicit researcher scopes remain enforceable and every consulted result is replayable.
- Approach: Replace implicit topic-snapshot whitelisting with a full-library retrieval view. Preserve corpus/index identity and actual hits in SearchRuns rather than copying the entire library into each topic.
- Planned changes:
  1. Locate every resource-pool and topic-scope guard that currently excludes otherwise eligible library records.
  2. Make topic, collection, recency, and prior-selection signals ranking inputs unless an explicit Human scope makes them filters.
  3. Define the typed RetrievalRequest lifecycle and bind each request to its originating claim, Debate issue, evidence snapshot, search intent, freshness/source requirements, and expected decision effect.
  4. Persist request equivalence, merge/reuse decisions, SearchRun execution telemetry, evidence delta, and decision effect before interpretation.
  5. Apply no fixed request-count limit; equivalent requests reuse durable results and termination follows semantic convergence or an explicit external boundary.
- Affected boundaries / entry points: literature retrieval service, resource-pool snapshot semantics, SearchPlan/SearchRun owners, retrieval telemetry.
- Dependencies: T-149's durable vector persistence remains a retrieval-readiness dependency; automatic external discovery remains a pending decision.
- Exit criteria: TSRF-17 and the retrieval-lifecycle portion of TSRF-18 pass.
- Verification: A paper outside the historical 14-paper topic snapshot is retrievable from the managed library; explicit scopes still constrain correctly; duplicate requests reuse one durable execution; every actual request has recoverable delta/provenance.
- Recovery: Restore the old topic-scoped selection adapter while retaining new request and SearchRun records; never mutate historical EvidenceMaps.

### Phase 2 — Make Debate retrieval-native
- Outcome: Every semantic Debate can gather evidence until its material issues are resolved, explicitly left unresolved, or routed to Human authority.
- Approach: Let all roles raise RetrievalRequests and use one shared coordinator to normalize, merge, execute, and redistribute results before final role judgments.
- Planned changes:
  1. Add request-capable role output to literature-coverage, research-gap, research-question, research-value, and promotion-review Debate scenarios.
  2. Resume the same Debate after each evidence delta, preserving role/issue identity and making every final claim cite the evidence it consumed.
  3. Require each material issue to finish as supported, refuted, retrieval-required, semantic-revision-required, unresolved-for-Human-authority, or a stage-bounded obligation.
  4. Treat mechanical-only changes as explicit frozen-evidence reuse; do not inflate retrieval counts.
  5. Invalidate affected downstream support when new evidence changes novelty, coverage, claim ceiling, feasibility, or a decision premise.
- Affected boundaries / entry points: shared Debate core, scenario role contracts, retrieval coordinator, Debate provenance and replay.
- Dependencies: Phase 1 request lifecycle and durable SearchRuns.
- Exit criteria: TSRF-10, TSRF-18, TSRF-21, and the Debate portion of TSRF-15 pass.
- Verification: Focused role-request, merge/reuse, multi-round evidence-delta, no-new-evidence, Human-escalation, mechanical-reuse, and downstream-invalidation tests.
- Recovery: Disable request execution while retaining Debate transcripts and request artifacts; the deterministic gates remain the only admission authorities.

### Phase 3 — Publish EvidenceMaps only from a resolvable convergence loop
- Outcome: EvidenceMap is an immutable result of literature and Debate convergence, and every failed gate has an executable route that can change the state it checks.
- Approach: Compose gate issue, Debate diagnosis, loopback target, required delta, and gate recheck as one typed resolution chain.
- Planned changes:
  1. Publish an EvidenceMap only from resolved SearchRuns and Debate issues, recording included/excluded evidence, conflicts, coverage, claim ceiling, and unresolved obligations.
  2. Create a successor EvidenceMap after material evidence change; keep prior maps and checkpoint decisions immutable.
  3. Make evidence gates consume required coverage outcomes and current Debate resolutions rather than inferring sufficiency from adjacent EvidenceUnits.
  4. Replace unowned blockers and indefinitely carried warnings with stage-bounded obligations or typed resolution routes to retrieval, EvidenceMap reconstruction, research-gap selection, research-question convergence, value assessment, or promotion review.
  5. Reject a loopback replay that supplies no declared evidence or semantic delta, while reusing an identical completed result.
- Affected boundaries / entry points: EvidenceMap builder/admission, checkpoint packet, gate outputs, coordinator frontier, loopback handoffs.
- Dependencies: Phases 1 and 2.
- Exit criteria: TSRF-06, TSRF-08, TSRF-19, and TSRF-20 pass without creating a second decision authority.
- Verification: Required-missing, conflict, near-duplicate, no-delta replay, successor-map, stale-downstream, accepted-risk, and research-obligation scenarios.
- Recovery: Preserve the last admitted map and halt at its Human checkpoint; never treat an incomplete working evidence state as a replacement result.

### Phase 4 — Close decision presentation and contract drift
- Outcome: Researchers see substantive evidence, risks, current obligations, and available recovery choices in ordinary research language, while public contracts describe the implemented paths.
- Approach: Project only canonical packet/map/decision authorities and expose internal version identities as diagnostics rather than primary workflow names.
- Planned changes:
  1. Repair evidence and research-question views, current research status, resolved-warning reconciliation, and rejected-topic disposition.
  2. Use literature and evidence convergence, research-gap selection, research-question convergence, research-value assessment, and promotion review in user-facing surfaces and operating guidance.
  3. Align EvidenceMap, coordinator, Debate, RetrievalRequest, and promotion routes with OpenAPI and runtime schemas; normalize equivalent functional refs and node-specific invocation fields.
  4. Make normal question-candidate and promotion-review Debate behavior use the shared retrieval-native policy.
  5. Produce typed risk-to-condition candidates for conditional promotion while preserving strict Human confirmation and the unmapped-risk gate.
- Affected boundaries / entry points: human stage views, research status, OpenAPI, operator runbook, normal Debate routes, conditional-promotion support.
- Dependencies: Settled authority and resolution contracts from Phase 3.
- Exit criteria: TSRF-01 through TSRF-03, TSRF-09, TSRF-12, TSRF-15, TSRF-16, and TSRF-22 pass; remaining FIND-010, FIND-011, FIND-014 through FIND-017, FIND-022, FIND-023, FIND-027, FIND-028, and FIND-032 have verified dispositions.
- Verification: Projection truth tables, runtime/OpenAPI drift checks, human-language snapshots, exact-ref composition, normal Debate provenance, and complete condition-mapping tests.
- Recovery: Revert projection/contract adapters without changing persisted scientific or Human authority.

### Phase 5 — Re-run topic selection as an evidence-resolving system
- Outcome: A fresh topic either reaches conditional promotion through traceable evidence convergence or stops at a meaningful unresolved decision; it cannot advance merely because payloads are structurally complete.
- Approach: Run a new bounded real flow that deliberately exercises full-library recall, Debate-issued retrieval, an evidence-changing loopback, an immutable successor EvidenceMap, a downstream invalidation, and a later-stage recovery.
- Planned changes:
  1. Verify that relevant literature outside the initial topic context can enter the working evidence set.
  2. Observe any number of justified RetrievalRequests while confirming deduplication, durable SearchRuns, evidence deltas, and convergence reasons.
  3. Require a Debate-discovered gap to route through retrieval or semantic repair and pass the same gate only after the declared delta.
  4. Review every Human checkpoint in ordinary research language with current evidence, conflicts, obligations, and exact choices.
  5. Reconcile retriever/provider accounting and disposition any remaining adjacent operational or experiment-asset gaps.
- Affected boundaries / entry points: End-to-end topic selection from literature convergence through promotion review.
- Dependencies: Phases 1 through 4 and exact Human decisions during rehearsal.
- Exit criteria: All current TSRF acceptance references pass, no material in-scope finding remains unresolved, and no temporary dual route survives.
- Verification: Focused checks plus one recoverable real-flow evidence bundle.
- Recovery: Preserve every immutable map and Human decision; stop at the last trustworthy gate and use only supported successor/loopback routes.
## Kickoff gate

- Status: pending
- Authorized boundary: none
- [ ] Decisions: The whole accessible indexed library is confirmed as retrieval fuel, EvidenceMap is confirmed as an immutable result, Debate may raise unlimited structured retrieval requests, and gates/Debate/loopback form one resolution system; still settle automatic external discovery when managed-library retrieval cannot close a required gap and define the exact semantic convergence/no-material-delta boundary.
- [ ] Design: Confirm current runtime owners for corpus scope, request equivalence, Debate resumption, successor EvidenceMap publication, downstream invalidation, and resolution-route admission.
- [ ] Route: Review and approve the cumulative Phase 1–5 implementation route and first stopping boundary; planning synchronization does not authorize code changes.
- [ ] Verification: Freeze focused fixtures for outside-snapshot recall, unlimited-request deduplication, evidence-changing Debate, no-delta termination, typed loopback repair, successor-map immutability, and human-readable projections.

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
| Full-library retrieval increases noise and weak semantic neighbors. | Recall grows while reranked evidence quality or claim coverage falls. | Keep the corpus broad, but use intent-aware ranking, source readiness, evidence thresholds, clustering, and Debate review before map publication. | Revert ranking changes without restoring a hard topic whitelist; retain SearchRuns for comparison. |
| Unlimited RetrievalRequests repeat work or fail to converge. | Equivalent requests recur, result sets saturate, or repeated SearchRuns produce no material evidence delta. | Canonicalize and merge requests, reuse corpus/index-bound results, expose the delta, and require a changed strategy, narrowed claim, Human disposition, or external route after saturation. | Halt the Debate with an explicit unresolved issue; never convert exhaustion into a pass. |
| EvidenceMap is published from transient process state. | A map omits unresolved Debate issues or changes after a checkpoint binds it. | Admit maps only from a closed convergence projection and create immutable successors after material change. | Keep the last trustworthy map current and return to the retrieval/Debate loop. |
| Loopbacks create motion without resolution. | The same gate is re-entered without the declared evidence or semantic delta. | Bind every loopback to issue, owner, target delta, and recheck condition; reject no-delta replay or reuse the prior result. | Stop at the owning gate and ask for a new strategy or Human decision. |

## Phase closeout

- Review: User confirms the external-discovery and convergence boundaries, then approves the cumulative route and first implementation stopping point.
- Record update: Keep `01-status.md`, `findings.md`, architecture, and verification synchronized with confirmed scope and evidence.
- Checkpoint: After approval, create a task-linked commit containing only this task bundle and its governance projection.
