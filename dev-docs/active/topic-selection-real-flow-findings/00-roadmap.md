# Roadmap

## Scope and constraints

### In scope
- Reproduce, classify, repair, and re-verify topic-selection defects exposed by the 2026-09-01 real-flow rehearsal.
- Make evidence-landscape and research-question Human views decision-ready and faithful to canonical packets and current authorities.
- Make required coverage verdicts constrain evidence-landscape eligibility instead of inferring success from adjacent EvidenceUnits.
- Align public request/route contracts with implemented EvidenceMap and run-coordinator behavior.
- Normalize the exact ref-kind/shape mismatches that forced operator-authored aliases or schema-valid blocked attempts.
- Make bounded Debate a regular research-question candidate-review component using the existing runtime and deterministic gate.
- Settle and align the bounded-Debate policy for promotion review.
- Produce decision-ready grouped condition candidates for conditional promotion while preserving exact Human confirmation and the strict unmapped-risk gate.
- Reconcile resolved warnings and current value/disposition state in user-facing projections.
- Replace opaque internal version labels with research-stage language in user-facing operation and guidance.
- Preserve retriever/provider/evidence-delta accounting as verification evidence for the rehearsal.

### Out of scope
- RetrievalRequest orchestration, full-library evidence onboarding, linked multi-round Debate, EvidenceMap successor lifecycle, or a reusable ResolutionRoute; T-150 owns those capabilities.
- Broad redesign of the topic-selection UI, workflow DAG, or research methodology.
- Retrofitting every Debate or loopback path.
- Automatic external discovery/acquisition or new provider activation.
- Advancing, rejecting, or otherwise deciding a research topic on the user's behalf.
- Per-query retrieval-utility experiments, SciFact workload extensions, or a repository-wide backup system.
- T-149 vector-persistence implementation or its uncommitted governance checkpoint.

### Constraints and dependencies
- Canonical product APIs remain authority; real-flow verification does not use direct database writes or reads.
- Strict-human checkpoints remain decision authority. Views, Debate artifacts, and condition candidates are support only.
- Historical decisions, rejected lineages, and superseded packages remain immutable.
- T-150 may reuse findings and interfaces discovered here, but its retrieval-native pilot starts at evidence-landscape convergence and neither task duplicates the other's implementation outcome.

## Decision alignment

| Decision question | Options / tradeoffs | Current direction | Status | Owner / required confirmation | Closure evidence | Consequences |
|---|---|---|---|---|---|---|
| Should the evidence-convergence architecture remain in this rehearsal task? | Keeping it here combines defects with a new cross-stage capability; splitting preserves a smaller repair lifecycle. | Move RetrievalRequest, linked rounds, successor maps, and reusable resolution routing to T-150. | decided | User | Explicit approval to split the task after independent code review | This task returns to the defects and policy gaps directly exposed by the rehearsal. |
| Which Feature owns this task? | F-001 owns research lifecycle governance; F-000 defers placement. | F-001 Research Lifecycle Governance Core. | decided | User | Explicit placement confirmation on 2026-09-03 | The task is projected under the lifecycle-governance capability. |
| Does a material conflict belong in Human-visible open risks? | Keeping conflict and objection vocabularies separate is precise, but rendering a material conflict as no risk is misleading. | Present material conflicts as risks without treating every material conflict as an automatic blocker. | decided | User | Planning checkpoint approved on 2026-09-03 | Fixes projection truth without weakening the existing blocking-severity distinction. |
| Should regular research-question candidate review include Debate? | Failure-only escalation is cheaper but allows consequential single-agent recommendations to advance without adversarial review. | Use one bounded regular Debate and retain deeper escalation only for exceptional cases. | decided | User | Explicit direction during the rehearsal | Existing Debate support remains non-authoritative and the deterministic gate stays singular. |
| When should promotion support use Debate? | Always-on review increases cost; deterministic-only support missed material-risk scrutiny. | Require one bounded Debate when promotion input carries material risk; preserve a documented deterministic fast path for risk-free input. | decided | User | Planning checkpoint approved on 2026-09-03 | Runtime, OpenAPI, guidance, cost, and provenance must agree before implementation. |
| How should conditional-promotion risks become conditions? | Raw ref entry is exact but operator-heavy; weakening coverage is unsafe. | Support proposes complete typed risk groups and early checks; the Human edits or confirms exact conditions and the final gate remains fail-closed. | decided | User | Planning checkpoint approved on 2026-09-03 | Decision support improves without creating an automatic promotion authority. |
| What should checkpoint rejection do to TitleCard management state? | Automatically parking the TitleCard couples research and management authority; leaving it active without a terminal projection is misleading. | Derive terminal research rejection in title-card and research views; keep management state unchanged. | decided | User | Planning checkpoint approved on 2026-09-03; 2026-09-07 owner inspection confirms no checkpoint-to-management mutation contract | Avoids an undocumented cross-authority state transition. |
| How may a required missing coverage row advance? | Pretending adjacent EvidenceUnits satisfy the row is unsafe; a new generic obligation store is unnecessary for this local gate. | Add a typed evidence-checkpoint issue and let an `advance` decision carry the exact accepted coverage-row refs plus rationale. The gate verifies them against the current snapshot, persists the acceptance in the decision record, and propagates it downstream. | decided | User | Independent review accepted on 2026-09-03 | Human acceptance becomes explicit authority without creating a second decision store. |
| What portion of recent-work coverage does T-148 own? | Making T-148 perform full-library onboarding duplicates T-150; making it depend on T-150 blocks the rehearsal repair. | T-148 must make unresolved freshness and near-duplicate risk visible and non-silent at the gate. T-150 owns systematic retrieval and evidence onboarding. | decided | User | Independent review accepted on 2026-09-03 | T-148 can close independently while preserving an explicit relationship to T-150. |

