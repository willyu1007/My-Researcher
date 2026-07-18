# 04 Verification

## Zero-write Aliyun cloud-preflight implementation — 2026-07-18

- Shared cloud-preflight contracts passed 2/2; backend exact payload/read-only-policy/official-SDK-pagination/same-payload tests passed 8/8; gate meta tests passed 3/3. Shared, backend and experiment-foundation script typechecks passed.
- Env contract validation/generation passed for `dev`, `dev.local`, `staging` and `prod`; environment suite passed. The capability default remains `false`, no secret values were generated, and no remote cloud target was registered.
- Shared full passed 359/359. Backend full completed 2,247 tests: 2,197 passed, 0 failed, 50 explicit conditional database/provider skips, 0 todo, duration `417301.75475ms`; those skips are not cloud or relational acceptance evidence.
- Final runner `cloud-preflight-local-20260718-r9` returned exit 2 / `status=blocked`, which is the required fail-closed result for the current configuration. Source Pack B evidence SHA-256 is `7cc6044bc3822e4197f99638b09b7a4f9e90640bb205cde929f98df2b998e9c7`; r9 summary SHA-256 is `77f8f9973f2237e706216c894d55ff44657c6bede27fd32e42c0c6e09a3b07ea`.
- CP01 exact scope, CP04 write hard deny, CP05 read-only allowlist, CP11 zero cloud writes and CP12 zero scientific writes passed. CP02/03/10 are blocked by `ALIYUN_EXECUTION_PROFILE_INCOMPLETE`; CP06-09 remain blocked while the capability is disabled and temporary STS/reviewed policy evidence plus its independent exact-file digest are absent. The gate did not synthesize payload/fake-lifecycle evidence under incomplete profile.
- The exact named-local Run is `ef_run_v2_c4ab7919-2d7b-415c-ab53-201b11464aca`, manifest `sha256:8965ebdfd39f899a56ff242aedc968c0b29dd8048a2cecba1ac3ecdb9342d915`, with two ordered cells. Target/scope/digest resolution ran inside one server-verified read-only repeatable-read transaction. All 88 protected-table digests matched before/after; provider transport operations=0, provider write requests=0, CreateJob calls=0, database writes=0 and scientific writes=0. Scientific status remains `not_started`; evidence eligibility remains false.
- This verifies the implementation and current fail-closed posture only. It does not pass the real read-only cloud checks, close EF-P16, prove signing/endpoints/workspace/quota availability, or validate scheduler/image/mount/network/accelerator/command/log/result/cancel/cleanup behavior. Durable evidence is `artifacts/cloud-preflight-implementation-20260718/00-implementation-closure.md`.
- Dependency verification resolved the SDK graph to `lodash@4.18.1` and `fast-uri@3.1.2`, and Fastify was upgraded to 5.10.0. `pnpm audit --prod --audit-level high` now reports `No known vulnerabilities found`; frozen install, shared/backend typechecks and the complete backend runtime suite pass on the upgraded dependency graph.
- Read-only product-runner regressions passed after helper extraction: Pack B retained 88-table parity, and Pack A verify now accepts the already-landed 28 Pack B rows only when their exact before/after census is unchanged. Pack A apply still requires a zero-row Pack B baseline.

## Formal PI scope → Pack B product execution — 2026-07-15

- Apply run `formal-pi-scope-packb-product-20260715-apply-r1` bound the exact Pack A Run `ef_run_v2_c4ab7919-2d7b-415c-ab53-201b11464aca` / manifest `sha256:8965ebdfd39f899a56ff242aedc968c0b29dd8048a2cecba1ac3ecdb9342d915`, admitted one fixed business key through the normal product route and drained four two-command passes with zero release/terminal error.
- Exact final write census is 2 ProviderPayload, 2 ExecutionAttempt, 12 AttemptEvent, 8 ProviderCommand, 2 CollectionAttempt and 2 diagnostic-only ProvisionalOutput. Each cell projects immutable events `created→submitted→running→succeeded→collection_prepared→collection_collected` and commands `submit→sync→reconcile→collect`.
- After simulation was disabled, read-only run `formal-pi-scope-packb-product-20260715-verify-r2` passed with both exact cells succeeded/collected, no active real Attempt, scientific `not_started`, evidence eligibility false and no foreign Pack B lineage.
- The broadened final fence covered 88 source/PI/Pack A/legacy/scientific tables with `changed_tables=[]`; fetch, real provider, `CreateJob`, PI, Pack A, legacy and scientific writes were zero.
- Regression: shared contract 6/6, backend targeted 67/67, shared/backend/script typechecks and Prisma validate passed; T-132 strict docs 58/58, T-124 strict docs 13/13, governance lint and scoped diff check passed. The bare Prisma invocation without `DATABASE_URL` first failed P1012 as expected; the reviewed named-local env was then loaded and validation passed.
- Canonical evidence: `artifacts/product-pack-b-local-20260715/05-product-execution-closure.md`; apply JSON SHA-256 `2176c0ce7cbd0d83e41d9e133bda2d748c823e40b8e6e70883cc246a3e5beee8`; final verify JSON SHA-256 `7cc6044bc3822e4197f99638b09b7a4f9e90640bb205cde929f98df2b998e9c7`.

## Formal PI scope → Pack A product landing — 2026-07-15

- Apply evidence `artifacts/product-pack-a-local-20260715/02-product-landing-apply.json`: `status=passed`, run `formal-pi-scope-packa-product-20260715-r1`, SHA-256 `ffc579842c2d4a3a55d61d31e6a5aa70657e32ea32acaf103711e76540873355`. The run used active PaperProject `P313` and its exact active bridge/hash, completed the normal PI product prefix and drained all three integration events without provider/network work.
- Final read-only evidence `artifacts/product-pack-a-local-20260715/04-product-landing-verify.json`: `status=passed`, run `formal-pi-scope-packa-product-20260715-verify-r5`, `mutation_performed=false`, SHA-256 `341eba9ae1e38ce282947d9d9554102f04ff5c93fa7cb5564a7152b0c245ee48`.
- Exact final authority: 1 admitted revision, 2 ordered cells, 1 VersionLock with 23 dependencies, 1 RunRecipe, 2 TaskSpecs, 1 Run with 2 RunCells, branch head bound to that Run, and 1 final EF acknowledgement. PI inbox/outbox counts are 1/2; EF inbox/outbox counts are 2/1.
- Config fence: cutover `true`, admission `false`, workflow simulation `false`. `env-localctl` doctor and both pre/post compile records are stored beside the JSON evidence; source defaults remain fail-closed.
- Forbidden-write fence: legacy remains 257 rows at `sha256:f9e7a6875c9a3597ecb485abc978920e461a3af33f071c676665439dde17211d`; selected scientific sentinel remains 4 rows at `sha256:45b14c69cb36a4b43f7096b4523fe030c27c12e71bde706f2d140292ecbe88b2`; all six Pack B tables remain empty.
- Regression: Pack A product script typecheck passed; targeted cutover/import/spine suites passed 48/48; backend typecheck and Prisma validate passed. Strict docs/governance results are recorded in the closure artifact after the final publication run.

## Pack A/Pack B deep-cleanup closure — 2026-07-15

### Final disposable PostgreSQL gates

- `EXPERIMENT_FOUNDATION_D19_SOURCE_POLICY_ATTESTATION_PATH=dev-docs/active/experiment-foundation-productization-closure/artifacts/source-policy/00-d19-source-policy-attestation.json node .ai/scripts/experiment-foundation-d19-spine-gate.mjs --run-id d19-deep-cleanup-final-20260715-r19`: `status=passed`, `blockers=[]`; source policy and A01-A04/B01-B10 all passed; exact source-policy attestation digest `sha256:48dd3546bcf314c478f80a5bc6ba5bcc0ecc57b848ac0d83fd7d5c9b8ac3bb6e`; standalone real-PostgreSQL relational tests passed 6/6 with 0 skipped, marker reset was verified and the disposable container was cleaned. Summary SHA-256 is `9961eec956d216c65d1ac24be57214c05680dd7c1ae6d8ea510c8dbcef73a647`.
- The three event outcomes are exactly `WorkOrderRevisionAdmitted@v1`, `RunManifestFrozen@v1` and `BranchHeadAdvanced@v1`; all three report `payload_only_storage=true`, `payload_hash_verified=true`, `envelope_hash_verified=true` and `delivered=true`.
- Event/storage hardening reports migration `20260714210000_normalize_experiment_v2_event_payloads` at SHA-256 `37eed54494aa2dc246fe7d5a9b2de2a027474b416ada8a5f18ab4bc194a65f3a`, four payload-only event tables, eight added structural columns, 38 hardened Pack A foreign keys, nine fixed-version CHECK constraints and zero cascade operations.
- `d19-deep-cleanup-final-20260714-r13` intentionally remains fail-closed invocation evidence: an obsolete attestation path returned overall `blocked`, while A01-A04/B01-B10 and container cleanup themselves passed. r13 is not a product failure and the gate did not default-pass source policy; r19 supersedes r13 with the canonical path, one portable reviewed-digest constant and frozen ordered source-policy slots.
- `node .ai/scripts/experiment-foundation-packb-simulation-gate.mjs --run-id packb-deep-cleanup-final-20260715-r16`: `status=passed`, `blockers=[]`; PB01-PB16 all passed, shared targeted 6/6, backend targeted 89/89, forced real-PostgreSQL Pack B relational 7/7 with zero skipped, embedded Pack A relational 6/6 with zero skipped, marker reset and script typecheck passed, real provider/scientific/legacy writes were zero and the disposable container was cleaned. Summary SHA-256 is `207450f7104b24542574f883ea2e851425e11412c03f21e65413444d3c2bfd6d`.
- The D-19 T2 relational negative rechecked exact attestation/ordered dependencies/23 lifecycle projections/Dataset location under one batched `FOR SHARE` transaction before its first write and proved zero partial T2 family rows on drift. Foundation storage inspection found 0 remaining placeholder columns.
- Signed PostgreSQL `Int` boundaries are enforced end to end: seed/repeat/run-policy inputs outside `-2147483648..2147483647` fail before Prisma, while revision/lifecycle/projection/state/head/relay/lease/attempt increments at `2147483647` fail before commit/dispatch with zero partial writes. OpenAPI contains exactly 22 T-132 persisted integer fields with `format: int32` and maximum `2147483647`; both seed fields also have minimum `-2147483648`, and `experiment-v2-openapi-contract-drift.test.ts` fixes that census.
- Every Pack A/Pack B authority read now validates the closed typed snapshot, code-owned schema/hash profile and canonical hash, then compares relational mirrors, ordered dependencies/cells and enum allowlists before returning a domain object. Persisted provider-payload/command/Attempt JSON, PI branch/revision/cell/event state, EF asset/readiness/materialization/ack state and exact `RunManifestFrozen.task_spec_bindings` all fail closed on tamper; no unchecked cast or self-consistent rewritten JSON can unlock E1.
- Event, command and provider-control hash profiles are explicit frozen allowlists. ProviderCommand must match its authoritative Attempt's provider payload id/hash on every read, claim, heartbeat, release, outcome and collection path; cancel terminal reason must match Attempt/command semantics. Tamper tests prove any identity/profile/reason drift produces zero database write and zero transport.
- T2 repeats the exact typed readiness qualification/blocker/dependency-role/attestation-hash checks inside its PostgreSQL `FOR SHARE` transaction before the first write. Public PI/EF services map repository integrity failures to stable top-level error codes plus `details.reason_code`, including replay/read paths rather than leaking infrastructure errors.
- `pnpm experiment-foundation:packb:gate:meta`: script typecheck passed, gate meta 70/70 passed and the unified backend disposable-PostgreSQL identity/guard lane passed 10/10 with 0 skipped. The exact same validator and marker assertions serve both gates, including before/after reset; randomized database-name/comment-marker/URL checks prevent fallback to a named or inherited target. Shared full passed 330/330.
- Gate summaries, imported Pack A evidence and durable publisher input use exact keysets. Every expected zero-census and redaction key is required, and unknown/missing/substituted keys fail before acceptance/publication.
- Static consumption verification removed exactly 14 zero-consumer shared row schemas plus newly dead helper schemas and preserved interfaces, request/event/error schemas and directly imported IO schemas. Shared contract tests/typecheck cover the remaining public surface. Hash-pattern scans show the production SHA-256 regex centralized in the experiment-v2 limit module. Strict OpenAPI verification passed and the API index was regenerated.

### Named local-development cleanup and read-only proof

