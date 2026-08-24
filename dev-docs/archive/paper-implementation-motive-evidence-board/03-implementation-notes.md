# 03 Implementation Notes

## 2026-05-20 - Task Package Created
- Created `T-094` for motive/assertion/evidence-board contracts.
- Depends on T-093 intake identity and T-097 trace semantics.
- No product code changes were made.

## 2026-05-21 - Backend Minimum Closure Implemented
- Added shared motive/evidence-board contracts and JSON schemas for motive identity, set, version, version state, assertions, evidence board, bindings, cross-board review, portfolio decision, and evolution decision.
- Added Prisma motive tables and migration with queryable fields for gate, trace, portfolio, confirmation, source-ref, and evolution lookups.
- Added repository interface plus in-memory and Prisma repositories; service code remains Prisma-free.
- Added `PaperImplementationMotiveEvidenceBoardService` with:
  - active `ImplementationProject` requirement;
  - draft creation without `research-argument` authority reads/writes;
  - trace-gated version admission and immutable admitted versions;
  - source-ref-or-`hypothesis_only` gate;
  - semantic vNext gate through approved/applied `MotiveEvolutionDecision`;
  - assertion-centered evidence-board creation;
  - board-summary/memo-as-evidence blocking;
  - append-only `CrossBoardReview`;
  - portfolio role/set mutation only through `MotivePortfolioDecision`;
  - human confirmation requirement for primary replacement, merge/split/abandon, and active-portfolio broadening.
- Added REST routes for drafts, admission, motive reads, evidence boards, cross-board reviews, portfolio decisions, and evolution decisions.
- Added shared schema, service, Prisma repository, and route integration tests.

## 2026-05-21 - Review Hardening
- Closed portfolio authority gaps found during code review:
  - draft creation cannot introduce `primary`, `secondary`, `fallback`, or `supporting` roles before admission;
  - draft creation cannot change an existing motive role; role changes stay behind admission or `MotivePortfolioDecision`;
  - human-confirmed primary replacement now demotes existing primary motives to `secondary` in the same portfolio decision and updates both `CoreMotiveSet` and affected `CoreMotiveIdentity` rows;
  - explicit `MotivePortfolioDecision` payloads must assign every existing motive in the current set to exactly one post-decision role.
- Hardened evidence-board gates by normalizing evidence ref types before blocking summary/memo/interpretation refs, so casing and separator variants such as `board-summary` cannot bypass the policy.
- Added optional `motive_evolution_decision_id` to evolution-decision requests so a trace manifest can target the actual decision object before persistence; trace validation no longer conflates decision id with trace id.
- Approved/applied `MotiveEvolutionDecision` objects now require a complete trace at creation time and are rechecked before they can authorize a semantic `CoreMotiveVersion` draft.
- Completed `EvidenceTransferBinding` authority rather than leaving it as a dead table/contract: shared request schema, queryable source/target/trace fields, repository methods, service gate, REST routes, and tests now exist.
- Direct evidence refs to old motive/version/board/binding objects are blocked; cross-board or cross-version reuse must be represented by trace-ready `EvidenceTransferBinding` to avoid evidence laundering.
- Re-ran shared, backend targeted, typecheck, Prisma, DB context, database smoke, context, governance, and whitespace checks after the hardening pass.

## Open Notes
- Keep `CoreMotiveVersion` under `PaperImplementation`, not `research-argument`.
- T-095 should consume admitted motive versions, board gaps/conflicts, and portfolio constraints; it must not schedule validation from board summaries alone.