### Assumptions

| Assumption | Risk if wrong | Validation |
|---|---|---|
| All Human-view content required by this task can be derived from current checkpoint packets and referenced authorities. | A projection fix could require a new decision authority or data model. | Trace every proposed field to a canonical packet, contract, assessment, or risk record before implementation. |
| EvidenceMap runtime validation is the intended public request behavior. | OpenAPI alignment could expose internal-only fields. | Confirmed for FIND-003 by registered-route schema, service inputs, and HTTP consumption checks; the direct EvidenceMap request is public and its existing source-authority gate remains enforced. |
| Regular Debate routing can reuse the existing scenario and gate without adopting T-150 contracts. | The route could accidentally depend on retrieval-native round semantics. | Keep T-150 interfaces out of this task and verify frozen-evidence behavior explicitly. |

## Task relationships

| Task | Relationship from this task | Owned boundary / exchanged contract | Coordination condition |
|---|---|---|---|
| T-149 | depends-on follow-up | T-149 owns durable native-vector persistence and returned the recovered retrieval-ready literature owner. | This task consumes the verified outcome and never stages or commits T-149 changes. |
| T-150 | spawned follow-up / sibling | T-150 owns RetrievalRequest, full-library evidence onboarding, linked Debate rounds, successor EvidenceMaps, and the evidence-landscape pilot ResolutionRoute. | FIND-029 through FIND-031 provide discovery evidence. This task owns the concrete coverage gate and Human acceptance contract but does not wait for T-150 to make unresolved literature risk visible. |

## Implementation plan

### Completed rehearsal foundation
- The real run produced a traceable reject-and-replace lineage, strict Human decisions, a recovered question-refinement route, one bounded delta Debate, a corrected topic package, one published promotion input, and an active conditional-promotion bridge.
- FIND-020 and FIND-024 through FIND-026 are implemented and verified. Their immutable decisions and exact replay evidence remain valid.

### Phase 1 — Repair decision truth and evidence eligibility
- Outcome: Human checkpoint views and the evidence gate agree with canonical evidence, conflicts, coverage verdicts, current value state, and available decisions.
- Approach: Improve deterministic projections and consume existing coverage authority; do not introduce retrieval orchestration or a new decision store.
- Planned changes:
  1. Project substantive evidence statements, the actual research question, material conflicts, dependencies, falsifiers, claim ceiling, and current risks from canonical owners.
  2. Bind the evidence-landscape checkpoint to latest required coverage assessments. Emit a deterministic required-coverage-missing issue with exact row refs; allow `advance` only when its typed payload accepts those current refs with rationale, then persist and propagate that acceptance.
  3. Reconcile current value assessments, dispositions, replacement-contract fields, and resolved warnings in research status and Human views.
  4. Decide and expose rejected-topic disposition without inventing a cross-authority TitleCard mutation.
