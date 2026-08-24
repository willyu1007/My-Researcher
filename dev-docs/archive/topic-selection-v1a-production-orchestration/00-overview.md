# v1a Production Orchestration

## Goal
Upgrade topic-selection v1a from node-level WorkflowHarness coverage to production-grade orchestration: centralized route policy, harness-native HTTP invocation, automatic-route cleanup, and OpenAI/DashScope provider acceptance.

## Status
- State: done
- Started: 2026-05-28
- Owner: Codex

## Scope
- Add a shared v1a route-policy contract covering N1-N9.
- Add a backend native runner/controller/routes for v1a WorkflowHarness invocation and artifact read/write.
- Route existing v1a harness node outputs through the centralized policy.
- Remove or block automatic dual-track orchestration through legacy/direct write routes while preserving read-only projections and explicit human-review UI actions.
- Add unit, contract, HTTP, closed-loop, Prisma, and provider acceptance coverage.

## Non-Goals
- Do not redesign v1a domain authority tables.
- Do not break desktop read-only projections or explicit human-review/manual-review UI actions.
- Do not change v1b/v1c semantics except where tests consume a v1a-published bundle.

## Acceptance Criteria
- [x] Shared v1a WorkflowHarness route-policy contracts and schemas are implemented and tested.
- [x] Backend native v1a harness runner/controller/routes drive N1-N9 without legacy automatic write routes.
- [x] Retired automatic direct-write orchestration paths are blocked while read-only projections and explicit human-review actions remain available.
- [x] Deterministic backend/shared suites and OpenAI/DashScope provider canaries pass with retained evidence artifacts.
