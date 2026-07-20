# T-132 Pack C C-PI step 5 implementation report

Date: 2026-07-21  
Scope: v2 `ValidationCycle` closure authority, closed-Cycle write seal, and Sidecar generic-writer closure

## Outcome

Implemented Plan B as a new dedicated default-off v2 lane. The service transactionally rebuilds the D-18 readiness watermark through the existing evaluator read semantics, applies blocker/version/hash/idempotency fences, and atomically writes one `PaperImplementationValidationCycleClosureV2` plus one PI `ValidationCycleClosed@v1` outbox event.

This slice deliberately does not modify the legacy `/complete` route/service, the live product `PaperImplementationValidationCycle` row, Prisma schema or migrations, or any env-contract artifact. Scientific-evidence closure remains production-disabled and returns the dedicated closure-disabled reason with an explicit later-increment message; proposal handling was not partially implemented.

## Repository boundary decision

A dedicated closure unit-of-work port was added instead of extending the evidence-gateway repository. It composes the readiness repository read surface with closure/outbox persistence so the evaluator and CAS fence run against one transaction-consistent Prisma client. The evidence gateway remains responsible only for Candidate-to-PI evidence trust.

A separate `PaperImplementationValidationCycleClosureV2Lookup` exposes only `isCycleClosed(validationCycleId)`. PI admission/head and EF materialization/execution depend on this narrow read-only surface. EF performs no PI write and receives no PI repository internals.

## Files changed

### Backend runtime

- `apps/backend/src/app.ts`
- `apps/backend/src/controllers/paper-implementation-experiment-v2-controller.ts`
- `apps/backend/src/routes/paper-implementation-experiment-v2-routes.ts`
- `apps/backend/src/repositories/paper-implementation-validation-cycle-closure-v2-lookup.ts`
- `apps/backend/src/repositories/paper-implementation-validation-cycle-closure-v2.repository.ts`
- `apps/backend/src/repositories/prisma/prisma-paper-implementation-validation-cycle-closure-v2-repository.ts`
- `apps/backend/src/repositories/prisma/prisma-paper-implementation-cycle-readiness-v2-repository.ts`
- `apps/backend/src/services/paper-implementation-validation-cycle-closure-v2-service.ts`
- `apps/backend/src/services/paper-implementation-experiment-v2-admission-service.ts`
- `apps/backend/src/services/paper-implementation-experiment-v2-head-service.ts`
- `apps/backend/src/services/experiment-foundation-v2-materialization-service.ts`
- `apps/backend/src/services/experiment-foundation-execution-v2-service.ts`
- `apps/backend/src/services/experiment-foundation-execution-v2-errors.ts`
- `apps/backend/src/services/experiment-foundation-service.ts`

### Shared contracts

- `packages/shared/src/research-lifecycle/paper-implementation-experiment-v2-contracts.ts`
- `packages/shared/src/research-lifecycle/paper-implementation-evidence-v2-contracts.ts`
- `packages/shared/src/research-lifecycle/experiment-foundation-execution-v2-contracts.ts`

### Tests

- `apps/backend/src/services/paper-implementation-validation-cycle-closure-v2-service.unit.test.ts`
- `apps/backend/src/routes/paper-implementation-experiment-v2-routes.integration.test.ts`
- `apps/backend/src/services/experiment-v2-integration-spine.unit.test.ts`
- `apps/backend/src/services/experiment-foundation-execution-v2-service.unit.test.ts`
- `apps/backend/src/services/experiment-foundation-service.unit.test.ts`
- `apps/backend/src/services/experiment-foundation-capability-harness.test.ts`
- `packages/shared/src/research-lifecycle/experiment-v2-contracts.schema.test.ts`
- `packages/shared/src/research-lifecycle/paper-implementation-evidence-v2-contracts.schema.test.ts`

### Handoff artifacts

- `dev-docs/active/experiment-foundation-productization-closure/03-implementation-notes.md`
- `dev-docs/active/experiment-foundation-productization-closure/04-verification.md`
- this report

The five pre-existing env/literature dirty files named in the task were not modified by this implementation.

## Closure authority

- Composition defaults the closure capability to `false`. A TODO identifies the pending reviewed env key without changing env contracts.
- The route is `POST /paper-implementation/validation-cycles/:validation_cycle_id/closure/v2`; it uses the shared strict request/response schemas, rejects path/body Cycle identity mismatch, rejects legacy/caller-authored closure authority fields, and preserves the standard typed error envelope.
- Disabled closure and the intentionally unavailable scientific kind return `PI_EXPERIMENT_V2_CYCLE_CLOSURE_DISABLED` before repository work.
- The transaction reconstructs readiness using `PaperImplementationCycleReadinessV2Service` over the closure transaction adapter. `BRANCH_HEAD_NOT_FROZEN` and `CYCLE_ACTIVE_REAL_ATTEMPT` write nothing.
- Existing Cycle closure is terminal. Exact Cycle + idempotency key + expected closure-input hash replay returns the stored closure; all other existing/unique conflicts return `CYCLE_ALREADY_CLOSED`.
- Expected Cycle version or watermark-hash mismatch returns `CYCLE_CLOSURE_SCOPE_DRIFT` with zero writes.
- `control_flow_validated_no_paper_evidence` requires no eligible REU, null proposal/hash/corrected disposition, and persists null disposition/selected exit.
- Closure id, closure snapshot hash, event ids and event payload/envelope hashes are server-derived. The repository validates these bindings in application code because the 20260720141000 CHECK-hardening migration is not assumed applied.
- Closure and `ValidationCycleClosed@v1` outbox append are atomic. The product Cycle row is unchanged by Plan B.

