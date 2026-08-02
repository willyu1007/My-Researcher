# 04 Verification

## Planning-package verification — 2026-07-30

- `node .ai/scripts/lint-docs.mjs --path dev-docs/active/experiment-foundation-audit-remainders-closure --strict` → passed, 7/7 files, 0 errors and 0 warnings.
- `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main` → registered T-134 and regenerated dashboard, feature map and task index.
- Registry semantic mapping → `M-001 > F-001 > R-012 > T-134`, status `planned`, updated `2026-07-30`.
- `node .ai/scripts/ctl-project-governance.mjs lint --check --project main` → passed with two unrelated pre-existing task-state-format warnings for T-124/T-133 documentation.
- T-132 cross-check → authoritative scope freeze removes desktop UI and transfers EF-P06/P14/P15/semantic EF-P21 to T-134.
- `git diff --check` → passed.

## Phase 0 census/freeze verification — 2026-08-02

- `node .ai/scripts/ctl-project-governance.mjs resume --task T-134 --json` → recovered T-134 as `planned` with Phase 0 as the next action before any implementation-file read.
- Source census covered the four findings' shared contracts, routes/controllers, services, repository interfaces/Prisma implementations, Prisma models, capability composition and named unit/API/relational tests.
- EF-P14 evidence → current service admits null target binding; upstream bridge service/repository already creates and attaches a complete ref pair; existing bootstrap repository is atomic and race-idempotent.
- EF-P06 evidence → cutover guard closes the generic promotion mutation; v2 canonical asset and admitted-cell materialization writers exist; no typed preparation Candidate/promotion model or product route exists.
- EF-P15 evidence → `RunV2`, TaskSpec, Attempt and Result schemas are non-null PI-bound; legacy rows are ineligible; only the existing Evidence Trust Gateway writes REU/trace/outbox.
- EF-P21 evidence → structured lineage queries include `implementationProjectId` before cross-domain resolution; only literature owns current vector storage; PI has no semantic writer/index.
- `06-phase0-census-and-freeze.md` records runnable phase-specific unit/API/disposable-PostgreSQL/context/governance evidence and rollback requirements.
- `node .ai/scripts/lint-docs.mjs --path dev-docs/active/experiment-foundation-audit-remainders-closure --strict` → passed, 8/8 files, 0 errors and 0 warnings.
- `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main` → updated T-134 and regenerated registry/dashboard/feature map/task index.
- `node .ai/scripts/ctl-project-governance.mjs lint --check --project main` → passed with only the two unrelated pre-existing T-124/T-133 state-format warnings.

At Phase 0 close, implementation, runtime, database and cloud verification had not started; all implementation effects were zero.

## Phase 1 EF-P14 verification — 2026-08-02

- `pnpm run typecheck` from `apps/backend` → passed after Prisma client generation; `tsc -p tsconfig.json --noEmit` reported zero errors.
- `TS_NODE_TRANSPILE_ONLY=true node --test --loader ts-node/esm src/services/paper-implementation-intake-bootstrap-service.unit.test.ts` → 18/18 passed. Covers bound creation/replay, repository race result, inactive/source/hash failures, unbound zero-write, both half-pairs, handoff/bridge drift, cross-title-card, wrong ref type, stale binding hash, legacy-null replay/read classification and feedback regressions.
- `TS_NODE_TRANSPILE_ONLY=true node --test --loader ts-node/esm src/routes/paper-implementation-routes.integration.test.ts` → 7/7 passed. Covers the stable `409 GATE_CONSTRAINT_FAILED` / `PAPER_PROJECT_BINDING_REQUIRED` HTTP envelope and zero project writes plus the existing PaperImplementation route flows.
- `TS_NODE_TRANSPILE_ONLY=true node --test --loader ts-node/esm src/services/paper-implementation-contract-evaluation-suite.unit.test.ts` → 5/5 passed.
- `TS_NODE_TRANSPILE_ONLY=true node --test --loader ts-node/esm src/repositories/prisma/prisma-paper-implementation-repository.unit.test.ts` → 2/2 passed; same-hash race converges and changed-hash race conflicts.
- `TS_NODE_TRANSPILE_ONLY=true node --test --loader ts-node/esm src/services/topic-selection-v1c-paper-project-bridge-service.unit.test.ts` → 12/12 passed; confirms upstream intake creates and atomically attaches the exact paired refs, replays once and rolls back on attachment conflict.
- The direct ts-node typechecking loader fails anonymously under local Node `v26.5.0`; tests therefore use transpile-only while the separate successful backend TypeScript check remains the type authority.
- No database suite was required or run: Phase 1 changes only pre-repository service admission, and the existing Prisma transaction/schema were unchanged. Zero-write rejection is asserted against the repository boundary; durable race behavior is covered by the unchanged Prisma repository unit suite.
- `node .ai/scripts/lint-docs.mjs --path dev-docs/active/experiment-foundation-audit-remainders-closure --strict` → passed, 8/8 files, 0 errors and 0 warnings.
- `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main` → passed with no generated-view change required; T-134 remains `in-progress`.
- `node .ai/scripts/ctl-project-governance.mjs lint --check --project main` → passed with only the two unrelated pre-existing T-124/T-133 state-format warnings.
- `git diff --check` → passed.

