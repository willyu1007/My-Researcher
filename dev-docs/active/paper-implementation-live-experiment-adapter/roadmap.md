# Roadmap

## Decision
Create `T-104 paper-implementation-live-experiment-adapter` as the next PaperImplementation infrastructure task. `T-103` is unavailable because it already owns `experiment-foundation-full-flow-validation-runner`.

## Scope
T-104 turns the existing PaperImplementation WorkOrder control plane into a live execution bridge by composing with experiment-foundation execution services.

### In Scope
- PaperImplementation service/controller/route layer for live experiment submission and status collection.
- Idempotent WorkOrder-to-external-job submission.
- Sync/collect/cancel commands that call experiment-foundation execution services.
- Monitor intake and run evidence ingestion using T-102 target-specific run evidence traces.
- Deterministic in-memory or fake adapter tests.
- Documentation and governance evidence.

### Out Of Scope
- Live LLM/provider variance evaluation.
- New cloud SDK support beyond existing experiment-foundation adapters.
- UI workbench changes unless a minimal read-model endpoint is required.
- Claim/dossier/writing ingestion changes.
- `research-argument` decommissioning.

## Decision Points
| ID | Decision | Recommendation | Status |
|---|---|---|---|
| L1 | Which task ID? | Use `T-104`; `T-103` is occupied. | confirmed |
| L2 | Where does adapter authority live? | PaperImplementation owns WorkOrder and evidence admission; experiment-foundation owns execution artifacts; T-104 is orchestration only and must not create a new authority root or direct persistence path. | confirmed |
| L3 | Is a new Prisma model required? | Do not add Prisma fields by default. During implementation, explicitly check idempotency and queryability; add schema only if a concrete gap cannot be represented by existing queryable fields without JSON-only drift. | confirmed |
| L4 | How is final run evidence trusted? | Historical T-104 pre-allocated REU identity for terminal outcomes. T-132 D-16 supersedes the productized target: only complete validation-passed EvidenceCandidate receives REU identity through the sole gateway; failed/cancelled/incomplete terminal facts feed Cycle closure accounting. | confirmed; refined by D-16 |
| L5 | Should real cloud execution be default? | No. Default verification is deterministic and credential-free; real cloud/external execution is opt-in canary with preflight, redacted artifacts, and skipped/blocked/passed reporting separate from default pass/fail. | confirmed |
| L6 | Should adapter create or trigger result interpretation/claims? | No. T-104 stops at monitor/Attempt facts, eligible `RunEvidenceUnit` gateway handoff and Cycle closure-accounting input. Under T-132 D-17, exact terminal fact publication drives PI-owned idempotent whole-Cycle readiness evaluation; PI control plane triggers one Result Analysis proposal, the existing Cycle closure writes disposition/selected exit, and T-098 consumes the exact closed Cycle. The semantic cutover is docs-only/not implemented. | confirmed; refined by D-16/D-17 |
| L7 | Should this include provider variance? | No. T-104 is live experiment execution infrastructure only; live LLM/provider variance is owned by `T-105 paper-implementation-provider-variance-evaluation` and must not be implemented inside T-104. | confirmed |

## Recommended Execution Order
1. Audit current experiment-foundation execution API and PaperImplementation WorkOrder fields.
2. Check whether existing fields cover submit idempotency, external job lookup, latest sync visibility, and final evidence lookup.
3. Decide whether existing contracts are enough or add a narrow adapter command contract.
4. Implement service composition, target-specific run evidence trace orchestration, and route commands.
5. Add deterministic adapter tests and route tests.
6. Re-run PaperImplementation result/claim/dossier regression tests.
7. Update task docs and governance.

## Completion Signal
T-104 is complete when an admitted WorkOrder can be submitted to experiment-foundation execution, synced/collected, and converted into trusted run evidence through the existing monitor/evidence ledger path without creating any parallel authority or default live-cloud dependency.

For the D-17 product target, historical T-104 completion is insufficient until terminal responses are facts-only, one-job conclusion/packet/readiness commands are rejected, and PI-owned whole-Cycle readiness evaluation is replay-safe and automatic after fact publication. This is scheduled migration debt, not implemented by the documentation update.
