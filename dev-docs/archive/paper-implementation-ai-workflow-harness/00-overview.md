# T-099 Paper Implementation AI Workflow Harness And Runtime Governance

## Status
- State: done
- Parent task: `T-091 paper-implementation-full-landing`
- Mapping: `M-001 > F-001 > R-013`
- Flow node: AI proposal runtime, implementation harness, and runtime governance
- Next step: T-100 can consume proposal artifacts and decision queue items for UI/workbench review.

## Goal
- Define `ImplementationHarness` as the project-level runtime integrity shell for workflows, work orders, trace, and evaluation.
- Add `PaperImplementationAgentWorkflowHarness` on top of a shared agent runtime kernel.
- Enforce `ImplementationInputSnapshot`, schema/reference/trace validation, audit/provenance, and proposal-only outputs.
- Support agent-assisted motive, validation, route, experiment, result, claim, and trace workflows without authority bypass.

## Non-goals
- Do not create a second LLM router or model-profile store.
- Do not let agents write authority state or submit experiments.
- Do not use topic-selection node contracts as implementation business contracts.

## Acceptance Criteria
- [x] `ImplementationHarness` defines policy pack, runtime bindings, invariants, audit refs, and quality signals.
- [x] `ContextCompiler` produces controlled input snapshots and exclusion/freshness records.
- [x] All implementation LLM workflows require `ImplementationInputSnapshot`.
- [x] Agent outputs normalize to draft/proposal/recommended-transition/quality-signal/gate-prep/queue-suggestion.
- [x] Gate failures and trace breaks create `DecisionWorkQueueItem` candidates instead of hidden runtime errors.
- [x] Mock/product isolation, provenance, and artifact refs are enforced.
- [x] Scenario tests cover schema failure, stale refs, missing trace, memo-as-evidence, forbidden mutation, gate failure queueing, and harness invariant violations.

## Closure
- Landed backend minimum closure: shared contracts, Prisma persistence, repository/service layer, REST routes, targeted tests, and governance context sync.
- Kept T-099 proposal-only: no real provider invocation, no model router, no authority-state mutation, no experiment submission.
- Post-review fixes closed snapshot reference-boundary validation, memory/Prisma response-shape parity, and scenario coverage gaps.
