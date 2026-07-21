# Pack C C-PI step 6 implementation report

## Outcome

The `packc-pi` machine gate, its exact meta contract and the forced disposable-PostgreSQL relational lane are implemented. All sandbox-runnable evidence passes; the end-to-end gate correctly reports `blocked` without Docker/PostgreSQL. Host execution is the only remaining step for C-PI technical closure.

## Files changed

- `.ai/scripts/experiment-foundation-packc-pi-gate.mjs`
- `.ai/scripts/experiment-foundation-packc-pi-gate.unit.test.mjs`
- `apps/backend/src/repositories/prisma/prisma-paper-implementation-evidence-closure-v2-relational.integration.test.ts`
- `apps/backend/src/test-support/disposable-postgres-test-database.ts`
- `apps/backend/src/test-support/disposable-postgres-test-database.unit.test.ts`
- `dev-docs/active/experiment-foundation-productization-closure/00-overview.md`
- `dev-docs/active/experiment-foundation-productization-closure/01-plan.md`
- `dev-docs/active/experiment-foundation-productization-closure/03-implementation-notes.md`
- `dev-docs/active/experiment-foundation-productization-closure/04-verification.md`
- `dev-docs/active/experiment-foundation-productization-closure/artifacts/implementation/07-pack-c-pi-technical-closure.md`
- `dev-docs/active/experiment-foundation-productization-closure/artifacts/implementation/report.md`

No service under test, Prisma schema/migration, env contract, capability value, named-local database or provider surface was modified. The five pre-existing unrelated dirty files were not touched by the C-PI gate work.

## PC evidence mapping

| Check | Evidence | Sandbox status |
|---|---|---|
| PC08 | gateway unit + two shared schema suites | passed |
| PC09 | gateway unit + relational atomicity/replay/tamper | blocked on PostgreSQL |
| PC10-PC13 | evaluator + closure units + relational membership/no-head/active-real/drift | blocked on PostgreSQL |
| PC14 | closure unit + schema caller-authority negatives | passed |
| PC15 | closure unit + relational no-evidence closure | blocked on PostgreSQL |
| PC16 | seal unit + relational seals + four-service composition census | blocked on PostgreSQL; unit/static portions passed |
| PC17 | no v2 Packet writer + sole closure-event producer census | `deferred_to_cutover` |
| PC19-PI | Sidecar closure tests + four-kind 5a guard census | passed |
| PC20 | evaluator determinism + zero-write census | passed |

PC17 does not claim legacy Packet/dossier removal. That removal remains C-cutover scope.

## Verification totals

| Command/evidence | Result |
|---|---|
| backend strict TypeScript | passed |
| gate meta suite | 7/7 passed |
| six gate-wired unit families, direct | 121/121 passed; 0 skipped |
| disposable identity suite | 8/8 passed |
| sandbox end-to-end gate `packc-pi-20260721-r1` | exit 2; `blocked` as required |
| sandbox canonical summary | `sha256:cc169aeddc81d85df4378a2a0d823e288beca454f50d2dff0e70b22579c1bfd9` |
| forced relational lane | not executed; Docker daemon unavailable |
| repository diff check | passed |
| whole-bundle strict docs lint | 0 errors; 12 historical warnings; no new-file warning |

## Host run command

From `/Volumes/DataDisk/Project/My-Researcher`:

```sh
node .ai/scripts/experiment-foundation-packc-pi-gate.mjs --run-id packc-pi-20260721-r2
```

The host result must be exit 0, execute all three relational tests with zero skips, verify the `packc-pi` nonce marker, apply full migration history, report both C-PI migrations applied in the disposable database, preserve `20260720141000` as named-local informational/unapplied, and clean up the container.

## Risks and handoff

- The relational test compiles but has not run against PostgreSQL in the sandbox; host failures must be treated as gate failures, not converted to passes.
- EF validation report/Candidate rows are direct fixtures because Pack B cannot produce real-provider EF rows before M7. The production gateway and every PI write still use real Prisma composition.
- The optional closure lookup remains fail-open by default for compatibility. PC16 therefore depends on the exact `app.ts` four-service composition census; any missing wire fails the gate.
- PC17 is intentionally incomplete until C-cutover removes legacy Packet/dossier paths.
- Migration `20260720141000_harden_paper_implementation_pack_c_closure_v2` remains unapplied to named-local PostgreSQL; the disposable gate neither authorizes nor performs that apply.
