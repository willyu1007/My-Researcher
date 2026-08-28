# Topic Selection Research Checkpoint Control Plane — Roadmap

## Scope and constraints

### In scope
- Add product-native research checkpoint control across evidence review, gap confirmation, research-question confirmation, and promotion.
- Make user objections, academic-quality obligations, currentness, and allowed loopbacks enforceable by backend transition guards.
- Expose checkpoint packets and current research state through canonical local HTTP APIs for Codex and future clients.
- Upgrade existing v1a/v1b/v1c gates without creating a parallel topic-selection pipeline.
- Add evidence-grounded divergence before convergence at research-semantic decisions, beginning with the gap/need portfolio before HumanConfirmNeed.
- Resolve persisted evidence refs into bounded, claim-bearing model-visible packets and connect role-specific retrieval to existing literature/SearchRun authority.
- Preserve candidate alternatives, fatal or minority objections, explicit stop/park/reframe dispositions, and loop deltas through downstream handoffs.
- Produce concise human stage artifacts and authorize routine local execution by effect boundary rather than by internal node.
- Validate the new behavior in shadow mode against recorded dominance pairs, evidence-perturbation variants, and the current ambiguous lineage before production adoption.

### Out of scope
- GUI surfaces, Codex-specific decision logic, writing-center work, experiment execution, provider activation, calibration release, and any production rehearsal mode.
- A generic multi-agent platform, unrestricted model-controlled browsing, debate at mechanical packaging/publication nodes, live multi-provider activation, or parallel downstream execution of every candidate.

### Constraints and dependencies
- Existing domain authorities remain authoritative; checkpoint records coordinate review and transition eligibility only.
- Human choices are explicit, exact, snapshot-bound, and append-only; upstream change supersedes affected review decisions.
- Current workflow trace, replay, hash, and repository boundaries remain valid through a versioned cutover.
- T-129 retains ownership of externally gated prompt calibration and provider-debate activation.

## Decision alignment

