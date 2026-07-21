# T-132 Pack C C-cutover increment 2 report

Date: 2026-07-21

## Outcome

The D-17 caller-conclusion cutover is implemented. The legacy ValidationCycle completion entrance now fails permanently at service entry, caller-authored conclusion fields are absent from write DTOs, v2 closure atomically completes the product Cycle row, and every sealed service requires an explicit closed-Cycle lookup. Stored/read shapes and historical rows remain unchanged.

Increment 2 does not close the whole Pack C roadmap. `packc-cutover-*` PC18 and the final PC01-PC20/PC17 convergence gates remain.

## Files changed

Production and runner code:

- `packages/shared/src/research-lifecycle/paper-implementation-validation-contracts.ts`
- `apps/backend/src/services/paper-implementation-validation-cycle-planning-service.ts`
- `apps/backend/src/services/paper-implementation-validation-cycle-closure-v2-service.ts`
- `apps/backend/src/repositories/paper-implementation-validation-cycle-closure-v2.repository.ts`
- `apps/backend/src/repositories/prisma/prisma-paper-implementation-validation-cycle-closure-v2-repository.ts`
- `apps/backend/src/services/paper-implementation-experiment-v2-admission-service.ts`
- `apps/backend/src/services/paper-implementation-experiment-v2-head-service.ts`
- `apps/backend/src/services/experiment-foundation-v2-materialization-service.ts`
- `apps/backend/src/services/experiment-foundation-execution-v2-service.ts`
- `apps/backend/scripts/run-experiment-foundation-d19-spine.ts`
- `apps/backend/scripts/run-experiment-foundation-packa-product-landing.ts`
- `apps/backend/scripts/run-experiment-foundation-packb-simulation.ts`

Tests:

- `packages/shared/src/research-lifecycle/paper-implementation-validation-contracts.schema.test.ts`
- `apps/backend/src/routes/paper-implementation-routes.integration.test.ts`
- `apps/backend/src/services/paper-implementation-validation-cycle-planning-service.unit.test.ts`
- `apps/backend/src/services/paper-implementation-validation-cycle-closure-v2-service.unit.test.ts`
- `apps/backend/src/services/paper-implementation-contract-evaluation-suite.unit.test.ts`
- `apps/backend/src/services/experiment-foundation-execution-v2-service.unit.test.ts`
- `apps/backend/src/services/experiment-foundation-provider-command-v2-worker.unit.test.ts`
- `apps/backend/src/services/experiment-v2-integration-spine.unit.test.ts`
- `apps/backend/src/repositories/prisma/prisma-experiment-v2-repositories.unit.test.ts`
- `apps/backend/src/repositories/prisma/prisma-experiment-foundation-v2-relational.integration.test.ts`
- `apps/backend/src/repositories/prisma/prisma-experiment-foundation-scientific-validation-v2-relational.integration.test.ts`
- `apps/backend/src/repositories/prisma/prisma-paper-implementation-evidence-closure-v2-relational.integration.test.ts`

Handoff documents:

- `dev-docs/active/experiment-foundation-productization-closure/00-overview.md`
- `dev-docs/active/experiment-foundation-productization-closure/01-plan.md`
- `dev-docs/active/experiment-foundation-productization-closure/03-implementation-notes.md`
- `dev-docs/active/experiment-foundation-productization-closure/04-verification.md`
- `artifacts/pack-c-preplanning-20260718/report.md`

No Prisma schema/migration or env-contract file changed.

## Closed write-surface inventory

| Surface | Final behavior |
|---|---|
| Route | `POST /paper-implementation/projects/:implementation_project_id/validation-cycles/:validation_cycle_id/complete` remains registered as a stable compatibility entrance and uses the reduced completion schema. |
| Controller | `PaperImplementationController.completeValidationCycle` still delegates to the service, preserving normal error-envelope behavior. |
| Service | `PaperImplementationValidationCyclePlanningService.completeValidationCycle` performs no project, Cycle, repository, provider, or diagnostic work. The method always returns HTTP 409 semantics through `AppError(GATE_CONSTRAINT_FAILED)` with `reason_code=LEGACY_SCIENTIFIC_WRITER_CLOSED` and directs callers to the v2 closure lane. |
| Draft write DTO | `decision_exit` removed from `CreateValidationCycleDraftRequest` and its schema; new rows initialize stored `decision_exit` to null. |
| Admission write DTO | `decision_exit` removed from `AdmitValidationCycleRequest` and its schema; admission no longer rewrites a historical stored value. |
| Completion write DTO | `lifecycle_status`, `execution_status`, `outputs`, and `cycle_assessment` removed from `CompleteValidationCycleRequest` and its schema. |
| Stored/read DTO | `ValidationCycle.lifecycle_status`, `execution_status`, `outputs`, `cycle_assessment`, and `decision_exit` remain in the stored/read interface and response schema. Existing completed rows remain readable through get/list diagnostics. |

Fastify removes unknown request properties under the current composition, so old caller payload fields may be stripped before the controller. The service-entry closure is therefore the authoritative stable rejection and prevents an empty or stripped body from reopening completion authority.

## Product Cycle synchronization

The v2 closure service retains all existing readiness, active-real-Attempt, watermark, expected-version, idempotency, proposal, and closure-kind fences. The same repository transaction now:

1. resolves exact stored-closure replay before any product-row update;
2. requires the live product Cycle lifecycle to be `admitted`, `running`, or `interpreting`;
3. performs an optimistic update guarded by Cycle id, the observed lifecycle status, and `completedAt IS NULL`;
4. writes the existing vocabulary only: `cycleStatus=completed`, `executionStatus=completed`, and the closure timestamp to both `updatedAt` and `completedAt`;
5. commits the immutable v2 closure plus `ValidationCycleClosed@v1` outbox in that same transaction.

