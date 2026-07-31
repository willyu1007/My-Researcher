# 03 Implementation Notes

## 2026-07-30 — Cloud Shell repair and cross-workstation handoff

- Debug handoff run `dbg-20260730-083419-7171` verified that the prior Cloud Shell failure was exactly the RAM-user bootstrap action, not a controller/runtime-role or PAI execution permission.
- After `APPROVE FIX` and `APPROVE OPENAPI FALLBACK`, the official RAM OpenAPI path created custom policy `pea-t132-cloudshell-create-session` with exact document `Allow cloudshell:CreateSession` on `Resource: "*"`, then attached the policy only to `user_0002`. Pre-write `GetPolicy` returned not found; post-write `GetPolicy` reported attachment count 1 and exact document; `ListPoliciesForUser` returned the same custom policy.
- A fresh login as `user_0002@1183869713036194.onaliyun.com` created one Cloud Shell replacement session successfully. The startup alert cleared and the file tree plus terminal input became ready. No STS command was executed during that functional check.
- The current workstation restored declared packages with `pnpm install --frozen-lockfile`; neither source nor `pnpm-lock.yaml` changed. Its local PostgreSQL 17 server has no `my_researcher_dev` schema in any database, and `/Volumes/DataDisk` is not mounted.
- A temporary env-local reconstruction was used only to reach the named-target gate. The gate observed `current_schema=null` instead of `my_researcher_dev`; cleanup then removed the temporary `.env.local` and mock secret reference and restored generated env context. STS, `GetImage`, `CreateJob`, provider/database writes, capabilities, PAI Jobs and cost remained zero.
- An empty database is not a valid substitute: the live runner requires the exact sequence-8 Run/manifest/two cells/open Cycle/frozen Bundle, while the lineage importer is predecessor-bound through sequence 1-8 and the historical P313 product chain. Resume on the original workstation rather than rebuilding authority locally.
- Reader-test continuation:
  1. `git pull --ff-only origin main`, then confirm the worktree and original `.env.local` are intact.
  2. From `apps/backend`, run `pnpm run experiment-foundation:m7-l1:live -- --mode offline-preflight`; require exact sequence-8 identity, Attempts 0 and zero cloud/database writes.
  3. Only under a current dated authorization, obtain a fresh six-key controller STS (`0600`, at least 55 whole minutes), execute once at the two-Job/¥50 ceiling, clean all credential copies and run independent Job/database/cost censuses.

## 2026-07-30 — T-132 scope closure and T-134 audit transfer

- The user narrowed T-132 to the personal PAI experiment-base landing. Its live acceptance is one exact PI-bound immutable two-cell Run, two terminal-success PAI Jobs, exact result collection and zero-new replay.
- Desktop UI was removed. No renderer, form, navigation, presentation or DOM/Electron work is required to finish T-132.
- EF-P06, EF-P14, EF-P15 and semantic EF-P21 moved to the new planned task T-134. The change is an ownership transfer, not implementation or verification credit, and T-134 does not block T-132.
- Failure/reconcile/cancel remains part of operational confidence through existing API/CLI and deterministic tests. The live two-cell success path should not be intentionally degraded merely to demonstrate cancel.
- PAI remains the hard blocker: sequence 8 is landed and read-only verified, Cloud Shell session creation is repaired, and the authorized paid verification now waits for the original workstation's reviewed named-local database.
- Results remain diagnostic-only and must not automatically create scientific or paper evidence.
- The scope update modified only task/governance documentation; no code, configuration, database or cloud state changed.

## 2026-07-30 — M7-L1 sequence-7 final SDK wire-boundary diagnosis

- The owner approved Debug Mode instrumentation only. Run `dbg-20260729-151747-2ddb` added a removable observer around the official SDK's final Darabonba `doAction` boundary. It replaces the writable dependency-scoped `doAction`, reads only the final `BytesReadable.value`, blocks network before send, restores the original function in `finally` and uses fixed dummy credentials.
- Durable output is restricted to model/wire SHA-256 and byte counts, byte/semantic/JSON-round-trip equality, static allowlisted field paths and value kinds, known JSON-string parse kinds, and recursive `src` counts. It never emits bodies, headers, credentials, role/URI/command values, environment values, tags or dynamic keys.
- The sequence-7 `offline-preflight` rematerializes both exact requests from the frozen Bundle and existing per-cell provider idempotency bindings. Cell 1 model/wire hashes both equal `sha256:bdb5d86fa62e4f1c807da20670553e0fe91185508ab58eb1e4f1ff61d70c1680` at 2,989 bytes; cell 2 hashes both equal `sha256:e8ce6ee982e6afac48906bbefcb1ecccd8aa1bd830be53ae9f2faf2009b47a90` at 2,992 bytes.
- Both cells pass byte equality, semantic equality and JSON round-trip. Model/wire recursive `src` count is 0. Each final request contains four `DataSources[].Options` strings, all parseable as JSON objects; the source-binding environment value is likewise a string parseable as an object. `AssumeRoleFor` and `ResourceId` remain absent.
- Official CreateJob documentation declares `DataSources[].Options` as `string`, matching the observed wire type. Therefore the provider message does not authorize coercing Options to an object. The supported conclusion is only that the SDK does not rewrite or corrupt the request between model and final bytes.
- Verification used no STS, cloud API, capability, database write, PAI Job or billable runtime. Both debug runs remain active because provider causality is unresolved and no fix/termination cleanup has been authorized.

## 2026-07-29 — M7-L1 instrumented diagnostic sequence-7 paid rejection

- The owner authorized exactly `M7-L1 instrumented diagnostic reproduction authorized: 2026-07-29, ceiling ¥50, 2 jobs`. Action-time zero-cloud preflight matched the exact sequence-7 Run/manifest/Bundle, Attempts 0, two-Job/¥50 ceiling and 2 CPU / 8192 MiB / 30-minute per-Job resources.
- The logged-in RAM Cloud Shell issued one 3600-second controller STS. Local validation passed six exact keys, mode `0600`, temporary identity, exact role/policy and 59 whole minutes remaining. Credential values were not displayed or recorded.
- The runner passed its fresh image read, created 2 ProviderPayloads/Attempts/submit commands and invoked the bounded `CreateJob` boundary exactly twice. The approved observer emitted only top-level status `400`, code `BadRequest`, RequestIds `019FAE67-BF8E-559F-B8C2-BA53A07E18FF` / `019FAE67-C4F5-5B79-B0F4-9FC2C96FA435` and their source labels.
- Authenticated Alibaba OpenAPI diagnosis showed both calls reached `PaiDlc CreateJob` in `cn-shanghai`, passed gateway flow control, and returned `src property must be a valid json object`. This is the same provider response seen for sequence 5. It proves the role-shape omission did not cross the provider boundary; it does not identify which internal JSON-valued field produces `src`.
- Exact recovery found no accepted Job or external ref. After 12 passes, both commands terminalized with `REAL_PROVIDER_RECOVERY_NOT_FOUND`; both Attempts terminalized `failed / real_provider_cleanup_unverified`. Final counts are ProviderPayload 2, Attempt 2, AttemptEvent 4 and ProviderCommand 2; CollectionAttempt, ProvisionalOutput, ExperimentResult, ScientificValidationReport, EvidenceCandidate and REU are all 0.
- The runner exited at its final all-success assertion, as expected for two failed Attempts. No third submission or manual state reset occurred. Observed billable runtime is 0 because no returned/discovered Job or external ref exists. Cloud Shell, `/tmp` and Downloads STS copies were verified absent.
- `dbg-20260729-142414-8438` achieved its observation objective: SDK error status/code/RequestId are top-level own properties. Provider causality remains unresolved, so no fix is proposed. The next boundary is a new, separately approved no-cloud request-serialization evidence plan; sequence 8 and any new provider window remain unauthorized.

## 2026-07-29 — M7-L1 instrumented diagnostic sequence-7 production image preflight

- The owner authorized only one sequence-7 read-only image preflight. The expired Cloud Shell VM reconnected, the NAS prompt was explicitly declined, and a read-only `GetCallerIdentity` assertion confirmed the exact account plus RAM-user caller.
- Cloud Shell assumed `pea-m7-canary-controller` for 3600 seconds and wrote exactly six required variables to a `0600` file without displaying credential values. The downloaded copy was moved immediately from Downloads to `/tmp`, changed to `0600`, and validated for six exact non-empty keys, temporary `STS.` identity, exact role, exact controller-policy SHA-256 and 59 whole minutes remaining.
- Sequence-7 `image-preflight` passed for Run `ef_run_v2_t132_m7_l1_instrumented_diagnostic_successor_v7_1` and frozen Bundle `ef_execution_bundle_revision_2c60e151719be2e109e4b2d3964aaa8c315e0b48` / `sha256:458b0e58d93974e3a09b63247bac675d26deef5fdafb111a6eae66177a3b178e`. The sole cloud call was `GetImage` for `cn-shanghai` / `image-liuxvj7p2qcnflha84`; request hash `09e466d5af908f548b362c37753050921a9e12a9deade4c9ce5b6ed6acf64c50`.
- Effect census was cloud calls 1, provider writes 0, `CreateJob` 0 and database writes 0. No capability, NAS, PAI Job or billable training runtime was created. Cloud Shell, `/tmp` and Downloads credential copies were verified absent.
- Debug instrumentation `dbg-20260729-142414-8438` remains active but was not exercised by this read-only path. A later paid diagnostic reproduction still requires its own action-time two-Job/¥50 authorization and another fresh STS.

## 2026-07-29 — M7-L1 instrumented diagnostic sequence-7 named-local landing

- The owner authorized one exact sequence-7 named-local successor and prohibited cloud/provider/capability/scientific-evidence effects. Server-enforced read-only preflight matched the named-local fingerprint, branch state/head `12/6`, one sequence-6 parent revision/Run, two unchanged terminal parent Attempts, empty sequence-7 revision/Run prefix and no Cycle closure.
- The guarded successor table now includes one instrumentation-specific scope with parent sequence 6, expected branch versions `12/6`, sequence 7 IDs/business key/id scope and an exact max-40 authorization token. Its title/objective state that it exists only to reproduce the provider rejection under `dbg-20260729-142414-8438`; resources, frozen Bundle, two cells, `max_attempts=1` and timeout 1800 remain exact.
- The first direct launch from repository root failed before `ts-node` module resolution/application startup. It made no database connection or write. Re-running from `apps/backend` used the package-local loader and the same authorization.
- Normal T1-T4 added exactly 40 rows and delivered relay work 3/3. WorkOrder `pi_experiment_revision_v2_t132_m7_l1_instrumented_diagnostic_successor_v7_1` produced Run `ef_run_v2_t132_m7_l1_instrumented_diagnostic_successor_v7_1` with manifest `sha256:ad9196472551d493501884d02e6620d3ac5d7f680611a929c3e0c0eb069a56a1`; branch advanced to state/head `14/7`.
- The apply's built-in replay and a second independent-process invocation each created 0 rows and claimed/delivered 0/0 relay work. Across apply/replay, 236 protected tables changed 0; sequence-6 Attempt/ProviderCommand counts stayed `2/2`; sequence-7 Attempt/ExperimentResult/EvidenceCandidate/REU stayed 0.
- The live runner is rebound to sequence 7 with future business key `t132-m7-l1-live-p313-v7` and a dormant, not-yet-authorized instrumented diagnostic paid token. Script typecheck and zero-cloud offline-preflight passed with exact Run/manifest/Bundle/resources, Attempts 0, cloud calls 0 and database writes 0.
- Debug instrumentation remains active. Named-local authorization does not imply STS issuance, image read or paid reproduction; each is a later distinct gate.

## 2026-07-29 — M7-L1 sequence-6 SDK-error observation instrumentation

- The owner approved only Debug Mode instrumentation. Run `dbg-20260729-142414-8438` adds a removable pure observer in `experiment-foundation-m7-l1-create-job-error-observation.ts` and one catch/rethrow observation point around the bounded SDK `CreateJob` call.
- The observer uses own data properties only and never evaluates getters. Its closed allowlist accepts HTTP status `100..599`, diagnostic tokens matching `[A-Za-z0-9_.:-]{1,128}`, exact code/RequestId field variants and only the `x-acs-request-id` header. It records source labels (`top_level`, `data`, `response`, `response_data`, `headers`) without serializing source objects.
- The runner emits one structured line containing run marker, stable event/operation and the six safe projected fields, then rethrows the original SDK exception. Accepted-response-loss recovery, call ceiling, request materialization and command state transitions are unchanged.
- Hostile-value tests prove message, stack, request/response body, non-whitelisted headers, role/account, URI, command, environment and credential sentinels do not appear. A getter trap remains unread. Top-level, nested, header, precedence and metadata-absent cases all behave deterministically.
- No cloud or database mutation was used for verification. Observer tests passed 5/5; combined transport/observer tests passed 11/11; backend and experiment-foundation script typechecks passed; sequence-6 offline-preflight passed with existing Attempts 2, cloud calls 0 and database writes 0.
- Instrumentation intentionally remains active until one separately authorized diagnostic reproduction captures evidence. Sequence 6 is terminal and cannot be reused; any sequence-7 successor, STS, image read or paid call is a separate gate. No fix is proposed.

## 2026-07-29 — M7-L1 custom-role-shape sequence-6 paid provider verification

- The owner authorized exactly `M7-L1 custom-role-shape-fix verification authorized: 2026-07-29, ceiling ¥50, 2 jobs`. Zero-cloud offline preflight passed first with exact sequence-6 Run/manifest/Bundle, Attempts 0, two-Job/¥50 ceiling, 2 CPU / 8192 MiB per cell and zero cloud/database writes.
- Chrome reused the authenticated RAM Cloud Shell. The current account/RAM-user identity matched, and a new 3600-second controller STS was written/downloaded without printing values. Local validation passed six exact keys, mode `0600`, temporary AK, exact role/policy hash and 59 whole minutes remaining.
- The execute runner passed its fresh `GetImage`, materialized 2 ProviderPayloads and created 2 Attempts/2 submit commands. The bounded SDK wrapper consumed at most two `CreateJob` calls; later worker passes were recovery-only and could not issue a third call.
- Exact discovery never found a provider Job or external ref. After 12 command passes, both commands terminalized with `REAL_PROVIDER_RECOVERY_NOT_FOUND`; both Attempts terminalized `failed` with `real_provider_cleanup_unverified`. Final row census is ProviderPayload 2, Attempt 2, AttemptEvent 4, ProviderCommand 2, CollectionAttempt 0, ProvisionalOutput 0, ExperimentResult 0, EvidenceCandidate 0 and REU 0.
- The process exited on its final all-success assertion, as expected for two failed Attempts. No direct release/reset or historical-row mutation was performed. Cloud Shell, `/tmp` and Downloads credential copies were verified absent.
- This window does not validate or disprove the `RoleArn + RoleType` compatibility change. `ExperimentFoundationAliyunRealProviderTransportV2.submit` intentionally catches and discards any synchronous SDK exception before bounded discovery because response loss may hide an accepted Job. Without separate safe instrumentation at that catch boundary, status/code/RequestId are unavailable. The next action is no-cloud instrumentation approval, not another provider retry.

## 2026-07-29 — M7-L1 custom-role-shape sequence-6 production image preflight

- The owner authorized only one sequence-6 read-only image preflight. Chrome reconnected the authenticated RAM Cloud Shell and retained the earlier `暂不创建` NAS choice, so no NAS resource or persistent-storage fee was created.
- A read-only `GetCallerIdentity` assertion confirmed the target account and RAM-user identity. Cloud Shell then assumed `pea-m7-canary-controller` for 3600 seconds and wrote the six required variables directly to an owner-only file; terminal output contained only key-count/mode success markers and no credential value.
- The browser download initially arrived in Downloads at the platform default `0644`; it was moved immediately to `/tmp/t132-controller-sts.env`, changed to `0600`, and validated for six exact non-empty keys, temporary `STS.` AK prefix, exact controller role, exact policy SHA-256 and 58 whole minutes remaining.
- Sequence-6 `image-preflight` passed for Run `ef_run_v2_t132_m7_l1_role_shape_fix_successor_v6_1` and frozen Bundle `ef_execution_bundle_revision_2c60e151719be2e109e4b2d3964aaa8c315e0b48` / `sha256:458b0e58d93974e3a09b63247bac675d26deef5fdafb111a6eae66177a3b178e`. The sole provider call was `GetImage` for `cn-shanghai` / `image-liuxvj7p2qcnflha84`; request hash `ebcc558c0fd09b771277101942102d3e6d1bdc1dd3ebbec8ca276d98ab554ae5`.
- Effect census was cloud calls 1, provider writes 0, `CreateJob` 0 and database writes 0. The Cloud Shell source, local `/tmp` file and all matching Downloads files were then verified absent. The read-only authorization does not permit or imply a paid sequence-6 execution window.

## 2026-07-29 — M7-L1 Options-fix sequence-5 paid provider rejection

