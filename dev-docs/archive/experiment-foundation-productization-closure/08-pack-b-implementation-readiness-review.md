# Implementation Pack B — implementation readiness review

## Status

- Task: `T-132 experiment-foundation-productization-closure`
- Pack: `Implementation Pack B — Phase 3 durable provider control and same-payload simulation`
- State: `implemented_quality_remediated_and_named_local_product_e1_e5_verified`
- Authorization date: `2026-07-13`
- Authorization: user requested Pack B implementation; code, default-off configuration, additive Prisma schema/migration artifacts, isolated disposable-PostgreSQL tests and canonical documentation are in scope.
- Existing-environment migration apply/enable: not part of the initial authorization. Pack B must stop after reviewable artifacts and disposable-target evidence unless a named target is separately authorized.
- Later authorization: on 2026-07-14 the user separately authorized the reviewed named local-development target. No non-local target, real provider, scientific execution or product traffic switch was authorized or performed.
- Product authorization: on 2026-07-15 the user authorized formal PI scope → Pack A and subsequent Pack B product execution on the reviewed named-local target. No non-local target, real provider, cloud write, scientific execution or product traffic switch was authorized or performed.
- Local E1-E5: completed against the exact formal Pack A Run/head acknowledgement. Final state is 2 payloads, 2 Attempts, 12 events, 8 commands, 2 Collections and 2 diagnostic-only outputs; simulation is disabled again.

## Named-local product execution closure — 2026-07-15

- Apply run `formal-pi-scope-packb-product-20260715-apply-r1` used the normal HTTP entrance and production Prisma worker under the deterministic fake adapter; final read-only run `formal-pi-scope-packb-product-20260715-verify-r2` ran after capability disable.
- Both exact RunCells are `succeeded` and `collected`; workflow projection passed while Run/RunCell scientific state remained `not_started` and evidence eligibility remained false.
- Final r2 broadened the zero-side-effect fence to 88 protected tables and reported `changed_tables=[]`, zero fetch/provider/`CreateJob`, zero PI/Pack A/legacy/scientific write and zero foreign lineage.
- Durable evidence: `artifacts/product-pack-b-local-20260715/05-product-execution-closure.md`. This closes product E1-E5 only; all exclusions in the scope restatement remain unchanged.

## Quality-remediation closure — 2026-07-14

- The post-implementation architecture/code review found no remaining P0/P1/P2 Pack B action after remediation and no safely deletable production file. Four shared raw persistence DTO/schema contracts remain intentionally retained as the frozen logical boundary for the six typed families.
- Final disposable run `packb-quality-remediation-final-20260714-r7` passed PB01-PB16 with targeted shared/backend 6/6 + 63/63 and relational 5/5, 0 skipped. Its summary SHA-256 is `35dbc7f2f6b623a32cda193ef7a0efe91bb6b8efc48d1568e16b1c4980287af0`.
- The original Pack B migration remains immutable. Cleanup migration `20260714160000_harden_experiment_foundation_pack_b_v2` has SHA-256 `05ddb7fa653e76b66fc6c0c4747b3680e3815a44dc672b8a61042310911dd5b8` and closes immutable-FK, unreachable-column and redundant-index debt without legacy/cross-domain changes.
- After a fresh verified recovery point, only the cleanup migration was applied to the named local-development target. Final run `packb-quality-remediation-local-20260714-r5` passed at 60/60 migrations with exact 15 FK/35 CHECK/38 index census, unchanged Pack A/legacy authority and zero rows in every Pack B table.
- The app-smoke v5 proof covered all 238 application tables with background work disabled and fetch hard-denied; changed-table, external-fetch and provider-command deltas were all zero.
- Durable evidence: `artifacts/implementation/05-pack-b-quality-remediation-closure.md` and `artifacts/db/pack-b-local-development-20260714/07-quality-remediation-addendum.md`.
- This closure does not authorize product E1-E5, real provider/read-only cloud preflight, scientific result/validation/evidence, D-18 Cycle closure, non-local apply, UI/search or traffic cutover.

## Named local-development landing — 2026-07-14

