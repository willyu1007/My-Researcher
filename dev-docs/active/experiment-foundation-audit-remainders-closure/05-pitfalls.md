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
- Do not add relay-shaped outbox fields without wiring claim, acknowledgement, retry release and poison-record terminalization into a running drainer.
- Do not treat valid per-row hashes as exact replay proof; cross-bind Candidate, canonical revision, decision, receipt and outbox identities/content.
- Do not add a product capability env key without adding it to the node-test environment scrub list.
- Do not use one global forbidden-field set when legitimate nested exact asset refs reuse names such as `revision_id` or `content_hash`; distinguish command-level authority from typed nested references.
- Do not rely on PostgreSQL to preserve generated relation names longer than 63 bytes; pin short names in both Prisma and migration SQL and run full-history drift replay.

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

## Promotion outbox had relay state but no drainer — 2026-08-02

- Symptom: committed promotion events remained `pending` indefinitely even though the table exposed lease, retry and delivery fields.
- Root cause: Phase 2 created the atomic outbox record but did not register its owning repository with the already-running experiment integration relay.
- What was tried: relying on the existing EF integration outbox scan. That scan owns a different table and cannot safely acknowledge promotion records.
- Fix/workaround: extend the existing relay composition with the promotion repository, preserve the owner repository on each claim, fully revalidate stored promotion lineage at claim time, then mark the audit-only notification delivered. Invalid rows become terminal `failed` poison records; transient delivery failures still use release/retry.
- Prevention: every new durable outbox must name its running drainer and prove pending → leased → delivered, retry release, lease ownership and poison-record behavior before its phase exits. Audit-only delivery must never mint downstream business authority.

## Exploration authority guard collided with exact asset references — 2026-08-02

- Symptom: a valid exploration specification was rejected because nested exact asset dependencies legitimately contain `revision_id` and `content_hash`.
- Root cause: the first route guard treated those names as forbidden at every nesting level even though only caller-authored command/revision authority at the top level is prohibited.
- What was tried: a single recursive forbidden-name set; the set correctly blocked dangerous fields but over-rejected the reused typed asset-ref contract.
- Fix/workaround: keep execution/result/server identity names recursively forbidden, while checking `revision_id` and `content_hash` only on the command body top level. Closed JSON schemas still constrain nested reference shapes.
- Prevention: classify forbidden fields by semantic location whenever a shared typed sub-contract legitimately owns similarly named exact-reference fields.

## Full-history drift exposed an overlong Phase 2 relation name — 2026-08-02

- Symptom: Phase 3A migrations and relational behavior passed, but `ci:prisma-drift` requested a rename for the Phase 2 promotion receipt foreign key.
- Root cause: the hand-written Phase 2 SQL used a generated-style foreign-key name longer than PostgreSQL's 63-byte identifier limit, so PostgreSQL truncated the name while Prisma expected a different generated short name.
- What was tried: the initial full-history drift replay on the disposable database; the replay correctly failed and preserved the one-statement diff.
- Fix/workaround: replace both promotion relation constraints with explicit short names and pin the same names using Prisma `map:`. A clean disposable replay then reported zero drift.
- Prevention: every additive migration must use explicit sub-63-byte relation names, pin them in Prisma and pass full-history replay before the phase exits.
