# 05 Pitfalls — Do Not Repeat

## Scope split obscured by historical T-132 product framing — 2026-07-30

- Symptom: four open audit findings were described as parked while older T-132 text still said they had to be resolved before T-132 could finish.
- Root cause: a personal PAI completion override was added without moving residual productization ownership into a named task.
- What was tried: retaining the findings in T-132 as non-current queue items. This preserved history but left completion ownership ambiguous.
- Fix/workaround: create T-134, transfer EF-P06/P14/P15 and semantic EF-P21 explicitly, and state that T-134 does not block T-132.
- Prevention: every scope reduction must name the receiving task, update both tasks' completion definitions and synchronize the project registry.

## Do-not-repeat summary

- Do not reintroduce desktop UI to close any T-134 finding.
- Do not treat structured lineage plus an embedding score as a new truth or control authority.
- Do not repair legacy null bindings through silent backfill or trust upgrade.
- Do not attach standalone EF output by identity-only linkage; full project/readiness/validation revalidation is mandatory.
- Do not split promotion decision, canonicalization, Candidate and outbox into partial commits.
- Do not run the disposable full migration history on a plain PostgreSQL image; use the repository-pinned pgvector digest.
- Do not return PostgreSQL `void` directly through Prisma `$queryRaw`; wrap advisory-lock execution in a supported scalar result.

## Standalone attachment assumed a source authority that does not exist — 2026-08-02

- Symptom: the plan required attaching a standalone typed EF output, but the current v2 Run, TaskSpec, Attempt and Result schemas all require exact PI scope.
- Root cause: D-09 preserved an independent exploration concept while Pack A/C implemented only the PI-bound typed execution/scientific spine; legacy standalone rows are simultaneously barred by D-08.
- What was tried: inventorying legacy result/generic records and current v2 scientific ingress as potential sources. Legacy would create a forbidden trust migration, and v2 rows are already attached by construction.
- Fix/workaround: block Phase 3 implementation until a typed source model is approved. Prefer attaching an exploration specification and performing a new PI-bound execution; keep the prior output diagnostic-only.
- Prevention: before planning an attachment or migration command, prove that both source and destination have authoritative typed identities and that the source is eligible under legacy/cutover policy.

## Node 26 ts-node loader hid diagnostics in targeted tests — 2026-08-02

- Symptom: a direct `node --test --loader ts-node/esm` invocation failed at module load with an anonymous null-prototype object and no test cases.
- Root cause: the local Node `v26.5.0` and ts-node typechecking-loader path emitted an opaque loader failure even though the project TypeScript compiler passed.
- What was tried: rerunning with `TS_NODE_LOG_ERROR=true` exposed noisy, inconsistent loader diagnostics and allowed tests to execute, but did not provide a trustworthy type gate.
- Fix/workaround: run targeted tests with `TS_NODE_TRANSPILE_ONLY=true` and run `pnpm run typecheck` separately as the authoritative TypeScript check.
- Prevention: record both commands and outcomes; never treat transpile-only test execution as type verification.

## Disposable promotion gate used a PostgreSQL image without pgvector — 2026-08-02

- Symptom: the first nonce-bound disposable migration stopped at historical migration `20260605104000_add_literature_pgvector_phase1` before reaching EF-P06.
- Root cause: the initial inline gate selected `postgres:16-alpine`, which lacks the repository-required `vector` extension.
- What was tried: full `prisma migrate deploy` on the plain image; Prisma correctly returned P3018/0A000 and the `finally` cleanup removed the container.
- Fix/workaround: rerun with the repository-pinned `pgvector/pgvector` digest used by existing EF relational gates.
- Prevention: every full-history disposable PostgreSQL gate in this repository must reuse the pinned pgvector image, not a generic PostgreSQL image.

## Prisma could not deserialize advisory-lock void — 2026-08-02

- Symptom: the promotion relational test failed before its crash failpoint because `$queryRaw` could not deserialize `pg_advisory_xact_lock`'s PostgreSQL `void` result; a first boolean wrapper also treated the successful void as false.
- Root cause: the lock function was selected as the direct result column instead of being executed in a subquery with a Prisma-supported scalar projection.
- What was tried: direct void selection, then `void IS NULL AS locked`; neither provided a reliable Prisma result value.
- Fix/workaround: execute the lock in a subquery and project constant `1::int AS locked`, then require one row/value before continuing.
- Prevention: wrap PostgreSQL side-effect/void functions behind a supported scalar projection when they must run through Prisma `$queryRaw`.
