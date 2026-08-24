# 01 Plan

## Phases
1. [x] Review intake handoff from T-093 and motive fields from design docs.
2. [x] Define `CoreMotiveIdentity`, `CoreMotiveVersion`, `CoreMotiveSet`, assertion, and evidence-board contracts.
3. [x] Define `EvidenceTransferBinding`, `CrossBoardReview`, `MotivePortfolioDecision`, and `PortfolioCoordinator` boundaries.
4. [x] Define admission, version/evolution, portfolio-role, and confirmation rules.
5. [x] Add trace-ready refs for literature, topic-selection inputs, internal notes, challenge evidence, and portfolio decisions.
6. [x] Verify board and portfolio outputs can drive T-095 validation-cycle planning.

## Review Before Next Flow
- Confirmed uncertainty/gap fields are explicit enough for T-095 validation planning via assertions, board summaries, challenge state, accepted risks, and evidence bindings.
- Confirmed portfolio priority and motive-role fields are explicit enough for validation scheduling through `CoreMotiveSet` and `MotivePortfolioDecision`.
- Confirmed board summaries are display/interpretation only and cannot satisfy evidence support or citation authority.
- Confirmed cross-board/cross-version evidence reuse must create trace-ready `EvidenceTransferBinding`; old board/binding/motive refs cannot be direct evidence refs.
- Confirmed semantic changes create new versions and require `MotiveEvolutionDecision`; admitted versions are not overwritten.
- Confirmed primary motive merge/split/demote/abandon, primary replacement, and active portfolio broadening require human-confirmed transitions.

## Verification
- Schema tests cover contract export and invalid assertion/binding/portfolio payloads.
- Service tests cover draft creation, trace-gated admission, immutable admission, missing source refs, broken trace, semantic vNext gate, board creation, explicit evidence transfer, cross-board append-only behavior, and unconfirmed primary replacement.
- Route tests cover bootstrap -> draft -> trace -> admit -> evidence board through `buildApp`.
- Prisma repository tests cover round-trip persistence and required query indexes.
