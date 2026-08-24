# T-094 Paper Implementation Motive Evidence Board

## Status
- State: done
- Parent task: `T-091 paper-implementation-full-landing`
- Mapping: `M-001 > F-001 > R-013`
- Flow node: motive, evidence board, and portfolio governance
- Next step: use admitted motive/evidence-board/portfolio outputs as T-095 validation-cycle planning inputs.

## Goal
- Establish the first implementation motive kernel under `ImplementationProject`.
- Create versioned motive assertions and evidence-board bindings.
- Manage motive portfolio roles and constraints without letting multiple motives drift into unbounded parallel work.
- Preserve gaps, conflicts, challenges, and source trace before validation planning.

## Non-goals
- Do not use `research-argument` graph as authority.
- Do not create claim readiness or dossier readiness.
- Do not treat board summaries or LLM rationale as evidence.

## Acceptance Criteria
- [x] `CoreMotiveIdentity` records origin, portfolio role, lifecycle status, and lineage.
- [x] `CoreMotiveSet` enforces active/primary/parallel-route constraints.
- [x] `CoreMotiveVersion` is immutable once admitted.
- [x] Motive assertions and evidence bindings have trace-ready refs.
- [x] Cross-board/cross-version evidence reuse requires trace-ready `EvidenceTransferBinding`.
- [x] `CrossBoardReview` can emit shared evidence, conflict, merge/split, route reuse, experiment reuse, and portfolio recommendations.
- [x] `MotivePortfolioDecision` records primary/secondary/fallback/supporting/parked/abandoned roles and required confirmation.
- [x] Evidence board exposes gaps/conflicts needed by validation-cycle planning.
- [x] Semantic motive changes require an evolution decision path.

## Implemented Surface
- Shared contracts: `packages/shared/src/research-lifecycle/paper-implementation-motive-contracts.ts`.
- Persistence: `prisma/schema.prisma` and migration `20260521100000_add_paper_implementation_motive_evidence_board`.
- Backend: motive repository, memory/Prisma implementations, `PaperImplementationMotiveEvidenceBoardService`, and PaperImplementation REST routes.
- Evidence transfer: explicit `EvidenceTransferBinding` authority with queryable source/target/trace fields; direct reuse of old board/binding/motive refs as evidence is blocked.
- Verification: schema tests, service tests, Prisma repository tests, route integration, typecheck, Prisma validate, DB context sync, and governance lint.