- Migrations `20260714190000_remove_experiment_foundation_v2_placeholders` and `20260714210000_normalize_experiment_v2_event_payloads` were applied only to the reviewed `my_researcher_dev` target; migration history is 62/62. The latter's source/database SHA-256 is `37eed54494aa2dc246fe7d5a9b2de2a027474b416ada8a5f18ab4bc194a65f3a`; earlier migration checksums remain unchanged.
- Before 210000 apply, the read-only gate reused the Pack A authority census and recorded 0/0/0/0 rows for PI inbox, PI outbox, EF inbox and EF outbox respectively. The zero-row result was a necessary precondition only, never apply authorization. When 210000 is pending, any nonzero named event table now blocks with `EVENT_STORAGE_HARDENING_NONEMPTY_EVENT_TABLES` and requires a separately authorized transform/replacement migration; partial structural columns, checks or FK hardening fail with `EVENT_STORAGE_HARDENING_UNTRACKED_OR_PARTIAL_SCHEMA`.
- Focused tests passed 14/14 for zero/nonzero/incomplete census, pending-baseline/partial/applied structure and status derivation. Read-only applied-path run `event-storage-upgrade-preflight-applied-20260714-r1` returned `status=passed`, `failures=[]`, `blockers=[]`, four named counts at 0/0/0/0 and all prohibited effects at zero; its evidence explicitly says `migration_apply_authorized=false` because the gate never grants apply authority.
- The semantic Pack A authority profile v2 intentionally omits only those never-read placeholders. The read-only pre-apply and post-apply gates both measured 208 rows at `sha256:494cdf5a02e2379a66a12bc82411e8237f39e949a2f992f3e12a0e220f613d74`; legacy remained 257 rows at `sha256:f9e7a6875c9a3597ecb485abc978920e461a3af33f071c676665439dde17211d`.
- Final named-local read-only gate `packb-deep-cleanup-final-local-20260714-r18` returned `status=passed`, `failures=[]`, `blockers=[]`; Pack A 34/34, Pack B 6/6 and combined 40/40 tables are exact, Pack B rows are 0, PI-to-EF FK count is 0, legacy remains 257 rows at `sha256:f9e7a6875c9a3597ecb485abc978920e461a3af33f071c676665439dde17211d`, all three flags are false and prohibited effects are zero. Its source artifact SHA-256 is `53e269275d5b082d2b1f82ad6b2ed47a324380470479de3b0598be6a62a16a0c`.
- Final local app-composition run `packb-deep-cleanup-final-local-20260714-r18` used schema v5 over the same reviewed target. Its source artifact SHA-256 is `37d262fa11fc45015d5e24320e963459034df77f2857074e3fea9476891de1b9`; all 238 application tables had exact before/after parity, changed-table count was 0, fetch was hard-denied with 0 attempts and provider-command row delta was 0.
- Durable `05-app-composition-smoke.json` remains schema `experiment-foundation-packb-local-app-smoke@v5`; `06-final-gate-summary.json` is schema `experiment-foundation-packb-local-landing-summary@v4`. App composition measured 238 application tables before/after, changed-table count 0, external fetch 0 and provider-command row delta 0. At that deep-cleanup checkpoint, named-local admission/cutover/simulation flags were all `false`; the later formal Pack A landing supersedes only the config/head state.
- Checked-in SHA-256 after strict exact-keyset/redaction publication: app smoke `9f4e0e5f81d4f127ac1cd5c956c639a8f89a9406d0af873e5d06d2d039f10e4e`; final gate `bd702c6aca7104248839da1bb224e711d9eee64ddf6a98e4824f713b03e8eaad`; publisher producer `982119a31989bbad1da51ae96892241bab90add1ee084031596f550350838c38`.
- Recovery point: `/Volumes/DataDisk/Project/.backups/My-Researcher/packb-quality-remediation-20260714-r1/my_researcher_dev.pre-cleanup.dump`, exact size `8399040887` bytes, SHA-256 `0692d19e6e4ec2ea54389e229eae443b1c5f360e286a8203f9b4b979a4b00ecf`.
- `.ai/.tmp/experiment-foundation-productization/**` contains only ephemeral run output and is deleted after publication. The canonical task package plus checked-in `artifacts/` files are durable evidence; closure does not depend on preserving the temporary run directories.
- Backend full suite after r19/r16: 2,083 tests, 2,034 passed, 0 failed, 49 conditional skips, 0 todo, duration `396225.938458ms`. The 49 repository-wide conditional database/provider-canary skips are not Pack A/Pack B database acceptance evidence; T-132 database evidence is the forced disposable-PostgreSQL D-19 relational lane 6/6 and Pack B relational lane 7/7, both with 0 skipped. No real provider/fetch, scientific write/evidence, D-18 closure, product E1-E5, non-local DB or traffic cutover was executed.

## Earlier Pack B quality-remediation checkpoint — 2026-07-14

### Disposable PostgreSQL and targeted gates

- Command: `node .ai/scripts/experiment-foundation-packb-simulation-gate.mjs --run-id packb-quality-remediation-final-20260714-r7`.
- Result: `status=passed`, `blockers=[]`; PB01-PB16 all passed.
- Hermetic target: `pgvector/pgvector@sha256:a132765ec351c65111b5b675928a3a0515a466a40f97277329db8b8209ad8bc9`; fresh nonce-named D-19/Pack B databases were identity-marked, the existing database URL was unused and the container was cleaned.
- Targeted suites: shared 6/6 passed; backend 63/63 passed; forced real-Prisma relational 5/5 passed, 0 skipped. Script typecheck passed for all five checked-in EF TypeScript scripts.
- Effective Pack B schema: 15 same-domain FKs, 35 CHECK constraints and 38 indexes; all immutable FKs use restrictive update/delete actions; `collectionSequence` and three redundant collection indexes are absent; the Cycle-wide active-real fence index is present; cross-domain FK count is 0.
- Effective schema definition digests: FK `ce9f1a0866eaac5114921eaf4132d8652df308fbbab466aebde23689e1e8de71`; CHECK `868ddb26146bec215b69c572ac54c8b0ab3f667a83b5ce3c672db590c45b9040`; index `764a29546bba534cdfe3d1544662c58403a87fbbaff26e8d543c780b45bf4449`.
- Golden write census remained exactly 2 ProviderPayload, 2 ExecutionAttempt, 12 AttemptEvent, 8 ProviderCommand, 2 CollectionAttempt and 2 diagnostic-only ProvisionalOutput rows. All 231 non-Pack-B application tables were unchanged.
- PB14 queried all `real` Attempts in `prepared | submitted | running` for the Cycle with no Run/head filter and returned zero; all Pack B writers persisted `simulation`/`non_production_fake_provider` only.
- Prohibited effects: real provider request=0, `CreateJob`=0, fetch=0, legacy writes=0 and scientific writes=0; Run/cells remained `scientific_execution_status=not_started`, `evidence_eligibility=false`.
- Ephemeral summary SHA-256: `35dbc7f2f6b623a32cda193ef7a0efe91bb6b8efc48d1568e16b1c4980287af0`; relational evidence SHA-256: `3eec3edf32111b6a4da96bebac71c1507904ed5760243804987722d2aa60ff73`. Exact durable handoff is `artifacts/implementation/05-pack-b-quality-remediation-closure.md`.

### Named local-development cleanup and read-only proof

- Recovery point: PostgreSQL 17 custom-format dump at `/Volumes/DataDisk/Project/.backups/My-Researcher/packb-quality-remediation-20260714-r1/my_researcher_dev.pre-cleanup.dump`; size `8,399,040,887` bytes; SHA-256 `0692d19e6e4ec2ea54389e229eae443b1c5f360e286a8203f9b4b979a4b00ecf`; mode `0600`; PostgreSQL 17 `pg_restore --list` passed.
- `pnpm db:dev:migrate` applied only `20260714160000_harden_experiment_foundation_pack_b_v2`; 60/60 migrations are applied. Source/database checksum is `05ddb7fa653e76b66fc6c0c4747b3680e3815a44dc672b8a61042310911dd5b8`; original Pack B checksum remains `c0c49f0f7a268f09619f6c693a1f41955ce6cb1b36b656dd9c8e1d51abe0f70e`.
- Final read-only run `packb-quality-remediation-local-20260714-r5` passed: Pack A 34/34 with 208 rows/digest `sha256:1cad10a03db2343283cf3c313ab4585c9935a3f315f3335f6996939ec8490881`; Pack B 6/6 with 0 rows; legacy 257 rows/digest `sha256:f9e7a6875c9a3597ecb485abc978920e461a3af33f071c676665439dde17211d`.
- App-smoke schema v5 passed over all 238 application tables using `sha256-length-prefixed-pg-jsonb-text-primary-key-order@v2`, read-only cursor fetch size 64, disabled background work and hard-denied fetch. Before/after table set and row digests matched; changed tables=0, external fetches=0, provider-command row delta=0.
- Historical checkpoint before the final producer-provenance republish: local source evidence digests were gate `b0973025be9c94bdd127f30a877b9a87ae974cf39cef0025800609ddd830b0e1` and app smoke `08e588b98e836f5ea732e83411d0df2fede1efa6021dfbf79c64abd8f1baaa5c`; the then-published JSON SHA-256 values were `6003bc6a00c14ffbd0c890803ea8830a29d215ca1ea90e3d45f153c11d3536f2` and `572c4bc6b1acabc9fb62be7500cf58508972cf41c2ad12701ed6c4569aa2d417`. These are historical hashes, not the current checked-in file hashes recorded in the final deep-cleanup section above.

### Repository-wide closure checks

- Shared/backend typecheck, Prisma validate, EF script typecheck, strict OpenAPI verification and DB/API context regeneration passed.
- Final full suites: shared exited 0 across 30 files with TAP `1..326`, 326 tests/326 passed, 0 failed/skipped/cancelled/todo. Backend exited 0 across 193 files with top-level TAP `1..1988`, 2,005 tests, 1,961 passed, 0 failed, 44 expected skipped, 0 cancelled/todo and duration `376935.774042ms`. No test failed.
- Final T-132 strict docs lint: 49/49 Markdown files passed with 0 errors and 0 warnings.
- The Pack B quality closure does not grant product E1-E5, D-18/scientific closure, real cloud/provider, non-local rollout, UI/search or product traffic acceptance.

## Pack B named local-development landing — 2026-07-14

- Recovery point: 7.8G PostgreSQL 17 custom-format dump, SHA-256 `0b167c08ad461e98fd25f5592bbc31dfb01b67e2f1fa49bb02d753fa95588987`; PostgreSQL 17 `pg_restore --list` passed, archive reports 2,062 TOC entries and files retain owner-only permissions.
- Apply: `pnpm db:dev:migrate` applied only `20260713210000_add_experiment_foundation_pack_b_provider_control_v2`; `prisma migrate status` reports 59/59 up to date and database/source checksum parity at `c0c49f0f7a268f09619f6c693a1f41955ce6cb1b36b656dd9c8e1d51abe0f70e`.
- Disabled gate/smoke: `packb-local-postapply-disabled-20260714-r1` and `packb-local-post-disabled-smoke-20260714-r1` passed; simulation returned 409/`EF_V2_WORKFLOW_SIMULATION_DISABLED`, legacy mutation returned 409/`LEGACY_RECORD_NOT_ELIGIBLE`.
- Historical local-enable probe: `env-localctl compile` and `doctor` passed; `.env.local` stayed `0600`, effective local simulation was temporarily `true` for that checkpoint and the repository default remained `false`. Current local simulation is `false`.
- Enabled gate/smoke: `packb-local-enabled-presmoke-20260714-r1` and `packb-local-enabled-postsmoke-20260714-r1` passed; missing-Run simulation/status returned 404/`EXECUTION_HEAD_ACK_REQUIRED`, legacy mutation remained 409/`LEGACY_RECORD_NOT_ELIGIBLE`.
- Final database proof: Pack A 34/34, Pack B 6/6 and combined 40/40 exact tables; Pack A authority 208 rows at digest `sha256:1cad10a03db2343283cf3c313ab4585c9935a3f315f3335f6996939ec8490881`; five legacy sentinels 257 rows at digest `sha256:f9e7a6875c9a3597ecb485abc978920e461a3af33f071c676665439dde17211d`; six Pack B tables all 0 rows; PI-to-EF FK, provider call, fetch and scientific execution counts all 0.
- Scope conclusion: named-local schema apply and capability activation passed. Product E1-E5 did not run because the database has no formal Pack A admitted Run/head acknowledgement. No fixture bootstrap, non-local rollout, real provider, scientific result/evidence, Cycle closure or traffic switch is claimed.
- Durable evidence: `artifacts/db/pack-b-local-development-20260714/` and `artifacts/implementation/03-pack-b-local-landing-closure.md`.

### Post-landing regression

- `node --test .ai/scripts/experiment-foundation-packb-local-landing-gate.unit.test.mjs .ai/scripts/experiment-foundation-packb-simulation-gate.unit.test.mjs`: 17/17 passed.
- Shared execution-v2 contract test from `packages/shared`: 5/5 passed.
- Seven backend execution-v2 repository/route/cutover/service/scheduler/worker/payload suites from `apps/backend`, with database and provider env removed: 43/43 passed, 0 skipped.
- `pnpm --filter @paper-engineering-assistant/shared typecheck`: passed.
- `pnpm --filter @paper-engineering-assistant/backend typecheck`: passed; the existing pretypecheck hook regenerated only the ignored Prisma client under `node_modules`.
- Prisma validation initially returned `P1012` because the process had not loaded `DATABASE_URL`; `node --env-file=.env.local node_modules/prisma/build/index.js validate --schema prisma/schema.prisma` then passed without connecting to or mutating the database.
- `node .ai/tests/run.mjs --suite environment`: passed, run `20260713-164015-88c9cb`; temporary evidence was cleaned.
- `node .ai/tests/run.mjs --suite database`: passed, run `20260713-164016-8ee0c6`; temporary evidence was cleaned.
- `node --check` passed for both Pack B simulation and local landing gate scripts.

## Pack B disposable-PostgreSQL closure verification — 2026-07-13

