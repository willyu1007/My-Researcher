# T-132 M7-L1 live-canary authorization materials (fill-in)

Status: **materials in preparation** — items 2/4 decided 2026-07-25; item 3 OSS bucket and lifecycle completed 2026-07-26; item 1 workload draft and default-off provider bindings are locally verified, the exact official image address/provider asset and DLC OSS service authorization were verified 2026-07-27, while the image content-identity contract and object manifests remain pending; item 5 custom policies, role split, trust policies and attachments completed and verified 2026-07-26. This document collects the five blocking inputs from `11-m7-real-provider-readiness-review.md` § "Blocking inputs before any live call". Non-secret decisions and digests are committed here; credentials are NEVER committed — they are supplied process-scoped at window time only (the M6-R4 pattern).

Submission protocol per item: edit the `DECISION:` lines in this file (or state the choice in chat and Codex records it here), then the final line of this document gets your explicit "M7-L1 authorized" statement. Codex prepares every artifact marked `[Codex prepares]` for your review before the window.

## 1. Exact workload (ExecutionBundle)

Required: reviewed ExecutionBundle revision — immutable code artifact ref + content digest + byte size; container image ref + digest; provider-neutral entrypoint/args; dependency-lock digest; typed output contract + parser profile version/hash.

- [Codex prepared] a runnable RAGPerf adapter-tier workload draft whose mounted code directory is delivered through a content-addressed OSS prefix and whose entrypoint emits the exact `ExperimentFoundationProviderResultEnvelope@v1` JSON for the two cells `retriever-top-k-5/10`.
- Prepared: `workloads/ragperf-canary/` — stdlib-only deterministic CPU retrieval pipeline (canary profile `ragperf_canary_stats@v1`, honesty boundary documented), Dockerfile pinned to the verified upstream digest `python:3.11-slim@sha256:00af38ae…db045`, two cell configs, fixture. Verified: local + `--network none` container selftests pass; emitted `result.json` is schema-valid and byte-identical under the repository canonicalizer.
- DECISION (owner, 2026-07-26): **approved route change** — do not use ACR. Use a PAI official CPU image plus exact OSS bindings for content-addressed code/input/output. The provider payload now binds `DataSources`, `Envs` and runtime-role `CredentialConfig`.
- VERIFIED (read-only, 2026-07-27): PAI asset `image-liuxvj7p2qcnflha84` resolves to `dsw-registry-vpc.cn-shanghai.cr.aliyuncs.com/pai/torcheasyrec:1.3.0-pytorch2.12.1-cpu-py311-ubuntu22.04`; DLC OSS data storage is `已开通`. The lookup exposed no OCI/content digest and returned null `Identity`/`Signature`, so the existing `image_digest` requirement is not closed.
- PREPARED (local-only, 2026-07-27): `workloads/ragperf-canary/manifests/workload-directory-v1.json` binds a one-file expanded directory (`entrypoint.py`) at SHA-256 `9b2a82298dfa969146e5e223893d3d86c6254cb16a995be72b65709a55b4f05d`, 7,916 bytes, to the future exact internal OSS prefix. It remains `not_uploaded`.
  - `DECISION: official-image + OSS route accepted; payload increment completed offline; exact ImageUri/ImageId and mount authorization verified; workload manifest prepared; content-identity contract and OSS objects pending`

## 2. Dataset mirrors

Required: two immutable source-backed mirror manifests — exact Dataset revisions, object refs, content digests, byte sizes, access policy, cleanup/retention.

- [Codex prepares] two ordered mirror manifests once the workload payload increment is verified; upload commands are run only in a separately approved window.
- DECISION (owner, 2026-07-25): **approved per recommendation** — one BEIR SciFact slice, represented by ordered content-addressed `corpus.jsonl` and `queries.jsonl` mirror directories below `oss://<bucket>/input/scifact/`, retained until M7-L2 closes then deleted.
  - `DECISION: scifact-slice, two ordered object mirrors, delete-after-L2`

## 3. Output channel (OSS)

Required: approved bucket/prefix policy, encryption/retention, result object naming, read/write role split.