- Owner authorized exactly `M7-L1 Options-fix verification authorized: 2026-07-29, ceiling ¥50, 2 jobs`. A newly issued controller STS passed six-key, mode-`0600`, temporary-AK, exact role/policy and 58-minute checks; Cloud Shell and local copies were removed after the run.
- The sequence-5 runner completed its fresh image read, then invoked the official SDK `CreateJob` boundary exactly twice. Whitelist-only observations showed wire sizes 2,979/2,976 bytes, valid JSON round trips, zero recursive `src` keys and four DataSources each containing exactly `MountAccess`, `MountPath`, `Options`, and `Uri`.
- Both calls returned `ClientError` / HTTP 400 `BadRequest`. OpenAPI self-diagnosis resolved RequestIds `019FAB35-0B06-54F8-94C0-964A48F91F0F` and `019FAB35-11B0-518B-ADE8-B6833097FD32` to the same response: `src property must be a valid json object`.
- The missing-Options hypothesis is therefore ruled out as the sole cause. The result does not prove canonical empty Options are invalid; the result proves only that adding them did not cross the current provider boundary.
- The runner was stopped after both synchronous rejections and diagnostic confirmation to avoid the remaining 50-minute recovery polling. Final read-only census found ProviderPayload/Attempt/Event/Command counts `2/2/2/2`; both Attempts remain prepared with no terminal reason or external ref. Both submit commands retain `REAL_PROVIDER_RECOVERY_NOT_FOUND`, attempt count 8 and an already expired lease owned by the stopped process. No direct release/reset write was attempted.
- CollectionAttempt, ProvisionalOutput, ExperimentResult, EvidenceCandidate and REU counts are all 0. No Job, external ref or billable runtime exists; capability defaults remain false. Further work returns to a no-cloud Gate 1 and must not infer a new successor or paid authorization.

## 2026-07-29 — M7-L1 Options-fix sequence-5 production image preflight

- Chrome reconnected the authenticated Cloud Shell and selected `暂不创建` on the NAS prompt, so no persistent NAS resource or related fee was created.
- Cloud Shell assumed the exact controller role with the reviewed bounded policy and wrote the response directly to a `0600` environment file. Only `T132_STS_READY` and cleanup markers were displayed; credential values were never printed or recorded.
- The downloaded file was moved immediately from Downloads to `/tmp`, restricted to mode `0600`, and validated for six exact non-empty keys, temporary `STS.` AK prefix, controller role ARN, controller policy SHA-256 and 58 whole minutes remaining.
- Sequence-5 `image-preflight` passed with image request hash `d74c81437c8ebf215cb052f22b34a883538c8536632edfcdd288f4621c04ef92`. The preflight bound Run `ef_run_v2_t132_m7_l1_options_fix_successor_v5_1`, the exact frozen Bundle revision/hash and one read-only `GetImage`; provider writes, `CreateJob` and database writes were 0.
- Cloud Shell source, local `/tmp` file and Downloads copy were removed after verification. A later paid execute therefore requires a newly issued STS after exact owner authorization; the read-only continuation did not infer or consume that authorization.

## 2026-07-29 — M7-L1 Options-fix sequence-5 named-local landing

- Extended the existing guarded successor runner with one exact sequence-5 scope. Its immutable title/objective state only the direct-OSS Options compatibility verification; the two cells, frozen Bundle, 2 CPU / 8192 MiB resource snapshot, `max_attempts=1` and 1800-second timeout remain exact.
- A server-enforced read-only preflight matched the reviewed local target fingerprint, branch state/head `8/4`, one exact sequence-4 parent revision/Run, zero sequence-5 revision/Run rows and no Cycle closure.
- Under the owner-authorized named-local apply, normal T1-T4 created exactly 40 rows, delivered relay events 3/3 and advanced branch state/head to `10/5`. WorkOrder `pi_experiment_revision_v2_t132_m7_l1_options_fix_successor_v5_1` produced Run `ef_run_v2_t132_m7_l1_options_fix_successor_v5_1` with manifest `sha256:1b5be3de672f067f8e19677181c5c181699a0c595c71bd1e768dbf48f17ffc72`.
- The apply invocation's built-in replay and a second independent process both created zero rows and claimed zero relay events. Across both invocations, 236 protected tables changed 0; sequence-4 and older revision/Run authority was unchanged; sequence-5 Attempt/ExperimentResult/EvidenceCandidate/REU counts remained 0.
- The live runner now targets sequence 5 and uses business key `t132-m7-l1-live-p313-v5`. Its future execute token is distinct from the exhausted sequence-4 authorization. Offline-preflight passed with exact resources, Attempts 0, cloud calls 0 and database writes 0.
- One offline-preflight launch failed before application startup because the launch ran concurrently with `prisma generate` and observed a transient CommonJS client export. Sequential rerun passed without any code or data correction. Provider verification, STS issuance and billable actions remain separate.

## 2026-07-29 — M7-L1 Gate-2 direct-OSS Options fix

- Owner approved `APPROVE FIX` for the bounded Options-only change. The real-provider materializer now supplies exact `options: '{}'` to code, each dataset mirror and output `CreateJobRequestDataSources`; the materializer does not opt into ossfs.
- The shared wire type and schema now require `Options: '{}'`. Tests cover all emitted mounts and reject both omission and `{"mountType":"ossfs"}`. `DataSources[*].Options` was added to the redacted-manifest census.
- The first complete isolated gate correctly exposed a stale Prisma readback census: all focused/unit checks passed, but the real-provider relational read failed because its exact field list omitted Options. Updating that same read fence resolved the mismatch; no schema migration was needed.
- Final isolated run `t132-m7-options-empty-object-20260729-v2` passed shared 12/12, backend 93/93 and disposable-PostgreSQL relational 9/9. Shared/backend/script typechecks and focused 14/14 tests also passed; cloud calls, named-local writes and paid actions were zero.
- Existing sequence-4 rows were not rematerialized or modified. Because canonical request bytes and payload hashes change, the next executable verification must use a new immutable successor under separate named-local authorization, followed by separately authorized provider execution.
- Debug instrumentation remains uncommitted and active until one fresh provider verification resolves the original `src property must be a valid json object` failure. The Options product fix is offline-verified, not yet provider-verified.

## 2026-07-29 — M7-L1 Gate-1 direct-OSS request-shape diagnosis

- Added removable `dbg-20260729-071348-src-shape` instrumentation to the existing debug observation module and exact SDK call boundary. The new observer only emits whitelisted schema keys, JSON kinds/counts, serialized byte size, unknown-key counts and recursive `src` count.
- Hostile-value tests prove the observer does not emit URI, mount paths, role/account identifiers, commands, environment names/values, tag values or unknown field names.
- The runner's offline-preflight now read-only rematerializes the two persisted sequence-4 payloads and observes their exact SDK wire shape. Both requests round-trip as JSON; sizes are 2,923/2,920 bytes; unknown-key and `src` counts are zero.
- Each request contains four DataSources with exactly `MountAccess`, `MountPath` and `Uri`. None contains `Options`. CredentialConfig, Envs, JobSpecs and Settings all have the expected object/array/value kinds.
- Chrome opened the logged-in PAI create form. Adding an OSS storage mount, without entering any value, exposes an Advanced Settings editor initialized to `{}`. The browser-control surface did not expose a reliable request-abort primitive, so the form was deliberately not submitted.
- Current evidence supports one minimal compatibility change: every direct OSS DataSource should carry canonical `Options: '{}'`, keeping the documented default JindoFuse. The compatibility change alters request/payload hashes and therefore cannot be applied to or verified by existing sequence-4 rows.
- All changes remain uncommitted debug work pending Gate 2; no product fix, database write, capability change, cloud write or billable action occurred.

## 2026-07-29 — M7-L1 bounded paid PassRole-fix verification

- The exact action-time authorization allowed at most two Jobs and ¥50. A fresh controller STS passed the six-key, file-mode, identity, policy-hash and lifetime checks without exposing values.
- Sequence 4 invoked the official SDK `CreateJob` boundary exactly twice. RequestIds `019FAAF0-A1C4-533C-8E04-CBA65A115550` and `019FAAF0-A776-5709-ADD4-803987A9FE10` both returned HTTP 400 `BadRequest`; provider self-diagnosis resolved both to `src property must be a valid json object`.
- The old `check permission for ram role failed` / 4001 rejection did not recur, so the exact PassRole fix crossed its intended boundary. No third call was made and no Job/external ref or billable runtime resulted.
- Recovery-only `ListJobs` did not discover an accepted Job. Final named-local state retains two immutable `prepared` Attempts and two pending submit commands with `REAL_PROVIDER_RECOVERY_NOT_FOUND`; no historical revision, Run or Attempt was reset.
- Read-only SDK inspection proved its production `parseToMap` output contains ordinary JSON objects for the relevant nested models. Comparison with current SDK `1.10.2` found no relevant CreateJob/DataSources structural change. The remaining direct-OSS / credential / env / settings alternatives are hypotheses, not a root-cause finding.
- All temporary STS copies were removed. The two-call authorization is exhausted; further work is limited to a new no-cloud Debug Mode Gate 1 until an exact source is supported.

## 2026-07-29 — M7-L1 PassRole-fix verification successor

- Added a third exact successor mode to the existing named-local lineage script. The mode requires `T132_M7_PASSROLE_FIX_SUCCESSOR_APPLY_AUTHORIZATION=authorized-2026-07-29-p313-m7-l1-passrole-fix-successor-max40-no-cloud` and rejects ambiguous invocations with more than one successor authorization environment variable.
- Read-only preflight proved the branch was exactly at sequence 3 with state/head versions `6/3`, the sequence-4 scope was empty, and the protected sequence-3 lineage contained 2 Attempts and 2 ProviderCommands.
- The new immutable WorkOrder intent is specifically the bounded post-`PassRole` verification; its exact resources remain 2 CPU / 8192 MiB, `max_attempts=1`, timeout 1800, two cells and the existing frozen ExecutionBundle revision/hash.
- Normal T1-T4 created exactly 40 rows and advanced the branch to state/head `8/4`. WorkOrder `pi_experiment_revision_v2_t132_m7_l1_passrole_fix_successor_v4_1` produced Run `ef_run_v2_t132_m7_l1_passrole_fix_successor_v4_1` with manifest `sha256:9e39a40d56121a255ac83656a46a89ea8d6b487b920e16873675a59b410d5045`.
- Both the in-process replay and a second independent invocation added zero rows and claimed zero relay events. Across apply and replay, 236 protected tables changed 0; sequence-3 Attempts/ProviderCommands stayed 2/2; sequence-4 Attempt/ExperimentResult/EvidenceCandidate/REU counts stayed 0.
- The live runner now targets sequence 4 with business key `t132-m7-l1-live-p313-v4` and the 2026-07-29 action-time token contract. Offline preflight passed with zero cloud calls and zero database writes. No paid authorization has been inferred or consumed.
- A fresh one-hour controller STS was issued from Cloud Shell with the exact v3 session policy. Local contract validation checked only six required keys, temporary identity, exact role/policy hash, mode `0600` and at least 55 minutes remaining; no credential value was printed. Production `image-preflight` then passed for sequence 4 with image request hash `fbbbfecf1af20f009fcc0c0cadaeb08a51a91b53ab343b52b88c3e896eed7595`, one `GetImage`, zero provider writes, zero `CreateJob` and zero database writes.
- The Cloud Shell source, local `/tmp` files and Downloads copies were removed after preflight. Because that STS was deliberately destroyed before paid authorization, execute must use a newly issued credential after the owner confirms the action-time window.

## 2026-07-29 — M7-L1 exact controller PassRole recovery

- Alibaba Cloud OpenAPI self-diagnosis resolved both paid-reproduction RequestIds to the same provider response: `check permission for ram role failed, error code: 4001, error message: NoPermission`. The provider response replaces the SDK's generic HTTP 400 surface with an exact delegated-role authorization failure.
- Live read-only RAM inspection proved controller custom policy `pea-m7-canary-controller` default v2 has no `ram:PassRole`. The runtime role itself is not the defect: `pea-m7-canary-runtime` trusts only `pai.aliyuncs.com`, as designed.
- Debug Gate 2 approved the minimal repair. `controller-policy.json` now has one new Allow statement: `ram:PassRole` scoped only to `acs:ram::1183869713036194:role/pea-m7-canary-runtime`; no wildcard role resource, OSS write/delete expansion or other RAM action was added.
- The new raw policy SHA-256 is `f6b63cd73a57c6d8cfade1a177681ad4463cbd4d6d0a116e26a40ceee85ed497`, and the live-window runner pin now requires the exact SHA-256 value. Controller v3 is the live default; v1/v2 remain rollback versions.
- IAM application was intentionally owner-confirmed rather than automatic. The authenticated Cloud Shell created v3 and set v3 as default; v1/v2 remain available for rollback. Read-only policy reconstruction produced canonical semantic SHA-256 `6d6d091f68705f175aa33d19cc1f3d15a9fcd54d89ba3f826c045ad994c15b61`, matching the repository, with exactly one PassRole statement on the runtime ARN.
- A fresh one-hour controller STS carrying the v3 session policy passed the production `image-preflight`: one `GetImage`, provider writes 0, `CreateJob` 0, database writes 0. Cloud Shell, local `/tmp` and Downloads temporary credential files were then removed and independently checked absent.

## 2026-07-28 — first paid rejection diagnosis and sequence-3 diagnostic successor

- The bounded live runner invoked the `CreateJob` SDK boundary exactly twice. Neither call returned a Job ID; subsequent retries were discovery-only, no Attempt received an external ref, and ActionTrail returned no `CreateJob` event in the execution interval. The two Attempts and submit commands later converged to terminal failed/`REAL_PROVIDER_RECOVERY_NOT_FOUND`; no PAI Job or billable compute existed.
- The provider transport intentionally swallowed the raw SDK exception to preserve accepted-response-loss safety, but that also discarded the minimum reason needed to distinguish validation, IAM and local transport failures. Debug run `dbg-20260728-151457-a9c4` adds removable observation at the runner-owned SDK wrapper and rethrows the same error unchanged.
- The observation accepts only closed-format error name/code, HTTP status, RequestId and call index. Messages, bodies, headers and credentials are never inspected for output. Hostile-fixture no-network tests pass 2/2; backend/script typechecks and `git diff --check` pass. Instrumentation remains intentionally present and uncommitted until the next reproduction, then must be removed.
- Existing sequence-2 Attempts cannot be reset or resubmitted: each TaskSpec freezes `max_attempts=1`. The lineage apply script now retains its historical resource-successor mode and adds a separate exact diagnostic-successor authorization/mode.
- The first sequence-3 apply attempt failed inside T1 with the branch/content uniqueness fence because an exact copy of sequence 2 has the same WorkOrder `contentHash`. Read-only census proved complete rollback: branch remained at sequence 2 and every sequence-3 table count was zero. The diagnostic successor was then given a truthful new title/objective for reproducing the provider rejection; resources, cells, Bundle and run policy remained unchanged.
- The authorized retry created exactly 40 rows and delivered T1-T4 3/3. WorkOrder `pi_experiment_revision_v2_t132_m7_l1_diagnostic_successor_v3_1` is sequence 3; Run `ef_run_v2_t132_m7_l1_diagnostic_successor_v3_1` has manifest `sha256:ae92cacda8c9cd049b105b4a6324181881ea86de6c4917bbab84003a329a5bcc`. Branch state/head versions are 6/3. All 236 protected tables, sequence-2 Attempts/commands and prior lineage remained unchanged.
- In-process replay and a second independent invocation both added zero rows and claimed zero relay events. The live runner now targets the sequence-3 Run and business key `t132-m7-l1-live-p313-v3`; offline-preflight passes with exact 2 CPU / 8192 MiB / 30 minutes, `max_attempts=1`, existing Attempts 0 and zero cloud/database writes.
- The next boundary is a new action-time two-job/¥50 authorization and fresh ≥55-minute controller STS. The prior two-call authorization is exhausted even though no billable Job was created.

## 2026-07-28 — M7-L1 provider-manifest v2 persistence recovery

- The first paid-window execute invocation resolved the exact named-local Run/Bundle and completed one fresh read-only `GetImage`, then stopped before `CreateJob` with `Provider payload redacted manifest must be a v1 JSON object`. Provider writes, Jobs, billable compute, Attempt rows and database/scientific/evidence writes were all zero; the temporary controller credential files were deleted.
- Root cause was a split contract boundary: the production provider-managed materializer correctly emits redacted manifest v2 and the Prisma reader already accepts v1/v2, but the normal `startExecution` write mapper and `ef_provider_payload_manifest_version_check` still admitted only v1. The prior relational test inserted the real payload with raw Prisma data and therefore bypassed the production mapper.
- `mapExperimentFoundationProviderPayloadV2CreateData` is now the single tested create-data mapper. Simulation remains v1-only; `real_provider` accepts v1 or v2. Migration `20260728140500_enable_real_provider_payload_manifest_v2` replaces only the existing CHECK, binds the relational version to the JSON discriminator and performs no data update/backfill.
- The relational test now materializes an explicit provider-managed ExecutionBundle v2, persists the Bundle through the repository mapper, proves typed readback, rejects simulation/v2 and rejects relational/JSON discriminator drift. The live-window runner is also registered as an exact reviewed M7 implementation/source-population path; unknown provider implementations remain rejected.
- Convergence history is preserved: disposable run v1 exposed the stale v1 fixture (8/9 relational); v2 passed the product tests but M7-15 correctly rejected the unregistered live runner; v3 passed M7-01..M7-15 with backend 93/93, shared 12/12 and relational PostgreSQL 9/9, zero skips, full cleanup, `named_database_writes=0` and `existing_database_migrations_applied=0`. Prisma migration drift is empty and the DB context contract is synchronized.
- After separate authorization, `pnpm db:dev:migrate` applied exactly `20260728140500_enable_real_provider_payload_manifest_v2` to the reviewed named-local database. Migration status is 71/71; CHECK readback matches the reviewed discriminator contract. The pre/post census covered 250 application tables and 3,370,691 rows: primary-key/xmin digest remained `sha256:f0a58c6b836698a830a8b55df27435d2b9a70d763f5a47e1aa0ef72d4949679a`, six Pack B counts remained `2/2/12/8/2/2`, and exact Run Attempt count remained zero. Post-apply offline-preflight passed with cloud/database writes zero. Durable evidence: `artifacts/db/m7-l1-provider-manifest-v2-20260728/`.
- The next boundary is cloud execution, which requires a fresh controller STS and new action-time paid-window confirmation.