| Decision question | Options / tradeoffs | Current direction | Status | Owner / required confirmation | Closure evidence | Consequences |
|---|---|---|---|---|---|---|
| Runtime modes | Research-only production / rehearsal plus research | Research-only production; fixtures and canaries remain test scenarios | decided | User | Latest confirmed instruction | No reduced-quality business path or `rehearsal` runtime semantic is introduced. |
| Semantic authority | Product control plane / Codex runbook / GUI workflow | Product control plane | decided | User | Latest confirmed instruction | Clients render packets and submit exact decisions but cannot define or bypass gates. |
| Human participation structure | Four major checkpoint phases / ad hoc human prompts | Evidence, gap, question, and promotion checkpoints, with existing slice selection retained inside the research-design flow | decided | User | Confirmed enhancement direction | Product must expose pending review and block unauthorized transitions. |
| Checkpoint ownership model | Generic duplicate content authority / lightweight control state referencing existing authorities | Lightweight checkpoint state and packet projection; reuse existing decisions and add only missing evidence/question decisions | decided | User | Confirmed task opening | Avoids a second content authority while giving all clients one control interface. |
| Existing-record cutover | Grandfather all / block all / derive pending checkpoints from current authority and require review before new advance | Keep all records readable; backfill pending anchors; require the earliest unsatisfied current checkpoint before any new advance; preserve completed intake only as pre-checkpoint provenance | decided | User | Phase 1 planning checkpoint confirmed 2026-08-25 | Avoids retroactive deletion and blanket grandfathering while making every future transition fail closed. |
| Academic policy strictness | Fixed numeric thresholds / role-and-quality rules with bounded policy triggers | Semantic role/quality blockers are authoritative; counts, similarity, recency, confidence, and scores are configurable escalation tripwires only | decided | User | Phase 1 planning checkpoint confirmed 2026-08-25 | Direct-neighbor/disconfirming coverage, distinct alternatives, question identifiability, objections, and obligation closure become hard semantics. |
| Minimal persistence | Per-stage duplicate content tables / generic event engine / lightweight coordination with existing authorities | Checkpoint + missing-stage decision + objection + objection-resolution authorities; reuse existing snapshots, stage decisions, recheck propagation, and projections | decided | User | Phase 1 planning checkpoint confirmed 2026-08-25 | Adds explicit currentness and human control without duplicating evidence/question/package content. |
| Legacy semantic routes | Preserve as compatibility writers / retire all TitleCard APIs / retain intake and reads but cut over semantic writes | Keep title-card/evidence-basket intake and reads; reject legacy need/question/value/package/promotion writes after enforcement | decided | User | Phase 1 planning checkpoint confirmed 2026-08-25 | Closes the direct PaperProject promotion bypass while preserving useful compatibility reads. |
| Positive-lineage novelty repair | Keep calibrated closed-book confidence as the primary graded-budget mechanism / use binary marginal utility / predict signed adjacent-depth utility under fixed retrieval components | Predict signed `0→1` and `1→5` answer-utility changes while fixing reader, retriever, corpus/index, candidate ranking, prompt, and decoding; retain calibrated tri-level confidence and binary budgeted utility as nearest-work comparators rather than novelty claims | decided | User | Researcher advanced the refreshed evidence packet and selected the signed-depthwise option on 2026-08-26 | Evaluation must test incremental value over both nearest-work mechanisms and report benefit, harm, realized retrieval calls, passage tokens, trigger cost, and measured latency separately. |
| Research-decision rhythm | Converge immediately / debate every node / diverge then converge only at semantic choices | Evidence/search scope, gap portfolio, question design, and comparative value first form independent alternatives with role-specific evidence, then challenge and converge; mechanical nodes remain deterministic | decided | User | Research-process review on 2026-08-27 | Debate becomes a bounded research-quality mechanism rather than workflow ceremony. |
| Model-visible evidence | Persisted refs and upstream summaries / whole-corpus context / bounded claim-bearing packets | Resolve refs into inspectable excerpts with locator, query intent, role, freshness, and support/challenge relation; load only task-relevant slices | decided | User | Literature/RAG audit on 2026-08-27 | UUID lineage remains traceability evidence but no longer masquerades as content the role actually read. |
| Arena result and branching | Force one winner / unrestricted multi-branch / zero-to-many portfolio with one active path | Permit `select`, `park`, `drop`, `reframe`, or `expand`; exactly one active path plus snapshot-bound parked alternatives with delta-gated serial return; fork is out of scope and an arena fork recommendation is recorded as `park` plus a surfaced recommendation | decided | User | Divergence discussion on 2026-08-27; fork retired in the product-quality discussion on 2026-08-28 | “No worthwhile topic” is a successful result; no branch-identity, child-TitleCard, or sibling-supersession machinery is built. |
| Disposition contract precedence | Fix prompts only / fix contracts with the first arena slice / fix contracts first as a precondition | Land a two-layer disposition contract before or with the first arena slice: set-level outcomes (`selected`/`none_viable`/`evidence_expansion_required`/`reframe_required`) routed by the checkpoint with stop as a first-class route, and per-candidate dispositions (`selected`/`parked`/`dropped`) — legal successful terminal outputs across N4/N6 output schemas, gates, loopbacks, and terminal semantics; contract work independent of any new role | decided | User | Product-quality discussion on 2026-08-28; two-layer refinement adopted from external review the same day | Without a legal no-topic exit any critic role is forced to repair fatal findings into an advancing answer, and without the layer split a bare `drop` could terminate the wrong level of research object. |
| First-slice arena roles | Full four-role arena / topic-killer only / scout-killer pair | Pair an opportunity scout (bounded out-of-basket retrieval) with a prior-art/topic-killer (repair prohibited); the arbiter is deterministic or human in the first slice; the empirical skeptic and multi-provider diversity join only after the pair proves value | decided | User | Product-quality discussion on 2026-08-28 | The excavate-then-negate order is preserved — the existing generation path plus the scout excavate, the killer negates — while correlated-role noise and cost stay bounded. |
| Arena persistence owner | Reuse existing owners only / overload checkpoint kinds / one minimal new session root | Add one `TopicSelectionResearchArenaSession` coordination root (snapshot binding, one-current key, supersession, enumerated termination reason, loop-delta refs) plus a dedicated `TopicSelectionResearchArenaRoleExecution` child table for role-execution integrity (exposure-set hash, evidence partition, unique runtime identity, composite role-slot/instance uniqueness; paper-implementation runtime-artifact precedent); content authority unchanged and `support_only` preserved | decided | User | Phase 7 owner audit `artifacts/phase7-owner-map.md`; researcher confirmed the boundary change on 2026-08-28; child-table shape settled from external review the same day | The arena can prove session identity, independence, minority-report linkage, loop delta, and supersession without becoming a second research authority. |
| Stage artifacts and authorization delivery | Couple to arena integration / deliver early as an independent slice | Human stage Markdown and the effect-based authorization envelope may land early and independently of arena validation because they are read-only projections and operating protocol over canonical owners; the LLM working plane is preferred as manifest-first read-time projection, with a persisted corpus admitted only if projection cost is proven prohibitive | decided | User | Product-quality discussion on 2026-08-28 | Researcher legibility and cadence improve without waiting for the arena, and no second content authority is created. |
| Objection and risk survival | Re-summarize at each stage / immutable carry ledger with explicit disposition | Every unresolved material objection or risk remains machine-visible through package and promotion until repaired, accepted, looped back, parked, or dropped | decided | User | Live N8-to-promotion audit on 2026-08-27 | A green final gate cannot silently erase a material earlier critic finding. |
| Adoption strategy | Replace the live path immediately / shadow first and calibrate | Start before HumanConfirmNeed in shadow mode and calibrate without absolute value labels — dominance pairs from recorded lineage history, evidence-perturbation counterfactuals, and human overrides accumulated during shadow/advisory operation — then activate only after drop-justification, dominance-consistency, override-convergence, and cost evidence is acceptable; a drop recommendation additionally requires one of five enumerated evidence-backed drop-reason codes, and overrides are accounted per reason code | decided | User | Integrated recommendation on 2026-08-27; calibration method revised in the product-quality discussion on 2026-08-28; drop-reason gating adopted from external review the same day | The system must prove that justified stopping is useful before it controls production state; “clearly worthwhile” fixtures are not required because no reliable source for that label exists, and the calibration target is decision-process quality rather than outcome accuracy. |
| Current medium-value lineage | Promote to finish the acceptance / delete it / freeze it as an ambiguous calibration fixture | Freeze the current gate without a HumanPromotionDecision and reuse the lineage as an ambiguous shadow-evaluation case; complete A9 later with a topic the improved process recommends advancing | decided | User | User approved the integrated checkpoint and requested its full commit/push on 2026-08-28 | Prevents process-completion pressure from becoming evidence that the topic deserves promotion. |

