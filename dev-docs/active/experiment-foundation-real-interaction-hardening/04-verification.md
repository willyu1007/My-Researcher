# T-106 Verification

## Creation Verification

Task package creation commands run on 2026-05-24:

```bash
node .ai/scripts/ctl-project-governance.mjs sync --apply --project main
node .ai/scripts/ctl-project-governance.mjs map --project main --task T-106 --milestone M-001 --feature F-001 --requirement R-012 --apply
node .ai/scripts/ctl-project-governance.mjs sync --apply --project main
node .ai/scripts/ctl-project-governance.mjs lint --check --project main
git diff --check -- dev-docs/active/experiment-foundation-real-interaction-hardening .ai/project/main
```

Results:

- `sync --apply`: passed; registry and derived project views regenerated.
- `map --apply`: passed; `T-106` mapped from `M-000/F-000` to `M-001/F-001/R-012`.
- `lint --check`: passed.
- `git diff --check`: passed for the new task package and project governance files.

## Phase 1 Matrix Verification

Commands run on 2026-05-25:

```bash
git diff --check -- dev-docs/active/experiment-foundation-real-interaction-hardening .ai/project/main
node .ai/scripts/ctl-project-governance.mjs sync --apply --project main
node .ai/scripts/ctl-project-governance.mjs lint --check --project main
```

Results:

- `06-hardening-matrix.md` added and reviewed as the Phase 1 executable matrix.
- The matrix contains lane taxonomy, fixture inventory, 22 critical node rows, current coverage baseline, and implementation backlog ids `T106-B1` through `T106-B6`.
- T-106 moved to `in-progress`; registry shows `T-106` under `M-001 > F-001 > R-012`.
- `git diff --check`: passed for T-106 docs and project governance files.
- `sync --apply`: passed and regenerated project derived views.
- `lint --check`: passed.
- No product code, shared contract, Prisma schema, REST route, desktop UI, or runner implementation changed in Phase 1.

## Remaining Verification Lanes

- Hardening matrix lint: every critical node has a fixture, command, expected outcome, and artifact. Phase 1 matrix is now the backlog source.
- LocalScript robustness: Phase 2 targeted backend tests now cover the lane; future runner work should only add artifact reporting and command integration.
- API/DB recovery: memory plus disposable local DB tests for registry, readiness, promotion, materialization, execution, result, and evidence paths.
- UI-driven workbench: desktop smoke/e2e for registry, readiness, jobs, results, evidence, and error states.
- Cross-flow seam: PaperImplementation and adjacent flows consume refs and hashes only.
- External canary: skipped, blocked, fake, or true opt-in behavior recorded separately from deterministic validation.

## Phase 2 LocalScript Verification

Commands run on 2026-05-25:

```bash
node --test --loader ts-node/esm src/services/experiment-foundation-execution-service.unit.test.ts
pnpm --filter @paper-engineering-assistant/backend typecheck
```

Results:

- Targeted execution service test: passed, 10 tests.
- Backend typecheck: passed.
- New tests covered disabled execution, command/root gates, `shell=false` argument behavior, non-terminal collect rejection, timeout terminal failure, partial validation without evidence, repeated collect idempotency, and existing submit idempotency conflict behavior.
- No product code changes were required.

Review fixes run on 2026-05-25:

```bash
node --test --loader ts-node/esm src/services/experiment-foundation-execution-service.unit.test.ts
pnpm --filter @paper-engineering-assistant/backend typecheck
node .ai/scripts/ctl-project-governance.mjs sync --apply --project main
node .ai/scripts/ctl-project-governance.mjs lint --check --project main
git diff --check -- apps/backend/src/services/experiment-foundation-execution-service.unit.test.ts dev-docs/active/experiment-foundation-real-interaction-hardening .ai/project/main
```

Results:

- Targeted execution service test: passed, 10 tests, after temp execution-root cleanup was added.
- Backend typecheck: passed.
- Governance sync/lint: passed.
- `git diff --check`: passed.
- Scope correction: topic-selection T-107/T-108 task packages were restored because they belong to a separate task stream and must not be deleted during T-106 work.

## Phase 3A API Recovery Verification

Commands run on 2026-05-27:

```bash
node --test --loader ts-node/esm src/services/experiment-foundation-capability-harness.test.ts
pnpm --filter @paper-engineering-assistant/backend typecheck
```

Results:

- Capability harness targeted test: passed, 5 tests.
- Backend typecheck: passed.
- New Phase 3A recovery scenario covered readiness blocker/action recovery, candidate promotion gate recovery, failed submit retry without job creation, idempotent cancel, cancelled-job listability, and partial validation without evidence.
- Disposable DB parity was not run in the subphase; parity remains Phase 3B.