## Seal wiring map

| Writer surface | Closed-Cycle check point | Rejected work before return |
|---|---|---|
| PI v2 WorkOrder admission | after capability check, before actor/scope/repository reads | admission/inbox/outbox/branch and revision writes |
| PI v2 branch-head advance | after event-envelope validation, before inbox or branch-head processing | inbox/head/outbox writes |
| EF v2 admission materialization | after PI event-envelope validation, before inbox/readiness/materialization | EF asset/Run/TaskSpec/inbox/outbox writes |
| EF Pack B workflow-simulation start | after read-only Run prerequisite resolution, before readiness/replay/attempt creation | Attempt, provider payload/command, event and dispatch work |
| Legacy generic EF `createRecord`/`upsertRecord` for `paper_experiment_sidecar` | existing 5a kind guard before validation or repository access | every generic Sidecar create/upsert write |

All four Cycle seals return `CYCLE_ALREADY_CLOSED`; the Sidecar closure mirrors the existing 5a `LEGACY_SCIENTIFIC_WRITER_CLOSED` behavior.

## Registry addendum

The shared `EXPERIMENT_V2_REASON_CODES` registry now includes `PI_EXPERIMENT_V2_CYCLE_CLOSURE_DISABLED` immediately beside `PI_EXPERIMENT_V2_ADMISSION_DISABLED`. It also exposes the closure/seal reasons required by the generic HTTP error schema: `BRANCH_HEAD_NOT_FROZEN`, `CYCLE_ACTIVE_REAL_ATTEMPT`, `CYCLE_CLOSURE_SCOPE_DRIFT`, `CYCLE_ALREADY_CLOSED`, and `CLOSURE_PROPOSAL_STALE`. The EF execution-specific registry adds `CYCLE_ALREADY_CLOSED`. Registry/schema tests pin the additions.

## Verification

| Command / population | Result |
|---|---|
| `cd apps/backend && npx tsc -p tsconfig.json --noEmit` | passed, exit 0 |
| new closure service unit file | 9/9 passed |
| modified PI v2 route integration file | 9/9 passed |
| modified v2 integration-spine file | 31/31 passed |
| modified EF Pack B execution file | 19/19 passed |
| modified EF legacy service file | 13/13 passed |
| modified EF capability-harness file | 5/5 passed |
| modified shared experiment-v2 registry file | 17/17 passed |
| modified shared evidence-v2 schema file | 9/9 passed |
| `pnpm --filter @paper-engineering-assistant/shared test` | 383/383 passed; 0 failed, 0 skipped |
| `pnpm --filter @paper-engineering-assistant/backend test` | final post-fix full population: 2,338 tests, 2,269 passed, 15 failed, 54 skipped; underlying test status failed |
| `git diff --check` | passed before documentation finalization |

Every new or modified test file was also run directly with `node --test --loader ts-node/esm`. The backend targeted population passed 86/86 and the shared targeted population passed 26/26. No in-scope targeted test failed.

The backend full-suite failures are outside the changed C-PI files:

- PostgreSQL unavailable at `127.0.0.1:5432`: six Prisma topic-selection rollback cases (`N4`, `N5`, `N6`, `N7`, `N8`, `N10`) plus the T-054 and T-067 Prisma HTTP smokes.
- Static Pack A assertion: `Pack A hardening makes all 38 same-domain foreign keys immutable and fences fixed versions`.
- Literature integration assertions: key-content curation export/import; workflow import/topic/paper-link/citation update; rerun stage-artifact overwrite; global-env USER_AUTH gate; explicit fulltext processing/metadata-stale registration; remote-content download/register.

The first full run exposed one obsolete in-scope harness expectation that Sidecar remained writable. That test was updated to assert permanent closure, passed directly 5/5, and disappeared from the final 15-failure population.

## Risks and deferred work

- The lane is intentionally unusable in default production composition until a reviewed capability key is added in a later env-contract slice.
- Scientific proposal validation, corrected disposition, and derived exit selection are not implemented. The whole scientific kind fails closed before repository access.
- Plan B leaves the live product Cycle row unsynchronized; product-row synchronization and legacy `/complete` removal belong to C-cutover.
- The existing Pack A PI outbox schema requires non-null branch/revision mirror fields. For the Cycle-wide close event the adapter stores explicit Cycle-closure mirror values rather than selecting an arbitrary branch. A later outbox schema revision may make Cycle-wide fields first-class.
- Service/repository invariant checks protect this slice without relying on the unapplied CHECK-hardening migration, but real Prisma closure/outbox behavior still needs the planned disposable PostgreSQL lane.
- The one-method seal prevents all ordinary service entry writes and is wired in production composition. A future database-level concurrency test should keep proving that simultaneous closure versus admission/head/materialization/Attempt transactions cannot leave a post-closure writer commit.
- Sidecar rebuild/materialization is intentionally absent; only its legacy generic write authority is closed in this step.
