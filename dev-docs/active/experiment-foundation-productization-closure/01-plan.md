# 01 Plan

## Execution posture
- Current state: `in-progress`; M0-M6 均已完成，M6 最终 run `t132-m6-release-20260725-v5` 通过 M6-01..M6-10，T-131 typed-v2 consumption、agent/API usage-fit、OpenAPI/context、named-local no-evidence Cycle closure 和 release runbook 均已收口。OQ-01 through OQ-22、Pack A/Pack B、Pack C、zero-write Aliyun `public_resource` preflight，以及 M7-I0..I3 default-off code/schema/test implementation 均已完成。M7 收敛 run 经独立评审与 M7-QR 硬化后为 `t132-m7-offline-20260724-v3`（passed，实测谓词），M7 迁移 `20260723100000` 已于 2026-07-24 经批准 apply 到 named-local（记录 `artifacts/db/m7-real-provider-20260724/`）。当前 named-local cutover=`true`，admission/simulation/scientific-validation/PI-closure/cloud-preflight/real-provider capability 均为 `false`。任何 provider write、scientific execution 或 non-local rollout 仍是独立后续授权；M5 已按 D-24 收窄为 agent-first 工作流切片（UI 产品旅程与语义检索随未来 UI 重设计另立任务）。
- Pack A state: implementation and exact source-policy binding are complete; final run `packa-d19-source-policy-20260713-r2` passed A01-A04 and B01-B10 with `blockers=[]` on disposable PostgreSQL.
- T-132 remains a single execution package. Internal workstreams may run in parallel only after the shared invariant contracts are frozen.
- Every phase MUST add its own negative/integration evidence. A final control-plane scenario cannot compensate for missing phase-level proof.
- Pack B 已完成 product code、default-off config、additive Prisma schema/migration artifacts、isolated disposable-Postgres tests、named local-development schema apply，以及 exact acknowledged Pack A Run 上的产品 E1-E5。所有非本地环境和真实 provider/scientific paths 仍关闭。
- Any persisted-field change MUST use `sync-db-schema-from-code`; DB apply remains a separate approval gate.

## Current remaining sequence — reconciled 2026-07-27

1. **Completed 2026-07-26 — A / OSS:** created and console-verified private `pea-m7-canary-6194-202607` in `cn-shanghai`, SSE-OSS/AES256, Block Public Access, and enabled lifecycle rule `pea-output-delete-30d` for 30-day deletion of `output/` objects/fragments. Materialized the exact bucket into both RAM JSON files and recomputed their final digests.
2. **Completed 2026-07-26 — B / RAM:** both custom policies and separate roles are created and console-verified. Controller policy is current v1 at repository SHA-256 `ddde63f223f8d1982da124414ff8224aa7a431f56b51af834030b4fb681f4d8c`; runtime policy is current v2 at repository SHA-256 `1eb7de00aceacc14817b058291eb4f2e85cdbb4c10ea467c91084a75094b1a4b`, with `ListObjects` restricted to `input` / `input/*` and object read/write statements separated. Controller role `300042892692129613` trusts only owner user `acs:ram::1183869713036194:user/user_0002`; runtime role `300525928077898732` trusts only PAI service `pai.aliyuncs.com`. Each role has exactly its matching custom policy and no cross-attachment.
3. **Decision completed 2026-07-26 — C / workload delivery route:** the personal ACR route is abandoned after the console rejected creation because the account is not personally verified. Use a PAI official CPU image plus content-addressed OSS code/data/output bindings; do not open or purchase an enterprise ACR instance for this canary.
4. **Provider lookup and mount-service verification completed 2026-07-27:** the read-only `GetImage` call returned HTTP 200 for PAI asset `image-liuxvj7p2qcnflha84` and resolved the exact regional `ImageUri` to `dsw-registry-vpc.cn-shanghai.cr.aliyuncs.com/pai/torcheasyrec:1.3.0-pytorch2.12.1-cpu-py311-ubuntu22.04`. The PAI “全部云产品依赖” page reports DLC → OSS data storage as `已开通`. `GetImage` returned null `Identity`/`Signature` and no OCI/content digest, so provider asset identity and content identity remain distinct; never substitute a tag, `ImageId`, request metadata or a derived metadata hash into `container_image.image_digest`.
5. **Completed 2026-07-27 — D / source, slice and OSS upload:** verified the official BEIR SciFact MD5, recorded the downloaded archive SHA-256 and license split, retained all 5,183 corpus records plus the 300 test-query IDs in source order, and excluded qrels/training data. Uploaded the exact `entrypoint.py`, `corpus.jsonl` and `queries.jsonl` objects to their content-addressed keys with Cloud Shell temporary credentials. All targets were absent before upload; post-upload content lengths and CRC64-ECMA values match local files. Both manifests are `uploaded_verified`; `create_job_authorized` remains `false`.
6. **Completed 2026-07-27 — provider-managed image identity contract:** legacy `ExecutionBundle@v1` remains the exact OCI-digest contract. New `ExecutionBundle@v2` accepts only an explicit `provider_managed_asset` identity containing the exact PAI provider asset metadata and the constant scope `m7_l1_diagnostic_only`. Redacted manifest v2 stores `provider_managed_asset_identity_hash`, never `image_digest`; mixed/surrogate shapes and regional URI drift fail closed.
7. **Completed offline 2026-07-27 — SciFact authority plan:** server-enforced read-only named-local inventory proved that only historical Wikipedia/NQ Dataset revisions exist, so neither may be reused for SciFact. `scifact-authority-v1.json` now defines two reviewed DataPolicies and two source/slice/checksum-exact Dataset drafts. The in-memory plan passed with stable server-planned IDs/hashes and exact mirror alignment; database/cloud access remained `none`, and all three authorization booleans remain `false`.
8. **Completed 2026-07-27 — named-local SciFact authority landing:** after the corrected 26-row supplemental authorization, the restart-safe importer created exactly 2 DataPolicy identities/revisions/receipts, 2 Dataset identities/revisions/receipts, 10 lifecycle events and 4 lifecycle projections. Exact replay created zero rows and reused the complete prefix; 242 non-target application tables were unchanged by primary-key/row-version digest. Both mirror entries now bind the exact returned Dataset revisions/hashes. No bundle, readiness, cloud, provider or scientific row was written.
9. **Remaining separately authorized bundle gate:** create/freeze the reviewed v2 bundle from those exact bindings, rerun the default-off same-payload gate, and perform a fresh read-only `GetImage` comparison immediately before live submission. The completed 26-row authorization explicitly excludes bundle freeze.
10. Direct commits to `main`, without a PR, are the owner-confirmed delivery strategy; do not rewrite or force-update history.
11. Immediately before the first `CreateJob`, require a fresh short-lived controller STS supplied outside the repository and the exact in-session authorization string with date, ¥50 ceiling and two-job limit. Keep both capabilities false until then.
12. Run M7-L1 as diagnostic-only and require `real_provider_canary_passed`, terminal/cleanup verification, zero duplicate jobs and zero ExperimentResult/EvidenceCandidate/REU. M7-L2 remains a separately authorized scientific closure and requires OCI/content-digest image identity.
13. Before marking T-132 `done`, resolve the four non-M7 audit remainders: EF-P06 product candidate promotion, EF-P14 bound bootstrap/legacy-null handling, EF-P15 standalone attachment/revalidation, and EF-P21 semantic retrieval (already deferred by D-24). Each needs either implementation evidence or a named follow-up task; no silent scope loss.

## Pack C execution plan — authorized 2026-07-18

Authorization scope: Phase 4 per `09-pack-c-implementation-readiness-review.md` (OD-C1..C4 confirmed). Baseline HEAD at authorization: `3d241127`. Census inputs: `artifacts/pack-c-preplanning-20260718/`. All new write paths are default-off behind the two OD-C2 capability keys; every scientific happy path stays production-disabled conformance; the only first-release live path is the no-evidence closure. DB apply remains a separately approved named-local gate via `sync-db-schema-from-code` with a prior recovery point, per Pack A/B precedent.

### Slice C-EF — scientific validation kernel (gates `packc-ef-*`, checks PC01-PC07 + PC19 EF half)

1. Shared v2 contracts: per-cell complete `ExperimentResult` envelope, batch-scoped `ScientificValidationReport` (exact Run ref/`run_manifest_hash`, canonically ordered cell/result refs+hashes, exact protocol revision/hash, `validator_profile_version/hash`, ordered rule results, `passed | failed | unsupported`), `EvidenceCandidate` and the `EvidenceCandidateQualified` outbox envelope; schema tests follow the existing v2 contract file pattern.
2. Required-rules execution engine over the existing Pack A typed `required_rules` authority: code-local closed capability map keyed `rule_type@rule_version` (first slice exactly `metric_contract@v1`, `artifact_contract@v1`), readiness-time check plus final-validation recheck of the frozen validator profile, `UNSUPPORTED_RULE` fail-closed before Run freeze/dispatch and at validation.
3. Additive EF Prisma families for result/report/candidate plus outbox use; exact DDL matrix produced through `sync-db-schema-from-code`; apply is a separate gate.
4. **Completed 2026-07-19:** `ScientificValidationService` as sole writer: complete-eligible-real-provider-batch validation, `passed`-only atomic report/Candidate/outbox mint, idempotent transaction key, simulation/LocalScript/fake provenance rejection. C-EF step 4 intentionally adds no route/composition/capability wiring.
5. Service-layer closure of legacy scientific writers:
   - **5a completed 2026-07-19:** census §8 items 1-7 are closed below HTTP. Generic `createRecord`/`upsertRecord` cannot write `experiment_result`, `result_validation_report` or `evidence_candidate`; `collectJob` fails at method entry before repository/adapter/diagnostic access; PI live collect propagates the same typed closure.
   - **5b completed 2026-07-20 (scoped request/write cleanup):** deleted the unreachable legacy collection body, heuristic analyzer, partial/result/observation/fact/validation/fine-tuning/evidence creators and their dead dependencies; removed `accept_partial` from the EF and PI request types/schemas and all forwarding/UI assembly. Immutable stored-row vocabulary (`accepted_partial`, `partial_acceptance_ref`, legacy partial-result shapes) is deliberately preserved for D-08 diagnostics/admin reads. Live submit-time partial materialization and census §8 provenance items 15-17 were not changed by the authorized slice.
