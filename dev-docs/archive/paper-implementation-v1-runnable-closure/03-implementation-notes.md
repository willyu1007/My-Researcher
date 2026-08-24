# Implementation Notes

## 2026-05-27 - Task Package Opened
- Created `T-109 paper-implementation-v1-runnable-closure`.
- Confirmed `T-106` is already occupied by `experiment-foundation-real-interaction-hardening`; T-109 uses a new task id and treats T-106 as a related dependency/evidence source.
- T-109 is a runnable closure package, not a new PaperImplementation authority package.
- Initial recommendation: route/service replay with deterministic fixtures, optional local DB lane, fake/local experiment seam, and provider preflight only.

## Open Decisions
## Confirmed Decisions
- R1 runner depth: start with route-level replay to verify API wiring and use service-level helpers only for deterministic fixture construction. Add a CLI smoke command only after the replay sequence is stable enough to become an operator entrypoint.
- R2 persistence depth: require deterministic in-memory replay for default closure. Keep local Postgres/disposable-schema as optional and non-blocking unless queryability, idempotency, transaction, unique-constraint, recovery, or read-model parity cannot be trusted without real DB verification.
- R3 experiment execution depth: include a deterministic linked-loop test that starts from PaperImplementation validation/work-order planning, crosses the experiment-foundation seam through T-104 fake/local external job semantics, returns trusted `RunEvidenceUnit`, drives result/feedback/review behavior, and proves an explicit adjusted next step. Real cloud execution remains optional/manual evidence and is not a closure requirement.
- R4 UI proof depth: keep UI testing restrained until backend flow closure. Require route/static command-read-model boundary checks and defer browser smoke or UI adaptation unless a concrete UI/backend drift defect appears.
- R5 writing depth: `WritingEntryPacket` projection is required and is the V1 writing boundary. T-109 must not perform writing-module ingestion, paragraph placement, citation insertion, document export, or writing authority mutation.
- R6 required blocked paths: P0 blocked paths are closure-required. P1 paths are included where cheap or already covered by existing tests; otherwise they receive an owner. P2 paths are residual risks unless T-109 discovers a concrete defect.
- R7 relationship to T-106: T-109 validates the PaperImplementation-facing seam itself and may consume T-106 evidence opportunistically. T-106 closure is not a prerequisite, and experiment-foundation internal hardening remains owned by T-106 or a future experiment-foundation task.
- R8 closure standard: T-109 requires a repeatable replay entrypoint plus runnable evidence package. Scattered unit tests alone are insufficient. Route-level replay can be the first closure entrypoint; CLI smoke may follow after the flow sequence stabilizes.
- R9 data artifact policy: T-109 produces structured redacted runnable artifacts under `.ai/.tmp/paper-implementation-v1-runnable-closure/<run-id>/` by default. Artifacts store refs, statuses, gates, hashes, and summaries only; credentials, hidden reasoning, cloud secrets, private manuscript text, and large raw payloads are forbidden. Only reviewed redacted summaries may be promoted into dev-docs.
- R10 governance result: T-109 is a post-closure runnable package by default. It does not reopen T-091/T-101 or D1-D10 unless the runnable review discovers a true design contradiction or an unclosable P0 blocker.

## 2026-05-27 - Phase 1 Flow Contract And Fixture Inventory
- Moved T-109 to `in-progress`.
- Added `06-v1-runnable-flow-contract.md`.
  - Defines the route-level replay contract from bootstrap through `WritingEntryPacket` projection.
  - Names existing route writers and gates for intake, trace, motive, validation, WorkOrder, live-adapter seam, run evidence, result interpretation, claim trace, dossier, writing projection, feedback, and AI/evaluation adjunct lanes.
  - Records intentional stops for writing ingestion, live provider execution, real cloud execution, UI E2E, and local DB parity.
- Added `07-fixture-and-blocked-path-inventory.md`.
  - Defines deterministic fixture IDs for happy path, linked loop, T-104 seam, T-105 preflight, and UI boundary proof.
  - Promotes all P0 blocked paths into closure-required fixtures.
  - Assigns P1/P2 paths to replay, existing coverage references, optional lanes, or residual-risk owners.
- Phase 1 is documentation-only; no product code, schema, route, or API contract was changed.

## 2026-05-27 - Phase 2 Replay Entrypoint
- Added `.ai/scripts/paper-implementation-v1-runnable-replay.mjs`.
  - Runs a deterministic in-memory Fastify route replay through existing PaperImplementation controllers, services, and in-memory repositories.
  - Uses T-104 fake/local experiment execution semantics to submit, sync, collect, and admit trusted target-specific failed run evidence (historical V1 behavior; superseded by T-132 D-16 for productized acceptance, which requires zero failed REU plus exact Cycle closure accounting).
  - Produces result interpretation, claim trace packet, supported claim, ready dossier, and `WritingEntryPacket` projection without mutating writing authority.
  - Dispatches explicit validation upstream feedback through the existing T-093 feedback path with `paper_implementation` source kind.
  - Exercises T-105 provider variance with deterministic fake provider execution and live-provider preflight blocked/skipped behavior.
- The replay writes redacted artifacts under `.ai/.tmp/paper-implementation-v1-runnable-closure/<run-id>/`:
  - `manifest.json`
  - `flow-steps.json`
  - `fixture-inventory.json`
  - `linked-loop-report.json`
  - `blocked-path-report.json`
  - `writing-packet-summary.json`
  - `ui-boundary-report.json`
  - `residual-risks.md`
  - `operator-checklist.md`
- P0 blocked paths `BP0-01` through `BP0-10` passed in the Phase 2 replay evidence package.
- The replay is intentionally route-level/in-memory. Local Postgres, browser smoke, real cloud execution, live provider execution, and writing-module ingestion remain non-blocking residual/optional lanes according to R2, R4, R5, R7, and R9.

## 2026-05-27 - Phase 2 Quality Fixes
- Corrected `writing-packet-summary.json` to use the actual `PaperImplementationWritingEntryPacket` contract:
  - `trace_manifest_id` and `trace_manifest_ref`
  - `packet_payload.admitted_claim_refs`
  - `packet_payload.claim_trace_packet_refs`
  - `packet_payload.failed_run_refs`
- Strengthened `BP0-10` so it checks replay request payloads and runtime state for `research-argument` authority refs, not only desktop UI source files.
- Split artifact rendering and evidence summarization into helper modules:
  - `.ai/scripts/paper-implementation-v1-runnable-artifacts.mjs`
  - `.ai/scripts/paper-implementation-v1-runnable-evidence.mjs`
- No product code, schema, route contract, or persistence behavior changed in this quality pass.

## 2026-05-27 - Phase 3 Closure
- Ran final shared schema, route integration, replay, artifact assertion, sensitive-content scan, backend typecheck, governance sync/lint, and diff checks.
- Added `08-closure-review.md` with gate-by-gate closure evidence and residual-risk owners.
- Marked T-109 as `done`.
- No P0 blocker, design contradiction, or reason to reopen `T-091`, `T-101`, or D1-D10 was found.