Commands run for Phase 3B baseline on 2026-05-27:

```bash
pnpm experiment-foundation:full-flow -- --mode real-local-db --run-id t106-phase3b-baseline-realdb
rg -n "postgres(ql)?://|DATABASE_URL=|ALIYUN_ACCESS_KEY|OPENAI_API_KEY|DASHSCOPE_API_KEY|SECRET|PASSWORD|T103_DUMMY_ACCESS" .ai/.tmp/experiment-foundation-full-flow/t106-phase3b-baseline-realdb || true
node .ai/scripts/ctl-project-governance.mjs lint --check --project main
git diff --check -- apps/backend/src/services/experiment-foundation-capability-harness.test.ts dev-docs/active/experiment-foundation-real-interaction-hardening
```

Results:

- T-103 real-local-DB lane: passed with `REAL_LOCAL_DB_PASSED`.
- Disposable schema was created, migrations were applied, experiment-foundation record/readiness/job round trips passed, and the schema was dropped.
- Artifact redaction spot-check returned no matches for raw database URLs or credential patterns.
- Governance lint: passed.
- Scoped `git diff --check`: passed.
- The result is a disposable-DB baseline smoke. The smoke does not replace the still-needed DB-backed parity probe for the Phase 3A recovery scenarios.

Commands run for Phase 3B Prisma parity on 2026-05-27:

```bash
pnpm --filter @paper-engineering-assistant/backend typecheck
node --test --loader ts-node/esm src/services/experiment-foundation-prisma-parity.integration.test.ts
EXPERIMENT_FOUNDATION_PRISMA_PARITY=1 node --env-file=../../.env.local --test --loader ts-node/esm src/services/experiment-foundation-prisma-parity.integration.test.ts
node --test --loader ts-node/esm src/services/experiment-foundation-capability-harness.test.ts
```

Results:

- Backend typecheck: passed.
- Prisma parity default path: passed with the single DB-backed test skipped unless explicitly enabled.
- Prisma parity opt-in path: passed against local `DATABASE_URL`; the test created a disposable schema, applied repo migrations, exercised representative Prisma-backed registry/readiness/promotion/execution/result/evidence transitions, and dropped the schema.
- Capability harness targeted test: passed, 5 tests, confirming the memory/API recovery lane still matches the earlier Phase 3A behavior.
- The opt-in test output did not print raw `DATABASE_URL` or provider credentials.

## Phase 4 UI Flow Contract Verification

Commands run on 2026-05-27:

```bash
node .ai/scripts/ctl-project-governance.mjs lint --check --project main
git diff --check -- apps/backend/src/services/experiment-foundation-prisma-parity.integration.test.ts apps/backend/src/services/experiment-foundation-capability-harness.test.ts dev-docs/active/experiment-foundation-real-interaction-hardening
```

Results:

- Governance lint: passed.
- Scoped `git diff --check`: passed.
- `07-ui-workbench-flow-contract.md` defines user path, backend calls, expected states, error/recovery expectations, artifact redaction rules, and explicit renderer non-ownership assertions.
- No desktop code or style files changed.

## Phase 5 Cross-flow Seam Verification

Commands run on 2026-05-27:

```bash
node --test --loader ts-node/esm src/services/paper-implementation-live-experiment-adapter-service.unit.test.ts
pnpm --filter @paper-engineering-assistant/backend typecheck
```

Results:

- PaperImplementation live experiment adapter targeted test: passed, 10 tests.
- Backend typecheck: passed.
- The collect seam now verifies that PaperImplementation stores result/evidence refs and hashes while ignoring experiment-foundation record payloads that contain claim/final wording.
- The persisted adjacent state is recursively checked for forbidden experiment-foundation DTO keys, paper claim fields, final-table fields, leaderboard/ranking fields, and publication-ready wording.

## Phase 6/7 Runner Verification

Commands run on 2026-05-27:

