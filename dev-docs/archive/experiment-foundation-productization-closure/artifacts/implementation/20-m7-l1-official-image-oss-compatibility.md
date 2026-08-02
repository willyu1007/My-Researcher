# T-132 M7-L1 official-image + OSS compatibility review

Date: 2026-07-26; updated 2026-07-27

Status: **route accepted; repository compatibility and provider-managed image identity increments verified offline; exact ImageUri/PAI ImageId, DLC OSS service authorization and three input objects verified; Dataset revision binding/final bundle freeze remain before live submission**

## Question

Can the canary avoid a custom ACR repository and run on PAI-DLC with a PAI official CPU image, immutable OSS-delivered code/data and OSS output while preserving the existing least-privilege controller/runtime split?

## Decision

Yes at the provider architecture level. The repository payload compatibility gap identified by this review was implemented and verified offline on 2026-07-26.

The accepted route is:

1. select a PAI official CPU image by actual provider `ImageUri`;
2. package the stdlib-only `workloads/ragperf-canary/` code as a content-addressed OSS object;
3. mount exact code/input refs read-only and an exact run output prefix read-write;
4. bind the entrypoint path variables to those mount paths;
5. inject the exact runtime role through `CredentialConfig`;
6. keep both real-provider capabilities false until the complete request is schema-valid, canonical-hashed, redacted, SDK-mapped and negatively tested.

Read-only `GetImage` resolved PAI asset `image-liuxvj7p2qcnflha84` to `dsw-registry-vpc.cn-shanghai.cr.aliyuncs.com/pai/torcheasyrec:1.3.0-pytorch2.12.1-cpu-py311-ubuntu22.04`. This is the accepted provider address, but not an immutable content digest: the response exposed no digest and returned null `Identity`/`Signature`. The repository now models that distinction explicitly: unchanged `ExecutionBundle@v1` remains OCI-digest based, while `ExecutionBundle@v2` admits the exact PAI provider-managed asset only for `m7_l1_diagnostic_only`.

## Evidence table