- Command: `node .ai/scripts/experiment-foundation-packb-simulation-gate.mjs --run-id packb-20260713-final4`
- Result: `status=passed`, `blockers=[]`; PB01-PB16 all passed.
- Disposable target: pinned `pgvector/pgvector:0.8.0-pg16`; the gate used fresh `d19` and `packb` databases, set `existing_database_url_used=false`, and cleaned the container successfully.
- Migration: Pack B SHA-256 `c0c49f0f7a268f09619f6c693a1f41955ce6cb1b36b656dd9c8e1d51abe0f70e`; exactly six approved tables, zero PI FK, legacy ALTER/data mutation, excluded family or delete cascade.
- Targeted tests inside the gate: shared 5/5 and backend 43/43 passed with zero skipped. The relational file was removed from the pre-database targeted pass and forced after Pack B migration with `EXPERIMENT_FOUNDATION_EXECUTION_V2_RELATIONAL_PRISMA=1`; 4/4 passed, 0 skipped.
- Final full regression: shared typecheck passed and shared tests passed 323/323; backend typecheck and Prisma schema validation passed; backend tests reported 1,982 total, 1,939 passed, 0 failed and 43 expected DB/live-provider opt-in skips. Prisma validation used an unreachable loopback placeholder URL only to satisfy schema variable parsing and did not connect to a database.
- Relational concurrency coverage: invalid E3 full rollback; concurrent E1 exact convergence and workflow-binding drift rejection; concurrent pre-submit same-key cancel convergence; cancel-during-leased-submit persistence plus claim deferral until E3.
- Focused cancellation/recovery coverage: pending-submit zero-transport cancel; leased-submit durable intent/replay/restart; E3/enqueue 409 zero-partial conflict plus same-key recovery; cancel-before-sync priority; both leased sync/cancel CAS orderings without lease-expiry delay; cancel intent defeating an already leased reconcile before E4; accepted-response-loss replay; stale lease-version rejection; manual/automatic reconcile identity separation; committed drain after head advance/capability disable.
- Golden write census: 2 ProviderPayload, 2 ExecutionAttempt, 12 AttemptEvent, 8 ProviderCommand, 2 CollectionAttempt and 2 diagnostic-only ProvisionalOutput rows.
- Isolation census: 231 non-Pack-B application tables measured, zero changed. Exact Run, two RunCells, two TrainingTaskSpecs and final head-ack receipt digests were unchanged.
- Prohibited effects: real provider request=0, `CreateJob`=0, fetch=0, legacy writes=0, scientific writes=0; `scientific_execution_status=not_started`, `evidence_eligibility=false`.
- Redaction: no database URL/password, canonical payload bytes or real provider credentials were stored in evidence.
- Summary: `.ai/.tmp/experiment-foundation-productization/packb-20260713-final4/summary.json` (SHA-256 `456ed62ac01de9055c8720d0dfdbdb3b5c43a4979b228c1c2cc240b866f553da`).
- Relational evidence: `.ai/.tmp/experiment-foundation-productization/packb-20260713-final4/relational-tests.json` (SHA-256 `e4ffdf0014db52da36a6b6a70035a55b82d8ab7e84e9fd6d2c80dcc7e9bd846a`).
- Context handoff: env contract validate/generate passed; DB context was regenerated from Prisma; OpenAPI strict verification passed; API index was regenerated with five Pack B endpoints and 192 total endpoints; strict context and project-state verification passed.
- Durable closure: `artifacts/implementation/02-pack-b-technical-closure.md`.

At the 2026-07-13 disposable technical-closure checkpoint, no existing local/dev/staging/prod database had received the Pack B migration, no Pack B capability was enabled and no product/provider/scientific cutover had occurred. The later named local-development schema/capability landing is recorded in the preceding section and does not claim product E1-E5.

## Pack A named-local landing verification — 2026-07-13

- Scope: the named local-development PostgreSQL target only. No dev/staging/prod database, cloud/provider path or scientific execution was changed or invoked.
- Recovery point: before apply, the complete local schema received a PostgreSQL 17 custom-format backup. The `7.8G` dump has SHA-256 `021be380ee58580d33905135838500faa86b2200b81ba09407447d1c2771c4e0`; `pg_restore --list` passed with `1786` entries, and the backup directory/dump remained owner-only.
- Versioned apply: `pnpm db:dev:migrate` used `prisma migrate deploy` and applied only `20260713180000_add_experiment_foundation_d19_v2_spine`. Migration history is 58/58 up to date; the applied checksum matches `ab7e86a3a717f80981052865d151f71938d6652e1d6ad93c9972df72c934ca46`; the approved table census is 34 and PI↔EF cross-domain foreign-key count is 0.
- Migration isolation: the same deterministic query proved all five legacy row counts and digests identical immediately before and after migration. The later authorized cancellation of one fake-capability residue is a separately recorded maintenance operation and is not attributed to the migration or v2 saga.
- Legacy cutover readiness: the sole raw `submitted` HarnessRun has exact trusted terminal monitor/evidence lineage and zero unresolved lineage; its immutable historical row was not changed. The sole raw `running` ExternalTrainingJob was an unbound fake-client capability residue, was cancelled once through the existing EF route, and left `running=0` with zero provider/result/evidence writes.
- Typed fixture: the first local import created exactly 23 typed identities/revisions, 48 lifecycle events and 23 readiness attestations. Exact replay reused all 23/23/48/23 rows without duplicates and preserved reviewed source-policy digest `sha256:48dd3546bcf314c478f80a5bc6ba5bcc0ecc57b848ac0d83fd7d5c9b8ac3bb6e`.
- Historical single-writer probe: source defaults remained `false`; at that checkpoint gitignored local overrides set `PAPER_IMPLEMENTATION_EXPERIMENT_V2_CUTOVER_COMMITTED=true` and `PAPER_IMPLEMENTATION_EXPERIMENT_V2_ADMISSION_ENABLED=true`. The cutover guard closed 8 PI plus 8 EF overlapping legacy mutations before their controllers, preserved diagnostic reads and committed relay drain, and rejected the invalid `admission=true/cutover=false` state. Both current local values are `false`.
- App composition smoke: a legacy mutation returned 409/`LEGACY_RECORD_NOT_ELIGIBLE`, a legacy diagnostic read returned 200, and the full v2 admission request passed the capability guard before returning 404/`BRANCH_SCOPE_CONFLICT` for the deliberately absent PI scope. A gate rerun proved that smoke created no partial write.
- Final read-only gate: `packa-local-landing-20260713-final-r2` returned `status=passed`, `failures=[]` and `blockers=[]`; migration/schema/fixture/legacy-blocker/cutover checks passed, and the gate reported zero database mutation, provider call, external fetch attempt and scientific execution.
- Post-review read-only gate: `packa-local-landing-20260713-post-review-r3` also returned `passed`; PASS now requires exact endpoint and reviewed cluster/database/schema fingerprint, exact named database/schema identity, verified read-only transactions, strict cutover booleans, exact draft/freeze-receipt bindings and the complete lifecycle-event/projection source chain. A fingerprint-checked writable CLI replay exact-reused 23 identities, 23 revisions, 48 lifecycle events and 23 readiness attestations with zero new row.

The local database has no active persisted PI Project/ValidationCycle scope. The landing therefore did not fabricate a local project, Cycle or authority saga merely to produce rows. The named-local evidence proves safe apply, exact typed substrate population and one-way product-writer cutover; the complete T1–T4 one-revision/two-cell/one-Run/one-head/one-ack proof remains the source-backed disposable run `packa-d19-source-policy-20260713-r2` below.

Durable evidence:

- `artifacts/db/local-development-20260713/00-preapply-baseline.md`
- `artifacts/db/local-development-20260713/01-migration-apply-and-postverify.md`
- `artifacts/db/local-development-20260713/02-legacy-cutover-maintenance.md`
- `.ai/.tmp/experiment-foundation-productization/packa-local-landing-20260713-r1/fixture-import-summary.json`
- `.ai/.tmp/experiment-foundation-productization/packa-local-landing-20260713-r1/fixture-import-replay-summary.json`
- `.ai/.tmp/experiment-foundation-productization/packa-local-landing-20260713-final-r2/local-landing-gate.json`
- `.ai/.tmp/experiment-foundation-productization/packa-local-landing-20260713-post-review-r3/local-landing-gate.json`
- `.ai/.tmp/experiment-foundation-productization/packa-local-landing-20260713-post-review-r3/fixture-import-replay-summary.json`

## Pack A post-review hardening verification — 2026-07-13

- Run id: `packa-d19-post-review-hardening-20260713-r4`
- A01-A04/B01-B10: all `passed`; disposable PostgreSQL started and cleaned up; excluded writes and external fetches remained 0.
- Importer concurrency: two imports ran concurrently against real PostgreSQL. One created 23 identities/revisions, 48 lifecycle events and 23 readiness attestations; the other exact-reused 23/23/48/23, and a subsequent replay exact-reused the same population. Exact refs and the EvaluationProtocol readiness receipt converged.
- The first two hardening attempts were intentionally retained as failure evidence: `r2` exposed transient lifecycle event/projection observation drift and `r3` exposed transient identity/revision/receipt observation drift. Both were fixed with bounded complete-prefix rereads; existing persistent-drift tests remain fail closed.
- Cutover focused tests: 7/7 passed, including malformed admission/cutover values failing app startup. Local landing gate unit tests: 10/10 passed, including wrong database/schema, read-only/schema identity, receipt/draft-state and lifecycle-source-event negative cases. Importer focused tests: 9/9 passed.
- Full hardening backend suite: 1,942 total, 1,903 passed, 39 expected skipped and 0 failed in `427983.643083ms`. Backend typecheck and the focused target-fingerprint/importer/local-gate suites also passed.
- Evidence: `.ai/.tmp/experiment-foundation-productization/packa-d19-post-review-hardening-20260713-r4/summary.json`.

Documentation checks after the named-local evidence update:

- `node .ai/scripts/lint-docs.mjs --path dev-docs/active/experiment-foundation-productization-closure --strict`: 36/36 Markdown files passed, 0 errors and 0 warnings.
- `node .ai/scripts/lint-docs.mjs --path dev-docs/active/paper-implementation-productization-hardening --strict`: 12/12 Markdown files passed, 0 errors and 0 warnings.

## Pack A source-backed closure verification — 2026-07-13

- Run id: `packa-d19-source-policy-20260713-r2`
- Gate summary: `.ai/.tmp/experiment-foundation-productization/packa-d19-source-policy-20260713-r2/summary.json`
- Summary file SHA-256: `246ab54eb6a611ec9c1d4430e0cdadb6913989e6561dcc6617e95b6775fc675f`
- Overall/source-policy state: `passed` / `passed`
- Source-policy reason/blockers: `null` / `[]`
- Canonical attestation digest: `sha256:48dd3546bcf314c478f80a5bc6ba5bcc0ecc57b848ac0d83fd7d5c9b8ac3bb6e`
- A01-A04 and B01-B10: all `passed`
- Migration digest: `ab7e86a3a717f80981052865d151f71938d6652e1d6ad93c9972df72c934ca46`
- Disposable database: `pgvector/pgvector:0.8.0-pg16`; existing database URL unused; cleaned up
- Product capability default: `false`; external fetch count: 0

The final run preserved the exact one-revision/two-cell/one-Run/one-head/one-ack authority state, four domain-local commits, three delivered events, 197-table non-v2 digest parity and zero excluded writes. EF-P25 is verified. At the time of the source-backed run, EF-P27 remained in progress pending separately authorized DB apply and product-writer cutover; the named-local landing above later verified EF-P27 for the local-development target only.

Final regression evidence:

- `pnpm --filter @paper-engineering-assistant/backend test`: 1,926 total, 1,887 passed, 39 expected skipped, 0 failed; `372405.692333ms`;
- shared full suite: 318/318 passed;
- D-19 gate unit suite: 10/10 passed;
- source-policy targeted suite: 16/16 passed;
- shared/backend typecheck, Prisma validate, T-124/T-132 strict docs lint and governance lint: passed at implementation-lane closure.

Read-only summary assertion:

```bash
jq -e '.status == "passed" and .source_policy.status == "passed" and
  (.blockers | length == 0) and
  ([.checks[] | .status] | all(. == "passed")) and
  (.capability.product_default == false) and
  (.disposable_postgres.existing_database_url_used == false) and
  (.disposable_postgres.cleaned_up == true) and
  (.excluded_write_census.changed_table_count == 0) and
  (.excluded_write_census.total_write_delta == 0) and
  (.excluded_write_census.external_request_probe.fetch_call_count == 0)' \
  .ai/.tmp/experiment-foundation-productization/packa-d19-source-policy-20260713-r2/summary.json
```

Outcome: passed. Durable exact evidence and boundaries are in `artifacts/implementation/01-pack-a-source-policy-closure.md`.

The source-backed verification closes control-plane source binding only. The source-backed result does not prove full-corpus download/re-hash, extraction or derived-corpus identity, NQ↔Wikipedia scientific alignment, provider execution, existing-environment DB apply or product cutover; the named-local section separately records the later local-only apply/cutover evidence.

## Pack A technical verification — historical source-policy blocker superseded

The run below remains the authoritative technical-only history. Its `SOURCE_POLICY_UNRESOLVED` state was superseded by `packa-d19-source-policy-20260713-r2`; its technical, migration, replay and digest evidence remains valid.

- Run id: `packa-d19-final-20260713-r2`
- Gate summary: `.ai/.tmp/experiment-foundation-productization/packa-d19-final-20260713-r2/summary.json`
- Technical checks: A01-A04 and B01-B10 all `passed`
- Overall gate state: `blocked`
- Sole blocker: `SOURCE_POLICY_UNRESOLVED`
- Disposable database: `pgvector/pgvector:pg16`; newly created, full 58-migration history applied, then cleaned up
- Existing database use: false
- Product capability default: false
- Migration digest: `ab7e86a3a717f80981052865d151f71938d6652e1d6ad93c9972df72c934ca46`

