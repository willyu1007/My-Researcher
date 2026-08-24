# Implementation Notes

## 2026-05-24 - Task Package Opened
- Created `T-104 paper-implementation-live-experiment-adapter`.
- `T-103` is already occupied by `experiment-foundation-full-flow-validation-runner`, so this PaperImplementation follow-up uses `T-104`.
- Initial boundary: bridge PaperImplementation WorkOrders to existing experiment-foundation execution APIs; do not create a second trusted experiment/evidence path.
- Existing experiment-foundation execution service already exposes submit, sync, cancel, and collect operations, so T-104 should prefer service composition over new platform adapter semantics.
- Created sibling follow-up `T-105 paper-implementation-provider-variance-evaluation` for live LLM/provider variance; T-104 remains live experiment execution only.

## Current Decisions
- L2 confirmed: T-104 is an orchestration adapter. PaperImplementation owns WorkOrder and evidence admission; experiment-foundation owns execution artifacts. T-104 composes existing services and must not introduce a new authority root or direct persistence path.
- L3 confirmed: do not add Prisma fields by default. Implementation must explicitly check submit idempotency, external job lookup, latest sync visibility, and final evidence lookup; schema may change only after a concrete queryability/idempotency gap is proven.
- L4 confirmed: use option A for final trusted evidence. T-104 pre-allocates `run_evidence_unit_id`, creates or requires a complete `TraceManifest` targeting `run_evidence_unit:<id>`, then calls `recordRunMonitorIntake`; the WorkOrder service remains the final gate.
- L5 confirmed: default verification is deterministic and credential-free. Real cloud/external execution is opt-in canary only, with preflight, redacted artifacts, and skipped/blocked/passed reporting separate from default pass/fail.
- L6 confirmed: T-104 stops at trusted `RunEvidenceUnit` and monitor/evidence ledger closure. The adapter may return handoff refs/next actions, but T-098 remains the only owner for result interpretation, claim, dossier, and writing packet creation.
- D-16 supersession (2026-07-12): the L4/L6 and landed `cancel` REU behavior remain accurate historical T-104 facts but no longer define the productized target. Failed/cancelled/incomplete terminal execution must create zero REU and enter Cycle closure accounting; only complete validation-passed EvidenceCandidate may reach the sole gateway.
- D-17 supersession (2026-07-12; docs-only, not implemented): the adapter publishes exact terminal facts only; fact publication causes PI-owned whole-Cycle readiness re-evaluation. A single collect/cancel/sync result cannot invoke scientific interpretation, assign the Cycle disposition/selected exit or directly request `ResultInterpretationPacket`; the existing Cycle closure is the sole conclusion authority.
- L7 confirmed: T-104 excludes live LLM/provider variance. Provider variance is owned by `T-105 paper-implementation-provider-variance-evaluation`.
- Default T-104 closure should remain deterministic/credential-free.
- Real cloud/external execution checks must be opt-in and reported separately.
- Live LLM/provider variance remains a separate follow-up task.

## 2026-05-24 - Implementation Closed
- Added `paper-implementation-live-experiment-adapter-contracts` with submit/sync/collect/cancel schemas and response shape.
- Added `PaperImplementationLiveExperimentAdapterService` as orchestration-only composition over experiment-foundation execution, experiment-foundation records, trace kernel, and the existing WorkOrder bridge service.
- Added WorkOrder bridge `materialization_result_ref/hash` to satisfy experiment-foundation submit requirements. The field does not add Prisma columns; the value remains in the existing bridge payload because the ref/hash is not a downstream query/gate field.
- Added repository methods for idempotent harness lookup and run evidence lookup by external job using existing columnized/indexed fields.
- Added REST endpoints under `live-experiment-runs` and wired them through the existing PaperImplementation controller.
- Final collect/cancel evidence uses preallocated run evidence identity, target-specific `TraceManifest`, and existing `recordRunMonitorIntake`; no result interpretation, claim, dossier, or writing packet authority is created.

## 2026-05-25 - Live Adapter Side-Effect Hardening
- Added read-only `getJob` preflight to `sync`, `collect`, and `cancel` before calling side-effectful experiment-foundation operations.
- Preflight now checks that the route `external_job_id` resolves to the WorkOrder harness `external_job_ref/hash`; wrong external jobs are blocked before sync/collect/cancel side effects.
- Added `terminal_evidence_recorded` to the live experiment response contract so schedulers and UI can distinguish monitor-only updates from final trusted evidence.
- D-17 productization must remove conclusion-oriented next-action hints and make exact terminal fact publication drive PI-owned idempotent whole-Cycle readiness evaluation. The landed response contract and tests remain historical facts until the joint migration lands.
- `sync` remains monitor-only, but terminal external statuses now recommend collect/cancel finalization rather than another sync loop.
- `collect` and `cancel` return existing trusted `RunEvidenceUnit` before repeating external side effects, preserving retry idempotency.