```bash
node .ai/scripts/experiment-foundation-hardening-runner.mjs --help
node .ai/scripts/experiment-foundation-hardening-runner.mjs --mode contract --run-id t106-runner-contract-smoke
node .ai/scripts/experiment-foundation-hardening-runner.mjs --mode ui-definition --run-id t106-ui-definition-smoke
node .ai/scripts/experiment-foundation-hardening-runner.mjs --mode external-gate --run-id t106-external-gate-skip-smoke
pnpm experiment-foundation:hardening -- --mode contract --run-id t106-package-contract-smoke
node .ai/scripts/experiment-foundation-hardening-runner.mjs --mode external-gate --include-true-external-canary --run-id t106-external-gate-blocked-smoke
node .ai/scripts/experiment-foundation-hardening-runner.mjs --mode deterministic --run-id t106-deterministic-smoke-v2
node .ai/scripts/experiment-foundation-hardening-runner.mjs --mode real-local-db --require-real-db --run-id t106-real-local-db-runner-smoke
node .ai/scripts/ctl-project-governance.mjs lint --check --project main
git diff --check -- .ai/scripts/experiment-foundation-hardening-runner.mjs package.json dev-docs/active/experiment-foundation-real-interaction-hardening
node --check .ai/scripts/experiment-foundation-hardening-runner.mjs
```

Results:

- Help output: passed.
- Contract mode: passed and wrote `00-command-contract.md`, `01-lane-manifest.json`, `02-validation-report.md`, and `03-blockers.md`.
- UI-definition mode: passed with 11 checks against `07-ui-workbench-flow-contract.md`.
- Default external gate: passed as `TRUE_EXTERNAL_CANARY_SKIPPED`.
- Package script handoff: passed.
- Explicit true external gate without env prerequisites: failed as expected with `TRUE_EXTERNAL_CANARY_BLOCKED`; no real external call was attempted.
- Deterministic mode: passed, 9 commands, 0 failures, 0 timeouts.
- Real-local-DB mode: passed through the disposable Postgres parity probe.
- Redaction spot-checks found no raw database URL, credential value, SDK payload, or provider secret in the real-local-DB runner artifacts. Earlier artifact scans only matched allowed env key names in the command manifest.
- Governance lint: passed.
- Scoped `git diff --check`: passed.
- Runner syntax check: passed.

## Phase 6/7 Runner Quality-fix Verification

Commands run on 2026-05-27:

```bash
node --check .ai/scripts/experiment-foundation-hardening-runner.mjs
node .ai/scripts/experiment-foundation-hardening-runner.mjs --mode external-gate --run-id t106-fix-external-gate-skip
EXPERIMENT_FOUNDATION_TRUE_EXTERNAL_CANARY_PROVIDER=unsupported_provider EXPERIMENT_FOUNDATION_TRUE_EXTERNAL_CANARY_MIRROR_REF=mirror-ref EXPERIMENT_FOUNDATION_TRUE_EXTERNAL_CANARY_APPROVAL_REF=approval-ref EXPERIMENT_FOUNDATION_TRUE_EXTERNAL_CANARY_BUDGET_REF=budget-ref EXPERIMENT_FOUNDATION_TRUE_EXTERNAL_CANARY_CLEANUP_PLAN_REF=cleanup-ref node .ai/scripts/experiment-foundation-hardening-runner.mjs --mode external-gate --include-true-external-canary --run-id t106-fix-external-gate-unsupported
EXPERIMENT_FOUNDATION_TRUE_EXTERNAL_CANARY_PROVIDER=aliyun_pai_dlc EXPERIMENT_FOUNDATION_TRUE_EXTERNAL_CANARY_MIRROR_REF=mirror-ref EXPERIMENT_FOUNDATION_TRUE_EXTERNAL_CANARY_APPROVAL_REF=approval-ref EXPERIMENT_FOUNDATION_TRUE_EXTERNAL_CANARY_BUDGET_REF=budget-ref EXPERIMENT_FOUNDATION_TRUE_EXTERNAL_CANARY_CLEANUP_PLAN_REF=cleanup-ref EXPERIMENT_FOUNDATION_TRUE_EXTERNAL_CANARY_ALIYUN_WORKSPACE_REF=workspace-ref ALIYUN_ACCESS_KEY_ID=AKIA_T106_FAKE_SECRET_VALUE ALIYUN_ACCESS_KEY_SECRET=T106_FAKE_ACCESS_SECRET_VALUE node .ai/scripts/experiment-foundation-hardening-runner.mjs --mode external-gate --include-true-external-canary --run-id t106-fix-external-gate-ready
node .ai/scripts/experiment-foundation-hardening-runner.mjs --mode contract --run-id t106-fix-contract-smoke
pnpm experiment-foundation:hardening -- --mode contract --run-id t106-fix-package-contract-smoke
node .ai/scripts/experiment-foundation-hardening-runner.mjs --mode deterministic --run-id t106-fix-deterministic-smoke
node .ai/scripts/experiment-foundation-hardening-runner.mjs --mode real-local-db --require-real-db --run-id t106-fix-real-local-db-smoke
rg -n "AKIA_T106_FAKE_SECRET_VALUE|T106_FAKE_ACCESS_SECRET_VALUE|postgres(ql)?://|DATABASE_URL=|ALIYUN_ACCESS_KEY(_ID|_SECRET)?=|ALIYUN_SECRET_KEY=|OPENAI_API_KEY=|DASHSCOPE_API_KEY=|SECRET=|PASSWORD=|TOKEN=|sdk_payload|access_key[\"']?\\s*[:=]" .ai/.tmp/experiment-foundation-hardening/t106-fix-external-gate-skip .ai/.tmp/experiment-foundation-hardening/t106-fix-external-gate-unsupported .ai/.tmp/experiment-foundation-hardening/t106-fix-external-gate-ready .ai/.tmp/experiment-foundation-hardening/t106-fix-deterministic-smoke .ai/.tmp/experiment-foundation-hardening/t106-fix-real-local-db-smoke || true
node .ai/scripts/ctl-project-governance.mjs lint --check --project main
git diff --check -- .ai/scripts/experiment-foundation-hardening-runner.mjs package.json dev-docs/active/experiment-foundation-real-interaction-hardening
```