- Applied only the reviewed Pack B additive migration to `127.0.0.1:5432/postgres?schema=my_researcher_dev`; 59/59 migrations are up to date and the source/database checksum matches.
- Enabled only the gitignored local simulation override through `env-localctl`; source default remains false.
- Final read-only run `packb-local-closure-20260714-r1` passed with 40/40 approved v2 tables, unchanged Pack A/legacy digests and all six Pack B tables empty.
- Enabled app composition reached the exact prerequisite guard and returned `EXECUTION_HEAD_ACK_REQUIRED`; no product E1-E5 lifecycle was created because no formal Pack A Run/head acknowledgement exists in the target.
- The implementation/disposable acceptance below remains the proof of E1-E5 semantics. The named-local result proves deployment, configuration and fail-closed routing only.
- Durable evidence: `artifacts/implementation/03-pack-b-local-landing-closure.md`.

## Implementation closure — 2026-07-13

- Final gate `packb-20260713-final4` passed PB01-PB16 with `blockers=[]`.
- Shared targeted tests: 5/5; backend targeted tests: 43/43; forced Prisma relational tests: 4/4 with 0 skipped.
- Final Pack B rows: 2 payloads, 2 Attempts, 12 events, 8 commands, 2 Collections and 2 diagnostic-only outputs.
- All 231 measured non-Pack-B application tables were unchanged. Real provider/`CreateJob`/fetch/legacy/scientific write counts were zero.
- The disposable container was cleaned. At the technical-closure checkpoint no existing-environment migration apply, simulation enable or product cutover occurred; the preceding named-local section records the later apply/enable separately.
- Durable evidence: `artifacts/implementation/02-pack-b-technical-closure.md`.

## Scope restatement

Pack B starts only from the exact Pack A authority spine:

1. one immutable EF Run and ordered RunCells;
2. exact TrainingTaskSpec refs/hashes for every required cell;
3. the processed EF `BranchHeadAdvanced@v1` inbox receipt for that exact Run/manifest;
4. exact readiness that still revalidates at simulation-attempt creation.

Pack B ends after a crash-recoverable, no-network simulation lifecycle has produced terminal cell-scoped ExecutionAttempts, replayable CollectionAttempts, diagnostic-only provisional outputs and an event-derived workflow simulation status. Run and RunCell remain mode-neutral and scientifically `not_started`.

Pack B does not include real Aliyun `CreateJob`, List/Get cloud preflight, local/cloud training, ExperimentResult, scientific validation, EvidenceCandidate, RunEvidenceUnit, D-18 Cycle closure, PI lifecycle projection, UI/search, bootstrap or any legacy writer.

## Frozen implementation decisions

These are technical placements of already-confirmed D-13/D-14/I-06 semantics; they do not introduce D-23.

### Domain and repository boundary

- Pack B is EF-owned and uses a new `ExperimentFoundationExecutionV2Repository`.
- The Pack B repository may read Pack A EF Run/RunCell/TaskSpec/readiness/inbox rows and write only Pack B EF tables in EF-local transactions.
- The Pack B repository must not add methods to the legacy execution repository or use `ExperimentFoundationExternalTrainingJob`, `ExperimentFoundationRecord`, generic readiness or legacy result/evidence writers.
- The Pack B lane must not add PI database FKs, PI writes or a fourth Pack A integration event.
- `workflow_simulation_status` is computed from immutable Attempt events and collection facts at read time. The derived status is not persisted as a second status authority.

### Exact non-production payload

- Payload schema: `FakeAliyunPaiDlcSubmitPayload@v1`.
- Adapter identity: `deterministic_fake_aliyun_pai_dlc@v1`.
- Execution mode/provenance: `simulation` / `non_production_fake_provider` only.
- The server deterministically materializes canonical payload bytes from the exact RunCell, TrainingTaskSpec and a code-owned simulation profile.
- The database persists only a named redacted manifest, payload hash, byte size and exact source bindings. Full canonical bytes are re-materialized and hash-checked before every transport operation.
- Caller-authored payload, hash, adapter, provider ref, provenance or scientific status is rejected.
- The fake transport receives the same canonical bytes/hash for submit, sync, reconcile, cancel and collect. The transport has no network implementation or credential surface.
- The payload proves Pack B same-payload simulation only. The payload does not satisfy the later Phase 6 exact real `CreateJob` payload or real read-only cloud-preflight gate.

