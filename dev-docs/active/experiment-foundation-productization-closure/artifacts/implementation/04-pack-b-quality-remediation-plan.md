# Pack B quality-remediation execution lock

## Authorization and baseline

- Authorization: repair every finding from the 2026-07-14 Pack B quality review and perform deep cleanup.
- Git baseline: `main@f6680225d5134d4f67bd59f4c5dbecb4eb0c476d`.
- Dirty-population digest at start: `sha256:01806da794f76e681bad2d4ef5fc731b80a5f5d329d0f95cda7a273b50e8a2da` over `git status --short --untracked-files=all`.
- Database SSOT: `repo-prisma`; the applied `20260713210000_add_experiment_foundation_pack_b_provider_control_v2` migration and checksum are immutable.
- Rollback point: source files and migration hashes recorded below; no T-124 runtime/result/dossier/REU file is in the repair population.

## Dependency map

1. Gate layer
   - Files: Pack B simulation/local gates and their unit tests; new reusable app-smoke/evidence helpers.
   - Incoming: direct documented commands and T-132 verification records.
   - Outgoing: backend test runner, Prisma CLI, disposable PostgreSQL, sanitized durable artifacts.
   - Constraint: child processes receive an explicit environment allowlist; SQL inspection is statement-complete and case-insensitive/fail-closed.
2. HTTP/domain layer
   - Files: execution v2 shared contracts, routes/controller/service, worker, fake transport and tests.
   - Incoming: `apps/backend/src/app.ts` and shared package exports.
   - Outgoing: execution v2 repository interface and payload/hash services.
   - Constraint: response schemas are enforced; one exact reason-code map owns HTTP semantics; non-submit provider responses cannot change external identity.
3. Persistence layer
   - Files: execution v2 repository interface, in-memory/Prisma adapters, pure invariant module, Prisma schema and a new cleanup migration.
   - Incoming: execution service/worker and relational tests.
   - Outgoing: Pack A EF authority tables and six Pack B tables only.
   - Constraint: no Prisma import above repository adapters; no real-provider persistence in Pack B; immutable lineage uses `RESTRICT/NO ACTION`; applied migration is not edited.
4. Evidence/docs layer
   - Files: T-132 implementation/verification/pitfall records, DB artifacts and generated context.
   - Constraint: `.ai/.tmp` is explicitly ephemeral; durable JSON is emitted by checked-in producers with source digests.

## Starting hashes

- simulation gate: `sha256:9ea12eb50b1cbebda21591046b9f791e2ff96af7e01cddcf2a8174d793fa313d`
- local landing gate: `sha256:f092dfa245c166d35a612474c08ba91fa991cae99d612e7bf8eb613e36241e37`
- provider worker: `sha256:8c9edf9672cde69b73b9f831c402c23e601141ad5721614da6144ff1fef43d66`
- Prisma execution repository: `sha256:1e283b22e8647358684d62c6e8a5a0130685f668e5999f7df9cd99ca2bec9411`
- Prisma schema: `sha256:b9da7073fe971fb71cb12893e2542786671e8cb1f55c6a37a0c33a7705be159f`
- applied Pack B migration: `sha256:c0c49f0f7a268f09619f6c693a1f41955ce6cb1b36b656dd9c8e1d51abe0f70e`

## Verification checkpoints

1. Gate negative corpus and environment-isolation tests green.
2. HTTP/domain targeted tests and strict typecheck green.
3. Repository parity plus cleanup-migration disposable PostgreSQL tests green.
4. Full Pack B gate and complete shared/backend suites green.
5. Named-local cleanup migration preview/backup/apply/read-only post-verify green.
6. DB/API context, strict docs and governance lint green.

## Closure — 2026-07-14

- State: `completed` for the authorized quality-remediation scope.
- Final disposable run: `packb-quality-remediation-final-20260714-r7`, PB01-PB16 passed, shared/backend targeted 6/6 + 63/63 and relational 5/5 with zero skips.
- Final named-local run: `packb-quality-remediation-local-20260714-r5`, passed after verified backup and cleanup migration apply; 60/60 migrations, exact 15 FK/35 CHECK/38 index census, unchanged Pack A/legacy digests and zero Pack B rows.
- Cleanup migration SHA-256: `05ddb7fa653e76b66fc6c0c4747b3680e3815a44dc672b8a61042310911dd5b8`; original Pack B migration SHA-256 remains unchanged.
- No T-124 runtime/result/dossier/REU application file, non-local database, product traffic, real provider, scientific writer or D-18 closure entered this work.
- Final full suites passed: shared exit 0, 30 files, TAP `1..326`, 326/326 passed with 0 failed/skipped; backend exit 0, 193 files, top-level TAP `1..1988`, 2,005 tests, 1,961 passed, 0 failed, 44 expected skipped, 0 cancelled/todo, duration `376935.774042ms`.
- Durable outcome: `artifacts/implementation/05-pack-b-quality-remediation-closure.md`.
