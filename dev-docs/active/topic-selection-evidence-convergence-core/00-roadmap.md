# Roadmap

T-150 is the implementation owner for the evidence-convergence problems exposed by T-148 and the process adjustments agreed during that review. It is not an independent architecture initiative: each capability below must close an observed T-148 failure or an explicitly accepted adjustment, and the first delivery is limited to the evidence-landscape convergence boundary where search, evidence admission, and checkpoint recheck already share one lineage.

## Scope and constraints

### In scope
- Define one reusable RetrievalRequest lifecycle for literature-dependent Debate work.
- Search the complete accessible indexed, evidence-ready managed library by default while preserving explicit Human corpus constraints.
- Persist request equivalence, strategy identity, execution/reuse, SearchRun provenance, replayable corpus identity, claim-level evidence delta, and intended decision effect before interpretation.
- Continue a Debate after material evidence change as a new frozen round linked to the preceding transcript and delta.
- Publish material evidence changes as successor EvidenceMaps with explicit predecessor/successor lineage.
- Introduce the smallest typed resolution route needed by one evidence-landscape convergence Debate pilot.
- Reuse the existing literature retriever, SearchPlan/SearchRun authority, Arena retrieval seam, Debate core, EvidenceMap materialization, and evidence-landscape checkpoint gate wherever their current contracts remain valid.

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
- Roles may request retrieval but cannot declare request novelty or strategy change; one deterministic coordinator derives both identities from normalized inputs.
- T-149 owns reliable native-vector persistence; this task consumes its verified retrieval-ready outcome without changing its implementation.

## Decision alignment

| Decision question | Options / tradeoffs | Current direction | Status | Owner / required confirmation | Closure evidence | Consequences |
|---|---|---|---|---|---|---|
| What is the default retrieval corpus? | Topic snapshots improve local precision but can suppress recall; full managed-library retrieval increases noise but preserves discoverability. | Search every accessible indexed, evidence-ready managed-library record by default; only an explicit Human scope may exclude it. | decided | User | Explicit full-library direction | Topic context becomes ranking and provenance input rather than an implicit whitelist. |
| Is EvidenceMap process state or result authority? | Mutating a map is convenient but destroys checkpoint meaning; successor maps retain history at the cost of explicit lineage. | EvidenceMap content is an immutable result; material new evidence creates a successor and preserves prior checkpoint history. | decided | User | Explicit process/result distinction | RetrievalRequest, SearchRun, candidate evidence, and Debate rounds own the live process. |
| How are RetrievalRequests bounded? | A numeric request cap is simple but can stop before evidence convergence; an unbounded loop can repeat work indefinitely. | No fixed request-count limit. The coordinator reuses equivalent work and enforces a named per-issue policy for maximum orchestration steps/rounds, elapsed time, and accumulated retrieval cost. Boundary exhaustion produces an unresolved or Human-escalation result, never a pass. | decided | User, with code-review refinement | User rejected a numeric request cap and accepted a separate standing execution boundary. | Phase 1 must bind concrete defaults and configuration ownership before implementation. |
| Does new evidence resume the same Debate record? | In-place resume is simpler but conflicts with frozen hashes; linked rounds preserve replay at modest contract cost. | Create a new frozen round with prior-transcript and evidence-delta hashes rather than mutating the prior round. | decided | User | Planning checkpoint approved on 2026-09-03 | The current shared core remains a per-round primitive rather than becoming mutable session state. |
| Which scenario proves the kernel first? | The research-question candidate stage already needs regular Debate, but its input bundle freezes the EvidenceMap and its evidence-expansion route returns to intake; the evidence-landscape stage already owns SearchPlan, SearchRun, EvidenceMap, checkpoint, and recheck lineage. | Pilot retrieval-native Debate at evidence-landscape convergence, before the downstream frozen question lineage. | decided | User | Independent review accepted on 2026-09-03 | The pilot tests evidence convergence without reopening downstream Human decisions; regular frozen-evidence question Debate remains in T-148. |
| What counts as saturation? | One zero-result request is too aggressive; letting a role self-declare a new strategy has no stable boundary. | The coordinator derives request and strategy identities deterministically. Saturate one issue/strategy after a completed execution yields no material claim-level or decision-relevant delta; only a coordinator-recognized strategy change may continue within the standing policy. | decided | User | Independent review accepted on 2026-09-03 | Rephrasing or replay cannot simulate progress, while a materially different search remains possible. |
| How is a full-library SearchRun replayed? | A corpus hash proves equality but cannot reconstruct membership; storing only returned hits omits the candidate universe. | Bind each execution to a canonical managed-corpus manifest ref and hash plus index, embedding, freshness, retrieval-policy, and reranker identities. | decided | User | Independent review accepted on 2026-09-03 | Full-library scope stays broad while every execution has a reproducible corpus and ranking context. |
| Which Feature owns the capability? | F-001 already owns research lifecycle governance; F-000 defers placement. | F-001 Research Lifecycle Governance Core. | decided | User | Explicit placement confirmation on 2026-09-03 | The task is projected under the lifecycle-governance capability. |