## 2026-07-28 — controller v2 activation and production image preflight

- The owner activated controller policy v2 as the default RAM policy version and retained v1 as rollback. The console policy is semantically identical to repository digest `c014cac58a794f2bc4849c0c05993ee85fc660dcb6d3206438b08bf7d5c219be`; its only image addition is read-only `paiimage:GetImage`.
- A fresh controller-role STS supplied outside the repository produced two independent HTTP 200 `GetImage` reads. Every frozen provider-managed field matched, but the public official-image response omitted optional `WorkspaceId` (and did not echo `ImageId`). The response shape proved that image ownership metadata is not the DLC Job target workspace.
- Under debug run `dbg-20260728-001258-9f3a`, the owner approved the no-instrumentation diagnosis and minimal fix. `run-experiment-foundation-m7-l1-live-window.ts` no longer requires optional image `workspaceId`; an absent observed value is encoded as `null` in the request evidence hash. Exact URI, modification time, size, accessibility and source-type fences remain unchanged.
- The runner now has an explicit `image-preflight` mode. The new mode uses the same production credential, manifest and `freshImagePreflight` path as `execute`, but returns immediately after one cloud read and reports zero provider writes, `CreateJob` calls and database writes. Only `execute` consumes the recorded live authorization gate.
- Script typecheck, named-local `offline-preflight` and the production `image-preflight` all passed. The latter bound Run `ef_run_v2_t132_m7_l1_resource_successor_v2_1`, the frozen ExecutionBundle revision/hash and image request hash `00886de40a879706e6395f5261af18b861b35b958826cb10b303cc59375014d3`.
- No capability was enabled, no PAI Job/Attempt was created, and the recorded two-job/¥50 authorization remains unconsumed. Temporary STS files remained repository-external with owner-only permissions; no credential value was printed or recorded.

## 2026-07-28 — Visualization placement correction and personal-use scope override

- The prior request for an HTML progress view was incorrectly classified as repository developer documentation. That produced a standalone HTML file under `dev-docs/**`, even though the user requested an in-conversation desktop visualization and did not ask for a project artifact.
- The repository HTML artifact and overview link are removed. The replacement is a thread-scoped interactive fragment under the Codex visualization directory, using the inline visualization contract and keeping generated presentation state outside the project source tree.
- Active delivery is now the sole-maintainer personal-use experiment base: run/observe/cancel/recover/collect/replay one exact real diagnostic and inspect the diagnostic locally. Product packaging, generalized BYOC, multi-user/tenant work, managed-cloud delivery and non-blocking product audit items are parked.

## 2026-07-28 — M7-L1 resource-exact successor landing

- Extended the guarded named-local lineage runner with a separate exact max-40 successor authorization. The runner accepts only the reviewed target, open Cycle, existing `ragperf-primary` branch at sequence/head 1, empty successor prefix, active frozen ExecutionBundle and default-false capabilities.
- Normal T1-T4 created one WorkOrder sequence 2, two unchanged cells, one admission, the exact 23-dependency EF executable lineage and final acknowledgement. T1 and T3 performed the two authorized branch CAS updates; the old revision and Run remained immutable.
- New Run `ef_run_v2_t132_m7_l1_resource_successor_v2_1` has manifest `sha256:221824f852a55aae19370c6ceae086b55eac54a9aca383b51baf472980d5a232`. Both TaskSpecs carry `2 CPU / 8192 MiB`, `max_attempts=1`, `timeout_seconds=1800` and Bundle hash `sha256:458b0e58d93974e3a09b63247bac675d26deef5fdafb111a6eae66177a3b178e`.
- The first verifier pass stopped after T1-T4 because the verifier counted only the admission CAS and expected branch `stateVersion=3`; head advancement correctly performs the second state CAS, producing `stateVersion=4`. The validator was corrected to assert `+2` state / `+1` head, without adding or changing lineage rows.
- The completion/replay verifier then passed with all 40 successor rows exact, zero-new replay, 236 protected tables unchanged, old revision/Run sentinels unchanged, and zero cloud calls, capabilities, Attempts, ExperimentResult, EvidenceCandidate or REU.
- The live runner now binds the successor Run/manifest and uses workflow business key `t132-m7-l1-live-p313-v2`. Its zero-cloud offline preflight passes against exact `ecs.g6.large`, reports `existing_attempt_count=0`, `cloud_call_count=0` and `database_write_count=0`.

## 2026-07-28 — P313 M7-L1 executable lineage apply

- Added `apps/backend/scripts/apply-experiment-foundation-m7-executable-lineage.ts` to the Experiment Foundation script typecheck. The runner locks the named-local fingerprint, exact P313/new-Cycle/bundle identities, 44-row ceiling, historical sentinels, protected-table row versions, default-false capabilities and forbidden scientific/evidence tables.
- `PrismaPaperImplementationExperimentSpineV2Repository` now persists the actual WorkOrder snapshot discriminator and accepts only exact relational/snapshot `v1 | v2` binding. `PrismaExperimentFoundationSpineV2Repository` applies the same rule to RunRecipe and TrainingTaskSpec readback while continuing to verify exact ExecutionBundle tuples and canonical hashes.
- Added positive Prisma replay regressions for executable PI WorkOrder v2 and executable EF RunRecipe/TaskSpec v2. Backend typecheck and the targeted repository suite pass.
- The first admitted T1 transaction committed 6 rows after the new Cycle/trace prefix had committed 3. T2 wrote no durable row: its serializable transaction rolled back when the stale EF v1-only readback fence rejected its own v2 rows. The relay correctly terminalized the PI outbox.
- The runner's restart census now covers all 17 authorized table families rather than only the initial three-row Cycle prefix. Separately authorized recovery is exact to one outbox, requires the expected terminal/error/attempt/no-EF-row state, retains `relayAttemptCount=1`, and adds no row.
- Final apply recovered the one marker and drained all three relay events. The resulting executable Run is `ef_run_v2_t132_m7_l1_p313_v1_1`, manifest `sha256:e0c6c92d3c4a8179cf5d91147e4dff5ef2079d6614a95bf1ce0ca214334094a5`; commits `4b9c5955` and `45ea8208` contain the implementation and bounded recovery guard.

## Status
- Current status: `in-progress`
- Last updated: 2026-07-27
- Implementation Pack A、control-plane source binding、named-local Pack A/Pack B schema landing、Pack B technical implementation、深度清理、正式 PI scope → Pack A → Pack B product landing、zero-write cloud-preflight implementation/真实 Aliyun read-only acceptance，以及 M7-L1 official-image + OSS provider-shape 增量均已离线验证。当前 named-local cutover=`true`，admission/simulation/cloud-preflight/real-provider capability 均为 `false`；已完成独立授权的三个 content-addressed OSS 输入对象上传与只读校验。SciFact 2 DataPolicy + 2 Dataset 的 26-row authority landing/replay/exact mirror binding，以及 v2 CHECK migration + 6-row bundle freeze + zero-new replay 均已在 reviewed named-local 完成。非本地 rollout、provider job write 和 scientific execution均未执行。

## 2026-07-27 — M7-L1 reviewed ExecutionBundle v2 preparation

- Added `execution-bundle-v2.json` as the default-off reviewed authoring SSOT and added database-free plan tests for exact uploaded artifact bindings, bound Dataset mirrors, provider-managed image identity, dependency/parser hashes and authorization negative space.
- Added a planner that freezes one deterministic v2 revision and uses the production real-provider payload materializer twice for each of the two reviewed cells. Payload hashes are `sha256:1655360027fbf970e6d11f1e82e70712376375c5ceff968607c03c15090fd921` and `sha256:a671fe0a31bd94b612352e530ff2e934032f9dfc2ea4f353290518b235a7742b`; both replays are byte-exact with all side-effect counters zero.
- Corrected the Prisma bundle repository so draft/revision schema versions are persisted and read as v1/v2 instead of being hard-coded to v1, and so stored discriminator/content/hash-profile drift fails closed.
- Added `apply-experiment-foundation-scifact-execution-bundle.ts`: reviewed local target fingerprint, exact six-row process authorization, protected-table row-version digest, target-only table census, exact frozen-plan comparison, exact readiness resolve, replay counters and global-fetch denial.
- Disposable PostgreSQL found the original `ef_execution_bundle_*_schema_check` constraints still allowed only v1. Added `20260727170000_enable_execution_bundle_schema_v2` rather than editing applied history; the migration admits only v1/v2 and binds relational discriminators to the JSON content version.
- The same convergence run found stale relational coverage/reader assumptions for provider redacted manifest v2. The Prisma reader now validates both manifest v1/v2 and the current expanded redacted-field census; the test derives exact profile/manifest versions from the production materializer.
- Final disposable run `t132-m7-bundle-freeze-20260727-v6` passed M7-01..M7-15, including 9/9 real PostgreSQL tests. Named-local was never connected by the gate. The first six-row-only authorization correctly stopped before the newly discovered schema migration; a later exact supplemental authorization covered the reviewed migration, accepted the no-backup local-development risk, then covered the six-row freeze and zero-new replay.
- Named-local migration status is now up to date. Bundle r1 created exactly 6 rows and r2 created 0/exact-reused 6. The frozen revision is `ef_execution_bundle_revision_2c60e151719be2e109e4b2d3964aaa8c315e0b48` with content hash `sha256:458b0e58d93974e3a09b63247bac675d26deef5fdafb111a6eae66177a3b178e`; readiness is `passed`. Both runs reported 244 protected application tables unchanged, external fetch 0 and cloud/provider/`CreateJob`/scientific writes 0.

## 2026-07-27 — M7-L1 fresh pre-submit GetImage comparison

- A separate read-only cloud authorization covered only the exact `cn-shanghai` asset `image-liuxvj7p2qcnflha84`; the authorization excluded credential capture, capability changes, `CreateJob`, provider writes and paid execution.
- The first CLI attempt failed locally before transport because AIWorkspace does not derive its endpoint from `RegionId`. Retrying with the explicit regional endpoint succeeded. A second successful `GetImage` selected the provider's `GmtCreateTime`/`GmtModifiedTime` names that were absent from the first compact projection.
- Fresh observation matches the frozen `ExecutionBundle@v2` exactly: URI `dsw-registry-vpc.cn-shanghai.cr.aliyuncs.com/pai/torcheasyrec:1.3.0-pytorch2.12.1-cpu-py311-ubuntu22.04`, create/modify time `2026-07-02T04:35:35.000Z`, size `3803970629`, accessibility `PUBLIC` and source type `Import`. `Identity` and `Signature` remain null.
- Successful provider reads: 2; failed-before-transport attempts: 1; cloud writes, `CreateJob`, capability changes, credential capture, provider compute and scientific/evidence writes: 0. Durable closure: `artifacts/implementation/22-m7-l1-fresh-getimage-closure.md`.
- The GetImage observation is procedural freshness evidence, not an OCI digest or live-job authorization. If the two-job live window is delayed, repeat the same read-only comparison.

## 2026-07-27 — M7-L1 SciFact named-local authority landing

- Supplemental authorization covered exactly 26 rows and explicitly excluded bundle freeze/cloud access. Run r5 created 4 identities, 4 revisions, 4 freeze receipts, 10 lifecycle events and 4 lifecycle projections; the scoped census was exactly 26.
- Run r6 replay created zero rows and exact-reused all 4 identities, 4 revisions, 10 events and 4 projections. Both runs reported 242 protected application tables unchanged, external fetch 0, cloud/provider/CreateJob/scientific writes 0.
- Negative-space evidence now hashes ordered primary-key values plus PostgreSQL `xmin` for every protected table. The row-version signature detects insert/update/delete without materializing large vector or payload fields.
- `scifact-mirrors-v1.json` now binds the corpus and query mirrors to exact Dataset revision IDs, sequence 1 and the returned immutable content hashes. The planner accepts null pre-apply bindings or exact matching persisted bindings and rejects any binding drift.
- Durable gitignored evidence: r5 apply SHA-256 `f4fc920b1f36e82b4774e1ae5531bfb101162f9eb98ed838fdca23a67ae09d6a`; r6 replay SHA-256 `b875ca7f29f158269b6e24028a138b6d5bec6eff4a33f5689dd0b23c1d120066`.
- Next boundary: a separate approval is required before creating/freezing `ExecutionBundle@v2`. No capability, credential, provider operation or scientific execution was introduced by the authority landing.

## 2026-07-27 — M7-L1 SciFact authority plan

- A server-enforced `REPEATABLE READ` / `transaction_read_only=on` named-local query confirmed exactly two existing Dataset families: the historical Wikipedia corpus and Natural Questions query workload. They do not describe the uploaded SciFact bytes and are intentionally not reused.
- Added `workloads/ragperf-canary/manifests/scifact-authority-v1.json`. The manifest pins the BEIR archive MD5/SHA-256, upstream SciFact license file at commit `68b98a56d93e0f9da0d2aab4e6c3294699a0f72e`, separate `ODC-By-1.0` corpus and `CC-BY-4.0` query policies, and exact single-file Dataset checksum/split snapshots.
- Added a default-off planner that freezes those two policies first and then freezes two Dataset drafts against the exact policy refs through the normal EF v2 service and injection-only transactional repository. The planner requires exact role/ordinal/path/byte/SHA-256 agreement with the uploaded mirror manifest.
- The stable planned DataPolicy hashes are `sha256:3a19555e64e6a0e008d6ffda5c08bded06d73986629ad90401f58b118bf4aa70` and `sha256:5199b666600d1aa09b25aaa7992d5b45f9434fea3a9ecf458e0af0fe46e73231`; planned Dataset hashes are `sha256:29e0535234976085ca18a7c7fff80a1a93207ecbaf8a5912a4bd712341ff50ff` and `sha256:5e37b54c4aee0798f67070e9b9148d5ebe30e50ad3c0175382de6cc3cb8a86fa`.
- Added `apply-experiment-foundation-scifact-authority.ts` as a restart-safe named-local importer. The importer requires the reviewed target URL/fingerprint and an exact 26-row process authorization; validates reserved draft/revision/lifecycle prefixes; applies policies before Datasets; reuses exact identities, revisions, receipts, events and projections on replay; rejects semantic drift; denies global fetch; and compares every application table outside the eight expected table families before/after.
- The corrected bounded write was subsequently authorized and completed exactly as 4 identities, 4 revisions, 4 freeze receipts, 10 lifecycle events and 4 lifecycle projections on the reviewed named-local target (26 rows total). The earlier 22-row approval request omitted the projections maintained by lifecycle compare-and-swap and was caught before any database write. No readiness, ExecutionBundle, provider, scientific or cloud rows were part of the completed write.

## 2026-07-27 — M7-L1 provider-managed image identity contract

- Preserved the existing `ExecutionBundle@v1` OCI-digest schema and its redacted manifest v1 rather than silently widening a frozen version.
- Added `ExecutionBundle@v2` for the PAI-managed diagnostic image. `ExecutionBundle@v2` requires the explicit discriminator `provider_managed_asset`, exact provider metadata (`ImageId`, region, modified time, safe-integer byte size, accessibility and source type), and the only permitted scope `m7_l1_diagnostic_only`.
- Bundle freeze records v1/v2 consistently and hashes content using the matching schema version. Stored revision schema/content-version drift, invalid timestamps and regional PAI URI drift fail closed.
- Added redacted manifest v2 for the provider-managed branch. Redacted manifest v2 stores `image_identity_kind`, the server-derived provider-asset identity hash and diagnostic scope; the exact non-secret ImageId/URI live only in the immutable ExecutionBundle, not the ProviderPayload record, and no `image_digest` field exists in the v2 provider binding.
- The first schema test exposed that the official image size `3,803,970,629` exceeds PostgreSQL Int32. Because provider image metadata remains inside JSON rather than an Int column, the field now uses the existing JSON-safe integer ceiling without weakening any Int32-backed contract.
- Remaining operational gate: under separate approval, freeze the reviewed bundle from the now-bound exact Dataset revisions, rerun offline same-payload verification, then re-query `GetImage` read-only immediately before a separately authorized live window.

## 2026-07-27 — M7-L1 SciFact source, slice and OSS input closure

