# 02 Architecture

## Runner Boundary
The runner is an orchestration and evidence tool. It must call existing commands and APIs; it must not reimplement experiment-foundation domain decisions.

| Area | Runner responsibility | Not runner responsibility |
| --- | --- | --- |
| Shared contracts | execute existing typecheck/test | define new DTO schemas |
| Backend | run full suite and targeted API harness | duplicate readiness/promotion/materialization logic |
| Desktop | run typecheck/build/smoke | own renderer domain state |
| DB | verify connectivity and safe smoke schema | reset developer data |
| External | report opt-in canary readiness | make cloud credentials mandatory |
| Evidence | write redacted report | store secrets or raw artifacts |

## Lanes
| Lane | Default | Purpose | Failure semantics |
| --- | --- | --- | --- |
| `preflight` | yes | prove local prerequisites before expensive checks | blocker |
| `deterministic` | yes | prove repeatable repo-local full flow | blocker |
| `real_local_db` | explicit mode / full mode / flag only | prove local Postgres path works safely | blocker only when executed or explicitly required |
| `external_opt_in` | no | record explicit external canary gate status without default cloud submission | skipped unless enabled |

## Artifact Contract
- Artifact root should be under `.ai/.tmp/experiment-foundation-full-flow/<run-id>/`.
- Report files must be redacted and safe to share in dev-docs.
- Contract-mode outputs:
  - `00-command-contract.md`
  - `01-lane-manifest.json`
  - `02-validation-report.md`
  - `03-blockers.md`
- Preflight-mode adds:
  - `04-preflight.md`
  - `05-preflight.json`
- Deterministic-mode adds:
  - `06-deterministic.md`
  - `07-deterministic.json`
- Real-local-DB mode adds:
  - `08-real-local-db.md`
  - `09-real-local-db.json`
- Full mode writes lane artifacts as each lane is reached. A successful full run writes all preflight, deterministic, real-local-DB, and external canary artifacts:
  - `10-external-canary.md`
  - `11-external-canary.json`
- If full mode is blocked by preflight, the manifest lists only the artifacts actually written, while the validation report and blockers explain which later lanes were not reached.

## CLI Contract
- Script: `.ai/scripts/experiment-foundation-full-flow-runner.mjs`
- Package entry: `pnpm experiment-foundation:full-flow -- <options>`
- Supported flags:
  - `--mode <contract|preflight|deterministic|real-local-db|full>`; default `contract`
  - `--run-id <id>`; default timestamped run id
  - `--artifact-dir <path>`; default `.ai/.tmp/experiment-foundation-full-flow/<run-id>`
- `--include-external-canary`; default false
- `--require-real-db`; default false
- `contract`, `preflight`, `deterministic`, `real-local-db`, and `full` are implemented.
- `full` runs the local closure sequence and records external canary status separately.

## Preflight Checks
- `.env.local` presence is a blocker when missing.
- `DATABASE_URL` is loaded with explicit env first, then repo/backend local env files; only source and parse status are recorded.
- Postgres connectivity is checked with a lightweight Prisma `SELECT 1`.
- Migration status is checked with `pnpm exec prisma migrate status --schema prisma/schema.prisma`; raw command output is not stored.
- LocalScript root/enabled/allowlist gaps are warnings in Phase 2 because deterministic tests install isolated test env overrides.
- Desktop smoke backend/renderer ports are probed; occupied default ports become warnings when a nearby alternative is available.
- External canary credentials are skipped by default and become blockers only when `--include-external-canary` is requested.

## Deterministic Execution
- Deterministic mode always runs preflight first.
- If preflight has blockers, deterministic mode exits before expensive commands and writes preflight blockers.
- If preflight passes, deterministic mode runs the manifest command inventory in order:
  - shared typecheck/test;
  - backend typecheck/full test;
  - desktop typecheck/build/smoke;
  - targeted T-090 experiment-foundation capability harness;
  - adjacent workorder guard;
  - governance dry-run/lint;
  - `git diff --check`.
- Command artifacts record exit code, signal, timeout status, duration, stdout/stderr byte counts, and bounded redacted output tails.
- The runner does not import T-090 fixtures or rebuild experiment-foundation DTO graphs; it delegates coverage to the existing backend test commands.

## Real Local DB Execution
- Real-local-DB mode always runs preflight first.
- The lane creates a disposable schema name derived from the run id.
- The lane applies repo Prisma migrations to the disposable schema by overriding `DATABASE_URL` only for the migration process.
- The lane performs direct Prisma round-trips for:
  - `ExperimentFoundationRecord`;
  - `ExperimentFoundationReadinessReport`;
  - `ExperimentFoundationExternalTrainingJob`.
- The lane drops the disposable schema with `CASCADE` during cleanup and reports whether cleanup succeeded.
- Artifacts store the disposable schema name and step statuses only; they do not store raw database URLs or migration output.

## Full Closure Execution
- Full mode runs preflight first.
- If preflight has blockers, full mode stops before deterministic commands and records external canary gate status when requested.
- If preflight passes, full mode runs deterministic validation, then real-local-DB smoke, then external canary gate reporting.
- Full mode passes only when deterministic and real-local-DB pass, and external canary is either skipped by default or passes its explicit gate checks.

## External Canary Gate
- External canary is off by default and records `EXTERNAL_CANARY_SKIPPED`.
- `--include-external-canary` makes missing credential key presence or missing `EXPERIMENT_FOUNDATION_EXTERNAL_CANARY_ENABLED=true` a blocker.
- `EXPERIMENT_FOUNDATION_EXTERNAL_CANARY_PROVIDER` defaults to `aliyun_pai_dlc`; other provider values block in preflight until a future provider gate is intentionally added.
- T-103 closure mode does not submit real cloud jobs, invoke real SDKs, store SDK payloads, or collect external artifacts.
- A future cloud hardening task can replace the gate-only boundary with a real canary after explicit cost/credential policy approval.

## Lane Manifest Shape
The contract-mode runner writes a JSON manifest with:
- runner id/version, task id, run id, mode, artifact dir, and flags;
- lane definitions for `preflight`, `deterministic`, `real-local-db`, and `external-opt-in`;
- deterministic command inventory with command ids, cwd, argv, and display string;
- phase marker and the actual artifact file list written by the current run.

## Anti-drift Rules
- Do not duplicate T-090 fixture graph construction outside the existing harness unless an explicit reusable helper is extracted.
- Do not synthesize canonical DTOs in the runner; use the registry/API/service tests that already own those payloads.
- Do not treat skipped external canary as a deterministic failure.
- Do not print full `DATABASE_URL`, provider keys, cloud endpoints with tokens, SDK payloads, or local credential paths.