- Recommendation: one dedicated bucket `pea-m7-canary-<account-suffix>` in `cn-shanghai`; prefixes `input/` (runtime read-only) and `output/<run_id>/<cell_key>/result.json` (runtime write-once, controller read-only); SSE-OSS default encryption; lifecycle rule deleting `output/` after 30 days; no public access.
- DECISION (owner, 2026-07-25): **approved per recommendation** — bucket pattern `pea-m7-canary-<account-suffix>` in cn-shanghai with the full recommended policy set; exact suffix fixed at console creation and recorded back here.
  - `DECISION (completed 2026-07-26): pea-m7-canary-6194-202607`
- Verified console state: 华东2（上海）/`cn-shanghai`, created `2026-07-26 17:03`, Standard + local redundancy, private ACL + Block Public Access, SSE-OSS/AES256. Lifecycle rule `pea-output-delete-30d` is enabled for prefix `output/`, deleting complete objects and fragments after 30 days; `input/` has no lifecycle rule.

## 4. Cost ceiling

Required: exact resource profile, maximum two jobs, per-job runtime cap, explicit monetary limit.

- Recommendation: public-resource CPU profile `ecs.g6.large`-class (from the 108 preflight-visible specs), `JobMaxRunningTimeMinutes=30` per job, exactly 2 jobs (one per cell), hard monetary ceiling **¥50** for the whole window; exceeding triggers cancel-on-timeout/StopJob and window abort.
- DECISION (owner, 2026-07-25): **confirmed** — `ecs.g6.large`-class public-resource CPU profile, `JobMaxRunningTimeMinutes=30`, exactly 2 jobs, hard ceiling **¥50**.
  - `DECISION: ¥50 / 2 jobs / 30 min / g6.large-class`

## 5. Controller / runtime identities

Required: short-lived least-privilege controller policy (exact allowlist `paidlc:CreateJob/GetJob/ListJobs/StopJob` + OSS read on `output/`) with reviewed policy evidence/digest; separate DLC runtime role (OSS read `input/`, write `output/` only); no controller credential injection into the job.

- [Codex prepares] the two exact RAM policy JSON documents for you to paste into the Aliyun console, plus the SHA-256 you record back here as the reviewed-policy digest (the EF-P16 pattern).
- At window time you supply a fresh short-lived STS triplet for the controller role **only via process env to the runner invocation** (never a file in the repo, never chat if avoidable — a terminal env var export in your own shell is the cleanest channel).
- Created and console-verified with the exact bucket already materialized: `workloads/ragperf-canary/ram/controller-policy.json` is current custom-policy v1 (sha256 `ddde63f223f8d1982da124414ff8224aa7a431f56b51af834030b4fb681f4d8c`); `runtime-policy.json` is current custom-policy v2 (sha256 `1eb7de00aceacc14817b058291eb4f2e85cdbb4c10ea467c91084a75094b1a4b`). Runtime v2 separates Bucket listing from object IO and limits `oss:ListObjects` to `input` / `input/*`; both policies retain the explicit Deny boundaries.
- Controller role: ID `300042892692129613`, ARN `acs:ram::1183869713036194:role/pea-m7-canary-controller`, exact owner-user trust `acs:ram::1183869713036194:user/user_0002`, attached policy `pea-m7-canary-controller` only.
- Runtime role: ID `300525928077898732`, ARN `acs:ram::1183869713036194:role/pea-m7-canary-runtime`, PAI service trust `pai.aliyuncs.com`, attached policy `pea-m7-canary-runtime` only.
- DECISION (owner): confirm the role-split design; record final policy digests after console review.
  - `DECISION (completed 2026-07-26): controller v1 sha256 ddde63f223f8d1982da124414ff8224aa7a431f56b51af834030b4fb681f4d8c; runtime v2 sha256 1eb7de00aceacc14817b058291eb4f2e85cdbb4c10ea467c91084a75094b1a4b; separate roles and one-to-one attachments verified`

## Final authorization line

M7-L1 execution additionally requires, immediately before the first `CreateJob`, one explicit statement from the owner in-session: "M7-L1 authorized: <date>, ceiling <amount>, 2 jobs". Without it, all real-provider capabilities stay `false`.