| Evidence | Result |
|---|---|
| exact typed asset/hash/readiness substrate | passed for 2 Dataset, 2 DataPolicy, 17 MetricDefinition, 1 Benchmark and 1 EvaluationProtocol revisions |
| four domain Units of Work | T1-T4 committed; T1-T3 rollback probes passed; T4 produced the single final receipt only |
| three integration events | all delivered; exact replay converged |
| concurrent admission | two simultaneous real-PostgreSQL requests produced one commit and one exact replay with one authority census |
| final D-19 state | 1 admitted revision, 2 cells/TaskSpecs, 1 VersionLock, 1 RunRecipe, 1 Run/manifest, 1 branch head, 1 EF acknowledgement |
| excluded writes | 197 non-v2 application tables unchanged; instrumented fetch count 0 |
| legacy sentinels | five before/after counts and digests identical |
| forbidden outputs | zero Attempt/provider/result/validation/evidence/closure/UI/search/legacy writes |

Regression results:

- shared typecheck: passed
- shared full suite: 318/318 passed
- Prisma validate: passed
- backend typecheck: passed
- backend full suite: 1885 passed, 0 failed, 39 skipped; 1924 total
- targeted Prisma repository suite: 9/9 passed
- EF v2 service suite: 14/14 passed including subtests
- PI/EF spine suite: 15/15 passed
- D-19 gate harness suite: 42/42 passed
- EF and PI relational real-PostgreSQL suites: passed
- OpenAPI generation/index verification and strict quality: passed; 187 endpoints
- env contract validation: passed with 0 errors and 0 warnings
- DB/context generation and strict context verification: passed

During the historical run, the technical implementation was accepted and the source-backed gate correctly remained blocked. The later source-policy run supplied exact evidence and closed only that blocker. See `artifacts/implementation/00-pack-a-technical-closure.md` for the historical technical summary.

## Verification principle
Productization evidence must prove the behavior at the layer where the guarantee is claimed. Contract/unit tests cannot prove crash recovery, direct API calls cannot prove desktop usability, and fixture/source-string checks cannot prove a real researcher workflow.

## Review-time baseline — 2026-07-10
| Check | Result | Interpretation |
|---|---|---|
| targeted EF service/execution/capability tests | 26 passed / 0 failed | existing deterministic happy and selected negative paths remain useful regression coverage |
| readiness-after-mutation adversarial probe | invariant failed: after changing TaskSpec args under the same id, latest readiness remained `passed` and record hash remained the RunRecipe hash | mandatory Phase 1 regression; existing green tests do not prove immutable identity |
| backend whole-tree typecheck | not accepted as a T-132 baseline because the shared worktree contained concurrent in-progress T-124 dependency wiring | rerun in Phase 0 from the then-current tree; do not attribute unrelated diagnostics to T-132 |

The one-off mutation probe was not retained as a repository script. Phase 1 MUST first convert the probe into a committed adversarial test before changing the implementation.

## Verification ladder
| Layer | Purpose | Required proof |
|---|---|---|
| L0 docs/static | contracts, ownership, API/context/governance consistency | docs lint, typecheck, ownership/forbidden-path scans |
| L1 contract/unit/adversarial | identity, schemas, state machines and fail-closed policy | mutation-solid unit/schema tests including every audit P0 negative |
| L2 service/API integration | typed commands and single entrypoint behavior | real route/controller/service/repository integration, not mocked DTO assembly |
| L3 Prisma/transaction/recovery | persistence, uniqueness, replay and publish atomicity | disposable Postgres, migration diff/readback, crash injection at write boundaries |
| L4 provider-control simulation | durable attempts, exact-payload lifecycle and simulator/evidence separation | same-payload fake submit/sync/cancel/collect/reconcile, restart/replay and zero scientific evidence writes |
| L5 cross-module trust, Cycle accounting and retrieval identity | PI↔EF Cycle/branch/revision-sequence/Run-manifest/required-cell/TaskSpec/Attempt scope, head saga, eligible REU, immutable Cycle closure snapshot/hash, Sidecar display, dossier scope and source-resolved retrieval | joint contract/integration tests, sequence-fenced explicit-head/ack replay, failed-execution-zero-REU, snapshot/hash/dossier parity and forged/wrong-project/stale-index bypass negatives |
| L6 desktop interaction | researcher actions and visible recovery states | real DOM/Electron click/type/navigation assertions; no source-string substitute |
| L7 control-plane usage-fit | complete first-release control need and reverse trace | one replayable RAGPerf TaskSpec/payload/simulated-lifecycle chain plus human rubric on preparation cost, clarity and traceability |
| L8 cloud preflight | required zero-write provider-boundary validation | exact payload/offline checks + real read-only List/Get checks + same-payload fake lifecycle + zero-write audit |
| L9 provider canary | deferred real external execution and cleanup | separate opt-in Aliyun `CreateJob` evidence after the first release and a new confirmation |

## Required negative cases by phase
| Phase | Required cases |
|---|---|
| 1 identity/readiness | readiness-after-mutation; forged/stale/wrong-kind/logical-only refs; concurrent CAS; draft submit denied; deterministic freeze/hash/replay; legacy selectors/writers denied with unchanged-row digest |
| 2 scope/preparation/head | D-19 fixture bypassing closed Phase 1 identity/readiness; unsupported typed rule without `UNSUPPORTED_RULE` before Run freeze; wrong project/Cycle/branch/revision/sequence/hash/cell-plan; one-cell shortcut; `latest`/range/generator authority; extra/missing/drifted cell; second Run; stale/lower/conflicting `RunManifestFrozen`; PI head-CAS/outbox crash; EF ack-receipt crash; any Attempt/provider/result/evidence/closure/UI/search/legacy write; cross-branch sequence isolation |
| 3 provider control | crash before/after simulated submit/collect; duplicate submit; restart reconcile; malformed response; timeout/cancel; terminal replay; LocalScript/fake provenance denied by scientific writers; rebuildable workflow status; unchanged scientific Run/cell state; zero simulated evidence |
| 4 scientific/closure | `accept_partial`; per-cell/generic validation writer; simulator/incomplete/failed/cancelled evidence; gateway bypass; caller assessment/exit/packet; two-plus admitted branches; deterministic D-18 branch order/hash; current revision/effective-head cell/Attempt parity; `BRANCH_HEAD_NOT_FROZEN`; non-head exclusion; explicit comparison ref negatives; head/non-head active real Attempt returns `CYCLE_ACTIVE_REAL_ATTEMPT`; concurrent admission/head/Attempt drift returns `CYCLE_CLOSURE_SCOPE_DRIFT`; same-watermark replay; no-evidence null disposition/selected exit; Packet post-closure/outside hash; every closed-Cycle execution command denied |
| human gates/iteration | exact-plan admission and one Cycle closure are the fixed T-132 AuthorityActions; compilation/head saga/retry/reconcile add zero action; deterministic blockers cannot be approved; no semantic-distance classifier, policy engine, rule DSL/waiver, ScientificConclusion aggregate, per-Run confirmation or Packet confirmation |
| 5 desktop/retrieval | project/permission isolation; Cycle/branch-head semantic documents only; non-head history exact-query only; explicit comparison rendering; stale/index-disabled structured fallback; no search-driven head/readiness/evidence/closure; one closure screen and successor-Cycle next-step; no manual refs/hashes/JSON |
| 6 release/preflight | migration/backout rehearsal; full concurrency/replay/soak; exact-cell/manifest/watermark parity; exact Aliyun payload/offline/ref/size checks; read-only cloud/RAM write denial; same-payload fake failures; no-evidence closure readback; zero cloud writes/scientific evidence; artifact/redaction checks |

## Planned commands

### Typecheck and core tests
```bash
pnpm typecheck
pnpm --filter @paper-engineering-assistant/shared test
pnpm --filter @paper-engineering-assistant/backend test
pnpm --filter @paper-engineering-assistant/desktop smoke:e2e
```

Expected:
- zero typecheck/test failures attributable to T-132;
- desktop smoke contains real interactions for enabled product slices, not only HTML/source/API checks.

### Existing EF regression lanes
```bash
pnpm experiment-foundation:full-flow
pnpm experiment-foundation:hardening -- --mode deterministic
pnpm experiment-foundation:hardening -- --mode real-local-db --require-real-db
```

Expected:
- existing deterministic behavior does not regress;
- real-local-db lane uses disposable/approved Postgres and records readback evidence;
- LocalScript lanes are regression/dev evidence only and cannot satisfy a production execution/evidence gate;
- no run claims real cloud coverage unless provider submission actually occurred.

### Required cloud-preflight gate
Phase 0 freezes the implementation command name, output schema, required check IDs and artifact root. Phase 6 executes that predeclared gate and MUST prove:

1. the exact future Aliyun `CreateJob` payload is produced from the locked TaskSpec and canonical-hashed;
2. provider fields, enums, refs and the documented 65,536-byte request limit are validated offline;
3. real network calls are restricted to an explicit List/Get allowlist and verify signing/endpoint, region, `ENABLED` workspace and visible DLC resource limits/required refs;
4. the RAM identity lacks `paidlc:CreateJob` and a deliberate write attempt is rejected before transport and cannot be authorized;
5. fake submit/sync/cancel/collect/reconcile/replay consumes the exact payload/hash from step 1;
6. simulation emits `workflow_simulation_passed | blocked | failed`, cloud preflight emits `cloud_preflight_passed | blocked | failed`, and both include zero provider writes, zero scientific evidence writes, unchanged Run/cell scientific state and an explicit unverified-runtime/evidence list.

### Governance and docs
```bash
node .ai/scripts/lint-docs.mjs --path dev-docs/active/experiment-foundation-productization-closure --strict
node .ai/scripts/ctl-project-governance.mjs sync --apply --project main
node .ai/scripts/ctl-project-governance.mjs query --project main --id T-132
node .ai/scripts/ctl-project-governance.mjs lint --check --project main
git diff --check -- dev-docs/active/experiment-foundation-productization-closure .ai/project/main
```

Expected:
- bundle is structurally valid;
- T-132 is uniquely mapped to M-001/F-001/R-012 and remains `planned` until execution approval;
- no whitespace or governance errors.

### Schema work
When a persisted-field change is approved, use the `sync-db-schema-from-code` skill. Required evidence includes Prisma diff preview, explicit migration/apply approval, disposable DB apply/readback and refreshed `docs/context/db/schema.json`.

## D-19 first planned cross-module implementation acceptance
After separate Phase 1 closure and future explicit implementation authorization, the planned D-19 slice MUST prove:

1. fixture setup begins from an already bound PaperProject/ValidationCycle and typed v2 assets persisted/readied through the real Phase 1 path; no caller-authored hash/readiness, bootstrap bypass, import/promotion or legacy trust upgrade is accepted;
2. one immutable WorkOrder revision contains exactly two required cells for the acceptance fixture while all schemas/services retain the 1..N contract;
3. EF materializes or exact-reuses exactly one VersionLock, exactly one RunRecipe and two TrainingTaskSpecs without changing either cell's key/seed/repeat/params/result-contract authority;
4. one transaction freezes the revision's only two-cell Run/manifest and publishes `RunManifestFrozen`;
5. PI inbox handling validates exact scope/sequence, sequence-fenced CAS-advances the branch head and atomically publishes `BranchHeadAdvanced`;
6. EF inbox handling persists one exact durable acknowledgement receipt; the receipt is the slice endpoint and no `dispatch_eligible` mirror is introduced;
7. same command/event replay converges, lower sequence cannot roll back, same sequence with conflicting Run/manifest fails closed and crash injection around PI head/outbox plus EF receipt recovers without duplicates;
8. shared contract, typed HTTP, service, repository, disposable Postgres/Prisma and inbox/outbox evidence all pass under the default-off v2 capability with no legacy dual write;
9. final scans prove one branch/current admitted revision, exactly one VersionLock, one RunRecipe, two TrainingTaskSpecs, one two-cell Run/manifest, one PI head, one `RunManifestFrozen`/PI inbox receipt, one `BranchHeadAdvanced`/EF inbox receipt and one durable acknowledgement, with zero ExecutionAttempt, provider request, result/evidence/closure/UI/search/legacy write.

D-19 does not claim provider or D-18 runtime implementation. The later closure suite must still prove a non-head active real-provider Attempt returns `CYCLE_ACTIVE_REAL_ATTEMPT`; D-19 only preserves that contract and produces no Attempt.

## D-20 planned transaction, replay and ownership acceptance

1. T1 fault injection proves PI WorkOrder revision/admission/current-revision CAS and `WorkOrderRevisionAdmitted` outbox commit or roll back together; same business key/hash returns the exact prior outcome and a different hash fails closed.
2. T2 proves the PI event inbox outcome, exactly one VersionLock/RunRecipe, exactly two acceptance TaskSpecs, sole Run/manifest and `RunManifestFrozen` outbox commit atomically; no receipt-first, partial materialization or outbox-after-domain-write state exists.
3. T3 proves the `RunManifestFrozen` inbox outcome, exact-scope/sequence head CAS and `BranchHeadAdvanced` outbox commit atomically. Lower sequence is durably stale without rollback/outbox, exact replay reuses the outcome and same sequence/different Run or manifest is a zero-head/outbox terminal conflict.
4. T4 proves the exact `BranchHeadAdvanced` inbox processed receipt commits as the sole EF acknowledgement and future dispatch prerequisite. Schema/database scans find no acknowledgement aggregate/event, Run boolean, `dispatch_eligible` mirror or fifth domain authority commit.
5. Crash points before every local commit leave zero inbox/domain/outbox residue. Commit-before-publish and publish-before-delivery-marker crash points converge by relay replay and consumer deduplication; relay delivery state alone never satisfies head or acknowledgement acceptance.
6. Envelope tests reject unknown version/type/producer, missing correlation/causation/idempotency/hash/scope fields, forged canonical payload hash, `latest`/range/generator authority and event-id or business-key reuse with changed payload.
7. Ownership scans prove every authoritative transaction callback receives only PI or only EF write repositories even under one Prisma/Postgres deployment. Shared DTO/hash/relay helpers are allowed; shared mutable tables/repositories, distributed locks, cross-domain transactions and 2PC are absent.
8. Negative evidence proves governance file/JSONL outbox, singular mutable WorkOrder/HarnessRun/live-adapter sequencing, generic EF record upsert and provider-job idempotency cannot satisfy D-20.