### Assumptions

| Assumption | Risk if wrong | Validation |
|---|---|---|
| The Arena role-evidence service can be reduced to reusable retrieval/provenance primitives rather than copied into the pilot. | A hidden Arena-specific invariant could force duplicate logic or broaden the task. | Trace its snapshot, retrieval, SearchRun, and unresolved-hit responsibilities before approving the implementation plan. |
| Claim-level evidence and decision-relevant coverage changes are sufficient to measure material delta. | Important negative evidence or source-health changes could be discarded as zero delta. | Include negative coverage, source freshness, and conflict changes in the contract review and test matrix. |
| The evidence-landscape workflow can host the pilot without minting a parallel evidence authority. | A copied coordinator could diverge from existing SearchPlan, SearchRun, EvidenceMap, or checkpoint ownership. | Trace the current search recheck, child-plan, map materialization, and checkpoint loopback seams and extend only their canonical owners. |

## Task relationships

| Task | Relationship from this task | Owned boundary / exchanged contract | Coordination condition |
|---|---|---|---|
| T-148 | derived-from / narrow dependency | T-148 retains real-flow defects, presentation, the concrete coverage gate and Human acceptance contract, regular frozen-evidence Debate policy, condition mapping, and terminology; this task owns retrieval-native evidence convergence. | T-148's Phase 1 Human view and typed required-coverage issue are implemented and focused-verified. Phase 2 may consume that issue without altering T-148's downstream question-Debate route. |
| T-149 | depends-on | T-149 owns durable native-vector materialization; this task consumes an indexed, evidence-ready managed library. | The pilot requires T-149's verified persistence behavior, not its uncommitted task files or implementation changes. |

## Implementation plan

### Phase 1 — Freeze the evidence-landscape pilot contracts
- Status: completed, repaired, and re-verified on 2026-09-03; the additions remain dormant until Phase 2 selects the pilot route.
- Outcome: One implementation-ready vertical slice has exact request, delta, round, successor, and resolution identities.
- Approach: Start from the existing global retriever and evidence-landscape SearchPlan/SearchRun/checkpoint seams, then add only fields required to replay one evidence issue.
- Planned changes:
  1. Reuse `LiteratureResourcePoolSnapshot` as the corpus-manifest authority by adding a managed-library source and retrieval-stack membership derived through the same eligibility resolver as retrieval.
  2. Extend the existing search-recheck lifecycle with coordinator-derived `request_key` and `strategy_key`; represent `EvidenceDelta` and `ResolutionRoute` as typed immutable control-plane artifacts and reuse Arena-session supersession as linked-round lineage.
  3. Add only the missing EvidenceMap predecessor/current-head/successor contract and transactional compare-and-swap transition; do not create parallel corpus, round, delta, or route stores.
  4. Name and snapshot the standing maximum per-issue orchestration steps/rounds, elapsed time, and accumulated retrieval cost; prove through pure contract tests that exhaustion cannot become gate success.
- Affected boundaries / entry points: Literature retrieval, Arena retrieval primitives, SearchPlan/SearchRun, shared Debate core, EvidenceMap lifecycle, evidence-landscape checkpoint and recheck routes.
- Dependencies: Existing retriever, evidence-landscape, and Debate seams plus the approved pilot and round/convergence decisions.
- Exit criteria: ECK-01 through ECK-05 and ECK-07 have contract tests or approved executable specifications.
- Verification: Schema validation, hash/replay fixtures, transition truth tables, and a no-new-authority dry run.
- Recovery: Keep all additions dormant and leave existing Debate and EvidenceMap routes unchanged.

Phase 1 landed the managed-library manifest on `LiteratureResourcePoolSnapshot`, including the exact candidate-window identity and either the full eligible corpus or a strict Human-confirmed subset. It placed coordinator identities and execution lineage on `SearchPlanRecheckRequest`, immutable EvidenceDelta/ResolutionRoute artifacts on the control plane, and a closed linked-round schema. EvidenceMap successor compare-and-swap is the only new persisted lifecycle primitive: initial creation and ordinary freshness updates cannot manufacture successor state, and both in-memory and Prisma implementations enforce the same lineage boundary. The repaired checkpoint also scopes artifact idempotency to title/workspace/lineage, closes the HTTP and persisted schemas, and makes in-memory request reuse atomic. No downstream question/value/promotion route was changed.

