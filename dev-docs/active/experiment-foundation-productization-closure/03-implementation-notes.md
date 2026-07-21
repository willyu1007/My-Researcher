# 03 Implementation Notes

## Status
- Current status: `in-progress`
- Last updated: 2026-07-21
- Implementation Pack A、control-plane source binding、named-local Pack A/Pack B schema landing、Pack B technical implementation、深度清理、正式 PI scope → Pack A → Pack B product landing，以及 zero-write cloud-preflight implementation 均已验证。当前 named-local cutover=`true`，admission/simulation/cloud-preflight capability 均为 `false`；未通过真实 Aliyun read-only acceptance，也未执行非本地 rollout、provider write 或 scientific execution。

## 2026-07-18 — Pack C implementation start

- Pack C (Phase 4 exact-batch scientific validation, evidence gateway and D-16/D-17/D-18 trusted Cycle closure) was authorized after `09-pack-c-implementation-readiness-review.md` sign-off (OD-C1..C4) and the execution-plan sync into `01-plan.md`. Baseline HEAD at authorization is `3d241127`; census inputs are `artifacts/pack-c-preplanning-20260718/00-ef-side-writer-census.md` and `01-pi-side-closure-census.md`.
- Delivery order: Slice C-EF → Slice C-PI → Slice C-cutover (OD-C3 schedule-gated on T-133 N2+N6 with the T-124 tracker). Capability keys per OD-C2 default off; scientific happy paths remain production-disabled conformance; the sole first-release live path is the no-evidence closure. DB apply stays a separately approved named-local gate.

## 2026-07-18 — Zero-write cloud-preflight quality remediation closure

- Policy evidence now requires an exact reviewer ref, canonical UTC instants, a maximum 24-hour review lifetime, a non-symlink repo-external real path, a non-group/world-writable regular file and an independently supplied exact-file SHA-256 digest. Path, inode and digest drift fail before JSON trust or provider transport.
- The named-local cloud gate resolves the target, exact Run prerequisite and all 88 before/after table digests inside one `REPEATABLE READ` Prisma transaction whose first application statement sets and verifies PostgreSQL `transaction_read_only=on`. Final r9 records that server fence as evidence.
- The official SDK clients are injectable behind narrow read-only interfaces. Deterministic no-network tests verify exact SDK request fields, response mapping and two-page `ListResources` plus `ListEcsSpecs` traversal; the ledger accepts only `GetWorkspace`, one-or-more resource pages and one-or-more DLC-spec pages in that order.
- Pack A, Pack B and cloud runners now share named-local URL/live-target validation, canonical table digests/counts and hardened atomic JSON output. Pack A `verify` was also corrected to tolerate already-landed Pack B authority while proving its before/after census is unchanged; the zero-Pack-B precondition remains mandatory for Pack A `apply`.
- Fastify was upgraded from 4.29.1 to 5.10.0 in backend/shared. The two stricter unknown-error sites were narrowed explicitly; backend typecheck and the complete runtime suite passed, and `pnpm audit --prod --audit-level high` now reports no known vulnerabilities.
- Scope remained limited to the T-132 cloud-preflight/shared evidence lane and directly duplicated product-runner helpers. No Prisma schema, database apply, cloud request, capability enablement, scientific writer or unrelated T-124 population was changed.

## 2026-07-18 — Zero-write Aliyun cloud-preflight implementation

- Added shared `experiment-foundation-cloud-preflight-v2-contracts` with the exact execution profile/payload/redacted-manifest schemas, closed provider-operation set, 12 CP check IDs and non-scientific status vocabulary.
- Added an exact `CreateJob` payload materializer over the acknowledged Run's ordered RunCell/TaskSpec bindings. It canonical-hashes transient full bytes, enforces the 65,536-byte limit and emits only hashed/redacted persistent evidence.
- Added a same-payload fake lifecycle and an official Alibaba Cloud SDK read-only transport. Application code exposes only `GetWorkspace`, `ListResources` and `ListEcsSpecs`; `CreateJob` is denied before provider transport. Identity evidence is access-key-id-hash-bound, time-bounded and requires explicit `paidlc:CreateJob` denial.
- The reviewed RAM policy grants the two documented AIWorkspace read actions only. The official PAI-DLC 2020-12-03 `ListEcsSpecs` page currently exposes no RAM authorization action, so the gate transport-allowlists the API call without inventing an undocumented `paidlc:ListEcsSpecs` permission; a focused assertion freezes this boundary until the provider publishes different authorization metadata.
- Added `.ai/scripts/experiment-foundation-cloud-preflight-gate.mjs` plus the backend runner. It binds the exact Pack B final verifier and named-local database fingerprint, recomputes 88 protected-table digests, emits CP01-CP12 and never persists raw payloads or credentials.
- Added default-off development env contract values for the capability, exact region/workspace/quota/image refs, temporary STS refs and a repo-external policy-evidence path. `env-contractctl validate/generate` and the environment suite passed; no secret value or remote target was written.
- Targeted shared 2/2, backend 8/8, gate meta 3/3, shared/backend/script typechecks passed. Shared full passed 359/359; backend full completed 2,247 tests with 2,197 passed, 0 failed and 50 explicit conditional database/provider skips. Final r9 returned controlled `blocked` with CP01/04/05/11/12 passed, server-enforced read-only transaction, 88-table parity and zero provider/CreateJob/database/scientific writes. Its summary SHA-256 is `77f8f9973f2237e706216c894d55ff44657c6bede27fd32e42c0c6e09a3b07ea`.
- The official SDK dependency graph remains pinned to `@alicloud/aiworkspace20210204@6.2.0`, `@alicloud/pai-dlc20201203@1.10.0` and `@alicloud/openapi-core@1.0.8`; root overrides hold `lodash@4.18.1` and `fast-uri@3.1.2`. Fastify 5.10.0 closes the previously disclosed request-validation advisory, and the final production audit reports no known vulnerabilities.

## 2026-07-15 — Formal PI scope → Pack B product execution

- Added `run-experiment-foundation-packb-product-landing.ts`, a named-local-only apply/verify runner that binds the final Pack A evidence to live Run/head/readiness authority, requires Prisma composition and a closed Pack A admission, hard-denies `fetch`, rejects foreign Pack B lineage and digests every protected authority family before/after.
- Opened one gitignored simulation intake window through `env-localctl`, called the normal workflow-simulation POST route once, then drained committed E1-E5 commands with the production Prisma repository/worker and deterministic fake transport. The window was closed before the independent verifier ran.
- Product state converged to 2 payloads, 2 succeeded Attempts, 12 immutable events, 8 succeeded commands, 2 collected Collections and 2 diagnostic-only outputs. The status projection is `workflow_simulation_passed`; scientific execution remains `not_started` and evidence eligibility remains false.
- Final verifier r2 is read-only, simulation-off and passed with all 88 `PaperImplementation*`/source/Pack A/legacy/scientific protected-table digests unchanged, zero external fetch/provider/CreateJob and zero foreign lineage. Durable closure is `artifacts/product-pack-b-local-20260715/05-product-execution-closure.md`.

## 2026-07-15 — Formal PI scope → Pack A product landing

- Added `run-experiment-foundation-packa-product-landing.ts`, a named-local-only apply/verify runner that locks the reviewed database identity and exact PaperProject bridge/hash, revalidates the typed D-19 readiness fixture, uses normal PI HTTP routes for project/motive/trace/board/binding/Cycle/admission, and drains T1-T4 through production Prisma repositories and relay services.
- Tightened admission scope resolution so both project lifecycle `active` and Cycle lifecycle `admitted` are mandatory. Added zero-write coverage for inactive/non-admitted scopes and propagated lifecycle status through app composition and relational/script fixtures.
- Removed metric-array positional trust from the D-19 admission adapter. The active seven metrics are selected by frozen logical keys and retain deterministic canonical order even when repository/import order changes.
- The product runner is exact-replay safe, resolves superseded open trace-repair queue items through the formal route, retains the failed trace as audit history, and requires zero open repair items before PASS. Historical trace evidence is never deleted.
- Named-local config was compiled through `env-localctl`: an explicit admission window was opened for T1, then closed after T4 while committed cutover stayed enabled and Pack B simulation stayed disabled.
- Final product verifier r5 is read-only and passed with one acknowledgement, zero Pack B rows, unchanged legacy/scientific digests and no provider/network work. Durable closure is `artifacts/product-pack-a-local-20260715/05-product-landing-closure.md`.

## 2026-07-15 — Final stored-authority and evidence deep cleanup

### Read-path closure

- Centralized the canonical builders used by PI revision/cell plans, EF asset/readiness/VersionLock/RunRecipe/TaskSpec/Run manifests and Pack B control records. Repository readers recompute the same domain-separated hash profile rather than maintaining read-only formulas.
- Closed every authority-returning PI/EF/Pack B persistence path over typed snapshots, code-owned schema/hash profiles, canonical hashes, relational mirrors, ordered dependencies/cells/TaskSpec bindings and enum allowlists. Covered paths include later-head replay, final acknowledgement, materialization reload and Attempt/ProviderCommand claim; valid-looking, self-consistently rewritten JSON now fails closed.
- Strengthened T2's PostgreSQL `FOR SHARE` guard so the transaction itself validates readiness qualification/blockers, exact dependency roles/order, attestation hash, lifecycle state and source-event bindings before any materialization write. A relational tamper case proves all T2 family counts stay zero.
- Wrapped PI admission/head, EF materialization/acknowledgement and execution service entrypoints with stable repository-error mapping. Integrity failures from initial reads and replay/status paths now preserve a stable top-level `AppError` code plus `details.reason_code` instead of surfacing as an infrastructure 500.
- Replaced separate source-policy interpretations with the single portable `packages/shared/src/research-lifecycle/experiment-foundation-d19-source-policy.mjs` parser/digester. The Node gate imports the module directly; the TypeScript backend adapter supplies types, the reviewed digest and slot lookup only.
- Froze the reviewed source-policy digest as the single portable constant and exposed the two fixture slots only as frozen ordered values. Event, command and provider-control hash-profile identifiers are explicit closed constants; stored records cannot supply an alternate profile.
- Retained the real-PostgreSQL identity guard as a mandatory gate and unified its validator/marker assertions across the D-19 and Pack B runners: randomized database name, explicit URL, public schema and database COMMENT marker must agree before and after reset, there is no inherited `DATABASE_URL` fallback, and any skipped real relational test fails acceptance.
- ProviderCommand now proves the authoritative Attempt's exact provider payload id/hash on every read, claim, heartbeat, release, outcome and collection path. Cancel outcomes additionally require the exact terminal-reason semantics. Payload substitution, stale mirrored identity, alternate hash profile and cancel-reason drift fail before state mutation or provider transport.
- Gate/publisher evidence parsing now requires exact keysets, including every zero-census and redaction field; unknown, missing or substituted evidence keys fail closed rather than being ignored during summary import or durable publication.

### Final evidence

- Standalone D-19 `d19-deep-cleanup-final-20260715-r19` passed source policy plus A01-A04/B01-B10; its real-PostgreSQL relational lane passed 6/6 with 0 skipped, marker reset was verified and the disposable target was cleaned. Summary SHA-256 is `9961eec956d216c65d1ac24be57214c05680dd7c1ae6d8ea510c8dbcef73a647`.
- Pack B `packb-deep-cleanup-final-20260715-r16` passed PB01-PB16; shared targeted passed 6/6, backend targeted passed 89/89, Pack B real-PostgreSQL relational passed 7/7 with 0 skipped, embedded Pack A relational passed 6/6 with 0 skipped, marker reset was verified and the disposable target was cleaned. Summary SHA-256 is `207450f7104b24542574f883ea2e851425e11412c03f21e65413444d3c2bfd6d`.
- Gate meta passed 70/70, backend disposable PostgreSQL identity/guard tests passed 10/10 with 0 skipped and shared full passed 330/330. Real provider/CreateJob/fetch, legacy and scientific writes remained zero.
- Named-local read-only gate and app smoke `packb-deep-cleanup-final-local-20260714-r18` passed with 40/40 approved v2 tables, 62/62 migrations, 238/238 application-table parity, all capability flags false and zero prohibited effects. Source SHA-256 values are gate `53e269275d5b082d2b1f82ad6b2ed47a324380470479de3b0598be6a62a16a0c` and app smoke `37d262fa11fc45015d5e24320e963459034df77f2857074e3fea9476891de1b9`.
- Strict exact-keyset/redaction publication produced durable SHA-256 values app smoke `9f4e0e5f81d4f127ac1cd5c956c639a8f89a9406d0af873e5d06d2d039f10e4e` and final gate `bd702c6aca7104248839da1bb224e711d9eee64ddf6a98e4824f713b03e8eaad`; publisher producer SHA-256 is `982119a31989bbad1da51ae96892241bab90add1ee084031596f550350838c38`.
- Backend full suite after r19/r16 completed with 2,083 tests: 2,034 passed, 0 failed, 49 conditional database/provider-canary skips, 0 todo, duration `396225.938458ms`. Those conditional skips are not database acceptance; D-19 6/6 and Pack B 7/7 are both forced and 0 skipped.

## 2026-07-14 — Pack A/Pack B deep-cleanup closure

### Authority and transaction fixes