### Assumptions

| Assumption | Risk if wrong | Validation |
|---|---|---|
| Existing control-plane transition, snapshot, recheck, and human-decision primitives can be extended without a second workflow engine. | A checkpoint layer could duplicate authority or require a larger redesign. | Phase 1 inventory of contracts, repositories, transition guards, and archived decisions. |
| Existing human-confirm-need and promotion decisions can satisfy gap and promotion checkpoints through adapters. | New generic decisions could conflict with existing authority. | Contract mapping and integration tests before persistence design is settled. |
| Research-status can be a read projection over current authority plus checkpoint state. | Reconstructing state may be ambiguous or too expensive. | Prototype deterministic projection over representative v1a/v1b/v1c records. |

## Task relationships

| Task | Relationship from this task | Owned boundary / exchanged contract | Coordination condition |
|---|---|---|---|
| T-042 | derived-from | Evidence-first, falsification, value, package, and promotion principles | Preserve the accepted decision-chain intent while correcting current product gaps. |
| T-088 | follows | WorkflowHarness, AgentOrchestrator, trace, and profile execution foundation | Reuse runtime contracts; do not create a second workflow engine. |
| T-089 | follows | Current workflow matrix and node-policy semantic ownership | Update the maintained matrix and policy contracts when checkpoint semantics change. |
| T-115 | follows | Existing v1b human-delegated review inputs and slice/question surfaces | Reuse compatible human authority and remove bypass paths rather than duplicating them. |
| T-128 | follows | Product-run reachability, recovery, prompt packet, and sign-off closure | Treat prior readiness as operational baseline, not proof of academic checkpoint sufficiency. |
| T-129 | sibling | External-corpus prompt calibration and provider-debate activation | Coordinate only if this task changes provider-gated debate contracts; otherwise remain independent. |

## Implementation plan

### Phase 1 — Settle checkpoint and cutover contracts
- Outcome: A current-state inventory and confirmed product contract define checkpoint authority, decision reuse, academic policy boundaries, and existing-record cutover without duplicate semantics.
- Approach: Trace the maintained v1a/v1b/v1c nodes, routes, repositories, control-plane transitions, human decisions, rechecks, and downstream intake guards; turn the top-k rehearsal findings into explicit negative cases.
- Planned changes:
  1. Map current checkpoint ingredients and every transition that must become guarded.
  2. Define the minimal checkpoint state/packet/decision interfaces and versioning boundary.
  3. Classify academic rules as hard semantic blockers, configurable triggers, or advisory packet content.
  4. Present a concrete cutover recommendation for current packages, decisions, bridges, and in-flight runs.
- Affected boundaries / entry points: Topic-selection shared contracts, workflow matrix, v1a/v1b/v1c service boundaries, promotion/bridge intake handoff, and OpenAPI design.
- Dependencies: Confirmed task opening; user decisions on the Phase 1 cutover and academic-policy recommendations before implementation kickoff.
- Exit criteria: No competing authority remains in the design; cutover, strictness, persistence, and legacy-route choices are confirmed; the first implementation slice is executable.
- Verification: Contract review against current code, representative API records, archived task outcomes, and negative-case definitions.
- Recovery: Keep kickoff pending and make no application-code change if inventory invalidates the proposed control model.

### Phase 2 — Establish checkpoint control and research-status APIs
- Outcome: Product-owned current checkpoints, packets, decisions, supersession, and transition guards are available through canonical APIs and can be recovered by any client.
- Approach: Add the smallest persistence and service layer needed to coordinate review while referencing existing domain authorities; expose a deterministic research-status projection.
- Planned changes:
  1. Implement checkpoint currentness, packet identity, allowed actions, decision binding, and supersession.
  2. Guard downstream transitions against missing, stale, non-advancing, or incomplete checkpoint decisions.
  3. Add checkpoint list/detail/decision and title-card research-status HTTP contracts.
  4. Preserve exact human authority and replay/idempotency semantics.
- Affected boundaries / entry points: Shared contracts, Prisma/repositories when confirmed, backend services/controllers/routes, OpenAPI, and process context.
- Dependencies: Phase 1 design and cutover decision.
- Exit criteria: A client cannot bypass a pending checkpoint, and the full pending/decided/superseded state is recoverable without client-side reconstruction.
- Verification: Schema, repository, route, currentness, replay, concurrency, stale-hash, and transition-negative tests.
- Recovery: Disable new transition eligibility behind the versioned cutover while keeping existing records readable; remove no previous authority until compatibility is verified.