6. **Completed 2026-07-20:** checked-in `packc-ef-*` runner executes PC01-PC07 plus PC19-EF, forces the nonce-bound disposable PostgreSQL lane with zero skips, publishes exact evidence/zero/redaction keysets and a canonical-summary SHA-256, and returns `blocked` rather than `passed` when Docker/PostgreSQL is unavailable (proven by sandbox run r1). Final host run `packc-ef-20260720-r4` passed with 72/72, zero skips/blocked, both migrations applied to the digest-pinned disposable container and full cleanup; r2/r3 fail-closed lineage (two relational test-harness defects, product fences correct) is recorded in the closure artifact.

### Slice C-PI — gateway, D-18 watermark and closure authority (gates `packc-pi-*`, checks PC08-PC17 + PC19 PI half + PC20)

1. Shared PI v2 contracts: `RunEvidenceUnit`/`TraceManifest` v2, identity-only gateway command, closure watermark/snapshot shapes and the readiness-evaluation output.
2. Evidence Trust Gateway as sole REU writer: atomic REU/TraceManifest/outbox from one eligible `EvidenceCandidateQualified` inbox consumption; failed/cancelled/incomplete and all non-production provenance ⇒ zero REU.
3. **Completed 2026-07-20:** D-18 watermark evaluator/read model: deterministic server-derived readiness decision + exact candidate snapshot/hash; current-revision/exact acknowledged-head membership, `BRANCH_HEAD_NOT_FROZEN`, Cycle-wide `CYCLE_ACTIVE_REAL_ATTEMPT` including non-head Runs, closed-Cycle blocking, zero-branch typed failure and zero writes. The next closure-authority transaction owns `CYCLE_CLOSURE_SCOPE_DRIFT` CAS re-resolution; no caller-writable readiness record was added.
4. Closure authority: existing `/complete` action becomes the sole writer of closure kind + nullable disposition + accepted proposal ref/hash + embedded CAS snapshot/hash; server-derived selected exit from admission-frozen exits; caller `cycle_assessment`/`decision_exit` rejected; closed-Cycle write seal; no-evidence closure is the only live path behind the PI key.
5. `paper_experiment_sidecar` generic create/upsert authority closed; Sidecar rebuilt strictly from closure authority as display-only projection.
6. **Completed 2026-07-21:** checked-in `packc-pi-*` runner executes PC08-PC16, PC19-PI and PC20, reports PC17 as `deferred_to_cutover` only after its v2 negative-space census passes, and forces the nonce-bound `packc_pi` disposable PostgreSQL lane with zero skips (blocked-not-passed without PostgreSQL, proven by sandbox r1). Final host run `packc-pi-20260721-r4` passed 124/124 with marker/cleanup verified; r2/r3 lineage (prefix name-validator fix, the real closure-outbox `revisionSequence` CHECK product fix, and the lane id-factory monotonicity fix) is recorded in the closure artifact.

### Slice C-cutover — atomic T-124 seam (gates `packc-cutover-*`, checks PC17-PC18; scheduled per OD-C3 after T-133 N2+N6)

1. **Increment 1 completed 2026-07-21:** monitor/manual attachment and live collect/cancel/finalization/sync paths create monitor or lifecycle facts only. All legacy REU/TraceManifest construction is deleted, explicit legacy minting parameters return `LEGACY_SCIENTIFIC_WRITER_CLOSED`, and the v2 Evidence Trust Gateway is the sole REU writer.
2. **Increment 1 completed 2026-07-21:** `PROJECT_ACCOUNTABLE_RUN_STATUSES`, project-wide dossier REU accounting, the unbounded scan and supersession heuristics are removed. Ready dossiers require explicit closed-Cycle snapshot refs and exact closure id/hash/project verification with no legacy fallback.
3. **Increment 1 completed 2026-07-21:** both pre-closure Packet triggers are closed with `RESULT_INTERPRETATION_PACKET_MATERIALIZATION_CLOSED`. Post-closure materialization remains intentionally unavailable until a later increment consumes `ValidationCycleClosed`; no partial materializer was introduced.
4. **Increment 1 completed 2026-07-21:** superseded T-124 writer, packet-trigger and S3 accounting assertions are replaced by gateway-only and closed-snapshot fail-closed coverage.
5. **Increment 2 completed 2026-07-21:** legacy `/complete` rejects below HTTP with `LEGACY_SCIENTIFIC_WRITER_CLOSED`; draft/admission/completion write contracts no longer expose caller conclusion fields while stored/read shapes remain intact. The v2 closure unit of work now transitions the product Cycle row to `completed`/`completed` with an optimistic lifecycle guard in the same transaction as the immutable closure/outbox. All four Cycle-sealed services require an explicit closure lookup at every constructor site.
6. **Increment 3 implemented 2026-07-22; host convergence pending:** `packc-cutover-*` closes PC17/PC18 with five targeted suite groups plus exact static/zero censuses and intentionally adds no third PostgreSQL lane. `packc-final-*` derives and executes fresh EF/PI/cutover children, verifies their canonical SHAs, maps PC01-PC20 (PC19 requires both halves), runs the backend full suite once and exits 0 only when every child and the backend pass. Standalone `packc-cutover-20260722-r1` passed 131/131; `packc-final-20260722-r3` returned exit 2 / `blocked` with EF/PI PostgreSQL unavailable, cutover 131/131, 11 PC passed and 9 relational PC blocked. Claude must rerun the final gate on the host with a fresh id; these gates must not restore compatibility writers or optional seal lookup behavior.

### Verification commands

- `pnpm typecheck`; `pnpm --filter @paper-engineering-assistant/shared test`; targeted backend suites per slice; disposable-PostgreSQL lanes with skip=0 per gate; backend full suite at slice closure; protected-table before/after digests and exact evidence keysets per Pack A/B convention.

## Zero-write Aliyun cloud-preflight checkpoint — 2026-07-18

The Phase 6 preflight implementation lane is complete: exact provider payload materialization and hashing, redacted-only evidence, same-payload fake lifecycle, paginated official-SDK read-only calls, code-level write denial, temporary-STS/policy-evidence path/digest/lifetime validation, server-enforced read-only database evidence, a default-off env contract and CP01-CP12 machine gate are checked in. No database schema or persisted authority family was added.

Local runner r9 is intentionally `blocked`, not passed: exact profile values, a complete temporary STS triplet, current reviewed repo-external policy evidence and its independent exact-file digest are absent, and the capability remains disabled. The next action is a separately controlled zero-write window that supplies those inputs and reruns the same gate. The controlled window may call only the three frozen read operation types (with bounded list pagination) and may not call `CreateJob`, upload data, apply migrations, change product traffic or mint scientific evidence. A blocked run cannot close EF-P16.

### Public-resource path update — 2026-07-22

The execution profile no longer assumes every workspace owns a DLC quota. An explicit v2 selector supports `exact_quota` or `public_resource`; the chosen path is `public_resource` for workspace `1450165` in `cn-shanghai`. Public-resource mode is valid only when `ResourceId` is absent end to end and never purchases quota, auto-selects a private resource or silently falls back from an exact quota.

Offline runner r1 first closed the profile-shape/payload/fake-lifecycle portion. The later controlled r6 window closed the real read-only boundary: CP01-CP12 passed, 13 official-SDK reads succeeded, 108 CPU specs were visible and 105 available, 88 protected tables were unchanged and all provider/CreateJob/database/scientific write censuses were zero. The cloud-preflight capability was disabled again and the temporary credential expired. Durable closure: `artifacts/implementation/10-cloud-preflight-live-closure.md`.

## M7 real-provider implementation plan — readiness frozen 2026-07-23

Ownership is singular: T-132 implements M7 and T-106 consumes T-132's final redacted evidence. The existing acknowledged Run is immutable simulation-only history (`materialize-only` RunRecipe, `simulation_*` TaskSpec outputs and simulation-only DB CHECKs), so M7 cannot dispatch the historical Run or upgrade its trust. D-23 requires a new PI WorkOrder revision bound to an exact typed `ExecutionBundleV2`; the normal T1-T4 spine then creates a new executable Run/head acknowledgement.

Implementation sequencing is fixed in `artifacts/implementation/11-m7-real-provider-readiness-review.md`:

1. M7-I0 contracts/source-population lock and a new default-false real-provider intake capability.
2. M7-I1 typed ExecutionBundle + WorkOrder/RunRecipe/TaskSpec v2 + reviewed additive/generalizing migration, tested only on disposable PostgreSQL.
3. M7-I2 official Aliyun `CreateJob/GetJob/ListJobs/StopJob` adapter, exact output collection and accepted-response-loss recovery with no blind duplicate submit.
4. M7-I3 offline/isolated machine gate with intercepted network and zero named-local/cloud writes.
5. M7-L1, only after a new explicit authorization, runs a cost-capped diagnostic canary and remains evidence-ineligible.
6. M7-L2, under another source/budget/scientific authorization, runs the exact scientific workload and enters existing Pack C validation/evidence/closure gates.

