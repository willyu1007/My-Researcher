# Status

## Goal
Resolve the evidence-convergence problems exposed by T-148 and implement the process changes agreed during that real-flow review: use the managed literature library as retrieval fuel, let Debate request evidence as needed, turn material evidence change into traceable successor results and linked rounds, and route unresolved gate failures without rewriting prior Human decisions.

## Progress
- State: in-progress
- Current phase: Phase 2 in progress; the role-request through durable retrieval/distribution slice is implemented and focused-verified on 2026-09-03
- Next step: Consume the persisted retrieval hits through explicit claim-level admission, then publish the material successor map, linked round, and fresh same-gate checkpoint.
- Blocker: none. Phase 2 is authorized through its defined exit; Phase 3 remains outside the current authorization.

## Phase 1 checkpoint

- [x] ECK-01 has an executable managed-library eligibility and corpus-manifest contract that shares the unscoped retriever's candidate-universe resolver, captures candidate-window identity, defaults to the full eligible corpus, and accepts narrowing only through exact Human authority.
- [x] ECK-02 has strict HTTP/persisted role-intent schemas, coordinator identity, atomic durable recheck-request reuse, exact corpus binding, and recoverable SearchRun-lineage contracts.
- [x] ECK-03 has fixed step/round/time/cost policy defaults and a pure boundary evaluator whose terminal outcomes cannot pass a gate.
- [x] ECK-04 has a closed linked-round contract requiring prior transcript and EvidenceDelta hashes; Phase 2 still owns runtime round creation.
- [x] ECK-05 has additive successor fields and one transactional EvidenceMap compare-and-swap repository transition with in-memory and Prisma race coverage; direct creation, ordinary freshness updates, nonzero successor revisions, and child-identity conflicts cannot bypass it.
- [x] ECK-07 has a typed immutable ResolutionRoute artifact whose authority boundary remains deterministic-gate then strict-Human.
- [ ] ECK-06 remains a Phase 2 end-to-end pilot outcome.
- [ ] ECK-08 remains Phase 3 failure/replay/real-flow proof.

## Phase 2 implementation checkpoint

- [x] Equivalent role-authored requests converge on one coordinator-derived durable request and one execution; each requesting role receives the same persisted SearchRun authority.
- [x] Full managed-library execution uses the unscoped retriever, strict Human subsets use the bounded snapshot retriever, and every returned hit is filtered back through exact manifest membership.
- [x] The coordinator creates a child SearchPlan that preserves the parent coverage matrix, records query results and raw provenance before distribution, carries predecessor EvidenceMap locator authorities forward, and closes only exact request/plan/run lineage.
- [x] Zero-hit executions remain durable succeeded SearchRuns and halt unresolved; standing-policy exhaustion occurs before new durable work and cannot become gate success.
- [ ] Claim-level admission, EvidenceDelta materialization, successor publication, linked round execution, and fresh same-gate checkpoint recheck remain the next Phase 2 slice.

## Done when
- [ ] ECK-01: Every accessible indexed, evidence-ready literature record is eligible for retrieval by default unless an explicit Human scope narrows the corpus.
- [ ] ECK-02: A typed RetrievalRequest binds an unresolved issue and intended decision effect to coordinator-derived request/strategy identities and a durable, deduplicated retrieval execution with recoverable SearchRun provenance.
- [ ] ECK-03: Retrieval has no fixed request-count limit, while equivalent requests reuse durable results, unchanged strategies saturate, and explicit step/round, elapsed-time, and cost boundaries halt unresolved rather than passing.
- [ ] ECK-04: A Debate continues after new evidence as a new frozen round linked to the prior transcript and evidence delta; a mutable in-place resume cannot erase replay identity.
- [ ] ECK-05: Material evidence change publishes a successor EvidenceMap while preserving predecessor content, checkpoint history, and Human decisions.
- [ ] ECK-06: One evidence-landscape convergence Debate pilot can request full-library retrieval, bind the execution to a replayable corpus manifest, admit claim-level evidence, publish any required successor map, run a linked round, materialize a fresh checkpoint, and recheck the same deterministic gate contract.
- [ ] ECK-07: The pilot's material gate issue exposes one typed resolution route with an owning stage, required delta, and recheck condition; downstream Human decisions are never automatically overturned.
- [ ] ECK-08: Focused failure, replay, no-delta, budget-boundary, and real-flow checks prove the pilot without introducing parallel authority or temporary dual routes.

The Done-when criteria stay unchecked until their runtime behavior is proven. The Phase 1 checkpoint above records contract/executable-spec coverage only and does not claim completion of the retrieval-native pilot.
