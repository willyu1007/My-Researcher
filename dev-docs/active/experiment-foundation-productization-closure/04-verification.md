# 04 Verification

## T-132 scope split and T-134 transfer — 2026-07-30

Outcome: **documentation scope is frozen; runtime/provider acceptance is still pending**.

- T-132 authoritative completion checks now cover exact sequence-8 two-cell PAI success, exact collection, zero-new replay, deterministic recovery coverage and cleanup/runbook evidence.
- Desktop UI and DOM/Electron acceptance are explicitly absent from the active boundary.
- EF-P06, EF-P14, EF-P15 and semantic EF-P21 have a named receiving task, T-134, and no longer block T-132.
- `node .ai/scripts/lint-docs.mjs --path dev-docs/active/experiment-foundation-productization-closure` → passed with 0 errors; existing long-document vague-reference warnings remain.
- `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main` → regenerated derived views; T-132 query reports `in-progress`, `F-001`, `M-001`, updated `2026-07-30`.
- `node .ai/scripts/ctl-project-governance.mjs lint --check --project main` → passed with two unrelated pre-existing T-124/T-133 state-format warnings.
- `git diff --check` → passed.
- No product/runtime tests were run because the scope change modifies only task and governance documentation.

## M7-L1 sequence-7 final SDK wire-boundary diagnosis — 2026-07-30

Outcome: **the official SDK final wire is exact; SDK serialization is ruled out as the source of the provider-internal `src` failure**.

- Authorization: `APPROVE INSTRUMENTATION`; run_id `dbg-20260729-151747-2ddb`; cloud calls, database writes, capability changes and sequence-8 creation prohibited.
- Marker scope: the observer, unit test and exact runner import/offline block use `DEBUG-MODE: BEGIN/END dbg-20260729-151747-2ddb`; emitted records use `[DBG:dbg-20260729-151747-2ddb]`.
- `pnpm exec node --test --loader ts-node/esm src/services/experiment-foundation-m7-l1-create-job-wire-observation.unit.test.ts src/services/experiment-foundation-m7-l1-create-job-error-observation.unit.test.ts src/services/experiment-foundation-real-provider-payload-v2-service.unit.test.ts` → 11/11 passed.
- Privacy negative: hostile workspace, role, URI, mount, command, image, environment, credential-like and dynamic tag/key values are absent from serialized observations.
- `pnpm run typecheck` → passed.
- `pnpm run typecheck:experiment-foundation-scripts` → passed.
- `pnpm run experiment-foundation:m7-l1:live -- --mode offline-preflight` → passed against the exact named-local sequence-7 Run/frozen Bundle with existing Attempts 2, cloud calls 0 and database writes 0.
- `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main` → completed; T-132 derived project views reconciled.
- `node .ai/scripts/ctl-project-governance.mjs lint --check --project main` and `git diff --check` → passed; only two pre-existing unrelated task-state warnings remain.
- `node .ai/scripts/lint-docs.mjs` → passed with warnings only; no document-format errors.
- Cell 1: model/wire SHA-256 `sha256:bdb5d86fa62e4f1c807da20670553e0fe91185508ab58eb1e4f1ff61d70c1680`, bytes `2989/2989`, byte/semantic/round-trip equality true, recursive `src` `0/0`.
- Cell 2: model/wire SHA-256 `sha256:e8ce6ee982e6afac48906bbefcb1ecccd8aa1bd830be53ae9f2faf2009b47a90`, bytes `2992/2992`, byte/semantic/round-trip equality true, recursive `src` `0/0`.
- Both cells: four DataSource Options are wire strings and parse as JSON objects; source-binding is a wire string and parses as a JSON object; RoleArn/RoleType are strings; `AssumeRoleFor` and `ResourceId` are absent.
- Official CreateJob reference check: `DataSources[].Options` is documented as `string`; the documentation does not support changing it to an object.
- Interpretation: model-to-wire transformation is ruled out; malformed known JSON strings are ruled out. A provider-internal direct-OSS translation or another service-side compatibility issue remains uncertain. No Gate-2 fix is authorized or proposed.

## M7-L1 instrumented diagnostic sequence-7 paid provider rejection — 2026-07-29

Outcome: **the bounded reproduction captured safe provider evidence but created no Job; provider causality remains unresolved**.

- Authorization: `M7-L1 instrumented diagnostic reproduction authorized: 2026-07-29, ceiling ¥50, 2 jobs`.
- Action-time `offline-preflight` → passed; exact Run/manifest/Bundle, Attempts 0, cloud/database writes 0, two-Job/¥50 and 2 CPU / 8192 MiB / 30-minute ceilings.
- Fresh STS: RAM-user caller/account exact; six keys; mode `0600`; temporary identity; controller role/policy exact; 59 whole minutes remaining; values printed 0.
- Execute command: `T132_M7_L1_LIVE_AUTHORIZATION=<exact recorded token> node --env-file=/tmp/t132-controller-sts.env --env-file=../../.env.local --loader ts-node/esm scripts/run-experiment-foundation-m7-l1-live-window.ts --mode execute`.
- Instrumented calls: exactly 2 `CreateJob`; both observation records contained top-level `status_code=400`, `provider_code=BadRequest` and distinct top-level RequestIds. No message, stack, body, URI, role, environment or credential value was emitted.
- Official authenticated diagnosis: both RequestIds identify `PaiDlc / 2020-12-03 / CreateJob / cn-shanghai`, HTTP 400, flow control `FC.PASS`, response `src property must be a valid json object`.
- Runner result: non-zero final success assertion after normal recovery convergence; no third submission.
- Read-only PostgreSQL transaction with server-enforced read-only mode: ProviderPayload 2; Attempt 2; AttemptEvent 4; ProviderCommand 2; both Attempts `failed / stateVersion 1 / real_provider_cleanup_unverified / no external ref`; both commands `terminal / attemptCount 12 / REAL_PROVIDER_RECOVERY_NOT_FOUND / unleased / no external ref`.
- Negative-space census: CollectionAttempt 0; ProvisionalOutput 0; ExperimentResult 0; ScientificValidationReport 0; EvidenceCandidate 0; REU 0.
- Provider outcome: returned/discovered Jobs 0; external refs 0; observed billable runtime 0. The authorization is exhausted.
- Credential cleanup: Cloud Shell `T132_SEQ7_PAID_CLOUD_STS_REMOVED`; local `/tmp` and Downloads `T132_SEQ7_PAID_LOCAL_STS_REMOVED`.
- Post-run `offline-preflight` → passed with existing Attempts 2, cloud calls 0 and database writes 0.
- Interpretation: H1 (safe error fields are top-level) is supported; H4 (no safe metadata available) is ruled out; missing DataSource `Options` and custom-role `AssumeRoleFor` are both ruled out as sole causes. The internal `src` producer remains uncertain. No Gate-2 fix is authorized.

## M7-L1 instrumented diagnostic sequence-7 production image preflight — 2026-07-29

Outcome: **the separately authorized sequence-7 read-only image verification passed; no paid execution permission was inferred or consumed**.

- Authorization: exact sequence-7 read-only image-preflight scope; `CreateJob`, OSS writes, capability changes, database writes and NAS/PAI Job creation prohibited.
- Pre-run local residual scan: no matching STS file in `/tmp` or Downloads.
- Cloud Shell identity assertion: exact account plus RAM-user caller matched; NAS creation was declined.
- STS generation: exactly six keys, Cloud Shell mode `0600`, credential values printed 0.
- Local contract: exact six keys, mode `0600`, all values non-empty, temporary `STS.` AK prefix, exact controller role, exact policy hash and 59 whole minutes remaining.
- `node --env-file=/tmp/t132-controller-sts.env --env-file=../../.env.local --loader ts-node/esm scripts/run-experiment-foundation-m7-l1-live-window.ts --mode image-preflight` → passed.
- Exact Run: `ef_run_v2_t132_m7_l1_instrumented_diagnostic_successor_v7_1`.
- Exact frozen Bundle: `ef_execution_bundle_revision_2c60e151719be2e109e4b2d3964aaa8c315e0b48` / `sha256:458b0e58d93974e3a09b63247bac675d26deef5fdafb111a6eae66177a3b178e`.
- Image request: `cn-shanghai` / `image-liuxvj7p2qcnflha84`; target fingerprint `sha256:8851b255b079ad1f049dc1842c41cb3516d5a3ff0b69e21a30e8f2675409cca0`; request hash `09e466d5af908f548b362c37753050921a9e12a9deade4c9ce5b6ed6acf64c50`.
- Effect census: cloud calls 1 (`GetImage`); provider writes 0; `CreateJob` 0; database writes 0; capability changes 0; NAS/PAI Jobs and billable runtime 0.
- Credential cleanup: Cloud Shell `T132_SEQ7_CLOUD_STS_REMOVED`; local `/tmp` and Downloads `T132_SEQ7_LOCAL_STS_REMOVED`.
- Instrumentation objective remains 1/1 offline; provider reproduction remains 0/1. `dbg-20260729-142414-8438` stays active for a separately authorized paid reproduction.

## M7-L1 instrumented diagnostic sequence-7 named-local landing — 2026-07-29

Outcome: **sequence-7 landed through exact max-40 T1-T4 and two zero-new replays; cloud reproduction remains unauthorized**.

- Authorization: exact sequence-7 named-local successor, max 40 rows, normal T1-T4/CAS/replay/protected verification; no cloud/capability/PAI/scientific-evidence effects.
- Read-only preflight: named-local fingerprint exact; branch `12/6`; sequence-6 parent revision/Run `1/1`; parent Attempts 2 terminal failed; sequence-7 revision/Run `0/0`; Cycle closure 0.
- `pnpm --filter @paper-engineering-assistant/backend typecheck:experiment-foundation-scripts` before apply → passed.
- First repo-root invocation: failed before app startup with `ERR_MODULE_NOT_FOUND` for package-local `ts-node`; database/provider operations 0.
- Correct backend-directory apply → passed; exactly 40 new rows, relay claimed/delivered `3/3`, released/terminalized/failures 0, branch state/head `14/7`, 236 protected tables changed 0.
- Exact WorkOrder/Run: `pi_experiment_revision_v2_t132_m7_l1_instrumented_diagnostic_successor_v7_1` / `ef_run_v2_t132_m7_l1_instrumented_diagnostic_successor_v7_1`.
- Exact manifest: `sha256:ad9196472551d493501884d02e6620d3ac5d7f680611a929c3e0c0eb069a56a1`; frozen Bundle revision/hash unchanged.
- In-process replay: admission replayed, row delta 0, relay `0/0`, protected changes 0.
- Independent-process replay: all 14 controlled-table deltas 0, relay `0/0`, branch `14/7`, protected changes 0.
- Post-read: revision/cells/admission `1/2/1`; Run/RunCells `1/2`; sequence-7 Attempt/result/candidate/REU `0/0/0/0`; sequence-6 Attempt/Command unchanged `2/2`.
- Live-runner rebind typecheck → passed.
- Sequence-7 offline-preflight → passed; exact Run/manifest/Bundle, Attempts 0, cloud calls 0, database writes 0.
- Prohibited effects: cloud/provider calls 0; `CreateJob` 0; capability changes 0; PAI Jobs 0; ExperimentResult/EvidenceCandidate/REU 0.
- Next gates remain separate: one-read image preflight, then instrumented two-Job/¥50 diagnostic reproduction. Instrumentation `dbg-20260729-142414-8438` remains active.

## M7-L1 sequence-6 SDK-error observation instrumentation — 2026-07-29

Outcome: **the removable observer is offline-verified and ready; no provider reproduction or behavior fix occurred**.

- Authorization: `APPROVE INSTRUMENTATION`; run_id `dbg-20260729-142414-8438`.
- Marker search scope: new debug module/test plus exact runner import/catch blocks use `DEBUG-MODE: BEGIN/END dbg-20260729-142414-8438`; the emitted structured line includes `[DBG:dbg-20260729-142414-8438]`.
- `node --loader ts-node/esm --test src/services/experiment-foundation-m7-l1-create-job-error-observation.unit.test.ts` → 5/5 passed.
- `node --loader ts-node/esm --test src/services/experiment-foundation-aliyun-real-provider-v2-transport.unit.test.ts src/services/experiment-foundation-m7-l1-create-job-error-observation.unit.test.ts` → 11/11 passed.
- Privacy negatives: invalid status/token shapes normalize to null; hostile message/stack/request/credential/URI/role/command/environment sentinels absent; accessor getter reads 0.
- `pnpm --filter @paper-engineering-assistant/backend typecheck` → passed.
- `pnpm --filter @paper-engineering-assistant/backend typecheck:experiment-foundation-scripts` → passed.
- `pnpm --filter @paper-engineering-assistant/backend experiment-foundation:m7-l1:live -- --mode offline-preflight` → passed; exact sequence-6 Run/Bundle, existing Attempts 2, cloud calls 0, database writes 0.
- Effect census: `CreateJob` 0; other cloud calls 0; database writes 0; capability changes 0; sequence-6 rows unchanged.
- Instrumentation objective: 1/1. Provider reproduction: 0/1. Instrumentation remains active pending separately authorized sequence-7 lineage/read/paid gates; no Gate-2 fix plan exists yet.

## M7-L1 custom-role-shape sequence-6 paid provider verification — 2026-07-29

Outcome: **the two-call window found no accepted Job; the provider rejection remains unclassified because the accepted-response-loss fence discarded the SDK exception**.

- Authorization: `M7-L1 custom-role-shape-fix verification authorized: 2026-07-29, ceiling ¥50, 2 jobs`.
- `pnpm --filter @paper-engineering-assistant/backend experiment-foundation:m7-l1:live -- --mode offline-preflight` → passed; exact Run/Bundle, Attempts 0, cloud/database writes 0.
- Fresh STS: exact six keys, mode `0600`, all non-empty, temporary AK, exact controller role/policy hash and 59 whole minutes remaining; values printed 0.
- Execute command: `T132_M7_L1_LIVE_AUTHORIZATION=<exact recorded token> node --env-file=/tmp/t132-controller-sts.env --env-file=../../.env.local --loader ts-node/esm scripts/run-experiment-foundation-m7-l1-live-window.ts --mode execute`.
- Submission ceiling: at most 2 `CreateJob`; two Attempts/submit commands entered the lane, and subsequent worker passes were recovery-only.
- Provider outcome: returned Job IDs 0; exact discovered Jobs 0; external refs 0; observed billable runtime 0. The transport did not retain synchronous status/code/RequestId.
- Terminal census: ProviderPayload 2; Attempts 2, both `failed` / stateVersion 1 / `real_provider_cleanup_unverified` / no external ref; AttemptEvents 4; submit ProviderCommands 2, both terminal / attemptCount 12 / `REAL_PROVIDER_RECOVERY_NOT_FOUND`; CollectionAttempt 0; ProvisionalOutput 0; ExperimentResult 0; EvidenceCandidate 0; REU 0.
- Runner outcome: non-zero final success assertion because neither Attempt succeeded; no third submission and no direct command/Attempt reset.
- Credential cleanup: Cloud Shell `T132_PAID_CLOUD_STS_REMOVED`; local `/tmp` and Downloads `T132_PAID_LOCAL_STS_REMOVED`.
- Interpretation: sequence-6 is immutable terminal evidence, not a successful provider canary. Next work requires a separately approved no-cloud, whitelist-only SDK-error instrumentation gate before any fix/successor/paid retry.

## M7-L1 custom-role-shape sequence-6 production image preflight — 2026-07-29

Outcome: **read-only sequence-6 image verification passed; no paid execution permission was inferred or consumed**.

- Authorization: exact sequence-6 read-only image-preflight scope; `CreateJob`, OSS writes, capability changes, database writes and NAS/PAI Job creation prohibited.
- Cloud Shell identity assertion: target account plus RAM-user caller matched; NAS creation remained skipped.
- STS generation output: `T132_CLOUD_STS_READY keys=6 mode=600`; credential values printed 0.
- Local contract: exact six keys, mode `0600`, all values non-empty, temporary AK prefix true, controller role true, policy hash true, 58 whole minutes remaining.
- `node --env-file=/tmp/t132-controller-sts.env --env-file=../../.env.local --loader ts-node/esm scripts/run-experiment-foundation-m7-l1-live-window.ts --mode image-preflight` → passed.
- Exact Run: `ef_run_v2_t132_m7_l1_role_shape_fix_successor_v6_1`.
- Exact frozen Bundle: `ef_execution_bundle_revision_2c60e151719be2e109e4b2d3964aaa8c315e0b48` / `sha256:458b0e58d93974e3a09b63247bac675d26deef5fdafb111a6eae66177a3b178e`.
- Image request: `cn-shanghai` / `image-liuxvj7p2qcnflha84`; request hash `ebcc558c0fd09b771277101942102d3e6d1bdc1dd3ebbec8ca276d98ab554ae5`.
- Effect census: cloud calls 1 (`GetImage`); provider writes 0; `CreateJob` 0; database writes 0; capability changes 0; NAS/PAI Jobs and billable runtime 0.
- Credential cleanup: Cloud Shell `T132_CLOUD_STS_REMOVED`; local `/tmp` and Downloads `T132_LOCAL_STS_REMOVED`.
- Documentation closure: `ctl-project-governance sync --apply`, `lint --check` and `git diff --check` passed; two pre-existing unrelated T-124 State-format warnings remain.
- Next gate: a separately worded and time-bounded sequence-6 paid authorization plus a newly issued STS; this verification grants neither.

## M7-L1 Options-fix sequence-5 paid provider verification — 2026-07-29

Outcome: **explicit Options did not resolve the provider rejection; no Job or billable runtime was created**.

- Authorization: `M7-L1 Options-fix verification authorized: 2026-07-29, ceiling ¥50, 2 jobs`.
- Fresh STS: exact six keys, mode `0600`, temporary AK, role/policy hash match and 58 whole minutes remaining; values printed 0.
- Exact provider calls: 2/2 `CreateJob`; no third call.
- Call 1: wire JSON 2,979 bytes; four DataSources with `Options`; recursive `src` count 0; RequestId `019FAB35-0B06-54F8-94C0-964A48F91F0F`; HTTP 400 `BadRequest`.
- Call 2: wire JSON 2,976 bytes; four DataSources with `Options`; recursive `src` count 0; RequestId `019FAB35-11B0-518B-ADE8-B6833097FD32`; HTTP 400 `BadRequest`.
- OpenAPI self-diagnosis for both RequestIds: `src property must be a valid json object`; caller was the exact controller role; API was regional PAI-DLC `CreateJob`; gateway flow-control passed.
- Provider outcome: returned Job IDs 0; discovered Jobs 0; external refs 0; billable Job runtime 0.
- Final named-local read-only census: ProviderPayload 2; Attempts 2 prepared/stateVersion 0/no terminal reason/no external ref; AttemptEvents 2; submit ProviderCommands 2 with attemptCount 8, `REAL_PROVIDER_RECOVERY_NOT_FOUND`, expired claimed leases and no external ref; CollectionAttempt 0; ProvisionalOutput 0; ExperimentResult 0; EvidenceCandidate 0; REU 0.
- The runner was stopped after the two synchronous provider rejections and exact diagnostics; no direct command release/reset was performed.
- Credential cleanup: Cloud Shell source absent; local `/tmp` absent; Downloads T-132 STS files absent.
- Interpretation: missing Options as the sole cause is ruled out. Provider-side `src` origin remains unresolved; next work is no-cloud Gate 1 only.

## M7-L1 Options-fix sequence-5 production image preflight — 2026-07-29

Outcome: **read-only provider image verification passed; paid `CreateJob` remains unauthorized and unconsumed**.

- Chrome Cloud Shell reconnected successfully; NAS creation was explicitly skipped.
- STS generation output: success marker only; no AccessKey, secret or token value was printed.
- Downloaded credential contract: mode `0600`, six exact keys, all non-empty, temporary AK prefix true, controller role match true, controller policy hash match true, 58 whole minutes remaining.
- `node --env-file=/tmp/t132-controller-sts.env --env-file=../../.env.local --loader ts-node/esm scripts/run-experiment-foundation-m7-l1-live-window.ts --mode image-preflight` → passed.
- Exact Run: `ef_run_v2_t132_m7_l1_options_fix_successor_v5_1`.
- Exact Bundle: `ef_execution_bundle_revision_2c60e151719be2e109e4b2d3964aaa8c315e0b48` / `sha256:458b0e58d93974e3a09b63247bac675d26deef5fdafb111a6eae66177a3b178e`.
- Image request hash: `d74c81437c8ebf215cb052f22b34a883538c8536632edfcdd288f4621c04ef92`.
- Effect census: cloud calls 1 (`GetImage`); provider writes 0; `CreateJob` 0; database writes 0; capability changes 0; billable Jobs 0.
- Credential cleanup: Cloud Shell `T132_CLOUD_STS_REMOVED`; local `/tmp` and Downloads absence check `T132_LOCAL_STS_REMOVED`.
- Next authorization is distinct and must be explicit: `M7-L1 Options-fix verification authorized: 2026-07-29, ceiling ¥50, 2 jobs`.

## M7-L1 Options-fix sequence-5 named-local apply — 2026-07-29

Outcome: **named-local sequence-5 apply, restart replay and zero-cloud offline-preflight passed; provider execution remains unauthorized**.

- Script typecheck passed after adding the exact sequence-5 successor scope.
- Read-only preflight target: `postgres` / `my_researcher_dev` / `127.0.0.1:5432`, fingerprint `sha256:8851b255b079ad1f049dc1842c41cb3516d5a3ff0b69e21a30e8f2675409cca0`.
- Read-only state: branch state/head `8/4`; sequence-4 parent revision/Run counts 1/1; sequence-5 revision/Run counts 0/0; Cycle closure count 0.
- Apply command used only the exact local successor token `authorized-2026-07-29-p313-m7-l1-options-fix-successor-max40-no-cloud`.
- Apply result: 40 new rows; relay claimed/delivered 3/3; released/terminalized/failures 0; branch state/head `10/5`; 236 protected tables changed 0.
- Exact lineage: WorkOrder `pi_experiment_revision_v2_t132_m7_l1_options_fix_successor_v5_1`; Run `ef_run_v2_t132_m7_l1_options_fix_successor_v5_1`; manifest `sha256:1b5be3de672f067f8e19677181c5c181699a0c595c71bd1e768dbf48f17ffc72`; frozen Bundle revision/hash unchanged.
- Built-in replay and independent-process replay: admission replayed; every allowed-table delta 0; relay claimed/delivered 0/0; protected changes 0; prior lineage unchanged.
- Prohibited effects: cloud/provider calls 0; capability changes 0; `CreateJob` 0; live Attempts 0; ExperimentResult 0; EvidenceCandidate 0; REU 0.
- Script typecheck rerun passed after rebinding the live runner to sequence 5.
- First offline-preflight process failed during module initialization because it raced a concurrent `prisma generate`; it did not reach target resolution or any database/provider operation. Sequential rerun passed:
  - Run/manifest exact;
  - Attempts 0;
  - two-job/¥50 ceiling encoded but not authorized;
  - cloud calls 0;
  - database writes 0.
