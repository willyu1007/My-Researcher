# 01 Plan

## Phase 0 — Census and invariant freeze

1. [x] Inventory every current promotion, bootstrap, attachment, retrieval and trust writer across shared contracts, HTTP routes, services, repositories and Prisma.
2. [x] Map existing capability flags, null-capable legacy schema, project-scope resolvers, structured lineage queries and relevant context contracts. Named-local row counts remain separately authorized database work.
3. [x] Freeze exact modification and prohibited-write allowlists.
4. [x] Convert EF-P06/P14/P15/P21 exit criteria into one runnable verification matrix.

Exit: met on 2026-08-02 in `06-phase0-census-and-freeze.md`; architecture and modification boundaries were reviewed and no code/config/schema/data change occurred.

## Phase 1 — EF-P14 bound bootstrap safety

1. [x] Make completed PaperProject intake plus its exact active bridge binding a server-resolved prerequisite.
2. [x] Reject unbound bootstrap before any PI domain or outbox write.
3. [x] Make bound bootstrap replay return the exact stored outcome.
4. [x] Classify legacy null bindings explicitly as diagnostics-only; do not silently trust-upgrade or backfill.
5. [x] Preserve the existing route/repository transaction and capability defaults; no schema, migration, data or runtime configuration change was needed.

Exit: met on 2026-08-02. Unbound, half-bound, stale-hash, cross-title-card, mirror-drift and legacy-null negatives prove zero partial write; exact bound replay is idempotent through service/API and existing Prisma race tests.

## Phase 2 — EF-P06 atomic promotion/canonicalization

1. [x] Define the typed primary command over one exact typed asset draft Candidate revision; callers cannot provide canonical ids, hashes, result objects, TaskSpecs or outbox payloads.
2. [x] Resolve and create-or-exact-reuse the canonical typed asset revision on the server. Keep TaskSpec/Run creation exclusively in the admitted-cell materialization consumer per P06-04.
3. [x] Commit promotion decision, canonical object, Candidate transition, idempotency receipt and outbox outcome atomically in the EF-owned UoW.
4. [x] Prove injected crash rollback, duplicate/same-key replay, same-key drift, different-key exact replay and concurrent promotion convergence.
5. [x] Preserve typed/legacy history, keep the generic promotion route closed and gate the new route default-off behind committed v2 cutover.

Exit: met on 2026-08-02. One canonical result and one durable event outcome converge under replay and PostgreSQL concurrency; reject creates no canonical revision and conflicts fail closed. Review hardening additionally proves all five typed asset families, exact Candidate/decision/receipt/outbox cross-binding and durable audit-event relay completion without downstream business writes.

## Phase 3 — EF-P15 attachment and full revalidation

1. [x] Resolve P15-03 by authorizing option 1: an immutable typed exploration specification is attached and restated as a new PI-owned admitted WorkOrder revision; existing or historical outputs are never imported. Option 2 standalone Run/Attempt/Result lineage is rejected for T-134.
2. [ ] Phase 3A — add the EF-owned immutable exploration-specification identity/revision contract and persistence. Freeze proposed branch frame, WorkOrder revision snapshot and exact ordered cells under server-derived ids/hashes; reject result, Attempt, validation, evidence, legacy and caller-authored authority fields.
3. [ ] Phase 3B — add one PI-owned attachment command over `spec_id + spec_revision`, exact project/Cycle/branch target and business idempotency key. Server-resolve the spec/hash and all target scope; atomically persist the attachment receipt with the new PI branch/revision/cells/admission/outbox authority commit.
4. [ ] Re-resolve active project, admitted/open Cycle, exact branch frame, typed assets, readiness attestation and dependency hashes before commit. Existing materialization must revalidate exact cell/asset/readiness parity before creating a new TaskSpec/Run lineage.
5. [ ] Reject cross-project, stale/revoked/incomplete specs, changed branch frame, changed scope, simulation/legacy/result references and caller-substituted ids/hashes with zero PI trust/materialization writes.
6. [ ] Route only the newly executed PI-bound Run through existing Attempt/result/scientific-validation and PI Evidence Trust Gateway writers; attachment itself creates no EvidenceCandidate or RunEvidenceUnit.
7. [ ] Make same-key and different-key exact replay zero-new. Bind one exact spec revision to one PI scope; reuse against a different project/Cycle/branch is a stable conflict and requires a new spec revision.
8. [ ] Keep the feature default off. Generate schema/context artifacts from SSOT and verify on nonce-bound disposable PostgreSQL only; named database apply and runtime enablement remain outside this authorization.

Exit: standalone output remains non-paper-trusted; the approved spec attachment produces a newly admitted PI revision and newly executed PI-bound lineage; only the existing validation/gateway path can produce evidence, and bypass/crash/concurrency tests prove zero partial trust.

## Phase 4 — EF-P21 project-scoped semantic retrieval

1. Define deterministic ValidationCycle/branch-head semantic documents from authoritative source refs/hashes.
2. Apply permission and project scope before document lookup and ranking.
3. Re-resolve each hit against current source identity; drop stale, deleted, foreign or superseded candidates.
4. Preserve structured lineage as the complete fallback and only control/trust authority.
5. Prove index outage, partial index, ranking ties and cross-project negatives.

Exit: semantic retrieval improves discovery but cannot select a head, authorize an action, qualify evidence or block structured use.

## Phase 5 — Convergence and handoff

1. Run the complete writer census and confirm no second authority or legacy re-entry.
2. Run shared/backend/API/disposable-PostgreSQL suites required by each workstream.
3. Regenerate OpenAPI, DB and process context from SSOT where changed.
4. Verify capabilities remain default off and rollback behavior preserves immutable history.
5. Update the audit matrix, verification ledger, project governance and handoff status.

Exit: EF-P06, EF-P14, EF-P15 and EF-P21 are each backed by named runnable evidence and can be marked verified.

## Global acceptance rules

- No desktop UI acceptance is required or permitted.
- No phase may claim another phase's trust result from a unit-only or in-memory test.
- Schema, local-data migration or external side effects require their normal separate authorization gates.
- Semantic retrieval and standalone attachment must not mint EvidenceCandidate or RunEvidenceUnit outside existing authoritative writers.