### Phase 2 — Execute one retrieval-native evidence loop
- Outcome: One unresolved evidence-landscape issue can gather managed-library evidence and return to a fresh instance of the same checkpoint gate through a successor evidence result and linked Debate round.
- Approach: Reuse the canonical search/recheck pipeline and Arena's narrow retrieval/provenance primitives, but materialize outside-map hits through explicit claim-level admission and successor lineage before starting the next round.
- Planned changes:
  1. Let pilot roles emit RetrievalRequests and let one coordinator normalize, merge, reuse, execute, and redistribute their results.
  2. Persist actual executions before interpretation and distinguish retrieved hits from admitted evidence and material delta.
  3. Publish a successor EvidenceMap only when the admitted delta is material, run a linked Debate round over that frozen successor evidence, then materialize and recheck a fresh instance of the same checkpoint gate.
  4. Halt on unresolved no-delta, exhausted execution policy, missing Human authority, or failed provenance rather than converting any of them into a pass.
- Affected boundaries / entry points: Evidence-landscape pilot role output, retrieval coordinator, SearchRun recorder, evidence materialization, Debate admission, checkpoint and coordinator frontier.
- Dependencies: Phase 1, retrieval-ready indexed literature, and T-148's typed required-coverage issue contract; no dependency on T-148's later presentation or Debate-policy phases.
- Exit criteria: ECK-02 through ECK-07 pass for success, reuse, no-delta, and failure routes.
- Verification: Focused service/contract tests plus one bounded local end-to-end pilot.
- Recovery: Disable pilot routing, retain durable request/SearchRun/round artifacts, and preserve every prior map and decision.

Phase 2 is in progress. The retrieval slice accepts role-authored intents, applies the standing
boundary before new work, deduplicates equivalent requests, executes the exact managed-library
manifest, persists the child SearchPlan/SearchRun and raw query provenance, and redistributes the
durable execution to every requesting role. The child plan preserves the parent coverage rows and
the SearchRun carries predecessor locator authorities, so successor construction does not weaken
lineage. Exact quote-bearing persisted hits can then produce immutable material or non-material
EvidenceDelta artifacts; only a material delta publishes a successor through the existing
compare-and-swap transition. The linked-round slice freezes that successor into a new support-only
Arena round, revalidates the parent transcript, EvidenceDelta, packets, role audits, and round link,
then materializes the original deterministic evidence-landscape checkpoint only after synthesis.
One composed bounded local pilot across all of these verified seams remains before Phase 2 exits.

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
- Authorized boundary: through phase 2, authorized after the repaired Phase 1 checkpoint review on 2026-09-03.
- [x] Decisions: the linked-round model, evidence-landscape pilot, coordinator-owned saturation identity, corpus manifest identity, and project placement were confirmed on 2026-09-03.
- [x] Design: the minimal contracts and authority boundaries are reflected in `02-architecture.md`.
- [x] Route: the pilot extends the existing SearchPlan → SearchRun → EvidenceMap → checkpoint lineage and does not cross the downstream frozen question bundle.
- [x] Verification: success, reuse, no-delta, boundary, race, replay, and Human-authority checks are identified in `verification.md`.

Phase 1's repaired exit is verified for ECK-01 through ECK-05 and ECK-07 at the contract or executable-repository-specification boundary. ECK-06 remains the authorized Phase 2 runtime outcome, while ECK-08 and Phase 3 remain pending by design.

## Risks and recovery

| Risk | Detection | Mitigation | Recovery / rollback |
|---|---|---|---|
| Full-library recall increases irrelevant hits. | Hit volume grows without claim-level or coverage delta. | Preserve a broad corpus but use issue-bound queries, reranking, source readiness, and evidence admission. | Adjust ranking and admission; do not restore an implicit topic whitelist. |
| No numeric request cap becomes an infinite loop. | Equivalent requests or unchanged strategies recur. | Canonicalize requests, reuse durable results, expose per-strategy saturation, and enforce the standing execution boundary. | Halt with an unresolved issue and require a changed strategy or Human disposition. |
| Successor publication races or severs lineage. | Two maps claim the same predecessor head or supersession occurs without a successor. | Use one transactional compare-and-swap successor transition and preserve predecessor content. | Reject the losing transition and re-read the current head. |
| The pilot grows into a multi-stage framework rewrite. | Changes touch downstream question, value, or promotion role contracts before the pilot exits. | Limit implementation and acceptance to the evidence-landscape convergence boundary. | Revert dormant abstractions and keep the proven pilot seam only. |
| New evidence appears to invalidate a Human decision automatically. | A coordinator changes decision status or frontier without a new Human checkpoint. | Emit a visible downstream obligation and require the existing Human authority boundary. | Halt at the prior decision and open a fresh review; never rewrite history. |

## Phase closeout

- Review: Confirm the pilot's evidence delta, replay identity, gate outcome, and Human-visible obligations.
- Record update: Keep this task's status, architecture, verification, and T-148 relationship aligned without copying mutable state between bundles.
- Checkpoint: Commit only this task's coherent planning or implementation unit with its allocated task trailer after approval and scoped governance validation.
