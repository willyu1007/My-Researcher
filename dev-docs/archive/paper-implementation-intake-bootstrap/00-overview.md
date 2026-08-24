# T-093 Paper Implementation Intake Bootstrap

## Status
- State: done
- Parent task: `T-091 paper-implementation-full-landing`
- Mapping: `M-001 > F-001 > R-013`
- Flow node: `ImplementationIntakeSnapshot -> ImplementationProject`
- Next step: T-094 can consume admitted `ImplementationProject` + `ImplementationIntakeSnapshot` lineage.

## Goal
- Bootstrap `ImplementationProject` from an active `ImplementationIntakeSnapshot`.
- Preserve immutable topic-selection source refs and hashes.
- Define the implementation-to-topic-selection feedback event boundary.
- Create the first admitted implementation authority root without treating `PaperProjectBridge` or `PaperProject` as the implementation root.

## Non-goals
- Do not rename existing `PaperProjectBridge`.
- Do not mutate upstream topic-selection authority.
- Do not create motive/evidence/experiment state beyond bootstrap references.

## Acceptance Criteria
- [x] `ImplementationIntakeSnapshot` is defined with required upstream refs/hashes.
- [x] `ImplementationProject` creation is idempotent and lineage-preserving.
- [x] Superseded/stale upstream bridge state blocks or requires intake refresh.
- [x] `ImplementationFeedbackEvent` can request upstream recheck without mutating topic-selection authority.
- [x] Handoff to T-094 includes stable `ImplementationProject` identity and source trace.

## Closure Summary
- Added shared `paper-implementation` contracts and schema tests.
- Added repo-prisma persistence for intake snapshots, implementation projects, and append-only feedback events.
- Added backend repository, service, controller, and REST routes for bootstrap/read/feedback.
- Extended topic-selection downstream feedback source kinds with `paper_implementation`.
- Refreshed `docs/context/db/schema.json` from Prisma SSOT.
- Closed quality review fixes for bootstrap race-safe idempotency, feedback-before-downstream ordering, and real-service route coverage.
