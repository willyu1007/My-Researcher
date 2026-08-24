# 03 Implementation Notes

## Creation - 2026-05-24
- Created T-103 as the post-V1 validation runner package following T-090 closure.
- T-103 owns one-command orchestration and environment preflight, not product semantics.
- Default validation should remain credential-free except for local `.env.local` database connectivity already used by the backend full suite.
- Real Aliyun/cloud canary remains opt-in and must report skipped/blocked/passed separately.

## Phase 1 Command Contract - 2026-05-24
- Added `.ai/scripts/experiment-foundation-full-flow-runner.mjs` as the durable runner entry.
- Added root package script `experiment-foundation:full-flow`.
- Phase 1 only supports successful `contract` mode.
  - `preflight`, `deterministic`, `real-local-db`, and `full` write `NOT_IMPLEMENTED` artifacts and exit non-zero.
  - No environment variables are loaded, no DB connection is attempted, no services are started, and no cloud/external adapter path is invoked.
- Contract-mode artifacts are written under `.ai/.tmp/experiment-foundation-full-flow/<run-id>/`.
  - `00-command-contract.md`
  - `01-lane-manifest.json`
  - `02-validation-report.md`
  - `03-blockers.md`
- The initial Phase 1 lane manifest recorded the deterministic command inventory for shared/backend/desktop/T-090/governance/diff checks while marking every command as not executed; Phase 3 later replaced that marker with explicit execution policy/status fields.

## Phase 2 Preflight - 2026-05-24
- Implemented `--mode preflight` in `.ai/scripts/experiment-foundation-full-flow-runner.mjs`.
- The preflight checks:
  - root `.env.local` presence;
  - `DATABASE_URL` local env resolution and URL parsing;
  - Postgres connectivity through Prisma `SELECT 1`;
  - Prisma migration status through `pnpm exec prisma migrate status --schema prisma/schema.prisma`;
  - LocalScript root/enabled/allowlist readiness;
  - desktop smoke backend and renderer port availability;
  - external canary credential readiness only when explicitly requested.
- Preflight writes `04-preflight.md` and `05-preflight.json` in addition to the existing command contract, manifest, validation report, and blockers files.
- The implementation stores only key presence, source names, statuses, durations, and action text. It does not store raw `DATABASE_URL`, provider keys, credential paths, Prisma output, SDK payloads, or logs.
- Current local run result: `PREFLIGHT_FAILED` because Prisma reports unapplied repo migrations. Postgres connectivity itself passed.

## Local Preflight Closure - 2026-05-24
- Applied the repo's pending Prisma migrations to the confirmed local dev database after explicit approval.
- Added the experiment-foundation LocalScript configuration keys to `env/contract.yaml` and `env/values/dev.yaml`, then regenerated env contract artifacts and `.env.local` through the env tooling.
- LocalScript remains opt-in by contract:
  - contract default for `EXPERIMENT_FOUNDATION_LOCAL_EXECUTION_ENABLED` is `false`;
  - dev local value is explicitly `true`;
  - command allowlist is narrowed to `node`;
  - execution root is `.ai/.tmp/experiment-foundation-local-execution` for this workspace.
- Current local run result: `PREFLIGHT_PASSED` with zero warnings and zero blockers.

## Phase 3 Deterministic Runner - 2026-05-24
- Implemented `--mode deterministic` in `.ai/scripts/experiment-foundation-full-flow-runner.mjs`.
- Deterministic mode now:
  - runs Phase 2 preflight first;
  - exits before expensive commands if preflight has blockers;
  - runs the manifest command inventory sequentially when preflight passes;
  - records command exit code, signal, timeout status, duration, stdout/stderr byte counts, and bounded redacted output tails;
  - writes `06-deterministic.md` and `07-deterministic.json`.
- The deterministic lane delegates T-090 coverage to existing backend tests:
  - `pnpm --filter @paper-engineering-assistant/backend test`;
  - targeted `experiment-foundation-capability-harness.test.ts`;
  - targeted adjacent workorder guard test.
