# T-132 M7 real-provider execution readiness review

Date: 2026-07-23

Owner: `T-132 experiment-foundation-productization-closure`

Consuming acceptance: `T-106 experiment-foundation-real-interaction-hardening`
Review verdict: `default_off_implementation_passed`; `blocked_for_live_create_job`

## Goal and non-goals

M7 will add one typed, crash-recoverable Aliyun PAI-DLC real-provider path that can eventually execute a new exact PI WorkOrder revision and feed trusted results into the existing Pack C validation boundary. The implementation must preserve the single PI→EF authority chain and reuse the existing six provider-control families; it must not create a second external-canary authority.

This readiness review does not authorize:

- calling `CreateJob`, `StopJob`, `DeleteJob` or any OSS write API;
- applying a future migration to named-local or any non-local database;
- enabling real-provider, scientific-validation or Cycle-closure capability;
- treating the r6 read-only preflight or the existing simulation Run as scientific execution;
- uploading datasets/code, retaining billable resources or minting evidence.

## Ownership handoff

T-106 historically owned the provider-specific true external canary acceptance. T-132 now owns implementation and execution under M7 because only T-132 owns the typed PI/EF v2 lineage, Pack B provider-control state, Pack C scientific validation and product cutover boundaries. T-106 will consume the final redacted M7 gate evidence and must not implement another provider transport, schema or runner.

The handoff is complete only when both task packages carry this statement. Until M7 reaches a real terminal canary and the required result/evidence boundary, T-106 remains `in-progress`.

## Current implementation census

| Area | Current state | M7 consequence |
|---|---|---|
| PI/EF source Run | existing revision has one immutable Run and two cells | preserve as simulation history; never trust-upgrade or mutate it |
| RunRecipe | `experiment-foundation-v2://d19/materialize-only` | not executable; a new PI revision must produce a new RunRecipe |
| TrainingTaskSpec | command `experiment-foundation-v2:materialize-cell`; output keys are `simulation_*` only | cannot drive real execution or scientific collection |
| Shared execution contracts | only `execution_mode=simulation`, `provenance=non_production_fake_provider`, fake external-job ref | add exact discriminated real-provider contracts without weakening fake checks |
| Prisma constraints | provider payload and Attempt CHECKs accept simulation/fake tuples only | a reviewed additive migration must widen to two exact tuple variants |
| Payload materializer | code-owned fake simulation profile | add an independent real Aliyun payload materializer bound to an immutable execution bundle |
| Provider worker | transport interface is generic but response validation is hard-bound to deterministic fake response schema | extract typed adapter result normalization; fake and Aliyun paths remain separate implementations |
| App composition | scheduler always constructs `DeterministicFakeAliyunPaiDlcTransport` | add a separate default-off real-provider composition; never mode-switch from caller payload |
| Pack C validation | already rejects anything except succeeded `real_provider` Attempt/result provenance | retain unchanged trust rule; production writer does not yet exist |
| Cloud preflight | read-only r6 passed; product code contains no `CreateJob` call | reuse endpoint/profile validation logic, not the preflight capability or restricted credential |
| T-106 runner | prerequisite-presence gate only; no real cloud calls | convert to a consumer of T-132 M7 evidence instead of embedding provider logic |

## D-23 — immutable real-execution lineage

The unique implementation direction is frozen as follows:

1. The existing acknowledged Pack A/Pack B Run remains immutable simulation-only history.
2. Real execution starts from a new PI branch-local WorkOrder revision and therefore creates a new EF VersionLock, RunRecipe, TaskSpecs, Run manifest and head acknowledgement through the existing T1-T4 spine.
3. The new revision binds one named typed `ExecutionBundleV2` exact revision/hash. Its server-hashed snapshot contains:
   - immutable code artifact ref, content digest and byte size;
   - immutable container image ref and digest;
   - ordered dataset-mirror entries bound to exact Dataset revisions, object refs, content digests and byte sizes;
   - provider-neutral entrypoint/arguments and dependency-lock digest;
   - exact typed output contract and parser profile version/hash.
4. `ExecutionBundleV2` is an EF-owned typed family, not generic `kind/payload`, EAV, caller hash or persisted capability. PI may carry its exact external ref/hash as an admitted dependency but cannot write its canonical content.
5. EF materialization uses WorkOrder schema v2 plus the exact bundle to create executable RunRecipe/TaskSpec v2 snapshots. Existing v1 materialization remains valid and simulation-only.
6. The existing six Pack B provider-control families remain the sole durable provider authority. They gain exact discriminated real-provider variants; no parallel real-provider tables, dual reads or legacy external-job upgrade are allowed.
7. A collected provider artifact is diagnostic until the trusted parser verifies its exact bundle/Run/cell/result schema and the existing ScientificValidationService persists an `ExperimentResult` with `real_provider` provenance. No transport response can mint evidence directly.