- `git diff --check` and governance sync/lint are required after the documentation update.

## M7-L1 Gate-2 direct-OSS Options fix — 2026-07-29

Outcome: **code/contract fix passed the no-network and disposable-PostgreSQL gates; provider verification is pending a fresh successor and separate authorization**.

- Gate 2 approval: `APPROVE FIX`; debug run ID remains `dbg-20260729-071348-src-shape`.
- Focused shared schema test → 6/6 passed, including rejection of missing Options and non-canonical `{"mountType":"ossfs"}`.
- Focused backend payload + debug-observation tests → 8/8 passed; all three direct OSS binding classes emitted `Options: '{}'`.
- `pnpm typecheck` in `packages/shared` → passed.
- `pnpm typecheck` in `apps/backend` → passed.
- `pnpm typecheck:experiment-foundation-scripts` in `apps/backend` → passed.
- First full isolated run `t132-m7-options-empty-object-20260729-v1` → failed closed: shared 12/12 and backend 93/93 passed; relational 8/9 exposed a stale Prisma real-provider `redacted_fields` read fence. No cloud or named-local operation occurred.
- After adding `DataSources[*].Options` to that exact read fence, `node .ai/scripts/experiment-foundation-m7-provider-gate.mjs --run-id t132-m7-options-empty-object-20260729-v2 --imported-run-id t132-m7-offline-20260724-v3` → passed.
- Final gate detail: shared 12/12, backend 93/93, relational 9/9, migration deploy passed, both typechecks passed, skip 0. Summary SHA-256: `4c35342cf01839ae4e28151068307c7d96ee9dee9432ec6f82faee18e97d7d7b`.
- `git diff --check` → passed.
- Effect census: named-local database writes 0; cloud calls 0; `CreateJob` 0; capability changes 0; billable actions 0. Historical sequence-4 payloads/Attempts/commands were unchanged.
- Deliberate non-check: named-local sequence-4 offline rematerialization was not rerun after the behavior change because its persisted payload hash is immutable and now intentionally differs. A new successor must establish the new payload lineage.

## M7-L1 Gate-1 direct-OSS request-shape diagnosis — 2026-07-29

Outcome: **the direct-OSS missing-Options hypothesis is supported; behavior fix awaits Gate 2**.

- Gate 1 approval: `APPROVE INSTRUMENTATION`; run ID `dbg-20260729-071348-src-shape`.
- `pnpm --filter @paper-engineering-assistant/backend exec node --test --loader ts-node/esm src/services/experiment-foundation-m7-l1-create-job-debug-observation.unit.test.ts` → 4/4 passed. Hostile values and unknown field names were absent from emitted observations.
- `pnpm --filter @paper-engineering-assistant/backend typecheck:experiment-foundation-scripts` → passed.
- `pnpm --filter @paper-engineering-assistant/backend typecheck` → passed.
- Exact sequence-4 offline rematerialization: two JSON-roundtrippable wire maps, 2,923/2,920 bytes, recursive `src` count 0, unknown-key counts 0.
- Both exact payloads: top-level object kinds correct; DataSources 4, each exactly `MountAccess`/`MountPath`/`Uri` with `Options` absent; CredentialConfig one item/one role; Envs five string values; JobSpecs one object; Settings two string tags.
- `pnpm --filter @paper-engineering-assistant/backend experiment-foundation:m7-l1:live -- --mode offline-preflight` → passed with exact sequence-4 Run/Bundle, existing Attempts 2, cloud calls 0 and database writes 0.
- Chrome read-only comparison: PAI create form loaded under the authenticated RAM session; adding one OSS storage mount immediately produced an Advanced Settings editor containing exactly `{}`. No URI/role/command was entered and `确定` was not clicked.
- Official current PAI documentation confirms JindoFuse is the default OSS mount and advanced settings are JSON; `{"mountType":"ossfs"}` explicitly opts into ossfs.
- Effect census: console submissions 0; `CreateJob` 0; provider writes 0; database writes 0; capability changes 0; billable actions 0.
- Interpretation: `CredentialConfig` was structurally parsed in the prior PassRole rejection and remains well-formed; the exact request itself contains no `src`. The single provider-console differential is omitted DataSource `Options`, supporting canonical `{}` as the minimal next fix. Live confirmation still requires a new immutable successor and separate paid authorization.

## M7-L1 PassRole-fix paid provider verification — 2026-07-29

Outcome: **the PassRole repair crossed the old IAM boundary, but end-to-end provider execution failed at a new request-validation boundary**.

- Authorization: `M7-L1 PassRole-fix verification authorized: 2026-07-29, ceiling ¥50, 2 jobs`.
- Exact provider calls: 2/2 `CreateJob`; RequestIds `019FAAF0-A1C4-533C-8E04-CBA65A115550` and `019FAAF0-A776-5709-ADD4-803987A9FE10`.
- Both calls returned SDK `ClientError`, HTTP 400 `BadRequest`. Alibaba Cloud OpenAPI self-diagnosis resolved both RequestIds to the exact message `src property must be a valid json object`.
- The prior PAI 4001 `NoPermission` / PassRole diagnostic did not recur. This verifies the IAM repair, not the full execution path.
- No third call was made. Returned Job IDs 0, recovered Jobs 0, external refs 0 and billable Job runtime 0.
- Final named-local census: ProviderPayload 2; Attempts 2, both `prepared`/stateVersion 0/no terminal reason/no external ref; AttemptEvents 2; submit ProviderCommands 2, both pending/attemptCount 7/`REAL_PROVIDER_RECOVERY_NOT_FOUND`/unleased/no external ref; CollectionAttempt 0; ProvisionalOutput 0; ExperimentResult 0; EvidenceCandidate 0. An independent Prisma read against `postgres` at `127.0.0.1:5432` confirmed sequence-4 RunEvidenceUnit 0.
- SDK production `parseToMap` inspection produced ordinary JSON objects for `DataSources`, `CredentialConfig`, `JobSpecs` and `Settings`. Installed `1.10.0` versus current `1.10.2` comparison showed no relevant CreateJob/DataSources structural change.
- Official contract review continues to support direct OSS directory URIs and structured DataSources; the contract does not identify which internal provider `src` rejected the request. Direct-OSS backend, role credential source, env/settings or another provider transformation therefore remain unresolved alternatives.
- Credential cleanup passed across Cloud Shell, local temporary storage and Downloads. No capability was enabled and no ExperimentResult, EvidenceCandidate or REU was written.
- Verification result: PassRole fix 1/1; end-to-end provider path 0/1. The paid authorization is exhausted.

## M7-L1 PassRole-fix verification successor — 2026-07-29

Outcome: **named-local sequence-4 apply and exact replay passed; cloud execution remains separately gated**.

- Read-only preflight: branch state/head `6/3`, current/head sequence 3; sequence-4 Revision/Run/Attempt rows 0; protected sequence-3 Attempt/ProviderCommand rows 2/2.
- Backend typecheck passed before and after the runner binding update.
- Apply target: `postgres` / `my_researcher_dev` / `127.0.0.1:5432`, fingerprint `sha256:8851b255b079ad1f049dc1842c41cb3516d5a3ff0b69e21a30e8f2675409cca0`.
- Apply result: exactly 40 new rows; relay claimed/delivered 3/3, failures/released/terminalized 0; branch state/head `8/4`; 236 protected tables changed 0.
- Exact lineage: WorkOrder `pi_experiment_revision_v2_t132_m7_l1_passrole_fix_successor_v4_1`, Run `ef_run_v2_t132_m7_l1_passrole_fix_successor_v4_1`, manifest `sha256:9e39a40d56121a255ac83656a46a89ea8d6b487b920e16873675a59b410d5045`; exact frozen Bundle revision/hash unchanged.
- In-process replay and a second independent-process replay both reported admission replay, all allowed-table deltas 0, relay claimed/delivered 0/0, protected changes 0 and prior lineage unchanged.
- Independent post-read: two cells, one admission, one Run and two RunCells; sequence-4 Attempt/ExperimentResult/EvidenceCandidate/REU counts 0; sequence-3 Attempt/ProviderCommand counts remained 2/2.
- `pnpm --filter @paper-engineering-assistant/backend experiment-foundation:m7-l1:live -- --mode offline-preflight` passed for sequence 4 with `existing_attempt_count=0`, job ceiling 2, monetary ceiling ¥50, 2 CPU / 8192 MiB / 30 minutes, cloud calls 0 and database writes 0.
- Fresh controller STS contract check passed with six exact keys, mode `0600`, temporary identity, exact controller role/policy hash and 57 whole minutes remaining; credential values printed 0.
- `pnpm --filter @paper-engineering-assistant/backend experiment-foundation:m7-l1:live -- --mode image-preflight` passed for sequence 4. Image request hash: `fbbbfecf1af20f009fcc0c0cadaeb08a51a91b53ab343b52b88c3e896eed7595`; cloud calls 1, provider writes 0, `CreateJob` 0, database writes 0.
- Credential cleanup passed: Cloud Shell source absent; local `/tmp` correct/isolated files absent; Downloads contains no `t132-controller-sts*` file.
- Prohibited effect census: capability changes 0, cloud/provider calls 0, `CreateJob` 0, PAI Jobs 0, billable compute 0, scientific/evidence writes 0.

## M7-L1 exact controller PassRole recovery — 2026-07-29

Outcome: **repository and owner-confirmed cloud policy fix passed non-billable verification; provider-level `CreateJob` verification remains separately gated**.

- `sha256sum workloads/ragperf-canary/ram/controller-policy.json` → `f6b63cd73a57c6d8cfade1a177681ad4463cbd4d6d0a116e26a40ceee85ed497`.
- Exact `jq -e` policy assertion passed: one and only one `ram:PassRole` Allow, exact runtime-role ARN resource, and existing `oss:PutObject` / `oss:DeleteObject` / `paidlc:DeleteJob` Deny actions retained.
- Experiment-foundation script typecheck passed.
- Backend typecheck passed.
- Whitelist/privacy observation tests passed 2/2.
- Named-local `offline-preflight` passed for sequence-3 exact Run/Bundle with pinned candidate policy hash, `existing_attempt_count=2`, cloud calls 0 and database writes 0.
- Owner-confirmed `CreatePolicyVersion` returned v3 with `IsDefaultVersion=true`.
- Read-only live verification: default version v3; versions v1/v2 retained non-default; canonical policy hash `6d6d091f68705f175aa33d19cc1f3d15a9fcd54d89ba3f826c045ad994c15b61` matches the repository; one PassRole Allow has the exact runtime role ARN; runtime trust is exactly `["pai.aliyuncs.com"]`; temporary policy file removed.
- Fresh controller STS production `image-preflight` → passed; image request hash `8ed5bea6bc36377cbd47e82cc50c7b797d841b3d05d2333b0e23e1ec4884bb35`; cloud reads 1, provider writes 0, `CreateJob` 0, database writes 0.
- Credential cleanup: Cloud Shell `T132_CLOUD_STS_REMOVED`; local `/tmp` and Downloads absence check `T132_LOCAL_STS_REMOVED`.
- Cloud effect census: one approved RAM policy-version write; `CreateJob` 0; Job/billable compute 0.

## M7-L1 paid rejection instrumentation + diagnostic successor — 2026-07-28

Outcome: **whitelist instrumentation passed offline; named-local sequence-3 apply/replay passed; a new paid action-time authorization is required before reproduction**.

- First paid diagnostic: exact SDK `CreateJob` boundary invoked 2/2; returned Job IDs 0; exact recovered Jobs 0; ActionTrail `CreateJob` events 0; external Job refs 0; billable compute 0. Both sequence-2 Attempts/submit commands are terminal failed, preserving `REAL_PROVIDER_RECOVERY_NOT_FOUND`.
- `pnpm --filter @paper-engineering-assistant/backend exec node --test --loader ts-node/esm src/services/experiment-foundation-m7-l1-create-job-debug-observation.unit.test.ts` → 2/2 passed. Hostile message/header/token/body fields were absent from the emitted line.
- Backend and experiment-foundation script typechecks passed; `git diff --check` passed. Instrumentation cloud calls/database writes: 0/0.
- Apply preflight: branch sequence/head 2, state/head versions 4/2; sequence-3 revision/cells/admission/Run/Attempts all 0. Existing sequence-2 Attempts 2 and commands 2, all terminal, external refs 0.
- First authorized sequence-3 apply → failed closed in T1 with changed-replay uniqueness because the proposed WorkOrder content was identical to sequence 2. Post-failure read-only census proved branch unchanged and all sequence-3 counts zero.
- Corrected diagnostic intent changed only WorkOrder title/objective. Resource snapshot remained 2 CPU / 8192 MiB; `max_attempts=1`, timeout 1800, cells and frozen Bundle were unchanged.
- Final apply: revision 1, cells 2, admission 1, PI outbox 2, PI inbox 1, EF inbox 2, VersionLock 1, dependencies 23, RunRecipe 1, TaskSpecs 2, Run 1, RunCells 2, EF outbox 1 = exactly 40 new rows. Relay claimed/delivered 3/3, released/terminalized 0, failures 0.
- Resulting Run: `ef_run_v2_t132_m7_l1_diagnostic_successor_v3_1`; manifest `sha256:ae92cacda8c9cd049b105b4a6324181881ea86de6c4917bbab84003a329a5bcc`. Branch state/head versions 6/3.
- In-process replay and independent restart replay: admission replayed, relay claimed/delivered 0, every allowed-table delta 0. Protected tables 236, changed 0; prior revision/Run/Attempt/ProviderCommand unchanged; new-run Attempt, ExperimentResult, EvidenceCandidate and REU counts 0.
- Updated live runner `offline-preflight` → passed with exact target/Run/Bundle, job ceiling 2, monetary ceiling ¥50, `ecs.g6.large`, existing Attempt count 0, cloud calls 0 and database writes 0.

## M7-L1 provider-manifest v2 persistence recovery — 2026-07-28

Outcome: **fix passed code, migration, disposable PostgreSQL, drift and named-local apply gates; paid execution remains pending**.

- Live attempt effect census before the fix: one provider read (`GetImage`); provider writes 0; `CreateJob` 0/2; billable jobs 0; Attempt rows 0; database/scientific/evidence writes 0. The failure occurred while mapping the in-memory v2 manifest, before the persistence transaction and provider submission.
- `pnpm --filter @paper-engineering-assistant/backend typecheck` → passed.
- `pnpm --filter @paper-engineering-assistant/backend typecheck:experiment-foundation-scripts` → passed.
- Focused backend repository/intake tests → 20/20 passed; focused fixture/payload/bundle/intake tests → 11/11 passed; M7 gate unit tests → 11/11 passed.
- `node .ai/scripts/experiment-foundation-m7-provider-gate.mjs --run-id t132-m7-manifest-v2-20260728-v3 --imported-run-id t132-m7-offline-20260724-v3` → passed M7-01..M7-15. Backend 93/93, shared 12/12 and forced disposable PostgreSQL relational 9/9 passed with zero skips; migration preservation held for all 6 seeded rows and the container was cleaned.
- Gate source population contained 17 exact files with digest `4047ae5e512c2ba7ae1a58f4bfdbc74564067168db382ee1237727e8d679790d`; non-allowlisted provider implementations and duplicate provider implementation counts were both zero.
- `pnpm ci:prisma-drift -- --shadow-url <disposable-pgvector-url> --artifacts-dir .ai/.tmp/t-132/prisma-drift-manifest-v2` → no drift. The dedicated disposable container was stopped and removed.
- `node .ai/scripts/ctl-db-ssot.mjs sync-to-context` → all checksums up to date; context DB contract updated.
- `node .ai/tests/run.mjs --suite database` → passed.
- Separately authorized named-local apply: `pnpm db:dev:migrate` applied only `20260728140500_enable_real_provider_payload_manifest_v2`; post-status reported 71/71 up to date.
- Named-local before/after: 250 application tables, 3,370,691 rows and primary-key/xmin digest `sha256:f0a58c6b836698a830a8b55df27435d2b9a70d763f5a47e1aa0ef72d4949679a` were identical; Pack B counts remained `2/2/12/8/2/2`; exact Run Attempt count remained 0.
- Constraint readback proves simulation=v1, real-provider=v1/v2 and exact relational/JSON discriminator binding. Post-apply production offline-preflight passed with cloud calls 0 and database writes 0.
- Durable evidence: `artifacts/db/m7-l1-provider-manifest-v2-20260728/`.

## M7-L1 controller v2 and production image preflight — 2026-07-28

Outcome: **passed read-only pre-submit boundary; paid execution not started**.

- RAM controller policy v2 is default, v1 remains rollback, and the effective document is semantically identical to repository SHA-256 `c014cac58a794f2bc4849c0c05993ee85fc660dcb6d3206438b08bf7d5c219be`.
- Two independent diagnostic `GetImage` calls returned HTTP 200 with RequestIds `019FA610-3339-5FD0-B94A-D96DE46A36A9` and `019FA610-B208-50B3-9CDA-95A2C3819B9F`. The exact URI, modified time, size, `PUBLIC` accessibility and `Import` source type matched. The public response omitted optional `WorkspaceId`; the installed SDK also types `workspaceId` as optional.
- `pnpm --filter @paper-engineering-assistant/backend typecheck:experiment-foundation-scripts` — passed.
- `pnpm --filter @paper-engineering-assistant/backend experiment-foundation:m7-l1:live -- --mode offline-preflight` — passed against the exact named-local target, Run and frozen ExecutionBundle; existing Attempt count 0, cloud calls 0 and database writes 0.
- With a fresh controller-role STS loaded from a repository-external mode-`0600` file, `pnpm --filter @paper-engineering-assistant/backend experiment-foundation:m7-l1:live -- --mode image-preflight` — passed. Output schema `t132-m7-l1-live-window-image-preflight@v1` reported image request hash `00886de40a879706e6395f5261af18b861b35b958826cb10b303cc59375014d3`, cloud calls 1, provider writes 0, `CreateJob` calls 0 and database writes 0.
- Debug cleanup found no `DEBUG-MODE` or `[DBG:` markers in the changed runner. Deterministic verification threshold: 1/1.
- Final effect census for the production preflight invocation: provider reads 1; provider writes 0; `CreateJob` 0/2; billable jobs 0; Attempt rows 0; database/scientific/evidence writes 0; capability changes 0. The recorded authorization `M7-L1 authorized: 2026-07-28, ceiling ¥50, 2 jobs` remains unconsumed.

## Visualization placement and scope correction — 2026-07-28

Outcome: **corrected; the visualization is no longer a repository artifact and the active plan is personal-use-first**.

- Root `AGENTS.md`, task-continuity guidance and the full `visualize` skill were re-read. The original repo HTML violated the thread-scoped fragment/directory/inline-directive contract.
- Replacement fragment: `/Users/yurui/.codex/visualizations/2026/07/26/019f9bf3-41ce-7580-9bb9-f0a1b68b1b11/t132-personal-experiment-base.html`.
- The bundled visualization renderer successfully wrapped the fragment as `/tmp/t132-personal-experiment-base-rendered.html`. The fragment uses a unique root, local-only interactions, no fetch/XHR/WebSocket and no external data.
- Overview, plan and roadmap now identify the personal-use experiment loop as the active milestone and explicitly park productization work.

## M7-L1 resource-exact successor apply and replay — 2026-07-28

Outcome: **passed on the reviewed named-local PostgreSQL target; successor scope is exactly 40 rows and replay is zero-write**.

- Target: `postgres` / `my_researcher_dev` / `127.0.0.1:5432`, fingerprint `sha256:8851b255b079ad1f049dc1842c41cb3516d5a3ff0b69e21a30e8f2675409cca0`.
- WorkOrder: `pi_experiment_revision_v2_t132_m7_l1_resource_successor_v2_1`, parent sequence 1, sequence 2. Run: `ef_run_v2_t132_m7_l1_resource_successor_v2_1`, manifest `sha256:221824f852a55aae19370c6ceae086b55eac54a9aca383b51baf472980d5a232`.
- Exact runtime intent: two TaskSpecs, each `2 CPU / 8192 MiB`, `max_attempts=1`, `timeout_seconds=1800`; frozen Bundle revision/hash unchanged.
- Row census: revision 1, cells 2, admission 1, PI outbox 2, PI inbox 1, EF inbox 2, VersionLock 1, dependencies 23, RunRecipe 1, TaskSpecs 2, Run 1, RunCells 2, EF outbox 1 = 40.
- Exact replay: admission replayed, relay claimed/delivered/released/terminalized 0, all allowed table deltas 0. Protected tables: 236, changed 0. Prior revision/Run sentinels unchanged. Cycle Attempts, successor ExperimentResult/EvidenceCandidate/REU: 0.

Passed:

```bash
pnpm --filter @paper-engineering-assistant/backend exec \
  tsc -p tsconfig.experiment-foundation-scripts.json --noEmit

T132_M7_RESOURCE_EXACT_SUCCESSOR_APPLY_AUTHORIZATION=\
authorized-2026-07-28-p313-m7-l1-resource-exact-successor-max40-no-cloud \
node --env-file=../../.env.local --loader ts-node/esm \
  scripts/apply-experiment-foundation-m7-executable-lineage.ts

pnpm --filter @paper-engineering-assistant/backend \
  experiment-foundation:m7-l1:live -- --mode offline-preflight
```

- The live runner preflight passed against the successor Run with `job_ceiling=2`, `monetary_ceiling_cny=50`, exact `ecs.g6.large`, `existing_attempt_count=0`, `cloud_call_count=0`, `database_write_count=0`.
- The first post-apply verification invocation failed only on the incorrect branch-state expectation `4 !== 3`; a read-only census proved the complete 40-row lineage and zero prohibited rows before the assertion fix and exact replay verifier.
- Final backend typecheck passed. Provider/OSS targeted suites passed 24/24; the T1-T4 integration spine passed 35/35, including exact executable v2 resource/Bundle propagation and later-head replay cases; shared real-provider schema passed 6/6.
- Strict task-doc lint passed 112/112 with zero errors and zero warnings. `git diff --check` passed.

## M7-L1 P313 ValidationCycle + executable lineage apply — 2026-07-28

Outcome: **passed on the reviewed named-local PostgreSQL target; exact replay added zero rows and no cloud/scientific effect occurred**.