### Phase 3 — Enforce evidence and gap quality
- Outcome: Need discovery starts only after current evidence review, and gap validation reflects candidate competition, direct prior-art pressure, and disconfirming evidence rather than a lone plausible framing.
- Approach: Add the missing evidence-landscape human decision, adapt HumanConfirmNeed to the gap checkpoint, and strengthen existing evidence/candidate gates.
- Planned changes:
  1. Assemble evidence-landscape packets from search, map, strength, source-quality, coverage, and nearest-work material.
  2. Require direct-neighbor and disconfirming coverage under product policy before advance.
  3. Enforce genuinely distinct candidate comparison and preserve rejected alternatives with reasons.
  4. Bind gap confirmation to the reviewed candidate-pool snapshot.
- Affected boundaries / entry points: v1a EvidenceMap/strength/search handoffs, NeedCandidate generation/adjudication/human confirmation, work queue, and checkpoint projection.
- Dependencies: Phase 2 control plane.
- Exit criteria: Shallow or single-candidate evidence cases fail closed with actionable loopbacks, while a qualified candidate pool advances through explicit human confirmation.
- Verification: Abstract-heavy evidence, missing-neighbor, missing-disconfirming, duplicate-candidate, stale-pool, and positive full-chain cases.
- Recovery: Return to evidence/search or candidate generation without mutating accepted upstream evidence authority.

### Phase 4 — Enforce research-design confirmation and durable objections
- Outcome: The selected slice and question cannot reach value assessment until a researcher confirms an identifiable, falsifiable, bounded design and all blocking human objections are resolved through evidence-backed loopback.
- Approach: Preserve the existing slice decision, add a topic-question confirmation authority, make objections durable product records, and connect them to currentness and loopback policy.
- Planned changes:
  1. Persist and project human objections with target, severity, status, resolution, and required loopback.
  2. Treat rejection of the research object or academic sufficiency as a stale/loopback condition, not a wording-repair request.
  3. Gate question confirmation on mechanism/proxy/confound/falsification/claim-ceiling completeness.
  4. Block N8 value assessment until the current question checkpoint advances.
- Affected boundaries / entry points: v1b constraint profile, slice selection, N6/N7 question contracts, answerability/falsification material, recheck memory, and N8 entry.
- Dependencies: Phase 3 evidence/gap authority and Phase 2 checkpoint control.
- Exit criteria: The top-k academic-objection regression loops back to slice/evidence; rephrasing alone cannot advance; a genuinely revised current design can be confirmed.
- Verification: Objection lifecycle, stale propagation, unauthorized resolution, semantic no-op revision, valid revision, and current question confirmation tests.
- Recovery: Supersede affected downstream review state and preserve the previous slice/question/package as traceable history.

### Phase 5 — Harden promotion, intake, and end-to-end acceptance
- Outcome: Promotion and PaperProject intake represent an informed, current research decision with reconciled risk/action obligations and a complete human-readable product packet.
- Approach: Strengthen existing N8/v1c gates and promotion dossier without replacing HumanPromotionDecision or PaperProjectBridge authority; close with a real-DB product-path regression.
- Planned changes:
  1. Require advancement-relevant `pass_with_risk` findings to map to accepted risks or required actions.
  2. Carry unresolved objections and independent critic findings into promotion support and gate disposition.
  3. Guard bridge creation/intake on the complete current checkpoint chain.
  4. Align OpenAPI, workflow matrix, context docs, compatibility behavior, and operational status projection.
- Affected boundaries / entry points: v1b N8/N9/N10/N11, v1c N1-N5, PaperProject bridge/intake, scenario runners, and maintained API/process documentation.
- Dependencies: Phases 2-4 and any confirmed migration.
- Exit criteria: All acceptance references A1-A8 are verified; no legacy or client-specific bypass remains; task completion contract can be reviewed.
- Verification: Full-chain positive and negative API scenarios, top-k objection regression, real-DB migration/replay, concurrent decision/idempotency checks, typecheck, OpenAPI drift tests, and relevant backend suites.
- Recovery: Keep bridge/intake fail-closed, retain prior authority read access, and roll back the cutover version rather than weakening checkpoint policy.