### Additive logical schema

Exactly six new EF-owned families are allowed:

| Family | Authority and minimum constraints |
|---|---|
| `ExperimentFoundationProviderPayloadV2` | immutable exact RunCell/TaskSpec/profile binding; materialization key unique; server payload hash/byte size; named redacted manifest only |
| `ExperimentFoundationExecutionAttemptV2` | exact Run/RunCell/TaskSpec/payload/head-ack binding; cell-local attempt sequence; workflow business key/request hash; simulation provenance; provider idempotency key; CAS lifecycle state |
| `ExperimentFoundationExecutionAttemptEventV2` | append-only event sequence; prior/next state; exact command/payload/external ref; server event hash; unique Attempt ordinal |
| `ExperimentFoundationProviderCommandV2` | durable `submit | sync | reconcile | cancel | collect` intent; command sequence/hash/idempotency; pending/lease/retry/terminal bookkeeping; fenced lease owner/expiry |
| `ExperimentFoundationCollectionAttemptV2` | one stable replayable collection identity per Attempt; CAS state; exact payload/external ref; no scientific publication state |
| `ExperimentFoundationProvisionalOutputV2` | immutable diagnostic-only output identity/ordinal; redacted typed manifest/hash; cannot be upgraded into ExperimentResult |

Same-domain FKs use `Restrict`. No cascade may delete immutable execution lineage. No `SimulationRun`, provider job authority, Run status, scientific status, `dispatch_eligible`, acknowledgement mirror, generic `kind/payload`, EAV or mutable full-payload blob is allowed.

### State machines

ExecutionAttempt states:

```text
prepared -> submitted -> running -> succeeded
    |           |           |
    +-----------+-----------+-> failed
    +-----------+-----------+-> cancelled
```

- `prepared` is committed before fake transport invocation.
- State transitions are monotonic and CAS-fenced.
- Same transition/command replay is a no-op only when its exact hashes match.
- A new technical Attempt is allowed only after the previous Attempt is `failed | cancelled` and the TaskSpec retry ceiling is not exhausted.
- A succeeded Attempt cannot be retried to seek a different outcome.

CollectionAttempt states:

```text
prepared -> collected
    |
    +-> failed
```

- Collection is created with stable output identities before collect transport invocation.
- Pack B outputs remain `diagnostic_only`; there is no publish/trust transition.

ProviderCommand states:

```text
pending -> claimed -> succeeded
              |
              +-> pending (retryable release)
              +-> terminal
```

- Workers claim commands with a lease and compare lease owner on heartbeat/outcome.
- Expired leases are reclaimable; a stale owner cannot commit.
- Disabling new simulation intake does not stop committed command drain/reconcile/cancel/collect.

### Unit-of-Work and crash boundaries

1. **E1 start simulation:** validate capability, exact current head acknowledgement, scope, readiness and retry ceiling; atomically create-or-exact-reuse payloads, one Attempt per required cell, `created` events and pending `submit` commands.
2. **E2 command claim:** lease pending/expired commands without changing domain lifecycle authority.
3. **E3 command outcome:** after transport returns, atomically CAS the command/Attempt, append the event and enqueue the deterministic next command. A response-loss replay reuses the same provider idempotency key and payload hash.
4. **E4 collection preparation:** when provider simulation succeeds, atomically create-or-reuse CollectionAttempt, stable provisional output identities, collection event and pending `collect` command.
5. **E5 collection completion:** atomically commit collected/failed collection state, immutable diagnostic output manifests and Attempt events.

Transport calls never occur inside a Prisma transaction. Database rollback cannot be treated as side-effect rollback.

Cancellation recovery is part of these boundaries:

