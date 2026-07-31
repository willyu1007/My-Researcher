# M7-L1 Sequence-8 Provider Escalation

## Status

- Drafted: 2026-07-31
- Submission status: not submitted
- Authorization status: the 2026-07-31 two-Job/¥50 window is exhausted
- Further `CreateJob` calls: prohibited until provider guidance is reviewed and a new dated window is authorized

## Support request

Please identify which provider-side field or transformation produces the response
`src property must be a valid json object` for PAI-DLC `CreateJob`, or provide the
supported request correction for direct OSS data sources with a custom runtime role.

The public SDK model and final serialized wire body contain no recursive `src` key.
The same rejection persists after aligning the direct OSS access shape with the current
PAI console serializer.

## Provider references

| Field | Cell 1 | Cell 2 |
|---|---|---|
| RequestId | `019FB7D9-E94A-5AD4-B2FD-5FCC96C741A6` | `019FB7D9-F017-5B8D-AC24-549D21FDA76E` |
| SDK request time | `2026-07-31T11:05:37Z` | `2026-07-31T11:05:38Z` |
| HTTP status | `400` | `400` |
| Provider code | `BadRequest` | `BadRequest` |
| Flow control | `FC.PASS` | `FC.PASS` |
| Response | `src property must be a valid json object` | `src property must be a valid json object` |
| Model/wire SHA-256 | `sha256:aa258e2263e31421225b04933c27f87d90fe8bcd7a6b8abb48258d30d95c5416` | `sha256:ed52f3804e3386c70054c10ca6218cbbd2f2b4483cb4a2e45aa7d796e128c3d4` |
| Model/wire bytes | `2966 / 2966` | `2969 / 2969` |

## Exact provider scope

- Product/API: `PaiDlc / 2020-12-03 / CreateJob`
- Endpoint/region: `pai-dlc.cn-shanghai.aliyuncs.com / cn-shanghai`
- Workspace: `1450165`
- Resource mode: public resource, `ecs.g6.large`
- Per Job: 2 CPU, 8192 MiB, maximum 30 minutes
- Image: PAI managed image `image-liuxvj7p2qcnflha84`
- Controller role: `pea-m7-canary-controller`
- Runtime role: `pea-m7-canary-runtime`
- Workload: two diagnostic-only SciFact/RAGPerf cells

## Request-shape evidence

For both cells:

- official SDK model bytes equal final wire bytes;
- semantic equality and JSON round trip are true;
- recursive `src` key count is `0` in both model and wire;
- four `DataSources[].Options` values are strings and parse as JSON objects;
- the source-binding environment value is a string and parses as a JSON object;
- code and input sources carry explicit `MountAccess: "RO"`;
- the final output source omits `MountAccess`, matching the untouched default-RW
  console transition;
- `CredentialConfig` contains the reviewed environment-role shape;
- runtime role entries contain `RoleArn + RoleType`;
- `AssumeRoleFor`, `ResourceId` and `JobSpecs[].ResourceConfig` are absent.

Dynamic URIs, commands, environment values, tags, role ARNs and credentials are not
included in this draft. They can be supplied only through an approved secure support
channel if Alibaba Cloud confirms they are required.

## Safe terminal outcome

- `CreateJob` calls: exactly 2; no third call
- Accepted or discovered Jobs: 0
- External Job refs: 0
- ProviderPayload / Attempt / AttemptEvent / Command: `2 / 2 / 4 / 2`
- Both Attempts: `failed / real_provider_cleanup_unverified`
- Both submit commands: `terminal`, 12 recovery passes,
  `REAL_PROVIDER_RECOVERY_NOT_FOUND`
- CollectionAttempt / ProvisionalOutput / ExperimentResult /
  ScientificValidationReport / EvidenceCandidate / RunEvidenceUnit:
  `0 / 0 / 0 / 0 / 0 / 0`
- Observed billable runtime: 0
- Temporary credentials: removed from Cloud Shell, `/tmp` and Downloads

## Requested provider answer

1. Identify the internal `src` field path and the request field from which PAI-DLC
   derives it.
2. Confirm the supported JSON/string representation for that field when using direct
   OSS data sources and `CredentialConfig`.
3. Confirm whether the public `@alicloud/pai-dlc20201203` model requires a provider
   compatibility transformation not described by the public `CreateJob` contract.
4. If the request is valid, confirm a service-side defect and the affected region/API
   version.

## Do not attach

- STS access key, secret or security token
- local `.env` files
- full unredacted request bodies
- dataset contents or OSS object values
- application database dumps