- Target fingerprint: `sha256:8851b255b079ad1f049dc1842c41cb3516d5a3ff0b69e21a30e8f2675409cca0`, database `postgres`, schema `my_researcher_dev`, `127.0.0.1:5432`.
- New scope: Cycle `validation_cycle_t132_m7_l1_p313_v1`, trace `trace_manifest_t132_m7_l1_p313_v1`, branch `pi_experiment_branch_v2_t132_m7_l1_p313_v1_1`, WorkOrder `pi_experiment_revision_v2_t132_m7_l1_p313_v1_1`, Run `ef_run_v2_t132_m7_l1_p313_v1_1`.
- Exact bundle: revision `ef_execution_bundle_revision_2c60e151719be2e109e4b2d3964aaa8c315e0b48`, hash `sha256:458b0e58d93974e3a09b63247bac675d26deef5fdafb111a6eae66177a3b178e`. Frozen Run manifest: `sha256:e0c6c92d3c4a8179cf5d91147e4dff5ef2079d6614a95bf1ce0ca214334094a5`.
- First T2 attempt failed closed on a stale EF v1-only readback assertion and left EF inbox/VersionLock/recipe/task/Run/outbox rows at zero. After exact v1/v2 repository fixes, `pnpm exec tsc -p tsconfig.json --noEmit` and `pnpm exec tsc -p tsconfig.experiment-foundation-scripts.json --noEmit` passed; `node --loader ts-node/esm --test src/repositories/prisma/prisma-experiment-v2-repositories.unit.test.ts` passed 33/33.
- Separately authorized recovery changed only outbox `pi_experiment_outbox_v2_t132_m7_l1_p313_v1_1` from terminal to pending, retained its first attempt count and created no row. Apply relay: claimed 3, delivered 3, released 0, terminalized 0, failures 0, idle after 4 passes.
- Row accounting: 9 authorized rows already present + 35 rows from the final invocation = exact ceiling 44. Exact replay: claimed/delivered 0, new rows 0, idle after 1 pass.
- Integrity: 233 protected application tables unchanged; historical Cycle/closure/branch/Run unchanged. Cloud/provider calls 0, capability changes 0, `CreateJob` 0, billable jobs 0, ExperimentResult 0, EvidenceCandidate 0, RunEvidenceUnit 0.
- Durable closure: `artifacts/implementation/23-m7-l1-executable-lineage-closure.md`.

## M7-L1 authorized executable-lineage apply closed-Cycle preflight — 2026-07-28

Outcome: **the authorized 40-row same-branch apply was not executed because its owning ValidationCycle is durably closed**.

- Authorization was exact for a successor revision on P313/`ragperf-primary`, T1-T4, at most 40 new rows, replay and prohibited-write verification.
- Read-only scope resolution found active ImplementationProject `implementation_project_642a1879-1137-40f5-b340-330b66509975`, but Cycle `validation_cycle_t132_packa_product_p313_v1` is product `completed/completed`.
- Exact closure: `pi_validation_cycle_closure_v2_ec9e5603fedf8753e51a8ad57961c7cfcd7792924df355284bf4217af30ff434`, kind `control_flow_validated_no_paper_evidence`, created `2026-07-25T01:21:34.163Z`, snapshot hash `sha256:cba742d8e7571ebd6b6de651738ede5f96429dd52ebaec6d704c8c90ed521654`.
- The production admission/T2 fences would return `CYCLE_ALREADY_CLOSED` before new lineage writes. No bypass was attempted.
- Effect census: database writes 0/40; cloud/provider calls 0; capability changes 0; `CreateJob` 0/2; billable jobs 0; scientific/evidence writes 0. A new, separately authorized P313 M7-L1 ValidationCycle and Cycle-local branch are required.

## M7-L1 live-window final zero-write preflight — 2026-07-28

Outcome: **blocked before provider submission because the D-23 executable Run lineage is absent; paid authorization was not consumed**.

- Recorded authorization: `M7-L1 authorized: 2026-07-28, ceiling ¥50, 2 jobs`.
- Temporary STS preflight: repo-external file present, owner `yurui`, mode `0600`, four required variables present and unexpired at inspection; no credential value was printed or persisted.
- Named-local census: one PI branch, one admitted WorkOrder revision sequence 1 with `work_order_schema_version=v1`, one EF Run and two RunCells.
- Exact blocker: the sole RunRecipe has `recipe_schema_version=v1`, `entrypoint=experiment-foundation-v2://d19/materialize-only`, and null `executionBundleRevisionId/Hash`. No successor WorkOrder/Run v2 is bound to frozen bundle revision `ef_execution_bundle_revision_2c60e151719be2e109e4b2d3964aaa8c315e0b48`.
- Effect census: database writes 0; capability changes 0; cloud/provider calls 0; `CreateJob` 0/2; billable jobs 0; scientific/evidence writes 0. The next gate is separately authorized named-local successor lineage apply and exact replay, not provider submission.

## M7-L1 fresh pre-submit GetImage comparison — 2026-07-27

Outcome: **passed for exact provider-managed image metadata; no write, capability or paid action occurred**.

- Authorization scope: read-only comparison of `cn-shanghai / image-liuxvj7p2qcnflha84` only.
- One initial CLI attempt stopped locally with `unknown endpoint` and produced no provider RequestId. The explicit endpoint `aiworkspace.cn-shanghai.aliyuncs.com` was then used.
- Successful read 1 RequestId: `019FA414-79EA-53A0-BF7D-B0F7B48266D9`. The response returned the exact ImageId and frozen regional URI, size `3803970629`, accessibility `PUBLIC`, source type `Import`, `Identity=null` and `Signature=null`.
- Successful read 2 RequestId: `019FA414-E2BA-5365-BF54-A72B87AF7825`. The response returned exact `GmtCreateTime=2026-07-02T04:35:35.000Z` and `GmtModifiedTime=2026-07-02T04:35:35.000Z`.
- Comparison against `workloads/ragperf-canary/manifests/execution-bundle-v2.json`: no field drift.
- Provider operation census: successful `GetImage` 2; cloud/provider writes 0; `CreateJob` 0; capability changes 0; credential capture 0; provider compute 0; database/scientific/evidence writes 0.
- The GetImage closure is not image-pull, mount, runtime or scientific acceptance and is not a live-window authorization. Durable evidence: `artifacts/implementation/22-m7-l1-fresh-getimage-closure.md`.

## M7-L1 reviewed ExecutionBundle v2 preparation — 2026-07-27

Outcome: **offline plan, exact same-payload replay, additive migration, disposable PostgreSQL persistence and explicitly authorized named-local migration/freeze/replay passed**.

- `pnpm --filter @paper-engineering-assistant/backend typecheck` → passed.
- `pnpm --filter @paper-engineering-assistant/backend typecheck:experiment-foundation-scripts` → passed.
- Focused planner/apply/service tests → 8/8 passed. The plan freezes one v2 revision from two exact Dataset mirror bindings, rejects artifact/binding/authorization drift and requires the exact six-row apply authorization.
- Direct planner → `status=passed`, database/cloud access `none`, provider operations 0. Planned revision ID is `ef_execution_bundle_revision_2c60e151719be2e109e4b2d3964aaa8c315e0b48`; content hash is `sha256:458b0e58d93974e3a09b63247bac675d26deef5fdafb111a6eae66177a3b178e`.
- Both preview cells materialized twice to byte-identical canonical payloads: top-k-5 `sha256:1655360027fbf970e6d11f1e82e70712376375c5ceff968607c03c15090fd921` (2,796 bytes); top-k-10 `sha256:a671fe0a31bd94b612352e530ff2e934032f9dfc2ea4f353290518b235a7742b` (2,799 bytes). Network/provider/`CreateJob`/scientific writes were 0.
- First disposable run `v1` correctly rejected v2 at the existing v1-only draft CHECK. After the additive migration, the bundle relational test passed exact v2 draft/freeze/replay/resolve and rejected relational discriminator/JSON mismatch.
- Runs `v2` through `v5` exposed a stale real-provider relational fixture/reader that still assumed redacted manifest v1, its old redacted field set and an obsolete profile literal. Production reader and fixture were corrected to the existing v1/v2 shared contract; no capability or provider behavior changed.
- Final `node .ai/scripts/experiment-foundation-m7-provider-gate.mjs --run-id t132-m7-bundle-freeze-20260727-v6 --imported-run-id t132-m7-offline-20260724-v3` → passed M7-01..M7-15. Shared targeted 12/12, backend targeted 92/92 and forced disposable relational 9/9 passed with zero skips; named database writes, provider/OSS calls, `CreateJob`, cloud cost and scientific/evidence writes were 0.
- Before named-local apply, the reviewed target fingerprint was `sha256:8851b255b079ad1f049dc1842c41cb3516d5a3ff0b69e21a30e8f2675409cca0`; all six bundle tables were 0 and the only pending migration was `20260727170000_enable_execution_bundle_schema_v2`.
- With the exact supplemental authorization, `prisma migrate deploy` applied only that migration. `prisma migrate status` then reported up to date, and readback proved both CHECKs admit only v1/v2 while binding the relational discriminator to the JSON snapshot version.
- Named-local r1 → passed; created rows 6, exact reused 0. Scoped census is exactly one identity, draft, revision, lifecycle event, lifecycle projection and readiness. r1 SHA-256: `c39d59beb540fd72c76eac544518e41656e6cfabc316f9227ea275ffc53b0f50`.
- Named-local r2 exact replay → passed; created rows 0, exact reused 6; scoped census remained exactly 6. r2 SHA-256: `4bc96801bb88896b4d25dd0aa4215bae8d8476573fb8504b74b5902a37d0358c`.
- Both named-local runs validated the reviewed target fingerprint, 244 protected application tables unchanged, external fetch 0, cloud operations 0, provider writes 0, `CreateJob` 0 and scientific writes 0.
- Independent server-enforced read-only post-check returned table counts `[1,1,1,1,1,1]`, revision schema `v2`, hash profile `ef-execution-bundle-semantic-json@v1`, the reviewed content hash and readiness `passed`.
- Post-apply `ctl-db-ssot sync-to-context` and `node .ai/tests/run.mjs --suite database` passed. No capability, credential, cloud read/write, PAI Job, scientific result or evidence row was introduced.

## M7-L1 SciFact named-local authority landing — 2026-07-27

Outcome: **bounded named-local apply, zero-new replay and exact mirror binding passed; bundle/cloud/provider/scientific work remained zero**.

- Authorization: exact 26-row named-local SciFact authority apply only; bundle freeze and cloud access explicitly excluded.
- r5 apply: `status=passed`; exact census 2 DataPolicy identities/revisions/receipts + 2 Dataset identities/revisions/receipts + 10 lifecycle events + 4 lifecycle projections = 26 rows. Counters created 4 identities, 4 revisions, 10 events and 4 projections.
- r6 replay: `status=passed`; exact census remained 26. Counters created 0 and exact-reused 4 identities, 4 revisions, 10 events and 4 projections.
- Both successful runs validated the reviewed local target fingerprint, 242 protected application tables unchanged, external fetch 0, cloud operations 0, provider writes 0, `CreateJob` 0 and scientific writes 0.
- `scifact-mirrors-v1.json` binds both uploaded mirrors to the exact persisted Dataset revision IDs, revision sequence 1 and immutable content hashes. Direct planner verification accepts both bindings and rejects exact-ref drift.
- r5 evidence SHA-256: `f4fc920b1f36e82b4774e1ae5531bfb101162f9eb98ed838fdca23a67ae09d6a`; r6 evidence SHA-256: `b875ca7f29f158269b6e24028a138b6d5bec6eff4a33f5689dd0b23c1d120066`.
- Pre-write failure evidence remained fail-safe: r1 rejected an `id`-less protected table; r2 and r4 were manually stopped while still in the before-digest; r3 rejected an unsupported `information_schema.sql_identifier` result. An independent server-enforced read-only census after every attempt confirmed all eight SciFact families remained zero before r5.
- Final implementation uses each table's `id` or exact primary-key columns plus PostgreSQL `xmin` as the ordered negative-space signature. The signature detects insert/update/delete across all protected tables without materializing 3072-dimensional vectors.

## M7-L1 SciFact authority planning — 2026-07-27

Outcome at the planning checkpoint: **read-only named-local inventory, database-free authority planning and offline importer verification passed; the later authority-landing section supersedes the apply status**.

- Named-local inventory ran in `REPEATABLE READ` with server-enforced `SET TRANSACTION READ ONLY`; `transaction_read_only=on`.
- The inventory found exactly the historical `ragperf-wikipedia-corpus` and `ragperf-natural-questions-workload` Dataset revisions plus their two DataPolicy revisions. No SciFact identity/revision existed.
- Official source-policy review reconfirmed the upstream SciFact split: claims use `CC-BY-4.0`; corpus abstracts use S2ORC `ODC-By-1.0`. The authoring manifest pins upstream commit `68b98a56d93e0f9da0d2aab4e6c3294699a0f72e`.
- `pnpm --filter @paper-engineering-assistant/backend run typecheck:experiment-foundation-scripts` → passed, including Prisma Client generation and the new planner.
- At the planning checkpoint, the focused suite was 6/6. After mirror binding validation was added, the same command passed 7/7, including persisted Dataset binding drift rejection.
- Direct planner execution → `status=passed`, `database_access=none`, `cloud_access=none`.
- The planner froze 2 DataPolicy and 2 Dataset revisions in memory, and verified exact mirror role/ordinal/path/record-count/byte/SHA-256 agreement. Planned exact hashes are recorded in `03-implementation-notes.md`.
- Corrected planned future write census: 4 identities, 4 revisions, 4 freeze receipts, 10 lifecycle events and 4 lifecycle projections = 26 rows total; 0 readiness attestations and 0 ExecutionBundle revisions. The original 22-row list omitted the repository-maintained projections and therefore did not authorize an apply.
- CLI negative-space check with `T132_SCIFACT_NAMED_LOCAL_APPLY_AUTHORIZATION` absent failed closed before database connection with the exact corrected-scope error. The importer also requires the reviewed named-local target fingerprint, denies global fetch, and digests every application table outside the eight expected families.
- An initial post-run JSON extraction wrapped the planner with `pnpm`, whose human-readable package banner made the redirected file non-JSON. Direct Node invocation produced the exact machine summary; no planner assertion, database operation or cloud operation failed.
- The planning checkpoint's final server-enforced read-only census remained unchanged at 2 historical Dataset identities/revisions and 2 historical DataPolicy identities/revisions; SciFact counts remained 0. The later bounded landing intentionally supersedes only the SciFact row census.
- No database write occurred during planning. The later landing wrote exactly the separately authorized 26 named-local rows; cloud/provider access, capability change, credential, bundle freeze, `CreateJob` and scientific write remained 0 throughout.

## M7-L1 provider-managed image identity contract — 2026-07-27

Outcome: **targeted checks, type checks and full shared/backend regression passed**.

- `pnpm --filter @paper-engineering-assistant/shared typecheck` → passed.
- `pnpm --filter @paper-engineering-assistant/backend typecheck` → passed after the normal Prisma Client generation precheck; no Prisma schema changed.
- Shared direct schema test for `experiment-foundation-real-provider-v2-contracts.schema.test.ts` → 6/6 passed.
- Backend direct tests for ExecutionBundle service and real-provider payload materializer → final 7/7 passed, including exact v2 freeze/resolve.
- Shared full suite: `pnpm --filter @paper-engineering-assistant/shared test` → 398/398 passed.
- Backend full suite: `pnpm --filter @paper-engineering-assistant/backend test` → 2,418 tests, 2,356 passed, 0 failed and 62 conditional skips.
- After the full run, one additional positive v2 freeze/resolve assertion was added; the final direct 7/7 suite and backend typecheck passed against that exact source state.
- Positive coverage accepts the exact PAI provider-managed v2 identity and redacted manifest v2. Negative coverage rejects a surrogate `image_digest`, a scientific scope value and cross-region image URI drift.
- Compatibility coverage retains the original v1 OCI digest and v1 redacted manifest path. Provider-managed durable JSON contains neither raw ImageId nor raw ImageUri.
- The first shared schema run failed because `size_bytes=3,803,970,629` exceeded the generic Int32 schema. The corrected JSON-only safe-integer field passed without altering any PostgreSQL Int boundary.
- Provider/cloud writes, capability changes, credentials, `CreateJob`, database writes and scientific evidence writes were all zero.

## M7-L1 SciFact source and OSS input upload closure — 2026-07-27

Outcome: **passed for deterministic source/slice preparation, three exact OSS
input objects and remote/local integrity; live provider execution remains
unauthorized**.

- Official BEIR archive MD5 matched
  `5f7d1de60b170fc8027bb7898e2efca1`; downloaded archive SHA-256 is
  `536e14446a0ba56ed1398ab1055f39fe852686ecad24a6306c80c490fa8e0165`.
- JSONL validation passed for the complete 5,183-record corpus and 300-query
  test slice. Query IDs are unique and exactly match the unique IDs referenced
  by `qrels/test.tsv`; source order is preserved.
- Before upload, regional-endpoint `aliyun oss stat` returned `NoSuchKey` for
  all three exact content-addressed targets. No existing object was overwritten.
- All three `aliyun oss cp` commands reported one successful object and the
  exact expected size: 7,916; 56,640; and 8,106,566 bytes.
- Post-upload `aliyun oss stat` and local `ossutil hash` agree:

| Object | Remote bytes | Local/remote CRC64-ECMA | Result |
|---|---:|---:|---|
| `entrypoint.py` | 7,916 | `1815526306812411307` | pass |
| `corpus.jsonl` | 8,106,566 | `8566302686400034898` | pass |
| `queries.jsonl` | 56,640 | `14258960024956570564` | pass |

- Cloud Shell used temporary logged-in credentials; no AK/SK or STS value was
  captured. The optional Cloud Shell NAS creation was declined.
- Durable evidence:
  `artifacts/implementation/21-m7-l1-oss-input-upload-closure.md`.
- Negative-space result: NAS/ACR/DLC job count delta 0; capability changes 0;
  `CreateJob` 0; provider compute 0; scientific/database/evidence writes 0.

## M7-L1 official-image address and DLC OSS authorization preflight — 2026-07-27

Outcome at the historical preflight checkpoint: **provider image address and platform OSS dependency passed; image identity was then unresolved; no write or billable action occurred**. The `M7-L1 provider-managed image identity contract` verification section supersedes the identity blocker.