- Moved the T2 exact-readiness decision into `commitMaterialization`: before any T2 write, the same Prisma transaction batched and `FOR SHARE`-locked the attestation, exact target/dependency manifest, 23 lifecycle projections and Dataset location. Drift now returns a typed readiness conflict and leaves inbox/VersionLock/Recipe/TaskSpec/Run/RunCell/outbox counts unchanged.
- Separated each typed asset family key from `logical_id`; same-family keys are unique, immutable after create and checked against typed draft content by both adapters. Removed persistence of the five duplicated draft schema/hash pairs and their draft-hash indexes; server hash remains on immutable revisions.
- Removed VersionLock `lockSchemaVersion`/`resolvedLockJson`; ordered relational dependencies plus the server canonical hash remain the only lock authority.
- Batched E1 replay/conflict reads and payload/Attempt/event/command inserts, resolved latest Attempts with `groupBy` plus exact batch read, cached readiness graph resolution per transaction and made the in-memory latest-Attempt path O(N). Added a 48-cell real-PostgreSQL query-shape case.
- Tightened draft/freeze `state_version` contracts to positive integers. Shared hermetic-child environment handling now serves D-19 and Pack B gates, the PostgreSQL image is digest-pinned, and newly identified unconsumed exports were internalized without moving authority.
- Removed 14 whole-repository-proven zero-consumer shared row schemas and helper schemas that became dead after that removal. Interfaces plus request, event, error and directly consumed training IO schemas remain exported; the cleanup therefore removes only redundant validation surface, not domain contract authority.
- Extracted the duplicated D-19/Pack B disposable-PostgreSQL container/database/identity lifecycle to `.ai/scripts/lib/disposable-postgres.mjs`. Replaced the Pack-B-specific evidence helper with `.ai/scripts/lib/experiment-v2-evidence.mjs` and unified script-level SHA-256 ref matching. POSIX commands now run in detached process groups; timeout kills the full group and a real grandchild-survival test proves cleanup. Both gates retain their own acceptance logic; the final meta lane passed 70/70 and the unified backend disposable PostgreSQL identity/guard lane passed 10/10 with skip=0. Centralized the runtime SHA-256 regex in the shared experiment-v2 limit module instead of maintaining service copies.
- Added exact typed parsing for every persisted provider-payload `redacted_manifest` read. Replay, prerequisite resolution and worker dispatch reject malformed nested scope/redaction fields as `PROVIDER_PAYLOAD_CONFLICT`/scope conflict before any new write or transport.
- Tightened PI/EF inbox and final acknowledgement reads: stored outcome pairs, consumer/type/version/producer, structural scope, payload hash and envelope hash must all reconstruct exactly. Pack B E1 accepts only the one processed EF `BranchHeadAdvanced` receipt that binds the exact Run/manifest/branch/revision/sequence; substituted or merely processed rows cannot unlock dispatch.

### Schema and evidence closure

- Added `20260714190000_remove_experiment_foundation_v2_placeholders`, SHA-256 `b3ddb7601d4b256b47d664fb5cea3694bcc5587c6eb41864ba3e61bf711abf6c`. The migration drops exactly 12 unused Pack A columns and 5 unused indexes; the prior Pack A and Pack B migrations remain immutable.
- Added `20260714210000_normalize_experiment_v2_event_payloads`, SHA-256 `37eed54494aa2dc246fe7d5a9b2de2a027474b416ada8a5f18ab4bc194a65f3a`. The migration normalizes four integration tables to payload-only JSON plus structural envelope columns, adds the second envelope hash, makes 38 Pack A same-domain FKs double-`RESTRICT`, and adds nine fixed-v1 CHECK constraints. Repository adapters reconstruct typed envelopes and enforce payload/envelope hashes plus fixed-version read fences.
- Applied both cleanup migrations only to the reviewed named-local `my_researcher_dev`; migration history is now 62/62. Pack A semantic authority digest v2 remained 208 rows / `sha256:494cdf5a02e2379a66a12bc82411e8237f39e949a2f992f3e12a0e220f613d74` before and after; legacy remained 257 rows / `sha256:f9e7a6875c9a3597ecb485abc978920e461a3af33f071c676665439dde17211d`; Pack B stayed 6/6 tables and 0 rows.
- Bounded shared schemas and HTTP inputs that persist to PostgreSQL `Int` to the signed 32-bit range, including seed/repeat/run-policy fields. Added service/repository fences for revision/lifecycle/projection/state/head/relay/lease/attempt increments; an exhausted counter fails before mutation and preserves exact replay state. Updated all 22 corresponding T-132 OpenAPI integer fields to `format: int32` plus maximum `2147483647`; both seed fields also declare minimum `-2147483648`. A new drift test owns the exact census, and the API index was regenerated.
- The 210000 read-only preflight now reuses Pack A authority counts and reports PI inbox/outbox plus EF inbox/outbox individually. The actual named-local pending census was 0/0/0/0. Pending nonempty tables add `EVENT_STORAGE_HARDENING_NONEMPTY_EVENT_TABLES` and cannot imply apply readiness; partial columns/checks/FKs fail instead of blocking. No new-column query executes on the pending schema.
- `packb-deep-cleanup-final-20260715-r16` passed PB01-PB16 with shared 6/6, backend 89/89, forced real-PostgreSQL Pack B relational 7/7 and embedded Pack A relational 6/6, both with zero skipped; script typecheck passed, prohibited effects stayed zero, marker reset and disposable cleanup succeeded. Named-local gate/app smoke `packb-deep-cleanup-final-local-20260714-r18` passed with 40/40 approved v2 tables, unchanged 257-row legacy digest, 238-table parity, all flags false and prohibited effects zero; its sources were republished as the durable v5/v4 evidence.
- Final source-backed `d19-deep-cleanup-final-20260715-r19` passed source policy and A01-A04/B01-B10, exact attestation digest `sha256:48dd3546bcf314c478f80a5bc6ba5bcc0ecc57b848ac0d83fd7d5c9b8ac3bb6e`, real-PostgreSQL relational 6/6 with zero skipped, marker reset/cleanup and `blockers=[]`. All three integration-event outcomes were delivered and recorded `payload_only_storage=true`, `payload_hash_verified=true` and `envelope_hash_verified=true`; exact acknowledgement/inbox/TaskSpec-binding integrity negatives are included. r13 used an obsolete attestation path and correctly returned `blocked` even though A/B and cleanup passed; r13 remains a fail-closed invocation negative, not a product failure.
- The strict publisher supersedes earlier publication metadata and now binds the r18 sources only to durable SHAs `9f4e0e5f81d4f127ac1cd5c956c639a8f89a9406d0af873e5d06d2d039f10e4e` and `bd702c6aca7104248839da1bb224e711d9eee64ddf6a98e4824f713b03e8eaad`, producer `982119a31989bbad1da51ae96892241bab90add1ee084031596f550350838c38`. `.ai/.tmp` gate outputs remain ephemeral; the canonical package and checked-in artifacts are the durable handoff.
- At the deep-cleanup checkpoint, recompiled named-local configuration with admission/cutover/simulation all `false`; historical enabled probes remain evidence of guard behavior only. The later formal Pack A landing commits cutover and leaves admission/simulation false. No non-local DB, provider/fetch, scientific writer, D-18 closure, product E1-E5 or traffic cutover was touched.

## 2026-07-14 — Implementation Pack B quality-remediation checkpoint

### Correctness and authority cleanup

- Replaced duplicated persistence checks with one pure Pack B invariant module shared by in-memory and Prisma adapters; removed dead `findCommand`/`findLifecycleEvent`/`listAttemptOutputs` APIs and the non-authoritative `collectionSequence` field.
- Bound all post-submit operations to the exact server-observed external job ref/hash, rejected substituted identities, enforced the exact three diagnostic output keys and kept terminal state/reason/timestamp parity strict. Exact payload integrity failures remain `PROVIDER_PAYLOAD_CONFLICT`; exact Run/cell/TaskSpec/readiness drift remains the typed `EXECUTION_SCOPE_DRIFT` reason.
- Fixed scheduler recursive timeout/backoff, pre-dispatch lease heartbeat, pre-submit/cancel replay races and cancellation priority over leased sync/reconcile before E4.
- Made the PI admission and EF execution HTTP surfaces describe their actual outer error envelope, added complete response status schemas and centralized forbidden-authority/reason validation.
- Implemented PB14 as an exact Cycle-wide active-real Attempt repository read without Run/head filters; indexed that query while keeping every Pack B writer simulation-only.
- Eliminated nested 1..N-cell scans by pre-indexing E1 adapter facts/payloads and adding exact RunCell/payload worker lookups while preserving per-command Run/head/readiness revalidation; bounded fake-provider evidence storage and removed unreachable schema/index state.
- Internalized four unconsumed exports (`assertWorkOrderRevisionAdmittedEventV1`, `LEGACY_EXPERIMENT_CUTOVER_REASON_CODE`, `compareTablePopulation`, `verifyD19SourceBackedFixture`) without changing their owning modules or runtime behavior.

### Gate, evidence and local schema cleanup

- Hardened the Pack B/D-19 runners with a digest-pinned PostgreSQL image, fresh random databases plus identity markers, explicit child-process environment allowlists, fail-closed SQL/schema census and mandatory non-skipped relational execution.
- Added a dedicated TypeScript configuration that covers all five EF scripts, including the fixture importer, and made gate meta tests execute the formerly orphaned D-19/local-gate suites.
- Replaced local smoke `jsonb_agg`/full-row sorting with a bounded read-only cursor ordered by catalog primary-key columns and a length-prefixed Node SHA profile; disabled all background work and hard-denied fetch.
- Preserved the original applied migration byte-for-byte. Added cleanup migration `20260714160000_harden_experiment_foundation_pack_b_v2` with digest `05ddb7fa653e76b66fc6c0c4747b3680e3815a44dc672b8a61042310911dd5b8`.
- Created and verified a fresh PostgreSQL 17 recovery point before named-local apply. `pnpm db:dev:migrate` applied only the cleanup migration; the target is now 60/60 migrations with Pack B census 15 FK/35 CHECK/38 indexes.
- Final disposable run `packb-quality-remediation-final-20260714-r7` and named-local run `packb-quality-remediation-local-20260714-r5` both passed. Durable evidence is `artifacts/implementation/05-pack-b-quality-remediation-closure.md` and `artifacts/db/pack-b-local-development-20260714/07-quality-remediation-addendum.md`.

### Retained boundaries

- Four shared raw persistence DTO/schema contracts remain intentionally retained as frozen typed-family logical contracts; the review found no safely deletable production file after dead API/state removal.
- No T-124 runtime/result/dossier/REU application file, legacy authority table, non-local database, product traffic, real provider, scientific writer, D-18 closure or UI/search path was changed by the remediation.

## 2026-07-14 — Implementation Pack B named-local landing

- Locked the target to the reviewed loopback local-development fingerprint, created and verified a fresh PostgreSQL 17 custom-format backup, then used only `pnpm db:dev:migrate`/`prisma migrate deploy` to apply the single pending Pack B migration.
- Added a read-only Pack B local landing gate that checks exact target identity, source/database migration checksum, the exact 34+6 table population, canonical Pack A/legacy digests, six-table zero census, cross-domain FK absence, strict capability truth table and zero prohibited effects.
- Compiled the gitignored local simulation override through `env-localctl`; `.env.local` remained `0600`, `docs/context/env/effective-dev.json` was refreshed and the contract default stayed false.
- Real app composition with network hard-denied proved disabled intake returns `EF_V2_WORKFLOW_SIMULATION_DISABLED`, enabled intake without a prerequisite Run/head acknowledgement returns `EXECUTION_HEAD_ACK_REQUIRED`, and legacy mutation remains `LEGACY_RECORD_NOT_ELIGIBLE` in both states.
- Final gate `packb-local-closure-20260714-r1` passed with Pack A authority digest `sha256:1cad10a03db2343283cf3c313ab4585c9935a3f315f3335f6996939ec8490881`, legacy digest `sha256:f9e7a6875c9a3597ecb485abc978920e461a3af33f071c676665439dde17211d` and zero rows in all six Pack B tables.
- The absence of a formal PaperProject/active Cycle/admitted Run is intentionally not bypassed. No disposable fixture was imported into product authority, and no E1-E5, provider, scientific, closure or UI/search state was created.
- Durable evidence: `artifacts/implementation/03-pack-b-local-landing-closure.md`.

## 2026-07-13 — Implementation Pack B technical closure

### Delivered

- Added closed shared execution contracts/canonical hash profiles, strict default-off simulation composition and five v2 HTTP routes.
- Added exactly six EF-owned Prisma models plus additive migration `20260713210000_add_experiment_foundation_pack_b_provider_control_v2`; no PI FK, legacy ALTER/backfill, generic EAV, persisted workflow/scientific status or excluded family was added.
- Added independent execution service/repository/Prisma adapter, immutable provider-payload materializer, deterministic no-network fake transport and durable worker/scheduler.
- Implemented E1-E5 with exact replay, cell-local Attempt sequence, command lease owner + `lease_version` fencing, semantic command idempotency, event/transition parity and diagnostic-only collection parity.
- Kept new-intake capability separate from committed command draining; a head change or capability disable after E1 does not strand the existing saga.
- Preserved D-18's Cycle-wide active-real query as a read fence that includes non-head real Attempts while Pack B exposes no real-dispatch writer.

### Concurrency hardening

- Prisma E1 catches unique/serialization races, re-reads committed authority in RunCell ordinal order and converges only exact business-key/request/scope replay.
- Concurrent pre-submit same-key cancel inserts the completed cancel command as the unique serialization point before its FK-bound event.
- Cancel during an already leased submit persists one pending intent, leaves the Attempt/event unchanged and is excluded from claiming while `prepared`; after submit E3/recovery the cancel intent runs before sync. Same-key replay creates no duplicate and the generated sync advances to command sequence 3.
- Cancel intent precedes E4. A reconcile already leased by another worker is terminalized if its successful response returns after cancel becomes durable; CollectionAttempt/output remain absent.
- If cancel reads a pending submit but E3 commits before enqueue, the request returns `EXECUTION_ATTEMPT_STATE_CONFLICT` with zero cancel partial write; same-key retry re-resolves the submitted Attempt and persists the intent. If leased sync and cancel race, the CAS loser is immediately terminalized or requeued under the same provider key rather than waiting for lease expiry.
- Manual and automatic reconcile commands hash the provider idempotency key plus command snapshot, eliminating the prior same-Attempt hash collision.
- E3/E5 reject mismatched command/event/state/payload/external-ref/output shapes with full transaction rollback. Reused lease-owner stale versions are rejected.

### Verification and exclusions

