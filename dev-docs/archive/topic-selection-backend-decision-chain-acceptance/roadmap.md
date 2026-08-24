# Topic Selection Backend Decision Chain Acceptance - Roadmap

## Goal
- Execute and record a backend-only acceptance pass for the implemented topic-selection decision chain after T-042 governance/scope closure.

## Scope
- v1a evidence-to-need backend chain.
- v1b need-to-draft-topic backend chain.
- v1c promotion bridge backend chain.
- Shared contracts, Prisma schema, OpenAPI/API index, context artifacts, route integration tests, service negative cases, and isolated Prisma smoke.

## Non-goals
- Desktop reviewer-workbench UX.
- PaperProject execution and writing/research-argument runtime.
- New feature work.
- Real-world research quality threshold calibration.

## Milestones

### M0 - Task Package And Governance
- [x] Create task package.
- [x] Register and map task to `M-001 / F-001 / R-009`.
- [x] Run governance lint.

### M1 - Static And Contract Acceptance
- [x] Shared tests/typecheck.
- [x] Backend typecheck.
- [x] Prisma validate.
- [x] OpenAPI/API index/context verify.

### M2 - HTTP Chain Acceptance
- [x] v1a route chain.
- [x] v1b route chain.
- [x] v1c route chain.

### M2.5 - Node-Level Mock Acceptance
- [x] Add deterministic T-068 mock fixture.
- [x] Assert every v1a decision-chain node.
- [x] Assert every v1b decision-chain node.
- [x] Assert every v1c decision-chain node.
- [x] Assert negative boundaries for invalid human/system authority and premature bridge creation.

### M2.6 - Invariant And Negative Acceptance
- [x] Assert blocked readiness cannot create downstream authority.
- [x] Assert closed/duplicate authority transitions are rejected.
- [x] Assert v1b non-advance decisions cannot create v1c handoff.
- [x] Assert v1c non-promote decisions cannot create bridge.
- [x] Assert downstream feedback remains append-only and no-recheck feedback does not fabricate recheck artifacts.

### M3.5 - Persistence And Contract Acceptance
- [x] Run shared contract tests/typecheck.
- [x] Run backend typecheck and route acceptance tests.
- [x] Run OpenAPI/API index/context strict verification.
- [x] Run isolated Prisma smoke and record cleanup/artifacts.

### M3.6 - Quality Baseline Acceptance
- [x] Verify v1a/v1b/v1c synthetic baseline datasets cover every required case type.
- [x] Verify baseline runs produce full stage-specific metric sets.
- [x] Verify representative metric ratios and replay diff dimensions.
- [x] Verify cross-stage metric keys are rejected.
- [x] Record that synthetic baselines are regression-calibration evidence, not real-world quality-threshold evidence.

### M3 - Persistence Acceptance
- [x] Isolated Prisma smoke.
- [x] Verify schema cleanup and artifacts.

### M4 - Final Acceptance Decision
- [x] Summarize accepted/blocking/follow-up items.
- [x] Update task status.
- [x] Sync/lint project governance.

## Decision Record
- D1: T-068 is a backend acceptance task, not a T-042 architecture continuation.
- D2: Desktop UI and downstream PaperProject execution remain outside this task.
- D3: Isolated Prisma smoke is required before persistence acceptance can be considered complete.
- D4: Backend decision-chain acceptance is complete under the tightened node-level mock acceptance standard.
- D5: T-068 remains the container for invariant/negative and persistence/contract acceptance follow-up evidence.
- D6: T-068 is accepted after invariant/negative and persistence/contract evidence; no backend decision-chain follow-up remains inside this task.
- D7: Quality baseline acceptance is complete for synthetic offline replay regression calibration; real-world research-quality threshold calibration remains out of scope.