The four count is the successful business-authority spine, not a cap on SQL transactions. Relay lease, retry and delivery bookkeeping may commit independently but remains infrastructure-only and cannot mutate or attest PI/EF authority.

## D-21 planned storage, cutover and rollback acceptance

1. Additive migration inspection proves new PI v2 and EF v2 tables/indexes/constraints are created without altering, populating, annotating, hashing, relating or deleting legacy WorkOrder/HarnessRun/generic EF rows.
2. Capability-off tests send every D-19 product command and require one stable disabled outcome, zero PI/EF v2 writes, zero legacy writes and zero invocation of a legacy repository or generic endpoint. The existing local-execution flag cannot enable v2 admission.
3. Capability-on D-19 acceptance writes only the owning PI/EF v2 table families. Repository and transaction scans prove no runtime union view, compatibility repository, cross-domain ORM relation/FK/cascade, shared write table or same-logical-object dual write.
4. Legacy before/after row-count and canonical existing-field digest reports match exactly. Diagnostics/admin existing-field reads remain available, while legacy create/update/promote/attach/execute/evidence/product commands cannot enter or substitute for the v2 route.
5. Cutover tests keep the primary new paper-bound intake disabled before D-19 acceptance, then switch that entrance only to v2 while closing overlapping singular WorkOrder/HarnessRun/generic EF product writers in the same deployment. Active legacy fixtures must finish before cutover or restart from a new v2 project/Cycle/revision.
6. Mid-saga disable tests commit each D-20 event boundary, disable new intake and prove relay/consumers still converge to the exact EF acknowledgement. No permanently pending saga, new admission, provider effect or legacy fallback is allowed.
7. Rollback tests stop new v2 intake, preserve and read back all existing immutable v2 rows/inbox/outbox, drain committed events and reject new commands. Rollback does not drop/rebind/convert v2 data or restore an overlapping legacy writer.
8. Offline aggregate shadow comparison artifacts are redacted and external to domain records; product routing, API return values, readiness/head/evidence decisions and authority remain unchanged when the shadow verifier is disabled or disagrees.

D-21 freezes object-family ownership and cutover only. Exact table/field names, normalization versus typed canonical JSON, uniqueness/CAS placement and the first-migration table list remain D-22 acceptance work.

## D-22 planned minimal-schema acceptance

1. A machine-readable schema census contains only the Phase 1 typed identity/draft/revision/lifecycle/readiness families required by the D-19 fixture and the PI branch/revision/cells/admission/head/inbox/outbox plus EF VersionLock/RunRecipe/TrainingTaskSpec/Run/RunCell/inbox/outbox spine.
2. Constraint inspection maps every identity, sequence, immutable order, uniqueness, current/head CAS, same-domain binding, event scope and idempotency rule to one relational column/index/constraint or one transactional service check with a stable error code and negative test.
3. Canonical-snapshot tests accept only named schema-versioned typed values, recompute hashes on the server and reject type/version mismatch, non-canonical encoding, payload tampering and caller-authored hashes. Generic `kind/payload`, EAV and wildcard asset authority are absent.
4. Run-manifest verification recomputes one hash from the immutable ordered RunCell rows and exact TaskSpec bindings. Schema and repository scans find no second mutable manifest payload, optional/dynamic cells or one-Run-per-cell substitute.
5. Cross-domain scans find zero PI↔EF FK, ORM relation/cascade, shared join/write table or mixed-domain transaction callback. Exact external project/Cycle/branch/revision/cell/Run ids, hashes, sequences and event scope remain typed scalar fields.
6. Schema and code scans prove zero first-pack persistence for candidate/import/promotion/bootstrap, Attempt/provider/job/collection, result/validation/evidence, Cycle closure/interpretation, UI/read model/search/index and legacy bridge/backfill/union.
7. Capability verification proves v2 admission is a default-off configuration guard and finds no persisted eligibility/capability/dispatch mirror. Capability-off produces the D-21 zero-write/no-fallback outcome.
8. Legacy population counts and canonical existing-field digests remain unchanged; migration inspection proves additive v2-only DDL. Final Prisma names/columns/DDL and DB apply require the repository DB-SSOT diff/approval flow and are not inferred from D-22 confirmation.

D-22 completes product/domain decision alignment through OQ-22. The next gate is the schema/invariant matrix and implementation-readiness review for `Implementation Pack A`; no OQ-23 is created unless the matrix exposes a genuine product/domain fork.

## Product control-plane scenario
The first-release scenario must prove, through primary product commands and UI:

1. select the RAGPerf validation goal and deliberately initiate the bound PI workflow as the single InitiationAction;
2. create one PI-owned ValidationCycle and WorkOrder branch, author bounded ranges/grid/seed-count in a draft, automatically compile/preview a canonical non-empty ordered `exact_cell_plan[1..N]`, and freeze the immutable WorkOrder revision with `cell_plan_hash`, a server-issued branch-local revision sequence, no manual internal id/hash/JSON entry and `head_run_id` still separate from `current_admitted_revision_id`;
3. explicitly admit that exact revision/`cell_plan_hash`/`approved_plan_hash` as the first AuthorityAction;
4. delegate the experiment intent and exact admitted cells/hash to EF with stable project/Cycle/branch/revision scope and prove EF never resolves `latest`, ranges or generator metadata as execution authority;
5. prove T-131 v1/free-shape input is catalog-only, then resolve a new original-source typed v2/versioned RAGPerf protocol and required benchmark/data assets;
6. create immutable VersionLock/RunRecipe and resolve/create-or-exact-reuse each TaskSpec from the admitted cells without manual hash/ref entry or scientific cell selection;
7. prove every Run cell preserves one admitted key/seed/repeat/exact-parameter/required-result tuple, adds EF-owned TaskSpec binding, then atomically freeze the revision's only canonically ordered batch Run/manifest plus `RunManifestFrozen`; reject any extra/missing/drifted cell or second Run before head/Attempt;
8. have PI consume the exact event, sequence-fenced CAS `head_run_id`, atomically emit `BranchHeadAdvanced` and prove duplicate/stale/conflicting events converge without rollback or user action;
9. have EF durably consume the exact head acknowledgement and prove no cell Attempt can exist before that point;
10. materialize and offline-validate the exact Aliyun request for each locked TaskSpec/cell;
11. complete fake-provider lifecycle/recovery as cell-scoped simulation Attempts using the exact materialized payload/hash and an explicit non-production identity;
12. replay EF simulated lifecycle/blocker state into the owning PI WorkOrder branch and rebuild its explicit head plus Sidecar control-state projection without treating Attempt failure/cancellation as head rollback or scientific Run terminality;
13. query the ValidationCycle/branch-head retrieval projection through structured filters and semantic ranking, re-resolve exact PI/EF source hashes, then repeat with semantic indexing disabled to prove structured fallback;
14. prove LocalScript/fake provenance cannot create ExperimentResult, ResultValidationReport, EvidenceCandidate, RunEvidenceUnit or dossier evidence;
15. reverse-trace the control state to PI intent, source literature, versions, TaskSpec, payload and simulated attempts;
16. complete the real read-only Aliyun environment preflight;
17. prove zero cloud writes and zero simulated scientific evidence;
18. build one D-18 watermark over the current admitted branch/revision and matching effective head Run with every required cell/terminal simulation Attempt; prove non-head history is excluded and no real-provider Attempt exists anywhere in the Cycle; then close with `closure_kind=control_flow_validated_no_paper_evidence`, `scientific_disposition=null`, `selected_exit=null` and `evidence_eligibility=false` as the second AuthorityAction without mutating EF state;
19. emit `workflow_simulation_passed` and `cloud_preflight_passed`, with scheduling/training/results/evidence explicitly listed as unverified.

## Evidence artifacts
- Root: `.ai/.tmp/experiment-foundation-productization/<run-id>/`
- Required outputs per milestone:
  - `summary.json` with `passed | blocked | failed` and required-check enumeration;
  - sanitized command/test logs;
  - persistence/readback manifest;
  - D-19 admission-to-head report containing bound fixture refs, real v2 identity/readiness proof, one branch/current revision, two admitted cells, exactly one VersionLock, one RunRecipe, two TaskSpecs, one Run/manifest/head/ack, both outbox events/inbox receipts, replay/conflict/crash results and zero excluded-record/effect scan;
  - simulator fault-injection/recovery matrix where applicable;
  - canonical Run-manifest report containing exact revision/hash, Run id/manifest hash, required cell keys/TaskSpec refs+hashes and Attempt provenance/completeness without restricted payload contents;
  - admitted-cell parity report containing WorkOrder revision/hash, `cell_plan_hash`, canonical exact scientific cells, Run scientific-cell projection, EF-added TaskSpec bindings and zero extra/missing/drifted cells;
  - simulation/scientific-axis report proving terminal Attempt lifecycle, derived/rebuildable `workflow_simulation_status`, unchanged Run/cell `scientific_execution_status=not_started` and zero scientific terminal transitions;
  - UI interaction evidence for L6;
  - cross-module control-lineage manifest for L5/L7;
  - scope-contract parity, `RunManifestFrozen`/`BranchHeadAdvanced` inbox-outbox/CAS/ack replay report, failed-head retention, retrieval projection rebuild/staleness/permission/fallback evidence for L5-L7;
  - no-evidence Cycle-closure snapshot with D-18 watermark, current admitted revision/effective head Run/cells/Attempts, `control_flow_validated_no_paper_evidence`, null disposition/selected exit, `evidence_eligibility=false` and before/after EF-state digest;
  - D-16/D-18 Cycle-accounting report containing expected Cycle version, canonical admitted branch set, per-branch current revision/non-null effective head, complete cells/Attempts, execution/eligibility/eligible REU refs, explicit comparison refs, non-head exclusion, `BRANCH_HEAD_NOT_FROZEN` negative, Cycle-wide active-real fence, dossier-declared snapshot refs/hashes and proof of zero project/history scan or Sidecar authority;
  - D-17 protocol-capability report containing exact typed protocol revision/hash, canonical required-rule order, validator-profile hash, supported/unsupported capability decisions, pre-dispatch blockers and proof that T-131 v1/free-shape input cannot obtain executable/evidence readiness;
  - D-17 exact-batch validation report containing Run/manifest hash, ordered cell/result refs+hashes, ordered rule outcomes, complete validation hash inputs, sole-writer scan and atomic/idempotent passed-report/EvidenceCandidate/outbox evidence;
  - D-17/D-18 conclusion-chain report containing watermark/hash, CAS drift/replay evidence, exact Result Analysis proposal ref/hash, authoritative closed-Cycle disposition, non-null-disposition-derived or null no-evidence exit, post-closure Packet lineage/outside-hash proof, closed-Cycle write denials and unchanged action counts;
  - `action-budget.json` (or an equivalent machine-readable report) with admitted-revision count, Run count, required-cell count, Attempt count, expected/actual Initiation/Authority/Recovery/Plumbing counts, each named AuthorityGate term, Stop-only acknowledgement count and unexpected/unclassified actions;
  - redacted cloud payload manifest/hash, read-only operation audit, credential capability report, fake-lifecycle payload-hash comparison and unverified-runtime list for L8.
- Before M7, D-17 passed-result/EvidenceCandidate/REU artifacts are production-disabled fixture/contract-conformance evidence only. They cannot appear in the first-release product summary as provider-backed scientific evidence; the release scenario emits only the D-18 no-evidence closure artifacts.
- No credentials, raw restricted datasets, model weights or unredacted provider payloads may be stored.
- No simulator-produced scientific result/evidence artifact may be stored in production EF/PI canonical tables.

## Rollout/backout verification
- Verify disabling each writer/worker/broker/UI capability independently.
- Verify existing legacy fields remain readable through diagnostics/admin compatibility access, every product/v2 path returns `LEGACY_RECORD_NOT_ELIGIBLE`, and no legacy row changes.
- Verify revoke/supersede preserves audit history.
- Verify external jobs are drained/cancelled/reconciled before rollback is declared complete.
- Verify cloud-preflight disable/revocation requires no job cleanup because no provider write was allowed.
- Verify semantic indexing can be disabled/rebuilt independently while project-scoped structured lineage and all control/trust paths remain available.
- Verify the workflow simulation/Sidecar projection can be discarded and rebuilt from Attempt events without changing EF Run/cell scientific state or PI Cycle disposition identity.

## Log

### 2026-07-10 — Planning package
- Task bundle created; no product code/config/schema change.
- `node .ai/scripts/lint-docs.mjs --path dev-docs/active/experiment-foundation-productization-closure --strict`: passed, 8/8 Markdown files, 0 errors, 0 warnings.
- Task-id uniqueness scan: `T-132` occurs once in task metadata; no collision through T-132.
- Governance registration: sync registered T-132, explicit map changed the default inbox mapping to `M-001/F-001/R-012`, and a second sync regenerated derived views.
- `node .ai/scripts/ctl-project-governance.mjs query --project main --id T-132`: returned `planned`, correct slug/path and `M-001/F-001` mapping.
- `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`: passed.
- `git diff --check -- dev-docs/active/experiment-foundation-productization-closure .ai/project/main`: tracked project-hub diff passed.
- Explicit scans of the new untracked T-132 bundle found no trailing whitespace and balanced all Markdown fences.