- Downloaded the official BEIR SciFact archive from the recorded TU Darmstadt URL. The official MD5 matched `5f7d1de60b170fc8027bb7898e2efca1`; the downloaded archive SHA-256 is `536e14446a0ba56ed1398ab1055f39fe852686ecad24a6306c80c490fa8e0165`.
- Deterministic slice retained the complete 5,183-record corpus and the 300 unique query IDs referenced by `qrels/test.tsv`, preserving source query order. Qrels and training data were excluded. The source, slice rules, license evidence and exact local hashes are frozen in `workloads/ragperf-canary/manifests/scifact-mirrors-v1.json`.
- Used verified Alibaba Cloud Shell temporary credentials rather than creating or recording a long-lived AK/SK. Declined the optional performance NAS prompt; no NAS resource was created. The three exact OSS targets returned `NoSuchKey` before upload.
- Uploaded `entrypoint.py` (7,916 bytes), `corpus.jsonl` (8,106,566 bytes) and `queries.jsonl` (56,640 bytes) to their content-addressed keys in `pea-m7-canary-6194-202607`, explicitly using `oss-cn-shanghai.aliyuncs.com`.
- Post-upload `stat` content lengths match local byte counts. Remote CRC64-ECMA values `1815526306812411307`, `8566302686400034898` and `14258960024956570564` match local `ossutil hash` in workload/corpus/query order. Both manifests are now `uploaded_verified`.
- Durable closure: `artifacts/implementation/21-m7-l1-oss-input-upload-closure.md`. No capability was enabled; no controller STS value, `CreateJob`, DLC compute, output object or scientific evidence was created. At that checkpoint the official-image identity decision was next; the `M7-L1 provider-managed image identity contract` section supersedes that blocker.

## 2026-07-27 — M7-L1 official-image and DLC OSS authorization preflight

- The PAI official-image inventory and read-only `GetImage` API resolved asset `image-liuxvj7p2qcnflha84` to `dsw-registry-vpc.cn-shanghai.cr.aliyuncs.com/pai/torcheasyrec:1.3.0-pytorch2.12.1-cpu-py311-ubuntu22.04`. The response was HTTP 200 with RequestId `019FA081-E47D-52E2-8468-FBCF1C11B46F`; the asset is `PUBLIC`, source type `Import`, region `cn-shanghai`, size `3803970629`, created/modified `2026-07-02T04:35:35.000Z`.
- The same official-image row is visible in the workspace and declares CPU, PyTorch 2.12, Python 3.11 and DSW/DLC support. The matching row proves provider addressability, not a successful image pull.
- `GetImage` did not expose an OCI/content digest; both `Identity` and `Signature` were null. The exact `ImageUri` and PAI `ImageId` may be retained as provider evidence, but neither may be relabeled as the existing ExecutionBundle `image_digest`. At the historical preflight checkpoint bundle freeze was blocked; the later v2 provider-managed identity contract resolves that decision without weakening v1.
- The account-level PAI “开通和授权 → 全部云产品依赖” page reports DLC → OSS data storage as `已开通`, and the unsubmitted create-job form exposes the expected OSS URI, mount path, read-only and RAM-role controls. The console evidence closes the separate platform mount-service authorization preflight but not live runtime-role/object access.
- At the preflight checkpoint, `workloads/ragperf-canary/manifests/workload-directory-v1.json` froze the local expanded workload directory as exactly one root file, `entrypoint.py`, using `single-file-expanded-directory@v1`. Its file/directory content digest was `sha256:9b2a82298dfa969146e5e223893d3d86c6254cb16a995be72b65709a55b4f05d`, byte size was 7,916, and the future exact internal OSS prefix contained that digest. The manifest was then `not_uploaded` with all write/job authorizations false.
- The create-job form was not submitted and the DLC task count remained zero. At the same checkpoint no object was uploaded, no capability was enabled, no credential was captured, and no provider write or billable compute occurred.
- The source, slice and upload items listed as remaining in the preflight record were completed by the `M7-L1 SciFact source, slice and OSS input closure` section. Image content identity, fresh short-lived controller STS and the final two-job live-window authorization remain open.

## 2026-07-26 — M7-L1 official-image + OSS provider-shape increment

- Added a real-provider-only profile discriminator, a closed workload binding contract and an exact transient `CreateJob` request schema. The preflight `AliyunPaiDlcExecutionProfile@v2` remains unchanged; live payload resolution must deliberately construct `AliyunPaiDlcRealProviderProfile@v1` with the reviewed role and mount roots.
- The payload materializer now consumes immutable ExecutionBundle code/mirror refs, digests and byte sizes. The materializer rejects non-internal/non-directory/non-content-addressed OSS refs, cross-region/bucket drift, unordered mirror ordinals, unsafe output segments, nested/non-canonical mounts and commands that do not execute from the exact code mount.
- The official SDK request now carries deterministic RO code/input and RW output `DataSources`, standard `EXPERIMENT_FOUNDATION_*` environment bindings and the exact runtime service-role `CredentialConfig`. The SDK `toMap()` output is closed-schema validated before canonical hashing.
- Durable redacted evidence binds image digest, runtime-role hash, artifact/mirror ref and mount hashes, raw content digests/byte sizes, output binding hash and environment hash. Raw payload bytes, workspace/resource selectors, image ref, command, URIs, mount paths, env values, credentials and tags remain transient and are forbidden from persistence.
- `workloads/ragperf-canary/entrypoint.py` now consumes the standard mounted-directory contract and derives top-k only from the approved cell key. The workload verifies result-envelope and parser-profile lineage before producing canonical diagnostic output. ACR remains optional/offline; no image or object was pushed.
- Verification added exact SDK-wire, persistence-redaction, profile expansion, command/mount/content-address/order drift and rematerialization conflict cases. No capability, credential, OSS object, provider job, database authority or scientific evidence was changed.
- Superseded by the 2026-07-27 read-only preflight: the exact provider `ImageUri` and DLC OSS service authorization are now resolved. Remaining pre-live issues are the image content-identity contract, the content-addressed workload/two ordered SciFact manifests and objects, a separate upload window and, later, the explicit two-job live authorization.

## 2026-07-26 — M7-L1 ACR exit and official-image + OSS compatibility review

- The owner attempted to create a free personal ACR instance in `cn-shanghai`. After accepting the two required agreements and submitting the form, the console rejected the request with `个人版仅限个人用户使用，请实名认证为个人账号。`; no ACR instance, namespace, repository or charge was created.
- The owner accepted the no-ACR route: use a PAI official CPU image and place the canary code, SciFact inputs and result objects under the dedicated OSS bucket. The project intentionally does not upgrade to enterprise ACR for the diagnostic canary.
- Official PAI-DLC documentation and the pinned `@alicloud/pai-dlc20201203@1.10.0` SDK confirm that `CreateJob` can carry an official image, OSS `DataSources`, environment variables and `CredentialConfig`. DLC supports direct OSS mounts, while the custom DLC role provides short-lived in-container credentials without embedding AK/SK.
- At review time the repository had a real compatibility gap: `experiment-foundation-real-provider-payload-v2-service.ts` materialized only workspace/resource/display/job/spec/command/time/tag/access fields; the shared cloud-preflight schema and SDK mapping did not emit `DataSources`, `Envs` or `CredentialConfig`. The 2026-07-26 provider-shape increment closes that gap.
- At review time the typed ExecutionBundle recorded a code artifact, image identity and dataset mirrors without binding those refs/digests into the provider request or durable redacted/hash evidence. The 2026-07-26 increment now binds them, and `workloads/ragperf-canary/entrypoint.py` consumes the reviewed standard mount environment.
- The console label `torcheasyrec:1.3.0-pytorch2.12.1-cpu-py311-ubuntu22.04` is not treated as an immutable image digest. The 2026-07-27 `GetImage` lookup supplied the actual `ImageUri` and stable PAI asset ID, but no content digest; immutable content identity still requires an explicit review decision before bundle freeze.
- The compatibility-review checkpoint changed documentation only and performed no OSS upload, credential issue, capability enable, `CreateJob`, provider write or billable execution.

## 2026-07-26 — M7-L1 OSS step A closure and RAM materialization

- Console verification established the dedicated bucket `pea-m7-canary-6194-202607` in `cn-shanghai`, created `2026-07-26 17:03`, using Standard storage, locally redundant storage, private ACL, Block Public Access, and OSS-managed AES256 server-side encryption.
- Lifecycle rule `pea-output-delete-30d` is enabled for prefix `output/`; both complete objects and incomplete multipart fragments are deleted after 30 days. `input/` intentionally has no lifecycle rule and remains subject to the explicit post-M7-L2 cleanup decision.
- Replaced the policy-only `BUCKET_NAME` placeholders with the exact bucket. Final repository digests are controller `ddde63f223f8d1982da124414ff8224aa7a431f56b51af834030b4fb681f4d8c` and runtime `68d911b2ecfdac5d3ddb32c4d7294fb9d793b8aee527bec18c989f987e7ca5c8`.
- The checkpoint creates no RAM policy/role, ACR resource, object upload, STS credential, PAI job or capability enablement. The checkpoint changes no architecture or persisted interface; step B remains an owner-confirmed console action using the repository-finalized policy bodies.
- The sole maintainer confirmed direct commits to `main`; no PR branch is required for the delivery.

## 2026-07-22 — Explicit Aliyun public-resource preflight mode

- Browser-side PAI inspection confirmed region `cn-shanghai`, numeric workspace ID `1450165`, workspace status enabled, zero bound DLC/general-computing quota, and an available public pay-as-you-go selector. No quota was created or purchased and no cloud job was submitted.
- Added execution-profile/payload/redacted-manifest v2 contracts with an exact `exact_quota | public_resource` resource-binding union. Public mode rejects any resource ID and omits `ResourceId` from canonical payload bytes and the official SDK wire map.
- Upgraded the read-only service/SDK transport to mode-aware observations. Exact-quota pagination remains unchanged; public mode performs one `ListResources` read without synthesizing quota identity, then retains the same CPU-spec, endpoint, identity-policy, operation-ledger and zero-write checks.
- Added payload↔manifest binding verification for workspace/image/resource hashes and resource mode. A schema-valid manifest substituted across modes now fails with `ALIYUN_CREATE_JOB_PAYLOAD_CONFLICT`; ambiguous public bindings fail before provider transport.
- Added `EXPERIMENT_FOUNDATION_V2_ALIYUN_PREFLIGHT_RESOURCE_MODE` to the env SSOT with backward-compatible default `exact_quota`; regenerated all derived env artifacts. Runner evidence schema is now `experiment-foundation-cloud-preflight@v2` and records the selected non-secret mode.
- Read-only browser verification kept the create form unsubmitted while confirming zero general-compute quota, product-selected public resources and the official CPU image reference `torcheasyrec:1.3.0-pytorch2.12.1-cpu-py311-ubuntu22.04` for workspace `1450165`.
- Local public-mode runner r2 used that exact console image reference, remained capability-off and made zero provider calls. The runner proved the acknowledged two-cell Run can materialize two public-resource payloads and complete same-payload simulation while preserving 88-table parity. Temporary STS and reviewed external policy evidence remain separate prerequisites for the live read-only run.

## 2026-07-22 — Controlled ListEcsSpecs RAM-policy retry

- The first live read-only run reached exactly three intended operations: `AIWorkspace.GetWorkspace` and `AIWorkspace.ListResources` succeeded, while `PaiDlc.ListEcsSpecs` failed. All provider-write, CreateJob, database-write and scientific-write counters remained zero. Because the official API page omits authorization metadata, the failure initially motivated the empirical `paidlc:ListEcsSpecs` session action; later single-variable evidence showed that the HTTP 400 was caused by `SortBy=CPU`, not by authorization.
- The code-owned STS policy and exact identity-evidence action list now add only `paidlc:ListEcsSpecs`; `paidlc:CreateJob` remains an explicit deny. Raw SDK exceptions are normalized to `ALIYUN_READ_ONLY_PROVIDER_CALL_FAILED` with a redacted message, while existing typed domain errors retain their more specific reason codes. A focused injected-client test proves credential-like provider diagnostics do not escape and the failed ledger row remains sanitized.
- Backend focused tests passed 12/12, cloud gate meta tests passed 4/4, and both backend plus experiment-foundation script typechecks passed. No Prisma schema, migration, product capability, IAM identity policy or provider-write path changed.
- One new 3600-second STS was issued for r4. The temporary harness copied the provider `Expiration` value directly into evidence, but the evidence parser requires canonical millisecond UTC. r4 therefore blocked locally with `ALIYUN_IDENTITY_POLICY_EVIDENCE_INVALID` before any provider transport operation; summary SHA-256 is `a4c56386b404ad6d9a9118a799905f19f3cf71bfaede28cb682e832144b66465`. The wrapper removed the credential/evidence directory in `finally`, the shell retained no cloud environment variables, and no second STS was issued. A subsequent authorized attempt must normalize `expires_at` with `new Date(Date.parse(value)).toISOString()` before hashing evidence.
- The separately authorized r5 issued one new 3600-second STS with the same three-read allowlist and explicit CreateJob deny. The harness canonicalized the provider expiration with `toISOString()`, passed the production evidence parser before writing, verified a repo-external `0600` file by independent SHA-256, and then invoked the gate once.
- r5 reached all three intended reads: both AIWorkspace calls succeeded and `PaiDlc.ListEcsSpecs` failed again with the now-stable redacted reason `ALIYUN_READ_ONLY_PROVIDER_CALL_FAILED`. The 88-table read-only fence remained unchanged; provider-write requests, CreateJob calls, provider writes, database writes and scientific writes were all zero. Summary SHA-256 is `e8c2c89c56b05dec9ac9758eb2aa6044d17827355ee1585b69b9828bde1fb774`.
- At the time of r5, the result could not distinguish an incorrect inferred action from a role missing that action because an STS session policy can only restrict existing role permissions. The subsequent 2026-07-23 read-only RAM audit resolved that ambiguity: `cloud-0001` already has account-level `AdministratorAccess`, so the base role Allow is present and no additive IAM policy change is warranted. The remaining explanations are an incorrect/unsupported inferred action, endpoint-specific authorization, or a higher-level service boundary. The r5 wrapper deleted all credential/evidence files in `finally`; no additional STS or provider retry was attempted.

## 2026-07-23 — cloud-0001 effective-permission audit

- The RAM console showed ordinary role `cloud-0001`, role ID `300275336508927114`, ARN `acs:ram::1183869713036194:role/cloud-0001`, and a one-hour maximum session duration.
- Its permission list contained 10 account-level system policies, including `AdministratorAccess` plus OSS/RDS/SLB/ECS full/read-only policies and `AliyunRAMFullAccess`. No custom policy was attached in the captured list and no separate deny policy was exposed there.
- Alibaba's system `AdministratorAccess` policy grants `Action: *` on `Resource: *`. Therefore adding another `paidlc:ListEcsSpecs` Allow would be redundant and cannot fix r5. The reviewed IAM remediation diff is intentionally empty; no role mutation was performed.
- At the audit checkpoint, the code-owned `paidlc:ListEcsSpecs` session action remained an empirical hypothesis rather than provider-confirmed metadata. The subsequent parameter-isolation run and successful r6 established the request-shape root cause without any IAM mutation. The public documentation still does not confirm the action mapping, so future least-privilege policy minimization must review the mapping separately from preflight acceptance; replacement of the role's broad administrator grant remains an independent security task.

## 2026-07-23 — ListEcsSpecs HTTP 400 root cause and fix

