# Implementation Pack B technical closure evidence

## Outcome

- Implementation slice: `Phase 3 durable provider control and same-payload simulation`
- Technical implementation state: complete
- Final gate run id: `packb-20260713-final4`
- Acceptance: PB01-PB16 all `passed`
- Disposable Prisma relational suite: 4/4 passed, 0 failed, 0 skipped
- Product simulation capability default: `false`
- Existing-environment Pack B migration apply: not performed
- Product enable/cutover: not performed
- Real provider/cloud/scientific execution: not performed

Pack B starts from the exact Pack A Run/RunCell/TrainingTaskSpec plus the processed final EF `BranchHeadAdvanced@v1` receipt. Pack B ends at durable simulation Attempts, command/event history, CollectionAttempts, immutable diagnostic-only provisional outputs and an event-derived workflow status. Pack B does not change the mode-neutral Run or create scientific state.

## Delivered boundary

- Added one independent shared v2 execution contract and closed canonical hash profiles.
- Added one optional strict boolean, `EXPERIMENT_FOUNDATION_V2_WORKFLOW_SIMULATION_ENABLED`, defaulting to `false` and requiring the Pack A cutover precondition when enabled.
- Added exactly six EF-owned Prisma families and one additive migration:
  - `ExperimentFoundationProviderPayloadV2`
  - `ExperimentFoundationExecutionAttemptV2`
  - `ExperimentFoundationExecutionAttemptEventV2`
  - `ExperimentFoundationProviderCommandV2`
  - `ExperimentFoundationCollectionAttemptV2`
  - `ExperimentFoundationProvisionalOutputV2`
- Added independent route/controller/service/repository/Prisma layers, a durable command worker/scheduler, a deterministic no-network fake transport and five product routes for start, cancel, reconcile, Attempt read and Run status read.
- Updated the canonical OpenAPI and regenerated both API indexes; refreshed DB/env context through the owning SSOT workflows and passed strict context verification.
- Added E1 start, E2 lease claim, E3 command outcome, E4 collection preparation and E5 collection completion transaction boundaries.
- Added a disposable-PostgreSQL gate that first creates a fresh Pack A prerequisite, then runs Pack B against a separate database in the same temporary container. The gate now forces the relational Prisma suite after migration and rejects any skipped test.

## Frozen recovery and cancellation semantics

- Every command claim is fenced by lease owner plus monotonically increasing `lease_version`; a stale claim cannot heartbeat, release, terminalize or commit E3-E5 even when the worker name is reused.
- Exact E1 and control-command concurrency converge by business key plus semantic hash; generated ids/timestamps are not replay authority. Changed scope or content fails closed.
- A pending-submit cancel atomically terminalizes submit and the Attempt with zero transport.
- If submit is already leased while the Attempt is still `prepared`, cancel persists as a pending durable intent without inventing an event or Attempt transition. That cancel is not claimable until submit E3 or lease recovery converges; the cancel then runs before the generated sync command.
- A durable cancel intent is given precedence over a pending or already leased reconcile before E4. Reconcile is terminalized with `EXECUTION_ATTEMPT_STATE_CONFLICT`, and no CollectionAttempt/output is created.
- If submit E3 wins after the cancel service read but before enqueue, the request returns a stable 409 with zero cancel partial write; the same business key can be retried against the new authoritative state. In a leased sync/cancel race, the losing command is immediately terminalized or requeued under the same provider key, so convergence does not wait for lease expiry.
- Manual and automatic reconcile commands include their provider idempotency key in `command_hash`, so both can coexist and converge without a command-hash collision.
- E3 and E5 validate the exact owning command, payload, external reference, transition, event type and diagnostic-output shape before any partial write.

## Schema and migration evidence

- Migration: `prisma/migrations/20260713210000_add_experiment_foundation_pack_b_provider_control_v2/migration.sql`
- Migration SHA-256: `c0c49f0f7a268f09619f6c693a1f41955ce6cb1b36b656dd9c8e1d51abe0f70e`
- Created family count: 6
- Cross-domain PI foreign keys: 0
- Legacy ALTER/backfill/data mutation: 0
- Generic EAV, scientific, evidence, closure or `SimulationRun` family count: 0
- `ON DELETE CASCADE`: 0
- Execution mode is constrained to `simulation`; provisional output class is constrained to `diagnostic_only`.

## Final disposable-PostgreSQL evidence

The final gate used `pgvector/pgvector:0.8.0-pg16`, did not use an existing `DATABASE_URL`, and removed the temporary container after completion.

| Evidence | Result |
|---|---|
| PB01-PB16 | 16/16 passed |
| Shared Pack B contracts | 5/5 passed |
| Targeted backend Pack B suite | 43/43 passed, 0 skipped |
| Prisma relational suite | 4/4 passed, 0 skipped |
| Full shared suite | 323/323 passed |
| Full backend suite | 1,982 total, 1,939 passed, 0 failed, 43 expected opt-in skips |
| ProviderPayload / Attempt / Event | 2 / 2 / 12 |
| ProviderCommand / CollectionAttempt / provisional output | 8 / 2 / 2 |
| Non-Pack-B application tables | 231 measured, 0 changed |
| Exact Run / RunCell / TaskSpec / head receipt digests | unchanged |
| Real provider request / `CreateJob` / fetch | 0 / 0 / 0 |
| Legacy / scientific writes | 0 / 0 |
| Scientific execution / evidence eligibility | `not_started` / `false` |
| Secrets, database URLs or canonical payload bytes stored in evidence | none |

Ephemeral machine evidence:

- `.ai/.tmp/experiment-foundation-productization/packb-20260713-final4/summary.json`
- `.ai/.tmp/experiment-foundation-productization/packb-20260713-final4/relational-tests.json`
- Summary SHA-256: `456ed62ac01de9055c8720d0dfdbdb3b5c43a4979b228c1c2cc240b866f553da`
- Relational evidence SHA-256: `e4ffdf0014db52da36a6b6a70035a55b82d8ab7e84e9fd6d2c80dcc7e9bd846a`

## Historical next decisions at the technical checkpoint

1. Review and apply the Pack B migration to a specifically named existing target through the DB-SSOT workflow. The apply was later completed for the named local-development target only; see `03-pack-b-local-landing-closure.md`.
2. Separately authorize simulation enable/product cutover; do not infer enablement from the technical PASS. The local-only no-network simulation capability was later enabled, without product E1-E5 or any non-local cutover.
3. Authorize later slices independently: exact real-provider payload/read-only cloud preflight, scientific result/validation/evidence, D-18 Cycle closure and UI/search.

At the historical checkpoint Pack B remained implemented, default-off and reviewable with no existing-environment or external-provider effect. The later named-local landing supersedes only the first two local-development decisions; external-provider, scientific, closure, UI/search and non-local rollout remain open.
