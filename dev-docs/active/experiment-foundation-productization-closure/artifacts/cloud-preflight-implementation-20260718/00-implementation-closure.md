# Zero-write Aliyun cloud-preflight implementation closure

## Scope

This artifact closes the implementation portion of T-132's exact-payload, real-read-only Aliyun preflight lane. It does not close the live cloud acceptance gate and does not authorize `CreateJob`, uploads, cloud training, database migration, product traffic, scientific validation or evidence minting.

## Delivered boundary

- Exact v1 shared schemas and CP01-CP12 status contract.
- Exact Aliyun PAI-DLC `CreateJob` request materialization from the acknowledged Pack A Run's ordered RunCell/TrainingTaskSpec bindings plus a code-owned execution profile.
- Transient full-payload canonicalization, 65,536-byte ceiling, canonical hash and redacted-only durable manifest.
- Same-exact-payload deterministic fake submit/replay/sync/cancel/reconcile/recovery/collect lifecycle with zero provider/scientific writes.
- Official Alibaba Cloud SDK transport exposing only `AIWorkspace.GetWorkspace`, `AIWorkspace.ListResources` and `PaiDlc.ListEcsSpecs`.
- Application hard denial of `PaiDlc.CreateJob` before provider transport.
- Complete temporary STS, access-key-id-hash-bound current policy evidence, exact reviewer, canonical timestamp/24-hour lifetime, repo-external realpath/non-symlink/inode/permission and independently supplied exact-file digest fences, required List/Get allow and explicit `paidlc:CreateJob` deny fences.
- The policy contains only the two documented AIWorkspace read actions; the DLC `ListEcsSpecs` call remains transport-allowlisted without an invented RAM action because its official 2020-12-03 API page currently exposes no authorization information.
- Bounded paginated `ListResources`/`ListEcsSpecs` SDK mapping plus a checked-in no-network injected-client test.
- Default-off development env contract and checked-in machine gate. Named-local target/scope/digest evidence runs inside one server-verified read-only repeatable-read transaction; no Prisma schema or database authority change was required.

## Verification

- Shared contracts: 2 passed, 0 failed.
- Backend payload/policy/official-SDK-pagination/fake-lifecycle tests: 8 passed, 0 failed.
- Gate meta tests: 3 passed, 0 failed, including a controlled repo-local policy-evidence blocker summary.
- Shared, backend and experiment-foundation script typechecks: passed.
- Env contract validation/generation and environment suite: passed; no secret value generated.
- Shared full suite: 359 passed, 0 failed. Backend full suite: 2,247 tests, 2,197 passed, 0 failed, 50 explicit conditional database/provider skips, 0 todo, duration `417301.75475ms`.
- The SDK graph resolves to `lodash@4.18.1` and `fast-uri@3.1.2`; Fastify is 5.10.0. Frozen install and typechecks pass, and the production audit reports no known vulnerabilities.
- Read-only Pack A and Pack B product verifiers passed after shared evidence-helper extraction. Pack A verify accepts the already-landed 28 Pack B rows only when their exact before/after census is unchanged; Pack A apply retains its zero-row Pack B precondition.

Final local run: `cloud-preflight-local-20260718-r9`.

- Status: `blocked` (expected fail-closed result).
- Source Pack B evidence SHA-256: `7cc6044bc3822e4197f99638b09b7a4f9e90640bb205cde929f98df2b998e9c7`.
- Ephemeral r9 summary SHA-256: `77f8f9973f2237e706216c894d55ff44657c6bede27fd32e42c0c6e09a3b07ea`.
- Exact Run: `ef_run_v2_c4ab7919-2d7b-415c-ab53-201b11464aca`.
- Run manifest: `sha256:8965ebdfd39f899a56ff242aedc968c0b29dd8048a2cecba1ac3ecdb9342d915`.
- Ordered cells: 2.
- Passed checks: CP01, CP04, CP05, CP11, CP12.
- Blocked inputs: exact region/workspace/DLC-quota/image profile; complete temporary STS; current reviewed repo-external RAM policy evidence and its independent exact-file digest; explicit capability window.
- Protected authority: 88 tables, `transaction_read_only=true`, `changed_tables=[]`.
- Provider transport operations: 0; provider write requests: 0; `CreateJob` calls: 0; database writes: 0; scientific writes: 0.
- Scientific execution: `not_started`; evidence eligibility: `false`.

The ephemeral summary is not the durable SSOT. The checked-in closure and the canonical T-132 documents preserve the sanitized conclusion and bind the summary SHA-256.

## Remaining live gate

A controlled zero-write run must supply the exact reviewed execution profile, a complete temporary STS triplet, current repo-external identity-policy evidence and its independently reviewed exact-file SHA-256 digest, then temporarily enable only `EXPERIMENT_FOUNDATION_V2_ALIYUN_CLOUD_PREFLIGHT_ENABLED`. The same gate must pass all CP01-CP12 checks. It may issue only the three named read operation types with bounded list pagination and must restore the flag to `false` afterward.

Until that run passes, EF-P16 remains `blocked`; signing, regional endpoints, workspace ENABLED state, exact DLC quota visibility and CPU-spec availability are unverified. Even a future `cloud_preflight_passed` result will leave scheduling stock, image pull, mounts, runtime network, accelerator health, user command, logs/results, real cancel/cleanup and scientific evidence unverified.