M7-I0 through M7-I3 default-off code/schema/migration-file/test implementation was authorized and is implemented. The authorization still expressly excludes `CreateJob`, OSS upload/write, applying the migration to an existing/named database, capability enable, scientific activation and product rollout. M7-L1/L2 remain separate future authorizations.

Implementation checkpoint:

1. M7-I0 contracts, hash profiles, source-population lock and both default-false capabilities: complete.
2. M7-I1 typed ExecutionBundle storage, executable T1-T4 materialization and additive/generalizing migration artifact: complete; tested only on disposable PostgreSQL.
3. M7-I2 injected official-SDK transport, exact collection and recovery-only accepted-response-loss handling: complete; no live client composition or cloud call.
4. M7-I3 gate: implemented at `.ai/scripts/experiment-foundation-m7-provider-gate.mjs`; run `t132-m7-offline-20260723-v1` passed M7-01..M7-14 before the required T-106 evidence import and is rerun after that import to close M7-15.

## Formal PI scope → Pack A product checkpoint — 2026-07-15

The named-local product path now starts from active PaperProject `P313`, traverses the normal PI bootstrap/motive/trace-board/ValidationCycle routes, and enters the dedicated v2 admission route only while the admission window is explicitly enabled. T1-T4 drained to the sole EF acknowledgement, after which admission was disabled while committed cutover remained enabled. The final exact scope and prohibited-write evidence are frozen in `artifacts/product-pack-a-local-20260715/05-product-landing-closure.md`.

Pack B E1-E5 has now completed against the exact acknowledged Run without scientific evidence, ValidationCycle closure, real-provider calls, legacy changes or reopened Pack A intake. The next independently fenced slice is exact-payload real read-only cloud preflight. Any write-capable provider or non-local rollout remains a separate decision.

## Pack B product execution checkpoint — 2026-07-15

The named-local product route admitted the fixed business key `packb-product-p313-two-cell-v1` only while the gitignored simulation window was enabled. Production Prisma repositories and the deterministic no-network worker converged the two exact cells through E1-E5. Final read-only r2, after the window was closed, proved the exact 2/2/12/8/2/2 census, 88 protected-table digests unchanged, zero foreign lineage/network/provider/scientific effects, `workflow_simulation_passed`, scientific `not_started` and evidence eligibility `false`. Durable evidence is `artifacts/product-pack-b-local-20260715/05-product-execution-closure.md`.

## Pack A execution closure — 2026-07-13

The authorized Phase 1 plus D-19 minimal spine has completed contracts/config, additive schema/migration, typed identity/readiness, T1-T4 services/repositories, durable relay, exact official-source policy binding and disposable-PostgreSQL verification. The completed work closes the bounded Pack A control-plane source-binding slice, not the whole T-132 roadmap. Phase 3 onward, D-16/D-17/D-18 closure migration, product bootstrap/UI/search, existing-environment DB apply and product cutover remain outside Pack A.

Source-policy closure evidence is `artifacts/implementation/01-pack-a-source-policy-closure.md`. The PASS does not assert full-corpus retrieval, extraction reproducibility, scientific alignment, provider execution, DB apply or cutover.

## Pack B execution closure — 2026-07-13

Pack B implements the already-confirmed Phase 3 boundary as an independent EF v2 provider-control lane. Its exact table families, state machines, UoWs, routes, capability, error matrix, PB01-PB16 acceptance and modification allowlist are frozen in `08-pack-b-implementation-readiness-review.md`. Final gate `packb-20260713-final4` passed PB01-PB16 plus four non-skipped Prisma relational tests on disposable PostgreSQL. The slice uses a deterministic no-network fake provider and same canonical payload/hash; the Pack B slice cannot call Aliyun, spawn LocalScript or publish scientific records. Durable evidence is `artifacts/implementation/02-pack-b-technical-closure.md`.

## Pack B named-local rollout checkpoint — 2026-07-14

The reviewed additive migration is applied to the named local-development target. At the historical landing checkpoint the local simulation override was temporarily enabled through `env-localctl`; disabled/enabled app-composition probes proved strict capability routing, continued legacy-writer closure, unchanged Pack A/legacy authority digests and zero Pack B rows. The override was restored to `false`. At that time the target had no admitted PI v2 revision, Run/head or final EF acknowledgement, so the enabled probe correctly stopped at `EXECUTION_HEAD_ACK_REQUIRED`. The 2026-07-15 product checkpoint above supersedes the missing-head state; Pack B E1-E5 remains the next separately authorized execution milestone. Durable historical evidence is `artifacts/implementation/03-pack-b-local-landing-closure.md`.

## Pack B post-implementation quality remediation — 2026-07-14

Status: `completed`. The authorized repair pass was a pre-product closure gate, not a new product slice. The repair made migration inspection fail closed and disposable execution hermetic; generated durable app/gate evidence from checked-in producers; preserved external-job identity after submit; bounded fake-provider diagnostics; wired Fastify response schemas and one stable reason-code map; removed impossible real-provider seams, unreachable states and dead repository/service APIs; centralized pure repository invariants; and corrected already-applied immutable-FK/redundant-index debt only through a new cleanup migration. The original applied Pack B migration checksum remains immutable.

Exit evidence: final disposable run `packb-quality-remediation-final-20260714-r7` passed PB01-PB16, targeted 6/6 + 63/63 and relational 5/5; cleanup migration digest is `05ddb7fa653e76b66fc6c0c4747b3680e3815a44dc672b8a61042310911dd5b8`; final named-local run `packb-quality-remediation-local-20260714-r5` passed after backup/apply with 60/60 migrations, exact 15 FK/35 CHECK/38 index census, unchanged Pack A/legacy digests and zero Pack B rows. DB/API context was regenerated and no T-124 application population entered the remediation. Durable evidence is `artifacts/implementation/05-pack-b-quality-remediation-closure.md`.

## Pack A/Pack B deep-cleanup closure — 2026-07-14

Status: `completed` for the authorized cleanup scope. The plan retained the existing Pack A/Pack B families and removed only proven duplicate or write-only authority. T2 now revalidates exact readiness under the same commit transaction before its first write; family keys are independent from logical ids; E1 persistence/conflict/latest-Attempt work is batched; readiness resolution is cached; version counters are positive integers; child processes are hermetic and disposable PostgreSQL is digest-pinned. Fourteen zero-consumer shared row schemas plus newly dead helpers were removed after whole-repository consumption scans, while interfaces, request/event/error schemas and consumed IO schemas remain public. D-19/Pack B share one checked-in disposable-PostgreSQL helper; canonical hash matching and persisted integer bounds have one shared source of truth.

The placeholder cleanup remains additive. The final hardening migration is `20260714210000_normalize_experiment_v2_event_payloads` (`37eed54494aa2dc246fe7d5a9b2de2a027474b416ada8a5f18ab4bc194a65f3a`): the four PI/EF inbox/outbox tables retain payload-only JSON, typed envelopes are reconstructed from structural columns, and both payload and envelope hashes are verified. The migration also makes all 38 Pack A same-domain FKs double-`RESTRICT` and adds nine fixed-v1 DB CHECKs backed by repository read fences. PostgreSQL `Int` inputs are contract-bounded to signed 32-bit values. The migrations are applied only to the reviewed named-local target, now 62/62. Pre/post semantic authority remains 208 rows at `sha256:494cdf5a02e2379a66a12bc82411e8237f39e949a2f992f3e12a0e220f613d74`; legacy remains 257 rows at `sha256:f9e7a6875c9a3597ecb485abc978920e461a3af33f071c676665439dde17211d`; Pack B is 6/6 tables and 0 rows.

Exit evidence: source-backed `d19-deep-cleanup-final-20260715-r19` passed source policy plus A01-A04/B01-B10, standalone PostgreSQL 6/6 with skip=0, reset marker verification and container cleanup; summary SHA-256 is `9961eec956d216c65d1ac24be57214c05680dd7c1ae6d8ea510c8dbcef73a647`. `packb-deep-cleanup-final-20260715-r16` passed PB01-PB16, shared 6/6, backend 89/89, embedded Pack A PostgreSQL 6/6 and Pack B PostgreSQL 7/7 with skip=0, reset marker verification and cleanup; summary SHA-256 is `207450f7104b24542574f883ea2e851425e11412c03f21e65413444d3c2bfd6d`. r13 remains an obsolete-path fail-closed negative, not a product failure. The final remediation requires exact evidence keysets; one portable reviewed source digest and frozen ordered slots; one database identity validator and marker assertion path; explicit frozen event/command/provider-control hash profiles; and ProviderCommand-to-Attempt payload id/hash plus cancel-reason parity across every read/claim/heartbeat/release/outcome/collection path. Tamper fails before write or transport. Gate meta passed 70/70, backend identity/guard 10/10 with skip=0 and shared full 330/330. Named-local r18 remains 40/40 exact, 238-table parity, 62/62 and default-off at that checkpoint. Strict republish binds the same r18 source artifacts to durable SHAs `9f4e0e5f81d4f127ac1cd5c956c639a8f89a9406d0af873e5d06d2d039f10e4e` and `bd702c6aca7104248839da1bb224e711d9eee64ddf6a98e4824f713b03e8eaad`, producer `982119a31989bbad1da51ae96892241bab90add1ee084031596f550350838c38`. Backend full suite completed with 2,083 tests: 2,034 passed, 0 failed, 49 conditional database/provider-canary skips, 0 todo, duration `396225.938458ms`; database acceptance remains the forced zero-skip 6/6 and 7/7 lanes. Current local cutover is `true`; admission and simulation are `false`. Durable evidence remains consolidated in `artifacts/implementation/05-pack-b-quality-remediation-closure.md`, `artifacts/db/pack-b-local-development-20260714/07-quality-remediation-addendum.md` and the later formal Pack A closure; `.ai/.tmp` gate output is ephemeral and may be deleted after publication.

