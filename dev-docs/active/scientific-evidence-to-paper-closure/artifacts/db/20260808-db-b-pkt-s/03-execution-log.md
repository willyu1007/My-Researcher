# T-136 DB-B / PKT-S execution log

## Repo and disposable-database execution

- `pnpm exec prisma format --schema prisma/schema.prisma`: completed.
- `pnpm exec prisma validate --schema prisma/schema.prisma`: passed.
- `pnpm ci:prisma-drift -- --shadow-url postgresql://yurui@127.0.0.1:5432/t136_db_b_pkt_s_shadow_20260808_01 ...`: passed with an empty migration after an initial role-less URL failed P1010 before schema work. Shadow database cleanup was verified.
- `node .ai/tests/run.mjs --suite database`: passed.
- `pnpm ci:prisma-smoke`: Prisma generation passed; migration deploy failed at the pre-existing pgvector historical migration because the randomized schema could not resolve the `public.vector` type. The harness cleaned up the randomized schema.
- `pnpm exec prisma migrate deploy` against `t136_db_b_pkt_s_verify_20260808_01`: passed; all 76 migrations applied.
- `pnpm exec prisma migrate status` against the same disposable database: passed; schema up to date.
- Transactional SQL assertion suite: passed and rolled back. It exercised closed Output tuples; Result legacy/v2 completeness, exact source/Collection FKs and ownership uniqueness; and Packet legacy/v2 completeness, exact Closure FK and ownership uniqueness.
- `pnpm typecheck` under Node `20.19.6`: initial run exposed the Packet repository create-input mismatch caused by the new optional relation. The mapper was changed to the explicit unchecked scalar create type; the rerun passed for shared, backend and desktop.
- Targeted Packet repository test under Node `20.19.6`: 2/2 passed.
- `pnpm lint`: exited 0, but the repository script is currently only the placeholder `echo "Add lint script"`; this is not substantive lint evidence.
- Context SSOT sync and strict context verification: passed.
- Disposable verification database dropped; a `pg_database` lookup returned `0` remaining matches.

## Non-green full-suite evidence

- A Node 26 backend run failed in the `ts-node/esm` loader before useful test execution; Node 20 is the repository-compatible lane.
- The first Node 20 full backend run completed 2348 tests: 2277 passed, 49 skipped and 22 failed. The tail-only capture did not retain the failure blocks, so those failures are not classified or waived.
- A diagnostic rerun filtered for failure blocks but saturated the existing high-concurrency TypeScript loader fleet. After more than ten minutes it had narrowed to two CPU-bound existing route/workflow files with no PostgreSQL lock wait; it was stopped with exit 130 under the announced bounded window.
- Therefore the full backend suite is explicitly not green. The DB-B/PKT-S implementation verdict relies only on the independently attributable migration, drift, SQL assertion, typecheck, context and targeted repository gates above. A controlled-concurrency full-suite rerun remains follow-up evidence before integration release.

## Protected targets

- Named local product database: not migrated.
- Capability flags: unchanged/default-off.
- Cloud/provider operations: none.
- Credentials: none read or changed.
