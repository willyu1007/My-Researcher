# Topic Selection Research Checkpoint Control Plane — Roadmap

## Scope and constraints

### In scope
- Add product-native research checkpoint control across evidence review, gap confirmation, research-question confirmation, and promotion.
- Make user objections, academic-quality obligations, currentness, and allowed loopbacks enforceable by backend transition guards.
- Expose checkpoint packets and current research state through canonical local HTTP APIs for Codex and future clients.
- Upgrade existing v1a/v1b/v1c gates without creating a parallel topic-selection pipeline.

### Out of scope
- GUI surfaces, Codex-specific decision logic, writing-center work, experiment execution, provider activation, calibration release, and any production rehearsal mode.

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
| Positive-lineage novelty repair | Keep calibrated closed-book confidence as the primary graded-budget mechanism / bound it as replication / predict marginal retrieval utility under fixed retrieval components | Predict per-query marginal retrieval utility while fixing reader, retriever, corpus/index, candidate ranking, prompt, and decoding; retain the calibrated controller as a comparator rather than the novelty claim | decided | User | Researcher selected the recommended route after the N7 loopback on 2026-08-26 | Evidence must cover the June/July 2026 nearest work; evaluation separates router contribution, retriever contribution, realized budgets, retrieval harm, and trigger cost. |

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
- Outcome: One fresh negative lineage and one fresh positive/recovery lineage prove that the checkpoint control plane governs real API operation rather than only test fixtures.
- Approach: Use the current local development database and retrieval-ready corpus without paid-provider execution. Treat the historical SciFact top-k 10-versus-5 framing as a negative control. For the positive recovery lineage, predict marginal retrieval utility under fixed retrieval components and treat calibrated closed-book confidence as a comparator. Persist fresh, clearly labeled owner records as audit evidence.
- Planned changes:
  1. Run a read-only runtime, API-identity, topic-profile, scoped-corpus, evidence-readiness, and backup-readiness preflight before creating records.
  2. Drive a parameter-only negative TitleCard through qualified evidence to the competitive-gap boundary and prove that wording or top-k variants cannot advance.
  3. Drive a mechanism-level positive TitleCard through evidence, gap, question, promotion, and bridge checkpoints, stopping for every strict-human authority decision.
  4. Record a strict-human blocking objection after bridge creation but before topic handoff; prove the handoff fails, a wording-only repair cannot resolve it, and a substantive marginal-retrieval-utility ResearchSlice plus nearest-work evidence revision creates a new current lineage.
  5. Reconfirm the repaired chain, complete one topic handoff, exact-replay it without duplicate owners, and reconcile the maintained Codex operator guidance with the accepted positive/negative roles.
- Affected boundaries / entry points: Canonical local HTTP APIs for topic-selection research status/checkpoints, v1a/v1b/v1c workflow actions, PaperProject bridge and `/paper-implementation/topic-handoffs`; maintained operator documentation and T-147 verification evidence only if runtime behavior remains correct.
- Dependencies: Local backend and database availability; one unambiguous recoverable topic literature scope (normally an active topic profile); current retrieval-ready, claim-bearing role-balanced literature; user decisions at every Human-authority stop. Provider/cost execution remains disabled.
- Exit criteria: The negative lineage remains non-advancing; the objection invalidates an unconsumed bridge; wording-only resolution fails; substantive repair yields a new current checkpoint chain; the repaired topic handoff creates exactly one downstream lineage and exact replay returns it.
- Verification: Read `research-status`, checkpoint history/packets, blockers, allowed actions, bridge state, and topic-handoff owner IDs after every mutation. Preserve idempotency keys and verify `409`/`422` fail-closed outcomes before following returned loopbacks.
- Recovery: Stop at the last persisted owner projection, retain IDs and idempotency keys, and resume only through the returned allowed action. Do not delete audit records, query Prisma directly, start a server without approval, or substitute provider output for missing product authority.

## Kickoff gate

- Status: ready
- Authorized boundary: through Phase 6 product-path acceptance
- [x] Decisions: checkpoint-control direction, cutover, academic-policy strictness, minimal persistence, and legacy-route treatment are confirmed.
- [x] Design: persistence authorities, stage adapters, central guard seams, cutover behavior, and policy classification are settled for implementation.
- [x] Route: contract discovery precedes control-plane implementation, then evidence/gap, question/objection, and promotion closure.
- [x] Verification: contract, negative, replay, migration, and full-chain evidence obligations are identified in `verification.md`.

## Risks and recovery

| Risk | Detection | Mitigation | Recovery / rollback |
|---|---|---|---|
| Checkpoint state becomes a second content authority. | Packet or checkpoint stores independent versions of evidence, question, or promotion facts. | Store refs, hashes, decisions, and transition state; keep domain content in existing authorities. | Remove duplicate fields and rebuild the projection from domain records. |
| New gates make current records permanently unusable. | Existing current packages/bridges cannot be classified or reviewed under the cutover. | Inventory record classes and require an explicit versioned migration decision. | Keep records readable and block only new advance until a current review is created. |
| Academic policy becomes arbitrary count-based bureaucracy. | Advancement depends on raw paper/candidate counts despite weak evidence roles. | Make semantic role/quality rules authoritative and counts configurable tripwires only. | Reclassify the rule and preserve the negative evidence that exposed it. |
| Clients retain hidden bypasses. | Direct node routes can advance without a current checkpoint decision. | Centralize transition guard enforcement and cover every entry point with negative tests. | Fail closed at the control plane and remove the bypass before cutover. |
| Human participation becomes ceremonial again. | Packets omit alternatives, eliminated paths, unresolved objections, or allowed loopbacks. | Define packet completeness in product contracts and acceptance tests. | Block the checkpoint and regenerate the packet from current authority. |

## Phase closeout

- Review: At each phase, review authority boundaries, human decision semantics, bypass analysis, and whether new rules improve informed control rather than only adding records.
- Record update: Keep status, architecture, verification evidence, workflow matrix, OpenAPI, and project mapping aligned with confirmed product reality.
- Checkpoint: Land only verified, recoverable phase units with the task trailer after scoped sync and governance lint.
- Post-completion audit: Re-run lineage, concurrency, contract-completeness, matrix-drift, fixture-realism, and supported-Node verification before archive readiness; any discovered gap remains owned by T-147 until repaired and decisively reverified.
