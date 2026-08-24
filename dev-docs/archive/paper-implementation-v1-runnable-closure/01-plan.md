# Plan

## Phase 0 - Decision Alignment
- [x] Confirm runner depth: route-level replay plus service-level helpers first; CLI smoke command after sequence stabilization.
- [x] Confirm persistence depth: in-memory replay is required; local Postgres/disposable-schema is optional unless real DB parity becomes necessary for queryability, idempotency, or recovery confidence.
- [x] Confirm experiment execution depth: required deterministic linked-loop from PaperImplementation through experiment-foundation seam, run evidence, result/feedback/review, adjustment, and continued progression; real cloud remains optional/manual evidence only.
- [x] Confirm UI proof depth: restrained route/static command-read-model boundary checks only; browser smoke and UI adaptation are deferred until backend flow closure unless a concrete drift defect appears.
- [x] Confirm writing boundary: `WritingEntryPacket` projection is required and is the V1 boundary; writing-module ingestion and document mutation are future explicit tasks.
- [x] Confirm required blocked paths: P0 is closure-required, P1 is included where cheap or already covered, and P2 is residual risk unless a concrete defect appears.
- [x] Confirm relationship to T-106: T-109 validates the PaperImplementation-facing seam and may consume T-106 evidence, but does not wait for T-106 closure or absorb experiment-foundation internal hardening.
- [x] Confirm closure standard: T-109 requires a repeatable replay entrypoint plus runnable evidence package; scattered unit tests alone are insufficient.
- [x] Confirm artifact policy: produce structured redacted runnable artifacts under `.ai/.tmp` by default; store refs/statuses/gates/hashes/summaries only and exclude credentials, hidden reasoning, secrets, private manuscript text, and large raw payloads.
- [x] Confirm governance result: T-109 is a post-closure runnable package by default and does not reopen T-091/T-101 or D1-D10 unless a true design contradiction or unclosable P0 blocker appears.

## Phase 1 - Flow Contract And Fixture Inventory
- [x] Map the canonical V1 operation sequence from T-093 through T-105.
- [x] Map the linked-loop path: validation/work order -> experiment-foundation seam -> trusted evidence -> result/feedback/review -> adjusted next-step planning.
- [x] List all required input refs, hashes, trace refs, gate results, queue states, and output refs.
- [x] Identify where human confirmation is required.
- [x] Identify where the flow intentionally stops at projection or preflight.
- [x] Document `WritingEntryPacket` projection requirements for supported claims, trace refs, citation candidates, and writing consumer refs without mutating writing authority.
- [x] Produce happy-path and blocked-path fixture inventory.
- [x] Assign planned coverage for all P0 blocked paths and owners for P1/P2 residuals.

## Phase 2 - Replay Entry Point
- [x] Add the minimum replay/smoke entrypoint selected in Phase 0.
- [x] Produce runnable evidence package with flow manifest, blocked-path evidence, linked-loop evidence, writing projection evidence, UI boundary proof, residual risks, and operator checklist.
- [x] Ensure the replay uses existing services/routes/contracts and does not bypass authority writers.
- [x] Ensure output artifacts are redacted and diagnosable.
- [x] Write evidence artifacts under `.ai/.tmp/paper-implementation-v1-runnable-closure/<run-id>/` unless a later decision explicitly promotes selected summaries into dev-docs.
- [x] Keep optional lanes explicit and disabled by default.

## Phase 3 - Verification And Closure Review
- [x] Run targeted shared/backend/route/typecheck checks.
- [x] Run governance sync/lint if task docs or status change.
- [x] Record command results in `04-verification.md`.
- [x] Record residual risks and follow-up split candidates.
- [x] Mark T-109 done only when the runnable closure entrypoint and evidence are stable.

## Review Gates
| Gate | Requirement |
|---|---|
| Authority gate | Replay must use existing authority writers; no local fixture should synthesize final authority state. |
| Trace gate | Writing-affecting objects must carry trace refs required by T-097/T-102. |
| Evidence gate | Final run evidence must follow T-104/T-102 target-specific trace behavior. |
| AI gate | T-099/T-105 outputs remain proposal/evaluation artifacts only. |
| Writing gate | Writing output stops at `WritingEntryPacket` projection unless a later decision expands scope. |
| Retired control-plane gate | Retired pre-writing control-plane artifacts cannot become replay authority. |