- Affected boundaries / entry points: Evidence and question stage views, research status, evidence-landscape checkpoint materialization and packet.
- Dependencies: Current coverage-assessment, checkpoint-decision, and downstream lineage owners; no T-150 implementation dependency.
- Exit criteria: TSRF-01, TSRF-02, TSRF-06, TSRF-08, TSRF-09, and TSRF-12 pass.
- Verification: Projection truth tables plus focused required-missing, material-conflict, answerable-with-risk, resolved-warning, and rejection scenarios.
- Recovery: Revert projections or assessment binding while preserving canonical packets, coverage records, and decisions.
- Phase progress: Required-coverage acceptance, evidence/question Human views, current value/risk/disposition projection, FIND-023 review-trigger reconciliation, and recent-work risk visibility are implemented and focused-verified, closing TSRF-01, TSRF-02, TSRF-06, TSRF-08, TSRF-09, and TSRF-12. New evidence packets freeze unverified recent-literature coverage and unresolved near-duplicate risk for the existing exact Human review. Exact Human confirmations may resolve question review triggers; independent risks remain visible, later refinements preserve unchanged fields, and changed supporting fields reopen their triggers. Historical replay and frozen checkpoints remain intact. FIND-011 now derives terminal rejection from the connected current Human checkpoint decision for title-card and research views, excludes rejected cards from active/pending-promotion counts, and stops routine continuation without changing management status or historical authority. Phase 1 implementation is complete; live verification remains a later bounded check.

### Phase 2 — Close public contract and local composition gaps
- Outcome: Contract-correct callers can execute the existing workflow without undocumented aliases, node-invalid fields, or missing public routes.
- Approach: Align schemas and normalize equivalent authority refs at their narrowest existing boundaries.
- Planned changes:
  1. Align the public EvidenceMap request schema with runtime-supported fields and enums.
  2. Document run-state/advance routes and apply node-specific request constraints where the generic schema currently admits invalid runtime fields.
  3. Resolve selection-decision ref-kind drift and equivalent scoped/unscoped ref identity without weakening source provenance.
  4. Distinguish persisted downloader overrides from repository defaults and make preflight reject an effective byte/time/redirect policy that cannot admit the planned asset when that impossibility is knowable. Do not redesign acquisition or downloader orchestration here.
- Affected boundaries / entry points: OpenAPI, route schemas, functional-ref normalization, acquisition preflight, local runtime diagnostics.
- Dependencies: Phase 1 owner inspection where projections and routes share contracts.
- Exit criteria: TSRF-03 and the in-scope dispositions under TSRF-04/05/07 pass without a second API path.
- Verification: Schema/runtime parity tests, exact persisted-ref replay, preflight boundary tests, and read-before-replay checks.
- Recovery: Revert additive contract and normalization adapters; retain all existing records.
- Phase progress: FIND-003 / TSRF-03 is implemented and focused-verified. The public EvidenceMap request documents all registered input fields and enums, including strict locator fields and optional structural records. Nullable-number schema unions preserve explicit null through HTTP validation. FIND-022 now documents the registered state/advance contracts, budget scopes, halt reasons, and exact N9→N7 Human recovery. FIND-015 rejects non-null run_mode/profile_id on deterministic-only N1/N9/N10/N11 at shared HTTP ingress before a durable attempt; historical harness admission/replay remains unchanged. FIND-016 now lets N6 consume the exact persisted N5 selection-decision ref while retaining the stable frozen snapshot label. Coordinator alias synthesis is removed; canonical and legacy source refs must match the persisted selection ID/title/version, and frozen hashes and historical replay remain intact. FIND-010 now admits equivalent absent/null/current-title evidence refs at the existing SearchRun/EvidenceMap boundary while retaining exact type/ID/version comparison, current-run bindings and fulltext checks. Explicit foreign scopes remain excluded, and rejected refs report the indexed field and supplied ref. Persisted refs and hashes are unchanged. FIND-009 now exposes a planning-time downloader policy with repository defaults, persisted/default field sources and the effective request ceiling. Caller-known explicit-URL sizes above that ceiling and limits or known sizes incompatible with the PDF signature block locally with zero planned calls; unknown network conditions remain unverified. Historical jobs are unchanged. Local Phase 2 implementation is focused-verified; Phase 3 starts with FIND-018, while the later bounded real-flow acceptance checks remain outstanding.