- Runner output redaction now covers database URLs, common provider API key patterns, Aliyun/AWS-style access key patterns, password query parameters, and key/secret/token assignment lines.
- At Phase 3 closure, real-local-DB was still reserved for the next phase; Phase 4 notes below supersede that boundary with the disposable-schema implementation.

## Phase 3 Hardening - 2026-05-24
- Fixed deterministic manifest semantics:
  - command inventory now separates `execution_policy` from `execution_status`;
  - deterministic-mode manifests record `executed_in_this_run_with_results_in_07_deterministic_json`;
  - contract/preflight manifests record `not_executed_in_this_run`.
- Hardened timeout cleanup:
  - commands now spawn with `shell=false`;
  - POSIX runs use a detached process group;
  - timeout cleanup sends signals to the process group so `pnpm` child processes are not left behind.

## Phase 4 Real Local DB Smoke - 2026-05-24
- Implemented `--mode real-local-db`.
- Real-local-DB mode:
  - runs preflight first;
  - creates a disposable Postgres schema derived from the run id;
  - applies repo Prisma migrations to the disposable schema;
  - round-trips `ExperimentFoundationRecord`, `ExperimentFoundationReadinessReport`, and `ExperimentFoundationExternalTrainingJob`;
  - drops the disposable schema in cleanup and records cleanup status.
- The lane writes `08-real-local-db.md` and `09-real-local-db.json`.
- The lane stores no raw `DATABASE_URL` value and does not store raw Prisma migration output.
- `full` remains `NOT_IMPLEMENTED`; optional external canary semantics remain the next open step.

## Phase 4 Review Closure - 2026-05-24
- Fixed the lane manifest stage label after review:
  - at Phase 4 review time, `runner_version` remained `t103-phase4`;
  - `runner_phase` now records `phase_4_real_local_db` instead of the stale Phase 3 value.
- Fixed the real-local-DB lane failure semantics:
  - explicit `--mode real-local-db` runs now report `future_failure_semantics=blocker`;
  - non-real-local-DB runs still report the lane as `skipped_unless_requested` unless `--require-real-db` is set.
- This keeps downstream artifact readers from treating Phase 4 real-local-DB smoke output as a deterministic-only run.

## Phase 5 T-103 Closure - 2026-05-24
- Implemented `--mode full`.
- Full mode now runs:
  - preflight;
  - deterministic command inventory;
  - real-local-DB disposable-schema smoke;
  - external canary gate reporting.
- Added external canary artifacts:
  - `10-external-canary.md`;
  - `11-external-canary.json`.
- External canary remains credential-free and cloud-free by default:
  - default full mode records `EXTERNAL_CANARY_SKIPPED`;
  - explicit opt-in with missing env/credential key presence records `EXTERNAL_CANARY_BLOCKED`;
  - explicit opt-in with key presence and `EXPERIMENT_FOUNDATION_EXTERNAL_CANARY_ENABLED=true` records `EXTERNAL_CANARY_PASSED`;
  - `real_submission_executed` remains `false` in all T-103 closure paths.
- Updated runner identity to `runner_version=t103-closure` and `runner_phase=phase_5_closure`.

## Phase 5 Review Hardening - 2026-05-24
- Manifest `artifact_files` now records the files actually written by the current run.
  - This prevents preflight-blocked full runs from advertising deterministic or real-local-DB artifacts that were intentionally not generated.
- External canary provider support is checked during preflight.
  - Unsupported provider values now block before expensive deterministic/full local checks.
  - `aliyun_pai_dlc` remains the only supported gate provider for T-103 closure.
- Command completion now resolves on the primary process `exit` event and then cleans the process group.
  - This prevents service-spawning checks such as desktop smoke from being misclassified as timeout after their parent command already reported success.
  - Timeout handling still terminates the process group with `SIGTERM` and escalates to `SIGKILL` after the grace period.