- Approved Gate-1 instrumentation isolated the request one field at a time with the same temporary role/session restriction. `PageNumber=1, PageSize=10, ResourceType=ECS` returned 200/149 total; adding `AcceleratorType=CPU` returned 200/108 total; adding only `SortBy=CPU` returned 400 `BadRequest`. The run stopped at that first failure and performed three provider reads, zero provider writes, zero CreateJob and zero database operations.
- The production SDK transport now uses a DLC-specific page size of 10, keeps `ResourceType=ECS` and `AcceleratorType=CPU`, and omits optional `SortBy`/`Order`. Workspace resource pagination remains independently bounded at 100. All three SDK failure paths preserve only regex-limited status/code/RequestId metadata and intentionally discard raw provider diagnostics.
- The focused backend suite passed 12/12, cloud gate meta passed 4/4, backend typecheck and experiment-foundation script typecheck passed. The injected failure test proves safe metadata survives while credential-like raw diagnostics do not.
- Formal r6 used one new one-hour STS, canonical repo-external identity evidence and the normal gate. The run passed CP01-CP12, observed 108 CPU specs/105 available across 11 DLC pages, and recorded 13 successful read operations. Provider write requests, CreateJob calls, provider writes, database writes and scientific writes were all zero; 88 protected tables had `changed_tables=[]`; scientific execution remained `not_started` and evidence eligibility remained false.
- r6 summary is `.ai/.tmp/experiment-foundation-productization/cloud-preflight-public-resource-readonly-20260723-r6/summary.json`, SHA-256 `ae524752ef64f658ddfb796e8c0834bf0903baadf1c8e79cfbc392887c516053`. The external STS/evidence files and all debug instrumentation were removed after verification; the capability remains default-off. The run closes only read-only preflight acceptance, not image pull, scheduler capacity, provider execution or scientific evidence generation.

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
- Added an exact `CreateJob` payload materializer over the acknowledged Run's ordered RunCell/TaskSpec bindings. The materializer canonical-hashes transient full bytes, enforces the 65,536-byte limit and emits only hashed/redacted persistent evidence.
- Added a same-payload fake lifecycle and an official Alibaba Cloud SDK read-only transport. Application code exposes only `GetWorkspace`, `ListResources` and `ListEcsSpecs`; `CreateJob` is denied before provider transport. Identity evidence is access-key-id-hash-bound, time-bounded and requires explicit `paidlc:CreateJob` denial.
- The original reviewed RAM policy granted the two documented AIWorkspace read actions only because the official PAI-DLC 2020-12-03 `ListEcsSpecs` page exposes no RAM authorization action. r3 initially appeared to implicate that boundary, so the exact session policy added empirical `paidlc:ListEcsSpecs` while retaining an explicit `paidlc:CreateJob` deny. The later controlled parameter-isolation run corrected the causal conclusion: `SortBy=CPU`, not authorization, produced HTTP 400; the empirical action remains only as the policy used by successful r6 pending a separate least-privilege review.
- Added `.ai/scripts/experiment-foundation-cloud-preflight-gate.mjs` plus the backend runner. The runner binds the exact Pack B final verifier and named-local database fingerprint, recomputes 88 protected-table digests, emits CP01-CP12 and never persists raw payloads or credentials.
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
- `recordExperimentResult` rejects caller result ids/content hashes, manifest/cell/TaskSpec/Attempt drift, non-succeeded Attempts and every simulation/fake provenance. The service derives a stable result id from the RunCell, hashes the complete envelope server-side and relies on the RunCell unique fence for changed-content conflicts.
- `validateScientificBatch` accepts only Run identity, expected manifest and idempotency key. The service requires exactly one result per ordered cell, real provenance, non-empty typed rules and the durable exact head acknowledgement before writing. `required_rules=[]` is deliberately `VALIDATION_SUBJECT_INCOMPLETE`; missing head authority is `VALIDATION_SCOPE_DRIFT`.
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

- Added a forced four-test Prisma/PostgreSQL lane for Pack C. The lane creates acknowledged two-cell Runs from the existing typed Pack A fixture/admission/materialization path, seeds test-only real-provider terminal Attempts, and proves the three scientific families' unique, exact-scope FK and closed CHECK fences.
- At the Pack C checkpoint, before M7 landed, the Pack B schema intentionally remained simulation-only. The relational fixture therefore widened only the two Attempt mode/provenance CHECKs inside the nonce-bound disposable database; no schema or migration source changed at that checkpoint. M7 later superseded the effective-schema state with exact simulation/fake and real-provider tuples. All Pack C scientific CHECKs remained unmodified and were exercised directly.
- Passed validation commits report/Candidate/`EvidenceCandidateQualified` outbox in the production Prisma transaction. A disposable PostgreSQL trigger injects an outbox error and proves report/Candidate/outbox rollback. Failed and test-port-injected validator-support-drift outcomes go through the service and persist report only.
- The same real-Prisma composition proves generic create/upsert for the three legacy kinds and `collectJob` return `LEGACY_SCIENTIFIC_WRITER_CLOSED` before writes. The shared disposable identity helper now recognizes the dedicated `packc` nonce/marker namespace.
- Added `.ai/scripts/experiment-foundation-packc-ef-gate.mjs` with the frozen `packc-ef-<date>-r<N>` id, PC01-PC07 + PC19-EF registry, static writer/request census, digest-pinned disposable container, forced zero-skip relational suite, exact summary/evidence/zero/redaction keysets and canonical SHA-256. Docker/PostgreSQL absence maps to exit 2 and `blocked`.
- Sandbox run `packc-ef-20260720-r1` passed PC01-PC05 and PC19-EF, blocked PC06/PC07, and published SHA-256 `sha256:efa5c836e7942c8eb0df1f352619feebe1c1d1fcadb9a1840f9a6ae4636a7750`. Host PostgreSQL closure remains explicitly pending.

## 2026-07-20 — Pack C C-PI step 3 PI Evidence Trust Gateway

- Added a dedicated PI evidence repository port with independent in-memory and Prisma implementations. Exact admitted branch/revision authority is read before EF resolution and fenced again inside `commitEvidenceIngestion`; the Prisma transaction owns the PI receipt, REU, trace and projection outbox as one unit.
- Added the sole event-triggered writer service. The service accepts only the EF `EvidenceCandidateQualified@v1` envelope, verifies its shared canonical payload hash and exact PI scope, then reads the EF-owned validation port without writing EF tables. Candidate/report canonical hashes, exact Run/manifest/protocol bindings and `status === 'passed'` are mandatory.
- REU and trace ids/hashes are deterministic and server-derived. The trace is exactly Candidate → validation report → Run → WorkOrder revision → EvaluationProtocol revision, ordinals 1..5. The identity-only ingest request is used only by `getIngestedEvidence`; the request cannot trigger writes or carry final authority fields.
- Replays return the stored receipt/evidence without EF re-resolution. A second event for the same Candidate records its own processed receipt but reuses the Candidate-unique REU/trace/outbox. Changed event/envelope content is a terminal conflict; scope and eligibility/provenance mismatches produce rejected receipts with zero evidence writes.
- Added local `RunEvidenceUnitRegistered` v1 as a PI projection-feed outbox event with shared payload/envelope hashing. The event extends the frozen Pack A registry and remains uncomposed pending Claude's review addendum; no shared contract or `app.ts` composition changed.
- Durable implementation report: `artifacts/pack-c-preplanning-20260718/report.md`.

## 2026-07-20 — Pack C C-PI D-18 readiness/watermark evaluator

- Added one PI-owned read-only port with independent in-memory and Prisma adapters. The port reads the live product Cycle, every PI branch with a current admitted revision, exact PI head revision/Run projections, EF v2 Run cells/Attempts/ExperimentResult refs plus the durable EF head acknowledgement, Cycle-wide active real-provider Attempts, current-scope REUs and the unique v2 closure row. No legacy EF execution repository or writer-oriented gateway/scientific service was used.
- A branch becomes an effective head only when the PI head revision equals the current admitted revision and the EF Run exact branch/revision/hash/sequence/manifest plus `BranchHeadAdvanced` acknowledgement all match. Otherwise the branch stays visible with null head, empty cells/evidence and `BRANCH_HEAD_NOT_FROZEN`. Non-head Runs are excluded from membership but remain included in the independent active-real fence.
- The evaluator code-point-orders branches, cells, Attempts and REU refs; emits only `SCIENTIFIC_EXECUTION_NOT_STARTED` or null for cell eligibility; hashes the timestamp-free watermark through `serverHashPaperImplementationV2ClosureWatermark`; and derives blocked/ready-no-evidence/ready-with-evidence without persistence or caller-authored readiness state.
- `PaperImplementationValidationCycle` has no integer state/version counter, and its timestamp cannot safely populate the closure table's PostgreSQL `Int`. The additive v2 CAS generation is therefore deterministically `0` while the unique closure row is absent; closure existence is terminal/blocked. The next closure service must re-read lifecycle, closure absence, exact branch/revision/head membership and the Cycle-wide active-real fence inside its write transaction.
- The v1 watermark requires at least one branch and has no zero-branch blocker code. A Cycle with no admitted branch therefore throws typed `VALIDATION_CYCLE_HAS_NO_ADMITTED_BRANCHES` and produces no invalid watermark. No schema, migration, env, `app.ts`, gateway/scientific-validation service or T-124 completion code changed.

## 2026-07-21 — Pack C C-PI step 5 closure and write seals

- Added a dedicated default-off v2 Cycle-closure route/service and closure unit-of-work repository. The existing readiness evaluator runs unchanged over the closure transaction adapter; blocker, existing-closure, expected-version and expected-watermark fences precede one atomic closure plus `ValidationCycleClosed@v1` outbox append.
- The control-only path requires zero eligible REUs and null proposal/correction authority, then persists null scientific disposition and selected exit. The scientific kind remains deliberately disabled with the dedicated closure-disabled reason; proposal handling is deferred intact.
- Added a one-method PI closure lookup port and injected the port into PI admission/head plus EF materialization/Pack B execution. A closed Cycle returns `CYCLE_ALREADY_CLOSED` before writer/dispatch entry. EF has read-only PI closure visibility and no cross-domain write surface.
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
- Closed the direct packet POST service and runtime Domain Gate packet materializer with `RESULT_INTERPRETATION_PACKET_MATERIALIZATION_CLOSED`. Result-analysis artifacts may still carry proposal-era analysis content, but no pre-closure path persists a packet. A later increment must add the one-way materializer consuming `ValidationCycleClosed`; the cutover increment deliberately adds no partial replacement.
- Replaced the T-124 assertions for trusted failed/negative/cancelled REUs, runtime/direct packet creation and project-wide S3 accounting with gateway-only, zero-writer, explicit-closure and open/tampered/wrong-project fail-closed coverage. The legacy `/complete` route/service and optional closure-lookup injection default remain untouched for increment 2, as scoped.
- No Prisma schema/migration, env-contract, capability flag, v2 gateway/closure/evaluator service or persisted legacy row was changed. Detailed census disposition and verification evidence are in `artifacts/pack-c-preplanning-20260718/report.md`.

## 2026-07-21 — Pack C C-cutover increment 2 D-17 caller-conclusion authority

- Permanently closed `PaperImplementationValidationCyclePlanningService.completeValidationCycle` at service entry with status 409, `GATE_CONSTRAINT_FAILED`, and reason `LEGACY_SCIENTIFIC_WRITER_CLOSED`; the message directs callers to the v2 closure lane. The legacy route/controller remain as a stable rejected entrance, while existing completed-cycle get/list and stored `cycle_assessment`/`decision_exit`/`outputs` shapes remain readable and historical rows are untouched.
- Removed caller conclusion authority from write contracts: draft/admission no longer accept `decision_exit`, and completion no longer accepts lifecycle/execution statuses, `outputs`, or `cycle_assessment`. New drafts initialize `decision_exit` to null and admission does not rewrite historical stored values.
- Added product Cycle synchronization to the existing v2 closure transaction. After exact stored-closure replay checks and readiness/CAS validation, the repository performs an optimistic update from `admitted | running | interpreting` to product `cycleStatus=completed`, `executionStatus=completed`, and a shared `completedAt/updatedAt`, then commits the immutable closure/outbox. Terminal product rows map to `CYCLE_ALREADY_CLOSED`; concurrent nonterminal drift maps to the existing closure conflict path.
- The closure row and product Cycle row are now a dual fact committed or rolled back together. Exact replay still resolves and returns the stored v2 closure before attempting the product-row transition, so idempotent replay remains stable; a terminal product row without a stored closure is rejected as `CYCLE_ALREADY_CLOSED` and is not repaired implicitly.
- Deleted all four `NEVER_CLOSED_CYCLE_LOOKUP` defaults. PI admission/head and EF materialization/execution require the lookup constructor dependency. Production `app.ts` retains four real injections; the three checked-in runners now inject real Prisma lookups; tests supply explicit open/closed fakes.
- Replaced the obsolete repeated-low-information legacy-completion assertion and its T-101 anchor with stable closure plus preserved historical read coverage. Added product-row success/replay/rollback/terminal tests and write-schema negative-space coverage. No Prisma schema/migration, env-contract, capability flag, or EF legacy service outside the required seal dependency changed.
- Detailed inventory, verification and risks: `artifacts/pack-c-preplanning-20260718/report.md`.

## 2026-07-22 — Pack C C-cutover increment 3 and final convergence gates

- Added `packc-cutover-<date>-r<N>` with exact PC17/PC18 registry, five zero-skip targeted suite groups, canonical self-excluding SHA-256 and a frozen static census: two closed pre-closure Packet entrances, one `ValidationCycleClosed@v1` producer, declared closed-snapshot-only dossier readiness, v2-only REU construction, closed legacy completion, caller-conclusion write-contract negative space and 70/70 required closure-lookup constructors. The gate documents why no third PostgreSQL lane is opened.
- Added `packc-final-<date>-r<N>` as the convergence authority. The final gate derives fresh EF/PI/cutover ids from the final id, executes the three child processes under the hermetic environment policy, verifies their summary identities/exits/canonical SHAs, maps PC01-PC20 to owning child checks, requires both PC19 halves and runs the backend full suite once with exact conditional-skip totals.
- The first final attempt exposed that the older C-EF static census still expected the pre-C-PI three-kind closure set. The product had correctly added `paper_experiment_sidecar`; only the EF gate/meta allowlist was stale. The allowlist now freezes all four already-closed kinds, with no product-code change.
- Standalone `packc-cutover-20260722-r1` passed PC17/PC18 with 131/131 and SHA `sha256:2a1c6eebe062e6ddeb0b96602bb7d705f07b87768d7360588d6cb96d3fd3ac8d`. Corrected final run `packc-final-20260722-r3` returned exit 2 / `blocked`: EF 69/69 and PI 122/122 non-relational evidence passed but each relational lane blocked on unavailable Docker; cutover passed 131/131; all three child SHAs verified; final SHA `sha256:da3d482995fad2d4dbdbde3bebb3c0718cf878be03dd484724c141c480f18fde`.
- Final r3's backend population was 2,340 total, 2,269 passed, 14 failed and 57 conditional skips. The final PC view preserved 11 passed checks and the exact 9 relationally blocked checks (PC06/07/09-13/15/16). Claude's host run must use a fresh final id and may close Pack C only after all three children and the backend suite pass.
- Durable skeleton and implementation report: `artifacts/implementation/08-pack-c-cutover-technical-closure.md` and `artifacts/pack-c-preplanning-20260718/11-qr1-wiring-report.md`.

## 2026-07-22 — Pack C quality remediation QR-1

- Promoted `EvidenceCandidateQualified`, `RunEvidenceUnitRegistered`, and `ValidationCycleClosed@v1` into the strict shared experiment-v2 integration-event union using the existing scientific-validation/evidence payload contracts. The six-event union now has closed envelope schemas and canonical payload/envelope hash coverage.
- Extended both domains' Prisma and in-memory spine outbox decoders so valid Pack C rows reconstruct typed events and retain the existing replay/hash-conflict behavior instead of being terminalized as unknown payloads.
- Routed qualified candidates to the real PI Evidence Trust Gateway. Added the `pi-projection-feed-v2` durable pending-consumer boundary for REU-registration and Cycle-closure events; exact redelivery converges on one processed inbox receipt and performs zero domain/projection writes.
- Composed the scientific-validation repository/service, evidence repository/gateway, readiness repository/service, projection-feed consumer, and all relay ports in `buildApp`. Scientific validation is strict/default-off via `EXPERIMENT_FOUNDATION_V2_SCIENTIFIC_VALIDATION_ENABLED`; the public-resource integration pass registered that key in `env/contract.yaml` and regenerated every non-secret env artifact.
- Kept the three Pack C relay consumer ports explicit in product `buildApp`, while making them optional for the bounded D-19/Pack A/Pack B runners that cannot produce Pack C events. If such a runner nevertheless claims a Pack C event, the relay releases the event into retry state with `INTEGRATION_RELAY_CONSUMER_NOT_CONFIGURED`; the relay never marks the row delivered or terminal and never installs a no-op consumer.
- Added the ungated pure-read readiness endpoint at `GET /paper-implementation/validation-cycles/:validation_cycle_id/closure/v2/readiness`, with strict shared success serialization and typed 404/422 failure mapping.
- No Prisma schema/migration, closure authority rule, proposal-selection rule, or ordering fence changed. QR-2/QR-3 retain those scopes. Full file inventory and event-wiring evidence are in `artifacts/pack-c-preplanning-20260718/11-qr1-wiring-report.md`.

## 2026-07-23 — live cloud-preflight closure and M7 readiness