- Final gate `packb-20260713-final4` passed PB01-PB16 with `blockers=[]`; shared targeted tests were 5/5, backend targeted tests 43/43 and forced Prisma relational tests 4/4 with 0 skipped.
- Final write census was 2 payloads, 2 Attempts, 12 events, 8 commands, 2 Collections and 2 diagnostic outputs. All 231 measured non-Pack-B application tables were unchanged.
- Real provider request, `CreateJob`, fetch, legacy write and scientific write counts were zero. Run scientific state remained `not_started`, evidence eligibility remained false and the disposable container was removed.
- At the 2026-07-13 technical-closure checkpoint, no existing-environment Pack B migration apply, capability enable, product/writer cutover, real cloud call, scientific result/validation/evidence, Cycle closure or UI/search was performed. The 2026-07-14 named-local section records the later schema/capability landing and does not claim product E1-E5.
- Durable evidence: `artifacts/implementation/02-pack-b-technical-closure.md`.

## 2026-07-13 — Post-review target, cutover and importer hardening

- Writable fixture import and the local landing gate now require the reviewed endpoint `127.0.0.1:5432/postgres?schema=my_researcher_dev` plus the recorded local cluster/database/schema fingerprint; a same-named remote database exposed through another local endpoint cannot pass. The gate also fails unless URL database identity, requested/effective schema and transaction read-only evidence all match.
- Both product cutover booleans now use strict runtime parsing: unset/blank is the default `false`, normalized `true|false` is accepted and every other configured value aborts app composition before any route is registered. A misspelled cutover value can no longer reopen legacy writers.
- At that checkpoint the exact local gate validated identity `draftStateVersion` plus the typed draft-derived schema/hash, one exact freeze receipt per revision, all 48 ordered lifecycle events, the 23 projections and each projection's source event rather than relying on row counts alone. The final cleanup derives draft schema/hash without persisting duplicate identity columns.
- `packa-d19-post-review-hardening-20260713-r2` and `r3` exposed two real-PostgreSQL READ COMMITTED observation races in the restart-safe importer. Bounded full-prefix rereads now converge only transient identity/revision/receipt or lifecycle event/projection inconsistency; persistent changed content/history still returns `D19_FIXTURE_IMPORT_CONFLICT` after the retry ceiling.
- Final disposable run `packa-d19-post-review-hardening-20260713-r4` passed A01-A04/B01-B10 and recorded two concurrent real-PostgreSQL imports plus a full exact replay. Final named-local run `packa-local-landing-20260713-post-review-r3` matched the reviewed target fingerprint and passed with zero blockers or prohibited effects.

## 2026-07-13 — Implementation Pack A source-policy closure

- Final run `packa-d19-source-policy-20260713-r2` passed with `blockers=[]`; A01-A04 and B01-B10 remained passed.
- The exact attestation canonical digest is `sha256:48dd3546bcf314c478f80a5bc6ba5bcc0ecc57b848ac0d83fd7d5c9b8ac3bb6e`; the final summary file SHA-256 is `246ab54eb6a611ec9c1d4430e0cdadb6913989e6561dcc6617e95b6775fc675f`.
- Wikimedia `mediawiki_content_current:enwiki:2026-07-01` text-only source policy and Google NQ-Open commit `fb26a3073b1fe636c97302890a27b491d6530130` original-dev policy were bound to exact server-issued Dataset/DataPolicy revisions.
- At the source-policy checkpoint EF-P25 became verified and EF-P27 remained in progress because existing-environment DB apply and product-writer cutover had not yet been authorized or performed. The later named-local evidence and audit matrix supersede that historical status.
- The source-policy PASS proves control-plane source binding only. Full-corpus download/re-hash, extraction, derived-corpus identity, scientific alignment, provider execution, DB apply and product cutover remain outside the result.
- Durable evidence: `artifacts/implementation/01-pack-a-source-policy-closure.md`.

## 2026-07-13 — Implementation Pack A technical closure

### Delivered

- Added independent PI/EF v2 shared contracts, five typed asset schemas, three event envelopes, canonical JSON/hash profiles and stable public error reasons.
- Added `PAPER_IMPLEMENTATION_EXPERIMENT_V2_ADMISSION_ENABLED` as an optional non-secret boolean defaulting to `false`; admission-off returns zero write and never calls the legacy repository.
- Added one additive migration with 34 v2 models: 6 PI and 28 EF. The migration contains domain-local relations only, no legacy ALTER/backfill, no generic authority table and no Attempt/provider/result/evidence/closure families.
- Implemented family-specific typed EF repositories/services, draft CAS, immutable freeze/replay, lifecycle projection and exact readiness manifests. Added relational Dataset policy, Benchmark role and Protocol metric dependency invariants.
- Implemented T1 admission route/controller/service/repository, T2 EF materialization and unique Run freeze, T3 PI branch-head CAS and T4 EF inbox acknowledgement.
- Implemented domain-local inbox/outbox relay and a scheduler that keeps draining committed sagas when new admission is disabled.
- Hardened exact replay for concurrent real-PostgreSQL admission: P2002 races re-read committed authority and converge only when canonical command semantics match.
- Added the D-19 gate runner and disposable PostgreSQL scenario with crash injection, replay/conflict, cell parity, excluded-write and legacy digest checks.

### Explicitly not delivered

The unresolved source-policy statement in the following historical section records the earlier `packa-d19-final-20260713-r2` technical-only run and is superseded by the dated source-policy closure entry; the remaining exclusions are still current.

- No migration was applied to an existing local/dev/staging/prod database.
- No admission capability was enabled in product configuration and no traffic/writer cutover occurred.
- No Attempt, provider job, result, scientific validation, evidence, Cycle closure, UI/search or legacy migration behavior was added.
- Historical technical-run state: original-source license/access attestations for both fixture datasets were unresolved, so `packa-d19-final-20260713-r2` remained blocked; `packa-d19-source-policy-20260713-r2` later superseded that blocker.

Durable evidence is recorded in `artifacts/implementation/00-pack-a-technical-closure.md`.

## 2026-07-10 — Task package creation

### What changed
- Created `T-132 experiment-foundation-productization-closure` as a new planning package.
- Recorded the 2026-07-10 design-review findings, dependency-ordered roadmap, target architecture, verification ladder and closure matrix.
- Selected governance mapping `M-001 > F-001 > R-012 > T-132`.

### Why T-132 is a new task
- T-043 remains the V1 concept umbrella.
- T-103 is a completed validation runner and must not gain product semantics.
- T-106 is a real-interaction hardening/provider-canary lane and explicitly constrained semantic expansion.
- T-131 owns one real promotion and explicitly excludes RunRecipe/execution.
- T-124 owns downstream PaperImplementation productization, not EF identity/validation/execution.

### Workspace safety
- The repository already contains a large, unrelated in-progress T-124 working-tree change.
- The T-132 planning turn does not edit T-124 files or application/source/config/schema files.
- Future shared EF/PI seam work requires a joint decision entry and a stable T-124 baseline before edits.

## Review baseline carried into the package
| Finding group | Planning conclusion |
|---|---|
| domain design | preserve bounded contexts and asset/protocol/Recipe/TaskSpec/result/evidence layering |
| identity/readiness | establish server canonical hash, immutable revisions and dependency-bound attestations first |
| scientific validation | execute a supported protocol subset; unsupported and unapproved partial states fail closed |
| execution | persist attempts before side effects; make collection replayable; replace synthetic trusted output |
| cross-module | use one broker/trust gateway and a rebuildable Sidecar projection |
| product UX | introduce project-scoped server read model and typed actions before visual polish |
| release | require real persistence, simulator recovery and DOM/Electron control-flow evidence before provider expansion |

## Decision log
> A decision stays `pending` until the user confirms the decision. After each confirmation, update the decision table and immediately synchronize `roadmap.md`, `00-overview.md`, `01-plan.md`, `02-architecture.md` and `04-verification.md` where affected.

| ID | Decision | Recommended default | Status | Confirmed on | Notes |
|---|---|---|---|---|---|
| D-01 | first release boundary | desktop control-flow simulation + exact Aliyun payload + real read-only preflight + same-payload fake lifecycle; no local/cloud training or simulated evidence | revised-confirmed | 2026-07-12 | `workflow_simulation_passed` and `cloud_preflight_passed` are non-scientific claims |
| D-02 | frozen identity/readiness model | logical id + server-issued immutable revision + canonical semantic hash + CAS drafts + full dependency attestation | confirmed | 2026-07-11 | operational state uses append-only events + projection |
| D-03a | human intervention/authorization triggers | one admitted WorkOrder/approved_plan_hash + four fixed gates; deterministic errors block directly; no DecisionAuthorityManifest/general Policy Engine | confirmed | 2026-07-11 | user rejected the earlier subjective and over-complex model |
| D-03b | accepted-partial scope | remove accepted partial; incomplete output is diagnostic-only; EvidenceCandidate requires complete passed validation | confirmed | 2026-07-11 | complete protocol-valid negative results remain eligible |
| D-03c | manual-promotion semantics | catalog admission only; no blocker waiver, readiness grant or evidence-trust upgrade; minimal typed decision | confirmed | 2026-07-11 | D-04 confirms atomic canonicalization |
| D-04 | promotion semantics | server-owned atomic/idempotent decision + created/exact-reused canonical revision + Candidate terminal state + outbox; no caller canonical refs | confirmed | 2026-07-11 | readiness/evidence/external effects stay outside |
| D-05 | EF→PI trust entry | EF qualifies EvidenceCandidate; one PI-owned identity-only Gateway alone writes RunEvidenceUnit/TraceManifest/outbox; D-16 places diagnostic execution in immutable Cycle closure accounting | confirmed; refined by D-16 | 2026-07-11 | Sidecar is display projection, not trust or accounting source |
| D-06 | PaperProject/PI ordering | PaperProjectIntake plus both bridge binding refs are mandatory before PI bootstrap; no first-class late binding | confirmed | 2026-07-11 | existing null-bound records move to D-08 |
| D-07 | execution environment | formal experiment execution is cloud-only; LocalScript/fake providers are dev/test simulation and cannot mint scientific result/evidence | confirmed | 2026-07-12 | no local runner platform in first release |
| D-08 | legacy data policy | existing rows unchanged/read-only; one mechanical ineligibility code; diagnostics/admin reads only; no revalidation/comparability/UI/PI flow | confirmed | 2026-07-12 | new use requires original-source import or future rerun |
| D-09 | EF standalone and PI interaction | PI is primary workflow for paper-bound experiments; standalone EF runs require explicit WorkOrder attachment and full revalidation before paper trust | confirmed | 2026-07-11 | user accepted the recommended interaction model |
| D-10 | iteration identity and retrieval ownership | PI owns ValidationCycle, WorkOrder branch/revision semantics and project-scoped retrieval projection; EF owns TaskSpec/Run/ExecutionAttempt/result facts; global infrastructure owns index mechanics only; structured lookup is authoritative and semantic ranking always re-resolves exact sources | confirmed | 2026-07-12 | first release indexes ValidationCycle and branch heads only; v2 history remains structurally queryable |
| D-11 | branch-versus-revision decision boundary | PI declares `revise | fork`; unchanged frozen branch-frame hash permits new revision/re-admission, changed branch frame/relation requires fork; draft/Attempt/Run/Cycle cases map mechanically and existing Runs never rebind | confirmed; Run row refined by D-13a | 2026-07-12 | `current_admitted_revision_id` and `head_run_id` remain separate; D-13a replaces per-point Runs with one required-cell batch Run |
| D-12 | coordinator stop points versus experiment authority gates | two layers plus scenario budgets: domain AuthorityGate is durable authority; CoordinatorStop is derived/coordinator-local; fixed T-132 flow is 1 initiation / 2 authority / 0 recovery / 0 plumbing and T-124 reference full-paper flow is 1 / 4 / 0 / 0 | confirmed | 2026-07-12 | T-124 four stops are not a global cap; counts scale only with named domain gates; no global policy/decision engine |
| D-13a | Run scientific granularity | one paper-bound WorkOrder revision freezes at most one immutable Run containing 1..N required cells; technical retries are cell-scoped Attempts and scientific cell changes require revision/re-admission | confirmed | 2026-07-12 | partially supersedes D-11's provisional point-to-Run row; no RunSet/RunGroup/optional or dynamic cells |
| D-13b | branch-head advancement | EF `RunManifestFrozen` → PI branch-revision-sequence-fenced head CAS + `BranchHeadAdvanced` → EF durable acknowledgement before first Attempt; failed/cancelled latest Run remains head | confirmed; transaction boundary refined by D-20 | 2026-07-12 | no timestamp/completion/metric/semantic-score inference, auto rollback, cross-domain authority transaction or human gate |
| D-14 | simulation versus scientific state | Run is mode-neutral; simulation terminality belongs to ExecutionAttempt/control projection while Run/cells remain scientifically `not_started`; PI may close control flow with no paper evidence | confirmed; post-closure boundary refined by D-18 | 2026-07-12 | real Attempt may reuse the exact Run only while Cycle is open; after closure follow-up uses a successor Cycle/new Run lineage |
| D-15 | admission cell-plan authority | first release admits a fully expanded exact 1..N scientific cell plan/hash; ranges/grid/seed-count remain non-authoritative draft inputs and EF only validates/materializes one-to-one after admission | confirmed | 2026-07-12 | no generator-only authority, runtime autotune/scientific cell mutation, CellPlan aggregate or per-cell confirmation; TaskSpec refs are post-admission EF bindings |
| D-16 | RunEvidenceUnit versus failed-run accounting | reserve REU for complete protocol-compliant validation-passed scientific evidence; account current-effective execution only in the existing Cycle closure record's embedded immutable snapshot/hash, keep Sidecar projection-only and let dossier consume explicit closed-Cycle refs/hashes | confirmed; scope refined by D-18 | 2026-07-12 | complete validated evidence later assigned negative/inconclusive remains on the same REU path; non-head history is excluded from closure accounting |
| D-17 | executable protocol and scientific-conclusion responsibility chain | EF executes canonical typed rules over the exact batch Run and alone qualifies EvidenceCandidate; PI Result Analysis proposes only; the existing ValidationCycle closure alone writes nullable scientific disposition and server-derived selected exit; closed-Cycle-only consumers follow | confirmed | 2026-07-12 | first scientific-validation capability slice is metric/artifact contracts + mandatory exact-scope envelope; `UNSUPPORTED_RULE` fails before dispatch; no DSL/plugin/waiver/ScientificConclusion aggregate/REU disposition/extra action; T-131 v1 remains catalog-only |
| D-18 | ValidationCycle closure scope and watermark | CAS-freeze every admitted branch's current revision plus non-null matching effective head Run/cells/all Attempts; no-head candidate returns `BRANCH_HEAD_NOT_FROZEN`; exclude non-head history, require explicit comparison refs, block on any Cycle-wide active real Attempt and seal the closed Cycle | confirmed | 2026-07-13 | closure is a current-effective scientific decision snapshot, not a history archive; Packet is post-closure and outside the hash |
| D-19 | first cross-module implementation acceptance slice | after separate Phase 1 closure: bound Cycle + real v2-ready asset fixture → two-cell admitted revision → exactly one VersionLock/RunRecipe + two TaskSpecs → one Run/manifest/`RunManifestFrozen` → PI head CAS/`BranchHeadAdvanced` → EF durable acknowledgement | confirmed | 2026-07-13 | zero Attempt/provider/result/evidence/closure/UI/search/legacy writes |
| D-20 | D-19 transaction/event/Unit-of-Work boundary | four domain-owned authority commits: PI admission/outbox → EF inbox/materialization/Run/outbox → PI inbox/head CAS/outbox → EF inbox/sole durable acknowledgement; same DB never collapses ownership | confirmed | 2026-07-13 | three integration events only; exact replay/idempotency and crash recovery; no shared write table/repository, cross-domain transaction, 2PC, ack aggregate or `dispatch_eligible` mirror |
| D-21 | v2 physical storage and legacy cutover | independent additive domain-owned typed PI/EF v2 table families behind default-off admission routing; legacy rows unchanged diagnostics/admin-only; explicit post-D-19 product cutover | confirmed | 2026-07-13 | no backfill, annotation, runtime union, dual-read/write, fallback, trust upgrade or legacy-writer rollback; intake disable drains committed sagas and preserves v2 lineage |
| D-22 | first migration schema boundary and invariant placement | only Phase 1 typed identity/readiness needed by D-19 plus the D-19 PI→EF→PI ack spine; relations own identity/CAS/order/idempotency and named typed canonical JSON+server hash owns frozen scientific snapshots | confirmed | 2026-07-13 | no generic EAV, cross-domain FK, future-phase/legacy-mapping tables or capability mirror; logical families only, not Prisma names/DDL/apply/enable authorization |

