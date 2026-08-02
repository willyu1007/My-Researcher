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
- Do not rely on Fastify `additionalProperties: false` alone when the default AJV mode may remove caller-authored authority fields; reject unexpected authority before dispatch and test zero service calls.
- Do not bind PI attachment scope with independent scalar foreign keys only; use composite project/Cycle/branch, revision/plan and admission bindings plus durable read-time recomputation.
- Do not hand-seed a `real_provider` Attempt over a simulation ProviderPayload; positive evidence tests must enter through executable v2 materialization and the existing real-provider intake/worker path.
- Do not trust an Attempt row alone at scientific ingress; re-resolve its canonical payload and event lineage before accepting real-provider provenance.
- Do not use colon-delimited fixture Run or cell identities in real-provider tests; they must satisfy the production-safe provider path-segment contract.
- Do not make an embedding fake depend on batch position; the same document/profile must produce the same vector in incremental and full rebuilds.
- Do not hash double-precision embedding components before `vector` persistence; quantize to float32 first so the stored vector and server hash remain identical.

## pgvector float32 storage could invalidate embedding hashes — 2026-08-03

- Symptom: final review showed that arbitrary provider vectors would be normalized and hashed as JavaScript float64 values, then rounded by pgvector `vector` storage and rejected as corrupt on readback.
- Root cause: the first relational fake produced sparse basis vectors whose components were exactly representable in both float64 and float32, masking the persistence precision boundary.
- Fix/workaround: quantize every normalized component with `Math.fround` before embedding hash calculation, canonicalize database text readback with the same operation and accept the bounded float32 norm error on write/read validation.
- Prevention: relational vector tests must include deterministic dense fractional components and prove an exact write/read/replay cycle through the real pgvector type.

## Batch-position embedding fake broke incremental/full rebuild parity — 2026-08-03

- Symptom: the corruption-repair relational assertion reported two changed rows although only one stored semantic text had been corrupted.
- Root cause: the deterministic test embedding fake selected a basis vector from each document's current batch index. A newly indexed document had index zero during incremental build but index one during the later full repair batch.
- What was tried: two identity-fenced disposable runs confirmed migration success, transaction cleanup and the same `2 !== 1` repair count before the assertion received a semantic label.
- Fix/workaround: derive the fake vector position from stable document identity. Full and incremental batches now produce identical vectors for the same document/profile, and repair updates only the corrupted row.
- Prevention: every embedding adapter test double must be a pure function of document content/identity plus profile, never batch ordering or batch size.

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

## Attachment route initially stripped forbidden authority fields — 2026-08-02

- Symptom: an HTTP request carrying caller-authored `admission_id` reached the controller because Fastify's default AJV configuration removed the extra property while validating the closed body.
- Root cause: the first 3B route relied only on `additionalProperties: false`; closed schema validation did not preserve the original payload for semantic rejection.
- Fix/workaround: add a route pre-validation authority guard that rejects every body key except `branch_key` and `business_idempotency_key`, and assert the use case receives zero calls.
- Prevention: every public authority-minting route must test forbidden extra fields at the dispatch boundary, not only validate its shared JSON schema in isolation.

## Attachment scope eligibility was checked only before the authority transaction — 2026-08-02

- Symptom: review found that project `active` and ValidationCycle `admitted` status were resolved before readiness work, while the admission transaction fenced only the immutable Cycle-closure row.
- Root cause: Phase 3B reused the existing admission service's pre-transaction scope reader without adding the stronger commit-time lifecycle fence required by the new cross-domain attachment boundary.
- What was tried: the existing service guard and closure-table check covered ordinary rejection and closed-Cycle replay semantics, but could not prove that a project/Cycle status observed earlier remained eligible when a new attachment committed.
- Fix/workaround: for new exploration attachments only, the Prisma admission transaction now locks the exact project and Cycle rows with one parameterized `FOR UPDATE` query and requires `active` plus `admitted` before checking closure and writing authority. Historical exact replay remains before the lifecycle fence.
- Prevention: every new authority adoption path must identify mutable scope facts and recheck them inside its owning transaction; relational tests must pause after the outer read, mutate each fact and prove zero writes.

## Attachment readiness handling hid unknown infrastructure failures — 2026-08-02

- Symptom: any exception from exact readiness revalidation became `EXPLORATION_ATTACHMENT_READINESS_DRIFT`, so a database outage would return a 4xx business error and bypass unknown-error logging.
- Root cause: a generic catch treated every thrown value as a domain drift instead of classifying the explicit readiness error taxonomy.
- What was tried: boolean false and known drift tests proved the business path but did not exercise a raw repository/infrastructure exception.
- Fix/workaround: normalize only the three explicit readiness reason codes and rethrow every unknown error to the controller's logged 500 boundary; service and HTTP tests now cover both branches.
- Prevention: adapter catches must use explicit operational error types/codes, and every new mapping requires paired known-domain and unknown-failure tests.

## Phase 3C hand-seeded an impossible provider lineage — 2026-08-02

- Symptom: the positive trust test inserted a succeeded `real_provider` Attempt whose parent ProviderPayload was explicitly `simulation/non_production_fake_provider`, while the WorkOrder remained schema v1.
- Root cause: the fixture predated the existing M7 real-provider execution path and was retained as a shortcut, so it bypassed executable-v2 prerequisite checks and exposed only the Attempt row to scientific validation.
- What was tried: direct durable fixture rows exercised downstream scientific/gateway code, but could not prove production-shaped provider lineage and actively encoded a cross-table provenance contradiction.
- Fix/workaround: persist an active-ready ExecutionBundle, materialize an executable v2 WorkOrder, then use the existing real-provider intake, Prisma repository and command worker with an injected no-network SDK fake. Scientific reads now require exact ProviderPayload/Attempt parity and canonical event continuity.
- Prevention: positive end-to-end evidence tests must identify and invoke the production owner for every authority transition; a fixture may fake an external transport response but must not mint internal durable authority rows.

## Production-shaped provider replay rejected unsafe fixture identities — 2026-08-02

- Symptom: the first corrected disposable replay failed before provider submission because colon-delimited generated Run/cell ids were not safe single OSS path segments.
- Root cause: simulation-only fixtures allowed arbitrary internal identifiers, while the real-provider payload service correctly freezes Run and cell ids into output object paths and enforces `^[A-Za-z0-9_.-]{1,256}$`.
- What was tried: changing only cell keys was insufficient because the scientific relational materializer also generated Run ids with colon-delimited test ids.
- Fix/workaround: use a provider-safe materialization id factory and provider-safe cell keys for executable relational fixtures; keep unrelated PI/business ids unchanged.
- Prevention: when a test crosses into a real transport/materialization boundary, generate fixture identities from that boundary's public contract instead of carrying simulation-era id conventions forward.