### Phase 6 — Fresh dual-track product-path acceptance
- Outcome: One fresh negative lineage and one fresh positive/recovery lineage prove that the checkpoint control plane governs real API operation rather than only test fixtures, while preserving the live interaction and research-quality gaps as the baseline for the next route.
- Approach: Use the current local development database and retrieval-ready corpus without paid-provider execution. Treat the historical SciFact top-k 10-versus-5 framing as a negative control. For the positive recovery lineage, predict signed adjacent-depth answer utility for `0→1` and `1→5` under fixed retrieval components and treat calibrated closed-book confidence plus binary marginal-utility routing as nearest-work comparators. Persist fresh, clearly labeled owner records as audit evidence.
- Planned changes:
  1. Run a read-only runtime, API-identity, topic-profile, scoped-corpus, evidence-readiness, and backup-readiness preflight before creating records.
  2. Drive a parameter-only negative TitleCard through qualified evidence to the competitive-gap boundary and prove that wording or top-k variants cannot advance.
  3. Drive a mechanism-level positive TitleCard through evidence, gap, question, promotion, and bridge checkpoints, stopping for every strict-human authority decision.
  4. Stop at the exact current promotion gate, audit whether the topic is comparatively worth advancing, and preserve interaction, artifact, retrieval, debate, risk-carry, and authorization findings without inferring a HumanPromotionDecision.
  5. Freeze the current coherent-but-moderate lineage as the confirmed ambiguous calibration fixture; move the post-bridge objection and exactly-once handoff proof to Phase 10 using a topic the improved process recommends advancing.
- Affected boundaries / entry points: Canonical local HTTP APIs for topic-selection research status/checkpoints, v1a/v1b/v1c workflow actions, PaperProject bridge and `/paper-implementation/topic-handoffs`; maintained operator documentation and T-147 verification evidence only if runtime behavior remains correct.
- Dependencies: Local backend and database availability; one unambiguous recoverable topic literature scope (normally an active topic profile); current retrieval-ready, claim-bearing role-balanced literature; user decisions at every Human-authority stop. Provider/cost execution remains disabled.
- Exit criteria: The negative lineage remains non-advancing; the repaired positive lineage reaches a current promotion gate; its moderate comparative value and process gaps are durably recorded; and the researcher freezes it as the ambiguous calibration fixture. Full post-bridge objection and handoff closure remains A9 work in Phase 10 rather than a reason to force this topic forward.
- Verification: Read `research-status`, checkpoint history/packets, blockers, allowed actions, and current promotion owner IDs after every mutation. Preserve idempotency keys and verified `409`/`422` fail-closed outcomes. No HumanPromotionDecision, bridge, or topic handoff is created solely to close the phase.
- Recovery: Stop at the last persisted owner projection, retain IDs and idempotency keys, and resume only through the returned allowed action. Do not delete audit records, query Prisma directly, start a server without approval, or substitute provider output for missing product authority.

### Phase 7 — Settle the evidence-bearing arena contract
- Outcome: One minimal contract joins evidence resolution, independent role work, candidate portfolios, durable dissent, disposition, loop delta, human artifacts, and currentness without creating a second research authority.
- Approach: Treat `ResearchArena` as a logical snapshot-bound coordination boundary first. Audit existing SearchPlan/SearchRun, EvidenceMap, runtime artifacts, debate artifacts, checkpoints, objections, rechecks, and human decisions before choosing whether any new persistence owner is required.
- Planned changes:
  1. Define the bounded EvidencePacket projection and prove that every cited source ref resolves to the exact excerpt a role can inspect.
  2. Define arena input, role/evidence partition, candidate genealogy, objection/minority report, disposition, termination, delta, replay, and supersession contracts.
  3. Define one-active-plus-parked behavior with delta-gated serial return, and prove by thought experiment only that parked candidates cannot collide under supersession; no fork, child-TitleCard, or branch-identity design.
  4. Define concise human stage Markdown and a manifest-first LLM working-plane projection over canonical owners; prefer read-time projection over a persisted corpus, and allow this sub-slice plus the authorization envelope to land early, independent of arena validation.
  5. Define the effect-based authorization envelope and the evaluation fixtures — dominance pairs, perturbation variants, and override accounting — plus budgets and activation thresholds.
- Affected boundaries / entry points: Literature retrieval and SearchRun orchestration, topic-selection runtime artifacts, v1a candidate arena/checkpoint packets, process context, and task verification fixtures. No provider route is activated.
- Dependencies: Confirmation of the integrated plan and disposition of the current medium-value lineage; existing retrieval-ready corpus and canonical checkpoint owners.
- Exit criteria: The first shadow slice can be implemented without deciding product semantics inside a prompt, duplicating content authority, or reopening branch and risk-survival questions.
- Verification: Contract review against current owners and three representative lineages; ref-to-excerpt resolution proof; supersession/branch thought experiments; authorization-effect table review.
- Recovery: Keep kickoff pending and perform only read-only discovery if owner mapping, branch currentness, or evidence resolution cannot be made unambiguous.

### Phase 8A — Legalize honest portfolio outcomes
- Outcome: N4/N6 can return zero viable candidates without being treated as generation failure, while set-level routing and per-candidate disposition remain unambiguous and evidence-backed.
- Approach: Change contracts before prompts or agents. Introduce the two-layer disposition in shared/output schemas, then make gates, loopbacks, and terminal semantics recognize `none_viable`, `evidence_expansion_required`, and `reframe_required` as successful research-management outcomes rather than malformed advancing answers.
- Planned changes:
  1. Add set-level outcomes (`selected`/`none_viable`/`evidence_expansion_required`/`reframe_required`) and per-candidate dispositions (`selected`/`parked`/`dropped`) to the N4/N6 boundaries without permitting a bare candidate `drop` to terminate the portfolio.
  2. Require evidence, rejection rationale, confidence, and reopening conditions for a zero-viable portfolio; require every `dropped` candidate to carry one enumerated evidence-backed drop-reason code.
  3. Route stop, expansion, and reframe through deterministic checkpoint/workflow semantics; do not manufacture a candidate to preserve downstream progress.
  4. Align focused contract, gate, loopback, replay, and compatibility tests before changing prompt incentives.