## 2026-07-11 — D-09 confirmed
- PaperImplementation is the primary orchestration and consumption workflow for experiments serving a paper.
- ExperimentFoundation remains independently usable for reusable assets and exploratory runs.
- A standalone EF run does not become paper-trusted through attachment alone; attachment to a PI ResearchWorkOrder triggers the same identity, readiness, scientific-validation and project-scope checks as a PI-originated run.
- PI owns paper intent and downstream use; EF owns execution truth and evidence qualification. Neither domain may directly overwrite the other's canonical state.
- Next alignment decision at that point: D-01 first release boundary.

## 2026-07-11 — D-01 initial confirmation (superseded by 2026-07-12 revision)
- The first release keeps the complete trusted/recoverable local PI→EF→PI golden loop as the core product proof.
- The same release materializes the exact Aliyun `CreateJob` request, validates the request offline, checks the real cloud environment through read-only APIs and exercises the same payload through a fake-provider lifecycle.
- Preflight credentials MUST lack `paidlc:CreateJob`; application transport MUST reject provider write operations before network dispatch.
- T-132 does not call `CreateJob`, allocate cloud compute or claim real scheduling/training/result/cleanup validation.
- The only successful cloud label is `cloud_preflight_passed`; a real minimum-resource canary remains a later, separately confirmed gate.
- Next alignment decision at that point: D-02 frozen identity/readiness model.

## 2026-07-11 — D-02 confirmed
- `logical_id` is stable lineage/discovery identity; `revision_id + content_hash` is immutable execution identity.
- The server computes `content_hash` from record kind, schema version, hash profile and semantic payload only. Timestamps, mutable status, audit metadata and projections are excluded.
- Draft changes require CAS/expected hash and cannot receive readiness or enter execution.
- Freezing identical content under the same logical id is idempotent; semantic changes create a new revision; different logical identities do not merge merely because content hashes match.
- Execution, replay and readiness use exact kind/revision/hash refs. Readiness also binds a deterministic full dependency manifest plus evaluator/qualification snapshot.
- Operational state such as ExternalJob status evolves through append-only events and a rebuildable current-state projection.
- Next alignment decision at that point: D-03 human-gate and exception model.

## 2026-07-11 — D-03a confirmed
- Removed the proposed `DecisionAuthorityManifest`, per-field authority modes and general Policy Engine/DecisionWorkItem design from T-132.
- WorkOrder admission originally covered goal, asset/protocol selections, primary metrics, parameter ranges, execution profile, budget and retry ceiling. D-15 supersedes ranges as execution authority: `approved_plan_hash` must bind the canonical `cell_plan_hash`; any retained ranges/grid/seed-count are non-authoritative draft provenance whose persistence/hash treatment is finalized in Phase 0.
- Normal preparation/execution/validation proceeds automatically inside the approved WorkOrder boundary.
- Human control is limited to four fixed gate categories: WorkOrder admission, manual-promotion decision, external side effect/scope expansion, and ValidationCycle closure.
- Deterministic trust/policy failures block directly and cannot be converted into an approval request.
- ValidationCycle closure was initially phrased as a terminal-only/full in-scope Run inventory; D-18 supersedes that membership rule with the CAS-fenced current-effective admitted-branch/revision/head scope while preserving exact scientific state visibility.
- Standalone attachment and revoke/supersede are explicit user commands and do not require a second confirmation layer.
- Next alignment decision at that point: D-03b accepted-partial scope.

## 2026-07-11 — D-03b confirmed
- Removed `accepted_partial`, `PartialAcceptanceDecision`, partial-evidence grades and any human-upgrade path from the first release.
- `accept_partial=true` is rejected rather than interpreted as approval.
- Failed, cancelled or incomplete executions retain logs, metrics and artifacts under ExecutionAttempt as diagnostic material only.
- EvidenceCandidate requires a complete result with `validation_status=passed`.
- A scientifically negative result remains evidence-eligible when execution and protocol validation are complete; execution failure/incomplete output is not a negative scientific result.
- ValidationCycle closure still lists incomplete runs for retry/resume/new-run/diagnostic disposition, but no disposition can promote them into evidence.

### 2026-07-11 — D-03c confirmed
- `manual_promote` is a human catalog-curation decision, not an exception, readiness decision or evidence-trust decision.
- Trust, authorization, provenance, license, security and asset-integrity blockers reject promotion directly and cannot become approval prompts.
- A catalogued asset may remain non-executable while execution-environment dependencies are unresolved; readiness is issued separately against the exact revision/hash and dependency manifest.
- The minimal decision contains candidate kind/revision/hash, `promote | reject`, actor, rationale and decision time, plus resulting canonical revision/hash when promoted.
- No waiver, approval scope, expiry, exception code or policy DSL is introduced.
- Manual and future automatic curation reuse one canonicalization service.

### 2026-07-11 — D-04 confirmed
- The promotion command accepts exact Candidate kind/revision/hash, decision, actor, rationale and idempotency key; the command rejects caller-authored canonical refs or payloads.
- `promote` rechecks identity and eligibility, then one database transaction creates or reuses a content-identical canonical revision, records `created | reused`, writes PromotionDecision, terminates the Candidate revision and inserts outbox.
- `reject` writes the terminal decision and Candidate state atomically but creates no canonical revision.
- One Candidate revision permits one terminal promotion decision. Reconsideration after rejection or semantic change requires a new Candidate revision.
- Same idempotency key plus same input returns the prior result; same key plus different input conflicts.
- Readiness, EvidenceCandidate/RunEvidence qualification and external side effects remain outside promotion transaction scope.

### 2026-07-11 — D-05 confirmed
- EF owns scientific qualification and creates EvidenceCandidate only from complete validation-passed results.
- One PI-owned Evidence Trust Gateway is the only RunEvidenceUnit writer for live, monitor, recovery and standalone-run attachment flows.
- Gateway input is restricted to PI project, exact WorkOrder revision/hash, exact EF run/result/EvidenceCandidate revision/hash, source event and idempotency key; caller-declared status/hash arrays or trust flags are rejected.
- The gateway server-resolves EF TaskSpec→run→result→validation→EvidenceCandidate lineage and verifies PI project/WorkOrder/`approved_plan_hash` scope plus revoke/supersede state.
- Failed, cancelled and incomplete runs create no RunEvidenceUnit and are frozen by exact Run/Attempt ref in the ValidationCycle closure snapshot; PaperExperimentSidecar is rebuildable display only. Complete protocol-valid negative/inconclusive results remain admissible on a separate scientific-disposition axis.
- Gateway admission atomically writes RunEvidenceUnit, TraceManifest and outbox. Sidecar remains a rebuildable projection and cannot become a trust source.
- Later EF revoke/supersede appends PI invalidation facts and rebuilds projections without deleting historical evidence.

### 2026-07-11 — D-06 confirmed
- D-06 is an ordering precondition, not an experiment-iteration mechanism.
- The product sequence is PaperProjectBridge → PaperProjectIntake/PaperProject binding → PI bootstrap; PI bootstrap does not create or infer PaperProject binding.
- Bootstrap requires matching non-null `paper_project_intake_ref` and `target_paper_project_ref`; an unbound bridge fails closed with PaperProjectIntake as the next action and creates no ImplementationProject/intake snapshot.
- A valid bound bootstrap is idempotent. No general late-binding event, reconciler or mutable historical snapshot is introduced.
- Primary product navigation starts PI from a bound PaperProject; raw bridge ID/hash bootstrap is restricted to diagnostics/compatibility cutover.
- Existing null-bound ImplementationProject records are blocked from new trusted work and handled under D-08 rather than repaired by a new product mechanism.
- Experiment retries and result-driven iterations remain a separate design decision and never rebind an in-flight run.
- Next alignment decision at that point: D-07 execution-environment role.

### 2026-07-12 — D-01 revised and D-07 confirmed
- The user clarified that formal experiments are primarily cloud-executed; the desktop/backend is the experiment control plane rather than the training compute plane.
- D-01 no longer uses a trusted local experiment as the first-release proof. The release verifies PI→EF→PI control flow through deterministic simulation, exact Aliyun payload materialization, real read-only preflight and the same-payload fake lifecycle.
- T-132 does not call `CreateJob`, run local/cloud training or claim real scheduling, runtime, result collection, scientific validation, EvidenceCandidate or RunEvidenceUnit production.
- `LocalScriptAdapter` and fake provider implementations are dev/test or isolated workflow simulation only. They are categorically ineligible for ExperimentResult, ResultValidationReport, EvidenceCandidate and RunEvidenceUnit product writers.
- First release does not build an OCI container runner, restricted host worker or arbitrary local-script product surface.
- Allowed success labels are `workflow_simulation_passed` and `cloud_preflight_passed`; both must list real execution/evidence as unverified.
- Real result and evidence closure moves to the later separately authorized cloud-provider execution gate.

### 2026-07-12 — D-08 confirmed
- Existing non-v2, null-bound and simulation-era rows remain unchanged in the current database; T-132 does not copy, rehash, backfill, annotate or migrate them into v2 trust.
- Absence of supported v2 identity/schema mechanically returns `LEGACY_RECORD_NOT_ELIGIBLE`; no model or human writes summaries, narrative reasons, recommended actions or trust grades.
- Legacy access is restricted to existing-field diagnostics/admin GET/list compatibility. No new archive read model, researcher UI or PaperImplementation integration is created.
- Every v2 selector/writer plus promotion, attachment, execution, Evidence Trust Gateway and PI path rejects legacy records.
- Reuse starts from the original source through a new typed v2 import, or from a future real rerun; the legacy record itself is never upgraded.
- Existing null-bound ImplementationProject rows remain read-only and cannot start trusted work; continuing the work requires a new correctly bound project.
- Retention/deletion of the unchanged rows is a separate future data-governance decision.
- OQ-01 through OQ-09 are now aligned. Experiment-iteration semantics remains the next separate discussion before implementation authorization.

### 2026-07-12 — D-10 confirmed
- The shared hierarchy, as later refined by D-13a, is ImplementationProject → ValidationCycle → WorkOrder branch → immutable WorkOrder revision → unique required-cell batch Run → cell-scoped ExecutionAttempt. Cells are Run value objects rather than a new domain level. WorkOrder branch is the PI-owned stable logical identity; PI WorkOrder revision is a distinct authority from EF generic-record revisions.
- PI owns ValidationCycle questions/assumptions/decision exits, WorkOrder branch/revision semantics and the explicit current-revision/head-Run projection. A Cycle may have multiple branch heads; no `MAX(created_at)` or single global “latest Run” rule is allowed.
- EF owns TaskSpec, Run, ExecutionAttempt and result facts. Paper-bound commands carry an exact PI scope prefix (project/cycle/branch/WorkOrder revision/hash/`approved_plan_hash`) plus EF execution identities; EF treats PI semantic fields as opaque, persists the binding and never executes from `latest`.
- The minimum branch semantic frame is `parent_branch_id`, optional forked-from Run ref, `branch_intent`, `expected_effect` and `difference_from_parent`. The frame is PI planning input frozen through admission and included in `approved_plan_hash`; the frame is not an EF/model/human post-hoc retrieval summary.
- PI maintains a project-scoped, disposable/rebuildable retrieval projection from PI and EF outbox events. Global/shared infrastructure may provide embedding/vector/index mechanics but owns no domain content, branch head, execution state or trust transition.
- The first release creates deterministic semantic documents only for ValidationCycle and WorkOrder branch heads. Older v2 WorkOrder revisions and non-head Runs are normal lineage history—not D-08 legacy—and remain available through exact structured queries/audit, but D-18 excludes them from closure accounting unless the current admitted revision explicitly binds a trusted comparison input ref/hash.
- Search applies project permission and structural filters before semantic ranking, then re-resolves exact PI/EF source revisions/hashes. Stale candidates are discarded, and index/embedding outage falls back to structured lineage without blocking workflow.
- Semantic scores and clusters are discovery aids only; they cannot create/fork branches, select a revision or head, authorize execution/readiness, qualify evidence or close a ValidationCycle.
- During the D-10 update, D-11 remained pending: define the deterministic change matrix that separates a new revision in the same branch from a new branch/fork.