An optimistic update that observes `completed`, `aborted`, or `superseded` maps to `CYCLE_ALREADY_CLOSED`. Other nonterminal drift maps to `CLOSURE_CONCURRENT_CONFLICT`, which the existing service conflict handling resolves through stored-closure/idempotency checks. An exact replay continues returning the stored closure without attempting a second product transition.

The consistency contract is now dual-fact: the immutable v2 closure row/outbox and the mutable product Cycle terminal state transition commit together or roll back together. A terminal product row with no stored v2 closure is rejected as `CYCLE_ALREADY_CLOSED`; the service does not manufacture a closure to repair historical drift.

The in-memory repository mirrors the transaction and rollback behavior and exposes the product completion fact for unit assertions. The Prisma relational test additionally checks successful synchronization, rollback with the closure/outbox failure injection, and terminal-row rejection.

## Required seal lookup constructor inventory

The fail-open `NEVER_CLOSED_CYCLE_LOOKUP` constants and optional constructor properties were deleted from all four services:

- `PaperImplementationExperimentV2AdmissionService`
- `PaperImplementationExperimentV2HeadService`
- `ExperimentFoundationV2MaterializationService`
- `ExperimentFoundationExecutionV2Service`

Whole-repository constructor census: 70 sites, all compile with an explicit lookup.

| Constructor population | Sites | Dependency |
|---|---:|---|
| `apps/backend/src/app.ts` | 4 | existing real Prisma closure lookup |
| three checked-in Pack A/D-19/Pack B runners | 10 | real Prisma closure lookup added |
| backend tests | 56 | explicit open fake or scenario-specific closed/in-memory/Prisma lookup |

Per-file runner census is D-19 4, Pack A product landing 2, and Pack B simulation 4. Test census is scientific-validation relational 2, EF relational 5, repository unit 2, evidence/closure relational 6, EF execution unit 21, provider-worker unit 3, and integration-spine unit 17.

## Replaced and added tests

- Replaced `repeated low information gain completion creates loop budget review item` with `legacy completion is closed below HTTP while historical completed-cycle reads are preserved`.
- Updated the T-101 executable child-anchor to require the replacement closure/read test.
- Replaced the route-level caller-assessment completion assertion with stable 409/`LEGACY_SCIENTIFIC_WRITER_CLOSED` rejection plus an unchanged admitted Cycle read.
- Added write-schema negative-space assertions for completion status/outputs/assessment and draft/admission `decision_exit`, while pinning stored/read assessment/exit/outputs.
- Added closure unit assertions for product `completed`/`completed`, exact replay without a duplicate transition, and terminal product row without closure.
- Added relational assertions for product-row success, all-or-nothing rollback, and terminal-row rejection.
- Updated every test constructor site to provide an explicit closure lookup; scenario-specific closed-Cycle tests retain their existing fakes.

## Verification

| Command / population | Result |
|---|---|
| `cd apps/backend && npx tsc -p tsconfig.json --noEmit` | passed, exit 0 |
| `cd apps/backend && npx tsc -p tsconfig.experiment-foundation-scripts.json --noEmit` | passed, exit 0 |
| ten initially modified backend test files, direct Node runner | 141 total: 130 passed, 0 failed, 11 intentional conditional PostgreSQL skips |
| final affected route/planning/closure files, direct Node runner | 30/30 passed; 0 failed/skipped |
| T-101 contract-evaluation file, direct Node runner | 5/5 passed; 0 failed/skipped |
| modified shared validation schema file, direct Node runner | 6/6 passed; 0 failed/skipped |
| `pnpm --filter @paper-engineering-assistant/shared test` | 384/384 passed; 0 failed/skipped/todo; `25753.829208ms` |
| `pnpm --filter @paper-engineering-assistant/backend test` | 2,340 total: 2,269 passed, 14 failed, 57 skipped, 0 todo; `412532.452542ms`; exit 1 |
| whole-bundle strict documentation lint | 0 errors, 13 historical vague-reference warnings, and no warning in the increment-2 report; strict exit 1 on the existing warning baseline |

All modified test files passed when invoked directly. The full backend command is non-green on 14 cases outside the increment-2 cutover population:

- eight PostgreSQL-unavailable cases at `127.0.0.1:5432`: Prisma rollback N4/N5/N6/N7/N8/N10 and T-054/T-067 HTTP smokes;
- six literature environment/network cases: key-content curation export/import; workflow import/topic/paper-link/citation update; rerun artifact overwrite; global-env USER_AUTH gate; explicit fulltext processing/metadata-stale registration; and remote download/register (`getaddrinfo ENOTFOUND arxiv.org`).

An earlier final-source full run reported 2,268 passed/15 failed because the T-101 source anchor still named the removed repeated-low-information test. The anchor was updated, its file passed directly 5/5, and the final full population improved to the totals above.

## Risks and remaining work

- The final real-Prisma product-row synchronization cases were conditionally skipped in the current sandbox because PostgreSQL was unavailable. The checked-in relational tests must remain mandatory in `packc-cutover-*`/`packc-final-*` host gates.
- There is intentionally no compatibility success response on `/complete`; clients must migrate to the v2 closure route. Fastify request stripping makes the service-level rejection essential; route and unit tests cover the rejection.
- A historical terminal product Cycle without a v2 closure is treated as already closed, not auto-repaired. Read/diagnostic access remains available.
- The product Cycle row has no version column; the optimistic guard uses the observed lifecycle plus `completedAt IS NULL`, while the immutable closure path retains the stronger D-18 watermark and expected-version fences.
- Scientific closure/proposal-derived disposition remains disabled as designed. Increment 2 does not weaken or implement those deferred fences.
- PC18 and the final combined Pack C gates remain; the report closes increment 2 only.
