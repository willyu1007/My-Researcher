# 03 Implementation Notes

## 2026-05-20 - Task Package Created
- Created `T-093` for the intake/bootstrap flow node.
- It depends on T-092 for exact field and gap confirmation.
- No product code changes were made.

## 2026-05-20 - Implementation Closed
- Added `packages/shared/src/research-lifecycle/paper-implementation-contracts.ts` with `ImplementationIntakeSnapshot`, `ImplementationProject`, bootstrap request/response, feedback event contracts, and JSON schemas.
- Added Prisma SSOT tables for `PaperImplementationIntakeSnapshot`, `PaperImplementationProject`, and `PaperImplementationFeedbackEvent`.
- Added backend repository interfaces plus memory/Prisma implementations.
- Added `PaperImplementationIntakeBootstrapService` with active bridge/hash/source completeness gates, duplicate bootstrap idempotency, and hash-drift conflict handling.
- Added REST controller/routes for bootstrap/read/feedback and wired them into `buildApp`.
- Extended topic-selection downstream feedback source kinds with `paper_implementation`.
- Feedback events are stored in PaperImplementation append-only storage, then forwarded to topic-selection downstream recheck; they do not mutate `PaperProjectBridge`.

## 2026-05-20 - Quality Review Fixes
- Made bootstrap persistence race-safe at the repository contract boundary: `createBootstrap` now returns whether the caller created the project or received an existing same bridge/hash admission.
- Mapped Prisma `P2002` bootstrap races to idempotent existing reads for the same bridge/hash and to `VERSION_CONFLICT` for changed hashes.
- Hardened in-memory bootstrap persistence to reject conflicting duplicate ids and duplicate feedback event ids instead of overwriting append-only state.
- Reordered feedback handling so `ImplementationFeedbackEvent` is persisted first, then dispatched to topic-selection downstream feedback using `paper_implementation`.
- Replaced the route happy-path fake-service check with real controller/service/in-memory repository/downstream-stub coverage, including a `buildApp` bootstrap/duplicate/feedback happy path through injected PaperImplementation dependencies.
- Added targeted tests for Prisma unique-race handling, repository-level idempotency propagation, feedback-before-downstream ordering, and real-service route behavior.

## Owner Decisions
- `PaperProjectBridge` remains an upstream handoff object, not the PaperImplementation authority root.
- `ImplementationProject` can only be admitted from an active `TopicSelectionPaperProjectBridgeHandoff` with matching `bridge_payload_hash`.
- `target_paper_project_ref` is copied only as lineage/link data; T-093 does not create or mutate `PaperProject`.
- `research-argument` remains out of scope and is not used as a PaperImplementation authority.
- Local feedback persistence is the PaperImplementation audit source; downstream feedback/recheck artifacts are a topic-selection projection triggered after local append-only write.

## Open Notes
- T-094 should consume `handoff_to_motive` rather than re-reading JSON-only payloads.
- Intake refresh for changed upstream hashes remains a later decision; T-093 blocks hash drift with `VERSION_CONFLICT`.