### 2026-07-10 — EF ↔ PaperImplementation goal clarification
- Updated the goal, product-surface boundary, Phase 4 round trip, architecture ownership/interaction contract, D-09 and EF-P15.
- Required interaction proof now covers PI WorkOrder→EF command correlation, EF→PI lifecycle replay, trusted-evidence return to the same project and standalone-run attachment/revalidation negatives.
- Strict docs lint passed: 8/8 Markdown files, 0 errors, 0 warnings.
- Governance lint passed; no task status/mapping change.
- Trailing-whitespace and Markdown-fence scans passed.

### 2026-07-11 — D-09 decision confirmation
- Recorded D-09 as confirmed across roadmap, overview, execution plan, architecture and implementation notes.
- EF-P15 remains open because the product rule is confirmed but no enforcement/interaction evidence exists yet.
- Task status remains `planned`; no product code/config/schema change.
- Strict docs lint passed: 8/8 Markdown files, 0 errors, 0 warnings.
- Governance lint, trailing-whitespace scan and Markdown-fence scan passed.

### 2026-07-11 — D-01 decision confirmation
- Recorded D-01 as confirmed across roadmap, overview, execution plan, architecture, verification and the EF-P16 closure row.
- First-release cloud scope is exact Aliyun payload materialization, real read-only preflight and same-payload fake lifecycle; `CreateJob` and actual training are forbidden.
- The only allowed successful cloud label is `cloud_preflight_passed`.
- Task status remains `planned`; no product code/config/schema or cloud state change.
- Strict docs lint passed: 8/8 Markdown files, 0 errors, 0 warnings.
- Governance lint, trailing-whitespace scan and Markdown-fence scan passed.

### 2026-07-11 — D-02 decision confirmation
- Recorded D-02 as confirmed across roadmap, overview, execution plan, architecture, verification and EF-P01.
- Identity model is `logical_id + immutable revision_id + server canonical semantic content_hash`; drafts use CAS, execution/readiness bind exact revisions, and operational state uses append-only events plus projections.
- Task status remains `planned`; no product code/config/schema change.
- Strict docs lint passed: 8/8 Markdown files, 0 errors, 0 warnings.
- Governance lint, trailing-whitespace scan and Markdown-fence scan passed.

### 2026-07-11 — D-03a decision confirmation
- Recorded the simplified human-control model across roadmap, overview, plan, architecture, verification and EF-P17.
- The accepted model is one admitted WorkOrder/`approved_plan_hash` plus four fixed gates; deterministic errors block directly.
- `DecisionAuthorityManifest`, per-field authority DSL, generic Policy Engine and general DecisionWorkItem engine are explicitly out of scope.
- D-03b accepted-partial scope remained pending at that point.
- Task status remains `planned`; no product code/config/schema change.
- Strict docs lint passed: 8/8 Markdown files, 0 errors, 0 warnings.
- Governance lint, trailing-whitespace scan and Markdown-fence scan passed.

### 2026-07-11 — D-03b decision confirmation
- Removed accepted-partial approval, partial-evidence grades and human-upgrade paths from the first-release plan.
- Required behavior is diagnostic retention for failed/cancelled/incomplete runs, rejection of `accept_partial=true`, and EvidenceCandidate minting only from complete passed validation.
- Complete protocol-valid negative results remain evidence-eligible and are tested separately from incomplete execution.
- D-03c manual-promotion semantics remain pending.
- Task status remains `planned`; no product code/config/schema change.
- Strict docs lint passed: 8/8 Markdown files, 0 errors, 0 warnings.
- Governance lint, trailing-whitespace scan and Markdown-fence scan passed.

### 2026-07-11 — D-03c decision confirmation
- Defined `manual_promote` as human catalog admission only; manual promotion cannot waive deterministic eligibility blockers, grant executable readiness or increase evidence trust.
- Kept the typed decision minimal and excluded waiver, scope, expiry, exception-code and policy-DSL fields.
- Catalog admission and readiness are separate: a promoted asset with unresolved execution-environment dependencies remains non-executable.
- D-04 promotion/canonicalization atomicity was still pending at that point.
- Task status remains `planned`; no product code/config/schema change.
- Strict docs lint passed: 8/8 Markdown files, 0 errors, 0 warnings.
- Governance lint, trailing-whitespace scan and Markdown-fence scan passed.

### 2026-07-11 — D-04 decision confirmation
- Defined promotion as one server-owned idempotent transaction over exact Candidate revision/hash, canonical create/exact-reuse, `created | reused` result, terminal decision, Candidate state and outbox.
- Caller-authored canonical refs/payloads are rejected; `reject` creates no canonical revision; one Candidate revision has one terminal decision.
- Kept readiness, evidence qualification and external side effects outside promotion transaction scope.
- D-05 EF→PI trusted-evidence entry was still pending at that point.
- Task status remains `planned`; no product code/config/schema change.
- Strict docs lint passed: 8/8 Markdown files, 0 errors, 0 warnings.
- Governance lint, trailing-whitespace scan and Markdown-fence scan passed.

### 2026-07-11 — D-05 decision confirmation
- Assigned EvidenceCandidate scientific qualification to EF and exclusive RunEvidenceUnit write authority to one PI-owned Evidence Trust Gateway.
- Restricted gateway input to exact identities and required server-side EF lineage plus PI project/WorkOrder/approved-plan/revocation resolution for every intake source.
- Failed/cancelled/incomplete runs remain exact immutable ValidationCycle closure snapshot facts without RunEvidenceUnit; Sidecar only displays that scope, and complete protocol-valid negative/inconclusive results remain admissible on a separate disposition axis.
- RunEvidenceUnit, TraceManifest and outbox are one PI admission transaction; Sidecar is projection-only and later revocation appends invalidation facts.
- D-06 PaperProject ordering was still pending at that point.
- Task status remains `planned`; no product code/config/schema change.
- Strict docs lint passed: 8/8 Markdown files, 0 errors, 0 warnings.
- Governance lint, trailing-whitespace scan and Markdown-fence scan passed.

### 2026-07-11 — D-06 decision confirmation
- Replaced the proposed late-binding/reconciler mechanism with a strict PaperProject-bound PI bootstrap precondition.
- Unbound bridges must fail with a PaperProjectIntake next action and create no ImplementationProject/intake snapshot; valid bound bootstrap is idempotent.
- Primary navigation enters PI from a bound PaperProject, while raw bridge ID/hash bootstrap is diagnostics/compatibility-only.
- Existing null-bound records are delegated to D-08 and cannot start new trusted work.
- D-07 execution-environment role was still pending at that point.
- Task status remains `planned`; no product code/config/schema change.
- Strict docs lint passed: 8/8 Markdown files, 0 errors, 0 warnings.
- Governance lint, trailing-whitespace scan and Markdown-fence scan passed.

### 2026-07-12 — D-01 revision and D-07 decision confirmation
- Reclassified the desktop/backend as the experiment control plane and formal experiment execution as cloud-only.
- Replaced the trusted local golden run with deterministic non-scientific workflow simulation using the exact materialized cloud payload.
- LocalScript/fake-provider provenance must be rejected before ExperimentResult, ResultValidationReport, EvidenceCandidate and RunEvidenceUnit product writes.
- First release performs no local/cloud training and may emit only `workflow_simulation_passed` and `cloud_preflight_passed`, with real runtime/results/evidence listed as unverified.
- Removed the local container/restricted-worker platform from T-132 scope; real result/evidence closure remains behind a separately authorized cloud-provider execution gate.
- D-08 legacy-data policy was still pending at that point.
- Task status remains `planned`; no product code/config/schema or cloud state change.
- Strict docs lint passed: 8/8 Markdown files, 0 errors, 0 warnings after removing stale trusted-local/worker acceptance language.
- Governance lint, trailing-whitespace scan and Markdown-fence scan passed.

### 2026-07-12 — D-08 decision confirmation
- Chose inert database retention: existing non-v2/null-bound/simulation-era rows stay unchanged and receive no rehash, backfill, annotation or trust migration.
- Restricted legacy access to existing-field diagnostics/admin reads and one mechanical `LEGACY_RECORD_NOT_ELIGIBLE` result from every v2/product/PI path.
- Removed legacy summaries, narrative reasons, recommendations, archive UI, comparability, revalidation and cross-module consumption from T-132.
- Reuse requires original-source v2 import or a future real rerun; existing null-bound projects remain read-only.
- OQ-01 through OQ-09 are aligned; experiment-iteration semantics remains a separate pending discussion.
- Task status remains `planned`; no product code/config/schema or database row change.
- Strict docs lint passed: 8/8 Markdown files, 0 errors, 0 warnings.
- Governance lint, trailing-whitespace scan and Markdown-fence scan passed.

### 2026-07-12 — D-10 decision confirmation
- Recorded PI ownership of ValidationCycle/WorkOrder branch/revision semantics, EF ownership of TaskSpec/Run/ExecutionAttempt/result facts, and one exact shared scope envelope without `latest` execution resolution.
- Added the PI-owned project-scoped retrieval projection, deterministic Cycle/branch-head semantic documents, structured-first query order, exact source re-resolution and index-unavailable fallback requirements.
- Explicitly separated older v2 lineage history from D-08 legacy and prohibited per-run summaries, EF/model-generated search summaries and search-driven workflow/trust transitions.
- D-11 branch-versus-revision classification was pending during the D-10 update; no product implementation was authorized by the documentation change.
- Strict docs lint passed: 8/8 Markdown files, 0 errors, 0 warnings.
- Governance sync/query/lint passed; T-132 remains `planned` at `M-001/F-001/R-012`.
- Git diff check, trailing-whitespace scan and Markdown-fence scan passed. The task bundle remains untracked as a whole; no product code/config/schema/database/cloud state changed.

### 2026-07-12 — D-11 decision confirmation and PI documentation handoff
- Recorded the deterministic draft/ExecutionAttempt/Run/WorkOrder revision/branch/ValidationCycle classification and explicit PI `revise | fork` operations.
- Added invariants for unchanged branch-frame hash on revision, mandatory fork on branch semantic/relation changes, re-admission of every new revision and prohibition of existing-Run rebinding.
- Kept `current_admitted_revision_id` separate from `head_run_id`; D-13a later refines only the provisional per-point Run clause and D-13b later freezes explicit head advancement.
- Synchronized the PI-owned adoption into T-124 architecture/decision notes without changing T-124 implementation status or authorizing code/schema/database work.
- Cross-package review found D-12: T-124's coordinator stop points and T-132's experiment authority gates are different sets; neither set was merged, deleted or relabeled during the D-11 documentation pass.

### 2026-07-12 — D-12 minimum-intervention decision confirmation
- Confirmed AuthorityGate as durable domain authority and CoordinatorStop as a derived coordinator-local pause with no parallel human-decision record.
- Required one owning-screen interaction plus automatic resume when Stop and Gate overlap; in-bound Run/Attempt/retry/reconcile paths require no confirmation.
- Kept manual promotion off the normal PI path, limited external authorization to actual effects/scope expansion and retained one batch ValidationCycle closure action.
- Fixed the T-132 zero-write golden action target at Initiation/Authority/Recovery/Plumbing `1/2/0/0`; D-13a later refines the scenario cardinality to one project/Cycle/branch/admitted revision/batch Run plus N required cells and M cell-scoped Attempts.
- Fixed the T-124 reference full-paper scenario at one Cycle/admitted revision/strong claim/export with `1/4/0/0`; future real-cloud and explicit catalog-promotion variants add only their named AuthorityGate actions.
- Required golden evidence to compare theoretical versus actual counts by action class. Retryable technical failures and retrieval/projection fallback must add zero actions; deterministic input correction is RecoveryAction rather than confirmation, and manual ID/hash/JSON transfer is prohibited PlumbingAction.
- Post-sync strict docs lint passed for T-132 8/8 and T-124 12/12 Markdown files with 0 errors/0 warnings; governance sync/lint, diff check, trailing-whitespace and Markdown-fence checks passed.
- Strict docs lint passed for both bundles: T-132 8/8 and T-124 12/12 Markdown files, 0 errors, 0 warnings.
- Governance sync/query/lint passed with T-132 `planned` and T-124 `in-progress`; cross-package terminology scan, diff check, trailing-whitespace scan and Markdown-fence scan passed.

### 2026-07-12 — D-12 measurable action-target refinement
- Synchronized the fixed T-132 `1/2/0/0` scenario, the T-124 reference `1/4/0/0` scenario, the scalable named-gate formula, automatic-span/exception budgets and the machine-readable `action-budget.json` requirement across both task packages.
- Rewrote the first-release control-plane verification sequence to count initiation separately from exact-revision admission and to end with the second AuthorityAction: one no-evidence ValidationCycle closure. D-14 later refines the view to one mode-neutral scientifically `not_started` Run plus terminal simulation Attempts.
- `node .ai/scripts/lint-docs.mjs --path dev-docs/active/experiment-foundation-productization-closure --strict`: passed, 8/8 Markdown files, 0 errors, 0 warnings.
- `node .ai/scripts/lint-docs.mjs --path dev-docs/active/paper-implementation-productization-hardening --strict`: passed, 12/12 Markdown files, 0 errors, 0 warnings.
- Governance `sync --apply` and `lint --check` passed. Scoped `git diff --check`, trailing-whitespace and Markdown-fence checks passed. The documentation pass changed no product code/config/schema/database/cloud state; no files were staged or committed.

### 2026-07-12 — D-13a immutable batch-Run decision confirmation
- Confirmed one paper-bound WorkOrder revision may create at most one Run and, after successful manifest freeze, corresponds to exactly one immutable 1..N required-cell batch Run.
- Added canonical manifest/cell/TaskSpec scope, cell-scoped Attempt semantics, same-revision idempotency/conflict cases, all-required-cell completeness and simulation-versus-real Attempt provenance requirements.
- Explicitly marked D-13a as a partial refinement of D-11's provisional per-point Run clause; D-11 revise/fork and no-rebinding rules remain active. D-13b later completes head semantics.
- Strict docs lint passed for T-132 8/8 and T-124 12/12 Markdown files with 0 errors/0 warnings. Governance `sync --apply` and `lint --check`, scoped `git diff --check`, trailing-whitespace and Markdown-fence checks passed.
- Documentation only. The D-13a pass changed no product code/config/schema/database/cloud state; no files were staged or committed.

