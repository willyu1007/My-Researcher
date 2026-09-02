# Roadmap

T-150 is the implementation owner for the evidence-convergence problems exposed by T-148 and the process adjustments agreed during that review. It is not an independent architecture initiative: each capability below must close an observed T-148 failure or an explicitly accepted adjustment, and the first delivery is limited to one vertical pilot.

## Scope and constraints

### In scope
- Define one reusable RetrievalRequest lifecycle for literature-dependent Debate work.
- Search the complete accessible indexed, evidence-ready managed library by default while preserving explicit Human corpus constraints.
- Persist request equivalence, execution/reuse, SearchRun provenance, claim-level evidence delta, and intended decision effect before interpretation.
- Continue a Debate after material evidence change as a new frozen round linked to the preceding transcript and delta.
- Publish material evidence changes as successor EvidenceMaps with explicit predecessor/successor lineage.
- Introduce the smallest typed resolution route needed by one research-question candidate Debate pilot.
- Reuse the existing literature retriever, SearchRun authority, Arena retrieval seam, Debate core, and deterministic gate wherever their current contracts remain valid.

### Out of scope
- Retrofitting every literature-coverage, research-gap, question, value, and promotion Debate in this task.
- Redesigning the complete topic-selection DAG or replacing existing loopback routes that are not needed by the pilot.
- Automatic external discovery, acquisition, or provider activation outside the managed library.
- Mutating historical EvidenceMap content, deleting superseded maps, or automatically reversing Human decisions.
- Human-view, OpenAPI, terminology, regular-Debate policy, and conditional-promotion defects retained by T-148.
- Per-query retrieval-utility experiments and unrelated backup or workload capabilities.

### Constraints and dependencies
- The managed library is process fuel; EvidenceMap remains a selected, replayable result.
- Existing deterministic gates remain the only admission authorities, and strict-human checkpoints remain the only Human decision authorities.
- No fixed RetrievalRequest count may stand in for convergence, but every run remains subject to one explicit time/cost/execution policy.
- T-149 owns reliable native-vector persistence; this task consumes its verified retrieval-ready outcome without changing its implementation.

## Decision alignment

| Decision question | Options / tradeoffs | Current direction | Status | Owner / required confirmation | Closure evidence | Consequences |
|---|---|---|---|---|---|---|
| What is the default retrieval corpus? | Topic snapshots improve local precision but can suppress recall; full managed-library retrieval increases noise but preserves discoverability. | Search every accessible indexed, evidence-ready managed-library record by default; only an explicit Human scope may exclude it. | decided | User | Explicit full-library direction | Topic context becomes ranking and provenance input rather than an implicit whitelist. |
| Is EvidenceMap process state or result authority? | Mutating a map is convenient but destroys checkpoint meaning; successor maps retain history at the cost of explicit lineage. | EvidenceMap content is an immutable result; material new evidence creates a successor and preserves prior checkpoint history. | decided | User | Explicit process/result distinction | RetrievalRequest, SearchRun, candidate evidence, and Debate rounds own the live process. |
| How are RetrievalRequests bounded? | A numeric request cap is simple but can stop before evidence convergence; an unbounded loop can repeat work indefinitely. | No fixed request-count limit. Equivalent work is reused, unchanged strategies saturate, and a standing execution boundary remains enforceable. | decided | User, with code-review refinement | User rejected a numeric cap; independent review separated strategy saturation from whole-issue exhaustion. | Convergence semantics and resource policy must be explicit and testable. |
| Does new evidence resume the same Debate record? | In-place resume is simpler but conflicts with frozen hashes; linked rounds preserve replay at modest contract cost. | Create a new frozen round with prior-transcript and evidence-delta hashes rather than mutating the prior round. | decided | User | Planning checkpoint approved on 2026-09-03 | The current shared core remains a per-round primitive rather than becoming mutable session state. |
| Which scenario proves the kernel first? | A five-scenario rollout is broad; one research-question pilot exercises the already desired regular Debate and the missing retrieval path. | Pilot the regular research-question candidate Debate only, then evaluate reuse before any further adoption. | decided | User | Planning checkpoint approved on 2026-09-03 | Other scenarios remain explicit follow-ups, not hidden completion work. |
| What counts as saturation? | One zero-result request is too aggressive; unlimited strategy changes are not an execution boundary. | Saturate one normalized issue/strategy when it produces no material claim-level or decision-relevant delta. A materially changed strategy may continue within the standing execution policy; otherwise route to semantic revision or Human disposition. | decided | User | Planning checkpoint approved on 2026-09-03 | Repeated equivalent queries cannot simulate progress, while a genuinely different search remains possible. |
| Which Feature owns the capability? | F-001 already owns research lifecycle governance; F-000 defers placement. | F-001 Research Lifecycle Governance Core. | decided | User | Explicit placement confirmation on 2026-09-03 | The task is projected under the lifecycle-governance capability. |