### 2026-07-12 — D-11 confirmed
- Rejected “change magnitude” and semantic-distance classification. PI issues an explicit `revise` or `fork` operation; backend enforcement compares the frozen branch semantic-frame hash and parent/fork relation only.
- Before first admission, PI CAS-updates the same WorkOrder draft. Retrying the exact TaskSpec after a technical/provider failure creates an EF ExecutionAttempt. The original provisional rule mapped each admitted seed/repeat/parameter point to an EF Run; D-13a below explicitly supersedes only that Run-granularity clause.
- If exact-plan fields change while the branch semantic frame/relation remains byte-for-byte canonical-equivalent, PI creates a new immutable WorkOrder revision and repeats WorkOrder admission. Any change to `branch_intent`, `expected_effect`, `difference_from_parent`, `parent_branch_id` or forked-from Run relation creates a new branch.
- Changing the ValidationCycle question or pass/fail/inconclusive decision exits creates a new ValidationCycle.
- A new revision/branch applies only to future Runs. An in-flight or completed Run remains bound to the original WorkOrder revision and may only continue or receive an explicit EF cancel intent; no rebinding/in-place mutation exists.
- `current_admitted_revision_id` and `head_run_id` are separate explicit projections. D-13a later freezes Run batch granularity and D-13b freezes manifest-time sequence-fenced head advancement.
- The PI-owned portion of the contract must be recorded in T-124 without conflating WorkOrder branch with coordinator candidate paths, PaperImplementationCoordinatorRun with EF experiment Run, or PI runtime node attempts with EF ExecutionAttempt.
- At the D-11 synchronization point, cross-package review exposed D-12: T-124's four coordinator stop points and T-132's four experiment authority gates were different sets awaiting a two-layer versus product-global decision. The following D-12 entry supersedes that pending state.

### 2026-07-12 — D-12 confirmed with minimum-intervention priority
- Confirmed a two-layer contract: AuthorityGate is the only durable domain authorization; CoordinatorStop is a derived coordinator-local pause that references an owning gate or next action and cannot mint a parallel human-decision record.
- T-124's four stop points are local to the coordinator/golden lane, not a claim that the entire product has only four human interactions.
- When an unresolved Gate causes a Stop, the owning screen exposes one user interaction, persists/reuses the exact domain decision record(s) and automatically resumes after the gate passes. UX coalescing never merges authority or weakens scope/hash checks.
- WorkOrder admission approves the complete revision boundary once. As refined by D-13a/D-15, exact-cell compilation/preview happens automatically in the PI draft before admission; afterward EF parity validation, TaskSpec materialization, the revision's one batch Run, cell-scoped ExecutionAttempt retries and sync/collect/reconcile progress automatically.
- Manual promotion remains an explicit catalog action outside the normal PI experiment path. External authorization triggers only for actual provider writes/uploads/scope or budget expansion; zero-write simulation/read-only preflight and already-authorized safe retries do not trigger external authorization. ValidationCycle closure remains one batch action.
- Deterministic errors block directly and return a stable next action rather than asking for confirmation.
- Refined the product target into four mutually exclusive user-action classes: InitiationAction, AuthorityAction, RecoveryAction and PlumbingAction. D-13a later fixes the T-132 zero-write scenario cardinality as one project/Cycle/branch/admitted revision/batch Run plus N required cells and M cell-scoped Attempts; the scenario must finish at no-evidence Cycle closure with exactly `1 / 2 / 0 / 0` actions.
- The scalable AuthorityAction minimum is the scenario count of exact-revision admissions + Cycle closures + required strong-claim acceptances + dossier exports + real external-effect/scope authorizations + explicit manual promotions. The formula is not a hard-coded product-wide number. The T-124 one-Cycle/one-revision/one-strong-claim/one-export reference flow is `1 / 4 / 0 / 0`; a future real-cloud flow adds the flow's named external authorization.
- Retryable faults, restart, duplicate submit, stale projection and index outage add no action. Skeptic revise/fork preparation adds no acknowledgement; only a resulting revision admission counts. Deterministic input repair is classified as RecoveryAction and must remain zero on the happy path. Manual ids/hashes/JSON or PI-to-EF state transfer are PlumbingActions and must always remain zero in product golden flows.
- Product acceptance records theoretical versus actual counts by class. The happy path must equal the minimum and every excess action must have a stable Gate/Stop/blocker reason. D-13a fixes Run granularity and D-13b makes head advancement automatic with zero additional action.

### 2026-07-12 — D-13a immutable batch-Run granularity confirmed
- Confirmed the paper-bound cardinality as admitted WorkOrder revision `0..1` Run during preparation and exactly one after successful manifest freeze. Same-revision replay reuses the exact Run only when the canonical ordered manifest/hash matches; a second or conflicting Run fails closed.
- The immutable Run contains 1..N required cells. Each cell freezes `cell_key`, seed, repeat index, exact parameter bindings, TaskSpec ref/hash and required result contract but remains an embedded Run value object rather than a RunSet/RunGroup/branch/evidence authority.
- Technical/provider retry creates an ExecutionAttempt bound to exact Run + cell + TaskSpec. Re-running a completed cell to seek a better metric is not a technical retry; adding/removing/changing any scientific cell requires a new WorkOrder revision and admission.
- Run-level validation waits for complete results from every required cell. Exhausted, missing, failed or cancelled cells retain diagnostics but make the Run ineligible for EvidenceCandidate. Optional/dynamic cells, runtime HPO, post-freeze append and partial acceptance remain absent.
- Simulation versus real-provider provenance belongs to ExecutionAttempt. Simulation Attempts never satisfy scientific completeness; while the Cycle remains open, a later authorized real Attempt may remain on the same Run/cell only when the exact frozen TaskSpec/payload and scientific boundary are unchanged. D-18 requires successor-Cycle/new-Run lineage after closure.
- D-13a explicitly supersedes only D-11's provisional per-point Run clause. D-11 revise/fork classification, re-admission and no-existing-Run-rebinding rules remain unchanged. D-13b later completes explicit head semantics.

### 2026-07-12 — D-13b sequence-fenced branch-head advancement confirmed
- Confirmed manifest freeze as the only automatic head trigger. EF atomically persists the immutable Run/manifest plus `RunManifestFrozen`; first dispatch, completion, metric value, EvidenceCandidate, semantic score and manual selection have no head authority.
- PI issues immutable branch-local `branch_revision_seq`, consumes the exact event through an inbox, validates admission/scope and atomically persists both sequence-fenced `head_run_id` and `BranchHeadAdvanced`. EF and PI never write each other's canonical state; no shared table, distributed lock, cross-domain authority transaction—including under one database—or 2PC is introduced.
- Event handling is deterministic: same sequence/Run/manifest is idempotent; lower sequence becomes history without rollback or dispatch; same sequence with conflicting Run/manifest is an invariant violation; missing admission waits/retries.
- EF must durably consume the exact `BranchHeadAdvanced` acknowledgement before creating the first cell Attempt/dispatch. A stale never-dispatched Run remains lineage-only. A prior already executing Run continues unless the Run receives an explicit EF cancel intent.
- Confirmed head as latest frozen execution lineage rather than success/best/adopted evidence. A head Run that later fails, is cancelled or remains incomplete stays head; the system never restores an older successful Run automatically.
- Head advancement/replay adds zero AuthorityAction, CoordinatorStop acknowledgement, RecoveryAction or PlumbingAction.

### 2026-07-12 — D-14 orthogonal simulation/scientific state confirmed
- Confirmed one mode-neutral immutable batch Run. Simulation/real provenance and provider lifecycle belong to cell-scoped ExecutionAttempt; no SimulationRun, second Run, RunSet or simulation-specific scientific state machine is introduced.
- A simulation Attempt may reach a terminal lifecycle state, but success/failure/cancellation cannot satisfy required-cell scientific completeness or mark the Run scientifically completed/failed/cancelled. With no eligible real-provider result, every Run/cell reports `scientific_execution_status=not_started` as a derived contract/read-model value.
- `workflow_simulation_passed | blocked | failed` is rebuilt from simulation Attempt events into verification/PI Sidecar control state. The control projection is not an EF Run status, ExperimentResult, ResultValidationReport, negative scientific result, EvidenceCandidate or Evidence Trust Gateway input.
- PI may close the first-release Cycle with exact head-Run/terminal-simulation-Attempt refs, `closure_kind=control_flow_validated_no_paper_evidence`, `scientific_disposition=null`, `scientific_execution_status=not_started` and `evidence_eligibility=false`. That PI closure kind cannot mutate EF Run/cell/Attempt facts or upgrade trust.
- Any non-terminal real-provider Attempt anywhere in the Cycle blocks closure. While the Cycle remains open, a later authorized real Attempt may use the same Run/cell only when the boundary is unchanged; after closure, D-18 requires successor-Cycle/new-Run lineage.
- D-14 adds no human interaction beyond the existing ValidationCycle-closure AuthorityAction; the fixed target remains `1/2/0/0`.
- At the D-14 synchronization point, D-15 remained pending; the following D-15 entry supersedes that pending state.

### 2026-07-12 — D-15 exact cell-plan admission confirmed
- Confirmed that paper-bound admission requires a PI-owned, canonical, non-empty ordered `exact_cell_plan[1..N]` persisted inside the immutable WorkOrder revision before the one admission action. Ranges, grids, seed counts and generator metadata may help author the draft but cannot authorize execution cells.
- Each admitted cell fixes a PI-server-derived key, seed, repeat index, exact parameter bindings and required-result contract. `cell_plan_hash` is bound by `approved_plan_hash`; the concrete key algorithm/hash profile and optional authoring-provenance persistence/hash treatment remain Phase 0 implementation details.
- EF receives the exact cells/hash and performs only scope/readiness validation plus one-to-one Recipe/TaskSpec/provider/Run materialization. TaskSpec refs/hashes are resolved or exact-reused after admission and frozen into the Run manifest; they are not WorkOrder-admission prerequisites.
- Extra, missing, duplicate, substituted or scientifically drifted Run cells fail before Run freeze/head/Attempt. Materialization failure blocks the exact cell and cannot authorize a different seed, scientific parameter or result contract.
- Existing `autotune_policy`/`allowed_mutation_refs` cannot authorize runtime scientific-cell mutation for v2 admitted paper work. If retained for compatibility or authoring provenance they are non-authoritative; `retry_budget` applies only to technical Attempts of the same exact cell. Any scientific cell change requires a new revision and admission.
- The plan remains an embedded WorkOrder value collection. No `CellPlanManifest`, generator registry/DSL, RunSet/RunGroup, optional/dynamic cells, adaptive HPO, post-admission sampling or per-cell AuthorityAction is introduced. Draft compilation adds no user action, so the fixed target remains `1/2/0/0`.
- Standalone attachment under D-09 must restate exact scientific cells in a new PI revision and pass the same admission/parity rules; attachment never promotes an exploratory generator into paper authority.
- Historical note: after D-16 the next step was Phase 0 inventory; D-17 was then confirmed, and the readiness review subsequently exposed and closed OQ-18. The current next step is the joint D-16/D-17/D-18 invariant/migration inventory and first vertical slice.

### 2026-07-12 — D-16 scientific evidence versus execution accounting confirmed
- RunEvidenceUnit has one meaning and one writer: a complete protocol-compliant validation-passed EF EvidenceCandidate admitted through the PI-owned Evidence Trust Gateway. Positive, negative and inconclusive are scientific result/Cycle dispositions over the same completed execution state.
- Failed, cancelled and incomplete execution creates no RunEvidenceUnit. D-18 refines the original wording: the existing ValidationCycle closure AuthorityAction atomically freezes the current-effective admitted-branch/current-revision/effective-head Run/cell/Attempt scope, not every historical Run; no new aggregate or per-Run action is introduced.
- PaperExperimentSidecar references and rebuilds the exact closure snapshot/hash plus authoritative events for display. Sidecar cannot be independently revised, mint trust or serve as a dossier/failure-accounting authority.
- Dossier readiness declares exact closed-Cycle snapshot refs/hashes and re-resolves project/Cycle scope and hash. Open, tampered, incomplete or wrong-project snapshots fail closed; unrelated Cycles do not contaminate readiness, and project-wide failed-like REU scans are forbidden.
- T-124 S3-β's trusted failed/cancelled REU path and `assertProjectRunEvidenceAccounting` are historical implementation evidence now superseded as target semantics. They must be replaced together with mixed execution/result status contracts in one scheduled migration; no dual-read, compatibility alias, Sidecar fallback, FailureEvidenceUnit or second gateway may remain after cutover.
- Existing pre-D-16 rows/tests remain readable audit history and are not rewritten by the D-16 docs-only pass. A row that cannot resolve a complete validation-passed EvidenceCandidate cannot satisfy canonical v2 API/repository, claim support or dossier readiness.
- D-16 adds zero user actions. Cycle closure and dossier export retain the D-12 scenario counts, so T-132 remains `1/2/0/0` and the T-124 reference remains `1/4/0/0`.