### 2026-07-12 — D-13b branch-head advancement confirmation
- Confirmed `RunManifestFrozen → PI sequence-fenced head CAS/BranchHeadAdvanced → EF durable acknowledgement → first Attempt/dispatch` as the only product path. PI and EF retain separate canonical ownership through idempotent outbox/inbox replay rather than a cross-database transaction.
- Added deterministic duplicate/stale/conflicting-sequence, crash/lost-ack, forged-ack and pre-ack dispatch negatives. Multiple branches have independent sequences/heads, and a new head never auto-cancels an already executing prior Run.
- Confirmed latest frozen lineage semantics: completion, success, metric, evidence or semantic ranking cannot advance/roll back head; failed/cancelled/incomplete latest Runs remain head.
- Head advance and recovery must add zero AuthorityAction, CoordinatorStop acknowledgement, RecoveryAction or PlumbingAction.
- Strict docs lint passed for T-132 8/8 and T-124 12/12 Markdown files with 0 errors/0 warnings. Governance `sync --apply` and `lint --check`, scoped diff/whitespace and Markdown-fence checks passed.
- Documentation only. The D-13b pass changed no product code/config/schema/database/cloud state; no files were staged or committed.

### 2026-07-12 — D-14 simulation/scientific-state separation confirmation
- Replaced every mode-labelled/terminal-simulation Run assertion with one mode-neutral immutable Run plus Attempt-level simulation provenance and lifecycle.
- Added two-axis invariants and negatives: simulation succeeded/failed/cancelled cannot change Run/cell scientific state; `workflow_simulation_status` is rebuildable; no scientific writer accepts simulation. D-18 later limits same-Run real reuse to an open Cycle and requires successor-Cycle/new-Run lineage after closure.
- Historical wording refined closure to inventory every in-scope Run; D-18 supersedes that membership rule with the current-effective watermark while preserving the no-evidence fields, unchanged EF facts and action count.
- Synchronized the PI-side adoption into T-124 while preserving its `in-progress` state and current S3 implementation scope. At the D-14 synchronization point, OQ-15 exact-cell-plan admission was still pending; the later D-15 entry supersedes that historical state.
- `node .ai/scripts/lint-docs.mjs --path dev-docs/active/experiment-foundation-productization-closure --strict`: passed, 8/8 Markdown files, 0 errors, 0 warnings.
- `node .ai/scripts/lint-docs.mjs --path dev-docs/active/paper-implementation-productization-hardening --strict`: passed, 12/12 Markdown files, 0 errors, 0 warnings.
- Governance `sync --apply`, T-132/T-124 query and `lint --check` passed; T-132 remains `planned` and T-124 remains `in-progress`. Scoped terminology, Markdown-fence, whitespace and `git diff --check` checks passed.
- Documentation/governance only. No product code/config/schema/database/cloud state was changed by the D-14 pass; existing concurrent T-124 work remained unstaged and no commit was created.

### 2026-07-12 — D-15 exact cell-plan admission confirmation
- Confirmed that PI automatically compiles and persists one canonical ordered `exact_cell_plan[1..N]` before the single WorkOrder admission; ranges/grid/seed-count remain non-authoritative draft inputs and `cell_plan_hash` is bound by `approved_plan_hash`.
- Confirmed that EF performs only one-to-one post-admission validation/materialization and adds Recipe/TaskSpec/provider/result bindings without scientific-cell selection. A complete plan without TaskSpec refs can admit; extra/missing/duplicate/reordered/substituted/drifted cells fail before Run/head/Attempt.
- Excluded generator-only authority, post-admission sampling or scientific-field defaults, runtime scientific-cell autotune/mutation, optional/dynamic cells, a CellPlan aggregate and per-cell confirmation. Technical retry stays on the same frozen cell; a scientific cell change or a WorkOrder-input change that would resolve a different TaskSpec requires a new revision/admission.
- Synchronized the PI-side contract into T-124 without changing its current S3 implementation scope. Optional authoring-provenance hash treatment, the exact `cell_key`/hash profile, plan-size cap, UI summarization and TaskSpec reuse strategy remain Phase 0 implementation details rather than silent decisions.
- Strict docs lint passed for T-132 8/8 and T-124 12/12 Markdown files with 0 errors/0 warnings. Governance `sync --apply`, T-132/T-124 query and `lint --check` passed; T-132 remains `planned` and T-124 remains `in-progress`. Scoped terminology, Markdown-fence, trailing-whitespace and `git diff --check` checks passed.
- Documentation/governance only. The D-15 pass changed no product code/config/schema/database/cloud state; existing concurrent T-124 work remained unstaged and no commit was created. At the D-15 synchronization point OQ-16 remained pending; the later D-16 entry supersedes that historical state.

### 2026-07-12 — D-16 scientific evidence versus execution accounting confirmation
- Confirmed one scientific-evidence path: complete protocol-compliant validation-passed EvidenceCandidate → sole PI Evidence Trust Gateway → RunEvidenceUnit/TraceManifest/outbox. Results later assigned positive/negative/inconclusive by Cycle closure share that completed-execution/evidence path, and REU carries no disposition.
- Confirmed one execution-accounting path: exact EF Run/Attempt facts → the existing PI ValidationCycle closure record's embedded immutable snapshot/hash. Failed/cancelled/incomplete execution creates zero RunEvidenceUnit; Sidecar only references/rebuilds the frozen scope for display.
- Confirmed dossier consumes explicit closed-Cycle snapshot refs/hashes and rejects open/tampered/incomplete/wrong-project scope. Project-wide failed-like REU scans, Sidecar authority, FailureEvidenceUnit, second gateway, dual-read fallback and extra user actions are prohibited.
- Synchronized the current contract into T-124 plus normative active T-091/T-095/T-096/T-098/T-104/T-114 references. Historical implementation/test records were preserved and marked superseded rather than rewritten; current S3 mixed status, failed-REU writers, Cycle storage gap, dossier reader and tests remain one blocking atomic migration slice.
- Strict docs lint passed for the complete T-132 bundle 8/8 and T-124 bundle 12/12 with 0 errors/0 warnings. Per-file strict lint passed 55/55 for every Markdown file changed by the D-16 synchronization, including historical supersession notes.
- Governance `sync --apply`, T-132/T-124 query and `lint --check` passed; T-132 remains `planned` and T-124 remains `in-progress`. Scoped `git diff --check`, trailing-whitespace and Markdown-fence checks passed.
- Semantic scans found no current/pending D-16 state, no unmarked normative all-outcomes-as-REU rule, and no PI/EF active document containing trusted failed/cancelled REU language without D-16 context. Accepted-partial historical documents also carry D-03b/D-16 supersession context.
- Documentation/governance only. No product code/config/schema/database/cloud state was changed; concurrent T-124 implementation work remained unstaged and no commit was created. D-16 is confirmed but not implemented.

### 2026-07-12 — D-17 executable protocol and scientific-conclusion authority confirmation
- Confirmed the single responsibility chain: EF canonical typed protocol/readiness → exact-batch ScientificValidation report/EvidenceCandidate → sole PI Gateway/REU → Cycle readiness → one proposal → existing closure writer → post-closure consumers. D-18 later defines Cycle readiness as the CAS-fenced current-effective scope rather than full history.
- Frozen the first executable protocol slice as `metric_contract@v1` plus `artifact_contract@v1` and mandatory exact dependency/real-provider/Run-cell-result/seed-repeat-parameter-lineage envelope invariants. Unknown or unsupported required capability returns `UNSUPPORTED_RULE` before Run freeze/head/Attempt and at final recheck; no best-effort, LLM interpretation, human waiver or generic validation/evidence writer is allowed.
- Confirmed that EF/REU own no `positive | negative | inconclusive` state. D-18 later constrains replay-safe readiness to its watermark; eligible evidence invokes one proposal, while no-evidence/control-only skips interpretation and closes with null disposition/selected exit.
- Confirmed the existing Cycle-closure AuthorityAction as the sole conclusion assignment. D-18 later refines the frozen snapshot scope and requires Packet to remain post-closure/outside the hash; no second confirmation is added.
- Synchronized D-17 into T-132, T-124, T-131/promotion playbook, T-095, T-098, T-104, T-114, T-091 global architecture and T-092 ownership/query matrices. Historical caller-authored assessment/exit, mixed REU status, four-scenario authority and direct packet materialization remain explicitly marked superseded atomic migration debt rather than a supported compatibility path.
- Strict docs lint passed with 0 errors/0 warnings for T-132 `8/8`, T-124 `12/12`, T-131 `3/3`, T-095 `7/7`, T-098 `7/7`, T-104 `7/7`, T-091 `8/8` and T-092 `11/11`. T-114 full-package strict lint reported 0 errors and 16 pre-existing vague-reference warnings across long historical records; the D-17 scoped T-114 diff, conflict scan and governance checks passed, and the update does not broaden into unrelated historical prose cleanup.
- Context strict verification passed. Governance `sync --apply`, T-132/T-124 query and `lint --check` passed with T-132 `planned` and T-124 `in-progress`. Scoped `git diff --check`, trailing-whitespace and conflict-semantic scans passed.
- Documentation/governance only. D-17 is confirmed but not implemented; no product code/config/schema/database/cloud state was changed, existing unrelated dirty work remained unstaged and no commit was created.

### 2026-07-13 — D-18 current-effective closure-scope synchronization
- Confirmed one shared closure contract across T-132, T-124, T-095, T-096, T-098 and `docs/context/glossary.json`: current admitted branch/revision + non-null effective head/cells/all Attempts at one CAS watermark; non-head history excluded; comparison refs explicit; Cycle-wide active-real fence; closed-Cycle write seal; Packet post-closure/outside hash.
- Unified stable blockers as `BRANCH_HEAD_NOT_FROZEN`, `CYCLE_ACTIVE_REAL_ATTEMPT` and `CYCLE_CLOSURE_SCOPE_DRIFT`; semantic scans found no remaining `HEAD_RUN_MISSING`, `CLOSURE_SCOPE_CHANGED`, packet-before-closure, accepted-packet-in-closure, same-Run-after-closure or OQ-17-only target wording in the synchronized scope.
- Reordered T-132 implementation dependencies to Phase 2 shared scope/typed preparation/Run head → Phase 3 durable same-payload provider simulation → Phase 4 exact-batch validation and trusted D-16/D-17/D-18 closure. Scientific happy-path evidence remains production-disabled fixture conformance until M7.
- Initial T-132 strict lint exposed two vague-reference warnings; explicit nouns replaced the pronouns and the final strict run passed.
- Final strict docs lint:
  - `node .ai/scripts/lint-docs.mjs --path dev-docs/active/experiment-foundation-productization-closure --strict` → 8/8, 0 errors, 0 warnings;
  - `...paper-implementation-productization-hardening --strict` → 12/12, 0/0;
  - `...paper-implementation-validation-cycle-planning --strict` → 7/7, 0/0;
  - `...paper-implementation-workorder-experiment-bridge --strict` → 7/7, 0/0;
  - `...paper-implementation-result-claim-dossier --strict` → 7/7, 0/0.
- `node .ai/skills/features/context-awareness/scripts/ctl-context.mjs touch` updated the glossary checksum; `verify --strict` passed with the repository's built-in schema validator because optional Ajv is unavailable. `jq empty docs/context/glossary.json` passed.
- `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`, T-132 query and `lint --check --project main` passed; T-132 remains `planned`.
- Scoped tracked-file `git diff --check`, T-132 trailing-whitespace scan, phase-order scan and blocker/semantic scans passed. Documentation/context/governance only; no product code, schema, database or cloud state changed, and no file was staged or committed.
- Whole-tree typecheck/integration/runtime tests were intentionally not treated as D-18 evidence because the D-18 update was a docs-only semantic synchronization and the shared T-124 implementation baseline remains independently in progress.

### 2026-07-13 — D-19 first cross-module implementation-acceptance synchronization
- Confirmed Phase 1 identity/readiness as a separately closed entry gate. D-19 consumes an already bound PaperProject/ValidationCycle and real Phase-1-ready typed v2 assets; a pre-bound integration fixture neither authors trust fields nor replaces the final real-bootstrap golden scenario.
- Frozen the acceptance fixture as one admitted WorkOrder revision with exactly two required cells under the general `1..N` contract. EF must materialize or exact-reuse exactly one VersionLock, one RunRecipe and two TrainingTaskSpecs, freeze exactly one batch Run/manifest, emit `RunManifestFrozen`, receive PI's sequence-fenced `BranchHeadAdvanced` and persist one durable acknowledgement.
- Frozen the endpoint at EF durable acknowledgement with zero ExecutionAttempt, provider request, CollectionAttempt, result, validation, EvidenceCandidate, REU, Cycle closure, UI/search projection and legacy migration write. Shared typed contracts, HTTP/service/repository/Prisma paths and durable inbox/outbox replay are required; capability is default-off and same-object dual write/fallback is forbidden.
- Preserved D-18 unchanged: once later phases create real-provider Attempts, any non-terminal real Attempt anywhere in the Cycle, including on a non-head Run, returns `CYCLE_ACTIVE_REAL_ATTEMPT` and blocks closure. D-19 creates zero Attempts and therefore is not runtime proof of that blocker.
- Synchronized the accepted D-19 model into the T-132 canonical bundle and T-124 PI adoption files. Semantic scans rejected Phase-1-inside-D-19 wording, single-job shortcuts, provider/runtime scope leakage and any claim that D-19 implements D-18; one residual pitfall sentence was corrected to make Phase 1 a separate prerequisite.
- Final strict docs lint passed for T-132 `8/8` and T-124 `12/12` Markdown files with 0 errors/0 warnings. T-132 trailing-whitespace, scoped T-124 `git diff --check` and D-19 boundary/count/blocker scans passed.
- Governance `sync --apply`, T-132/T-124 query and `lint --check` passed; T-132 remains `planned` and T-124 remains `in-progress`. Documentation/governance only: no product code, config, schema, database or cloud behavior was changed or claimed implemented; unrelated dirty work remained unstaged and no commit was created.
- Whole-tree typecheck, integration and runtime tests were not run because D-19 is a docs-only target-contract confirmation; future implementation acceptance must supply the planned real persistence, replay, crash and conflict evidence.