- pending submit: one zero-transport control transaction terminalizes submit and Attempt;
- leased submit: persist an unresolved cancel intent with null external ref, no invented event/state transition and no claim eligibility while Attempt remains `prepared`; dispatch later resolves the external ref from E3-updated Attempt authority;
- cancel/E3 enqueue race: E3-first returns stable 409 with zero cancel partial write, and same-key retry re-resolves current authority;
- sync/cancel or reconcile/cancel race: cancel precedence prevents E4; a stale progression loser is immediately terminalized, while a cancel loser caused by newer progression is immediately requeued under the same provider key rather than waiting for lease expiry.

### API and capability

Default-off key:

```text
EXPERIMENT_FOUNDATION_V2_WORKFLOW_SIMULATION_ENABLED=false
```

Only normalized `true | false` is valid; unset/blank means false and any other configured value aborts app composition.

Primary routes:

```text
POST /experiment-foundation/v2/runs/:run_id/workflow-simulations
POST /experiment-foundation/v2/execution-attempts/:attempt_id/cancel
POST /experiment-foundation/v2/execution-attempts/:attempt_id/reconcile
GET  /experiment-foundation/v2/execution-attempts/:attempt_id
GET  /experiment-foundation/v2/runs/:run_id/workflow-simulation-status
```

The run-level start command creates all required cell Attempts as one automatic action. Submit/sync/collect are worker plumbing, not per-cell human commands. Cancel/reconcile remain explicit recovery commands and do not enable real provider dispatch.

### Derived status

For each Run, select the latest Attempt per required cell and fold immutable events plus collection facts:

- no Attempts: `not_started`;
- any required cell missing an Attempt, or any latest Attempt/collection non-terminal: `in_progress`;
- every required cell latest Attempt is succeeded and collected: `workflow_simulation_passed`;
- any latest Attempt/collection failed: `workflow_simulation_failed`;
- otherwise a latest cancelled Attempt or exhausted non-complete cell: `workflow_simulation_blocked`.

Every response also reports `scientific_execution_status=not_started` and `evidence_eligibility=false`; those values are contract expressions of Pack B's categorical exclusion, not mutable Run fields.

### Stable reason codes

Pack B adds only the following reason codes to the existing v2 error envelope:

- `EF_V2_WORKFLOW_SIMULATION_DISABLED`
- `EXECUTION_HEAD_ACK_REQUIRED`
- `EXECUTION_RUN_NOT_CURRENT_HEAD`
- `EXECUTION_SCOPE_DRIFT`
- `EXECUTION_READINESS_DRIFT`
- `PROVIDER_PAYLOAD_INVALID`
- `PROVIDER_PAYLOAD_CONFLICT`
- `EXECUTION_ATTEMPT_IDEMPOTENCY_CONFLICT`
- `EXECUTION_ATTEMPT_LIMIT_EXHAUSTED`
- `EXECUTION_ATTEMPT_STATE_CONFLICT`
- `PROVIDER_COMMAND_LEASE_CONFLICT`
- `PROVIDER_RESPONSE_INVALID`
- `COLLECTION_ATTEMPT_CONFLICT`

## Acceptance matrix

| ID | Required proof |
|---|---|
| PB01 | typed canonical payload/hash/tamper/size/redaction tests; zero transport on invalid input |
| PB02 | additive six-family migration; zero legacy ALTER, PI FK, generic EAV, duplicate status/ack/scientific family |
| PB03 | default-off zero-write/zero-transport and strict malformed-boolean startup failure |
| PB04 | exact processed head acknowledgement/current-sequence/readiness prerequisite; every drift/pre-ack case fails with zero writes |
| PB05 | E1 all-or-nothing; same-input exact replay; changed business-key payload conflict; retry ceiling enforced |
| PB06 | concurrent command claim, expiry reclaim, heartbeat/outcome fencing and stale-owner rejection |
| PB07 | crash before transport, accepted-response-lost and outcome-commit-failed converge to one Attempt and one fake job identity |
| PB08 | submit/sync/reconcile/cancel/collect receive identical canonical payload bytes/hash and provider idempotency identity |
| PB09 | monotonic sync/reconcile; malformed/unknown/stale responses are retryable or terminal without partial state |
| PB10 | cancel intent/replay/restart convergence; pre-submit cancel produces zero transport |
| PB11 | stable CollectionAttempt/provisional identities; collect crash/replay creates no duplicate or scientific output |
| PB12 | event-only projection rebuild; exact multi-cell aggregation; Run/RunCell/TaskSpec digests unchanged |
| PB13 | result/validation/EvidenceCandidate/REU/closure/legacy writes and real network/provider calls all equal zero |
| PB14 | repository can enumerate Cycle-wide active real Attempts, including non-head lineage; Pack B exposes no real-dispatch writer |
| PB15 | capability disable blocks new E1 but committed commands still drain/reconcile/cancel/collect |
| PB16 | disposable real PostgreSQL golden run: D-19 prerequisite plus two cells, two payloads, two Attempts, two collections, terminal passed projection and exact excluded-write census |