- The workspace official-image table and read-only [`GetImage`](https://help.aliyun.com/zh/pai/developer-reference/api-aiworkspace-2021-02-04-getimage) request agreed on `ImageId=image-liuxvj7p2qcnflha84`. The API returned HTTP 200, RequestId `019FA081-E47D-52E2-8468-FBCF1C11B46F`, and exact `ImageUri=dsw-registry-vpc.cn-shanghai.cr.aliyuncs.com/pai/torcheasyrec:1.3.0-pytorch2.12.1-cpu-py311-ubuntu22.04`.
- Returned metadata was region `cn-shanghai`, accessibility `PUBLIC`, source type `Import`, size `3803970629`, and create/modify time `2026-07-02T04:35:35.000Z`. The console row advertises CPU, PyTorch 2.12, Python 3.11 and DSW/DLC support.
- The response contained no content digest and returned null `Identity`/`Signature`. The response passes exact address/provider-asset resolution but does not satisfy the existing ExecutionBundle `container_image.image_digest` contract. No surrogate tag, `ImageId` or metadata hash is accepted as that digest.
- The PAI account-level “开通和授权 → 全部云产品依赖” page showed DLC → OSS data storage `已开通`, consistent with the documented separate [DLC authorization prerequisite](https://help.aliyun.com/zh/pai/grant-the-permissions-that-are-required-to-use-dlc). The unsubmitted create-job form exposed OSS URI, mount path, read-only and RAM-role controls.
- The local workload manifest resolved to one exact upload candidate: `entrypoint.py`, SHA-256 `9b2a82298dfa969146e5e223893d3d86c6254cb16a995be72b65709a55b4f05d`, 7,916 bytes, at a future internal OSS directory whose path contained the same digest. Local re-hashing and byte counting matched the manifest; its upload state at the preflight checkpoint was `not_uploaded`.
- The DLC task count remained zero. The form was not submitted; object uploads, capability changes, credential capture, `CreateJob`, provider/database/scientific writes and billable execution were all zero at the preflight checkpoint. The `M7-L1 SciFact source and OSS input upload closure` section supersedes only the object-upload census.

## M7-L1 official-image + OSS provider-shape implementation — 2026-07-26

Outcome: **offline compatibility increment passed; cloud execution remains unauthorized and unproven**.

- Shared full suite: `pnpm --filter @paper-engineering-assistant/shared test` → 397/397 passed.
- Shared/backend type checks: `pnpm --filter @paper-engineering-assistant/shared typecheck` and `pnpm --filter @paper-engineering-assistant/backend typecheck` → passed; backend precheck regenerated Prisma Client without schema changes.
- Backend full suite: `pnpm --filter @paper-engineering-assistant/backend test` → 2,416 tests, 2,354 passed, 0 failed, 62 conditional skips.
- Focused provider/OpenAPI regression: direct Node test invocation over payload, transport, intake, OpenAPI drift and route coverage → 14/14 passed.
- Workload selftest: both `retriever-top-k-5` and `retriever-top-k-10` completed against local mounted-directory fixtures; result envelopes matched the repository canonical JSON bytes and diagnostic stats were non-empty.
- OpenAPI: strict quality check passed; `ctl-api-index` regenerated 200 endpoints and strict checksum verification passed.
- Negative coverage proves fail-closed behavior for unbound commands, digest/path substitution, nested mounts, mirror ordinal drift, full-profile expansion and role/artifact-size rematerialization drift.
- The full backend test command ignores appended file arguments and therefore ran the complete suite; the focused suites were then invoked directly with Node. An earlier shared command appended a nonexistent explicit path and failed at invocation, after which both the direct focused test and the canonical full package suite passed. These were harness-invocation errors, not product failures.
- Cloud write census for the 2026-07-26 implementation increment: OSS uploads 0, `CreateJob` 0, provider writes 0, capability changes 0, credential capture 0, billable execution 0. The 2026-07-27 preflight separately verified the exact provider image address and account-level PAI/DLC OSS authorization. The `M7-L1 SciFact source and OSS input upload closure` section now proves exact object existence; no checkpoint proves an actual image pull, in-container runtime access or live result collection.

## M7-L1 official-image + OSS compatibility review — 2026-07-26

- The ACR personal-instance submission was rejected by the provider with `个人版仅限个人用户使用，请实名认证为个人账号。`; the ACR resource census stayed zero and no fee was incurred.
- Official PAI `CreateJob` documentation exposes `JobSpecs[].Image`, `UserCommand`, `DataSources`, `Envs` and `CredentialConfig`; official DLC storage documentation confirms OSS direct mounts and read/write access at the mounted path.
- The pinned Aliyun SDK model independently exposes `CreateJobRequest.dataSources`, `envs` and `credentialConfig`; each data source supports `Uri`, `MountPath`, `MountAccess` and `RoleChain`, while credential configuration supports role ARN injection.
- Static repository inspection confirmed the current shared schema/materializer/official-SDK wire map omit all three required binding families. The existing ExecutionBundle contains code/image/dataset identity fields, but the provider request does not consume them. The review therefore classifies the route as provider-supported but repository-incomplete.
- The accepted remediation was a bounded default-off implementation increment with schema, canonical payload, redaction/hash, SDK mapping and negative tests. The 2026-07-27 preflight closed the exact `ImageUri` and platform-side OSS authorization gates; the `M7-L1 provider-managed image identity contract` verification closes the diagnostic identity decision.
- Full evidence and primary-source links are recorded in `artifacts/implementation/20-m7-l1-official-image-oss-compatibility.md`.
- Scope result: documentation/research only; OSS uploads, credentials, capabilities, `CreateJob`, provider writes, database writes, scientific writes and billable execution all remained zero.

## M7-L1 OSS step A and RAM policy materialization — 2026-07-26

- Aliyun OSS console showed bucket `pea-m7-canary-6194-202607` under 华东2（上海）/`cn-shanghai`, creation time `2026-07-26 17:03`, Standard storage, local redundancy, private ACL and “文件不可以被公共访问”.
- The server-side encryption page showed OSS fully managed encryption with AES256. The lifecycle table showed `pea-output-delete-30d`, prefix `output/`, 30-day deletion for complete files and fragments, status `启用中`.
- `jq empty workloads/ragperf-canary/ram/controller-policy.json workloads/ragperf-canary/ram/runtime-policy.json` passed after exact-bucket materialization.
- `rg -n 'BUCKET_NAME' workloads/ragperf-canary/ram` returned no matches.
- `shasum -a 256 workloads/ragperf-canary/ram/*.json` returned controller `ddde63f223f8d1982da124414ff8224aa7a431f56b51af834030b4fb681f4d8c` and runtime `68d911b2ecfdac5d3ddb32c4d7294fb9d793b8aee527bec18c989f987e7ca5c8`.
- Exact `jq` assertions passed: controller has no OSS write Allow and explicitly denies `oss:PutObject`; runtime has no PAI-DLC Allow and explicitly denies `paidlc:*`; neither policy retains a placeholder.
- `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main` completed and `lint --check` passed. Two pre-existing migration warnings remain in unrelated T-124 bundles with non-canonical State text.
- BYOC direction markers, credential-shaped token scan and `git diff --check` passed.
- Scope result at the 2026-07-26 checkpoint: OSS step A passed. RAM console acceptance, ACR, dataset objects/manifests, STS and every live provider/billable operation were then unverified and unauthorized. Later dated sections supersede the RAM and object-preparation state; STS and live provider/billable execution remain open.

## Aliyun public-resource preflight mode — 2026-07-22

- Shared v2 schema tests passed 3/3 and cover both modes plus caller expansion, missing exact quota, fake public quota, manifest-mode/redaction mismatch and public non-null resource hash. Backend cloud-preflight tests passed 11/11, including official SDK omission round-trip, payload↔manifest and top-level execution-profile-hash substitution, exact-quota pagination, and rejection of a public transport ledger containing more than one `ListResources` read.
- Gate meta tests passed 4/4. Unknown mode and `public_resource` plus `RESOURCE_ID` both return controlled `blocked` before database/provider access, with zero provider operations/writes. Shared, backend and experiment-foundation script typechecks passed; env-contract validate/generate passed and derived artifacts contain no secrets.
- Joint shared full suite passed 386/386 after the Pack C event-union merge. Final current-tree backend full passed 2,358 tests: 2,301 passed, 0 failed, 57 explicit conditional relational/live-provider skips, 0 todo, duration `429955.191417ms`; those skips are never used as public-resource acceptance evidence.
- PAI console read-only inspection confirmed zero general-compute quota, the product-selected `public_resource` lane, workspace `1450165`, and the official CPU image `torcheasyrec:1.3.0-pytorch2.12.1-cpu-py311-ubuntu22.04`; the create form was not submitted and no job was created.
- Runner `cloud-preflight-public-resource-offline-20260722-r2` used that exact image reference and returned expected `blocked` because capability, STS and reviewed external policy evidence remain absent. CP01-05 and CP10-12 passed; CP06-09 remain blocked. Configuration reports `resource_mode=public_resource` and `execution_profile_complete=true` without a resource ID.
- Both exact two-cell payloads passed offline schema/SDK/hash/redaction checks. Their byte sizes are 354/355 and hashes are `sha256:d460d32eb8225141959b6d2744174f9576bef4d8898c988327bee28b2c052989` / `sha256:45e32261a38aec77142ebfe967c75e5126f28713f9e7071569379c8d363bf1d2`; each manifest is v2 with `resource_id_hash=null` and no `ResourceId` redaction entry. Summary SHA-256 is `41c32e433e0ab6f8b51eb31e8c429a85156b7bbf14966ffdb66c260db763f834`.
- Named-local evidence used a server-enforced read-only transaction over all 88 protected tables with `changed_tables=[]`. Provider transport operations, provider write requests, CreateJob calls, provider writes, database writes and scientific writes are all 0; scientific state remains `not_started` and evidence eligibility false.
- The checkpoint validates the public-resource control spine only. The frozen official CPU image was not pulled or submitted, so the checkpoint does not establish real STS signing, RAM-policy acceptance, workspace/spec API responses, public scheduler capacity or any scientific result.

### Controlled live read-only retry evidence — 2026-07-22

- `cloud-preflight-public-resource-readonly-20260722-r3`: `GetWorkspace` and `ListResources` succeeded; `ListEcsSpecs` failed under the two-action STS policy. The operation ledger contained only the three intended reads. Provider write requests, CreateJob calls, provider writes, database writes and scientific writes were all 0; all 88 protected tables were unchanged. Summary SHA-256: `37ff55b08ce04ebcdeb06ae7b76a11bf4d574f22c70e5e5245d64e3dcff67244`.
- After adding only inferred `paidlc:ListEcsSpecs`, the focused backend file passed 12/12, including provider-error redaction; the cloud gate meta suite passed 4/4; backend and specialized runner typechecks passed.
- `cloud-preflight-public-resource-readonly-20260722-r4`: exit 2 / `status=blocked` with `ALIYUN_IDENTITY_POLICY_EVIDENCE_INVALID` before provider transport because the one-off wrapper did not canonicalize the STS expiration timestamp to millisecond UTC. CP01-05 and CP10 passed; CP06-09/11/12 blocked. Provider transport operations, provider writes, CreateJob calls, database writes and scientific writes were all 0. Summary SHA-256: `a4c56386b404ad6d9a9118a799905f19f3cf71bfaede28cb682e832144b66465`.
- The r4 temporary credential and reviewed-evidence directory was removed unconditionally, no cloud credential environment variable remained in the shell, and the browser left the credential response page. No second STS was issued. Real `ListEcsSpecs` acceptance remains pending a separately authorized rerun with canonicalized evidence time.
- `cloud-preflight-public-resource-readonly-20260723-r5`: expiration was canonicalized before evidence hashing; production evidence parsing and independent digest verification passed. The exact ledger was `AIWorkspace.GetWorkspace succeeded`, `AIWorkspace.ListResources succeeded`, `PaiDlc.ListEcsSpecs failed`. The failure was safely classified as `ALIYUN_READ_ONLY_PROVIDER_CALL_FAILED`; no raw provider diagnostics entered the summary.
- r5 write census: provider transport operations 3; provider write requests 0; CreateJob calls 0; provider writes 0; database writes 0; scientific writes 0. The server-enforced read-only fence covered 88 tables with `changed_tables=[]`; scientific execution stayed `not_started` and evidence eligibility stayed false. Summary SHA-256: `e8c2c89c56b05dec9ac9758eb2aa6044d17827355ee1585b69b9828bde1fb774`.
- The temporary r5 credential/evidence directory was removed in `finally`, the shell retained no cloud credential variables, and the browser left the credential response. The gate is honestly `failed`, not passed or blocked. No further retry is authorized; acceptance remains open pending read-only effective-permission review of the assumed role and any separately approved IAM remediation.
- The 2026-07-23 read-only RAM review completed that effective-permission check. `cloud-0001` had 10 account-level system policies and, critically, `AdministratorAccess`; the captured list contained no custom policy or separate deny policy. Because the system administrator policy already grants all actions/resources, the role does not need an additional `paidlc:ListEcsSpecs` Allow and the IAM change census is exactly 0.
- The audit closes only the “missing role Allow” hypothesis, not CP06-09 or the live preflight. `ListEcsSpecs` authorization metadata remains absent from the reviewed public API documentation, so the inferred session action is unconfirmed. No console mutation, policy attach/detach, STS issue, provider retry, CreateJob, database write or scientific write occurred during the audit.

### HTTP 400 isolation and successful r6 — 2026-07-23

- Gate-1 diagnostic `dbg-20260722-223758-bd92` used one STS and stopped at the first failure: minimal ECS page-10 request returned HTTP 200 / total 149 (RequestId `019F8C01-9148-50F1-B22E-60A7DD6A66C7`); adding only `AcceleratorType=CPU` returned HTTP 200 / total 108 (RequestId `019F8C01-929D-5589-8375-796310B0B2E7`); adding only `SortBy=CPU` returned HTTP 400 `BadRequest` (RequestId `019F8C01-9394-5DC6-8C15-0D7C417CDD8C`). Provider reads=3; provider writes/CreateJob/database operations=0.
- Production fix verification: focused backend tests 12/12, cloud gate meta 4/4, backend typecheck passed and experiment-foundation script typecheck passed. Tests assert `PageSize=10`, `AcceleratorType=CPU`, `ResourceType=ECS`, absent `SortBy/Order`, exact pagination, and safe provider status/code/RequestId retention without raw diagnostic leakage.
- `cloud-preflight-public-resource-readonly-20260723-r6` returned `cloud_preflight_passed`; CP01-CP12 all passed. Workspace RequestId `019F8C15-90E7-5870-83CE-56A703091304` and resource RequestId `019F8C15-9156-572C-BA70-635AE5A51BA5` succeeded. Eleven successful DLC pages reported 108 visible CPU specs and 105 available; final RequestId `019F8C15-9E22-590D-BBDB-E75046DA155D`.
- r6 write census: provider transport operations 13; provider write requests 0; CreateJob calls 0; provider writes 0; database writes 0; scientific writes 0. The server-enforced read-only fence covered 88 tables before/after with `changed_tables=[]`; scientific execution remained `not_started`, evidence eligibility remained false, and the product capability was restored to its default-off posture.
- r6 summary path: `.ai/.tmp/experiment-foundation-productization/cloud-preflight-public-resource-readonly-20260723-r6/summary.json`; SHA-256 `ae524752ef64f658ddfb796e8c0834bf0903baadf1c8e79cfbc392887c516053`. External credential/evidence files, clipboard content and temporary debug/wrapper code were removed after the run. The result is read-only cloud acceptance only; the result does not authorize or prove CreateJob, scheduler/image/runtime behavior or scientific output.

## Zero-write Aliyun cloud-preflight implementation — 2026-07-18

- Shared cloud-preflight contracts passed 2/2; backend exact payload/read-only-policy/official-SDK-pagination/same-payload tests passed 8/8; gate meta tests passed 3/3. Shared, backend and experiment-foundation script typechecks passed.
- Env contract validation/generation passed for `dev`, `dev.local`, `staging` and `prod`; environment suite passed. The capability default remains `false`, no secret values were generated, and no remote cloud target was registered.
- Shared full passed 359/359. Backend full completed 2,247 tests: 2,197 passed, 0 failed, 50 explicit conditional database/provider skips, 0 todo, duration `417301.75475ms`; those skips are not cloud or relational acceptance evidence.
- Final runner `cloud-preflight-local-20260718-r9` returned exit 2 / `status=blocked`, which is the required fail-closed result for the current configuration. Source Pack B evidence SHA-256 is `7cc6044bc3822e4197f99638b09b7a4f9e90640bb205cde929f98df2b998e9c7`; r9 summary SHA-256 is `77f8f9973f2237e706216c894d55ff44657c6bede27fd32e42c0c6e09a3b07ea`.
- CP01 exact scope, CP04 write hard deny, CP05 read-only allowlist, CP11 zero cloud writes and CP12 zero scientific writes passed. CP02/03/10 are blocked by `ALIYUN_EXECUTION_PROFILE_INCOMPLETE`; CP06-09 remain blocked while the capability is disabled and temporary STS/reviewed policy evidence plus its independent exact-file digest are absent. The gate did not synthesize payload/fake-lifecycle evidence under incomplete profile.
- The exact named-local Run is `ef_run_v2_c4ab7919-2d7b-415c-ab53-201b11464aca`, manifest `sha256:8965ebdfd39f899a56ff242aedc968c0b29dd8048a2cecba1ac3ecdb9342d915`, with two ordered cells. Target/scope/digest resolution ran inside one server-verified read-only repeatable-read transaction. All 88 protected-table digests matched before/after; provider transport operations=0, provider write requests=0, CreateJob calls=0, database writes=0 and scientific writes=0. Scientific status remains `not_started`; evidence eligibility remains false.
- The r9 evidence verifies the implementation and current fail-closed posture only. The evidence does not pass the real read-only cloud checks, close EF-P16, prove signing/endpoints/workspace/quota availability, or validate scheduler/image/mount/network/accelerator/command/log/result/cancel/cleanup behavior. Durable evidence is `artifacts/cloud-preflight-implementation-20260718/00-implementation-closure.md`.
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
- Historical checkpoint before the final producer-provenance republish: local source evidence digests were gate `b0973025be9c94bdd127f30a877b9a87ae974cf39cef0025800609ddd830b0e1` and app smoke `08e588b98e836f5ea732e83411d0df2fede1efa6021dfbf79c64abd8f1baaa5c`; the then-published JSON SHA-256 values were `6003bc6a00c14ffbd0c890803ea8830a29d215ca1ea90e3d45f153c11d3536f2` and `572c4bc6b1acabc9fb62be7500cf58508972cf41c2ad12701ed6c4569aa2d417`. These are historical hashes, not the current checked-in file hashes recorded in the final deep-cleanup section.

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

The final run preserved the exact one-revision/two-cell/one-Run/one-head/one-ack authority state, four domain-local commits, three delivered events, 197-table non-v2 digest parity and zero excluded writes. EF-P25 is verified. At the time of the source-backed run, EF-P27 remained in progress pending separately authorized DB apply and product-writer cutover; the later Pack A named-local landing verified EF-P27 for the local-development target only.

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

## 2026-07-19 — Pack C C-EF step 4 verification

| Check | Outcome |
|---|---|
| `cd apps/backend && npx tsc -p tsconfig.json --noEmit` | passed; exit 0; Prisma and in-memory adapters typecheck under strict TypeScript |
| `cd apps/backend && node --test --loader ts-node/esm src/services/experiment-foundation-v2-scientific-validation-service.unit.test.ts` | passed 13/13; 0 failed, 0 skipped, 0 todo |
| shared typecheck | not run because no file under `packages/shared` changed |
| database/migration | not run; C-EF step 4 did not apply migrations or touch a database |

Coverage includes passed atomic report/Candidate/outbox with exact result/report/Candidate/payload/envelope hashes, injected rollback, failed and unsupported report-only outcomes, incomplete batch, simulation/fake provenance, manifest drift, result replay/conflict, same/different validation-key convergence, cross-Run idempotency conflict, caller-owned server-field rejection and absent head-ack zero validation writes.

Optional whole-bundle strict docs lint reported 0 errors and 8 pre-existing vague-reference warnings in older T-132 planning/readiness/artifact files after the new C-EF wording was cleaned; historical unrelated files were preserved.

## 2026-07-19 — Pack C C-EF step 5a verification

| Check | Outcome |
|---|---|
| `cd apps/backend && npx tsc -p tsconfig.json --noEmit` | passed after implementation and again after the repository-access assertion fix; exit 0 |
| modified backend tests via `node --test --loader ts-node/esm` | final scoped population passed 39/39 with 1 conditional Prisma-parity skip in the five-file run; the strengthened execution file rerun passed 10/10 |
| modified shared schema test via `node --test --loader ts-node/esm src/research-lifecycle/experiment-v2-contracts.schema.test.ts` | passed 17/17; 0 failed, 0 skipped |
| `cd packages/shared && npx tsc -p tsconfig.json --noEmit` | passed; exit 0 |
| `pnpm --filter @paper-engineering-assistant/shared test` | passed 374/374; 0 failed, 0 skipped |
| first exact `pnpm --filter @paper-engineering-assistant/backend test` | 2,292 tests: 2,228 passed, 14 failed, 50 skipped; six unrelated Prisma rollback tests attempted the local `DATABASE_URL` and failed because sandboxed TCP could not reach `127.0.0.1:5432`; no modified targeted file failed |
| no-DB conditional rerun: `DATABASE_URL='' pnpm --filter @paper-engineering-assistant/backend test` | 2,292 tests: 2,228 passed, 8 failed, 56 skipped; the six Prisma cases became their documented conditional skips; remaining failures are outside the changed files |
| isolated unrelated literature diagnostic | the two observed literature route polling failures reproduced with only those names selected: content-processing remained non-terminal/`PARTIAL` beyond the fixed 40×10ms poll; no EF closure code was involved |
| `git diff --check` | passed before documentation update and at final handoff |
| whole-bundle strict docs lint | 0 errors and 8 pre-existing vague-reference warnings in older T-132 files; the new step-5a report adds no warning |

One intermediate two-file rerun failed 1/14 because the newly strengthened execution test omitted `executionRepository` from its local fixture destructuring. The test-only omission was corrected; backend typecheck and the affected file then passed 10/10. No product-code defect was involved.

## 2026-07-20 — Pack C C-EF step 5b verification

| Check | Outcome |
|---|---|
| `cd apps/backend && npx tsc -p tsconfig.json --noEmit` | passed; exit 0 |
| `cd packages/shared && npx tsc -p tsconfig.json --noEmit` | passed; exit 0 |
| `pnpm --filter @paper-engineering-assistant/shared test` | passed 374/374; 0 failed, 0 skipped, 0 todo |
| `pnpm --filter @paper-engineering-assistant/backend test` | 2,292 tests: 2,228 passed, 14 failed, 50 conditional skips, 0 todo; exact totals match the documented step-5a sandbox baseline. Six Prisma rollback tests plus T-054/T-067 report unreachable `127.0.0.1:5432`; the remaining pre-existing literature integration failures are outside the changed files. No in-scope targeted test failed. |
| focused EF execution + PI live adapter tests | passed 21/21; 0 failed, 0 skipped; includes entry-closure zero-write assertions and unchanged PI error propagation |
| desktop typecheck | passed via `pnpm --filter @paper-engineering-assistant/desktop typecheck`; exit 0 |
| API index/OpenAPI checks | `node .ai/scripts/ctl-api-index.mjs verify` current; `node .ai/scripts/ctl-openapi-quality.mjs verify --strict` passed; no regeneration required |

## 2026-07-20 — Pack C C-EF step 6 verification

| Check | Outcome |
|---|---|
| `cd apps/backend && npx tsc -p tsconfig.json --noEmit` | passed; exit 0 after the relational lane and again after the service-level unsupported-outcome test-port injection |
| `node --test .ai/scripts/experiment-foundation-packc-ef-gate.unit.test.mjs` | passed 6/6; 0 failed, 0 skipped |
| direct engine suite | passed 9/9; 0 failed, 0 skipped |
| direct scientific validation service suite | passed 13/13; 0 failed, 0 skipped |
| direct shared scientific schema suite | passed 12/12; 0 failed, 0 skipped |
| direct 5a service-layer closure suites | passed 34/34; 0 failed, 0 skipped |
| disposable identity/guard unit suite | passed 7/7; 0 failed, 0 skipped |
| `node .ai/scripts/experiment-foundation-packc-ef-gate.mjs --run-id packc-ef-20260720-r1` | expected sandbox result: exit 2, `blocked`; 68/68 non-relational tests passed, PC01-PC05 + PC19-EF passed, PC06/PC07 blocked, Docker daemon unavailable, no existing DB used |
| sandbox summary | `.ai/.tmp/experiment-foundation-productization/packc-ef-20260720-r1/summary.json`; canonical SHA-256 `sha256:efa5c836e7942c8eb0df1f352619feebe1c1d1fcadb9a1840f9a6ae4636a7750` |
| real PostgreSQL relational lane | PENDING host run; the checked-in gate must report four passed, zero failed, zero skipped before C-EF step 6 can close |

## 2026-07-20 — Pack C C-PI step 3 verification

| Check | Outcome |
|---|---|
| `cd apps/backend && npx tsc -p tsconfig.json --noEmit` | passed; exit 0 after final repository/readback tightening |
| `cd apps/backend && node --test --loader ts-node/esm src/services/paper-implementation-evidence-trust-gateway-service.unit.test.ts` | passed 19/19; 0 failed, 0 skipped, 0 todo |
| shared typecheck | not run because no file under `packages/shared` changed |
| `git diff --check` | passed before documentation finalization |
| optional whole-bundle strict docs lint | first run: 0 errors/12 warnings, including 2 in the new report; final run: 0 errors/10 pre-existing warnings and no warning in the new report; strict mode remains nonzero on the historical baseline |

The 19 assertions cover one atomic eligible ingestion, exact replay without EF reread/new writes, first-seen payload-hash tamper, changed-envelope event-id conflict, four branch/revision scope-drift receipts, six Candidate/report/hash/status rejections, protocol provenance rejection, injected all-or-nothing rollback, identity-only readback and second-event Candidate-unique convergence.

## 2026-07-20 — Pack C C-PI D-18 readiness evaluator verification

| Check | Outcome |
|---|---|
| `cd apps/backend && npx tsc -p tsconfig.json --noEmit` | passed; exit 0; strict TypeScript covers the service plus in-memory and Prisma read adapters |
| `cd apps/backend && node --test --loader ts-node/esm src/services/paper-implementation-cycle-readiness-v2-service.unit.test.ts` | passed 9/9; 0 failed, 0 skipped, 0 todo |
| read-only source scan | passed; no create/update/upsert/delete call exists in the new port, Prisma adapter or evaluator |
| schema/migration/env/app/legacy completion | unchanged; no database or external system was contacted |
| optional whole-bundle strict docs lint | 0 errors and the same 10 historical vague-reference warnings recorded after C-PI step 3; strict mode remains nonzero on that pre-existing warning baseline |

Coverage proves deterministic two-branch order/hash replay, older/no-current head blocking, pending EF acknowledgement blocking, a non-head active real-provider Attempt blocking the Cycle, simulation exclusion from the active-real count, existing-closure blocking, current-head REU readiness, superseded Run/cell/REU exclusion and typed zero-branch failure.

## 2026-07-21 — Pack C C-PI step 5 verification

| Check | Outcome |
|---|---|
| `cd apps/backend && npx tsc -p tsconfig.json --noEmit` | passed; exit 0 |
| all eight new/modified test files via direct `node --test --loader ts-node/esm` | passed: backend 86/86 and shared 26/26; 0 failed, 0 skipped |
| `pnpm --filter @paper-engineering-assistant/shared test` | passed 383/383; 0 failed, 0 skipped |
| `pnpm --filter @paper-engineering-assistant/backend test` | final post-fix full population: 2,338 tests, 2,269 passed, 15 failed, 54 skipped; underlying test status failed; no modified test failed |
| `git diff --check` | passed before documentation finalization |

The closure matrix covers the disabled lane, exact no-evidence closure/outbox hashes and atomic rollback, both readiness blockers, Cycle/hash drift, already-closed and exact replay behavior, scientific-kind disablement, and eligible-REU rejection. Seal coverage proves zero admission/head/materialization writes and zero Attempt/payload/command/dispatch writes; generic Sidecar create/upsert joins the existing 5a closed-kind assertions.

Eight full-suite failures require unavailable PostgreSQL at `127.0.0.1:5432`: Prisma topic-selection rollback N4/N5/N6/N7/N8/N10 plus the T-054 and T-067 Prisma HTTP smokes. The other seven are one Pack A fixed-FK-count assertion and six literature integration assertions. Exact names are recorded in `artifacts/pack-c-pi-cycle-closure-20260721/report.md`; none is in a modified test file.

The first full run was 2,268 passed/16 failed and caught one obsolete capability-harness expectation that generic Sidecar creation remained open. The test was brought into the step-5 closure set, its complete file passed 5/5, backend typecheck passed again, and the final full population improved to 2,269 passed/15 failed.

## 2026-07-21 — Pack C C-PI step 6 verification

| Check | Outcome |
|---|---|
| `cd apps/backend && npx tsc -p tsconfig.json --noEmit` | passed; exit 0 under strict TypeScript |
| `node --test .ai/scripts/experiment-foundation-packc-pi-gate.unit.test.mjs` | passed 7/7; 0 failed, 0 skipped |
| direct gateway suite | passed 19/19; 0 failed, 0 skipped |
| direct evidence/scientific contract suites | passed 21/21; 0 failed, 0 skipped |
| direct evaluator + closure suites | passed 18/18; 0 failed, 0 skipped |
| direct seal + Sidecar suites | passed 63/63; 0 failed, 0 skipped |
| disposable identity suite | passed 8/8; includes the additive `packc-pi` identity and marker |
| `node .ai/scripts/experiment-foundation-packc-pi-gate.mjs --run-id packc-pi-20260721-r1` | expected sandbox result: exit 2, `blocked`; 121/121 non-relational tests passed, 0 failed/skipped; PC08/PC14/PC19-PI/PC20 passed, PC17 `deferred_to_cutover`, relational checks blocked |
| sandbox summary | `.ai/.tmp/experiment-foundation-productization/packc-pi-20260721-r1/summary.json`; canonical SHA-256 `sha256:cc169aeddc81d85df4378a2a0d823e288beca454f50d2dff0e70b22579c1bfd9` |
| `git diff --check` | passed after final source and handoff documentation updates |
| whole-bundle strict docs lint | 0 errors and 12 historical vague-reference warnings; no warning in the new step-6 artifact/report; strict mode remains nonzero on the pre-existing warning baseline |
| forced real-PostgreSQL relational lane | PENDING host run; must execute 3/3 with zero skips before C-PI step 6 can close |

The sandbox gate recorded `DISPOSABLE_POSTGRES_UNAVAILABLE`, `existing_database_url_used=false`, both migration sources present, all ten zero-census fields equal to zero, and no database/provider/network/product write. The host must replace the pending section in `artifacts/implementation/07-pack-c-pi-technical-closure.md` with the disposable marker, migration apply, relational and cleanup evidence.

## 2026-07-21 — Pack C C-cutover increment 1 verification

| Check | Outcome |
|---|---|
| `cd apps/backend && npx tsc -p tsconfig.json --noEmit` | passed after implementation and again after the final runtime-route test rewrite; exit 0 |
| every modified backend test file via `node --test --loader ts-node/esm` | six-file cutover population passed 65/65; the additionally discovered runtime-routes file completed 54 tests with 38 passed, 0 failed and 16 intentional provider/database skips |
| modified shared schema test via `node --test --loader ts-node/esm` | passed 5/5; 0 failed, 0 skipped |
| `pnpm --filter @paper-engineering-assistant/shared test` | passed 383/383; 0 failed, 0 skipped, 0 todo |
| `pnpm --filter @paper-engineering-assistant/backend test` | final full population: 2,339 tests; 2,268 passed, 14 failed, 57 skipped, 0 todo; duration `470125.795834ms`; no modified test failed |
| focused unrelated-failure diagnostics | all six literature failures reproduced when selected independently: five remain `PARTIAL` under the sandbox's unavailable content-processing prerequisites, and the download case reports `getaddrinfo ENOTFOUND arxiv.org`; none enters the PaperImplementation cutover code |
| `git diff --check` | passed before and after handoff documentation |

The other eight full-suite failures are sandbox-environmental PostgreSQL failures: topic-selection Prisma rollback N4/N5/N6/N7/N8/N10 plus T-054 and T-067 cannot reach `127.0.0.1:5432`. The 14 non-green full-suite cases are therefore recorded as unrelated environment-dependent failures, not accepted as passing evidence. All in-scope strict compilation and modified-file tests are green.

## 2026-07-21 — Pack C C-cutover increment 2 verification

| Check | Outcome |
|---|---|
| `cd apps/backend && npx tsc -p tsconfig.json --noEmit` | passed on final source; exit 0 |
| `pnpm --filter @paper-engineering-assistant/backend typecheck:experiment-foundation-scripts` | passed after verifying D-19/Pack A/Pack B relay composition; exit 0 |
| checked-in runner script typecheck | `cd apps/backend && npx tsc -p tsconfig.experiment-foundation-scripts.json --noEmit` passed; exit 0 |
| initial ten-file modified backend population via `node --test --loader ts-node/esm` | 141 total: 130 passed, 0 failed, 11 intentional conditional PostgreSQL skips |
| final affected route/planning/closure population via direct runner | 30/30 passed; 0 failed, 0 skipped |
| newly modified T-101 contract-evaluation file via direct runner | 5/5 passed; 0 failed, 0 skipped |
| modified shared schema file via direct runner | 6/6 passed; 0 failed, 0 skipped |
| `pnpm --filter @paper-engineering-assistant/shared test` | 384/384 passed; 0 failed, 0 skipped, 0 todo; duration `25753.829208ms` |
| `pnpm --filter @paper-engineering-assistant/backend test` | final population: 2,340 tests; 2,269 passed, 14 failed, 57 skipped, 0 todo; duration `412532.452542ms`; command exit 1 |
| `git diff --check` | passed after final source and documentation updates |
| whole-bundle strict docs lint | 0 errors and 13 historical vague-reference warnings; no warning in the increment-2 report; strict mode remains nonzero on the existing warning baseline |

The full backend failures are outside the modified cutover files. Eight cannot reach PostgreSQL at `127.0.0.1:5432`: rollback N4/N5/N6/N7/N8/N10 and the T-054/T-067 Prisma HTTP smokes. Six are the established literature environment/network population: key-content curation export/import; workflow import/topic/paper-link/citation update; rerun artifact overwrite; global-env USER_AUTH gate; explicit fulltext processing/metadata-stale registration; and remote download/register (`getaddrinfo ENOTFOUND arxiv.org`).

The first final-source full run was 2,340 total, 2,268 passed, 15 failed, 57 skipped. The run exposed an in-scope T-101 source-anchor still naming the deleted repeated-low-information completion test. The anchor was replaced with the new legacy-closure/read-preservation test name, passed directly 5/5, and disappeared from the final full run. No in-scope test remains non-green.

## 2026-07-22 — Pack C C-cutover increment 3 and final convergence verification

| Check | Outcome |
|---|---|
| `node --test .ai/scripts/experiment-foundation-packc-cutover-gate.unit.test.mjs .ai/scripts/experiment-foundation-packc-final-gate.unit.test.mjs` | passed 13/13; 0 failed/skipped |
| post-correction EF regression + both new meta files | passed 19/19; 0 failed/skipped |
| direct packet/dossier/runtime gate group | passed 30/30; 0 failed/skipped |
| direct bridge/live-adapter gate group | passed 29/29; 0 failed/skipped |
| direct closure-authority/seal gate group | passed 55/55; 0 failed/skipped |
| direct shared dossier/validation contract group | passed 11/11; 0 failed/skipped |
| direct PaperImplementation route integration group | passed 6/6; 0 failed/skipped |
| `node .ai/scripts/experiment-foundation-packc-cutover-gate.mjs --run-id packc-cutover-20260722-r1` | passed; PC17/PC18 passed; 131/131; 0 failed/skipped/blocked; SHA `sha256:2a1c6eebe062e6ddeb0b96602bb7d705f07b87768d7360588d6cb96d3fd3ac8d` |
| initial final `packc-final-20260722-r2` | failed as diagnostic evidence because the pre-existing EF gate still froze the three-kind closure set; the failure exposed a gate-only stale expectation after C-PI added Sidecar |
| corrected `node .ai/scripts/experiment-foundation-packc-final-gate.mjs --run-id packc-final-20260722-r3` | expected sandbox result: exit 2 / `blocked`; EF and PI blocked on `DISPOSABLE_POSTGRES_UNAVAILABLE`, cutover passed, all child SHAs verified |
| final r3 PC registry | 11 passed; 9 blocked: PC06, PC07, PC09-PC13, PC15, PC16; PC17/PC18 passed from cutover |
| final r3 child totals/SHAs | EF 69/69 + one blocked relational suite / `sha256:be5487c5934c42f93dc2cd00c90f6cce62dc384e1b5bf98140c50e37f058a43d`; PI 122/122 + one blocked relational suite / `sha256:69d972c98886d8fa6617d9af52c7b740b3c1756e40efa246f669bcd40abd3b9e`; cutover 131/131 / `sha256:e46b316b5d7544bd307b04fd5a354a040f9e743644346ed5cfe73cd04efd8167` |
| backend full suite inside final r3 | 2,340 total; 2,269 passed; 14 failed; 57 conditional skips; exit 1; output SHA `sha256:46622b213754d4669f61896633069814598aafbd7c3f767661a50e42b3b9f77e` |
| final r3 aggregate | 2,662 tests; 2,591 passed; 14 failed; 57 skipped; 2 blocked suites; final SHA `sha256:da3d482995fad2d4dbdbde3bebb3c0718cf878be03dd484724c141c480f18fde` |

The 14 backend failures match the established environment-dependent baseline recorded for increment 2: eight unavailable-local-PostgreSQL cases and six literature environment/network cases. They are recorded as failed evidence, not accepted as passing. The final status remains `blocked` because the two mandatory Pack C relational children could not execute; on a host where those children pass, any remaining backend failure will make the final gate `failed`.

Host closure remains PENDING. Run a fresh `packc-final-<YYYYMMDD>-r<N>` with Docker/PostgreSQL available, require both relational lanes to execute with zero skips, require cutover PC17/PC18 to remain passed, and require the backend full suite to report zero failures before replacing the PENDING section in `artifacts/implementation/08-pack-c-cutover-technical-closure.md`.

## 2026-07-22 — Pack C quality remediation QR-1 verification

| Check | Outcome |
|---|---|
| `cd apps/backend && npx tsc -p tsconfig.json --noEmit` | passed on final source; exit 0 |
| every new/modified QR-1 backend test file via direct `node --test --loader ts-node/esm` | 97 total; 90 passed; 0 failed; 7 conditional PostgreSQL skips |
| modified shared integration-event schema test via direct `node --test --loader ts-node/esm` | 18/18 passed; 0 failed/skipped |
| focused relay/readiness/closure/gateway/stored-codec regression group | 41/41 passed; 0 failed/skipped |
| `pnpm --filter @paper-engineering-assistant/shared test` | 386/386 passed; 0 failed/skipped |
| `pnpm --filter @paper-engineering-assistant/backend test` | final merged population: 2,352 total; 2,295 passed; 0 failed; 57 skipped; 0 todo; duration `473471.691916ms`; exit 0 |
| `git diff --check` | passed after source and documentation updates |

All QR-1 tests passed in both targeted and final full-suite execution. An earlier sandbox run recorded 14 environment failures, but the controlled host rerun did not reproduce any failure. The 57 final skips remain explicit conditional relational/live-provider lanes and are not counted as green evidence; the seven targeted skips are the two opt-in Pack C real-PostgreSQL files.

QR-1 itself changed no Prisma schema/migration. The subsequent public-resource integration pass registered `EXPERIMENT_FOUNDATION_V2_SCIENTIFIC_VALIDATION_ENABLED` in the env SSOT with default `false`, regenerated all non-secret artifacts, passed the environment suite, and extended the cutover/config tests to cover all five v2 booleans.

The specialized runner compatibility test proves that an unconfigured Pack C relay destination produces `released_retry`, leaves its outbox in retry state, and records zero delivery or terminalization. Product `buildApp` continues to compose all three Pack C consumers explicitly.

## 2026-07-23 — Aliyun r6 closure and M7 readiness verification

### Source evidence inspected

| Evidence | Outcome |
|---|---|
| `.ai/.tmp/experiment-foundation-productization/cloud-preflight-public-resource-readonly-20260723-r6/summary.json` | `cloud_preflight_passed`; CP01-CP12 all passed |
| r6 summary SHA-256 | `ae524752ef64f658ddfb796e8c0834bf0903baadf1c8e79cfbc392887c516053` |
| provider operation ledger | 13 succeeded reads: 1 GetWorkspace, 1 ListResources, 11 ListEcsSpecs |
| provider write census | provider write requests 0; `CreateJob` 0; provider writes 0 |
| database/scientific census | database writes 0; scientific writes 0 |
| protected authority fence | 88 tables; `changed_tables=[]`; server-enforced read-only transaction |
| scientific state | `not_started`; `evidence_eligibility=false` |

### M7 static readiness census

| Check | Outcome |
|---|---|
| current RunRecipe/TaskSpec generation | simulation/materialization-only; not eligible for live reuse |
| shared provider-control mode/provenance/ref contracts | simulation/fake only |
| Pack B migration CHECK population | exact simulation/fake payload and Attempt tuple only |
| product provider-worker composition | deterministic fake transport only |
| Pack C validation boundary | already requires succeeded `real_provider` Attempt/result provenance |
| T-106 external gate | prerequisite-presence gate only; no real provider call |
| official API review | CreateJob/GetJob/ListJobs/StopJob/DeleteJob/JobSettings and OSS-mount primary docs reviewed; links recorded in the M7 review |
| sensitive-data review | new durable artifacts contain no raw access key, secret, session token, SDK payload, unredacted object path or raw provider log |

### Commands to run after the handoff update

```bash
node .ai/scripts/lint-docs.mjs --path dev-docs/active/experiment-foundation-productization-closure --strict
node .ai/scripts/lint-docs.mjs --path dev-docs/active/experiment-foundation-real-interaction-hardening --strict
node .ai/scripts/ctl-project-governance.mjs sync --apply --project main
node .ai/scripts/ctl-project-governance.mjs lint --check --project main
git diff --check
```

No live or mutating verification command is authorized by the readiness step.

## 2026-07-23 — M7-I0..I3 default-off implementation closure

Command:

```bash
node .ai/scripts/experiment-foundation-m7-provider-gate.mjs --run-id t132-m7-offline-20260723-v1
```

| Evidence | Final outcome |
|---|---|
| gate verdict | `passed`; M7-01 through M7-15 all `passed` |
| summary | `.ai/.tmp/experiment-foundation-productization/t132-m7-offline-20260723-v1/summary.json` |
| summary SHA-256 | `7bccf0b8bedd041f65374ce0e6ccff3cc26be662a008c1ff6951a57f71743679` |
| source population | 14 files; SHA-256 `13a3e620e3d0f2f86845d0fc5aef2ea2c05021fff654478fd0e29a85e392c281` |
| shared targeted tests | 10/10 passed; 0 failed/skipped |
| backend targeted tests | 88/88 passed; 0 failed/skipped |
| forced disposable PostgreSQL | 9/9 passed; 0 failed/skipped; marker/reset identity checks passed |
| ExecutionBundle schema | 6 typed tables; 7 same-domain FKs; 0 PI↔EF cross-domain FK |
| provider-control schema | exact simulation/fake and real-provider tuples; mixed tuples rejected |
| capability behavior | intake and drain default `false`; capability-off intake zero writes; committed drain survives intake disable |
| live provider/OSS calls | `CreateJob/GetJob/ListJobs/StopJob/DeleteJob` and OSS writes all 0 |
| external effects | billable jobs/resources/cost, named-database apply, scientific/evidence/REU/legacy writes all 0 |
| cleanup | disposable PostgreSQL container cleaned successfully |
| T-106 handoff | exact run imported; no duplicate provider transport/schema/runner |

The run proves the default-off implementation and crash-recovery contract only. The run does not prove live PAI-DLC connectivity, image pull, dataset mounts, output collection from OSS, scientific validity or evidence eligibility. Those remain fenced behind separately authorized M7-L1/M7-L2 work.

### 2026-07-24 — independent review fix and superseding v2 convergence

The pre-commit independent review (Codex `gpt-5.6-sol` + Claude; dispositions recorded in `artifacts/implementation/11-m7-real-provider-readiness-review.md`) confirmed one functional defect: the reconcile watchdog compared poll-attempt counts instead of wall-clock time against the frozen TaskSpec `timeout_seconds`, so a healthy long-running job would be cancelled after ~12 polls and a late transient transport error could terminalize the job. The worker now derives the cancel-on-timeout deadline from `attempt.created_at + timeout_seconds + watchdogGraceMs` (default 15 min), keeping `maximumCommandAttempts` as the transport-retry bound for submit/cancel/collect; M7-09 was rewritten as a wall-clock regression test.

Superseding convergence run:

```bash
node .ai/scripts/experiment-foundation-m7-provider-gate.mjs --run-id t132-m7-offline-20260724-v2
```

| Evidence | Final outcome |
|---|---|
| gate verdict | `passed`; M7-01 through M7-15 all `passed` |
| summary | `.ai/.tmp/experiment-foundation-productization/t132-m7-offline-20260724-v2/summary.json`; durable copy `artifacts/implementation/11-m7-offline-gate-summary-v2.json` |
| summary SHA-256 | `7794091061b7d2e920634d78d08d657776fa5515d5fe751b1f22026a1196d6e0` |
| host full suites after fix | shared 390/390; backend 2,387 tests / 2,327 pass / 0 fail / 60 conditional-skip; gate scripts 18/18 |

### 2026-07-24 — named-local migration apply and M7-QR hardening closure

Named-local apply of `20260723100000` was separately authorized and executed the same day: recovery point (8.4 GB dump, 2,197 TOC entries, SHA-256 `5ce0328b…`), `migrate deploy` 69/69, pre/post row census identical with the profile-column value preserved; full record in `artifacts/db/m7-real-provider-20260724/01-apply-record.md`.

The M7-QR hardening package (`artifacts/implementation/12-m7-qr-hardening-plan.md`) then closed both QR candidates from the independent review plus regression tests. Final hardened convergence:

```bash
node .ai/scripts/experiment-foundation-m7-provider-gate.mjs --run-id t132-m7-offline-20260724-v3
```

| Evidence | Final outcome |
|---|---|
| gate verdict | `passed`; M7-01..15 all passed under per-check executable predicates |
| summary SHA-256 | `de4b39855db87557f1ef220c6d2d4bddaf61d7c94c30aca8ecda8e1f63679882`; durable copy `artifacts/implementation/12-m7-qr-gate-summary-v3.json` |
| pre-M7 row preservation | 68 pre-M7 migrations + replica-seeded provider-control family; semantic digest preserved across the M7 migration; mixed-tuple INSERT and `simulationProfileVersion` reference rejected post-apply |
| measured censuses | excluded-write tables asserted exactly zero (real table names — the pre-QR bare-label census bug was caught by the first hardened run); duplicate-provider scan measured 0 |
| durable redaction | summary contains no command transcripts and no absolute machine paths (self-checked) |

The first v3 attempt failed on the newly-honest excluded-write assertion because the legacy `EXCLUDED_WRITE_TABLES` list used bare family labels matching no real table — evidence that the measured census does what the declared census could not.

### Historical Pack B gate compatibility after M7

The M7 schema evolution initially made the historical Pack B gate stale: the gate expected a 40-table V2 population, fake-only effective PostgreSQL domains and the old `real` fence label. The compatibility repair keeps the Pack B product writer simulation-only, measures all later V2 tables for zero writes, and verifies the evolved exact tuple schema.

Final replay:

```bash
node .ai/scripts/experiment-foundation-packb-simulation-gate.mjs --run-id packb-m7-compat-20260723-r3
```

- PB01-PB16: all passed.
- Shared targeted: 6/6; backend targeted: 95/95.
- Pack A forced relational: 6/6; Pack B forced relational: 8/8; zero skipped.
- Effective Pack B schema: 15 restrictive same-domain FKs, 31 CHECKs, 38 indexes and the Cycle-wide active-real fence index.
- The simulation scenario wrote only the six Pack B families and made zero fetch/network/`CreateJob` calls; later V2 tables were included in the unchanged census.
- Disposable PostgreSQL cleanup passed. Summary SHA-256: `ba0712beae4bbba32d26d0b93432d8f2fc4bbb5c3e7856d26338ccdc2ff2fa7d`.

### Final repository regression

- Shared full suite: 390/390 passed; 0 failed/skipped.
- Backend full suite: 2,387 total; 2,327 passed; 0 failed; 60 conditional relational/live-provider skips; duration `447746.555916ms`.
- The first backend full run exposed one stale static census (`45 !== 38`) because M7 added seven reviewed same-domain RESTRICT FKs. The corrected assertion independently freezes the historical Pack A 38 and the M7 delta 7; its focused file passed 31/31 before the final full-suite pass.
- Prisma validate, shared/backend/script typechecks, env-contract validation, M7/Pack B gate meta, both strict docs lints, governance lint and `git diff --check` passed.
- Conditional full-suite skips are not counted as database acceptance. M7 database acceptance remains the forced disposable PostgreSQL 9/9 lane; Pack A/Pack B compatibility acceptance remains the forced 6/6 and 8/8 lanes.

## 2026-07-24 — M5-A1 project-scoped experiment lineage

Required typechecks:

```bash
pnpm --filter @paper-engineering-assistant/shared typecheck \
  && pnpm --filter @paper-engineering-assistant/backend typecheck
```

- Outcome: passed. Backend pretypecheck regenerated the unchanged Prisma client; shared and backend TypeScript checks completed with exit 0. The guarded relational test is included in the backend TypeScript population.

Required shared schema test:

```bash
cd packages/shared
node --test --loader ts-node/esm \
  src/research-lifecycle/paper-implementation-experiment-lineage-v2-contracts.schema.test.ts
```

- Outcome: 3/3 passed, 0 failed/skipped.

Required backend service/route tests:

```bash
cd apps/backend
node --test --loader ts-node/esm \
  src/services/paper-implementation-experiment-lineage-v2-service.unit.test.ts \
  src/routes/paper-implementation-experiment-lineage-v2-routes.integration.test.ts
```

- Outcome: 6/6 passed, 0 failed/skipped.

Guarded relational load check:

```bash
cd apps/backend
node --test --loader ts-node/esm \
  src/repositories/prisma/prisma-paper-implementation-experiment-lineage-v2-relational.integration.test.ts
```

- Sandbox outcome: test module loaded successfully and the one relational case was conditionally skipped because no disposable PostgreSQL identity/URL was supplied.
- Host action: set `PAPER_IMPLEMENTATION_EXPERIMENT_LINEAGE_V2_RELATIONAL_PRISMA=1` plus the existing randomized `EXPERIMENT_V2_TEST_DATABASE_URL` disposable identity variables and require 1/1 passed with 0 skips.

Static zero-write/scope census:

- New repository/service files contain no `.create(`, `.update(`, `.delete(`, or `$executeRaw`.
- Every Prisma ORM predicate and raw SQL query in the new Prisma adapter carries the requested ImplementationProject id in its `where`/`WHERE` scope.
- Route/controller request inputs contain only `implementation_project_id`, `validation_cycle_id`, or `branch_id` path parameters; no request body/query/hash/ref/revision-id input exists.
- Strict task-bundle documentation lint passed 96/96 with 0 warnings/errors, and `git diff --check` passed.

## 2026-07-24 — M5-A3 closure preparation and available actions

Required typechecks:

```bash
pnpm --filter @paper-engineering-assistant/shared typecheck
pnpm --filter @paper-engineering-assistant/backend typecheck
```

- Outcome: both passed with exit 0. Backend pretypecheck regenerated the unchanged Prisma client.

Shared new/closure schema tests:

```bash
cd packages/shared
node --test --loader ts-node/esm \
  src/research-lifecycle/paper-implementation-closure-preparation-v2-contracts.schema.test.ts \
  src/research-lifecycle/paper-implementation-evidence-v2-contracts.schema.test.ts
```

- Outcome: 12/12 passed, 0 failed/skipped.

Backend new/touched service and route tests:

```bash
cd apps/backend
node --test --loader ts-node/esm \
  src/services/paper-implementation-agent-actions-v2-service.unit.test.ts \
  src/routes/paper-implementation-agent-actions-v2-routes.integration.test.ts \
  src/routes/paper-implementation-experiment-v2-routes.integration.test.ts \
  src/services/paper-implementation-experiment-lineage-v2-service.unit.test.ts \
  src/routes/paper-implementation-experiment-lineage-v2-routes.integration.test.ts
```

- Outcome: 24/24 passed, 0 failed/skipped.

Existing closure/readiness inventory:

```bash
cd apps/backend
node --test --loader ts-node/esm \
  src/services/paper-implementation-cycle-readiness-v2-service.unit.test.ts \
  src/services/paper-implementation-validation-cycle-closure-v2-service.unit.test.ts \
  src/repositories/prisma/prisma-paper-implementation-evidence-closure-v2-relational.integration.test.ts \
  src/routes/paper-implementation-experiment-v2-routes.integration.test.ts
```

- Outcome: 31 passed, 0 failed, 4 guarded relational cases skipped.
- Host action: run the relational file with `PAPER_IMPLEMENTATION_EVIDENCE_CLOSURE_V2_RELATIONAL_PRISMA=1` plus the existing randomized disposable database identity variables and require 4/4 passed with zero skips. The local skip is not PostgreSQL acceptance.

Static checks:

- `git diff --check` passed.
- Strict task-bundle documentation lint passed 96/96 with 0 warnings/errors.
- New service/controller/routes contain no transaction or mutation calls. M5-A3 adds no repository, schema, migration, persistence, or gate-script change.

## 2026-07-24 — M5-A agent-first workflow slice closure

Convergence run:

```bash
node .ai/scripts/experiment-foundation-m5-agent-gate.mjs --run-id t132-m5-agent-20260724-v1
```

| Evidence | Final outcome |
|---|---|
| gate verdict | `passed`; M5-01..M5-08 all passed under exact-count executable predicates |
| summary SHA-256 | `0c840205c866747cca8e2124a0b79118a79c8be7394e8ffb60e5a91313496d51`; durable copy `artifacts/implementation/13-m5-agent-gate-summary-v1.json` |
| typed-request census | five M5 GETs params-only (no body/querystring/hash/ref/revision fields), closure POST body cycle-id optional with mismatch-400 guard and test coverage |
| in-gate relational lanes | lineage isolation 1/1 (d19 identity) and evidence-closure 4/4 (packc_pi identity) inside one disposable container |
| zero-write and negative space | mutation-call scan 0 across the M5 read population; no embedding/semantic import; migration directory count pinned at 69; desktop untouched |
| targeted suites | backend 87/87, shared contracts 15/15, both typechecks, gate unit tests 17/17 |
| host full suites | shared 396/396; backend 2,407 / 2,346 pass / 0 fail / 61 conditional-skip |

M5 as rescoped by D-24 is complete: the agent/API surface now covers project-scoped lineage reads, derived closure preparation, and enumerable typed actions with zero new schema and zero new authority.

## 2026-07-25 — M6-R1 LIT-0204 source-import local verification

Fixture/source immutability:

```bash
cmp -s \
  dev-docs/active/experiment-foundation-first-promotion-closure/artifacts/lit-0204-ragperf-protocol-definition.json \
  apps/backend/src/services/test-fixtures/lit-0204-ragperf-protocol-definition.fixture.json
shasum -a 256 \
  dev-docs/active/experiment-foundation-first-promotion-closure/artifacts/lit-0204-ragperf-protocol-definition.json \
  apps/backend/src/services/test-fixtures/lit-0204-ragperf-protocol-definition.fixture.json
```

- Passed: byte-for-byte comparison exit 0; both files SHA-256 `b15956e530e1aba392e4d5dea8874a1b9bd947f63c69209b3dbda0a14233365f`.
- `git diff --exit-code -- <original-definition-path>` passed; the immutable T-131 source has no diff.

Mapper and census:

```bash
cd apps/backend
pnpm exec node --test --loader ts-node/esm \
  src/services/experiment-foundation-lit0204-protocol-import-service.unit.test.ts \
  src/services/experiment-foundation-lit0204-protocol-import-census.unit.test.ts
```

- Passed: 4 tests, 4 passed, 0 failed/skipped.
- Tail: deterministic exact mapping and typed unknown-requirement rejection passed; product census and cardinality-drift evidence passed.

Typechecks:

```bash
pnpm --filter @paper-engineering-assistant/shared typecheck
pnpm --filter @paper-engineering-assistant/backend typecheck
pnpm --filter @paper-engineering-assistant/backend run typecheck:experiment-foundation-scripts
```

- Passed: shared, backend, and the script-specific TypeScript project all exited 0.

Disposable guard negative:

```bash
cd apps/backend
env -u DATABASE_URL \
  -u EXPERIMENT_V2_TEST_DATABASE_URL \
  -u EXPERIMENT_V2_TEST_DATABASE_NAME \
  -u EXPERIMENT_V2_TEST_DISPOSABLE_NONCE \
  node --loader ts-node/esm scripts/import-lit0204-ragperf-protocol-v2.ts \
  --definition src/services/test-fixtures/lit-0204-ragperf-protocol-definition.fixture.json
```

- Expected refusal occurred before client construction: `EXPERIMENT_V2_TEST_DATABASE_URL is required; no DATABASE_URL fallback is allowed`.

Relational lane:

```bash
cd apps/backend
pnpm exec node --test --loader ts-node/esm \
  src/services/experiment-foundation-lit0204-protocol-import-service.relational.integration.test.ts
```

- Local outcome: 1 guarded test discovered, 0 failed, 1 skipped with the exact instruction to set `EXPERIMENT_FOUNDATION_LIT0204_IMPORT_RELATIONAL_PRISMA=1` plus D-19 randomized disposable identity variables.
- The local skip is **not** PostgreSQL acceptance. Host verification must rerun the same file with skip=0 and prove the imported server content hash plus both real D-17 reason codes.

Static:

- `git diff --check` passed.
- `node .ai/scripts/lint-docs.mjs --path dev-docs/active/experiment-foundation-productization-closure --strict` passed 97/97 Markdown files with 0 warnings/errors.
- No `any` type was added in the service, CLI, or tests.
- Deviation: the authorized disposable PostgreSQL identity/marker environment was unavailable, so the relational proof and CLI success/source-binding output remain host-verified-later; no named-local fallback was attempted.

## 2026-07-25 — M6 release closure convergence

Full slice record: `artifacts/implementation/14-m6-release-closure-plan.md` (completion section). Final convergence:

```bash
node .ai/scripts/experiment-foundation-m6-release-gate.mjs --run-id t132-m6-release-20260725-v5
```

| Evidence | Final outcome |
|---|---|
| gate verdict | `passed`; M6-01..M6-10 all green |
| summary SHA-256 | `41c4f0bb41cd871bc6967e548d38ad30b7a7787e34b8c563853b43e77b35acaf`; durable copy `artifacts/implementation/17-m6-release-gate-summary-v5.json` |
| child gates re-passed | packb-simulation, packc-final (r905), m5-agent, m7-provider (bilateral T-106 handoff verified against the recorded `t132-m7-offline-20260724-v3` import) |
| durable record pins | six SHA-256-exact records (packa verify-r5, packb verify-r2, m7 v3, m5 v1, usage-fit evidence, golden-closure apply) + cloud-preflight doc pin |
| in-gate lanes | LIT-0204 source-import + D-17 negatives 1/1 on disposable PostgreSQL; OpenAPI quality/index-verify/path-coverage all green |
| productization statuses | exactly `workflow_simulation_passed` / `cloud_preflight_passed` / closure kind `control_flow_validated_no_paper_evidence` |
| golden closure (R4, user-approved window) | `validation_cycle_t132_packa_product_p313_v1` closed no-evidence; closure input hash byte-equal to the M5 preparation CAS watermark; scientific writes zero (record `artifacts/implementation/16-m6-golden-closure-record.md`) |
| convergence lineage | v1 packc-final run-id grammar; v2 stale sealed-path census (`startWorkflowSimulation`→`startExecution` after M7 — the release gate's reason to exist); v3 composite-vs-bilateral handoff (`--imported-run-id`); v4 nested status-field read; v5 passed |

M6 is complete: T-131 consumption evidence written back and T-131 closed (`done`); operator runbook `docs/context/process/experiment-foundation-release-runbook.md`; OpenAPI/api-index/context current with a path-coverage drift guard.

## 2026-07-26 — Progress-ledger and governance reconciliation

Read-only evidence and Git topology:

```bash
git status --short --branch
git rev-list --left-right --count origin/main...HEAD
git merge-base --is-ancestor origin/main HEAD
git diff --shortstat origin/main..HEAD
```

- Before the documentation update, the worktree was clean and local `main` was `0 behind / 41 ahead`; `origin/main` is an ancestor of HEAD.
- The ahead range changes 264 files with 44,615 insertions and 3,411 deletions. Subject census found 40 T-132/ExperimentFoundation/PaperImplementation-related commits and one intervening Literature portability fix.
- No branch, commit, remote ref or push was created during the reconciliation.

Task/evidence assertions:

```bash
node <inline-ledger-and-summary-assertion>
```

- Passed: the audit table contains exactly 28 findings with 23 `verified`, 4 `open` and 1 `cut`; the open set is exactly EF-P06, EF-P14, EF-P15 and EF-P21.
- Passed: every M6-01..M6-10 check in `artifacts/implementation/17-m6-release-gate-summary-v5.json` is `passed`.
- Passed: every M7-01..M7-15 check in `artifacts/implementation/12-m7-qr-gate-summary-v3.json` is `passed`.

Documentation lint:

```bash
node .ai/scripts/lint-docs.mjs \
  --path dev-docs/active/experiment-foundation-productization-closure \
  --strict
```

- First run: 0 errors and 2 strict-mode wording warnings in the newly reconciled sections; no structural/content error.
- Fixed the vague-reference wording without changing semantics.
- Final run: 101/101 Markdown files passed, 0 errors, 0 warnings.

Project governance:

```bash
node .ai/scripts/ctl-project-governance.mjs sync --dry-run --project main --init-if-missing
node .ai/scripts/ctl-project-governance.mjs sync --apply --project main
node .ai/scripts/ctl-project-governance.mjs lint --check --project main
```

- Dry-run and apply both completed successfully. T-132 remains registered as `in-progress` at `dev-docs/active/experiment-foundation-productization-closure`; regenerated project views required no content delta beyond the task-bundle changes.
- Final lint passed. Two pre-existing non-T-132 warnings remain for non-canonical `State:` prose in T-124 and T-133 task overviews; the reconciliation did not modify those tasks.

Static diff integrity:

```bash
git diff --check
```

- Passed with no whitespace errors.
- Scope is documentation/governance only: `.ai-task.yaml`, `00-overview.md`, `01-plan.md`, `03-implementation-notes.md`, `04-verification.md`, `06-audit-closure-matrix.md` and `roadmap.md`.
- No product code, schema, migration, capability, cloud resource, credential, provider operation or scientific record changed.

## 2026-07-26 — M7-L1 RAM custom-policy verification

Repository policy checks:

```bash
jq -e . workloads/ragperf-canary/ram/controller-policy.json
jq -e . workloads/ragperf-canary/ram/runtime-policy.json
shasum -a 256 workloads/ragperf-canary/ram/controller-policy.json
shasum -a 256 workloads/ragperf-canary/ram/runtime-policy.json
```

- Controller JSON passed and remains SHA-256 `ddde63f223f8d1982da124414ff8224aa7a431f56b51af834030b4fb681f4d8c`.
- Runtime JSON passed at SHA-256 `1eb7de00aceacc14817b058291eb4f2e85cdbb4c10ea467c91084a75094b1a4b`.
- Console detail verified `pea-m7-canary-controller` as custom-policy current v1 and `pea-m7-canary-runtime` as custom-policy current v2. The runtime v2 editor passed with 0 errors, 0 security warnings, 0 warnings and 0 suggestions.
- Runtime v2 source separates Bucket listing, input-object read and output-object write; `oss:Prefix` is limited to `input` / `input/*`.
- Controller role detail verified role ID `300042892692129613`, ARN `acs:ram::1183869713036194:role/pea-m7-canary-controller`, exact-user trust `acs:ram::1183869713036194:user/user_0002`, and one attached custom policy `pea-m7-canary-controller` at authorization time `2026年7月26日 21:18:52`.
- Runtime role detail verified role ID `300525928077898732`, ARN `acs:ram::1183869713036194:role/pea-m7-canary-runtime`, exact PAI service trust `pai.aliyuncs.com`, and one attached custom policy `pea-m7-canary-runtime` at authorization time `2026年7月26日 21:29:39`.
- Neither role lists the other lane's custom policy. No credential or STS value was viewed or recorded; no provider call, capability enable, `CreateJob` or billable execution occurred.
## 2026-07-28 — M7-L1 runner hardening and fail-closed resource gate

Passed:

```bash
pnpm --filter @paper-engineering-assistant/backend typecheck
pnpm --filter @paper-engineering-assistant/backend typecheck:experiment-foundation-scripts
node --test --loader ts-node/esm \
  src/services/experiment-foundation-aliyun-oss-exact-result-reader-v2.unit.test.ts \
  src/services/experiment-foundation-aliyun-real-provider-v2-transport.unit.test.ts \
  src/services/experiment-foundation-real-provider-command-v2-worker.unit.test.ts \
  src/services/experiment-foundation-real-provider-intake-v2-service.unit.test.ts \
  src/services/experiment-foundation-real-provider-payload-v2-service.unit.test.ts
```

- OSS reader: 2/2 passed.
- Transport recovery: 6/6 passed, including second-page recovery and ECS-spec mismatch rejection.
- Worker/intake/payload targeted suites passed after public-resource `EcsSpec` conversion.
- Shared real-provider schema suite: 6/6 passed.

Expected fail-closed result:

```bash
pnpm --filter @paper-engineering-assistant/backend \
  experiment-foundation:m7-l1:live -- --mode offline-preflight
```

The command connected only to the verified named-local target and stopped on the exact TaskSpec/profile mismatch (`512 MiB` actual versus the then-declared `4096 MiB`). Provider calls, CreateJob, DB writes and billable jobs were zero. The manifest/profile was subsequently corrected to exact `ecs.g6.large = 2 CPU / 8192 MiB`; the same command must remain blocked until an authorized successor T1-T4 lineage exists.

## 2026-07-29 — no-cloud SDK boundary / console differential run

Focused removable instrumentation:

```bash
pnpm --filter @paper-engineering-assistant/backend exec node --test \
  --loader ts-node/esm \
  src/services/experiment-foundation-m7-l1-create-job-debug-observation.unit.test.ts
pnpm --filter @paper-engineering-assistant/backend exec \
  tsc -p tsconfig.json --noEmit --pretty false
pnpm --filter @paper-engineering-assistant/backend exec \
  tsc -p tsconfig.experiment-foundation-scripts.json --noEmit --pretty false
```

- Observation suite: 6/6 passed. The real SDK boundary was intercepted before network; action/version/protocol/method/style/path/body types all matched, request JSON round-tripped, model/body bytes were exact, recursive `src` count was 0 and hostile secret-like values were absent from output.
- Backend typecheck: passed.
- Experiment-foundation script typecheck: passed.
- The initial focused test load failed on a missing `RuntimeOptions` model cast; after correcting the debug test only, one assertion expected ten top-level keys instead of the observed nine. Both instrumentation-only issues were corrected before the final 6/6 pass and caused no network/database operation.

Exact named-local read-only reproduction:

```bash
pnpm --filter @paper-engineering-assistant/backend \
  experiment-foundation:m7-l1:live -- --mode offline-preflight
```

- Passed for sequence-5 Run `ef_run_v2_t132_m7_l1_options_fix_successor_v5_1`.
- Both immutable payloads remained valid JSON with 4 direct OSS mounts and zero `src` keys.
- Both custom-role observations contained exactly `AssumeRoleFor`, `RoleArn`, `RoleType`; provider console DLC `1.90.2` custom-role serialization contains only `RoleArn`, `RoleType`.
- Effect census from the runner: existing Attempts 2; `cloud_call_count=0`; `database_write_count=0`. No STS file was read, no command lease was changed, and no `CreateJob` or billable action occurred.

## 2026-07-29 — Gate-2 custom-role omission and cleaned-code verification

Approved product change:

- New official-SDK requests omit optional `AssumeRoleFor` and retain exact `RoleArn + RoleType`.
- The closed shared schema rejects `AssumeRoleFor`.
- Recovery accepts an optional provider echo while retaining exact role ARN/type and credential-configuration matching.

Verification before cleanup:

- Shared real-provider schema suite: 6/6 passed.
- Backend payload, transport and debug-observation suites: 16/16 passed.
- Shared, backend and experiment-foundation script TypeScript checks: passed.

Verification after mandatory debug cleanup:

- Shared real-provider schema suite: 6/6 passed.
- Backend payload and transport suites: 10/10 passed.
- Shared, backend and experiment-foundation script TypeScript checks: passed.
- Product-source search found zero `DEBUG-MODE: BEGIN/END` markers and zero `[DBG:]` logs.
- `CreateJob`, cloud/provider calls, named-local writes, sequence-5 mutations, capability changes and billable actions: 0.

Result: deterministic offline fix threshold passed 1/1. End-to-end provider verification remains 0/1 and must use a new separately authorized successor.

## 2026-07-29 — sequence-6 successor planning and authorization fence

Read-only named-local census:

- Transaction mode: `READ ONLY`; database/schema: `postgres / my_researcher_dev`.
- Cycle: admitted, execution not started, closure count 0.
- Branch: state version 10, current sequence 5, head version 5, head sequence 5.
- Exact revisions/Runs: sequences 1-5 present with an unbroken parent chain; sequence 5 Run manifest remains `sha256:1b5be3de672f067f8e19677181c5c181699a0c595c71bd1e768dbf48f17ffc72`.
- Sequence-5 ProviderPayload/Attempt/ProviderCommand: 2/2/2; ExperimentResult/EvidenceCandidate/REU: 0/0/0.
- Prospective sequence-6 revision/Run/scoped IDs: 0/0/0.
- The transaction ended with `ROLLBACK`; database writes and cloud calls were 0.

Static and fail-closed verification:

- Experiment-foundation script TypeScript check: passed.
- `git diff --check`: passed.
- Two preliminary authorization-guard commands used an incorrect `.env.local` relative path and stopped in Node before script startup; neither could connect to PostgreSQL.
- The corrected no-`DATABASE_URL` guard run selected the sequence-6 scope and rejected `not-authorized` with the exact max-40 token error before any database connection.
- The apply token was not set to its approved value; T1-T4, branch CAS, provider access and capability changes did not run.

## 2026-07-29 — sequence-6 named-local apply, replay and negative-space verification

Authorized execution:

- Exact token: `T132_M7_ROLE_SHAPE_FIX_SUCCESSOR_APPLY_AUTHORIZATION=authorized-2026-07-29-p313-m7-l1-role-shape-fix-successor-max40-no-cloud`.
- Script TypeScript check passed immediately before execution.
- The runner accepted the verified local target and exact sequence-5 parent, then completed normal T1-T4.

Independent read-only verification after apply:

- Branch state/head/current/head sequence: `12/6/6/6`.
- Sequence-6 revision/cells/admission/Run: 1/2/1/1.
- WorkOrder content hash: `sha256:071b24c460d95501efa58cd27ca905c3e15d10b4af6ce0a9096abc970bf0722a`.
- Run manifest hash: `sha256:3fe438fa92d0c92dfcb099c560680a5cba86fec3ec65f9c3f172fbfc232022e5`.
- Exact 13-category lineage census: 40 rows.

Replay and prohibited effects:

- A second authorized invocation completed the exact complete-prefix path; the post-replay census remained 40, so new rows were 0.
- Sequence-5 Attempts remained 2 prepared rows at stateVersion 0 with no external refs.
- Sequence-5 commands remained 2 claimed rows at attemptCount 8 with `REAL_PROVIDER_RECOVERY_NOT_FOUND` and no external refs.
- Sequence-6 ProviderPayload/Attempt/ExperimentResult/EvidenceCandidate/REU: 0/0/0/0/0.
- Cloud/provider calls, capability changes, PAI Jobs and billable actions: 0.
- Both independent verification transactions used `READ ONLY` and ended with `ROLLBACK`.

## 2026-07-29 — sequence-6 zero-cloud live-window offline preflight

```bash
pnpm --filter @paper-engineering-assistant/backend exec \
  tsc -p tsconfig.experiment-foundation-scripts.json --noEmit --pretty false
pnpm --filter @paper-engineering-assistant/backend \
  experiment-foundation:m7-l1:live -- --mode offline-preflight
```

- Script TypeScript check: passed.
- Offline preflight: passed for sequence-6 Run and exact manifest.
- Frozen ExecutionBundle revision/hash matched.
- Two cell resource contracts matched `ecs.g6.large`, 2 CPU, 8192 MiB, one attempt and 1800 seconds.
- Controller policy file hash matched `f6b63cd73a57c6d8cfade1a177681ad4463cbd4d6d0a116e26a40ceee85ed497`.
- Existing Attempt count: 0; reported cloud calls: 0; reported database writes: 0.
- Independent read-only final census retained branch `12/6`; ProviderPayload/Attempt/ProviderCommand/ExperimentResult/EvidenceCandidate/REU remained 0/0/0/0/0/0.
- No STS file was read, no cloud client was constructed, no capability was enabled and no paid authorization was inferred.

## 2026-07-30 — console serializer incident verification

Observed browser evidence:

- Console transport path: POST `/data/api.json` proxy envelopes.
- Unintended Job: `dlc1jao16y748fu4` / `t132-console-serializer-probe`.
- Provider-visible terminal state: `已成功`.
- Create/end times: `2026-07-30 05:48:57` / `05:51:18` Asia/Shanghai.
- Runtime: 2 minutes 21 seconds.
- Resource: public `ecs.g6.large`, 2 CPU, 8 GiB.
- Displayed rate: CNY 0.0092/minute; estimated charge CNY 0.02162.
- Active stop control disappeared after the terminal state was read; no continuing runtime was observed.

Boundary result:

- Abort-before-network objective: **failed**.
- Zero-Job objective: **failed** (1 unintended synthetic Job).
- Exact console-versus-sequence-7 body comparison: **incomplete**.
- Named-local database writes, STS use, capability changes and repository instrumentation files: 0.
- Temporary CDP Fetch patterns and page-level `fetch`/XHR wrappers: cleared/restored.

Required before retry:

- A locally demonstrated `/data/api.json` proxy-envelope detector. **Completed by `dbg-20260730-055847-1139`.**
- Positive and false-negative tests for nested/stringified Job bodies. **Completed offline with three consecutive passes.**
- A new action-time authorization; the existing instrumentation approval is exhausted by the incident.

## 2026-07-30 — read-only Job detail and offline `/data/api.json` guard verification

Read-only browser evidence:

- Job `dlc1jao16y748fu4` remained `已成功`; no active instance or continuing billable runtime was observed.
- Lifecycle: created `05:48:56`, environment ready `05:50:51`, succeeded `05:51:18`, total 2 minutes 21 seconds.
- Resource: one public `ecs.g6.large` Worker, 2 vCPU / 8 GiB.
- Command: `echo t132-console-serializer-probe`.
- Storage: one non-read-only OSS output mount, advanced options `{}`, target `/mnt/pea-output`.
- No edit, retry, clone, stop, log download or cloud write was performed.

Offline Gate-1 verification:

```bash
for t132_pass in 1 2 3; do
  node .ai/.tmp/T-132/console-proxy-interceptor-offline.mjs || exit 1
done
```

- Initial run: failed locally because an unparseable top-level string was not marked opaque. Transport and real-network counters remained zero.
- Corrected runs: 3/3 consecutive passes.
- Per pass: blocked cases 5; allowed cases 3; allowed fake-fetch calls 3; blocked fake-XHR sends 0; forbidden network calls 0; safe log events 6.
- Positive cases: nested stringified `CreateJob`, embedded `/api/v1/jobs`, form-encoded `apiName=CreateJob`, opaque malformed body and credential-like body.
- False-negative controls: benign `GetWorkspace` proxy envelope containing only explanatory `CreateJob` text, non-proxy POST and read-only proxy GET.
- Secret marker was absent from serialized logs. The temporary harness was deleted after verification.
- Cloud/provider calls, database writes, capability changes, STS use, PAI Job creation and billable actions: 0.

Result: the local body-classification and before-transport invariants are proven. Live page injection, frame/lifetime coverage and console serializer capture remain unverified and separately gated.

## 2026-07-30 — static console serializer verification

- Loaded script inventory identified `@alife/pai-console-dlc/1.90.2/js/index.js` and `js/3070.js`.
- Both public static assets returned HTTP 200 and were SHA-256 pinned; adjacent source maps returned 404.
- Exact static call chain:
  - module `238021`: `product=pai-dlc`, `action=CreateJob`;
  - module `841701`: common request composition;
  - module `659112`: form-encoded POST `/data/api.json?_fetcher=CreateJob_pai-dlc`;
  - module `695466`: string passthrough or `JSON.stringify` for `params`/`content`.
- The exact route appears twice in the main bundle, `CreateJob` appears eleven times, and `/api/v1/jobs` appears thirty-one times. The public REST route is not the console submit transport and remains an invalid interception boundary.
- Source inspection did not require the new-create page, a form submit or runtime wrapper.
- Effect census: public CDN GETs 4 including two 404 source-map checks; PAI control-plane calls 0; `/data/api.json` calls 0; provider writes 0; Jobs 0; STS 0; database/capability changes 0.

Result: static serializer inspection is complete. Main-realm guard installation and synthetic pre-send proof remain unverified and require a new Gate-1 approval.

## 2026-07-30 — main-realm synthetic XHR guard verification

Run: `dbg-20260730-065837-de14`.

Three-cycle result:

- wrapper installed: `true / true / true`;
- synthetic request blocked: `1 / 1 / 1`;
- synthetic original `send` calls: `0 / 0 / 0`;
- benign control blocked: `false / false / false`;
- original prototype restored: `true / true / true`.

Safe blocked projection per pass:

- method `POST`;
- path `/data/api.json`;
- exact fetcher `true`;
- exact product/action `true`;
- opaque `false`;
- outer keys `action`, `params`, `product`;
- original send called `false`.

Independent cleanup check:

- wrapper function names absent: `true`;
- T-132/debug window state keys: `0`;
- DevTools closed after inspection.

Effect census:

- Job form opens/submits: 0/0;
- original XHR sends from synthetic tests: 0;
- `/data/api.json` calls: 0;
- provider writes / PAI Jobs / billable runtime: 0/0/0;
- STS, database writes and capability changes: 0/0/0;
- repo debug files or runtime wrapper residue: 0.

Result: main-realm install, exact detection, block-before-send and cleanup are proven for synthetic traffic. Real-form structural capture remains unverified and separately authorized.

## 2026-07-30 — real-form abort-before-send structural verification

Run: `dbg-20260730-071132-e186`.

Pre-submit guard proof:

- real-main-realm XHR and fetch wrappers installed: `true`;
- synthetic XHR/fetch blocks: `2`;
- synthetic target classifications: `2`;
- synthetic original XHR/fetch transports: `0 / 0`;
- counters cleared before the real-form action: `true`.

Real-form target projection:

- channel/method/path: `xhr` / `POST` / `/data/api.json`;
- exact fetcher and product/action: `true / true`;
- body length / outer key count: `1457 / 7`;
- outer keys: `action`, `content`, `params`, `product`, `region`, `sec_token`, `umid`;
- parsed `params`: empty object, length `2`, hash `fnv1a32:5465b825`;
- parsed `content`: object, length `915`, hash `fnv1a32:a87c9183`;
- top-level content groups: accessibility, credential configuration, data sources, display/runtime limits, job specifications, resource/scheduling/settings, success policy, command and workspace;
- recursive `src` keys: `0`;
- target original XHR sends: `0`.

Cleanup and zero-effect verification:

- armed-window proxy blocks / target blocks: `5 / 1`;
- original XHR sends: `0`;
- allowed non-proxy background fetches: `10`;
- restored XHR `open` / XHR `send` / fetch: `true / true / true`;
- independent wrapper-absence checks: `true / true / true`;
- residual debug-state keys: `0`;
- clone Job rows after read-only refresh: `0`;
- provider writes / new Jobs / billable runtime: `0 / 0 / 0`;
- STS / database writes / capability changes / sequence-8 lineage: `0 / 0 / 0 / 0`.

Result: the authorized real console serializer structure was captured with the target transport suppressed and cleanup independently proven. The observed console/SDK shape difference is evidence for the next offline comparison, not yet proof of the provider error's root cause.

## 2026-07-30 — console-clone versus sequence-7 static matrix verification

Run: `dbg-20260730-073606-f1c5`.

Structural set result:

- clone-form paths: `36`;
- sequence-7 paths: `40`;
- exact shared type paths: `31`;
- clone-only paths: `5`;
- sequence-7-only paths: `9`;
- retained sensitive values: `0`.

Clone-only projection:

- `ResourceId:string`;
- `SchedulingStrategy:string`;
- `SuccessPolicy:string`;
- `Settings.JobReservedMinutes:number`;
- `Settings.Tags.CloneFromJobID:string`.

Sequence-7-only projection:

- `DataSources[].MountAccess:string`;
- `Envs:object` plus source-binding/code/input-1/input-2/output string paths;
- `Settings.Tags.ef-provider-idempotency:string`;
- `Settings.Tags.ef-request-binding:string`.

Pinned SDK feasibility check:

```text
sdk_version=1.10.0
with_access_keys=MountAccess,MountPath,Options,Uri
without_access_keys=MountPath,Options,Uri
without_access_has_mount_access=false
both_json_roundtrip=true
```

Evidence classification:

- `CredentialConfig` type-path parity: supported;
- `JobSpecs` type-path parity: supported;
- SDK permits omitted `MountAccess`: supported locally;
- omitted `ResourceId` is the documented public-resource representation: supported;
- successful one-output-mount console Job proves all four sequence-7 mounts are compatible: ruled out;
- `MountAccess` is the provider root cause: unverified;
- `Envs` is the provider root cause: unverified;
- direct OSS composition is the highest-value next diagnostic domain: supported.

Effect census:

- product/debug source changes: `0`;
- SDK/provider network calls: `0`;
- STS/database/capability/lineage writes: `0/0/0/0`;
- PAI Jobs/billable runtime: `0/0`.

Result: the static matrix passed once deterministically and narrows the next experiment without supporting a behavior-changing fix. A network-blocked in-memory variant matrix is the next Gate-1 candidate; sequence 8 and paid provider verification remain unauthorized.

## 2026-07-30 — exact sequence-7 network-blocked variant verification

Run: `dbg-20260730-074202-25a0`.

Pre-exact verification:

- focused temporary observer tests: `3/3` passed;
- backend typecheck: passed;
- experiment-foundation scripts typecheck: passed;
- privacy negative for URI/path/role/environment/idempotency values: passed.

Exact variant results:

| Cell | Variant | DataSources | MountAccess present | Envs | Bytes | SHA-256 |
|---|---|---:|---:|---|---:|---|
| 1 | baseline | 4 | 4 | yes | 2989 | `bdb5d86fa62e4f1c807da20670553e0fe91185508ab58eb1e4f1ff61d70c1680` |
| 1 | omit MountAccess | 4 | 0 | yes | 2913 | `43cefe3e28dd514f7aa739ec86dad539865d5c1a66114132b017c6df7b56bf50` |
| 1 | output only | 1 | 1 | yes | 2316 | `578c5e0a81c0ed47eaf567a5a592c21398677fe29fd5d223ac8b3a58ac00c0d8` |
| 1 | omit Envs | 4 | 4 | no | 1768 | `794f879bba32dc06e8bb85f651e8565d39aeae32fded6680dc699cd0f371bf93` |
| 2 | baseline | 4 | 4 | yes | 2992 | `e8ce6ee982e6afac48906bbefcb1ecccd8aa1bd830be53ae9f2faf2009b47a90` |
| 2 | omit MountAccess | 4 | 0 | yes | 2916 | `547d676ad4e1c7532fdf07ec7af30fb835e8e80e399b190773f168018c30ae25` |
| 2 | output only | 1 | 1 | yes | 2319 | `ff190ae6f4d677eabae39beca5788ad415860aad765d23f1f972041f6a3807d3` |
| 2 | omit Envs | 4 | 4 | no | 1770 | `08b5c802577db1092c909a3f58eb198a6508e95e0b83feed5c2adb4a8ca427d6` |

Every row:

- official SDK validation: passed;
- network blocked before send: true;
- model/wire byte equality: true;
- model/wire semantic equality: true;
- JSON roundtrip equality: true;
- recursive `src` keys: 0;
- Settings tag-key count: 2.

Exact offline-preflight effect census:

- existing Attempts: `2`;
- cloud calls / database writes: `0 / 0`;
- STS / capabilities / lineage writes: `0 / 0 / 0`;
- PAI Jobs / billable runtime: `0 / 0`.

Cleanup verification:

- current-run markers/log tags in `apps`, `packages`, `.ai/scripts`: `0`;
- original observer tests after cleanup: `2/2` passed;
- backend and runner typechecks after cleanup: passed;
- baseline sequence-7 offline-preflight after cleanup: passed with cloud/database writes `0/0`;
- `git diff --check`: passed.

Result: local SDK feasibility is proven for all three variants, but provider causality remains unverified. The next evidence must determine console RO/RW `MountAccess` serialization without creating a Job; no Gate-2 fix or sequence 8 is authorized.

## 2026-07-30 — pinned console RO/RW `MountAccess` static verification

Run: `dbg-20260730-075057-6d1c`.

Pinned assets:

- DLC index: 1,178,525 bytes; SHA-256 `ebbbbd76ec71e1395622090537cc1e3119353fd9bc917c0e75c72c078b3f06eb`;
- DLC vendor: 885,169 bytes; SHA-256 `5a9586605a31dd19fa1e76c094a1e1916295b80b72e35cf7dc6c500ca51273a5`;
- `JobCreateV2`: 2,297 bytes; SHA-256 `bf900ac7826c577a6ab7241e5238521baf51d9e3d6221fa3762bbfd70263d50c`;
- shared create-form chunk `9696`: 736,977 bytes; SHA-256 `d8242805a348a50e0e9e0a79df8c901821daacf0d365a48f330fc7e3d4fa037e`.

Static branch assertions:

- direct-mount append value contains `MountAccess`: false;
- read-only field unforced default: undefined;
- switch enabled value: `RO`;
- switch explicitly disabled value: `RW`;
- direct-mount mapper copies the field: true;
- final builder includes mapped direct mounts in `DataSources`: true;
- untouched RW JSON contains `MountAccess`: false;
- explicitly selected RO JSON contains `MountAccess`: true.

Effect census:

- Job form opens/submits: `0 / 0`;
- `/data/api.json` and provider API calls: `0 / 0`;
- STS/database/capability/lineage writes: `0 / 0 / 0 / 0`;
- PAI Jobs/billable runtime: `0 / 0`;
- repository product/debug source changes: `0`.

Result: the static branch is unambiguous, so the fallback RO+RW form Gate is unnecessary. Console parity for sequence 7 is three explicit `RO` values plus an omitted access key on the untouched RW output. The static result does not prove provider acceptance or authorize a fix; the next step is a separately authorized, network-blocked exact in-memory variant.

## 2026-07-30 — exact console-default access variant verification

Run: `dbg-20260730-080744-3c58`.

Pre-exact verification:

- temporary focused suite: `12/12` passed;
- backend typecheck: passed;
- experiment-foundation script typecheck: passed;
- fail-closed baseline/variant shape and non-access equality assertions: passed.

Exact results:

| Cell | Baseline bytes | Variant bytes | Variant SHA-256 | Sources | Baseline RO/RW | Variant RO/RW/missing | Changed entries |
|---|---:|---:|---|---:|---|---|---:|
| 1 | 2989 | 2970 | `91975d0483938a4354de65fcdd064a1501d9d9a486d923dced99f01849da0c4b` | 4 | 3/1 | 3/0/1 | 1 |
| 2 | 2992 | 2973 | `7ccc046912c26dd37c045e633d7e61b3545a6deaaec83cef78d0b3fb1dc40ab8` | 4 | 3/1 | 3/0/1 | 1 |

Every exact variant:

- network blocked before send: true;
- non-`MountAccess` semantics equal to baseline: true;
- model/wire byte equality: true;
- model/wire semantic equality: true;
- JSON roundtrip equality: true;
- recursive model/wire `src` keys: `0/0`;
- four string `Options` values remained object-parseable.

Effect census:

- existing Attempts: `2`;
- cloud calls/database writes: `0/0`;
- STS/capability/lineage writes: `0/0/0`;
- PAI Jobs/billable runtime: `0/0`.

Cleanup:

- current-run residual markers in `apps`, `packages`, `.ai/scripts`: `0`;
- original focused suite after removal: `11/11` passed;
- backend and runner typechecks after removal: passed;
- baseline exact offline-preflight after removal: passed with cloud/database writes `0/0`;
- `git diff --check`: passed.

One initial default `ts-node` test process stopped on current workspace source-export diagnostics without executing tests. Independent `tsc` passed; the runtime suite was therefore executed with `TS_NODE_TRANSPILE_ONLY=1` while both authoritative typechecks ran separately and passed. The harness detail did not affect the exact runner or evidence.

Result: the console-default candidate is locally representable, exact and RO-boundary-safe. The repository's explicit-RW console-parity defect is supported; provider acceptance remains unverified. A permanent versioned contract/materializer change requires Gate 2, and lineage/cloud actions remain outside that gate.

## 2026-07-30 — Gate-2 console-default access fix verification

Authorization: `APPROVE FIX`; local code/tests only. Sequence-8 lineage, named-local writes, STS, provider calls, Jobs and cost were prohibited.

Commands and results:

- `packages/shared: pnpm run typecheck` — passed.
- `apps/backend: pnpm run typecheck` — passed after Prisma generation.
- `apps/backend: pnpm run typecheck:experiment-foundation-scripts` — passed after Prisma generation.
- `packages/shared: TS_NODE_TRANSPILE_ONLY=1 pnpm exec node --test --loader ts-node/esm src/research-lifecycle/experiment-foundation-real-provider-v2-contracts.schema.test.ts` — 6/6 passed.
- `apps/backend: TS_NODE_TRANSPILE_ONLY=1 pnpm exec node --test --loader ts-node/esm src/services/experiment-foundation-m7-l1-create-job-wire-observation.unit.test.ts src/services/experiment-foundation-m7-l1-create-job-error-observation.unit.test.ts src/services/experiment-foundation-real-provider-payload-v2-service.unit.test.ts` — 12/12 passed.
- `apps/backend: pnpm run experiment-foundation:m7-l1:live -- --mode offline-preflight` — passed.

Contract assertions:

- legacy v1 explicit-RW request schema remains valid;
- console-default v2 request schema is valid;
- explicit RW is invalid under v2;
- generation emits explicit `RO` for every code/input source and omits access only from the final output;
- verification accepts only the canonical legacy RO-prefix/final-RW v1 shape;
- verification rejects a v2 payload with a missing RO-prefix access value;
- verification rejects an all-RO payload whose final output would otherwise escape through the v1 schema overlap.

Exact offline wire:

| Cell | Bytes | SHA-256 | Model/wire bytes | Model/wire semantics | JSON round trip | Recursive `src` |
|---|---:|---|---|---|---|---:|
| 1 | 2970 | `68531cd05903eff736c0f7a89e63fa33164ed3e0e172468d1811140f94c07502` | equal | equal | equal | 0 |
| 2 | 2973 | `90b600879076c736fcd85faeb4676661fb994cdcc8869aa7d735569e733c34a7` | equal | equal | equal | 0 |

Effect census:

- existing Attempts: `2`;
- network blocked before send: true for both cells;
- cloud calls/database writes: `0/0`;
- STS/capability/lineage writes: `0/0/0`;
- PAI Jobs/billable runtime: `0/0`.

Result: the demonstrated repository/console access-serialization defect is fixed locally with legacy verification preserved and ordered RO semantics enforced. Provider acceptance and the provider-owned `src` root cause remain unverified. Sequence 8 and all cloud actions require separate authorization.

One added output-position negative assertion initially failed: an all-RO request matched the broad v1 schema, so schema-only dual validation did not reject the malformed v2 output. The verifier was corrected to require the exact legacy v1 ordered shape as well as the exact v2 ordered shape. The focused suite returned to 12/12, backend typecheck passed and the exact offline preflight passed again with unchanged hashes and zero cloud/database writes.

Documentation and governance checks:

- task-bundle document lint passed with 0 errors and 7 whole-bundle vague-reference warnings; strict mode reported the same warnings as failures;
- project-governance lint passed with two unrelated T-124 state-format warnings;
- project-governance sync dry-run completed and proposed derived-view refreshes only; no apply was needed because T-132 remains `in-progress`;
- `git diff --check` passed.

## 2026-07-30 — sequence-8 named-local successor verification

Authorization: owner `授权` in direct response to the documented next step. Execution was bounded to the named-local sequence-8 successor, max 40 T1-T4 rows and exact replay. STS, cloud/provider calls, capabilities, Jobs and scientific evidence were excluded.

Pre-apply:

- sequence-8 scope addition plus `pnpm run typecheck:experiment-foundation-scripts` — passed;
- sequence-7 `offline-preflight` — passed with exact Run/Bundle, existing Attempts 2 and cloud/database writes `0/0`;
- independent serializable `READ ONLY` transaction — branch state/head `14/7`, current/head revision and Run exact sequence 7, all 13 sequence-8 prefix families 0.

First apply:

- schema: `t132-m7-console-default-access-successor-apply@v1`;
- target fingerprint: `sha256:8851b255b079ad1f049dc1842c41cb3516d5a3ff0b69e21a30e8f2675409cca0`;
- new rows: 40;
- relay claimed/delivered/released/terminalized/failures: `3/3/0/0/0`;
- branch state/head: `16/8`;
- protected tables/changed: `236/0`;
- prior revision and Run unchanged: true;
- prohibited cloud/capability/CreateJob/Attempt/Result/EvidenceCandidate/REU effects: all 0.

Exact lineage:

- revision: `pi_experiment_revision_v2_t132_m7_l1_console_default_access_successor_v8_1`;
- Run: `ef_run_v2_t132_m7_l1_console_default_access_successor_v8_1`;
- Run manifest: `sha256:8e7cc561da119ab3383980247d04d58f01defcb016f6eb29a285208055aeab96`;
- frozen Bundle: `ef_execution_bundle_revision_2c60e151719be2e109e4b2d3964aaa8c315e0b48` / `sha256:458b0e58d93974e3a09b63247bac675d26deef5fdafb111a6eae66177a3b178e`;
- resource/policy: `2 CPU / 8192 MiB`, `max_attempts=1`, timeout 1,800 seconds.

Replay and post-apply:

- built-in replay: admission replayed, new rows 0, relay claimed/delivered 0/0;
- independent-process replay: complete-prefix 40, every row delta 0, protected changes 0;
- post-rebind script typecheck: passed;
- sequence-8 offline preflight: passed with Attempts 0, cloud calls 0 and database writes 0;
- final independent `READ ONLY` census: lineage count vector `1/2/1/2/1/2/1/23/1/2/1/2/1`, total 40; branch/head/current sequence 8; Attempt/ExperimentResult/EvidenceCandidate/REU `0/0/0/0`.
- task-bundle document lint passed with 0 errors and 7 whole-bundle warnings; governance lint passed with the same two unrelated T-124 state-format warnings; governance sync dry-run and `git diff --check` passed.

Result: sequence 8 is the sole fresh lineage for testing the console-default access fix. No read-only cloud preflight or paid verification authority was consumed.

## 2026-07-30 — sequence-8 read-only image-preflight verification

Authorization: exact owner-provided sequence-8 read-only image-preflight scope. One fresh STS and one `GetImage` were allowed; `CreateJob`, OSS/provider writes, capabilities, database writes, NAS/PAI Jobs and training cost were prohibited.

Credential preparation:

- Cloud Shell reconnected; NAS creation was declined;
- caller account/RAM-user check: passed;
- Cloud Shell STS output: `T132_SEQ8_CLOUD_STS_READY keys=6 mode=600`; secret values printed 0;
- local residual scan before download: 0;
- local file: `/tmp/t132-seq8-controller-sts.env`, mode `0600`, six exact non-empty keys;
- temporary `STS.` AK, controller role and controller-policy hash: matched;
- remaining validity at local gate: 57 whole minutes.

Execution:

- command: `node --env-file=/tmp/t132-seq8-controller-sts.env --env-file=../../.env.local --loader ts-node/esm scripts/run-experiment-foundation-m7-l1-live-window.ts --mode image-preflight`;
- exact Run: `ef_run_v2_t132_m7_l1_console_default_access_successor_v8_1`;
- exact Bundle: `ef_execution_bundle_revision_2c60e151719be2e109e4b2d3964aaa8c315e0b48` / `sha256:458b0e58d93974e3a09b63247bac675d26deef5fdafb111a6eae66177a3b178e`;
- image: `cn-shanghai / image-liuxvj7p2qcnflha84`;
- request hash: `fbcba6059e58d7d7366f2872fbcaaf1e9297f5567087ccdeec157d4f7e95dcd1`;
- cloud calls/provider writes/`CreateJob`/database writes: `1/0/0/0`.

Cleanup and independent verification:

- Cloud Shell source: `T132_SEQ8_CLOUD_STS_REMOVED`;
- local exact `/tmp` file and Downloads prefix matches: `T132_SEQ8_LOCAL_STS_REMOVED_EXACT`;
- final independent local residual check: `T132_SEQ8_LOCAL_STS_ABSENT_FINAL`;
- independent serializable `READ ONLY` census: ProviderPayload/Attempt/AttemptEvent/ProviderCommand/CollectionAttempt/ProvisionalOutput/ExperimentResult/EvidenceCandidate/REU all 0;
- capability changes/NAS/PAI Jobs/billable training runtime: `0/0/0/0`.
- task-bundle document lint passed with 0 errors and 7 whole-bundle warnings; governance lint passed with the same two unrelated T-124 state-format warnings; governance sync dry-run and `git diff --check` passed.

Result: sequence-8 provider-managed image identity is freshly verified and credentials are fully removed. The read-only gate grants no paid execution authority.

## 2026-07-30 — sequence-8 paid-window pre-STS verification

Authorization: owner-provided `M7-L1 console-default-access verification authorized: 2026-07-30, ceiling ¥50, 2 jobs`.

Zero-cloud gates:

- `pnpm run experiment-foundation:m7-l1:live -- --mode offline-preflight` — passed;
- exact Run/manifest/Bundle/controller-policy bindings — matched;
- job/monetary ceiling — `2 / ¥50`;
- existing Attempts/cloud calls/database writes — `0/0/0`;
- exact local paid credential path before browser work — absent.

Independent database census:

- transaction: `SERIALIZABLE READ ONLY`;
- database/read-only mode: `postgres / on`;
- ProviderPayload/Attempt/AttemptEvent/ProviderCommand/CollectionAttempt/ProvisionalOutput/ExperimentResult/EvidenceCandidate — `0/0/0/0/0/0/0/0`;
- transaction ended with `ROLLBACK`.

Cloud Shell bootstrap:

- expired session reconnect and NAS decline completed;
- replacement session creation returned `NoPermission`;
- exact denied action: `cloudshell:CreateSession`;
- STS-generation command execution/credential files — `0/0`;
- fresh STS/`GetImage`/`CreateJob`/provider writes/database writes/PAI Jobs/billable runtime — `0/0/0/0/0/0/0`.

Result: **inconclusive before provider verification and zero cost**. The owner/admin must grant only the RAM-user Cloud Shell bootstrap permission and then repeat the fresh credential gate. The active whitelist-only observers remain pending; no provider hypothesis changed and the paid runner was not invoked.

Commit-readiness regression and fix:

- shared typecheck, backend typecheck and experiment-foundation script typecheck — passed;
- direct shared test under Node 26/default `ts-node` stopped at loader initialization with an opaque diagnostic; the same already-typechecked suite under `TS_NODE_TRANSPILE_ONLY=1` passed 6/6;
- first focused backend runtime suite — 17/18, with M7-10 collection failing because output discovery still required explicit `RW`;
- minimal fix — output discovery now accepts only legacy explicit `RW` or v2 missing access, plus the existing exact output mount-path hash and uniqueness fences;
- focused backend rerun — 18/18;
- post-fix backend typecheck — passed;
- post-fix sequence-8 offline preflight — passed with Attempts/cloud/database writes `0/0/0`.

Documentation and commit boundary:

- task-bundle document lint — 117 Markdown files, 0 errors and 7 existing whole-bundle vague-reference warnings;
- project-governance lint — passed with two unrelated T-124 state-format warnings;
- project-governance sync dry-run — proposed registry/derived-view refreshes only; no apply was required because the T-132 authoritative state remains `in-progress`;
- `git diff --check` — passed;
- scoped T-132 credential-value scan — passed;
- unrelated governance, hook, root-instruction, generated-skill and archived T-124 worktree changes are excluded from the T-132 commits.

## 2026-07-30 — Cloud Shell IAM repair and workstation handoff verification

Debug run: `dbg-20260730-083419-7171`.

IAM control-plane verification:

- pre-write `GetPolicy` for `pea-t132-cloudshell-create-session` — `EntityNotExist.Policy`;
- `CreatePolicy` — HTTP 200, custom policy v1;
- exact document — one Allow for `cloudshell:CreateSession` on `Resource: "*"`;
- `AttachPolicyToUser` — HTTP 200 for exact target `user_0002`;
- post-write `GetPolicy` — attachment count 1 and exact document;
- post-write `ListPoliciesForUser` — exact custom policy attached to `user_0002`;
- wildcard Cloud Shell actions, controller/runtime-role changes and credential reads — 0.

Functional verification:

- authenticated identity — `user_0002@1183869713036194.onaliyun.com`;
- replacement Cloud Shell session creation — passed, 1/1;
- ready terminal and file tree — present;
- recurring `cloudshell:CreateSession` denial — absent;
- STS generation, `GetImage`, `CreateJob`, database writes, PAI Jobs and cost — `0/0/0/0/0/0`.

Current-workstation diagnosis:

- `pnpm install --frozen-lockfile` restored missing SDK packages; source and `pnpm-lock.yaml` were unchanged;
- active PostgreSQL — Homebrew 17.9 at `/opt/homebrew/var/postgresql@17`;
- `my_researcher_dev` schema — absent from every local database;
- `/Volumes/DataDisk` — not mounted;
- temporary `.env.local`, mock secret reference and generated context delta — removed/restored;
- final tracked env diff and credential-value findings — 0.

Handoff result: **Cloud Shell bootstrap passed; sequence-8 paid acceptance remains 0/1 and must resume on the original workstation**. An empty or newly migrated database is insufficient because the live runner requires the exact sequence-8 authority. Pull `main`, rerun the zero-cloud offline preflight against the original named-local database, then acquire STS only under a current dated two-Job/¥50 authorization.

Commit-readiness checks:

- T-132 whole-bundle document lint — passed with 0 errors and 8 historical vague-reference warnings; strict mode reports those warnings as expected;
- T-134 strict document lint — passed, 7/7 files with 0 errors and 0 warnings;
- project-governance sync apply — idempotent; registry/dashboard/feature-map/task-index SHA-256 values were unchanged across the final apply;
- project-governance lint — passed with two unrelated pre-existing T-124/T-133 state-format warnings;
- `git diff --check` — passed;
- scoped credential/private-key value scan — no findings.

## 2026-07-31 — sequence-8 paid provider verification

Outcome: **bounded execution rejected by the provider; recovery and cleanup passed; T-132 live-success acceptance remains open**.

- Authorization: exact owner-provided 2026-07-31 sequence-8 window, maximum 2 Jobs and total ceiling ¥50.
- `pnpm run typecheck:experiment-foundation-scripts` — passed after the dated authorization update.
- Pre-action `pnpm run experiment-foundation:m7-l1:live -- --mode offline-preflight` — passed; exact Run/manifest/Bundle/policy, Attempts 0, cloud/database writes `0/0`.
- Fresh STS contract — six exact non-empty keys, temporary `STS.` identity, mode `0600`, exact controller role/policy hash and 59 whole minutes remaining.
- `image-preflight` — passed; cloud calls 1 (`GetImage`), provider writes/`CreateJob`/database writes `0/0/0`; request hash `f8ab30f6a780850b7aed81102409dda4ab4654eaba9f3f3074507c3331162c26`.
- Execute — exactly two `CreateJob` calls, both top-level HTTP 400 `BadRequest`; RequestIds `019FB7D9-E94A-5AD4-B2FD-5FCC96C741A6` and `019FB7D9-F017-5B8D-AC24-549D21FDA76E`; no third call.
- Official OpenAPI diagnosis — both calls reached `PaiDlc/CreateJob` in `cn-shanghai`, `FC.PASS`, response `src property must be a valid json object`; diagnostic solution unavailable.
- Runner terminal assertion — failed closed because neither Attempt reached `succeeded`.
- Post-run offline preflight — passed with existing Attempts 2, cloud calls 0 and database writes 0; sequence-8 model/wire equality remained true with zero recursive `src`.
- Serializable read-only database census — ProviderPayload/Attempt/Event/Command `2/2/4/2`; both Attempts `failed / real_provider_cleanup_unverified`; both commands `terminal / attemptCount 12 / REAL_PROVIDER_RECOVERY_NOT_FOUND`; CollectionAttempt/ProvisionalOutput/ExperimentResult/ScientificValidationReport/EvidenceCandidate/REU `0/0/0/0/0/0`.
- Credential cleanup — expired pre-window STS removed; live Cloud Shell source, `/tmp` and Downloads copies removed; final residual count 0.
- Authorization cleanup — runner reset to `LIVE_AUTHORIZATION_VALUE=null`; no environment value can enable another execute without a source change and review.
- Verdict — console-default output access omission is ruled out as the sole cause. Provider escalation is required before any successor, behavior change or live retry.
- Final `pnpm run typecheck:experiment-foundation-scripts` — passed with the no-active-authorization guard.
- T-132 document lint — 117 files, 0 errors and 7 pre-existing vague-reference warnings.
- Project-governance lint — passed with the same two unrelated T-124/T-133 state-format warnings.
- `git diff --check` and scoped secret-pattern scan — passed.
- Provider escalation draft — `artifacts/implementation/27-m7-l1-sequence8-provider-escalation.md`; no credentials, unredacted payload values or database dumps included; submission pending explicit confirmation.

## 2026-07-31 — provider escalation submission verification

Outcome: **submitted and assigned; provider response pending**.

- Authenticated session — RAM user `user_0002@1183869713036194.onaliyun.com` visibly confirmed before submission.
- Support scope — `人工智能平台 PAI`, urgency `产品使用咨询`, reviewed 1,432-character credential-free sequence-8 escalation body.
- Contact verification — Alibaba Cloud SMS challenge succeeded for masked mobile `181****3485`; call preference `工作日9:00-18:00`; account-wide default-contact checkbox remained disabled.
- Submission result — ticket `000F4RKW18`, submitted `2026-07-31 22:05` Asia/Shanghai.
- Detail-page state — `已分派`; engineer dispatch stage active; portal estimate 5-120 minutes for a progress update.
- Safety census — ticket attachments 0; STS values, one-time verification code, local env files, unredacted request bodies, OSS object values and database dumps recorded in the ticket/task docs 0.
- Execution boundary — `CreateJob`, provider Job, database write, capability change and billable runtime caused by support submission `0/0/0/0/0`.
- Next verification — review the provider reply against the four questions in `artifacts/implementation/27-m7-l1-sequence8-provider-escalation.md`; do not treat ticket assignment as provider acceptance or as authorization for another paid run.

## 2026-08-01 — controller GetWorkspace policy v4 verification

Outcome: **exact controller permission published and configuration parity verified; functional provider verification remains gated**.

- Repository policy JSON parse — passed.
- Repository policy SHA-256 — `6566a47ee9c07ce6a75c9aeedcbc721d299ae52e7620bbbf91e14564b04220d8`.
- Exact statement — one Allow for `paiworkspace:GetWorkspace` on `acs:paiworkspace:cn-shanghai:1183869713036194:workspace/1450165`.
- Pre-write version census — `v1=false`, `v2=false`, `v3=true`; version slots available and deletions 0.
- Rejected CLI attempt — unsupported local flag `--PolicyType`, exit code 2, policy/API mutation 0.
- Successful publish — custom policy `pea-m7-canary-controller` v4, `IsDefaultVersion=true`, `CreateDate=2026-08-01T08:07:44Z`, RequestId `019FBC5D-615E-5915-B388-0612E619C520`.
- Post-write version census — `v1/v2/v3=false`, `v4=true`.
- Post-write document verification — cloud v4 SHA-256 exactly equals the repository SHA-256; exact Action/Resource assertion returned 0.
- Unchanged boundaries — runtime policy, controller/runtime trust, role attachments and older non-default versions unchanged; temporary files removed.
- Effect census — STS, `GetWorkspace`, `CreateJob`, PAI Job, database/capability/scientific write and billable runtime `0/0/0/0/0/0/0`.
- Next gate — separately authorize a fresh controller STS and one read-only `GetWorkspace` call before interpreting the permission as functionally effective. A paid retry requires a separate new dated authorization.

## 2026-08-01 — controller GetWorkspace one-shot functional verification

Outcome: **exact controller workspace-read permission functionally verified; no paid execution performed**.

- Authorization boundary — one temporary controller STS, one read-only `GetWorkspace(1450165)` service request and credential cleanup; no `CreateJob` authorization.
- STS restriction — `DurationSeconds=900`; inline session policy allowed only `paiworkspace:GetWorkspace` on `acs:paiworkspace:cn-shanghai:1183869713036194:workspace/1450165`; assumed-role ARN validation passed.
- Local endpoint-resolution attempt — stopped before network dispatch with no RequestId; temporary files removed. This did not consume the one authorized service request.
- Actual service request — exactly one call to `aiworkspace.cn-shanghai.aliyuncs.com`; `WorkspaceId=1450165`, `Status=ENABLED`, RequestId `019FBC8E-4067-5E2E-9055-FD3C5D674F28`.
- Credential hygiene — environment-only temporary credentials, profile lookup disabled, mode-`0600` credential/response files, exit-trap deletion and post-command absence check passed.
- Effect census — AssumeRole credential issuances 2; actual `GetWorkspace` requests 1; `CreateJob`, PAI Job, database/capability/scientific writes, billable runtime and incremental cost `0/0/0/0/0/0`.
- Resulting gate — `pea-m7-canary-controller` can read exact workspace `1450165`; any paid Job retry remains blocked pending a new dated Job-count and monetary ceiling.
- Support handoff — credential-free verification reply submitted to ticket `000F4RKW18` at `2026-08-01 17:12:45` Asia/Shanghai; reply visibility check passed and ticket status became `处理中`. The reply explicitly recorded that no new `CreateJob` was submitted and requested confirmation of retry readiness or any remaining prerequisite.

## 2026-08-01 — sequence-9 one-Job provider acceptance verification

Outcome: **one authorized Job succeeded and its exact result was recovered/collected; durable two-cell acceptance remains open**.

- Authorization boundary — dated `2026-08-01`, maximum `1` Job, total ceiling `¥25`; exact `CreateJob` count `1`, second call `0`.
- Created Job — `dlc1b1qk22drb4au`; display name `ef-v2-real-1-86d9e9fec835b388729f31d3`.
- Lifecycle — `Creating -> EnvPreparing -> Running -> Succeeded`; create `2026-08-01T09:23:55Z`, submitted `09:25:24Z`, running `09:26:05Z`, finish/success `09:26:13Z`; observed running interval about 8 seconds.
- Terminal provider read — RequestId `019FBCA5-6727-5AA5-9B1F-851C2994B1BC`; later detail reads remained `Succeeded`.
- Recovery boundary — `sequence9-recover` enforced `maximumCreateJobCalls=0`; exact discovery/sync/collection succeeded without a second provider write.
- Collection result — schema `t132-m7-l1-sequence9-recovery-result@v1`; status `real_provider_probe_recovered_and_collected`; result-manifest hash `sha256:40a5efb0cffc55ddd91dd0dfa495761508c1b3b2aeaec3b0dfe5e592665edd86`.
- Echo-comparator coverage — focused direct test passed `6/6`, including empty-string provider echoes for optional `ResourceId`, credential-role `Policy` and `ResourceConfig` scalars.
- Typechecks — backend `typecheck`, package-local `typecheck:experiment-foundation-scripts` passed.
- Post-run offline preflight — exact sequence-8 model/wire equality remained stable; cell hashes `sha256:aa258e2263e31421225b04933c27f87d90fe8bcd7a6b8abb48258d30d95c5416` and `sha256:ed52f3804e3386c70054c10ca6218cbbd2f2b4483cb4a2e45aa7d796e128c3d4`; recursive `src` count 0; historical Attempt count 2; cloud/database writes 0.
- Safety census — diagnostic database writes 0, scientific-evidence writes 0, capability persistence 0, secret output 0; Cloud Shell, exact `/tmp` and Downloads credential residuals 0.
- Cost boundary — observed runtime and selected CPU scale are safely below ¥25; this record does not claim an exact charge before provider billing finalization.
- Remaining acceptance — one of two cells, no durable Pack B Attempt/output and no replay proof. T-132 completion checks remain unchecked until a fresh immutable successor completes the normal two-cell path and exact zero-duplicate replay.

## 2026-08-02 — commit-readiness verification

Outcome: **sequence-9 recovery checkpoint is verified and safe to commit; T-132 remains in progress**.

- Scope review — target diff contains only the live-window runner, Aliyun real-provider transport and focused unit test, exact controller policy, and T-132 `00`-`05` docs. Repo-wide unrelated modifications are not staged.
- Authorization retirement — source search confirms `sequence9-probe` and its dated one-Job/¥25 authorization string are absent; `sequence9-recover` remains and constructs a zero-create transport.
- Focused transport test — `TS_NODE_TRANSPILE_ONLY=1 node --test --loader ts-node/esm src/services/experiment-foundation-aliyun-real-provider-v2-transport.unit.test.ts`; passed 6/6.
- Backend typecheck — `pnpm --filter @paper-engineering-assistant/backend run typecheck`; passed.
- Runner typecheck — `pnpm --filter @paper-engineering-assistant/backend run typecheck:experiment-foundation-scripts`; passed.
- Offline preflight — `pnpm --filter @paper-engineering-assistant/backend experiment-foundation:m7-l1:live -- --mode offline-preflight`; passed against the exact sequence-8 Run/Bundle with Attempt count 2, cloud calls 0, database writes 0, current controller-policy hash, stable two-cell wire hashes and recursive `src` count 0.
- Documentation lint — `node .ai/scripts/lint-docs.mjs`; passed with 0 errors; warnings are repository-wide advisory findings.
- Project-governance lint — `node .ai/scripts/ctl-project-governance.mjs lint --json`; passed; two state-format warnings belong to unrelated T-124-era bundles.
- Scoped whitespace/error check — `git diff --check -- <T-132 files>`; passed.
- Secret-pattern check — scoped diff high-risk credential/private-key match count 0.
- Policy parity — repository policy JSON parsed; file SHA-256 exactly matched the live-runner constant `6566a47ee9c07ce6a75c9aeedcbc721d299ae52e7620bbbf91e14564b04220d8`.
- Staged-scope check — required immediately before commit; commit must contain no unrelated file and exactly one `Task: T-132` trailer.
- Push target — current branch `main`, remote `origin`; fetch/rebase safety check required before direct push, with no force push.

## 2026-08-02 — durable successor source-preparation verification

Outcome: **source identity and fail-closed authorization boundaries prepared; no successor row or cloud effect created**.

- Script typecheck — `pnpm --filter @paper-engineering-assistant/backend run typecheck:experiment-foundation-scripts`; passed after Prisma client generation and `tsc --noEmit`.
- Focused transport regression — `TS_NODE_TRANSPILE_ONLY=1 node --test --loader ts-node/esm src/services/experiment-foundation-aliyun-real-provider-v2-transport.unit.test.ts`; passed 6/6, including accepted-response loss, zero-create recovery, exhaustive exact discovery, duplicate/unknown-status failure, cancel and exact collection.
- Named-local apply authorization fence — ran the apply script with `T132_M7_DURABLE_TWO_CELL_SUCCESSOR_APPLY_AUTHORIZATION=not-authorized`; exited 1 with `No active max-40 named-local authorization` before database connection.
- Manifest-pin fence — `pnpm --filter @paper-engineering-assistant/backend experiment-foundation:m7-l1:live -- --mode offline-preflight`; exited 1 with `Run manifest hash is not pinned` before `DATABASE_URL` validation or database connection.
- Scope assertions — successor revision sequence 9 parents exact sequence 8, expects branch state/head `16/8 -> 18/9`, uses a distinct durable Run/business/id scope and retains the existing exact 40-row/protected-table/prohibited-effect census.
- Historical recovery isolation — `sequence9-recover` selects the frozen sequence-8 Run/hash/business identity; normal offline/image/execute modes select the new sequence-9 scope. The historical zero-CreateJob transport construction is unchanged.
- Effect census — named-local reads/writes 0/0; STS/cloud/provider/`CreateJob` 0/0/0/0; capability/scientific/evidence writes 0/0/0. Both named-local and paid authorization constants remain `null`.
- Documentation lint — `node .ai/scripts/lint-docs.mjs`; passed with 0 errors. Existing repository-wide advisory warnings remain non-blocking.
- Project-governance lint — `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`; passed. The two reported state-format warnings belong to unrelated T-124-era bundles.
- Scoped whitespace check — `git diff --check -- <two T-132 scripts and 00-04 task docs>`; passed.
- Scoped secret-pattern scan — target diff contained no access-key, secret/token, password assignment or private-key marker.

## 2026-08-02 — durable successor authorized pre-apply verification

Outcome: **exact named-local target and empty successor prefix verified read-only; max-40/no-cloud authorization recorded but not yet consumed**.

- Target preflight — inline Prisma command used `assertExperimentFoundationNamedLocalDatabaseUrl`, live target fingerprint verification and server-enforced read-only `REPEATABLE READ`; passed for `postgres / my_researcher_dev / 127.0.0.1:5432` and fingerprint `sha256:8851b255b079ad1f049dc1842c41cb3516d5a3ff0b69e21a30e8f2675409cca0`.
- Cycle — `validation_cycle_t132_m7_l1_p313_v1` remained `admitted / not_started`; closure count 0.
- Parent branch — state/current/head were exactly `16 / sequence 8 / 8`; head Run was `ef_run_v2_t132_m7_l1_console_default_access_successor_v8_1`.
- Successor prefix — revision `pi_experiment_revision_v2_t132_m7_l1_durable_two_cell_successor_v9_1` count 0; Run `ef_run_v2_t132_m7_l1_durable_two_cell_successor_v9_1` count 0.
- Read-only effect census — database writes, cloud/provider calls, `CreateJob`, capability/scientific/evidence writes all 0.
