# M7-L1 fresh GetImage closure

Date: 2026-07-27

Observed at: approximately 22:58 Asia/Shanghai

Scope: read-only PAI AIWorkspace image lookup

## Authorization

The user authorized the next documented boundary: a fresh read-only `GetImage`
comparison for `cn-shanghai / image-liuxvj7p2qcnflha84`.

Excluded:

- credentials or token capture;
- capability changes;
- `CreateJob` or any provider write;
- paid compute;
- database, scientific or evidence writes.

## Observation

The Alibaba Cloud CLI requires an explicit AIWorkspace regional endpoint. The
first attempt stopped locally with `unknown endpoint` and had no RequestId.

Two subsequent reads used:

- service: `aiworkspace`
- operation: `GetImage`
- endpoint: `aiworkspace.cn-shanghai.aliyuncs.com`
- region: `cn-shanghai`
- image: `image-liuxvj7p2qcnflha84`

The first successful read returned RequestId
`019FA414-79EA-53A0-BF7D-B0F7B48266D9`; the second returned RequestId
`019FA414-E2BA-5365-BF54-A72B87AF7825`.

| Field | Fresh value | Frozen bundle value | Result |
|---|---|---|---|
| ImageId | `image-liuxvj7p2qcnflha84` | same | pass |
| ImageUri | `dsw-registry-vpc.cn-shanghai.cr.aliyuncs.com/pai/torcheasyrec:1.3.0-pytorch2.12.1-cpu-py311-ubuntu22.04` | same | pass |
| GmtCreateTime | `2026-07-02T04:35:35.000Z` | same provider timestamp | pass |
| GmtModifiedTime | `2026-07-02T04:35:35.000Z` | same | pass |
| Size | `3803970629` | same | pass |
| Accessibility | `PUBLIC` | same | pass |
| SourceType | `Import` | same | pass |
| Identity | null | no content identity claimed | pass |
| Signature | null | no signature claimed | pass |

The frozen authoring source is
`workloads/ragperf-canary/manifests/execution-bundle-v2.json`. No field drift
was observed.

## Negative-space census

- successful provider reads: 2
- failed-before-transport CLI attempts: 1
- cloud/provider writes: 0
- `CreateJob`: 0
- capability changes: 0
- credential capture: 0
- provider compute: 0
- database/scientific/evidence writes: 0

## Disposition

The provider-managed image metadata gate passes for the current short window.
This observation is not an OCI/content digest, image-pull proof, live-job
authorization or scientific acceptance. If the live window is delayed, repeat
the same read-only comparison before any `CreateJob`.