### 2026-07-12 — D-17 executable protocol and scientific-conclusion chain confirmed
- Current evidence showed that `EvaluationProtocol` seed/repeat/aggregation/reporting/comparison/statistical/fairness policies are free-shape JSON, metric validity constraints are strings, the execution validator loads only metric refs and checks limited per-job presence/hash/status, and generic record paths can author validation/EvidenceCandidate-looking records. D-17 therefore treats current `protocol-compliant` as an unclosed product invariant rather than accepted implementation.
- EvaluationProtocol v2 has one canonically ordered typed `required_rules` authority covered by the canonical revision/hash. Descriptions and legacy policy text are non-executable. A code-local closed capability map resolves exact rule type/version/config; any malformed or unsupported required rule returns stable `UNSUPPORTED_RULE` during readiness before Run freeze/head/Attempt and at final recheck. No best-effort, LLM interpretation, database rule manifest/DSL/plugin or human waiver exists.
- The first supported slice is `metric_contract@v1` plus `artifact_contract@v1`. Exact v2 dependency/hash, real-provider provenance, exact Run/cell/result lineage, all-required-cell coverage and admitted seed/repeat/params/required-result parity are mandatory envelope checks rather than optional rules. Active aggregation derivation, comparison, statistics, thresholds, fairness or custom evaluator rules fail as unsupported until explicitly implemented and verified.
- ScientificValidation operates on the one immutable 1..N-cell batch Run. Its report/hash binds exact Run/manifest, canonical ordered cell/result refs/hashes, exact protocol revision/hash, validator-profile hash and ordered `passed | failed | unsupported` rule results. ScientificValidationService is the sole validation-report/EvidenceCandidate writer; a passed report/Candidate/outbox commit is atomic/idempotent and no caller-writable duplicate validation truth survives.
- EF validation decides protocol compliance/evidence eligibility only. EF never assigns contextual `positive | negative | inconclusive`; results later receiving any of those PI dispositions traverse the same passed EvidenceCandidate/Gateway/REU path. RunEvidenceUnit retains trusted evidence identity/lineage and owns no scientific disposition.
- PI derives Cycle-ready state only from the D-18 CAS-fenced current-effective branch/revision/head/cell/Attempt scope, eligible REU and explicit comparison context. Pending preparation/head convergence or any active real Attempt anywhere in the Cycle blocks; non-head history is excluded. Eligible evidence invokes Result Analysis; no eligible evidence/control-only scope skips interpretation.
- Result Analysis returns one exact-hash-bound proposed disposition plus evidence roles, rationale, uncertainty, limitations and claim ceiling. Counterfactual positive/negative/inconclusive/failed-run scenarios may support review but cannot be four authority outcomes, and the runtime/Domain Gate cannot directly materialize an accepted packet or write Cycle state.
- The existing ValidationCycle closure AuthorityAction is the sole conclusion assignment point. In that same one action, the researcher accepts/corrects the proposal and PI ClosureService/StateWriter atomically freezes closure kind, `scientific_disposition=positive | negative | inconclusive | null`, accepted proposal ref/hash and the D-16 accounting snapshot/hash. `null` means no scientific conclusion and is not `inconclusive`; execution failure/cancellation/incompleteness and simulation cannot become negative science.
- The service derives the selected exit from admission-frozen `decision_if_positive | decision_if_negative | decision_if_inconclusive`; caller-authored `cycle_assessment`/`decision_exit` is superseded. ResultInterpretationPacket is materialized only after closure, points to the exact closed Cycle/assessment/snapshot/proposal and explains rather than owns the conclusion. Packet→closed Cycle is one-way, avoiding a closure/packet write cycle.
- `ValidationCycleClosed` may automatically prepare next-step revise/fork/stop/proceed drafts plus Claim/Dossier/motive/retrieval projections, but automatic preparation does not admit/execute a WorkOrder or perform an external effect. Every consumer requires exact closed-Cycle refs/hashes; EF never consumes the disposition or rewrites an old Run.
- T-131 `v1-cpu-adapter` remains immutable promoted catalog/provenance history, not executable/evidence-ready input. Its free-shape rules, mixed faithful-only metrics, unmanaged seed and unresolved benchmark forward ref require a new original-source typed v2 import/versioned protocol identity, canonical hash, promotion and readiness; no v1 row rewrite or trust upgrade is allowed.
- D-17 adds no ScientificConclusion aggregate, extra AuthorityAction, RecoveryAction or PlumbingAction. The fixed action budgets remain T-132 `1/2/0/0` and T-124 `1/4/0/0`. The current caller-authored Cycle assessment/exit, mixed REU statuses, direct ResultInterpretationPacket materialization and open-proposal consumers join D-16 as one atomic PI semantic migration debt.

### 2026-07-13 — D-18 current-effective closure scope confirmed
- The user accepted the readiness-review recommendation that Cycle closure is a current scientific decision snapshot rather than a complete history archive.
- One `closure_watermark` CAS-freezes expected Cycle version, the canonical set of every branch with a current admitted revision and, per branch, current revision id/hash/sequence plus its non-null matching effective head Run/manifest, complete cells/all Attempts, execution/eligibility state and eligible REU refs.
- If the current revision has no matching head, an older head cannot substitute. The candidate retains `effective_head_run_ref=null` and returns `BRANCH_HEAD_NOT_FROZEN`; no closure record is committed until the exact head saga converges.
- Superseded/non-head Runs stay immutable and structurally queryable but are excluded from snapshot/dossier/automatic interpretation. Prior v2 results participate only through an exact `comparison_input_ref/hash` frozen on the current revision and re-resolved by the server; the ref affects contextual proposal/closure-input hashing, not execution-accounting membership or head selection.
- Any active real-provider Attempt anywhere in the Cycle, including on non-head history, returns `CYCLE_ACTIVE_REAL_ATTEMPT`. Concurrent branch admission, current revision/head/manifest drift or Attempt start returns `CYCLE_CLOSURE_SCOPE_DRIFT`, writes nothing and rebuilds the snapshot/proposal; same-watermark replay is idempotent.
- `ValidationCycleClosed` seals the Cycle against later admission/revise/fork, Run/head, Attempt/retry, attachment and dispatch writes. Follow-up experiment drafts target a successor ValidationCycle; exact TaskSpec content may be reused but lineage is never rebound.
- Closure stores only the accepted Result Analysis proposal ref/hash. ResultInterpretationPacket materializes after closure, points one-way to the exact closed Cycle and remains outside the closure hash. No-evidence/control-only closure writes null scientific disposition and null selected exit.
- The implementation roadmap was reordered to remove the Phase 2/3/4 dependency inversion: shared scope/admission/typed preparation/Run head first, durable provider simulation second, then exact-batch validation and trusted closure. Scientific happy-path fixtures remain production-disabled until M7 real-provider authorization.

### 2026-07-13 — D-19 first cross-module implementation acceptance slice confirmed
- The user accepted the recommended middle slice: neither an EF-only identity refactor nor the full no-evidence control-plane closure is the first product acceptance endpoint.
- D-19 begins from an already bound PaperProject/ValidationCycle and typed v2 assets written/readied through the real Phase 1 path. Product bootstrap, candidate import and promotion remain separate prerequisites; fixtures cannot inject hashes/readiness or legacy trust.
- One PI WorkOrder revision freezes exactly two required cells for acceptance while preserving the 1..N contract. EF materializes exactly one VersionLock, one RunRecipe and two TaskSpecs, then freezes the revision's only batch Run/manifest and emits `RunManifestFrozen`.
- PI consumes the exact event, sequence-fenced CAS-advances the branch head and atomically emits `BranchHeadAdvanced`; EF durably consumes one exact acknowledgement. The durable acknowledgement is the terminal acceptance fact and does not introduce a second dispatch-readiness field.
- Phase 1 identity/readiness is a separately closed prerequisite and is not counted inside D-19. D-19 uses those real v2-ready inputs through shared contracts, typed HTTP, services, repositories, Prisma and durable inbox/outbox replay behind a default-off capability with no legacy dual write.
- D-19 excludes ExecutionAttempt, provider payload/network/simulation, results, validation/evidence, D-18 closure/Packet, desktop/search and legacy migration. Final readback must be one revision, one two-cell Run, one head, one acknowledgement and zero excluded records/effects.
- Replay/crash tests cover same-input convergence, lower sequence history, same-sequence conflict, PI head-CAS/outbox atomicity and EF acknowledgement receipt recovery.
- D-18 remains unchanged: when later phases introduce real provider Attempts, any active Attempt anywhere in the Cycle—including a non-head Run Attempt—returns `CYCLE_ACTIVE_REAL_ATTEMPT` and blocks closure.
- Next alignment point at that time: freeze D-20's concrete first-slice transaction/Unit-of-Work and event-envelope boundaries before implementation authorization.

### 2026-07-13 — D-20 four domain-local Unit-of-Work boundary confirmed

- The successful D-19 authority path has four commits: T1 PI admission/current-revision CAS plus `WorkOrderRevisionAdmitted` outbox; T2 EF event inbox plus exact materialization, sole Run/manifest and `RunManifestFrozen` outbox; T3 PI event inbox plus exact-scope/sequence head CAS and `BranchHeadAdvanced` outbox; T4 EF event inbox plus the exact durable acknowledgement.
- A physical shared Postgres does not grant shared authority. Each use-case repository owns one Prisma transaction and one domain's canonical/inbox/outbox tables. No transaction callback, generic repository, mutable shared table, distributed lock or 2PC may cross PI and EF writes; typed HTTP/relay can initiate or deliver but cannot wrap or mutate both domains.
- The minimum integration-event chain is `WorkOrderRevisionAdmitted → RunManifestFrozen → BranchHeadAdvanced`. All events carry versioned producer/event/idempotency/correlation/causation metadata, a canonical payload hash and exact PI scope. Event-specific payloads preserve admitted exact cells, materialized Run/manifest/TaskSpec bindings and accepted head sequence without `latest` lookup.
- Each consumer commits its inbox outcome with all local domain changes and any output event. Same id/key plus same hash returns the existing outcome; same id/key plus a different hash and same sequence plus a different Run/manifest are terminal conflicts; a lower sequence records stale consumption without head rollback/outbox; a temporarily invisible valid prerequisite remains retryable with zero domain/outbox change.
- Before-commit failure rolls back local authority; commit-before-publish and publish-before-delivery-marker failures converge through outbox replay and inbox deduplication. Relay lease/delivery bookkeeping may have extra infrastructure transactions, but those markers are not domain truth and do not enlarge the four authoritative commits.
- The processed EF inbox receipt for the exact `BranchHeadAdvanced` event is both the D-19 endpoint and later dispatch prerequisite. No additional acknowledgement event/aggregate, Run flag, `dispatch_eligible` projection or fifth authority commit exists.
- Current repo evidence supports Prisma-local transaction/CAS/unique-key-plus-hash and real-Postgres rollback patterns, but no existing DB inbox/outbox or D-19 Unit of Work exists. Governance file/JSONL delivery, singular mutable WorkOrder/HarnessRun/live-adapter flow and generic mutable EF records are explicitly ineligible as implementation evidence.
- Next alignment point at that time: D-21 chooses independent additive PI/EF v2 canonical storage and cutover versus extending the existing singular WorkOrder/generic EF record paths before schema-pack approval and implementation authorization.

### 2026-07-13 — D-21 additive v2 storage and explicit cutover confirmed

- D-21 rejects extension of the mutable single-row/single-TaskSpec ResearchWorkOrder/HarnessRun and overwrite-capable generic EF record. Those structures cannot express immutable branch revisions/head CAS, 1..N exact cells, one batch Run/manifest, exact readiness or D-20 transactional inbox/outbox without embedding incompatible meanings in legacy tables.
- PI receives an additive typed v2 family for branch, immutable revision/exact-cell values, admission/current revision/head and PI integration inbox/outbox. EF receives an additive typed v2 family for typed asset revision/readiness, VersionLock/RunRecipe/TrainingTaskSpec binding, immutable Run/manifest/cells and EF integration inbox/outbox. D-21 freezes ownership categories; D-22 will freeze the minimal schema pack and invariant placement.
- Cross-domain persistence carries exact external identity/hash/sequence/event scope only. There is no shared mutable association table, cross-domain ORM relation/cascade/FK or repository write authority, even when one Prisma schema/client and Postgres host both domains.
- Migration is expand-only: new v2 tables/indexes/constraints are additive; every legacy row remains unchanged. Legacy access is existing-field diagnostics/admin read only, and offline aggregate shadow comparison cannot affect product routing, return values or authority. No backfill, annotation, repository/view union, dual read/write, trust upgrade or fallback exists.
- A dedicated v2 admission capability defaults off. Capability-off rejects new commands with zero v2/legacy write; D-19 may enable only its explicit acceptance scope. After D-19 passes, new paper-bound product intake switches to v2 and overlapping singular WorkOrder/HarnessRun/generic EF writers close in the same release. Active legacy work finishes first or restarts from a new v2 project/Cycle/revision.
- Capability disable and rollback stop new intake only. Relay/consumers continue every committed D-20 saga to the exact EF acknowledgement; immutable v2 rows/events remain auditable. Rollback does not delete/rebind v2 data, convert v2 to legacy or restore a legacy writer for the same logical object.
- Current repository patterns support additive Prisma migration, repository-local transaction/CAS and default-false env contracts, but the existing local-execution flag is unrelated and cannot authorize v2 admission. Exact table names, normalized boundaries and canonical snapshot layout remain D-22 work.
- Next alignment point: D-22 freezes whether the first migration builds the complete future PI/EF data model or only the minimal Phase 1 + D-19 schema pack and where relational versus canonical-JSON invariants live.

### 2026-07-13 — D-22 minimal first-migration schema pack confirmed

