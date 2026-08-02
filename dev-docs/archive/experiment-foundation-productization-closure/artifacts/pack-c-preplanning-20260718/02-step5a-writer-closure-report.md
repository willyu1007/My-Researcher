# T-132 Pack C C-EF step 5a closure report

Date: 2026-07-19

## Result

Legacy ExperimentFoundation scientific writers are closed at the service layer. `ExperimentFoundationV2ScientificValidationService` remains the sole future scientific write lane. Cutover flags, internal calls, scripts and direct service tests cannot reopen the legacy paths.

The stable failure is HTTP 409 / `GATE_CONSTRAINT_FAILED` with `details.reason_code=LEGACY_SCIENTIFIC_WRITER_CLOSED`.

## Closure semantics

- `ExperimentFoundationService.createRecord` and `upsertRecord` reject `experiment_result`, `result_validation_report` and `evidence_candidate` before payload validation or any repository access. Non-scientific record kinds still create and upsert.
- `ExperimentFoundationExecutionService.collectJob` rejects at method entry before external-job lookup, adapter calls or any record/job write. The collect entrance therefore produces zero legacy diagnostic writes.
- Generic EF POST/PUT, direct EF collect and PI live collect stay registered. With cutover off they surface the stable typed closure instead of writing; with cutover on the existing earlier `LEGACY_RECORD_NOT_ELIGIBLE` route guard remains unchanged.
- PI live collect directly propagates the typed `collectJob` error and creates no monitor-success/RunEvidenceUnit result. PI sync/cancel behavior remains available.
- Step 5b remains pending: partial-acceptance vocabulary/branches, partial materialization, non-atomic legacy sequence deletion and legacy/fake provenance vocabulary were not removed.

## Files changed

Product/shared source:

- `packages/shared/src/research-lifecycle/paper-implementation-experiment-v2-contracts.ts`
- `apps/backend/src/services/experiment-foundation-service.ts`
- `apps/backend/src/services/experiment-foundation-execution-service.ts`

Tests:

- `packages/shared/src/research-lifecycle/experiment-v2-contracts.schema.test.ts`
- `apps/backend/src/services/experiment-foundation-service.unit.test.ts`
- `apps/backend/src/services/experiment-foundation-execution-service.unit.test.ts`
- `apps/backend/src/services/paper-implementation-live-experiment-adapter-service.unit.test.ts`
- `apps/backend/src/services/experiment-foundation-capability-harness.test.ts`
- `apps/backend/src/services/experiment-foundation-prisma-parity.integration.test.ts`

Task documentation:

- `dev-docs/active/experiment-foundation-productization-closure/00-overview.md`
- `dev-docs/active/experiment-foundation-productization-closure/01-plan.md`
- `dev-docs/active/experiment-foundation-productization-closure/03-implementation-notes.md`
- `dev-docs/active/experiment-foundation-productization-closure/04-verification.md`
- `dev-docs/active/experiment-foundation-productization-closure/artifacts/pack-c-preplanning-20260718/report.md`

No controller, route registration, `app.ts`, Prisma schema/migration, env contract, v2 scientific-validation service/repository or database was changed.

## Replaced-test inventory

| Superseded assertion | Replacement assertion |
|---|---|
| LocalScript collect created result, validation, facts, partial refs and EvidenceCandidate | collect returns typed closure; repository lookup count does not change; generic-record and job snapshots remain unchanged |
| timeout/failed/cancelled collect created partial validation and supported deterministic replay | every pre/post-terminal collect attempt returns the same closure and creates zero partial/result refs |
| EF collect HTTP returned 200 plus EvidenceCandidate refs | cutover-off EF collect returns typed 409 closure |
| generic scientific payload validation returned 400 or allowed schema-valid creation | create/upsert for all three scientific kinds return typed closure before schema/repository access; dataset create/upsert still works |
| capability harness collected and read legacy result/validation/evidence rows | capability harness observes typed closure and unchanged jobs; unrelated readiness/promotion/submit/sync/cancel/sidecar coverage remains |
| Prisma parity collected valid/partial scientific rows | optional Prisma parity expects the same typed closure and zero result/partial refs for succeeded and cancelled jobs |
| PI live collect minted REU/trace inputs from stored legacy result hashes | PI adapter and route propagate the typed closure and create zero REU; sync/cancel tests remain unchanged |
| frozen shared reason registry contained only the prior legacy code | shared registry now also contains `LEGACY_SCIENTIFIC_WRITER_CLOSED` |

## Verification

- Backend TypeScript: passed (`npx tsc -p tsconfig.json --noEmit`).
- Modified backend test files: 39 passed, 0 failed, 1 conditional Prisma-parity skip in the five-file run; strengthened execution rerun 10/10 passed.
- Shared TypeScript: passed.
- Modified shared schema test: 17/17 passed.
- Full shared suite: 374/374 passed.
- Exact backend full suite: 2,292 total; 2,228 passed, 14 failed, 50 skipped. Six failures were unrelated Prisma tests whose local TCP database was inaccessible in the sandbox.
- Backend full suite with `DATABASE_URL=''` to activate those tests' documented conditional skip: 2,292 total; 2,228 passed, 8 failed, 56 skipped. No modified targeted test failed.

## Unresolved risks

- The required backend full suite is not globally green in the current environment. Two observed literature content-processing polling failures reproduce in isolation and are unrelated to step 5a; six additional full-fleet failures were outside the modified targeted files. The baseline failures need repository-owner triage or a known-green execution environment.
- The opt-in real Prisma parity test for step 5a was conditionally skipped. The parity expectation was updated, but real-PostgreSQL execution remains for the later C-EF machine gate.
- Unreachable legacy collector helpers and partial/provenance vocabulary intentionally remain until step 5b. The service-entry closure prevents their execution but does not delete that code.
