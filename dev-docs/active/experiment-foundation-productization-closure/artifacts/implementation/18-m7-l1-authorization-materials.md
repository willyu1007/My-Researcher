# T-132 M7-L1 live-canary authorization materials (fill-in)

Status: **materials in preparation** — items 2/3/4 decided 2026-07-25; item 1 workload draft prepared and locally verified; item 5 policy documents prepared for console review. This document collects the five blocking inputs from `11-m7-real-provider-readiness-review.md` § "Blocking inputs before any live call". Non-secret decisions and digests are committed here; credentials are NEVER committed — they are supplied process-scoped at window time only (the M6-R4 pattern).

Submission protocol per item: edit the `DECISION:` lines in this file (or state the choice in chat and Claude records it here), then the final line of this document gets your explicit "M7-L1 authorized" statement. Claude prepares every artifact marked `[Claude prepares]` for your review before the window.

## 1. Exact workload (ExecutionBundle)

Required: reviewed ExecutionBundle revision — immutable code artifact ref + content digest + byte size; container image ref + digest; provider-neutral entrypoint/args; dependency-lock digest; typed output contract + parser profile version/hash.

- [Claude prepares] a runnable RAGPerf adapter-tier workload draft (code archive + Dockerfile → image digest + entrypoint emitting the exact `ExperimentFoundationProviderResultEnvelope@v1` JSON for the two cells `retriever-top-k-5/10`), staged for your review.
- Prepared: `workloads/ragperf-canary/` — stdlib-only deterministic CPU retrieval pipeline (canary profile `ragperf_canary_stats@v1`, honesty boundary documented), Dockerfile pinned to the verified upstream digest `python:3.11-slim@sha256:00af38ae…db045`, two cell configs, fixture. Verified: local + `--network none` container selftests pass; emitted `result.json` is schema-valid and byte-identical under the repository canonicalizer.
- DECISION (owner): review/approve the prepared bundle, then run the README build/push steps against your ACR (new owner-side resource: one ACR repo in cn-shanghai) and record the image RepoDigest + entrypoint sha256 here.
  - `DECISION: pending bundle review + ACR digests`

## 2. Dataset mirrors

Required: two immutable source-backed mirror manifests — exact Dataset revisions, object refs, content digests, byte sizes, access policy, cleanup/retention.

- [Claude prepares] the mirror manifests once the bucket (item 3) and the dataset source are fixed; upload commands are run by you or in an approved window.
- DECISION (owner, 2026-07-25): **approved per recommendation** — BEIR SciFact slice (`corpus.jsonl` + `queries.jsonl`) mirrored once to `oss://<bucket>/input/scifact/`, retained until M7-L2 closes then deleted.
  - `DECISION: scifact-slice, single mirror, delete-after-L2`

## 3. Output channel (OSS)

Required: approved bucket/prefix policy, encryption/retention, result object naming, read/write role split.

- Recommendation: one dedicated bucket `pea-m7-canary-<account-suffix>` in `cn-shanghai`; prefixes `input/` (runtime read-only) and `output/<run_id>/<cell_key>/result.json` (runtime write-once, controller read-only); SSE-OSS default encryption; lifecycle rule deleting `output/` after 30 days; no public access.
- DECISION (owner, 2026-07-25): **approved per recommendation** — bucket pattern `pea-m7-canary-<account-suffix>` in cn-shanghai with the full recommended policy set; exact suffix fixed at console creation and recorded back here.
  - `DECISION: recommended policy approved; suffix at creation`

## 4. Cost ceiling

Required: exact resource profile, maximum two jobs, per-job runtime cap, explicit monetary limit.

- Recommendation: public-resource CPU profile `ecs.g6.large`-class (from the 108 preflight-visible specs), `JobMaxRunningTimeMinutes=30` per job, exactly 2 jobs (one per cell), hard monetary ceiling **¥50** for the whole window; exceeding triggers cancel-on-timeout/StopJob and window abort.
- DECISION (owner, 2026-07-25): **confirmed** — `ecs.g6.large`-class public-resource CPU profile, `JobMaxRunningTimeMinutes=30`, exactly 2 jobs, hard ceiling **¥50**.
  - `DECISION: ¥50 / 2 jobs / 30 min / g6.large-class`

## 5. Controller / runtime identities

Required: short-lived least-privilege controller policy (exact allowlist `paidlc:CreateJob/GetJob/ListJobs/StopJob` + OSS read on `output/`) with reviewed policy evidence/digest; separate DLC runtime role (OSS read `input/`, write `output/` only); no controller credential injection into the job.

- [Claude prepares] the two exact RAM policy JSON documents for you to paste into the Aliyun console, plus the SHA-256 you record back here as the reviewed-policy digest (the EF-P16 pattern).
- At window time you supply a fresh short-lived STS triplet for the controller role **only via process env to the runner invocation** (never a file in the repo, never chat if avoidable — a terminal env var export in your own shell is the cleanest channel).
- Prepared: `workloads/ragperf-canary/ram/controller-policy.json` (sha256 `2f7ce3cfe9b3448b…`) and `runtime-policy.json` (sha256 `ced35204b7713672…`) — exact allowlists with explicit Deny statements for DeleteJob/DeleteObject and cross-role actions; replace `BUCKET_NAME` with the created bucket before pasting into the console, then record the final policy sha256 values here.
- DECISION (owner): confirm the role-split design; record final policy digests after console review.
  - `DECISION: pending console creation + digest record`

## Final authorization line

M7-L1 execution additionally requires, immediately before the first `CreateJob`, one explicit statement from the owner in-session: "M7-L1 authorized: <date>, ceiling <amount>, 2 jobs". Without it, all real-provider capabilities stay `false`.