## Proposed implementation slices

### M7-I0 — contracts and source-population lock

- Add shared v2 schemas for `ExecutionBundleV2`, executable WorkOrder revision v2, RunRecipe/TaskSpec v2, Aliyun real payload/redacted manifest, real external-job ref and normalized provider outcomes.
- Freeze stable error/reason codes, exact allowlists and canonical hash profiles.
- Recompute writer/schema/env/app-composition populations and modification allowlist.
- Add a default-false real-provider intake capability independent from simulation, preflight, scientific validation and Cycle closure.

Exit: caller hashes, unknown provider variants, simulation/real tuple mixing, current-Run reuse and capability-off intake all fail before write/transport.

### M7-I1 — typed bundle and additive migration

- Add named typed ExecutionBundle identity/draft/revision/lifecycle/readiness storage.
- Extend WorkOrder/materialization snapshots so a new admitted revision creates executable v2 recipe/task specs.
- Generalize existing provider-control constraints with exact tuple CHECKs; rename `simulationProfileVersion` to provider-neutral `providerProfileVersion` in a reviewed migration while preserving existing rows and identities.
- Keep all existing simulation rows readable and immutable; no backfill into real provenance.

Exit: disposable PostgreSQL proves old simulation rows unchanged, real fixtures accepted only through the new tuple, and malformed mixed rows rejected by service and DB constraints.

### M7-I2 — Aliyun transport and crash recovery

- `submit`: official SDK `CreateJob` from exact canonical bytes.
- `sync/reconcile`: `GetJob`; bounded recovery discovery may use `ListJobs` with deterministic tag/display name and must exact-compare returned job details.
- `cancel`: `StopJob`; terminal-state replay converges without changing a succeeded result.
- `collect`: read the exact result envelope from the approved output object and optionally collect bounded pod logs for diagnostics; logs are never scientific authority.
- Add deterministic job tags and display names derived from the provider idempotency key. Because the documented `CreateJob` surface exposes no client idempotency token, an accepted-response-loss state must reconcile by tag/detail and must never blind-retry a second job while outcome is ambiguous.
- Enforce provider `JobMaxRunningTimeMinutes`, local watchdog timeout, two-job batch ceiling and cancel-on-timeout.

Exit: injected before-response, accepted-response-loss, eventual-consistency, duplicate discovery, timeout, cancellation, malformed result and cleanup failures converge without duplicate trusted lineage.

### M7-I3 — offline/isolated gate

- Build `experiment-foundation-m7-provider-gate.mjs` with fake official-SDK clients and disposable PostgreSQL.
- Prove one new two-cell WorkOrder revision → one new Run → two real-mode Attempts → exact provider transitions → typed result collection, while every network call is intercepted.
- Keep scientific validation default-off; test-only conformance may call the Pack C service with synthetic exact real-provider rows in disposable PostgreSQL.
- Publish a redacted durable digest, not raw provider payloads or large transcripts.

Exit: all implementation checks pass with zero live provider/OSS calls and zero named-local writes. This is the earliest point at which code implementation can be considered complete.

### M7-L1 — separately authorized diagnostic canary

- Create fresh, short-lived controller credentials with only the exact reviewed PAI-DLC read/write operations required by the canary.
- Run at most the exact approved two jobs, with one CPU profile per cell, a frozen per-job runtime cap and an explicit monetary ceiling.
- Verify terminal status, cancellation path, output retrieval, zero duplicate jobs and cleanup/retention policy.
- Keep output diagnostic and `evidence_eligibility=false` unless the source-backed scientific bundle is independently approved.

Exit: `real_provider_canary_passed`; no scientific evidence claim.

### M7-L2 — separately authorized scientific closure

- Freeze and review the source-backed RAGPerf implementation bundle and exact dataset mirrors.
- Admit another exact WorkOrder revision if any scientific code/data/profile differs from the diagnostic canary.
- Execute, collect and parse complete results for every required cell.
- Enable scientific validation only for the bounded intake, then drain EvidenceCandidate → PI gateway → REU and later Cycle closure through their existing independent gates.

Exit: complete exact batch, validation and evidence chain passes; diagnostic or incomplete output remains ineligible.

## Provider API and permission boundary