## Dependency order

```text
Phase 0 decisions and compatibility baseline
  -> Phase 1 canonical identity/readiness
      -> Phase 2 shared PI scope/admission + typed preparation + Run-manifest/head spine
          -> Phase 3 durable provider control + same-payload simulation
              -> Phase 4 exact-batch scientific validation + D-16/D-17/D-18 trusted closure
                  -> Phase 5 project-scoped researcher workflow
                      -> Phase 6 release closure + zero-write cloud preflight
                          -> optional real provider canary
```

- Phase 2 is the first cross-module vertical spine. Exact-batch validation and provider control MUST NOT invent provisional Run identity before its admitted revision, manifest and head acknowledgement exist.
- D-19 is the first cross-module implementation acceptance slice. Phase 1 identity/readiness is a separately closed entry gate, not part of D-19; an EF-only Phase 1 result is foundational evidence but not the joint product spine.
- Phase 3 provider work begins only from a Phase 2 locked TaskSpec/payload and acknowledged effective head Run; Phase 3 may not define a second broker, cell selector or head rule.
- Phase 4 scientific happy-path fixtures are production-disabled conformance evidence in the zero-write first release. Real result/EvidenceCandidate/RunEvidenceUnit production claims remain closed until the separately authorized M7 provider execution gate.
- Phase 5 MUST NOT implement client-only filtering before the project-scoped server query/read model exists.
- Aliyun payload materialization, real read-only preflight and same-payload fake lifecycle are part of Phase 6. LocalScript/fake outputs are non-scientific simulation and MUST NOT mint evidence. Real provider execution/`CreateJob` requires a separate post-M6 confirmation.

## Phase 0 — Align decisions and freeze the baseline

### Entry gate
- Task package and governance mapping exist.
- 2026-07-10 review findings are captured in `06-audit-closure-matrix.md`.

### Steps
1. Revised OQ-01 plus OQ-02 through OQ-22 are confirmed, including D-12 action budgets, D-13 batch/head semantics, D-16/D-17/D-18 trust/closure authority, D-19 first implementation acceptance slice, D-20 four-local-UoW seam, D-21 additive v2 storage/cutover and D-22 minimal schema/invariant placement. Append every accepted decision to `03-implementation-notes.md` and immediately update affected roadmap/architecture/verification text.
2. Freeze three product journeys:
   - Literature/manual candidate → immutable reusable asset;
   - project/work order draft constraints → PI exact cell-plan compilation → one admission → EF Recipe/TaskSpec/payload materialization → zero-write preflight/simulated provider lifecycle;
   - PI experiment plan → ResearchWorkOrder → EF prepare/simulate control → PI lifecycle projection → immutable Cycle closure snapshot/Sidecar display, with scientific evidence explicitly absent.
3. Inventory every ExperimentFoundation record kind as `draft-mutable`, `immutable-revision`, `derived-attestation` or `legacy-only`.
4. Inventory all current readiness, promotion, execution, result validation, evidence minting and PI intake entrypoints.
5. Mechanically inventory rows missing supported v2 identity/schema and verify that the scan writes no per-record labels, summaries, reasons or trust upgrades; include T-131's unresolved benchmark forward reference separately as active v2 preparation work.
6. Produce additive v2-path, feature-gate, legacy-read/v2-write separation, replay and rollback design with no legacy-row backfill.
7. Freeze one shared PI→EF scope vocabulary for ImplementationProject → ValidationCycle → WorkOrder branch/logical identity + immutable branch revision sequence → exact WorkOrder revision/hash → one immutable Run/manifest hash → required cell key/TaskSpec ref+hash → ExecutionAttempt, and inventory every current field/query that cannot express the scope.
8. Keep PI WorkOrder revision authority distinct from EF generic-record revisions; freeze `parent_branch_id`, optional forked-from Run, `branch_intent`, `expected_effect` and `difference_from_parent` as PI planning fields included in WorkOrder admission/`approved_plan_hash`.
9. Freeze the D-11/D-13a/D-15 object-operation matrix: draft CAS and automatic exact-cell compilation before admission; one admitted `exact_cell_plan` → the revision's only batch Run; same-cell/TaskSpec technical retry → cell-scoped ExecutionAttempt; any seed/repeat/parameter/required-result/cell-set change → WorkOrder revision/re-admission; changed branch frame/relation → fork; changed Cycle question/decision exits → new ValidationCycle. No existing Run is rebound and no RunSet/RunGroup is introduced.
10. Freeze D-15 exact-plan authority: PI embeds canonical ordered 1..N scientific cells and `cell_plan_hash` in the admitted revision/`approved_plan_hash`; ranges/grid/seed-count remain non-authoritative draft inputs; EF validates one-to-one parity and adds TaskSpec/provider/result bindings without sampling, scientific seed/parameter/result-contract defaults or cell selection. Optional authoring-provenance persistence/hash treatment remains a Phase 0 detail.
11. Freeze retrieval authority: PI-owned project-scoped projection, EF-owned deterministic execution facts, global technical indexing only, deterministic PI semantic documents and exact source re-resolution.
12. Freeze action-count fixtures: T-132 one-project/one-Cycle/one-branch/one-admitted-revision/one-batch-Run/N-required-cell zero-write flow = 1 initiation / 2 authority / 0 recovery / 0 plumbing; T-124 single-Cycle full-paper reference flow with one strong claim and one export = 1 / 4 / 0 / 0; future real provider execution adds exactly its declared external-effect authorization.
13. Freeze D-13b head sequencing: EF Run+manifest+`RunManifestFrozen` outbox atomicity → PI exact-scope/sequence CAS + `BranchHeadAdvanced` → EF durable acknowledgement → first Attempt/dispatch. Failed/cancelled latest Runs stay head; stale un-dispatched Runs never produce side effects.
14. Freeze D-14's orthogonal state axes: simulation Attempt events may reach terminal lifecycle states and rebuild `workflow_simulation_status`, but Run/cell `scientific_execution_status` remains `not_started`; PI's no-evidence Cycle closure references exact EF facts without mutating or copying scientific authority.
15. Freeze D-16's single accounting paths and atomic cutover: complete protocol-compliant validation-passed EvidenceCandidate→one Gateway→RunEvidenceUnit; exact Run/Attempt execution facts→the existing Cycle closure record's embedded immutable snapshot/hash; Sidecar is rebuildable display; dossier consumes explicit closed-Cycle refs/hashes. Inventory every mixed `run_status`, failed/cancelled REU writer and project-wide REU scan, with no FailureEvidenceUnit, dual-read fallback or extra action.
16. Freeze D-17's responsibility chain and atomic cutover: typed EF required rules + exact-batch validation/sole EvidenceCandidate writer → PI Gateway/REU facts → automatic exact-hash-bound Result Analysis proposal → the existing Cycle-closure action as sole scientific-disposition writer + server-derived selected exit → closed-Cycle-only interpretation/claim/dossier/next-step consumers. Inventory opaque protocol blocks, heuristic per-job validation, generic trust writers, caller-authored Cycle assessment/exit, negative/inconclusive REU status, direct result-analysis packet materialization and open-proposal consumers. Add no ScientificConclusion aggregate, rule DSL/plugin, waiver or user action.
17. Freeze D-18's current-effective closure authority: one CAS-fenced `closure_watermark` covers every branch with an admitted revision and each exact current admitted revision/hash/sequence plus matching effective head Run/manifest/cells/all Attempts. A candidate retains a no-head branch as `effective_head_run_ref=null` with `BRANCH_HEAD_NOT_FROZEN`, but closure cannot commit until every branch has its acknowledged effective head. Superseded/non-head Runs remain queryable history and are excluded; old v2 comparison input requires an explicit ref/hash. Any Cycle-wide active real Attempt or pending head saga blocks closure, and closed-Cycle execution writes are forbidden.
18. Freeze the legacy cutover population: completed legacy remains unchanged audit-only; active legacy work must finish before cutover or restart from a new v2-bound project/Cycle/revision. Do not reconstruct partial lineage, conditionally upgrade trust or restore a legacy trusted writer during rollback.
19. Freeze the minimal joint contract pack: exact schema/unique/CAS constraints, hash profiles, three integration-event envelopes, inbox/outbox/idempotency/conflict keys, four domain-authority Unit-of-Work boundaries and one default-off admission configuration/routing guard without a persisted capability table or general RBAC/policy engine.
20. Freeze the product-gate command name, output schema, required check IDs and `.ai/.tmp/experiment-foundation-productization/<run-id>/` artifact root; Phase 6 executes the predeclared gate rather than redefining the gate.
21. Establish a fresh typecheck/test/runtime baseline after the concurrent T-124 worktree stabilizes. Readiness closure established a green shared/backend typecheck plus targeted 50/50 shared, 11/11 EF registry, 10/10 EF execution, 17/17 PI WorkOrder bridge and 2/2 PI Prisma-repository baseline while explicitly excluding legacy tests from D-22 acceptance credit.
22. Freeze D-19 as one capability-gated, no-dual-write acceptance slice from a bound Cycle and real v2-ready typed asset fixture through one two-cell admitted revision, exact EF materialization, one batch Run/manifest, PI head CAS and durable EF acknowledgement. Exclude Attempt/provider/result/evidence/closure/UI/search/legacy migration and require real shared-contract/HTTP/service/repository/Prisma/inbox/outbox evidence.
23. Freeze D-21 as additive domain-owned PI/EF v2 table families with default-off admission routing, unchanged diagnostics-only legacy rows, no backfill/dual-read/dual-write/fallback, explicit post-D-19 product entrance cutover and drain-before-disable rollback.
24. Freeze D-22 as the minimal Phase 1 + D-19 logical schema pack: relational identity/unique/CAS/cell/event invariants; named typed canonical JSON+server hash for frozen scientific snapshots; same-domain relations only; zero future-phase or legacy-mapping persistence.
25. Close implementation readiness in `07-implementation-readiness-review.md`: exactly five typed asset families, frozen Prisma-family/invariant/error/test IDs, `PAPER_IMPLEMENTATION_EXPERIMENT_V2_ADMISSION_ENABLED=false`, locked legacy writer/schema/database digests and a non-overlapping Pack A edit population.