- Closed the `public_resource` read-only preflight with run `cloud-preflight-public-resource-readonly-20260723-r6`: CP01-CP12 passed, 13 official-SDK reads succeeded, 108 CPU specifications were visible and 105 available, 88 protected database tables were unchanged, and provider/CreateJob/database/scientific writes were all zero. Durable reviewable evidence is `artifacts/implementation/10-cloud-preflight-live-closure.md`; the full temporary summary remains outside the committed artifact population under `.ai/.tmp` and is pinned by SHA-256.
- Corrected EF-P16 and roadmap status from the obsolete r9 `blocked` conclusion to `verified` for the bounded read-only preflight only. The update explicitly leaves real provider execution and scientific evidence unverified.
- The pre-implementation M7 readiness census found the existing RunRecipe `materialize-only`, TrainingTaskSpec output keys simulation-only, shared execution contracts fake-only, Prisma CHECKs rejecting `real_provider`, the worker validating only deterministic fake responses, and product composition always constructing the fake transport. Consequently the existing immutable Run could not be reused for real execution; the later M7 implementation added a new executable lineage without mutating the historical Run.
- Froze D-23: a new branch-local PI WorkOrder revision must bind one exact typed `ExecutionBundleV2` and create a new executable Run through T1-T4. Existing six Pack B provider-control families are extended with exact discriminated real variants rather than duplicated. Accepted-response loss must reconcile by deterministic provider tag/detail and never blind-retry `CreateJob` while ambiguous.
- Recorded the cross-task ownership handoff: T-132 uniquely implements M7; T-106 consumes the final redacted acceptance evidence and does not create another provider authority. The detailed phased plan, blockers, rollback and M7-01..M7-15 matrix are in `artifacts/implementation/11-m7-real-provider-readiness-review.md`.
- No `CreateJob`, provider/OSS mutation, database migration/apply, capability enable or product code change occurred during the documentation/readiness update.
- 2026-07-23 M7-I0..I3 default-off implementation:
  - Added shared contracts and canonical hash profiles for ExecutionBundle, executable WorkOrder/RunRecipe/TaskSpec v2, Aliyun real payload/redacted manifest, real external ref, normalized outcomes and public real-intake response.
  - Added typed ExecutionBundle Prisma repository/service plus CAS/freeze/exact-readiness behavior; additive/generalizing migration remains unapplied to existing environments.
  - Extended T2 materialization so a new executable WorkOrder produces one batch Run and two real-provider TaskSpecs while preserving the existing T1-T4 head/ack chain.
  - Generalized the existing six Pack B tables to exact simulation/fake and real-provider tuples. Claim filters isolate the two workers; the simulation path retains its typed fake external-ref metadata.
  - Added real payload materializer, atomic two-cell intake, product POST route/controller, injected official-SDK transport and durable real-provider command worker. App startup rejects enabled intake/drain when their exact injected dependencies are missing and never creates a live SDK client.
  - Added bounded accepted-response-loss recovery, closed status mapping, timeout cleanup verification and exact result-envelope collection. Collected rows remain diagnostic-only and do not create ExperimentResult/EvidenceCandidate/REU.
  - Added the M7 I3 gate, its meta tests, executable T1-T4 test, ExecutionBundle real-Postgres test, exact real tuple real-Postgres test, capability-off/continued-drain tests and route tests.
  - Final run `t132-m7-offline-20260723-v1` passed M7-01..M7-15 after the T-106 evidence import: shared 10/10, backend 88/88 and forced disposable PostgreSQL 9/9 with zero skip. Summary SHA-256 is `7bccf0b8bedd041f65374ce0e6ccff3cc26be662a008c1ff6951a57f71743679`; all live-provider/OSS/cost/named-database/scientific/evidence/legacy censuses remained zero and container cleanup succeeded.
  - First gate pass exposed and resolved two test-only database mismatches: JSONB null versus SQL NULL for an absent external ref, and a stale expected CHECK name after the exact-tuple migration. The corrected run passed all shared/backend/relational lanes before the intentionally ordered T-106 import step.
  - No existing/named database migration apply, capability enable, provider/OSS call, cloud resource, scientific result/evidence write or legacy write occurred.

## 2026-07-24 — D-24: M5 narrowed to an agent-first workflow slice

- Context: primary product interaction is LLM/agent-mediated rather than form-driven, and a whole-product UI redesign is planned. Building the Phase 5 Electron product journey now would be discarded by that redesign, while the non-UI substrate of Phase 5 is exactly what an agent (and any future UI) calls.
- Froze D-24 with four clauses:
  1. **M5 keeps the interface-independent substrate**: the project-scoped lineage read model and deterministic queries (Project → Cycle → WorkOrder branch/revision → head Run, non-head history behind exact lineage queries), the typed action surface with server-derived identities (no manual ref/hash/JSON anywhere in the primary flow), automatic terminal sync/collect, Cycle-ready detection, Result Analysis proposal and post-closure next-step/claim/dossier preparation, and blockers/approvals/retry/recovery exposed as typed, audited API actions. The four fixed human gates keep their owning-resource semantics at the API level.
  2. **The UI product-journey layer is deferred out of T-132**: navigation, typed forms, owning-screen presentation, provenance views, rendering-vocabulary surfaces and the DOM/Electron test lane move to a future task created together with the UI redesign. Existing desktop read-only asset/result views stay frozen as-is (the Phase 5 rollback posture becomes the standing posture).
  3. **The semantic retrieval projection is deferred with the UI layer**: structured lineage queries remain the sole retrieval authority, which the roadmap already required as the fallback truth; no semantic document/embedding work lands in T-132.
  4. **M6 gates are reworded, not weakened**: "UI usage-fit" becomes workflow usage-fit over the actual interaction surface (agent/API golden flow), and the release E2E honesty bar for the deferred flows is real HTTP/service/repository evidence plus real-database and simulator-fault evidence instead of DOM click-through; existing desktop read-only views keep only their current tests. The golden control-plane scenario itself was always headless and is unaffected.
- Explicitly unchanged: all capability defaults, the M7-L1/L2 authorization boundaries, the D-18 closure authority, and the rule that Phase 5 queries must be server-scoped before any client consumes them.

## 2026-07-24 — M5-A1 project-scoped experiment lineage read model

- Added one shared response-only contract family for the three OD-M5-1 GETs. Cycle summaries expose target/closure/accounting without recomputing readiness; Cycle detail exposes admitted revision, exact effective head/cells/Attempts/collections or `BRANCH_HEAD_NOT_FROZEN`; branch history exposes every immutable revision, admission metadata, exact Run refs, cell counts, and current/head flags.
- Added one read-only repository port with constructor-seeded in-memory and Prisma adapters. Cross-domain EF Run reads use exact PI branch/revision/hash/sequence joins under a project predicate; the effective-head query additionally counts exact processed EF acknowledgements. There are no repository/service mutation calls.
- Added a deterministic zero-write service, thin controller, strict path schemas/error envelopes, three exact routes, and app composition that selects Prisma only when both PI and EF repository strategies are Prisma; otherwise the composition registers the empty in-memory adapter.
- Added shared schema, service unit, Fastify inject, and guarded disposable-PostgreSQL tests. The relational lane seeds two projects through the production PI admission → EF materialization → PI head → EF acknowledgement chain, creates two revisions/Runs per project, and checks all three read families for isolation plus superseded-history completeness.
- No Prisma schema/migration, readiness/closure contract, existing route file, capability, gate script, or write behavior changed.

## 2026-07-24 — M5-A3 closure preparation and available actions

- Added shared `paper-implementation-closure-preparation-v2-contracts` for the preparation response and available-actions response. The prepared request carries the exact no-evidence closure POST body with a null `idempotency_key` template and an explicit required/business-idempotency marker; the request contains no caller-authority fields.
- Added one HTTP-free derived service, thin controller, strict GET routes, and app composition. The service injects the existing readiness evaluator and one shared A1 lineage-service instance. No repository or persistence type was added.
- Extended the A1 service with an internal action-context method so cell-to-Attempt association remains available for succeeded-cell and nonterminal-attempt decisions. The public A1 response and repository query implementation remain unchanged.
- Deterministic action ordering is admission, simulation starts, real-provider starts, cancels, reconciles, then closure. Existing gated write entrances (admission, both start lanes, and closure) are marked capability-gated without env probing; cancel/reconcile controls remain ungated. Reconcile is emitted only for `submitted`/`running`, matching the existing POST; `prepared` remains cancel-only.
- Changed only the closure request boundary field `validation_cycle_id` to optional. Route pre-validation preserves exact-match rejection when present, and the controller injects the path id before the existing closure service runs.
- Added schema tests, derived-service tests with the in-memory A1 repository and stub readiness, route integration tests for both GETs, and omitted/mismatched closure body-id regression coverage. No gate script, Prisma schema/migration, capability, provider, scientific, or durable state changed.

## 2026-07-25 — M6-R1 LIT-0204 source-import slice started

- Scope is OD-M6-1/M6-R1 only: deterministic mapping from the immutable T-131 LIT-0204 definition document into a new typed v2 EvaluationProtocol identity, create→freeze through the existing v2 service, source-binding digest, evidence-only rule census, guarded disposable-PostgreSQL CLI, and same-lane D-17 negatives.
- The existing D-19 fixture creator/importer, v2 service, Prisma schema, routes and release gates remain read-only. The new path receives exact Benchmark/MetricDefinition refs as dependencies; the mapper does not invent canonical refs or rewrite the existing `ragperf-adapter-tier-v2` product protocol.
- Real v2 failure codes selected from the current service implementation: free-shape/missing typed `required_rules` is rejected by `createAssetDraft` as `V2_TYPED_SNAPSHOT_INVALID`; a typed nonexistent exact metric revision is rejected by `freezeAssetDraft` as `EXACT_REVISION_NOT_FOUND`.
- Local verification target: shared/backend typechecks plus mapper/census unit tests. The guarded real-PostgreSQL test remains host-verified-later unless the exact `EXPERIMENT_FOUNDATION_LIT0204_IMPORT_RELATIONAL_PRISMA=1` + D-19 disposable identity/marker protocol is supplied.

## 2026-07-25 — M6-R1 implementation/local handoff

- Added `experiment-foundation-lit0204-protocol-import-service.ts`: strict typed source parser, pure 17-metric + one-artifact v2 mapper, exact-ref dependency validation, create→freeze importer with source binding, and evidence-only rule census. The copied test fixture is byte-identical to the immutable T-131 source at SHA-256 `b15956e530e1aba392e4d5dea8874a1b9bd947f63c69209b3dbda0a14233365f`.
- Added `import-lit0204-ragperf-protocol-v2.ts`. The command accepts only an explicit `--definition` path, requires the complete randomized D-19 disposable identity variables, checks the live database COMMENT marker, resolves the D-19 Benchmark/17 MetricDefinition/product-protocol exact revisions, and prints source binding plus the product rule census. The script is included in the experiment-foundation script typecheck.
- Added mapper/determinism/typed-unknown tests, rule-equivalence/cardinality tests, and one guarded real-Prisma test. The relational case imports through the production repository/service and asserts the server content hash, then proves `V2_TYPED_SNAPSHOT_INVALID` at free-shape draft creation and `EXACT_REVISION_NOT_FOUND` at unresolved-ref freeze.
- No D-19 fixture/importer, v2 service, Prisma schema/migration, route, gate, capability, named-local row, or original T-131 artifact changed. All local executable checks pass; PostgreSQL execution remains intentionally pending because the required disposable host identity was not supplied.
- Next actions: (1) provision/mark a D-19 disposable PostgreSQL database and run the guarded relational file with skip=0; (2) on that same disposable lane, run the CLI with the original definition’s explicit path and capture its JSON source binding/census; (3) write the captured acceptance into T-131 consumption evidence before M6 release convergence.

## 2026-07-26 — Progress-ledger and Git-handoff reconciliation

- Re-read the task SoT, roadmap, audit matrix, M5/M6/M7 durable summaries and current Git topology after M6 closure. Corrected the stale `00-overview.md` next step: the disposable LIT-0204 lane and T-131 consumption were completed by `t132-m6-release-20260725-v5`; the active frontier is M7-L1 preparation/authorization.
- Reconciled the audit matrix against Pack C final/QR, M5-A and M6 evidence. The current finding census is 23 verified, 4 open and 1 cut. The retained opens are EF-P06, EF-P14, EF-P15 and EF-P21; none blocks M7-L1, but each needs implementation evidence or transfer to a named follow-up task before T-132 archival.
- Recorded D-24 consistently: the agent/API first-release interaction layer is verified; DOM/Electron UI and semantic retrieval implementation are not silently credited and remain outside T-132. EF-P21 therefore stays open for its semantic half.
- Recorded the non-destructive Git integration posture. `origin/main` is an ancestor of local `main`; local `main` was clean before the documentation update and is 41 commits ahead, touching 264 files with 40 T-132 subjects plus one intervening literature fix. The recommended safety boundary is a remote `codex/t132-productization-closure` branch and review/PR, not history rewriting or a direct force update of `origin/main`.
- No product code, schema, migration, capability, cloud resource, credential, provider call or scientific authority changed. `02-architecture.md` and `05-pitfalls.md` require no update because the reconciliation changes reporting/governance only and discovered no new architecture decision or resolved failure.

## 2026-07-26 — M7-L1 RAM custom-policy creation and runtime v2 tightening

- Created and console-verified `pea-m7-canary-controller` as custom-policy v1 from `workloads/ragperf-canary/ram/controller-policy.json`; the repository SHA-256 remains `ddde63f223f8d1982da124414ff8224aa7a431f56b51af834030b4fb681f4d8c`.
- Created `pea-m7-canary-runtime` as custom-policy v1, then tightened the policy before role attachment. Runtime v2 separates Bucket-scoped `oss:ListObjects`, object-scoped `oss:GetObject`, and object-scoped `oss:PutObject`; the list statement is conditioned to `input` / `input/*`. Explicit `paidlc:*` and `oss:DeleteObject` denies remain.
- The final runtime repository SHA-256 is `1eb7de00aceacc14817b058291eb4f2e85cdbb4c10ea467c91084a75094b1a4b`. RAM console syntax validation reported 0 errors, 0 security warnings, 0 warnings and 0 suggestions before v2 activation.
- Created controller role `pea-m7-canary-controller` (role ID `300042892692129613`, ARN `acs:ram::1183869713036194:role/pea-m7-canary-controller`) with trust restricted to exact owner RAM user `acs:ram::1183869713036194:user/user_0002`; attached only custom policy `pea-m7-canary-controller`.
- Created runtime role `pea-m7-canary-runtime` (role ID `300525928077898732`, ARN `acs:ram::1183869713036194:role/pea-m7-canary-runtime`) with service trust restricted to PAI principal `pai.aliyuncs.com`; attached only custom policy `pea-m7-canary-runtime`.
- Console role detail verification found one matching custom policy on each role and no controller/runtime cross-attachment. No credential, STS session, provider operation, OSS object mutation, capability enable, `CreateJob` or billable execution occurred. Step B is complete; the former ACR step C was subsequently replaced by the official-image + OSS route recorded in the M7-L1 compatibility review.

## 2026-07-28 — M7-L1 live-window zero-write preflight found missing executable lineage

- The owner supplied a short-lived controller STS through `/tmp/t132-controller-sts.env`; the file was owner-only mode `0600`, contained the four required variables and was not printed, copied into the repository or persisted as evidence. The owner separately authorized `M7-L1 authorized: 2026-07-28, ceiling ¥50, 2 jobs`.
- Before capability enable or provider submission, a read-only Prisma census checked the branch, all PI WorkOrder revisions and all EF Runs. The branch has only revision sequence 1, `work_order_schema_version=v1`, and the sole Run `ef_run_v2_c4ab7919-2d7b-415c-ab53-201b11464aca` points to RunRecipe v1 with `executionBundleRevisionId=null` and `executionBundleRevisionHash=null`.
- The identified lineage is the historical simulation lineage, not the D-23 successor executable lineage. Dispatching the historical Run would violate the frozen rule that the old Run cannot be trust-upgraded. The live operation therefore stopped before any `CreateJob`, capability change, provider compute or database write.
- Normal successor T1-T4 materialization is bounded to at most 40 new rows: T1 adds one revision, two cells, one admission and one PI outbox; T2 adds one EF inbox, one VersionLock, 23 dependency rows, one RunRecipe, two TaskSpecs, one Run, two RunCells and one EF outbox; T3 adds one PI inbox and one PI outbox; T4 adds one EF inbox. T1/T3 also CAS-update the existing branch. The successor AuthorityAction requires separate named-local authorization before the existing paid window can be used.

## 2026-07-28 — authorized same-branch apply rejected by closed-Cycle preflight

- The owner authorized the bounded 40-row successor WorkOrder/T1-T4 apply. Before constructing the writer, a second read-only census resolved the exact branch to `validation_cycle_t132_packa_product_p313_v1`.
- That product Cycle is `cycleStatus=completed`, `executionStatus=completed`, `completedAt=2026-07-25T01:21:34.163Z`. Its immutable v2 closure is `control_flow_validated_no_paper_evidence` with snapshot hash `sha256:cba742d8e7571ebd6b6de651738ede5f96429dd52ebaec6d704c8c90ed521654`.
- PI admission and T2 materialization intentionally reject a first delivery after Cycle closure. The authorized operation therefore remained unexecuted with database writes 0. Reopening the Cycle, deleting the closure, bypassing the service fence or changing the old branch would violate D-18/D-23.
- The minimum legal replacement is one new P313 ValidationCycle input snapshot + Cycle row, one exact complete trace manifest, admission update, then one new Cycle-local branch and T1-T4. The bounded census is 3 Cycle/trace rows plus 41 new branch/T1-T4 rows = at most 44 new rows; the old Cycle/closure/branch/Run remain protected and unchanged.
## 2026-07-28 — M7-L1 live runner and resource-exact preflight