Phase 1 is complete. EF-P14 is verified at service, HTTP, contract-regression and repository-race layers without schema/data/runtime effects.

## Phase 2 EF-P06 verification — 2026-08-02

- Shared contract/hash: `TS_NODE_TRANSPILE_ONLY=true node --test --loader ts-node/esm src/research-lifecycle/experiment-foundation-promotion-v2-contracts.schema.test.ts` from `packages/shared` → 2/2 passed. The closed command rejects caller Candidate/canonical/hash/result/TaskSpec/outbox fields; command bytes, hashes and server ids are deterministic and drift-sensitive.
- Service/API/cutover: targeted promotion service, promotion route and cutover-guard suites → 22/22 passed. Coverage includes approve, reject/no-canonical, exact replay, new-key exact replay, same-key drift, injected crash rollback, concurrent convergence, exact canonical reuse, illegal service-boundary targets, default-off, committed-cutover composition and the still-closed legacy promotion route.
- Existing spine regression: `experiment-v2-integration-spine.unit.test.ts` → 35/35 passed. Admitted exact cells still materialize one VersionLock/Recipe, exact TaskSpecs and one Run through the existing consumer; promotion acquired no TaskSpec/Run authority.
- Durable UoW: final nonce-bound disposable PostgreSQL `d19_1d5fd15b61e7` applied the full migration history including `20260802150000_add_experiment_foundation_promotion_v2`; the promotion relational test passed with skip=0 after stored Candidate/decision/outbox hash-integrity checks were active. Injected crash produced zero Candidate/decision/canonical/receipt/outbox rows; recovery produced exact-one; concurrent two-key promote produced one decision/canonical/Candidate/outbox plus two receipts and one replay; reject produced no canonical revision. The earlier successful `d19_94221898002a` run independently counted 3 terminal decisions. Both containers were removed.
- Initial disposable attempt on `postgres:16-alpine` failed before EF-P06 at the historical pgvector migration and was cleaned up; the successful run used the repository-pinned pgvector digest. Initial direct/boolean advisory-lock projections failed Prisma void/result handling; the scalar-subquery form passed. Both resolved failures are recorded in `05-pitfalls.md`.
- Prisma: `prisma format` passed; `prisma validate` passed with a non-connecting placeholder URL; backend Prisma generation/typecheck passed. No named-local/staging/production migration was applied.
- TypeScript: `pnpm run typecheck` passed independently in both `packages/shared` and `apps/backend`.
- OpenAPI: v2 path coverage and contract-drift tests → 2/2 passed; `ctl-openapi-quality` passed; `ctl-api-index generate --touch` regenerated a 201-endpoint index and `ctl-api-index verify --strict` passed.
- Environment/DB context: env contract validation/generation passed; `node .ai/tests/run.mjs --suite environment` passed; `ctl-db-ssot sync-to-context` regenerated the DB contract; `node .ai/tests/run.mjs --suite database` passed.
- Capability/runtime/data effects: `EXPERIMENT_FOUNDATION_V2_PROMOTION_ENABLED` remains default false; no flag was enabled, no legacy writer was reopened, no named data was changed, and no cloud/provider/UI action occurred.

Phase 2 is complete. EF-P06 is verified at shared contract/hash, service, HTTP/cutover, existing-spine regression and disposable-PostgreSQL atomicity/concurrency layers.

## Phase 2 quality hardening verification — 2026-08-02

- TypeScript: `pnpm --filter @paper-engineering-assistant/shared run typecheck` and `pnpm --filter @paper-engineering-assistant/backend run typecheck` passed independently.
- Promotion service/route, integration relay and cutover guard targeted suites → 28/28 passed. Coverage includes runtime non-string request rejection, all five typed asset families, durable audit acknowledgement, a second idle drain and explicit zero PI/EF/evidence downstream state.
- Shared promotion schema/hash tests → 2/2 passed; existing experiment integration spine regression → 35/35 passed.
- Final nonce-bound disposable PostgreSQL `d19_23dbabade313` used the repository-pinned pgvector image, applied the full migration history and passed the promotion relational test 1/1 with skip=0. The test proved eight promotion outboxes delivered, all five typed families and fail-closed canonical, decision-command and outbox cross-binding corruption. The container was removed.
- An earlier disposable run `d19_b6fbc609ada1` reached the relational test and exposed only an over-specific error-message assertion; the assertion was corrected to the stable integrity outcome and that container was also removed.
- `ctl-api-index verify --strict` passed with the API unchanged; `git diff --check` passed.
- Capability/runtime/data effects remain zero: the promotion flag is still default false, and no named-local/staging/production database, cloud/provider resource or UI surface was changed.