### Exit gate
- All P0 semantics have a signed decision or an explicit blocker.
- Each audit finding has one owning phase, a falsifiable exit test and evidence destination.
- No implementation step depends on an unresolved identity, approval, project-scope or isolation decision.
- D-11's deterministic branch-versus-revision matrix is recorded in T-132 and the PI-owned side is mirrored into T-124; no model/EF heuristic decides the classification.
- D-13a refines D-11's provisional point-to-Run row: a paper-bound WorkOrder revision freezes one ordered 1..N required-cell Run, retries are cell-scoped Attempts, and scientific cell changes require a new revision/re-admission.
- D-12 keeps T-124 coordinator stops local and derived, preserves domain AuthorityGate as the only durable authorization, coalesces overlap into one owning-screen action and automatically resumes without a second confirmation record.
- Golden scenarios classify and count InitiationAction/AuthorityAction/RecoveryAction/PlumbingAction. The T-132 fixed first-release flow proves 1/2/0/0; retryable faults, duplicate submit, stale projection and index outage add no human action, while every non-zero exception action has a stable owning Gate/Stop/blocker reason.
- D-13b freezes manifest-time automatic branch-head advancement, sequence fencing, pre-dispatch acknowledgement and failed/cancelled-head retention; no implicit latest/head or result-selection rule remains.
- D-14 keeps one mode-neutral Run: terminal simulation Attempts cannot mark the Run scientifically completed/failed/cancelled, and `closure_kind=control_flow_validated_no_paper_evidence` with `scientific_disposition=null` closes only PI workflow state with zero evidence eligibility.
- D-15 keeps scientific selection before admission: the admitted exact cells/hash are complete and canonical, EF's Run cells match one-to-one, TaskSpec refs remain EF-owned post-admission bindings and no generator-only execution authority exists.
- D-16 keeps scientific evidence and execution accounting on separate singular paths: failed/cancelled/incomplete execution creates no REU; complete validated results later assigned positive/negative/inconclusive by Cycle closure share completed execution/evidence and carry no REU disposition; dossier consumes exact closed-Cycle snapshots and no Sidecar/project scan can become a second authority.
- D-17 keeps protocol compliance and scientific disposition on separate singular authorities: EF validation uses only typed supported rules over the exact batch Run; Result Analysis is proposal-only; one existing Cycle closure writes the authoritative nullable disposition and derives the selected exit; downstream consumers reject open proposals or non-closed Cycles.
- D-18 keeps closure on one current-effective decision scope: the admitted branch set and matching per-branch current revision/effective head are frozen at one CAS watermark; non-head history cannot enter through scanning or semantic matching, all real active Attempts still block, and comparison reuse is explicit lineage rather than scope expansion.
- D-19 fixes the first acceptance endpoint at durable `BranchHeadAdvanced` acknowledgement with zero Attempt/provider/scientific writes; bootstrap/import/promotion remain explicit prerequisites, not hidden bypasses or co-delivered scope.
- D-20 fixes four domain-owned authoritative commits even under one Postgres. Shared event/runtime helpers are allowed, but a transaction callback, repository or mutable table cannot write PI and EF authority together; relay delivery state is infrastructure-only and the EF `BranchHeadAdvanced` inbox receipt is the sole acknowledgement.
- D-21 fixes independent PI/EF additive typed v2 table families and one explicit v2 product entrance. Existing singular WorkOrder/HarnessRun/generic EF storage remains unchanged diagnostics/admin read-only; no product dual-read/write, fallback, runtime union view, backfill or legacy writer restoration remains possible.
- D-22 keeps the first migration vertical and finite: Phase 1 named typed identity/readiness plus the D-19 admission→Run/head→ack spine only. Attempt/provider/result/evidence/closure/search persistence, generic EAV and cross-domain FK are blockers, not optional future-proofing.
- The readiness closure was followed by explicit Pack A implementation authorization on 2026-07-13. The authorization does not include existing-environment DB apply or product enable/cutover.

### Rollback
- N/A; Phase 0 is planning and read-only discovery.

## Phase 1 — Canonical identity and readiness trust kernel

Pack A status: **completed and verified** by A01-A04 in `packa-d19-source-policy-20260713-r2`, including exact official-source-backed Dataset/DataPolicy bindings.

### Entry gate
- OQ-02 and OQ-08 are confirmed.
- Frozen/mutable record classification and compatibility strategy are approved.

### Steps
1. Define canonical semantic serialization with domain separation by record kind, schema version and hash profile; timestamps, mutable status and projection fields are excluded.
2. Introduce stable logical identity, server-issued immutable revision identity and server-computed content hash.
3. Keep drafts mutable only through expected-hash/CAS; drafts cannot receive readiness or enter execution.
4. Make freeze idempotent for the same logical id/content and revision-creating for every semantic change.
5. Remove frozen kinds from generic upsert authority while preserving approved compatibility reads.
6. Require execution refs to carry kind, revision id and content hash; logical id remains discovery/lineage only.
7. Persist immutable readiness attestations bound to target revision/hash and a deterministically ordered complete dependency manifest/hash.
8. Recursively resolve ref kind, revision, hash, lifecycle/approval status and project/ownership scope.
9. Revalidate the full attestation plus current revocation state at submit; legacy records are categorically ineligible and have no revalidation path.
10. Represent evolving operational state as append-only events plus explicit projections.
11. Add shadow comparison and unchanged-row digest reporting before cutover; do not backfill legacy identity/hash fields.

### Exit gate
- Readiness-after-mutation, stale dependency, forged hash, wrong ref kind, logical-only execution ref, unresolved ref and concurrent CAS tests all fail closed.
- Re-freezing the same logical/content pair is idempotent; semantic changes create new revisions; non-semantic timestamps/status do not change content hash.
- Historical runs can replay the exact old revisions after newer revisions exist.
- Prisma/API round-trip proves uniqueness, append-only behavior and deterministic hash recomputation.
- Existing records remain readable but unverified records cannot be submitted through the trusted path.
- The minimal Phase 1 records needed by D-19 can be seeded only through the real v2 persistence/readiness path; fixture setup cannot write caller hashes or bypass readiness. Phase 1 alone does not close D-19 product acceptance.

### D-22 Phase 1 schema boundary
1. Create named typed draft/immutable-revision families only for the exact D-19 fixture dependency allowlist. Wildcard `asset_kind/payload` authority and migration of every legacy EF record kind are forbidden.
2. Retain draft expected-version/hash CAS, immutable revision identity/content hash, append-only lifecycle/current-revocation projection and exact readiness attestation/dependency rows because the Phase 1 exit claims require those invariants.
3. Store typed semantic content and small qualification/blocker snapshots as schema-versioned canonical JSON plus server hash. Store exact target/dependency identities, order and hashes as relational rows and uniqueness constraints rather than a second JSON authority.
4. Candidate/import/promotion tables remain outside the first migration even though later product bootstrap may create typed revisions through those flows.

### Rollback
- Disable new v2 admission and retain existing-field legacy diagnostics/admin reads plus offline aggregate-only shadow verification. Product runtime routing, returned values and authority perform no dual-read or fallback.
- Continue relay/consumer processing for every already committed v2 event until the D-20 saga reaches durable EF acknowledgement; retain immutable v2 rows/events after drain.
- Do not delete new identity data or recalculate old hashes in place; introduce a new hash profile if the algorithm changes.

## Phase 2 — Shared scope, typed preparation and Run-manifest/head spine

D-19 Pack A slice status: **completed and verified** by B01-B10 in `packa-d19-source-policy-20260713-r2`. Broader provider, scientific closure and product-cutover work remains in later phases.

### Entry gate
- Phase 1 identity/readiness is closed.
- OQ-03c/OQ-04/OQ-06/OQ-10/OQ-11/OQ-13a/OQ-13b/OQ-15/OQ-17/OQ-18/OQ-19/OQ-20/OQ-21/OQ-22 are confirmed.
- PaperProject binding, exact scope, schema/event/UoW contracts and legacy cutover populations are frozen in Phase 0.
- D-19 fixture inputs are one already bound PaperProject/ValidationCycle and pre-seeded typed v2 assets whose identity/readiness passed Phase 1; the D-19 slice does not implement PaperProject bootstrap, ingestion or promotion.

### D-19 first acceptance slice
1. Admit one PI WorkOrder revision whose canonical `exact_cell_plan` contains exactly two required cells; the production contract remains 1..N.
2. Materialize or exact-reuse exactly one VersionLock, exactly one RunRecipe and one TrainingTaskSpec per admitted cell through the real v2 writer/readiness path.
3. Freeze the revision's only two-cell batch Run/manifest and atomically persist `RunManifestFrozen`.
4. Consume the event in PI, sequence-fenced CAS the exact branch head and atomically persist `BranchHeadAdvanced`.
5. Consume the acknowledgement in EF and persist its exact durable receipt. Stop here: no ExecutionAttempt or provider-capable command is enabled by D-19.
6. Verify the complete path through shared contract, typed HTTP, services, repositories, Prisma and inbox/outbox replay under a default-off capability gate with no legacy dual write.

