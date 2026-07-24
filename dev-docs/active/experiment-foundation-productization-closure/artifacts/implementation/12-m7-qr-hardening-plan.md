# T-132 M7-QR hardening plan

Date: 2026-07-24

Source: independent-review dispositions recorded in `11-m7-real-provider-readiness-review.md` (§ Independent review 2026-07-24). Scope covers the two "M7-QR candidate" rows plus the refuted-finding regression tests. Everything here is offline/default-off work; no live call, no named-database write beyond the separately approved migration apply.

## QR-1 — gate honesty hardening (`experiment-foundation-m7-provider-gate.mjs`)

1. **Executable M7-01**: a second disposable database applies migrations `1..N-1` (psql loop over `prisma/migrations` in lexical order), seeds the exact simulation provider-control family (payload/attempt/event/command/collection/output rows using the frozen fixture values incl. `simulationProfileVersion`), snapshots a semantic digest, applies only `20260723100000`, then asserts: identities/content preserved, renamed column carries the value, old-tuple rows still readable, and a mixed simulation/real tuple INSERT plus a `simulationProfileVersion` reference now fail.
2. **Measured write census**: assert `EXCLUDED_WRITE_TABLES` (`ExperimentFoundationExternalTrainingJob`, `ExperimentResult`, `EvidenceCandidate`, `RunEvidenceUnit`) row counts are exactly 0 after the relational lane (currently collected but never asserted).
3. **Per-check predicates**: every `M7-xx` id gets an executable predicate over concrete evidence (executed test-file list, TAP counts, schema census fields, migration inspection fields, seeded-migration comparison, handoff scan). No blanket `passed` after a generic command list.
4. **M7-15 measured scan**: `duplicate_provider_implementation_count` computed by scanning the repo for `@alicloud/pai-dlc` imports/`createJobWithOptions` construction outside the approved file allowlist, not hardcoded 0.
5. **Durable redaction**: the summary keeps per-command `{exit_code, duration_ms, transcript_sha256}` only; raw `output_tail` stays in the per-label evidence files inside the run directory and never enters the durable summary. Workspace paths normalized.
6. **Honest census labels**: provider-call/cost censuses are recorded as `static_boundary_assertions` derived from (a) hermetic env description, (b) the source-level "no live transport construction in app" check, and (c) fake-client counters exported by the targeted tests — not presented as runtime measurements.

## QR-2 — deterministic authority ids

Replace `randomUUID` defaults for durable authority identities with domain-separated deterministic derivations (server hash over exact lineage + sequence), keeping the lease owner random:

- intake: payload id (from `materialization_key`), attempt id (run/cell/attempt_sequence/business key), event id (attempt + sequence), command id (attempt + operation + sequence);
- worker: event/command/collection ids (attempt + kind + sequence);
- bundle service: identity (bundleKey), revision (bundle + revision_sequence), lifecycle event (revision + event_sequence), readiness (revision + lifecycle event hash).

Add tests that use the **production defaults** (no injected id factory) and prove two independent service instances derive identical ids for identical inputs, and that the derivations are collision-free across distinct cells/sequences.

## QR-3 — refuted-finding regression tests

1. Worker: cancel command observes an already-`Succeeded` provider job → cancel terminalizes with `EXECUTION_ATTEMPT_STATE_CONFLICT`, and the pending reconcile then converges the Attempt through `succeeded` + collection (proves the review refutation permanently).
2. Worker: a retryable sync/reconcile transport error beyond `maximumCommandAttempts` but inside the watchdog deadline releases instead of terminalizing (locks the watchdog decoupling).

## Explicitly deferred (needs its own reviewed migration + apply approval)

- PostgreSQL JSON discriminator CHECKs on `externalJobRefJson` and payload↔attempt mode-coupling constraints.
- Required (non-defaulted) external-ref discriminator end-to-end in repository record types.

## Exit criteria

`experiment-foundation-m7-provider-gate.mjs --run-id t132-m7-offline-<date>-v3` passes with the hardened registry; gate unit tests extended for the new inspection functions; host full suites green; durable v3 summary contains no transcripts or machine paths.

## Completion record (2026-07-24)

All three QR slices landed the same day:

- **QR-1** (Codex `gpt-5.6-sol` implementation + Claude review/fix): all six items landed — executable pre-M7 comparison (second disposable database, 68 pre-M7 migrations applied file-by-file, replica-mode seeded provider-control family, semantic-digest comparison across the M7 migration, mixed-tuple INSERT and `simulationProfileVersion` reference rejected post-apply), asserted zero excluded-write census, per-check predicates for M7-01..15, measured duplicate-provider scan, transcript-free/machine-path-free durable summary, honest `static_boundary_assertions` labels. Two review fixes on top of the Codex patch: the payload service added to the provider-implementation allowlist (legitimate `CreateJobRequest` import), and `EXCLUDED_WRITE_TABLES` corrected to real table names — the pre-QR list used bare family labels (`ExperimentResult`, `EvidenceCandidate`, `RunEvidenceUnit`) that matched no table, so the old census had silently skipped them; the first hardened v3 attempt failed exactly on this, proving the measured census works.
- **QR-2** (Codex `gpt-5.6-sol` + Claude review): all eleven durable authority id families switched from `randomUUID` defaults to domain-separated deterministic derivations (per-kind `record_kind`, exact lineage + sequence seeds, first 40 sha256 hex under the existing prefixes); injectable factories retained for tests; lease owner stays random. Production-default determinism tests prove two independent instances converge. Necessary companion change: bundle `revision_sequence` now uses the frozen draft version instead of constant 1 so distinct freezes derive distinct revision ids.
- **QR-3** (Claude): both regression tests landed — cancel racing an already-Succeeded job converges through the pending reconcile without StopJob; a retryable sync/reconcile transport error beyond `maximumCommandAttempts` releases inside the watchdog deadline.

Convergence: `t132-m7-offline-20260724-v3` **passed** (M7-01..15 all passed under per-check predicates; summary SHA-256 `de4b39855db87557f1ef220c6d2d4bddaf61d7c94c30aca8ecda8e1f63679882`, durable copy `12-m7-qr-gate-summary-v3.json`; `migration_row_preservation.semantic_digest_preserved=true`, `mixed_tuple_insert_rejected=true`, `duplicate_provider_implementation_count=0` measured, summary contains no `output_tail` and no absolute machine path). Gate unit tests 13 files/assertions extended and green.

The deferred items (PG JSON discriminator CHECKs, payload↔attempt mode-coupling constraints, required end-to-end ref discriminator) remain open for a future reviewed migration with its own apply approval.