| Question | Primary evidence | Finding | Repository consequence |
|---|---|---|---|
| Can DLC run an official image without ACR? | [PAI official images](https://help.aliyun.com/en/pai/pai-official-mirror), [Create a training task](https://help.aliyun.com/en/pai/create-a-training-task) | DLC supports PAI official images; a custom image is optional. | Remove ACR as a canary prerequisite. |
| Can `CreateJob` bind OSS paths? | [CreateJob API](https://help.aliyun.com/en/pai/developer-reference/api-pai-dlc-2020-12-03-createjob), [Use cloud storage for a DLC job](https://help.aliyun.com/en/pai/use-cloud-storage-for-a-dlc-job) | `DataSources` can carry OSS URI, mount path and mount access; mounted paths are readable/writable according to configuration. | Add exact code/input/output `DataSources` to the payload contract and SDK map. |
| Can the workload receive path bindings? | [CreateJob API](https://help.aliyun.com/en/pai/developer-reference/api-pai-dlc-2020-12-03-createjob) | `Envs` is supported in addition to `UserCommand`. | Bind standard `EXPERIMENT_FOUNDATION_*` mount/output variables rather than relying on ambient state. |
| Can the job use a custom runtime role without embedded AK/SK? | [Configure the DLC RAM role](https://help.aliyun.com/en/pai/configure-the-dlc-ram-role), [CreateJob API](https://help.aliyun.com/en/pai/developer-reference/api-pai-dlc-2020-12-03-createjob) | DLC can obtain temporary credentials from a custom role; `CredentialConfig` exists on the request. | Bind exact runtime role ARN and keep controller credentials out of the job. |
| Can the actual official image URI be enumerated? | [ListImages API](https://help.aliyun.com/zh/pai/developer-reference/api-aiworkspace-2021-02-04-listimages), [GetImage API](https://help.aliyun.com/zh/pai/developer-reference/api-aiworkspace-2021-02-04-getimage) | The API returns `ImageUri` and image metadata. The 2026-07-27 read-only lookup resolved the exact URI and ImageId, but no content digest. | Use the exact URI as provider address evidence; keep the distinct content-identity gate open. |
| Is OSS mounting authorized solely by the runtime role? | [Use cloud storage for a DLC job](https://help.aliyun.com/en/pai/use-cloud-storage-for-a-dlc-job), [Permissions required to use DLC](https://help.aliyun.com/en/pai/grant-the-permissions-that-are-required-to-use-dlc) | PAI/DLC storage mounting has a service-authorization prerequisite. The 2026-07-27 account page reports DLC OSS data storage `已开通`; runtime object access is still a separate live concern. | Platform mount authorization is verified; retain independent runtime-role/object-access verification. |

## Repository compatibility census

| Surface | Current state | Required delta |
|---|---|---|
| ExecutionBundle | v1 remains OCI-digest exact; v2 adds a separate typed PAI provider-managed asset restricted to M7-L1 diagnostic use. | Bind exact Dataset revisions and freeze the final reviewed v2 bundle. |
| Real-provider profile/schema | `AliyunPaiDlcRealProviderProfile@v1`, workload binding and exact transient request schema implemented. | Construct the final reviewed profile and compare a fresh `GetImage` observation before submission. |
| Real-provider payload materializer | Exact content-addressed RO code/input mounts, exact RW run/cell output mount, standard env bindings and runtime-role binding implemented. Workload and both SciFact objects are uploaded/verified. | Populate the two exact Dataset revision bindings and rerun same-payload verification. |
| Official SDK map | Exact `DataSources`, `Envs` and `CredentialConfig` mapping plus closed `toMap()` validation implemented. | Reuse unchanged for the final frozen bundle. |
| Durable payload evidence | Artifact/mirror digest + byte size, role/image/mount/ref/output/environment hashes and exact redaction census implemented. | Record the final materialization evidence without raw cloud refs. |
| Canary entrypoint | Consumes standard mounted directories and approved `--cell-key`, and validates parser/result lineage. | Package it as an expanded mounted directory, not only a compressed archive. |
| Official image identity | Exact provider metadata is represented by the v2 `provider_managed_asset` branch; redacted evidence stores only its typed hash and diagnostic scope. | Fresh read-only metadata comparison remains mandatory immediately before live submission; M7-L2 requires OCI/content digest identity. |

## Required implementation increment

This is a bounded default-off extension of the existing M7 provider shape, not live authorization:

1. extend schemas and types with exact-size/count/enum bounds;
2. materialize deterministic `DataSources`, `Envs` and `CredentialConfig`;
3. bind every workload/dataset artifact ref, digest and byte size into payload evidence;
4. map the exact request through the pinned official SDK;
5. add substitution, omission, access-mode, path, role and payload-size negative tests;
6. **Completed 2026-07-27:** exact ImageUri/ImageId, PAI OSS mount authorization and the separate diagnostic-only provider-managed identity contract are verified;
7. **Objects completed; bundle pending:** bind exact Dataset revisions, freeze the v2 bundle and rerun the offline same-payload gate with provider writes and `CreateJob` still zero.

Items 1-5 were implemented and verified on 2026-07-26. Shared full tests passed 397/397; backend full tests reported 2,354 passed, 0 failed and 62 conditional skips out of 2,416; focused provider/OpenAPI tests passed 14/14. OpenAPI quality and regenerated API index verification passed. The 2026-07-27 preflight added only provider reads and console inspection: no cloud write, upload, capability enable, `CreateJob` or billable execution occurred.

The 2026-07-27 provider-managed identity increment passed shared full tests 398/398 and backend full tests 2,356 passed, 0 failed and 62 conditional skips out of 2,418, plus shared/backend type checks. That increment performed no cloud/provider/database/scientific write and did not enable either real-provider capability.

## Explicit non-authorization

This review authorizes no OSS upload, STS issue, capability change, `CreateJob`, provider write, database write, scientific write or billable execution. The final M7-L1 in-session authorization remains mandatory after all five materials are complete.