### D-20 authoritative transactions and replay contract
1. PI Unit of Work atomically commits the admitted immutable WorkOrder revision, admission/current-revision sequence CAS and one `WorkOrderRevisionAdmitted` outbox row.
2. EF Unit of Work atomically commits that event's inbox outcome, exact VersionLock/RunRecipe/two-TaskSpec materialization or exact reuse, the revision's sole Run/manifest and one `RunManifestFrozen` outbox row.
3. PI Unit of Work atomically commits the `RunManifestFrozen` inbox outcome, exact-scope/branch-sequence head CAS and one `BranchHeadAdvanced` outbox row.
4. EF Unit of Work atomically commits the exact `BranchHeadAdvanced` inbox outcome as the durable acknowledgement. That processed receipt is the later dispatch prerequisite; do not write a second acknowledgement object/event or `dispatch_eligible` field.
5. The successful authority spine has those four domain commits. Outbox relay lease/retry/published/delivered bookkeeping may use additional infrastructure transactions, but relay state never proves consumer-domain commit and never mutates PI/EF authority.
6. Each integration message uses a versioned envelope with producer, event/idempotency identity, correlation/causation, canonical payload hash and exact project/Cycle/branch/revision/sequence/hash scope. The preparation event carries the admitted exact-cell authority; `RunManifestFrozen` carries exact Run/manifest and TaskSpec-binding identity; `BranchHeadAdvanced` carries the exact accepted head and causal manifest event.
7. Same event/idempotency key plus same canonical payload hash returns the recorded outcome without duplicate domain/outbox rows. Same key plus different hash and same branch sequence plus different Run/manifest are terminal conflicts; lower sequence is durably consumed as stale without rollback/outbox; temporarily invisible prerequisites remain retryable with zero domain/outbox mutation.
8. Before-commit failure rolls back inbox/domain/outbox together; commit-before-publish and publish-before-delivery-marker crashes converge by relay replay and inbox deduplication. No transaction callback may access both PI and EF write repositories even if one Prisma/Postgres deployment hosts both tables.

### D-21 additive v2 storage and cutover contract
1. Add PI-owned typed v2 storage for WorkOrder branch, immutable revision/exact-cell values, admission/current revision/head and PI integration inbox/outbox. Do not extend or annotate the singular mutable ResearchWorkOrder/HarnessRun/coordinator models to impersonate these authorities.
2. Add EF-owned typed v2 storage for immutable typed revision/readiness, VersionLock/RunRecipe/TrainingTaskSpec bindings, the sole batch Run/manifest/cells and EF integration inbox/outbox. Do not reuse generic `recordKind/payload` upsert or ExternalTrainingJob as D-19 authority.
3. Store cross-domain scope only as versioned external identity, canonical hash, sequence and event values. Do not add cross-domain ORM relations, cascades, shared mutable tables, shared write repositories or database foreign keys that grant one domain update authority over the other.
4. Apply expand-only migrations: create v2 tables/indexes/constraints and leave every legacy row unchanged. Offline aggregate shadow comparison may verify coverage but cannot participate in product routing, return values, repository unions or authority.
5. Keep the v2 admission capability default-off. When off, reject new v2 product commands with zero v2/legacy write and no legacy fallback; do not repurpose the local-execution capability or a generic feature flag as the D-19 authority gate.
6. Enable only the explicit D-19 acceptance entrance before product cutover. After D-19 passes, switch new paper-bound experiment intake to v2 and close overlapping singular WorkOrder/HarnessRun/generic EF product writers in the same release; active legacy work must finish first or restart from a new v2 project/Cycle/revision.
7. Disabling v2 intake blocks only new PI admissions. Relay and consumers continue draining every committed `WorkOrderRevisionAdmitted`/`RunManifestFrozen`/`BranchHeadAdvanced` saga to EF acknowledgement, after which immutable v2 data remains readable/auditable.
8. Rollback never deletes/rebinds v2 rows, converts them into legacy records or restores a legacy writer for the same logical object. A disabled or rolled-back entrance fails closed for new intake.

### D-22 minimal schema pack and invariant placement
1. PI relational families are WorkOrder branch with current/head CAS, immutable WorkOrder revision, ordered revision cells, immutable admission and separate PI integration inbox/outbox. D-22 freezes logical responsibilities, not final Prisma model names.
2. EF relational families are the named typed asset draft/revision allowlist needed by the D-19 fixture; asset lifecycle event/current-revocation projection; exact readiness attestation plus ordered dependency rows; VersionLock; RunRecipe; TrainingTaskSpec; immutable Run plus ordered Run cells; and separate EF inbox/outbox.
3. Relation columns own ids, exact revision/sequence/ordinal, current/head CAS versions, same-domain bindings, event id/type/version/business key/payload hash/outcome and one-revision→one-Run/one-cell→one-TaskSpec uniqueness. N≥1 is an admission/service invariant; D-19's N=2 is a test fixture, not a permanent database check.
4. Named typed canonical JSON+server hash owns only frozen semantic snapshots: PI branch frame and cell params/result contract; typed EF asset content; readiness qualification/blocker snapshot; VersionLock; resolved RunRecipe; TrainingTaskSpec execution snapshot; and typed event payload. Identity/current/head/cell binding/idempotency cannot live only in JSON.
5. Run and ordered immutable Run-cell rows are the sole manifest authority. `run_manifest_hash` is deterministically recomputed from their exact ordered bindings; no second mutable manifest JSON or duplicate authority table is stored.
6. Same-domain concrete FKs are allowed. PI→EF and EF→PI scope is stored as exact external project/Cycle/branch/revision/cell/Run id+hash+sequence+event values and validated by services; cross-domain FK, ORM relation/cascade and shared join table are forbidden.
7. The event envelope keeps event id/type/schema version/producer/correlation/causation/business key/payload hash/scope as structured fields; the typed payload may use canonical JSON. Inbox/outbox uniqueness and D-20 transaction outcomes remain relational.
8. The admission capability is a default-off environment/configuration and routing guard, not a database authority table or eligibility/dispatch mirror. The exact key and env-contract change belong to the implementation pack and require the env contract workflow.
9. The first migration contains no candidate/import/promotion/bootstrap, ExecutionAttempt/provider/ExternalTrainingJob/CollectionAttempt, ExperimentResult/validation/rule result/EvidenceCandidate/REU, Cycle closure/watermark/disposition/Packet, UI/read model/search/embedding/index, legacy bridge/backfill/union or acknowledgement aggregate/event/boolean.
10. Final Prisma names, columns, indexes and DDL are produced only after the logical matrix passes implementation readiness review; schema editing and database apply remain separate explicit authorizations under the repo DB-SSOT workflow.

### Workstream A — PI scope and admission
1. Require completed PaperProjectIntake and matching non-null bridge binding before PI bootstrap; legacy null-bound records remain read-only under D-08.
2. Add the broker that converts only admitted experiment-planning artifacts into PI-owned WorkOrder branches and immutable branch-local revisions/sequences.
3. Persist the canonical ordered `exact_cell_plan`/`cell_plan_hash`, branch semantic frame, parent/fork refs and `approved_plan_hash`; PI owns selection, EF treats these fields as opaque immutable scope.
4. Define one versioned PI→EF command envelope for prepare/cancel/retry with project/Cycle/branch/current-revision/hash/sequence and exact cells. Logical identity, `latest`, ranges and generator metadata never authorize execution.

### Workstream B — Executable readiness and typed preparation
1. Replace free-shape execution semantics with canonical typed v2 `required_rules` plus a closed code capability map. `metric_contract@v1` and `artifact_contract@v1` are the first supported slice; malformed/unsupported required rules return `UNSUPPORTED_RULE` before Run freeze.
2. Keep T-131 v1 catalog-only and re-import original-source content into a new typed v2 protocol identity; no legacy trust upgrade or forward-ref inference is allowed.
3. Implement server-owned idempotent candidate promotion, then typed GenerateVersionLock/GenerateRunRecipe/MaterializeTrainingTaskSpec commands for the exact admitted cells without manual refs/hashes or scientific cell selection.
4. Move raw record JSON writes to a privileged diagnostics surface and reject extra, missing, duplicate, reordered, substituted or scientifically drifted materialized cells.

### Workstream C — Immutable Run and head saga
1. Freeze the admitted revision's only canonically ordered 1..N-cell Run/manifest and atomically emit `RunManifestFrozen`; same revision+same manifest reuses the Run, while a second/conflicting Run fails closed.
2. Consume that event through the PI inbox, sequence-fenced CAS the branch head and atomically emit `BranchHeadAdvanced`. Same replay is idempotent, lower sequence is history and same sequence/conflicting Run fails closed.
3. Require EF to durably consume the exact acknowledgement before any Attempt/dispatch. A stale never-dispatched Run remains history; an already running older Run is never rebound or auto-cancelled.
4. Enforce global reusable-asset scope and project/Cycle/branch/revision/Run scope on every server command and event.

