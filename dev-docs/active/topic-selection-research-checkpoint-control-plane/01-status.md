# Status

## Goal
Make topic selection a product-governed research process in which current evidence, gap, question, and promotion checkpoints—and not client behavior—control academic-quality review, human participation, loopbacks, and downstream eligibility.

## Progress
- State: in-progress
- Current phase: Phase 3 — enforce evidence and gap quality
- Next step: Materialize native evidence/gap checkpoints from the guarded writers, strengthen semantic evidence and candidate-arena policy, and adapt HumanConfirmNeed to the current gap checkpoint.
- Blocker: none

## Latest checkpoint

- Phase 2 closed with product-owned v1 checkpoint, missing-stage decision, objection, and objection-resolution authorities; canonical packet/history/status APIs; snapshot-bound strict-human decisions; deterministic supersession; and a central transition guard.
- Both NeedCandidate persistence paths now call the same evidence-checkpoint guard before any write. Pending, stale, non-advancing, required-action, and blocking-objection states fail closed.
- Migration `20260825120000_add_topic_selection_research_checkpoints` replayed without Prisma drift and is applied to the local development schema. DB context and OpenAPI are aligned.
- The versioned backfill produced 2,249 pending `backfilled` anchors across 1,080 title cards: 647 evidence, 642 gap, 524 question, and 436 promotion. Reapplying it kept checkpoint and checkpoint-input-snapshot counts at 2,249 each.
- Focused contracts, service, route, bypass, and real-Postgres concurrency tests pass; one of two simultaneous distinct human decisions wins atomically and exact replay returns the winner.

## Done when
- [ ] A1: Product-owned checkpoint state, packets, decisions, currentness, supersession, and transition guards cover evidence, gap, question, and promotion review through documented HTTP APIs.
- [ ] A2: Evidence and gap advancement requires product-validated source quality, nearest-work/disconfirming coverage, and genuinely distinct candidate competition under current policy.
- [ ] A3: TopicQuestion value assessment cannot begin without a current human question confirmation that includes mechanism identifiability, proxy/confound, falsification, claim-ceiling, and objection review.
- [ ] A4: Durable blocking human objections invalidate affected downstream authority and cannot be cleared by rewording, client memory, or non-human action.
- [ ] A5: Promotion and PaperProject intake fail closed on unresolved objections, incomplete required actions, stale decisions, or unmapped advancement-relevant risks.
- [ ] A6: An API-first research-status projection lets any client recover completed work, alternatives, unresolved issues, current checkpoint, allowed decisions, and next authorized transition without reconstructing internal records.
- [ ] A7: Production contains no rehearsal/reduced-quality runtime path and no Codex- or GUI-specific semantic authority; test scenarios exercise the same guarded product contracts.
- [ ] A8: Versioned cutover, migration, replay/idempotency, OpenAPI/context alignment, and a full-chain negative regression based on the top-k academic-objection case are decisively verified.
