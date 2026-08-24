# T-103 Experiment Foundation Full-flow Validation Runner

## Status
- State: done
- Task: T-103
- Current focus: T-103 is closed as the experiment-foundation full-flow validation runner. The remaining real-cloud SDK submission canary is intentionally outside this task.

## Goal
- Provide one operator-facing command for experiment-foundation full-flow validation.
- Preflight `.env.local`, Postgres connectivity, applied migrations, LocalScript execution root, and required backend/desktop ports before running expensive checks.
- Run deterministic harness lanes for shared contracts, backend registry/readiness/promotion/execution/result/evidence, desktop smoke, and governance.
- Add opt-in real-environment lanes for local Postgres smoke and future Aliyun canary without making credentials or cloud spend part of the default suite.
- Emit a redacted validation report that separates deterministic checks, real local DB checks, and external opt-in checks.

## Non-goals
- Do not add new experiment-foundation product semantics.
- Do not implement real Aliyun SDK credential handling in the default lane.
- Do not replace existing shared/backend/desktop unit and route suites.
- Do not reset or mutate the developer's local database outside explicit disposable-schema checks.
- Do not commit secrets, raw datasets, checkpoints, logs, SDK payloads, or cloud credentials.

## Acceptance Criteria
- [x] A durable runner exists under the repo script/tooling path and can be executed by a single command.
- [x] Runner preflight reports missing `DATABASE_URL`, unreachable Postgres, unapplied migrations, missing LocalScript root, occupied ports, and missing opt-in credentials without leaking secret values.
- [x] Deterministic validation lane runs shared typecheck/test, backend full test, desktop typecheck/build/smoke, T-090 harness coverage, governance sync/lint, and `git diff --check`.
- [x] Real DB lane uses `.env.local` and a disposable schema or explicitly read-only smoke pattern; it must not require destructive operations on the developer's normal schema.
- [x] Optional external canary lane is off by default and records skipped/blocked/passed status separately from deterministic validation.
- [x] Validation report is written to a redacted artifact directory with command results, durations, environment summary, and actionable blockers.
- [x] T-103 docs record how the runner consumes T-090 harness fixtures without duplicating readiness, promotion, materialization, adapter, or result-validation semantics.

## Handoff
- Phase 2 preflight can now be run with `pnpm experiment-foundation:full-flow -- --mode preflight`.
- Phase 3 deterministic validation can now be run with `pnpm experiment-foundation:full-flow -- --mode deterministic`.
- Phase 4 real-local-DB smoke can now be run with `pnpm experiment-foundation:full-flow -- --mode real-local-db`.
- Full local closure can now be run with `pnpm experiment-foundation:full-flow -- --mode full`.
- The local DB migration blocker and LocalScript configuration warning have been resolved in the current dev environment.
- The external canary lane is gate-only in T-103:
  - default full runs record `EXTERNAL_CANARY_SKIPPED`;
  - explicit opt-in without configured env/credential key presence records `EXTERNAL_CANARY_BLOCKED`;
  - explicit opt-in with local dummy/key presence records `EXTERNAL_CANARY_PASSED`;
  - no real external job is submitted by this runner.