- Affected boundaries / entry points: v1b N4/N6 shared contracts and output schemas, deterministic gates, loopback routing, terminal status, fixtures, and maintained API/process documentation.
- Dependencies: Phase 7 disposition contract. No arena persistence or provider execution is required.
- Exit criteria: A well-formed `none_viable` result completes the generation decision successfully and chooses an explicit stop/expand/reframe route; an ambiguous layer, evidence-free drop, or missing reopening contract fails admission.
- Verification: Red/green schema and route tests for selected, successful no-topic, expansion, reframe, park, and every invalid drop/replay case; relevant typecheck and focused suites.
- Recovery: Revert the additive contract path as one unit; the existing advancing-candidate path remains current until Phase 9 activation.

### Phase 8B — Deliver derived research views and effect authorization
- Outcome: The researcher can read one concise Markdown result per semantic stage, while LLM consumers obtain a substantially richer manifest-led working plane and routine local work proceeds to the next human decision under one effect-bounded instruction.
- Approach: Build read-time projections over canonical owners and a protocol-level authorization envelope; neither surface becomes a writable research authority or depends on arena activation.
- Planned changes:
  1. Expose a manifest/current-pointer projection with an explicit current-selection rule and resolvable artifact references.
  2. Generate task-scoped LLM working-plane slices and concise human stage Markdown from the same canonical refs, hashes, alternatives, objections, risks, and supersession state.
  3. Encode and document the effect boundary that permits routine local reads, deterministic writes, bounded non-provider jobs, recoverable retries, and the already selected backend lifecycle without node-by-node confirmation.
  4. Verify regeneration, staleness, and human legibility without persisting a competing corpus.
- Affected boundaries / entry points: Research-status/artifact read APIs, stage projection services, operator/process documentation, and client-facing action envelopes.
- Dependencies: Phase 7 projection and authorization contracts; independent of Phase 8A and arena migration where the underlying owner already exists.
- Exit criteria: Every current stage has a regenerable human view and manifest-led LLM view, stale refs cannot appear current, and routine execution reaches the next semantic decision without an extra authority write.
- Verification: Projection snapshots, current-selection and artifact-resolution negatives, stage-view review, and effect-boundary scenarios.
- Recovery: Remove or disable derived routes; canonical owners and checkpoint behavior remain unchanged.

### Phase 8C — Establish evidence and arena integrity
- Outcome: Product-resolved EvidencePackets and one minimal arena-session root can prove what each role independently saw and produced, without becoming a second evidence, candidate, or decision authority.
- Approach: Add the settled `TopicSelectionResearchArenaSession` root and `TopicSelectionResearchArenaRoleExecution` child table, then connect role-specific retrieval and read-time excerpt resolution to their admission invariants before any shadow synthesis runs.
- Planned changes:
  1. Resolve row/parser locators into bounded claim-bearing excerpts with query intent, role, freshness, and support/challenge relation; validate quote integrity against resolved text.
  2. Persist session snapshot binding, one-current identity, supersession, enumerated termination reason, and loop-delta refs.
  3. Persist role execution with exposure-set hash, evidence partition, runtime identity, role-slot/instance uniqueness, and durable pre-exposure output.
  4. Reject UUID-only, summary-only, evidence-free, peer-contaminated, stale, or semantically duplicate first-pass participation.
- Affected boundaries / entry points: Literature keyed resolution and retrieval, SearchRun provenance, runtime artifacts, Prisma/repository contracts, checkpoint packet projection, and DB context.
- Dependencies: Phase 7 owner audit and settled child-table shape. Uses the Phase 8A disposition vocabulary but does not activate it as checkpoint authority.
- Exit criteria: Every admitted role execution replays from its exact snapshot and actual evidence exposure; invalid independence/evidence cases fail before synthesis.
- Verification: Focused resolver/admission tests, migration replay and drift check, real-repository uniqueness/currentness cases, and ref-to-excerpt replay.
- Recovery: Disable arena writes and retain diagnostic sessions; remove no canonical literature or checkpoint authority.

