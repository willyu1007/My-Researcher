# T-136 DB-B / PKT-S post-verification

## Disposable database result

- `prisma migrate deploy`: all 76 repository migrations applied; database reported up to date.
- New columns: 12/12 present and physically nullable, matching the compatibility design.
- Named DB objects: 6 new/updated contract or FK constraints and 5 exact/ownership unique indexes verified; the Result schema-version fence was also updated to admit only v1/v2.
- Transactional relational assertions: passed, then rolled back. Covered closed Output tuples, Result v1/v2 completeness, canonical hash checks, exact source and same-Attempt Collection FKs, unique source/Collection ownership, Packet legacy/v2 completeness, exact Closure binding and unique Closure ownership.
- `node .ai/tests/run.mjs --suite database`: passed.
- Prisma drift check: passed with zero drift.
- DB context refresh: passed; `docs/context/db/schema.json` and registry checksum were regenerated from the Prisma SSOT.
- Workspace typecheck: passed under Node 20 after the legacy Packet mapper was made explicit about unchecked scalar creation.
- Targeted Packet Prisma repository tests: 2/2 passed.

## Known harness boundary

The schema-based `ci:prisma-smoke` lane failed before the T-136 migration at historical migration `20260605104000_add_literature_pgvector_phase1`: a randomized schema search path could not resolve the `vector` type installed in `public`. Fresh disposable-database deployment succeeded through the same history and the T-136 migration. This is retained as a harness limitation, not counted as a migration pass.

The full backend suite is also not claimed green: its first Node 20 run reported 22 failures among 2348 tests, and a diagnostic high-concurrency rerun was stopped after loader CPU saturation. See `03-execution-log.md`. This does not overwrite the green targeted gates and must be resolved with a controlled-concurrency run before integration release.

## Named-local status

Not applied. Recovery evidence and explicit deployment approval remain pending.