- The first migration is `Implementation Pack A — Phase 1 + D-19 minimal v2 spine`, not a complete future PI/EF model. Implementation Pack A includes only the Phase 1 typed asset identity/draft/revision/lifecycle/readiness support required by the locked D-19 fixture and the PI branch/revision/cells/admission/head/inbox/outbox plus EF VersionLock/RunRecipe/TrainingTaskSpec/Run/RunCell/inbox/outbox spine through the durable acknowledgement.
- Relational columns and child rows own stable identity, immutable sequence, uniqueness, current/head CAS, ordered cells/dependencies, same-domain bindings, event scope and idempotency. Named schema-versioned scientific snapshots alone use typed canonical JSON with a server-computed hash; generic `kind/payload`, EAV, caller hash authority and a duplicate mutable Run-manifest payload are forbidden.
- PI and EF may use same-domain relations/FKs. Cross-domain project/Cycle/branch/revision/cell/Run values remain exact external scalar ids, hashes, sequences and event scope without FK, ORM cascade, shared join table, shared repository or shared transaction.
- The first migration excludes candidate/import/promotion/bootstrap, ExecutionAttempt/provider/ExternalTrainingJob/CollectionAttempt, result/validation/evidence/REU, Cycle closure/interpretation, UI/read model/search/index, legacy bridge/backfill/union and product cutover. The default-off v2 admission capability remains configuration, not persisted eligibility or dispatch authority.
- D-22 freezes logical families and invariant placement only. Final Prisma names/columns/DDL, the exact D-19 typed asset-kind census, stable error codes and capability key must be locked in the schema/invariant matrix and reviewed through DB-SSOT before implementation or DB apply.
- OQ-01 through OQ-22 are complete. No D-23 is opened by default; only a genuine product/domain fork discovered by the matrix can justify another numbered decision. The next step is the implementation-readiness/authorization review for the narrow pack, with implementation, DB apply and product enablement treated as separate approvals.

### 2026-07-13 — Implementation Pack A readiness closure approved and completed

- Added `07-implementation-readiness-review.md` as the readiness SSOT and recorded `ready_for_implementation_authorization`; the readiness result does not authorize code/config/schema edits, DB apply or product enablement.
- Frozen the exact D-19 top-level asset allowlist to Dataset, DataPolicy, MetricDefinition, Benchmark and a new EvaluationProtocol v2. The fixture uses two Dataset revisions, two dataset-specific policy revisions, seventeen MetricDefinition revisions, one Benchmark revision and one protocol revision. BaselineImplementationVersion/MethodRecipeComponent were removed from the first-pack assumption because RAGPerf has no source-backed dependency on either family and the v1 `minItems: 1` requirement is contract debt.
- Frozen five named typed asset identity/draft/revision model pairs, dataset lifecycle, exact readiness rows, PI branch/revision/cells/admission/inbox/outbox, EF VersionLock/Recipe/TaskSpec/Run/RunCell/inbox/outbox, stable reason codes and A01-B10 acceptance IDs. Generic payload tables, cross-domain FKs, duplicate manifest JSON and persisted capability/dispatch mirrors remain forbidden.
- Selected `PAPER_IMPLEMENTATION_EXPERIMENT_V2_ADMISSION_ENABLED` as the PI-owned default-false intake guard. The existing LocalScript flag is unrelated and cannot authorize v2 admission or provider work.
- Locked `main@f6680225`, clean Pack A source surfaces, source-population digest `ea9673af…f976`, current legacy row counts/digests and the submitted HarnessRun/running ExternalTrainingJob cutover blockers. The active legacy rows do not block additive default-off implementation but must be terminal or restarted before product cutover.
- The implementation edit boundary uses new v2 contracts/routes/controllers/services/repositories and only clean integration points. Dirty T-124 result/dossier/runtime/REU surfaces are excluded; any need to edit those files reopens readiness review.
- Non-mutating baseline checks passed: shared/backend typecheck, targeted shared contracts 50/50, EF registry 11/11, EF execution 10/10, PI WorkOrder bridge 17/17, PI Prisma repository 2/2, Prisma validate, strict docs lint and governance lint. Legacy green tests are baseline evidence only and do not satisfy A01-B10.

### 2026-07-13 — Implementation Pack A authorization and Phase 0 start lock

- The user explicitly authorized the single frozen implementation path for `Implementation Pack A — Phase 1 + D-19 minimal v2 spine`, including code, default-off configuration, shared/API/DB/env context artifacts, Prisma schema/migration draft, isolated disposable-Postgres verification, tests and canonical task documentation.
- The authorization preserves the Pack A non-goals: no migration is applied to an existing local/dev/staging/prod database; the product admission capability remains disabled; no product relay/cutover, provider request, cloud training or scientific evidence path is enabled.
- Start HEAD remains `f6680225d5134d4f67bd59f4c5dbecb4eb0c476d`. `git diff --check` passed before the first edit. The readiness source-population digest was recomputed as `ea9673af733a6216342c0e42e6056c6d80232b2b0f00974a70639ef6c2d0f976`; the expanded implementation integration manifest and its deterministic command are recorded in `artifacts/implementation-start/00-source-population-lock.md`.
- Relevant schema/env/legacy contract hashes still matched the readiness lock before edits. The existing dirty T-124 result/dossier/runtime/REU population remains outside Pack A and is preserved. No forbidden source surface was required to start implementation.
- The accepted edit population also names mechanically required integration artifacts: shared package exports/barrel, OpenAPI/API index/context registry, generated DB context and generated env artifacts. These files carry no new domain authority and are updated only through their owning repository workflows.

### 2026-07-13 — Local-development Pack A apply and single-writer cutover

- Interpreted the user's landing authorization against the only discovered named target: loopback PostgreSQL `my_researcher_dev`. No non-local target, provider or scientific path was contacted.
- Recomputed the pre-apply database state, found exactly one pending migration and captured a PostgreSQL 17 custom-format recovery point before the first database write. The live-database-to-datamodel diff also exposed unrelated historical drift, so the operation deliberately used the reviewed versioned migration through `prisma migrate deploy`; `migrate dev`/`db push` were excluded.
- Re-locked the five legacy authority tables with one documented deterministic id-ordered digest. The migration produced 34 v2 tables and zero cross-domain FK while all five legacy digests remained identical. The proof was captured before any separately authorized legacy terminalization.
- Classified the raw submitted HarnessRun as a submission snapshot already resolved by its exact trusted failed monitor/evidence lineage; no back-write or new legacy terminal writer was introduced. The lone running EF job was an unbound mocked capability fixture and was cancelled once through the supported EF route/fake adapter; no cloud call occurred.
- Added a restart-safe existing-environment D-19 typed fixture importer. The importer binds the reviewed source-policy digest, exact-reuses server-issued immutable revisions/lifecycle/readiness state, resumes after partial crashes and emits a complete two-cell admission template without invoking PI or provider code. Local first import and full replay converged.
- Added a config-only one-way cutover guard. `ADMISSION=true/CUTOVER=false` is invalid composition; committed cutover rejects the 16 overlapping PI/EF legacy mutation routes before schema/controller/service/repository while preserving diagnostics. `CUTOVER=true/ADMISSION=false` is the rollback/drain state and never reopens legacy writers.
- Enabled both flags only in gitignored `env/values/dev.local.yaml` and regenerated `.env.local` through env-localctl. Source defaults and every other environment remain false.
- Did not manufacture a local v2 saga because the existing database has no active persisted PI Project/ValidationCycle scope: one completed Cycle exists but the owning Project row is absent. At that historical landing checkpoint, a real app-composition probe temporarily enabled v2 admission and proved the admission path fail-closed at exact scope resolution; current admission is `false`, and the source-backed disposable D-19 gate remains the four-UoW/three-event/acknowledgement acceptance evidence.
- Final read-only local gate verifies the migration checksum/history, exact 34-table allowlist, zero cross-domain FK, source-backed 23-asset/23-attestation population, resolved legacy blockers, durable Prisma composition and valid cutover truth-table state with zero writes/provider/fetch/scientific effects.

## Historical planning snapshot — files/modules touched before Pack A implementation
- Planning/governance only:
  - T-132 canonical task bundle: `dev-docs/active/experiment-foundation-productization-closure/`;
  - T-124 canonical adoption docs: roadmap plus `00-overview.md` through `05-pitfalls.md`;
  - T-131 protocol/promotion docs and `docs/context/process/experiment-foundation-promotion-lane-playbook.md`;
  - T-095 ValidationCycle, T-096 WorkOrder bridge, T-098 result/claim/dossier and T-124 productization docs that own the D-18 shared scope;
  - `docs/context/glossary.json` plus its registry checksum after context touch;
  - T-104 live adapter and T-114 runtime canonical docs that own the D-17 trigger/writer/consumer boundaries;
  - T-091 global architecture and T-092 object/query ownership matrices for minimum cross-project adoption;
  - generated project-hub files after governance sync.
- Product modules touched in that historical planning snapshot: none. The current Pack A implementation population is recorded in the dated 2026-07-13 technical-closure entry and in `artifacts/implementation/00-pack-a-technical-closure.md`.

## Cross-task handoff conditions
- T-131 may close only after T-132 records the first real RunRecipe consumption/readback evidence in both packages.
- T-132 owns the D-01 zero-write cloud preflight. T-106 retains real-provider canary ownership until a later explicit handoff is written into both packages.
- T-124 remains independent. Shared bridge/human-confirmation changes require matching decision and verification entries in T-124 and T-132.
- T-132 D-10 through D-18 PI-owned branch/revision/cell-plan/retrieval/control-projection/current-effective accounting/scientific-conclusion semantics are adopted in T-124 `02-architecture.md`; implementation and joint contract evidence must be recorded in both packages after explicit execution scheduling.

## Deviations from plan
- 2026-07-12: replaced the original trusted-local-execution release gate with cloud-first control-plane simulation and zero-write preflight. LocalScript/fake-provider outputs are now explicitly non-scientific, and real evidence closure is deferred to a separately authorized provider execution.

## Known issues and follow-ups
- Current Pack A status supersedes the remaining stale Phase 0/unscheduled statements: typed v2 identity/readiness, exact source binding, the PI→EF→PI durable head-ack spine, named-local DB apply and formal product admission-to-ack are verified with no final-run blocker. Current local cutover is `true`; admission and simulation are `false`. Broader Pack B/provider/evidence/closure/UI work and separately named non-local environment rollout remain open.
- T-131's promoted EvaluationProtocol contains a benchmark forward ref that must resolve before the control-plane scenario can claim materialization readiness.
- Historical legacy note: generic record/upsert and direct intake compatibility paths remain ineligible for the new chain; Pack A added independent v2 authority instead of upgrading them.
- Historical legacy note: singular PI ResearchWorkOrder storage still lacks the v2 invariants, but Pack A now supplies those invariants in independent additive branch/revision/cell/admission/inbox/outbox families without a fallback path.
- Current EF/PI lifecycle surfaces can conflate terminal simulator lifecycle with Run terminality. D-14 now fixes the target separation; implementation must derive control status from Attempt provenance and leave scientific state untouched.
- Current `autotune_policy`/`allowed_mutation_refs` and range-oriented preparation paths must be inventoried in Phase 0 and excluded from v2 paper-bound runtime cell mutation; D-15 leaves any legacy/standalone semantics unchanged until an explicit migration decision.
- Current T-124 S3/bridge runtime treats trusted failed/cancelled RunEvidenceUnit as dossier accounting input and performs a project-wide REU scan. D-16 now supersedes that target; the mixed status contract, writers, rows, dossier reader and tests form one mandatory atomic migration slice that blocks shared evidence-seam closure until replacement evidence passes.
- Current EF validator does not execute the full EvaluationProtocol and current T-131 v1 cannot satisfy typed readiness. D-17 requires new v2 rule identity/capability gates, exact-batch report hashing and one generated-trust writer before real evidence work can start.
- Current PI Cycle completion accepts caller-authored assessment, `decision_exit` can be written before completion, Result Analysis produces four scenarios/direct packet payload and ResultInterpretationPacket/REU fields can form competing outcome sources. D-17 requires one closure-ready trigger, one proposal, one existing closure writer, one derived exit and closed-Cycle-only consumers in the same atomic migration as D-16.
- Existing pgvector/embedding tables and active-version behavior belong to Literature. T-132 may extract generic technical adapters but must not reuse Literature domain tables/services as the PI/EF retrieval authority.
- A fresh Pack A whole-worktree baseline was captured: shared/backend typechecks passed; shared 318/318 and backend 1885 passed, 0 failed, 39 skipped. Future T-124 changes still require their own regression baseline.
- Existing R-012 and related task statuses/hand-offs should be reviewed during Phase 0; T-132 creation intentionally does not rewrite other task states.

## Pitfalls and dead ends
- Historical/active review findings live in `06-audit-closure-matrix.md`.
- Add only resolved mistakes and dead ends to `05-pitfalls.md`; do not use the pitfalls log as an active issue tracker.

## 2026-07-19 — Pack C C-EF step 4 ScientificValidationService

- Added `ExperimentFoundationScientificValidationV2Repository` plus independent in-memory and Prisma implementations. The read port resolves exact Run/cell/Attempt/head-ack scope and the Run → RunRecipe → VersionLock dependency → typed EvaluationProtocol revision chain; the write port owns result convergence and atomic validation-outcome persistence.
- `recordExperimentResult` rejects caller result ids/content hashes, manifest/cell/TaskSpec/Attempt drift, non-succeeded Attempts and every simulation/fake provenance. It derives a stable result id from the RunCell, hashes the complete envelope server-side and relies on the RunCell unique fence for changed-content conflicts.
- `validateScientificBatch` accepts only Run identity, expected manifest and idempotency key. It requires exactly one result per ordered cell, real provenance, non-empty typed rules and the durable exact head acknowledgement before writing. `required_rules=[]` is deliberately `VALIDATION_SUBJECT_INCOMPLETE`; missing head authority is `VALIDATION_SCOPE_DRIFT`.
- The service executes the frozen validator profile and derives report/Candidate/event ids and all canonical hashes. `passed` persists report/Candidate/one `EvidenceCandidateQualified@v1` outbox atomically; `failed` and `unsupported` persist the report only. Same-key/same-hash and different-key/same-Run/same-hash replays return the stored outcome.
- No route, controller, `app.ts` composition, env contract, shared contract, Prisma schema/migration, database, capability state or legacy writer was changed. C-EF step 5 remains the legacy scientific writer closure; capability wiring and live real-provider Attempt production remain later increments.