- Added `run-experiment-foundation-m7-l1-live-window.ts` with `offline-preflight` and `execute` modes. Execute requires the exact recorded two-job/¥50 token, STS-only credentials with ≥55 minutes remaining, exact controller role/policy attestations, fresh `GetImage`, named-local target fingerprint, exact Bundle/Run lineage, two-call SDK fencing, terminal collection and zero protected/scientific writes.
- Added `ExperimentFoundationAliyunOssExactResultReaderV2` over the official Node.js OSS SDK. The reader reads only the exact `output/<run>/<cell>/result.json`, uses a bounded Range request and rejects cross-bucket/region, traversal, oversize and invalid UTF-8 results.
- Hardened Aliyun recovery with exhaustive bounded pagination and full observable job-detail comparison. Added a deterministic `ef-request-binding` tag over the authoritative CreateJob request so timeout, mount access and other non-echoed fields remain recovery-bound.
- Corrected public-resource payloads to use exact `EcsSpec`; quota mode alone uses `ResourceConfig`. Added optional WorkOrder v2 `resource_snapshot` so the next immutable revision can materialize an exact TaskSpec without rewriting prior v2 rows.
- The first offline runner execution correctly failed: current Run `ef_run_v2_t132_m7_l1_p313_v1_1` contains `1 CPU / 512 MiB`; the approved profile is exact `ecs.g6.large = 2 CPU / 8192 MiB`. Cloud calls, DB writes and live Attempts remained zero.
- Controller policy adds only `paiimage:GetImage`; its new repository digest is `c014cac58a794f2bc4849c0c05993ee85fc660dcb6d3206438b08bf7d5c219be`. Console activation remains owner-confirmed work.

## 2026-07-29 — no-cloud SDK boundary and provider-console differential instrumentation

- Gate 1 was explicitly approved with `approve instrumentation`. Added removable run `dbg-20260729-012924-sdk-boundary`; all new code uses matching `DEBUG-MODE` markers and `[DBG:...]` output.
- Added a real PAI-DLC SDK boundary probe that replaces `callApi` before network, then records only protocol/path/body-shape booleans, byte counts and equality. The probe does not record credentials, headers, endpoint, payload values, URI, command, account or role ARN.
- The probe proves the generated `CreateJob` request body is byte-identical to the model map before OpenAPI core performs its direct `JSON.stringify`; local SDK/ROA transformation is not the source of an injected or malformed `src`.
- Read-only inspection of PAI console DLC `1.90.2` found its new-create direct OSS serializer emits `MountPath`, `Uri`, `MountAccess` and optional `Options`, matching the sequence-5 mount shape. Its custom credential-role serializer emits `RoleArn` and `RoleType` but omits optional `AssumeRoleFor`.
- Added a whitelist-only role differential observation to sequence-5 `offline-preflight`. Exact rematerialization of both immutable payloads reported one role with `AssumeRoleFor/RoleArn/RoleType`, so `AssumeRoleFor` is the next single compatibility candidate. The observation is strong differential evidence but not yet a provider-verified causal result.
- No production behavior, contract, payload row, Attempt, ProviderCommand, capability, credential, cloud resource or scientific/evidence state changed. The expired sequence-5 command leases remain untouched.

## 2026-07-29 — Gate-2 custom-role console-parity fix and debug cleanup

- The owner approved the bounded fix with `approve fix`. New real-provider materialization now emits a credential role containing only exact `RoleArn` and `RoleType`; optional `AssumeRoleFor` is no longer generated.
- The shared request type and closed JSON Schema remove `AssumeRoleFor`. A negative schema test rejects any reintroduction, and the materializer test proves the official-SDK request map omits the field.
- Recovery comparison remains exact for `RoleArn`, `RoleType`, credential mode and role type. The transport deliberately ignores a provider-side `AssumeRoleFor` echo because the submitted request no longer owns that optional value; exact `RoleArn` continues to bind the account and runtime role.
- The change modifies canonical request bytes and hashes only for future materializations. No existing sequence-5 payload, Attempt, command, Run or branch was rematerialized or updated.
- After deterministic offline verification, all temporary instrumentation for `dbg-20260728-151457-a9c4`, `dbg-20260729-071348-src-shape` and `dbg-20260729-012924-sdk-boundary` was removed. Product source contains no `DEBUG-MODE` marker or `[DBG:]` log.
- Provider causality is intentionally not claimed. A future sequence-6 successor and paid `CreateJob` window require independent named-local and cloud authorizations.

## 2026-07-29 — sequence-6 custom-role-shape successor preparation

- Project orchestration reused T-132 under `M-001 > F-001 > R-012`; no new task or productization scope was created.
- A PostgreSQL `READ ONLY` transaction verified database `postgres`, schema `my_researcher_dev`, admitted/not-started Cycle `validation_cycle_t132_m7_l1_p313_v1`, zero Cycle closure, and branch `ragperf-primary` at exact state/head `10/5`.
- The branch contains exact revision sequences 1-5. Sequence 5 is current/head with Run `ef_run_v2_t132_m7_l1_options_fix_successor_v5_1`; its provider payload/Attempt/command census remains 2/2/2 and ExperimentResult/EvidenceCandidate/REU remains 0/0/0.
- The prospective sequence-6 revision, Run and deterministic ID scope were all empty. The new immutable title/objective truthfully express bounded verification of console-parity `RoleArn + RoleType` with optional `AssumeRoleFor` omitted; two cells, frozen Bundle, 2 CPU / 8192 MiB, one attempt and 1800-second timeout remain unchanged.
- Added one fail-closed successor scope with exact parent sequence 5, expected branch state/head `10/5`, revision sequence 6, max-40 T1-T4 census, exact replay and protected-history checks. The scope cannot run unless its exact named-local token is the sole configured successor authorization.
- Lineage apply does not create ProviderPayload or determine provider payload hashes. T1-T4 authoritatively create the new WorkOrder/Run hashes; payload materialization remains a later separately authorized execution step.

## 2026-07-29 — authorized sequence-6 named-local landing

- The owner authorized the exact max-40 custom-role-shape successor apply on the verified local PostgreSQL target, excluding cloud access, capability changes, PAI Jobs and scientific/evidence writes.
- The runner matched Cycle `validation_cycle_t132_m7_l1_p313_v1`, branch `ragperf-primary`, parent sequence 5 and branch state/head `10/5`. Normal T1-T4 created the exact sequence-6 revision, two cells, one admission and the complete EF lineage.
- The 13 counted write categories total exactly 40 rows: revision 1, cells 2, admission 1, PI outbox/inbox 2/1, EF inbox 2, VersionLock/dependencies 1/23, RunRecipe 1, TaskSpecs 2, Run 1, RunCells 2 and EF outbox 1.
- Branch state/head advanced to `12/6`. WorkOrder content hash is `sha256:071b24c460d95501efa58cd27ca905c3e15d10b4af6ce0a9096abc970bf0722a`; Run manifest hash is `sha256:3fe438fa92d0c92dfcb099c560680a5cba86fec3ec65f9c3f172fbfc232022e5`.
- An independent second runner invocation exercised the complete-prefix replay path. A final read-only census remained exactly 40 rows, proving replay added zero rows.
- The terminal integration retained only the Node loader warning rather than the runner JSON summary, so authoritative final evidence came from the runner's completed invariant checks plus independent read-only PostgreSQL censuses.
- Sequence-5 Attempts and ProviderCommands remained unchanged at 2/2 with no external refs. Sequence-6 ProviderPayload/Attempt/ExperimentResult/EvidenceCandidate/REU counts are 0/0/0/0/0.

## 2026-07-29 — sequence-6 live-runner binding and zero-cloud preflight

- Rebound the live runner from sequence 5 to Run `ef_run_v2_t132_m7_l1_role_shape_fix_successor_v6_1`, exact Run manifest `sha256:3fe438fa92d0c92dfcb099c560680a5cba86fec3ec65f9c3f172fbfc232022e5` and business key `t132-m7-l1-live-p313-v6`.
- Replaced the exhausted sequence-5 paid token value with a distinct future sequence-6 role-shape-fix token namespace. Defining the guard does not grant or consume authorization.
- Static review confirmed `offline-preflight` resolves only the named-local target, lineage, Cycle, frozen Bundle, local manifest and controller-policy file before returning. The branch does not construct a cloud SDK client, read STS, start intake or execute a provider command.
- Offline preflight passed with the exact frozen Bundle, two cells, `ecs.g6.large`, 2 CPU / 8192 MiB, 30-minute maximum, job ceiling 2 and monetary ceiling ¥50 as dormant limits only.
- A final PostgreSQL `READ ONLY` transaction confirmed branch `12/6` and sequence-6 ProviderPayload/Attempt/ProviderCommand/ExperimentResult/EvidenceCandidate/REU counts all zero.

## 2026-07-30 — PAI console serializer instrumentation incident

- Debug run `dbg-20260729-212445-d534` prepared a synthetic console form with one OSS mount, `{}` advanced options, public `ecs.g6.large` resources and the existing runtime role.
- The first CDP Fetch pattern paused all XHR/Fetch traffic. It intercepted an unrelated `HEAD /favicon.ico`; the request could not be resumed through the tab-scoped interception id and the console timed out after 30 seconds.
- The replacement interceptor matched `/api/v1/jobs` and `CreateJob` variants only. Page-level `fetch`/XHR observation then revealed that the console actually posts proxy envelopes to `/data/api.json`.
- Because the route-only guard did not cover the proxy, one unintended Job escaped: `dlc1jao16y748fu4`, display name `t132-console-serializer-probe`.
- The task list recorded create/end times `2026-07-30 05:48:57` / `05:51:18`, duration 2 minutes 21 seconds, state `已成功`, public `ecs.g6.large`, 2 CPU and 8 GiB. The displayed rate was CNY 0.0092/minute, yielding an estimated charge of CNY 0.02162.
- A stop action was issued immediately after discovery, but the Job was already terminal. No active cloud runtime remained.
- The temporary CDP patterns were cleared. The page-level wrappers restored original `fetch` and XHR methods and deleted their in-memory state. No instrumentation source file was added to the repository.
- The synthetic Job is not exact sequence 7 and is not bound to the frozen ExecutionBundle, Run, Attempt or ProviderCommand. Its success proves only that one console-generated proxy request was accepted; it does not identify the field responsible for the SDK-side `src` rejection.
- The console comparison lane is paused. No sequence-8 lineage, provider payload, database row, result or evidence object was created.

## 2026-07-30 — read-only Job closure and offline proxy-guard proof

- Chrome read-only inspection confirmed Job `dlc1jao16y748fu4` remained terminal `已成功`, with one `ecs.g6.large` Worker, 2 CPU / 8 GiB, no maximum runtime, no automatic fault tolerance and no health check.
- The exact synthetic command was `echo t132-console-serializer-probe`. The one OSS output mount was non-read-only, used advanced options `{}` and mounted at `/mnt/pea-output`; no cloud field was edited.
- Gate-1 run `dbg-20260730-055847-1139` added one temporary `.ai/.tmp/T-132/console-proxy-interceptor-offline.mjs` harness. The harness never imported project cloud/database clients and replaced global `fetch` with a throwing sentinel.
- The first run failed locally because malformed top-level string bodies were treated as ordinary leaves instead of opaque envelopes. The temporary detector was changed to mark an unparseable top-level proxy string opaque and block it before transport.
- Three fresh runs then passed. Each run blocked five nested/route/form/opaque/secret-bearing cases before transport, allowed three benign/non-proxy/read-only cases exactly once, reported `forbidden_network_calls=0`, and retained no request body or secret marker in logs.
- The temporary harness was deleted immediately after verification. No product source, browser wrapper, cloud resource, database row, capability or sequence lineage changed.
- This result closes only the local detector prerequisite. Static serializer inspection, browser installation/self-test and any console form interaction remain separate work with a new action-time authorization.

## 2026-07-30 — static DLC `1.90.2` serializer closure

- Read-only Chrome inspection found the exact loaded DLC assets: `js/index.js` and vendor chunk `js/3070.js` from `@alife/pai-console-dlc/1.90.2`.
- Public CDN GETs returned HTTP 200. `index.js` was 1,178,525 bytes with SHA-256 `ebbbbd76ec71e1395622090537cc1e3119353fd9bc917c0e75c72c078b3f06eb`; `3070.js` was 885,169 bytes with SHA-256 `5a9586605a31dd19fa1e76c094a1e1916295b80b72e35cf7dc6c500ca51273a5`. Both adjacent `.map` URLs returned 404.
- Webpack module `238021` binds the DLC `CreateJob` wrapper to `product=pai-dlc` and `action=CreateJob`, then delegates to common request module `841701`.
- Request interceptor module `659112` forces POST `/data/api.json?_fetcher=CreateJob_pai-dlc`, `application/x-www-form-urlencoded`, credentials enabled and a 30-second timeout.
- The outer form contains console security/risk tokens plus `region`, `product`, `action`; optional `params` and `content` are serialized by module `695466` as either the existing string or `JSON.stringify(value)`.
- No page form was opened or submitted. The inspection used only DOM script inventory and public static asset reads; no `/data/api.json` request, provider write, Job, STS, database write or capability change occurred.
- The next Gate-1 scope is limited to main-realm XHR guard installation and a synthetic self-test that must block before original `send`. A later form interaction remains separately authorized.

## 2026-07-30 — main-realm XHR guard synthetic verification

- Owner approved `APPROVE INSTRUMENTATION` for run `dbg-20260730-065837-de14`; the scope explicitly excluded the Job form.
- Chrome DevTools Console executed one in-memory IIFE bounded by `DEBUG-MODE` run markers. The IIFE captured the original `XMLHttpRequest.prototype.open/send`, installed exact wrappers, ran one synthetic request and restored both prototypes inside `finally`; this complete cycle repeated three times.
- All three synthetic requests used POST `/data/api.json?_fetcher=CreateJob_pai-dlc` with form fields `product`, `action`, `params`. Each matched exact fetcher and exact product/action, threw `T132_DATA_API_PROXY_WRITE_BLOCKED`, recorded `original_send_calls=0` and exposed no field values.
- Each cycle directly classified a benign `GetWorkspace` form body as unblocked without sending it. No benign or blocked self-test invoked a real transport.
- The per-cycle identity assertions reported `installed=true`, `restored=true`. Final aggregate status was `passed`, `prototype_restored=true`, `no_job_form=true`.
- An independent Console expression after the IIFE found no `wrappedOpen`/`wrappedSend` function name and `debug_state_key_count=0`. DevTools was then closed.
- No runtime wrapper or debug state remains. Repository product source, Job form, `/data/api.json`, STS, database, capability and provider state were untouched.

## 2026-07-30 — real-form abort-before-send structural capture

- Owner approved `APPROVE INSTRUMENTATION` for run `dbg-20260730-071132-e186`: one exact PAI DLC clone-form interaction, structural-only projection, fail-closed `/data/api.json` interception and zero-Job success.
- An initial browser automation evaluation failed before installation because that isolated context exposed no `XMLHttpRequest.prototype`. It produced no wrapper, submit, request or cloud effect. The same approved plan then moved to the Chrome DevTools Console, which executes in the application main realm.
- The runtime-only guard wrapped XHR `open/send` and `window.fetch`, classified exact `_fetcher` or `product/action` identity, and failed closed on every POST `/data/api.json` during the narrow armed window. A synthetic XHR/fetch self-test passed with `blocked=2`, target count 2 and original-transport counts 0, then the counters were cleared.
- The exact clone form was submitted once. The guard observed five proxy calls and blocked all five: four non-target background proxy reads and one target CreateJob. The target used XHR, matched both exact identities, had a 1,457-byte seven-key outer form, a two-byte empty-object `params` value and a 915-byte JSON `content` value.
- The safe `content` projection contained credential configuration, data sources, job specifications, scheduling/settings and command metadata. It contained no recursive `src` key. No token, ARN, URI, command value, display value or credential value was logged.
- The target threw synchronously from the wrapper before the Axios XHR path could call the original `send`. Snapshot counters were `blocked=5`, `target=1`, `origXhr=0`, `origFetch=10`; the ten allowed fetches were non-proxy form/background reads, not CreateJob transport.
- Cleanup restored the original XHR `open/send` and `fetch` references and removed the debug state. An independent check found all wrapper names absent and zero state keys; DevTools was closed and the clone form was cancelled.
- A read-only Job-list check found zero rows named `t132-console-serializer-probe_clone` and retained the one earlier incident row `t132-console-serializer-probe`. No Job, billable runtime, STS, database write, capability, sequence-8 lineage or provider mutation occurred.
- The result narrows the diagnosis to an offline console-versus-SDK structural comparison. It does not yet identify a provider root cause or authorize a fix.

## 2026-07-30 — console-clone versus sequence-7 static field matrix

- Owner approved `APPROVE INSTRUMENTATION` for run `dbg-20260730-073606-f1c5`. The approved scope used no new instrumentation code: it read the pinned SDK, existing materializer/schema, exact sequence-7 wire observations and the safe clone-form key paths.
- The deterministic set comparison found 31 shared paths, five clone-only paths and nine sequence-7-only paths. No request value, URI, ARN, command, environment value, token or credential was read or emitted.
- `CredentialConfig` and `JobSpecs` are structurally identical at the retained type-path level. The prior role-shape and local SDK-serialization hypotheses remain ruled out.
- Clone-only paths are public-resource/default/retention/clone metadata: `ResourceId`, `SchedulingStrategy`, `SuccessPolicy`, `Settings.JobReservedMinutes` and `Settings.Tags.CloneFromJobID`. The blocked clone request is not itself provider-acceptance evidence.
- Sequence-7-only paths are `DataSources[].MountAccess`, the `Envs` object with five string entries, and two deterministic Settings tag keys. The exact sequence-7 cardinality is four mounts versus the clone's one.
- A local pinned-SDK `1.10.0` constructor check proved `CreateJobRequestDataSources` validates and JSON-roundtrips with or without `MountAccess`; the omitted form serializes exactly `MountPath`, `Options`, `Uri`. This is SDK feasibility, not provider acceptance.
- The accepted incident Job used one RW output mount. Sequence 7 additionally carries one RO code mount and two RO input mounts. That negative-space evidence makes direct OSS composition the next diagnostic domain, but it does not distinguish explicit `MountAccess`, mount cardinality/category or `Envs`.
- No product source, schema, payload, lineage, STS, database, capability, cloud resource or provider state changed. No Gate-2 fix is proposed.