Pack A A01-A04/B01-B10 retain their frozen meaning. The D-19 gate census must include Pack B table names and prove all six remain zero in a Pack A-only run. Pack B uses a separate gate and PB01-PB16 summary.

## Source population and modification boundary

- Start Git HEAD: `f6680225d5134d4f67bd59f4c5dbecb4eb0c476d`
- Reviewed Pack B source-population digest: `sha256:d89e4afcc39bb2734ebe82432d5a49c1af978c8c06ac9d051c8caeaafebc62b1`
- Digest population: Prisma schema, env contract, app composition, backend test environment scrubber, Pack A shared v2 contracts/event contracts/canonical-hash profile registry, Pack A spine repository/Prisma repository/materialization service and D-19 runner.

Allowed existing-file edits:

- `prisma/schema.prisma`
- `env/contract.yaml`
- `apps/backend/src/app.ts`
- `apps/backend/scripts/run-node-tests.mjs` to scrub the default-off Pack B capability from the test process only
- `packages/shared/src/research-lifecycle/index.ts`
- `packages/shared/src/research-lifecycle/experiment-v2-canonical-hash.ts` for additive closed Pack B hash profiles only
- `packages/shared/src/research-lifecycle/paper-implementation-experiment-v2-contracts.ts` for reason-code extension only
- `apps/backend/scripts/run-experiment-foundation-d19-spine.ts` for additive Pack B zero-census only
- generated API/DB/env context artifacts through their owning workflows
- T-132/T-124 canonical docs and project-governance generated views

New files may land only under independent v2 provider-control contracts, routes/controllers/services/repositories/Prisma adapters, one additive migration, Pack B gate/runner and corresponding tests.

Forbidden edits:

- legacy `experiment-foundation-execution-*` contracts/services/repositories/adapters and `ExperimentFoundationExternalTrainingJob`
- T-124 runtime/result-claim/dossier/REU writer/reader surfaces
- Pack A Run/manifest/head/ack semantics or its three integration event envelopes
- real provider credentials, SDK/network transport or cloud-state mutation
- scientific result/validation/evidence/Cycle closure/UI/search code

If implementation requires a forbidden edit or a seventh Pack B table family, stop and repeat readiness review.

## Verification artifacts

- Gate runner: `.ai/scripts/experiment-foundation-packb-simulation-gate.mjs`
- Summary: `.ai/.tmp/experiment-foundation-productization/<run-id>/summary.json`
- Missing disposable PostgreSQL returns `blocked`, never passed.
- Summary must include PB01-PB16, Pack A prerequisite status, exact Run/cell/TaskSpec/ack refs, payload hashes/redacted manifests, Attempt/event/command/collection refs, lease/crash outcomes, migration digest, unchanged Pack A/legacy/scientific digests and `real_provider_requests=0` / `create_job_calls=0`.
- Final summary: `.ai/.tmp/experiment-foundation-productization/packb-20260713-final4/summary.json`.
- Relational evidence: `.ai/.tmp/experiment-foundation-productization/packb-20260713-final4/relational-tests.json`; 4 passed, 0 failed, 0 skipped.