### Assumptions

| Assumption | Risk if wrong | Validation |
|---|---|---|
| The Arena role-evidence service can be reduced to reusable retrieval/provenance primitives rather than copied into the pilot. | A hidden Arena-specific invariant could force duplicate logic or broaden the task. | Trace its snapshot, retrieval, SearchRun, and unresolved-hit responsibilities before approving the implementation plan. |
| Claim-level evidence and decision-relevant coverage changes are sufficient to measure material delta. | Important negative evidence or source-health changes could be discarded as zero delta. | Include negative coverage, source freshness, and conflict changes in the contract review and test matrix. |

## Task relationships

| Task | Relationship from this task | Owned boundary / exchanged contract | Coordination condition |
|---|---|---|---|
| T-148 | derived-from / sibling | T-148 retains real-flow defects, presentation, local gates/contracts, regular-Debate policy, condition mapping, and terminology; this task owns the reusable evidence-convergence kernel. | T-148 supplies FIND-029 through FIND-031 evidence and must not duplicate this task's architecture. |
| T-149 | depends-on | T-149 owns durable native-vector materialization; this task consumes an indexed, evidence-ready managed library. | The pilot requires T-149's verified persistence behavior, not its uncommitted task files or implementation changes. |

## Implementation plan

### Phase 1 — Freeze the minimal pilot contracts
- Outcome: One implementation-ready vertical slice has exact request, delta, round, successor, and resolution identities.
- Approach: Start from the existing global retriever and Arena/SearchRun seams, then add only fields required to replay one research-question Debate issue.
- Planned changes:
  1. Inventory the reusable retriever, SearchRun, Debate-core, EvidenceMap, and gate seams and reject any premise that full-library search itself must be rebuilt.
  2. Specify RetrievalRequest equivalence and reuse, material evidence delta, DebateRound lineage, EvidenceMap successor transition, and the pilot ResolutionRoute.
  3. Define strategy-level saturation, standing execution-boundary behavior, and Human escalation without a request-count cap.
- Affected boundaries / entry points: Literature retrieval, Arena role evidence, SearchPlan/SearchRun, shared Debate core, EvidenceMap lifecycle, research-question candidate gate.
- Dependencies: Existing retriever and Debate seams plus the approved pilot and round/convergence decisions.
- Exit criteria: ECK-01 through ECK-05 and ECK-07 have contract tests or approved executable specifications.
- Verification: Schema validation, hash/replay fixtures, transition truth tables, and a no-new-authority dry run.
- Recovery: Keep all additions dormant and leave existing Debate and EvidenceMap routes unchanged.

### Phase 2 — Execute one retrieval-native Debate loop
- Outcome: One unresolved research-question issue can gather managed-library evidence and return to the same gate through a successor evidence result and linked Debate round.
- Approach: Reuse the Arena full-library retrieval and SearchRun recording pattern, but materialize outside-map hits through explicit claim-level admission and successor lineage before starting the next round.
- Planned changes:
  1. Let pilot roles emit RetrievalRequests and let one coordinator normalize, merge, reuse, execute, and redistribute their results.
  2. Persist actual executions before interpretation and distinguish retrieved hits from admitted evidence and material delta.
  3. Publish a successor EvidenceMap only when the admitted delta is material, then run a new linked Debate round and recheck the existing deterministic gate.
  4. Halt on unresolved no-delta, exhausted execution policy, missing Human authority, or failed provenance rather than converting any of them into a pass.
