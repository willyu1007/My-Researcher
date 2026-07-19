# Pack C C-EF step 6 implementation report

## Outcome

The forced disposable-PostgreSQL relational lane and the checked-in `packc-ef` machine gate are implemented. The sandbox gate correctly returned exit 2 / `blocked` because Docker/PostgreSQL is unavailable and did not publish a false pass. The real-PostgreSQL closure remains a host action.

No Prisma schema/migration, env contract, `app.ts`, or committed Pack C service/repository product code changed. The only shared support change adds the `packc` nonce/marker namespace to the existing disposable database identity guard.

## Files changed

- `.ai/scripts/experiment-foundation-packc-ef-gate.mjs`
- `.ai/scripts/experiment-foundation-packc-ef-gate.unit.test.mjs`
- `apps/backend/src/repositories/prisma/prisma-experiment-foundation-scientific-validation-v2-relational.integration.test.ts`
- `apps/backend/src/test-support/disposable-postgres-test-database.ts`
- `apps/backend/src/test-support/disposable-postgres-test-database.unit.test.ts`
- `dev-docs/active/experiment-foundation-productization-closure/00-overview.md`
- `dev-docs/active/experiment-foundation-productization-closure/01-plan.md`
- `dev-docs/active/experiment-foundation-productization-closure/03-implementation-notes.md`
- `dev-docs/active/experiment-foundation-productization-closure/04-verification.md`
- `dev-docs/active/experiment-foundation-productization-closure/artifacts/implementation/06-pack-c-ef-technical-closure.md`
- `dev-docs/active/experiment-foundation-productization-closure/artifacts/implementation/report.md`

The five user-identified unrelated dirty files were not modified by this work.

## Gate registry mapping

| Check | Evidence |
|---|---|
| PC01 | `engine_unit`: unsupported rule produces blocking `UNSUPPORTED_RULE` semantics |
| PC02 | `engine_unit`: deterministic frozen validator profile and final support recheck |
| PC03 | `engine_unit` + `service_unit`: missing/failed subject completeness cannot pass or mint evidence |
| PC04 | `engine_unit` + `service_unit`: ordered `metric_contract@v1` and `artifact_contract@v1` fixtures |
| PC05 | `static_census` + `schema_unit`: exact three-kind service closure set, generic guards, closed collector, no route repository writes, no request-contract `accept_partial` |
| PC06 | `relational`: unique/FK/CHECK fences, passed transaction, injected outbox rollback, failed/unsupported report-only outcomes |
| PC07 | `service_unit` + `relational`: simulation/fake envelope rejection plus SQL provenance CHECK |
| PC19-EF | `legacy_writer_unit`: generic create/upsert, collectJob and PI live-collect closure below HTTP |

## Relational lane design

The lane builds the existing typed D-19 asset fixture, admits and materializes one exact two-cell Run, commits the durable `BranchHeadAdvanced` acknowledgement, and uses the production Prisma scientific repository/service. Because the frozen Pack B migration is intentionally simulation-only until M7, the test widens only the two Attempt mode/provenance CHECKs inside the nonce-bound disposable database. The fixture does not modify migration or schema source. Pack C result/report/Candidate CHECKs are exercised unchanged.

Passed atomicity uses the production Prisma transaction. Outbox rollback is injected with a disposable PostgreSQL trigger. Unsupported final-validation support drift is injected through the existing repository port; the service still builds and persists the report through the production Prisma repository, and no Candidate/outbox is written.

## Host run instructions

From `/Volumes/DataDisk/Project/My-Researcher` run:

```bash
node .ai/scripts/experiment-foundation-packc-ef-gate.mjs --run-id packc-ef-20260720-r2
```

The command above is the authoritative one-command run. The gate starts the reviewed digest-pinned PostgreSQL container, writes/verifies the nonce-bound marker, applies all migrations including `20260718224543` and `20260719120000`, injects the direct relational command environment, forces the lane, rejects any skip, writes the machine summary, and removes the container.

The direct inner lane command, for debugging only after the same marker/migrations and all six identity variables have been supplied, is:

```bash
cd apps/backend
pnpm exec node --test --loader ts-node/esm src/repositories/prisma/prisma-experiment-foundation-scientific-validation-v2-relational.integration.test.ts
```

The direct lane requires `EXPERIMENT_FOUNDATION_SCIENTIFIC_VALIDATION_V2_RELATIONAL_PRISMA=1`, exact matching `DATABASE_URL` / `EXPERIMENT_V2_TEST_DATABASE_URL` / `EXPERIMENT_FOUNDATION_PACKC_DATABASE_URL`, `EXPERIMENT_V2_TEST_DATABASE_NAME=packc_<nonce-prefix>`, and matching generic/Pack-C 64-hex nonce variables. Prefer the gate so these values cannot drift.

## Verification totals

| Verification | Result |
|---|---|
| backend strict typecheck | passed |
| gate meta test | 6/6 passed |
| engine unit suite | 9/9 passed |
| scientific service suite | 13/13 passed |
| shared scientific schema suite | 12/12 passed |
| legacy service-layer closure suites | 34/34 passed |
| disposable identity/guard suite | 7/7 passed |
| sandbox gate `packc-ef-20260720-r1` | `blocked`; 68/68 runnable checks passed, 0 failed, 0 skipped; PC06/PC07 blocked |
| sandbox canonical summary SHA-256 | `sha256:efa5c836e7942c8eb0df1f352619feebe1c1d1fcadb9a1840f9a6ae4636a7750` |
| real PostgreSQL relational suite | PENDING host; required 4/4 passed, 0 skipped |

## Unresolved risks

- PC06 and the relational half of PC07 are not accepted until the host gate exits 0 with four relational tests and zero skips.
- The synthetic real-provider Attempt is test-only. Product real-provider Attempt production remains M7/out of scope; the Pack B source schema stays simulation-only.
- The sandbox summary is ephemeral under `.ai/.tmp`; the host owner must fill the checked-in closure skeleton with the final gate id, totals and SHA-256.
- C-PI, C-cutover, provider execution, capability enablement, existing-environment migration apply and non-local rollout remain out of scope.