### Phase 8D — Prove the scout–killer arena in shadow mode
- Outcome: Before HumanConfirmNeed, an independent opportunity scout and prior-art/topic-killer produce a traceable zero-to-many recommendation from distinct product-retrieved evidence without changing live authority; the empirical skeptic remains deferred until the pair proves value.
- Approach: Reuse Codex-assisted/runtime mechanisms over the Phase 8C integrity boundary. Persist both pre-exposure outputs before one bounded deterministic or human synthesis, and evaluate the recommendation only as a shadow projection.
- Planned changes:
  1. Run bounded out-of-basket retrieval for the opportunity scout and collision/fatal-flaw retrieval for the topic-killer, recording query and SearchRun provenance.
  2. Record independent proposals, objections, concessions, unresolved minority reports, candidate semantic groups, and evidence alignment before synthesis.
  3. Synthesize the Phase 8A set-level outcome plus per-candidate dispositions, with enumerated evidence-backed reason codes for every drop recommendation.
  4. Admit at most one retry, only when a recorded evidence, candidate, constraint, or human-objective delta exists.
  5. Render the shadow result through the Phase 8B views and retain a replayable technical trace.
- Affected boundaries / entry points: Candidate generation/adjudication support, literature retrieval, arena/runtime artifacts, SearchRun coverage, derived stage communication, and shadow-evaluation tooling.
- Dependencies: Phases 8A and 8C; Phase 8B for the maintained human/LLM views. Provider/multi-provider work remains with T-129.
- Exit criteria: Every role replays from its actual evidence; a no-topic result is successful; correlated shared-summary role play and evidence-free criticism fail admission; no shadow result writes live research authority.
- Verification: Shadow replay on the current ambiguous lineage, recorded dominance pairs, and evidence-perturbation variants; inspect evidence independence, terminal disposition, retry delta, human legibility, runtime cost, and deterministic recovery.
- Recovery: Disable the shadow projection without changing checkpoint or research authority; retain artifacts as diagnostic evidence.

### Phase 9 — Integrate disposition, dissent, and bounded human control
- Outcome: The validated arena can govern the gap checkpoint, carry unresolved material dissent through value/package/promotion, and let the researcher advance routine work to the next semantic decision without repeated operational authorization.
- Approach: Activate the smallest proven contracts only. Keep one active research lineage, project parked candidates, and require exact human authority for research-meaning choices and material risk acceptance.
- Planned changes:
  1. Activate the validated Phase 8A portfolio outcomes as gap-checkpoint authority and bind their routing to the exact current arena snapshot.
  2. Bind HumanConfirmNeed to the selected arena snapshot and preserve rejected/parked candidates with evidence-backed reasons.
  3. Carry unresolved high-severity objections and minority reports by stable refs into N8, v1c support, gate checks, and the human promotion packet.
  4. Block a green gate when a material carried item lacks an explicit repair, accepted-risk, loopback, park, or drop disposition.
  5. Adopt the Phase 8B stage views and bounded “advance to next human decision” effect envelope as the maintained operating surfaces.
- Affected boundaries / entry points: v1a disposition/schema and HumanConfirmNeed adapter, v1b N8/N9-N11 handoffs, v1c support/gate packet, research status, operator/process docs, and any minimal confirmed persistence change.
- Dependencies: Phase 8A–8D contract, integrity, projection, and behavioral evidence. Prompt wording changes land only with their schemas, gates, loopbacks, and terminal semantics.
- Exit criteria: A low-value topic can stop cleanly, an accepted topic advances through the exact current arena, no material dissent disappears, and routine deterministic execution reaches the next human boundary without an extra approval.
- Verification: Positive/negative disposition tests, risk-carry lineage tests, stale/supersession and retry tests, human artifact regeneration, authorization-boundary scenarios, OpenAPI/context alignment, and relevant typecheck/suites.
- Recovery: Fall back to the existing checkpoint chain with arena authority disabled; never reinterpret a shadow artifact as a human decision.

### Phase 10 — Calibrate, adopt, and generalize only where valuable
- Outcome: Production adoption is justified by measured research-decision quality and cost, and later arena placement is limited to semantic stages where it materially improves outcomes.
- Approach: Evaluate without absolute value labels — dominance pairs from recorded lineage history, evidence-perturbation counterfactuals, and human overrides accumulated during shadow/advisory operation. Count justified `drop`/`park` as success and compare against the current single-path baseline.
- Planned changes:
  1. Measure dominance-pair consistency, perturbation sensitivity/specificity, the human override/reopen rate as the accumulating false-drop/false-continue proxy, new semantic-group/direct-neighbor discovery, retrieval/model cost, latency, and downstream work avoided.
  2. Require every loop to demonstrate evidence/candidate/constraint/objective delta and stop when marginal information gain is exhausted.
  3. Activate the early arena only after accepted thresholds and researcher review; otherwise revise or remove it.
  4. Consider question-design and comparative N8 arenas separately, only when the early slice proves value; keep mechanical nodes deterministic.
  5. Complete the fresh dual-track A9 acceptance with a process-selected advancing topic and exactly-once handoff; retain stopped/parked cases as first-class successful controls.
- Affected boundaries / entry points: Evaluation fixtures, policy versions, phase-specific arena admission, final process documentation, and T-129 coordination only for later provider calibration.
- Dependencies: Phase 9 integration and researcher-approved dominance pairs, perturbation cases, and thresholds.
- Exit criteria: The system demonstrably improves stop/continue decisions at bounded cost — every drop is evidence-backed with reopening conditions, dominance-pair order is respected, and the override rate converges — and closes A9-A13 with a recoverable product-path acceptance.
- Verification: Historical/current shadow matrix, human review, cost and latency accounting, false-continue/false-drop report, full-chain positive and successful-stop cases, exact replay, and no-bypass regressions.
- Recovery: Keep the arena shadow-only or disable the affected semantic stage when calibration fails; retain the checkpoint control plane and collected evidence.