### Exit gate
- PI and EF share one exact scope contract; the same admitted revision deterministically produces one batch Run and matching required cells/TaskSpecs.
- Unsupported rules, wrong binding, forged hash, extra/missing cell, second Run and pre-ack Attempt all fail with zero trusted/provider side effects.
- PI alone owns admitted revision/head; EF alone owns Run/Attempt. Inbox/outbox replay proves head monotonicity and failed/cancelled latest-head retention.
- A Phase 2 closure candidate distinguishes a matching head from `BRANCH_HEAD_NOT_FROZEN` and pending/unconverged work without scanning or substituting historical Runs.
- D-19 readback proves one branch/current admitted revision, exactly one VersionLock, one RunRecipe, two TrainingTaskSpecs, one two-cell Run/manifest, one sequence-fenced PI head, one `RunManifestFrozen`/PI inbox receipt, one `BranchHeadAdvanced`/EF inbox receipt and one durable acknowledgement; replay converges and conflicts fail closed.
- D-19 database/event/provider scans prove zero ExecutionAttempt, provider request, ExperimentResult, validation report, EvidenceCandidate, REU, Cycle closure, UI/search projection or legacy-row mutation.
- D-20 crash injection covers all four authoritative Unit-of-Work boundaries and proves atomic inbox/domain/outbox rollback, commit-after-crash replay, duplicate delivery convergence and stable payload/sequence conflicts.
- Repository ownership scans prove each Prisma transaction callback writes one domain only; the current governance file/JSONL outbox, mutable singular WorkOrder, HarnessRun/live adapter and generic EF record are not accepted as D-20 persistence evidence.
- D-21 capability-off tests prove zero v2 and legacy writes/no fallback; capability-on D-19 tests write only v2 table families; legacy before/after digests match exactly and no repository/view/API returns a product union of legacy and v2 authority.
- Cutover/rollback tests prove new paper-bound intake uses only v2 after acceptance, overlapping legacy writers are closed atomically, already committed sagas drain after intake disable and existing v2 rows/events remain auditable without legacy restoration.
- D-22 schema census proves only the declared logical families exist; cross-domain FKs/generic EAV/future-phase/legacy-mapping tables equal zero, and each relational/JSON invariant maps to one owner, negative test and evidence artifact.
- Canonical snapshot mutation/hash-forgery tests, Run-cell ordering/manifest recomputation, revision/cell/Run/inbox/outbox unique conflicts and branch-head CAS prove invariant placement rather than DTO-only validation.

### Rollback
- Disable new v2 intake/broker admission while allowing already committed inbox/outbox work to drain to acknowledgement; retain immutable v2 readback and diagnostics.
- Never restore a legacy trusted writer or rewrite an admitted revision/Run in place.

## Phase 3 — Durable provider control and same-payload simulation — Pack B technical slice complete

### Entry gate
- Phase 2 provides an exact admitted revision, frozen Run manifest, durable head acknowledgement and locked TaskSpec/payload identities.
- OQ-07 is confirmed: formal execution is cloud-only and LocalScript/fake providers are non-production simulation.

### Steps
1. Persist ExecutionAttempt before any provider side effect and bind the Attempt to exact Run/cell/TaskSpec/payload/provenance.
2. Use provider idempotency keys, leases/heartbeats and reconciliation with at-least-once invocation plus idempotent convergence.
3. Persist CollectionAttempt and stable provisional output identities before publication; add stuck-job reconciliation, replay and terminal automation.
4. Give LocalScript/fake providers an explicit non-production identity and remove them from production ExperimentResult/validation/evidence writer registration.
5. Drive submit/sync/cancel/collect/reconcile/restart/failure recovery with the exact materialized payload without starting training.
6. Derive rebuildable `workflow_simulation_status` from Attempt events only; simulation never updates scientific Run/cell state or creates a SimulationRun.
7. Emit only lifecycle/preflight verification artifacts and `workflow_simulation_passed | blocked | failed`.

### Exit gate
- Crashes before/after submit and at each collection boundary converge without duplicate attempts, external jobs or canonical scientific records.
- Same-payload simulation changes Attempt/control projection only; every Run/cell remains scientifically `not_started`.
- LocalScript/fake output is rejected before ExperimentResult, ResultValidationReport, EvidenceCandidate and RunEvidenceUnit creation.
- Any real-provider Attempt, including one on a non-head Run, remains Cycle-visible for D-18 closure blocking until terminal or explicitly cancelled.

Pack B closed these technical exit requirements with PB01-PB16 on `packb-20260713-final4`. The remaining references to real-provider Attempts and D-18 closure are read/fence contracts for later phases, not real dispatch or closure functionality delivered by Pack B.

### Rollback
- Stop new dispatch, drain/cancel/reconcile active Attempts and disable provider writers.
- Preserve Attempts and provisional data for audit; do not assume database rollback reverses external side effects.

## Phase 4 — Exact-batch scientific validation and trusted Cycle closure

### Entry gate
- Phases 1-3 provide immutable identity, exact admitted scope/manifest/head and durable Attempt/event identities.
- OQ-03a/OQ-03b/OQ-05/OQ-09/OQ-16/OQ-17/OQ-18 are confirmed.
- Real result/validation/evidence production remains disabled in the first release; positive/negative/inconclusive paths are production-disabled fixture/contract conformance until M7.

### Workstream A — Exact-batch scientific policy
1. Reject `accept_partial=true`; incomplete logs/metrics/artifacts remain Attempt diagnostics and cannot be upgraded by a human decision.
2. Recheck the frozen validator profile and validate one exact immutable batch Run over canonical ordered cell/result refs, protocol revision/hash and ordered rule results with overall `passed | failed | unsupported`.
3. Make ScientificValidationService the only validation-report/EvidenceCandidate writer. Only a complete eligible real-provider result set with `passed` may atomically persist report/Candidate/outbox.
4. Keep EF protocol compliance separate from PI `positive | negative | inconclusive`; simulation, failed/cancelled/incomplete execution and unsupported rules create no EvidenceCandidate.

### Workstream B — Gateway and D-18 closure scope
1. Make one PI Evidence Trust Gateway the only RunEvidenceUnit writer and server-resolve exact EF lineage plus PI scope; atomically persist REU, TraceManifest and outbox only for an eligible EvidenceCandidate.
2. Build one canonical `closure_watermark` from expected Cycle version, canonically ordered admitted branch membership and, per branch, current admitted revision/hash/sequence plus its matching effective head Run/manifest/cells/all Attempts. Preserve a missing branch in the candidate with `BRANCH_HEAD_NOT_FROZEN`, but do not commit closure with a null head.
3. Exclude superseded/non-head Runs from snapshot membership. Preserve them as exact structured-query/audit history; an old v2 result may enter interpretation only through an explicit immutable `comparison_input_ref/hash` on the current admitted revision and server re-resolution, never through a history/project/semantic scan.
4. Block closure with `CYCLE_ACTIVE_REAL_ATTEMPT` while any real-provider Attempt anywhere in the Cycle remains active. CAS-fail with `CYCLE_CLOSURE_SCOPE_DRIFT` and rebuild when branch membership, revision, head, manifest or active-attempt fence drifts.
5. Derive `CycleReadyForInterpretation` once from that exact closure-input hash. Eligible REU invokes one Result Analysis proposal; zero eligible evidence prepares the no-evidence/control-only closure without scientific interpretation.

### Workstream C — One conclusion writer and closed-Cycle consumers
1. Use the existing Cycle-closure AuthorityAction to accept/correct the proposal and atomically write closure kind, nullable disposition, accepted proposal ref/hash and D-18 snapshot/hash. Packet identity is not a closure input or hash member.
2. Derive a scientific selected exit only for non-null `positive | negative | inconclusive`; no-evidence/control-only closure writes `scientific_disposition=null`, `selected_exit=null` and follows the explicit non-scientific stop/closure policy.
3. Emit `ValidationCycleClosed`, then materialize ResultInterpretationPacket one-way from the exact closed Cycle/proposal. Claim, Dossier, motive/retrieval and successor-Cycle draft preparation reject open/proposal-only input.
4. Keep Sidecar rebuildable/display-only and make dossier consume only explicit closed-Cycle snapshot refs/hashes; remove project-wide failed-like REU scanning without dual read/fallback.
5. Seal the closed Cycle: admission/revise/fork, Run freeze/head advance, new Attempt/retry, standalone attachment and provider dispatch all fail closed with zero writes. Follow-up experiments use a successor ValidationCycle; TaskSpec content may be reused but lineage is never rebound.

### Exit gate
- Failed/cancelled/incomplete/simulated output, unsupported rules, per-cell validation, generic trust writers and direct repository/packet/assessment/exit bypasses cannot mint evidence or conclusion authority.
- Two-or-more-branch tests prove exact current revision/effective-head cell/Attempt accounting, stable no-head blocking, non-head exclusion, explicit comparison lineage and deterministic ordering/hash.
- Non-head active real Attempt, stale watermark/proposal, concurrent admission/head advance and closed-Cycle write attempts fail deterministically; same-watermark replay is idempotent.
- One closure action alone freezes snapshot/disposition; no-evidence writes null disposition/selected exit, while Packet exists only after `ValidationCycleClosed` and is excluded from the closure hash.
- Scientific fixture conformance is clearly labelled production-disabled; the first-release product scenario closes with zero real results, EvidenceCandidate or RunEvidenceUnit.
- D-16/D-17/D-18 migration removes old failed-REU/project-scan/caller-conclusion writers and readers atomically; no compatibility alias, second gateway, Sidecar authority or legacy trusted rollback remains.

### Rollback
- Disable validation/evidence/gateway/closure writers while retaining immutable readback and audit facts; use forward fixes for persisted v2 state.
- The legacy bridge may remain read-only but cannot regain trusted-write or conclusion authority.

## Phase 5 — Project-scoped researcher workflow

> **D-24 rescope (2026-07-24, see 03-implementation-notes)**: Phase 5 is narrowed to the agent-first workflow slice. Of this phase's numbered steps, the kept scope is the lineage read model and server-scoped queries (steps 2, 5, 7 minus rendering), the typed action surface with server-derived identities (step 8 minus forms), workflow automation and the fixed human gates as typed audited API actions (step 11), and structured-only retrieval (step 4 without semantic ranking). Deferred out of T-132 to the future UI-redesign task: all presentation/navigation/forms/screens (steps 1, 6, 9, 10, 12, 13), the DOM/Electron test lane, and the semantic retrieval projection (step 3 and the semantic parts of step 4). Structured lineage queries are the sole retrieval authority; existing desktop read-only views stay frozen.

