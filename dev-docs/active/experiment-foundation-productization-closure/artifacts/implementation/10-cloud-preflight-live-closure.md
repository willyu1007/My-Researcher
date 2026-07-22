# T-132 Aliyun public-resource read-only preflight closure

Date: 2026-07-23

Run: `cloud-preflight-public-resource-readonly-20260723-r6`

Verdict: `cloud_preflight_passed`
Summary SHA-256: `ae524752ef64f658ddfb796e8c0834bf0903baadf1c8e79cfbc392887c516053`

## Closure statement

The controlled Aliyun PAI-DLC read-only window passed CP01 through CP12 against the exact acknowledged two-cell T-132 Run. The window proved official-SDK signing, the `cn-shanghai` regional endpoints, an enabled workspace, public-resource selection semantics, visible CPU specifications, exact offline `CreateJob` payload materialization, same-payload fake lifecycle behavior and zero-write isolation.

This is a control-plane preflight closure only. No `CreateJob`, `StopJob`, provider-side mutation, database mutation, scientific result, validation, EvidenceCandidate, RunEvidenceUnit or Cycle closure was produced.

## Exact scope

| Item | Frozen observation |
|---|---|
| Resource mode | `public_resource`; `ResourceId` absent from canonical payload and SDK request |
| Exact batch | one acknowledged Run, two ordered cells: `retriever-top-k-5`, `retriever-top-k-10` |
| Offline payloads | two canonical payloads, 354 and 355 bytes |
| Payload hashes | `sha256:d460d32eb8225141959b6d2744174f9576bef4d8898c988327bee28b2c052989`; `sha256:45e32261a38aec77142ebfe967c75e5126f28713f9e7071569379c8d363bf1d2` |
| Provider observations | 1 `GetWorkspace`, 1 `ListResources`, 11 paginated `ListEcsSpecs` calls |
| CPU specifications | 108 visible, 105 available |
| Provider writes | 0 |
| `CreateJob` calls | 0 |
| Database/scientific writes | 0 / 0 |
| Protected database fence | 88 tables, `changed_tables=[]`, server-enforced `transaction_read_only=on` |
| Scientific state | `not_started`; `evidence_eligibility=false` |

## CP01-CP12 disposition

| Check group | Result | Evidence meaning |
|---|---|---|
| CP01 exact scope | passed | exact WorkOrder revision, Run manifest, ordered cells and Pack B evidence resolved |
| CP02-CP03 payload/hash/redaction | passed | both offline requests are schema-valid, canonical-hashed and persist only redacted manifests |
| CP04-CP05 hard deny/allowlist | passed | application rejects `CreateJob` before transport; transport surface is the three frozen read operations |
| CP06 identity policy | passed | temporary credential matched reviewed evidence and explicitly denied `paidlc:CreateJob` |
| CP07-CP09 live read-only boundary | passed | official signing/endpoints, enabled workspace and public CPU-spec visibility verified |
| CP10 same-payload lifecycle | passed | exact payload/hash drove fake replay, sync, cancel, reconcile, recovery and collect paths |
| CP11-CP12 zero writes | passed | cloud/provider/database/scientific write censuses are zero and protected-table digests are unchanged |

## HTTP 400 root cause and repair

The failed r5 request was not an IAM denial and was not caused by the PAI console white-screen behavior. A controlled single-variable diagnostic using the same STS identity showed:

1. minimal `ListEcsSpecs(ResourceType=ECS)` returned HTTP 200;
2. adding `AcceleratorType=CPU` still returned HTTP 200;
3. adding optional `SortBy=CPU` returned HTTP 400 `BadRequest`.

Production transport now uses the provider-verified page size 10, `ResourceType=ECS` and `AcceleratorType=CPU`, and omits `SortBy` and `Order`. Safe provider failure metadata is restricted to bounded status/code/request-id tokens; raw SDK diagnostics never enter the durable summary.

## Security and cleanup

- The short-lived STS credential expired at `2026-07-23T00:04:58.000Z` and was restricted to the reviewed read actions with an explicit `paidlc:CreateJob` deny.
- An ephemeral browser/task capture briefly contained the temporary credential. No credential value is copied into repository documentation or artifacts; expiry and the restricted session policy bound the exposure window. A future live window must use a newly issued credential.
- Temporary STS/evidence files and one-off diagnostic scripts were removed after the run.
- Product capabilities remain default-off. The preflight capability does not authorize real execution and cannot be reused as the M7 write capability.

## Explicitly unverified

- scheduler acceptance and real capacity stock;
- image pull and runtime dependency availability;
- code/data mounts and runtime network path;
- user command execution, logs and result collection;
- real cancellation, timeout and cleanup;
- scientific result validation and evidence production.

## Official provider references reviewed

| Claim | Primary source | Decision impact |
|---|---|---|
| `CreateJob` is billable, limited to 65,536 request bytes and can omit `ResourceId` for public resources | [Aliyun PAI-DLC CreateJob](https://help.aliyun.com/en/pai/developer-reference/api-pai-dlc-2020-12-03-createjob) | preflight retains exact byte ceiling and public-resource omission; no write was made |
| PAI-DLC 2020-12-03 is an ROA API with separate create/get/stop/log operations | [Aliyun PAI-DLC API overview](https://help.aliyun.com/en/pai/developer-reference/api-pai-dlc-2020-12-03-overview) | future M7 transport must use explicit operation allowlists |
| `GetJob` exposes the provider lifecycle states and pod IDs | [Aliyun PAI-DLC GetJob](https://help.aliyun.com/en/pai/developer-reference/api-pai-dlc-2020-12-03-getjob) | future sync/reconcile must map a closed status vocabulary |

## Handoff

EF-P16 is verified for the frozen read-only preflight boundary. It does not verify M7 real-provider execution or any scientific claim. The only permitted next step without a new live-write authorization is the M7 code/readiness slice described in `11-m7-real-provider-readiness-review.md`.