### Phase 3 — Align regular Debate and promotion decision support
- Outcome: Consequential question and promotion recommendations receive the agreed bounded review, and conditional-promotion support is ready for Human confirmation.
- Approach: Reuse existing bounded Debate runtimes and deterministic gates; keep T-150 retrieval-native behavior out of this task.
- Planned changes:
  1. Route normal research-question candidate generation through the smallest existing bounded Debate profile before the current gate.
  2. Apply the confirmed material-risk trigger policy to promotion support and align runtime, OpenAPI, guidance, cost, and provenance.
  3. Generate complete typed risk-to-condition groups and early-check candidates while preserving exact Human editing/confirmation and the unmapped-risk rejection.
- Affected boundaries / entry points: Research-question candidate coordinator, promotion support, public contracts, operator guidance, condition mapping.
- Dependencies: Existing Debate runtimes and the confirmed promotion Debate and condition-mapping policies.
- Exit criteria: TSRF-10, TSRF-15, and TSRF-16 pass without adding retrieval orchestration or another authority gate.
- Verification: Normal-path Debate provenance, risk-free fast path, material-risk Debate, complete/partial condition mapping, and zero-partial-write tests.
- Recovery: Restore current routing while retaining existing Debate runtimes and strict promotion gate behavior.

### Phase 4 — Re-run and close the rehearsal task
- Outcome: A fresh bounded workflow exposes truthful decisions, survives the repaired local contracts, applies regular Debate policy, and produces no unresolved in-scope defect.
- Approach: Replay only the paths needed to verify the fixes and report retriever/provider/evidence-delta accounting without implementing T-150.
- Planned changes:
  1. Re-run rejection/replacement, evidence checkpoint, research-question convergence, value refinement, package, and conditional promotion checks at their relevant boundaries.
  2. Audit user-facing language and replace opaque internal version labels with research-stage names.
  3. Reconcile all retained findings, acceptance references, and adjacent follow-ups.
- Affected boundaries / entry points: End-to-end topic-selection verification and user-facing operation.
- Dependencies: Phases 1 through 3.
- Exit criteria: All retained TSRF references pass and FIND-029 through FIND-031 remain owned only by T-150.
- Verification: Focused checks plus one recoverable real-flow evidence bundle.
- Recovery: Stop at the last trustworthy gate, preserve immutable decisions, and use only supported existing recovery routes.

## Kickoff gate

- Status: ready
- Authorized boundary: the retained T-148 defect and policy scope; T-150 convergence architecture remains excluded.
- [x] Decisions: project placement, material-conflict presentation, explicit coverage-gap acceptance, recent-work ownership, rejection disposition, promotion Debate trigger, and condition-support policy were confirmed on 2026-09-03.
- [x] Design: the narrowed local repair boundaries are reflected in `02-architecture.md` without T-150 implementation detail.
- [x] Route: the four phases close the retained findings and acceptance references without broad workflow redesign.
- [x] Verification: focused truth, contract, Debate, decision-support, and bounded replay checks are identified.

## Risks and recovery

| Risk | Detection | Mitigation | Recovery / rollback |
|---|---|---|---|
| A projection becomes a second authority. | Human-visible content cannot be traced to a packet or current referenced owner. | Derive every field deterministically and retain exact refs. | Revert the projection and preserve canonical records. |
| Coverage repair blocks legitimate accepted risk or loses it downstream. | A required `missing` row cannot proceed after explicit acceptance, or the acceptance disappears after the checkpoint decision. | Add the minimal typed acceptance fields to the persisted decision, verify exact current row refs, and propagate the decision authority downstream. | Halt for Human review; never silently pass, discard the missing verdict, or invent a generic obligation record. |
| Regular Debate duplicates T-150 architecture. | Changes introduce RetrievalRequest, linked-round, successor-map, or generic resolution contracts. | Keep this task on existing frozen-evidence runtimes and route policy only. | Revert the new abstraction and defer it to T-150. |
| Contract normalization weakens provenance. | A ref from a different source, version, or title is admitted as equivalent. | Normalize only optional representational fields after concrete owner/version checks. | Restore exact-shape comparison and expose a precise caller error. |
| The task grows back into platform redesign. | Planned changes touch full-library orchestration, multiple Debate migrations, or broad DAG replacement. | Enforce the T-150 boundary and open separate outcomes only after explicit approval. | Stop at finding disposition and return out-of-scope work to its owner. |

## Phase closeout

- Review: Confirm each retained finding's disposition, current Human-visible behavior, and any user-owned policy decision.
- Record update: Keep status, architecture, findings, and verification synchronized; record only relationship edges to T-149/T-150.
- Checkpoint: Commit one verified phase at a time with the T-148 trailer and never include foreign T-149 or T-150 changes.