Official documentation reviewed on 2026-07-23 establishes:

| Operation | Purpose | RAM action | M7 posture |
|---|---|---|---|
| `CreateJob` | submit billable DLC work | `paidlc:CreateJob` | enabled only during M7-L1/L2; request <= 65,536 bytes |
| `GetJob` | exact lifecycle/status/pod lookup | `paidlc:GetJob` | required for sync/reconcile |
| `ListJobs` | bounded accepted-response-loss recovery | `paidlc:ListJobs` | optional but recommended; exact tag/detail reconciliation only |
| `StopJob` | cancel running/creating work | `paidlc:StopJob` | required cleanup control |
| `GetPodLogs` | bounded diagnostics | provider-specific read action to be confirmed from current RAM docs | optional; redacted and non-authoritative |
| `DeleteJob` | delete terminal/stopped job | `paidlc:DeleteJob` | excluded by default; retention or deletion requires explicit live-run decision |

Primary references:

- [CreateJob](https://help.aliyun.com/en/pai/developer-reference/api-pai-dlc-2020-12-03-createjob)
- [GetJob](https://help.aliyun.com/en/pai/developer-reference/api-pai-dlc-2020-12-03-getjob)
- [ListJobs](https://help.aliyun.com/en/pai/developer-reference/api-pai-dlc-2020-12-03-listjobs)
- [StopJob](https://help.aliyun.com/en/pai/developer-reference/api-pai-dlc-2020-12-03-stopjob)
- [DeleteJob](https://help.aliyun.com/en/pai/developer-reference/api-pai-dlc-2020-12-03-deletejob)
- [JobSettings](https://help.aliyun.com/en/pai/developer-reference/api-pai-dlc-2020-12-03-struct-jobsettings)
- [OSS/DLC storage mounts](https://help.aliyun.com/en/pai/use-cloud-storage-for-a-dlc-job)

## Blocking inputs before any live call

| Blocker | Required closure evidence |
|---|---|
| exact workload absent | reviewed ExecutionBundle revision, code digest, image digest, dependency lock and parser profile |
| exact dataset mirrors absent | two immutable source-backed mirror manifests with content digests, sizes, access policy and cleanup/retention decision |
| output channel absent | approved OSS prefix/bucket policy, encryption/retention rules, result object naming and read/write role split |
| cost ceiling absent | exact resource profile, maximum two jobs, per-job runtime cap and explicit monetary limit |
| write identity absent | short-lived least-privilege controller policy evidence/digest for the exact operation allowlist |
| runtime identity absent | separate DLC runtime role for only the approved input reads/output writes; no controller credential injection |
| accepted-response-loss policy unverified | deterministic tag/display-name recovery tests and ambiguous-state fail-closed gate |
| migration not reviewed/applied | disposable PostgreSQL gate first; named-local apply remains a later `sync-db-schema-from-code` authorization |
| product enable not authorized | all M7/scientific/closure capabilities remain default false until separate live windows |

## Acceptance matrix

| ID | Requirement |
|---|---|
| M7-01 | existing simulation Run and all Pack B rows remain byte/semantic-digest unchanged |
| M7-02 | new PI revision creates exactly one new executable batch Run with two ordered cells |
| M7-03 | real payloads bind exact bundle/revision/Run/cell/TaskSpec hashes and retain no secrets |
| M7-04 | capability-off produces zero provider-control and provider writes |
| M7-05 | fake and real tuple mixing fails in contracts, repositories and PostgreSQL |
| M7-06 | one admitted cell creates at most one live provider job for a provider idempotency key |
| M7-07 | accepted-response loss reconciles or blocks; it never blind-retries `CreateJob` |
| M7-08 | sync maps only the closed Aliyun status vocabulary; unknown states fail closed |
| M7-09 | timeout/cancel reaches a terminal durable Attempt and provider cleanup is verified |
| M7-10 | collection verifies exact output locator/content hash/schema/parser binding |
| M7-11 | diagnostic/incomplete/simulation output creates zero ExperimentResult/EvidenceCandidate/REU |
| M7-12 | complete real-provider output may enter ScientificValidationService only through its typed API |
| M7-13 | live summary records cost/time/resource/write censuses and contains no raw secret/payload/log/object path |
| M7-14 | disabling new intake does not stop committed sync/cancel/collect/cleanup work |
| M7-15 | T-106 consumes the M7 verdict and contains no duplicate provider implementation |

## Rollback

- Before DB apply: remove or revise the unapproved migration and default-off code.
- After DB apply but before live enable: leave additive/generalized schema in place; keep real-provider capability false.
- After a committed submit: stop new intake, continue only sync/cancel/collect/cleanup until every provider job is terminal; do not delete durable Attempt/event/command lineage.
- Never restore legacy external-job writers, reinterpret simulation rows as real, mutate the existing Run or mint evidence from diagnostic output.

## Independent review (2026-07-24)

Reviewers: Codex `gpt-5.6-sol` full working-tree review plus an independent Claude seam verification; every claim was source-verified before disposition. Host reruns after the fix: shared 390/390, backend full 2,387/2,327 pass/0 fail/60 conditional-skip, gate scripts 18/18.

Fixed before commit:

- **Local watchdog was poll-count, not wall-clock** (confirmed): reconcile previously cancelled a healthy nonterminal job after `maximumCommandAttempts` polls and let one late transient transport error terminalize a long job. The worker now derives a deadline from `attempt.created_at + task_spec.retry_snapshot.timeout_seconds + watchdogGraceMs` (default 15 min queue grace); healthy polling and retryable sync/reconcile transport errors release until the deadline, then cancel-on-timeout runs. `maximumCommandAttempts` remains the transport-retry bound for submit/cancel/collect. Regression test added (M7-09 rewritten wall-clock).

Refuted after verification:

- *Cancel racing provider success strands the Attempt*: the reconcile command created at submit commit stays pending after the cancel command terminalizes with `EXECUTION_ATTEMPT_STATE_CONFLICT`, so success converges through the normal reconcile→collection path. A dedicated race regression test remains a QR candidate.
- *Repository/PG fake-real ref mixing* (as stated): a real external ref serialized without its discriminator throws at write time (`Fake external job ref cannot bind a region hash`), and read integrity re-verifies the ref hash against the stored wire shape, so the claimed silent mix fails closed. Residual hardening (explicit required discriminator end-to-end, PG JSON discriminator CHECKs, payload↔attempt mode coupling) is queued below.

Binding dispositions (must close before the named live window):

| Finding | Disposition |
|---|---|
| `recordExperimentResult` accepts a succeeded Attempt without a verified collection receipt | **M7-L2 entry condition** (extends the Pack C R2 record): before any scientific-validation intake is enabled for real-provider rows, the service must require an exact collected CollectionAttempt receipt (locator/content/parser bindings) built only by the trusted parser bridge |
| Exact output-channel locator + executed trusted parser | already frozen **M7-L1/L2 blockers** (output channel and parser-profile decisions); `locatorHasExactObjectName` and the envelope `outputs` field harden then |
| ExecutionBundle active/readiness revalidation inside T2/E1 transactions; projection sequence/hash recheck in `readFrozen` | **M7-L1 precondition** (no revoke writer exists yet; default-off means no production writes today) |
| Recovery `jobDetailMatches` must compare resource/timeout fields and paginate to exhaustion | **M7-L1 precondition** |
| Production bootstrap composition for profile resolver/transport/result reader (today `server.ts` fail-fasts when the flags are enabled, by design for I0..I3) | **M7-L1 precondition** |
| Deterministic authority ids (bundle/payload/attempt/event/command/collection currently default to `randomUUID`; convergence holds via replay but first-pass determinism is preferred) | **CLOSED 2026-07-24** — M7-QR-2 (see `12-m7-qr-hardening-plan.md`) |
| Gate hardening: measured (not declared) provider/write/redaction censuses, per-check predicates, pre-M7 seeded-row migration comparison, source-population digest comparison, transcript redaction in durable evidence | **CLOSED 2026-07-24** — M7-QR-1; hardened convergence `t132-m7-offline-20260724-v3` passed |

## Readiness verdict

The default-off M7 implementation is complete. The original isolated run `t132-m7-offline-20260723-v1` (summary SHA-256 `7bccf0b8bedd041f65374ce0e6ccff3cc26be662a008c1ff6951a57f71743679`) passed M7-01..M7-15; after the review fix above, the gate was rerun as `t132-m7-offline-20260724-v2` with shared 10/10, backend 88/88 and forced disposable PostgreSQL 9/9, all without live provider/OSS requests, named-database apply or scientific/evidence/legacy writes. A byte-identical durable copy of the v2 summary is committed as `11-m7-offline-gate-summary-v2.json`.

Live execution remains blocked by the exact workload/bundle, dataset mirror, output channel, cost ceiling, controller/runtime identity and accepted-response-loss decisions above. It requires a new explicit M7-L1 authorization immediately before the first `CreateJob`; the two real-provider capabilities remain default false.
