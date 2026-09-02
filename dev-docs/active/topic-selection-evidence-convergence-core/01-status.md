# Status

## Goal
Resolve the evidence-convergence problems exposed by T-148 and implement the process changes agreed during that real-flow review: use the managed literature library as retrieval fuel, let Debate request evidence as needed, turn material evidence change into traceable successor results and linked rounds, and route unresolved gate failures without rewriting prior Human decisions.

## Progress
- State: in-progress
- Current phase: Approved planning checkpoint complete; implementation has not started
- Next step: Begin Phase 1 contract discovery for the research-question candidate Debate pilot when T-150 implementation is selected.
- Blocker: none. External literature acquisition and rollout to other Debate scenarios remain intentionally outside this task.

## Done when
- [ ] ECK-01: Every accessible indexed, evidence-ready literature record is eligible for retrieval by default unless an explicit Human scope narrows the corpus.
- [ ] ECK-02: A typed RetrievalRequest binds an unresolved issue and intended decision effect to a durable, deduplicated retrieval execution with recoverable SearchRun provenance.
- [ ] ECK-03: Retrieval has no fixed request-count limit, while equivalent requests reuse durable results and unchanged strategies stop at explicit saturation or the standing execution boundary.
- [ ] ECK-04: A Debate continues after new evidence as a new frozen round linked to the prior transcript and evidence delta; a mutable in-place resume cannot erase replay identity.
- [ ] ECK-05: Material evidence change publishes a successor EvidenceMap while preserving predecessor content, checkpoint history, and Human decisions.
- [ ] ECK-06: One research-question candidate Debate pilot can request full-library retrieval, admit claim-level evidence, publish any required successor map, run a linked round, and recheck the same deterministic gate.
- [ ] ECK-07: The pilot's material gate issue exposes one typed resolution route with an owning stage, required delta, and recheck condition; downstream Human decisions are never automatically overturned.
- [ ] ECK-08: Focused failure, replay, no-delta, budget-boundary, and real-flow checks prove the pilot without introducing parallel authority or temporary dual routes.