### 2026-07-13 — D-20 four-domain-Unit-of-Work synchronization
- Confirmed the D-19 successful authority spine as four domain-owned commits even under one physical Postgres: PI admission/current-revision CAS plus `WorkOrderRevisionAdmitted` outbox; EF inbox plus exact materialization, sole Run/manifest and `RunManifestFrozen` outbox; PI inbox plus head CAS and `BranchHeadAdvanced` outbox; EF inbox plus the sole durable acknowledgement.
- Frozen the minimum integration chain to exactly three events: `WorkOrderRevisionAdmitted → RunManifestFrozen → BranchHeadAdvanced`. The processed EF inbox receipt for the exact final event is the D-19 endpoint and future dispatch prerequisite; no fourth event, acknowledgement aggregate, Run flag, fifth authority commit or `dispatch_eligible` mirror exists.
- Required each consumer inbox outcome, owning-domain mutation and resulting outbox to commit or roll back together. Same event/idempotency key and payload hash reuses the stored outcome; payload drift and same-sequence/different-Run-or-manifest are terminal conflicts; lower sequence is durably stale without head rollback/outbox; temporarily invisible valid prerequisites retry with zero domain/outbox mutation.
- Clarified that the four count applies to business-authority commits, not every SQL transaction. Relay lease/retry/publish/delivery bookkeeping may commit separately but cannot write or attest PI/EF authority. No transaction callback, repository or mutable table may write both domains, regardless of same-database deployment; distributed locks and 2PC remain forbidden.
- Repo-readiness inspection found reusable repository-local Prisma transaction, unique-key-plus-hash, conditional CAS and real-Postgres rollback-test patterns, but no qualifying DB inbox/outbox or D-19 Unit of Work. Governance file/JSONL delivery, singular mutable WorkOrder/HarnessRun/live-adapter sequencing and generic overwrite-capable EF records remain explicitly ineligible as D-20 implementation evidence.
- Synchronized D-20 into the T-132 canonical bundle and T-124 PI adoption. Removed residual “cross-database only” wording, corrected the obsolete four-event count to three events/four commits and unified the next decision as D-21 additive domain-owned v2 storage versus legacy-path extension.
- Final strict docs lint passed for T-132 `8/8` and T-124 `12/12` Markdown files with 0 errors/0 warnings. Scoped T-124 `git diff --check`, T-132/T-124 trailing-whitespace and OQ/event/UoW/ack/D-21 semantic scans passed.
- Governance `sync --apply`, T-132/T-124 query and `lint --check` passed; T-132 remains `planned` and T-124 remains `in-progress`. Documentation/governance only: no product code, config, schema, database or cloud behavior was changed or claimed implemented; existing unrelated dirty work remained unstaged and no commit was created.
- Whole-tree typecheck, integration and runtime tests were not run because D-20 is a docs-only target-contract confirmation. Future implementation acceptance must supply the planned four-boundary real-Postgres rollback, replay, duplicate-delivery, payload/sequence conflict and repository-ownership evidence.

### 2026-07-13 — D-21 additive v2 storage and cutover synchronization
- Confirmed independent additive, domain-owned typed PI and EF v2 table families rather than extending the mutable single-row/single-TaskSpec ResearchWorkOrder/HarnessRun or overwrite-capable generic EF record. PI owns branch/revision/exact-cell/admission/head/inbox/outbox persistence; EF owns typed revision/readiness/materialization/Run-manifest/cell-binding/inbox/outbox persistence.
- Frozen expand-only migration and one-way product routing: legacy rows remain byte-for-byte unchanged and existing-field diagnostics/admin read-only; no backfill, persisted annotation, trust upgrade, runtime repository/view union, dual-read/write or fallback is accepted. Cross-domain persistence is exact external identity/hash/sequence/event scope with no ORM relation/FK/cascade/shared writer.
- Frozen capability behavior: default-off rejects a new v2 admission with zero PI/EF/legacy write and cannot invoke legacy. D-19 may enable only its approved acceptance entrance; after acceptance, new paper-bound product intake switches only to v2 and closes overlapping singular/generic legacy writers in the same release.
- Clarified that intake disable is not a saga kill switch. Every already committed D-20 event continues through relay/consumers to the exact EF acknowledgement; rollback preserves immutable v2 canonical/inbox/outbox audit and replay state, stops new intake and never restores or routes to a legacy writer.
- Repo inspection confirmed the legacy schema lacks immutable branch/revision/head/CAS, 1..N batch-cell parity and DB inbox/outbox invariants. Existing additive Prisma migration, repository-local CAS/transaction, conflict and default-false env-contract patterns are reusable, but generic EF upsert, singular WorkOrder/HarnessRun, governance JSONL outbox and the local-execution flag are not D-21 authority.
- Synchronized D-21 into T-132 and the T-124 PI adoption. Removed the delayed “contract legacy after stable release” window, closed generic legacy write endpoints, constrained shadow comparison to offline aggregate verification, replaced Phase 1 product dual-read rollback language and scoped the T-124 coordinator rollback so the coordinator rule cannot imply PI↔EF legacy fallback.
- Unified D-22 as the next decision: build only the minimal Phase 1 + D-19 schema pack or the complete future model, and place relational versus typed canonical-JSON invariants without widening the slice.
- Final strict docs lint passed for T-132 `8/8` and T-124 `12/12` Markdown files with 0 errors/0 warnings. Initial T-132 lint found one vague pronoun in the new D-21 architecture text; explicit legacy/rollback nouns removed the warning. Scoped T-124 `git diff --check`, trailing-whitespace and current-decision/additive/no-fallback/saga-drain/D-22 scans passed.
- Governance `sync --apply`, T-132/T-124 query and `lint --check` passed; T-132 remains `planned` and T-124 remains `in-progress`. Documentation/governance only: no product code, config, Prisma schema, database or cloud behavior was changed or claimed implemented; existing unrelated dirty work remained unstaged and no commit was created.
- Whole-tree typecheck, DB migration and runtime tests were not run because D-21 is a docs-only target-contract confirmation. D-22 and a later explicit implementation authorization must precede the repository DB-SSOT migration workflow.

### 2026-07-13 — D-22 minimal schema-pack synchronization
- Confirmed `Implementation Pack A — Phase 1 + D-19 minimal v2 spine` as the first migration boundary. The logical census contains only the fixture-required Phase 1 typed identity/draft/revision/lifecycle/readiness substrate and the PI admission-to-EF-durable-ack spine; later Attempt/provider/result/validation/evidence/closure/UI/search/legacy-mapping persistence remains excluded.
- Frozen invariant placement: identity, sequence, uniqueness, CAS, ordered dependency/cell binding and event idempotency are relational; only named schema-versioned scientific snapshots use server-hashed canonical JSON. Same-domain relations are allowed, cross-domain exact refs remain scalar and generic EAV, cross-domain FK, duplicate manifest and persisted capability/dispatch mirrors are forbidden.
- Synchronized D-22 into the T-132 canonical bundle and the seven T-124 adoption documents. OQ-01 through OQ-22 are complete; the next gate is the schema/invariant matrix and implementation-readiness/authorization review, with no default D-23.
- Initial T-132 strict lint reported two warning-threshold vague references in newly touched architecture/implementation text. Replacing the vague terms with exact D-22/Implementation Pack A nouns produced final strict lint results of T-132 `8/8` and T-124 `12/12`, both with 0 errors/0 warnings. T-124 scoped `git diff --check`, both-bundle trailing-whitespace scans and current-decision forbidden-shape scans passed; remaining “D-22 next” sentences are dated D-21 historical records rather than current authority.
- Governance `sync --apply`, T-132/T-124 query and `lint --check` passed; T-132 remains `planned` and T-124 remains `in-progress`. Documentation/governance only: no product code, config, Prisma schema/migration, database or cloud behavior was changed or claimed implemented; unrelated dirty work remained unstaged and no commit was created.
- Whole-tree typecheck, DB migration and runtime tests were not run because D-22 is a docs-only schema-boundary confirmation. Implementation authorization, DB apply approval after DB-SSOT diff review and product enable/cutover approval remain separate future actions.

### 2026-07-13 — Implementation Pack A readiness closure
- Added `07-implementation-readiness-review.md` and frozen the exact five-family D-19 asset census, model/invariant/error/test matrix, default-off capability key, source edit population, legacy database digests and A01-B10 acceptance evidence. The review result is `ready_for_implementation_authorization`, not implementation authorization.
- Corrected three current D-22 drifts found during the review: replaced two residual capability-table references with a config/routing guard, removed Run-manifest JSON as a second authority in T-124 and updated the Phase 0 decision range through D-22.
- Read-only database inspection found 1 singular PI WorkOrder, 1 submitted HarnessRun, 231 generic EF records, 15 legacy readiness rows and 6 ExternalTrainingJobs including 1 running job. Full-row digests are recorded in the readiness review. No row or database state was changed.
- `DATABASE_URL='postgresql://readonly:readonly@127.0.0.1:5432/readonly?schema=public' pnpm --filter @paper-engineering-assistant/backend prisma:validate` passed without connecting. An earlier invocation without `DATABASE_URL` returned Prisma P1012; the missing-variable invocation error was corrected by supplying the non-connecting placeholder and is not a schema failure.
- `pnpm --filter @paper-engineering-assistant/shared typecheck` and `pnpm --filter @paper-engineering-assistant/backend exec tsc -p tsconfig.json --noEmit` passed.
- From `packages/shared`, `node --test --loader ts-node/esm src/research-lifecycle/experiment-foundation-contracts.schema.test.ts src/research-lifecycle/paper-implementation-workorder-contracts.schema.test.ts` passed 50/50.
- Targeted backend node-test runs passed: `experiment-foundation-service.unit.test.ts` 11/11, `experiment-foundation-execution-service.unit.test.ts` 10/10, `paper-implementation-workorder-experiment-bridge-service.unit.test.ts` 17/17 and `prisma-paper-implementation-workorder-repository.unit.test.ts` 2/2.
- The green baseline proves existing legacy behavior only. Generic EF records, singular WorkOrder/HarnessRun, LocalScript scientific writes and mixed evidence semantics remain superseded debt and receive no A01-B10 acceptance credit.
- Final synchronization checks passed: T-132 strict docs lint `9/9` and T-124 `12/12`, both 0 errors/0 warnings; scoped diff/trailing-whitespace and current-authority semantic scans passed; governance sync/query/lint passed with T-132 `planned` and T-124 `in-progress`. Every source/config/schema file in the locked Pack A integration population remained clean after verification.
- No migration, DB apply, product code/config/schema edit, cloud operation, staging or commit was performed. The only writes were readiness documentation and idempotent project-governance synchronization.

## 2026-07-13 — Pack A implementation start verification

| Check | Outcome |
|---|---|
| explicit implementation authorization | passed; code/config/schema draft/tests/docs and isolated disposable DB are authorized |
| existing-environment DB apply/product enable/provider execution exclusion | preserved |
| start Git HEAD | `f6680225d5134d4f67bd59f4c5dbecb4eb0c476d` |
| worktree safety | 95 pre-existing modified/untracked entries retained; forbidden T-124 implementation surfaces remain outside Pack A |
| readiness source-population digest | recomputed match: `ea9673af733a6216342c0e42e6056c6d80232b2b0f00974a70639ef6c2d0f976` |
| expanded integration manifest digest | `3e9fa09d1fdf8cba60402a94c2391a9abd4962887877a13633acb1ee47b4711d` |
| `git diff --check` before first source edit | passed |

The expanded manifest adds only required package export and integration-contract surfaces to the readiness population. The manifest does not authorize any T-124 result/dossier/runtime/REU edit. Exact paths and the deterministic digest command are in `artifacts/implementation-start/00-source-population-lock.md`.

## 2026-07-13 — Source-policy handoff documentation verification

| Check | Outcome |
|---|---|
| final-summary `jq -e` assertion over overall/source-policy status, all A/B checks, blockers, default-off capability, disposable cleanup and zero excluded/external writes | passed |
| summary file SHA-256 | `246ab54eb6a611ec9c1d4430e0cdadb6913989e6561dcc6617e95b6775fc675f` |
| attestation file SHA-256 | `bd26c540e6a1698e94e7ddaaf7eb1ce217560e3f8bb0f6e61cc6b990b419d6ef` |
| `node .ai/scripts/lint-docs.mjs --path dev-docs/active/experiment-foundation-productization-closure --strict` | 24/24 passed; 0 errors; 0 warnings |
| closure-ledger scan | EF-P25 `verified`; EF-P27 `in-progress`; remaining `SOURCE_POLICY_UNRESOLVED` references marked historical/superseded |

No code, configuration, Prisma artifact, other task package, database or external system was modified by the handoff documentation update.
