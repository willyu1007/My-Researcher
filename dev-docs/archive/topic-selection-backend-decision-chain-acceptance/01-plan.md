# 01 Plan

## Phase 1 - Baseline Governance And Contract Checks
- Confirm T-042 and T-046 are closed and this package is mapped to `M-001 / F-001 / R-009`.
- Run project governance lint.
- Run shared contract tests.
- Run backend typecheck.
- Run Prisma schema validation.
- Run OpenAPI, API index, and context verification.

Acceptance:
- [x] Governance and generated context checks are clean.
- [x] Shared/backend compile-time checks are clean.

## Phase 2 - Memory-Mode HTTP Chain Acceptance
- Run the v1a route integration test.
- Run the v1b route integration test in memory mode.
- Run the v1c route integration test in memory mode.
- Inspect failures for chain contract drift, not just command failure.

Acceptance:
- [x] v1a creates the expected evidence-to-need handoff.
- [x] v1b creates the expected draft package and v1c handoff.
- [x] v1c creates the expected promotion/bridge/feedback chain.

## Phase 3 - Hard Invariant Acceptance
- Verify negative cases for:
  - non-validate adjudication does not create `ValidatedNeed`;
  - non-`advance_to_package` value disposition does not create a draft package;
  - draft package cannot bypass promotion gate/human confirmation;
  - non-promote promotion decisions do not create bridges;
  - downstream feedback/recheck does not mutate upstream authority;
  - raw LLM output, `QualitySignal`, or decision memory cannot become evidence or authority state directly.

Acceptance:
- [x] Every hard invariant has at least one targeted test or route-level negative case.
- [x] Missing negative coverage is recorded as a residual gap.

## Phase 4 - Prisma Acceptance
- Run an isolated Prisma smoke using `pnpm ci:prisma-smoke`.
- Confirm migrations apply to a disposable schema.
- Confirm backend tests include the v1a/v1b/v1c Prisma HTTP smoke paths.
- Confirm the disposable schema is cleaned up.

Acceptance:
- [x] Isolated Prisma smoke passes, or a blocker is documented with exact failing command and root cause.

## Phase 5 - Acceptance Report
- Summarize pass/fail status by stage and layer.
- Record residual gaps and decide whether each is:
  - must-fix-before-acceptance;
  - follow-up backend hardening;
  - UI/product acceptance;
  - downstream PaperProject/research-argument scope.

Acceptance:
- [x] `04-verification.md` contains the full command log and outcome summary.
- [x] `03-implementation-notes.md` records acceptance decisions and residual gaps.
- [x] If all required checks pass, update package status to `done` and run governance sync/lint.