- Affected boundaries / entry points: Pilot role output, retrieval coordinator, SearchRun recorder, evidence materialization, Debate admission, coordinator frontier.
- Dependencies: Phase 1 and retrieval-ready indexed literature.
- Exit criteria: ECK-02 through ECK-07 pass for success, reuse, no-delta, and failure routes.
- Verification: Focused service/contract tests plus one bounded local end-to-end pilot.
- Recovery: Disable pilot routing, retain durable request/SearchRun/round artifacts, and preserve every prior map and decision.

### Phase 3 — Prove the kernel and stop before broad rollout
- Outcome: The pilot is replay-safe and provides enough evidence to decide whether another Debate scenario should adopt the kernel.
- Approach: Exercise duplicate requests, alternative strategies, negative retrieval, budget boundaries, stale sources, successor races, and strict-human barriers without adding another scenario.
- Planned changes:
  1. Complete focused failure and concurrency checks and one real-flow replay.
  2. Reconcile telemetry so request, retriever, provider, SearchRun, evidence-delta, Debate-round, and decision effects remain distinct.
  3. Record explicit adoption criteria and open a separate follow-up only when another scenario has an independently accepted outcome.
- Affected boundaries / entry points: Pilot observability, replay, operator recovery, task documentation.
- Dependencies: Phase 2.
- Exit criteria: ECK-08 passes and no temporary parallel authority or unowned route remains.
- Verification: Targeted regression suite, provenance audit, and one Human-reviewed real-flow packet.
- Recovery: Return to the last trustworthy map/gate and leave additional scenario adoption unstarted.

## Kickoff gate

- Status: ready
- Authorized boundary: approved T-148-derived planning scope and one research-question candidate Debate pilot; implementation remains a separate execution step.
- [x] Decisions: the linked-round model, research-question pilot, saturation rule, and project placement were confirmed on 2026-09-03.
- [x] Design: the minimal contracts and authority boundaries are reflected in `02-architecture.md`.
- [x] Route: the pilot connects a material issue to retrieval, evidence delta, a linked round, and the same gate without broad workflow redesign.
- [x] Verification: success, reuse, no-delta, boundary, race, replay, and Human-authority checks are identified in `verification.md`.

## Risks and recovery

| Risk | Detection | Mitigation | Recovery / rollback |
|---|---|---|---|
| Full-library recall increases irrelevant hits. | Hit volume grows without claim-level or coverage delta. | Preserve a broad corpus but use issue-bound queries, reranking, source readiness, and evidence admission. | Adjust ranking and admission; do not restore an implicit topic whitelist. |
| No numeric request cap becomes an infinite loop. | Equivalent requests or unchanged strategies recur. | Canonicalize requests, reuse durable results, expose per-strategy saturation, and enforce the standing execution boundary. | Halt with an unresolved issue and require a changed strategy or Human disposition. |
| Successor publication races or severs lineage. | Two maps claim the same predecessor head or supersession occurs without a successor. | Use one transactional compare-and-swap successor transition and preserve predecessor content. | Reject the losing transition and re-read the current head. |
| The pilot grows into a five-scenario framework rewrite. | Changes touch unrelated role contracts or loopback paths before the pilot exits. | Limit implementation and acceptance to one research-question scenario. | Revert dormant abstractions and keep the proven pilot seam only. |
| New evidence appears to invalidate a Human decision automatically. | A coordinator changes decision status or frontier without a new Human checkpoint. | Emit a visible downstream obligation and require the existing Human authority boundary. | Halt at the prior decision and open a fresh review; never rewrite history. |

## Phase closeout

- Review: Confirm the pilot's evidence delta, replay identity, gate outcome, and Human-visible obligations.
- Record update: Keep this task's status, architecture, verification, and T-148 relationship aligned without copying mutable state between bundles.
- Checkpoint: Commit only this task's coherent planning or implementation unit with its allocated task trailer after approval and scoped governance validation.