## Phase 3 authorization verification — 2026-08-02

- `node .ai/scripts/ctl-project-governance.mjs resume --task T-134 --json` → resolved the request to existing in-progress T-134 at `M-001 > F-001 > R-012`; no duplicate task or mapping change is required.
- Rechecked the Phase 0 EF-P15 census against current v2 admission contracts/service: all typed Run/TaskSpec/Attempt/result paths remain non-null PI-bound, while the existing admission command already owns exact project/Cycle/branch/revision/cell-plan authority and its atomic outbox.
- Architecture decision → P15-03 option 1 authorized; option 2 standalone execution/result lineage rejected. Product code, Prisma schema, migration, generated context, runtime flags, databases and external systems remain unchanged by this authorization step.
- Implementation verification remains pending and must include closed shared/API schemas, service zero-write negatives, existing spine/trust regressions and a nonce-bound disposable-PostgreSQL atomicity/concurrency test with skip=0.

## Phase 3A EF-P15 exploration-specification verification — 2026-08-02

- TypeScript: `pnpm typecheck` in both `packages/shared` and `apps/backend` passed; backend verification regenerated Prisma Client first.
- Shared schema/hash: targeted exploration-spec contract suite passed 2/2. The suite proves closed immutable authoring input plus deterministic, drift-sensitive content/command hashes and ids.
- Service/API: targeted service and route suites passed 7/7. Coverage includes default-off, create, same-key and different-key exact replay, changed-content revision/CAS, injected crash rollback, semantic duplicate rejection, closed schemas and nested execution/result authority rejection.
- Cutover: `experiment-v2-cutover-guard.integration.test.ts` passed 12/12, including exploration flag without committed cutover, valid truth-table states, blank/unset defaults and strict boolean parsing.
- Disposable PostgreSQL: the final nonce-bound pgvector run applied the complete migration history, then the relational exploration suite passed 1/1 with skip=0. The suite proves crash rollback, recovery, concurrent different-key convergence to one revision/two receipts, revision 2 CAS, stale changed-content conflict and both valid-shape and malformed durable JSON tamper rejection. The container was removed.
- Prisma drift: the first replay detected a Phase 2 promotion receipt foreign-key naming mismatch caused by PostgreSQL's identifier limit. After shortening/pinning both promotion relation names, the second full-history `ci:prisma-drift` run passed with no diff. Both disposable containers were removed.
- Prisma/schema: `prisma format`, non-connecting-placeholder `prisma validate`, client generation and backend typecheck passed. `ctl-db-ssot sync-to-context` regenerated the DB contract.
- Environment: env-contract validation/generation passed, `node .ai/tests/run.mjs --suite environment` passed, and generated `.env.example`, env docs/context remain secret-free and default false.
- API: strict OpenAPI quality passed; API index generation/touch produced 202 endpoints; strict index verification passed.
- Capability/runtime/data effects: the exploration-spec flag remains false; no named-local/staging/production migration, external provider/cloud action, UI change, PI attachment/admission, execution or evidence write occurred.

Phase 3A is complete and is a verified rollback point. EF-P15 as a whole remains open pending Phase 3B atomic PI attachment/admission and Phase 3C trust/bypass verification.

## Phase 3B EF-P15 atomic attachment verification — 2026-08-02

- TypeScript: shared and backend typechecks passed independently; Prisma Client generation and placeholder-URL schema validation passed.
- Shared/service/API: attachment schema/hash 2/2, orchestration/admission 4/4 and route 2/2 passed. Coverage includes closed input, default-off before reads, first commit, same/different-key replay, readiness-drift replay, drift zero-write, injected crash rollback and cross-branch conflict.
- Cutover/env: attachment requires both committed cutover and PI admission; strict boolean parsing/default-off coverage passed. Env SSOT validation/generation and `node .ai/tests/run.mjs --suite environment` passed without secrets.
- Disposable PostgreSQL final run: nonce-bound database `d19_e92361364987` on the pinned pgvector digest applied full migration history; relational test passed 1/1 with skip=0; crash after attachment insert rolled back branch/revision/cells/admission/outbox/attachment/receipt; concurrent different keys converged to one authority bundle/two receipts; different-key replay added only a third receipt; durable attachment tamper failed closed. Container removal passed.
- Drift/context/API: actual disposable database to Prisma SSOT diff passed with zero changes; DB context regenerated; OpenAPI quality and API-index freshness passed with 203 endpoints; `git diff --check` passed.
- Effects: no named-local/staging/production database, cloud/provider, capability enablement, UI, TaskSpec, Run, result, validation, EvidenceCandidate, REU or trace write occurred.