## Kickoff gate

- Status: ready
- Authorized boundary: through Phase 8D shadow validation
- [x] Decisions: the current medium-value gate is frozen as an ambiguous calibration fixture instead of being promoted for process completion.
- [x] Design: EvidencePacket resolution, arena owner boundary, and risk-carry projection are settled by the Phase 7 audit (`artifacts/phase7-owner-map.md`) and the researcher-confirmed `TopicSelectionResearchArenaSession` coordination root; branching is settled — fork is out of scope, and parked-alternative return is serial and delta-gated.
- [x] Route: contract alignment precedes shadow validation, then bounded authority integration and measured adoption.
- [x] Verification: dominance-pair, perturbation, and ambiguous-lineage fixtures plus drop-justification, override-convergence, evidence-delta, cost, risk-survival, replay, and full-chain obligations are identified in `verification.md`.

## Risks and recovery

| Risk | Detection | Mitigation | Recovery / rollback |
|---|---|---|---|
| Checkpoint state becomes a second content authority. | Packet or checkpoint stores independent versions of evidence, question, or promotion facts. | Store refs, hashes, decisions, and transition state; keep domain content in existing authorities. | Remove duplicate fields and rebuild the projection from domain records. |
| New gates make current records permanently unusable. | Existing current packages/bridges cannot be classified or reviewed under the cutover. | Inventory record classes and require an explicit versioned migration decision. | Keep records readable and block only new advance until a current review is created. |
| Academic policy becomes arbitrary count-based bureaucracy. | Advancement depends on raw paper/candidate counts despite weak evidence roles. | Make semantic role/quality rules authoritative and counts configurable tripwires only. | Reclassify the rule and preserve the negative evidence that exposed it. |
| Clients retain hidden bypasses. | Direct node routes can advance without a current checkpoint decision. | Centralize transition guard enforcement and cover every entry point with negative tests. | Fail closed at the control plane and remove the bypass before cutover. |
| Human participation becomes ceremonial again. | Packets omit alternatives, eliminated paths, unresolved objections, or allowed loopbacks. | Define packet completeness in product contracts and acceptance tests. | Block the checkpoint and regenerate the packet from current authority. |
| Acquired source assets depend on a transient configured raw-file root. | `storage_roots.raw_files` resolves under the macOS temporary directory even though normalized processing roots are persistent. | Preserve paragraph-level normalized text and key-content owners; do not overwrite the storage setting without a separate exact control authorization. | Reacquire the two explicit OA assets through a new bounded dry-run if the raw files disappear; never broaden the corpus or downloader policy implicitly. |
| Arena roles receive correlated summaries instead of independent evidence. | Different roles repeat the same framing, citations, and conclusions despite distinct names. | Persist pre-exposure outputs and product-owned role-specific retrieval scopes; reject evidence-free or semantic-duplicate participation. | Return the arena to shadow mode and revise role/evidence partitioning. |
| Evidence refs are traceable but not model-visible. | A role cites UUIDs or inherited summaries without resolvable claim-bearing excerpts. | Require EvidencePacket resolution with locator and support/challenge relation before admission. | Fail the arena input and repair retrieval/index ownership rather than hallucinating content. |
| Material dissent disappears before promotion. | N8 critic risks exist while the final gate contains no warning, risk ref, action, or accepted disposition. | Carry stable objection/minority-report refs through every handoff and gate on explicit disposition. | Invalidate the affected downstream packet and rematerialize it from current dissent authority. |
| Branch currentness collides. | Two valid siblings for one TitleCard/stage supersede each other or both appear canonical. | Fork is out of scope: exactly one active path plus snapshot-bound parked alternatives with delta-gated serial return; a fork recommendation is recorded as `park`. | Collapse back to one active path without deleting parked evidence. |
| Calibration rewards continuation. | Ready-gate rate improves while dominated topics keep advancing or accumulated overrides show good topics being killed. | Treat justified stop as success and measure dominance-pair consistency, perturbation sensitivity, override convergence, evidence delta, and work avoided. | Keep the arena shadow-only or disable the underperforming stage. |

## Phase closeout

- Review: At each phase, review authority boundaries, human decision semantics, bypass analysis, and whether new rules improve informed control rather than only adding records.
- Record update: Keep status, architecture, verification evidence, workflow matrix, OpenAPI, and project mapping aligned with confirmed product reality.
- Checkpoint: Land only verified, recoverable phase units with the task trailer after scoped sync and governance lint.
- Post-completion audit: Re-run lineage, concurrency, contract-completeness, matrix-drift, fixture-realism, and supported-Node verification before archive readiness; any discovered gap remains owned by T-147 until repaired and decisively reverified.
