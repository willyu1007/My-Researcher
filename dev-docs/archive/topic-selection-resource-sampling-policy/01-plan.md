# 01 Plan

## Phase 1 - Task And Contract Foundation
- Create T-079 task bundle and project governance mapping.
- Define resource sampling DTOs, enums, JSON schemas, and exports in shared contracts.

## Phase 2 - Persistence
- Add Prisma models for `TopicSelectionResourceSampleSet`, `TopicSelectionResourceSampleItem`, and `TopicSelectionResourceSamplingAudit`.
- Add migration SQL without applying it to a live database until approved.
- Implement repository interfaces plus in-memory and Prisma adapters.

## Phase 3 - Service And API
- Implement `TopicSelectionResourceSamplingService`.
- Add thin controller and v1a route registrations.
- Wire service/repository into `buildApp`.

## Phase 4 - Integration And Verification
- Update the real-flow harness to call the resource-samples API and use selected literature ids.
- Add unit and route tests.
- Run backend typecheck, focused tests, governance sync/lint, and schema validation.

## Done Means
- Sampling output is persistent, reproducible, explainable, and usable as the real-flow v1a input.
- LLM classification is constrained by deterministic guardrails.
- `answerable_with_risk` downstream flow remains unchanged and separately governed by accepted-risk refs.