## 2026-07-30 — exact sequence-7 network-blocked variant matrix

- Owner approved `APPROVE INSTRUMENTATION` for run `dbg-20260730-074202-25a0`: exact named-local sequence-7 read-only resolution, removable in-memory variants and pre-`doAction` network blocking only.
- Temporary run-id-marked code added four variants to the existing SDK wire observer: baseline, all `MountAccess` omitted, only the single RW output source retained, and `Envs` omitted. Logs allowed only fixed variant IDs, static top-level keys, counts, booleans, byte sizes and SHA-256 hashes.
- The focused observer suite passed 3/3, including a negative assertion against idempotency values, OSS URIs, mount paths, role ARNs and environment names. Backend and experiment-foundation runner typechecks passed sequentially.
- Exact sequence-7 offline-preflight observed both cells. All eight variant observations reported `sdk_validation_passed=true`, model/wire byte and semantic equality, JSON roundtrip equality, recursive `src=0`, two Settings tag keys and network blocked before send.
- Cell 1 byte counts were baseline `2989`, omit-MountAccess `2913`, output-only `2316`, omit-Envs `1768`. Cell 2 counts were `2992`, `2916`, `2319`, `1770`.
- Omit-MountAccess retained four DataSources and reduced access-key count from four to zero. Output-only retained one RW DataSource. Omit-Envs retained all four DataSources and removed only the top-level Envs group.
- The run completed with exact Run/manifest/Bundle, existing Attempts `2`, cloud calls `0` and database writes `0`. No STS, capability, lineage, Job or billable runtime was used.
- All `dbg-20260730-074202-25a0` code and test instrumentation was removed. Root-level residual search returned zero; cleanup regression passed the original observer suite 2/2, both typechecks and the baseline exact offline-preflight.
- No variant is promoted to a fix. Output-only and omit-Envs break the frozen workload contract; omit-MountAccess remains blocked on unknown RO-default semantics.

## 2026-07-30 — pinned console RO/RW `MountAccess` static trace

- Owner approved `APPROVE INSTRUMENTATION` for run `dbg-20260730-075057-6d1c`, limited to public static inspection of pinned PAI DLC `1.90.2`. The Job form, `/data/api.json`, provider API, STS, database, capability, lineage and product source remained out of scope.
- The inspected index/vendor assets matched the previously pinned DLC version. Lazy create-form dependencies localized the relevant code to the create-form shared chunk; the public assets were inspected in memory and were not copied into the repository.
- The direct-mount append initializer does not set an access field. The read-only field defaults to undefined unless the backing dataset is forced RO; its switch writes `RO` when enabled and `RW` when explicitly disabled.
- The direct OSS mapper copies the form access value into the `DataSources` entry, and the final CreateJob builder concatenates that result into the request without a per-entry access default. Consequently JSON omits the key for an untouched default-RW row, preserves `RO` for a selected read-only row and preserves `RW` after an explicit off transition.
- This resolves the prior semantic block: universal omission is not console parity and would weaken three sequence-7 RO sources. The next safe variant must retain the code/input `RO` values and omit access only from the RW output.
- The temporary Chrome tab was closed and large in-memory asset strings were cleared. Repository instrumentation/source changes, form opens/submits, proxy/provider calls, STS/database/capability/lineage writes, Jobs and billable runtime were all `0`.
- No behavior fix or sequence-8 lineage is proposed. A new Gate-1 authorization is required for the exact network-blocked `console-default-access` variant.

## 2026-07-30 — exact sequence-7 console-default access variant

- Owner approved `APPROVE INSTRUMENTATION` for run `dbg-20260730-080744-3c58`: removable exact sequence-7 in-memory mutation behind the existing SDK network blocker, with no cloud/database/STS/capability/lineage/Job effects.
- Temporary run-id-marked code added one fail-closed variant helper, one focused test and one exact offline-preflight observation. Baseline shape had to be exactly four sources with three RO and one RW. Variant shape had to be four sources with three RO, zero RW and one missing access; exactly one source could differ and all non-access semantics had to remain equal.
- The focused three-file suite passed 12/12 with the temporary test. Backend and experiment-foundation script typechecks passed sequentially after Prisma generation.
- Both exact cells passed. Cell 1 changed from 2,989 bytes to 2,970 with hash `sha256:91975d0483938a4354de65fcdd064a1501d9d9a486d923dced99f01849da0c4b`; cell 2 changed from 2,992 to 2,973 with hash `sha256:7ccc046912c26dd37c045e633d7e61b3545a6deaaec83cef78d0b3fb1dc40ab8`. Each model/wire pair matched byte-for-byte and semantically, JSON roundtrip passed and recursive `src` count was zero.
- Exact offline-preflight retained existing Attempts 2, cloud calls 0 and database writes 0. No STS, capability, lineage, Job or billable action occurred.
- All `dbg-20260730-080744-3c58` code/test/runner instrumentation was removed. Root residual scan returned zero. Cleanup regression passed the original 11/11 focused suite, both typechecks and baseline exact offline-preflight with cloud/database writes `0/0`.
- The candidate is now locally exact and execution-semantics-safe. A permanent change still requires Gate 2; sequence 8 and any provider call remain separate later gates.

## 2026-07-30 — Gate-2 console-default access fix

- Owner approved `APPROVE FIX` for local code/tests only. The scope excluded sequence-8 lineage, named-local writes, STS, provider calls, Jobs and cost.
- `packages/shared/src/research-lifecycle/experiment-foundation-real-provider-v2-contracts.ts` now retains the v1 CreateJob request type/schema and adds a v2 request contract. V2 accepts only explicit `RO` or missing access and rejects explicit `RW`.
- `apps/backend/src/services/experiment-foundation-real-provider-payload-v2-service.ts` now generates v2 requests, omits `MountAccess` from the final output mount and applies one ordered semantic validator at materialization and verification. All code/input mounts must remain explicit `RO`; only the final output may omit access.
- Verification remains backward-compatible with exact legacy v1 canonical payloads: all code/input sources must be `RO` and the final output must be `RW`. V2 requires the same RO prefix and a missing final access property.
- The first output-position negative test exposed an overlap: an all-RO request satisfied the broad v1 schema and bypassed the v2 positional check. Verification now applies the ordered predicate to both schema branches. Missing RO-prefix access and explicit RO on the v2 output both fail with `REAL_PROVIDER_PAYLOAD_CONFLICT`.
- Shared schema tests cover v1 explicit-RW acceptance, v2 console-default acceptance and v2 explicit-RW rejection. Backend tests cover new generation, exact legacy verification, weakened-prefix rejection and explicit-RO-output rejection.
- Shared, backend and experiment-foundation script typechecks passed. Shared schema tests passed 6/6; the focused backend observer/payload suite passed 12/12.
- Exact sequence-7 offline preflight remained network-blocked before send. The two final SDK wire bodies were 2,970 and 2,973 bytes with hashes `sha256:68531cd05903eff736c0f7a89e63fa33164ed3e0e172468d1811140f94c07502` and `sha256:90b600879076c736fcd85faeb4676661fb994cdcc8869aa7d735569e733c34a7`; model/wire bytes and semantics matched, JSON round trips matched and recursive `src` counts were zero.
- Existing Attempts remained 2; cloud calls and database writes were `0/0`. No new instrumentation was introduced for Gate 2. Provider acceptance and the internal `src` cause remain unverified.

## 2026-07-30 — sequence-8 console-default-access named-local lineage

- The owner authorized the next named-local successor after Gate 2. The scope was restricted to local code, the reviewed PostgreSQL target, max-40 normal T1-T4 and exact replay; STS, cloud calls, capabilities, Jobs and scientific evidence remained excluded.
- `apply-experiment-foundation-m7-executable-lineage.ts` gained one exact fail-closed scope with parent sequence 7, expected branch state/head `14/7`, sequence-8 IDs, a truthful compatibility-verification title/objective and token `authorized-2026-07-30-p313-m7-l1-console-default-access-successor-max40-no-cloud`.
- Script typecheck passed. The existing zero-cloud offline preflight passed against sequence 7, then an independent `READ ONLY` transaction confirmed the exact parent/head and a zero-row sequence-8 prefix across all 13 lineage families.
- First apply created WorkOrder `pi_experiment_revision_v2_t132_m7_l1_console_default_access_successor_v8_1`, two cells, one admission and Run `ef_run_v2_t132_m7_l1_console_default_access_successor_v8_1`. The Run manifest is `sha256:8e7cc561da119ab3383980247d04d58f01defcb016f6eb29a285208055aeab96`.
- Normal T1-T4 added exactly 40 rows. Relay claimed/delivered 3/3 with zero release, terminalization or failure; branch advanced to state/head `16/8`; 236 protected tables changed 0 and prior revision/Run state remained unchanged.
- Built-in replay and a second authorized independent-process invocation both replayed the admission, claimed/delivered 0/0 and added 0 rows.
- The live runner now binds the exact sequence-8 Run/manifest/business key. Its paid authorization value was replaced with the ungranted sequence-8 token, preventing reuse of the sequence-7 authorization. Offline preflight accepts the valid zero-Attempt state and reports cloud/database writes `0/0`.
- Final independent `READ ONLY` census confirmed the 13-family count vector `1/2/1/2/1/2/1/23/1/2/1/2/1`, total 40, branch/head/current sequence 8 and zero Attempt/ExperimentResult/EvidenceCandidate/REU rows.

## 2026-07-30 — sequence-8 read-only image preflight

- The owner supplied the exact read-only authorization: one fresh controller STS, local six-key validation, one regional `GetImage`, exact Bundle comparison and complete credential cleanup. `CreateJob`, OSS/provider writes, capabilities, database writes, NAS/PAI Jobs and training cost were prohibited.
- The existing Chrome Cloud Shell had expired. It reconnected successfully and the NAS creation offer was explicitly declined.
- Cloud Shell first verified the caller belonged to account `1183869713036194` and had RAM-user identity, then assumed `pea-m7-canary-controller` for 3,600 seconds. The generated file had exactly six keys and mode `0600`; terminal output retained only success markers and no credential value.
- The Cloud Shell download command opened its own confirmation dialog. Browser download-event observation timed out, but the exact file appeared once in Downloads and was resolved from the local filesystem without reading its contents.
- The file was moved immediately to `/tmp/t132-seq8-controller-sts.env`, changed to `0600` and parsed through Node `--env-file`. Validation passed: six exact non-empty keys, `STS.` access-key prefix, exact role, exact controller-policy hash and 57 whole minutes remaining.
- `image-preflight` passed for Run `ef_run_v2_t132_m7_l1_console_default_access_successor_v8_1`, frozen Bundle `ef_execution_bundle_revision_2c60e151719be2e109e4b2d3964aaa8c315e0b48` / `sha256:458b0e58d93974e3a09b63247bac675d26deef5fdafb111a6eae66177a3b178e` and `cn-shanghai / image-liuxvj7p2qcnflha84`. Request hash: `fbcba6059e58d7d7366f2872fbcaaf1e9297f5567087ccdeec157d4f7e95dcd1`.
- Effect census from the runner: cloud calls 1 (`GetImage`); provider writes, `CreateJob` and database writes `0/0/0`.
- Cloud Shell source deletion returned `T132_SEQ8_CLOUD_STS_REMOVED`. The local exact `/tmp` file and every Downloads prefix match were deleted and verified absent as `T132_SEQ8_LOCAL_STS_REMOVED_EXACT`.
- An independent serializable `READ ONLY` census confirmed sequence-8 ProviderPayload, Attempt, AttemptEvent, ProviderCommand, CollectionAttempt, ProvisionalOutput, ExperimentResult, EvidenceCandidate and REU counts were all 0.

## 2026-07-30 — sequence-8 paid-window preflight stopped before STS

- The owner authorized `M7-L1 console-default-access verification` for 2026-07-30 with a total ceiling of ¥50 and two Jobs. The runner remained bound to sequence-8 Run `ef_run_v2_t132_m7_l1_console_default_access_successor_v8_1`, manifest `sha256:8e7cc561da119ab3383980247d04d58f01defcb016f6eb29a285208055aeab96` and frozen ExecutionBundle `ef_execution_bundle_revision_2c60e151719be2e109e4b2d3964aaa8c315e0b48` / `sha256:458b0e58d93974e3a09b63247bac675d26deef5fdafb111a6eae66177a3b178e`.
- The pre-execution `offline-preflight` passed with job ceiling 2, monetary ceiling ¥50, exact controller-policy hash, existing Attempts 0, cloud calls 0 and database writes 0.
- An independent PostgreSQL transaction used `SERIALIZABLE READ ONLY` and returned ProviderPayload/Attempt/AttemptEvent/ProviderCommand/CollectionAttempt/ProvisionalOutput/ExperimentResult/EvidenceCandidate counts all 0. The exact local paid-STS path was absent before browser work.
- The expired Cloud Shell attempted to allocate a replacement session. Alibaba Cloud rejected it with `NoPermission` for exact action `cloudshell:CreateSession` before a usable terminal existed. The prepared STS-generation command did not execute and no credential file was created.
- This is an owner-user bootstrap permission gap, not a controller-role, runtime-role, sequence-8 request or provider acceptance result. No `GetImage`, `CreateJob`, provider/database write, capability change, NAS, PAI Job or billable runtime occurred.
- Chrome was handed off at the Alibaba Cloud owner-login page and the Cloud Shell error page. The next action is to authorize the narrow Cloud Shell session capability on RAM user `user_0002`, then repeat the fresh STS gate. If the dated paid window has expired, obtain a new action-time authorization before starting the runner.
- Commit-readiness tests exposed one local v2 collection regression: `requireOutputDirectoryUri` still required explicit `RW`, while the approved console-default request intentionally omits `MountAccess` from the final output. The smallest correction accepts only the two valid output access states—legacy explicit `RW` or v2 missing—while retaining the exact output mount-path hash and single-candidate checks. It does not weaken explicit `RO` input boundaries.
- The first focused backend run failed 1/18 at M7-10 collection. After the correction, the same suite passed 18/18, backend typecheck passed and the exact sequence-8 offline preflight remained green with Attempts/cloud/database writes `0/0/0`.

## 2026-07-31 — sequence-8 paid provider rejection and safe terminalization

- The owner explicitly authorized one sequence-8 window dated 2026-07-31 with a maximum of two PAI Jobs and total ceiling ¥50. The runner authorization literal was advanced only for that window and restored afterward to `null` so no environment value can reactivate execution without a source review.
- Chrome verified caller `acs:ram::1183869713036194:user/user_0002`, generated a 3,600-second controller STS through `pea-m7-canary-controller`, retained six exact keys at local mode `0600`, and printed no credential value. An earlier STS expired while waiting for authorization and was deleted before a fresh credential was issued.
- The exact sequence-8 offline preflight passed with Attempts 0, cloud calls 0 and database writes 0. A fresh production `GetImage` passed with one cloud read and zero provider writes/`CreateJob`/database writes.
- The live runner invoked `CreateJob` exactly twice. Both calls produced top-level `400 / BadRequest` with RequestIds `019FB7D9-E94A-5AD4-B2FD-5FCC96C741A6` and `019FB7D9-F017-5B8D-AC24-549D21FDA76E`; no third call occurred.
- Official OpenAPI diagnosis mapped both RequestIds to `PaiDlc / 2020-12-03 / CreateJob / cn-shanghai`, flow-control result `FC.PASS` and response `src property must be a valid json object`. The portal returned no diagnostic solution.
- Exact recovery found no Job or external ref. Both Attempts terminalized `failed / stateVersion 1 / real_provider_cleanup_unverified`; both submit commands terminalized after 12 passes with `REAL_PROVIDER_RECOVERY_NOT_FOUND`.
- Serializable read-only census returned ProviderPayload/Attempt/Event/Command `2/2/4/2`; CollectionAttempt/ProvisionalOutput/ExperimentResult/ScientificValidationReport/EvidenceCandidate/REU all 0. Observed billable runtime is 0 because no Job was accepted or discovered.
- Cloud Shell source, local `/tmp` and Downloads credential copies were removed and verified absent. The authorization is exhausted.
- Provider escalation draft: `artifacts/implementation/27-m7-l1-sequence8-provider-escalation.md`. It contains the two RequestIds, exact wire hashes, structural evidence and zero-Job/zero-evidence census without credentials or unredacted payload values. Submission requires explicit action-time confirmation.
- Current action: submit the reviewed escalation through Alibaba Cloud support. Do not create sequence 9/10, mutate sequence 8 or run another paid request without a provider-supported correction and a new authorization.