Phase 3B is complete and is a verified rollback point. EF-P15 remains open only for Phase 3C downstream materialization/trust and bypass verification.

## Phase 3B quality-hardening verification — 2026-08-02

- Backend TypeScript: `pnpm --filter @paper-engineering-assistant/backend run typecheck` passed after Prisma Client generation. An initial run exposed two unused test-helper parameters; the helper was corrected to enforce the exact expected project/Cycle ids and the final run reported zero errors.
- Service plus existing integration-spine regression: targeted node tests passed 40/40. Coverage includes known readiness-domain normalization, raw infrastructure-error propagation with zero admission writes and the unchanged 35-test PI/EF integration spine.
- HTTP boundary: attachment service/route tests passed 8/8; an unknown service error now reaches the controller's `500 INTERNAL_ERROR` response path while the existing closed-input, commit and replay behaviors remain green.
- Disposable PostgreSQL: the final nonce-bound pgvector run applied all 74 migrations and passed the attachment relational suite 1/1 with skip=0. A scope read followed by project archival or Cycle completion is rejected by the transaction-internal row-lock fence, and each race leaves branch/revision/admission/outbox/attachment/receipt counts at zero. Existing crash rollback, concurrent replay convergence, exact receipt counts and durable tamper rejection also remained green.
- Disposable container cleanup passed; no named-local/staging/production database was touched.
- Dev-doc strict lint initially found one vague-reference warning introduced in the new pitfall note; the wording was made explicit and the final run passed 28/28 files with zero errors and zero warnings.
- Project governance lint passed with only the two unrelated pre-existing T-124/T-133 state-format warnings.
- `git diff --check` passed after the code and test changes.

The two Phase 3B review findings are resolved. Phase 3C remains the next authorized implementation slice.

## Phase 3C EF-P15 trust/bypass verification — 2026-08-02

- Backend TypeScript: `pnpm --filter @paper-engineering-assistant/backend typecheck` passed after Prisma Client generation; `git diff --check` passed.
- Targeted composition/negative suites: attachment orchestration, materialization, execution, scientific validation, Evidence Trust Gateway and existing integration spine ran with the Node 26 transpile-only loader after the independent typecheck → 97/97 executable tests passed; 5 disposable-only tests skipped by their default flags.
- The targeted suites cover cross-project/different-branch attachment conflict, readiness/scope drift, injected rollback, incomplete scientific batches, simulation/fake provenance, caller-owned result authority, manifest drift, absent head acknowledgement, Candidate/report/hash/protocol drift, superseded/head-advanced/closed authority, gateway rollback and duplicate convergence.
- Final nonce-bound disposable PostgreSQL run used the repository-pinned pgvector digest, applied the complete migration history and ran `T-134 Phase 3C trusts only a newly materialized PI Run from an exploration attachment` with skip=0 → 1/1 passed in 3.7 seconds. The container was removed.
- Positive relational assertions: durable spec plus attachment creates zero TaskSpec/Run/REU before relay; ordinary relay creates exactly the attached revision's two TaskSpecs and one Run; caller-substituted Attempt id creates zero results; exact real-provider fixture results create one passed report/Candidate but zero PI evidence before gateway; the existing gateway then creates exactly one inbox/REU/trace/registration outbox bound to the attachment project, branch, revision, Run and manifest.
- Simulation relational assertions: a second attached Run starts through the production workflow-simulation service; even after its fixture Attempt reaches `succeeded`, scientific result intake rejects its simulation provenance and leaves result/report/Candidate/REU counts at zero.
- The repository Pack C-PI gate was attempted twice but its hermetic child environment invokes the Node 26 `ts-node/esm` typechecking loader without the documented transpile-only workaround, so all TypeScript suites failed before test execution. Static census passed. This is a gate-runner/runtime compatibility limitation, not a Phase 3C assertion failure; type safety and runtime evidence are supplied separately by the successful `tsc --noEmit`, targeted suites and nonce-bound relational run.
- Effects remain zero outside disposable verification: no named database, runtime capability, provider/cloud resource, UI, production code, schema, migration or trust writer changed.

Phase 3 is complete. EF-P15 is closed under P15-03 option 1; T-134 remains in progress for Phase 4 EF-P21.