Results:

- Runner syntax check: passed.
- External gate default skip: passed.
- External gate unsupported provider: blocked as expected.
- External gate supported provider with fake env values: reached `TRUE_EXTERNAL_CANARY_GATE_READY` without making real external calls.
- Contract mode and package script contract mode: passed.
- Deterministic mode: passed.
- Real-local-DB mode: passed.
- Artifact redaction scan found no fake secret values, raw database URL, SDK payload, or credential assignment pattern.
- Governance lint and scoped `git diff --check`: passed.

## 2026-07-23: T-132 M7 ownership-handoff verification

- T-132 audit matrix now states that zero-write preflight and M7 provider implementation are T-132-owned, while T-106 consumes the final evidence.
- T-132 M7 readiness review names T-106 as the consuming acceptance and prohibits a second provider transport/schema/runner.
- T-106 overview, plan and architecture preserve the existing `external-gate` as gate-only and leave the true external acceptance item open.
- No credential value, SDK payload, raw provider log or object path was added to either task package.
- Verification commands are the strict T-106/T-132 docs lints, governance sync/lint and `git diff --check` recorded in the T-132 handoff.

## Actual Local Full Baseline

Commands run on 2026-05-27:

```bash
pnpm experiment-foundation:hardening -- --mode full --run-id t106-actual-local-full-baseline-20260527
pnpm experiment-foundation:hardening -- --mode full --run-id t106-actual-local-full-baseline-20260527-v2
node .ai/scripts/ctl-project-governance.mjs sync --apply --project main
node .ai/scripts/ctl-project-governance.mjs lint --check --project main
pnpm experiment-foundation:hardening -- --mode full --run-id t106-actual-local-full-baseline-20260527-v3
rg -n "postgres(ql)?://|DATABASE_URL=|ALIYUN_ACCESS_KEY(_ID|_SECRET)?=|ALIYUN_SECRET_KEY=|OPENAI_API_KEY=|DASHSCOPE_API_KEY=|SECRET=|PASSWORD=|TOKEN=|sdk_payload|access_key[\"']?\\s*[:=]" .ai/.tmp/experiment-foundation-hardening/t106-actual-local-full-baseline-20260527-v3 || true
node .ai/scripts/ctl-project-governance.mjs lint --check --project main
git diff --check -- .ai/scripts/experiment-foundation-hardening-runner.mjs package.json dev-docs/active/experiment-foundation-real-interaction-hardening .ai/project/main
```

Results:

- Initial full baseline `t106-actual-local-full-baseline-20260527`: passed with `FULL_PASSED`.
- After the external-gate skip semantics fix, `t106-actual-local-full-baseline-20260527-v2` failed only on global governance lint due to a derived registry mismatch for unrelated `T-109`; functional hardening commands and disposable DB parity passed.
- Ran governance sync to refresh `.ai/project/main/*`; governance lint passed.
- Final full baseline `t106-actual-local-full-baseline-20260527-v3`: passed with `FULL_PASSED`.
- Final baseline command summary: 10 commands, 10 passed, 0 failed, 0 timed out.
- UI-definition summary: 11 checks, 11 passed.
- Real-local-DB parity: passed through the runner command inventory.
- Default true external canary lane: skipped, no real external provider was contacted.
- Blockers: none.
- Artifact redaction scan found no raw database URL, credential value, SDK payload, fake secret value, or credential assignment pattern.
- Governance lint and scoped `git diff --check`: passed.