## 2026-07-19 — Pack C C-EF step 5a legacy scientific writer closure

- Added the stable shared reason `LEGACY_SCIENTIFIC_WRITER_CLOSED` to the existing experiment-v2 reason registry. The typed failure is `AppError(409, GATE_CONSTRAINT_FAILED)` with `details.reason_code` set to that value, so the existing EF, EF-execution and PI controller mappings preserve one HTTP surface.
- `ExperimentFoundationService.createRecord` and `upsertRecord` now reject `experiment_result`, `result_validation_report` and `evidence_candidate` before validation, identity derivation or repository access. A scientific path kind or body kind closes `upsertRecord`; all non-scientific kinds retain their existing behavior.
- `ExperimentFoundationExecutionService.collectJob` now throws at method entry before external-job lookup, adapter collection, partial-result creation, metric/fact/fine-tuning writes, adapter metadata, stage events or external-job update. The old private creators and heuristic analyzer remain unreachable implementation history pending the separately scoped step 5b removal.
- `PaperImplementationLiveExperimentAdapterService.collectLiveExperimentRun` already directly awaited `collectJob` without a catch or success conversion. Focused service and cutover-off route tests now prove the typed closure propagates unchanged and creates no PI RunEvidenceUnit. Sync and cancel remain working because they do not enter the closed scientific collector.
- Closed code paths: generic EF POST/PUT → service create/upsert; direct EF collect → execution service; PI live collect → live adapter → execution service. Internal callers, scripts, tests and cutover-off app compositions can no longer reach a legacy scientific record write through these entrances.
- Deliberately deferred to step 5b: `accept_partial` vocabulary, accepted-partial branches, partial materialization, legacy non-atomic sequence removal and LocalScript/fake-provider provenance vocabulary. No Prisma, migration, env, app-composition or v2 scientific-validation implementation changed.

## 2026-07-20 — Pack C C-EF step 5b dead collector and request-vocabulary removal

- Deleted every statement below the permanent `collectJob` closure throw, plus the now-unreferenced collection context/protocol loaders, heuristic validator, partial-result/result/metric-observation/evaluation-fact/validation/fine-tuning/evidence creators and their helper types/functions/imports. Submit, sync, cancel, reconcile-adjacent adapter status, metadata/stage-event and job-persistence paths remain unchanged.
- Removed `accept_partial` from `CollectExternalTrainingJobRequest`, `CollectLiveExperimentRunRequest`, both JSON request schemas, the PI live adapter request assembly and the desktop collect form. Shared schema tests now pin that the property is absent, and the PI closure test pins that the forwarded collect input has no such key while the step-5a typed closure still propagates unchanged.
- Deliberately preserved immutable legacy read shapes for D-08 diagnostics/admin access: stored `partial`/`accepted_partial` status vocabulary, `ResultValidationReport.partial_acceptance_ref`, accepted-partial `EvidenceCandidate`/fine-tuning read compatibility, `TrainingTaskPartialResultRef`, `ExperimentResult.partial_result_refs` and `ExternalTrainingJob.partial_result_refs`. No stored schema, Prisma artifact, migration or database was changed.
- The checked-in OpenAPI/API index contains no legacy EF/PI collect request schema population, so no generated artifact changed. `ctl-api-index verify` and strict OpenAPI quality both pass.

## 2026-07-20 — Pack C C-EF step 6 disposable PostgreSQL lane and machine gate

- Added a forced four-test Prisma/PostgreSQL lane for Pack C. It creates acknowledged two-cell Runs from the existing typed Pack A fixture/admission/materialization path, seeds test-only real-provider terminal Attempts, and proves the three scientific families' unique, exact-scope FK and closed CHECK fences.
- The Pack B schema intentionally remains simulation-only until M7. The relational fixture therefore widens only the two Attempt mode/provenance CHECKs inside the nonce-bound disposable database; no schema or migration source changes. All Pack C scientific CHECKs remain unmodified and are exercised directly.
- Passed validation commits report/Candidate/`EvidenceCandidateQualified` outbox in the production Prisma transaction. A disposable PostgreSQL trigger injects an outbox error and proves report/Candidate/outbox rollback. Failed and test-port-injected validator-support-drift outcomes go through the service and persist report only.
- The same real-Prisma composition proves generic create/upsert for the three legacy kinds and `collectJob` return `LEGACY_SCIENTIFIC_WRITER_CLOSED` before writes. The shared disposable identity helper now recognizes the dedicated `packc` nonce/marker namespace.
- Added `.ai/scripts/experiment-foundation-packc-ef-gate.mjs` with the frozen `packc-ef-<date>-r<N>` id, PC01-PC07 + PC19-EF registry, static writer/request census, digest-pinned disposable container, forced zero-skip relational suite, exact summary/evidence/zero/redaction keysets and canonical SHA-256. Docker/PostgreSQL absence maps to exit 2 and `blocked`.
- Sandbox run `packc-ef-20260720-r1` passed PC01-PC05 and PC19-EF, blocked PC06/PC07, and published SHA-256 `sha256:efa5c836e7942c8eb0df1f352619feebe1c1d1fcadb9a1840f9a6ae4636a7750`. Host PostgreSQL closure remains explicitly pending.

## 2026-07-20 — Pack C C-PI step 3 PI Evidence Trust Gateway

- Added a dedicated PI evidence repository port with independent in-memory and Prisma implementations. Exact admitted branch/revision authority is read before EF resolution and fenced again inside `commitEvidenceIngestion`; the Prisma transaction owns the PI receipt, REU, trace and projection outbox as one unit.
- Added the sole event-triggered writer service. It accepts only the EF `EvidenceCandidateQualified@v1` envelope, verifies its shared canonical payload hash and exact PI scope, then reads the EF-owned validation port without writing EF tables. Candidate/report canonical hashes, exact Run/manifest/protocol bindings and `status === 'passed'` are mandatory.
- REU and trace ids/hashes are deterministic and server-derived. The trace is exactly Candidate → validation report → Run → WorkOrder revision → EvaluationProtocol revision, ordinals 1..5. The identity-only ingest request is used only by `getIngestedEvidence`; it cannot trigger writes or carry final authority fields.
- Replays return the stored receipt/evidence without EF re-resolution. A second event for the same Candidate records its own processed receipt but reuses the Candidate-unique REU/trace/outbox. Changed event/envelope content is a terminal conflict; scope and eligibility/provenance mismatches produce rejected receipts with zero evidence writes.
- Added local `RunEvidenceUnitRegistered` v1 as a PI projection-feed outbox event with shared payload/envelope hashing. This extends the frozen Pack A registry and remains uncomposed pending Claude's review addendum; no shared contract or `app.ts` composition changed.
- Durable implementation report: `artifacts/pack-c-preplanning-20260718/report.md`.

## 2026-07-20 — Pack C C-PI D-18 readiness/watermark evaluator

- Added one PI-owned read-only port with independent in-memory and Prisma adapters. It reads the live product Cycle, every PI branch with a current admitted revision, exact PI head revision/Run projections, EF v2 Run cells/Attempts/ExperimentResult refs plus the durable EF head acknowledgement, Cycle-wide active real-provider Attempts, current-scope REUs and the unique v2 closure row. No legacy EF execution repository or writer-oriented gateway/scientific service was used.
- A branch becomes an effective head only when the PI head revision equals the current admitted revision and the EF Run exact branch/revision/hash/sequence/manifest plus `BranchHeadAdvanced` acknowledgement all match. Otherwise the branch stays visible with null head, empty cells/evidence and `BRANCH_HEAD_NOT_FROZEN`. Non-head Runs are excluded from membership but remain included in the independent active-real fence.
- The evaluator code-point-orders branches, cells, Attempts and REU refs; emits only `SCIENTIFIC_EXECUTION_NOT_STARTED` or null for cell eligibility; hashes the timestamp-free watermark through `serverHashPaperImplementationV2ClosureWatermark`; and derives blocked/ready-no-evidence/ready-with-evidence without persistence or caller-authored readiness state.
- `PaperImplementationValidationCycle` has no integer state/version counter, and its timestamp cannot safely populate the closure table's PostgreSQL `Int`. The additive v2 CAS generation is therefore deterministically `0` while the unique closure row is absent; closure existence is terminal/blocked. The next closure service must re-read lifecycle, closure absence, exact branch/revision/head membership and the Cycle-wide active-real fence inside its write transaction.
- The v1 watermark requires at least one branch and has no zero-branch blocker code. A Cycle with no admitted branch therefore throws typed `VALIDATION_CYCLE_HAS_NO_ADMITTED_BRANCHES` and produces no invalid watermark. No schema, migration, env, `app.ts`, gateway/scientific-validation service or T-124 completion code changed.

## 2026-07-21 — Pack C C-PI step 5 closure and write seals

- Added a dedicated default-off v2 Cycle-closure route/service and closure unit-of-work repository. The existing readiness evaluator runs unchanged over the closure transaction adapter; blocker, existing-closure, expected-version and expected-watermark fences precede one atomic closure plus `ValidationCycleClosed@v1` outbox append.
- The control-only path requires zero eligible REUs and null proposal/correction authority, then persists null scientific disposition and selected exit. The scientific kind remains deliberately disabled with the dedicated closure-disabled reason; proposal handling is deferred intact.
- Added a one-method PI closure lookup port and injected it into PI admission/head plus EF materialization/Pack B execution. A closed Cycle returns `CYCLE_ALREADY_CLOSED` before writer/dispatch entry. EF has read-only PI closure visibility and no cross-domain write surface.
- Added `paper_experiment_sidecar` to the permanent 5a generic-writer closure set. Both create/upsert entrances return `LEGACY_SCIENTIFIC_WRITER_CLOSED`; no Sidecar rebuild projection was introduced.
- Composition is hard-defaulted false with a pending-env-key TODO. The legacy `/complete` authority, live product Cycle row, Prisma schema/migrations and env-contract files remain unchanged under Plan B. Full implementation detail is in `artifacts/pack-c-pi-cycle-closure-20260721/report.md`.

## 2026-07-21 — Pack C C-PI step 6 disposable PostgreSQL lane and machine gate

- Added a forced three-test real-Prisma lane under the `packc-pi` nonce/marker identity. Every scenario starts from the D-19 typed fixture and drains real PI admission → EF materialization → PI head → EF acknowledgement. The lane covers gateway transaction/replay/tamper plus PI unique/exact-FK/Trace 1:1 fences, deterministic readiness, no-evidence closure/replay/scope drift/outbox rollback, and the real closure seal across admission/head/materialization/execution and Sidecar create/upsert.
- EF report/Candidate rows are direct fixture inserts because Pack B cannot produce real-provider scientific rows before M7. The fixture boundary is documented in the test; the gateway and every PI domain write use production Prisma repositories/services. No service seam, Prisma schema, migration, env contract or capability value changed.
- Added `packc-pi-<date>-r<N>` with exact PC08-PC16/PC19-PI/PC20 evidence mapping. PC17 is `deferred_to_cutover` only after static proof that no v2 Packet writer exists and `ValidationCycleClosed@v1` has one producer. The same census requires all four real `app.ts` closure lookups, the four-kind 5a Sidecar guard, evaluator zero writes and the untouched legacy `/complete` delegate.
- The summary uses exact keysets, canonical SHA-256, the reviewed digest-pinned pgvector image, zero/redaction censuses and both C-PI migrations. `20260720141000_harden_paper_implementation_pack_c_closure_v2` is explicitly recorded as `UNAPPLIED_TO_NAMED_LOCAL_INFORMATIONAL`; the disposable gate applies full migration history but never connects to named-local PostgreSQL.
- Sandbox gate `packc-pi-20260721-r1` returned exit 2 / `blocked`, with 121/121 non-relational tests, zero skips/failures, PC08/PC14/PC19-PI/PC20 passed, PC17 deferred and every relational-dependent check blocked. Canonical summary SHA-256: `sha256:cc169aeddc81d85df4378a2a0d823e288beca454f50d2dff0e70b22579c1bfd9`. Host PostgreSQL closure remains pending.

## 2026-07-21 — Pack C C-cutover increment 1 D-16 evidence seam

- Closed the legacy WorkOrder monitor/manual attachment constructor and every live-adapter terminal choreography. Monitor intake, sync, collect and cancel now persist monitor/lifecycle facts only; no adapter constructs a `RunEvidenceUnit` or `TraceManifest`. Explicit legacy REU/trace identity parameters fail before side effects with `LEGACY_SCIENTIFIC_WRITER_CLOSED`, and responses identify the v2 Evidence Trust Gateway plus its EF-qualified candidate requirement.
- Removed dossier-wide failed-like REU reconciliation, including `PROJECT_ACCOUNTABLE_RUN_STATUSES`, the unbounded project scan, newer-REU inference and WorkOrder-supersession inference. A ready dossier now requires explicit `(validation_cycle_id, closure_id, closure_snapshot_hash)` refs and verifies exact v2 closure identity, hash and project ownership. Open, tampered and foreign-project refs fail closed; no scan fallback or dual read remains. Historical dossier rows remain readable and unchanged.
- Closed the direct packet POST service and runtime Domain Gate packet materializer with `RESULT_INTERPRETATION_PACKET_MATERIALIZATION_CLOSED`. Result-analysis artifacts may still carry proposal-era analysis content, but no pre-closure path persists a packet. A later increment must add the one-way materializer consuming `ValidationCycleClosed`; this increment deliberately adds no partial replacement.
- Replaced the T-124 assertions for trusted failed/negative/cancelled REUs, runtime/direct packet creation and project-wide S3 accounting with gateway-only, zero-writer, explicit-closure and open/tampered/wrong-project fail-closed coverage. The legacy `/complete` route/service and optional closure-lookup injection default remain untouched for increment 2, as scoped.
- No Prisma schema/migration, env-contract, capability flag, v2 gateway/closure/evaluator service or persisted legacy row was changed. Detailed census disposition and verification evidence are in `artifacts/pack-c-preplanning-20260718/report.md`.
