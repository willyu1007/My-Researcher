# Status

## Goal
Resolve the evidence-convergence problems exposed by T-148 and implement the process changes agreed during that real-flow review: use the managed literature library as retrieval fuel, let Debate request evidence as needed, turn material evidence change into traceable successor results and linked rounds, and route unresolved gate failures without rewriting prior Human decisions.

## Progress
- State: in-progress
- Current phase: Phase 1 contract freeze authorized after the T-148 required-coverage issue contract landed
- Next step: After the T-148 evidence-view atomic checkpoint, implement Phase 1 through the existing resource-pool snapshot, search recheck, Arena-session, control-plane artifact, and EvidenceMap repository owners.
- Blocker: none for the authorized Phase 1 boundary. T-148's typed issue dependency landed in `dde23f76`; Phase 2 remains outside the current implementation authorization.

## Done when
- [ ] ECK-01: Every accessible indexed, evidence-ready literature record is eligible for retrieval by default unless an explicit Human scope narrows the corpus.
- [ ] ECK-02: A typed RetrievalRequest binds an unresolved issue and intended decision effect to coordinator-derived request/strategy identities and a durable, deduplicated retrieval execution with recoverable SearchRun provenance.
- [ ] ECK-03: Retrieval has no fixed request-count limit, while equivalent requests reuse durable results, unchanged strategies saturate, and explicit step/round, elapsed-time, and cost boundaries halt unresolved rather than passing.
- [ ] ECK-04: A Debate continues after new evidence as a new frozen round linked to the prior transcript and evidence delta; a mutable in-place resume cannot erase replay identity.
- [ ] ECK-05: Material evidence change publishes a successor EvidenceMap while preserving predecessor content, checkpoint history, and Human decisions.
- [ ] ECK-06: One evidence-landscape convergence Debate pilot can request full-library retrieval, bind the execution to a replayable corpus manifest, admit claim-level evidence, publish any required successor map, run a linked round, materialize a fresh checkpoint, and recheck the same deterministic gate contract.
- [ ] ECK-07: The pilot's material gate issue exposes one typed resolution route with an owning stage, required delta, and recheck condition; downstream Human decisions are never automatically overturned.
- [ ] ECK-08: Focused failure, replay, no-delta, budget-boundary, and real-flow checks prove the pilot without introducing parallel authority or temporary dual routes.
