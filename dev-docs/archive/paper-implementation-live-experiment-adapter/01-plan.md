# Plan

## Phase 0 - Boundary Alignment
- [x] Confirm T-104 task identity and project mapping.
- [x] Confirm adapter owns orchestration only, not experiment-foundation authority.
- [x] Confirm default test lane is deterministic and credential-free.
- [x] Confirm whether a new PaperImplementation adapter contract is needed or existing WorkOrder/harness contracts are sufficient.

## Phase 1 - Current-State Audit
- [x] Inspect `ExperimentFoundationExecutionService` submit/sync/cancel/collect behavior.
- [x] Inspect PaperImplementation WorkOrder, harness run, monitor intake, and run evidence repository boundaries.
- [x] Identify whether existing Prisma fields cover external job linkage and sync state.
- [x] Gate: prove existing fields cover WorkOrder submit idempotency, external job lookup, latest sync visibility, and final evidence lookup; if not, document the exact schema gap before adding Prisma fields.
- [x] Identify route-level API shape for PaperImplementation-owned orchestration commands.

## Phase 2 - Contract/API Slice
- [x] Add shared request/response contracts only if current contracts cannot express the adapter commands.
- [x] Add REST endpoints under `/paper-implementation/projects/:implementation_project_id/research-work-orders/:work_order_id/...`.
- [x] Keep experiment-foundation execution APIs available as their own bounded context; PaperImplementation calls services, not raw repositories.

## Phase 3 - Service Implementation
- [x] Submit admitted WorkOrder to experiment-foundation execution with idempotency.
- [x] Persist or reuse harness run/external job link without copying canonical payloads.
- [x] Sync/collect experiment-foundation job status and feed monitor intake.
- [x] Pre-allocate run evidence identity and target-specific trace before final trusted evidence ingestion.

## Phase 4 - Tests And Governance
- [x] Shared schema tests if contracts change.
- [x] Service tests for submit/sync/collect/idempotency/status mapping.
- [x] Route tests through PaperImplementation route registration with fake execution service.
- [x] Regression coverage for T-102 trace hardening through target-specific run evidence trace.
- [x] Project governance sync/lint and docs verification.
