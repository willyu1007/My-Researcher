# Formal PI scope → Pack B product execution closure

## Outcome

- Status: `passed`
- Target: named loopback local development PostgreSQL `postgres/my_researcher_dev`
- Target fingerprint: `sha256:8851b255b079ad1f049dc1842c41cb3516d5a3ff0b69e21a30e8f2675409cca0`
- Source PaperProject: `P313`
- Exact Pack A Run: `ef_run_v2_c4ab7919-2d7b-415c-ab53-201b11464aca`
- Run manifest: `sha256:8965ebdfd39f899a56ff242aedc968c0b29dd8048a2cecba1ac3ecdb9342d915`
- Final workflow projection: `workflow_simulation_passed`
- Scientific execution status: `not_started`
- Evidence eligibility: `false`

## Authorized execution

`run-experiment-foundation-packb-product-landing.ts` locked the named-local database fingerprint and the final read-only Pack A product evidence before E1. It required committed cutover, disabled Pack A admission, Prisma PI/EF composition, disabled background scheduling, the exact processed head acknowledgement and a live exact-readiness revalidation.

The gitignored local simulation flag was compiled through `env-localctl` from `false` to `true` for one intake window. The normal product HTTP route admitted the fixed business key `packb-product-p313-two-cell-v1`; the production Prisma repository and provider-command worker then drained E1-E5 through the deterministic fake Aliyun PAI DLC adapter. The flag was immediately compiled back to `false` before the independent verifier ran.

## Exact durable state

| Family | Rows |
|---|---:|
| ProviderPayloadV2 | 2 |
| ExecutionAttemptV2 | 2 |
| ExecutionAttemptEventV2 | 12 |
| ProviderCommandV2 | 8 |
| CollectionAttemptV2 | 2 |
| ProvisionalOutputV2 | 2 |

Each exact RunCell has one `succeeded` simulation Attempt, immutable event sequence `1..6`, succeeded command sequence `submit → sync → reconcile → collect`, one `collected` CollectionAttempt and one `diagnostic_only` ProvisionalOutput. Both cells are terminal and collected; no scientific status or evidence authority was created.

## Prohibited effects

- Deterministic fake transport operations: 8
- External fetches: 0
- Real network/provider requests: 0
- CreateJob calls: 0
- PI writes: 0
- Pack A authority writes: 0
- Legacy writes: 0
- Scientific result/validation/evidence writes: 0
- Foreign Pack B Run or business-key lineage: 0
- Active real Attempts in the ValidationCycle: 0

The apply runner compared 55 protected table digests before/after. The later read-only verifier broadened the census to all `PaperImplementation*` authority tables, the exact product source tables, all Pack A tables, legacy sentinels and scientific sentinels: 88 protected tables, `changed_tables=[]`.

## Evidence

- Apply: `02-product-execution-apply.json`
  - run id: `formal-pi-scope-packb-product-20260715-apply-r1`
  - SHA-256: `2176c0ce7cbd0d83e41d9e133bda2d748c823e40b8e6e70883cc246a3e5beee8`
- Final read-only verify: `04-product-execution-verify.json`
  - run id: `formal-pi-scope-packb-product-20260715-verify-r2`
  - SHA-256: `7cc6044bc3822e4197f99638b09b7a4f9e90640bb205cde929f98df2b998e9c7`
- Environment evidence: `00-prereq-check.md`, `01-simulation-window-config.md`, `03-post-execution-config.md`, `06-post-closure-doctor.md`

Final named-local configuration is cutover `true`, Pack A admission `false`, Pack B simulation `false`, and auto-pull scheduler `false`.

## Regression evidence

- shared typecheck: passed
- Pack B shared contract tests: 6/6 passed
- backend Pack B repository/route/service/scheduler/worker targeted tests: 67/67 passed
- experiment-foundation scripts typecheck: passed
- backend full typecheck: passed
- Prisma schema validate with the named-local env loaded: passed
- T-132 strict docs lint: 58/58 passed
- T-124 strict docs lint: 13/13 passed
- project governance lint and scoped `git diff --check`: passed

The first bare Prisma validate invocation correctly returned `P1012` because `DATABASE_URL` was not loaded into that process; the same validation was rerun with the reviewed `.env.local` and passed. No schema or database mutation occurred in either invocation.

## Remaining boundary

This closes the authorized named-local Pack B product E1-E5 slice only. It does not authorize or prove a PI-persisted workflow projection, D-16/D-17/D-18 scientific validation and Cycle closure, real read-only cloud preflight, real provider execution, scientific result/evidence generation, UI/search, or any non-local rollout.
