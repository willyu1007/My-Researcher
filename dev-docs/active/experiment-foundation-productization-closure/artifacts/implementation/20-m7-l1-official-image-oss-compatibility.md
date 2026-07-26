# T-132 M7-L1 official-image + OSS compatibility review

Date: 2026-07-26

Status: **route accepted; repository compatibility increment required before object upload or live submission**

## Question

Can the canary avoid a custom ACR repository and run on PAI-DLC with a PAI official CPU image, immutable OSS-delivered code/data and OSS output while preserving the existing least-privilege controller/runtime split?

## Decision

Yes at the provider architecture level, but not with the repository payload as currently implemented.

The accepted route is:

1. select a PAI official CPU image by actual provider `ImageUri`;
2. package the stdlib-only `workloads/ragperf-canary/` code as a content-addressed OSS object;
3. mount exact code/input refs read-only and an exact run output prefix read-write;
4. bind the entrypoint path variables to those mount paths;
5. inject the exact runtime role through `CredentialConfig`;
6. keep both real-provider capabilities false until the complete request is schema-valid, canonical-hashed, redacted, SDK-mapped and negatively tested.

The console-visible label `torcheasyrec:1.3.0-pytorch2.12.1-cpu-py311-ubuntu22.04` is only a candidate label. It is not yet accepted as a full image URI or immutable digest.

## Evidence table

| Question | Primary evidence | Finding | Repository consequence |
|---|---|---|---|
| Can DLC run an official image without ACR? | [PAI official images](https://help.aliyun.com/en/pai/pai-official-mirror), [Create a training task](https://help.aliyun.com/en/pai/create-a-training-task) | DLC supports PAI official images; a custom image is optional. | Remove ACR as a canary prerequisite. |
| Can `CreateJob` bind OSS paths? | [CreateJob API](https://help.aliyun.com/en/pai/developer-reference/api-pai-dlc-2020-12-03-createjob), [Use cloud storage for a DLC job](https://help.aliyun.com/en/pai/use-cloud-storage-for-a-dlc-job) | `DataSources` can carry OSS URI, mount path and mount access; mounted paths are readable/writable according to configuration. | Add exact code/input/output `DataSources` to the payload contract and SDK map. |
| Can the workload receive path bindings? | [CreateJob API](https://help.aliyun.com/en/pai/developer-reference/api-pai-dlc-2020-12-03-createjob) | `Envs` is supported in addition to `UserCommand`. | Bind the existing `RAGPERF_*` path/output variables rather than relying on ambient state. |
| Can the job use a custom runtime role without embedded AK/SK? | [Configure the DLC RAM role](https://help.aliyun.com/en/pai/configure-the-dlc-ram-role), [CreateJob API](https://help.aliyun.com/en/pai/developer-reference/api-pai-dlc-2020-12-03-createjob) | DLC can obtain temporary credentials from a custom role; `CredentialConfig` exists on the request. | Bind exact runtime role ARN and keep controller credentials out of the job. |
| Can the actual official image URI be enumerated? | [ListImages API](https://help.aliyun.com/zh/pai/developer-reference/api-aiworkspace-2021-02-04-listimages) | The API returns `ImageUri` and image metadata. | Resolve the full URI before bundle freeze; do not use a console label as executable authority. |
| Is OSS mounting authorized solely by the runtime role? | [Use cloud storage for a DLC job](https://help.aliyun.com/en/pai/use-cloud-storage-for-a-dlc-job), [Permissions required to use DLC](https://help.aliyun.com/en/pai/grant-the-permissions-that-are-required-to-use-dlc) | PAI/DLC storage mounting has a service-authorization prerequisite. The reviewed sources do not prove that runtime credential injection alone authorizes the mount service. | Verify platform mount authorization separately from in-container runtime-role permissions. |

## Repository compatibility census

| Surface | Current state | Required delta |
|---|---|---|
| ExecutionBundle | Already separates `code_artifact`, `container_image` and `dataset_mirrors`. | Require exact refs/digests/byte sizes to be consumed by materialization, not merely stored. |
| Shared cloud-preflight payload schema | Contains workspace/resource/display/job/spec/command/accessibility only. | Add closed typed structures for `DataSources`, `Envs` and `CredentialConfig`. |
| Real-provider payload materializer | Does not bind code artifact or dataset mirrors into `CreateJob`. | Produce exact RO code/input mounts, RW output mount, env bindings and runtime role binding. |
| Official SDK map | Pinned SDK supports the required fields, but the application map omits them. | Map every field exactly and assert no unreviewed expansion. |
| Durable payload evidence | Hash/redaction covers the current smaller request. | Include mount refs/access/path, environment keys with redacted or hashed values as appropriate, role ARN hash and artifact/mirror bindings. |
| Canary entrypoint | Stdlib-only; reads path/output settings from `RAGPERF_*` environment variables. | Bind those variables to reviewed mount paths or add a separately reviewed CLI contract. |
| Official image identity | Console label recorded; full URI/digest not proven. | Resolve `ImageUri` and define the immutable identity accepted by bundle freeze. |

## Required implementation increment

This is a bounded default-off extension of the existing M7 provider shape, not live authorization:

1. extend schemas and types with exact-size/count/enum bounds;
2. materialize deterministic `DataSources`, `Envs` and `CredentialConfig`;
3. bind every workload/dataset artifact ref, digest and byte size into payload evidence;
4. map the exact request through the pinned official SDK;
5. add substitution, omission, access-mode, path, role and payload-size negative tests;
6. resolve the official image URI/identity and PAI OSS mount authorization;
7. rerun the offline same-payload gate with provider writes and `CreateJob` still zero.

## Explicit non-authorization

This review authorizes no OSS upload, STS issue, capability change, `CreateJob`, provider write, database write, scientific write or billable execution. The final M7-L1 in-session authorization remains mandatory after all five materials are complete.
