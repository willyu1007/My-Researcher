# 01 Plan

## Phase 1 - Inventory and Command Contract
- [x] Confirm the canonical command list from T-090 verification.
- [x] Define the runner CLI shape, flags, and artifact directory convention.
- [x] Classify lanes as `preflight`, `deterministic`, `real-local-db`, and `external-opt-in`.
- [x] Land a runnable contract-only skeleton that writes redacted artifacts without executing expensive checks.

## Phase 2 - Environment Preflight
- [x] Check `.env.local` presence without printing values.
- [x] Confirm `DATABASE_URL` resolves through the same local env loading path as backend tests.
- [x] Check Postgres connectivity and migration availability.
- [x] Check LocalScript execution root and command allowlist requirements.
- [x] Check required backend/desktop ports or select safe alternatives.
- [x] Write redacted preflight report and blocker/action summary.

## Phase 3 - Deterministic Runner
- [x] Run preflight before deterministic commands and stop before expensive checks if preflight has blockers.
- [x] Orchestrate shared checks, backend full suite, desktop checks, T-090 smoke/harness, governance sync/lint, and diff check.
- [x] Capture command exit status, duration, bounded redacted output tails, and actionable blockers.
- [x] Write deterministic lane artifacts as `06-deterministic.md` and `07-deterministic.json`.

## Phase 4 - Real-environment Lanes
- [x] Add a disposable-schema DB smoke lane for registry/readiness/execution records.
- [x] Apply repo migrations to the disposable schema without mutating the normal dev schema.
- [x] Round-trip `ExperimentFoundationRecord`, `ExperimentFoundationReadinessReport`, and `ExperimentFoundationExternalTrainingJob`.
- [x] Drop the disposable schema during cleanup and report cleanup status.
- [x] Keep cloud/Aliyun canary opt-in and skipped by default.
- [x] Require explicit environment flags before the external canary can report passed; T-103 still performs no real external submission.

## Phase 5 - Report and Handoff
- [x] Implement `full` mode as preflight -> deterministic -> real-local-DB -> external canary status.
- [x] Emit a redacted Markdown/JSON validation report.
- [x] Document local troubleshooting and rerun instructions.
- [x] Mark T-103 done after the full lane passes and optional external lane produces skipped/blocked/passed states.

## Execution Order
1. Preflight only.
2. Deterministic full-flow local lane.
3. Real local DB lane.
4. Optional external canary lane.
5. Governance and task closure.