### Entry gate
- Project-scoped server queries/read model are available.
- Typed preparation and recovery commands are stable.

### Steps
1. Use PaperProject/ImplementationProject → ValidationCycle → WorkOrder → Run as the primary navigation lineage.
2. Present each WorkOrder branch as a stable logical path with an explicit current admitted revision and event-derived head Run; distinguish a matching effective closure head from an older branch head when the current revision has no frozen Run, and fold non-head history behind exact lineage queries.
3. Build a PI-owned project-scoped retrieval projection with one deterministic semantic document per ValidationCycle and per WorkOrder branch head. Compose text only from PI canonical planning fields (`validation_question`, assumptions/decision exits/why-now, `branch_intent`, `expected_effect`, `difference_from_parent`) and version each document by source hash/projection schema/embedding profile.
4. Query in the fixed order permission/project scope → structured Cycle/branch/status/time filters → semantic ranking → exact PI/EF revision/hash re-resolution. If the semantic index is stale or unavailable, continue through structured lineage without changing workflow behavior.
5. Keep historical v2 revisions/runs available by exact structured query rather than adding per-run semantic summaries; exclude them from D-18 closure scope unless the current admitted revision explicitly declares an immutable comparison input ref/hash. D-08 legacy rows remain diagnostics/admin-only and cannot become comparison/evidence input.
6. Keep the independent EF asset/exploration workbench as a secondary surface; paper-bound cloud preparation begins from PI or an explicit “attach to WorkOrder” action, while real submit remains disabled.
7. Scope all timelines, job lists and result views by server-enforced lineage.
8. Replace ref/hash/raw-JSON forms with typed actions and server-derived identities; show PI draft ranges/grid/seed-count as authoring inputs and a generated exact-cell preview before the one admission action.
9. Show blockers, scientific rule failures, approvals, retries, recovery actions, logs and provenance; render EF execution state, EF protocol `passed | failed | unsupported`, PI interpretation proposal and closed-Cycle `positive | negative | inconclusive` as separate surfaces.
10. Show immutable closed-Cycle accounting from the exact snapshot/hash and render Sidecar only as its rebuildable view; dossier links resolve the declared snapshots instead of presenting a project-wide failed-REU ledger.
11. Automate terminal sync/collect, Cycle-ready detection, Result Analysis proposal and post-closure next-step/claim/dossier preparation. A follow-up experiment draft targets a successor ValidationCycle and cannot reopen or append to the closed Cycle. Expose only the fixed human gates in their owning WorkOrder/exception/scope/ValidationCycle surfaces; the existing Cycle closure is the sole scientific-conclusion action and no general DecisionWorkQueue engine is added.
12. Keep advanced JSON in a clearly separated diagnostics surface.
13. Follow the desktop `data-ui` contract and Tailwind B1-layout-only freeze; do not recreate legacy renderer styles.

### Exit gate (per D-24)
- The control-plane path requires no manual internal ID/hash or JSON maintenance through the typed API surface.
- Multiple projects/runs remain isolated in API tests.
- Workflow automation (terminal sync/collect, Cycle-ready detection, proposals, post-closure preparation) is event-replayable, idempotent and verified at service/repository level.
- No semantic projection, embedding or UI-journey code/schema/capability lands in T-132; structured lineage queries answer every retrieval need.

### Rollback
- Gate each new action separately and retain stable read-only asset/result views.

## Phase 6 — Control-plane closure, zero-write cloud preflight and handoff cleanup

### Entry gate
- Phases 1 through 5 are green in their own verification layers.

### Steps
1. Preserve T-131's promoted `v1-cpu-adapter` record as immutable catalog history, then re-import the original RAGPerf source into a new typed v2/versioned EvaluationProtocol identity with canonical required rules/hash; resolve its benchmark/dependency readiness without rewriting the earlier promotion.
2. Prove free-shape v1 and unresolved forward refs return D-17 blockers, then use only the new typed v2 protocol to compile/admit the RAGPerf exact scientific cell plan and consume the exact cells in RunRecipe/TaskSpec/payload materialization without training.
3. Run disposable-Postgres, simulator restart/fault injection, concurrency/replay, soak and usage-fit gates.
4. Update OpenAPI, API index, context registry, DB context and operator/recovery documentation.
5. Emit one machine-readable productization summary with required checks and artifact refs.
6. Record T-131 consumption evidence and close/hand off T-131 through its own docs workflow.
7. Materialize the exact Aliyun `CreateJob` request from the locked TaskSpec; validate schema/enums/refs/size offline, hash the canonical payload and store only a redacted manifest.
8. Run real Aliyun read-only preflight for signing/endpoint, region, `ENABLED` workspace and visible DLC resource limits/refs through a strict List/Get allowlist.
9. Use a preflight RAM identity without `paidlc:CreateJob`, and enforce an application-level write deny before provider transport.
10. Prove admitted-cell/Run-manifest one-to-one parity and drive fake-provider submit/sync/cancel/collect/reconcile/recovery with each exact payload from step 7; compare payload hashes and assert zero scientific evidence records.
11. Emit `workflow_simulation_passed | blocked | failed` for simulation and `cloud_preflight_passed | blocked | failed` for cloud preflight, with an explicit list of unverified real-runtime/evidence behaviors.
12. Close the PI ValidationCycle only after all simulation control checks are terminal and the D-18 watermark is stable, using `closure_kind=control_flow_validated_no_paper_evidence`, `scientific_disposition=null` and `selected_exit=null` over the exact current revision/effective head Run/cells/Attempts; do not mutate EF facts or include non-head history.
13. Keep T-106's true-provider canary separate/deferred unless a later decision transfers real execution ownership to T-132.

### Exit gate
- PaperProject/WorkOrder → asset → Recipe → TaskSpec/provider payload → Attempt-level simulated lifecycle → WorkOrder/Sidecar control state is replayable and machine-verifiable, with the batch Run scientifically `not_started` and no EvidenceCandidate/RunEvidenceUnit/dossier evidence.
- The no-evidence Cycle closure is rebuildable from exact Run/Attempt facts, changes PI workflow state only and adds no human action beyond the already counted closure AuthorityAction.
- Release evidence proves real persistence, real user interaction and failure recovery.
- Cloud-preflight evidence proves exact payload materialization, real read-only environment visibility, same-payload fake lifecycle and zero cloud writes; cloud training is not claimed.
- Governance, API/context docs and involved task packages are consistent.

### Rollback
- Disable new dispatch, evidence minting, broker and UI capabilities independently.
- Preserve immutable audit history and use revoke/supersede for invalid evidence.
- Disable/revoke preflight credentials and provider endpoints independently; no cloud job or allocated compute requires cleanup.
- A future real-provider rollback must drain/cancel/reconcile external resources before state is declared closed; M6 creates none.

## Risks and mitigations
| Risk | Mitigation |
|---|---|
| Scope expands across every EF record kind | Drive one RAGPerf control-plane scenario first; generalize only after an observed second use case. |
| Contract changes collide with T-124 | Record joint decisions before shared edits; wait for a stable T-124 seam; run both lanes' contract tests. |
| Legacy records appear trusted after cutover | Keep rows unchanged, expose diagnostics/admin reads only, return `LEGACY_RECORD_NOT_ELIGIBLE` from every v2/product path and provide no revalidation mechanism. |
| New validator becomes an unbounded statistics platform | Freeze a supported rule matrix; return explicit unsupported outcomes. |
| Recovery promises exceed provider guarantees | State at-least-once + idempotent reconciliation semantics explicitly. |
| UI hides server-side scope gaps | Server read model is a Phase 5 entry gate; cross-project negative tests are mandatory. |

## 2026-07-24 — M5-A1 implementation checkpoint

- Completed the three OD-M5-1 read families: project Cycle summaries, admitted-branch effective-head lineage, and complete branch revision history.
- Completed shared response schemas, server-side project-scoped Prisma reads, empty constructor-seeded in-memory composition, typed service/controller/route wiring, and local schema/service/route verification.
- The guarded disposable-PostgreSQL isolation/completeness test is written and type-checked but remains a host-verification action because the sandbox has no PostgreSQL target.
- M5-A2 projection persistence, M5-A3 closure preparation/actions, M5-A4 gate work, UI, semantic projection, migrations, and all mutations remain outside the M5-A1 checkpoint.

## 2026-07-24 — M5-A3 implementation checkpoint

- Completed OD-M5-3 with the zero-write closure-preparation GET. The endpoint reuses the existing readiness evaluator, emits ready/blocked plus the evaluator blockers, prepares only the no-evidence control-closure POST body template, and marks eligible-REU scientific closure unavailable behind M7-L2.
- Completed OD-M5-4 with the project-scoped available-actions GET. The endpoint injects the A1 lineage service for opaque project/cycle scope and effective-head/cell/Attempt state, composes readiness plus closure existence, and returns deterministically ordered typed POST actions without probing capability env.
- Made the closure POST body `validation_cycle_id` optional at the shared HTTP boundary. The controller always resolves the service command from the path; a supplied body id still must match exactly.
- M5-A3 added no schema, migration, persistence, repository write, gate-script change, capability enable, provider call, or scientific authority. M5-A4 remains the next implementation slice; guarded A1/closure PostgreSQL cases remain host-verified-later.

## Implementation start condition
Implementation may start only after the user confirms the roadmap decisions and explicitly authorizes execution. Phase 1 identity/readiness must close first; the planned first cross-module acceptance slice is D-19's Phase 2 admission-to-head acknowledgement spine, never provider integration, full Cycle closure or UI polish.
